from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class EmailDraftUpdate(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern="^(draft|approved)$")

class EmailDraftResponse(BaseModel):
    id: str
    job_id: str
    candidate_id: str
    candidate_name: Optional[str] = ""
    candidate_email: Optional[str] = ""
    job_title: Optional[str] = ""
    type: str
    subject: str
    body: str
    status: str
    sent_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
