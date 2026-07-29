import hashlib
import json
import re

def compute_hash(file_path: str) -> str:
    """Computes SHA-256 hash of a file for duplicate detection."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read and update hash string value in blocks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def sanitize_name(name: str) -> str:
    """Sanitizes candidate name to try and remove bias headers if any."""
    return name.strip().title()

def clean_json_string(text: str) -> str:
    """Cleans JSON string returned by LLM (removes markdown backticks)."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

def safe_json_parse(json_str: str) -> dict:
    """Safely parses JSON string to dict, handling common LLM formatting errors."""
    try:
        cleaned_str = clean_json_string(json_str)
        return json.loads(cleaned_str)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
        print(f"Raw string was: {json_str[:100]}...")
        # Fallback to empty context
        return {}

def format_score(score: float) -> str:
    """Formats a float score (0.0 to 1.0) as a percentage string."""
    return f"{score * 100:.1f}%"
