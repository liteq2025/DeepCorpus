/**
 * Dev console registry — pure mind-map taxonomy.
 *
 * Each module is a category with an optional hint (rendered as muted
 * "{hint}" after the label). Each tag is either a plain string or
 * { label, hint } — same convention. Hints carry the technical detail
 * (path, alias, brief explanation); the primary label stays human-readable.
 */

export type ModuleStatus = "shipped" | "wip" | "planned";

export type TagEntry = string | { label: string; hint: string };

export interface ModuleEntry {
  id: string;
  label: string;
  /** Muted secondary text rendered as `{hint}` after the label. */
  hint?: string;
  tags: TagEntry[];
  status?: ModuleStatus;
}

export interface RegistryGroup {
  id: string;
  label: string;
  modules: ModuleEntry[];
}

export const DEV_REGISTRY: RegistryGroup[] = [
  // =====================================================================
  // OVERVIEW
  // =====================================================================
  {
    id: "overview",
    label: "Overview · 全貌索引",
    modules: [
      {
        id: "ov-features",
        label: "功能模块",
        hint: "Features",
        tags: [
          "💬 Chat",
          "🧠 AI 模式",
          "🛠️ 智能工具",
          "📚 知识库",
          "✍️ Co-Writer",
          "📖 Book",
          "🤖 TutorBot",
          "🗂️ 工作区",
          "⚙️ 设置",
        ],
      },
      {
        id: "ov-components",
        label: "前端组件",
        hint: "Components",
        tags: [
          { label: "对话", hint: "chat/" },
          { label: "共享原语", hint: "common/" },
          { label: "开发面板", hint: "dev/" },
          { label: "知识库", hint: "knowledge/" },
          { label: "数学动画", hint: "math-animator/" },
          { label: "笔记本", hint: "notebook/" },
          { label: "测验", hint: "quiz/" },
          { label: "研究", hint: "research/" },
          { label: "侧边栏", hint: "sidebar/" },
          { label: "工作区", hint: "space/" },
          { label: "UI 原语", hint: "ui/" },
          { label: "可视化", hint: "visualize/" },
          { label: "顶层", hint: "components/" },
        ],
      },
      {
        id: "ov-stack",
        label: "技术栈",
        hint: "Stack",
        tags: [
          "前端栈",
          "后端栈",
          "LLM Provider",
          "Embedding Provider",
          "搜索 Provider",
          "数据存储",
          "构建/部署",
          "文档格式",
        ],
      },
      {
        id: "ov-frontend",
        label: "前端框架情况",
        hint: "Frontend",
        tags: [
          "版本健康度",
          "路由结构",
          "设计系统",
          "国际化",
          "实时层",
          "状态管理",
          "构建配置",
          "已识别缺口",
        ],
      },
      {
        id: "ov-fork",
        label: "Path B 软 fork",
        hint: "Fork",
        tags: ["Path B 架构", "Commit 前缀规范", "90 天观察机制"],
      },
    ],
  },

  // =====================================================================
  // FEATURES
  // =====================================================================
  {
    id: "features",
    label: "Features · 功能模块",
    modules: [
      {
        id: "ft-chat",
        label: "Chat",
        hint: "智能对话",
        tags: [
          "多会话管理",
          "Skill / Capability 切换",
          "多模态附件",
          "实时流式",
          "@ 引用",
          "Trace 面板",
        ],
      },
      {
        id: "ft-modes",
        label: "AI 模式",
        hint: "Capability",
        tags: [
          { label: "Chat", hint: "普通对话" },
          { label: "Deep Solve", hint: "深度求解" },
          { label: "Deep Question", hint: "深度提问" },
          { label: "Deep Research", hint: "深度研究" },
          { label: "Math Animator", hint: "数学动画" },
          { label: "Visualize", hint: "可视化" },
        ],
      },
      {
        id: "ft-tools",
        label: "智能工具",
        hint: "Tool",
        tags: [
          { label: "RAG", hint: "知识库检索" },
          { label: "Web Search", hint: "网页搜索" },
          { label: "Code Execution", hint: "Python 沙箱" },
          { label: "Reason", hint: "深度推理" },
          { label: "Brainstorm", hint: "创意发散" },
          { label: "Paper Search", hint: "arXiv 学术" },
          { label: "GeoGebra Analysis", hint: "图像→几何" },
        ],
      },
      {
        id: "ft-knowledge",
        label: "知识库",
        hint: "Knowledge Base",
        tags: ["拖拽上传", "多格式支持", "实时索引进度", "对话中 @ 引用", "多知识库管理"],
      },
      {
        id: "ft-cowriter",
        label: "Co-Writer",
        hint: "协同写作",
        tags: ["文档列表与编辑", "迭代式编辑", "上下文感知"],
      },
      {
        id: "ft-book",
        label: "Book",
        hint: "互动书引擎",
        tags: ["智能编译", "进度跟踪", "流式生成"],
      },
      {
        id: "ft-tutorbot",
        label: "TutorBot",
        hint: "多渠道 agent",
        tags: ["Slack 渠道", "Discord 渠道", "Email (SMTP)", "定时任务调度", "Skill 系统", "心跳健康检查"],
      },
      {
        id: "ft-workspace",
        label: "工作区",
        hint: "Space",
        tags: [
          { label: "Playground", hint: "调试 capability" },
          { label: "记忆", hint: "Memory + Recall" },
          { label: "笔记本", hint: "Notebook" },
          { label: "题库", hint: "Deep Question 沉淀" },
          { label: "Skills 库", hint: "用户 markdown" },
          "Space 总览",
        ],
      },
      {
        id: "ft-settings",
        label: "设置",
        hint: "Settings",
        tags: [
          { label: "Provider Catalog", hint: "多 profile / 多 model" },
          { label: "Connection Test", hint: "端到端探活" },
          "主题 light / dark / glass",
          "语言 中 / 英",
          "首次运行向导",
          "诊断工具",
        ],
      },
    ],
  },

  // =====================================================================
  // COMPONENTS
  // =====================================================================
  {
    id: "components",
    label: "Components · 前端组件库",
    modules: [
      {
        id: "co-chat",
        label: "对话",
        hint: "web/components/chat/",
        tags: [
          { label: "AtMentionPopup", hint: "@ 提及弹窗" },
          { label: "ChatComposer", hint: "输入容器" },
          "ChatMessages",
          { label: "ComposerInput", hint: "输入框" },
          { label: "FallbackPreview", hint: "兜底预览" },
          { label: "FilePreviewDrawer", hint: "附件抽屉" },
          { label: "HistorySessionPicker", hint: "历史会话选择" },
          "ImagePreview",
          "MarkdownPreview",
          { label: "OfficeTextPreview", hint: "Office 预览" },
          "PdfPreview",
          { label: "QuestionBankPicker", hint: "题库选择" },
          "SimpleComposerInput",
          "SvgPreview",
          "TextPreview",
          { label: "TracePanels", hint: "执行追踪" },
          { label: "composer-field", hint: "输入子件" },
        ],
      },
      {
        id: "co-common",
        label: "共享原语",
        hint: "web/components/common/",
        tags: [
          { label: "AssistantResponse", hint: "消息容器" },
          { label: "MarkdownRenderer", hint: "MD 渲染" },
          "Modal",
          { label: "ModelThinkingCard", hint: "思考可视化" },
          { label: "ProcessLogs", hint: "进度日志" },
          { label: "RichCodeBlock", hint: "代码高亮" },
          "RichMarkdownRenderer",
          "SimpleMarkdownRenderer",
        ],
      },
      {
        id: "co-dev",
        label: "开发面板",
        hint: "web/components/dev/",
        tags: [{ label: "DevDashboard", hint: "本页面" }],
      },
      {
        id: "co-knowledge",
        label: "知识库",
        hint: "web/components/knowledge/",
        tags: [
          { label: "CreateKbModal", hint: "新建 KB" },
          { label: "FileDropZone", hint: "拖拽上传" },
          { label: "IndexVersionChip", hint: "索引版本" },
          "KbDocumentList",
          "KbDocumentsSection",
          "KbFilePreview",
          "KbFilesTab",
          "KbIndexVersionsSection",
          "KbSettingsSection",
          { label: "KbStatusBadge", hint: "状态徽章" },
          { label: "KbStatusDot", hint: "状态圆点" },
          "KbUpdateHistory",
          "KnowledgeBaseDetail",
          "KnowledgeBaseList",
          "KnowledgeBaseListItem",
          { label: "KnowledgePage", hint: "主入口" },
        ],
      },
      {
        id: "co-math",
        label: "数学动画",
        hint: "web/components/math-animator/",
        tags: ["MathAnimatorConfigPanel", "MathAnimatorViewer"],
      },
      {
        id: "co-notebook",
        label: "笔记本",
        hint: "web/components/notebook/",
        tags: ["NotebookRecordPicker", "NotebookSelector", "SaveToNotebookModal"],
      },
      {
        id: "co-quiz",
        label: "测验",
        hint: "web/components/quiz/",
        tags: [
          { label: "QuestionFollowupPanel", hint: "追问面板" },
          "QuizConfigPanel",
          "QuizViewer",
        ],
      },
      {
        id: "co-research",
        label: "研究",
        hint: "web/components/research/",
        tags: ["ResearchConfigPanel", "ResearchOutlineEditor"],
      },
      {
        id: "co-sidebar",
        label: "侧边栏",
        hint: "web/components/sidebar/",
        tags: [
          { label: "BookRecent", hint: "Book 最近列表" },
          { label: "CoWriterRecent", hint: "Co-Writer 最近" },
          { label: "SidebarShell", hint: "共享外壳" },
          { label: "TutorBotRecent", hint: "TutorBot 最近" },
          "UtilitySidebar",
          { label: "VersionBadge", hint: "版本对比" },
          "WorkspaceSidebar",
        ],
      },
      {
        id: "co-space",
        label: "工作区",
        hint: "web/components/space/",
        tags: [
          "MemorySection",
          "NotebooksSection",
          "QuestionBankSection",
          "SkillsSection",
          { label: "SpaceMiniNav", hint: "小导航" },
          { label: "SpaceSectionHeader", hint: "段头" },
        ],
      },
      {
        id: "co-ui",
        label: "UI 原语",
        hint: "web/components/ui/",
        tags: ["Button"],
        status: "wip",
      },
      {
        id: "co-visualize",
        label: "可视化",
        hint: "web/components/visualize/",
        tags: ["VisualizationViewer", "VisualizeConfigPanel"],
      },
      {
        id: "co-toplevel",
        label: "顶层",
        hint: "web/components/",
        tags: [
          { label: "Mermaid", hint: "图表渲染" },
          { label: "SessionList", hint: "会话列表" },
          { label: "ThemeScript", hint: "主题注入" },
        ],
      },
    ],
  },

  // =====================================================================
  // STACK
  // =====================================================================
  {
    id: "stack",
    label: "Stack · 技术栈",
    modules: [
      {
        id: "sk-frontend",
        label: "前端栈",
        tags: [
          "Next.js 16.2.3",
          "React 19",
          "TypeScript 5 strict",
          "Tailwind 3.4",
          "react-i18next",
          "Radix primitives",
          "lucide-react",
          { label: "Plus Jakarta Sans", hint: "无衬线" },
          { label: "Lora", hint: "衬线" },
        ],
      },
      {
        id: "sk-backend",
        label: "后端栈",
        tags: [
          "Python 3.11+",
          "FastAPI",
          { label: "uvicorn", hint: "ASGI server" },
          "Pydantic 2",
          { label: "LlamaIndex", hint: "RAG 框架" },
          "OpenAI SDK",
          "Anthropic SDK",
          "SQLite",
          "WebSocket",
        ],
      },
      {
        id: "sk-llm",
        label: "LLM Provider",
        tags: [
          "OpenAI",
          "Anthropic",
          "DeepSeek",
          "Gemini",
          { label: "DashScope", hint: "Qwen / 通义" },
          { label: "智谱", hint: "GLM" },
          { label: "月之暗面", hint: "Kimi" },
          "MiniMax",
          "Mistral",
          { label: "Groq", hint: "推理加速" },
          { label: "豆包", hint: "火山引擎" },
          { label: "BytePlus", hint: "字节海外" },
          { label: "Stepfun", hint: "阶跃星辰" },
          { label: "千帆", hint: "百度" },
          "OpenRouter",
          "AIHubMix",
          "SiliconFlow",
          { label: "Ollama", hint: "本地 LLM 运行时" },
          { label: "LM Studio", hint: "桌面 LLM" },
          { label: "vLLM", hint: "高吞吐推理" },
          { label: "llama.cpp", hint: "本地 GGUF" },
          "Azure OpenAI",
          "GitHub Copilot",
        ],
      },
      {
        id: "sk-embedding",
        label: "Embedding Provider",
        tags: [
          "OpenAI",
          "Cohere",
          "Jina",
          "Ollama",
          "vLLM",
          "Azure OpenAI",
          { label: "Aliyun", hint: "Qwen embedding" },
          "SiliconFlow",
          { label: "Custom", hint: "自定义 endpoint" },
        ],
      },
      {
        id: "sk-search",
        label: "Web Search Provider",
        tags: [
          "Brave",
          "Tavily",
          "Jina",
          { label: "SearXNG", hint: "自托管聚合" },
          { label: "DuckDuckGo", hint: "无需 API key" },
          "Perplexity",
          "Serper",
        ],
      },
      {
        id: "sk-storage",
        label: "数据存储",
        tags: [
          "SQLite",
          "本地文件系统",
          { label: "进程内向量索引", hint: "无外部 Chroma/Qdrant" },
          { label: "Redis", hint: "未启用" },
        ],
      },
      {
        id: "sk-deploy",
        label: "构建 / 部署",
        tags: [
          { label: "Multi-stage Dockerfile", hint: "Node + Python" },
          "docker-compose",
          { label: "GHCR", hint: "GitHub Container Registry" },
          "linux/amd64",
          "linux/arm64",
          { label: "Next.js standalone", hint: "self-contained server.js" },
          "Python 3.12 base",
        ],
      },
      {
        id: "sk-doc-formats",
        label: "文档格式",
        tags: [
          { label: "PDF", hint: "PyMuPDF" },
          { label: "DOCX", hint: "python-docx" },
          { label: "XLSX", hint: "openpyxl" },
          "PPTX",
          "Markdown",
          "Plain Text",
          { label: "LaTeX", hint: ".tex 源" },
        ],
      },
    ],
  },

  // =====================================================================
  // FRONTEND
  // =====================================================================
  {
    id: "frontend-status",
    label: "Frontend · 前端框架情况",
    modules: [
      {
        id: "fs-version",
        label: "版本健康度",
        tags: [
          { label: "Next.js 16", hint: "✅ 最新" },
          { label: "React 19", hint: "✅ 最新" },
          { label: "TypeScript 5", hint: "✅ strict" },
          { label: "Tailwind 3.4", hint: "v4 待升级" },
          { label: "Node ≥18", hint: "实测 v25" },
        ],
      },
      {
        id: "fs-routes",
        label: "路由结构",
        hint: "App Router · 16 routes",
        tags: [
          "/",
          "/chat",
          "/agents",
          "/co-writer",
          "/book",
          "/playground",
          "/knowledge",
          "/settings",
          "/notebook",
          "/memory",
          "/space",
          "/space/memory",
          "/space/notebooks",
          "/space/questions",
          "/space/skills",
          "/dev",
        ],
      },
      {
        id: "fs-design",
        label: "设计系统",
        tags: [
          { label: "theme: light", hint: "默认" },
          "theme: dark",
          { label: "theme: glass", hint: "玻璃态" },
          { label: "--background", hint: "背景" },
          { label: "--foreground", hint: "前景" },
          { label: "--primary", hint: "主色" },
          { label: "--secondary", hint: "次色" },
          { label: "--card", hint: "卡片" },
          { label: "--border", hint: "边框" },
          { label: "--muted-foreground", hint: "弱文本" },
        ],
      },
      {
        id: "fs-i18n",
        label: "国际化",
        hint: "react-i18next",
        tags: ["English", "中文 (简体)"],
      },
      {
        id: "fs-realtime",
        label: "实时层",
        hint: "WebSocket",
        tags: [
          "UnifiedWSClient",
          { label: "30s heartbeat", hint: "心跳" },
          { label: "Auto-reconnect", hint: "max 5" },
          { label: "resume_from", hint: "断线续传" },
        ],
      },
      {
        id: "fs-state",
        label: "状态管理",
        hint: "React Context · 无 Redux/Zustand",
        tags: [
          { label: "AppShellContext", hint: "主题/语言/会话" },
          { label: "UnifiedChatContext", hint: "消息/流" },
          "localStorage",
          "Custom window events",
        ],
      },
      {
        id: "fs-build",
        label: "构建配置",
        tags: [
          { label: "output=standalone", hint: "Docker 友好" },
          "Turbopack 可选",
          { label: "Mermaid alias", hint: "图表渲染" },
          { label: "Cytoscape alias", hint: "图论渲染" },
          { label: "i18n parity check", hint: "翻译键对齐脚本" },
          { label: "Playwright UI audit", hint: "视觉回归脚本" },
        ],
      },
      {
        id: "fs-gaps",
        label: "已识别缺口",
        tags: [
          { label: "前端单测 / E2E", hint: "缺失" },
          { label: "Storybook", hint: "缺失" },
          { label: "巨型 page 文件", hint: "2000+ 行" },
          { label: "WS 类型 codegen", hint: "FE↔BE 不共享" },
          { label: "ui/ 原语库", hint: "只有 Button" },
        ],
        status: "wip",
      },
    ],
  },

  // =====================================================================
  // FORK META
  // =====================================================================
  {
    id: "fork-meta",
    label: "Fork · Path B 软 fork",
    modules: [
      {
        id: "fm-arch",
        label: "Path B 架构",
        tags: [
          { label: "bare repo", hint: "唯一 git 数据" },
          { label: "single worktree", hint: "DeepCorpus-dev/" },
          { label: "custom/dev", hint: "默认分支" },
          { label: "main retired", hint: "已删除" },
          { label: "upstream", hint: "被动参考" },
          { label: "pushurl disabled", hint: "禁推上游" },
        ],
      },
      {
        id: "fm-rules",
        label: "Commit 前缀规范",
        tags: [
          { label: "[FORK-FEAT]", hint: "新增功能" },
          { label: "[FORK-MOD]", hint: "修改上游代码" },
          { label: "[FORK-FIX]", hint: "fork bug 修" },
          { label: "[FORK-DEL]", hint: "删除上游代码" },
          { label: "[UP-PICK]", hint: "从上游 cherry-pick" },
        ],
      },
      {
        id: "fm-90day",
        label: "90 天观察机制",
        tags: [
          { label: "scheduled", hint: "2026-07-29 fire" },
          { label: "评估", hint: "KEEP / REBASE / ABANDON" },
        ],
        status: "wip",
      },
    ],
  },
];
