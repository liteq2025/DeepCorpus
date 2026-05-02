# v3.1 架构调整（吸收 P1 启动前深度调查）

> **生成日期**：2026-05-02  
> **触发**：P1 启动前的 3 个深度调查（book 模块深探 / 测试基础设施审计 / 隐藏耦合扫雷）发现的颠覆性事实，迫使 v3 设计做局部调整  
> **关系**：本文是对 `~/.claude/plans/llm-totorbot-service-agents-capabilites-lazy-bear.md` 的增量修订。原 14 个决策中 **#9（book 归入 features）** 推翻；其他保持。  
> **状态**：v3.1 草案，等签字

---

## 1. 颠覆性发现（why we adjust）

| # | 发现 | 来源证据 | 对 v3 的影响 |
|---|---|---|---|
| F1 | **book 是 10K+ LOC 垂直产品**，不是 feature | engine.py 1132 行 / spine_synthesizer.py 789 行 / 5 专属 agent / 12 BlockType generator / per-book async runtime | 推翻"book → features/book/" |
| F2 | book 的 WS 协议是 CRUD 风格，与 unified_ws 的轮次模型本质不同 | `book.py:book_websocket` 的 message types: create / confirm_proposal / confirm_spine / compile_page / regenerate_block | 协议归一不能选 A（全改轮次）|
| F3 | knowledge/progress/ws 是单向进度通知，被 v3 设计漏掉 | `useKnowledgeProgress.ts:88` | P1 范围需排除 progress 类 WS |
| F4 | 测试覆盖几乎为零（chat 行为 0 / 前端 WS 0） | 见 `phase-v3-p1-readiness.md` §B 与本文 §4 | 启动前必须建测试基线 |
| F5 | **services 层已经在 import agents 层**（v3 分层规则被现状违反）| `services/session/turn_runtime.py:526` import `NotebookAnalysisAgent`；`services/session/context_builder.py:10` import `BaseAgent` | P2 启动前必须先解决 |
| F6 | co_writer 偷用 chat 的 AgenticChatPipeline | `api/routers/co_writer.py:13` | P3 协议要重新设计 |
| F7 | book 通过 lazy import 隐式依赖 notebook 全局单例 | `book/inputs.py:187,200` lazy import `notebook_manager` | P4 拆 notebook 时要解耦 |
| F8 | prompt manager 硬编码 9 模块列表 | `services/prompt/manager.py:28` `MODULES = [research, solve, question, co_writer, math_animator, book, notebook, visualize, chat]` | 加新特性必须改两处，违反插件化精神 |
| F9 | 每页 1-3 个 UnifiedWSClient 实例 | UnifiedChatContext.tsx:687 / QuizViewer.tsx:382 / BookChatPanel.tsx:61 | chat-runtime 抽出时必须设计连接池 |
| F10 | 多个 singleton 跨层 | API 层有 `task_log_stream / progress_broadcaster`，services 层有 `notebook_manager / prompt manager._cache / sqlite_store / unified_session_manager / turn_runtime` | 迁移时极易破坏行为 |

---

## 2. 调整 1：book 归位"垂直产品"（不是 feature）

### 2.1 v3.0 错误归位

> v3.0：book → `deeptutor/features/book/`，作为 L4 feature plugin

### 2.2 v3.1 正确归位

新增**垂直产品层**（vertical），与 L4 feature 同级但语义不同：

```
L4 ─┬─ Verticals (deeptutor/verticals/<name>/)
    │   • 深度自治产品，自带状态机 / 编排器 / 存储 / 多 agent / 多事件类型
    │   • 数量少（< 5 个）；book 是首个，未来可能有"course"、"research project" 等
    │   • 允许有自己的 router、async queue、storage、stream protocol
    │   • 不被强制要求遵循 capability/agent 双层
    │
    └─ Features (deeptutor/features/<name>/)
        • 薄、统一、批量；UI 入口为主
        • 严格按 manifest 协议接入
        • 数量多（chat/notebook/tutorbot/math_animator 等）
```

**book 的目标位置**：`deeptutor/verticals/book/`（保留现有目录结构，整体 mv）

**verticals/ 与 features/ 的判定标准**：

| 维度 | Vertical | Feature |
|---|:-:|:-:|
| 后端 LOC | > 3,000 | < 1,500 |
| 自带状态机 | ✅ | ❌ |
| 自带 agent 子系统 | ✅ | ❌（用 services/domain/agent/）|
| 自带 stream protocol | ✅ | ❌（用 unified ChatMessage）|
| 自带持久化模型 | ✅ | ❌（用 services/platform/storage/）|
| 数量预期 | ≤ 5 | 不限 |

