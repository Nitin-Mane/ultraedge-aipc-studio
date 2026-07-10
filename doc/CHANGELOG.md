# Changelog

All notable changes to **UltraEdge AIPC Studio** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.1-alpha] - 2026-07-04

### Added
- Curated catalog support for latest Qwen model families (Instruct, Coder, Embedding, VL, Audio, Safety).
- Local hardware scanner detecting CPU, Intel Arc/Integrated GPU, Intel NPU, RAM limits, and disk space.
- Hardware-aware recommendation scoring model logic.
- Background worker threads simulating compilation (Download → Verify → Convert → Quantize → Benchmark → Ready).
- Private Local document ingest RAG parsing, indexing, deletion, and vector reference tracking.
- SSE chat stream generation adapter with fallback mockup outputs.
- Radial loader scanner animation frames on the Welcome Splash UI screen.
- Security audit log registry table saving database access timestamps offline.
- Persistent configurations setting (Default targets, model cache paths).
- Integrated official OpenVINO and Qwen logo images inside the frontend build.

### Fixed
- TypeScript relative hooks index paths compilation resolving.
- store `AppState` interface export definitions.
- button scaling props compiler warn crashes.
