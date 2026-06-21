export const DATA_ENGINEERING_GROUPS = [
  "START",
  "EVENT PIPELINE",
  "CORE INTERVIEW DEEP DIVES",
  "LAKEHOUSE + MODELING",
  "PRODUCTION READINESS",
  "PRACTICE",
] as const;

export type DataEngineeringGroup = typeof DATA_ENGINEERING_GROUPS[number];

export const DATA_ENGINEERING_TAB_SLUGS = [
  "start-here",
  "requirements",
  "scale-estimation",
  "event-taxonomy",
  "high-level-data-architecture",
  "ingestion-layer",
  "kafka-topic-design",
  "streaming-pipeline",
  "watch-time-calculation",
  "sessionization",
  "late-events-replay",
  "lakehouse-design",
  "table-design",
  "batch-pipeline",
  "data-quality",
  "governance-security",
  "feature-store-ml-data",
  "serving-layer",
  "reliability-backfill",
  "trade-offs",
  "interview-qa",
  "mock-interview",
  "cheat-sheet",
] as const;

export type DataEngineeringTabSlug = typeof DATA_ENGINEERING_TAB_SLUGS[number];

export type DataEngineeringTab = {
  id: DataEngineeringTabSlug;
  label: string;
  group: DataEngineeringGroup;
  mins: number;
  accent: string;
  summary: string;
  description: string;
};

export const DATA_ENGINEERING_LEGACY_MAP = {
  "data-engineering": "start-here",
  architecture: "high-level-data-architecture",
  "architecture-map": "high-level-data-architecture",
  ingestion: "ingestion-layer",
  streaming: "streaming-pipeline",
  batch: "batch-pipeline",
  lakehouse: "lakehouse-design",
  modeling: "table-design",
  reliability: "reliability-backfill",
  governance: "governance-security",
  "ml-serving": "feature-store-ml-data",
  stack: "serving-layer",
  "performance-cost": "trade-offs",
  capacity: "scale-estimation",
  quiz: "interview-qa",
} as const satisfies Record<string, DataEngineeringTabSlug>;

export function isDataEngineeringTabSlug(value: string): value is DataEngineeringTabSlug {
  return (DATA_ENGINEERING_TAB_SLUGS as readonly string[]).includes(value);
}

export function normalizeDataEngineeringTab(value?: string | null): DataEngineeringTabSlug | null {
  if (!value) return null;
  if (isDataEngineeringTabSlug(value)) return value;
  return DATA_ENGINEERING_LEGACY_MAP[value as keyof typeof DATA_ENGINEERING_LEGACY_MAP] ?? null;
}

export const DATA_ENGINEERING_TABS: DataEngineeringTab[] = [
  {
    id: "start-here",
    label: "Start Here",
    group: "START",
    mins: 5,
    accent: "#e50914",
    summary: "Scope it as the data platform, not the playback backend.",
    description: "Clarify the interview boundary, define the platform surface, and open with the senior data-engineering framing statement.",
  },
  {
    id: "requirements",
    label: "Requirements",
    group: "START",
    mins: 7,
    accent: "#f59e0b",
    summary: "Translate business questions into freshness and correctness contracts.",
    description: "Map engagement, content, QoE, recommendations, and finance requirements to SLAs, tables, and consumers.",
  },
  {
    id: "scale-estimation",
    label: "Scale Estimation",
    group: "START",
    mins: 7,
    accent: "#38bdf8",
    summary: "Derive the numbers instead of guessing them.",
    description: "Calculate heartbeat events, raw TB/day, peak events/sec, Kafka partitions, and storage retention from first principles.",
  },
  {
    id: "event-taxonomy",
    label: "Event Taxonomy",
    group: "EVENT PIPELINE",
    mins: 7,
    accent: "#f59e0b",
    summary: "Separate playback, browse, search, recsys, ops, and CDC events cleanly.",
    description: "Teach event families, payload fields, downstream consumers, and why one giant raw topic is a bad design.",
  },
  {
    id: "high-level-data-architecture",
    label: "High-Level Data Architecture",
    group: "EVENT PIPELINE",
    mins: 10,
    accent: "#38bdf8",
    summary: "Build the end-to-end mental map before any deep dive.",
    description: "Use progressive reveal to walk from client events to Kafka, Flink, lakehouse, BI, feature store, governance, replay, and serving.",
  },
  {
    id: "ingestion-layer",
    label: "Ingestion Layer",
    group: "EVENT PIPELINE",
    mins: 8,
    accent: "#f59e0b",
    summary: "Show the three ingest lanes: client events, CDC, and external batch.",
    description: "Cover validation, enrichment, schema enforcement, ingestion timestamps, PII tagging, Debezium, DMS, and S3 landing flows.",
  },
  {
    id: "kafka-topic-design",
    label: "Kafka Topic Design",
    group: "EVENT PIPELINE",
    mins: 8,
    accent: "#f59e0b",
    summary: "Make topics, keys, retention, and partition math interview-ready.",
    description: "Explain domain topics, partition strategy, replay windows, DLQ topics, and how you avoid hot partitions.",
  },
  {
    id: "streaming-pipeline",
    label: "Streaming Pipeline",
    group: "EVENT PIPELINE",
    mins: 9,
    accent: "#38bdf8",
    summary: "Turn raw events into real-time facts, alerts, and features.",
    description: "Cover Flink jobs, keyed state, windows, watermarks, outputs, latency SLAs, and failure behavior.",
  },
  {
    id: "watch-time-calculation",
    label: "Watch-Time Calculation",
    group: "CORE INTERVIEW DEEP DIVES",
    mins: 8,
    accent: "#38bdf8",
    summary: "Heartbeat is the source of truth, not play and pause.",
    description: "Explain valid heartbeat rules, total watch time, unique coverage, buffering time, and completion percent definitions.",
  },
  {
    id: "sessionization",
    label: "Sessionization",
    group: "CORE INTERVIEW DEEP DIVES",
    mins: 8,
    accent: "#38bdf8",
    summary: "Convert noisy event streams into playback sessions and journeys.",
    description: "Use inactivity timeout, pause continuation threshold, duplicate suppression, and stateful aggregation to build trusted sessions.",
  },
  {
    id: "late-events-replay",
    label: "Late Events + Replay",
    group: "CORE INTERVIEW DEEP DIVES",
    mins: 8,
    accent: "#ef4444",
    summary: "Streaming gives speed; correction jobs restore correctness.",
    description: "Handle event time, watermarks, allowed lateness, late event routing, quarantine, replay, and Spark correction jobs.",
  },
  {
    id: "lakehouse-design",
    label: "Lakehouse Design",
    group: "LAKEHOUSE + MODELING",
    mins: 8,
    accent: "#8b5cf6",
    summary: "Bronze is immutable, Silver is trusted, Gold is official.",
    description: "Teach medallion responsibilities, S3 layout, Parquet, Iceberg, retention, access, and replayability.",
  },
  {
    id: "table-design",
    label: "Table Design",
    group: "LAKEHOUSE + MODELING",
    mins: 9,
    accent: "#8b5cf6",
    summary: "Explain grain, columns, partitions, and business meaning table by table.",
    description: "Explore fact tables, dimension tables, mart tables, quarantine tables, and backfill audit tables interactively.",
  },
  {
    id: "batch-pipeline",
    label: "Batch Pipeline",
    group: "LAKEHOUSE + MODELING",
    mins: 8,
    accent: "#fbbf24",
    summary: "Make batch own official daily truth and training datasets.",
    description: "Use DAG visuals to explain Spark, dbt, Airflow, partition readiness, DQ checks, publish steps, and downstream refreshes.",
  },
  {
    id: "data-quality",
    label: "Data Quality",
    group: "PRODUCTION READINESS",
    mins: 8,
    accent: "#ef4444",
    summary: "Turn DQ into a visible production system, not a hidden checklist.",
    description: "Show freshness, row counts, null rates, duplicates, DLQ, late events, severity policies, and investigation paths.",
  },
  {
    id: "governance-security",
    label: "Governance + Security",
    group: "PRODUCTION READINESS",
    mins: 8,
    accent: "#22c55e",
    summary: "Protect behavioral data and make access rules operational.",
    description: "Classify PII, tokenized IDs, row and column policies, GDPR deletes, residency, retention, and audit logging.",
  },
  {
    id: "feature-store-ml-data",
    label: "Feature Store + ML Data",
    group: "PRODUCTION READINESS",
    mins: 8,
    accent: "#a855f7",
    summary: "Split online and offline features without breaking point-in-time correctness.",
    description: "Show real-time feature generation, offline training features, entity keys, point-in-time joins, and ML consumer expectations.",
  },
  {
    id: "serving-layer",
    label: "Serving Layer",
    group: "PRODUCTION READINESS",
    mins: 7,
    accent: "#fbbf24",
    summary: "Match each workload to the right serving store.",
    description: "Use a workload-to-store matrix for BI, ad hoc SQL, real-time OLAP, online features, raw truth, and observability.",
  },
  {
    id: "reliability-backfill",
    label: "Reliability + Backfill",
    group: "PRODUCTION READINESS",
    mins: 9,
    accent: "#ef4444",
    summary: "Recover safely with idempotent reruns, snapshots, and audits.",
    description: "Simulate incidents, backfills, rollback strategy, checkpointing, Kafka HA, and controlled correction workflows.",
  },
  {
    id: "trade-offs",
    label: "Trade-offs",
    group: "PRACTICE",
    mins: 7,
    accent: "#f59e0b",
    summary: "Defend tool and architecture choices like a senior engineer.",
    description: "Compare Kafka vs Kinesis, Flink vs Spark Streaming, Iceberg vs Delta vs Hudi, and other high-signal design trade-offs.",
  },
  {
    id: "interview-qa",
    label: "Interview Q&A",
    group: "PRACTICE",
    mins: 9,
    accent: "#38bdf8",
    summary: "Connect follow-up questions directly to architecture decisions.",
    description: "Filter by topic, reveal strong answers, avoid weak answers, and jump back to the linked design deep dives.",
  },
  {
    id: "mock-interview",
    label: "Mock Interview",
    group: "PRACTICE",
    mins: 45,
    accent: "#e50914",
    summary: "Practice the full senior answer flow with hints and scoring.",
    description: "Walk scope, requirements, scale, architecture, correctness, failures, and trade-offs in a guided mock interview coach.",
  },
  {
    id: "cheat-sheet",
    label: "Cheat Sheet",
    group: "PRACTICE",
    mins: 6,
    accent: "#e50914",
    summary: "Hold the whole answer in your head before the round.",
    description: "Review the 30-second, 2-minute, and 5-minute versions plus formulas, rules, mistakes, and closing statement.",
  },
];

export const DATA_ENGINEERING_TAB_META: Record<
  DataEngineeringTabSlug,
  {
    title: string;
    description: string;
    eyebrow: string;
    heroTitle: string;
    heroSubtitle: string;
    heroSignals: string[];
    interviewAngle: string;
  }
> = Object.fromEntries(
  DATA_ENGINEERING_TABS.map((tab) => [
    tab.id,
    {
      title: `Netflix Data Engineering — ${tab.label} | withsoon.com`,
      description: tab.description,
      eyebrow: tab.group,
      heroTitle: tab.label,
      heroSubtitle: tab.summary,
      heroSignals: [
        tab.group,
        `${tab.mins} min`,
        tab.summary,
      ],
      interviewAngle: tab.description,
    },
  ])
) as Record<DataEngineeringTabSlug, {
  title: string;
  description: string;
  eyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroSignals: string[];
  interviewAngle: string;
}>;

export const DATA_TRACK_NUMBERS = [
  { label: "Monthly users", value: "200M-250M", note: "Docs use both 200M+ and 250M assumptions", color: "#38bdf8" },
  { label: "Daily active users", value: "80M", note: "Used for heartbeat and Kafka math", color: "#22c55e" },
  { label: "Peak concurrency", value: "15M", note: "Useful for QoE and live ops workloads", color: "#f59e0b" },
  { label: "Heartbeat events/day", value: "19.2B", note: "80M DAU x 2h x heartbeat every 30s", color: "#e50914" },
  { label: "Peak ingest", value: "1M-2M events/s", note: "Peak multiplier applied to total events/sec", color: "#8b5cf6" },
  { label: "Raw data/day", value: "50-100 TB", note: "Playback, browse, search, errors, CDN, billing, CDC", color: "#06b6d4" },
];

