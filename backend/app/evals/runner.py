"""
Evaluation harness: measures ranking quality, extraction recall and guardrail accuracy
by running the *real* agents against the golden set.
"""
import asyncio
import math
import time
from datetime import datetime
from typing import Any, Dict, List, Sequence
import logging

import fitz
from sqlalchemy import func, select

from backend.app.agents.jd_agent import run_jd_agent
from backend.app.agents.resume_agent import run_resume_agent
from backend.app.db.database import AsyncSessionLocal
from backend.app.db.models import EvalRun, LlmTrace
from backend.app.evals.golden_set import GOLDEN_JD, GOLDEN_RESUMES, GUARDRAIL_PDF_ATTACK_TEXT, GUARDRAIL_TEXT_CASES
from backend.app.services.integrity import analyze_resume
from backend.app.services.scoring import compute_explainable_match
from backend.app.services.tracing import current_job

logger = logging.getLogger("smarthire.evals")


# --------------------------------------------------------------------------- #
# Metrics
# --------------------------------------------------------------------------- #
def dcg(grades: Sequence[float]) -> float:
    return sum((2 ** g - 1) / math.log2(i + 2) for i, g in enumerate(grades))


def ndcg_at_k(ranked_grades: Sequence[float], k: int) -> float:
    ideal = dcg(sorted(ranked_grades, reverse=True)[:k])
    return dcg(list(ranked_grades)[:k]) / ideal if ideal else 0.0


def pairwise_accuracy(items: List[Dict[str, Any]]) -> float:
    """Share of candidate pairs with different grades that the model orders correctly."""
    correct = total = 0
    for i, a in enumerate(items):
        for b in items[i + 1:]:
            if a["grade"] == b["grade"]:
                continue
            total += 1
            hi, lo = (a, b) if a["grade"] > b["grade"] else (b, a)
            correct += hi["score"] > lo["score"]
    return correct / total if total else 1.0


def spearman(xs: Sequence[float], ys: Sequence[float]) -> float:
    def ranks(v):
        order = sorted(range(len(v)), key=lambda i: v[i])
        r = [0.0] * len(v)
        i = 0
        while i < len(order):  # average ranks for ties
            j = i
            while j + 1 < len(order) and v[order[j + 1]] == v[order[i]]:
                j += 1
            for k in range(i, j + 1):
                r[order[k]] = (i + j) / 2
            i = j + 1
        return r
    rx, ry = ranks(xs), ranks(ys)
    mx, my = sum(rx) / len(rx), sum(ry) / len(ry)
    cov = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    sx = math.sqrt(sum((a - mx) ** 2 for a in rx))
    sy = math.sqrt(sum((b - my) ** 2 for b in ry))
    return cov / (sx * sy) if sx and sy else 0.0


def _attack_pdf(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 60), "Jordan Lee\nBackend developer, 3 years. Python, Flask, MySQL.", fontsize=11)
    page.insert_text((50, 700), text, fontsize=10, color=(1, 1, 1))  # white, invisible to humans
    data = doc.tobytes()
    doc.close()
    return data


