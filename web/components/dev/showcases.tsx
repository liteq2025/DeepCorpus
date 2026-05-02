"use client";

import {
  Component,
  useRef,
  useState,
  type ReactNode,
  type ErrorInfo,
} from "react";
import {
  BookOpen,
  ClipboardList,
  Sparkles,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import ProcessLogs from "@/components/common/ProcessLogs";
import RichCodeBlock from "@/components/common/RichCodeBlock";
import ModelThinkingCard from "@/components/common/ModelThinkingCard";
import AssistantResponse from "@/components/common/AssistantResponse";
import SimpleMarkdownRenderer from "@/components/common/SimpleMarkdownRenderer";
import MarkdownRenderer from "@/components/common/MarkdownRenderer";
import KbStatusBadge from "@/components/knowledge/KbStatusBadge";
import KbStatusDot from "@/components/knowledge/KbStatusDot";
import IndexVersionChip from "@/components/knowledge/IndexVersionChip";
import type { KnowledgeBase, IndexVersion } from "@/lib/knowledge-helpers";
import type { KnowledgeUploadPolicy } from "@/lib/knowledge-api";

import TextBlock from "@/app/(workspace)/book/components/blocks/TextBlock";
import SectionBlock from "@/app/(workspace)/book/components/blocks/SectionBlock";
import CalloutBlock from "@/app/(workspace)/book/components/blocks/CalloutBlock";
import BookCodeBlock from "@/app/(workspace)/book/components/blocks/CodeBlock";
import QuizBlock from "@/app/(workspace)/book/components/blocks/QuizBlock";
import UserNoteBlock from "@/app/(workspace)/book/components/blocks/UserNoteBlock";
import FlashCardsBlock from "@/app/(workspace)/book/components/blocks/FlashCardsBlock";
import DeepDiveBlock from "@/app/(workspace)/book/components/blocks/DeepDiveBlock";
import TimelineBlock from "@/app/(workspace)/book/components/blocks/TimelineBlock";
import PlaceholderBlock from "@/app/(workspace)/book/components/blocks/PlaceholderBlock";
import FigureBlock from "@/app/(workspace)/book/components/blocks/FigureBlock";
import InteractiveBlock from "@/app/(workspace)/book/components/blocks/InteractiveBlock";
import AnimationBlock from "@/app/(workspace)/book/components/blocks/AnimationBlock";
import ConceptGraphBlock from "@/app/(workspace)/book/components/blocks/ConceptGraphBlock";
import type {
  Block,
  BlockType,
  Book,
  Page,
  Spine,
} from "@/lib/book-types";

import SvgPreview from "@/components/chat/preview/previewers/SvgPreview";
import ImagePreview from "@/components/chat/preview/previewers/ImagePreview";
import FallbackPreview from "@/components/chat/preview/previewers/FallbackPreview";
import OfficeTextPreview from "@/components/chat/preview/previewers/OfficeTextPreview";
import FilePreviewSheet from "@/components/chat/preview/FilePreviewSheet";
import AtMentionPopup from "@/components/chat/AtMentionPopup";
import { SimpleComposerInput } from "@/components/chat/home/SimpleComposerInput";
import { CallTracePanel } from "@/components/chat/home/TracePanels";
import {
  ChatMessageList,
  ReferenceChips,
} from "@/components/chat/home/ChatMessages";
import type {
  MessageAttachment,
  MessageRequestSnapshot,
} from "@/context/UnifiedChatContext";
import type { StreamEvent } from "@/lib/unified-ws";

import VisualizationViewer from "@/components/visualize/VisualizationViewer";
import VisualizeConfigPanel from "@/components/visualize/VisualizeConfigPanel";
import {
  DEFAULT_VISUALIZE_CONFIG,
  type VisualizeFormConfig,
  type VisualizeResult,
} from "@/lib/visualize-types";

import MathAnimatorViewer from "@/components/math-animator/MathAnimatorViewer";
import MathAnimatorConfigPanel from "@/components/math-animator/MathAnimatorConfigPanel";
import {
  DEFAULT_MATH_ANIMATOR_CONFIG,
  type MathAnimatorFormConfig,
  type MathAnimatorResult,
} from "@/lib/math-animator-types";

import QuizConfigPanel from "@/components/quiz/QuizConfigPanel";
import QuizViewer from "@/components/quiz/QuizViewer";
import QuestionFollowupPanel, {
  type FollowupThreadState,
} from "@/components/quiz/QuestionFollowupPanel";
import {
  DEFAULT_QUIZ_CONFIG,
  type DeepQuestionFormConfig,
  type QuizQuestion,
} from "@/lib/quiz-types";

import ResearchConfigPanel from "@/components/research/ResearchConfigPanel";
import ResearchOutlineEditor from "@/components/research/ResearchOutlineEditor";
import {
  createEmptyResearchConfig,
  type DeepResearchFormConfig,
  type OutlineItem,
} from "@/lib/research-types";

import NotebookSelector from "@/components/notebook/NotebookSelector";
import NotebookRecordPicker from "@/components/notebook/NotebookRecordPicker";
import SaveToNotebookModal from "@/components/notebook/SaveToNotebookModal";
import HistorySessionPicker from "@/components/chat/HistorySessionPicker";
import QuestionBankPicker from "@/components/chat/QuestionBankPicker";
import type {
  Notebook,
  NotebookRecord,
  SelectedRecord,
} from "@/lib/notebook-selection-types";

import KbUpdateHistory from "@/components/knowledge/KbUpdateHistory";
import KbSettingsSection from "@/components/knowledge/KbSettingsSection";
import KbIndexVersionsSection from "@/components/knowledge/KbIndexVersionsSection";
import KbDocumentsSection from "@/components/knowledge/KbDocumentsSection";
import KnowledgeBaseListItem from "@/components/knowledge/KnowledgeBaseListItem";
import KnowledgeBaseList from "@/components/knowledge/KnowledgeBaseList";
import FileDropZone from "@/components/knowledge/FileDropZone";
import CreateKbModal from "@/components/knowledge/CreateKbModal";

import Mermaid from "@/components/Mermaid";
import SessionList from "@/components/SessionList";
import type { SessionSummary } from "@/lib/session-api";

import SpaceMiniNav from "@/components/space/SpaceMiniNav";
import SpaceSectionHeader from "@/components/space/SpaceSectionHeader";
import { VersionBadge } from "@/components/sidebar/VersionBadge";

import BookProgressTimeline from "@/app/(workspace)/book/components/BookProgressTimeline";
import BookSidebar from "@/app/(workspace)/book/components/BookSidebar";
import PageOutlineNav from "@/app/(workspace)/book/components/PageOutlineNav";
import SpineEditor from "@/app/(workspace)/book/components/SpineEditor";
import BookLibrary from "@/app/(workspace)/book/components/BookLibrary";
import { emptyBookProgress, type BookProgress } from "@/lib/book-progress";

export interface Showcase {
  id: string;
  category: string; // 类目中文
  categoryCode: string; // 路径标识，如 "ui/"
  name: string; // 中文名
  code: string; // 组件类名
  description?: string;
  Preview: () => ReactNode;
}

// ---------- helpers ----------

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

function Stack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>;
}

function VariantLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
      {children}
    </div>
  );
}

/** Inline note shown above components that fetch from the backend. */
function LiveDataNote({ text }: { text: string }) {
  return (
    <div className="mb-2 rounded-md border border-amber-400/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
      {text}
    </div>
  );
}

