/**
 * Dev console registry — product-director view.
 *
 * Built for "what does this product ship and what's it built on", not
 * "where does this Python class live". Hand-curated; numbers come from
 * actual file counts (see web/scripts/dev-registry-stats.md if added).
 *
 * Conventions:
 *  - Group = a top-level lens (Overview / Features / Components / Stack / Fork)
 *  - Module = a panel within a lens
 *  - Submodule = a specific item with its own description
 *  - features[] = micro-bullets shown as a list (good for "what's inside")
 *  - tags[] = chip-rendered tech / vendor names (good for stack matrices)
 */

export type ModuleStatus = "shipped" | "wip" | "planned";

export interface FeatureEntry {
  id: string;
  label: string;
  description?: string;
  status?: ModuleStatus;
  tags?: string[];
}

export interface ModuleEntry {
  id: string;
  label: string;
  path?: string;
  description: string;
  status?: ModuleStatus;
  submodules?: ModuleEntry[];
  features?: FeatureEntry[];
  tags?: string[];
  references?: { label: string; href?: string }[];
}

export interface RegistryGroup {
  id: string;
  label: string;
  description?: string;
  modules: ModuleEntry[];
}

export const DEV_REGISTRY: RegistryGroup[] = [
  // =====================================================================
  // 1. OVERVIEW — 产品全貌
  // =====================================================================
  {
    id: "overview",
    label: "Overview · 产品全貌",
    description:
      "DeepCorpus 是基于 HKUDS/DeepTutor 的重度二开 fork。Capability-driven agent 工作台 — 对话即入口，9 大功能模块，6 种 AI 模式，7 类智能工具，20+ LLM provider 兼容，本地优先（SQLite + 进程内向量）。",
    modules: [
      {
        id: "ov-pitch",
        label: "一句话定位",
        description:
          "面向研究 / 学习 / 知识工作场景的 agent-native 工作台；同时是个能装进自己 stack 的 agent 平台底座。",
        features: [
          { id: "p1", label: "对话 + 工具调用 + 多模态附件" },
          { id: "p2", label: "RAG 知识库 + 个性化记忆" },
          { id: "p3", label: "Capability 多步骤管线（plan→reason→write 等）— 不是裸 LLM" },
          { id: "p4", label: "TutorBot 跨渠道（Slack / Discord / 邮件）后台 agent 引擎" },
          { id: "p5", label: "Co-Writer 协同写作 + Book 互动书引擎" },
          { id: "p6", label: "插件 / 自定义 Skill / 可热切换 Provider catalog" },
        ],
      },
      {
        id: "ov-numbers",
        label: "关键数字（可量化规模）",
        description: "扫一眼项目体量，无需读代码。",
        features: [
          { id: "n1", label: "AI 模式（Capability）", description: "6 个 — chat, deep_solve, deep_question, deep_research, math_animator, visualize" },
          { id: "n2", label: "智能工具（Tool）", description: "7 类 — RAG / 网页搜索 / 代码沙箱 / 推理 / 头脑风暴 / 论文检索 / 几何分析" },
          { id: "n3", label: "产品功能模块", description: "9 个大模块 + 30+ 子功能" },
          { id: "n4", label: "LLM Provider 兼容", description: "20+（OpenAI / Anthropic / DeepSeek / Gemini / Qwen / GLM / Kimi / 豆包 / Ollama / LM Studio …）" },
          { id: "n5", label: "Embedding Provider", description: "9 家（OpenAI / Cohere / Jina / Ollama / vLLM / Azure / Aliyun / SiliconFlow / Custom）" },
          { id: "n6", label: "搜索 Provider", description: "7 家（Brave / Tavily / Jina / SearXNG / DuckDuckGo / Perplexity / Serper）" },
          { id: "n7", label: "前端路由", description: "15 个用户路由（5 workspace + 10 utility）" },
          { id: "n8", label: "REST API 端点", description: "154 个，分布在 22 个 router 模块" },
          { id: "n9", label: "前端组件", description: "64 个 .tsx 组件，分 12 类目录" },
          { id: "n10", label: "WebSocket 入口", description: "1 个 unified（多路复用 chat / sessions / turns）" },
          { id: "n11", label: "支持文档格式", description: "PDF / DOCX / XLSX / PPTX / MD / TXT" },
          { id: "n12", label: "主题 / 语言", description: "3 主题（light / dark / glass）+ 中英双语" },
        ],
      },
    ],
  },

  // =====================================================================
  // 2. FEATURES — 产品功能模块清单
  // =====================================================================
  {
    id: "features",
    label: "Features · 功能模块",
    description: "9 大功能模块、30+ 子功能。这是用户真正用到的产品面。",
    modules: [
      {
        id: "ft-chat",
        label: "💬 Chat 智能对话",
        description: "默认入口；6 种 AI 模式 + 7 类工具按需调用；多会话；流式响应。",
        status: "shipped",
        submodules: [
          { id: "ch-sessions", label: "多会话管理", description: "无限会话历史；支持重命名 / 删除 / 切换；持久化到 SQLite" },
          { id: "ch-skills", label: "Skill / Capability 切换", description: "对话中实时切换 chat / deep_solve / deep_question 等模式" },
          { id: "ch-attachments", label: "多模态附件", description: "PDF / DOCX / 图片 / 代码 上传；Drawer 预览" },
          { id: "ch-stream", label: "实时流式", description: "WebSocket 推送 stage 进度 + token 流；可中断" },
          { id: "ch-mention", label: "@ 引用", description: "@ 笔记本 / 知识库 / 历史记录 注入上下文" },
          { id: "ch-trace", label: "Trace 面板", description: "查看每个 stage 的执行细节（thinking / acting / observing）" },
        ],
      },
      {
        id: "ft-modes",
        label: "🧠 AI 模式（6 个 Capability）",
        description: "每个模式是 multi-stage agent 管线，**不是裸 LLM**。",
        status: "shipped",
        submodules: [
          { id: "mo-chat", label: "Chat（普通对话）", description: "默认；工具增强的对话；LLM 自主决定何时用什么工具" },
          { id: "mo-solve", label: "Deep Solve（深度求解）", description: "Plan → Reason → Write 三阶段；用于难题拆解" },
          { id: "mo-question", label: "Deep Question（深度提问）", description: "Ideate → Evaluate → Generate → Validate；从文档抽题" },
          { id: "mo-research", label: "Deep Research（深度研究）", description: "把研究目标拆成探索性子问题；并行检索 + 综合" },
          { id: "mo-math", label: "Math Animator（数学动画）", description: "Manim 渲染分步解题动画；输出视频" },
          { id: "mo-viz", label: "Visualize（可视化）", description: "从分析输出生成图表 / 流程图 / Mermaid" },
        ],
      },
      {
        id: "ft-tools",
        label: "🛠️ 智能工具（7 类 Tool）",
        description: "LLM 在对话中按需自主调用，单职责函数。",
        status: "shipped",
        submodules: [
          { id: "tl-rag", label: "RAG", description: "知识库语义检索；LlamaIndex 实现；返回片段 + 综合答案" },
          { id: "tl-web", label: "Web Search", description: "Brave / Tavily / DuckDuckGo / Jina / SearXNG / Perplexity / Serper 7 家可切" },
          { id: "tl-code", label: "Code Execution", description: "Python 沙箱执行；导入守卫；工作区追踪" },
          { id: "tl-reason", label: "Reason", description: "独立的深度推理 LLM 调用（可用 reasoning 模型）" },
          { id: "tl-brainstorm", label: "Brainstorm", description: "广度优先创意生成 + 推理理由" },
          { id: "tl-paper", label: "Paper Search", description: "arXiv 学术检索 + LaTeX 源下载" },
          { id: "tl-geogebra", label: "GeoGebra Analysis", description: "图像 → GeoGebra 命令的 4 阶段视觉管线" },
        ],
      },
      {
        id: "ft-knowledge",
        label: "📚 知识库（KB）",
        description: "上传文档 → 自动切块 → 嵌入索引 → 对话引用，全流程进程内完成。",
        status: "shipped",
        submodules: [
          { id: "kb-upload", label: "拖拽上传", description: "多文件并发；进度可见" },
          { id: "kb-formats", label: "多格式支持", description: "PDF / DOCX / XLSX / PPTX / MD / TXT" },
          { id: "kb-progress", label: "实时索引进度", description: "WebSocket 推送切块 / 嵌入 / 索引各阶段进度" },
          { id: "kb-mention", label: "对话中 @ 引用", description: "在 chat 输入框 @KB 名注入" },
          { id: "kb-multi", label: "多知识库管理", description: "命名 / 切换 / 删除 / RAG provider 切换" },
        ],
      },
      {
        id: "ft-cowriter",
        label: "✍️ Co-Writer 协同写作",
        description: "AI 协作的文档编辑器；迭代式润色 / 改写 / 续写。",
        status: "shipped",
        submodules: [
          { id: "cw-doc", label: "文档列表与编辑", description: "多文档管理；版本草稿" },
          { id: "cw-iterate", label: "迭代式编辑", description: "选段交给 EditAgent 改写" },
          { id: "cw-context", label: "上下文感知", description: "RAG-augmented 编辑（引用 KB 内容）" },
        ],
      },
      {
        id: "ft-book",
        label: "📖 Book 互动书引擎",
        description: "把对话 / 笔记本 / 知识库编译成结构化课程书；block-based。",
        status: "shipped",
        submodules: [
          { id: "bk-compile", label: "智能编译", description: "BookEngine 把零散素材组织成 章 → 页 → 块" },
          { id: "bk-progress", label: "进度跟踪", description: "block-level 学习进度持久化" },
          { id: "bk-stream", label: "流式生成", description: "编译过程实时可见（独立 WebSocket）" },
        ],
      },
      {
        id: "ft-tutorbot",
        label: "🤖 TutorBot 多渠道 agent",
        description: "后台 / 定时任务的跨渠道 agent；像 Slack bot / 邮件助手。",
        status: "shipped",
        submodules: [
          { id: "tb-slack", label: "Slack 渠道" },
          { id: "tb-discord", label: "Discord 渠道" },
          { id: "tb-email", label: "Email (SMTP)" },
          { id: "tb-cron", label: "定时任务调度", description: "Cron 表达式触发 agent 任务" },
          { id: "tb-skills", label: "Skill 系统", description: "用户自定义 markdown skill 文件描述 bot 行为" },
          { id: "tb-heartbeat", label: "心跳健康检查" },
        ],
      },
      {
        id: "ft-workspace",
        label: "🗂️ 工作区（Space）",
        description: "playground / memory / notebook / skills / space 总览。",
        status: "shipped",
        submodules: [
          { id: "ws-playground", label: "Playground", description: "测试 capability 配置；isolate 调试" },
          { id: "ws-memory", label: "记忆", description: "对话间持久记忆 + 智能 recall" },
          { id: "ws-notebook", label: "笔记本", description: "Jupyter 风格的笔记 + 引用 + @ 接入" },
          { id: "ws-questions", label: "题库", description: "Deep Question 生成的题目沉淀" },
          { id: "ws-skills", label: "Skills 库", description: "用户 markdown skill 编辑 / 导入" },
          { id: "ws-overview", label: "Space 总览", description: "工作区聚合视图（一切的入口）" },
        ],
      },
      {
        id: "ft-settings",
        label: "⚙️ 设置",
        description: "Provider catalog / 主题 / 语言 / 首次运行向导。",
        status: "shipped",
        submodules: [
          { id: "st-catalog", label: "Provider Catalog", description: "多 profile 多 model；运行时切换无需重启" },
          { id: "st-test", label: "Connection Test", description: "在线测试 LLM / Embedding / Search 连通性" },
          { id: "st-theme", label: "主题（3 套）", description: "light / dark / glass" },
          { id: "st-lang", label: "语言（2 种）", description: "中文 / English" },
          { id: "st-tour", label: "首次运行向导", description: "scripts/start_tour.py 引导式配置" },
          { id: "st-tests", label: "诊断工具", description: "RAG / Embedding / Search 端到端探活" },
        ],
      },
    ],
  },

  // =====================================================================
  // 3. COMPONENTS — 前端组件清单（含数量）
  // =====================================================================
  {
    id: "components",
    label: "Components · 前端组件库",
    description: "12 类组件目录、64 个 .tsx 文件 + 3 个顶层组件。设计为 feature-folder 结构（一类功能一个目录）。",
    modules: [
      {
        id: "co-knowledge",
        label: "knowledge/ 知识库 UI",
        description: "16 个组件 — 项目里组件最多的一块。",
        path: "web/components/knowledge/",
        tags: ["16 components"],
        features: [
          { id: "k1", label: "KnowledgePage（主入口）" },
          { id: "k2", label: "CreateKbModal / FileDropZone / KbDocumentList" },
          { id: "k3", label: "RAG provider 选择器" },
          { id: "k4", label: "上传进度可视化" },
        ],
      },
      {
        id: "co-chat",
        label: "chat/ 对话 UI",
        description: "10 个组件（含 home/ + preview/ 子目录）。",
        path: "web/components/chat/",
        tags: ["10 components"],
        features: [
          { id: "c1", label: "ChatComposer / ComposerInput / SimpleComposerInput（输入区）" },
          { id: "c2", label: "ChatMessages / TracePanels（消息渲染）" },
          { id: "c3", label: "AtMentionPopup / HistorySessionPicker / QuestionBankPicker（@ 引用）" },
          { id: "c4", label: "FilePreviewDrawer + 6 种 previewer（PDF / Markdown / Image / Text / Office / SVG）" },
        ],
      },
      {
        id: "co-common",
        label: "common/ 共享原语",
        description: "8 个 — 跨页面复用的底座组件。",
        path: "web/components/common/",
        tags: ["8 components"],
        features: [
          { id: "cm1", label: "AssistantResponse（消息容器）" },
          { id: "cm2", label: "MarkdownRenderer / RichCodeBlock（内容渲染）" },
          { id: "cm3", label: "Modal（模态原语）" },
          { id: "cm4", label: "ModelThinkingCard / ProcessLogs（执行可视化）" },
        ],
      },
      {
        id: "co-sidebar",
        label: "sidebar/ 导航",
        description: "7 个 — workspace + utility 双侧边栏。",
        path: "web/components/sidebar/",
        tags: ["7 components"],
        features: [
          { id: "s1", label: "SidebarShell（共享外壳）" },
          { id: "s2", label: "WorkspaceSidebar / UtilitySidebar（两种容器）" },
          { id: "s3", label: "TutorBotRecent / BookRecent / CoWriterRecent（最近列表）" },
          { id: "s4", label: "VersionBadge（与 GitHub release 对比）" },
        ],
      },
      {
        id: "co-space",
        label: "space/ 工作区",
        description: "6 个 — 工作区聚合面板。",
        path: "web/components/space/",
        tags: ["6 components"],
      },
      {
        id: "co-quiz",
        label: "quiz/ 测验",
        description: "3 个 — Deep Question 生成结果展示。",
        path: "web/components/quiz/",
        tags: ["3 components"],
      },
      {
        id: "co-notebook",
        label: "notebook/ 笔记本",
        description: "3 个 — 选择器 / 保存器 / 选择器 picker。",
        path: "web/components/notebook/",
        tags: ["3 components"],
      },
      {
        id: "co-research",
        label: "research/ 研究面板",
        description: "2 个 — Deep Research 配置 + 大纲编辑。",
        path: "web/components/research/",
        tags: ["2 components"],
      },
      {
        id: "co-math",
        label: "math-animator/ 数学动画",
        description: "2 个 — 配置面板 + Manim viewer。",
        path: "web/components/math-animator/",
        tags: ["2 components"],
      },
      {
        id: "co-viz",
        label: "visualize/ 可视化",
        description: "2 个 — 配置 + 渲染。",
        path: "web/components/visualize/",
        tags: ["2 components"],
      },
      {
        id: "co-dev",
        label: "dev/ 开发者面板",
        description: "1 个 — 本页面（DevDashboard）。",
        path: "web/components/dev/",
        tags: ["1 component", "本页面"],
        status: "wip",
      },
      {
        id: "co-ui",
        label: "ui/ UI 原语",
        description: "1 个 — Button。设计系统层最薄弱的一块，未来可扩。",
        path: "web/components/ui/",
        tags: ["1 component"],
        status: "wip",
      },
      {
        id: "co-toplevel",
        label: "顶层组件",
        description: "3 个 — Mermaid / SessionList / ThemeScript。",
        path: "web/components/",
        tags: ["3 components"],
      },
    ],
  },

  // =====================================================================
  // 4. STACK — 技术栈
  // =====================================================================
  {
    id: "stack",
    label: "Stack · 技术栈",
    description: "全栈现代生态；前端最新主版本；本地优先无需外部数据库。",
    modules: [
      {
        id: "sk-frontend",
        label: "前端 Stack",
        description: "Next.js 16 + React 19 + Tailwind v3 + TypeScript strict。",
        tags: [
          "Next.js 16.2.3",
          "React 19",
          "TypeScript 5 strict",
          "Tailwind 3.4",
          "react-i18next",
          "Radix primitives",
          "lucide-react",
          "Plus Jakarta Sans",
          "Lora serif",
        ],
        features: [
          { id: "fe1", label: "App Router + 路由分组（workspace / utility）" },
          { id: "fe2", label: "React Context 状态（无 Redux / Zustand）" },
          { id: "fe3", label: "Standalone build（Docker 友好）" },
          { id: "fe4", label: "3 主题 × 2 语言" },
        ],
      },
      {
        id: "sk-backend",
        label: "后端 Stack",
        description: "Python 3.11+ + FastAPI + LlamaIndex + 进程内向量。",
        tags: [
          "Python 3.11+",
          "FastAPI",
          "uvicorn ASGI",
          "Pydantic 2",
          "LlamaIndex",
          "OpenAI SDK",
          "Anthropic SDK",
          "SQLite",
          "WebSocket",
        ],
        features: [
          { id: "be1", label: "Capability-driven orchestration" },
          { id: "be2", label: "ToolRegistry + CapabilityRegistry 双注册表" },
          { id: "be3", label: "进程内向量索引（无外部 Chroma / Qdrant）" },
          { id: "be4", label: "Pre-commit: ruff / ruff-format / mypy / bandit / detect-secrets / prettier" },
        ],
      },
      {
        id: "sk-llm",
        label: "LLM Provider 矩阵（20+）",
        description: "OpenAI 兼容协议 + 各家私有 SDK；运行时 catalog 切换无需重启。",
        tags: [
          "OpenAI",
          "Anthropic",
          "DeepSeek",
          "Gemini",
          "DashScope (Qwen)",
          "智谱 GLM",
          "月之暗面 Kimi",
          "MiniMax",
          "Mistral",
          "Groq",
          "豆包 / 火山引擎",
          "BytePlus",
          "Stepfun",
          "百度千帆",
          "OpenRouter",
          "AIHubMix",
          "SiliconFlow",
          "Ollama",
          "LM Studio",
          "vLLM",
          "llama.cpp",
          "Azure OpenAI",
          "GitHub Copilot",
        ],
      },
      {
        id: "sk-embedding",
        label: "Embedding Provider（9 家）",
        tags: ["OpenAI", "Cohere", "Jina", "Ollama", "vLLM", "Azure OpenAI", "Aliyun (Qwen)", "SiliconFlow", "Custom"],
      },
      {
        id: "sk-search",
        label: "Web Search Provider（7 家）",
        tags: ["Brave", "Tavily", "Jina", "SearXNG", "DuckDuckGo", "Perplexity", "Serper"],
      },
      {
        id: "sk-storage",
        label: "数据存储",
        description: "本地优先；无需外部数据库或向量服务即可全功能运行。",
        tags: ["SQLite", "本地文件系统", "进程内向量索引", "可选: Redis（未启用）"],
      },
      {
        id: "sk-deploy",
        label: "构建 / 部署",
        description: "多阶段 Docker；GHCR 多平台镜像；docker-compose 单容器一键起。",
        tags: ["Multi-stage Dockerfile", "docker-compose", "GHCR", "linux/amd64", "linux/arm64", "Next.js standalone", "Python 3.12 base"],
      },
      {
        id: "sk-doc-formats",
        label: "支持文档格式（提取层）",
        tags: ["PDF (PyMuPDF)", "DOCX (python-docx)", "XLSX (openpyxl)", "PPTX", "Markdown", "Plain Text", "LaTeX (.tex)"],
      },
    ],
  },

  // =====================================================================
  // 5. FRONTEND STATUS — 前端框架情况
  // =====================================================================
  {
    id: "frontend-status",
    label: "Frontend · 前端框架情况",
    description: "用最新主版本；标准 App Router 结构；状态管理保守（Context + localStorage）。",
    modules: [
      {
        id: "fs-version",
        label: "版本健康度",
        description: "几乎所有库都在最新主版本；Tailwind 还在 v3 line（v4 已发布）。",
        tags: ["Next.js 16 ✅", "React 19 ✅", "TypeScript 5 strict ✅", "Tailwind 3.4 ⚠ v4 待升级", "Node ≥18"],
      },
      {
        id: "fs-routes",
        label: "路由结构（15 个用户路由 + 1 个 dev）",
        description: "App Router with route groups。",
        submodules: [
          { id: "rt-ws", label: "Workspace 组（5 个）", description: "/ /chat[/sessionId] /agents[/botId/chat] /co-writer[/docId] /book /playground" },
          { id: "rt-ut", label: "Utility 组（10 个）", description: "/knowledge /settings /notebook /memory /space[/memory|notebooks|questions|skills] /dev" },
        ],
      },
      {
        id: "fs-design",
        label: "设计系统",
        description: "Tailwind + CSS variables 实现 3 套主题；8 个核心 token。",
        tags: ["Light", "Dark", "Glass", "--background", "--foreground", "--primary", "--secondary", "--card", "--border", "--muted-foreground"],
      },
      {
        id: "fs-i18n",
        label: "国际化",
        description: "react-i18next 单 namespace；纯字符串 key 而非嵌套结构。",
        tags: ["English", "中文（简体）"],
      },
      {
        id: "fs-realtime",
        label: "实时层",
        description: "1 个 unified WebSocket 入口；30s 心跳；自动重连；resume_from 续传。",
        tags: ["UnifiedWSClient", "30s heartbeat", "Auto-reconnect (max 5)", "resume_from"],
      },
      {
        id: "fs-state",
        label: "状态管理",
        description: "React Context + localStorage 持久化；无外部状态库。",
        tags: ["AppShellContext", "UnifiedChatContext", "localStorage", "Custom window events"],
      },
      {
        id: "fs-build",
        label: "构建配置",
        tags: ["output=standalone", "Turbopack 可选", "Mermaid + Cytoscape 已配 alias", "i18n parity check 脚本", "Playwright UI audit 脚本"],
      },
      {
        id: "fs-gaps",
        label: "已识别的前端缺口",
        description: "做新开发前要看到的几个真实问题。",
        status: "wip",
        features: [
          { id: "g1", label: "无前端单测 / E2E 测试", status: "planned" },
          { id: "g2", label: "无 Storybook / 组件 sandbox", status: "planned" },
          { id: "g3", label: "巨型 page 文件（co-writer / playground / agents 各 2000+ 行）", status: "wip" },
          { id: "g4", label: "WS 消息类型 FE↔BE 未共享（codegen 缺失）", status: "planned" },
          { id: "g5", label: "ui/ 原语库只有 1 个 Button（设计系统层薄）", status: "planned" },
        ],
      },
    ],
  },

  // =====================================================================
  // 6. FORK META — Path B 软 fork 治理（保留必要信息）
  // =====================================================================
  {
    id: "fork-meta",
    label: "Fork · Path B 软 fork",
    description: "本仓库是 HKUDS/DeepTutor 的 fork，用 Path B 策略（被动观察 + 选择性 cherry-pick）。",
    modules: [
      {
        id: "fm-arch",
        label: "Path B 架构",
        description: "Bare repo + 单工作树；upstream 作被动参考；main 已 retire；只用 custom/dev 分支。",
        status: "shipped",
        tags: ["bare repo", "single worktree", "custom/dev = default", "upstream = passive"],
      },
      {
        id: "fm-rules",
        label: "Commit 前缀规范",
        description: "强制前缀以追溯归属；详见 AGENTS.fork.md。",
        features: [
          { id: "r1", label: "[FORK-FEAT] 新增功能" },
          { id: "r2", label: "[FORK-MOD] 修改上游代码" },
          { id: "r3", label: "[FORK-FIX] fork 特有 bug 修" },
          { id: "r4", label: "[FORK-DEL] 删除上游代码" },
          { id: "r5", label: "[UP-PICK] <sha> 从上游 cherry-pick" },
        ],
      },
      {
        id: "fm-90day",
        label: "90 天观察机制",
        description: "scheduled agent 在 2026-07-29 自动评估 KEEP / REBASE / ABANDON。",
        status: "wip",
      },
    ],
  },
];
