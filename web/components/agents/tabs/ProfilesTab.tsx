"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";

import { apiUrl } from "@/lib/api";
import {
  BOT_FILES,
  type BotFile,
  type BotInfo,
  type SoulTemplate,
} from "@/lib/agents-helpers";

const MarkdownRenderer = dynamic(
  () => import("@/components/common/MarkdownRenderer"),
  { ssr: false },
);

interface ProfilesTabProps {
  bots: BotInfo[];
  souls: SoulTemplate[];
  loading: boolean;
  onToast: (msg: string) => void;
  onReloadSouls: () => Promise<void>;
}

export function ProfilesTab({
  bots,
  souls,
  loading,
  onToast,
  onReloadSouls,
}: ProfilesTabProps) {
  const { t } = useTranslation();
  const [selectedBot, setSelectedBot] = useState<string>("");
  const [activeFile, setActiveFile] = useState<BotFile>("SOUL.md");
  const [files, setFiles] = useState<Record<string, string>>({});
  const [editor, setEditor] = useState("");
  const [selectedSoulId, setSelectedSoulId] = useState("_custom");
  const [sourceSoulId, setSourceSoulId] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<
    "file_only" | "update_template" | "new_template"
  >("file_only");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [pendingSoulId, setPendingSoulId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"edit" | "preview">("edit");

  const hasChanges = editor !== (files[activeFile] ?? "");
  const activeSoulTemplate = useMemo(
    () => souls.find((s) => s.id === selectedSoulId) ?? null,
    [souls, selectedSoulId],
  );
  const sourceSoulTemplate = useMemo(
    () => souls.find((s) => s.id === sourceSoulId) ?? null,
    [souls, sourceSoulId],
  );

  const matchSoulId = useCallback(
    (content: string): string =>
      souls.find((s) => s.content === content)?.id ?? "_custom",
    [souls],
  );

  useEffect(() => {
    if (bots.length > 0 && !selectedBot) {
      setSelectedBot(bots[0].bot_id);
    }
  }, [bots, selectedBot]);

  const loadFiles = useCallback(
    async (bid: string) => {
      if (!bid) return;
      setLoadingFiles(true);
      try {
        const res = await fetch(apiUrl(`/api/v1/tutorbot/${bid}/files`));
        const data: Record<string, string> = await res.json();
        setFiles(data);
        setEditor(data[activeFile] ?? "");
        const matched = matchSoulId(data["SOUL.md"] ?? "");
        setSelectedSoulId(matched);
        setSourceSoulId(matched === "_custom" ? null : matched);
      } finally {
        setLoadingFiles(false);
      }
    },
    [activeFile, matchSoulId],
  );

  useEffect(() => {
    if (selectedBot) void loadFiles(selectedBot);
  }, [selectedBot, loadFiles]);

  useEffect(() => {
    setEditor(files[activeFile] ?? "");
    if (activeFile === "SOUL.md") {
      const matched = matchSoulId(files["SOUL.md"] ?? "");
      setSelectedSoulId(matched);
      setSourceSoulId(matched === "_custom" ? null : matched);
    }
    setActiveView("edit");
  }, [activeFile, files, matchSoulId]);

  const applySoulSelection = useCallback(
    (nextId: string) => {
      if (nextId === "_custom") {
        setSelectedSoulId("_custom");
        setSourceSoulId(null);
        return;
      }
      const soul = souls.find((s) => s.id === nextId);
      if (!soul) return;
      setSelectedSoulId(nextId);
      setSourceSoulId(nextId);
      setEditor(soul.content);
    },
    [souls],
  );

  const handleSoulSelect = useCallback(
    (nextId: string) => {
      if (hasChanges) {
        setPendingSoulId(nextId);
        setReplaceModalOpen(true);
        return;
      }
      applySoulSelection(nextId);
    },
    [applySoulSelection, hasChanges],
  );

  const saveFile = useCallback(
    async (
      mode: "file_only" | "update_template" | "new_template",
      createTemplateName?: string,
    ) => {
      if (!selectedBot) return false;
      setSaving(true);
      try {
        if (activeFile === "SOUL.md") {
          const content = editor.trim();
          if (!content) {
            onToast(t("SOUL.md is empty"));
            return false;
          }
          if (mode === "update_template") {
            if (!sourceSoulTemplate) {
              onToast(t("No template selected to update"));
              return false;
            }
            const tplRes = await fetch(
              apiUrl(`/api/v1/tutorbot/souls/${sourceSoulTemplate.id}`),
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: sourceSoulTemplate.name,
                  content: editor,
                }),
              },
            );
            if (!tplRes.ok) {
              onToast(t("Failed to update soul template"));
              return false;
            }
            await onReloadSouls();
            setSelectedSoulId(sourceSoulTemplate.id);
            setSourceSoulId(sourceSoulTemplate.id);
          } else if (mode === "new_template") {
            const rawName = (createTemplateName ?? "").trim();
            if (!rawName) {
              onToast(t("Template name is required"));
              return false;
            }
            const baseId = rawName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
            if (!baseId) {
              onToast(t("Please choose a name with letters or numbers"));
              return false;
            }
            const existing = new Set(souls.map((s) => s.id));
            let soulId = baseId;
            let n = 2;
            while (existing.has(soulId)) {
              soulId = `${baseId}-${n}`;
              n += 1;
            }
            const tplRes = await fetch(apiUrl("/api/v1/tutorbot/souls"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: soulId,
                name: rawName,
                content: editor,
              }),
            });
            if (tplRes.status === 409) {
              onToast(t("A soul with this id already exists, try another name"));
              return false;
            }
            if (!tplRes.ok) {
              onToast(t("Failed to save soul template"));
              return false;
            }
            await onReloadSouls();
            setSelectedSoulId(soulId);
            setSourceSoulId(soulId);
          }
        }

        const res = await fetch(
          apiUrl(`/api/v1/tutorbot/${selectedBot}/files/${activeFile}`),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: editor }),
          },
        );
        if (res.ok) {
          setFiles((prev) => ({ ...prev, [activeFile]: editor }));
          if (activeFile === "SOUL.md") {
            const personaRes = await fetch(
              apiUrl(`/api/v1/tutorbot/${selectedBot}`),
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ persona: editor }),
              },
            );
            if (!personaRes.ok) {
              onToast(t("SOUL.md saved, but persona sync failed"));
              return false;
            }
          }
          onToast(`${activeFile} saved`);
          return true;
        }
        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      selectedBot,
      activeFile,
      editor,
      onToast,
      onReloadSouls,
      sourceSoulTemplate,
      souls,
      t,
    ],
  );

  const handleSaveClick = useCallback(() => {
    if (activeFile !== "SOUL.md") {
      void saveFile("file_only");
      return;
    }
    setSaveMode(sourceSoulTemplate ? "update_template" : "file_only");
    setNewTemplateName(`${selectedBot || "custom"} soul`);
    setSaveModalOpen(true);
  }, [activeFile, saveFile, selectedBot, sourceSoulTemplate]);

  const handleConfirmSave = useCallback(async () => {
    const ok = await saveFile(saveMode, newTemplateName);
    if (ok) setSaveModalOpen(false);
  }, [newTemplateName, saveFile, saveMode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveClick();
      }
    },
    [handleSaveClick],
  );

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
        <div className="mb-3 rounded-xl bg-[var(--muted)] p-2.5 text-[var(--muted-foreground)]">
          <FileText size={18} />
        </div>
        <p className="text-[14px] font-medium text-[var(--foreground)]">
          {t("No bots to configure")}
        </p>
        <p className="mt-1.5 max-w-xs text-[13px] text-[var(--muted-foreground)]">
          {t("Create a bot first in the Bots tab.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bot selector */}
      <div className="flex items-center gap-3">
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
      </div>

      {/* File tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border)]/50 pb-2">
        {BOT_FILES.map((fn) => (
          <button
            key={fn}
            onClick={() => setActiveFile(fn)}
            className={`rounded-lg px-2.5 py-1 text-[12px] transition-colors ${
              activeFile === fn
                ? "bg-[var(--muted)] font-medium text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {fn.replace(".md", "")}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(["edit", "preview"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`rounded-lg px-3 py-1.5 text-[12px] transition-colors ${
                activeView === v
                  ? "bg-[var(--muted)] font-medium text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {v === "edit" ? t("Edit") : t("Preview")}
            </button>
          ))}
          {activeFile === "SOUL.md" && (
            <>
              <select
                value={selectedSoulId}
                onChange={(e) => handleSoulSelect(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--ring)]"
              >
                <option value="_custom">{t("Custom")}</option>
                {souls.map((soul) => (
                  <option key={soul.id} value={soul.id}>
                    {soul.name}
                  </option>
                ))}
              </select>
              {activeSoulTemplate && (
                <span className="text-[11px] text-[var(--muted-foreground)]/70">
                  {hasChanges
                    ? t('Editing template "{{name}}"', {
                        name: activeSoulTemplate.name,
                      })
                    : t('Using "{{name}}"', {
                        name: activeSoulTemplate.name,
                      })}
                </span>
              )}
              {!activeSoulTemplate && (
                <span className="text-[11px] text-[var(--muted-foreground)]/70">
                  {t("Custom soul")}
                </span>
              )}
            </>
          )}
        </div>
        <button
          onClick={handleSaveClick}
          disabled={saving || !hasChanges}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-40 ${
            hasChanges
              ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
              : "border border-[var(--border)]/50 text-[var(--muted-foreground)]"
          }`}
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          {t("Save")}
        </button>
      </div>

      {/* Editor / Preview */}
      {loadingFiles ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : activeView === "edit" ? (
        <div>
          <textarea
            value={editor}
            onChange={(e) => {
              const next = e.target.value;
              setEditor(next);
            }}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="min-h-[420px] w-full resize-none rounded-xl border border-[var(--border)] bg-transparent px-5 py-4 font-mono text-[13px] leading-7 text-[var(--foreground)] outline-none transition-colors focus:border-[var(--ring)] placeholder:text-[var(--muted-foreground)]/40"
            placeholder={t("Edit {{file}}...", { file: activeFile })}
          />
          <p className="mt-2 text-[11px] text-[var(--muted-foreground)]/40">
            {t("Cmd+S to save · Markdown supported")}
            {hasChanges && ` · ${t("Unsaved changes")}`}
          </p>
        </div>
      ) : editor.trim() ? (
        <div className="rounded-xl border border-[var(--border)] px-6 py-5">
          <MarkdownRenderer
            content={editor}
            variant="prose"
            className="text-[14px] leading-relaxed"
          />
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-center">
          <p className="text-[14px] font-medium text-[var(--foreground)]">
            {t("{{file}} is empty", { file: activeFile })}
          </p>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            {t("Switch to Edit to add content.")}
          </p>
        </div>
      )}
      {saveModalOpen && activeFile === "SOUL.md" && (
        <div className="fixed inset-0 z-dialog flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-xl">
            <h3 className="text-[15px] font-medium text-[var(--foreground)]">
              {t("Save SOUL.md")}
            </h3>
            <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
              {t(
                "Choose whether to only save this bot profile, overwrite the selected template, or save your edits as a new template.",
              )}
            </p>

            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 text-[12px] text-[var(--foreground)]">
                <input
                  type="radio"
                  name="save-mode"
                  checked={saveMode === "file_only"}
                  onChange={() => setSaveMode("file_only")}
                />
                {t("Save profile only")}
              </label>
              {sourceSoulTemplate && (
                <label className="flex items-center gap-2 text-[12px] text-[var(--foreground)]">
                  <input
                    type="radio"
                    name="save-mode"
                    checked={saveMode === "update_template"}
                    onChange={() => setSaveMode("update_template")}
                  />
                  {t('Save and overwrite template "{{name}}"', {
                    name: sourceSoulTemplate.name,
                  })}
                </label>
              )}
              <label className="flex items-center gap-2 text-[12px] text-[var(--foreground)]">
                <input
                  type="radio"
                  name="save-mode"
                  checked={saveMode === "new_template"}
                  onChange={() => setSaveMode("new_template")}
                />
                {t("Save and create new template")}
              </label>
            </div>

            {saveMode === "new_template" && (
              <div className="mt-4">
                <label className="mb-1 block text-[12px] font-medium text-[var(--muted-foreground)]">
                  {t("Template name")}
                </label>
                <input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder={t("e.g. IELTS Mentor")}
                  className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--ring)] placeholder:text-[var(--muted-foreground)]/40"
                />
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setSaveModalOpen(false)}
                disabled={saving}
                className="rounded-lg border border-[var(--border)]/50 px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-40"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={
                  saving ||
                  (saveMode === "new_template" && !newTemplateName.trim())
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                {saveMode === "update_template"
                  ? t("Save and overwrite")
                  : saveMode === "new_template"
                    ? t("Save and create")
                    : t("Save profile")}
              </button>
            </div>
          </div>
        </div>
      )}
      {replaceModalOpen && activeFile === "SOUL.md" && (
        <div className="fixed inset-0 z-dialog flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-xl">
            <h3 className="text-[15px] font-medium text-[var(--foreground)]">
              {t("Replace SOUL.md content?")}
            </h3>
            <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
              {t(
                "You have unsaved changes. Switching templates will replace the current editor content.",
              )}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setReplaceModalOpen(false);
                  setPendingSoulId(null);
                }}
                className="rounded-lg border border-[var(--border)]/50 px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={() => {
                  if (pendingSoulId) applySoulSelection(pendingSoulId);
                  setReplaceModalOpen(false);
                  setPendingSoulId(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
              >
                {t("Replace")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
