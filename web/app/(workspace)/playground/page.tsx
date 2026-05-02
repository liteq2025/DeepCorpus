"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Check,
  FileText,
  Loader2,
  Play,
  Sparkles,
  Terminal,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiUrl } from "@/lib/api";
import AssistantResponse from "@/components/common/AssistantResponse";
import MarkdownRenderer from "@/components/common/MarkdownRenderer";
import ProcessLogs from "@/components/common/ProcessLogs";
import { PageBody, PageHeader } from "@/components/layout";
import ResearchConfigPanel from "@/components/research/ResearchConfigPanel";
import {
  extractBase64FromDataUrl,
  readFileAsDataUrl,
} from "@/lib/file-attachments";
import { listKnowledgeBases } from "@/lib/knowledge-api";
import type { StreamEvent } from "@/lib/unified-ws";
import {
  filterFrontendTools,
  FRONTEND_HIDDEN_TOOLS,
  loadCapabilityPlaygroundConfigs,
  resolveCapabilityPlaygroundConfig,
  saveCapabilityPlaygroundConfig,
  type CapabilityPlaygroundConfig,
  type CapabilityPlaygroundConfigMap,
} from "@/lib/playground-config";
import {
  buildResearchWSConfig,
  createEmptyResearchConfig,
  normalizeResearchConfig,
  validateResearchConfig,
  type DeepResearchFormConfig,
  type ResearchSource,
} from "@/lib/research-types";
import {
  CAPABILITY_LABELS,
  DEFAULT_DEEP_QUESTION_CONFIG,
  QUERY_PARAM_NAMES,
  RESEARCH_SOURCE_OPTIONS,
  getCapIcon,
  getCapabilityLabel,
  getToolIcon,
  getToolLabel,
  normalizeDeepQuestionConfig,
  titleCase,
  type CapabilityExecResult,
  type CapabilityInfo,
  type DeepQuestionFormConfig,
  type ExecResult,
  type KnowledgeBase,
  type TesterMessage,
  type ToolInfo,
  type ToolParam,
} from "@/lib/playground-helpers";
import { TracePanel } from "@/components/playground/TracePanel";
import { CapabilityResultPanel } from "@/components/playground/CapabilityResultPanel";
import { ToolExecutor } from "@/components/playground/ToolExecutor";

/* ------------------------------------------------------------------ */
/*  DeepQuestionTester                                                 */
/* ------------------------------------------------------------------ */

