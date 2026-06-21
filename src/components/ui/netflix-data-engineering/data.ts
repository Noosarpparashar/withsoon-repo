export const DATA_ENGINEERING_TAB_SLUGS = [
  "start-here",
  "requirements",
  "architecture",
  "ingestion",
  "streaming",
  "batch",
  "lakehouse",
  "modeling",
  "reliability",
  "ml-serving",
  "stack",
  "governance",
  "performance-cost",
  "capacity",
  "interview-qa",
  "quiz",
  "mock-interview",
  "cheat-sheet",
] as const;

export type DataEngineeringTabSlug = typeof DATA_ENGINEERING_TAB_SLUGS[number];

export const DATA_ENGINEERING_LEGACY_MAP = {
  "data-engineering": "start-here",
  "architecture-map": "architecture",
  "data-pipeline": "streaming",
  "data-design": "modeling",
  "observability-cost": "reliability",
  "interview-qa": "interview-qa",
} as const satisfies Record<string, DataEngineeringTabSlug>;

export function isDataEngineeringTabSlug(value: string): value is DataEngineeringTabSlug {
  return (DATA_ENGINEERING_TAB_SLUGS as readonly string[]).includes(value);
}

export function normalizeDataEngineeringTab(value?: string | null): DataEngineeringTabSlug | null {
  if (!value) return null;
  if (isDataEngineeringTabSlug(value)) return value;
  return DATA_ENGINEERING_LEGACY_MAP[value as keyof typeof DATA_ENGINEERING_LEGACY_MAP] ?? null;
}

export const DATA_ENGINEERING_TABS: Array<{
  id: DataEngineeringTabSlug;
  label: string;
  mins: number;
}> = [
  { id: "start-here", label: "Start Here", mins: 4 },
  { id: "requirements", label: "Requirements", mins: 7 },
  { id: "architecture", label: "Architecture", mins: 9 },
  { id: "ingestion", label: "Ingestion", mins: 8 },
  { id: "streaming", label: "Streaming", mins: 10 },
  { id: "batch", label: "Batch", mins: 8 },
  { id: "lakehouse", label: "Lakehouse", mins: 8 },
  { id: "modeling", label: "Modeling", mins: 8 },
  { id: "reliability", label: "Reliability", mins: 9 },
  { id: "ml-serving", label: "ML & Serving", mins: 6 },
  { id: "stack", label: "Stack", mins: 6 },
  { id: "governance", label: "Governance", mins: 7 },
  { id: "performance-cost", label: "Performance", mins: 7 },
  { id: "capacity", label: "Capacity", mins: 7 },
  { id: "interview-qa", label: "Interview Q&A", mins: 8 },
  { id: "quiz", label: "Quiz", mins: 15 },
  { id: "mock-interview", label: "Mock Interview", mins: 45 },
  { id: "cheat-sheet", label: "Cheat Sheet", mins: 6 },
];

export const DATA_TRACK_NUMBERS = [
  { label: "Monthly users", value: "200M-250M", note: "Docs use both 200M+ and 250M assumptions", color: "#38bdf8" },
  { label: "Daily active users", value: "80M", note: "Used for watch-time and Kafka math", color: "#10b981" },
  { label: "Peak concurrency", value: "15M", note: "Viewer concurrency for ops dashboards", color: "#f59e0b" },
  { label: "Heartbeat events/day", value: "19.2B", note: "80M DAU x 240 heartbeats/day", color: "#e50914" },
  { label: "Peak ingest", value: "1M-2M events/s", note: "Kafka sizing target with headroom", color: "#8b5cf6" },
  { label: "Raw data/day", value: "50-100 TB", note: "After playback, browse, search, error, CDN, billing, CDC", color: "#06b6d4" },
];

