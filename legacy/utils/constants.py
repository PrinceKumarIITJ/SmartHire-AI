import os
from dotenv import load_dotenv

load_dotenv()

# Embedding config
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
FAISS_INDEX_PATH = "data/faiss_index/smart_hire_index.faiss"

# Scoring weights
WEIGHT_SEMANTIC = 0.40
WEIGHT_SKILL = 0.20
WEIGHT_EXPERIENCE = 0.20
WEIGHT_PROJECT = 0.10
WEIGHT_EDUCATION = 0.10

# Matching thresholds
SHORTLIST_THRESHOLD = 0.65

# Email config
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
HR_COMPANY_NAME = os.getenv("HR_COMPANY_NAME", "SmartHire AI Inc.")

# LLM Provider Configuration
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")

# LLM Model (Gemini 2.0 Flash recommended for cost/speed)
LLM_MODEL_NAME = os.getenv("LLM_MODEL_NAME", "gemini-1.5-flash")

# Groq Model (Requires GROQ_API_KEY)
GROQ_MODEL_NAME = os.getenv("GROQ_MODEL_NAME", "llama-3.3-70b-versatile")

# Ollama Model (Requires Ollama running locally)
OLLAMA_MODEL_NAME = os.getenv("OLLAMA_MODEL_NAME", "llama3")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# General Config 
DATA_DIR = "data/resumes"
REPORTS_DIR = "reports"
