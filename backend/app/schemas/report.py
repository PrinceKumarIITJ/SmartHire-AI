from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ExecutiveReportSchema(BaseModel):
    summary_text: str = Field(description="High-level executive summary of candidate batch evaluation")
    key_strengths: List[str] = Field(default_factory=list, description="Common strengths identified across candidate pool")
    skill_gaps: List[str] = Field(default_factory=list, description="Common missing skills or skill gaps identified")
    hiring_recommendations: List[str] = Field(default_factory=list, description="Actionable hiring and interview recommendations")

class ExecutiveReportResponse(BaseModel):
    id: str
    job_id: str
    summary_text: str
    key_strengths: List[str]
    skill_gaps: List[str]
    hiring_recommendations: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

class AuditReportResponse(BaseModel):
    id: str
    job_id: str
    blind_scores: Dict[str, Any]
    disparate_impact_summary: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
