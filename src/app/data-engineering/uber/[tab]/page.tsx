import type { Metadata } from "next";
import { redirect } from "next/navigation";
import UberDataEngineeringPage from "@/components/ui/uber-data-engineering/UberDataEngineeringPage";
import {
  normalizeUberDeTab,
  UBER_DE_TAB_META,
  UBER_DE_TAB_SLUGS,
  type UberDeTabSlug,
} from "@/components/ui/uber-data-engineering/data";

const BASE_URL = "https://withsoon.com/data-engineering/uber";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string }>;
}): Promise<Metadata> {
  const { tab } = await params;
  const canonicalTab = normalizeUberDeTab(tab) ?? "start-here";
  const meta = UBER_DE_TAB_META[canonicalTab];

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `${BASE_URL}/${canonicalTab}` },
  };
}

export default async function UberDataEngineeringTab({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;

  if (tab === "failures") redirect("/data-engineering/uber/governance-quality");
  if (tab === "cheat-sheet") redirect("/data-engineering/uber/quiz");

  const normalizedTab = normalizeUberDeTab(tab);
  if (normalizedTab && normalizedTab !== tab) {
    redirect(`/data-engineering/uber/${normalizedTab}`);
  }
  if (!(UBER_DE_TAB_SLUGS as readonly string[]).includes(tab)) {
    redirect("/data-engineering/uber/start-here");
  }

  return <UberDataEngineeringPage initialTab={tab as UberDeTabSlug} />;
}
