import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Amazon Data Engineering - Event Sources", () => {
  test("explains sources, contracts, and lifecycle reconciliation", async ({ page }) => {
    await page.goto("/data-engineering/amazon/event-sources");

    await expect(page.getByRole("heading", { name: "Map the commerce event producers" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Standardize the wrapper, preserve domain meaning" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Turn independent evidence into one trustworthy fact" })).toBeVisible();

    await page.waitForTimeout(250);
    await page.getByTestId("amazon-event-source-pay").hover();
    await expect(page.getByLabel("Payments + ledger explanation")).toContainText("processor settlement");

    await page.getByTestId("amazon-contract-field-6").click();
    await expect(page.getByLabel("amount_minor + currency explanation")).toContainText("integer minor units");

    await page.getByRole("button", { name: "Payment + settlement", exact: true }).click();
    await expect(page.getByText(/immutable payment-transaction ledger/i)).toBeVisible();
  });

  test("has no detectable accessibility violations", async ({ page }) => {
    await page.goto("/data-engineering/amazon/event-sources");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("has no page-level horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/amazon/event-sources");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
