"""Tests for app.maintenance — cleanup logic."""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from types import ModuleType
from unittest.mock import patch, MagicMock

import pytest


def test_prune_dir_removes_old_files(tmp_path):
    from app.maintenance import _prune_dir

    old_file = tmp_path / "old.wav"
    old_file.write_text("data")
    os.utime(old_file, (time.time() - 172800, time.time() - 172800))

    fresh_file = tmp_path / "fresh.wav"
    fresh_file.write_text("data")

    removed, freed = _prune_dir(str(tmp_path), max_age_s=86400)
    assert removed == 1
    assert not old_file.exists()
    assert fresh_file.exists()


def test_prune_dir_handles_missing_dir():
    from app.maintenance import _prune_dir
    removed, freed = _prune_dir("/nonexistent/path", max_age_s=86400)
    assert removed == 0
    assert freed == 0


def test_prune_dir_empty_dir(tmp_path):
    from app.maintenance import _prune_dir
    removed, freed = _prune_dir(str(tmp_path), max_age_s=86400)
    assert removed == 0


@patch("app.maintenance._trim_working_set")
@patch("app.memory.db.log_audit")
def test_run_cleanup_returns_report(_mock_audit, _mock_trim):
    """run_cleanup should return a report dict without crashing."""
    # Inject a fake torch module BEFORE run_cleanup tries to import it
    # to prevent the real torch import which crashes via MKL abort on this system.
    fake_torch = MagicMock()
    fake_torch.xpu.is_available.return_value = False
    old_torch = sys.modules.get("torch")
    sys.modules["torch"] = fake_torch
    try:
        from app.maintenance import run_cleanup
        report = run_cleanup("test")
        assert "gc_objects" in report
        assert "tts_files_removed" in report
        assert "bytes_freed" in report
        assert report["trigger"] == "test"
    finally:
        if old_torch is not None:
            sys.modules["torch"] = old_torch
        else:
            sys.modules.pop("torch", None)
