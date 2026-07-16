"""Smoke tests — hit every major endpoint with the FastAPI TestClient.

These verify that routes are registered, return correct status codes, and
produce sensible JSON shapes.  No real models are loaded; simulation mode
is used where applicable.
"""

from __future__ import annotations


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "version" in body


def test_system_profile(client):
    r = client.get("/api/system/profile")
    assert r.status_code == 200
    body = r.json()
    assert "cpu" in body
    assert "ram_total_gb" in body


def test_audit_logs(client):
    r = client.get("/api/audit-logs")
    assert r.status_code == 200
    assert "logs" in r.json()


def test_maintenance_status(client):
    r = client.get("/api/maintenance/status")
    assert r.status_code == 200


def test_maintenance_cleanup(client):
    r = client.post("/api/maintenance/cleanup")
    assert r.status_code == 200
    body = r.json()
    assert "gc_objects" in body


def test_models_catalog(client):
    r = client.get("/api/models/catalog")
    assert r.status_code == 200
    body = r.json()
    assert "models" in body
    assert isinstance(body["models"], list)


def test_settings_get(client):
    r = client.get("/api/settings")
    assert r.status_code == 200


def test_runtime_active_when_no_model(client):
    r = client.get("/api/runtime/active")
    assert r.status_code == 200
    body = r.json()
    assert body.get("model_id") is None or body.get("model_id") == ""


def test_runtime_logs(client):
    r = client.get("/api/runtime/logs")
    assert r.status_code == 200


def test_benchmarks_results_empty(client):
    r = client.get("/api/benchmarks/results")
    assert r.status_code == 200
    body = r.json()
    assert body["results"] == []