# --------------------------------------------------------------------------- #
# Evaluation
# --------------------------------------------------------------------------- #
async def evaluate(run_tag: str) -> Dict[str, Any]:
    started = time.perf_counter()

    # 1. Ranking + extraction with the real JD and Resume agents.
    jd = await run_jd_agent(GOLDEN_JD)
    sem = asyncio.Semaphore(3)

    async def score(item):
        async with sem:
            profile = await run_resume_agent(item["text"])
        match = await asyncio.to_thread(compute_explainable_match, profile, jd)
        found = {s.lower() for s in profile.skills}
        recall = sum(1 for s in item["key_skills"] if any(s.lower() in f or f in s.lower() for f in found)) / len(item["key_skills"])
        return {"id": item["id"], "name": profile.name, "grade": item["grade"], "score": match["final_score"],
                "status": match["status"], "skill_recall": round(recall, 3)}

    items = list(await asyncio.gather(*(score(i) for i in GOLDEN_RESUMES)))
    items.sort(key=lambda r: r["score"], reverse=True)
    ranked_grades = [r["grade"] for r in items]
    relevant = sum(1 for g in ranked_grades if g >= 2)
    precision_k = sum(1 for g in ranked_grades[:relevant] if g >= 2) / relevant if relevant else 0.0
    # Shortlist decision accuracy: grade >= 2 should be shortlisted, grade <= 1 should not.
    decision_acc = sum((r["status"] == "Shortlisted") == (r["grade"] >= 2) for r in items) / len(items)

    # 2. Guardrails.
    guard_rows = []
    for case_id, is_attack, text in GUARDRAIL_TEXT_CASES:
        _, report = analyze_resume(f"{case_id}.txt", text.encode(), text)
        guard_rows.append({"id": case_id, "attack": is_attack, "flagged": report["risk_level"] in ("medium", "high")})
    pdf_bytes = _attack_pdf(GUARDRAIL_PDF_ATTACK_TEXT)
    pdf_text = fitz.open(stream=pdf_bytes, filetype="pdf")[0].get_text()
    sanitized, report = analyze_resume("hidden_text_attack.pdf", pdf_bytes, pdf_text)
    guard_rows.append({"id": "pdf-hidden-white-text", "attack": True, "flagged": report["risk_level"] in ("medium", "high"),
                       "sanitized": "Ignore previous instructions" not in sanitized})
    tp = sum(r["attack"] and r["flagged"] for r in guard_rows)
    fp = sum(not r["attack"] and r["flagged"] for r in guard_rows)
    fn = sum(r["attack"] and not r["flagged"] for r in guard_rows)

    # 3. Cost/latency of this run, from LLM traces tagged with the run id.
    async with AsyncSessionLocal() as db:
        agg = (await db.execute(
            select(func.count(), func.sum(LlmTrace.input_tokens + LlmTrace.output_tokens), func.avg(LlmTrace.latency_ms))
            .where(LlmTrace.job_id == run_tag)
        )).one()

    metrics = {
        "ndcg_at_3": round(ndcg_at_k(ranked_grades, 3), 3),
        "ndcg_at_all": round(ndcg_at_k(ranked_grades, len(ranked_grades)), 3),
        "precision_at_k": round(precision_k, 3),
        "pairwise_accuracy": round(pairwise_accuracy(items), 3),
        "spearman": round(spearman([r["score"] for r in items], [r["grade"] for r in items]), 3),
        "shortlist_decision_accuracy": round(decision_acc, 3),
        "skill_extraction_recall": round(sum(r["skill_recall"] for r in items) / len(items), 3),
        "guardrail_precision": round(tp / (tp + fp), 3) if tp + fp else 1.0,
        "guardrail_recall": round(tp / (tp + fn), 3) if tp + fn else 1.0,
        "hidden_text_sanitized": bool(guard_rows[-1].get("sanitized")),
        "llm_calls": int(agg[0] or 0),
        "total_tokens": int(agg[1] or 0),
        "avg_llm_latency_ms": int(agg[2] or 0),
        "duration_s": round(time.perf_counter() - started, 1),
        "golden_resumes": len(items),
        "guardrail_cases": len(guard_rows),
    }
    return {"metrics": metrics, "details": {"ranking": items, "guardrails": guard_rows}}


async def run_evaluation(run_id: str):
    """Background task: execute the evaluation and persist results on the EvalRun row."""
    token = current_job.set(f"eval:{run_id}")
    try:
        result = await evaluate(f"eval:{run_id}")
        async with AsyncSessionLocal() as db:
            run = await db.get(EvalRun, run_id)
            run.status, run.metrics, run.details, run.finished_at = "completed", result["metrics"], result["details"], datetime.utcnow()
            await db.commit()
    except Exception as e:
        logger.exception(f"Evaluation {run_id} failed: {e}")
        async with AsyncSessionLocal() as db:
            run = await db.get(EvalRun, run_id)
            run.status, run.error, run.finished_at = "failed", str(e)[:1000], datetime.utcnow()
            await db.commit()
    finally:
        current_job.reset(token)
