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
import logging

logger = logging.getLogger("smarthire.agents.orchestrator")

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
    try:
        logger.info("LangGraph Node: parse_jd_node executing...")
        parsed_jd = await run_jd_agent(state["raw_jd"])
        state["parsed_jd"] = parsed_jd
    except Exception as e:
        logger.error(f"Error in parse_jd_node: {e}")
        state["error"] = str(e)
    return state

async def parse_resumes_node(state: AgentPipelineGraphState) -> AgentPipelineGraphState:
    try:
        logger.info(f"LangGraph Node: parse_resumes_node executing for {len(state['resumes'])} resumes...")
        parsed_candidates = []
        for r in state["resumes"]:
            profile = await run_resume_agent(r["raw_text"])
            profile.filename = r.get("filename", "resume.pdf")
            parsed_candidates.append(profile)
        state["parsed_candidates"] = parsed_candidates
    except Exception as e:
        logger.error(f"Error in parse_resumes_node: {e}")
        state["error"] = str(e)
    return state

async def match_candidates_node(state: AgentPipelineGraphState) -> AgentPipelineGraphState:
    try:
        logger.info("LangGraph Node: match_candidates_node executing...")
        matches = []
        parsed_jd = state["parsed_jd"]
        
        for r_meta, profile in zip(state["resumes"], state["parsed_candidates"]):
            candidate_id = r_meta["id"]
            match_res = await run_matching_agent(
                candidate_id=candidate_id,
                raw_resume_text=r_meta["raw_text"],
                candidate_profile=profile,
                job_description=parsed_jd
            )
            match_res["candidate_id"] = candidate_id
            match_res["candidate_name"] = profile.name
            match_res["candidate_email"] = profile.email
            match_res["filename"] = profile.filename
            matches.append(match_res)

        # Sort matches by final_score descending
        matches.sort(key=lambda x: x.get("final_score", 0.0), reverse=True)
        state["match_results"] = matches
    except Exception as e:
        logger.error(f"Error in match_candidates_node: {e}")
        state["error"] = str(e)
    return state

async def run_audit_and_report_node(state: AgentPipelineGraphState) -> AgentPipelineGraphState:
    try:
        logger.info("LangGraph Node: run_audit_and_report_node executing...")
        
        # 1. Bias Audit Agent
        audit_res = await run_bias_audit_agent(
            candidates=state["parsed_candidates"],
            standard_matches=state["match_results"],
            job_description=state["parsed_jd"]
        )
        state["audit_report"] = audit_res

        # 2. Executive Report Agent
        exec_report = await run_report_agent(
            job=state["parsed_jd"],
            matches=state["match_results"]
        )
        state["executive_report"] = exec_report.model_dump()

        # 3. Email Draft Agent
        drafts = []
        for m in state["match_results"]:
            draft = await run_email_agent(
                candidate_name=m["candidate_name"],
                job_title=state["parsed_jd"].title,
                match_data=m
            )
            draft["candidate_id"] = m["candidate_id"]
            drafts.append(draft)
        state["email_drafts"] = drafts

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
