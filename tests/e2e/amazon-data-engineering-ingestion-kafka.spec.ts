import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Amazon Data Engineering - Ingestion and Kafka", () => {
  test("explains handoff, partitioning, capacity, reliability, and replay", async ({ page }) => {
    await page.goto("/data-engineering/amazon/ingestion-kafka");

    await expect(page.getByRole("heading", { name: "Commit the commerce action before publishing its event" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Choose a key from the ordering each commerce fact needs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Size Kafka from events, bytes, and consumer work" })).toBeVisible();

    await page.waitForTimeout(250);
    await page.getByTestId("amazon-handoff-1").hover();
    await expect(page.getByTestId("amazon-handoff-explanation")).toContainText("dual-write gap");

    await page.getByTestId("amazon-topic-2").click();
    await expect(page.getByTestId("amazon-topic-explanation")).toContainText("flash-deal SKU");

    await expect(page.getByText("416,666.67/s", { exact: true })).toBeVisible();
    await expect(page.getByText(/55 minimum baseline lanes/i)).toBeVisible();

    await page.getByTestId("amazon-control-2").click();
    await expect(page.getByTestId("amazon-control-explanation")).toContainText("revenue += amount");
  });

  test("has no detectable accessibility violations", async ({ page }) => {
    await page.goto("/data-engineering/amazon/ingestion-kafka");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("has no page-level horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/amazon/ingestion-kafka");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
