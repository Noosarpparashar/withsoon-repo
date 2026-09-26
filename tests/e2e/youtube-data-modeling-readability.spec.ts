import { expect, test } from "@playwright/test";

test.describe("YouTube data-modeling readability", () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto("/data-engineering/youtube/data-modeling#model-erd");
    expect(response?.status()).toBeLessThan(400);
  });

  test("starts with a readable overview and semantic model outline", async ({ page }) => {
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

    const outline = page.getByTestId("youtube-semantic-model");
    await expect(outline).toBeVisible();
    await expect(outline.locator("summary")).toHaveCount(4);
    await outline.locator("summary").filter({ hasText: "Dimensions" }).click();
    await expect(outline.locator("caption", { hasText: "Fields in dim_date" })).toBeAttached();
    await expect(outline.getByText("Actual reporting date.", { exact: true })).toBeVisible();
  });

  test("full model is readable, operable, and pannable", async ({ page }, testInfo) => {
    await page.getByRole("button", { name: "Full model" }).click();
    await expect(page.getByRole("button", { name: "Full model" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("80%", { exact: true })).toBeVisible();
    await expect(page.locator("[data-model-table]")).toHaveCount(27);

    for (const name of ["Zoom out", "Zoom in"]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }

    await page.locator('[data-model-table][aria-label^="Inspect fact_watch_session"]').click();
    await expect(page.getByTestId("youtube-model-inspector")).toContainText("fact_watch_session");

    if (testInfo.project.name === "chromium") {
      const canvas = page.getByTestId("youtube-er-canvas");
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      await page.mouse.move(box!.x + 460, box!.y + 230);
      await page.mouse.down();
      await page.mouse.move(box!.x + 260, box!.y + 230, { steps: 5 });
      await page.mouse.up();
      const scrollLeft = await canvas.evaluate((element) => element.scrollLeft);
      expect(scrollLeft).toBeGreaterThan(100);
    }
  });
});
