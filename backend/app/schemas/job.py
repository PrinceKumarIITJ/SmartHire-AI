from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class JobDescription(BaseModel):
    title: str = Field(default="Unknown Role", description="Job title")
    must_have_skills: List[str] = Field(default_factory=list, description="Essential required skills")
    preferred_skills: List[str] = Field(default_factory=list, description="Nice to have bonus skills")
    experience_years: float = Field(default=0.0, description="Minimum years of experience required")
    education: str = Field(default="", description="Minimum education qualification required")
    role_keywords: List[str] = Field(default_factory=list, description="Key domain or responsibility keywords")
    responsibilities: List[str] = Field(default_factory=list, description="Key duties and responsibilities")

class JobCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    raw_jd: str = Field(min_length=30, description="Full job description text")
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None

class JobUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern="^(open|paused|closed)$")

class JobStats(BaseModel):
    candidate_count: int = 0
    processed_count: int = 0
    shortlisted_count: int = 0
    interview_count: int = 0
    avg_score: float = 0.0
    top_score: float = 0.0
    pipeline_status: str = "awaiting_resumes"  # 'awaiting_resumes', 'ready', 'completed'

class JobResponse(BaseModel):
    id: str
    title: str
    raw_jd: str
    parsed_jd: Optional[JobDescription] = None
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    status: Optional[str] = "open"
    created_at: datetime
    stats: JobStats = Field(default_factory=JobStats)

    class Config:
        from_attributes = True
