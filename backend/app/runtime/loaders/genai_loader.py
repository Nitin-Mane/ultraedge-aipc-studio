"""Loader for standard OpenVINO GenAI pipelines (text, vision)."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("genai_loader")


class TextLoader:
    family = "text"

    def can_load(self, model_id: str, model_dir: str) -> bool:
        mid = model_id.lower()
        return "omni" not in mid and "vl" not in mid and "vision" not in mid

    def load(
        self,
        model_dir: str,
        device: str,
        has_gpu: bool,
        has_npu: bool,
        log_fn=None,
    ) -> dict[str, Any]:
        _log = log_fn or logger.info
        import openvino_genai

        _log(f"[RUNTIME] Standard LLM model detected. Loading OpenVINO GenAI pipeline on {device}...")
        pipeline = None
        try:
            pipeline = openvino_genai.LLMPipeline(model_dir, device)
        except Exception as sub_e:
            _log(f"[WARNING] Failed to load LLM pipeline on {device}: {sub_e}. Retrying on CPU...")
            pipeline = openvino_genai.LLMPipeline(model_dir, "CPU")
        _log("[SYSTEM] OpenVINO GenAI pipeline loaded successfully!")

        return {"pipeline": pipeline, "processor": None, "type": "text"}


class VisionLoader:
    family = "vl"

    def can_load(self, model_id: str, model_dir: str) -> bool:
        mid = model_id.lower()
        return "vl" in mid or "vision" in mid

    def load(
        self,
        model_dir: str,
        device: str,
        has_gpu: bool,
        has_npu: bool,
        log_fn=None,
    ) -> dict[str, Any]:
        _log = log_fn or logger.info
        import openvino_genai

        _log(f"[RUNTIME] Vision-Language model detected. Loading OpenVINO VLP pipeline on {device}...")
        pipeline = None
        try:
            pipeline = openvino_genai.VLPPipeline(model_dir, device)
        except Exception as sub_e:
            _log(f"[WARNING] Failed to load VL pipeline on {device}: {sub_e}. Retrying on CPU...")
            pipeline = openvino_genai.VLPPipeline(model_dir, "CPU")
        _log("[SYSTEM] OpenVINO GenAI VLP pipeline loaded successfully!")

        return {"pipeline": pipeline, "processor": None, "type": "vision"}