function DeepQuestionTester({
  capability,
  enabledTools,
  knowledgeBase,
  config,
  onConfigChange,
}: {
  capability: CapabilityInfo;
  enabledTools: string[];
  knowledgeBase: string;
  config: DeepQuestionFormConfig;
  onConfigChange: (next: DeepQuestionFormConfig) => void;
}) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<TesterMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const updateLastAssistant = (
    updater: (msg: TesterMessage) => TesterMessage,
  ) => {
    setMessages((prev) => {
      const msgs = [...prev];
      const last = msgs[msgs.length - 1];
      if (last?.role !== "assistant") return prev;
      msgs[msgs.length - 1] = updater(last);
      return msgs;
    });
  };

  const updateConfig = <K extends keyof DeepQuestionFormConfig>(
    key: K,
    value: DeepQuestionFormConfig[K],
  ) => {
    onConfigChange({ ...config, [key]: value });
  };

  const fileToAttachment = async (file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      type: "pdf",
      filename: file.name,
      mime_type: file.type || "application/pdf",
      base64: extractBase64FromDataUrl(dataUrl),
    };
  };

  const canRun =
    config.mode === "custom"
      ? config.topic.trim().length > 0
      : Boolean(uploadedPdf) || config.paper_path.trim().length > 0;

  const run = async () => {
    if (!canRun || streaming) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userContent =
      config.mode === "custom"
        ? config.topic.trim()
        : uploadedPdf
          ? `Mimic questions from uploaded paper: ${uploadedPdf.name}`
          : `Mimic questions from parsed paper: ${config.paper_path.trim()}`;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userContent },
      {
        role: "assistant",
        content: "",
        events: [],
        processLogs: [],
        result: null,
        error: null,
      },
    ]);
    setStreaming(true);

    try {
      const attachments =
        config.mode === "mimic" && uploadedPdf
          ? [await fileToAttachment(uploadedPdf)]
          : [];

      const requestConfig =
        config.mode === "custom"
          ? {
              mode: "custom",
              topic: config.topic.trim(),
              num_questions: config.num_questions,
              difficulty: config.difficulty === "auto" ? "" : config.difficulty,
              question_type:
                config.question_type === "auto" ? "" : config.question_type,
              preference: config.preference.trim(),
            }
          : {
              mode: "mimic",
              paper_path: uploadedPdf ? "" : config.paper_path.trim(),
              max_questions: config.max_questions,
            };

      const res = await fetch(
        apiUrl(
          `/api/v1/plugins/capabilities/${capability.name}/execute-stream`,
        ),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: userContent,
            tools: enabledTools,
            knowledge_bases:
              enabledTools.includes("rag") && knowledgeBase
                ? [knowledgeBase]
                : [],
            language: i18n.language,
            config: requestConfig,
            attachments,
          }),
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;
          const eventMatch = part.match(/^event:\s*(.+)$/m);
          const dataMatch = part.match(/^data:\s*(.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1].trim();
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(dataMatch[1]);
          } catch {
            continue;
          }

          if (eventType === "log") {
            const line = (payload.line as string) ?? "";
            updateLastAssistant((last) => ({
              ...last,
              processLogs: [...(last.processLogs || []), line],
            }));
            continue;
          }

          if (eventType === "stream") {
            const event = payload as unknown as StreamEvent;
            if (event.type === "session" || event.type === "done") continue;
            updateLastAssistant((last) => ({
              ...last,
              content:
                event.type === "content"
                  ? `${last.content}${event.content}`
                  : last.content,
              events: [...(last.events || []), event],
            }));
            continue;
          }

          if (eventType === "result") {
            updateLastAssistant((last) => ({
              ...last,
              result: {
                success: Boolean(payload.success),
                data: (payload.data as Record<string, unknown>) ?? {},
                elapsedMs:
                  typeof payload.elapsed_ms === "number"
                    ? payload.elapsed_ms
                    : undefined,
              },
            }));
            continue;
          }

          if (eventType === "error") {
            updateLastAssistant((last) => ({
              ...last,
              error: (payload.detail as string) ?? "Unknown error",
            }));
          }
        }
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      updateLastAssistant((last) => ({
        ...last,
        error: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      if (!controller.signal.aborted) setStreaming(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => updateConfig("mode", "custom")}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
              config.mode === "custom"
                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {t("Custom")}
          </button>
          <button
            onClick={() => updateConfig("mode", "mimic")}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
              config.mode === "mimic"
                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {t("Mimic Exam")}
          </button>
        </div>

        {config.mode === "custom" ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">
                {t("Topic")}
              </label>
              <textarea
                value={config.topic}
                onChange={(e) => updateConfig("topic", e.target.value)}
                rows={3}
                placeholder={t("e.g. Gradient Descent Optimization")}
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-[13px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]/40 placeholder:text-[var(--muted-foreground)]"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">
                  {t("Count")}
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={config.num_questions}
                  onChange={(e) =>
                    updateConfig(
                      "num_questions",
                      Math.max(1, Number(e.target.value) || 1),
                    )
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">
                  {t("Difficulty")}
                </label>
                <select
                  value={config.difficulty}
                  onChange={(e) => updateConfig("difficulty", e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]/40"
                >
                  <option value="auto">{t("Auto")}</option>
                  <option value="easy">{t("Easy")}</option>
                  <option value="medium">{t("Medium")}</option>
                  <option value="hard">{t("Hard")}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">
                  {t("Type")}
                </label>
                <select
                  value={config.question_type}
                  onChange={(e) =>
                    updateConfig("question_type", e.target.value)
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]/40"
                >
                  <option value="auto">{t("Auto")}</option>
                  <option value="choice">{t("Multiple Choice")}</option>
                  <option value="written">{t("Written")}</option>
                  <option value="coding">{t("Coding")}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">
                {t("Preference")}
              </label>
              <textarea
                value={config.preference}
                onChange={(e) => updateConfig("preference", e.target.value)}
                rows={3}
                placeholder={t("Extra constraints, style, focus areas...")}
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-[13px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]/40 placeholder:text-[var(--muted-foreground)]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">
                {t("Upload Exam Paper (PDF)")}
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-6 text-[13px] text-[var(--muted-foreground)] transition-colors hover:border-[var(--primary)]/40 hover:text-[var(--foreground)]">
                <Upload size={16} />
                <span>
                  {uploadedPdf ? uploadedPdf.name : t("Click to upload PDF")}
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setUploadedPdf(file);
                    if (file) updateConfig("paper_path", "");
                  }}
                />
              </label>
            </div>
            <div className="text-center text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              {t("Or")}
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">
                {t("Pre-parsed Directory")}
              </label>
              <div className="relative">
                <FileText
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                />
                <input
                  type="text"
                  value={config.paper_path}
                  onChange={(e) => {
                    setUploadedPdf(null);
                    updateConfig("paper_path", e.target.value);
                  }}
                  placeholder={t("e.g. 2211asm1")}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 pl-9 pr-3 text-[13px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]/40 placeholder:text-[var(--muted-foreground)]"
                />
              </div>
            </div>
            <div className="max-w-xs">
              <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">
                {t("Max Questions")}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={config.max_questions}
                onChange={(e) =>
                  updateConfig(
                    "max_questions",
                    Math.max(1, Number(e.target.value) || 1),
                  )
                }
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]/40"
              />
            </div>
          </div>
        )}
      </div>

      {messages.map((msg, i) => (
        <div key={`${msg.role}-${i}`}>
          <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            {msg.role === "user" ? t("You") : t("Assistant")}
          </div>
          {msg.role === "user" ? (
            <div className="rounded-lg bg-[var(--muted)] px-3 py-2 text-[13px] text-[var(--foreground)]">
              {msg.content}
            </div>
          ) : (
            <div className="space-y-2">
              <TracePanel events={msg.events || []} />
              <ProcessLogs
                logs={msg.processLogs || []}
                executing={streaming && i === messages.length - 1}
                title={t("Process")}
              />
              {msg.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  {msg.error}
                </div>
              )}
              <AssistantResponse
                content={msg.content}
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
              />
              <CapabilityResultPanel result={msg.result} />
            </div>
          )}
        </div>
      ))}

      <div className="flex justify-end">
        <button
          onClick={run}
          disabled={!canRun || streaming}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {streaming ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Play size={13} />
          )}
          {streaming ? t("Running...") : t("Generate")}
        </button>
      </div>
    </div>
  );
}

