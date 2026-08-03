export const DATA_ENGINEERING_GROUPS = [
  "FOUNDATION",
  "PIPELINES",
  "MODELING",
  "PRODUCTION",
  "PRACTICE",
] as const;

export type DataEngineeringGroup = typeof DATA_ENGINEERING_GROUPS[number];

export const DATA_ENGINEERING_TAB_SLUGS = [
  "start-here",
  "requirements",
  "event-sources",
  "architecture",
  "ingestion-kafka",
  "real-time-streaming",
  "data-modeling",
  "batch-pipelines",
  "warehouse-serving",
  "feature-store-experimentation",
  "governance-quality",
  "backfill-replay",
  "capacity-cost",
  "failures",
  "quiz",
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
  architecture: "architecture",
  "architecture-map": "architecture",
  ingestion: "ingestion-kafka",
  streaming: "real-time-streaming",
  batch: "batch-pipelines",
  lakehouse: "batch-pipelines",
  modeling: "data-modeling",
  reliability: "failures",
  governance: "governance-quality",
  "ml-serving": "feature-store-experimentation",
  stack: "warehouse-serving",
  "performance-cost": "capacity-cost",
  capacity: "capacity-cost",
  quiz: "quiz",
  "scale-estimation": "capacity-cost",
  "event-taxonomy": "event-sources",
  "high-level-data-architecture": "architecture",
  "ingestion-layer": "ingestion-kafka",
  "kafka-topic-design": "ingestion-kafka",
  "streaming-pipeline": "real-time-streaming",
  "watch-time-calculation": "real-time-streaming",
  sessionization: "real-time-streaming",
  "late-events-replay": "backfill-replay",
  "lakehouse-design": "batch-pipelines",
  "table-design": "data-modeling",
  "batch-pipeline": "batch-pipelines",
  "data-quality": "governance-quality",
  "governance-security": "governance-quality",
  "reliability-backfill": "failures",
  "trade-offs": "capacity-cost",
  "interview-qa": "quiz",
  "mock-interview": "quiz",
} as const satisfies Record<string, DataEngineeringTabSlug>;

export function isDataEngineeringTabSlug(value: string): value is DataEngineeringTabSlug {
  return (DATA_ENGINEERING_TAB_SLUGS as readonly string[]).includes(value);
}

export function normalizeDataEngineeringTab(value?: string | null): DataEngineeringTabSlug | null {
  if (!value) return null;
  if (value === "failures") return "governance-quality";
  if (isDataEngineeringTabSlug(value)) return value;
  return DATA_ENGINEERING_LEGACY_MAP[value as keyof typeof DATA_ENGINEERING_LEGACY_MAP] ?? null;
}