export const START_HERE_SCOPE = {
  inScope: [
    "High-volume event ingestion from mobile, web, TV, gaming consoles, CDN, and backend services",
    "Real-time processing for dashboards, trending content, anomaly detection, and online recommendation features",
    "Batch processing for daily metrics, retention, churn, content performance, and ML training datasets",
    "Bronze, Silver, and Gold lakehouse layers plus warehouse, BI, feature store, and serving consumers",
    "Data quality, governance, lineage, security, replay, backfill, correction, and late-arriving data handling",
  ],
  outOfScope: [
    "Playback API orchestration, CDN request routing, DRM flow, and video content delivery path",
    "Video upload product, transcoding internals, or microservice REST endpoint design",
    "User login backend, billing service internals, or search ranking model internals",
    "Recommendation model architecture in depth beyond the data and feature pipeline",
  ],
  backendScope: [
    "Playback APIs",
    "CDN and Open Connect",
    "Auth, billing, and request routing",
    "Device-to-stream delivery path",
  ],
  dataEngineeringScope: [
    "Events, Kafka, Flink, Spark, Iceberg",
    "BI warehouse, feature store, ML data",
    "Data quality, lineage, replay, backfill",
    "Correctness of watch time and sessionization",
  ],
  openingAnswer:
    "I will scope this as a data engineering platform for a Netflix-like streaming company. I will focus on event ingestion, streaming pipelines, batch pipelines, data lakehouse, warehouse, BI, ML feature generation, data quality, governance, backfills, and operational reliability. I will not go deep into backend playback APIs or CDN design unless you want me to.",
};

export const START_HERE_JOURNEY = [
  { step: "Start Here", detail: "Clarify the boundary: data platform, not playback backend." },
  { step: "Requirements", detail: "Map business questions to SLAs, correctness, and consumers." },
  { step: "Scale Estimation", detail: "Derive heartbeat volume, storage, throughput, and partitions." },
  { step: "Event Taxonomy", detail: "Separate event families and explain source-of-truth payloads." },
  { step: "High-Level Data Architecture", detail: "Show the full event-to-insight pipeline before deep dives." },
  { step: "Watch-Time Calculation", detail: "Prove why heartbeat is the source of truth." },
  { step: "Sessionization", detail: "Turn event streams into trusted playback sessions and journeys." },
  { step: "Late Events + Replay", detail: "Explain watermarking, correction jobs, quarantine, and replay." },
  { step: "Lakehouse + Table Design", detail: "Anchor Bronze, Silver, Gold, and the key fact tables." },
  { step: "Practice", detail: "Defend the design through trade-offs, Q&A, mock interview, and cheat sheet." },
];

export const REQUIREMENT_DOMAINS = [
  {
    id: "engagement",
    title: "User Engagement Analytics",
    color: "#38bdf8",
    rows: [
      {
        requirement: "How many hours were streamed per title?",
        priority: "P0",
        freshness: "Near real-time + daily final",
        correctness: "Very high",
        consumer: "Gold table + BI dashboard",
        flow: ["video.heartbeat", "Kafka playback.heartbeat.raw", "Flink watch-time aggregator", "silver.fact_watch_session", "gold.rpt_content_daily_metrics", "BI dashboard"],
      },
      {
        requirement: "Average session length and completion rate",
        priority: "P0",
        freshness: "Hourly + daily",
        correctness: "Very high",
        consumer: "Product + content analytics",
        flow: ["playback events", "Flink sessionizer", "silver.fact_watch_session", "gold.content_performance", "Content team"],
      },
    ],
  },
  {
    id: "content",
    title: "Content Performance Analytics",
    color: "#22c55e",
    rows: [
      {
        requirement: "Which content has high impressions but low clicks?",
        priority: "P1",
        freshness: "15 min to hourly",
        correctness: "High",
        consumer: "Growth + content promotion",
        flow: ["browse.title_impression", "browse.title_click", "Kafka browse topics", "Spark/SQL CTR model", "gold.content_discovery", "Marketing analytics"],
      },
      {
        requirement: "Which shows have high binge rate by region?",
        priority: "P1",
        freshness: "Daily",
        correctness: "High",
        consumer: "Content strategy",
        flow: ["fact_watch_session", "episode sequence enrichment", "gold.user_binge_metrics", "regional strategy deck"],
      },
    ],
  },
  {
    id: "qoe",
    title: "Playback Quality Analytics",
    color: "#f59e0b",
    rows: [
      {
        requirement: "Buffering ratio by ISP, device, and region",
        priority: "P0",
        freshness: "1-5 min",
        correctness: "High",
        consumer: "QoE dashboard + on-call",
        flow: ["video.buffer.start/end", "Kafka video.quality.raw", "Flink QoE monitor", "pinot.qoe_live", "Ops dashboard"],
      },
      {
        requirement: "Playback failures by app version",
        priority: "P0",
        freshness: "Seconds to minutes",
        correctness: "High",
        consumer: "App engineering + SRE",
        flow: ["video.error", "service.error", "Kafka ops topics", "Flink anomaly detector", "alerting + dashboards"],
      },
    ],
  },
  {
    id: "recsys",
    title: "Recommendation Features",
    color: "#a855f7",
    rows: [
      {
        requirement: "User genre affinity and binge score",
        priority: "P1",
        freshness: "Minutes + daily training",
        correctness: "High",
        consumer: "Feature store",
        flow: ["watch sessions", "feature generation jobs", "offline feature store", "model training / scoring", "recommender"],
      },
      {
        requirement: "Trending content features by region",
        priority: "P0",
        freshness: "1-5 min",
        correctness: "Medium-high",
        consumer: "Online recommendation features",
        flow: ["browse + playback", "Flink trending detector", "redis hot features", "online ranking"],
      },
    ],
  },
  {
    id: "business",
    title: "Business + Revenue Analytics",
    color: "#fbbf24",
    rows: [
      {
        requirement: "Regional revenue and cohort retention",
        priority: "P1",
        freshness: "Daily to monthly",
        correctness: "Very high",
        consumer: "Finance + executive reporting",
        flow: ["billing CDC", "subscription.change", "Spark reconciliation", "gold.finance_revenue", "Finance warehouse"],
      },
      {
        requirement: "Trial-to-paid conversion and churn features",
        priority: "P1",
        freshness: "Daily",
        correctness: "High",
        consumer: "Growth + churn models",
        flow: ["auth + subscription events", "Silver user timeline", "feature tables", "ML training + dashboards"],
      },
    ],
  },
  {
    id: "ops",
    title: "Operational Reliability",
    color: "#ef4444",
    rows: [
      {
        requirement: "Detect missing data and SLA misses quickly",
        priority: "P0",
        freshness: "Minutes",
        correctness: "High",
        consumer: "Platform on-call",
        flow: ["pipeline metrics", "dq dashboards", "alert routing", "investigation flow", "incident response"],
      },
      {
        requirement: "Replay bad events without corrupting official metrics",
        priority: "P0",
        freshness: "On demand + audited",
        correctness: "Very high",
        consumer: "Data platform owners",
        flow: ["DLQ / quarantine", "replay topic", "Spark correction", "Iceberg merge", "audit table"],
      },
    ],
  },
  {
    id: "security",
    title: "Security + Governance",
    color: "#22c55e",
    rows: [
      {
        requirement: "PII-safe access to watch and search history",
        priority: "P0",
        freshness: "Always enforced",
        correctness: "Very high",
        consumer: "Analysts + regulated consumers",
        flow: ["PII tagging", "tokenization", "row/column policies", "audited access", "approved consumers"],
      },
      {
        requirement: "Support right-to-delete and retention policies",
        priority: "P0",
        freshness: "Operational SLA",
        correctness: "Very high",
        consumer: "Privacy + compliance",
        flow: ["delete request", "identity resolution", "Iceberg row delete", "feature/store propagation", "audit log"],
      },
    ],
  },
] as const;

export const NFRS = [
  "Kafka ingestion 99.99%, critical streaming pipelines 99.9%, BI warehouse 99.5%+",
  "No event loss for critical events, exactly-once or idempotent writes, and replay-safe correction paths",
  "Correct watch-time calculation, deduplication, sessionization, and stream-vs-batch reconciliation",
  "PII hashing or tokenization, encryption in transit and at rest, RBAC, row/column policies, and audit logs",
  "GDPR deletes, regional residency, retention policies, and late-arriving data handling built into the platform",
];

export const LATENCY_SLA_ROWS = [
  ["Live concurrent viewer dashboard", "5 seconds to 1 minute"],
  ["Trending content detection", "1 to 5 minutes"],
  ["Fraud or anomaly alerting", "Seconds to 1 minute"],
  ["Resume watching position", "Sub-second to a few seconds"],
  ["Real-time recommendation features", "Seconds to minutes"],
  ["Daily content performance report", "Available by morning"],
  ["Monthly revenue report", "Hours acceptable"],
  ["ML training dataset", "Daily or every few hours"],
] as const;

export const SCALE_DEFAULTS = {
  dauMillions: 80,
  watchHoursPerUser: 2,
  heartbeatSeconds: 30,
  compressedEventKb: 1,
  peakMultiplier: 5,
  safeEventsPerPartition: 10000,
  headroomPercent: 30,
  additionalDailyEventsBillions: 0.8,
  bronzeHotDays: 90,
  silverRetentionDays: 730,
};

