# Phase 0.5 — Layout 标准化

> **状态**：⏳ pending（依赖 Phase 0 完成才能启动）
> **回到 PLAN.md**：[./PLAN.md](./PLAN.md)

## 0. 为什么必须做这一阶段

第一性诊断（详见 `PLAN.md` §0）：当前 layout 层有 4 类问题:

- **A 类 · 语义硬错**：`space/layout.tsx` 嵌 `<main>`、零 `aria-label`、零 `loading.tsx` / `error.tsx`、`(workspace)/page.tsx` 客户端 redirect
- **B 类 · 代码重复**：两个路由组 layout 几乎一字不差；`SidebarShell` 抽出但 Utility/Workspace sidebar 仍各自实现 ~100 行；`bg-[var(--background)]` 出现 64 次
- **C 类 · 模式扩散**：4 种 max-width / 4 种 padding / 4 种 h1 风格 / 4 种 scroll 顶层模式
- **D 类 · Modal 滥用**：7 个手撸 Modal，11 处 `window.confirm()`

这阶段把它们一次性收敛到 9 层栈 + 6 个 layout 原语 + sheet-first overlay 决策树。

## 1. 验收标准

```
✅ 所有 routes 用 <RouteFrame> 组合，单 <main>，<aside aria-label> 全部就位
✅ components/layout/ 6 个原语就位（AppSidebar/RouteFrame/ListPane/InspectorPanel/PageHeader/PageBody）
✅ 7 个手撸 Modal 全部迁移到 Sheet（FilePreviewDrawer 重命名为 FilePreviewSheet）
✅ 11 个 window.confirm() 全部迁移到 AlertDialog
✅ 视觉 baseline 全部更新且 npm run check:e2e 全绿
✅ <640px 移动断点下 panels 自动 fall back 到 Sheet
✅ docs/refactor/overlay-rules.md 落地
```

## 2. 9 层栈速查

| Layer | 名字 | 角色 | 最大数 | z-index | 控制方式 |
|:-:|---|---|:-:|:-:|---|
| **0** | `<AppShell>` | html / body / providers | 1 | — | `app/layout.tsx` |
| **1** | `<AppSidebar>` | 全局持久导航 | 1 | 10 | 路由组 layout |
| **2** | `<ListPane>` | 第二列（列表 / 章节 / 文件树） | 0-1 | 10 | 路由 layout 或 page |
| **3** | `<main>` + `<PageBody>` | 主工作区 | 1 | 10 | page |
| **4** | `<InspectorPanel>` | 右栏（属性 / 引用 / 工具） | 0-1 | 10 | page，可 collapse |
| **5** | `<Sheet>` | 侧滑窗（**默认** overlay） | 1（最多嵌 2） | 40 | URL state 或 trigger |
| **6** | `<Dialog>` / `<AlertDialog>` | 居中模态（仅破坏性确认 / 硬阻断） | 1 | 50 | trigger |
| **7** | `<Popover>` / `<DropdownMenu>` | 锚定弹层 | n | 60 | trigger 局部 state |
| **8** | `<Tooltip>` | hover 提示 | n | 70 | trigger（无 state） |
| **9** | `<Toaster>` (sonner) | 通知 | 队列 ≤ 3 | 80 | imperative |

## 3. Overlay 决策树（sheet-first）

```
需要在主画布外交互？
├─ 不可撤销的破坏性操作？        → AlertDialog
├─ 程序反馈 / 状态？             → Toast
├─ hover 提示 (≤1 行)？          → Tooltip
├─ 锚定的小弹层 (free 布局)？    → Popover
├─ 锚定的菜单 (列表)？           → DropdownMenu
└─ 其他一切（表单/预览/浏览/多步） → Sheet  ← 默认
```

**Dialog 仅在以下三种场景才用**：
1. 不可撤销的破坏性操作（`AlertDialog` 变体）
2. 必须先解决才能继续工作的硬阻断（连接断开、API key 缺失等）
3. 一句话非破坏性确认且不值得 sheet 切换（少见）

其他**全部用 Sheet**：表单、预览、浏览、多步骤、设置。

## 4. Sheet 变体规范

```ts
<Sheet
  side="right"      // right(默认 桌面) | bottom(<640px 默认) | left | top
  size="md"         // sm(400) | md(540 默认) | lg(720) | xl(50vw) | full
  modal={false}     // 默认 false：不抓焦点，背景仍可滚 / 复制
                    // true 仅在嵌套 Sheet 或多步表单需要专注时
/>
```

