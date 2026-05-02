"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Check,
  FileText,
  Loader2,
  Play,
  Sparkles,
  Terminal,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiUrl } from "@/lib/api";
import AssistantResponse from "@/components/common/AssistantResponse";
import MarkdownRenderer from "@/components/common/MarkdownRenderer";
import ProcessLogs from "@/components/common/ProcessLogs";
import { PageBody, PageHeader } from "@/components/layout";
import ResearchConfigPanel from "@/components/research/ResearchConfigPanel";
import {
  extractBase64FromDataUrl,
  readFileAsDataUrl,
} from "@/lib/file-attachments";
import { listKnowledgeBases } from "@/lib/knowledge-api";
import type { StreamEvent } from "@/lib/unified-ws";
import {
  filterFrontendTools,
  FRONTEND_HIDDEN_TOOLS,
  loadCapabilityPlaygroundConfigs,
  resolveCapabilityPlaygroundConfig,
  saveCapabilityPlaygroundConfig,
  type CapabilityPlaygroundConfig,
  type CapabilityPlaygroundConfigMap,
} from "@/lib/playground-config";
import {
  buildResearchWSConfig,
  createEmptyResearchConfig,
  normalizeResearchConfig,
  validateResearchConfig,
  type DeepResearchFormConfig,
  type ResearchSource,
} from "@/lib/research-types";
import {
  CAPABILITY_LABELS,
  DEFAULT_DEEP_QUESTION_CONFIG,
  QUERY_PARAM_NAMES,
  RESEARCH_SOURCE_OPTIONS,
  getCapIcon,
  getCapabilityLabel,
  getToolIcon,
  getToolLabel,
  normalizeDeepQuestionConfig,
  titleCase,
  type CapabilityExecResult,
  type CapabilityInfo,
  type DeepQuestionFormConfig,
  type ExecResult,
  type KnowledgeBase,
  type TesterMessage,
  type ToolInfo,
  type ToolParam,
} from "@/lib/playground-helpers";
import { TracePanel } from "@/components/playground/TracePanel";
import { CapabilityResultPanel } from "@/components/playground/CapabilityResultPanel";
import { ToolExecutor } from "@/components/playground/ToolExecutor";
import { CapabilityTester } from "@/components/playground/CapabilityTester";
import { DeepQuestionTester } from "@/components/playground/DeepQuestionTester";
import { DeepResearchTester } from "@/components/playground/DeepResearchTester";

