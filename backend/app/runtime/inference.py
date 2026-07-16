"""Runtime inference manager — thin orchestrator that delegates to specialised
modules (device_policy, loaders, simulation, speech).

The ``RuntimeManager`` class owns load/unload/generate/status and delegates
the actual work to the extracted modules.  This keeps inference.py under ~300
lines and each concern in its own testable file.
"""

from __future__ import annotations

import ast
import logging
import operator
import os
import queue
import re
import threading
import time
from collections.abc import Generator
from datetime import datetime
from typing import Any

from app.config import settings
from app.memory.db import log_audit, set_setting

logger = logging.getLogger("inference")

# ── Module-level state ──────────────────────────────────────────────────────

_pipeline_lock = threading.Lock()          # serialise all pipeline.generate() calls
_load_lock = threading.Lock()              # serialise load/unload

_loaded_model_id: str | None = None
_loaded_device: str | None = None
_loaded_precision: str | None = None
_pipeline: Any = None
_pipeline_type: str | None = None       # "text", "vision", "asr", "tts", "omni"
_processor: Any = None
_runtime_logs: list[str] = []
_loading: bool = False

# Special model paths for models not in the standard models directory
CODER_MODEL_PATH = str(settings.MODELS_DIR / "Qwen2.5-Coder-1.5B-Instruct-ov-int4")

_CALCULATOR_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}


def _safe_calculate(expression: str) -> int | float:
    """Evaluate a small numeric expression without executing Python code."""
    if len(expression) > 100:
        raise ValueError("Expression is too long")
    tree = ast.parse(expression, mode="eval")
    if sum(1 for _ in ast.walk(tree)) > 32:
        raise ValueError("Expression is too complex")

    def evaluate(node: ast.AST) -> int | float:
        if isinstance(node, ast.Expression):
            return evaluate(node.body)
        if isinstance(node, ast.Constant) and type(node.value) in {int, float}:
            if abs(node.value) > 1_000_000_000_000:
                raise ValueError("Number is too large")
            return node.value
        if isinstance(node, ast.UnaryOp) and type(node.op) in _CALCULATOR_OPERATORS:
            return _CALCULATOR_OPERATORS[type(node.op)](evaluate(node.operand))
        if isinstance(node, ast.BinOp) and type(node.op) in _CALCULATOR_OPERATORS:
            left = evaluate(node.left)
            right = evaluate(node.right)
            if isinstance(node.op, ast.Pow) and abs(right) > 12:
                raise ValueError("Exponent is too large")
            return _CALCULATOR_OPERATORS[type(node.op)](left, right)
        raise ValueError("Unsupported calculator expression")

    return evaluate(tree)


