# DeepCorpus Frontend Style Guide

> Quick reference for already-established conventions. Each rule has one
> line + pointer to the phase doc that decided it. **This is not new
> rules.** If you disagree, push back in the phase doc, not here.
>
> Maintenance: when a phase doc adds or changes a rule, mirror it here.

## 1. Tokens

Color tokens come from shadcn `b37bl1flo` preset (radix-nova / taupe baseColor).
[phase-0-shadcn.md](./phase-0-shadcn.md)

```
--background       body canvas
--foreground       body text
--card             one tick lighter than canvas (Layer 2/4 surfaces)
--muted            subtle bg (count chips, hovers)
--muted-foreground secondary text
--border           form borders
--ring             focus ring
--primary          primary action / accent
--primary-foreground   text on primary
--destructive      delete / danger
--popover          sheet/dialog/popover bg
--sidebar          AppSidebar bg
--sidebar-foreground
```

Surface mapping per layer in [phase-0.5-layout.md §5](./phase-0.5-layout.md#5-surface-tokens).

## 2. Typography canonical scale

Use Tailwind preset sizes. **No `text-[Npx]` off-scale numbers.**
[1e0fe84 commit message + phase-0.5 audit](./PLAN.md)

```
text-2xl       page h1 (PageHeader)
text-xl        section h2
text-lg        sub-heading
text-base      body
text-sm        secondary / list-pane title
text-xs        meta / count
```

Existing violations under remediation: see [PLAN.md progress log](./PLAN.md#4-进度日志).

## 3. Layout 9-layer stack

[phase-0.5-layout.md §2](./phase-0.5-layout.md#2-9-层栈速查)

```
0  AppShell              app/layout.tsx
1  AppSidebar            global persistent nav
2  ListPane              second column (list / nav / sections)
3  main + PageBody       primary work surface
4  InspectorPanel        right inspector (⚠ 0 consumers — sunset 2026-Q3)
5  Sheet                 default overlay (forms / preview / browse)
6  Dialog / AlertDialog  centered modal (destructive confirm only)
7  Popover / DropdownMenu anchored popups
8  Tooltip               ≤1-line hover hint
9  Toaster (sonner)      imperative notifications
```

## 4. Overlay decision tree

[phase-0.5-layout.md §3](./phase-0.5-layout.md#3-overlay-决策树sheet-first)

```
Need to interact off the main canvas?
├─ Irreversible destructive op?         → AlertDialog
├─ Programmatic feedback?               → Toast (sonner)
├─ ≤1-line hover hint?                  → Tooltip
├─ Anchored small popup (free layout)?  → Popover
├─ Anchored menu (list)?                → DropdownMenu
└─ Anything else (form/preview/browse)  → Sheet  ← default
```

Forbidden: `window.confirm()` (use `useConfirm()` from `@/components/layout`),
hand-rolled `<div fixed inset-0>` modals.

## 5. Icon size scale

Default to canonical Tailwind sizes per [5da5ba9 commit](./PLAN.md):

```
size-3 / h-3 w-3      micro (12px) — inside buttons / chips
size-3.5 / h-3.5 w-3.5 small (14px) — list items / inline labels
size-4 / h-4 w-4      base  (16px) — toolbar / tab icons
size-5 / h-5 w-5      large (20px) — page-level loading
```

Don't use `size={13}` style numeric props for routine icons. Acceptable
where canonical sizes don't fit a tight grid.

## 6. File organization

```
web/
├── app/(group)/<route>/page.tsx        — route page (page IS the component)
│
├── components/
│   ├── ui/<primitive>.tsx              — shadcn-installed primitives
│   ├── layout/<primitive>.tsx          — Layout primitives (RouteFrame etc.)
│   ├── <feature>/<X>.tsx               — feature sub-components
│   ├── <feature>/tabs/<X>.tsx          — when a feature has tabs (e.g. agents)
│   ├── common/                         — shared rich primitives (markdown,
│   │                                     code highlighter, model thinking)
│   └── dev/                            — dev showcase + dashboard
│
├── lib/
│   ├── <feature>-helpers.ts            — pure types/helpers/constants
│   ├── <resource>-api.ts               — fetch wrappers
│   ├── <X>-types.ts                    — domain types
│   └── ws-events.gen.ts                — auto-generated; do not edit
│
├── hooks/
│   └── use<Feature>.ts                 — stateful hooks
│
├── context/
│   └── <X>Context.tsx                  — React context providers
│
└── tests/
    └── e2e/<route>-page.visual.ts      — Playwright visual / smoke
```

[phase-3-naming.md](./phase-3-naming.md) — `<route>/page.tsx` is the page,
not a wrapper. Suspense boundary OK (when needed for `useSearchParams`).

## 7. Naming

- Component / class → CamelCase
- File name = default export name (`KnowledgeBaseList.tsx` exports `KnowledgeBaseList`)
- Hook → `useX`
- Pure helper → `verbObject` (`getActiveModel`, not `activeModel`)
- Constant → SCREAMING_SNAKE
- Type / interface → CamelCase, no `I` prefix
- Generated artifact → suffix `.gen.ts` (e.g. `ws-events.gen.ts`)

## 8. Forbidden / deprecated

| Don't | Do | Reason |
|---|---|---|
| `window.confirm()` | `useConfirm()` from `@/components/layout` | A11y + canonical AlertDialog |
| Hand-rolled modal `<div fixed inset-0>` | `Sheet` (or `AlertDialog` for destructive) | Sheet-first, [phase-0.5 §3](./phase-0.5-layout.md#3-overlay-决策树sheet-first) |
| `text-[Npx]` off-scale | Canonical scale §2 | Prevents drift |
| Inline pill `<span class="rounded-full ...">` | `<Badge variant="...">` | Centralized variants |
| Raw `<select>` for new code | `<Select>` from `@/components/ui/select` | a11y + keyboard nav |
| `size={N}` numeric icon props | Canonical icon scale §5 | Consistency |
| Edit `web/lib/ws-events.gen.ts` by hand | Run `make types` | Generated file, [phase-1-ws-contract.md](./phase-1-ws-contract.md) |
| Re-create `main` git branch | (don't) | Soft-fork policy, [README.fork.md](../../README.fork.md) |

## 9. Visual baselines

[AGENT_LOOP.md §3](./AGENT_LOOP.md#3-视觉回归-diff-怎么处理)

Each route with non-trivial UI gets a Playwright `*-page.visual.ts` test.
Baselines committed for both darwin (local) and linux (CI / docker) per
theme. To update:

```bash
WEB_BASE_URL=http://localhost:3782 npx playwright test \
  --project=visual --update-snapshots               # darwin

docker run --rm -v "$(pwd)":/work -w /work \
  -e WEB_BASE_URL=http://host.docker.internal:3782 \
  mcr.microsoft.com/playwright:v1.57.0-jammy \
  bash -lc 'npx playwright test --project=visual --update-snapshots=all'
                                                    # linux via docker
```

Routes currently baselined: `/dev?view={showcase,gallery,tree}`,
`/knowledge`, `/space/notebooks`, `/chat`. Deeper interaction states
not gated yet.

## 10. WS contract codegen

[phase-1-ws-contract.md](./phase-1-ws-contract.md)

Server→client `StreamEvent` is generated from `deeptutor/core/stream.py`
into `web/lib/ws-events.gen.ts`. CI runs `make types-check` and fails
on drift. Client→server messages are still manually mirrored on both
sides (BE parses raw dicts).

When you add a `StreamEvent` field on the BE: edit the dataclass, then
`make types`, then commit both files.

## 11. Dev showcase

`/dev?view=showcase` renders every shipped primitive + feature
component via the registry in `components/dev/showcases.tsx`. Add to
the registry whenever you add a primitive or expose a new shape. The
registry is the design-system index — keep it accurate.

## 12. Routine: where to put new code

| Adding... | Goes in |
|---|---|
| A new shadcn primitive | `npx shadcn@latest add X` → `components/ui/X.tsx` + showcase entry |
| A new layout primitive | `components/layout/X.tsx` + export from index, update [phase-0.5 §2](./phase-0.5-layout.md#2-9-层栈速查) |
| A new route page | `app/(group)/<route>/page.tsx` (the page IS the component) |
| Sub-component for a route | `components/<feature>/<X>.tsx` |
| Pure helpers / types | `lib/<feature>-helpers.ts` |
| Stateful hook | `hooks/use<Feature>.ts` |
| API fetch wrapper | `lib/<resource>-api.ts` |
| WS event field | edit `deeptutor/core/stream.py` + run `make types` |
| Visual gating for a route | `tests/e2e/<route>-page.visual.ts` + 4 baselines |
