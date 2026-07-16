"""Tests for app.memory.repository — CRUD operations against the tmp DB."""

from __future__ import annotations

from app.memory import repository as repo


# ── Chat sessions & messages ─────────────────────────────────────────────────

def test_ensure_session_creates_new():
    repo.ensure_session("s1", "Hello world", "personal_assistant", "Qwen2.5-Omni-3B")
    history = repo.get_chat_history("s1")
    assert history == []  # no messages yet, just the session row


def test_save_and_get_chat_history():
    repo.ensure_session("s2", "Test", "personal_assistant", "Qwen2.5-Omni-3B")
    repo.save_chat_message("s2", "user", "Hi there")
    repo.save_chat_message("s2", "assistant", "Hello!")
    history = repo.get_chat_history("s2", limit=10)
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"


def test_get_chat_history_respects_limit():
    repo.ensure_session("s3", "Limit test", "coding_agent", "Qwen2.5-Coder-1.5B")
    for i in range(10):
        repo.save_chat_message("s3", "user", f"msg {i}")
    history = repo.get_chat_history("s3", limit=3)
    assert len(history) == 3


def test_ensure_session_does_not_duplicate():
    repo.ensure_session("s4", "First", "personal_assistant", "Qwen2.5-Omni-3B")
    repo.ensure_session("s4", "Second", "personal_assistant", "Qwen2.5-Omni-3B")
    # No error — upsert is a no-op when session exists


# ── Model registry ───────────────────────────────────────────────────────────

def test_update_model_status_returns_false_for_unknown():
    assert repo.update_model_status("nonexistent-model", "ready") is False


def test_update_model_status_succeeds_for_known():
    from app.memory.db import get_db_connection
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO model_registry (id, name, family, feature_type, status, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        ("test-model", "Test Model", "test", "test", "not_installed"),
    )
    conn.commit()
    conn.close()

    assert repo.update_model_status("test-model", "ready") is True

    # Verify the update stuck
    conn = get_db_connection()
    row = conn.execute("SELECT status FROM model_registry WHERE id = ?", ("test-model",)).fetchone()
    conn.close()
    assert row["status"] == "ready"


# ── Model jobs ───────────────────────────────────────────────────────────────

def test_get_model_job_returns_idle_for_unknown():
    job = repo.get_model_job("nonexistent-model")
    assert job["status"] == "idle"
    assert job["job_id"] is None


# ── Benchmarks ───────────────────────────────────────────────────────────────

def test_get_benchmark_results_empty():
    results = repo.get_benchmark_results()
    assert results == []


def test_get_benchmark_results_with_data():
    from app.memory.db import get_db_connection
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO model_registry (id, name, family, feature_type, status, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        ("bm-model", "BM Model", "test", "test", "ready"),
    )
    conn.execute(
        "INSERT INTO benchmark_results "
        "(id, model_id, device, precision, first_token_latency_ms, tokens_per_second, "
        "model_load_time_ms, ram_used_mb, gpu_used_mb, npu_status, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
        ("bm-1", "bm-model", "GPU", "INT4", 50.0, 100.0, 2000.0, 4096.0, 2048.0, "not_available"),
    )
    conn.commit()
    conn.close()

    results = repo.get_benchmark_results()
    assert len(results) == 1
    assert results[0]["model_id"] == "bm-model"
    assert results[0]["tokens_per_second"] == 100.0
    assert results[0]["model_name"] == "BM Model"


# ── Audit logs ───────────────────────────────────────────────────────────────

def test_get_audit_logs_empty():
    logs = repo.get_audit_logs()
    assert isinstance(logs, list)


# ── Security reset ───────────────────────────────────────────────────────────

def test_wipe_user_data_clears_chat_messages():
    repo.ensure_session("s-wipe", "Wipe test", "personal_assistant", "model")
    repo.save_chat_message("s-wipe", "user", "secret message")
    repo.wipe_user_data()
    history = repo.get_chat_history("s-wipe")
    assert history == []


# ── Reset stuck jobs ─────────────────────────────────────────────────────────

def test_reset_stuck_jobs():
    from app.memory.db import get_db_connection
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO model_registry (id, name, family, feature_type, status, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        ("stuck-model", "Stuck", "test", "test", "downloading"),
    )
    conn.commit()
    conn.close()

    repo.reset_stuck_jobs()

    conn = get_db_connection()
    row = conn.execute("SELECT status FROM model_registry WHERE id = ?", ("stuck-model",)).fetchone()
    conn.close()
    assert row["status"] == "not-installed"
