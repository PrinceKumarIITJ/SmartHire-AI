import asyncio
import os
from typing import List, Dict, Any, TypedDict, Optional
from langgraph.graph import StateGraph, END
from backend.app.schemas.job import JobDescription
from backend.app.schemas.candidate import CandidateProfile
from backend.app.agents.jd_agent import run_jd_agent
from backend.app.agents.resume_agent import run_resume_agent
from backend.app.agents.matching_agent import run_matching_agent
from backend.app.agents.bias_audit_agent import run_bias_audit_agent
from backend.app.agents.report_agent import run_report_agent
from backend.app.agents.email_agent import run_email_agent
from backend.app.services.progress import emit
import logging

logger = logging.getLogger("smarthire.agents.orchestrator")

RESUME_CONCURRENCY = int(os.getenv("RESUME_PARSE_CONCURRENCY", "4"))

class AgentPipelineGraphState(TypedDict):
    job_id: str
    raw_jd: str
    parsed_jd: Optional[JobDescription]
    resumes: List[Dict[str, Any]]  # List of {'id': str, 'filename': str, 'raw_text': str}
    parsed_candidates: List[CandidateProfile]
    match_results: List[Dict[str, Any]]
    audit_report: Optional[Dict[str, Any]]
    executive_report: Optional[Dict[str, Any]]
    email_drafts: List[Dict[str, Any]]
    error: Optional[str]

async def parse_jd_node(state: AgentPipelineGraphState) -> AgentPipelineGraphState:
    job_id = state["job_id"]
    emit(job_id, "stage", stage="jd", label="JD Agent · structuring requirements")
    try:
        if state.get("parsed_jd") is not None:
            # The JD was already structured when the job was created; skip the extra LLM call.
            logger.info("LangGraph Node: parse_jd_node reusing stored JD extraction.")
            emit(job_id, "log", message="Reusing requirements extracted at job creation")
            return state
        logger.info("LangGraph Node: parse_jd_node executing...")
        state["parsed_jd"] = await run_jd_agent(state["raw_jd"])
        emit(job_id, "log", message=f"Extracted {len(state['parsed_jd'].must_have_skills)} must-have skills")
    except Exception as e:
        logger.error(f"Error in parse_jd_node: {e}")
        state["error"] = str(e)
    return state

async def parse_resumes_node(state: AgentPipelineGraphState) -> AgentPipelineGraphState:
    job_id = state["job_id"]
    total = len(state["resumes"])
    emit(job_id, "stage", stage="resume", label=f"Resume Agent · parsing {total} profiles")
    try:
        logger.info(f"LangGraph Node: parse_resumes_node executing for {total} resumes...")
        # Parse concurrently, but cap in-flight LLM calls to stay inside provider rate limits.
        semaphore = asyncio.Semaphore(RESUME_CONCURRENCY)
        done = 0

        async def parse_one(r: Dict[str, Any]) -> CandidateProfile:
            nonlocal done
            async with semaphore:
                profile = await run_resume_agent(r["raw_text"])
            profile.filename = r.get("filename", "resume.pdf")
            done += 1
            emit(job_id, "progress", stage="resume", done=done, total=total,
                 message=f"Parsed {profile.name} · {len(profile.skills)} skills, {profile.total_experience_years} yrs")
            return profile

        state["parsed_candidates"] = list(await asyncio.gather(*(parse_one(r) for r in state["resumes"])))
    except Exception as e:
        logger.error(f"Error in parse_resumes_node: {e}")
        state["error"] = str(e)
    return state

