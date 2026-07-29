import pytest
from backend.app.services.scoring import (
    calculate_skill_overlap,
    calculate_experience_score,
    calculate_education_score,
    compute_explainable_match
)
from backend.app.schemas.job import JobDescription
from backend.app.schemas.candidate import CandidateProfile, WorkExperience, Education

def test_skill_overlap():
    candidate_skills = ["Python", "PyTorch", "FastAPI", "Docker"]
    must_have = ["Python", "FastAPI", "Kubernetes"]
    preferred = ["PyTorch", "AWS"]

    score, matched, missing = calculate_skill_overlap(candidate_skills, must_have, preferred)
    
    assert "Python" in matched
    assert "FastAPI" in matched
    assert "Kubernetes" in missing
    assert "AWS" in missing
    assert 0.0 <= score <= 1.0

def test_experience_scoring():
    # Equal or higher experience should score >= 0.9
    score_full = calculate_experience_score(candidate_years=5.0, jd_years=3.0)
    assert score_full >= 0.9

    # Below experience target should penalize proportionally
    score_low = calculate_experience_score(candidate_years=1.0, jd_years=4.0)
    assert score_low < 0.5

def test_explainable_match():
    jd = JobDescription(
        title="Senior AI Engineer",
        must_have_skills=["Python", "LangChain", "FastAPI"],
        preferred_skills=["Docker", "pgvector"],
        experience_years=3,
        education="Bachelor"
    )

    cand = CandidateProfile(
        name="Alex Smith",
        skills=["Python", "LangChain", "FastAPI", "Docker"],
        total_experience_years=4.0,
        education=[Education(degree="BTech", institution="IIT Delhi")]
    )

    result = compute_explainable_match(cand, jd)
    assert "final_score" in result
    assert "confidence_score" in result
    assert "matched_skills" in result
    assert "missing_skills" in result
    assert "reasoning" in result
    assert result["status"] in ["Shortlisted", "Rejected"]
