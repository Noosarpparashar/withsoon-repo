import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const UBER_CHAPTERS = [
  "start-here",
  "requirements",
  "event-sources",
  "architecture",
  "ingestion-kafka",
  "batch-pipelines",
  "data-modeling",
  "governance-quality",
  "quiz",
] as const;

const YOUTUBE_CHAPTERS = [
  "start-here",
  "requirements",
  "event-sources",
  "architecture",
  "ingestion-kafka",
  "real-time-streaming",
  "data-modeling",
  "batch-lakehouse",
  "governance-quality",
] as const;

const ROUTES = [
  "/",
  ...UBER_CHAPTERS.map((chapter) => `/data-engineering/uber/${chapter}`),
  ...YOUTUBE_CHAPTERS.map((chapter) => `/data-engineering/youtube/${chapter}`),
];

test.describe("Primary content landmarks", () => {
  for (const route of ROUTES) {
    test(`${route} exposes one top-level main landmark`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status(), `${route} should load`).toBeLessThan(400);

      const mainLandmarks = page.locator('main, [role="main"]');
      await expect(mainLandmarks, `${route} should have exactly one main`).toHaveCount(1);

      const nestedMainCount = await mainLandmarks.evaluateAll((landmarks) =>
        landmarks.filter((landmark) => landmark.parentElement?.closest('main, [role="main"]')).length,
      );
      expect(nestedMainCount, `${route} should not nest its main landmark`).toBe(0);

      const results = await new AxeBuilder({ page })
        .withRules([
          "landmark-one-main",
          "landmark-no-duplicate-main",
          "landmark-main-is-top-level",
        ])
        .analyze();

      expect(results.violations, `${route} landmark violations`).toEqual([]);
    });
  }
});
