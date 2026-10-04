import { expect, test } from "@playwright/test";

test.describe("WhatsApp Data Engineering - Interview Q&A", () => {
  test("renders all 50 WhatsApp big-data interview questions", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/interview-qa");

    await expect(page.getByRole("heading", { name: "Interview Q&A", exact: true })).toBeVisible();
    await expect(page.getByTestId("chapter-position")).toContainText("Chapter 9 of 9");
    await expect(page.getByRole("heading", { name: "Defend the complete WhatsApp big-data design" })).toBeVisible();
    await expect(page.getByTestId("whatsapp-interview-chapter")).toHaveAttribute("data-total-questions", "50");
    await expect(page.getByTestId("whatsapp-interview-category")).toHaveCount(8);
    await expect(page.getByTestId("whatsapp-interview-answer")).toContainText(/end-to-end encrypted message bodies/i);
  });

  test("shows defensible capacity formulas and assumptions", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/interview-qa");
    await page.getByRole("tab", { name: /Capacity \+ SLOs/ }).click();
    await page.locator('[data-question-id="q06"]').hover();

    const answer = page.getByTestId("whatsapp-interview-answer");
    await expect(answer).toContainText("QUESTION 06 / 50");
    await expect(answer).toContainText(/100B messages\/day/i);
    await expect(answer).toContainText(/5\.787M peak messages\/s/i);
    await expect(answer).toContainText(/21\.412M peak events\/s/i);
    await expect(answer).toContainText(/planning multiplier/i);
  });

  test("explains contract evolution and producer evidence in WhatsApp terms", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/interview-qa");
    await page.getByRole("tab", { name: /Sources \+ contracts/ }).click();
    await page.locator('[data-question-id="q19"]').focus();

    const answer = page.getByTestId("whatsapp-interview-answer");
    await expect(answer).toContainText("delivery_transport");
    await expect(answer).toContainText(/Flink, Spark, Pinot, Trino/i);
    await expect(answer).toContainText(/oldest active version/i);
  });

  test("covers governance, reconciliation, and privacy recovery", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/interview-qa");
    await page.getByRole("tab", { name: /Governance \+ recovery/ }).click();
    await page.locator('[data-question-id="q49"]').click();
    await expect(page.getByTestId("whatsapp-interview-answer")).toContainText(/Message Service accepted = Kafka admitted = Bronze archived/i);

    await page.locator('[data-question-id="q50"]').click();
    const answer = page.getByTestId("whatsapp-interview-answer");
    await expect(answer).toContainText(/deletion events propagate through eligible Iceberg tables/i);
    await expect(answer).toContainText(/without ever introducing message plaintext/i);
  });

  test("whiteboard steps update the persistent explanation", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/interview-qa#whiteboard");
    await page.getByTestId("whatsapp-whiteboard-step-5").hover();

    const detail = page.getByTestId("whatsapp-whiteboard-detail");
    await expect(detail).toContainText(/Message Service, Kafka, Bronze, Silver, quarantine, Gold/i);
    await expect(detail).toContainText(/last certified snapshot/i);
  });

  test("mobile question selection works without page-level overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/whatsapp/interview-qa");
    await page.getByRole("tab", { name: /Kafka \+ ingestion/ }).click();
    await page.locator('[data-question-id="q25"]').click();

    await expect(page.getByTestId("whatsapp-interview-answer")).toContainText(/roughly 1,810 partition lanes/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
