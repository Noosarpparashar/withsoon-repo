"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge as FlowEdge,
  type Node as FlowNode,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { copyTextToClipboard } from "../netflix-tabs/clipboard";
import StartHereDesktopExperience from "./StartHereDesktopExperience";
import {
  ARCHITECTURE_NODES,
  ARCHITECTURE_REVEALS,
  BATCH_DAG_STEPS,
  CHEAT_SHEET_CONTENT,
  DATA_ENGINEERING_TAB_META,
  DATA_ENGINEERING_TABS,
  DATA_TRACK_NUMBERS,
  DQ_INVESTIGATION_PATH,
  DQ_METRICS,
  DQ_SEVERITIES,
  EVENT_FAMILIES,
  FEATURE_STORE_CONTENT,
  FLINK_JOBS,
  GOVERNANCE_CHECKLIST,
  GOVERNANCE_FIELDS,
  INGESTION_LANES,
  INTERVIEW_QUESTIONS,
  KAFKA_TOPICS,
  LAKEHOUSE_LAYERS,
  LATE_EVENT_POLICY,
  LATENCY_SLA_ROWS,
  MOCK_INTERVIEW_RUBRIC,
  MOCK_INTERVIEW_STEPS,
  NFRS,
  RELIABILITY_INCIDENTS,
  REPLAY_FLOW,
  REQUIREMENT_DOMAINS,
  SCALE_DEFAULTS,
  SERVING_MATRIX,
  SESSIONIZATION_SCENARIOS,
  TABLE_SCHEMAS,
  TRADEOFFS,
  WATCH_TIME_DEFINITIONS,
  WATCH_TIME_RULES,
  WATCH_TIME_TIMELINE,
  normalizeDataEngineeringTab,
  type DataEngineeringTabSlug,
} from "./data";

const T = {
  bg: "var(--bg)",
  card: "var(--bg-card)",
  card2: "var(--bg-muted)",
  border: "var(--border)",
  text: "var(--text)",
  muted: "var(--text-muted)",
  faint: "var(--text-faint)",
  red: "#e50914",
  amber: "#f59e0b",
  gold: "#fbbf24",
  blue: "#38bdf8",
  violet: "#8b5cf6",
  purple: "#a855f7",
  green: "#22c55e",
  orange: "#f97316",
} as const;

type WatchMetricMode = (typeof WATCH_TIME_DEFINITIONS)[number]["id"];
type EventFamilyId = (typeof EVENT_FAMILIES)[number]["id"];
type EventId = (typeof EVENT_FAMILIES)[number]["events"][number]["id"];
type ArchitectureNodeId = (typeof ARCHITECTURE_NODES)[number]["id"];
type IngestionLaneId = (typeof INGESTION_LANES)[number]["id"];
type KafkaTopicId = (typeof KAFKA_TOPICS)[number]["id"];
type FlinkJobId = (typeof FLINK_JOBS)[number]["id"];
type SessionScenarioId = (typeof SESSIONIZATION_SCENARIOS)[number]["id"];
type LakehouseLayerId = (typeof LAKEHOUSE_LAYERS)[number]["id"];
type TableName = (typeof TABLE_SCHEMAS)[number]["name"];
type TableColumnName = (typeof TABLE_SCHEMAS)[number]["columns"][number]["name"];
type BatchStepId = (typeof BATCH_DAG_STEPS)[number]["id"];
type DqMetricLabel = (typeof DQ_METRICS)[number]["label"];
type GovernanceFieldName = (typeof GOVERNANCE_FIELDS)[number]["name"];
type ServingWorkload = (typeof SERVING_MATRIX)[number]["workload"];
type ReliabilityIncidentId = (typeof RELIABILITY_INCIDENTS)[number]["id"];
type TradeoffDecision = (typeof TRADEOFFS)[number]["decision"];
type InterviewQuestionId = (typeof INTERVIEW_QUESTIONS)[number]["id"];
type OutlineItem = { id: string; title: string; note: string };
type DepthMode = "beginner" | "senior" | "staff";
type Section4EnvelopeFieldId = "event_id" | "event_time" | "ingestion_time" | "event_version" | "session_id" | "producer_trace";
type Section4TopicChoiceId = "session_id" | "profile_id" | "title_id" | "random";
type Section4FactId = "fact_playback_session" | "fact_browse_impression" | "fact_recommendation_impression";
type Section4DimensionId = "dim_profile" | "dim_title" | "dim_device" | "dim_geography" | "dim_experiment" | "dim_date" | "dim_ui_row" | "dim_recommendation_model";
type Section4ControlId = "late_data" | "scd2" | "quality" | "cost";

const PRODUCT_TAB_SECTIONS: Record<DataEngineeringTabSlug, OutlineItem[]> = {
  "start-here": [
    { id: "platform-mission", title: "Platform mission", note: "Show the platform shape." },
    { id: "requirements-snapshot", title: "Requirements", note: "Keep the requirement list light." },
    { id: "scope-boundary", title: "Scope", note: "Keep one clean interview slice." },
    { id: "freshness-map", title: "Freshness map", note: "Turn vague real-time language into measurable targets." },
    { id: "handoff", title: "Handoff", note: "Close before capacity estimation." },
  ],
  requirements: [
    { id: "req-scope", title: "Estimation story", note: "Show the math path first." },
    { id: "req-scale", title: "Safe baseline", note: "Use one interview-safe model." },
    { id: "req-domains", title: "Derived numbers", note: "Translate assumptions into scale." },
    { id: "req-nfr", title: "Board formulas", note: "Write only the formulas that matter." },
    { id: "req-say", title: "Punchline", note: "Close with the system-design implication." },
  ],
  "event-sources": [
    { id: "sources-map", title: "Source map", note: "Producers and key event families." },
    { id: "sources-contract", title: "Event contract", note: "Fields, topics, and consumers." },
    { id: "sources-lineage", title: "Population flow", note: "How sources become trusted tables." },
    { id: "sources-say", title: "Say this", note: "Explain why sources come first." },
  ],
  architecture: [
    { id: "arch-layered", title: "Architecture map", note: "One high-level interactive diagram." },
  ],
  "ingestion-kafka": [
    { id: "contracts-envelope", title: "Event envelope", note: "Canonical fields and why they exist." },
    { id: "contracts-ordering", title: "Topic + ordering", note: "Partition keys, ordering, and partition math." },
    { id: "contracts-controls", title: "Controls", note: "Late data, SCD2, DQ, and cost." },
    { id: "contracts-say", title: "Say this", note: "Interview-ready chapter close." },
  ],
  "real-time-streaming": [
    { id: "rt-jobs", title: "Streaming jobs", note: "What each Flink flow owns." },
    { id: "rt-watch", title: "Watch-time rules", note: "Heartbeat truth and metric logic." },
    { id: "rt-session", title: "Sessionization", note: "How noisy events become sessions." },
    { id: "rt-late", title: "Late data", note: "Watermarks, updates, and correction." },
    { id: "rt-say", title: "Say this", note: "Streaming answer shape." },
  ],
  "batch-pipelines": [
    { id: "batch-dag", title: "Daily DAG", note: "Official batch truth publication." },
    { id: "lakehouse-layout", title: "Storage flow", note: "How raw inputs move into Bronze, Silver, Gold, and serving." },
    { id: "batch-gates", title: "Quality gates", note: "Readiness and publish conditions." },
  ],
  "data-modeling": [
    { id: "model-erd", title: "ER diagram", note: "Facts, dims, columns, and joins." },
    { id: "model-say", title: "Interview answer", note: "Explain modeling by grain first." },
  ],
  "warehouse-serving": [
    { id: "serve-matrix", title: "Workload matrix", note: "Which consumer uses which store." },
    { id: "serve-freshness", title: "Freshness matrix", note: "Expected latency by consumer." },
    { id: "serve-say", title: "Say this", note: "Serving layer interview line." },
  ],
  "feature-store-experimentation": [
    { id: "feature-online-offline", title: "Online vs offline", note: "Separate low latency from training truth." },
    { id: "feature-experiment", title: "Experimentation", note: "Assignments, exposure, and analysis." },
    { id: "feature-say", title: "Say this", note: "How DE supports ML without becoming ML mode." },
  ],
  "governance-quality": [
    { id: "gov-contracts", title: "Trust flow", note: "Contract, validate, certify, publish." },
    { id: "gov-quality", title: "Release control", note: "What blocks publish and how failures are investigated." },
    { id: "gov-incidents", title: "Failure flow", note: "What the team does after trust fails." },
    { id: "gov-privacy", title: "Privacy ops", note: "PII policy, deletion flow, and operating ownership." },
  ],
  "backfill-replay": [
    { id: "replay-late", title: "Late events", note: "Watermarks and correction windows." },
    { id: "replay-dlq", title: "DLQ / quarantine", note: "Route bad events safely." },
    { id: "replay-backfill", title: "Audited backfill", note: "How official metrics get corrected." },
    { id: "replay-say", title: "Say this", note: "Correction workflow in interview language." },
  ],
  "capacity-cost": [
    { id: "cost-scale", title: "Scale math", note: "Throughput, partitions, and storage." },
    { id: "cost-tradeoffs", title: "Cost levers", note: "Where compute and storage spend moves." },
  ],
  failures: [
    { id: "failures-playbook", title: "Incident playbook", note: "Detection, mitigation, recovery." },
    { id: "failures-matrix", title: "Failure matrix", note: "Schema breaks, lag, stale Gold, skew." },
    { id: "failures-say", title: "Say this", note: "Failure answer shape." },
  ],
  quiz: [
    { id: "quiz-followups", title: "Q/A", note: "Interview follow-up questions." },
  ],
  "cheat-sheet": [
    { id: "cheat-short", title: "Answer versions", note: "30-second, 2-minute, 5-minute." },
    { id: "cheat-formulas", title: "Formulas", note: "Scale, watch-time, and partitions." },
    { id: "cheat-copy", title: "Print / copy", note: "Takeaway revision actions." },
  ],
};

const TAB_INTERVIEW_LINES: Record<DataEngineeringTabSlug, string> = {
  "start-here": "I will scope this as the Netflix data platform behind events, streaming, lakehouse, analytics, quality, and replay rather than the playback backend itself.",
  requirements: "I estimate from a small set of assumptions, derive throughput and storage, and then explain how those numbers force partitioning, replay, and a shared batch-plus-stream backbone.",
  "event-sources": "Before I design Kafka or tables, I want to make the event sources explicit so the interviewer can see what data exists, who produces it, and what each event feeds.",
  architecture: "My architecture is layered: emit, validate, publish to Kafka, process in streaming and batch, store in Bronze/Silver/Gold, and serve BI plus features with governance around every layer.",
  "ingestion-kafka": "I define one canonical event envelope first, then choose Kafka keys for ordering, then turn clean Silver events into conformed facts and dimensions so every dashboard, experiment, and model reads the same business truth.",
  "real-time-streaming": "The streaming layer turns raw events into trusted near-real-time facts using keyed state, watermarking, sessionization, and clearly defined metric logic like heartbeat-based watch time.",
  "batch-pipelines": "Batch plus the lakehouse own trusted history: Bronze preserves raw truth, Silver creates reusable clean assets, and Gold publishes the official outputs that dashboards, finance, and training sets rely on.",
  "data-modeling": "I explain the model by grain first, then facts and dimensions, then how each table is populated, partitioned, and consumed downstream.",
  "warehouse-serving": "Different consumers need different serving layers, so I match BI, ad hoc SQL, real-time OLAP, and raw forensic queries to the right engines instead of forcing one store to do everything.",
  "feature-store-experimentation": "DE owns the freshness and correctness of feature data by separating online and offline paths while preserving point-in-time joins and experiment exposure lineage.",
  "governance-quality": "Schema contracts, DQ checks, privacy controls, and audit trails are not side notes here; they are operating requirements of the platform.",
  "backfill-replay": "Streaming gives speed, but replay, quarantine, and audited backfills are how we recover correctness when late data or bad code reaches production.",
  "capacity-cost": "I derive capacity from event math, then show how topic retention, compaction, cluster sizing, storage layout, and query engine choices control cost.",
  failures: "For failures, I describe detection, blast radius, immediate mitigation, safe recovery, and what design change prevents the same class of incident next time.",
  quiz: "When the interviewer pushes deeper, I answer with one clear position, one concrete trade-off, and the right Netflix technology names in the right place.",
  "cheat-sheet": "My cheat sheet reduces the full design into a few answer versions, formulas, and red-flag mistakes so I can recall it quickly under interview pressure.",
};

const VISIBLE_DATA_ENGINEERING_TABS = DATA_ENGINEERING_TABS.filter((tab) => tab.id !== "failures" && tab.id !== "cheat-sheet");

const SECTION4_ENVELOPE_FIELDS = [
  {
    id: "event_id",
    label: "event_id",
    line: '"event_id": "uuid-123",',
    color: T.red,
    icon: "🧾",
    meaning: "Business dedup key across retries, offline replays, and duplicate submits.",
    interviewUse: "Use this when you explain why exactly-once infrastructure still needs logical deduplication.",
    example: "Example: the TV app retries the same playback_started call after reconnecting, so both copies carry the same event_id.",
  },
  {
    id: "event_time",
    label: "event_time",
    line: '"event_time": "2026-07-30T04:20:00Z",',
    color: T.blue,
    icon: "⏱️",
    meaning: "The moment the user action happened. Windows, freshness, and point-in-time joins should anchor here.",
    interviewUse: "This is how you separate user truth from platform delay.",
    example: "Example: the member pressed play at 8:00:00 PM, even if the platform sees the record a few seconds later.",
  },
  {
    id: "ingestion_time",
    label: "ingestion_time",
    line: '"ingestion_time": "2026-07-30T04:20:02Z",',
    color: T.green,
    icon: "📥",
    meaning: "Measures source-to-platform delay and helps detect bad client clocks.",
    interviewUse: "Bring this up when you talk about late events, quarantine rules, or freshness dashboards.",
    example: "Example: if event_time says 8:00:00 PM and ingestion_time is 8:00:02 PM, source-to-platform lag is 2 seconds.",
  },
  {
    id: "event_version",
    label: "event_version",
    line: '"event_version": 3,',
    color: T.violet,
    icon: "🧩",
    meaning: "Makes schema and semantic evolution explicit so field meaning never changes silently.",
    interviewUse: "This is your clean compatibility answer.",
    example: "Example: version 3 can add experiment_assignments without breaking older readers that still understand version 2.",
  },
  {
    id: "session_id",
    label: "session_id",
    line: '"session_id": "playback-session-42",',
    color: T.amber,
    icon: "🎬",
    meaning: "Best source partition key for playback ordering because play, pause, seek, and heartbeat stay together.",
    interviewUse: "Tie it directly to topic design and sessionization.",
    example: "Example: one movie session emits start -> heartbeat -> pause -> seek -> stop, and all of them stay on one Kafka partition.",
  },
  {
    id: "producer_trace",
    label: "producer + trace_id",
    line: '"producer": "playback-service", "trace_id": "abc-789",',
    color: "#fb7185",
    icon: "🛰️",
    meaning: "Carries ownership, escalation path, and debugging context with every record.",
    interviewUse: "Useful for lineage and on-call explanations.",
    example: "Example: if QoE metrics spike, trace_id helps connect the bad record back to the exact producer request path.",
  },
] as const satisfies Array<{
  id: Section4EnvelopeFieldId;
  label: string;
  line: string;
  color: string;
  icon: string;
  meaning: string;
  interviewUse: string;
  example: string;
}>;

const SECTION4_TOPIC_CHOICES = [
  {
    id: "session_id",
    label: "session_id",
    icon: "🎬",
    color: T.green,
    goodAt: "All events for one playback journey land on the same partition, so the stream processor sees play, pause, seek, heartbeat, and stop in the right sequence without cross-partition stitching.",
    risk: "You preserve ordering only inside one session. If the same member starts a second session on another device, those two sessions can be processed independently and are not globally ordered at member level.",
    interviewVerdict: "Best default for playback topics because session correctness matters more than cross-session ordering.",
    technicalExample: "If `session_id = s_9812`, every heartbeat for that movie session hashes to one partition. A Flink keyBy on session_id can then hold one keyed state object and compute watch time without repartitioning first.",
  },
  {
    id: "profile_id",
    label: "profile_id",
    icon: "👤",
    color: T.blue,
    goodAt: "Useful when the downstream question is member-centric, such as building a user activity timeline or joining browse, search, and playback behavior for one profile in sequence.",
    risk: "Heavy users or shared household profiles can skew traffic badly. A few power profiles can create hotter partitions than the rest of the topic, especially during prime time.",
    interviewVerdict: "Reasonable for member-journey analytics, but weaker than session_id for playback event correctness.",
    technicalExample: "If one kid profile on a shared TV emits browse, autoplay previews, and playback events all evening, its profile_id can dominate a single partition while others stay underutilized.",
  },
  {
    id: "title_id",
    label: "title_id",
    icon: "🍿",
    color: T.red,
    goodAt: "Feels attractive when the main downstream query is title-level aggregation, for example trending, title watch hours, or release monitoring.",
    risk: "This is the classic hot-key trap. A blockbuster release can send an enormous fraction of all playback events for that hour into one or two partitions, causing lag even when the cluster looks healthy overall.",
    interviewVerdict: "Avoid at the source topic. Keep source ordering safe, then repartition by title_id later inside Flink or Spark for title-heavy aggregates.",
    technicalExample: "If a new season launches and `title_id = stranger-things-s5e1` receives 8% of topic traffic, the partition owning that hash becomes the bottleneck while other consumers sit mostly idle.",
  },
  {
    id: "random",
    label: "random / event_id",
    icon: "🎲",
    color: T.violet,
    goodAt: "Gives the cleanest distribution across partitions and minimizes hot-key risk because the hashing is effectively uniform.",
    risk: "You lose business ordering. Sessionization, dedup around related records, and any per-entity stateful logic become much harder because related events are scattered across the cluster.",
    interviewVerdict: "Great for pure load spread, poor for any workload that needs entity-level ordering or keyed state.",
    technicalExample: "Two consecutive heartbeat events from the same playback session may land on different partitions, which means the stream processor must reshuffle before it can safely compute session state.",
  },
] as const satisfies Array<{
  id: Section4TopicChoiceId;
  label: string;
  icon: string;
  color: string;
  goodAt: string;
  risk: string;
  interviewVerdict: string;
  technicalExample: string;
}>;

const SECTION4_FACTS = [
  {
    id: "fact_playback_session",
    title: "fact_playback_session",
    icon: "▶️",
    color: T.red,
    grain: "One closed playback session for one profile-title-device combination.",
    measures: ["watch_duration", "completion_pct", "startup_latency", "rebuffer_ms"],
    dimensions: ["dim_profile", "dim_title", "dim_device", "dim_geography", "dim_experiment", "dim_date"],
    note: "This is the clean interview fact because it turns noisy events into trusted session truth.",
  },
  {
    id: "fact_browse_impression",
    title: "fact_browse_impression",
    icon: "🧭",
    color: T.blue,
    grain: "One rendered title card in one page/row/position context.",
    measures: ["impression_count", "visible_duration", "dwell_time"],
    dimensions: ["dim_profile", "dim_title", "dim_device", "dim_geography", "dim_ui_row", "dim_date"],
    note: "Great for explaining discovery funnels before playback starts.",
  },
  {
    id: "fact_recommendation_impression",
    title: "fact_recommendation_impression",
    icon: "🎯",
    color: T.violet,
    grain: "One recommended title shown in one recommendation request.",
    measures: ["rank", "model_score", "click_flag", "eventual_watch_time"],
    dimensions: ["dim_profile", "dim_title", "dim_recommendation_model", "dim_experiment", "dim_ui_row", "dim_date"],
    note: "Shows how experimentation and ML still depend on dimensional modeling.",
  },
] as const satisfies Array<{
  id: Section4FactId;
  title: string;
  icon: string;
  color: string;
  grain: string;
  measures: readonly string[];
  dimensions: readonly Section4DimensionId[];
  note: string;
}>;

const SECTION4_DIMENSIONS = [
  {
    id: "dim_profile",
    title: "dim_profile",
    icon: "🙂",
    color: T.green,
    purpose: "Tokenized analytics identity with profile-level preferences and status.",
    fields: ["profile_sk", "language", "maturity_setting", "created_date"],
    scd: "Type 2 when preference or status history changes metric interpretation.",
  },
  {
    id: "dim_title",
    title: "dim_title",
    icon: "🎞️",
    color: T.blue,
    purpose: "Content metadata for movies, series, episodes, genre bridges, and language context.",
    fields: ["title_sk", "content_type", "runtime_min", "original_language"],
    scd: "Type 2 when historical metadata corrections matter.",
  },
  {
    id: "dim_device",
    title: "dim_device",
    icon: "📺",
    color: T.amber,
    purpose: "Device family and capability context for playback and QoE slices.",
    fields: ["device_sk", "device_family", "os", "hdr_support"],
    scd: "Type 2 when software or firmware changes behavior materially.",
  },
  {
    id: "dim_geography",
    title: "dim_geography",
    icon: "🌍",
    color: "#14b8a6",
    purpose: "Country, region, timezone, and regulatory grouping for reporting and licensing cuts.",
    fields: ["geo_sk", "country_code", "region", "timezone"],
    scd: "Usually stable; version only when hierarchy corrections matter.",
  },
  {
    id: "dim_experiment",
    title: "dim_experiment",
    icon: "🧪",
    color: T.violet,
    purpose: "Owner, hypothesis, variant, and metric context for controlled rollouts.",
    fields: ["experiment_sk", "variant", "owner_team", "primary_metric"],
    scd: "Versioned and immutable once exposure starts.",
  },
  {
    id: "dim_date",
    title: "dim_date",
    icon: "📅",
    color: T.red,
    purpose: "Calendar-friendly cuts that keep BI and finance queries simple and consistent.",
    fields: ["date_sk", "week", "month", "holiday_flag"],
    scd: "Static.",
  },
  {
    id: "dim_ui_row",
    title: "dim_ui_row",
    icon: "🪄",
    color: "#06b6d4",
    purpose: "Recommendation and browse placement context like row type, surface, and position family.",
    fields: ["row_sk", "surface", "row_type", "placement_group"],
    scd: "Type 2 when taxonomy or placement logic changes.",
  },
  {
    id: "dim_recommendation_model",
    title: "dim_recommendation_model",
    icon: "🤖",
    color: "#c084fc",
    purpose: "Model lineage, version, and feature-set context behind every recommendation decision.",
    fields: ["model_sk", "model_name", "model_version", "training_snapshot"],
    scd: "Immutable model versions rather than mutable overwrite.",
  },
] as const satisfies Array<{
  id: Section4DimensionId;
  title: string;
  icon: string;
  color: string;
  purpose: string;
  fields: readonly string[];
  scd: string;
}>;

const SECTION4_CONTROLS = [
  {
    id: "late_data",
    title: "Late data + duplicates",
    icon: "⏳",
    color: T.amber,
    summary: "Use event_id for business dedup, event_time for truth, ingestion_time for delay, and split fast metrics from corrected historical truth.",
    cues: ["24h dedup TTL", "5-10m watermark", "30-60m allowed lateness", "very-late -> correction path"],
    examples: [
      "A smart TV goes offline, buffers 20 minutes of heartbeat events locally, then uploads them once the member reconnects. The platform can still treat event_time as truth while ingestion_time shows the late arrival.",
      "The same playback_started request is retried twice after a flaky network hop. event_id keeps the session start count idempotent instead of inflating total starts.",
    ],
  },
  {
    id: "scd2",
    title: "SCD2 + point-in-time joins",
    icon: "🧠",
    color: T.violet,
    summary: "Facts should join to the dimension row valid at the event timestamp, not the latest row today.",
    cues: ["plan changes", "title metadata fixes", "experiment config history", "unknown key then repair"],
    examples: [
      "A member watched on the Standard plan yesterday and upgrades to Premium today. Yesterday's watch fact must still resolve to the Standard-plan dimension row.",
      "A title's genre mapping is corrected next week, but last month's report should still use the dimension version that was valid at the original watch timestamp.",
    ],
  },
  {
    id: "quality",
    title: "Quality gates",
    icon: "🛡️",
    color: T.green,
    summary: "Check schema, enums, nulls, lag, counts, and referential integrity before publishing trusted tables.",
    cues: ["schema registry", "quarantine bad events", "source-sink reconciliation", "fact-dim integrity"],
    examples: [
      "A producer suddenly sends `device_type = smarttvv`, which fails enum validation and is quarantined instead of silently entering trusted tables.",
      "A playback fact arrives with `title_id` missing, so it is flagged before it can corrupt title-level dashboards or break referential joins into dim_title.",
    ],
  },
  {
    id: "cost",
    title: "Cost controls",
    icon: "💸",
    color: T.gold,
    summary: "Use bounded-cardinality partitions, short hot retention, and tier older data down instead of keeping everything forever-hot.",
    cues: ["Bronze by ingestion_date/hour", "avoid profile_id partitions", "compaction", "selective marts"],
    examples: [
      "Bronze partitions by `ingestion_date/hour` instead of `profile_id`, so a replay job scans a few broad partitions instead of millions of tiny files.",
      "Kafka keeps only a few hot recovery hours, while Iceberg carries the long replay window. That keeps broker storage bounded without losing historical correction ability.",
    ],
  },
] as const satisfies Array<{
  id: Section4ControlId;
  title: string;
  icon: string;
  color: string;
  summary: string;
  cues: readonly string[];
  examples: readonly string[];
}>;

const STREAMING_JOB_EXPLANATIONS: Record<
  FlinkJobId,
  {
    runtime: string;
    whyThisShape: string;
    outputUse: string;
  }
> = {
  "playback-sessionizer": {
    runtime:
      "This job reads heartbeat, buffer, pause, and seek events for the same viewing attempt, deduplicates retries, and keeps one mutable keyed state object for the active session. Every valid event updates last_event_time, watch_seconds, pause_count, seek_count, and watched_segments until the close rule fires.",
    whyThisShape:
      "It keys by user/profile/content/device because one playback attempt needs ordered state on one lane. That lets Flink decide whether the next heartbeat extends the same session, closes it, or starts a new one after inactivity.",
    outputUse:
      "The emitted session updates feed Silver fact tables, downstream QoE analysis, and later Gold rollups. This is the step that turns noisy micro-events into trusted session-level truth.",
  },
  "watchtime-aggregator": {
    runtime:
      "This job treats valid heartbeats as the source of truth for engagement watch time. It increments watch_seconds only when playback is truly active, updates unique coverage, and continuously refreshes short-horizon counters during the session.",
    whyThisShape:
      "It keys by session_id because watch-time logic is session-local and needs strict ordering of heartbeats, pauses, and resumes. The short tumbling updates keep live metrics fresh while finalization keeps totals trustworthy.",
    outputUse:
      "Its outputs power real-time dashboards, session progress, and Gold-ready aggregates that batch jobs can later reconcile rather than recompute from scratch every time.",
  },
  "trending-detector": {
    runtime:
      "This job joins impression, click, and play signals into short rolling windows, calculates velocity instead of raw count alone, and keeps per-title regional counters in state so the hottest content can be refreshed every minute.",
    whyThisShape:
      "It keys by content_id plus region because the business question is local popularity, not global member behavior. The sliding window catches rising momentum quickly while avoiding day-scale lag.",
    outputUse:
      "It publishes top-N title rankings into Redis or Pinot-style serving layers so home-page rows, dashboards, or operational monitors can react to demand spikes within minutes.",
  },
  "qoe-monitor": {
    runtime:
      "This job aggregates buffer starts, buffer ends, bitrate changes, and CDN-side quality signals into short rolling QoE views. It turns low-level player telemetry into human-meaningful indicators such as rebuffer spikes, startup pain, or regional degradation.",
    whyThisShape:
      "It keys by session or by device/region bucket depending on the alerting goal. The aim is not long history here; it is fast detection of live playback pain before customers pile onto support channels.",
    outputUse:
      "The outputs drive alert topics and real-time operational dashboards in Pinot or Druid so on-call teams can see whether a problem is isolated to one ISP, one app version, or one release.",
  },
  "fraud-anomaly": {
    runtime:
      "This job watches auth, billing, and service signals for suspicious sequences such as repeated payment failures, impossible geo movement, or abusive login behavior. Stateful counters and short CEP-style patterns decide when a threshold becomes alert-worthy.",
    whyThisShape:
      "It keys by the suspicious entity or fraud pattern because the goal is to link related events that are harmless individually but risky in sequence. The state is lightweight but sensitive to skew and false positives.",
    outputUse:
      "It emits alert events for downstream review systems and on-call channels, helping trust-and-safety teams react before abuse or fraud fans out.",
  },
  "realtime-features": {
    runtime:
      "This job updates online feature values as soon as the member searches, watches, or clicks. It maintains short-horizon features such as recent titles, active context, or popularity counters that need to be available in serving stores immediately.",
    whyThisShape:
      "It keys by user or profile because recommendation and personalization lookups are entity-centric. Continuous state updates keep online features warm without waiting for the next batch pipeline.",
    outputUse:
      "It writes to Redis or DynamoDB-style stores that recommendation services can read directly, while offline jobs later rebuild the same feature definitions for training and consistency checks.",
  },
};

const SESSION_SCENARIO_EXPLANATIONS: Record<
  SessionScenarioId,
  {
    whatFlinkDoes: string;
    whyItMatters: string;
  }
> = {
  normal: {
    whatFlinkDoes:
      "Flink sees a straightforward ordered sequence: play, periodic heartbeats, then stop. It opens session state on the first play, increments watch metrics on each valid heartbeat, and closes the session explicitly when stop or complete arrives.",
    whyItMatters:
      "This is the baseline path every other scenario is compared against. If the normal path is not crisp, pause logic, late updates, and crash recovery all become harder to reason about.",
  },
  "long-pause": {
    whatFlinkDoes:
      "When pause is followed by a long gap, Flink should close the active playback session after the inactivity timeout so paused time is not counted as engagement. Later resume events can still be linked into a broader viewing journey if they land inside the continuation threshold.",
    whyItMatters:
      "This is the difference between session truth and journey truth. Session metrics protect watch-time correctness, while journey grouping keeps the product story coherent when the same viewing attempt continues later.",
  },
  "app-crash": {
    whatFlinkDoes:
      "No stop event ever arrives, so the job cannot wait forever. It uses last_event_time plus inactivity timeout to auto-close the session and preserve the partial but trusted watch metrics already seen.",
    whyItMatters:
      "Real clients are unreliable. If the pipeline depends on perfect stop or pause events, crashed apps leave sessions open forever and inflate concurrency, watch time, and buffering summaries.",
  },
  "offline-sync": {
    whatFlinkDoes:
      "The live stream processes what it can, but when buffered mobile or TV events sync later, Flink uses event_time to decide whether the session is still inside allowed lateness. If not, a correction path patches Silver and Gold later.",
    whyItMatters:
      "This is how the system balances speed with correctness. Live dashboards stay responsive, but historical truth still gets repaired once delayed client telemetry finally arrives.",
  },
  duplicates: {
    whatFlinkDoes:
      "Flink checks event_id before updating state. If the same heartbeat arrives twice because a client retried, the second copy is ignored and the session counters remain stable.",
    whyItMatters:
      "Duplicate retries are common at scale. Without this guardrail, every transient network issue inflates watch time and corrupts business metrics.",
  },
  "device-switch": {
    whatFlinkDoes:
      "A new device_id creates a new playback session even if the member resumes the same title minutes later. A higher-level journey model can still connect those separate sessions when the continuation threshold says they belong together.",
    whyItMatters:
      "Playback sessions are operational truth; viewing journeys are behavioral truth. Mixing them into one table too early makes both stories harder to trust.",
  },
};

const DATA_CONTRACT_CARDS = [
  {
    title: "Ownership",
    detail: "Every event family names an owning team, schema steward, and paging contact before it can publish into the platform.",
  },
  {
    title: "Schema rules",
    detail: "Required fields, enum compatibility, timestamp semantics, and PII tags are validated before events reach durable topics.",
  },
  {
    title: "Breaking change path",
    detail: "Breaking changes fork versioned schemas or topics, notify downstream owners, and block deploys until compatibility checks pass.",
  },
] as const;

const GOVERNANCE_MUST_KNOW = [
  {
    title: "What blocks publish",
    detail: "Gold should publish only after explicit trust gates pass. Strong interview answers make those gates concrete.",
    accent: T.red,
  },
  {
    title: "How bad data recovers",
    detail: "Quarantine, replay, and backfill must look like normal operating paths rather than heroic cleanup work.",
    accent: T.amber,
  },
  {
    title: "Who owns the failure",
    detail: "Every contract, DQ breach, and privacy workflow needs a named owner plus an escalation path.",
    accent: T.green,
  },
] as const;

const SCHEMA_EVOLUTION_RULES = [
  "If playback producers add optional fields like `player_build`, `network_type`, or `cdn_pop`, keep the event backward compatible so existing Flink jobs and Silver tables keep reading safely.",
  "If a field changes meaning or type, such as watch-time semantics or QoE status enums, cut a new schema version and migrate Flink, Spark, dbt, and certified marts in a controlled window.",
  "Before the producer deploys, CI should validate sample playback payloads against schema registry rules so broken contracts never silently enter Bronze.",
  "If a bad version still escapes, freeze official publish and quarantine that versioned slice instead of letting corrupted playback facts roll into Gold KPIs.",
] as const;

const CERTIFIED_DATASET_RULES = [
  "Certified Gold marts are the default source for dashboards, finance, and executive KPI reviews.",
  "Silver is trusted engineering truth, but not automatically an official stakeholder-facing dataset.",
  "Every certified table should expose owner, freshness SLA, lineage, last successful publish, and rollback version.",
] as const;

const PUBLISH_BLOCKERS = [
  {
    eyebrow: "Blocks publish",
    title: "Hard block",
    detail: "Missing source partitions, schema incompatibility, failed referential integrity, or reconciliation mismatch stops official publish.",
    accent: T.red,
  },
  {
    eyebrow: "Warns owner",
    title: "Conditional alert",
    detail: "A non-critical dimension lag or metadata gap can alert owners without blocking Gold if business metrics remain trustworthy.",
    accent: T.amber,
  },
  {
    eyebrow: "Consumer view",
    title: "Release behavior",
    detail: "Failed runs stay in staging snapshots. Consumers keep reading the last clean official version until trust is restored.",
    accent: T.green,
  },
] as const;

const RECONCILIATION_CHECKS = [
  "Source -> Bronze: expected partitions and raw counts arrived for the publish window.",
  "Bronze -> Silver: dedup, null-rate, enum, and timestamp sanity checks stay inside tolerance.",
  "Silver -> Gold: business totals reconcile against trusted facts before official publish.",
  "Fact -> dimension: unknown keys stay below threshold or route to repair before publish.",
  "Metric versioning: changed formulas reconcile against prior definitions before replacing certified KPIs.",
] as const;

const QUARANTINE_REPLAY_FLOW = [
  "Contract or DQ rule fails",
  "Write record to quarantine / DLQ with reason code and owner",
  "Notify producer or pipeline owner with sample payload and blast radius",
  "Fix source schema, mapping, join logic, or threshold configuration",
  "Replay quarantined records into Bronze or Silver repair flow",
  "Re-run reconciliation, then publish only after validation turns green",
] as const;

const GOVERNANCE_OWNERSHIP_LADDER = [
  {
    title: "Producer owner",
    detail: "Owns source schema, enums, payload correctness, and bad-event fixes at the source.",
  },
  {
    title: "Pipeline owner",
    detail: "Owns Silver / Gold logic, DQ thresholds, replay correctness, and publish gates.",
  },
  {
    title: "Data product owner",
    detail: "Owns certified metric semantics, stakeholder communication, and signoff for business-facing tables.",
  },
  {
    title: "Privacy / governance owner",
    detail: "Owns access policy, delete propagation, audit evidence, and sensitive-field exceptions.",
  },
] as const;

const DELETE_PROPAGATION_FLOW = [
  "Receive delete request or legal-policy trigger",
  "Resolve all subject keys: member, profile, device, billing links",
  "Tombstone or mask raw references where policy requires",
  "Rebuild or purge Silver and Gold derivatives",
  "Invalidate warehouse extracts, feature tables, caches, and downstream exports",
  "Write auditable completion record with scope, version, and timestamp",
] as const;

const GOVERNANCE_TRUST_QUESTIONS = [
  {
    question: "What changes are backward compatible?",
    answer:
      "Additive schema changes are the safe default: new optional fields, new enum values behind compatibility rules, and new downstream consumers that do not change existing field meaning.",
    color: T.blue,
  },
  {
    question: "Why is Silver not automatically official?",
    answer:
      "Silver is trusted engineering truth, but official business truth needs reconciliation, ownership signoff, freshness visibility, and a controlled publish boundary before stakeholders should consume it.",
    color: T.amber,
  },
  {
    question: "How do consumers know what version is certified?",
    answer:
      "Certified tables should expose owner, publish timestamp, lineage, freshness SLA, and a visible dataset or snapshot version so dashboards and analysts know exactly which official cut they are reading.",
    color: T.green,
  },
] as const;

const GOVERNANCE_RELEASE_QUESTIONS = [
  {
    question: "What is a hard publish blocker vs a warning-only breach?",
    answer:
      "A hard blocker means trust is broken, such as missing partitions, failed reconciliation, or referential-integrity failure. A warning-only breach means the issue is visible and owned, but the published business truth is still trustworthy.",
    color: T.red,
  },
  {
    question: "Where do failed records go and how are they replayed safely?",
    answer:
      "They go to quarantine or DLQ with reason code, owner, and sample payload. After the schema, mapping, or rule is fixed, the bad slice is replayed into Bronze or Silver repair flow and publish stays blocked until validation turns green again.",
    color: T.amber,
  },
  {
    question: "How do dashboards avoid partial truth during a failed run?",
    answer:
      "Dashboards keep reading the last certified Gold version. New staging output is invisible until all release gates pass, so consumers never mix yesterday's clean truth with today's half-finished batch.",
    color: T.green,
  },
] as const;

const GOVERNANCE_PRIVACY_QUESTIONS = [
  {
    question: "How do you prove GDPR or delete propagation completed end to end?",
    answer:
      "You keep an auditable completion record showing request scope, resolved subject keys, affected datasets, completion timestamp, and the downstream systems that were rebuilt, purged, or invalidated.",
    color: T.green,
  },
  {
    question: "Who can access raw PII and how is that audited?",
    answer:
      "Only a minimal approved set of services and operators should access raw PII through role-based policy, with every access logged so governance can review who touched the field, why, and when.",
    color: T.blue,
  },
  {
    question: "What gets masked in Silver, Gold, warehouse, and exports?",
    answer:
      "Raw identifiers may exist only in tightly controlled landing zones. Trusted and published layers should hash, tokenize, redact, or remove sensitive fields so downstream marts, exports, and analytics never expose unnecessary raw PII.",
    color: T.violet,
  },
] as const;

