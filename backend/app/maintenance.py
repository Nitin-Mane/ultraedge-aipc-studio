"""UltraEdge auto-maintenance.

Runs at backend startup and then every hour. Frees memory and prunes stale
caches without disturbing the running app:
- never unloads the active model (GPU/NPU blobs owned by a loaded pipeline stay),
- never touches SQLite records (chats, audits, benchmarks, settings),
- only deletes cache files old enough that the UI is no longer using them.
"""

import ctypes
import gc
import logging
import os
import sys
import threading
import time

logger = logging.getLogger("maintenance")

APP_DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app_data"))
TTS_DIR = os.path.join(APP_DATA, "tts")
# Compiled-blob cache written by qwen2_5_omni_helper (see OV_CACHE_DIR there)
OV_CACHE_DIR = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "qwen2.5-omni-chatbot", "ov_cache"))

TTS_MAX_AGE_S = 24 * 3600        # keep last day of synthesized audio replayable
OV_CACHE_MAX_AGE_S = 7 * 24 * 3600  # recompiled blobs regenerate automatically
INTERVAL_S = 3600

_lock = threading.Lock()
last_report: dict = {}


def _prune_dir(path: str, max_age_s: float) -> tuple[int, int]:
    """Delete files older than max_age_s. Returns (files_removed, bytes_freed)."""
    removed = freed = 0
    if not os.path.isdir(path):
        return 0, 0
    cutoff = time.time() - max_age_s
    for name in os.listdir(path):
        fp = os.path.join(path, name)
        try:
            if os.path.isfile(fp) and os.path.getmtime(fp) < cutoff:
                size = os.path.getsize(fp)
                os.remove(fp)
                removed += 1
                freed += size
        except OSError:
            pass  # in use or already gone — never fight the running app
    return removed, freed


def _trim_working_set() -> None:
    """Return unused pages of this process to the OS (Windows). The loaded
    model's active pages fault back in on demand, so inference is unaffected."""
    if sys.platform != "win32":
        return
    try:
        handle = ctypes.windll.kernel32.GetCurrentProcess()
        ctypes.windll.psapi.EmptyWorkingSet(handle)
    except Exception as ex:
        logger.debug(f"working-set trim skipped: {ex}")


def run_cleanup(trigger: str = "scheduled") -> dict:
    """One cleanup pass. Safe to call while a model is loaded/generating."""
    with _lock:
        rss_before = _rss_mb()

        # 1) Python-level garbage (orphaned tensors/pipelines from past unloads)
        collected = gc.collect()

        # 2) Framework caches that hold device memory for tensors no longer used
        try:
            import torch
            if hasattr(torch, "xpu") and torch.xpu.is_available():
                torch.xpu.empty_cache()
        except Exception:
            pass

        # 3) Stale cache files (old TTS wavs, old OpenVINO compiled blobs)
        tts_n, tts_b = _prune_dir(TTS_DIR, TTS_MAX_AGE_S)
        ov_n, ov_b = _prune_dir(OV_CACHE_DIR, OV_CACHE_MAX_AGE_S)

        # 4) Hand unused RAM pages back to Windows
        _trim_working_set()

        report = {
            "trigger": trigger,
            "gc_objects": collected,
            "tts_files_removed": tts_n,
            "ov_cache_files_removed": ov_n,
            "bytes_freed": tts_b + ov_b,
            "rss_before_mb": rss_before,
            "rss_after_mb": _rss_mb(),
            "at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        global last_report
        last_report = report

        try:
            from app.memory.db import log_audit
            log_audit("maintenance_cleanup",
                      f"{trigger}: freed {report['bytes_freed'] // 1024} KB cache, "
                      f"RSS {report['rss_before_mb']}→{report['rss_after_mb']} MB")
        except Exception:
            pass
        logger.info(f"cleanup done: {report}")
        return report


def _rss_mb() -> int:
    try:
        import psutil
        return int(psutil.Process().memory_info().rss / (1024 * 1024))
    except Exception:
        return -1


def start_scheduler() -> None:
    """Run one pass now (app-open first step), then repeat hourly."""
    def loop():
        run_cleanup("startup")
        while True:
            time.sleep(INTERVAL_S)
            try:
                run_cleanup("hourly")
            except Exception as ex:
                logger.error(f"scheduled cleanup failed: {ex}")

    threading.Thread(target=loop, name="ue-maintenance", daemon=True).start()
