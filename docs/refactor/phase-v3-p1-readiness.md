# P1 启动前风险评估与准备清单

> **生成日期**：2026-05-02  
> **目的**：v3 P1（"后端 4 条 WS 收口 + 前端 chat-runtime 抽出"）启动前，识别设计文档遗漏的真实施工面，并给出一份"必须先做完才能动 P1"的准备清单，以最大限度降低功能错误风险。  
> **结论先放**：P1 比设计文档假设的复杂得多。**直接开干会出大问题**，建议先完成本文 §4 的 11 项准备，再分 4 个子阶段推进 P1。

---

## 1. 真实施工面（vs 设计文档假设）

### 1.1 设计文档假设

> 后端 4 条 WS 通道收口到 `unified_ws.py?channel={chat|book|tutorbot|notebook}`；前端抽 `chat-runtime`，4 个 chat surface 改用 hook。

### 1.2 现场取证后的真实情况

**后端实际 WS 端点：5 条（不是 4 条）**

| # | 路径 | 文件 | 协议特征 | 用途 |
|---|---|---|---|---|
| 1 | `/api/v1/ws` | `unified_ws.py` (210 行) | **轮次化、可重放**，7 种 client message type（message / start_turn / subscribe_turn / subscribe_session / resume_from / unsubscribe / cancel_turn / regenerate） | 主 chat |
| 2 | `/api/v1/chat` | `chat.py` (289 行) | **legacy 简单 `{message, session_id}` 协议**，自带独立 SessionManager | 主 chat 旧路径 + **book chat panel 仍在用** |
| 3 | `/api/v1/book/ws` | `book.py` | **领域 CRUD 协议** `{type: "create" / "confirm_proposal" / "confirm_spine" / "compile_page" / ...}` | book engine 编辑/编译流 |
| 4 | `/api/v1/tutorbot/{bot_id}/ws` | `tutorbot.py` (481 行) | per-bot 通道适配，自带 disconnected event 协调 | bot chat |
| 5 | `/api/v1/knowledge/{kb}/progress/ws` | `knowledge.py` | **单向进度通知**（不是会话） | KB 索引进度 |

**前端实际 WS 消费者：6+ 处（不是 4 处）**

| # | 文件 | 连的端点 | 类型 |
|---|---|---|---|
| 1 | `web/lib/unified-ws.ts` → `web/context/UnifiedChatContext.tsx` | `/api/v1/ws` | 主 chat |
| 2 | `web/app/(workspace)/agents/[botId]/chat/page.tsx` | `/api/v1/tutorbot/{botId}/ws` | bot chat |
| 3 | `web/app/(workspace)/book/components/BookChatPanel.tsx` | **`/api/v1/chat`** ← legacy 路径！ | book chat panel |
| 4 | `web/lib/book-api.ts` | `/api/v1/book/ws` | book engine 编辑流 |
| 5 | `web/hooks/useKnowledgeProgress.ts` | `/api/v1/knowledge/.../progress/ws` | KB 进度 |
| 6 | `web/components/quiz/QuizViewer.tsx` | （待确认） | quiz 流 |
| 7 | `web/lib/dev-registry.ts` | （dev 工具，可能不算）| 开发期使用 |

### 1.3 设计文档与现实的 5 个差距

| # | 设计假设 | 现实 | 影响 |
|---|---|---|---|
| **G1** | co_writer 用 WS | co_writer 用 HTTP POST `/edit_react/stream`（SSE 不是 WS）| P1 不应包含 co_writer，归 P3 |
| **G2** | 4 条 WS | 5 条（漏了 knowledge/progress） | P1 范围要么扩，要么明确不收口 progress WS |
| **G3** | 4 个前端 surface | 6+ 处（多了 KB progress + quiz + dev）| 抽出 chat-runtime 时要明确是否覆盖 progress 类 WS |
| **G4** | 协议只是"channel 不同" | 5 套协议**语义本质不同**（轮次 vs 简单 chat vs CRUD vs adapter vs progress）| **不能简单加 ?channel= 转发**，需要协议适配层 |
| **G5** | book chat 是独立实现 | book chat panel **piggyback 在 legacy `/api/v1/chat` 上** | 后端有**两套并行的 chat 实现**（unified_ws 与 chat.py），P1 必须先消除二元性 |

