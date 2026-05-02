# 后端两套 chat 实现差异分析（v3 P1 准备产出）

> **生成日期**：2026-05-02 (P0.10)  
> **目的**：对比 legacy chat（chat.py + agents.chat.SessionManager + ChatAgent）vs 统一架构（unified_ws.py + TurnRuntimeManager + AgenticChatPipeline），明确 v3 正统路径与 deprecation 策略  
> **关键结论**：两套实现的 **session 存储后端完全不同**（JSON file vs SQLite），P1 切换需处理数据迁移

---

## 1. 实现栈对比

| 层 | Legacy（chat.py 路径）| Unified（unified_ws.py 路径）|
|---|---|---|
| WS 路由 | `api/routers/chat.py:websocket_chat` | `api/routers/unified_ws.py:unified_websocket` |
| 协议 | 简单 `{message, session_id, ...}` 一来一回 | 7 种 client message type，turn-based + replayable |
| Turn 概念 | ❌ 无 | ✅ 有（`turn_id`、`subscribe_turn`、`resume_from`、`cancel_turn`、`regenerate`）|
| 编排器 | 直接调 `ChatAgent` (`agents/chat/chat_agent.py`, 428 行) | `runtime/orchestrator.py:ChatOrchestrator` → 选 capability → 通常走 `agents/chat/agentic_pipeline.py` (1499 行) |
| Session 管理 | `agents/chat/session_manager.py:SessionManager(BaseSessionManager)` | `services/session/sqlite_store.py:SQLiteSessionStore` |
| Turn 管理 | ❌ 无 | `services/session/turn_runtime.py:TurnRuntimeManager` |
| 工具集合 | `enable_rag` / `enable_web_search` 两个布尔开关 | `payload.tools` 任意工具列表（来自 `runtime/registry/tool_registry.py`）|
| Capability 选择 | 写死 chat | 通过 `payload.capability`（chat / deep_solve / deep_question / ...）|

---

## 2. **存储后端差异（关键迁移点）**

### 2.1 Legacy：JSON 文件

- 位置：`data/user/workspace/chat/chat/sessions.json`
- 写入：`SessionManager` (继承 `BaseSessionManager` from `services.session`)
- 数据结构（节选）：
  ```json
  {
    "<session_id>": {
      "session_id": "chat_...",
      "title": "First user message...",
      "messages": [{"role": "user|assistant", "content": "...", "sources": [...], "timestamp": "..."}],
      "settings": {"enable_rag": true, "enable_web_search": false, "kb_name": "..."},
      "created_at": "...",
      "updated_at": "..."
    }
  }
  ```
- ID 前缀：`chat_`
- session 列表加载方式：一次性读整个 JSON 到内存

### 2.2 Unified：SQLite 数据库

- 位置：`data/user/chat_history.db`（已观察到 ~20MB，活跃使用）
- 写入：`SQLiteSessionStore`
- 表结构（推断自方法签名）：
  - sessions 表：session_id、title、created_at、updated_at、metadata、active_turn_id、compressed_summary
  - messages 表：message_id、session_id、role、content、metadata、turn_id、seq
  - turns 表：turn_id、session_id、started_at、completed_at、status
  - events 表：seq、turn_id、type、payload（用于 replay）
- ID 前缀：根据 capability 不同（无统一前缀）
- 异步访问（`async def get_session`、`async def add_message`、...）

### 2.3 数据迁移影响

**BookChatPanel 是 legacy 的唯一活跃消费者**——P1 切换前后：

| 场景 | Legacy（迁移前） | Unified（迁移后） | 用户可见后果 |
|---|---|---|---|
| 用户在 BookChatPanel 创建的历史 chat | 存在 `chat/chat/sessions.json` | 看不到 | 历史"消失" |
| 新发的消息 | 写 JSON | 写 SQLite | 不可逆——新旧 session 无关联 |
| 主 chat 历史 | 已经在 SQLite | 不变 | 不受影响 |

### 2.4 P1 的 3 种迁移策略

| 策略 | 描述 | 工作量 | 数据风险 |
|---|---|---|---|
| **A 一次性迁移** | 写脚本读 `chat/chat/sessions.json` → 转换为 SQLite 行 → BookChatPanel 切到 unified_ws | 中（脚本 + schema 映射） | 低（dry-run 可验证）|
| **B 双写过渡** | BookChatPanel 切到 unified_ws；旧 JSON 保留只读；新历史只在 SQLite | 小 | 中（用户看不到旧 BookChatPanel 历史，需公告）|
| **C 直接抛弃** | BookChatPanel 切到 unified_ws；旧 JSON 不管；用户从空历史开始 | 极小 | **高**（用户体验差）|

**v3.1 推荐**：**B 双写过渡 + 一行公告**。理由：
1. 开发机当前 `chat/chat/sessions.json` 是否存在/有数据，需 audit（见 §6）
2. BookChatPanel 是次要入口（主 chat 已经在 unified），数据丢失影响面有限
3. 如果 audit 发现历史数据多，再升级到 A

---

## 3. 调用链对比

### 3.1 Legacy

```
client → /api/v1/chat (WS)
  → chat.py:websocket_chat
    → SessionManager.add_message(user) → 写 chat/chat/sessions.json
    → ChatAgent.chat(message, history, kb_name, enable_rag, enable_web_search)
      → 直接 LLM 调用 + RAG（如启用）+ Web Search（如启用）
      → yield streaming tokens → ws.send_json({"type": "stream", ...})
    → SessionManager.add_message(assistant) → 写 chat/chat/sessions.json
    → ws.send_json({"type": "result", ...})
```

