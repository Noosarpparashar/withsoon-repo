import { expect, test } from "@playwright/test";

test.describe("Netflix Data Engineering — Requirements estimation rebuild", () => {
  test.use({ viewport: { width: 1600, height: 1200 } });

  test("loads the estimation story section", async ({ page }) => {
    const res = await page.goto("/system-design/netflix-data-engineering/requirements#req-scope");
    expect(res?.status()).toBeLessThan(400);

    await expect(page).toHaveURL(/\/system-design\/netflix-data-engineering\/requirements#req-scope/);
    await expect(page.getByRole("heading", { name: /Show the math path before the answer/i })).toBeVisible();
    await expect(page.getByTestId("requirements-estimation-flow")).toBeVisible();
  });

  test("page anchor navigation reaches board formulas", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/requirements");
    await page.getByTestId("stage-nav-req-nfr").click();

    await expect(page).toHaveURL(/#req-nfr/);
    await expect(page.getByRole("heading", { name: /Write only the formulas you can defend on the board/i })).toBeVisible();
  });

  test("clicking a baseline assumption updates the explanation drawer", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/requirements#req-scale");
    await page.getByRole("button", { name: /Peak factor/i }).click();

    await expect(page.getByText(/Real systems are not sized only for the daily average/i)).toBeVisible();
  });

  test("clicking a formula reveals its meaning and example", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/requirements#req-nfr");
    await page.getByRole("button", { name: /Storage required/i }).click();

    await expect(page.getByText(/20 TB\/day × 365 × 1\.0 × 3 ≈ 21\.9 PB\/year/i)).toBeVisible();
    await expect(page.getByText(/Long-term cost comes from retention and fan-out/i)).toBeVisible();
  });

  test("storage sizing stays on the same baseline model", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/requirements#req-say");
    await expect(page.getByText(/Using the 20 TB\/day baseline, 20 × 365 ≈ 7\.3 PB\/year/i)).toBeVisible();
    await expect(page.getByText(/If raw output lands around 20 TB\/day, then a year of retained raw copies is already around 7\.3 PB\/year/i)).toBeVisible();
  });
});
