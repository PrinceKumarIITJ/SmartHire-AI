from typing import List
from pydantic import BaseModel, Field

class Bucket(BaseModel):
    label: str
    count: int

class SkillFrequency(BaseModel):
    skill: str
    matched: int = 0
    missing: int = 0

class ActivityItem(BaseModel):
    kind: str  # 'job_created', 'resume_uploaded', 'email_sent'
    title: str
    subtitle: str = ""
    href: str = ""
    timestamp: str

class AnalyticsOverview(BaseModel):
    total_jobs: int = 0
    open_jobs: int = 0
    total_candidates: int = 0
    processed_candidates: int = 0
    shortlisted: int = 0
    interviews: int = 0
    rejected: int = 0
    emails_sent: int = 0
    emails_pending: int = 0
    avg_score: float = 0.0
    score_distribution: List[Bucket] = Field(default_factory=list)
    status_breakdown: List[Bucket] = Field(default_factory=list)
    top_skills: List[SkillFrequency] = Field(default_factory=list)
    recent_activity: List[ActivityItem] = Field(default_factory=list)
