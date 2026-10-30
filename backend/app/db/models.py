import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.db.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    raw_jd = Column(Text, nullable=False)
    parsed_jd = Column(JSON, nullable=True)  # Structured JobDescription dictionary
    department = Column(String, nullable=True)
    location = Column(String, nullable=True)
    employment_type = Column(String, nullable=True)  # 'Full-time', 'Contract', ...
    status = Column(String, default="open")  # 'open', 'paused', 'closed'
    created_at = Column(DateTime, default=datetime.utcnow)

    candidates = relationship("Candidate", back_populates="job", cascade="all, delete-orphan")
    matches = relationship("JobCandidateMatch", back_populates="job", cascade="all, delete-orphan")
    executive_reports = relationship("ExecutiveReport", back_populates="job", cascade="all, delete-orphan")
    email_drafts = relationship("EmailDraft", back_populates="job", cascade="all, delete-orphan")
    audit_reports = relationship("AuditReport", back_populates="job", cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String, primary_key=True, default=generate_uuid)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    raw_resume_text = Column(Text, nullable=False)
    parsed_profile = Column(JSON, nullable=True)  # Structured CandidateProfile dictionary
    integrity_report = Column(JSON, nullable=True)  # Guardrail findings (hidden text, prompt injection, stuffing)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="candidates")
    matches = relationship("JobCandidateMatch", back_populates="candidate", cascade="all, delete-orphan")
    email_drafts = relationship("EmailDraft", back_populates="candidate", cascade="all, delete-orphan")
    chat_logs = relationship("ChatLog", back_populates="candidate", cascade="all, delete-orphan")


class JobCandidateMatch(Base):
    __tablename__ = "job_candidate_matches"

    id = Column(String, primary_key=True, default=generate_uuid)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(String, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    
    # Scores & XAI Fields
    semantic_score = Column(Float, default=0.0)
    skill_score = Column(Float, default=0.0)
    experience_score = Column(Float, default=0.0)
    project_score = Column(Float, default=0.0)
    education_score = Column(Float, default=0.0)
    final_score = Column(Float, default=0.0)
    confidence_score = Column(Float, default=0.0)
    
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    reasoning = Column(Text, default="")
    status = Column(String, default="Pending")  # 'Shortlisted', 'Interview', 'Rejected', 'Pending'
    notes = Column(Text, default="")  # Recruiter notes (human-in-the-loop)
    status_source = Column(String, default="ai")  # 'ai' or 'recruiter'; recruiter decisions survive re-runs

    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="matches")
    candidate = relationship("Candidate", back_populates="matches")


class ExecutiveReport(Base):
    __tablename__ = "executive_reports"

    id = Column(String, primary_key=True, default=generate_uuid)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    summary_text = Column(Text, nullable=False)
    key_strengths = Column(JSON, default=list)
    skill_gaps = Column(JSON, default=list)
    hiring_recommendations = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="executive_reports")


class EmailDraft(Base):
    __tablename__ = "email_drafts"

    id = Column(String, primary_key=True, default=generate_uuid)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(String, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # 'selection' or 'rejection'
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String, default="draft")  # 'draft', 'approved', 'sent'
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="email_drafts")
    candidate = relationship("Candidate", back_populates="email_drafts")


class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    candidate_id = Column(String, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="chat_logs")


class AuditReport(Base):
    __tablename__ = "audit_reports"

    id = Column(String, primary_key=True, default=generate_uuid)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    blind_scores = Column(JSON, default=dict)
    disparate_impact_summary = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="audit_reports")


class LlmTrace(Base):
    """One row per chat-model call (LLMOps observability)."""
    __tablename__ = "llm_traces"

    id = Column(String, primary_key=True, default=generate_uuid)
    agent = Column(String, index=True, default="unknown")
    job_id = Column(String, nullable=True, index=True)
    provider = Column(String, default="")
    model = Column(String, default="")
    status = Column(String, default="ok")  # 'ok' | 'error'
    latency_ms = Column(Integer, default=0)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    error = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class EvalRun(Base):
    """Offline evaluation of ranking quality and guardrail accuracy against a golden set."""
    __tablename__ = "eval_runs"

    id = Column(String, primary_key=True, default=generate_uuid)
    status = Column(String, default="running")  # 'running' | 'completed' | 'failed'
    metrics = Column(JSON, default=dict)
    details = Column(JSON, default=list)
    error = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
