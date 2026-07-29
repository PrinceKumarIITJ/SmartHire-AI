import os
import logging
from typing import Optional, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

logger = logging.getLogger("smarthire.llm_factory")

def is_retryable_exception(e: Exception) -> bool:
    """Retry on rate limits (429), timeouts, and 5xx service errors."""
    err_str = str(e).lower()
    return "429" in err_str or "quota" in err_str or "rate limit" in err_str or "500" in err_str or "503" in err_str or "timeout" in err_str

def get_llm(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.1
) -> Any:
    """
    Factory creating LLM instances with Gemini 2.5 Flash as default primary model
    and automatic fallback to Groq. Retries on 429 rate limit or 5xx errors.
    """
    primary_provider = (provider or os.getenv("LLM_PROVIDER", "gemini")).lower()
    
    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception(is_retryable_exception),
        reraise=True
    )
    def _create_llm_instance(prov: str):
        if prov == "groq":
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise ValueError("GROQ_API_KEY environment variable missing.")
            groq_model = model or os.getenv("GROQ_MODEL_NAME", "llama-3.3-70b-versatile")
            logger.info(f"Initializing Groq LLM with model {groq_model}")
            return ChatGroq(
                model=groq_model,
                temperature=temperature,
                api_key=api_key
            )
        else: # Gemini primary
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                raise ValueError("GOOGLE_API_KEY environment variable missing.")
            gemini_model = model or os.getenv("LLM_MODEL_NAME", "gemini-2.5-flash")
            logger.info(f"Initializing Gemini LLM with model {gemini_model}")
            return ChatGoogleGenerativeAI(
                model=gemini_model,
                temperature=temperature,
                google_api_key=api_key
            )

    try:
        return _create_llm_instance(primary_provider)
    except Exception as exc:
        fallback_provider = "groq" if primary_provider == "gemini" else "gemini"
        logger.warning(f"Primary provider '{primary_provider}' failed with error: {exc}. Attempting fallback to '{fallback_provider}'.")
        try:
            return _create_llm_instance(fallback_provider)
        except Exception as fallback_exc:
            logger.error(f"Fallback provider '{fallback_provider}' also failed: {fallback_exc}")
            raise fallback_exc
