"""Repository layer — all database access goes through here.

No SQL lives in route handlers anymore.  Each function owns one statement or
logical operation and returns plain dicts/lists (no sqlite.Row leaking into
the API layer).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from app.memory.db import get_db_connection

# ── Chat Sessions ───────────────────────────────────────────────────────────

def ensure_session(session_id: str, message: str, feature_type: str, model_id: str) -> None:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM chat_sessions WHERE id = ?", (session_id,))
    if not cur.fetchone():
        cur.execute(
            "INSERT INTO chat_sessions (id, title, feature_type, model_id, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (session_id, message[:30], feature_type, model_id,
             datetime.now().isoformat(), datetime.now().isoformat()),
        )
    conn.commit()
    conn.close()


def get_chat_history(session_id: str, limit: int = 6) -> list[dict[str, str]]:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?",
        (session_id, limit),
    )
    rows = reversed(cur.fetchall())
    conn.close()
    return [{"role": r, "content": c} for r, c in rows]


def save_chat_message(
    session_id: str,
    role: str,
    content: str,
    model_id: str | None = None,
) -> str:
    msg_id = f"msg_{__import__('os').urandom(4).hex()}_{int(datetime.now().timestamp())}"
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO chat_messages (id, session_id, role, content, model_id, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (msg_id, session_id, role, content, model_id, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()
    return msg_id


# ── Chat History (session management) ─────────────────────────────────────

def list_sessions(feature_type: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
    """Return all chat sessions ordered by most recently updated."""
    conn = get_db_connection()
    cur = conn.cursor()
    if feature_type:
        cur.execute(
            "SELECT id, title, feature_type, model_id, created_at, updated_at "
            "FROM chat_sessions WHERE feature_type = ? ORDER BY updated_at DESC LIMIT ?",
            (feature_type, limit),
        )
    else:
        cur.execute(
            "SELECT id, title, feature_type, model_id, created_at, updated_at "
            "FROM chat_sessions ORDER BY updated_at DESC LIMIT ?",
            (limit,),
        )
    rows = cur.fetchall()
    conn.close()
    return [
        {
            "id": r["id"], "title": r["title"], "feature_type": r["feature_type"],
            "model_id": r["model_id"], "created_at": r["created_at"], "updated_at": r["updated_at"],
        }
        for r in rows
    ]


def get_session_messages(session_id: str) -> list[dict[str, Any]]:
    """Return all messages for a session in chronological order."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, role, content, model_id, created_at FROM chat_messages "
        "WHERE session_id = ? ORDER BY created_at ASC",
        (session_id,),
    )
    rows = cur.fetchall()
    conn.close()
    return [
        {"id": r["id"], "role": r["role"], "content": r["content"],
         "model_id": r["model_id"], "created_at": r["created_at"]}
        for r in rows
    ]


def update_session_title(session_id: str, title: str) -> bool:
    """Update a session's title. Returns True if the session existed."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM chat_sessions WHERE id = ?", (session_id,))
    if not cur.fetchone():
        conn.close()
        return False
    cur.execute(
        "UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?",
        (title, datetime.now().isoformat(), session_id),
    )
    conn.commit()
    conn.close()
    return True


def delete_session(session_id: str) -> bool:
    """Delete a session and its messages (CASCADE). Returns True if deleted."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM chat_sessions WHERE id = ?", (session_id,))
    if not cur.fetchone():
        conn.close()
        return False
    cur.execute("DELETE FROM chat_messages WHERE session_id = ?", (session_id,))
    cur.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()
    return True


def delete_all_sessions(feature_type: str | None = None) -> int:
    """Delete all sessions (and messages via CASCADE). Returns count deleted."""
    conn = get_db_connection()
    cur = conn.cursor()
    if feature_type:
        cur.execute("DELETE FROM chat_sessions WHERE feature_type = ?", (feature_type,))
    else:
        cur.execute("DELETE FROM chat_sessions")
    count = cur.rowcount
    conn.commit()
    conn.close()
    return count


