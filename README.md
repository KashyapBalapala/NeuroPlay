# NeuroPlay AI

## Vision

NeuroPlay AI is a web-based rehabilitation platform that turns physical therapy exercises into interactive, game-like activities. Using a standard webcam and computer vision, it aims to guide patients through exercises, track their movement, and give therapists measurable progress data, making rehabilitation more engaging and accessible at home.

## Technology Stack

| Layer          | Technologies                                  |
| -------------- | --------------------------------------------- |
| Frontend       | Next.js, React, TypeScript, Tailwind CSS      |
| Backend        | Python, FastAPI, SQLAlchemy, Alembic, Pytest  |
| Database       | PostgreSQL                                    |
| Infrastructure | Docker, Docker Compose                        |

## Repository Structure

```text
NeuroPlay/
├── apps/
│   └── web/             # Next.js frontend
├── services/
│   └── api/             # FastAPI backend
├── infrastructure/
│   └── docker/          # Docker and Compose configuration (planned)
├── docs/                # Project documentation
├── scripts/             # Development and utility scripts
├── .editorconfig
├── .env.example         # Template for local environment variables
├── .gitignore
├── package.json         # pnpm workspace root
├── pnpm-workspace.yaml
└── README.md
```

## Development Stages

1. **Hand and finger rehabilitation**
2. **Upper-body rehabilitation**
3. **Full-body rehabilitation**

## Development Approach

Development proceeds incrementally. Each stage and feature is planned, built, and verified before the next begins. No stage is started until the previous one is stable.

## Getting Started

### Prerequisites

- Node.js 22 (with Corepack: `corepack enable pnpm`)
- pnpm (version pinned in `package.json`)
- [uv](https://docs.astral.sh/uv/) (installs Python 3.13 automatically)
- Docker with Docker Compose

```bash
cp .env.example .env   # then fill in local values
```

### Frontend (`apps/web`)

```bash
pnpm install          # from the repository root
pnpm dev:web          # http://localhost:3000
pnpm lint:web
pnpm build:web
```

### Backend (`services/api`)

```bash
cd services/api
uv sync
uv run uvicorn app.main:app --reload   # http://localhost:8000/health
uv run pytest
uv run ruff check .
uv run mypy app
```
