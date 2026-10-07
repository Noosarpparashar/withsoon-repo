import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AmazonDataEngineeringPage from "@/components/ui/amazon-data-engineering/AmazonDataEngineeringPage";
import {
  AMAZON_CHAPTERS,
  AMAZON_META,
  isAmazonChapter,
} from "@/components/ui/amazon-data-engineering/data";

const BASE_URL = "https://withsoon.com/data-engineering/amazon";

export function generateStaticParams() {
  return AMAZON_CHAPTERS.map((chapter) => ({ tab: chapter.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string }>;
}): Promise<Metadata> {
  const { tab } = await params;
  const chapter = isAmazonChapter(tab) ? tab : "start-here";
  const meta = AMAZON_META[chapter];

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `${BASE_URL}/${chapter}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE_URL}/${chapter}`,
      siteName: "withsoon",
      type: "website",
    },
  };
}

export default async function AmazonTab({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (!isAmazonChapter(tab)) notFound();
  return <AmazonDataEngineeringPage chapter={tab} />;
}
