# services/platform/ — L2 Platform Services

横切的、被消费的能力。无用户故事。

## 目标内容（P2 阶段迁入）

| 子目录 | 来源 |
|---|---|
| `llm/` | `services/llm/` |
| `rag/` | `services/rag/` |
| `embedding/` | `services/embedding/` |
| `search/` | `services/search/` |
| `session/` | `services/session/`（裸存储部分；turn_runtime 去 domain）|
| `memory/` | `services/memory/` |
| `prompt/` | `services/prompt/` |
| `storage/` | `services/storage/` |
| `config/` | `services/config/` + `services/settings/` |
| `path/` | `services/path_service.py` |
| `setup/` | `services/setup/` |
| `editor/` | `co_writer/` 内核（P3 迁入） |

## 已存在子目录

- `editor/` — 占位，P3 阶段从 `deeptutor/co_writer/` 抽出 EditorService 等。

## 边界规则

- ❌ 禁止 `from deeptutor.services.domain import ...`
- ❌ 禁止 `from deeptutor.features import ...`
- ✅ 允许 `from deeptutor.core import ...`