export const START_HERE_PATH = [
  { step: "Start Here", detail: "Scope the interview as a data platform, not playback backend" },
  { step: "Requirements", detail: "Lock business questions, SLAs, correctness rules, and privacy constraints" },
  { step: "Architecture", detail: "Show source -> Kafka -> Flink/Spark -> Bronze/Silver/Gold -> BI/ML" },
  { step: "Ingestion", detail: "Defend event taxonomy, CDC, batch ingest, schema contracts, and topic layout" },
  { step: "Streaming", detail: "Explain dedup, sessionization, watch-time logic, late data, and watermarking" },
  { step: "Batch", detail: "Cover daily aggregates, training datasets, orchestration, and backfill-safe recomputation" },
  { step: "Lakehouse", detail: "Cover Iceberg, warehouse, real-time OLAP, and serving layers" },
  { step: "Modeling", detail: "Walk through fact and dimension tables, aggregate marts, and ELT patterns" },
  { step: "Reliability", detail: "DLQ, replay, reconciliation, backfills, DQ, and observability" },
  { step: "Stack", detail: "Map the design to AWS and open source tools without sounding tool-obsessed" },
  { step: "Governance", detail: "Explain lineage, PII controls, GDPR, and access boundaries" },
  { step: "Capacity", detail: "Size Kafka, Flink, Spark, S3, and Redshift with first-principles math" },
  { step: "Interview Q&A", detail: "Handle follow-up probes, metrics, and fast-reference concepts" },
  { step: "Mock Interview", detail: "Practice the 30-minute senior-level narrative" },
  { step: "Cheat Sheet", detail: "Do the final revision pass before the round" },
];

export const START_HERE_SCOPE = {
  inScope: [
    "High-volume event ingestion from mobile, web, TV, console, CDN, and backend services",
    "Real-time processing for dashboards, anomaly detection, trending content, and online features",
    "Batch processing for retention, churn, cohorting, content performance, and ML training sets",
    "Bronze/Silver/Gold lakehouse, warehouse serving, feature store, and BI access",
    "Data quality, observability, governance, lineage, security, replay, backfill, and late-data correction",
  ],
  outOfScope: [
    "Playback API orchestration, DRM license flow, and CDN request routing",
    "Video upload product flows, transcoding internals, or microservice REST contracts",
    "Search ranking algorithms or recommendation model architecture in depth",
    "Subscription billing backend implementation details beyond data-source integration",
  ],
};

export const REQUIREMENT_GROUPS = [
  {
    title: "User Engagement Analytics",
    color: "#38bdf8",
    items: [
      "How many users watched today, and for how long?",
      "Average session length, completion rate, and starts-without-finish rate",
      "Trending titles by region, genre, device, and time bucket",
      "Most active users and binge behavior by profile",
    ],
  },
  {
    title: "Content Performance",
    color: "#10b981",
    items: [
      "Watch hours, impression-to-click conversion, and episode-to-episode binge rates",
      "Low completion content, regional taste differences, and renewal / promotion inputs",
      "Content performance inputs for localization, catalog curation, and rights negotiation",
    ],
  },
  {
    title: "Playback Quality",
    color: "#f59e0b",
    items: [
      "Buffering rate by device type, app version, ISP, region, and network condition",
      "Bitrate degradation, startup delay, and playback failure hot spots",
      "QoE metrics for operational response and long-term churn correlation",
    ],
  },
  {
    title: "Recommendations & Revenue",
    color: "#8b5cf6",
    items: [
      "Features like genre affinity, language preference, binge score, search intent, and context vectors",
      "Retention, churn prediction, subscription plan movement, trial-to-paid conversion, and campaign attribution",
      "Regional revenue, cohort analysis, and downstream ML / BI consumers",
    ],
  },
];

export const LATENCY_SLA_ROWS = [
  ["Live concurrent viewer dashboard", "5s to 1 min"],
  ["Trending content detection", "1 to 5 min"],
  ["Fraud or anomaly alerting", "Seconds to 1 min"],
  ["Resume watching position", "Sub-second to a few seconds"],
  ["Real-time recommendation features", "Seconds to minutes"],
  ["Daily content performance report", "Ready by morning"],
  ["Monthly revenue report", "Hours acceptable"],
  ["ML training dataset", "Daily or every few hours"],
];

export const NFRS = [
  "Kafka ingestion 99.99%, critical streaming pipelines 99.9%, BI warehouse 99.5%+",
  "No event loss for critical events, idempotent writes, dedup, sessionization, and replayability",
  "Handle late and out-of-order data, reconcile stream vs batch, and support backfills safely",
  "PII hashing or tokenization, encryption in transit and at rest, RBAC, row/column security, audit logs",
  "GDPR or right-to-delete workflows, regional residency where required, and retention policies by layer",
];

