"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Bot,
  Loader2,
  MessageCircle,
  Play,
  Plus,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { apiUrl } from "@/lib/api";
import { useConfirm } from "@/components/layout";
import type { BotInfo, SoulTemplate } from "@/lib/agents-helpers";

interface BotsTabProps {
  bots: BotInfo[];
  souls: SoulTemplate[];
  loading: boolean;
  onReload: () => Promise<void>;
  onToast: (msg: string) => void;
  router: ReturnType<typeof useRouter>;
}

export function BotsTab({
  bots,
  souls,
  loading,
  onReload,
  onToast,
  router,
}: BotsTabProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSoulId, setFormSoulId] = useState("_custom");
  const [formSoul, setFormSoul] = useState("");
  const [formModel, setFormModel] = useState("");

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormSoulId("_custom");
    setFormSoul("");
    setFormModel("");
  };

  const botId = useMemo(() => {
    const trimmed = formName.trim();
    if (!trimmed) return "";
    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (slug) return slug;
    // Name has no ASCII alphanumerics (e.g. pure Chinese / Japanese).
    // Derive a deterministic ASCII fallback so the bot ID stays
    // filesystem- and URL-safe while the display name keeps its CJK form.
    let h = 0;
    for (let i = 0; i < trimmed.length; i++) {
      h = (h << 5) - h + trimmed.charCodeAt(i);
      h |= 0;
    }
    return `bot-${Math.abs(h).toString(36).padStart(6, "0").slice(0, 8)}`;
  }, [formName]);

  const selectSoul = (id: string) => {
    setFormSoulId(id);
    if (id !== "_custom") {
      const soul = souls.find((s) => s.id === id);
      if (soul) setFormSoul(soul.content);
    }
  };

  const createBot = useCallback(async () => {
    if (!botId) return;
    setCreating(true);
    try {
      const res = await fetch(apiUrl("/api/v1/tutorbot"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_id: botId,
          name: formName.trim(),
          description: formDesc.trim(),
          persona: formSoul.trim(),
          model: formModel.trim() || undefined,
        }),
      });
      if (res.ok) {
        onToast(`${formName.trim()} created`);
        setShowCreate(false);
        resetForm();
        await onReload();
      } else {
        const err = (await res.json().catch(() => ({}))) as {
          detail?: string | { message?: string };
        };
        const detail =
          typeof err.detail === "string"
            ? err.detail
            : (err.detail?.message ?? t("Failed to create bot"));
        onToast(detail);
      }
    } catch {
      onToast(t("Failed to create bot"));
    } finally {
      setCreating(false);
    }
  }, [botId, formName, formDesc, formSoul, formModel, onReload, onToast, t]);

  const startBot = useCallback(
    async (bid: string) => {
      const res = await fetch(apiUrl("/api/v1/tutorbot"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: bid }),
      });
      if (res.ok) {
        onToast(`${bid} started`);
        await onReload();
      }
    },
    [onReload, onToast],
  );

  const stopBot = useCallback(
    async (bid: string) => {
      const res = await fetch(apiUrl(`/api/v1/tutorbot/${bid}`), {
        method: "DELETE",
      });
      if (res.ok) {
        onToast(`${bid} stopped`);
        await onReload();
      }
    },
    [onReload, onToast],
  );

  const destroyBot = useCallback(
    async (bid: string, name: string) => {
      if (
        !(await confirm({
          title: t(
            'Permanently delete "{{name}}" ({{id}})? This cannot be undone.',
            { name, id: bid },
          ),
          destructive: true,
        }))
      )
        return;
      const res = await fetch(apiUrl(`/api/v1/tutorbot/${bid}/destroy`), {
        method: "DELETE",
      });
      if (res.ok) {
        onToast(`${name} deleted`);
        await onReload();
      }
    },
    [confirm, onReload, onToast, t],
  );

  return (
    <>
      {/* New Bot button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)]/50 px-3 py-1.5 text-[12px] font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground)]"
        >
          <Plus className="h-3 w-3" />
          {t("New Bot")}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 rounded-xl border border-[var(--border)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-[var(--foreground)]">
              {t("Create TutorBot")}
            </h2>
            <button
              onClick={() => {
                setShowCreate(false);
                resetForm();
              }}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--muted-foreground)]">
                {t("Name")}
              </label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("e.g. Math Tutor")}
                className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--ring)] placeholder:text-[var(--muted-foreground)]/40"
              />
              {botId && (
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  ID: {botId}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--muted-foreground)]">
                {t("Description")}{" "}
                <span className="font-normal opacity-60">
                  {t("(optional)")}
                </span>
              </label>
              <input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder={t("A brief description of what this bot does")}
                className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--ring)] placeholder:text-[var(--muted-foreground)]/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--muted-foreground)]">
                {t("Soul")}
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  onClick={() => selectSoul("_custom")}
                  className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${
                    formSoulId === "_custom"
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {t("Custom")}
                </button>
                {souls.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectSoul(s.id)}
                    className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${
                      formSoulId === s.id
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <textarea
                value={formSoul}
                onChange={(e) => {
                  setFormSoul(e.target.value);
                  setFormSoulId("_custom");
                }}
                placeholder={t(
                  "Define the bot's personality, values, and communication style in markdown...",
                )}
                rows={8}
                className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 font-mono text-[13px] leading-6 text-[var(--foreground)] outline-none focus:border-[var(--ring)] placeholder:text-[var(--muted-foreground)]/40"
              />
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]/60">
                {t(
                  "Pick a soul from the library above, or write your own. Manage the library in the Souls tab.",
                )}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--muted-foreground)]">
                {t("Model")}{" "}
                <span className="font-normal opacity-60">
                  {t("(optional)")}
                </span>
              </label>
              <input
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                placeholder={t("Uses default model if empty")}
                className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--ring)] placeholder:text-[var(--muted-foreground)]/40"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={createBot}
                disabled={creating || !botId}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {t("Create & Start")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bot list */}
      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : bots.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-center">
          <div className="mb-3 rounded-xl bg-[var(--muted)] p-2.5 text-[var(--muted-foreground)]">
            <Bot size={18} />
          </div>
          <p className="text-[14px] font-medium text-[var(--foreground)]">
            {t("No TutorBots yet")}
          </p>
          <p className="mt-1.5 max-w-xs text-[13px] text-[var(--muted-foreground)]">
            {t("Create your first TutorBot to get started.")}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {bots.map((bot) => (
            <div
              key={bot.bot_id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] px-5 py-4 transition-colors hover:border-[var(--border)]"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`h-2 w-2 shrink-0 rounded-full ${bot.running ? "bg-emerald-500" : "bg-[var(--muted-foreground)]/30"}`}
                />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[var(--foreground)] truncate">
                    {bot.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-3 text-[12px] text-[var(--muted-foreground)]">
                    {bot.description ? (
                      <span className="truncate max-w-[300px]">
                        {bot.description}
                      </span>
                    ) : (
                      <span>{bot.bot_id}</span>
                    )}
                    {bot.model && <span>· {bot.model}</span>}
                    {bot.started_at && (
                      <span>
                        ·{" "}
                        {t("started {{time}}", {
                          time: new Date(bot.started_at).toLocaleString(),
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {bot.running ? (
                  <>
                    <button
                      onClick={() => router.push(`/agents/${bot.bot_id}/chat`)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)]/50 px-3 py-1.5 text-[12px] font-medium text-[var(--primary)] transition-colors hover:border-[var(--primary)]/50"
                    >
                      <MessageCircle className="h-3 w-3" />
                      {t("Chat")}
                    </button>
                    <button
                      onClick={() => stopBot(bot.bot_id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)]/50 px-3 py-1.5 text-[12px] font-medium text-red-400 transition-colors hover:border-red-400/50"
                    >
                      <Square className="h-3 w-3" />
                      {t("Stop")}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startBot(bot.bot_id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)]/50 px-3 py-1.5 text-[12px] font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground)]"
                  >
                    <Play className="h-3 w-3" />
                    {t("Start")}
                  </button>
                )}
                <button
                  onClick={() => destroyBot(bot.bot_id, bot.name)}
                  className="inline-flex items-center justify-center rounded-lg border border-[var(--border)]/50 p-1.5 text-[var(--muted-foreground)]/50 transition-colors hover:border-red-400/50 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
