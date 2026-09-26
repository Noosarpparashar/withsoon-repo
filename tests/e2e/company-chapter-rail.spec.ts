import { expect, test } from "@playwright/test";

const widths = [360, 390, 430, 768, 1024, 1280, 1440, 1920] as const;

const tracks = [
  {
    name: "Netflix",
    lastUrl: "/data-engineering/netflix/quiz",
    lastId: "quiz",
    previousId: "capacity-cost",
  },
  {
    name: "Uber",
    lastUrl: "/data-engineering/uber/quiz",
    lastId: "quiz",
    previousId: "governance-quality",
  },
  {
    name: "YouTube",
    lastUrl: "/data-engineering/youtube/governance-quality",
    lastId: "governance-quality",
    previousId: "batch-lakehouse",
  },
] as const;

const startRoutes = [
  "/data-engineering/netflix/start-here",
  "/data-engineering/uber/start-here",
  "/data-engineering/youtube/start-here",
] as const;

test.describe("shared company chapter rail", () => {
  for (const track of tracks) {
    test(`${track.name} reports chapter position without implying completion`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/data-engineering/${track.name.toLowerCase()}/start-here`);

      const rail = page.getByTestId("company-chapter-rail");
      const chapterCount = await rail.locator('[data-testid^="chapter-link-"]').count();
      await expect(page.getByTestId("chapter-position")).toContainText("Chapter position");
      await expect(page.getByTestId("chapter-position")).toContainText(`Chapter 1 of ${chapterCount}`);
      const positionLines = await page.getByTestId("chapter-position").locator("p").evaluateAll((lines) =>
        lines.map((line) => ({
          whiteSpace: getComputedStyle(line).whiteSpace,
          fitsWidth: line.scrollWidth <= line.clientWidth,
        })),
      );
      expect(positionLines).toEqual([
        { whiteSpace: "nowrap", fitsWidth: true },
        { whiteSpace: "nowrap", fitsWidth: true },
      ]);
      await expect(page.getByTestId("chapter-position-announcement")).toContainText(
        `Chapter 1 of ${chapterCount}: Start Here`,
      );
      await expect(rail.getByText("Progress", { exact: true })).toHaveCount(0);

      await page.goto(track.lastUrl);
      await expect(page.getByTestId("chapter-position")).toContainText(
        `Chapter ${chapterCount} of ${chapterCount}`,
      );
      await expect(page.getByTestId("chapter-position-announcement")).toContainText(
        `Chapter ${chapterCount} of ${chapterCount}`,
      );

      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByTestId("chapter-position")).toBeHidden();
      await expect(page.getByTestId("chapter-position-announcement")).toContainText(
        `Chapter ${chapterCount} of ${chapterCount}`,
      );
      await expect(rail.getByText("Progress", { exact: true })).toHaveCount(0);
    });
  }

  for (const track of tracks) {
    test(`${track.name} mobile rail shows intentional overflow cues`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });

      await page.goto(`/data-engineering/${track.name.toLowerCase()}/start-here`);
      const scrollport = page.getByTestId("chapter-scrollport");
      await expect(scrollport).toBeVisible();
      await expect(page.getByTestId("chapter-overflow-left")).toHaveAttribute("data-visible", "false");
      await expect(page.getByTestId("chapter-overflow-right")).toHaveAttribute("data-visible", "true");

      const startGeometry = await page.getByTestId("company-chapter-rail").evaluate((rail) => {
        const scrollport = rail.querySelector<HTMLElement>('[data-testid="chapter-scrollport"]')!;
        const leading = rail.querySelector<HTMLElement>('[data-testid="chapter-leading-controls"]')!;
        const next = rail.querySelector<HTMLElement>('[data-testid="chapter-next"]')!;
        const scrollRect = scrollport.getBoundingClientRect();
        const leadingRect = leading.getBoundingClientRect();
        const nextRect = next.getBoundingClientRect();
        const style = getComputedStyle(scrollport);

        return {
          snapType: style.scrollSnapType,
          paddingLeft: Number.parseFloat(style.paddingLeft),
          paddingRight: Number.parseFloat(style.paddingRight),
          scrollStartsAfterLeading: scrollRect.left >= leadingRect.right - 1,
          scrollEndsBeforeNext: scrollRect.right <= nextRect.left + 1,
          linksSnap: [...rail.querySelectorAll<HTMLElement>('[data-testid^="chapter-link-"]')]
            .every((link) => getComputedStyle(link).scrollSnapAlign === "center"),
          fadesIgnorePointers: [...rail.querySelectorAll<HTMLElement>('[data-testid^="chapter-overflow-"]')]
            .every((fade) => getComputedStyle(fade).pointerEvents === "none"),
        };
      });

      expect(startGeometry.snapType).toContain("x");
      expect(startGeometry.paddingLeft).toBeGreaterThanOrEqual(20);
      expect(startGeometry.paddingRight).toBeGreaterThanOrEqual(20);
      expect(startGeometry.scrollStartsAfterLeading).toBe(true);
      expect(startGeometry.scrollEndsBeforeNext).toBe(true);
      expect(startGeometry.linksSnap).toBe(true);
      expect(startGeometry.fadesIgnorePointers).toBe(true);

      await page.goto(track.lastUrl);
      await expect(page.getByTestId("chapter-overflow-left")).toHaveAttribute("data-visible", "true");
      await expect(page.getByTestId("chapter-overflow-right")).toHaveAttribute("data-visible", "false");

      const active = page.getByTestId(`chapter-link-${track.lastId}`);
      await expect(active).toHaveAttribute("aria-current", "page");
      const activeIsReadable = await active.evaluate((element) => {
        const scrollport = element.closest<HTMLElement>('[data-testid="chapter-scrollport"]')!;
        const activeRect = element.getBoundingClientRect();
        const scrollRect = scrollport.getBoundingClientRect();
        return activeRect.left >= scrollRect.left + 19 && activeRect.right <= scrollRect.right - 19;
      });
      expect(activeIsReadable).toBe(true);
    });
  }

  for (const width of [390, 768, 1024, 1440] as const) {
    test(`uses identical rail slots, baselines, and indicators at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const geometries = [];

      for (const route of startRoutes) {
        const response = await page.goto(route);
        expect(response?.status()).toBeLessThan(400);
        await expect(page.getByTestId("chapter-rail")).toBeVisible();

        const geometry = await page.getByTestId("chapter-rail").evaluate((rail) => {
          const rect = (testId: string) => {
            const bounds = rail.querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.getBoundingClientRect();
            if (!bounds) throw new Error(`Missing ${testId}`);
            return {
              x: Math.round(bounds.x * 10) / 10,
              y: Math.round(bounds.y * 10) / 10,
              width: Math.round(bounds.width * 10) / 10,
              height: Math.round(bounds.height * 10) / 10,
            };
          };

          const active = rail.querySelector<HTMLElement>('[aria-current="page"]');
          const inactive = rail.querySelector<HTMLElement>('[data-testid^="chapter-link-"]:not([aria-current="page"])');
          if (!active || !inactive) throw new Error("Missing chapter links");
          const activeStyle = getComputedStyle(active);
          const inactiveStyle = getComputedStyle(inactive);

          return {
            leading: rect("chapter-leading-controls"),
            scrollport: rect("chapter-scrollport"),
            previous: rect("chapter-previous"),
            next: rect("chapter-next"),
            switcher: rect("data-design-switcher"),
            active: rect("chapter-link-start-here"),
            label: rect("chapter-label"),
            activeBackground: activeStyle.backgroundColor,
            inactiveBackground: inactiveStyle.backgroundColor,
            activeBorder: activeStyle.borderColor,
            inactiveBorder: inactiveStyle.borderColor,
            activeIndicators: rail.querySelectorAll("[data-active-indicator]").length,
            previousSvg: rail.querySelectorAll('[data-testid="chapter-previous"] svg').length,
            nextSvg: rail.querySelectorAll('[data-testid="chapter-next"] svg').length,
            labelAlignment: getComputedStyle(active.querySelector<HTMLElement>('[data-testid="chapter-label"]')!).alignItems,
          };
        });

        geometries.push(geometry);
      }

      const netflix = geometries[0];
      for (const geometry of geometries) {
        expect(geometry.leading).toEqual(netflix.leading);
        expect(geometry.scrollport).toEqual(netflix.scrollport);
        expect(geometry.previous).toEqual(netflix.previous);
        expect(geometry.next).toEqual(netflix.next);
        expect(geometry.switcher).toEqual(netflix.switcher);
        expect(geometry.active.y).toBe(netflix.active.y);
        expect(geometry.active.height).toBe(netflix.active.height);
        expect(geometry.label.y).toBe(netflix.label.y);
        expect(geometry.label.height).toBe(netflix.label.height);
        expect(geometry.activeBackground).toBe(geometry.inactiveBackground);
        expect(geometry.activeBorder).toBe(geometry.inactiveBorder);
        expect(geometry.activeIndicators).toBe(1);
        expect(geometry.previousSvg).toBe(1);
        expect(geometry.nextSvg).toBe(1);
        expect(geometry.labelAlignment).toBe("baseline");
      }
    });
  }

  for (const track of tracks) {
    test(`${track.name} keeps controls isolated and the active chapter visible`, async ({ page }) => {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        const response = await page.goto(track.lastUrl);
        expect(response?.status()).toBeLessThan(400);

        const rail = page.getByTestId("company-chapter-rail");
        await expect(rail).toBeVisible();

        await expect.poll(async () => rail.evaluate((root) => {
          const leading = root.querySelector<HTMLElement>('[data-testid="chapter-leading-controls"]');
          const scrollport = root.querySelector<HTMLElement>('[data-testid="chapter-scrollport"]');
          const next = root.querySelector<HTMLElement>('[data-testid="chapter-next"]');
          const active = root.querySelector<HTMLElement>('[aria-current="page"]');
          if (!leading || !scrollport || !next || !active) return false;

          const rootRect = root.getBoundingClientRect();
          const leadingRect = leading.getBoundingClientRect();
          const scrollRect = scrollport.getBoundingClientRect();
          const nextRect = next.getBoundingClientRect();
          const activeRect = active.getBoundingClientRect();
          const hitTarget = document.elementFromPoint(activeRect.left + activeRect.width / 2, activeRect.top + activeRect.height / 2);
          const visibleLinksOwnTheirHitArea = [...root.querySelectorAll<HTMLAnchorElement>("a")].every((link) => {
            const rect = link.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const isChapterLink = link.hasAttribute("data-testid") && link.dataset.testid?.startsWith("chapter-link-");
            const centerIsVisible =
              centerX >= rootRect.left &&
              centerX <= rootRect.right &&
              centerY >= rootRect.top &&
              centerY <= rootRect.bottom &&
              (!isChapterLink || (centerX >= scrollRect.left && centerX <= scrollRect.right));

            if (!centerIsVisible) return true;
            const hit = document.elementFromPoint(centerX, centerY);
            return hit !== null && link.contains(hit);
          });

          return (
            leadingRect.left >= rootRect.left - 1 &&
            leadingRect.right <= scrollRect.left + 1 &&
            scrollRect.right <= nextRect.left + 1 &&
            nextRect.right <= rootRect.right + 1 &&
            activeRect.left >= scrollRect.left - 1 &&
            activeRect.right <= scrollRect.right + 1 &&
            hitTarget !== null &&
            active.contains(hitTarget) &&
            visibleLinksOwnTheirHitArea &&
            [...root.querySelectorAll('[data-testid^="chapter-link-"]')].every((link) => link.tagName === "A")
          );
        }), `${track.name} rail geometry at ${width}px`).toBe(true);

        await expect(page.getByTestId(`chapter-link-${track.lastId}`)).toHaveAttribute("aria-current", "page");
        await page.getByTestId("chapter-previous").click();
        await expect(page).toHaveURL(new RegExp(`/data-engineering/[^/]+/${track.previousId}(?:#|$)`));
        await expect(page.getByTestId(`chapter-link-${track.previousId}`)).toHaveAttribute("aria-current", "page");
      }
    });
  }
});
