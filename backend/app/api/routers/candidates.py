import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.app.db.database import get_db
from backend.app.db.cleanup import delete_candidates
from backend.app.db.models import Candidate, ChatLog, Job, JobCandidateMatch
from backend.app.schemas.candidate import (
    CandidateResponse, CandidateProfile, TalentPoolItem, ChatMessage, InterviewKit,
)
from backend.app.schemas.job import JobDescription
from backend.app.schemas.match import MatchResultResponse
from backend.app.agents.chat_agent import run_chat_agent
from backend.app.agents.interview_agent import run_interview_agent
from backend.app.services.vector_store import faiss_store
from backend.app.api.serializers import candidate_display, match_to_response, integrity_risk
import logging

logger = logging.getLogger("smarthire.api.candidates")
router = APIRouter(prefix="/candidates", tags=["Candidates"])

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)

class ChatResponse(BaseModel):
    answer: str
    citations: List[str]
    chunks_used: List[str]


async def _get_candidate_or_404(db: AsyncSession, candidate_id: str) -> Candidate:
    candidate = await db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.get("", response_model=List[TalentPoolItem])
async def list_talent_pool(
    q: Optional[str] = Query(default=None, description="Search name, email, filename or skill"),
    status: Optional[str] = None,
    min_score: float = Query(default=0.0, ge=0.0, le=1.0),
    limit: int = Query(default=200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """Talent pool across every job, with the candidate's match score and status."""
    rows = await db.execute(
        select(Candidate, Job.title, JobCandidateMatch)
        .join(Job, Job.id == Candidate.job_id)
        .outerjoin(JobCandidateMatch, JobCandidateMatch.candidate_id == Candidate.id)
        .order_by(Candidate.created_at.desc())
    )
    needle = (q or "").strip().lower()
    items: List[TalentPoolItem] = []
    for cand, job_title, match in rows.all():
        display = candidate_display(cand)
        profile = cand.parsed_profile or {}
        skills = profile.get("skills") or []
        item_status = match.status if match else "Unprocessed"
        score = match.final_score if match else None

        if status and item_status != status:
            continue
        if min_score > 0 and (score or 0.0) < min_score:
            continue
        if needle:
            haystack = " ".join([display["name"], display["email"], cand.filename, job_title, *skills]).lower()
            if needle not in haystack:
                continue

        items.append(TalentPoolItem(
            candidate_id=cand.id,
            job_id=cand.job_id,
            job_title=job_title,
            name=display["name"],
            email=display["email"],
            filename=cand.filename,
            skills=skills,
            total_experience_years=float(profile.get("total_experience_years") or 0.0),
            final_score=score,
            status=item_status,
            integrity_risk=integrity_risk(cand),
            created_at=cand.created_at,
        ))
        if len(items) >= limit:
            break
    return items


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch candidate profile and resume text."""
    return await _get_candidate_or_404(db, candidate_id)


@router.delete("/{candidate_id}", status_code=204)
async def delete_candidate(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """Remove a candidate, their match, drafts, chat history and vector chunks."""
    await _get_candidate_or_404(db, candidate_id)
    await delete_candidates(db, [candidate_id])
    await db.commit()
    faiss_store.remove_candidate(candidate_id)


@router.get("/{candidate_id}/match", response_model=MatchResultResponse)
async def get_candidate_match(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """Explainable AI match breakdown for a candidate against their job."""
    candidate = await _get_candidate_or_404(db, candidate_id)
    res = await db.execute(select(JobCandidateMatch).where(JobCandidateMatch.candidate_id == candidate_id))
    match = res.scalars().first()
    if not match:
        raise HTTPException(status_code=404, detail="This candidate has not been evaluated yet. Run the pipeline first.")
    return match_to_response(match, candidate)


@router.get("/{candidate_id}/chat", response_model=List[ChatMessage])
async def get_chat_history(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """Persisted recruiter <-> assistant chat history for a candidate."""
    await _get_candidate_or_404(db, candidate_id)
    res = await db.execute(
        select(ChatLog).where(ChatLog.candidate_id == candidate_id).order_by(ChatLog.created_at)
    )
    return [ChatMessage(role=c.role, message=c.message, created_at=c.created_at) for c in res.scalars().all()]


@router.delete("/{candidate_id}/chat", status_code=204)
async def clear_chat_history(candidate_id: str, db: AsyncSession = Depends(get_db)):
    await _get_candidate_or_404(db, candidate_id)
    await db.execute(delete(ChatLog).where(ChatLog.candidate_id == candidate_id))
    await db.commit()


@router.post("/{candidate_id}/chat", response_model=ChatResponse)
async def chat_with_candidate(
    candidate_id: str,
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """Execute Candidate Chat Agent (RAG over FAISS resume chunks) with citation sources."""
    candidate = await _get_candidate_or_404(db, candidate_id)
    cand_name = candidate_display(candidate)["name"]

    # The FAISS index is in-memory; rebuild this candidate's chunks after a restart.
    if not faiss_store.has_candidate(candidate_id) and candidate.raw_resume_text:
        await asyncio.to_thread(faiss_store.add_candidate_chunks, candidate_id, cand_name, candidate.raw_resume_text)

    try:
        result = await run_chat_agent(
            candidate_id=candidate_id,
            candidate_name=cand_name,
            user_question=payload.message
        )
    except Exception as e:
        logger.error(f"Chat Agent failed: {e}")
        raise HTTPException(status_code=502, detail="The chat assistant is unavailable. Check the LLM provider configuration.")

    db.add(ChatLog(candidate_id=candidate_id, role="user", message=payload.message))
    db.add(ChatLog(candidate_id=candidate_id, role="assistant", message=result["answer"]))
    await db.commit()

    return ChatResponse(
        answer=result["answer"],
        citations=result["citations"],
        chunks_used=result["chunks_used"]
    )


@router.post("/{candidate_id}/interview-kit", response_model=InterviewKit)
async def generate_interview_kit(
    candidate_id: str,
    count: int = Query(default=8, ge=3, le=15),
    db: AsyncSession = Depends(get_db),
):
    """Interview Agent: tailored questions that verify strengths and probe skill gaps."""
    candidate = await _get_candidate_or_404(db, candidate_id)
    job = await db.get(Job, candidate.job_id)
    res = await db.execute(select(JobCandidateMatch).where(JobCandidateMatch.candidate_id == candidate_id))
    match = res.scalars().first()

    profile = CandidateProfile(**candidate.parsed_profile) if candidate.parsed_profile else CandidateProfile(
        name=candidate_display(candidate)["name"]
    )
    parsed_jd = JobDescription(**job.parsed_jd) if job and job.parsed_jd else JobDescription(title=job.title if job else "")
    match_dict = {
        "matched_skills": match.matched_skills if match else [],
        "missing_skills": match.missing_skills if match else [],
        "reasoning": match.reasoning if match else "",
    }
    return await run_interview_agent(parsed_jd, profile, match_dict, count)
