import { test, expect } from "@playwright/test";

test.describe("Routing — key tabs load at correct URLs", () => {
  const spotTabs = ["start-here", "playback", "cdn", "failures", "mock-interview"];

  for (const tab of spotTabs) {
    test(`/system-design/netflix/${tab}`, async ({ page }) => {
      const res = await page.goto(`/system-design/netflix/${tab}`);
      expect(res?.status()).toBeLessThan(400);
      await expect(page).toHaveURL(new RegExp(`/system-design/netflix/${tab}`));
    });
  }

  test("legacy /backend-track redirects to /architecture", async ({ page }) => {
    await page.goto("/system-design/netflix/backend-track");
    await expect(page).toHaveURL(/\/system-design\/netflix\/architecture/);
  });
});

test.describe("OG / social metadata", () => {
  test("CDN tab has og:title containing CDN", async ({ page }) => {
    await page.goto("/system-design/netflix/cdn");
    // og:title is server-rendered — read it from the DOM
    const ogTitle = await page.evaluate(() =>
      document.querySelector('meta[property="og:title"]')?.getAttribute("content")
    );
    expect(ogTitle).toContain("CDN");
  });

  test("CDN tab has twitter:card = summary_large_image", async ({ page }) => {
    await page.goto("/system-design/netflix/cdn");
    const card = await page.evaluate(() =>
      document.querySelector('meta[name="twitter:card"]')?.getAttribute("content")
    );
    expect(card).toBe("summary_large_image");
  });

  test("OG image URL uses proper encoding (no §ion)", async ({ page }) => {
    await page.goto("/system-design/netflix/playback");
    const ogImage = await page.evaluate(() =>
      document.querySelector('meta[property="og:image"]')?.getAttribute("content")
    );
    expect(ogImage).toBeTruthy();
    expect(ogImage).not.toContain("§ion");
    expect(ogImage).toContain("section=System+Design");
  });
});

test.describe("Start Here content", () => {
  test("recommended path banner is present", async ({ page }) => {
    await page.goto("/system-design/netflix/start-here");
    await expect(page.locator("text=Recommended path").first()).toBeVisible({ timeout: 15000 });
  });

  test("Backend Engineer CTA points to Playback", async ({ page }) => {
    await page.goto("/system-design/netflix/start-here");
    await expect(page.locator("text=Start with Playback").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Tab switching updates URL", () => {
  test("clicking Failures tab navigates to /failures", async ({ page }) => {
    await page.goto("/system-design/netflix/start-here");
    await page.waitForLoadState("networkidle", { timeout: 20000 });
    await page.locator("button", { hasText: "Failures" }).first().click();
    await expect(page).toHaveURL(/\/system-design\/netflix\/failures/, { timeout: 15000 });
  });

  test("clicking CDN tab navigates to /cdn", async ({ page }) => {
    await page.goto("/system-design/netflix/start-here");
    await page.waitForLoadState("networkidle", { timeout: 20000 });
    await page.locator("button", { hasText: "CDN" }).first().click();
    await expect(page).toHaveURL(/\/system-design\/netflix\/cdn/, { timeout: 15000 });
  });
});

test.describe("Mobile — architecture accordion", () => {
  test("shows component layers on 375px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/system-design/netflix/architecture");
    await page.waitForLoadState("networkidle", { timeout: 20000 });
    // Architecture canvas or SVG/canvas element is rendered at mobile widths
    const hasSvgOrCanvas = await page.locator("svg, canvas").first().isVisible().catch(() => false);
    const hasClientText = await page.getByText("CLIENT").first().isVisible().catch(() => false);
    expect(hasSvgOrCanvas || hasClientText).toBe(true);
  });
});
