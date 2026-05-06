/**
 * Tests for ChatMessage union (P0.14d).
 *
 * TypeScript types vanish at runtime, so the value we lock here is:
 *   - Each client→server message kind constructs as a plain JSON object
 *     with exactly the `type` literal the backend handler expects (must
 *     match the case-strings in deeptutor/api/routers/unified_ws.py).
 *   - JSON.stringify round-trips without losing fields.
 *
 * This is a tripwire: if someone renames a literal in unified-ws.ts but
 * forgets the BE handler (or vice-versa), the corresponding test fails.
 */

import test from "node:test";
import assert from "node:assert/strict";

import type {
  CancelTurnMessage,
  ChatMessage,
  RegenerateMessage,
  ResumeTurnMessage,
  StartTurnMessage,
  SubscribeSessionMessage,
  SubscribeTurnMessage,
  UnsubscribeMessage,
} from "../lib/unified-ws";

// The set of literals the BE recognizes. Source: docs/refactor/ws-protocol-inventory.md §1.1
const BACKEND_RECOGNIZED_TYPES = new Set<string>([
  "message",
  "start_turn",
  "subscribe_turn",
  "subscribe_session",
  "resume_from",
  "unsubscribe",
  "cancel_turn",
  "regenerate",
]);

test("StartTurnMessage type literal is one the BE recognizes", () => {
  const msg: StartTurnMessage = { type: "start_turn", content: "hi" };
  assert.ok(BACKEND_RECOGNIZED_TYPES.has(msg.type));
  // Legacy alias still allowed by the FE union
  const msgLegacy: StartTurnMessage = { type: "message", content: "hi" };
  assert.ok(BACKEND_RECOGNIZED_TYPES.has(msgLegacy.type));
});

test("all subscribe/control message types match BE handler keys", () => {
  const sub: SubscribeTurnMessage = { type: "subscribe_turn", turn_id: "t" };
  const subSession: SubscribeSessionMessage = {
    type: "subscribe_session",
    session_id: "s",
  };
  const resume: ResumeTurnMessage = { type: "resume_from", turn_id: "t" };
  const unsub: UnsubscribeMessage = { type: "unsubscribe" };
  const cancel: CancelTurnMessage = { type: "cancel_turn", turn_id: "t" };
  const regen: RegenerateMessage = { type: "regenerate", session_id: "s" };

  for (const m of [sub, subSession, resume, unsub, cancel, regen]) {
    assert.ok(
      BACKEND_RECOGNIZED_TYPES.has(m.type),
      `BE does not recognize "${m.type}"`,
    );
  }
});

test("ChatMessage union JSON-roundtrips without losing fields", () => {
  const variants: ChatMessage[] = [
    {
      type: "start_turn",
      content: "hello",
      tools: ["rag"],
      capability: "chat",
      knowledge_bases: ["kb1"],
      session_id: null,
      attachments: [{ type: "image", url: "https://x.png" }],
      language: "zh",
      config: { temperature: 0.7 },
      notebook_references: [{ notebook_id: "nb1", record_ids: ["r1"] }],
      history_references: ["s2"],
      question_notebook_references: [42],
      skills: ["auto"],
    },
    { type: "subscribe_turn", turn_id: "t1", after_seq: 5 },
    { type: "subscribe_session", session_id: "s1", after_seq: 0 },
    { type: "resume_from", turn_id: "t1", seq: 10 },
    { type: "unsubscribe", turn_id: "t1", session_id: "s1" },
    { type: "cancel_turn", turn_id: "t1" },
    {
      type: "regenerate",
      session_id: "s1",
      overrides: { capability: "deep_solve", tools: [] },
    },
  ];

  for (const msg of variants) {
    const round = JSON.parse(JSON.stringify(msg));
    assert.deepEqual(round, msg, `round-trip lost data for ${msg.type}`);
  }
});

test("StartTurnMessage minimal shape matches what BE start_turn requires", () => {
  // BE turn_runtime.py:start_turn requires `content`. session_id/capability
  // optional (default to new session / "chat"). This test prevents a FE
  // refactor that accidentally makes content optional.
  const msg: StartTurnMessage = { type: "start_turn", content: "" };
  // @ts-expect-error — content must remain required
  const _bad: StartTurnMessage = { type: "start_turn" };
  void _bad;
  assert.equal(typeof msg.content, "string");
});
