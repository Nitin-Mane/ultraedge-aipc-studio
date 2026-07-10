import os
import json
import logging
import threading
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.memory.db import init_db, log_audit, get_setting, set_setting, get_db_connection
from app.hardware.scanner import scan_hardware
from app.models.catalog import get_registry_models, recommend_models
from app.models.jobs import queue_prepare_job, get_job_status, start_benchmark_job, cancel_prepare_job, stop_prepare_job
from app.runtime.inference import RuntimeManager
from app.rag.rag_service import index_document, get_documents, delete_document, UPLOAD_DIR
from app.api.coding import router as coding_router
from app.api.runtimes import router as runtimes_router
from app.api.workspace import router as workspace_router

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(title="UltraEdge AIPC Studio API", version="0.1.0-alpha")

# Enable CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include coding agent router
app.include_router(coding_router, prefix="/api/coding", tags=["coding"])
app.include_router(workspace_router, tags=["workspace"])

# Include runtimes router
app.include_router(runtimes_router, tags=["runtimes"])

# Request / Response Schemas
class LoadModelRequest(BaseModel):
    model_id: str
    device: str = "CPU"
    precision: str = "INT4"

class RecommendRequest(BaseModel):
    feature_type: str
    profile: str = "balanced"

class ChatRequest(BaseModel):
    session_id: str
    message: str
    feature_type: str = "personal_assistant"
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    max_tokens: Optional[int] = 2048
    system_prompt: Optional[str] = None
    mode: Optional[str] = "thinking"
    effort: Optional[str] = "high"
    internet: Optional[bool] = False
    tools: Optional[List[str]] = None
    attachments: Optional[List[Dict[str, Any]]] = None

class BenchmarkRequest(BaseModel):
    model_id: str
    device: str = "CPU"
    benchmark_type: str = "quick"

class SettingsUpdateRequest(BaseModel):
    model_directory: Optional[str] = None
    data_directory: Optional[str] = None
    default_hardware_mode: Optional[str] = None
    enterprise_mode: Optional[bool] = None
    privacy_mode: Optional[bool] = None
    logging_level: Optional[str] = None
    developer_mode: Optional[bool] = None

class ModelStatusUpdateRequest(BaseModel):
    status: str

@app.on_event("startup")
def on_startup():
    init_db()
    # Clear any stuck downloading/converting states on restart
    conn = get_db_connection()
    cursor = conn.cursor()
    stuck_states = ('downloading', 'converting', 'quantizing', 'benchmarking', 'verifying', 'queued', 'running')
    cursor.execute(
        "UPDATE model_registry SET status = 'not-installed', updated_at = ? WHERE status IN ({})".format(
            ','.join('?' * len(stuck_states))
        ),
        (datetime.now().isoformat(), *stuck_states)
    )
    # Cancel any orphaned running jobs
    cursor.execute(
        "UPDATE model_jobs SET status = 'cancelled', message = 'Cancelled on server restart', finished_at = ? WHERE status = 'running'",
        (datetime.now().isoformat(),)
    )
    conn.commit()
    conn.close()
    log_audit("system_startup", "FastAPI backend server started")
    # Auto-maintenance: cleanup pass now, then hourly (cache prune + memory trim)
    from app.maintenance import start_scheduler
    start_scheduler()
    # Auto-restore the last active model so chat/TTS survive restarts without
    # anyone having to reload manually (the root cause of chord-only TTS).
    last_model = get_setting("active_model")
    if last_model:
        def _restore():
            try:
                logger.info(f"Auto-restoring last active model: {last_model}")
                RuntimeManager.load_model(
                    last_model,
                    get_setting("active_device") or "AUTO",
                    get_setting("active_precision") or "INT4",
                )
            except Exception as e:
                logger.error(f"Model auto-restore failed: {e}")
        threading.Thread(target=_restore, daemon=True).start()

# --- Endpoints ---

@app.post("/api/maintenance/cleanup")
def trigger_cleanup():
    from app.maintenance import run_cleanup
    return run_cleanup("manual")

