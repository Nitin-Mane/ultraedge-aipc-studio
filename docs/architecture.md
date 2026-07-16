# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + TS)                    │
│  App.tsx → React.lazy routes → Pages → api/* → client.ts   │
│  Zustand store (useAppStore) ← persist → localStorage       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / SSE
┌──────────────────────────▼──────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  main.py (app factory + lifespan)                           │
│  ├── api/chat.py          (stream, voice, tts)              │
│  ├── api/models_routes.py (catalog, prepare, benchmark)     │
│  ├── api/runtime_routes.py(load, unload, active, logs)      │
│  ├── api/settings_routes.py(CRUD settings, HF token)        │
│  ├── api/system_routes.py (health, hw, audit, security)     │
│  └── api/coding.py        (code generation stream)          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     Runtime Layer                            │
│  config.py (Settings singleton)                              │
│  runtime/inference.py (RuntimeManager — thin orchestrator)   │
│  ├── runtime/device_policy.py (AUTO resolve, hw mapping)    │
│  ├── runtime/loaders/ (ModelLoader registry)                 │
│  │   ├── base.py        (protocol + registry)               │
│  │   ├── omni_loader.py (Qwen2.5-Omni)                     │
│  │   └── genai_loader.py(TextLoader, VisionLoader)          │
│  ├── runtime/simulation.py (canned responses)               │
│  └── runtime/speech.py    (TTS + ASR)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     Data Layer                               │
│  memory/db.py       (SQLite connection, schema, init)       │
│  memory/repository.py (all SQL — no raw SQL in routes)      │
│  models/catalog.py  (curated model definitions)             │
│  models/availability.py (disk scan, resolve_model_dir)      │
│  models/jobs.py     (prepare/download job queue)            │
│  maintenance.py     (hourly cleanup — gc, cache prune)      │
└─────────────────────────────────────────────────────────────┘
```

## Request Flow

1. **Frontend** calls `apiGet/post/stream` → `client.ts` → `fetch(BASE_URL + path)`
2. **FastAPI router** validates request, calls repository or RuntimeManager
3. **RuntimeManager** delegates to `device_policy` (resolve device) → `loaders` (pick loader) → OpenVINO
4. **Response** flows back; SSE streams yield tokens line-by-line

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| SQLite over PostgreSQL | Local-first, zero-config, single-user |
| Zustand over Redux | Minimal boilerplate, built-in persist |
| OpenVINO over ONNX Runtime | Intel hardware optimization, NPU support |
| Repository pattern | No raw SQL in route handlers |
| Loader registry | Open/Closed — add new model type without modifying inference.py |

## Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `config.py` | All paths, ports, flags from `.env` |
| `device_policy.py` | Resolve "AUTO" → best hardware; Omni component mapping |
| `loaders/` | ModelLoader protocol — one loader per model family |
| `simulation.py` | Canned responses when no model is loaded |
| `speech.py` | TTS synthesis, ASR transcription |
| `repository.py` | All SQL operations (chat, models, benchmarks, audit) |
| `maintenance.py` | Hourly gc + cache prune + working-set trim |
| `catalog.py` | 10 curated models, sync to DB, recommendation engine |
