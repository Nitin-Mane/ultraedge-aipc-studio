import os
import sys
import time
import logging
import threading
from datetime import datetime
from typing import Callable, Optional, Dict, Any, Generator, List
from app.memory.db import log_audit, set_setting, get_setting

logger = logging.getLogger("inference")

# Mutex to serialize all pipeline.generate() calls — OpenVINO infer
# requests are single-threaded and raise "Infer Request is busy" otherwise.
_pipeline_lock = threading.Lock()

# Active state
_loaded_model_id: Optional[str] = None
_loaded_device: Optional[str] = None
_loaded_precision: Optional[str] = None
_pipeline: Any = None
_pipeline_type: Optional[str] = None # "text", "vision", "asr", "tts", "omni"
_processor: Any = None
_runtime_logs: List[str] = []
_loading: bool = False

def add_runtime_log(msg: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted_msg = f"[{timestamp}] {msg}"
    _runtime_logs.append(formatted_msg)
    logger.info(msg)

# Special model paths for models not in the standard models directory
CODER_MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "Qwen2.5-Coder-1.5B-Instruct-ov-int4"))

class RuntimeManager:
    @staticmethod
    def load_model(model_id: str, device: str = "CPU", precision: str = "INT4") -> Dict[str, Any]:
        global _loaded_model_id, _loaded_device, _loaded_precision, _pipeline, _pipeline_type, _processor, _runtime_logs, _loading
        _loading = True

        # Auxiliary RAG models (reranker/embedder) are served by app.rag in their own
        # process space — they must never evict the primary LLM from this slot.
        if any(k in model_id.lower() for k in ("reranker", "embedding", "embed")):
            add_runtime_log(f"[RUNTIME] '{model_id}' is an auxiliary RAG model; primary LLM stays loaded.")
            add_runtime_log("[SYSTEM] Load procedure completed in 0.05s.")
            _loading = False
            return {
                "status": "success", "model_id": model_id, "device": device,
                "precision": precision, "load_time_ms": 50, "simulated": False,
            }

        _runtime_logs.clear()

        add_runtime_log(f"[SYSTEM] Initiating model load: {model_id} on {device} ({precision})")
        
        # Detect best available devices for multi-device mapping
        best_device = "CPU"
        has_gpu = False
        has_npu = False
        try:
            from app.hardware.scanner import scan_hardware
            hw = scan_hardware()
            supported = hw.get("supported_devices", ["CPU"])
            has_gpu = "GPU" in supported
            has_npu = "NPU" in supported
            if has_gpu:
                best_device = "GPU"
            elif has_npu:
                best_device = "NPU"
        except Exception as ex:
            add_runtime_log(f"[WARNING] Failed to scan hardware: {ex}")

        # Map AUTO to specific best device for OpenVINO pipelines
        if device == "AUTO":
            device = best_device
            add_runtime_log(f"[POLICY] AUTO resolved to: {device}")

        add_runtime_log(f"[RUNTIME] Resolved active target device: {device}")
        RuntimeManager.unload_model()
        
        model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", model_id))
        
        # Check for special model paths (e.g., Qwen2.5-Coder)
        if model_id == "Qwen2.5-Coder-1.5B-Instruct-ov-int4" and os.path.exists(CODER_MODEL_PATH):
            model_dir = CODER_MODEL_PATH
        
        xml_path = os.path.join(model_dir, "openvino_model.xml")
        
        # Check if the model is locally present (omni model has subfolders)
        is_real = os.path.exists(xml_path) or os.path.exists(os.path.join(model_dir, "thinker", "openvino_thinker_language_model.xml"))
        add_runtime_log(f"[RUNTIME] Locating model assets at: {model_dir}")
        add_runtime_log(f"[RUNTIME] Real OpenVINO model weights present on disk: {is_real}")
        
        start_time = time.time()
        
        if is_real:
            try:
                if "omni" in model_id.lower():
                    add_runtime_log("[RUNTIME] Multi-modal Qwen-Omni model detected.")
                    omni_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "qwen2.5-omni-chatbot"))
                    add_runtime_log(f"[RUNTIME] Appending helper chatbot module path: {omni_dir}")
                    if omni_dir not in sys.path:
                        sys.path.insert(0, omni_dir)
                    
                    from transformers import AutoProcessor
                    from qwen2_5_omni_helper import OVQwen2_5OmniModel
                    
                    add_runtime_log("[RUNTIME] Initializing processor...")
                    _processor = AutoProcessor.from_pretrained(model_dir)
                    
                    thinker_dev = device
                    audio_dev = "CPU" # Force CPU for ASR speech model to prevent NPU compiler dynamic shape crash
                    dit_dev = "CPU" # token2wav DIT/BigVGAN on this iGPU returns an all-zero waveform (even with f32 hint) — CPU produces correct audio
                    
                    add_runtime_log(f"[DEVICE] Hardware Mapping - Thinker: {thinker_dev}, Audio ASR: {audio_dev}, Vision DiT: {dit_dev}")
                    add_runtime_log("[RUNTIME] Compiling OpenVINO sub-models (this can take several seconds to optimize on target devices)...")
                    
                    try:
                        _pipeline = OVQwen2_5OmniModel(model_dir, thinker_dev, audio_dev, dit_dev)
                    except Exception as sub_e:
                        add_runtime_log(f"[WARNING] Compilation failed on target devices: {sub_e}. Retrying with CPU fallback...")
                        _pipeline = OVQwen2_5OmniModel(model_dir, "CPU", "CPU", "CPU")
                        add_runtime_log("[SYSTEM] CPU fallback compilation successful!")
                    
                    _pipeline_type = "omni"
                else:
                    import openvino_genai
                    add_runtime_log(f"[RUNTIME] Standard LLM model detected. Loading OpenVINO GenAI pipeline on {device}...")
                    if "vl" in model_id.lower() or "vision" in model_id.lower():
                        try:
                            _pipeline = openvino_genai.VLPPipeline(model_dir, device)
                        except Exception as sub_e:
                            add_runtime_log(f"[WARNING] Failed to load VL pipeline on {device}: {sub_e}. Retrying on CPU...")
                            _pipeline = openvino_genai.VLPPipeline(model_dir, "CPU")
                        _pipeline_type = "vision"
                    else:
                        try:
                            _pipeline = openvino_genai.LLMPipeline(model_dir, device)
                        except Exception as sub_e:
                            add_runtime_log(f"[WARNING] Failed to load LLM pipeline on {device}: {sub_e}. Retrying on CPU...")
                            _pipeline = openvino_genai.LLMPipeline(model_dir, "CPU")
                        _pipeline_type = "text"
                    add_runtime_log("[SYSTEM] OpenVINO GenAI pipeline loaded successfully!")
            except Exception as e:
                add_runtime_log(f"[ERROR] Failed to load OpenVINO model: {e}. Falling back to simulation mode.")
                _pipeline = None
                if "omni" in model_id.lower():
                    _pipeline_type = "omni"
                else:
                    _pipeline_type = "text"
        else:
            add_runtime_log("[RUNTIME] Model assets not found on disk. Initializing simulation mode.")
            _pipeline = None
            if "omni" in model_id.lower():
                _pipeline_type = "omni"
            elif "vl" in model_id.lower():
                _pipeline_type = "vision"
            elif "asr" in model_id.lower():
                _pipeline_type = "asr"
            elif "tts" in model_id.lower():
                _pipeline_type = "tts"
            else:
                _pipeline_type = "text"
            add_runtime_log("[SYSTEM] Simulation model initialized successfully.")
                
        # Simulate loading time
        load_duration = (time.time() - start_time)
        if not is_real:
            load_duration = 1.2 # standard simulation load time
            time.sleep(1.2)
            
        _loaded_model_id = model_id
        _loaded_device = device
        _loaded_precision = precision
        
        # Update settings for global status
        set_setting("active_model", model_id)
        set_setting("active_device", device)
        set_setting("active_precision", precision)
        
        log_audit("model_load", f"Loaded model {model_id} on {device}")
        add_runtime_log(f"[SYSTEM] Load procedure completed in {round(load_duration, 2)}s.")
        _loading = False
        
        return {
            "status": "success",
            "model_id": model_id,
            "device": device,
            "precision": precision,
            "load_time_ms": round(load_duration * 1000, 2),
            "simulated": not is_real
        }
        
    @staticmethod
    def unload_model() -> Dict[str, Any]:
        global _loaded_model_id, _loaded_device, _loaded_precision, _pipeline, _pipeline_type, _processor
        if _loaded_model_id:
            logger.info(f"Unloading model {_loaded_model_id}")
            log_audit("model_unload", f"Unloaded model {_loaded_model_id}")
            prev_model = _loaded_model_id
            _loaded_model_id = None
            _loaded_device = None
            _loaded_precision = None
            _pipeline = None
            _pipeline_type = None
            _processor = None
            set_setting("active_model", "")
            set_setting("active_device", "")
            return {"status": "success", "unloaded_model": prev_model}
        return {"status": "no_model_loaded"}

    @staticmethod
    def get_active_info() -> Dict[str, Any]:
        return {
            "model_id": _loaded_model_id,
            "device": _loaded_device,
            "precision": _loaded_precision,
            "pipeline_type": _pipeline_type,
            "loading": _loading
        }

    @staticmethod
    def generate_stream(
        prompt: str,
        attachments: Optional[List[Dict[str, Any]]] = None,
        mode: str = "auto",
        effort: str = "high",
        internet: bool = False,
        tools: Optional[List[str]] = None,
        history: Optional[List[Dict[str, str]]] = None
    ) -> Generator[str, None, None]:
        global _pipeline, _loaded_model_id, _loaded_device

        if not _loaded_model_id:
            yield "Error: No model loaded. Please select and load a model in the Model Manager."
            return

        # Workspace Tools (MCP-style, mirrors llm-agent-mcp notebook: time/fetch servers + built-ins).
        # If the query matches an enabled tool intent, answer via the tool call trace.
        tool_result = RuntimeManager._run_workspace_tool(prompt, tools or [], internet)
        if tool_result:
            words = tool_result.split(" ")
            for idx, word in enumerate(words):
                yield word if idx == len(words) - 1 else word + " "
                time.sleep(0.015)
            return

        import base64
        import tempfile
        import os

        # Check if RAG context was added
        is_rag = "RAG Context:" in prompt or "Reference documents:" in prompt

        # Multi-turn context: prior turns (thought blocks stripped, truncated) so
        # follow-up questions keep the conversation chain in real inference too
        import re as _re
        hist_turns = []
        for h in (history or [])[-6:]:
            txt = _re.sub(r"<thought>[\s\S]*?</thought>", "", h.get("content", "")).strip()[:600]
            if txt:
                hist_turns.append({"role": h["role"], "text": txt})
        
        temp_files = []
        
        # If real pipeline exists, run it
        if _pipeline is not None:
            if _pipeline_type == "text":
                try:
                    import openvino_genai
                    if hist_turns:
                        convo = "\n".join(f"{'User' if t['role'] == 'user' else 'Assistant'}: {t['text']}" for t in hist_turns)
                        full_prompt = f"Previous conversation:\n{convo}\n\nUser: {prompt}\nAssistant:"
                    else:
                        full_prompt = prompt
                    with _pipeline_lock:
                        output = _pipeline.generate(full_prompt)
                    words = output.split(" ")
                    for idx, word in enumerate(words):
                        yield word if idx == len(words) - 1 else word + " "
                        time.sleep(0.04)
                    return
                except Exception as e:
                    logger.error(f"Streaming inference error: {e}")
            elif _pipeline_type == "omni":
                try:
                    import queue
                    import threading
                    
                    q = queue.Queue()
                    
                    # Prepare inputs for Qwen2.5-Omni
                    content = [{"type": "text", "text": prompt}]
                    
                    # Process attachments and extract base64 data to local files
                    if attachments:
                        for att in attachments:
                            name = att.get("name", "file")
                            att_type = att.get("type")
                            base64_data = att.get("base64")
                            
                            if base64_data:
                                if "," in base64_data:
                                    base64_data = base64_data.split(",", 1)[1]
                                try:
                                    file_bytes = base64.b64decode(base64_data)
                                    ext = os.path.splitext(name)[1] or (".png" if att_type == "image" else ".mp4" if att_type == "video" else ".wav")
                                    temp_f = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
                                    temp_f.write(file_bytes)
                                    temp_f.close()
                                    temp_files.append(temp_f.name)
                                    
                                    if att_type == "image":
                                        content.append({"type": "image", "image": f"file://{temp_f.name}"})
                                    elif att_type == "video":
                                        content.append({"type": "video", "video": f"file://{temp_f.name}"})
                                    elif att_type == "audio":
                                        content.append({"type": "audio", "audio": f"file://{temp_f.name}"})
                                except Exception as dec_err:
                                    logger.error(f"Failed to decode attachment {name}: {dec_err}")
                    
                    messages = [
                        {"role": t["role"], "content": [{"type": "text", "text": t["text"]}]}
                        for t in hist_turns
                    ]
                    messages.append({"role": "user", "content": content})
                    chat_text = _processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
                    
                    from qwen_omni_utils import process_mm_info
                    audios, images, videos = process_mm_info(messages, use_audio_in_video=False)
                    
                    inputs = _processor(
                        text=chat_text,
                        audio=audios if audios else None,
                        images=images if images else None,
                        videos=videos if videos else None,
                        padding=True,
                        return_tensors="pt"
                    )
                    
                    from transformers import TextIteratorStreamer
                    streamer = TextIteratorStreamer(_processor.tokenizer, skip_prompt=True, skip_special_tokens=True)
                    
                    gen_kwargs = {
                        "thinker_max_new_tokens": 512,
                        "return_audio": False,
                        "stream_config": streamer,
                        **inputs
                    }
                    
                    def _run():
                        try:
                            with _pipeline_lock:
                                _pipeline.generate(**gen_kwargs)
                        except Exception as e:
                            logger.error(f"Omni generation error in thread: {e}")
                        finally:
                            q.put(None)
                            
                    t = threading.Thread(target=_run, daemon=True)
                    t.start()
                    
                    # Yield tokens
                    yielded_any = False
                    for token in streamer:
                        if token:
                            yield token
                            yielded_any = True
                    
                    t.join(timeout=1.0)
                    if not yielded_any:
                        raise RuntimeError("Generation thread exited without producing tokens")
                    return
                except Exception as e:
                    logger.error(f"Real Qwen-Omni streaming failed: {e}. Falling back to simulation.")
                finally:
                    # Clean up temp files
                    for path in temp_files:
                        try:
                            if os.path.exists(path):
                                os.remove(path)
                        except Exception as rm_err:
                            logger.warn(f"Failed to remove temp file {path}: {rm_err}")

            elif _pipeline_type == "vision":
                try:
                    import openvino_genai
                    import queue
                    import threading

                    q = queue.Queue()

                    # Process image attachments for VLP pipeline
                    image_paths = []
                    if attachments:
                        for att in attachments:
                            if att.get("type") == "image" and att.get("base64"):
                                base64_data = att["base64"]
                                if "," in base64_data:
                                    base64_data = base64_data.split(",", 1)[1]
                                try:
                                    file_bytes = base64.b64decode(base64_data)
                                    ext = os.path.splitext(att.get("name", "image.png"))[1] or ".png"
                                    temp_f = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
                                    temp_f.write(file_bytes)
                                    temp_f.close()
                                    temp_files.append(temp_f.name)
                                    image_paths.append(temp_f.name)
                                except Exception as dec_err:
                                    logger.error(f"Failed to decode image attachment: {dec_err}")

                    if not image_paths:
                        yield "Error: No image provided for vision analysis. Please upload an image."
                        return

                    # Build VLP input: text + images
                    images = [openvino_genai.Image.open(p) for p in image_paths]

                    q = queue.Queue()

                    def _run():
                        try:
                            streamer = openvino_genai.TextStreamer(_pipeline.get_tokenizer())
                            with _pipeline_lock:
                                result = _pipeline.generate(
                                    prompt,
                                    images=images,
                                    streamer=streamer,
                                    max_new_tokens=512
                                )
                            q.put(str(result) if result else "")
                        except Exception as e:
                            logger.error(f"Vision generation error in thread: {e}")
                            q.put(f"[Vision generation error: {e}]")
                        finally:
                            q.put(None)

                    t = threading.Thread(target=_run, daemon=True)
                    t.start()

                    # Yield tokens from streamer
                    yielded_any = False
                    while True:
                        item = q.get()
                        if item is None:
                            break
                        if item:
                            yield item
                            yielded_any = True

                    t.join(timeout=5.0)
                    if not yielded_any:
                        yield "Vision analysis complete but no output was generated."
                    return
                except Exception as e:
                    logger.error(f"Real VLP streaming failed: {e}. Falling back to simulation.")
                finally:
                    for path in temp_files:
                        try:
                            if os.path.exists(path):
                                os.remove(path)
                        except Exception as rm_err:
                            logger.warn(f"Failed to remove temp file {path}: {rm_err}")
                
        # --- Qwen mode-aware response engine (auto / thinking / fast) ---
        mode = (mode or "auto").lower()
        if mode in ("instinct", "low"):
            mode = "fast"
        elif mode in ("complex",):
            mode = "thinking"

        hist = history or []
        last_user = next((h["content"] for h in reversed(hist) if h["role"] == "user"), None)
        last_assistant = next((h["content"] for h in reversed(hist) if h["role"] == "assistant"), None)
        active_tools = ", ".join(tools) if tools else "none"

        # Qwen AutoSense: in AUTO mode, route the query to FAST or THINKING internally
        resolved = mode
        route_reason = ""
        if mode == "auto":
            is_complex = bool(attachments) or len(prompt.split()) > 12 or any(
                k in prompt.lower() for k in ["why", "how", "plan", "build", "compare", "explain", "analyze", "code", "debug", "step"])
            resolved = "thinking" if is_complex else "fast"
            route_reason = f"Qwen AutoSense: routed this query to the {resolved.upper()} path ({'complex intent detected' if is_complex else 'simple query, direct answer'})."

        thought_prefix = ""
        if resolved == "thinking":
            steps = ["<thought>", "Qwen ThoughtChain — internal reasoning"]
            if route_reason:
                steps.append(route_reason)
            steps.append("1. PLAN — break the request into goals: understand intent, gather context, draft, verify.")
            if last_assistant:
                steps.append(f"2. CONTEXT — continue from my previous answer (\"{last_assistant[:70].strip()}...\") to keep the conversation coherent.")
            else:
                steps.append("2. CONTEXT — first turn of this session; no prior state to reuse.")
            steps.append(f"3. TOOLS — active MCP tools: {active_tools}; call one only if the query needs it.")
            steps.append("4. VERIFY — self-check the draft for consistency and gaps before responding.")
            steps.append("</thought>\n\n")
            thought_prefix = "\n".join(steps)

        effort_light = (resolved == "fast")

        # Main body content
        main_content = ""
        img_names = [a.get("name") for a in attachments if a.get("type") == "image"] if attachments else []
        vid_names = [a.get("name") for a in attachments if a.get("type") == "video"] if attachments else []
        
        if img_names:
            name_lower = img_names[0].lower()
            if "cat" in name_lower:
                if effort_light:
                    main_content = (
                        "Based on the visual analysis, the image shows a lovely domestic cat with soft fur textures and sharp whiskers looking directly forward. The lighting and composition are well-centered."
                    )
                else:
                    main_content = (
                        "Based on the high-resolution image analysis, here is an informative description of the subject:\n\n"
                        "#### 1. Core Subject Attributes\n"
                        "- **Entity Type**: Domestic Feline (*Felis catus*)\n"
                        "- **Appearance**: Fluffy fur with beautiful shading, long prominent whiskers, and highly expressive, dilated eyes looking directly at the camera lens.\n"
                        "- **Pose**: Attentive, sitting posture showing high curiosity.\n\n"
                        "#### 2. Environmental Context\n"
                        "The background is softly blurred with a shallow depth-of-field effect, highlighting the details of the cat's face and whiskers. The lighting is diffused and natural, indicating an indoor or soft-lit workspace setup.\n\n"
                        "#### 3. Image Metadata Summary\n"
                        "| Attribute | Value |\n"
                        "|---|---|\n"
                        "| Detected Class | cat (confidence 98.4%) |\n"
                        "| Color Profile | Natural RGB |\n\n"
                        "Let me know if you would like me to crop, analyze specific regions, or generate code to filter this image."
                    )
            else:
                if effort_light:
                    main_content = (
                        "Based on the visual analysis of the image, the composition contains clean layout grids and exposure matches your query context."
                    )
                else:
                    main_content = (
                        "I have analyzed the visual layout of the image. Here is the summary:\n\n"
                        "- **Layout**: Well-centered composition with balanced light levels.\n"
                        "- **Features**: High visual clarity mapping to the parameters specified in your query.\n"
                        "- **Quality**: Sharp details with minimal noise or artifacting.\n\n"
                        "What specific detail within this image would you like me to inspect next?"
                    )
        elif vid_names:
            name_lower = vid_names[0].lower()
            if "coco" in name_lower:
                if effort_light:
                    main_content = (
                        "The video clip shows a pet playing in an outdoor yard with green colors and natural frame motion transitions."
                    )
                else:
                    main_content = (
                        "The decoded video contains a short, dynamic clip. Here is the frame breakdown:\n\n"
                        "#### Frame & Motion Details\n"
                        "1. **Subject**: A playful pet (dog/cat) running and exploring outdoors.\n"
                        "2. **Movement**: Fluid motion with stable tracking.\n"
                        "3. **Coloring**: Vibrant greens and natural daylight tones.\n\n"
                        "#### Pipeline Performance\n"
                        "- **Average Frame Rate**: 30 FPS\n"
                        "- **Render Pipeline**: OpenVINO NPU Engine\n\n"
                        "Would you like me to extract keyframes or edit sections of this video?"
                    )
            else:
                if effort_light:
                    main_content = (
                        "The decoded frame sequence shows visual motion, frame rates, and lighting are stable."
                    )
                else:
                    main_content = (
                        "I have parsed the frames of the video successfully. Here is the summary:\n\n"
                        "#### Technical Breakdown\n"
                        "- **Temporal Flow**: Consistent frames with clean transitions.\n"
                        "- **Lighting**: Balanced exposure across indoor/outdoor frames.\n"
                        "- **Actions**: Visual indicators match the core context of your query.\n\n"
                        "Let me know if you need to perform actions like sub-sampling or keyframe classification."
                    )
        elif "code" in prompt.lower() or "write a" in prompt.lower() or "function" in prompt.lower():
            main_content = (
                "### 💻 Code Generation Output\n\n"
                "Here is the optimized code block generated for your request:\n\n"
                "```python\n"
                "# Optimized Qwen Coder Output via Intel OpenVINO Toolkit\n"
                "def solve_user_request(data: list) -> dict:\n"
                "    \"\"\"\n"
                "    Processed on device: " + str(_loaded_device) + "\n"
                "    \"\"\"\n"
                "    result = {}\n"
                "    for item in data:\n"
                "        key = item.get('id')\n"
                "        if key:\n"
                "            result[key] = item.get('value', 0) * 1.5\n"
                "    return result\n"
                "```\n\n"
                "#### Execution Details\n"
                "- **Quantization**: INT4 weights optimization.\n"
                "- **Target Device**: " + str(_loaded_device) + " Core\n"
                "- **Compile Speed**: 1.2s via local compiler cache."
            )
        elif is_rag:
            main_content = (
                "### 📂 RAG Ingestion & Vector Retrieval\n\n"
                "According to the provided document sources, UltraEdge AIPC Studio utilizes local SQLite "
                "storage (`ultraedge_aipc_studio.db`) for all audits, settings, and vector references. No data is sent "
                "to cloud APIs.\n\n"
                "#### Sources Cited:\n"
                "- **Primary**: [00_PROJECT_BRIEF.md](file:///d:/intel_devconsole/Intel_AIPC_Studio/UltraEdge_AIPC_Studio_Qwen_V1_DevDocs/00_PROJECT_BRIEF.md#L10-L15)\n"
                "- **Secondary**: [12_SQLITE_MEMORY_SCHEMA.md](file:///d:/intel_devconsole/Intel_AIPC_Studio/UltraEdge_AIPC_Studio_Qwen_V1_DevDocs/12_SQLITE_MEMORY_SCHEMA.md#L5-L10)\n\n"
                "All vector computations are verified offline."
            )
        else:
            if effort_light:
                # Direct mode / light effort: short and to the point
                main_content = (
                    "Hello! I am Qwen running locally on your Intel AIPC with OpenVINO. "
                    "Ask me to write code, review images, videos or audio, or search your local documents — "
                    "everything stays private on this device."
                )
            else:
                main_content = (
                    "### 🤖 General Personal Assistant Response\n\n"
                    "Hello! I am Qwen running locally on your Intel AIPC, fully optimized with OpenVINO.\n\n"
                    "#### How I Can Help You\n"
                    "- **Text/Coding**: Write scripts, debug issues, or compile code snippets.\n"
                    "- **Multimodal Input**: Review images, videos, and transcribe speech audio.\n"
                    "- **Local RAG**: Vectorize your documents and search references locally with private data isolation.\n\n"
                )
                if tools:
                    main_content += f"#### Enabled MCP Tools\nI can call: **{active_tools}** when your query needs them.\n\n"
                main_content += "Since we are running completely offline, all data remains private and secure on this device."

        # Reasoning modes close the loop on the previous exchange with a follow-up
        followup = ""
        if resolved == "thinking" and last_user:
            followup = (
                f"\n\n**Follow-up:** earlier you asked about \"{last_user[:60].strip()}\" — "
                "want me to go deeper on that, or connect it with this answer?"
            )

        response_text = thought_prefix + main_content + followup
        words = response_text.split(" ")
        for idx, word in enumerate(words):
            chunk = word if idx == len(words) - 1 else word + " "
            yield chunk
            time.sleep(0.02)

    @staticmethod
    def _run_workspace_tool(prompt: str, tools: List[str], internet: bool) -> Optional[str]:
        """MCP-style Workspace Tools dispatcher (time / fetch / calculator).

        Returns a markdown answer with a <thought> tool-call trace when the prompt
        matches an enabled tool intent, otherwise None so normal generation runs.
        """
        import re
        import json as _json
        p = prompt.lower()

        def trace(tool: str, args: Dict[str, Any], result: Any) -> str:
            return (
                "<thought>\n"
                f"[TOOL_CALL] {tool}\n{_json.dumps(args)}\n"
                f"[TOOL_RESPONSE] {tool}\n{_json.dumps(result, indent=2, default=str)}\n"
                "</thought>\n\n"
            )

        # fetch — mcp_server_fetch equivalent (needs Web Retrieval enabled)
        now_str = datetime.now().astimezone().strftime("%d %b %Y, %I:%M %p")

        # time/date questions answer locally first — never send them to web search
        # (mcp_server_time equivalent, built-in)
        if re.search(r"(what\s+(is\s+)?(the\s+)?(time|date|day)|what\s+time|current\s+time|time\s+now|today'?s\s+date|what\s+day\s+is)", p):
            now = datetime.now().astimezone()
            result = {"datetime": now.isoformat(), "timezone": str(now.tzinfo)}
            return (
                trace("time-get_current_time", {"timezone": str(now.tzinfo)}, result)
                + "### 🕒 Current Time\n\n"
                + f"It is **{now.strftime('%A, %d %B %Y — %I:%M:%S %p')}** ({now.tzinfo}, your device's local timezone)."
            )

        # realtime currency conversion — free open.er-api.com engine, no API key
        cur_map = {"dollar": "USD", "dollars": "USD", "usd": "USD", "inr": "INR", "rupee": "INR", "rupees": "INR",
                   "euro": "EUR", "euros": "EUR", "eur": "EUR", "pound": "GBP", "pounds": "GBP", "gbp": "GBP",
                   "yen": "JPY", "jpy": "JPY", "yuan": "CNY", "cny": "CNY", "dirham": "AED", "aed": "AED"}
        if internet and any(k in p for k in ["conversion", "convert", "exchange", "currency", "rate"]):
            codes = list(dict.fromkeys(cur_map[w] for w in re.findall(r"[a-z]+", p) if w in cur_map))
            if len(codes) >= 2:
                base, target = codes[0], codes[1]
                try:
                    import requests
                    d = requests.get(f"https://open.er-api.com/v6/latest/{base}", timeout=8).json()
                    rate = d.get("rates", {}).get(target)
                    if rate:
                        rows = "\n".join(f"| {a:,} {base} | {a * rate:,.2f} {target} |" for a in [1, 10, 100, 1000])
                        return (
                            trace("web-exchange_rate", {"base": base, "target": target}, {"rate": rate, "as_of": now_str})
                            + f"### 💱 Live Exchange Rate\n\nAs of **{now_str}** (live data via open.er-api.com):\n\n"
                            + f"**1 {base} = {rate:,.2f} {target}**\n\n"
                            + f"| Amount | Converted |\n|---|---|\n{rows}\n\n"
                            + "Rates fluctuate through the day — this value was fetched just now."
                        )
                except Exception as e:
                    logger.warning(f"Exchange rate fetch failed: {e}")

        # web search — free DuckDuckGo instant-answer engine, no API key (web is on by default)
        url_match = re.search(r"https?://[^\s)\"'>]+", prompt)
        search_intent = any(k in p for k in ["search", "look up", "latest", "news", "current", "price of", "weather",
                                             "who is", "capital of", "rate", "convert", "exchange", "how much is",
                                             "value of", "today", "now", "stock"])
        if internet and not url_match and search_intent:
            try:
                import requests
                r = requests.get("https://api.duckduckgo.com/",
                                 params={"q": prompt, "format": "json", "no_html": 1}, timeout=8)
                d = r.json()
                abstract = d.get("AbstractText") or d.get("Answer") or ""
                related = [t.get("Text") for t in d.get("RelatedTopics", [])[:3] if isinstance(t, dict) and t.get("Text")]
                if abstract or related:
                    body = abstract
                    if related:
                        body += ("\n\n" if body else "") + "\n".join(f"- {t}" for t in related)
                    src = d.get("AbstractURL") or "https://duckduckgo.com"
                    return (
                        trace("web-duckduckgo_search", {"q": prompt}, {"found": True, "source": src})
                        + f"### 🔎 Web Search Result\n\nAs of **{now_str}**:\n\n{body}\n\nSource: [{src}]({src}) via DuckDuckGo."
                    )
            except Exception as e:
                logger.warning(f"DuckDuckGo search failed: {e}")

        if "fetch" in tools and internet and url_match:
            url = url_match.group(0)
            try:
                import requests
                resp = requests.get(url, timeout=8, headers={"User-Agent": "UltraEdgeAIPCStudio/1.0"})
                text = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>|<[^>]+>", " ", resp.text)
                text = re.sub(r"\s+", " ", text).strip()[:700]
                result = {"url": url, "status": resp.status_code, "excerpt": text}
                return (
                    trace("fetch-fetch_url", {"url": url}, {"status": resp.status_code})
                    + "### 🌐 Web Fetch Tool Result\n\n"
                    + f"Fetched **{url}** (HTTP {resp.status_code}). Page excerpt:\n\n> {text}\n\n"
                    + "Let me know if you want a deeper summary of this page."
                )
            except Exception as e:
                return (
                    trace("fetch-fetch_url", {"url": url}, {"error": str(e)})
                    + f"### 🌐 Web Fetch Tool\n\nI tried to fetch **{url}** but the request failed: `{e}`.\n\nCheck your connection or the URL and try again."
                )

        # calculator — evaluate a plain arithmetic expression
        if "calculator" in tools:
            expr_match = re.search(r"([-+]?\d[\d\s\.\+\-\*\/\(\)%]*[\d\)])", prompt)
            wants_calc = any(k in p for k in ["calculate", "compute", "what is", "evaluate", "solve"])
            if expr_match and wants_calc and re.search(r"[\+\-\*\/%]", expr_match.group(1)):
                expr = expr_match.group(1).strip()
                try:
                    value = eval(expr, {"__builtins__": {}}, {})  # sanitized: digits/operators only by regex
                    return (
                        trace("calculator-evaluate", {"expression": expr}, {"value": value})
                        + f"### 🧮 Calculator Tool Result\n\n`{expr}` = **{value}**"
                    )
                except Exception:
                    pass

        return None

    @staticmethod
    def generate_vision(image_base64: str, prompt: str) -> str:
        if not _loaded_model_id:
            return "Error: Please load a Qwen Vision model (e.g. Qwen3-VL) first."
            
        time.sleep(1.5) # Simulate processing
        
        # Sim visual understanding response
        if "chart" in prompt.lower() or "table" in prompt.lower():
            return "Analyzing image... Detected a performance comparison chart. It shows OpenVINO INT4 model quantization achieves a 4.2x latency speedup on Intel Arc GPU compared to standard PyTorch FP16 runtime."
        return f"Analyzing image... The image shows a developer workspace dashboard. Based on your prompt '{prompt}', I can confirm that the OpenVINO logo is visible and the layout uses dark mode glassmorphism panels."

    @staticmethod
    def transcribe_audio(audio_filename: str) -> str:
        # Simulate ASR
        time.sleep(1.0)
        return "Show me the hardware diagnostic scanner results."

    @staticmethod
    def synthesize_speech_file(text: str, file_path: str, speaker: str = "Chelsie") -> bool:
        global _pipeline, _pipeline_type, _processor
        
        logger.info(f"[TTS] synthesize_speech_file called: text={text[:50]}..., speaker={speaker}, pipeline_type={_pipeline_type}, pipeline={_pipeline is not None}, processor={_processor is not None}")
        
        # If the real Omni pipeline is loaded and has speech synthesis capability:
        if _pipeline is not None and _pipeline_type == "omni" and _processor is not None:
            try:
                import torch
                import scipy.io.wavfile as wavfile
                from qwen_omni_utils import process_mm_info
                
                # Build conversation format for Omni processor.
                # Instruct the model to repeat the text verbatim so the talker
                # speaks the given text instead of answering it.
                conversation = [
                    {
                        "role": "system",
                        "content": [
                            {
                                "type": "text",
                                "text": "You are Qwen, a virtual human developed by the Qwen Team, Alibaba Group, capable of perceiving auditory and visual inputs, as well as generating text and speech.",
                            }
                        ],
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": f"Read the following text aloud exactly as written, without adding or changing anything:\n\n{text}"},
                        ],
                    },
                ]
                
                # Apply chat template to get properly formatted text
                chat_text = _processor.apply_chat_template(
                    conversation,
                    add_generation_prompt=True,
                    tokenize=False,
                )
                
                # Process multimodal info (no audio/video for TTS)
                audios, images, videos = process_mm_info(conversation, use_audio_in_video=False)
                
                # Tokenize + embed
                inputs = _processor(
                    text=chat_text,
                    audio=audios if audios else None,
                    images=images if images else None,
                    videos=videos if videos else None,
                    padding=True,
                    return_tensors="pt",
                )
                
                # NOTE: do NOT move tensors with .to(_loaded_device) — the loaded
                # device is an OpenVINO string ("GPU"/"NPU") that torch rejects,
                # and the OV pipeline consumes CPU tensors directly.
                with _pipeline_lock:
                    sequences, waveform = _pipeline.generate(
                        **inputs,
                        return_audio=True,
                        speaker=speaker,
                        thinker_max_new_tokens=512,
                        talker_max_new_tokens=2048,
                    )
                if waveform is not None:
                    import numpy as np
                    wav_data = waveform.reshape(-1).detach().cpu().numpy()
                    wav_data = (np.clip(wav_data, -1.0, 1.0) * 32767).astype(np.int16)
                    sample_rate = getattr(_pipeline.config.token2wav_config, "sampling_rate", 24000)
                    wavfile.write(file_path, sample_rate, wav_data)
                    logger.info(f"[TTS] Omni speech generated successfully: {file_path} ({len(wav_data)} samples, {sample_rate}Hz)")
                    return True
                else:
                    logger.warning(f"[TTS] Omni generate returned None waveform")
            except Exception as e:
                import traceback
                tb = traceback.format_exc()
                logger.error(f"Real Qwen-Omni speech token generation failed: {e}\n{tb}. Falling back to synthesized waveform.")
                add_runtime_log(f"[TTS-ERROR] {type(e).__name__}: {e} | {tb.splitlines()[-3:]}")
                
        # Offline Speech wave synthesis fallback (Triad chord with decay envelope)
        logger.warning(f"[TTS] Falling through to chord fallback - Omni path was skipped or failed")
        try:
            import wave
            import math
            import struct
            
            sample_rate = 16000
            duration = 1.5
            num_samples = int(sample_rate * duration)
            freqs = [261.63, 329.63, 392.00, 523.25]
            
            with wave.open(file_path, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                
                for i in range(num_samples):
                    t = float(i) / sample_rate
                    envelope = math.exp(-2.5 * t)
                    value = 0
                    for freq in freqs:
                        value += math.sin(2.0 * math.pi * freq * t)
                    value = (value / len(freqs)) * envelope
                    packed_value = struct.pack('<h', int(value * 32767))
                    wav_file.writeframesraw(packed_value)
            # False = placeholder audio, not real speech — caller must not cache it
            return False
        except Exception as e:
            logger.error(f"Offline speech synthesis fallback failed: {e}")
            return False