export const EVENT_FAMILIES = [
  {
    id: "playback",
    title: "Playback Events",
    color: "#38bdf8",
    events: [
      {
        id: "video-heartbeat",
        name: "video.heartbeat",
        purpose: "Proof that the user is actively watching, used as the source of truth for watch time.",
        usedFor: ["Watch-time calculation", "Resume position", "Completion %", "QoE metrics", "Recommendation features"],
        fields: ["event_id", "event_time", "user_id", "profile_id", "content_id", "session_id", "playback_position_sec", "heartbeat_interval_sec", "is_playing", "is_paused", "is_buffering", "bitrate_kbps"],
        samplePayload: `{
  "event_id": "evt_123",
  "event_type": "video.heartbeat",
  "event_time": "2026-06-21T10:15:30Z",
  "user_id": "u_101",
  "profile_id": "p_201",
  "content_id": "movie_501",
  "session_id": "s_9001",
  "playback_position_sec": 1800,
  "heartbeat_interval_sec": 30,
  "is_playing": true,
  "is_paused": false,
  "is_buffering": false
}`,
        consumers: ["Flink sessionizer", "Watch-time aggregator", "Resume store", "Feature generation"],
      },
      {
        id: "video-quality-change",
        name: "video.quality.change",
        purpose: "Tracks bitrate or resolution changes during playback for QoE analytics.",
        usedFor: ["QoE dashboard", "Device/ISP troubleshooting", "Content delivery quality trends"],
        fields: ["event_id", "event_time", "content_id", "session_id", "bitrate_kbps", "device_type", "country_code"],
        samplePayload: `{
  "event_type": "video.quality.change",
  "bitrate_kbps": 2400,
  "previous_bitrate_kbps": 4500,
  "device_type": "smart_tv"
}`,
        consumers: ["Playback quality monitor", "Gold QoE summaries"],
      },
      {
        id: "video-buffer",
        name: "video.buffer.start / video.buffer.end",
        purpose: "Marks buffering intervals separately from actual watch time.",
        usedFor: ["Buffering ratio", "Session diagnostics", "Playback quality alerts"],
        fields: ["event_id", "event_time", "session_id", "content_id", "device_type", "country_code"],
        samplePayload: `{
  "event_type": "video.buffer.start",
  "session_id": "s_9001",
  "country_code": "IN"
}`,
        consumers: ["Flink QoE monitor", "Pinot/Druid dashboards"],
      },
    ],
  },
  {
    id: "browse",
    title: "Browse Events",
    color: "#f59e0b",
    events: [
      {
        id: "browse-title-impression",
        name: "browse.title_impression",
        purpose: "Captures when a title card is shown to a user in a browse rail or page.",
        usedFor: ["CTR analysis", "Homepage shelf optimization", "Recommendation attribution"],
        fields: ["impression_id", "user_id", "profile_id", "content_id", "row_id", "position_in_row", "algorithm_id", "event_time"],
        samplePayload: `{
  "event_type": "browse.title_impression",
  "row_id": "continue_watching",
  "position_in_row": 3
}`,
        consumers: ["Content impression fact table", "Growth analytics", "Recommendation evaluation"],
      },
      {
        id: "browse-title-click",
        name: "browse.title_click",
        purpose: "Measures which content impressions convert into clicks and eventual playback.",
        usedFor: ["Conversion funnels", "Artwork tests", "Shelf ranking quality"],
        fields: ["event_id", "impression_id", "content_id", "event_time", "device_type"],
        samplePayload: `{
  "event_type": "browse.title_click",
  "impression_id": "imp_456"
}`,
        consumers: ["CTR metrics", "Recommendation attribution", "A/B analysis"],
      },
    ],
  },
  {
    id: "search",
    title: "Search Events",
    color: "#8b5cf6",
    events: [
      {
        id: "search-query",
        name: "search.query",
        purpose: "Captures user search intent and supports search quality, latency, and feature engineering.",
        usedFor: ["Search analytics", "Intent features", "No-result analysis"],
        fields: ["search_id", "user_id", "query_text", "normalized_query", "results_count", "device_type", "latency_ms"],
        samplePayload: `{
  "event_type": "search.query",
  "query_text": "crime thriller",
  "results_count": 24
}`,
        consumers: ["FACT_SEARCH_EVENT", "Search quality reporting", "Feature store"],
      },
      {
        id: "search-result-click",
        name: "search.result_click",
        purpose: "Tracks which result rank converted for downstream search quality evaluation.",
        usedFor: ["CTR by rank", "Search relevance", "User intent features"],
        fields: ["search_id", "content_id_clicked", "result_rank", "event_time"],
        samplePayload: `{
  "event_type": "search.result_click",
  "result_rank": 2
}`,
        consumers: ["Search analytics marts", "Feature generation"],
      },
    ],
  },
  {
    id: "recommendation",
    title: "Recommendation Events",
    color: "#a855f7",
    events: [
      {
        id: "recommendation-served",
        name: "recommendation.served",
        purpose: "Records which recommendations were shown so downstream systems can measure feature and ranking performance.",
        usedFor: ["Recommendation attribution", "Model evaluation", "Feature tracing"],
        fields: ["recommendation_id", "user_id", "model_version", "content_ids", "event_time"],
        samplePayload: `{
  "event_type": "recommendation.served",
  "recommendation_id": "rec_987",
  "model_version": "ranking_v12"
}`,
        consumers: ["Recommendation diagnostics", "Feature store lineage", "Impression marts"],
      },
      {
        id: "recommendation-clicked",
        name: "recommendation.clicked",
        purpose: "Captures whether a served recommendation was actually consumed by the user.",
        usedFor: ["Online CTR", "Model effectiveness", "Candidate source analysis"],
        fields: ["recommendation_id", "content_id", "event_time", "device_type"],
        samplePayload: `{
  "event_type": "recommendation.clicked",
  "recommendation_id": "rec_987",
  "content_id": "movie_123"
}`,
        consumers: ["Ranking metrics", "Training labels"],
      },
    ],
  },
  {
    id: "operational",
    title: "Operational Events",
    color: "#ef4444",
    events: [
      {
        id: "service-error",
        name: "service.error",
        purpose: "Records service-side failures that can affect data completeness or playback quality.",
        usedFor: ["On-call alerts", "Correlation with QoE spikes", "Root-cause analysis"],
        fields: ["service_name", "error_code", "country_code", "event_time", "app_version"],
        samplePayload: `{
  "event_type": "service.error",
  "service_name": "playback-gateway",
  "error_code": "UPSTREAM_TIMEOUT"
}`,
        consumers: ["Operational dashboards", "Incident investigation"],
      },
      {
        id: "cdn-edge-log",
        name: "cdn.edge.log",
        purpose: "Supports playback quality and delivery diagnostics from the CDN side.",
        usedFor: ["Bitrate degradation analysis", "Regional CDN health", "Delivery anomalies"],
        fields: ["request_id", "content_id", "edge_region", "latency_ms", "status_code"],
        samplePayload: `{
  "event_type": "cdn.edge.log",
  "edge_region": "us-east-1",
  "status_code": 206
}`,
        consumers: ["QoE pipeline", "SRE dashboards", "Capacity planning"],
      },
    ],
  },
  {
    id: "billing-cdc",
    title: "Billing / CDC Events",
    color: "#22c55e",
    events: [
      {
        id: "subscription-change",
        name: "subscription.change",
        purpose: "Tracks plan upgrades, downgrades, pauses, cancellations, and reactivations.",
        usedFor: ["Revenue analytics", "Retention and churn", "Finance reporting"],
        fields: ["user_id", "before_plan", "after_plan", "status", "event_time"],
        samplePayload: `{
  "event_type": "subscription.change",
  "before_plan": "basic",
  "after_plan": "premium"
}`,
        consumers: ["Finance Gold marts", "Growth analytics", "Churn models"],
      },
      {
        id: "cdc-users",
        name: "cdc.users.changes",
        purpose: "Captures database-level updates without hammering production OLTP systems.",
        usedFor: ["Dimension updates", "SCD2 changes", "Feature correctness"],
        fields: ["before", "after", "op", "ts_ms", "source.db", "source.table"],
        samplePayload: `{
  "before": { "user_id": 12345, "plan": "basic" },
  "after": { "user_id": 12345, "plan": "premium" },
  "op": "u",
  "ts_ms": 1719820000000
}`,
        consumers: ["DIM_USER merge", "Billing facts", "User feature timeline"],
      },
    ],
  },
] as const;

export const ARCHITECTURE_REVEALS = [
  { id: "validation", label: "Event Validation" },
  { id: "topics", label: "Kafka Topics" },
  { id: "flink", label: "Flink Jobs" },
  { id: "medallion", label: "Bronze/Silver/Gold" },
  { id: "features", label: "Feature Store" },
  { id: "quality", label: "Data Quality" },
  { id: "governance", label: "Governance" },
  { id: "replay", label: "Replay/Backfill" },
] as const;

export const ARCHITECTURE_NODES = [
  {
    id: "clients",
    label: "Client Apps",
    color: "#38bdf8",
    reveal: "base",
    x: 6,
    y: 34,
    what: "Mobile, web, smart TV, console, and device clients emit playback, browse, search, and recommendation events.",
    why: "This is the highest-volume event source and the origin of watch-time, QoE, and engagement analytics.",
    input: "User actions, playback state, device context, app version, country.",
    output: "Batched HTTPS event posts into the event gateway.",
    failure: "Client retries, duplicate events, offline buffering, missing clocks, malformed payloads.",
    interview: "Call out that devices are noisy producers and that heartbeat events become the watch-time source of truth.",
    deepDive: "event-taxonomy" as DataEngineeringTabSlug,
  },
  {
    id: "event-gateway",
    label: "Event Gateway",
    color: "#f59e0b",
    reveal: "base",
    x: 22,
    y: 34,
    what: "Stateless event collection service behind API Gateway or Kong.",
    why: "Adds ingestion time, validates schema, authenticates producers, tags privacy class, and normalizes envelopes.",
    input: "Client event batches, auth context, device headers.",
    output: "Validated Avro or Protobuf records to Kafka domain topics.",
    failure: "Schema rejection spikes, auth failures, queueing under launch traffic.",
    interview: "Say this is where you stop bad contracts before they poison every downstream consumer.",
    deepDive: "ingestion-layer" as DataEngineeringTabSlug,
  },
  {
    id: "kafka",
    label: "Kafka / MSK",
    color: "#f59e0b",
    reveal: "base",
    x: 38,
    y: 34,
    what: "Durable, replayable event buffer between producers and all stream and batch consumers.",
    why: "Decouples ingest from Flink, lake ingestion, fraud detection, QoE, and feature generation.",
    input: "Client events, CDC events, CDN logs, service logs.",
    output: "Flink jobs, lake ingestion jobs, alerting jobs, replay workflows.",
    failure: "Hot partitions, consumer lag, schema breakage, broker or AZ failure.",
    interview: "Do not say ‘Kafka needs 300 partitions’ without deriving it from DAU, event/sec, and safe throughput.",
    deepDive: "kafka-topic-design" as DataEngineeringTabSlug,
  },
  {
    id: "flink",
    label: "Flink Streaming",
    color: "#38bdf8",
    reveal: "base",
    x: 54,
    y: 34,
    what: "Stateful streaming jobs for watch-time aggregation, sessionization, trending, QoE, fraud, and online features.",
    why: "Streaming makes operational dashboards and near-real-time features possible at Netflix scale.",
    input: "Kafka domain topics keyed by session, user, content, or profile depending the job.",
    output: "Session updates, quality alerts, Redis features, Pinot/Druid feeds, Silver lake writes.",
    failure: "Checkpoint failures, backpressure, state blowup, watermark mistakes, sink retries.",
    interview: "Say streaming gives speed, but batch still owns final correctness for critical business numbers.",
    deepDive: "streaming-pipeline" as DataEngineeringTabSlug,
  },
  {
    id: "bronze",
    label: "Bronze Lake",
    color: "#8b5cf6",
    reveal: "base",
    x: 70,
    y: 34,
    what: "Immutable raw landing zone for events, logs, and CDC in S3.",
    why: "Preserves raw truth for replay, audit, backfill, and bug recovery.",
    input: "Kafka-to-lake ingestion, landed partner files, DMS outputs, raw logs.",
    output: "Spark cleanup jobs, correction workflows, raw audit access.",
    failure: "Small-file sprawl, incomplete partitions, missing source metadata.",
    interview: "Say Bronze is append-only and never the place where business logic should mutate the source truth.",
    deepDive: "lakehouse-design" as DataEngineeringTabSlug,
  },
  {
    id: "silver",
    label: "Silver Iceberg",
    color: "#8b5cf6",
    reveal: "medallion",
    x: 86,
    y: 34,
    what: "Cleaned, deduplicated, schema-valid, PII-safe fact and dimension tables.",
    why: "This is the trustworthy intermediate layer every downstream consumer should build from.",
    input: "Bronze events, CDC updates, enrichment joins, DQ checks.",
    output: "fact_watch_session, fact_search_event, dimension tables, feature seeds.",
    failure: "Bad dedupe logic, broken joins, incorrect timestamp normalization.",
    interview: "Silver is where you create trusted reusable data assets, not ad hoc business aggregates.",
    deepDive: "table-design" as DataEngineeringTabSlug,
  },
  {
    id: "gold",
    label: "Gold Metrics",
    color: "#fbbf24",
    reveal: "medallion",
    x: 86,
    y: 56,
    what: "Official business metrics, mart tables, and curated feature outputs.",
    why: "Business, finance, experimentation, and product teams need stable definitions, not ad hoc SQL logic.",
    input: "Silver facts and dimensions, batch aggregations, DQ validations.",
    output: "rpt_content_daily_metrics, cohort retention, revenue rollups, curated features.",
    failure: "Metric definition drift, stale partitions, incorrect backfill rollout.",
    interview: "Gold is where batch-backed correctness matters most and where official reporting definitions should live.",
    deepDive: "batch-pipeline" as DataEngineeringTabSlug,
  },
  {
    id: "feature-store",
    label: "Feature Store",
    color: "#a855f7",
    reveal: "features",
    x: 70,
    y: 56,
    what: "Split online and offline features for recommender, churn, and ranking workloads.",
    why: "Models need low-latency online features and point-in-time-correct offline training features.",
    input: "Streaming signals, Silver/Gold historical data, entity keys, labels.",
    output: "Redis/DynamoDB online features and S3/Iceberg offline feature tables.",
    failure: "Feature skew, late updates, training-serving mismatch.",
    interview: "Point-in-time correctness is the phrase to say out loud; wrong-time joins poison the whole model.",
    deepDive: "feature-store-ml-data" as DataEngineeringTabSlug,
  },
  {
    id: "quality",
    label: "Quality + Observability",
    color: "#ef4444",
    reveal: "quality",
    x: 54,
    y: 56,
    what: "Freshness, row counts, duplicate checks, SLA tracking, lineage, and anomaly dashboards.",
    why: "Otherwise data loss becomes invisible until a business dashboard is already wrong.",
    input: "Pipeline metrics, DQ tests, Gold reconciliation, DLQ volume, late event spikes.",
    output: "Alerts, dashboards, incidents, audit tables, corrective workflows.",
    failure: "Silent drift, alert fatigue, missing ownership, unactionable DLQ growth.",
    interview: "A senior answer says DQ is a production system with owners, severity levels, and investigation paths.",
    deepDive: "data-quality" as DataEngineeringTabSlug,
  },
  {
    id: "governance",
    label: "Governance + Security",
    color: "#22c55e",
    reveal: "governance",
    x: 38,
    y: 56,
    what: "PII classification, tokenization, access policies, retention, delete workflows, and lineage.",
    why: "Watch history, search history, and billing data are sensitive and must be controlled end to end.",
    input: "Data contracts, field classifications, IAM roles, catalog metadata.",
    output: "Governed tables, approved access paths, audit logs, delete propagation.",
    failure: "Overbroad access, missing delete propagation, no data owner for sensitive tables.",
    interview: "Talk about direct PII, pseudonymous IDs, sensitive behavioral data, and policy enforcement by layer.",
    deepDive: "governance-security" as DataEngineeringTabSlug,
  },
  {
    id: "replay",
    label: "Replay + Backfill",
    color: "#ef4444",
    reveal: "replay",
    x: 22,
    y: 56,
    what: "Controlled correction path for DLQ, late events, bugs, and metric redefinitions.",
    why: "At Netflix scale, bugs and delayed data are guaranteed; the platform must recover cleanly.",
    input: "Quarantine records, late_events topic, corrected code, backfill date ranges.",
    output: "Replay topic, Spark correction job, Iceberg merge, audit records, rollback snapshots.",
    failure: "Double counting, destructive rewrites, opaque incident handling.",
    interview: "Say DLQ without replay tooling is just a hidden data-loss pile.",
    deepDive: "reliability-backfill" as DataEngineeringTabSlug,
  },
  {
    id: "bi-ml",
    label: "BI + ML Consumers",
    color: "#fbbf24",
    reveal: "base",
    x: 94,
    y: 78,
    what: "Dashboards, ad hoc SQL, experimentation, and ML systems consume the curated outputs.",
    why: "The platform matters because it powers decisions, reporting, and user-facing intelligence.",
    input: "Gold tables, feature store, OLAP feeds, warehouse marts.",
    output: "Business dashboards, finance reports, ML training sets, online model serving.",
    failure: "Stale dashboards, training-serving skew, expensive scans, metric disagreements.",
    interview: "End by tying every design decision back to a real consumer and its SLA.",
    deepDive: "serving-layer" as DataEngineeringTabSlug,
  },
] as const;

