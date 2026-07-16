"""Runtime executor for multiple programming languages."""

import json
import os
import platform
import shlex
import shutil
import subprocess
import tempfile

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/api/runtimes", tags=["runtimes"])

SETTINGS_FILE = str(settings.APP_DATA_DIR / "runtime_settings.json")


def _require_code_execution() -> None:
    if not settings.ENABLE_CODE_EXECUTION:
        raise HTTPException(
            status_code=403,
            detail=(
                "Local code execution is disabled. Set "
                "ULTRAEEDGE_ENABLE_CODE_EXECUTION=true only on a trusted machine."
            ),
        )


class RuntimeConfig(BaseModel):
    name: str
    language: str
    executable: str
    version_cmd: list[str]
    file_extension: str
    compile_cmd: list[str] | None = None
    run_cmd: list[str] | None = None
    is_available: bool = False
    version: str | None = None
    platform: str = platform.system().lower()


class RuntimeSettings(BaseModel):
    paths: dict[str, str] = {}
    auto_detect: bool = True


class ExecuteRequest(BaseModel):
    code: str
    language: str
    stdin: str | None = None
    timeout: int | None = 30


DEFAULT_RUNTIMES = {
    "python": {
        "name": "Python",
        "language": "python",
        "file_extension": ".py",
        "version_cmd": ["python", "--version"],
        "run_cmd": ["python", "{file}"],
    },
    "javascript": {
        "name": "Node.js",
        "language": "javascript",
        "file_extension": ".js",
        "version_cmd": ["node", "--version"],
        "run_cmd": ["node", "{file}"],
    },
    "c": {
        "name": "C (GCC)",
        "language": "c",
        "file_extension": ".c",
        "version_cmd": ["gcc", "--version"],
        "compile_cmd": ["gcc", "{file}", "-o", "{output}"],
        "run_cmd": ["{output}"],
    },
    "cpp": {
        "name": "C++ (G++)",
        "language": "cpp",
        "file_extension": ".cpp",
        "version_cmd": ["g++", "--version"],
        "compile_cmd": ["g++", "{file}", "-o", "{output}"],
        "run_cmd": ["{output}"],
    },
    "go": {
        "name": "Go",
        "language": "go",
        "file_extension": ".go",
        "version_cmd": ["go", "version"],
        "run_cmd": ["go", "run", "{file}"],
    },
    "java": {
        "name": "Java",
        "language": "java",
        "file_extension": ".java",
        "version_cmd": ["java", "-version"],
        "compile_cmd": ["javac", "{file}"],
        "run_cmd": ["java", "{classname}"],
    },
    "rust": {
        "name": "Rust",
        "language": "rust",
        "file_extension": ".rs",
        "version_cmd": ["rustc", "--version"],
        "compile_cmd": ["rustc", "{file}", "-o", "{output}"],
        "run_cmd": ["{output}"],
    },
    "typescript": {
        "name": "TypeScript",
        "language": "typescript",
        "file_extension": ".ts",
        "version_cmd": ["tsc", "--version"],
        "run_cmd": ["ts-node", "{file}"],
    },
}


def get_settings() -> RuntimeSettings:
    """Load runtime settings from file."""
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE) as f:
                data = json.load(f)
                return RuntimeSettings(**data)
        except Exception:
            pass
    return RuntimeSettings()


def save_settings(settings: RuntimeSettings):
    """Save runtime settings to file."""
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings.dict(), f, indent=2)


def find_executable(name: str) -> str | None:
    """Find executable in PATH."""
    return shutil.which(name)


def get_version(cmd: list[str]) -> str | None:
    """Get version from command."""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        output = result.stdout + result.stderr
        # Extract version number
        import re
        match = re.search(r"(\d+\.\d+\.\d+)", output)
        if match:
            return match.group(1)
        return output.split("\n")[0][:50]
    except Exception:
        return None


@router.get("/list")
async def list_runtimes():
    """List all available runtimes with status."""
    settings = get_settings()
    runtimes = []
    
    for key, config in DEFAULT_RUNTIMES.items():
        # Check custom path first
        custom_path = settings.paths.get(key)
        exe = custom_path if custom_path and os.path.exists(custom_path) else find_executable(config["version_cmd"][0])
        
        is_available = exe is not None
        version = get_version(config["version_cmd"]) if is_available else None
        
        runtime_info = {
            **config,
            "id": key,
            "is_available": is_available,
            "version": version,
            "path": exe,
            "custom_path": custom_path,
        }
        runtimes.append(runtime_info)
    
    return {"runtimes": runtimes, "settings": settings.dict()}


@router.post("/settings")
async def update_settings(settings: RuntimeSettings):
    """Update runtime settings."""
    save_settings(settings)
    return {"status": "success", "settings": settings.dict()}


@router.post("/detect")
async def auto_detect():
    """Auto-detect all runtime paths."""
    settings = RuntimeSettings(auto_detect=True)
    detected = {}
    
    for key, config in DEFAULT_RUNTIMES.items():
        exe = find_executable(config["version_cmd"][0])
        if exe:
            detected[key] = exe
            settings.paths[key] = exe
    
    save_settings(settings)
    return {"detected": detected, "settings": settings.dict()}


@router.post("/set-path")
async def set_runtime_path(language: str, path: str):
    """Set custom path for a runtime."""
    settings = get_settings()
    settings.paths[language] = path
    save_settings(settings)
    return {"status": "success"}


