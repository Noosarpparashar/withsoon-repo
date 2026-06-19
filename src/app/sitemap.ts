import type { MetadataRoute } from "next";
import { getAllContent } from "@/lib/content";

const BASE = "https://withsoon.com";

const NETFLIX_TABS = ["architecture", "models", "tradeoffs", "capacity", "quiz"];

const STATIC_ROUTES = [
  { url: BASE, priority: 1.0, changeFrequency: "weekly" as const },
  { url: `${BASE}/big-data`, priority: 0.9, changeFrequency: "weekly" as const },
  { url: `${BASE}/ai`, priority: 0.9, changeFrequency: "weekly" as const },
  { url: `${BASE}/interview`, priority: 0.9, changeFrequency: "weekly" as const },
  { url: `${BASE}/cheatsheets`, priority: 0.8, changeFrequency: "weekly" as const },
  { url: `${BASE}/tech-news`, priority: 0.7, changeFrequency: "daily" as const },
  { url: `${BASE}/about`, priority: 0.5, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const allContent = getAllContent();
  const now = new Date().toISOString();

  const contentUrls: MetadataRoute.Sitemap = allContent.map((item) => ({
    url: `${BASE}/${item.section}/${item.slug}`,
    lastModified: item.date ? new Date(item.date).toISOString() : now,
    changeFrequency: "monthly" as const,
    priority: item.featured ? 0.8 : 0.6,
  }));

  const netflixUrls: MetadataRoute.Sitemap = NETFLIX_TABS.map((tab) => ({
    url: `${BASE}/system-design/netflix/${tab}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  return [...STATIC_ROUTES, ...netflixUrls, ...contentUrls];
}
