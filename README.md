# LazyOps AI

LazyOps AI is a local-first productivity assistant for organizing documents,
extracting tasks, and reviewing safe automation proposals. Files are processed
by a FastAPI backend and an optional Ollama model running on the same machine.

## Current MVP

- Upload and parse `.txt`, `.md`, `.pdf`, `.json`, and `.csv` files.
- Persist file metadata and extracted content in SQLite.
- Run schema-validated analysis through Ollama when configured.
- Review extracted tasks, action plans, and the audit trail.
- Approve or reject proposed actions before execution.
- Generate a local daily briefing.
- Use a responsive React dashboard backed by the real API.

The application does not execute arbitrary model-generated code or shell
commands. File actions are limited to the deterministic tools in the backend.

## Local development

### Backend

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`. Interactive documentation is
at `/api/docs`.

### Frontend

```powershell
Set-Location frontend
npm install
npm run dev
```

The Vite development server is available at `http://localhost:5173` and
proxies `/api` requests to the backend.

### Ollama

Install Ollama separately, start it locally, and pull a model that supports
structured responses. The default model is `llama3.2`; change
`OLLAMA_MODEL` in `.env` or through the Settings page when needed. The core
file-management screens remain usable if Ollama is unavailable, while AI
analysis reports an actionable error.

## Verification

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m pytest

Set-Location ..\frontend
npm run build
npm run lint
```

## Configuration

Copy `.env.example` to `.env` and adjust values for the local environment.
Uploaded files and the SQLite database are stored below `APP_DATA_DIR`, which
defaults to `./data`. Keep that directory private and do not commit it.

See [ARCHITECTURE.md](./ARCHITECTURE.md), [PLAN.md](./PLAN.md),
[SECURITY.md](./SECURITY.md), and [CONTRIBUTING.md](./CONTRIBUTING.md) for
design, security, and contribution details.
