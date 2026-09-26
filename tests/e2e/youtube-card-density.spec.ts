import { expect, test } from "@playwright/test";

const chapters = [
  {
    path: "/data-engineering/youtube/start-here",
    title: "Start Here",
    inspectors: 5,
    maxButtons: 20,
    maxInteractive: 40,
  },
  {
    path: "/data-engineering/youtube/real-time-streaming",
    title: "Real-Time Streaming",
    inspectors: 6,
    maxButtons: 24,
    maxInteractive: 44,
  },
  {
    path: "/data-engineering/youtube/batch-lakehouse",
    title: "Batch + Lakehouse",
    inspectors: 4,
    maxButtons: 20,
    maxInteractive: 40,
  },
] as const;

for (const chapter of chapters) {
  test(`${chapter.title} uses consolidated section inspectors`, async ({ page }) => {
    const response = await page.goto(chapter.path);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1, name: chapter.title })).toBeVisible();

    const counts = await page.evaluate(() => ({
      buttons: document.querySelectorAll("button").length,
      interactive: document.querySelectorAll(
        'button,a[href],select,input,textarea,[role="button"]',
      ).length,
      explainers: document.querySelectorAll("[data-explainer-trigger]").length,
    }));

    expect(counts.buttons).toBeLessThanOrEqual(chapter.maxButtons);
    expect(counts.interactive).toBeLessThanOrEqual(chapter.maxInteractive);
    expect(counts.explainers).toBe(0);

    const inspectors = page.getByTestId("section-inspector");
    await expect(inspectors).toHaveCount(chapter.inspectors);

    for (let inspectorIndex = 0; inspectorIndex < chapter.inspectors; inspectorIndex += 1) {
      const inspector = inspectors.nth(inspectorIndex);
      await inspector.evaluate((element) => {
        const panel = element.closest<HTMLDetailsElement>("details[data-depth-panel]");
        if (panel) panel.open = true;
      });
      const select = inspector.locator("select");
      const optionValues = await select.locator("option").evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      );
      expect(optionValues.length).toBeGreaterThan(1);

      for (const value of optionValues) {
        await select.selectOption(value);
        await expect(inspector.getByTestId("section-inspector-content")).not.toBeEmpty();
        const detail = await inspector.getByTestId("section-inspector-content").innerText();
        expect(detail.trim().length).toBeGreaterThan(35);
      }
    }
  });

  test(`${chapter.title} inspectors remain touch-readable at 390px`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapter.path);

    const inspectors = page.getByTestId("section-inspector");
    await expect(inspectors).toHaveCount(chapter.inspectors);

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
