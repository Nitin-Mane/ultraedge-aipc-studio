"""Host suitability checks for UltraEdge AIPC Studio.

The application intentionally supports only Intel Core Ultra processors.  This
module uses only the Python standard library so the launcher can run the check
before backend dependencies are imported or frontend packages are installed.
"""

from __future__ import annotations

import platform
import re
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class HardwareSuitability:
    cpu: str
    suitable: bool
    requirement: str
    reason: str

    def as_dict(self) -> dict[str, str | bool]:
        return asdict(self)


class UnsupportedHardwareError(RuntimeError):
    """Raised when the host does not meet the mandatory CPU requirement."""


def _run(command: list[str]) -> str:
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""


def detect_cpu_name() -> str:
    """Return the most specific CPU brand string available on this OS."""
    system = platform.system()

    if system == "Windows":
        # The registry value is available to standard users and avoids WMI/CIM
        # permission failures in sandboxed or enterprise-managed environments.
        try:
            import winreg

            with winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"HARDWARE\DESCRIPTION\System\CentralProcessor\0",
            ) as key:
                value, _ = winreg.QueryValueEx(key, "ProcessorNameString")
                if value and str(value).strip():
                    return str(value).strip()
        except (ImportError, OSError):
            pass

        shell = shutil.which("powershell") or shutil.which("pwsh")
        if shell:
            output = _run(
                [
                    shell,
                    "-NoProfile",
                    "-Command",
                    "Get-CimInstance Win32_Processor | "
                    "Select-Object -First 1 -ExpandProperty Name",
                ]
            )
            if output:
                return output.splitlines()[0].strip()

    elif system == "Linux":
        try:
            for line in Path("/proc/cpuinfo").read_text(
                encoding="utf-8", errors="replace"
            ).splitlines():
                if line.lower().startswith("model name"):
                    return line.split(":", 1)[1].strip()
        except (OSError, IndexError):
            pass

        lscpu = shutil.which("lscpu")
        if lscpu:
            output = _run([lscpu])
            for line in output.splitlines():
                if line.lower().startswith("model name"):
                    return line.split(":", 1)[1].strip()

    elif system == "Darwin":
        sysctl = shutil.which("sysctl")
        if sysctl:
            output = _run([sysctl, "-n", "machdep.cpu.brand_string"])
            if output:
                return output.splitlines()[0].strip()

    return (platform.processor() or platform.machine() or "Unknown CPU").strip()


def assess_hardware_suitability(cpu_name: str | None = None) -> HardwareSuitability:
    """Assess the mandatory Intel Core Ultra CPU requirement."""
    cpu = (cpu_name or detect_cpu_name()).strip() or "Unknown CPU"
    normalized = re.sub(r"[()\u2122\u00ae]+", " ", cpu)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    is_core_ultra = bool(
        re.search(r"\bintel\b.*\bcore\b.*\bultra\b", normalized, re.IGNORECASE)
    )

    if is_core_ultra:
        reason = "Supported Intel Core Ultra processor detected."
    else:
        reason = (
            "Unsupported processor. UltraEdge AIPC Studio requires an "
            "Intel Core Ultra processor and will not start on this system."
        )

    return HardwareSuitability(
        cpu=cpu,
        suitable=is_core_ultra,
        requirement="Intel Core Ultra processor",
        reason=reason,
    )


def require_supported_hardware() -> HardwareSuitability:
    """Return suitability or raise before application services initialize."""
    result = assess_hardware_suitability()
    if not result.suitable:
        raise UnsupportedHardwareError(f"{result.reason} Detected CPU: {result.cpu}")
    return result
