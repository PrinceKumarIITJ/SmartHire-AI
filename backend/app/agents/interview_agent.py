from typing import Dict, Any, List
from langchain_core.prompts import ChatPromptTemplate
from backend.app.schemas.job import JobDescription
from backend.app.schemas.candidate import CandidateProfile, InterviewKit, InterviewQuestion
from backend.app.services.llm_factory import get_llm
from backend.app.prompts.prompt_loader import load_prompt_template
from backend.app.services.tracing import traced_agent
import logging

logger = logging.getLogger("smarthire.agents.interview_agent")

system_prompt_text = load_prompt_template(
    "interview_prompt.txt",
    "You are a senior technical interviewer. Write {count} targeted interview questions for this candidate."
)

INTERVIEW_PROMPT = ChatPromptTemplate.from_messages([
    ("system", system_prompt_text),
    ("user",
     "Role: {job_title}\nRequired skills: {must_have}\nPreferred skills: {preferred}\n"
     "Responsibilities: {responsibilities}\n\n"
     "Candidate: {candidate_name} ({years} yrs experience)\nSkills: {skills}\n"
     "Projects: {projects}\nRecent roles: {roles}\n\n"
     "Matched skills: {matched}\nMissing skills: {missing}\nScoring rationale: {reasoning}")
])


def build_fallback_kit(profile: CandidateProfile, match: Dict[str, Any], count: int) -> InterviewKit:
    """Deterministic interview kit used when no LLM provider is reachable."""
    questions: List[InterviewQuestion] = []
    for skill in (match.get("matched_skills") or [])[:3]:
        questions.append(InterviewQuestion(
            category="Technical",
            question=f"Walk me through the most complex problem you solved using {skill}. What trade-offs did you make?",
            rationale=f"Verifies depth behind the claimed {skill} experience rather than surface familiarity.",
        ))
    for skill in (match.get("missing_skills") or [])[:3]:
        questions.append(InterviewQuestion(
            category="Gap Probe",
            question=f"This role relies on {skill}. What adjacent experience do you have, and how would you ramp up in your first month?",
            rationale=f"{skill} was not found on the resume; listen for transferable skills and a concrete learning plan.",
        ))
    for project in profile.projects[:2]:
        questions.append(InterviewQuestion(
            category="Project Deep-Dive",
            question=f"On '{project.name}', what part did you personally own, and how did you measure its success?",
            rationale="Separates individual contribution from team output and checks for impact orientation.",
        ))
    questions.append(InterviewQuestion(
        category="Behavioral",
        question="Tell me about a time requirements changed late in a project. How did you adapt and communicate it?",
        rationale="Assesses handling of ambiguity and stakeholder communication.",
    ))
    return InterviewKit(questions=questions[:count])


@traced_agent("interview_agent")
async def run_interview_agent(
    job: JobDescription,
    profile: CandidateProfile,
    match: Dict[str, Any],
    count: int = 8,
) -> InterviewKit:
    """Interview Agent: drafts a candidate-specific structured interview kit."""
    logger.info(f"Executing Interview Agent for candidate '{profile.name}'...")
    input_vars = {
        "count": count,
        "job_title": job.title,
        "must_have": ", ".join(job.must_have_skills) or "not specified",
        "preferred": ", ".join(job.preferred_skills) or "not specified",
        "responsibilities": "; ".join(job.responsibilities[:6]) or "not specified",
        "candidate_name": profile.name,
        "years": profile.total_experience_years,
        "skills": ", ".join(profile.skills[:25]) or "not listed",
        "projects": "; ".join(f"{p.name}: {p.description[:160]}" for p in profile.projects[:4]) or "none listed",
        "roles": "; ".join(f"{w.role} at {w.company}" for w in profile.work_experience[:4]) or "none listed",
        "matched": ", ".join(match.get("matched_skills") or []) or "none",
        "missing": ", ".join(match.get("missing_skills") or []) or "none",
        "reasoning": match.get("reasoning", ""),
    }
    try:
        chain = INTERVIEW_PROMPT | get_llm(temperature=0.4).with_structured_output(InterviewKit)
        kit = await chain.ainvoke(input_vars)
        if kit and kit.questions:
            return kit
    except Exception as e:
        logger.warning(f"Interview Agent LLM call failed: {e}. Using deterministic fallback kit.")
    return build_fallback_kit(profile, match, count)
