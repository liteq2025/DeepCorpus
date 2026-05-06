/**
 * Tests for wsUrl HTTPS→WSS upgrade and path edge cases (P0.14a-extension).
 *
 * Companion to api-resolve-base.test.ts which covers loopback rewriting +
 * http→ws conversion. This file fills the missing edge cases:
 *   - https → wss (production)
 *   - path normalization (leading-slash optional)
 *   - trailing slash on base
 */

import test from "node:test";
import assert from "node:assert/strict";

// Must be set before importing the module under test.
process.env.NEXT_PUBLIC_API_BASE = "https://app.example.com/api";

let apiModulePromise: Promise<typeof import("../lib/api")> | null = null;

async function loadApiModule(): Promise<typeof import("../lib/api")> {
  apiModulePromise ??= import("../lib/api");
  return apiModulePromise;
}

function setWindow(hostname: string | undefined): void {
  if (hostname === undefined) {
    delete (globalThis as { window?: unknown }).window;
    return;
  }
  (globalThis as { window?: unknown }).window = {
    location: { hostname },
  } as unknown;
}

test("wsUrl converts https to wss in SSR (no window)", async () => {
  const { wsUrl } = await loadApiModule();
  setWindow(undefined);
  assert.equal(
    wsUrl("/api/v1/ws"),
    "wss://app.example.com/api/api/v1/ws",
    "https base must upgrade to wss (security hardening)",
  );
});

test("wsUrl preserves wss when client is also https", async () => {
  const { wsUrl } = await loadApiModule();
  setWindow("app.example.com");
  assert.equal(wsUrl("/api/v1/ws"), "wss://app.example.com/api/api/v1/ws");
});

test("wsUrl prepends a leading slash if path is missing one", async () => {
  const { wsUrl } = await loadApiModule();
  setWindow(undefined);
  assert.equal(
    wsUrl("api/v1/ws"),
    "wss://app.example.com/api/api/v1/ws",
    "missing leading slash must not produce ws://hostpath",
  );
});

test("wsUrl handles empty path as base alone", async () => {
  const { wsUrl } = await loadApiModule();
  setWindow(undefined);
  assert.equal(wsUrl(""), "wss://app.example.com/api/");
});

test("wsUrl with channel query is left intact (P1 dispatcher prep)", async () => {
  const { wsUrl } = await loadApiModule();
  setWindow(undefined);
  // P1 will move tutorbot/book chat through unified_ws with ?channel=. The
  // helper must not strip/alter the query string.
  assert.equal(
    wsUrl("/api/v1/ws?channel=tutorbot&bot_id=abc"),
    "wss://app.example.com/api/api/v1/ws?channel=tutorbot&bot_id=abc",
  );
});
