import { expect, test } from "@playwright/test";

test.describe("Uber Data Engineering - Failures and Data Quality", () => {
  test("renders the complete combined chapter", async ({ page }) => {
    await page.goto("/data-engineering/uber/governance-quality");
    await expect(
      page.getByRole("heading", { name: "Failures + Data Quality" }),
    ).toBeVisible();
    for (const heading of [
      "Quality SLOs",
      "Failure response",
      "Quality gates",
      "Replay and recovery",
    ]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
  });

  test("explains Uber-specific incidents on hover", async ({ page }) => {
    await page.goto("/data-engineering/uber/governance-quality");
    await page.getByRole("button", { name: /Kafka region outage/i }).hover();
    await expect(page.getByText(/paired regional cluster/i)).toBeVisible();
    await expect(page.getByText(/retained offsets/i)).toBeVisible();

    await page.getByRole("button", { name: /Breaking app schema/i }).hover();
    await expect(page.getByText(/Schema-registry rejection/i)).toBeVisible();
    await expect(page.getByText(/canary mobile releases/i)).toBeVisible();
  });

  test("switches quality gates and recovery runbooks", async ({ page }) => {
    await page.goto("/data-engineering/uber/governance-quality");
    await page.getByRole("button", { name: /Before publish Gold/i }).hover();
    await expect(page.getByText(/last-good snapshot/i)).toBeVisible();
    await expect(page.getByText(/candidate snapshot/i)).toBeVisible();

    await page.getByRole("button", { name: "Regional disaster" }).click();
    await expect(
      page.getByText(/paired cluster and last-known live state/i),
    ).toBeVisible();
    await expect(page.getByText(/Define RPO\/RTO per workload/i)).toBeVisible();
  });

  test("anchors navigate and mobile does not overflow", async ({ page }) => {
    await page.goto("/data-engineering/uber/governance-quality");
    await page.getByTestId("stage-nav-replay-recovery").click();
    await expect(page).toHaveURL(/#replay-recovery$/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });
});
