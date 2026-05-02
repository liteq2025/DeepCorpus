"""Smoke test for the tutorbot feature router."""

from __future__ import annotations

import pytest

try:
    from fastapi import FastAPI
    from fastapi.testclient import TestClient  # noqa: F401
except Exception:  # pragma: no cover
    FastAPI = None
    TestClient = None

pytestmark = pytest.mark.skipif(
    FastAPI is None or TestClient is None, reason="fastapi not installed"
)


def test_tutorbot_router_imports_and_has_routes() -> None:
    """tutorbot router 含核心路由（无 /health，但有 /souls 等管理端点）。"""
    from deeptutor.api.routers import tutorbot

    paths = {route.path for route in tutorbot.router.routes}
    assert "/souls" in paths, f"tutorbot.router 缺少 /souls；现有: {paths}"
    assert "/recent" in paths, f"tutorbot.router 缺少 /recent；现有: {paths}"
    assert "/channels/schema" in paths, (
        f"tutorbot.router 缺少 /channels/schema；现有: {paths}"
    )


def test_tutorbot_manager_importable() -> None:
    """services.tutorbot.manager 可导入（P4 迁移后会移到 features/tutorbot/）。"""
    from deeptutor.services.tutorbot import get_tutorbot_manager

    assert callable(get_tutorbot_manager)
