import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = [
  { name: "Homepage", url: "/" },
  { name: "Netflix Start Here", url: "/data-engineering/netflix/start-here" },
  { name: "Uber Start Here", url: "/data-engineering/uber/start-here" },
  { name: "YouTube Start Here", url: "/data-engineering/youtube/start-here" },
] as const;

for (const route of ROUTES) {
  test(`${route.name} has no serious color-contrast violations`, async ({ page }) => {
    const response = await page.goto(route.url);
    expect(response?.status()).toBeLessThan(400);

    const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
    const serious = results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .flatMap((violation) => violation.nodes.map((node) => ({
        impact: violation.impact,
        target: node.target.join(" "),
        summary: node.failureSummary,
        html: node.html,
      })));

    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}

const EXPLAINERS = [
  {
    name: "Netflix lesson tooltip",
    url: "/data-engineering/netflix/start-here",
    trigger: "button[aria-describedby]:visible",
    panel: "[role=tooltip]:visible",
  },
  {
    name: "Uber lesson explainer",
    url: "/data-engineering/uber/start-here",
    trigger: "[data-explainer-trigger]:visible",
    panel: "[data-testid=explainer-panel]:visible",
  },
  {
    name: "YouTube lesson explainer",
    url: "/data-engineering/youtube/event-sources",
    trigger: "[data-explainer-trigger]:visible",
    panel: "[data-testid=explainer-panel]:visible",
  },
] as const;

for (const explainer of EXPLAINERS) {
  test(`${explainer.name} has no serious color-contrast violations`, async ({ page }, testInfo) => {
    const response = await page.goto(explainer.url);
    expect(response?.status()).toBeLessThan(400);

    const trigger = page.locator(explainer.trigger).first();
    await expect(trigger).toBeVisible();
    const touchProject = testInfo.project.name === "mobile";
    if (touchProject) {
      await trigger.click();
      await expect(page.locator("[role=dialog]:visible").first()).toBeVisible();
    } else {
      await trigger.hover();
      await expect(page.locator(explainer.panel).first()).toBeVisible();
    }

    const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
    const serious = results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .flatMap((violation) => violation.nodes.map((node) => ({
        impact: violation.impact,
        target: node.target.join(" "),
        summary: node.failureSummary,
        html: node.html,
      })));

    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}
