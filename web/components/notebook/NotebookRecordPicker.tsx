"use client";

import { useEffect } from "react";
import { Layers } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import NotebookSelector from "@/components/notebook/NotebookSelector";
import { useNotebookSelection } from "@/components/notebook/useNotebookSelection";
import type { SelectedRecord } from "@/lib/notebook-selection-types";

interface NotebookRecordPickerProps {
  open: boolean;
  onClose: () => void;
  onApply: (records: SelectedRecord[]) => void;
  actionLabel?: string;
}

/**
 * Phase 0.5.6: migrated from `<div fixed inset-0>` modal to `<Sheet>`.
 * Sheet from the right with sm:max-w-3xl — wide enough for the
 * two-column notebook + record selector inside.
 */
export default function NotebookRecordPicker({
  open,
  onClose,
  onApply,
  actionLabel = "Use Selected Records ({n})",
}: NotebookRecordPickerProps) {
  const { t } = useTranslation();
  const {
    notebooks,
    expandedNotebooks,
    notebookRecordsMap,
    selectedRecords,
    loadingNotebooks,
    loadingRecordsFor,
    fetchNotebooks,
    toggleNotebookExpanded,
    toggleRecordSelection,
    selectAllFromNotebook,
    deselectAllFromNotebook,
    clearAllSelections,
  } = useNotebookSelection();

  useEffect(() => {
    if (!open) return;
    void fetchNotebooks();
  }, [fetchNotebooks, open]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-3xl"
      >
        <SheetHeader className="border-b border-[var(--border)] pb-4">
          <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
            <Layers className="h-3 w-3" aria-hidden="true" />
            {t("Notebook Reference")}
          </div>
          <SheetTitle className="text-lg">
            {t("Select Notebook Records")}
          </SheetTitle>
          <SheetDescription>
            {t(
              "Choose records across one or more notebooks to ground the next request.",
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-5">
          <NotebookSelector
            notebooks={notebooks}
            expandedNotebooks={expandedNotebooks}
            notebookRecordsMap={notebookRecordsMap}
            selectedRecords={selectedRecords}
            loadingNotebooks={loadingNotebooks}
            loadingRecordsFor={loadingRecordsFor}
            isLoading={false}
            onToggleExpanded={toggleNotebookExpanded}
            onToggleRecord={toggleRecordSelection}
            onSelectAll={selectAllFromNotebook}
            onDeselectAll={deselectAllFromNotebook}
            onClearAll={clearAllSelections}
            onCreateSession={() => {
              onApply(Array.from(selectedRecords.values()) as SelectedRecord[]);
              onClose();
            }}
            actionLabel={actionLabel}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
