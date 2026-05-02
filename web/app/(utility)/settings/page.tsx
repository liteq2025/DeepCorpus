/* eslint-disable i18n/no-literal-ui-text */
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bell,
  BookOpen,
  BookText,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Database,
  Eye,
  EyeOff,
  Info,
  Keyboard,
  Loader2,
  MessageSquare,
  Moon,
  NotebookPen,
  Plus,
  Rocket,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Terminal,
  Trash2,
  Wand2,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  EmptyState,
  ListPane,
  Onboarding,
  RouteFrame,
  useConfirm,
  type OnboardingStep,
} from "@/components/layout";
import { writeStoredLanguage } from "@/context/app-shell-storage";
import { apiUrl } from "@/lib/api";
import { setTheme as applyThemePreference } from "@/lib/theme";
import {
  cloneCatalog,
  defaultCatalog,
  deprecatedSearchProviders,
  formatContextWindowSource,
  formatContextWindowUpdatedAt,
  getActiveModel,
  getActiveProfile,
  inputClass,
  selectClass,
  statusDotClass,
  stringifyExtraHeaders,
  supportedSearchProviders,
  type Catalog,
  type CatalogModel,
  type CatalogProfile,
  type EmbeddingCapabilities,
  type ProviderOption,
  type ServiceName,
  type SettingsPayload,
  type SystemStatus,
  type UiSettings,
} from "@/lib/settings-helpers";
import { DimensionField } from "@/components/settings/DimensionField";
import { EmbeddingProviderHelp } from "@/components/settings/EmbeddingProviderHelp";
import { LlmProviderHelp } from "@/components/settings/LlmProviderHelp";
import { SearchProviderHelp } from "@/components/settings/SearchProviderHelp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function serviceIcon(service: ServiceName) {
  if (service === "llm") return <Brain className="h-3.5 w-3.5" />;
  if (service === "embedding") return <Database className="h-3.5 w-3.5" />;
  return <Search className="h-3.5 w-3.5" />;
}

function serviceHealthDot(
  service: ServiceName,
  status: SystemStatus | null,
): string {
  if (!status) return "bg-[var(--border)]";
  if (service === "llm")
    return statusDotClass(Boolean(status.llm.model), Boolean(status.llm.error));
  if (service === "embedding")
    return statusDotClass(
      Boolean(status.embeddings.model),
      Boolean(status.embeddings.error),
    );
  return statusDotClass(
    Boolean(status.search.provider),
    Boolean(status.search.error),
  );
}

/**
 * Count field-level differences between two catalog values. Walks both
 * trees in parallel and increments per leaf-field mismatch (or per
 * extra/missing field at any level), so adding a brand-new profile
 * registers as ~one diff per field on that profile — close enough to
 * "size of the change" for the pending banner.
 */
function countDiffs(a: unknown, b: unknown): number {
  if (a === b) return 0;
  const ao = a == null ? null : typeof a;
  const bo = b == null ? null : typeof b;
  if (ao !== "object" || bo !== "object") return 1;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return 1;
    let count = Math.abs(a.length - b.length);
    const min = Math.min(a.length, b.length);
    for (let i = 0; i < min; i++) count += countDiffs(a[i], b[i]);
    return count;
  }
  const oa = a as Record<string, unknown>;
  const ob = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(oa), ...Object.keys(ob)]);
  let count = 0;
  for (const k of keys) count += countDiffs(oa[k], ob[k]);
  return count;
}

function buildTestSummary(
  service: ServiceName,
  draft: Catalog,
  caps: { detected_dim?: number; active_dim?: number },
): string {
  const profile = getActiveProfile(draft, service);
  const profileLabel = profile?.name ?? "—";
  if (service === "search") {
    const provider = profile?.provider || "—";
    return `${profileLabel} · ${provider}`;
  }
  const model = getActiveModel(draft, service);
  const modelLabel = model?.model || model?.name || "—";
  if (service === "embedding") {
    const dim = caps.active_dim ?? caps.detected_dim;
    const tail = dim ? `${modelLabel} · ${dim}d` : modelLabel;
    return `${profileLabel} · ${tail}`;
  }
  return `${profileLabel} · ${modelLabel}`;
}

function formatTimeAgo(ts: number, locale: "en" | "zh"): string {
  const diff = Date.now() - ts;
  const sec = Math.max(1, Math.round(diff / 1000));
  if (locale === "zh") {
    if (sec < 60) return `${sec} 秒前`;
    if (sec < 3600) return `${Math.round(sec / 60)} 分钟前`;
    return `${Math.round(sec / 3600)} 小时前`;
  }
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  return `${Math.round(sec / 3600)}h ago`;
}

function logLineClass(line: string): string {
  const match = /^\[([a-z_]+)\]/i.exec(line);
  const type = match?.[1]?.toLowerCase();
  if (!type) return "text-[var(--muted-foreground)]";
  if (type === "completed") return "text-emerald-400";
  if (type === "failed") return "text-red-400";
  if (type === "warning") return "text-amber-400";
  if (type === "request" || type === "response" || type === "capabilities")
    return "text-sky-400";
  return "text-[var(--muted-foreground)]";
}

type TestStatus = "idle" | "running" | "success" | "failed";

/**
 * Health dot variant for the **main pane h2** — augments the static
 * backend status with this session's Run-test outcome:
 *
 *   not-configured → gray
 *   backend error  → red
 *   testStatus=success → green
 *   testStatus=failed  → red
 *   testStatus=idle/running, but configured → amber ("not yet verified")
 *
 * The amber is the new state — closes the "deepseek key passed off as
 * brave key still showed green" gap, since green now requires you to
 * actually have run the smoke test in this session and seen it pass.
 *
 * The ListPane nav dots keep using the simpler `serviceHealthDot` —
 * those represent "configuration completeness" rather than "is it
 * actually working", since cross-service nav can't see another
 * service's testStatus.
 */
function effectiveServiceHealthDot(
  service: ServiceName,
  status: SystemStatus | null,
  testStatus: TestStatus,
): string {
  if (!status) return "bg-[var(--border)]";

  const error =
    service === "search"
      ? status.search.error
      : service === "llm"
        ? status.llm.error
        : status.embeddings.error;
  if (error) return "bg-red-400";

  const configured =
    service === "search"
      ? Boolean(status.search.provider)
      : service === "llm"
        ? Boolean(status.llm.model)
        : Boolean(status.embeddings.model);
  if (!configured) return "bg-[var(--border)]";

  if (testStatus === "success") return "bg-emerald-500";
  if (testStatus === "failed") return "bg-red-400";
  // configured + idle/running this session → amber
  return "bg-amber-500";
}

