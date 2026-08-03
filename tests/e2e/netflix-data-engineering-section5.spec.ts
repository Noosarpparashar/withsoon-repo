import { expect, test } from "@playwright/test";

test.describe("Netflix Data Engineering — section 5 streaming", () => {
  test.use({ viewport: { width: 1600, height: 1200 } });

  test("flink jobs are shown as a compact selector with one detail panel", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/real-time-streaming#rt-jobs");
    await expect(page.getByRole("heading", { name: /Visualize the near-real-time processing layer/i })).toBeVisible();
    await page.getByRole("button", { name: /Trending Content Detector/i }).click();
    await expect(page.getByText(/Redis sorted sets \/ Pinot trending feeds/i)).toBeVisible();
    await expect(page.getByText(/Traffic bursts or skew around blockbuster launches can overload hot keys/i)).toBeVisible();
  });

  test("session scenarios use compact tabs and update the detail panel", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/real-time-streaming#rt-session");
    await page.getByRole("button", { name: /App crashes/i }).click();
    await expect(page.getByText(/Pause or stop never arrives/i)).toBeVisible();
    await expect(page.getByText(/Session auto-closes after inactivity timeout/i)).toBeVisible();
  });
});
