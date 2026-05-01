import { test, expect } from "@playwright/test";

const BASE_URL =
  process.env.WEB_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:3000";

// Visual regression for the /dev console.
//
// Each view in the sidebar is reachable via ?view= so we can address them
// independently. We capture each view in BOTH light and dark themes so
// regressions in either palette surface in CI. Theme is forced via direct
// classList manipulation (mirroring what /settings does at runtime); the
// localStorage write keeps it from being overwritten when ThemeScript runs
// on subsequent navigations.
const VIEWS = ["showcase", "gallery", "tree"] as const;
const THEMES = ["light", "dark"] as const;

for (const view of VIEWS) {
  for (const theme of THEMES) {
    test(`/dev?view=${view} visual baseline (${theme})`, async ({ page }) => {
      // Apply theme before any page script runs, so the very first paint
      // matches the requested theme — no flash, deterministic snapshot.
      await page.addInitScript((t) => {
        try {
          window.localStorage.setItem("deeptutor-theme", t);
        } catch {
          // localStorage may be disabled — ThemeScript already tolerates this.
        }
      }, theme);

      await page.goto(`${BASE_URL}/dev?view=${view}`);
      await page.waitForLoadState("networkidle");

      // Disable animations so the snapshot is deterministic.
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
        `,
      });

      await expect(page).toHaveScreenshot(`dev-${view}-${theme}.png`, {
        fullPage: true,
      });
    });
  }
}
