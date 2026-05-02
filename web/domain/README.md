# web/domain/ — L3 镜像（前端领域层）

被多特性复用的、非纯 UI 的领域类型与能力。

## 子目录

| 子目录 | 用途 | P 阶段 |
|---|---|---|
| `types/` | 后端 schema 生成的 TypeScript 类型（StreamEvent / ChatMessage / ToolConfig 等） | P1 |

## 边界规则

- ❌ 禁止 `import from '@/features/...'`
- ✅ 允许 `import from '@/platform/...'`、`@/lib/...`
