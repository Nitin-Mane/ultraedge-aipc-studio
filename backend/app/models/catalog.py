import logging
import os
from typing import List, Dict, Any
from app.memory.db import get_db_connection

logger = logging.getLogger("catalog")

CURATED_CATALOG = [
    {
        "id": "Qwen2.5-Omni-3B",
        "name": "Qwen2.5-Omni-3B",
        "family": "Qwen2.5-Omni",
        "feature_type": "personal_assistant",
        "parameter_size": "3B",
        "license": "Apache-2.0",
        "source_url": "https://huggingface.co/Qwen/Qwen2.5-Omni-3B",
        "recommended_device": "GPU",
        "ram_required_gb": 12.0,
        "precision_options": ["FP16", "INT4"],
        "profile": "balanced",
        "npu_status": "supported",
        "hf_model_id": "Qwen/Qwen2.5-Omni-3B",
        "conversion_method": "optimum-cli",
        "task": "image-text-to-text",
    },
    {
        "id": "qwen3_6_1_5b_instruct",
        "name": "Qwen3.6-1.5B-Instruct",
        "family": "Qwen3.6-Text",
        "feature_type": "personal_assistant",
        "parameter_size": "1.5B",
        "license": "Apache-2.0",
        "source_url": "https://huggingface.co/Qwen/Qwen3.6-1.5B-Instruct",
        "recommended_device": "GPU",
        "ram_required_gb": 8.0,
        "precision_options": ["FP16", "INT8", "INT4"],
        "profile": "fast",
        "npu_status": "supported",
        "hf_model_id": "Qwen/Qwen3-1.5B",
        "conversion_method": "optimum-cli",
        "task": "text-generation-with-past",
    },
    {
        "id": "qwen3_6_7b_instruct",
        "name": "Qwen3.6-7B-Instruct",
        "family": "Qwen3.6-Text",
        "feature_type": "personal_assistant",
        "parameter_size": "7B",
        "license": "Apache-2.0",
        "source_url": "https://huggingface.co/Qwen/Qwen3.6-7B-Instruct",
        "recommended_device": "GPU",
        "ram_required_gb": 16.0,
        "precision_options": ["FP16", "INT8", "INT4"],
        "profile": "balanced",
        "npu_status": "unknown",
        "hf_model_id": "Qwen/Qwen3-8B",
        "conversion_method": "optimum-cli",
        "task": "text-generation-with-past",
    },
    {
        "id": "qwen3_coder_1_5b",
        "name": "Qwen3-Coder-1.5B-Instruct",
        "family": "Qwen3-Coder",
        "feature_type": "coding_agent",
        "parameter_size": "1.5B",
        "license": "Apache-2.0",
        "source_url": "https://huggingface.co/Qwen/Qwen3-Coder-1.5B-Instruct",
        "recommended_device": "GPU",
        "ram_required_gb": 8.0,
        "precision_options": ["FP16", "INT8", "INT4"],
        "profile": "balanced",
        "npu_status": "supported",
        "hf_model_id": "Qwen/Qwen3-Coder-1.5B-Instruct",
        "conversion_method": "optimum-cli",
        "task": "text-generation-with-past",
    },
    {
        "id": "Qwen2.5-Coder-1.5B-Instruct-ov-int4",
        "name": "Qwen2.5-Coder-1.5B-Instruct",
        "family": "Qwen2.5-Coder",
        "feature_type": "coding_agent",
        "parameter_size": "1.5B",
        "license": "Apache-2.0",
        "source_url": "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct",
        "recommended_device": "GPU",
        "ram_required_gb": 8.0,
        "precision_options": ["INT4"],
        "profile": "balanced",
        "npu_status": "supported",
        "hf_model_id": "Qwen/Qwen2.5-Coder-1.5B-Instruct",
        "conversion_method": "openvino",
        "task": "text-generation-with-past",
    },
    {
        "id": "qwen3_coder_7b",
        "name": "Qwen3-Coder-7B-Instruct",
        "family": "Qwen3-Coder",
        "feature_type": "coding_agent",
        "parameter_size": "7B",
        "license": "Apache-2.0",
        "source_url": "https://huggingface.co/Qwen/Qwen3-Coder-7B-Instruct",
        "recommended_device": "GPU",
        "ram_required_gb": 16.0,
        "precision_options": ["FP16", "INT8", "INT4"],
        "profile": "workstation",
        "npu_status": "unknown",
        "hf_model_id": "Qwen/Qwen3-Coder-7B-Instruct",
        "conversion_method": "optimum-cli",
        "task": "text-generation-with-past",
    },
    {
        "id": "qwen3_embedding_0_6b",
        "name": "Qwen3-Embedding-0.6B",
        "family": "Qwen3-Embedding",
        "feature_type": "rag_embedding",
        "parameter_size": "0.6B",
        "license": "Apache-2.0",
        "source_url": "https://huggingface.co/Qwen/Qwen3-Embedding-0.6B",
        "recommended_device": "NPU",
        "ram_required_gb": 4.0,
        "precision_options": ["FP16", "INT8"],
        "profile": "default",
        "npu_status": "supported",
        "hf_model_id": "Qwen/Qwen3-Embedding-0.6B",
        "conversion_method": "optimum-cli",
        "task": "feature-extraction",
    },
    {
        "id": "qwen3_reranker_0_6b",
        "name": "Qwen3-Reranker-0.6B",
        "family": "Qwen3-Embedding",
        "feature_type": "rag_reranker",
        "parameter_size": "0.6B",
        "license": "Apache-2.0",
        "source_url": "https://huggingface.co/Qwen/Qwen3-Reranker-0.6B",
        "recommended_device": "NPU",
        "ram_required_gb": 4.0,
        "precision_options": ["FP16", "INT8"],
        "profile": "default",
        "npu_status": "supported",
        "hf_model_id": "Qwen/Qwen3-Reranker-0.6B",
        "conversion_method": "optimum-cli",
        "task": "text-classification",
    },
    {
        "id": "qwen3_vl_7b",
        "name": "Qwen3-VL-7B-Instruct",
        "family": "Qwen3-VL",
        "feature_type": "vision_assistant",
        "parameter_size": "7B",
        "license": "Apache-2.0",
        "source_url": "https://huggingface.co/Qwen/Qwen3-VL-7B-Instruct",
        "recommended_device": "GPU",
        "ram_required_gb": 16.0,
        "precision_options": ["FP16", "INT4"],
        "profile": "default",
        "npu_status": "unknown",
        "hf_model_id": "Qwen/Qwen3-VL-7B-Instruct",
        "conversion_method": "optimum-cli",
        "task": "image-text-to-text",
    },
    {
        "id": "qwen3_asr_0_6b",
        "name": "Qwen3-ASR-0.6B",
        "family": "Qwen3-Audio",
        "feature_type": "voice_input",
        "parameter_size": "0.6B",
        "license": "Apache-2.0",
        "source_url": "https://huggingface.co/Qwen/Qwen3-ASR-0.6B",
        "recommended_device": "NPU",
        "ram_required_gb": 4.0,
        "precision_options": ["FP16", "INT8"],
        "profile": "default",
        "npu_status": "supported",
        "hf_model_id": "Qwen/Qwen3-ASR-0.6B",
        "conversion_method": "optimum-cli",
        "task": "automatic-speech-recognition",
    },
    {
        "id": "qwen3_tts_0_6b",
        "name": "Qwen3-TTS-0.6B",
        "family": "Qwen3-Audio",
        "feature_type": "voice_output",
        "parameter_size": "0.6B",
        "license": "Apache-2.0",
        "source_url": "https://huggingface.co/Qwen/Qwen3-TTS-0.6B",
        "recommended_device": "NPU",
        "ram_required_gb": 4.0,
        "precision_options": ["FP16", "INT8"],
        "profile": "default",
        "npu_status": "supported",
        "hf_model_id": "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
        "conversion_method": "optimum-cli",
        "task": "text-to-speech",
    },
    {
        "id": "qwen3guard_0_6b",
        "name": "Qwen3Guard-0.6B",
        "family": "Qwen3-Safety",
        "feature_type": "safety_layer",
        "parameter_size": "0.6B",
        "license": "Apache-2.0",
        "source_url": "https://huggingface.co/Qwen/Qwen3Guard-0.6B",
        "recommended_device": "NPU",
        "ram_required_gb": 4.0,
        "precision_options": ["FP16", "INT8"],
        "profile": "default",
        "npu_status": "supported",
        "hf_model_id": "Qwen/Qwen3-Guard-0.6B",
        "conversion_method": "optimum-cli",
        "task": "text-classification",
    },
]