@app.get("/api/maintenance/status")
def maintenance_status():
    from app.maintenance import last_report
    return {"last_cleanup": last_report or None}

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": "0.1.0-alpha",
        "backend": "running"
    }

@app.get("/api/system/profile")
def get_system_profile():
    try:
        profile = scan_hardware()
        return profile
    except Exception as e:
        logger.error(f"Error scanning hardware: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/models/catalog")
def get_models_catalog():
    try:
        models = get_registry_models()
        return {"models": models}
    except Exception as e:
        logger.error(f"Error fetching model registry: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/models/{model_id}/status")
def update_model_status(model_id: str, req: ModelStatusUpdateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM model_registry WHERE id = ?", (model_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Model not found in registry")
        
    cursor.execute(
        "UPDATE model_registry SET status = ?, updated_at = ? WHERE id = ?",
        (req.status, datetime.now().isoformat(), model_id)
    )
    conn.commit()
    conn.close()
    log_audit("model_status_update", f"Model {model_id} status manually updated to {req.status}")
    return {"status": "success"}

@app.post("/api/models/recommend")
def get_recommendation(req: RecommendRequest):
    try:
        hardware_info = scan_hardware()
        rec = recommend_models(req.feature_type, req.profile, hardware_info)
        return rec
    except Exception as e:
        logger.error(f"Error generating recommendation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/models/{model_id}/prepare")
def prepare_model(model_id: str, payload: Dict[str, str]):
    try:
        precision = payload.get("precision", "INT4")
        job_id = queue_prepare_job(model_id, precision)
        return {"job_id": job_id, "status": "queued"}
    except Exception as e:
        logger.error(f"Error queuing model preparation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    return get_job_status(job_id)

@app.post("/api/jobs/{job_id}/cancel")
def cancel_job(job_id: str):
    try:
        result = cancel_prepare_job(job_id)
        return result
    except Exception as e:
        logger.error(f"Error cancelling job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/models/{model_id}/stop")
def stop_model(model_id: str):
    try:
        result = stop_prepare_job(model_id)
        return result
    except Exception as e:
        logger.error(f"Error stopping model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/models/{model_id}/job")
def get_model_job(model_id: str):
    """Get the active or most recent job for a model."""
    from app.memory.db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, model_id, job_type, status, progress, message, log_path, started_at, finished_at "
        "FROM model_jobs WHERE model_id = ? ORDER BY started_at DESC LIMIT 1",
        (model_id,)
    )
    row = cursor.fetchone()
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

@app.post("/api/runtime/load")
def load_model(req: LoadModelRequest):
    try:
        def _do_load():
            try:
                RuntimeManager.load_model(req.model_id, req.device, req.precision)
            except Exception as e:
                logger.error(f"Background load error: {e}")
        t = threading.Thread(target=_do_load, daemon=True)
        t.start()
        return {"status": "loading", "model_id": req.model_id, "device": req.device}
    except Exception as e:
        logger.error(f"Error starting model load: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/runtime/unload")
def unload_model():
    try:
        res = RuntimeManager.unload_model()
        return res
    except Exception as e:
        logger.error(f"Error unloading model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/runtime/active")
def get_active_model():
    return RuntimeManager.get_active_info()

@app.get("/api/runtime/logs")
def get_runtime_logs():
    from app.runtime.inference import _runtime_logs
    return {"logs": _runtime_logs}