/** Catch render errors in any showcase so one broken demo does not crash the page. */
export class ShowcaseErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (typeof console !== "undefined") {
      console.warn("[Showcase] render error:", error.message, info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-700 dark:text-rose-300">
          ⚠ 组件抛出异常：{this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------- mock data ----------

const KB_READY: KnowledgeBase = {
  name: "demo-kb",
  status: "ready",
  statistics: { needs_reindex: false },
};
const KB_NEEDS_REINDEX: KnowledgeBase = {
  name: "demo-kb",
  status: "ready",
  statistics: { needs_reindex: true },
};
const KB_ERROR: KnowledgeBase = { name: "demo-kb", status: "error" };
const KB_INDEXING: KnowledgeBase = {
  name: "demo-kb",
  status: "processing",
  progress: { stage: "processing_documents", percent: 42 },
};

const VERSION_ACTIVE: IndexVersion = {
  signature: "abc123",
  model: "text-embedding-3-small",
  dimension: 1536,
  ready: true,
};
const VERSION_LEGACY: IndexVersion = {
  signature: "legacy-1",
  ready: true,
  legacy: true,
};
const VERSION_PENDING: IndexVersion = {
  signature: "pending-1",
  model: "bge-large-zh",
  dimension: 1024,
  ready: false,
};

const MARKDOWN_SAMPLE = `## 标题二
这是一段 **粗体** 与 *斜体* 的段落，包含 \`inline code\` 和 [链接](#)。

- 列表项一
- 列表项二
- 列表项三

> 引用块：用于强调一段引文或注释。
`;

const ASSISTANT_SAMPLE = `<think>
先分析用户的问题：他想看一个示例。
我应该展示思考块 + 正文段落的组合。
</think>

好的，这是一个 **AssistantResponse** 的样例，包含 \`<think>\` 块解析后折叠呈现的能力。

\`\`\`ts
const x: number = 42;
\`\`\`
`;

const CODE_SAMPLE = `function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

const items = [1, 2, 3].map((n) => n * 2);
console.log(items);`;

const THINK_SAMPLE = `用户在问 X。
让我先列出已知信息：
1. A 是这样
2. B 在这种条件下会成立
所以结论应该是 ...`;

const PROCESS_LOGS_SAMPLE = [
  "[12:01:03] starting pipeline",
  "[12:01:04] loading provider catalog ...",
  "[12:01:05] connected to upstream",
  "[12:01:07] embedding 32 documents (1024d)",
  "[12:01:09] writing index ...",
  "[12:01:10] done.",
];

// ---------- previews ----------

function ButtonPreview() {
  return (
    <Stack>
      <div>
        <VariantLabel>variant</VariantLabel>
        <Row>
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </Row>
      </div>
      <div>
        <VariantLabel>size</VariantLabel>
        <Row>
          <Button size="xs">XS</Button>
          <Button size="sm">SM</Button>
          <Button size="default">Default</Button>
          <Button size="lg">LG</Button>
        </Row>
      </div>
      <div>
        <VariantLabel>state</VariantLabel>
        <Row>
          <Button loading>Loading</Button>
          <Button icon={<Sparkles className="h-4 w-4" />}>With icon</Button>
          <Button disabled>Disabled</Button>
        </Row>
      </div>
    </Stack>
  );
}

function ModalPreview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>打开 Sheet</Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>示例 Sheet</SheetTitle>
            <SheetDescription>
              这是 Sheet 的默认插槽内容，支持任意 JSX。Esc / 点击背景可关闭。
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 py-3 text-[14px] text-[var(--muted-foreground)]">
            旧版 <code>common/Modal</code> 已迁移到 shadcn{" "}
            <code>{"<Sheet>"}</code>（Phase 0.5.6）。
          </div>
          <SheetFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setOpen(false)}>确认</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function AlertDialogPreview() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">删除知识库</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除「demo-kb」？</AlertDialogTitle>
          <AlertDialogDescription>
            操作不可撤销 — 索引、文档、所有引用链都会清空。仅用于真正破坏性的确认。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction>确认删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DialogPreview() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">打开 Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>居中模态</DialogTitle>
          <DialogDescription>
            仅在硬阻断（连接断开 / API key 缺失）或一句话非破坏性确认场景使用。
            日常表单/预览/浏览请用 <code>{"<Sheet>"}</code>。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost">关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DropdownMenuPreview() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          操作
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>知识库操作</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>设为默认</DropdownMenuItem>
        <DropdownMenuItem>重新索引</DropdownMenuItem>
        <DropdownMenuItem>导出</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">删除</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InputPreview() {
  return (
    <Stack>
      <div className="grid w-full max-w-sm gap-1.5">
        <Label htmlFor="demo-input-name">知识库名</Label>
        <Input id="demo-input-name" placeholder="例如：machine-learning" />
      </div>
      <div className="grid w-full max-w-sm gap-1.5">
        <Label htmlFor="demo-input-disabled">已锁定字段</Label>
        <Input
          id="demo-input-disabled"
          defaultValue="demo-kb"
          disabled
        />
      </div>
    </Stack>
  );
}

function TextareaPreview() {
  return (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="demo-textarea">描述</Label>
      <Textarea
        id="demo-textarea"
        placeholder="可多行输入。回车换行，Cmd+Enter 提交（由调用方决定）。"
        rows={4}
      />
    </div>
  );
}

function PopoverPreview() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          打开 Popover
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-2">
          <p className="text-[13px] font-medium">锚定弹层</p>
          <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
            自由布局的小弹层。带列表用 <code>{"<DropdownMenu>"}</code>，
            破坏性确认用 <code>{"<AlertDialog>"}</code>。
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TooltipPreview() {
  return (
    <TooltipProvider delayDuration={150}>
      <Row>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm">
              悬停我
            </Button>
          </TooltipTrigger>
          <TooltipContent>≤ 1 行的 hover 提示</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm">
              另一个
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">支持 side / align 调整</TooltipContent>
        </Tooltip>
      </Row>
    </TooltipProvider>
  );
}

function ToastPreview() {
  return (
    <Row>
      <Button
        size="sm"
        variant="outline"
        onClick={() => toast.success("索引已重建")}
      >
        success
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => toast.info("已切换到 dark 主题")}
      >
        info
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => toast.warning("剩余配额不足 10%")}
      >
        warning
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => toast.error("上传失败：网络断开")}
      >
        error
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() =>
          toast.loading("正在重建索引…", { duration: 2000 })
        }
      >
        loading
      </Button>
    </Row>
  );
}

function ProcessLogsPreview() {
  return (
    <ProcessLogs
      logs={PROCESS_LOGS_SAMPLE}
      executing={false}
      title="Process Logs"
    />
  );
}

function RichCodeBlockPreview() {
  return <RichCodeBlock raw={CODE_SAMPLE} lang="ts" />;
}

function ModelThinkingCardPreview() {
  return <ModelThinkingCard content={THINK_SAMPLE} closed />;
}

function AssistantResponsePreview() {
  return <AssistantResponse content={ASSISTANT_SAMPLE} />;
}

function SimpleMarkdownPreview() {
  return <SimpleMarkdownRenderer content={MARKDOWN_SAMPLE} />;
}

function KbStatusBadgePreview() {
  return (
    <Stack>
      <Row>
        <VariantLabel>ready</VariantLabel>
        <KbStatusBadge kb={KB_READY} />
      </Row>
      <Row>
        <VariantLabel>needs_reindex</VariantLabel>
        <KbStatusBadge kb={KB_NEEDS_REINDEX} />
      </Row>
      <Row>
        <VariantLabel>error</VariantLabel>
        <KbStatusBadge kb={KB_ERROR} />
      </Row>
      <Row>
        <VariantLabel>indexing</VariantLabel>
        <KbStatusBadge kb={KB_INDEXING} />
      </Row>
    </Stack>
  );
}

function KbStatusDotPreview() {
  return (
    <Row>
      <Row>
        <KbStatusDot kb={KB_READY} />
        <span className="text-[11px] text-[var(--muted-foreground)]">ready</span>
      </Row>
      <Row>
        <KbStatusDot kb={KB_NEEDS_REINDEX} />
        <span className="text-[11px] text-[var(--muted-foreground)]">
          needs_reindex
        </span>
      </Row>
      <Row>
        <KbStatusDot kb={KB_ERROR} />
        <span className="text-[11px] text-[var(--muted-foreground)]">error</span>
      </Row>
      <Row>
        <KbStatusDot kb={KB_INDEXING} />
        <span className="text-[11px] text-[var(--muted-foreground)]">
          indexing
        </span>
      </Row>
    </Row>
  );
}

function IndexVersionChipPreview() {
  return (
    <Stack>
      <Row>
        <VariantLabel>active</VariantLabel>
        <IndexVersionChip version={VERSION_ACTIVE} activeSignature="abc123" />
      </Row>
      <Row>
        <VariantLabel>inactive</VariantLabel>
        <IndexVersionChip version={VERSION_ACTIVE} activeSignature="other" />
      </Row>
      <Row>
        <VariantLabel>pending</VariantLabel>
        <IndexVersionChip version={VERSION_PENDING} activeSignature={null} />
      </Row>
      <Row>
        <VariantLabel>legacy</VariantLabel>
        <IndexVersionChip version={VERSION_LEGACY} activeSignature={null} />
      </Row>
    </Stack>
  );
}

// ---------- book block previews ----------

