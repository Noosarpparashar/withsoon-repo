import { expect, test, type Locator, type Page } from "@playwright/test";

const tracks = [
  {
    name: "Netflix",
    path: "/data-engineering/netflix/start-here",
    sectionNav: '[data-testid="netflix-mobile-section-nav"]',
  },
  {
    name: "Uber",
    path: "/data-engineering/uber/start-here",
    sectionNav: '[data-testid="mobile-section-nav"]',
  },
  {
    name: "YouTube",
    path: "/data-engineering/youtube/start-here",
    sectionNav: '[data-testid="mobile-section-nav"]',
  },
] as const;

async function rect(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

async function waitForCondensed(page: Page, expected: boolean) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.getAttribute("data-de-shell-condensed") === "true",
      ),
    )
    .toBe(expected);
  await page.waitForTimeout(240);
}

test("the global mobile header uses the shared compact height", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const header = page.getByTestId("global-header");
  await expect(header).toBeVisible();
  expect((await rect(header)).height).toBeLessThanOrEqual(48);
  await expect(header.getByRole("link", { name: "withsoon home" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Browse Data Engineering Designs" })).toBeVisible();
  await expect(header.getByRole("button", { name: /theme|dark mode|light mode/i })).toHaveCount(0);
});

for (const track of tracks) {
  test(`${track.name} shell is 144px initially and 96px while reading`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(track.path);

    const header = page.getByTestId("global-header");
    const chapterRail = page.getByTestId("company-chapter-rail");
    const sectionNav = page.locator(track.sectionNav);

    await expect(header).toBeVisible();
    await expect(chapterRail).toBeVisible();
    await expect(sectionNav).toBeVisible();

    const initialHeader = await rect(header);
    const initialRail = await rect(chapterRail);
    const initialSections = await rect(sectionNav);

    expect(initialHeader.height).toBeLessThanOrEqual(48);
    expect(initialRail.height).toBeLessThanOrEqual(52);
    expect(initialSections.height).toBeLessThanOrEqual(44);
    expect(initialRail.y).toBeLessThanOrEqual(initialHeader.y + initialHeader.height + 1);
    expect(initialSections.y).toBeLessThanOrEqual(initialRail.y + initialRail.height + 1);
    expect(initialSections.y + initialSections.height).toBeLessThanOrEqual(145);

    await page.evaluate(() => window.scrollTo(0, 650));
    await waitForCondensed(page, true);

    const condensedHeader = await rect(header);
    const condensedRail = await rect(chapterRail);
    const condensedSections = await rect(sectionNav);

    expect(condensedHeader.y + condensedHeader.height).toBeLessThanOrEqual(1);
    expect(condensedRail.y).toBeLessThanOrEqual(1);
    expect(condensedSections.y).toBeLessThanOrEqual(condensedRail.height + 1);
    expect(condensedSections.y + condensedSections.height).toBeLessThanOrEqual(97);
    await expect(chapterRail.getByTestId("chapter-next")).toBeVisible();

    if (track.name === "Netflix") {
      await expect(sectionNav.getByRole("button", { name: "Outline" })).toBeVisible();
    } else {
      await expect(sectionNav.locator("button[data-mobile-section-id]").first()).toBeVisible();
    }

    expect(
      await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)),
    ).toBe(120);

    await page.evaluate(() => window.scrollBy(0, -120));
    await waitForCondensed(page, false);
    await expect(header).toBeVisible();
    await expect(header).not.toHaveAttribute("inert", "");
  });
}

test("compact shell remains non-overlapping at audited mobile widths", async ({ page }) => {
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });

    for (const track of tracks) {
      await page.goto(track.path);
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        window.dispatchEvent(new Event("scroll"));
      });
      await waitForCondensed(page, false);
      await page.evaluate(() => window.scrollTo(0, 650));
      await waitForCondensed(page, true);

      const rail = await rect(page.getByTestId("company-chapter-rail"));
      const sections = await rect(page.locator(track.sectionNav));
      expect(rail.x).toBeGreaterThanOrEqual(0);
      expect(rail.x + rail.width).toBeLessThanOrEqual(width);
      expect(sections.x).toBeGreaterThanOrEqual(0);
      expect(sections.x + sections.width).toBeLessThanOrEqual(width);
      expect(sections.y).toBeGreaterThanOrEqual(rail.y + rail.height - 1);

      const horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(horizontalOverflow).toBeLessThanOrEqual(1);
    }
  }
});
