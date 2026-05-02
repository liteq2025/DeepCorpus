"use client";

import { useEffect, useState } from "react";
import { ChevronRight, X } from "lucide-react";

export interface OnboardingStep {
  /** querySelector for the highlighted element. */
  target: string;
  title: string;
  description: string;
  /**
   * Optional callback fired before the step renders — typically a state
   * setter that brings the target into the DOM (switch route, expand
   * pane, select tab). Runs synchronously; the overlay defers measure
   * by one tick so React state can flush first.
   */
  prepare?: () => void;
  /**
   * Tooltip placement relative to the highlighted target. "auto" (default)
   * picks bottom unless the target sits in the lower half of the viewport.
   */
  placement?: "auto" | "top" | "bottom";
}

interface OnboardingProps {
  steps: OnboardingStep[];
  /** -1 / out-of-range hides the overlay. */
  stepIndex: number;
  onAdvance: () => void;
  onSkip: () => void;
  labels?: { next?: string; done?: string; skip?: string };
}

/**
 * Generic onboarding spotlight. Cuts a rounded hole around the current
 * step's target (via 9999px outer box-shadow) and parks a tooltip
 * above/below it. Re-measures on resize / scroll so layout shifts don't
 * leave the spotlight orphaned.
 *
 * Decoupled from any specific feature's data — pass any `OnboardingStep[]`
 * to drive it. Originally extracted from /settings; reusable for other
 * user-path tours (e.g. /chat first-run, /book reading flow).
 */
export function Onboarding({
  steps,
  stepIndex,
  onAdvance,
  onSkip,
  labels = {},
}: OnboardingProps) {
  const step = steps[stepIndex];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({
    w: typeof window === "undefined" ? 1280 : window.innerWidth,
    h: typeof window === "undefined" ? 720 : window.innerHeight,
  });

  useEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }
    step.prepare?.();
    let el: Element | null = null;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      el = document.querySelector(step.target);
      if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      setRect(el.getBoundingClientRect());
    };

    // Defer one tick so prepare()'s setState lands and the DOM updates.
    const timer = window.setTimeout(measure, 50);

    const onShift = () => {
      if (el) setRect(el.getBoundingClientRect());
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener("resize", onShift);
    window.addEventListener("scroll", onShift, true);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", onShift);
      window.removeEventListener("scroll", onShift, true);
    };
  }, [step]);

  if (!step || !rect) return null;

  const pad = 8;
  const holeTop = rect.top - pad;
  const holeLeft = rect.left - pad;
  const holeW = rect.width + pad * 2;
  const holeH = rect.height + pad * 2;

  const tooltipW = 320;
  const tooltipH = 140;
  const placement =
    step.placement === "top" || step.placement === "bottom"
      ? step.placement
      : holeTop + holeH + tooltipH + 24 < viewport.h
        ? "bottom"
        : "top";

  const tooltipTop =
    placement === "bottom" ? holeTop + holeH + 12 : holeTop - tooltipH - 12;
  const tooltipLeft = Math.max(
    16,
    Math.min(holeLeft, viewport.w - tooltipW - 16),
  );

  const isLast = stepIndex >= steps.length - 1;

  return (
    <div className="fixed inset-0 z-toast">
      <div
        className="pointer-events-none absolute rounded-lg transition-all duration-200"
        style={{
          top: holeTop,
          left: holeLeft,
          width: holeW,
          height: holeH,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
        }}
      />
      <div
        className="absolute z-10 w-[320px] rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="text-[13px] font-semibold text-[var(--foreground)]">
            {step.title}
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="-mt-0.5 -mr-1 rounded p-0.5 text-[var(--muted-foreground)]/60 transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label={labels.skip ?? "Skip"}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mb-4 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
          {step.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--muted-foreground)]/60">
            {stepIndex + 1} / {steps.length}
          </span>
          <button
            type="button"
            onClick={onAdvance}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--foreground)] px-3 py-1.5 text-[12px] font-medium text-[var(--background)] transition-opacity hover:opacity-80"
          >
            {isLast ? (labels.done ?? "Got it") : (labels.next ?? "Next")}
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
