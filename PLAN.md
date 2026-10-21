# PLAN.md — LazyOps AI

> **Status:** Active Development — Hacktoberfest 2026 Week 3
>
> Keep this document updated as work progresses. Mark tasks complete only after implementation **and** verification.

---

## A. Project Overview

### Product Vision

LazyOps AI is a **local-first productivity assistant** that automates repetitive digital housekeeping — organizing documents, extracting tasks, detecting duplicates, and suggesting actions — using a locally running AI model. Your files never leave your machine.

### Tagline

> *Do less. Let your local AI handle the busywork.*

### Problem Statement

Knowledge workers and developers accumulate thousands of documents, notes, exported chat logs, and miscellaneous files. Finding, categorizing, and acting on this digital clutter is tedious and time-consuming. Existing AI productivity tools require uploading personal files to remote servers, raising privacy concerns.

LazyOps AI solves this by bringing AI-powered organization to your local machine using [Ollama](https://ollama.com).

### Target Users

- Developers managing project notes and exported logs
- Students organizing research files and assignment notes
- Individuals with accumulated digital clutter who value privacy
- Open-source contributors (Hacktoberfest 2026)

### Core Use Cases

1. Upload documents → extract tasks and deadlines
2. Scan a folder → suggest categories and flag duplicates
3. Review an AI-generated action plan → approve or reject each operation
4. Generate a daily briefing from recent documents
5. Track all AI decisions in a transparent audit trail

### Hacktoberfest Theme Alignment

- Open-source, MIT-licensed, beginner-friendly contribution surface
- Local AI inference (Ollama) — no API keys required
- Real backend + real database — not a static demo
- Clearly documented architecture and contribution paths

### MVP Definition

A working end-to-end flow where a user can:

1. Upload a `.txt`, `.md`, `.pdf`, `.json`, or `.csv` file
2. Trigger AI analysis (Ollama)
3. Review extracted tasks, categories, and a proposed action plan
4. Approve or reject individual actions
5. See approved actions executed and logged in an audit trail
6. Generate a daily briefing
7. View all history on a dashboard backed by real data

### Explicit Non-Goals (MVP)

- No cloud model API (no OpenAI, Anthropic, Google, etc.) as a mandatory dependency
- No real-time collaboration or multi-user support
- No mobile app
- No automatic scheduled execution without explicit user trigger
- No arbitrary shell command execution by the AI
- No file system access beyond the explicitly configured workspace root

---

## B. Functional Requirements

### File Upload and Folder Selection

- Users may upload one or more files via the browser
- Supported formats: `.txt`, `.md`, `.pdf`, `.json`, `.csv`
- Files are stored under `APP_DATA_DIR/uploads/` with a UUID-based storage name
- Original filename is preserved as metadata only — never used as a filesystem path
- Configurable upload size limit (default: 10 MB per file)
- Unsupported formats are rejected with a descriptive error
- A configurable workspace root may be scanned (future; not MVP folder picker)

### File Parsing

- Each format has a dedicated parser implementing a common interface
- Parsers extract plain text and key metadata (title, author if available, word count, page count for PDFs)
- Output is size-limited to prevent excessively large prompts
- Parsers run synchronously within the background analysis task
- Parsing errors do not crash the application; they are recorded and surfaced to the user

### AI Extraction

- The Ollama client sends a bounded, structured prompt to the configured local model
- The model returns JSON matching a Pydantic schema
- If the model response is invalid, a bounded retry (max 2) is attempted
- All model responses are validated before any downstream use
- Extracted data is stored in the database linked to the source file

### Task and Deadline Detection

- The AI identifies action items, to-dos, and commitments from document text
- Each task includes: description, source file, optional deadline, priority estimate, confidence score
- Deadlines are normalized to ISO 8601 dates; ambiguous dates are flagged
- Users can edit or dismiss incorrectly extracted tasks

### Categorization

- The AI assigns each file to one of a predefined set of categories
- Categories: `work`, `personal`, `finance`, `health`, `learning`, `legal`, `reference`, `archive`, `other`
- Confidence score is recorded alongside the category suggestion
- Users see the suggestion; it does not auto-apply without approval

### Duplicate Detection

- Exact duplicates are identified using SHA-256 file content hashing
- Near-duplicate candidates are flagged by the AI based on semantic similarity (lower confidence)
- The system clearly distinguishes hash-confirmed duplicates from AI-suggested candidates
- No file is deleted without explicit user approval

### Filename Suggestions

- The AI suggests a descriptive, normalized filename for each document
- Suggestions follow a `snake_case` or `kebab-case` convention configurable in settings
- Suggestions are proposed actions requiring approval — not auto-applied

### Action Plan Generation

- After analysis, the system creates a structured `ActionPlan` with `ProposedAction` items
- Each action has: type, description, source file, target (if applicable), rationale, expected effect, safety checks
- Action types: `categorize`, `rename`, `flag_duplicate`, `create_task`, `generate_briefing`
- Plans are stored in the database and presented for review

### Approval and Rejection

- Users approve or reject each `ProposedAction` individually
- Rejected actions are never executed
- Approved actions transition to `executing` then `succeeded` or `failed`
- The application prevents executing the same action twice (idempotency check)

### Safe Execution

- Only approved actions are executed
- Execution is performed by trusted Python functions, not by the model
- File rename/move operations are restricted to the configured workspace root
- Path traversal is rejected at every validation point
- All executions are recorded in the audit log

### Daily Briefing

- User triggers briefing generation (manual trigger for MVP)
- System retrieves recent documents, extracted tasks, and upcoming deadlines
- Ollama generates a plain-text summary
- Briefing is stored and displayed on the dashboard

### Audit History

- Every significant event is recorded: upload, parse, analysis start/complete, action proposed/approved/rejected/executed
- Events include: timestamp, event type, description, source file, actor (user or system), outcome
- History is paginated and filterable
- Sensitive document contents are NOT stored in audit events

### Settings and Model Configuration

- Ollama base URL (default: `http://127.0.0.1:11434`)
- Configured model name
- Upload size limit
- Workspace data directory
- Allowed CORS origins
- Log level

---

## C. Nonfunctional Requirements

| Area | Requirement |
|------|-------------|
| **Privacy** | Files are processed locally; no telemetry; no external network calls except to local Ollama |
| **Security** | Path validation, symlink rejection, type validation, size limits, no shell execution, approval gates |
| **Accessibility** | WCAG 2.1 AA targets; keyboard navigation; ARIA labels; sufficient color contrast |
| **Performance** | Analysis runs in background; UI remains responsive; polling for job status |
| **Reliability** | Failed jobs are recorded; retries are bounded; no infinite loops |
| **Maintainability** | Modular structure; typed interfaces; documented public APIs |
| **Offline** | Core features work without internet; Ollama must be running locally |
| **Error Handling** | Structured error responses; actionable messages; no raw tracebacks to users |
| **Testability** | Dependency injection; mockable Ollama client; deterministic tools |

---

## D. Phased Implementation

### Phase 0 — Repository Assessment and Design ✅

**Goal:** Understand starting state, define architecture, create documentation.

- [x] Inspect existing repository
- [x] Create `PLAN.md`
- [x] Create `ARCHITECTURE.md`
- [x] Create `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`
- [x] Create `.env.example`, `.gitignore`

**Definition of Done:** Documentation files exist and are accurate.

---

### Phase 1 — Project Foundation

**Goal:** Backend and frontend scaffold with working health checks and API connectivity.

**Features:**
- Python virtual environment and dependencies
- FastAPI app with versioned router
- Database models and initial Alembic migration
- `GET /api/v1/health` endpoint
- `GET /api/v1/settings` and `PATCH /api/v1/settings`
- Vite + React + TypeScript + Tailwind CSS scaffold
- TanStack Query provider + API client base
- Proxy from Vite to FastAPI

**Files/Modules:**
- `backend/pyproject.toml`, `backend/app/main.py`
- `backend/app/core/config.py`, `backend/app/core/errors.py`
- `backend/app/db/base.py`, `backend/app/db/session.py`, `backend/app/db/models.py`
- `backend/app/api/router.py`, `backend/app/api/routes/health.py`
- `frontend/` — full Vite scaffold

**Acceptance Criteria:**
- `uvicorn app.main:app` starts without error
- `GET /api/v1/health` returns `{"status": "ok"}`
- `npm run dev` starts the frontend
- Frontend displays a connected status

**Tests:**
- `test_health_endpoint` returns 200 with correct body

---

### Phase 2 — File Ingestion

**Goal:** Working file upload, validation, parsing, and metadata storage.

**Features:**
- `POST /api/v1/files/upload`
- `GET /api/v1/files`
- `GET /api/v1/files/{file_id}`
- `DELETE /api/v1/files/{file_id}`
- Parsers for `.txt`, `.md`, `.pdf`, `.json`, `.csv`
- File size validation
- Type validation (extension + magic bytes where practical)
- Storage under UUID-named paths

**Acceptance Criteria:**
- Upload `.txt` file → stored, parsed, metadata returned
- Upload unsupported type → 422 with clear message
- Upload oversized file → 413 with clear message
- Delete file → removed from storage and database

**Tests:**
- Parser unit tests for each format
- Path traversal rejection test
- Oversized file rejection test

---

### Phase 3 — Local AI Integration

**Goal:** Ollama client, health check, structured extraction.

**Features:**
- `GET /api/v1/ai/status`
- `GET /api/v1/ai/models`
- Ollama client with timeout handling
- Pydantic schemas for AI responses
- Bounded retry on invalid output
- Actionable errors when Ollama is unavailable

**Acceptance Criteria:**
- Status endpoint shows correct Ollama availability
- Valid model response is parsed and stored
- Invalid JSON from model triggers retry then failure
- Timeout from Ollama triggers failure with clear error

---

### Phase 4 — Agent Tools and Planning

**Goal:** Categorization, task extraction, duplicate detection, filename suggestions, action plan generation.

**Features:**
- `POST /api/v1/analysis` — start analysis job
- `GET /api/v1/analysis/{analysis_id}` — poll status
- `GET /api/v1/tasks`
- `PATCH /api/v1/tasks/{task_id}`
- `GET /api/v1/action-plans`
- `GET /api/v1/action-plans/{plan_id}`
- Agent orchestrator
- Tool registry with all required tools

**Acceptance Criteria:**
- Analysis job transitions: `queued → running → completed`
- Tasks extracted from document are persisted
- Action plan created with correct proposed actions
- Duplicate candidates identified

---

### Phase 5 — Human Approval and Auditability

**Goal:** Per-action approval, rejection, execution, and full audit trail.

**Features:**
- `POST /api/v1/actions/{action_id}/approve`
- `POST /api/v1/actions/{action_id}/reject`
- `GET /api/v1/activity`
- Execution engine for approved actions
- Idempotency checks
- Audit event recording

**Acceptance Criteria:**
- Rejected action: never executed
- Approved action: executed and logged
- Duplicate approval: idempotency returns already-executed state
- Failed action: recorded as `failed`, not `succeeded`

---

### Phase 6 — Frontend Dashboard

**Goal:** All UI screens connected to real backend APIs.

**Features:**
- Dashboard with real metrics
- Files page with upload and management
- Tasks page with extracted tasks
- Action plans page with approval controls
- Activity history page
- Settings page
- AI status and error states

---

### Phase 7 — Testing and Security Hardening

**Goal:** Comprehensive tests passing, security edge cases covered.

---

### Phase 8 — Packaging and Open-Source Launch

**Goal:** Demo data, screenshots, complete README, Hacktoberfest readiness.

---

## E. Prioritization

| Feature | Priority |
|---------|----------|
| Health endpoint | P0 |
| File upload + parsing | P0 |
| Ollama integration | P0 |
| Task extraction | P0 |
| Action plan + approval | P0 |
| Audit trail | P0 |
| Daily briefing | P0 |
| Dashboard with real data | P0 |
| Duplicate detection | P1 |
| Filename suggestions | P1 |
| Light/dark theme | P1 |
| Folder scanning | P2 |
| Automatic scheduled briefing | P2 |
| Cloud model fallback | P2 |
| Playwright E2E | P2 |

---

## F. Testing Strategy

| Test Case | Expected Result | Level | Priority | Status |
|-----------|----------------|-------|----------|--------|
| `GET /api/v1/health` | 200 `{"status":"ok"}` | API | P0 | [ ] |
| Upload `.txt` file | 200, file stored | API | P0 | [ ] |
| Upload `.pdf` file | 200, text extracted | API | P0 | [ ] |
| Upload unsupported type | 422 with error | API | P0 | [ ] |
| Upload oversized file | 413 | API | P0 | [ ] |
| Path traversal filename | 422 rejected | Unit | P0 | [ ] |
| Malicious symlink | 422 rejected | Unit | P0 | [ ] |
| Ollama unavailable | 503 with clear message | API | P0 | [ ] |
| Invalid model JSON | Retry then failure | Unit | P0 | [ ] |
| Task extraction from text | Tasks persisted | Integration | P0 | [ ] |
| Approve action | Action executed | API | P0 | [ ] |
| Reject action | Action NOT executed | API | P0 | [ ] |
| Duplicate approval | Idempotent response | API | P0 | [ ] |
| Failed action recorded | Status = failed | Unit | P0 | [ ] |
| Prompt injection in doc | System instructions preserved | Unit | P0 | [ ] |

---

## G. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Model hallucinations | High | Medium | Schema validation, bounded retries, user approval gates |
| Model doesn't support tool calling | Medium | Medium | Use text-based structured output, not tool calls |
| Slow inference on low RAM | High | Medium | Async background tasks, timeout limits, status polling |
| Incorrect task extraction | High | Low | User can edit/dismiss tasks |
| Prompt injection in document content | Medium | High | System prompt hardening, output validation, no code execution |
| Path traversal via filename | Medium | Critical | Reject all user-supplied paths as storage names |
| Accidental destructive ops | Low | High | Approval gates, preview before execute, audit log |
| Platform-specific path behavior | Medium | Medium | Use `pathlib.Path` throughout, test on Windows and Linux |

---

## H. Release Checklist

- [ ] `README.md` complete with screenshots
- [ ] `PLAN.md` reflects actual implementation progress
- [ ] `ARCHITECTURE.md` matches actual code
- [ ] `CONTRIBUTING.md` explains setup and conventions
- [ ] `SECURITY.md` present
- [ ] `LICENSE` (MIT) present
- [ ] `.env.example` committed, `.env` gitignored
- [ ] `docker-compose.yml` works
- [ ] All P0 tests pass
- [ ] No secrets committed
- [ ] Demo data included (no personal information)
- [ ] Full demo walkthrough documented
- [ ] Known limitations documented
- [ ] Hacktoberfest good-first-issue labels suggested
