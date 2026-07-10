from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.models.catalog import get_registry_models
from app.models.jobs import queue_prepare_job, get_job_status
from app.runtime.inference import RuntimeManager

router = APIRouter()

class PrepareRequest(BaseModel):
    precision: Optional[str] = "INT4"

@router.get("/catalog")
async def get_model_catalog():
    try:
        models = get_registry_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{model_id}")
async def get_model(model_id: str):
    try:
        models = get_registry_models()
        model = next((m for m in models if m["id"] == model_id), None)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        return model
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{model_id}/prepare")
async def prepare_model(model_id: str, req: PrepareRequest):
    try:
        job_id = queue_prepare_job(model_id, req.precision)
        return {"job_id": job_id, "status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))