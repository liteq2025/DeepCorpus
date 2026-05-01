"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { SidebarShell } from "@/components/sidebar/SidebarShell";
import { useSessionList } from "@/components/sidebar/useSessionList";
import { useAppShell } from "@/context/AppShellContext";
import { useConfirm } from "@/components/layout";
import { deleteSession } from "@/lib/session-api";

export default function UtilitySidebar() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const router = useRouter();
  const { activeSessionId, setActiveSessionId } = useAppShell();
  const { sessions, loading, rename, removeFromList } = useSessionList();

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    router.push("/chat");
  }, [router, setActiveSessionId]);

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      setActiveSessionId(sessionId);
      router.push(`/chat/${sessionId}`);
    },
    [router, setActiveSessionId],
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
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    },
    [activeSessionId, confirm, removeFromList, setActiveSessionId, t],
  );

  return (
    <SidebarShell
      showSessions
      sessions={sessions}
      activeSessionId={activeSessionId}
      loadingSessions={loading}
      onNewChat={handleNewChat}
      onSelectSession={handleSelectSession}
      onRenameSession={rename}
      onDeleteSession={handleDeleteSession}
    />
  );
}
