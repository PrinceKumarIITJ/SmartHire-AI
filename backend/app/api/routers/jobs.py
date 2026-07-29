from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.db.database import get_db
from backend.app.db.models import Job, Candidate, JobCandidateMatch, ExecutiveReport, AuditReport, EmailDraft
from backend.app.schemas.job import JobCreate, JobResponse
from backend.app.schemas.match import MatchResultResponse
from backend.app.agents.jd_agent import run_jd_agent
from backend.app.agents.orchestrator import smart_hire_app
from backend.app.services.parser import parse_resume_file
import logging

logger = logging.getLogger("smarthire.api.jobs")
router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

@router.post("", response_model=JobResponse)
async def create_job(payload: JobCreate, db: AsyncSession = Depends(get_db)):
    """Create a job posting and parse raw JD text with JD Agent."""
    try:
        parsed_jd = await run_jd_agent(payload.raw_jd)
        parsed_dict = parsed_jd.model_dump()
        
        job = Job(
            title=payload.title,
            raw_jd=payload.raw_jd,
            parsed_jd=parsed_dict
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job
    except Exception as e:
        logger.error(f"Error creating job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[JobResponse])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    """List all created jobs."""
    result = await db.execute(select(Job).order_by(Job.created_at.desc()))
    return result.scalars().all()

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Get single job detail."""
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/{job_id}/resumes")
async def upload_resumes(
    job_id: str,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload resume files for a job, parse text, and persist candidate records."""
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    uploaded_candidates = []
    for file in files:
        file_bytes = await file.read()
        extracted_text = parse_resume_file(file.filename, file_bytes)

        if not extracted_text:
            extracted_text = f"Candidate Resume ({file.filename}) - text extraction returned empty."

        candidate = Candidate(
            job_id=job_id,
            filename=file.filename,
            raw_resume_text=extracted_text
        )
        db.add(candidate)
        uploaded_candidates.append(candidate)

    await db.commit()
    for c in uploaded_candidates:
        await db.refresh(c)

    return {"message": f"Successfully uploaded {len(uploaded_candidates)} resumes.", "job_id": job_id}

@router.post("/{job_id}/run")
async def run_matching_pipeline(job_id: str, db: AsyncSession = Depends(get_db)):
    """Execute LangGraph Multi-Agent Orchestration pipeline for a job's candidate batch."""
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    res_cands = await db.execute(select(Candidate).where(Candidate.job_id == job_id))
    candidates = res_cands.scalars().all()

    if not candidates:
        raise HTTPException(status_code=400, detail="No resumes uploaded for this job yet.")

    resumes_input = [
        {"id": c.id, "filename": c.filename, "raw_text": c.raw_resume_text}
        for c in candidates
    ]

    # Initialize Graph State
    initial_state = {
        "job_id": job_id,
        "raw_jd": job.raw_jd,
        "parsed_jd": None,
        "resumes": resumes_input,
        "parsed_candidates": [],
        "match_results": [],
        "audit_report": None,
        "executive_report": None,
        "email_drafts": [],
        "error": None
    }

    # Execute LangGraph Pipeline
    final_state = await smart_hire_app.ainvoke(initial_state)

    if final_state.get("error"):
        raise HTTPException(status_code=500, detail=f"Pipeline error: {final_state['error']}")

    # Update Parsed Candidate Profiles in DB
    for cand_db, parsed_prof in zip(candidates, final_state["parsed_candidates"]):
        cand_db.parsed_profile = parsed_prof.model_dump()
        db.add(cand_db)

    # Persist Match Results
    for m in final_state["match_results"]:
        # Check existing match row
        res_existing = await db.execute(
            select(JobCandidateMatch).where(
                JobCandidateMatch.job_id == job_id,
                JobCandidateMatch.candidate_id == m["candidate_id"]
            )
        )
        existing_match = res_existing.scalar_one_or_none()
        
        if existing_match:
            existing_match.semantic_score = m.get("semantic_score", 0.0)
            existing_match.skill_score = m.get("skill_score", 0.0)
            existing_match.experience_score = m.get("experience_score", 0.0)
            existing_match.project_score = m.get("project_score", 0.0)
            existing_match.education_score = m.get("education_score", 0.0)
            existing_match.final_score = m.get("final_score", 0.0)
            existing_match.confidence_score = m.get("confidence_score", 0.0)
            existing_match.matched_skills = m.get("matched_skills", [])
            existing_match.missing_skills = m.get("missing_skills", [])
            existing_match.reasoning = m.get("reasoning", "")
            existing_match.status = m.get("status", "Pending")
        else:
            match_row = JobCandidateMatch(
                job_id=job_id,
                candidate_id=m["candidate_id"],
                semantic_score=m.get("semantic_score", 0.0),
                skill_score=m.get("skill_score", 0.0),
                experience_score=m.get("experience_score", 0.0),
                project_score=m.get("project_score", 0.0),
                education_score=m.get("education_score", 0.0),
                final_score=m.get("final_score", 0.0),
                confidence_score=m.get("confidence_score", 0.0),
                matched_skills=m.get("matched_skills", []),
                missing_skills=m.get("missing_skills", []),
                reasoning=m.get("reasoning", ""),
                status=m.get("status", "Pending")
            )
            db.add(match_row)

    # Persist Executive Report
    if final_state.get("executive_report"):
        er_data = final_state["executive_report"]
        er = ExecutiveReport(
            job_id=job_id,
            summary_text=er_data.get("summary_text", ""),
            key_strengths=er_data.get("key_strengths", []),
            skill_gaps=er_data.get("skill_gaps", []),
            hiring_recommendations=er_data.get("hiring_recommendations", [])
        )
        db.add(er)

    # Persist Audit Report
    if final_state.get("audit_report"):
        ar_data = final_state["audit_report"]
        ar = AuditReport(
            job_id=job_id,
            blind_scores=ar_data.get("blind_scores", {}),
            disparate_impact_summary=ar_data.get("disparate_impact_summary", {})
        )
        db.add(ar)

    # Persist Email Drafts
    if final_state.get("email_drafts"):
        for d in final_state["email_drafts"]:
            email_row = EmailDraft(
                job_id=job_id,
                candidate_id=d["candidate_id"],
                type=d["type"],
                subject=d["subject"],
                body=d["body"],
                status="draft"
            )
            db.add(email_row)

    await db.commit()
    return {"message": "LangGraph multi-agent pipeline completed successfully.", "job_id": job_id}

@router.get("/{job_id}/results", response_model=List[MatchResultResponse])
async def get_job_results(job_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch ranked candidate leaderboard with Explainable AI score breakdown."""
    query = (
        select(JobCandidateMatch, Candidate)
        .join(Candidate, JobCandidateMatch.candidate_id == Candidate.id)
        .where(JobCandidateMatch.job_id == job_id)
        .order_by(JobCandidateMatch.final_score.desc())
    )
    result = await db.execute(query)
    rows = result.all()

    output = []
    for match, candidate in rows:
        cand_prof = candidate.parsed_profile or {}
        cand_name = cand_prof.get("name") or candidate.filename or "Unknown Candidate"
        cand_email = cand_prof.get("email") or ""

        match_res = MatchResultResponse(
            id=match.id,
            job_id=match.job_id,
            candidate_id=match.candidate_id,
            candidate_name=cand_name,
            candidate_email=cand_email,
            filename=candidate.filename,
            semantic_score=match.semantic_score,
            skill_score=match.skill_score,
            experience_score=match.experience_score,
            project_score=match.project_score,
            education_score=match.education_score,
            final_score=match.final_score,
            confidence_score=match.confidence_score,
            matched_skills=match.matched_skills or [],
            missing_skills=match.missing_skills or [],
            reasoning=match.reasoning or "",
            status=match.status or "Pending",
            created_at=match.created_at
        )
        output.append(match_res)

    return output
