import logging
import platform
import shutil
import subprocess

from app.hardware.suitability import assess_hardware_suitability, detect_cpu_name

logger = logging.getLogger("scanner")

def _run_powershell(command: str) -> str:
    if platform.system() != "Windows":
        return ""
    try:
        result = subprocess.run(
            ["powershell", "-NoProfile", "-Command", command],
            capture_output=True, text=True, timeout=10
        )
        output = result.stdout.strip()
        return output if output else ""
    except Exception:
        return ""

def scan_hardware():
    """
    Scans the system hardware for CPU, GPU, NPU, RAM, storage, and OpenVINO readiness.
    Uses WMI/PowerShell on Windows for accurate device names, falls back to psutil/platform.
    """
    logger.info("Starting system hardware scan...")

    # ── CPU ─────────────────────────────────────────────────────
    cpu_name = detect_cpu_name()
    ps_cpu = _run_powershell(
        "Get-CimInstance Win32_Processor | Select-Object -ExpandProperty Name"
    )
    if ps_cpu:
        cpu_name = ps_cpu.splitlines()[0].strip()

    # ── GPU ─────────────────────────────────────────────────────
    gpu_name = "Intel Integrated Graphics"
    ps_gpu = _run_powershell(
        "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name"
    )
    gpu_list = [g.strip() for g in ps_gpu.splitlines() if g.strip()]
    if gpu_list:
        # pick the first non-basic-display adapter
        for g in gpu_list:
            if "Intel" in g or "Arc" in g or "NVIDIA" in g or "AMD" in g or "Radeon" in g:
                gpu_name = g
                break
        else:
            gpu_name = gpu_list[0]

    # ── NPU ─────────────────────────────────────────────────────
    npu_status = "not_detected"
    ps_npu = _run_powershell(
        "Get-CimInstance Win32_PnPEntity | Where-Object { "
        "$_.Name -like '*NPU*' -or "
        "$_.Name -like '*Movidius*' -or "
        "$_.Name -like '*Intel*AI*Boost*' -or "
        "$_.Name -like '*Neural*' -or "
        "$_.Name -like '*Intel*VPU*' "
        "} | Select-Object -ExpandProperty Name"
    )
    if ps_npu.strip():
        npu_status = "detected"

    # ── RAM ─────────────────────────────────────────────────────
    try:
        import psutil
        ram_total = round(psutil.virtual_memory().total / (1024 ** 3), 1)
        ram_avail = round(psutil.virtual_memory().available / (1024 ** 3), 1)
    except Exception:
        ram_total = 16.0
        ram_avail = 8.0

    # ── Storage ────────────────────────────────────────────────
    import re
    storage_free = round(shutil.disk_usage(".").free / (1024 ** 3), 1)
    storage_total = ""
    ps_storage = _run_powershell(
        "Get-CimInstance Win32_DiskDrive | Where-Object { $_.MediaType -ne 'Removable Media' } "
        "| Select-Object -First 1 | ForEach-Object { [math]::Round($_.Size / 1GB) }"
    )
    if ps_storage:
        nums = re.findall(r'\d+', ps_storage.strip())
        if nums:
            size_gb = int(nums[0])
            if size_gb > 0:
                storage_total = f"{size_gb}GB"

    # ── OS ──────────────────────────────────────────────────────
    os_name = f"{platform.system()} {platform.release()}"
    ps_os = _run_powershell(
        "Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty Caption"
    )
    if ps_os:
        os_name = ps_os.splitlines()[0].strip()

    profile = {
        "os": os_name,
        "cpu": cpu_name,
        "gpu": gpu_name,
        "npu": npu_status,
        "ram_total_gb": ram_total,
        "ram_available_gb": ram_avail,
        "storage_free_gb": storage_free,
        "storage_total": storage_total,
        "openvino_status": "not_available",
        "supported_devices": ["CPU"]
    }

    suitability = assess_hardware_suitability(cpu_name)
    profile.update({
        "suitable": suitability.suitable,
        "suitability": "supported" if suitability.suitable else "unsupported",
        "suitability_reason": suitability.reason,
        "hardware_requirement": suitability.requirement,
    })

    # ── OpenVINO detection ─────────────────────────────────────
    try:
        import openvino as ov
        profile["openvino_status"] = "available"
        core = ov.Core()
        devices = core.available_devices
        logger.info(f"OpenVINO core available devices: {devices}")

        supported = ["CPU"]
        for dev in devices:
            if dev == "CPU":
                continue
            elif "GPU" in dev:
                supported.append("GPU")
                try:
                    profile["gpu"] = core.get_property(dev, "FULL_DEVICE_NAME") or gpu_name
                except Exception:
                    pass
            elif "NPU" in dev:
                supported.append("NPU")
                profile["npu"] = "detected"

        profile["supported_devices"] = supported
    except Exception as e:
        logger.warning(f"OpenVINO not available: {e}")
        profile["openvino_status"] = "not_available"
        profile["supported_devices"] = ["CPU"]

    logger.info(f"Scan complete: {profile}")
    return profile
