import { expect, test } from "@playwright/test";

test.describe("Uber Data Engineering - Data Modeling", () => {
  test("renders the three modeling sections", async ({ page }) => {
    await page.goto("/data-engineering/uber/data-modeling");
    await expect(page.getByTestId("uber-model-erd")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Fact grains" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Conformed dimensions" }),
    ).toBeVisible();
    await expect(page.getByText("History + bridges")).toHaveCount(0);
    await expect(page.getByText("Aggregate marts")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /Warehouse \/ Serving/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", {
        name: /Next chapter Failures \+ Data Quality/i,
      }),
    ).toHaveAttribute("href", "/data-engineering/uber/governance-quality");
  });

  test("shows complete fact and dimension details on hover", async ({
    page,
  }) => {
    await page.goto("/data-engineering/uber/data-modeling");
    await page
      .getByRole("button", { name: "Inspect fact_location_ping" })
      .hover();
    const inspector = page.getByTestId("model-table-inspector");
    const inspectorBox = await inspector.boundingBox();
    const viewport = page.viewportSize();
    expect(inspectorBox).not.toBeNull();
    expect(inspectorBox!.y).toBeGreaterThanOrEqual(140);
    expect(inspectorBox!.y + inspectorBox!.height).toBeLessThanOrEqual(
      viewport!.height - 15,
    );
    const explanationSlot = page.getByTestId("model-explanation-slot");
    expect(
      await explanationSlot.evaluate(
        (node) =>
          node.scrollHeight > node.clientHeight ||
          node.scrollWidth > node.clientWidth,
      ),
    ).toBe(false);
    await expect(inspector).toContainText("location_event_id");
    await expect(inspector).toContainText("driver_key");
    await expect(inspector).toContainText("latitude");

    await page.getByRole("button", { name: "Inspect dim_driver" }).hover();
    await expect(inspector).toContainText("driver_key");
    await expect(inspector).toContainText("SCD2");
    await expect(inspector).toContainText("driver_id");
  });

  test("switches ERD domains and inspects keys and columns", async ({
    page,
  }) => {
    await page.goto("/data-engineering/uber/data-modeling");
    const erd = page.getByTestId("uber-model-erd");
    await expect(erd).toHaveAttribute("data-view", "trip");
    const tripAccent = await erd.getAttribute("data-accent");
    await page.getByRole("button", { name: "Finance + driver" }).click();
    await expect(erd).toHaveAttribute("data-view", "finance");
    expect(await erd.getAttribute("data-accent")).not.toBe(tripAccent);
    await page
      .getByRole("button", { name: /fact_payment_transaction, fact/i })
      .hover();
    const inspector = page.getByTestId("model-table-inspector");
    await expect(inspector).toContainText("payment_transaction_key");
    await expect(inspector).toContainText("gross_amount");
    await expect(inspector).toContainText("payment_method_key");
    await page
      .getByRole("button", { name: /dim_currency, dimension/i })
      .hover();
    await expect(inspector).toContainText("currency_key");
    await expect(inspector).toContainText("ISO currency");
    const canvas = page.getByTestId("model-erd-canvas");
    expect(
      await canvas.evaluate((node) => node.scrollWidth > node.clientWidth),
    ).toBe(false);
  });

  test("anchors work and mobile page does not overflow", async ({ page }) => {
    await page.goto("/data-engineering/uber/data-modeling");
    await page.getByTestId("stage-nav-model-dimensions").click();
    await expect(page).toHaveURL(/#model-dimensions$/);
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

  test("merges the former Failures chapter into Data Quality", async ({
    page,
  }) => {
    await page.goto("/data-engineering/uber/data-modeling");
    await expect(
      page.getByRole("link", { name: /08 Failures \+ Data Quality/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^09 Failures$/i }),
    ).toHaveCount(0);

    await page.goto("/data-engineering/uber/failures");
    await expect(page).toHaveURL(/\/data-engineering\/uber\/governance-quality$/);
    await expect(
      page.getByRole("heading", { name: /Failures \+ Data Quality/i }),
    ).toBeVisible();
  });
});
