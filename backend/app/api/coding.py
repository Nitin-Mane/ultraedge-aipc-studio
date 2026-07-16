import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

CODER_MODEL_ID = "Qwen2.5-Coder-1.5B-Instruct-ov-int4"

class CodeGenerationRequest(BaseModel):
    prompt: str
    language: str | None = "python"
    context_files: list[dict[str, str]] | None = None
    project_path: str | None = None
    mode: str | None = "generate"  # generate, explain, debug, refactor
    temperature: float | None = 0.2
    max_tokens: int | None = 2048

class CodeGenerationResponse(BaseModel):
    code: str
    explanation: str
    language: str
    tokens_per_second: float

def _ensure_coder_loaded():
    """Ensure a coding-capable model is loaded. Returns active info.
    
    Tries the dedicated Coder model first; falls back to whatever model
    is already loaded (e.g. the Omni model) if the Coder model is unavailable.
    """
    from app.runtime.inference import RuntimeManager
    active_info = RuntimeManager.get_active_info()
    model_id = active_info.get("model_id")

    # Already using the Coder model — nothing to do
    if model_id == CODER_MODEL_ID:
        return active_info

    # A model is already loaded (e.g. Omni) — use it for coding tasks
    if model_id:
        return active_info

    # No model loaded — try to load Coder; if it fails, try Omni as fallback
    try:
        RuntimeManager.load_model(CODER_MODEL_ID, "AUTO", "INT4")
        return RuntimeManager.get_active_info()
    except Exception:
        fallback_id = "Qwen2.5-Omni-3B"
        RuntimeManager.load_model(fallback_id, "AUTO", "INT4")
        return RuntimeManager.get_active_info()

@router.post("/generate")
async def generate_code_stream(req: CodeGenerationRequest):
    """Stream code generation with Qwen Coder model."""
    from app.runtime.inference import RuntimeManager
    
    _ensure_coder_loaded()
    
    # Build the coding-specific prompt
    system_prompt = _build_coding_prompt(req)
    
    def event_generator():
        # Yield metadata
        active_info = RuntimeManager.get_active_info()
        model_id = active_info.get("model_id", CODER_MODEL_ID)
        device = active_info.get("device", "CPU")
        yield f"__METADATA__:{json.dumps({'model_id': model_id, 'device': device, 'language': req.language})}\n"
        
        yield from RuntimeManager.generate_stream(
            prompt=system_prompt,
            mode="fast",  # Fast mode for code generation
            effort="low"
        )
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/analyze")
async def analyze_code(req: CodeGenerationRequest):
    """Analyze existing code for issues or improvements."""
    from app.runtime.inference import RuntimeManager
    
    _ensure_coder_loaded()
    
    prompt = f"""You are an expert code analyzer. Analyze the following code and provide:
1. Code review with potential issues
2. Performance improvements
3. Security concerns (if any)
4. Refactoring suggestions

Code to analyze:
```{req.language}
{req.prompt}
```

Provide your analysis in a structured markdown format with clear sections."""
    
    def event_generator():
        yield from RuntimeManager.generate_stream(
            prompt=prompt,
            mode="thinking",
            effort="high"
        )
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/explain")
async def explain_code(req: CodeGenerationRequest):
    """Explain code functionality in detail."""
    from app.runtime.inference import RuntimeManager
    
    _ensure_coder_loaded()
    
    prompt = f"""Explain the following code in detail. Include:
1. What each function/block does
2. The algorithm or pattern used
3. Input/output explanation
4. Any notable design decisions

Code to explain:
```{req.language}
{req.prompt}
```

Provide a clear, educational explanation."""
    
    def event_generator():
        yield from RuntimeManager.generate_stream(
            prompt=prompt,
            mode="thinking",
            effort="high"
        )
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/debug")
async def debug_code(req: CodeGenerationRequest):
    """Help debug code issues."""
    from app.runtime.inference import RuntimeManager
    
    _ensure_coder_loaded()
    
    prompt = f"""You are a debugging expert. Help debug the following code:

```{req.language}
{req.prompt}
```

Please:
1. Identify potential bugs or issues
2. Suggest fixes with corrected code
3. Explain what was wrong and why
4. Provide the corrected version of the full code

Be thorough but concise in your explanation."""
    
    def event_generator():
        yield from RuntimeManager.generate_stream(
            prompt=prompt,
            mode="thinking",
            effort="high"
        )
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/refactor")
async def refactor_code(req: CodeGenerationRequest):
    """Refactor code for better quality."""
    from app.runtime.inference import RuntimeManager
    
    _ensure_coder_loaded()
    
    prompt = f"""Refactor the following code to improve:
1. Readability and maintainability
2. Performance (if applicable)
3. Follow best practices for {req.language}
4. Add proper error handling

Original code:
```{req.language}
{req.prompt}
```

Provide the refactored code with explanations of changes made."""
    
    def event_generator():
        yield from RuntimeManager.generate_stream(
            prompt=prompt,
            mode="thinking",
            effort="high"
        )
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/complete")
async def code_completion(req: CodeGenerationRequest):
    """Provide code completions based on partial code."""
    from app.runtime.inference import RuntimeManager
    
    _ensure_coder_loaded()
    
    prompt = f"""Complete the following code. Provide only the continuation, not the full code:

```{req.language}
{req.prompt}
```

Continue from where the code left off. Provide only the completion, no explanation."""
    
    def event_generator():
        yield from RuntimeManager.generate_stream(
            prompt=prompt,
            mode="fast",
            effort="low"
        )
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

