# DeepCorpus 前端重构主计划

> **维护说明**：这是 fork 内部的重构计划，不是上游文档。本文是**单一来源**，
> 完成一项就更新对应行 + 写一行进度日志。所有阶段的细节在 `phase-*.md` 子文档。

## 0. 第一性原理

代码库存在的目的是「让未来的改动既快又安」。所有重构最终回答两个问题：

1. **改一项的认知成本 × 风险 × 反馈周期**有多高？
2. **复用与组合**的杠杆有多强？

把所有候选工作放到这把尺子下打分，得出下面的阶段排序。

## 1. 阶段总览

| 阶段 | 主题 | 状态 | 估时 | 验收标准 | 详情 |
|---|---|---|---|---|---|
| **A** | Agent 开发基建（先于一切 UI 改动） | ✅ completed | 1.5 天 | `npm run check:e2e` 本地全绿（96 项检查 / ~3 min） | [phase-A-dev-infra.md](./phase-A-dev-infra.md) |
| **0** | shadcn 接入 + token 对齐 + 去 glass/snow | ✅ completed | 1 天 | shadcn b37bl1flo 落地，11 个原语就位（button/input/textarea/label/dialog/alert-dialog/sheet/popover/dropdown-menu/tooltip/sonner），glass + snow 主题清掉，`npm run check:e2e` 97 项绿 | [phase-0-shadcn.md](./phase-0-shadcn.md) |
| **0.5** | Layout 标准化（9 层栈 + sheet-first） | ✅ completed | 6 天 | 所有 routes 用 layout 原语组合（5 routes via PageBody/PageHeader/RouteFrame，/chat 走 layout 修复）、7 个 Modal → Sheet，15 个 `window.confirm()` → AlertDialog，sidebar 共享 hook，mobile smoke project + breakpoints 文档落地 | [phase-0.5-layout.md](./phase-0.5-layout.md) |
| **1** | FE↔BE WS 契约 codegen | ✅ completed | 1 天 | `make types` 跑通；CI 检测漂移 | [phase-1-ws-contract.md](./phase-1-ws-contract.md) |
| **2** | 拆 5 个 mega-page | 🟡 in-progress | 2 周 | 9,388 行（实测）→ ≤ 4,000 行，单文件 ≤ 600 行 | [phase-2-megapages.md](./phase-2-megapages.md) |
| **3** | 命名 / 边界文档收尾 | 🟡 in-progress | 2 天 | `KnowledgePage` 物理位置归位；STYLE.md 落地 | [phase-3-naming.md](./phase-3-naming.md) |

**状态图例**：⏳ pending · 🟡 in-progress · ✅ completed · ❌ blocked

## 2. shadcn 预设（一旦确认即冻结）

用户在 https://ui.shadcn.com/create?preset=b37bl1flo&item=preview 自定义的预设
`b37bl1flo` 解码后：

| 字段 | 值 | 是否采用 |
|---|---|---|
| style | `nova` | ✅ |
| baseColor | `taupe`（暖灰） | ✅ |
| theme | `indigo` | ✅ |
| chartColor | `indigo` | ✅ |
| iconLibrary | `lucide` | ✅（已与项目 `lucide-react@0.562` 一致） |
| radius | `medium`（≈ 0.5rem） | ✅ |
| menuColor / menuAccent | `default / subtle` | ✅ |
| **font** | `inter` | ❌ **覆盖**：保留项目现有 `Plus Jakarta Sans + Lora` |
| fontHeading | `inherit` | ✅ |

安装命令（Phase 0 执行）：

```bash
pnpm dlx shadcn@latest init --preset b37bl1flo --template next
```

## 3. 主题简化决策

去掉 `glass` 主题，只保留 `light` / `dark`。涉及面：

- `app/globals.css` — 删 `[data-theme="glass"]` 段
- `lib/theme.ts` / `lib/theme-utils.ts` — 类型与工具函数
- `components/ThemeScript.tsx` — SSR 注入逻辑
- `app/(utility)/settings/page.tsx` — 主题选择器去掉 glass 选项
- shadcn 装完后顺便用 shadcn 形状的 token 命名一刀切

## 4. 进度日志

> 反向时间序，最新在上。完成一项 = 加一行 = 更新表格状态。

