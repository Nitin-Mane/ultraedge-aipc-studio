import os
import sqlite3
from datetime import datetime

from app.config import settings

DATABASE_DIR = str(settings.APP_DATA_DIR)
DATABASE_PATH = str(settings.APP_DATA_DIR / "ultraedge_aipc_studio.db")

def get_db_connection():
    os.makedirs(DATABASE_DIR, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. app_settings
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)
    
    # 2. chat_sessions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        title TEXT,
        feature_type TEXT NOT NULL,
        model_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)
    
    # 3. chat_messages
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        model_id TEXT,
        token_count INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );
    """)
    
    # 4. memory_items
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS memory_items (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT NOT NULL,
        memory_type TEXT NOT NULL,
        importance_score REAL DEFAULT 0,
        source_session_id TEXT,
        encrypted INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)
    
    # 5. generated_outputs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS generated_outputs (
        id TEXT PRIMARY KEY,
        output_type TEXT NOT NULL,
        title TEXT,
        path TEXT,
        content_preview TEXT,
        model_id TEXT,
        feature_type TEXT,
        created_at TEXT NOT NULL
    );
    """)
    
    # 6. model_registry
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS model_registry (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        family TEXT NOT NULL,
        feature_type TEXT NOT NULL,
        parameter_size TEXT,
        license TEXT,
        source_url TEXT,
        original_path TEXT,
        openvino_path TEXT,
        precision TEXT,
        status TEXT NOT NULL,
        recommended_device TEXT,
        ram_required_gb REAL,
        precision_options TEXT DEFAULT 'FP16,INT8,INT4',
        checksum TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)
    
    # Migration: add precision_options column if missing
    try:
        cursor.execute("SELECT precision_options FROM model_registry LIMIT 1")
    except:
        cursor.execute("ALTER TABLE model_registry ADD COLUMN precision_options TEXT DEFAULT 'FP16,INT8,INT4'")
    
    # Migration: add npu_status column if missing
    try:
        cursor.execute("SELECT npu_status FROM model_registry LIMIT 1")
    except:
        cursor.execute("ALTER TABLE model_registry ADD COLUMN npu_status TEXT DEFAULT 'unknown'")
    
    # 7. model_jobs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS model_jobs (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        job_type TEXT NOT NULL,
        status TEXT NOT NULL,
        progress REAL DEFAULT 0,
        message TEXT,
        log_path TEXT,
        started_at TEXT,
        finished_at TEXT,
        FOREIGN KEY(model_id) REFERENCES model_registry(id)
    );
    """)
    
    # 8. benchmark_results
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS benchmark_results (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        device TEXT NOT NULL,
        precision TEXT,
        first_token_latency_ms REAL,
        tokens_per_second REAL,
        model_load_time_ms REAL,
        ram_used_mb REAL,
        gpu_used_mb REAL,
        npu_status TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(model_id) REFERENCES model_registry(id)
    );
    """)
    
    # 9. tool_calls
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tool_calls (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        tool_name TEXT NOT NULL,
        input_summary TEXT,
        output_summary TEXT,
        status TEXT NOT NULL,
        risk_level TEXT,
        created_at TEXT NOT NULL
    );
    """)
    
    # 12. audit_logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        actor TEXT,
        details TEXT,
        created_at TEXT NOT NULL
    );
    """)
    
    # Initialize default settings
    default_settings = {
        "user_name": "",
        "user_role": "",
        "model_directory": os.path.abspath(os.path.join(DATABASE_DIR, "..", "models")),
        "data_directory": DATABASE_DIR,
        "default_hardware_mode": "auto",
        "enterprise_mode": "false",
        "privacy_mode": "true",
        "logging_level": "info",
        "developer_mode": "false"
    }
    
    for key, value in default_settings.items():
        cursor.execute("SELECT 1 FROM app_settings WHERE key = ?", (key,))
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)",
                (key, value, datetime.now().isoformat())
            )
            
    conn.commit()
    conn.close()

def log_audit(event_type: str, details: str, actor: str = "system"):
    conn = get_db_connection()
    cursor = conn.cursor()
    log_id = f"audit_{os.urandom(4).hex()}_{int(datetime.now().timestamp())}"
    cursor.execute(
        "INSERT INTO audit_logs (id, event_type, actor, details, created_at) VALUES (?, ?, ?, ?, ?)",
        (log_id, event_type, actor, details, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def get_setting(key: str, default: str = "") -> str:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else default

def set_setting(key: str, value: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)",
        (key, str(value), datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    log_audit("setting_change", f"Setting {key} updated to {value}")

# Run DB initialization when importing
init_db()
