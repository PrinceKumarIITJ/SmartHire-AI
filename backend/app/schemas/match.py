from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class MatchResultResponse(BaseModel):
    id: str
    job_id: str
    candidate_id: str
    candidate_name: str = "Unknown Candidate"
    candidate_email: str = ""
    filename: str = ""
    
    # Sub-scores
    semantic_score: float = 0.0
    skill_score: float = 0.0
    experience_score: float = 0.0
    project_score: float = 0.0
    education_score: float = 0.0
    final_score: float = 0.0
    confidence_score: float = 0.0

    # Explainable AI (XAI) details
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    reasoning: str = ""
    status: str = "Pending"  # 'Shortlisted', 'Rejected', 'Pending'

    created_at: datetime

    class Config:
        from_attributes = True
