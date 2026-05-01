/**
 * Layout primitives — see docs/refactor/phase-0.5-layout.md for the
 * 9-layer stack design and the composition pattern.
 *
 *   <RouteFrame>
 *     <ListPane id="..." title="...">...</ListPane>
 *     <main aria-label="...">
 *       <PageHeader title="..." />
 *       <PageBody size="default | wide | narrow | full">...</PageBody>
 *     </main>
 *     <InspectorPanel id="..." title="..." mountWhen={...}>...</InspectorPanel>
 *   </RouteFrame>
 */
export {
  LayoutProvider,
  useLayout,
  type LayoutState,
  type Breakpoint,
} from "./LayoutContext";
export { PageHeader } from "./PageHeader";
export { PageBody } from "./PageBody";
export { EmptyState } from "./EmptyState";
export { RouteFrame } from "./RouteFrame";
export { ListPane } from "./ListPane";
export { InspectorPanel } from "./InspectorPanel";
