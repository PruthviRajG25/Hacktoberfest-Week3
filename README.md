# Sloth Stack

> **Do less. Let your local AI handle the busywork.**

Sloth Stack is a local-first productivity workspace that turns inbox exports,
documents, and visual notes into useful, reviewable work. Upload a mail export,
analyze it with Ollama, review extracted tasks and deadlines, then approve safe
file actions. Your data stays in the local SQLite database and upload directory.

![Sloth Stack](./frontend/public/sloth-stack-logo.png)

## What it does

| Workspace | Purpose |
| --- | --- |
| **Dashboard** | Content-grounded daily briefing, workload counters, and priorities |
| **Files** | Upload mail exports and documents, then start local AI analysis |
| **Tasks** | Review extracted mail tasks, complete them, or create custom deadline-aware todos |
| **Action plans** | Approve or reject safe proposed actions and use the interactive planning notebook |
| **Activity** | Inspect the local audit trail |
| **Settings** | Configure Ollama and open Gmail, WhatsApp Web, or Slack |

### Import a mailbox or message export

Download the safe demo file from
[frontend/public/sloth-stack-inbox-sample.txt](./frontend/public/sloth-stack-inbox-sample.txt),
upload it from **Files**, and select **Analyze**. The analyzer extracts explicit
actions such as design reviews, invoice downloads, and sprint updates while
preserving the original wording of relative deadlines like “tomorrow” and
“before Monday”.

> Gmail, WhatsApp Web, and Slack buttons open their official web apps. They do
> not collect credentials or silently scrape messages. Export or copy messages
> locally before analysis.

## Architecture

```mermaid
flowchart LR
    UI[React + Vite\nresponsive workspace] --> API[FastAPI\n/api/v1]
    API --> DB[(SQLite\nmetadata + tasks)]
    API --> STORE[(Local uploads\nparsed text)]
    API --> AI[Ollama\nlocal model]
    AI --> API
    API --> UI
```

### Message-to-task pipeline

```mermaid
sequenceDiagram
    actor User
    participant Files as Files workspace
    participant API as FastAPI
    participant Parser as Local parser
    participant Ollama as Ollama
    participant Tasks as Tasks + plans

    User->>Files: Upload .txt/.md/.pdf/.json/.csv
    Files->>API: POST /api/v1/files/upload
    API->>Parser: Parse and store extracted text
    User->>Files: Click Analyze
    Files->>API: POST /api/v1/analysis
    API->>Ollama: Structured extraction prompt
    Ollama-->>API: Tasks, deadlines, category, summary
    API->>Tasks: Persist extracted tasks and action plan
    Tasks-->>User: Complete, approve, reject, or edit work
```

### Safety boundaries

```mermaid
flowchart TD
    Input[Untrusted document or message export] --> Parse[Parse as data]
    Parse --> Prompt[Bounded, schema-validated AI prompt]
    Prompt --> Review[Human review]
    Review -->|Approve| Safe[Deterministic safe file operation]
    Review -->|Reject| Stop[No execution]
```

AI output never executes arbitrary code or shell commands. Proposed actions are
shown to the user and require explicit approval.

## Local development

### Requirements

- Python 3.12+
- Node.js 18+
- Ollama (optional for AI features)
- A local Ollama model such as `llama3.2`

### Backend

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API: [http://127.0.0.1:8000](http://127.0.0.1:8000)

OpenAPI: [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)

### Frontend

```powershell
Set-Location frontend
npm install
npm run dev -- --host 127.0.0.1
```

Workspace: [http://127.0.0.1:5173](http://127.0.0.1:5173)

### Ollama

```powershell
ollama pull llama3.2
ollama list
```

If Ollama is unavailable, uploads and custom browser-local todos still work;
AI analysis reports the provider error instead of silently creating results.

## Verification

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m pytest

Set-Location ..\frontend
npm run build
npm run lint
```

## Configuration and data

Copy [.env.example](./.env.example) to `.env` for local configuration. Uploaded
files and the SQLite database live under `APP_DATA_DIR` (default: `backend/data`).
Keep this directory private and never commit credentials or real message exports.

Useful project references:

- [Architecture notes](./ARCHITECTURE.md)
- [Security guidance](./SECURITY.md)
- [Development plan](./PLAN.md)
- [Sample inbox export](./frontend/public/sloth-stack-inbox-sample.txt)
