"""System endpoints — health, hardware, audit, security reset, maintenance."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.hardware.scanner import scan_hardware
from app.memory import repository as repo
from app.memory.db import log_audit

logger = logging.getLogger("system_routes")
router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0-alpha", "backend": "running"}


@router.get("/system/profile")
def get_system_profile():
    try:
        return scan_hardware()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-logs")
def get_audit_logs():
    return {"logs": repo.get_audit_logs()}


@router.post("/security/reset")
def clear_all_data():
    try:
        repo.wipe_user_data()
        log_audit("data_wipe", "User wiped all local memory and history database entries.")
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/maintenance/cleanup")
def trigger_cleanup():
    from app.maintenance import run_cleanup
    return run_cleanup("manual")


@router.get("/maintenance/status")
def maintenance_status():
    from app.maintenance import last_report
    return {"last_cleanup": last_report or None}
