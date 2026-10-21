# Contributing to LazyOps AI

Thank you for your interest in contributing! LazyOps AI is an open-source, local-first AI productivity tool built for Hacktoberfest 2026. All skill levels are welcome.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Branch and PR Conventions](#branch-and-pr-conventions)
- [Reporting Bugs](#reporting-bugs)
- [Proposing Features](#proposing-features)
- [Good First Issues](#good-first-issues)

---

## Prerequisites

- Python 3.12+
- Node.js 20+
- [Ollama](https://ollama.com) installed and running
- Git

---

## Development Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/lazyops-ai.git
cd lazyops-ai

# 2. Copy environment configuration
cp .env.example .env
# Edit .env to set your Ollama model name

# 3. Backend setup
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -e ".[dev]"
alembic upgrade head
cd ..

# 4. Frontend setup
cd frontend
npm install
cd ..

# 5. Start Ollama (in a separate terminal)
ollama serve

# 6. Pull a model (first time)
ollama pull llama3.2

# 7. Start backend (in a separate terminal)
cd backend
uvicorn app.main:app --reload

# 8. Start frontend (in a separate terminal)
cd frontend
npm run dev
```

Open `http://localhost:5173` to see the app.

---

## Project Structure

```
lazyops-ai/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI application entry point
│   │   ├── core/             # Config, logging, errors, security
│   │   ├── api/              # Route handlers (thin controllers)
│   │   ├── db/               # SQLAlchemy models, session, migrations
│   │   ├── services/         # Business logic
│   │   ├── parsers/          # File format parsers
│   │   ├── ai/               # Ollama client, orchestrator, schemas
│   │   └── tools/            # Deterministic agent tools
│   ├── tests/                # pytest test suite
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── app/              # Router, providers
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page-level components
│   │   ├── hooks/            # Custom React hooks
│   │   └── lib/              # API client, utilities, types
│   └── package.json
├── demo/                     # Synthetic demo documents
├── PLAN.md                   # Implementation plan
├── ARCHITECTURE.md           # Technical architecture
├── CONTRIBUTING.md           # This file
└── README.md
```

---

## Coding Standards

### Python

- Formatter and linter: **Ruff** (`ruff format .` and `ruff check .`)
- Type hints on all public functions
- Pydantic models for all request/response schemas
- Docstrings on public classes and non-trivial functions
- No secrets or credentials in source code

```bash
cd backend
ruff format .
ruff check .
```

### TypeScript / React

- Strict TypeScript mode
- ESLint configuration enforced
- Functional components and hooks only
- Typed API client functions — no `any`
- No inline styles; use Tailwind classes

```bash
cd frontend
npm run lint
npm run type-check
```

---

## Testing Requirements

Every pull request must:

1. Include tests for new functionality
2. Not break existing tests

### Backend tests

```bash
cd backend
pytest
```

### Frontend tests

```bash
cd frontend
npm run test
```

### Coverage expectations

- New services: unit tests required
- New parsers: at least one valid input test + one invalid input test
- New API endpoints: at least one success test + one error test
- Security-sensitive code: adversarial test cases required

---

## Branch and PR Conventions

- Branch from `main`
- Branch naming: `feat/short-description`, `fix/issue-number-description`, `docs/what-changed`
- Keep PRs small and focused
- Write a clear PR description explaining *why*, not just *what*
- Link related issues
- All CI checks must pass
- At least one review required before merge

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add CSV parser
fix: reject symlinks outside workspace root
docs: update Ollama setup instructions
test: add deadline normalization edge cases
refactor: extract file validation into helper
```

---

## Reporting Bugs

Open a GitHub issue with:

- OS and Python/Node version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Relevant logs (redact personal information)

For **security vulnerabilities**, see [SECURITY.md](SECURITY.md).

---

## Proposing Features

Open a GitHub Discussion or issue before building large features. This avoids wasted effort if the feature doesn't fit the project's direction.

---

## Good First Issues

Look for issues labeled `good first issue`:

- Add a new file parser (e.g., DOCX, HTML)
- Improve task extraction validation
- Add a model compatibility test for a new Ollama model
- Improve keyboard navigation on action plan cards
- Add edge-case tests for the PDF parser
- Improve Windows path handling in file service
- Add a sample dataset for a specific use case (no personal data)
- Improve error messages for common Ollama setup issues

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) Code of Conduct. Be respectful, inclusive, and constructive.
