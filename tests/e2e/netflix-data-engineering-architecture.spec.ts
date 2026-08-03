import { expect, test } from "@playwright/test";

test.describe("Netflix Data Engineering — Architecture high-level diagram", () => {
  test.use({ viewport: { width: 1600, height: 1200 } });

  test("loads the single architecture map section", async ({ page }) => {
    const res = await page.goto("/system-design/netflix-data-engineering/architecture#arch-layered");
    expect(res?.status()).toBeLessThan(400);

    await expect(page).toHaveURL(/\/system-design\/netflix-data-engineering\/architecture#arch-layered/);
    await expect(page.getByRole("heading", { name: /Trace the shared data platform in one clean architecture map/i })).toBeVisible();
    await expect(page.getByTestId("architecture-high-level-flow")).toBeVisible();
  });

  test("hovering a node updates the detail panel", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/architecture#arch-layered");
    const kafkaNode = page.locator('[data-id="kafka"]').first();
    await expect(kafkaNode).toBeVisible();
    await kafkaNode.focus();

    const panel = page.getByTestId("architecture-detail-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/Apache Kafka/i);
    await expect(panel).toContainText(/Kafka is the Keystone transport backbone/i);
  });

  test("diagram shows the key architecture layers", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/architecture#arch-layered");

    await expect(page.locator('[data-id="kafka"]')).toContainText(/1M msg\/sec hot topics/i);
    await expect(page.locator('[data-id="microservices"]')).toContainText(/Microservices tier/i);
    await expect(page.locator('[data-id="lakehouse"]')).toContainText(/ACID, schema evolution, time travel/i);
    await expect(page.locator('[data-id="consumption"]')).toContainText(/Consumption layer/i);
  });

  test("architecture map lives inside the scrollable shell", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/architecture#arch-layered");

    const shell = page.locator(".flex-1.overflow-y-auto.relative.no-scrollbar").first();
    const metrics = await shell.evaluate((node) => ({
      scrollHeight: node.scrollHeight,
      clientHeight: node.clientHeight,
    }));

    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  });
});
