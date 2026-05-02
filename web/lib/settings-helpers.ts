/**
 * Shared types + pure helpers for the /settings route. Extracted from the
 * mega-page split (Phase 2 slice 2.4) — see
 * docs/refactor/phase-2-megapages.md.
 */

/* ── Catalog domain types ───────────────────────────────── */

export type ServiceName = "llm" | "embedding" | "search";

export type CatalogModel = {
  id: string;
  name: string;
  model: string;
  dimension?: string;
  send_dimensions?: boolean;
  // CSV of dims supported natively by the current model — refreshed by the
  // backend on every successful "Run test" for an embedding service.
  supported_dimensions?: string;
  context_window?: string;
  context_window_source?: string;
  context_window_detected_at?: string;
};

export type CatalogProfile = {
  id: string;
  name: string;
  binding?: string;
  provider?: string;
  base_url: string;
  api_key: string;
  api_version: string;
  extra_headers?: Record<string, string> | string;
  proxy?: string;
  max_results?: number;
  models: CatalogModel[];
};

export type CatalogService = {
  active_profile_id: string | null;
  active_model_id?: string | null;
  profiles: CatalogProfile[];
};

export type Catalog = {
  version: number;
  services: {
    llm: CatalogService;
    embedding: CatalogService;
    search: CatalogService;
  };
};

export type UiSettings = {
  theme: "light" | "dark";
  language: "en" | "zh";
};

export type ProviderOption = {
  value: string;
  label: string;
  base_url?: string;
  default_dim?: string;
};

export type SettingsPayload = {
  ui: UiSettings;
  catalog: Catalog;
  providers?: Record<ServiceName, ProviderOption[]>;
};

export type SystemStatus = {
  backend: { status: string; timestamp: string };
  llm: { status: string; model?: string; error?: string };
  embeddings: { status: string; model?: string; error?: string };
  search: { status: string; provider?: string; error?: string };
};

/* ── Catalog manipulation helpers ───────────────────────── */

export function cloneCatalog(catalog: Catalog): Catalog {
  return JSON.parse(JSON.stringify(catalog)) as Catalog;
}

export function getActiveProfile(
  catalog: Catalog,
  serviceName: ServiceName,
): CatalogProfile | null {
  const service = catalog.services[serviceName];
  return (
    service.profiles.find(
      (profile) => profile.id === service.active_profile_id,
    ) ??
    service.profiles[0] ??
    null
  );
}

export function getActiveModel(
  catalog: Catalog,
  serviceName: ServiceName,
): CatalogModel | null {
  if (serviceName === "search") return null;
  const service = catalog.services[serviceName];
  const profile = getActiveProfile(catalog, serviceName);
  if (!profile) return null;
  return (
    profile.models.find((model) => model.id === service.active_model_id) ??
    profile.models[0] ??
    null
  );
}

export function statusDotClass(
  configured: boolean,
  hasError: boolean,
): string {
  if (hasError) return "bg-red-400";
  if (configured) return "bg-emerald-500";
  return "bg-[var(--border)]";
}

export function defaultCatalog(): Catalog {
  // SSR placeholder. Backend bootstrap (model_catalog._hydrate_missing_services_from_env)
  // returns the same DuckDuckGo seed when the catalog is fresh — keeping the
  // SSR shape identical avoids a one-frame "no profile / has profile" flicker
  // when the client hydrates with the real /api/v1/settings response.
  return {
    version: 1,
    services: {
      llm: { active_profile_id: null, active_model_id: null, profiles: [] },
      embedding: {
        active_profile_id: null,
        active_model_id: null,
        profiles: [],
      },
      search: {
        active_profile_id: "search-profile-default",
        profiles: [
          {
            id: "search-profile-default",
            name: "DuckDuckGo (zero-config)",
            provider: "duckduckgo",
            base_url: "",
            api_key: "",
            api_version: "",
            proxy: "",
            models: [],
          },
        ],
      },
    },
  };
}

export function stringifyExtraHeaders(
  value: CatalogProfile["extra_headers"],
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function formatContextWindowSource(
  source: string | undefined,
  t: (key: string) => string,
): string {
  if (source === "manual") return t("Manual");
  if (source === "metadata") return t("Auto");
  if (source === "default") return t("Default");
  return t("Unset");
}

export function formatContextWindowUpdatedAt(
  value: string | undefined,
  language: "en" | "zh",
): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(language === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/* ── Form-input class strings ───────────────────────────── */

export const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[14px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--ring)] placeholder:text-[var(--muted-foreground)]/40";

export const selectClass =
  "w-full appearance-none rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[14px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--ring)] cursor-pointer";

/* ── Embedding dimension helpers ────────────────────────── */

export const CUSTOM_DIM_SENTINEL = "__custom__";
export const AUTO_DIM_SENTINEL = "";

export function parseSupportedCsv(csv: string | undefined): number[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export type EmbeddingCapabilities = {
  detected_dim?: number;
  default_dim?: number;
  supported_dimensions?: number[];
  supports_variable_dimensions?: boolean;
  model_known?: boolean;
  active_dim?: number;
  active_dim_source?: string;
};

export function sourceBadge(
  source: string | undefined,
  t: (key: string) => string,
): { label: string; tone: "muted" | "ok" | "warn" } | null {
  // The probe is the single source of truth: a successful test always emits
  // ``"detected"``. Other codes are legacy and no longer produced.
  if (source === "detected") {
    return { label: t("Source: detected from API probe"), tone: "ok" };
  }
  return null;
}

/* ── Search provider catalog ─────────────────────────────── */

export const supportedSearchProviders = [
  "brave",
  "tavily",
  "jina",
  "searxng",
  "duckduckgo",
  "perplexity",
] as const;

export const deprecatedSearchProviders = new Set([
  "exa",
  "serper",
  "baidu",
  "openrouter",
]);
