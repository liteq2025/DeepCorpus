# ADR-001: P1 协议归一选 B' (聚焦 chat 类 WS)

> **状态**：Accepted (2026-05-02)  
> **Context**：v3.1 设计 + P0.9/P0.10/P0.12 调查结果  
> **决策者**：项目所有者（liteq2025）  
> **类型**：架构决策记录（Architecture Decision Record）

---

## 1. 上下文

v3 P1 阶段需要决定如何"统一 WebSocket 协议"。后端现有 5 个 WS 端点：

| 端点 | 协议家族 |
|---|---|
| `/api/v1/ws` | 轮次模型（turn-based, replayable）|
| `/api/v1/chat` | 简单 message-response（legacy）|
| `/api/v1/book/ws` | CRUD-style（操作 book entity）|
| `/api/v1/tutorbot/{bot_id}/ws` | per-bot adapter |
| `/api/v1/knowledge/{kb}/progress/ws` | 单向 progress 流 |

完整协议详见 `ws-protocol-inventory.md`。

---

## 2. 候选方案

| 方案 | 描述 |
|---|---|
| A | 全部协议改造为轮次模型，unified_ws 收口所有 WS |
| B | unified_ws 内部按 channel dispatch 到所有 5 类 handler（god-object dispatcher）|
| **B'** | unified_ws 只收口"chat 类"协议（unified_ws + legacy chat + tutorbot 收口为同一端点）；book/knowledge progress 保留独立 |
| C | 后端 5 端点不动，前端 ChatClient 内部按 channel 选不同 URL |

---

## 3. 决策

**采纳 B'**。

具体范围：

| 端点 | P1 后归宿 |
|---|---|
| `/api/v1/ws` | 保留 + 扩展为 chat 类 dispatcher（接受 `?channel=chat\|tutorbot&bot_id=...`）|
| `/api/v1/chat` (legacy) | **删除** |
| `/api/v1/book/ws` | **保留独立**（book vertical 自治）|
| `/api/v1/tutorbot/{bot_id}/ws` | **过渡保留**，与新 unified_ws ?channel=tutorbot 双路径，P4 后删除 |
| `/api/v1/knowledge/{kb}/progress/ws` | **保留独立**（单向 progress 流，非会话）|

---

## 4. 决策依据

### 4.1 拒绝 A 的理由

book 协议本质是 **对 entity 做 CRUD 操作**（"确认 spine"、"编译 page"），不是"用户发了一句话"。强行塞进轮次模型需要把 book engine 完全推倒重来——预估 3 个月起步。同时**违反 v3.1 把 book 定位为 vertical 的核心动机**：vertical 本就允许有自己的协议自由度。

knowledge progress 是**客户端不发消息**的单向流，更不是会话——硬塞轮次模型纯属反模式。

### 4.2 拒绝 B 的理由

把 5 套语义本质不同的协议都塞进 unified_ws 内部 dispatcher，会造出一个 god-object 文件，新人读不懂、单元测试难写。**架构上的"假统一"**——表面端点一个，内部 5 套逻辑。

### 4.3 拒绝 C 的理由

后端混乱依旧，BookChatPanel 仍 piggyback 在 legacy chat 上，没解决根本问题。

### 4.4 选择 B' 的理由

- **诚实统一**：只合并真正语义匹配的协议（chat / tutorbot / 主 chat 都是"会话流"）
- **保留 book 协议自由度**：契合 v3.1 把 book 定位为 vertical 的设计
- **保留 progress 单向特性**：不被卷进会话抽象
- **每个端点协议匹配自己的语义**：unified_ws 接会话、book/ws 接实体操作、progress/ws 接通知
- **工作量最小**：不动 book engine、不动 knowledge progress 链路

---

## 5. 后果（Consequences）

### 5.1 正面

- BookChatPanel 终于不再用 legacy 路径
- 主 chat / bot chat / book chat 共用一套前端 chat-runtime
- 每个端点用途清晰，新人易理解
- book 团队可以继续独立演进协议（user 已表示 book 后续会更垂直深入）

### 5.2 负面 / 需后续处理

- legacy `/api/v1/chat` 数据迁移：开发机已 audit 为空（dual-chat-impl-comparison.md §6.1），但生产/其他用户机器需上线前再 audit
- bot chat 双路径过渡期需要监控 legacy URL 是否还有调用，确定 P4 删除时机
- chat-runtime 抽出时要解决"多 chat surface 共享一个 WS 连接"的连接池问题（详见 ws-consumer-classification.md §3）

### 5.3 不在本决策范围

- co_writer 用 HTTP/SSE，不进 P1
- knowledge progress 抽 `useProgressStream` 共用 hook，留给 P3
- 整个 `agents/chat/session_manager.py` 与 `BaseSessionManager` 的存废，留给 P2

---

## 6. 实施信号

P1 启动条件（all required）：
1. 本 ADR 签字 ✅（本文产出即标志接受）
2. P0.13 后端 17 单元 + 1 契约测试全绿
3. P0.14 前端 5 单元 + 4 e2e 测试全绿（含 `book-chat-panel.behavioral.ts`，验证切换正确）
4. P0.20–P0.22 架构地雷修完 ✅（已完成）
5. P0.19 phase 3 ✅（仍 🟡）

---

## 7. 引用

- WS 协议清单：`docs/refactor/ws-protocol-inventory.md`
- 双 chat 实现对比：`docs/refactor/dual-chat-impl-comparison.md`
- 前端消费者归类：`docs/refactor/ws-consumer-classification.md`
- v3.1 整体架构：`docs/refactor/phase-v3.1-architecture-adjustments.md`
