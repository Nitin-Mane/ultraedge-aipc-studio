"""Chat & voice endpoints — streaming chat, TTS, ASR."""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from typing import Any, Literal

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from app.config import settings
from app.memory import repository as repo
from app.runtime.inference import RuntimeManager

router = APIRouter(prefix="/api", tags=["chat"])


# ── Schemas ─────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    session_id: str
    message: str
    feature_type: str = "personal_assistant"
    temperature: float | None = 0.7
    top_p: float | None = 0.9
    max_tokens: int | None = 2048
    system_prompt: str | None = None
    mode: str | None = "thinking"
    effort: str | None = "high"
    internet: bool | None = False
    tools: list[str] | None = None
    attachments: list[dict[str, Any]] | None = None


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/chat/stream")
def chat_stream(req: ChatRequest):
    active_info = RuntimeManager.get_active_info()
    model_id = active_info.get("model_id")
    device = active_info.get("device")

    if not model_id:
        try:
            RuntimeManager.load_model("Qwen2.5-Omni-3B", "AUTO", "INT4")
            active_info = RuntimeManager.get_active_info()
            model_id = active_info.get("model_id") or "Qwen2.5-Omni-3B"
            device = active_info.get("device") or "CPU"
        except Exception:
            try:
                RuntimeManager.load_model("qwen3_6_1_5b_instruct", "AUTO", "INT4")
                active_info = RuntimeManager.get_active_info()
                model_id = active_info.get("model_id") or "qwen3_6_1_5b_instruct"
                device = active_info.get("device") or "CPU"
            except Exception as exc:
                raise HTTPException(
                    status_code=400,
                    detail="No active model loaded and auto-load failed.",
                ) from exc

    repo.ensure_session(req.session_id, req.message, req.feature_type, model_id)
    history = repo.get_chat_history(req.session_id)
    repo.save_chat_message(req.session_id, "user", req.message, model_id)

    def event_generator():
        assistant_response = ""
        yield f"__METADATA__:{json.dumps({'model_id': model_id, 'device': device})}\n"
        for token in RuntimeManager.generate_stream(
            req.message, attachments=req.attachments, mode=req.mode,
            effort=req.effort, internet=req.internet, tools=req.tools, history=history,
            max_tokens=req.max_tokens,
        ):
            assistant_response += token
            yield token
        repo.save_chat_message(req.session_id, "assistant", assistant_response, model_id)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/voice/transcribe")
async def voice_transcribe(file: UploadFile = File(...)):
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
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/chat/tts")
def chat_tts(
    text: str,
    msg_id: str = "",
    speaker: str = "Chelsie",
    profile: Literal["fast", "balanced"] = "balanced",
):
    from starlette.background import BackgroundTask

    SPEAKER_MAP = {
        "Female (Intel AI)": "Chelsie",
        "Male (Intel AI)": "Ethan",
        "Chelsie": "Chelsie",
        "Ethan": "Ethan",
    }
    speaker = SPEAKER_MAP.get(speaker, "Chelsie")

    cache_key = f"{text}_{speaker}_{profile}"
    text_hash = hashlib.sha256(cache_key.encode("utf-8")).hexdigest()

    tts_dir = str(settings.APP_DATA_DIR / "tts")
    os.makedirs(tts_dir, exist_ok=True)
    file_path = os.path.join(tts_dir, f"{text_hash}.wav")

    if not os.path.exists(file_path):
        if RuntimeManager.get_active_info().get("loading"):
            raise HTTPException(status_code=503, detail="Model is loading; retry shortly.",
                                headers={"Retry-After": "10"})
        ok = RuntimeManager.synthesize_speech_file(
            text,
            file_path,
            speaker=speaker,
            profile=profile,
        )
        if not ok and os.path.exists(file_path):
            return FileResponse(file_path, media_type="audio/wav",
                                background=BackgroundTask(os.remove, file_path))

    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/wav")

    raise HTTPException(status_code=500, detail="Failed to synthesize speech audio file")


# ── Chat History / Session Management ──────────────────────────────────────

class SessionUpdateRequest(BaseModel):
    title: str

class MessageUpdateRequest(BaseModel):
    content: str


@router.get("/chat/sessions")
def list_chat_sessions(feature_type: str | None = None):
    """List all chat sessions, optionally filtered by feature_type."""
    return repo.list_sessions(feature_type=feature_type)


@router.get("/chat/sessions/{session_id}/messages")
def get_session_messages(session_id: str):
    """Get all messages for a given session."""
    return repo.get_session_messages(session_id)


@router.put("/chat/sessions/{session_id}")
def update_chat_session(session_id: str, req: SessionUpdateRequest):
    """Update a session's title."""
    updated = repo.update_session_title(session_id, req.title)
    if not updated:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True}


@router.delete("/chat/sessions/{session_id}")
def delete_chat_session(session_id: str):
    """Delete a session and all its messages."""
    deleted = repo.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True}


@router.delete("/chat/sessions")
def delete_all_chat_sessions(feature_type: str | None = None):
    """Delete all sessions (clear all chat history)."""
    count = repo.delete_all_sessions(feature_type=feature_type)
    return {"ok": True, "deleted": count}


@router.put("/chat/messages/{message_id}")
def update_chat_message(message_id: str, req: MessageUpdateRequest):
    """Update a single message's content."""
    updated = repo.update_message(message_id, req.content)
    if not updated:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"ok": True}
