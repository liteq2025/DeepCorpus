"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Default error boundary for any route under /(utility)/* that doesn't
 * provide its own. Phase 0.5.1.
 */
export default function UtilityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof console !== "undefined") {
      console.error("[utility] route error:", error);
    }
  }, [error]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertTriangle
        className="h-8 w-8 text-[var(--destructive)]"
        aria-hidden="true"
      />
      <div>
        <p className="text-[14px] font-medium text-[var(--foreground)]">
          Something went wrong
        </p>
        <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
          {error.message || "An unexpected error occurred."}
        </p>
      </div>
      <Button onClick={reset} variant="outline" size="sm">
        Try again
      </Button>
    </div>
  );
}
