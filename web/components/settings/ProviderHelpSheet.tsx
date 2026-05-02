/* eslint-disable i18n/no-literal-ui-text */
"use client";

import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type KeyRequirement = "required" | "optional" | "none";

export interface ProviderEntry {
  /** Display name (kept Latin, e.g. Brave / OpenAI / Tavily). */
  name: string;
  keyRequired: KeyRequirement;
  /** Register / docs link rendered as the per-card CTA. */
  registerUrl?: string;
  pricing: string;
  /** One-paragraph 中文 explanation: what the field expects + tradeoff. */
  notes: string;
  /** Optional badge, e.g. "推荐" / "国内可直连". */
  badge?: string;
}

export function KeyChip({ status }: { status: KeyRequirement }) {
  if (status === "required") {
    return (
      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
        必填
      </span>
    );
  }
  if (status === "optional") {
    return (
      <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">
        可选
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
      不需
    </span>
  );
}

interface ProviderHelpSheetProps {
  /** Tooltip on the "?" trigger button. */
  triggerTitle: string;
  /** Sheet header title. */
  sheetTitle: string;
  /** Sheet header description (one or two lines). */
  sheetIntro: string;
  /** Per-provider rows for the 速查 table + detail cards. */
  providers: ProviderEntry[];
  /** Render-prop for the bottom section: proxy callouts, post-config steps, FAQ — anything service-specific. */
  body?: ReactNode;
}

/**
 * Shared "?" sheet for service config help. SearchProviderHelp /
 * LlmProviderHelp / EmbeddingProviderHelp all compose this with their
 * own provider data + service-specific body.
 *
 * The header trigger is a small icon button placed inline beside the
 * service-section h2; the sheet itself is `size="third"` (1/3 of viewport)
 * so it sits as a companion column rather than overlaying the main work area.
 */
export function ProviderHelpSheet({
  triggerTitle,
  sheetTitle,
  sheetIntro,
  providers,
  body,
}: ProviderHelpSheetProps) {
  const { t: _ } = useTranslation();
  // (translation hook reserved — current copy is hardcoded zh in line with
  // the rest of the help authoring layer; kept here so future i18n migration
  // doesn't require importing it later.)
  void _;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          title={triggerTitle}
          aria-label={triggerTitle}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        </button>
      </SheetTrigger>
      <SheetContent side="right" size="third" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{sheetTitle}</SheetTitle>
          <SheetDescription>{sheetIntro}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-8 text-[13px] leading-relaxed">
          {/* 速查表 */}
          <section className="mb-6">
            <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">
              速查
            </h3>
            <div className="overflow-hidden rounded-lg border border-[var(--border)]">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--muted)]/40 text-left text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Provider</th>
                    <th className="px-3 py-2 font-medium">Key</th>
                    <th className="px-3 py-2 font-medium">价格起点</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr
                      key={p.name}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                        <span className="inline-flex items-center gap-1.5">
                          {p.name}
                          {p.badge && (
                            <span className="rounded-full bg-[var(--primary)]/12 px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]">
                              {p.badge}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <KeyChip status={p.keyRequired} />
                      </td>
                      <td className="px-3 py-2 text-[var(--muted-foreground)]">
                        {p.pricing}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 逐项说明 */}
          <section className="mb-6 space-y-3">
            <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
              逐项说明
            </h3>
            {providers.map((p) => (
              <div
                key={p.name}
                className="rounded-lg border border-[var(--border)] p-3"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[var(--foreground)]">
                    {p.name}
                  </span>
                  <KeyChip status={p.keyRequired} />
                  {p.badge && (
                    <span className="rounded-full bg-[var(--primary)]/12 px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]">
                      {p.badge}
                    </span>
                  )}
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    · {p.pricing}
                  </span>
                </div>
                <p className="mb-1.5 text-[12px] text-[var(--muted-foreground)]">
                  {p.notes}
                </p>
                {p.registerUrl && (
                  <a
                    href={p.registerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-[var(--primary)] hover:underline"
                  >
                    {p.keyRequired === "none" ? "部署文档 →" : "申请 API key →"}
                  </a>
                )}
              </div>
            ))}
          </section>

          {body}
        </div>
      </SheetContent>
    </Sheet>
  );
}
