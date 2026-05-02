/**
 * Shared types + constants for the /co-writer route. Extracted from the
 * mega-page split (Phase 2 slice 2.5) — see
 * docs/refactor/phase-2-megapages.md.
 */

/* ── Types ──────────────────────────────────────────────── */

export type EditAction = "rewrite" | "shorten" | "expand";
export type SelectionMode = EditAction | "none";
export type SourceOption = "none" | "rag" | "web";
export type ToolName =
  | "brainstorm"
  | "rag"
  | "web_search"
  | "code_execution"
  | "reason"
  | "paper_search";

export interface KnowledgeBase {
  name: string;
  is_default?: boolean;
}

export interface ToolbarItem {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  snippet?: string;
  type?: "separator";
  action?: () => void;
}

export interface SelectedRange {
  start: number;
  end: number;
  text: string;
  snapshot: string;
}

export interface SelectionPopoverState {
  visible: boolean;
  top: number;
  left: number;
}

export interface SelectionToolTrace {
  kind?: "tool_call" | "tool_result";
  name: string;
  arguments: Record<string, unknown>;
  result: string;
  success: boolean;
  sources: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
}

export interface SelectionTraceData {
  thinking: string;
  toolTraces: SelectionToolTrace[];
  response: string;
}

export interface StreamTraceEvent {
  type: string;
  stage?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface StreamEditResult {
  edited_text?: string;
}

/* ── Persistence + tuning constants ─────────────────────── */

export const SPLIT_RATIO_KEY = "deeptutor.co_writer.split_ratio";
export const SYNC_SCROLL_KEY = "deeptutor.co_writer.sync_scroll";
export const LOCAL_DRAFT_PREFIX = "deeptutor.co_writer.draft.";
export const AUTOSAVE_DEBOUNCE_MS = 1500;
export const MIN_PANEL_RATIO = 0.18;
export const MAX_PANEL_RATIO = 0.82;

/* ── Option lists ───────────────────────────────────────── */

export const ACTION_LABELS: Record<EditAction, string> = {
  rewrite: "Rewrite",
  shorten: "Shorten",
  expand: "Expand",
};

export const TOOL_OPTIONS: Array<{ name: ToolName; label: string }> = [
  { name: "brainstorm", label: "Brainstorm" },
  { name: "rag", label: "RAG" },
  { name: "web_search", label: "Web Search" },
  { name: "code_execution", label: "Code" },
  { name: "reason", label: "Reason" },
  { name: "paper_search", label: "Arxiv Search" },
];

export const MODE_OPTIONS: Array<{ value: SelectionMode; label: string }> = [
  { value: "none", label: "None" },
  { value: "shorten", label: "Shorten" },
  { value: "expand", label: "Expand" },
  { value: "rewrite", label: "Rewrite" },
];