function makeBlock(
  type: BlockType,
  payload: Record<string, unknown>,
  overrides: Partial<Block> = {},
): Block {
  return {
    id: `demo-${type}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    status: "ready",
    title: "",
    params: {},
    payload,
    source_anchors: [],
    metadata: {},
    error: "",
    created_at: 0,
    updated_at: 0,
    ...overrides,
  };
}

/** Frame a book-block preview so it shows on a neutral page-like surface. */
function BlockFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg bg-[var(--background)] p-4 ring-1 ring-inset ring-[var(--border)]">
      {children}
    </div>
  );
}

function TextBlockPreview() {
  const block = makeBlock("text", {
    body: `## 反向传播简介

反向传播 (**backpropagation**) 是神经网络训练的核心算法。它通过链式法则把误差从输出层逐层传回，并据此更新权重。

- 前向：计算预测值
- 后向：计算梯度
- 更新：按学习率调整权重`,
  });
  return (
    <BlockFrame>
      <TextBlock block={block} />
    </BlockFrame>
  );
}

function SectionBlockPreview() {
  const block = makeBlock("section", {
    intro: "梯度下降是把损失函数的最小值看作下山的过程，每一步沿着 **最陡的下坡方向**。",
    focus: "Gradient Descent",
    subsections: [
      {
        heading: "学习率",
        body: "学习率 `η` 控制每一步的大小。太大会越过最小值，太小则收敛缓慢。",
      },
      {
        heading: "批次大小",
        body: "Batch / Mini-batch / SGD 是按一次更新使用的样本量划分的。",
      },
    ],
    key_takeaway: "学习率与批次大小是最重要的两个超参数。",
  });
  return (
    <BlockFrame>
      <SectionBlock block={block} />
    </BlockFrame>
  );
}

function CalloutBlockPreview() {
  const variants = [
    { variant: "key_idea", label: "Key idea", body: "梯度告诉我们参数应该往哪个方向调。" },
    { variant: "common_pitfall", label: "Pitfall", body: "学习率过大会让训练发散，loss 反而上涨。" },
    { variant: "summary", label: "Summary", body: "前向算预测，后向算梯度，再用梯度更新权重。" },
    { variant: "tip", label: "Tip", body: "训练前先做一次小规模的 sanity check，能省下大量调参时间。" },
  ];
  return (
    <Stack>
      {variants.map((v) => (
        <BlockFrame key={v.variant}>
          <CalloutBlock block={makeBlock("callout", v)} />
        </BlockFrame>
      ))}
    </Stack>
  );
}

function BookCodeBlockPreview() {
  const block = makeBlock("code", {
    language: "python",
    code: `def gradient_descent(x, y, lr=0.01, epochs=100):
    w, b = 0.0, 0.0
    for _ in range(epochs):
        y_pred = w * x + b
        dw = -2 * (x * (y - y_pred)).mean()
        db = -2 * (y - y_pred).mean()
        w -= lr * dw
        b -= lr * db
    return w, b`,
    explanation: "最小化 MSE 的二参数线性回归示例。",
  });
  return (
    <BlockFrame>
      <BookCodeBlock block={block} />
    </BlockFrame>
  );
}

function QuizBlockPreview() {
  const block = makeBlock("quiz", {
    questions: [
      {
        question_id: "q1",
        question: "下列哪一项 **最准确** 描述了反向传播？",
        question_type: "multiple_choice",
        options: {
          A: "一种正则化技巧",
          B: "用链式法则计算每个权重的梯度",
          C: "前向推理过程的别名",
          D: "一种优化器（与 Adam 同类）",
        },
        correct_answer: "B",
        explanation: "反向传播是利用链式法则在计算图上反向求导的过程。",
        difficulty: "easy",
      },
    ],
  });
  return (
    <BlockFrame>
      <QuizBlock block={block} />
    </BlockFrame>
  );
}

function UserNoteBlockPreview() {
  const block = makeBlock("user_note", {
    body: "**我的笔记**：训练时我观察到 loss 在第 3 个 epoch 跳变，怀疑是 batch 内噪声放大。",
  });
  return (
    <BlockFrame>
      <UserNoteBlock block={block} />
    </BlockFrame>
  );
}

function FlashCardsBlockPreview() {
  const block = makeBlock("flash_cards", {
    cards: [
      { front: "什么是 epoch？", back: "对全部训练数据完整跑一次。", hint: "覆盖范围" },
      { front: "什么是 batch size？", back: "一次梯度更新使用的样本数量。" },
      { front: "什么是学习率？", back: "每次更新时沿梯度方向走多远的步长。" },
    ],
  });
  return (
    <BlockFrame>
      <FlashCardsBlock block={block} />
    </BlockFrame>
  );
}

function DeepDiveBlockPreview() {
  const block = makeBlock("deep_dive", {
    suggestions: [
      { topic: "Adam 优化器", rationale: "了解自适应学习率的工业级方案。" },
      { topic: "动量法 (Momentum)", rationale: "为什么加上历史梯度能更快下降。" },
      { topic: "学习率调度", rationale: "Cosine / Step / Warmup 的取舍。" },
    ],
  });
  return (
    <BlockFrame>
      <DeepDiveBlock block={block} />
    </BlockFrame>
  );
}

function TimelineBlockPreview() {
  const block = makeBlock("timeline", {
    events: [
      { date: "1986", title: "反向传播算法奠基", description: "Rumelhart / Hinton / Williams 论文。" },
      { date: "2012", title: "AlexNet", description: "ImageNet 上深度网络全面崛起。" },
      { date: "2017", title: "Transformer", description: "“Attention Is All You Need” 发表。" },
      { date: "2022", title: "ChatGPT", description: "RLHF 推动大模型走向消费级应用。" },
    ],
  });
  return (
    <BlockFrame>
      <TimelineBlock block={block} />
    </BlockFrame>
  );
}

function PlaceholderBlockPreview() {
  return (
    <Stack>
      <BlockFrame>
        <PlaceholderBlock
          block={makeBlock("animation", {}, { params: { intended_block_type: "animation" } })}
        />
      </BlockFrame>
      <BlockFrame>
        <PlaceholderBlock
          block={makeBlock("interactive", {}, {
            params: { intended_block_type: "interactive" },
          })}
        />
      </BlockFrame>
    </Stack>
  );
}

const DEMO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">
  <rect x="0" y="0" width="200" height="120" fill="#0f172a"/>
  <circle cx="60" cy="60" r="30" fill="#38bdf8"/>
  <circle cx="120" cy="60" r="30" fill="#a78bfa" opacity="0.85"/>
  <text x="100" y="105" font-family="ui-sans-serif" font-size="11" fill="#cbd5e1" text-anchor="middle">demo svg</text>
</svg>`;

function FigureBlockPreview() {
  const block = makeBlock("figure", {
    code: { language: "svg", content: DEMO_SVG },
    render_type: "svg",
    description: "一个最简的 SVG 示意图（两个圆 + 文字标签）。",
  });
  return (
    <BlockFrame>
      <FigureBlock block={block} />
    </BlockFrame>
  );
}

const DEMO_HTML = `<!doctype html>
<html><head><style>
  body{margin:0;font-family:ui-sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;}
  .card{padding:24px 28px;border:1px solid #334155;border-radius:12px;text-align:center;}
  button{margin-top:12px;padding:6px 14px;border-radius:8px;background:#38bdf8;color:#0f172a;border:0;cursor:pointer;font-weight:600;}
</style></head>
<body><div class="card"><div id="t">Click to count: 0</div>
<button onclick="window.__c=(window.__c||0)+1;document.getElementById('t').textContent='Click to count: '+window.__c">+1</button>
</div></body></html>`;

function InteractiveBlockPreview() {
  const block = makeBlock("interactive", {
    code: { language: "html", content: DEMO_HTML },
    description: "嵌入的可交互 HTML（点击按钮计数）。",
  });
  return (
    <BlockFrame>
      <InteractiveBlock block={block} />
    </BlockFrame>
  );
}

function AnimationBlockPreview() {
  // Real video URL would require a backend asset; show the empty-state branch.
  const block = makeBlock("animation", {});
  return (
    <BlockFrame>
      <AnimationBlock block={block} />
    </BlockFrame>
  );
}

function ConceptGraphBlockPreview() {
  const block = makeBlock("concept_graph", {
    nodes: [
      { id: "n1", label: "梯度下降", chapter_id: "c1", description: "", weight: 1 },
      { id: "n2", label: "反向传播", chapter_id: "c1", description: "", weight: 1 },
      { id: "n3", label: "学习率", chapter_id: "c1", description: "", weight: 1 },
      { id: "n4", label: "Adam", chapter_id: "c2", description: "", weight: 1 },
    ],
    edges: [
      { src: "n2", dst: "n1", relation: "extends", rationale: "" },
      { src: "n3", dst: "n1", relation: "depends_on", rationale: "" },
      { src: "n4", dst: "n1", relation: "extends", rationale: "" },
    ],
  });
  return (
    <BlockFrame>
      <ConceptGraphBlock block={block} language="zh" />
    </BlockFrame>
  );
}

// ---------- chat preview previews ----------

const DEMO_SVG_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(DEMO_SVG)}`;

// 1×1 transparent PNG as a tiny demo image.
const DEMO_PNG_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">
      <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs>
      <rect width="240" height="160" fill="url(#g)"/>
      <text x="120" y="86" font-family="ui-sans-serif" font-size="14" font-weight="600" fill="#0f172a" text-anchor="middle">demo image</text>
    </svg>`,
  );

function SvgPreviewPreview() {
  return (
    <div className="h-48 overflow-hidden rounded-lg border border-[var(--border)]">
      <SvgPreview url={DEMO_SVG_DATA_URL} filename="demo.svg" />
    </div>
  );
}

function ImagePreviewPreview() {
  return (
    <div className="h-48 overflow-hidden rounded-lg border border-[var(--border)]">
      <ImagePreview url={DEMO_PNG_DATA_URL} filename="demo.png" />
    </div>
  );
}

function FallbackPreviewPreview() {
  return (
    <Stack>
      <div className="h-48 overflow-hidden rounded-lg border border-[var(--border)]">
        <FallbackPreview filename="report.zip" url="#download-demo" />
      </div>
      <div className="h-48 overflow-hidden rounded-lg border border-[var(--border)]">
        <FallbackPreview
          filename="legacy-attachment.bin"
          url={null}
          reason="legacy"
        />
      </div>
    </Stack>
  );
}

// ---------- common renderers ----------

function MarkdownRendererPreview() {
  const sample = `## 默认变体

支持 **粗体** / *斜体* / \`code\` / [链接](#)。

\`\`\`ts
const x = 42;
\`\`\`

| 列 1 | 列 2 |
|---|---|
| a | b |
| c | d |
`;
  return (
    <Stack>
      <div>
        <VariantLabel>variant=&quot;default&quot;</VariantLabel>
        <MarkdownRenderer content={sample} />
      </div>
      <div>
        <VariantLabel>variant=&quot;compact&quot;</VariantLabel>
        <MarkdownRenderer content={sample} variant="compact" />
      </div>
      <div>
        <VariantLabel>variant=&quot;prose&quot;</VariantLabel>
        <MarkdownRenderer content={sample} variant="prose" />
      </div>
    </Stack>
  );
}

// ---------- chat input components ----------

function SimpleComposerInputPreview() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [last, setLast] = useState<string>("");
  return (
    <Stack>
      <SimpleComposerInput
        textareaRef={ref}
        onSend={(content) => setLast(content)}
      />
      {last && (
        <div className="rounded-md bg-[var(--muted)]/40 px-2 py-1 text-[11px] text-[var(--muted-foreground)]">
          last sent: <span className="font-mono">{last}</span>
        </div>
      )}
    </Stack>
  );
}

function AtMentionPopupPreview() {
  const [open, setOpen] = useState(true);
  return (
    <div className="relative h-44">
      <Button onClick={() => setOpen((v) => !v)} variant="secondary" size="sm">
        {open ? "关闭弹窗" : "打开弹窗"}
      </Button>
      <div className="absolute left-0 top-12">
        <AtMentionPopup
          open={open}
          onSelectNotebook={() => setOpen(false)}
          onSelectHistory={() => setOpen(false)}
          onSelectQuestionBank={() => setOpen(false)}
        />
      </div>
    </div>
  );
}

function ReferenceChipsPreview() {
  return (
    <ReferenceChips
      historySessions={
        [
          { session_id: "s1", title: "上次的研究" },
          { session_id: "s2", title: "Adam vs SGD 对比" },
        ] as unknown as Parameters<typeof ReferenceChips>[0]["historySessions"]
      }
      notebookGroups={[
        { notebookId: "nb1", notebookName: "机器学习", count: 2 },
        { notebookId: "nb2", notebookName: "论文笔记", count: 5 },
      ]}
      questionEntries={[
        {
          id: 1,
          question: "什么是 epoch？训练时 epoch 与 step 的关系？",
          session_title: "ML 基础",
          is_correct: true,
          difficulty: "easy",
        },
        {
          id: 2,
          question: "batch size 对收敛有什么影响？",
          session_title: "ML 基础",
          is_correct: false,
          difficulty: "medium",
        },
      ]}
      onRemoveHistory={NOOP}
      onRemoveNotebook={NOOP}
      onRemoveQuestion={NOOP}
    />
  );
}

// ---------- chat trace panel ----------

function makeStreamEvent(
  type: StreamEvent["type"],
  fields: Partial<StreamEvent>,
): StreamEvent {
  return {
    type,
    source: "demo",
    stage: "demo",
    content: "",
    metadata: {},
    timestamp: Date.now(),
    ...fields,
  };
}

function CallTracePanelPreview() {
  const events: StreamEvent[] = [
    makeStreamEvent("tool_call", {
      content: "rag.search",
      metadata: { call_id: "c1", tool: "rag.search", args: { query: "梯度下降" } },
    }),
    makeStreamEvent("tool_result", {
      content: "Found 4 chunks (top score 0.83)",
      metadata: { call_id: "c1", tool: "rag.search", duration_ms: 142 },
    }),
    makeStreamEvent("thinking", {
      content: "找到相关文档后，开始构造回复 ...",
      metadata: { call_id: "c2" },
    }),
    makeStreamEvent("content", {
      content: "梯度下降的关键是…（正文片段）",
      metadata: { call_id: "c2" },
    }),
  ];
  return <CallTracePanel events={events} />;
}

// ---------- chat message variants (the big one) ----------