const DQ_INVESTIGATION_BY_METRIC: Record<DqMetricLabel, readonly string[]> = {
  Freshness: [
    "Check source partition readiness and ingestion lateness first.",
    "Check Kafka lag, consumer lag, or batch trigger delay next.",
    "Check whether publish was intentionally held by DQ or reconciliation gates.",
    "Confirm dashboards are still reading the last certified snapshot.",
  ],
  "Duplicate rate": [
    "Check producer retries and idempotency keys first.",
    "Check whether event_id dedup rules changed in stream or batch.",
    "Check Bronze raw counts against Silver deduped counts.",
    "Confirm duplicate spike is not isolated to one source partition or client version.",
  ],
  "Late event %": [
    "Check watermark stress and allowed-lateness settings first.",
    "Check client offline sync, mobile buffering, or delayed upload behavior.",
    "Check whether correction flow volume is rising in quarantine or replay.",
    "Confirm Gold publish is waiting for the intended late-arrival policy.",
  ],
  "DLQ count": [
    "Check the top reason codes in quarantine or DLQ first.",
    "Check whether a new schema version or enum value escaped producer CI.",
    "Check sample payloads to isolate one producer, field, or mapping path.",
    "Confirm replay is blocked until the failing contract or transform is fixed.",
  ],
  "SLA misses": [
    "Check whether source readiness or dependency arrival broke the run window.",
    "Check whether DQ or reconciliation gates intentionally delayed publish.",
    "Check whether compute capacity or checkpoint instability extended runtime.",
    "Confirm stakeholders are still on the last certified official version.",
  ],
  "Backfill status": [
    "Check the correction scope, target partitions, and replay slice first.",
    "Check whether repaired data is isolated from the official publish path.",
    "Check reconciliation between repaired output and current certified Gold.",
    "Confirm the backfill will publish atomically only after validation completes.",
  ],
} as const;

const TABLE_LINEAGE_FLOW = [
  "video.heartbeat / playback events",
  "Kafka playback topics",
  "Bronze immutable raw events",
  "Silver trusted playback session facts",
  "Gold content and user metrics",
  "BI dashboards + feature tables",
] as const;

const TOOL_MAPPING_CARDS = [
  {
    title: "Raw inputs",
    aws: "MSK + S3 drops",
    oss: "Kafka + CDC / partner files",
    why: "Playback events, dimension snapshots, and partner files arrive through different lanes before batch starts.",
  },
  {
    title: "Bronze landing",
    aws: "S3 + Glue Catalog",
    oss: "Iceberg Bronze tables",
    why: "Store immutable raw partitions first so replay, audit, and late correction stay possible.",
  },
  {
    title: "Silver build",
    aws: "EMR / Glue",
    oss: "Spark + dbt",
    why: "Batch joins, dedupes, normalizes, and validates raw inputs into reusable trusted tables.",
  },
  {
    title: "Gold publish",
    aws: "S3 + Iceberg snapshots",
    oss: "Iceberg / Parquet marts",
    why: "Official business tables are published atomically only after DQ and reconciliation pass.",
  },
  {
    title: "Serving",
    aws: "Redshift / Athena",
    oss: "Trino / Pinot",
    why: "Dashboards and analysts read Gold outputs from serving systems instead of touching raw storage directly.",
  },
] as const;

const ESTIMATION_FLOW = [
  {
    id: "inputs",
    label: "State assumptions",
    metric: "Choose a simple workload model",
    detail: "Start with a small set of assumptions that you can defend easily on a whiteboard.",
    accent: T.blue,
  },
  {
    id: "daily",
    label: "Find daily volume",
    metric: "Multiply into a daily total",
    detail: "Turn those assumptions into one daily event number before you talk about infrastructure.",
    accent: T.red,
  },
  {
    id: "peak",
    label: "Convert to peak",
    metric: "Go from average load to peak load",
    detail: "Average throughput is not enough. Convert it into a peak number so the design is sized for prime time.",
    accent: T.amber,
  },
  {
    id: "implication",
    label: "Turn numbers into design",
    metric: "Partitions, parallelism, retention",
    detail: "The estimate matters only because it drives partitions, stream parallelism, storage, and retention decisions.",
    accent: T.green,
  },
] as const;

const SAFE_BASELINE_ASSUMPTIONS = [
  {
    id: "active",
    label: "Daily active profiles or devices",
    value: "100M",
    detail: "Use one interview-safe counting unit such as active profiles or active devices. The point is not the exact Netflix internal number; the point is to stay internally consistent through the whole derivation.",
    accent: T.blue,
  },
  {
    id: "events",
    label: "Events per active profile/device/day",
    value: "200",
    detail: "This is not the whole platform total. It is the assumed daily event count for one active profile or one active device. Think of it as a rough bundle of plays, pauses, seeks, heartbeat updates, browse impressions, clicks, search actions, and playback-health signals.",
    accent: T.red,
  },
  {
    id: "size",
    label: "Average encoded event size",
    value: "1 KB",
    detail: "Use an Avro-like encoded payload assumption. This is not a wire-level guarantee; it is a convenient average that lets you translate event counts into bytes, storage, and ingress.",
    accent: T.amber,
  },
  {
    id: "peak",
    label: "Peak factor",
    value: "5×",
    detail: "A peak multiplier is what keeps your estimate interview-safe. Real systems are not sized only for the daily average.",
    accent: T.green,
  },
] as const;

const SAFE_BASELINE_OUTPUTS = [
  {
    id: "daily-events",
    label: "Daily events",
    value: "20B",
    explain: "100M × 200 = 20B events/day",
    detail: "This is the total from the simplified workload class we are using in the interview: active profiles or devices generating behavior plus telemetry throughout the day.",
    accent: T.red,
  },
  {
    id: "avg-throughput",
    label: "Average events/sec",
    value: "231K/s",
    explain: "20B / 86,400 ≈ 231K/s",
    detail: "Average throughput is the bridge from a daily count to infrastructure math. It is useful for baseline storage and throughput reasoning, but it is still not enough for production sizing.",
    accent: T.blue,
  },
  {
    id: "peak-throughput",
    label: "Peak events/sec",
    value: "1.15M/s",
    explain: "231K × 5 ≈ 1.15M/s",
    detail: "Peak throughput is what drives Kafka partitions, stream task parallelism, and hot-path network planning. This is the first number that starts directly shaping architecture.",
    accent: T.violet,
  },
  {
    id: "raw-payload",
    label: "Raw payload/day",
    value: "20 TB/day",
    explain: "20B × 1 KB ≈ 20 TB/day",
    detail: "This is raw payload only from the simplified workload class, before replication, fan-out to multiple sinks, compression deltas, or retention multipliers.",
    accent: T.gold,
  },
  {
    id: "peak-ingress",
    label: "Peak network ingress",
    value: "1.15 GB/s",
    explain: "1.15M/s × 1 KB ≈ 1.15 GB/s",
    detail: "This is the intuitive bridge from event counts to the infrastructure conversation.",
    accent: T.green,
  },
] as const;

const BOARD_FORMULAS = [
  {
    id: "avg-events",
    title: "Average events/sec",
    formula: "average_events_per_sec = daily_events / 86,400",
    example: "20B / 86,400 ≈ 231K/sec",
    meaning: "Convert a daily workload into a per-second baseline.",
    accent: T.blue,
  },
  {
    id: "peak-events",
    title: "Peak events/sec",
    formula: "peak_events_per_sec = average_events_per_sec × peak_factor",
    example: "231K × 5 ≈ 1.15M/sec",
    meaning: "Size the system for prime-time load, not only average traffic.",
    accent: T.red,
  },
  {
    id: "raw-bytes",
    title: "Raw bytes/day",
    formula: "raw_bytes_per_day = daily_events × average_event_size",
    example: "20B × 1 KB ≈ 20 TB/day",
    meaning: "Translate event counts into storage and network cost discussions.",
    accent: T.amber,
  },
  {
    id: "partitions",
    title: "Required partitions",
    formula: "required_partitions = max(partitions_by_events, partitions_by_bytes)",
    example: "1.15M/sec ÷ 10K/sec/partition = 115 partitions; if bytes/sec math gives 92, use 115.",
    meaning: "Partition count is bounded by both message frequency and payload throughput, so you size to whichever limit is stricter.",
    accent: T.violet,
  },
  {
    id: "parallelism",
    title: "Stream parallelism",
    formula: "stream_parallelism = peak_events_per_sec / safe_events_per_task",
    example: "1.15M/sec ÷ 25K/sec/task ≈ 46 tasks, then round up for operational headroom.",
    meaning: "Use measured task capacity instead of guessing how many Flink tasks you need.",
    accent: T.green,
  },
  {
    id: "storage",
    title: "Storage required",
    formula: "storage_required = daily_raw_bytes × retention_days × compression_factor × replication_or_fanout_factor",
    example: "20 TB/day × 365 × 1.0 × 3 ≈ 21.9 PB/year across retained copies and fan-out.",
    meaning: "Long-term cost comes from retention and fan-out as much as from raw ingest.",
    accent: T.gold,
  },
] as const;

const STORAGE_TIER_CARDS = [
  {
    title: "Hot",
    value: "Kafka 4-6h",
    note: "Short replay window for fresh incidents and consumer recovery.",
    example: "Using the 20 TB/day baseline, 6 hours is 20 × (6/24) ≈ 5 TB of hot replayable raw data.",
    color: T.red,
  },
  {
    title: "Warm",
    value: "S3 raw 1-2d",
    note: "Replay buffer beyond Kafka retention if a correction arrives later.",
    example: "Using the 20 TB/day baseline, two warm raw days means about 40 TB before compression and lifecycle movement.",
    color: T.amber,
  },
  {
    title: "Cold / long-term",
    value: "Iceberg years",
    note: "Partitioned, compacted, snapshotted, then aged into cheaper tiers.",
    example: "Using the 20 TB/day baseline, 20 × 365 ≈ 7.3 PB/year before compaction, snapshot expiry, or cheaper storage classes.",
    color: T.blue,
  },
] as const;

const COMPUTE_SIZING_CARDS = [
  {
    title: "Flink sizing",
    formula: "parallelism ≈ topic_peak_throughput / per_task_throughput",
    note: "Start from Kafka partitions and target lag, then round up to a checkpoint-friendly number.",
    example: "If a hot topic peaks at 1M msg/sec and one task safely handles 25K msg/sec, then 1,000,000 / 25,000 ≈ 40 tasks before headroom.",
    color: T.green,
  },
  {
    title: "Spark sizing",
    formula: "num_executors ≈ total_cores_needed / executor_cores",
    note: "Use the same executor sizing logic you would use in any large Spark batch workload.",
    example: "If a batch job needs ~2,000 cores and you run 5 cores/executor, then 2,000 / 5 ≈ 400 executors.",
    color: T.violet,
  },
] as const;

const ERD_GROUPS = [
  {
    title: "Core entities",
    color: T.violet,
    items: ["User", "Profile", "Content", "Episode", "Device", "Subscription", "Experiment"],
  },
  {
    title: "Behavioral facts",
    color: T.blue,
    items: ["Watch Session", "Browse Impression", "Search Event", "Recommendation Exposure", "QoE Event"],
  },
  {
    title: "Published marts",
    color: T.amber,
    items: ["content_daily_metrics", "user_retention", "feature_user_genre_affinity", "finance_revenue"],
  },
] as const;

const MODELING_REFERENCE_TABLES = [
  {
    name: "fact_playback_event",
    group: "Fact",
    grain: "One playback event such as start, pause, seek, resume, stop, or complete",
    partition: "event_date",
    bucket: "session_id",
    useCase: "Sequence-level playback debugging, event replay, player-state analysis, and session reconstruction.",
    followUp: "Why keep both event-level and session-level facts instead of only one of them?",
    columns: [
      { name: "playback_event_id", type: "VARCHAR(64)", definition: "Unique event row identifier." },
      { name: "session_id", type: "VARCHAR(64)", definition: "Playback session identifier for grouping events into one session." },
      { name: "profile_id", type: "BIGINT", definition: "Profile business key for member-level analysis." },
      { name: "content_id", type: "BIGINT", definition: "Content key for title joins." },
      { name: "event_type", type: "VARCHAR(20)", definition: "start / pause / seek / resume / stop / complete." },
      { name: "position_seconds", type: "INTEGER", definition: "Playback position at the time of the event." },
      { name: "event_sequence", type: "INTEGER", definition: "Monotonic sequence inside the session to preserve ordering." },
      { name: "bitrate_kbps", type: "INTEGER", definition: "Observed bitrate near the event." },
    ],
  },
  {
    name: "fact_qoe_event",
    group: "Fact",
    grain: "One measurable QoE incident or sample",
    partition: "event_date",
    bucket: "session_id",
    useCase: "QoE dashboards, startup diagnostics, rebuffer analysis, and CDN or ISP investigations.",
    followUp: "Which QoE metrics belong here instead of inside the watch-session fact?",
    columns: [
      { name: "qoe_event_id", type: "VARCHAR(64)", definition: "Unique QoE row identifier." },
      { name: "session_id", type: "VARCHAR(64)", definition: "Session link back to playback facts." },
      { name: "content_id", type: "BIGINT", definition: "Title context for QoE analysis." },
      { name: "isp_name", type: "VARCHAR(80)", definition: "Network provider bucket." },
      { name: "cdn_node", type: "VARCHAR(80)", definition: "CDN or cache location identifier." },
      { name: "startup_time_ms", type: "INTEGER", definition: "Time from play request to playback start." },
      { name: "rebuffer_duration_ms", type: "INTEGER", definition: "Duration of the buffering incident." },
      { name: "error_code", type: "VARCHAR(40)", definition: "Playback or delivery error taxonomy." },
    ],
  },
  {
    name: "fact_browse_impression",
    group: "Fact",
    grain: "One title or card impression rendered in a UI row and position",
    partition: "event_date",
    bucket: "profile_id",
    useCase: "Browse funnel analysis, shelf tuning, artwork tests, and impression-to-play attribution.",
    followUp: "How do you separate a browse impression from a later recommendation attribution fact?",
    columns: [
      { name: "browse_impression_id", type: "VARCHAR(64)", definition: "Unique browse impression key." },
      { name: "profile_id", type: "BIGINT", definition: "Profile key that saw the card." },
      { name: "content_id", type: "BIGINT", definition: "Shown title key." },
      { name: "page_id", type: "VARCHAR(50)", definition: "UI surface such as home or kids." },
      { name: "row_id", type: "VARCHAR(80)", definition: "Specific row or shelf identifier." },
      { name: "position_in_row", type: "SMALLINT", definition: "Card position in the shelf." },
      { name: "visible_duration_ms", type: "INTEGER", definition: "How long the card remained visible." },
      { name: "artwork_variant", type: "VARCHAR(40)", definition: "Creative variant shown for the card." },
    ],
  },
  {
    name: "fact_recommendation_impression",
    group: "Fact",
    grain: "One recommended item shown in one recommendation request",
    partition: "event_date",
    bucket: "profile_id",
    useCase: "Recommendation ranking analysis, model comparison, experiment reads, and downstream click or watch attribution.",
    followUp: "Why does recommendation modeling need its own fact rather than reusing browse impressions alone?",
    columns: [
      { name: "rec_impression_id", type: "VARCHAR(64)", definition: "Unique recommendation impression key." },
      { name: "profile_id", type: "BIGINT", definition: "Profile that received the recommendation." },
      { name: "content_id", type: "BIGINT", definition: "Recommended title key." },
      { name: "model_id", type: "VARCHAR(64)", definition: "Recommendation model or ensemble identifier." },
      { name: "rank", type: "SMALLINT", definition: "Displayed rank in the list." },
      { name: "model_score", type: "DECIMAL(8,4)", definition: "Model-scored relevance value." },
      { name: "experiment_id", type: "VARCHAR(64)", definition: "Experiment context if the request was under test." },
      { name: "row_id", type: "VARCHAR(80)", definition: "Placement context for the recommendation." },
    ],
  },
  {
    name: "dim_geography",
    group: "Dimension",
    grain: "One row per geography hierarchy member",
    partition: "Not usually partitioned heavily",
    bucket: "country_code",
    useCase: "Country, region, timezone, and regulatory reporting cuts across playback, recommendation, and subscription facts.",
    followUp: "When would geography corrections need Type 2 history instead of a simple overwrite?",
    columns: [
      { name: "geo_sk", type: "BIGINT", definition: "Warehouse surrogate geography key." },
      { name: "country_code", type: "CHAR(2)", definition: "ISO country code." },
      { name: "region", type: "VARCHAR(50)", definition: "State, province, or business region." },
      { name: "timezone", type: "VARCHAR(50)", definition: "Timezone used for local reporting logic." },
      { name: "regulatory_region", type: "VARCHAR(50)", definition: "Legal or policy reporting region." },
    ],
  },
  {
    name: "dim_time",
    group: "Dimension",
    grain: "One row per intraday bucket",
    partition: "Static dimension",
    bucket: "n/a",
    useCase: "Prime-time analysis, hour-of-day breakdowns, and intraday reporting cuts.",
    followUp: "Why can a time dimension still be useful when timestamps already exist on the fact?",
    columns: [
      { name: "time_id", type: "INTEGER", definition: "HHMMSS or bucket surrogate key." },
      { name: "hour_of_day", type: "SMALLINT", definition: "0-23 hour bucket." },
      { name: "minute_bucket", type: "SMALLINT", definition: "Rounded minute bucket for reporting." },
      { name: "prime_time_flag", type: "BOOLEAN", definition: "Whether the time falls in the prime-time window." },
    ],
  },
  {
    name: "dim_app_version",
    group: "Dimension",
    grain: "One row per app build version",
    partition: "Static dimension",
    bucket: "app_version",
    useCase: "Playback regression analysis, rollout monitoring, and capability correlation.",
    followUp: "Why should app-version rows be immutable rather than overwritten in place?",
    columns: [
      { name: "app_version_sk", type: "BIGINT", definition: "Warehouse surrogate key for the app version row." },
      { name: "app_version", type: "VARCHAR(20)", definition: "Version string visible in telemetry and releases." },
      { name: "release_channel", type: "VARCHAR(20)", definition: "Prod, beta, canary, or internal." },
      { name: "build_date", type: "DATE", definition: "Build or release creation date." },
      { name: "supported_features", type: "VARCHAR(255)", definition: "Serialized or mapped capability set for the build." },
    ],
  },
  {
    name: "dim_experiment",
    group: "Dimension",
    grain: "One row per experiment treatment definition",
    partition: "Not usually partitioned heavily",
    bucket: "experiment_name",
    useCase: "Experiment context, treatment metadata, and trustworthy slicing of recommendation or playback metrics.",
    followUp: "Which experiment attributes must be versioned once exposure starts?",
    columns: [
      { name: "experiment_sk", type: "BIGINT", definition: "Warehouse surrogate key." },
      { name: "experiment_name", type: "VARCHAR(80)", definition: "Human-readable experiment identifier." },
      { name: "variant", type: "VARCHAR(40)", definition: "Control or treatment assignment." },
      { name: "owner_team", type: "VARCHAR(80)", definition: "Responsible product or science team." },
      { name: "start_date", type: "DATE", definition: "Experiment launch date." },
    ],
  },
  {
    name: "dim_recommendation_model",
    group: "Dimension",
    grain: "One row per recommendation model version",
    partition: "Static dimension",
    bucket: "model_name",
    useCase: "Model lineage, version-aware recommendation analysis, and train-serve consistency tracking.",
    followUp: "Why does the model dimension need immutable versions rather than a single latest row?",
    columns: [
      { name: "model_sk", type: "BIGINT", definition: "Warehouse surrogate model key." },
      { name: "model_name", type: "VARCHAR(80)", definition: "Recommendation model family." },
      { name: "model_version", type: "VARCHAR(40)", definition: "Specific deployed model version." },
      { name: "feature_snapshot", type: "VARCHAR(80)", definition: "Feature definition or snapshot version used by the model." },
      { name: "deployed_at", type: "TIMESTAMP", definition: "Deployment timestamp for the model version." },
    ],
  },
] as const;

const MODELING_ER_TABLES = [
  ...TABLE_SCHEMAS.filter((table) => [
    "fact_watch_session",
    "dim_user",
    "dim_content",
    "dim_device",
    "dim_date",
    "rpt_content_daily_metrics",
    "feature_user_genre_affinity",
    "feature_content_popularity",
  ].includes(table.name)),
  ...MODELING_REFERENCE_TABLES,
] as const;

const MODELING_TABLE_VISUALS = {
  fact_watch_session: {
    color: T.red,
    objectName: "FactWatchSessionRow",
    builtBy: "Built from playback heartbeats, pause, seek, and QoE signals after Flink sessionization, deduplication, and late-event correction merges.",
    accent: "Core fact",
  },
  fact_content_impression: {
    color: T.blue,
    objectName: "FactContentImpressionRow",
    builtBy: "Built from browse-impression events after row-position enrichment, dedupe, and click-attribution cleanup.",
    accent: "Discovery fact",
  },
  fact_playback_event: {
    color: "#fb7185",
    objectName: "FactPlaybackEventRow",
    builtBy: "Built directly from canonical playback event streams before they are rolled into the session fact, preserving sequence-level truth.",
    accent: "Event fact",
  },
  fact_qoe_event: {
    color: "#22d3ee",
    objectName: "FactQoeEventRow",
    builtBy: "Built from player QoE, CDN, and network diagnostics so operational playback pain can be analyzed independently from engagement facts.",
    accent: "QoE fact",
  },
  fact_browse_impression: {
    color: T.blue,
    objectName: "FactBrowseImpressionRow",
    builtBy: "Built from browse row impressions with page, row, position, and artwork context preserved for product analysis.",
    accent: "Browse fact",
  },
  fact_recommendation_impression: {
    color: T.purple,
    objectName: "FactRecommendationImpressionRow",
    builtBy: "Built from recommendation responses so rank, model score, experiment context, and later outcomes can be attributed cleanly.",
    accent: "Recommendation fact",
  },
  fact_search_event: {
    color: T.gold,
    objectName: "FactSearchEventRow",
    builtBy: "Built from search request and click events with privacy-safe query handling and latency enrichment.",
    accent: "Intent fact",
  },
  dim_user: {
    color: T.green,
    objectName: "DimUserRow",
    builtBy: "Prepared by CDC plus account-master merges, with SCD2 versioning for plan or country changes that affect analytics truth.",
    accent: "Dimension",
  },
  dim_content: {
    color: T.blue,
    objectName: "DimContentRow",
    builtBy: "Prepared from the catalog master and title metadata services before being published as the shared content dimension.",
    accent: "Dimension",
  },
  dim_device: {
    color: T.amber,
    objectName: "DimDeviceRow",
    builtBy: "Prepared from device reference data and rollout metadata so playback facts can join to stable capability buckets.",
    accent: "Dimension",
  },
  dim_geography: {
    color: "#14b8a6",
    objectName: "DimGeographyRow",
    builtBy: "Prepared from standardized market and timezone hierarchies so facts can be sliced consistently across reporting and policy domains.",
    accent: "Dimension",
  },
  dim_date: {
    color: T.violet,
    objectName: "DimDateRow",
    builtBy: "Prepared as a pre-generated calendar dimension so reporting, finance, and experiments all slice time consistently.",
    accent: "Dimension",
  },
  dim_time: {
    color: "#a78bfa",
    objectName: "DimTimeRow",
    builtBy: "Prepared as a static intraday dimension for hour, minute-bucket, and prime-time style analysis.",
    accent: "Dimension",
  },
  dim_app_version: {
    color: "#60a5fa",
    objectName: "DimAppVersionRow",
    builtBy: "Prepared from release metadata so QoE and playback metrics can be tied back to rollout cohorts and version regressions.",
    accent: "Dimension",
  },
  dim_experiment: {
    color: T.purple,
    objectName: "DimExperimentRow",
    builtBy: "Prepared from experimentation systems so treatment meaning and ownership stay stable when metrics are analyzed later.",
    accent: "Dimension",
  },
  dim_recommendation_model: {
    color: "#c084fc",
    objectName: "DimRecommendationModelRow",
    builtBy: "Prepared from model registry and deployment metadata so every recommendation fact row keeps immutable model lineage.",
    accent: "Dimension",
  },
  rpt_content_daily_metrics: {
    color: "#14b8a6",
    objectName: "RptContentDailyMetricsRow",
    builtBy: "Prepared by daily Spark or dbt-style aggregation over trusted session facts, then published as the official business metric mart.",
    accent: "Gold mart",
  },
  rpt_user_cohort_retention: {
    color: T.purple,
    objectName: "RptUserCohortRetentionRow",
    builtBy: "Prepared by batch cohort logic over trusted user and playback facts, then versioned as business-owned retention truth.",
    accent: "Gold mart",
  },
  feature_user_genre_affinity: {
    color: "#22c55e",
    objectName: "FeatureUserGenreAffinityRow",
    builtBy: "Prepared from watch history plus genre joins so offline training and online serving can share one consistent feature definition.",
    accent: "Feature",
  },
  feature_content_popularity: {
    color: "#06b6d4",
    objectName: "FeatureContentPopularityRow",
    builtBy: "Prepared from nearline watch, start, and trend signals so recommendation systems can fetch a freshness-aware popularity feature.",
    accent: "Feature",
  },
  quarantine_events: {
    color: T.orange,
    objectName: "QuarantineEventRow",
    builtBy: "Prepared by schema and quality validation failures so bad records are quarantined instead of leaking into trusted tables.",
    accent: "Ops",
  },
  backfill_audit: {
    color: T.faint,
    objectName: "BackfillAuditRow",
    builtBy: "Prepared by replay and correction workflows so every backfill run is auditable, reversible, and reviewable later.",
    accent: "Ops",
  },
} as const satisfies Record<
  string,
  {
    color: string;
    objectName: string;
    builtBy: string;
    accent: string;
  }
>;

const MODELING_ER_LAYOUT = [
  { table: "dim_user", x: 36, y: 110, width: 250 },
  { table: "dim_geography", x: 36, y: 360, width: 260 },
  { table: "dim_device", x: 36, y: 626, width: 250 },
  { table: "fact_playback_event", x: 380, y: 40, width: 350 },
  { table: "dim_content", x: 820, y: 34, width: 300 },
  { table: "dim_app_version", x: 1210, y: 34, width: 260 },
  { table: "fact_watch_session", x: 380, y: 350, width: 410 },
  { table: "fact_qoe_event", x: 860, y: 350, width: 380 },
  { table: "dim_time", x: 1310, y: 350, width: 220 },
  { table: "dim_date", x: 1310, y: 610, width: 220 },
  { table: "fact_browse_impression", x: 420, y: 890, width: 380 },
  { table: "rpt_content_daily_metrics", x: 900, y: 900, width: 350 },
  { table: "feature_user_genre_affinity", x: 54, y: 1240, width: 360 },
  { table: "feature_content_popularity", x: 470, y: 1290, width: 340 },
  { table: "dim_experiment", x: 1310, y: 1040, width: 260 },
  { table: "dim_recommendation_model", x: 900, y: 1310, width: 340 },
  { table: "fact_recommendation_impression", x: 1300, y: 1360, width: 390 },
] as const satisfies ReadonlyArray<{ table: string; x: number; y: number; width: number }>;

const MODELING_ER_RELATIONSHIPS = [
  { from: "dim_user", to: "fact_playback_event", label: "profile / account", d: "M286 206 L380 206", color: T.green },
  { from: "dim_content", to: "fact_playback_event", label: "content_id", d: "M820 178 L730 178", color: T.blue },
  { from: "dim_app_version", to: "fact_playback_event", label: "app_version", d: "M1210 178 L730 178", color: "#60a5fa" },
  { from: "fact_playback_event", to: "fact_watch_session", label: "session rollup", d: "M555 266 L555 350", color: T.red },
  { from: "dim_geography", to: "fact_watch_session", label: "geo", d: "M296 490 L380 490", color: "#14b8a6" },
  { from: "dim_device", to: "fact_watch_session", label: "device", d: "M286 756 L380 756 L380 560", color: T.amber },
  { from: "dim_content", to: "fact_watch_session", label: "content_id", d: "M970 310 L970 250 L585 250 L585 350", color: T.blue },
  { from: "dim_date", to: "fact_watch_session", label: "event_date", d: "M1310 720 L790 720 L790 520", color: T.violet },
  { from: "dim_time", to: "fact_qoe_event", label: "event_time", d: "M1310 460 L1240 460", color: "#a78bfa" },
  { from: "dim_geography", to: "fact_qoe_event", label: "market / ISP", d: "M296 520 L820 520 L820 520 L860 520", color: "#14b8a6" },
  { from: "fact_watch_session", to: "fact_qoe_event", label: "session_id", d: "M790 470 L860 470", color: T.red },
  { from: "fact_watch_session", to: "rpt_content_daily_metrics", label: "daily aggregate", d: "M790 650 L900 650 L900 980", color: "#14b8a6" },
  { from: "dim_content", to: "rpt_content_daily_metrics", label: "title context", d: "M970 286 L970 900", color: T.blue },
  { from: "dim_user", to: "feature_user_genre_affinity", label: "user feature entity", d: "M161 350 L161 1240", color: T.green },
  { from: "dim_content", to: "feature_user_genre_affinity", label: "genre join", d: "M820 190 L414 190 L414 1240", color: T.blue },
  { from: "fact_watch_session", to: "feature_content_popularity", label: "freshness signals", d: "M600 770 L600 1080 L640 1080 L640 1290", color: "#06b6d4" },
  { from: "dim_content", to: "feature_content_popularity", label: "content entity", d: "M1120 190 L1120 1260 L810 1260", color: "#06b6d4" },
  { from: "fact_browse_impression", to: "fact_recommendation_impression", label: "surface context", d: "M800 1010 L1140 1010 L1140 1480 L1300 1480", color: T.blue },
  { from: "dim_recommendation_model", to: "fact_recommendation_impression", label: "model lineage", d: "M1240 1410 L1300 1410", color: "#c084fc" },
  { from: "dim_experiment", to: "fact_recommendation_impression", label: "experiment / variant", d: "M1440 1168 L1440 1320 L1510 1320 L1510 1360", color: T.purple },
] as const;

const MODELING_INTERVIEW_ANSWER = "I start with the grain of the core fact, usually one trusted playback session per profile-title-device. Then I explain which dimensions add stable context such as content, geography, device, app version, and experiment treatment. After that I show which lower-level facts still exist for debugging, like playback events or QoE incidents, and which downstream tables are derived from the trusted fact, like daily content marts and recommendation or feature tables. The point is to separate raw event history, trusted analytical facts, reusable dimensions, and business-owned marts so every consumer reads the same truth at the right level.";

const FAILURE_MATRIX = [
  ["Schema release breaks parser", "Block publish, divert to quarantine, keep previous schema readers alive."],
  ["Kafka partition lag spikes", "Throttle low-priority consumers, scale processors, and protect live SLA topics."],
  ["Gold metrics wrong for 30 days", "Freeze publication, replay trusted Silver snapshots, audit corrected ranges."],
  ["Late event flood after outage", "Route to replay path and run bounded correction jobs by partition/date."],
] as const;

const NETFLIX_TECH_MAP = [
  {
    id: "keystone",
    name: "Keystone",
    emoji: "🧭",
    color: T.red,
    lane: "Transport",
    what: "Netflix's unified real-time data movement backbone built around Kafka and stream processing.",
    say: "I would say Keystone as the shared event backbone that moves telemetry once and fans it out to many downstream consumers.",
    fit: "Use it when you want to describe the overall streaming platform, not a single library.",
  },
  {
    id: "kafka",
    name: "Apache Kafka",
    emoji: "📮",
    color: T.blue,
    lane: "Transport",
    what: "The durable pub/sub log that carries thousands of topics and absorbs replay plus fan-out.",
    say: "Kafka is my universal transport layer because it decouples producers from Flink, batch, observability, and replay.",
    fit: "Mention it when you explain ordering, retention, partitions, and shared-log fan-out.",
  },
  {
    id: "flink",
    name: "Apache Flink",
    emoji: "⚡",
    color: T.violet,
    lane: "Streaming",
    what: "The stateful stream engine for event-time windows, sessionization, dedup, and online aggregates.",
    say: "Flink owns low-latency stateful logic such as watch-time rollups, session windows, and late-event handling.",
    fit: "Use it when the freshness target is seconds or minutes and keyed state matters.",
  },
  {
    id: "iceberg",
    name: "Apache Iceberg",
    emoji: "🧊",
    color: T.green,
    lane: "Lakehouse",
    what: "The table format on S3 that gives snapshots, schema evolution, hidden partitioning, and replay-friendly history.",
    say: "Iceberg is where cheap durable history becomes queryable and correctable without keeping Kafka forever hot.",
    fit: "Mention it for long-term storage, backfills, schema evolution, and batch truth.",
  },
  {
    id: "druid",
    name: "Druid",
    emoji: "📊",
    color: T.amber,
    lane: "Serving",
    what: "A real-time OLAP store for live dashboards such as QoE, trending, and operational metrics.",
    say: "Druid serves the fast dashboard path when the business wants slice-and-dice metrics without waiting for warehouse refreshes.",
    fit: "Use it when the interviewer asks who reads the streaming outputs.",
  },
  {
    id: "elasticsearch",
    name: "Elasticsearch",
    emoji: "🔎",
    color: T.orange,
    lane: "Serving",
    what: "Operational search and observability indexing for incident response and troubleshooting.",
    say: "Elasticsearch is for on-call visibility and event investigation, not my source of financial truth.",
    fit: "Mention it for debugging lag, schema breaks, or producer issues.",
  },
  {
    id: "metacat",
    name: "Metacat",
    emoji: "🗂️",
    color: T.blue,
    lane: "Platform",
    what: "A unified catalog and metadata layer across heterogeneous data systems.",
    say: "Metacat gives teams one metadata surface instead of forcing them to memorize every physical store separately.",
    fit: "Use it when you talk about discoverability, lineage, and shared-table governance.",
  },
  {
    id: "maestro",
    name: "Maestro",
    emoji: "🎼",
    color: T.violet,
    lane: "Platform",
    what: "Netflix workflow orchestration for batch and data movement jobs.",
    say: "Maestro is the orchestrator that coordinates scheduled data workflows and publish dependencies.",
    fit: "Use it when you explain batch publication, recovery, or multi-step backfills.",
  },
  {
    id: "genie",
    name: "Genie",
    emoji: "🧞",
    color: T.amber,
    lane: "Platform",
    what: "A job-submission layer for Spark, Hadoop, and SQL-style workloads.",
    say: "Genie is the execution gateway that standardizes how teams launch batch compute jobs.",
    fit: "Mention it when the interviewer asks how teams actually run Spark at scale.",
  },
  {
    id: "titus",
    name: "Titus",
    emoji: "🛰️",
    color: T.green,
    lane: "Platform",
    what: "Netflix's container platform where services and data engines can run.",
    say: "Titus is part of the compute substrate under jobs and services, not the data model itself.",
    fit: "Use it only if the interviewer asks where Flink or Spark physically run.",
  },
  {
    id: "evcache",
    name: "EVCache",
    emoji: "🚀",
    color: T.red,
    lane: "Serving",
    what: "A very low-latency caching layer for hot serving paths and online features.",
    say: "EVCache is where I would push ultra-hot recommendation or personalization features that need millisecond reads.",
    fit: "Mention it when online feature serving or ultra-fast key-value reads come up.",
  },
  {
    id: "mantis",
    name: "Mantis",
    emoji: "🪄",
    color: T.blue,
    lane: "Streaming",
    what: "A real-time stream processing platform often used for operational insights and developer-facing stream views.",
    say: "Mantis complements the backbone when teams want live stream observability or ad hoc operational processing.",
    fit: "Use it as a supporting name, not the center of your main architecture answer.",
  },
  {
    id: "spinnaker",
    name: "Spinnaker",
    emoji: "🛫",
    color: T.orange,
    lane: "Platform",
    what: "Continuous delivery tooling for rolling out infrastructure and job changes safely.",
    say: "Spinnaker matters because data platforms still need controlled deployment and rollback, not just correct SQL.",
    fit: "Mention it only when release safety or operational maturity comes up.",
  },
  {
    id: "chaos",
    name: "Chaos Monkey",
    emoji: "🐒",
    color: T.red,
    lane: "Reliability",
    what: "Fault-injection tooling that reinforced Netflix's resilience mindset and multi-region thinking.",
    say: "Chaos tooling is part of why Netflix treats failure handling as a first-class design requirement.",
    fit: "Use it when the interviewer asks why the system is so explicit about resilience and recovery.",
  },
] as const;

const INTERVIEW_DRAWING_BOARDS = [
  {
    id: "fanout",
    title: "Shared log fan-out",
    accent: T.red,
    say: "I would draw producers feeding one Kafka backbone, then branch it once into Flink for live outputs and Iceberg for durable history. That proves I am not inventing two separate ingestion paths.",
    why: "This is the fastest way to explain why Kafka exists at all.",
    caption: "One write, many consumers.",
    steps: ["Producers", "Kafka", "Flink", "Iceberg", "Serving"],
    notes: [
      "Say the same event is consumed by stream, batch, and observability paths.",
      "Call out replay and decoupling as the reason this pattern wins.",
    ],
  },
  {
    id: "late-data",
    title: "Late data correction loop",
    accent: T.blue,
    say: "I would draw the live path and then add one correction loop from late events into Iceberg and backfill jobs so the interviewer sees that freshness and correctness are separate promises.",
    why: "This makes senior-level correctness visible quickly.",
    caption: "Live now, repair later.",
    steps: ["Live window", "Watermark", "Late bucket", "Iceberg", "Backfill"],
    notes: [
      "Use event time for truth, ingestion time for delay, and keep a bounded live window.",
      "Very late records patch trusted historical tables instead of endlessly reopening live state.",
    ],
  },
  {
    id: "features",
    title: "Online plus offline features",
    accent: T.green,
    say: "I would show one raw interaction flow feeding Flink for online features and Iceberg plus Spark for offline training features, then say parity tests keep train and serve semantics aligned.",
    why: "This is the clearest answer for recommendation or ML follow-ups.",
    caption: "Same events, two feature speeds.",
    steps: ["Raw events", "Flink online", "Feature cache", "Iceberg", "Spark train"],
    notes: [
      "Online path serves millisecond reads.",
      "Offline path produces richer historical features for model training and evaluation.",
    ],
  },
] as const;

