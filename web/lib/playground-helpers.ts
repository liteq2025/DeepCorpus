/**
 * Shared types + pure helpers for the /playground route. Extracted from the
 * mega-page split (Phase 2 slice 2.2) — see
 * docs/refactor/phase-2-megapages.md.
 */

import {
  BrainCircuit,
  Code2,
  Database,
  FileSearch,
  Globe,
  Lightbulb,
  MessageSquare,
  Microscope,
  PenLine,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import type { StreamEvent } from "@/lib/unified-ws";
import type { ResearchSource } from "@/lib/research-types";

/* ── Icon maps (consistent with the chat page) ──────────── */

export const TOOL_ICONS: Record<string, LucideIcon> = {
  brainstorm: Lightbulb,
  rag: Database,
  web_search: Globe,
  code_execution: Code2,
  reason: Sparkles,
  paper_search: FileSearch,
};

export const TOOL_LABELS: Record<string, string> = {
  brainstorm: "Brainstorm",
  rag: "RAG",
  web_search: "Web Search",
  code_execution: "Code Execution",
  reason: "Reason",
  paper_search: "Arxiv Search",
};

export const RESEARCH_SOURCE_OPTIONS: Array<{
  name: ResearchSource;
  label: string;
  icon: LucideIcon;
}> = [
  { name: "kb", label: "Knowledge Base", icon: Database },
  { name: "web", label: "Web", icon: Globe },
  { name: "papers", label: "Papers", icon: FileSearch },
];

export const CAPABILITY_ICONS: Record<string, LucideIcon> = {
  chat: MessageSquare,
  deep_solve: BrainCircuit,
  deep_question: PenLine,
  deep_research: Microscope,
};

export const CAPABILITY_LABELS: Record<string, string> = {
  chat: "Chat",
  deep_solve: "Deep Solve",
  deep_question: "Quiz Generation",
  deep_research: "Deep Research",
};

export function titleCase(v: string): string {
  return v.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getToolIcon(name: string): LucideIcon {
  return TOOL_ICONS[name] ?? Terminal;
}

export function getCapIcon(name: string): LucideIcon {
  return CAPABILITY_ICONS[name] ?? Sparkles;
}

export function getToolLabel(name: string): string {
  return TOOL_LABELS[name] ?? titleCase(name);
}

export function getCapabilityLabel(name: string): string {
  return CAPABILITY_LABELS[name] ?? titleCase(name);
}

/* ── Shared types ───────────────────────────────────────── */

export interface ToolParam {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: string[] | null;
}

export interface ToolInfo {
  name: string;
  description: string;
  parameters?: ToolParam[];
}

export interface CapabilityInfo {
  name: string;
  description: string;
  stages?: string[];
  tools_used?: string[];
}

export interface ExecResult {
  success: boolean;
  content: string;
  sources: Array<Record<string, string>>;
  metadata: Record<string, unknown>;
}

export interface CapabilityExecResult {
  success: boolean;
  data: Record<string, unknown>;
  elapsedMs?: number;
}

export interface KnowledgeBase {
  name: string;
  is_default?: boolean;
}

export interface TesterMessage {
  role: "user" | "assistant";
  content: string;
  events?: StreamEvent[];
  processLogs?: string[];
  result?: CapabilityExecResult | null;
  error?: string | null;
}

/* ── Deep Question form config ──────────────────────────── */

export type DeepQuestionMode = "custom" | "mimic";

export interface DeepQuestionFormConfig {
  mode: DeepQuestionMode;
  topic: string;
  num_questions: number;
  difficulty: string;
  question_type: string;
  preference: string;
  paper_path: string;
  max_questions: number;
}

export const DEFAULT_DEEP_QUESTION_CONFIG: DeepQuestionFormConfig = {
  mode: "custom",
  topic: "",
  num_questions: 3,
  difficulty: "auto",
  question_type: "auto",
  preference: "",
  paper_path: "",
  max_questions: 10,
};

export function normalizeDeepQuestionConfig(
  raw: Record<string, unknown> | undefined,
): DeepQuestionFormConfig {
  const mode = raw?.mode === "mimic" ? "mimic" : "custom";
  return {
    mode,
    topic: typeof raw?.topic === "string" ? raw.topic : "",
    num_questions:
      typeof raw?.num_questions === "number" && raw.num_questions > 0
        ? raw.num_questions
        : DEFAULT_DEEP_QUESTION_CONFIG.num_questions,
    difficulty:
      typeof raw?.difficulty === "string" && raw.difficulty
        ? raw.difficulty
        : DEFAULT_DEEP_QUESTION_CONFIG.difficulty,
    question_type:
      typeof raw?.question_type === "string" && raw.question_type
        ? raw.question_type
        : DEFAULT_DEEP_QUESTION_CONFIG.question_type,
    preference: typeof raw?.preference === "string" ? raw.preference : "",
    paper_path: typeof raw?.paper_path === "string" ? raw.paper_path : "",
    max_questions:
      typeof raw?.max_questions === "number" && raw.max_questions > 0
        ? raw.max_questions
        : DEFAULT_DEEP_QUESTION_CONFIG.max_questions,
  };
}

/* ── Misc constants ─────────────────────────────────────── */

/**
 * Param names that the playground heuristically treats as a primary "query"
 * for default UI placement. Other params fall into a generic key/value list.
 */
export const QUERY_PARAM_NAMES = new Set(["query", "intent", "code", "topic"]);
