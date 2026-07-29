import os
from typing import List, Dict, Any, Tuple
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

from utils.constants import EMBEDDING_MODEL_NAME, FAISS_INDEX_PATH

# We use a singleton pattern for the embedding model to avoid reloading it
_EMBEDDING_MODEL = None

def get_embedding_model():
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        print(f"Loading embedding model: {EMBEDDING_MODEL_NAME}")
        # The default settings will download the model to HF cache if not present
        _EMBEDDING_MODEL = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)
    return _EMBEDDING_MODEL

def build_faiss_index(documents: List[Document]) -> FAISS:
    """
    Builds an in-memory FAISS vector index from a list of LangChain documents.
    These documents typically represent candidate profiles or resumes.
    """
    model = get_embedding_model()
    if not documents:
        raise ValueError("Cannot build index with empty document list.")
    
    vectorstore = FAISS.from_documents(documents, model)
    return vectorstore

def save_faiss_index(vectorstore: FAISS, path: str = FAISS_INDEX_PATH):
    """Save local FAISS index to disk."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    vectorstore.save_local(path)

def load_faiss_index(path: str = FAISS_INDEX_PATH) -> FAISS:
    """Load existing FAISS index from disk."""
    model = get_embedding_model()
    # Check if directory and files exist
    if not os.path.exists(path) or not os.path.exists(os.path.join(path, "index.faiss")):
        raise FileNotFoundError(f"FAISS index not found at {path}")
    
    # allow_dangerous_deserialization is needed in newer versions of Langchain FAISS
    return FAISS.load_local(path, model, allow_dangerous_deserialization=True)

def query_faiss(vectorstore: FAISS, query: str, k: int = 5) -> List[Tuple[Document, float]]:
    """
    Performs similarity search.
    Returns list of (Document, score) where score is L2 distance (lower is better).
    """
    # FAISS returns L2 distance by default. We might want to convert to similarity score.
    results_with_scores = vectorstore.similarity_search_with_score(query, k=k)
    return results_with_scores
