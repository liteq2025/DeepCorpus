"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { useLayout } from "./LayoutContext";

interface InspectorPanelProps {
  /** Stable id used for open-state persistence in LayoutContext. */
  id: string;
  /** Used as both visual title and `aria-label` on the <aside>. */
  title: string;
  children: ReactNode;
  /** External control override — when defined, ignores LayoutContext. */
  open?: boolean;
  /** Force-mount the panel only when this is truthy (e.g. has citations). */
  mountWhen?: boolean;
  /** Called when the close button is clicked. Defaults to closing via context. */
  onClose?: () => void;
  /** Pixel width when open. */
  width?: number;
  /** Right-aligned header actions (settings, refresh, ...). */
  headerActions?: ReactNode;
  className?: string;
}

/**
 * Layer 4 — right-side property / inspector / tools panel. Optional; only
 * visible when:
 *   1. `mountWhen` is undefined OR truthy, AND
 *   2. context says open (or the `open` prop is set).
 *
 * Visual conventions:
 *   - bg-[var(--card)] — one tick lighter than main canvas
 *   - no border on the outer aside (rule ②) — separation from main is by
 *     background step
 *   - close button in header
 *
 * STATUS (2026-05-02): no consumers. Designed for /chat citations panel
 * but the chat ref UI ended up using a Sheet instead. Kept in-tree as
 * the canonical Layer 4 primitive — if a real Layer 4 use case appears
 * (e.g. a /book reading-companion notes pane), this is the shape to
 * use; if none materializes by 2026-Q3, delete + collapse the 9-layer
 * stack to 8. See docs/refactor/phase-0.5-layout.md §6 sunset note.
 */
export function InspectorPanel({
  id,
  title,
  children,
  open: openProp,
  mountWhen = true,
  onClose,
  width = 400,
  headerActions,
  className = "",
}: InspectorPanelProps) {
  const { inspectors, setInspectorOpen } = useLayout();
  const open = openProp ?? inspectors[id] ?? false;

  if (!mountWhen || !open) return null;

  const handleClose = onClose ?? (() => setInspectorOpen(id, false));

  return (
    <aside
      aria-label={title}
      className={`flex shrink-0 flex-col overflow-hidden bg-[var(--card)] ${className}`}
      style={{ width }}
    >
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <span className="truncate text-sm font-medium text-[var(--foreground)]">
          {title}
        </span>
        {headerActions && (
          <div className="flex items-center gap-1">{headerActions}</div>
        )}
        <button
          type="button"
          onClick={handleClose}
          className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          aria-label={`Close ${title}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </aside>
  );
}
