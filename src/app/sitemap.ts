import type { MetadataRoute } from "next";
import { NETFLIX_ROUTE_REGISTRY } from "@/components/ui/netflix-data-engineering/curriculum";
import { UBER_DE_TAB_SLUGS } from "@/components/ui/uber-data-engineering/data";
import { YOUTUBE_READY_TABS } from "@/components/ui/youtube-data-engineering/data";
import { BOOKMYSHOW_CHAPTERS } from "@/components/ui/bookmyshow-data-engineering/data";

const BASE = "https://withsoon.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const tracks = [
    ...NETFLIX_ROUTE_REGISTRY.map((chapter) => `/data-engineering/netflix/${chapter.id}`),
    ...UBER_DE_TAB_SLUGS.map((tab) => `/data-engineering/uber/${tab}`),
    ...YOUTUBE_READY_TABS.map((tab) => `/data-engineering/youtube/${tab}`),
    ...BOOKMYSHOW_CHAPTERS.map((chapter) => `/data-engineering/bookmyshow/${chapter.id}`),
  ];

  return [
    { url: BASE, lastModified, changeFrequency: "weekly", priority: 1 },
    ...tracks.map((path) => ({ url: `${BASE}${path}`, lastModified, changeFrequency: "weekly" as const, priority: 0.85 })),
  ];
}