def add_runtime_log(msg: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted_msg = f"[{timestamp}] {msg}"
    _runtime_logs.append(formatted_msg)
    logger.info(msg)


# ── RuntimeManager ──────────────────────────────────────────────────────────

class RuntimeManager:
    # ── Load / Unload ──────────────────────────────────────────────────────

    @staticmethod
    def load_model(model_id: str, device: str = "CPU", precision: str = "INT4") -> dict[str, Any]:
        global _loaded_model_id, _loaded_device, _loaded_precision
        global _pipeline, _pipeline_type, _processor, _loading

        with _load_lock:
            _loading = True
            _runtime_logs.clear()
            add_runtime_log(f"[SYSTEM] Initiating model load: {model_id} on {device} ({precision})")

            from app.runtime.device_policy import detect_hardware, resolve_device
            caps = detect_hardware()
            device = resolve_device(device, add_runtime_log)
            add_runtime_log(f"[RUNTIME] Resolved active target device: {device}")

            RuntimeManager.unload_model()

            # Resolve model directory
            from app.models.availability import resolve_model_dir
            resolved_dir = resolve_model_dir(model_id)

            if resolved_dir:
                model_dir = resolved_dir
                is_real = True
            else:
                model_dir = os.path.join(str(settings.MODELS_DIR), model_id)
                is_real = False

            add_runtime_log(f"[RUNTIME] Locating model assets at: {model_dir}")
            add_runtime_log(f"[RUNTIME] Real OpenVINO model weights present on disk: {is_real}")

            start_time = time.time()

            if is_real:
                _pipeline = None
                try:
                    from app.runtime.loaders import get_loader
                    loader = get_loader(model_id, model_dir)
                    if loader is None:
                        add_runtime_log(f"[ERROR] No loader registered for model: {model_id}")
                    else:
                        result = loader.load(
                            model_dir, device, caps.has_gpu, caps.has_npu, add_runtime_log
                        )
                        _pipeline = result.get("pipeline")
                        _processor = result.get("processor")
                        _pipeline_type = result.get("type")
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

            load_duration = time.time() - start_time
            if not is_real:
                load_duration = 1.2
                time.sleep(1.2)

            if _pipeline is not None or _pipeline_type is not None:
                _loaded_model_id = model_id
                _loaded_device = device
                _loaded_precision = precision
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
                    "simulated": not is_real,
                }
            else:
                add_runtime_log(f"[ERROR] Model load failed after {round(load_duration, 2)}s. Pipeline is None.")
                _loading = False
                return {
                    "status": "error",
                    "model_id": model_id,
                    "device": device,
                    "precision": precision,
                    "load_time_ms": round(load_duration * 1000, 2),
                    "simulated": False,
                    "error": "Model pipeline failed to initialize",
                }

    @staticmethod
    def unload_model() -> dict[str, Any]:
        global _loaded_model_id, _loaded_device, _loaded_precision
        global _pipeline, _pipeline_type, _processor
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
    def get_active_info() -> dict[str, Any]:
        return {
            "model_id": _loaded_model_id,
            "device": _loaded_device,
            "precision": _loaded_precision,
            "pipeline_type": _pipeline_type,
            "loading": _loading,
            "last_generation_timings": getattr(
                _pipeline,
                "last_generation_timings",
                {},
            ),
        }

    # ── Generate ───────────────────────────────────────────────────────────

    @staticmethod
    def generate_stream(
        prompt: str,
        attachments: list[dict[str, Any]] | None = None,
        mode: str = "auto",
        effort: str = "high",
        internet: bool = False,
        tools: list[str] | None = None,
        history: list[dict[str, str]] | None = None,
        max_tokens: int | None = None,
    ) -> Generator[str, None, None]:
        if not _loaded_model_id:
            yield "Error: No model loaded. Please select and load a model in the Model Manager."
            return

        # Workspace Tools (MCP-style)
        tool_result = RuntimeManager._run_workspace_tool(prompt, tools or [], internet)
        if tool_result:
            words = tool_result.split(" ")
            for idx, word in enumerate(words):
                yield word if idx == len(words) - 1 else word + " "
                time.sleep(0.015)
            return

        # Real inference when pipeline is loaded
        if _pipeline is not None:
            try:
                if _pipeline_type == "text":
                    yield from _generate_text(prompt, history)
                    return
                elif _pipeline_type == "omni":
                    yield from _generate_omni(
                        prompt,
                        attachments,
                        history,
                        max_tokens=max_tokens,
                        mode=mode,
                    )
                    return
                elif _pipeline_type == "vision":
                    yield from _generate_vision(prompt, attachments, max_tokens=max_tokens)
                    return
            except Exception as e:
                logger.error(f"Real inference failed: {e}. Falling back to simulation.")

        # Simulation fallback
        from app.runtime.simulation import generate_simulation_stream
        yield from generate_simulation_stream(
            prompt, attachments, mode, effort, tools, history, _loaded_device
        )

    # ── Vision (standalone) ────────────────────────────────────────────────

    @staticmethod
    def generate_vision(image_base64: str, prompt: str) -> str:
        if not _loaded_model_id:
            return "Error: Please load a Qwen Vision model (e.g. Qwen3-VL) first."
        from app.runtime.simulation import simulate_generate_vision
        return simulate_generate_vision(prompt)

    # ── Speech ─────────────────────────────────────────────────────────────

    @staticmethod
    def transcribe_audio(audio_filename: str) -> str:
        from app.runtime.speech import transcribe_audio
        return transcribe_audio(audio_filename)

    @staticmethod
    def synthesize_speech_file(
        text: str,
        file_path: str,
        speaker: str = "Chelsie",
        profile: str = "balanced",
    ) -> bool:
        from app.runtime.speech import synthesize_speech_file
        return synthesize_speech_file(
            text, file_path, speaker,
            pipeline=_pipeline, pipeline_type=_pipeline_type,
            processor=_processor, pipeline_lock=_pipeline_lock,
            profile=profile,
        )

    # ── Workspace Tools ────────────────────────────────────────────────────

    @staticmethod
    def _run_workspace_tool(prompt: str, tools: list[str], internet: bool) -> str | None:
        """MCP-style Workspace Tools dispatcher (time / fetch / calculator)."""
        import json as _json
        p = prompt.lower()

        def trace(tool: str, args: dict[str, Any], result: Any) -> str:
            return (
                "<thought>\n"
                f"[TOOL_CALL] {tool}\n{_json.dumps(args)}\n"
                f"[TOOL_RESPONSE] {tool}\n{_json.dumps(result, indent=2, default=str)}\n"
                "</thought>\n\n"
            )

        now_str = datetime.now().astimezone().strftime("%d %b %Y, %I:%M %p")

        # time/date — always local
        if re.search(r"(what\s+(is\s+)?(the\s+)?(time|date|day)|what\s+time|current\s+time|time\s+now|today'?s\s+date|what\s+day\s+is)", p):
            now = datetime.now().astimezone()
            result = {"datetime": now.isoformat(), "timezone": str(now.tzinfo)}
            return (
                trace("time-get_current_time", {"timezone": str(now.tzinfo)}, result)
                + "### 🕒 Current Time\n\n"
                + f"It is **{now.strftime('%A, %d %B %Y — %I:%M:%S %p')}** ({now.tzinfo}, your device's local timezone)."
            )

        # currency conversion
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

        # web search
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

        # fetch URL
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

        # calculator
        if "calculator" in tools:
            expr_match = re.search(r"([-+]?\d[\d\s\.\+\-\*\/\(\)%]*[\d\)])", prompt)
            wants_calc = any(k in p for k in ["calculate", "compute", "what is", "evaluate", "solve"])
            if expr_match and wants_calc and re.search(r"[\+\-\*\/%]", expr_match.group(1)):
                expr = expr_match.group(1).strip()
                try:
                    value = _safe_calculate(expr)
                    return (
                        trace("calculator-evaluate", {"expression": expr}, {"value": value})
                        + f"### 🧮 Calculator Tool Result\n\n`{expr}` = **{value}**"
                    )
                except Exception:
                    pass

        return None


