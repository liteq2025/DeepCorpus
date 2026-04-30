/**
 * Module registry for the /dev developer dashboard.
 *
 * This is a hand-curated map of the project's modules and submodules. It
 * starts as static data; later it can be augmented by introspection
 * (reading capability_registry / tool_registry from the backend, walking
 * the file tree, etc.).
 *
 * Convention: every item has a stable `id` (kebab-case). Paths are
 * repo-relative (no leading slash).
 */

export type ModuleStatus = "shipped" | "wip" | "planned";

export interface FeatureEntry {
  id: string;
  label: string;
  description: string;
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
  /** External reference (file:line, doc URL, etc.) */
  references?: { label: string; href?: string }[];
}

export interface RegistryGroup {
  id: string;
  label: string;
  description?: string;
  modules: ModuleEntry[];
}

export const DEV_REGISTRY: RegistryGroup[] = [
  // ===========================================================
  // BACKEND
  // ===========================================================
  {
    id: "backend",
    label: "Backend (Python)",
    description: "FastAPI server, capability-driven orchestration, agents, tools.",
    modules: [
      {
        id: "runtime",
        label: "runtime — Orchestration core",
        path: "deeptutor/runtime/",
        description:
          "Routes user turns to capabilities; owns the global ToolRegistry and CapabilityRegistry. Validates manifests at startup.",
        status: "shipped",
        features: [
          {
            id: "chat-orchestrator",
            label: "ChatOrchestrator",
            description:
              "Central router. Accepts UnifiedContext, dispatches to selected capability, manages StreamBus lifecycle, publishes completion events.",
          },
          {
            id: "tool-registry",
            label: "ToolRegistry",
            description:
              "Loads built-in tools at boot; supports tool aliases; exposes get(), list_tools(), get_definitions().",
          },
          {
            id: "capability-registry",
            label: "CapabilityRegistry",
            description:
              "Loads 6 built-in capabilities + plugin capabilities. Validates each manifest's tools_used against ToolRegistry.",
          },
          {
            id: "run-mode",
            label: "RunMode",
            description: "CLI / SERVER mode predicate used to gate features that depend on stdin or background workers.",
          },
        ],
        references: [{ label: "deeptutor/runtime/orchestrator.py:26" }],
      },
      {
        id: "capabilities",
        label: "capabilities — Multi-step pipelines (Level 2)",
        path: "deeptutor/capabilities/",
        description:
          "Each capability is a multi-stage pipeline (planning → reasoning → writing). Manifest declares stages and required tools.",
        status: "shipped",
        submodules: [
          {
            id: "cap-chat",
            label: "chat",
            path: "deeptutor/capabilities/chat.py",
            description: "Default tool-augmented conversational mode.",
          },
          {
            id: "cap-deep-solve",
            label: "deep_solve",
            path: "deeptutor/capabilities/deep_solve.py",
            description: "Plan → reason → write for hard problem solving.",
          },
          {
            id: "cap-deep-question",
            label: "deep_question",
            path: "deeptutor/capabilities/deep_question.py",
            description: "Ideation → evaluation → generation → validation; produces questions from documents.",
          },
          {
            id: "cap-deep-research",
            label: "deep_research",
            path: "deeptutor/capabilities/deep_research.py",
            description: "Decomposes a research goal into exploratory sub-questions.",
          },
          {
            id: "cap-math-animator",
            label: "math_animator",
            path: "deeptutor/capabilities/math_animator.py",
            description: "Step-by-step math visualization (Manim).",
          },
          {
            id: "cap-visualize",
            label: "visualize",
            path: "deeptutor/capabilities/visualize.py",
            description: "Diagrams / charts from analysis output.",
          },
        ],
      },
      {
        id: "tools",
        label: "tools — LLM-callable functions (Level 1)",
        path: "deeptutor/tools/",
        description: "Single-purpose tools the LLM invokes via function calling.",
        status: "shipped",
        submodules: [
          { id: "tool-rag", label: "rag", description: "Knowledge base retrieval (LlamaIndex)." },
          { id: "tool-web-search", label: "web_search", description: "Web search abstraction (Brave/Tavily/Serper/DuckDuckGo)." },
          { id: "tool-code-execution", label: "code_execution", description: "Sandboxed Python execution with import guard." },
          { id: "tool-reason", label: "reason", description: "Dedicated deep-reasoning LLM call." },
          { id: "tool-brainstorm", label: "brainstorm", description: "Breadth-first ideation with rationale." },
          { id: "tool-paper-search", label: "paper_search", description: "arXiv academic paper search." },
          { id: "tool-geogebra-analysis", label: "geogebra_analysis", description: "4-stage vision pipeline: image → GeoGebra commands." },
        ],
      },
      {
        id: "agents",
        label: "agents — Specialized agent classes",
        path: "deeptutor/agents/",
        description: "Concrete agent implementations consumed by capabilities.",
        status: "shipped",
        submodules: [
          { id: "agent-chat", label: "chat", description: "ChatAgent + SessionManager + AgenticPipeline." },
          { id: "agent-solve", label: "solve", description: "MainSolver: plan → reason → write." },
          { id: "agent-research", label: "research", description: "Research decomposition agent." },
          { id: "agent-question", label: "question", description: "Question generation pipelines." },
          { id: "agent-math-animator", label: "math_animator", description: "Manim animation pipeline." },
          { id: "agent-visualize", label: "visualize", description: "Diagram generation pipeline." },
          { id: "agent-vision-solver", label: "vision_solver", description: "Image-based math: BBox → Analysis → Plan → Render." },
          { id: "agent-notebook", label: "notebook", description: "Notebook analysis / summarization." },
        ],
      },
      {
        id: "api",
        label: "api — FastAPI server + 22 routers",
        path: "deeptutor/api/",
        description: "REST + WebSocket endpoints. Registry consistency check at startup.",
        status: "shipped",
        submodules: [
          { id: "router-solve", label: "/api/v1 solve", path: "deeptutor/api/routers/solve.py", description: "Solve requests + draft management." },
          { id: "router-chat", label: "/api/v1 chat", path: "deeptutor/api/routers/chat.py", description: "Chat session deletion." },
          { id: "router-question", label: "/api/v1/question", path: "deeptutor/api/routers/question.py", description: "Question generation." },
          { id: "router-knowledge", label: "/api/v1/knowledge", path: "deeptutor/api/routers/knowledge.py", description: "KB CRUD + ingestion." },
          { id: "router-dashboard", label: "/api/v1/dashboard", path: "deeptutor/api/routers/dashboard.py", description: "System metrics." },
          { id: "router-cowriter", label: "/api/v1/co_writer", path: "deeptutor/api/routers/co_writer.py", description: "Collaborative editing." },
          { id: "router-notebook", label: "/api/v1/notebook", path: "deeptutor/api/routers/notebook.py", description: "Notebook lifecycle." },
          { id: "router-book", label: "/api/v1/book", path: "deeptutor/api/routers/book.py", description: "Book engine + WS." },
          { id: "router-memory", label: "/api/v1/memory", path: "deeptutor/api/routers/memory.py", description: "Session memory + recall." },
          { id: "router-sessions", label: "/api/v1/sessions", path: "deeptutor/api/routers/sessions.py", description: "Session CRUD." },
          { id: "router-q-notebook", label: "/api/v1/question-notebook", path: "deeptutor/api/routers/question_notebook.py", description: "Question notebook blocks." },
          { id: "router-settings", label: "/api/v1/settings", path: "deeptutor/api/routers/settings.py", description: "Catalog + apply + theme + tour." },
          { id: "router-skills", label: "/api/v1/skills", path: "deeptutor/api/routers/skills.py", description: "Skill loading + CRUD." },
          { id: "router-system", label: "/api/v1/system", path: "deeptutor/api/routers/system.py", description: "System init + config." },
          { id: "router-plugins", label: "/api/v1/plugins", path: "deeptutor/api/routers/plugins_api.py", description: "Plugin install/registration." },
          { id: "router-agent-config", label: "/api/v1/agent-config", path: "deeptutor/api/routers/agent_config.py", description: "Agent manifests + schemas." },
          { id: "router-vision-solver", label: "/api/v1 vision-solver", path: "deeptutor/api/routers/vision_solver.py", description: "Vision-based math solving." },
          { id: "router-tutorbot", label: "/api/v1/tutorbot", path: "deeptutor/api/routers/tutorbot.py", description: "TutorBot channels." },
          { id: "router-attachments", label: "/api/attachments", path: "deeptutor/api/routers/attachments.py", description: "File uploads." },
          { id: "router-ws", label: "/api/v1/ws (unified)", path: "deeptutor/api/routers/unified_ws.py", description: "Single WebSocket multiplexer for chat + sessions + turns." },
        ],
      },
      {
        id: "services",
        label: "services — Shared service layer",
        path: "deeptutor/services/",
        description: "LLM, embedding, RAG, prompt, search, session, memory, storage, providers.",
        status: "shipped",
        submodules: [
          { id: "svc-llm", label: "llm", description: "LLM client abstraction (OpenAI / Claude / local)." },
          { id: "svc-embedding", label: "embedding", description: "Embedding provider abstraction." },
          { id: "svc-rag", label: "rag", description: "LlamaIndex-backed RAG pipelines." },
          { id: "svc-prompt", label: "prompt", description: "PromptManager loading from YAML." },
          { id: "svc-search", label: "search", description: "Web search providers." },
          { id: "svc-session", label: "session", description: "Session state persistence (SQLite)." },
          { id: "svc-memory", label: "memory", description: "Conversation memory + recall." },
          { id: "svc-storage", label: "storage", description: "Document + attachment storage." },
          { id: "svc-config", label: "config", description: "EnvStore, ModelCatalogService, provider runtime." },
          { id: "svc-skill", label: "skill", description: "Skill definition + loading." },
          { id: "svc-setup", label: "setup", description: "First-run init (dirs + defaults)." },
        ],
      },
      {
        id: "knowledge",
        label: "knowledge — Knowledge base lifecycle",
        path: "deeptutor/knowledge/",
        description: "Document ingestion, indexing, progress tracking.",
        status: "shipped",
      },
      {
        id: "book",
        label: "book — Living book engine",
        path: "deeptutor/book/",
        description: "Compiles chat / notebooks / KBs / intent into structured curricula. Block-based.",
        status: "shipped",
      },
      {
        id: "co-writer",
        label: "co_writer — Collaborative editor",
        path: "deeptutor/co_writer/",
        description: "Iterative document refinement agent.",
        status: "shipped",
      },
      {
        id: "tutorbot",
        label: "tutorbot — Multi-channel agent engine",
        path: "deeptutor/tutorbot/",
        description: "Background / scheduled tutoring; Slack / Discord / email adapters.",
        status: "shipped",
      },
      {
        id: "core",
        label: "core — Protocol contracts",
        path: "deeptutor/core/",
        description: "BaseTool / BaseCapability / UnifiedContext / StreamBus / errors.",
        status: "shipped",
      },
      {
        id: "events",
        label: "events — Event bus",
        path: "deeptutor/events/",
        description: "Pub-sub event bus for capability completion, LLM calls, errors.",
        status: "shipped",
      },
      {
        id: "config",
        label: "config — Settings schema",
        path: "deeptutor/config/",
        description: "Pydantic Settings + defaults + accessors.",
        status: "shipped",
      },
      {
        id: "logging",
        label: "logging — Unified logging",
        path: "deeptutor/logging/",
        description: "File / console / WebSocket handlers + LLM token accounting + pricing.",
        status: "shipped",
      },
      {
        id: "app",
        label: "app — Facade for CLI / Web / SDK",
        path: "deeptutor/app/",
        description: "DeepTutorApp wraps orchestrator for external consumers.",
        status: "shipped",
      },
      {
        id: "utils",
        label: "utils — Helpers",
        path: "deeptutor/utils/",
        description: "Document extractor (PDF / DOCX / XLSX / PPTX), JSON parsing, error tracking, network utils.",
        status: "shipped",
      },
    ],
  },

  // ===========================================================
  // FRONTEND
  // ===========================================================
  {
    id: "frontend",
    label: "Frontend (Next.js)",
    description: "Next.js 16 App Router + React 19 + Tailwind + react-i18next.",
    modules: [
      {
        id: "fe-routes-workspace",
        label: "Routes — workspace group",
        path: "web/app/(workspace)/",
        description: "Productive features sharing the WorkspaceSidebar layout.",
        status: "shipped",
        submodules: [
          { id: "rt-chat", label: "/chat[/sessionId]", description: "Main chat interface." },
          { id: "rt-agents", label: "/agents[/botId/chat]", description: "TutorBot list + per-bot chat." },
          { id: "rt-co-writer", label: "/co-writer[/docId]", description: "Co-Writer document editor." },
          { id: "rt-book", label: "/book", description: "Book reader + progress." },
          { id: "rt-playground", label: "/playground", description: "Model playground for testing configs." },
        ],
      },
      {
        id: "fe-routes-utility",
        label: "Routes — utility group",
        path: "web/app/(utility)/",
        description: "Settings / management / dev — share UtilitySidebar layout.",
        status: "shipped",
        submodules: [
          { id: "rt-knowledge", label: "/knowledge", description: "KB management + upload." },
          { id: "rt-settings", label: "/settings", description: "Theme / language / providers / catalog." },
          { id: "rt-notebook", label: "/notebook", description: "Notebook UI." },
          { id: "rt-memory", label: "/memory", description: "Memory management." },
          { id: "rt-space", label: "/space[/memory|notebooks|questions|skills]", description: "Workspace overview + sub-pages." },
          { id: "rt-dev", label: "/dev", description: "Developer dashboard (this page).", status: "wip" },
        ],
      },
      {
        id: "fe-state",
        label: "State management",
        description: "React Context + localStorage. No Redux/Zustand.",
        status: "shipped",
        submodules: [
          { id: "ctx-app-shell", label: "AppShellContext", path: "web/context/AppShellContext.tsx", description: "Theme, language, activeSessionId, sidebarCollapsed." },
          { id: "ctx-unified-chat", label: "UnifiedChatContext", path: "web/context/UnifiedChatContext.tsx", description: "Session runtime, messages, streaming events." },
          { id: "ctx-storage", label: "app-shell-storage", path: "web/context/app-shell-storage.ts", description: "localStorage bridge with custom window events." },
        ],
      },
      {
        id: "fe-clients",
        label: "API + WebSocket clients",
        path: "web/lib/",
        description: "Per-feature HTTP clients + one unified WS client.",
        status: "shipped",
        submodules: [
          { id: "cl-api", label: "api.ts", description: "URL builders (apiUrl/wsUrl/resolveBase)." },
          { id: "cl-unified-ws", label: "unified-ws.ts", description: "UnifiedWSClient: heartbeat + auto-reconnect + resume_from." },
          { id: "cl-session", label: "session-api.ts", description: "Sessions + quiz results." },
          { id: "cl-knowledge", label: "knowledge-api.ts", description: "KB CRUD + RAG providers." },
          { id: "cl-book", label: "book-api.ts", description: "Book HTTP + dedicated WS." },
          { id: "cl-cowriter", label: "co-writer-api.ts", description: "Doc CRUD." },
          { id: "cl-notebook", label: "notebook-api.ts", description: "Notebook list + detail." },
          { id: "cl-skills", label: "skills-api.ts", description: "Skill catalog." },
          { id: "cl-cache", label: "client-cache.ts", description: "withClientCache(): in-memory TTL cache." },
        ],
      },
      {
        id: "fe-components",
        label: "Components",
        path: "web/components/",
        description: "Per-feature directories + shared primitives.",
        status: "shipped",
        submodules: [
          { id: "co-chat", label: "chat/", description: "ChatComposer, ChatMessages, ComposerInput, TracePanels, file previews." },
          { id: "co-common", label: "common/", description: "AssistantResponse, MarkdownRenderer, RichCodeBlock, Modal." },
          { id: "co-knowledge", label: "knowledge/", description: "KnowledgePage, CreateKbModal, FileDropZone, KbDocumentList." },
          { id: "co-notebook", label: "notebook/", description: "NotebookRecordPicker, NotebookSelector, SaveToNotebookModal." },
          { id: "co-quiz", label: "quiz/", description: "QuizConfigPanel, QuizViewer, QuestionFollowupPanel." },
          { id: "co-research", label: "research/", description: "ResearchConfigPanel, ResearchOutlineEditor." },
          { id: "co-math", label: "math-animator/", description: "MathAnimatorConfigPanel, MathAnimatorViewer." },
          { id: "co-visualize", label: "visualize/", description: "VisualizationViewer, VisualizeConfigPanel." },
          { id: "co-sidebar", label: "sidebar/", description: "SidebarShell, WorkspaceSidebar, UtilitySidebar, recents." },
          { id: "co-space", label: "space/", description: "MemorySection, NotebooksSection, QuestionBankSection, SkillsSection." },
          { id: "co-dev", label: "dev/", description: "DevDashboard (this view).", status: "wip" },
          { id: "co-ui", label: "ui/", description: "Button + future primitives." },
        ],
      },
      {
        id: "fe-design-system",
        label: "Design system",
        description: "Tailwind v3 + CSS variables + Radix primitives.",
        status: "shipped",
        submodules: [
          { id: "ds-tokens", label: "Design tokens", path: "web/app/globals.css", description: "CSS vars: --background, --foreground, --primary, --secondary, ... × 3 themes (default / dark / glass)." },
          { id: "ds-tailwind", label: "tailwind.config.js", description: "Dark mode = class; tokens are CSS-var references." },
          { id: "ds-fonts", label: "Typography", description: "Plus Jakarta Sans (sans), Lora (serif) via Google Fonts." },
          { id: "ds-icons", label: "Icons", description: "lucide-react." },
        ],
      },
      {
        id: "fe-i18n",
        label: "Internationalization",
        path: "web/i18n/",
        description: "react-i18next with en + zh.",
        status: "shipped",
        submodules: [
          { id: "i18n-init", label: "init.ts", description: "initI18n + AppLanguage type." },
          { id: "i18n-bridge", label: "I18nClientBridge.tsx", description: "Mounted in root layout to seed locale on hydration." },
          { id: "i18n-en", label: "locales/en/app.json", description: "English strings." },
          { id: "i18n-zh", label: "locales/zh/app.json", description: "Chinese strings." },
        ],
      },
      {
        id: "fe-build",
        label: "Build configuration",
        description: "Next 16 standalone build, Tailwind, TS strict.",
        status: "shipped",
        submodules: [
          { id: "bc-next", label: "next.config.js", description: "output=standalone; mermaid+cytoscape transpile config." },
          { id: "bc-tailwind", label: "tailwind.config.js", description: "Theme extend; content paths." },
          { id: "bc-tsconfig", label: "tsconfig.json", description: "Strict, ES2020 target, '@/' path alias." },
          { id: "bc-scripts", label: "package.json scripts", description: "dev / dev:turbo / build / build:perf / i18n:parity / audit:ui." },
        ],
      },
    ],
  },

  // ===========================================================
  // FORK META (Path B 软 fork 元信息)
  // ===========================================================
  {
    id: "fork-meta",
    label: "Fork meta (Path B)",
    description: "Soft-fork governance, upstream observation, conventions.",
    modules: [
      {
        id: "fm-architecture",
        label: "Path B architecture",
        path: "../README.fork.md",
        description: "Bare repo + single worktree. upstream is passive ref. main retired.",
        status: "shipped",
      },
      {
        id: "fm-agents-rules",
        label: "Agent rules",
        path: "AGENTS.fork.md",
        description: "Commit prefix conventions, provenance checks, forbidden actions.",
        status: "shipped",
      },
      {
        id: "fm-claude-md",
        label: "Claude entry point",
        path: "CLAUDE.md",
        description: "Read-order shortcut for Claude Code agents.",
        status: "shipped",
      },
      {
        id: "fm-upstream-tools",
        label: "Upstream observation",
        description: "git aliases (upstream-status / upstream-diff / upstream-pick) + upstream-status.sh + 90-day fetch log.",
        status: "shipped",
      },
      {
        id: "fm-90day-review",
        label: "90-day review (scheduled)",
        description: "Routine fires on 2026-07-29 to evaluate KEEP / REBASE / ABANDON.",
        status: "wip",
      },
    ],
  },
];
