# WebSocket 协议清单（v3 P1 准备产出）

> **生成日期**：2026-05-02 (P0.9)  
> **目的**：现状 5 个 WS 端点协议详记，作为 P0.10/P0.11/P0.16 后续决策的事实基础  
> **使用方式**：P1 任何动 WS 协议的改动，必须先对照本文确认契约不被破坏

---

## 0. 5 个端点全景

| # | 路径 | 文件 | 协议家族 | P1 处置 |
|---|---|---|---|---|
| 1 | `/api/v1/ws` | `unified_ws.py` (210 行) | **轮次模型**（turn-based, replayable）| 扩展 + 收口主入口 |
| 2 | `/api/v1/chat` | `chat.py` (289 行) | 简单 message-response | **退役** |
| 3 | `/api/v1/book/ws` | `book.py` | CRUD-style entity 操作 | 不动 |
| 4 | `/api/v1/tutorbot/{bot_id}/ws` | `tutorbot.py` (481 行) | per-bot adapter | 双路径过渡 |
| 5 | `/api/v1/knowledge/{kb}/progress/ws` | `knowledge.py` | 单向 progress notification | 不动 |

---

## 1. `/api/v1/ws` — unified_ws.py（轮次模型）

### 1.1 入站消息（client → server）

| `type` 字段 | 必填字段 | 说明 |
|---|---|---|
| `message` 或 `start_turn` | `payload.content`、`payload.session_id`、`payload.capability` 等 | 启动新 turn |
| `subscribe_turn` | `turn_id`、可选 `after_seq` | 订阅已有 turn 的事件流 |
| `subscribe_session` | `session_id` | 订阅 session 当前活跃 turn |
| `resume_from` | `turn_id`、`after_seq` | 重连后从指定 seq 续推 |
| `unsubscribe` | `subscription_id` | 取消订阅 |
| `cancel_turn` | `turn_id` | 取消运行中 turn |
| `regenerate` | `session_id`、可选 `overrides` (capability/tools/...) | 重跑上一条用户消息 |

### 1.2 出站事件（server → client）

字段结构：`{"type": "...", ...}`，对应 `core/stream.py:StreamEventType` 枚举。

| 事件类型 | 关键字段 | 用途 |
|---|---|---|
| `turn_started` | `turn_id`、`session_id` | 通知 turn 开始 |
| `stage_start` / `stage_end` | `stage` | 阶段切换 |
| `content` | `content`、`metadata.call_kind` | 流式文本片段 |
| `thinking` | `content` | 思考过程 |
| `tool_use` / `tool_result` | `tool_name`、`call_id` | 工具调用 |
| `result` | `data` | turn 最终结果 |
| `error` | `error_type`、`message` | 错误（含 `regenerate_busy`、`nothing_to_regenerate`）|
| `turn_completed` / `turn_canceled` | `turn_id` | turn 终态 |

### 1.3 并发约束

- **同一 session 同时只能一个活跃 turn**：第二个 `start_turn` 收到 `regenerate_busy` 错误
- **同一 client 可订阅多个 turn**：`subscribe_turn` 并发安全
- **subscription_tasks dict**：每个订阅一个 asyncio.Task

### 1.4 cleanup 模式

```python
closed = False
subscription_tasks: dict[str, asyncio.Task] = {}
# WebSocketDisconnect → 取消所有 subscription_tasks，set closed = True
```

### 1.5 消费者

- 后端：`api/main.py:include_router(unified_ws.router, prefix="/api/v1")`
- 前端：`web/lib/unified-ws.ts:UnifiedWSClient` → `web/context/UnifiedChatContext.tsx`、`web/components/quiz/QuizViewer.tsx`

---

## 2. `/api/v1/chat` — chat.py legacy（简单 message-response）

### 2.1 入站消息

```json
{
  "message": "...",                  // 必填，用户消息
  "session_id": "..." | null,        // null 表示新 session
  "history": [...]  | null,          // 可选，显式 history override
  "kb_name": "...",                  // 知识库名（用于 RAG）
  "enable_rag": true,                // 启用 RAG 检索
  "enable_web_search": false         // 启用 Web Search
}
```

### 2.2 出站事件

