"""Verify the mock LLM stub matches what cloud_provider._openai_stream expects.

This is the proof that scripts/mock_llm_server.py is a *valid* substitute
for production OpenAI-compatible endpoints — without this test the e2e
infrastructure is built on a hope. If the mock drifts from the real
contract this test fails immediately.
"""

from __future__ import annotations

import os

import httpx
import pytest

MOCK_LLM_BASE_URL = os.environ.get("MOCK_LLM_BASE_URL", "http://127.0.0.1:8099/v1")
TIMEOUT_S = 5.0


def _mock_reachable() -> bool:
    try:
        with httpx.Client(timeout=2.0) as client:
            r = client.get(f"{MOCK_LLM_BASE_URL.rstrip('/v1').rstrip('/')}/health")
        return r.status_code == 200
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _mock_reachable(),
    reason=f"mock LLM not reachable at {MOCK_LLM_BASE_URL} — start it with "
    "`python scripts/mock_llm_server.py --port 8099 &`",
)


def test_mock_chat_completion_non_stream_shape() -> None:
    """Non-stream response matches OpenAI's chat.completion shape."""
    with httpx.Client(timeout=TIMEOUT_S) as client:
        r = client.post(
            f"{MOCK_LLM_BASE_URL}/chat/completions",
            json={
                "model": "mock-model",
                "stream": False,
                "messages": [{"role": "user", "content": "hello"}],
            },
        )
    assert r.status_code == 200
    body = r.json()
    assert body["object"] == "chat.completion"
    assert body["model"] == "mock-model"
    choice = body["choices"][0]
    assert choice["message"]["role"] == "assistant"
    assert "[mock] reply to: hello" in choice["message"]["content"]
    assert choice["finish_reason"] == "stop"


def test_mock_chat_completion_stream_emits_sse_chunks() -> None:
    """Stream response emits valid SSE: role chunk → content chunks → [DONE]."""
    import json

    chunks: list[dict] = []
    saw_done = False

    with httpx.Client(timeout=TIMEOUT_S) as client:
        with client.stream(
            "POST",
            f"{MOCK_LLM_BASE_URL}/chat/completions",
            json={
                "model": "mock-model",
                "stream": True,
                "messages": [{"role": "user", "content": "stream me"}],
            },
        ) as r:
            assert r.status_code == 200
            assert "text/event-stream" in r.headers.get("content-type", "")
            for line in r.iter_lines():
                if not line:
                    continue
                assert line.startswith("data: "), f"non-SSE line: {line!r}"
                payload = line[len("data: ") :]
                if payload == "[DONE]":
                    saw_done = True
                    break
                chunks.append(json.loads(payload))

    assert saw_done, "stream did not terminate with [DONE]"
    assert chunks[0]["choices"][0]["delta"]["role"] == "assistant"
    content_pieces = [
        c["choices"][0]["delta"]["content"]
        for c in chunks[1:]
        if "content" in c["choices"][0]["delta"]
    ]
    full = "".join(content_pieces).strip()
    assert "[mock] reply to: stream me" in full
    # Last non-DONE chunk must announce stop.
    assert chunks[-1]["choices"][0]["finish_reason"] == "stop"


def test_mock_error_path_via_error_prefix() -> None:
    """user content starting with 'ERROR:' returns HTTP 500 with mock_error type."""
    with httpx.Client(timeout=TIMEOUT_S) as client:
        r = client.post(
            f"{MOCK_LLM_BASE_URL}/chat/completions",
            json={
                "model": "mock-model",
                "stream": False,
                "messages": [{"role": "user", "content": "ERROR: trigger 500"}],
            },
        )
    assert r.status_code == 500
    body = r.json()
    assert body["error"]["type"] == "mock_error"


def test_mock_models_endpoint() -> None:
    """Some clients probe /v1/models; mock returns a single entry."""
    with httpx.Client(timeout=TIMEOUT_S) as client:
        r = client.get(f"{MOCK_LLM_BASE_URL}/models")
    assert r.status_code == 200
    body = r.json()
    assert body["object"] == "list"
    assert any(m["id"] == "mock-model" for m in body["data"])