export const INGESTION_LANES = [
  {
    id: "client-events",
    title: "Client Events",
    color: "#38bdf8",
    flow: ["Mobile / Web / TV", "Event Gateway", "Schema validation", "Kafka playback/browse/search topics"],
    details: [
      "Clients batch events every few seconds instead of sending a network request for every click or heartbeat.",
      "The gateway validates schema, authenticates source, adds ingestion_time, app/device/region metadata, and privacy tags.",
      "High-volume events like video.heartbeat and browse.title_impression need separate topic design from low-volume auth or billing events.",
    ],
  },
  {
    id: "cdc",
    title: "CDC",
    color: "#22c55e",
    flow: ["Postgres / MySQL / DynamoDB", "Debezium / DMS", "Kafka CDC topics or S3 landing", "Dimension merges / finance pipelines"],
    details: [
      "User profile changes, subscription plan changes, billing records, and content catalog updates should be captured without hammering production OLTP systems.",
      "A strong CDC answer includes before, after, op type, timestamp, and source metadata so downstream merges are safe and auditable.",
      "CDC tables typically feed dimensions, SCD2 history, finance marts, and user feature timelines.",
    ],
  },
  {
    id: "external-batch",
    title: "Batch / External",
    color: "#fbbf24",
    flow: ["SFTP / partners / logs", "S3 Bronze landing", "Glue / Spark normalization", "Curated lake tables"],
    details: [
      "Partner metadata, licensing feeds, app store reviews, campaign files, and historical log dumps usually land as batch assets.",
      "Landing jobs should separate raw partner files from normalized curated outputs so replay and auditing stay possible.",
      "Do not force every dataset through streaming when its freshness and correctness profile clearly fits batch better.",
    ],
  },
] as const;

export const KAFKA_TOPICS = [
  {
    id: "playback-heartbeat",
    name: "playback.heartbeat.raw",
    partitions: "200-300",
    retention: "7 days",
    key: "user_id / profile_id / session_id",
    format: "Avro or Protobuf + Schema Registry",
    producer: "Event Gateway",
    consumers: ["Flink sessionizer", "Watch-time aggregator", "QoE monitor", "Lake ingestion"],
    risk: "High volume, duplicate retries, hot regions during major launches",
  },
  {
    id: "browse-impression",
    name: "browse.impression.raw",
    partitions: "120-150",
    retention: "7 days",
    key: "profile_id",
    format: "Avro",
    producer: "Browse clients",
    consumers: ["CTR analytics", "Trending detector", "Lake ingestion"],
    risk: "Homepage launches create traffic bursts and skew by market",
  },
  {
    id: "video-quality",
    name: "video.quality.raw",
    partitions: "80-100",
    retention: "7 days",
    key: "session_id",
    format: "Avro",
    producer: "Playback clients and QoE probes",
    consumers: ["Flink QoE monitor", "Operational dashboards"],
    risk: "Volume spikes during network incidents; bad device firmware can flood topics",
  },
  {
    id: "search-query",
    name: "search.query.raw",
    partitions: "40",
    retention: "7 days",
    key: "profile_id",
    format: "Avro",
    producer: "Search clients",
    consumers: ["FACT_SEARCH_EVENT", "Intent features", "Product analytics"],
    risk: "High-cardinality query payloads; need privacy-safe storage",
  },
  {
    id: "recommendation-served",
    name: "recommendation.served.raw",
    partitions: "80",
    retention: "7 days",
    key: "profile_id",
    format: "Avro",
    producer: "Recommendation gateway",
    consumers: ["Recommendation diagnostics", "Feature store lineage", "Impression marts"],
    risk: "Model version drift and missing attribution fields",
  },
  {
    id: "billing-events",
    name: "billing.events.raw",
    partitions: "20",
    retention: "14 days",
    key: "user_id",
    format: "Avro",
    producer: "Billing services / CDC bridge",
    consumers: ["Finance marts", "Retention analytics", "Fraud monitor"],
    risk: "Exactly-once expectations are higher because of financial downstream consumers",
  },
  {
    id: "cdc-users",
    name: "cdc.users.raw",
    partitions: "20",
    retention: "14 days",
    key: "user_id",
    format: "Debezium envelope",
    producer: "Debezium / DMS",
    consumers: ["DIM_USER merge", "Feature timelines", "Audits"],
    risk: "Out-of-order updates and schema changes from source databases",
  },
  {
    id: "dlq-playback",
    name: "dlq.playback.schema_invalid",
    partitions: "6",
    retention: "30 days",
    key: "error_code",
    format: "JSON with raw payload",
    producer: "Event gateway / Flink validation path",
    consumers: ["DLQ dashboards", "Replay tooling", "Data platform on-call"],
    risk: "Without owners and replay tooling this becomes hidden data loss",
  },
  {
    id: "replay-playback",
    name: "replay.playback.events",
    partitions: "20",
    retention: "7 days",
    key: "event_id",
    format: "Corrected event payload",
    producer: "Replay service",
    consumers: ["Flink correction path", "Spark merge jobs"],
    risk: "Must be idempotent or you will double-count corrected data",
  },
] as const;

export const FLINK_JOBS = [
  {
    id: "playback-sessionizer",
    title: "Playback Sessionizer",
    color: "#38bdf8",
    inputTopics: ["playback.heartbeat.raw", "video.buffer.*", "video.pause", "video.seek"],
    keyBy: "user_id + profile_id + content_id + device_id",
    state: "active session, seen event_ids, watched_segments, pause_count, buffering_seconds",
    window: "Session windows with inactivity timeout",
    watermark: "10 minutes",
    output: "silver.fact_watch_session updates",
    sla: "Seconds to minutes",
    failure: "Backpressure or state blowup causes lag; checkpoint failures require restart from durable state.",
    flow: ["heartbeat", "dedupe", "state update", "session close rule", "emit session update"],
  },
  {
    id: "watchtime-aggregator",
    title: "Watch-Time Aggregator",
    color: "#38bdf8",
    inputTopics: ["playback.heartbeat.raw"],
    keyBy: "session_id",
    state: "watch_seconds, unique_segments, avg_bitrate, buffering_ratio",
    window: "Tumbling 1-minute updates + session finalization",
    watermark: "10 minutes",
    output: "Realtime watch metrics, Gold-ready aggregates, resume state",
    sla: "Seconds",
    failure: "Duplicate heartbeats or wrong validity rules inflate watch metrics.",
    flow: ["valid heartbeat", "count watch seconds", "update coverage", "publish live counters"],
  },
  {
    id: "trending-detector",
    title: "Trending Content Detector",
    color: "#f59e0b",
    inputTopics: ["browse.impression.raw", "browse.title_click", "playback.start"],
    keyBy: "content_id + region",
    state: "rolling counts, CTR, play velocity",
    window: "Sliding 15-minute window, slide every 1 minute",
    watermark: "5 minutes",
    output: "Redis sorted sets / Pinot trending feeds",
    sla: "1-5 minutes",
    failure: "Traffic bursts or skew around blockbuster launches can overload hot keys.",
    flow: ["impression", "click", "play", "velocity score", "top-N publish"],
  },
  {
    id: "qoe-monitor",
    title: "Playback Quality Monitor",
    color: "#ef4444",
    inputTopics: ["video.buffer.start", "video.buffer.end", "video.quality.raw", "cdn.edge.log"],
    keyBy: "session_id or device/region bucket",
    state: "buffering events, quality changes, bitrate trend",
    window: "Rolling QoE windows",
    watermark: "5 minutes",
    output: "Alert topic, Pinot/Druid operational dashboards",
    sla: "Seconds to minutes",
    failure: "Too much low-value alerting if thresholds are not owned and tuned.",
    flow: ["QoE event", "aggregate quality signals", "threshold breach", "alert"],
  },
  {
    id: "fraud-anomaly",
    title: "Fraud / Anomaly Detector",
    color: "#ef4444",
    inputTopics: ["auth.login", "billing.events.raw", "service.error"],
    keyBy: "user_id or fraud pattern key",
    state: "login country sequence, payment attempts, risk counters",
    window: "CEP patterns over minutes to hours",
    watermark: "10 minutes",
    output: "fraud_alerts topic, on-call alerts",
    sla: "Seconds to 1 minute",
    failure: "Pattern rules drift and false positives if rule distribution is unmanaged.",
    flow: ["auth/billing signal", "pattern evaluation", "risk threshold", "alert topic"],
  },
  {
    id: "realtime-features",
    title: "Real-Time Feature Generator",
    color: "#a855f7",
    inputTopics: ["playback.heartbeat.raw", "search.query.raw", "recommendation.clicked"],
    keyBy: "user_id / profile_id",
    state: "recently watched, session context, popularity counters",
    window: "Continuous state updates",
    watermark: "5-10 minutes",
    output: "Redis/DynamoDB online features",
    sla: "Seconds",
    failure: "Training-serving skew if online feature definitions diverge from offline feature tables.",
    flow: ["user action", "feature update", "entity-key write", "online serving"],
  },
] as const;