interface ChatMsgItem {
  role: "user" | "assistant" | "system";
  content: string;
  capability?: string;
  events?: StreamEvent[];
  attachments?: MessageAttachment[];
  requestSnapshot?: MessageRequestSnapshot;
}

const NOOP = () => {};
const NOOP_ASYNC = async () => {};

function ChatFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
      <div className="mx-auto max-w-2xl space-y-4">{children}</div>
    </div>
  );
}

function renderChatList(messages: ChatMsgItem[], opts?: { streaming?: boolean }) {
  return (
    <ChatFrame>
      <ChatMessageList
        messages={messages as unknown as Parameters<typeof ChatMessageList>[0]["messages"]}
        isStreaming={Boolean(opts?.streaming)}
        sessionId="demo-session"
        language="zh-CN"
        onAnswerNow={NOOP}
        onCopyAssistantMessage={NOOP}
        onRegenerateMessage={NOOP}
      />
    </ChatFrame>
  );
}

function ChatMsgUserSimplePreview() {
  return renderChatList([{ role: "user", content: "请用一段话解释反向传播。" }]);
}

function ChatMsgUserCapabilityPreview() {
  return (
    <Stack>
      {([
        { capability: "deep_solve", text: "证明：链式法则下，权重的梯度等于…" },
        { capability: "deep_question", text: "请基于这章生成 5 道选择题。" },
        { capability: "deep_research", text: "比较 Adam / SGD / RMSProp 的训练动力学。" },
        { capability: "math_animator", text: "用动画展示 sin/cos 的关系。" },
        { capability: "visualize", text: "画一个 Adam 收敛轨迹的折线图。" },
      ] as const).map((m) => (
        <div key={m.capability}>
          <VariantLabel>{m.capability}</VariantLabel>
          {renderChatList([
            { role: "user", content: m.text, capability: m.capability },
          ])}
        </div>
      ))}
    </Stack>
  );
}

function ChatMsgUserAttachmentPreview() {
  const attachments: MessageAttachment[] = [
    {
      type: "image",
      filename: "graph.svg",
      url: DEMO_SVG_DATA_URL,
      mime_type: "image/svg+xml",
      id: "att-1",
    },
    {
      type: "document",
      filename: "paper.pdf",
      url: "#demo",
      mime_type: "application/pdf",
      id: "att-2",
    },
  ];
  return renderChatList([
    {
      role: "user",
      content: "请帮我看看这张图和这份 PDF。",
      attachments,
    },
  ]);
}

function ChatMsgUserRefsPreview() {
  const snapshot: MessageRequestSnapshot = {
    content: "结合知识库和上次的研究继续讨论。",
    enabledTools: [],
    knowledgeBases: ["机器学习", "deep-learning-papers"],
    language: "zh-CN",
    notebookReferences: [{ notebook_id: "nb-1", record_ids: ["r1", "r2"] }],
    historyReferences: ["session-id-1", "session-id-2"],
    questionNotebookReferences: [101, 102, 103],
  };
  return renderChatList([
    {
      role: "user",
      content: "结合知识库和上次的研究继续讨论。",
      requestSnapshot: snapshot,
    },
  ]);
}

function ChatMsgAssistantTextPreview() {
  return renderChatList([
    { role: "user", content: "什么是 epoch？" },
    {
      role: "assistant",
      content:
        "**Epoch** 指对全部训练数据完整跑一遍。一次 epoch 内会有多次 batch 更新。常用 10–100 epoch，再配合早停 (early stopping) 控制过拟合。",
    },
  ]);
}

function ChatMsgAssistantThinkingPreview() {
  return renderChatList([
    { role: "user", content: "推导一下二参数线性回归的梯度。" },
    {
      role: "assistant",
      content: `<think>
先写出 MSE：L = (1/n) Σ(y - (wx+b))²
对 w 求偏导，再对 b 求偏导。
</think>

对 $w$：$\\partial L/\\partial w = -2 \\bar{x(y-\\hat y)}$，对 $b$：$\\partial L/\\partial b = -2 \\bar{(y-\\hat y)}$。`,
    },
  ]);
}

function ChatMsgAssistantToolPreview() {
  const events: StreamEvent[] = [
    makeStreamEvent("tool_call", {
      content: "web_search",
      metadata: { call_id: "c1", tool: "web_search", args: { q: "Adam optimizer" } },
    }),
    makeStreamEvent("tool_result", {
      content: "3 hits",
      metadata: { call_id: "c1", tool: "web_search", duration_ms: 360 },
    }),
  ];
  return renderChatList([
    { role: "user", content: "查一下 Adam 优化器的最近评测。" },
    {
      role: "assistant",
      content: "根据搜索结果，Adam 在多数任务上仍是稳健默认；对稀疏梯度尤为有效。",
      events,
    },
  ]);
}

// ---------- visualize / math animator ----------

const DEMO_VIS_RESULT: VisualizeResult = {
  response: "Adam vs SGD 的收敛对比示意。",
  render_type: "svg",
  code: { language: "svg", content: DEMO_SVG },
  analysis: {
    render_type: "svg",
    description: "两种优化器的 loss 曲线 (示意)。",
    data_description: "",
    chart_type: "line",
    visual_elements: [],
    rationale: "",
  },
  review: { optimized_code: "", changed: false, review_notes: "" },
};

function VisualizationViewerPreview() {
  return <VisualizationViewer result={DEMO_VIS_RESULT} />;
}

function VisualizeConfigPanelPreview() {
  const [value, setValue] = useState<VisualizeFormConfig>(DEFAULT_VISUALIZE_CONFIG);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <VisualizeConfigPanel
      value={value}
      onChange={setValue}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed((v) => !v)}
    />
  );
}

const DEMO_MATH_RESULT: MathAnimatorResult = {
  response: "示意：Manim 渲染产物（实际 URL 已替换为 SVG data URL）。",
  output_mode: "image",
  code: { language: "python", content: "from manim import *\nclass Demo(Scene):\n    def construct(self): pass" },
  artifacts: [
    {
      type: "image",
      url: DEMO_SVG_DATA_URL,
      filename: "demo.svg",
      content_type: "image/svg+xml",
      label: "Frame 1",
    },
  ],
  timings: { total_ms: 1234 },
  render: { quality: "medium" },
  summary: {
    summary_text: "渲染完成。",
    user_request: "画一个示意。",
    generated_output: "Manim Scene `Demo`",
    key_points: ["示意输出 1", "示意输出 2"],
  },
};

function MathAnimatorViewerPreview() {
  return <MathAnimatorViewer result={DEMO_MATH_RESULT} />;
}

function MathAnimatorConfigPanelPreview() {
  const [value, setValue] = useState<MathAnimatorFormConfig>(
    DEFAULT_MATH_ANIMATOR_CONFIG,
  );
  const [collapsed, setCollapsed] = useState(false);
  return (
    <MathAnimatorConfigPanel
      value={value}
      onChange={setValue}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed((v) => !v)}
    />
  );
}

// ---------- quiz ----------

const DEMO_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question_id: "q-1",
    question: "下列哪一项 **最准确** 描述了反向传播？",
    question_type: "choice",
    options: {
      A: "一种正则化技巧",
      B: "用链式法则计算每个权重的梯度",
      C: "前向推理过程的别名",
      D: "一种优化器（与 Adam 同类）",
    },
    correct_answer: "B",
    explanation: "反向传播在计算图上反向求导。",
    difficulty: "easy",
  },
  {
    question_id: "q-2",
    question: "请用一句话定义 batch size。",
    question_type: "written",
    correct_answer: "一次梯度更新使用的样本数量。",
    explanation: "影响显存占用与梯度噪声。",
    difficulty: "easy",
  },
];

function QuizConfigPanelPreview() {
  const [value, setValue] = useState<DeepQuestionFormConfig>(DEFAULT_QUIZ_CONFIG);
  const [pdf, setPdf] = useState<File | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <QuizConfigPanel
      value={value}
      onChange={setValue}
      uploadedPdf={pdf}
      onUploadPdf={setPdf}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed((v) => !v)}
    />
  );
}

function QuizViewerPreview() {
  return <QuizViewer questions={DEMO_QUIZ_QUESTIONS} sessionId={null} language="zh" />;
}

function QuestionFollowupPanelPreview() {
  const [thread, setThread] = useState<FollowupThreadState>({
    isOpen: true,
    input: "",
    isStreaming: false,
    currentStage: "",
    sessionId: null,
    activeTurnId: null,
    messages: [
      { role: "user", content: "为什么 B 是正确答案？" },
      { role: "assistant", content: "因为反向传播的核心就是链式法则。" },
    ],
    error: null,
  });
  return (
    <QuestionFollowupPanel
      question={DEMO_QUIZ_QUESTIONS[0]}
      questionNumber={1}
      thread={thread}
      onToggle={() => setThread((t) => ({ ...t, isOpen: !t.isOpen }))}
      onInputChange={(v) => setThread((t) => ({ ...t, input: v }))}
      onSend={NOOP}
    />
  );
}

// ---------- research ----------

function ResearchConfigPanelPreview() {
  const [value, setValue] = useState<DeepResearchFormConfig>({
    ...createEmptyResearchConfig(),
    mode: "report",
    depth: "standard",
    sources: ["kb", "web"],
  });
  const [collapsed, setCollapsed] = useState(false);
  return (
    <ResearchConfigPanel
      value={value}
      errors={{}}
      collapsed={collapsed}
      onChange={setValue}
      onToggleCollapsed={() => setCollapsed((v) => !v)}
    />
  );
}

function ResearchOutlineEditorPreview() {
  const outline: OutlineItem[] = [
    { title: "背景与动机", overview: "为什么需要这项研究" },
    { title: "方法", overview: "技术路线与对比基线" },
    { title: "结论", overview: "结果总结 + 局限" },
  ];
  return (
    <ResearchOutlineEditor
      outline={outline}
      topic="梯度下降优化器对比"
      onConfirm={NOOP}
    />
  );
}

// ---------- notebook ----------

const DEMO_NOTEBOOKS: Notebook[] = [
  { id: "nb-1", name: "机器学习", description: "训练相关札记", record_count: 12, color: "blue" },
  { id: "nb-2", name: "深度学习", description: "论文阅读笔记", record_count: 8, color: "purple" },
];

