from langchain_core.documents import Document
from services.embeddings import build_faiss_index, query_faiss, get_embedding_model
from services.scoring import (
    compute_skill_overlap, compute_experience_score,
    compute_education_score, compute_project_relevance,
    extract_matched_missing_skills, compute_lexical_score
)
from utils.models import WorkflowState, MatchResult
import numpy as np

def match_node(state: WorkflowState) -> dict:
    """
    LangGraph Node: Calculates hybrid search matching using dense FAISS + sparse TF-IDF.
    """
    print("Agent: Hybrid Matching starting...")
    candidates = state.get("candidates", [])
    jd = state.get("job_description")
    
    if not jd or not candidates:
        return {"error": "Missing JD or Candidates for matching."}

    # Prepare candidate texts for FAISS
    docs = []
    for c in candidates:
        docs.append(Document(page_content=c.raw_text, metadata={"id": c.id}))

    # Build FAISS index
    index = build_faiss_index(docs)
    
    # Query with JD
    query_text = jd.raw_text if jd.raw_text else " ".join(jd.must_have_skills + jd.role_keywords)
    
    # Get L2 distances for all candidates
    faiss_results = query_faiss(index, query_text, k=len(candidates))
    
    # Create mapping from candidate_id to L2 distance
    l2_scores = {res[0].metadata["id"]: res[1] for res in faiss_results}
    
    # Normalize L2 distance to a 0.0 - 1.0 similarity score (dense score)
    if l2_scores:
        max_d = max(l2_scores.values()) if max(l2_scores.values()) > 0 else 1
        dense_scores = {cid: 1 - (dist / max_d) for cid, dist in l2_scores.items()}
    else:
        dense_scores = {}

    # Calculate sparse lexical score for each candidate (TF-IDF)
    all_texts = [c.raw_text for c in candidates]
    lexical_raw = {}
    for c in candidates:
        lexical_raw[c.id] = compute_lexical_score(c.raw_text, query_text, all_texts)

    # Normalize sparse scores
    if lexical_raw:
        max_l = max(lexical_raw.values())
        min_l = min(lexical_raw.values())
        diff_l = max_l - min_l
        if diff_l > 0:
            sparse_scores = {cid: (val - min_l) / diff_l for cid, val in lexical_raw.items()}
        else:
            sparse_scores = {cid: 1.0 for cid in lexical_raw}
    else:
        sparse_scores = {}

    match_results = []
    for c in candidates:
        # Dense vs Sparse scores
        d_score = dense_scores.get(c.id, 0.0)
        s_score = sparse_scores.get(c.id, 0.0)
        
        # Hybrid Semantic Match (70% dense vector matching, 30% sparse lexical matching)
        hybrid_score = 0.7 * d_score + 0.3 * s_score
        
        # 2. Skill Overlap
        skill_ovlp = compute_skill_overlap(c.skills, jd.must_have_skills)
        matched, missing = extract_matched_missing_skills(c.skills, jd.must_have_skills)
        
        # 3. Experience Match
        exp_score = compute_experience_score(c.total_experience_years, jd.experience_years)
        
        # 4. Education Match
        edu_score = compute_education_score(c.education, jd.education)
        
        # 5. Project Relevance
        proj_score = compute_project_relevance(c.projects, jd.role_keywords)

        mr = MatchResult(
            candidate_id=c.id,
            candidate_name=c.name,
            candidate_email=c.email,
            semantic_score=hybrid_score,
            dense_score=d_score,
            sparse_score=s_score,
            skill_score=skill_ovlp,
            experience_score=exp_score,
            education_score=edu_score,
            project_score=proj_score,
            matched_skills=matched,
            missing_skills=missing
        )
        match_results.append(mr)

    return {"match_results": match_results}
