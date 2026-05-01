/**
 * Dev console registry — pure mind-map taxonomy.
 *
 * Each item has up to three fields:
 *   1. cn   — 中文名 / 主显示标签  (required)
 *   2. code — 代码字段 / 技术标识    (required when ≠ cn)
 *   3. desc — 说明文字            (only for non-obvious items)
 *
 * Convention: render as `cn {code} — desc`. For trivially clear items,
 * the bare string shorthand is fine (cn === code, no desc).
 */

export type ModuleStatus = "shipped" | "wip" | "planned";

export type TagEntry = string | { cn: string; code?: string; desc?: string };

export interface ModuleEntry {
  id: string;
  label: string; // 中文名 / 主标签
  code?: string; // 代码字段 (e.g. file path)
  desc?: string; // 说明文字 (only when needed)
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
        code: "Features",
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
        code: "Components",
        tags: [
          { cn: "对话", code: "chat/" },
          { cn: "共享原语", code: "common/" },
          { cn: "开发面板", code: "dev/" },
          { cn: "知识库", code: "knowledge/" },
          { cn: "数学动画", code: "math-animator/" },
          { cn: "笔记本", code: "notebook/" },
          { cn: "测验", code: "quiz/" },
          { cn: "研究", code: "research/" },
          { cn: "侧边栏", code: "sidebar/" },
          { cn: "工作区", code: "space/" },
          { cn: "UI 原语", code: "ui/" },
          { cn: "可视化", code: "visualize/" },
          { cn: "顶层", code: "components/" },
          { cn: "Book UI", code: "book/components/" },
          { cn: "Book Block 渲染", code: "book/components/blocks/" },
        ],
      },
      {
        id: "ov-types",
        label: "数据类型",
        code: "Types",
        tags: [
          "流事件类型",
          "Chat 客户端消息",
          "Book 块类型",
          "Book 块状态",
          "Book 内容类型",
          "Book 编译阶段",
          "阶段状态",
        ],
      },
      {
        id: "ov-stack",
        label: "技术栈",
        code: "Stack",
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
        code: "Frontend",
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
        code: "Fork",
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
        label: "智能对话",
        code: "Chat",
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
        code: "Capability",
        desc: "multi-stage agent 管线，不是裸 LLM",
        tags: [
          { cn: "普通对话", code: "Chat" },
          { cn: "深度求解", code: "Deep Solve", desc: "Plan → Reason → Write" },
          { cn: "深度提问", code: "Deep Question", desc: "Ideate → Evaluate → Generate → Validate" },
          { cn: "深度研究", code: "Deep Research" },
          { cn: "数学动画", code: "Math Animator", desc: "Manim 渲染" },
          { cn: "可视化", code: "Visualize" },
        ],
      },
      {
        id: "ft-tools",
        label: "智能工具",
        code: "Tool",
        desc: "LLM 按需自主调用的单职责函数",
        tags: [
          { cn: "知识库检索", code: "RAG", desc: "LlamaIndex" },
          { cn: "网页搜索", code: "Web Search" },
          { cn: "代码执行", code: "Code Execution", desc: "Python 沙箱" },
          { cn: "深度推理", code: "Reason" },
          { cn: "创意发散", code: "Brainstorm" },
          { cn: "论文检索", code: "Paper Search", desc: "arXiv" },
          { cn: "几何分析", code: "GeoGebra Analysis", desc: "图像 → 几何命令的 4 阶段视觉管线" },
        ],
      },
      {
        id: "ft-knowledge",
        label: "知识库",
        code: "Knowledge Base",
        tags: [
          "拖拽上传",
          "多格式支持",
          "实时索引进度",
          "对话中 @ 引用",
          "多知识库管理",
        ],
      },
      {
        id: "ft-cowriter",
        label: "协同写作",
        code: "Co-Writer",
        tags: ["文档列表与编辑", "迭代式编辑", "上下文感知"],
      },
      {
        id: "ft-book",
        label: "互动书引擎",
        code: "Book",
        desc: "把对话 / 笔记本 / KB 编译成结构化课程书",
        tags: ["智能编译", "进度跟踪", "流式生成"],
      },
      {
        id: "ft-tutorbot",
        label: "多渠道 agent",
        code: "TutorBot",
        desc: "后台 / 定时任务 agent，跨渠道",
        tags: [
          { cn: "Slack 渠道", code: "slack-sdk" },
          { cn: "Discord 渠道", code: "discord.py" },
          { cn: "邮件", code: "Email", desc: "SMTP" },
          "定时任务调度",
          { cn: "Skill 系统", code: "SKILL.md", desc: "用户 markdown 自定义 bot 行为" },
          "心跳健康检查",
        ],
      },
      {
        id: "ft-workspace",
        label: "工作区",
        code: "Space",
        tags: [
          { cn: "Playground", desc: "调试 capability 配置" },
          { cn: "记忆", code: "Memory", desc: "持久 + recall" },
          { cn: "笔记本", code: "Notebook" },
          { cn: "题库", code: "Question Bank", desc: "Deep Question 沉淀" },
          { cn: "Skills 库", desc: "用户 markdown skill" },
          "Space 总览",
        ],
      },
      {
        id: "ft-settings",
        label: "设置",
        code: "Settings",
        tags: [
          { cn: "Provider 目录", code: "Catalog", desc: "多 profile / 多 model 运行时切换" },
          { cn: "连通性测试", code: "Connection Test" },
          "主题 light / dark",
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
        code: "web/components/chat/",
        tags: [
          { cn: "@ 提及弹窗", code: "AtMentionPopup" },
          { cn: "输入容器", code: "ChatComposer" },
          { cn: "消息列表", code: "ChatMessages" },
          { cn: "输入框", code: "ComposerInput" },
          { cn: "兜底预览", code: "FallbackPreview" },
          { cn: "附件抽屉", code: "FilePreviewDrawer" },
          { cn: "历史会话选择", code: "HistorySessionPicker" },
          { cn: "图片预览", code: "ImagePreview" },
          { cn: "Markdown 预览", code: "MarkdownPreview" },
          { cn: "Office 文本预览", code: "OfficeTextPreview" },
          { cn: "PDF 预览", code: "PdfPreview" },
          { cn: "题库选择", code: "QuestionBankPicker" },
          { cn: "极简输入框", code: "SimpleComposerInput" },
          { cn: "SVG 预览", code: "SvgPreview" },
          { cn: "文本预览", code: "TextPreview" },
          { cn: "执行追踪", code: "TracePanels" },
          { cn: "输入子件", code: "composer-field" },
        ],
      },
      {
        id: "co-common",
        label: "共享原语",
        code: "web/components/common/",
        tags: [
          { cn: "消息容器", code: "AssistantResponse" },
          { cn: "Markdown 渲染", code: "MarkdownRenderer" },
          { cn: "模态框", code: "Modal" },
          { cn: "思考可视化", code: "ModelThinkingCard" },
          { cn: "进度日志", code: "ProcessLogs" },
          { cn: "代码高亮", code: "RichCodeBlock" },
          { cn: "富文本 MD 渲染", code: "RichMarkdownRenderer" },
          { cn: "极简 MD 渲染", code: "SimpleMarkdownRenderer" },
        ],
      },
      {
        id: "co-dev",
        label: "开发面板",
        code: "web/components/dev/",
        tags: [{ cn: "本页面", code: "DevDashboard" }],
      },
      {
        id: "co-knowledge",
        label: "知识库",
        code: "web/components/knowledge/",
        tags: [
          { cn: "新建 KB 模态", code: "CreateKbModal" },
          { cn: "拖拽上传区", code: "FileDropZone" },
          { cn: "索引版本徽章", code: "IndexVersionChip" },
          { cn: "文档列表", code: "KbDocumentList" },
          { cn: "文档区", code: "KbDocumentsSection" },
          { cn: "文件预览", code: "KbFilePreview" },
          { cn: "文件 tab", code: "KbFilesTab" },
          { cn: "索引版本区", code: "KbIndexVersionsSection" },
          { cn: "设置区", code: "KbSettingsSection" },
          { cn: "状态徽章", code: "KbStatusBadge" },
          { cn: "状态圆点", code: "KbStatusDot" },
          { cn: "更新历史", code: "KbUpdateHistory" },
          { cn: "KB 详情", code: "KnowledgeBaseDetail" },
          { cn: "KB 列表", code: "KnowledgeBaseList" },
          { cn: "KB 列表项", code: "KnowledgeBaseListItem" },
          { cn: "知识库主页", code: "KnowledgePage" },
        ],
      },
      {
        id: "co-math",
        label: "数学动画",
        code: "web/components/math-animator/",
        tags: [
          { cn: "配置面板", code: "MathAnimatorConfigPanel" },
          { cn: "动画 viewer", code: "MathAnimatorViewer" },
        ],
      },
      {
        id: "co-notebook",
        label: "笔记本",
        code: "web/components/notebook/",
        tags: [
          { cn: "记录选择器", code: "NotebookRecordPicker" },
          { cn: "笔记本选择器", code: "NotebookSelector" },
          { cn: "保存模态", code: "SaveToNotebookModal" },
        ],
      },
      {
        id: "co-quiz",
        label: "测验",
        code: "web/components/quiz/",
        tags: [
          { cn: "追问面板", code: "QuestionFollowupPanel" },
          { cn: "配置面板", code: "QuizConfigPanel" },
          { cn: "测验 viewer", code: "QuizViewer" },
        ],
      },
      {
        id: "co-research",
        label: "研究",
        code: "web/components/research/",
        tags: [
          { cn: "配置面板", code: "ResearchConfigPanel" },
          { cn: "大纲编辑", code: "ResearchOutlineEditor" },
        ],
      },
      {
        id: "co-sidebar",
        label: "侧边栏",
        code: "web/components/sidebar/",
        tags: [
          { cn: "Book 最近", code: "BookRecent" },
          { cn: "Co-Writer 最近", code: "CoWriterRecent" },
          { cn: "侧栏外壳", code: "SidebarShell" },
          { cn: "TutorBot 最近", code: "TutorBotRecent" },
          { cn: "Utility 侧栏", code: "UtilitySidebar" },
          { cn: "版本徽章", code: "VersionBadge" },
          { cn: "Workspace 侧栏", code: "WorkspaceSidebar" },
        ],
      },
      {
        id: "co-space",
        label: "工作区",
        code: "web/components/space/",
        tags: [
          { cn: "记忆区", code: "MemorySection" },
          { cn: "笔记本区", code: "NotebooksSection" },
          { cn: "题库区", code: "QuestionBankSection" },
          { cn: "技能区", code: "SkillsSection" },
          { cn: "小导航", code: "SpaceMiniNav" },
          { cn: "段头", code: "SpaceSectionHeader" },
        ],
      },
      {
        id: "co-ui",
        label: "UI 原语",
        code: "web/components/ui/",
        desc: "设计系统层最薄弱的一块",
        tags: [{ cn: "按钮", code: "Button" }],
        status: "wip",
      },
      {
        id: "co-visualize",
        label: "可视化",
        code: "web/components/visualize/",
        tags: [
          { cn: "可视化 viewer", code: "VisualizationViewer" },
          { cn: "配置面板", code: "VisualizeConfigPanel" },
        ],
      },
      {
        id: "co-toplevel",
        label: "顶层",
        code: "web/components/",
        tags: [
          { cn: "图表渲染", code: "Mermaid" },
          { cn: "会话列表", code: "SessionList" },
          { cn: "主题注入", code: "ThemeScript", desc: "SSR 防 flash" },
        ],
      },
      {
        id: "co-book-ui",
        label: "Book UI",
        code: "app/(workspace)/book/components/",
        desc: "route-local，未放在 web/components/",
        tags: [
          { cn: "新建书向导", code: "BookCreator" },
          { cn: "书库", code: "BookLibrary" },
          { cn: "Book 侧栏", code: "BookSidebar" },
          { cn: "健康提示", code: "BookHealthBanner" },
          { cn: "进度时间线", code: "BookProgressTimeline" },
          { cn: "对话面板", code: "BookChatPanel" },
          { cn: "页阅读器", code: "PageReader" },
          { cn: "大纲导航", code: "PageOutlineNav" },
          { cn: "脊柱编辑", code: "SpineEditor" },
        ],
      },
      {
        id: "co-book-blocks",
        label: "Book Block 渲染",
        code: "app/(workspace)/book/components/blocks/",
        desc: "互动书的内容块渲染器，BlockRenderer 按 BlockType 路由",
        tags: [
          { cn: "块路由", code: "BlockRenderer" },
          { cn: "文本块", code: "TextBlock" },
          { cn: "章节块", code: "SectionBlock" },
          { cn: "代码块", code: "CodeBlock" },
          { cn: "图块", code: "FigureBlock" },
          { cn: "时间线块", code: "TimelineBlock" },
          { cn: "深度展开块", code: "DeepDiveBlock" },
          { cn: "概念图谱块", code: "ConceptGraphBlock" },
          { cn: "闪卡块", code: "FlashCardsBlock" },
          { cn: "交互块", code: "InteractiveBlock" },
          { cn: "动画块", code: "AnimationBlock" },
          { cn: "强调框", code: "CalloutBlock" },
          { cn: "测验块", code: "QuizBlock" },
          { cn: "用户笔记块", code: "UserNoteBlock" },
          { cn: "占位块", code: "PlaceholderBlock", desc: "异步加载兜底" },
        ],
      },
    ],
  },

  // =====================================================================
  // TYPES — 数据契约 / 枚举
  // =====================================================================
  {
    id: "types",
    label: "Types · 数据类型",
    modules: [
      {
        id: "ty-stream-event",
        label: "流事件类型",
        code: "StreamEventType",
        desc: "WebSocket 推送的事件种类，对齐后端 Python StreamEventType",
        tags: [
          { cn: "阶段开始", code: "stage_start" },
          { cn: "阶段结束", code: "stage_end" },
          { cn: "思考中", code: "thinking" },
          { cn: "观察", code: "observation" },
          { cn: "正文", code: "content" },
          { cn: "工具调用", code: "tool_call" },
          { cn: "工具结果", code: "tool_result" },
          { cn: "进度", code: "progress" },
          { cn: "引用源", code: "sources" },
          { cn: "最终结果", code: "result" },
          { cn: "错误", code: "error" },
          { cn: "会话", code: "session" },
          { cn: "完成", code: "done" },
        ],
      },
      {
        id: "ty-chat-message",
        label: "Chat 客户端消息",
        code: "ChatMessage",
        desc: "前端 → 后端 WebSocket 上行消息变体",
        tags: [
          { cn: "开启回合", code: "StartTurnMessage" },
          { cn: "订阅回合", code: "SubscribeTurnMessage" },
          { cn: "订阅会话", code: "SubscribeSessionMessage" },
          { cn: "续传回合", code: "ResumeTurnMessage" },
          { cn: "取消订阅", code: "UnsubscribeMessage" },
          { cn: "取消回合", code: "CancelTurnMessage" },
          { cn: "重生成", code: "RegenerateMessage" },
        ],
      },
      {
        id: "ty-block-type",
        label: "Book 块类型",
        code: "BlockType",
        desc: "互动书内容块的种类，每种对应一个 *Block 渲染器",
        tags: [
          { cn: "文本", code: "text" },
          { cn: "强调框", code: "callout" },
          { cn: "测验", code: "quiz" },
          { cn: "用户笔记", code: "user_note" },
          { cn: "图", code: "figure" },
          { cn: "交互", code: "interactive" },
          { cn: "动画", code: "animation" },
          { cn: "代码", code: "code" },
          { cn: "时间线", code: "timeline" },
          { cn: "闪卡", code: "flash_cards" },
          { cn: "深度展开", code: "deep_dive" },
          { cn: "章节", code: "section" },
          { cn: "概念图谱", code: "concept_graph" },
        ],
      },
      {
        id: "ty-block-status",
        label: "Book 块状态",
        code: "BlockStatus",
        tags: [
          { cn: "待生成", code: "pending" },
          { cn: "生成中", code: "generating" },
          { cn: "就绪", code: "ready" },
          { cn: "错误", code: "error" },
          { cn: "隐藏", code: "hidden" },
        ],
      },
      {
        id: "ty-content-type",
        label: "Book 内容类型",
        code: "ContentType",
        desc: "块的语义分类（用于编译策略选择）",
        tags: [
          { cn: "理论", code: "theory" },
          { cn: "推导", code: "derivation" },
          { cn: "历史", code: "history" },
          { cn: "练习", code: "practice" },
          { cn: "概念", code: "concept" },
          { cn: "概览", code: "overview" },
        ],
      },
      {
        id: "ty-stage-id",
        label: "Book 编译阶段",
        code: "StageId",
        desc: "BookEngine 的 6 个 pipeline 阶段",
        tags: [
          { cn: "构思", code: "ideation" },
          { cn: "探索", code: "exploration" },
          { cn: "综合", code: "synthesis" },
          { cn: "评审", code: "critique" },
          { cn: "概览", code: "overview" },
          { cn: "编译", code: "compilation" },
        ],
      },
      {
        id: "ty-stage-state",
        label: "阶段状态",
        code: "StageState",
        tags: [
          { cn: "待运行", code: "pending" },
          { cn: "运行中", code: "running" },
          { cn: "已完成", code: "completed" },
          { cn: "错误", code: "error" },
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
          { cn: "TypeScript 5", desc: "strict 模式" },
          "Tailwind 3.4",
          { cn: "react-i18next", desc: "国际化框架" },
          { cn: "Radix primitives", desc: "无样式 UI 原语" },
          { cn: "lucide-react", desc: "图标库" },
          { cn: "Plus Jakarta Sans", desc: "无衬线字体" },
          { cn: "Lora", desc: "衬线字体" },
        ],
      },
      {
        id: "sk-backend",
        label: "后端栈",
        tags: [
          "Python 3.11+",
          { cn: "FastAPI", desc: "异步 Web 框架" },
          { cn: "uvicorn", desc: "ASGI 服务器" },
          { cn: "Pydantic 2", desc: "数据验证 / 配置" },
          { cn: "LlamaIndex", desc: "RAG 框架" },
          "OpenAI SDK",
          "Anthropic SDK",
          { cn: "SQLite", desc: "本地数据库" },
          "WebSocket",
        ],
      },
      {
        id: "sk-llm",
        label: "LLM Provider",
        desc: "OpenAI 兼容协议 + 各家私有 SDK，运行时 catalog 切换无需重启",
        tags: [
          "OpenAI",
          "Anthropic",
          "DeepSeek",
          "Gemini",
          { cn: "通义", code: "DashScope", desc: "阿里 Qwen 系列" },
          { cn: "智谱", code: "GLM" },
          { cn: "月之暗面", code: "Kimi" },
          "MiniMax",
          "Mistral",
          { cn: "Groq", desc: "推理加速服务" },
          { cn: "豆包", code: "Volcengine", desc: "字节火山引擎" },
          { cn: "BytePlus", desc: "字节海外 LLM" },
          { cn: "阶跃星辰", code: "Stepfun" },
          { cn: "千帆", code: "Qianfan", desc: "百度大模型平台" },
          { cn: "OpenRouter", desc: "聚合代理" },
          { cn: "AIHubMix", desc: "聚合代理" },
          { cn: "硅基流动", code: "SiliconFlow" },
          { cn: "Ollama", desc: "本地 LLM 运行时" },
          { cn: "LM Studio", desc: "桌面端 LLM 客户端" },
          { cn: "vLLM", desc: "高吞吐推理引擎" },
          { cn: "llama.cpp", desc: "本地 GGUF 推理" },
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
          { cn: "阿里云", code: "Aliyun", desc: "Qwen embedding" },
          { cn: "硅基流动", code: "SiliconFlow" },
          { cn: "自定义", code: "Custom", desc: "任意 OpenAI 兼容 endpoint" },
        ],
      },
      {
        id: "sk-search",
        label: "Web Search Provider",
        tags: [
          "Brave",
          "Tavily",
          "Jina",
          { cn: "SearXNG", desc: "自托管聚合搜索" },
          { cn: "DuckDuckGo", desc: "无需 API key" },
          "Perplexity",
          "Serper",
        ],
      },
      {
        id: "sk-storage",
        label: "数据存储",
        desc: "本地优先，无外部数据库或向量服务依赖",
        tags: [
          { cn: "SQLite", desc: "会话 / 记忆 / 设置" },
          "本地文件系统",
          { cn: "进程内向量索引", desc: "无外部 Chroma / Qdrant" },
          { cn: "Redis", desc: "未启用，预留扩展位" },
        ],
      },
      {
        id: "sk-deploy",
        label: "构建 / 部署",
        tags: [
          { cn: "多阶段 Docker", code: "Multi-stage Dockerfile", desc: "Node + Python 双层" },
          "docker-compose",
          { cn: "GHCR", desc: "GitHub Container Registry" },
          "linux/amd64",
          "linux/arm64",
          { cn: "Next.js standalone", desc: "self-contained server.js" },
          "Python 3.12 base",
        ],
      },
      {
        id: "sk-doc-formats",
        label: "文档格式",
        tags: [
          { cn: "PDF", desc: "PyMuPDF 解析" },
          { cn: "DOCX", desc: "python-docx" },
          { cn: "XLSX", desc: "openpyxl" },
          "PPTX",
          "Markdown",
          "Plain Text",
          { cn: "LaTeX", code: ".tex", desc: "tex 源 + chunker" },
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
          { cn: "Next.js 16", desc: "✅ 最新主版本" },
          { cn: "React 19", desc: "✅ 最新主版本" },
          { cn: "TypeScript 5", desc: "✅ strict 开" },
          { cn: "Tailwind 3.4", desc: "⚠ v4 已发布待升级" },
          { cn: "Node ≥18", desc: "实测 v25" },
        ],
      },
      {
        id: "fs-routes",
        label: "路由结构",
        code: "App Router",
        desc: "16 个用户路由（5 workspace + 10 utility + dev）",
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
        desc: "Tailwind + shadcn b37bl1flo + CSS variables，2 主题，~20 个核心 token",
        tags: [
          { cn: "亮色", code: "theme: light", desc: "默认" },
          { cn: "暗色", code: "theme: dark" },
          { cn: "背景", code: "--background" },
          { cn: "前景", code: "--foreground" },
          { cn: "主色", code: "--primary" },
          { cn: "次色", code: "--secondary" },
          { cn: "卡片", code: "--card" },
          { cn: "弹层", code: "--popover" },
          { cn: "侧边栏", code: "--sidebar" },
          { cn: "边框", code: "--border" },
          { cn: "弱文本", code: "--muted-foreground" },
          { cn: "圆角基准", code: "--radius" },
          { cn: "图表 5 色", code: "--chart-1..5" },
        ],
      },
      {
        id: "fs-i18n",
        label: "国际化",
        code: "react-i18next",
        tags: ["English", "中文 (简体)"],
      },
      {
        id: "fs-realtime",
        label: "实时层",
        code: "WebSocket",
        desc: "1 个 unified 入口多路复用 chat / sessions / turns",
        tags: [
          "UnifiedWSClient",
          { cn: "30s 心跳", code: "heartbeat" },
          { cn: "自动重连", code: "auto-reconnect", desc: "max 5" },
          { cn: "断线续传", code: "resume_from" },
        ],
      },
      {
        id: "fs-state",
        label: "状态管理",
        desc: "React Context + localStorage，无 Redux / Zustand",
        tags: [
          { cn: "应用外壳", code: "AppShellContext", desc: "主题 / 语言 / 会话" },
          { cn: "对话状态", code: "UnifiedChatContext", desc: "消息 / 流" },
          "localStorage",
          { cn: "自定义 window 事件", code: "Custom window events" },
        ],
      },
      {
        id: "fs-build",
        label: "构建配置",
        tags: [
          { cn: "独立部署", code: "output=standalone", desc: "Docker 友好" },
          { cn: "Turbopack", desc: "可选" },
          { cn: "Mermaid alias", desc: "图表渲染" },
          { cn: "Cytoscape alias", desc: "图论渲染" },
          { cn: "i18n parity check", desc: "翻译键对齐脚本" },
          { cn: "Playwright UI audit", desc: "视觉回归脚本" },
        ],
      },
      {
        id: "fs-gaps",
        label: "已识别缺口",
        desc: "新开发前要看到的真实问题",
        tags: [
          { cn: "前端单测 / E2E", desc: "缺失，零测试覆盖" },
          { cn: "Storybook", desc: "缺失，无组件 sandbox" },
          { cn: "巨型 page 文件", desc: "co-writer / playground / agents 各 2000+ 行" },
          { cn: "WS 类型 codegen", desc: "FE↔BE 消息类型未共享，改一边静默断" },
          { cn: "ui/ 原语库", desc: "只有 Button 一个" },
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
        desc: "bare repo + 单工作树 + 被动 upstream",
        tags: [
          { cn: "裸仓库", code: "bare repo", desc: "唯一 git 数据存储" },
          { cn: "单工作树", code: "single worktree", desc: "DeepCorpus-dev/" },
          { cn: "默认分支", code: "custom/dev" },
          { cn: "已退役", code: "main retired" },
          { cn: "上游远端", code: "upstream", desc: "仅 fetch，被动参考" },
          { cn: "禁推上游", code: "pushurl disabled" },
        ],
      },
      {
        id: "fm-rules",
        label: "Commit 前缀规范",
        desc: "强制前缀以追溯归属",
        tags: [
          { cn: "新增功能", code: "[FORK-FEAT]" },
          { cn: "修改上游代码", code: "[FORK-MOD]" },
          { cn: "fork 特有 bug 修", code: "[FORK-FIX]" },
          { cn: "删除上游代码", code: "[FORK-DEL]" },
          { cn: "从上游 cherry-pick", code: "[UP-PICK]" },
        ],
      },
      {
        id: "fm-90day",
        label: "90 天观察机制",
        desc: "scheduled remote agent 自动评估是否继续 Path B",
        tags: [
          { cn: "触发时间", code: "2026-07-29" },
          { cn: "评估输出", desc: "KEEP / REBASE / ABANDON" },
        ],
        status: "wip",
      },
    ],
  },
];
