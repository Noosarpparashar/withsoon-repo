import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Amazon Data Engineering - Data Modeling", () => {
  test("explains the complete commerce dimensional model", async ({ page }) => {
    await page.goto("/data-engineering/amazon/data-modeling");

    await expect(page.getByRole("heading", { name: "One ER diagram for every commerce fact and dimension" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Choose the fact pattern before choosing columns" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Separate product, variant, seller offer, and purchased item" })).toHaveCount(0);

    await page.waitForTimeout(250);
    await page.getByTestId("amazon-model-table-dim_offer").hover();
    await expect(page.getByTestId("amazon-model-inspector")).toContainText("One seller offer version");

    await page.getByTestId("amazon-model-table-fact_inventory_movement").click();
    await expect(page.getByTestId("amazon-model-inspector")).toContainText("One inventory mutation per SKU");

    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page.getByRole("slider", { name: "Diagram zoom" })).toHaveValue("1.08");
  });

  test("has no detectable accessibility violations", async ({ page }) => {
    await page.goto("/data-engineering/amazon/data-modeling");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("has no page-level horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/amazon/data-modeling");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
