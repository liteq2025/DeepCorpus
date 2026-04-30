"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, FileCode, ExternalLink } from "lucide-react";
import {
  DEV_REGISTRY,
  type ModuleEntry,
  type RegistryGroup,
  type ModuleStatus,
} from "@/lib/dev-registry";

type Selection =
  | { kind: "group"; group: RegistryGroup }
  | { kind: "module"; group: RegistryGroup; module: ModuleEntry; trail: ModuleEntry[] };

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

interface TreeNodeProps {
  module: ModuleEntry;
  group: RegistryGroup;
  trail: ModuleEntry[];
  depth: number;
  selectedId: string | null;
  onSelect: (sel: Selection) => void;
}

function TreeNode({ module: mod, group, trail, depth, selectedId, onSelect }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = !!mod.submodules?.length;
  const isSelected = selectedId === mod.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect({ kind: "module", group, module: mod, trail })}
        className={`group flex w-full items-center gap-1 rounded px-2 py-1 text-left text-[13px] transition ${
          isSelected
            ? "bg-[var(--primary)]/15 text-[var(--foreground)]"
            : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/50 hover:text-[var(--foreground)]"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                setExpanded((v) => !v);
              }
            }}
            className="-ml-1 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-[var(--secondary)]"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        ) : (
          <span className="-ml-1 inline-block h-4 w-4" />
        )}
        <span className="flex-1 truncate">{mod.label}</span>
        <StatusPill status={mod.status} />
      </button>
      {hasChildren && expanded && (
        <div>
          {mod.submodules!.map((child) => (
            <TreeNode
              key={child.id}
              module={child}
              group={group}
              trail={[...trail, mod]}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupSection({
  group,
  selectedId,
  onSelect,
}: {
  group: RegistryGroup;
  selectedId: string | null;
  onSelect: (sel: Selection) => void;
}) {
  const isGroupSelected = selectedId === group.id;
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => onSelect({ kind: "group", group })}
        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[12px] font-semibold uppercase tracking-wide transition ${
          isGroupSelected
            ? "bg-[var(--primary)]/15 text-[var(--foreground)]"
            : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/40 hover:text-[var(--foreground)]"
        }`}
      >
        <span>{group.label}</span>
        <span className="text-[10px] font-normal lowercase text-[var(--muted-foreground)]">
          {group.modules.length} modules
        </span>
      </button>
      <div className="mt-0.5">
        {group.modules.map((mod) => (
          <TreeNode
            key={mod.id}
            module={mod}
            group={group}
            trail={[]}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function GroupOverview({ group }: { group: RegistryGroup }) {
  const totalModules = group.modules.length;
  const totalSubmodules = group.modules.reduce(
    (sum, m) => sum + (m.submodules?.length ?? 0),
    0,
  );
  const shipped = group.modules.filter((m) => m.status === "shipped").length;
  const wip = group.modules.filter((m) => m.status === "wip").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">{group.label}</h1>
        {group.description && (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{group.description}</p>
        )}
      </header>
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Modules" value={totalModules} />
        <Stat label="Submodules" value={totalSubmodules} />
        <Stat label="Shipped" value={shipped} />
        <Stat label="WIP" value={wip} />
      </div>
      <div>
        <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Modules</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {group.modules.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[var(--foreground)]">
                  {m.label}
                </span>
                <StatusPill status={m.status} />
              </div>
              {m.path && <div className="mt-1.5"><PathChip path={m.path} /></div>}
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                {m.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-semibold text-[var(--foreground)]">
        {value}
      </div>
    </div>
  );
}

type Tab = "overview" | "design" | "components" | "tokens";

const TABS: { id: Tab; label: string; available: boolean }[] = [
  { id: "overview", label: "Overview", available: true },
  { id: "components", label: "Components", available: false },
  { id: "design", label: "Design", available: false },
  { id: "tokens", label: "Tokens", available: false },
];

function ModuleDetail({
  group,
  module: mod,
  trail,
}: {
  group: RegistryGroup;
  module: ModuleEntry;
  trail: ModuleEntry[];
}) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="space-y-6">
      <header>
        <nav className="mb-2 flex flex-wrap items-center gap-1 text-[12px] text-[var(--muted-foreground)]">
          <span>{group.label}</span>
          {trail.map((t) => (
            <span key={t.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              <span>{t.label}</span>
            </span>
          ))}
          <ChevronRight className="h-3 w-3" />
          <span className="text-[var(--foreground)]">{mod.label}</span>
        </nav>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">{mod.label}</h1>
          <StatusPill status={mod.status} />
        </div>
        {mod.path && <div className="mt-2"><PathChip path={mod.path} /></div>}
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {mod.description}
        </p>
        {mod.tags && mod.tags.length > 0 && (
          <div className="mt-3">
            <TagChips tags={mod.tags} />
          </div>
        )}
      </header>

      <div className="border-b border-[var(--border)]">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={!t.available}
              onClick={() => t.available && setTab(t.id)}
              className={`relative px-3 py-1.5 text-[13px] transition ${
                tab === t.id
                  ? "text-[var(--foreground)]"
                  : t.available
                    ? "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    : "cursor-not-allowed text-[var(--muted-foreground)]/50"
              }`}
            >
              {t.label}
              {!t.available && (
                <span className="ml-1 text-[10px] uppercase">soon</span>
              )}
              {tab === t.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--primary)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {mod.submodules && mod.submodules.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                Submodules ({mod.submodules.length})
              </h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {mod.submodules.map((sub) => (
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
            </section>
          )}

          {mod.features && mod.features.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                Features ({mod.features.length})
              </h2>
              <ul className="space-y-2">
                {mod.features.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-[var(--foreground)]">
                        {f.label}
                      </span>
                      <StatusPill status={f.status} />
                    </div>
                    {f.description && (
                      <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                        {f.description}
                      </p>
                    )}
                    {f.tags && f.tags.length > 0 && (
                      <div className="mt-2">
                        <TagChips tags={f.tags} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {mod.references && mod.references.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                References
              </h2>
              <ul className="space-y-1 text-[12px]">
                {mod.references.map((r, i) => (
                  <li key={i} className="flex items-center gap-1 text-[var(--muted-foreground)]">
                    {r.href ? (
                      <a
                        href={r.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-[var(--foreground)]"
                      >
                        {r.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <code className="font-mono">{r.label}</code>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(!mod.submodules || mod.submodules.length === 0) &&
            (!mod.features || mod.features.length === 0) && (
              <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)]/50 p-6 text-center text-[12px] text-[var(--muted-foreground)]">
                No submodules or features registered yet. Edit{" "}
                <code className="font-mono">web/lib/dev-registry.ts</code> to extend.
              </div>
            )}
        </div>
      )}

      {tab !== "overview" && (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)]/50 p-6 text-center text-[12px] text-[var(--muted-foreground)]">
          The <strong>{tab}</strong> view is reserved. Hook it up when needed
          (e.g., scrape Tailwind tokens, mount Storybook, link Figma frames).
        </div>
      )}
    </div>
  );
}

export default function DevDashboard() {
  const [selection, setSelection] = useState<Selection>(() => ({
    kind: "group",
    group: DEV_REGISTRY[0],
  }));

  const selectedId = useMemo(
    () => (selection.kind === "module" ? selection.module.id : selection.group.id),
    [selection],
  );

  return (
    <div className="flex h-full">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--card)]/40 px-3 py-4">
        <div className="mb-3 px-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Dev Console
          </h2>
          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]/80">
            Module + feature registry · click to inspect
          </p>
        </div>
        {DEV_REGISTRY.map((g) => (
          <GroupSection
            key={g.id}
            group={g}
            selectedId={selectedId}
            onSelect={setSelection}
          />
        ))}
      </aside>

      <section className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-4xl">
          {selection.kind === "group" ? (
            <GroupOverview group={selection.group} />
          ) : (
            <ModuleDetail
              group={selection.group}
              module={selection.module}
              trail={selection.trail}
            />
          )}
        </div>
      </section>
    </div>
  );
}
