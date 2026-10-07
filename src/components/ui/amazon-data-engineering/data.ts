export const AMAZON_CHAPTERS = [
  {
    id: "start-here",
    label: "Start Here",
    eyebrow: "The commerce platform in one screen",
    title: "Every click is fast. Every number is explainable.",
    description:
      "Separate Amazon-like transactional systems from the analytical data platform, then trace customer behavior, orders, inventory, and payments into live signals and certified business truth.",
  },
  {
    id: "requirements",
    label: "Requirements",
    eyebrow: "Workload, guarantees, and scale before tools",
    title: "Define the commerce workload before choosing the stack.",
    description:
      "Translate orders, behavior, payments, inventory, sellers, and campaign peaks into explicit functions, freshness targets, correctness rules, capacity estimates, and architecture decisions.",
  },
  {
    id: "architecture",
    label: "Architecture",
    eyebrow: "Decoupled, replayable, and failure-isolated",
    title: "Keep commerce online. Make every data path recoverable.",
    description:
      "Connect Amazon-like operational services to CDC, Kafka, streaming, the lakehouse, batch processing, serving, and ML without placing analytics on the checkout path.",
  },
  {
    id: "event-sources",
    label: "Event Sources",
    eyebrow: "Authoritative facts, shared contracts, explicit grains",
    title: "Know who owns every event before connecting the streams.",
    description:
      "Map Amazon-like commerce producers, standardize their event envelope, and reconcile independent order, payment, inventory, fulfillment, behavior, seller, catalog, and partner evidence into trustworthy facts.",
  },
  {
    id: "ingestion-kafka",
    label: "Ingestion + Kafka",
    eyebrow: "Durable handoff, defensible ordering, bounded replay",
    title: "Move every committed fact without putting Kafka on checkout’s critical path.",
    description:
      "Design the outbox and CDC handoff, domain topic strategy, partition keys, campaign-scale capacity, retry semantics, workload isolation, retention, and controlled replay for an Amazon-like commerce platform.",
  },
  {
    id: "batch-lakehouse",
    label: "Batch + Lakehouse",
    eyebrow: "Immutable evidence, conformed facts, atomic truth",
    title: "Preserve every fact. Publish only what can be defended.",
    description:
      "Design the Amazon-like S3 and Iceberg lakehouse, Bronze/Silver/Gold contracts, Spark batch processing, file layout, Airflow readiness gates, atomic publication, compaction, and isolated historical backfills.",
  },
  {
    id: "data-modeling",
    label: "Data Modeling",
    eyebrow: "Explicit grains, historical context, reusable joins",
    title: "Model every commerce lifecycle at the grain where it actually happens.",
    description:
      "Connect Amazon-like customers, products, SKUs, offers, sellers, promotions, locations, carriers, and dates to order-item, payment, inventory, shipment, return, and behavior facts without mixing incompatible grains.",
  },
  {
    id: "governance-quality",
    label: "Governance / Quality",
    eyebrow: "Owned, observable, reconciled, least privilege",
    title: "Prove every commerce data product deserves trust.",
    description:
      "Govern Amazon-like orders, payments, inventory, fulfillment, sellers, customer behavior, and finance with explicit ownership, automated quality gates, reconciliation, lineage, privacy, tenant isolation, and recoverable publication.",
  },
  {
    id: "interview-qa",
    label: "Interview Q&A",
    eyebrow: "Fifty questions, defensible decisions, visible proof",
    title: "Explain the complete commerce data design under pressure.",
    description:
      "Practice 50 Amazon-like e-commerce big-data questions across scale, Kafka, CDC, streaming, the lakehouse, modeling, finance, serving, ML, governance, privacy, recovery, and cost.",
  },
] as const;

export type AmazonChapter = (typeof AMAZON_CHAPTERS)[number]["id"];

export const AMAZON_SECTIONS: Record<
  AmazonChapter,
  readonly { id: string; title: string }[]
