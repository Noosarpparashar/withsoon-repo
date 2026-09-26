import { expect, test } from "@playwright/test";

const DEEP_LINKS = [
  {
    name: "Netflix middle section",
    url: "/data-engineering/netflix/requirements#req-domains",
    id: "req-domains",
  },
  {
    name: "Uber final section",
    url: "/data-engineering/uber/requirements#design-implication",
    id: "design-implication",
  },
  {
    name: "YouTube final section",
    url: "/data-engineering/youtube/governance-quality#governance-answer",
    id: "governance-answer",
  },
] as const;

test.describe("Data-design deep-link alignment", () => {
  for (const deepLink of DEEP_LINKS) {
    test(`${deepLink.name} clears the sticky shell`, async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const response = await page.goto(deepLink.url);
      expect(response?.status()).toBeLessThan(400);

      const target = page.locator(`#${deepLink.id}`);
      await expect(target).toBeVisible();
      await expect
        .poll(
          () =>
            target.evaluate((node) => {
              const targetTop = node.getBoundingClientRect().top;
              const anchorOffset = Number.parseFloat(
                getComputedStyle(document.documentElement).getPropertyValue(
                  "--de-anchor-offset",
                ),
              );
              return Math.abs(targetTop - anchorOffset);
            }),
          { message: `${deepLink.url} should settle at the shared anchor offset` },
        )
        .toBeLessThanOrEqual(2);

      const geometry = await target.evaluate((node) => {
        const style = getComputedStyle(node);
        const targetTop = node.getBoundingClientRect().top;
        const anchorOffset = Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--de-anchor-offset",
          ),
        );
        return {
          anchorOffset,
          scrollMarginTop: Number.parseFloat(style.scrollMarginTop),
          targetTop,
        };
      });

      expect(geometry.scrollMarginTop).toBe(geometry.anchorOffset);
      expect(geometry.anchorOffset).toBe(
        testInfo.project.name === "mobile" ? 120 : 148,
      );
      expect(geometry.targetTop).toBeGreaterThan(0);
    });
  }

  test("a final mobile section can align without hitting the page bottom", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/data-engineering/youtube/governance-quality");

    const button = page.getByTestId("mobile-section-governance-answer");
    await button.tap();
    await expect(page).toHaveURL(/#governance-answer$/);
    await expect(button).toHaveAttribute("aria-current", "location");

    const target = page.locator("#governance-answer");
    await expect
      .poll(() =>
        target.evaluate((node) =>
          Math.abs(node.getBoundingClientRect().top - 120),
        ),
      )
      .toBeLessThanOrEqual(2);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight -
          (window.scrollY + window.innerHeight),
      ),
    ).toBeGreaterThan(0);
  });
});
