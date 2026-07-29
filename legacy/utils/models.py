from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from typing_extensions import TypedDict


# --- Job Description Models ---
class JobDescription(BaseModel):
    title: str = Field(default="Unknown Role", description="The job title")
    must_have_skills: List[str] = Field(default_factory=list, description="Essential skills required for the job")
    preferred_skills: List[str] = Field(default_factory=list, description="Bonus or nice-to-have skills")
    experience_years: int = Field(default=0, description="Minimum years of experience required")
    education: str = Field(default="", description="Minimum education qualification required")
    role_keywords: List[str] = Field(default_factory=list, description="Key domain or responsibility keywords")
    raw_text: str = Field(default="", description="The original raw job description text")

# --- Candidate Resume Models ---
class ProjectExperience(BaseModel):
    name: str = Field(default="Unknown Project", description="Name of the project")
    description: str = Field(default="", description="Brief description of the project and responsibilities")
    technologies: List[str] = Field(default_factory=list, description="Technologies or tools used in the project")

class WorkExperience(BaseModel):
    company: str = Field(default="Unknown", description="Name of the company")
    role: str = Field(default="Unknown", description="Job title or role")
    duration: str = Field(default="", description="Employment duration")
    years: float = Field(default=0.0, description="Estimated years spent in this role")
    description: str = Field(default="", description="Job responsibilities and achievements")

class Education(BaseModel):
    degree: str = Field(default="", description="Degree obtained (e.g., BSc, MSc, BTech)")
    institution: str = Field(default="", description="University or college name")
    year: str = Field(default="", description="Graduation year")

class CandidateProfile(BaseModel):
    id: str = Field(default="", description="Unique identifier for the candidate (e.g., file hash)")
    filename: str = Field(default="", description="Original file name")
    name: str = Field(default="Unknown Candidate", description="Candidate's full name")
    email: str = Field(default="", description="Candidate's email address")
    phone: str = Field(default="", description="Candidate's phone number")
    skills: List[str] = Field(default_factory=list, description="Extracted skills")
    projects: List[ProjectExperience] = Field(default_factory=list, description="List of projects")
    work_experience: List[WorkExperience] = Field(default_factory=list, description="List of work experiences")
    total_experience_years: float = Field(default=0.0, description="Total years of work experience combined")
    education: List[Education] = Field(default_factory=list, description="Educational background")
    certifications: List[str] = Field(default_factory=list, description="Certifications or courses")
    raw_text: str = Field(default="", description="Extracted raw text from resume")

# --- Matching Outcome Models ---
class MatchResult(BaseModel):
    candidate_id: str
    candidate_name: str
    candidate_email: str
    semantic_score: float = 0.0
    dense_score: float = 0.0
    sparse_score: float = 0.0
    skill_score: float = 0.0
    experience_score: float = 0.0
    project_score: float = 0.0
    education_score: float = 0.0
    final_score: float = 0.0
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    semantic_explanation: str = ""
    project_explanation: str = ""
    status: str = "Pending"  # Shortlisted, Rejected
    reason: str = ""

# --- Workflow State Model ---
class WorkflowState(TypedDict):
    jd_text: str
    job_description: Optional[JobDescription]
    resume_files: List[str]  # Paths to resume files
    candidates: List[CandidateProfile]
    match_results: List[MatchResult]
    email_logs: List[Dict[str, str]]
    shortlist_threshold: float
    error: Optional[str]
