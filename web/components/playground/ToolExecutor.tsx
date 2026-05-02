"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Play, Terminal, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { apiUrl } from "@/lib/api";
import MarkdownRenderer from "@/components/common/MarkdownRenderer";
import ProcessLogs from "@/components/common/ProcessLogs";
import {
  QUERY_PARAM_NAMES,
  type ExecResult,
  type KnowledgeBase,
  type ToolInfo,
  type ToolParam,
} from "@/lib/playground-helpers";

interface ToolExecutorProps {
  tool: ToolInfo;
  knowledgeBases: KnowledgeBase[];
}

/**
 * Single-tool execution form. Distinguishes the primary "query" param
 * (treated as a hero textarea/input) from secondary config params, then
 * streams the SSE result from `/api/v1/plugins/tools/{name}/execute-stream`.
 */
export function ToolExecutor({ tool, knowledgeBases }: ToolExecutorProps) {
  const { t } = useTranslation();
  const params = tool.parameters ?? [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ExecResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processLogs, setProcessLogs] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setValues({});
    setResult(null);
    setError(null);
    setProcessLogs([]);
  }, [tool.name]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const setParam = (name: string, val: string) =>
    setValues((p) => ({ ...p, [name]: val }));

  const queryParam = params.find((p) => QUERY_PARAM_NAMES.has(p.name));
  const otherParams = params.filter((p) => !QUERY_PARAM_NAMES.has(p.name));

  const execute = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setExecuting(true);
    setResult(null);
    setError(null);
    setProcessLogs([]);
    try {
      const coerced: Record<string, unknown> = {};
      for (const p of params) {
        const raw = values[p.name];
        if (!raw) continue;
        if (p.type === "integer") coerced[p.name] = parseInt(raw, 10);
        else if (p.type === "number") coerced[p.name] = parseFloat(raw);
        else if (p.type === "boolean") coerced[p.name] = raw === "true";
        else coerced[p.name] = raw;
      }

      const res = await fetch(
        apiUrl(`/api/v1/plugins/tools/${tool.name}/execute-stream`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ params: coerced }),
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
            setProcessLogs((prev) => [...prev, line]);
          } else if (eventType === "result") {
            setResult({
              success: payload.success as boolean,
              content: (payload.content as string) ?? "",
              sources: (payload.sources as Array<Record<string, string>>) ?? [],
              metadata: (payload.metadata as Record<string, unknown>) ?? {},
            });
          } else if (eventType === "error") {
            setError((payload.detail as string) ?? "Unknown error");
          }
        }
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!controller.signal.aborted) setExecuting(false);
    }
  };

  const isKbNameParam = (p: ToolParam) => p.name === "kb_name";

  const renderParam = (p: ToolParam) => {
    if (isKbNameParam(p)) {
      return (
        <select
          value={values[p.name] ?? ""}
          onChange={(e) => setParam(p.name, e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]/40"
        >
          <option value="">{t("Select knowledge base...")}</option>
          {knowledgeBases.map((kb) => (
            <option key={kb.name} value={kb.name}>
              {kb.name}
              {kb.is_default ? ` (${t("default")})` : ""}
            </option>
          ))}
        </select>
      );
    }

    if (p.enum) {
      return (
        <select
          value={values[p.name] ?? ""}
          onChange={(e) => setParam(p.name, e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]/40"
        >
          <option value="">{t("Select...")}</option>
          {p.enum.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={p.type === "integer" || p.type === "number" ? "number" : "text"}
        value={values[p.name] ?? ""}
        onChange={(e) => setParam(p.name, e.target.value)}
        placeholder={p.description || p.name}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]/40 placeholder:text-[var(--muted-foreground)]"
      />
    );
  };

  return (
    <div className="space-y-5">
      {/* Config params (non-query) */}
      {otherParams.length > 0 && (
        <div>
          <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            {t("Parameters")}
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {otherParams.map((p) => (
              <div key={`${tool.name}-${p.name}`}>
                <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">
                  {p.name}
                  {p.required !== false && (
                    <span className="ml-0.5 text-[var(--primary)]">*</span>
                  )}
                  <span className="ml-1.5 text-[10px] font-normal uppercase text-[var(--muted-foreground)]">
                    {p.type}
                  </span>
                </label>
                {renderParam(p)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query input — visually distinct */}
      {queryParam && (
        <div className="rounded-xl border-2 border-dashed border-[var(--primary)]/30 bg-[var(--primary)]/[0.03] p-4">
          <label className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--primary)]">
            <Terminal size={13} />
            {queryParam.name === "code" ? t("Code input") : t("Query input")}
          </label>
          {queryParam.name === "code" || queryParam.name === "topic" ? (
            <textarea
              value={values[queryParam.name] ?? ""}
              onChange={(e) => setParam(queryParam.name, e.target.value)}
              placeholder={queryParam.description || t("Enter your input...")}
              rows={queryParam.name === "topic" ? 5 : 4}
              className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 font-mono text-[13px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]/40 placeholder:text-[var(--muted-foreground)]"
            />
          ) : (
            <input
              type="text"
              value={values[queryParam.name] ?? ""}
              onChange={(e) => setParam(queryParam.name, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !executing) execute();
              }}
              placeholder={queryParam.description || t("Enter your query...")}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-[14px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]/40 placeholder:text-[var(--muted-foreground)]"
            />
          )}
        </div>
      )}

      {/* Execute button */}
      <button
        onClick={execute}
        disabled={executing}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity disabled:opacity-50"
      >
        {executing ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Play size={14} />
        )}
        {executing ? t("Running...") : t("Execute")}
      </button>

      {/* Process Logs */}
      <ProcessLogs logs={processLogs} executing={executing} />

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {result.success ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
                <Check size={10} /> {t("Success")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
                <X size={10} /> {t("Failed")}
              </span>
            )}
          </div>

          {result.content && (
            <div className="max-h-[400px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <MarkdownRenderer content={result.content} variant="prose" />
            </div>
          )}

          {result.sources.length > 0 && (
            <details className="group rounded-lg border border-[var(--border)] bg-[var(--card)]">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[13px] font-medium text-[var(--foreground)]">
                {t("Sources")} ({result.sources.length})
                <ChevronDown
                  size={13}
                  className="text-[var(--muted-foreground)] transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="border-t border-[var(--border)] px-3 py-2.5 space-y-1.5">
                {result.sources.map((s, i) => (
                  <div
                    key={`src-${i}`}
                    className="rounded-md bg-[var(--muted)] px-2.5 py-1.5 text-[12px]"
                  >
                    <div className="font-medium text-[var(--foreground)]">
                      {s.title || s.query || s.type || t("Source")}
                    </div>
                    {s.url && (
                      <div className="mt-0.5 break-all text-[11px] text-[var(--muted-foreground)]">
                        {s.url}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
