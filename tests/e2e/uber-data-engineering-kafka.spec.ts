import { expect, test } from "@playwright/test";

test.describe("Uber Data Engineering - Ingestion and Kafka", () => {
  test("renders the complete Uber ingestion decision flow", async ({
    page,
  }) => {
    await page.goto("/system-design/uber/ingestion-kafka");
    await expect(
      page.getByRole("heading", { name: "Event format" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Partition keys" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Capacity planning" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Reliability controls" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "GPS retention" }),
    ).toBeVisible();
  });

  test("continues directly to the renumbered Batch and Lakehouse chapter", async ({
    page,
  }) => {
    await page.goto("/system-design/uber/ingestion-kafka");
    await expect(page.getByText("10 chapters", { exact: true })).toBeVisible();
    const batchChapter = page.getByRole("link", {
      name: /06 Batch \+ Lakehouse/i,
    });
    await expect(batchChapter).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Next chapter Batch \+ Lakehouse/i }),
    ).toHaveAttribute("href", "/system-design/uber/batch-pipelines");
    await expect(
      page.getByRole("link", { name: /Real-Time Streaming/i }),
    ).toHaveCount(0);
  });

  test("explains Uber-specific partitioning and capacity math on hover", async ({
    page,
  }) => {
    await page.goto("/system-design/uber/ingestion-kafka");
    await page.getByRole("button", { name: /geo\.location_pings/i }).hover();
    await expect(
      page.getByRole("tooltip", { name: /airport, stadium/i }),
    ).toBeVisible();

    await page.getByTestId("stage-nav-kafka-sizing").click();
    await page.getByRole("button", { name: /500K\/sec/i }).hover();
    await expect(
      page.getByRole("tooltip", { name: /2M simultaneously online drivers/i }),
    ).toBeVisible();
    await expect(
      page.getByText("10-20 partitions", { exact: true }),
    ).toBeVisible();
  });

  test("explains the GPS retention sampling change", async ({ page }) => {
    await page.goto("/system-design/uber/ingestion-kafka#kafka-retention");
    await expect(
      page.getByText("15 samples/minute", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("2 samples/minute", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Recent GPS/i }).hover();
    await expect(
      page.getByRole("tooltip", {
        name: /reduces historical location volume by about 7\.5/i,
      }),
    ).toBeVisible();
  });

  test("shows late-data handling and avoids per-event Redis dedup", async ({
    page,
  }) => {
    await page.goto("/system-design/uber/ingestion-kafka#kafka-controls");
    await page.getByRole("button", { name: /Late mobile data/i }).hover();
    await expect(
      page.getByRole("tooltip", { name: /90 seconds late/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Deduplication/i }).hover();
    await expect(
      page.getByRole("tooltip", { name: /500K GPS events/i }),
    ).toBeVisible();
  });

  test("Kafka anchors navigate and highlight", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/system-design/uber/ingestion-kafka");
    await page.getByTestId("stage-nav-kafka-retention").click();
    await expect(page).toHaveURL(/#kafka-retention$/);
    await expect(page.getByTestId("stage-nav-kafka-retention")).toHaveAttribute(
      "aria-current",
      "location",
    );
  });

  test("mobile layout has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/system-design/uber/ingestion-kafka");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });
});
