import os
import re
from typing import Dict, Any, List, Tuple
import numpy as np
from backend.app.core.config import get_settings
from backend.app.services.embeddings import get_embedding
from backend.app.schemas.job import JobDescription
from backend.app.schemas.candidate import CandidateProfile
import logging

logger = logging.getLogger("smarthire.scoring")

def calculate_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    a = np.array(vec1)
    b = np.array(vec2)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

# Raw MiniLM cosine between a JD and a resume rarely leaves ~0.1–0.6, which compressed every
# candidate's score. Rescale that band to 0–1 (bounds found from evaluation runs).
SEMANTIC_LOW = float(os.getenv("SEMANTIC_SIM_LOW", "0.15"))
SEMANTIC_HIGH = float(os.getenv("SEMANTIC_SIM_HIGH", "0.60"))


def calibrate_semantic(cosine: float) -> float:
    return min(1.0, max(0.0, (cosine - SEMANTIC_LOW) / (SEMANTIC_HIGH - SEMANTIC_LOW)))


def skill_alternatives(skill: str) -> List[str]:
    """
    Expand compound JD skills into alternatives that each satisfy the requirement:
    "Vector databases (FAISS, pgvector)" -> ["vector databases", "faiss", "pgvector"],
    "AWS or GCP" -> ["aws", "gcp"].
    """
    s = skill.strip().lower()
    inner = re.findall(r"\(([^)]*)\)", s)
    head = re.sub(r"\([^)]*\)", " ", s)
    parts = re.split(r"\s+or\s+|/|,|;", head) + [p for grp in inner for p in re.split(r"\s+or\s+|/|,|;", grp)]
    alts = [re.sub(r"\s+", " ", p).strip(" .-") for p in parts]
    return [a for a in dict.fromkeys(alts) if a] or [s]


def _skill_present(alternatives: List[str], candidate_skills: set) -> bool:
    for alt in alternatives:
        for cs in candidate_skills:
            if alt == cs:
                return True
            # Substring matching only for 3+ chars, so "go" or "r" don't match "django" / "react".
            if len(alt) >= 3 and len(cs) >= 3 and (alt in cs or cs in alt):
                return True
    return False


def calculate_skill_overlap(candidate_skills: List[str], jd_must_have: List[str], jd_preferred: List[str]) -> Tuple[float, List[str], List[str]]:
    c_skills_lower = {s.strip().lower() for s in candidate_skills if s.strip()}
    must = [s for s in jd_must_have if s.strip()]
    pref = [s for s in jd_preferred if s.strip()]

    matched = []
    missing = []

    must_matched_count = 0
    for orig in must:
        if _skill_present(skill_alternatives(orig), c_skills_lower):
            must_matched_count += 1
            matched.append(orig)
        else:
            missing.append(orig)

    pref_matched_count = 0
    for orig in pref:
        if _skill_present(skill_alternatives(orig), c_skills_lower):
            pref_matched_count += 1
            matched.append(orig)
        else:
            missing.append(orig)

    total_must = len(must)
    total_pref = len(pref)

    if total_must + total_pref == 0:
        score = 0.8  # neutral high fallback if JD specified no explicit skills list
    else:
        must_score = (must_matched_count / total_must) if total_must > 0 else 1.0
        pref_score = (pref_matched_count / total_pref) if total_pref > 0 else 1.0
        score = (must_score * 0.75) + (pref_score * 0.25)

    return min(1.0, max(0.0, score)), matched, missing

def calculate_experience_score(candidate_years: float, jd_years: float) -> float:
    if jd_years <= 0:
        return 1.0
    ratio = candidate_years / jd_years
    if ratio >= 1.0:
        return min(1.0, 0.9 + 0.1 * min(1.0, ratio - 1.0))
    else:
        return max(0.2, ratio * 0.85)

DEGREE_LEVELS = [
    (3, r"\b(phd|doctorate|doctor of philosophy|dphil)\b"),
    (2, r"\b(master'?s?|msc|mtech|ms|me|mba|ma|mca|mphil)\b"),
    (1, r"\b(bachelor'?s?|bsc|btech|be|bs|ba|bca|bdes|bba|undergraduate|degree)\b"),
]


def degree_level(text: str) -> int:
    """Highest degree level mentioned: 3 = doctorate, 2 = master's, 1 = bachelor's, 0 = none."""
    norm = re.sub(r"[.’]", "", text.lower())  # "B.Tech" -> "btech", "M.Sc." -> "msc"
    return next((level for level, pattern in DEGREE_LEVELS if re.search(pattern, norm)), 0)