export const ARCHITECTURE_LAYERS = [
  {
    title: "Sources",
    color: "#38bdf8",
    bullets: [
      "Client-side events: play, pause, heartbeat, browse impression, search, recommendation impression and click",
      "Server-side logs: API gateway, CDN edge, microservices, billing, error, device telemetry",
      "OLTP and CDC: PostgreSQL users/content, MySQL billing, DynamoDB streams, external partner feeds",
    ],
  },
  {
    title: "Ingestion",
    color: "#8b5cf6",
    bullets: [
      "HTTPS event collector batches client events and writes validated Avro records to Kafka",
      "Debezium or DMS capture database changes without hammering production OLTP systems",
      "Batch ingest routes SFTP, DMS, Glue, or partner feeds into Bronze storage",
    ],
  },
  {
    title: "Processing",
    color: "#f59e0b",
    bullets: [
      "Flink handles stateful event-time pipelines, sessionization, QoE monitoring, fraud patterns, and trends",
      "Spark or Glue compute daily aggregates, retention, training sets, and backfills",
      "Kafka Streams or lightweight processors handle simpler enrichments and fan-out",
    ],
  },
  {
    title: "Storage & Serving",
    color: "#10b981",
    bullets: [
      "Bronze raw immutable events, Silver cleaned and sessionized data, Gold business aggregates",
      "Iceberg lakehouse plus Redshift or Snowflake warehouse, Druid or Pinot for sub-second OLAP",
      "Feature store, BI dashboards, Trino or Athena queries, and downstream ML consumers",
    ],
  },
];

export const INGESTION_SECTIONS = [
  {
    heading: "Data Sources & Ingestion Patterns",
    items: [
      "Client, server, third-party, and OLTP sources all feed the platform with different freshness and trust characteristics",
      "Real-time event streaming uses Kafka with Avro, Schema Registry, `acks=all`, RF=3, Snappy compression, and 7-day replay retention",
      "CDC uses Debezium for PostgreSQL/MySQL and DynamoDB Streams/Kinesis where appropriate",
      "Batch ingestion covers nightly refreshes, SFTP partner drops, AWS DMS migrations, and Glue landing jobs",
      "A concrete CDC answer should include `before`, `after`, operation type, event timestamp, and source metadata so consumers can interpret updates safely",
    ],
  },
  {
    heading: "Event Taxonomy",
    items: [
      "Playback: `video.play`, `video.pause`, `video.resume`, `video.seek`, `video.heartbeat`, `video.complete`, `video.stop`, `video.error`, `video.buffer.start`, `video.buffer.end`, `video.quality.change`",
      "Browse and discovery: page views, row impressions, title-card impressions, title clicks, search queries, search result clicks, recommendation served, recommendation clicked",
      "Browse/search/recommendation events should live in separate domain topics instead of one giant raw topic",
      "Key fields include `event_id`, `event_ts`, `ingest_ts`, `session_id`, `profile_id`, `content_id`, device, app version, country, and playback state",
    ],
  },
  {
    heading: "Data Contracts & Schema Evolution",
    items: [
      "Contracts define owners, required fields, enums, SLA, privacy class, and allowed evolution rules",
      "Use backward-compatible schema additions with defaults; reject breaking removals or type changes",
      "Schema Registry should block incompatible producer deployments before consumers fail in production",
    ],
  },
  {
    heading: "Kafka Topic Strategy",
    items: [
      "Partition high-volume heartbeat and playback topics by `session_id` to preserve per-session ordering",
      "Avoid `content_id` partitioning because blockbuster launches create hot partitions and consumer lag",
      "Search and recommendation topics can partition by `profile_id`; error topics often group by device or app version",
    ],
  },
];

export const STREAMING_SECTIONS = [
  {
    heading: "Streaming Jobs",
    items: [
      "Playback heartbeat aggregator computes watched seconds, buffering ratio, average bitrate, and quality-change counts",
      "Fraud and anomaly jobs combine auth and billing changes with CEP patterns",
      "Trending-content pipelines compute rolling popularity by region and freshness window",
      "Flink state uses checkpointing plus RocksDB or remote state backends for recovery",
      "Kafka Streams or similarly lightweight processors are still useful for simpler enrichments where full Flink state machines would be overkill",
    ],
  },
  {
    heading: "Watch-Time Calculation",
    items: [
      "Do not estimate watch time from play and pause alone; heartbeat events are the proof of continued watching",
      "Source of truth is the ordered heartbeat stream plus playback state, not raw event counts",
      "Sum intervals between consecutive valid heartbeats when the previous state is `playing`",
      "Reject duplicates by `event_id`, ignore invalid time travel, and cap anomalous gaps",
      "Pause excludes time, buffering may count or not depending on product definition, and seek changes progression but not elapsed watch time",
      "Completion percentage is watched seconds divided by content runtime, often with a 90% completion threshold",
    ],
  },
  {
    heading: "Sessionization",
    items: [
      "Session key is typically `(profile_id, content_id, session_id)` or a playback-session identifier",
      "Apply an inactivity timeout, commonly 30 minutes, to close abandoned sessions",
      "Maintain keyed state for last event timestamp, last playback state, cumulative watched seconds, and session start/end markers",
      "Long pauses should split or suspend sessions based on business definition rather than blindly counting idle time",
    ],
  },
  {
    heading: "Late & Out-of-Order Events",
    items: [
      "Use event time, not processing time, for user behavior metrics",
      "Define watermarks and allowed lateness windows; the add-on doc repeatedly points to 30 minutes as a practical example",
      "Events beyond the lateness threshold go to DLQ or correction flow rather than being silently dropped",
      "Correction jobs MERGE fixed outputs back into Silver or Gold idempotently",
    ],
  },
];

