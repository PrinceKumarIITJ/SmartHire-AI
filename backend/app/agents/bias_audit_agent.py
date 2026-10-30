import asyncio
from typing import List, Dict, Any
from backend.app.schemas.job import JobDescription
from backend.app.schemas.candidate import CandidateProfile
from backend.app.core.config import get_settings
from backend.app.services.scoring import compute_explainable_match
from backend.app.services.bias_audit import redact_candidate_profile, calculate_disparate_impact
import logging

logger = logging.getLogger("smarthire.agents.bias_audit_agent")

async def run_bias_audit_agent(
    candidates: List[CandidateProfile],
    standard_matches: List[Dict[str, Any]],
    job_description: JobDescription
) -> Dict[str, Any]:
    """
    Bias Audit Agent: Executes demographic-blind re-scoring and computes 80% rule disparate impact summary.
    """
    logger.info("Executing Bias Audit Agent for candidate batch...")

    blind_matches = []
    blind_scores_dict = {}

    for cand, std_match in zip(candidates, standard_matches):
        blind_profile = redact_candidate_profile(cand)
        blind_res = await asyncio.to_thread(compute_explainable_match, blind_profile, job_description)
        blind_matches.append(blind_res)
        
        cand_name = cand.name or "Candidate"
        blind_scores_dict[cand_name] = {
            "standard_score": std_match.get("final_score", 0.0),
            "blind_score": blind_res.get("final_score", 0.0),
            "delta": round(blind_res.get("final_score", 0.0) - std_match.get("final_score", 0.0), 3)
        }

    disparate_impact_summary = calculate_disparate_impact(standard_matches, blind_matches, get_settings().shortlist_threshold)

    return {
        "blind_scores": blind_scores_dict,
        "disparate_impact_summary": disparate_impact_summary
    }