# ── Private generate helpers ────────────────────────────────────────────────

def _history_turns(history: list[dict[str, str]] | None) -> list[dict[str, str]]:
    """Strip thought blocks and truncate history for multi-turn context."""
    hist_turns = []
    for h in (history or [])[-6:]:
        txt = re.sub(r"<thought>[\s\S]*?</thought>", "", h.get("content", "")).strip()[:600]
        if txt:
            hist_turns.append({"role": h["role"], "text": txt})
    return hist_turns


def _generate_text(prompt: str, history: list[dict[str, str]] | None) -> Generator[str, None, None]:
    hist_turns = _history_turns(history)
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


def _generate_omni(
    prompt: str,
    attachments: list[dict[str, Any]] | None,
    history: list[dict[str, str]] | None,
    max_tokens: int | None = None,
    mode: str = "auto",
) -> Generator[str, None, None]:
    import base64
    import tempfile

    from qwen_omni_utils import process_mm_info
    from transformers import TextIteratorStreamer

    hist_turns = _history_turns(history)
    temp_files = []

    try:
        content: list = [{"type": "text", "text": prompt}]

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

        messages = [{"role": t["role"], "content": [{"type": "text", "text": t["text"]}]} for t in hist_turns]
        messages.append({"role": "user", "content": content})
        chat_text = _processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

        audios, images, videos = process_mm_info(messages, use_audio_in_video=False)
        inputs = _processor(
            text=chat_text, audio=audios or None, images=images or None,
            videos=videos or None, padding=True, return_tensors="pt",
        )

        streamer = TextIteratorStreamer(_processor.tokenizer, skip_prompt=True, skip_special_tokens=True)
        q: queue.Queue = queue.Queue()
        default_limit = settings.OMNI_FAST_MAX_NEW_TOKENS if mode == "fast" else 512
        thinker_limit = max(16, min(int(max_tokens or default_limit), 512))
        gen_kwargs = {
            "thinker_max_new_tokens": thinker_limit,
            "return_audio": False,
            "stream_config": streamer,
            **inputs,
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

        yielded_any = False
        for token in streamer:
            if token:
                yield token
                yielded_any = True

        t.join(timeout=1.0)
        if not yielded_any:
            raise RuntimeError("Generation thread exited without producing tokens")
    except Exception as e:
        logger.error(f"Real Qwen-Omni streaming failed: {e}. Falling back to simulation.")
        raise
    finally:
        for path in temp_files:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as rm_err:
                logger.warning(f"Failed to remove temp file {path}: {rm_err}")


def _generate_vision(
    prompt: str,
    attachments: list[dict[str, Any]] | None,
    max_tokens: int | None = None,
) -> Generator[str, None, None]:
    import base64
    import tempfile

    import openvino_genai

    temp_files = []
    image_paths = []

    try:
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

        images = [openvino_genai.Image.open(p) for p in image_paths]
        q: queue.Queue = queue.Queue()
        yielded_any = False

        def _run():
            nonlocal yielded_any
            try:
                streamer = openvino_genai.TextStreamer(_pipeline.get_tokenizer())
                with _pipeline_lock:
                    result = _pipeline.generate(
                        prompt,
                        images=images,
                        streamer=streamer,
                        max_new_tokens=max(16, min(int(max_tokens or 512), 512)),
                    )
                q.put(str(result) if result else "")
            except Exception as e:
                logger.error(f"Vision generation error in thread: {e}")
                q.put(f"[Vision generation error: {e}]")
            finally:
                q.put(None)

        t = threading.Thread(target=_run, daemon=True)
        t.start()

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
    except Exception as e:
        logger.error(f"Real VLP streaming failed: {e}. Falling back to simulation.")
        raise
    finally:
        for path in temp_files:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as rm_err:
                logger.warning(f"Failed to remove temp file {path}: {rm_err}")
