from langchain_core.prompts import ChatPromptTemplate
from backend.app.schemas.candidate import CandidateProfile
from backend.app.services.llm_factory import get_llm
import logging

logger = logging.getLogger("smarthire.agents.resume_agent")

RESUME_PARSER_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are an expert HR AI Resume Parsing Assistant. Analyze the raw candidate resume text and extract a structured CandidateProfile JSON object. Extract candidate name, contact info, explicit technical skills, work experience details, total experience years, projects, education, and certifications accurately."),
    ("user", "Resume Raw Text:\n\n{raw_resume_text}")
])

async def run_resume_agent(raw_resume_text: str) -> CandidateProfile:
    """
    Resume Agent: Parses raw resume text into a structured Pydantic CandidateProfile
    using Gemini 2.5 Flash with structured output.
    """
    logger.info("Executing Resume Agent structured extraction...")
    llm = get_llm()
    structured_llm = llm.with_structured_output(CandidateProfile)
    chain = RESUME_PARSER_PROMPT | structured_llm

    try:
        result = await chain.ainvoke({"raw_resume_text": raw_resume_text})
        return result
    except Exception as e:
        logger.warning(f"Async LLM call failed in Resume Agent: {e}. Falling back to sync invoke...")
        result = chain.invoke({"raw_resume_text": raw_resume_text})
        return result
