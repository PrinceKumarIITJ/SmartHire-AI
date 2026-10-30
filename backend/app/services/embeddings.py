import os
import threading
from typing import List
from sentence_transformers import SentenceTransformer
import logging

logger = logging.getLogger("smarthire.embeddings")

_embedding_model = None
# Encodes run in worker threads (asyncio.to_thread), so guard the one-time load.
_load_lock = threading.Lock()

def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        with _load_lock:
            if _embedding_model is None:
                # e.g. "cpu" or "cuda"; unset lets sentence-transformers pick automatically.
                device = os.getenv("EMBEDDING_DEVICE") or None
                logger.info(f"Loading sentence-transformers/all-MiniLM-L6-v2 embedding model (device={device or 'auto'})...")
                _embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2", device=device)
    return _embedding_model

def get_embedding(text: str) -> List[float]:
    """Embed single text string into 384-dim float list."""
    if not text.strip():
        return [0.0] * 384
    model = get_embedding_model()
    vec = model.encode(text, convert_to_numpy=True)
    return vec.tolist()

def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Embed list of text strings into list of 384-dim vectors."""
    if not texts:
        return []
    model = get_embedding_model()
    vecs = model.encode(texts, convert_to_numpy=True)
    return vecs.tolist()
