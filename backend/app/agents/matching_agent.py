import asyncio
from typing import Dict, Any
from backend.app.schemas.job import JobDescription
from backend.app.schemas.candidate import CandidateProfile
from backend.app.services.scoring import compute_explainable_match
from backend.app.services.vector_store import faiss_store
import logging

logger = logging.getLogger("smarthire.agents.matching_agent")

async def run_matching_agent(
    candidate_id: str,
    raw_resume_text: str,
    candidate_profile: CandidateProfile,
    job_description: JobDescription
) -> Dict[str, Any]:
    """
    Matching Agent: Evaluates candidate against job requirements, indexes resume in FAISS,
    and calculates sub-scores + Explainable AI (XAI) breakdown.
    """
    logger.info(f"Executing Matching Agent for candidate '{candidate_profile.name}' ({candidate_id})...")

    # Index resume chunks in FAISS for candidate RAG chat
    # Embedding and scoring are CPU-bound; keep them off the event loop.
    await asyncio.to_thread(
        faiss_store.add_candidate_chunks,
        candidate_id=candidate_id,
        candidate_name=candidate_profile.name,
        text=raw_resume_text
    )

    # Compute Explainable AI Score Breakdown
    match_data = await asyncio.to_thread(compute_explainable_match, candidate_profile, job_description)
    return match_data
