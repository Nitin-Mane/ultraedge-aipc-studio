import os
import subprocess
import logging
import time
from typing import Optional, Dict, Any
from huggingface_hub import snapshot_download, hf_hub_download
from app.memory.db import get_db_connection, log_audit

logger = logging.getLogger("downloader")

# Model conversion configurations from Qwen_OpenVINO scripts
MODEL_CONVERSION_CONFIGS = {
    # Vision-Language models (optimum-cli)
    "qwen3_vl_4b": {
        "hf_model_id": "Qwen/Qwen3-VL-4B-Instruct",
        "conversion_method": "optimum-cli",
        "task": "image-text-to-text",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 0.8, "sym": False},
    },
    "qwen3_vl_7b": {
        "hf_model_id": "Qwen/Qwen3-VL-7B-Instruct",
        "conversion_method": "optimum-cli",
        "task": "image-text-to-text",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 0.8, "sym": False},
    },
    "qwen3_vl_8b": {
        "hf_model_id": "Qwen/Qwen3-VL-8B-Instruct",
        "conversion_method": "optimum-cli",
        "task": "image-text-to-text",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 0.8, "sym": False},
    },
    "qwen25_vl_3b": {
        "hf_model_id": "Qwen/Qwen2.5-VL-3B-Instruct",
        "conversion_method": "optimum-cli",
        "task": "image-text-to-text",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 0.8, "sym": False},
    },
    "qwen25_vl_7b": {
        "hf_model_id": "Qwen/Qwen2.5-VL-7B-Instruct",
        "conversion_method": "optimum-cli",
        "task": "image-text-to-text",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 0.8, "sym": False},
    },
    "qwen2_vl_2b": {
        "hf_model_id": "Qwen/Qwen2-VL-2B-Instruct",
        "conversion_method": "optimum-cli",
        "task": "image-text-to-text",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 0.8, "sym": False},
    },
    "qwen2_vl_7b": {
        "hf_model_id": "Qwen/Qwen2-VL-7B-Instruct",
        "conversion_method": "optimum-cli",
        "task": "image-text-to-text",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 0.8, "sym": False},
    },
    # Omni models (optimum-cli)
    "qwen25_omni_7b": {
        "hf_model_id": "Qwen/Qwen2.5-Omni-7B",
        "conversion_method": "optimum-cli",
        "task": "image-text-to-text",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 0.8, "sym": False},
    },
    # ASR models (optimum-cli)
    "qwen3_asr_0_6b": {
        "hf_model_id": "Qwen/Qwen3-ASR-0.6B",
        "conversion_method": "optimum-cli",
        "task": "automatic-speech-recognition",
        "default_precision": "int8",
        "quantization": None,
    },
    "qwen3_asr_1_7b": {
        "hf_model_id": "Qwen/Qwen3-ASR-1.7B",
        "conversion_method": "optimum-cli",
        "task": "automatic-speech-recognition",
        "default_precision": "int8",
        "quantization": None,
    },
    # TTS models (optimum-cli)
    "qwen3_tts_0_6b": {
        "hf_model_id": "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
        "conversion_method": "optimum-cli",
        "task": "text-to-speech",
        "default_precision": "int8",
        "quantization": None,
    },
    "qwen3_tts_1_7b": {
        "hf_model_id": "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        "conversion_method": "optimum-cli",
        "task": "text-to-speech",
        "default_precision": "int8",
        "quantization": None,
    },
    # Embedding models (optimum-cli)
    "qwen3_embedding_0_6b": {
        "hf_model_id": "Qwen/Qwen3-Embedding-0.6B",
        "conversion_method": "optimum-cli",
        "task": "feature-extraction",
        "default_precision": "int8",
        "quantization": None,
    },
    "qwen3_embedding_4b": {
        "hf_model_id": "Qwen/Qwen3-Embedding-4B",
        "conversion_method": "optimum-cli",
        "task": "feature-extraction",
        "default_precision": "int8",
        "quantization": None,
    },
    "qwen3_embedding_8b": {
        "hf_model_id": "Qwen/Qwen3-Embedding-8B",
        "conversion_method": "optimum-cli",
        "task": "feature-extraction",
        "default_precision": "int8",
        "quantization": None,
    },
    # Reranker models (optimum-cli)
    "qwen3_reranker_0_6b": {
        "hf_model_id": "Qwen/Qwen3-Reranker-0.6B",
        "conversion_method": "optimum-cli",
        "task": "text-classification",
        "default_precision": "fp16",
        "quantization": None,
    },
    "qwen3_reranker_4b": {
        "hf_model_id": "Qwen/Qwen3-Reranker-4B",
        "conversion_method": "optimum-cli",
        "task": "text-classification",
        "default_precision": "fp16",
        "quantization": None,
    },
    "qwen3_reranker_8b": {
        "hf_model_id": "Qwen/Qwen3-Reranker-8B",
        "conversion_method": "optimum-cli",
        "task": "text-classification",
        "default_precision": "fp16",
        "quantization": None,
    },
    # Image generation models (optimum-cli)
    "qwen_image": {
        "hf_model_id": "Qwen/Qwen-Image",
        "conversion_method": "optimum-cli",
        "task": "text-to-image",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 0.8, "sym": False},
    },
    # LLM Agent models (optimum-cli)
    "llm_agent_functioncall": {
        "hf_model_id": "Qwen/Qwen3-Coder-7B-Instruct",
        "conversion_method": "optimum-cli",
        "task": "text-generation-with-past",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 1.0, "sym": True},
    },
    "llm_agent_mcp": {
        "hf_model_id": "Qwen/Qwen3-Coder-7B-Instruct",
        "conversion_method": "optimum-cli",
        "task": "text-generation-with-past",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 1.0, "sym": True},
    },
    "llm_agent_react": {
        "hf_model_id": "Qwen/Qwen3-Coder-7B-Instruct",
        "conversion_method": "optimum-cli",
        "task": "text-generation-with-past",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 1.0, "sym": True},
    },
    # Text LLM models (optimum-cli)
    "qwen3_6_1_5b_instruct": {
        "hf_model_id": "Qwen/Qwen3-1.5B",
        "conversion_method": "optimum-cli",
        "task": "text-generation-with-past",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 0.8, "sym": False},
    },
    "qwen3_6_7b_instruct": {
        "hf_model_id": "Qwen/Qwen3-8B",
        "conversion_method": "optimum-cli",
        "task": "text-generation-with-past",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 0.8, "sym": False},
    },
    # Omni 3B
    "Qwen2.5-Omni-3B": {
        "hf_model_id": "Qwen/Qwen2.5-Omni-3B",
        "conversion_method": "optimum-cli",
        "task": "image-text-to-text",
        "default_precision": "int4",
        "quantization": {"group_size": 128, "ratio": 0.8, "sym": False},
    },
    # Qwen3Guard
    "qwen3guard_0_6b": {
        "hf_model_id": "Qwen/Qwen3-Guard-0.6B",
        "conversion_method": "optimum-cli",
        "task": "text-classification",
        "default_precision": "int8",
        "quantization": None,
    },
}


