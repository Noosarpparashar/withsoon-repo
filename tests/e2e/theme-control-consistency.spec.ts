import { expect, test } from "@playwright/test";

const representativeRoutes = [
  "/",
  "/data-engineering/netflix/start-here",
  "/data-engineering/uber/start-here",
  "/data-engineering/youtube/start-here",
] as const;

test.describe("global color-scheme contract", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
  });

  for (const route of representativeRoutes) {
    test(`${route} exposes one consistent light theme without a theme control`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);

      await expect(page.getByTestId("global-header")).toBeVisible();
      await expect(page.getByRole("button", { name: /theme|dark mode|light mode/i })).toHaveCount(0);
      await expect(page.locator("html.dark, html[data-theme], body.dark")).toHaveCount(0);

      const theme = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const body = getComputedStyle(document.body);
        return {
          colorScheme: root.colorScheme,
          rootBackground: root.getPropertyValue("--bg").trim().toLowerCase(),
          rootText: root.getPropertyValue("--text").trim().toLowerCase(),
          bodyBackground: body.backgroundColor,
          bodyText: body.color,
        };
      });

      expect(theme.colorScheme).toBe("light");
      expect(theme.rootBackground).toBe("#f8fafc");
      expect(theme.rootText).toBe("#0f172a");
      expect(theme.bodyBackground).toBe("rgb(248, 250, 252)");
      expect(theme.bodyText).toBe("rgb(15, 23, 42)");
    });
  }
});