export const BATCH_SECTIONS = [
  {
    heading: "Daily Batch Jobs",
    items: [
      "Daily user-activity summaries compute watch hours, active days, completion behavior, and profile-level engagement rollups",
      "Content performance jobs aggregate impressions, clicks, starts, completions, watch hours, and regional preference breakdowns",
      "Recommendation training-set jobs prepare labeled interaction histories, negative samples, and feature joins for offline models",
      "Batch outputs are the exactness layer for finance, product, content, and ML teams when streaming estimates are not sufficient",
    ],
  },
  {
    heading: "Incremental vs Full Loads",
    items: [
      "Prefer incremental loads for large fact data using timestamps, snapshots, CDC markers, or Iceberg snapshots",
      "Use full refreshes carefully for small dimensions or partner feeds when change tracking is weak",
      "Every incremental pipeline needs idempotency, checkpointing, and a replay path for corrected transformations",
    ],
  },
  {
    heading: "Orchestration & Workflow Management",
    items: [
      "Airflow is the primary control plane for hourly and daily DAGs, backfills, retries, SLAs, and dependency chains",
      "Separate ingestion, transformation, quality validation, publish, and notification steps so failures are diagnosable",
      "Attach SLA monitoring and alerting to freshness deadlines, task retries, and downstream publish success",
      "dbt is especially valuable in Silver -> Gold SQL transformations because it adds modularity, tests, docs, and lineage",
    ],
  },
];

export const LAKEHOUSE_SECTIONS = [
  {
    heading: "Bronze, Silver, Gold",
    items: [
      "Bronze is append-only raw truth with no destructive cleaning",
      "Silver handles deduplication, sessionization, enrichment, and quarantine of bad records",
      "Gold stores daily or hourly aggregates such as watch hours, completion rate, cohort retention, and title metrics",
    ],
  },
  {
    heading: "Storage & Formats",
    items: [
      "Prefer Parquet plus Zstandard or Snappy for analytics efficiency",
      "Iceberg adds schema evolution, partition evolution, time travel, row-level deletes, and engine interoperability",
      "S3 bucket structure should separate raw, curated, quarantine, backfill, and feature-store outputs cleanly",
      "A file-format answer should explicitly contrast Parquet or ORC for analytics with Avro or JSON for transport and schema-bearing events",
    ],
  },
  {
    heading: "Warehouse and Lakehouse Design",
    items: [
      "Redshift or Snowflake are strong warehouse choices for BI, finance, and dashboard workloads with controlled schemas",
      "Iceberg gives the open-format lakehouse layer with time travel, metadata-based table evolution, and multi-engine access",
      "A practical answer often lands on S3 + Iceberg as the source of analytical truth plus warehouse marts for curated serving",
    ],
  },
  {
    heading: "Warehouse & Serving",
    items: [
      "Redshift or Snowflake serve BI and finance workloads",
      "Trino or Athena can query Iceberg directly for ad hoc analytics",
      "Druid or Pinot cover sub-second operational dashboards; Redis can serve tiny real-time counters or features",
    ],
  },
  {
    heading: "Operational Stores Beyond S3",
    items: [
      "Redis for fast counters and serving caches",
      "Feature stores for online and offline ML features",
      "Warehouse marts for product, finance, content, and experimentation teams",
      "Operational stores beyond S3 can also include internal serving tables and CDC logs that feed downstream reconciliations",
    ],
  },
];

