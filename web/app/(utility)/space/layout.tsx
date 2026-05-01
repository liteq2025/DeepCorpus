import { PageBody, RouteFrame } from "@/components/layout";
import SpaceMiniNav from "@/components/space/SpaceMiniNav";

export default function SpaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Phase 0.5.8: composes the layout primitives instead of inline flex.
  // The parent (utility) layout already provides the <main> landmark, so
  // the central area is a <section> per the RouteFrame convention.
  return (
    <RouteFrame>
      <SpaceMiniNav />
      <section
        aria-label="Space content"
        className="flex-1 overflow-y-auto [scrollbar-gutter:stable]"
      >
        <PageBody size="default">{children}</PageBody>
      </section>
    </RouteFrame>
  );
}
