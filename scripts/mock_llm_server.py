#!/usr/bin/env python
"""Mock OpenAI-compatible LLM server for v3 e2e tests.

Usage:
    python scripts/mock_llm_server.py --port 8099

Implements the *minimum* surface that
``deeptutor.services.llm.cloud_provider._openai_stream`` /
``_openai_complete`` exercise:

    POST /v1/chat/completions
        body: {"model", "messages": [...], "stream": true|false, ...}
        returns:
            stream=true  → text/event-stream (SSE) of role+content deltas,
                           terminated by `data: [DONE]\\n\\n`
            stream=false → application/json with `choices[0].message.content`

Behavior is deterministic:
  - model echoed back in the response payload
  - completion content = "[mock] reply to: <last user message, truncated>"
  - if the user message starts with literal "ERROR:" the server emits an
    HTTP 500 (lets tests cover the error path)

Why this exists (P0+ infra unblock for #28-#31):
  Real LLMs are slow, costly, and non-deterministic — useless for e2e
  testing. This stub makes the chat round-trip behavior testable without
  network egress or API keys. e2e tests start this server on a free port
  and point ``LLM_HOST`` at it before launching the backend.

This is a TEST-ONLY tool. It does not implement function calling, tools,
embeddings, or any real reasoning. Production code never imports it.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import time
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
import uvicorn

logger = logging.getLogger("mock_llm")
logging.basicConfig(level=logging.INFO, format="[mock_llm] %(message)s")

app = FastAPI(title="Mock LLM (v3 e2e)", version="0.1.0")


# ---------------------------------------------------------------------------
# Request inspection
# ---------------------------------------------------------------------------


def _last_user_message(messages: list[dict]) -> str:
    for msg in reversed(messages):
        if str(msg.get("role")) == "user":
            content = msg.get("content")
            if isinstance(content, list):
                # multipart: join text parts
                text_parts = [
                    part.get("text", "")
                    for part in content
                    if isinstance(part, dict) and part.get("type") == "text"
                ]
                return " ".join(text_parts).strip()
            return str(content or "").strip()
    return ""


def _build_completion_text(user_msg: str) -> str:
    """Deterministic, easily-assertable completion text."""
    truncated = user_msg[:80]
    return f"[mock] reply to: {truncated}"


# ---------------------------------------------------------------------------
# /v1/chat/completions — both streaming and non-streaming variants
# ---------------------------------------------------------------------------


@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    model = str(body.get("model") or "mock-model")
    messages = body.get("messages") or []
    if not isinstance(messages, list):
        raise HTTPException(status_code=400, detail="messages must be a list")

    user_msg = _last_user_message(messages)
    if user_msg.startswith("ERROR:"):
        # Test hook: drive the backend's error-path behavior.
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "type": "mock_error",
                    "message": user_msg,
                }
            },
        )

    completion = _build_completion_text(user_msg)
    completion_id = f"chatcmpl-mock-{uuid.uuid4().hex[:12]}"
    created = int(time.time())
    stream = bool(body.get("stream", False))

    if not stream:
        return {
            "id": completion_id,
            "object": "chat.completion",
            "created": created,
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": completion},
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": len(user_msg.split()),
                "completion_tokens": len(completion.split()),
                "total_tokens": len(user_msg.split()) + len(completion.split()),
            },
        }

    # Streaming branch — SSE chunks of role then content tokens, then [DONE].
    async def _sse() -> "asyncio.AsyncIterator[bytes]":
        # Initial "role" delta (matches real OpenAI behavior).
        first_chunk = {
            "id": completion_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [
                {"index": 0, "delta": {"role": "assistant"}, "finish_reason": None}
            ],
        }
        yield f"data: {json.dumps(first_chunk)}\n\n".encode()
        await asyncio.sleep(0.01)

        # Content token-by-token (split on whitespace for visibility).
        tokens = completion.split(" ")
        for i, token in enumerate(tokens):
            text = token if i == 0 else f" {token}"
            chunk = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": model,
                "choices": [
                    {"index": 0, "delta": {"content": text}, "finish_reason": None}
                ],
            }
            yield f"data: {json.dumps(chunk)}\n\n".encode()
            await asyncio.sleep(0.01)

        # Final stop chunk.
        stop_chunk = {
            "id": completion_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
        }
        yield f"data: {json.dumps(stop_chunk)}\n\n".encode()
        yield b"data: [DONE]\n\n"

    return StreamingResponse(_sse(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# Health + introspection
# ---------------------------------------------------------------------------


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "mock_llm"}


@app.get("/v1/models")
async def list_models() -> dict:
    """Some clients probe /v1/models on startup — return one entry."""
    return {
        "object": "list",
        "data": [
            {
                "id": "mock-model",
                "object": "model",
                "created": int(time.time()),
                "owned_by": "mock",
            }
        ],
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8099)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()

    logger.info(f"Starting mock LLM at http://{args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
