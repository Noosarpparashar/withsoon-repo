import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DataEngineeringPage from "@/components/ui/netflix-data-engineering/DataEngineeringPage";
import {
  DATA_ENGINEERING_TAB_META,
  DATA_ENGINEERING_TAB_SLUGS,
  normalizeDataEngineeringTab,
  type DataEngineeringTabSlug,
} from "@/components/ui/netflix-data-engineering/data";

const BASE_URL = "https://withsoon.com/data-engineering/netflix";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string }>;
}): Promise<Metadata> {
  const { tab } = await params;
  const canonicalTab = normalizeDataEngineeringTab(tab) ?? "start-here";
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

export default async function NetflixDataEngineeringTab({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  const normalizedTab = normalizeDataEngineeringTab(tab);

  if (normalizedTab && normalizedTab !== tab) {
    redirect(`/data-engineering/netflix/${normalizedTab}`);
  }
  if (!(DATA_ENGINEERING_TAB_SLUGS as readonly string[]).includes(tab)) {
    redirect("/data-engineering/netflix/start-here");
  }

  return <DataEngineeringPage initialTab={tab as DataEngineeringTabSlug} />;
}
