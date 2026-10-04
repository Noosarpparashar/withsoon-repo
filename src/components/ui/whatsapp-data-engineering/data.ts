export const WHATSAPP_CHAPTERS = [
  {
    id: "start-here",
    label: "Start Here",
    eyebrow: "The platform in one screen",
    title: "Private messages. Observable systems.",
    description:
      "Separate the encrypted messaging path from the privacy-safe big-data platform, then follow operational facts into streaming, the lakehouse, analytics, and ML.",
  },
  {
    id: "requirements",
    label: "Requirements",
    eyebrow: "Workload before tools",
    title: "Design for the amplified event stream.",
    description:
      "Translate 100 billion daily messages into peak event throughput, storage, freshness, privacy, replay, and recovery requirements.",
  },
  {
    id: "architecture",
    label: "Architecture",
    eyebrow: "Regional, replayable, failure-isolated",
    title: "Keep messaging live. Make data recoverable.",
    description:
      "Connect privacy-safe WhatsApp event producers to regional ingestion, streaming, the lakehouse, and analytical serving without placing analytics on the messaging path.",
  },
  {
    id: "event-sources",
    label: "Event Sources",
    eyebrow: "Producers before pipelines",
    title: "Know who emits every fact.",
    description:
      "Map WhatsApp operational producers, explain their event grains and delivery behavior, standardize privacy-safe contracts, and reconcile independent lifecycle events into trusted data products.",
  },
  {
    id: "ingestion-kafka",
    label: "Ingestion / Kafka",
    eyebrow: "Durable handoff, bounded replay",
    title: "Accept every event without slowing a message.",
    description:
      "Design WhatsApp's asynchronous event handoff, domain topics, partition keys, capacity envelope, producer guarantees, and replay windows without turning Kafka into the messaging database.",
  },
  {
    id: "batch-lakehouse",
    label: "Batch + Lakehouse",
    eyebrow: "Reproducible history, controlled correction",
    title: "Turn raw events into trusted history.",
    description:
      "Preserve bounded WhatsApp event ranges in Iceberg, define Bronze, Silver, Gold, and data-product contracts, enforce quality and privacy gates, maintain snapshots and files, and publish auditable repairs without affecting live messaging.",
  },
  {
    id: "data-modeling",
    label: "Data Modeling",
    eyebrow: "Explicit grains, reusable joins",
    title: "Model every WhatsApp lifecycle at its true grain.",
    description:
      "Connect privacy-safe dimensions to message, delivery, group, media, call, status, notification, experiment, and regional-capacity facts without mixing logical events with device fan-out.",
  },
  {
    id: "governance-quality",
    label: "Governance / Quality",
    eyebrow: "Owned, observable, privacy-safe",
    title: "Prove every WhatsApp data product deserves trust.",
    description:
      "Govern message, recipient-device delivery, group, media, call, notification, status, and experiment evidence while preserving E2EE, explicit ownership, replayability, and independence from live messaging.",
  },
  {
    id: "interview-qa",
    label: "Interview Q&A",
    eyebrow: "Defend every decision",
    title: "Explain the complete design under pressure.",
    description:
      "Practice 50 WhatsApp big-data questions across scope, capacity, contracts, Kafka, streaming, the lakehouse, analytical modeling, privacy, reconciliation, and recovery.",
  },
] as const;

export type WhatsAppChapter = (typeof WHATSAPP_CHAPTERS)[number]["id"];

export const WHATSAPP_SECTIONS: Record<
  WhatsAppChapter,
  readonly { id: string; title: string }[]
> = {
  "start-here": [
    { id: "platform-mission", title: "Platform mission" },
    { id: "two-plane-boundary", title: "Two-plane boundary" },
    { id: "interview-scope", title: "Interview scope" },
    { id: "data-products", title: "Data products" },
    { id: "interview-handoff", title: "Interview handoff" },
  ],
  requirements: [
    { id: "functional-requirements", title: "Functions" },
    { id: "freshness-contracts", title: "Freshness" },
    { id: "workload-model", title: "Capacity model" },
    { id: "capacity-implications", title: "Design implications" },
  ],
  "event-sources": [
    { id: "source-producer-map", title: "Sources" },
    { id: "source-event-contract", title: "Contract" },
    { id: "source-reconciliation", title: "Reconciliation" },
  ],
  architecture: [
    { id: "architecture-map", title: "Architecture map" },
    { id: "architecture-boundary", title: "System boundary" },
  ],
  "ingestion-kafka": [
    { id: "ingestion-handoff", title: "Event handoff" },
    { id: "kafka-topics", title: "Topics + keys" },
    { id: "kafka-capacity", title: "Capacity" },
    { id: "kafka-reliability", title: "Reliability" },
    { id: "kafka-retention", title: "Retention + replay" },
  ],
  "batch-lakehouse": [
    { id: "lakehouse-flow", title: "Lakehouse flow" },
    { id: "lakehouse-layers", title: "Layer contracts" },
    { id: "data-products", title: "Data products" },
    { id: "iceberg-layout", title: "Table + file layout" },
    { id: "iceberg-lifecycle", title: "Iceberg mechanics" },
    { id: "batch-orchestration", title: "Batch DAGs" },
    { id: "replay-boundary", title: "Replay boundary" },
  ],
  "data-modeling": [
    { id: "model-erd", title: "Full ER model" },
  ],
  "governance-quality": [
    { id: "ownership-contracts", title: "Ownership" },
    { id: "quality-gates", title: "Quality gates" },
    { id: "lifecycle-reconciliation", title: "Reconciliation" },
    { id: "observability", title: "Observability" },
    { id: "privacy-access", title: "Privacy + access" },
    { id: "failure-recovery", title: "Recovery drills" },
  ],
  "interview-qa": [
    { id: "question-bank", title: "Question bank" },
    { id: "whiteboard", title: "5-minute plan" },
  ],
};

export const WHATSAPP_META = Object.fromEntries(
  WHATSAPP_CHAPTERS.map((chapter) => [
    chapter.id,
    {
      title: `WhatsApp Big Data Design — ${chapter.label} | withsoon`,
      description: `${chapter.description} A visual big-data engineering interview case study for a WhatsApp-like platform.`,
    },
  ]),
) as Record<WhatsAppChapter, { title: string; description: string }>;

export function isWhatsAppChapter(value: string): value is WhatsAppChapter {
  return WHATSAPP_CHAPTERS.some((chapter) => chapter.id === value);
}
