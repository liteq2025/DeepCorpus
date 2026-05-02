# web/platform/chat-runtime/

统一的 chat 运行时：WebSocket 客户端 + 消息类型 + 会话 hook。

P1 阶段抽出：
- `web/lib/unified-ws.ts:UnifiedWSClient` → `./client.ts`
- `web/lib/ws-events.gen.ts` → `./types.ts`（生成的契约）
- `web/context/UnifiedChatContext.tsx` 大型 reducer → `./useChatSession.ts`（按 channel 参数化）

## 计划导出

```ts
export { ChatClient } from './client'
export { useChatSession } from './useChatSession'
export type { ChatMessage, StreamEvent, ToolConfig } from './types'
```

## 使用

每个 chat surface（chat 主页 / bot / book / notebook）都用：

```ts
const session = useChatSession({ channel: 'chat' })   // 或 'book' / 'tutorbot' / 'notebook'
```

后端唯一 WS 端点：`/api/v1/ws?channel={chat|book|tutorbot|notebook}`