def sync_catalog_to_registry():
    """
    Ensures all curated catalog items are in the model_registry database table.
    Does not overwrite user-customized properties (like local paths or user download status).
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    from datetime import datetime
    
    for item in CURATED_CATALOG:
        cursor.execute("SELECT recommended_device FROM model_registry WHERE id = ?", (item["id"],))
        row = cursor.fetchone()
        if not row:
            cursor.execute("""
                INSERT INTO model_registry (
                    id, name, family, feature_type, parameter_size, license, source_url, 
                    status, recommended_device, ram_required_gb, precision_options, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item["id"],
                item["name"],
                item["family"],
                item["feature_type"],
                item["parameter_size"],
                item["license"],
                item["source_url"],
                "not_installed",
                item["recommended_device"],
                item["ram_required_gb"],
                ",".join(item.get("precision_options", ["FP16", "INT8", "INT4"])),
                datetime.now().isoformat(),
                datetime.now().isoformat()
            ))
        else:
            if row["recommended_device"] != item["recommended_device"]:
                cursor.execute("""
                    UPDATE model_registry 
                    SET recommended_device = ?, updated_at = ?
                    WHERE id = ?
                """, (item["recommended_device"], datetime.now().isoformat(), item["id"]))
    conn.commit()
    conn.close()