def calculate_education_score(candidate_edu: List[Any], jd_edu_req: str) -> float:
    if not jd_edu_req:
        return 0.85
    edu_text = " ".join(f"{e.degree}" for e in candidate_edu)
    if not edu_text.strip():
        return 0.4
    required = degree_level(jd_edu_req) or 1
    have = degree_level(edu_text)
    if have >= required:
        return 1.0
    if have == required - 1:
        return 0.75
    return 0.55

def calculate_project_score(projects: List[Any], role_keywords: List[str]) -> float:
    if not projects:
        return 0.3
    if not role_keywords:
        return 0.85

    kw_lower = [k.lower() for k in role_keywords if k.strip()]
    matched = 0
    for proj in projects:
        proj_text = f"{proj.name} {proj.description} {' '.join(proj.technologies)}".lower()
        if any(kw in proj_text for kw in kw_lower):
            matched += 1

    return min(1.0, 0.4 + (matched / len(projects)) * 0.6)

def compute_explainable_match(
    candidate: CandidateProfile,
    jd: JobDescription
) -> Dict[str, Any]:
    """
    Computes sub-scores, final weighted score, and Explainable AI (XAI) metadata:
    - matched_skills
    - missing_skills
    - reasoning text
    - confidence_score
    """
    # 1. Semantic Similarity
    jd_vec = get_embedding(f"{jd.title} {' '.join(jd.must_have_skills)} {' '.join(jd.role_keywords)} {jd.education}")
    cand_vec = get_embedding(f"{candidate.name} {' '.join(candidate.skills)} {' '.join([w.description for w in candidate.work_experience])}")
    semantic_score = calibrate_semantic(calculate_cosine_similarity(jd_vec, cand_vec))

    # 2. Skill Score & Skill Matrices
    skill_score, matched_skills, missing_skills = calculate_skill_overlap(
        candidate.skills, jd.must_have_skills, jd.preferred_skills
    )

    # 3. Experience Score
    exp_score = calculate_experience_score(candidate.total_experience_years, jd.experience_years)

    # 4. Education & Project Scores
    edu_score = calculate_education_score(candidate.education, jd.education)
    proj_score = calculate_project_score(candidate.projects, jd.role_keywords)

    # Weighted Final Score
    final_score = (
        (semantic_score * 0.35) +
        (skill_score * 0.30) +
        (exp_score * 0.15) +
        (proj_score * 0.10) +
        (edu_score * 0.10)
    )

    final_score = round(min(1.0, max(0.0, final_score)), 3)

    # Confidence Score calculation based on profile completeness & data richness
    completeness_factors = [
        len(candidate.skills) > 0,
        len(candidate.work_experience) > 0 or len(candidate.projects) > 0,
        candidate.total_experience_years >= 0,
        len(candidate.education) > 0
    ]
    confidence_score = round(0.70 + (sum(completeness_factors) / len(completeness_factors)) * 0.28, 2)

    # Natural Language Reasoning summary
    reasoning_parts = []
    if skill_score >= 0.7:
        reasoning_parts.append(f"Strong skill alignment with {len(matched_skills)} key skills matched.")
    elif missing_skills:
        reasoning_parts.append(f"Missing essential required skills: {', '.join(missing_skills[:3])}.")

    if candidate.total_experience_years >= jd.experience_years and jd.experience_years > 0:
        reasoning_parts.append(f"Meets experience criteria ({candidate.total_experience_years} yrs vs {jd.experience_years} yrs required).")
    elif jd.experience_years > 0:
        reasoning_parts.append(f"Below target experience ({candidate.total_experience_years} yrs vs {jd.experience_years} yrs required).")

    if semantic_score > 0.65:
        reasoning_parts.append("High overall resume semantic similarity to the job description.")

    reasoning = " ".join(reasoning_parts) or "Moderate match across general role competencies."

    status = "Shortlisted" if final_score >= get_settings().shortlist_threshold else "Rejected"

    return {
        "semantic_score": round(semantic_score, 3),
        "skill_score": round(skill_score, 3),
        "experience_score": round(exp_score, 3),
        "project_score": round(proj_score, 3),
        "education_score": round(edu_score, 3),
        "final_score": final_score,
        "confidence_score": confidence_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "reasoning": reasoning,
        "status": status
    }
