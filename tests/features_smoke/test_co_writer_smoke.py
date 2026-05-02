"""Smoke test for the co_writer (editor) router and module.

P3 阶段会把 co_writer 内核迁到 services/platform/editor/，并废弃独立前端入口。
本 router 仍保留，作为"任意特性都能调用编辑器"的内部端点。
"""

from __future__ import annotations

import pytest

try:
    from fastapi import FastAPI  # noqa: F401
    from fastapi.testclient import TestClient  # noqa: F401
except Exception:  # pragma: no cover
    FastAPI = None
    TestClient = None

pytestmark = pytest.mark.skipif(
    FastAPI is None or TestClient is None, reason="fastapi not installed"
)


def test_co_writer_router_imports_and_has_routes() -> None:
    from deeptutor.api.routers import co_writer

    paths = {route.path for route in co_writer.router.routes}
    assert "/edit" in paths, f"co_writer.router 缺少 /edit；现有: {paths}"
    assert "/documents" in paths, f"co_writer.router 缺少 /documents；现有: {paths}"


def test_co_writer_module_importable() -> None:
    """co_writer 内核必须可导入；P3 迁移后路径会变成 services.platform.editor。"""
    from deeptutor.co_writer.edit_agent import EditAgent
    from deeptutor.co_writer.storage import CoWriterStorage

    assert EditAgent is not None
    assert CoWriterStorage is not None