def get_registry_models() -> List[Dict[str, Any]]:
    sync_catalog_to_registry()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Self-healing status updates based on actual model files existence
    cursor.execute("SELECT id FROM model_registry")
    model_ids = [r["id"] for r in cursor.fetchall()]
    
    from datetime import datetime
    models_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "models"))
    
    from app.models.availability import resolve_model_dir
    for mid in model_ids:
        if resolve_model_dir(mid) is not None:
            cursor.execute(
                "UPDATE model_registry SET status = 'ready', updated_at = ? WHERE id = ? AND status != 'ready'",
                (datetime.now().isoformat(), mid)
            )
        else:
            # Artifacts gone from disk → back to NOT_INSTALLED (doc 10 state model)
            cursor.execute(
                "UPDATE model_registry SET status = 'not_installed', updated_at = ? WHERE id = ? AND status = 'ready'",
                (datetime.now().isoformat(), mid)
            )
    conn.commit()
    
    # Use individual column access to avoid KeyError on missing columns
    cursor.execute("PRAGMA table_info(model_registry)")
    available_columns = {col["name"] for col in cursor.fetchall()}
    
    # Build select columns dynamically
    base_cols = ["r.id", "r.name", "r.family", "r.feature_type", "r.parameter_size", "r.license",
                 "r.source_url", "r.original_path", "r.openvino_path", "r.precision", "r.status",
                 "r.recommended_device", "r.ram_required_gb", "r.checksum", "r.created_at", "r.updated_at"]
    
    if "precision_options" in available_columns:
        base_cols.append("r.precision_options")
    else:
        base_cols.append("'FP16,INT8,INT4' as precision_options")
    
    if "npu_status" in available_columns:
        base_cols.append("r.npu_status")
    else:
        base_cols.append("'unknown' as npu_status")
    
    select_clause = ", ".join(base_cols)
    
    cursor.execute(f"""
        SELECT {select_clause},
               j.progress, j.message as job_message, j.status as job_status
        FROM model_registry r
        LEFT JOIN (
            SELECT model_id, progress, message, status, started_at,
                   ROW_NUMBER() OVER (PARTITION BY model_id ORDER BY started_at DESC) as rn
            FROM model_jobs
            WHERE job_type = 'prepare'
        ) j ON r.id = j.model_id AND j.rn = 1
    """)
    rows = [dict(r) for r in cursor.fetchall()]  # sqlite3.Row lacks .get()
    
    # Get latest benchmark results for each model
    benchmark_map = {}
    try:
        cursor.execute("""
            SELECT model_id, device, precision, first_token_latency_ms, tokens_per_second,
                   model_load_time_ms, ram_used_mb, gpu_used_mb, npu_status
            FROM benchmark_results
            WHERE rowid IN (
                SELECT MAX(rowid) FROM benchmark_results GROUP BY model_id
            )
        """)
        benchmark_rows = cursor.fetchall()
        benchmark_map = {r["model_id"]: dict(r) for r in benchmark_rows}
    except Exception as e:
        logger.warning(f"Benchmark query failed: {e}")
    
    conn.close()
    
    # Get catalog config for hf_model_id and conversion info
    catalog_config = {item["id"]: item for item in CURATED_CATALOG}
    
    models = []
    for r in rows:
        status_val = "not-installed" if r["status"] == "not_installed" else r["status"]
        cat = catalog_config.get(r["id"], {})
        bench = benchmark_map.get(r["id"], {})
        
        # Get disk size (resolved across scan roots and folder aliases)
        model_dir = resolve_model_dir(r["id"]) or os.path.join(models_root, r["id"])
        size_gb = 0
        if os.path.isdir(model_dir):
            for root, dirs, files in os.walk(model_dir):
                for f in files:
                    fp = os.path.join(root, f)
                    if os.path.isfile(fp):
                        try:
                            size_gb += os.path.getsize(fp)
                        except OSError:
                            pass
            size_gb = round(size_gb / (1024 ** 3), 2)
        
        models.append({
            "id": r["id"],
            "name": r["name"],
            "family": r["family"],
            "feature_type": r["feature_type"],
            "featureType": r["feature_type"],
            "parameter_size": r["parameter_size"],
            "parameterSize": r["parameter_size"],
            "license": r["license"],
            "source_url": r["source_url"],
            "sourceUrl": r["source_url"],
            "original_path": r["original_path"],
            "openvino_path": r["openvino_path"],
            "precision": r["precision"],
            "precisionOptions": r["precision_options"].split(",") if r["precision_options"] else cat.get("precision_options", ["FP16", "INT8", "INT4"]),
            "status": status_val,
            "state": status_val,
            "openvinoStatus": "converted" if r["status"] == "ready" else status_val,
            "benchmarkStatus": "completed" if bench else "not-run",
            "recommended_device": r["recommended_device"],
            "recommendedDevice": r["recommended_device"],
            "ram_required_gb": r["ram_required_gb"],
            "recommendedRamGb": int(r["ram_required_gb"]) if r["ram_required_gb"] else 0,
            "npuStatus": r.get("npu_status", cat.get("npu_status", "unknown")),
            "checksum": r["checksum"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "progress": r["progress"] if r["progress"] is not None else (100 if r["status"] == "ready" else 0),
            "jobMessage": r["job_message"] if r["job_message"] is not None else "",
            "jobStatus": r["job_status"] if r["job_status"] is not None else "",
            "diskSizeGb": size_gb,
            "lastUpdated": r["updated_at"][:10] if r["updated_at"] else "",
            "hfModelId": cat.get("hf_model_id", ""),
            "conversionMethod": cat.get("conversion_method", ""),
            "task": cat.get("task", ""),
            # Benchmark data
            "benchmark": {
                "device": bench.get("device", ""),
                "precision": bench.get("precision", ""),
                "firstTokenLatency": bench.get("first_token_latency_ms", 0),
                "tokensPerSecond": bench.get("tokens_per_second", 0),
                "loadTimeMs": bench.get("model_load_time_ms", 0),
                "ramUsedMb": bench.get("ram_used_mb", 0),
                "gpuUsedMb": bench.get("gpu_used_mb", 0),
                "npuStatus": bench.get("npu_status", ""),
            } if bench else None,
        })

    # Only surface models actually on disk (READY per doc 10), plus any with a
    # preparation job in flight so the prepare flow stays visible end-to-end.
    # RAG aux models (embedder/reranker) are hidden for beta — RAG is disabled.
    _active_jobs = ("queued", "running")
    _hidden_features = ("rag_embedding", "rag_reranker")
    return [m for m in models
            if m["feature_type"] not in _hidden_features
            and (m["status"] == "ready" or m["jobStatus"] in _active_jobs)]

def recommend_models(feature_type: str, performance_profile: str, hardware_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recommends matching models from the registry based on hardware limitations.
    """
    sync_catalog_to_registry()
    models = get_registry_models()
    
    # Filter by feature_type
    matched = [m for m in models if m["feature_type"] == feature_type or feature_type == "all"]
    if not matched:
        # Fallback to general assistants if specific feature type not matches
        matched = [m for m in models if m["feature_type"] == "personal_assistant"]

    total_ram = hardware_info.get("ram_total_gb", 16.0)
    has_gpu = "GPU" in hardware_info.get("supported_devices", [])
    has_npu = "NPU" in hardware_info.get("supported_devices", [])
    
    recommendations = []
    warnings = []
    
    for m in matched:
        score = 0
        recom_dev = m["recommended_device"]
        
        # Check RAM safety
        if m["ram_required_gb"] > total_ram:
            warnings.append(f"Model {m['name']} requires {m['ram_required_gb']}GB RAM, but system only has {total_ram}GB. Execution may be slow or fail.")
            
        # Device adjustment: prefer GPU or NPU, don't divert to CPU unless neither GPU nor NPU is active/available
        device_target = "CPU"
        if recom_dev == "GPU":
            if has_gpu:
                device_target = "GPU"
            elif has_npu:
                device_target = "NPU"
        elif recom_dev == "NPU":
            if has_npu:
                device_target = "NPU"
            elif has_gpu:
                device_target = "GPU"
            
        # Match profile
        # If user wants fast, they prefer smaller param sizes (e.g. <= 1.5B)
        param_float = 1.5
        try:
            param_float = float(m["parameter_size"].replace("B", ""))
        except:
            pass
            
        if performance_profile == "fast" and param_float <= 2.0:
            score += 10
        elif performance_profile == "balanced" and 1.0 <= param_float <= 8.0:
            score += 10
        elif performance_profile == "quality" and param_float >= 7.0:
            score += 10
            
        # Doc-11 outputs: risk from RAM headroom, fallback chain GPU→NPU→CPU
        risk_level = "high" if m["ram_required_gb"] > total_ram else (
            "medium" if m["ram_required_gb"] > total_ram * 0.6 else "low")
        fallback_device = "NPU" if device_target == "GPU" and has_npu else "CPU"

        recommendations.append({
            "model": m,
            "target_device": device_target,
            "score": score,
            "risk_level": risk_level,
            "fallback_device": fallback_device,
            "reason": f"Recommended on {device_target} for {performance_profile} profile. Fits within {total_ram}GB system RAM."
        })
        
    # Sort recommendations by score descending
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "recommended_models": [r["model"] for r in recommendations],
        "reason": f"Profile matches hardware configuration with {total_ram}GB RAM.",
        "warnings": list(set(warnings))
    }
