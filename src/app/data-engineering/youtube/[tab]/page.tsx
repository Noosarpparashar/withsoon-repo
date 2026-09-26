import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArchitectureTab from "@/components/ui/youtube-data-engineering/ArchitectureTab";
import BatchLakehouseTab from "@/components/ui/youtube-data-engineering/BatchLakehouseTab";
import DataModelingTab from "@/components/ui/youtube-data-engineering/DataModelingTab";
import EventSourcesTab from "@/components/ui/youtube-data-engineering/EventSourcesTab";
import GovernanceQualityTab from "@/components/ui/youtube-data-engineering/GovernanceQualityTab";
import IngestionKafkaTab from "@/components/ui/youtube-data-engineering/IngestionKafkaTab";
import RealTimeStreamingTab from "@/components/ui/youtube-data-engineering/RealTimeStreamingTab";
import RequirementsTab from "@/components/ui/youtube-data-engineering/RequirementsTab";
import YouTubeDataEngineeringPage from "@/components/ui/youtube-data-engineering/YouTubeDataEngineeringPage";
import {
  isReadyYouTubeTab,
  YOUTUBE_TAB_META,
} from "@/components/ui/youtube-data-engineering/data";

const BASE_URL = "https://withsoon.com/data-engineering/youtube";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string }>;
}): Promise<Metadata> {
  const { tab } = await params;
  const canonicalTab = isReadyYouTubeTab(tab) ? tab : "start-here";
  const meta = YOUTUBE_TAB_META[canonicalTab];

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `${BASE_URL}/${canonicalTab}` },
  };
}

export default async function YouTubeDataEngineeringTab({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (!isReadyYouTubeTab(tab)) {
    notFound();
  }

  switch (tab) {
    case "requirements":
      return <RequirementsTab />;
    case "event-sources":
      return <EventSourcesTab />;
    case "architecture":
      return <ArchitectureTab />;
    case "ingestion-kafka":
      return <IngestionKafkaTab />;
    case "real-time-streaming":
      return <RealTimeStreamingTab />;
    case "data-modeling":
      return <DataModelingTab />;
    case "batch-lakehouse":
      return <BatchLakehouseTab />;
    case "governance-quality":
      return <GovernanceQualityTab />;
    default:
      return <YouTubeDataEngineeringPage />;
  }
}
