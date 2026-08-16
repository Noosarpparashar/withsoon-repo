export const UBER_DE_TAB_SLUGS = [
  "start-here",
  "requirements",
  "event-sources",
  "architecture",
  "ingestion-kafka",
  "real-time-streaming",
  "batch-pipelines",
  "data-modeling",
  "warehouse-serving",
  "governance-quality",
  "failures",
  "quiz",
  "cheat-sheet",
] as const;

export type UberDeTabSlug = typeof UBER_DE_TAB_SLUGS[number];

export type UberDeTab = {
  id: UberDeTabSlug;
  label: string;
  accent: string;
  mins: number;
  summary: string;
};

export const UBER_DE_TABS: UberDeTab[] = [
  { id: "start-here", label: "Start Here", accent: "#276EF1", mins: 5, summary: "Frame Uber as a batch + stream data platform, not a dispatch service design." },
  { id: "requirements", label: "Requirements", accent: "#f59e0b", mins: 8, summary: "Lock freshness, correctness, and privacy expectations." },
  { id: "event-sources", label: "Event Sources", accent: "#ef4444", mins: 7, summary: "Map driver, rider, dispatch, payments, and maps producers." },
  { id: "architecture", label: "Architecture", accent: "#38bdf8", mins: 9, summary: "Trace Kafka to stream, batch, lakehouse, warehouse, and features." },
  { id: "ingestion-kafka", label: "Ingestion / Kafka", accent: "#f59e0b", mins: 8, summary: "Explain topic keys, partition strategy, and late data controls." },
  { id: "real-time-streaming", label: "Real-Time Streaming", accent: "#22c55e", mins: 10, summary: "Show Flink jobs for driver map, surge, ETA, and fraud." },
  { id: "batch-pipelines", label: "Batch + Lakehouse", accent: "#fbbf24", mins: 9, summary: "Explain Bronze, Silver, Gold, DAGs, and trusted publish." },
  { id: "data-modeling", label: "Data Modeling", accent: "#8b5cf6", mins: 9, summary: "Move from trip grain to fact constellation and dimensions." },
  { id: "warehouse-serving", label: "Warehouse / Serving", accent: "#06b6d4", mins: 7, summary: "Show BI, finance, ML, and ops consumption paths." },
  { id: "governance-quality", label: "Governance / Quality", accent: "#22c55e", mins: 7, summary: "Cover PII boundaries, deletion, lineage, and DQ gates." },
  { id: "failures", label: "Failures", accent: "#ef4444", mins: 8, summary: "Turn skew, late data, and replay into a clear recovery story." },
  { id: "quiz", label: "Interview Q&A", accent: "#38bdf8", mins: 8, summary: "Answer follow-up questions crisply and defensibly." },
  { id: "cheat-sheet", label: "Cheat Sheet", accent: "#276EF1", mins: 6, summary: "Compress the whole answer into a fast revision surface." },
];

export function isUberDeTabSlug(value: string): value is UberDeTabSlug {
  return (UBER_DE_TAB_SLUGS as readonly string[]).includes(value);
}

export function normalizeUberDeTab(value?: string | null): UberDeTabSlug | null {
  if (!value) return null;
  return isUberDeTabSlug(value) ? value : null;
}

export const UBER_DE_TAB_META: Record<
  UberDeTabSlug,
  { title: string; description: string }
> = Object.fromEntries(
  UBER_DE_TABS.map((tab) => [
    tab.id,
    {
      title: `Uber Data Engineering — ${tab.label} | withsoon.com`,
      description: tab.summary,
    },
  ])
) as Record<UberDeTabSlug, { title: string; description: string }>;

export const UBER_START_HERE_SECTIONS = [
  { id: "platform-mission", title: "Platform mission" },
  { id: "requirements-snapshot", title: "Requirements" },
  { id: "scope-boundary", title: "Scope" },
  { id: "freshness-map", title: "Freshness map" },
  { id: "handoff", title: "Handoff" },
] as const;

