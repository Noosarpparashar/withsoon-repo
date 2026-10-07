import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Amazon Data Engineering - Interview Q&A", () => {
  test("renders all 50 Amazon e-commerce big-data questions", async ({ page }) => {
    await page.goto("/data-engineering/amazon/interview-qa");

    await expect(page.getByRole("heading", { name: "Interview Q&A", exact: true })).toBeVisible();
    await expect(page.getByTestId("chapter-position")).toContainText("Chapter 9 of 9");
    await expect(page.getByRole("heading", { name: "Defend the complete Amazon big-data design" })).toBeVisible();
    await expect(page.getByTestId("amazon-interview-chapter")).toHaveAttribute("data-total-questions", "50");
    await expect(page.getByTestId("amazon-interview-category")).toHaveCount(8);
    await expect(page.getByTestId("amazon-interview-answer")).toContainText(/Orders, payments, inventory, fulfillment/i);
  });

  test("shows the explicit order and behavior peak calculations", async ({ page }) => {
    await page.goto("/data-engineering/amazon/interview-qa");
    await page.waitForTimeout(300);
    await page.locator('[data-question-id="q03"]').click();

    const answer = page.getByTestId("amazon-interview-answer");
    await expect(answer).toContainText("QUESTION 03 / 50");
    await expect(page.getByTestId("amazon-interview-scenario")).toContainText(/Use the chapter assumptions/i);
    await expect(answer).toContainText(/10M × 30 ÷ 86,400 = 3,472\.22/i);
    await expect(answer).toContainText(/69,444\.44\/s/i);
    await expect(answer).toContainText(/416,666\.67 events\/s/i);
  });

  test("explains CDC correctness and payment reconciliation", async ({ page }) => {
    await page.goto("/data-engineering/amazon/interview-qa");
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: /CDC \+ correctness/ }).click();
    await page.locator('[data-question-id="q10"]').click();
    await expect(page.getByTestId("amazon-interview-scenario")).toContainText(/customer has a confirmed order/i);
    await expect(page.getByTestId("amazon-interview-answer")).toContainText(/outbox row in the same database transaction/i);
    await expect(page.getByTestId("amazon-interview-answer")).toContainText(/partial-failure window/i);

    await page.getByRole("tab", { name: /Modeling \+ finance/ }).click();
    await page.locator('[data-question-id="q37"]').click();
    await expect(page.getByTestId("amazon-interview-answer")).toContainText(/finance\.reconciliation_exception/i);
    await expect(page.getByTestId("amazon-interview-answer")).toContainText(/immutable authorizations, captures, refunds/i);
  });

  test("covers privacy deletion, seller isolation, recovery, and cost", async ({ page }) => {
    await page.goto("/data-engineering/amazon/interview-qa");
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: /Governance \+ recovery/ }).click();

    await page.locator('[data-question-id="q46"]').click();
    await expect(page.getByTestId("amazon-interview-scenario")).toContainText(/identity tables, behavior facts, order history/i);
    await expect(page.getByTestId("amazon-interview-answer")).toContainText(/rewrite files/i);
    await expect(page.getByTestId("amazon-interview-answer")).toContainText(/expire snapshots/i);

    await page.locator('[data-question-id="q47"]').click();
    await expect(page.getByTestId("amazon-interview-answer")).toContainText(/tenant in cache and export keys/i);

    await page.locator('[data-question-id="q50"]').click();
    await expect(page.getByTestId("amazon-interview-answer")).toContainText(/cost per trusted product outcome/i);
  });

  test("whiteboard steps update the persistent explanation", async ({ page }) => {
    await page.goto("/data-engineering/amazon/interview-qa#whiteboard");
    await page.getByTestId("amazon-whiteboard-step-5").click();

    const detail = page.getByTestId("amazon-whiteboard-detail");
    await expect(detail).toContainText(/ownership, freshness clocks, lineage, quality gates/i);
    await expect(detail).toContainText(/last certified snapshot/i);
  });

  test("passes accessibility and mobile overflow checks", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/amazon/interview-qa");

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole("tab", { name: /Kafka \+ ingestion/ }).click();
    await page.locator('[data-question-id="q04"]').click();
    await expect(page.getByTestId("amazon-interview-answer")).toContainText(/rounded baseline is 55/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
