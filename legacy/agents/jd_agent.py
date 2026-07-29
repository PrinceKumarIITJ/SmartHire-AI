from services.llm_factory import get_llm
from langchain_core.prompts import ChatPromptTemplate
from utils.models import WorkflowState, JobDescription
from utils.prompts import JD_PARSE_PROMPT
from utils.helpers import safe_json_parse
import os

def parse_jd_node(state: WorkflowState) -> dict:
    """
    LangGraph Node: Parses raw job description text into structured JSON using the selected LLM.
    Uses native structured output for reliability.
    """
    print("Agent: JD Parser starting...")
    jd_text = state.get("jd_text", "")
    
    if not jd_text:
        return {"error": "No Job Description text provided."}

    llm = get_llm()
    
    try:
        # Try structured output first
        structured_llm = llm.with_structured_output(JobDescription)
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert HR Technical Recruiter. Extract structured information from the Job Description."),
            ("human", "{text}")
        ])
        chain = prompt | structured_llm
        jd = chain.invoke({"text": jd_text})
        
        # Ensure raw_text is populated
        jd.raw_text = jd_text
        return {"job_description": jd}
        
    except Exception as e:
        print(f"Structured output failed: {e}. Falling back to standard JSON parsing...")
        # Fallback to standard prompt + json parsing
        from langchain_core.prompts import PromptTemplate
        prompt = PromptTemplate(template=JD_PARSE_PROMPT, input_variables=["text"])
        chain = prompt | llm
        try:
            response = chain.invoke({"text": jd_text})
            parsed_dict = safe_json_parse(response.content)
            parsed_dict["raw_text"] = jd_text
            jd = JobDescription(**parsed_dict)
            return {"job_description": jd}
        except Exception as fallback_err:
            print(f"Error parsing JD fallback: {fallback_err}")
            return {"error": f"Failed to parse JD: {str(fallback_err)}"}

