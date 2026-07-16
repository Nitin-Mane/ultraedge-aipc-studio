"""UltraEdge AIPC Studio — FastAPI application factory.

This module is intentionally small: it creates the app, configures
middleware, includes routers, and defines the lifespan handler.  All
business logic lives in ``app/api/*.py`` routers and ``app/runtime/``.
"""

from __future__ import annotations

import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.memory.db import get_setting, init_db, log_audit
from app.memory.repository import reset_stuck_jobs

# ── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL, logging.INFO))
logger = logging.getLogger("main")


# ── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    from app.hardware.suitability import require_supported_hardware

    suitability = require_supported_hardware()
    logger.info("Hardware suitability passed: %s", suitability.cpu)
    init_db()
    reset_stuck_jobs()
    log_audit("system_startup", "FastAPI backend server started")

    from app.maintenance import start_scheduler
    start_scheduler()

    last_model = get_setting("active_model")
    if last_model:
        def _restore():
            try:
                logger.info(f"Auto-restoring last active model: {last_model}")
                from app.runtime.inference import RuntimeManager
                RuntimeManager.load_model(
                    last_model,
                    get_setting("active_device") or "AUTO",
                    get_setting("active_precision") or "INT4",
                )
            except Exception as e:
                logger.error(f"Model auto-restore failed: {e}")
        threading.Thread(target=_restore, daemon=True).start()

    yield
    # shutdown — nothing needed


# ── App factory ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="UltraEdge AIPC Studio API",
    version="0.1.0-alpha",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────────

from app.api.chat import router as chat_router
from app.api.coding import router as coding_router
from app.api.models_routes import router as models_router
from app.api.runtime_routes import router as runtime_router
from app.api.runtimes import router as runtimes_router
from app.api.settings_routes import router as settings_router
from app.api.system_routes import router as system_router
from app.api.workspace import router as workspace_router

app.include_router(chat_router)
app.include_router(models_router)
app.include_router(runtime_router)
app.include_router(settings_router)
app.include_router(system_router)
app.include_router(coding_router, prefix="/api/coding", tags=["coding"])
app.include_router(workspace_router, tags=["workspace"])
app.include_router(runtimes_router, tags=["runtimes"])


# ── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
    )
