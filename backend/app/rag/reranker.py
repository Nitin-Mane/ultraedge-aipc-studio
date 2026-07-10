"""Qwen3-Reranker-0.6B wrapper using OpenVINO backend.

Scores (query, document) relevance by generating yes/no logits.
"""

import os
import logging
import numpy as np
from typing import List, Dict, Optional

logger = logging.getLogger("rag.reranker")

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_MODELS_DIR = os.path.abspath(os.path.join(_BACKEND_DIR, "..", "models"))

SYSTEM_PROMPT = (
    "Judge whether the Document meets the requirements based on the "
    "Query and the Instruct provided. Note that the answer can only "
    'be "yes" or "no".'
)


class RAGReranker:
    """Rerank document chunks using Qwen3-Reranker-0.6B via OpenVINO."""

    MODEL_DIR = os.path.join(_MODELS_DIR, "qwen3_reranker_0_6b", "openvino_fp16")

    def __init__(self):
        self.core = None
        self.model = None
        self.compiled = None
        self.tokenizer = None
        self.yes_token_id = None
        self.no_token_id = None
        self._ready = False

    def _ensure_model(self):
        if self._ready:
            return
        import openvino

        model_xml = os.path.join(self.MODEL_DIR, "openvino_model.xml")
        if not os.path.exists(model_xml):
            raise FileNotFoundError(
                "Reranker model not found at " + model_xml + ". "
                "Please download Qwen3-Reranker-0.6B via the Model Manager."
            )
        self.core = openvino.Core()
        logger.info("[RERANKER] Loading model from %s", self.MODEL_DIR)
        self.model = self.core.read_model(model_xml)
        self.compiled = self.core.compile_model(self.model, "CPU")
        tokenizer_path = os.path.join(self.MODEL_DIR, "tokenizer.json")
        if os.path.exists(tokenizer_path):
            from tokenizers import Tokenizer
            self.tokenizer = Tokenizer.from_file(tokenizer_path)
        else:
            from transformers import AutoTokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.MODEL_DIR, trust_remote_code=True
            )
        self.yes_token_id = self._encode_token("yes")
        self.no_token_id = self._encode_token("no")
        self._ready = True
        logger.info("[RERANKER] Ready yes_id=%s no_id=%s", self.yes_token_id, self.no_token_id)

    def _encode_token(self, text):
        enc = self.tokenizer.encode(text)
        if hasattr(enc, "ids"):
            return enc.ids[0]
        if isinstance(enc, (list, tuple)):
            return enc[0]
        return self.tokenizer.encode(text, add_special_tokens=False)[0]

    def _tokenize(self, text):
        if hasattr(self.tokenizer, "encode_batch"):
            enc = self.tokenizer.encode(text)
            ids = enc.ids if hasattr(enc, "ids") else enc
            return np.array([ids], dtype=np.int64), np.array([[1] * len(ids)], dtype=np.int64)
        else:
            out = self.tokenizer(text, return_tensors="np")
            return out["input_ids"], out["attention_mask"]

    def _score(self, query, document, instruction):
        """Score relevance of a document to a query. Returns probability of yes."""
        user_content = "Query: " + query + "\nDocument: " + document + "\nInstruct: " + instruction
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]
        if hasattr(self.tokenizer, "apply_chat_template"):
            input_text = self.tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
        else:
            input_text = ("<|im_start|>system\n" + SYSTEM_PROMPT
                + "\n<|im_start|>user\nQuery: " + query
                + "\nDocument: " + document
                + "\nInstruct: " + instruction
                + "\n<|im_start|>assistant\n")

        input_ids, attention_mask = self._tokenize(input_text)

        # Run inference
        import openvino
        ov_tensor_input = openvino.Tensor(input_ids)
        ov_tensor_mask = openvino.Tensor(attention_mask)
        outputs = self.compiled({"input_ids": ov_tensor_input, "attention_mask": ov_tensor_mask})

        # Get logits for the last token
        logits = outputs[0]  # (1, seq_len, vocab_size)
        last_logits = logits[0, -1, :]  # (vocab_size,)

        # Softmax over yes/no token logits
        yes_logit = float(last_logits[self.yes_token_id])
        no_logit = float(last_logits[self.no_token_id])
        max_l = max(yes_logit, no_logit)
        exp_yes = np.exp(yes_logit - max_l)
        exp_no = np.exp(no_logit - max_l)
        prob_yes = exp_yes / (exp_yes + exp_no)
        return float(prob_yes)

    def rerank(self, query, candidates, instruction="Relevant passages that answer the query", top_k=4):
        self._ensure_model()
        scored = []
        for chunk in candidates:
            score = self._score(query, chunk["text"], instruction)
            entry = chunk.copy()
            entry["relevance_score"] = round(score, 4)
            scored.append(entry)
        scored.sort(key=lambda x: -x["relevance_score"])
        return scored[:top_k]
