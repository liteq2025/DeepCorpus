# Breakpoint Reference

> **Last validated**: 2026-05-01 (Phase 0.5.9). Routes render without
> crashing at all four breakpoints; UX gaps below are tracked for
> follow-up work, not blockers for closing Phase 0.5.

## 1. Tokens

`LayoutContext.tsx` exposes the active breakpoint via `useLayout()`:

| Token       | Width range  | Devices                                |
| ----------- | ------------ | -------------------------------------- |
| `mobile`    | `< 640 px`   | Pixel 5 (393), iPhone 13 (390)         |
| `tablet`    | `≥ 640 px`   | iPad mini (768)                        |
| `desktop`   | `≥ 1024 px`  | typical laptop                         |
| `wide`      | `≥ 1440 px`  | external monitors / split desktops     |

The detection lives in `LayoutContext.tsx:71` and is updated on resize.

## 2. Test infrastructure

Two Playwright smoke projects pin the floor:

| Project        | Viewport        | Command                  |
| -------------- | --------------- | ------------------------ |
| `smoke`        | Desktop Chrome  | `npm run test:smoke`     |
| `smoke-mobile` | Pixel 5 (393)   | `npm run test:smoke:mobile` |

`npm run check:e2e` runs both, plus the visual project. Mobile smoke
asserts the same five golden paths (home / dev / settings / knowledge /
book) render without crashing at sub-640 px.

> Why Pixel 5 over iPhone 13: Chromium-only, so we don't ship the
> webkit binary in CI. The viewport (393 px) is comfortably under the
> 640 px breakpoint for our purposes.

## 3. What works today

- All five smoke routes render without throwing at desktop and mobile.
- `LayoutContext` correctly classifies the viewport and exposes
  `breakpoint` to consumers.
- `Sheet` overlays already fall back to a sensible width at narrow
  viewports (`sm:max-w-3xl` constraint dominates above breakpoint;
  full-width below).

## 4. Known gaps (follow-up, not blocking 0.5)

These are visible in screenshots taken at Pixel 5 width but the
routes still pass smoke — they're UX regressions, not crashes. The
smoke project catches future *crashes*; manual review catches the UX.

### 4a. Sidebar doesn't collapse

`UtilitySidebar` / `WorkspaceSidebar` render a fixed ~240 px column
at all viewports. At 393 px wide that leaves the main area ~150 px,
unusable. Expected: collapse to a hamburger that opens a Sheet.

Owner: any future "mobile parity" sweep.
Plumbing already in place: `useLayout().breakpoint === "mobile"`.

### 4b. ListPane / InspectorPanel don't auto-fall-back to Sheet

Per phase-0.5-layout.md §0.5.9 acceptance:
> `<640px` 移动断点下 panels 自动 fall back 到 Sheet

Current state: ListPane and InspectorPanel render their normal
flex column at any viewport. At mobile width that produces a
horizontally cramped main area.

Implementation sketch when this is picked up:

```tsx
// inside ListPane.tsx
const { breakpoint } = useLayout();
if (breakpoint === "mobile") {
  return (
    <Sheet side="bottom" ...>
      <SheetContent>{children}</SheetContent>
    </Sheet>
  );
}
return <aside>...</aside>;
```

The trigger (a hamburger button or "Show list" affordance) lives in
the parent route's PageHeader.

### 4c. Some pages assume desktop-grade horizontal space

- `/co-writer` document grid (`xl:grid-cols-3 sm:grid-cols-2`) still
  renders one column on mobile — fine.
- `/agents` channels-tab schema editor uses long form rows that wrap
  awkwardly under 640 px.
- `/playground` left tool list (`lg:grid-cols-[280px_1fr]`) collapses
  to a single column under `lg`, but the active item area is still
  cramped under 400 px.

These are mostly visual rather than functional and can be addressed
case-by-case.

## 5. Validation routine for future passes

When touching layout or a top-level route:

1. `npm run check:e2e` — both smoke projects + visual must stay green.
2. Manual visual sanity at Pixel 5 viewport in dev tools — open the
   route, click into a typical interaction, check overflow/clipping.
3. If a fix is structural (e.g. a new ListPane consumer), update §4
   above with the new gap or strikethrough an old one.

A full visual baseline at mobile width is intentionally NOT part of
this phase — too many known UX gaps would lock in the wrong target.
Defer until 4a/4b are addressed.
