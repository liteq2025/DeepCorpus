import type { ReactNode } from "react";

const SIZE_MAX_W = {
  /** ~672 px reading-priority (settings forms, single-column docs). */
  narrow: "max-w-2xl",
  /** ~1024 px most pages (default). */
  default: "max-w-5xl",
  /** ~1280 px data-heavy (knowledge, agents). */
  wide: "max-w-7xl",
  /** edge-to-edge (chat, book reader). */
  full: "max-w-none",
} as const;

interface PageBodyProps {
  children: ReactNode;
  /** Container max-width. Three named tiers + edge-to-edge. */
  size?: keyof typeof SIZE_MAX_W;
  /** Override default px-6 py-6 padding when needed. */
  className?: string;
}

/**
 * Standard page-content container. Centers content + applies one of four
 * canonical max-widths. Routes should consume PageHeader + PageBody
 * together for consistent rhythm.
 *
 * Why three named tiers (instead of arbitrary `max-w-[Npx]`): the previous
 * codebase had four max-widths in three places (max-w-[960px], max-w-5xl,
 * max-w-[720px], max-w-7xl). Pinning to `narrow|default|wide|full`
 * eliminates ad-hoc sizes and makes redesigns predictable.
 */
export function PageBody({
  children,
  size = "default",
  className = "",
}: PageBodyProps) {
  return (
    <div className={`mx-auto px-6 py-6 ${SIZE_MAX_W[size]} ${className}`}>
      {children}
    </div>
  );
}
