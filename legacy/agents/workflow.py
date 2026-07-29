from langgraph.graph import StateGraph, START, END
from utils.models import WorkflowState
from agents.jd_agent import parse_jd_node
from agents.resume_agent import parse_resumes_node
from agents.matching_agent import match_node
from agents.ranking_agent import rank_node
from agents.email_agent import email_node
import os

def check_can_email(state: WorkflowState) -> str:
    """Conditional Edge logic."""
    # If no SMTP config, bypass email node entirely
    if not os.getenv("SMTP_PASSWORD"):
        return "skip"
    return "send"

def create_workflow() -> StateGraph:
    """
    Constructs the LangGraph Workflow for SmartHire ATS.
    """
    workflow = StateGraph(WorkflowState)

    # 1. Define Nodes
    workflow.add_node("parse_jd", parse_jd_node)
    workflow.add_node("parse_resumes", parse_resumes_node)
    workflow.add_node("match", match_node)
    workflow.add_node("rank", rank_node)
    workflow.add_node("email", email_node)

    # 2. Define Edges
    workflow.add_edge(START, "parse_jd")
    workflow.add_edge("parse_jd", "parse_resumes")
    workflow.add_edge("parse_resumes", "match")
    workflow.add_edge("match", "rank")
    workflow.add_edge("rank", END)

    # Compile the graph
    app = workflow.compile()
    return app
