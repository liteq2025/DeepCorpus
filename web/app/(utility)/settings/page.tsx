/* eslint-disable i18n/no-literal-ui-text */
"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  Brain,
  ChevronDown,
  Database,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Plus,
  Rocket,
  Search,
  SlidersHorizontal,
  Terminal,
  Trash2,
  Wand2,
  type LucideIcon,
} from "lucide-react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ListPane, RouteFrame } from "@/components/layout";
import { writeStoredLanguage } from "@/context/app-shell-storage";
import { apiUrl } from "@/lib/api";
import { setTheme as applyThemePreference } from "@/lib/theme";
import {
  TOUR_GUIDE_STEPS,
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
import { SpotlightOverlay } from "@/components/settings/SpotlightOverlay";

function serviceIcon(service: ServiceName) {
  if (service === "llm") return <Brain className="h-3.5 w-3.5" />;
  if (service === "embedding") return <Database className="h-3.5 w-3.5" />;
  return <Search className="h-3.5 w-3.5" />;
}

type Section = "preferences" | "llm" | "embedding" | "search";

interface SectionEntry {
  id: Section;
  label: string;
  icon: LucideIcon;
}

const SECTIONS: SectionEntry[] = [
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "llm", label: "LLM", icon: Brain },
  { id: "embedding", label: "Embedding", icon: Database },
  { id: "search", label: "Search", icon: Search },
];

const SERVICE_SECTIONS = new Set<Section>(["llm", "embedding", "search"]);

