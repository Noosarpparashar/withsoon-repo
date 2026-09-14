import { expect, test } from "@playwright/test";

test.describe("Uber Data Engineering - Batch and Lakehouse", () => {
  test("renders the complete batch chapter and SVG flow", async ({ page }) => {
    await page.goto("/data-engineering/uber/batch-pipelines");
    await expect(
      page.getByRole("heading", { name: "Uber lakehouse flow" }),
    ).toBeVisible();
    await expect(page.getByTestId("batch-architecture-flow")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Uber layer contracts" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Uber batch DAGs" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Gold certification" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Versioned backfill" }),
    ).toBeVisible();
  });

  test("shows an Uber-specific description for every flow block", async ({
    page,
  }) => {
    await page.goto("/data-engineering/uber/batch-pipelines");
    await page.getByRole("button", { name: /Gold: Reconciled facts/i }).hover();
    await expect(page.getByTestId("batch-node-inspector")).toContainText(
      "rider request, dispatch match, driver lifecycle",
    );
    await page
      .getByRole("button", { name: /Silver: Conformed events/i })
      .hover();
    await expect(page.getByTestId("batch-node-inspector")).toContainText(
      "300 km/h",
    );
  });

  test("shows all contracts below compact separated layer tabs", async ({
    page,
  }) => {
    await page.goto("/data-engineering/uber/batch-pipelines");
    const bronze = page.getByTestId("layer-heading-bronze");
    const silver = page.getByTestId("layer-heading-silver");
    const gold = page.getByTestId("layer-heading-gold");

    await expect(
      page.getByText("location_pings_raw", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("location_pings_clean", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("payment_settlement_fact", { exact: true }),
    ).toBeVisible();

    const boxes = await Promise.all(
      [bronze, silver, gold].map((tab) => tab.boundingBox()),
    );
    expect(boxes.every((box) => box?.height === 48)).toBe(true);
    expect(
      (boxes[1]?.x ?? 0) - ((boxes[0]?.x ?? 0) + (boxes[0]?.width ?? 0)),
    ).toBeGreaterThan(0);
  });

  test("anchors navigate and mobile layout does not overflow", async ({
    page,
  }) => {
    await page.goto("/data-engineering/uber/batch-pipelines");
    await page.getByTestId("stage-nav-audited-backfill").click();
    await expect(page).toHaveURL(/#audited-backfill$/);
    await expect(
      page.getByTestId("stage-nav-audited-backfill"),
    ).toHaveAttribute("aria-current", "location");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.reload();
    const diagram = page.getByTestId("batch-architecture-flow");
    expect(
      await diagram.evaluate((node) => node.scrollWidth > node.clientWidth),
    ).toBe(false);
  });
});