---

## 2. 关键风险盘点

### 2.1 🔴 高危风险（不处理则 P1 必出问题）

**R1. 后端两套 chat 实现并存（unified_ws.py vs chat.py）**  
- `chat.py` 自带 `SessionManager()` 单例 + `ChatAgent`（`deeptutor.agents.chat`）
- `unified_ws.py` 走 `TurnRuntimeManager` + 不同的 session 模型
- 两套 session **存储和编号体系可能不同**，互不可见
- **风险**：把 `BookChatPanel` 切到 unified_ws 后，历史会话查不到、消息编号断层
- **缓解**：P1 第 1 步必须搞清楚两套 SessionManager 的差异，定义迁移映射

**R2. 协议适配层缺失**  
- book/ws 用 `{type:"confirm_proposal", proposal:...}` 这种 CRUD 风格
- unified_ws 用 `{type:"start_turn", message:...}` 这种轮次风格
- **风险**：硬塞一个 `?channel=book` 到 unified_ws 会让 router 变成 if-elif 巨石，且 book engine 的 CRUD 语义无法装进"轮次"模型
- **缓解**：P1 设计阶段先决定**协议归一策略**——是统一为轮次模型（book engine 改造）还是 unified_ws 接受多协议（router 内部 dispatcher）

**R3. 测试覆盖几乎为零**  
- 后端 WS 测试只有 `test_unified_ws_turn_runtime.py` 一个；chat/book/tutorbot/knowledge WS 全无 WS 级测试
- 前端 e2e 只有 `chat-page.visual.ts`（视觉快照），无功能行为测试，无 book/bot chat 的 e2e
- **风险**：P1 改完没有任何方式知道是否破坏了原有功能
- **缓解**：P1 启动前必须补 WS 集成测试 + e2e 行为测试基线

### 2.2 🟡 中危风险（不处理可能出问题）

**R4. 前端 chat 有 4 套消息类型（不只是 4 个 surface）**  
- `lib/unified-ws.ts:ChatMessage`、`lib/session-api.ts:SessionMessage`、`UnifiedChatContext.tsx:MessageItem`、页内 `ChatMsg/ChatMessage` × 2
- **风险**：抽 chat-runtime 时如果只统一 ChatMessage 而不统一持久化模型 SessionMessage，UI 仍要在多套类型间转换
- **缓解**：P1 范围内同时定义 ChatMessage 与 SessionMessage 的关系（generated 还是手写）

**R5. cleanup ordering / 资源泄漏**  
- 每个 WS endpoint 都自己实现 disconnected/closed/safe_send 协调逻辑，模式略有差异
- **风险**：抽 ChatClient 时如果忽略了 tutorbot 的 disconnected event 模式，后台任务会泄漏
- **缓解**：把每个 WS endpoint 的 cleanup 流程画成 sequence 图，再抽出共性

**R6. 并发 turn 假设差异**  
- unified_ws 设计上每 session 同时只有 1 个 turn（regenerate_busy 错误）
- tutorbot 可能允许多并发（多渠道并发消息）
- book/ws 没有 turn 概念
- **风险**：用同一个 ChatClient 包装时，并发模型的差异可能让 tutorbot 的多消息阻塞、或 book 的并发请求乱序
- **缓解**：在 useChatSession hook 设计时显式声明并发模型（per channel）

**R7. 认证/中间件不一致**  
- 不同 router 可能挂的中间件不同（rate limit、auth、logging）
- **风险**：收口到 unified_ws 后某些路径可能丢失或新增中间件
- **缓解**：P1 第 1 步盘点每个 WS 端点的中间件栈

### 2.3 🟢 低危风险（提一下）

- **R8. dev-registry / quiz 的 WS 用途不明**：可能是 dev-only 或不属于 chat 范畴，P1 应明确 out of scope
- **R9. 外部消费者**：grep `docs/`、`README.md`、`scripts/` 未发现引用 legacy WS 路径，外部破坏风险低
- **R10. phase 3 仍 🟡**：见 phase-v3-coordination.md，P1 启动需等 phase 3 spec 翻 ✅

