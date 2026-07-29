from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.db.database import get_db
from backend.app.db.models import ExecutiveReport, Job, JobCandidateMatch, Candidate
from backend.app.schemas.report import ExecutiveReportResponse
from backend.app.schemas.job import JobDescription
from backend.app.agents.report_agent import run_report_agent
import logging

logger = logging.getLogger("smarthire.api.reports")
router = APIRouter(prefix="/api/reports", tags=["Executive Reports"])

@router.get("/jobs/{job_id}", response_model=ExecutiveReportResponse)
async def get_or_generate_executive_report(job_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch or generate Executive Hiring Report synthesized by AI Report Agent."""
    res_report = await db.execute(select(ExecutiveReport).where(ExecutiveReport.job_id == job_id).order_by(ExecutiveReport.created_at.desc()))
    existing = res_report.scalar_one_or_none()
    if existing:
        return existing

    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    res_matches = await db.execute(
        select(JobCandidateMatch, Candidate)
        .join(Candidate, JobCandidateMatch.candidate_id == Candidate.id)
        .where(JobCandidateMatch.job_id == job_id)
    )
    rows = res_matches.all()

    if not rows:
        raise HTTPException(status_code=400, detail="No matching results found for this job.")

    matches_list = []
    for m, c in rows:
        cp = c.parsed_profile or {}
        matches_list.append({
            "candidate_name": cp.get("name") or c.filename,
            "final_score": m.final_score,
            "matched_skills": m.matched_skills,
            "missing_skills": m.missing_skills,
            "status": m.status
        })

    parsed_jd = JobDescription(**job.parsed_jd) if job.parsed_jd else JobDescription(title=job.title)
    report_schema = await run_report_agent(parsed_jd, matches_list)

    new_report = ExecutiveReport(
        job_id=job_id,
        summary_text=report_schema.summary_text,
        key_strengths=report_schema.key_strengths,
        skill_gaps=report_schema.skill_gaps,
        hiring_recommendations=report_schema.hiring_recommendations
    )
    db.add(new_report)
    await db.commit()
    await db.refresh(new_report)

    return new_report
