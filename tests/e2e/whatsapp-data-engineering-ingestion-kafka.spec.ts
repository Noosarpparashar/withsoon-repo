import { expect, test } from "@playwright/test";

test.describe("WhatsApp Data Engineering - Ingestion and Kafka", () => {
  test("renders the complete ingestion decision flow", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/ingestion-kafka");

    await expect(page.getByRole("heading", { name: "Commit the WhatsApp action before publishing its event" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Choose a key from the ordering each WhatsApp fact needs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Size partitions from bytes and consumer work" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Make retries safe and keep analytics off the message path" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Keep Kafka long enough to recover—not forever" })).toBeVisible();
  });

  test("explains the outbox handoff in WhatsApp terms", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/ingestion-kafka");
    const explanation = page.getByTestId("whatsapp-handoff-explanation");

    await page.getByTestId("whatsapp-handoff-1").hover();
    await expect(explanation).toContainText("Write the outbox record");
    await expect(explanation).toContainText(/dual-write gap/i);

    await page.getByTestId("whatsapp-handoff-3").click();
    await expect(explanation).toContainText(/does not mean the recipient's phone received/i);
  });

  test("changes partition explanations for WhatsApp workloads", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/ingestion-kafka#kafka-topics");
    const explanation = page.getByTestId("whatsapp-topic-explanation");

    await page.getByTestId("whatsapp-topic-1").hover();
    await expect(explanation).toContainText("Recipient delivery");
    await expect(explanation).toContainText(/hundreds or thousands of recipient-device facts/i);

    await page.getByTestId("whatsapp-topic-4").focus();
    await expect(explanation).toContainText(/sampling surge cannot consume the capacity/i);
  });

  test("shows reconciled capacity formulas", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/ingestion-kafka#kafka-capacity");

    await expect(page.getByText("21.412M/s", { exact: true })).toBeVisible();
    await expect(page.getByText("13.918 GB/s", { exact: true })).toBeVisible();
    await expect(page.getByText(/max\(1,810 byte lanes, 557 processing lanes\) = 1,810/i)).toBeVisible();
    await expect(page.getByText("54.28 GB/s", { exact: true })).toBeVisible();
  });

  test("distinguishes Kafka replay from Bronze history", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/ingestion-kafka#kafka-retention");
    await expect(page.getByText("3–7 days", { exact: true })).toBeVisible();
    await expect(page.getByText(/Kafka is the hot transport log; Bronze is the long-lived replay evidence/i)).toBeVisible();
  });

  test("page anchors work and the mobile page does not overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/whatsapp/ingestion-kafka");
    await page.getByTestId("mobile-section-kafka-capacity").click();
    await expect(page).toHaveURL(/#kafka-capacity$/);
    await expect(page.getByTestId("mobile-section-kafka-capacity")).toHaveAttribute("aria-current", "location");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