export const MODELING_SECTIONS = [
  {
    heading: "Core Tables",
    items: [
      "Fact tables: watch sessions, impressions, search events, billing events, recommendation impressions",
      "Dimension tables: user, profile, content, genre, device, app version, date, country, subscription plan",
      "Gold reporting tables: content-daily metrics, user cohort retention, revenue rollups, QoE summaries",
    ],
  },
  {
    heading: "Table Design: Schema, Columns & Data Types",
    items: [
      "FACT_WATCH_SESSION should capture session_id, profile_id, content_id, device_id, start_ts, end_ts, watched_seconds, completion_pct, buffering_ratio, avg_bitrate, country_code, app_version, and partition date",
      "FACT_CONTENT_IMPRESSION should store impression_id, profile_id, content_id, page or rail context, rank position, event_ts, country, device, and whether it converted to click or play",
      "FACT_SEARCH_EVENT should record query text, normalized query, result count, clicked content, latency, device, and session context",
      "DIM_USER, DIM_CONTENT, DIM_DEVICE, and DIM_DATE should be clean conformed dimensions with stable surrogate or business keys and documented SCD behavior",
      "RPT_CONTENT_DAILY_METRICS and RPT_USER_COHORT_RETENTION should be treated as Gold marts owned by business definitions, not ad hoc analyst logic",
    ],
  },
  {
    heading: "Modeling Approaches",
    items: [
      "Kimball star schemas keep BI simple and performant",
      "Data Vault 2.0 helps raw auditability and change capture when lineage matters deeply",
      "OBT or denormalized models can accelerate dashboard workloads when you accept redundancy",
      "A senior answer should explain where each modeling style lives instead of pretending one style must cover the entire platform",
    ],
  },
  {
    heading: "ETL / ELT Patterns",
    items: [
      "Use ELT when warehouse or lakehouse engines are strong enough to do downstream shaping",
      "Use ETL when heavy cleansing, custom parsing, or pre-warehouse transformations are required",
      "dbt is a strong fit for Silver -> Gold modeling, testing, documentation, and lineage exposure",
    ],
  },
  {
    heading: "Orchestration",
    items: [
      "Airflow orchestrates hourly and daily DAGs, backfills, SLAs, and correction pipelines",
      "Track task-level retries, alerting, upstream dependencies, and audit tables for backfills",
      "Use versioned datasets and atomic swaps when reprocessing shared business tables",
    ],
  },
];

export const RELIABILITY_SECTIONS = [
  {
    heading: "DLQ, Quarantine, Replay",
    items: [
      "DLQ catches malformed, too-late, schema-invalid, or otherwise unsafe events",
      "Quarantine tables should capture raw payload, error code, error message, pipeline stage, source topic, ingest time, and replay eligibility",
      "Explicit error codes should distinguish schema mismatch, missing identifiers, future timestamps, negative durations, watermark violations, and downstream sink failures",
      "Replay flow: fix mapping or code, mark records replayable, republish to replay topic, consume idempotently, then audit the correction",
    ],
  },
  {
    heading: "Reconciliation & Backfills",
    items: [
      "Streaming outputs support freshness; batch recomputation owns correctness for critical metrics",
      "Compare stream and batch results with explicit thresholds and alert when they diverge",
      "Backfills start from Bronze, recompute corrected Silver and Gold partitions, validate deltas, and publish audit reports",
      "Prefer MERGE or versioned swaps over destructive overwrite on mixed live partitions",
    ],
  },
  {
    heading: "Data Quality & Observability",
    items: [
      "Bronze checks: schema validity, parseability, required identifiers, retention of raw bad payloads",
      "Silver checks: duplicate rate, null rate, negative watch durations, impossible future timestamps, runtime overages",
      "Gold checks: business reasonableness, day-over-day shifts, referential integrity, and freshness SLAs",
      "Define severity levels so some issues quarantine records, some alert, and some block publish entirely",
      "Expose pipeline health, lineage, freshness, and anomaly dashboards using tools like Great Expectations, Monte Carlo, or OpenMetadata",
      "Lineage should connect producers, topics, Flink/Spark jobs, Iceberg tables, dbt models, warehouse marts, and dashboards",
    ],
  },
];

export const ML_SERVING_SECTIONS = [
  {
    heading: "Feature Store",
    items: [
      "Offline feature tables store historical training features for reproducible model training",
      "Online features include recently watched, session context, device-time context, and fast popularity counters",
      "Daily and near-real-time features should align on entity keys and feature definitions",
    ],
  },
  {
    heading: "Recommendation Data Flow",
    items: [
      "User events feed feature generation, model training, candidate scoring, and recommendation serving",
      "The data engineer owns freshness, correctness, lineage, and accessibility of these datasets more than model architecture itself",
      "Trending, popularity, and contextual features are often nearline or streaming outputs",
    ],
  },
  {
    heading: "Real-Time Analytics Layer",
    items: [
      "Pinot or Druid serve sub-second dashboards for live viewers, buffering, and operational visibility",
      "Redis can cache tiny aggregates or online features where single-digit-millisecond serving matters",
      "BI tools such as Tableau, Superset, or QuickSight consume warehouse or Gold outputs",
    ],
  },
];

