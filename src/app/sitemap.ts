import type { MetadataRoute } from "next";
import { DATA_ENGINEERING_TAB_SLUGS } from "@/components/ui/netflix-data-engineering/data";
import { UBER_DE_TAB_SLUGS } from "@/components/ui/uber-data-engineering/data";
import { YOUTUBE_READY_TABS } from "@/components/ui/youtube-data-engineering/data";

const BASE = "https://withsoon.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const tracks = [
    ...DATA_ENGINEERING_TAB_SLUGS.map((tab) => `/data-engineering/netflix/${tab}`),
    ...UBER_DE_TAB_SLUGS.map((tab) => `/data-engineering/uber/${tab}`),
    ...YOUTUBE_READY_TABS.map((tab) => `/data-engineering/youtube/${tab}`),
  ];

  return [
    { url: BASE, lastModified, changeFrequency: "weekly", priority: 1 },
    ...tracks.map((path) => ({ url: `${BASE}${path}`, lastModified, changeFrequency: "weekly" as const, priority: 0.85 })),
  ];
}
