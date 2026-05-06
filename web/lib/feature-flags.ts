/**
 * Feature flags — runtime overrides for v3 rollout.
 *
 * Single source of truth: each flag has a default + 3 override sources
 * (env, LocalStorage, URL query). Resolution order, highest precedence first:
 *
 *   1. URL query string                ?ff_chat_runtime_v2=1
 *   2. LocalStorage                    ff:chat_runtime_v2 = "1" | "0"
 *   3. NEXT_PUBLIC_FF_<NAME>           build-time env
 *   4. Default                         hard-coded below
 *
 * Use case (P0.17): chat-runtime抽出 (P1.b) ships behind
 * `chat_runtime_v2`. Surfaces read this flag to choose between the legacy
 * UnifiedChatContext and the new useChatSession hook. Toggling at runtime
 * (LocalStorage) lets QA flip without rebuilding.
 *
 * SSR: in Node (no window) only env + default are consulted. URL/LS are
 * client-only, so the value can differ between SSR and post-hydration —
 * callers that depend on it should mark themselves "use client".
 */

export type FeatureFlagName =
  // P1.b: switch chat surfaces to web/platform/chat-runtime/useChatSession
  | "chat_runtime_v2";

const DEFAULTS: Record<FeatureFlagName, boolean> = {
  chat_runtime_v2: false,
};

const STORAGE_PREFIX = "ff:";
const QUERY_PREFIX = "ff_";
const ENV_PREFIX = "NEXT_PUBLIC_FF_";

function parseBoolish(raw: string | null | undefined): boolean | null {
  if (raw === null || raw === undefined) return null;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off" || v === "")
    return false;
  return null;
}

function readQuery(name: FeatureFlagName): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return parseBoolish(params.get(`${QUERY_PREFIX}${name}`));
  } catch {
    return null;
  }
}

function readStorage(name: FeatureFlagName): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    return parseBoolish(window.localStorage.getItem(`${STORAGE_PREFIX}${name}`));
  } catch {
    return null;
  }
}

function readEnv(name: FeatureFlagName): boolean | null {
  // Next.js inlines NEXT_PUBLIC_* at build time; access via process.env is
  // safe in both server and browser bundles.
  const key = `${ENV_PREFIX}${name.toUpperCase()}`;
  return parseBoolish(process.env[key]);
}

export function isFeatureEnabled(name: FeatureFlagName): boolean {
  const fromQuery = readQuery(name);
  if (fromQuery !== null) return fromQuery;
  const fromStorage = readStorage(name);
  if (fromStorage !== null) return fromStorage;
  const fromEnv = readEnv(name);
  if (fromEnv !== null) return fromEnv;
  return DEFAULTS[name];
}

export function setFeatureFlag(name: FeatureFlagName, enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${name}`, enabled ? "1" : "0");
  } catch {
    /* ignore quota / private mode errors */
  }
}

export function clearFeatureFlag(name: FeatureFlagName): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${name}`);
  } catch {
    /* ignore */
  }
}

// Pure helper exposed for tests; not part of the public surface.
export const __test_helpers__ = { parseBoolish };
