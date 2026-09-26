import { expect, test, type Page } from "@playwright/test";

const lessons = [
  { name: "Uber", url: "/data-engineering/uber/start-here" },
  { name: "Uber ingestion", url: "/data-engineering/uber/ingestion-kafka" },
  { name: "YouTube", url: "/data-engineering/youtube/event-sources" },
  { name: "YouTube governance", url: "/data-engineering/youtube/governance-quality" },
] as const;

const sharedExplainerRoutes = [
  ...[
    "start-here",
    "requirements",
    "event-sources",
    "architecture",
    "ingestion-kafka",
  ].map((tab) => `/data-engineering/uber/${tab}`),
  ...[
    "requirements",
    "event-sources",
    "architecture",
    "ingestion-kafka",
    "governance-quality",
  ].map((tab) => `/data-engineering/youtube/${tab}`),
];

async function firstExplainer(page: Page) {
  const trigger = page.locator("[data-explainer-trigger]:visible").first();
  await expect(trigger).toBeVisible();
  await trigger.scrollIntoViewIfNeeded();
  return trigger;
}

for (const lesson of lessons) {
  test.describe(`${lesson.name} accessible explanations`, () => {
    test("supports hover preview, keyboard pinning, Escape, and close", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium", "Precise-pointer interaction is covered in Chromium.");
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(lesson.url);
      const trigger = await firstExplainer(page);

      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).not.toHaveAttribute("aria-describedby", /explainer-/);
      const conciseName = await trigger.getAttribute("aria-label");
      expect(conciseName).toMatch(/^Explain /);
      expect(conciseName!.length).toBeLessThanOrEqual(80);
      const controlledId = await trigger.getAttribute("aria-controls");
      expect(controlledId).toMatch(/^explainer-/);

      await trigger.hover();
      let panel = page.getByTestId("explainer-panel");
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute("role", "tooltip");
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(await panel.getAttribute("id")).toBe(controlledId);

      await page.mouse.move(1, 1);
      await expect(panel).toBeHidden();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");

      await trigger.focus();
      await expect(page.getByTestId("explainer-panel")).toHaveAttribute("role", "tooltip");
      await trigger.press("Enter");
      panel = page.getByTestId("explainer-panel");
      await expect(panel).toHaveAttribute("role", "dialog");
      await expect(panel).toHaveAttribute("data-pinned", "true");
      await expect(trigger).toHaveAttribute("aria-describedby", controlledId!);
      await expect(trigger.locator("[data-testid='explainer-panel']")).toHaveCount(0);
      await page.mouse.move(1, 1);
      await expect(panel).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).not.toHaveAttribute("aria-describedby", /explainer-/);
      await expect(trigger).toBeFocused();

      await trigger.press("Space");
      panel = page.getByTestId("explainer-panel");
      await expect(panel).toHaveAttribute("role", "dialog");
      await page.getByTestId("explainer-close").click();
      await expect(panel).toBeHidden();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toBeFocused();
    });

    test("opens a touch-friendly pinned sheet and closes predictably", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "Touch interaction is covered with the mobile device project.");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(lesson.url);
      const trigger = await firstExplainer(page);

      await trigger.tap();
      const panel = page.getByTestId("explainer-panel");
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute("role", "dialog");
      await expect(trigger).toHaveAttribute("aria-expanded", "true");

      const sheet = await panel.boundingBox();
      expect(sheet).not.toBeNull();
      expect(sheet!.x).toBeGreaterThanOrEqual(11);
      expect(sheet!.x + sheet!.width).toBeLessThanOrEqual(379);
      expect(sheet!.y + sheet!.height).toBeLessThanOrEqual(833);
      expect(sheet!.y).toBeGreaterThan(0);

      await page.getByTestId("explainer-close").tap();
      await expect(panel).toBeHidden();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  });
}

test("every shared explainer trigger exposes consistent button and ARIA semantics", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "The full route sweep only needs one browser engine.");
  test.setTimeout(120_000);
  let explainerCount = 0;

  for (const route of sharedExplainerRoutes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBeLessThan(400);
    await page.locator("[data-explainer-trigger]").first().waitFor();

    const result = await page.locator("[data-explainer-trigger]").evaluateAll((triggers) =>
      triggers.map((trigger) => ({
        tag: trigger.tagName,
        type: trigger.getAttribute("type"),
        controls: trigger.getAttribute("aria-controls"),
        expanded: trigger.getAttribute("aria-expanded"),
        popup: trigger.getAttribute("aria-haspopup"),
        label: trigger.getAttribute("aria-label"),
        describedBy: trigger.getAttribute("aria-describedby"),
      })),
    );
    explainerCount += result.length;

    for (const semantics of result) {
      expect(semantics.tag, route).toBe("BUTTON");
      expect(semantics.type, route).toBe("button");
      expect(semantics.controls, route).toMatch(/^explainer-/);
      expect(semantics.expanded, route).toBe("false");
      expect(semantics.popup, route).toBe("dialog");
      expect(semantics.label, route).toMatch(/^Explain /);
      expect(semantics.label!.length, route).toBeLessThanOrEqual(80);
      expect(semantics.describedBy, route).toBeNull();
    }
  }

  expect(explainerCount).toBeGreaterThan(40);
});
