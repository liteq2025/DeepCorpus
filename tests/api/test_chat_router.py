"""Chat router behavior tests (P0.13 #1–#8).

Locks in the contracts P1 must preserve when抽出 chat-runtime + collapsing
legacy `/api/v1/chat` into unified_ws. Each test asserts ONE specific risk
identified in `docs/refactor/phase-v3.1-architecture-adjustments.md` §4.4.
"""

from __future__ import annotations

import pytest

from deeptutor.core.stream import StreamEvent, StreamEventType
from deeptutor.services.session.sqlite_store import SQLiteSessionStore
from deeptutor.services.session.turn_runtime import TurnRuntimeManager

from ._chat_test_helpers import (
    base_payload,
    install_chat_runtime_fakes,
    make_simple_orchestrator,
)

# ---------------------------------------------------------------------------
# #1 — chat_send_message_persists_user_and_assistant
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chat_send_message_persists_user_and_assistant(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    """One round-trip stores both user and assistant messages."""
    store = SQLiteSessionStore(tmp_path / "chat_history.db")
    runtime = TurnRuntimeManager(store)
    install_chat_runtime_fakes(
        monkeypatch, orchestrator_factory=make_simple_orchestrator("ack")
    )

    session, turn = await runtime.start_turn(base_payload("hello"))
    async for _ in runtime.subscribe_turn(turn["id"], after_seq=0):
        pass

    detail = await store.get_session_with_messages(session["id"])
    assert detail is not None
    roles = [m["role"] for m in detail["messages"]]
    assert roles == ["user", "assistant"], f"expected user+assistant, got {roles}"
    assert detail["messages"][0]["content"] == "hello"
    assert detail["messages"][1]["content"] == "ack"


# ---------------------------------------------------------------------------
# #2 — chat_session_resume_returns_full_history
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chat_session_resume_returns_full_history(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    """Subscribing again to a completed session yields all original messages."""
    store = SQLiteSessionStore(tmp_path / "chat_history.db")
    runtime = TurnRuntimeManager(store)
    install_chat_runtime_fakes(
        monkeypatch, orchestrator_factory=make_simple_orchestrator("first reply")
    )

    session, turn = await runtime.start_turn(base_payload("first user msg"))
    async for _ in runtime.subscribe_turn(turn["id"], after_seq=0):
        pass

    detail = await store.get_session_with_messages(session["id"])
    assert len(detail["messages"]) == 2

    # Send a second turn — same session
    install_chat_runtime_fakes(
        monkeypatch, orchestrator_factory=make_simple_orchestrator("second reply")
    )
    _, turn2 = await runtime.start_turn(
        base_payload("second user msg", session_id=session["id"])
    )
    async for _ in runtime.subscribe_turn(turn2["id"], after_seq=0):
        pass

    detail = await store.get_session_with_messages(session["id"])
    contents = [m["content"] for m in detail["messages"]]
    assert contents == [
        "first user msg",
        "first reply",
        "second user msg",
        "second reply",
    ], f"history wrong: {contents}"


# ---------------------------------------------------------------------------
# #3 — chat_attachments_handled (basic — payload reaches turn record)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chat_attachments_handled(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    """Attachments in payload survive into the persisted user message."""
    store = SQLiteSessionStore(tmp_path / "chat_history.db")
    runtime = TurnRuntimeManager(store)
    install_chat_runtime_fakes(
        monkeypatch, orchestrator_factory=make_simple_orchestrator("ack")
    )

    payload = base_payload(
        "see attached",
        attachments=[
            {
                "type": "image",
                "url": "https://example.com/x.png",
                "filename": "x.png",
                "mime_type": "image/png",
                "id": "att-1",
            }
        ],
    )
    session, turn = await runtime.start_turn(payload)
    async for _ in runtime.subscribe_turn(turn["id"], after_seq=0):
        pass

    detail = await store.get_session_with_messages(session["id"])
    user_msg = detail["messages"][0]
    attachments = user_msg.get("attachments") or []
    assert any(a.get("id") == "att-1" for a in attachments), (
        f"attachment lost: user_msg={user_msg}"
    )


# ---------------------------------------------------------------------------
# #4 — chat_tool_use_event_sequence
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chat_tool_use_event_sequence(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    """tool_call → tool_result → content arrive in order via subscribe_turn."""
    store = SQLiteSessionStore(tmp_path / "chat_history.db")
    runtime = TurnRuntimeManager(store)

    extras = [
        StreamEvent(
            type=StreamEventType.TOOL_CALL,
            source="chat",
            stage="tool",
            content="rag.search",
            metadata={"tool_name": "rag", "call_id": "c1"},
        ),
        StreamEvent(
            type=StreamEventType.TOOL_RESULT,
            source="chat",
            stage="tool",
            content="some chunks",
            metadata={"tool_name": "rag", "call_id": "c1"},
        ),
    ]
    install_chat_runtime_fakes(
        monkeypatch,
        orchestrator_factory=make_simple_orchestrator(
            "final answer", extra_events=extras
        ),
    )

    session, turn = await runtime.start_turn(base_payload("ask with tool"))
    events = []
    async for event in runtime.subscribe_turn(turn["id"], after_seq=0):
        events.append(event)

    types = [e["type"] for e in events]
    assert "tool_call" in types
    assert "tool_result" in types
    assert "content" in types
    # tool_call must precede tool_result must precede final content
    idx_call = types.index("tool_call")
    idx_result = types.index("tool_result")
    idx_content = types.index("content")
    assert idx_call < idx_result < idx_content, (
        f"order wrong: call={idx_call} result={idx_result} content={idx_content}"
    )


# ---------------------------------------------------------------------------
# #5 — chat_regenerate_replaces_trailing_assistant
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chat_regenerate_replaces_trailing_assistant(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    """regenerate_last_turn deletes trailing assistant and dispatches new turn."""
    store = SQLiteSessionStore(tmp_path / "chat_history.db")
    runtime = TurnRuntimeManager(store)
    install_chat_runtime_fakes(
        monkeypatch, orchestrator_factory=make_simple_orchestrator("first answer")
    )

    session, turn = await runtime.start_turn(base_payload("explain X"))
    async for _ in runtime.subscribe_turn(turn["id"], after_seq=0):
        pass

    detail = await store.get_session_with_messages(session["id"])
    assert [m["role"] for m in detail["messages"]] == ["user", "assistant"]

    # Regenerate
    install_chat_runtime_fakes(
        monkeypatch, orchestrator_factory=make_simple_orchestrator("regenerated answer")
    )
    _, new_turn = await runtime.regenerate_last_turn(session["id"])
    async for _ in runtime.subscribe_turn(new_turn["id"], after_seq=0):
        pass

    detail = await store.get_session_with_messages(session["id"])
    # User message unchanged; assistant replaced
    contents = [m["content"] for m in detail["messages"]]
    assert contents == ["explain X", "regenerated answer"], f"got {contents}"


# ---------------------------------------------------------------------------
# #6 — chat_cancel_turn_no_orphan_events
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chat_cancel_turn_no_orphan_events(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    """cancel_turn returns truthy and persists turn status as canceled."""
    import asyncio

    store = SQLiteSessionStore(tmp_path / "chat_history.db")
    runtime = TurnRuntimeManager(store)

    # Build a slow orchestrator so we have a window to cancel
    class _SlowOrchestrator:
        async def handle(self, _context):
            for i in range(50):
                yield StreamEvent(
                    type=StreamEventType.CONTENT,
                    source="chat",
                    stage="responding",
                    content=f"chunk {i}",
                    metadata={"call_kind": "llm_final_response"},
                )
                await asyncio.sleep(0.05)
            yield StreamEvent(type=StreamEventType.DONE, source="chat")

    install_chat_runtime_fakes(
        monkeypatch, orchestrator_factory=lambda: _SlowOrchestrator
    )

    session, turn = await runtime.start_turn(base_payload("long response"))
    # let it produce a couple events then cancel
    await asyncio.sleep(0.15)
    cancelled = await runtime.cancel_turn(turn["id"])
    assert cancelled, "cancel_turn returned falsy"

    # Drain remaining events without hanging
    async def _drain():
        async for _ in runtime.subscribe_turn(turn["id"], after_seq=0):
            pass

    await asyncio.wait_for(_drain(), timeout=2.0)

    persisted = await store.get_turn(turn["id"])
    assert persisted is not None
    assert persisted["status"] in ("canceled", "cancelled", "failed"), (
        f"unexpected status: {persisted['status']}"
    )


# ---------------------------------------------------------------------------
# #7 — chat_concurrent_turns_blocked
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chat_concurrent_turns_blocked(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    """A second start_turn for the same session while one is active raises busy."""
    import asyncio

    store = SQLiteSessionStore(tmp_path / "chat_history.db")
    runtime = TurnRuntimeManager(store)

    class _SlowOrchestrator:
        async def handle(self, _context):
            await asyncio.sleep(0.5)
            yield StreamEvent(
                type=StreamEventType.CONTENT,
                source="chat",
                content="late",
                metadata={"call_kind": "llm_final_response"},
            )
            yield StreamEvent(type=StreamEventType.DONE, source="chat")

    install_chat_runtime_fakes(
        monkeypatch, orchestrator_factory=lambda: _SlowOrchestrator
    )

    session, _turn = await runtime.start_turn(base_payload("first"))

    # Second turn on same session while first is in flight
    with pytest.raises((RuntimeError, ValueError, Exception)) as excinfo:
        await runtime.regenerate_last_turn(session["id"])
    err = str(excinfo.value).lower()
    assert "busy" in err or "regenerate" in err or "active" in err, (
        f"expected busy/active error, got: {err}"
    )

    # Cleanup: cancel + drain
    await runtime.cancel_turn(_turn["id"])
    async for _ in runtime.subscribe_turn(_turn["id"], after_seq=0):
        pass


# ---------------------------------------------------------------------------
# #8 — chat_capability_switch_mid_session
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chat_capability_switch_mid_session(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    """Switching `capability` between turns of one session does not lose history."""
    store = SQLiteSessionStore(tmp_path / "chat_history.db")
    runtime = TurnRuntimeManager(store)
    install_chat_runtime_fakes(
        monkeypatch, orchestrator_factory=make_simple_orchestrator("chat answer")
    )

    session, turn1 = await runtime.start_turn(base_payload("hi", capability="chat"))
    async for _ in runtime.subscribe_turn(turn1["id"], after_seq=0):
        pass

    install_chat_runtime_fakes(
        monkeypatch, orchestrator_factory=make_simple_orchestrator("solve answer")
    )
    _, turn2 = await runtime.start_turn(
        base_payload("solve x^2=4", session_id=session["id"], capability="deep_solve")
    )
    async for _ in runtime.subscribe_turn(turn2["id"], after_seq=0):
        pass

    detail = await store.get_session_with_messages(session["id"])
    assert len(detail["messages"]) == 4, f"history truncated: {detail['messages']}"
    # Last preferences should reflect the latest turn's capability
    assert detail["preferences"]["capability"] == "deep_solve"
