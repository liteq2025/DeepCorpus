import type { ReactNode } from "react";

interface RouteFrameProps {
  children: ReactNode;
  className?: string;
}

/**
 * Layer 1+2+3+4 flex container for routes that compose:
 *
 *     <RouteFrame>
 *       <ListPane id="..." title="...">...</ListPane>
 *       <section aria-label="..." className="flex-1">...</section>
 *       <InspectorPanel id="..." title="...">...</InspectorPanel>
 *     </RouteFrame>
 *
 * Children render side-by-side via flex; ListPane and InspectorPanel
 * manage their own collapse/open state via LayoutContext. RouteFrame
 * itself has no visual chrome — pure layout primitive.
 *
 * Important — `<main>` semantics:
 *   The route-group layouts ((utility)/layout.tsx, (workspace)/layout.tsx)
 *   already provide the single `<main aria-label="...">` landmark per
 *   page. Routes that compose RouteFrame inside that layout MUST use
 *   `<section aria-label>` for the central area, not another `<main>` —
 *   nested `<main>` violates HTML semantics and breaks our smoke tests'
 *   `page.locator("main")` single-element assertion.
 */
export function RouteFrame({ children, className = "" }: RouteFrameProps) {
  return (
    <div className={`flex h-full overflow-hidden ${className}`}>{children}</div>
  );
}
