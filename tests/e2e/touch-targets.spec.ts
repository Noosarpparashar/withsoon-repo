import { expect, test, type Page } from "@playwright/test";

const minimumTarget = 44;
const minimumSpacing = 8;
const interactiveSelector = [
  "button",
  "a[href]",
  "[role='button']",
  "[role='tab']",
  "[role='radio']",
  "summary",
  "select",
  "input[type='range']",
  "input[type='checkbox']",
  "input[type='radio']",
].join(",");

async function publishedPaths(page: Page) {
  const response = await page.request.get("/sitemap.xml");
  expect(response.ok()).toBe(true);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
}

test.describe("mobile touch targets", () => {
  test("every published page exposes reliable target sizes", async ({ page }) => {
    test.setTimeout(180_000);
    const paths = await publishedPaths(page);
    const failures: string[] = [];

    for (const width of [360, 390, 430] as const) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of paths) {
        const response = await page.goto(path);
        expect(response?.status(), `${path} should load at ${width}px`).toBeLessThan(400);
        if (path.startsWith("/data-engineering/")) {
          await expect(page.getByTestId("company-chapter-rail")).toBeVisible();
        }
        if (path === "/data-engineering/netflix/data-modeling") {
          await expect(page.getByTestId("netflix-model-mobile-fields")).toBeVisible();
          await expect(page.locator('svg[aria-label="Netflix dimensional ER diagram"] [role="button"] [role="button"]')).toHaveCount(0);
        }
        if (path === "/data-engineering/uber/data-modeling") {
          await expect(page.getByTestId("uber-model-erd").locator('[role="button"]')).toHaveCount(0);
        }
        await page.waitForTimeout(100);

        const undersized = await page.locator(interactiveSelector).evaluateAll((elements, minimum) => {
          const describe = (element: Element) =>
            element.getAttribute("aria-label") ||
            element.textContent?.trim().replace(/\s+/g, " ").slice(0, 60) ||
            element.tagName.toLowerCase();
          const visibleTargets = elements.filter((element) => {
            if (!(element instanceof HTMLElement || element instanceof SVGElement)) return false;
            if (element.closest("[data-nextjs-dev-tools-button]")) return false;
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              rect.width > 0 &&
              rect.height > 0
            );
          });
          return visibleTargets.flatMap((element) => {
            const rect = element.getBoundingClientRect();
            if (rect.width >= minimum && rect.height >= minimum) return [];
            return [`${describe(element)} (${Math.round(rect.width)}x${Math.round(rect.height)})`];
          });
        }, minimumTarget);

        failures.push(...undersized.map((failure) => `${width}px ${path}: ${failure}`));
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });

  test("shared rails and semantic ERD controls preserve spacing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/netflix/data-modeling#model-erd");
    await page.waitForTimeout(100);

    const railGeometry = await page.getByTestId("company-chapter-rail").evaluate((rail) => {
      const leading = [...rail.querySelectorAll<HTMLElement>('[data-testid="chapter-leading-controls"] > *')]
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0);
      const chapters = [...rail.querySelectorAll<HTMLElement>('[data-testid^="chapter-link-"]')]
        .map((element) => element.getBoundingClientRect())
        .sort((left, right) => left.left - right.left);
      const gaps = (rects: DOMRect[]) => rects.slice(1).map((rect, index) => rect.left - rects[index].right);
      return { leading: gaps(leading), chapters: gaps(chapters) };
    });

    expect(railGeometry.leading.every((gap) => gap >= minimumSpacing - 0.5)).toBe(true);
    expect(railGeometry.chapters.every((gap) => gap >= minimumSpacing - 0.5)).toBe(true);

    const mobileFields = page.getByTestId("netflix-model-mobile-fields");
    await expect(mobileFields).toBeVisible();
    const fieldButtons = mobileFields.getByRole("button");
    expect(await fieldButtons.count()).toBeGreaterThan(0);
    for (const field of await fieldButtons.all()) {
      const box = await field.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(minimumTarget);
      expect(box?.height).toBeGreaterThanOrEqual(minimumTarget);
    }

    const fieldGap = await mobileFields.evaluate((root) => {
      const grid = root.querySelector<HTMLElement>(".grid");
      return grid ? Number.parseFloat(getComputedStyle(grid).rowGap) : 0;
    });
    expect(fieldGap).toBeGreaterThanOrEqual(minimumSpacing);
    const diagramTargetsAreTables = await page
      .locator('svg[aria-label="Netflix dimensional ER diagram"] [role="button"]')
      .evaluateAll((targets, minimum) => targets.every((target) => {
        const rect = target.getBoundingClientRect();
        return rect.width >= minimum && rect.height >= minimum;
      }), minimumTarget);
    expect(diagramTargetsAreTables).toBe(true);

    await page.goto("/data-engineering/uber/data-modeling#model-erd");
    await page.waitForTimeout(100);
    await expect(page.getByTestId("uber-model-erd").locator('[role="button"]')).toHaveCount(0);

    await page.goto("/data-engineering/uber/architecture#architecture-map");
    const zoomControls = page.getByTestId("uber-architecture-zoom-controls");
    const zoomGaps = await zoomControls.evaluate((root) => {
      const boxes = [...root.querySelectorAll<HTMLElement>("button")].map((button) => button.getBoundingClientRect());
      return boxes.slice(1).map((box, index) => box.left - boxes[index].right);
    });
    expect(zoomGaps.every((gap) => gap >= minimumSpacing - 0.5)).toBe(true);
  });
});
