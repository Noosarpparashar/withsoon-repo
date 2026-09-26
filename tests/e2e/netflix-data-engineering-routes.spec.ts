import { expect, test } from "@playwright/test";
import {
  DATA_ENGINEERING_TAB_META,
  NETFLIX_ROUTE_ALIASES,
  NETFLIX_ROUTE_REGISTRY,
  resolveNetflixRoute,
} from "../../src/components/ui/netflix-data-engineering/data";

const netflixPath = (slug: string) => `/data-engineering/netflix/${slug}`;

test.describe("Netflix curriculum route registry", () => {
  test("the registry is complete, collision-free, and authoritative", () => {
    const canonicalIds = NETFLIX_ROUTE_REGISTRY.map((chapter) => chapter.id);
    const aliases = NETFLIX_ROUTE_ALIASES.map(({ alias }) => alias);

    expect(new Set(canonicalIds).size).toBe(canonicalIds.length);
    expect(new Set(aliases).size).toBe(aliases.length);
    expect(aliases.filter((alias) => canonicalIds.includes(alias as never))).toEqual([]);
    expect(NETFLIX_ROUTE_REGISTRY.every((chapter) => chapter.availability === "published")).toBe(true);

    expect(Object.keys(DATA_ENGINEERING_TAB_META)).toEqual(canonicalIds);

    for (const chapter of NETFLIX_ROUTE_REGISTRY) {
      expect(resolveNetflixRoute(chapter.id)).toMatchObject({
        availability: "published",
        canonicalSlug: chapter.id,
      });
    }
    for (const { alias, destination } of NETFLIX_ROUTE_ALIASES) {
      expect(resolveNetflixRoute(alias)).toMatchObject({
        availability: "redirect",
        canonicalSlug: destination,
      });
    }
  });

  test("every published route and alias resolves according to the registry", async ({ request }) => {
    for (const chapter of NETFLIX_ROUTE_REGISTRY) {
      const response = await request.get(netflixPath(chapter.id), { maxRedirects: 0 });
      expect(response.status(), `${chapter.id} should be published`).toBe(200);
    }

    for (const { alias, destination } of NETFLIX_ROUTE_ALIASES) {
      const response = await request.get(netflixPath(alias), { maxRedirects: 0 });
      expect(response.status(), `${alias} should permanently redirect`).toBe(308);
      expect(response.headers().location).toBe(netflixPath(destination));
    }
  });

  test("homepage, rail, chapter position, headings, and sitemap agree", async ({ page, request }) => {
    const canonicalIds = NETFLIX_ROUTE_REGISTRY.map((chapter) => chapter.id);
    const chapterLabels = NETFLIX_ROUTE_REGISTRY.map((chapter) => chapter.label);

    await page.goto("/");
    const homepageCard = page.locator(`a[href="${netflixPath("start-here")}"]`);
    await expect(homepageCard).toContainText(`${NETFLIX_ROUTE_REGISTRY.length} chapters`);

    const sitemapResponse = await request.get("/sitemap.xml");
    expect(sitemapResponse.status()).toBe(200);
    const xml = await sitemapResponse.text();
    const sitemapNetflixPaths = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
      .map((match) => new URL(match[1]).pathname)
      .filter((path) => path.startsWith("/data-engineering/netflix/"));
    expect(sitemapNetflixPaths).toEqual(canonicalIds.map(netflixPath));

    for (let index = 0; index < NETFLIX_ROUTE_REGISTRY.length; index += 1) {
      const chapter = NETFLIX_ROUTE_REGISTRY[index];
      await page.goto(netflixPath(chapter.id));

      const rail = page.getByTestId("company-chapter-rail");
      await expect(rail.locator('[data-testid^="chapter-link-"]')).toHaveCount(
        NETFLIX_ROUTE_REGISTRY.length,
      );
      await expect(rail.locator('[data-testid^="chapter-link-"] span.whitespace-nowrap')).toHaveText(
        chapterLabels,
      );
      await expect(rail).toContainText(
        `Chapter ${index + 1} of ${NETFLIX_ROUTE_REGISTRY.length}`,
      );
      await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
        `Netflix Data Engineering: ${chapter.label}`,
      );
    }
  });

  test("sitemap contains no aliases, orphans, or unhealthy Netflix pages", async ({ request }) => {
    const sitemapResponse = await request.get("/sitemap.xml");
    const xml = await sitemapResponse.text();
    const sitemapPaths = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(
      (match) => new URL(match[1]).pathname,
    );

    for (const { alias } of NETFLIX_ROUTE_ALIASES) {
      expect(sitemapPaths).not.toContain(netflixPath(alias));
    }

    for (const chapter of NETFLIX_ROUTE_REGISTRY) {
      const pathname = netflixPath(chapter.id);
      expect(sitemapPaths).toContain(pathname);
      const response = await request.get(pathname, { maxRedirects: 0 });
      expect(response.status(), `${pathname} should be a healthy canonical page`).toBe(200);
    }
  });
});
