import pytest
from backend.app.schemas.candidate import CandidateProfile, Education, WorkExperience
from backend.app.services.bias_audit import redact_candidate_profile, calculate_disparate_impact

def test_demographic_redaction():
    profile = CandidateProfile(
        name="Sarah Jenkins",
        email="sjenkins@harvard.edu",
        phone="555-0199",
        skills=["Python", "SQL"],
        education=[Education(degree="BSc", institution="Harvard University")],
        work_experience=[WorkExperience(company="Acme Corp", role="Developer", description="She managed a team of engineers.")]
    )

    blind = redact_candidate_profile(profile)
    assert blind.name == "Anonymous Candidate"
    assert "harvard.edu" not in blind.email
    assert blind.phone == "[REDACTED]"
    assert "[REDACTED INSTITUTION]" in blind.education[0].institution
    assert "She" not in blind.work_experience[0].description

def test_disparate_impact_calculation():
    std_matches = [{"final_score": 0.85}, {"final_score": 0.75}, {"final_score": 0.50}, {"final_score": 0.40}]
    blind_matches = [{"final_score": 0.82}, {"final_score": 0.78}, {"final_score": 0.72}, {"final_score": 0.45}]

    res = calculate_disparate_impact(std_matches, blind_matches, threshold=0.70)
    assert res["total_candidates"] == 4
    assert "disparate_impact_ratio" in res
    assert "summary" in res