---

## 3. P0 复盘——是否应该补打补丁

| P0.x | 是否够 | 缺什么 |
|---|---|---|
| P0.1 AGENTS.md | ✅ 够 | - |
| P0.2 services 骨架 | ✅ 够 | - |
| P0.3 features/_TEMPLATE | ✅ 够 | - |
| P0.4 web 三层骨架 | ✅ 够 | - |
| P0.5 import-linter | ✅ 够 | warn-only 模式正确 |
| P0.6 smoke test | ⚠️ **不够** | 只测 router import，**没测 WS 行为**。本评估的 R3 风险未被 P0 覆盖。建议补一个 `P0.9 WS 集成测试基线` |
| P0.7 co-writer audit | ✅ 够 | 顺带发现 co_writer 不是 WS，提前修正了 P1 范围 |
| P0.8 phase 3 协调 | ✅ 够 | 已识别 P1 启动条件 |

**结论**：P0 整体到位，但 **R3（测试覆盖空白）必须在 P1 启动前补上**——否则 P1 改完没法验证。

---

## 4. P1 启动前必须做完的 11 项准备

> 按依赖顺序排。完成后才能拆 P1 子任务。

### 4.1 知识/认知补全（4 项）

**P0.9 WS 端点协议清单（doc）**  
对 5 个 WS 端点逐个产出协议表：client→server message types 与字段、server→client event types 与字段、cleanup 模式、并发约束、中间件栈。落地为 `docs/refactor/ws-protocol-inventory.md`。  
**预估**：半天。**产出**：1 份 doc，~300 行。

**P0.10 后端两套 chat 实现差异分析（doc）**  
对比 `chat.py + agents.chat.SessionManager + agents.chat.ChatAgent` 与 `unified_ws.py + TurnRuntimeManager + AgenticChatPipeline`，写差异清单：session 存储位置、消息 schema、tool 集合、错误处理、扩展点。结论：哪条路是 v3 的"正统"，旧路如何 deprecate。  
**预估**：半天。**产出**：`docs/refactor/dual-chat-impl-comparison.md`，约 200 行。

**P0.11 决定协议归一策略（决策）**  
基于 P0.9 + P0.10，决策：
- 选项 A：所有特性都改造为"轮次模型"，unified_ws 只有一种协议
- 选项 B：unified_ws 内部按 channel dispatch 到不同 handler，对外仍是单端点但内部多协议
- 选项 C：保留多 WS 端点不收口，前端只做"客户端层面的统一"（ChatClient 内部按 channel 选不同 URL）

每个选项的工作量、风险、长期可维护性写清。**待你选择**。  
**预估**：1 小时讨论。**产出**：决策记录附在 P1 设计文档里。

**P0.12 前端 6+ WS 消费者归类**  
逐个判定属于：(a) chat 类（要走 chat-runtime）、(b) progress 类（独立的 useProgressStream hook）、(c) dev/quiz 类（不在 P1 范围）。  
**预估**：1 小时。**产出**：`docs/refactor/ws-consumer-classification.md`，1 张表。

### 4.2 测试基线（3 项）—— 补 R3

**P0.13 后端 WS 集成测试**  
为现有 5 个 WS 端点各补一个最小集成测试（fastapi.testclient.TestClient.websocket_connect），断言：连接成功 + 发一条消息 + 收到至少一个事件。**不测业务正确性**，只测"通信不破"。  
**预估**：1 天。**产出**：`tests/api/test_ws_integration_*.py` 5 个文件。

**P0.14 前端 chat 行为 e2e 基线**  
扩展 `web/tests/e2e/`，为 4 个 chat surface 各加一个 Playwright 行为测试：发一条消息、断言收到 streaming 响应、断言历史可滚动。**当前只有 chat-page 的视觉快照不够**，需要功能性断言。  
**预估**：2 天。**产出**：`web/tests/e2e/{main-chat,bot-chat,book-chat}.behavior.ts` + 完善已有 chat-page。

