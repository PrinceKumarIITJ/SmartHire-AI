import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Simple helper to get LLM with retries
def get_llm(provider=None, model=None, temperature=0.1):
    """
    Factory to create LLM instances for Gemini, Groq, or Ollama.
    Includes automatic retries for rate limits (429 errors).
    """
    # Load settings from env or use defaults
    provider = provider or os.getenv("LLM_PROVIDER", "gemini").lower()
    
    @retry(
        wait=wait_exponential(multiplier=1, min=4, max=60),
        stop=stop_after_attempt(5),
        retry=retry_if_exception_type(Exception), # In production, filter for 429 specifically
        reraise=True
    )
    def _create_and_run():
        if provider == "groq":
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise ValueError("GROQ_API_KEY is missing from environment/session.")
            return ChatGroq(
                model=model or os.getenv("GROQ_MODEL_NAME", "llama-3.3-70b-versatile"),
                temperature=temperature,
                api_key=api_key
            )
        
        elif provider == "ollama":
            return ChatOllama(
                model=model or os.getenv("OLLAMA_MODEL_NAME", "llama3"),
                temperature=temperature,
                base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            )
        
        else: # Default to Gemini
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                raise ValueError("GOOGLE_API_KEY is missing.")
            return ChatGoogleGenerativeAI(
                model=model or os.getenv("LLM_MODEL_NAME", "gemini-1.5-flash"),
                temperature=temperature,
                google_api_key=api_key
            )

    return _create_and_run()