| 日期 | 阶段 | 事件 |
|---|---|---|
| 2026-05-02 | 1 | ✅ **Phase 1 MVP 完成**。WS contract codegen 落地：`scripts/gen_ws_types.py` 从 `deeptutor/core/stream.py` 生成 `web/lib/ws-events.gen.ts`，`make types-check` 进 CI 把住漂移。决策：（a）保留 dataclass 不改 Pydantic（避运行时风险），写 30 行 hand-mapping + 字段集 assert；（b）客户端→服务端 7 种 message 不做 codegen，BE router 是 raw dict 解析无 Python 类型，留 manual 维护并文档化（`phase-1-ws-contract.md` §3.2）；（c）REST OpenAPI 不在本期。codegen 副产品：抓到 `UnifiedChatContext.tsx:797` 和 `showcases.tsx:1262` 两处 latent drift（手造 event 漏 session_id / turn_id / seq 默认值，BE 永远带 ""/0），typecheck 第一天就报错——这是 Phase 1 立即兑现的价值。 |
| 2026-05-02 | 0.5 | 🧹 0.5 audit cleanup pack：(a) `/chat` 视觉基线 4 张（commit `6e24e0a`）—— sheet-first 改最重路由首次有 pixel gating；(b) `SpaceSectionHeader` → `PageHeader`（commit `a2e591d`）—— 删 `text-[19px]` off-scale h1，4 sub-route 跟着拿到 canonical 24px；showcase 的 `space-section-header` 条目转为 `ui-page-header`。审计 carry-over 现剩 2 项：InspectorPanel decision、PageHeader 适用边界文档化。 |
| 2026-05-02 | shadcn | sweep 落地：3 处 Select（`CreateKbModal` / `BookCreator` / `SpineEditor`）+ 9 处 Badge（4 个 /space section 的 meta + count + Memory toast）迁到 shadcn 原语（commit `e701e41`）。配套 commit `f7cba3a` 装 select / badge / separator / skeleton 4 个新原语 + 4 个 dev showcase。21 处 select 残债 + 14 处 inline pill 故意不动——ConfigPanel/ChatComposer/playground 等紧绑容器 helper，要等 Phase 2 拆 mega-page 顺带做。 |
| 2026-05-02 | shadcn | 补 8 个已装但 0 showcase 的 shadcn 原语（commit `3f67ef8`）；顺手挂 `<Toaster>`——Phase 0 漏挂的硬错，sonner 此前 0 调用且 0 mount。 |
| 2026-05-01 | 0.5 | 🧹 0.5 收尾后续：`SpaceMiniNav` 迁 ListPane（commit `17e6670`）。Layer 2 双标准修正——0.5.8 第一 slice (`8ee8b7c`) 只迁了 /space 的 RouteFrame + PageBody，遗留 SpaceMiniNav 仍是手撸 224px aside（带 border-r、LayoutGrid 徽章 + 描述段、不可折叠），与 /knowledge ListPane（280/56、无 border、可折叠）规格冲突。本次把 SpaceMiniNav 包进 `<ListPane id="space-nav" title="Space">`，items 用 `text-[13px] font-medium` + `text-[11px]` 与 `KnowledgeBaseListItem` 对齐，提供 `collapsedContent` icon strip。`npm run check:e2e` 20 项继续绿，4 个 /space 视觉基线（darwin + linux × light + dark）已重建。 |
| 2026-05-01 | 0.5 | ✅ **Phase 0.5 完成**。最后两个 slice：(a) AppSidebar 合并（0.5.2 part 2，`f285d6e`）— 提取 `useSessionList()` 共享 hook，UtilitySidebar 101→60 行、WorkspaceSidebar 128→91 行，路由组隔离保留（utility 没有 UnifiedChatProvider，不能合并到单一组件）。(b) 0.5.9 mobile 断点验证（`ed8ae29`）— Playwright `smoke-mobile` project（Pixel 5 393px Chromium）落地、`npm run check:e2e` 现 20 项绿（5 desktop smoke + 5 mobile smoke + 10 visual），`docs/refactor/breakpoints.md` 文档化已知 mobile UX gaps（sidebar 不塌、ListPane/InspectorPanel 不 fallback）作为后续工作。 |
| 2026-05-01 | 0.5 | ✅ 0.5.8 完成。两个收尾 slice：(a) `/chat` scrollbar 位置修复 — 拆开 body wrapper（之前把整个 messages+composer 包在 mx-auto max-w-960 里，scrollbar 出现在 viewport 中部），现 header / scroll / composer 各自 mx-auto，scroll 区域全宽，scrollbar 落在 viewport 边缘（`6868753`）。同 commit 顺手把代码块行号字号从继承的 14px 收到 12px。(b) `/book` h-screen → h-full + Suspense fallback 同改 — book 自己的 list/creator/spine/reader 多视图复杂结构保留，仅做 canonical pattern 对齐（`4679ec1`）。0.5.8 进度 6/6 ✅。Phase 0.5 整体进度 ~90%（仅剩 0.5.2 part 2 AppSidebar 合并 + 0.5.9 mobile 断点验证）。 |
| 2026-05-01 | 0.5 | ✅ 0.5.8 第四个 slice：`/co-writer` 迁 PageBody size="wide"。Toolbar header 形式特殊（紧凑命令栏 + border-b 分割，非 in-flow PageHeader），保留原结构。清掉冗余 `bg-[var(--background)]` + `min-h-full`，文档区改 PageBody size="wide"（max-w-7xl，与 xl:grid-cols-3 断点对齐）；aria-label 改 `t()`。0.5.8 进度 4/6（剩 /chat, /book）。 |
| 2026-05-01 | 0.5 | ✅ 0.5.8 第三个 slice：`/agents` 迁 PageBody。toast/description swap 是独有 UX，保留 inline `<header>`（不用 PageHeader 原语）但用 canonical typography（text-2xl, text-sm）。`max-w-[960px] py-8` → PageBody default（max-w-5xl px-6 py-6）。0.5.8 进度 3/6（剩 /co-writer, /chat, /book）。 |
| 2026-05-01 | 0.5 | ✅ 0.5.8 第二个 slice：`/playground` 迁 PageBody + PageHeader（commit `491e6d7`）。单列页面，不需要 RouteFrame；外层 `<div min-h-screen bg-[var(--background)]>` → `<section aria-label overflow-y-auto>`，title 用 PageHeader（font-bold → font-semibold per canonical scale）。0.5.8 进度 2/6（剩 /agents, /co-writer, /chat, /book）。 |
| 2026-05-01 | 0.5 | ✅ 0.5.6 完成。7 个手撸 Modal 全部迁 Sheet，`common/Modal.tsx` 删除。两个 commit 拆分：(a) `2c4b0eb` CreateKbModal + SaveToNotebookModal + 删 common/Modal；(b) `7a75571` NotebookRecordPicker / HistorySessionPicker / QuestionBankPicker + FilePreviewDrawer 重命名 FilePreviewSheet。所有 showcase 同步、`npm run check:e2e` 112 项绿。 |
| 2026-05-01 | 0 | ✅ Phase 0 完成。shadcn b37bl1flo init + 11 个原语 + Button 迁移到 shadcn API（保留 fork loading/icon 扩展）。Tailwind v3 兼容补丁：去掉 `@import "shadcn/tailwind.css"` / `tw-animate-css` / `outline-ring/50` v4 syntax，装 `tailwindcss-animate`。glass + snow 主题完全移除（globals.css -77 行）。`npm run check:e2e` 97 项检查绿。 |
| 2026-05-01 | 0 / 0.5 | 写 Phase 0 (`phase-0-shadcn.md`) 和 Phase 0.5 (`phase-0.5-layout.md`) 两份执行规格。基于 Layout 一致性诊断（4 类问题）插入 Phase 0.5。决定：sheet-first overlay 决策（7 个手撸 Modal 全部迁 Sheet，11 个 `window.confirm()` 迁 AlertDialog），Dialog 仅留破坏性确认。Phase 0 → in-progress。 |
| 2026-05-01 | A | ✅ Phase A 完成。`npm run check:e2e` 本地 96 项检查全绿（lint 0 errors / typecheck 0 / 83 unit / 5 component / 5 smoke / 3 visual）。CI workflow `web-tests.yml` 已就位。`docs/refactor/AGENT_LOOP.md` 落地。Agent 工作循环关上。 |
| 2026-05-01 | — | 计划文档建仓（`PLAN.md` + `phase-A-dev-infra.md`） |

## 5. 不在本计划范围

明确**不做**的事，避免 scope creep：

- Storybook（`/dev` showcase 已覆盖 80%，未来跨产品复用时再评估）
- Redux / Zustand 引入（现有 React Context + localStorage 够用）
- E2E 全覆盖（只做 5 条 golden path，不追测试覆盖率指标）
- Tailwind v4 升级（v3.4 稳定够用，不与本次重构耦合）
- 后端代码改动（除了 Phase 1 导出 JSON Schema，不动 `deeptutor/`）

## 6. 给执行者（agent / 人）的纪律

详细 SOP 见 [AGENT_LOOP.md](./AGENT_LOOP.md)。摘要：

1. **一次只推进一个阶段**，前一个阶段没全绿不开下一个。
2. **每完成一项 = 一个 commit**，前缀按 `AGENTS.fork.md` 规范（`[FORK-FEAT]` / `[FORK-MOD]` / `[FORK-FIX]`）。
3. **改完跑 `npm run check`**（Phase A 完成后），不通过不提交。
4. **更新本文表格 + 进度日志**，让下一个 agent 接手时知道现状。
5. **遇阻塞不要硬推**，把 `❌ blocked` 写到状态列，注明阻塞原因。
