# web/platform/ — L2 镜像（前端平台层）

横切的、被多特性消费的能力。无用户故事。

## 子目录

| 子目录 | 来源 | P 阶段 |
|---|---|---|
| `editor/` | `web/components/co-writer/*` 可复用部分 | P3 |
| `chat-runtime/` | `web/lib/unified-ws.ts` + `web/context/UnifiedChatContext.tsx` 抽出 | P1 |
| `ui/` | shadcn 组件薄封装（沿用 `web/components/ui/`，无需迁移）| - |

## 边界规则

- ❌ 禁止 `import from '@/features/...'`
- ❌ 禁止 `import from '@/domain/...'`
- ✅ 允许 import 第三方依赖与 `@/lib/...`
