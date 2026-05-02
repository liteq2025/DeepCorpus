// AUTO-GENERATED — do not edit by hand.
// Source of truth: deeptutor/core/stream.py
// Regenerate via: `make types` (or `python3 scripts/gen_ws_types.py`).
//
// Phase 1 (FE↔BE WS contract codegen) — only covers server→client
// events. Client→server message types (StartTurnMessage / etc.) live
// in lib/unified-ws.ts and are manually mirrored on both sides because
// the BE side parses raw dicts. See docs/refactor/phase-1-ws-contract.md.

export type StreamEventType =
  | "stage_start"
  | "stage_end"
  | "thinking"
  | "observation"
  | "content"
  | "tool_call"
  | "tool_result"
  | "progress"
  | "sources"
  | "result"
  | "error"
  | "session"
  | "done"
  | "llm_call";

export interface StreamEvent {
  type: StreamEventType;
  source: string;
  stage: string;
  content: string;
  metadata: Record<string, unknown>;
  session_id: string;
  turn_id: string;
  seq: number;
  timestamp: number;
}
