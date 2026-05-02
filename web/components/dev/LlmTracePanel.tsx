/* eslint-disable i18n/no-literal-ui-text */
"use client";

import { useMemo } from "react";
import { Activity, Trash2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  useLlmTrace,
  type LlmCallRecord,
} from "@/context/LlmTraceContext";

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

interface TurnGroup {
  turnId: string;
  capability: string;
  recordedAt: number;
  records: LlmCallRecord[];
  totalTokens: number;
  totalDurationMs: number;
}

function groupByTurn(records: LlmCallRecord[]): TurnGroup[] {
  const order: string[] = [];
  const map = new Map<string, TurnGroup>();
  // records are newest first. We want the "turn order" preserved
  // (newest turn at the top) but per-turn the calls in chronological
  // order (thinking → acting → observing → responding).
  for (const r of records) {
    const key = r.turnId || `__solo_${r.id}`;
    if (!map.has(key)) {
      order.push(key);
      map.set(key, {
        turnId: r.turnId,
        capability: r.capability,
        recordedAt: r.recordedAt,
        records: [],
        totalTokens: 0,
        totalDurationMs: 0,
      });
    }
    const g = map.get(key)!;
    g.records.push(r);
    g.totalTokens += r.totalTokens;
    g.totalDurationMs += r.durationMs;
    if (r.recordedAt < g.recordedAt) g.recordedAt = r.recordedAt;
  }
  // Reverse each turn's records so the earliest call shows first.
  for (const g of map.values()) {
    g.records.reverse();
  }
  return order.map((k) => map.get(k)!);
}

function StageChip({ stage }: { stage: string }) {
  const tone =
    stage === "thinking"
      ? "bg-sky-500/15 text-sky-700 dark:text-sky-400"
      : stage === "acting"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : stage === "observing"
          ? "bg-violet-500/15 text-violet-700 dark:text-violet-400"
          : stage === "responding"
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : "bg-[var(--muted)] text-[var(--muted-foreground)]";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tone}`}
    >
      {stage || "—"}
    </span>
  );
}

function RecordRow({ record }: { record: LlmCallRecord }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-[12px]">
      <StageChip stage={record.stage} />
      <span
        className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-[var(--foreground)]"
        title={record.model}
      >
        {record.model || "—"}
      </span>
      <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
        <span className="font-mono">{formatTokens(record.promptTokens)}</span>
        <span className="mx-0.5">→</span>
        <span className="font-mono">{formatTokens(record.completionTokens)}</span>
        {record.usageKind === "estimated" && (
          <span
            className="ml-1 text-amber-600 dark:text-amber-400"
            title="char-count estimate (provider didn't return usage)"
          >
            ~
          </span>
        )}
      </span>
      <span className="w-16 shrink-0 text-right font-mono text-[11px] text-[var(--muted-foreground)]/80">
        {formatDuration(record.durationMs)}
      </span>
    </div>
  );
}

function TurnGroupBlock({ group }: { group: TurnGroup }) {
  const date = new Date(group.recordedAt);
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
  return (
    <section className="overflow-hidden rounded-lg border border-[var(--border)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--muted)]/30 px-3 py-2 text-[11px]">
        <span className="rounded-full bg-[var(--card)] px-1.5 py-0.5 font-medium text-[var(--foreground)]">
          {group.capability || "—"}
        </span>
        <span className="font-mono text-[var(--muted-foreground)]">
          turn {group.turnId ? group.turnId.slice(0, 8) : "—"}
        </span>
        <span className="text-[var(--muted-foreground)]">· {time}</span>
        <span className="ml-auto font-mono text-[var(--foreground)]">
          {formatTokens(group.totalTokens)} tok
        </span>
        <span className="text-[var(--muted-foreground)]/70">·</span>
        <span className="font-mono text-[var(--muted-foreground)]/80">
          {formatDuration(group.totalDurationMs)}
        </span>
      </div>
      <div className="divide-y divide-[var(--border)]/60">
        {group.records.map((r) => (
          <RecordRow key={r.id} record={r} />
        ))}
      </div>
    </section>
  );
}

/**
 * Floating "?" launcher + Sheet body for the LLM trace dev panel.
 *
 * Renders nothing when `enabled === false`, so production users don't see
 * it unless they opt in via `localStorage.dc.dev.trace = "true"`. Default
 * ON in dev builds.
 */
export function LlmTracePanel() {
  const { records, enabled, clear } = useLlmTrace();

  const stats = useMemo(() => {
    const totalTokens = records.reduce((s, r) => s + r.totalTokens, 0);
    const totalDuration = records.reduce((s, r) => s + r.durationMs, 0);
    return { totalTokens, totalDuration };
  }, [records]);

  const groups = useMemo(() => groupByTurn(records), [records]);

  if (!enabled) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open LLM trace panel"
          className="fixed bottom-4 right-4 z-toast inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] shadow-lg backdrop-blur transition-colors hover:bg-[var(--muted)]"
        >
          <Activity className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          <span className="font-mono">{records.length}</span>
          <span className="text-[var(--muted-foreground)]">·</span>
          <span className="font-mono text-[var(--muted-foreground)]">
            {formatTokens(stats.totalTokens)}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent side="right" size="xl" className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle>LLM Trace</SheetTitle>
              <SheetDescription>
                Per-call telemetry from agentic capabilities. Shows stage,
                model, tokens (prompt → completion), and duration. <code>~</code> marks
                estimated counts (streaming path without provider usage).
              </SheetDescription>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-[var(--muted)]/40 px-3 py-2 text-[12px]">
            <span className="text-[var(--muted-foreground)]">Calls</span>
            <span className="font-mono font-medium text-[var(--foreground)]">
              {records.length}
            </span>
            <span className="text-[var(--muted-foreground)]">· Tokens</span>
            <span className="font-mono font-medium text-[var(--foreground)]">
              {formatTokens(stats.totalTokens)}
            </span>
            <span className="text-[var(--muted-foreground)]">· Time</span>
            <span className="font-mono font-medium text-[var(--foreground)]">
              {formatDuration(stats.totalDuration)}
            </span>
            <button
              type="button"
              onClick={clear}
              disabled={!records.length}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-[var(--muted-foreground)] transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          </div>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-8 pt-2">
          {groups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] py-12 text-center text-[12.5px] text-[var(--muted-foreground)]">
              No LLM calls captured yet. Send a message in chat or run any
              capability and the calls will appear here.
            </div>
          ) : (
            groups.map((g) => (
              <TurnGroupBlock key={g.turnId || `solo-${g.recordedAt}`} group={g} />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
