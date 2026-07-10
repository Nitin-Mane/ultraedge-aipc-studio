# Lint Baseline — 2026-07-10 (Phase 0 / T0.3)

Recorded at config introduction. New code must not add to these counts;
Phase 5 (T5.3) burns them down with `--fix` + manual cleanup.

## Backend — ruff (`backend/ruff.toml`, rules E F I B UP)

```
ruff check app  →  181 errors (134 auto-fixable)
Top: I001 unsorted-imports (23), B904 raise-without-from (21),
     UP035 deprecated-import (18), UP028 yield-in-for-loop (6)
```

Note: the one F821 (real bug: `OVModelForFeatureExrection` typo in
`app/rag/embedder.py`) was fixed immediately rather than baselined.

## Frontend — eslint (`frontend/.eslintrc.cjs`)

```
npx eslint . --ext ts,tsx  →  194 problems (22 errors, 172 warnings)
Mostly: @typescript-eslint/no-explicit-any, no-unused-vars (warn-level)
```

Run locally:
- Backend: `python -m ruff check app` (env `project`)
- Frontend: `npm run lint` (note: script uses `--max-warnings 0`, so it fails until T5.3 lands; use `npx eslint . --ext ts,tsx` to see counts)
