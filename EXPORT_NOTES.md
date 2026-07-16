# Publication Export Notes

This directory is a sanitized source export prepared for publication. No files
were uploaded or pushed while creating it.

The export intentionally omits:

- environment files other than `backend/.env.example`;
- downloaded and converted model files;
- OpenVINO caches and generated application data;
- SQLite databases, runtime settings, logs, and error reports;
- Python caches, frontend dependencies, and build output;
- editor settings, agent state, local Git history, and internal audit reports.

Before publishing, review the repository status and run a current secret scanner.
Create local configuration by copying `backend/.env.example`; never commit the
resulting `.env` file or credentials. Model artifacts should be downloaded or
generated locally according to the project documentation rather than committed.
