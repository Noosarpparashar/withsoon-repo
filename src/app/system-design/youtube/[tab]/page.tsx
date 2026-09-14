import type { Metadata } from "next";
import { redirect } from "next/navigation";
import YouTubeDataEngineeringPage from "@/components/ui/youtube-data-engineering/YouTubeDataEngineeringPage";
import RequirementsTab from "@/components/ui/youtube-data-engineering/RequirementsTab";
import EventSourcesTab from "@/components/ui/youtube-data-engineering/EventSourcesTab";
import ArchitectureTab from "@/components/ui/youtube-data-engineering/ArchitectureTab";
import IngestionKafkaTab from "@/components/ui/youtube-data-engineering/IngestionKafkaTab";
import RealTimeStreamingTab from "@/components/ui/youtube-data-engineering/RealTimeStreamingTab";
import DataModelingTab from "@/components/ui/youtube-data-engineering/DataModelingTab";
import BatchLakehouseTab from "@/components/ui/youtube-data-engineering/BatchLakehouseTab";
import GovernanceQualityTab from "@/components/ui/youtube-data-engineering/GovernanceQualityTab";
import {
  isReadyYouTubeTab,
  YOUTUBE_TAB_META,
} from "@/components/ui/youtube-data-engineering/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string }>;
}): Promise<Metadata> {
  const { tab } = await params;
  const meta = isReadyYouTubeTab(tab)
    ? YOUTUBE_TAB_META[tab]
    : YOUTUBE_TAB_META["start-here"];
  const canonicalTab = isReadyYouTubeTab(tab) ? tab : "start-here";

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `https://withsoon.com/system-design/youtube/${canonicalTab}`,
    },
  };
}

export default async function YouTubeTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;

  if (!isReadyYouTubeTab(tab)) {
    redirect("/system-design/youtube/start-here");
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
