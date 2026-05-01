import { test, expect } from "@playwright/test";

const BASE_URL =
  process.env.WEB_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:3000";

// Visual regression for the /dev console. Each view in the sidebar is reachable
// via ?view= so we can address them independently. One screenshot per view
// covers a wide swath of the UI: 73 component showcases, the gallery grid, and
// the architecture tree text block.
const VIEWS = ["showcase", "gallery", "tree"] as const;

for (const view of VIEWS) {
  test(`/dev?view=${view} visual baseline`, async ({ page }) => {
    await page.goto(`${BASE_URL}/dev?view=${view}`);
    // Make sure all per-component preview render cycles have settled before
    // we capture (some showcases lazy-import heavy renderers like KaTeX).
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
    await expect(page).toHaveScreenshot(`dev-${view}.png`, {
      fullPage: true,
    });
  });
}
