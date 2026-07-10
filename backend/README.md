# UltraEdge AIPC Studio Backend

This is the backend for UltraEdge AIPC Studio, powered by OpenVINO and Qwen models.

## Setup

1. Create conda environment:
```bash
conda env create -f environment.yml
conda activate ultraedge-aipc-studio
```

2. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

3. Run the backend:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

- `/api/hardware/scan` - Hardware detection
- `/api/models/catalog` - Model catalog
- `/api/models/{id}/prepare` - Prepare model
- `/api/models/{id}/load` - Load model
- `/api/runtime/inference` - Run inference
- `/api/rag/query` - RAG query
- `/api/agents/execute` - Execute agent
- `/api/memory/sessions` - Chat sessions
- `/api/safety/status` - Safety status