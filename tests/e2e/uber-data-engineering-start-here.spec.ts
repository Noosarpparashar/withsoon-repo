import { expect, test } from "@playwright/test";

test.describe("Uber Data Engineering - Start Here", () => {
  test("renders the marketplace platform visual", async ({ page }) => {
    await page.goto("/system-design/uber/start-here#platform-mission");
    await expect(page.getByTestId("platform-mission-visual")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Design the shared marketplace data platform" })).toBeVisible();
  });

  test("outline navigation updates the section anchor", async ({ page }) => {
    await page.goto("/system-design/uber/start-here");
    await page.getByTestId("stage-nav-freshness-map").click();
    await expect(page).toHaveURL(/#freshness-map$/);
    await expect(page.getByRole("heading", { name: "Compare the serving clocks" })).toBeVisible();
  });

  test("cards reveal source-grounded explanations on hover", async ({ page }) => {
    await page.goto("/system-design/uber/start-here#platform-mission");
    await page.getByRole("button", { name: /Surge pricing/i }).hover();
    await expect(page.getByRole("tooltip", { name: /supply and demand aggregates/i })).toBeVisible();
    await expect(page.getByText(/Fraud/i)).toHaveCount(0);
  });

  test("supports the global light theme", async ({ page }) => {
    await page.goto("/system-design/uber/start-here");
    const themeButton = page.getByRole("button", { name: "Toggle theme" });
    await themeButton.locator("svg").waitFor();
    await themeButton.click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByTestId("platform-mission-visual")).toBeVisible();
  });

  test("mobile content stays within the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/system-design/uber/start-here#platform-mission");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });

  test("chapter and anchor rails stay visible after deep scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/system-design/uber/start-here");
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, document.body.scrollHeight * 0.65);
    });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);

    const chapter = await page.getByTestId("chapter-rail").boundingBox();
    const anchors = await page.getByTestId("anchor-rail").boundingBox();
    expect(chapter).not.toBeNull();
    expect(anchors).not.toBeNull();
    expect(chapter!.y).toBeGreaterThanOrEqual(55);
    expect(chapter!.y + chapter!.height).toBeLessThanOrEqual(125);
    expect(anchors!.y).toBeGreaterThanOrEqual(139);
    expect(anchors!.y + anchors!.height).toBeLessThanOrEqual(900);
  });

  test("shows the hover hint once per chapter", async ({ page }) => {
    await page.goto("/system-design/uber/start-here");
    await expect(page.getByRole("dialog", { name: "Card details hint" })).toBeVisible();
    await page.getByRole("button", { name: "Dismiss card details hint" }).click();
    await page.reload();
    await expect(page.getByRole("dialog", { name: "Card details hint" })).toHaveCount(0);

    await page.goto("/system-design/uber/requirements");
    await expect(page.getByRole("dialog", { name: "Card details hint" })).toBeVisible();
  });
});
