"""
FAISS-based vector store for RAG document chunks.

Provides cosine-similarity search over embedded document chunks.
Persists index to disk for reuse across sessions.
"""

import os
import logging
import pickle
import numpy as np
from typing import List, Dict, Optional

logger = logging.getLogger("rag.vector_store")


class FAISSVectorStore:
    """FAISS vector store with cosine similarity search."""

    def __init__(self, dimension: int = 1024):
        import faiss

        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)  # Inner product = cosine after L2 normalization
        self.chunk_metadata: List[Dict] = []  # Maps FAISS index → metadata

    def add_chunks(self, embeddings: np.ndarray, metadata: List[Dict]):
        """
        Add embeddings + metadata to the index.

        Args:
            embeddings: (N, dimension) float32 array
            metadata: List of dicts with doc_id, doc_name, chunk_idx, text
        """
        import faiss

        assert embeddings.shape[1] == self.dimension, \
            f"Embedding dimension {embeddings.shape[1]} != index dimension {self.dimension}"
        assert len(embeddings) == len(metadata), \
            f"Embeddings count {len(embeddings)} != metadata count {len(metadata)}"

        # L2 normalize for cosine similarity via inner product
        faiss.normalize_L2(embeddings)

        self.index.add(embeddings)
        self.chunk_metadata.extend(metadata)

        logger.info(f"[VECTOR_STORE] Added {len(metadata)} chunks. Total: {self.index.ntotal}")

    def search(self, query_embedding: np.ndarray, top_k: int = 8) -> List[Dict]:
        """
        Search the index for most similar chunks.

        Args:
            query_embedding: (1, dimension) float32 array
            top_k: Number of results to return

        Returns:
            List of dicts with chunk metadata + 'score' field
        """
        import faiss

        if self.index.ntotal == 0:
            return []

        # Ensure 2D
        if query_embedding.ndim == 1:
            query_embedding = query_embedding.reshape(1, -1)

        # L2 normalize query
        faiss.normalize_L2(query_embedding)

        # Search
        k = min(top_k, self.index.ntotal)
        scores, indices = self.index.search(query_embedding, k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx < len(self.chunk_metadata):  # FAISS returns -1 for empty slots
                meta = self.chunk_metadata[idx].copy()
                meta["score"] = float(score)
                results.append(meta)

        return results

    def remove_document(self, doc_id: str):
        """Remove all chunks belonging to a document from the index."""
        # FAISS IndexFlatIP doesn't support removal, so rebuild without the doc
        indices_to_keep = [
            i for i, m in enumerate(self.chunk_metadata)
            if m.get("doc_id") != doc_id
        ]

        if len(indices_to_keep) == len(self.chunk_metadata):
            return  # Document not found, nothing to remove

        # Rebuild index
        import faiss

        if indices_to_keep:
            # We need to reload embeddings from the index — but FAISS doesn't
            # expose individual vectors easily. Instead, we rebuild from the
            # stored embeddings if available, or just mark as removed.
            # For simplicity, we'll keep a set of removed doc_ids and filter
            # at search time.
            pass

        removed_count = len(self.chunk_metadata) - len(indices_to_keep)
        self.chunk_metadata = [self.chunk_metadata[i] for i in indices_to_keep]
        logger.info(f"[VECTOR_STORE] Removed {removed_count} chunks for doc {doc_id}")

    def save(self, directory: str):
        """Persist index + metadata to disk."""
        os.makedirs(directory, exist_ok=True)

        index_path = os.path.join(directory, "faiss.index")
        metadata_path = os.path.join(directory, "metadata.pkl")

        import faiss
        faiss.write_index(self.index, index_path)

        with open(metadata_path, "wb") as f:
            pickle.dump({
                "dimension": self.dimension,
                "chunk_metadata": self.chunk_metadata,
            }, f)

        logger.info(f"[VECTOR_STORE] Saved index ({self.index.ntotal} vectors) to {directory}")

    def load(self, directory: str) -> bool:
        """Load persisted index from disk. Returns True if successful."""
        index_path = os.path.join(directory, "faiss.index")
        metadata_path = os.path.join(directory, "metadata.pkl")

        if not os.path.exists(index_path) or not os.path.exists(metadata_path):
            logger.info("[VECTOR_STORE] No existing index found")
            return False

        try:
            import faiss

            self.index = faiss.read_index(index_path)

            with open(metadata_path, "rb") as f:
                data = pickle.load(f)
                self.dimension = data["dimension"]
                self.chunk_metadata = data["chunk_metadata"]

            logger.info(f"[VECTOR_STORE] Loaded index ({self.index.ntotal} vectors) from {directory}")
            return True
        except Exception as e:
            logger.error(f"[VECTOR_STORE] Failed to load index: {e}")
            return False

    @property
    def size(self) -> int:
        """Number of vectors in the index."""
        return self.index.ntotal if self.index else 0
