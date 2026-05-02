# Phase 1 — FE↔BE WS contract codegen

> **状态**：✅ MVP 完成（commit pending）
> **范围**：服务端→客户端 `StreamEvent` codegen + CI drift gate
> **未做**：客户端→服务端消息 codegen（理由见下）、REST OpenAPI codegen（不在本期 scope）

## 1. 为什么要做

FE 和 BE 之间通过 `/api/v1/ws` 交换实时事件。每个事件是 `StreamEvent` 协议的一个实例。

修复前：
- BE：`deeptutor/core/stream.py` 用 `@dataclass` 定义 `StreamEvent` + 枚举 `StreamEventType`
- FE：`web/lib/unified-ws.ts` 手动镜像同样的形状（`export interface StreamEvent { ... }`）
- 两套定义没有任何机械关联，**BE 加字段 / 改字段 → FE 不会编译失败、运行时静默坏掉**

修复后：
- BE 仍是 source of truth
- `scripts/gen_ws_types.py` 读 BE 模块，emit `web/lib/ws-events.gen.ts`
- `web/lib/unified-ws.ts` 从 .gen 文件 re-export，不再独立定义
- CI（`make types-check`）跑 codegen，diff 命中即 fail

## 2. 工件清单

| 文件 | 角色 |
|---|---|
| `deeptutor/core/stream.py` | source of truth（BE 已有） |
| `scripts/gen_ws_types.py` | codegen 脚本（stdlib only，不需要 pip install） |
| `Makefile` | `types` 重生成，`types-check` 验证无漂移 |
| `web/lib/ws-events.gen.ts` | 自动生成，禁止手改（文件头有警告） |
| `web/lib/unified-ws.ts` | 从 .gen re-export `StreamEvent` / `StreamEventType` |
| `.github/workflows/web-tests.yml` | 新增 `make types-check` step + 路径过滤扩展到 `deeptutor/core/stream.py` |

## 3. 关键设计决策

### 3.1 不把 `StreamEvent` 改成 Pydantic
最干净的 codegen 路径是把 BE dataclass 改成 Pydantic，用 `model_json_schema()` → JSON Schema → TS。但这是 **运行时行为变更**（验证、序列化、init signature 都会变），有概率打破现有 BE 测试和正在跑的服务。

折中：保留 dataclass，写 30 行手动 mapping（`TS_FIELDS` dict），并在 codegen 时 assert dataclass 字段集 == mapping 键集。BE 加/删/改字段时 codegen 立刻报错，不至于无声漂移。

### 3.2 不做客户端→服务端消息 codegen
FE 有 7 种 `client → server` 消息（`StartTurnMessage` / `SubscribeTurnMessage` / `RegenerateMessage` / ...），但 **BE 端在 `deeptutor/api/routers/unified_ws.py` 里直接 `dict[str, Any]` 解析**，没有对应的 Python 类型定义。

要 codegen 这一边，需要先在 BE 加 Pydantic message envelope 类型 + 改 router 走 `model_validate(payload)`——独立的 1 天工作量。本期 scope 不含。

文档化：`web/lib/unified-ws.ts` 注释明说「这块是手动双向维护，BE 改了请同步」。

### 3.3 不做 REST OpenAPI codegen
FastAPI 自动 emit OpenAPI schema，能用 `openapi-typescript` 一键生成 REST 类型。但：
- `lib/session-api.ts` / `lib/notebook-api.ts` / `lib/knowledge-api.ts` 等的手写类型已经稳定使用
- REST 调用通常 fetch 后 JSON.parse，类型 cast 是声明性的，runtime 错也容易诊断
- WS 事件流是「无类型 cast → 状态机分发」的关键路径，类型错=静默错，更危险

REST OpenAPI codegen 留给 Phase 1 续作（如果以后做 REST refactor 时需要）。

## 4. 如何使用

### 平时开发
什么都不用做。`web/lib/unified-ws.ts` 像以前一样 import：

```ts
import type { StreamEvent, StreamEventType } from "@/lib/unified-ws";
```

### 改了 `deeptutor/core/stream.py` 之后
```bash
make types          # 重生成
git add web/lib/ws-events.gen.ts
git commit -m "..."
```

如果忘了 commit `.gen.ts`，CI 会在 `make types-check` 步报错：

```
✗ web/lib/ws-events.gen.ts is stale.
  Run `make types` and commit the regenerated file.
```

### 加了新字段
1. 在 `deeptutor/core/stream.py` 加 dataclass field
2. 在 `scripts/gen_ws_types.py` 的 `TS_FIELDS` dict 加对应 TS 类型
3. `make types`
4. commit 三个文件

如果忘了第 2 步，codegen 立即报错：

```
StreamEvent field drift between dataclass and codegen mapping:
  missing from dataclass: ∅
  extra in dataclass:     ['my_new_field']
Update TS_FIELDS in scripts/gen_ws_types.py to resync.
```

## 5. 当前 codegen 副产品

启用 codegen 时跑 typecheck 暴露了 2 处 latent inconsistency：

| 位置 | 问题 |
|---|---|
| `context/UnifiedChatContext.tsx:797` | 客户端构造的 timeout error event 漏了 `session_id` / `turn_id` / `seq` 字段。BE 永远会带（默认 ""/0），FE 自造的 event 反而没带——之前 FE 类型把这三个标 optional 才掩盖了 |
| `components/dev/showcases.tsx:1262` | 同上，showcase 的 `makeStreamEvent()` 工厂漏掉默认值 |

两处都补了 `session_id: ""` / `turn_id: ""` / `seq: 0`。这是 Phase 1 第一天就抓到的真实漂移收益。

## 6. 后续可能的扩展

低优先级，按需做：

| 续作 | 触发条件 |
|---|---|
| 客户端→服务端 message codegen | BE WS router 重构时顺手改成 Pydantic envelope 解析 |
| REST OpenAPI codegen | Phase 2 拆 mega-page 时如发现 REST 类型对不上 |
| 知识库类型 codegen | Knowledge schema 演进频繁时 |
| 强类型 metadata payload | `event.metadata` 现在是 `Record<string, unknown>`；不同 event type 的 metadata 形状不同，可以用 discriminated union 收紧 |
