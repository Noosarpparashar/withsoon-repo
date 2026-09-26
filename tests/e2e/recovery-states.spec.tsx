import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const UNKNOWN_ROUTES = [
  "/route-that-does-not-exist",
  "/data-engineering/netflix/not-a-chapter",
  "/data-engineering/uber/not-a-chapter",
  "/data-engineering/youtube/not-a-chapter",
] as const;

test.describe("Branded recovery states", () => {
  for (const route of UNKNOWN_ROUTES) {
    test(`${route} keeps the shell and offers working chapter recovery`, async ({
      page,
    }) => {
      const response = await page.goto(route);
      expect([200, 404]).toContain(response?.status());
      await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}$`));
      await expect(page.getByRole("link", { name: "withsoon home" })).toBeVisible();
      await expect(page.getByTestId("not-found-recovery")).toBeVisible();
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "This lesson is not in the curriculum",
        }),
      ).toBeVisible();
      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
        "content",
        /noindex/,
      );

      const recovery = page.getByLabel("Available learning tracks");
      await expect(recovery.getByRole("link")).toHaveCount(3);
      await recovery.getByRole("link", { name: /Uber/ }).click();
      await expect(page).toHaveURL(/\/data-engineering\/uber\/start-here$/);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Start Here",
      );
    });
  }

  test("offline mode is announced without replacing the open lesson", async ({
    page,
    context,
  }) => {
    await page.goto("/data-engineering/youtube/start-here");
    await context.setOffline(true);

    const offline = page.getByTestId("offline-recovery");
    await expect(offline).toBeVisible();
    await expect(offline).toHaveAccessibleName("Offline connection status");
    await expect(page.getByTestId("company-chapter-rail")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await offline.getByRole("button", { name: "Retry connection" }).click();
    await expect(offline.getByRole("status")).toContainText("Still offline");

    await offline
      .getByRole("button", { name: "Dismiss offline message and keep reading" })
      .click();
    await expect(offline).toHaveCount(0);
    await expect(page.getByTestId("company-chapter-rail")).toBeVisible();
    await context.setOffline(false);
  });

  test("error, loading, and not-found boundaries share useful recovery content", () => {
    const source = (file: string) =>
      readFileSync(resolve(process.cwd(), "src", "app", file), "utf8");
    const errorMarkup = source("error.tsx");
    const globalErrorMarkup = source("global-error.tsx");
    const loadingMarkup = source("loading.tsx");
    const notFoundMarkup = source("not-found.tsx");

    expect(errorMarkup).toContain("Retry lesson");
    expect(errorMarkup).toContain("unstable_retry");
    expect(globalErrorMarkup).toContain("Retry workspace");
    expect(globalErrorMarkup).toContain("<html");
    expect(loadingMarkup).toContain("Loading your data design lesson");
    expect(notFoundMarkup).toContain("This lesson is not in the curriculum");
    for (const boundary of [errorMarkup, loadingMarkup, notFoundMarkup]) {
      expect(boundary).toContain("RecoveryState");
    }
  });

  test("the rendered recovery surface passes automated accessibility checks", async ({
    page,
  }) => {
    await page.goto("/data-engineering/youtube/not-a-chapter");
    await expect(page.getByTestId("not-found-recovery")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
