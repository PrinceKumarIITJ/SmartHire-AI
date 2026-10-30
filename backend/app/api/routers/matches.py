from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.db.database import get_db
from backend.app.db.models import Candidate, JobCandidateMatch
from backend.app.schemas.match import MatchResultResponse, MatchUpdate
from backend.app.api.serializers import match_to_response

router = APIRouter(prefix="/matches", tags=["Matches"])


@router.patch("/{match_id}", response_model=MatchResultResponse)
async def update_match(match_id: str, payload: MatchUpdate, db: AsyncSession = Depends(get_db)):
    """Recruiter override of the AI recommendation (status) and private notes."""
    match = await db.get(JobCandidateMatch, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if payload.status is not None:
        match.status = payload.status
        match.status_source = "recruiter"
    if payload.notes is not None:
        match.notes = payload.notes
    await db.commit()
    await db.refresh(match)

    candidate = await db.get(Candidate, match.candidate_id)
    return match_to_response(match, candidate)