```json
{"type": "session", "session_id": "..."}            // session 创建/识别
{"type": "status", "stage": "...", "message": "..."} // 状态推送
{"type": "stream", "content": "..."}                 // 流式片段
{"type": "sources", "rag": [...], "web": [...]}      // 引用源
{"type": "result", "content": "..."}                 // 最终响应
{"type": "error", "message": "..."}                  // 错误
```

### 2.3 与 unified_ws 的关键差异

| 维度 | chat.py legacy | unified_ws |
|---|---|---|
| Session 管理 | `agents.chat.SessionManager` 单独实例 | `services/session/sqlite_store.py:SQLiteSessionStore` |
| Turn 概念 | 无 | 有（带 turn_id、可重放）|
| 重连恢复 | 不支持（一次性请求-响应循环）| 支持（`resume_from`/`subscribe_turn`）|
| Capability 选择 | 写死 ChatAgent | 通过 `payload.capability` 动态选择 |
| Tool 集合 | 通过 `enable_rag`/`enable_web_search` 标志 | 通过 `payload.tools` 列表 |

### 2.4 消费者

- 前端：**`web/app/(workspace)/book/components/BookChatPanel.tsx:61`**（**关键**——book chat panel piggyback 在这里）
- 主 chat 已经迁到 unified_ws，**legacy chat 唯一活跃消费者就是 BookChatPanel**

### 2.5 P1 处置

- **退役**：BookChatPanel 切到 unified_ws → 删除 chat.py 中 `@router.websocket("/chat")` 路由 → 后续整个 chat.py 可清理（保留 REST 端点 `/chat/sessions/*` 直到 P2）

---

## 3. `/api/v1/book/ws` — book.py（CRUD-style）

### 3.1 入站消息

```json
{"type": "create",            ...CreateBookRequest}
{"type": "confirm_proposal",  "book_id": "...", "proposal": {...}}
{"type": "confirm_spine",     "book_id": "...", "spine": {...}, "auto_compile": true}
{"type": "compile_page",      "book_id": "...", "page_id": "..."}
{"type": "regenerate_block",  "book_id": "...", "page_id": "...", "block_id": "...", "params_override": {}}
```

### 3.2 出站事件

通过 BookEngine 的 `BookStream`（封装自 `core/stream_bus.py:StreamBus`），8 个 stage：
- `IDEATION` / `EXPLORATION` / `SYNTHESIS` / `CRITIQUE` / `OVERVIEW` / `SPINE` / `COMPILATION` / `BLOCK`

事件类型：`stage_start` / `stage_end` / `content` / `thinking` / `progress` / `result` / `error` / `book_event`

`book_event` 子类型（`kind` 字段）：
- `proposal_ready`、`spine_ready`、`page_planned`、`block_ready`、`block_error`、`page_ready`、`compilation_complete`

### 3.3 关键不同点

book 的 WS 协议**不是会话**，而是**对 book 实体的远程操作**——每条入站消息对应一个 BookEngine API 调用。这是它无法塞进轮次模型的根本原因。

### 3.4 cleanup 模式

```python
closed = False
# 每个 book CRUD 操作 fork 一个 stream forwarder task
async def stream_into_socket(bus: StreamBus): ...
# WebSocketDisconnect → set closed → forwarder 在下次 send 检测后退出
```

### 3.5 消费者

- 前端：`web/lib/book-api.ts:208` `new WebSocket(wsUrl(\`${BASE}/ws\`))`

### 3.6 P1 处置

**完全不动**。book 是 vertical（v3.1 决策），协议保留独立。

---

## 4. `/api/v1/tutorbot/{bot_id}/ws` — tutorbot.py（per-bot adapter）

### 4.1 入站消息

由 tutorbot manager 转发到 bot 实例的 channel。具体 schema 由 channel 类型（Discord/Slack/Telegram/Matrix/...）决定。基础结构：

```json
{"type": "msg", "content": "...", ...}
```

### 4.2 出站事件

由 bot 实例的 channel 输出，类型可能包括 bot 回应、状态、error 等。**Schema 因 channel 类型变化**。

### 4.3 cleanup 模式（独特）

