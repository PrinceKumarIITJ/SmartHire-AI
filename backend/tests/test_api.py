import pytest
import pytest_asyncio
import httpx
from unittest.mock import AsyncMock, patch
from backend.app.main import app
from backend.app.db.database import init_db
from backend.app.schemas.job import JobDescription
from backend.app.schemas.candidate import CandidateProfile, Education, WorkExperience, ProjectExperience
from backend.app.schemas.report import ExecutiveReportSchema

API = "/api/v1"

JD = JobDescription(
    title="Senior AI Engineer",
    must_have_skills=["Python", "LangChain", "FastAPI"],
    preferred_skills=["Docker"],
    experience_years=3,
    education="Bachelor",
)

PROFILES = {
    "strong.txt": CandidateProfile(
        name="Alex Smith", email="alex@example.com", skills=["Python", "LangChain", "FastAPI", "Docker"],
        total_experience_years=5.0,
        education=[Education(degree="BTech", institution="IIT")],
        work_experience=[WorkExperience(company="TechCorp", role="AI Engineer", years=5)],
        projects=[ProjectExperience(name="RAG Search", description="Retrieval system")],
    ),
    "weak.txt": CandidateProfile(
        name="Jordan Lee", email="", skills=["Figma"], total_experience_years=1.0,
    ),
}

MATCHES = {
    "Alex Smith": dict(final_score=0.88, status="Shortlisted", matched_skills=["Python", "LangChain"], missing_skills=[]),
    "Jordan Lee": dict(final_score=0.31, status="Rejected", matched_skills=[], missing_skills=["Python", "FastAPI"]),
}


async def fake_resume_agent(raw_text):
    return PROFILES["strong.txt" if "alex" in raw_text.lower() else "weak.txt"].model_copy(deep=True)


async def fake_matching_agent(candidate_id, raw_resume_text, candidate_profile, job_description):
    base = MATCHES[candidate_profile.name]
    return {
        "semantic_score": 0.8, "skill_score": 0.7, "experience_score": 0.9, "project_score": 0.6,
        "education_score": 0.9, "confidence_score": 0.9, "reasoning": "Mocked.", **base,
    }


async def fake_email_agent(candidate_name, job_title, match_data):
    kind = "selection" if match_data["final_score"] >= 0.7 else "rejection"
    return {"type": kind, "subject": f"{job_title} update", "body": f"Dear {candidate_name}"}


