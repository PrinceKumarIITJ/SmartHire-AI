from typing import List
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.db.models import (
    Job, Candidate, JobCandidateMatch, ExecutiveReport, AuditReport, EmailDraft, ChatLog,
)


async def delete_candidates(db: AsyncSession, candidate_ids: List[str]):
    """Bulk-delete candidates and their dependents. Avoids ORM cascades, which lazy-load in async sessions."""
    if not candidate_ids:
        return
    await db.execute(delete(ChatLog).where(ChatLog.candidate_id.in_(candidate_ids)))
    await db.execute(delete(EmailDraft).where(EmailDraft.candidate_id.in_(candidate_ids)))
    await db.execute(delete(JobCandidateMatch).where(JobCandidateMatch.candidate_id.in_(candidate_ids)))
    await db.execute(delete(Candidate).where(Candidate.id.in_(candidate_ids)))


async def delete_job_tree(db: AsyncSession, job_id: str, candidate_ids: List[str]):
    await delete_candidates(db, candidate_ids)
    for model in (EmailDraft, JobCandidateMatch, ExecutiveReport, AuditReport):
        await db.execute(delete(model).where(model.job_id == job_id))
    await db.execute(delete(Job).where(Job.id == job_id))
