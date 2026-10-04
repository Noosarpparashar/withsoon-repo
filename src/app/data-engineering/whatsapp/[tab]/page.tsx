import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WhatsAppDataEngineeringPage from "@/components/ui/whatsapp-data-engineering/WhatsAppDataEngineeringPage";
import {
  WHATSAPP_CHAPTERS,
  WHATSAPP_META,
  isWhatsAppChapter,
} from "@/components/ui/whatsapp-data-engineering/data";

const BASE_URL = "https://withsoon.com/data-engineering/whatsapp";

export function generateStaticParams() {
  return WHATSAPP_CHAPTERS.map((chapter) => ({ tab: chapter.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string }>;
}): Promise<Metadata> {
  const { tab } = await params;
  const chapter = isWhatsAppChapter(tab) ? tab : "start-here";
  const meta = WHATSAPP_META[chapter];

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

export default async function WhatsAppTab({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (!isWhatsAppChapter(tab)) notFound();

  return <WhatsAppDataEngineeringPage chapter={tab} />;
}
