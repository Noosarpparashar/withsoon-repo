export const NETFLIX_CURRICULUM_GROUPS = [
  "FOUNDATION",
  "PIPELINES",
  "MODELING",
  "PRODUCTION",
  "PRACTICE",
] as const;

export type NetflixCurriculumGroup =
  (typeof NETFLIX_CURRICULUM_GROUPS)[number];

export type NetflixCurriculumChapter = {
  id: string;
  label: string;
  group: NetflixCurriculumGroup;
  mins: number;
  accent: string;
  summary: string;
  description: string;
  availability: "published";
  aliases: readonly string[];
};

/**
 * The single source of truth for Netflix curriculum routes and ordering.
 * Navigation, progress, metadata, sitemap publication, aliases, and homepage
 * counts must be derived from this registry.
 */
export const NETFLIX_ROUTE_REGISTRY = [
  {
    id: "start-here",
    label: "Start Here",
    group: "FOUNDATION",
    mins: 5,
    accent: "#5f565a",
    summary: "Open the round like a dedicated Netflix data-platform interview.",
    description:
      "Clarify scope, show the end-to-end journey, and position the data-engineering boundary before any deep dive.",
    availability: "published",
    aliases: ["data-engineering"],
  },
  {
    id: "requirements",
    label: "Requirements",
    group: "FOUNDATION",
    mins: 8,
    accent: "#827a70",
    summary: "Turn business questions into freshness, correctness, and SLA contracts.",
    description:
      "Group requirements by domain, show scale anchors, and separate real-time, batch, and governance expectations.",
    availability: "published",
    aliases: [],
  },
  {
    id: "architecture",
    label: "Architecture",
    group: "FOUNDATION",
    mins: 10,
    accent: "#49667d",
    summary: "Show the full Netflix data journey as one layered system map.",
    description:
      "Walk from event emitters to validation, Kafka, streaming, Bronze/Silver/Gold, warehouse, features, replay, and governance.",
    availability: "published",
    aliases: [
      "architecture-map",
      "warehouse-serving",
      "feature-store-experimentation",
      "ml-serving",
      "stack",
      "high-level-data-architecture",
    ],
  },
  {
    id: "ingestion-kafka",
    label: "Event Contracts",
    group: "PIPELINES",
    mins: 9,
    accent: "#827a70",
    summary: "Make canonical events, Kafka ordering, and data trust easy to explain.",
    description:
      "Cover canonical event envelopes, topic keys and partition math, late data handling, SCD2 joins, quality gates, and cost-aware controls.",
    availability: "published",
    aliases: [
      "event-sources",
      "ingestion",
      "event-taxonomy",
      "ingestion-layer",
      "kafka-topic-design",
    ],
  },
  {
    id: "real-time-streaming",
    label: "Real-Time Streaming",
    group: "PIPELINES",
    mins: 10,
    accent: "#49667d",
    summary: "Explain how raw events become trusted real-time metrics and features.",
    description:
      "Cover Flink jobs, watch-time logic, sessionization, watermarks, late data handling, and exactly-once style guarantees.",
    availability: "published",
    aliases: [
      "streaming",
      "streaming-pipeline",
      "watch-time-calculation",
      "sessionization",
    ],
  },
  {
    id: "data-modeling",
    label: "Data Modeling",
    group: "MODELING",
    mins: 9,
    accent: "#5b5263",
    summary: "Connect ERD, star schema, lineage, and table semantics in one place.",
    description:
      "Explain grain, partitions, facts, dimensions, marts, lineage, and why each table exists for analytics or ML use cases.",
    availability: "published",
    aliases: ["modeling", "table-design"],
  },
  {
    id: "batch-pipelines",
    label: "Batch + Lakehouse",
    group: "PIPELINES",
    mins: 10,
    accent: "#8b8377",
    summary: "Show how trusted batch truth and the lakehouse operating model work together.",
    description:
      "Combine DAG visuals, Bronze/Silver/Gold responsibilities, Iceberg layout, DQ gates, replayability, and official publish flows in one section.",
    availability: "published",
    aliases: [
      "batch",
      "lakehouse",
      "backfill-replay",
      "late-events-replay",
      "lakehouse-design",
      "batch-pipeline",
    ],
  },
  {
    id: "governance-quality",
    label: "Governance / Quality",
    group: "PRODUCTION",
    mins: 8,
    accent: "#6e8178",
    summary: "Treat schema, privacy, freshness, and trust as first-class product surfaces.",
    description:
      "Cover data contracts, DQ dashboards, PII policy, deletions, lineage, audits, and severity-driven response paths.",
    availability: "published",
    aliases: [
      "failures",
      "reliability",
      "governance",
      "data-quality",
      "governance-security",
      "reliability-backfill",
    ],
  },
  {
    id: "capacity-cost",
    label: "Capacity / Cost",
    group: "PRODUCTION",
    mins: 7,
    accent: "#8b8377",
    summary: "Make scale math, tool choices, and cost controls explicit and defensible.",
    description:
      "Derive event rates, partitions, retention, storage, and compute costs from one consistent workload model.",
    availability: "published",
    aliases: ["performance-cost", "capacity", "scale-estimation", "trade-offs"],
  },
  {
    id: "quiz",
    label: "Interview Q&A",
    group: "PRACTICE",
    mins: 9,
    accent: "#49667d",
    summary: "Merge follow-up answers and Netflix tech name-drops into one light interview section.",
    description:
      "Use compact Q&A, a technology map, and simple draw-if-asked visuals so you can explain the platform crisply in an interview.",
    availability: "published",
    aliases: ["cheat-sheet", "interview-qa", "mock-interview"],
  },
] as const satisfies readonly NetflixCurriculumChapter[];

export type NetflixChapterSlug =
  (typeof NETFLIX_ROUTE_REGISTRY)[number]["id"];

export type NetflixRouteResolution =
  | {
      availability: "published";
      requestedSlug: string;
      canonicalSlug: NetflixChapterSlug;
      chapter: (typeof NETFLIX_ROUTE_REGISTRY)[number];
    }
  | {
      availability: "redirect";
      requestedSlug: string;
      canonicalSlug: NetflixChapterSlug;
      chapter: (typeof NETFLIX_ROUTE_REGISTRY)[number];
    }
  | { availability: "missing"; requestedSlug: string };

export function resolveNetflixRoute(slug?: string | null): NetflixRouteResolution {
  const requestedSlug = slug ?? "";
  const chapter = NETFLIX_ROUTE_REGISTRY.find(
    (candidate) =>
      candidate.id === requestedSlug ||
      (candidate.aliases as readonly string[]).includes(requestedSlug),
  );

  if (!chapter) return { availability: "missing", requestedSlug };

  return {
    availability: chapter.id === requestedSlug ? "published" : "redirect",
    requestedSlug,
    canonicalSlug: chapter.id,
    chapter,
  };
}

export const NETFLIX_ROUTE_ALIASES = NETFLIX_ROUTE_REGISTRY.flatMap((chapter) =>
  chapter.aliases.map((alias) => ({ alias, destination: chapter.id })),
);
