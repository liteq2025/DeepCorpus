# Co-Writer 数据迁移备忘（P3 阶段执行前必读）

> **背景**：v3 设计将 `co_writer/` 内核下沉为 `services/platform/editor/`，并**废弃** `web/app/(workspace)/co-writer/[docId]/` 独立入口页。P3 阶段动手前，必须确认现有用户文档不会丢失或不可访问。  
> **生成日期**：2026-05-02（P0.7 执行）

## 1. 现有持久化结构

来源代码：`deeptutor/co_writer/storage.py:CoWriterStorage` + `deeptutor/services/path_service.py:get_co_writer_dir`。

```
data/user/workspace/co-writer/
├── documents/                # 用户文档
│   └── doc_{id}/
│       └── manifest.json     # CoWriterDocument: {id, title, content, created_at, updated_at}
├── tool_calls/               # AI 编辑历史副产物
├── audio/                    # 语音输入相关（如有）
└── history.json              # 操作历史（可选，按需创建）
```

数据格式：`pydantic.BaseModel CoWriterDocument`（`id`、`title`、`content`、`created_at`、`updated_at`）。

## 2. 当前数据 audit（开发机快照）

| 项 | 值 |
|---|---|
| 文档目录 | `data/user/workspace/co-writer/documents/` |
| `manifest.json` 数量 | **0**（开发机当前无用户文档） |
| `history.json` | 不存在 |
| `tool_calls/` | 空 |
| `audio/` | 空 |

> **结论**：开发机当前无需数据迁移。但生产/其他用户机器可能有数据，**P3 执行前需要再 audit 一次目标环境**（脚本见 §5）。

## 3. P3 迁移方案（两条路）

### 方案 A（推荐）：保留数据路径与文件格式，只迁代码

`co_writer/storage.py` → `services/platform/editor/storage.py`，**保持** `data/user/workspace/co-writer/` 路径不变。`CoWriterDocument` 改名为 `Document`（model_validate 兼容旧 manifest.json）。`path_service` 的 `get_co_writer_*` 方法保留为 alias，1 个版本后删除。

**好处**：现有数据零迁移，零风险。  
**代价**：路径名仍叫 `co-writer`，未来再改名。

### 方案 B：路径迁移到统一 editor 命名

把 `data/user/workspace/co-writer/` 改为 `data/user/workspace/editor/`，写一次性迁移脚本（mv 整个目录）。

**好处**：路径名与新模块名一致。  
**代价**：所有用户机器跑迁移脚本；万一脚本失败要恢复。

**v3 默认采用方案 A**，避免数据迁移风险；命名一致由 v0.3 再处理。

## 4. P3 删除清单（前端）

P3 删除独立 co-writer 入口页时涉及：

- `web/app/(workspace)/co-writer/page.tsx`（列表页）
- `web/app/(workspace)/co-writer/sampleTemplate.ts`
- `web/app/(workspace)/co-writer/[docId]/page.tsx`（编辑页，2163 行）
- `web/components/sidebar/SidebarShell.tsx`（移除 co-writer 导航条目）
- `web/components/sidebar/CoWriterRecent.tsx`（侧边栏最近文档块）
- `web/components/co-writer/ToolbarIconBtn.tsx`（移到 `web/platform/editor/components/`）
- `web/components/notebook/SaveToNotebookModal.tsx`（处理 notebook → co-writer 的反向引用，改为嵌入式 `<Editor>`）

**前置条件**：`web/platform/editor/<Editor>` 必须先在 chat/notebook 内部能开旧文档（用 doc_id），证明嵌入式编辑器可替代独立入口的功能。

## 5. P3 执行前 audit 脚本

在目标环境跑：

```bash
COWRITER_DIR="${HOME}/.../data/user/workspace/co-writer"  # 替换实际路径
echo "Documents:"
find "$COWRITER_DIR/documents" -name 'manifest.json' 2>/dev/null | wc -l
echo "Latest doc:"
find "$COWRITER_DIR/documents" -name 'manifest.json' 2>/dev/null | xargs -I {} stat -f '%m %N' {} 2>/dev/null | sort -n | tail -3
echo "History:"
ls -lh "$COWRITER_DIR/history.json" 2>/dev/null || echo "no history.json"
```

如果 documents > 0，**优先确认嵌入式 Editor 在 chat/notebook 能正常打开任意 doc_id 的内容**，再执行删除。

## 6. 后端 router 处理

- `api/routers/co_writer.py` 在 P3 **保留**，作为"任意特性都能调用编辑器"的内部 RPC 端点
- `/api/v1/co-writer/ws`（独立编辑器 WS 通道）在 P3 **关闭**
- 长期看，`co_writer` 这个名字会从 router/feature 层消失，统一为 `editor`；v0.2/v0.3 不动

## 7. 验证清单（P3 完成判定）

- [ ] `services/platform/editor/` 内核能加载 `data/user/workspace/co-writer/documents/doc_*/manifest.json`
- [ ] chat 内嵌 `<Editor doc={...} />` 能加载、编辑、保存任意旧文档
- [ ] notebook 的 `SaveToNotebookModal` 改用 `<Editor>` 后行为不变
- [ ] 侧边栏移除 co-writer 入口，但用户可以从 chat/notebook 访问历史文档
- [ ] 旧路由 `/co-writer/...` 返回 410 或 302 跳到 chat
- [ ] `web/app/(workspace)/co-writer/` 整个目录删除
