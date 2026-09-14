export const UBER_DE_TAB_SLUGS = [
  "start-here",
  "requirements",
  "event-sources",
  "architecture",
  "ingestion-kafka",
  "batch-pipelines",
  "data-modeling",
  "governance-quality",
  "quiz",
] as const;

export type UberDeTabSlug = (typeof UBER_DE_TAB_SLUGS)[number];

export type UberDeTab = {
  id: UberDeTabSlug;
  label: string;
  accent: string;
  mins: number;
  summary: string;
};

export const UBER_DE_TABS: UberDeTab[] = [
  {
    id: "start-here",
    label: "Start Here",
    accent: "#526b82",
    mins: 5,
    summary:
      "Frame Uber as a shared batch and streaming data platform for marketplace signals and trusted history.",
  },
  {
    id: "requirements",
    label: "Requirements",
    accent: "#827a70",
    mins: 8,
    summary: "Lock freshness, correctness, and privacy expectations.",
  },
  {
    id: "event-sources",
    label: "Event Sources",
    accent: "#675d62",
    mins: 7,
    summary: "Map driver, rider, dispatch, payments, and maps producers.",
  },
  {
    id: "architecture",
    label: "Architecture",
    accent: "#6f879a",
    mins: 9,
    summary:
      "Trace Kafka to stream, batch, lakehouse, warehouse, and features.",
  },
  {
    id: "ingestion-kafka",
    label: "Ingestion / Kafka",
    accent: "#827a70",
    mins: 8,
    summary: "Explain topic keys, partition strategy, and late data controls.",
  },
  {
    id: "batch-pipelines",
    label: "Batch + Lakehouse",
    accent: "#8b8377",
    mins: 9,
    summary: "Explain Bronze, Silver, Gold, DAGs, and trusted publish.",
  },
  {
    id: "data-modeling",
    label: "Data Modeling",
    accent: "#657e90",
    mins: 9,
    summary: "Move from trip grain to fact constellation and dimensions.",
  },
  {
    id: "governance-quality",
    label: "Failures + Data Quality",
    accent: "#526b82",
    mins: 10,
    summary:
      "Connect quality controls, PII governance, failure detection, blast radius, mitigation, and replay recovery.",
  },
  {
    id: "quiz",
    label: "Interview Q&A",
    accent: "#6f879a",
    mins: 8,
    summary: "Answer follow-up questions crisply and defensibly.",
  },
];

export function isUberDeTabSlug(value: string): value is UberDeTabSlug {
  return (UBER_DE_TAB_SLUGS as readonly string[]).includes(value);
}

export function normalizeUberDeTab(
  value?: string | null,
): UberDeTabSlug | null {
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
  ]),
) as Record<UberDeTabSlug, { title: string; description: string }>;

export const UBER_START_HERE_SECTIONS = [
  { id: "platform-mission", title: "Platform mission" },
  { id: "requirements-snapshot", title: "Requirements" },
  { id: "scope-boundary", title: "Scope" },
  { id: "freshness-map", title: "Freshness map" },
] as const;

export const UBER_REQUIREMENTS_SECTIONS = [
  { id: "scale-assumptions", title: "Assumptions" },
  { id: "event-load", title: "Event load" },
  { id: "storage-math", title: "Storage math" },
  { id: "board-formulas", title: "Board formulas" },
  { id: "design-implication", title: "Design decision" },
] as const;

export const UBER_EVENT_SOURCE_SECTIONS = [
  { id: "producer-map", title: "Sources" },
  { id: "event-envelope", title: "Contract" },
  { id: "source-priority", title: "Operating model" },
  { id: "population-flow", title: "Population" },
  { id: "trip-reconciliation", title: "Interview insight" },
] as const;

export const UBER_ARCHITECTURE_SECTIONS = [
  { id: "architecture-map", title: "Architecture map" },
  { id: "architecture-principle", title: "Architecture decision" },
] as const;

export const UBER_KAFKA_SECTIONS = [
  { id: "kafka-contract", title: "Event format" },
  { id: "kafka-topics", title: "Partition keys" },
  { id: "kafka-sizing", title: "Capacity planning" },
  { id: "kafka-controls", title: "Reliability controls" },
  { id: "kafka-retention", title: "GPS retention" },
] as const;

export const UBER_BATCH_SECTIONS = [
  { id: "lakehouse-flow", title: "Uber lakehouse flow" },
  { id: "lakehouse-layers", title: "Uber layer contracts" },
  { id: "batch-orchestration", title: "Uber batch DAGs" },
  { id: "audited-backfill", title: "Versioned backfill" },
] as const;

export const UBER_MODELING_SECTIONS = [
  { id: "model-erd", title: "Uber fact constellation ERD" },
  { id: "model-facts", title: "Fact grains" },
  { id: "model-dimensions", title: "Conformed dimensions" },
] as const;

export const UBER_FAILURE_QUALITY_SECTIONS = [
  { id: "quality-slos", title: "Quality SLOs" },
  { id: "failure-response", title: "Failure response" },
  { id: "quality-gates", title: "Quality gates" },
  { id: "replay-recovery", title: "Replay and recovery" },
] as const;

export const UBER_INTERVIEW_SECTIONS = [
  { id: "question-bank", title: "Question bank" },
  { id: "whiteboard-order", title: "Whiteboard order" },
] as const;