export const WATCH_TIME_TIMELINE = [
  { time: "10:00:00", event: "play", status: "neutral" },
  { time: "10:00:30", event: "heartbeat", status: "counted" },
  { time: "10:01:00", event: "heartbeat", status: "counted" },
  { time: "10:01:30", event: "pause", status: "ignored" },
  { time: "10:45:00", event: "resume", status: "neutral" },
  { time: "10:45:30", event: "heartbeat", status: "counted" },
  { time: "10:46:00", event: "heartbeat", status: "counted" },
] as const;

export const WATCH_TIME_DEFINITIONS = [
  {
    id: "engagement",
    label: "Engagement Watch Time",
    description: "Counts actual playing time only. Paused and buffering intervals are tracked separately.",
  },
  {
    id: "session-time",
    label: "Session Time",
    description: "Counts the total time the user spent inside the playback session, including pauses and buffering if the business needs it.",
  },
  {
    id: "unique-coverage",
    label: "Unique Coverage",
    description: "Counts unique content segments watched so completion % is not inflated by rewatches or seeking backward.",
  },
] as const;

export const WATCH_TIME_RULES = [
  "Count heartbeat_interval_sec only when is_playing = true, is_paused = false, and the event is valid and non-duplicate.",
  "Track total_watch_seconds, buffering_seconds, session_seconds, and unique_content_seconds_watched as separate metrics.",
  "Use unique_content_seconds_watched / content_duration_seconds for completion_pct, not total_watch_seconds.",
  "If buffering should count for a UX metric, store it separately instead of contaminating engagement watch time.",
] as const;

export const SESSIONIZATION_SCENARIOS = [
  {
    id: "normal",
    title: "Normal playback",
    summary: "User watches normally and stops. The session closes on stop/complete.",
    rawEvents: ["play", "heartbeat", "heartbeat", "heartbeat", "stop"],
    output: "One playback session with clean start/end, watch seconds, and QoE counters.",
    rules: ["Key by user/profile/content/device", "Close on video.stop or video.complete"],
  },
  {
    id: "long-pause",
    title: "User pauses for 2 hours",
    summary: "Pause should not count as watch time and may still belong to the same viewing journey.",
    rawEvents: ["play", "heartbeat", "pause", "2h gap", "resume", "heartbeat", "stop"],
    output: "Two playback sessions can still roll up into one viewing journey if within continuation threshold.",
    rules: ["30 min inactivity timeout closes active session", "4h pause continuation can still be same logical journey"],
  },
  {
    id: "app-crash",
    title: "App crashes",
    summary: "Pause or stop never arrives, so heartbeat and inactivity rules must protect the session boundary.",
    rawEvents: ["play", "heartbeat", "heartbeat", "app.crash", "no more events"],
    output: "Session auto-closes after inactivity timeout with partial but trusted watch metrics.",
    rules: ["Do not rely on stop/pause existing", "Use last_event_time and inactivity timeout"],
  },
  {
    id: "offline-sync",
    title: "Offline device syncs later",
    summary: "Events arrive late and can patch previous sessions or journey state.",
    rawEvents: ["play", "offline heartbeats", "late sync upload"],
    output: "Streaming handles what it can; correction jobs patch trusted Silver and Gold outputs later.",
    rules: ["Event time over processing time", "Late but allowed updates previous state"],
  },
  {
    id: "duplicates",
    title: "Duplicate events",
    summary: "Client retries send the same event multiple times.",
    rawEvents: ["heartbeat evt_1", "heartbeat evt_1 retry", "heartbeat evt_2"],
    output: "Dedup keeps only one copy of evt_1 so watch time stays correct.",
    rules: ["Primary dedupe key = event_id", "Fallback composite key if event_id is unreliable"],
  },
  {
    id: "device-switch",
    title: "User switches device",
    summary: "A journey may span devices even if playback sessions do not.",
    rawEvents: ["TV session", "resume on mobile", "heartbeats on new device"],
    output: "Separate playback sessions linked by a longer viewing-journey model.",
    rules: ["Session key includes device_id", "Journey grouping threshold can be 24h"],
  },
] as const;

export const LATE_EVENT_POLICY = {
  watermarkMinutes: 10,
  allowedLatenessHours: 24,
  veryLateLabel: "More than 24 hours late",
  replayWarning: "DLQ is not data loss storage. It needs owner, SLA, dashboard, replay tooling, and audit.",
  interviewAnswer:
    "I will not drop late events silently. On-time events are processed by Flink with event-time watermarks. Events that are slightly late update previous windows. Very late events go to a side output or late-events topic. A Spark correction job later patches Silver and recomputes Gold partitions using Iceberg MERGE or partition overwrite. This gives both low latency and eventual correctness.",
};

export const REPLAY_FLOW = [
  "DLQ / quarantine catches malformed, schema-invalid, too-late, or business-rule-failed records",
  "Engineer fixes mapping, schema, or transformation logic",
  "Replay service marks selected records replayable and republishes to replay.playback.events",
  "Streaming and batch pipelines consume replay idempotently",
  "Silver and Gold tables are corrected using MERGE / partition overwrite",
  "Audit records capture what was replayed, why, by whom, and what changed",
] as const;

export const LAKEHOUSE_LAYERS = [
  {
    id: "bronze",
    title: "Bronze",
    color: "#8b5cf6",
    summary: "Raw, immutable, append-only landing zone.",
    inputs: ["Raw JSON / Avro events", "CDC envelopes", "Partner files", "CDN / service logs"],
    rules: [
      "Do not mutate source truth",
      "Partition by ingestion date / hour",
      "Hot retention for replay, cold retention for long-term audit",
      "Restricted raw access because payloads may still carry sensitive fields",
    ],
  },
  {
    id: "silver",
    title: "Silver",
    color: "#8b5cf6",
    summary: "Cleaned, deduplicated, schema-enforced, PII-safe trusted data.",
    inputs: ["Bronze events", "Dimension joins", "Normalization logic", "DQ checks"],
    rules: [
      "Deduplicate by event_id",
      "Validate required fields and normalize timestamps",
      "Tokenize or hash identifiers where needed",
      "Store as Parquet / Iceberg with event_date partitioning",
    ],
  },
  {
    id: "gold",
    title: "Gold",
    color: "#fbbf24",
    summary: "Business-ready metrics, official reporting tables, and curated features.",
    inputs: ["Silver facts", "Dimension tables", "Batch aggregations", "Reconciliation checks"],
    rules: [
      "Use official business definitions",
      "Publish backfillable daily or hourly marts",
      "Run DQ and reconciliation before marking official",
      "Keep mart ownership explicit to avoid analyst-only metric drift",
    ],
  },
] as const;