export default function PlaygroundPage() {
  const { t } = useTranslation();
  const [tools, setToolsList] = useState<ToolInfo[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilityInfo[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [capabilityConfigs, setCapabilityConfigs] =
    useState<CapabilityPlaygroundConfigMap>({});
  const [activeKind, setActiveKind] = useState<"tool" | "capability">("tool");
  const [activeName, setActiveName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pluginRes, knowledgeBaseList] = await Promise.all([
          fetch(apiUrl("/api/v1/plugins/list")),
          listKnowledgeBases(),
        ]);
        const data = await pluginRes.json();
        const visibleTools = (data.tools || []).filter(
          (tool: ToolInfo) => !FRONTEND_HIDDEN_TOOLS.has(tool.name),
        );
        const visibleCapabilities = (data.capabilities || []).map(
          (cap: CapabilityInfo) => ({
            ...cap,
            tools_used: filterFrontendTools(cap.tools_used ?? []),
          }),
        );

        setToolsList(visibleTools);
        setCapabilities(visibleCapabilities);
        setCapabilityConfigs(loadCapabilityPlaygroundConfigs());
        setKnowledgeBases(knowledgeBaseList);

        if (visibleTools.length) {
          setActiveKind("tool");
          setActiveName(visibleTools[0].name);
        } else if (visibleCapabilities.length) {
          setActiveKind("capability");
          setActiveName(visibleCapabilities[0].name);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const capabilityCatalog = capabilities;

  const activeTool = tools.find((t) => t.name === activeName);
  const activeCapability = capabilityCatalog.find((c) => c.name === activeName);
  const activeCapabilityConfig = useMemo(
    () =>
      activeCapability
        ? resolveCapabilityPlaygroundConfig(
            capabilityConfigs,
            activeCapability.name,
            activeCapability.tools_used ?? [],
          )
        : null,
    [activeCapability, capabilityConfigs],
  );
  const activeDeepQuestionConfig = useMemo(
    () =>
      normalizeDeepQuestionConfig(
        activeCapabilityConfig?.config as Record<string, unknown> | undefined,
      ),
    [activeCapabilityConfig?.config],
  );
  const activeDeepResearchConfig = useMemo(
    () =>
      normalizeResearchConfig(
        activeCapabilityConfig?.config as Record<string, unknown> | undefined,
      ),
    [activeCapabilityConfig?.config],
  );
  const listItems = useMemo(
    () =>
      activeKind === "tool"
        ? tools.map((t) => ({ name: t.name, description: t.description }))
        : capabilityCatalog.map((c) => ({
            name: c.name,
            description: c.description,
          })),
    [activeKind, capabilityCatalog, tools],
  );

  const persistCapabilityConfig = (
    capabilityName: string,
    next: CapabilityPlaygroundConfig,
  ) => {
    setCapabilityConfigs((prev) =>
      saveCapabilityPlaygroundConfig(prev, capabilityName, next),
    );
  };

  const toggleCapabilityTool = (toolName: string) => {
    if (!activeCapability || !activeCapabilityConfig) return;
    const allowedTools = filterFrontendTools(activeCapability.tools_used ?? []);
    if (!allowedTools.includes(toolName)) return;

    const enabledSet = new Set(activeCapabilityConfig.enabledTools);
    if (enabledSet.has(toolName)) enabledSet.delete(toolName);
    else enabledSet.add(toolName);

    const defaultKb =
      knowledgeBases.find((kb) => kb.is_default)?.name ??
      knowledgeBases[0]?.name ??
      "";

    persistCapabilityConfig(activeCapability.name, {
      enabledTools: allowedTools.filter((name) => enabledSet.has(name)),
      knowledgeBase:
        activeCapabilityConfig.knowledgeBase ||
        (enabledSet.has("rag") ? defaultKb : ""),
      config: activeCapabilityConfig.config,
    });
  };

  const setCapabilityKnowledgeBase = (knowledgeBase: string) => {
    if (!activeCapability || !activeCapabilityConfig) return;
    persistCapabilityConfig(activeCapability.name, {
      enabledTools: activeCapabilityConfig.enabledTools,
      knowledgeBase,
      config: activeCapabilityConfig.config,
    });
  };

  const setDeepQuestionConfig = (next: DeepQuestionFormConfig) => {
    if (!activeCapability || !activeCapabilityConfig) return;
    persistCapabilityConfig(activeCapability.name, {
      enabledTools: activeCapabilityConfig.enabledTools,
      knowledgeBase: activeCapabilityConfig.knowledgeBase,
      config: next as unknown as Record<string, unknown>,
    });
  };

  const setDeepResearchConfig = (next: DeepResearchFormConfig) => {
    if (!activeCapability || !activeCapabilityConfig) return;
    persistCapabilityConfig(activeCapability.name, {
      enabledTools: activeCapabilityConfig.enabledTools,
      knowledgeBase: activeCapabilityConfig.knowledgeBase,
      config: next as unknown as Record<string, unknown>,
    });
  };

  return (
    <section
      aria-label={t("Playground content")}
      className="h-full overflow-y-auto [scrollbar-gutter:stable]"
    >
      <PageBody size="default">
        <PageHeader
          title={t("Playground")}
          description={t(
            "Explore the building blocks of DeepTutor: reusable tools and higher-level capabilities.",
          )}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Tab bar */}
            <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--muted)] p-0.5">
              <button
                onClick={() => {
                  setActiveKind("tool");
                  if (tools.length) setActiveName(tools[0].name);
                }}
                className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-all ${activeKind === "tool" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              >
                {t("Tools")}
              </button>
              <button
                onClick={() => {
                  setActiveKind("capability");
                  if (capabilityCatalog.length)
                    setActiveName(capabilityCatalog[0].name);
                }}
                className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-all ${activeKind === "capability" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              >
                {t("Capabilities")}
              </button>
            </div>

            {/* Two-column layout */}
            <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
              {/* Left: Item list */}
              <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-1.5">
                  {activeKind === "tool" ? (
                    <Terminal className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                  )}
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                    {activeKind === "tool" ? t("Tools") : t("Capabilities")}
                  </h2>
                </div>
                <div className="space-y-1">
                  {listItems.map((item) => {
                    const Icon =
                      activeKind === "tool"
                        ? getToolIcon(item.name)
                        : getCapIcon(item.name);
                    return (
                      <button
                        key={item.name}
                        onClick={() => setActiveName(item.name)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                          activeName === item.name
                            ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                            : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--foreground)]/10 hover:bg-[var(--muted)]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon size={13} strokeWidth={1.7} />
                          <span className="text-[13px] font-medium">
                            {activeKind === "tool"
                              ? t(getToolLabel(item.name))
                              : t(getCapabilityLabel(item.name))}
                          </span>
                        </div>
                        <div
                          className={`mt-0.5 line-clamp-2 text-[11px] leading-relaxed ${activeName === item.name ? "text-[var(--primary-foreground)]/70" : "text-[var(--muted-foreground)]"}`}
                        >
                          {item.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Right: Detail panel */}
              <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                {activeKind === "tool" && activeTool
                  ? (() => {
                      const ToolIcon = getToolIcon(activeTool.name);
                      return (
                        <div className="space-y-6">
                          <div>
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                              <ToolIcon size={13} strokeWidth={1.7} />
                              {t("Tool")}
                            </div>
                            <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--foreground)]">
                              {t(getToolLabel(activeTool.name))}
                            </h2>
                            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                              {activeTool.description}
                            </p>
                          </div>

                          <div className="border-t border-[var(--border)] pt-6">
                            <ToolExecutor
                              tool={activeTool}
                              knowledgeBases={knowledgeBases}
                            />
                          </div>
                        </div>
                      );
                    })()
                  : activeCapability
                    ? (() => {
                        const CapIcon = getCapIcon(activeCapability.name);
                        return (
                          <div className="space-y-6">
                            <div>
                              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                                <CapIcon size={13} strokeWidth={1.7} />
                                {t("Capability")}
                              </div>
                              <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--foreground)]">
                                {t(getCapabilityLabel(activeCapability.name))}
                              </h2>
                              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                                {activeCapability.description}
                              </p>
                            </div>

                            <div>
                              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                                {t("Enable Tools")}
                              </h3>
                              {!!activeCapability.tools_used?.length ? (
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                  {activeCapability.tools_used.map((tool) => {
                                    const TIcon = getToolIcon(tool);
                                    const enabled =
                                      activeCapabilityConfig?.enabledTools.includes(
                                        tool,
                                      ) ?? true;
                                    return (
                                      <button
                                        key={`${activeCapability.name}-${tool}`}
                                        onClick={() =>
                                          toggleCapabilityTool(tool)
                                        }
                                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                          enabled
                                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                                            : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                        }`}
                                      >
                                        <TIcon size={11} strokeWidth={1.7} />
                                        {t(getToolLabel(tool))}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="mt-2 text-[12px] text-[var(--muted-foreground)]">
                                  {t(
                                    "This capability runs without optional tools.",
                                  )}
                                </p>
                              )}
                            </div>

                            {activeCapabilityConfig?.enabledTools.includes(
                              "rag",
                            ) && (
                              <div>
                                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                                  {t("Knowledge Base")}
                                </h3>
                                <div className="mt-2.5 max-w-sm">
                                  <select
                                    value={activeCapabilityConfig.knowledgeBase}
                                    onChange={(e) =>
                                      setCapabilityKnowledgeBase(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]/40"
                                  >
                                    <option value="">
                                      {t("Select knowledge base...")}
                                    </option>
                                    {knowledgeBases.map((kb) => (
                                      <option key={kb.name} value={kb.name}>
                                        {kb.name}
                                        {kb.is_default
                                          ? ` (${t("default")})`
                                          : ""}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}

                            <div className="border-t border-[var(--border)] pt-6">
                              <div className="mb-3">
                                <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
                                  {t("Try this capability")}
                                </h3>
                                <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
                                  {t(
                                    "Run a focused conversation here without leaving the playground.",
                                  )}
                                </p>
                              </div>
                              {activeCapability.name === "deep_question" ? (
                                <DeepQuestionTester
                                  key={activeCapability.name}
                                  capability={activeCapability}
                                  enabledTools={
                                    activeCapabilityConfig?.enabledTools ??
                                    activeCapability.tools_used ??
                                    []
                                  }
                                  knowledgeBase={
                                    activeCapabilityConfig?.knowledgeBase ?? ""
                                  }
                                  config={activeDeepQuestionConfig}
                                  onConfigChange={setDeepQuestionConfig}
                                />
                              ) : activeCapability.name === "deep_research" ? (
                                <DeepResearchTester
                                  key={activeCapability.name}
                                  capability={activeCapability}
                                  enabledTools={
                                    activeCapabilityConfig?.enabledTools ??
                                    activeCapability.tools_used ??
                                    []
                                  }
                                  knowledgeBase={
                                    activeCapabilityConfig?.knowledgeBase ?? ""
                                  }
                                  config={activeDeepResearchConfig}
                                  onConfigChange={setDeepResearchConfig}
                                />
                              ) : (
                                <CapabilityTester
                                  key={activeCapability.name}
                                  capability={activeCapability}
                                  enabledTools={
                                    activeCapabilityConfig?.enabledTools ??
                                    activeCapability.tools_used ??
                                    []
                                  }
                                  knowledgeBase={
                                    activeCapabilityConfig?.knowledgeBase ?? ""
                                  }
                                />
                              )}
                            </div>
                          </div>
                        );
                      })()
                    : null}
              </section>
            </div>
          </div>
        )}
      </PageBody>
    </section>
  );
}
