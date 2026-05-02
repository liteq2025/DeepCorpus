"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

import type { StreamEvent } from "@/lib/ws-events.gen";

/**
 * One LLM call captured from a backend `llm_call` stream event.
 * Backend emits these from agentic_pipeline (4 chat stages so far);
 * other capabilities will pick the same protocol incrementally.
 */
export interface LlmCallRecord {
  id: string;
  recordedAt: number; // ms epoch
  capability: string;
  stage: string;
  source: string;
  model: string;
  binding: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  /** "exact" = from response.usage; "estimated" = char-count heuristic. */
  usageKind: "exact" | "estimated";
  turnId: string;
  sessionId: string;
  /** Detail surfaces — what the call carried into the prompt. */
  systemPromptKind: string;
  systemPromptChars: number;
  systemPromptPreview: string;
  messagesCount: number;
  messagesChars: number;
  tools: string[];
  toolSchemasCount: number;
  toolSchemaNames: string[];
  /** acting-stage only: which tools the LLM actually called this round. */
  toolCalls: string[];
  knowledgeBases: string[];
  skillsContextChars: number;
  memoryContextChars: number;
  notebookContextChars: number;
  historyContextChars: number;
  attachmentsCount: number;
  metadata?: Record<string, unknown>;
}

interface LlmTraceState {
  records: LlmCallRecord[]; // newest first
  enabled: boolean;
}

type Action =
  | { type: "RECORD"; record: LlmCallRecord }
  | { type: "CLEAR" }
  | { type: "SET_ENABLED"; enabled: boolean };

const MAX_RECORDS = 200;
const STORAGE_KEY = "dc.dev.trace";

function reducer(state: LlmTraceState, action: Action): LlmTraceState {
  switch (action.type) {
    case "RECORD":
      return {
        ...state,
        records: [action.record, ...state.records].slice(0, MAX_RECORDS),
      };
    case "CLEAR":
      return { ...state, records: [] };
    case "SET_ENABLED":
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            STORAGE_KEY,
            action.enabled ? "true" : "false",
          );
        } catch {
          // localStorage might be disabled / quota exceeded — drop silently.
        }
      }
      return { ...state, enabled: action.enabled };
    default:
      return state;
  }
}

interface LlmTraceContextValue {
  records: LlmCallRecord[];
  enabled: boolean;
  recordEvent: (event: StreamEvent) => void;
  clear: () => void;
  setEnabled: (enabled: boolean) => void;
}

const LlmTraceContext = createContext<LlmTraceContextValue | null>(null);

function readEnabledFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "true";
  } catch {
    // ignore
  }
  // Default ON in dev builds, OFF in production. Production users can opt in
  // via `localStorage.setItem("dc.dev.trace","true")` or a future toggle.
  return process.env.NODE_ENV === "development";
}

/**
 * Global LLM-call telemetry store. Provider lives near the top of the tree
 * (above UnifiedChatContext) so any capability's WS handler can route
 * `llm_call` events here without coupling to chat state.
 */
export function LlmTraceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    records: [],
    enabled: false,
  });

  // Hydrate `enabled` from localStorage on mount — initial state is false to
  // avoid SSR mismatch.
  useEffect(() => {
    dispatch({ type: "SET_ENABLED", enabled: readEnabledFromStorage() });
  }, []);

  const recordEvent = useCallback((event: StreamEvent) => {
    if (event.type !== "llm_call") return;
    const md = (event.metadata ?? {}) as Record<string, unknown>;
    const asStringList = (raw: unknown): string[] =>
      Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
    dispatch({
      type: "RECORD",
      record: {
        id: `${event.turn_id || event.session_id || "x"}-${event.seq || 0}-${Math.random().toString(36).slice(2, 8)}`,
        recordedAt: event.timestamp ? event.timestamp * 1000 : Date.now(),
        capability: String(md.capability ?? event.source ?? ""),
        stage: String(md.stage ?? event.stage ?? ""),
        source: event.source ?? "",
        model: String(md.model ?? ""),
        binding: String(md.binding ?? ""),
        promptTokens: Number(md.prompt_tokens ?? 0),
        completionTokens: Number(md.completion_tokens ?? 0),
        totalTokens: Number(md.total_tokens ?? 0),
        durationMs: Number(md.duration_ms ?? 0),
        usageKind: md.usage_kind === "estimated" ? "estimated" : "exact",
        turnId: event.turn_id || "",
        sessionId: event.session_id || "",
        systemPromptKind: String(md.system_prompt_kind ?? md.stage ?? ""),
        systemPromptChars: Number(md.system_prompt_chars ?? 0),
        systemPromptPreview: String(md.system_prompt_preview ?? ""),
        messagesCount: Number(md.messages_count ?? 0),
        messagesChars: Number(md.messages_chars ?? 0),
        tools: asStringList(md.tools),
        toolSchemasCount: Number(md.tool_schemas_count ?? 0),
        toolSchemaNames: asStringList(md.tool_schema_names),
        toolCalls: asStringList(md.tool_calls),
        knowledgeBases: asStringList(md.knowledge_bases),
        skillsContextChars: Number(md.skills_context_chars ?? 0),
        memoryContextChars: Number(md.memory_context_chars ?? 0),
        notebookContextChars: Number(md.notebook_context_chars ?? 0),
        historyContextChars: Number(md.history_context_chars ?? 0),
        attachmentsCount: Number(md.attachments_count ?? 0),
        metadata: md,
      },
    });
  }, []);

  const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);
  const setEnabled = useCallback(
    (v: boolean) => dispatch({ type: "SET_ENABLED", enabled: v }),
    [],
  );

  const value = useMemo<LlmTraceContextValue>(
    () => ({
      records: state.records,
      enabled: state.enabled,
      recordEvent,
      clear,
      setEnabled,
    }),
    [state.records, state.enabled, recordEvent, clear, setEnabled],
  );

  return (
    <LlmTraceContext.Provider value={value}>
      {children}
    </LlmTraceContext.Provider>
  );
}

export function useLlmTrace(): LlmTraceContextValue {
  const ctx = useContext(LlmTraceContext);
  if (!ctx) {
    throw new Error(
      "useLlmTrace() must be used inside <LlmTraceProvider>. Wire it in app/layout.tsx near the root.",
    );
  }
  return ctx;
}

/**
 * Optional read-only handle for components that just need to surface counts
 * but don't need to record (e.g. status pills).
 */
export function useLlmTraceReadonly(): {
  records: LlmCallRecord[];
  enabled: boolean;
} {
  const { records, enabled } = useLlmTrace();
  return { records, enabled };
}
