# Contributing to UltraEdge AIPC Studio

The original project is copyright 2026 Nitin Mane and is distributed under the
Apache License, Version 2.0. Contributions are considered for defect
correction, hardware compatibility, performance work, tests, and
documentation. Changes should be small enough to review, explicit about their
operating assumptions, and supported by suitable verification.

All material proposed for inclusion in the official project requires prior
maintainer approval and contributor sign-off under the
[Contributor Agreement](CONTRIBUTOR_AGREEMENT.md). These requirements govern
upstream acceptance; they do not restrict use or modification of a fork under
the Apache License.

## Before beginning work

Search the issue tracker and open pull requests before starting a change. Every
proposed contribution must be covered by an issue, maintainer request, or other
explicit approval as described in the Contributor Agreement.

For a large feature, public API change, new model family, storage migration, or
security-sensitive capability, open a design issue before writing the full
implementation. The proposal should state:

- the problem being solved;
- the proposed boundary and affected components;
- expected CPU, GPU, NPU, memory, and storage requirements;
- security and privacy consequences;
- compatibility or migration concerns; and
- a practical test plan.

Small documentation corrections and narrowly scoped defect fixes may use a
brief contribution request or an existing approved issue instead of a full
design proposal.

## Contribution agreement

Before opening a pull request:

1. Obtain approval for the contribution scope.
2. Read [CONTRIBUTOR_AGREEMENT.md](CONTRIBUTOR_AGREEMENT.md).
3. Sign off every submitted commit with your legal name and an email address:

   ```bash
   git commit --signoff
   ```

The sign-off records acceptance of the non-exclusive contribution terms. The
contributor retains ownership of original work while licensing the accepted
contribution under Apache 2.0. Corporate or substantial contributions may
require separate written authorization.

## Development environment

The application requires an Intel Core Ultra processor for normal startup.
Unit tests that do not initialize the complete application may run on other
machines, but contributors must state when hardware-dependent behavior was not
tested.

Follow the installation procedure in [Developer setup](docs/developer-setup.md).
At minimum, install:

- Python 3.10 or later;
- the packages in `backend/requirements.txt`;
- Node.js 20.19 or later; and
- the packages locked by `frontend/package-lock.json`.

Use `npm ci` when validating a clean checkout or reproducing continuous
integration. Use `npm install` only when intentionally updating dependencies.

## Branches and commits

Create a branch from the current default branch. Use a short, descriptive name,
for example:

```text
fix/token2wav-duration-allocation
feature/model-integrity-verification
docs/runtime-security-notes
```

Keep commits logically complete. Write commit subjects in the imperative mood,
such as `Correct editor scroll synchronization`. Do not combine formatting,
dependency upgrades, generated assets, and functional changes in one commit
unless they are inseparable.

Do not commit:

- model weights or converted model artifacts;
- virtual environments or `node_modules`;
- OpenVINO caches, generated audio, local databases, or benchmark output;
- credentials, access tokens, private URLs, or personal data; or
- editor-specific absolute paths.

## Engineering conventions

### Python backend

- Follow PEP 8 and retain Ruff compliance.
- Add type annotations to public functions and non-trivial internal APIs.
- Use Pydantic models for HTTP request and response validation.
- Keep route handlers thin. Put model loading, inference, storage, and hardware
  policy in their respective service modules.
- Use `pathlib.Path` for filesystem operations and validate paths before file
  access.
- Do not construct shell commands from untrusted strings.
- Chain exceptions when translating an internal exception into an API error.
- Log operational facts without recording prompts, credentials, or sensitive
  file contents unnecessarily.

### React frontend

- Use functional components and typed props.
- Keep network operations and persistent state separate from presentation
  where practical.
- Preserve `min-h-0`, `min-w-0`, and explicit overflow boundaries in complex
  resizable layouts.
- Provide labels, keyboard behavior, and focus handling for interactive
  controls.
- Avoid hard-coded performance figures unless they are measured at runtime.
- Do not describe a feature as a sandbox, encrypted store, or offline guarantee
  unless the implementation establishes that property.

### Design principles

Apply SOLID principles at module boundaries rather than introducing abstraction
for its own sake:

- A module should have one clear operational responsibility.
- Extend model loaders and device policies through defined interfaces instead
  of adding unrelated conditionals to route handlers.
- Implementations must preserve the contracts of the interfaces they replace.
- Prefer narrow protocols and request models over broad service objects.
- Runtime policy should depend on abstractions that can be tested without
  loading a model.

Duplication is preferable to a premature shared abstraction when the two use
cases do not yet have a stable common contract.

## Verification

Run checks appropriate to every affected area. The normal full verification is
as follows.

Backend:

```bash
cd backend
python -m ruff check app tests
python -m pytest tests -v --tb=short
```

Frontend:

```bash
cd frontend
npm run lint
npm test
npm run build
```

The repository's historical lint baseline may contain warnings. A contribution
must not introduce new errors or warnings in the files it changes. If a full
lint command fails because of an existing baseline issue, run the narrowest
relevant command and record both results in the pull request.

Additional verification is required when applicable:

- Run `python start.py --check-only` after changing hardware detection.
- Test startup and shutdown after changing the launcher or process handling.
- Test both cached and uncached paths after changing model downloads.
- Record model, precision, device, and host hardware for inference changes.
- Include before-and-after timing data for performance claims.
- Test keyboard navigation and at least one reduced viewport for user-interface
  changes.
- Test denied and enabled states for security-gated capabilities.

Do not report a model benchmark obtained from simulation code as a hardware
measurement.

## Pull requests

A pull request should contain:

1. A reference to the approved contribution request.
2. Signed-off commits that satisfy the Contributor Agreement.
3. A concise statement of the problem.
4. A description of the implemented change.
5. The principal files and interfaces affected.
6. The exact verification commands and their results.
7. Hardware and operating-system details for hardware-dependent changes.
8. Screenshots for visible user-interface changes.
9. Known limitations, compatibility concerns, and follow-up work.

Keep the pull request focused. Reviewers may request that unrelated changes be
separated.

## Dependency changes

Explain why a new dependency is necessary and why the standard library or an
existing dependency is insufficient. Pin backend dependencies consistently
with `backend/requirements.txt`; update `frontend/package-lock.json` with any
frontend package change.

For dependency updates, run the relevant vulnerability audit and document any
accepted advisory, transitive limitation, or platform-specific constraint.

## Security defects

Do not disclose a suspected vulnerability in a public issue or pull request.
Follow [SECURITY.md](SECURITY.md) and use the repository's private vulnerability
reporting mechanism. A public correction can be prepared after the maintainers
have assessed disclosure timing.

## Documentation

Documentation must use repository-relative links, portable commands, and UTF-8
text. Avoid machine-specific drive letters, `file://` links, marketing claims,
and guarantees that cannot be verified from the source.
