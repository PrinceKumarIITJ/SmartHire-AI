from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.db.database import get_db
from backend.app.db.models import Candidate, ChatLog
from backend.app.schemas.candidate import CandidateResponse
from backend.app.agents.chat_agent import run_chat_agent
import logging

logger = logging.getLogger("smarthire.api.candidates")
router = APIRouter(prefix="/api/candidates", tags=["Candidates"])

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str
    citations: List[str]
    chunks_used: List[str]

@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch candidate profile and resume text."""
    candidate = await db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

@router.post("/{candidate_id}/chat", response_model=ChatResponse)
async def chat_with_candidate(
    candidate_id: str,
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """Execute Candidate Chat Agent (RAG over FAISS resume chunks) with citation sources."""
    candidate = await db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    prof = candidate.parsed_profile or {}
    cand_name = prof.get("name") or candidate.filename or "Candidate"

    # Persist user chat message
    user_msg = ChatLog(candidate_id=candidate_id, role="user", message=payload.message)
    db.add(user_msg)

    # Run Candidate Chat Agent
    result = await run_chat_agent(
        candidate_id=candidate_id,
        candidate_name=cand_name,
        user_question=payload.message
    )

    # Persist assistant response
    assistant_msg = ChatLog(candidate_id=candidate_id, role="assistant", message=result["answer"])
    db.add(assistant_msg)
    await db.commit()

    return ChatResponse(
        answer=result["answer"],
        citations=result["citations"],
        chunks_used=result["chunks_used"]
    )