### 3.2 Unified

```
client → /api/v1/ws (WS) {type: "start_turn", payload: {capability, content, tools, ...}}
  → unified_ws.py:unified_websocket
    → TurnRuntimeManager.start_turn(payload)
      → SQLiteSessionStore.create_session_if_needed
      → SQLiteSessionStore.add_message(user)
      → 创建 turn_id、active_turn_id
      → 异步启动 _run_turn(execution)
        → ContextBuilder 构造 UnifiedContext
        → ChatOrchestrator.handle(context)
          → CapabilityRegistry.get(capability) → e.g. ChatCapability
            → AgenticChatPipeline.run(context, stream)
              → LLM tool-use loop（多轮 tool calls + 推理）
              → 通过 StreamBus 推 StreamEvent
        → 每个 StreamEvent 持久化 + 推到客户端
      → SQLiteSessionStore.add_message(assistant)
      → turn_completed
```

**复杂度差异**：unified 多 4 层（TurnRuntime / Orchestrator / Capability / AgenticPipeline）。换来：可重放、可取消、可 regenerate、tool 灵活、capability 可切换。

---

## 4. **v3 正统路径**

毫无悬念是 **unified_ws.py + TurnRuntimeManager + ChatOrchestrator + Capability + AgenticChatPipeline**。理由：

1. 已经是主 chat 的实现（`web/lib/unified-ws.ts` 唯一对接）
2. 支持 turn 重放/恢复（生产关键）
3. capability 可插拔（v3.1 协议契合）
4. 用 SQLite，可索引、可 join、可分析（vs JSON 全量加载）
5. tool 列表灵活而非 enable_xxx 布尔位

**legacy 的存在唯一价值**：当年简单实现，BookChatPanel 还在用。

---

## 5. Deprecation 节奏

| 阶段 | 动作 | 验证 |
|---|---|---|
| **P1.a** | unified_ws 内部加 dispatcher，准备接 BookChatPanel；不动现有路径 | 单元测试 |
| **P1.b** | 前端 chat-runtime 抽出，BookChatPanel 改用 `useChatSession({channel: 'chat'})` | e2e: book-chat-panel.behavioral.ts（见 P0.14）|
| **P1.c** | 数据迁移：跑 `scripts/migrate_legacy_chat_sessions.py`（待写）将 JSON 历史导入 SQLite；保留 JSON 只读副本 | 手工对比：旧 session 在新 UI 里能展开 |
| **P1.d** | `chat.py:@router.websocket("/chat")` 加 deprecation log（每次 connect 打 warning），保留 1 个版本 | grep 服务日志看是否还有调用 |
| **P1.d+1** | 删除 `@router.websocket("/chat")` + `SessionManager` (legacy chat 部分) | smoke 测试无人调用 |
| **P2** | 整个 `agents/chat/session_manager.py` 重新审视——`BaseSessionManager` 是否还有意义？solve/question 等其他模块可能也在用 | 看下面 §7 |

---

## 6. 待 audit 的事

### 6.1 开发机数据状况（已 audit, 2026-05-02）

实际跑了一遍：

| 文件 | sessions | messages | version |
|---|---|---|---|
| `data/user/workspace/chat/chat/sessions.json` | **0** | **0** | 1.0 |
| `data/user/workspace/chat/deep_solve/sessions.json` | **0** | **0** | 1.0 |

**结论**：开发机 legacy chat sessions 全空。**P1.c 不需要写迁移脚本**——直接采用最简策略 **C（抛弃旧 schema）**，因为旧 schema 已无数据可丢。

⚠️ 但**生产/其他用户机器**可能有数据：P1.c 上线前要在每个目标环境跑同样 audit。如果其他机器有数据，再回到策略 B 写脚本。

### 6.2 其他 BaseSessionManager 子类（不影响 P1，备查）

`agents/solve/session_manager.py:SolverSessionManager` 也继承 `BaseSessionManager`。意味着 solve 也走 JSON 文件存储。P2 时统一考虑：是否所有模块都迁移到 SQLite？

---

## 7. P1 范围 vs P2 范围（避免越界）

| 任务 | P1 内做？ |
|---|:-:|
| BookChatPanel 切到 unified_ws | ✅ |
| 删除 chat.py 的 WS 路由 | ✅ |
| 数据迁移脚本（JSON → SQLite）| ✅ |
| 删除整个 `agents/chat/session_manager.py` | ❌（其他模块可能有共享基础——P2 评估）|
| 删除 chat.py REST 端点 `/chat/sessions/*` | ❌（先确认无前端引用——P2）|
| 整理 `BaseSessionManager` 抽象 | ❌（属于 services/ 内部架构——P2）|

---

## 8. 引用

- Legacy 实现：`api/routers/chat.py`、`agents/chat/{chat_agent,session_manager}.py`
- Unified 实现：`api/routers/unified_ws.py`、`services/session/{sqlite_store,turn_runtime,context_builder}.py`、`runtime/orchestrator.py`、`agents/chat/agentic_pipeline.py`
- Base 抽象：`services/session/__init__.py:BaseSessionManager`
- 协议清单：`docs/refactor/ws-protocol-inventory.md`
