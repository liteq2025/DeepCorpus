# web/features/ — L4 Feature Plugins（前端镜像）

每个子目录 = 一个特性的前端入口。`web/app/(workspace)/<name>/page.tsx` 一行转发到此处。

## 目标内容（P4 阶段迁入）

| 特性 | 来源 |
|---|---|
| `chat/` | `web/app/(workspace)/chat/...` + `web/components/chat/...` 整理 |
| `book/` | `web/app/(workspace)/book/...` |
| `tutorbot/` | `web/app/(workspace)/agents/[botId]/...` |
| `notebook/` | `web/app/(workspace)/notebook/...` |
| `math_animator/` | （P6） |

## 当前状态

- `_TEMPLATE/` — 可复制的脚手架

## 创建新特性

```bash
cp -r web/features/_TEMPLATE web/features/<name>
```

之后在 `web/app/(workspace)/<name>/page.tsx` 写一行：
```ts
export { default } from '@/features/<name>/page'
```

## 边界规则

- ❌ 禁止 `import from '@/features/<other>/...'`（同层不交叉）
- ✅ 允许 `import from '@/platform/...'`、`@/domain/...`、`@/lib/...`
