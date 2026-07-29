from typing import List
from utils.models import CandidateProfile, JobDescription, MatchResult
from utils.constants import (
    WEIGHT_SEMANTIC, WEIGHT_SKILL, WEIGHT_EXPERIENCE, 
    WEIGHT_PROJECT, WEIGHT_EDUCATION
)

def compute_skill_overlap(candidate_skills: List[str], jd_skills: List[str]) -> float:
    if not jd_skills:
        return 1.0
    cand_lower = [s.lower() for s in candidate_skills]
    jd_lower = [s.lower() for s in jd_skills]
    
    matched = [s for s in jd_lower if any(cand_s in s or s in cand_s for cand_s in cand_lower)]
    return len(matched) / len(jd_lower)

def compute_experience_score(candidate_exp: float, required_exp: int) -> float:
    if required_exp <= 0:
        return 1.0
    if candidate_exp >= required_exp:
        return 1.0
    return candidate_exp / required_exp

def compute_education_score(candidate_edu: List, required_edu: str) -> float:
    # A simple keyword match for education level
    if not required_edu:
        return 1.0
    
    req_lower = required_edu.lower()
    for edu in candidate_edu:
        deg = edu.degree.lower()
        # Basic ontology matching
        if "bachelor" in req_lower or "bsc" in req_lower or "btech" in req_lower:
            if "bachelor" in deg or "bsc" in deg or "btech" in deg or "master" in deg or "msc" in deg or "mtech" in deg or "phd" in deg:
                return 1.0
        elif "master" in req_lower or "msc" in req_lower or "mtech" in req_lower:
            if "master" in deg or "msc" in deg or "mtech" in deg or "phd" in deg:
                return 1.0
        elif "phd" in req_lower:
            if "phd" in deg or "doctorate" in deg:
                return 1.0
                
        if deg in req_lower or req_lower in deg:
            return 1.0
            
    return 0.5 # Partial score for having some education

def compute_project_relevance(candidate_projects: List, jd_keywords: List[str]) -> float:
    if not jd_keywords or not candidate_projects:
        return 0.0
        
    keywords_lower = [k.lower() for k in jd_keywords]
    matched_keywords = set()
    
    for proj in candidate_projects:
        text = f"{proj.name} {proj.description} {' '.join(proj.technologies)}".lower()
        for kw in keywords_lower:
            if kw in text:
                matched_keywords.add(kw)
                 
    return len(matched_keywords) / len(keywords_lower)

import math
import re

def compute_lexical_score(candidate_text: str, query_text: str, all_texts: List[str]) -> float:
    """
    Computes a pure-Python TF-IDF similarity score for sparse/lexical retrieval matching.
    """
    def tokenize(text: str) -> List[str]:
        return re.findall(r'\b[a-zA-Z0-9_]+\b', text.lower())

    query_tokens = set(tokenize(query_text))
    if not query_tokens or not all_texts:
        return 0.0

    # Calculate IDF for query tokens
    idf = {}
    N = len(all_texts)
    for token in query_tokens:
        df = sum(1 for doc in all_texts if token in tokenize(doc))
        idf[token] = math.log((N + 1) / (df + 1)) + 1.0

    # Calculate TF for candidate document
    doc_tokens = tokenize(candidate_text)
    if not doc_tokens:
        return 0.0
    
    tf = {}
    for token in doc_tokens:
        if token in query_tokens:
            tf[token] = tf.get(token, 0) + 1
            
    # Compute TF-IDF score
    score = sum((tf[token] / len(doc_tokens)) * idf[token] for token in tf)
    return score

def compute_final_score(semantic: float, skill: float, exp: float, proj: float, edu: float) -> float:
    return (
        (semantic * WEIGHT_SEMANTIC) +
        (skill * WEIGHT_SKILL) +
        (exp * WEIGHT_EXPERIENCE) +
        (proj * WEIGHT_PROJECT) +
        (edu * WEIGHT_EDUCATION)
    )

def extract_matched_missing_skills(candidate_skills: List[str], jd_skills: List[str]):
    if not jd_skills:
        return list(candidate_skills), []
        
    cand_lower = [s.lower() for s in candidate_skills]
    jd_lower = [s.lower() for s in jd_skills]
    
    matched = []
    missing = []
    
    for original_jd, lower_jd in zip(jd_skills, jd_lower):
        if any(lower_jd in cs or cs in lower_jd for cs in cand_lower):
            matched.append(original_jd)
        else:
            missing.append(original_jd)
            
    return matched, missing
