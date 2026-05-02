import { test, expect } from "@playwright/test";

const BASE_URL =
  process.env.WEB_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:3000";

// Visual regression for the /chat route — the deepest-touched route in
// Phase 0.5 sheet-first migration (HistorySessionPicker + QuestionBank-
// Picker + FilePreviewSheet all live here) but historically had no
// pixel gating. Smoke only checked "renders without crashing"; this
// baseline catches layout / chrome regressions.
//
// Captures the empty-state landing (no session selected) so the
// snapshot is deterministic regardless of backend availability — the
// fetch to /api/v1/chat/sessions either succeeds (empty list) or
// fails, and either way the chat home renders the composer + hero.
const THEMES = ["light", "dark"] as const;

for (const theme of THEMES) {
  test(`/chat visual baseline (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => {
      try {
        window.localStorage.setItem("deeptutor-theme", t);
      } catch {
        /* noop */
      }
    }, theme);

    await page.goto(`${BASE_URL}/chat`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          caret-color: transparent !important;
        }
      `,
    });

    await expect(page).toHaveScreenshot(`chat-${theme}.png`, {
      fullPage: true,
    });
  });
}
