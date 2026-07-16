"""Centralised configuration for UltraEdge AIPC Studio backend.

All hard-coded paths, ports, and feature flags live here.  Values are read
from environment variables (or a `.env` file) with sensible defaults that
match the current project layout.
"""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings


def _project_root() -> Path:
    """Backend/app -> project root (two levels up)."""
    return Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # ── Paths ──────────────────────────────────────────────────────────────
    PROJECT_ROOT: Path = _project_root()
    MODELS_DIR: Path = _project_root() / "models"
    APP_DATA_DIR: Path = _project_root() / "backend" / "app_data"
    OV_CACHE_DIR: Path = _project_root() / "backend" / "app_data" / "ov_cache"

    # ── Server ─────────────────────────────────────────────────────────────
    # Local-only by default: several developer endpoints can compile/run code.
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    RELOAD: bool = True  # set False for release builds

    # ── Feature flags ──────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    # These endpoints intentionally execute user-provided code and access files.
    # Keep disabled unless the operator accepts that local security boundary.
    ENABLE_CODE_EXECUTION: bool = False

    # Omni real-time profile. Euler reduces token2wav DIT calls by ~75% versus
    # RK4 for the same schedule; RK4 remains available through the environment.
    TOKEN2WAV_SOLVER: str = "euler"
    TOKEN2WAV_ODE_STEPS: int = 10
    TOKEN2WAV_FAST_ODE_STEPS: int = 8
    OMNI_FAST_MAX_NEW_TOKENS: int = 96
    TTS_BALANCED_MAX_THINKER_TOKENS: int = 256
    TTS_FAST_MAX_TALKER_TOKENS: int = 768
    TTS_BALANCED_MAX_TALKER_TOKENS: int = 1536

    model_config = {
        "env_prefix": "ULTRAEEDGE_",
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


# Module-level singleton — import `settings` from anywhere.
settings = Settings()

# Ensure critical directories exist at import time.
settings.OV_CACHE_DIR.mkdir(parents=True, exist_ok=True)
settings.APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
(settings.APP_DATA_DIR / "tts").mkdir(parents=True, exist_ok=True)
