# P1 Scope 定稿（v3 P1 准备产出）

> **生成日期**：2026-05-02 (P0.16)  
> **状态**：等 P0.13 + P0.14 测试基线就绪 + P0.19 phase 3 ✅ 后启动  
> **依据**：v3.1 架构调整 + P0.9/P0.10/P0.12 调查 + ADR-001（B' 协议归一）

---

## 1. P1 范围（IN）

| 子阶段 | 范围 | 验收 |
|---|---|---|
| **P1.a** 后端协议归一 | unified_ws.py 加 `?channel=` dispatcher，支持 `chat`（默认）和 `tutorbot&bot_id=`；TurnRuntime/Orchestrator 接受 channel/channel_meta 并向下传 | P0.13 后端测试全绿；新 channel 参数往返 OK |
| **P1.b** 前端 chat-runtime 抽出 | 新建 `web/platform/chat-runtime/`：ChatClient（含连接池）、useChatSession hook、统一 ChatMessage 类型；`web/lib/unified-ws.ts` 改为 re-export shim | P0.14 前端单元测试全绿（5 个）|
| **P1.c** 4 surface 切换 | 主 chat / bot chat / book chat / quiz 都改用 `useChatSession({channel})`；BookChatPanel 从 `/api/v1/chat` 切到 unified_ws | P0.14 e2e 4 个全绿，特别是 book-chat-panel.behavioral.ts |
| **P1.d** legacy chat 退役 | `chat.py:@router.websocket("/chat")` 加 deprecation log → 1 个版本后删除；不动 `chat.py` 的 REST 端点 | grep 服务日志无 legacy WS 调用 |

---

## 2. P1 范围外（OUT，避免越界）

| 项 | 不在 P1 的原因 | 归到哪个阶段 |
|---|---|---|
| `co_writer` HTTP/SSE 端点 | 不是 WS，不在 P1 范围 | P3（co_writer 整体抽到 services/platform/editor/）|
| `book/ws` 协议改造 | book vertical 协议保留独立（ADR-001）| 永不 |
| `knowledge/{kb}/progress/ws` | 单向 progress 流，非会话 | 永不（可能 P3 抽 `useProgressStream` hook）|
| `agents/chat/session_manager.py` 删除 | `BaseSessionManager` 还有 solve/question 等子类 | P2（统一审视 services/session/ 抽象）|
| `chat.py` REST 端点 `/chat/sessions/*` 删除 | 先确认无前端引用 | P2 |
| math_animator / book / notebook / tutorbot 整体迁入 features/ verticals/ | 文件迁移大动作 | P4 |

---

## 3. 验收标准（per 子阶段）

### P1.a 后端协议归一

- [ ] `unified_ws.py` 接受 `start_turn` 时认得 `channel` 字段，默认 `"chat"`
- [ ] 新增 `channel="tutorbot"` + `bot_id` dispatch 到 `services.tutorbot.manager.get_tutorbot_manager()` 的对应 bot
- [ ] 既有的 `/api/v1/ws` 不带 channel 参数仍按 chat 行为
- [ ] P0.13 后端 17 单元 + 1 契约测试全绿
- [ ] `from deeptutor.api.routers.unified_ws import unified_websocket` 仍可 import（CI import-check）

### P1.b 前端 chat-runtime 抽出

- [ ] `web/platform/chat-runtime/` 含 `client.ts`、`useChatSession.ts`、`types.ts`、`README.md`
- [ ] `getOrCreateChatClient(channel)` 实现连接池：同 channel 多组件共享一个 WS
- [ ] `web/lib/unified-ws.ts` 仅 re-export 自 `chat-runtime/client.ts`，加 `console.warn('deprecated, import from @/platform/chat-runtime')`
- [ ] P0.14 前端 5 单元测试全绿
- [ ] `npm run typecheck` 通过

### P1.c 4 surface 切换

- [ ] 主 chat 使用 `useChatSession({channel: "chat"})`，行为不变
- [ ] bot chat 使用 `useChatSession({channel: "tutorbot", botId})`，行为不变
- [ ] book chat panel 使用 `useChatSession({channel: "chat"})`，**切到 unified_ws**（不再连 legacy /api/v1/chat）
- [ ] quiz 使用 `getOrCreateChatClient` 而非 `new UnifiedWSClient`，行为不变
- [ ] e2e 4 个测试全绿（chat-interactive / multi-turn / tutorbot-isolation / book-chat-panel）
- [ ] 浏览器 devtools 验证：每页只 1-2 个 WS 连接（vs 之前 1-3 个）

