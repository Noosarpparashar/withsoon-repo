import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectSingleSelected(
  controls: Locator,
  attribute: "aria-checked" | "aria-pressed" | "aria-selected",
) {
  await expect(controls).not.toHaveCount(0);
  await expect
    .poll(() =>
      controls.evaluateAll(
        (elements, stateAttribute) =>
          elements.filter((element) => element.getAttribute(stateAttribute) === "true").length,
        attribute,
      ),
    )
    .toBe(1);
}

async function expectNoSeriousAriaViolations(page: Page, selector: string) {
  const results = await new AxeBuilder({ page })
    .include(selector)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test.describe("selection control semantics", () => {
  test("Netflix quiz exposes the selected question and updated answer", async ({ page }) => {
    await page.goto("/data-engineering/netflix/quiz");

    const group = page.getByRole("radiogroup", { name: "Netflix interview questions" });
    const questions = group.getByRole("radio");
    await expectSingleSelected(questions, "aria-checked");

    const first = questions.first();
    const second = questions.nth(1);
    await expect(first).toHaveAttribute("aria-checked", "true");
    await second.click();
    await expect(second).toHaveAttribute("aria-checked", "true");
    await expect(first).toHaveAttribute("aria-checked", "false");
    await expect(page.locator("#netflix-interview-answer")).toContainText(
      (await second.locator("p").first().textContent())?.trim() ?? "",
    );

    await expectNoSeriousAriaViolations(page, '[role="radiogroup"]');
  });

  test("Netflix feedback announces and exposes the saved vote", async ({ page }) => {
    await page.goto("/data-engineering/netflix/start-here");

    const group = page.getByRole("group", { name: "Was this tab useful?" });
    const yes = group.getByRole("button", { name: "Yes, this tab was useful" });
    const no = group.getByRole("button", { name: "No, this tab was not useful" });
    await group.scrollIntoViewIfNeeded();
    await expect(yes).toHaveAttribute("aria-pressed", "false");
    await yes.click();
    await expect(yes).toHaveAttribute("aria-pressed", "true");
    await expect(no).toHaveAttribute("aria-pressed", "false");
    await expect(group.getByRole("status")).toHaveText("Feedback saved: useful.");

    await no.click();
    await expect(no).toHaveAttribute("aria-pressed", "true");
    await expect(yes).toHaveAttribute("aria-pressed", "false");
    await expect(group.getByRole("status")).toHaveText("Feedback saved: not useful.");
  });

  test("Uber question tabs and question choices expose their current state", async ({ page }) => {
    await page.goto("/data-engineering/uber/quiz");

    const tabs = page.getByRole("tablist", { name: "Interview question categories" }).getByRole("tab");
    await expectSingleSelected(tabs, "aria-selected");
    const secondTab = tabs.nth(1);
    await secondTab.click();
    await expect(secondTab).toHaveAttribute("aria-selected", "true");

    const panel = page.getByRole("tabpanel");
    await expect(panel).toHaveAttribute("aria-labelledby", await secondTab.getAttribute("id") ?? "");
    const questions = panel.getByRole("radiogroup").getByRole("radio");
    await expectSingleSelected(questions, "aria-checked");
    if ((await questions.count()) > 1) {
      await questions.nth(1).click();
      await expect(questions.nth(1)).toHaveAttribute("aria-checked", "true");
    }

    await expectNoSeriousAriaViolations(page, '#uber-question-category-panel');
  });

  test("YouTube event-contract tabs identify the active field group", async ({ page }) => {
    await page.goto("/data-engineering/youtube/event-sources#event-contract");

    const tabs = page.getByRole("tablist", { name: "Event contract field groups" }).getByRole("tab");
    await expectSingleSelected(tabs, "aria-selected");
    const target = tabs.nth(1);
    await target.click();
    await expect(target).toHaveAttribute("aria-selected", "true");
    const panel = page.locator("#event-contract-panel");
    await expect(panel).toHaveAttribute("aria-labelledby", await target.getAttribute("id") ?? "");

    await expectNoSeriousAriaViolations(page, '#event-contract-panel');
  });
});
