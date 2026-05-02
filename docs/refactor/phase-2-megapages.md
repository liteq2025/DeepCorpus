# Phase 2 — 拆 5 个 mega-page

> **状态**：🟡 in-progress（执行规格阶段；slice 0 待开 PR）
> **估时**：约 2 周（每个 page 2-3 天）
> **验收**：5 个 page 全部 ≤ 600 行；总行数 ≤ 4,000；`npm run check:e2e` 全绿；smoke + visual 不退步

## 0. 第一性原理

mega-page 的代价不是「文件大」本身，而是：

1. **改一项要扫一整面墙** —— 局部状态 / handler / 子组件全在一个 scope，读者无法快速定位
2. **diff 评审困难** —— 50 行改动散落在 2k 行文件里，很难一眼看清边界
3. **复用受阻** —— 内部组件没有单独导出，跨页面复用必须先抽
4. **测试粒度差** —— 整个 page 当一个黑盒 smoke test，子单元的边界条件没保护

拆分的目标不是「单纯减行数」，是把上面四件事都改好。**只为减行数的拆分（如机械按 1k 切两半）等于没拆。**

## 1. 范围 & 当前体量

| # | 路由 | 文件 | 行数 | 主要内容 |
|:-:|---|---|:-:|---|
| 1 | `/co-writer/[docId]` | `app/(workspace)/co-writer/[docId]/page.tsx` | **2252** | 单个 `CoWriterPage()` 内含 editor / renderer / toolbar / selection popover / source selector / autosave |
| 2 | `/playground` | `app/(workspace)/playground/page.tsx` | **2128** | TracePanel + ToolExecutor + CapabilityResultPanel + main page；多 capability 测试器 |
| 3 | `/agents` | `app/(workspace)/agents/page.tsx` | **2075** | 4 个 Tab（Bots / Profiles / Channels / Souls）+ SchemaField form-builder |
| 4 | `/settings` | `app/(utility)/settings/page.tsx` | **1647** | LLM / embedding / search 三服务 + tour guide + spotlight overlay |
| 5 | `/chat` | `app/(workspace)/chat/[[...sessionId]]/page.tsx` | **1286** | 单个 `ChatPage()` 内含 capability dispatch + picker glue + attachment handling |

**总行数：9388**（目标 ≤ 4000，即每个文件 ≤ 800 平均；硬上限 ≤ 600 / 文件）

## 2. 关联的「重 component」

不是 page，但属于同一片墙，需要并行处理：

| 文件 | 行数 | 跟哪个 page 一起处理 |
|---|---|---|
| `components/dev/showcases.tsx` | 3069 | 独立 — 是 registry 不是逻辑墙；按需抽到 `components/dev/showcases/<group>.tsx` |
| `components/chat/home/TracePanels.tsx` | 1152 | /chat |
| `components/chat/home/ChatComposer.tsx` | 1027 | /chat |
| `app/(workspace)/book/components/BookCreator.tsx` | 1108 | 独立 — `/book` 不在本期 5 个，下一轮再说 |
| `components/quiz/QuizViewer.tsx` | 933 | 部分被 /playground 用 |
| `components/space/SkillsSection.tsx` | 801 | 独立 — `/space` 不在本期 |

## 3. 拆分通用规则

每个 mega-page 的拆分按以下顺序应用：

### 3.1 抽 helper（lib/）
- 纯函数 / 类型 / 常量 → `lib/<page>-helpers.ts`
- 带 i18n 的纯函数也算
- **检查**：抽完是否能在不 mount 的情况下 unit test

### 3.2 抽 hook（hooks/）
- 单页面专用的 stateful logic → `hooks/use<Feature>.ts`
- 多个 useState / useEffect 围绕同一概念 → 一个 hook
- **检查**：hook 内不能直接渲染 JSX；只 return state + handlers

### 3.3 抽 sub-component（components/<page>/）
- 内部命名 function 组件 ≥ 50 行 → 单独文件
- props 接口在文件顶部 export
- **检查**：每个 sub-component 应该能在 `/dev` showcase 单独渲染

### 3.4 主 page 组装
- 主 page 文件最终只剩：dynamic imports + state hooks 调用 + JSX 组装
- 目标 ≤ 300 行（≤ 600 是硬上限）

### 3.5 视觉 + smoke 验证
- 改前如果该路由有 visual baseline，改后差异在 maxDiffPixelRatio 以内
- smoke test 不退步
- 如果该路由无 visual baseline，先补再拆（除非 PLAN.md 明确不补）

## 4. 推荐执行顺序

按风险 × ROI 排：

| Slice | 路由 | 推荐顺序理由 |
|:-:|---|---|
| **2.1** | `/agents` | 4 个 Tab 是清晰边界，机械拆 4 个文件就成；先建立 momentum |
| **2.2** | `/playground` | 3 个 named function 组件（TracePanel/ToolExecutor/CapabilityResultPanel）都已有独立的「业务概念」，拆出即可 |
| **2.3** | `/chat` | 1286 行是 5 个里最少的，且已有 `chat-page.visual.ts` baseline 兜底；同时拆 ChatComposer / TracePanels |
| **2.4** | `/settings` | 三服务结构清晰，但有共享 `catalog` state；要先抽 hook |
| **2.5** | `/co-writer` | 单个 2076 行函数，难度最高；前 4 个完成后再上手，已积累 hook 抽取经验 |

