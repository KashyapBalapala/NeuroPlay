import os
import re
from collections.abc import Iterator
from pathlib import Path

# Point the app's default database at a closed port before `app` is imported, so
# tests never reach the development database from compose.yaml and do not need .env.
os.environ.update(
    POSTGRES_HOST="127.0.0.1",
    POSTGRES_PORT="1",
    POSTGRES_DB="test",
    POSTGRES_USER="test",
    POSTGRES_PASSWORD="test",
)
# Socket path mounted into the Testcontainers cleanup container (Ryuk). Docker Desktop
# only allows mounting the VM-internal /var/run/docker.sock, not the host-side socket.
os.environ.setdefault("TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE", "/var/run/docker.sock")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402
from testcontainers.community.postgres import PostgresContainer  # noqa: E402

from app.db import get_session  # noqa: E402
from app.main import app  # noqa: E402

COMPOSE_FILE = Path(__file__).resolve().parents[3] / "compose.yaml"


def compose_postgres_image() -> str:
    match = re.search(r"image:\s*(postgres:\S+)", COMPOSE_FILE.read_text())
    assert match, f"postgres image not found in {COMPOSE_FILE}"
    return match.group(1)


@pytest.fixture(scope="session")
def postgres_client() -> Iterator[TestClient]:
    """Client whose database dependency uses a throwaway PostgreSQL Testcontainer."""
    with PostgresContainer(compose_postgres_image(), driver="psycopg") as postgres:
        engine = create_engine(postgres.get_connection_url())
        session_factory = sessionmaker(bind=engine)

        def get_test_session() -> Iterator[Session]:
            with session_factory() as session:
                yield session

        app.dependency_overrides[get_session] = get_test_session
        yield TestClient(app)
        app.dependency_overrides.pop(get_session, None)
        engine.dispose()
