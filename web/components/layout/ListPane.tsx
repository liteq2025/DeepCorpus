"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { useLayout } from "./LayoutContext";

interface ListPaneProps {
  /** Stable id used for collapse-state persistence in LayoutContext. */
  id: string;
  /** Used as both visual title and `aria-label` on the <aside>. */
  title: string;
  children: ReactNode;
  /**
   * Optional render slot used when the pane is collapsed. When provided,
   * the icon-strip stays visible (e.g. KB dots / item icons) so the user
   * keeps quick access. When omitted, the pane simply hides content.
   * Pilot-derived (Phase 0.5.5) — knowledge route needs an icon strip.
   */
  collapsedContent?: ReactNode;
  /** Initial collapsed state if there's no persisted value yet. */
  defaultCollapsed?: boolean;
  /** Pixel widths for the two states; defaults match the responsive matrix. */
  width?: number;
  collapsedWidth?: number;
  /** Right-aligned actions in the header (e.g. New / Search). */
  headerActions?: ReactNode;
  className?: string;
}

/**
 * Layer 2 — the "second column" pattern. Holds a list (sessions, KBs,
 * pages, etc.) next to the main work area.
 *
 * Visual conventions:
 *   - bg-[var(--card)] — one tick lighter than main canvas
 *   - no border (rule ②); separation from main is by background step
 *   - chevron toggles collapse, persisted in LayoutContext
 *   - aria-label drives accessibility
 */
export function ListPane({
  id,
  title,
  children,
  collapsedContent,
  defaultCollapsed = false,
  width = 240,
  collapsedWidth = 48,
  headerActions,
  className = "",
}: ListPaneProps) {
  const { listPanes, setListPaneCollapsed } = useLayout();
  const collapsed = listPanes[id] ?? defaultCollapsed;

  return (
    <aside
      aria-label={title}
      className={`flex shrink-0 flex-col overflow-hidden bg-[var(--card)] transition-[width] duration-200 ${className}`}
      style={{ width: collapsed ? collapsedWidth : width }}
    >
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        {!collapsed && (
          <span className="truncate text-sm font-medium text-[var(--foreground)]">
            {title}
          </span>
        )}
        {!collapsed && headerActions && (
          <div className="ml-auto flex items-center gap-1">{headerActions}</div>
        )}
        <button
          type="button"
          onClick={() => setListPaneCollapsed(id, !collapsed)}
          className={`inline-flex h-6 w-6 items-center justify-center rounded text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] ${
            collapsed ? "mx-auto" : !headerActions ? "ml-auto" : ""
          }`}
          aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
      {collapsed
        ? collapsedContent && (
            <div className="flex-1 overflow-y-auto">{collapsedContent}</div>
          )
        : (
            <div className="flex-1 overflow-y-auto px-2 pb-4">{children}</div>
          )}
    </aside>
  );
}
