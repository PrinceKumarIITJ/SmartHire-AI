from typing import Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.db.models import Job, Candidate, JobCandidateMatch
from backend.app.schemas.job import JobResponse, JobStats
from backend.app.schemas.match import MatchResultResponse


def candidate_display(candidate: Candidate) -> Dict[str, str]:
    profile = candidate.parsed_profile or {}
    return {
        "name": profile.get("name") or candidate.filename or "Unknown Candidate",
        "email": profile.get("email") or "",
    }


def integrity_risk(candidate: Candidate) -> str:
    return (candidate.integrity_report or {}).get("risk_level", "low")


def match_to_response(match: JobCandidateMatch, candidate: Candidate) -> MatchResultResponse:
    display = candidate_display(candidate)
    profile = candidate.parsed_profile or {}
    return MatchResultResponse(
        id=match.id,
        job_id=match.job_id,
        candidate_id=match.candidate_id,
        candidate_name=display["name"],
        candidate_email=display["email"],
        filename=candidate.filename,
        semantic_score=match.semantic_score or 0.0,
        skill_score=match.skill_score or 0.0,
        experience_score=match.experience_score or 0.0,
        project_score=match.project_score or 0.0,
        education_score=match.education_score or 0.0,
        final_score=match.final_score or 0.0,
        confidence_score=match.confidence_score or 0.0,
        matched_skills=match.matched_skills or [],
        missing_skills=match.missing_skills or [],
        reasoning=match.reasoning or "",
        status=match.status or "Pending",
        notes=match.notes or "",
        status_source=match.status_source or "ai",
        integrity_risk=integrity_risk(candidate),
        integrity_flags=len((candidate.integrity_report or {}).get("flags", [])),
        total_experience_years=float(profile.get("total_experience_years") or 0.0),
        created_at=match.created_at,
    )


async def compute_job_stats(db: AsyncSession, job_ids: List[str]) -> Dict[str, JobStats]:
    """Aggregate candidate and match counts for a set of jobs in two queries."""
    stats = {jid: JobStats() for jid in job_ids}
    if not job_ids:
        return stats

    cand_rows = await db.execute(select(Candidate.job_id).where(Candidate.job_id.in_(job_ids)))
    for (jid,) in cand_rows:
        stats[jid].candidate_count += 1

    match_rows = await db.execute(
        select(JobCandidateMatch.job_id, JobCandidateMatch.final_score, JobCandidateMatch.status)
        .where(JobCandidateMatch.job_id.in_(job_ids))
    )
    scores: Dict[str, List[float]] = {jid: [] for jid in job_ids}
    for jid, score, status in match_rows:
        s = stats[jid]
        s.processed_count += 1
        scores[jid].append(score or 0.0)
        if status == "Shortlisted":
            s.shortlisted_count += 1
        elif status == "Interview":
            s.interview_count += 1

    for jid, s in stats.items():
        if scores[jid]:
            s.avg_score = round(sum(scores[jid]) / len(scores[jid]), 3)
            s.top_score = round(max(scores[jid]), 3)
        if s.candidate_count == 0:
            s.pipeline_status = "awaiting_resumes"
        elif s.processed_count < s.candidate_count:
            s.pipeline_status = "ready"
        else:
            s.pipeline_status = "completed"
    return stats


def job_to_response(job: Job, stats: JobStats) -> JobResponse:
    resp = JobResponse.model_validate(job)
    resp.stats = stats
    return resp
