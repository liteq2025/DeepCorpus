import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Right-aligned action region (buttons, search, etc.) */
  actions?: ReactNode;
  /** Inline meta beside the title (count chip, status pill, ...). */
  meta?: ReactNode;
  className?: string;
}

/**
 * Standard page-level header. One canonical h1 size + weight per page;
 * routes that need something different should compose differently rather
 * than passing custom typography props.
 *
 * Adheres to globals.css §⑥ (text-2xl / font-semibold for the canonical
 * h1) and §⑦ (foreground for title, muted-foreground for description).
 * No border below the header — separation from PageBody is by spacing.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  meta,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`mb-6 flex items-start justify-between gap-4 ${className}`}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)]"
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              {title}
            </h1>
            {meta}
          </div>
          {description && (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
