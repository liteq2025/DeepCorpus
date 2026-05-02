# web/platform/editor/

通用编辑器组件，被 features/chat、features/book、features/notebook 嵌入使用。

P3 阶段从 `web/components/co-writer/` 与 `web/app/(workspace)/co-writer/[docId]/page.tsx` 抽出。

## 计划导出

```ts
export { Editor } from './Editor'
export { useEditor } from './useEditor'
export type { Document, EditOp, EditHistory } from './types'
```

## 后端配套

`deeptutor/services/platform/editor/`（同步 P3 实现）。
