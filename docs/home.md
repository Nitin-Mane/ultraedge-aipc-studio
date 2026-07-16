# UltraEdge AIPC Studio

Local-first AI developer workspace for Intel AI PCs. Run, optimize, and benchmark Qwen models with OpenVINO acceleration across CPU, GPU, and NPU.

## What It Does

- **Personal Assistant** — Multimodal chat (text, image, video, audio) powered by Qwen2.5-Omni-3B
- **Coding Agent** — Autonomous code generation, debugging, and refactoring with Qwen2.5-Coder-1.5B
- **Model Manager** — Download, convert, quantize, and benchmark OpenVINO models
- **Hardware Scanner** — Detect CPU, GPU, NPU, RAM, and storage; auto-resolve best device
- **Benchmark Studio** — Performance metrics, latency/throughput analysis per device
- **MCP Tools** — Model Context Protocol integration with web search, file access, and agent orchestration

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, FastAPI, SQLite, OpenVINO |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand |
| Models | Qwen2.5 (Omni, Coder) via OpenVINO IR format |
| CI | GitHub Actions (ruff + pytest, eslint + tsc + vitest) |

## Quick Links

- [Architecture](./architecture.md) — System design and module relationships
- [Developer Setup](./developer-setup.md) — Get running locally in 5 minutes
- [API Reference](./api-reference.md) — All REST endpoints documented
- [Design System](./design-system.md) — Tokens, components, and styling conventions