export const TABLE_SCHEMAS = [
  {
    name: "fact_watch_session",
    group: "Fact",
    grain: "One row per user-profile-content-device-session",
    partition: "event_date",
    bucket: "user_id or content_id depending workload",
    useCase: "Official watch-time, completion, binge, QoE, and recommendation features.",
    exampleQuery: `SELECT content_id, SUM(total_watch_seconds) / 3600 AS watch_hours
FROM gold.rpt_content_daily_metrics
WHERE event_date = DATE '2026-06-21'
GROUP BY 1
ORDER BY 2 DESC;`,
    followUp: "Why is completion_pct based on unique content coverage instead of total watch seconds?",
    columns: [
      { name: "watch_session_id", type: "VARCHAR(64)", definition: "Surrogate session key for the trusted playback session grain." },
      { name: "user_id", type: "BIGINT", definition: "User business key, often tokenized or restricted depending access policy." },
      { name: "profile_id", type: "BIGINT", definition: "Sub-profile key needed for accurate household viewing analysis." },
      { name: "content_id", type: "BIGINT", definition: "Content business key for joins to DIM_CONTENT." },
      { name: "device_id_hash", type: "VARCHAR(64)", definition: "Hashed device identifier to preserve diagnostics without raw PII." },
      { name: "session_start_ts", type: "TIMESTAMP", definition: "Start of session in UTC event time." },
      { name: "session_end_ts", type: "TIMESTAMP", definition: "End of session in UTC event time or null if still active." },
      { name: "total_watch_seconds", type: "INTEGER", definition: "Heartbeat-based playing time accumulated across valid intervals." },
      { name: "unique_content_seconds_watched", type: "INTEGER", definition: "Coverage of unique watched segments, used for completion metrics." },
      { name: "completion_pct", type: "DECIMAL(5,2)", definition: "unique_content_seconds_watched / content_duration_seconds * 100", formula: "unique_content_seconds_watched / content_duration_seconds * 100" },
      { name: "pause_count", type: "INTEGER", definition: "Count of pause events in the session." },
      { name: "seek_count", type: "INTEGER", definition: "Count of seek events in the session." },
      { name: "buffering_seconds", type: "INTEGER", definition: "Separate buffering duration to keep engagement watch time clean." },
      { name: "avg_bitrate_kbps", type: "INTEGER", definition: "Average playback bitrate over valid playback intervals." },
      { name: "country_code", type: "CHAR(2)", definition: "ISO region for geography-sensitive reporting and localization." },
      { name: "device_type", type: "VARCHAR(20)", definition: "smart_tv / mobile / web / tablet / console bucket." },
      { name: "app_version", type: "VARCHAR(20)", definition: "Client app version to correlate with QoE issues or rollout regressions." },
      { name: "event_date", type: "DATE", definition: "Primary partition key for pruning, backfill, and warehouse workloads." },
    ],
  },
  {
    name: "fact_content_impression",
    group: "Fact",
    grain: "One row per shown content tile impression",
    partition: "event_date",
    bucket: "profile_id",
    useCase: "Browse CTR, shelf optimization, recommendation attribution, and artwork tests.",
    exampleQuery: `SELECT row_id, COUNT(*) AS impressions, SUM(CASE WHEN was_clicked THEN 1 ELSE 0 END) AS clicks
FROM silver.fact_content_impression
WHERE event_date = DATE '2026-06-21'
GROUP BY 1;`,
    followUp: "How do you connect impression facts to later playback without misattribution?",
    columns: [
      { name: "impression_id", type: "VARCHAR(64)", definition: "Surrogate impression identifier." },
      { name: "content_id", type: "BIGINT", definition: "Content shown to the user." },
      { name: "row_id", type: "VARCHAR(100)", definition: "Which homepage row or shelf displayed the content." },
      { name: "position_in_row", type: "SMALLINT", definition: "Card position in the UI row." },
      { name: "algorithm_id", type: "VARCHAR(50)", definition: "Recommendation or merchandising algorithm version." },
      { name: "was_clicked", type: "BOOLEAN", definition: "Whether the impression converted to a click." },
    ],
  },
  {
    name: "fact_search_event",
    group: "Fact",
    grain: "One row per search query",
    partition: "event_date",
    bucket: "user_id",
    useCase: "Search quality, intent features, no-result analysis, and latency monitoring.",
    exampleQuery: `SELECT AVG(time_to_result_ms) AS avg_latency_ms
FROM silver.fact_search_event
WHERE event_date >= CURRENT_DATE - INTERVAL '7 days';`,
    followUp: "How do you protect sensitive query text while keeping it useful for analytics?",
    columns: [
      { name: "search_id", type: "VARCHAR(64)", definition: "Surrogate key for the search event." },
      { name: "query_text_hash", type: "VARCHAR(64)", definition: "Privacy-safe hash of raw query text when plain text storage is restricted." },
      { name: "results_count", type: "INTEGER", definition: "How many results the search returned." },
      { name: "result_clicked_rank", type: "SMALLINT", definition: "Rank of clicked result for CTR by rank analysis." },
      { name: "time_to_result_ms", type: "INTEGER", definition: "Latency metric for search experience diagnostics." },
    ],
  },
  {
    name: "dim_user",
    group: "Dimension",
    grain: "One row per user account, often SCD2",
    partition: "Not usually partitioned heavily",
    bucket: "user_id",
    useCase: "Profile, plan, geography, and lifecycle context for facts and feature tables.",
    exampleQuery: `SELECT subscription_plan, COUNT(*) FROM silver.dim_user WHERE is_current = true GROUP BY 1;`,
    followUp: "Which user fields would you store as SCD2 and why?",
    columns: [
      { name: "user_sk", type: "BIGINT", definition: "Warehouse surrogate key." },
      { name: "user_id", type: "BIGINT", definition: "Natural business key." },
      { name: "email_hash", type: "VARCHAR(64)", definition: "Hashed email instead of raw direct PII." },
      { name: "subscription_plan", type: "VARCHAR(20)", definition: "Plan tier and a common SCD2 field." },
      { name: "country_code", type: "CHAR(2)", definition: "Registration or billing country." },
      { name: "is_current", type: "BOOLEAN", definition: "SCD2 current-record flag." },
    ],
  },
  {
    name: "dim_content",
    group: "Dimension",
    grain: "One row per content title or episode",
    partition: "Not usually partitioned heavily",
    bucket: "content_id",
    useCase: "Catalog, genre, language, licensing, and content metadata joins.",
    exampleQuery: `SELECT primary_genre, AVG(duration_seconds) FROM silver.dim_content GROUP BY 1;`,
    followUp: "How do you model episodes vs parent series cleanly for binge analytics?",
    columns: [
      { name: "content_id", type: "BIGINT", definition: "Natural content key." },
      { name: "parent_content_id", type: "BIGINT", definition: "Links episodes to the parent series when applicable." },
      { name: "content_type", type: "VARCHAR(20)", definition: "movie / series / episode / special / short." },
      { name: "primary_genre", type: "VARCHAR(50)", definition: "Primary genre for common reporting needs." },
      { name: "duration_seconds", type: "INTEGER", definition: "Required for completion and coverage calculations." },
    ],
  },
  {
    name: "dim_device",
    group: "Dimension",
    grain: "One row per device type/model bucket",
    partition: "Not typically partitioned",
    bucket: "device_category",
    useCase: "QoE, rollout diagnostics, screen-size effects, and device support analysis.",
    exampleQuery: `SELECT device_category, AVG(supports_4k::int) FROM silver.dim_device GROUP BY 1;`,
    followUp: "How do you keep device cardinality sane while preserving diagnostic value?",
    columns: [
      { name: "device_category", type: "VARCHAR(20)", definition: "smart_tv / mobile / web / tablet / console grouping." },
      { name: "device_brand", type: "VARCHAR(50)", definition: "Brand dimension for hardware analysis." },
      { name: "os_family", type: "VARCHAR(20)", definition: "OS bucket such as tvOS, Android TV, webOS, iOS." },
      { name: "supports_4k", type: "BOOLEAN", definition: "Capability flag for quality segmentation." },
    ],
  },
  {
    name: "dim_date",
    group: "Dimension",
    grain: "One row per calendar date",
    partition: "Pre-generated date dimension",
    bucket: "n/a",
    useCase: "Fiscal, weekly, holiday, and reporting calendar joins.",
    exampleQuery: `SELECT fiscal_quarter, COUNT(*) FROM silver.dim_date GROUP BY 1;`,
    followUp: "Why do mature warehouses still keep a date dimension instead of deriving date parts ad hoc?",
    columns: [
      { name: "date_id", type: "INTEGER", definition: "YYYYMMDD integer surrogate." },
      { name: "full_date", type: "DATE", definition: "Full calendar date." },
      { name: "week_of_year", type: "SMALLINT", definition: "ISO week number." },
      { name: "fiscal_quarter", type: "SMALLINT", definition: "Fiscal reporting quarter." },
    ],
  },
  {
    name: "rpt_content_daily_metrics",
    group: "Gold Mart",
    grain: "One row per content, region, day",
    partition: "event_date",
    bucket: "content_id",
    useCase: "Official daily watch hours, starts, finishes, completion, and popularity for business reporting.",
    exampleQuery: `SELECT event_date, content_id, watch_hours
FROM gold.rpt_content_daily_metrics
WHERE content_id = 501
ORDER BY event_date DESC;`,
    followUp: "Why should this table be owned by business definitions instead of ad hoc analyst SQL?",
    columns: [
      { name: "watch_hours", type: "DECIMAL(18,2)", definition: "Total content watch hours for the day." },
      { name: "start_count", type: "BIGINT", definition: "How many users started playback." },
      { name: "finish_count", type: "BIGINT", definition: "How many users completed playback." },
      { name: "completion_rate", type: "DECIMAL(5,2)", definition: "finish_count / start_count * 100" },
    ],
  },
  {
    name: "rpt_user_cohort_retention",
    group: "Gold Mart",
    grain: "One row per cohort, region, interval",
    partition: "cohort_date",
    bucket: "cohort_id",
    useCase: "Retention, churn, and lifecycle reporting.",
    exampleQuery: `SELECT cohort_date, day_30_retention FROM gold.rpt_user_cohort_retention ORDER BY cohort_date DESC;`,
    followUp: "How do you keep cohort tables reproducible when backfilling historical identity changes?",
    columns: [
      { name: "cohort_date", type: "DATE", definition: "Date a cohort begins." },
      { name: "cohort_size", type: "BIGINT", definition: "Initial size of the cohort." },
      { name: "day_30_retention", type: "DECIMAL(5,2)", definition: "Percent retained after 30 days." },
    ],
  },
  {
    name: "feature_user_genre_affinity",
    group: "Feature",
    grain: "One row per user/profile and feature timestamp",
    partition: "feature_date",
    bucket: "user_id",
    useCase: "Offline training and online feature alignment for personalization.",
    exampleQuery: `SELECT genre, affinity_score FROM ml.feature_user_genre_affinity WHERE user_id = 101;`,
    followUp: "How do you guarantee point-in-time correctness for this feature table?",
    columns: [
      { name: "user_id", type: "BIGINT", definition: "Feature entity key." },
      { name: "genre", type: "VARCHAR(50)", definition: "Genre feature bucket." },
      { name: "affinity_score", type: "DECIMAL(8,4)", definition: "Computed preference score for the user and genre." },
      { name: "feature_ts", type: "TIMESTAMP", definition: "Timestamp of the feature snapshot used for point-in-time joins." },
    ],
  },
  {
    name: "feature_content_popularity",
    group: "Feature",
    grain: "One row per content and feature timestamp",
    partition: "feature_date",
    bucket: "content_id",
    useCase: "Trending, popularity, and freshness-sensitive recommendation features.",
    exampleQuery: `SELECT content_id, popularity_score FROM ml.feature_content_popularity ORDER BY popularity_score DESC LIMIT 20;`,
    followUp: "Which parts of this feature belong online vs offline?",
    columns: [
      { name: "content_id", type: "BIGINT", definition: "Feature entity key." },
      { name: "popularity_score", type: "DECIMAL(8,4)", definition: "Nearline or batch-derived popularity signal." },
      { name: "feature_ts", type: "TIMESTAMP", definition: "Feature computation time." },
    ],
  },
  {
    name: "quarantine_events",
    group: "Ops",
    grain: "One row per quarantined bad record",
    partition: "ingestion_date",
    bucket: "error_code",
    useCase: "DLQ ownership, replay tooling, and incident investigation.",
    exampleQuery: `SELECT error_code, COUNT(*) FROM ops.quarantine_events WHERE ingestion_date = CURRENT_DATE GROUP BY 1;`,
    followUp: "Why is a quarantine table better than just logging an error and moving on?",
    columns: [
      { name: "original_topic", type: "VARCHAR(128)", definition: "Topic where the bad record came from." },
      { name: "raw_payload", type: "STRING", definition: "Original payload for debugging and replay." },
      { name: "error_code", type: "VARCHAR(64)", definition: "Structured error classification such as SCHEMA_MISSING_FIELD." },
      { name: "status", type: "VARCHAR(20)", definition: "open / replayable / resolved / ignored." },
    ],
  },
  {
    name: "backfill_audit",
    group: "Ops",
    grain: "One row per backfill run",
    partition: "started_at::date",
    bucket: "pipeline_name",
    useCase: "Track who requested backfills, what changed, and how to roll back safely.",
    exampleQuery: `SELECT pipeline_name, status, start_date, end_date FROM ops.backfill_audit ORDER BY started_at DESC;`,
    followUp: "What fields do you need here so a failed backfill is auditable and reversible?",
    columns: [
      { name: "backfill_run_id", type: "VARCHAR(64)", definition: "Unique identifier for the backfill run." },
      { name: "requested_by", type: "VARCHAR(128)", definition: "Who asked for the backfill." },
      { name: "tables_affected", type: "ARRAY<STRING>", definition: "Which tables or partitions were recomputed." },
      { name: "rollback_snapshot_id", type: "VARCHAR(128)", definition: "Iceberg snapshot or rollback target." },
    ],
  },
] as const;

export const BATCH_DAG_STEPS = [
  {
    id: "wait",
    label: "Wait for source partition",
    input: "Bronze partition readiness + upstream completion signals",
    logic: "Do not start downstream transformations on partial source data.",
    output: "Eligible batch run window",
  },
  {
    id: "bronze-completeness",
    label: "Validate Bronze completeness",
    input: "Bronze partitions",
    logic: "Check expected files, row counts, schema version mix, and source completeness.",
    output: "Bronze completeness status",
  },
  {
    id: "spark-silver",
    label: "Run Spark Silver job",
    input: "bronze.playback_events and supporting dimensions",
    logic: "Parse payload, validate required fields, dedupe event_id, normalize event_time, join content dimension, mask PII.",
    output: "silver.playback_events / fact tables",
  },
  {
    id: "dq",
    label: "Run DQ checks",
    input: "Silver outputs",
    logic: "Check duplicates, nulls, impossible timestamps, negative durations, and freshness SLA.",
    output: "DQ status + block or continue signal",
  },
  {
    id: "staging-snapshot",
    label: "Write staging Iceberg snapshot",
    input: "Validated Silver tables",
    logic: "Write versioned snapshot before publishing official tables.",
    output: "Versioned staging snapshot",
  },
  {
    id: "publish-silver",
    label: "Publish Silver",
    input: "Staging snapshot",
    logic: "Atomic swap or publish trusted cleaned tables.",
    output: "Trusted Silver tables",
  },
  {
    id: "gold",
    label: "Compute Gold metrics",
    input: "Trusted Silver facts and dimensions",
    logic: "Build official business aggregates, mart tables, and training-ready outputs.",
    output: "Gold metrics and marts",
  },
  {
    id: "refresh",
    label: "Refresh BI / warehouse",
    input: "Gold publish complete",
    logic: "Refresh external tables, materialized views, or warehouse marts.",
    output: "Updated dashboards and consumers",
  },
  {
    id: "lineage",
    label: "Update lineage + notify",
    input: "Successful publish metadata",
    logic: "Update catalog, lineage graph, audit tables, and stakeholder notifications.",
    output: "Visible operational state",
  },
] as const;

export const DQ_METRICS = [
  { label: "Freshness", value: "3m", color: "#38bdf8", note: "Minutes behind SLA for critical live metrics" },
  { label: "Duplicate rate", value: "0.03%", color: "#ef4444", note: "Spike means dedupe or producer retry issue" },
  { label: "Late event %", value: "1.8%", color: "#f59e0b", note: "Tracks watermark stress and correction demand" },
  { label: "DLQ count", value: "1.2K", color: "#ef4444", note: "Needs owner + replay plan, not silent storage" },
  { label: "SLA misses", value: "2", color: "#ef4444", note: "Critical failures page on-call and stakeholders" },
  { label: "Backfill status", value: "Running", color: "#8b5cf6", note: "Track blast radius and audit state" },
] as const;

