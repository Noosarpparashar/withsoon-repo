import { expect, test } from "@playwright/test";

test.describe("Netflix Data Engineering — section 4 contracts to facts", () => {
  test.use({ viewport: { width: 1600, height: 1200 } });

  test("loads the renamed chapter and shows the new anchors", async ({ page }) => {
    const res = await page.goto("/system-design/netflix-data-engineering/ingestion-kafka#contracts-envelope");
    expect(res?.status()).toBeLessThan(400);

    await expect(page.getByRole("heading", { name: /Make one event contract every downstream system can trust/i })).toBeVisible();
    await expect(page.getByText(/Event Contracts/i).first()).toBeVisible();
    await expect(page.getByTestId("stage-nav-contracts-envelope")).toBeVisible();
  });

  test("event envelope interaction updates the active detail", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/ingestion-kafka#contracts-envelope");
    await page.getByRole("button", { name: /ingestion_time/i }).first().click();
    await expect(page.getByText(/Measures source-to-platform delay/i)).toBeVisible();
    await expect(page.getByText(/late events, quarantine rules, or freshness dashboards/i)).toBeVisible();
  });

  test("controls interaction updates the active control detail", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/ingestion-kafka#contracts-controls");
    await page.getByRole("button", { name: /Late data \+ duplicates/i }).hover();
    await expect(page.getByText(/Use event_id for business dedup/i)).toBeVisible();
    await expect(page.getByText(/very-late -> correction path/i)).toBeVisible();
  });
});
