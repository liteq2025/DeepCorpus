# v3 P0+ 完工汇总（phase 3 ✅ 后接力 P1 的入口）

> **生成日期**：2026-05-06  
> **目的**：phase 3 收尾后接力 v3 P1 的工作 checklist + baseline 状态。**phase 3 ✅ 是 P1 启动的最后 gate**。

---

## 1. 当前 baseline（已验证）

| 验证项 | 命令 | 结果 |
|---|---|:-:|
| 后端 P0+ 测试 | `PYTHONPATH=. .venv/bin/python -m pytest tests/api/test_chat_router.py tests/api/test_tutorbot_isolation.py tests/api/test_notebook_behavior.py tests/api/test_ws_event_contract.py tests/features_smoke/ -q --import-mode=importlib` | **28/28** ✅ |
| 前端 node-test 套件 | `cd web && npm run test:node` | **104/104** ✅ |
| 前端 typecheck | `cd web && npm run typecheck` | 0 errors ✅ |
| 前端 lint | `cd web && npm run lint` | 0 errors（300 pre-existing warnings 不计）✅ |
| import-linter L1/L2/L3 | `PYTHONPATH=. .venv/bin/lint-imports --no-cache --verbose` | **3/3 contracts KEPT** ✅ |

整套 baseline 在 commit `dcd604c` 之上跑通。

---

## 2. P0+ 完工清单（22 项中 16 项完成）

### ✅ 已完成（16 项）

**架构地雷修复**（3）
- P0.20 `services/session/turn_runtime.py` 直接 import `NotebookAnalysisAgent` → 依赖注入 factory
- P0.21 `services/prompt/manager.py` 硬编码 MODULES 列表 → 模板化候选路径
- P0.22 `api/utils/{progress_broadcaster, task_log_stream}` shutdown hook + lifespan 集成

**决策与设计文档**（6）
- P0.9  `ws-protocol-inventory.md`
- P0.10 `dual-chat-impl-comparison.md`
- P0.11 `adr-001-ws-protocol-unification.md`（B' 决策）
- P0.12 `ws-consumer-classification.md`
- P0.16 `phase-v3-p1-scope.md`
- P0.18 deprecation 节奏（融在 P0.16 §5）

**后端测试基线**（1 = 4 文件 / 20 个测试函数）
- P0.13 `test_chat_router.py` (8) + `test_tutorbot_isolation.py` (5) + `test_notebook_behavior.py` (4) + `test_ws_event_contract.py` (3 sub-tests)

**前端测试基线**（3）
- P0.14a `ws-url-upgrade.test.ts`（5 cases，https→wss + 路径边界 + ?channel= 透传）
- P0.14d `chat-message-types.test.ts`（4 cases，FE↔BE ChatMessage union 对齐）
- P0.14e `stream-dispatch.test.ts`（6 cases，`shouldAppendEventContent` 全分支）

**Feature flag**（1）
- P0.17 `web/lib/feature-flags.ts` + `feature-flags.test.ts`（4 层优先级 + 6 cases）

**CI 集成 + 状态跟踪**（2）
- P0.15 `tests/features_smoke/` 接入 `.github/workflows/tests.yml`
- P0.19 phase 3 状态跟踪 doc

### ⏸ 阻塞中（6 项）—— 等 phase 3 ✅

| ID | 任务 | 阻塞原因 |
|---|---|---|
| #24 P0.14b | `web/tests/message-composer.vitest.tsx` | 需 vitest+RTL+jsdom；动 web/components/chat 与 phase 3 layout 工作可能冲突 |
| #25 P0.14c | `web/tests/use-chat-session.vitest.tsx` | **useChatSession hook 还不存在**——必须先 P1.b 抽出 chat-runtime |
| #28 P0.14f | `web/tests/e2e/chat-interactive.behavioral.ts` | 需 mock LLM 后端 + 起 dev server |
| #29 P0.14g | `web/tests/e2e/multi-turn.behavioral.ts` | 同 #28 |
| #30 P0.14h | `web/tests/e2e/tutorbot-isolation.behavioral.ts` | 同 #28 |
| **#31 P0.14i** | `web/tests/e2e/book-chat-panel.behavioral.ts` ★ | **P1 切换核心保险**——验证 BookChatPanel 从 legacy /api/v1/chat 切到 unified_ws 后行为不变 |

---

