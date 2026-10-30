import os
import logging
from typing import Any, List, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from backend.app.services.tracing import trace_callback
from backend.app.services import circuit_breaker as breaker

logger = logging.getLogger("smarthire.llm_factory")

# Bounded so an overloaded provider fails over to the fallback instead of retrying for minutes.
LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT_SECONDS", "60"))
LLM_MAX_RETRIES = int(os.getenv("LLM_MAX_RETRIES", "2"))


def _build_models(provider: Optional[str], model: Optional[str], temperature: float) -> List[Any]:
    """Chat models in priority order: the configured primary first, the other provider as fallback."""
    gemini = groq = None

    google_key = os.getenv("GOOGLE_API_KEY")
    if google_key:
        try:
            gemini = ChatGoogleGenerativeAI(
                model=model or os.getenv("LLM_MODEL_NAME", "gemini-2.5-flash"),
                temperature=temperature,
                google_api_key=google_key,
                timeout=LLM_TIMEOUT,
                max_retries=LLM_MAX_RETRIES,
                callbacks=[trace_callback],
            )
        except Exception as e:
            logger.warning(f"Could not initialize ChatGoogleGenerativeAI: {e}")

    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            groq = ChatGroq(
                model=os.getenv("GROQ_MODEL_NAME", "openai/gpt-oss-120b"),
                temperature=temperature,
                api_key=groq_key,
                timeout=LLM_TIMEOUT,
                max_retries=LLM_MAX_RETRIES,
                callbacks=[trace_callback],
            )
        except Exception as e:
            logger.warning(f"Could not initialize ChatGroq: {e}")

    primary = (provider or os.getenv("LLM_PROVIDER", "gemini")).lower()
    by_name = {"gemini": gemini, "groq": groq}
    priority = ["groq", "gemini"] if primary == "groq" else ["gemini", "groq"]
    # Circuit breaker: a provider that keeps failing (or is out of quota) is tried last.
    models = [by_name[p] for p in breaker.order_by_health(priority) if by_name[p] is not None]
    if not models:
        raise ValueError("No valid LLM provider configured. Please check GOOGLE_API_KEY or GROQ_API_KEY in .env.")
    return models


def get_llm(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.1
) -> Any:
    """
    Chat model with the configured primary provider and automatic fallback to the other
    provider on errors (rate limits, quota, outages).
    """
    models = _build_models(provider, model, temperature)
    return models[0].with_fallbacks(models[1:]) if len(models) > 1 else models[0]


def get_tool_calling_llm(tools: List[Any], temperature: float = 0.1) -> Any:
    """
    Tool-calling chat model with fallbacks. Tools are bound to each provider *before*
    composing the fallback chain, since a fallback runnable has no bind_tools().
    """
    bound = [m.bind_tools(tools) for m in _build_models(None, None, temperature)]
    return bound[0].with_fallbacks(bound[1:]) if len(bound) > 1 else bound[0]
