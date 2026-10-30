from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.db.database import get_db
from backend.app.db.models import Job, Candidate, JobCandidateMatch, EmailDraft
from backend.app.schemas.analytics import AnalyticsOverview, Bucket, SkillFrequency, ActivityItem

router = APIRouter(prefix="/analytics", tags=["Analytics"])

SCORE_BUCKETS = [(0.0, 0.4, "0-40"), (0.4, 0.55, "40-55"), (0.55, 0.7, "55-70"), (0.7, 0.85, "70-85"), (0.85, 1.01, "85-100")]


@router.get("/overview", response_model=AnalyticsOverview)
async def analytics_overview(db: AsyncSession = Depends(get_db)):
    """Workspace-wide hiring funnel, score distribution and skill demand."""
    jobs = (await db.execute(select(Job).order_by(Job.created_at.desc()))).scalars().all()
    candidates = (await db.execute(select(Candidate).order_by(Candidate.created_at.desc()))).scalars().all()
    matches = (await db.execute(select(JobCandidateMatch))).scalars().all()
    drafts = (await db.execute(select(EmailDraft))).scalars().all()

    job_titles = {j.id: j.title for j in jobs}
    status_counts = Counter(m.status or "Pending" for m in matches)
    scores = [m.final_score or 0.0 for m in matches]

    distribution = [
        Bucket(label=label, count=sum(1 for s in scores if lo <= s < hi))
        for lo, hi, label in SCORE_BUCKETS
    ]

    matched_counter, missing_counter = Counter(), Counter()
    for m in matches:
        matched_counter.update(s.strip() for s in (m.matched_skills or []) if s.strip())
        missing_counter.update(s.strip() for s in (m.missing_skills or []) if s.strip())
    top_skill_names = [s for s, _ in (matched_counter + missing_counter).most_common(10)]
    top_skills = [
        SkillFrequency(skill=s, matched=matched_counter[s], missing=missing_counter[s])
        for s in top_skill_names
    ]

    activity = []
    for j in jobs[:5]:
        activity.append(ActivityItem(
            kind="job_created", title=f"Job opened: {j.title}",
            subtitle=j.department or "", href=f"/jobs/{j.id}", timestamp=j.created_at.isoformat(),
        ))
    for c in candidates[:8]:
        name = (c.parsed_profile or {}).get("name") or c.filename
        activity.append(ActivityItem(
            kind="resume_uploaded", title=f"Resume received: {name}",
            subtitle=job_titles.get(c.job_id, ""), href=f"/candidates/{c.id}", timestamp=c.created_at.isoformat(),
        ))
    for d in sorted((d for d in drafts if d.sent_at), key=lambda d: d.sent_at, reverse=True)[:5]:
        activity.append(ActivityItem(
            kind="email_sent", title=f"{d.type.capitalize()} email sent",
            subtitle=d.subject, href="/outbox", timestamp=d.sent_at.isoformat(),
        ))
    activity.sort(key=lambda a: a.timestamp, reverse=True)

    return AnalyticsOverview(
        total_jobs=len(jobs),
        open_jobs=sum(1 for j in jobs if (j.status or "open") == "open"),
        total_candidates=len(candidates),
        processed_candidates=len(matches),
        shortlisted=status_counts.get("Shortlisted", 0),
        interviews=status_counts.get("Interview", 0),
        rejected=status_counts.get("Rejected", 0),
        emails_sent=sum(1 for d in drafts if d.status == "sent"),
        emails_pending=sum(1 for d in drafts if d.status != "sent"),
        avg_score=round(sum(scores) / len(scores), 3) if scores else 0.0,
        score_distribution=distribution,
        status_breakdown=[Bucket(label=k, count=v) for k, v in status_counts.most_common()],
        top_skills=top_skills,
        recent_activity=activity[:10],
    )
