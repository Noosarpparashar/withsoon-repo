import { expect, test } from "@playwright/test";

const ROUTES = [
  "/data-engineering/uber/start-here",
  "/data-engineering/uber/requirements",
  "/data-engineering/uber/event-sources",
  "/data-engineering/uber/architecture",
  "/data-engineering/uber/ingestion-kafka",
  "/data-engineering/uber/batch-pipelines",
  "/data-engineering/uber/data-modeling",
  "/data-engineering/uber/governance-quality",
  "/data-engineering/uber/quiz",
  "/data-engineering/youtube/start-here",
  "/data-engineering/youtube/requirements",
  "/data-engineering/youtube/event-sources",
  "/data-engineering/youtube/architecture",
  "/data-engineering/youtube/ingestion-kafka",
  "/data-engineering/youtube/real-time-streaming",
  "/data-engineering/youtube/data-modeling",
  "/data-engineering/youtube/batch-lakehouse",
  "/data-engineering/youtube/governance-quality",
] as const;

test.describe("Mobile page-section navigation", () => {
  for (const route of ROUTES) {
    test(`${route} exposes and announces every section`, async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: "reduce" });

      for (const width of [360, 768]) {
        await page.setViewportSize({ width, height: 900 });
        const response = await page.goto(route);
        expect(response?.status(), `${route} should load at ${width}px`).toBeLessThan(400);

        const nav = page.getByTestId("mobile-section-nav");
        await expect(nav, `section navigation should be visible at ${width}px`).toBeVisible();
        await expect(nav).toHaveAttribute("aria-label", "Sections on this page");

        const buttons = nav.locator("button[data-mobile-section-id]");
        const count = await buttons.count();
        expect(count, `${route} should expose its section anchors`).toBeGreaterThan(0);

        for (let index = 0; index < count; index += 1) {
          const button = buttons.nth(index);
          const sectionId = await button.getAttribute("data-mobile-section-id");
          expect(sectionId).toBeTruthy();

          await button.scrollIntoViewIfNeeded();
          if (testInfo.project.name === "mobile") await button.tap();
          else await button.click();

          await expect(page).toHaveURL(new RegExp(`#${sectionId}$`));
          await expect(button).toHaveAttribute("aria-current", "location");
          await expect(nav.locator('[aria-live="polite"]')).toContainText(
            `Current section: ${(await button.innerText()).replace(/^\d+\s*/, "")}`,
          );

          const target = page.locator(`#${sectionId}`);
          await expect(target).toBeAttached();
          await expect
            .poll(async () => {
              const box = await target.boundingBox();
              return Boolean(box && box.y < 900 && box.y + box.height > 0);
            })
            .toBe(true);
        }
      }
    });
  }
});
