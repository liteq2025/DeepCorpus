import WorkspaceSidebar from "@/components/sidebar/WorkspaceSidebar";
import { UnifiedChatProvider } from "@/context/UnifiedChatContext";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <UnifiedChatProvider>
      <div className="flex h-screen overflow-hidden">
        <WorkspaceSidebar />
        <main aria-label="Workspace" className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </UnifiedChatProvider>
  );
}
