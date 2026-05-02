"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useTranslation } from "react-i18next";

import { apiUrl } from "@/lib/api";
import {
  defaultFor,
  type BotInfo,
  type ChannelsSchemaResponse,
} from "@/lib/agents-helpers";
import { SchemaField } from "@/components/agents/SchemaField";

interface ChannelsTabProps {
  bots: BotInfo[];
  loading: boolean;
  onToast: (msg: string) => void;
  onReload: () => Promise<void>;
}

/**
 * Schema-driven Channels editor. Pulls the channel catalog once from
 * `/api/v1/tutorbot/channels/schema`, renders a master-detail UI per bot,
 * and saves via PATCH `/api/v1/tutorbot/{bot_id}` with the merged config.
 */
export function ChannelsTab({
  bots,
  loading,
  onToast,
  onReload,
}: ChannelsTabProps) {
  const { t } = useTranslation();
  const [selectedBot, setSelectedBot] = useState("");
  const [schemaCatalog, setSchemaCatalog] =
    useState<ChannelsSchemaResponse | null>(null);
  const [channels, setChannels] = useState<Record<string, unknown>>({});
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [reloadError, setReloadError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  /** dot-paths of secrets the user has explicitly toggled to plaintext. */
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  // One-time fetch of the channel schema catalog. Cheap and never changes
  // at runtime (channels are discovered at process start).
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/tutorbot/channels/schema"));
        if (res.ok) setSchemaCatalog(await res.json());
      } catch {
        /* leave catalog null → renders fallback message */
      }
    })();
  }, []);

  useEffect(() => {
    if (bots.length > 0 && !selectedBot) setSelectedBot(bots[0].bot_id);
  }, [bots, selectedBot]);

  useEffect(() => {
    setRevealed(new Set());
    setReloadError(null);
  }, [selectedBot]);

  const loadDetail = useCallback(async (bid: string) => {
    if (!bid) return;
    setLoadingDetail(true);
    try {
      // Edit form needs raw secrets to populate fields. Default GET masks them.
      const res = await fetch(
        apiUrl(`/api/v1/tutorbot/${bid}?include_secrets=true`),
      );
      if (!res.ok) return;
      const data = await res.json();
      const raw = (data.channels ?? {}) as Record<string, unknown>;
      // Surface globals as-is; per-channel dicts are passed straight to the
      // SchemaForm which handles per-field defaults from the JSON schema.
      setChannels({
        send_progress: raw.send_progress !== false,
        send_tool_hints: !!raw.send_tool_hints,
        ...Object.fromEntries(
          Object.entries(raw).filter(
            ([k]) => k !== "send_progress" && k !== "send_tool_hints",
          ),
        ),
      });
      setReloadError(
        typeof data.last_reload_error === "string"
          ? data.last_reload_error
          : null,
      );
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBot) void loadDetail(selectedBot);
  }, [selectedBot, loadDetail]);

  // Pick a sensible default active channel: prefer one already enabled,
  // otherwise the first channel in the catalog.
  useEffect(() => {
    if (activeChannel || !schemaCatalog) return;
    const names = Object.keys(schemaCatalog.channels);
    const enabled = names.find((n) => {
      const cfg = channels[n];
      return (
        cfg &&
        typeof cfg === "object" &&
        (cfg as Record<string, unknown>).enabled === true
      );
    });
    setActiveChannel(enabled ?? names[0] ?? null);
  }, [schemaCatalog, channels, activeChannel]);

  const toggleSecret = useCallback((path: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const setActiveChannelConfig = (next: unknown) => {
    if (!activeChannel) return;
    setChannels((prev) => ({ ...prev, [activeChannel]: next }));
  };

  const save = async () => {
    if (!selectedBot) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/v1/tutorbot/${selectedBot}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels }),
      });
      if (res.ok) {
        onToast(t("Channels saved"));
        await Promise.all([onReload(), loadDetail(selectedBot)]);
      } else if (res.status === 422) {
        const err = (await res.json().catch(() => ({}))) as {
          detail?: { message?: string; errors?: unknown } | string;
        };
        const detail = err.detail;
        const msg =
          typeof detail === "string"
            ? detail
            : (detail?.message ?? t("Invalid channel configuration"));
        onToast(msg);
      } else {
        const err = (await res.json().catch(() => ({}))) as { detail?: string };
        onToast(err.detail ?? t("Save failed"));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-center">
        <p className="text-[14px] font-medium text-[var(--foreground)]">
          {t("No bots to configure")}
        </p>
        <p className="mt-1.5 max-w-xs text-[13px] text-[var(--muted-foreground)]">
          {t("Create a bot first in the Bots tab.")}
        </p>
      </div>
    );
  }

  const channelEntries = schemaCatalog
    ? Object.entries(schemaCatalog.channels).sort(([, a], [, b]) =>
        a.display_name.localeCompare(b.display_name),
      )
    : [];
  const activeEntry = activeChannel
    ? schemaCatalog?.channels[activeChannel]
    : undefined;
  const activeValue =
    activeChannel &&
    channels[activeChannel] &&
    typeof channels[activeChannel] === "object"
      ? (channels[activeChannel] as Record<string, unknown>)
      : (activeEntry?.default_config ?? {});
  const activeSecretSet = new Set(activeEntry?.secret_fields ?? []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[12px] font-medium text-[var(--muted-foreground)] shrink-0">
          {t("Bot")}
        </label>
        <select
          value={selectedBot}
          onChange={(e) => setSelectedBot(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-1.5 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--ring)]"
        >
          {bots.map((b) => (
            <option key={b.bot_id} value={b.bot_id}>
              {b.name} ({b.bot_id})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || loadingDetail}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {t("Save")}
        </button>
      </div>

      {reloadError && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-300">
          <strong className="font-medium">
            {t("Channel listeners failed to restart:")}
          </strong>{" "}
          <span className="font-mono">{reloadError}</span>{" "}
          <span className="opacity-80">
            {t("Config is saved on disk; stop and start the bot to apply.")}
          </span>
        </div>
      )}

      {loadingDetail || !schemaCatalog ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : (
        <>
          {/* Globals (Delivery) */}
          <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
            <h3 className="text-[13px] font-medium text-[var(--foreground)]">
              {t("Delivery")}
            </h3>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={!!channels.send_progress}
                onChange={(e) =>
                  setChannels((c) => ({
                    ...c,
                    send_progress: e.target.checked,
                  }))
                }
              />
              {t("Stream progress text to channels")}
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={!!channels.send_tool_hints}
                onChange={(e) =>
                  setChannels((c) => ({
                    ...c,
                    send_tool_hints: e.target.checked,
                  }))
                }
              />
              {t("Stream tool hints to channels")}
            </label>
          </div>

          {/* Channel master-detail */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr]">
            <aside className="rounded-xl border border-[var(--border)] p-2 h-fit">
              <ul className="space-y-0.5">
                {channelEntries.map(([name, entry]) => {
                  const cfg = channels[name] as
                    | Record<string, unknown>
                    | undefined;
                  const enabled = cfg?.enabled === true;
                  const isActive = activeChannel === name;
                  return (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() => setActiveChannel(name)}
                        className={`group flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                          isActive
                            ? "bg-[var(--muted)] font-medium text-[var(--foreground)]"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        <span className="truncate">{entry.display_name}</span>
                        {enabled && (
                          <span
                            aria-label={t("Enabled")}
                            title={t("Enabled")}
                            className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <section className="rounded-xl border border-[var(--border)] p-4 space-y-3">
              {!activeEntry ? (
                <p className="text-[13px] text-[var(--muted-foreground)]">
                  {t("Select a channel.")}
                </p>
              ) : (
                <>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-[14px] font-medium text-[var(--foreground)]">
                      {activeEntry.display_name}
                    </h3>
                    <code className="text-[11px] text-[var(--muted-foreground)]">
                      {activeEntry.name}
                    </code>
                  </div>
                  {activeEntry.json_schema.description && (
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {activeEntry.json_schema.description}
                    </p>
                  )}
                  {Object.entries(activeEntry.json_schema.properties ?? {}).map(
                    ([k, child]) => (
                      <SchemaField
                        key={k}
                        fieldKey={k}
                        schema={child}
                        value={activeValue[k] ?? defaultFor(child)}
                        onChange={(next) =>
                          setActiveChannelConfig({ ...activeValue, [k]: next })
                        }
                        secretFields={activeSecretSet}
                        path={k}
                        showSecretFor={revealed}
                        toggleSecret={toggleSecret}
                      />
                    ),
                  )}
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
