"""Model management endpoints — catalog, prepare, benchmark, status."""

from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.hardware.scanner import scan_hardware
from app.memory import repository as repo
from app.memory.db import log_audit
from app.models.catalog import get_registry_models, recommend_models
from app.models.jobs import (
    cancel_prepare_job,
    get_job_status,
    queue_prepare_job,
    start_benchmark_job,
    stop_prepare_job,
)

logger = logging.getLogger("models_routes")
router = APIRouter(prefix="/api", tags=["models"])


# ── Schemas ─────────────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    feature_type: str
    profile: str = "balanced"


class ModelStatusUpdateRequest(BaseModel):
    status: str


class PrepareRequest(BaseModel):
    precision: str = "INT4"
    step: str = "all"


class ModelBenchmarkRequest(BaseModel):
    device: str = "GPU"
    precision: str = "INT4"


class BenchmarkRequest(BaseModel):
    model_id: str
    device: str = "CPU"
    benchmark_type: str = "quick"


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/models/catalog")
def get_models_catalog():
    try:
        return {"models": get_registry_models()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/{model_id}/status")
def update_model_status(model_id: str, req: ModelStatusUpdateRequest):
    if not repo.update_model_status(model_id, req.status):
        raise HTTPException(status_code=404, detail="Model not found in registry")
    log_audit("model_status_update", f"Model {model_id} status updated to {req.status}")
    return {"status": "success"}


@router.post("/models/recommend")
def get_recommendation(req: RecommendRequest):
    try:
        return recommend_models(req.feature_type, req.profile, scan_hardware())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/{model_id}/prepare")
def prepare_model(model_id: str, payload: PrepareRequest):
    try:
        job_id = queue_prepare_job(model_id, payload.precision, payload.step)
        return {"job_id": job_id, "status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    return get_job_status(job_id)


@router.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: str):
    try:
        return cancel_prepare_job(job_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/{model_id}/stop")
def stop_model(model_id: str):
    try:
        return stop_prepare_job(model_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/{model_id}/benchmark")
def benchmark_model(model_id: str, req: ModelBenchmarkRequest, background_tasks: BackgroundTasks):
    try:
        background_tasks.add_task(start_benchmark_job, model_id, req.device, req.precision)
        log_audit("benchmark_started", f"Benchmark triggered for {model_id} on {req.device}")
        return {"status": "started", "message": f"Benchmark launched for {model_id} on {req.device}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/{model_id}/job")
def get_model_job(model_id: str):
    return repo.get_model_job(model_id)


@router.post("/benchmarks/run")
def run_benchmark(req: BenchmarkRequest, background_tasks: BackgroundTasks):
    from app.runtime.inference import RuntimeManager
    try:
        precision = RuntimeManager.get_active_info().get("precision", "INT4")
        background_tasks.add_task(start_benchmark_job, req.model_id, req.device, precision)
        return {"status": "started", "message": f"Benchmark launched on {req.device}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/benchmarks/results")
def get_benchmarks():
    return {"results": repo.get_benchmark_results()}