@router.post("/execute")
async def execute_code(request: ExecuteRequest):
    """Execute code in the specified language."""
    _require_code_execution()
    if request.language not in DEFAULT_RUNTIMES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {request.language}")
    
    config = DEFAULT_RUNTIMES[request.language]
    settings = get_settings()
    
    # Get executable path
    custom_path = settings.paths.get(request.language)
    exe = custom_path if custom_path and os.path.exists(custom_path) else find_executable(config["version_cmd"][0])
    
    if not exe:
        raise HTTPException(status_code=400, detail=f"{config['name']} not found. Please configure the path in Coder Arena settings.")
    
    # Create temp directory
    with tempfile.TemporaryDirectory() as tmpdir:
        ext = config["file_extension"]
        if request.language == "java":
            classname = "Main"
            filename = f"{classname}{ext}"
        else:
            filename = f"code{ext}"
        
        filepath = os.path.join(tmpdir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(request.code)
        
        stdout = ""
        stderr = ""
        compile_time = 0
        run_time = 0
        
        try:
            import time
            
            # Compile if needed
            if config.get("compile_cmd"):
                compile_start = time.time()
                output_exe = os.path.join(tmpdir, "output.exe" if platform.system() == "Windows" else "output")
                compile_cmd = [c.replace("{file}", filepath).replace("{output}", output_exe) for c in config["compile_cmd"]]
                # Use custom compiler path if set
                if exe and compile_cmd[0] in ("gcc", "g++", "rustc"):
                    compile_cmd[0] = exe
                
                compile_result = subprocess.run(compile_cmd, capture_output=True, text=True, timeout=30)
                compile_time = time.time() - compile_start
                
                if compile_result.returncode != 0:
                    return {
                        "stdout": compile_result.stdout,
                        "stderr": compile_result.stderr,
                        "compile_time": round(compile_time, 3),
                        "run_time": 0,
                        "exit_code": compile_result.returncode,
                    }
                
                # Run compiled executable
                run_start = time.time()
                run_cmd = [c.replace("{file}", filepath).replace("{output}", output_exe).replace("{classname}", classname if request.language == "java" else "") for c in config["run_cmd"]]
                if request.language == "java":
                    run_cmd = ["java", "-cp", tmpdir, classname]
                
                run_result = subprocess.run(run_cmd, capture_output=True, text=True, timeout=request.timeout, input=request.stdin)
                run_time = time.time() - run_start
                stdout = run_result.stdout
                stderr = run_result.stderr
            else:
                # Direct execution
                run_start = time.time()
                run_cmd = [c.replace("{file}", filepath).replace("{classname}", classname if request.language == "java" else "") for c in config["run_cmd"]]
                # Use custom interpreter path
                if exe and request.language in ("python", "javascript", "typescript"):
                    run_cmd[0] = exe
                
                run_result = subprocess.run(run_cmd, capture_output=True, text=True, timeout=request.timeout, input=request.stdin)
                run_time = time.time() - run_start
                stdout = run_result.stdout
                stderr = run_result.stderr
            
            return {
                "stdout": stdout,
                "stderr": stderr,
                "compile_time": round(compile_time, 3),
                "run_time": round(run_time, 3),
                "exit_code": 0 if not stderr else 1,
            }
        
        except subprocess.TimeoutExpired:
            return {
                "stdout": stdout,
                "stderr": f"Execution timed out after {request.timeout} seconds",
                "compile_time": round(compile_time, 3),
                "run_time": request.timeout,
                "exit_code": -1,
            }
        except Exception as e:
            return {
                "stdout": "",
                "stderr": str(e),
                "compile_time": 0,
                "run_time": 0,
                "exit_code": -1,
            }


class AgentCommandRequest(BaseModel):
    command: str
    cwd: str


class AgentFileRequest(BaseModel):
    path: str
    content: str
    action: str  # "create", "write", "mkdir"


@router.post("/agent/execute")
async def agent_execute(request: AgentCommandRequest):
    """Execute a shell command and return output."""
    _require_code_execution()
    try:
        command = shlex.split(request.command, posix=os.name != "nt")
        if not command:
            raise ValueError("Command cannot be empty")
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=request.cwd if os.path.isdir(request.cwd) else None,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": "Command timed out after 30s", "exit_code": -1}
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "exit_code": -1}


@router.post("/agent/file")
async def agent_file(request: AgentFileRequest):
    """Create or write files for the agent."""
    _require_code_execution()
    try:
        if request.action == "mkdir":
            os.makedirs(request.path, exist_ok=True)
            return {"success": True, "message": f"Created directory: {request.path}"}
        elif request.action in ("create", "write"):
            os.makedirs(os.path.dirname(request.path), exist_ok=True)
            with open(request.path, "w", encoding="utf-8") as f:
                f.write(request.content)
            return {"success": True, "message": f"Wrote file: {request.path}"}
        else:
            return {"success": False, "message": f"Unknown action: {request.action}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.get("/agent/read")
async def agent_read(path: str):
    """Read a file for the agent."""
    _require_code_execution()
    try:
        with open(path, encoding="utf-8") as f:
            content = f.read()
        return {"success": True, "content": content}
    except Exception as e:
        return {"success": False, "content": "", "message": str(e)}


@router.get("/agent/list")
async def agent_list(path: str):
    """List directory contents for the agent."""
    _require_code_execution()
    try:
        items = []
        for entry in os.scandir(path):
            items.append({
                "name": entry.name,
                "type": "folder" if entry.is_dir() else "file",
                "path": entry.path,
            })
        items.sort(key=lambda x: (x["type"] != "folder", x["name"].lower()))
        return {"success": True, "items": items}
    except Exception as e:
        return {"success": False, "items": [], "message": str(e)}