> = {
  "start-here": [
    { id: "platform-mission", title: "Platform mission" },
    { id: "system-boundary", title: "System boundary" },
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
  architecture: [
    { id: "architecture-map", title: "Architecture map" },
    { id: "architecture-boundary", title: "System boundary" },
    { id: "architecture-recovery", title: "Failure recovery" },
  ],
  "event-sources": [
    { id: "source-producer-map", title: "Source map" },
    { id: "source-event-contract", title: "Event contract" },
    { id: "source-reconciliation", title: "Reconciliation" },
  ],
  "ingestion-kafka": [
    { id: "ingestion-handoff", title: "Event handoff" },
    { id: "kafka-topics", title: "Topics + keys" },
    { id: "kafka-capacity", title: "Capacity + surge" },
    { id: "kafka-reliability", title: "Reliability" },
    { id: "kafka-retention", title: "Retention + replay" },
  ],
  "batch-lakehouse": [
    { id: "lakehouse-flow", title: "Lakehouse flow" },
    { id: "lakehouse-layers", title: "Layer contracts" },
    { id: "lakehouse-products", title: "Data products" },
    { id: "iceberg-layout", title: "Table + files" },
    { id: "batch-orchestration", title: "Spark + Airflow" },
    { id: "lakehouse-publication", title: "Publish + replay" },
  ],
  "data-modeling": [
    { id: "model-erd", title: "Commerce model" },
  ],
  "governance-quality": [
    { id: "ownership-contracts", title: "Ownership" },
    { id: "quality-gates", title: "Quality gates" },
    { id: "commerce-reconciliation", title: "Reconciliation" },
    { id: "observability", title: "Observability" },
    { id: "privacy-access", title: "Privacy + access" },
    { id: "failure-recovery", title: "Recovery drills" },
  ],
  "interview-qa": [
    { id: "question-bank", title: "Question bank" },
    { id: "whiteboard", title: "5-minute plan" },
  ],
};

export const AMAZON_META = {
  "start-here": {
    title: "Amazon E-Commerce Big Data Design — Start Here | withsoon",
    description:
      "Design an Amazon-scale e-commerce data platform with event streaming, CDC, real-time processing, an Iceberg lakehouse, certified metrics, and governed data products.",
  },
  requirements: {
    title: "Amazon E-Commerce Big Data Design — Requirements | withsoon",
    description:
      "Define functional requirements, freshness SLOs, correctness guarantees, campaign-scale capacity, storage, and architectural implications for an Amazon-like data platform.",
  },
  architecture: {
    title: "Amazon E-Commerce Big Data Design — Architecture | withsoon",
    description:
      "Explore an interactive Amazon-scale data architecture spanning commerce services, CDC, Kafka, Flink, an Iceberg lakehouse, batch reconciliation, serving, ML, and failure recovery.",
  },
  "event-sources": {
    title: "Amazon E-Commerce Big Data Design — Event Sources | withsoon",
    description:
      "Explore Amazon-scale commerce event producers, common event contracts, source authority, capture modes, and lifecycle reconciliation for orders, payments, inventory, fulfillment, behavior, catalog, sellers, and partner feeds.",
  },
  "ingestion-kafka": {
    title: "Amazon E-Commerce Big Data Design — Ingestion and Kafka | withsoon",
    description:
      "Design Amazon-scale ingestion with transactional outbox, CDC, validated client events, Kafka domain topics, partition keys, explicit capacity calculations, workload isolation, retention, and safe replay.",
  },
  "batch-lakehouse": {
    title: "Amazon E-Commerce Big Data Design — Batch and Lakehouse | withsoon",
    description:
      "Design an Amazon-scale S3 and Iceberg lakehouse with Bronze, Silver, and Gold contracts, Spark and Airflow processing, physical table layout, data products, atomic publication, compaction, and isolated backfills.",
  },
  "data-modeling": {
    title: "Amazon E-Commerce Big Data Design — Data Modeling | withsoon",
    description:
      "Explore an Amazon-scale dimensional model with explicit fact grains, product-SKU-offer history, order items, payments, inventory movements and snapshots, fulfillment, Customer 360 privacy boundaries, and reusable conformed dimensions.",
  },
  "governance-quality": {
    title: "Amazon E-Commerce Big Data Design — Governance and Quality | withsoon",
    description:
      "Design Amazon-scale data ownership, contracts, quality gates, finance and inventory reconciliation, observability, PII controls, seller isolation, privacy deletion, and incident recovery.",
  },
  "interview-qa": {
    title: "Amazon E-Commerce Big Data Design — 50 Interview Questions | withsoon",
    description:
      "Practice 50 Amazon-scale e-commerce big-data interview questions with comprehensive answers, trade-offs, validation evidence, and a five-minute whiteboard plan.",
  },
} satisfies Record<AmazonChapter, { title: string; description: string }>;

export function isAmazonChapter(value: string): value is AmazonChapter {
  return AMAZON_CHAPTERS.some((chapter) => chapter.id === value);
}
