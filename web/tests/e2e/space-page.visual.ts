import { test, expect } from "@playwright/test";

const BASE_URL =
  process.env.WEB_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:3000";

// Visual regression for the /space sub-routes (Phase 0.5.8 first slice).
// /space redirects to /space/notebooks, which exercises:
//   - the new RouteFrame + PageBody composition in space/layout.tsx
//   - SpaceMiniNav as the secondary nav (ListPane-based; see
//     components/space/SpaceMiniNav.tsx for the Layer 2 alignment)
//   - NotebooksSection rendering
//
// Empty-state snapshot if no backend; backend-driven content if connected.
const THEMES = ["light", "dark"] as const;

for (const theme of THEMES) {
  test(`/space/notebooks visual baseline (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => {
      try {
        window.localStorage.setItem("deeptutor-theme", t);
      } catch {
        /* noop */
      }
    }, theme);

    await page.goto(`${BASE_URL}/space/notebooks`);
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

    await expect(page).toHaveScreenshot(`space-notebooks-${theme}.png`, {
      fullPage: true,
    });
  });
}
