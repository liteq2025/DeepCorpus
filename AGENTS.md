# DeepCorpus — Architecture (v3)

> **此文件已与上游 HKUDS/DeepTutor 的 AGENTS.md 大幅分叉**。本 fork 走自有架构（5 层 + 模块化插件），与上游运行时模型不再对齐。
>
> **阅读顺序**：
> 1. **`AGENTS.fork.md`** — fork 规则（commit 前缀、provenance、禁止动作）。冲突时 fork 规则优先。
> 2. **本文档** — 当前架构标准（v3）。
> 3. `../README.fork.md` — Path B fork 操作手册。
>
> **架构状态**：v3 设计已签字，P0 已落地。**v3.1 修订（2026-05-02）**：book 归位为 vertical（不是 feature）；P1 协议归一选 B'（聚焦 chat 类 WS 收口）；P0.20–P0.22 修架构地雷（service→agents 违规等）。旧顶级目录（`agents/`、`capabilities/`、`tools/`、`runtime/`、`knowledge/`、`tutorbot/`、`book/`、`co_writer/`）在过渡期并存。
>
> 相关文档：
> - 完整设计 + P0 实况：`~/.claude/plans/llm-totorbot-service-agents-capabilites-lazy-bear.md`
> - **v3.1 架构调整**：`docs/refactor/phase-v3.1-architecture-adjustments.md` ★
> - P1 启动准备：`docs/refactor/phase-v3-p1-readiness.md`
> - phase 3 协调：`docs/refactor/phase-v3-coordination.md`
> - co-writer 数据迁移：`docs/refactor/co_writer_data_migration.md`

---

## 1. 设计哲学（4 条铁律）

1. **下层不知上层**：高层 import 低层；低层不允许 import 高层。
2. **同层不交叉**：同层模块不互相 import；要协作必须经下一层（共用基础设施）或上一层（编排）。
3. **每个模块都是插件**：从 L3 起，所有模块通过同一份 `manifest.yaml` 注册，目录结构、命名、对外契约一致。
4. **平台 vs 特性严格分开**：平台是"被消费的能力"（无用户故事），特性是"用户故事的载体"（消费平台）。两者目录、命名、router 路径都分开。

CI 通过 `import-linter` 自动执法（v0.2 先 warn-only）。

---

## 2. 五层架构

```
┌────────────────────────────────────────────────────────────────┐
│ L5  入口适配  Entry Adapters                                    │
│     deeptutor/api/   FastAPI HTTP/WS, plugin loader 挂特性 router│
│     deeptutor_cli/   Typer CLI, plugin loader 挂特性命令         │
│     deeptutor/app/   DeepTutorApp facade（给 Python SDK）        │
│     web/app/         Next.js App Router（一行转发到 features/）  │
├────────────────────────────────────────────────────────────────┤
│ L4  特性插件  Feature Plugins                                   │
│     deeptutor/features/<name>/    用 manifest.yaml 注册          │
│     web/features/<name>/                                        │
│       规划：chat / book / tutorbot / notebook / math_animator    │
├────────────────────────────────────────────────────────────────┤
│ L3  领域能力  Domain Capabilities  (services/domain/)           │
│     orchestration/  agent/  capability/  tool/  knowledge/      │
│     —— 把平台原料组装成可被特性消费的成品                        │
├────────────────────────────────────────────────────────────────┤
│ L2  平台服务  Platform Services  (services/platform/)           │
│     llm/  rag/  embedding/  search/  session/  memory/  prompt/ │
│     storage/  config/  path/  setup/  editor/                   │
│     —— 单一职责的横切能力，不持有用户故事                        │
├────────────────────────────────────────────────────────────────┤
│ L1  协议核心  Protocol Core  (deeptutor/core/)                  │
│     BaseTool / BaseCapability / BaseAgent /                     │
│     UnifiedContext / StreamBus / StreamEvent /                  │
│     FeatureManifest / RunMode                                   │
│     —— 零依赖，纯抽象                                            │
└────────────────────────────────────────────────────────────────┘
```

**注意**：`services/` 顶级目录保留，**内部分** `services/platform/` 与 `services/domain/` 承载分层语义。`runtime/` 在 v3 中物理解散到 `services/domain/orchestration/` + `core/mode.py`（过渡期保留 deprecation alias）。

---

## 3. 关键边界：Capability vs Agent

> 这是 v3 与上游最大的差异。务必理解。

### 3.1 定义