## 3. phase 3 ✅ 后的接力顺序（建议）

```
phase 3 spec 状态翻 ✅
    │
    ▼
[Step 1]  P0.14b/c/f-i 6 项前端测试启动
          ├─ P0.14b/c 走 vitest+RTL（已有 EmptyState.vitest.tsx 等先例）
          └─ P0.14f-i 4 个 e2e 需先建 mock LLM 后端
              选项 A: docker-compose 起 stub openai-compat server
              选项 B: 用 msw WebSocketHandler（已在 node_modules）
    │
    ▼
[Step 2]  6 项测试全绿 → 启动 P1.a（后端协议归一）
          见 docs/refactor/phase-v3-p1-scope.md §3 P1.a 验收
    │
    ▼
[Step 3]  P1.a 完成 → P1.b（前端 chat-runtime 抽出）
          这步会产出 useChatSession hook，P0.14c 终于能写
    │
    ▼
[Step 4]  P1.b 完成 → P1.c（4 surface 切换）
          P0.14i book-chat-panel.behavioral.ts 在此点最有价值
    │
    ▼
[Step 5]  P1.c 完成 → P1.d（legacy chat 退役）
          见 phase-v3-p1-scope.md §5 deprecation 节奏
```

---

## 4. 重要提醒

### 4.1 P1 启动**不需要**先合 P0+

P0+ 的所有产出都已在 `custom/dev` 上 commit。phase 3 进展基于这些 commit 之上。冲突面已通过架构隔离（P0+ 文件全部不与 phase 3 触及的 settings/layout/dev 重叠）证明可控。

### 4.2 ADR-001 决策回顾（B'）

P1 范围只收口 **chat 类 WS**：
- ✅ 收口：legacy `/api/v1/chat` → 删除；BookChatPanel 切到 unified_ws
- 🔄 双路径过渡：`/api/v1/tutorbot/{bot_id}/ws` 继续保留，同时 unified_ws ?channel=tutorbot 也接
- ❌ **保留独立**：`/api/v1/book/ws`（book vertical 自治）、`/api/v1/knowledge/.../progress/ws`（单向流）

### 4.3 v3.1 决策回顾

book → `verticals/book/`（不进 features/）。相关迁移在 P4 阶段。

### 4.4 测试覆盖映射表

| 风险 | 由哪些测试守 |
|---|---|
| 切到 unified_ws 后丢历史 | 后端 #1 #2 + e2e #28 #29 |
| 协议字段漂移 | 后端契约 (3 sub-tests) + 现有 ws-events.gen.ts drift gate |
| tool use 事件错序 | 后端 #4 |
| 多轮上下文丢失 | 后端 #8 + e2e #29 |
| 资源泄漏（任务/连接）| 后端 #6 + 前端 stream-dispatch |
| 通道串扰 | 后端 tutorbot 5 项 + e2e #30 |
| 前端连接风暴 | 前端 ws-url-upgrade + e2e（playwright 加 ws counter）|
| BookChatPanel 切换出错 | **e2e #31 ★** |
| chat 显示错乱 | 前端 stream-dispatch.test.ts ★ |
| FE↔BE 协议错位 | 前端 chat-message-types + 后端 ws_event_contract |
| 回退路径失效 | 前端 feature-flags.test.ts |

---

## 5. P0+ 期间发现的副产品

| 类型 | 内容 | commit |
|---|---|---|
| 生产 bug 修复 | `notebook /health` 被 `/{notebook_id}` 路由屏蔽 → 永远 404 | `0cf0340` |
| import 风格统一 | `web/lib/stream.ts` 从 `@/lib/unified-ws` alias → 相对路径 | `dcd604c` |
| 数据 audit | dev 机 legacy chat sessions = 0 → P1 数据迁移可走 C 简化方案 | `co_writer_data_migration.md` 同款节奏 |

---

## 6. 引用

- 整体设计：`phase-v3.1-architecture-adjustments.md`
- P1 scope：`phase-v3-p1-scope.md`
- 协议清单：`ws-protocol-inventory.md`
- 双 chat 对比：`dual-chat-impl-comparison.md`
- ADR-001 B' 决策：`adr-001-ws-protocol-unification.md`
- 消费者归类：`ws-consumer-classification.md`
- phase 3 协调：`phase-v3-coordination.md`
- co_writer 数据：`co_writer_data_migration.md`