export const STACK_SECTIONS = [
  {
    heading: "AWS Services Mapping",
    items: [
      "MSK or Kinesis for event transport, Glue and EMR for ETL, S3 for Bronze/Silver/Gold storage, Redshift for warehouse serving",
      "Lambda and Transfer Family can help with ingestion edges, while DMS and Debezium-style CDC bridge operational stores",
      "SageMaker Feature Store, IAM, KMS, Lake Formation, and CloudWatch round out the managed-platform story",
      "IAM and access-control answers should mention role separation for platform teams, analysts, ML teams, finance users, and restricted datasets",
    ],
  },
  {
    heading: "Open Source Stack",
    items: [
      "Kafka, Flink, Spark, Airflow, Iceberg, dbt, Trino, Druid or Pinot, Great Expectations, OpenMetadata, and MLflow make a strong open-source answer",
      "The strongest interview answer explains why each tool exists instead of listing logos: transport, stateful compute, offline compute, table format, serving, quality, lineage",
      "If the interviewer wants trade-offs, explain when you choose managed cloud services over self-managed open-source platforms",
    ],
  },
  {
    heading: "Technology Decision Matrix",
    items: [
      "Flink vs Spark Streaming depends on low-latency stateful event-time complexity",
      "Iceberg vs Delta vs Hudi depends on engine ecosystem and operational standardization",
      "Warehouse-first vs lakehouse-first depends on ad hoc BI simplicity, multi-engine needs, and dataset scale",
      "Managed vs open-source trade-offs should cover ops burden, flexibility, lock-in, and hiring practicality",
    ],
  },
];

export const GOVERNANCE_SECTIONS = [
  {
    heading: "Governance & Catalog",
    items: [
      "Catalog datasets with ownership, classification, SLA, schema, lineage, and usage notes",
      "Expose lineage from event producers to Kafka topics, Flink jobs, Iceberg tables, dbt models, and dashboards",
      "Classify datasets by public, internal, confidential, and regulated sensitivity levels",
      "Glue Catalog, Atlas, or OpenMetadata-style examples are strong when tied back to discoverability and ownership",
    ],
  },
  {
    heading: "Security & PII",
    items: [
      "Encrypt in transit and at rest, segment networks, and enforce IAM least privilege",
      "Use row-level and column-level security for finance, experimentation, and regulated datasets",
      "Hash or tokenize user identifiers as early as possible in the ingest path where business use allows it",
    ],
  },
  {
    heading: "GDPR / Delete Workflow",
    items: [
      "Receive delete request, register the identity, delete or anonymize serving-store records, and apply row-level deletes to Iceberg tables",
      "Recompute affected aggregates or mark them non-user-identifiable where needed",
      "Propagate deletions to feature stores, downstream consumers, and audit tables",
    ],
  },
];

export const PERFORMANCE_SECTIONS = [
  {
    heading: "Partitioning & Tuning",
    items: [
      "Use manageable partition keys like `event_date`; avoid ultra-high-cardinality partition keys that explode small files",
      "Use bucketing or clustering where appropriate for join-heavy or selective query patterns",
      "Apply broadcast joins, skew handling, salting, caching, and compaction where Spark workloads demand it",
      "Leverage Z-order or similar clustering to improve read locality in lakehouse engines that support it",
      "Redshift tuning should consider sort keys, distribution style, workload isolation, and dashboard concurrency",
      "The small-files problem is its own design topic: without compaction, metadata and scan cost balloon quickly",
    ],
  },
  {
    heading: "Cost Optimization",
    items: [
      "Lifecycle old Bronze and Silver data into cheaper storage tiers while protecting replay needs",
      "Prefer serverless or auto-scaling batch when workload variability is high",
      "Compress aggressively, compact small files, and auto-pause non-prod warehouses",
      "Use file-size planning and compaction policies to avoid expensive tiny-file scans across massive tables",
    ],
  },
  {
    heading: "Scalability & Fault Tolerance",
    items: [
      "Kafka HA comes from replication, ISR discipline, no unclean leader election, and enough partition headroom",
      "Spark and Flink fault tolerance depend on checkpointing, retries, idempotent sinks, and careful state sizing",
      "Multi-region data architecture requires clear DR goals, replication scope, and consumer failover rules",
      "If asked about disaster recovery, say what is active-active, what is replayed after failure, and what lag is acceptable",
    ],
  },
];

