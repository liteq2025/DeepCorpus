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
 *       <main aria-label="...">...</main>
 *       <InspectorPanel id="..." title="...">...</InspectorPanel>
 *     </RouteFrame>
 *
 * Children are rendered side-by-side via flex; ListPane and
 * InspectorPanel manage their own collapse/open state via LayoutContext.
 * RouteFrame itself has no visual chrome — it's a pure layout primitive.
 *
 * Routes that need a different shape (book/* with its own internal flex)
 * are not required to use RouteFrame, but the standard composition
 * inherits all the layered semantics (single <main>, aria-label asides,
 * canonical lightness ladder).
 */
export function RouteFrame({ children, className = "" }: RouteFrameProps) {
  return (
    <div className={`flex h-full overflow-hidden ${className}`}>{children}</div>
  );
}
