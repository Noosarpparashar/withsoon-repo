import { expect, test } from "@playwright/test";

test.describe("Uber Data Engineering - Start Here", () => {
  test("renders the marketplace platform visual", async ({ page }) => {
    await page.goto("/data-engineering/uber/start-here#platform-mission");
    await expect(page.getByTestId("platform-mission-visual")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Design the shared marketplace data platform" })).toBeVisible();
  });

  test("outline navigation updates the section anchor", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "The desktop outline is hidden on touch-sized viewports.");
    await page.goto("/data-engineering/uber/start-here");
    await page.getByTestId("stage-nav-freshness-map").click();
    await expect(page).toHaveURL(/#freshness-map$/);
    await expect(page.getByRole("heading", { name: "Compare the serving clocks" })).toBeVisible();
  });

  test("cards reveal source-grounded explanations on hover", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Precise-pointer hover is covered by the desktop project.");
    await page.goto("/data-engineering/uber/start-here#platform-mission");
    await page.getByRole("button", { name: /Surge pricing/i }).hover();
    await expect(page.getByRole("tooltip", { name: /supply and demand aggregates/i })).toBeVisible();
    await expect(page.getByText(/Fraud/i)).toHaveCount(0);
  });

  test("uses the global light theme without exposing a partial theme control", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/data-engineering/uber/start-here");
    await expect(page.getByRole("button", { name: /theme|dark mode|light mode/i })).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
    await expect(page.getByTestId("platform-mission-visual")).toBeVisible();
  });

  test("mobile content stays within the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/uber/start-here#platform-mission");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });

  test("chapter and anchor rails stay visible after deep scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/data-engineering/uber/start-here");
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

  test("uses an on-demand explainer instead of a blocking hover hint", async ({ page }) => {
    await page.goto("/data-engineering/uber/start-here");
    await expect(page.getByRole("dialog", { name: "Card details hint" })).toHaveCount(0);
    const card = page.getByRole("button", { name: /Driver app/i });
    await card.click();
    await expect(page.getByTestId("explainer-panel")).toHaveAttribute("role", "dialog");
    await page.keyboard.press("Escape");
    await expect(card).toHaveAttribute("aria-expanded", "false");
  });
});
