import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Amazon Data Engineering - Governance and Quality", () => {
  test("renders the complete governance and quality chapter", async ({ page }) => {
    await page.goto("/data-engineering/amazon/governance-quality");

    await expect(page.getByRole("heading", { name: "Governance / Quality", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Every commerce dataset has a named path to an answer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Six gates protect commerce and financial truth" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Healthy jobs do not prove complete orders or exact money" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Measure each commerce fact from commit to consumer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Identity and privilege shrink as data travels farther" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recover analytics without putting checkout at risk" })).toBeVisible();
  });

  test("connects ownership and quality gates to retained evidence", async ({ page }) => {
    await page.goto("/data-engineering/amazon/governance-quality");

    await expect(page.getByTestId("amazon-governance-owner-detail")).toContainText(/stable IDs, sequencing/i);
    await expect(page.getByTestId("amazon-governance-owner-detail")).toContainText(/deployment version, source counter/i);
    await expect(page.getByText("Readers first", { exact: true })).toBeVisible();

    await page.goto("/data-engineering/amazon/governance-quality#quality-gates");
    await page.getByTestId("amazon-quality-gate-4").click();
    await expect(page.getByTestId("amazon-quality-gate-detail")).toContainText(/gold\.daily_sales/i);
    await expect(page.getByTestId("amazon-quality-gate-detail")).toContainText(/previous snapshot/i);

    await page.getByTestId("amazon-quality-gate-5").click();
    await expect(page.getByTestId("amazon-quality-gate-detail")).toContainText(/another seller’s rows/i);
  });

  test("reconciles money, inventory, and seller payouts at explicit grains", async ({ page }) => {
    await page.goto("/data-engineering/amazon/governance-quality#commerce-reconciliation");
    const detail = page.getByTestId("amazon-reconciliation-detail");

    await page.getByTestId("amazon-reconciliation-1").click();
    await expect(detail).toContainText(/Captured minus refunded and chargebacks/i);
    await expect(detail).toContainText(/processor_reference/i);

    await page.getByTestId("amazon-reconciliation-4").hover();
    await expect(detail).toContainText(/Seller payout equals eligible immutable movements/i);
    await expect(page.getByText(/Never force-match a total/i)).toBeVisible();
  });

  test("makes observability, privacy, and recovery actionable", async ({ page }) => {
    await page.goto("/data-engineering/amazon/governance-quality#observability");

    await page.getByTestId("amazon-observability-signal-4").click();
    await expect(page.getByTestId("amazon-signal-detail")).toContainText(/Daily sales, seller metrics, delivery SLA, or finance ledger/i);
    await expect(page.getByTestId("amazon-signal-detail")).toContainText(/keep the previous version/i);

    await page.getByRole("button", { name: "Retain + delete" }).click();
    await expect(page.getByTestId("amazon-privacy-stage-detail")).toContainText(/Iceberg rewrite and snapshot expiry/i);
    await expect(page.getByTestId("amazon-access-workflow")).toContainText(/two-hour access/i);

    await page.getByTestId("amazon-governance-incident-4").click();
    await expect(page.getByTestId("amazon-governance-incident-detail")).toContainText(/tenant predicates and cache keys/i);
    await expect(page.getByTestId("amazon-governance-incident-detail")).toContainText(/tenant isolation/i);
  });

  test("passes accessibility and mobile navigation checks", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/amazon/governance-quality");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);

    await page.getByTestId("mobile-section-failure-recovery").click();
    await expect(page).toHaveURL(/#failure-recovery$/);
    await expect(page.getByTestId("mobile-section-failure-recovery")).toHaveAttribute("aria-current", "location");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
