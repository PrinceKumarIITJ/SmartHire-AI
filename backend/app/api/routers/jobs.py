import asyncio
import csv
import io
import json
import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.core.config import get_settings
from backend.app.db.database import get_db
from backend.app.db.cleanup import delete_job_tree
from backend.app.db.models import Job, Candidate, JobCandidateMatch
from backend.app.schemas.job import JobCreate, JobUpdate, JobResponse
from backend.app.schemas.match import MatchResultResponse
from backend.app.schemas.candidate import TalentPoolItem
from backend.app.agents.jd_agent import run_jd_agent
from backend.app.services.pipeline_runner import execute_pipeline, PipelineError
from backend.app.services.progress import progress_bus
from backend.app.services.parser import parse_resume_file
from backend.app.services.integrity import analyze_resume
from backend.app.services.vector_store import faiss_store
from backend.app.api.serializers import match_to_response, compute_job_stats, job_to_response, candidate_display, integrity_risk
import logging

logger = logging.getLogger("smarthire.api.jobs")
router = APIRouter(prefix="/jobs", tags=["Jobs"])
settings = get_settings()
# Strong references so background pipeline tasks are not garbage-collected mid-run.
_background_runs: set = set()


async def _get_job_or_404(db: AsyncSession, job_id: str) -> Job:
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(payload: JobCreate, db: AsyncSession = Depends(get_db)):
    """Create a job posting and parse raw JD text with JD Agent."""
    try:
        parsed_jd = await run_jd_agent(payload.raw_jd)
    except Exception as e:
        logger.error(f"JD Agent failed while creating job: {e}")
        raise HTTPException(
            status_code=502,
            detail="The JD Agent could not parse this description. Check that GOOGLE_API_KEY or GROQ_API_KEY is configured.",
        )

    job = Job(
        title=payload.title.strip(),
        raw_jd=payload.raw_jd,
        parsed_jd=parsed_jd.model_dump(),
        department=payload.department,
        location=payload.location,
        employment_type=payload.employment_type,
        status="open",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    stats = await compute_job_stats(db, [job.id])
    return job_to_response(job, stats[job.id])


@router.get("", response_model=List[JobResponse])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    """List all jobs with candidate pipeline statistics."""
    result = await db.execute(select(Job).order_by(Job.created_at.desc()))
    jobs = result.scalars().all()
    stats = await compute_job_stats(db, [j.id for j in jobs])
    return [job_to_response(j, stats[j.id]) for j in jobs]


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Get single job detail with statistics."""
    job = await _get_job_or_404(db, job_id)
    stats = await compute_job_stats(db, [job_id])
    return job_to_response(job, stats[job_id])


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(job_id: str, payload: JobUpdate, db: AsyncSession = Depends(get_db)):
    """Update job metadata or open/paused/closed status."""
    job = await _get_job_or_404(db, job_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    await db.commit()
    await db.refresh(job)
    stats = await compute_job_stats(db, [job_id])
    return job_to_response(job, stats[job_id])


@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a job and every candidate, match, report and draft attached to it."""
    job = await _get_job_or_404(db, job_id)
    cand_ids = (await db.execute(select(Candidate.id).where(Candidate.job_id == job_id))).scalars().all()
    await delete_job_tree(db, job.id, list(cand_ids))
    await db.commit()
    for cid in cand_ids:
        faiss_store.remove_candidate(cid)


@router.get("/{job_id}/candidates", response_model=List[TalentPoolItem])
async def list_job_candidates(job_id: str, db: AsyncSession = Depends(get_db)):
    """List every resume uploaded for a job, processed or not."""
    job = await _get_job_or_404(db, job_id)
    rows = await db.execute(
        select(Candidate, JobCandidateMatch)
        .outerjoin(JobCandidateMatch, JobCandidateMatch.candidate_id == Candidate.id)
        .where(Candidate.job_id == job_id)
        .order_by(Candidate.created_at.desc())
    )
    items = []
    for cand, match in rows.all():
        display = candidate_display(cand)
        profile = cand.parsed_profile or {}
        items.append(TalentPoolItem(
            candidate_id=cand.id,
            job_id=job_id,
            job_title=job.title,
            name=display["name"],
            email=display["email"],
            filename=cand.filename,
            skills=profile.get("skills") or [],
            total_experience_years=float(profile.get("total_experience_years") or 0.0),
            final_score=match.final_score if match else None,
            status=match.status if match else "Unprocessed",
            integrity_risk=integrity_risk(cand),
            created_at=cand.created_at,
        ))
    return items


@router.post("/{job_id}/resumes", status_code=201)
async def upload_resumes(
    job_id: str,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload resume files for a job, parse text, and persist candidate records."""
    await _get_job_or_404(db, job_id)

    if len(files) > settings.max_files_per_upload:
        raise HTTPException(status_code=413, detail=f"At most {settings.max_files_per_upload} files per upload.")

    max_bytes = settings.max_upload_mb * 1024 * 1024
    uploaded, skipped = [], []
    for file in files:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in settings.allowed_extensions:
            skipped.append({"filename": file.filename, "reason": f"Unsupported file type '{ext or 'none'}'"})
            continue
        file_bytes = await file.read()
        if len(file_bytes) > max_bytes:
            skipped.append({"filename": file.filename, "reason": f"Exceeds {settings.max_upload_mb} MB limit"})
            continue

        extracted_text = parse_resume_file(file.filename, file_bytes)
        if not extracted_text.strip():
            skipped.append({"filename": file.filename, "reason": "No extractable text (scanned image PDF?)"})
            continue

        # Guardrail: detect and strip hidden / injected instructions before any agent reads the text.
        sanitized_text, integrity = analyze_resume(file.filename, file_bytes, extracted_text)
        candidate = Candidate(
            job_id=job_id, filename=file.filename, raw_resume_text=sanitized_text, integrity_report=integrity,
        )
        db.add(candidate)
        uploaded.append(candidate)

    await db.commit()
    return {
        "message": f"Uploaded {len(uploaded)} resume(s).",
        "job_id": job_id,
        "uploaded": [
            {"candidate_id": c.id, "filename": c.filename, "integrity_risk": c.integrity_report["risk_level"]}
            for c in uploaded
        ],
        "skipped": skipped,
    }


@router.post("/{job_id}/run")
async def run_matching_pipeline(job_id: str):
    """Run the LangGraph pipeline and wait for it to finish (simple clients, tests)."""
    if progress_bus.is_running(job_id):
        raise HTTPException(status_code=409, detail="A pipeline run is already in progress for this job.")
    try:
        return await execute_pipeline(job_id)
    except PipelineError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.post("/{job_id}/runs", status_code=202)
async def start_pipeline_run(job_id: str, db: AsyncSession = Depends(get_db)):
    """Start the pipeline in the background; follow it via GET /jobs/{id}/runs/events (SSE)."""
    await _get_job_or_404(db, job_id)
    if progress_bus.is_running(job_id):
        raise HTTPException(status_code=409, detail="A pipeline run is already in progress for this job.")
    count = len((await db.execute(select(Candidate.id).where(Candidate.job_id == job_id))).scalars().all())
    if not count:
        raise HTTPException(status_code=400, detail="No resumes uploaded for this job yet.")

    progress_bus.start(job_id, total=count)

    async def _run():
        try:
            await execute_pipeline(job_id)
        except PipelineError:
            pass  # already published as a 'failed' event

    task = asyncio.create_task(_run())
    _background_runs.add(task)
    task.add_done_callback(_background_runs.discard)
    return {"status": "running", "job_id": job_id, "total": count}


@router.get("/{job_id}/runs/status")
async def pipeline_run_status(job_id: str):
    """Latest progress snapshot for this job's pipeline run."""
    snap = progress_bus.snapshot(job_id)
    if not snap:
        return {"job_id": job_id, "status": "idle"}
    return {k: v for k, v in snap.items() if k != "events"} | {"recent_events": snap["events"][-30:]}


@router.get("/{job_id}/runs/events")
async def pipeline_run_events(job_id: str, request: Request):
    """Server-Sent Events stream of live agent progress."""
    def sse(data: dict, event: str = "") -> str:
        prefix = f"event: {event}\n" if event else ""
        return f"{prefix}data: {json.dumps(data)}\n\n"

    async def stream():
        snap = progress_bus.snapshot(job_id)
        if not snap:
            yield sse({"job_id": job_id, "status": "idle"}, "snapshot")
            return
        yield sse({k: v for k, v in snap.items() if k != "events"} | {"events": snap["events"][-50:]}, "snapshot")
        if snap["status"] != "running":
            return
        async for event in progress_bus.subscribe(job_id):
            if await request.is_disconnected():
                return
            # SSE comment line: keeps the connection alive without reaching the client's handlers.
            yield ": ping\n\n" if event.get("type") == "heartbeat" else sse(event)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _ranked_results(db: AsyncSession, job_id: str) -> List[MatchResultResponse]:
    query = (
        select(JobCandidateMatch, Candidate)
        .join(Candidate, JobCandidateMatch.candidate_id == Candidate.id)
        .where(JobCandidateMatch.job_id == job_id)
        .order_by(JobCandidateMatch.final_score.desc())
    )
    result = await db.execute(query)
    return [match_to_response(m, c) for m, c in result.all()]


@router.get("/{job_id}/results", response_model=List[MatchResultResponse])
async def get_job_results(job_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch ranked candidate leaderboard with Explainable AI score breakdown."""
    return await _ranked_results(db, job_id)


@router.get("/{job_id}/results/export")
async def export_job_results(job_id: str, db: AsyncSession = Depends(get_db)):
    """Download the ranked leaderboard as CSV."""
    job = await _get_job_or_404(db, job_id)
    results = await _ranked_results(db, job_id)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        "Rank", "Candidate", "Email", "Status", "Final Score", "Semantic", "Skills",
        "Experience", "Projects", "Education", "Confidence", "Years Experience",
        "Matched Skills", "Missing Skills", "Reasoning", "Recruiter Notes",
    ])
    for rank, r in enumerate(results, 1):
        writer.writerow([
            rank, r.candidate_name, r.candidate_email, r.status,
            f"{r.final_score * 100:.1f}", f"{r.semantic_score * 100:.1f}", f"{r.skill_score * 100:.1f}",
            f"{r.experience_score * 100:.1f}", f"{r.project_score * 100:.1f}", f"{r.education_score * 100:.1f}",
            f"{r.confidence_score * 100:.0f}", r.total_experience_years,
            "; ".join(r.matched_skills), "; ".join(r.missing_skills), r.reasoning, r.notes,
        ])

    safe_title = "".join(ch if ch.isalnum() else "_" for ch in job.title).strip("_") or "job"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="smarthire_{safe_title}_shortlist.csv"'},
    )
