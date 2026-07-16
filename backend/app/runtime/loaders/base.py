"""Model loader protocol and registry.

Adding a new model family means writing a loader that satisfies
``ModelLoader`` and calling ``register_loader`` — no changes to
RuntimeManager required (Open/Closed principle).
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class ModelLoader(Protocol):
    """Interface every model loader must satisfy."""

    family: str  # e.g. "omni", "text", "vision"

    def can_load(self, model_id: str, model_dir: str) -> bool:
        """Return True if this loader handles *model_id*."""
        ...

    def load(
        self,
        model_dir: str,
        device: str,
        has_gpu: bool,
        has_npu: bool,
        log_fn,
    ) -> dict[str, Any]:
        """Load the model and return ``{"pipeline": ..., "processor": ..., "type": ...}``."""
        ...


# ── Registry ────────────────────────────────────────────────────────────────

_LOADERS: list[ModelLoader] = []


def register_loader(loader: ModelLoader) -> None:
    _LOADERS.append(loader)


def get_loader(model_id: str, model_dir: str = "") -> ModelLoader | None:
    """Return the first loader whose ``can_load`` matches, or *None*."""
    for loader in _LOADERS:
        if model_dir:
            if loader.can_load(model_id, model_dir):
                return loader
        elif loader.family in model_id.lower():
            return loader
    return None


def get_all_loaders() -> list[ModelLoader]:
    return list(_LOADERS)
