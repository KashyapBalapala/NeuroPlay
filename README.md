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
│   └── web/             # Next.js frontend (not yet scaffolded)
├── services/
│   └── api/             # FastAPI backend (not yet scaffolded)
├── infrastructure/
│   └── docker/          # Docker and Compose configuration (planned)
├── docs/                # Project documentation
├── scripts/             # Development and utility scripts
├── .editorconfig
├── .env.example         # Template for local environment variables
├── .gitignore
└── README.md
```

## Development Stages

1. **Hand and finger rehabilitation**
2. **Upper-body rehabilitation**
3. **Full-body rehabilitation**

## Development Approach

Development proceeds incrementally. Each stage and feature is planned, built, and verified before the next begins. No stage is started until the previous one is stable.

## Local Setup

Prerequisites: Node.js, npm, Python 3, Git, Docker with Docker Compose.

```bash
cp .env.example .env   # then fill in local values
```

Application setup instructions will be added as the frontend and backend are scaffolded.
