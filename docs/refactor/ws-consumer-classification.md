# 前端 WebSocket 消费者归类（v3 P1 准备产出）

> **生成日期**：2026-05-02 (P0.12)  
> **目的**：每个前端 WS 消费者归到一类，决定 P1 是否被 chat-runtime 抽象覆盖  
> **范围**：项目源码内，不含 node_modules 引用

---

## 0. 三类划分

- **(a) chat 类**：双向会话流，应走 P1 抽出的 `web/platform/chat-runtime/` (`useChatSession` hook)
- **(b) progress / stream 类**：单向通知或非会话流，应有自己的专用 hook（`useProgressStream` 等）
- **(c) 不在 P1 范围**：领域专用协议，独立保留

---

## 1. 全部 7 个消费者一表过

| # | 文件 | 连的端点 | 当前实现 | 类别 | P1 处置 |
|---|---|---|---|---|---|
| 1 | `web/lib/unified-ws.ts:UnifiedWSClient` | `/api/v1/ws` | 内置统一客户端，已经是好的 | (a) chat | **抽进 chat-runtime** |
| 2 | `web/context/UnifiedChatContext.tsx:687` | `/api/v1/ws`（间接，通过 #1）| 大型 reducer 持有 client 实例 | (a) chat | **拆为 useChatSession hook** |
| 3 | `web/app/(workspace)/agents/[botId]/chat/page.tsx:151` | `/api/v1/tutorbot/{botId}/ws` | 原生 `new WebSocket()`，自管 state | (a) chat | **切到 useChatSession({channel:"tutorbot", botId})** |
| 4 | `web/app/(workspace)/book/components/BookChatPanel.tsx:61` | `/api/v1/chat`（**legacy!**）| 原生 `new WebSocket()`，自管 state | (a) chat | **切到 useChatSession({channel:"chat"})**——核心收口 |
| 5 | `web/lib/book-api.ts:208` `openBookSocket()` | `/api/v1/book/ws` | 自定义客户端，handle book CRUD events | (c) book vertical | **不动**（book 协议保留独立）|
| 6 | `web/hooks/useKnowledgeProgress.ts:88` | `/api/v1/knowledge/{kb}/progress/ws` | 原生 `new WebSocket()`，单向流 | (b) progress | **不动 P1**；P3 抽 `useProgressStream` 共用模式（如有需要）|
| 7 | `web/components/quiz/QuizViewer.tsx:382` | `/api/v1/ws` | **已经用 UnifiedWSClient**（成熟）| (a) chat | 自然受益于 chat-runtime 抽出，**改 import path** |

### 1.1 dev-registry 提及

`web/lib/dev-registry.ts:785` 只在字符串列表里出现 "UnifiedWSClient"——是 dev 工具的展示，不构成实际 WS 连接。**忽略**。

---

## 2. P1 触及面

### 2.1 必改文件（chat-runtime 抽出 + 4 surface 切换）

```
web/platform/chat-runtime/        ← 新建
  client.ts                       ← 从 web/lib/unified-ws.ts 迁来 + 增强
  useChatSession.ts               ← 从 web/context/UnifiedChatContext.tsx 拆出来
  types.ts                        ← 从 web/lib/ws-events.gen.ts re-export

web/lib/unified-ws.ts             ← 留壳 re-export，1 版本后删除（deprecation alias）
web/context/UnifiedChatContext.tsx ← reducer 简化，内部用 useChatSession

# 4 个 chat surface
web/app/(workspace)/chat/[[...sessionId]]/page.tsx     ← 主 chat：本就用 UnifiedChatContext，自动受益
web/app/(workspace)/agents/[botId]/chat/page.tsx        ← bot chat：拆原生 WS → useChatSession
web/app/(workspace)/book/components/BookChatPanel.tsx   ← book chat：拆原生 WS + 切 endpoint
web/components/quiz/QuizViewer.tsx                      ← quiz：改 import 即可
```

### 2.2 不动文件（P1 范围外）

```
web/lib/book-api.ts                       ← book vertical 自治
web/hooks/useKnowledgeProgress.ts         ← progress 单向流
```

---

## 3. 抽出 chat-runtime 时的连接复用策略

⚠️ 现状：`UnifiedChatContext.tsx:687` 创建 `UnifiedWSClient` 实例 + `QuizViewer.tsx:382` 创建另一个实例 + bot/book chat 自管原生 WebSocket = **每页 1-3 个独立 WS 连接**。

**chat-runtime 抽出时必须解决**：

```typescript
// web/platform/chat-runtime/client.ts
const _clients = new Map<string, ChatClient>()

export function getOrCreateChatClient(channel: ChannelKey): ChatClient {
  // channel = "chat" | `tutorbot:${bot_id}` | ...
  if (!_clients.has(channel)) _clients.set(channel, new ChatClient(channel))
  return _clients.get(channel)!
}

export function useChatSession({ channel, ... }) {
  const client = getOrCreateChatClient(channel)
  // ...
}
```

按 channel hash 复用连接。同一 channel 的多个组件共享一个 WS。

---

## 4. P0.14 e2e 测试覆盖矩阵

每个 (a) 类 surface 必须有一个 behavioral test（详见 P0.14 在 v3.1 doc §4.2）：

| Surface | 对应 e2e 测试 |
|---|---|
| 主 chat | `chat-interactive.behavioral.ts` + `multi-turn.behavioral.ts` |
| bot chat | `tutorbot-isolation.behavioral.ts` |
| book chat panel | **`book-chat-panel.behavioral.ts`** ← 关键，验证从 legacy `/api/v1/chat` 切到 unified_ws |
| quiz | （无独立 e2e；行为变化小，由主 chat 测试保证 chat-runtime 不破）|

---

## 5. 引用

- 协议清单：`docs/refactor/ws-protocol-inventory.md`
- 双 chat 实现对比：`docs/refactor/dual-chat-impl-comparison.md`
- 整体架构：`docs/refactor/phase-v3.1-architecture-adjustments.md`
