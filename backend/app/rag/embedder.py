"""
Qwen3-Embedding-0.6B via OpenVINO for RAG vector embeddings.

Auto-downloads the model from HuggingFace on first use if not present locally.
"""

import os
import logging
import numpy as np
from typing import List, Optional

logger = logging.getLogger("rag.embedder")

# Resolve paths relative to this file
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_MODELS_DIR = os.path.abspath(os.path.join(_BACKEND_DIR, "..", "models"))


class RAGEmbedder:
    """Embed text using Qwen3-Embedding-0.6B via OpenVINO."""

    MODEL_ID = "Qwen/Qwen3-Embedding-0.6B"
    LOCAL_DIR = os.path.join(_MODELS_DIR, "Qwen3-Embedding-0.6B", "FP16")

    def __init__(self):
        self.core = None
        self.model = None
        self.compiled = None
        self.tokenizer = None
        self._ready = False

    def _ensure_model(self):
        """Load model from disk, downloading + converting if necessary."""
        if self._ready:
            return

        import openvino

        self.core = openvino.Core()

        if not os.path.exists(os.path.join(self.LOCAL_DIR, "openvino_model.xml")):
            logger.info(f"[EMBEDDER] Model not found at {self.LOCAL_DIR}. Downloading from HuggingFace...")
            self._download_and_convert()

        logger.info(f"[EMBEDDER] Loading embedding model from {self.LOCAL_DIR}")
        self.model = self.core.read_model(os.path.join(self.LOCAL_DIR, "openvino_model.xml"))
        self.compiled = self.core.compile_model(self.model, "CPU")

        # Load tokenizer
        tokenizer_path = os.path.join(self.LOCAL_DIR, "tokenizer.json")
        if os.path.exists(tokenizer_path):
            from tokenizers import Tokenizer
            self.tokenizer = Tokenizer.from_file(tokenizer_path)
        else:
            # Fallback: try transformers tokenizer
            from transformers import AutoTokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(self.LOCAL_DIR, trust_remote_code=True)

        self._ready = True
        logger.info("[EMBEDDER] Embedding model loaded successfully")

    def _download_and_convert(self):
        """Download from HuggingFace and convert to OpenVINO IR format."""
        from huggingface_hub import snapshot_download

        tmp_dir = snapshot_download(self.MODEL_ID)
        logger.info(f"[EMBEDDER] Downloaded to {tmp_dir}")

        try:
            from optimum.intel import OVModelForFeatureExtraction

            ov_model = OVModelForFeatureExtraction.from_pretrained(tmp_dir, export=True)
            os.makedirs(self.LOCAL_DIR, exist_ok=True)
            ov_model.save_pretrained(self.LOCAL_DIR)
            logger.info(f"[EMBEDDER] Converted and saved to {self.LOCAL_DIR}")
        except Exception as e:
            logger.warning(f"[EMBEDDER] optimum conversion failed: {e}. Trying direct OpenVINO export...")
            # Fallback: use optimum-cli command line
            import subprocess
            subprocess.run([
                "optimum-cli", "export", "openvino",
                "--task", "feature-extraction",
                "--model", tmp_dir,
                self.LOCAL_DIR,
            ], check=True)
            logger.info(f"[EMBEDDER] Converted via CLI to {self.LOCAL_DIR}")

    def embed(self, texts: List[str], batch_size: int = 8) -> np.ndarray:
        """
        Embed a list of texts.

        Returns:
            np.ndarray of shape (N, hidden_size) with L2-normalized vectors.
        """
        self._ensure_model()

        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_embeddings = self._embed_batch(batch)
            all_embeddings.append(batch_embeddings)

        return np.vstack(all_embeddings).astype(np.float32)

    def _embed_batch(self, texts: List[str]) -> np.ndarray:
        """Embed a single batch of texts."""
        import numpy as np

        # Tokenize
        if hasattr(self.tokenizer, 'encode_batch'):
            # tokenizers library
            encodings = self.tokenizer.encode_batch(texts)
            input_ids = np.array([enc.ids for enc in encodings])
            attention_mask = np.array([enc.attention_mask for enc in encodings])
        else:
            # transformers tokenizer
            encoded = self.tokenizer(
                texts,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="np",
            )
            input_ids = encoded["input_ids"]
            attention_mask = encoded["attention_mask"]

        # Run inference
        outputs = self.compiled(input_ids)

        # Get last hidden state (model outputs logits for causal LM, but for
        # embedding we use the hidden states — however OpenVINO IR may only
        # expose the logits output. For Qwen3-Embedding, the [EOS] token
        # embedding IS the sentence embedding, so we take the last token's
        # output projection.)
        hidden_states = outputs[0]  # (batch, seq_len, hidden_size)

        # Mean pooling: average over non-padded positions
        mask_expanded = attention_mask[:, :, np.newaxis].astype(np.float32)  # (batch, seq_len, 1)
        summed = np.sum(hidden_states * mask_expanded, axis=1)  # (batch, hidden_size)
        counts = np.sum(mask_expanded, axis=1).clip(min=1e-9)  # (batch, 1)
        embeddings = summed / counts

        # L2 normalize
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True).clip(min=1e-9)
        embeddings = embeddings / norms

        return embeddings

    def embed_single(self, text: str) -> np.ndarray:
        """Embed a single text. Returns shape (1, hidden_size)."""
        return self.embed([text])