const QUIZ_FLASHCARDS = [
  "Why heartbeat beats play/pause for watch time",
  "When to update a late event in streaming vs batch correction",
  "Why Bronze must stay immutable",
  "How partition keys avoid hot shards",
  "Why feature freshness and training correctness split online vs offline paths",
] as const;

const DEPTH_GUIDANCE: Record<DepthMode, { label: string; summary: string }> = {
  beginner: {
    label: "Beginner",
    summary: "Focus on the event flow, the major platform layers, and why each layer exists.",
  },
  senior: {
    label: "Senior",
    summary: "Emphasize correctness, trade-offs, late data handling, and how each choice affects operations.",
  },
  staff: {
    label: "Staff",
    summary: "Lead with platform boundaries, ownership, governance, cost, and how you would scale the operating model.",
  },
};

const DEPTH_PLAYBOOK: Record<DepthMode, { title: string; prompts: string[] }> = {
  beginner: {
    title: "Keep the first pass simple",
    prompts: [
      "State the event journey in one line before naming tools.",
      "Use only the core pipeline: events → Kafka → stream/batch → Bronze/Silver/Gold → BI + ML.",
      "Talk about correctness with one example: deduplication, late data, or replay.",
    ],
  },
  senior: {
    title: "Show trade-offs and operating choices",
    prompts: [
      "Tie freshness to each consumer instead of using one blanket SLA.",
      "Explain where streaming stops and official batch truth takes over.",
      "Name one likely failure mode per major layer and the containment path.",
    ],
  },
  staff: {
    title: "Lead with platform boundaries and operating model",
    prompts: [
      "Clarify ownership, contracts, privacy, and auditability as platform requirements.",
      "Frame capacity, replay, and cost as ongoing operating concerns, not afterthoughts.",
      "Call out where regional isolation, shared tooling, and governance reduce organizational risk.",
    ],
  },
};

const ARCHITECTURE_LINKS: Array<{
  from: ArchitectureNodeId;
  to: ArchitectureNodeId;
  groups: Array<"base" | "replay" | "governance" | "quality" | "features" | "cost">;
}> = [
  { from: "clients", to: "event-gateway", groups: ["base"] },
  { from: "event-gateway", to: "kafka", groups: ["base", "governance"] },
  { from: "kafka", to: "flink", groups: ["base"] },
  { from: "kafka", to: "bronze", groups: ["base", "cost"] },
  { from: "bronze", to: "silver", groups: ["base", "governance"] },
  { from: "silver", to: "gold", groups: ["base"] },
  { from: "gold", to: "bi-ml", groups: ["base"] },
  { from: "silver", to: "feature-store", groups: ["features"] },
  { from: "kafka", to: "quality", groups: ["quality"] },
  { from: "silver", to: "quality", groups: ["quality"] },
  { from: "silver", to: "governance", groups: ["governance"] },
  { from: "bronze", to: "replay", groups: ["replay"] },
  { from: "replay", to: "silver", groups: ["replay"] },
];

type ArchitectureFlowTone = "red" | "blue" | "violet" | "green" | "amber";

type ArchitectureFlowNodeData = {
  eyebrow: string;
  label: string;
  summary: string;
  detail: string;
  chips: string[];
  tone: ArchitectureFlowTone;
  tooltipAlign?: "left" | "center" | "right";
  onHover?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLDivElement>) => void;
  onLeave?: () => void;
};

type ArchitectureFlowGraphNode = FlowNode<ArchitectureFlowNodeData>;

const ARCHITECTURE_FLOW_COLORS: Record<ArchitectureFlowTone, string> = {
  red: T.red,
  blue: T.blue,
  violet: T.violet,
  green: T.green,
  amber: T.amber,
};

const ARCHITECTURE_FLOW_NODES: Array<ArchitectureFlowGraphNode> = [
  {
    id: "clients",
    type: "architectureNode",
    position: { x: 540, y: 0 },
    data: {
      eyebrow: "Client devices",
      label: "TV, mobile, web, consoles",
      summary: "User sessions begin on device surfaces that request APIs, stream video, and emit telemetry.",
      detail: "These clients generate playback actions, browse impressions, search interactions, heartbeats, QoE signals, and other user-behavior events that eventually enter the shared data platform.",
      chips: ["TV apps", "Mobile", "Web"],
      tone: "blue",
      tooltipAlign: "center",
    },
  },
  {
    id: "video",
    type: "architectureNode",
    position: { x: 540, y: 140 },
    data: {
      eyebrow: "Edge / CDN",
      label: "Open Connect delivery path",
      summary: "Video bytes are served from the CDN and stay outside the analytics/data backbone.",
      detail: "Open Connect or edge CDN serves media segments. It is part of user experience, but not the core data-processing path you are drawing for Kafka, Flink, and the lakehouse.",
      chips: ["Video delivery", "Separate path", "Not Kafka"],
      tone: "amber",
      tooltipAlign: "center",
    },
  },
  {
    id: "services",
    type: "architectureNode",
    position: { x: 540, y: 300 },
    data: {
      eyebrow: "Microservices tier",
      label: "Playback, recs, membership, billing, search",
      summary: "Hundreds of services handle product logic, expose OLTP state, and emit user/system events.",
      detail: "This tier includes APIs and product services such as playback, recommendations, billing, A/B assignment, search, and UI rendering. Services emit Avro events and often own OLTP data in Cassandra, EVCache, DynamoDB, or MySQL/Aurora.",
      chips: ["Falcor/GraphQL", "OLTP state", "Event emitters"],
      tone: "blue",
      tooltipAlign: "center",
    },
  },
  {
    id: "cdc",
    type: "architectureNode",
    position: { x: 1320, y: 470 },
    data: {
      eyebrow: "CDC fan-out",
      label: "Debezium / DBLog connectors",
      summary: "Database mutations are captured and published back into Kafka topics.",
      detail: "CDC connectors tail operational databases and stream row-level changes into Kafka so the same downstream consumers can process both event telemetry and source-of-truth data changes.",
      chips: ["MySQL", "Cassandra", "DynamoDB"],
      tone: "violet",
      tooltipAlign: "right",
    },
  },
  {
    id: "kafka",
    type: "architectureNode",
    position: { x: 540, y: 520 },
    data: {
      eyebrow: "Apache Kafka",
      label: "Keystone transport backbone",
      summary: "Thousands of topics provide the central log and fan-out layer for streaming, analytics, and CDC.",
      detail: "Kafka is the shared transport backbone. Hot topics can reach around 1M messages/sec, and high-volume topics may only keep a short replay window such as 4-6 hours before colder durable copies take over.",
      chips: ["Hot topics", "4-6h retention", "Schema registry"],
      tone: "red",
      tooltipAlign: "center",
    },
  },
  {
    id: "flink",
    type: "architectureNode",
    position: { x: 200, y: 710 },
    data: {
      eyebrow: "Apache Flink",
      label: "Keystone / Data Mesh processors",
      summary: "Streaming jobs filter, enrich, join, aggregate, and window the Kafka event flow in real time.",
      detail: "This layer runs the heavy real-time compute estate: thousands of Flink jobs perform enrichment, stream joins, windowing, aggregation, sessionization, and online metric derivation for operational consumers.",
      chips: ["20,000+ jobs", "Join", "Aggregate"],
      tone: "blue",
      tooltipAlign: "left",
    },
  },
  {
    id: "iceberg-sink",
    type: "architectureNode",
    position: { x: 560, y: 710 },
    data: {
      eyebrow: "Analytical fan-out",
      label: "Iceberg sink writers",
      summary: "Streaming writers land Kafka-derived data into Iceberg tables with exactly-once style commits.",
      detail: "Sink writers from Flink or Spark convert the event stream into durable Iceberg tables, committing atomically so downstream analytics and replay paths read trusted table snapshots.",
      chips: ["Streaming writes", "Exactly-once", "Table commits"],
      tone: "amber",
      tooltipAlign: "center",
    },
  },
  {
    id: "serving",
    type: "architectureNode",
    position: { x: 0, y: 920 },
    data: {
      eyebrow: "Realtime serving",
      label: "EVCache, Cassandra, Elasticsearch, Druid",
      summary: "Fast-serving stores support personalization, observability, dashboards, and live operational metrics.",
      detail: "Flink fans out into low-latency serving systems: EVCache or Cassandra for personalization and features, Elasticsearch for observability, and Druid or similar OLAP stores for live dashboards and QoE metrics.",
      chips: ["Cassandra", "Elasticsearch", "Druid"],
      tone: "green",
      tooltipAlign: "left",
    },
  },
  {
    id: "lakehouse",
    type: "architectureNode",
    position: { x: 930, y: 920 },
    data: {
      eyebrow: "S3 + Iceberg",
      label: "Petabyte-scale lakehouse",
      summary: "Object storage plus Iceberg becomes the durable analytical system of record.",
      detail: "This lakehouse layer supports ACID snapshots, schema evolution, time travel, partitioning, and compaction over large analytical datasets stored on S3.",
      chips: ["ACID", "Time travel", "Compaction"],
      tone: "amber",
      tooltipAlign: "center",
    },
  },
  {
    id: "batch",
    type: "architectureNode",
    position: { x: 930, y: 1140 },
    data: {
      eyebrow: "Batch processing",
      label: "Spark on EMR/Titus via Airflow or Maestro",
      summary: "Historical compute publishes curated tables, official metrics, and training-ready datasets.",
      detail: "Spark batch jobs run large transforms, table maintenance, scheduled backfills, and official publication flows, often orchestrated by Airflow or Netflix-specific workflow tools such as Maestro.",
      chips: ["Spark", "Airflow", "Maestro"],
      tone: "violet",
      tooltipAlign: "center",
    },
  },
  {
    id: "metadata",
    type: "architectureNode",
    position: { x: 1320, y: 920 },
    data: {
      eyebrow: "Metadata / governance",
      label: "Catalog, lineage, PII, access control",
      summary: "Governance services make the lakehouse usable and safe for many teams.",
      detail: "Metadata systems track schemas, table ownership, lineage, PII tags, access controls, and submission metadata so the platform scales organizationally, not just technically.",
      chips: ["Catalog", "Lineage", "PII"],
      tone: "green",
      tooltipAlign: "right",
    },
  },
  {
    id: "consumption",
    type: "architectureNode",
    position: { x: 1320, y: 1140 },
    data: {
      eyebrow: "Consumption / serving",
      label: "Trino, Redshift, BI, ML features, finance",
      summary: "Analysts, ML workflows, experimentation, and reporting consume curated data products here.",
      detail: "This is the downstream analytical consumption layer: Trino or Spark SQL for ad hoc analysis, warehouses such as Redshift for curated marts, BI tools, ML feature consumers, recommendation training, A/B analysis, and finance reporting.",
      chips: ["Trino", "Warehouse", "BI + ML"],
      tone: "green",
      tooltipAlign: "right",
    },
  },
];

const ARCHITECTURE_FLOW_EDGES: Array<FlowEdge> = [
  {
    id: "clients-video",
    source: "clients",
    target: "video",
    markerEnd: { type: MarkerType.ArrowClosed, color: T.amber },
    style: { stroke: T.amber, strokeWidth: 1.6, strokeDasharray: "8 6" },
    animated: true,
    label: "HTTPS / gRPC",
    labelStyle: { fill: T.amber, fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: T.card, opacity: 0.98 },
  },
  {
    id: "video-services",
    source: "video",
    target: "services",
    markerEnd: { type: MarkerType.ArrowClosed, color: T.blue },
    style: { stroke: T.blue, strokeWidth: 2.1 },
  },
  {
    id: "services-kafka",
    source: "services",
    target: "kafka",
    markerEnd: { type: MarkerType.ArrowClosed, color: T.red },
    style: { stroke: T.red, strokeWidth: 2.4 },
    animated: true,
    label: "Avro + schema validation",
    labelStyle: { fill: T.red, fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: T.card, opacity: 0.98 },
  },
  {
    id: "cdc-kafka",
    source: "cdc",
    target: "kafka",
    markerEnd: { type: MarkerType.ArrowClosed, color: T.violet },
    style: { stroke: T.violet, strokeWidth: 2.1 },
    animated: true,
  },
  {
    id: "kafka-flink",
    source: "kafka",
    target: "flink",
    markerEnd: { type: MarkerType.ArrowClosed, color: T.blue },
    style: { stroke: T.blue, strokeWidth: 2.4 },
    animated: true,
    label: "real-time fan-out",
    labelStyle: { fill: T.blue, fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: T.card, opacity: 0.98 },
  },
  {
    id: "kafka-iceberg-sink",
    source: "kafka",
    target: "iceberg-sink",
    markerEnd: { type: MarkerType.ArrowClosed, color: T.amber },
    style: { stroke: T.amber, strokeWidth: 2.2 },
    label: "analytical fan-out",
    labelStyle: { fill: T.amber, fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: T.card, opacity: 0.98 },
  },
  {
    id: "kafka-cdc",
    source: "kafka",
    target: "cdc",
    markerEnd: { type: MarkerType.ArrowClosed, color: T.violet },
    style: { stroke: T.violet, strokeWidth: 2.0, strokeDasharray: "7 5" },
    label: "CDC fan-out",
    labelStyle: { fill: T.violet, fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: T.card, opacity: 0.98 },
  },
  {
    id: "flink-serving",
    source: "flink",
    target: "serving",
    markerEnd: { type: MarkerType.ArrowClosed, color: T.green },
    style: { stroke: T.green, strokeWidth: 2.4 },
    animated: true,
  },
  {
    id: "iceberg-sink-lakehouse",
    source: "iceberg-sink",
    target: "lakehouse",
    markerEnd: { type: MarkerType.ArrowClosed, color: T.amber },
    style: { stroke: T.amber, strokeWidth: 2.2 },
  },
  {
    id: "lakehouse-batch",
    source: "lakehouse",
    target: "batch",
    markerEnd: { type: MarkerType.ArrowClosed, color: T.violet },
    style: { stroke: T.violet, strokeWidth: 2.2 },
  },
  {
    id: "lakehouse-metadata",
    source: "lakehouse",
    target: "metadata",
    markerEnd: { type: MarkerType.ArrowClosed, color: T.green },
    style: { stroke: T.green, strokeWidth: 2.0 },
  },
  {
    id: "batch-consumption",
    source: "batch",
    target: "consumption",
    markerEnd: { type: MarkerType.ArrowClosed, color: T.green },
    style: { stroke: T.green, strokeWidth: 2.1 },
  },
  {
    id: "metadata-consumption",
    source: "metadata",
    target: "consumption",
    markerEnd: { type: MarkerType.ArrowClosed, color: T.green },
    style: { stroke: T.green, strokeWidth: 2.0, strokeDasharray: "6 4" },
  },
];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function ArchitectureFlowNode({ data, selected }: NodeProps<ArchitectureFlowGraphNode>) {
  const tone = ARCHITECTURE_FLOW_COLORS[data.tone];

  return (
    <div
      tabIndex={0}
      onMouseEnter={data.onHover}
      onMouseMove={data.onHover}
      onMouseLeave={data.onLeave}
      onFocus={data.onFocus}
      onBlur={data.onLeave}
      className="group nodrag nopan relative min-w-[224px] max-w-[240px] rounded-[22px] px-4 py-3 transition-all duration-200"
      style={{
        background: selected ? `${tone}16` : T.card,
        border: `1px solid ${selected ? `${tone}42` : T.border}`,
        boxShadow: selected ? `0 18px 34px ${tone}18` : "0 14px 28px rgba(15,23,42,0.14)",
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0" />
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0" />
      <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: tone }}>
        {data.eyebrow}
      </p>
      <p className="mt-2 text-[1.02rem] font-semibold leading-tight" style={{ color: T.text }}>
        {data.label}
      </p>
      <p className="mt-2 text-[12px] leading-6" style={{ color: T.faint }}>
        {data.summary}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {data.chips.slice(0, 3).map((chip) => (
          <span
            key={chip}
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{ background: `${tone}12`, color: T.text, border: `1px solid ${tone}22` }}
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        copyTextToClipboard(value).then((ok) => {
          if (!ok) return;
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
      className="text-[11px] px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
      style={{ background: T.card2, color: copied ? T.green : T.text, border: `1px solid ${T.border}` }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]"
      style={{
        background: `${color ?? T.card2}14`,
        color: color ?? T.muted,
        border: `1px solid ${(color ?? "#64748b")}22`,
      }}
    >
      {children}
    </span>
  );
}

function TabHeader({
  tab,
}: {
  tab: DataEngineeringTabSlug;
}) {
  return null;
}

function DepthModeToggle({
  value,
  onChange,
}: {
  value: DepthMode;
  onChange: (mode: DepthMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.faint }}>
        Depth
      </p>
      {(Object.keys(DEPTH_GUIDANCE) as DepthMode[]).map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: active ? `${T.blue}16` : T.card2, color: active ? T.blue : T.text, border: `1px solid ${active ? `${T.blue}33` : T.border}` }}
          >
            {DEPTH_GUIDANCE[mode].label}
          </button>
        );
      })}
    </div>
  );
}

