"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { SidebarShell } from "@/components/sidebar/SidebarShell";
import { useSessionList } from "@/components/sidebar/useSessionList";
import { useUnifiedChat } from "@/context/UnifiedChatContext";
import { useConfirm } from "@/components/layout";
import { deleteSession } from "@/lib/session-api";

export default function WorkspaceSidebar() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const router = useRouter();
  const {
    newSession,
    selectedSessionId,
    sessionStatuses,
    sidebarRefreshToken,
  } = useUnifiedChat();
  const { sessions, loading, rename, removeFromList } =
    useSessionList(sidebarRefreshToken);

  const orderedSessions = useMemo(
    () =>
      sessions
        .map((session, index) => {
          const runtime = sessionStatuses[session.session_id];
          return {
            index,
            session: runtime
              ? {
                  ...session,
                  status: runtime.status,
                  active_turn_id: runtime.activeTurnId || session.active_turn_id,
                }
              : session,
          };
        })
        .sort((a, b) => {
          const aPriority = a.session.status === "running" ? 0 : 1;
          const bPriority = b.session.status === "running" ? 0 : 1;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return a.index - b.index;
        })
        .map(({ session }) => session),
    [sessions, sessionStatuses],
  );

  const handleNewChat = () => {
    newSession();
    router.push("/chat");
  };

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      router.push(`/chat/${sessionId}`);
    },
    [router],
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (
        !(await confirm({
          title: t("Delete this chat history?"),
          destructive: true,
        }))
      )
        return;
      await deleteSession(sessionId);
      removeFromList(sessionId);
      if (selectedSessionId === sessionId) {
        newSession();
        router.push("/chat");
      }
    },
    [confirm, newSession, removeFromList, router, selectedSessionId, t],
  );

  return (
    <SidebarShell
      showSessions
      sessions={orderedSessions}
      activeSessionId={selectedSessionId}
      loadingSessions={loading}
      onNewChat={handleNewChat}
      onSelectSession={handleSelectSession}
      onRenameSession={rename}
      onDeleteSession={handleDeleteSession}
    />
  );
}
