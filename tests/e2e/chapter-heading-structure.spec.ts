import { expect, test } from "@playwright/test";

const chapters = [
  ...[
    ["start-here", "Start Here"],
    ["requirements", "Requirements"],
    ["architecture", "Architecture"],
    ["ingestion-kafka", "Event Contracts"],
    ["real-time-streaming", "Real-Time Streaming"],
    ["data-modeling", "Data Modeling"],
    ["batch-pipelines", "Batch + Lakehouse"],
    ["governance-quality", "Governance / Quality"],
    ["capacity-cost", "Capacity / Cost"],
    ["quiz", "Interview Q&A"],
  ].map(([slug, title]) => ({ company: "Netflix", slug, title })),
  ...[
    ["start-here", "Start Here"],
    ["requirements", "Requirements"],
    ["event-sources", "Event Sources"],
    ["architecture", "Architecture"],
    ["ingestion-kafka", "Ingestion / Kafka"],
    ["batch-pipelines", "Batch + Lakehouse"],
    ["data-modeling", "Data Modeling"],
  ].map(([slug, title]) => ({ company: "Uber", slug, title })),
] as const;

test.describe("chapter heading structure", () => {
  for (const chapter of chapters) {
    test(`${chapter.company} ${chapter.title} has one descriptive H1 and a logical outline`, async ({ page }) => {
      const companySlug = chapter.company.toLowerCase();
      const response = await page.goto(`/data-engineering/${companySlug}/${chapter.slug}`);
      expect(response?.status()).toBeLessThan(400);

      const headings = page.locator("h1, h2, h3, h4, h5, h6");
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toBeVisible();
      await expect(h1).toHaveAccessibleName(`${chapter.company} Data Engineering: ${chapter.title}`);

      const outline = await headings.evaluateAll((elements) =>
        elements
          .filter((element) => {
            const style = getComputedStyle(element);
            return style.display !== "none" && style.visibility !== "hidden" && element.getAttribute("aria-hidden") !== "true";
          })
          .map((element) => ({
            level: Number(element.tagName.slice(1)),
            text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
          }))
          .filter((heading) => heading.text.length > 0),
      );

      expect(outline[0]?.level, JSON.stringify(outline, null, 2)).toBe(1);
      for (let index = 1; index < outline.length; index += 1) {
        expect(
          outline[index].level,
          `Heading level skipped after "${outline[index - 1].text}" on ${chapter.company} ${chapter.title}`,
        ).toBeLessThanOrEqual(outline[index - 1].level + 1);
      }
    });
  }
});
