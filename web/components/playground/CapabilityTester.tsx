"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { useTranslation } from "react-i18next";

import { apiUrl } from "@/lib/api";
import type { StreamEvent } from "@/lib/unified-ws";
import {
  getCapabilityLabel,
  type CapabilityInfo,
  type TesterMessage,
} from "@/lib/playground-helpers";
import AssistantResponse from "@/components/common/AssistantResponse";
import ProcessLogs from "@/components/common/ProcessLogs";
import { TracePanel } from "@/components/playground/TracePanel";
import { CapabilityResultPanel } from "@/components/playground/CapabilityResultPanel";

interface CapabilityTesterProps {
  capability: CapabilityInfo;
  enabledTools: string[];
  knowledgeBase: string;
}

/**
 * Generic single-turn capability tester (chat / deep_solve etc.). Streams
 * SSE events from `/api/v1/plugins/capabilities/{name}/execute-stream`
 * and renders trace + process logs + assistant response + result panel.
 */
export function CapabilityTester({
  capability,
  enabledTools,
  knowledgeBase,
}: CapabilityTesterProps) {
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
