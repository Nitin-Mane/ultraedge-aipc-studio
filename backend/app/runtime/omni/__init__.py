"""Omni runtime package with lazy loading of the heavyweight OpenVINO helper."""

from __future__ import annotations

from typing import Any

__all__ = ["OVQwen2_5OmniModel"]


def __getattr__(name: str) -> Any:
    if name == "OVQwen2_5OmniModel":
        from app.runtime.omni.qwen2_5_omni_helper import OVQwen2_5OmniModel

        return OVQwen2_5OmniModel
    raise AttributeError(name)
