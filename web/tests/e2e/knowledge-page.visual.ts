import { test, expect } from "@playwright/test";

const BASE_URL =
  process.env.WEB_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:3000";

// Visual regression for the /knowledge route (Phase 0.5.5 pilot).
// One snapshot per theme covers the new RouteFrame + ListPane composition.
//
// The page makes a fetch to /api/v1/knowledge on mount; in CI without a
// backend it'll show an error or empty state. That's still a meaningful
// visual baseline — regressions in the empty/error layout still get
// caught.
const THEMES = ["light", "dark"] as const;

for (const theme of THEMES) {
  test(`/knowledge visual baseline (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => {
      try {
        window.localStorage.setItem("deeptutor-theme", t);
      } catch {
        /* noop */
      }
    }, theme);

    await page.goto(`${BASE_URL}/knowledge`);
    // Wait long enough for the (failing-or-succeeding) fetch to settle so
    // the loading spinner clears in either case.
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

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

    await expect(page).toHaveScreenshot(`knowledge-${theme}.png`, {
      fullPage: true,
    });
  });
}
