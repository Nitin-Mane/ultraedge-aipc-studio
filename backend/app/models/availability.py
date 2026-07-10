"""Disk availability resolution for catalog models.

Single responsibility: answer "is this model's OpenVINO artifact on disk, and
where?" for the preparation flow of 10_OPENVINO_MODEL_PREPARATION.md — a model
is READY only when converted artifacts exist locally; otherwise it stays
NOT_INSTALLED and is not offered to the user.

Extension points are data, not code: add folders to SCAN_ROOTS or id→folder
mappings to ALIASES.
"""

import os
from typing import Dict, List, Optional

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

# Roots searched in order; first hit wins.
SCAN_ROOTS: List[str] = [
    os.path.join(_PROJECT_ROOT, "models"),
    os.path.join(_PROJECT_ROOT, "backend", "models"),
]

# Registry ids whose on-disk folder uses a different name.
ALIASES: Dict[str, List[str]] = {
    "qwen3_tts_0_6b": ["Qwen3-TTS-CustomVoice-0.6B-OV"],
    "qwen3_reranker_0_6b": ["Qwen3-Reranker-0.6B"],
}


def _has_openvino_artifacts(model_dir: str) -> bool:
    """True if the folder holds converted OpenVINO IR (.xml) at top level,
    in the Omni thinker layout, or in a one-level precision subfolder
    (e.g. openvino_fp16/, FP16/)."""
    if not os.path.isdir(model_dir):
        return False
    if os.path.exists(os.path.join(model_dir, "thinker", "openvino_thinker_language_model.xml")):
        return True
    try:
        entries = os.listdir(model_dir)
    except OSError:
        return False
    if any(e.endswith(".xml") for e in entries):
        return True
    for e in entries:
        sub = os.path.join(model_dir, e)
        try:
            if os.path.isdir(sub) and any(f.endswith(".xml") for f in os.listdir(sub)):
                return True
        except OSError:
            continue
    return False


def resolve_model_dir(model_id: str) -> Optional[str]:
    """Return the directory holding this model's OpenVINO artifacts, or None."""
    for folder in [model_id, *ALIASES.get(model_id, [])]:
        for root in SCAN_ROOTS:
            candidate = os.path.join(root, folder)
            if _has_openvino_artifacts(candidate):
                return candidate
    return None


def is_available(model_id: str) -> bool:
    return resolve_model_dir(model_id) is not None