**book 全部 ✅，是 vertical**。notebook/tutorbot/math_animator 全部 ❌，是 feature。

### 2.3 5 层架构图（v3.1）

```
┌─────────────────────────────────────────────────────────────────┐
│ L5  入口适配  Entry Adapters                                     │
│     api/  cli/  app/facade  web/app                             │
├─────────────────────────────────────────────────────────────────┤
│ L4  特性插件 + 垂直产品                                          │
│     ┌─ deeptutor/features/<name>/   (薄、统一、批量)            │
│     │     chat / notebook / tutorbot / math_animator            │
│     └─ deeptutor/verticals/<name>/  (深、自治、稀少)  ★ v3.1 新 │
│           book                                                  │
├─────────────────────────────────────────────────────────────────┤
│ L3  领域能力  services/domain/                                  │
│     orchestration/ agent/ capability/ tool/ knowledge/          │
├─────────────────────────────────────────────────────────────────┤
│ L2  平台服务  services/platform/                                │
│     llm/ rag/ embedding/ session/ storage/ editor/ ...          │
├─────────────────────────────────────────────────────────────────┤
│ L1  协议核心  core/                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 book 的 manifest 仍然写

book 虽是 vertical，仍写 manifest.yaml 以便统一被 plugin loader 发现，但允许字段更宽松（自带 router 路径、自带 ws_channel 不收口、自带前端路由）。

```yaml
# deeptutor/verticals/book/manifest.yaml
name: book
version: 0.2.0
type: vertical                 # ★ 新类型
description: "Living book authoring & reading"

backend:
  router: routers/api.py:router
  ws_endpoint: /api/v1/book/ws    # ★ 不进 unified_ws；vertical 允许独立 WS
  capability: null                 # vertical 不必接 ChatOrchestrator

frontend:
  route: /book
  source: web/features/book        # 前端可以仍在 features/（UI 不复杂到要再分）

depends_on:
  platform: [llm, storage, prompt]
  domain: [knowledge]
```

---

## 3. 调整 2：协议归一选 B'（聚焦内部 dispatcher）

### 3.1 三选一评估

| 方案 | 描述 | 工作量 | 风险 | 长期价值 |
|---|---|---|---|---|
| A | 全协议改轮次模型 | **极大**（要改 book engine 的 CRUD 协议）| **极高**（破坏 book 5-stage state machine） | 最干净 |
| B | unified_ws 内部按 channel dispatch 到所有 handler | 中 | 中（5 套协议都进一个文件，dispatcher 复杂）| 中 |
| **B'** ★ | unified_ws **只收口 chat 风格 WS**；book/knowledge/quiz 等保持独立 | **小**（只改 chat 类）| **低**（不动 vertical/progress）| 高（边界清晰）|
| C | 后端不动，前端做客户端层面的统一 | 小 | 低 | 低（后端混乱依旧）|

### 3.2 v3.1 选 **B'**

**B' 的具体范围**：

| WS 端点 | P1 后归宿 | 原因 |
|---|---|---|
| `/api/v1/ws` (unified_ws) | 保留并扩展为 dispatcher | 已经是轮次模型 |
| `/api/v1/chat` (legacy chat.py) | **deprecate → 删除** | 与 unified_ws 重复，BookChatPanel 切换后无消费者 |
| `/api/v1/tutorbot/{bot_id}/ws` | **保留**，但通过 unified_ws ?channel=tutorbot&bot_id= 也能访问 | 双路径过渡，bot 通道需要 bot_id 路由 |
| `/api/v1/book/ws` | **保留独立** | book 是 vertical，CRUD 协议不进轮次模型 |
| `/api/v1/knowledge/{kb}/progress/ws` | **保留独立** | 进度通知是单向流，不是会话 |

**收口动作**：5 → 4（删除 legacy chat.py 的 WS）。前端 4 个 chat surface 中：
- 主 chat：已经用 unified_ws ✓
- bot chat：用 unified_ws?channel=tutorbot 或保留 /tutorbot/{bot_id}/ws
- book chat panel：从 legacy `/api/v1/chat` 切到 unified_ws ✅
- co_writer：HTTP/SSE 不变，**不在 P1 范围**（属 P3）

### 3.3 unified_ws 的 dispatcher 设计

```python
# services/domain/orchestration/orchestrator.py（P2 后位置）
class ChatOrchestrator:
    async def handle(
        self,
        context: UnifiedContext,
        channel: ChannelType = "chat",
        channel_meta: dict | None = None,  # e.g. {"bot_id": "..."}
    ) -> AsyncIterator[StreamEvent]:
        capability = self._select_capability(channel, context)
        # capability 内部知道自己是 chat/bot 模式，调相应 agent 流水线