**P0.15 把 P0.13/P0.14 接入 CI 必跑**  
在 `.github/workflows/tests.yml` 加 e2e job（headless Playwright）。如不能上 CI，至少加到 `Makefile` 一个命令 `make verify-p1-baseline`。  
**预估**：半天。**产出**：CI 配置。

### 4.3 可逆性 + 范围澄清（3 项）

**P0.16 P1 范围正式定稿**  
基于 P0.9–P0.12 的产出，写 `docs/refactor/phase-v3-p1-scope.md`，明确：
- IN：哪些 WS 端点、哪些前端 surface、哪些消息类型
- OUT：knowledge/progress、quiz、dev-registry、co_writer/SSE
- 拆分：P1.a 后端协议归一 / P1.b 前端 chat-runtime 抽出 / P1.c 前端 4 surface 切换 / P1.d 旧路径 deprecation
- 验收标准 per 子阶段

**预估**：半天。**产出**：1 份 doc。

**P0.17 Feature flag / 灰度策略**  
设计一个开关让 chat surface 在新旧实现之间切换（环境变量或 LocalStorage flag），P1 灰度期可即时回退。  
**预估**：半天。**产出**：在 `web/lib/feature-flags.ts`（如不存在则新建）加 `chat_runtime_v2` flag + 文档说明。

**P0.18 旧 WS 路径 deprecation 计划**  
对每条要废弃的旧 WS 路径，定义：
- 何时新增 deprecation log（每次连接打 warning）
- 何时返回 410 Gone
- 何时物理删除代码  
**预估**：1 小时。**产出**：写入 P1 scope doc。

### 4.4 依赖前置（1 项）

**P0.19 phase 3 收尾确认**  
跟 phase 3 责任人确认：剩余 phase 3 工作（layout/settings 收口）不会再触及 chat 相关文件；或把剩余 phase 3 显式纳入 P1 范围。  
**预估**：1 小时沟通。**产出**：phase-v3-coordination.md 状态翻 ✅，或 P1 scope 内含明确合并条款。

---

## 5. 准备阶段总预估

| 项 | 工作量 |
|---|---|
| 4.1 认知补全（P0.9–P0.12）| ~1.5 天 |
| 4.2 测试基线（P0.13–P0.15）| ~3.5 天 |
| 4.3 可逆性/范围（P0.16–P0.18）| ~1.5 天 |
| 4.4 phase 3 协调（P0.19）| 即时 |
| **合计** | **~6–7 天专注工作**（不含等 phase 3 收尾的 idle）|

值不值？参考：P1 没准备直接干，**预期返工 + 排查 + 回滚的成本约 2–3 周**。前置 1 周准备是**正期望投资**。

---

## 6. 推荐启动节奏

```
当下：审本文 → 同意/调整 P0.9–P0.19 任务清单
  ↓
第 1 周：完成 P0.9–P0.12（认知补全）+ P0.16（P1 scope 定稿）
  ↓ ⚠️ 决策点：协议归一策略 (P0.11) 锁定
第 2 周：完成 P0.13–P0.15（测试基线）+ P0.17–P0.18（可逆性）
  ↓ ⚠️ 验证点：基线测试在 CI 上稳定跑通 ≥ 3 天
第 3 周：等 phase 3 ✅ + 启动 P1.a（后端协议归一）
  ↓
P1.a OK 后再 P1.b → P1.c → P1.d
```

每个 P1 子阶段完成必须：
1. 基线测试全绿（无回归）
2. 灰度开关可即时切回旧路径
3. 至少 1 天的生产/staging 观察期

---

## 7. 待你拍板的 4 件事

1. **是否同意补 P0.9–P0.19 共 11 项准备**？（推荐 ✅）
2. **P0.11 协议归一选 A/B/C 哪个**？（我倾向 B：内部 dispatcher，最稳）
3. **测试基线的最低门槛**：5 个后端 WS 集成测试 + 4 个前端 e2e 行为测试，是否够？（如不够请增补）
4. **本文 §6 启动节奏**是否接受 3 周节拍？

回完 4 个，我把 P0.9–P0.19 拆成 TaskCreate 任务序列，开始执行。
