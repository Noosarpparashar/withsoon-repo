import { expect, test } from "@playwright/test";

const chapters = [
  {
    path: "/data-engineering/youtube/start-here",
    title: "Start Here",
    inspectors: 5,
    panels: 0,
  },
  {
    path: "/data-engineering/youtube/real-time-streaming",
    title: "Real-Time Streaming",
    inspectors: 6,
    panels: 7,
  },
  {
    path: "/data-engineering/youtube/batch-lakehouse",
    title: "Batch + Lakehouse",
    inspectors: 4,
    panels: 5,
  },
] as const;

for (const chapter of chapters) {
  test(`${chapter.title} restores hover explanations on desktop`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Desktop hover is covered with a precise pointer.");
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto(chapter.path);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1, name: chapter.title })).toBeVisible();

    const triggers = page.locator("[data-explainer-trigger]:visible");
    await expect(triggers.first()).toBeVisible();
    expect(await triggers.count()).toBeGreaterThan(10);

    await triggers.first().scrollIntoViewIfNeeded();
    await triggers.first().hover();
    await expect(page.getByTestId("explainer-panel")).toBeVisible();

    const inspectors = page.getByTestId("section-inspector");
    await expect(inspectors).toHaveCount(chapter.inspectors);
    for (let index = 0; index < chapter.inspectors; index += 1) {
      await expect(inspectors.nth(index)).toBeHidden();
    }

    const panelSummaries = page.locator("details[data-depth-panel] > summary");
    await expect(panelSummaries).toHaveCount(chapter.panels);
    for (let index = 0; index < chapter.panels; index += 1) {
      await expect(panelSummaries.nth(index)).toBeHidden();
    }
  });

  test(`${chapter.title} inspectors remain touch-readable at 390px`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapter.path);

    const inspectors = page.getByTestId("section-inspector");
    await expect(inspectors).toHaveCount(chapter.inspectors);

    const panelSummaries = page.locator("details[data-depth-panel] > summary");
    await expect(panelSummaries).toHaveCount(chapter.panels);
    for (let index = 0; index < chapter.panels; index += 1) {
      await expect(panelSummaries.nth(index)).toBeVisible();
    }

    for (let index = 0; index < chapter.inspectors; index += 1) {
      const inspector = inspectors.nth(index);
      await inspector.evaluate((element) => {
        const panel = element.closest<HTMLDetailsElement>("details[data-depth-panel]");
        if (panel) panel.open = true;
      });
      await inspector.scrollIntoViewIfNeeded();
      const box = await inspector.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);

      const select = inspector.locator("select");
      const lastValue = await select.locator("option").last().getAttribute("value");
      expect(lastValue).not.toBeNull();
      await select.selectOption(lastValue!);
      await expect(inspector.getByTestId("section-inspector-content")).toBeVisible();
    }

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
  });
}
