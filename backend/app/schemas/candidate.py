from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class ProjectExperience(BaseModel):
    name: str = Field(default="Project", description="Project name")
    description: str = Field(default="", description="Project details")
    technologies: List[str] = Field(default_factory=list, description="Technologies used")

class WorkExperience(BaseModel):
    company: str = Field(default="Unknown", description="Company name")
    role: str = Field(default="Role", description="Job title")
    duration: str = Field(default="", description="Duration string")
    years: float = Field(default=0.0, description="Role duration in years")
    description: str = Field(default="", description="Role summary and accomplishments")

class Education(BaseModel):
    degree: str = Field(default="", description="Degree title")
    institution: str = Field(default="", description="School/University name")
    year: str = Field(default="", description="Graduation year")

class CandidateProfile(BaseModel):
    name: str = Field(default="Unknown Candidate", description="Candidate's full name")
    email: str = Field(default="", description="Candidate's email address")
    phone: str = Field(default="", description="Candidate's phone number")
    filename: str = Field(default="", description="Original resume filename")
    skills: List[str] = Field(default_factory=list, description="List of technical and soft skills")
    projects: List[ProjectExperience] = Field(default_factory=list, description="Projects undertaken")
    work_experience: List[WorkExperience] = Field(default_factory=list, description="Work experience list")
    total_experience_years: float = Field(default=0.0, description="Total years of work experience")
    education: List[Education] = Field(default_factory=list, description="Education list")
    certifications: List[str] = Field(default_factory=list, description="Certifications")

class CandidateResponse(BaseModel):
    id: str
    job_id: str
    filename: str
    raw_resume_text: str
    parsed_profile: Optional[CandidateProfile] = None
    integrity_report: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TalentPoolItem(BaseModel):
    candidate_id: str
    job_id: str
    job_title: str
    name: str
    email: str = ""
    filename: str
    skills: List[str] = Field(default_factory=list)
    total_experience_years: float = 0.0
    final_score: Optional[float] = None
    status: str = "Unprocessed"
    integrity_risk: str = "low"
    created_at: datetime

class ChatMessage(BaseModel):
    role: str
    message: str
    created_at: datetime

class InterviewQuestion(BaseModel):
    question: str = Field(description="The interview question to ask")
    category: str = Field(default="Technical", description="Technical, Behavioral, Gap Probe, or Project Deep-Dive")
    rationale: str = Field(default="", description="Why this question matters for this candidate")

class InterviewKit(BaseModel):
    questions: List[InterviewQuestion] = Field(default_factory=list)
