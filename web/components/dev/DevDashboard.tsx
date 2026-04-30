"use client";

import { useState } from "react";
import {
  DEV_REGISTRY,
  type RegistryGroup,
  type ModuleStatus,
  type TagEntry,
} from "@/lib/dev-registry";

const STATUS_STYLES: Record<ModuleStatus, string> = {
  shipped: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  wip: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  planned: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
};

function StatusPill({ status }: { status?: ModuleStatus }) {
  if (!status) return null;
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function TagChips({ tags }: { tags: TagEntry[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t, i) => {
        const label = typeof t === "string" ? t : t.label;
        const hint = typeof t === "string" ? undefined : t.hint;
        const key = typeof t === "string" ? t : `${t.label}:${t.hint}`;
        return (
          <span
            key={`${key}-${i}`}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[11px]"
          >
            <span className="text-[var(--foreground)]">{label}</span>
            {hint && (
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {`{${hint}}`}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function GroupTable({ group }: { group: RegistryGroup }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <table className="w-full text-[13px]">
        <thead className="bg-[var(--secondary)]/40 text-left text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
          <tr>
            <th className="w-[22%] px-4 py-2.5 font-medium">类目</th>
            <th className="w-[6%] px-4 py-2.5 font-medium">数量</th>
            <th className="px-4 py-2.5 font-medium">内容</th>
            <th className="w-[8%] px-4 py-2.5 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {group.modules.map((mod) => (
            <tr
              key={mod.id}
              className="border-t border-[var(--border)] align-top hover:bg-[var(--secondary)]/20"
            >
              <td className="px-4 py-3">
                <span className="font-medium text-[var(--foreground)]">
                  {mod.label}
                </span>
                {mod.hint && (
                  <span className="ml-1.5 text-[11px] text-[var(--muted-foreground)]">
                    {`{${mod.hint}}`}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-[var(--foreground)]">
                {mod.tags.length}
              </td>
              <td className="px-4 py-3">
                <TagChips tags={mod.tags} />
              </td>
              <td className="px-4 py-3">
                <StatusPill status={mod.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupNav({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {DEV_REGISTRY.map((g) => {
        const active = g.id === selectedId;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelect(g.id)}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-[13px] transition ${
              active
                ? "bg-[var(--primary)]/15 text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/50 hover:text-[var(--foreground)]"
            }`}
          >
            <span className="truncate font-medium">{g.label}</span>
            <span
              className={`ml-2 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] ${
                active
                  ? "bg-[var(--primary)]/20 text-[var(--foreground)]"
                  : "bg-[var(--secondary)]/40 text-[var(--muted-foreground)]"
              }`}
            >
              {g.modules.length}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default function DevDashboard() {
  const [selectedId, setSelectedId] = useState<string>(DEV_REGISTRY[0].id);
  const group =
    DEV_REGISTRY.find((g) => g.id === selectedId) ?? DEV_REGISTRY[0];

  return (
    <div className="flex h-full">
      <aside className="w-60 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--card)]/40 px-3 py-5">
        <div className="mb-4 px-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Dev Console
          </h2>
        </div>
        <GroupNav selectedId={selectedId} onSelect={setSelectedId} />
      </aside>

      <section className="flex-1 overflow-y-auto px-10 py-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-5 text-2xl font-semibold text-[var(--foreground)]">
            {group.label}
          </h1>
          <GroupTable group={group} />
        </div>
      </section>
    </div>
  );
}
