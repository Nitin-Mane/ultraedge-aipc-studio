# Security Policy

## Offline Isolation Guarantee
UltraEdge AIPC Studio is designed to run local-first. We guarantee that:
- No telemetry data is sent to external networks.
- Ingested documents for RAG are chunked, indexed, and queried entirely offline using the local Python environment.
- Chat history logs, settings, and model metadata are stored locally on your device in the SQLite database `app_data/ultraedge_aipc_studio.db`.

---

## Vulnerability Disclosures
If you discover a security issue or vulnerability (such as potential local path escapes or tool permission exploits), please do not report it in a public GitHub issue.

Instead, please submit a private vulnerability report via GitHub Security Advisories for the repository.

We aim to review reports within 48 hours and coordinate a local patch release quickly.
