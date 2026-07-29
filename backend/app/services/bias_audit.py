import re
from typing import List, Dict, Any
from backend.app.schemas.candidate import CandidateProfile
import logging

logger = logging.getLogger("smarthire.bias_audit")

# Redaction patterns for demographic signals
DEMOGRAPHIC_TERMS = [
    r"\b(mr|mrs|ms|miss|dr|prof)\.?\b",
    r"\b(male|female|woman|man|men|women|boy|girl|gender)\b",
    r"\b(she|he|her|his|him|hers|himself|herself)\b",
    r"\b(university of|college of|institute of)\s+[a-zA-Z]+\b",  # Prestige marker redaction
]

def redact_candidate_profile(profile: CandidateProfile) -> CandidateProfile:
    """
    Creates a demographic-blind copy of the candidate profile by redacting:
    - Candidate Name (replaced with 'Anonymous Candidate')
    - Email domain & phone number
    - Gender-indicative pronouns/honorifics
    - University prestige indicators
    """
    blind_dict = profile.model_dump()
    
    blind_dict["name"] = "Anonymous Candidate"
    blind_dict["email"] = "anonymous@redacted-domain.org"
    blind_dict["phone"] = "[REDACTED]"

    # Clean education institutions
    for edu in blind_dict.get("education", []):
        edu["institution"] = "[REDACTED INSTITUTION]"

    # Clean work experience text & descriptions
    for exp in blind_dict.get("work_experience", []):
        desc = exp.get("description", "")
        for pattern in DEMOGRAPHIC_TERMS:
            desc = re.sub(pattern, "[REDACTED]", desc, flags=re.IGNORECASE)
        exp["description"] = desc

    return CandidateProfile(**blind_dict)

def calculate_disparate_impact(standard_matches: List[Dict[str, Any]], blind_matches: List[Dict[str, Any]], threshold: float = 0.70) -> Dict[str, Any]:
    """
    Computes selection rate metrics and disparate impact ratio (80% / 4/5ths rule)
    comparing standard candidate evaluation vs. demographic-blind candidate evaluation.
    """
    total = len(standard_matches)
    if total == 0:
        return {
            "total_candidates": 0,
            "standard_shortlist_count": 0,
            "blind_shortlist_count": 0,
            "selection_rate_ratio": 1.0,
            "disparate_impact_detected": False,
            "summary": "No candidate data available for audit."
        }

    std_shortlisted = sum(1 for m in standard_matches if m.get("final_score", 0) >= threshold)
    blind_shortlisted = sum(1 for m in blind_matches if m.get("final_score", 0) >= threshold)

    std_rate = std_shortlisted / total
    blind_rate = blind_shortlisted / total

    # Selection rate ratio comparison
    if std_rate == 0:
        ratio = 1.0
    else:
        ratio = round(blind_rate / std_rate, 2)

    # 4/5ths Rule: ratio < 0.80 suggests potential adverse impact in standard scoring
    adverse_impact = ratio < 0.80 or ratio > 1.25

    if adverse_impact:
        summary = (
            f"Audit Alert: Selection rate shifted significantly between standard scoring ({std_shortlisted}/{total}) "
            f"and demographic-blind scoring ({blind_shortlisted}/{total}). Disparate Impact ratio is {ratio:.2f}."
        )
    else:
        summary = (
            f"Audit Clean: Consistent selection rate between standard scoring ({std_shortlisted}/{total}) "
            f"and demographic-blind scoring ({blind_shortlisted}/{total}). Disparate Impact ratio is {ratio:.2f} (Passes 80% rule)."
        )

    return {
        "total_candidates": total,
        "standard_shortlisted": std_shortlisted,
        "blind_shortlisted": blind_shortlisted,
        "standard_selection_rate": round(std_rate, 3),
        "blind_selection_rate": round(blind_rate, 3),
        "disparate_impact_ratio": ratio,
        "disparate_impact_detected": adverse_impact,
        "summary": summary
    }
