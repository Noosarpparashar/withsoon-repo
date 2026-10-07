import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Amazon Data Engineering - Architecture", () => {
  test("explains the complete architecture and its boundaries", async ({ page }) => {
    await page.goto("/data-engineering/amazon/architecture");

    await expect(page.getByRole("heading", { name: "Follow a fact from checkout to a decision" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Keep the lakehouse off the checkout path" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Design the recovery path before the happy path fails" })).toBeVisible();

    await expect(page.getByTestId("amazon-architecture-node-kafka")).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(250);
    await page.getByTestId("amazon-architecture-node-flink").hover();
    await expect(page.getByLabel("Flink streaming explanation")).toContainText("event time and watermarks");

    await page.getByRole("button", { name: /Transaction plane/i }).click();
    await expect(page.getByText(/customer buys three items/i)).toBeVisible();

    await page.getByRole("button", { name: /Bad Gold deployment/i }).click();
    await expect(page.getByText(/last certified snapshot/i)).toBeVisible();
  });

  test("has no detectable accessibility violations", async ({ page }) => {
    await page.goto("/data-engineering/amazon/architecture");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("has no page-level horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/amazon/architecture");

    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
