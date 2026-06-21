import { redirect } from "next/navigation";
import type { Metadata } from "next";
import DataEngineeringPage from "@/components/ui/netflix-data-engineering/DataEngineeringPage";
import {
  DATA_ENGINEERING_TAB_META,
  DATA_ENGINEERING_TAB_SLUGS,
  normalizeDataEngineeringTab,
  type DataEngineeringTabSlug,
} from "@/components/ui/netflix-data-engineering/data";

const TAB_META: Record<DataEngineeringTabSlug, { title: string; description: string }> = DATA_ENGINEERING_TAB_META;

function getBreadcrumbName(tab: string) {
  const metaTitle = TAB_META[tab as DataEngineeringTabSlug]?.title;
  if (!metaTitle) return tab;
  return metaTitle
    .replace("Netflix Data Engineering — ", "")
    .replace(" | withsoon.com", "");
}

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }): Promise<Metadata> {
  const { tab } = await params;
  const canonicalTab = normalizeDataEngineeringTab(tab) ?? tab;
  const meta = TAB_META[canonicalTab as DataEngineeringTabSlug] ?? {
    title: `Netflix Data Engineering — ${canonicalTab} | withsoon.com`,
    description: "Interactive Netflix-like data engineering interview prep: ingestion, streaming pipelines, lakehouse, data quality, and mock interviews.",
  };
  const ogUrl = new URL("/og", "https://withsoon.com");
  ogUrl.searchParams.set("title", meta.title.replace(" | withsoon.com", ""));
  ogUrl.searchParams.set("section", "System Design");
  const ogImageUrl = ogUrl.toString();

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://withsoon.com/system-design/netflix-data-engineering/${canonicalTab}`,
      siteName: "withsoon",
      type: "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: meta.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `https://withsoon.com/system-design/netflix-data-engineering/${canonicalTab}`,
    },
  };
}

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const normalizedTab = normalizeDataEngineeringTab(tab);

  if (normalizedTab && normalizedTab !== tab) {
    redirect(`/system-design/netflix-data-engineering/${normalizedTab}`);
  }

  if (!(DATA_ENGINEERING_TAB_SLUGS as readonly string[]).includes(tab)) {
    redirect("/system-design/netflix-data-engineering/start-here");
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://withsoon.com" },
      { "@type": "ListItem", position: 2, name: "System Design", item: "https://withsoon.com/system-design" },
      { "@type": "ListItem", position: 3, name: "Netflix Data Engineering", item: "https://withsoon.com/system-design/netflix-data-engineering" },
      {
        "@type": "ListItem",
        position: 4,
        name: getBreadcrumbName(tab),
        item: `https://withsoon.com/system-design/netflix-data-engineering/${tab}`,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <DataEngineeringPage initialTab={tab as DataEngineeringTabSlug} />
    </>
  );
}
