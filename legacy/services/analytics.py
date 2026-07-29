import pandas as pd
from typing import List, Dict, Any
from utils.models import MatchResult, CandidateProfile, JobDescription
import os
from fpdf import FPDF

def compute_summary_stats(results: List[MatchResult]) -> Dict[str, Any]:
    if not results:
        return {"total": 0, "shortlisted": 0, "rejected": 0, "avg_score": 0.0}
        
    total = len(results)
    shortlisted = sum(1 for r in results if r.status == "Shortlisted")
    rejected = total - shortlisted
    avg_score = sum(r.final_score for r in results) / total
    
    return {
        "total": total,
        "shortlisted": shortlisted,
        "rejected": rejected,
        "avg_score": avg_score
    }

def get_top_skills(candidates: List[CandidateProfile]) -> Dict[str, int]:
    skill_counts = {}
    for c in candidates:
        for s in c.skills:
            # Normalize basic
            norm_s = s.strip().title()
            skill_counts[norm_s] = skill_counts.get(norm_s, 0) + 1
            
    # Sort by count desc
    sorted_skills = {k: v for k, v in sorted(skill_counts.items(), key=lambda item: item[1], reverse=True)}
    return sorted_skills

def compute_skill_gap(jd: JobDescription, candidates: List[CandidateProfile]) -> List[Dict[str, Any]]:
    if not jd or not jd.must_have_skills:
        return []
        
    gap_analysis = []
    total_candidates = len(candidates)
    if total_candidates == 0:
        return gap_analysis
        
    for required_skill in jd.must_have_skills:
        req_lower = required_skill.lower()
        have_skill = 0
        
        for c in candidates:
            cand_skills_lower = [s.lower() for s in c.skills]
            if any(req_lower in s or s in req_lower for s in cand_skills_lower):
                have_skill += 1
                
        gap_analysis.append({
            "Skill": required_skill,
            "Candidates With Skill": have_skill,
            "Availability %": (have_skill / total_candidates) * 100
        })
        
    return gap_analysis

def get_best_fit(results: List[MatchResult]) -> MatchResult:
    if not results:
        return None
    return max(results, key=lambda r: r.final_score)

def generate_csv_report(results: List[MatchResult], path: str = "reports/hiring_report.csv"):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = []
    for r in results:
        data.append({
            "Name": r.candidate_name,
            "Email": r.candidate_email,
            "Status": r.status,
            "Final Score": round(r.final_score * 100, 2),
            "Semantic Matched": round(r.semantic_score * 100, 2),
            "Skill Matched": round(r.skill_score * 100, 2),
            "Matched Skills": ", ".join(r.matched_skills),
            "Missing Skills": ", ".join(r.missing_skills)
        })
    df = pd.DataFrame(data)
    df.to_csv(path, index=False)
    return path
