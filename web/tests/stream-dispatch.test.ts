/**
 * Tests for shouldAppendEventContent (P0.14e).
 *
 * This helper decides whether a streaming `content` event should be appended
 * to the assistant's visible message bubble. Get it wrong and the chat UI
 * either drops final tokens (assistant message looks truncated) or appends
 * intermediate tool/observation chunks into the wrong place. Locking it now
 * so P1 抽出 chat-runtime can't regress the contract.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { shouldAppendEventContent } from "../lib/stream";
import type { StreamEvent } from "../lib/ws-events.gen";

function makeEvent(overrides: Partial<StreamEvent>): StreamEvent {
  return {
    type: "content",
    source: "chat",
    stage: "responding",
    content: "x",
    metadata: {},
    session_id: "s1",
    turn_id: "t1",
    seq: 1,
    timestamp: 0,
    ...overrides,
  };
}

test("non-content events never append (covers all 12 other StreamEventTypes)", () => {
  const otherTypes: StreamEvent["type"][] = [
    "stage_start",
    "stage_end",
    "thinking",
    "observation",
    "tool_call",
    "tool_result",
    "progress",
    "sources",
    "result",
    "error",
    "session",
    "done",
  ];
  for (const type of otherTypes) {
    assert.equal(
      shouldAppendEventContent(makeEvent({ type })),
      false,
      `${type} must not append to assistant content`,
    );
  }
});

test("content event WITHOUT call_id appends (legacy unscoped chunks)", () => {
  assert.equal(
    shouldAppendEventContent(makeEvent({ metadata: {} })),
    true,
    "no call_id → top-level streaming, must append",
  );
});

test("content event with call_id + call_kind=llm_final_response appends", () => {
  assert.equal(
    shouldAppendEventContent(
      makeEvent({
        metadata: { call_id: "c1", call_kind: "llm_final_response" },
      }),
    ),
    true,
    "final assistant tokens must reach the bubble",
  );
});

test("content event with call_id but other call_kind does NOT append", () => {
  // These are tool-internal chunks (e.g. RAG snippet streaming) — they belong
  // in their tool panel, not in the main assistant bubble.
  for (const kind of ["tool_internal", "rag_chunk", "observation", undefined]) {
    assert.equal(
      shouldAppendEventContent(
        makeEvent({
          metadata: { call_id: "c1", call_kind: kind as string | undefined },
        }),
      ),
      false,
      `call_id + call_kind=${kind} must NOT append`,
    );
  }
});

test("missing metadata is treated as empty (no crash)", () => {
  // metadata is `Record<string, unknown>` typed but at runtime servers can
  // omit it. The helper currently coerces undefined→{} via `?? {}`.
  assert.equal(
    shouldAppendEventContent(
      makeEvent({ metadata: undefined as unknown as Record<string, unknown> }),
    ),
    true,
    "missing metadata behaves as no call_id (legacy unscoped)",
  );
});

test("call_id present as empty string is treated as 'no scope'", () => {
  // `if (!metadata.call_id)` is falsy on "" — empty string equals no scope.
  assert.equal(
    shouldAppendEventContent(
      makeEvent({ metadata: { call_id: "", call_kind: "tool_internal" } }),
    ),
    true,
  );
});
