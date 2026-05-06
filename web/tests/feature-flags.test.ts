/**
 * Tests for lib/feature-flags (P0.17).
 *
 * Locks the precedence: query > localStorage > env > default. Any P1 code
 * gating chat-runtime抽出 reads through `isFeatureEnabled` and depends on
 * this precedence — break it and rollback via LocalStorage stops working.
 *
 * NOTE: feature-flags.ts has no module-level state — every call re-reads
 * env / window / storage — so we don't need module cache resets here.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  __test_helpers__,
  clearFeatureFlag,
  isFeatureEnabled,
  setFeatureFlag,
} from "../lib/feature-flags";

const ENV_KEY = "NEXT_PUBLIC_FF_CHAT_RUNTIME_V2";

function setWindow(opts: {
  hostname?: string;
  search?: string;
  storage?: Record<string, string>;
}): Map<string, string> {
  const storage = new Map(Object.entries(opts.storage ?? {}));
  (globalThis as { window?: unknown }).window = {
    location: {
      hostname: opts.hostname ?? "localhost",
      search: opts.search ?? "",
    },
    localStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storage.set(k, v);
      },
      removeItem: (k: string) => {
        storage.delete(k);
      },
    },
  } as unknown;
  return storage;
}

function clearWindow(): void {
  delete (globalThis as { window?: unknown }).window;
}

test("default is false when no overrides exist", () => {
  delete process.env[ENV_KEY];
  clearWindow();
  assert.equal(isFeatureEnabled("chat_runtime_v2"), false);
});

test("env var overrides default", () => {
  process.env[ENV_KEY] = "1";
  clearWindow();
  assert.equal(isFeatureEnabled("chat_runtime_v2"), true);
  delete process.env[ENV_KEY];
});

test("localStorage overrides env (precedence)", () => {
  process.env[ENV_KEY] = "1";
  setWindow({ storage: { "ff:chat_runtime_v2": "0" } });
  assert.equal(
    isFeatureEnabled("chat_runtime_v2"),
    false,
    "LS=0 must beat env=1",
  );
  delete process.env[ENV_KEY];
});

test("query string overrides localStorage (top precedence)", () => {
  setWindow({
    search: "?ff_chat_runtime_v2=1",
    storage: { "ff:chat_runtime_v2": "0" },
  });
  assert.equal(isFeatureEnabled("chat_runtime_v2"), true);
});

test("setFeatureFlag persists to localStorage and read returns true", () => {
  const stored = setWindow({});
  setFeatureFlag("chat_runtime_v2", true);
  assert.equal(stored.get("ff:chat_runtime_v2"), "1");
  assert.equal(isFeatureEnabled("chat_runtime_v2"), true);
  clearFeatureFlag("chat_runtime_v2");
  assert.equal(stored.has("ff:chat_runtime_v2"), false);
  assert.equal(isFeatureEnabled("chat_runtime_v2"), false);
});

test("parseBoolish handles common variants", () => {
  const p = __test_helpers__.parseBoolish;
  for (const t of ["1", "true", "TRUE", "yes", "On"]) {
    assert.equal(p(t), true, `truthy: ${t}`);
  }
  for (const t of ["0", "false", "no", "off", ""]) {
    assert.equal(p(t), false, `falsy: ${t}`);
  }
  for (const t of [null, "maybe", "x", "2"]) {
    assert.equal(p(t), null, `unknown: ${String(t)}`);
  }
});
