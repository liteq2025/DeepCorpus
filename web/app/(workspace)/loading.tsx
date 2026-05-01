import { Loader2 } from "lucide-react";

/**
 * Default loading state for /(workspace)/*. Phase 0.5.1.
 */
export default function WorkspaceLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center text-[13px] text-[var(--muted-foreground)]">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      <span>Loading…</span>
    </div>
  );
}
