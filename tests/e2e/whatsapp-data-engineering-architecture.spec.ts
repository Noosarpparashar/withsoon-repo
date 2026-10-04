import { expect, test } from "@playwright/test";

test.describe("WhatsApp Data Engineering - Architecture", () => {
  test("renders the complete architecture chapter", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/architecture");

    await expect(page.getByRole("heading", { name: "One regional backbone, two processing paths" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Keep messaging available when analytics is unhealthy" })).toBeVisible();
    await expect(page.getByTestId("whatsapp-architecture-inspector")).toContainText("Kafka / Pulsar");
  });

  test("every architecture node has a persistent detailed explanation", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/architecture");
    const inspector = page.getByTestId("whatsapp-architecture-inspector");

    await page.getByTestId("whatsapp-architecture-node-groupDevice").hover();
    await expect(inspector).toContainText("Group + device state");
    await expect(inspector).toContainText(/membership version/i);

    await page.getByTestId("whatsapp-architecture-node-flink").hover();
    await expect(inspector).toContainText("Flink streaming");
    await expect(inspector).toContainText(/phones can be offline and upload events late/i);

    await page.getByTestId("whatsapp-architecture-node-governance").click();
    await expect(inspector).toContainText(/deletion evidence/i);
  });

  test("system boundary explains analytics failure isolation", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/architecture");
    await page.getByRole("button", { name: /WhatsApp analytics platform/i }).hover();

    await expect(page.getByText(/Millions of message_delivered events/i)).toBeVisible();
    await expect(page.getByText(/cannot declare that a live message was delivered/i)).toBeVisible();
  });

  test("mobile architecture has no page-level horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/whatsapp/architecture");

    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
