"""Device detection and AUTO-resolution policy for model loading.

Single responsibility: given a requested device string ("AUTO", "CPU", "GPU",
"NPU"), resolve it to the best available hardware and provide per-component
device mappings for complex pipelines (e.g. Omni thinker/audio/DiT).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger("device_policy")


@dataclass
class HardwareCapabilities:
    has_gpu: bool = False
    has_npu: bool = False
    best_device: str = "CPU"


def detect_hardware() -> HardwareCapabilities:
    """Scan the system for available accelerator devices."""
    caps = HardwareCapabilities()
    try:
        from app.hardware.scanner import scan_hardware
        hw = scan_hardware()
        supported = hw.get("supported_devices", ["CPU"])
        caps.has_gpu = "GPU" in supported
        caps.has_npu = "NPU" in supported
        if caps.has_gpu:
            caps.best_device = "GPU"
        elif caps.has_npu:
            caps.best_device = "NPU"
    except Exception as ex:
        logger.warning(f"Hardware scan failed: {ex}")
    return caps


def resolve_device(requested: str, log_fn=None) -> str:
    """Resolve a device string (may be "AUTO") to a concrete device."""
    _log = log_fn or logger.info
    caps = detect_hardware()
    if requested == "AUTO":
        resolved = caps.best_device
        _log(f"[POLICY] AUTO resolved to: {resolved}")
        return resolved
    return requested


def resolve_omni_devices(requested: str, log_fn=None) -> dict:
    """Return per-component device mapping for the Omni pipeline.

    Omni has three sub-models:
    - Thinker (LLM): GPU preferred
    - Audio ASR encoder: GPU preferred
    - token2wav DIT/BigVGAN vocoder: CPU only (GPU f32 yields silence)
    """
    _log = log_fn or logger.info
    caps = detect_hardware()
    resolved = resolve_device(requested, log_fn)
    has_gpu = caps.has_gpu or resolved == "GPU"

    thinker = "GPU" if has_gpu else "CPU"
    audio = "GPU" if has_gpu else "CPU"
    dit = "CPU"  # always CPU

    _log(f"[DEVICE] Omni mapping — Thinker: {thinker}, Audio ASR: {audio}, token2wav DiT: {dit}")
    return {"thinker": thinker, "audio": audio, "dit": dit}