使用 `disconnected = asyncio.Event()` 作为 single source of truth：
- WebSocket 收发两端各一个 task
- 任一端 WebSocketDisconnect → `disconnected.set()`
- 另一端 watch `disconnected`，cooperative 退出
- 避免异常被 manager 的 broad `except Exception` 吞掉

这是 5 个 WS 中 cleanup 最复杂的，**抽 chat-runtime 时要保留这个模式**。

### 4.4 路由特殊性

`{bot_id}` 是 URL path 参数。如果要进 unified_ws，需要 `?channel=tutorbot&bot_id=...`。

### 4.5 消费者

- 前端：`web/app/(workspace)/agents/[botId]/chat/page.tsx:151` `new WebSocket(wsUrl(\`/api/v1/tutorbot/${botId}/ws\`))`

### 4.6 P1 处置

**双路径过渡**：
- 保留 `/api/v1/tutorbot/{bot_id}/ws` 作为现有路径
- 同时让 unified_ws 接受 `?channel=tutorbot&bot_id=...`，dispatch 到同一 manager
- 前端 P1.b 阶段切到 unified_ws；旧路径在 P4 features 迁移完后删除

---

## 5. `/api/v1/knowledge/{kb_name}/progress/ws` — knowledge.py（progress notification）

### 5.1 入站消息

**无**。客户端 connect 后只接收，不发送。

### 5.2 出站事件

```json
{"type": "progress", "data": {
  "stage": "completed" | "error" | "<task stage>",
  "message": "...",
  "percent": 0-100,
  "current": int,
  "total": int,
  "task_id": "..."  // 可选
}}
```

### 5.3 fast-path 行为

如果 KB 已 ready 且无活跃 task，直接 send completed → close。**不会保持长连接**。

### 5.4 消费者

- 前端：`web/hooks/useKnowledgeProgress.ts:88` `new WebSocket(...)`
- 后端：通过 `ProgressBroadcaster.get_instance()` singleton 推送

### 5.5 P1 处置

**完全不动**。这是单向通知流，与 chat 类无关，不属于 chat-runtime 范畴。

---

## 6. 5 协议形状对比矩阵

| 维度 | unified_ws | legacy chat | book | tutorbot | knowledge progress |
|---|:-:|:-:|:-:|:-:|:-:|
| 双向消息 | ✅ | ✅ | ✅ | ✅ | ❌（单向）|
| Session 概念 | ✅ | ✅ | ❌（book entity）| ✅（bot）| ❌ |
| 轮次（turn）概念 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 可重放 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 事件类型数 | 9 (StreamEventType) | 6 | 9 + 7 book_event 子类型 | 因 channel 而异 | 1 (`progress`) |
| cleanup 复杂度 | 中（subscription_tasks）| 简单 | 中（forwarder task）| **高**（disconnected event）| 极简（fast-path 退出）|
| 协议族归属 | "chat 类" | "chat 类" | "entity 操作类" | "channel adapter 类" | "notification 类" |

---

## 7. P1 之后的目标（参考）

```
P1 之后：

/api/v1/ws                           ← unified_ws 收口"chat 类"协议
                                       内部按 channel 字段 dispatch:
                                         channel=chat   → AgenticChatPipeline
                                         channel=tutorbot&bot_id=X → tutorbot manager
                                       
/api/v1/book/ws                      ← 保留独立（book vertical 自治）

/api/v1/knowledge/{kb}/progress/ws   ← 保留独立（单向流）

/api/v1/tutorbot/{bot_id}/ws         ← 保留作过渡，P4 后删
/api/v1/chat                         ← 删除（P1.d）
```

5 → 3 个端点（轮次/CRUD/notification 三种协议家族各占一个），且每个端点协议匹配自己的语义。这是 v3.1 选 B' 的核心成果。

---

## 8. 引用

- 实现：`deeptutor/api/routers/{unified_ws,chat,book,tutorbot,knowledge}.py`
- 协议核心：`deeptutor/core/stream.py`、`core/stream_bus.py`
- 前端 WS 客户端：`web/lib/unified-ws.ts`、`web/lib/book-api.ts`、`web/hooks/useKnowledgeProgress.ts`
- 进阶：v3.1 整体设计 `docs/refactor/phase-v3.1-architecture-adjustments.md`
