import { expect, test } from "@playwright/test";

test.describe("Uber Data Engineering - Event Sources", () => {
  test("renders the complete source-to-fact flow", async ({ page }) => {
    await page.goto("/data-engineering/uber/event-sources");
    await expect(page.getByRole("heading", { name: "Map the event producers" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Standardize every event with shared metadata" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Populate Bronze, Silver, and Gold" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Build one trustworthy trip from 5 producers" })).toBeVisible();
  });

  test("producer and contract cards explain themselves on hover", async ({ page }) => {
    await page.goto("/data-engineering/uber/event-sources");
    await page.getByRole("button", { name: /Payments service/i }).hover();
    await expect(page.getByRole("tooltip", { name: /financially critical/i })).toBeVisible();
    await page.getByRole("button", { name: /event_id/i }).hover();
    await expect(page.getByRole("tooltip", { name: /recognize retries/i })).toBeVisible();
  });

  test("interview insight explanation can be pinned and dismissed", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/data-engineering/uber/event-sources");
    const card = page.locator("#trip-reconciliation > button");
    await card.click();
    const panel = page.getByTestId("explainer-panel");
    await expect(panel).toHaveAttribute("role", "dialog");
    await expect(panel).toContainText(/events can arrive late/i);
    await page.getByTestId("explainer-close").click();
    await expect(panel).toBeHidden();
  });

  test("event source anchors navigate and highlight", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/data-engineering/uber/event-sources");
    await page.getByTestId("stage-nav-population-flow").click();
    await expect(page).toHaveURL(/#population-flow$/);
    await expect(page.getByTestId("stage-nav-population-flow")).toHaveAttribute("aria-current", "location");
  });

  test("mobile layout has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/uber/event-sources");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
