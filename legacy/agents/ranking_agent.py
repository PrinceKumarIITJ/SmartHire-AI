from services.llm_factory import get_llm
from langchain_core.prompts import PromptTemplate
from utils.models import WorkflowState
from services.scoring import compute_final_score
from utils.constants import SHORTLIST_THRESHOLD
from utils.prompts import EXPLAIN_MATCH_PROMPT
import os
import time

def rank_node(state: WorkflowState) -> dict:
    """
    LangGraph Node: Computes final aggregated scores, ranks candidates, 
    applies shortlist threshold, and triggers LLM reasoning for top candidates.
    """
    print("Agent: Ranking & Reasoning starting...")
    match_results = state.get("match_results", [])
    candidates = state.get("candidates", [])
    jd = state.get("job_description")
    
    if not match_results or not jd:
        return {"error": "Missing inputs for ranking."}

    # Map candidate profiles mapping for easy access
    cand_map = {c.id: c for c in candidates}

    # 1. Compute final scores
    for mr in match_results:
        mr.final_score = compute_final_score(
            semantic=mr.semantic_score,
            skill=mr.skill_score,
            exp=mr.experience_score,
            proj=mr.project_score,
            edu=mr.education_score
        )

    # 2. Sort descending
    match_results.sort(key=lambda x: x.final_score, reverse=True)

    # 3. Apply threshold & explain top candidates
    threshold = state.get("shortlist_threshold", SHORTLIST_THRESHOLD)
    llm = get_llm()
    prompt = PromptTemplate(template=EXPLAIN_MATCH_PROMPT, 
                          input_variables=["jd_title", "jd_keywords", "jd_experience",
                                           "name", "candidate_experience", "candidate_projects_roles"])
    chain = prompt | llm

    for mr in match_results:
        if mr.final_score >= threshold:
            mr.status = "Shortlisted"
            mr.reason = f"Met threshold ({mr.final_score*100:.1f}%)"
            
            # Generate explanation for shortlisted via LLM
            try:
                time.sleep(1) # Rate limit reduction
                cand = cand_map[mr.candidate_id]
                proj_roles = ", ".join([p.name for p in cand.projects]) + " | " + ", ".join([w.role for w in cand.work_experience])
                
                response = chain.invoke({
                    "jd_title": jd.title,
                    "jd_keywords": ", ".join(jd.role_keywords),
                    "jd_experience": jd.experience_years,
                    "name": cand.name,
                    "candidate_experience": cand.total_experience_years,
                    "candidate_projects_roles": proj_roles
                })
                mr.semantic_explanation = response.content.strip()
            except Exception as e:
                print(f"Explanation failed for {mr.candidate_name}: {e}")
                mr.semantic_explanation = "Explanation unavailable."
        else:
            mr.status = "Rejected"
            mr.reason = f"Below Threshold ({mr.final_score*100:.1f}%)"
            mr.semantic_explanation = "Candidate did not meet the overall cutoff score."

    return {"match_results": match_results}
