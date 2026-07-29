from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.db.database import get_db
from backend.app.db.models import EmailDraft, Candidate
from backend.app.schemas.email import EmailDraftResponse, EmailDraftUpdate
from backend.app.agents.email_agent import send_smtp_email
import logging

logger = logging.getLogger("smarthire.api.emails")
router = APIRouter(prefix="/api/email-drafts", tags=["Email Drafts & Dispatch"])

@router.get("/jobs/{job_id}", response_model=List[EmailDraftResponse])
async def list_email_drafts_for_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """List all AI-generated candidate notification email drafts for a job."""
    query = (
        select(EmailDraft, Candidate)
        .join(Candidate, EmailDraft.candidate_id == Candidate.id)
        .where(EmailDraft.job_id == job_id)
        .order_by(EmailDraft.created_at.desc())
    )
    result = await db.execute(query)
    rows = result.all()

    output = []
    for draft, candidate in rows:
        cp = candidate.parsed_profile or {}
        cand_name = cp.get("name") or candidate.filename or "Candidate"
        cand_email = cp.get("email") or ""

        resp = EmailDraftResponse(
            id=draft.id,
            job_id=draft.job_id,
            candidate_id=draft.candidate_id,
            candidate_name=cand_name,
            candidate_email=cand_email,
            type=draft.type,
            subject=draft.subject,
            body=draft.body,
            status=draft.status,
            sent_at=draft.sent_at,
            created_at=draft.created_at
        )
        output.append(resp)

    return output

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

    if payload.subject is not None:
        draft.subject = payload.subject
    if payload.body is not None:
        draft.body = payload.body
    if payload.status is not None:
        draft.status = payload.status

    await db.commit()
    await db.refresh(draft)

    candidate = await db.get(Candidate, draft.candidate_id)
    cp = candidate.parsed_profile if candidate else {}
    cand_name = cp.get("name") if cp else "Candidate"
    cand_email = cp.get("email") if cp else ""

    return EmailDraftResponse(
        id=draft.id,
        job_id=draft.job_id,
        candidate_id=draft.candidate_id,
        candidate_name=cand_name,
        candidate_email=cand_email,
        type=draft.type,
        subject=draft.subject,
        body=draft.body,
        status=draft.status,
        sent_at=draft.sent_at,
        created_at=draft.created_at
    )

@router.post("/{draft_id}/send")
async def send_approved_email(draft_id: str, db: AsyncSession = Depends(get_db)):
    """Approve & dispatch email draft via SMTP."""
    draft = await db.get(EmailDraft, draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Email draft not found")

    candidate = await db.get(Candidate, draft.candidate_id)
    cp = candidate.parsed_profile if candidate else {}
    cand_email = (cp.get("email") if cp else "") or "candidate@example.com"

    success = send_smtp_email(cand_email, draft.subject, draft.body)

    if success:
        draft.status = "sent"
        draft.sent_at = datetime.utcnow()
        await db.commit()
        return {"message": f"Email successfully dispatched to {cand_email}.", "status": "sent"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email via SMTP service.")
