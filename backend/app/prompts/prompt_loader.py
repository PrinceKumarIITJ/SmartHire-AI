import os

PROMPTS_DIR = os.path.dirname(os.path.abspath(__file__))

def load_prompt_template(filename: str, fallback_text: str = "") -> str:
    """Load text prompt template from backend/app/prompts/ directory."""
    path = os.path.join(PROMPTS_DIR, filename)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    return content
        except Exception:
            pass
    return fallback_text
