"use client";

import { useCallback, useState } from "react";
import { Heart, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { apiUrl } from "@/lib/api";
import { useConfirm } from "@/components/layout";
import type { SoulTemplate } from "@/lib/agents-helpers";

interface SoulsTabProps {
  souls: SoulTemplate[];
  onReload: () => Promise<void>;
  onToast: (msg: string) => void;
}

export function SoulsTab({ souls, onReload, onToast }: SoulsTabProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");

  const startEdit = (soul: SoulTemplate) => {
    setEditing(soul.id);
    setEditName(soul.name);
    setEditContent(soul.content);
    setCreating(false);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditName("");
    setEditContent("");
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setNewName("");
    setNewContent("");
  };

  const saveSoul = useCallback(async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/v1/tutorbot/souls/${editing}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), content: editContent }),
      });
      if (res.ok) {
        onToast(`"${editName.trim()}" updated`);
        cancelEdit();
        await onReload();
      }
    } finally {
      setSaving(false);
    }
  }, [editing, editName, editContent, onReload, onToast]);

  const createSoul = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/v1/tutorbot/souls"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, content: newContent }),
      });
      if (res.ok) {
        onToast(`"${name}" created`);
        setCreating(false);
        setNewName("");
        setNewContent("");
        await onReload();
      } else if (res.status === 409) {
        onToast(`Soul ID "${id}" already exists`);
      }
    } finally {
      setSaving(false);
    }
  }, [newName, newContent, onReload, onToast]);

  const deleteSoul = useCallback(
    async (soul: SoulTemplate) => {
      if (
        !(await confirm({
          title: t('Delete soul "{{name}}"?', { name: soul.name }),
          destructive: true,
        }))
      )
        return;
      const res = await fetch(apiUrl(`/api/v1/tutorbot/souls/${soul.id}`), {
        method: "DELETE",
      });
      if (res.ok) {
        if (editing === soul.id) cancelEdit();
        onToast(`"${soul.name}" deleted`);
        await onReload();
      }
    },
    [confirm, editing, onReload, onToast, t],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, save: () => void) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    },
    [],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[var(--muted-foreground)]">
          {t("Reusable soul templates for creating TutorBots.")}
        </p>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)]/50 px-3 py-1.5 text-[12px] font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground)]"
        >
          <Plus className="h-3 w-3" />
          {t("New Soul")}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-[var(--foreground)]">
              {t("New Soul")}
            </h2>
            <button
              onClick={() => setCreating(false)}
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
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("e.g. Creative Writer")}
                className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--ring)] placeholder:text-[var(--muted-foreground)]/40"
              />
              {newName.trim() && (
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  ID:{" "}
                  {newName
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "")}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--muted-foreground)]">
                {t("Content")}
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, createSoul)}
                placeholder={t("Define the soul in markdown...")}
                rows={10}
                spellCheck={false}
                className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 font-mono text-[13px] leading-6 text-[var(--foreground)] outline-none focus:border-[var(--ring)] placeholder:text-[var(--muted-foreground)]/40"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCreating(false)}
                className="rounded-lg px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={createSoul}
                disabled={saving || !newName.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {t("Create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Soul list */}
      {souls.length === 0 && !creating ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-center">
          <div className="mb-3 rounded-xl bg-[var(--muted)] p-2.5 text-[var(--muted-foreground)]">
            <Heart size={18} />
          </div>
          <p className="text-[14px] font-medium text-[var(--foreground)]">
            {t("No souls yet")}
          </p>
          <p className="mt-1.5 max-w-xs text-[13px] text-[var(--muted-foreground)]">
            {t(
              "Create your first soul template. Default presets will be seeded automatically on next server restart.",
            )}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {souls.map((soul) =>
            editing === soul.id ? (
              <div
                key={soul.id}
                className="rounded-xl border border-[var(--ring)] p-5"
              >
                <div className="grid gap-3">
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-[var(--muted-foreground)]">
                      {t("Name")}
                    </label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--ring)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-[var(--muted-foreground)]">
                      {t("Content")}
                    </label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, saveSoul)}
                      rows={12}
                      spellCheck={false}
                      className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 font-mono text-[13px] leading-6 text-[var(--foreground)] outline-none focus:border-[var(--ring)]"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelEdit}
                      className="rounded-lg px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      {t("Cancel")}
                    </button>
                    <button
                      onClick={saveSoul}
                      disabled={saving || !editName.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      {t("Save")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={soul.id}
                className="group flex items-start justify-between rounded-xl border border-[var(--border)] px-5 py-4 transition-colors hover:border-[var(--border)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Heart className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
                    <p className="text-[14px] font-medium text-[var(--foreground)]">
                      {soul.name}
                    </p>
                    <span className="text-[11px] text-[var(--muted-foreground)]/60">
                      {soul.id}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-[var(--muted-foreground)] pl-5.5">
                    {soul.content.replace(/^#.*\n+/g, "").slice(0, 200)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(soul)}
                    className="inline-flex items-center justify-center rounded-lg border border-[var(--border)]/50 p-1.5 text-[var(--muted-foreground)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground)]"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => deleteSoul(soul)}
                    className="inline-flex items-center justify-center rounded-lg border border-[var(--border)]/50 p-1.5 text-[var(--muted-foreground)] transition-colors hover:border-red-400/50 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
