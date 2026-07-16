"""Cross-platform launcher for UltraEdge AIPC Studio.

Supports Windows and Linux, with best-effort Intel macOS support.  The launcher
never installs dependencies or starts a service until the mandatory Intel Core
Ultra processor check passes.
"""

from __future__ import annotations

import argparse
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
FRONTEND_URL = "http://127.0.0.1:3000"


def _load_suitability_check():
    sys.path.insert(0, str(BACKEND_DIR))
    from app.hardware.suitability import assess_hardware_suitability

    return assess_hardware_suitability()


def _print_suitability(result) -> None:
    verdict = "SUITABLE" if result.suitable else "NOT SUITABLE"
    print("\nHardware suitability verification")
    print(f"  Detected CPU : {result.cpu}")
    print(f"  Requirement  : {result.requirement}")
    print(f"  Verdict      : {verdict}")
    print(f"  Reason       : {result.reason}\n")


def _npm_command() -> str | None:
    return shutil.which("npm.cmd" if os.name == "nt" else "npm")


def _wait_for_port(host: str, port: int, processes: list[subprocess.Popen], timeout: int) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if any(process.poll() is not None for process in processes):
            return False
        try:
            with socket.create_connection((host, port), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.25)
    return False


def _stop_process(process: subprocess.Popen) -> None:
    if process.poll() is not None:
        return
    try:
        if os.name == "nt":
            process.send_signal(signal.CTRL_BREAK_EVENT)
        else:
            os.killpg(process.pid, signal.SIGTERM)
        process.wait(timeout=5)
    except (OSError, subprocess.SubprocessError):
        process.terminate()
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            process.kill()


def _start_process(command: list[str], cwd: Path) -> subprocess.Popen:
    kwargs: dict = {"cwd": str(cwd)}
    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True
    return subprocess.Popen(command, **kwargs)


def main() -> int:
    parser = argparse.ArgumentParser(description="Start UltraEdge AIPC Studio")
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="print hardware suitability and exit without starting services",
    )
    parser.add_argument(
        "--no-browser", action="store_true", help="do not open the web browser"
    )
    parser.add_argument(
        "--install-frontend",
        action="store_true",
        help="run npm install even when node_modules already exists",
    )
    args = parser.parse_args()

    suitability = _load_suitability_check()
    _print_suitability(suitability)
    if not suitability.suitable:
        return 3
    if args.check_only:
        return 0

    npm = _npm_command()
    if npm is None:
        print("ERROR: npm was not found. Install Node.js 20+ and try again.")
        return 2

    if args.install_frontend or not (FRONTEND_DIR / "node_modules").is_dir():
        print("Installing frontend dependencies...")
        install = subprocess.run([npm, "install"], cwd=FRONTEND_DIR, check=False)
        if install.returncode != 0:
            print("ERROR: frontend dependency installation failed.")
            return install.returncode or 1

    print("Starting backend on http://127.0.0.1:8000 ...")
    backend = _start_process([sys.executable, "-m", "app.main"], BACKEND_DIR)
    print("Starting frontend on http://127.0.0.1:3000 ...")
    frontend = _start_process(
        [npm, "run", "dev", "--", "--host", "127.0.0.1"], FRONTEND_DIR
    )
    processes = [backend, frontend]

    try:
        if not _wait_for_port("127.0.0.1", 8000, processes, timeout=45):
            print("ERROR: a service exited or the backend did not become ready.")
            return 1
        if not _wait_for_port("127.0.0.1", 3000, processes, timeout=45):
            print("ERROR: a service exited or the frontend did not become ready.")
            return 1
        if not args.no_browser:
            webbrowser.open(FRONTEND_URL)
        print("UltraEdge AIPC Studio is running. Press Ctrl+C to stop all services.")
        while all(process.poll() is None for process in processes):
            time.sleep(0.5)
        failed = next((process.returncode for process in processes if process.returncode), 0)
        return failed or 0
    except KeyboardInterrupt:
        print("\nStopping UltraEdge AIPC Studio...")
        return 0
    finally:
        for process in reversed(processes):
            _stop_process(process)


if __name__ == "__main__":
    raise SystemExit(main())
