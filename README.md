# UltraEdge AIPC Studio

**Powered by Intel OpenVINO™ Toolkit and the latest Qwen local model ecosystem.**

**Developer:** Mr. Nitin Mane — Intel Software Innovator  
**Project Type:** Cross-platform local-first desktop AI developer console  
**Current Version:** `0.1.1-alpha`

UltraEdge AIPC Studio is an offline developer workspace designed to run, optimize, and benchmark the latest Qwen model families locally on Intel AI PCs using OpenVINO acceleration across CPU, GPU, and NPU hardware.

---

## 🚀 Quick Start Guide

### Simplest Launch Option (Windows)
Double-click the **`start_all.bat`** file in the root of the project. This will automatically:
1. Open a terminal to launch the FastAPI backend inside the activated `project` conda environment.
2. Open a terminal to run the Vite dev server.
3. Automatically open your default browser to `http://localhost:5173`.

### Manual Launch Option

#### Prerequisites
- Node.js LTS
- Python 3.10+
- Anaconda / Miniconda
- OpenVINO Runtime + OpenVINO GenAI drivers installed

### 1. Setup Backend environment
Activate the conda project environment (`project`):
```bash
# Locate and activate your conda workspace
conda activate project

# Install backend dependencies
cd backend
python -m pip install -r requirements.txt
```

### 2. Launch Local FastAPI Server
Run the FastAPI application server:
```bash
python -m app.main
```
The backend server will launch at `http://localhost:8000`. It automatically creates the SQLite database schemas and seeds the curated model catalog on startup.

### 3. Setup Frontend UI
Install Vite packages and start the developer interface:
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser to run the developer workspace.

---

## 🛠️ App Module Architecture

The application has been modularized as a split web shell:
- **Tauri / Rust wrapper**: Provides secure filesystem picker and process management for desktop packaging.
- **FastAPI CPython Backend**: Orchestrates model catalog queries, recommendation scoring, background download workers, OpenVINO GenAI compiles, local RAG vector indexing, and speech transcribe/synthesize routines.
- **React Vite Tailwind Frontend**: Rich visual dashboard containing 12 premium glassmorphic pages with animated telemetry charts, waveforms, and preparation timelines.
- **SQLite DB Local Brain**: Persists app settings, chat messages, vector chunks references, tool permission checks, and audit history logs locally in `app_data/ultraedge_aipc_studio.db`.

---

## 📦 Features List

1. **Animated Splash Experience**: Highlights Mr. Nitin Mane's credentials as an Intel Software Innovator.
2. **System Hardware Scanner**: Offline diagnostic metrics of host CPU, Arc GPU, NPU driver status, and RAM limits.
3. **Hardware-aware Qwen Recommender**: Scores models depending on performance profile (Fast, Balanced, Quality, Workstation).
4. **Model Catalog Prep Timeline**: Simulates background conversion and optimization timeline (Download → Verify → Convert → Quantize → Benchmark → Ready).
5. **Personal and Code Assistants**: Chat workspace with local memory toggles and patch diff generator.
6. **RAG & Vision Workspace**: Local document ingestion with citations and multi-modal image VQA.
7. **Voice Assistant**: Waveform-metered ASR transcription and voice generator (TTS).
8. **Benchmark Studio**: Comparative charts measuring generation speed (tokens/sec) and first-token latency.
9. **Security Audit Logger**: Encrypted local database log showing access audits and wipe options.

---

## 🔒 Security & Privacy Promise
- **Offline-First**: All model execution, document chunking, and database persistence run entirely locally.
- **No Telemetry**: Absolutely no data, file uploads, chats, or analytical telemetry is sent to cloud networks.
