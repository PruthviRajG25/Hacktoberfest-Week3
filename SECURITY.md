# Security Policy

## Scope

LazyOps AI is designed for **local use only** on a single machine. The default configuration binds all services to `localhost` (127.0.0.1) and is not intended to be exposed to the internet or a shared network without additional security controls.

## Supported Versions

We actively maintain the current `main` branch. Security fixes are applied to the most recent release.

## Deployment Assumptions

This application assumes:

1. It runs on a trusted local machine under a single user account.
2. The backend is not exposed to untrusted networks.
3. Ollama is running locally on the same machine.
4. SQLite database files are protected by the operating system's user permissions.

**If you expose this application to a network (LAN, VPN, internet):**
- Add authentication before deploying
- Review CORS configuration
- Use HTTPS
- Restrict file system permissions

## Reporting a Vulnerability

If you discover a security vulnerability, **do not open a public GitHub issue**.

Please report it privately:

1. Open a [GitHub Security Advisory](https://github.com/your-org/lazyops-ai/security/advisories/new) on the repository.
2. Describe the vulnerability, the affected component, steps to reproduce, and the potential impact.
3. Allow reasonable time for a fix before public disclosure (coordinated disclosure).

We will acknowledge your report within 5 business days and work to resolve critical issues promptly.

## Known Security Properties

### What LazyOps AI does to protect you

- Uploaded files are stored under a restricted, application-managed directory
- Original filenames are never used as filesystem path components
- All file paths are resolved and validated against a configured root before any operation
- Symlinks that escape the workspace root are rejected
- The AI model cannot execute shell commands or evaluate arbitrary code
- All file-modifying actions require explicit human approval
- Model output is validated against strict schemas before use
- Document contents are treated as untrusted input

### What LazyOps AI does NOT guarantee

- It is **not** air-gapped. Dependencies require internet during installation. Ollama may check for model updates.
- It is **not** designed for multi-user or networked deployment in its current form
- It does **not** encrypt the SQLite database or uploaded files at rest
- It does **not** provide authentication or authorization for a networked deployment

## Dependency Security

Run `pip audit` (Python) and `npm audit` (Node.js) to check for known vulnerabilities in dependencies.

Keep Ollama and model weights up to date using `ollama pull <model>`.