def get_conversion_config(model_id: str) -> Optional[Dict[str, Any]]:
    """Get conversion configuration for a model."""
    return MODEL_CONVERSION_CONFIGS.get(model_id)


def build_optimum_cli_command(
    hf_model_id: str,
    output_dir: str,
    task: str = "text-generation-with-past",
    weight_format: str = "int4",
    quantization: Optional[Dict] = None,
    trust_remote_code: bool = False
) -> str:
    """Build the optimum-cli export command based on Qwen_OpenVINO scripts."""
    command = f'optimum-cli export openvino --model {hf_model_id} --task {task} --weight-format {weight_format}'

    if quantization:
        if "group_size" in quantization and "ratio" in quantization:
            command += f' --group-size {quantization["group_size"]} --ratio {quantization["ratio"]}'
        if quantization.get("sym", False):
            command += ' --sym'

    if trust_remote_code:
        command += ' --trust-remote-code'

    command += f' {output_dir}'
    return command


def download_model_files(
    model_id: str,
    hf_model_id: str,
    target_dir: str,
    progress_callback=None
) -> Dict[str, Any]:
    """
    Download model files from HuggingFace Hub.
    Returns dict with status and downloaded path.
    """
    try:
        logger.info(f"Starting download of model {model_id} from {hf_model_id}")
        os.makedirs(target_dir, exist_ok=True)

        if progress_callback:
            progress_callback(5, "Starting download from HuggingFace Hub...")

        # Download the full snapshot
        downloaded_path = snapshot_download(
            repo_id=hf_model_id,
            local_dir=target_dir,
            local_dir_use_symlinks=False,
        )

        if progress_callback:
            progress_callback(40, "Download complete. Verifying files...")

        # Verify download
        if os.path.isdir(downloaded_path):
            file_count = sum(len(files) for _, _, files in os.walk(downloaded_path))
            logger.info(f"Downloaded {file_count} files to {downloaded_path}")

            if progress_callback:
                progress_callback(45, f"Downloaded {file_count} files successfully.")

            return {
                "status": "success",
                "path": downloaded_path,
                "file_count": file_count
            }
        else:
            return {"status": "error", "message": f"Download path not found: {downloaded_path}"}

    except Exception as e:
        logger.error(f"Download failed for {model_id}: {str(e)}")
        return {"status": "error", "message": str(e)}


