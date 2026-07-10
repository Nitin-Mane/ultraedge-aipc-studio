# Contributing to UltraEdge AIPC Studio

We welcome contributions from developers, researchers, and AI PC enthusiasts! As a community-led local AI workspace console, here is how you can help.

---

## 💻 Developer workflow

### 1. Code Style
- **Python Backend**: Follow PEP 8 guidelines. Write typed variables and function signatures where practical. Use Pydantic schemas for REST API payloads.
- **React Frontend**: Keep components functional, modular, and reusable. Group styling details into utility tokens in `index.css`.

### 2. Creating Pull Requests
- Create a new branch named after your feature (e.g., `feature/mcp-integration` or `fix/asr-latency`).
- Ensure the frontend builds cleanly without TypeScript or unused import errors:
  ```bash
  cd frontend
  npm run build
  ```
- Verify the backend FastAPI server loads without python exception loops:
  ```bash
  cd backend
  python -c "import app.main; print('Import OK!')"
  ```
- Submit a detailed pull request describing your enhancements and what hardware devices (CPU, GPU, NPU) were tested.
