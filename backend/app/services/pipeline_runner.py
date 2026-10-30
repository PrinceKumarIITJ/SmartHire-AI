"""Runs the LangGraph pipeline for a job and persists every artifact it produces."""
from typing import Any, Dict
from sqlalchemy import select, delete
import logging

from backend.app.db.database import AsyncSessionLocal
from backend.app.db.models import Job, Candidate, JobCandidateMatch, ExecutiveReport, AuditReport, EmailDraft
from backend.app.schemas.job import JobDescription
from backend.app.agents.orchestrator import smart_hire_app
from backend.app.services.progress import emit, progress_bus
from backend.app.services.tracing import current_job

logger = logging.getLogger("smarthire.pipeline_runner")

SCORE_FIELDS = (
    "semantic_score", "skill_score", "experience_score", "project_score",
    "education_score", "final_score", "confidence_score",
)


class PipelineError(Exception):
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


async def execute_pipeline(job_id: str) -> Dict[str, Any]:
    """Run all agents for a job's candidates. Publishes live progress and persists results."""
    token = current_job.set(job_id)
    try:
        async with AsyncSessionLocal() as db:
            job = await db.get(Job, job_id)
            if not job:
                raise PipelineError("Job not found", 404)
            candidates = (await db.execute(
                select(Candidate).where(Candidate.job_id == job_id).order_by(Candidate.created_at)
            )).scalars().all()
            if not candidates:
                raise PipelineError("No resumes uploaded for this job yet.", 400)

            if not progress_bus.is_running(job_id):
                progress_bus.start(job_id, total=len(candidates))

            initial_state = {
                "job_id": job_id,
                "raw_jd": job.raw_jd,
                "parsed_jd": JobDescription(**job.parsed_jd) if job.parsed_jd else None,
                "resumes": [{"id": c.id, "filename": c.filename, "raw_text": c.raw_resume_text} for c in candidates],
                "parsed_candidates": [],
                "match_results": [],
                "audit_report": None,
                "executive_report": None,
                "email_drafts": [],
                "error": None,
            }
            final_state = await smart_hire_app.ainvoke(initial_state)
            if final_state.get("error"):
                raise PipelineError(f"Pipeline error: {final_state['error']}")

            emit(job_id, "stage", stage="persist", label="Saving results")
            if final_state.get("parsed_jd"):
                job.parsed_jd = final_state["parsed_jd"].model_dump()
            for cand_db, parsed in zip(candidates, final_state["parsed_candidates"]):
                cand_db.parsed_profile = parsed.model_dump()

            existing = (await db.execute(select(JobCandidateMatch).where(JobCandidateMatch.job_id == job_id))).scalars().all()
            existing_by_cand = {m.candidate_id: m for m in existing}
            for m in final_state["match_results"]:
                row = existing_by_cand.get(m["candidate_id"])
                if row is None:
                    row = JobCandidateMatch(job_id=job_id, candidate_id=m["candidate_id"], notes="", status_source="ai")
                    db.add(row)
                if row.status_source != "recruiter":
                    # Re-runs refresh the AI recommendation but never overwrite a recruiter's decision.
                    row.status = m.get("status", "Pending")
                for field in SCORE_FIELDS:
                    setattr(row, field, m.get(field, 0.0))
                row.matched_skills = m.get("matched_skills", [])
                row.missing_skills = m.get("missing_skills", [])
                row.reasoning = m.get("reasoning", "")

            # Re-runs replace generated artifacts; emails that were already sent are kept as history.
            await db.execute(delete(ExecutiveReport).where(ExecutiveReport.job_id == job_id))
            await db.execute(delete(AuditReport).where(AuditReport.job_id == job_id))
            await db.execute(delete(EmailDraft).where(EmailDraft.job_id == job_id, EmailDraft.status != "sent"))

            if final_state.get("executive_report"):
                er = final_state["executive_report"]
                db.add(ExecutiveReport(
                    job_id=job_id, summary_text=er.get("summary_text", ""), key_strengths=er.get("key_strengths", []),
                    skill_gaps=er.get("skill_gaps", []), hiring_recommendations=er.get("hiring_recommendations", []),
                ))
            if final_state.get("audit_report"):
                ar = final_state["audit_report"]
                db.add(AuditReport(
                    job_id=job_id, blind_scores=ar.get("blind_scores", {}),
                    disparate_impact_summary=ar.get("disparate_impact_summary", {}),
                ))
            for d in final_state.get("email_drafts") or []:
                db.add(EmailDraft(
                    job_id=job_id, candidate_id=d["candidate_id"], type=d["type"],
                    subject=d["subject"], body=d["body"], status="draft",
                ))
            await db.commit()

        processed = len(final_state["match_results"])
        emit(job_id, "completed", processed=processed)
        return {"message": "LangGraph multi-agent pipeline completed successfully.", "job_id": job_id, "candidates_processed": processed}
    except PipelineError as e:
        emit(job_id, "failed", error=str(e))
        raise
    except Exception as e:
        logger.exception(f"Pipeline crashed for job {job_id}: {e}")
        emit(job_id, "failed", error=str(e))
        raise PipelineError(f"Pipeline error: {e}")
    finally:
        current_job.reset(token)