### P1.d legacy chat 退役

- [ ] `chat.py:websocket_chat` 入口加一行 `logger.warning("DEPRECATED: /api/v1/chat WS — use /api/v1/ws")`
- [ ] 1 个版本后跑一周生产日志，无 deprecation warning → 删除路由
- [ ] 删除前再次运行 e2e 全套确保无回归
- [ ] BookChatPanel 切换后 14 天内不出现"chat 历史丢失"反馈

---

## 4. 风险与对策

| 风险 | 触发条件 | 对策 |
|---|---|---|
| BookChatPanel 切换后用户找不到旧 chat 历史 | legacy chat 历史在 JSON、新 chat 在 SQLite，schema 不通 | 开发机已 audit 为空（dual-chat-impl-comparison.md §6.1）；上线前在每个目标环境跑同样 audit；如有数据则升级到迁移策略 B |
| 连接池实现错误导致 WS 串扰 | useChatSession 在不同 channel 间错误共享 client | 单元测试 P0.13/P0.14 含 tutorbot 隔离场景；e2e tutorbot-isolation.behavioral.ts 验证 |
| chat-runtime 抽出引入回归 bug | UnifiedChatContext 的 reducer 拆分时丢逻辑 | 主 chat 行为 e2e（chat-interactive + multi-turn）作为基线；feature flag `chat_runtime_v2` (P0.17) 可一键回退 |
| dispatcher 遗漏 cleanup | unified_ws 接管 tutorbot 后忘了 disconnected event 模式 | 把 tutorbot 现有 cleanup 模式（disconnected = asyncio.Event()）端入 unified_ws；e2e 测试验证 |
| phase 3 web 重构 collision | P1.b/c 与 phase 3 在 layout 上撞车 | 等 phase 3 ✅ 再启动 P1.b/c（P0.19 跟踪）|

---

## 5. legacy WS deprecation 节奏（P0.18 内容融合于此）

### 5.1 退役路径表

| WS 端点 | 状态 | 节奏 |
|---|---|---|
| `/api/v1/chat` | 待退役 | P1.c 完成 → P1.d 加 warning 日志 → 1 个版本后删除路由 |
| `/api/v1/tutorbot/{bot_id}/ws` | 过渡保留 | P1.c 让 unified_ws 也接 → 监控旧路径调用频率 → P4 删除 |
| `/api/v1/book/ws` | **永不退役** | book vertical 自治 |
| `/api/v1/knowledge/.../progress/ws` | **永不退役** | 单向流不属于 chat |

### 5.2 删除前 checklist

每条要删的 endpoint，删除前必须：

- [ ] 加 deprecation warning 至少 1 个版本（最少 14 天观察期）
- [ ] grep 整个仓库（前端 + 文档 + 脚本）无引用
- [ ] 至少 7 天连续日志无调用
- [ ] e2e 测试不依赖该 endpoint

---

## 6. 启动信号检查表

P1 启动前必须 all green：

- [x] ADR-001 签字（B' 决策）
- [x] P0.20 service→agents 违规修复
- [x] P0.21 prompt manager 去硬编码
- [x] P0.22 API singleton shutdown cleanup
- [x] P0.9 / P0.10 / P0.12 调查 doc 完成
- [x] P0.16 本文（P1 scope 定稿）
- [ ] P0.13 后端 17 单元 + 1 契约测试 — 阻塞
- [ ] P0.14 前端 5 单元 + 4 e2e — 阻塞 + 等 phase 3 ✅
- [ ] P0.15 测试 CI 接入 — 阻塞
- [ ] P0.17 chat_runtime_v2 feature flag — 阻塞 + 等 phase 3 ✅
- [ ] P0.19 phase 3 ✅ — 阻塞

---

## 7. 引用

- ADR-001：`docs/refactor/adr-001-ws-protocol-unification.md`
- 协议清单：`docs/refactor/ws-protocol-inventory.md`
- 双 chat 对比：`docs/refactor/dual-chat-impl-comparison.md`
- 消费者归类：`docs/refactor/ws-consumer-classification.md`
- v3.1 架构：`docs/refactor/phase-v3.1-architecture-adjustments.md`
- phase 3 协调：`docs/refactor/phase-v3-coordination.md`
