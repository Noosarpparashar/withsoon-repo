import { expect, test } from "@playwright/test";

test.describe("WhatsApp Data Engineering - Event Sources", () => {
  test("renders the complete producer-to-trusted-fact chapter", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/event-sources");

    await expect(page.getByRole("heading", { name: "Map the WhatsApp event producers" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Standardize metadata without exposing message content" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Turn separate WhatsApp events into one delivery fact" })).toBeVisible();
    await expect(page.getByText("What reconciliation means")).toBeVisible();
  });

  test("producer and contract cards reveal WhatsApp-specific explanations", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/event-sources");

    await page.getByRole("button", { name: /Group service/i }).hover();
    await expect(page.getByText(/Keep two facts/i)).toBeVisible();
    await expect(page.getByText(/membership version at send time/i)).toBeVisible();

    await page.getByRole("button", { name: /Call signaling \+ quality/i }).hover();
    await expect(page.getByText(/baseline-aware alert/i)).toBeVisible();

    await page.getByRole("button", { name: "event_time When it happened", exact: true }).hover();
    await expect(page.getByText(/belongs to the 10:00 message journey/i)).toBeVisible();
  });

  test("multi-device reconciliation preserves device grain", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/event-sources");
    await page.getByRole("button", { name: "Multi-device", exact: true }).click();

    await page.getByRole("button", { name: /Device registry eligible devices/i }).hover();
    await expect(page.getByText(/current-state lookup would incorrectly include devices/i)).toBeVisible();
    await page.getByRole("button", { name: "point-in-time device join", exact: true }).hover();
    await expect(page.getByText(/never the device list that happens to exist/i)).toBeVisible();
    await expect(page.getByText(/user-level projection/i)).toBeVisible();
    await expect(page.getByText(/Do not collapse device events too early/i)).toBeVisible();
  });

  test("group reconciliation explains every evidence field and rule", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/event-sources");
    await page.getByRole("button", { name: "Group fan-out", exact: true }).click();

    await page.getByRole("button", { name: /Group service membership_version at send/i }).hover();
    await expect(page.getByText(/Freezes who was eligible/i)).toBeVisible();
    await page.getByRole("button", { name: "bucket hot groups", exact: true }).hover();
    await expect(page.getByText(/deterministic buckets/i)).toBeVisible();
  });

  test("mobile layout has no page-level horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/whatsapp/event-sources");

    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
