"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import MarkdownRenderer from "@/components/common/MarkdownRenderer";
import type { CapabilityExecResult } from "@/lib/playground-helpers";

interface CapabilityResultPanelProps {
  result: CapabilityExecResult | null | undefined;
}

/**
 * Renders the success/failure status, elapsed time, primary response (as
 * markdown), and any extra metadata for a capability execution result.
 */
export function CapabilityResultPanel({ result }: CapabilityResultPanelProps) {
  const { t } = useTranslation();
  if (!result) return null;

  const response =
    typeof result.data.response === "string" ? result.data.response : "";
  const extraData = Object.fromEntries(
    Object.entries(result.data).filter(([key]) => key !== "response"),
  );
  const extraKeys = Object.keys(extraData);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {result.success ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
            <Check size={10} /> {t("Success")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <X size={10} /> {t("Failed")}
          </span>
        )}
        {typeof result.elapsedMs === "number" && (
          <span className="text-[11px] text-[var(--muted-foreground)]">
            {result.elapsedMs} ms
          </span>
        )}
      </div>

      {response && (
        <div className="max-h-[400px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
          <MarkdownRenderer content={response} variant="prose" />
        </div>
      )}

      {!response && extraKeys.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
          <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[12px] text-[var(--muted-foreground)]">
            {JSON.stringify(extraData, null, 2)}
          </pre>
        </div>
      )}

      {extraKeys.length > 0 && response && (
        <details className="group rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[13px] font-medium text-[var(--foreground)]">
            {t("Metadata")}
            <ChevronDown
              size={13}
              className="text-[var(--muted-foreground)] transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="border-t border-[var(--border)] px-3 py-2.5">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[12px] text-[var(--muted-foreground)]">
              {JSON.stringify(extraData, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}