export const DATA_ENGINEERING_TABS: DataEngineeringTab[] = [
  {
    id: "start-here",
    label: "Start Here",
    group: "FOUNDATION",
    mins: 5,
    accent: "#e50914",
    summary: "Open the round like a dedicated Netflix data-platform interview.",
    description: "Clarify scope, show the end-to-end journey, and position the data-engineering boundary before any deep dive.",
  },
  {
    id: "requirements",
    label: "Requirements",
    group: "FOUNDATION",
    mins: 8,
    accent: "#f59e0b",
    summary: "Turn business questions into freshness, correctness, and SLA contracts.",
    description: "Group requirements by domain, show scale anchors, and separate real-time, batch, and governance expectations.",
  },
  {
    id: "architecture",
    label: "Architecture",
    group: "FOUNDATION",
    mins: 10,
    accent: "#38bdf8",
    summary: "Show the full Netflix data journey as one layered system map.",
    description: "Walk from event emitters to validation, Kafka, streaming, Bronze/Silver/Gold, warehouse, features, replay, and governance.",
  },
  {
    id: "ingestion-kafka",
    label: "Event Contracts",
    group: "PIPELINES",
    mins: 9,
    accent: "#f59e0b",
    summary: "Make canonical events, Kafka ordering, and data trust easy to explain.",
    description: "Cover canonical event envelopes, topic keys and partition math, late data handling, SCD2 joins, quality gates, and cost-aware controls.",
  },
  {
    id: "real-time-streaming",
    label: "Real-Time Streaming",
    group: "PIPELINES",
    mins: 10,
    accent: "#38bdf8",
    summary: "Explain how raw events become trusted real-time metrics and features.",
    description: "Cover Flink jobs, watch-time logic, sessionization, watermarks, late data handling, and exactly-once style guarantees.",
  },
  {
    id: "data-modeling",
    label: "Data Modeling",
    group: "MODELING",
    mins: 9,
    accent: "#8b5cf6",
    summary: "Connect ERD, star schema, lineage, and table semantics in one place.",
    description: "Explain grain, partitions, facts, dimensions, marts, lineage, and why each table exists for analytics or ML use cases.",
  },
  {
    id: "batch-pipelines",
    label: "Batch + Lakehouse",
    group: "PIPELINES",
    mins: 10,
    accent: "#fbbf24",
    summary: "Show how trusted batch truth and the lakehouse operating model work together.",
    description: "Combine DAG visuals, Bronze/Silver/Gold responsibilities, Iceberg layout, DQ gates, replayability, and official publish flows in one section.",
  },
  {
    id: "governance-quality",
    label: "Governance / Quality",
    group: "PRODUCTION",
    mins: 8,
    accent: "#22c55e",
    summary: "Treat schema, privacy, freshness, and trust as first-class product surfaces.",
    description: "Cover data contracts, DQ dashboards, PII policy, deletions, lineage, audits, and severity-driven response paths.",
  },
  {
    id: "capacity-cost",
    label: "Capacity / Cost",
    group: "PRODUCTION",
    mins: 7,
    accent: "#fbbf24",
    summary: "Make scale math, tool choices, and cost controls explicit and defensible.",
    description: "Derive event rates, partitions, retention, storage, and compute costs from one consistent workload model.",
  },
  {
    id: "failures",
    label: "Failures",
    group: "PRODUCTION",
    mins: 9,
    accent: "#ef4444",
    summary: "Turn incidents into a visible failure playbook with recovery steps.",
    description: "Simulate data outages, skew, schema breaks, and stale Gold tables with detection, mitigation, recovery, and prevention guidance.",
  },
  {
    id: "quiz",
    label: "Interview Q&A",
    group: "PRACTICE",
    mins: 9,
    accent: "#38bdf8",
    summary: "Merge follow-up answers and Netflix tech name-drops into one light interview section.",
    description: "Use compact Q&A, a technology map, and simple draw-if-asked visuals so you can explain the platform crisply in an interview.",
  },
  {
    id: "cheat-sheet",
    label: "Cheat Sheet",
    group: "PRACTICE",
    mins: 6,
    accent: "#e50914",
    summary: "Revise the whole story with fast answer versions, formulas, and mistakes to avoid.",
    description: "Use print-ready and copy-ready revision blocks for the 30-second, 2-minute, and 5-minute interview versions.",
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
  dauMillions: 100,
  eventsPerActivePerDay: 200,
  compressedEventKb: 1,
  peakMultiplier: 5,
  safeEventsPerPartition: 10000,
  headroomPercent: 30,
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
  "Encrypt raw playback, account, and billing-linked datasets across Kafka, S3, Iceberg, and warehouse copies so sensitive activity is protected in every hop.",
  "Use RBAC plus column-level controls so product analysts can read content and engagement metrics without directly seeing raw member, device, or billing identifiers.",
  "Apply stricter retention to raw member-linked events than to aggregated Gold metrics so privacy policy matches the sensitivity of each layer.",
  "Keep audit trails for who accessed restricted tables and who approved replay or correction workflows after data-quality incidents.",
  "Enforce regional residency when member-linked data or billing fields cannot legally move across processing regions or exports.",
  "Mark which published marts are safe for broad BI use and which trusted tables remain engineering-only so consumers do not bypass governance boundaries.",
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
    eyebrow: "Metric drift",
    title: "Gold content metrics wrong for last 30 days",
    detection: "The first signal is usually a reconciliation miss between the daily Gold mart and an independently computed finance or stream-side control total. Product or finance may report that a title's watch-hours, completion rate, or revenue attribution has been off for weeks.",
    impact: "This is not just a dashboard glitch. Planning, content-performance reporting, and any executive review using that Gold mart are now reading the wrong official business number.",
    mitigation: "Freeze new Gold publishes for that subject area, pin downstream consumers to the last certified snapshot, and narrow the blast radius by finding the exact bad date range, metric family, and upstream transform that introduced the drift.",
    recovery: "Fix the business logic or join error, recompute the affected Silver partitions, backfill only the impacted Gold windows, rerun reconciliation against control totals, and publish one audited replacement snapshot instead of patching tables manually.",
    prevention: "Keep metric definitions versioned, require pre-publish reconciliation against control datasets, store reproducible Iceberg snapshots, and make every Gold publish reversible so long-lived drift cannot stay hidden.",
    interview: "If Gold is wrong for 30 days, I would not hot-fix dashboards. I would freeze publication, isolate the bad date range, rebuild from trusted Silver or Bronze, rerun reconciliation, and then republish one certified snapshot with an audit note.",
  },
  {
    id: "flink-failed",
    eyebrow: "Streaming outage",
    title: "Flink job failed",
    detection: "You usually see checkpoint failures first, then Kafka lag climbs, then real-time QoE, trending, or alerting dashboards stop moving even though traffic is still arriving.",
    impact: "Freshness degrades within minutes. Operational consumers lose live visibility, recommendation features go stale, and any stream-derived alert may start missing real user pain.",
    mitigation: "Treat it as a freshness incident: pause dependent publishes, inspect the failing operator, state backend, and checkpoint storage, and decide whether the job can resume safely from the latest successful checkpoint or needs controlled replay.",
    recovery: "Restart from the last durable checkpoint, let the pipeline drain lag, replay only the missed topic range if required, and compare the recovered stream output against batch truth before declaring the pipeline healthy again.",
    prevention: "Tune checkpoints and state TTL, watch backpressure and skew by partition, cap runaway state growth, and keep source topics replayable so a restart is a recovery exercise rather than a data-loss event.",
    interview: "For a Flink failure, I would say the goal is to restore freshness without breaking correctness: resume from checkpoint if possible, use Kafka replay for the missed window, and finally reconcile stream output with batch truth before reopening downstream trust.",
  },
  {
    id: "schema-release",
    eyebrow: "Contract break",
    title: "Bad schema release",
    detection: "The cleanest signal is schema-registry rejection at the boundary. If that misses, you see DLQ growth, parser failures, or a sudden jump in nulls and default values inside Silver tables right after a producer deploy.",
    impact: "A bad producer release can silently poison trusted layers, which is worse than an outright failure because corrupted rows may continue flowing into Gold before anyone notices.",
    mitigation: "Stop incompatible payloads at ingestion, quarantine the bad version with reason codes, keep valid producer traffic moving, and prevent the broken schema from reaching Silver or Gold at all.",
    recovery: "Roll forward or roll back the producer contract, replay quarantined records through the validated parser path, and revalidate downstream tables so no corrupted rows remain in trusted layers.",
    prevention: "Enforce backward-compatibility in schema registry, run producer CI against sample payload contracts, prefer additive changes on hot topics, and require versioned migrations for breaking fields.",
    interview: "My interview answer here is that schema problems should fail fast at the edge. I would rather quarantine bad events immediately than let them silently corrupt Silver and force a much more expensive Gold rebuild later.",
  },
  {
    id: "late-spike",
    eyebrow: "Watermark stress",
    title: "Late events spiked",
    detection: "You notice the late-event percentage jump, stream numbers stop matching the next batch checkpoint, and specific regions or device classes may show unusual arrival delay after network issues, app buffering, or offline sync bursts.",
    impact: "Real-time views become temporarily incomplete, while daily trusted metrics may flip later when the correction path lands those missing events. That creates confusion if consumers do not understand the lateness policy.",
    mitigation: "Check whether the spike comes from one client platform, region, or producer lane, verify watermark pressure, and keep late-but-still-valid events in a bounded correction path instead of letting them silently disappear.",
    recovery: "Allow in-window late arrivals to update trusted state, route beyond-watermark events into a replay or correction job, patch the affected Silver and Gold partitions, and clearly communicate whether dashboards are provisional or final.",
    prevention: "Set lateness classes explicitly, tune watermarks by source behavior, design mobile and TV offline-sync paths carefully, and maintain separate alerts for transport delay versus true data-loss events.",
    interview: "I would explain that late data is a policy problem, not just a pipeline problem. Some events should still update trusted state, some should go to correction, and the key is making consumers understand when a metric is provisional versus final.",
  },
] as const;

