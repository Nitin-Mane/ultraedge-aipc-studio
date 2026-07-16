"""Loader for Qwen2.5-Omni multimodal models."""

from __future__ import annotations

import logging
from typing import Any

from app.config import settings
from app.runtime.device_policy import resolve_omni_devices

logger = logging.getLogger("omni_loader")


class OmniLoader:
    family = "omni"

    def can_load(self, model_id: str, model_dir: str) -> bool:
        return "omni" in model_id.lower()

    def load(
        self,
        model_dir: str,
        device: str,
        has_gpu: bool,
        has_npu: bool,
        log_fn=None,
    ) -> dict[str, Any]:
        _log = log_fn or logger.info

        from transformers import AutoProcessor

        from app.runtime.omni import OVQwen2_5OmniModel

        _log("[RUNTIME] Initializing processor...")
        processor = AutoProcessor.from_pretrained(model_dir, trust_remote_code=False)

        devs = resolve_omni_devices(device, log_fn)
        _log("[RUNTIME] Compiling OpenVINO sub-models (this can take several seconds to optimize on target devices)...")

        pipeline = None
        try:
            pipeline = OVQwen2_5OmniModel(
                model_dir,
                devs["thinker"],
                devs["audio"],
                devs["dit"],
                token2wav_solver=settings.TOKEN2WAV_SOLVER,
                token2wav_steps=settings.TOKEN2WAV_ODE_STEPS,
            )
        except Exception as sub_e:
            import traceback
            tb = traceback.format_exc()
            _log(f"[WARNING] Compilation failed on target devices: {sub_e}")
            _log(f"[WARNING] Traceback: {tb.splitlines()[-3:]}")
            try:
                _log("[RUNTIME] Retrying with CPU fallback...")
                pipeline = OVQwen2_5OmniModel(
                    model_dir,
                    "CPU",
                    "CPU",
                    "CPU",
                    token2wav_solver=settings.TOKEN2WAV_SOLVER,
                    token2wav_steps=settings.TOKEN2WAV_ODE_STEPS,
                )
                _log("[SYSTEM] CPU fallback compilation successful!")
            except Exception as cpu_e:
                _log(f"[ERROR] CPU fallback also failed: {cpu_e}")
                pipeline = None

        return {"pipeline": pipeline, "processor": processor, "type": "omni"}