const DEMO_NB_RECORDS: Record<string, NotebookRecord[]> = {
  "nb-1": [
    {
      id: "r-1",
      title: "Adam 收敛性",
      summary: "对比 SGD 的实验",
      user_query: "Adam 为什么收敛更快？",
      output: "因为它结合了动量与自适应学习率。",
      type: "research",
    },
    {
      id: "r-2",
      title: "Batch Norm 笔记",
      user_query: "BN 是什么？",
      output: "归一化每层激活以稳定训练。",
      type: "solve",
    },
  ],
};

function NotebookSelectorPreview() {
  const [expanded, setExpanded] = useState(new Set<string>(["nb-1"]));
  const [selected, setSelected] = useState(new Map<string, SelectedRecord>());
  return (
    <NotebookSelector
      notebooks={DEMO_NOTEBOOKS}
      expandedNotebooks={expanded}
      notebookRecordsMap={
        new Map(Object.entries(DEMO_NB_RECORDS)) as Map<string, NotebookRecord[]>
      }
      selectedRecords={selected}
      loadingNotebooks={false}
      loadingRecordsFor={new Set()}
      isLoading={false}
      onToggleExpanded={(id) =>
        setExpanded((s) => {
          const n = new Set(s);
          if (n.has(id)) n.delete(id);
          else n.add(id);
          return n;
        })
      }
      onToggleRecord={(record, notebookId, notebookName) => {
        setSelected((m) => {
          const next = new Map(m);
          if (next.has(record.id)) next.delete(record.id);
          else next.set(record.id, { ...record, notebookId, notebookName });
          return next;
        });
      }}
      onSelectAll={NOOP}
      onDeselectAll={NOOP}
      onClearAll={() => setSelected(new Map())}
      onCreateSession={NOOP}
    />
  );
}

function NotebookRecordPickerPreview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary" size="sm">
        打开 Notebook 选择器
      </Button>
      <NotebookRecordPicker open={open} onClose={() => setOpen(false)} onApply={() => setOpen(false)} />
    </>
  );
}

function SaveToNotebookModalPreview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary" size="sm">
        打开「保存到 Notebook」
      </Button>
      <SaveToNotebookModal
        open={open}
        payload={{
          recordType: "research",
          title: "Adam 优化器调研",
          userQuery: "对比 Adam / SGD / RMSProp",
          output: "结论：Adam 在大多数任务上仍是稳健默认。",
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ---------- knowledge (extended) ----------

const DEMO_UPLOAD_POLICY: KnowledgeUploadPolicy = {
  extensions: [".pdf", ".docx", ".md", ".txt"],
  accept: ".pdf,.docx,.md,.txt",
  max_file_size_bytes: 100 * 1024 * 1024,
  max_pdf_size_bytes: 50 * 1024 * 1024,
};

const DEMO_KB_FULL: KnowledgeBase = {
  name: "machine-learning-101",
  status: "ready",
  is_default: true,
  metadata: {
    created_at: "2026-01-15T08:00:00Z",
    last_updated: "2026-04-12T10:30:00Z",
    rag_provider: "openai",
    embedding_model: "text-embedding-3-small",
    embedding_dim: 1536,
  },
  statistics: {
    raw_documents: 24,
    images: 7,
    rag_provider: "openai",
    rag_initialized: true,
    needs_reindex: false,
    status: "ready",
    index_versions: [
      {
        signature: "abc123",
        model: "text-embedding-3-small",
        dimension: 1536,
        ready: true,
        created_at: "2026-04-12T10:30:00Z",
      },
      {
        signature: "old456",
        model: "text-embedding-ada-002",
        dimension: 1536,
        ready: true,
        legacy: true,
        created_at: "2026-01-15T08:00:00Z",
      },
    ],
    active_signature: "abc123",
    active_match: true,
  },
};

function FileDropZonePreview() {
  const [files, setFiles] = useState<File[]>([]);
  return <FileDropZone files={files} onChange={setFiles} uploadPolicy={DEMO_UPLOAD_POLICY} />;
}

function KbUpdateHistoryPreview() {
  const entries = [
    {
      id: "h1",
      taskId: "t1",
      kind: "upload" as const,
      label: "上传 3 个文件",
      status: "completed" as const,
      startedAt: Date.now() - 3600_000,
      completedAt: Date.now() - 3500_000,
      fileCount: 3,
      logTail: ["parsed paper-01.pdf", "parsed paper-02.pdf", "parsed notes.md"],
    },
    {
      id: "h2",
      taskId: "t2",
      kind: "reindex" as const,
      label: "重建索引",
      status: "completed" as const,
      startedAt: Date.now() - 7200_000,
      completedAt: Date.now() - 7100_000,
      logTail: ["embedding 24 docs", "writing index"],
    },
    {
      id: "h3",
      taskId: "t3",
      kind: "create" as const,
      label: "创建 KB",
      status: "completed" as const,
      startedAt: Date.now() - 30 * 86400_000,
      completedAt: Date.now() - 30 * 86400_000 + 5_000,
      logTail: [],
    },
  ];
  return <KbUpdateHistory entries={entries} onClear={NOOP} />;
}

function KbSettingsSectionPreview() {
  return (
    <KbSettingsSection
      kb={DEMO_KB_FULL}
      onSetDefault={NOOP_ASYNC}
      onDelete={NOOP_ASYNC}
    />
  );
}

function KbIndexVersionsSectionPreview() {
  return (
    <KbIndexVersionsSection kb={DEMO_KB_FULL} onReindex={NOOP_ASYNC} />
  );
}

function KbDocumentsSectionPreview() {
  return (
    <KbDocumentsSection
      kb={DEMO_KB_FULL}
      uploadPolicy={DEMO_UPLOAD_POLICY}
      history={[]}
      onClearHistory={NOOP}
      onUpload={NOOP_ASYNC}
    />
  );
}

function KnowledgeBaseListItemPreview() {
  return (
    <Stack>
      <KnowledgeBaseListItem
        kb={DEMO_KB_FULL}
        selected
        onSelect={NOOP}
        onSetDefault={NOOP}
        onDelete={NOOP}
      />
      <KnowledgeBaseListItem
        kb={{ ...DEMO_KB_FULL, name: "papers-2024", is_default: false }}
        selected={false}
        onSelect={NOOP}
        onSetDefault={NOOP}
        onDelete={NOOP}
      />
    </Stack>
  );
}

function KnowledgeBaseListPreview() {
  return (
    <div className="h-[420px] overflow-hidden rounded-lg border border-[var(--border)]">
      <KnowledgeBaseList
        kbs={[DEMO_KB_FULL, { ...DEMO_KB_FULL, name: "papers-2024", is_default: false }]}
        selectedKbName="machine-learning-101"
        onSelect={NOOP}
        onCreate={NOOP}
        onSetDefault={NOOP}
        onDelete={NOOP}
        tasksByKb={{}}
      />
    </div>
  );
}

function CreateKbModalPreview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary" size="sm">
        打开新建 KB 模态
      </Button>
      <CreateKbModal
        isOpen={open}
        onClose={() => setOpen(false)}
        providers={[
          { provider: "openai", display_name: "OpenAI" },
          { provider: "ollama", display_name: "Ollama" },
        ] as unknown as Parameters<typeof CreateKbModal>[0]["providers"]}
        uploadPolicy={DEMO_UPLOAD_POLICY}
        onCreate={async () => setOpen(false)}
      />
    </>
  );
}

// ---------- chat preview drawer + extra previewers ----------

function FilePreviewSheetPreview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary" size="sm">
        打开预览抽屉
      </Button>
      <FilePreviewSheet
        open={open}
        source={{
          type: "image",
          url: DEMO_PNG_DATA_URL,
          filename: "demo.png",
          mimeType: "image/png",
        } as unknown as Parameters<typeof FilePreviewSheet>[0]["source"]}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function OfficeTextPreviewPreview() {
  return (
    <div className="h-56 overflow-hidden rounded-lg border border-[var(--border)]">
      <OfficeTextPreview
        filename="report.docx"
        url="#demo"
        extractedText={`# 季度报告\n\n本季度训练损失下降 27%，推理延迟下降 18%。\n\n- 关键改进 1\n- 关键改进 2\n- 关键改进 3`}
      />
    </div>
  );
}

// ---------- pickers (require backend, render with note) ----------

function HistorySessionPickerPreview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <LiveDataNote text="需要后端 /api/sessions；未连接后端时为空状态。" />
      <Button onClick={() => setOpen(true)} variant="secondary" size="sm">
        打开历史会话选择器
      </Button>
      <HistorySessionPicker open={open} onClose={() => setOpen(false)} onApply={() => setOpen(false)} />
    </>
  );
}

function QuestionBankPickerPreview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <LiveDataNote text="需要后端题库 API；未连接时为空状态。" />
      <Button onClick={() => setOpen(true)} variant="secondary" size="sm">
        打开题库选择器
      </Button>
      <QuestionBankPicker open={open} onClose={() => setOpen(false)} onApply={() => setOpen(false)} />
    </>
  );
}

// ---------- top-level (Mermaid / SessionList) ----------

function MermaidPreview() {
  const chart = `flowchart LR
  A[输入] --> B[预处理]
  B --> C[模型]
  C --> D[输出]
  C -.-> E[(向量库)]`;
  return <Mermaid chart={chart} />;
}

const DEMO_SESSIONS: SessionSummary[] = [
  {
    id: "s1",
    session_id: "s1",
    title: "梯度下降推导",
    created_at: Date.now() / 1000 - 600,
    updated_at: Date.now() / 1000 - 60,
    message_count: 12,
    last_message: "再请帮我解释一下学习率。",
    status: "running",
    preferences: { capability: "deep_solve" },
  },
  {
    id: "s2",
    session_id: "s2",
    title: "论文摘要",
    created_at: Date.now() / 1000 - 86400,
    updated_at: Date.now() / 1000 - 3600,
    message_count: 5,
    last_message: "Adam 在多数任务表现稳健。",
    status: "completed",
    preferences: { capability: "deep_research" },
  },
  {
    id: "s3",
    session_id: "s3",
    title: "课堂笔记",
    created_at: Date.now() / 1000 - 7 * 86400,
    updated_at: Date.now() / 1000 - 4 * 86400,
    message_count: 3,
    last_message: "已经整理为闪卡。",
    status: "idle",
  },
];

function SessionListPreview() {
  return (
    <div className="rounded-lg border border-[var(--border)]">
      <SessionList
        sessions={DEMO_SESSIONS}
        activeSessionId="s1"
        onSelect={NOOP_ASYNC}
        onRename={NOOP_ASYNC}
        onDelete={NOOP_ASYNC}
      />
    </div>
  );
}

// ---------- space ----------