def convert_to_openvino(
    model_id: str,
    source_dir: str,
    output_dir: str,
    precision: str = "int4",
    progress_callback=None
) -> Dict[str, Any]:
    """
    Convert downloaded model to OpenVINO format using optimum-cli.
    """
    config = get_conversion_config(model_id)

    if not config:
        # Fallback: try generic conversion
        config = {
            "hf_model_id": model_id,
            "conversion_method": "optimum-cli",
            "task": "text-generation-with-past",
            "default_precision": precision,
            "quantization": {"group_size": 128, "ratio": 0.8, "sym": False} if precision == "int4" else None,
        }

    if progress_callback:
        progress_callback(50, f"Converting to OpenVINO with {precision.upper()} precision...")

    try:
        # Build conversion command
        command = build_optimum_cli_command(
            hf_model_id=config["hf_model_id"],
            output_dir=output_dir,
            task=config.get("task", "text-generation-with-past"),
            weight_format=precision,
            quantization=config.get("quantization") if precision == "int4" else None,
            trust_remote_code=True,
        )

        logger.info(f"Running conversion command: {command}")

        if progress_callback:
            progress_callback(55, "Running optimum-cli export...")

        # Execute the conversion command
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=3600,  # 1 hour timeout
            cwd=os.path.dirname(output_dir),
        )

        if result.returncode != 0:
            logger.error(f"Conversion failed: {result.stderr}")
            return {"status": "error", "message": result.stderr}

        if progress_callback:
            progress_callback(80, "Conversion complete. Verifying OpenVINO model...")

        # Verify conversion output
        xml_path = os.path.join(output_dir, "openvino_model.xml")
        if os.path.exists(xml_path):
            logger.info(f"Conversion successful: {xml_path}")
            return {"status": "success", "output_path": xml_path}
        else:
            # Check for subdirectory structure
            for root, dirs, files in os.walk(output_dir):
                for f in files:
                    if f.endswith('.xml') and 'openvino' in f.lower():
                        return {"status": "success", "output_path": os.path.join(root, f)}

            return {"status": "error", "message": "Conversion completed but OpenVINO model files not found"}

    except subprocess.TimeoutExpired:
        return {"status": "error", "message": "Conversion timed out after 1 hour"}
    except Exception as e:
        logger.error(f"Conversion failed: {str(e)}")
        return {"status": "error", "message": str(e)}


def get_model_disk_size(model_dir: str) -> float:
    """Get the total size of a model directory in GB."""
    total_size = 0
    if os.path.isdir(model_dir):
        for root, dirs, files in os.walk(model_dir):
            for f in files:
                fp = os.path.join(root, f)
                if os.path.isfile(fp):
                    total_size += os.path.getsize(fp)
    return round(total_size / (1024 ** 3), 2)


def check_model_downloaded(model_id: str) -> Dict[str, Any]:
    """Check if a model is already downloaded and converted."""
    models_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "models"))
    model_dir = os.path.join(models_root, model_id)

    if not os.path.isdir(model_dir):
        return {"downloaded": False, "converted": False, "size_gb": 0}

    # Check for OpenVINO model files
    has_openvino = False
    for root, dirs, files in os.walk(model_dir):
        for f in files:
            if f.endswith('.xml') and 'openvino' in f.lower():
                has_openvino = True
                break
        if has_openvino:
            break

    size_gb = get_model_disk_size(model_dir)

    return {
        "downloaded": True,
        "converted": has_openvino,
        "size_gb": size_gb,
        "path": model_dir
    }