**Sheet 嵌套**：最多 2 层。≤640px 宽度时全部 fall back 到 `side="bottom"`。

## 5. Surface tokens（依赖 Phase 0 装好的 shadcn）

| Layer | Token |
|---|---|
| body 画布 | `--background` |
| AppSidebar | `--sidebar` / `--sidebar-foreground` |
| ListPane | `--card` / `--card-foreground` |
| Main | `--background` |
| InspectorPanel | `--card` / `--card-foreground` |
| Sheet / Dialog / Popover / DropdownMenu | `--popover` / `--popover-foreground` |
| Tooltip | `--foreground` (反色) |
| Toast | `--popover` |

## 6. 步骤

### 0.5.1 Layer 0/1 语义清理 + redirect — ½ 天

**目标**：把 A 类硬错全部修掉，先于其他改动落地。

1. **修嵌套 `<main>`**：`app/(utility)/space/layout.tsx`
   ```tsx
   // before
   <main className="...">{children}</main>
   // after
   <section className="..." aria-label="Workspace section">
     {children}
   </section>
   ```

2. **`<main aria-label>` 加全 routes**：在 `(utility)/layout.tsx` 和 `(workspace)/layout.tsx` 给 `<main>` 加 `aria-label`，每个 route 的 `<main>` 应有自己的 label（让 SR 能区分）。

3. **改 `(workspace)/page.tsx` 为 server redirect**：
   ```tsx
   // before: useEffect → router.replace
   // after:
   import { redirect } from "next/navigation";
   export default function Home() {
     redirect("/chat");
   }
   ```

4. **去掉 64 处冗余 `bg-[var(--background)]`**：用 codemod 批量移除（`<body>` 已经设了）。保留例外：当父容器背景不是 `--background` 时（如 settings 内部分卡）。

5. **加 `loading.tsx` + `error.tsx`**：每个路由组一对，统一骨架屏 + error UI。

**验收**：`npm run check:e2e` 全绿；`npm run test:smoke` 中 `/knowledge` 和 `/book` 不再需要 `.first()` 绕过。

### 0.5.2 components/layout/ 6 个原语 — 1.5 天

**目标**：层级抽象就位，所有 page 可以拼装。

文件清单（按依赖顺序写）：

```
components/layout/
├── LayoutContext.tsx       Provider + useLayout()，管 sidebar/listPane/inspector 的 collapse state
├── AppShell.tsx            主要负责 html / body 包装；可能直接用 app/layout.tsx 不另起
├── AppSidebar.tsx          ⭐ 合并现 SidebarShell + UtilitySidebar + WorkspaceSidebar
├── RouteFrame.tsx          flex-row 容器：<ListPane> + <main> + <InspectorPanel>
├── ListPane.tsx            第二列（带 header / collapsible / aria-label）
├── InspectorPanel.tsx      右栏（带 tabs 可选 / collapsible / mountWhen prop）
├── PageHeader.tsx          icon + h1 + description + actions
├── PageBody.tsx            <PageBody size="default|wide|narrow">：max-w 三档
└── EmptyState.tsx          统一空状态：icon + title + description + cta
```

**AppSidebar 合并要点**：
- 现 `SidebarShell.tsx`(318 行) 已经把外壳抽出
- 但 `UtilitySidebar.tsx`(98) 和 `WorkspaceSidebar.tsx`(125) 各自重写了 session-loading + nav 渲染
- 合并后：单一 `AppSidebar` 接 `variant="utility" | "workspace"`，根据 variant 注入不同的 session source（utility 直接用 listSessions API，workspace 走 UnifiedChatContext）

**LayoutContext 接口**：
```ts
interface LayoutState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  listPanes: Record<string, { collapsed: boolean }>;       // by id
  setListPaneCollapsed: (id: string, v: boolean) => void;
  inspectors: Record<string, { open: boolean }>;            // by id
  setInspectorOpen: (id: string, v: boolean) => void;
  breakpoint: "mobile" | "tablet" | "desktop" | "wide";    // tied to viewport
}
```
所有 collapse / open 状态持久化到 `localStorage` (key: `dc.layout.v1`)。

**验收**：每个原语都有 vitest，showcase 同步加进 `/dev?view=showcase` 的 `Layout` 类目。

### 0.5.3 z-index token 集中 — ¼ 天

```ts
// tailwind.config.js
theme: {
  extend: {
    zIndex: {
      base: "10",
      sheet: "40",
      dialog: "50",
      popover: "60",
      tooltip: "70",
      toast: "80",
    },
  },
}
```