function effectiveServiceHealthLabel(
  service: ServiceName,
  status: SystemStatus | null,
  testStatus: TestStatus,
  t: (key: string) => string,
): string {
  if (!status) return t("Loading…");
  const baseLabel = serviceHealthLabel(service, status, t);
  if (baseLabel === t("Not configured")) return baseLabel;
  // baseLabel is "Configured: {model}" or an error string
  const error =
    service === "search"
      ? status.search.error
      : service === "llm"
        ? status.llm.error
        : status.embeddings.error;
  if (error) return baseLabel; // already says the error
  if (testStatus === "success") return `${baseLabel} · ${t("Test passed")}`;
  if (testStatus === "failed") return `${baseLabel} · ${t("Test failed")}`;
  return `${baseLabel} · ${t("Not yet verified")}`;
}

function serviceHealthLabel(
  service: ServiceName,
  status: SystemStatus | null,
  t: (key: string) => string,
): string {
  if (!status) return t("Loading…");
  if (service === "search") {
    if (status.search.error) return status.search.error;
    return status.search.provider
      ? `${t("Configured")}: ${status.search.provider}`
      : t("Not configured");
  }
  const slot = service === "llm" ? status.llm : status.embeddings;
  if (slot.error) return slot.error;
  return slot.model
    ? `${t("Configured")}: ${slot.model}`
    : t("Not configured");
}

type Section =
  | "preferences"
  | "notifications"
  | "llm"
  | "embedding"
  | "search"
  | "chat-defaults"
  | "knowledge-defaults"
  | "reading"
  | "notebook-prefs"
  | "memory-prefs"
  | "skills-prefs"
  | "shortcuts"
  | "about";

interface SectionEntry {
  id: Section;
  label: string;
  icon: LucideIcon;
}

interface SectionGroup {
  /** When set, renders a small uppercase divider above the items. */
  label: string | null;
  items: SectionEntry[];
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    label: null,
    items: [
      { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Models",
    items: [
      { id: "llm", label: "LLM", icon: Brain },
      { id: "embedding", label: "Embedding", icon: Database },
      { id: "search", label: "Search", icon: Search },
    ],
  },
  {
    label: "Defaults",
    items: [
      { id: "chat-defaults", label: "Chat", icon: MessageSquare },
      { id: "knowledge-defaults", label: "Knowledge", icon: BookOpen },
      { id: "reading", label: "Reading", icon: BookText },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "notebook-prefs", label: "Notebook", icon: NotebookPen },
      { id: "memory-prefs", label: "Memory", icon: Sparkles },
      { id: "skills-prefs", label: "Skills", icon: Wand2 },
    ],
  },
  {
    label: "Advanced",
    items: [
      { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
      { id: "about", label: "About", icon: Info },
    ],
  },
];

const ALL_SECTIONS: SectionEntry[] = SECTION_GROUPS.flatMap((g) => g.items);

const SERVICE_SECTIONS = new Set<Section>(["llm", "embedding", "search"]);

/** Sections that have a real UI today; others render a Coming-soon placeholder. */
const IMPLEMENTED_SECTIONS = new Set<Section>([
  "preferences",
  "llm",
  "embedding",
  "search",
]);

type LanguageCode = "en" | "zh";

interface LanguageOption {
  value: LanguageCode;
  /** Endonym — show each language's name in its own script. */
  label: string;
}

const LANGUAGES: LanguageOption[] = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
];

function PlaceholderSection({
  section,
  entry,
}: {
  section: Section;
  entry: SectionEntry;
}) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={entry.icon}
      title={t(entry.label)}
      description={t(`settings.placeholder.${section}`)}
      action={
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          {t("Coming soon")}
        </span>
      }
    />
  );
}

