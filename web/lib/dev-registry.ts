/**
 * Dev console registry — pure mind-map taxonomy.
 *
 * One shape only: each group has modules (categories), each module has a
 * complete list of items (tags). No descriptive prose, no abbreviation,
 * no "X 等". The chip row IS the answer.
 */

export type ModuleStatus = "shipped" | "wip" | "planned";

export interface ModuleEntry {
  id: string;
  label: string;
  tags: string[];
  status?: ModuleStatus;
}

export interface RegistryGroup {
  id: string;
  label: string;
  modules: ModuleEntry[];
}

export const DEV_REGISTRY: RegistryGroup[] = [
  // =====================================================================
  // OVERVIEW — sitemap of all groups
  // =====================================================================
  {
    id: "overview",
    label: "Overview · 全貌索引",
    modules: [
      {
        id: "ov-features",
        label: "Features · 功能模块",
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
        label: "Components · 前端组件",
        tags: [
          "chat/",
          "common/",
          "dev/",
          "knowledge/",
          "math-animator/",
          "notebook/",
          "quiz/",
          "research/",
          "sidebar/",
          "space/",
          "ui/",
          "visualize/",
          "top-level",
        ],
      },
      {
        id: "ov-stack",
        label: "Stack · 技术栈",
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
        label: "Frontend · 前端框架情况",
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
        label: "Fork · Path B",
        tags: ["Path B 架构", "Commit 前缀规范", "90 天观察机制"],
      },
    ],
  },

  // =====================================================================
  // FEATURES — 9 modules × all sub-features
  // =====================================================================
  {
    id: "features",
    label: "Features · 功能模块",
    modules: [
      {
        id: "ft-chat",
        label: "💬 Chat 智能对话",
        tags: ["多会话管理", "Skill / Capability 切换", "多模态附件", "实时流式", "@ 引用", "Trace 面板"],
      },
      {
        id: "ft-modes",
        label: "🧠 AI 模式 (Capability)",
        tags: ["Chat 普通对话", "Deep Solve 深度求解", "Deep Question 深度提问", "Deep Research 深度研究", "Math Animator 数学动画", "Visualize 可视化"],
      },
      {
        id: "ft-tools",
        label: "🛠️ 智能工具 (Tool)",
        tags: ["RAG", "Web Search", "Code Execution", "Reason", "Brainstorm", "Paper Search", "GeoGebra Analysis"],
      },
      {
        id: "ft-knowledge",
        label: "📚 知识库",
        tags: ["拖拽上传", "多格式支持", "实时索引进度", "对话中 @ 引用", "多知识库管理"],
      },
      {
        id: "ft-cowriter",
        label: "✍️ Co-Writer 协同写作",
        tags: ["文档列表与编辑", "迭代式编辑", "上下文感知"],
      },
      {
        id: "ft-book",
        label: "📖 Book 互动书引擎",
        tags: ["智能编译", "进度跟踪", "流式生成"],
      },
      {
        id: "ft-tutorbot",
        label: "🤖 TutorBot 多渠道 agent",
        tags: ["Slack 渠道", "Discord 渠道", "Email (SMTP)", "定时任务调度", "Skill 系统", "心跳健康检查"],
      },
      {
        id: "ft-workspace",
        label: "🗂️ 工作区",
        tags: ["Playground", "记忆", "笔记本", "题库", "Skills 库", "Space 总览"],
      },
      {
        id: "ft-settings",
        label: "⚙️ 设置",
        tags: ["Provider Catalog", "Connection Test", "主题 light/dark/glass", "语言 中/英", "首次运行向导", "诊断工具"],
      },
    ],
  },

  // =====================================================================
  // COMPONENTS — 13 directories × all file names
  // =====================================================================
  {
    id: "components",
    label: "Components · 前端组件库",
    modules: [
      {
        id: "co-chat",
        label: "chat/",
        tags: ["AtMentionPopup", "ChatComposer", "ChatMessages", "ComposerInput", "FallbackPreview", "FilePreviewDrawer", "HistorySessionPicker", "ImagePreview", "MarkdownPreview", "OfficeTextPreview", "PdfPreview", "QuestionBankPicker", "SimpleComposerInput", "SvgPreview", "TextPreview", "TracePanels", "composer-field"],
      },
      {
        id: "co-common",
        label: "common/",
        tags: ["AssistantResponse", "MarkdownRenderer", "Modal", "ModelThinkingCard", "ProcessLogs", "RichCodeBlock", "RichMarkdownRenderer", "SimpleMarkdownRenderer"],
      },
      {
        id: "co-dev",
        label: "dev/",
        tags: ["DevDashboard"],
      },
      {
        id: "co-knowledge",
        label: "knowledge/",
        tags: ["CreateKbModal", "FileDropZone", "IndexVersionChip", "KbDocumentList", "KbDocumentsSection", "KbFilePreview", "KbFilesTab", "KbIndexVersionsSection", "KbSettingsSection", "KbStatusBadge", "KbStatusDot", "KbUpdateHistory", "KnowledgeBaseDetail", "KnowledgeBaseList", "KnowledgeBaseListItem", "KnowledgePage"],
      },
      {
        id: "co-math",
        label: "math-animator/",
        tags: ["MathAnimatorConfigPanel", "MathAnimatorViewer"],
      },
      {
        id: "co-notebook",
        label: "notebook/",
        tags: ["NotebookRecordPicker", "NotebookSelector", "SaveToNotebookModal"],
      },
      {
        id: "co-quiz",
        label: "quiz/",
        tags: ["QuestionFollowupPanel", "QuizConfigPanel", "QuizViewer"],
      },
      {
        id: "co-research",
        label: "research/",
        tags: ["ResearchConfigPanel", "ResearchOutlineEditor"],
      },
      {
        id: "co-sidebar",
        label: "sidebar/",
        tags: ["BookRecent", "CoWriterRecent", "SidebarShell", "TutorBotRecent", "UtilitySidebar", "VersionBadge", "WorkspaceSidebar"],
      },
      {
        id: "co-space",
        label: "space/",
        tags: ["MemorySection", "NotebooksSection", "QuestionBankSection", "SkillsSection", "SpaceMiniNav", "SpaceSectionHeader"],
      },
      {
        id: "co-ui",
        label: "ui/",
        tags: ["Button"],
        status: "wip",
      },
      {
        id: "co-visualize",
        label: "visualize/",
        tags: ["VisualizationViewer", "VisualizeConfigPanel"],
      },
      {
        id: "co-toplevel",
        label: "顶层",
        tags: ["Mermaid", "SessionList", "ThemeScript"],
      },
    ],
  },

  // =====================================================================
  // STACK — exhaustive lists
  // =====================================================================
  {
    id: "stack",
    label: "Stack · 技术栈",
    modules: [
      {
        id: "sk-frontend",
        label: "前端栈",
        tags: ["Next.js 16.2.3", "React 19", "TypeScript 5 strict", "Tailwind 3.4", "react-i18next", "Radix primitives", "lucide-react", "Plus Jakarta Sans", "Lora serif"],
      },
      {
        id: "sk-backend",
        label: "后端栈",
        tags: ["Python 3.11+", "FastAPI", "uvicorn ASGI", "Pydantic 2", "LlamaIndex", "OpenAI SDK", "Anthropic SDK", "SQLite", "WebSocket"],
      },
      {
        id: "sk-llm",
        label: "LLM Provider",
        tags: ["OpenAI", "Anthropic", "DeepSeek", "Gemini", "DashScope (Qwen)", "智谱 GLM", "月之暗面 Kimi", "MiniMax", "Mistral", "Groq", "豆包/火山引擎", "BytePlus", "Stepfun", "百度千帆", "OpenRouter", "AIHubMix", "SiliconFlow", "Ollama", "LM Studio", "vLLM", "llama.cpp", "Azure OpenAI", "GitHub Copilot"],
      },
      {
        id: "sk-embedding",
        label: "Embedding Provider",
        tags: ["OpenAI", "Cohere", "Jina", "Ollama", "vLLM", "Azure OpenAI", "Aliyun (Qwen)", "SiliconFlow", "Custom"],
      },
      {
        id: "sk-search",
        label: "Web Search Provider",
        tags: ["Brave", "Tavily", "Jina", "SearXNG", "DuckDuckGo", "Perplexity", "Serper"],
      },
      {
        id: "sk-storage",
        label: "数据存储",
        tags: ["SQLite", "本地文件系统", "进程内向量索引", "Redis (未启用)"],
      },
      {
        id: "sk-deploy",
        label: "构建 / 部署",
        tags: ["Multi-stage Dockerfile", "docker-compose", "GHCR", "linux/amd64", "linux/arm64", "Next.js standalone", "Python 3.12 base"],
      },
      {
        id: "sk-doc-formats",
        label: "文档格式",
        tags: ["PDF (PyMuPDF)", "DOCX (python-docx)", "XLSX (openpyxl)", "PPTX", "Markdown", "Plain Text", "LaTeX (.tex)"],
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
        tags: ["Next.js 16 ✅", "React 19 ✅", "TypeScript 5 strict ✅", "Tailwind 3.4 (v4 待升级)", "Node ≥18"],
      },
      {
        id: "fs-routes",
        label: "路由结构 (16)",
        tags: ["/", "/chat", "/agents", "/co-writer", "/book", "/playground", "/knowledge", "/settings", "/notebook", "/memory", "/space", "/space/memory", "/space/notebooks", "/space/questions", "/space/skills", "/dev"],
      },
      {
        id: "fs-design",
        label: "设计系统",
        tags: ["theme: light", "theme: dark", "theme: glass", "--background", "--foreground", "--primary", "--secondary", "--card", "--border", "--muted-foreground"],
      },
      {
        id: "fs-i18n",
        label: "国际化",
        tags: ["English", "中文 (简体)"],
      },
      {
        id: "fs-realtime",
        label: "实时层",
        tags: ["UnifiedWSClient", "30s heartbeat", "Auto-reconnect (max 5)", "resume_from"],
      },
      {
        id: "fs-state",
        label: "状态管理",
        tags: ["AppShellContext", "UnifiedChatContext", "localStorage", "Custom window events"],
      },
      {
        id: "fs-build",
        label: "构建配置",
        tags: ["output=standalone", "Turbopack 可选", "Mermaid alias", "Cytoscape alias", "i18n parity check", "Playwright UI audit"],
      },
      {
        id: "fs-gaps",
        label: "已识别缺口",
        tags: ["无前端单测 / E2E", "无 Storybook", "巨型 page 文件 (2000+ 行)", "WS 类型 FE↔BE 不共享", "ui/ 原语只有 Button"],
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
        tags: ["bare repo", "single worktree", "custom/dev = default", "main retired", "upstream = passive", "pushurl disabled"],
      },
      {
        id: "fm-rules",
        label: "Commit 前缀规范",
        tags: ["[FORK-FEAT] 新增功能", "[FORK-MOD] 修改上游代码", "[FORK-FIX] fork bug 修", "[FORK-DEL] 删除上游代码", "[UP-PICK] <sha> 从上游 cherry-pick"],
      },
      {
        id: "fm-90day",
        label: "90 天观察机制",
        tags: ["scheduled: 2026-07-29 fire", "评估: KEEP / REBASE / ABANDON"],
        status: "wip",
      },
    ],
  },
];
