# Phase v3 ↔ Phase 3 协调备忘（P0.8 产出）

> **生成日期**：2026-05-02  
> **目的**：v3 标准化重构（5 层架构 + 模块化插件）与正在进行的 web phase 3（命名/边界收尾）之间的协调，避免 P1 与 phase 3.X 并发动同一批文件。

## 1. Phase 3 当前状态（截至 2026-05-02）

来源：`docs/refactor/phase-3-naming.md`，状态标记 🟡 **in-progress**。

| 子项 | 状态 | 证据 |
|---|---|---|
| 3.1 KnowledgePage 物理位置归位 | ✅ 已合入 | commit `1c442bc [FORK-MOD] phase 3.1: relocate KnowledgePage to its route file` |
| 3.2 STYLE.md 落地 | ✅ 已合入 | commit `cbc398b [FORK-FEAT] phase 3.2: STYLE.md frontend style guide` |
| 3.3 路由 wrapper 审计 | ⚠️ **未明确收尾**（最近两次 commit 应该是这条线的后续） |
| 后续 layout 收口 | 🔄 进行中 | `3388a62 layout align /knowledge /dev /settings`、`bb32431 settings restructure` |

**结论**：phase 3 主体（3.1 + 3.2）已合入，但仍有后续 layout/settings 调整在推进。spec 状态标记尚未翻为 ✅。

## 2. v3 P1 与 phase 3 的潜在冲突点

P1 的目标：

- 后端 4 条 WS 通道收口到 `unified_ws.py?channel=`
- 前端抽出 `web/platform/chat-runtime/`
- 4 个 chat surface 改用 `useChatSession(channel)`

P1 主要触及的前端文件：

- `web/lib/unified-ws.ts`
- `web/context/UnifiedChatContext.tsx`
- `web/app/(workspace)/chat/[[...sessionId]]/page.tsx`
- `web/app/(workspace)/agents/[botId]/chat/page.tsx`
- `web/app/(workspace)/book/components/BookChatPanel.tsx`
- `web/components/chat/home/*`

phase 3 后续触及的前端文件（推测）：

- `web/app/(utility)/{knowledge,dev,settings}/page.tsx`
- `web/components/sidebar/*`
- 各 layout 收口相关文件

**冲突风险**：低到中。P1 触及 chat 路由 + chat 组件；phase 3 触及 utility 路由 + layout 容器。**重叠最大处**：`web/app/(workspace)/chat/...` 的 layout/wrapper 是否仍在 phase 3 的"路由 wrapper 审计"范围内。

## 3. P1 启动建议

**等 phase 3 spec 状态翻为 ✅ 再启动 P1**。理由：

1. phase 3 与 v3 在前端重叠面非零；并发推进会产生 merge 冲突，浪费时间
2. v3 P0 已完成（骨架 + import-linter + smoke test），骨架待用，不会过期
3. P1 本身是中等规模重构，独立 PR 推进更稳

**若 phase 3 长期不收尾**，可以采用以下策略：

- 由 phase 3 责任人确认"剩余 phase 3.X 不再触及 chat 相关文件"，则 P1 可启动
- 或把 phase 3 剩余 item 显式纳入 v3 P1 的范围，合并推进

## 4. 监测信号

P1 启动前每周（或推 PR 前）跑一次：

```bash
git log --oneline custom/dev | head -10
grep -n "状态" docs/refactor/phase-3-naming.md
```

phase 3 spec 状态翻 ✅ 后即可启动 P1。
