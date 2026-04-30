"use client";

import { useState } from "react";
import { FileCode } from "lucide-react";
import {
  DEV_REGISTRY,
  type ModuleEntry,
  type RegistryGroup,
  type ModuleStatus,
} from "@/lib/dev-registry";

// ─── primitives ────────────────────────────────────────────────────────────

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

function PathChip({ path }: { path?: string }) {
  if (!path) return null;
  return (
    <code className="inline-flex items-center gap-1 rounded bg-[var(--secondary)]/60 px-1.5 py-0.5 font-mono text-[11px] text-[var(--muted-foreground)]">
      <FileCode className="h-3 w-3" />
      {path}
    </code>
  );
}

function TagChips({ tags, max }: { tags?: string[]; max?: number }) {
  if (!tags || tags.length === 0) return null;
  const shown = max ? tags.slice(0, max) : tags;
  const rest = max && tags.length > max ? tags.length - max : 0;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[11px] text-[var(--foreground)]"
        >
          {tag}
        </span>
      ))}
      {rest > 0 && (
        <span className="inline-flex items-center px-1 text-[11px] text-[var(--muted-foreground)]">
          +{rest}
        </span>
      )}
    </div>
  );
}

// ─── Layout: stats (Overview) ─────────────────────────────────────────────

function StatsLayout({ group }: { group: RegistryGroup }) {
  return (
    <div className="space-y-10">
      {group.modules.map((mod) => {
        const isStatTiles = mod.features?.some((f) => f.value);
        return (
          <section key={mod.id}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                {mod.label}
              </h2>
              {mod.description && (
                <span className="text-[12px] text-[var(--muted-foreground)]">
                  {mod.description}
                </span>
              )}
            </div>

            {isStatTiles ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {mod.features!.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                      {f.label}
                    </div>
                    <div className="mt-1 text-3xl font-semibold leading-none text-[var(--foreground)]">
                      {f.value}
                    </div>
                    {f.description && (
                      <div className="mt-2 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                        {f.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                {mod.features?.map((f) => (
                  <li
                    key={f.id}
                    className="rounded border border-[var(--border)]/60 bg-[var(--card)]/60 px-3 py-2 text-[13px] text-[var(--foreground)]"
                  >
                    {f.label}
                    {f.description && (
                      <span className="ml-1 text-[12px] text-[var(--muted-foreground)]">
                        — {f.description}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ─── Layout: modules (Features) — rich sections with submodules grid ──────

function ModulesLayout({ group }: { group: RegistryGroup }) {
  return (
    <div>
      {group.modules.map((mod, idx) => (
        <article
          key={mod.id}
          className={
            idx === 0
              ? "pb-6"
              : "border-t border-[var(--border)] py-6 last:pb-0"
          }
        >
          <header>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                {mod.label}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                {mod.submodules && mod.submodules.length > 0 && (
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    {mod.submodules.length} sub
                  </span>
                )}
                {mod.features && mod.features.length > 0 && (
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    {mod.features.length} feat
                  </span>
                )}
                <StatusPill status={mod.status} />
              </div>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted-foreground)]">
              {mod.description}
            </p>
          </header>

          {mod.submodules && mod.submodules.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {mod.submodules.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
                >
                  <div className="text-[13px] font-medium text-[var(--foreground)]">
                    {sub.label}
                  </div>
                  {sub.description && (
                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                      {sub.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

// ─── Layout: table (Components) ───────────────────────────────────────────

function ComponentsTable({ group }: { group: RegistryGroup }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <table className="w-full text-[13px]">
        <thead className="bg-[var(--secondary)]/40 text-left text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
          <tr>
            <th className="px-4 py-2.5 font-medium">目录</th>
            <th className="px-4 py-2.5 font-medium">组件数</th>
            <th className="px-4 py-2.5 font-medium">用途</th>
            <th className="px-4 py-2.5 font-medium">关键组件</th>
            <th className="px-4 py-2.5 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {group.modules.map((mod) => {
            // Extract count from first tag if it matches "N components"
            const countTag = mod.tags?.find((t) => /\d+ components?/.test(t));
            const count = countTag ? countTag.match(/\d+/)?.[0] : "—";
            const examples =
              mod.features
                ?.map((f) => f.label)
                .slice(0, 3)
                .join("  ·  ") ?? "";
            return (
              <tr
                key={mod.id}
                className="border-t border-[var(--border)] align-top hover:bg-[var(--secondary)]/20"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--foreground)]">
                      {mod.label}
                    </span>
                  </div>
                  {mod.path && (
                    <div className="mt-1">
                      <PathChip path={mod.path} />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-[var(--foreground)]">
                  {count}
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)]">
                  {mod.description}
                </td>
                <td className="px-4 py-3 text-[12px] text-[var(--muted-foreground)]">
                  {examples}
                  {mod.features && mod.features.length > 3 && (
                    <span className="ml-1 text-[var(--muted-foreground)]/60">
                      +{mod.features.length - 3}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={mod.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Layout: cards (Stack / Frontend / Fork) ──────────────────────────────

function CardsLayout({ group }: { group: RegistryGroup }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {group.modules.map((mod) => (
        <div
          key={mod.id}
          className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
              {mod.label}
            </h3>
            <StatusPill status={mod.status} />
          </div>
          {mod.description && (
            <p className="text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">
              {mod.description}
            </p>
          )}
          {mod.tags && mod.tags.length > 0 && <TagChips tags={mod.tags} />}
          {mod.submodules && mod.submodules.length > 0 && (
            <ul className="space-y-1 border-t border-[var(--border)]/60 pt-3 text-[12px]">
              {mod.submodules.map((sub) => (
                <li key={sub.id} className="flex gap-2">
                  <span className="shrink-0 text-[var(--muted-foreground)]">·</span>
                  <span className="text-[var(--foreground)]">
                    <span className="font-medium">{sub.label}</span>
                    {sub.description && (
                      <span className="text-[var(--muted-foreground)]">
                        {" — "}
                        {sub.description}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {mod.features && mod.features.length > 0 && (
            <ul className="space-y-1 border-t border-[var(--border)]/60 pt-3 text-[12px]">
              {mod.features.map((f) => (
                <li key={f.id} className="flex gap-2">
                  <span className="shrink-0 text-[var(--muted-foreground)]">·</span>
                  <span className="text-[var(--foreground)]">
                    <span className="font-medium">{f.label}</span>
                    {f.description && (
                      <span className="text-[var(--muted-foreground)]">
                        {" — "}
                        {f.description}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Group view dispatcher ─────────────────────────────────────────────────

function GroupView({ group }: { group: RegistryGroup }) {
  const layout = group.layout ?? "modules";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          {group.label}
        </h1>
        {group.description && (
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-[var(--muted-foreground)]">
            {group.description}
          </p>
        )}
      </header>

      {layout === "stats" && <StatsLayout group={group} />}
      {layout === "modules" && <ModulesLayout group={group} />}
      {layout === "table" && <ComponentsTable group={group} />}
      {layout === "cards" && <CardsLayout group={group} />}
    </div>
  );
}

// ─── Left sidebar ─────────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────

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
          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]/80">
            产品 / 技术维度速览
          </p>
        </div>
        <GroupNav selectedId={selectedId} onSelect={setSelectedId} />
      </aside>

      <section className="flex-1 overflow-y-auto px-10 py-8">
        <div className="mx-auto max-w-6xl">
          <GroupView group={group} />
        </div>
      </section>
    </div>
  );
}
