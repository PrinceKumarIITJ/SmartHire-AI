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
    title: str
    raw_jd: str

class JobResponse(BaseModel):
    id: str
    title: str
    raw_jd: str
    parsed_jd: Optional[JobDescription] = None
    created_at: datetime

    class Config:
        from_attributes = True
