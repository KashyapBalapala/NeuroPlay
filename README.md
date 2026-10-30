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

## Privacy

Camera and tracking features follow these rules:

- Video frames and hand landmarks never leave the browser: no uploads, recording, screenshots, logging or storage of video, images or landmarks.
- Hand tracking (MediaPipe Hand Landmarker) runs entirely in the browser. The model and WASM runtime are served from the app's own origin; nothing loads from a CDN.
- A `Content-Security-Policy: connect-src 'self'` header blocks requests to other origins, including the usage metrics `@mediapipe/tasks-vision` would otherwise send to Google.
- The camera is only requested after the user presses a button, never on page load.
- All camera tracks are stopped when the user stops the camera, leaves the page or the component unmounts, so the camera indicator light turns off.

See [docs/privacy.md](docs/privacy.md) for details, including why the CSP must not be loosened without review.

## Getting Started

### Prerequisites

- Node.js 22 (with Corepack: `corepack enable pnpm`)
- pnpm (version pinned in `package.json`)
- [uv](https://docs.astral.sh/uv/) (installs Python 3.13 automatically)
- Docker with Docker Compose

```bash
cp .env.example .env   # then set POSTGRES_PASSWORD to a random local value
```

### Database (PostgreSQL)

```bash
docker compose up -d db     # PostgreSQL on 127.0.0.1:5432, credentials from .env
docker compose ps           # wait until db is "healthy"
docker compose down         # stop (add -v to delete the data volume)
```

### Frontend (`apps/web`)

```bash
pnpm install          # from the repository root
pnpm dev:web          # http://localhost:3000
pnpm lint:web
pnpm typecheck:web    # generates Next.js route types, then runs tsc
pnpm test:web         # Vitest + Testing Library (jsdom)
pnpm build:web
```

Open http://localhost:3000/camera-check to test webcam access, permissions and device selection, and http://localhost:3000/tracking-check to test hand tracking (landmark overlay, detected hand, handedness confidence, landmarks inside the frame, hand size, frame rate, inference time and loop time). Camera access needs HTTPS or `localhost`.

`dev`, `build` and `test` first copy MediaPipe's WASM files from `node_modules` into `apps/web/public/mediapipe/wasm/` (Git-ignored). The hand model is committed at `apps/web/public/models/hand_landmarker.task`; see [docs/models.md](docs/models.md).

### Backend (`services/api`)

```bash
cd services/api
uv sync
uv run alembic upgrade head            # apply migrations to the compose database
uv run uvicorn app.main:app --reload   # http://localhost:8000/health and /health/ready
uv run pytest -m "not integration"     # unit tests only, no Docker needed
uv run pytest                          # all tests; integration tests start a PostgreSQL Testcontainer
uv run ruff check .
uv run ruff format --check .
uv run mypy app
```

### Continuous Integration

GitHub Actions (`.github/workflows/ci.yml`) runs lint, type checks, tests and the web build on every push to `main` and every pull request.
