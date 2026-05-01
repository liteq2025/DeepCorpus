"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listSessions,
  updateSessionTitle,
  type SessionSummary,
} from "@/lib/session-api";

/**
 * Shared session-list state for the sidebar variants.
 *
 * UtilitySidebar and WorkspaceSidebar previously each owned identical
 * copies of:
 *   - sessions / loadingSessions / hasLoaded ref
 *   - refresh callback (force-fresh `listSessions(50, 0)`)
 *   - rename callback (server PATCH + local merge)
 *   - delete-from-local helper
 *
 * Consolidating here keeps the variant wrappers focused on what's
 * genuinely variant-specific: the data source for `activeSessionId`
 * (AppShellContext vs UnifiedChatContext), the new-chat hook, and
 * the post-delete cleanup. The session list itself is uniform.
 *
 * Why a hook and not a single AppSidebar component: the workspace
 * variant pulls UnifiedChatContext, which only exists inside the
 * (workspace) route group. A single component would have to call
 * both contexts unconditionally — which violates Rules of Hooks
 * and forces lifting UnifiedChatProvider into utility routes,
 * breaking the route-group separation. See
 * docs/refactor/phase-0.5-layout.md §7 risk note 1, plan A.
 */
export function useSessionList(refreshTrigger?: unknown) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setLoading(true);
    }
    try {
      setSessions(await listSessions(50, 0, { force: true }));
      hasLoadedRef.current = true;
    } catch (error) {
      console.error("Failed to load sessions", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshTrigger]);

  const rename = useCallback(async (sessionId: string, title: string) => {
    const updated = await updateSessionTitle(sessionId, title);
    setSessions((prev) =>
      prev.map((session) =>
        session.session_id === sessionId
          ? {
              ...session,
              title: updated.title,
              updated_at: updated.updated_at,
            }
          : session,
      ),
    );
  }, []);

  const removeFromList = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.filter((session) => session.session_id !== sessionId),
    );
  }, []);

  return {
    sessions,
    loading,
    refresh,
    rename,
    removeFromList,
    setSessions,
  };
}
