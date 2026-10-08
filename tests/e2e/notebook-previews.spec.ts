import { expect, test } from "@playwright/test";

const NOTEBOOKS = [
  {
    language: "Scala",
    path: "/notebooks/scala",
    title: "Scala + Spark Practice",
    notebookHeading: "Spark Scala Transformations — 20 Exhaustive Practice Problems",
    filename: "spark-scala-practice-problems.ipynb",
  },
  {
    language: "PySpark",
    path: "/notebooks/pyspark",
    title: "Python + Spark Practice",
    notebookHeading: "PySpark Transformations — 20 Exhaustive Practice Problems",
    filename: "pyspark-practice-problems.ipynb",
  },
] as const;

test.describe("read-only notebook previews", () => {
  for (const notebook of NOTEBOOKS) {
    test(`renders the exact ${notebook.language} notebook content`, async ({ page }) => {
      const response = await page.goto(notebook.path);
      expect(response?.ok()).toBe(true);

      await expect(page.getByText(notebook.title, { exact: true })).toBeVisible();
      await expect(page.getByText(notebook.filename, { exact: true })).toBeVisible();
      await expect(page.getByText("Read only", { exact: true }).first()).toBeVisible();

      const viewer = page.getByTestId("notebook-viewer");
      await expect(viewer).toBeVisible();
      await expect(viewer.getByRole("heading", {
        level: 1,
        name: notebook.notebookHeading,
      })).toBeVisible();
      await expect(viewer.locator('[data-notebook-cell="code"]')).toHaveCount(47);
      await expect(viewer.locator('[data-notebook-cell="markdown"]')).toHaveCount(63);
      await expect(viewer.locator("#problems")).toBeAttached();
      await expect(viewer.locator("#solutions")).toBeAttached();

      const download = page.getByRole("link", { name: "Download", exact: true });
      await expect(download).toHaveAttribute("download", notebook.filename);
    });
  }

  test("PySpark preview fits a phone viewport without page-level horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/notebooks/pyspark");
    await expect(page.getByTestId("notebook-viewer")).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
