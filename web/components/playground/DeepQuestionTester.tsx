"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Play, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { apiUrl } from "@/lib/api";
import {
  extractBase64FromDataUrl,
  readFileAsDataUrl,
} from "@/lib/file-attachments";
import type { StreamEvent } from "@/lib/unified-ws";
import type {
  CapabilityInfo,
  DeepQuestionFormConfig,
  TesterMessage,
} from "@/lib/playground-helpers";
import AssistantResponse from "@/components/common/AssistantResponse";
import ProcessLogs from "@/components/common/ProcessLogs";
import { TracePanel } from "@/components/playground/TracePanel";
import { CapabilityResultPanel } from "@/components/playground/CapabilityResultPanel";

interface DeepQuestionTesterProps {
  capability: CapabilityInfo;
  enabledTools: string[];
  knowledgeBase: string;
  config: DeepQuestionFormConfig;
  onConfigChange: (next: DeepQuestionFormConfig) => void;
}

/**
 * Custom-vs-mimic question generation tester. In `custom` mode the user
 * supplies a topic + count + difficulty / type / preference; in `mimic`
 * mode they upload a PDF or point at a pre-parsed paper directory and
 * we return a max_questions count.
 */
export function DeepQuestionTester({
  capability,
  enabledTools,
  knowledgeBase,
  config,
  onConfigChange,
}: DeepQuestionTesterProps) {
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
