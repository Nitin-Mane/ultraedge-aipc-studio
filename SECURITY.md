# Security Policy

UltraEdge AIPC Studio processes model files, user prompts, local workspace
files, and generated content on the operator's computer. This document defines
the project's security boundary, reporting procedure, and operational
assumptions.

## Supported versions

Security corrections are applied to the current default branch and, when a
release is designated for continued support, to that release branch.

| Version | Security support |
| --- | --- |
| Current default branch | Supported |
| Latest designated release | Supported when identified in the release notes |
| Older alpha snapshots and unmaintained forks | Not supported |

The project is presently under active development. Operators should review
changes before deploying a new revision.

## Reporting a vulnerability

Do not report a suspected vulnerability in a public issue, discussion, pull
request, or chat transcript.

Use the repository's private vulnerability reporting facility under the
GitHub **Security** tab. If private reporting is not available, contact a
maintainer through a non-public channel and request reporting instructions.
Do not send exploit details through a public channel.

Include the following information where possible:

- affected revision, release, and operating system;
- hardware and execution device where relevant;
- affected endpoint, component, or file;
- prerequisite configuration and feature flags;
- a minimal reproduction procedure;
- observed and expected behavior;
- security impact and realistic attack conditions; and
- a proposed correction or mitigation, if known.

Use synthetic data in reports. Do not include real access tokens, private
documents, model credentials, or personal chat history.

The maintainers will attempt to acknowledge a complete report within two
business days. Triage, correction, and disclosure timing depend on severity,
reproducibility, and release impact. This is a response target, not a warranty.

## Security model

### Local binding

The backend binds to `127.0.0.1` by default and permits only configured local
frontend origins. This limits ordinary access to the local host; it does not
protect a machine already compromised by another local process or browser
extension.

Changing `ULTRAEEDGE_HOST`, CORS origins, reverse-proxy settings, or firewall
rules changes the security boundary. The API is not intended to be exposed to
an untrusted network without an independently reviewed authentication and
authorization layer.

### Local data

Application data is stored under `backend/app_data` by default. This includes
the SQLite database, generated speech, and OpenVINO cache data. Model files are
stored in the configured model directory. Workspace functions may read and
write paths selected by the operator.

These files are not claimed to be encrypted at rest. Protection depends on the
host operating system, account permissions, full-disk encryption, backup
policy, and physical security. Deleting records through the application does
not guarantee secure erasure from solid-state media, filesystem journals, or
backups.

### Network activity

The application is local-first, not necessarily air-gapped. Network activity
may occur during:

- Python and npm dependency installation;
- model discovery and download from Hugging Face;
- an explicitly invoked web search, URL fetch, or exchange-rate request; and
- access to an operator-configured remote endpoint.

No application telemetry service is intentionally configured in the current
source. This statement does not constitute a guarantee about third-party
package managers, model hosts, browser behavior, or dependencies. Operators
requiring isolation should enforce it with host firewall and network controls
and should pre-stage all required packages and models.

### Code execution

Local compiler and interpreter endpoints are disabled by default:

```text
ULTRAEEDGE_ENABLE_CODE_EXECUTION=false
```

When enabled, the runtime service can execute user-provided source code and
commands through local subprocesses. Temporary working directories and timeouts
reduce accidental interference, but they do not form a hardened operating-
system sandbox. Executed code may be able to access files, processes, network
resources, credentials, and devices available to the backend account.

Enable this capability only on a trusted workstation, under a minimally
privileged account, with code from trusted sources. Do not enable it on a
shared service or an API reachable by untrusted users.

The MCP panel's `code_interpreter` selection is not, by itself, authorization
to execute Python. In the current implementation it is a client-side tool
selection and is not connected to a Python execution handler. Actual runtime
execution remains subject to the backend feature flag described above.

### Models and generated output

Model files and generated output are untrusted data. Verify the source and
license of model artifacts. Do not assume generated commands, patches, or code
are safe. Review changes before writing them to a workspace or executing them.

Model conversion can consume substantial memory, storage, and processor time.
Resource exhaustion caused by an untrusted or malformed artifact is within the
security review scope.

### Hardware suitability check

The Intel Core Ultra suitability check is a compatibility control. It is not an
authentication mechanism, license control, or security boundary.

## Operator responsibilities

Operators should:

- retain the default loopback bind address unless network exposure has been
  deliberately secured;
- keep code execution disabled unless it is required;
- install dependencies and models from reviewed sources;
- protect the host account and application-data directories;
- avoid running the backend with administrator or root privileges;
- review generated code before execution;
- keep operating-system, browser, Python, Node.js, OpenVINO, and device-driver
  security updates current; and
- remove secrets from logs and diagnostic attachments before sharing them.

## Examples of reportable issues

The following are appropriate for private security reporting:

- path traversal or access outside an authorized workspace;
- command injection or bypass of the code-execution feature flag;
- unintended remote network access or disclosure of local data;
- cross-origin policy bypass;
- unsafe model archive extraction or integrity-check bypass;
- exposure of credentials, prompts, chat history, or workspace content;
- persistent script injection in the frontend;
- privilege escalation through runtime or maintenance endpoints; and
- denial of service caused by a small, untrusted request or artifact.

General defects without a confidentiality, integrity, availability, or
authorization impact may be reported through the normal issue tracker.

## Coordinated disclosure

Please allow the maintainers reasonable time to reproduce the issue, prepare a
correction, and notify affected users before public disclosure. Credit will be
provided when requested and when it does not conflict with the reporter's
privacy or the coordinated disclosure process.
