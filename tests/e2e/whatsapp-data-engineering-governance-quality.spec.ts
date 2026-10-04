import { expect, test } from "@playwright/test";

test.describe("WhatsApp Data Engineering - Governance and Quality", () => {
  test("renders the complete governance and quality chapter", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/governance-quality");

    await expect(page.getByRole("heading", { name: "Governance / Quality", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Every WhatsApp lifecycle dataset has a named path to an answer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Six gates protect WhatsApp delivery and call truth" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Healthy jobs do not prove complete WhatsApp lifecycles" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Measure WhatsApp evidence from acceptance to the SRE screen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Identity gets smaller as WhatsApp data travels farther" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recover WhatsApp analytics without touching the message path" })).toBeVisible();
  });

  test("explains accountable ownership and privacy-safe release evidence", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/governance-quality");
    const detail = page.getByTestId("whatsapp-governance-owner-detail");

    await page.getByTestId("whatsapp-governance-owner-4").hover();
    await expect(detail).toContainText(/token policy, allowed linkage, retention, access purpose/i);
    await expect(detail).toContainText(/time-bound grant/i);
    await page.getByTestId("whatsapp-governance-owner-0").hover();
    await expect(detail).toContainText(/messaging\.lifecycle\.v1/i);
    await expect(detail).toContainText(/Message Service/i);
    await expect(page.getByText("Tolerant readers first", { exact: true })).toBeVisible();
  });

  test("shows layer-specific quality gates and publication behavior", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/governance-quality#quality-gates");
    const detail = page.getByTestId("whatsapp-quality-gate-detail");

    await page.getByTestId("whatsapp-quality-gate-3").click();
    await expect(detail).toContainText(/accepted ≤ routed ≤ delivered ≤ read/i);
    await expect(detail).toContainText(/recipient-device delivery/i);
    await expect(detail).toContainText(/P0 for privacy; P1 for corrupted delivery truth/i);

    await page.getByTestId("whatsapp-quality-gate-4").hover();
    await expect(detail).toContainText(/previous certified snapshot/i);
    await expect(detail).toContainText(/Android coverage suddenly falls by 50%/i);
  });

  test("reconciles WhatsApp lifecycles at the correct grain", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/governance-quality#lifecycle-reconciliation");
    const detail = page.getByTestId("whatsapp-reconciliation-detail");

    await page.getByTestId("whatsapp-reconciliation-1").click();
    await expect(detail).toContainText(/membership effective at send time/i);
    await expect(detail).toContainText("membership_version");

    await page.getByTestId("whatsapp-reconciliation-4").hover();
    await expect(detail).toContainText(/Notification success is not message delivery success/i);
    await expect(page.getByText(/Never force-match a total/i)).toBeVisible();
  });

  test("connects observability signals to WhatsApp topics and products", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/governance-quality#observability");
    const detail = page.getByTestId("whatsapp-signal-detail");

    await page.getByTestId("whatsapp-observability-signal-1").hover();
    await expect(detail).toContainText(/messaging\.lifecycle\.v1/i);
    await expect(detail).toContainText(/groups\.membership\.v1/i);
    await expect(detail).toContainText(/hot conversation\/group partition/i);

    await page.getByTestId("whatsapp-observability-signal-4").click();
    await expect(detail).toContainText(/agg_delivery_health_5m/i);
    await expect(detail).toContainText(/previous certified version/i);
  });

  test("makes privacy and incident recovery enforceable", async ({ page }) => {
    await page.goto("/data-engineering/whatsapp/governance-quality#privacy-access");
    const privacy = page.getByTestId("whatsapp-privacy-stage-detail");
    await page.getByRole("button", { name: "Minimize + tokenize" }).click();
    await expect(privacy).toContainText(/keyed or rotating pseudonymous tokens/i);
    await expect(privacy).toContainText(/raw phone number/i);
    await expect(page.getByTestId("whatsapp-access-workflow")).toContainText(/two-hour access/i);
    await expect(page.getByTestId("whatsapp-access-workflow")).toContainText(/silver\.message_delivery_event/i);

    await page.getByTestId("whatsapp-governance-incident-5").click();
    const incident = page.getByTestId("whatsapp-governance-incident-detail");
    await expect(incident).toContainText(/phone number, raw IP, contact data, or plaintext/i);
    await expect(incident).toContainText(/Schema validity never overrides WhatsApp privacy policy/i);
  });

  test("mobile anchors work without page-level overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/data-engineering/whatsapp/governance-quality");
    await page.getByTestId("mobile-section-failure-recovery").click();
    await expect(page).toHaveURL(/#failure-recovery$/);
    await expect(page.getByTestId("mobile-section-failure-recovery")).toHaveAttribute("aria-current", "location");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