function SectionsNav({
  activeSection,
  onSelect,
  status,
}: {
  activeSection: Section;
  onSelect: (section: Section) => void;
  status: SystemStatus | null;
}) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("Settings sections")} className="px-1 pt-1">
      {SECTION_GROUPS.map((group, groupIndex) => (
        <div
          key={group.label ?? `group-${groupIndex}`}
          className={groupIndex > 0 ? "mt-3" : undefined}
        >
          {group.label && (
            <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]/70">
              {t(group.label)}
            </div>
          )}
          <div className="space-y-0.5">
            {group.items.map(({ id, label, icon: Icon }) => {
              const active = activeSection === id;
              const isService =
                id === "llm" || id === "embedding" || id === "search";
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  aria-current={active ? "page" : undefined}
                  data-onboarding={isService ? `nav-${id}` : undefined}
                  className={`group flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                    active
                      ? "border-[var(--primary)]/40 bg-[var(--primary)]/8"
                      : "border-transparent hover:border-[var(--border)] hover:bg-[var(--muted)]/40"
                  }`}
                >
                  <Icon
                    size={14}
                    strokeWidth={active ? 2 : 1.6}
                    className={`shrink-0 ${
                      active
                        ? "text-[var(--foreground)]"
                        : "text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]"
                    }`}
                    aria-hidden
                  />
                  <span className="flex-1 truncate text-[13px] font-medium leading-tight text-[var(--foreground)]">
                    {t(label)}
                  </span>
                  {isService ? (
                    <span
                      className={`ml-auto inline-block h-1.5 w-1.5 shrink-0 rounded-full ${serviceHealthDot(id as ServiceName, status)}`}
                      title={serviceHealthLabel(id as ServiceName, status, t)}
                      aria-label={serviceHealthLabel(id as ServiceName, status, t)}
                    />
                  ) : !IMPLEMENTED_SECTIONS.has(id) ? (
                    <span
                      className="ml-auto rounded-full bg-[var(--muted)]/70 px-1.5 py-px text-[9px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]/80"
                      title={t("Coming soon")}
                    >
                      {t("Soon")}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SectionsNavCollapsed({
  activeSection,
  onSelect,
  status,
}: {
  activeSection: Section;
  onSelect: (section: Section) => void;
  status: SystemStatus | null;
}) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("Settings sections")}
      className="flex h-full flex-col items-center gap-1 py-2"
    >
      {ALL_SECTIONS.map(({ id, label, icon: Icon }) => {
        const active = activeSection === id;
        const isService =
          id === "llm" || id === "embedding" || id === "search";
        const isWip = !IMPLEMENTED_SECTIONS.has(id);
        const tooltip = isService
          ? `${t(label)} · ${serviceHealthLabel(id as ServiceName, status, t)}`
          : isWip
            ? `${t(label)} · ${t("Coming soon")}`
            : t(label);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            title={tooltip}
            aria-label={tooltip}
            aria-current={active ? "page" : undefined}
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              active
                ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--foreground)]"
                : isWip
                  ? "border-transparent text-[var(--muted-foreground)]/50 hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]"
            }`}
          >
            <Icon size={14} strokeWidth={active ? 2 : 1.6} aria-hidden />
            {isService && (
              <span
                className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-[var(--card)] ${serviceHealthDot(id as ServiceName, status)}`}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════

function SettingsPageContent() {
  const { t } = useTranslation();
  const confirm = useConfirm();

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const [catalog, setCatalog] = useState<Catalog>(defaultCatalog());
  const [draft, setDraft] = useState<Catalog>(defaultCatalog());
  // Snapshot of the catalog at the moment of the most recent /apply (or
  // initial bootstrap, since startup state == what's currently in .env).
  // Drives the "N changes pending" banner — diffs against `catalog`, not
  // `draft`, because auto-save lands in catalog before Apply is clicked.
  const [appliedCatalog, setAppliedCatalog] =
    useState<Catalog>(defaultCatalog());
  const [lastAppliedAt, setLastAppliedAt] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("preferences");
  const [activeService, setActiveService] = useState<ServiceName>("llm");
  const [logs, setLogs] = useState<string>("Waiting for test run...");
  const [testRunning, setTestRunning] = useState<ServiceName | null>(null);
  // The "Run test" block keeps a status banner per the active service. We
  // reset all three when activeService changes so a stale banner from one
  // service doesn't bleed into another.
  const [testStatus, setTestStatus] = useState<
    "idle" | "running" | "success" | "failed"
  >("idle");
  const [testSummary, setTestSummary] = useState<string>("");
  const [testCompletedAt, setTestCompletedAt] = useState<number | null>(null);
  const [logsOpen, setLogsOpen] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [providers, setProviders] = useState<
    Record<ServiceName, ProviderOption[]>
  >({ llm: [], embedding: [], search: [] });
  // Most-recent capabilities snapshot from the embedding test run. Cleared
  // when the user kicks off another run, populated when the backend emits
  // the `capabilities` SSE event. Drives the source badge + "Detected: Xd"
  // affordance.
  const [embeddingCapabilities, setEmbeddingCapabilities] =
    useState<EmbeddingCapabilities | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Tour-specific state
  const [tourGuideStep, setTourGuideStep] = useState(-1);

  // -- Data loading -------------------------------------------------------

  useEffect(() => {
    const load = async () => {
      const settingsResponse = await fetch(apiUrl("/api/v1/settings"));
      const settingsPayload =
        (await settingsResponse.json()) as SettingsPayload;
      setCatalog(settingsPayload.catalog);
      setDraft(cloneCatalog(settingsPayload.catalog));
      setAppliedCatalog(cloneCatalog(settingsPayload.catalog));
      setTheme(settingsPayload.ui.theme);
      setLanguage(settingsPayload.ui.language);
      if (settingsPayload.providers) setProviders(settingsPayload.providers);

      const statusResponse = await fetch(apiUrl("/api/v1/system/status"));
      const statusPayload = (await statusResponse.json()) as SystemStatus;
      setStatus(statusPayload);
    };
    load();
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);


  // Reset stale ``embeddingCapabilities`` whenever the active embedding
  // profile or model changes. Without this, a 4096d detection on profile A
  // bleeds into profile B's "Detected: …" affordance after a switch.
  useEffect(() => {
    setEmbeddingCapabilities(null);
  }, [
    draft.services.embedding.active_profile_id,
    draft.services.embedding.active_model_id,
  ]);

  // Switching service tabs OR active profile clears the previous run's
  // banner + log buffer so the next view starts blank instead of showing
  // a stale result tied to a different (service, profile) pair.
  useEffect(() => {
    setTestStatus("idle");
    setTestSummary("");
    setTestCompletedAt(null);
    setLogs("Waiting for test run...");
  }, [
    activeService,
    draft.services.llm.active_profile_id,
    draft.services.embedding.active_profile_id,
    draft.services.search.active_profile_id,
  ]);

  const selectSection = useCallback((section: Section) => {
    setActiveSection(section);
    if (SERVICE_SECTIONS.has(section)) {
      setActiveService(section as ServiceName);
    }
  }, []);

  // -- Derived ------------------------------------------------------------

  const activeProfile = getActiveProfile(draft, activeService);
  const activeModel = getActiveModel(draft, activeService);
  const pendingChangeCount = useMemo(
    () => countDiffs(catalog, appliedCatalog),
    [catalog, appliedCatalog],
  );
  const searchProviderRaw =
    activeService === "search"
      ? (activeProfile?.provider || "").trim().toLowerCase()
      : "";
  const showSearchProviderWarning =
    activeService === "search" && Boolean(searchProviderRaw);
  const isDeprecatedSearchProvider =
    deprecatedSearchProviders.has(searchProviderRaw);
  const isSupportedSearchProvider = supportedSearchProviders.includes(
    searchProviderRaw as (typeof supportedSearchProviders)[number],
  );
  const isPerplexityMissingKey =
    activeService === "search" &&
    searchProviderRaw === "perplexity" &&
    !String(activeProfile?.api_key || "").trim();

  useEffect(() => {
    setShowApiKey(false);
  }, [activeService, activeProfile?.id]);

  // -- UI preference helpers ----------------------------------------------

  const persistUi = async (
    nextTheme: "light" | "dark",
    nextLanguage: "en" | "zh",
  ) => {
    await fetch(apiUrl("/api/v1/settings/ui"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: nextTheme, language: nextLanguage }),
    });
  };

  const updateTheme = async (nextTheme: "light" | "dark") => {
    setTheme(nextTheme);
    applyThemePreference(nextTheme);
    await persistUi(nextTheme, language);
  };

  const updateLanguage = async (nextLanguage: "en" | "zh") => {
    setLanguage(nextLanguage);
    writeStoredLanguage(nextLanguage);
    await persistUi(theme, nextLanguage);
  };

  // -- Catalog mutations --------------------------------------------------

  const mutateCatalog = (mutator: (next: Catalog) => void) => {
    setDraft((current) => {
      const next = cloneCatalog(current);
      mutator(next);
      return next;
    });
  };

  const embeddingDefaultDim = (binding?: string) => {
    const match = (providers.embedding || []).find(
      (p) => p.value === (binding || "openai"),
    );
    return match?.default_dim || "3072";
  };

  const addProfile = () => {
    mutateCatalog((next) => {
      const service = next.services[activeService];
      const profileId = `${activeService}-profile-${Date.now()}`;
      const profile: CatalogProfile = {
        id: profileId,
        name: "New Profile",
        binding: activeService === "search" ? undefined : "openai",
        provider: activeService === "search" ? "brave" : undefined,
        base_url: "",
        api_key: "",
        api_version: "",
        extra_headers: activeService === "search" ? undefined : {},
        proxy: activeService === "search" ? "" : undefined,
        models: [],
      };
      if (activeService !== "search") {
        const modelId = `${activeService}-model-${Date.now()}`;
        profile.models.push({
          id: modelId,
          name: "New Model",
          model: "",
          ...(activeService === "embedding"
            ? { dimension: embeddingDefaultDim(), send_dimensions: true }
            : {}),
        });
        service.active_model_id = modelId;
      }
      service.profiles.push(profile);
      service.active_profile_id = profileId;
    });
  };

  const removeActiveProfile = () => {
    mutateCatalog((next) => {
      const service = next.services[activeService];
      service.profiles = service.profiles.filter(
        (profile) => profile.id !== service.active_profile_id,
      );
      service.active_profile_id = service.profiles[0]?.id ?? null;
      if (activeService !== "search") {
        service.active_model_id = service.profiles[0]?.models?.[0]?.id ?? null;
      }
    });
  };

  const addModel = () => {
    if (activeService === "search") return;
    mutateCatalog((next) => {
      const service = next.services[activeService];
      const profile =
        service.profiles.find(
          (item) => item.id === service.active_profile_id,
        ) ?? null;
      if (!profile) return;
      const modelId = `${activeService}-model-${Date.now()}`;
      profile.models.push({
        id: modelId,
        name: "New Model",
        model: "",
        ...(activeService === "embedding"
          ? {
              dimension: embeddingDefaultDim(profile.binding),
              send_dimensions: true,
            }
          : {}),
      });
      service.active_model_id = modelId;
    });
  };

  const confirmDeleteProfile = async () => {
    if (!activeProfile) return;
    const modelCount = activeProfile.models?.length ?? 0;
    const ok = await confirm({
      title: t('Delete profile "{{name}}"?', { name: activeProfile.name }),
      description:
        activeService !== "search" && modelCount > 0
          ? t(
              "All {{count}} model(s) configured under this profile will be removed too. This cannot be undone.",
              { count: modelCount },
            )
          : t("This cannot be undone."),
      confirmLabel: t("Delete"),
      destructive: true,
    });
    if (!ok) return;
    removeActiveProfile();
  };

  const confirmDeleteModel = async (modelId: string) => {
    if (activeService === "search") return;
    const profileSnapshot = activeProfile;
    if (!profileSnapshot) return;
    const model = profileSnapshot.models.find((m) => m.id === modelId);
    if (!model) return;
    const ok = await confirm({
      title: t('Delete model "{{name}}"?', { name: model.name }),
      description: t("This cannot be undone."),
      confirmLabel: t("Delete"),
      destructive: true,
    });
    if (!ok) return;
    mutateCatalog((next) => {
      const svc = next.services[activeService];
      const p = svc.profiles.find((x) => x.id === profileSnapshot.id);
      if (!p) return;
      p.models = p.models.filter((m) => m.id !== modelId);
      if (svc.active_model_id === modelId) {
        svc.active_model_id = p.models[0]?.id ?? null;
      }
    });
  };

  const updateProfileField = (field: keyof CatalogProfile, value: string) => {
    mutateCatalog((next) => {
      const profile = getActiveProfile(next, activeService);
      if (!profile) return;
      (profile[field] as string | undefined) = value;
    });
  };

  const updateModelField = (field: keyof CatalogModel, value: string) => {
    if (activeService === "search") return;
    mutateCatalog((next) => {
      const model = getActiveModel(next, activeService);
      if (!model) return;
      (model[field] as string | undefined) = value;
    });
  };

  const updateContextWindowField = (value: string) => {
    if (activeService !== "llm") return;
    const normalized = value.replace(/[^\d]/g, "");
    mutateCatalog((next) => {
      const model = getActiveModel(next, activeService);
      if (!model) return;
      if (normalized) {
        model.context_window = normalized;
        model.context_window_source = "manual";
        delete model.context_window_detected_at;
      } else {
        delete model.context_window;
        delete model.context_window_source;
        delete model.context_window_detected_at;
      }
    });
  };

  const updateModelBoolField = (
    field: keyof CatalogModel,
    value: boolean,
  ) => {
    if (activeService === "search") return;
    mutateCatalog((next) => {
      const model = getActiveModel(next, activeService);
      if (!model) return;
      (model[field] as boolean | undefined) = value;
    });
  };

  // -- Save / Apply -------------------------------------------------------

  // Auto-save: writes the catalog draft to model_catalog.json when the user
  // pauses editing for 600 ms. The button to save manually is gone (D plan)
  // — the only persistence step the user has to think about is Apply.
  const saveCatalog = useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch(apiUrl("/api/v1/settings/catalog"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalog: draft }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      setCatalog(payload.catalog);
      // Don't overwrite `draft` — the user may still be typing. The next
      // `hasUnsavedChanges` recompute will collapse to false because the
      // baseline now matches the just-sent body.
    } catch (err) {
      toast.error(
        t("Auto-save failed: {{reason}}", {
          reason: err instanceof Error ? err.message : String(err),
        }),
      );
    } finally {
      setSaving(false);
    }
  }, [draft, t]);

  // Auto-save: debounce by 600ms so we don't PUT on every keystroke.
  // First mount: initial load sets catalog == draft so the effect
  // short-circuits — no spurious save on bootstrap.
  useEffect(() => {
    if (JSON.stringify(catalog) === JSON.stringify(draft)) return;
    const timer = setTimeout(() => {
      void saveCatalog();
    }, 600);
    return () => clearTimeout(timer);
  }, [draft, catalog, saveCatalog]);

  const applyCatalog = async () => {
    setApplying(true);
    try {
      const response = await fetch(apiUrl("/api/v1/settings/apply"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalog: draft }),
      });
      const payload = await response.json();
      setCatalog(payload.catalog);
      setDraft(cloneCatalog(payload.catalog));
      setAppliedCatalog(cloneCatalog(payload.catalog));
      setLastAppliedAt(Date.now());
      toast.success(t("Applied to .env"));
      const statusResponse = await fetch(apiUrl("/api/v1/system/status"));
      setStatus((await statusResponse.json()) as SystemStatus);
    } catch (err) {
      toast.error(
        t("Apply failed: {{reason}}", {
          reason: err instanceof Error ? err.message : String(err),
        }),
      );
    } finally {
      setApplying(false);
    }
  };

  // -- Diagnostics (existing single-service test) -------------------------

  const runDetailedTest = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setLogs(`Preparing ${activeService} diagnostics...\n`);
    setTestRunning(activeService);
    setTestStatus("running");
    setTestSummary("");
    setTestCompletedAt(null);
    setLogsOpen(true);
    if (activeService === "embedding") {
      setEmbeddingCapabilities(null);
    }
    try {
      const response = await fetch(
        apiUrl(`/api/v1/settings/tests/${activeService}/start`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ catalog: draft }),
        },
      );
      const payload = (await response.json()) as {
        run_id?: string;
        detail?: string;
      };
      if (!response.ok || !payload.run_id) {
        throw new Error(payload.detail || "Could not start diagnostics.");
      }
      const source = new EventSource(
        apiUrl(
          `/api/v1/settings/tests/${activeService}/${payload.run_id}/events`,
        ),
      );
      eventSourceRef.current = source;
      source.onmessage = (event) => {
        const entry = JSON.parse(event.data) as {
          type: string;
          message: string;
          catalog?: Catalog;
          detected_dim?: number;
          default_dim?: number;
          supported_dimensions?: number[];
          supports_variable_dimensions?: boolean;
          model_known?: boolean;
          active_dim?: number;
          active_dim_source?: string;
        };
        setLogs((current) => `${current}[${entry.type}] ${entry.message}\n`);
        if (entry.type === "capabilities") {
          setEmbeddingCapabilities({
            detected_dim: entry.detected_dim,
            default_dim: entry.default_dim,
            supported_dimensions: entry.supported_dimensions,
            supports_variable_dimensions: entry.supports_variable_dimensions,
            model_known: entry.model_known,
            active_dim: entry.active_dim,
            active_dim_source: entry.active_dim_source,
          });
        }
        if (entry.catalog) {
          setCatalog(entry.catalog);
          setDraft(cloneCatalog(entry.catalog));
        }
        if (entry.type === "completed" || entry.type === "failed") {
          source.close();
          eventSourceRef.current = null;
          setTestRunning(null);
          setTestCompletedAt(Date.now());
          if (entry.type === "completed") {
            setTestStatus("success");
            setTestSummary(
              buildTestSummary(activeService, draft, {
                detected_dim: entry.detected_dim,
                active_dim: entry.active_dim,
              }),
            );
            toast.success(entry.message);
          } else {
            setTestStatus("failed");
            setTestSummary(entry.message);
            toast.error(entry.message);
          }
        }
      };
      source.onerror = () => {
        source.close();
        eventSourceRef.current = null;
        setTestRunning(null);
        setTestStatus("failed");
        setTestSummary(t("Diagnostics stream disconnected"));
        setTestCompletedAt(Date.now());
        setLogs(
          (current) => `${current}[failed] Diagnostics stream disconnected.\n`,
        );
        toast.error(t("Diagnostics stream disconnected"));
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not start diagnostics.";
      setLogs((current) => `${current}[failed] ${message}\n`);
      setTestStatus("failed");
      setTestSummary(message);
      setTestCompletedAt(Date.now());
      toast.error(message);
      setTestRunning(null);
    }
  };

  // -- Tour ---------------------------------------------------------------

  const runTour = useCallback(() => {
    setTourGuideStep(0);
  }, []);

  const tourSteps = useMemo<OnboardingStep[]>(
    () => [
      {
        target: '[data-onboarding="nav-llm"]',
        title: t("settingsTour.pickService.title"),
        description: t("settingsTour.pickService.desc"),
        prepare: () => selectSection("llm"),
        placement: "bottom",
      },
      {
        target: '[data-onboarding="add-profile"]',
        title: t("settingsTour.addProfile.title"),
        description: t("settingsTour.addProfile.desc"),
        prepare: () => selectSection("llm"),
      },
      {
        target: '[data-onboarding="run-test"]',
        title: t("settingsTour.runTest.title"),
        description: t("settingsTour.runTest.desc"),
        prepare: () => selectSection("llm"),
      },
      {
        target: '[data-onboarding="apply"]',
        title: t("settingsTour.apply.title"),
        description: t("settingsTour.apply.desc"),
        placement: "top",
      },
    ],
    [t, selectSection],
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <RouteFrame>
      <ListPane
        id="settings-sections"
        title={t("Settings")}
        collapsedContent={
          <SectionsNavCollapsed
            activeSection={activeSection}
            onSelect={selectSection}
            status={status}
          />
        }
      >
        <div className="flex min-h-full flex-col">
          <SectionsNav
            activeSection={activeSection}
            onSelect={selectSection}
            status={status}
          />
          <div className="mt-auto px-1 pt-4">
            <div
              className="flex items-center gap-1.5 rounded-md bg-[var(--muted)]/30 px-2 py-1 text-[11px] text-[var(--muted-foreground)]"
              title={
                status?.backend.status === "online"
                  ? t("Backend online")
                  : t("Backend offline")
              }
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${statusDotClass(status?.backend.status === "online", false)}`}
                aria-hidden
              />
              <span>{t("Backend")}</span>
              <span className="ml-auto">
                {status?.backend.status === "online"
                  ? t("online")
                  : t("offline")}
              </span>
            </div>
          </div>
        </div>
      </ListPane>
      <section
        aria-label="Settings content"
        className="relative flex flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]"
      >
      <div className="mx-auto w-full max-w-[960px] flex-1 px-6 py-8">
        {activeSection === "preferences" && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center justify-between gap-6 px-5 py-4">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[var(--foreground)]">
                  {t("Theme")}
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
                  {t("Use a light or dark color scheme.")}
                </p>
              </div>
              <div className="flex shrink-0 gap-0.5 rounded-lg bg-[var(--muted)] p-0.5">
                {(
                  [
                    { value: "light", icon: Sun, label: t("Light") },
                    { value: "dark", icon: Moon, label: t("Dark") },
                  ] as const
                ).map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateTheme(value)}
                    title={label}
                    aria-label={label}
                    aria-pressed={theme === value}
                    className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                      theme === value
                        ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-6 border-t border-[var(--border)] px-5 py-4">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[var(--foreground)]">
                  {t("Language")}
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
                  {t("Display language for the interface.")}
                </p>
              </div>
              <Select
                value={language}
                onValueChange={(v) => updateLanguage(v as LanguageCode)}
              >
                <SelectTrigger className="w-[160px]" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center justify-between gap-6 px-5 py-4">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[var(--foreground)]">
                  {t("Settings tour")}
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
                  {t(
                    "A quick spotlight walk-through of how to wire up models and apply changes.",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={runTour}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[12px] text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
              >
                <Rocket className="h-3 w-3" />
                {t("Start tour")}
              </button>
            </div>
          </div>
        </div>
        )}

        {!IMPLEMENTED_SECTIONS.has(activeSection) && (
          <PlaceholderSection
            section={activeSection}
            entry={
              ALL_SECTIONS.find((s) => s.id === activeSection) ??
              ALL_SECTIONS[0]
            }
          />
        )}

        {SERVICE_SECTIONS.has(activeSection) && (
        <>
        {/* ── Service Configuration ── */}
        <div className="mb-8">
          <div className="mb-5 flex items-center gap-2">
            <h2 className="text-[16px] font-semibold text-[var(--foreground)]">
              {t(activeService === "llm"
                ? "LLM"
                : activeService === "embedding"
                  ? "Embedding"
                  : "Search")}
            </h2>
            <span
              data-tour={`tour-${activeService}`}
              className={`inline-block h-2 w-2 rounded-full ${effectiveServiceHealthDot(activeService, status, testStatus)}`}
              title={effectiveServiceHealthLabel(activeService, status, testStatus, t)}
              aria-label={effectiveServiceHealthLabel(activeService, status, testStatus, t)}
            />
            {activeService === "llm" && <LlmProviderHelp />}
            {activeService === "embedding" && <EmbeddingProviderHelp />}
            {activeService === "search" && <SearchProviderHelp />}
          </div>

          {activeProfile ? (
            <div className="grid grid-cols-[200px_1fr] gap-5">
              {/* ── Profile list ── */}
              <div className="space-y-1">
                {draft.services[activeService].profiles.map((profile) => {
                  const isActive =
                    profile.id ===
                    draft.services[activeService].active_profile_id;
                  return (
                  <button
                    key={profile.id}
                    onClick={() =>
                      mutateCatalog((next) => {
                        next.services[activeService].active_profile_id =
                          profile.id;
                        if (activeService !== "search") {
                          next.services[activeService].active_model_id =
                            profile.models[0]?.id ?? null;
                        }
                      })
                    }
                    aria-pressed={isActive}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? "bg-[var(--muted)] text-[var(--foreground)]"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium">
                          {profile.name}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-[var(--muted-foreground)]">
                          {profile.base_url || t("No endpoint")}
                        </div>
                      </div>
                      {isActive && (
                        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                          <Check className="h-2.5 w-2.5" aria-hidden />
                          {t("In use")}
                        </span>
                      )}
                    </div>
                  </button>
                  );
                })}
                <button
                  type="button"
                  data-onboarding="add-profile"
                  onClick={addProfile}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-[12px] text-[var(--muted-foreground)] transition-colors hover:border-[var(--foreground)]/40 hover:bg-[var(--muted)]/40 hover:text-[var(--foreground)]"
                >
                  <Plus className="h-3 w-3" />
                  {t("Add profile")}
                </button>
              </div>

              {/* ── Editor ── */}
              <div className="space-y-5">
                <div className="rounded-xl border border-[var(--border)] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="text-[13px] font-medium text-[var(--foreground)]">
                      {t("Profile")}
                    </span>
                    <button
                      type="button"
                      onClick={() => void confirmDeleteProfile()}
                      disabled={!activeProfile}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[var(--muted-foreground)] transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
                      title={
                        activeProfile
                          ? t('Delete profile "{{name}}"', {
                              name: activeProfile.name,
                            })
                          : t("Delete profile")
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                      {activeProfile
                        ? t('Delete "{{name}}"', { name: activeProfile.name })
                        : t("Delete profile")}
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-1.5 text-[12px] text-[var(--muted-foreground)]">
                        {t("Name")}
                      </div>
                      <input
                        className={inputClass}
                        value={activeProfile.name}
                        onChange={(e) =>
                          updateProfileField("name", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <div className="mb-1.5 text-[12px] text-[var(--muted-foreground)]">
                        {t("Provider")}
                      </div>
                      <div className="relative">
                        <select
                          className={selectClass}
                          value={
                            activeService === "search"
                              ? activeProfile.provider || ""
                              : activeProfile.binding || ""
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            const field =
                              activeService === "search"
                                ? "provider"
                                : "binding";
                            updateProfileField(field, val);
                            const match = (providers[activeService] || []).find(
                              (p) => p.value === val,
                            );
                            if (match?.base_url) {
                              updateProfileField("base_url", match.base_url);
                            }
                            if (
                              activeService === "embedding" &&
                              match?.default_dim
                            ) {
                              updateModelField("dimension", match.default_dim);
                            }
                          }}
                        >
                          <option value="">{t("Select provider...")}</option>
                          {(providers[activeService] || []).map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                      </div>
                      {showSearchProviderWarning && (
                        <p
                          className={`mt-1.5 text-[11px] ${
                            isSupportedSearchProvider
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isDeprecatedSearchProvider
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-500"
                          }`}
                        >
                          {isSupportedSearchProvider
                            ? isPerplexityMissingKey
                              ? t(
                                  "Perplexity requires API key. It will fail hard without credentials.",
                                )
                              : t("Supported provider.")
                            : isDeprecatedSearchProvider
                              ? t(
                                  "Deprecated provider. Switch to brave/tavily/jina/searxng/duckduckgo/perplexity.",
                                )
                              : t(
                                  "Unsupported provider. Use brave/tavily/jina/searxng/duckduckgo/perplexity.",
                                )}
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <div className="mb-1.5 text-[12px] text-[var(--muted-foreground)]">
                        {activeService === "embedding"
                          ? t("Endpoint URL")
                          : t("Base URL")}
                      </div>
                      <input
                        className={inputClass}
                        value={activeProfile.base_url}
                        onChange={(e) =>
                          updateProfileField("base_url", e.target.value)
                        }
                        placeholder={
                          activeService === "embedding"
                            ? "https://api.openai.com/v1/embeddings"
                            : "https://api.openai.com/v1"
                        }
                      />
                      {activeService === "embedding" && (
                        <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">
                          {t(
                            "Embedding requests are sent to this URL exactly; DeepTutor does not append /embeddings or /api/embed at request time.",
                          )}
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <div className="mb-1.5 text-[12px] text-[var(--muted-foreground)]">
                        {t("API Key")}
                      </div>
                      <div className="relative">
                        <input
                          type={showApiKey ? "text" : "password"}
                          autoComplete="new-password"
                          spellCheck={false}
                          className={`${inputClass} pr-10 font-mono`}
                          value={activeProfile.api_key}
                          onChange={(e) =>
                            updateProfileField("api_key", e.target.value)
                          }
                          placeholder="sk-..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey((prev) => !prev)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                          aria-label={
                            showApiKey ? t("Hide API key") : t("Show API key")
                          }
                          title={
                            showApiKey ? t("Hide API key") : t("Show API key")
                          }
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {(() => {
                        if (activeService !== "search") return null;
                        const provider = (
                          activeProfile.provider || ""
                        )
                          .trim()
                          .toLowerCase();
                        const key = (activeProfile.api_key || "").trim();
                        if (!key) return null;
                        const expected: Record<string, string> = {
                          brave: "BSA",
                          tavily: "tvly-",
                          jina: "jina_",
                          perplexity: "pplx-",
                        };
                        const prefix = expected[provider];
                        if (!prefix || key.startsWith(prefix)) return null;
                        return (
                          <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                            {t(
                              "This key doesn't look like a {{provider}} key (expected to start with {{prefix}}…).",
                              { provider, prefix },
                            )}
                          </p>
                        );
                      })()}
                    </div>
                    <div>
                      <div className="mb-1.5 text-[12px] text-[var(--muted-foreground)]">
                        {t("API Version")}
                      </div>
                      <input
                        className={inputClass}
                        value={activeProfile.api_version}
                        onChange={(e) =>
                          updateProfileField("api_version", e.target.value)
                        }
                        placeholder={t("Optional")}
                      />
                    </div>
                    {activeService === "search" ? (
                      <div>
                        <div className="mb-1.5 text-[12px] text-[var(--muted-foreground)]">
                          {t("Proxy")}
                        </div>
                        <input
                          className={inputClass}
                          value={activeProfile.proxy || ""}
                          onChange={(e) =>
                            updateProfileField("proxy", e.target.value)
                          }
                          placeholder="http://127.0.0.1:7890 (optional)"
                        />
                      </div>
                    ) : (
                      <div className="sm:col-span-2">
                        <div className="mb-1.5 text-[12px] text-[var(--muted-foreground)]">
                          {t("Extra Headers (JSON)")}
                        </div>
                        <textarea
                          className={`${inputClass} min-h-[84px] resize-y`}
                          value={stringifyExtraHeaders(
                            activeProfile.extra_headers,
                          )}
                          onChange={(e) =>
                            updateProfileField("extra_headers", e.target.value)
                          }
                          placeholder='{"APP-Code":"your-app-code"}'
                        />
                      </div>
                    )}
                  </div>
                </div>

                {activeService !== "search" && (
                  <div className="rounded-xl border border-[var(--border)] p-5">
                    <div className="mb-3 text-[13px] font-medium text-[var(--foreground)]">
                      {t("Models")}
                    </div>
                    <div className="space-y-2">
                      {activeProfile.models.map((model) => {
                        const isOpen =
                          model.id ===
                          draft.services[activeService].active_model_id;
                        return (
                          <div
                            key={model.id}
                            className={`overflow-hidden rounded-lg border transition-colors ${
                              isOpen
                                ? "border-[var(--primary)]/40 bg-[var(--card)]"
                                : "border-[var(--border)]/60 bg-[var(--card)]/30"
                            }`}
                          >
                            <div
                              className={`group flex items-center gap-2 px-3 py-2 ${
                                isOpen ? "" : "cursor-pointer hover:bg-[var(--muted)]/40"
                              }`}
                              onClick={() => {
                                if (!isOpen)
                                  mutateCatalog((next) => {
                                    next.services[activeService].active_model_id =
                                      model.id;
                                  });
                              }}
                            >
                              <ChevronRight
                                className={`h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)] transition-transform ${
                                  isOpen ? "rotate-90" : ""
                                }`}
                                aria-hidden
                              />
                              <span className="truncate text-[13px] font-medium text-[var(--foreground)]">
                                {model.name}
                              </span>
                              {model.model && (
                                <span className="truncate font-mono text-[11px] text-[var(--muted-foreground)]">
                                  {model.model}
                                </span>
                              )}
                              {isOpen && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                  <Check className="h-2.5 w-2.5" aria-hidden />
                                  {t("In use")}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void confirmDeleteModel(model.id);
                                }}
                                title={t('Delete model "{{name}}"', {
                                  name: model.name,
                                })}
                                aria-label={t('Delete model "{{name}}"', {
                                  name: model.name,
                                })}
                                className="ml-auto rounded p-1 text-[var(--muted-foreground)]/60 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            {isOpen && (
                              <div className="border-t border-[var(--border)]/60 p-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div>
                                    <div className="mb-1.5 text-[12px] text-[var(--muted-foreground)]">
                                      {t("Label")}
                                    </div>
                                    <input
                                      className={inputClass}
                                      value={model.name}
                                      onChange={(e) =>
                                        updateModelField("name", e.target.value)
                                      }
                                    />
                                  </div>
                                  <div>
                                    <div className="mb-1.5 text-[12px] text-[var(--muted-foreground)]">
                                      {t("Model ID")}
                                    </div>
                                    <input
                                      className={inputClass}
                                      value={model.model}
                                      onChange={(e) =>
                                        updateModelField("model", e.target.value)
                                      }
                                      placeholder="gpt-4o"
                                    />
                                  </div>
                                  {activeService === "llm" && (
                                    <>
                                      <div>
                                        <div className="mb-1.5 text-[12px] text-[var(--muted-foreground)]">
                                          {t("Context Window")}
                                        </div>
                                        <input
                                          className={inputClass}
                                          inputMode="numeric"
                                          value={model.context_window || ""}
                                          onChange={(e) =>
                                            updateContextWindowField(
                                              e.target.value,
                                            )
                                          }
                                          placeholder="65536"
                                        />
                                      </div>
                                      <div className="rounded-xl border border-[var(--border)]/70 bg-[var(--muted)]/30 px-3.5 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]/70">
                                            {t("Source")}
                                          </div>
                                          <span className="rounded-full border border-[var(--border)]/70 bg-[var(--card)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)]">
                                            {formatContextWindowSource(
                                              model.context_window_source,
                                              t,
                                            )}
                                          </span>
                                        </div>
                                        <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                                          {model.context_window_source ===
                                          "metadata"
                                            ? t(
                                                "Detected from the provider during the latest LLM test and saved into model_catalog.json.",
                                              )
                                            : model.context_window_source ===
                                                "default"
                                              ? t(
                                                  "The provider did not expose a context window, so the runtime fallback was saved during the latest LLM test.",
                                                )
                                              : model.context_window_source ===
                                                  "manual"
                                                ? t(
                                                    "Manual override from Settings. Auto-saves once you stop typing.",
                                                  )
                                                : t(
                                                    "Run the LLM test to auto-fill this field, or enter a value manually.",
                                                  )}
                                        </p>
                                        {model.context_window_detected_at && (
                                          <div className="mt-2 text-[11px] text-[var(--muted-foreground)]/70">
                                            {t("Detected at")}:{" "}
                                            {formatContextWindowUpdatedAt(
                                              model.context_window_detected_at,
                                              language,
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                  {activeService === "embedding" && (
                                    <div>
                                      <div className="mb-1.5 flex items-center justify-between gap-2">
                                        <span className="text-[12px] text-[var(--muted-foreground)]">
                                          {t("Dimension")}
                                        </span>
                                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] select-none">
                                          <input
                                            type="checkbox"
                                            className="h-3 w-3 cursor-pointer accent-[var(--foreground)]"
                                            checked={
                                              model.send_dimensions !== false
                                            }
                                            onChange={(e) =>
                                              updateModelBoolField(
                                                "send_dimensions",
                                                e.target.checked,
                                              )
                                            }
                                          />
                                          <span>{t("Send dimensions")}</span>
                                          <span
                                            tabIndex={0}
                                            className="group/info relative inline-flex cursor-help focus:outline-none"
                                          >
                                            <Info className="h-3 w-3 opacity-50 transition-opacity group-hover/info:opacity-100 group-focus/info:opacity-100" />
                                            <span
                                              role="tooltip"
                                              className="pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 w-64 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2.5 text-[11px] leading-relaxed text-[var(--foreground)] opacity-0 shadow-lg transition-opacity duration-75 group-hover/info:opacity-100 group-focus/info:opacity-100"
                                            >
                                              {t(
                                                "Some embedding models (e.g. Qwen text-embedding-v4) reject the `dimensions` request param. Turn this off if your provider returns HTTP 400.",
                                              )}
                                            </span>
                                          </span>
                                        </label>
                                      </div>
                                      <DimensionField
                                        activeModel={model}
                                        activeBinding={activeProfile?.binding}
                                        capabilities={embeddingCapabilities}
                                        embeddingDefaultDim={embeddingDefaultDim}
                                        inputClass={inputClass}
                                        onChangeDimension={(value) =>
                                          updateModelField("dimension", value)
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={addModel}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-[12px] text-[var(--muted-foreground)] transition-colors hover:border-[var(--foreground)]/40 hover:bg-[var(--muted)]/40 hover:text-[var(--foreground)]"
                      >
                        <Plus className="h-3 w-3" />
                        {t("Add model")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] py-12 text-center text-[13px] text-[var(--muted-foreground)]">
              {t("No profiles configured. Add a profile to start.")}
            </div>
          )}

          {/* ── Run test (per-service) ── */}
          {activeProfile && (
            <div
              data-onboarding="run-test"
              className="mt-6 overflow-hidden rounded-xl border border-[var(--border)]"
            >
              <div
                className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors ${
                  testStatus === "success"
                    ? "bg-emerald-500/10"
                    : testStatus === "failed"
                      ? "bg-red-500/10"
                      : testStatus === "running"
                        ? "bg-sky-500/10"
                        : "bg-[var(--card)]/40"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {testStatus === "running" ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-500" />
                  ) : testStatus === "success" ? (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-500"
                      aria-hidden
                    />
                  ) : testStatus === "failed" ? (
                    <XCircle
                      className="h-4 w-4 shrink-0 text-red-500"
                      aria-hidden
                    />
                  ) : (
                    <CircleDashed
                      className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]"
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[var(--foreground)]">
                      {testStatus === "running"
                        ? t("Running test…")
                        : testStatus === "success"
                          ? t("Test passed")
                          : testStatus === "failed"
                            ? t("Test failed")
                            : t("Run test")}
                    </div>
                    {(() => {
                      const idleSummary =
                        testStatus === "idle" && !testCompletedAt
                          ? buildTestSummary(activeService, draft, {
                              detected_dim: embeddingCapabilities?.detected_dim,
                              active_dim: embeddingCapabilities?.active_dim,
                            })
                          : null;
                      const summary = testSummary || idleSummary;
                      return summary || testCompletedAt ? (
                        <div className="mt-0.5 truncate text-[11px] text-[var(--muted-foreground)]">
                          {idleSummary && (
                            <span className="font-medium text-[var(--foreground)]/70">
                              {t("In use")}:{" "}
                            </span>
                          )}
                          {summary && <span>{summary}</span>}
                          {summary && testCompletedAt && (
                            <span className="px-1 opacity-50">·</span>
                          )}
                          {testCompletedAt && (
                            <span>{formatTimeAgo(testCompletedAt, language)}</span>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
                <button
                  type="button"
                  data-tour="tour-run-test"
                  onClick={() => runDetailedTest()}
                  disabled={testRunning !== null}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] disabled:opacity-40"
                >
                  {serviceIcon(activeService)}
                  {testStatus === "idle" ? t("Run") : t("Run again")}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setLogsOpen((v) => !v)}
                aria-expanded={logsOpen}
                className="flex w-full items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-2 text-[12px] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]/40"
              >
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-3 w-3" aria-hidden />
                  {t("Logs")}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${logsOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {logsOpen && (
                <pre className="max-h-[320px] overflow-y-auto border-t border-[var(--border)] bg-[#0f0f0f] p-4 font-mono text-[12px] leading-6 dark:bg-[#0a0a0a]">
                  {logs.split("\n").map((line, i) => (
                    <div key={i} className={logLineClass(line)}>
                      {line || " "}
                    </div>
                  ))}
                </pre>
              )}
            </div>
          )}
        </div>
        </>
        )}

        {/* ── Footer note ── */}
        <p className="mt-2 pb-4 text-[11px] leading-relaxed text-[var(--muted-foreground)]/40">
          {t("settings.configNote")}
        </p>
      </div>

      {/* ── Sticky Apply bar (P1) ── */}
      <div className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-[var(--card)] shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex w-full max-w-[960px] items-center justify-between gap-3 px-6 py-3">
          <div className="min-w-0 text-[12px] text-[var(--muted-foreground)]">
            {pendingChangeCount > 0 ? (
              <span>
                <span className="font-medium text-[var(--foreground)]">
                  {pendingChangeCount}
                </span>{" "}
                {t("change(s) pending", { count: pendingChangeCount })}
                {saving && (
                  <span className="ml-2 text-[var(--muted-foreground)]/70">
                    · {t("Saving…")}
                  </span>
                )}
              </span>
            ) : (
              <span>
                {t("All changes applied")}
                {lastAppliedAt && (
                  <span className="ml-1 text-[var(--muted-foreground)]/70">
                    · {formatTimeAgo(lastAppliedAt, language)}
                  </span>
                )}
              </span>
            )}
          </div>
          <button
            type="button"
            data-onboarding="apply"
            onClick={applyCatalog}
            disabled={
              applying || saving || pendingChangeCount === 0
            }
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3 py-1.5 text-[12px] font-medium text-[var(--background)] transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {applying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Wand2 className="h-3 w-3" />
            )}
            {t("Apply")}
          </button>
        </div>
      </div>
      </section>

      <Onboarding
        steps={tourSteps}
        stepIndex={tourGuideStep}
        onAdvance={() => {
          if (tourGuideStep < tourSteps.length - 1) {
            setTourGuideStep((s) => s + 1);
          } else {
            setTourGuideStep(-1);
          }
        }}
        onSkip={() => setTourGuideStep(-1)}
        labels={{
          next: t("Next"),
          done: t("Got it"),
          skip: t("Skip tour"),
        }}
      />
    </RouteFrame>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-[13px] text-[var(--muted-foreground)]">
          {t("Loading settings...")}
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
