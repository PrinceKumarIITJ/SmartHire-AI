import os
import faiss
import numpy as np
from typing import List, Dict, Any, Optional, Set, Tuple
from backend.app.services.embeddings import get_embeddings_batch, get_embedding
import logging

logger = logging.getLogger("smarthire.vector_store")

class FAISSVectorStore:
    """
    FAISS-backed vector store for Candidate Resume Chunks RAG.
    Supports index creation, document chunking, persistence, and top-k search.
    """
    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)  # Inner Product for Cosine Similarity (vectors normalized)
        self.metadata_store: List[Dict[str, Any]] = []

    def _normalize(self, vectors: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1e-10
        return vectors / norms

    def has_candidate(self, candidate_id: str) -> bool:
        return any(m["candidate_id"] == candidate_id and not m.get("deleted") for m in self.metadata_store)

    def remove_candidate(self, candidate_id: str):
        """Tombstone a candidate's chunks. IndexFlatIP has no cheap delete, so search skips them."""
        for meta in self.metadata_store:
            if meta["candidate_id"] == candidate_id:
                meta["deleted"] = True

    def add_candidate_chunks(self, candidate_id: str, candidate_name: str, text: str, chunk_size: int = 400, overlap: int = 50):
        """Chunk candidate resume text, embed, and index in FAISS. Re-indexing replaces earlier chunks."""
        self.remove_candidate(candidate_id)
        words = text.split()
        if not words:
            return

        chunks = []
        step = chunk_size - overlap
        if step <= 0:
            step = chunk_size

        for i in range(0, len(words), step):
            chunk_text = " ".join(words[i : i + chunk_size])
            if len(chunk_text.strip()) > 20:
                chunks.append(chunk_text)

        if not chunks:
            chunks = [text]

        embeddings = get_embeddings_batch(chunks)
        vecs_np = np.array(embeddings, dtype=np.float32)
        vecs_norm = self._normalize(vecs_np)

        start_idx = self.index.ntotal
        self.index.add(vecs_norm)

        for offset, chunk_text in enumerate(chunks):
            self.metadata_store.append({
                "chunk_id": start_idx + offset,
                "candidate_id": candidate_id,
                "candidate_name": candidate_name,
                "chunk_text": chunk_text,
                "chunk_order": offset
            })

        logger.info(f"Indexed {len(chunks)} chunks for candidate '{candidate_name}' ({candidate_id}). Total vectors in FAISS: {self.index.ntotal}")

    def similarity_search_candidate(self, candidate_id: str, query: str, top_k: int = 4) -> List[Tuple[str, float]]:
        """Search top-k relevant resume chunks specifically for a candidate."""
        if self.index.ntotal == 0:
            return []

        query_vec = np.array([get_embedding(query)], dtype=np.float32)
        query_norm = self._normalize(query_vec)

        # Search across total vectors
        k_search = self.index.ntotal
        scores, indices = self.index.search(query_norm, k_search)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.metadata_store):
                continue
            meta = self.metadata_store[idx]
            if meta["candidate_id"] == candidate_id and not meta.get("deleted"):
                results.append((meta["chunk_text"], float(score)))
                if len(results) >= top_k:
                    break

        return results

    def search_across_candidates(self, query: str, top_k: int = 6, candidate_ids: Optional[Set[str]] = None,
                                 per_candidate: int = 2) -> List[Dict[str, Any]]:
        """Semantic search over every indexed resume (optionally restricted), best passages first."""
        if self.index.ntotal == 0:
            return []
        query_norm = self._normalize(np.array([get_embedding(query)], dtype=np.float32))
        scores, indices = self.index.search(query_norm, self.index.ntotal)
        results, taken = [], {}
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.metadata_store):
                continue
            meta = self.metadata_store[idx]
            cid = meta["candidate_id"]
            if meta.get("deleted") or (candidate_ids is not None and cid not in candidate_ids):
                continue
            if taken.get(cid, 0) >= per_candidate:
                continue
            taken[cid] = taken.get(cid, 0) + 1
            results.append({
                "candidate_id": cid,
                "candidate_name": meta["candidate_name"],
                "passage": meta["chunk_text"],
                "similarity": round(float(score), 3),
            })
            if len(results) >= top_k:
                break
        return results

# Global singleton FAISS store instance
faiss_store = FAISSVectorStore()
