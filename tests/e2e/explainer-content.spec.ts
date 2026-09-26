import { expect, test, type Page } from "@playwright/test";

async function openFirstSharedExplainer(page: Page, route: string) {
  const response = await page.goto(route);
  expect(response?.status()).toBeLessThan(400);

  const trigger = page.locator("[data-explainer-trigger]:visible").first();
  await expect(trigger).toBeVisible();
  await trigger.scrollIntoViewIfNeeded();
  const hasPrecisePointer = await page.evaluate(() =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  if (hasPrecisePointer) await trigger.hover();
  else await trigger.tap();

  const panel = page.getByTestId("explainer-panel");
  await expect(panel).toBeVisible();
  return { panel, hasPrecisePointer };
}

test.describe("concise explainer writing", () => {
  test("Uber and YouTube use a standard two-paragraph floating panel", async ({ page }) => {
    for (const example of [
      { route: "/data-engineering/uber/start-here", company: "Uber" },
      { route: "/data-engineering/youtube/event-sources", company: "YouTube" },
    ]) {
      const { panel, hasPrecisePointer } = await openFirstSharedExplainer(page, example.route);
      const box = await panel.boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(viewport).not.toBeNull();
      expect(box!.width).toBeLessThanOrEqual(402);
      expect(box!.x).toBeGreaterThanOrEqual(11);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width - 11);

      const copy = panel.getByTestId("explainer-copy");
      await expect(copy.locator(":scope > p")).toHaveCount(2);
      await expect(copy).toContainText(`${example.company} example:`);
      await expect(copy).not.toContainText(/What it (does|means):|What we do:|How:/i);

      if (hasPrecisePointer) await page.mouse.move(1, 1);
      else await page.getByTestId("explainer-close").tap();
      await expect(panel).toBeHidden();
    }
  });

  test("Netflix uses the same two-paragraph hierarchy", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto("/data-engineering/netflix/start-here");
    expect(response?.status()).toBeLessThan(400);

    const trigger = page.locator("button[aria-describedby]:visible").first();
    await expect(trigger).toBeVisible();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.hover();

    const panel = page.locator('[role="tooltip"]:visible').first();
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(402);
    await expect(panel.getByTestId("explainer-copy").locator(":scope > p")).toHaveCount(2);
    await expect(panel).toContainText("Netflix example:");
  });

  test("streaming inspectors no longer repeat What and How fragments", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto("/data-engineering/youtube/real-time-streaming#rt-jobs");
    expect(response?.status()).toBeLessThan(400);

    const inspector = page.getByTestId("section-inspector-content").first();
    await expect(inspector).toBeVisible();
    await expect(inspector.getByTestId("explainer-copy").locator(":scope > p")).toHaveCount(2);
    await expect(inspector).toContainText("YouTube example:");
    await expect(inspector).not.toContainText(/What it (does|means):|What we do:|How:/i);

    const width = await inspector.evaluate((element) => element.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(430);
  });
});
