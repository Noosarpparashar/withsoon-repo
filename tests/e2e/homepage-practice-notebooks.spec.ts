import { expect, test } from "@playwright/test";

test.describe("homepage Spark practice notebooks", () => {
  test("shows both notebook downloads before the company tracks", async ({ page, request }) => {
    await page.goto("/");

    const notebooks = page.getByTestId("practice-notebooks");
    await expect(notebooks).toBeVisible();
    await expect(notebooks.getByRole("heading", {
      name: "Spark practice notebooks",
    })).toBeVisible();

    const scalaDownload = notebooks.getByRole("link", {
      name: "Download the Scala Spark practice notebook",
    });
    const pysparkDownload = notebooks.getByRole("link", {
      name: "Download the PySpark Spark practice notebook",
    });
    const scalaPreview = notebooks.getByRole("link", {
      name: "Open the Scala notebook preview in a new tab",
    });
    const pysparkPreview = notebooks.getByRole("link", {
      name: "Open the PySpark notebook preview in a new tab",
    });

    await expect(scalaDownload).toHaveAttribute(
      "href",
      "/notebooks/spark-scala-practice-problems.ipynb",
    );
    await expect(scalaDownload).toHaveAttribute(
      "download",
      "spark-scala-practice-problems.ipynb",
    );
    await expect(pysparkDownload).toHaveAttribute(
      "href",
      "/notebooks/pyspark-practice-problems.ipynb",
    );
    await expect(pysparkDownload).toHaveAttribute(
      "download",
      "pyspark-practice-problems.ipynb",
    );
    await expect(scalaPreview).toHaveAttribute("href", "/notebooks/scala");
    await expect(scalaPreview).toHaveAttribute("target", "_blank");
    await expect(pysparkPreview).toHaveAttribute("href", "/notebooks/pyspark");
    await expect(pysparkPreview).toHaveAttribute("target", "_blank");


    const sectionOrder = await page.evaluate(() => {
      const notebookSection = document.querySelector("#practice-notebooks");
      const companySection = document.querySelector("#data-engineering-designs");
      if (!notebookSection || !companySection) return false;
      return Boolean(
        notebookSection.compareDocumentPosition(companySection)
          & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
    expect(sectionOrder).toBe(true);

    for (const path of [
      "/notebooks/spark-scala-practice-problems.ipynb",
      "/notebooks/pyspark-practice-problems.ipynb",
    ]) {
      const response = await request.get(path);
      expect(response.ok()).toBe(true);
      expect((await response.body()).byteLength).toBeGreaterThan(100_000);
    }
  });
});
