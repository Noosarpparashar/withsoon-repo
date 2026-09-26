export const BOOKMYSHOW_CHAPTERS = [
  {
    id: "start-here",
    label: "Start Here",
    eyebrow: "The system in one screen",
    title: "Protect the seat. Distribute the facts.",
    description: "Separate the synchronous booking truth from the asynchronous data platform.",
  },
  {
    id: "requirements",
    label: "Requirements",
    eyebrow: "Invariants before tools",
    title: "Define what may never break.",
    description: "Pin down seat ownership, workload assumptions, capacity signals, latency, delivery, and money before choosing technology.",
  },
  {
    id: "architecture",
    label: "Architecture",
    eyebrow: "Follow one booking",
    title: "One transactional spine. Two data paths.",
    description: "Trace a hold through payment, outbox, Kafka, streaming, and the lakehouse.",
  },
  {
    id: "event-contracts",
    label: "Event Contracts",
    eyebrow: "Facts that survive change",
    title: "Make every event replay-safe.",
    description: "Design envelopes, ordering keys, retention, and evolution rules for durable facts.",
  },
  {
    id: "data-modeling",
    label: "Data Modeling",
    eyebrow: "Grain before schema",
    title: "See every fact and dimension together.",
    description: "Trace BookMyShow facts to their shared dimensions, join keys, grains, and source data.",
  },
  {
    id: "batch-lakehouse",
    label: "Batch + Lakehouse",
    eyebrow: "Replay and restatement",
    title: "Archive once. Correct safely.",
    description: "Move lossless events through Bronze, Silver, and Gold with auditable backfills.",
  },
  {
    id: "governance-quality",
    label: "Governance / Quality",
    eyebrow: "Operate the diagram",
    title: "Make freshness and correctness visible.",
    description: "Assign ownership, protect privacy, reconcile money, and rehearse recovery.",
  },
  {
    id: "interview-qa",
    label: "Interview Q&A",
    eyebrow: "Defend the trade-offs",
    title: "Explain the design in five minutes.",
    description: "Practice 40 questions across requirements, correctness, contracts, streaming, lakehouse, governance, recovery, and scale.",
  },
] as const;

export type BookMyShowChapter = (typeof BOOKMYSHOW_CHAPTERS)[number]["id"];

export const BOOKMYSHOW_SECTIONS: Record<
  BookMyShowChapter,
  readonly { id: string; title: string }[]
> = {
  "start-here": [
    { id: "platform-mission", title: "Platform mission" },
    { id: "requirements-snapshot", title: "Requirements" },
    { id: "scope-boundary", title: "Scope" },
    { id: "freshness-map", title: "Freshness map" },
    { id: "handoff", title: "Handoff" },
  ],
  requirements: [
    { id: "functional-requirements", title: "Functions" },
    { id: "workload-estimation", title: "Assumptions + Capacity" },
  ],
  architecture: [
    { id: "transactional-spine", title: "Seat Authority" },
    { id: "event-backbone", title: "Event Backbone" },
    { id: "critical-flow", title: "Booking Trace" },
    { id: "payment-race", title: "Payment Race" },
  ],
  "event-contracts": [
    { id: "event-envelope", title: "Envelope" },
    { id: "event-catalog", title: "Event Catalog" },
    { id: "topic-contract", title: "Topics" },
  ],
  "data-modeling": [
    { id: "model-erd", title: "ER Diagram" },
  ],
  "batch-lakehouse": [
    { id: "lakehouse-flow", title: "Lakehouse Flow" },
    { id: "gold-products", title: "Gold Products" },
    { id: "iceberg-lifecycle", title: "Iceberg" },
    { id: "backfill", title: "Backfill" },
    { id: "batch-boundary", title: "Batch Boundary" },
  ],
  "governance-quality": [
    { id: "ownership-contracts", title: "Ownership" },
    { id: "quality-gates", title: "Quality Gates" },
    { id: "finance-reconciliation", title: "Money Checks" },
    { id: "observability", title: "Signals" },
    { id: "privacy-access", title: "Privacy" },
    { id: "failure-recovery", title: "Recovery Drills" },
  ],
  "interview-qa": [
    { id: "question-bank", title: "Question Bank" },
    { id: "whiteboard", title: "5-Minute Plan" },
  ],
};

export const BOOKMYSHOW_META = Object.fromEntries(
  BOOKMYSHOW_CHAPTERS.map((chapter) => [
    chapter.id,
    {
      title: `BookMyShow Data Engineering — ${chapter.label} | withsoon`,
      description: `${chapter.description} A visual interview case study for a BookMyShow-like ticketing marketplace.`,
    },
  ]),
) as Record<BookMyShowChapter, { title: string; description: string }>;

export function isBookMyShowChapter(value: string): value is BookMyShowChapter {
  return BOOKMYSHOW_CHAPTERS.some((chapter) => chapter.id === value);
}
