import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Amazon Data Engineering - Batch and Lakehouse", () => {
  test("explains the lakehouse, physical layout, batch compute, and publication", async ({ page }) => {
    await page.goto("/data-engineering/amazon/batch-lakehouse");

    await expect(page.getByRole("heading", { name: "Source evidence → trusted facts → certified products" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Give Bronze, Silver, and Gold one promise each" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Design Iceberg around grain and query shape" })).toBeVisible();

    await page.waitForTimeout(250);
    await page.getByTestId("amazon-lakehouse-node-commit").hover();
    await expect(page.getByLabel("Atomic Iceberg publish explanation")).toContainText("half a day");

    await page.getByTestId("amazon-layout-2").click();
    await expect(page.getByLabel("silver.click_event layout explanation")).toContainText("billions of sessions");

    await expect(page.getByText(/97,656.25 → about 100K splits/i)).toBeVisible();
    await expect(page.getByText(/live and historical writers use separate branches or shadow tables/i)).toBeVisible();
  });

  test("has no detectable accessibility violations", async ({ page }) => {
    await page.goto("/data-engineering/amazon/batch-lakehouse");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("has no page-level horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/amazon/batch-lakehouse");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
