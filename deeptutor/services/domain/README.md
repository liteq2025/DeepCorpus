# services/domain/ — L3 Domain Capabilities

把平台原料组装成可被特性消费的成品。被多特性复用的"领域能力"。

## 目标内容（P2 阶段迁入）

| 子目录 | 来源 | 说明 |
|---|---|---|
| `orchestration/` | `runtime/orchestrator.py` + `services/session/turn_runtime.py` | ChatOrchestrator + 上下文构建 + 轮次运行时 |
| `agent/` | `agents/` 全部，按职责扁平命名 | planner / solver / writer / searcher / researcher / chat_agent / visualize / vision_solver |
| `capability/` | `capabilities/` 全部 | 每个 mode 一个子目录，持有"剧本"（编排子 agent） |
| `tool/` | `tools/` 全部 | 含 `tool/registry.py`（来自 `runtime/registry/tool_registry.py`） |
| `knowledge/` | `knowledge/` 全部 | KB Manager 等 |

## 已存在子目录

P0 阶段创建的占位（含 `__init__.py`）：
- `orchestration/` — P2 目标位置
- `agent/` — P2 目标位置
- `capability/` — P2 目标位置
- `tool/` — P2 目标位置
- `knowledge/` — P2 目标位置

## Capability vs Agent 边界

详见 AGENTS.md §3。**Capability=剧本，Agent=演员**。

## 边界规则

- ✅ 允许 `from deeptutor.core import ...`
- ✅ 允许 `from deeptutor.services.platform import ...`
- ❌ 禁止 `from deeptutor.features import ...`
- ⚠️ 同层之间：capability 可以 import agent 与 tool；agent 之间不互相 import
