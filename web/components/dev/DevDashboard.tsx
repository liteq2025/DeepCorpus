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

function TagChips({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[11px] text-[var(--foreground)]"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-semibold text-[var(--foreground)]">
        {value}
      </div>
    </div>
  );
}

// ─── module section (one module + its submodules + features) ──────────────

function ModuleSection({ module: mod }: { module: ModuleEntry }) {
  const subCount = mod.submodules?.length ?? 0;
  const featCount = mod.features?.length ?? 0;
  const tagCount = mod.tags?.length ?? 0;

  return (
    <article className="border-t border-[var(--border)] py-6 first:border-t-0 first:pt-0">
      <header>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">{mod.label}</h3>
          <div className="flex shrink-0 items-center gap-2">
            {subCount > 0 && (
              <span className="text-[11px] text-[var(--muted-foreground)]">
                {subCount} sub
              </span>
            )}
            {featCount > 0 && (
              <span className="text-[11px] text-[var(--muted-foreground)]">
                {featCount} feat
              </span>
            )}
            <StatusPill status={mod.status} />
          </div>
        </div>
        {mod.path && <div className="mt-1.5"><PathChip path={mod.path} /></div>}
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted-foreground)]">
          {mod.description}
        </p>
        {tagCount > 0 && (
          <div className="mt-3">
            <TagChips tags={mod.tags} />
          </div>
        )}
      </header>

      {subCount > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {mod.submodules!.map((sub) => (
            <div
              key={sub.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-[var(--foreground)]">
                  {sub.label}
                </span>
                <StatusPill status={sub.status} />
              </div>
              {sub.path && <div className="mt-1.5"><PathChip path={sub.path} /></div>}
              {sub.description && (
                <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                  {sub.description}
                </p>
              )}
              {sub.tags && sub.tags.length > 0 && (
                <div className="mt-2">
                  <TagChips tags={sub.tags} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {featCount > 0 && (
        <ul className="mt-4 space-y-1.5">
          {mod.features!.map((f) => (
            <li
              key={f.id}
              className="flex flex-col gap-1 rounded border border-[var(--border)]/50 bg-[var(--card)]/60 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-medium text-[var(--foreground)]">
                  {f.label}
                </span>
                <StatusPill status={f.status} />
              </div>
              {f.description && (
                <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                  {f.description}
                </p>
              )}
              {f.tags && f.tags.length > 0 && <TagChips tags={f.tags} />}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

// ─── group view (entire group rendered inline) ────────────────────────────

function GroupView({ group }: { group: RegistryGroup }) {
  const totalSubmodules = group.modules.reduce(
    (sum, m) => sum + (m.submodules?.length ?? 0),
    0,
  );
  const totalFeatures = group.modules.reduce(
    (sum, m) => sum + (m.features?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">
          {group.label}
        </h1>
        {group.description && (
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[var(--muted-foreground)]">
            {group.description}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-2xl">
          <Stat label="Modules" value={group.modules.length} />
          <Stat label="Submodules" value={totalSubmodules} />
          <Stat label="Features" value={totalFeatures} />
          <Stat
            label="Shipped"
            value={`${group.modules.filter((m) => m.status === "shipped").length}/${group.modules.length}`}
          />
        </div>
      </header>

      <div>
        {group.modules.map((mod) => (
          <ModuleSection key={mod.id} module={mod} />
        ))}
      </div>
    </div>
  );
}

// ─── left sidebar: 6 group buttons, no tree ───────────────────────────────

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
        const moduleCount = g.modules.length;
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
              {moduleCount}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────

export default function DevDashboard() {
  const [selectedId, setSelectedId] = useState<string>(DEV_REGISTRY[0].id);
  const group =
    DEV_REGISTRY.find((g) => g.id === selectedId) ?? DEV_REGISTRY[0];

  return (
    <div className="flex h-full">
      <aside className="w-60 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--card)]/40 px-3 py-5">
        <div className="mb-3 px-2">
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
        <div className="mx-auto max-w-5xl">
          <GroupView group={group} />
        </div>
      </section>
    </div>
  );
}
