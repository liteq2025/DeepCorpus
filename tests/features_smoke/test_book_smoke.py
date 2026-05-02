"""Smoke test for the book feature router."""

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


def test_book_router_imports_and_has_routes() -> None:
    """Router 可导入且含核心路由。P4 迁移后此测试必须仍通过。"""
    from deeptutor.api.routers import book

    paths = {route.path for route in book.router.routes}
    assert "/health" in paths, f"book.router 缺少 /health；现有: {paths}"
    assert "/books" in paths, f"book.router 缺少 /books；现有: {paths}"


def test_book_health_returns_200() -> None:
    from deeptutor.api.routers import book

    app = FastAPI()
    app.include_router(book.router, prefix="/api/v1/book")
    client = TestClient(app)

    resp = client.get("/api/v1/book/health")
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, dict)
