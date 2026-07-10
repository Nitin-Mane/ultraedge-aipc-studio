from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import os
import threading
import time

router = APIRouter()

CODER_MODEL_ID = "Qwen2.5-Coder-1.5B-Instruct-ov-int4"

class CodeGenerationRequest(BaseModel):
    prompt: str
    language: Optional[str] = "python"
    context_files: Optional[List[Dict[str, str]]] = None
    project_path: Optional[str] = None
    mode: Optional[str] = "generate"  # generate, explain, debug, refactor
    temperature: Optional[float] = 0.2
    max_tokens: Optional[int] = 2048

class CodeGenerationResponse(BaseModel):
    code: str
    explanation: str
    language: str
    tokens_per_second: float

def _ensure_coder_loaded():
    """Ensure the Qwen Coder model is loaded. Returns active info."""
    from app.runtime.inference import RuntimeManager
    active_info = RuntimeManager.get_active_info()
    if active_info.get("model_id") != CODER_MODEL_ID:
        RuntimeManager.load_model(CODER_MODEL_ID, "AUTO", "INT4")
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
        
        for token in RuntimeManager.generate_stream(
            prompt=system_prompt,
            mode="fast",  # Fast mode for code generation
            effort="low"
        ):
            yield token
    
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
        for token in RuntimeManager.generate_stream(
            prompt=prompt,
            mode="thinking",
            effort="high"
        ):
            yield token
    
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
        for token in RuntimeManager.generate_stream(
            prompt=prompt,
            mode="thinking",
            effort="high"
        ):
            yield token
    
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
        for token in RuntimeManager.generate_stream(
            prompt=prompt,
            mode="thinking",
            effort="high"
        ):
            yield token
    
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
        for token in RuntimeManager.generate_stream(
            prompt=prompt,
            mode="thinking",
            effort="high"
        ):
            yield token
    
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
        for token in RuntimeManager.generate_stream(
            prompt=prompt,
            mode="fast",
            effort="low"
        ):
            yield token
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

def _build_coding_prompt(req: CodeGenerationRequest) -> str:
    """Build a coding-specific prompt based on mode and context."""
    
    language = req.language or "python"
    
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
