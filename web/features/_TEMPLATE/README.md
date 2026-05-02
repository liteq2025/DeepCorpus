# Feature Template (Frontend)

复制此目录创建新特性前端：

```bash
cp -r web/features/_TEMPLATE web/features/<your_name>
```

## 目录结构

```
<your_feature>/
├── page.tsx           # 入口组件（被 web/app/(workspace)/<name>/page.tsx 转发）
├── components/        # 特性私有组件
└── hooks/             # 特性私有 hook
```

## 必做步骤

1. 改 `page.tsx` 实现入口
2. 在 `web/app/(workspace)/<your_name>/page.tsx` 加一行：
   ```ts
   export { default } from '@/features/<your_name>/page'
   ```
3. 在后端同步建 `deeptutor/features/<your_name>/`（用对应模板）

## 边界检查

- 你的组件是否真的特性私有？还是其实可复用？后者应该放到 `@/platform/ui/` 或 `@/components/ui/`
- 是否需要 chat 能力？用 `useChatSession({ channel: '<your_name>' })` from `@/platform/chat-runtime`
