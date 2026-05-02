"use client";

import type { ReactNode } from "react";

interface ToolbarIconBtnProps {
  title: string;
  onClick: () => void;
  children: ReactNode;
}

/**
 * Compact toolbar icon button used by the co-writer editor toolbar
 * (bold / italic / heading / list / etc.). Hover-revealed muted-bg.
 */
export function ToolbarIconBtn({
  title,
  onClick,
  children,
}: ToolbarIconBtnProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
    >
      {children}
    </button>
  );
}