```
┌────────────────────────────────────────────────────────────────┐
│ Capability  =  "编排剧本"                                       │
│   ✓ 注册到 orchestrator 的 mode（registry 入口）                 │
│   ✓ 持有 manifest（name/stages/tools_used 等元数据）             │
│   ✓ run() 里写"调用哪些子 agent / 串行还是并行 / 阶段切换"        │
│   ✗ 不直接写 LLM 调用、不直接写工具调用                          │
│   位置: services/domain/capability/<name>/capability.py         │
│                                                                │
│ Agent  =  "单职责执行单元"                                       │
│   ✓ 一个 agent 干一件事（plan / solve / write / search / ...）   │
│   ✓ run() 里写 LLM 调用、工具调用、prompt 组装                    │
│   ✓ 可被多个 capability 复用                                     │
│   ✗ 不知道"自己是哪个 mode 的一部分"                             │
│   位置: services/domain/agent/<name>.py（按职责命名，非按 mode） │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 标准形态

```python
# services/domain/agent/planner.py
class PlannerAgent(BaseAgent):
    async def run(self, ctx, stream) -> Plan: ...

# services/domain/agent/solver.py
class SolverAgent(BaseAgent):
    async def run(self, ctx, stream, plan: Plan) -> Solution: ...

# services/domain/agent/writer.py
class WriterAgent(BaseAgent):
    async def run(self, ctx, stream, sol: Solution) -> str: ...

# services/domain/capability/deep_solve/capability.py
class DeepSolveCapability(BaseCapability):
    manifest = CapabilityManifest(name="deep_solve",
                                  stages=["plan", "solve", "write"])

    async def run(self, ctx, stream):
        async with stream.stage("plan"):
            plan = await PlannerAgent().run(ctx, stream)
        async with stream.stage("solve"):
            sol = await SolverAgent().run(ctx, stream, plan)
        async with stream.stage("write"):
            out = await WriterAgent().run(ctx, stream, sol)
        await stream.result({"response": out})
```

### 3.3 退化形态（允许）

```python
# services/domain/capability/chat/capability.py
class ChatCapability(BaseCapability):
    manifest = CapabilityManifest(name="chat", stages=["responding"])
    async def run(self, ctx, stream):
        await AgenticChatAgent().run(ctx, stream)   # 单 agent 即可
```

判断标准：capability 的 `run()` 如果只剩一行 `await SomeAgent().run()`，是允许的退化形态；**禁止**把"编排"偷偷写到 agent 内部。

---

## 4. Feature 插件协议（manifest v0.2）

```yaml
# deeptutor/features/<name>/manifest.yaml
name: book                            # 必需，唯一
version: 0.2.0                        # 必需
type: feature                         # platform | feature | playground
description: "Living book authoring & reading"

backend:
  router: routers/api.py:router       # FastAPI APIRouter（可选）
  ws_channel: book                    # /api/v1/ws?channel=book（可选）
  capability: capability.py:BookCapability   # 注入 orchestrator（可选）

frontend:
  route: /book                        # Next.js 路由（可选）
  source: web/features/book           # 前端代码所在
  nav_label: "Book"                   # 侧边栏显示

depends_on:
  platform: [llm, editor, storage]    # 声明依赖的 L2 模块
  domain:   [agent, knowledge]        # 声明依赖的 L3 模块
```

**v0.2 不含**：`flags` (feature flag)、`lifecycle` (on_install/on_uninstall hooks)。等 v0.3。

**type 三分类**：
- `platform` — 横切平台插件（未来用，如第三方 LLM provider）
- `feature` — 用户可见特性（chat / book / tutorbot / notebook / math_animator）
- `playground` — 实验性插件（沿用 `deep_research` 语义）

---

## 5. Feature 目录强制结构

```
deeptutor/features/<name>/
  manifest.yaml         # 必需
  routers/              # 后端 router
  capability.py         # 可选：注入 orchestrator
  services.py           # 特性私有服务
  agents/               # 特性私有 agent（不上提到 services/domain/agent/）
  prompts/              # YAML 提示词

web/features/<name>/
  page.tsx              # 入口组件，被 web/app/(workspace)/<name>/page.tsx 转发
  components/
  hooks/
```

`deeptutor/features/_TEMPLATE/` 与 `web/features/_TEMPLATE/` 提供可复制的脚手架。

---

## 6. WebSocket 与消息契约

- 后端**唯一** WS 入口：`/api/v1/ws?channel={chat|book|tutorbot|notebook|...}`（在 `api/routers/unified_ws.py`，P1 阶段收口）
- 前端**唯一** ChatRuntime：`web/platform/chat-runtime/`，提供 `ChatClient` + `ChatMessage` 类型 + `useChatSession(channel)` hook
- 所有 chat surface（chat 主页 / bot / book / notebook）用 `useChatSession(channel) + 通用组件` 组合，不再各自实现 WebSocket

---

## 7. 入口与 CLI

```bash
# 安装
pip install -e ".[cli]"

# 运行 capability（agent-first 入口）
deeptutor run chat "Explain Fourier transform"
deeptutor run deep_solve "Solve x^2=4" -t rag --kb my-kb
deeptutor run deep_question "Linear algebra" --config num_questions=5

