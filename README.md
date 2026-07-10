# UltraEdge AIPC Studio

<div align="center">
  <img src="frontend/public/ultraedge.svg" alt="UltraEdge Logo" width="120" height="120" />
  <h3>Local-First AI PC Developer Console</h3>
  
  [![CI/CD Pipeline](https://github.com/Nitin-Mane/ultraedge-aipc-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/Nitin-Mane/ultraedge-aipc-studio/actions/workflows/ci.yml)
  [![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
  [![Release Version](https://img.shields.io/badge/release-v0.1.1--alpha-purple.svg)]()
  [![Platform: Windows](https://img.shields.io/badge/platform-Windows-teal.svg)]()
  [![Python: 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)]()
  [![Node: 18+](https://img.shields.io/badge/node-18+-green.svg)]()
</div>

---

**UltraEdge AIPC Studio** is an offline, local-first developer workspace designed to run, optimize, and benchmark leading model families on Intel AI PCs using OpenVINO™ acceleration across CPU, GPU, and NPU hardware.

---


## 🚀 Quick Start Guide

### Simplest Launch Option (Windows)
Double-click the **`start_all.bat`** file in the root of the project. This will automatically:
1. Open a terminal to launch the FastAPI backend inside the activated `project` conda environment.
2. Open a terminal to run the Vite dev server.
3. Automatically open your default browser to `http://localhost:3000`.

### Manual Launch Option

#### 1. Setup Backend Environment

1. **Install OpenVINO Toolkit Drivers**:
   Go to the [Intel OpenVINO Installation Guide](https://www.intel.com/content/www/us/en/developer/tools/openvino-toolkit/download.html) and follow the instructions to install the OpenVINO toolkit runtime matching your OS and hardware.

2. **Activate the Default Environment**:
   By documentation, OpenVINO installs into a default environment named `openvino_env`. Create or activate your default conda environment:
   ```bash
   # Activate the default OpenVINO conda environment
   conda activate openvino_env
   
   # Or configure a python virtual environment:
   # source openvino_env/bin/activate (Linux/macOS)
   # .\openvino_env\Scripts\activate (Windows)
   ```

3. **Install Requirements**:
   Navigate to the backend directory and install the studio dependencies:
   ```bash
   cd backend
   python -m pip install -r requirements.txt
   ```

#### 2. Launch Local FastAPI Server
Run the FastAPI application server:
   ```bash
   python -m app.main
   ```
The backend server will launch at `http://localhost:8000`. It automatically creates local SQLite schemas and loads catalog assets on startup.

#### 3. Setup Frontend UI
Install Vite packages and start the developer interface:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
Open `http://localhost:3000` in your browser to run the developer workspace.

---

## 🛠️ App Module Architecture

The application is structured as a split web shell:
- **Tauri / Rust wrapper**: Provides secure local filesystem picker and process management for desktop packaging.
- **FastAPI Backend**: Orchestrates model catalog queries, recommendation scoring, background download workers, OpenVINO GenAI compiles, local RAG vector indexing, and speech transcribe/synthesize routines.
- **React Vite Frontend**: Rich visual dashboard containing 12 premium glassmorphic pages with animated telemetry charts, waveforms, and preparation timelines.
- **SQLite DB Local Brain**: Persists app settings, chat messages, vector chunks references, tool permission checks, and audit history logs locally in `app_data/ultraedge_aipc_studio.db`.

---

## 📦 Features List

1. **System Hardware Scanner**: Offline diagnostic metrics of host CPU, Arc GPU, NPU driver status, and RAM limits.
2. **Hardware-aware Recommender**: Scores models depending on performance profile (Fast, Balanced, Quality, Workstation).
3. **Model Catalog Prep Timeline**: Simulates background conversion and optimization timeline (Download → Verify → Convert → Quantize → Benchmark → Ready).
4. **Personal and Code Assistants**: Chat workspace with local memory toggles and patch diff generator.
5. **Benchmark Studio**: Comparative charts measuring generation speed (tokens/sec) and first-token latency.
6. **Security Audit Logger**: Encrypted local database log showing access audits and wipe options.

---

## 📄 Documentation

The supplementary project documentation is structured under the [doc/](file:///d:/intel_devconsole/Intel_AIPC_Studio/UltraEdge-AIPC-Studio/doc) directory:
- [Changelog](file:///d:/intel_devconsole/Intel_AIPC_Studio/UltraEdge-AIPC-Studio/doc/CHANGELOG.md) - History of releases and updates.
- [Contributing Guidelines](file:///d:/intel_devconsole/Intel_AIPC_Studio/UltraEdge-AIPC-Studio/CONTRIBUTING.md) - Workflow for opening pull requests.
- [Security Policy](file:///d:/intel_devconsole/Intel_AIPC_Studio/UltraEdge-AIPC-Studio/SECURITY.md) - Offline guarantees and vulnerability disclosures.
- [Lint Baseline](file:///d:/intel_devconsole/Intel_AIPC_Studio/UltraEdge-AIPC-Studio/doc/LINT_BASELINE.md) - Lint rules and baseline configurations.

---

## 🤝 Support

We encourage community engagement and local support:
- **Answering questions on the forum**: Help other community members by participating in github discussions.
- **Improving the documentation**: Open PRs to correct guide errors, improve tutorials, or add hardware mapping guides.
- **Monitoring the issue queue**: Verify reported bugs and help identify steps to reproduce.
- **Enhancement Suggestions**: If you have an idea for an enhancement or a new feature, create a new topic on the forum in the "Feature" category. This will help to:
  - Determine if the capability already exists
  - Measure interest
  - Refine the concept

*Note: Please submit documentation issues and pull requests to the main documentation repository. Do not submit code pull requests until the project maintainers accept the proposal.*

---

## 👥 Contributing

Contributions from the developer community are what makes this project successful. For a complete guide to contributing, please see the [Contribution Guide](file:///d:/intel_devconsole/Intel_AIPC_Studio/UltraEdge-AIPC-Studio/CONTRIBUTING.md).

### Contribution List
- **Mr. Nitin Mane** (Intel Software Innovator) - Lead creator and core architecture contributor.
- **Open Source Community** - Enhancements, bug fixes, and system routing improvements.
---

## 🧱 Dependencies

The application relies on these main packages:
- **Backend**: `fastapi`, `uvicorn`, `openvino`, `openvino-genai`, `transformers`, `torch`, `sqlite3`, `psutil`
- **Frontend**: `react`, `vite`, `framer-motion`, `lucide-react`, `recharts`, `react-markdown`

---

## 📊 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Nitin-Mane/ultraedge-aipc-studio&type=Date)](https://star-history.com/#Nitin-Mane/ultraedge-aipc-studio&Date)

---

## 🪪 License

This project is licensed under the Apache License 2.0. See the [LICENSE](file:///d:/intel_devconsole/Intel_AIPC_Studio/UltraEdge-AIPC-Studio/LICENSE) file for details.