export const TRADEOFFS = [
  {
    decision: "Ingestion backbone",
    eyebrow: "Event backbone",
    optionA: "Kafka / MSK",
    optionB: "Kinesis",
    recommendation: "For a Netflix-style event platform, Kafka is the better default because many downstream consumers need the same durable ordered log for replay, backfill, and independent scaling.",
    why: "Playback, browse, QoE, experimentation, and correction jobs all want one shared event backbone. Kafka makes long replay windows, rich consumer groups, and topic-level control much easier to explain.",
    whenToChange: "Move toward a more managed stream when the team wants lower ops burden and the workload is simpler than a multi-consumer replay-heavy platform.",
    tradeoffs: [
      "More partitions raise broker, storage, and rebalance cost during prime-time spikes.",
      "Longer retention helps replay and debugging but directly increases hot storage spend.",
      "Too many tiny topics or consumer groups create platform overhead without adding business value.",
    ],
    costSignal: "This gets expensive when every team wants its own hot replay window and every consumer reads the same playback firehose independently.",
    netflixContext: "In Netflix context, one blockbuster release can spike playback and QoE traffic at the same time, so the log must survive heavy fan-out without sacrificing replay.",
    say: "I would keep Kafka as the central cost because it buys us replay, fan-out, and ordered partitions. Then I would control spend with retention discipline, topic hygiene, and sane partition math instead of splitting the backbone too early.",
  },
  {
    decision: "Streaming compute",
    eyebrow: "Live compute",
    optionA: "Flink",
    optionB: "Spark Structured Streaming",
    recommendation: "Use Flink for watch-time, sessionization, and live QoE because those are stateful event-time problems where correctness under lateness matters more than keeping one engine everywhere.",
    why: "Netflix-like streaming pipelines need low-latency updates, large keyed state, and strong watermark handling for sessions, late heartbeats, and device reconnects.",
    whenToChange: "Lean more on Spark Structured Streaming when freshness targets are softer and the team values a more unified Spark-heavy operating model.",
    tradeoffs: [
      "Checkpoint storage, state growth, and skewed hot keys become real cost drivers in Flink.",
      "Overly strict freshness goals can force more streaming capacity than the business value justifies.",
      "Some metrics are cheaper to finalize in batch rather than over-engineering exactness in the live path.",
    ],
    costSignal: "This gets expensive when low-value dashboards demand sub-minute freshness and force large always-on stateful clusters.",
    netflixContext: "QoE alerts and trending rows need freshness, but official finance or title-performance truth can wait for the cheaper batch-reconciled path.",
    say: "My cost lever is freshness discipline. I use Flink where live state really matters, but I do not make every product question a 24x7 stateful streaming problem.",
  },
  {
    decision: "Transformation layer",
    eyebrow: "Batch truth",
    optionA: "Spark batch",
    optionB: "dbt",
    recommendation: "Use Spark for heavy Bronze-to-Silver cleanup and replay workloads, then use dbt or SQL-first modeling where Gold logic is mostly semantic and easy to test.",
    why: "The expensive work is usually dedupe, joins, correction, and repartitioning at scale. The business-facing work is usually metric definition, certified marts, and testable SQL lineage.",
    whenToChange: "Push more into dbt when Gold logic is mostly declarative SQL and the engine beneath it can already handle the dataset shape comfortably.",
    tradeoffs: [
      "Big Spark backfills are costly, so partition design and bounded replay windows matter a lot.",
      "Letting every transformation live in Spark can slow iteration for analysts and data product owners.",
      "Pushing huge messy raw cleanup into SQL-first tools often hides expensive scans and unpredictable runtime growth.",
    ],
    costSignal: "This gets expensive when daily recomputes touch far more partitions than the business question actually changed.",
    netflixContext: "If one bug affects only a week of title-performance metrics, I want to replay that slice, not re-run a month of Silver and Gold for every region.",
    say: "I separate expensive data-shaping work from business-semantic modeling. That keeps replay and correction efficient while still giving teams readable tested Gold definitions.",
  },
  {
    decision: "Lakehouse retention",
    eyebrow: "Storage shape",
    optionA: "Iceberg",
    optionB: "Delta / Hudi",
    recommendation: "Keep the lakehouse open and snapshot-based so replay, rollback, multi-engine reads, and audited publish remain cheap enough operationally.",
    why: "At this scale, storage cost is not just raw bytes. It is also how easy it is to backfill, delete, expire snapshots, compact small files, and let multiple engines read the same trusted tables.",
    whenToChange: "Bias toward Delta if Databricks is the center of gravity, or Hudi if upsert-heavy ingestion patterns dominate the platform.",
    tradeoffs: [
      "Poor compaction and snapshot cleanup create hidden storage cost even when raw ingest looks stable.",
      "Keeping too many intermediate copies across Bronze, Silver, Gold, and serving can quietly double or triple footprint.",
      "Open table formats reduce lock-in but still require good operational hygiene around file counts and retention.",
    ],
    costSignal: "This gets expensive when teams keep every snapshot forever and never compact small files after frequent publishes or corrections.",
    netflixContext: "A replay-friendly Netflix lakehouse needs rollback and audited publish, but that only stays affordable if snapshot expiry and file maintenance are treated as first-class operations.",
    say: "My storage cost lever is lifecycle discipline. I want an open snapshot-based lakehouse, but I also want compaction, retention tiers, and snapshot expiry to be automatic, not ad hoc.",
  },
  {
    decision: "Serving economics",
    eyebrow: "Query serving",
    optionA: "Redshift / Snowflake",
    optionB: "Athena / Trino",
    recommendation: "Use a warehouse for curated executive, finance, and repeat BI workloads; keep open engines for engineering and ad hoc lake reads so not every query pays warehouse rates.",
    why: "Stable dashboard workloads and audited marts justify curated serving, while broad exploratory access against raw or trusted tables needs a cheaper and more flexible path.",
    whenToChange: "Shift more traffic to open query engines when warehouse ingestion duplication and compute bills become the bigger pain than BI performance guarantees.",
    tradeoffs: [
      "Mirroring too much data into warehouse tables increases storage duplication and refresh cost.",
      "Letting everyone hit open engines directly can create noisy-neighbor behavior and governance drift.",
      "The right split depends on who is reading: finance dashboards, product analysts, or platform engineers debugging raw truth.",
    ],
    costSignal: "This gets expensive when the same Gold data is copied into too many serving systems just because each team wants its own query engine.",
    netflixContext: "Finance and executive KPI boards need stable curated reads, but platform engineers chasing a playback bug should not burn warehouse spend for raw forensic exploration.",
    say: "I would not force one serving layer to do everything. I keep expensive warehouse capacity for repeat trusted BI and use open query engines where lake flexibility matters more than polished dashboard latency.",
  },
  {
    decision: "Freshness vs correction",
    eyebrow: "Truth boundary",
    optionA: "Streaming immediate outputs",
    optionB: "Batch-reconciled official truth",
    recommendation: "Use streaming where the product truly needs freshness, but make batch the owner of official trust for business-critical metrics that must survive late data, bugs, and replay.",
    why: "The biggest cost mistake is treating every metric as if it needs both ultra-low latency and perfect correctness at the same time.",
    whenToChange: "Leave some metrics stream-owned only when the business can tolerate provisional values and eventual correction is not worth the operational complexity.",
    tradeoffs: [
      "Very fresh numbers are expensive because they need always-on compute and more operational attention.",
      "Very correct official truth is expensive because replay, reconciliation, and auditability require more storage and batch work.",
      "The cheapest design is often a clearly labeled provisional stream view plus a later certified batch version.",
    ],
    costSignal: "This gets expensive when teams demand sub-minute freshness for numbers that are later re-audited anyway before anyone makes a real business decision.",
    netflixContext: "Trending rows or QoE alerts can be stream-owned, but finance, revenue attribution, and official title performance should still wait for the certified batch publish.",
    say: "My main cost lever is deciding where truth becomes official. I let streaming answer urgent operational questions, but I do not pay streaming-grade cost for every metric that will still be batch-certified later.",
  },
] as const;