function SectionsNav({
  activeSection,
  onSelect,
}: {
  activeSection: Section;
  onSelect: (section: Section) => void;
}) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("Settings sections")} className="space-y-0.5 px-1 pt-1">
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const active = activeSection === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={active ? "page" : undefined}
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
            <span className="truncate text-[13px] font-medium leading-tight text-[var(--foreground)]">
              {t(label)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function SectionsNavCollapsed({
  activeSection,
  onSelect,
}: {
  activeSection: Section;
  onSelect: (section: Section) => void;
}) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("Settings sections")}
      className="flex h-full flex-col items-center gap-1 py-2"
    >
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const active = activeSection === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            title={t(label)}
            aria-label={t(label)}
            aria-current={active ? "page" : undefined}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              active
                ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--foreground)]"
                : "border-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]"
            }`}
          >
            <Icon size={14} strokeWidth={active ? 2 : 1.6} aria-hidden />
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

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const [catalog, setCatalog] = useState<Catalog>(defaultCatalog());
  const [draft, setDraft] = useState<Catalog>(defaultCatalog());
  const [activeSection, setActiveSection] = useState<Section>("preferences");
  const [activeService, setActiveService] = useState<ServiceName>("llm");
  const [logs, setLogs] = useState<string>("Waiting for test run...");
  const [testRunning, setTestRunning] = useState<ServiceName | null>(null);
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

  // -- Tour guide auto-switch active service tab --------------------------

  useEffect(() => {
    const currentStep = TOUR_GUIDE_STEPS[tourGuideStep];
    if (currentStep?.service) {
      setActiveService(currentStep.service);
      setActiveSection(currentStep.service);
    }
  }, [tourGuideStep]);

  const selectSection = useCallback((section: Section) => {
    setActiveSection(section);
    if (SERVICE_SECTIONS.has(section)) {
      setActiveService(section as ServiceName);
    }
  }, []);

  // -- Derived ------------------------------------------------------------

  const activeProfile = getActiveProfile(draft, activeService);
  const activeModel = getActiveModel(draft, activeService);
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

  const removeActiveModel = () => {
    if (activeService === "search") return;
    mutateCatalog((next) => {
      const service = next.services[activeService];
      const profile =
        service.profiles.find(
          (item) => item.id === service.active_profile_id,
        ) ?? null;
      if (!profile) return;
      profile.models = profile.models.filter(
        (item) => item.id !== service.active_model_id,
      );
      service.active_model_id = profile.models[0]?.id ?? null;
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
          if (entry.type === "completed") {
            toast.success(entry.message);
          } else {
            toast.error(entry.message);
          }
        }
      };
      source.onerror = () => {
        source.close();
        eventSourceRef.current = null;
        setTestRunning(null);
        setLogs(
          (current) => `${current}[failed] Diagnostics stream disconnected.\n`,
        );
        toast.error(t("Diagnostics stream disconnected"));
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not start diagnostics.";
      setLogs((current) => `${current}[failed] ${message}\n`);
      toast.error(message);
      setTestRunning(null);
    }
  };

  // -- Tour ---------------------------------------------------------------

  const runTour = useCallback(() => {
    setTourGuideStep(0);
  }, []);

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
          />
        }
      >
        <div className="flex min-h-full flex-col">
          <SectionsNav
            activeSection={activeSection}
            onSelect={selectSection}
          />
          <div className="mt-auto space-y-1 px-1 pt-4">
            <button
              type="button"
              data-tour="tour-actions"
              onClick={applyCatalog}
              disabled={applying || saving}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3 py-1.5 text-[12px] font-medium text-[var(--background)] transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {applying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Wand2 className="h-3 w-3" />
              )}
              {t("Apply")}
            </button>
            <button
              type="button"
              onClick={runTour}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)]/50 px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground)]"
            >
              <Rocket className="h-3 w-3" />
              {t("Tour")}
            </button>
            {saving && (
              <p className="pt-1 text-center text-[10.5px] text-[var(--muted-foreground)]">
                {t("Saving…")}
              </p>
            )}
          </div>
        </div>
      </ListPane>
      <section
        aria-label="Settings content"
        className="flex-1 overflow-y-auto [scrollbar-gutter:stable]"
      >
      <div className="mx-auto max-w-[960px] px-6 py-8">
        {activeSection === "preferences" && (
        <>
        {/* ── Preferences & Runtime ── */}
        <div className="mb-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-[var(--border)]/50 pb-6">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[var(--muted-foreground)]">
              {t("Theme")}
            </span>
            <div className="flex gap-0.5 rounded-lg bg-[var(--muted)] p-0.5">
              {(["light", "dark"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => updateTheme(v)}
                  className={`rounded-md px-2.5 py-1 text-[12px] transition-all ${
                    theme === v
                      ? "bg-[var(--card)] font-medium text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {v === "light" ? t("Light") : t("Dark")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[var(--muted-foreground)]">
              {t("Language")}
            </span>
            <div className="flex gap-0.5 rounded-lg bg-[var(--muted)] p-0.5">
              {(["en", "zh"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => updateLanguage(v)}
                  className={`rounded-md px-2.5 py-1 text-[12px] transition-all ${
                    language === v
                      ? "bg-[var(--card)] font-medium text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {v === "en" ? t("language.english") : t("language.chinese")}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4 text-[12px] text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${statusDotClass(status?.backend.status === "online", false)}`}
              />
              {t("Backend")}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${statusDotClass(Boolean(status?.llm.model), Boolean(status?.llm.error))}`}
              />
              {t("LLM")}
              {status?.llm.model && (
                <span className="text-[var(--muted-foreground)]/50">
                  · {status.llm.model}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${statusDotClass(Boolean(status?.embeddings.model), Boolean(status?.embeddings.error))}`}
              />
              {t("Emb")}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${statusDotClass(Boolean(status?.search.provider), false)}`}
              />
              {t("Search")}
            </span>
          </div>
        </div>
        </>
        )}

        {SERVICE_SECTIONS.has(activeSection) && (
        <>
        {/* ── Service Configuration ── */}
        <div className="mb-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[16px] font-semibold text-[var(--foreground)]">
                {t(activeService === "llm"
                  ? "LLM"
                  : activeService === "embedding"
                    ? "Embedding"
                    : "Search")}
              </h2>
              <span
                data-tour={`tour-${activeService}`}
                className="text-[11px] text-[var(--muted-foreground)]"
              >
                {draft.services[activeService].profiles.length} {t("profiles")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={addProfile}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)]/50 px-2.5 py-1 text-[12px] text-[var(--muted-foreground)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground)]"
              >
                <Plus className="h-3 w-3" />
                {t("Profile")}
              </button>
              {activeService !== "search" && (
                <button
                  onClick={addModel}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)]/50 px-2.5 py-1 text-[12px] text-[var(--muted-foreground)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground)]"
                >
                  <Plus className="h-3 w-3" />
                  {t("Model")}
                </button>
              )}
            </div>
          </div>

          {activeProfile ? (
            <div className="grid grid-cols-[200px_1fr] gap-5">
              {/* ── Profile list ── */}
              <div className="space-y-1">
                {draft.services[activeService].profiles.map((profile) => (
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
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                      profile.id ===
                      draft.services[activeService].active_profile_id
                        ? "bg-[var(--muted)] text-[var(--foreground)]"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50"
                    }`}
                  >
                    <div className="text-[13px] font-medium">
                      {profile.name}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-[var(--muted-foreground)]">
                      {profile.base_url || t("No endpoint")}
                    </div>
                  </button>
                ))}
                <button
                  onClick={removeActiveProfile}
                  disabled={!activeProfile}
                  className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] text-[var(--muted-foreground)]/40 transition-colors hover:text-red-500 disabled:opacity-30"
                >
                  <Trash2 className="h-3 w-3" />
                  {t("Delete profile")}
                </button>
              </div>

              {/* ── Editor ── */}
              <div className="space-y-5">
                <div className="rounded-xl border border-[var(--border)] p-5">
                  <div className="mb-4 text-[13px] font-medium text-[var(--foreground)]">
                    {t("Profile")}
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
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-[13px] font-medium text-[var(--foreground)]">
                        {t("Models")}
                      </div>
                      <button
                        onClick={removeActiveModel}
                        disabled={!activeModel}
                        className="inline-flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]/40 transition-colors hover:text-red-500 disabled:opacity-30"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t("Delete")}
                      </button>
                    </div>
                    {activeProfile.models.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {activeProfile.models.map((model) => (
                          <button
                            key={model.id}
                            onClick={() =>
                              mutateCatalog((next) => {
                                next.services[activeService].active_model_id =
                                  model.id;
                              })
                            }
                            className={`rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                              model.id ===
                              draft.services[activeService].active_model_id
                                ? "bg-[var(--muted)] font-medium text-[var(--foreground)]"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50"
                            }`}
                          >
                            {model.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {activeModel && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <div className="mb-1.5 text-[12px] text-[var(--muted-foreground)]">
                            {t("Label")}
                          </div>
                          <input
                            className={inputClass}
                            value={activeModel.name}
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
                            value={activeModel.model}
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
                                value={activeModel.context_window || ""}
                                onChange={(e) =>
                                  updateContextWindowField(e.target.value)
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
                                    activeModel.context_window_source,
                                    t,
                                  )}
                                </span>
                              </div>
                              <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                                {activeModel.context_window_source ===
                                "metadata"
                                  ? t(
                                      "Detected from the provider during the latest LLM test and saved into model_catalog.json.",
                                    )
                                  : activeModel.context_window_source ===
                                      "default"
                                    ? t(
                                        "The provider did not expose a context window, so the runtime fallback was saved during the latest LLM test.",
                                      )
                                    : activeModel.context_window_source ===
                                        "manual"
                                      ? t(
                                          "Manual override from Settings. Auto-saves once you stop typing.",
                                        )
                                      : t(
                                          "Run the LLM test to auto-fill this field, or enter a value manually.",
                                        )}
                              </p>
                              {activeModel.context_window_detected_at && (
                                <div className="mt-2 text-[11px] text-[var(--muted-foreground)]/70">
                                  {t("Detected at")}:{" "}
                                  {formatContextWindowUpdatedAt(
                                    activeModel.context_window_detected_at,
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
                                  checked={activeModel.send_dimensions !== false}
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
                              activeModel={activeModel}
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
                    )}
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
            <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)]/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                  <span className="text-[13px] font-medium text-[var(--foreground)]">
                    {t("Run test")}
                  </span>
                  {testRunning === activeService && (
                    <Loader2 className="h-3 w-3 animate-spin text-[var(--primary)]" />
                  )}
                </div>
                <button
                  type="button"
                  data-tour="tour-run-test"
                  onClick={() => runDetailedTest()}
                  disabled={testRunning !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)]/50 px-2.5 py-1 text-[12px] text-[var(--muted-foreground)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground)] disabled:opacity-40"
                >
                  {serviceIcon(activeService)}
                  {t("Run")}
                </button>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                {t(
                  "Streams config snapshot, request target, response summary, and service-specific validation for the active {{service}} profile.",
                  { service: activeService },
                )}
              </p>
              <pre className="mt-3 max-h-[360px] overflow-y-auto rounded-lg bg-[#0f0f0f] p-4 font-mono text-[12px] leading-6 text-[#777] dark:bg-[#0a0a0a]">
                {logs}
              </pre>
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
      </section>

      {/* ── Spotlight overlay (tour onboarding) ── */}
      {tourGuideStep >= 0 &&
        tourGuideStep < TOUR_GUIDE_STEPS.length &&
        (
          <SpotlightOverlay
            stepIndex={tourGuideStep}
            onNext={() => {
              if (tourGuideStep < TOUR_GUIDE_STEPS.length - 1) {
                setTourGuideStep((s) => s + 1);
              } else {
                setTourGuideStep(-1);
              }
            }}
            onSkip={() => setTourGuideStep(-1)}
          />
        )}
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
