"use client";

import { useState } from "react";
import {
  DEV_REGISTRY,
  type ModuleEntry,
  type RegistryGroup,
  type ModuleStatus,
  type TagEntry,
} from "@/lib/dev-registry";
import {
  SHOWCASES,
  ShowcaseErrorBoundary,
  type Showcase,
} from "@/components/dev/showcases";

const STATUS_STYLES: Record<ModuleStatus, string> = {
  shipped: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  wip: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  planned: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
};

function StatusPill({ status }: { status?: ModuleStatus }) {
  if (!status) return null;
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

/** Render one chip with up to 3 fields: cn label + {code} + — desc. */
function Chip({ entry }: { entry: TagEntry }) {
  const cn = typeof entry === "string" ? entry : entry.cn;
  const code = typeof entry === "string" ? undefined : entry.code;
  const desc = typeof entry === "string" ? undefined : entry.desc;
  const showCode = code && code !== cn;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[11px]">
      <span className="text-[var(--foreground)]">{cn}</span>
      {showCode && (
        <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
          {`{${code}}`}
        </span>
      )}
      {desc && (
        <span className="text-[10px] italic text-[var(--muted-foreground)]/80">
          — {desc}
        </span>
      )}
    </span>
  );
}

function TagChips({ tags }: { tags: TagEntry[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t, i) => {
        const key =
          typeof t === "string"
            ? `${t}-${i}`
            : `${t.cn}:${t.code ?? ""}:${t.desc ?? ""}-${i}`;
        return <Chip key={key} entry={t} />;
      })}
    </div>
  );
}

function GroupTable({ group }: { group: RegistryGroup }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <table className="w-full text-[13px]">
        <thead className="bg-[var(--secondary)]/40 text-left text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
          <tr>
            <th className="w-[24%] px-4 py-2.5 font-medium">类目</th>
            <th className="w-[6%] px-4 py-2.5 font-medium">数量</th>
            <th className="px-4 py-2.5 font-medium">内容</th>
            <th className="w-[8%] px-4 py-2.5 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {group.modules.map((mod) => (
            <tr
              key={mod.id}
              className="border-t border-[var(--border)] align-top hover:bg-[var(--secondary)]/20"
            >
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="font-medium text-[var(--foreground)]">
                    {mod.label}
                  </span>
                  {mod.code && (
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                      {`{${mod.code}}`}
                    </span>
                  )}
                </div>
                {mod.desc && (
                  <div className="mt-1 text-[11px] italic leading-relaxed text-[var(--muted-foreground)]/80">
                    — {mod.desc}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-[var(--foreground)]">
                {mod.tags.length}
              </td>
              <td className="px-4 py-3">
                <TagChips tags={mod.tags} />
              </td>
              <td className="px-4 py-3">
                <StatusPill status={mod.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Compact card for one component category, used in the gallery view. */
function CategoryCard({ mod }: { mod: ModuleEntry }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)]/40 p-3">
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span className="text-[13px] font-medium text-[var(--foreground)]">
          {mod.label}
        </span>
        {mod.code && (
          <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
            {`{${mod.code}}`}
          </span>
        )}
        <span className="ml-auto rounded bg-[var(--secondary)]/40 px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">
          {mod.tags.length}
        </span>
        <StatusPill status={mod.status} />
      </div>
      {mod.desc && (
        <div className="text-[11px] italic leading-relaxed text-[var(--muted-foreground)]/80">
          — {mod.desc}
        </div>
      )}
      <TagChips tags={mod.tags} />
    </div>
  );
}

/** All component categories laid out as a multi-column gallery for global viewing. */
function ComponentsGallery({ group }: { group: RegistryGroup }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {group.modules.map((mod) => (
        <CategoryCard key={mod.id} mod={mod} />
      ))}
    </div>
  );
}

const GALLERY_ID = "__components_gallery__";
const SHOWCASE_ID = "__components_showcase__";
const TREE_ID = "__component_tree__";

/** Static directory tree of the entire web/ UI architecture, annotated with each
 *  file's role. Covers app router pages, components, contexts, hooks, i18n,
 *  and lib (utility / API client / types). Update when files move. */