```

`api/routers/unified_ws.py` 在 `start_turn` 处接受 `channel` + 可选元数据，传给 orchestrator。

---

## 4. 调整 3：测试基线严肃方案（22 + 4 + 1）

### 4.1 现状（必须正视）

| 表面 | 现有测试 | 风险等级 |
|---|---|:-:|
| chat 行为 | 0 | 🔴 |
| 多轮对话 | 0 | 🔴 |
| 前端 WS | 0 | 🔴 |
| WS 协议契约 | gen 漂移有 gate，但运行时未验证 | 🔴 |
| tutorbot 通道隔离 | schema 测试 ✓，行为 0 | 🟡 |
| book 状态机 | 0（只有 health） | 🟡 |
| notebook 执行 | router 测试 ✓，行为 0 | 🟡 |
| co-writer 协同 | 0 | 🟢 |

### 4.2 P1 启动门槛：22 个单元 + 4 个 e2e + 1 个契约（详细到具体测试名）

#### 后端单元（pytest，17 个新增）

**chat 类（8 个）**：`tests/api/test_chat_router.py`（新建）
1. `test_chat_send_message_persists_user_and_assistant` — 一来一回，断言两条都进 sqlite_store
2. `test_chat_session_resume_returns_full_history` — 重连断言历史完整
3. `test_chat_attachments_handled` — 带附件消息正确路由到 multimodal
4. `test_chat_tool_use_event_sequence` — tool use → tool result → assistant 三件套顺序正确
5. `test_chat_regenerate_replaces_trailing_assistant` — regenerate 删旧 assistant 写新的
6. `test_chat_cancel_turn_no_orphan_events` — cancel 后没有事件继续涌出
7. `test_chat_concurrent_turns_blocked` — 同 session 第二个 turn 收到 `regenerate_busy`
8. `test_chat_capability_switch_mid_session` — chat → deep_solve 切换 capability 不丢历史

**tutorbot 通道隔离（5 个）**：`tests/api/test_tutorbot_isolation.py`（新建）
9. `test_two_channels_no_message_bleed` — 两 channel 并发发消息互不串
10. `test_channel_disconnect_cleans_tasks` — 断连后 disconnected event 触发，无任务泄漏
11. `test_concurrent_messages_per_channel_serialized` — 同 channel 多消息串行处理
12. `test_bot_id_routing` — 不同 bot_id WS 路由正确
13. `test_bot_reconnect_resumes_state` — reconnect 后状态恢复

**notebook 行为（4 个）**：`tests/api/test_notebook_behavior.py`（新建）
14. `test_record_create_summary_persisted` — add_record_with_summary 后 summary 落盘
15. `test_records_ordered_by_created_at` — list 按时间排序
16. `test_notebook_delete_cascades_records` — 删 notebook 删所有 records
17. `test_notebook_health_returns_count` — health 暴露 notebook 数量（已有 P0.6 smoke 强化）

#### 前端单元（vitest，5 个新增）

**chat-runtime 抽出后必备**：
18. `web/tests/ws-client.test.ts` — `wsUrl()` 重写边界（host/auth/SSL）
19. `web/tests/message-composer.test.ts` — 富文本+附件 composer 状态机
20. `web/tests/use-chat-session.test.ts` — `useChatSession` hook（mock UnifiedWSClient）发消息、收事件、断线重连
21. `web/tests/chat-message-types.test.ts` — `ChatMessage / SessionMessage / MessageItem` 互转无丢失
22. `web/tests/ws-event-dispatch.test.ts` — StreamEvent 各类型（content / thinking / tool_use / result / error）能正确分发

#### e2e 行为测试（playwright，4 个新增）

23. `web/tests/e2e/chat-interactive.behavioral.ts` — 主 chat：登录 → 发"hello" → 等 streaming → 断言 message_list 有 2 条 → 刷新 → 历史还在
24. `web/tests/e2e/multi-turn.behavioral.ts` — 多轮：Q1 → A1 → Q2 → 断言 A2 引用 Q1 的上下文（用一个固定 prompt 让模型必须引用）
25. `web/tests/e2e/tutorbot-isolation.behavioral.ts` — 创建 2 个 bot → 各自发消息 → 断言响应不串
26. `web/tests/e2e/book-chat-panel.behavioral.ts` — 进 book → 打开 chat panel → 发消息 → 断言走的是 unified_ws（关键，因为 P1 要从 legacy /api/v1/chat 切过来）

#### 契约测试（pytest，1 个新增）

27. `tests/api/test_ws_event_contract.py` — 后端 enumerate 所有 `StreamEventType`，构造每种 event 序列化输出，断言 schema 匹配 `web/lib/ws-events.gen.ts` 的类型定义（用 jsonschema 或简单 字段比较）

### 4.3 配套基础设施

- **e2e 需要可启动的后端**：CI 加 docker-compose 起一个 stub LLM provider（mock OpenAI 返回固定响应），确保 e2e deterministic
- **测试数据库隔离**：每个 pytest test 用 tmp dir 起 sqlite，避免污染开发机 `data/user/chat_history.db`
- **前端 WS mock**：vitest 用 msw 的 WebSocketHandler（已经在 node_modules，未启用）
- **CI 时间预算**：估算 +5 min（后端单元 +1.5 min；前端单元 +1 min；e2e +2.5 min）

### 4.4 为什么这套是"够"的

| 风险 | 哪个测试覆盖 |
|---|---|
| 切换 unified_ws 后丢历史 | 1, 2, 23, 24 |
| 协议字段漂移 | 27 + 现有 ws-events.gen.ts drift gate |
| tool use 事件错序 | 4 |
| 多轮上下文丢失 | 8, 24 |
| 资源泄漏（任务/连接）| 6, 10, 18 |
| 通道串扰 | 9, 25 |
| 前端连接风暴 | 18, 20（unit）+ playwright 加 ws connection counter |
| BookChatPanel 切换出错 | 26（关键，因为它从 legacy 切过来）|

**剩余 5% 不覆盖**：性能回归、视觉细节（focus ring、动画）、生产环境特有问题。这部分靠灰度 + 监控。

---

## 5. 调整 4：架构地雷预排（10 个 hidden coupling 各定一个修法）

| # | 地雷 | 修法 | 落 P0.x 还是 P1.x |
|---|---|---|---|
| 1 | `services/session/turn_runtime.py:526` import `NotebookAnalysisAgent`（service→agents 违规）| 把 `NotebookAnalysisAgent` 调用改为通过依赖注入：TurnRuntime 接受 `notebook_analyzer` callable 参数 | **P0.20**（必须先修，否则 P2 直接断）|
| 2 | `services/session/context_builder.py:10` import `BaseAgent` | `BaseAgent` 上提到 `core/`（已是 P0 计划，确认落地）| 已含在 P0.1 已完成的 AGENTS.md 规约中，P2 执行 |
| 3 | `co_writer.py:13` import `AgenticChatPipeline` | P3 阶段 co_writer 抽到 `services/platform/editor/` 时切断该 import；用 `services/domain/orchestration/orchestrator` 的公开 API | **P3**（不阻塞 P1）|
| 4 | `book/inputs.py` lazy import `notebook_manager` | book vertical 化时定义显式 dependency（manifest depends_on: [notebook]）；通过依赖注入而非 lazy import | **P4**（不阻塞 P1，但要写 test 锁定行为）|
| 5 | `prompt/manager.py:28` 硬编码 MODULES 列表 | 改为 plugin loader 扫描 `manifest.yaml` 自动发现；过渡期保留硬编码作 fallback | **P0.21**（解耦 prompt 加载，否则加新特性必须改两处）|
| 6 | 每页多 UnifiedWSClient 实例 | chat-runtime 抽出时定义 `getOrCreateChatClient(channel)` 单例工厂（按 channel hash 复用连接）| **P1.b**（前端抽 chat-runtime 时一并）|
| 7 | API 层多 singleton（`task_log_stream`、`progress_broadcaster`）| 这两个属于"per-process broadcaster"，本身合理，加一个 cleanup hook 在 server shutdown 时关连接 | **P0.22**（小改，安全边际）|
| 8 | `services/__init__.py:67` 动态 importlib 加载 `llm/prompt/search/...` | 列入 manifest，由 plugin loader 加载；过渡期保留 importlib | **P2**（services 内部分层时一并）|
| 9 | `runtime/registry/capability_registry.py:22` 动态 import capability | 同上，capability 改走 manifest 注册 | **P2** |
| 10 | tests 直接 import 内部 helpers（`SQLiteSessionStore`、`agentic_pipeline as ap_module`）| P2 迁移时要同步改测试 import；考虑提供 `tests/_helpers.py` 隔离层 | **P2**（同步改）|

---

## 6. 更新后的 P1 启动前准备清单（v3.1）

替换原 `phase-v3-p1-readiness.md` §4 的 11 项，扩为 14 项：

### 6.1 认知补全（4 项）

- **P0.9** 5 个 WS 端点协议清单 doc（不变）
- **P0.10** 双 chat 实现差异分析 doc（不变）
- **P0.11** 协议归一策略——v3.1 默认选 **B'**（chat 收口、book/progress 保留），无需再决策；写到 P1 scope doc
- **P0.12** 6+ 前端 WS 消费者归类（不变）

### 6.2 架构地雷修复（3 项，新增）⚠️

- **P0.20** 修 `services→agents` 违规：TurnRuntime 改用依赖注入接受 `notebook_analyzer` callable，移除直接 import
- **P0.21** prompt manager MODULES 列表去硬编码：增加 manifest 扫描，硬编码降级为 fallback
- **P0.22** API 层 singleton 加 shutdown cleanup hook（task_log_stream、progress_broadcaster）

### 6.3 测试基线（3 项，扩充内容）

- **P0.13** 后端单元 17 个 + 契约 1 个（详见 §4.2）
- **P0.14** 前端单元 5 个 + e2e 4 个（详见 §4.2）
- **P0.15** CI 接入 + msw WebSocketHandler 启用 + e2e mock LLM 后端

### 6.4 可逆性 + 范围（3 项）

- **P0.16** P1 scope 定稿（含 B' 决策、不在范围内的 WS 端点列表）
- **P0.17** Feature flag `chat_runtime_v2` + 回退路径
- **P0.18** legacy `/api/v1/chat` deprecation 节奏（warning log → 410 → 删代码）

### 6.5 依赖前置（1 项）

- **P0.19** phase 3 收尾确认（不变）

### 6.6 设计调整签字（v3.1 新增）

- **P0.23** 14 项 v3 决策中 **#9 修订**为 "book → verticals/，不进 features/"；新增"vertical 概念"写入 AGENTS.md。等用户最终确认。

---

## 7. 更新后的迁移路线（v3.1）

| Phase | 目标 | v3.1 调整 |
|---|---|---|
| **P0** | 骨架 + import-linter + smoke | 已完成 |
| **P0+** | §6 14 项准备（P0.9–P0.23）| **新增**，P1 前必做 |
| **P1** | unified_ws 收口 chat 类（B'）+ 前端 chat-runtime 抽出 | scope 缩小（不含 book/progress）|
| **P2** | services/ 内部分层；agents/capabilities/tools/runtime/knowledge 迁入 services/domain/ | 不变 |
| **P3** | co_writer 抽到 services/platform/editor/ + 删独立入口 | 不变 |
| **P4** | tutorbot/notebook 迁入 features/；**book 迁入 verticals/**（v3.1 修正） | book 不进 features |
| **P5** | capability/agent 重构（剧本/演员） | 不变 |
| **P6** | math_animator 单独迁出为 feature | 不变 |

---

## 8. 待你最终签字的 4 件事

1. **F1+§2 接受**：book → `verticals/`，新增 vertical 类型与 features/ 平级？（强烈推荐 ✅）
2. **§3 接受**：协议归一选 B'（chat 收口、book/knowledge/progress 保留独立）？（强烈推荐 ✅）
3. **§4 接受**：22 单元 + 4 e2e + 1 契约共 27 个测试是 P1 启动门槛？（如不够请增补具体测试名）
4. **§5+§6 接受**：架构地雷修复（P0.20–P0.22）+ 测试基线（P0.13–P0.15）+ 范围/可逆性（P0.16–P0.18）共 14 项 P0+ 任务作为 P1 前置？

回完即可拆 task 开干。

---

## 附录：v3.0 → v3.1 决策变更摘要

| 决策 # | v3.0 | v3.1 | 原因 |
|---|---|---|---|
| #9 (book) | 独立特性 features/book/ | **垂直产品 verticals/book/** | F1: book 10K LOC、5 stage state machine、5 agent、12 BlockType——超越 feature 量级 |
| #11 (capability) | A 接受新边界重构 | **不变**，但需补充：vertical 不强制走 capability/agent 双层 | book 自带 orchestrator |
| 协议归一 | 待决策 A/B/C | **B'（聚焦内部 dispatcher）** | F2: book 协议本质 CRUD，不能塞进轮次模型 |
| 测试基线 | "5 + 4 = 9 个" | **22 + 4 + 1 = 27 个** | F4: 现有覆盖几乎为零 |
| 隐藏耦合 | 未列入 P0 | **新增 P0.20–P0.22** | F5–F10: 现状已经违反 v3 分层规则 |
