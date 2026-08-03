import { expect, test } from "@playwright/test";

test.describe("Netflix Data Engineering — section 6 modeling", () => {
  test.use({ viewport: { width: 1600, height: 1200 } });

  test("ER diagram updates the inspector when tables and columns are hovered", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/data-modeling#model-erd");

    await expect(page.getByRole("heading", { name: /See the trusted tables, columns, and joins in one schema canvas/i })).toBeVisible();

    await page.getByRole("button", { name: "dim_content", exact: true }).hover();
    await expect(page.getByText(/Prepared from the catalog master and title metadata services/i)).toBeVisible();

    await page.getByRole("button", { name: "fact_watch_session completion_pct" }).hover();
    await expect(
      page.locator("div").filter({ hasText: /^unique_content_seconds_watched \/ content_duration_seconds \* 100$/ }),
    ).toBeVisible();
    await expect(page.getByText(/completion_pct \(DECIMAL\(5,2\)\)/i)).toBeVisible();
  });
});
