import { expect, test } from "@playwright/test";

test.describe("Uber Data Engineering - Architecture", () => {
  test("renders the zoomable architecture and updates the inspector on hover", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/system-design/uber/architecture");

    await expect(page.getByRole("heading", { name: "One event backbone, two processing paths" })).toBeVisible();
    await expect(page.getByTestId("uber-architecture-svg")).toBeVisible();
    await expect(page.getByTestId("architecture-node-kafka")).toBeVisible();
    await expect(page.getByTestId("architecture-node-driver-app")).toContainText("GPS + availability");
    await expect(page.getByTestId("architecture-detail-panel")).toContainText("Kafka");

    await page.getByTestId("architecture-node-flink-streaming").hover();
    await expect(page.getByTestId("architecture-detail-panel")).toContainText("Flink streaming");
    await expect(page.getByTestId("architecture-detail-panel")).toContainText("late or out of order");

    await expect(page.getByRole("button", { name: "Reset zoom" })).toHaveText("100%");
    await page.getByTestId("uber-architecture-canvas").getByRole("button", { name: "Zoom in" }).click();
    await expect(page.getByRole("button", { name: "Reset zoom" })).toHaveText("110%");
  });

  test("bottom nodes keep the inspector visible and decisions use the inspector", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/system-design/uber/architecture");
    const panel = page.getByTestId("architecture-detail-panel");
    await panel.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.getByTestId("architecture-node-bi-ops-ml-finance").click();
    await expect(page.getByTestId("architecture-detail-panel")).toContainText("BI, Ops, ML + Finance");
    await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBe(0);

    const railBox = await page.getByTestId("chapter-rail").boundingBox();
    const panelBox = await page.getByTestId("architecture-detail-panel").boundingBox();
    expect(panelBox).not.toBeNull();
    expect(railBox).not.toBeNull();
    expect(panelBox!.y).toBeGreaterThanOrEqual(railBox!.y + railBox!.height);
    expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(900);

    await page.getByTestId("stage-nav-architecture-principle").click();
    await expect(page.getByTestId("architecture-detail-panel")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Why the pipeline splits after Kafka" })).toBeVisible();
    const decisionBox = await page.locator("#architecture-principle").boundingBox();
    const fixedPanelBox = await page.getByTestId("architecture-detail-panel").boundingBox();
    expect(decisionBox).not.toBeNull();
    expect(fixedPanelBox).not.toBeNull();
    expect(decisionBox!.x + decisionBox!.width).toBeLessThanOrEqual(fixedPanelBox!.x);
    await page.locator("#architecture-principle button").first().hover();
    await expect(page.locator("#architecture-principle [role='tooltip']").first()).toBeHidden();
    await expect(page.getByTestId("architecture-detail-panel")).toContainText("Flink streaming");
  });

  test("architecture anchors navigate and highlight", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/system-design/uber/architecture");
    await page.getByTestId("stage-nav-architecture-principle").click();
    await expect(page).toHaveURL(/#architecture-principle$/);
    await expect(page.getByTestId("stage-nav-architecture-principle")).toHaveAttribute("aria-current", "location");
  });

  test("mobile architecture has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/system-design/uber/architecture");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