export const DQ_SEVERITIES = [
  { level: "P0", color: "#ef4444", rule: "Gold table missing or official metric broken", action: "PagerDuty + incident commander" },
  { level: "P1", color: "#f97316", rule: "Watch hours dropped 40% or freshness breach", action: "Slack + PagerDuty" },
  { level: "P2", color: "#f59e0b", rule: "Null rate increased or late events spiked", action: "Slack + Jira" },
  { level: "P3", color: "#22c55e", rule: "Non-critical metadata missing", action: "Backlog / Jira only" },
] as const;

export const DQ_INVESTIGATION_PATH = [
  "Kafka lag",
  "Flink checkpoint health",
  "Bronze volume completeness",
  "Silver DQ results",
  "Gold aggregate publish",
] as const;

export const GOVERNANCE_FIELDS = [
  {
    name: "email",
    classification: "Direct PII",
    policy: [
      "Never expose raw email in analytics marts",
      "Hash or tokenize before warehouse storage",
      "Restrict raw access to a minimal approved set of services",
    ],
  },
  {
    name: "user_id / profile_id / device_id",
    classification: "Pseudonymous identifiers",
    policy: [
      "Treat as sensitive because they connect to watch and search history",
      "Limit raw joins, use tokenization where possible",
      "Audit access and keep role-based restrictions",
    ],
  },
  {
    name: "watch_history",
    classification: "Sensitive behavioral data",
    policy: [
      "Restrict raw access",
      "Aggregate in Gold where possible",
      "Apply retention and delete workflows end to end",
      "Audit every access path",
    ],
  },
  {
    name: "payment_method / billing_data",
    classification: "Highly sensitive",
    policy: [
      "Encrypt at rest and in transit",
      "Use strict row and column controls",
      "Route through finance-specific marts only",
    ],
  },
] as const;

export const GOVERNANCE_CHECKLIST = [
  "Encryption at rest and in transit",
  "RBAC plus row-level and column-level security",
  "Retention policies by data class and layer",
  "GDPR / right-to-delete propagation across lakehouse, warehouse, and feature stores",
  "Audit logs for data access and correction workflows",
  "Regional data residency where required",
] as const;

export const FEATURE_STORE_CONTENT = {
  offline: {
    title: "Offline Feature Store",
    color: "#8b5cf6",
    summary: "S3 + Iceberg feature tables used for reproducible training and backtesting.",
    bullets: [
      "Stores historical training features with point-in-time aligned snapshots",
      "Built from Silver and Gold history using Spark or dbt feature pipelines",
      "Feeds training datasets, feature evaluation, and experimentation analysis",
    ],
  },
  online: {
    title: "Online Feature Store",
    color: "#22c55e",
    summary: "Redis or DynamoDB for low-latency serving features.",
    bullets: [
      "Stores recently watched, session context, device-time context, and hot popularity counters",
      "Updated from streaming jobs for low-latency recommender calls",
      "Needs explicit freshness SLAs and entity-key consistency with offline features",
    ],
  },
  flow: [
    "Playback / search / impression events",
    "Flink real-time features",
    "Redis / DynamoDB online features",
    "Silver and Gold history",
    "Spark feature generation",
    "Offline feature store",
    "Training dataset",
  ],
  pointInTime:
    "Correct point-in-time logic means feature_time must be less than or equal to label_event_time. Do not join a Monday training row to a Friday-computed user feature.",
};

export const SERVING_MATRIX = [
  {
    workload: "BI dashboards",
    recommended: "Redshift / Snowflake",
    why: "Controlled schemas, finance and business workloads, materialized marts, and predictable dashboard concurrency.",
    notIdeal: "Pinot or Redis because they are optimized for different query patterns.",
  },
  {
    workload: "Ad-hoc SQL",
    recommended: "Athena / Trino",
    why: "Fast access to Iceberg and open-format data for analyst exploration without full warehouse ingestion.",
    notIdeal: "Redis or online feature stores because they are not analyst query engines.",
  },
  {
    workload: "Real-time trending dashboard",
    recommended: "Pinot / Druid or Redis sorted sets",
    why: "Low-latency aggregations over recent event windows.",
    notIdeal: "Warehouse-only refresh because latency may be too high for live ops needs.",
  },
  {
    workload: "Search and log exploration",
    recommended: "OpenSearch",
    why: "Good fit for full-text and operational log investigation.",
    notIdeal: "Warehouse fact tables for raw log troubleshooting.",
  },
  {
    workload: "Online recommendation features",
    recommended: "DynamoDB / Redis",
    why: "Millisecond lookups by entity key for serving-time personalization.",
    notIdeal: "S3 or Athena because latency is far too high.",
  },
  {
    workload: "Raw replayable truth",
    recommended: "S3 + Iceberg",
    why: "Durable, replay-safe, cheap, open, and backfillable.",
    notIdeal: "Kafka for long-term history because retention cost balloons quickly.",
  },
  {
    workload: "Operational metrics",
    recommended: "Grafana / Prometheus + OLAP feeds",
    why: "Real-time incident response and observability workloads differ from BI reporting.",
    notIdeal: "Static daily Gold tables alone because they lag too much.",
  },
] as const;

export const RELIABILITY_INCIDENTS = [
  {
    id: "gold-wrong-30-days",
    title: "Gold content metrics wrong for last 30 days",
    detection: "Daily reconciliation or business complaint shows a large metric drift.",
    impact: "Finance, content strategy, and dashboards are reporting the wrong official numbers.",
    mitigation: "Freeze downstream trust, identify affected date range, notify consumers, and stop further publish.",
    recovery: "Fix transformation code, run backfill DAG, recompute Silver and Gold partitions, validate deltas, publish audit report.",
    prevention: "Versioned metrics, stronger pre-publish DQ, explicit reconciliation gates, snapshot rollback path.",
    interview: "I would backfill from Bronze/Silver, publish via Iceberg snapshot, validate, and keep rollback ready.",
  },
  {
    id: "flink-failed",
    title: "Flink job failed",
    detection: "Checkpoint failures, lag growth, and stale live dashboards.",
    impact: "Live QoE and feature freshness degrade immediately.",
    mitigation: "Restart from durable state, inspect lag, and reroute on-call to the affected pipeline owners.",
    recovery: "Resume from checkpoint, replay missed topics if needed, compare stream and batch outputs.",
    prevention: "Checkpoint tuning, state TTL, backpressure monitoring, and source partition discipline.",
    interview: "Streaming resumes from checkpoint for speed, and batch reconciliation later restores final correctness.",
  },
  {
    id: "schema-release",
    title: "Bad schema release",
    detection: "DLQ spike, schema registry rejection, or sudden null growth in Silver tables.",
    impact: "Producer teams can poison downstream jobs if contracts are not enforced early.",
    mitigation: "Block incompatible producers, route bad payloads to quarantine, keep good traffic flowing.",
    recovery: "Fix contract, replay quarantined payloads through replay topic, audit correction.",
    prevention: "Schema registry compatibility, data contracts, producer CI checks, and additive-change discipline.",
    interview: "Bad schema releases should fail fast at the boundary rather than silently corrupt trusted layers.",
  },
  {
    id: "late-spike",
    title: "Late events spiked",
    detection: "Late event percentage jumps and Gold metrics diverge from stream views.",
    impact: "Streaming dashboards go stale or inaccurate until correction catches up.",
    mitigation: "Inspect producer delays, buffering clients, or regional transport issues.",
    recovery: "Accept late-but-allowed updates, route very late events to correction job, patch affected partitions.",
    prevention: "Watermark tuning, offline sync strategy, and separate operational late-event alerting.",
    interview: "Do not drop late events silently; route them by lateness class and correct trusted tables later.",
  },
] as const;

export const TRADEOFFS = [
  {
    decision: "Kafka vs Kinesis",
    optionA: "Kafka / MSK",
    optionB: "Kinesis",
    recommendation: "Kafka when you want rich ecosystem, strong replay patterns, and open-source portability.",
    why: "Netflix-like scale, topic design, consumer ecosystem, and replay tooling often fit Kafka well.",
    whenToChange: "Choose Kinesis when managed AWS integration and ops simplicity beat ecosystem flexibility.",
    tradeoffs: ["Kafka = more flexibility", "Kinesis = simpler managed path", "Both need careful partition/shard math"],
  },
  {
    decision: "Flink vs Spark Streaming",
    optionA: "Flink",
    optionB: "Spark Structured Streaming",
    recommendation: "Flink for complex low-latency event-time stateful logic like sessionization and watch-time.",
    why: "Event-time semantics, large keyed state, and low-latency updates are central to this design.",
    whenToChange: "Spark Structured Streaming is fine when the team already runs Spark heavily and latency is less demanding.",
    tradeoffs: ["Flink excels at stateful streaming", "Spark unifies stack and team skills", "Both still need strong lakehouse strategy"],
  },
  {
    decision: "Spark batch vs dbt",
    optionA: "Spark batch",
    optionB: "dbt",
    recommendation: "Use Spark for heavy cleansing and big transforms; use dbt for SQL-first Silver-to-Gold modeling where warehouse/lakehouse engines are strong.",
    why: "They solve different parts of the pipeline rather than being strict replacements.",
    whenToChange: "Lean harder on dbt when transformations are mostly declarative SQL and already in the warehouse/lakehouse engine.",
    tradeoffs: ["Spark handles scale and custom logic", "dbt improves lineage, tests, docs, and analyst collaboration"],
  },
  {
    decision: "Iceberg vs Delta vs Hudi",
    optionA: "Iceberg",
    optionB: "Delta / Hudi",
    recommendation: "Iceberg is a strong default here because of open multi-engine access, snapshots, deletes, and table evolution.",
    why: "The docs emphasize open-format lakehouse, snapshot rollback, and multi-engine readers.",
    whenToChange: "Choose Delta if Databricks is your center of gravity or Hudi if ingestion/update patterns fit it better operationally.",
    tradeoffs: ["Iceberg = open ecosystem", "Delta = tight Databricks integration", "Hudi = strong incremental ingestion patterns"],
  },
  {
    decision: "Redshift vs Athena / Trino",
    optionA: "Redshift / Snowflake",
    optionB: "Athena / Trino",
    recommendation: "Warehouse for curated BI and finance; Athena/Trino for open ad hoc lake queries.",
    why: "Different workload shapes deserve different serving layers.",
    whenToChange: "Shift more to open query engines if warehouse cost or ingestion overhead becomes the bigger pain.",
    tradeoffs: ["Warehouse = performance and governance", "Open query = flexibility and lake access"],
  },
  {
    decision: "Redis vs DynamoDB for online features",
    optionA: "Redis",
    optionB: "DynamoDB",
    recommendation: "Redis for ultra-hot counters and ephemeral features, DynamoDB for durable keyed feature serving.",
    why: "Serving path latency and durability needs vary by feature type.",
    whenToChange: "Use DynamoDB more when durability and scale operations matter more than the hottest latency path.",
    tradeoffs: ["Redis = very fast + cache-like", "DynamoDB = durable + managed scale"],
  },
  {
    decision: "Streaming correctness vs batch correction",
    optionA: "Streaming immediate outputs",
    optionB: "Batch-reconciled official truth",
    recommendation: "Use streaming for speed and batch for final correctness on critical business metrics.",
    why: "Late events, bugs, and replay are unavoidable at this scale.",
    whenToChange: "Some operational metrics can remain stream-owned if eventual exactness is less critical.",
    tradeoffs: ["Streaming = freshness", "Batch = correctness", "Together = trustworthy platform"],
  },
] as const;

