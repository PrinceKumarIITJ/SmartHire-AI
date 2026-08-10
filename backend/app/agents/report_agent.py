from typing import List, Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from backend.app.schemas.job import JobDescription
from backend.app.schemas.report import ExecutiveReportSchema
from backend.app.services.llm_factory import get_llm
from backend.app.prompts.prompt_loader import load_prompt_template
import logging

logger = logging.getLogger("smarthire.agents.report_agent")

system_prompt_text = load_prompt_template(
    "report_prompt.txt",
    "You are an executive HR AI analyst. Synthesize the candidate batch evaluation results into an Executive Hiring Report."
)

REPORT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", system_prompt_text),
    ("user", "Job Title: {job_title}\n\nJob Description Requirements:\n{jd_summary}\n\nCandidate Match Results:\n{candidate_summaries}")
])

async def run_report_agent(
    job: JobDescription,
    matches: List[Dict[str, Any]]
) -> ExecutiveReportSchema:
    """
    Report Agent: Synthesizes entire candidate batch evaluation into an AI Executive Hiring Report.
    """
    logger.info("Executing Report Agent to synthesize Executive Hiring Report...")

    cand_lines = []
    for m in matches:
        cand_lines.append(
            f"- {m.get('candidate_name', 'Candidate')}: Final Score={m.get('final_score')}, "
            f"Matched Skills={m.get('matched_skills')}, Missing Skills={m.get('missing_skills')}, "
            f"Status={m.get('status')}"
        )
    candidate_summaries = "\n".join(cand_lines)

    jd_summary = f"Skills: {', '.join(job.must_have_skills + job.preferred_skills)} | Exp: {job.experience_years} yrs"

    llm = get_llm()
    structured_llm = llm.with_structured_output(ExecutiveReportSchema)
    chain = REPORT_PROMPT | structured_llm

    try:
        res = await chain.ainvoke({
            "job_title": job.title,
            "jd_summary": jd_summary,
            "candidate_summaries": candidate_summaries
        })
        return res
    except Exception as e:
        logger.warning(f"Async LLM call failed in Report Agent: {e}. Trying sync invoke...")
        res = chain.invoke({
            "job_title": job.title,
            "jd_summary": jd_summary,
            "candidate_summaries": candidate_summaries
        })
        return res
