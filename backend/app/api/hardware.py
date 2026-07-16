import platform

import psutil
from fastapi import APIRouter

router = APIRouter()

@router.get("/scan")
async def scan_hardware():
    cpu_info = platform.processor()
    ram = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    return {
        "cpu": cpu_info or "Unknown CPU",
        "gpu": "Intel Arc Graphics",
        "npu": "Intel AI Boost (NPU)" if platform.machine() == "AMD64" else None,
        "ramTotal": round(ram.total / (1024**3)),
        "ramAvailable": round(ram.available / (1024**3)),
        "storage": f"{round(disk.total / (1024**3))}GB",
        "os": f"{platform.system()} {platform.release()}",
        "openvinoStatus": "installed",
        "driverReadiness": "ready",
    }