def update_message(message_id: str, content: str) -> bool:
    """Update a single message's content. Returns True if the message existed."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM chat_messages WHERE id = ?", (message_id,))
    if not cur.fetchone():
        conn.close()
        return False
    cur.execute("UPDATE chat_messages SET content = ? WHERE id = ?", (content, message_id))
    conn.commit()
    conn.close()
    return True


# ── Model Registry ──────────────────────────────────────────────────────────

def update_model_status(model_id: str, status: str) -> bool:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM model_registry WHERE id = ?", (model_id,))
    if not cur.fetchone():
        conn.close()
        return False
    cur.execute(
        "UPDATE model_registry SET status = ?, updated_at = ? WHERE id = ?",
        (status, datetime.now().isoformat(), model_id),
    )
    conn.commit()
    conn.close()
    return True


# ── Model Jobs ──────────────────────────────────────────────────────────────

def get_model_job(model_id: str) -> dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, model_id, job_type, status, progress, message, log_path, started_at, finished_at "
        "FROM model_jobs WHERE model_id = ? ORDER BY started_at DESC LIMIT 1",
        (model_id,),
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        return {"job_id": None, "status": "idle"}
    return {
        "job_id": row["id"],
        "model_id": row["model_id"],
        "status": row["status"],
        "progress": row["progress"],
        "message": row["message"],
        "log_path": row["log_path"],
        "started_at": row["started_at"],
        "finished_at": row["finished_at"],
    }


# ── Benchmarks ──────────────────────────────────────────────────────────────

def get_benchmark_results() -> list[dict[str, Any]]:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT b.*, m.name as model_name "
        "FROM benchmark_results b "
        "JOIN model_registry m ON b.model_id = m.id "
        "ORDER BY created_at DESC"
    )
    rows = cur.fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "model_id": r["model_id"],
            "model_name": r["model_name"],
            "device": r["device"],
            "precision": r["precision"],
            "first_token_latency_ms": r["first_token_latency_ms"],
            "tokens_per_second": r["tokens_per_second"],
            "model_load_time_ms": r["model_load_time_ms"],
            "ram_used_mb": r["ram_used_mb"],
            "gpu_used_mb": r["gpu_used_mb"],
            "npu_status": r["npu_status"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]


# ── Audit Logs ──────────────────────────────────────────────────────────────

def get_audit_logs(limit: int = 100) -> list[dict[str, Any]]:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cur.fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "event_type": r["event_type"],
            "actor": r["actor"],
            "details": r["details"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]


# ── Security Reset ──────────────────────────────────────────────────────────

def wipe_user_data() -> None:
    """Delete all user-generated data (chats, memories, benchmarks, etc.)."""
    conn = get_db_connection()
    cur = conn.cursor()
    for table in ("chat_messages", "chat_sessions", "memory_items",
                   "generated_outputs", "benchmark_results", "tool_calls"):
        cur.execute(f"DELETE FROM {table}")
    conn.commit()
    conn.close()


# ── Startup Maintenance ─────────────────────────────────────────────────────

def reset_stuck_jobs() -> None:
    """Mark any jobs that were running when the server last stopped."""
    conn = get_db_connection()
    cur = conn.cursor()
    stuck = ("downloading", "converting", "quantizing", "benchmarking",
             "verifying", "queued", "running")
    cur.execute(
        "UPDATE model_registry SET status = 'not-installed', updated_at = ? "
        "WHERE status IN ({})".format(",".join("?" * len(stuck))),
        (datetime.now().isoformat(), *stuck),
    )
    cur.execute(
        "UPDATE model_jobs SET status = 'cancelled', message = 'Cancelled on server restart', "
        "finished_at = ? WHERE status = 'running'",
        (datetime.now().isoformat(),),
    )
    conn.commit()
    conn.close()
