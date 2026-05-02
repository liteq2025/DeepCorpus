"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  KnowledgeUploadPolicy,
  RagProviderSummary,
} from "@/lib/knowledge-api";
import { validateFiles } from "@/lib/knowledge-helpers";
import FileDropZone from "./FileDropZone";

interface CreateKbModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: RagProviderSummary[];
  uploadPolicy: KnowledgeUploadPolicy;
  onCreate: (params: {
    name: string;
    provider: string;
    files: File[];
  }) => Promise<void>;
}

/**
 * Phase 0.5.6: migrated from `<Modal>` to `<Sheet>` per the sheet-first
 * overlay rule (overlay-rules.md §0). The component name keeps `Modal`
 * for now because callers reference it by file path; the underlying UI
 * is a right-side sheet.
 */
export default function CreateKbModal({
  isOpen,
  onClose,
  providers,
  uploadPolicy,
  onCreate,
}: CreateKbModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("llamaindex");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setFiles([]);
      setError(null);
      setProvider(providers[0]?.id || "llamaindex");
    }
  }, [isOpen, providers]);

  const selection = validateFiles(files, uploadPolicy, t);
  const trimmed = name.trim();
  const canSubmit =
    !submitting &&
    trimmed.length > 0 &&
    selection.validFiles.length > 0 &&
    selection.invalidFiles.length === 0;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        name: trimmed,
        provider,
        files: selection.validFiles,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(next) => {
        if (!next && !submitting) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-[var(--border)] pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("Create knowledge base")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("Create a new knowledge base and upload its initial documents.")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              {t("Knowledge base name")}
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              disabled={submitting}
              placeholder={t("e.g. project-papers")}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--foreground)]/25 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              {t("RAG provider")}
            </label>
            <Select
              value={provider}
              onValueChange={setProvider}
              disabled={submitting}
            >
              <SelectTrigger className="w-full text-[13px]">
                <SelectValue placeholder={t("Select provider")} />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              {t("Initial documents")}
            </label>
            <FileDropZone
              files={files}
              onChange={setFiles}
              uploadPolicy={uploadPolicy}
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                {error}
              </pre>
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-[var(--border)] pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            {t("Cancel")}
          </Button>
          <Button
            size="sm"
            onClick={() => void handleCreate()}
            disabled={!canSubmit}
            icon={
              submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus size={14} />
              )
            }
          >
            {t("Create")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