# REPL
deeptutor chat
# /regenerate 或 /retry 重跑上一条用户消息

# 知识库
deeptutor kb list
deeptutor kb create my-kb --doc textbook.pdf

# 插件 / 内存
deeptutor plugin list
deeptutor memory show

# 起 API server（需 .[server]）
deeptutor serve --port 8001
```

**特性命令**（如 `deeptutor bot`、`deeptutor book`、`deeptutor notebook`）由 plugin loader 从 `features/<name>/manifest.yaml` 注册到 Typer app（P4 阶段统一）。

---

## 8. 依赖分层

`pyproject.toml` `[project.optional-dependencies]`，镜像到 `requirements/*.txt`：

```
.[cli]            CLI 全功能（LLM + RAG + providers + 文档解析）
.[server]         .[cli] + FastAPI/uvicorn
.[tutorbot]       .[server] + TutorBot agent + channel SDKs
.[matrix]         Matrix channel for TutorBot（matrix-nio[e2e]，需 libolm）
.[math-animator]  Manim addon（for `deeptutor animate`）
.[dev]            .[server] + 测试/lint
.[all]            上面全部
```

> **v0.3 计划**：把 extras 与 `manifest.depends_on` 收敛，由 plugin loader 生成 install 集合。v0.2 不动 pyproject。

---

## 9. 关键文件索引（v3 目标位置）

| 路径 | 用途 |
|---|---|
| `deeptutor/core/` | L1 协议核心（BaseTool/BaseCapability/BaseAgent/UnifiedContext/StreamBus/FeatureManifest/RunMode）|
| `deeptutor/services/platform/` | L2 平台服务 |
| `deeptutor/services/domain/orchestration/orchestrator.py` | ChatOrchestrator（v3 目标位置，过渡期仍可见 `runtime/orchestrator.py` 与 deprecation alias）|
| `deeptutor/services/domain/{agent,capability,tool,knowledge}/` | L3 领域能力 |
| `deeptutor/features/<name>/` | L4 特性插件 |
| `deeptutor/api/routers/unified_ws.py` | 唯一 WS 入口（P1 收口） |
| `deeptutor/app/facade.py` | DeepTutorApp facade（CLI/SDK 使用）|
| `deeptutor_cli/main.py` | Typer CLI |
| `web/platform/chat-runtime/` | 前端统一 ChatClient + useChatSession |
| `web/platform/editor/` | 前端通用编辑器组件（co_writer 抽出） |
| `web/features/<name>/` | 前端特性入口 |

---

## 10. 迁移路线（P0–P6）

| Phase | 目标 |
|---|---|
| **P0** | 写本 AGENTS.md + 建骨架 + import-linter + smoke test（零行为变化） |
| **P1** | 后端 4 条 WS 收口 unified_ws.py + 前端 chat-runtime 抽出 |
| **P2** | services/ 内分 platform/domain；agents/、capabilities/、tools/、runtime/、knowledge/ 全部迁入 services/domain/（带 1 版 deprecation alias） |
| **P3** | co_writer 内核抽到 services/platform/editor/ + 前端通用 `<Editor>` + 删除独立 co-writer 入口 |
| **P4** | tutorbot/、book/、notebook/ 迁入 features/，挂插件协议 |
| **P5** | capability/agent 重构（编排上提到 capability，agent 按职责扁平命名） |
| **P6** | math_animator 单独迁出为特性 |

每个 Phase 完成后必须 `pytest tests/` + `web/tests/` 全绿。

---

## 11. 添加新插件（P0 阶段简略版，P3 后定稿）

```bash
# 复制模板
cp -r deeptutor/features/_TEMPLATE deeptutor/features/my_feature
cp -r web/features/_TEMPLATE web/features/my_feature

# 编辑 manifest
$EDITOR deeptutor/features/my_feature/manifest.yaml
# 改 name、description、backend.router、frontend.route、depends_on

# 实现 router / capability / page
# 启动验证
deeptutor serve --port 8001
cd web && npm run dev
```

> 当前（P0 阶段）plugin loader 尚未实现，新特性仍需手动在 `api/main.py` 注册 router。P4 完成后可纯靠 manifest 自动发现。

---

## 12. Import 方向自检（手动版，CI 自动执法见 P0.5）

```bash
# core 必须零依赖
grep -r "from deeptutor\." deeptutor/core/ && echo "VIOLATION: core 不应 import 任何 deeptutor 子模块"

# platform 不应 import domain / features
grep -rE "from deeptutor\.(services\.domain|features)" deeptutor/services/platform/

# domain 不应 import features
grep -r "from deeptutor.features" deeptutor/services/domain/

# features 之间不应互相 import
grep -r "from deeptutor.features.<other>" deeptutor/features/<one>/
```
