import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Right-of-description CTA (a single Button is the typical case). */
  action?: ReactNode;
  className?: string;
}

/**
 * Canonical empty-state pattern. Centred icon (optional) + title +
 * description + action. Used by ListPane, KbDocumentList, BookLibrary,
 * etc. when there's nothing to show.
 *
 * No border, no shadow — sits inline with the surrounding surface and
 * leans on spacing. Adheres to globals.css §⑤ (simplicity > decoration).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}
    >
      {Icon && (
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--muted)] text-[var(--muted-foreground)]"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h3 className="text-base font-medium text-[var(--foreground)]">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-[var(--muted-foreground)]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