function TopTabStrip({
  activeTab,
  visitedTabs,
  progressPercent,
  activeIndex,
  total,
  revisedCount,
  onNavigate,
}: {
  activeTab: DataEngineeringTabSlug;
  visitedTabs: Set<DataEngineeringTabSlug>;
  progressPercent: number;
  activeIndex: number;
  total: number;
  revisedCount: number;
  onNavigate: (tab: DataEngineeringTabSlug) => void;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const syncRailButtons = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
    setCanScrollLeft(rail.scrollLeft > 8);
    setCanScrollRight(rail.scrollLeft < maxScrollLeft - 8);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    syncRailButtons();
    const handleResize = () => syncRailButtons();
    rail.addEventListener("scroll", syncRailButtons, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      rail.removeEventListener("scroll", syncRailButtons);
      window.removeEventListener("resize", handleResize);
    };
  }, [syncRailButtons]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const activeNode = rail.querySelector<HTMLElement>(`[data-tab-id="${activeTab}"]`);
    activeNode?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    window.setTimeout(syncRailButtons, 180);
  }, [activeTab, syncRailButtons]);

  const nudgeRail = (direction: "left" | "right") => {
    const rail = railRef.current;
    if (!rail) return;
    const delta = Math.max(320, Math.round(rail.clientWidth * 0.45));
    rail.scrollBy({ left: direction === "right" ? delta : -delta, behavior: "smooth" });
  };

  const progressAngle = Math.max(12, Math.round((progressPercent / 100) * 360));

  return (
    <>
      <div className="shrink-0 h-[58px]" aria-hidden="true" />
      <div
        className="shrink-0 fixed left-0 right-0 z-20 border-b backdrop-blur-sm"
        style={{ top: 56, borderColor: T.border, background: T.bg }}
      >
        <div className="relative flex items-center gap-3 px-4 xl:px-6 py-2">
          <div className="shrink-0 flex items-center gap-3 rounded-[18px] px-3 py-1.5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div
              className="relative w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: `conic-gradient(${T.blue} 0deg, ${T.amber} ${Math.max(0, progressAngle - 40)}deg, ${T.red} ${progressAngle}deg, ${T.card2} ${progressAngle}deg 360deg)` }}
            >
              <div className="w-6 h-6 rounded-full" style={{ background: T.bg }} />
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.faint }}>
                Progress
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>
                {visitedTabs.size} visited · {revisedCount} revised
              </p>
            </div>
            <div className="w-px h-8" style={{ background: T.border }} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.faint }}>
                Chapter
              </p>
              <p className="text-sm font-bold mt-0.5" style={{ color: T.text }}>
                {activeIndex + 1} / {total}
              </p>
            </div>
          </div>
          <div className="h-1 absolute left-0 right-0 top-0 overflow-hidden pointer-events-none" style={{ background: T.card2 }}>
            <div className="h-full transition-all duration-300" style={{ width: `${progressPercent}%`, background: `linear-gradient(90deg, ${T.red}, ${T.amber}, ${T.blue})` }} />
          </div>
          <div className="relative flex-1 min-w-0">
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-16 z-10 hidden xl:block transition-opacity",
              canScrollLeft ? "opacity-100" : "opacity-0"
            )}
            style={{ background: `linear-gradient(90deg, ${T.bg} 30%, transparent)` }}
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 w-24 z-10 hidden xl:block transition-opacity",
              canScrollRight ? "opacity-100" : "opacity-0"
            )}
            style={{ background: `linear-gradient(270deg, ${T.bg} 35%, transparent)` }}
          />
          <button
            onClick={() => nudgeRail("left")}
            className={cn(
              "hidden xl:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full items-center justify-center transition-all",
              canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            style={{ background: T.text, color: T.bg, border: `1px solid ${T.text}`, boxShadow: `0 10px 24px ${T.bg}` }}
            aria-label="Scroll chapters left"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M8.75 2.5L4.25 7L8.75 11.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => nudgeRail("right")}
            className={cn(
              "hidden xl:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full items-center justify-center transition-all",
              canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            style={{ background: T.text, color: T.bg, border: `1px solid ${T.text}`, boxShadow: `0 10px 24px ${T.bg}` }}
            aria-label="Scroll chapters right"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5.25 2.5L9.75 7L5.25 11.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div ref={railRef} className="pr-10 xl:pr-12 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 min-w-max items-stretch">
            {VISIBLE_DATA_ENGINEERING_TABS.map((tab, index) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  data-tab-id={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  className="min-w-0 rounded-xl px-2.5 py-2 text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: active ? `${tab.accent}16` : T.card,
                    border: `1px solid ${active ? `${tab.accent}36` : T.border}`,
                    flex: "0 0 auto",
                    boxShadow: active ? `0 10px 24px ${tab.accent}18` : "none",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: active ? tab.accent : T.faint }}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[13px] font-semibold leading-5 whitespace-nowrap" style={{ color: T.text }}>
                      {tab.label}
                    </span>
                    {visitedTabs.has(tab.id) ? <span className="text-[10px]" style={{ color: T.green }}>●</span> : null}
                    <span className="text-xs" style={{ color: active ? tab.accent : T.faint }}>
                      →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}

function Sidebar({
  activeTab,
  activeSectionId,
  onNavigateSection,
}: {
  activeTab: DataEngineeringTabSlug;
  activeSectionId: string;
  onNavigateSection: (sectionId: string) => void;
}) {
  if (activeTab === "data-modeling") return null;
  const sections = PRODUCT_TAB_SECTIONS[activeTab];
  const accent = DATA_ENGINEERING_TABS.find((tab) => tab.id === activeTab)?.accent ?? T.red;

  return (
    <>
      <aside className="hidden xl:block w-[232px] shrink-0 self-start" aria-hidden="true" />
      <div
        className="hidden xl:block fixed left-0 z-20 w-[232px] overflow-y-auto no-scrollbar px-4 py-3"
        style={{
          top: 114,
          bottom: 16,
          borderRight: `1px solid ${T.border}`,
          background: T.bg,
        }}
      >
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: T.faint }}>
          Page anchors
        </p>
        <div className="space-y-2">
          {sections.map((section, index) => {
            const active = activeSectionId === section.id;
            return (
              <button
                key={section.id}
                data-testid={`stage-nav-${section.id}`}
                onClick={() => onNavigateSection(section.id)}
                className="w-full text-left rounded-2xl px-3 py-3 cursor-pointer transition-all hover:-translate-y-px"
                style={{
                  background: active ? `${accent}12` : T.card,
                  border: `1px solid ${active ? `${accent}33` : T.border}`,
                  boxShadow: active ? `0 10px 22px ${accent}12` : "none",
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ background: active ? `${accent}22` : T.card2, color: active ? accent : T.faint }}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: T.text }}>
                      {section.title}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function MobileMenu({
  activeTab,
  open,
  onClose,
  onNavigateSection,
}: {
  activeTab: DataEngineeringTabSlug;
  open: boolean;
  onClose: () => void;
  onNavigateSection: (sectionId: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 xl:hidden" style={{ background: T.bg }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
        <span className="text-sm font-bold" style={{ color: T.text }}>
          On this page
        </span>
        <button onClick={onClose} className="text-lg cursor-pointer" style={{ color: T.muted }}>
          ✕
        </button>
      </div>
      <div className="p-4 overflow-y-auto no-scrollbar space-y-5">
        <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-sm font-semibold" style={{ color: T.text }}>
            {DATA_ENGINEERING_TABS.find((tab) => tab.id === activeTab)?.label}
          </p>
          <p className="text-[12px] mt-2 leading-5" style={{ color: T.faint }}>
            {DATA_ENGINEERING_TAB_META[activeTab].heroSubtitle}
          </p>
        </div>
        <div className="space-y-2">
          {PRODUCT_TAB_SECTIONS[activeTab].map((section, index) => (
            <button
              key={section.id}
              onClick={() => {
                onNavigateSection(section.id);
                onClose();
              }}
              className="w-full text-left rounded-xl p-3 cursor-pointer"
              style={{ background: T.card, border: `1px solid ${T.border}` }}
            >
              <p className="text-sm font-semibold" style={{ color: T.text }}>
                {index + 1}. {section.title}
              </p>
              <p className="text-[11px] mt-1" style={{ color: T.faint }}>
                {section.note}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScrollableShell({
  children,
  prevTab,
  nextTab,
  onNavigate,
  onMarkRevised,
  revised,
  scrollRef,
  feedbackVote,
  onFeedback,
}: {
  children: React.ReactNode;
  prevTab?: { id: DataEngineeringTabSlug; label: string };
  nextTab?: { id: DataEngineeringTabSlug; label: string };
  onNavigate: (tab: DataEngineeringTabSlug) => void;
  onMarkRevised: () => void;
  revised: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  feedbackVote: "up" | "down" | null;
  onFeedback: (vote: "up" | "down") => void;
}) {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const handler = () => setShowTop(window.scrollY > 320);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [scrollRef]);

  return (
    <div ref={scrollRef} data-de-scroll-shell className="flex-1 min-h-0 relative" style={{ background: T.bg }}>
      <div className="px-4 lg:px-6 py-6 pb-24 max-w-[1320px] mx-auto">
        {children}
        <div className="mt-10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 flex-wrap">
            {prevTab ? (
              <button onClick={() => onNavigate(prevTab.id)} className="text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
                ← {prevTab.label}
              </button>
            ) : null}
            {nextTab ? (
              <button onClick={() => onNavigate(nextTab.id)} className="text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
                {nextTab.label} →
              </button>
            ) : null}
          </div>
          <button onClick={onMarkRevised} className="text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: revised ? `${T.green}18` : T.card2, color: revised ? T.green : T.text, border: `1px solid ${revised ? `${T.green}33` : T.border}` }}>
            {revised ? "Marked revised" : "Mark as revised"}
          </button>
        </div>
        <div className="mt-6 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: T.text }}>
              Last reviewed June 2026 · By Prasoon Parashar
            </p>
            <p className="text-[12px] mt-1" style={{ color: T.faint }}>
              Numbers are interview assumptions, not real Netflix internal figures.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px]" style={{ color: T.faint }}>
              Was this tab useful?
            </span>
            <button
              onClick={() => onFeedback("up")}
              className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              style={{ background: feedbackVote === "up" ? `${T.green}18` : T.card2, color: feedbackVote === "up" ? T.green : T.text, border: `1px solid ${feedbackVote === "up" ? `${T.green}33` : T.border}` }}
            >
              👍
            </button>
            <button
              onClick={() => onFeedback("down")}
              className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              style={{ background: feedbackVote === "down" ? `${T.red}18` : T.card2, color: feedbackVote === "down" ? T.red : T.text, border: `1px solid ${feedbackVote === "down" ? `${T.red}33` : T.border}` }}
            >
              👎
            </button>
          </div>
        </div>
      </div>
      {showTop ? (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
          style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}
          aria-label="Back to top"
        >
          ↑
        </button>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, note, color }: { label: string; value: string; note: string; color: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${color}25` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
        {label}
      </p>
      <p className="text-[1.8rem] font-bold tracking-[-0.04em] mt-2" style={{ color: T.text }}>
        {value}
      </p>
      <p className="text-[11px] mt-2 leading-5" style={{ color: T.faint }}>
        {note}
      </p>
    </div>
  );
}

function CompactMetricBadge({
  label,
  value,
  note,
  color,
}: {
  label: string;
  value: string;
  note: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl px-4 py-3" style={{ background: T.card2, border: `1px solid ${color}20` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
        {label}
      </p>
      <p className="text-xl font-semibold tracking-[-0.03em] mt-2" style={{ color: T.text }}>
        {value}
      </p>
      <p className="text-[11px] leading-5 mt-2" style={{ color: T.faint }}>
        {note}
      </p>
    </div>
  );
}

function AnswerCard({
  title,
  body,
  accent,
}: {
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${accent}2a` }}>
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
          {title}
        </p>
      </div>
      <p className="text-sm leading-7" style={{ color: T.text }}>
        {body}
      </p>
    </div>
  );
}

function FlowMapper({
  steps,
  accent,
}: {
  steps: readonly string[];
  accent: string;
}) {
  return (
    <div className="grid gap-3">
      {steps.map((step, index) => (
        <div key={`${step}-${index}`} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: `${accent}18`, color: accent }}>
            {index + 1}
          </div>
          <div className="rounded-xl px-4 py-3 flex-1" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-sm" style={{ color: T.text }}>
              {step}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnchoredSection({
  id,
  eyebrow,
  title,
  subtitle,
  accent,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} data-de-anchor className="scroll-mt-24">
      <div className="mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Pill color={accent}>{eyebrow}</Pill>
        </div>
        <h3 className="text-2xl font-bold mt-3 tracking-[-0.04em]" style={{ color: T.text }}>
          {title}
        </h3>
        <p className="text-sm mt-2 max-w-3xl" style={{ color: T.faint }}>
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  );
}

function CompactProTip({
  title,
  body,
  accent,
  actions,
}: {
  title: string;
  body: string;
  accent: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] p-5" style={{ background: `${accent}10`, border: `1px solid ${accent}28` }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
            Pro tip
          </p>
          <p className="text-lg font-bold mt-2" style={{ color: T.text }}>
            {title}
          </p>
          <p className="text-sm mt-3 leading-7" style={{ color: T.muted }}>
            {body}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

function InterviewAnswerStrip({
  tab,
  accent,
}: {
  tab: DataEngineeringTabSlug;
  accent: string;
}) {
  return <AnswerCard title="Interview answer" body={TAB_INTERVIEW_LINES[tab]} accent={accent} />;
}

function DepthGuidancePanel({ mode }: { mode: DepthMode }) {
  const item = DEPTH_GUIDANCE[mode];
  return (
    <div className="rounded-[18px] px-4 py-3 mb-4" style={{ background: T.card, border: `1px solid ${T.blue}20` }}>
      <div className="flex items-start gap-3">
        <span className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${T.blue}16`, color: T.blue }}>
          {item.label[0]}
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
            {item.label} lens
          </p>
          <p className="text-sm mt-1" style={{ color: T.muted }}>
            {item.summary}
          </p>
        </div>
      </div>
    </div>
  );
}

function DepthPlaybookPanel({
  mode,
  tab,
}: {
  mode: DepthMode;
  tab: DataEngineeringTabSlug;
}) {
  const playbook = DEPTH_PLAYBOOK[mode];
  const meta = DATA_ENGINEERING_TAB_META[tab];

  return (
    <div className="hidden xl:block rounded-[20px] p-4 mb-4" style={{ background: T.card, border: `1px solid ${T.violet}20` }}>
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr] xl:items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.violet }}>
            Desktop depth mode
          </p>
          <h3 className="text-lg font-bold mt-1.5" style={{ color: T.text }}>
            {playbook.title}
          </h3>
          <p className="text-sm mt-2 leading-6" style={{ color: T.muted }}>
            {meta.heroTitle} changes its visible guidance based on the selected depth so the page reads more like an interview coach than a static article.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {playbook.prompts.map((prompt) => (
            <div key={prompt} className="rounded-2xl p-3.5" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
              <p className="text-sm leading-6" style={{ color: T.muted }}>
                {prompt}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ToolMappingGrid() {
  return (
    <div className="space-y-4">
      <div
        className="rounded-[26px] p-5"
        style={{
          background: `linear-gradient(135deg, ${T.card} 0%, ${T.card2} 100%)`,
          border: `1px solid ${T.violet}24`,
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.violet }}>
          Storage flow
        </p>
        <h3 className="text-xl font-bold mt-2" style={{ color: T.text }}>
          {"Sources to Bronze to Silver to Gold to Serving"}
        </h3>
        <p className="text-sm mt-2 max-w-3xl" style={{ color: T.faint }}>
          This is the batch storage story in order: multiple raw inputs land first, trusted tables are built in the lakehouse, official Gold is published, and only then do serving systems refresh.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-stretch">
        {TOOL_MAPPING_CARDS.map((card, index) => (
          <div key={card.title} className="contents">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-[24px] p-5"
              style={{ background: T.card, border: `1px solid ${T.border}` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
                Step {index + 1}
              </p>
              <h4 className="text-lg font-bold mt-2" style={{ color: T.text }}>
                {card.title}
              </h4>
              <div className="grid gap-3 mt-4">
                <InfoTile label="AWS" value={card.aws} />
                <InfoTile label="Open source" value={card.oss} />
                <DetailBlock title="Why this step exists" accent={T.amber}>{card.why}</DetailBlock>
              </div>
            </motion.div>
            {index < TOOL_MAPPING_CARDS.length - 1 ? (
              <div className="hidden xl:flex items-center justify-center text-2xl font-semibold" style={{ color: T.violet }}>
                →
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DataContractGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {DATA_CONTRACT_CARDS.map((card) => (
        <div key={card.title} className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
            {card.title}
          </p>
          <p className="text-sm mt-3 leading-7" style={{ color: T.muted }}>
            {card.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

function GovernanceTrustFlow() {
  const [selectedQuestion, setSelectedQuestion] = useState<(typeof GOVERNANCE_TRUST_QUESTIONS)[number]["question"]>(GOVERNANCE_TRUST_QUESTIONS[0].question);
  const flow = [
    {
      title: "Contract",
      accent: T.green,
      note: "Schema, owner, PII tags, and compatibility rules are defined before an event family becomes real platform input.",
    },
    {
      title: "Validate",
      accent: T.blue,
      note: "CI, registry checks, and pipeline validation stop malformed or semantically broken data before it fans out.",
    },
    {
      title: "Certify",
      accent: T.amber,
      note: "Silver and Gold datasets become official only when reconciliations pass and an owner stands behind the table.",
    },
    {
      title: "Publish",
      accent: T.red,
      note: "Consumers only see one clean trusted version, with rollback, lineage, and audit signals preserved.",
    },
  ] as const;
  const activeQuestion = GOVERNANCE_TRUST_QUESTIONS.find((item) => item.question === selectedQuestion) ?? GOVERNANCE_TRUST_QUESTIONS[0];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {GOVERNANCE_MUST_KNOW.map((item) => (
          <div key={item.title} className="rounded-[18px] p-3.5" style={{ background: `${item.accent}10`, border: `1px solid ${item.accent}24` }}>
            <p className="text-sm font-semibold" style={{ color: T.text }}>
              {item.title}
            </p>
            <p className="text-[12px] mt-2 leading-6" style={{ color: T.faint }}>
              {item.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        {flow.map((item, index) => (
          <div key={item.title} className="contents">
            <div className="rounded-[22px] p-4" style={{ background: T.card, border: `1px solid ${item.accent}24` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.accent }}>
                Step {index + 1}
              </p>
              <p className="text-lg font-bold mt-2" style={{ color: T.text }}>
                {item.title}
              </p>
              <p className="text-sm mt-3 leading-6" style={{ color: T.muted }}>
                {item.note}
              </p>
            </div>
            {index < flow.length - 1 ? (
              <div className="hidden xl:flex items-center justify-center text-2xl font-light" style={{ color: flow[index + 1].accent }}>
                →
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
            Schema evolution policy
          </p>
          <div className="mt-4">
            <FlowMapper steps={SCHEMA_EVOLUTION_RULES} accent={T.green} />
          </div>
        </div>
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
            Certified dataset rules
          </p>
          <div className="space-y-3 mt-4">
            {CERTIFIED_DATASET_RULES.map((rule, index) => (
              <div key={rule} className="rounded-xl p-4 flex items-start gap-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: `${T.blue}16`, color: T.blue }}>
                  {index + 1}
                </div>
                <p className="text-sm leading-7" style={{ color: T.muted }}>
                  {rule}
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3 mt-4">
            {GOVERNANCE_TRUST_QUESTIONS.map((item) => {
              const active = item.question === activeQuestion.question;
              return (
                <button
                  key={item.question}
                  type="button"
                  onMouseEnter={() => setSelectedQuestion(item.question)}
                  onFocus={() => setSelectedQuestion(item.question)}
                  onClick={() => setSelectedQuestion(item.question)}
                  className="rounded-[18px] p-3 text-left cursor-pointer transition-colors"
                  style={{ background: active ? `${item.color}14` : T.card2, border: `1px solid ${active ? `${item.color}36` : T.border}` }}
                >
                  <p className="text-[11px] font-semibold leading-5" style={{ color: T.text }}>
                    {item.question}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="rounded-[18px] p-4 mt-3" style={{ background: `${activeQuestion.color}18`, border: `1px solid ${activeQuestion.color}32` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: activeQuestion.color }}>
              Interview answer
            </p>
            <p className="text-sm mt-2 leading-7" style={{ color: T.muted }}>
              {activeQuestion.answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableLineagePanel() {
  return (
    <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${T.violet}24` }}>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.violet }}>
            Table population flow
          </p>
          <p className="text-[12px] mt-1" style={{ color: T.faint }}>
            Show how one event family becomes a trusted Gold metric.
          </p>
        </div>
        <CopyButton value={TABLE_LINEAGE_FLOW.join(" -> ")} label="Copy flow" />
      </div>
      <FlowMapper steps={TABLE_LINEAGE_FLOW} accent={T.violet} />
    </div>
  );
}

function ErDiagramPanel() {
  const defaultZoom = 0.58;
  const minZoom = 0.42;
  const maxZoom = 1.55;
  const rowHeight = 22;
  const headerHeight = 54;
  const tablePadding = 14;
  const shellRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; scrollLeft: number; scrollTop: number }>({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const [zoomLevel, setZoomLevel] = useState(defaultZoom);
  const [activeTableName, setActiveTableName] = useState<string>("fact_watch_session");
  const [activeColumnName, setActiveColumnName] = useState<string | null>(null);

  const layoutMap = useMemo(
    () =>
      Object.fromEntries(
        MODELING_ER_LAYOUT.map((node) => {
          const table = MODELING_ER_TABLES.find((item) => item.name === node.table) ?? MODELING_ER_TABLES[0];
          const height = headerHeight + table.columns.length * rowHeight + tablePadding * 2;
          return [
            node.table,
            {
              ...node,
              table,
              height,
            },
          ];
        }),
      ) as Record<
        string,
        {
          table: (typeof MODELING_ER_TABLES)[number];
          x: number;
          y: number;
          width: number;
          height: number;
        }
      >,
    [],
  );

  const activeTable = layoutMap[activeTableName]?.table ?? MODELING_ER_TABLES[0];
  const activeColumn = activeColumnName
    ? activeTable.columns.find((column) => column.name === activeColumnName) ?? null
    : null;
  const activeVisual = MODELING_TABLE_VISUALS[activeTable.name];
  const zoomPercent = Math.round(zoomLevel * 100);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    shell.scrollLeft = Math.max(0, (shell.scrollWidth - shell.clientWidth) * 0.18);
    shell.scrollTop = 0;
  }, []);

  const inferTsType = useCallback((sqlType: string) => {
    const normalized = sqlType.toUpperCase();
    if (normalized.includes("ARRAY")) return "string[]";
    if (normalized.includes("BOOLEAN")) return "boolean";
    if (
      normalized.includes("INT")
      || normalized.includes("DECIMAL")
      || normalized.includes("DOUBLE")
      || normalized.includes("FLOAT")
      || normalized.includes("NUMERIC")
    ) {
      return "number";
    }
    if (normalized.includes("TIMESTAMP") || normalized === "DATE") return "string";
    return "string";
  }, []);

  const objectSnippet = useMemo(() => {
    const selectedColumns = activeTable.columns.slice(0, Math.min(6, activeTable.columns.length));
    const fieldLines = selectedColumns.map((column) => ({
      text: `  ${column.name}: ${inferTsType(column.type)};`,
      active: activeColumn?.name === column.name,
    }));

    const methodLines = (() => {
      if (activeTable.group === "Fact") {
        return [
          "  static fromEventStream(events: CanonicalEvent[]): FactRow { ... }",
          "  attachDimensionKeys(lookups: DimensionLookups): void { ... }",
          "  validateRequiredKeys(): boolean { ... }",
          "  emitWarehouseRow(): Record<string, unknown> { ... }",
        ];
      }

      if (activeTable.group === "Dimension") {
        return [
          "  static fromMasterRecord(record: SourceRecord): DimensionRow { ... }",
          "  applyScdVersion(previous?: DimensionRow): DimensionRow { ... }",
          "  normalizeReferenceValues(): void { ... }",
          "  emitCurrentRow(): Record<string, unknown> { ... }",
        ];
      }

      if (activeTable.group === "Gold Mart") {
        return [
          "  static aggregateFromFacts(rows: FactRow[]): MartRow { ... }",
          "  enforceBusinessDefinition(): void { ... }",
          "  publishSnapshot(snapshotDate: string): void { ... }",
        ];
      }

      return [
        "  static build(rows: SourceRow[]): FeatureRow { ... }",
        "  applyEntityKey(): void { ... }",
        "  emitServingPayload(): Record<string, unknown> { ... }",
      ];
    })();

    return {
      fields: fieldLines,
      lines: [
        `class ${activeVisual.objectName} {`,
        ...fieldLines.map((line) => line.text),
        "",
        ...methodLines,
        "}",
      ],
    };
  }, [activeColumn?.name, activeTable.columns, activeTable.group, activeVisual.objectName, inferTsType]);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    const shell = shellRef.current;
    if (!shell) return;

    dragRef.current = {
      active: true,
      startX: clientX,
      startY: clientY,
      scrollLeft: shell.scrollLeft,
      scrollTop: shell.scrollTop,
    };
  }, []);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    const shell = shellRef.current;
    const drag = dragRef.current;
    if (!shell || !drag.active) return;

    shell.scrollLeft = drag.scrollLeft - (clientX - drag.startX);
    shell.scrollTop = drag.scrollTop - (clientY - drag.startY);
  }, []);

  const stopDrag = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <div
        className="rounded-[28px] overflow-hidden"
        style={{ background: T.card, border: `1px solid ${T.violet}24` }}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.violet }}>
              Fact-dimension ER diagram
            </p>
            <p className="mt-1 text-[12px] leading-6" style={{ color: T.faint }}>
              Hover any table or column to inspect meaning, joins, and the row object used to build that table.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{ background: T.card2, color: T.faint, border: `1px solid ${T.border}` }}
            >
              {zoomPercent}%
            </span>
            <input
              type="range"
              min={minZoom}
              max={maxZoom}
              step={0.01}
              value={zoomLevel}
              onChange={(event) => setZoomLevel(Number(event.target.value))}
              aria-label="ER diagram zoom slider"
              className="w-28 accent-[var(--text)] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoomLevel((value) => Math.max(minZoom, Number((value - 0.08).toFixed(2))))}
              className="rounded-full px-3 py-1.5 text-sm font-semibold cursor-pointer"
              style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}
              aria-label="Zoom out ER diagram"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(defaultZoom)}
              className="rounded-full px-3 py-1.5 text-[11px] font-semibold cursor-pointer"
              style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((value) => Math.min(maxZoom, Number((value + 0.08).toFixed(2))))}
              className="rounded-full px-3 py-1.5 text-sm font-semibold cursor-pointer"
              style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}
              aria-label="Zoom in ER diagram"
            >
              +
            </button>
          </div>
        </div>

        <div
          ref={shellRef}
          className="overflow-auto p-4 cursor-grab active:cursor-grabbing"
          onPointerDown={(event) => {
            if (event.pointerType === "mouse" || event.pointerType === "touch" || event.pointerType === "pen") {
              startDrag(event.clientX, event.clientY);
            }
          }}
          onPointerMove={(event) => moveDrag(event.clientX, event.clientY)}
          onPointerUp={stopDrag}
          onPointerLeave={stopDrag}
          onWheel={(event) => {
            const shell = shellRef.current;
            if (!shell) return;
            if (event.shiftKey || Math.abs(event.deltaX) > 0) {
              shell.scrollLeft += event.deltaX || event.deltaY;
            }
          }}
        >
          <div
            style={{
              width: `${1760 * zoomLevel}px`,
              maxWidth: "none",
              transition: "width 180ms ease",
            }}
          >
            <svg
              viewBox="0 0 1760 1480"
              role="img"
              aria-label="Netflix dimensional ER diagram"
              className="block w-full h-auto"
            >
              <defs>
                <marker id="model-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              </defs>

              <rect
                x="0"
                y="0"
                width="1760"
                height="1480"
                rx="28"
                fill="#0c1218"
              />

              <g fill="none" strokeWidth="1.4">
                {MODELING_ER_RELATIONSHIPS.map((relationship, index) => {
                  const related =
                    relationship.from === activeTable.name
                    || relationship.to === activeTable.name;

                  return (
                    <motion.path
                      key={`${relationship.from}-${relationship.to}`}
                      d={relationship.d}
                      stroke={relationship.color}
                      strokeDasharray="5 6"
                      markerEnd="url(#model-arrow)"
                      initial={false}
                      animate={{
                        strokeDashoffset: [0, -16],
                        opacity: related ? 1 : 0.55,
                      }}
                      transition={{
                        strokeDashoffset: { duration: 1.4, ease: "linear", repeat: Number.POSITIVE_INFINITY, delay: index * 0.05 },
                        opacity: { duration: 0.2 },
                      }}
                    />
                  );
                })}
              </g>

              <g fontFamily="inherit">
                {MODELING_ER_RELATIONSHIPS.map((relationship, index) => {
                  const points = relationship.d.match(/-?\d+/g)?.map(Number) ?? [];
                  const labelX = points.length >= 4 ? (points[0] + points[points.length - 2]) / 2 : 0;
                  const labelY = points.length >= 4 ? (points[1] + points[points.length - 1]) / 2 - 8 : 0;
                  return (
                    <text
                      key={`${relationship.from}-${relationship.to}-${relationship.label}-${index}`}
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill={relationship.color}
                      letterSpacing="0.04em"
                    >
                      {relationship.label}
                    </text>
                  );
                })}
              </g>

              {MODELING_ER_LAYOUT.map((node) => {
                const table = layoutMap[node.table].table;
                const visual = MODELING_TABLE_VISUALS[table.name];
                const isActive = activeTable.name === table.name;
                const boxHeight = layoutMap[node.table].height;

                return (
                  <g
                    key={table.name}
                    transform={`translate(${node.x},${node.y})`}
                    onMouseEnter={() => {
                      setActiveTableName(table.name);
                      setActiveColumnName(null);
                    }}
                    onFocus={() => {
                      setActiveTableName(table.name);
                      setActiveColumnName(null);
                    }}
                    onClick={() => {
                      setActiveTableName(table.name);
                      setActiveColumnName(null);
                    }}
                    className="cursor-pointer"
                    tabIndex={0}
                    role="button"
                    aria-label={table.name}
                  >
                    <rect
                      width={node.width}
                      height={boxHeight}
                      rx="18"
                      fill={isActive ? `${visual.color}16` : "#171e27"}
                      stroke={isActive ? visual.color : "#374350"}
                      strokeWidth={isActive ? 1.8 : 1}
                    />
                    <rect
                      x="0"
                      y="0"
                      width={node.width}
                      height={headerHeight}
                      rx="18"
                      fill={isActive ? `${visual.color}1f` : "#1a2430"}
                    />
                    <text x="16" y="22" fontSize="10" fontWeight="700" fill={visual.color} letterSpacing="0.16em">
                      {visual.accent.toUpperCase()}
                    </text>
                    <text x="16" y="42" fontSize="16" fontWeight="700" fill="#f8fafc">
                      {table.name}
                    </text>

                    {table.columns.map((column, columnIndex) => {
                      const rowY = headerHeight + tablePadding + columnIndex * rowHeight;
                      const highlighted = activeTable.name === table.name && activeColumnName === column.name;

                      return (
                        <g
                          key={`${table.name}-${column.name}-${columnIndex}`}
                          transform={`translate(12,${rowY})`}
                          onMouseEnter={(event) => {
                            event.stopPropagation();
                            setActiveTableName(table.name);
                            setActiveColumnName(column.name);
                          }}
                          onFocus={(event) => {
                            event.stopPropagation();
                            setActiveTableName(table.name);
                            setActiveColumnName(column.name);
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveTableName(table.name);
                            setActiveColumnName(column.name);
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`${table.name} ${column.name}`}
                        >
                          <rect
                            width={node.width - 24}
                            height={rowHeight - 2}
                            rx="9"
                            fill={highlighted ? `${visual.color}18` : "transparent"}
                            stroke={highlighted ? `${visual.color}` : "transparent"}
                            strokeWidth={highlighted ? 1 : 0}
                          />
                          <text
                            x="10"
                            y="14"
                            fontSize="10"
                            fontWeight="700"
                            fill={column.name.endsWith("_id") || column.name.endsWith("_sk") ? visual.color : "#cbd5e1"}
                          >
                            {column.name}
                          </text>
                          <text
                            x={node.width - 34}
                            y="14"
                            textAnchor="end"
                            fontSize="9"
                            fill="#6b7a8b"
                          >
                            {column.type}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      <div className="xl:sticky xl:top-4 self-start">
        <div
          className="rounded-[24px] p-5 space-y-4"
          style={{ background: T.card2, border: `1px solid ${activeVisual.color}28`, maxHeight: "calc(100vh - 7rem)", overflowY: "auto" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: activeVisual.color }}>
                Hover inspector
              </p>
              <h3 className="mt-2 text-xl font-bold" style={{ color: T.text }}>
                {activeTable.name}
              </h3>
            </div>
            <Pill color={activeVisual.color}>{activeVisual.accent}</Pill>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <InfoTile label="Grain" value={activeTable.grain} />
            <InfoTile label="Partition" value={activeTable.partition} />
            <InfoTile label="Bucket" value={activeTable.bucket} />
            <InfoTile label="Use case" value={activeTable.useCase} />
          </div>

          <div className="rounded-[20px] p-4" style={{ background: T.card, border: `1px solid ${activeVisual.color}22` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: activeVisual.color }}>
              Prepared by
            </p>
            <p className="mt-3 text-sm leading-7" style={{ color: T.text }}>
              {activeVisual.builtBy}
            </p>
          </div>

          <div className="rounded-[20px] p-4" style={{ background: T.card, border: `1px solid ${activeColumn ? `${activeVisual.color}28` : T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: activeVisual.color }}>
              {activeColumn ? "Column meaning" : "Table meaning"}
            </p>
            <p className="mt-3 text-sm font-semibold" style={{ color: T.text }}>
              {activeColumn ? `${activeColumn.name} (${activeColumn.type})` : activeTable.followUp}
            </p>
            <p className="mt-3 text-sm leading-7" style={{ color: T.muted }}>
              {activeColumn ? activeColumn.definition : activeTable.useCase}
            </p>
            {activeColumn && "formula" in activeColumn && activeColumn.formula ? (
              <div className="mt-3 rounded-xl p-3 font-mono text-xs" style={{ background: "#111821", border: `1px solid ${T.border}`, color: T.text }}>
                {activeColumn.formula}
              </div>
            ) : null}
          </div>

          <div className="rounded-[20px] p-4" style={{ background: "#0d131a", border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: activeVisual.color }}>
              Row object shape
            </p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-[12px] leading-6" style={{ color: "#cbd5e1" }}>
              {objectSnippet.lines.map((line, index) => {
                const highlighted =
                  activeColumn
                  && line.includes(`${activeColumn.name}:`);
                return (
                  <div
                    key={`${line}-${index}`}
                    className="rounded-lg px-2"
                    style={{
                      background: highlighted ? `${activeVisual.color}18` : "transparent",
                      color: highlighted ? "#ffffff" : "#cbd5e1",
                    }}
                  >
                    {line}
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function FailureMatrixPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {FAILURE_MATRIX.map(([title, response]) => (
        <div key={title} className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
            Failure mode
          </p>
          <p className="text-lg font-bold mt-2" style={{ color: T.text }}>
            {title}
          </p>
          <p className="text-sm mt-3 leading-7" style={{ color: T.muted }}>
            {response}
          </p>
        </div>
      ))}
    </div>
  );
}

function FlashcardPanel() {
  const [index, setIndex] = useState(0);
  return (
    <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
            Flashcard mode
          </p>
          <p className="text-[12px] mt-1" style={{ color: T.faint }}>
            Quick high-signal prompts for recall before a round.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIndex((value) => (value - 1 + QUIZ_FLASHCARDS.length) % QUIZ_FLASHCARDS.length)} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
            Prev
          </button>
          <button onClick={() => setIndex((value) => (value + 1) % QUIZ_FLASHCARDS.length)} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
            Next
          </button>
        </div>
      </div>
      <div className="rounded-[24px] p-8 min-h-[180px] flex items-center justify-center text-center" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
        <p className="text-2xl font-bold max-w-2xl tracking-[-0.03em]" style={{ color: T.text }}>
          {QUIZ_FLASHCARDS[index]}
        </p>
      </div>
    </div>
  );
}

function RequirementsTab() {
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>(
    Object.fromEntries(REQUIREMENT_DOMAINS.map((domain, index) => [domain.id, index === 0]))
  );
  const [selectedKey, setSelectedKey] = useState(`${REQUIREMENT_DOMAINS[0].id}-0`);
  const selectedRow = REQUIREMENT_DOMAINS.flatMap((domain) =>
    domain.rows.map((row, index) => ({ key: `${domain.id}-${index}`, domain, row }))
  ).find((entry) => entry.key === selectedKey);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {REQUIREMENT_DOMAINS.map((domain) => {
            const open = openDomains[domain.id];
            return (
              <div key={domain.id} className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${domain.color}24` }}>
                <button
                  onClick={() => setOpenDomains((prev) => ({ ...prev, [domain.id]: !prev[domain.id] }))}
                  className="w-full text-left px-5 py-4 flex items-center justify-between cursor-pointer"
                  style={{ background: `${domain.color}10` }}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: domain.color }}>
                      {domain.title}
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                      {domain.rows.length} interview-critical requirements
                    </p>
                  </div>
                  <span style={{ color: domain.color }}>{open ? "−" : "+"}</span>
                </button>
                {open ? (
                  <div className="p-4 space-y-3">
                    {domain.rows.map((row, index) => {
                      const active = selectedKey === `${domain.id}-${index}`;
                      return (
                        <button
                          key={`${domain.id}-${row.requirement}`}
                          onClick={() => setSelectedKey(`${domain.id}-${index}`)}
                          className="w-full text-left rounded-2xl p-4 cursor-pointer"
                          style={{
                            background: active ? `${domain.color}0f` : T.card2,
                            border: `1px solid ${active ? `${domain.color}35` : T.border}`,
                          }}
                        >
                          <div className="grid gap-2 md:grid-cols-[1.7fr_repeat(4,minmax(0,1fr))]">
                            <div>
                              <p className="text-sm font-semibold" style={{ color: T.text }}>
                                {row.requirement}
                              </p>
                            </div>
                            <MiniKpi label="Priority" value={row.priority} />
                            <MiniKpi label="Freshness" value={row.freshness} />
                            <MiniKpi label="Correctness" value={row.correctness} />
                            <MiniKpi label="Consumer" value={row.consumer} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${selectedRow?.domain.color ?? T.blue}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: selectedRow?.domain.color ?? T.blue }}>
                Requirement-to-pipeline mapper
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                Hover a requirement on the left to highlight its flow.
              </p>
            </div>
            {selectedRow ? <Pill color={selectedRow.domain.color}>{selectedRow.row.priority}</Pill> : null}
          </div>
          {selectedRow ? (
            <>
              <h3 className="text-xl font-bold mb-3" style={{ color: T.text }}>
                {selectedRow.row.requirement}
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <InfoTile label="Freshness SLA" value={selectedRow.row.freshness} />
                <InfoTile label="Correctness need" value={selectedRow.row.correctness} />
                <InfoTile label="Consumer" value={selectedRow.row.consumer} />
                <InfoTile label="Domain" value={selectedRow.domain.title} />
              </div>
              <FlowMapper steps={selectedRow.row.flow} accent={selectedRow.domain.color} />
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.amber }}>
            Freshness ladder
          </p>
          <div className="space-y-3">
            {LATENCY_SLA_ROWS.map(([label, value]) => (
              <div key={label} className="rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <p className="text-sm font-medium" style={{ color: T.text }}>
                  {label}
                </p>
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: `${T.amber}12`, color: T.amber, border: `1px solid ${T.amber}24` }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.red }}>
            Non-functional requirements
          </p>
          <div className="space-y-3">
            {NFRS.map((item) => (
              <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <p className="text-sm leading-7" style={{ color: T.muted }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CapacityEstimationExperience() {
  const reduceMotion = useReducedMotion();
  const [activeFlowId, setActiveFlowId] = useState<(typeof ESTIMATION_FLOW)[number]["id"]>(ESTIMATION_FLOW[0].id);
  const [activeAssumptionId, setActiveAssumptionId] = useState<(typeof SAFE_BASELINE_ASSUMPTIONS)[number]["id"]>(SAFE_BASELINE_ASSUMPTIONS[0].id);
  const [activeOutputId, setActiveOutputId] = useState<(typeof SAFE_BASELINE_OUTPUTS)[number]["id"]>(SAFE_BASELINE_OUTPUTS[0].id);
  const [activeFormulaId, setActiveFormulaId] = useState<(typeof BOARD_FORMULAS)[number]["id"]>(BOARD_FORMULAS[0].id);

  const activeFlow = ESTIMATION_FLOW.find((item) => item.id === activeFlowId) ?? ESTIMATION_FLOW[0];
  const activeAssumption = SAFE_BASELINE_ASSUMPTIONS.find((item) => item.id === activeAssumptionId) ?? SAFE_BASELINE_ASSUMPTIONS[0];
  const activeOutput = SAFE_BASELINE_OUTPUTS.find((item) => item.id === activeOutputId) ?? SAFE_BASELINE_OUTPUTS[0];
  const activeFormula = BOARD_FORMULAS.find((item) => item.id === activeFormulaId) ?? BOARD_FORMULAS[0];

  return (
    <div className="space-y-8">
      <AnchoredSection
        id="req-scope"
        eyebrow="Estimation story"
        title="Show the math path before the answer"
        subtitle="A light estimation flow works better than a dense table. Hover any step to see what it is doing."
        accent={T.amber}
      >
        <div
          data-testid="requirements-estimation-flow"
          className="rounded-[28px] p-6"
          style={{ background: T.card, border: `1px solid ${T.amber}24` }}
        >
          <div className="grid gap-4 xl:grid-cols-[repeat(4,minmax(0,1fr))] xl:items-center">
            {ESTIMATION_FLOW.map((step, index) => {
              const active = step.id === activeFlow.id;
              return (
                <div key={step.id} className="relative">
                  <motion.button
                    whileHover={reduceMotion ? undefined : { y: -3 }}
                    onMouseEnter={() => setActiveFlowId(step.id)}
                    onFocus={() => setActiveFlowId(step.id)}
                    className="w-full rounded-[22px] p-5 text-left cursor-pointer"
                    style={{
                      background: active ? `${step.accent}12` : T.card2,
                      border: `1px solid ${active ? `${step.accent}36` : T.border}`,
                    }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: step.accent }}>
                      Step {index + 1}
                    </p>
                    <p className="mt-3 text-lg font-semibold" style={{ color: T.text }}>
                      {step.label}
                    </p>
                    <p className="mt-2 text-sm leading-6" style={{ color: active ? T.text : T.muted }}>
                      {step.metric}
                    </p>
                    {active ? (
                      <motion.div
                        layoutId="estimation-flow-glow"
                        className="mt-4 h-1 rounded-full"
                        style={{ background: step.accent }}
                      />
                    ) : (
                      <div className="mt-4 h-1 rounded-full" style={{ background: "rgba(148,163,184,0.14)" }} />
                    )}
                  </motion.button>

                  {index < ESTIMATION_FLOW.length - 1 ? (
                    <div className="hidden xl:flex absolute -right-[14px] top-1/2 -translate-y-1/2 items-center gap-2 pointer-events-none">
                      <motion.div
                        animate={reduceMotion ? undefined : { opacity: [0.35, 1, 0.35] }}
                        transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.15 }}
                        className="h-px w-8"
                        style={{ background: `${step.accent}88` }}
                      />
                      <motion.span
                        animate={reduceMotion ? undefined : { x: [0, 6, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.15 }}
                        className="text-xl"
                        style={{ color: step.accent }}
                      >
                        →
                      </motion.span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeFlow.id}
              initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-5 rounded-[22px] p-5"
              style={{ background: T.card2, border: `1px solid ${activeFlow.accent}26` }}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: activeFlow.accent }}>
                  Why this step matters
                </p>
                <Pill color={activeFlow.accent}>{activeFlow.metric}</Pill>
              </div>
              <p className="mt-3 text-sm leading-7 max-w-4xl" style={{ color: T.muted }}>
                {activeFlow.detail}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </AnchoredSection>

      <AnchoredSection
        id="req-scale"
        eyebrow="Safe baseline"
        title="Use one baseline and derive everything from it"
        subtitle="Assumptions, calculations, and outputs should read like one flow. Hover any assumption or result to see what it really means."
        accent={T.blue}
      >
        <div className="rounded-[28px] p-5 md:p-6" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr] xl:items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
                Assumptions
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {SAFE_BASELINE_ASSUMPTIONS.map((item) => {
                  const active = item.id === activeAssumption.id;
                  return (
                    <motion.button
                      key={item.id}
                      whileHover={reduceMotion ? undefined : { y: -2 }}
                      onMouseEnter={() => setActiveAssumptionId(item.id)}
                      onFocus={() => setActiveAssumptionId(item.id)}
                      className="rounded-[18px] px-4 py-3 text-left cursor-pointer"
                      style={{
                        background: active ? `${item.accent}14` : T.card2,
                        border: `1px solid ${active ? `${item.accent}34` : T.border}`,
                      }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: item.accent }}>
                        {item.label}
                      </p>
                      <p className="mt-2 text-base font-semibold" style={{ color: T.text }}>
                        {item.value}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.violet }}>
                Derived flow
              </p>
              <div data-testid="requirements-derived-flow" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))]">
                {SAFE_BASELINE_OUTPUTS.map((item, index) => {
                  const active = item.id === activeOutput.id;
                  return (
                    <div key={item.id} className="relative">
                      <motion.button
                        whileHover={reduceMotion ? undefined : { y: -2 }}
                        onMouseEnter={() => setActiveOutputId(item.id)}
                        onFocus={() => setActiveOutputId(item.id)}
                        className="w-full rounded-[20px] p-4 text-left cursor-pointer"
                        style={{
                          background: active ? `${item.accent}14` : T.card2,
                          border: `1px solid ${active ? `${item.accent}34` : T.border}`,
                        }}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: item.accent }}>
                          {item.label}
                        </p>
                        <p className="mt-3 text-[1.3rem] font-semibold tracking-[-0.04em]" style={{ color: T.text }}>
                          {item.value}
                        </p>
                        <p className="mt-2 text-[12px] leading-5" style={{ color: T.faint }}>
                          {item.explain}
                        </p>
                      </motion.button>
                      {index < SAFE_BASELINE_OUTPUTS.length - 1 ? (
                        <div className="hidden xl:flex absolute -right-[12px] top-1/2 -translate-y-1/2 items-center gap-2 pointer-events-none z-10">
                          <motion.div
                            animate={reduceMotion ? undefined : { opacity: [0.35, 1, 0.35], scaleX: [0.85, 1.05, 0.85] }}
                            transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.12 }}
                            className="h-px w-7 origin-left"
                            style={{ background: `${item.accent}88` }}
                          />
                          <motion.span
                            animate={reduceMotion ? undefined : { x: [0, 5, 0] }}
                            transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.12 }}
                            className="text-lg"
                            style={{ color: item.accent }}
                          >
                            →
                          </motion.span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeAssumption.id}
                initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="rounded-[22px] p-5"
                style={{ background: `${activeAssumption.accent}10`, border: `1px solid ${activeAssumption.accent}24` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: activeAssumption.accent }}>
                  Assumption detail
                </p>
                <p className="mt-3 text-sm leading-7" style={{ color: T.muted }}>
                  {activeAssumption.detail}
                </p>
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeOutput.id}
                initial={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
                animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="rounded-[22px] p-5"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${activeOutput.accent}24` }}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: T.text }}>
                    {activeOutput.label}
                  </p>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: `${activeOutput.accent}12`, color: activeOutput.accent, border: `1px solid ${activeOutput.accent}22` }}>
                    {activeOutput.value}
                  </span>
                </div>
                <p className="mt-3 text-sm" style={{ color: T.text }}>
                  {activeOutput.explain}
                </p>
                <p className="mt-2 text-sm leading-7" style={{ color: T.muted }}>
                  {activeOutput.detail}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </AnchoredSection>

      <AnchoredSection
        id="req-domains"
        eyebrow="Derived numbers"
        title="Make the calculations readable"
        subtitle="This is the spoken math chain: what you multiply, what you divide, and why the next number follows from the previous one."
        accent={T.red}
      >
        <div className="rounded-[28px] p-6" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <div data-testid="requirements-math-rail" className="grid gap-4 xl:grid-cols-[repeat(4,minmax(0,1fr))] items-start">
            {[
              {
                id: "math-daily",
                label: "Daily events",
                formula: "100M active profiles/devices × 200 events/day",
                result: "20B/day",
                color: T.red,
              },
              {
                id: "math-average",
                label: "Average events/sec",
                formula: "20B / 86,400 sec/day",
                result: "≈ 231K/sec",
                color: T.blue,
              },
              {
                id: "math-peak",
                label: "Peak events/sec",
                formula: "231K × 5 peak factor",
                result: "≈ 1.15M/sec",
                color: T.violet,
              },
              {
                id: "math-bytes",
                label: "Raw payload/day",
                formula: "20B × 1 KB average size",
                result: "≈ 20 TB/day",
                color: T.gold,
              },
            ].map((item, index) => (
              <div key={item.id} className="relative">
                <motion.div
                  initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.28, delay: index * 0.08 }}
                  className="rounded-[22px] p-5"
                  style={{ background: `${item.color}10`, border: `1px solid ${item.color}24` }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: item.color }}>
                    {item.label}
                  </p>
                  <p className="mt-3 text-sm leading-6" style={{ color: T.muted }}>
                    {item.formula}
                  </p>
                  <p className="mt-4 text-[1.3rem] font-semibold tracking-[-0.05em]" style={{ color: T.text }}>
                    {item.result}
                  </p>
                </motion.div>
                {index < 3 ? (
                  <div className="hidden xl:flex absolute -right-[14px] top-[50px] items-center gap-2 pointer-events-none">
                    <motion.div
                      animate={reduceMotion ? undefined : { scaleX: [0.85, 1.05, 0.85], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.15 }}
                      className="h-px w-8 origin-left"
                      style={{ background: `${item.color}88` }}
                    />
                    <span className="text-lg" style={{ color: item.color }}>
                      →
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 max-w-4xl" style={{ color: T.muted }}>
            Use the simple estimate first. If the interviewer wants more realism, then you can add machine telemetry, CDN/device logs, replication, fan-out, and replay retention as second-order workload classes.
          </p>
        </div>
      </AnchoredSection>

      <AnchoredSection
        id="req-nfr"
        eyebrow="Board formulas"
        title="Write only the formulas you can defend on the board"
        subtitle="Hover each formula so the math stays teachable instead of looking like memorized jargon."
        accent={T.green}
      >
        <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
          <div className="rounded-[28px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
            <div className="space-y-3">
              {BOARD_FORMULAS.map((item) => {
                const active = item.id === activeFormula.id;
                return (
                  <motion.button
                    key={item.id}
                    whileHover={reduceMotion ? undefined : { y: -2 }}
                    onMouseEnter={() => setActiveFormulaId(item.id)}
                    onFocus={() => setActiveFormulaId(item.id)}
                    className="w-full rounded-[20px] p-4 text-left cursor-pointer"
                    style={{
                      background: active ? `${item.accent}14` : T.card2,
                      border: `1px solid ${active ? `${item.accent}34` : T.border}`,
                    }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: item.accent }}>
                      {item.title}
                    </p>
                    <p className="mt-3 font-mono text-[13px] leading-6 whitespace-pre-wrap" style={{ color: T.text }}>
                      {item.formula}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeFormula.id}
              initial={reduceMotion ? undefined : { opacity: 0, x: 10 }}
              animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="rounded-[28px] p-5"
              style={{ background: T.card, border: `1px solid ${activeFormula.accent}24` }}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: activeFormula.accent }}>
                    Formula meaning
                  </p>
                  <h4 className="mt-2 text-[1.45rem] font-semibold tracking-[-0.04em]" style={{ color: T.text }}>
                    {activeFormula.title}
                  </h4>
                </div>
                <Pill color={activeFormula.accent}>2.2</Pill>
              </div>

              <div className="mt-4 rounded-[22px] p-4 font-mono text-[13px] leading-6" style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text }}>
                {activeFormula.formula}
              </div>
              <div className="mt-4 rounded-[22px] p-4" style={{ background: `${activeFormula.accent}10`, border: `1px solid ${activeFormula.accent}24` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: activeFormula.accent }}>
                  Example
                </p>
                <p className="mt-2 text-sm" style={{ color: T.text }}>
                  {activeFormula.example}
                </p>
              </div>
              <p className="mt-4 text-sm leading-7" style={{ color: T.muted }}>
                {activeFormula.meaning}
              </p>
              <p className="mt-3 text-sm leading-7" style={{ color: T.faint }}>
                Always say that per-partition and per-task limits come from benchmarks, not universal constants.
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </AnchoredSection>

      <AnchoredSection
        id="req-say"
        eyebrow="Punchline"
        title="Keep the whole estimate in one place"
        subtitle="After the formulas, keep the whole answer on one internally consistent model."
        accent={T.red}
      >
        <div className="space-y-4">
          <div className="rounded-[28px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
                  Interview-safe baseline
                </p>
                <p className="mt-1 text-[12px]" style={{ color: T.faint }}>
                  The small, internally consistent model you can derive live.
                </p>
              </div>
              <Pill color={T.red}>2.1</Pill>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {SAFE_BASELINE_OUTPUTS.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.45 }}
                  transition={{ duration: 0.24, delay: index * 0.06 }}
                  className="rounded-[20px] p-4"
                  style={{ background: T.card2, border: `1px solid ${item.accent}24` }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: item.accent }}>
                    {item.label}
                  </p>
                  <p className="mt-3 text-[1.25rem] font-semibold tracking-[-0.04em]" style={{ color: T.text }}>
                    {item.value}
                  </p>
                  <p className="mt-2 text-[12px] leading-5" style={{ color: T.faint }}>
                    {item.explain}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[28px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
                    Storage sizing
                  </p>
                  <p className="mt-1 text-[12px]" style={{ color: T.faint }}>
                    Retention is tiered, not one giant forever-hot store.
                  </p>
                </div>
                <Pill color={T.amber}>Iceberg / S3</Pill>
              </div>
              <div className="space-y-3">
                {STORAGE_TIER_CARDS.map((item) => (
                  <div key={item.title} className="rounded-[20px] p-4" style={{ background: T.card2, border: `1px solid ${item.color}24` }}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: item.color }}>
                        {item.title}
                      </p>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: `${item.color}12`, color: item.color, border: `1px solid ${item.color}22` }}>
                        {item.value}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6" style={{ color: T.muted }}>
                      {item.note}
                    </p>
                    <p className="mt-3 text-sm leading-6" style={{ color: T.text }}>
                      {item.example}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[20px] p-4" style={{ background: `${T.amber}10`, border: `1px solid ${T.amber}24` }}>
                <p className="text-sm leading-7" style={{ color: T.muted }}>
                  If raw output lands around <span style={{ color: T.text }}>20 TB/day</span>, then a year of retained raw copies is already around <span style={{ color: T.text }}>7.3 PB/year</span> before compaction, snapshot cleanup, or colder storage classes.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
                    Compute sizing
                  </p>
                  <p className="mt-1 text-[12px]" style={{ color: T.faint }}>
                    Keep the heuristics compact and tie them back to partitions and target lag.
                  </p>
                </div>
                <Pill color={T.green}>Flink + Spark</Pill>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {COMPUTE_SIZING_CARDS.map((item) => (
                  <div key={item.title} className="rounded-[20px] p-4" style={{ background: T.card2, border: `1px solid ${item.color}24` }}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: item.color }}>
                      {item.title}
                    </p>
                    <p className="mt-3 font-mono text-[12px] leading-6" style={{ color: T.text }}>
                      {item.formula}
                    </p>
                    <p className="mt-3 text-sm leading-6" style={{ color: T.muted }}>
                      {item.note}
                    </p>
                    <p className="mt-3 text-sm leading-6" style={{ color: T.text }}>
                      {item.example}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[20px] p-4" style={{ background: `${T.green}10`, border: `1px solid ${T.green}24` }}>
                <p className="text-sm leading-7" style={{ color: T.muted }}>
                  The real punchline is not the exact executor count. It is that both stream and batch must consume from the <span style={{ color: T.text }}>same Kafka-backed log</span> so replay, correction, and fan-out stay coherent.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
            <p className="text-sm leading-7" style={{ color: T.muted }}>
              At this scale, the answer is not &ldquo;buy a bigger box.&rdquo; The answer is partitioned Kafka, benchmarked stream parallelism, replay-friendly retention, and batch plus stream consuming from the same underlying log.
            </p>
            <p className="mt-4 text-sm leading-7" style={{ color: T.text }}>
              &ldquo;I derive throughput from assumptions, convert it into peak load, then size partitions, parallelism, and retention from that peak rather than guessing static infrastructure numbers.&rdquo;
            </p>
          </div>
        </div>
      </AnchoredSection>
    </div>
  );
}

function ScaleEstimationTab({ depthMode }: { depthMode: DepthMode }) {
  const [dauMillions, setDauMillions] = useState(SCALE_DEFAULTS.dauMillions);
  const [eventsPerActivePerDay, setEventsPerActivePerDay] = useState(SCALE_DEFAULTS.eventsPerActivePerDay);
  const [compressedEventKb, setCompressedEventKb] = useState(SCALE_DEFAULTS.compressedEventKb);
  const [peakMultiplier, setPeakMultiplier] = useState(SCALE_DEFAULTS.peakMultiplier);
  const [safeEventsPerPartition, setSafeEventsPerPartition] = useState(SCALE_DEFAULTS.safeEventsPerPartition);
  const [headroomPercent, setHeadroomPercent] = useState(SCALE_DEFAULTS.headroomPercent);
  const [showInterviewExplanation, setShowInterviewExplanation] = useState(false);

  const calculations = useMemo(() => {
    const totalDailyEvents = dauMillions * 1_000_000 * eventsPerActivePerDay;
    const rawTb = (totalDailyEvents * compressedEventKb) / 1_000_000_000;
    const avgEventsPerSecond = totalDailyEvents / 86400;
    const peakEventsPerSecond = avgEventsPerSecond * peakMultiplier;
    const peakIngressGbPerSecond = (peakEventsPerSecond * compressedEventKb) / 1_000_000;
    const partitions = Math.ceil((peakEventsPerSecond / safeEventsPerPartition) * (1 + headroomPercent / 100));
    const bronzeHotPb = (rawTb * SCALE_DEFAULTS.bronzeHotDays) / 1000;
    const silverPb = ((rawTb * 0.5) * SCALE_DEFAULTS.silverRetentionDays) / 1000;
    return {
      totalDailyEvents,
      rawTb,
      avgEventsPerSecond,
      peakEventsPerSecond,
      peakIngressGbPerSecond,
      partitions,
      bronzeHotPb,
      silverPb,
    };
  }, [compressedEventKb, dauMillions, eventsPerActivePerDay, headroomPercent, peakMultiplier, safeEventsPerPartition]);

  const interviewExplanation =
    "I start from one consistent baseline: 100M active profiles or devices, 200 events each per day, and 1 KB per event. From there I derive daily volume, average throughput, peak throughput, partitions, and storage instead of guessing infrastructure numbers.";

  const resetDefaults = () => {
    setDauMillions(SCALE_DEFAULTS.dauMillions);
    setEventsPerActivePerDay(SCALE_DEFAULTS.eventsPerActivePerDay);
    setCompressedEventKb(SCALE_DEFAULTS.compressedEventKb);
    setPeakMultiplier(SCALE_DEFAULTS.peakMultiplier);
    setSafeEventsPerPartition(SCALE_DEFAULTS.safeEventsPerPartition);
    setHeadroomPercent(SCALE_DEFAULTS.headroomPercent);
  };

  const metricCards = [
    {
      label: "Daily events",
      value: `${formatBig(calculations.totalDailyEvents)}`,
      note: "Total daily event volume from the baseline workload.",
      calc: `${dauMillions}M x ${eventsPerActivePerDay}`,
      color: T.red,
    },
    {
      label: "Raw TB / day",
      value: `${formatNumber(calculations.rawTb, 1)} TB`,
      note: "Compressed events only, before replication and lifecycle tiers.",
      calc: `${formatBig(calculations.totalDailyEvents)} x ${compressedEventKb} KB`,
      color: T.amber,
    },
    {
      label: "Avg events / sec",
      value: formatBig(calculations.avgEventsPerSecond),
      note: "Steady-state throughput before prime-time amplification.",
      calc: `${formatBig(calculations.totalDailyEvents)} / 86,400`,
      color: T.green,
    },
    {
      label: "Peak events / sec",
      value: formatBig(calculations.peakEventsPerSecond),
      note: "Prime-time load that drives queueing and compute decisions.",
      calc: `${formatBig(calculations.avgEventsPerSecond)} x ${peakMultiplier}`,
      color: T.violet,
    },
    {
      label: "Peak ingress",
      value: `${formatNumber(calculations.peakIngressGbPerSecond, 2)} GB/s`,
      note: "Network pressure implied by event volume and payload size.",
      calc: `${formatBig(calculations.peakEventsPerSecond)} x ${compressedEventKb} KB`,
      color: T.blue,
    },
    {
      label: "Kafka partitions",
      value: String(calculations.partitions),
      note: "Partition count after safe throughput and headroom.",
      calc: `ceil((${formatBig(calculations.peakEventsPerSecond)} / ${safeEventsPerPartition}) x ${1 + headroomPercent / 100})`,
      color: T.gold,
    },
    {
      label: "Bronze hot storage",
      value: `${formatNumber(calculations.bronzeHotPb, 2)} PB`,
      note: "Hot replayable raw history kept immediately accessible.",
      calc: `${formatNumber(calculations.rawTb, 1)} x ${SCALE_DEFAULTS.bronzeHotDays} days`,
      color: T.blue,
    },
    {
      label: "Silver retention",
      value: `${formatNumber(calculations.silverPb, 2)} PB`,
      note: "Trusted cleaned layer kept longer for analytics and correction.",
      calc: `(${formatNumber(calculations.rawTb, 1)} x 0.5) x ${SCALE_DEFAULTS.silverRetentionDays} days`,
      color: T.violet,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <div className="rounded-[22px] p-3.5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <div className="flex items-start justify-between gap-2.5 mb-2.5 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
                Interactive scale calculator
              </p>
              <p className="text-[10px] mt-1 max-w-md leading-5" style={{ color: T.faint }}>
                Turn interview assumptions into throughput, storage, and partition math.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={resetDefaults} className="text-[11px] px-3 py-1.5 rounded-xl font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
                Reset defaults
              </button>
              <button onClick={() => setShowInterviewExplanation((v) => !v)} className="text-[11px] px-3 py-1.5 rounded-xl font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
                {showInterviewExplanation ? "Hide explanation" : "Show explanation"}
              </button>
            </div>
          </div>
          <div className="space-y-2.5">
            <RangeField label="Active profiles / devices (millions)" value={dauMillions} min={20} max={150} step={5} suffix="M" onChange={setDauMillions} />
            <RangeField label="Events / active / day" value={eventsPerActivePerDay} min={50} max={400} step={10} suffix="" onChange={setEventsPerActivePerDay} />
            <RangeField label="Average event size" value={compressedEventKb} min={0.5} max={2} step={0.1} suffix="KB" onChange={setCompressedEventKb} />
            <RangeField label="Peak multiplier" value={peakMultiplier} min={2} max={8} step={1} suffix="x" onChange={setPeakMultiplier} />
            <RangeField label="Safe events/sec/partition" value={safeEventsPerPartition} min={5000} max={20000} step={1000} suffix="" onChange={setSafeEventsPerPartition} />
            <RangeField label="Headroom" value={headroomPercent} min={10} max={60} step={5} suffix="%" onChange={setHeadroomPercent} />
          </div>
          {showInterviewExplanation ? (
            <div className="mt-3 rounded-2xl p-3" style={{ background: `${T.blue}0f`, border: `1px solid ${T.blue}24` }}>
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <p className="text-[13px] font-semibold" style={{ color: T.text }}>
                  How to say it in the interview
                </p>
                <CopyButton value={interviewExplanation} />
              </div>
              <p className="text-[13px] leading-6" style={{ color: T.muted }}>
                {interviewExplanation}
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 content-start">
          {metricCards
            .slice(0, depthMode === "beginner" ? 6 : 8)
            .map((item) => (
              <div key={item.label} className="rounded-[18px] p-3" style={{ background: T.card, border: `1px solid ${item.color}24` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.color }}>
                  {item.label}
                </p>
                <p className="mt-1.5 text-[1.8rem] leading-none font-bold tracking-[-0.05em]" style={{ color: T.text }}>
                  {item.value}
                </p>
                <p className="mt-1.5 text-[10px] font-mono leading-4" style={{ color: item.color }}>
                  {item.calc}
                </p>
                <p className="mt-1.5 text-[11px] leading-5" style={{ color: T.faint }}>
                  {item.note}
                </p>
              </div>
            ))}

          <div className="rounded-[18px] p-3 md:col-span-2 xl:col-span-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
              Calculation chain
            </p>
            <div className="mt-2.5 grid gap-x-4 gap-y-1.5 md:grid-cols-2 xl:grid-cols-3">
              <p className="text-[12px] leading-5" style={{ color: T.muted }}>
                1. Daily events = active profiles/devices × events per active per day
              </p>
              <p className="text-[12px] leading-5" style={{ color: T.muted }}>
                2. Average events/sec = daily events ÷ 86,400
              </p>
              <p className="text-[12px] leading-5" style={{ color: T.muted }}>
                3. Peak events/sec = average events/sec × peak multiplier
              </p>
              <p className="text-[12px] leading-5" style={{ color: T.muted }}>
                4. Raw TB/day = daily events × average event size
              </p>
              <p className="text-[12px] leading-5 md:col-span-2 xl:col-span-2" style={{ color: T.muted }}>
                5. Kafka partitions = peak events/sec ÷ safe throughput per partition, then add headroom
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventTaxonomyTab() {
  const [familyId, setFamilyId] = useState<EventFamilyId>(EVENT_FAMILIES[0].id);
  const [eventId, setEventId] = useState<EventId>(EVENT_FAMILIES[0].events[0].id);
  const family = EVENT_FAMILIES.find((item) => item.id === familyId) ?? EVENT_FAMILIES[0];
  const selectedEvent = family.events.find((item) => item.id === eventId) ?? family.events[0];

  useEffect(() => {
    setEventId(family.events[0].id);
  }, [familyId, family.events]);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-4">
        {EVENT_FAMILIES.map((group) => (
          <button
            key={group.id}
            onClick={() => setFamilyId(group.id)}
            className="w-full text-left rounded-[22px] p-5 cursor-pointer"
            style={{
              background: familyId === group.id ? `${group.color}0f` : T.card,
              border: `1px solid ${familyId === group.id ? `${group.color}35` : T.border}`,
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: group.color }}>
                  {group.title}
                </p>
                <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                  {group.events.length} key interview events
                </p>
              </div>
              <Pill color={group.color}>Family</Pill>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.events.map((event) => (
                <button
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFamilyId(group.id);
                    setEventId(event.id);
                  }}
                  className="px-3 py-2 rounded-full text-xs font-semibold cursor-pointer"
                  style={{
                    background: selectedEvent.id === event.id ? `${group.color}18` : T.card2,
                    color: T.text,
                    border: `1px solid ${selectedEvent.id === event.id ? `${group.color}35` : T.border}`,
                  }}
                >
                  {event.name}
                </button>
              ))}
            </div>
          </button>
        ))}
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${family.color}24` }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: family.color }}>
              Event contract drawer
            </p>
            <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
              {selectedEvent.name}
            </h3>
          </div>
          <CopyButton value={selectedEvent.samplePayload} label="Copy payload" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <DetailBlock title="Purpose" accent={family.color}>
            {selectedEvent.purpose}
          </DetailBlock>
          <DetailBlock title="Used for" accent={family.color}>
            <ul className="space-y-2">
              {selectedEvent.usedFor.map((item) => (
                <li key={item} className="text-sm" style={{ color: T.muted }}>
                  {item}
                </li>
              ))}
            </ul>
          </DetailBlock>
          <DetailBlock title="Downstream consumers" accent={family.color}>
            <ul className="space-y-2">
              {selectedEvent.consumers.map((item) => (
                <li key={item} className="text-sm" style={{ color: T.muted }}>
                  {item}
                </li>
              ))}
            </ul>
          </DetailBlock>
        </div>
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr] mt-4">
          <div className="rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: family.color }}>
              Required fields
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedEvent.fields.map((field) => (
                <span key={field} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: `${family.color}12`, color: T.text, border: `1px solid ${family.color}24` }}>
                  {field}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-4 font-mono text-xs leading-6 overflow-auto no-scrollbar" style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text }}>
            <pre className="whitespace-pre-wrap">{selectedEvent.samplePayload}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchitectureTab({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  const [reveals, setReveals] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<ArchitectureNodeId>(ARCHITECTURE_NODES[2]?.id ?? ARCHITECTURE_NODES[0].id);
  const [overlayMode, setOverlayMode] = useState<"base" | "replay" | "governance" | "cost">("base");
  const [drawerTab, setDrawerTab] = useState<"overview" | "input" | "output" | "failure" | "interview">("overview");
  const visibleNodes = ARCHITECTURE_NODES.filter((node) => node.reveal === "base" || reveals.includes(node.reveal));
  const selectedNode = visibleNodes.find((node) => node.id === selectedNodeId) ?? visibleNodes[0];
  const visibleNodeMap = new Map(visibleNodes.map((node) => [node.id, node] as const));
  const selectedPathNodeIds = (() => {
    switch (overlayMode) {
      case "replay":
        return new Set<ArchitectureNodeId>(["clients", "event-gateway", "kafka", "bronze", "replay", "silver", "gold", "bi-ml"]);
      case "governance":
        return new Set<ArchitectureNodeId>(["clients", "event-gateway", "kafka", "bronze", "silver", "governance", "quality", "gold", "bi-ml"]);
      case "cost":
        return new Set<ArchitectureNodeId>(["clients", "event-gateway", "kafka", "bronze", "silver", "gold", "bi-ml"]);
      default:
        if (selectedNode?.id === "feature-store") return new Set<ArchitectureNodeId>(["clients", "event-gateway", "kafka", "flink", "silver", "feature-store", "bi-ml"]);
        if (selectedNode?.id === "quality") return new Set<ArchitectureNodeId>(["clients", "event-gateway", "kafka", "quality", "silver", "gold"]);
        if (selectedNode?.id === "governance") return new Set<ArchitectureNodeId>(["clients", "event-gateway", "kafka", "bronze", "silver", "governance", "gold"]);
        if (selectedNode?.id === "replay") return new Set<ArchitectureNodeId>(["clients", "event-gateway", "kafka", "bronze", "replay", "silver", "gold"]);
        return new Set<ArchitectureNodeId>(["clients", "event-gateway", "kafka", "flink", "bronze", "silver", "gold", "bi-ml"]);
    }
  })();
  const visibleLinks = ARCHITECTURE_LINKS.filter(
    (link) => visibleNodeMap.has(link.from as ArchitectureNodeId) && visibleNodeMap.has(link.to as ArchitectureNodeId)
  );
  const highlightedLinks = visibleLinks.filter((link) => {
    const groupMatch = overlayMode === "base" ? link.groups.includes("base") || selectedPathNodeIds.has(link.from as ArchitectureNodeId) || selectedPathNodeIds.has(link.to as ArchitectureNodeId) : link.groups.includes(overlayMode) || link.groups.includes("base");
    const selectionMatch = selectedPathNodeIds.has(link.from as ArchitectureNodeId) && selectedPathNodeIds.has(link.to as ArchitectureNodeId);
    return groupMatch && selectionMatch;
  });

  useEffect(() => {
    if (!visibleNodes.find((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(visibleNodes[0]?.id ?? ARCHITECTURE_NODES[0].id);
    }
  }, [selectedNodeId, visibleNodes]);

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
              Interactive architecture canvas
            </p>
            <p className="text-[12px] mt-1" style={{ color: T.faint }}>
              Click nodes, switch overlays, and trace how the event journey changes from source to replay and serving.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Reset diagram", action: () => { setOverlayMode("base"); setDrawerTab("overview"); setSelectedNodeId("kafka"); }, active: false },
              { label: "Play event journey", action: () => { setOverlayMode("base"); setSelectedNodeId("flink"); }, active: overlayMode === "base" },
              { label: "Show replay path", action: () => { setOverlayMode("replay"); setSelectedNodeId("replay"); }, active: overlayMode === "replay" },
              { label: "Show governance overlay", action: () => { setOverlayMode("governance"); setSelectedNodeId("governance"); }, active: overlayMode === "governance" },
              { label: "Show cost overlay", action: () => { setOverlayMode("cost"); setSelectedNodeId("bronze"); }, active: overlayMode === "cost" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: item.active ? `${T.red}18` : T.card2, color: item.active ? T.red : T.text, border: `1px solid ${item.active ? `${T.red}33` : T.border}` }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {ARCHITECTURE_REVEALS.map((item) => {
              const active = reveals.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => setReveals((prev) => (prev.includes(item.id) ? prev.filter((entry) => entry !== item.id) : [...prev, item.id]))}
                  className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: active ? `${T.blue}18` : T.card2,
                    color: active ? T.blue : T.text,
                    border: `1px solid ${active ? `${T.blue}33` : T.border}`,
                  }}
                >
                  + {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[26px] p-5 relative overflow-hidden" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
          <div className="absolute inset-0 opacity-45" style={{ backgroundImage: "linear-gradient(color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="relative min-h-[420px]">
            <div className="hidden xl:block absolute inset-x-0 top-6 px-3">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Emit + validate", color: T.blue },
                  { label: "Durable backbone", color: T.amber },
                  { label: "Processing + lakehouse", color: T.violet },
                  { label: "Serving + recovery", color: T.gold },
                ].map((lane) => (
                  <div key={lane.label} className="rounded-full px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em]" style={{ background: `${lane.color}10`, color: lane.color, border: `1px solid ${lane.color}20` }}>
                    {lane.label}
                  </div>
                ))}
              </div>
            </div>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {visibleLinks.map((link) => {
                const from = visibleNodeMap.get(link.from as ArchitectureNodeId);
                const to = visibleNodeMap.get(link.to as ArchitectureNodeId);
                if (!from || !to) return null;
                const highlighted = highlightedLinks.includes(link);
                return (
                  <g key={`${link.from}-${link.to}`}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={highlighted ? from.color : "rgba(148,163,184,0.35)"}
                      strokeWidth={highlighted ? 1.8 : 0.8}
                      strokeDasharray={overlayMode === "replay" && link.groups.includes("replay") ? "3 2" : undefined}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={(from.x + to.x) / 2}
                      cy={(from.y + to.y) / 2}
                      r={highlighted ? 0.9 : 0}
                      fill={highlighted ? from.color : "transparent"}
                    />
                  </g>
                );
              })}
            </svg>
            <div className="hidden xl:block absolute left-[15%] top-[22%] rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ background: `${T.blue}10`, color: T.blue, border: `1px solid ${T.blue}20` }}>
              Schema Registry / Contract Validation
            </div>
            {visibleNodes.map((node, index) => (
              <button
                key={node.id}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  setDrawerTab("overview");
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[20px] px-4 py-3 text-left min-w-[170px] max-w-[210px] cursor-pointer transition-all duration-200 hover:-translate-y-[53%]"
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  background: selectedNode?.id === node.id ? `${node.color}16` : T.card,
                  border: `1px solid ${selectedNode?.id === node.id ? `${node.color}35` : T.border}`,
                  boxShadow: selectedNode?.id === node.id ? `0 0 0 2px ${node.color}26, 0 18px 28px ${node.color}22` : highlightedLinks.some((link) => link.from === node.id || link.to === node.id) ? `0 12px 24px ${node.color}10` : "none",
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: node.color }}>
                  {index < 2 ? "Source" : index < 4 ? "Backbone" : index < 7 ? "Processing" : "Serving"}
                </p>
                <p className="text-sm font-bold mt-1 leading-5" style={{ color: T.text }}>
                  {node.label}
                </p>
                <p className="text-[11px] mt-2" style={{ color: highlightedLinks.some((link) => link.from === node.id || link.to === node.id) ? node.color : T.faint }}>
                  {selectedNode?.id === node.id ? "Selected path highlighted" : "Click to inspect"}
                </p>
              </button>
            ))}
            {highlightedLinks.slice(0, 4).map((link, index) => {
              const from = visibleNodeMap.get(link.from as ArchitectureNodeId);
              const to = visibleNodeMap.get(link.to as ArchitectureNodeId);
              if (!from || !to) return null;
              return <AnimatedDot key={`${link.from}-${link.to}`} left={from.x} top={from.y} endLeft={to.x} endTop={to.y} delay={index * 0.8} color={from.color} />;
            })}
            <div className="hidden xl:flex absolute bottom-3 right-3 gap-2 flex-wrap justify-end max-w-[340px]">
              {["Click nodes", "Open deep dives", "Trace replay paths", "Preview selected edges"].map((item) => (
                <span key={item} className="px-3 py-1.5 rounded-full text-[11px] font-semibold" style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${selectedNode?.color ?? T.blue}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: selectedNode?.color ?? T.blue }}>
                Pipeline node drawer
              </p>
              <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
                {selectedNode?.label}
              </h3>
            </div>
            <button onClick={() => onNavigate(normalizeDataEngineeringTab(selectedNode.deepDive) ?? "architecture")} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
              Open deep dive
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { id: "overview", label: "Overview" },
              { id: "input", label: "Input" },
              { id: "output", label: "Output" },
              { id: "failure", label: "Failure" },
              { id: "interview", label: "Interview line" },
            ].map((item) => {
              const active = drawerTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setDrawerTab(item.id as typeof drawerTab)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: active ? `${selectedNode.color}18` : T.card2, color: active ? selectedNode.color : T.text, border: `1px solid ${active ? `${selectedNode.color}33` : T.border}` }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {drawerTab === "overview" ? (
              <>
                <DetailBlock title="What it does" accent={selectedNode.color}>{selectedNode.what}</DetailBlock>
                <DetailBlock title="Why it exists" accent={selectedNode.color}>{selectedNode.why}</DetailBlock>
                <DetailBlock title="Connected path" accent={selectedNode.color} className="md:col-span-2">
                  {Array.from(selectedPathNodeIds).map((id) => visibleNodeMap.get(id)).filter(Boolean).map((node) => node?.label).join(" → ")}
                </DetailBlock>
              </>
            ) : null}
            {drawerTab === "input" ? (
              <DetailBlock title="Input" accent={selectedNode.color} className="md:col-span-2">{selectedNode.input}</DetailBlock>
            ) : null}
            {drawerTab === "output" ? (
              <DetailBlock title="Output" accent={selectedNode.color} className="md:col-span-2">{selectedNode.output}</DetailBlock>
            ) : null}
            {drawerTab === "failure" ? (
              <DetailBlock title="Failure mode" accent={selectedNode.color} className="md:col-span-2">{selectedNode.failure}</DetailBlock>
            ) : null}
            {drawerTab === "interview" ? (
              <DetailBlock title="Say this in interview" accent={selectedNode.color} className="md:col-span-2">{selectedNode.interview}</DetailBlock>
            ) : null}
          </div>
        </div>

        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
              Quick node jumps
            </p>
            <span className="text-[11px]" style={{ color: T.faint }}>
              Jump directly to a layer
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {visibleNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  setDrawerTab("overview");
                }}
                className="rounded-2xl p-4 text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: selectedNode.id === node.id ? `${node.color}12` : T.card2, border: `1px solid ${selectedNode.id === node.id ? `${node.color}33` : T.border}` }}
              >
                <p className="text-sm font-semibold" style={{ color: T.text }}>
                  {node.label}
                </p>
                <p className="text-[12px] mt-2 leading-6" style={{ color: T.faint }}>
                  {node.what}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IngestionTab() {
  const [selectedLaneId, setSelectedLaneId] = useState<IngestionLaneId>(INGESTION_LANES[0].id);
  const selectedLane = INGESTION_LANES.find((lane) => lane.id === selectedLaneId) ?? INGESTION_LANES[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
      <div className="space-y-3">
        {INGESTION_LANES.map((lane) => {
          const active = selectedLane.id === lane.id;
          return (
            <button
              key={lane.id}
              onClick={() => setSelectedLaneId(lane.id)}
              className="w-full text-left rounded-[24px] p-5 cursor-pointer"
              style={{ background: active ? `${lane.color}0f` : T.card, border: `1px solid ${active ? `${lane.color}35` : T.border}` }}
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: lane.color }}>
                    {lane.title}
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                    {lane.flow.length} steps
                  </p>
                </div>
                <Pill color={lane.color}>Lane</Pill>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {lane.flow.map((step, index) => (
                  <div key={step} className="flex items-center gap-2">
                    <span className="px-3 py-2 rounded-full text-xs font-semibold" style={{ background: active ? `${lane.color}12` : T.card2, color: T.text, border: `1px solid ${active ? `${lane.color}24` : T.border}` }}>
                      {step}
                    </span>
                    {index < lane.flow.length - 1 ? <span style={{ color: lane.color }}>→</span> : null}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${selectedLane.color}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: selectedLane.color }}>
          Selected lane
        </p>
        <h3 className="text-2xl font-bold mb-4" style={{ color: T.text }}>
          {selectedLane.title}
        </h3>
        <FlowMapper steps={selectedLane.flow} accent={selectedLane.color} />
        <div className="space-y-3 mt-4">
          {selectedLane.details.map((item) => (
            <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
              <p className="text-sm leading-7" style={{ color: T.muted }}>
                {item}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function KafkaTopicsTab() {
  const [selectedTopicId, setSelectedTopicId] = useState<KafkaTopicId>(KAFKA_TOPICS[0].id);
  const [peakEventsPerSec, setPeakEventsPerSec] = useState(2000000);
  const [safePerPartition, setSafePerPartition] = useState(10000);
  const [headroomPct, setHeadroomPct] = useState(30);
  const selectedTopic = KAFKA_TOPICS.find((topic) => topic.id === selectedTopicId) ?? KAFKA_TOPICS[0];
  const requiredPartitions = Math.ceil((peakEventsPerSec / safePerPartition) * (1 + headroomPct / 100));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-3 md:grid-cols-2">
          {KAFKA_TOPICS.map((topic) => {
            const active = selectedTopic.id === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => setSelectedTopicId(topic.id)}
                className="rounded-[22px] p-4 text-left cursor-pointer"
                style={{ background: active ? `${T.amber}12` : T.card, border: `1px solid ${active ? `${T.amber}33` : T.border}` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
                  Topic
                </p>
                <p className="text-sm font-bold mt-2" style={{ color: T.text }}>
                  {topic.name}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <MiniKpi label="Partitions" value={topic.partitions} />
                  <MiniKpi label="Retention" value={topic.retention} />
                  <MiniKpi label="Key" value={topic.key} />
                  <MiniKpi label="Format" value={topic.format} />
                </div>
              </button>
            );
          })}
        </div>
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
                Kafka topic explorer
              </p>
              <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
                {selectedTopic.name}
              </h3>
            </div>
            <Pill color={T.amber}>{selectedTopic.partitions} partitions</Pill>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InfoTile label="Retention" value={selectedTopic.retention} />
            <InfoTile label="Key" value={selectedTopic.key} />
            <InfoTile label="Format" value={selectedTopic.format} />
            <InfoTile label="Producer" value={selectedTopic.producer} />
          </div>
          <DetailBlock title="Consumers" accent={T.amber} className="mt-4">
            <ul className="space-y-2">
              {selectedTopic.consumers.map((item) => (
                <li key={item} className="text-sm" style={{ color: T.muted }}>
                  {item}
                </li>
              ))}
            </ul>
          </DetailBlock>
          <DetailBlock title="Risk" accent={T.red} className="mt-4">
            {selectedTopic.risk}
          </DetailBlock>
        </div>
      </div>

      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
              Interactive partition calculator
            </p>
            <p className="text-[12px] mt-1" style={{ color: T.faint }}>
              required partitions = ceil(peak / per_partition x headroom)
            </p>
          </div>
          <MetricCard label="Required partitions" value={String(requiredPartitions)} note="Ceiling with headroom included" color={T.gold} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <RangeField label="Peak events/sec" value={peakEventsPerSec} min={500000} max={3000000} step={100000} suffix="" onChange={setPeakEventsPerSec} />
          <RangeField label="Safe events/sec/partition" value={safePerPartition} min={5000} max={20000} step={1000} suffix="" onChange={setSafePerPartition} />
          <RangeField label="Headroom %" value={headroomPct} min={10} max={60} step={5} suffix="%" onChange={setHeadroomPct} />
        </div>
      </div>
    </div>
  );
}

function StreamingPipelineTab() {
  const [selectedJobId, setSelectedJobId] = useState<FlinkJobId>(FLINK_JOBS[0].id);
  const selectedJob = FLINK_JOBS.find((job) => job.id === selectedJobId) ?? FLINK_JOBS[0];
  const explanation = STREAMING_JOB_EXPLANATIONS[selectedJob.id];
  const jobButtonRefs = useRef<Partial<Record<FlinkJobId, HTMLButtonElement | null>>>({});

  useEffect(() => {
    jobButtonRefs.current[selectedJob.id]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedJob.id]);

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] p-4" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
              Flink jobs
            </p>
            <p className="mt-1 text-[12px]" style={{ color: T.faint }}>
              Pick one live pipeline to see its input, state, timing, and output path.
            </p>
          </div>
          <Pill color={selectedJob.color}>{selectedJob.sla}</Pill>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FLINK_JOBS.map((job) => {
            const active = selectedJob.id === job.id;
            return (
              <motion.button
                key={job.id}
                ref={(node) => {
                  jobButtonRefs.current[job.id] = node;
                }}
                type="button"
                onClick={() => setSelectedJobId(job.id)}
                whileHover={{ y: -2 }}
                className="rounded-full px-3 py-2 text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                style={{
                  background: active ? `${job.color}16` : T.card2,
                  color: active ? job.color : T.text,
                  border: `1px solid ${active ? `${job.color}36` : T.border}`,
                }}
              >
                {job.title}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${selectedJob.color}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: selectedJob.color }}>
                Selected job
              </p>
              <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
                {selectedJob.title}
              </h3>
              <p className="text-sm mt-3 leading-7" style={{ color: T.muted }}>
                {selectedJob.output}
              </p>
            </div>
          </div>

          <div className="rounded-[20px] p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: selectedJob.color }}>
              Flow
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {selectedJob.flow.map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="px-3 py-2 rounded-full text-xs font-semibold" style={{ background: `${selectedJob.color}14`, color: T.text, border: `1px solid ${selectedJob.color}24` }}>
                    {step}
                  </span>
                  {index < selectedJob.flow.length - 1 ? (
                    <motion.span
                      aria-hidden="true"
                      initial={{ x: -2, opacity: 0.45 }}
                      animate={{ x: [ -2, 4, -2 ], opacity: [0.45, 1, 0.45] }}
                      transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: index * 0.08 }}
                      className="text-base font-semibold"
                      style={{ color: selectedJob.color }}
                    >
                      →
                    </motion.span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 mt-4">
            <InfoTile label="Input topics" value={selectedJob.inputTopics.join(", ")} />
            <InfoTile label="KeyBy" value={selectedJob.keyBy} />
            <InfoTile label="Window" value={selectedJob.window} />
            <InfoTile label="Watermark" value={selectedJob.watermark} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${selectedJob.color}24` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: selectedJob.color }}>
              What this job is doing
            </p>
            <p className="text-sm mt-3 leading-7" style={{ color: T.text }}>
              {explanation.runtime}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
                Why this shape works
              </p>
              <p className="text-sm mt-3 leading-7" style={{ color: T.text }}>
                {explanation.whyThisShape}
              </p>
            </div>

            <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
                Where the output goes
              </p>
              <p className="text-sm mt-3 leading-7" style={{ color: T.text }}>
                {explanation.outputUse}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${selectedJob.color}24` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: selectedJob.color }}>
                Stateful logic
              </p>
              <p className="text-sm mt-3 leading-7" style={{ color: T.text }}>
                {selectedJob.state}
              </p>
            </div>

            <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
                Failure behavior
              </p>
              <p className="text-sm mt-3 leading-7" style={{ color: T.text }}>
                {selectedJob.failure}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WatchTimeTab() {
  const [mode, setMode] = useState<WatchMetricMode>("engagement");
  const modeInfo = WATCH_TIME_DEFINITIONS.find((item) => item.id === mode) ?? WATCH_TIME_DEFINITIONS[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
                Interactive timeline
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                Heartbeats count. Pause does not. Buffering is tracked separately.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {WATCH_TIME_TIMELINE.map((item) => (
              <div key={`${item.time}-${item.event}`} className="rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-3">
                  <span className="w-24 text-xs font-semibold" style={{ color: T.faint }}>
                    {item.time}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: T.text }}>
                    {item.event}
                  </span>
                </div>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{
                    background: item.status === "counted" ? `${T.green}12` : item.status === "ignored" ? `${T.red}12` : `${T.blue}12`,
                    color: item.status === "counted" ? T.green : item.status === "ignored" ? T.red : T.blue,
                    border: `1px solid ${item.status === "counted" ? `${T.green}24` : item.status === "ignored" ? `${T.red}24` : `${T.blue}24`}`,
                  }}
                >
                  {item.status === "counted" ? "Counted watch seconds" : item.status === "ignored" ? "Not counted" : "State change"}
                </span>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3 mt-4">
            <InfoTile label="Counted watch seconds" value="120" />
            <InfoTile label="Paused seconds" value="Not counted" />
            <InfoTile label="Buffering seconds" value="Tracked separately" />
          </div>
        </div>

        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.blue }}>
            Toggle definitions
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {WATCH_TIME_DEFINITIONS.map((item) => (
              <button key={item.id} onClick={() => setMode(item.id)} className="px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer" style={{ background: mode === item.id ? `${T.blue}18` : T.card2, color: mode === item.id ? T.blue : T.text, border: `1px solid ${mode === item.id ? `${T.blue}33` : T.border}` }}>
                {item.label}
              </button>
            ))}
          </div>
          <DetailBlock title={modeInfo.label} accent={T.blue}>
            {modeInfo.description}
          </DetailBlock>
          <div className="grid gap-4 mt-4">
            <div className="rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: T.amber }}>
                Total Watch Time
              </p>
              <div className="h-4 rounded-full overflow-hidden" style={{ background: `${T.amber}10` }}>
                <div className="h-full rounded-full" style={{ width: "100%", background: `linear-gradient(90deg, ${T.amber}, ${T.orange})` }} />
              </div>
              <p className="text-sm mt-2" style={{ color: T.muted }}>
                0–10 min + 5–15 min = 20 minutes
              </p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: T.violet }}>
                Unique Content Coverage
              </p>
              <div className="h-4 rounded-full overflow-hidden" style={{ background: `${T.violet}10` }}>
                <div className="h-full rounded-full" style={{ width: "75%", background: `linear-gradient(90deg, ${T.violet}, ${T.blue})` }} />
              </div>
              <p className="text-sm mt-2" style={{ color: T.muted }}>
                0–15 min = 15 minutes of unique coverage
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
            Counting rules
          </p>
          <div className="mt-4 space-y-3">
            {[
              "Count `heartbeat_interval_sec` only when `is_playing = true`, `is_paused = false`, and the event is valid plus non-duplicate.",
              "Store `total_watch_seconds`, `session_seconds`, `buffering_seconds`, and `unique_content_seconds_watched` as separate measures so one UX issue does not pollute another business metric.",
            ].map((detail) => (
              <div key={detail} className="rounded-[18px] p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <p className="text-sm leading-7" style={{ color: T.text }}>
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.violet}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.violet }}>
            Derived metrics
          </p>
          <div className="mt-4 space-y-3">
            {[
              "Compute `completion_pct` from `unique_content_seconds_watched / content_duration_seconds`, not from total watch time, so rewinds do not fake completion.",
              "If buffering matters for QoE or UX alerts, keep it in its own metric family instead of inflating engagement watch time.",
            ].map((detail) => (
              <div key={detail} className="rounded-[18px] p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <p className="text-sm leading-7" style={{ color: T.text }}>
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionizationTab() {
  const [scenarioId, setScenarioId] = useState<SessionScenarioId>(SESSIONIZATION_SCENARIOS[0].id);
  const scenario = SESSIONIZATION_SCENARIOS.find((item) => item.id === scenarioId) ?? SESSIONIZATION_SCENARIOS[0];
  const explanation = SESSION_SCENARIO_EXPLANATIONS[scenario.id];
  const scenarioButtonRefs = useRef<Partial<Record<SessionScenarioId, HTMLButtonElement | null>>>({});

  useEffect(() => {
    scenarioButtonRefs.current[scenario.id]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [scenario.id]);

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] p-4" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
              Session scenarios
            </p>
            <p className="mt-1 text-[12px]" style={{ color: T.faint }}>
              Switch the situation and see how Flink decides session boundaries and journey rollups.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SESSIONIZATION_SCENARIOS.map((item) => (
            <button
              key={item.id}
              ref={(node) => {
                scenarioButtonRefs.current[item.id] = node;
              }}
              onClick={() => setScenarioId(item.id)}
              className="rounded-full px-3 py-2 text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap"
              style={{ background: scenario.id === item.id ? `${T.blue}18` : T.card2, color: scenario.id === item.id ? T.blue : T.text, border: `1px solid ${scenario.id === item.id ? `${T.blue}33` : T.border}` }}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
            Selected scenario
          </p>
          <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
            {scenario.title}
          </h3>
          <p className="text-sm mt-3 leading-7" style={{ color: T.text }}>
            {scenario.summary}
          </p>
          <p className="text-sm mt-3 leading-7" style={{ color: T.muted }}>
            {scenario.output}
          </p>
          <div className="mt-5 rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.amber }}>
              Raw events → session
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {scenario.rawEvents.map((event, index) => (
                <div key={`${event}-${index}`} className="flex items-center gap-2">
                  <span className="px-3 py-2 rounded-full text-xs font-semibold" style={{ background: `${T.amber}12`, color: T.text, border: `1px solid ${T.amber}24` }}>
                    {event}
                  </span>
                  {index < scenario.rawEvents.length - 1 ? <span style={{ color: T.amber }}>→</span> : null}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.blue }}>
              Flink session state
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                "session_id",
                "session_start_time",
                "last_event_time",
                "last_heartbeat_time",
                "watch_seconds",
                "buffering_seconds",
                "pause_count",
                "seek_count",
                "seen_event_ids",
                "watched_segments",
              ].map((field) => (
                <span key={field} className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
                  {field}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
              What Flink does
            </p>
            <p className="text-sm mt-3 leading-7" style={{ color: T.text }}>
              {explanation.whatFlinkDoes}
            </p>
          </div>
          <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
              Why this matters
            </p>
            <p className="text-sm mt-3 leading-7" style={{ color: T.text }}>
              {explanation.whyItMatters}
            </p>
          </div>
          <div className="rounded-[24px] p-5" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.red }}>
              Decision rules
            </p>
            <FlowMapper accent={T.red} steps={scenario.rules} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LateEventsTab() {
  const [arrivalHours, setArrivalHours] = useState(0.08);
  const category = arrivalHours <= LATE_EVENT_POLICY.watermarkMinutes / 60
    ? { title: "On-time event", color: T.green, detail: "Process normally in the stream path." }
    : arrivalHours <= LATE_EVENT_POLICY.allowedLatenessHours
      ? { title: "Late but allowed event", color: T.amber, detail: "Update previous window or session state and let correction keep trust aligned." }
      : { title: "Very late event", color: T.red, detail: "Send to late_events / correction flow and patch Silver/Gold with an audited batch job." };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${category.color}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
                Late event simulator
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                Drag arrival delay to see how the event should be handled.
              </p>
            </div>
            <Pill color={category.color}>{category.title}</Pill>
          </div>
          <RangeField label="Arrival delay after event time" value={arrivalHours} min={0} max={36} step={0.25} suffix="h" onChange={setArrivalHours} />
          <div className="grid gap-3 md:grid-cols-3 mt-5">
            <PathCard title="On-time event" active={category.title === "On-time event"} color={T.green} detail="Process normally with streaming state and live outputs." />
            <PathCard title="Late but allowed" active={category.title === "Late but allowed event"} color={T.amber} detail="Update previous windows or sessions if within allowed lateness." />
            <PathCard title="Very late event" active={category.title === "Very late event"} color={T.red} detail="Route to late_events and correction flow." />
          </div>
          <div className="mt-4 rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-sm leading-7" style={{ color: T.muted }}>
              {category.detail}
            </p>
          </div>
        </div>

        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
                Replay flow
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                Controlled correction, not manual copy-paste.
              </p>
            </div>
          </div>
          <FlowMapper steps={REPLAY_FLOW} accent={T.red} />
          <div className="mt-4 rounded-2xl p-4" style={{ background: `${T.red}10`, border: `1px solid ${T.red}24` }}>
            <p className="text-sm leading-7 font-medium" style={{ color: T.text }}>
              {LATE_EVENT_POLICY.replayWarning}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LakehouseTab() {
  const [layerId, setLayerId] = useState<LakehouseLayerId>(LAKEHOUSE_LAYERS[0].id);
  const layer = LAKEHOUSE_LAYERS.find((item) => item.id === layerId) ?? LAKEHOUSE_LAYERS[0];
  const selectedIndex = LAKEHOUSE_LAYERS.findIndex((item) => item.id === layer.id);
  const memoryHooks: Record<LakehouseLayerId, string> = {
    bronze: "Bronze means raw replayable history. We land it fast and avoid editing source truth.",
    silver: "Silver means trusted reusable data. This is where cleanup, dedupe, and standardization happen.",
    gold: "Gold means official business truth. Dashboards and downstream teams should read here, not invent parallel logic.",
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-[26px] p-5 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${T.card} 0%, ${T.card2} 100%)`,
          border: `1px solid ${T.violet}24`,
        }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.violet }}>
              Memory path
            </p>
            <h3 className="text-xl font-bold mt-2" style={{ color: T.text }}>
              Raw - Trusted - Official
            </h3>
            <p className="text-sm mt-2 max-w-2xl" style={{ color: T.faint }}>
              This is the easiest way to explain the lakehouse in an interview: Bronze lands raw truth, Silver creates trusted reusable data, and Gold publishes official metrics.
            </p>
          </div>
          <Pill color={layer.color}>Step {selectedIndex + 1} of {LAKEHOUSE_LAYERS.length}</Pill>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
          {LAKEHOUSE_LAYERS.map((item, index) => {
            const active = item.id === layer.id;
            return (
              <div key={item.id} className="contents">
                <motion.button
                  type="button"
                  onMouseEnter={() => setLayerId(item.id)}
                  onFocus={() => setLayerId(item.id)}
                  onClick={() => setLayerId(item.id)}
                  whileHover={{ y: -3 }}
                  className="rounded-[24px] p-4 text-left cursor-pointer"
                  style={{
                    background: active ? `${item.color}16` : T.card,
                    border: `1px solid ${active ? `${item.color}38` : T.border}`,
                    boxShadow: active ? `0 18px 50px -28px ${item.color}` : "none",
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.color }}>
                    Layer {index + 1}
                  </p>
                  <h4 className="text-lg font-bold mt-2" style={{ color: T.text }}>
                    {item.title}
                  </h4>
                  <p className="text-sm mt-2 leading-6" style={{ color: T.muted }}>
                    {item.summary}
                  </p>
                </motion.button>
                {index < LAKEHOUSE_LAYERS.length - 1 ? (
                  <div className="hidden lg:flex items-center justify-center text-2xl font-semibold" style={{ color: item.color }}>
                    →
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={layer.id}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22 }}
          className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${layer.color}24` }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: layer.color }}>
                  Selected layer
                </p>
                <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
                  {layer.title}
                </h3>
              </div>
              <Pill color={layer.color}>{memoryHooks[layer.id].split(".")[0]}</Pill>
            </div>
            <p className="text-sm mt-3 leading-7" style={{ color: T.muted }}>
              {memoryHooks[layer.id]}
            </p>
            <div className="grid gap-4 md:grid-cols-2 mt-5">
              <DetailBlock title="Inputs" accent={layer.color}>
                <ul className="space-y-2">
                  {layer.inputs.map((item) => (
                    <li key={item} className="text-sm" style={{ color: T.muted }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </DetailBlock>
              <DetailBlock title="Rules" accent={layer.color}>
                <ul className="space-y-2">
                  {layer.rules.map((item) => (
                    <li key={item} className="text-sm" style={{ color: T.muted }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </DetailBlock>
            </div>
          </div>

          <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${layer.color}24` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: layer.color }}>
              How to say it
            </p>
            <div className="mt-4 grid gap-3">
              {[
                `I start with ${layer.title} because ${memoryHooks[layer.id].toLowerCase()}`,
                `The main responsibility here is ${layer.summary.toLowerCase()}`,
                `The handoff to the next layer only happens after these rules are met.`,
              ].map((line, index) => (
                <motion.div
                  key={`${layer.id}-${index}`}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-[18px] p-4"
                  style={{ background: T.card2, border: `1px solid ${T.border}` }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: layer.color }}>
                    Line {index + 1}
                  </p>
                  <p className="mt-2 text-sm leading-7" style={{ color: T.text }}>
                    {line}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TableDesignTab() {
  const [tableName, setTableName] = useState<TableName>(TABLE_SCHEMAS[0].name);
  const [columnName, setColumnName] = useState<TableColumnName>(TABLE_SCHEMAS[0].columns[0]?.name ?? "");
  const table = TABLE_SCHEMAS.find((item) => item.name === tableName) ?? TABLE_SCHEMAS[0];
  const column = table.columns.find((item) => item.name === columnName) ?? table.columns[0];
  const columnFormula = "formula" in column ? column.formula : undefined;

  useEffect(() => {
    setColumnName((table.columns[0]?.name ?? "") as TableColumnName);
  }, [table.name, table.columns]);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.6fr_0.8fr_0.8fr]">
      <div className="rounded-[24px] p-4" style={{ background: T.card, border: `1px solid ${T.violet}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.violet }}>
          Tables
        </p>
        <div className="space-y-2">
          {TABLE_SCHEMAS.map((item, index) => (
            <button key={`${item.name}-${index}`} onClick={() => setTableName(item.name)} className="w-full text-left rounded-xl p-3 cursor-pointer" style={{ background: item.name === table.name ? `${T.violet}12` : T.card2, border: `1px solid ${item.name === table.name ? `${T.violet}33` : T.border}` }}>
              <p className="text-sm font-semibold" style={{ color: T.text }}>
                {item.name}
              </p>
              <p className="text-[11px] mt-1" style={{ color: T.faint }}>
                {item.group}
              </p>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] p-4" style={{ background: T.card, border: `1px solid ${T.violet}24` }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.violet }}>
              Schema columns
            </p>
            <h3 className="text-xl font-bold mt-1" style={{ color: T.text }}>
              {table.name}
            </h3>
          </div>
          <Pill color={T.violet}>{table.group}</Pill>
        </div>
        <div className="space-y-2">
          {table.columns.map((item, index) => (
            <button key={`${table.name}-${item.name}-${index}`} onClick={() => setColumnName(item.name)} className="w-full text-left rounded-xl p-3 cursor-pointer" style={{ background: item.name === column.name ? `${T.blue}12` : T.card2, border: `1px solid ${item.name === column.name ? `${T.blue}33` : T.border}` }}>
              <p className="text-sm font-semibold" style={{ color: T.text }}>
                {item.name}
              </p>
              <p className="text-[11px] mt-1" style={{ color: T.faint }}>
                {item.type}
              </p>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <div className="grid gap-3 md:grid-cols-2 mb-4">
          <InfoTile label="Grain" value={table.grain} />
          <InfoTile label="Partition" value={table.partition} />
          <InfoTile label="Bucket" value={table.bucket} />
          <InfoTile label="Use case" value={table.useCase} />
        </div>
        <DetailBlock title={column.name} accent={T.blue}>
          <p className="text-sm leading-7" style={{ color: T.muted }}>
            {column.definition}
          </p>
          {columnFormula ? (
            <div className="mt-3 rounded-xl p-3 font-mono text-xs" style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text }}>
              {columnFormula}
            </div>
          ) : null}
        </DetailBlock>
        <DetailBlock title="Example query" accent={T.violet} className="mt-4">
          <pre className="whitespace-pre-wrap font-mono text-xs leading-6" style={{ color: T.text }}>
            {table.exampleQuery}
          </pre>
        </DetailBlock>
        <DetailBlock title="Interview follow-up" accent={T.red} className="mt-4">
          {table.followUp}
        </DetailBlock>
      </div>
    </div>
  );
}

function BatchPipelineTab() {
  const [stepId, setStepId] = useState<BatchStepId>(BATCH_DAG_STEPS[0].id);
  const step = BATCH_DAG_STEPS.find((item) => item.id === stepId) ?? BATCH_DAG_STEPS[0];
  const activeIndex = BATCH_DAG_STEPS.findIndex((item) => item.id === step.id);
  const batchStoryline = [
    {
      id: "land",
      label: "Raw source arrives",
      accent: T.violet,
      source: "Kafka playback topics + CDC profile/title snapshots + partner metadata files",
      output: "Complete Bronze partitions for the batch window",
      why: "Batch should start only after all expected raw inputs for that day or hour have landed.",
    },
    {
      id: "trust",
      label: "Clean into Silver",
      accent: T.blue,
      source: "bronze.playback_events + content/profile dimensions",
      output: "silver.playback_events and trusted fact tables",
      why: "This step parses raw JSON, removes duplicates, fixes timestamps, joins dimensions, and creates reusable clean tables.",
    },
    {
      id: "publish",
      label: "Publish official Gold",
      accent: T.gold,
      source: "Trusted Silver facts + dimensions",
      output: "gold reporting marts such as content watch-hours and daily business metrics",
      why: "Only after DQ passes do we compute the final business tables that dashboards and leadership should trust.",
    },
    {
      id: "serve",
      label: "Make it visible",
      accent: T.green,
      source: "Published Gold tables",
      output: "BI dashboards, warehouse tables, lineage, and downstream consumers",
      why: "After publish, we refresh the systems that read Gold so everyone sees one consistent version of the truth.",
    },
  ] as const;

  return (
    <div className="space-y-5">
        <div
          className="rounded-[26px] p-5 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${T.card} 0%, ${T.card2} 100%)`,
            border: `1px solid ${T.gold}24`,
        }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
              Interview flow
            </p>
            <h3 className="text-xl font-bold mt-2" style={{ color: T.text }}>
              {"Raw -> Trusted -> Official -> Visible"}
            </h3>
            <p className="text-sm mt-2 max-w-3xl" style={{ color: T.faint }}>
              If you remember just one sequence for this section, use this one. It gives you a clean story before you zoom into DAG mechanics.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
          {batchStoryline.map((item, index) => (
            <div key={item.id} className="contents">
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[22px] p-4"
                style={{ background: `${item.accent}12`, border: `1px solid ${item.accent}28` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.accent }}>
                  Step {index + 1}
                </p>
                <p className="text-sm font-semibold mt-2" style={{ color: T.text }}>
                  {item.label}
                </p>
                <div className="mt-3 space-y-2">
                  <div className="rounded-[14px] px-3 py-2" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.accent }}>
                      Source
                    </p>
                    <p className="text-[12px] mt-1 leading-6" style={{ color: T.text }}>
                      {item.source}
                    </p>
                  </div>
                  <div className="rounded-[14px] px-3 py-2" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.accent }}>
                      Output
                    </p>
                    <p className="text-[12px] mt-1 leading-6" style={{ color: T.text }}>
                      {item.output}
                    </p>
                  </div>
                </div>
                <p className="text-[12px] mt-3 leading-6" style={{ color: T.muted }}>
                  {item.why}
                </p>
              </motion.div>
              {index < batchStoryline.length - 1 ? (
                <div className="hidden lg:flex items-center justify-center text-2xl font-semibold" style={{ color: item.accent }}>
                  →
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                Daily DAG
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                Follow the run in order. Hover or click a node to inspect what changes there.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {BATCH_DAG_STEPS.map((item, index) => {
              const active = item.id === step.id;
              return (
                <div key={item.id} className="relative">
                  {index < BATCH_DAG_STEPS.length - 1 ? (
                    <div className="absolute left-[17px] top-10 bottom-[-14px] w-px" style={{ background: active ? `${T.gold}55` : `${T.border}` }} />
                  ) : null}
                  <motion.button
                    type="button"
                    onMouseEnter={() => setStepId(item.id)}
                    onFocus={() => setStepId(item.id)}
                    onClick={() => setStepId(item.id)}
                    whileHover={{ x: 4 }}
                    className="w-full text-left rounded-[20px] p-4 cursor-pointer"
                    style={{
                      background: active ? `${T.gold}14` : T.card2,
                      border: `1px solid ${active ? `${T.gold}38` : T.border}`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{ background: active ? `${T.gold}24` : T.card, color: T.gold }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: T.text }}>
                          {item.label}
                        </p>
                        <p className="text-[12px] mt-1 leading-6" style={{ color: T.faint }}>
                          {item.output}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="rounded-[26px] p-5 xl:sticky xl:top-6 self-start"
            style={{ background: T.card, border: `1px solid ${T.gold}24` }}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                  Selected node
                </p>
                <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
                  {step.label}
                </h3>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mt-5">
              <DetailBlock title="Inputs" accent={T.gold}>{step.input}</DetailBlock>
              <DetailBlock title="Logic" accent={T.gold}>{step.logic}</DetailBlock>
              <DetailBlock title="Output" accent={T.gold}>{step.output}</DetailBlock>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr] mt-5">
              <div className="rounded-[20px] p-4" style={{ background: `${T.blue}10`, border: `1px solid ${T.blue}24` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
                  Why this node matters
                </p>
                <p className="text-sm mt-2 leading-7" style={{ color: T.text }}>
                  {activeIndex <= 1
                    ? "This is where the batch run protects itself from partial truth. Starting too early creates expensive downstream correction work."
                    : activeIndex <= 5
                      ? "This is the trust-building middle of the pipeline. If Silver is wrong, every downstream report, mart, and experiment inherits the mistake."
                      : "This is the publication boundary. Gold, warehouse refreshes, and lineage updates are what turn internal processing into visible business truth."}
                </p>
              </div>
              <div className="rounded-[20px] p-4" style={{ background: `${T.green}10`, border: `1px solid ${T.green}24` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
                  Say it out loud
                </p>
                <p className="text-sm mt-2 leading-7" style={{ color: T.text }}>
                  {`At ${step.label.toLowerCase()}, the pipeline takes ${step.input.toLowerCase()} and applies ${step.logic.toLowerCase()} so the next stage receives ${step.output.toLowerCase()}.`}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function DataQualityTab() {
  const [selectedMetric, setSelectedMetric] = useState<DqMetricLabel>(DQ_METRICS[1].label);
  const metric = DQ_METRICS.find((item) => item.label === selectedMetric) ?? DQ_METRICS[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DQ_METRICS.map((item) => (
          <button key={item.label} onClick={() => setSelectedMetric(item.label)} className="rounded-2xl p-4 text-left cursor-pointer" style={{ background: metric.label === item.label ? `${item.color}12` : T.card, border: `1px solid ${metric.label === item.label ? `${item.color}33` : T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.color }}>
              {item.label}
            </p>
            <p className="text-2xl font-bold mt-2" style={{ color: T.text }}>
              {item.value}
            </p>
            <p className="text-[12px] mt-2 leading-5" style={{ color: T.faint }}>
              {item.note}
            </p>
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${metric.color}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: metric.color }}>
            Investigation path
          </p>
          <h3 className="text-2xl font-bold mt-2 mb-4" style={{ color: T.text }}>
            {metric.label}
          </h3>
          <p className="text-sm leading-7 mb-4" style={{ color: T.muted }}>
            Possible causes: missing Kafka partition, Flink lag, schema change, bad dedupe logic, content dimension join failure, or late-event spike.
          </p>
          <FlowMapper steps={DQ_INVESTIGATION_PATH} accent={metric.color} />
        </div>
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.red }}>
            Severity cards
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {DQ_SEVERITIES.map((item) => (
              <div key={item.level} className="rounded-2xl p-4" style={{ background: `${item.color}10`, border: `1px solid ${item.color}24` }}>
                <p className="text-sm font-bold" style={{ color: item.color }}>
                  {item.level}
                </p>
                <p className="text-sm mt-2 leading-6" style={{ color: T.muted }}>
                  {item.rule}
                </p>
                <p className="text-[12px] mt-2" style={{ color: T.faint }}>
                  {item.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GovernanceTab() {
  const [fieldName, setFieldName] = useState<GovernanceFieldName>(GOVERNANCE_FIELDS[0].name);
  const field = GOVERNANCE_FIELDS.find((item) => item.name === fieldName) ?? GOVERNANCE_FIELDS[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.green }}>
          PII classification matrix
        </p>
        <div className="space-y-3">
          {GOVERNANCE_FIELDS.map((item) => (
            <button key={item.name} onClick={() => setFieldName(item.name)} className="w-full text-left rounded-2xl p-4 cursor-pointer" style={{ background: field.name === item.name ? `${T.green}12` : T.card2, border: `1px solid ${field.name === item.name ? `${T.green}33` : T.border}` }}>
              <p className="text-sm font-bold" style={{ color: T.text }}>
                {item.name}
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                {item.classification}
              </p>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
              Field policy
            </p>
            <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
              {field.name}
            </h3>
            <p className="text-sm mt-2" style={{ color: T.faint }}>
              {field.classification}
            </p>
            <div className="space-y-3 mt-4">
              {field.policy.map((item) => (
                <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <p className="text-sm leading-7" style={{ color: T.muted }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.green }}>
              Must include
            </p>
            <div className="space-y-3">
              {GOVERNANCE_CHECKLIST.map((item) => (
                <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <p className="text-sm leading-7" style={{ color: T.muted }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GovernanceContractsDeepDive() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {GOVERNANCE_MUST_KNOW.map((item) => (
          <div key={item.title} className="rounded-[22px] p-4" style={{ background: T.card, border: `1px solid ${item.accent}24` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.accent }}>
              Must know
            </p>
            <p className="text-lg font-bold mt-2" style={{ color: T.text }}>
              {item.title}
            </p>
            <p className="text-sm mt-3 leading-7" style={{ color: T.muted }}>
              {item.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
            Schema evolution policy
          </p>
          <div className="mt-4">
            <FlowMapper steps={SCHEMA_EVOLUTION_RULES} accent={T.green} />
          </div>
        </div>
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
            Certified dataset rules
          </p>
          <div className="space-y-3 mt-4">
            {CERTIFIED_DATASET_RULES.map((rule) => (
              <div key={rule} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <p className="text-sm leading-7" style={{ color: T.muted }}>
                  {rule}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GovernancePublishControls() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {PUBLISH_BLOCKERS.map((item) => (
          <div key={item.title} className="rounded-[22px] p-4" style={{ background: T.card, border: `1px solid ${item.accent}24` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.accent }}>
              {item.eyebrow}
            </p>
            <p className="text-lg font-bold mt-2" style={{ color: T.text }}>
              {item.title}
            </p>
            <p className="text-sm mt-3 leading-7" style={{ color: T.muted }}>
              {item.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
            Reconciliation checks
          </p>
          <div className="space-y-3 mt-4">
            {RECONCILIATION_CHECKS.map((item) => (
              <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <p className="text-sm leading-7" style={{ color: T.muted }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
            Quarantine to replay
          </p>
          <div className="mt-4">
            <FlowMapper steps={QUARANTINE_REPLAY_FLOW} accent={T.amber} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GovernanceOperatingModel() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
            Ownership ladder
          </p>
          <div className="space-y-3 mt-4">
            {GOVERNANCE_OWNERSHIP_LADDER.map((item) => (
              <div key={item.title} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <p className="text-sm font-bold" style={{ color: T.text }}>
                  {item.title}
                </p>
                <p className="text-sm mt-2 leading-7" style={{ color: T.muted }}>
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
            Delete propagation
          </p>
          <div className="mt-4">
            <FlowMapper steps={DELETE_PROPAGATION_FLOW} accent={T.green} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GovernanceQualityControlRoom() {
  const [selectedMetric, setSelectedMetric] = useState<DqMetricLabel>(DQ_METRICS[1].label);
  const [selectedQuestion, setSelectedQuestion] = useState<(typeof GOVERNANCE_RELEASE_QUESTIONS)[number]["question"]>(GOVERNANCE_RELEASE_QUESTIONS[0].question);
  const metric = DQ_METRICS.find((item) => item.label === selectedMetric) ?? DQ_METRICS[0];
  const investigationPath = DQ_INVESTIGATION_BY_METRIC[metric.label] ?? DQ_INVESTIGATION_PATH;
  const activeQuestion = GOVERNANCE_RELEASE_QUESTIONS.find((item) => item.question === selectedQuestion) ?? GOVERNANCE_RELEASE_QUESTIONS[0];
  const ownershipHint =
    metric.label === "Freshness"
      ? "Usually starts with upstream ingestion, source readiness, or stream lag."
      : metric.label === "Duplicate rate"
        ? "Usually starts with producer retries, event_id behavior, or idempotency drift."
        : metric.label === "Late event %"
          ? "Usually starts with client buffering, watermark policy, or offline sync."
          : metric.label === "DLQ count"
            ? "Usually starts with the table owner, the failed validation path, and replay readiness."
            : "Usually starts with the pipeline owner.";

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {PUBLISH_BLOCKERS.map((item) => (
          <div key={item.title} className="rounded-[22px] p-4" style={{ background: T.card, border: `1px solid ${item.accent}24` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.accent }}>
              {item.eyebrow}
            </p>
            <p className="text-lg font-bold mt-2" style={{ color: T.text }}>
              {item.title}
            </p>
            <p className="text-sm mt-3 leading-7" style={{ color: T.muted }}>
              {item.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr] xl:items-start">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${metric.color}24` }}>
          <div className="flex items-center gap-2 flex-wrap">
            {DQ_METRICS.map((item) => {
              const active = item.label === metric.label;
              return (
                <button
                  key={item.label}
                  onClick={() => setSelectedMetric(item.label)}
                  className="px-3 py-2 rounded-full text-xs font-semibold cursor-pointer"
                  style={{
                    background: active ? `${item.color}16` : T.card2,
                    color: active ? T.text : T.muted,
                    border: `1px solid ${active ? `${item.color}33` : T.border}`,
                  }}
                >
                  {item.label}: {item.value}
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: metric.color }}>
                Selected signal
              </p>
              <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
                {metric.label}
              </h3>
              <p className="text-sm mt-2 leading-7" style={{ color: T.muted }}>
                {metric.note}
              </p>
              <div className="grid gap-3 mt-4">
                <div className="rounded-[18px] p-3.5" style={{ background: `${metric.color}10`, border: `1px solid ${metric.color}20` }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: metric.color }}>
                    Why it matters
                  </p>
                  <p className="text-[12px] mt-2 leading-6" style={{ color: T.faint }}>
                    The answer should connect this signal to business risk, owner, and release behavior, not just quote the number.
                  </p>
                </div>
                <div className="rounded-[18px] p-3.5" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: metric.color }}>
                    First owner
                  </p>
                  <p className="text-[12px] mt-2 leading-6" style={{ color: T.faint }}>
                    {ownershipHint}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[20px] p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: metric.color }}>
                First things to check
              </p>
              <div className="mt-3">
                <FlowMapper steps={investigationPath} accent={metric.color} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
            Reconciliation checks
          </p>
          <div className="space-y-3 mt-4">
            {RECONCILIATION_CHECKS.map((item) => (
              <div key={item} className="rounded-xl p-3.5" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <p className="text-sm leading-7" style={{ color: T.muted }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
        <div className="grid gap-4 xl:grid-cols-[0.42fr_1fr] xl:items-start">
          <div className="rounded-[20px] p-4 h-fit" style={{ background: `${T.amber}12`, border: `1px solid ${T.amber}20` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
              When to use this
            </p>
            <h3 className="text-xl font-bold mt-2" style={{ color: T.text }}>
              Quarantine and replay after trust fails in staging
            </h3>
            <p className="text-sm mt-3 leading-7" style={{ color: T.muted }}>
              Use this path when Bronze has already landed and a Silver or pre-publish Gold build fails contract, DQ, or reconciliation checks before official publish.
            </p>
            <p className="text-sm mt-3 leading-7" style={{ color: T.faint }}>
              Instead of letting the bad run leak into dashboards, keep consumers on the last certified version, isolate the broken partitions or records, fix the transform or schema issue, and replay only the affected slice.
            </p>
          </div>
          <div>
            <FlowMapper steps={QUARANTINE_REPLAY_FLOW} accent={T.amber} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {GOVERNANCE_RELEASE_QUESTIONS.map((item) => {
          const active = item.question === activeQuestion.question;
          return (
            <button
              key={item.question}
              type="button"
              onMouseEnter={() => setSelectedQuestion(item.question)}
              onFocus={() => setSelectedQuestion(item.question)}
              onClick={() => setSelectedQuestion(item.question)}
              className="rounded-[18px] p-3.5 text-left cursor-pointer"
              style={{ background: active ? `${item.color}14` : T.card2, border: `1px solid ${active ? `${item.color}36` : T.border}` }}
            >
              <p className="text-[11px] font-semibold leading-5" style={{ color: T.text }}>
                {item.question}
              </p>
            </button>
          );
        })}
      </div>

      <div className="rounded-[18px] p-4" style={{ background: `${activeQuestion.color}18`, border: `1px solid ${activeQuestion.color}32` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: activeQuestion.color }}>
          Interview answer
        </p>
        <p className="text-sm mt-2 leading-7" style={{ color: T.muted }}>
          {activeQuestion.answer}
        </p>
      </div>
    </div>
  );
}

function GovernanceIncidentFlow() {
  return (
    <div className="space-y-5">
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
        <p className="text-sm font-bold uppercase tracking-[0.22em] mb-4" style={{ color: T.red }}>
          Failure scenarios
        </p>
        <ReliabilityTab />
      </div>
    </div>
  );
}

function GovernancePrivacyOps() {
  const [fieldName, setFieldName] = useState<GovernanceFieldName>(GOVERNANCE_FIELDS[0].name);
  const [selectedQuestion, setSelectedQuestion] = useState<(typeof GOVERNANCE_PRIVACY_QUESTIONS)[number]["question"]>(GOVERNANCE_PRIVACY_QUESTIONS[0].question);
  const field = GOVERNANCE_FIELDS.find((item) => item.name === fieldName) ?? GOVERNANCE_FIELDS[0];
  const activeQuestion = GOVERNANCE_PRIVACY_QUESTIONS.find((item) => item.question === selectedQuestion) ?? GOVERNANCE_PRIVACY_QUESTIONS[0];

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
          Privacy ops
        </p>
        <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
          Protect sensitive fields in the analytics path
        </h3>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr] xl:items-start">
        <div className="h-fit">
          <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
            Sensitive fields
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {GOVERNANCE_FIELDS.map((item) => {
              const active = item.name === field.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setFieldName(item.name)}
                  className="px-3 py-2 rounded-full text-xs font-semibold cursor-pointer"
                  style={{
                    background: active ? `${T.green}16` : T.card2,
                    color: active ? T.text : T.muted,
                    border: `1px solid ${active ? `${T.green}33` : T.border}`,
                  }}
                >
                  {item.name}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-1 mt-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
                Classification
              </p>
              <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
                {field.name}
              </h3>
              <p className="text-sm mt-2" style={{ color: T.faint }}>
                {field.classification}
              </p>
              <div className="rounded-[18px] p-3.5 mt-4" style={{ background: `${T.green}10`, border: `1px solid ${T.green}20` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
                  Interview framing
                </p>
                <p className="text-[12px] mt-2 leading-6" style={{ color: T.faint }}>
                  Explain where this field can exist in raw form, where it must be masked or tokenized, and why downstream Gold marts should not need the raw identifier at all.
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              {field.policy.map((item) => (
                <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <p className="text-sm leading-7" style={{ color: T.muted }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
              Ownership and access model
            </p>
            <div className="grid gap-3 mt-4 md:grid-cols-2">
              {GOVERNANCE_OWNERSHIP_LADDER.map((item) => (
                <div key={item.title} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <p className="text-sm font-bold" style={{ color: T.text }}>
                    {item.title}
                  </p>
                  <p className="text-sm mt-2 leading-7" style={{ color: T.muted }}>
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
              Privacy boundary
            </p>
            <div className="grid gap-3 mt-4">
              {[
                "Raw identity fields may exist in tightly controlled Bronze or trusted engineering layers, but published Gold dashboards should read masked, tokenized, or aggregated derivatives.",
                "If a dashboard or analyst asks for raw email, device ID, or billing details directly, that usually means the data product boundary is wrong and needs a narrower governed access path.",
                "The key interview point is the boundary itself: raw identity for controlled operational workflows, identity-safe outputs for broad analytics consumption.",
              ].map((item) => (
                <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <p className="text-sm leading-7" style={{ color: T.muted }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
          Always include
        </p>
        <div className="grid gap-3 mt-4 md:grid-cols-2 xl:grid-cols-3">
          {GOVERNANCE_CHECKLIST.map((item) => (
            <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
              <p className="text-sm leading-7" style={{ color: T.muted }}>
                {item}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {GOVERNANCE_PRIVACY_QUESTIONS.map((item) => {
          const active = item.question === activeQuestion.question;
          return (
            <button
              key={item.question}
              type="button"
              onMouseEnter={() => setSelectedQuestion(item.question)}
              onFocus={() => setSelectedQuestion(item.question)}
              onClick={() => setSelectedQuestion(item.question)}
              className="rounded-[18px] p-3.5 text-left cursor-pointer"
              style={{ background: active ? `${item.color}14` : T.card2, border: `1px solid ${active ? `${item.color}36` : T.border}` }}
            >
              <p className="text-[11px] font-semibold leading-5" style={{ color: T.text }}>
                {item.question}
              </p>
            </button>
          );
        })}
      </div>

      <div className="rounded-[18px] p-4" style={{ background: `${activeQuestion.color}18`, border: `1px solid ${activeQuestion.color}32` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: activeQuestion.color }}>
          Interview answer
        </p>
        <p className="text-sm mt-2 leading-7" style={{ color: T.muted }}>
          {activeQuestion.answer}
        </p>
      </div>
    </div>
  );
}

function FeatureStoreTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <FeatureCard title={FEATURE_STORE_CONTENT.offline.title} color={FEATURE_STORE_CONTENT.offline.color} summary={FEATURE_STORE_CONTENT.offline.summary} bullets={FEATURE_STORE_CONTENT.offline.bullets} />
        <FeatureCard title={FEATURE_STORE_CONTENT.online.title} color={FEATURE_STORE_CONTENT.online.color} summary={FEATURE_STORE_CONTENT.online.summary} bullets={FEATURE_STORE_CONTENT.online.bullets} />
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.purple}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.purple }}>
          Feature flow
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {FEATURE_STORE_CONTENT.flow.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <span className="px-3 py-2 rounded-full text-xs font-semibold" style={{ background: `${T.purple}12`, color: T.text, border: `1px solid ${T.purple}24` }}>
                {step}
              </span>
              {index < FEATURE_STORE_CONTENT.flow.length - 1 ? <span style={{ color: T.purple }}>→</span> : null}
            </div>
          ))}
        </div>
      </div>
      <AnswerCard title="Point-in-time correctness" body={FEATURE_STORE_CONTENT.pointInTime} accent={T.purple} />
    </div>
  );
}

function ServingLayerTab() {
  const [workload, setWorkload] = useState<ServingWorkload>(SERVING_MATRIX[0].workload);
  const item = SERVING_MATRIX.find((entry) => entry.workload === workload) ?? SERVING_MATRIX[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.gold }}>
          Workload-to-store matrix
        </p>
        <div className="space-y-3">
          {SERVING_MATRIX.map((entry) => (
            <button key={entry.workload} onClick={() => setWorkload(entry.workload)} className="w-full text-left rounded-2xl p-4 cursor-pointer" style={{ background: workload === entry.workload ? `${T.gold}12` : T.card2, border: `1px solid ${workload === entry.workload ? `${T.gold}33` : T.border}` }}>
              <p className="text-sm font-bold" style={{ color: T.text }}>
                {entry.workload}
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                {entry.recommended}
              </p>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
          Selected workload
        </p>
        <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
          {item.workload}
        </h3>
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <DetailBlock title="Recommended" accent={T.gold}>{item.recommended}</DetailBlock>
          <DetailBlock title="Why" accent={T.gold}>{item.why}</DetailBlock>
          <DetailBlock title="Not ideal" accent={T.red} className="md:col-span-2">{item.notIdeal}</DetailBlock>
        </div>
      </div>
    </div>
  );
}

function ReliabilityTab() {
  const [incidentId, setIncidentId] = useState<ReliabilityIncidentId>(RELIABILITY_INCIDENTS[0].id);
  const incident = RELIABILITY_INCIDENTS.find((item) => item.id === incidentId) ?? RELIABILITY_INCIDENTS[0];
  const stages = [
    { title: "What you see first", detail: incident.detection, accent: T.red },
    { title: "Why it matters", detail: incident.impact, accent: T.amber },
    { title: "What I do immediately", detail: incident.mitigation, accent: T.blue },
    { title: "How I restore trust", detail: incident.recovery, accent: T.green },
    { title: "How I stop repeat incidents", detail: incident.prevention, accent: T.violet },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {RELIABILITY_INCIDENTS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setIncidentId(item.id)}
            onMouseEnter={() => setIncidentId(item.id)}
            onFocus={() => setIncidentId(item.id)}
            className="rounded-[20px] p-4 text-left cursor-pointer"
            style={{ background: incident.id === item.id ? `${T.red}12` : T.card2, border: `1px solid ${incident.id === item.id ? `${T.red}33` : T.border}` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: incident.id === item.id ? T.red : T.faint }}>
              {item.eyebrow}
            </p>
            <p className="text-sm font-bold mt-2" style={{ color: T.text }}>
              {item.title}
            </p>
            <p className="text-[12px] mt-2 leading-5" style={{ color: T.faint }}>
              {item.detection}
            </p>
          </button>
        ))}
      </div>

      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
          Incident walkthrough
        </p>
        <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
          {incident.title}
        </h3>

        <div className="grid gap-3 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] mt-5">
          {stages.map((stage, index) => (
            <div key={stage.title} className="contents">
              <div className="rounded-[20px] p-4" style={{ background: `${stage.accent}08`, border: `1px solid ${stage.accent}24` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: stage.accent }}>
                  {stage.title}
                </p>
                <p className="text-sm mt-3 leading-6" style={{ color: T.text }}>
                  {stage.detail}
                </p>
              </div>
              {index < stages.length - 1 ? (
                <div className="hidden xl:flex items-center justify-center text-2xl font-light" style={{ color: stages[index + 1].accent }}>
                  →
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="rounded-[20px] p-4 mt-4" style={{ background: `${T.violet}10`, border: `1px solid ${T.violet}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.violet }}>
            What I would actually say
          </p>
          <p className="text-sm mt-2 leading-7" style={{ color: T.muted }}>
            {incident.interview}
          </p>
        </div>

      </div>
    </div>
  );
}

function TradeoffsTab() {
  const [decision, setDecision] = useState<TradeoffDecision>(TRADEOFFS[0].decision);
  const item = TRADEOFFS.find((entry) => entry.decision === decision) ?? TRADEOFFS[0];

  return (
    <div className="space-y-3">
      <div className="rounded-[18px] p-3.5" style={{ background: `${T.amber}10`, border: `1px solid ${T.amber}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
            Cost framing
          </p>
          <p className="text-[13px] mt-2.5 leading-6" style={{ color: T.text }}>
            Good answers show where Netflix should pay for freshness, where it should pay for replayability, and where it should stop duplicating the same truth across too many systems.
          </p>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          {TRADEOFFS.map((entry) => (
            <button
              key={entry.decision}
              onClick={() => setDecision(entry.decision)}
              onMouseEnter={() => setDecision(entry.decision)}
              onFocus={() => setDecision(entry.decision)}
              className="rounded-[16px] px-3 py-2.5 text-left cursor-pointer min-w-0"
              style={{ background: item.decision === entry.decision ? `${T.amber}12` : T.card, border: `1px solid ${item.decision === entry.decision ? `${T.amber}33` : T.border}` }}
            >
              <p className="text-[0.98rem] font-bold leading-6" style={{ color: T.text }}>
                {entry.decision}
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span
                  className="px-2 py-1 rounded-full text-[9px] font-semibold"
                  style={{ background: `${T.blue}12`, color: T.text, border: `1px solid ${T.blue}24` }}
                >
                  {entry.optionA}
                </span>
                <span
                  className="px-2 py-1 rounded-full text-[9px] font-semibold"
                  style={{ background: `${T.violet}12`, color: T.text, border: `1px solid ${T.violet}24` }}
                >
                  {entry.optionB}
                </span>
              </div>
            </button>
          ))}
      </div>

      <div className="rounded-[22px] p-4" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
              {item.eyebrow}
            </p>
            <h3 className="text-[1.7rem] font-bold mt-1.5" style={{ color: T.text }}>
              {item.decision}
            </h3>
            <p className="text-[13px] mt-2 leading-6 max-w-3xl" style={{ color: T.muted }}>
              {item.netflixContext}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold" style={{ background: `${T.blue}12`, color: T.text, border: `1px solid ${T.blue}24` }}>
              {item.optionA}
            </span>
            <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold" style={{ background: `${T.violet}12`, color: T.text, border: `1px solid ${T.violet}24` }}>
              {item.optionB}
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.02fr_0.98fr] mt-4">
          <div className="space-y-3">
            <div className="rounded-[18px] p-3.5" style={{ background: `${T.green}10`, border: `1px solid ${T.green}24` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
                Default position
              </p>
              <p className="text-[13px] mt-2.5 leading-6" style={{ color: T.text }}>
                {item.recommendation}
              </p>
            </div>

            <div className="rounded-[18px] p-3.5" style={{ background: `${T.amber}10`, border: `1px solid ${T.amber}24` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
                Why this costs real money
              </p>
              <p className="text-[13px] mt-2.5 leading-6" style={{ color: T.text }}>
                {item.costSignal}
              </p>
            </div>

            <div className="rounded-[18px] p-3.5" style={{ background: `${T.red}10`, border: `1px solid ${T.red}24` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
                When I would change it
              </p>
              <p className="text-[13px] mt-2.5 leading-6" style={{ color: T.text }}>
                {item.whenToChange}
              </p>
            </div>
          </div>

          <div className="rounded-[18px] p-3.5" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
              What actually drives cost here
            </p>
            <div className="mt-3 space-y-2.5">
              {item.tradeoffs.map((tradeoff, index) => (
                <div key={tradeoff} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: `${T.blue}14`, color: T.blue }}>
                    {index + 1}
                  </div>
                  <div className="rounded-xl px-3.5 py-2.5 flex-1" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                    <p className="text-[13px] leading-6" style={{ color: T.muted }}>
                      {tradeoff}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[18px] p-3.5 mt-3" style={{ background: `${T.violet}10`, border: `1px solid ${T.violet}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.violet }}>
            What I would actually say
          </p>
          <p className="text-[13px] mt-2.5 leading-6" style={{ color: T.text }}>
            {item.say}
          </p>
        </div>
      </div>
    </div>
  );
}

function InterviewQATab({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  const [questionId, setQuestionId] = useState<InterviewQuestionId>(INTERVIEW_QUESTIONS[0].id);
  const question = INTERVIEW_QUESTIONS.find((item) => item.id === questionId) ?? INTERVIEW_QUESTIONS[0];

  useEffect(() => {
    if (!INTERVIEW_QUESTIONS.find((item) => item.id === questionId)) {
      setQuestionId(INTERVIEW_QUESTIONS[0].id);
    }
  }, [questionId]);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr] xl:h-[calc(100vh-12rem)] xl:overflow-hidden">
      <div
        className="rounded-[24px] p-5 xl:h-full xl:overflow-y-auto"
        style={{ background: T.card, border: `1px solid ${T.blue}24` }}
      >
        <div className="space-y-3">
          {INTERVIEW_QUESTIONS.map((item) => (
            <button
              key={item.id}
              onMouseEnter={() => setQuestionId(item.id)}
              onFocus={() => setQuestionId(item.id)}
              onClick={() => setQuestionId(item.id)}
              className="w-full text-left rounded-2xl p-4 cursor-pointer"
              style={{ background: item.id === question.id ? `${T.blue}12` : T.card2, border: `1px solid ${item.id === question.id ? `${T.blue}33` : T.border}` }}
            >
              <p className="text-sm font-semibold" style={{ color: T.text }}>
                {item.question}
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                {item.tag}
              </p>
            </button>
          ))}
        </div>
      </div>
      <div
        className="rounded-[24px] p-4 xl:h-full xl:overflow-hidden"
        style={{ background: T.card, border: `1px solid ${T.blue}24` }}
      >
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
            Q/A
          </p>
          <h3 className="text-[1.55rem] leading-[1.12] font-bold mt-2 tracking-[-0.03em]" style={{ color: T.text }}>
            {question.question}
          </h3>
        </div>
        <div className="xl:h-[calc(100%-5.75rem)]">
          <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr] h-full">
            <DetailBlock title="What I would say" accent={T.green} className="h-full">
              <p className="text-[15px] leading-8" style={{ color: T.muted }}>{question.strongAnswer}</p>
            </DetailBlock>
            <DetailBlock title="" accent={T.amber} className="h-full">
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: T.amber }}>
                    If they push further
                  </p>
                  <p className="text-[15px] leading-8" style={{ color: T.muted }}>{question.followUp}</p>
                </div>
                <div className="pt-4" style={{ borderTop: `1px solid ${T.red}22` }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: T.red }}>
                    What not to say
                  </p>
                  <p className="text-[15px] leading-8" style={{ color: T.muted }}>{question.badAnswer}</p>
                </div>
              </div>
            </DetailBlock>
          </div>
        </div>
      </div>
    </div>
  );
}

function NetflixTechMapTab() {
  const [selectedId, setSelectedId] = useState<(typeof NETFLIX_TECH_MAP)[number]["id"]>(NETFLIX_TECH_MAP[0].id);
  const selected = NETFLIX_TECH_MAP.find((item) => item.id === selectedId) ?? NETFLIX_TECH_MAP[0];
  const lanes = Array.from(new Set(NETFLIX_TECH_MAP.map((item) => item.lane)));

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.violet}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.violet }}>
          Netflix stack map
        </p>
        <div className="space-y-4">
          {lanes.map((lane, laneIndex) => {
            const items = NETFLIX_TECH_MAP.filter((item) => item.lane === lane);
            return (
              <div key={lane}>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.faint }}>
                    {lane}
                  </p>
                  {laneIndex < lanes.length - 1 ? <span className="text-xs" style={{ color: T.faint }}>→</span> : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className="rounded-[20px] px-4 py-3 text-left cursor-pointer min-w-[180px] transition-transform hover:-translate-y-0.5"
                      style={{
                        background: selected.id === item.id ? `${item.color}14` : T.card2,
                        border: `1px solid ${selected.id === item.id ? `${item.color}44` : T.border}`,
                      }}
                    >
                      <p className="text-sm font-bold flex items-center gap-2" style={{ color: T.text }}>
                        <span>{item.emoji}</span>
                        <span>{item.name}</span>
                      </p>
                      <p className="text-[12px] mt-2 leading-5" style={{ color: T.faint }}>
                        {item.fit}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${selected.color}24` }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: `${selected.color}12`, border: `1px solid ${selected.color}24` }}>
            {selected.emoji}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: selected.color }}>
              {selected.lane}
            </p>
            <h3 className="text-2xl font-bold mt-1" style={{ color: T.text }}>
              {selected.name}
            </h3>
          </div>
        </div>
        <div className="space-y-4 mt-5">
          <DetailBlock title="What it is" accent={selected.color}>{selected.what}</DetailBlock>
          <DetailBlock title="What I would say" accent={T.green}>{selected.say}</DetailBlock>
          <DetailBlock title="When to name-drop it" accent={T.amber}>{selected.fit}</DetailBlock>
        </div>
      </div>
    </div>
  );
}

function DrawIfAskedTab() {
  const [selectedId, setSelectedId] = useState<(typeof INTERVIEW_DRAWING_BOARDS)[number]["id"]>(INTERVIEW_DRAWING_BOARDS[0].id);
  const selected = INTERVIEW_DRAWING_BOARDS.find((item) => item.id === selectedId) ?? INTERVIEW_DRAWING_BOARDS[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
      <div className="space-y-3">
        {INTERVIEW_DRAWING_BOARDS.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedId(item.id)}
            className="w-full text-left rounded-[22px] p-5 cursor-pointer"
            style={{
              background: selected.id === item.id ? `${item.accent}12` : T.card,
              border: `1px solid ${selected.id === item.id ? `${item.accent}33` : T.border}`,
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.accent }}>
              Whiteboard visual
            </p>
            <h3 className="text-lg font-bold mt-2" style={{ color: T.text }}>
              {item.title}
            </h3>
            <p className="text-sm mt-2 leading-6" style={{ color: T.faint }}>
              {item.caption}
            </p>
          </button>
        ))}
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${selected.accent}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: selected.accent }}>
          Sketch plus narration
        </p>
        <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
          {selected.title}
        </h3>
        <div className="rounded-[22px] p-5 mt-5 overflow-hidden" style={{ background: T.card2, border: `1px solid ${selected.accent}24` }}>
          <div className="flex flex-wrap items-center gap-3">
            {selected.steps.map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <div className="px-4 py-3 rounded-[18px] text-sm font-semibold" style={{ background: `${selected.accent}14`, color: T.text, border: `1px solid ${selected.accent}24` }}>
                  {step}
                </div>
                {index < selected.steps.length - 1 ? (
                  <motion.div
                    className="h-[2px] w-12"
                    style={{ background: selected.accent }}
                    animate={{ opacity: [0.35, 1, 0.35], scaleX: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: index * 0.1 }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 mt-5">
          <DetailBlock title="What I would say" accent={T.green}>{selected.say}</DetailBlock>
          <DetailBlock title="Why this sketch helps" accent={selected.accent}>{selected.why}</DetailBlock>
        </div>
        <div className="grid gap-3 md:grid-cols-2 mt-4">
          {selected.notes.map((note) => (
            <div key={note} className="rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
              <p className="text-sm leading-6" style={{ color: T.muted }}>
                {note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockInterviewTabCustom() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showHints, setShowHints] = useState(false);
  const [showStrongAnswer, setShowStrongAnswer] = useState(false);
  const step = MOCK_INTERVIEW_STEPS[stepIndex];
  const answer = answers[step.id] ?? "";
  const keywords = step.hints.flatMap((hint) => hint.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((token) => token.length > 4));
  const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 12);
  const score = uniqueKeywords.reduce((count, token) => (answer.toLowerCase().includes(token) ? count + 1 : count), 0);
  const normalizedScore = Math.min(5, Math.round((score / Math.max(uniqueKeywords.length, 1)) * 5));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[0.75fr_1.1fr_0.8fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.red }}>
            Interview flow
          </p>
          <div className="space-y-3">
            {MOCK_INTERVIEW_STEPS.map((item, index) => (
              <button key={item.id} onClick={() => { setStepIndex(index); setShowHints(false); setShowStrongAnswer(false); }} className="w-full text-left rounded-2xl p-4 cursor-pointer" style={{ background: step.id === item.id ? `${T.red}12` : T.card2, border: `1px solid ${step.id === item.id ? `${T.red}33` : T.border}` }}>
                <p className="text-sm font-semibold" style={{ color: T.text }}>
                  Step {index + 1}: {item.title}
                </p>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
                Interviewer question
              </p>
              <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
                {step.title}
              </h3>
            </div>
            <Pill color={T.red}>{stepIndex + 1} / {MOCK_INTERVIEW_STEPS.length}</Pill>
          </div>
          <div className="rounded-2xl p-4 mb-4" style={{ background: `${T.red}0f`, border: `1px solid ${T.red}24` }}>
            <p className="text-sm leading-7" style={{ color: T.text }}>
              {step.interviewer}
            </p>
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [step.id]: e.target.value }))}
            className="w-full min-h-[240px] rounded-2xl p-4 text-sm resize-none"
            style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text, outline: "none" }}
            placeholder="Write your answer as if you are responding in a senior data-engineering interview."
          />
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => setShowHints((v) => !v)} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
              {showHints ? "Hide hints" : "Reveal hint"}
            </button>
            <button onClick={() => setShowStrongAnswer((v) => !v)} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
              {showStrongAnswer ? "Hide strong answer" : "Show strong answer"}
            </button>
            <button onClick={() => setStepIndex((value) => Math.min(value + 1, MOCK_INTERVIEW_STEPS.length - 1))} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.red, color: "#fff", border: "1px solid transparent" }}>
              Next step
            </button>
          </div>
        </div>
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.red }}>
            Hints and scoring
          </p>
          <div className="rounded-2xl p-4 mb-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-sm font-semibold" style={{ color: T.text }}>
              Score me
            </p>
            <p className="text-4xl font-bold mt-2" style={{ color: normalizedScore >= 4 ? T.green : normalizedScore >= 2 ? T.amber : T.red }}>
              {normalizedScore}/5
            </p>
            <p className="text-[12px] mt-2" style={{ color: T.faint }}>
              Approximate checklist coverage based on must-mention keywords.
            </p>
          </div>
          <div className="space-y-2 mb-4">
            {step.checklist.map((item) => (
              <div key={item} className="rounded-xl p-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <p className="text-sm" style={{ color: T.muted }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
          {showHints ? (
            <div className="space-y-3 mb-4">
              {step.hints.slice(0, 3).map((hint) => (
                <div key={hint} className="rounded-xl p-3" style={{ background: `${T.amber}10`, border: `1px solid ${T.amber}24` }}>
                  <p className="text-sm leading-6" style={{ color: T.muted }}>
                    {hint}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {showStrongAnswer ? (
            <AnswerCard title="Strong answer direction" body={step.hints.join(" ")} accent={T.green} />
          ) : null}
        </div>
      </div>

      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.red }}>
          Scoring rubric
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {MOCK_INTERVIEW_RUBRIC.map((item) => (
            <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
              <p className="text-sm font-semibold" style={{ color: T.text }}>
                {item}
              </p>
              <p className="text-[12px] mt-2" style={{ color: T.faint }}>
                0–5
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheatSheetTabCustom() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => window.print()}
          className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
          style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}
        >
          Print cheat sheet
        </button>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <AnswerCard title="30-second answer" body={CHEAT_SHEET_CONTENT.thirtySecond} accent={T.red} />
        <AnswerCard title="2-minute answer" body={CHEAT_SHEET_CONTENT.twoMinute} accent={T.blue} />
        <AnswerCard title="Closing statement" body={CHEAT_SHEET_CONTENT.closingStatement} accent={T.green} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CheatList title="5-minute architecture walkthrough" items={CHEAT_SHEET_CONTENT.fiveMinuteFlow} color={T.blue} />
        <CheatList title="Must mention" items={CHEAT_SHEET_CONTENT.mustMention} color={T.green} />
        <CheatList title="Common mistakes" items={CHEAT_SHEET_CONTENT.commonMistakes} color={T.red} />
        <CheatList title="Scale numbers" items={CHEAT_SHEET_CONTENT.scaleNumbers} color={T.amber} />
        <CheatList title="Kafka formulas" items={CHEAT_SHEET_CONTENT.formulas} color={T.gold} />
        <CheatList title="Watch-time rules" items={CHEAT_SHEET_CONTENT.watchTimeRules} color={T.blue} />
        <CheatList title="Sessionization rules" items={CHEAT_SHEET_CONTENT.sessionizationRules} color={T.violet} />
        <CheatList title="Late-event strategy" items={CHEAT_SHEET_CONTENT.lateStrategy} color={T.red} />
        <CheatList title="Bronze / Silver / Gold" items={CHEAT_SHEET_CONTENT.bronzeSilverGold} color={T.violet} />
        <CheatList title="Table names" items={CHEAT_SHEET_CONTENT.tableNames} color={T.blue} />
        <CheatList title="Failure modes" items={CHEAT_SHEET_CONTENT.failureModes} color={T.red} />
        <CheatList title="Trade-off one-liners" items={CHEAT_SHEET_CONTENT.tradeoffLines} color={T.amber} />
      </div>
    </div>
  );
}

function StartTrackTab({
  activeSectionId: _activeSectionId,
}: {
  activeSectionId: string;
}) {
  return <StartHereDesktopExperience />;
}

function RequirementsTrackTab() {
  return <CapacityEstimationExperience />;
}

function EventSourcesTrackTab() {
  return (
    <div className="space-y-8">
      <AnchoredSection id="sources-map" eyebrow="Source map" title="Start from what emits data" subtitle="Users should understand event origins before they read any topic or table detail." accent={T.amber}>
        <EventTaxonomyTab />
      </AnchoredSection>
      <AnchoredSection id="sources-contract" eyebrow="Contracts" title="Make the event contract visible" subtitle="Schemas, ownership, compatibility, and PII tagging are part of the product, not back-office notes." accent={T.green}>
        <DataContractGrid />
      </AnchoredSection>
      <AnchoredSection id="sources-lineage" eyebrow="Population flow" title="Show how sources become trusted facts" subtitle="This is the missing bridge between events and tables that both feedback files called out." accent={T.violet}>
        <TableLineagePanel />
      </AnchoredSection>
      <AnchoredSection id="sources-say" eyebrow="Say this" title="Explain why source mapping comes first" subtitle="Use one line to justify this tab in the interview flow." accent={T.red}>
        <InterviewAnswerStrip tab="event-sources" accent={T.red} />
      </AnchoredSection>
    </div>
  );
}

function HighLevelArchitectureDiagram() {
  const baseDiagramWidth = 680;
  const defaultZoomLevel = 0.5;
  const minZoomLevel = 0.5;
  const maxZoomLevel = 1.8;
  const shellRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const [activeNodeId, setActiveNodeId] = useState<string | null>("kafka");
  const [zoomLevel, setZoomLevel] = useState(defaultZoomLevel);

  const architectureNodes = useMemo(
    () => [
      {
        id: "client",
        x: 140,
        y: 40,
        width: 400,
        height: 56,
        tone: "gray" as const,
        title: "Client devices",
        subtitleLines: ["TV apps, mobile, web, game consoles"],
        tooltip:
          "TVs, mobile apps, web browsers, and game consoles are the entry point. Every user action here, like pressing play, scrolling, rating a title, or searching, becomes telemetry that gets emitted into the platform.",
      },
      {
        id: "cdn",
        x: 140,
        y: 136,
        width: 400,
        height: 56,
        tone: "gray" as const,
        title: "Edge / Open Connect CDN",
        subtitleLines: ["Video delivery, not part of data path"],
        tooltip:
          "Open Connect serves video bytes from edge locations for low-latency playback. It is part of the user experience path, but it is intentionally outside the shared analytics backbone.",
      },
      {
        id: "microservices",
        x: 140,
        y: 232,
        width: 400,
        height: 64,
        tone: "blue" as const,
        title: "Microservices tier",
        subtitleLines: ["Playback, recs, billing, search, A/B, UI", "Cassandra, EVCache, DynamoDB, MySQL-Aurora"],
        tooltip:
          "Hundreds of services handle playback, recommendations, membership, billing, A/B test assignment, search, and UI rendering through Falcor or GraphQL. Each service emits Avro events and/or exposes OLTP state in Cassandra, EVCache, DynamoDB, or MySQL-Aurora.",
      },
      {
        id: "kafka",
        x: 140,
        y: 336,
        width: 400,
        height: 64,
        tone: "blue" as const,
        title: "Apache Kafka",
        subtitleLines: ["Keystone transport backbone", "~1M msg/sec hot topics, 4-6h retention"],
        tooltip:
          "Kafka is the Keystone transport backbone: thousands of topics, about 1M messages/sec on hot topics, and often only 4-6 hours of retention on high-volume streams. The same log fans out to streaming, realtime serving, OLAP, CDC, and Iceberg storage.",
      },
      {
        id: "flink",
        x: 40,
        y: 440,
        width: 190,
        height: 72,
        tone: "purple" as const,
        title: "Apache Flink",
        subtitleLines: ["20,000+ jobs", "enrich, join, aggregate, window"],
        tooltip:
          "Flink is the live compute layer, with 20,000+ jobs handling filter, enrich, join, aggregate, and window workloads. It turns raw Kafka streams into fresh outputs for products, dashboards, and low-latency metrics.",
      },
      {
        id: "iceberg_sink",
        x: 245,
        y: 440,
        width: 190,
        height: 72,
        tone: "teal" as const,
        title: "Iceberg sink",
        subtitleLines: ["Flink/Spark streaming writers", "Exactly-once commits"],
        tooltip:
          "Iceberg sink writers commit Kafka-derived records into Iceberg tables with exactly-once semantics. That keeps the batch and streaming view of the world aligned instead of creating two separate ingestion paths.",
      },
      {
        id: "cdc",
        x: 450,
        y: 440,
        width: 190,
        height: 72,
        tone: "coral" as const,
        title: "CDC connectors",
        subtitleLines: ["Debezium / DBLog / DynamoDB", "Back into Kafka"],
        tooltip:
          "Debezium-style, DBLog, and DynamoDB-stream connectors tail OLTP commit logs and republish row-level mutations into Kafka topics. That sends CDC data back into the exact same fan-out paths instead of a separate bespoke pipeline.",
      },
      {
        id: "evcache",
        x: 40,
        y: 552,
        width: 140,
        height: 72,
        tone: "gray" as const,
        title: "EVCache / Cassandra",
        subtitleLines: ["Serving", "personalization"],
        tooltip:
          "EVCache and Cassandra serve millisecond-latency reads for personalization and recommendation paths. This tier is optimized for fast serving, not deep historical analytics.",
      },
      {
        id: "elasticsearch",
        x: 200,
        y: 552,
        width: 140,
        height: 72,
        tone: "gray" as const,
        title: "Elasticsearch",
        subtitleLines: ["Observability", "on-call"],
        tooltip:
          "Elasticsearch indexes operational events so on-call and product teams can inspect errors, latency spikes, or buffering incidents in near real time.",
      },
      {
        id: "druid",
        x: 360,
        y: 552,
        width: 140,
        height: 72,
        tone: "gray" as const,
        title: "Druid",
        subtitleLines: ["Real-time OLAP", "QoE, live metrics"],
        tooltip:
          "Druid supports sub-second aggregation queries for fresh metrics such as QoE, trending signals, and operational dashboards that need live numbers instead of long-range historical depth.",
      },
      {
        id: "lakehouse",
        x: 140,
        y: 664,
        width: 400,
        height: 64,
        tone: "teal" as const,
        title: "S3 data lake + Apache Iceberg",
        subtitleLines: ["ACID, schema evolution, time travel", "hidden partitioning, compaction"],
        tooltip:
          "S3 plus Iceberg forms the petabyte-scale lakehouse: ACID snapshots on object storage, schema evolution, time travel, hidden partitioning, and compaction. This is the durable analytical system of record.",
      },
      {
        id: "batch",
        x: 70,
        y: 768,
        width: 260,
        height: 72,
        tone: "purple" as const,
        title: "Batch processing",
        subtitleLines: ["Spark on EMR / Titus", "Airflow / Maestro orchestration"],
        tooltip:
          "Spark on EMR or Titus handles offline transforms, training data prep, scheduled backfills, and official publications. Airflow and Maestro orchestrate this historical compute layer.",
      },
      {
        id: "governance",
        x: 350,
        y: 768,
        width: 270,
        height: 72,
        tone: "gray" as const,
        title: "Metadata and governance",
        subtitleLines: ["Metacat, Genie, lineage", "PII tags, IAM, table-level ACLs"],
        tooltip:
          "Metacat, Genie, lineage tracking, PII tags, IAM, and table-level ACLs make the shared platform safe and usable across many teams. Governance stays in the main platform path, not as a sidecar.",
      },
      {
        id: "consumption",
        x: 140,
        y: 872,
        width: 400,
        height: 80,
        tone: "gray" as const,
        title: "Consumption layer",
        subtitleLines: ["Presto/Trino, Spark SQL, Redshift", "BI tools, ML features, A/B, finance"],
        tooltip:
          "This is where people and models actually use the output: Trino and Spark SQL ad hoc analysis, Redshift warehousing, BI tools and notebooks, ML feature stores, recommendation training, A/B analysis, and finance reporting.",
      },
    ],
    [],
  );

  const toneStyles = {
    blue: { fill: "#132436", stroke: "#28517a", title: "#4ea3ff", subtitle: "#8fb8de" },
    purple: { fill: "#20182f", stroke: "#493670", title: "#b98bff", subtitle: "#c9b0f2" },
    teal: { fill: "#0f2620", stroke: "#1f5c48", title: "#3ddbb0", subtitle: "#8fd8bf" },
    coral: { fill: "#2a1a10", stroke: "#6b3d1e", title: "#ff9466", subtitle: "#e8b294" },
    gray: { fill: "#1a2129", stroke: "#374350", title: "#aab4bf", subtitle: "#8b97a3" },
  } as const;

  const connectorPaths = useMemo(
    () => [
      { d: "M340 96 L340 136", stroke: "#aab4bf" },
      { d: "M340 192 L340 232", stroke: "#aab4bf" },
      { d: "M340 296 L340 336", stroke: "#4ea3ff" },
      { d: "M340 400 L340 420 L135 420 L135 440", stroke: "#b98bff" },
      { d: "M340 400 L340 440", stroke: "#3ddbb0" },
      { d: "M340 400 L340 420 L545 420 L545 440", stroke: "#ff9466" },
      { d: "M135 512 L135 528 L110 528 L110 552", stroke: "#aab4bf" },
      { d: "M135 512 L135 528 L270 528 L270 552", stroke: "#aab4bf" },
      { d: "M135 512 L135 528 L430 528 L430 552", stroke: "#aab4bf" },
      { d: "M340 512 L340 536 L565 536 L565 648 L340 648 L340 664", stroke: "#3ddbb0" },
      { d: "M340 728 L340 744 L200 744 L200 768", stroke: "#b98bff" },
      { d: "M340 728 L340 744 L485 744 L485 768", stroke: "#aab4bf" },
      { d: "M200 840 L200 856 L340 856 L340 872", stroke: "#aab4bf" },
      { d: "M485 840 L485 856 L340 856 L340 872", stroke: "#aab4bf" },
    ],
    [],
  );

  const connectorLabels = [
    { x: 370, y: 216, text: "HTTPS / gRPC", color: "#aab4bf" },
    { x: 365, y: 318, text: "Avro + schema registry", color: "#4ea3ff" },
    { x: 98, y: 415, text: "real-time fan-out", color: "#b98bff" },
    { x: 284, y: 410, text: "analytical fan-out", color: "#3ddbb0" },
    { x: 478, y: 415, text: "CDC fan-out", color: "#ff9466" },
  ] as const;

  const activeNode = architectureNodes.find((node) => node.id === activeNodeId) ?? null;

  const zoomIntoWorkingView = useCallback(() => {
    setZoomLevel((value) => (value <= defaultZoomLevel ? 0.9 : value));
  }, []);

  const zoomPercent = Math.round(zoomLevel * 100);

  return (
    <div
      className="rounded-[30px]"
      style={{ background: T.card, border: `1px solid ${T.blue}24` }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
            High-level architecture
          </p>
          <p className="mt-1 text-[12px] leading-6" style={{ color: T.faint }}>
            Starts at 50%. Hover into the diagram to zoom in, then fine-tune with the controls. Hover any component for the interview-ready explanation.
          </p>
        </div>
      </div>

      <div className="relative z-0 p-4 md:p-5" data-testid="architecture-high-level-flow">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div
            ref={shellRef}
            className="relative z-0 isolate overflow-x-auto overflow-y-visible rounded-[26px]"
            onMouseEnter={() => zoomIntoWorkingView()}
            style={{
              scrollbarGutter: "stable",
              background:
                "radial-gradient(circle at top, rgba(78,163,255,0.08), transparent 34%), linear-gradient(180deg, rgba(15,21,28,0.98), rgba(11,15,20,0.98))",
              border: `1px solid ${T.border}`,
            }}
          >
            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3" style={{ background: "linear-gradient(180deg, rgba(15,21,28,0.98), rgba(15,21,28,0.86))", borderBottom: `1px solid ${T.border}` }}>
              <div className="text-[11px] font-semibold" style={{ color: T.faint }}>
                Explore the architecture
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{ background: T.card2, color: T.faint, border: `1px solid ${T.border}` }}
                >
                  {zoomPercent}%
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setZoomLevel((value) => Math.max(minZoomLevel, Number((value - 0.1).toFixed(2))));
                  }}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
                  style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}
                  aria-label="Zoom out architecture diagram"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setZoomLevel(defaultZoomLevel);
                  }}
                  className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors"
                  style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setZoomLevel((value) => Math.min(maxZoomLevel, Number((value + 0.1).toFixed(2))));
                  }}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
                  style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}
                  aria-label="Zoom in architecture diagram"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex justify-center p-4 pb-14">
            <div
              style={{
                width: `${baseDiagramWidth * zoomLevel}px`,
                maxWidth: "none",
                flex: "0 0 auto",
                transition: "width 180ms ease",
              }}
            >
              <svg
                viewBox="0 0 680 980"
                role="img"
                aria-label="Netflix big data architecture"
                className="block w-full h-auto"
              >
                <defs>
                  <marker id="architecture-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                </defs>

                <rect x="0" y="0" width="680" height="980" fill="transparent" />

                <g fill="none" strokeWidth="1.35">
                  {connectorPaths.map((path) => (
                    <motion.path
                      key={path.d}
                      d={path.d}
                      stroke={path.stroke}
                      markerEnd="url(#architecture-arrow)"
                      strokeDasharray="4 5"
                      initial={reduceMotion ? false : { strokeDashoffset: 0 }}
                      animate={reduceMotion ? undefined : { strokeDashoffset: -18 }}
                      transition={reduceMotion ? undefined : { duration: 1.4, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
                    />
                  ))}
                </g>

                <g fontFamily="inherit">
                  {connectorLabels.map((label) => (
                    <text
                      key={`${label.text}-${label.x}-${label.y}`}
                      x={label.x}
                      y={label.y}
                      textAnchor="middle"
                      fill={label.color}
                      fontSize="10"
                      fontWeight="600"
                      letterSpacing="0.02em"
                    >
                      {label.text}
                    </text>
                  ))}
                </g>

                <g fontFamily="inherit">
                  {architectureNodes.map((node) => {
                    const tone = toneStyles[node.tone];
                    const isHovered = activeNodeId === node.id;

                    return (
                      <g
                        key={node.id}
                        data-id={node.id}
                        transform={`translate(${node.x},${node.y})`}
                        tabIndex={0}
                        role="button"
                        aria-label={node.title}
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveNodeId(node.id);
                        }}
                        onMouseEnter={() => setActiveNodeId(node.id)}
                        onFocus={() => setActiveNodeId(node.id)}
                        className="cursor-pointer outline-none"
                        style={{ filter: isHovered ? "brightness(1.12)" : "none" }}
                      >
                        <rect
                          width={node.width}
                          height={node.height}
                          rx="8"
                          fill={tone.fill}
                          stroke={tone.stroke}
                          strokeWidth={isHovered ? 1.6 : 1}
                        />
                        <text
                          x={node.width / 2}
                          y={node.subtitleLines.length > 1 ? "22" : "24"}
                          textAnchor="middle"
                          fill={tone.title}
                          fontSize="14"
                          fontWeight="600"
                        >
                          {node.title}
                        </text>
                        <text x={node.width / 2} y={node.subtitleLines.length > 1 ? "40" : "42"} textAnchor="middle" fill={tone.subtitle} fontSize="12">
                          {node.subtitleLines.map((line, index) => (
                            <tspan key={`${node.id}-${line}`} x={node.width / 2} dy={index === 0 ? 0 : 14}>
                              {line}
                            </tspan>
                          ))}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
            </div>
          </div>

          <div className="hidden xl:block xl:self-start">
            <div
              data-testid="architecture-detail-panel"
              className="rounded-[24px] p-5 xl:fixed xl:z-10"
              style={{
                top: 268,
                right: "max(16px, calc((100vw - 1320px) / 2 + 8px))",
                width: 300,
                background: T.card2,
                border: `1px solid ${T.border}`,
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
                Diagram Guide
              </p>
              <p className="mt-2 text-sm font-semibold" style={{ color: T.text }}>
                {activeNode ? activeNode.title : "Hover a component"}
              </p>
              <p className="mt-3 text-[13px] leading-7" style={{ color: T.muted }}>
                {activeNode
                  ? activeNode.tooltip
                  : "Move across the diagram to inspect a component here. Click a node to keep it selected while you zoom or continue exploring."}
              </p>
              {activeNode ? (
                <div className="mt-4 rounded-[18px] px-4 py-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.faint }}>
                    Visible Summary
                  </p>
                  <div className="mt-2 space-y-1">
                    {activeNode.subtitleLines.map((line) => (
                      <p key={`${activeNode.id}-${line}`} className="text-[12px] leading-6" style={{ color: T.text }}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section4EnvelopeStudio() {
  const [activeFieldId, setActiveFieldId] = useState<Section4EnvelopeFieldId>("event_time");
  const activeField = SECTION4_ENVELOPE_FIELDS.find((field) => field.id === activeFieldId) ?? SECTION4_ENVELOPE_FIELDS[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
              Canonical event envelope
            </p>
            <p className="mt-1 text-[12px]" style={{ color: T.faint }}>
              Hover or click a field to see why it exists.
            </p>
          </div>
          <Pill color={activeField.color}>{activeField.icon} {activeField.label}</Pill>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {SECTION4_ENVELOPE_FIELDS.map((field) => {
            const active = field.id === activeField.id;
            return (
              <motion.button
                key={field.id}
                type="button"
                onMouseEnter={() => setActiveFieldId(field.id)}
                onFocus={() => setActiveFieldId(field.id)}
                onClick={() => setActiveFieldId(field.id)}
                whileHover={{ y: -2 }}
                className="rounded-full px-3 py-2 text-xs font-semibold cursor-pointer"
                style={{
                  background: active ? `${field.color}16` : T.card2,
                  color: active ? field.color : T.text,
                  border: `1px solid ${active ? `${field.color}3a` : T.border}`,
                }}
              >
                {field.icon} {field.label}
              </motion.button>
            );
          })}
        </div>
        <div className="mt-5 rounded-[22px] p-4 font-mono text-[12px] leading-7" style={{ background: "#0d131a", border: `1px solid ${T.border}` }}>
          <div style={{ color: "#7dd3fc" }}>{"{"}</div>
          {SECTION4_ENVELOPE_FIELDS.map((field) => {
            const active = field.id === activeField.id;
            return (
              <motion.div
                key={field.id}
                initial={false}
                animate={{
                  x: active ? 8 : 0,
                  opacity: active ? 1 : 0.72,
                }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="rounded-xl px-3"
                style={{
                  background: active ? `${field.color}14` : "transparent",
                  color: active ? "#f8fafc" : "#94a3b8",
                  border: active ? `1px solid ${field.color}30` : "1px solid transparent",
                }}
              >
                {field.line}
              </motion.div>
            );
          })}
          <div style={{ color: "#7dd3fc" }}>{"}"}</div>
        </div>
      </div>

      <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${activeField.color}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: activeField.color }}>
          Why this field matters
        </p>
        <h3 className="mt-2 text-2xl font-bold tracking-[-0.04em]" style={{ color: T.text }}>
          {activeField.icon} {activeField.label}
        </h3>
        <p className="mt-3 text-sm leading-7" style={{ color: T.muted }}>
          {activeField.meaning}
        </p>
        <div className="mt-4 rounded-[20px] p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: activeField.color }}>
            Interview use
          </p>
          <p className="mt-2 text-sm leading-7" style={{ color: T.text }}>
            {activeField.interviewUse}
          </p>
        </div>
        <div className="mt-4 rounded-[20px] p-4" style={{ background: `${activeField.color}10`, border: `1px solid ${activeField.color}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: activeField.color }}>
            Example
          </p>
          <p className="mt-2 text-sm leading-7" style={{ color: T.text }}>
            {activeField.example}
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <CompactMetricBadge label="Dedup" value="event_id" note="Logical retries" color={T.red} />
          <CompactMetricBadge label="Truth time" value="event_time" note="Windows and PIT joins" color={T.blue} />
          <CompactMetricBadge label="Delay" value="ingest_ts" note="Freshness and bad clocks" color={T.green} />
        </div>
      </div>
    </div>
  );
}

function Section4TopicStudio() {
  const [choiceId, setChoiceId] = useState<Section4TopicChoiceId>("session_id");
  const [headroom, setHeadroom] = useState(25);
  const choice = SECTION4_TOPIC_CHOICES.find((item) => item.id === choiceId) ?? SECTION4_TOPIC_CHOICES[0];
  const peakPerSecond = 1200000;
  const safePerPartition = 5000;
  const basePartitions = Math.ceil(peakPerSecond / safePerPartition);
  const finalPartitions = Math.ceil(basePartitions * (1 + headroom / 100));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
                Topic key picker
              </p>
              <p className="mt-1 text-[12px]" style={{ color: T.faint }}>
                Choose the source key, then see the ordering trade-off immediately.
              </p>
            </div>
            <Pill color={choice.color}>{choice.interviewVerdict}</Pill>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {SECTION4_TOPIC_CHOICES.map((item) => {
              const active = item.id === choice.id;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setChoiceId(item.id)}
                  onFocus={() => setChoiceId(item.id)}
                  onClick={() => setChoiceId(item.id)}
                  whileHover={{ y: -2 }}
                  className="rounded-[22px] p-4 text-left cursor-pointer"
                  style={{
                    background: active ? `${item.color}14` : T.card2,
                    border: `1px solid ${active ? `${item.color}36` : T.border}`,
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.color }}>
                    {item.icon} key option
                  </p>
                  <p className="mt-2 text-sm font-semibold" style={{ color: T.text }}>
                    {item.label}
                  </p>
                </motion.button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
            <motion.div
              key={`${choice.id}-good`}
              initial={{ opacity: 0.6, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[20px] p-4"
              style={{ background: `${choice.color}12`, border: `1px solid ${choice.color}28` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: choice.color }}>
                Why teams pick it
              </p>
              <p className="mt-2 text-sm leading-7" style={{ color: T.text }}>
                {choice.goodAt}
              </p>
            </motion.div>
            <div className="hidden lg:block text-2xl" style={{ color: choice.color }}>→</div>
            <motion.div
              key={`${choice.id}-risk`}
              initial={{ opacity: 0.6, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[20px] p-4"
              style={{ background: T.card2, border: `1px solid ${T.border}` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
                What can go wrong
              </p>
              <p className="mt-2 text-sm leading-7" style={{ color: T.text }}>
                {choice.risk}
              </p>
            </motion.div>
            <div className="hidden lg:block text-2xl" style={{ color: choice.color }}>→</div>
            <motion.div
              key={`${choice.id}-verdict`}
              initial={{ opacity: 0.6, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[20px] p-4"
              style={{ background: T.card2, border: `1px solid ${T.border}` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: choice.color }}>
                Recommended use
              </p>
              <p className="mt-2 text-sm leading-7" style={{ color: T.text }}>
                {choice.interviewVerdict}
              </p>
            </motion.div>
          </div>
          <div className="mt-4 rounded-[20px] p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: choice.color }}>
              Example
            </p>
            <p className="mt-2 text-sm leading-7" style={{ color: T.text }}>
              {choice.technicalExample}
            </p>
          </div>
        </div>

        <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                Partition math
              </p>
              <p className="mt-1 text-[12px]" style={{ color: T.faint }}>
                Keep the board formula visible.
              </p>
            </div>
            <Pill color={T.gold}>{finalPartitions} partitions</Pill>
          </div>
          <div className="mt-4 grid gap-3">
            {[
              { label: "Peak topic throughput", value: "1.2M events/sec", color: T.red },
              { label: "Safe partition rate", value: "5K events/sec", color: T.blue },
              { label: "Base partitions", value: `${peakPerSecond.toLocaleString()} / ${safePerPartition.toLocaleString()} = ${basePartitions}`, color: T.green },
              { label: "Headroom", value: `${basePartitions} x ${1 + headroom / 100} = ${finalPartitions}`, color: T.violet },
            ].map((row) => (
              <div key={row.label} className="rounded-[18px] p-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: row.color }}>
                  {row.label}
                </p>
                <p className="mt-2 text-sm font-semibold" style={{ color: T.text }}>
                  {row.value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <RangeField label="Operational headroom" value={headroom} min={10} max={50} step={5} suffix="%" onChange={setHeadroom} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Section4FactModelStudio() {
  const [factId, setFactId] = useState<Section4FactId>("fact_playback_session");
  const [focusId, setFocusId] = useState<Section4FactId | Section4DimensionId>("fact_playback_session");
  const fact = SECTION4_FACTS.find((item) => item.id === factId) ?? SECTION4_FACTS[0];
  const focusedDimension = SECTION4_DIMENSIONS.find((item) => item.id === focusId);
  const isFactFocused = focusId === fact.id;

  useEffect(() => {
    setFocusId(fact.id);
  }, [fact.id]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${fact.color}24` }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: fact.color }}>
              Grain-first star map
            </p>
            <p className="mt-1 text-[12px]" style={{ color: T.faint }}>
              Pick a fact, then hover a surrounding dimension to see what it adds.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SECTION4_FACTS.map((item) => {
              const active = item.id === fact.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFactId(item.id)}
                  className="rounded-full px-3 py-2 text-xs font-semibold cursor-pointer"
                  style={{
                    background: active ? `${item.color}16` : T.card2,
                    color: active ? item.color : T.text,
                    border: `1px solid ${active ? `${item.color}36` : T.border}`,
                  }}
                >
                  {item.icon} {item.title.replace("fact_", "")}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-[24px] p-5 relative overflow-hidden" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
          <div className="grid gap-3 md:grid-cols-3">
            {fact.dimensions.slice(0, 3).map((dimensionId) => {
              const dimension = SECTION4_DIMENSIONS.find((item) => item.id === dimensionId);
              if (!dimension) return null;
              const active = focusId === dimension.id;
              return (
                <motion.button
                  key={dimension.id}
                  type="button"
                  onMouseEnter={() => setFocusId(dimension.id)}
                  onFocus={() => setFocusId(dimension.id)}
                  onClick={() => setFocusId(dimension.id)}
                  whileHover={{ y: -2 }}
                  className="rounded-[18px] p-3 text-left cursor-pointer"
                  style={{
                    background: active ? `${dimension.color}16` : T.card,
                    border: `1px solid ${active ? `${dimension.color}38` : T.border}`,
                  }}
                >
                  <p className="text-xs font-semibold" style={{ color: dimension.color }}>
                    {dimension.icon} {dimension.title}
                  </p>
                </motion.button>
              );
            })}
          </div>

          <div className="my-5 flex items-center justify-center gap-4">
            <div className="hidden md:block text-2xl" style={{ color: fact.color }}>↘</div>
            <motion.button
              type="button"
              onMouseEnter={() => setFocusId(fact.id)}
              onFocus={() => setFocusId(fact.id)}
              onClick={() => setFocusId(fact.id)}
              whileHover={{ scale: 1.02 }}
              className="rounded-[24px] px-6 py-5 cursor-pointer text-left min-w-[280px]"
              style={{
                background: `${fact.color}12`,
                border: `1px solid ${fact.color}34`,
                boxShadow: isFactFocused ? `0 0 0 1px ${fact.color}44` : "none",
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: fact.color }}>
                {fact.icon} central fact
              </p>
              <h4 className="mt-2 text-lg font-bold" style={{ color: T.text }}>
                {fact.title}
              </h4>
              <p className="mt-2 text-sm leading-7" style={{ color: T.muted }}>
                {fact.grain}
              </p>
            </motion.button>
            <div className="hidden md:block text-2xl" style={{ color: fact.color }}>↙</div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {fact.dimensions.slice(3).map((dimensionId) => {
              const dimension = SECTION4_DIMENSIONS.find((item) => item.id === dimensionId);
              if (!dimension) return null;
              const active = focusId === dimension.id;
              return (
                <motion.button
                  key={dimension.id}
                  type="button"
                  onMouseEnter={() => setFocusId(dimension.id)}
                  onFocus={() => setFocusId(dimension.id)}
                  onClick={() => setFocusId(dimension.id)}
                  whileHover={{ y: -2 }}
                  className="rounded-[18px] p-3 text-left cursor-pointer"
                  style={{
                    background: active ? `${dimension.color}16` : T.card,
                    border: `1px solid ${active ? `${dimension.color}38` : T.border}`,
                  }}
                >
                  <p className="text-xs font-semibold" style={{ color: dimension.color }}>
                    {dimension.icon} {dimension.title}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${fact.color}24` }}>
        {isFactFocused ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: fact.color }}>
              Fact detail
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-[-0.04em]" style={{ color: T.text }}>
              {fact.title}
            </h3>
            <p className="mt-3 text-sm leading-7" style={{ color: T.muted }}>
              {fact.note}
            </p>
            <DetailBlock title="Grain" accent={fact.color} className="mt-4">
              {fact.grain}
            </DetailBlock>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {fact.measures.map((measure) => (
                <div key={measure} className="rounded-[18px] p-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <p className="text-xs font-semibold" style={{ color: T.text }}>
                    {measure}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : focusedDimension ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: focusedDimension.color }}>
              Dimension detail
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-[-0.04em]" style={{ color: T.text }}>
              {focusedDimension.icon} {focusedDimension.title}
            </h3>
            <p className="mt-3 text-sm leading-7" style={{ color: T.muted }}>
              {focusedDimension.purpose}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {focusedDimension.fields.map((field) => (
                <div key={field} className="rounded-[18px] p-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <p className="text-xs font-semibold" style={{ color: T.text }}>
                    {field}
                  </p>
                </div>
              ))}
            </div>
            <DetailBlock title="History behavior" accent={focusedDimension.color} className="mt-4">
              {focusedDimension.scd}
            </DetailBlock>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Section4ControlsStudio() {
  const [controlId, setControlId] = useState<Section4ControlId>("scd2");
  const control = SECTION4_CONTROLS.find((item) => item.id === controlId) ?? SECTION4_CONTROLS[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${control.color}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: control.color }}>
          Guardrails
        </p>
        <p className="mt-2 text-sm leading-7" style={{ color: T.muted }}>
          Pick one and see what it protects in the pipeline.
        </p>
        <div className="mt-4 grid gap-3">
          {SECTION4_CONTROLS.map((item) => {
            const active = item.id === control.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                onMouseEnter={() => setControlId(item.id)}
                onFocus={() => setControlId(item.id)}
                onClick={() => setControlId(item.id)}
                whileHover={{ x: 4 }}
                className="rounded-[20px] p-4 text-left cursor-pointer"
                style={{
                  background: active ? `${item.color}14` : T.card2,
                  border: `1px solid ${active ? `${item.color}38` : T.border}`,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold" style={{ color: T.text }}>
                    {item.icon} {item.title}
                  </p>
                  <span className="text-lg" style={{ color: item.color }}>→</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${control.color}24` }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: control.color }}>
              Selected guardrail
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-[-0.04em]" style={{ color: T.text }}>
              {control.icon} {control.title}
            </h3>
          </div>
          <Pill color={control.color}>Protects trust</Pill>
        </div>
        <p className="mt-3 text-sm leading-7" style={{ color: T.muted }}>
          {control.summary}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {control.cues.map((cue, index) => (
            <motion.div
              key={cue}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="rounded-[18px] p-4"
              style={{ background: T.card2, border: `1px solid ${T.border}` }}
            >
              <p className="text-xs font-semibold" style={{ color: T.text }}>
                {cue}
              </p>
            </motion.div>
          ))}
        </div>
        <div className="mt-5 rounded-[20px] p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: control.color }}>
            Scenarios
          </p>
          <div className="mt-3 grid gap-3">
            {control.examples.map((example, index) => (
              <div key={example} className="rounded-[16px] p-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: control.color }}>
                  {index === 0 ? "What happens" : "Technical implication"}
                </p>
                <p className="mt-2 text-sm leading-7" style={{ color: T.text }}>
                  {example}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchitectureTrackTab({
  onNavigate: _onNavigate,
  depthMode: _depthMode,
}: {
  onNavigate: (tab: DataEngineeringTabSlug) => void;
  depthMode: DepthMode;
}) {
  return (
    <div className="space-y-8">
      <AnchoredSection
        id="arch-layered"
        eyebrow="High-level diagram"
        title="Trace the shared data platform in one clean architecture map"
        subtitle="Keep this section visual: one diagram, one selected-node explanation, and one clear separation between the media path and the data path."
        accent={T.blue}
      >
        <HighLevelArchitectureDiagram />
      </AnchoredSection>
    </div>
  );
}

function IngestionKafkaTrackTab({ onNavigate: _onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  return (
    <div className="space-y-8">
      <AnchoredSection
        id="contracts-envelope"
        eyebrow="Canonical envelope"
        title="Make one event contract every downstream system can trust"
        subtitle="Show the few fields that make retries, ordering, freshness, and schema evolution understandable."
        accent={T.blue}
      >
        <Section4EnvelopeStudio />
      </AnchoredSection>
      <AnchoredSection
        id="contracts-ordering"
        eyebrow="Topic + ordering"
        title="Choose ordering before scaling"
        subtitle="Make it obvious why session_id works for playback, why title_id can go hot, and how partition count is derived."
        accent={T.amber}
      >
        <Section4TopicStudio />
      </AnchoredSection>
      <AnchoredSection
        id="contracts-controls"
        eyebrow="Controls"
        title="Keep trust, history, and cost under control"
        subtitle="Late data, SCD2, quality gates, and storage discipline should feel like one compact operating model."
        accent={T.green}
      >
        <Section4ControlsStudio />
      </AnchoredSection>
      <AnchoredSection
        id="contracts-say"
        eyebrow="Say this"
        title="One clear answer"
        subtitle="Keep it short and centered on contracts, ordering, and stable business truth."
        accent={T.red}
      >
        <AnswerCard title="Interview answer" body={TAB_INTERVIEW_LINES["ingestion-kafka"]} accent={T.red} />
      </AnchoredSection>
    </div>
  );
}

function RealtimeTrackTab() {
  return (
    <div className="space-y-8">
      <AnchoredSection id="rt-jobs" eyebrow="Streaming jobs" title="Visualize the near-real-time processing layer" subtitle="This is where topics become trusted live facts, alerts, and features." accent={T.blue}>
        <StreamingPipelineTab />
      </AnchoredSection>
      <AnchoredSection id="rt-watch" eyebrow="Watch-time rules" title="Watch-time truth" subtitle="See exactly what counts, what stays separate, and how completion is computed." accent={T.blue}>
        <WatchTimeTab />
      </AnchoredSection>
      <AnchoredSection id="rt-session" eyebrow="Sessionization" title="Turn noisy raw events into trusted sessions" subtitle="The user should see exactly where pause logic, duplicates, and device changes are handled." accent={T.blue}>
        <SessionizationTab />
      </AnchoredSection>
      <AnchoredSection id="rt-late" eyebrow="Late data" title="Streaming speed still needs correction paths" subtitle="Watermarks and late updates belong right next to the real-time pipeline story." accent={T.red}>
        <LateEventsTab />
      </AnchoredSection>
      <AnchoredSection id="rt-say" eyebrow="Interview answer" title="One clean streaming answer" subtitle="Keep the distinction between live facts and official batch truth clear." accent={T.red}>
        <InterviewAnswerStrip tab="real-time-streaming" accent={T.red} />
      </AnchoredSection>
    </div>
  );
}

function BatchTrackTab() {
  const publishGates = [
    {
      id: "readiness",
      title: "Partition readiness",
      accent: T.blue,
      checkpoint: "Do we have complete raw inputs for the run window?",
      details: [
        "Wait for upstream Bronze partitions and completion signals before Spark starts.",
        "Reject partial windows so downstream metrics never mix yesterday's complete data with today's incomplete arrivals.",
      ],
    },
    {
      id: "quality",
      title: "DQ + staging checks",
      accent: T.amber,
      checkpoint: "Is the trusted output internally consistent?",
      details: [
        "Run duplicates, nulls, impossible timestamp, and reconciliation checks on Silver and pre-publish Gold snapshots.",
        "Write a staging Iceberg snapshot first so failed validations block publication without corrupting official tables.",
      ],
    },
    {
      id: "publish",
      title: "Atomic publish + refresh",
      accent: T.green,
      checkpoint: "Can consumers see one clean official version?",
      details: [
        "Swap trusted snapshots into official tables only after checks pass.",
        "Refresh BI, update lineage, and notify consumers so everyone reads the same published truth.",
      ],
    },
  ] as const;

  return (
    <div className="space-y-8">
      <AnchoredSection id="batch-dag" eyebrow="Daily DAG" title="Visualize the batch publication path" subtitle="Official daily truth should feel like an orchestrated system, not a text paragraph about Spark." accent={T.gold}>
        <BatchPipelineTab />
      </AnchoredSection>
      <AnchoredSection id="lakehouse-layout" eyebrow="Storage flow" title="Show how multiple sources move through the lakehouse" subtitle="Instead of isolated tools, show the order: raw inputs land, Bronze stores them, Spark builds Silver, Gold publishes official truth, and serving refreshes." accent={T.violet}>
        <ToolMappingGrid />
      </AnchoredSection>
      <AnchoredSection id="batch-gates" eyebrow="Quality gates" title="Show what must pass before publish" subtitle="Batch only becomes official when partitions are ready, checks pass, and downstream refreshes are safe." accent={T.amber}>
        <div className="space-y-4">
          <div
            className="rounded-[26px] p-5"
            style={{
              background: `linear-gradient(135deg, ${T.card} 0%, ${T.card2} 100%)`,
              border: `1px solid ${T.amber}24`,
            }}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
                  Publish checklist
                </p>
                <h3 className="text-xl font-bold mt-2" style={{ color: T.text }}>
                  No partial truth crosses this line
                </h3>
                <p className="text-sm mt-2 max-w-3xl" style={{ color: T.faint }}>
                  The release rule is simple: if any gate fails, official tables stay untouched and the team debugs the staging run instead of patching dashboards later.
                </p>
              </div>
              <Pill color={T.amber}>3 release gates</Pill>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_1.05fr]">
            {publishGates.map((gate, index) => (
              <motion.div
                key={gate.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ delay: index * 0.06 }}
                className="rounded-[24px] p-5"
                style={{ background: T.card, border: `1px solid ${gate.accent}24` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold"
                    style={{ background: `${gate.accent}18`, color: gate.accent }}
                  >
                    {index + 1}
                  </div>
                  <Pill color={gate.accent}>{gate.title}</Pill>
                </div>
                <p className="text-lg font-bold mt-4" style={{ color: T.text }}>
                  {gate.checkpoint}
                </p>
                <div className="space-y-3 mt-4">
                  {gate.details.map((detail, detailIndex) => (
                    <motion.div
                      key={`${gate.id}-${detailIndex}`}
                      initial={{ opacity: 0, x: 12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ delay: index * 0.05 + detailIndex * 0.04 }}
                      className="rounded-[18px] p-4"
                      style={{ background: T.card2, border: `1px solid ${T.border}` }}
                    >
                      <p className="text-sm leading-7" style={{ color: T.muted }}>
                        {detail}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnchoredSection>
    </div>
  );
}

function ModelingTrackTab() {
  return (
    <div className="space-y-8">
      <AnchoredSection id="model-erd" eyebrow="Fact + dimension ERD" title="See the trusted tables, columns, and joins in one schema canvas" subtitle="Hover any table or field to understand what it means, how it gets built, and how it joins into facts, marts, and features." accent={T.violet}>
        <ErDiagramPanel />
      </AnchoredSection>
      <AnchoredSection id="model-say" eyebrow="Interview answer" title="Explain the model by grain first" subtitle="Start from the session fact, then show which dimensions explain it and which marts or features it feeds later." accent={T.red}>
        <AnswerCard title="Interview answer" body={MODELING_INTERVIEW_ANSWER} accent={T.red} />
      </AnchoredSection>
    </div>
  );
}

function WarehouseServingTrackTab() {
  return (
    <div className="space-y-8">
      <AnchoredSection id="serve-matrix" eyebrow="Workload matrix" title="Match each consumer to the right serving store" subtitle="One store should not pretend to solve BI, ad hoc, live ops, and raw forensic truth equally well." accent={T.gold}>
        <ServingLayerTab />
      </AnchoredSection>
      <AnchoredSection id="serve-freshness" eyebrow="Freshness matrix" title="Tie serving decisions back to freshness" subtitle="Make dashboard latency and warehouse expectations explicit." accent={T.amber}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {LATENCY_SLA_ROWS.map(([label, value]) => (
            <MetricCard key={label} label={label} value={value} note="Expected availability for this consumer style" color={T.amber} />
          ))}
        </div>
      </AnchoredSection>
      <AnchoredSection id="serve-say" eyebrow="Say this" title="Use a serving-layer answer that sounds intentional" subtitle="The main point is matching workload shape to store shape." accent={T.red}>
        <InterviewAnswerStrip tab="warehouse-serving" accent={T.red} />
      </AnchoredSection>
    </div>
  );
}

function FeatureExperimentTrackTab() {
  return (
    <div className="space-y-8">
      <AnchoredSection id="feature-online-offline" eyebrow="Online vs offline" title="Separate low-latency features from training truth" subtitle="This avoids the page feeling like an ML Engineer mode while still covering the DE responsibility well." accent={T.purple}>
        <FeatureStoreTab />
      </AnchoredSection>
      <AnchoredSection id="feature-experiment" eyebrow="Experimentation" title="Show how experimentation data fits the pipeline" subtitle="Assignments, exposure events, and outcome joins should feel like first-class consumers of the platform." accent={T.purple}>
        <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${T.purple}24` }}>
          <FlowMapper
            steps={[
              "experiment.assigned event",
              "recommendation.served / title.impression exposure",
              "playback / click / retention outcome events",
              "Silver user timeline",
              "Gold experiment analysis mart",
            ]}
            accent={T.purple}
          />
        </div>
      </AnchoredSection>
      <AnchoredSection id="feature-say" eyebrow="Say this" title="Describe how DE supports features and experiments" subtitle="Keep the focus on data correctness and freshness." accent={T.red}>
        <InterviewAnswerStrip tab="feature-store-experimentation" accent={T.red} />
      </AnchoredSection>
    </div>
  );
}

function GovernanceQualityTrackTab() {
  return (
    <div className="space-y-8">
      <AnchoredSection id="gov-contracts" eyebrow="" title="" subtitle="" accent={T.green}>
        <GovernanceTrustFlow />
      </AnchoredSection>
      <AnchoredSection id="gov-quality" eyebrow="" title="" subtitle="" accent={T.red}>
        <GovernanceQualityControlRoom />
      </AnchoredSection>
      <AnchoredSection id="gov-incidents" eyebrow="" title="" subtitle="" accent={T.red}>
        <GovernanceIncidentFlow />
      </AnchoredSection>
      <AnchoredSection id="gov-privacy" eyebrow="" title="" subtitle="" accent={T.green}>
        <GovernancePrivacyOps />
      </AnchoredSection>
    </div>
  );
}

function ReplayTrackTab() {
  return (
    <div className="space-y-8">
      <AnchoredSection id="replay-late" eyebrow="Late events" title="Show where streaming stops and correction begins" subtitle="Watermarks and allowed lateness should be visible before you talk about replay." accent={T.red}>
        <LateEventsTab />
      </AnchoredSection>
      <AnchoredSection id="replay-dlq" eyebrow="DLQ / quarantine" title="Make bad-event routing a first-class visual flow" subtitle="This is one of the major missing DE-specific flows from the feedback." accent={T.red}>
        <FailureMatrixPanel />
      </AnchoredSection>
      <AnchoredSection id="replay-backfill" eyebrow="Audited backfill" title="Show how official truth gets corrected safely" subtitle="Backfills need auditability, idempotency, and a visible publish-control story." accent={T.red}>
        <ReliabilityTab />
      </AnchoredSection>
      <AnchoredSection id="replay-say" eyebrow="Say this" title="Use a clear correction workflow answer" subtitle="Streaming speed is not enough without a correctness recovery path." accent={T.red}>
        <InterviewAnswerStrip tab="backfill-replay" accent={T.red} />
      </AnchoredSection>
    </div>
  );
}

function CapacityCostTrackTab({ depthMode }: { depthMode: DepthMode }) {
  return (
    <div className="space-y-8">
      <AnchoredSection id="cost-scale" eyebrow="" title="" subtitle="" accent={T.blue}>
        <ScaleEstimationTab depthMode={depthMode} />
      </AnchoredSection>
      <AnchoredSection id="cost-tradeoffs" eyebrow="Cost levers" title="Show where cost changes as the platform scales" subtitle="Retention, partitions, cluster sizing, and serving engine choices all move spend." accent={T.amber}>
        <TradeoffsTab />
      </AnchoredSection>
    </div>
  );
}

function FailuresTrackTab() {
  return (
    <div className="space-y-8">
      <AnchoredSection id="failures-playbook" eyebrow="Incident playbook" title="Present failures as a response system" subtitle="Detection, mitigation, recovery, and prevention should all be visible." accent={T.red}>
        <ReliabilityTab />
      </AnchoredSection>
      <AnchoredSection id="failures-matrix" eyebrow="Failure matrix" title="Call out the highest-signal failure modes explicitly" subtitle="This makes the DE section feel more production-ready than article-like." accent={T.red}>
        <FailureMatrixPanel />
      </AnchoredSection>
      <AnchoredSection id="failures-say" eyebrow="Say this" title="Use a structured incident answer" subtitle="Senior answers always include blast radius and safe recovery." accent={T.red}>
        <InterviewAnswerStrip tab="failures" accent={T.red} />
      </AnchoredSection>
    </div>
  );
}

function QuizTrackTab({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  return (
    <div className="space-y-8">
      <section id="quiz-followups" className="scroll-mt-28">
        <InterviewQATab onNavigate={onNavigate} />
      </section>
    </div>
  );
}

function ContentForTab({
  activeTab,
  activeSectionId,
  onNavigate,
  onNavigateSection,
  depthMode,
}: {
  activeTab: DataEngineeringTabSlug;
  activeSectionId: string;
  onNavigate: (tab: DataEngineeringTabSlug) => void;
  onNavigateSection: (sectionId: string) => void;
  depthMode: DepthMode;
}) {
  switch (activeTab) {
    case "start-here":
      return <StartTrackTab activeSectionId={activeSectionId} />;
    case "requirements":
      return <RequirementsTrackTab />;
    case "event-sources":
      return <EventSourcesTrackTab />;
    case "architecture":
      return <ArchitectureTrackTab onNavigate={onNavigate} depthMode={depthMode} />;
    case "ingestion-kafka":
      return <IngestionKafkaTrackTab onNavigate={onNavigate} />;
    case "real-time-streaming":
      return <RealtimeTrackTab />;
    case "batch-pipelines":
      return <BatchTrackTab />;
    case "data-modeling":
      return <ModelingTrackTab />;
    case "governance-quality":
      return <GovernanceQualityTrackTab />;
    case "backfill-replay":
      return <ReplayTrackTab />;
    case "capacity-cost":
      return <CapacityCostTrackTab depthMode={depthMode} />;
    case "failures":
      return <FailuresTrackTab />;
    case "quiz":
      return <QuizTrackTab onNavigate={onNavigate} />;
    case "cheat-sheet":
      return <CheatSheetTabCustom />;
  }
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-2" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] uppercase tracking-[0.14em]" style={{ color: T.faint }}>
        {label}
      </p>
      <p className="text-[11px] mt-1 leading-5" style={{ color: T.text }}>
        {value}
      </p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] uppercase tracking-[0.14em]" style={{ color: T.faint }}>
        {label}
      </p>
      <p className="text-sm mt-1 leading-6" style={{ color: T.text }}>
        {value}
      </p>
    </div>
  );
}

function DetailBlock({
  title,
  accent,
  className,
  children,
}: {
  title: string;
  accent: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl p-4", className)} style={{ background: T.card2, border: `1px solid ${accent}22` }}>
      {title ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: accent }}>
          {title}
        </p>
      ) : null}
      <div>{children}</div>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm font-semibold" style={{ color: T.text }}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-[110px] rounded-lg px-2.5 py-1.5 text-right text-sm"
            style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text }}
          />
          <span className="text-sm" style={{ color: T.faint }}>
            {suffix}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

function FormulaCard({
  title,
  formula,
  example,
}: {
  title: string;
  formula: string;
  example: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
        {title}
      </p>
      <p className="text-sm font-mono mt-3" style={{ color: T.text }}>
        {formula}
      </p>
      <p className="text-[12px] mt-3" style={{ color: T.faint }}>
        {example}
      </p>
    </div>
  );
}

function PathCard({
  title,
  active,
  color,
  detail,
}: {
  title: string;
  active: boolean;
  color: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: active ? `${color}12` : T.card2, border: `1px solid ${active ? `${color}33` : T.border}` }}>
      <p className="text-sm font-bold" style={{ color: active ? color : T.text }}>
        {title}
      </p>
      <p className="text-[12px] mt-2 leading-5" style={{ color: T.faint }}>
        {detail}
      </p>
    </div>
  );
}

function FeatureCard({
  title,
  color,
  summary,
  bullets,
}: {
  title: string;
  color: string;
  summary: string;
  bullets: readonly string[];
}) {
  return (
    <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${color}24` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
        {title}
      </p>
      <p className="text-lg font-bold mt-2" style={{ color: T.text }}>
        {summary}
      </p>
      <div className="space-y-3 mt-4">
        {bullets.map((item) => (
          <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-sm leading-7" style={{ color: T.muted }}>
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheatList({
  title,
  items,
  color,
}: {
  title: string;
  items: readonly string[];
  color: string;
}) {
  return (
    <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${color}24` }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
          {title}
        </p>
        <CopyButton value={items.join("\n")} label="Copy" />
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl p-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-sm leading-6" style={{ color: T.muted }}>
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArchitectureArrow({ left, top, color }: { left: number; top: number; color: string }) {
  return (
    <div
      className="absolute h-[2px]"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: "12%",
        background: `linear-gradient(90deg, ${color}, ${color}55)`,
      }}
    >
      <span className="absolute -right-1 -top-[5px]" style={{ color }}>
        →
      </span>
    </div>
  );
}

function AnimatedDot({
  left,
  top,
  endLeft,
  endTop,
  delay,
  color,
}: {
  left: number;
  top: number;
  endLeft: number;
  endTop: number;
  delay: number;
  color: string;
}) {
  return (
    <span
      className="absolute w-2.5 h-2.5 rounded-full moving-dot"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        background: color,
        animationDelay: `${delay}s`,
        ["--dot-x" as string]: `${endLeft - left}%`,
        ["--dot-y" as string]: `${endTop - top}%`,
      }}
    />
  );
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatBig(value: number) {
  if (value >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000, 2)}B`;
  if (value >= 1_000_000) return `${formatNumber(value / 1_000_000, 2)}M`;
  if (value >= 1_000) return `${formatNumber(value / 1_000, 1)}K`;
  return formatNumber(value, 0);
}

export default function DataEngineeringPage({ initialTab }: { initialTab?: string }) {
  const initial = normalizeDataEngineeringTab(initialTab) ?? "start-here";
  const [activeTab, setActiveTab] = useState<DataEngineeringTabSlug>(initial);
  const [visitedTabs, setVisitedTabs] = useState<Set<DataEngineeringTabSlug>>(new Set([initial]));
  const [revisedTabs, setRevisedTabs] = useState<Set<DataEngineeringTabSlug>>(new Set());
  const [feedback, setFeedback] = useState<Record<string, "up" | "down" | null>>({});
  const [notesOpen, setNotesOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeSectionId, setActiveSectionId] = useState(PRODUCT_TAB_SECTIONS[initial][0]?.id ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionNavLockRef = useRef(0);
  const depthMode: DepthMode = "senior";

  useEffect(() => {
    try {
      const visited = localStorage.getItem("netflix-de-visited-tabs");
      const revised = localStorage.getItem("netflix-de-revised-tabs");
      const noteState = localStorage.getItem("netflix-de-notes");
      const feedbackState = localStorage.getItem("netflix-de-feedback");
      if (visited) setVisitedTabs(new Set(JSON.parse(visited)));
      if (revised) setRevisedTabs(new Set(JSON.parse(revised)));
      if (noteState) setNotes(JSON.parse(noteState));
      if (feedbackState) setFeedback(JSON.parse(feedbackState));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("netflix-de-visited-tabs", JSON.stringify([...visitedTabs]));
      localStorage.setItem("netflix-de-revised-tabs", JSON.stringify([...revisedTabs]));
      localStorage.setItem("netflix-de-notes", JSON.stringify(notes));
      localStorage.setItem("netflix-de-feedback", JSON.stringify(feedback));
    } catch {
      // ignore
    }
  }, [feedback, notes, revisedTabs, visitedTabs]);

  useEffect(() => {
    const onPopState = () => {
      const pathTab = window.location.pathname.split("/").pop();
      const normalized = normalizeDataEngineeringTab(pathTab);
      const hash = window.location.hash.replace("#", "");
      if (normalized) {
        setActiveTab(normalized);
        setActiveSectionId(hash || PRODUCT_TAB_SECTIONS[normalized][0]?.id || "");
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) setActiveSectionId(hash);
  }, []);

  const activeIndex = useMemo(
    () => VISIBLE_DATA_ENGINEERING_TABS.findIndex((tab) => tab.id === activeTab),
    [activeTab]
  );
  const visibleVisitedCount = useMemo(
    () => [...visitedTabs].filter((tabId) => VISIBLE_DATA_ENGINEERING_TABS.some((tab) => tab.id === tabId)).length,
    [visitedTabs]
  );
  const visibleRevisedCount = useMemo(
    () => [...revisedTabs].filter((tabId) => VISIBLE_DATA_ENGINEERING_TABS.some((tab) => tab.id === tabId)).length,
    [revisedTabs]
  );
  const overallProgressPercent = Math.max(6, Math.round((visibleVisitedCount / VISIBLE_DATA_ENGINEERING_TABS.length) * 100));

  const prevTab = VISIBLE_DATA_ENGINEERING_TABS[activeIndex - 1];
  const nextTab = VISIBLE_DATA_ENGINEERING_TABS[activeIndex + 1];
  const activeSections = PRODUCT_TAB_SECTIONS[activeTab];

  useEffect(() => {
    const syncActiveSection = () => {
      if (Date.now() < sectionNavLockRef.current) return;

      const threshold = window.innerWidth >= 1280 ? 220 : 190;
      const sectionNodes = activeSections
        .map((section) => {
          const node = document.getElementById(section.id);
          if (!node) return null;
          return {
            id: section.id,
            top: node.getBoundingClientRect().top,
          };
        })
        .filter((item): item is { id: string; top: number } => item !== null);

      if (sectionNodes.length === 0) return;

      const current = sectionNodes.reduce((closest, section) => {
        if (!closest) return section;
        const sectionDistance = Math.abs(section.top - threshold);
        const closestDistance = Math.abs(closest.top - threshold);
        return sectionDistance < closestDistance ? section : closest;
      }, sectionNodes[0]);

      if (current.id !== activeSectionId) {
        setActiveSectionId(current.id);
      }
    };

    syncActiveSection();
    window.addEventListener("scroll", syncActiveSection, { passive: true });
    window.addEventListener("resize", syncActiveSection);

    return () => {
      window.removeEventListener("scroll", syncActiveSection);
      window.removeEventListener("resize", syncActiveSection);
    };
  }, [activeSectionId, activeSections]);

  const switchTab = useCallback((tab: DataEngineeringTabSlug) => {
    if (tab === activeTab) return;
    const nextSection = PRODUCT_TAB_SECTIONS[tab][0]?.id ?? "";
    setVisitedTabs((prev) => new Set([...prev, activeTab, tab]));
    setActiveTab(tab);
    setActiveSectionId(nextSection);
    window.history.pushState(null, "", `/system-design/netflix-data-engineering/${tab}${nextSection ? `#${nextSection}` : ""}`);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }, [activeTab]);

  const activeMeta = DATA_ENGINEERING_TAB_META[activeTab];

  useEffect(() => {
    document.title = activeMeta.title;
  }, [activeMeta.title]);

  const handleShare = () => {
    copyTextToClipboard(`${window.location.origin}/system-design/netflix-data-engineering/${activeTab}`).catch(() => {});
  };

  const navigateSection = useCallback((sectionId: string) => {
    const node = document.getElementById(sectionId);
    if (!node) return;
    sectionNavLockRef.current = Date.now() + 500;
    setActiveSectionId(sectionId);
    window.history.replaceState(null, "", `/system-design/netflix-data-engineering/${activeTab}#${sectionId}`);
    window.requestAnimationFrame(() => {
      const latestNode = document.getElementById(sectionId);
      if (!latestNode) return;
      const absoluteTop = latestNode.getBoundingClientRect().top + document.documentElement.scrollTop - 96;
      window.scrollTo({ top: Math.max(0, absoluteTop), behavior: "auto" });
    });
  }, [activeTab, scrollRef]);

  const handleExportNotes = () => {
    const lines: string[] = ["# Netflix Data Engineering Notes", ""];
    VISIBLE_DATA_ENGINEERING_TABS.forEach((tab) => {
      const note = notes[tab.id];
      if (!note?.trim()) return;
      lines.push(`## ${tab.label}`);
      lines.push(note.trim());
      lines.push("");
    });
    if (lines.length <= 2) return;
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "netflix-data-engineering-notes.md";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-0" style={{ minHeight: "calc(100dvh - 56px)", background: T.bg, color: T.text }}>
      {!focusMode ? (
        <TopTabStrip
          activeTab={activeTab}
          visitedTabs={visitedTabs}
          progressPercent={overallProgressPercent}
          activeIndex={activeIndex}
          total={VISIBLE_DATA_ENGINEERING_TABS.length}
          revisedCount={revisedTabs.size}
          onNavigate={switchTab}
        />
      ) : null}

      {!focusMode ? (
        activeTab === "data-modeling" ? null : (
          <>
            <div className="xl:hidden h-[60px]" aria-hidden="true" />
            <div
              className="xl:hidden fixed left-0 right-0 z-30 px-4 py-3 flex items-center justify-between backdrop-blur-md"
              style={{
                top: 112,
                borderBottom: `1px solid ${T.border}`,
                background: "color-mix(in srgb, var(--bg) 88%, transparent)",
              }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.faint }}>
                  On this page
                </p>
                <p className="text-sm font-semibold" style={{ color: T.text }}>
                  {activeSections.find((section) => section.id === activeSectionId)?.title ?? VISIBLE_DATA_ENGINEERING_TABS[activeIndex]?.label}
                </p>
              </div>
              <button onClick={() => setMobileMenuOpen(true)} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
                Open outline
              </button>
            </div>
          </>
        )
      ) : null}

      <div className="flex-1 min-h-0 flex">
        {!focusMode ? (
          <Sidebar activeTab={activeTab} activeSectionId={activeSectionId} onNavigateSection={navigateSection} />
        ) : null}
        <ScrollableShell
          prevTab={prevTab}
          nextTab={nextTab}
          onNavigate={switchTab}
          onMarkRevised={() => setRevisedTabs((prev) => {
            const next = new Set(prev);
            if (next.has(activeTab)) next.delete(activeTab);
            else next.add(activeTab);
            return next;
          })}
          revised={revisedTabs.has(activeTab)}
          scrollRef={scrollRef}
          feedbackVote={feedback[activeTab] ?? null}
          onFeedback={(vote) => setFeedback((prev) => ({ ...prev, [activeTab]: vote }))}
        >
          <ContentForTab
            activeTab={activeTab}
            activeSectionId={activeSectionId}
            onNavigate={switchTab}
            onNavigateSection={navigateSection}
            depthMode={depthMode}
          />
        </ScrollableShell>
      </div>

      {activeTab === "data-modeling" ? null : (
        <MobileMenu activeTab={activeTab} open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} onNavigateSection={navigateSection} />
      )}

      {focusMode ? (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-between" style={{ background: `${T.red}ee` }}>
          <span className="text-xs font-bold text-white">
            Focus Mode — {VISIBLE_DATA_ENGINEERING_TABS[activeIndex]?.label}
          </span>
          <button onClick={() => setFocusMode(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)" }}>
            Exit focus
          </button>
        </div>
      ) : null}

      {notesOpen ? (
        <div className="fixed inset-y-0 right-0 z-[60] w-[340px] max-w-full flex flex-col" style={{ background: T.bg, borderLeft: `1px solid ${T.border}` }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}` }}>
            <div>
              <p className="text-sm font-bold" style={{ color: T.text }}>
                Notes — {VISIBLE_DATA_ENGINEERING_TABS[activeIndex]?.label}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleExportNotes} className="text-[10px] px-2 py-1 rounded cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
                Export .md
              </button>
              <button onClick={() => setNotesOpen(false)} className="text-lg cursor-pointer" style={{ color: T.muted }}>
                ✕
              </button>
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-3">
            <textarea
              value={notes[activeTab] ?? ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [activeTab]: e.target.value }))}
              className="flex-1 rounded-2xl p-4 resize-none text-sm"
              style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, outline: "none" }}
              placeholder="Capture your interview answer shape, formulas, and things you want to revise."
            />
            <p className="text-[11px]" style={{ color: T.faint }}>
              {(notes[activeTab] ?? "").length} characters
            </p>
          </div>
        </div>
      ) : null}

      {progressOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setProgressOpen(false)}>
          <div className="w-full max-w-2xl rounded-[28px] p-6" style={{ background: T.card, border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.faint }}>
                  Your progress
                </p>
                <h2 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
                  Netflix Data Engineering
                </h2>
              </div>
              <button onClick={() => setProgressOpen(false)} className="text-lg cursor-pointer" style={{ color: T.muted }}>
                ✕
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3 mb-5">
              <MetricCard label="Visited" value={`${visibleVisitedCount}/${VISIBLE_DATA_ENGINEERING_TABS.length}`} note="Tabs you have opened" color={T.red} />
              <MetricCard label="Revised" value={`${visibleRevisedCount}/${VISIBLE_DATA_ENGINEERING_TABS.length}`} note="Tabs you explicitly marked revised" color={T.green} />
              <MetricCard label="Notes" value={String(Object.values(notes).filter((value) => value.trim()).length)} note="Tabs with saved notes" color={T.amber} />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {VISIBLE_DATA_ENGINEERING_TABS.map((tab) => (
                <div key={tab.id} className="rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: T.text }}>
                      {tab.label}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: T.faint }}>
                      {tab.group}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {visitedTabs.has(tab.id) ? <Pill color={T.red}>Visited</Pill> : null}
                    {revisedTabs.has(tab.id) ? <Pill color={T.green}>Revised</Pill> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .moving-dot {
          animation: moveDot 4.2s linear infinite;
        }
        @keyframes moveDot {
          0% { transform: translate(0, 0); opacity: 0; }
          12% { opacity: 1; }
          82% { opacity: 1; }
          100% { transform: translate(var(--dot-x), var(--dot-y)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function SectionHero({
  meta,
  accent,
  activeIndex,
  tab,
  sections,
  onNavigateSection,
}: {
  meta: (typeof DATA_ENGINEERING_TAB_META)[DataEngineeringTabSlug];
  accent: string;
  activeIndex: number;
  tab: DataEngineeringTabSlug;
  sections: OutlineItem[];
  onNavigateSection: (sectionId: string) => void;
}) {
  return (
    <div className="rounded-[24px] p-4 md:p-5 mb-5 relative overflow-hidden" style={{ background: T.card, border: `1px solid ${accent}20` }}>
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${accent}, ${T.amber}, ${T.violet})` }} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-stretch">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
            {meta.heroTitle}
          </p>
          <h2 className="mt-2 text-[1.45rem] md:text-[1.7rem] font-semibold tracking-[-0.045em] leading-[1.02] max-w-2xl" style={{ color: T.text }}>
            {meta.heroSubtitle}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: T.muted }}>
            {TAB_INTERVIEW_LINES[tab]}
          </p>
        </div>
        <div className="rounded-[20px] p-4 flex flex-col justify-between gap-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
              Why it matters
            </p>
            <p className="mt-3 text-sm leading-7" style={{ color: T.muted }}>
              {meta.interviewAngle}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onNavigateSection(sections[0]?.id ?? "")}
              className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              style={{ background: `${accent}12`, color: T.text, border: `1px solid ${accent}24` }}
            >
              Open {sections[0]?.title ?? "first section"} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