每个 slice 期望产出 4-7 个 commit（helpers / hooks / sub-components / main / visual baseline）。

## 5. 各 slice 拆分预案

### 5.1 /agents（2075 → 5 个文件）

```
app/(workspace)/agents/page.tsx                     ≤ 250
  └─ 主组件：tab 路由 + 共享状态

components/agents/SchemaField.tsx                   ≤ 250
  └─ 第 270-475 行的 form-builder（含 FieldLabel / humaniseKey / defaultFor）

components/agents/tabs/BotsTab.tsx                  ≤ 400
components/agents/tabs/ProfilesTab.tsx              ≤ 550 ← 最大；可能再拆
components/agents/tabs/ChannelsTab.tsx              ≤ 350
components/agents/tabs/SoulsTab.tsx                 ≤ 320

lib/agents-helpers.ts                               ≤ 100
  └─ resolveSchemaVariant / isNullable / defaultFor / humaniseKey
```

### 5.2 /playground（2128 → 5 个文件）

```
app/(workspace)/playground/page.tsx                 ≤ 350

components/playground/TracePanel.tsx                ≤ 200  (现 237-347)
components/playground/ToolExecutor.tsx              ≤ 400  (现 348-657 — 最大)
components/playground/CapabilityResultPanel.tsx     ≤ 350  (现 658-?)

lib/playground-helpers.ts                           ≤ 150
  └─ TOOL_ICONS / TOOL_LABELS / CAPABILITY_ICONS / CAPABILITY_LABELS / titleCase /
     normalizeDeepQuestionConfig / DEFAULT_DEEP_QUESTION_CONFIG
```

ChatComposer + TracePanels 是 /chat 共用的，本 slice 不动。

### 5.3 /chat（1286 → 4-5 个文件）

```
app/(workspace)/chat/[[...sessionId]]/page.tsx      ≤ 350
  └─ 主壳：dynamic imports + UnifiedChatProvider 集成

hooks/useChatCapabilities.ts                        ≤ 200
  └─ 当前 page 内 capability 选择 / persistence 相关 useEffect

hooks/useChatAttachments.ts                         ≤ 150
  └─ pendingAttachments + handler

lib/chat-config.ts                                  ≤ 100
  └─ ALL_TOOLS / CAPABILITIES / RESEARCH_SOURCES / getCapability()
```

并行拆 `components/chat/home/`：

```
ChatComposer.tsx (1027) → ChatComposer.tsx + ChatComposerToolbar.tsx + 
                          ChatComposerCapabilityBar.tsx
                          每个 ≤ 400

TracePanels.tsx (1152) → TracePanels.tsx + StagePanel.tsx + ToolCallPanel.tsx +
                          SourcesPanel.tsx
                          每个 ≤ 350
```

### 5.4 /settings（1647 → 6 个文件）

```
app/(utility)/settings/page.tsx                     ≤ 350

components/settings/LlmServiceConfig.tsx            ≤ 350
components/settings/EmbeddingServiceConfig.tsx      ≤ 350
components/settings/SearchServiceConfig.tsx         ≤ 300
components/settings/SpotlightOverlay.tsx            ≤ 100  (现 254-336)
components/settings/TourGuide.tsx                   ≤ 100  (含 TOUR_GUIDE_STEPS)

hooks/useSettingsCatalog.ts                         ≤ 200
  └─ 共享 catalog state + persistence

lib/settings-helpers.ts                             ≤ 200
  └─ types + cloneCatalog / getActiveProfile / getActiveModel / 
     formatContextWindow* / inputClass / selectClass
```

### 5.5 /co-writer（2252 → 7-8 个文件）—— 最难

```
app/(workspace)/co-writer/[docId]/page.tsx          ≤ 400  (主壳)

components/co-writer/CoWriterEditor.tsx             ≤ 400
components/co-writer/CoWriterRenderer.tsx           ≤ 300
components/co-writer/CoWriterToolbar.tsx            ≤ 250  (含 ToolbarIconBtn)
components/co-writer/SelectionPopover.tsx           ≤ 350
components/co-writer/SourceSelector.tsx             ≤ 200

hooks/useCoWriterAutosave.ts                        ≤ 200
hooks/useCoWriterSelection.ts                       ≤ 200
hooks/useCoWriterStream.ts                          ≤ 250

lib/co-writer-helpers.ts                            ≤ 200
  └─ types + ACTION_LABELS / TOOL_OPTIONS / MODE_OPTIONS / constants
```

## 6. 不在本计划范围

- /book multi-view shell 拆分（独立 page，本期不动）
- /space sub-route 内部进一步拆分
- showcase registry 拆分（属于另一种「大」，留待 dev 工具改进时做）
- ChatComposer/TracePanels 之外的 chat 子组件
- 引入新 state 管理库（Redux/Zustand）—— PLAN §5 明确不做

## 7. 进度日志

> 反向时间序，最新在上。

| 日期 | slice | 事件 |
|---|---|---|
| 2026-05-02 | — | 规格落地（本文档）。当前 5 mega-page 实测 9388 行。先开 2.1 /agents。 |
