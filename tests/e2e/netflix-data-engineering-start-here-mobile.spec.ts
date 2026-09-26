import { expect, test } from "@playwright/test";

const sections = [
  ["platform-mission", "Platform mission", "Design the shared data platform"],
  ["requirements-snapshot", "Requirements", "Keep the requirements light"],
  ["scope-boundary", "Scope", "Go deep on one clean slice"],
  ["freshness-map", "Freshness map", "Real-time needs numbers"],
  ["handoff", "Handoff", "Short handoff"],
] as const;

test.describe("Netflix Start Here on touch mobile", () => {
  test.use({ hasTouch: true, isMobile: true });

  for (const width of [360, 390, 430]) {
    test(`exposes the complete lesson and tap explanations at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      const response = await page.goto("/data-engineering/netflix/start-here#platform-mission");

      expect(response?.status()).toBeLessThan(400);
      await expect(page.getByTestId("platform-mission-visual")).toBeVisible();

      for (const [id, , heading] of sections) {
        await expect(page.locator(`#${id}`)).toBeVisible();
        await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      }

      const playbackCard = page
        .locator('#platform-mission button[aria-haspopup="dialog"]')
        .filter({ hasText: "Playback" });
      await expect(playbackCard).toHaveAttribute("aria-expanded", "false");
      await playbackCard.tap();

      const explanation = page.getByRole("dialog", { name: "Playback" });
      await expect(explanation).toBeVisible();
      await expect(explanation).toContainText("Playback is the stream of actions produced during viewing");
      await expect(playbackCard).toHaveAttribute("aria-expanded", "true");

      await page.keyboard.press("Escape");
      await expect(explanation).toBeHidden();

      for (const [id, label, heading] of sections) {
        await page.getByRole("button", { name: "Open outline" }).tap();
        const outline = page.getByRole("dialog", { name: "Page outline" });
        await outline.getByRole("button", { name: new RegExp(label, "i") }).tap();
        await expect(page).toHaveURL(new RegExp(`#${id}$`));
        await expect(page.getByRole("heading", { name: heading })).toBeInViewport();
      }

      const layout = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        contentWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    });
  }
});
