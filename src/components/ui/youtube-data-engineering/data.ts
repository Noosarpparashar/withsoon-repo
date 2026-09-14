export const YOUTUBE_TABS = [
  { id: "start-here", label: "Start Here", ready: true },
  { id: "requirements", label: "Requirements", ready: true },
  { id: "event-sources", label: "Event Sources", ready: true },
  { id: "architecture", label: "Architecture", ready: true },
  { id: "ingestion-kafka", label: "Ingestion / Kafka", ready: true },
  { id: "real-time-streaming", label: "Real-Time Streaming", ready: true },
  { id: "data-modeling", label: "Data Modeling", ready: true },
  { id: "batch-lakehouse", label: "Batch + Lakehouse", ready: true },
  { id: "governance-quality", label: "Governance / Quality", ready: true },
] as const;

export type YouTubeTab = (typeof YOUTUBE_TABS)[number]["id"];

export const YOUTUBE_READY_TABS = YOUTUBE_TABS.filter((tab) => tab.ready).map(
  (tab) => tab.id,
);

export const YOUTUBE_TAB_META: Record<
  YouTubeTab,
  { title: string; description: string }
> = Object.fromEntries(
  YOUTUBE_TABS.map((tab) => [
    tab.id,
    {
      title: `YouTube Data Engineering — ${tab.label} | withsoon.com`,
      description: `${tab.label} interview preparation for a YouTube-scale analytics and data platform.`,
    },
  ]),
) as Record<YouTubeTab, { title: string; description: string }>;

export const START_SECTIONS = [
  { id: "scope", title: "Scope" },
  { id: "capabilities", title: "Capabilities" },
  { id: "platform-flow", title: "Platform Flow" },
  { id: "scale-targets", title: "Scale Targets" },
  { id: "correctness-thesis", title: "Correctness" },
] as const;

export const REQUIREMENT_SECTIONS = [
  { id: "workload-model", title: "Workload Model" },
  { id: "traffic-math", title: "Traffic Math" },
  { id: "storage-math", title: "Storage Math" },
  { id: "resource-plan", title: "Resource Plan" },
  { id: "service-levels", title: "SLOs" },
  { id: "requirements-answer", title: "Interview Answer" },
] as const;

export const EVENT_SECTIONS = [
  { id: "producers", title: "Producers" },
  { id: "event-families", title: "Event Families" },
  { id: "event-contract", title: "Event Contract" },
  { id: "playback-evidence", title: "Playback Evidence" },
  { id: "special-workloads", title: "Workloads" },
] as const;

export const ARCHITECTURE_SECTIONS = [
  { id: "architecture-map", title: "Architecture Map" },
  { id: "platform-planes", title: "Platform Planes" },
  { id: "ownership-flow", title: "Ownership Flow" },
] as const;

export const KAFKA_SECTIONS = [
  { id: "ingestion-route", title: "Ingestion Route" },
  { id: "topic-design", title: "Topic Design" },
  { id: "partition-strategy", title: "Partitioning" },
  { id: "capacity-model", title: "Capacity" },
  { id: "failure-drill", title: "Failure Drill" },
  { id: "reliability-controls", title: "Delivery + Operations" },
] as const;

export const STREAMING_SECTIONS = [
  { id: "streaming-jobs", title: "Streaming Jobs" },
  { id: "session-state", title: "Session State" },
  { id: "time-windows", title: "Time + Windows" },
  { id: "output-contracts", title: "Output Contracts" },
  { id: "trending-design", title: "Trending" },
  { id: "engine-choice", title: "Runtime + Operations" },
  { id: "streaming-answer", title: "Interview Answer" },
] as const;

export const MODELING_SECTIONS = [
  { id: "model-erd", title: "ER Diagram" },
  { id: "model-answer", title: "Interview Answer" },
] as const;

export const BATCH_LAKEHOUSE_SECTIONS = [
  { id: "batch-architecture", title: "Batch Architecture" },
  { id: "batch-dag", title: "Daily DAG" },
  { id: "publish-protocol", title: "Publishing" },
  { id: "reconciliation", title: "Reconciliation" },
  { id: "batch-answer", title: "Interview Answer" },
] as const;

export const GOVERNANCE_QUALITY_SECTIONS = [
  { id: "gov-contracts", title: "Quality Flow" },
  { id: "quality-dimensions", title: "Quality Dimensions" },
  { id: "release-decisions", title: "Release Decisions" },
  { id: "privacy-controls", title: "Privacy Controls" },
  { id: "lineage-ownership", title: "Lineage + Ownership" },
  { id: "quality-observability", title: "Observability" },
  { id: "governance-answer", title: "Interview Answer" },
] as const;

export type PageSection = { id: string; title: string };

export function isYouTubeTab(value: string): value is YouTubeTab {
  return YOUTUBE_TABS.some((tab) => tab.id === value);
}

export function isReadyYouTubeTab(value: string): value is YouTubeTab {
  return YOUTUBE_TABS.some((tab) => tab.id === value && tab.ready);
}
