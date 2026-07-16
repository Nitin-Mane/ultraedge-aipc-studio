"""Shared fixtures for backend tests.

Uses a temporary SQLite database so tests never touch production data.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

# Ensure the backend/app package is importable when running from backend/
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# Pre-inject a fake torch module to prevent the real torch import from crashing
# via MKL abort on this Windows system.  Tests that need torch behavior should
# replace this with a more specific mock.
_fake_torch = MagicMock()
_fake_torch.xpu.is_available.return_value = False
sys.modules.setdefault("torch", _fake_torch)


@pytest.fixture(autouse=True)
def _isolated_db(tmp_path: Path):
    """Point all DB operations at a throwaway SQLite file for every test."""
    db_path = tmp_path / "test.db"
    with patch("app.memory.db.DATABASE_PATH", str(db_path)), \
         patch("app.memory.db.DATABASE_DIR", str(tmp_path)), \
         patch("app.config.settings") as mock_settings:
        mock_settings.APP_DATA_DIR = tmp_path
        mock_settings.MODELS_DIR = tmp_path / "models"
        mock_settings.OV_CACHE_DIR = tmp_path / "ov_cache"
        mock_settings.HOST = "127.0.0.1"
        mock_settings.PORT = 8000
        mock_settings.CORS_ORIGINS = ["http://localhost:3000"]
        mock_settings.RELOAD = False
        mock_settings.LOG_LEVEL = "DEBUG"

        from app.memory.db import init_db
        init_db()
        yield db_path


@pytest.fixture(autouse=True)
def _mock_hardware_scanner():
    """Prevent real hardware scanning (PowerShell + torch/numpy) during tests."""
    fake_hw = {
        "os": "Test OS",
        "cpu": "Intel Core Ultra 7 155H",
        "gpu": "Test GPU",
        "npu": "not_detected",
        "ram_total_gb": 16,
        "ram_available_gb": 8,
        "storage_free_gb": 100,
        "openvino_status": "not_available",
        "supported_devices": ["CPU"],
    }
    with (
        patch("app.hardware.scanner.scan_hardware", return_value=fake_hw),
        patch(
            "app.hardware.suitability.detect_cpu_name",
            return_value="Intel Core Ultra 7 155H",
        ),
    ):
        yield


@pytest.fixture(autouse=True)
def _stop_maintenance_scheduler():
    """Prevent the maintenance background thread from starting in tests."""
    with patch("app.maintenance.start_scheduler"):
        yield


@pytest.fixture()
def client():
    """FastAPI TestClient that hits the temporary DB (no real model loading)."""
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
