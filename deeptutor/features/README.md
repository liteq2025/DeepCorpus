# deeptutor/features/ — L4 Feature Plugins

每个子目录 = 一个特性插件，自带 manifest 与后端代码。

## 目标内容（P4 阶段迁入）

| 特性 | 来源 |
|---|---|
| `chat/` | `web/components/chat/` 后端伴生 + 部分编排 |
| `book/` | `deeptutor/book/` 全部 |
| `tutorbot/` | `deeptutor/tutorbot/` + `services/tutorbot/manager.py` + `api/routers/tutorbot.py` |
| `notebook/` | `services/notebook/` 业务部分 + `api/routers/notebook*.py` |
| `math_animator/` | `agents/math_animator/`（P6 阶段） |

## 当前状态

- `_TEMPLATE/` — 可复制的脚手架（manifest.yaml + routers/ + capability.py + agents/ + prompts/）

## 创建新特性

```bash
cp -r deeptutor/features/_TEMPLATE deeptutor/features/<name>
$EDITOR deeptutor/features/<name>/manifest.yaml
```

P0 阶段 plugin loader 尚未实现，新特性仍需手动在 `api/main.py` 注册 router。

## 边界规则

- ❌ 禁止 `from deeptutor.features.<other> import ...`（同层不交叉）
- ✅ 允许 `from deeptutor.core / services.platform / services.domain import ...`
