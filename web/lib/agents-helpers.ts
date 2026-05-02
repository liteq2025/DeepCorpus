/**
 * Shared types + pure helpers for the /agents route. Extracted from the
 * mega-page split (Phase 2 slice 2.1) — see
 * docs/refactor/phase-2-megapages.md.
 */

/* ── Shared types ───────────────────────────────────────── */

export interface BotInfo {
  bot_id: string;
  name: string;
  description: string;
  persona: string;
  /**
   * From `GET /tutorbot` (list): channel name keys only — never carries secrets.
   * The single-bot detail endpoint returns a richer dict; ChannelsTab fetches
   * it explicitly via `?include_secrets=true` and works with that shape directly,
   * so this list-shape type is sufficient here.
   */
  channels: string[];
  model: string | null;
  running: boolean;
  started_at: string | null;
  /** Set when a previous PATCH succeeded but `reload_channels` failed. */
  last_reload_error?: string | null;
}

export interface SoulTemplate {
  id: string;
  name: string;
  content: string;
}

export type Tab = "bots" | "profiles" | "channels" | "souls";

export const BOT_FILES = [
  "SOUL.md",
  "USER.md",
  "TOOLS.md",
  "AGENTS.md",
  "HEARTBEAT.md",
] as const;
export type BotFile = (typeof BOT_FILES)[number];

/* ── Channel schema (JSON-Schema subset) ────────────────── */

/**
 * JSON-Schema fragment subset we actually consume. Pydantic emits richer
 * shapes (allOf / examples / formats) that we ignore — the form gracefully
 * falls back to a text input for anything it doesn't recognise.
 */
export type JsonSchema = {
  type?: string | string[];
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
};

export interface ChannelSchemaEntry {
  name: string;
  display_name: string;
  default_config: Record<string, unknown>;
  secret_fields: string[];
  json_schema: JsonSchema;
}

export interface ChannelsSchemaResponse {
  channels: Record<string, ChannelSchemaEntry>;
  global: { json_schema: JsonSchema; secret_fields: string[] };
}

/* ── Schema helpers ─────────────────────────────────────── */

/** Pick the first non-null variant of an `anyOf` and merge its meta. */
export function resolveSchemaVariant(s: JsonSchema): JsonSchema {
  if (!s.anyOf) return s;
  const first = s.anyOf.find((v) => v.type !== "null") ?? s.anyOf[0];
  return {
    ...first,
    title: s.title ?? first.title,
    description: s.description ?? first.description,
  };
}

/** True iff this schema's value can be `null` (e.g. `Optional[str]`). */
export function isNullable(s: JsonSchema): boolean {
  if (Array.isArray(s.type) && s.type.includes("null")) return true;
  if (s.anyOf?.some((v) => v.type === "null")) return true;
  return false;
}

/** Default value for a property when the live config doesn't set it. */
export function defaultFor(s: JsonSchema): unknown {
  if (s.default !== undefined) return s.default;
  const v = resolveSchemaVariant(s);
  switch (v.type) {
    case "boolean":
      return false;
    case "integer":
    case "number":
      return 0;
    case "array":
      return [];
    case "object":
      return {};
    case "string":
    default:
      return "";
  }
}

/** Title-case a snake_case key when no `title` is provided. */
export function humaniseKey(k: string): string {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
