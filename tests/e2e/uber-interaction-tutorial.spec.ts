import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const DISMISSED_KEY = "uber-interaction-tutorial-dismissed-v2";
const ANNOUNCED_KEY = "uber-interaction-tutorial-announced-v2";

async function resetTutorial(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(
    ([dismissedKey, announcedKey]) => {
      localStorage.removeItem(dismissedKey);
      sessionStorage.removeItem(announcedKey);
    },
    [DISMISSED_KEY, ANNOUNCED_KEY],
  );
}

test.describe("Uber interaction tutorial", () => {
  test("uses device-aware copy and never blocks mobile navigation", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await resetTutorial(page);
    await page.goto("/data-engineering/uber/start-here");

    const tutorial = page.getByRole("dialog", { name: "Card explanations" });
    await expect(tutorial).toBeVisible();
    await expect(tutorial).toHaveAttribute("aria-modal", "false");
    await expect(tutorial).toBeFocused();
    await expect(tutorial).toContainText(
      testInfo.project.name === "mobile" ? "Tap a card" : "Point to a card",
    );
    const accessibility = await new AxeBuilder({ page })
      .withRules(["aria-dialog-name"])
      .analyze();
    expect(accessibility.violations).toEqual([]);

    const nextChapter = page.getByTestId("chapter-next");
    const receivesPointer = await nextChapter.evaluate((link) => {
      const rect = link.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      return hit !== null && link.contains(hit);
    });
    expect(receivesPointer).toBe(true);

    if (testInfo.project.name === "mobile") await nextChapter.tap();
    else await nextChapter.click();
    await expect(page).toHaveURL(/\/data-engineering\/uber\/requirements$/);
  });

  test("Escape closes it and prevents another announcement this session", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await resetTutorial(page);
    await page.goto("/data-engineering/uber/start-here");

    const tutorial = page.getByTestId("uber-interaction-tutorial");
    await expect(tutorial).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tutorial).toHaveCount(0);
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), DISMISSED_KEY))
      .toBe("true");

    await page.reload();
    await expect(tutorial).toHaveCount(0);
  });

  test("the visible close button remembers dismissal", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await resetTutorial(page);
    await page.goto("/data-engineering/uber/event-sources");

    const tutorial = page.getByTestId("uber-interaction-tutorial");
    const close = page.getByRole("button", {
      name: "Close card explanations tutorial",
    });
    await expect(close).toBeVisible();
    if (testInfo.project.name === "mobile") await close.tap();
    else await close.click();
    await expect(tutorial).toHaveCount(0);

    await page.goto("/data-engineering/uber/architecture");
    await expect(tutorial).toHaveCount(0);
  });

  test("does not announce the mobile tutorial on a wide desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await resetTutorial(page);
    await page.goto("/data-engineering/uber/start-here");

    await expect(page.getByTestId("uber-interaction-tutorial")).toHaveCount(0);
    await expect(page.getByTestId("company-chapter-rail")).toBeVisible();
  });
});