export const CAPACITY_SECTIONS = [
  {
    heading: "Scale Estimation Anchors",
    items: [
      "80M DAU x 2 hours/day x one heartbeat every 30s = 19.2B heartbeat events/day",
      "At 1 KB compressed, heartbeat data alone is about 19.2 TB/day before browse, search, errors, CDN logs, and CDC",
      "20B events/day is roughly 231K events/sec average and about 1.15M events/sec at 5x peak multiplier",
    ],
  },
  {
    heading: "Kafka & Partitioning",
    items: [
      "If one partition safely handles 10K events/sec, 2M peak events/sec implies about 200 partitions before headroom",
      "Adding 30% headroom gets you into the 260-partition range across high-volume domains",
      "Topic examples from the docs include 200 partitions for playback heartbeats and 150 for browse impressions",
    ],
  },
  {
    heading: "Storage & Retention",
    items: [
      "50 TB/day x 90 days yields about 4.5 PB of hot Bronze",
      "If Silver compresses to half the size, two years lands around 18.25 PB",
      "Gold is much smaller, but business critical, and should still be versioned and protected",
    ],
  },
  {
    heading: "Compute Planning",
    items: [
      "Flink capacity needs depend on records/sec, state size, windowing, checkpoint cadence, and sink behavior",
      "Spark backfills should estimate scanned TB, shuffle volume, skew, and cluster runtime before commitment",
      "Redshift sizing should follow concurrency, dashboard shape, and business-hour SLAs rather than vanity cluster size",
      "S3 file-size planning matters too: large enough for scan efficiency, small enough for parallelism and timely commit behavior",
    ],
  },
];

export const INTERVIEW_QA_SECTIONS = [
  {
    heading: "Design Decision Follow-Ups",
    items: [
      "How would you handle late-arriving data end to end? Use event time, watermarking, allowed lateness, DLQ, and batch correction",
      "How would you design exactly-once semantics end to end? Discuss producer guarantees, transactional sinks where needed, Flink checkpoints, and idempotent writes",
      "How would you handle schema evolution safely? Use registry-enforced compatibility and explicit contract ownership",
      "How would you detect and handle data quality issues? Explain Bronze/Silver/Gold tests, thresholds, quarantine, and alerts",
      "How do data lake, warehouse, and lakehouse differ? Explain storage, compute, governance, and access trade-offs",
      "What is the difference between partitioning and bucketing? Tie it to pruning, shuffle reduction, and file organization",
      "How would you build a real-time recommendation pipeline? Separate online feature freshness from offline training sets",
      "How do you handle the small-files problem? Compaction, write sizing, partition hygiene, and merge jobs",
    ],
  },
  {
    heading: "Key Metrics & SLAs",
    items: [
      "Pipeline health metrics: ingest lag, consumer lag, freshness, failed tasks, duplicate rate, quarantine volume, checkpoint success, and publish SLA attainment",
      "Business metrics enabled: DAU, watch hours, completion rate, churn signals, title-level performance, retention, revenue by region, and experimentation outcomes",
      "Interview checklist topics: ingestion, schema evolution, sessionization, late data, lakehouse, warehouse, data quality, governance, replay, ML features, and cost",
    ],
  },
  {
    heading: "Appendix Quick References",
    items: [
      "Kafka consumer group concept: parallelism is capped by partition count, not by how many consumers you spin up",
      "SCD Type 2: preserve history when user or content dimension attributes change over time",
      "Watermarks in Flink: event-time progress markers, not just arbitrary delays",
      "Iceberg time travel: debug, compare snapshots, and re-run analytics with historical table versions",
    ],
  },
  {
    heading: "Interview Delivery Flow",
    items: [
      "Five-minute answer flow: scope, business questions, NFRs, high-level architecture, correctness rules, and a few explicit trade-offs",
      "Thirty-minute answer flow: requirements, architecture, ingestion, streaming, batch, lakehouse, governance, capacity, and reliability in sequence",
      "Strong closing statement: summarize what the platform enables, where correctness matters most, and what you would improve next with more time",
    ],
  },
];

