"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Layout state shared across the page chrome (sidebar + secondary list +
 * inspector). Each panel is addressed by a stable `id` so multiple panels
 * can coexist without colliding (e.g. /chat with a sessions ListPane and
 * a citations InspectorPanel).
 *
 * Persistence: collapse / open state writes to localStorage under the
 * `LAYOUT_STORAGE_KEY` so panel preferences survive reloads. Hydration is
 * SSR-safe — initial render uses defaults, then a useEffect reads
 * localStorage. There's a brief reflow on hydration if the persisted
 * state differs from the default; that's acceptable for a layout panel.
 *
 * Breakpoint: classifies viewport width into four buckets matching the
 * responsive matrix in docs/refactor/phase-0.5-layout.md §6. Components
 * that need to fall back to a Sheet on mobile read `breakpoint === "mobile"`.
 */
export type Breakpoint = "mobile" | "tablet" | "desktop" | "wide";

export interface LayoutState {
  /** Primary AppSidebar (Layer 1) collapsed state. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  /** Secondary ListPane (Layer 2) collapsed state, keyed by id. */
  listPanes: Record<string, boolean>;
  setListPaneCollapsed: (id: string, collapsed: boolean) => void;

  /** InspectorPanel (Layer 4) open state, keyed by id. */
  inspectors: Record<string, boolean>;
  setInspectorOpen: (id: string, open: boolean) => void;

  breakpoint: Breakpoint;
}

const LayoutContext = createContext<LayoutState | null>(null);

const LAYOUT_STORAGE_KEY = "dc.layout.v1";

interface PersistedLayout {
  sidebarCollapsed?: boolean;
  listPanes?: Record<string, boolean>;
  inspectors?: Record<string, boolean>;
}

function readPersisted(): PersistedLayout {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as PersistedLayout;
  } catch {
    return {};
  }
}

function classifyViewport(width: number): Breakpoint {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  if (width < 1280) return "desktop";
  return "wide";
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [listPanes, setListPanes] = useState<Record<string, boolean>>({});
  const [inspectors, setInspectors] = useState<Record<string, boolean>>({});
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    const persisted = readPersisted();
    if (typeof persisted.sidebarCollapsed === "boolean") {
      setSidebarCollapsed(persisted.sidebarCollapsed);
    }
    if (persisted.listPanes && typeof persisted.listPanes === "object") {
      setListPanes(persisted.listPanes);
    }
    if (persisted.inspectors && typeof persisted.inspectors === "object") {
      setInspectors(persisted.inspectors);
    }
    setHydrated(true);
  }, []);

  // Persist on change (skip the first run before hydration).
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      const payload: PersistedLayout = {
        sidebarCollapsed,
        listPanes,
        inspectors,
      };
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage may be disabled or quota exceeded; we silently drop.
    }
  }, [hydrated, sidebarCollapsed, listPanes, inspectors]);

  // Track viewport breakpoint via resize.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setBreakpoint(classifyViewport(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const toggleSidebar = useCallback(
    () => setSidebarCollapsed((v) => !v),
    [],
  );

  const setListPaneCollapsed = useCallback(
    (id: string, collapsed: boolean) =>
      setListPanes((prev) => ({ ...prev, [id]: collapsed })),
    [],
  );

  const setInspectorOpen = useCallback(
    (id: string, open: boolean) =>
      setInspectors((prev) => ({ ...prev, [id]: open })),
    [],
  );

  const value = useMemo<LayoutState>(
    () => ({
      sidebarCollapsed,
      toggleSidebar,
      listPanes,
      setListPaneCollapsed,
      inspectors,
      setInspectorOpen,
      breakpoint,
    }),
    [
      sidebarCollapsed,
      toggleSidebar,
      listPanes,
      setListPaneCollapsed,
      inspectors,
      setInspectorOpen,
      breakpoint,
    ],
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

export function useLayout(): LayoutState {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error(
      "useLayout() must be used inside <LayoutProvider> — wire it in app/layout.tsx.",
    );
  }
  return ctx;
}