const COMPONENT_TREE = `web/                                              整个前端 UI 架构（约 160 个 ts/tsx）
│
├── app/                                          App Router · Next.js 16  (31 files · 8 路由)
│   ├── layout.tsx                                ⭐ 根布局（ThemeScript + AppShell + i18n）
│   ├── globals.css                               全局 CSS / token
│   │
│   ├── (utility)/                                ✦ 路由组：工具型页面（左栏 UtilitySidebar）
│   │   ├── layout.tsx                            UtilitySidebar 包装
│   │   ├── dev/page.tsx                          ⭐ 本控制台路由
│   │   ├── knowledge/page.tsx                    /knowledge
│   │   ├── memory/page.tsx                       /memory
│   │   ├── notebook/page.tsx                     /notebook
│   │   ├── settings/page.tsx                     /settings
│   │   └── space/                                /space/* 工作区子路由
│   │       ├── layout.tsx                        Space 子路由布局
│   │       ├── page.tsx                          Space 总览
│   │       ├── memory/page.tsx
│   │       ├── notebooks/page.tsx
│   │       ├── questions/page.tsx                题库
│   │       └── skills/page.tsx
│   │
│   ├── (workspace)/                              ✦ 路由组：工作区（左栏 WorkspaceSidebar）
│   │   ├── layout.tsx                            WorkspaceSidebar 包装
│   │   ├── page.tsx                              首页 / Chat 入口
│   │   ├── chat/[[...sessionId]]/page.tsx        /chat 与 /chat/<sid>
│   │   ├── playground/page.tsx                   capability 调试台
│   │   ├── agents/page.tsx                       TutorBot 列表
│   │   ├── agents/[botId]/chat/page.tsx          单个 bot 的对话
│   │   ├── co-writer/page.tsx                    Co-Writer 文档列表
│   │   ├── co-writer/[docId]/page.tsx            Co-Writer 编辑
│   │   ├── co-writer/sampleTemplate.ts           内置模板
│   │   └── book/                                 互动书引擎
│   │       ├── page.tsx                          /book 总入口
│   │       └── components/                       ⭐ 路由本地组件（24 files）
│   │           ├── BookChatPanel.tsx             书内对话面板（WS）
│   │           ├── BookCreator.tsx               新建书向导（多步）
│   │           ├── BookHealthBanner.tsx          健康提示（auto-fetch）
│   │           ├── BookLibrary.tsx               书库（书籍卡片列表）
│   │           ├── BookProgressTimeline.tsx      编译进度（full/compact/mini）
│   │           ├── BookSidebar.tsx               书内左栏（信息 + 页导航）
│   │           ├── PageOutlineNav.tsx            页内 block 大纲跳转
│   │           ├── PageReader.tsx                ⭐ 页面阅读器（渲染 blocks）
│   │           ├── SpineEditor.tsx               脊柱编辑（章节大纲）
│   │           │
│   │           └── blocks/                       15 files · BlockType 一一对应
│   │               ├── BlockRenderer.tsx         ⭐ 按 BlockType 路由到下方
│   │               ├── AnimationBlock.tsx        动画（视频/图）
│   │               ├── CalloutBlock.tsx          强调框（4 variant）
│   │               ├── CodeBlock.tsx             代码块
│   │               ├── ConceptGraphBlock.tsx     概念图谱
│   │               ├── DeepDiveBlock.tsx         深度展开建议
│   │               ├── FigureBlock.tsx           图（VisualizationViewer 包装）
│   │               ├── FlashCardsBlock.tsx       闪卡（翻转 + 上下卡）
│   │               ├── InteractiveBlock.tsx      交互 HTML 沙盒
│   │               ├── PlaceholderBlock.tsx      占位（Phase 2 兜底）
│   │               ├── QuizBlock.tsx             测验
│   │               ├── SectionBlock.tsx          章节（intro + 子段 + takeaway）
│   │               ├── TextBlock.tsx             文本（Markdown 正文）
│   │               ├── TimelineBlock.tsx         时间线
│   │               └── UserNoteBlock.tsx         用户笔记
│   │
│   └── api/                                      Next API routes（多数走 Python 后端）
│       └── version/route.ts                      前端版本探测
│
├── components/                                   全局可复用组件 (75 files · 12 dirs)
│   ├── Mermaid.tsx                               图表渲染（懒加载 mermaid）
│   ├── SessionList.tsx                           会话列表（状态徽章 + 重命名/删除）
│   ├── ThemeScript.tsx                           SSR 主题注入（防 flash）
│   │
│   ├── chat/                                     14 files
│   │   ├── AtMentionPopup.tsx                    @ 提及三入口选单
│   │   ├── HistorySessionPicker.tsx              历史会话选择
│   │   ├── QuestionBankPicker.tsx                题库选择
│   │   ├── home/                                 6
│   │   │   ├── ChatComposer.tsx                  ⭐ 主输入容器（capability + 工具 + 引用）
│   │   │   ├── ChatMessages.tsx                  ⭐ 消息列表（user/assistant 分支）
│   │   │   ├── ComposerInput.tsx                 完整输入框（@ 触发 + 上传）
│   │   │   ├── SimpleComposerInput.tsx           极简输入框
│   │   │   ├── TracePanels.tsx                   工具调用追踪面板
│   │   │   └── composer-field.tsx                内部小组件（Field/CollapsibleSection）
│   │   └── preview/                              9
│   │       ├── FilePreviewDrawer.tsx             右侧滑出附件抽屉
│   │       ├── previewerFor.ts                   kind 路由表（按扩展名/MIME）
│   │       └── previewers/                       8
│   │           ├── FallbackPreview.tsx           兜底（下载 CTA）
│   │           ├── ImagePreview.tsx              图片
│   │           ├── MarkdownPreview.tsx           Markdown
│   │           ├── OfficeTextPreview.tsx         DOCX/XLSX/PPTX 提取文本
│   │           ├── PdfPreview.tsx                PDF (iframe)
│   │           ├── SvgPreview.tsx                SVG
│   │           ├── TextPreview.tsx               纯文本/代码
│   │           └── useTextSource.ts              fetch 文本内容的 hook
│   │
│   ├── common/                                   8 files · 共享渲染原语
│   │   ├── AssistantResponse.tsx                 AI 回复整体容器（解析 <think>）
│   │   ├── MarkdownRenderer.tsx                  ⭐ 入口（dispatcher，按需切 rich/simple）
│   │   ├── Modal.tsx                             通用 Modal
│   │   ├── ModelThinkingCard.tsx                 <think> 折叠卡片
│   │   ├── ProcessLogs.tsx                       进度日志（stick-to-bottom）
│   │   ├── RichCodeBlock.tsx                     Prism 高亮代码块
│   │   ├── RichMarkdownRenderer.tsx              重渲染（KaTeX/Mermaid/Highlight）
│   │   └── SimpleMarkdownRenderer.tsx            轻渲染（无外部依赖）
│   │
│   ├── dev/                                      2 files
│   │   ├── DevDashboard.tsx                      ⭐ 本控制台
│   │   └── showcases.tsx                         Showcase 注册表（73 个组件）
│   │
│   ├── knowledge/                                16 files
│   │   ├── CreateKbModal.tsx                     新建 KB 模态
│   │   ├── FileDropZone.tsx                      拖拽上传区
│   │   ├── IndexVersionChip.tsx                  索引版本徽章
│   │   ├── KbDocumentList.tsx                    文档列表（auto-fetch）
│   │   ├── KbDocumentsSection.tsx                文档区（drop + upload + logs）
│   │   ├── KbFilePreview.tsx                     单文件预览
│   │   ├── KbFilesTab.tsx                        master-detail（list + preview）
│   │   ├── KbIndexVersionsSection.tsx            版本历史 + 重建索引
│   │   ├── KbSettingsSection.tsx                 KB 元数据 + 默认/删除
│   │   ├── KbStatusBadge.tsx                     状态徽章（ready/error/...）
│   │   ├── KbStatusDot.tsx                       极简圆点版
│   │   ├── KbUpdateHistory.tsx                   更新历史
│   │   ├── KnowledgeBaseDetail.tsx               右侧详情面板
│   │   ├── KnowledgeBaseList.tsx                 左侧 KB 列表
│   │   ├── KnowledgeBaseListItem.tsx             单个 KB 卡片
│   │   └── KnowledgePage.tsx                     ⭐ /knowledge 路由编排
│   │
│   ├── math-animator/                            2 files
│   │   ├── MathAnimatorConfigPanel.tsx           Manim 输出/质量/风格
│   │   └── MathAnimatorViewer.tsx                渲染产物 viewer
│   │
│   ├── notebook/                                 4 files
│   │   ├── NotebookRecordPicker.tsx              modal 容器
│   │   ├── NotebookSelector.tsx                  两层勾选树（notebook → record）
│   │   ├── SaveToNotebookModal.tsx               保存到 Notebook
│   │   └── useNotebookSelection.ts               选择状态 hook
│   │
│   ├── quiz/                                     3 files
│   │   ├── QuestionFollowupPanel.tsx             单题追问对话
│   │   ├── QuizConfigPanel.tsx                   custom/mimic 模式 + 题量
│   │   └── QuizViewer.tsx                        答题界面
│   │
│   ├── research/                                 2 files
│   │   ├── ResearchConfigPanel.tsx               mode × depth × sources
│   │   └── ResearchOutlineEditor.tsx             大纲编辑（开始研究前）
│   │
│   ├── sidebar/                                  7 files
│   │   ├── BookRecent.tsx                        最近的书（fetch）
│   │   ├── CoWriterRecent.tsx                    最近的 Co-Writer 文档
│   │   ├── SidebarShell.tsx                      侧栏外壳（公共骨架）
│   │   ├── TutorBotRecent.tsx                    TutorBot 最近活动
│   │   ├── UtilitySidebar.tsx                    ⭐ utility 路由组左栏
│   │   ├── VersionBadge.tsx                      底部版本徽章
│   │   └── WorkspaceSidebar.tsx                  ⭐ workspace 路由组左栏
│   │
│   ├── space/                                    6 files
│   │   ├── MemorySection.tsx                     记忆段
│   │   ├── NotebooksSection.tsx                  笔记本段
│   │   ├── QuestionBankSection.tsx               题库段
│   │   ├── SkillsSection.tsx                     Skills 段
│   │   ├── SpaceMiniNav.tsx                      Space 子导航
│   │   └── SpaceSectionHeader.tsx                段头（icon + 标题 + meta）
│   │
│   ├── ui/                                       1 file ⚠ 设计系统薄弱
│   │   └── Button.tsx                            4 variant × 3 size
│   │
│   └── visualize/                                2 files
│       ├── VisualizationViewer.tsx               SVG/Chart.js/Mermaid/HTML 多形态
│       └── VisualizeConfigPanel.tsx              render_mode 切换
│
├── context/                                      React Context Providers (3)
│   ├── AppShellContext.tsx                       ⭐ 主题/语言/会话/全局开关
│   ├── UnifiedChatContext.tsx                    ⭐ 对话状态机（消息/流/引用/snapshot）
│   └── app-shell-storage.ts                      localStorage 桥接（SSR 安全）
│
├── hooks/                                        自定义 hooks (6)
│   ├── useChatAutoScroll.ts                      消息列表 stick-to-bottom
│   ├── useCollapsiblePanel.ts                    折叠面板状态
│   ├── useKnowledgeBases.ts                      /knowledge 数据源
│   ├── useKnowledgeHistory.ts                    KB 更新历史
│   ├── useKnowledgeProgress.ts                   实时索引进度
│   └── useMeasuredHeight.ts                      通用高度测量
│
├── i18n/                                         国际化 (4)
│   ├── I18nClientBridge.tsx                      SSR → 客户端桥
│   ├── I18nProvider.tsx                          react-i18next 容器
│   ├── init.ts                                   初始化 + 资源加载
│   └── index.ts                                  re-export
│
└── lib/                                          工具 / API 客户端 / 类型契约 (38)
    ├── api.ts                                    fetch 包装 + apiUrl()
    ├── book-api.ts                               Book WebSocket 客户端
    ├── book-progress.ts                          BookProgress reducer
    ├── book-types.ts                             ⭐ Book 数据契约（Block/BlockType/Page/Spine）
    ├── chat-export.ts                            导出 markdown / json
    ├── client-cache.ts                           浏览器内存缓存
    ├── co-writer-api.ts                          Co-Writer REST 客户端
    ├── co-writer-events.ts                       Co-Writer 事件类型
    ├── code-languages.ts                         扩展名 → highlight 语言
    ├── composer-keyboard.ts                      Enter / Shift+Enter 键位
    ├── datetime.ts                               时间格式化
    ├── debounce.ts                               通用 debounce
    ├── dev-registry.ts                           ⭐ Dev console 内容（mind-map taxonomy）
    ├── doc-attachments.ts                        文件类型判定 + 图标映射
    ├── file-attachments.ts                       附件上传策略
    ├── iframe-html.ts                            InteractiveBlock 沙盒构建
    ├── knowledge-api.ts                          /api/v1/knowledge 客户端
    ├── knowledge-helpers.ts                      KB 状态计算（resolveKbStatus 等）
    ├── latex.ts                                  KaTeX 包装
    ├── markdown-display.ts                       是否有可见 markdown
    ├── math-animator-types.ts                    ⭐ 数学动画契约
    ├── notebook-api.ts                           笔记本 REST 客户端
    ├── notebook-selection-types.ts               Notebook / Record / SelectedRecord
    ├── persistence.ts                            SSR 安全的 localStorage
    ├── playground-config.ts                      Playground 配置
    ├── quiz-question-type.ts                     choice/written/coding 归一化
    ├── quiz-types.ts                             ⭐ Quiz 契约
    ├── research-types.ts                         ⭐ Research 契约
    ├── route-params.ts                           动态路由参数解析
    ├── session-api.ts                            session list / detail
    ├── skills-api.ts                             Skills CRUD
    ├── stream.ts                                 SSE 流解析
    ├── theme-utils.ts                            主题工具
    ├── theme.ts                                  light/dark token 表
    ├── think-segments.ts                         <think>...</think> 解析器
    ├── unified-ws.ts                             ⭐ 统一 WS 客户端（chat / sessions / turns）
    ├── version.ts                                build tag 解析
    └── visualize-types.ts                        ⭐ Visualize 契约

⭐ = 路由根 / 编排层 / 关键契约（牵一发而动全身）
✦ = Next.js 路由组（圆括号目录，不参与 URL 路径）
⚠ = 已识别的弱项`;