@pytest_asyncio.fixture
async def client():
    await init_db()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_full_recruiting_flow(client):
    health = await client.get(f"{API}/health")
    assert health.status_code == 200
    assert health.json()["database"] == "ok"

    with patch("backend.app.api.routers.jobs.run_jd_agent", new=AsyncMock(return_value=JD)):
        res = await client.post(f"{API}/jobs", json={
            "title": "Senior AI Engineer",
            "raw_jd": "We need a senior AI engineer with Python, LangChain and FastAPI experience.",
            "department": "Engineering",
        })
    assert res.status_code == 201, res.text
    job = res.json()
    job_id = job["id"]
    assert job["stats"]["pipeline_status"] == "awaiting_resumes"

    files = [
        ("files", ("strong.txt", b"Alex Smith - Python LangChain FastAPI engineer", "text/plain")),
        ("files", ("weak.txt", b"Jordan Lee - product designer using Figma", "text/plain")),
        ("files", ("virus.exe", b"MZ", "application/octet-stream")),
    ]
    res = await client.post(f"{API}/jobs/{job_id}/resumes", files=files)
    assert res.status_code == 201
    body = res.json()
    assert len(body["uploaded"]) == 2
    assert body["skipped"][0]["filename"] == "virus.exe"

    patches = [
        patch("backend.app.agents.orchestrator.run_jd_agent", new=AsyncMock(return_value=JD)),
        patch("backend.app.agents.orchestrator.run_resume_agent", new=fake_resume_agent),
        patch("backend.app.agents.orchestrator.run_matching_agent", new=fake_matching_agent),
        patch("backend.app.agents.orchestrator.run_bias_audit_agent", new=AsyncMock(return_value={
            "blind_scores": {}, "disparate_impact_summary": {"disparate_impact_ratio": 1.0, "summary": "Clean"}})),
        patch("backend.app.agents.orchestrator.run_report_agent", new=AsyncMock(return_value=ExecutiveReportSchema(
            summary_text="Good batch.", key_strengths=["Python"], skill_gaps=[], hiring_recommendations=["Interview Alex"]))),
        patch("backend.app.agents.orchestrator.run_email_agent", new=fake_email_agent),
    ]
    for p in patches:
        p.start()
    try:
        # Running twice must not duplicate reports or drafts.
        for _ in range(2):
            res = await client.post(f"{API}/jobs/{job_id}/run")
            assert res.status_code == 200, res.text
    finally:
        for p in patches:
            p.stop()

    results = (await client.get(f"{API}/jobs/{job_id}/results")).json()
    assert [r["candidate_name"] for r in results] == ["Alex Smith", "Jordan Lee"]

    job = (await client.get(f"{API}/jobs/{job_id}")).json()
    assert job["stats"]["pipeline_status"] == "completed"
    assert job["stats"]["shortlisted_count"] == 1

    report = await client.get(f"{API}/reports/jobs/{job_id}")
    assert report.status_code == 200 and report.json()["summary_text"] == "Good batch."
    assert (await client.get(f"{API}/audit/{job_id}")).status_code == 200

    drafts = (await client.get(f"{API}/email-drafts/jobs/{job_id}")).json()
    assert len(drafts) == 2
    assert all(d["job_title"] == "Senior AI Engineer" for d in drafts)

    # Recruiter override + notes
    alex = results[0]
    res = await client.patch(f"{API}/matches/{alex['id']}", json={"status": "Interview", "notes": "Strong RAG depth"})
    assert res.status_code == 200 and res.json()["status"] == "Interview"
    assert (await client.patch(f"{API}/matches/{alex['id']}", json={"status": "Hired??"})).status_code == 422

    match = (await client.get(f"{API}/candidates/{alex['candidate_id']}/match")).json()
    assert match["notes"] == "Strong RAG depth"
    assert match["status_source"] == "recruiter"

    # A recruiter's decision survives a pipeline re-run; the AI's does not override it.
    jordan = results[1]
    await client.patch(f"{API}/matches/{jordan['id']}", json={"status": "Shortlisted"})
    for p in patches:
        p.start()
    try:
        assert (await client.post(f"{API}/jobs/{job_id}/run")).status_code == 200
    finally:
        for p in patches:
            p.stop()
    statuses = {r["candidate_name"]: r["status"] for r in (await client.get(f"{API}/jobs/{job_id}/results")).json()}
    assert statuses == {"Alex Smith": "Interview", "Jordan Lee": "Shortlisted"}
    drafts = (await client.get(f"{API}/email-drafts/jobs/{job_id}")).json()

    # Candidate without an email address cannot be emailed
    jordan_draft = next(d for d in drafts if d["candidate_name"] == "Jordan Lee")
    assert (await client.post(f"{API}/email-drafts/{jordan_draft['id']}/send")).status_code == 422

    alex_draft = next(d for d in drafts if d["candidate_name"] == "Alex Smith")
    with patch("backend.app.api.routers.emails.send_smtp_email", return_value=True):
        assert (await client.post(f"{API}/email-drafts/{alex_draft['id']}/send")).status_code == 200
    assert (await client.patch(f"{API}/email-drafts/{alex_draft['id']}", json={"body": "edit"})).status_code == 409

    # Talent pool search, analytics and CSV export
    pool = (await client.get(f"{API}/candidates", params={"q": "langchain"})).json()
    assert [p["name"] for p in pool if p["job_id"] == job_id] == ["Alex Smith"]

    overview = (await client.get(f"{API}/analytics/overview")).json()
    assert overview["total_candidates"] >= 2 and overview["emails_sent"] >= 1

    export = await client.get(f"{API}/jobs/{job_id}/results/export")
    assert export.status_code == 200
    assert export.headers["content-type"].startswith("text/csv")
    assert "Alex Smith" in export.text

    # Interview kit falls back to deterministic questions when no LLM is reachable
    with patch("backend.app.agents.interview_agent.get_llm", side_effect=ValueError("no llm")):
        kit = await client.post(f"{API}/candidates/{alex['candidate_id']}/interview-kit", params={"count": 5})
    assert kit.status_code == 200
    assert 0 < len(kit.json()["questions"]) <= 5

    # Legacy unversioned prefix still works
    assert (await client.get(f"/api/jobs/{job_id}")).status_code == 200

    assert (await client.delete(f"{API}/jobs/{job_id}")).status_code == 204
    assert (await client.get(f"{API}/jobs/{job_id}")).status_code == 404
