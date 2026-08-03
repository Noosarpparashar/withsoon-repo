import { expect, test } from "@playwright/test";

test.describe("Netflix Data Engineering — Start Here desktop rebuild", () => {
  test.use({ viewport: { width: 1600, height: 1200 } });

  test("loads the section-1.2 desktop experience", async ({ page }) => {
    const res = await page.goto("/system-design/netflix-data-engineering/start-here#platform-mission");
    expect(res?.status()).toBeLessThan(400);

    await expect(page).toHaveURL(/\/system-design\/netflix-data-engineering\/start-here#platform-mission/);
    await expect(page.getByTestId("platform-mission-visual")).toBeVisible();
    await expect(page.getByTestId("stage-nav-platform-mission")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Design the shared data platform/i })).toBeVisible();
  });

  test("stage navigation jumps to the freshness section", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/start-here");
    await page.getByTestId("stage-nav-freshness-map").click();

    await expect(page).toHaveURL(/#freshness-map/);
    await expect(page.getByText("Real-time needs numbers")).toBeVisible();
  });

  test("scope section stays reachable from anchor navigation", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/start-here#scope-boundary");

    await expect(page.getByTestId("stage-nav-scope-boundary")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Go deep on one clean slice/i })).toBeVisible();
  });

  test("producer chips do not overlap", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/start-here#platform-mission");

    const overlapCheck = async (testId: string) =>
      page.getByTestId(testId).locator(".group").evaluateAll((nodes) => {
        const rects = nodes.map((node) => node.getBoundingClientRect());
        for (let i = 0; i < rects.length; i += 1) {
          for (let j = i + 1; j < rects.length; j += 1) {
            const a = rects[i];
            const b = rects[j];
            const overlapX = a.left < b.right && a.right > b.left;
            const overlapY = a.top < b.bottom && a.bottom > b.top;
            if (overlapX && overlapY) return false;
          }
        }
        return true;
      });

    await expect.poll(() => overlapCheck("hero-producers-grid")).toBe(true);
  });

  test("hero layout stays inside the mission visual bounds", async ({ page }) => {
    await page.goto("/system-design/netflix-data-engineering/start-here#platform-mission");

    const staysInside = await page.getByTestId("platform-mission-visual").evaluate((node) => {
      const container = node.getBoundingClientRect();
      const children = Array.from(
        node.querySelectorAll(
          '[data-testid="hero-producers-grid"] > .group, [data-testid="hero-arrow-left"], [data-testid="hero-platform-card"], [data-testid="hero-arrow-right"], [data-testid="hero-consumers-grid"] > .group'
        )
      );

      return children.every((child) => {
        const rect = child.getBoundingClientRect();
        return rect.left >= container.left - 1 && rect.right <= container.right + 1;
      });
    });

    expect(staysInside).toBe(true);
  });
});
