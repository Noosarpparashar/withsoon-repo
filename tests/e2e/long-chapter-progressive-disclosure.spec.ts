import { expect, test } from "@playwright/test";

const chapters = [
  {
    name: "Netflix Governance",
    path: "/data-engineering/netflix/governance-quality",
    panels: 4,
    mobileMax: 3_800,
    progressTestId: "netflix-mobile-section-progress",
    detail: "Schema evolution policy",
  },
  {
    name: "YouTube Real-Time",
    path: "/data-engineering/youtube/real-time-streaming",
    panels: 7,
    mobileMax: 4_500,
    progressTestId: "mobile-section-progress",
    detail: "Kafka Topics",
  },
  {
    name: "YouTube Batch",
    path: "/data-engineering/youtube/batch-lakehouse",
    panels: 5,
    mobileMax: 3_900,
    progressTestId: "mobile-section-progress",
    detail: "End-to-end architecture",
  },
] as const;

test.describe("long chapter progressive disclosure", () => {
  for (const chapter of chapters) {
    test(`${chapter.name} keeps the core narrative scannable`, async ({ page }) => {
      for (const viewport of [
        { width: 1440, height: 900 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        const response = await page.goto(chapter.path);
        expect(response?.status()).toBeLessThan(400);
        await expect(page.getByTestId("interview-path")).toBeVisible();

        const panels = page.getByTestId("depth-panel");
        await expect(panels).toHaveCount(chapter.panels);
        await expect(page.getByTestId("core-takeaway")).toHaveCount(chapter.panels);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);

        if (viewport.width === 390) {
          expect(await panels.evaluateAll((items) => items.every((item) => !(item as HTMLDetailsElement).open))).toBe(true);
          for (const panel of await panels.all()) {
            const box = await panel.locator("summary").boundingBox();
            expect(box?.height).toBeGreaterThanOrEqual(44);
          }
          const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
          expect(pageHeight, `${chapter.name} mobile scan height`).toBeLessThanOrEqual(chapter.mobileMax);
          await expect(page.getByText(chapter.detail, { exact: false }).first()).toBeHidden();
          await expect(page.getByTestId(chapter.progressTestId)).toBeVisible();
        } else {
          await expect.poll(() => panels.evaluateAll((items) => items.every((item) => (item as HTMLDetailsElement).open))).toBe(true);
          await expect(panels.first().locator("summary")).toBeHidden();
          await expect(page.getByText(chapter.detail, { exact: false }).first()).toBeVisible();
          await expect(page.getByTestId("desktop-section-progress")).toBeVisible();
        }
      }
    });

    test(`${chapter.name} retains accessible technical depth`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(chapter.path);

      const firstPanel = page.getByTestId("depth-panel").first();
      const summary = firstPanel.locator("summary");
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(firstPanel).toHaveAttribute("open", "");
      await expect(firstPanel.getByText(chapter.detail, { exact: false }).first()).toBeVisible();

      await summary.press("Enter");
      await expect(firstPanel).not.toHaveAttribute("open", "");
    });
  }

  test("a shared section link lands on a visible core section while depth stays optional", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/youtube/real-time-streaming#trending-design");
    const section = page.locator("#trending-design");
    await expect(section.getByRole("heading", { name: "Trending" })).toBeVisible();
    await expect(section.getByTestId("core-takeaway")).toBeVisible();
    await expect(section.getByTestId("depth-panel")).not.toHaveAttribute("open", "");
  });

  test("the same content switches presentation at the laptop breakpoint", async ({ page }) => {
    await page.setViewportSize({ width: 1023, height: 900 });
    await page.goto("/data-engineering/youtube/real-time-streaming");
    const firstPanel = page.getByTestId("depth-panel").first();
    await expect(firstPanel.locator("summary")).toBeVisible();
    await expect(firstPanel.getByText("Kafka Topics")).toBeHidden();

    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(firstPanel).toHaveAttribute("open", "");
    await expect(firstPanel.locator("summary")).toBeHidden();
    await expect(firstPanel.getByText("Kafka Topics")).toBeVisible();
  });
});
