from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db import get_session
from app.main import app


@pytest.mark.integration
def test_ready_with_database(postgres_client: TestClient) -> None:
    response = postgres_client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_ready_without_database(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = create_engine("postgresql+psycopg://user:pass@127.0.0.1:1/unreachable")
    session_factory = sessionmaker(bind=engine)

    def get_unreachable_session() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    monkeypatch.setitem(app.dependency_overrides, get_session, get_unreachable_session)

    response = TestClient(app).get("/health/ready")

    assert response.status_code == 503
    assert response.json() == {"status": "error", "database": "unavailable"}