function SpaceMiniNavPreview() {
  return <SpaceMiniNav />;
}

function SpaceSectionHeaderPreview() {
  return (
    <SpaceSectionHeader
      icon={Sparkles}
      title="技能库"
      description="用 Markdown 自定义 bot 行为"
      meta={<span className="text-[11px] text-[var(--muted-foreground)]">12 项</span>}
    />
  );
}

// ---------- sidebar ----------

function VersionBadgePreview() {
  return (
    <>
      <LiveDataNote text="需要 /api/version 才能拿到当前版本号；未连通时显示骨架。" />
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]/40 p-3">
        <VersionBadge />
      </div>
    </>
  );
}

// ---------- book non-block components ----------

const DEMO_BOOK: Book = {
  id: "book-1",
  title: "深度学习速通",
  description: "一本 30 分钟读完的概念书。",
  status: "ready",
  proposal: null,
  knowledge_bases: ["machine-learning-101"],
  language: "zh",
  page_count: 12,
  chapter_count: 4,
  created_at: Date.now() / 1000 - 3600,
  updated_at: Date.now() / 1000 - 600,
  metadata: {},
};

const DEMO_PAGES: Page[] = [
  {
    id: "p-1",
    book_id: "book-1",
    chapter_id: "c-1",
    title: "什么是神经网络",
    learning_objectives: ["理解神经元", "理解层"],
    content_type: "concept",
    status: "ready",
    order: 1,
    blocks: [],
    links: [],
    parent_page_id: "",
    error: "",
    created_at: 0,
    updated_at: 0,
  },
  {
    id: "p-2",
    book_id: "book-1",
    chapter_id: "c-1",
    title: "前向传播",
    learning_objectives: ["跑通一次前向"],
    content_type: "theory",
    status: "ready",
    order: 2,
    blocks: [],
    links: [],
    parent_page_id: "",
    error: "",
    created_at: 0,
    updated_at: 0,
  },
  {
    id: "p-3",
    book_id: "book-1",
    chapter_id: "c-2",
    title: "反向传播",
    learning_objectives: ["推导链式法则"],
    content_type: "derivation",
    status: "generating",
    order: 3,
    blocks: [],
    links: [],
    parent_page_id: "",
    error: "",
    created_at: 0,
    updated_at: 0,
  },
];

const DEMO_PROGRESS: BookProgress = (() => {
  const p = emptyBookProgress();
  p.bookId = "book-1";
  p.stages.ideation.state = "completed";
  p.stages.exploration.state = "completed";
  p.stages.synthesis.state = "completed";
  p.stages.critique.state = "completed";
  p.stages.overview.state = "running";
  p.exploration = {
    queryCount: 12,
    chunkCount: 84,
    candidateConcepts: 26,
    summary: "已完成检索",
  };
  p.synthesis = {
    rounds: 2,
    chapterCount: 4,
    conceptNodes: 18,
    conceptEdges: 22,
    lastVerdict: "ok",
  };
  p.critique = { rounds: 1, issues: 2 };
  p.compilation = { pagesPlanned: 12, pagesReady: 5, blocksReady: 24, blocksError: 0 };
  p.message = "正在生成章节概览…";
  p.updatedAt = Date.now();
  return p;
})();

function BookProgressTimelinePreview() {
  return (
    <Stack>
      <div>
        <VariantLabel>full</VariantLabel>
        <BookProgressTimeline progress={DEMO_PROGRESS} />
      </div>
      <div>
        <VariantLabel>compact</VariantLabel>
        <BookProgressTimeline progress={DEMO_PROGRESS} compact />
      </div>
      <div>
        <VariantLabel>mini</VariantLabel>
        <BookProgressTimeline progress={DEMO_PROGRESS} mini />
      </div>
    </Stack>
  );
}

function BookSidebarPreview() {
  const [pid, setPid] = useState("p-2");
  return (
    <div className="h-[420px] overflow-hidden rounded-lg border border-[var(--border)]">
      <BookSidebar
        book={DEMO_BOOK}
        onBackToLibrary={NOOP}
        pages={DEMO_PAGES}
        selectedPageId={pid}
        onSelectPage={setPid}
      />
    </div>
  );
}

function PageOutlineNavPreview() {
  const blocks: Block[] = [
    { id: "b1", type: "section", status: "ready", title: "梯度下降", params: {}, payload: {}, source_anchors: [], metadata: {}, error: "", created_at: 0, updated_at: 0 },
    { id: "b2", type: "text", status: "ready", title: "推导", params: {}, payload: {}, source_anchors: [], metadata: {}, error: "", created_at: 0, updated_at: 0 },
    { id: "b3", type: "callout", status: "ready", title: "Key idea", params: {}, payload: { variant: "key_idea" }, source_anchors: [], metadata: {}, error: "", created_at: 0, updated_at: 0 },
    { id: "b4", type: "quiz", status: "ready", title: "测验", params: {}, payload: {}, source_anchors: [], metadata: {}, error: "", created_at: 0, updated_at: 0 },
    { id: "b5", type: "code", status: "ready", title: "示例代码", params: {}, payload: {}, source_anchors: [], metadata: {}, error: "", created_at: 0, updated_at: 0 },
  ];
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]/40 p-3">
      <PageOutlineNav blocks={blocks} language="zh" />
    </div>
  );
}

function SpineEditorPreview() {
  const spine: Spine = {
    book_id: "book-1",
    chapters: [
      {
        id: "c-1",
        title: "基础",
        learning_objectives: ["理解神经网络", "完成一次前向"],
        content_type: "concept",
        source_anchors: [],
        prerequisites: [],
        page_ids: ["p-1", "p-2"],
        summary: "概念入门",
        order: 1,
      },
      {
        id: "c-2",
        title: "训练",
        learning_objectives: ["梯度下降", "反向传播"],
        content_type: "derivation",
        source_anchors: [],
        prerequisites: ["c-1"],
        page_ids: ["p-3"],
        summary: "推导核心算法",
        order: 2,
      },
    ],
    version: 1,
    updated_at: Date.now() / 1000,
  };
  return <SpineEditor spine={spine} onConfirm={NOOP} />;
}

function BookLibraryPreview() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]">
      <BookLibrary
        books={[
          DEMO_BOOK,
          { ...DEMO_BOOK, id: "book-2", title: "线性代数 30 分钟", status: "compiling", page_count: 8 },
          { ...DEMO_BOOK, id: "book-3", title: "强化学习入门", status: "draft", page_count: 0, chapter_count: 0 },
        ]}
        loading={false}
        onNewBook={NOOP}
        onSelectBook={NOOP}
        onDeleteBook={NOOP}
      />
    </div>
  );
}

// ---------- registry ----------

