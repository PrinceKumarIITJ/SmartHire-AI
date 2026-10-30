from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.db.database import get_db
from backend.app.db.models import EmailDraft, Candidate, Job
from backend.app.schemas.email import EmailDraftResponse, EmailDraftUpdate
from backend.app.agents.email_agent import send_smtp_email
import logging

logger = logging.getLogger("smarthire.api.emails")
router = APIRouter(prefix="/email-drafts", tags=["Email Drafts & Dispatch"])

def _draft_response(draft: EmailDraft, candidate: Optional[Candidate], job_title: str = "") -> EmailDraftResponse:
    cp = (candidate.parsed_profile if candidate else None) or {}
    return EmailDraftResponse(
        id=draft.id,
        job_id=draft.job_id,
        candidate_id=draft.candidate_id,
        candidate_name=cp.get("name") or (candidate.filename if candidate else "") or "Candidate",
        candidate_email=cp.get("email") or "",
        job_title=job_title,
        type=draft.type,
        subject=draft.subject,
        body=draft.body,
        status=draft.status,
        sent_at=draft.sent_at,
        created_at=draft.created_at
    )

@router.get("", response_model=List[EmailDraftResponse])
async def list_all_email_drafts(status: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Workspace outbox: every email draft across jobs, optionally filtered by status."""
    query = (
        select(EmailDraft, Candidate, Job.title)
        .join(Candidate, EmailDraft.candidate_id == Candidate.id)
        .join(Job, EmailDraft.job_id == Job.id)
        .order_by(EmailDraft.created_at.desc())
    )
    if status:
        query = query.where(EmailDraft.status == status)
    result = await db.execute(query)
    return [_draft_response(d, c, title) for d, c, title in result.all()]

@router.get("/jobs/{job_id}", response_model=List[EmailDraftResponse])
async def list_email_drafts_for_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """List all AI-generated candidate notification email drafts for a job."""
    query = (
        select(EmailDraft, Candidate, Job.title)
        .join(Candidate, EmailDraft.candidate_id == Candidate.id)
        .join(Job, EmailDraft.job_id == Job.id)
        .where(EmailDraft.job_id == job_id)
        .order_by(EmailDraft.created_at.desc())
    )
    result = await db.execute(query)
    return [_draft_response(d, c, title) for d, c, title in result.all()]

@router.patch("/{draft_id}", response_model=EmailDraftResponse)
async def update_email_draft(
    draft_id: str,
    payload: EmailDraftUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Edit subject, body, or status of an email draft (Human-in-the-Loop review)."""
    draft = await db.get(EmailDraft, draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Email draft not found")
    if draft.status == "sent":
        raise HTTPException(status_code=409, detail="This email has already been sent and can no longer be edited.")

    if payload.subject is not None:
        draft.subject = payload.subject
    if payload.body is not None:
        draft.body = payload.body
    if payload.status is not None:
        draft.status = payload.status

    await db.commit()
    await db.refresh(draft)

    candidate = await db.get(Candidate, draft.candidate_id)
    job = await db.get(Job, draft.job_id)
    return _draft_response(draft, candidate, job.title if job else "")

@router.post("/{draft_id}/send")
async def send_approved_email(draft_id: str, db: AsyncSession = Depends(get_db)):
    """Approve & dispatch email draft via SMTP."""
    draft = await db.get(EmailDraft, draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Email draft not found")
    if draft.status == "sent":
        raise HTTPException(status_code=409, detail="This email has already been sent.")

    candidate = await db.get(Candidate, draft.candidate_id)
    cp = candidate.parsed_profile if candidate else {}
    cand_email = (cp.get("email") if cp else "") or ""
    if not cand_email:
        raise HTTPException(status_code=422, detail="No email address was found on this candidate's resume.")

    success = send_smtp_email(cand_email, draft.subject, draft.body)

    if success:
        draft.status = "sent"
        draft.sent_at = datetime.utcnow()
        await db.commit()
        return {"message": f"Email successfully dispatched to {cand_email}.", "status": "sent"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email via SMTP service.")
