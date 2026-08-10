import os
import logging
from typing import Optional, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

logger = logging.getLogger("smarthire.llm_factory")

def get_llm(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.1
) -> Any:
    """
    Factory creating LLM instances with primary provider (Gemini 2.0 Flash)
    and automatic fallback chain to Groq (llama-3.3-70b-versatile) on rate limits (429) or quota errors.
    """
    primary_provider = (provider or os.getenv("LLM_PROVIDER", "gemini")).lower()
    
    primary_llm = None
    fallback_llm = None

    # Initialize Gemini primary model if GOOGLE_API_KEY present
    google_key = os.getenv("GOOGLE_API_KEY")
    if google_key:
        gemini_model = model or os.getenv("LLM_MODEL_NAME", "gemini-2.0-flash")
        try:
            primary_llm = ChatGoogleGenerativeAI(
                model=gemini_model,
                temperature=temperature,
                google_api_key=google_key
            )
        except Exception as e:
            logger.warning(f"Could not initialize ChatGoogleGenerativeAI: {e}")

    # Initialize Groq fallback model if GROQ_API_KEY present
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        groq_model = os.getenv("GROQ_MODEL_NAME", "llama-3.3-70b-versatile")
        try:
            fallback_llm = ChatGroq(
                model=groq_model,
                temperature=temperature,
                api_key=groq_key
            )
        except Exception as e:
            logger.warning(f"Could not initialize ChatGroq: {e}")

    if primary_provider == "groq":
        if fallback_llm and primary_llm:
            logger.info("Using Groq as primary LLM with Gemini fallback.")
            return fallback_llm.with_fallbacks([primary_llm])
        elif fallback_llm:
            return fallback_llm
        elif primary_llm:
            return primary_llm
    else: # Default Gemini primary
        if primary_llm and fallback_llm:
            logger.info("Using Gemini as primary LLM with Groq fallback.")
            return primary_llm.with_fallbacks([fallback_llm])
        elif primary_llm:
            return primary_llm
        elif fallback_llm:
            return fallback_llm

    raise ValueError("No valid LLM provider configured. Please check GOOGLE_API_KEY or GROQ_API_KEY in .env.")
