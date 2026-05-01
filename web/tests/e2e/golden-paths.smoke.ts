import { test, expect } from "@playwright/test";

const BASE_URL =
  process.env.WEB_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:3000";

// Five golden paths an agent (or a human) can rely on as a regression net.
// Each test must (a) reach a meaningful interactive state, not just HTTP 200,
// and (b) fail with a specific message when broken so we know which path died.

test.describe("smoke :: golden paths", () => {
  test("home page renders main + utility sidebar", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/`);
    expect(response?.ok(), "/ did not return a 2xx response").toBe(true);
    await expect(page.locator("main")).toBeVisible();
    // UtilityLayout always wraps utility routes in an aside; the home page
    // (workspace) similarly has its own sidebar. Either one being visible
    // confirms the shell rendered.
    await expect(page.locator("aside").first()).toBeVisible();
  });

  test("/dev console shows the showcase view by default", async ({ page }) => {
    await page.goto(`${BASE_URL}/dev`);
    // Dev Console heading lives in the inner sidebar.
    await expect(
      page.getByRole("heading", { name: /dev console/i }),
    ).toBeVisible();
    // The default (showcase) view always includes the 组件预览 nav button.
    await expect(page.getByRole("button", { name: /组件预览/ })).toBeVisible();
  });

  test("/settings switching to Dark applies the dark class", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/settings`);
    await expect(
      page.getByRole("heading", { name: /^settings$/i }),
    ).toBeVisible();

    // Click the Dark theme chip and verify <html> picks up the class.
    await page.getByRole("button", { name: /^dark$/i }).first().click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Toggle back to Light to leave the test environment in a known state.
    await page.getByRole("button", { name: /^light$/i }).first().click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("/knowledge route renders without crashing", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/knowledge`);
    expect(response?.ok()).toBe(true);
    // Page mounts a main element even when the KB list is empty.
    await expect(page.locator("main").first()).toBeVisible();
    // No client-side runtime error should escape to the dev overlay.
    await expect(
      page.locator("text=Application error: a client-side exception"),
    ).toHaveCount(0);
  });

  test("/book route renders without crashing", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/book`);
    expect(response?.ok()).toBe(true);
    await expect(page.locator("main").first()).toBeVisible();
    await expect(
      page.locator("text=Application error: a client-side exception"),
    ).toHaveCount(0);
  });
});
