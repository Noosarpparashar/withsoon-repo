import { redirect } from "next/navigation";
import type { Metadata } from "next";
import UberDataEngineeringPage from "@/components/ui/uber-data-engineering/UberDataEngineeringPage";
import {
  normalizeUberDeTab,
  UBER_DE_TAB_META,
  UBER_DE_TAB_SLUGS,
  type UberDeTabSlug,
} from "@/components/ui/uber-data-engineering/data";

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }): Promise<Metadata> {
  const { tab } = await params;
  const canonicalTab = normalizeUberDeTab(tab) ?? tab;
  const meta = UBER_DE_TAB_META[canonicalTab as UberDeTabSlug] ?? {
    title: `Uber Data Engineering — ${canonicalTab} | withsoon.com`,
    description: "Interactive Uber data engineering interview prep.",
  };

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `https://withsoon.com/system-design/uber/${canonicalTab}`,
    },
  };
}

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const normalizedTab = normalizeUberDeTab(tab);

  if (normalizedTab && normalizedTab !== tab) {
    redirect(`/system-design/uber/${normalizedTab}`);
  }

  if (!(UBER_DE_TAB_SLUGS as readonly string[]).includes(tab)) {
    redirect("/system-design/uber/start-here");
  }

  return <UberDataEngineeringPage initialTab={tab as UberDeTabSlug} />;
}
