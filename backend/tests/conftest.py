"""Tests run against a throwaway SQLite database seeded from scratch, with a
throwaway encryption key. The env must be set before `app` is imported."""
import os
import tempfile

from cryptography.fernet import Fernet

_tmp = tempfile.mkdtemp(prefix="shabab-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["CASE_KEY"] = Fernet.generate_key().decode()

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    seed()
    return TestClient(app)


class As:
    """Requests as a given demo user: `as_("parent").get("/api/...")`."""

    def __init__(self, client: TestClient, user: str):
        self.client, self.headers = client, {"X-Demo-User": user}

    def request(self, method: str, path: str, **kw):
        return self.client.request(method, path, headers=self.headers, **kw)

    def get(self, path: str, **kw):
        return self.request("GET", path, **kw)

    def post(self, path: str, **kw):
        return self.request("POST", path, **kw)


@pytest.fixture(scope="session")
def as_(client):
    return lambda user: As(client, user)


@pytest.fixture(scope="session")
def psy_cases(as_):
    r = as_("psychologist").get("/api/psych/cases")
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="session")
def case_id(psy_cases) -> int:
    """A case with content (sessions, assessments, plan) owned by `psychologist`."""
    return next(c["id"] for c in psy_cases if c["sessions"] > 0 and c["status"] != "closed")
