import { expect, test } from "@playwright/test";

test.describe("WhatsApp Data Engineering - Data Modeling", () => {
  test("renders the complete WhatsApp fact and dimension model", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/data-modeling");

    await expect(page.getByRole("heading", { name: "Data Modeling", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "One ER diagram for every fact and dimension" })).toBeVisible();
    await expect(page.getByText("10", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("11", { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId("whatsapp-model-table-fact_message_delivery")).toBeVisible();
    await expect(page.getByTestId("whatsapp-model-table-fact_call_quality_minute")).toBeVisible();
    await expect(page.getByTestId("whatsapp-model-table-fact_regional_capacity_5m")).toBeVisible();
    await expect(page.getByTestId("whatsapp-model-table-dim_failure_reason")).toBeVisible();
  });

  test("updates the desktop explanation and relationship focus on hover", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/data-engineering/whatsapp/data-modeling");
    const inspector = page.getByTestId("whatsapp-model-inspector");

    await expect(inspector).toContainText("fact_message_delivery");
    await expect(inspector).toContainText(/logical message × one eligible recipient device/i);

    await page.getByTestId("whatsapp-model-table-fact_call_quality_minute").hover();
    await expect(inspector).toContainText("fact_call_quality_minute");
    await expect(inspector).toContainText(/call × participant device × bounded quality minute/i);
    await expect(inspector).toContainText(/never storing audio or video/i);
    await expect(page.getByTestId("whatsapp-model-table-fact_call_quality_minute")).toHaveAttribute("aria-pressed", "true");
  });

  test("keeps the full model as the default and supports controlled zoom", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/data-engineering/whatsapp/data-modeling");

    await expect(page.getByText("100%", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Zoom in WhatsApp ER diagram" }).click();
    await expect(page.getByText("108%", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "RESET" }).click();
    await expect(page.getByText("100%", { exact: true })).toBeVisible();
  });

  test("supports tap explanations on mobile without page overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/whatsapp/data-modeling");
    const inspector = page.getByTestId("mobile-whatsapp-model-inspector");

    await page.getByTestId("whatsapp-model-table-fact_status_view").click();
    await expect(inspector).toContainText("fact_status_view");
    await expect(inspector).toContainText(/status item × one privacy-safe viewer device view/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    expect(await page.getByTestId("whatsapp-model-canvas").evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  });
});
