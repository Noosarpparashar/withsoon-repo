import { expect, test } from "@playwright/test";

test.describe("YouTube data-modeling readability", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto("/data-engineering/youtube/data-modeling#model-erd");
    expect(response?.status()).toBeLessThan(400);
  });

  test("starts with the full model and keeps the overview available", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Full model" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("youtube-er-canvas")).toBeVisible();
    await expect(page.locator("[data-model-table]")).toHaveCount(27);
    await expect(page.getByText("Page sections", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Interview Answer", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Overview" }).click();
    const overview = page.getByTestId("youtube-model-overview");
    await expect(overview).toBeVisible();
    await expect(page.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("video_sk · viewer_sk · device_sk", { exact: true })).toBeVisible();
    await expect(page.getByText("sessionize · attribute · qualify", { exact: true })).toBeVisible();

    const entityTitle = overview.getByText("fact_watch_session", { exact: true });
    const fontSize = await entityTitle.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(14);

    const modeButtons = page.getByRole("group", { name: "ER diagram display mode" }).getByRole("button");
    for (const button of await modeButtons.all()) {
      const box = await button.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }

    await expect(page.getByText("Table and relationship outline", { exact: true })).toHaveCount(0);
  });

  test("full model is readable, operable, and pannable", async ({ page }, testInfo) => {
    await expect(page.getByRole("button", { name: "Full model" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-model-table]")).toHaveCount(27);

    const canvas = page.getByTestId("youtube-er-canvas");
    const inspector = page.getByTestId("youtube-model-inspector");
    await expect(page.getByText("65%", { exact: true })).toBeVisible();
    await expect(inspector).toBeVisible();
    await expect(inspector).toContainText("Model explanation");
    const canvasBox = await canvas.boundingBox();
    const inspectorBox = await inspector.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(inspectorBox).not.toBeNull();
    expect(canvasBox!.width).toBeGreaterThan(980);
    expect(inspectorBox!.x + inspectorBox!.width).toBeLessThan(canvasBox!.x);

    const lastDimension = page.locator('[data-model-table][aria-label^="Inspect metric_registry"]');
    const lastDimensionBox = await lastDimension.boundingBox();
    expect(lastDimensionBox).not.toBeNull();
    expect(lastDimensionBox!.y + lastDimensionBox!.height).toBeLessThanOrEqual(canvasBox!.y + canvasBox!.height);

    const canvasOverflow = await canvas.evaluate((element) => ({
      x: getComputedStyle(element).overflowX,
      y: getComputedStyle(element).overflowY,
    }));
    expect(canvasOverflow).toEqual({ x: "hidden", y: "hidden" });

    for (const name of ["Zoom out", "Zoom in"]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }

    await page.locator('[data-model-table][aria-label^="Inspect fact_watch_session"] [data-model-field="session_sk"]').hover();
    await expect(inspector).toContainText("fact_watch_session");
    await expect(inspector).toContainText("Playback attempt plus version.");

    if (testInfo.project.name === "chromium") {
      for (let step = 0; step < 4; step += 1) await page.getByRole("button", { name: "Zoom in" }).click();
      const box = await canvas.boundingBox();
      await page.mouse.move(box!.x + 760, box!.y + 300);
      await page.mouse.down();
      await page.mouse.move(box!.x + 460, box!.y + 300, { steps: 5 });
      await page.mouse.up();
      const scrollLeft = await canvas.evaluate((element) => element.scrollLeft);
      expect(scrollLeft).toBeGreaterThan(100);
    }
  });

  test("mobile removes redundant section navigation and places the explanation below the model", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();

    await expect(page.getByTestId("mobile-section-nav")).toHaveCount(0);
    const canvas = page.getByTestId("youtube-er-canvas");
    const explanation = page.getByTestId("youtube-model-inspector-mobile");
    await expect(canvas).toBeVisible();
    await expect(explanation).toBeVisible();
    const canvasBox = await canvas.boundingBox();
    const explanationBox = await explanation.boundingBox();
    expect(explanationBox!.y).toBeGreaterThan(canvasBox!.y + canvasBox!.height);

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
  });

  test("wide desktop gives the freed page width to both the explanation and ER canvas", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();

    const canvasBox = await page.getByTestId("youtube-er-canvas").boundingBox();
    const inspectorBox = await page.getByTestId("youtube-model-inspector").boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(inspectorBox).not.toBeNull();
    expect(inspectorBox!.width).toBeGreaterThanOrEqual(260);
    expect(canvasBox!.width).toBeGreaterThanOrEqual(1480);
    expect(1920 - canvasBox!.x - canvasBox!.width).toBeLessThanOrEqual(48);

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
  });
});
