import pytest
from unittest.mock import AsyncMock, patch
from backend.app.schemas.job import JobDescription
from backend.app.schemas.candidate import CandidateProfile, Education, WorkExperience
from backend.app.schemas.report import ExecutiveReportSchema
from backend.app.agents.orchestrator import smart_hire_app

@pytest.mark.asyncio
async def test_full_langgraph_pipeline_execution():
    """
    Integration Test: Runs the complete 4-node LangGraph orchestration state machine
    with mocked LLM responses to verify state propagation and data model flow.
    """
    mock_parsed_jd = JobDescription(
        title="Senior AI Engineer",
        must_have_skills=["Python", "LangChain", "FastAPI"],
        preferred_skills=["Docker", "pgvector"],
        experience_years=3,
        education="Bachelor"
    )

    mock_parsed_profile = CandidateProfile(
        name="Alex Smith",
        email="alex.smith@example.com",
        phone="555-0100",
        skills=["Python", "LangChain", "FastAPI", "Docker"],
        total_experience_years=4.0,
        education=[Education(degree="BTech Computer Science", institution="IIT Delhi")],
        work_experience=[WorkExperience(company="TechCorp", role="AI Engineer", years=4, description="Built RAG pipelines.")]
    )

    mock_match_result = {
        "candidate_id": "cand-123",
        "semantic_score": 0.88,
        "skill_score": 0.90,
        "experience_score": 0.95,
        "project_score": 0.85,
        "education_score": 0.90,
        "final_score": 0.89,
        "confidence_score": 0.92,
        "matched_skills": ["Python", "LangChain", "FastAPI"],
        "missing_skills": [],
        "reasoning": "Strong match with excellent technical background.",
        "status": "Shortlisted"
    }

    mock_audit_res = {
        "blind_scores": {"cand-123": 0.88},
        "disparate_impact_summary": {"disparate_impact_ratio": 1.0, "summary": "No statistical bias detected."}
    }

    mock_email_draft = {
        "type": "selection",
        "subject": "Interview Invitation - Senior AI Engineer",
        "body": "Dear Alex, We were impressed by your background..."
    }

    mock_exec_report = ExecutiveReportSchema(
        summary_text="Overall strong candidate batch.",
        key_strengths=["Python", "FastAPI"],
        skill_gaps=[],
        hiring_recommendations=["Proceed with interviews."]
    )

    with patch("backend.app.agents.orchestrator.run_jd_agent", new_callable=AsyncMock) as mock_jd, \
         patch("backend.app.agents.orchestrator.run_resume_agent", new_callable=AsyncMock) as mock_resume, \
         patch("backend.app.agents.orchestrator.run_matching_agent", new_callable=AsyncMock) as mock_matching, \
         patch("backend.app.agents.orchestrator.run_bias_audit_agent", new_callable=AsyncMock) as mock_audit, \
         patch("backend.app.agents.orchestrator.run_report_agent", new_callable=AsyncMock) as mock_report, \
         patch("backend.app.agents.orchestrator.run_email_agent", new_callable=AsyncMock) as mock_email:

        mock_jd.return_value = mock_parsed_jd
        mock_resume.return_value = mock_parsed_profile
        mock_matching.return_value = mock_match_result
        mock_audit.return_value = mock_audit_res
        mock_report.return_value = mock_exec_report
        mock_email.return_value = mock_email_draft

        initial_state = {
            "job_id": "job-test-1",
            "raw_jd": "We are seeking a Senior AI Engineer skilled in Python and LangChain.",
            "parsed_jd": None,
            "resumes": [
                {"id": "cand-123", "filename": "alex_resume.pdf", "raw_text": "Alex Smith resume text..."}
            ],
            "parsed_candidates": [],
            "match_results": [],
            "audit_report": None,
            "executive_report": None,
            "email_drafts": [],
            "error": None
        }

        # Invoke LangGraph Workflow
        final_state = await smart_hire_app.ainvoke(initial_state)

        # Assert State Outcomes
        assert final_state["error"] is None
        assert final_state["parsed_jd"] is not None
        assert final_state["parsed_jd"].title == "Senior AI Engineer"
        assert len(final_state["parsed_candidates"]) == 1
        assert len(final_state["match_results"]) == 1
        assert final_state["match_results"][0]["final_score"] == 0.89
        assert final_state["audit_report"] is not None
        assert final_state["executive_report"] is not None
        assert len(final_state["email_drafts"]) == 1