export const INTERVIEW_QUESTIONS = [
  {
    id: "qa-late-events",
    tag: "Late Events",
    question: "How do you handle late-arriving events end to end?",
    strongAnswer: "Use event-time processing with watermarks. Slightly late events update existing windows or sessions. Very late events go to a late_events topic or table, and a Spark correction job recomputes affected sessions and Gold partitions idempotently using Iceberg MERGE or partition overwrite.",
    followUp: "What if the event is 2 days late?",
    badAnswer: "We ignore it because the window already closed.",
    linkedTab: "late-events-replay" as DataEngineeringTabSlug,
  },
  {
    id: "qa-watch-time",
    tag: "Watch Time",
    question: "Why not compute watch time from play and pause events only?",
    strongAnswer: "Play and pause are too lossy because apps crash, users go offline, pauses can last hours, devices retry, and events arrive late or out of order. Heartbeats are the better source of truth because they prove active playback at a specific time interval.",
    followUp: "How do you avoid double counting when users seek backward?",
    badAnswer: "Play minus pause is good enough.",
    linkedTab: "watch-time-calculation" as DataEngineeringTabSlug,
  },
  {
    id: "qa-sessionization",
    tag: "Sessionization",
    question: "How would you build playback sessions from raw events?",
    strongAnswer: "Key by user/profile/content/device, use event-time watermarks, keep active session state, deduplicate event_ids, and close sessions on stop, complete, or inactivity timeout. Then optionally link sessions into a longer viewing journey.",
    followUp: "What happens if the user pauses for 2 hours and resumes?",
    badAnswer: "We just group everything by user and day.",
    linkedTab: "sessionization" as DataEngineeringTabSlug,
  },
  {
    id: "qa-kafka",
    tag: "Kafka",
    question: "How do you decide Kafka partition count?",
    strongAnswer: "Derive it from peak events/sec, safe throughput per partition, and explicit headroom. For example, if peak is 2M events/sec and one partition safely handles 10K events/sec, start around 200 and add headroom to land around 260.",
    followUp: "Why not partition playback heartbeats by content_id?",
    badAnswer: "I usually just say 300 partitions because Netflix is large.",
    linkedTab: "kafka-topic-design" as DataEngineeringTabSlug,
  },
  {
    id: "qa-dq",
    tag: "DQ",
    question: "How do you detect and respond to data quality issues?",
    strongAnswer: "Run technical checks in Bronze, semantic checks in Silver, business checks in Gold, expose freshness/null/duplicate/late metrics in dashboards, classify severity, and route incidents with clear owners and replay/backfill procedures.",
    followUp: "Which issues block publish versus just alert?",
    badAnswer: "We rely on analysts to tell us when a dashboard looks wrong.",
    linkedTab: "data-quality" as DataEngineeringTabSlug,
  },
  {
    id: "qa-governance",
    tag: "Governance",
    question: "How do you handle GDPR deletes in a lakehouse?",
    strongAnswer: "Resolve identity, delete or anonymize serving-store records, apply row-level deletes in Iceberg, propagate to feature stores and downstream consumers, and capture the whole workflow in an audit trail.",
    followUp: "How do you prevent raw behavioral data from being too widely accessible?",
    badAnswer: "We can just delete rows from the final dashboard table.",
    linkedTab: "governance-security" as DataEngineeringTabSlug,
  },
  {
    id: "qa-backfill",
    tag: "Backfill",
    question: "What is your safe backfill strategy?",
    strongAnswer: "Make backfills idempotent, partition-aware, auditable, restartable, and snapshot-backed. Recompute only affected ranges, publish via Iceberg snapshots or atomic swaps, validate deltas, and keep rollback ready.",
    followUp: "How do you avoid double counting when rerunning mixed live partitions?",
    badAnswer: "We overwrite everything from scratch and hope it is fine.",
    linkedTab: "reliability-backfill" as DataEngineeringTabSlug,
  },
] as const;

export const MOCK_INTERVIEW_STEPS = [
  {
    id: "scope",
    title: "Clarify scope",
    interviewer: "Design Netflix data architecture for me.",
    hints: [
      "Say explicitly that you are scoping the data platform, not backend playback APIs or CDN routing.",
      "List ingestion, streaming, batch, lakehouse, BI, feature store, governance, replay, and reliability.",
      "Set the expectation that you will start with requirements and scale before the architecture deep dive.",
    ],
    checklist: ["Boundary clarity", "Data-platform framing", "Senior opening statement"],
  },
  {
    id: "requirements",
    title: "Requirements",
    interviewer: "What does the platform need to answer and who consumes it?",
    hints: [
      "Cover engagement, content, playback quality, recsys features, finance, and governance.",
      "Tie each requirement to freshness and correctness expectations.",
      "Mention operational dashboards, BI, warehouse, and ML consumers separately.",
    ],
    checklist: ["Functional coverage", "SLA awareness", "Consumer mapping"],
  },
  {
    id: "scale",
    title: "Scale estimation",
    interviewer: "How big is this system and what does that imply for Kafka and storage?",
    hints: [
      "Use 80M DAU, 2 hours/day, heartbeat every 30 seconds.",
      "Derive 19.2B heartbeats/day and then peak events/sec.",
      "Connect the math to partition count, replay retention, and storage planning.",
    ],
    checklist: ["First-principles math", "Peak throughput", "Partition and storage consequences"],
  },
  {
    id: "architecture",
    title: "Architecture",
    interviewer: "Walk me through the end-to-end platform.",
    hints: [
      "Client events -> Event Gateway -> Kafka -> Flink + Spark -> Bronze / Silver / Gold -> BI / feature store.",
      "Add governance, DQ, replay, and serving after the base path is clear.",
      "Do not disappear into tool logos without explaining responsibility by layer.",
    ],
    checklist: ["Clean mental map", "Layer responsibilities", "Consumers and feedback loops"],
  },
  {
    id: "deep-dive-watch-time",
    title: "Deep dive: watch time",
    interviewer: "How exactly do you calculate watch time?",
    hints: [
      "Heartbeat is the source of truth.",
      "Track total watch time, buffering, session duration, and unique coverage separately.",
      "Completion % must use unique coverage, not total watch seconds.",
    ],
    checklist: ["Heartbeat logic", "Metric definitions", "Duplicate / seek / buffering handling"],
  },
  {
    id: "deep-dive-sessionization",
    title: "Deep dive: sessionization",
    interviewer: "How do you define playback sessions and what if the user pauses for hours?",
    hints: [
      "Use keyed state plus inactivity timeout.",
      "Explain pause continuation threshold and viewing journey separately.",
      "Mention duplicate suppression and device switches.",
    ],
    checklist: ["Session key", "Timeout rules", "Journey logic"],
  },
  {
    id: "reliability",
    title: "Reliability",
    interviewer: "What happens when data arrives late or when a bug corrupts Gold metrics?",
    hints: [
      "Watermarks, allowed lateness, late_events topic, correction job.",
      "DLQ with owner and replay tooling.",
      "Iceberg snapshots and audited backfills.",
    ],
    checklist: ["Late-event strategy", "Replay/backfill", "Rollback path"],
  },
  {
    id: "tradeoffs",
    title: "Trade-offs",
    interviewer: "Why Kafka over Kinesis or Flink over Spark Streaming here?",
    hints: [
      "Tie trade-offs back to workload shape, ops burden, and team constraints.",
      "Streaming gives speed, batch gives correctness.",
      "State clearly when your recommendation would change.",
    ],
    checklist: ["Balanced comparison", "Recommendation", "Contextual nuance"],
  },
  {
    id: "closing",
    title: "Closing statement",
    interviewer: "Wrap it up for me.",
    hints: [
      "Say the lakehouse gives replayability, streaming gives speed, and batch gives correctness.",
      "Call out watch-time correctness, sessionization, late events, and backfills as critical.",
      "Tie it back to the business and ML consumers.",
    ],
    checklist: ["Memorable close", "Correctness emphasis", "Business value"],
  },
] as const;

export const MOCK_INTERVIEW_RUBRIC = [
  "Scope clarity",
  "Requirements",
  "Scale derivation",
  "Architecture",
  "Data correctness",
  "Failure handling",
  "Trade-offs",
  "Interview communication",
] as const;

export const CHEAT_SHEET_CONTENT = {
  thirtySecond:
    "I will scope this as the data platform behind a Netflix-like company: event ingestion, Kafka, Flink, Spark, Bronze/Silver/Gold lakehouse, warehouse and BI serving, feature store, governance, replay, and reliability.",
  twoMinute:
    "Client, CDN, service, search, browse, recommendation, and billing events land through an event gateway into Kafka domain topics. Flink handles real-time sessionization, watch time, QoE, fraud, and online features. Bronze stores immutable raw truth. Spark and dbt clean and enrich into Silver and publish official metrics and features in Gold. BI, warehouse, OLAP, and feature stores serve different consumer workloads. Data quality, governance, replay, and backfills are built in.",
  fiveMinuteFlow: [
    "Clarify scope as data engineering, not playback APIs or CDN routing.",
    "Lock business requirements, freshness expectations, and correctness boundaries.",
    "Derive scale using DAU, watch time, heartbeat interval, event size, and peak multiplier.",
    "Show client events -> gateway -> Kafka -> Flink + Spark -> Bronze / Silver / Gold -> BI / ML / feature store.",
    "Deep dive into watch time, sessionization, late events, replay, and backfill.",
  ],
  mustMention: [
    "Heartbeat is the source of truth for watch time",
    "Streaming gives speed, batch gives correctness",
    "Bronze immutable, Silver trusted, Gold official",
    "Late events are corrected, not silently dropped",
    "DLQ needs owner + replay tooling",
    "Point-in-time correctness for ML features",
  ],
  commonMistakes: [
    "Using play and pause only for watch time",
    "Treating streaming dashboards as final finance truth",
    "One giant raw topic instead of domain topics",
    "Ignoring sessionization and duplicate logic",
    "No replay/backfill design",
    "No governance story for watch and search history",
  ],
  scaleNumbers: [
    "80M DAU",
    "2 hours/day per active user",
    "Heartbeat every 30 seconds",
    "19.2B heartbeat events/day",
    "50-100 TB raw data/day",
    "1M-2M peak events/sec",
    "200-300 partitions across hottest topics",
  ],
  formulas: [
    "Heartbeats per user/day = watch_seconds_per_day / heartbeat_interval",
    "Peak events/sec = daily_events / 86,400 * peak_multiplier",
    "Kafka partitions = ceil(peak_events_per_sec / safe_events_per_partition * headroom)",
  ],
  watchTimeRules: [
    "Count only valid heartbeats with active playback",
    "Separate watch_seconds, session_seconds, buffering_seconds, and unique coverage",
    "Use unique coverage for completion_pct",
  ],
  sessionizationRules: [
    "Key by user/profile/content/device/session",
    "Close on stop, complete, or inactivity timeout",
    "Allow pause continuation and journey grouping separately",
  ],
  lateStrategy: [
    "On time -> normal process",
    "Late but allowed -> update prior window/session",
    "Very late -> late_events -> correction job -> audited merge",
  ],
  bronzeSilverGold: [
    "Bronze = immutable raw events",
    "Silver = cleaned, deduped, schema-valid trusted facts",
    "Gold = official business definitions and curated features",
  ],
  tableNames: [
    "fact_watch_session",
    "fact_content_impression",
    "fact_search_event",
    "dim_user",
    "dim_content",
    "dim_device",
    "rpt_content_daily_metrics",
    "quarantine_events",
    "backfill_audit",
  ],
  failureModes: [
    "Hot partitions",
    "Checkpoint failure",
    "Schema breaking change",
    "Late-event spike",
    "Bad dedupe logic",
    "Wrong Gold backfill publish",
  ],
  tradeoffLines: [
    "Kafka for ecosystem and replay, Kinesis for managed simplicity",
    "Flink for low-latency stateful event-time logic, Spark Streaming for stack consolidation",
    "Iceberg for open multi-engine tables and snapshot rollback",
    "Warehouse for curated BI, Trino/Athena for ad hoc lake queries",
  ],
  closingStatement:
    "The key design principle is that streaming gives speed, batch gives correctness, and the lakehouse gives replayability. I would keep Bronze immutable, make Silver clean and deduplicated, publish official business metrics in Gold, and ensure every pipeline is observable, idempotent, governed, and replayable. For a Netflix-like platform, correctness of watch time, handling late events, sessionization, and backfill strategy are as important as raw scalability.",
};
