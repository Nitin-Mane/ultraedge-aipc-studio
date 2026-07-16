"""Runtime endpoints — load/unload/generate, runtime logs."""

from __future__ import annotations

import logging
import threading

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.runtime.inference import RuntimeManager

logger = logging.getLogger("runtime_routes")
router = APIRouter(prefix="/api", tags=["runtime"])


# ── Schemas ─────────────────────────────────────────────────────────────────

class LoadModelRequest(BaseModel):
    model_id: str
    device: str = "CPU"
    precision: str = "INT4"


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/runtime/load")
def load_model(req: LoadModelRequest):
    try:
        def _do_load():
            try:
                RuntimeManager.load_model(req.model_id, req.device, req.precision)
            except Exception as e:
                logger.error(f"Background load error: {e}")
        threading.Thread(target=_do_load, daemon=True).start()
        return {"status": "loading", "model_id": req.model_id, "device": req.device}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/runtime/unload")
def unload_model():
    try:
        return RuntimeManager.unload_model()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/runtime/active")
def get_active_model():
    return RuntimeManager.get_active_info()


@router.get("/runtime/logs")
def get_runtime_logs():
    from app.runtime.inference import _runtime_logs
    return {"logs": _runtime_logs}
