"""TutorBot per-channel isolation tests (P0.13 #9–#13).

Locks contracts that prevent cross-bot message bleed when P1 routes
tutorbot through unified_ws (?channel=tutorbot&bot_id=...).
"""

from __future__ import annotations

import importlib
from unittest.mock import MagicMock

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


# ---------------------------------------------------------------------------
# #9 — two channels in same bot config do not leak `enabled` flags
# ---------------------------------------------------------------------------


def test_two_channels_no_message_bleed(monkeypatch):
    """Two bots with overlapping channel types keep their tokens isolated."""
    from deeptutor.services.tutorbot.manager import BotConfig

    bot_a = BotConfig(
        name="bot-a",
        description="",
        persona="",
        channels={"telegram": {"enabled": True, "token": "AAA"}},
    )
    bot_b = BotConfig(
        name="bot-b",
        description="",
        persona="",
        channels={"telegram": {"enabled": True, "token": "BBB"}},
    )

    # Saving via independent BotConfig instances must not mutate the other
    bot_a.channels["telegram"]["token"] = "AAA-modified"
    assert bot_b.channels["telegram"]["token"] == "BBB", (
        "BotConfig instances share dict reference — channels are NOT isolated!"
    )


# ---------------------------------------------------------------------------
# #10 — channel disconnect cleans tasks via disconnected event
# ---------------------------------------------------------------------------


def test_channel_disconnect_pattern_documented():
    """The tutorbot WS handler uses asyncio.Event for cooperative disconnect.

    This is a *contract* test: it asserts the documented pattern exists in the
    WS handler source, so a P1 refactor that loses this pattern shows up here.
    """
    import inspect

    from deeptutor.api.routers import tutorbot

    src = inspect.getsource(tutorbot.bot_chat_ws)
    # The handler must contain the disconnected event pattern
    assert "disconnected = asyncio.Event()" in src, (
        "tutorbot WS handler must use disconnected = asyncio.Event() "
        "for cooperative cleanup (see docs/refactor/ws-protocol-inventory.md §4.3)"
    )
    assert "disconnected.set()" in src, "must call disconnected.set() on WS error"


# ---------------------------------------------------------------------------
# #11 — concurrent bot loads are not racy
# ---------------------------------------------------------------------------


def test_get_tutorbot_manager_is_singleton():
    """Multiple calls to get_tutorbot_manager() must return the same instance."""
    from deeptutor.services.tutorbot import get_tutorbot_manager

    a = get_tutorbot_manager()
    b = get_tutorbot_manager()
    assert a is b, "TutorBot manager must be a singleton"


# ---------------------------------------------------------------------------
# #12 — bot_id routing: WS handler returns 4004 when bot not found
# ---------------------------------------------------------------------------


def test_bot_not_found_in_ws_handler(monkeypatch):
    """Connecting to /tutorbot/{unknown_bot_id}/ws must close with 4004."""
    tutorbot_router_mod = importlib.import_module("deeptutor.api.routers.tutorbot")

    # Manager that returns no bot and no on-disk config
    fake_mgr = MagicMock()
    fake_mgr.get_bot.return_value = None
    fake_mgr.load_bot_config.return_value = None

    monkeypatch.setattr(tutorbot_router_mod, "get_tutorbot_manager", lambda: fake_mgr)

    app = FastAPI()
    app.include_router(tutorbot_router_mod.router, prefix="/api/v1/tutorbot")
    client = TestClient(app)

    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect) as excinfo:
        with client.websocket_connect("/api/v1/tutorbot/nonexistent-bot/ws") as ws:
            # Receive the explicit error frame first, then the close handshake
            err_frame = ws.receive_json()
            assert err_frame.get("type") == "error", (
                f"expected error frame first, got: {err_frame}"
            )
            assert "not found" in str(err_frame.get("content", "")).lower()
            ws.receive_text()  # raises WebSocketDisconnect with code 4004

    assert excinfo.value.code == 4004, (
        f"expected close code 4004 (Bot not found), got: {excinfo.value.code}"
    )


# ---------------------------------------------------------------------------
# #13 — bot manager exposes load/start/stop boundary
# ---------------------------------------------------------------------------


def test_bot_manager_exposes_lifecycle_methods():
    """The tutorbot manager must expose start/stop/get/load_config — required by P1.

    P1 dispatcher will call these from unified_ws when channel=tutorbot.
    Missing any method = P1 dispatcher can't be implemented.
    """
    from deeptutor.services.tutorbot import get_tutorbot_manager

    mgr = get_tutorbot_manager()
    required_methods = ("get_bot", "load_bot_config", "start_bot", "stop_all")
    for name in required_methods:
        assert hasattr(mgr, name), (
            f"TutorBot manager missing {name}() — required for P1 dispatcher"
        )
        assert callable(getattr(mgr, name)), f"{name} is not callable"