def _build_coding_prompt(req: CodeGenerationRequest) -> str:
    """Build a coding-specific prompt based on mode and context."""
    
    language = req.language or "python"
    prompt_lower = req.prompt.lower().strip()
    
    # Detect clearly non-code conversational inputs
    conversational_patterns = [
        'hello', 'hi', 'hey', 'good morning', 'good evening', 'good afternoon',
        'how are you', 'what are you', 'who are you', 'what can you do',
        'help', 'thanks', 'thank you', 'bye', 'goodbye', 'what is',
        'tell me about', 'explain', 'what do you', 'can you',
    ]
    is_conversational = (
        len(prompt_lower.split()) <= 6
        and any(prompt_lower.startswith(p) or prompt_lower == p for p in conversational_patterns)
    )
    
    if is_conversational:
        return f"""You are Qwen Coder, a friendly AI coding assistant running locally on an AI PC. The user is greeting you or asking a general question. Respond warmly and concisely. Introduce yourself briefly and mention you can help with coding tasks like generating, explaining, debugging, and refactoring code. Keep your response under 3 sentences.

User said: {req.prompt}"""
    
    if req.mode == "explain":
        return f"""You are an expert programmer. Explain the following code in detail:

```{language}
{req.prompt}
```

Provide:
1. Overview of what the code does
2. Function/block-by-block breakdown
3. Input/output explanation
4. Any design patterns used
"""
    
    elif req.mode == "debug":
        return f"""You are a debugging expert. Help debug the following code:

```{language}
{req.prompt}
```

Please:
1. Identify the issues
2. Explain what's wrong
3. Provide the corrected code
4. Suggest preventive measures
"""
    
    elif req.mode == "refactor":
        return f"""Refactor this code for better quality:

```{language}
{req.prompt}
```

Improve:
1. Readability
2. Performance
3. Best practices
4. Error handling

Provide the refactored code with explanations.
"""
    
    else:  # generate mode
        context = ""
        if req.context_files:
            context = "\n\nContext files:\n"
            for f in req.context_files:
                context += f"// {f.get('name', 'file')}\n{f.get('content', '')}\n\n"
        
        return f"""You are an expert {language} programmer. Generate code based on the user's request.

{context}User request: {req.prompt}

Requirements:
1. Write clean, well-documented code
2. Follow {language} best practices
3. Include proper error handling
4. Add comments where necessary

Provide the complete, working code:
"""