/** Total number of `.tsx` / `.ts` leaves in the tree above (file lines, not dirs).
 *  Match leaf entries: a tree connector (`├──` / `└──`) followed by a path /
 *  filename ending in `.tsx` or `.ts`. Directories end in `/` so they don't
 *  match; annotation text may contain `.ts` but lacks the connector prefix. */
const TREE_FILE_COUNT = COMPONENT_TREE.split("\n").filter((line) =>
  /[├└]── \S+\.tsx?(?:\s|$)/.test(line),
).length;

function ComponentTreeView() {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]/40">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[var(--border)] bg-[var(--secondary)]/30 px-4 py-2.5">
        <span className="text-[13px] font-medium text-[var(--foreground)]">
          UI 架构目录树
        </span>
        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
          {`{web/ → app + components + context + hooks + i18n + lib}`}
        </span>
        <span className="text-[11px] italic text-[var(--muted-foreground)]/80">
          — 物理目录全景；右侧注释为该文件的角色，⭐ 表示编排层 / 关键契约，✦
          表示路由组，⚠ 表示已识别弱项
        </span>
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[12px] leading-[1.55] text-[var(--foreground)]">
        {COMPONENT_TREE}
      </pre>
    </div>
  );
}

/** Group showcases by their `category` field while preserving registry order. */
function groupShowcases(showcases: Showcase[]): Array<{
  category: string;
  categoryCode: string;
  items: Showcase[];
}> {
  const order: string[] = [];
  const map = new Map<
    string,
    { category: string; categoryCode: string; items: Showcase[] }
  >();
  for (const s of showcases) {
    if (!map.has(s.category)) {
      order.push(s.category);
      map.set(s.category, {
        category: s.category,
        categoryCode: s.categoryCode,
        items: [],
      });
    }
    map.get(s.category)!.items.push(s);
  }
  return order.map((c) => map.get(c)!);
}