export const DATA_QUIZ_CARDS = [
  {
    id: "dq-1",
    topic: "Scope",
    color: "#38bdf8",
    question: "What is the senior opening move when asked to design Netflix data architecture?",
    answer: "Clarify that you are designing the data platform, not the playback backend or CDN.",
    explanation: "This frames the interview around ingestion, pipelines, lakehouse, BI, ML features, governance, and reliability.",
    reviewTab: "start-here" as DataEngineeringTabSlug,
  },
  {
    id: "dq-2",
    topic: "Metrics",
    color: "#10b981",
    question: "Why can't you compute watch time from play and pause events alone?",
    answer: "They miss continuous proof of watching and overcount pauses or abandoned sessions.",
    explanation: "Heartbeat intervals with playback state are the source of truth for actual watched time.",
    reviewTab: "streaming" as DataEngineeringTabSlug,
  },
  {
    id: "dq-3",
    topic: "Kafka",
    color: "#f59e0b",
    question: "Why should heartbeat topics be partitioned by session_id instead of content_id?",
    answer: "session_id preserves ordering per playback and avoids hot partitions on blockbuster titles.",
    explanation: "content_id creates skew when millions watch the same title at once.",
    reviewTab: "ingestion" as DataEngineeringTabSlug,
  },
  {
    id: "dq-4",
    topic: "Schema",
    color: "#8b5cf6",
    question: "What schema-evolution policy is a strong interview answer for Kafka producers?",
    answer: "Avro plus Schema Registry with backward-compatible evolution, often BACKWARD_TRANSITIVE.",
    explanation: "It lets consumers keep working while blocking dangerous breaking changes at publish time.",
    reviewTab: "ingestion" as DataEngineeringTabSlug,
  },
  {
    id: "dq-5",
    topic: "Lakehouse",
    color: "#06b6d4",
    question: "What belongs in Bronze, Silver, and Gold?",
    answer: "Bronze stores raw immutable events, Silver cleans/dedups/sessionizes, Gold stores business aggregates.",
    explanation: "Separating raw truth from transformed logic preserves replayability and safe correction.",
    reviewTab: "lakehouse" as DataEngineeringTabSlug,
  },
  {
    id: "dq-6",
    topic: "Streaming",
    color: "#e50914",
    question: "What closes a watch session when no more heartbeats arrive?",
    answer: "An inactivity timeout, typically around 30 minutes, closes or finalizes the session.",
    explanation: "This handles crashes, network loss, or users walking away without explicit stop events.",
    reviewTab: "streaming" as DataEngineeringTabSlug,
  },
  {
    id: "dq-7",
    topic: "Late Data",
    color: "#10b981",
    question: "What should happen to events arriving beyond the watermark?",
    answer: "Route them to DLQ or correction flow and merge corrected outputs later.",
    explanation: "Silently dropping late data damages accuracy, especially on mobile and offline clients.",
    reviewTab: "reliability" as DataEngineeringTabSlug,
  },
  {
    id: "dq-8",
    topic: "Quality",
    color: "#f59e0b",
    question: "What duplicate-rate threshold is a good example of a Silver-layer alert?",
    answer: "A threshold like 0.1% is a good concrete interview example.",
    explanation: "The exact number can vary, but naming one shows operational maturity.",
    reviewTab: "reliability" as DataEngineeringTabSlug,
  },
  {
    id: "dq-9",
    topic: "Backfill",
    color: "#8b5cf6",
    question: "What is the correct source for a 90-day logic backfill?",
    answer: "Bronze raw immutable data is the replay starting point.",
    explanation: "If you mutate Bronze, you lose the safe source-of-truth needed for future corrections.",
    reviewTab: "reliability" as DataEngineeringTabSlug,
  },
  {
    id: "dq-10",
    topic: "Modeling",
    color: "#06b6d4",
    question: "Which modeling style is the easiest for BI analysts: Kimball, Data Vault, or OBT?",
    answer: "Kimball star schemas are usually the easiest and most approachable for BI.",
    explanation: "Data Vault helps auditability; OBT helps speed, but Kimball is often the clearest analytical contract.",
    reviewTab: "modeling" as DataEngineeringTabSlug,
  },
  {
    id: "dq-11",
    topic: "Security",
    color: "#e50914",
    question: "What are the three core privacy controls a data-engineering design should mention?",
    answer: "Tokenize or hash PII, encrypt in transit and at rest, and enforce role/row/column access controls.",
    explanation: "This is the minimum credible security posture for a senior interview answer.",
    reviewTab: "governance" as DataEngineeringTabSlug,
  },
  {
    id: "dq-12",
    topic: "Serving",
    color: "#38bdf8",
    question: "Why add Pinot or Druid if you already have a warehouse?",
    answer: "They support sub-second real-time analytics that warehouses often cannot deliver cheaply.",
    explanation: "Operational dashboards for live viewers or buffering spikes need fast freshness and low latency.",
    reviewTab: "ml-serving" as DataEngineeringTabSlug,
  },
];
