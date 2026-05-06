"""End-to-end test: backend → mock LLM → backend → client (websocket).

Proves the e2e infrastructure works: a real WebSocket client connects to a
real running backend, the backend reaches a real running mock LLM, and the
``[mock] reply to: <user msg>`` fingerprint surfaces on the WS stream.

Skipped when either the e2e env (backend) or the mock LLM is unreachable.
Start the env with::

    python scripts/start_e2e_env.py --no-frontend &

then run::

    PYTHONPATH=. .venv/bin/python -m pytest tests/integration/test_backend_to_mock_llm_chat.py -q
"""

from __future__ import annotations

import asyncio
import json
import os

import httpx
import pytest

E2E_BACKEND_URL = os.environ.get("E2E_BACKEND_URL", "http://127.0.0.1:8012")
E2E_BACKEND_WS = E2E_BACKEND_URL.replace("http://", "ws://").replace("https://", "wss://")
MOCK_LLM_BASE_URL = os.environ.get("MOCK_LLM_BASE_URL", "http://127.0.0.1:8099/v1")


def _both_reachable() -> bool:
    try:
        with httpx.Client(timeout=2.0) as client:
            mock_health = MOCK_LLM_BASE_URL.rstrip("/v1").rstrip("/") + "/health"
            be_health = f"{E2E_BACKEND_URL}/api/v1/notebook/health"
            return (
                client.get(mock_health).status_code == 200
                and client.get(be_health).status_code == 200
            )
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _both_reachable(),
    reason=(
        "e2e env not reachable; start with `python scripts/start_e2e_env.py --no-frontend &`"
    ),
)


# ---------------------------------------------------------------------------
# Test
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chat_round_trip_through_mock_llm() -> None:
    """Open WS, send start_turn, drain events until DONE.

    Asserts:
      - we see at least one ``content`` event
      - the assistant text contains the mock fingerprint
      - the stream ends cleanly (we receive a turn-complete signal)
    """
    pytest.importorskip("websockets")
    import websockets

    user_msg = "ping for e2e"
    ws_url = f"{E2E_BACKEND_WS}/api/v1/ws"

    content_pieces: list[str] = []
    saw_completed = False

    async with websockets.connect(ws_url, ping_interval=None) as ws:
        await ws.send(
            json.dumps(
                {
                    "type": "start_turn",
                    "content": user_msg,
                    "session_id": None,
                    "capability": "chat",
                    "tools": [],
                    "knowledge_bases": [],
                    "attachments": [],
                    "language": "en",
                    "config": {},
                }
            )
        )

        # Keep reading until we see a status=completed metadata or 30s elapse.
        try:
            async with asyncio.timeout(30):
                async for raw in ws:
                    msg = json.loads(raw)
                    msg_type = msg.get("type")
                    if msg_type == "content":
                        content_pieces.append(str(msg.get("content", "")))
                    metadata = msg.get("metadata") or {}
                    if metadata.get("status") == "completed":
                        saw_completed = True
                        break
                    if msg_type == "done":
                        # Some flows emit a top-level done before metadata.
                        saw_completed = True
                        break
        except TimeoutError:
            pytest.fail(
                f"timed out after 30s; got {len(content_pieces)} content events. "
                f"Last pieces: {content_pieces[-3:]}"
            )

    assert saw_completed, "stream did not signal completion"
    assert content_pieces, "no content events received"
    full = "".join(content_pieces)
    assert "[mock] reply to:" in full, (
        f"mock fingerprint missing in assistant content; got: {full!r}"
    )
    assert user_msg in full, (
        f"mock should echo user message; got: {full!r}"
    )
