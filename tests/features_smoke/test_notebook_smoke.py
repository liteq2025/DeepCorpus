"""Smoke test for the notebook feature router."""

from __future__ import annotations

import pytest

try:
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
except Exception:  # pragma: no cover
    FastAPI = None
    TestClient = None

pytestmark = pytest.mark.skipif(
    FastAPI is None or TestClient is None, reason="fastapi not installed"
)


def test_notebook_router_imports_and_has_routes() -> None:
    from deeptutor.api.routers import notebook

    paths = {route.path for route in notebook.router.routes}
    assert "/health" in paths, f"notebook.router 缺少 /health；现有: {paths}"
    assert "/list" in paths, f"notebook.router 缺少 /list；现有: {paths}"


def test_notebook_health_returns_200() -> None:
    from deeptutor.api.routers import notebook

    app = FastAPI()
    app.include_router(notebook.router, prefix="/api/v1/notebook")
    client = TestClient(app)

    resp = client.get("/api/v1/notebook/health")
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, dict)