function ShowcaseCard({ showcase }: { showcase: Showcase }) {
  const { Preview } = showcase;
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]/40">
      <div className="flex items-baseline gap-2 border-b border-[var(--border)] bg-[var(--secondary)]/30 px-4 py-2.5">
        <span className="text-[13px] font-medium text-[var(--foreground)]">
          {showcase.name}
        </span>
        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
          {`{${showcase.code}}`}
        </span>
        <span className="ml-auto rounded bg-[var(--secondary)]/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
          {showcase.categoryCode}
        </span>
      </div>
      {showcase.description && (
        <div className="border-b border-[var(--border)] px-4 py-2 text-[11px] italic text-[var(--muted-foreground)]/80">
          — {showcase.description}
        </div>
      )}
      <div className="p-5">
        <ShowcaseErrorBoundary>
          <Preview />
        </ShowcaseErrorBoundary>
      </div>
    </div>
  );
}

function ComponentsShowcase({ showcases }: { showcases: Showcase[] }) {
  const groups = groupShowcases(showcases);
  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <section key={g.category}>
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
              {g.category}
            </h2>
            <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
              {`{${g.categoryCode}}`}
            </span>
            <span className="ml-1 rounded bg-[var(--secondary)]/40 px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">
              {g.items.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {g.items.map((s) => (
              <ShowcaseCard key={s.id} showcase={s} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function GroupNav({
  selectedId,
  onSelect,
  galleryCount,
  showcaseCount,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  galleryCount: number;
  showcaseCount: number;
}) {
  const navItems: Array<{ id: string; label: string; count: number }> = [
    { id: SHOWCASE_ID, label: "🎨 组件预览", count: showcaseCount },
    { id: GALLERY_ID, label: "🗂️ 全部组件总览", count: galleryCount },
    { id: TREE_ID, label: "🌳 UI 架构树", count: TREE_FILE_COUNT },
    ...DEV_REGISTRY.map((g) => ({
      id: g.id,
      label: g.label,
      count: g.modules.length,
    })),
  ];

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = item.id === selectedId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-[13px] transition ${
              active
                ? "bg-[var(--primary)]/15 text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/50 hover:text-[var(--foreground)]"
            }`}
          >
            <span className="truncate font-medium">{item.label}</span>
            <span
              className={`ml-2 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] ${
                active
                  ? "bg-[var(--primary)]/20 text-[var(--foreground)]"
                  : "bg-[var(--secondary)]/40 text-[var(--muted-foreground)]"
              }`}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/** Map a `?view=` query value to a sidebar entry id. */
function resolveInitialView(view: string | undefined): string {
  switch (view) {
    case "showcase":
      return SHOWCASE_ID;
    case "gallery":
      return GALLERY_ID;
    case "tree":
      return TREE_ID;
    default:
      // Allow any registered group id (e.g. ?view=stack) for direct linking.
      if (view && DEV_REGISTRY.some((g) => g.id === view)) return view;
      return SHOWCASE_ID;
  }
}

export default function DevDashboard({
  initialView,
}: {
  initialView?: string;
}) {
  const componentsGroup =
    DEV_REGISTRY.find((g) => g.id === "components") ?? DEV_REGISTRY[0];
  const [selectedId, setSelectedId] = useState<string>(() =>
    resolveInitialView(initialView),
  );

  const isShowcase = selectedId === SHOWCASE_ID;
  const isGallery = selectedId === GALLERY_ID;
  const isTree = selectedId === TREE_ID;
  const group =
    isShowcase || isGallery || isTree
      ? componentsGroup
      : DEV_REGISTRY.find((g) => g.id === selectedId) ?? DEV_REGISTRY[0];

  const totalComponents = componentsGroup.modules.reduce(
    (sum, m) => sum + m.tags.length,
    0,
  );

  return (
    <div className="flex h-full">
      <aside className="w-60 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--card)]/40 px-3 py-5">
        <div className="mb-4 px-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Dev Console
          </h2>
        </div>
        <GroupNav
          selectedId={selectedId}
          onSelect={setSelectedId}
          galleryCount={componentsGroup.modules.length}
          showcaseCount={SHOWCASES.length}
        />
      </aside>

      <section className="flex-1 overflow-y-auto px-10 py-8">
        <div className="mx-auto max-w-7xl">
          {isShowcase ? (
            <>
              <div className="mb-5 flex items-baseline gap-3">
                <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                  组件预览
                </h1>
                <span className="text-[12px] text-[var(--muted-foreground)]">
                  {SHOWCASES.length} 个组件 · 实时渲染
                </span>
              </div>
              <ComponentsShowcase showcases={SHOWCASES} />
            </>
          ) : isGallery ? (
            <>
              <div className="mb-5 flex items-baseline gap-3">
                <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                  全部组件总览
                </h1>
                <span className="text-[12px] text-[var(--muted-foreground)]">
                  {componentsGroup.modules.length} 个分类 · {totalComponents}{" "}
                  个组件
                </span>
              </div>
              <ComponentsGallery group={componentsGroup} />
            </>
          ) : isTree ? (
            <>
              <div className="mb-5 flex items-baseline gap-3">
                <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                  UI 架构目录树
                </h1>
                <span className="text-[12px] text-[var(--muted-foreground)]">
                  {TREE_FILE_COUNT} 个文件 · app + components + context + hooks
                  + i18n + lib
                </span>
              </div>
              <ComponentTreeView />
            </>
          ) : (
            <>
              <h1 className="mb-5 text-2xl font-semibold text-[var(--foreground)]">
                {group.label}
              </h1>
              <GroupTable group={group} />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