export const INTERVIEW_QUESTIONS = [
  {
    id: "qa-flink-lag",
    tag: "Streaming Ops",
    question: "How do you handle a Flink job falling behind when consumer lag keeps growing?",
    strongAnswer: "I treat this as a throughput-plus-safety-window problem, not just a restart problem. First I alert on lag growth, processing-time delay, checkpoint duration, and watermark stall so I know whether the issue is backpressure, skew, bad state growth, or an upstream traffic spike. Then I scale parallelism using historical throughput and partition math, rebalance hot keys if one partition is dominating, and protect Kafka retention as the short replay buffer while the job catches up. If the lag threatens to run past that retention window, I stop pretending Kafka alone is enough and switch to an Iceberg-backed replay or correction path so correctness is preserved instead of silently losing late data.",
    followUp: "What would you inspect first to separate a hot key from generic under-provisioning?",
    badAnswer: "I would just restart the Flink job and hope it clears the lag.",
    linkedTab: "real-time-streaming" as DataEngineeringTabSlug,
  },
  {
    id: "qa-schema-evolution",
    tag: "Contracts",
    question: "How would you handle schema evolution for an event that 1,200 downstream pipelines depend on?",
    strongAnswer: "I would force evolution through a schema registry with explicit compatibility rules rather than letting producers improvise. Safe additive optional fields can roll forward under backward and forward compatibility, but renames, semantic changes, and removals need a new version and a managed migration plan. I would also require producers to declare ownership and consumers to declare compatibility expectations, because the real risk is not syntax alone, it is meaning drift. Downstream Iceberg tables help because additive evolution can land without full rewrites, but the operating rule is still that contract changes are staged, versioned, and observable before they reach shared Silver or Gold assets.",
    followUp: "When would you reject a producer release even if the Avro change technically validates?",
    badAnswer: "As long as the event still parses, I would let the producer ship and fix readers later.",
    linkedTab: "ingestion-kafka" as DataEngineeringTabSlug,
  },
  {
    id: "qa-small-files",
    tag: "Lakehouse",
    question: "How do you avoid the small-files problem on S3 and Iceberg when thousands of streaming writers are active?",
    strongAnswer: "I solve that as a write-shaping and maintenance problem. Streaming sinks should buffer around checkpoints and commit files at a size that balances freshness against file-count explosion, instead of flushing tiny objects constantly. Then I schedule compaction and file-rewrite maintenance based on query pain, manifest growth, and partition health rather than on a blind cron alone. The big idea is that Iceberg gives me the table abstraction, but I still need an operating loop around checkpoint interval, writer parallelism, partitioning strategy, and background compaction so the table remains readable at scale.",
    followUp: "What metric tells you this is becoming a real production issue instead of just an aesthetic one?",
    badAnswer: "S3 is cheap, so having lots of tiny files is not really a problem.",
    linkedTab: "batch-pipelines" as DataEngineeringTabSlug,
  },
  {
    id: "qa-exactly-once",
    tag: "Correctness",
    question: "How do you guarantee exactly-once when one raw event is consumed by five different sinks?",
    strongAnswer: "I would never promise one magical global exactly-once property across every sink because the semantics differ by destination. Kafka-to-Kafka hops can use Flink checkpoints and transactional producers, Iceberg can use atomic snapshot commits plus idempotent writer identity, and observability or OLAP sinks such as Elasticsearch or Druid often operate at at-least-once with idempotent upserts keyed by event_id. So my answer is per-sink correctness: the event should be logically deduplicable everywhere, physically exactly-once where the sink supports it, and operationally acceptable where a tiny amount of duplicate observability data is cheaper than heavyweight coordination.",
    followUp: "Which field makes the cross-sink logical dedup story possible even when physical sink semantics differ?",
    badAnswer: "If Flink says exactly-once, then every downstream system automatically gets exactly-once too.",
    linkedTab: "ingestion-kafka" as DataEngineeringTabSlug,
  },
  {
    id: "qa-kafka-vs-lakehouse",
    tag: "Storage",
    question: "Why not just use Kafka retention for everything and skip a separate lakehouse?",
    strongAnswer: "Because Kafka and the lakehouse solve different cost and access patterns. Kafka is the hot transport backbone: short retention, high-throughput append, replay over a bounded window, and fan-out into many consumers. It is not the right place for cheap multi-year storage, broad SQL access, point-in-time backfills, or ML training dataset construction. Iceberg on S3 gives durable, queryable, evolvable history at the right storage economics, while Kafka stays lean enough to do the low-latency transport job well. If I keep everything in Kafka, I pay broker-grade cost for a workload that really wants object-storage economics and table semantics.",
    followUp: "When would you intentionally increase Kafka retention anyway?",
    badAnswer: "Kafka already stores the events, so adding a lakehouse is just unnecessary duplication.",
    linkedTab: "batch-pipelines" as DataEngineeringTabSlug,
  },
  {
    id: "qa-recommendation-pipeline",
    tag: "Features",
    question: "How would you design the recommendation feature pipeline specifically?",
    strongAnswer: "I would split it into one online feature path and one offline training path, both fed by the same raw interaction history. Playback, browse, rate, impression, and click events would stream through Flink to compute hot features such as recent titles watched, short-window genre affinity, or freshness-sensitive counters, then publish those into a low-latency store such as EVCache or DynamoDB/Cassandra for serving. The same persisted event history in Iceberg would feed Spark jobs that compute richer longer-window features and training datasets. The critical design requirement is train-serve parity: feature definitions, keys, null handling, and time windows must match across online and offline implementations, otherwise the model learns one world and serves in another.",
    followUp: "How do you stop training leakage when the offline path joins many historical features together?",
    badAnswer: "I would send recommendation data to a separate ML pipeline and let that team figure out the details later.",
    linkedTab: "feature-store-ml-data" as DataEngineeringTabSlug,
  },
  {
    id: "qa-dont-stream-everything",
    tag: "Trade-offs",
    question: "What would you change about this design and why?",
    strongAnswer: "My main caution is not to stream all the things just because streaming is available. Every use case should earn its latency budget. If a consumer truly needs seconds-level freshness, then Flink and always-on stateful compute make sense. But if the output is an official daily content report, a finance metric, or a feature set that only refreshes hourly, pushing it through a permanently hot streaming path adds cost and operational complexity without enough product value. So the mature answer is to classify use cases by actual freshness requirement first, then use streaming selectively and let scheduled batch own everything that can tolerate slower but simpler and more auditable computation.",
    followUp: "Which outputs in your design would you explicitly keep batch-first even if the company loves real-time systems?",
    badAnswer: "I would stream everything because that is the most modern architecture.",
    linkedTab: "capacity-cost" as DataEngineeringTabSlug,
  },
  {
    id: "qa-playback-partition-key",
    tag: "Kafka",
    question: "What partition key would you choose for playback events?",
    strongAnswer: "I would choose session_id for the source playback topic because the most important requirement is preserving order within one viewing session. Play, heartbeat, pause, seek, and stop need to arrive together for sessionization and watch-time logic to remain simple and correct. I would not choose title_id at ingestion because a blockbuster release can create hot partitions immediately, and I would not choose a random key because then all business ordering is lost. If I later need title-level aggregation, I repartition downstream inside Flink or Spark after the raw source ordering problem has already been solved safely.",
    followUp: "What would make you choose profile_id instead of session_id?",
    badAnswer: "I would partition by title_id because the business usually wants title-level analytics.",
    linkedTab: "ingestion-kafka" as DataEngineeringTabSlug,
  },
  {
    id: "qa-three-hours-late",
    tag: "Late Events",
    question: "A mobile device sends events three hours late. What happens?",
    strongAnswer: "The raw event is still stored because source truth should not be dropped just because it missed a live dashboard window. In the streaming path, that event may already be outside the active watermark and allowed-lateness range, so I would avoid endlessly reopening live windows. Instead, the event goes into the correction path: Bronze or raw history keeps it, Silver or Gold corrections recompute the affected partitions or sessions later, and the dashboard semantics stay honest by labeling what is provisional versus finalized. That separation lets me preserve correctness without making live state unbounded.",
    followUp: "Would the real-time dashboard change immediately, eventually, or never for that event?",
    badAnswer: "If it is three hours late, I would just ignore it because the real-time pipeline already moved on.",
    linkedTab: "backfill-replay" as DataEngineeringTabSlug,
  },
  {
    id: "qa-correct-seven-days",
    tag: "Backfill",
    question: "How do you correct seven days of bad output without corrupting live data?",
    strongAnswer: "I would pin the trusted raw or Silver snapshot first so the correction has a stable input boundary. Then I would run a versioned backfill into a shadow output or isolated table branch for only the affected partitions and dates, validate counts, checksums, and business metrics against the expected correction, and only then perform an atomic swap or merge into the published output with rollback still available. The important part is that I do not rewrite live truth in place while users are reading it. I separate recomputation, validation, publication, and rollback so the correction itself is auditable and low-risk.",
    followUp: "How do you keep late live arrivals from double-counting while that seven-day correction is in progress?",
    badAnswer: "I would rerun the whole pipeline and overwrite the table directly.",
    linkedTab: "reliability-backfill" as DataEngineeringTabSlug,
  },
  {
    id: "qa-facts-dims-why",
    tag: "Modeling",
    question: "Why use dimensions and facts if the platform is already a lakehouse?",
    strongAnswer: "Because the lakehouse and dimensional modeling solve different layers of the problem. Iceberg gives me physical-table reliability: snapshots, schema evolution, partitioning, deletes, and replay-friendly history. Facts and conformed dimensions give me business grain, join semantics, and reuse across BI, experimentation, recommendations, and governance workflows. Without that modeling layer, different teams keep recomputing slightly different notions of a playback session, a title, or a profile state. So the lakehouse is the storage contract, while dimensional modeling is the business truth contract.",
    followUp: "Which fact would you explain first in this system and why?",
    badAnswer: "If I have Iceberg tables, I do not really need facts and dimensions anymore.",
    linkedTab: "data-modeling" as DataEngineeringTabSlug,
  },
  {
    id: "qa-training-leakage",
    tag: "ML Correctness",
    question: "How do you prevent training data leakage?",
    strongAnswer: "I use point-in-time joins everywhere the model consumes historical features or dimensions. Every feature value joined into training must be provably available before the prediction timestamp, not after it. That means keeping feature history, dimension history, and source snapshots versioned, joining on event_time or prediction_time boundaries, and recording the exact feature version and input snapshot used to produce a training dataset. Without that, the model quietly learns from future information and looks much better offline than it will in production.",
    followUp: "What is one concrete leakage trap in this Netflix-style pipeline?",
    badAnswer: "As long as the data comes from historical tables, I do not worry too much about leakage.",
    linkedTab: "feature-store-ml-data" as DataEngineeringTabSlug,
  },
  {
    id: "qa-correctness-vs-running",
    tag: "DQ",
    question: "How do you know the pipeline is correct rather than merely running?",
    strongAnswer: "I measure correctness at the data-product level, not just infrastructure health. That means end-to-end freshness, source-to-sink reconciliation, duplicate rate, late-arrival rate, partition completeness, schema rejection rate, and business invariants such as watch time never going negative or totals staying within expected tolerance bands. A healthy Flink job and green cluster metrics only tell me the pipes are moving; they do not prove the numbers are trustworthy. So I need both system observability and data observability before I call the pipeline healthy.",
    followUp: "Which correctness checks would block Gold publish immediately versus only raise an alert?",
    badAnswer: "If the jobs are green and the DAG succeeded, I assume the pipeline is correct.",
    linkedTab: "data-quality" as DataEngineeringTabSlug,
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
