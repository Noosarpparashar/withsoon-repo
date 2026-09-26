import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import DataEngineeringPage from "@/components/ui/netflix-data-engineering/DataEngineeringPage";
import {
  DATA_ENGINEERING_TAB_META,
  NETFLIX_ROUTE_REGISTRY,
  resolveNetflixRoute,
  type NetflixChapterSlug,
} from "@/components/ui/netflix-data-engineering/data";

const BASE_URL = "https://withsoon.com/data-engineering/netflix";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string }>;
}): Promise<Metadata> {
  const { tab } = await params;
  const resolution = resolveNetflixRoute(tab);
  const canonicalTab =
    resolution.availability === "missing"
      ? "start-here"
      : resolution.canonicalSlug;
  const meta = DATA_ENGINEERING_TAB_META[canonicalTab];

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `${BASE_URL}/${canonicalTab}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE_URL}/${canonicalTab}`,
      siteName: "withsoon",
      type: "website",
    },
  };
}

export function generateStaticParams() {
  return NETFLIX_ROUTE_REGISTRY.map((chapter) => ({ tab: chapter.id }));
}

export default async function NetflixDataEngineeringTab({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  const resolution = resolveNetflixRoute(tab);

  if (resolution.availability === "missing") {
    notFound();
  }
  if (resolution.availability === "redirect") {
    permanentRedirect(
      `/data-engineering/netflix/${resolution.canonicalSlug}`,
    );
  }

  return (
    <DataEngineeringPage initialTab={resolution.canonicalSlug as NetflixChapterSlug} />
  );
}