@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest):
    # Retrieve active model configuration
    active_info = RuntimeManager.get_active_info()
    model_id = active_info.get("model_id")
    device = active_info.get("device")
    
    if not model_id:
        # Auto-load standard model for convenience if none loaded
        try:
            logger.info("Auto-loading Qwen2.5-Omni-3B model...")
            # AUTO resolves to the best available device (GPU > NPU > CPU)
            RuntimeManager.load_model("Qwen2.5-Omni-3B", "AUTO", "INT4")
            active_info = RuntimeManager.get_active_info()
            model_id = active_info.get("model_id") or "Qwen2.5-Omni-3B"
            device = active_info.get("device") or "CPU"
        except Exception as e:
            logger.error(f"Auto-load failed: {e}")
            try:
                logger.info("Falling back to qwen3_6_1_5b_instruct (simulated)...")
                RuntimeManager.load_model("qwen3_6_1_5b_instruct", "AUTO", "INT4")
                active_info = RuntimeManager.get_active_info()
                model_id = active_info.get("model_id") or "qwen3_6_1_5b_instruct"
                device = active_info.get("device") or "CPU"
            except Exception as e2:
                raise HTTPException(status_code=400, detail="No active model loaded and auto-load failed. Load a model first.")

    # Save user message
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Ensure session exists
    cursor.execute("SELECT 1 FROM chat_sessions WHERE id = ?", (req.session_id,))
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO chat_sessions (id, title, feature_type, model_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (req.session_id, req.message[:30], req.feature_type, model_id, datetime.now().isoformat(), datetime.now().isoformat())
        )
        
    # Previous turns (before this message) so generation can follow up on them
    cursor.execute(
        "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 6",
        (req.session_id,)
    )
    history = [{"role": r, "content": c} for (r, c) in reversed(cursor.fetchall())]

    user_msg_id = f"msg_{os.urandom(4).hex()}_{int(datetime.now().timestamp())}"
    cursor.execute(
        "INSERT INTO chat_messages (id, session_id, role, content, model_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (user_msg_id, req.session_id, "user", req.message, model_id, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

    # Streaming generator
    def event_generator():
        assistant_response = ""
        # yield model details metadata first
        yield f"__METADATA__:{json.dumps({'model_id': model_id, 'device': device})}\n"
        
        for token in RuntimeManager.generate_stream(
            req.message,
            attachments=req.attachments,
            mode=req.mode,
            effort=req.effort,
            internet=req.internet,
            tools=req.tools,
            history=history
        ):
            assistant_response += token
            yield token
            
        # Save assistant message at the end
        conn = get_db_connection()
        cursor = conn.cursor()
        asst_msg_id = f"msg_{os.urandom(4).hex()}_{int(datetime.now().timestamp())}"
        cursor.execute(
            "INSERT INTO chat_messages (id, session_id, role, content, model_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (asst_msg_id, req.session_id, "assistant", assistant_response, model_id, datetime.now().isoformat())
        )
        conn.commit()
        conn.close()

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/rag/index")
async def upload_document(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        res = index_document(file.filename, contents)
        return res
    except Exception as e:
        logger.error(f"Error indexing document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rag/documents")
def list_documents():
    return {"documents": get_documents()}

@app.delete("/api/rag/documents/{doc_id}")
def remove_document(doc_id: str):
    return delete_document(doc_id)

@app.post("/api/voice/transcribe")
async def voice_transcribe(file: UploadFile = File(...)):
    """Speech-to-text: accepts a recorded audio file and returns the transcript."""
    import tempfile
    try:
        contents = await file.read()
        suffix = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        try:
            text = RuntimeManager.transcribe_audio(tmp_path)
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        return {"text": text}
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/tts")
def chat_tts(text: str, msg_id: str = "", speaker: str = "Chelsie"):
    import hashlib
    from fastapi.responses import FileResponse
    
    # Map legacy voice names to actual speaker IDs
    SPEAKER_MAP = {
        "Female (Intel AI)": "Chelsie",
        "Male (Intel AI)": "Ethan",
        "Chelsie": "Chelsie",
        "Ethan": "Ethan",
    }
    speaker = SPEAKER_MAP.get(speaker, "Chelsie")
    
    print(f"[TTS-EP] chat_tts called: text={text[:80]}..., msg_id={msg_id}, speaker={speaker}")
    
    # Generate unique hash of the response text + speaker as our cache key
    cache_key = f"{text}_{speaker}"
    text_hash = hashlib.md5(cache_key.encode('utf-8')).hexdigest()
    
    TTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app_data", "tts"))
    os.makedirs(TTS_DIR, exist_ok=True)
    file_path = os.path.join(TTS_DIR, f"{text_hash}.wav")
    
    # Synthesize if not already cached
    if not os.path.exists(file_path):
        # While a model load is in flight, ask the client to retry instead of
        # synthesizing a placeholder chord.
        if RuntimeManager.get_active_info().get("loading"):
            raise HTTPException(status_code=503, detail="Model is loading; retry shortly.",
                                headers={"Retry-After": "10"})
        ok = RuntimeManager.synthesize_speech_file(text, file_path, speaker=speaker)
        if not ok and os.path.exists(file_path):
            # Placeholder audio (model not loaded / synth failed): serve once,
            # then delete so a retry with a loaded model isn't blocked by cache.
            from starlette.background import BackgroundTask
            return FileResponse(file_path, media_type="audio/wav",
                                background=BackgroundTask(os.remove, file_path))

    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/wav")
    
    raise HTTPException(status_code=500, detail="Failed to synthesize speech audio file")

@app.post("/api/benchmarks/run")
def run_benchmark(req: BenchmarkRequest, background_tasks: BackgroundTasks):
    try:
        active_info = RuntimeManager.get_active_info()
        precision = active_info.get("precision", "INT4")
        background_tasks.add_task(start_benchmark_job, req.model_id, req.device, precision)
        return {"status": "started", "message": f"Benchmark launched in background on {req.device}"}
    except Exception as e:
        logger.error(f"Error launching benchmark: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/benchmarks/results")
def get_benchmarks():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT b.*, m.name as model_name FROM benchmark_results b JOIN model_registry m ON b.model_id = m.id ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        results.append({
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
            "created_at": r["created_at"]
        })
    return {"results": results}

@app.get("/api/settings")
def get_settings():
    return {
        "model_directory": get_setting("model_directory"),
        "data_directory": get_setting("data_directory"),
        "default_hardware_mode": get_setting("default_hardware_mode"),
        "enterprise_mode": get_setting("enterprise_mode") == "true",
        "privacy_mode": get_setting("privacy_mode") == "true",
        "logging_level": get_setting("logging_level"),
        "developer_mode": get_setting("developer_mode") == "true",
    }

@app.post("/api/settings")
def update_settings(req: SettingsUpdateRequest):
    if req.model_directory is not None:
        set_setting("model_directory", req.model_directory)
    if req.data_directory is not None:
        set_setting("data_directory", req.data_directory)
    if req.default_hardware_mode is not None:
        set_setting("default_hardware_mode", req.default_hardware_mode)
    if req.enterprise_mode is not None:
        set_setting("enterprise_mode", "true" if req.enterprise_mode else "false")
    if req.privacy_mode is not None:
        set_setting("privacy_mode", "true" if req.privacy_mode else "false")
    if req.logging_level is not None:
        set_setting("logging_level", req.logging_level)
    if req.developer_mode is not None:
        set_setting("developer_mode", "true" if req.developer_mode else "false")
    return {"status": "success"}

@app.get("/api/audit-logs")
def get_audit_logs():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100")
    rows = cursor.fetchall()
    conn.close()
    
    logs = []
    for r in rows:
        logs.append({
            "id": r["id"],
            "event_type": r["event_type"],
            "actor": r["actor"],
            "details": r["details"],
            "created_at": r["created_at"]
        })
    return {"logs": logs}

@app.post("/api/security/reset")
def clear_all_data():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chat_messages")
        cursor.execute("DELETE FROM chat_sessions")
        cursor.execute("DELETE FROM memory_items")
        cursor.execute("DELETE FROM generated_outputs")
        cursor.execute("DELETE FROM documents")
        cursor.execute("DELETE FROM rag_indexes")
        cursor.execute("DELETE FROM benchmark_results")
        cursor.execute("DELETE FROM tool_calls")
        conn.commit()
        conn.close()
        
        # Clean uploaded document files
        if os.path.exists(UPLOAD_DIR):
            for f in os.listdir(UPLOAD_DIR):
                path = os.path.join(UPLOAD_DIR, f)
                try:
                    if os.path.isfile(path):
                        os.remove(path)
                except Exception:
                    pass
                    
        log_audit("data_wipe", "User wiped all local memory and history database entries.")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error cleaning data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # reload wipes the loaded model on any file save and can leave a stale worker
    # serving old code — enable only when actively editing backend files.
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000,
                reload=os.environ.get("UVICORN_RELOAD") == "1")