export const SHOWCASES: Showcase[] = [
  {
    id: "ui-button",
    category: "UI 原语",
    categoryCode: "ui/",
    name: "按钮",
    code: "Button",
    description: "支持 4 种 variant × 3 种 size，可附加 icon / loading 状态。",
    Preview: ButtonPreview,
  },
  {
    id: "ui-sheet",
    category: "UI 原语",
    categoryCode: "ui/",
    name: "侧滑面板",
    code: "Sheet",
    description:
      "默认 overlay — 表单、预览、浏览、设置 全用 Sheet。Phase 0.5.6 把旧版 `common/Modal` 迁来这里。",
    Preview: ModalPreview,
  },
  {
    id: "ui-alert-dialog",
    category: "UI 原语",
    categoryCode: "ui/",
    name: "破坏性确认",
    code: "AlertDialog",
    description:
      "不可撤销操作的硬阻断确认。15 处 window.confirm() 已通过 useConfirm() 收口到这里。",
    Preview: AlertDialogPreview,
  },
  {
    id: "ui-dialog",
    category: "UI 原语",
    categoryCode: "ui/",
    name: "居中模态",
    code: "Dialog",
    description:
      "仅破坏性确认 / 硬阻断 / 一句话非破坏性确认场景使用，其他全走 Sheet。",
    Preview: DialogPreview,
  },
  {
    id: "ui-dropdown-menu",
    category: "UI 原语",
    categoryCode: "ui/",
    name: "下拉菜单",
    code: "DropdownMenu",
    description: "锚定的列表弹层。支持 label / separator / destructive variant。",
    Preview: DropdownMenuPreview,
  },
  {
    id: "ui-input",
    category: "UI 原语",
    categoryCode: "ui/",
    name: "输入框",
    code: "Input + Label",
    description: "shadcn 标准表单输入：Input 配 Label，固定 ring/focus token。",
    Preview: InputPreview,
  },
  {
    id: "ui-textarea",
    category: "UI 原语",
    categoryCode: "ui/",
    name: "多行输入",
    code: "Textarea",
    description: "多行版 Input，与 Input 共享 ring/focus token。",
    Preview: TextareaPreview,
  },
  {
    id: "ui-popover",
    category: "UI 原语",
    categoryCode: "ui/",
    name: "锚定弹层",
    code: "Popover",
    description: "自由布局的小弹层（非列表）。列表场景用 DropdownMenu。",
    Preview: PopoverPreview,
  },
  {
    id: "ui-tooltip",
    category: "UI 原语",
    categoryCode: "ui/",
    name: "悬停提示",
    code: "Tooltip",
    description: "≤ 1 行的 hover 文字提示。需要 TooltipProvider 包裹。",
    Preview: TooltipPreview,
  },
  {
    id: "ui-toast",
    category: "UI 原语",
    categoryCode: "ui/",
    name: "通知",
    code: "sonner / toast()",
    description:
      "imperative 通知队列（≤ 3）。app/layout.tsx 已挂载 <Toaster richColors closeButton />。",
    Preview: ToastPreview,
  },
  {
    id: "common-process-logs",
    category: "共享原语",
    categoryCode: "common/",
    name: "进度日志",
    code: "ProcessLogs",
    description: "可折叠的运行日志面板，自动 stick-to-bottom。",
    Preview: ProcessLogsPreview,
  },
  {
    id: "common-rich-code-block",
    category: "共享原语",
    categoryCode: "common/",
    name: "代码高亮",
    code: "RichCodeBlock",
    description: "Prism 语法高亮 + 复制按钮的代码块。",
    Preview: RichCodeBlockPreview,
  },
  {
    id: "common-model-thinking",
    category: "共享原语",
    categoryCode: "common/",
    name: "思考可视化",
    code: "ModelThinkingCard",
    description: "<think> 块的折叠卡片，模型完成思考后默认折叠。",
    Preview: ModelThinkingCardPreview,
  },
  {
    id: "common-assistant-response",
    category: "共享原语",
    categoryCode: "common/",
    name: "消息容器",
    code: "AssistantResponse",
    description: "AI 回复的整体渲染：解析 <think> 段 + Markdown 正文。",
    Preview: AssistantResponsePreview,
  },
  {
    id: "common-simple-markdown",
    category: "共享原语",
    categoryCode: "common/",
    name: "极简 MD 渲染",
    code: "SimpleMarkdownRenderer",
    description: "无 KaTeX / Mermaid 的轻量 Markdown 渲染器。",
    Preview: SimpleMarkdownPreview,
  },
  {
    id: "kb-status-badge",
    category: "知识库",
    categoryCode: "knowledge/",
    name: "状态徽章",
    code: "KbStatusBadge",
    description: "知识库状态徽章，覆盖 ready / needs_reindex / error / indexing。",
    Preview: KbStatusBadgePreview,
  },
  {
    id: "kb-status-dot",
    category: "知识库",
    categoryCode: "knowledge/",
    name: "状态圆点",
    code: "KbStatusDot",
    description: "极简圆点版状态指示，用于侧栏 / 列表项。",
    Preview: KbStatusDotPreview,
  },
  {
    id: "kb-index-version-chip",
    category: "知识库",
    categoryCode: "knowledge/",
    name: "索引版本徽章",
    code: "IndexVersionChip",
    description: "知识库 embedding 索引版本徽章：active / pending / legacy。",
    Preview: IndexVersionChipPreview,
  },

  // ---------- Book Block 渲染器 ----------
  {
    id: "block-text",
    category: "Book Block 渲染",
    categoryCode: "book/blocks/",
    name: "文本块",
    code: "TextBlock",
    description: "Markdown 正文块，支持标题/粗体/列表。",
    Preview: TextBlockPreview,
  },
  {
    id: "block-section",
    category: "Book Block 渲染",
    categoryCode: "book/blocks/",
    name: "章节块",
    code: "SectionBlock",
    description: "intro + 多个 subsection + key takeaway。",
    Preview: SectionBlockPreview,
  },
  {
    id: "block-callout",
    category: "Book Block 渲染",
    categoryCode: "book/blocks/",
    name: "强调框",
    code: "CalloutBlock",
    description: "4 种 variant：key_idea / common_pitfall / summary / tip。",
    Preview: CalloutBlockPreview,
  },
  {
    id: "block-code",
    category: "Book Block 渲染",
    categoryCode: "book/blocks/",
    name: "代码块",
    code: "CodeBlock",
    description: "MarkdownRenderer 包装的语法高亮代码 + 解释文字。",
    Preview: BookCodeBlockPreview,
  },
  {
    id: "block-quiz",
    category: "Book Block 渲染",
    categoryCode: "book/blocks/",
    name: "测验块",
    code: "QuizBlock",
    description: "多选题 + reveal answer + 解释。",
    Preview: QuizBlockPreview,
  },
  {
    id: "block-user-note",
    category: "Book Block 渲染",
    categoryCode: "book/blocks/",
    name: "用户笔记块",
    code: "UserNoteBlock",
    description: "学习者自己写的批注，左侧虚线高亮。",
    Preview: UserNoteBlockPreview,
  },
  {
    id: "block-flash-cards",
    category: "Book Block 渲染",
    categoryCode: "book/blocks/",
    name: "闪卡块",
    code: "FlashCardsBlock",
    description: "翻转 + 上一/下一卡的交互记忆卡。",
    Preview: FlashCardsBlockPreview,
  },
  {
    id: "block-deep-dive",
    category: "Book Block 渲染",
    categoryCode: "book/blocks/",
    name: "深度展开块",
    code: "DeepDiveBlock",
    description: "Go Deeper 建议列表，点击触发新子页生成。",
    Preview: DeepDiveBlockPreview,
  },
  {
    id: "block-timeline",
    category: "Book Block 渲染",
    categoryCode: "book/blocks/",
    name: "时间线块",
    code: "TimelineBlock",
    description: "竖向带圆点的时间线。",
    Preview: TimelineBlockPreview,
  },
  {
    id: "block-placeholder",
    category: "Book Block 渲染",
    categoryCode: "book/blocks/",
    name: "占位块",
    code: "PlaceholderBlock",
    description: "等待 Phase 2 生成器接入时的兜底渲染。",
    Preview: PlaceholderBlockPreview,
  },
  {
    id: "block-figure",
    category: "Book Block 渲染",
    categoryCode: "book/blocks/",
    name: "图块",
    code: "FigureBlock",
    description: "通过 VisualizationViewer 渲染 SVG / Mermaid / Chart.js。",
    Preview: FigureBlockPreview,
  },
  {
    id: "block-interactive",
    category: "Book Block 渲染",
    categoryCode: "book/blocks/",
    name: "交互块",
    code: "InteractiveBlock",
    description: "嵌入用户可点击的 HTML 沙盒。",
    Preview: InteractiveBlockPreview,
  },
  {
    id: "block-animation",
    category: "Book Block 渲染",
    categoryCode: "book/blocks/",
    name: "动画块",
    code: "AnimationBlock",
    description: "Manim 等渲染产物的视频/图像展示（此处展示 empty-state）。",
    Preview: AnimationBlockPreview,
  },
  {
    id: "block-concept-graph",
    category: "Book Block 渲染",
    categoryCode: "book/blocks/",
    name: "概念图谱块",
    code: "ConceptGraphBlock",
    description: "章节/概念之间的依赖网络。",
    Preview: ConceptGraphBlockPreview,
  },

  // ---------- Chat 文件预览 ----------
  {
    id: "chat-svg-preview",
    category: "Chat 文件预览",
    categoryCode: "chat/preview/previewers/",
    name: "SVG 预览",
    code: "SvgPreview",
    description: "<img> 直接渲染 SVG，data URL 也支持。",
    Preview: SvgPreviewPreview,
  },
  {
    id: "chat-image-preview",
    category: "Chat 文件预览",
    categoryCode: "chat/preview/previewers/",
    name: "图片预览",
    code: "ImagePreview",
    description: "棋盘背景 + object-contain 居中的图片预览。",
    Preview: ImagePreviewPreview,
  },
  {
    id: "chat-fallback-preview",
    category: "Chat 文件预览",
    categoryCode: "chat/preview/previewers/",
    name: "兜底预览",
    code: "FallbackPreview",
    description: "未支持的文件类型 / legacy 附件的下载兜底。",
    Preview: FallbackPreviewPreview,
  },
  {
    id: "chat-office-text-preview",
    category: "Chat 文件预览",
    categoryCode: "chat/preview/previewers/",
    name: "Office 文本预览",
    code: "OfficeTextPreview",
    description: "DOCX / XLSX / PPTX 后端抽取出的纯文本，配下载按钮。",
    Preview: OfficeTextPreviewPreview,
  },
  {
    id: "chat-file-preview-drawer",
    category: "Chat 文件预览",
    categoryCode: "chat/preview/",
    name: "附件抽屉",
    code: "FilePreviewSheet",
    description: "右侧滑出的统一附件预览抽屉，按文件类型路由到不同 previewer。",
    Preview: FilePreviewSheetPreview,
  },

  // ---------- Chat 输入与提及 ----------
  {
    id: "chat-simple-composer-input",
    category: "Chat 输入",
    categoryCode: "chat/home/",
    name: "极简输入框",
    code: "SimpleComposerInput",
    description: "无 capability / 工具菜单的精简版输入框。",
    Preview: SimpleComposerInputPreview,
  },
  {
    id: "chat-at-mention",
    category: "Chat 输入",
    categoryCode: "chat/",
    name: "@ 提及弹窗",
    code: "AtMentionPopup",
    description: "@ 触发的「Notebook / 历史 / 题库」三入口选单。",
    Preview: AtMentionPopupPreview,
  },
  {
    id: "chat-reference-chips",
    category: "Chat 输入",
    categoryCode: "chat/home/",
    name: "引用 chips",
    code: "ReferenceChips",
    description: "已选 Notebook / 历史会话 / 题库引用的可移除 chip 组。",
    Preview: ReferenceChipsPreview,
  },
  {
    id: "chat-history-picker",
    category: "Chat 输入",
    categoryCode: "chat/",
    name: "历史会话选择",
    code: "HistorySessionPicker",
    description: "弹出选择多个历史会话作为引用上下文。",
    Preview: HistorySessionPickerPreview,
  },
  {
    id: "chat-question-bank-picker",
    category: "Chat 输入",
    categoryCode: "chat/",
    name: "题库选择",
    code: "QuestionBankPicker",
    description: "选择题库中的题目条目作为引用。",
    Preview: QuestionBankPickerPreview,
  },

  // ---------- Chat Trace ----------
  {
    id: "chat-call-trace-panel",
    category: "Chat 执行追踪",
    categoryCode: "chat/home/",
    name: "调用追踪面板",
    code: "CallTracePanel",
    description: "把 tool_call / tool_result / thinking 等流事件按 call_id 分组展示。",
    Preview: CallTracePanelPreview,
  },

  // ---------- Chat 消息类型 ----------
  {
    id: "chat-msg-user-simple",
    category: "Chat 消息类型",
    categoryCode: "chat/home/",
    name: "用户消息 · 普通",
    code: "ChatMessageList(user)",
    description: "最常见的纯文本用户消息。",
    Preview: ChatMsgUserSimplePreview,
  },
  {
    id: "chat-msg-user-capability",
    category: "Chat 消息类型",
    categoryCode: "chat/home/",
    name: "用户消息 · capability 徽章",
    code: "ChatMessageList(user.capability)",
    description: "5 种 capability badge：Deep Solve / Quiz / Research / Math / Visualize。",
    Preview: ChatMsgUserCapabilityPreview,
  },
  {
    id: "chat-msg-user-attachments",
    category: "Chat 消息类型",
    categoryCode: "chat/home/",
    name: "用户消息 · 附件",
    code: "ChatMessageList(user.attachments)",
    description: "图片 + 文档附件混合，缩略图 + 文档卡片。",
    Preview: ChatMsgUserAttachmentPreview,
  },
  {
    id: "chat-msg-user-refs",
    category: "Chat 消息类型",
    categoryCode: "chat/home/",
    name: "用户消息 · 引用",
    code: "ChatMessageList(user.requestSnapshot)",
    description: "携带 Notebook / 历史会话引用的用户消息。",
    Preview: ChatMsgUserRefsPreview,
  },
  {
    id: "chat-msg-assistant-text",
    category: "Chat 消息类型",
    categoryCode: "chat/home/",
    name: "AI 回复 · 纯文本",
    code: "ChatMessageList(assistant)",
    description: "Markdown 正文 + 复制 / 重新生成动作。",
    Preview: ChatMsgAssistantTextPreview,
  },
  {
    id: "chat-msg-assistant-thinking",
    category: "Chat 消息类型",
    categoryCode: "chat/home/",
    name: "AI 回复 · 含 think 块",
    code: "ChatMessageList(assistant.<think>)",
    description: "<think> 段折叠为 ModelThinkingCard，正文照常渲染。",
    Preview: ChatMsgAssistantThinkingPreview,
  },
  {
    id: "chat-msg-assistant-tools",
    category: "Chat 消息类型",
    categoryCode: "chat/home/",
    name: "AI 回复 · 工具调用",
    code: "ChatMessageList(assistant.events)",
    description: "events 含 tool_call / tool_result，渲染为 CallTracePanel。",
    Preview: ChatMsgAssistantToolPreview,
  },

  // ---------- Common ----------
  {
    id: "common-markdown-renderer",
    category: "共享原语",
    categoryCode: "common/",
    name: "Markdown 渲染",
    code: "MarkdownRenderer",
    description: "default / compact / prose 三种 variant，自动检测数学/代码/Mermaid。",
    Preview: MarkdownRendererPreview,
  },

  // ---------- Math Animator ----------
  {
    id: "math-animator-viewer",
    category: "数学动画",
    categoryCode: "math-animator/",
    name: "动画 viewer",
    code: "MathAnimatorViewer",
    description: "Manim 渲染产物的 viewer：图像/视频 + 时序信息 + 复审摘要。",
    Preview: MathAnimatorViewerPreview,
  },
  {
    id: "math-animator-config",
    category: "数学动画",
    categoryCode: "math-animator/",
    name: "配置面板",
    code: "MathAnimatorConfigPanel",
    description: "Manim 输出模式 / 质量 / 风格提示。",
    Preview: MathAnimatorConfigPanelPreview,
  },

  // ---------- Visualize ----------
  {
    id: "visualize-viewer",
    category: "可视化",
    categoryCode: "visualize/",
    name: "可视化 viewer",
    code: "VisualizationViewer",
    description: "SVG / Chart.js / Mermaid / HTML 四种 render_type 的展示。",
    Preview: VisualizationViewerPreview,
  },
  {
    id: "visualize-config",
    category: "可视化",
    categoryCode: "visualize/",
    name: "配置面板",
    code: "VisualizeConfigPanel",
    description: "render_mode 切换：auto / svg / chartjs / mermaid / html。",
    Preview: VisualizeConfigPanelPreview,
  },

  // ---------- Quiz ----------
  {
    id: "quiz-config",
    category: "测验",
    categoryCode: "quiz/",
    name: "配置面板",
    code: "QuizConfigPanel",
    description: "Custom / Mimic 两种模式 + 题量 / 难度 / 题型。",
    Preview: QuizConfigPanelPreview,
  },
  {
    id: "quiz-viewer",
    category: "测验",
    categoryCode: "quiz/",
    name: "测验 viewer",
    code: "QuizViewer",
    description: "选择题 + 简答题混合的答题界面，带 reveal answer。",
    Preview: QuizViewerPreview,
  },
  {
    id: "quiz-followup",
    category: "测验",
    categoryCode: "quiz/",
    name: "追问面板",
    code: "QuestionFollowupPanel",
    description: "针对单题的追问对话面板（带打字机流式）。",
    Preview: QuestionFollowupPanelPreview,
  },

  // ---------- Research ----------
  {
    id: "research-config",
    category: "研究",
    categoryCode: "research/",
    name: "配置面板",
    code: "ResearchConfigPanel",
    description: "Mode (notes/report/comparison/learning_path) × Depth × Sources。",
    Preview: ResearchConfigPanelPreview,
  },
  {
    id: "research-outline",
    category: "研究",
    categoryCode: "research/",
    name: "大纲编辑",
    code: "ResearchOutlineEditor",
    description: "深度研究开始前的可编辑大纲（标题 + 概览）。",
    Preview: ResearchOutlineEditorPreview,
  },

  // ---------- Notebook ----------
  {
    id: "notebook-selector",
    category: "笔记本",
    categoryCode: "notebook/",
    name: "笔记本选择器",
    code: "NotebookSelector",
    description: "Notebook → 记录的两层勾选树。",
    Preview: NotebookSelectorPreview,
  },
  {
    id: "notebook-record-picker",
    category: "笔记本",
    categoryCode: "notebook/",
    name: "记录选择器",
    code: "NotebookRecordPicker",
    description: "在 NotebookSelector 外层加上 modal 容器与多选确认。",
    Preview: NotebookRecordPickerPreview,
  },
  {
    id: "notebook-save-modal",
    category: "笔记本",
    categoryCode: "notebook/",
    name: "保存模态",
    code: "SaveToNotebookModal",
    description: "把当前回合保存到 Notebook，支持选择消息子集。",
    Preview: SaveToNotebookModalPreview,
  },

  // ---------- Knowledge (extended) ----------
  {
    id: "kb-file-drop-zone",
    category: "知识库",
    categoryCode: "knowledge/",
    name: "拖拽上传区",
    code: "FileDropZone",
    description: "可拖拽的多文件上传区域，附 policy 提示。",
    Preview: FileDropZonePreview,
  },
  {
    id: "kb-update-history",
    category: "知识库",
    categoryCode: "knowledge/",
    name: "更新历史",
    code: "KbUpdateHistory",
    description: "上传 / 重建索引 / 创建 KB 的事件流。",
    Preview: KbUpdateHistoryPreview,
  },
  {
    id: "kb-settings-section",
    category: "知识库",
    categoryCode: "knowledge/",
    name: "设置区",
    code: "KbSettingsSection",
    description: "嵌入模型、是否默认、删除等 KB 元数据操作。",
    Preview: KbSettingsSectionPreview,
  },
  {
    id: "kb-index-versions-section",
    category: "知识库",
    categoryCode: "knowledge/",
    name: "索引版本区",
    code: "KbIndexVersionsSection",
    description: "历史索引版本列表 + 一键重建。",
    Preview: KbIndexVersionsSectionPreview,
  },
  {
    id: "kb-documents-section",
    category: "知识库",
    categoryCode: "knowledge/",
    name: "文档区",
    code: "KbDocumentsSection",
    description: "新增文档（drop zone + 上传 + 实时进度）。",
    Preview: KbDocumentsSectionPreview,
  },
  {
    id: "kb-list-item",
    category: "知识库",
    categoryCode: "knowledge/",
    name: "KB 列表项",
    code: "KnowledgeBaseListItem",
    description: "单个 KB 的列表卡片（含状态徽章 / 默认标记 / 操作）。",
    Preview: KnowledgeBaseListItemPreview,
  },
  {
    id: "kb-list",
    category: "知识库",
    categoryCode: "knowledge/",
    name: "KB 列表",
    code: "KnowledgeBaseList",
    description: "知识库左侧列表面板（含新建按钮）。",
    Preview: KnowledgeBaseListPreview,
  },
  {
    id: "kb-create-modal",
    category: "知识库",
    categoryCode: "knowledge/",
    name: "新建 KB 模态",
    code: "CreateKbModal",
    description: "新建知识库：填名字、选 RAG provider、上传初始文档。",
    Preview: CreateKbModalPreview,
  },

  // ---------- Book non-block ----------
  {
    id: "book-progress-timeline",
    category: "Book UI",
    categoryCode: "book/components/",
    name: "进度时间线",
    code: "BookProgressTimeline",
    description: "BookEngine 6 阶段进度的 full / compact / mini 三种版式。",
    Preview: BookProgressTimelinePreview,
  },
  {
    id: "book-sidebar",
    category: "Book UI",
    categoryCode: "book/components/",
    name: "Book 侧栏",
    code: "BookSidebar",
    description: "书籍信息 + 章节/页导航。",
    Preview: BookSidebarPreview,
  },
  {
    id: "book-page-outline-nav",
    category: "Book UI",
    categoryCode: "book/components/",
    name: "大纲导航",
    code: "PageOutlineNav",
    description: "页面内 block 的小型大纲快速跳转。",
    Preview: PageOutlineNavPreview,
  },
  {
    id: "book-spine-editor",
    category: "Book UI",
    categoryCode: "book/components/",
    name: "脊柱编辑",
    code: "SpineEditor",
    description: "在编译前编辑章节大纲（拖动 / 增删 / 改 content_type）。",
    Preview: SpineEditorPreview,
  },
  {
    id: "book-library",
    category: "Book UI",
    categoryCode: "book/components/",
    name: "书库",
    code: "BookLibrary",
    description: "已生成 / 编译中 / 草稿三种状态的书籍卡片列表。",
    Preview: BookLibraryPreview,
  },

  // ---------- 顶层组件 ----------
  {
    id: "top-mermaid",
    category: "顶层",
    categoryCode: "components/",
    name: "图表渲染",
    code: "Mermaid",
    description: "懒加载的 Mermaid 渲染器（flowchart / sequence / class …）。",
    Preview: MermaidPreview,
  },
  {
    id: "top-session-list",
    category: "顶层",
    categoryCode: "components/",
    name: "会话列表",
    code: "SessionList",
    description: "状态徽章 + 重命名 / 删除菜单的会话列表。",
    Preview: SessionListPreview,
  },

  // ---------- Space ----------
  {
    id: "space-mini-nav",
    category: "工作区",
    categoryCode: "space/",
    name: "小导航",
    code: "SpaceMiniNav",
    description: "Memory / Notebooks / Questions / Skills 之间的子导航。",
    Preview: SpaceMiniNavPreview,
  },
  {
    id: "space-section-header",
    category: "工作区",
    categoryCode: "space/",
    name: "段头",
    code: "SpaceSectionHeader",
    description: "图标 + 标题 + 描述 + meta，构成各 Space 段落的页头。",
    Preview: SpaceSectionHeaderPreview,
  },

  // ---------- Sidebar ----------
  {
    id: "sidebar-version-badge",
    category: "侧边栏",
    categoryCode: "sidebar/",
    name: "版本徽章",
    code: "VersionBadge",
    description: "底部当前版本 / 最新版本对比徽章。",
    Preview: VersionBadgePreview,
  },
];
