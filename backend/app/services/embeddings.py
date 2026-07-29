from typing import List
from sentence_transformers import SentenceTransformer
import logging

logger = logging.getLogger("smarthire.embeddings")

_embedding_model = None

def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        logger.info("Loading sentence-transformers/all-MiniLM-L6-v2 embedding model...")
        _embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
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
