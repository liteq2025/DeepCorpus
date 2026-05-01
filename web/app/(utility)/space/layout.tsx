import SpaceMiniNav from "@/components/space/SpaceMiniNav";

export default function SpaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The parent (utility) layout already provides the <main> landmark.
  // This nested layout uses a <section> instead so we don't violate the
  // single-<main>-per-document rule. Phase 0.5.1.
  return (
    <div className="flex h-full overflow-hidden">
      <SpaceMiniNav />
      <section
        aria-label="Workspace section"
        className="flex-1 overflow-y-auto [scrollbar-gutter:stable]"
      >
        <div className="mx-auto max-w-5xl px-8 py-8 pb-12">{children}</div>
      </section>
    </div>
  );
}