function DeepResearchTester({
  capability,
  enabledTools,
  knowledgeBase,
  config,
  onConfigChange,
}: {
  capability: CapabilityInfo;
  enabledTools: string[];
  knowledgeBase: string;
  config: DeepResearchFormConfig;
  onConfigChange: (next: DeepResearchFormConfig) => void;
}) {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<TesterMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const validation = useMemo(() => validateResearchConfig(config), [config]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const updateLastAssistant = (
    updater: (msg: TesterMessage) => TesterMessage,
  ) => {
    setMessages((prev) => {
      const msgs = [...prev];
      const last = msgs[msgs.length - 1];
      if (last?.role !== "assistant") return prev;
      msgs[msgs.length - 1] = updater(last);
      return msgs;
    });
  };

  const run = async () => {
    const content = input.trim();
    if (!content || streaming || !validation.valid) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setMessages((prev) => [
      ...prev,
      { role: "user", content },
      {
        role: "assistant",
        content: "",
        events: [],
        processLogs: [],
        result: null,
        error: null,
      },
    ]);
    setStreaming(true);

    try {
      const res = await fetch(
        apiUrl(
          `/api/v1/plugins/capabilities/${capability.name}/execute-stream`,
        ),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            tools: enabledTools,
            knowledge_bases:
              config.sources.includes("kb") && knowledgeBase
                ? [knowledgeBase]
                : [],
            language: i18n.language,
            config: buildResearchWSConfig(config),
          }),
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;
          const eventMatch = part.match(/^event:\s*(.+)$/m);
          const dataMatch = part.match(/^data:\s*(.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1].trim();
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(dataMatch[1]);
          } catch {
            continue;
          }

          if (eventType === "log") {
            const line = (payload.line as string) ?? "";
            updateLastAssistant((last) => ({
              ...last,
              processLogs: [...(last.processLogs || []), line],
            }));
            continue;
          }

          if (eventType === "stream") {
            const event = payload as unknown as StreamEvent;
            if (event.type === "session" || event.type === "done") continue;
            updateLastAssistant((last) => ({
              ...last,
              content:
                event.type === "content"
                  ? `${last.content}${event.content}`
                  : last.content,
              events: [...(last.events || []), event],
            }));
            continue;
          }

          if (eventType === "result") {
            updateLastAssistant((last) => ({
              ...last,
              result: {
                success: Boolean(payload.success),
                data: (payload.data as Record<string, unknown>) ?? {},
                elapsedMs:
                  typeof payload.elapsed_ms === "number"
                    ? payload.elapsed_ms
                    : undefined,
              },
            }));
            continue;
          }

          if (eventType === "error") {
            updateLastAssistant((last) => ({
              ...last,
              error: (payload.detail as string) ?? "Unknown error",
            }));
          }
        }
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      updateLastAssistant((last) => ({
        ...last,
        error: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      if (!controller.signal.aborted) setStreaming(false);
    }
  };

  const toggleSource = (source: ResearchSource) => {
    onConfigChange({
      ...config,
      sources: config.sources.includes(source)
        ? config.sources.filter((item) => item !== source)
        : [...config.sources, source],
    });
  };

  return (
    <div className="space-y-4">
      <ResearchConfigPanel
        value={config}
        errors={validation.errors}
        collapsed={false}
        onChange={onConfigChange}
        onToggleCollapsed={() => {}}
      />
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
        <div className="mb-2 text-[12px] font-medium text-[var(--foreground)]">
          {t("Sources")}
        </div>
        <div className="flex flex-wrap gap-2">
          {RESEARCH_SOURCE_OPTIONS.map((source) => {
            const active = config.sources.includes(source.name);
            const Icon = source.icon;
            return (
              <button
                key={source.name}
                type="button"
                onClick={() => toggleSource(source.name)}
                className={`inline-flex h-[32px] items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-[background-color,color,box-shadow] ${
                  active
                    ? "bg-[var(--muted)] text-[var(--foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-[var(--border)]/55"
                    : "text-[var(--muted-foreground)]/75 hover:bg-[var(--muted)]/55 hover:text-[var(--foreground)]"
                }`}
              >
                <Icon size={13} strokeWidth={1.7} />
                {t(source.label)}
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-[11px] text-[var(--muted-foreground)]">
          {config.sources.length
            ? t("Selected sources will be queried during research.")
            : t("No source selected: the run will use llm-only research.")}
        </div>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              run();
            }
          }}
          rows={3}
          placeholder={t("Describe the research topic...")}
          className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={run}
            disabled={!input.trim() || streaming || !validation.valid}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {streaming ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Play size={13} />
            )}
            {streaming ? t("Running...") : t("Run Research")}
          </button>
        </div>
      </div>

      {messages.map((msg, i) => (
        <div key={`${msg.role}-${i}`}>
          <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            {msg.role === "user" ? t("You") : t("Assistant")}
          </div>
          {msg.role === "user" ? (
            <div className="rounded-lg bg-[var(--muted)] px-3 py-2 text-[13px] text-[var(--foreground)]">
              {msg.content}
            </div>
          ) : (
            <div className="space-y-2">
              <TracePanel events={msg.events || []} />
              <ProcessLogs
                logs={msg.processLogs || []}
                executing={streaming && i === messages.length - 1}
                title={t("Process")}
              />
              {msg.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  {msg.error}
                </div>
              )}
              <AssistantResponse
                content={msg.content}
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
              />
              <CapabilityResultPanel result={msg.result} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CapabilityTester                                                   */
/* ------------------------------------------------------------------ */

function CapabilityTester({
  capability,
  enabledTools,
  knowledgeBase,
}: {
  capability: CapabilityInfo;
  enabledTools: string[];
  knowledgeBase: string;
}) {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<TesterMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const updateLastAssistant = (
    updater: (msg: TesterMessage) => TesterMessage,
  ) => {
    setMessages((prev) => {
      const msgs = [...prev];
      const last = msgs[msgs.length - 1];
      if (last?.role !== "assistant") return prev;
      msgs[msgs.length - 1] = updater(last);
      return msgs;
    });
  };

  const send = async () => {
    const content = input.trim();
    if (!content || streaming) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setMessages((prev) => [
      ...prev,
      { role: "user", content },
      {
        role: "assistant",
        content: "",
        events: [],
        processLogs: [],
        result: null,
        error: null,
      },
    ]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch(
        apiUrl(
          `/api/v1/plugins/capabilities/${capability.name}/execute-stream`,
        ),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            tools: enabledTools,
            knowledge_bases:
              enabledTools.includes("rag") && knowledgeBase
                ? [knowledgeBase]
                : [],
            language: i18n.language,
          }),
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;
          const eventMatch = part.match(/^event:\s*(.+)$/m);
          const dataMatch = part.match(/^data:\s*(.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1].trim();
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(dataMatch[1]);
          } catch {
            continue;
          }

          if (eventType === "log") {
            const line = (payload.line as string) ?? "";
            updateLastAssistant((last) => ({
              ...last,
              processLogs: [...(last.processLogs || []), line],
            }));
            continue;
          }

          if (eventType === "stream") {
            const event = payload as unknown as StreamEvent;
            if (event.type === "session" || event.type === "done") continue;
            updateLastAssistant((last) => ({
              ...last,
              content:
                event.type === "content"
                  ? `${last.content}${event.content}`
                  : last.content,
              events: [...(last.events || []), event],
            }));
            continue;
          }

          if (eventType === "result") {
            updateLastAssistant((last) => ({
              ...last,
              result: {
                success: Boolean(payload.success),
                data: (payload.data as Record<string, unknown>) ?? {},
                elapsedMs:
                  typeof payload.elapsed_ms === "number"
                    ? payload.elapsed_ms
                    : undefined,
              },
            }));
            continue;
          }

          if (eventType === "error") {
            updateLastAssistant((last) => ({
              ...last,
              error: (payload.detail as string) ?? "Unknown error",
            }));
          }
        }
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      updateLastAssistant((last) => ({
        ...last,
        error: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      if (!controller.signal.aborted) setStreaming(false);
    }
  };

  return (
    <div className="space-y-3">
      {messages.map((msg, i) => (
        <div key={`${msg.role}-${i}`}>
          <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            {msg.role === "user" ? t("You") : t("Assistant")}
          </div>
          {msg.role === "user" ? (
            <div className="rounded-lg bg-[var(--muted)] px-3 py-2 text-[13px] text-[var(--foreground)]">
              {msg.content}
            </div>
          ) : (
            <div className="space-y-2">
              <TracePanel events={msg.events || []} />
              <ProcessLogs
                logs={msg.processLogs || []}
                executing={streaming && i === messages.length - 1}
                title={t("Process")}
              />
              {msg.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  {msg.error}
                </div>
              )}
              <AssistantResponse
                content={msg.content}
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
              />
              <CapabilityResultPanel result={msg.result} />
            </div>
          )}
        </div>
      ))}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder={`${t("Try")} ${t(getCapabilityLabel(capability.name))}...`}
          className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {streaming ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Play size={13} />
            )}
            {streaming ? t("Running...") : t("Send")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function PlaygroundPage() {
  const { t } = useTranslation();
  const [tools, setToolsList] = useState<ToolInfo[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilityInfo[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [capabilityConfigs, setCapabilityConfigs] =
    useState<CapabilityPlaygroundConfigMap>({});
  const [activeKind, setActiveKind] = useState<"tool" | "capability">("tool");
  const [activeName, setActiveName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pluginRes, knowledgeBaseList] = await Promise.all([
          fetch(apiUrl("/api/v1/plugins/list")),
          listKnowledgeBases(),
        ]);
        const data = await pluginRes.json();
        const visibleTools = (data.tools || []).filter(
          (tool: ToolInfo) => !FRONTEND_HIDDEN_TOOLS.has(tool.name),
        );
        const visibleCapabilities = (data.capabilities || []).map(
          (cap: CapabilityInfo) => ({
            ...cap,
            tools_used: filterFrontendTools(cap.tools_used ?? []),
          }),
        );

        setToolsList(visibleTools);
        setCapabilities(visibleCapabilities);
        setCapabilityConfigs(loadCapabilityPlaygroundConfigs());
        setKnowledgeBases(knowledgeBaseList);

        if (visibleTools.length) {
          setActiveKind("tool");
          setActiveName(visibleTools[0].name);
        } else if (visibleCapabilities.length) {
          setActiveKind("capability");
          setActiveName(visibleCapabilities[0].name);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const capabilityCatalog = capabilities;

  const activeTool = tools.find((t) => t.name === activeName);
  const activeCapability = capabilityCatalog.find((c) => c.name === activeName);
  const activeCapabilityConfig = useMemo(
    () =>
      activeCapability
        ? resolveCapabilityPlaygroundConfig(
            capabilityConfigs,
            activeCapability.name,
            activeCapability.tools_used ?? [],
          )
        : null,
    [activeCapability, capabilityConfigs],
  );
  const activeDeepQuestionConfig = useMemo(
    () =>
      normalizeDeepQuestionConfig(
        activeCapabilityConfig?.config as Record<string, unknown> | undefined,
      ),
    [activeCapabilityConfig?.config],
  );
  const activeDeepResearchConfig = useMemo(
    () =>
      normalizeResearchConfig(
        activeCapabilityConfig?.config as Record<string, unknown> | undefined,
      ),
    [activeCapabilityConfig?.config],
  );
  const listItems = useMemo(
    () =>
      activeKind === "tool"
        ? tools.map((t) => ({ name: t.name, description: t.description }))
        : capabilityCatalog.map((c) => ({
            name: c.name,
            description: c.description,
          })),
    [activeKind, capabilityCatalog, tools],
  );

  const persistCapabilityConfig = (
    capabilityName: string,
    next: CapabilityPlaygroundConfig,
  ) => {
    setCapabilityConfigs((prev) =>
      saveCapabilityPlaygroundConfig(prev, capabilityName, next),
    );
  };

  const toggleCapabilityTool = (toolName: string) => {
    if (!activeCapability || !activeCapabilityConfig) return;
    const allowedTools = filterFrontendTools(activeCapability.tools_used ?? []);
    if (!allowedTools.includes(toolName)) return;

    const enabledSet = new Set(activeCapabilityConfig.enabledTools);
    if (enabledSet.has(toolName)) enabledSet.delete(toolName);
    else enabledSet.add(toolName);

    const defaultKb =
      knowledgeBases.find((kb) => kb.is_default)?.name ??
      knowledgeBases[0]?.name ??
      "";

    persistCapabilityConfig(activeCapability.name, {
      enabledTools: allowedTools.filter((name) => enabledSet.has(name)),
      knowledgeBase:
        activeCapabilityConfig.knowledgeBase ||
        (enabledSet.has("rag") ? defaultKb : ""),
      config: activeCapabilityConfig.config,
    });
  };

  const setCapabilityKnowledgeBase = (knowledgeBase: string) => {
    if (!activeCapability || !activeCapabilityConfig) return;
    persistCapabilityConfig(activeCapability.name, {
      enabledTools: activeCapabilityConfig.enabledTools,
      knowledgeBase,
      config: activeCapabilityConfig.config,
    });
  };

  const setDeepQuestionConfig = (next: DeepQuestionFormConfig) => {
    if (!activeCapability || !activeCapabilityConfig) return;
    persistCapabilityConfig(activeCapability.name, {
      enabledTools: activeCapabilityConfig.enabledTools,
      knowledgeBase: activeCapabilityConfig.knowledgeBase,
      config: next as unknown as Record<string, unknown>,
    });
  };

  const setDeepResearchConfig = (next: DeepResearchFormConfig) => {
    if (!activeCapability || !activeCapabilityConfig) return;
    persistCapabilityConfig(activeCapability.name, {
      enabledTools: activeCapabilityConfig.enabledTools,
      knowledgeBase: activeCapabilityConfig.knowledgeBase,
      config: next as unknown as Record<string, unknown>,
    });
  };

  return (
    <section
      aria-label={t("Playground content")}
      className="h-full overflow-y-auto [scrollbar-gutter:stable]"
    >
      <PageBody size="default">
        <PageHeader
          title={t("Playground")}
          description={t(
            "Explore the building blocks of DeepTutor: reusable tools and higher-level capabilities.",
          )}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Tab bar */}
            <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--muted)] p-0.5">
              <button
                onClick={() => {
                  setActiveKind("tool");
                  if (tools.length) setActiveName(tools[0].name);
                }}
                className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-all ${activeKind === "tool" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              >
                {t("Tools")}
              </button>
              <button
                onClick={() => {
                  setActiveKind("capability");
                  if (capabilityCatalog.length)
                    setActiveName(capabilityCatalog[0].name);
                }}
                className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-all ${activeKind === "capability" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              >
                {t("Capabilities")}
              </button>
            </div>

            {/* Two-column layout */}
            <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
              {/* Left: Item list */}
              <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-1.5">
                  {activeKind === "tool" ? (
                    <Terminal className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                  )}
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                    {activeKind === "tool" ? t("Tools") : t("Capabilities")}
                  </h2>
                </div>
                <div className="space-y-1">
                  {listItems.map((item) => {
                    const Icon =
                      activeKind === "tool"
                        ? getToolIcon(item.name)
                        : getCapIcon(item.name);
                    return (
                      <button
                        key={item.name}
                        onClick={() => setActiveName(item.name)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                          activeName === item.name
                            ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                            : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--foreground)]/10 hover:bg-[var(--muted)]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon size={13} strokeWidth={1.7} />
                          <span className="text-[13px] font-medium">
                            {activeKind === "tool"
                              ? t(getToolLabel(item.name))
                              : t(getCapabilityLabel(item.name))}
                          </span>
                        </div>
                        <div
                          className={`mt-0.5 line-clamp-2 text-[11px] leading-relaxed ${activeName === item.name ? "text-[var(--primary-foreground)]/70" : "text-[var(--muted-foreground)]"}`}
                        >
                          {item.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Right: Detail panel */}
              <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                {activeKind === "tool" && activeTool
                  ? (() => {
                      const ToolIcon = getToolIcon(activeTool.name);
                      return (
                        <div className="space-y-6">
                          <div>
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                              <ToolIcon size={13} strokeWidth={1.7} />
                              {t("Tool")}
                            </div>
                            <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--foreground)]">
                              {t(getToolLabel(activeTool.name))}
                            </h2>
                            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                              {activeTool.description}
                            </p>
                          </div>

                          <div className="border-t border-[var(--border)] pt-6">
                            <ToolExecutor
                              tool={activeTool}
                              knowledgeBases={knowledgeBases}
                            />
                          </div>
                        </div>
                      );
                    })()
                  : activeCapability
                    ? (() => {
                        const CapIcon = getCapIcon(activeCapability.name);
                        return (
                          <div className="space-y-6">
                            <div>
                              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                                <CapIcon size={13} strokeWidth={1.7} />
                                {t("Capability")}
                              </div>
                              <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--foreground)]">
                                {t(getCapabilityLabel(activeCapability.name))}
                              </h2>
                              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                                {activeCapability.description}
                              </p>
                            </div>

                            <div>
                              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                                {t("Enable Tools")}
                              </h3>
                              {!!activeCapability.tools_used?.length ? (
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                  {activeCapability.tools_used.map((tool) => {
                                    const TIcon = getToolIcon(tool);
                                    const enabled =
                                      activeCapabilityConfig?.enabledTools.includes(
                                        tool,
                                      ) ?? true;
                                    return (
                                      <button
                                        key={`${activeCapability.name}-${tool}`}
                                        onClick={() =>
                                          toggleCapabilityTool(tool)
                                        }
                                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                          enabled
                                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                                            : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                        }`}
                                      >
                                        <TIcon size={11} strokeWidth={1.7} />
                                        {t(getToolLabel(tool))}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="mt-2 text-[12px] text-[var(--muted-foreground)]">
                                  {t(
                                    "This capability runs without optional tools.",
                                  )}
                                </p>
                              )}
                            </div>

                            {activeCapabilityConfig?.enabledTools.includes(
                              "rag",
                            ) && (
                              <div>
                                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                                  {t("Knowledge Base")}
                                </h3>
                                <div className="mt-2.5 max-w-sm">
                                  <select
                                    value={activeCapabilityConfig.knowledgeBase}
                                    onChange={(e) =>
                                      setCapabilityKnowledgeBase(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]/40"
                                  >
                                    <option value="">
                                      {t("Select knowledge base...")}
                                    </option>
                                    {knowledgeBases.map((kb) => (
                                      <option key={kb.name} value={kb.name}>
                                        {kb.name}
                                        {kb.is_default
                                          ? ` (${t("default")})`
                                          : ""}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}

                            <div className="border-t border-[var(--border)] pt-6">
                              <div className="mb-3">
                                <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
                                  {t("Try this capability")}
                                </h3>
                                <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
                                  {t(
                                    "Run a focused conversation here without leaving the playground.",
                                  )}
                                </p>
                              </div>
                              {activeCapability.name === "deep_question" ? (
                                <DeepQuestionTester
                                  key={activeCapability.name}
                                  capability={activeCapability}
                                  enabledTools={
                                    activeCapabilityConfig?.enabledTools ??
                                    activeCapability.tools_used ??
                                    []
                                  }
                                  knowledgeBase={
                                    activeCapabilityConfig?.knowledgeBase ?? ""
                                  }
                                  config={activeDeepQuestionConfig}
                                  onConfigChange={setDeepQuestionConfig}
                                />
                              ) : activeCapability.name === "deep_research" ? (
                                <DeepResearchTester
                                  key={activeCapability.name}
                                  capability={activeCapability}
                                  enabledTools={
                                    activeCapabilityConfig?.enabledTools ??
                                    activeCapability.tools_used ??
                                    []
                                  }
                                  knowledgeBase={
                                    activeCapabilityConfig?.knowledgeBase ?? ""
                                  }
                                  config={activeDeepResearchConfig}
                                  onConfigChange={setDeepResearchConfig}
                                />
                              ) : (
                                <CapabilityTester
                                  key={activeCapability.name}
                                  capability={activeCapability}
                                  enabledTools={
                                    activeCapabilityConfig?.enabledTools ??
                                    activeCapability.tools_used ??
                                    []
                                  }
                                  knowledgeBase={
                                    activeCapabilityConfig?.knowledgeBase ?? ""
                                  }
                                />
                              )}
                            </div>
                          </div>
                        );
                      })()
                    : null}
              </section>
            </div>
          </div>
        )}
      </PageBody>
    </section>
  );
}