async def match_candidates_node(state: AgentPipelineGraphState) -> AgentPipelineGraphState:
    job_id = state["job_id"]
    total = len(state["resumes"])
    emit(job_id, "stage", stage="match", label="Matching Agent · embeddings + explainable scoring")
    try:
        logger.info("LangGraph Node: match_candidates_node executing...")
        matches = []
        for i, (r_meta, profile) in enumerate(zip(state["resumes"], state["parsed_candidates"]), 1):
            candidate_id = r_meta["id"]
            match_res = await run_matching_agent(
                candidate_id=candidate_id,
                raw_resume_text=r_meta["raw_text"],
                candidate_profile=profile,
                job_description=state["parsed_jd"]
            )
            match_res["candidate_id"] = candidate_id
            match_res["candidate_name"] = profile.name
            match_res["candidate_email"] = profile.email
            match_res["filename"] = profile.filename
            matches.append(match_res)
            emit(job_id, "progress", stage="match", done=i, total=total,
                 message=f"Scored {profile.name}: {round(match_res['final_score'] * 100)} · {match_res['status']}")

        matches.sort(key=lambda x: x.get("final_score", 0.0), reverse=True)
        state["match_results"] = matches
    except Exception as e:
        logger.error(f"Error in match_candidates_node: {e}")
        state["error"] = str(e)
    return state

async def run_audit_and_report_node(state: AgentPipelineGraphState) -> AgentPipelineGraphState:
    job_id = state["job_id"]
    try:
        logger.info("LangGraph Node: run_audit_and_report_node executing...")

        # 1. Bias Audit Agent. match_results are sorted by score, so re-align them with
        #    parsed_candidates (upload order) before pairing standard and blind scores.
        emit(job_id, "stage", stage="audit", label="Bias Audit · demographic-blind re-scoring")
        by_id = {m["candidate_id"]: m for m in state["match_results"]}
        aligned = [by_id[r["id"]] for r in state["resumes"] if r["id"] in by_id]
        audit_res = await run_bias_audit_agent(
            candidates=state["parsed_candidates"],
            standard_matches=aligned,
            job_description=state["parsed_jd"]
        )
        state["audit_report"] = audit_res
        emit(job_id, "log", message=audit_res.get("disparate_impact_summary", {}).get("summary", "Audit complete"))

        # 2. Executive Report Agent
        emit(job_id, "stage", stage="report", label="Report Agent · executive summary")
        exec_report = await run_report_agent(job=state["parsed_jd"], matches=state["match_results"])
        state["executive_report"] = exec_report.model_dump()

        # 3. Email Draft Agent — drafted concurrently, capped like resume parsing.
        total = len(state["match_results"])
        emit(job_id, "stage", stage="email", label=f"Email Agent · drafting {total} personalized emails")
        semaphore = asyncio.Semaphore(RESUME_CONCURRENCY)
        done = 0

        async def draft_one(m: Dict[str, Any]) -> Dict[str, Any]:
            nonlocal done
            async with semaphore:
                draft = await run_email_agent(candidate_name=m["candidate_name"], job_title=state["parsed_jd"].title, match_data=m)
            draft["candidate_id"] = m["candidate_id"]
            done += 1
            emit(job_id, "progress", stage="email", done=done, total=total, message=f"Drafted {draft['type']} email for {m['candidate_name']}")
            return draft

        state["email_drafts"] = list(await asyncio.gather(*(draft_one(m) for m in state["match_results"])))
    except Exception as e:
        logger.error(f"Error in run_audit_and_report_node: {e}")
        state["error"] = str(e)
    return state

def build_smart_hire_workflow():
    """Builds and compiles the LangGraph Multi-Agent Orchestration Workflow."""
    workflow = StateGraph(AgentPipelineGraphState)

    workflow.add_node("parse_jd", parse_jd_node)
    workflow.add_node("parse_resumes", parse_resumes_node)
    workflow.add_node("match_candidates", match_candidates_node)
    workflow.add_node("audit_and_report", run_audit_and_report_node)

    workflow.set_entry_point("parse_jd")
    workflow.add_edge("parse_jd", "parse_resumes")
    workflow.add_edge("parse_resumes", "match_candidates")
    workflow.add_edge("match_candidates", "audit_and_report")
    workflow.add_edge("audit_and_report", END)

    return workflow.compile()

# Instantiated Workflow
smart_hire_app = build_smart_hire_workflow()
