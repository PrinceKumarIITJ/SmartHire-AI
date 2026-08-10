from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from backend.app.schemas.job import JobDescription
from backend.app.services.llm_factory import get_llm
from backend.app.prompts.prompt_loader import load_prompt_template
import logging

logger = logging.getLogger("smarthire.agents.jd_agent")

system_prompt_text = load_prompt_template(
    "jd_prompt.txt",
    "You are an expert HR AI parsing assistant. Analyze the raw Job Description text provided and extract a structured JobDescription JSON object."
)

JD_PARSER_PROMPT = ChatPromptTemplate.from_messages([
    ("system", system_prompt_text),
    ("user", "Job Description Raw Text:\n\n{raw_jd}")
])

async def run_jd_agent(raw_jd: str) -> JobDescription:
    """
    JD Agent: Parses raw job description into structured Pydantic JobDescription model
    using Gemini 2.5 Flash with structured output.
    """
    logger.info("Executing JD Agent structured extraction...")
    llm = get_llm()
    structured_llm = llm.with_structured_output(JobDescription)
    chain = JD_PARSER_PROMPT | structured_llm
    
    try:
        result = await chain.ainvoke({"raw_jd": raw_jd})
        return result
    except Exception as e:
        logger.warning(f"Async LLM call failed in JD Agent: {e}. Falling back to sync call...")
        result = chain.invoke({"raw_jd": raw_jd})
        return result
