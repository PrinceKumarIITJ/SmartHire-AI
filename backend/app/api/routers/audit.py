from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.db.database import get_db
from backend.app.db.models import AuditReport, Job, Candidate, JobCandidateMatch
from backend.app.schemas.report import AuditReportResponse
from backend.app.schemas.job import JobDescription
from backend.app.schemas.candidate import CandidateProfile
from backend.app.agents.bias_audit_agent import run_bias_audit_agent
import logging

logger = logging.getLogger("smarthire.api.audit")
router = APIRouter(prefix="/api/audit", tags=["Bias & Fairness Audit"])

@router.get("/{job_id}", response_model=AuditReportResponse)
async def get_or_run_bias_audit(job_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch existing or execute new Demographic-Blind Bias Audit and Disparate Impact Metrics."""
    # Check existing audit report
    res_audit = await db.execute(select(AuditReport).where(AuditReport.job_id == job_id).order_by(AuditReport.created_at.desc()))
    existing = res_audit.scalar_one_or_none()
    if existing:
        return existing

    # Otherwise run Bias Audit Agent on demand
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    res_cands = await db.execute(select(Candidate).where(Candidate.job_id == job_id))
    candidates = res_cands.scalars().all()
    
    if not candidates:
        raise HTTPException(status_code=400, detail="No candidates uploaded for this job.")

    res_matches = await db.execute(select(JobCandidateMatch).where(JobCandidateMatch.job_id == job_id))
    matches = res_matches.scalars().all()

    cand_profiles = [CandidateProfile(**c.parsed_profile) for c in candidates if c.parsed_profile]
    std_matches_dict = [{"final_score": m.final_score} for m in matches]
    parsed_jd = JobDescription(**job.parsed_jd) if job.parsed_jd else JobDescription()

    audit_res = await run_bias_audit_agent(cand_profiles, std_matches_dict, parsed_jd)

    new_report = AuditReport(
        job_id=job_id,
        blind_scores=audit_res.get("blind_scores", {}),
        disparate_impact_summary=audit_res.get("disparate_impact_summary", {})
    )
    db.add(new_report)
    await db.commit()
    await db.refresh(new_report)

    return new_report
