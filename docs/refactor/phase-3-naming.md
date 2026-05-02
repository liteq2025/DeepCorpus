# Phase 3 — 命名 / 边界文档收尾

> **状态**：🟡 in-progress
> **估时**：~2 天
> **验收**：KnowledgePage 物理位置归位；`STYLE.md` 落地；多余的 wrapper 检查清楚

## 0. 为什么做

Phase 0 / 0.5 / 1 / 2 引入了大量原语 / 决策 / 文件布局。规则散落在 6 个 phase doc 里，新人或下次拆 mega-page 的人要去翻一遍。

Phase 3 把这些**已成事实的规则**收口到一篇 STYLE.md，外加修掉 Phase 2 顺手发现的最后一个边界问题（KnowledgePage）。

不是写新规，是把**已经在用的规则**写下来。

## 1. 范围

| # | 项 | 描述 |
|---|---|---|
| 1 | `KnowledgePage` 物理位置归位 | `components/knowledge/KnowledgePage.tsx` 移回到 `app/(utility)/knowledge/page.tsx` 内联 |
| 2 | 路由 wrapper 审计 | 所有 `app/**/page.tsx` 是否「实质=渲染另一个 component」？符合 inline 标准的归位 |
| 3 | `STYLE.md` 落地 | 收口已有规则到一处可索引的 doc |

## 2. KnowledgePage 现状

```
app/(utility)/knowledge/page.tsx                   19 行（仅 Suspense wrapper）
  ↓
components/knowledge/KnowledgePage.tsx             198 行（实际页面）
```

历史原因：Next.js useSearchParams() 必须包 Suspense，原作者把页面体放到 components/ 下，让 route 文件只做 Suspense 边界。

**问题**：
- `components/knowledge/` 既装 sub-components（KnowledgeBaseList / Detail / Tab 等）又装 *page* 本身——两种概念混在一个目录
- 与 /agents / /playground 等路由的「page 自己就是 page」模式不一致
- 新人读代码先到 `app/(utility)/knowledge/page.tsx`，发现是个空壳要再跳一次

**修复**：把 `KnowledgePage` 函数体搬回 route 文件，删除 `components/knowledge/KnowledgePage.tsx`。Suspense wrapper 保留（useSearchParams 还在）。

## 3. 路由 wrapper 审计

| 路由 | 行数 | 形态 | 处置 |
|---|:-:|---|---|
| `/memory/page.tsx` | 5 | redirect | ✅ 保留（pure redirect） |
| `/space/page.tsx` | 5 | redirect | ✅ 保留 |
| `/dev/page.tsx` | 10 | `<DevDashboard initialView={...} />` | ✅ 保留（DevDashboard 683 行，inline 进 route 会膨胀） |
| `/knowledge/page.tsx` | 19 | Suspense + `<KnowledgePage />` | 🔴 内联（本期处置） |
| 其他 page.tsx | 138-2163 | 自己就是 page | ✅ 已合规 |

## 4. STYLE.md 内容大纲

`docs/refactor/STYLE.md`（new）应该是 **rules quick reference**，不是教程。每条规则一行，配指针到对应 phase doc。

```
1. Tokens & 颜色
2. Typography canonical scale
3. Layout 9 层栈速查
4. Overlay 决策树（sheet-first）
5. Icon 尺寸规范
6. 文件组织
   - app/(group)/<route>/page.tsx       — 路由页面（不要再分一层）
   - components/<feature>/<X>.tsx       — feature sub-component
   - components/ui/*.tsx                — shadcn 原语
   - components/layout/*.tsx            — Layout primitives
   - lib/<feature>-helpers.ts           — 纯 helpers / types / 常量
   - lib/<resource>-api.ts              — fetch wrappers
   - hooks/use<Feature>.ts              — stateful hooks
7. 命名
   - 组件 / 类 → CamelCase
   - 文件 → 与默认 export 同名
   - hook → useX
   - constant → SCREAMING_SNAKE
8. 禁止 / 弃用
   - raw window.confirm() → useConfirm()
   - 自撸 modal → Sheet
   - text-[Npx] off-scale → canonical scale
   - inline 计数 pill → <Badge>
9. 视觉基线 sweat
10. WS 类型 codegen
```

## 5. 进度日志

| 日期 | slice | 事件 |
|---|---|---|
| 2026-05-02 | — | 规格落地（本文档）。下一步：KnowledgePage relocation。 |
