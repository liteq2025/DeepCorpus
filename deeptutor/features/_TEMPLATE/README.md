# Feature Template

复制此目录创建新特性：

```bash
cp -r deeptutor/features/_TEMPLATE deeptutor/features/<your_name>
```

## 目录结构

```
<your_feature>/
├── manifest.yaml      # 必需，描述特性元数据
├── __init__.py
├── routers/
│   └── api.py         # FastAPI router（可选）
├── capability.py      # BaseCapability 实现，注入 orchestrator（可选）
├── services.py        # 特性私有服务（可选，单文件够用就不开子目录）
├── agents/            # 特性私有 agent（可选）
└── prompts/           # YAML 提示词（可选）
```

## 必做步骤

1. 改 `manifest.yaml` 的字段（name/description/backend/frontend/depends_on）
2. 实现 `routers/api.py`，导出 `router: APIRouter`
3. 如有 chat-mode 需求，实现 `capability.py` 并在 manifest 声明
4. 在 `web/features/<your_name>/` 同步建前端入口

## 边界检查（写代码前请确认）

- 你的特性是否真的是 L4？还是其实是 L2/L3 共用能力？后者应该放进 `services/platform` 或 `services/domain`
- 是否有同层依赖？特性之间不能互相 import
