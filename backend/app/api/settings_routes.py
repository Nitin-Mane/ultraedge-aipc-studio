"""Settings endpoints — app settings, HuggingFace token management."""

from __future__ import annotations

import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.memory.db import get_db_connection, get_setting, log_audit, set_setting

router = APIRouter(prefix="/api", tags=["settings"])


# ── Schemas ─────────────────────────────────────────────────────────────────

class SettingsUpdateRequest(BaseModel):
    model_directory: str | None = None
    data_directory: str | None = None
    default_hardware_mode: str | None = None
    enterprise_mode: bool | None = None
    privacy_mode: bool | None = None
    logging_level: str | None = None
    developer_mode: bool | None = None


class HFTokenRequest(BaseModel):
    token: str


# ── Helpers ─────────────────────────────────────────────────────────────────

def _mask_token(token: str) -> str:
    if not token:
        return ""
    if len(token) <= 8:
        return "*" * len(token)
    return token[:4] + "*" * (len(token) - 8) + token[-4:]


# ── App Settings ────────────────────────────────────────────────────────────

@router.get("/settings")
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


@router.post("/settings")
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


# ── HuggingFace Token ───────────────────────────────────────────────────────

@router.get("/settings/hf-token")
def get_hf_token():
    raw = get_setting("hf_token", "")
    if not raw:
        return {"configured": False, "masked": None, "prefix": None}
    return {
        "configured": True,
        "masked": _mask_token(raw),
        "prefix": raw[:8] if len(raw) >= 8 else raw,
        "length": len(raw),
    }


@router.post("/settings/hf-token")
def save_hf_token(req: HFTokenRequest):
    token = req.token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Token cannot be empty")
    if not token.startswith("hf_"):
        raise HTTPException(status_code=400, detail="Invalid HuggingFace token format. Must start with 'hf_'")
    set_setting("hf_token", token)
    os.environ["HF_TOKEN"] = token
    log_audit("hf_token_saved", "HuggingFace API token configured")
    return {"status": "success", "masked": _mask_token(token)}


@router.post("/settings/hf-token/revoke")
def revoke_hf_token():
    raw = get_setting("hf_token", "")
    if not raw:
        raise HTTPException(status_code=404, detail="No HF token configured")
    set_setting("hf_token_revoked", "true")
    os.environ.pop("HF_TOKEN", None)
    log_audit("hf_token_revoked", "HuggingFace API token revoked")
    return {"status": "revoked"}


@router.delete("/settings/hf-token")
def delete_hf_token():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM app_settings WHERE key IN ('hf_token', 'hf_token_revoked')")
    conn.commit()
    conn.close()
    os.environ.pop("HF_TOKEN", None)
    log_audit("hf_token_deleted", "HuggingFace API token permanently deleted")
    return {"status": "deleted"}
