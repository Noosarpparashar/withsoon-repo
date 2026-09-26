import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookMyShowDataEngineeringPage from "@/components/ui/bookmyshow-data-engineering/BookMyShowDataEngineeringPage";
import {
  BOOKMYSHOW_CHAPTERS,
  BOOKMYSHOW_META,
  isBookMyShowChapter,
} from "@/components/ui/bookmyshow-data-engineering/data";

const BASE_URL = "https://withsoon.com/data-engineering/bookmyshow";

export function generateStaticParams() {
  return BOOKMYSHOW_CHAPTERS.map((chapter) => ({ tab: chapter.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string }>;
}): Promise<Metadata> {
  const { tab } = await params;
  const chapter = isBookMyShowChapter(tab) ? tab : "start-here";
  const meta = BOOKMYSHOW_META[chapter];

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

export default async function BookMyShowTab({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (!isBookMyShowChapter(tab)) notFound();

  return <BookMyShowDataEngineeringPage chapter={tab} />;
}
