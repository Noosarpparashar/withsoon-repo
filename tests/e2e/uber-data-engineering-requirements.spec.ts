import { expect, test } from "@playwright/test";

test.describe("Uber Data Engineering - Requirements", () => {
  test("renders the complete capacity story", async ({ page }) => {
    await page.goto("/system-design/uber/requirements");
    await expect(page.getByRole("heading", { name: "State the scale before drawing boxes" })).toBeVisible();
    await expect(page.getByText("2M × 1/4s = 500K/sec", { exact: true })).toBeVisible();
    await expect(page.getByText("8.6 TB/day", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Treat location streaming as first-class" })).toBeVisible();
  });

  test("explains estimates on hover", async ({ page }) => {
    await page.goto("/system-design/uber/requirements");
    await page.getByRole("button", { name: /25M–40M DAU/i }).hover();
    await expect(page.getByRole("tooltip", { name: /25M daily riders is roughly 20%/i })).toBeVisible();

    await page.getByRole("button", { name: /Driver GPS/i }).hover();
    await expect(page.getByRole("tooltip", { name: /2M ÷ 4 = 500K/i })).toBeVisible();

    await page.getByRole("button", { name: /Location stream/i }).hover();
    await expect(page.getByRole("tooltip", { name: /latitude, longitude, driver_id/i })).toBeVisible();

    await page.getByRole("button", { name: /Kafka partitions/i }).hover();
    await expect(page.getByRole("tooltip", { name: /100 MB\/s comes from 500K/i })).toBeVisible();
  });

  test("requirements anchors navigate and highlight", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/system-design/uber/requirements");
    await page.getByTestId("stage-nav-storage-math").click();
    await expect(page).toHaveURL(/#storage-math$/);
    await expect(page.getByTestId("stage-nav-storage-math")).toHaveAttribute("aria-current", "location");
  });

  test("mobile layout has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/system-design/uber/requirements");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
