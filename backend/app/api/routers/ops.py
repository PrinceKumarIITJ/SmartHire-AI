import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.db.database import get_db
from backend.app.db.models import EvalRun, LlmTrace
from backend.app.evals.runner import run_evaluation
from backend.app.services import circuit_breaker

router = APIRouter(prefix="/ops", tags=["LLMOps"])
_eval_tasks: set = set()


def _percentile(values: List[int], p: float) -> int:
    if not values:
        return 0
    s = sorted(values)
    return s[min(len(s) - 1, int(round(p * (len(s) - 1))))]


def _group(traces: List[LlmTrace], key: str) -> List[Dict[str, Any]]:
    groups: Dict[str, List[LlmTrace]] = {}
    for t in traces:
        groups.setdefault(getattr(t, key) or "unknown", []).append(t)
    rows = []
    for name, ts in groups.items():
        lat = [t.latency_ms for t in ts if t.status == "ok"]
        rows.append({
            "name": name, "calls": len(ts),
            "errors": sum(t.status == "error" for t in ts),
            "error_rate": round(sum(t.status == "error" for t in ts) / len(ts), 3),
            "p50_ms": _percentile(lat, 0.5), "p95_ms": _percentile(lat, 0.95),
            "input_tokens": sum(t.input_tokens for t in ts), "output_tokens": sum(t.output_tokens for t in ts),
        })
    return sorted(rows, key=lambda r: -r["calls"])


@router.get("/overview")
async def ops_overview(hours: int = Query(default=168, ge=1, le=24 * 90), db: AsyncSession = Depends(get_db)):
    """LLM observability: volume, latency percentiles, error/fallback rate, tokens — by agent and model."""
    since = datetime.utcnow() - timedelta(hours=hours)
    traces = (await db.execute(select(LlmTrace).where(LlmTrace.created_at >= since))).scalars().all()
    ok_lat = [t.latency_ms for t in traces if t.status == "ok"]
    errors = sum(t.status == "error" for t in traces)

    # Hourly timeline of calls for the sparkline.
    buckets: Dict[str, Dict[str, int]] = {}
    for t in traces:
        key = t.created_at.strftime("%Y-%m-%dT%H:00")
        b = buckets.setdefault(key, {"calls": 0, "errors": 0})
        b["calls"] += 1
        b["errors"] += t.status == "error"

    return {
        "window_hours": hours,
        "total_calls": len(traces),
        "errors": errors,
        "error_rate": round(errors / len(traces), 3) if traces else 0.0,
        "p50_ms": _percentile(ok_lat, 0.5),
        "p95_ms": _percentile(ok_lat, 0.95),
        "input_tokens": sum(t.input_tokens for t in traces),
        "output_tokens": sum(t.output_tokens for t in traces),
        "by_agent": _group(traces, "agent"),
        "by_model": _group(traces, "model"),
        "timeline": [{"hour": k, **v} for k, v in sorted(buckets.items())],
        "circuit_breakers": circuit_breaker.snapshot(),
    }


@router.get("/traces")
async def recent_traces(limit: int = Query(default=50, ge=1, le=500), agent: str = "", status: str = "",
                        db: AsyncSession = Depends(get_db)):
    q = select(LlmTrace).order_by(LlmTrace.created_at.desc()).limit(limit)
    if agent:
        q = q.where(LlmTrace.agent == agent)
    if status:
        q = q.where(LlmTrace.status == status)
    rows = (await db.execute(q)).scalars().all()
    return [{
        "id": t.id, "agent": t.agent, "job_id": t.job_id, "provider": t.provider, "model": t.model, "status": t.status,
        "latency_ms": t.latency_ms, "input_tokens": t.input_tokens, "output_tokens": t.output_tokens,
        "error": t.error, "created_at": t.created_at.isoformat(),
    } for t in rows]


def _eval_out(r: EvalRun) -> Dict[str, Any]:
    return {"id": r.id, "status": r.status, "metrics": r.metrics or {}, "details": r.details or {},
            "error": r.error, "created_at": r.created_at.isoformat(),
            "finished_at": r.finished_at.isoformat() if r.finished_at else None}


@router.post("/evals", status_code=202)
async def start_evaluation(db: AsyncSession = Depends(get_db)):
    """Run the golden-set evaluation in the background (uses real LLM calls)."""
    running = (await db.execute(select(EvalRun).where(EvalRun.status == "running"))).scalars().first()
    if running and (datetime.utcnow() - running.created_at) < timedelta(minutes=30):
        raise HTTPException(status_code=409, detail="An evaluation is already running.")
    run = EvalRun(status="running")
    db.add(run)
    await db.commit()
    await db.refresh(run)
    task = asyncio.create_task(run_evaluation(run.id))
    _eval_tasks.add(task)
    task.add_done_callback(_eval_tasks.discard)
    return _eval_out(run)


@router.get("/evals")
async def list_evaluations(limit: int = 20, db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(EvalRun).order_by(EvalRun.created_at.desc()).limit(limit))).scalars().all()
    return [_eval_out(r) for r in rows]
