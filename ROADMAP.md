# Roadmap - UltraEdge AIPC Studio

This roadmap outlines the plan for the next releases of the UltraEdge AIPC Studio developer workspace.

---

## 📅 Short-Term Milestones: v0.2.0-beta

### OpenVINO GenAI Integration Updates
- Support direct weight quantization to INT4 using the NPU-optimized configuration (`--sym`, `--group-size -1`, `--ratio 1.0`).
- Implement native C++ model loading tests compiled in Rust.

### Features
- **MCP Tool Marketplace**: Support model tool-calling via local Model Context Protocol servers.
- **Qwen-VL Image Studio**: Advanced visual canvas workspace enabling drag-and-drop bounding boxes for object detection.
- **Qwen-Omni advanced mode**: Support live voice conversations streaming from ASR directly into text generation and speech synthesis pipelines.
- **Local Eval Suite**: Integration of offline evaluation scripts measuring hallucination risk and retrieval context accuracy.

---

## 📅 Long-Term Milestones: v1.0.0-release

### Cross-Platform Desktop Packaging
- Build Tauri bundles (`.msi` installers for Windows, `.dmg` for macOS, `.deb` for Linux).
- Ship with a self-contained, pre-bundled mini-conda Python environment to eliminate setup scripts.

### Scaling & Security
- Enable database encryption for enterprise mode.
- Offline administrative policies to restrict unauthorized models from execution.
