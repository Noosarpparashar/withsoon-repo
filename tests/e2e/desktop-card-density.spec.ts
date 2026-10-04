import { expect, test } from "@playwright/test";

test.describe("desktop card density", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Desktop geometry is verified once in Chromium.");
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("YouTube capabilities stay compact without changing the mobile layout", async ({ page }) => {
    await page.goto("/data-engineering/youtube/start-here#capabilities");
    const cards = page.locator('[data-density-card="youtube-capability"]');
    await expect(cards).toHaveCount(9);

    const heights = await cards.evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().height)),
    );
    expect(Math.max(...heights)).toBeLessThanOrEqual(76);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const mobileHeights = await cards.evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().height)),
    );
    expect(Math.min(...mobileHeights)).toBeGreaterThanOrEqual(64);
  });

  test("YouTube scale targets use desktop density without shrinking mobile targets", async ({ page }) => {
    await page.goto("/data-engineering/youtube/start-here#scale-targets");
    const anchors = page.locator('[data-density-card="youtube-scale-anchor"]');
    const slos = page.locator('[data-density-card="youtube-scale-slo"]');
    await expect(anchors).toHaveCount(4);
    await expect(slos).toHaveCount(6);

    const desktopAnchorHeights = await anchors.evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().height)),
    );
    const desktopSloHeights = await slos.evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().height)),
    );
    expect(Math.max(...desktopAnchorHeights)).toBeLessThanOrEqual(68);
    expect(Math.max(...desktopSloHeights)).toBeLessThanOrEqual(38);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const mobileSloHeights = await slos.evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().height)),
    );
    expect(Math.min(...mobileSloHeights)).toBeGreaterThanOrEqual(44);
  });

  test("Uber summary cards do not inherit taller sibling heights", async ({ page }) => {
    await page.goto("/data-engineering/uber/requirements#scale-assumptions");
    const assumptions = page.locator('[data-density-card="uber-assumption"]');
    await expect(assumptions).toHaveCount(4);
    const assumptionHeights = await assumptions.evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().height)),
    );
    expect(Math.max(...assumptionHeights)).toBeLessThanOrEqual(104);

    const tripFacts = page.locator('[data-density-card="uber-trip-facts"]');
    await expect(tripFacts).toBeVisible();
    expect(Math.round((await tripFacts.boundingBox())!.height)).toBeLessThanOrEqual(150);
  });

  test("BookMyShow diagram cards size to their content on desktop", async ({ page }) => {
    await page.goto("/data-engineering/bookmyshow/batch-lakehouse#lakehouse-flow");
    const cards = page.locator('[data-density-card="bookmyshow-lakehouse-component"]');
    await expect(cards).toHaveCount(14);
    const heights = await cards.evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().height)),
    );
    expect(Math.max(...heights)).toBeLessThanOrEqual(112);

    await page.goto("/data-engineering/bookmyshow/interview-qa#whiteboard");
    const steps = page.locator('[data-density-card="bookmyshow-whiteboard-step"]');
    await expect(steps).toHaveCount(6);
    const stepHeights = await steps.evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().height)),
    );
    expect(Math.max(...stepHeights)).toBeLessThanOrEqual(108);
  });
});
