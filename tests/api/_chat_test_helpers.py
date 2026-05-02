"""Shared test helpers for chat-related router/runtime tests (P0.13)."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from deeptutor.core.stream import StreamEvent, StreamEventType


async def _noop_refresh(**_kwargs):
    return None


def install_chat_runtime_fakes(
    monkeypatch: pytest.MonkeyPatch,
    *,
    orchestrator_factory,
    context_builder_factory=None,
):
    """Install the standard set of fake orchestrator + context builder + memory.

    `orchestrator_factory` is a callable returning a FakeOrchestrator class
    (so each test can customize the events it yields). Same for
    `context_builder_factory` (default builds an empty context).
    """
    if context_builder_factory is None:

        class _DefaultContextBuilder:
            def __init__(self, *_args, **_kwargs) -> None:
                pass

            async def build(self, **kwargs):
                on_event = kwargs.get("on_event")
                if on_event is not None:
                    await on_event(
                        StreamEvent(
                            type=StreamEventType.PROGRESS,
                            source="context",
                            stage="summarizing",
                            content="summarize context",
                        )
                    )
                return SimpleNamespace(
                    conversation_history=[],
                    conversation_summary="",
                    context_text="",
                    token_count=0,
                    budget=0,
                )

        context_builder_factory = lambda: _DefaultContextBuilder  # noqa: E731

    monkeypatch.setattr(
        "deeptutor.services.llm.config.get_llm_config", lambda: SimpleNamespace()
    )
    monkeypatch.setattr(
        "deeptutor.services.session.context_builder.ContextBuilder",
        context_builder_factory(),
    )
    monkeypatch.setattr(
        "deeptutor.runtime.orchestrator.ChatOrchestrator", orchestrator_factory()
    )
    monkeypatch.setattr(
        "deeptutor.services.memory.get_memory_service",
        lambda: SimpleNamespace(
            build_memory_context=lambda: "",
            refresh_from_turn=_noop_refresh,
        ),
    )


def make_simple_orchestrator(
    response_text: str = "Hello",
    extra_events: list[StreamEvent] | None = None,
):
    """Build a FakeOrchestrator class that yields a fixed text + DONE."""
    extras = extra_events or []

    def _factory():
        class FakeOrchestrator:
            async def handle(self, _context):
                for event in extras:
                    yield event
                yield StreamEvent(
                    type=StreamEventType.CONTENT,
                    source="chat",
                    stage="responding",
                    content=response_text,
                    metadata={"call_kind": "llm_final_response"},
                )
                yield StreamEvent(type=StreamEventType.DONE, source="chat")

        return FakeOrchestrator

    return _factory


def base_payload(content: str, **overrides: Any) -> dict[str, Any]:
    """Build a minimal start_turn payload."""
    return {
        "type": "start_turn",
        "content": content,
        "session_id": overrides.pop("session_id", None),
        "capability": overrides.pop("capability", None),
        "tools": overrides.pop("tools", []),
        "knowledge_bases": overrides.pop("knowledge_bases", []),
        "attachments": overrides.pop("attachments", []),
        "language": overrides.pop("language", "en"),
        "config": overrides.pop("config", {}),
        **overrides,
    }
