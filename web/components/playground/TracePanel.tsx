"use client";

import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { StreamEvent } from "@/lib/unified-ws";
import { titleCase } from "@/lib/playground-helpers";

interface TracePanelProps {
  events: StreamEvent[];
}

/**
 * Stage-grouped event trace for the playground capability testers.
 *
 * Renders thinking / progress / tool_call / tool_result / error events
 * grouped by stage in collapsible details panels.
 */
export function TracePanel({ events }: TracePanelProps) {
  const { t } = useTranslation();
  if (!events.length) return null;

  const grouped = new Map<string, StreamEvent[]>();
  for (const ev of events) {
    const key = ev.stage || "session";
    const list = grouped.get(key) ?? [];
    list.push(ev);
    grouped.set(key, list);
  }

  return (
    <div className="space-y-2">
      {Array.from(grouped.entries()).map(([stage, stageEvents]) => {
        const renderable = stageEvents.filter((e) =>
          [
            "thinking",
            "progress",
            "tool_call",
            "tool_result",
            "error",
          ].includes(e.type),
        );
        if (!renderable.length) return null;
        return (
          <details
            key={stage}
            className="group overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]/50">
              <span>
                {stage === "session" ? t("Details") : titleCase(stage)}
              </span>
              <ChevronDown
                size={13}
                className="text-[var(--muted-foreground)] transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="border-t border-[var(--border)] px-3 py-2.5 space-y-1.5">
              {renderable.map((ev, i) => {
                if (ev.type === "thinking")
                  return (
                    <p
                      key={`${stage}-t-${i}`}
                      className="text-[12px] italic leading-relaxed text-[var(--muted-foreground)]"
                    >
                      {ev.content}
                    </p>
                  );
                if (ev.type === "progress") {
                  const cur = Number(ev.metadata?.current ?? 0),
                    tot = Number(ev.metadata?.total ?? 0);
                  return (
                    <div
                      key={`${stage}-p-${i}`}
                      className="rounded-md bg-[var(--muted)] px-2.5 py-1.5 text-[12px] text-[var(--muted-foreground)]"
                    >
                      <div>{ev.content}</div>
                      {tot > 0 && (
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--border)]">
                          <div
                            className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                            style={{
                              width: `${Math.min(100, (cur / tot) * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                }
                if (ev.type === "tool_call" || ev.type === "tool_result")
                  return (
                    <div
                      key={`${stage}-tc-${i}`}
                      className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                        {ev.type === "tool_call"
                          ? t("Tool call")
                          : t("Tool result")}
                      </div>
                      <div className="mt-0.5 text-[12px] text-[var(--foreground)]">
                        {ev.content || String(ev.metadata?.tool ?? "")}
                      </div>
                    </div>
                  );
                if (ev.type === "error")
                  return (
                    <div
                      key={`${stage}-e-${i}`}
                      className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                    >
                      {ev.content}
                    </div>
                  );
                return null;
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
