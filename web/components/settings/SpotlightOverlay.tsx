"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TOUR_GUIDE_STEPS } from "@/lib/settings-helpers";

interface SpotlightOverlayProps {
  stepIndex: number;
  onNext: () => void;
  onSkip: () => void;
}

/**
 * Onboarding tour overlay. Cuts a hole around the current step's target
 * (selected via `data-tour="..."` attributes on the page) and parks a
 * tooltip below it. Step list is in lib/settings-helpers TOUR_GUIDE_STEPS.
 */
export function SpotlightOverlay({
  stepIndex,
  onNext,
  onSkip,
}: SpotlightOverlayProps) {
  const { t } = useTranslation();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const guideStep = TOUR_GUIDE_STEPS[stepIndex];

  useEffect(() => {
    if (!guideStep) return;
    const el = document.querySelector(`[data-tour="${guideStep.target}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect(r);
    }
  }, [guideStep]);

  if (!guideStep || !rect) return null;

  const pad = 8;
  const holeLeft = rect.left - pad;
  const holeTop = rect.top - pad;
  const holeW = rect.width + pad * 2;
  const holeH = rect.height + pad * 2;

  const clipPath = `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
    ${holeLeft}px ${holeTop}px,
    ${holeLeft}px ${holeTop + holeH}px,
    ${holeLeft + holeW}px ${holeTop + holeH}px,
    ${holeLeft + holeW}px ${holeTop}px,
    ${holeLeft}px ${holeTop}px
  )`;

  const tooltipTop = holeTop + holeH + 12;
  const tooltipLeft = Math.max(16, Math.min(holeLeft, window.innerWidth - 340));

  return (
    <div className="fixed inset-0 z-toast">
      <div
        className="absolute inset-0 bg-black/50 transition-all duration-300"
        style={{ clipPath }}
      />
      <div
        className="absolute z-10 w-[320px] rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div className="mb-1 text-[13px] font-semibold text-[var(--foreground)]">
          {t(guideStep.titleKey)}
        </div>
        <p className="mb-4 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
          {t(guideStep.descKey)}
        </p>
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-[12px] text-[var(--muted-foreground)]/60 transition-colors hover:text-[var(--muted-foreground)]"
          >
            {t("Skip tour")}
          </button>
          <button
            onClick={onNext}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--foreground)] px-3 py-1.5 text-[12px] font-medium text-[var(--background)] transition-opacity hover:opacity-80"
          >
            {stepIndex < TOUR_GUIDE_STEPS.length - 1 ? t("Next") : t("Got it")}
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
