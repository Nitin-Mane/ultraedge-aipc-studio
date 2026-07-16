# API Reference

Base URL: `http://localhost:8000`

All endpoints return JSON. Streaming endpoints use Server-Sent Events (SSE).

## System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check — `{"status":"ok","version":"0.1.0-alpha"}` |
| GET | `/api/system/profile` | Hardware profile (CPU, GPU, NPU, RAM, storage) |
| GET | `/api/audit-logs` | Audit log entries (limit 100) |
| POST | `/api/security/reset` | Wipe all user data (chats, benchmarks, memories) |
| POST | `/api/maintenance/cleanup` | Trigger immediate cleanup pass |
| GET | `/api/maintenance/status` | Last cleanup report |

## Models

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models/catalog` | All models with disk status (ready/downloading/not_installed) |
| POST | `/api/models/{id}/status` | Update model status |
| POST | `/api/models/{id}/prepare` | Start download + convert pipeline |
| GET | `/api/models/{id}/job` | Current job status for a model |
| POST | `/api/models/{id}/benchmark` | Run benchmark (device, precision) |
| POST | `/api/models/{id}/stop` | Stop/unload a model |
| POST | `/api/models/recommend` | Get recommended models for a feature type |

## Runtime

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/runtime/load` | Load a model (model_id, device, precision) |
| POST | `/api/runtime/unload` | Unload active model |
| GET | `/api/runtime/active` | Currently loaded model info |
| GET | `/api/runtime/logs` | Runtime log ring buffer |

## Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/stream` | SSE chat stream (session_id, message, model_id) |
| POST | `/api/voice/transcribe` | Audio → text (multipart file upload) |
| POST | `/api/tts` | Text → speech (returns audio file path) |
| GET | `/api/tts/file/{filename}` | Serve TTS audio file |

## Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get all settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/hf-token` | Check HuggingFace token status |
| POST | `/api/hf-token` | Save HuggingFace token |
| DELETE | `/api/hf-token` | Delete HuggingFace token |

## Coding

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/coding/generate` | SSE code generation stream |

## Benchmarks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/benchmarks/results` | All benchmark results (latest per model) |
| POST | `/api/benchmarks/run` | Run benchmark (model_id, device) |

## Streaming Format

SSE endpoints yield lines in the format:

```
data: {"type":"token","content":"Hello"}
data: {"type":"token","content":" world"}
data: [DONE]
```

## Error Responses

```json
{
  "detail": "Error message"
}
```

Status codes: `400` (bad request), `404` (not found), `500` (server error)
