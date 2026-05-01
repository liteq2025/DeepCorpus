import UtilitySidebar from "@/components/sidebar/UtilitySidebar";

export default function UtilityLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // <body> already paints --background, so a layout-level bg-[var(--background)]
  // is redundant. Keep the <main> landmark labelled so screen readers can
  // distinguish it from the sidebar <aside>. Phase 0.5.1.
  return (
    <div className="flex h-screen overflow-hidden">
      <UtilitySidebar />
      <main aria-label="Utility workspace" className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
