import { expect, test } from "@playwright/test";

const tracks = ["netflix", "uber", "youtube"] as const;
const zoomEquivalentWidths = [640, 720, 800, 960] as const;

test.describe("data engineering lessons remain operable without a viewport blocker", () => {
  for (const track of tracks) {
    test(`${track} works at narrow and 200%-zoom-equivalent widths`, async ({ page }) => {
      for (const width of zoomEquivalentWidths) {
        await page.setViewportSize({ width, height: 800 });
        const response = await page.goto(`/data-engineering/${track}/start-here`);
        expect(response?.status(), `${track} at ${width}px`).toBeLessThan(400);

        await expect(page.getByText("Desktop only", { exact: true })).toHaveCount(0);
        await expect(page.getByText(/Maximize the browser window to continue/i)).toHaveCount(0);
        await expect(page.locator("main section").first()).toBeVisible();

        const chapterRail = page.getByTestId("company-chapter-rail");
        const next = page.getByTestId("chapter-next");
        await expect(chapterRail).toBeVisible();
        await expect(next).toHaveAttribute("href", `/data-engineering/${track}/requirements`);

        const controlsAreReachable = await next.evaluate((control) => {
          const rect = control.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const hit = document.elementFromPoint(centerX, centerY);
          return (
            rect.left >= 0 &&
            rect.right <= document.documentElement.clientWidth &&
            hit !== null &&
            control.contains(hit)
          );
        });
        expect(controlsAreReachable, `${track} next control at ${width}px`).toBe(true);

        const layout = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          page: document.documentElement.scrollWidth,
        }));
        expect(layout.page, `${track} horizontal layout at ${width}px`).toBeLessThanOrEqual(layout.viewport + 1);

        await next.click();
        await expect(page).toHaveURL(new RegExp(`/data-engineering/${track}/requirements(?:#.*)?$`));
        await expect(page.getByTestId("chapter-link-requirements")).toHaveAttribute("aria-current", "page");
      }
    });
  }
});
