"""Tests for app.config — Settings class reads defaults correctly."""

from __future__ import annotations

import os
from pathlib import Path

from app.config import _project_root


def test_project_root_is_two_levels_up():
    root = _project_root()
    assert root.is_dir()
    assert (root / "backend").is_dir() or (root / "frontend").is_dir()


def test_settings_defaults():
    from app.config import Settings
    s = Settings()
    assert s.HOST == "127.0.0.1"
    assert s.PORT == 8000
    assert s.RELOAD is True
    assert s.LOG_LEVEL == "INFO"
    assert isinstance(s.CORS_ORIGINS, list)
    assert len(s.CORS_ORIGINS) > 0


def test_settings_paths_are_pathlib():
    from app.config import Settings
    s = Settings()
    assert isinstance(s.PROJECT_ROOT, Path)
    assert isinstance(s.MODELS_DIR, Path)
    assert isinstance(s.APP_DATA_DIR, Path)
    assert isinstance(s.OV_CACHE_DIR, Path)
    assert s.OV_CACHE_DIR.parent == s.APP_DATA_DIR


def test_settings_env_prefix():
    """Settings should respect the ULTRAEEDGE_ env prefix."""
    os.environ["ULTRAEEDGE_PORT"] = "9999"
    try:
        from app.config import Settings
        s = Settings()
        assert s.PORT == 9999
    finally:
        os.environ.pop("ULTRAEEDGE_PORT", None)
