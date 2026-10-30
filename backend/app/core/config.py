import os
from functools import lru_cache
from typing import List
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Runtime settings sourced from environment variables."""

    def __init__(self):
        self.app_name: str = "SmartHire AI"
        self.version: str = "2.1.0"
        self.environment: str = os.getenv("ENVIRONMENT", "development")
        self.cors_origins: List[str] = [
            o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()
        ]
        self.max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "10"))
        self.max_files_per_upload: int = int(os.getenv("MAX_FILES_PER_UPLOAD", "50"))
        self.shortlist_threshold: float = float(os.getenv("SHORTLIST_THRESHOLD", "0.70"))
        self.allowed_extensions = {".pdf", ".docx", ".txt"}

    @property
    def llm_providers(self) -> List[str]:
        providers = []
        if os.getenv("GOOGLE_API_KEY"):
            providers.append("gemini")
        if os.getenv("GROQ_API_KEY"):
            providers.append("groq")
        return providers

    @property
    def smtp_configured(self) -> bool:
        return bool(os.getenv("SMTP_EMAIL") and os.getenv("SMTP_PASSWORD"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
