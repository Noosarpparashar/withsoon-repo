import { expect, test } from "@playwright/test";

test.describe("WhatsApp Data Engineering - Batch and Lakehouse", () => {
  test("renders the complete batch and lakehouse chapter", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/batch-lakehouse");

    await expect(page.getByRole("heading", { name: "Source evidence → trusted WhatsApp facts → certified products" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Give Bronze, Silver, and Gold one promise each" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Make every WhatsApp product defend its grain, consumer, and certification" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Design Iceberg for WhatsApp query shape and scale" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Publish one version, pin every read, and clean through metadata" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Orchestrate data readiness—not just a clock" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Replay analytical facts—never WhatsApp side effects" })).toBeVisible();
    await expect(page.getByText("Versioned backfill", { exact: true })).toHaveCount(0);
  });

  test("explains every pipeline stage in WhatsApp terms", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/data-engineering/whatsapp/batch-lakehouse");
    const inspector = page.getByTestId("whatsapp-lakehouse-inspector");
    const board = page.getByTestId("whatsapp-lakehouse-stage-board");

    const [boardBox, inspectorBox] = await Promise.all([board.boundingBox(), inspector.boundingBox()]);
    expect(boardBox).not.toBeNull();
    expect(inspectorBox).not.toBeNull();
    expect(inspectorBox!.x).toBeGreaterThan(boardBox!.x + boardBox!.width - 2);
    expect(Math.abs(inspectorBox!.y - boardBox!.y)).toBeLessThanOrEqual(2);
    expect(boardBox!.width).toBeGreaterThan(670);
    expect(inspectorBox!.width).toBeLessThanOrEqual(342);

    await page.getByTestId("whatsapp-lakehouse-node-silver").hover();
    await expect(inspector).toContainText(/membership or linked-device version/i);
    await expect(inspector).toContainText("message_delivery_event");

    await page.getByTestId("whatsapp-lakehouse-node-gold").click();
    await expect(inspector).toContainText(/five-minute delivery health/i);
    await expect(inspector).toContainText(/metric version and freshness status/i);

    await page.getByTestId("whatsapp-lakehouse-node-commit").hover();
    await expect(inspector).toContainText(/failed metadata commits leave readers on the previous certified snapshot/i);
    await expect(inspector).toContainText(/half-published set of WhatsApp regions or hours/i);
  });

  test("shows distinct Bronze, Silver, and Gold contracts", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/batch-lakehouse#lakehouse-layers");

    await expect(page.getByText("messaging_events_raw", { exact: true })).toBeVisible();
    await expect(page.getByText("message_delivery_event", { exact: true })).toBeVisible();
    await expect(page.getByText("agg_delivery_health_5m", { exact: true })).toBeVisible();
    await expect(page.getByText(/None of these tables accepts, orders, or delivers a live message/i)).toBeVisible();
    await expect(page.getByTestId("whatsapp-layer-heading-silver").locator("span").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
  });

  test("explains Iceberg partition and file decisions", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/batch-lakehouse#iceberg-layout");
    const inspector = page.getByTestId("whatsapp-table-inspector");

    await page.getByTestId("whatsapp-table-membership").click();
    await expect(inspector).toContainText(/today’s membership/i);
    await expect(inspector).toContainText("months(effective_from)");
    await expect(page.getByText("60.1 TB/day", { exact: true })).toBeVisible();
    await expect(page.getByText("≈117K/day", { exact: true })).toBeVisible();
  });

  test("defines WhatsApp-specific data-product and snapshot contracts", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/batch-lakehouse#data-products");
    const productInspector = page.getByTestId("whatsapp-product-inspector");

    await page.getByTestId("whatsapp-product-calls").hover();
    await expect(productInspector).toContainText(/call participant device × bounded quality window/i);
    await expect(productInspector).toContainText(/never audio, video, or call content/i);

    await page.getByTestId("whatsapp-iceberg-step-04").click();
    const icebergInspector = page.getByTestId("whatsapp-iceberg-inspector");
    await expect(icebergInspector).toContainText(/Bronze may retain 30–180 days/i);
    await expect(icebergInspector).toContainText(/Never delete object-store files behind Iceberg metadata manually/i);
  });

  test("makes orchestration and the replay boundary explicit", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/batch-lakehouse#batch-orchestration");

    await expect(page.getByText("Late delivery repair", { exact: true })).toBeVisible();
    await expect(page.getByText("Iceberg maintenance", { exact: true })).toBeVisible();
    await expect(page.getByText(/source offsets closed.*snapshot published/i)).toBeVisible();
    await expect(page.getByText(/never WhatsApp side effects/i)).toBeVisible();
    await expect(page.getByText(/never authorizes WhatsApp to resend a message/i)).toBeVisible();
  });

  test("mobile anchors work without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/whatsapp/batch-lakehouse");
    await page.getByTestId("mobile-section-iceberg-layout").click();
    await expect(page).toHaveURL(/#iceberg-layout$/);
    await expect(page.getByTestId("mobile-section-iceberg-layout")).toHaveAttribute("aria-current", "location");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
