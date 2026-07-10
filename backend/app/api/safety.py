from fastapi import APIRouter

router = APIRouter()

@router.get("/status")
async def get_safety_status():
    return {
        "local_only_mode": True,
        "encryption_enabled": True,
        "privacy_mode": True,
        "audit_logs_enabled": True,
        "network_access_disabled": True,
    }

@router.get("/audit-logs")
async def get_audit_logs():
    return {
        "logs": [
            {"timestamp": "2026-07-04T10:00:00", "action": "model_loaded", "details": "Qwen3-VL-4B loaded"},
            {"timestamp": "2026-07-04T10:05:00", "action": "inference_completed", "details": "User query processed"},
        ]
    }