codemod 把内联 `z-[xxxx]` / `z-50` 等替换成 token。允许例外：极少数特殊场景（如 mermaid renderer 内部）保留内联，注释说明。

### 0.5.4 Overlay 边界文档 + Lint — ¼ 天

1. 写 `docs/refactor/overlay-rules.md`：决策树 + 反模式 + 各 overlay 用法示例
2. ESLint custom rule：`overlay-rules/no-button-in-tooltip` —— Tooltip 内不允许 `<button>` / 可点击元素
3. 加到 `eslint.config.mjs` 的 rules 区块

### 0.5.5 迁移 pilot：/knowledge — ½ 天

挑 `/knowledge`（中等复杂度，已有 list + detail 两栏）作为第一个迁移目标，验证 RouteFrame 合用。

```tsx
// app/(utility)/knowledge/page.tsx — 改造后
export default function KnowledgePage() {
  return (
    <RouteFrame>
      <ListPane title="Knowledge bases" id="kb-list">
        <KnowledgeBaseList ... />
      </ListPane>
      <main aria-label="Knowledge base detail">
        <PageHeader title={selectedKb?.name ?? "Knowledge"} />
        <PageBody size="wide">
          <KnowledgeBaseDetail ... />
        </PageBody>
      </main>
    </RouteFrame>
  );
}
```

**验收**：
- 视觉 baseline 同步更新（macOS + Linux）
- 5 个 smoke test 全过
- DOM 中只有 1 个 `<main>`，每个 `<aside>` 有 `aria-label`

### 0.5.6 Modal → Sheet 迁移 — 1 天

| # | 现状 | 迁移目标 | size |
|---|---|---|---|
| 1 | `common/Modal.tsx` | **删除**（被 ui/sheet + ui/dialog 取代） | — |
| 2 | `knowledge/CreateKbModal.tsx` | Sheet | md |
| 3 | `notebook/SaveToNotebookModal.tsx` | Sheet | md |
| 4 | `chat/HistorySessionPicker.tsx` | Sheet | lg |
| 5 | `chat/QuestionBankPicker.tsx` | Sheet | lg |
| 6 | `notebook/NotebookRecordPicker.tsx` | Sheet | lg |
| 7 | `chat/preview/FilePreviewDrawer.tsx` | Sheet (重命名 `FilePreviewSheet`) | xl |

**每个组件单独 commit**，prefix `[FORK-MOD]`，blast radius 受限。每个迁移后：
- `npm run check`（视觉 baseline 改了再 update）
- showcase 同步：`components/dev/showcases.tsx` 里把 modal 的预览改成 sheet
- 所有 import 路径修正

### 0.5.7 window.confirm() → AlertDialog — ½ 天

11 处 `window.confirm()`（详见 `PLAN.md` 调研结论）一次 codemod 替换。

每处的样板：

```tsx
// before
if (!window.confirm(t("Delete this chat history?"))) return;
await delete(...);

// after
const confirmed = await confirmDelete({
  title: t("Delete this chat history?"),
  description: t("This cannot be undone."),
  confirmLabel: t("Delete"),
});
if (!confirmed) return;
await delete(...);
```

`confirmDelete()` 是一个基于 `<AlertDialog>` 的 imperative wrapper，放在 `components/layout/confirm-delete.tsx`。

加 1 个 smoke test：访问 settings、点 Delete chat history 按钮，**断言看到 AlertDialog 而不是 native confirm**。

### 0.5.8 迁移其余 6 个 routes 用 RouteFrame — 1.5 天

按 blast radius 排序：

| Route | 复杂度 | 单 commit |
|---|---|---|
| `/space/*`（5 个 sub-route）| 低 | 1 commit（共用 layout） |
| `/agents` | 中 | 1 commit |
| `/co-writer` | 中（有大文件） | 1 commit |
| `/chat` | 高（已是单列对话） | 1 commit |
| `/playground` | 中 | 1 commit |
| `/book` | 高（自己的 layout 复杂） | 1 commit |

每个 route：
- 改 page.tsx 用 `<RouteFrame>` + `<PageHeader>` + `<PageBody>`
- 视觉 baseline 更新（如果路由进了 dev showcase）
- smoke / visual 全绿才进下一个

### 0.5.9 响应式断点验证 — ½ 天

1. 在 `playwright.config.ts` 加 mobile project：
   ```ts
   {
     name: "smoke-mobile",
     testMatch: "**/*.smoke.ts",
     use: { ...devices["iPhone 13"] },
   },
   ```

