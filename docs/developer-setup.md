# Developer Setup

## Prerequisites

- **Intel Core Ultra processor** (mandatory startup requirement)
- **Windows 10/11 or Linux** (Intel macOS detection is best effort)
- **Python 3.11+** (via Anaconda or standalone)
- **Node.js 20.19+** (required by Vite 8; via nvm or installer)
- **OpenVINO Toolkit** — [Install Guide](https://www.intel.com/content/www/us/en/developer/tools/openvino-toolkit/download.html)

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/open-source/UltraEdge-AIPC-Studio.git
cd UltraEdge-AIPC-Studio

# 2. Backend
cd backend
conda create -n ultraedge python=3.11 -y
conda activate ultraedge
pip install -r requirements.txt

# 3. Frontend
cd ../frontend
npm install

# 4. Verify hardware and run both services
cd ..
python start.py
```

Open `http://localhost:3000`.

The launcher exits before installing or starting anything unless it detects an
Intel Core Ultra CPU. To run only that verification, use:

```bash
python start.py --check-only
```

## Running Tests

```bash
# Backend — 39 tests
cd backend
python -m pytest tests/ -v

# Frontend — 19 tests
cd frontend
npx vitest run
```

## Linting

```bash
# Backend
cd backend
python -m ruff check app/ tests/

# Frontend
cd frontend
npx eslint . --ext ts,tsx --max-warnings 200
```

## Project Structure

```
UltraEdge-AIPC-Studio/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI routers (chat, models, runtime, settings, system)
│   │   ├── runtime/        # Inference engine (inference, device_policy, loaders, speech, simulation)
│   │   ├── memory/         # SQLite DB + repository layer
│   │   ├── models/         # Model catalog, availability, download jobs
│   │   ├── hardware/       # System scanner (PowerShell)
│   │   ├── config.py       # Settings singleton (.env backed)
│   │   ├── main.py         # App factory + lifespan
│   │   └── maintenance.py  # Hourly cleanup scheduler
│   ├── tests/              # pytest suite (config, device_policy, repository, maintenance, smoke)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/            # Typed API client (client.ts, runtime.ts, chat.ts, models.ts, ...)
│   │   ├── pages/          # 17 route pages (lazy-loaded)
│   │   ├── components/     # Shared UI components
│   │   ├── store/          # Zustand store (useAppStore)
│   │   ├── hooks/          # Model catalog, custom hooks
│   │   └── test/           # vitest suite (useAppStore, client)
│   ├── package.json
│   └── vite.config.ts
├── docs/                   # This wiki
├── .github/workflows/      # CI (backend.yml, frontend.yml)
└── solid_report.md         # Engineering readiness report
```

## Environment Variables

Create `backend/.env` (optional — defaults work out of the box):

```env
ULTRAEEDGE_HOST=127.0.0.1
ULTRAEEDGE_PORT=8000
ULTRAEEDGE_CORS_ORIGINS=["http://localhost:3000"]
ULTRAEEDGE_RELOAD=true
ULTRAEEDGE_LOG_LEVEL=INFO
ULTRAEEDGE_ENABLE_CODE_EXECUTION=false
ULTRAEEDGE_TOKEN2WAV_SOLVER=euler
ULTRAEEDGE_TOKEN2WAV_ODE_STEPS=10
ULTRAEEDGE_TOKEN2WAV_FAST_ODE_STEPS=8
```

`ULTRAEEDGE_ENABLE_CODE_EXECUTION=true` enables the compiler runner and agent
shell/file endpoints. They execute local code with the current user's
permissions, so enable them only on a trusted, localhost-only installation.

For lower audio-chat latency, keep the default Euler token2wav solver. Set
`ULTRAEEDGE_TOKEN2WAV_SOLVER=rk4` when higher-order ODE integration is more
important than latency. Runtime stage timings are exposed by
`GET /api/runtime/active` under `last_generation_timings`.

Create `frontend/.env.development`:

```env
VITE_API_URL=http://localhost:8000
```

## Adding a New Model

1. Add entry to `backend/app/models/catalog.py` `CURATED_CATALOG`
2. Create a loader in `backend/app/runtime/loaders/` implementing `ModelLoader` protocol
3. Register it in `backend/app/runtime/loaders/__init__.py`
4. The catalog auto-syncs to DB on next boot; disk detection sets status to `ready`
