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
| **0.5** | Layout 标准化（9 层栈 + sheet-first） | 🟡 next up | 6 天 | 所有 routes 用 `<RouteFrame>` 组合，单 `<main>`，7 个 Modal → Sheet，11 个 `window.confirm()` → AlertDialog | [phase-0.5-layout.md](./phase-0.5-layout.md) |
| **1** | FE↔BE WS 契约 codegen | ⏳ pending | 1 天 | `make types` 跑通；CI 检测漂移 | （0.5 完成后再写） |
| **2** | 拆 5 个 mega-page | ⏳ pending | 2 周 | 8,759 行 → ≤ 4,000 行，单文件 ≤ 600 行 | （1 完成后再写） |
| **3** | 命名 / 边界文档收尾 | ⏳ pending | 2 天 | `KnowledgePage` 物理位置归位；STYLE.md 落地 | （2 完成后再写） |

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