2. 加 `npm run test:smoke:mobile` 跑同一组 smoke test，验证 <640px 下：
   - sidebar 塌成汉堡
   - listPane 塌成 Sheet
   - inspector 塌成 Sheet
   - main 全宽

3. 手动验证桌面 (≥1280) → 平板 (≥768) → 移动 (<640) 三个断点的视觉表现，截图加进 `docs/refactor/breakpoints.md` 作为参照。

## 7. 已知风险

1. **AppSidebar 合并的 UnifiedChatContext 依赖**：workspace variant 需要 `useUnifiedChat()`，utility variant 不能用。两种方案：
   - 方案 A：把 sidebar 拆成两个 wrapper，shared internal 渲染逻辑（推荐）
   - 方案 B：UnifiedChatProvider 在两个路由组都注入（破坏关注点分离）

2. **Sheet 嵌套**：shadcn `Sheet` 默认不支持嵌套（z-index 同层会覆盖）。如果第二层 Sheet 出现，要用 `<Sheet modal={false}>` 或自定义 z-index 偏移。Phase 0.5.6 的迁移要确认每个 modal 是否会触发嵌套。

3. **视觉 baseline 雪崩**：每改一个 route 就需要更新 macOS + Linux 两套 baseline。建议每个 commit 都跑 `npm run test:visual:update` + docker linux update，避免最后一波集中处理。

4. **window.confirm() 是同步阻塞，AlertDialog 是异步 Promise**：迁移时所有 caller 必须改成 `async/await`。已经 async 的 ok，少数同步的（比如 onClick 直接同步处理）需要小重构。

5. **`(workspace)/page.tsx` server redirect 与原 client logic 的差异**：原来支持 `?session=xxx` 转发到 `/chat/xxx`，server redirect 时 query string 处理需要保留：
   ```tsx
   import { redirect } from "next/navigation";
   export default async function Home({
     searchParams,
   }: {
     searchParams: Promise<Record<string, string | string[]>>;
   }) {
     const params = await searchParams;
     const sessionId = params.session;
     const target = sessionId
       ? `/chat/${sessionId}${buildQuery(params)}`
       : `/chat${buildQuery(params)}`;
     redirect(target);
   }
   ```

## 8. 完成检查清单

- [ ] 0.5.1 — 嵌套 `<main>` 修复 / aria-label / server redirect / loading+error 落地
- [ ] 0.5.2 — `components/layout/` 6 个原语 + LayoutContext 都有 vitest
- [ ] 0.5.3 — z-index token 集中，inline `z-[xxxx]` ≤ 5 处例外
- [ ] 0.5.4 — `overlay-rules.md` + ESLint rule 落地
- [ ] 0.5.5 — `/knowledge` 用 RouteFrame 重构通过
- [ ] 0.5.6 — 7 个 Modal 全部迁移到 Sheet，`common/Modal.tsx` 已删
- [ ] 0.5.7 — 11 个 window.confirm() 全部迁移到 AlertDialog
- [ ] 0.5.8 — 6 个 routes 全部迁移
- [ ] 0.5.9 — mobile smoke test 加入 CI；breakpoint 文档落地
- [ ] PLAN.md 状态 → ✅，进度日志加一行
- [ ] 给 Phase 1 写 `phase-1-ws-contract.md`

## 9. Commit 拆分（约 18 个 commit）

```
0.5.1   1 commit  [FORK-FIX] layout: Layer 0/1 semantic cleanup + server redirect
0.5.2   3 commits [FORK-FEAT] layout: AppSidebar / RouteFrame / ListPane+InspectorPanel / PageHeader+PageBody+EmptyState
0.5.3   1 commit  [FORK-MOD] layout: centralize z-index tokens
0.5.4   1 commit  [FORK-FEAT] docs: overlay rules + lint
0.5.5   1 commit  [FORK-MOD] layout: migrate /knowledge to RouteFrame
0.5.6   7 commits [FORK-MOD] sheet: migrate {CreateKb, SaveToNotebook, HistorySessionPicker, QuestionBankPicker, NotebookRecordPicker, FilePreviewDrawer→Sheet}; remove common/Modal
0.5.7   1 commit  [FORK-MOD] dialog: replace 11 window.confirm with AlertDialog
0.5.8   6 commits [FORK-MOD] layout: migrate {/space, /agents, /co-writer, /chat, /playground, /book} to RouteFrame
0.5.9   1 commit  [FORK-FEAT] ci: mobile smoke project + breakpoint docs
final   1 commit  [FORK-MOD] docs: mark Phase 0.5 as completed
```

总计 ~22 commits / 6 days。
