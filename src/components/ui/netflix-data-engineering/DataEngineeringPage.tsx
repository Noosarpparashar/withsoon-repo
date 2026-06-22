"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { copyTextToClipboard } from "../netflix-tabs/clipboard";
import {
  ARCHITECTURE_NODES,
  ARCHITECTURE_REVEALS,
  BATCH_DAG_STEPS,
  CHEAT_SHEET_CONTENT,
  DATA_ENGINEERING_GROUPS,
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
  START_HERE_JOURNEY,
  START_HERE_SCOPE,
  TABLE_SCHEMAS,
  TRADEOFFS,
  WATCH_TIME_DEFINITIONS,
  WATCH_TIME_RULES,
  WATCH_TIME_TIMELINE,
  normalizeDataEngineeringTab,
  type DataEngineeringGroup,
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

type ScopeMode = "backend" | "data";
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

const PRODUCT_TAB_SECTIONS: Record<DataEngineeringTabSlug, OutlineItem[]> = {
  "start-here": [
    { id: "start-overview", title: "Track intent", note: "Clarify what this interview is and is not." },
    { id: "start-journey", title: "Journey map", note: "Show the full DE answer sequence." },
    { id: "start-say", title: "Say this", note: "Use a crisp opening script." },
  ],
  requirements: [
    { id: "req-scope", title: "Scope + pro tip", note: "Keep the boundary tight." },
    { id: "req-scale", title: "Scale anchors", note: "Anchor the discussion with numbers." },
    { id: "req-domains", title: "Functional domains", note: "Group requirements by data domain." },
    { id: "req-nfr", title: "SLA matrix", note: "Freshness, trust, and quality expectations." },
    { id: "req-say", title: "Say this", note: "Opening answer for the tab." },
  ],
  "event-sources": [
    { id: "sources-map", title: "Source map", note: "Producers and key event families." },
    { id: "sources-contract", title: "Event contract", note: "Fields, topics, and consumers." },
    { id: "sources-lineage", title: "Population flow", note: "How sources become trusted tables." },
    { id: "sources-say", title: "Say this", note: "Explain why sources come first." },
  ],
  architecture: [
    { id: "arch-layered", title: "Layered map", note: "Clickable end-to-end architecture." },
    { id: "arch-journey", title: "Event journey", note: "Emit to serve in one strip." },
    { id: "arch-decisions", title: "Decision cards", note: "Why this stack and shape." },
    { id: "arch-say", title: "Say this", note: "Narrate the platform in order." },
  ],
  "ingestion-kafka": [
    { id: "ingest-lanes", title: "Ingestion lanes", note: "Client, CDC, and external batch." },
    { id: "ingest-topics", title: "Topic map", note: "Keys, partitions, retention, schemas." },
    { id: "ingest-fanout", title: "Fan-out", note: "Raw sink, streaming, features, DLQ." },
    { id: "ingest-say", title: "Say this", note: "Explain why Kafka is central." },
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
    { id: "batch-gates", title: "Quality gates", note: "Readiness and publish conditions." },
    { id: "batch-say", title: "Say this", note: "Explain why batch still matters." },
  ],
  "storage-lakehouse": [
    { id: "lakehouse-medallion", title: "Bronze / Silver / Gold", note: "Layer responsibilities." },
    { id: "lakehouse-layout", title: "Storage layout", note: "S3 paths, Iceberg, retention." },
    { id: "lakehouse-say", title: "Say this", note: "Lakehouse framing line." },
  ],
  "data-modeling": [
    { id: "model-tables", title: "Core tables", note: "Facts, dims, marts, audits." },
    { id: "model-lineage", title: "Lineage flow", note: "Who writes what and when." },
    { id: "model-erd", title: "ERD + star schema", note: "Entity relationships and serving shape." },
    { id: "model-say", title: "Say this", note: "Modeling explanation for interviews." },
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
    { id: "gov-contracts", title: "Data contracts", note: "Validate schemas and ownership." },
    { id: "gov-quality", title: "DQ dashboard", note: "Freshness, duplicates, nulls, severity." },
    { id: "gov-privacy", title: "Privacy controls", note: "PII, deletes, retention, audit." },
    { id: "gov-say", title: "Say this", note: "Governance and trust answer." },
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
    { id: "cost-tools", title: "AWS + OSS map", note: "How the stack maps to services." },
    { id: "cost-say", title: "Say this", note: "Capacity and cost answer." },
  ],
  failures: [
    { id: "failures-playbook", title: "Incident playbook", note: "Detection, mitigation, recovery." },
    { id: "failures-matrix", title: "Failure matrix", note: "Schema breaks, lag, stale Gold, skew." },
    { id: "failures-say", title: "Say this", note: "Failure answer shape." },
  ],
  quiz: [
    { id: "quiz-followups", title: "Follow-up bank", note: "Filterable Q&A by topic." },
    { id: "quiz-mock", title: "Mock interview", note: "Practice speaking end-to-end." },
    { id: "quiz-flashcards", title: "Flashcards", note: "High-signal memory hooks." },
  ],
  "cheat-sheet": [
    { id: "cheat-short", title: "Answer versions", note: "30-second, 2-minute, 5-minute." },
    { id: "cheat-formulas", title: "Formulas", note: "Scale, watch-time, and partitions." },
    { id: "cheat-copy", title: "Print / copy", note: "Takeaway revision actions." },
  ],
};

const TAB_INTERVIEW_LINES: Record<DataEngineeringTabSlug, string> = {
  "start-here": "I will scope this as the Netflix data platform behind events, streaming, lakehouse, analytics, quality, and replay rather than the playback backend itself.",
  requirements: "I group requirements by data domain, then map each one to freshness, correctness, consumers, and the tables or streams that answer it.",
  "event-sources": "Before I design Kafka or tables, I want to make the event sources explicit so the interviewer can see what data exists, who produces it, and what each event feeds.",
  architecture: "My architecture is layered: emit, validate, publish to Kafka, process in streaming and batch, store in Bronze/Silver/Gold, and serve BI plus features with governance around every layer.",
  "ingestion-kafka": "Kafka is the durable event backbone here because it decouples producers from many consumers while giving us replay, retention, ordered partitions, and clear schema contracts.",
  "real-time-streaming": "The streaming layer turns raw events into trusted near-real-time facts using keyed state, watermarking, sessionization, and clearly defined metric logic like heartbeat-based watch time.",
  "batch-pipelines": "Batch owns the official daily truth because it can reconcile late data, run broader joins, enforce DQ gates, and publish stable Gold outputs for reporting and training.",
  "storage-lakehouse": "Bronze is immutable raw truth, Silver is cleaned and trusted, and Gold is curated for business use, so replay and correction stay possible without corrupting official metrics.",
  "data-modeling": "I explain the model by grain first, then facts and dimensions, then how each table is populated, partitioned, and consumed downstream.",
  "warehouse-serving": "Different consumers need different serving layers, so I match BI, ad hoc SQL, real-time OLAP, and raw forensic queries to the right engines instead of forcing one store to do everything.",
  "feature-store-experimentation": "DE owns the freshness and correctness of feature data by separating online and offline paths while preserving point-in-time joins and experiment exposure lineage.",
  "governance-quality": "Schema contracts, DQ checks, privacy controls, and audit trails are not side notes here; they are operating requirements of the platform.",
  "backfill-replay": "Streaming gives speed, but replay, quarantine, and audited backfills are how we recover correctness when late data or bad code reaches production.",
  "capacity-cost": "I derive capacity from event math, then show how topic retention, compaction, cluster sizing, storage layout, and query engine choices control cost.",
  failures: "For failures, I describe detection, blast radius, immediate mitigation, safe recovery, and what design change prevents the same class of incident next time.",
  quiz: "When I practice, I want to handle both direct questions and interviewer pushback, so I use follow-up Q&A, mock prompts, and short recall drills together.",
  "cheat-sheet": "My cheat sheet reduces the full design into a few answer versions, formulas, and red-flag mistakes so I can recall it quickly under interview pressure.",
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

const TABLE_LINEAGE_FLOW = [
  "video.heartbeat / playback events",
  "Kafka playback topics",
  "Bronze immutable raw events",
  "Silver trusted playback session facts",
  "Gold content and user metrics",
  "BI dashboards + feature tables",
] as const;

const TOOL_MAPPING_CARDS = [
  { title: "Event backbone", aws: "MSK", oss: "Kafka + Schema Registry", why: "Durable fan-out, replay, and independent consumers." },
  { title: "Streaming compute", aws: "Kinesis Data Analytics / EMR on EKS", oss: "Flink", why: "Stateful stream processing, watermarks, and session logic." },
  { title: "Batch compute", aws: "EMR / Glue", oss: "Spark + dbt", why: "Large joins, reconciliation, and official daily truth." },
  { title: "Lakehouse format", aws: "S3 + Glue Catalog", oss: "Iceberg", why: "Schema evolution, snapshots, time travel, and controlled backfills." },
  { title: "Serving", aws: "Redshift / Athena", oss: "Trino / Pinot", why: "Separate BI, ad hoc, and real-time OLAP workloads." },
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

const FAILURE_MATRIX = [
  ["Schema release breaks parser", "Block publish, divert to quarantine, keep previous schema readers alive."],
  ["Kafka partition lag spikes", "Throttle low-priority consumers, scale processors, and protect live SLA topics."],
  ["Gold metrics wrong for 30 days", "Freeze publication, replay trusted Silver snapshots, audit corrected ranges."],
  ["Late event flood after outage", "Route to replay path and run bounded correction jobs by partition/date."],
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

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
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
  activeIndex,
  total,
  visitedCount,
  revisedCount,
  onToggleProgress,
  onToggleNotes,
  onToggleFocus,
  focusMode,
  onShare,
}: {
  tab: DataEngineeringTabSlug;
  activeIndex: number;
  total: number;
  visitedCount: number;
  revisedCount: number;
  onToggleProgress: () => void;
  onToggleNotes: () => void;
  onToggleFocus: () => void;
  focusMode: boolean;
  onShare: () => void;
}) {
  const meta = DATA_ENGINEERING_TAB_META[tab];
  const accent = DATA_ENGINEERING_TABS.find((item) => item.id === tab)?.accent ?? T.red;
  const progressPercent = Math.max(6, Math.round((visitedCount / total) * 100));

  return (
    <div className="shrink-0 z-30" style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
      <div className="px-4 py-2.5 flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Link href="/" className="text-xs font-semibold" style={{ color: T.faint }}>
              withsoon
            </Link>
            <span className="text-xs" style={{ color: T.faint }}>
              /
            </span>
            <Link href="/system-design" className="text-xs font-semibold" style={{ color: T.faint }}>
              System Design
            </Link>
            <span className="text-xs" style={{ color: T.faint }}>
              /
            </span>
            <span className="text-xs font-semibold" style={{ color: T.text }}>
              Netflix Data Engineering
            </span>
            <Pill color={accent}>{DATA_ENGINEERING_TAB_META[tab].eyebrow}</Pill>
          </div>
          <h1 className="text-[1.45rem] md:text-[1.65rem] font-semibold tracking-[-0.045em] leading-[0.98]" style={{ color: T.text }}>
            {meta.heroTitle}
          </h1>
          <p className="text-sm mt-1.5 max-w-4xl" style={{ color: T.muted }}>
            {meta.interviewAngle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/system-design/netflix/start-here"
            className="px-2.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap"
            style={{ background: "transparent", color: T.faint, border: `1px solid ${T.border}` }}
          >
            View Backend Track
          </Link>
          <div className="text-right px-3 py-2 rounded-xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.faint }}>
              Chapter
            </p>
            <p className="text-sm font-bold" style={{ color: T.text }}>
              {activeIndex + 1} / {total}
            </p>
          </div>
          <div className="hidden xl:block min-w-[190px] px-3 py-2 rounded-xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.faint }}>
                Progress
              </p>
              <p className="text-[11px] font-semibold" style={{ color: T.text }}>
                {progressPercent}%
              </p>
            </div>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: T.card2 }}>
              <div className="h-full rounded-full" style={{ width: `${progressPercent}%`, background: `linear-gradient(90deg, ${accent}, ${T.blue})` }} />
            </div>
            <p className="text-[10px] mt-2" style={{ color: T.faint }}>
              {visitedCount} visited · {revisedCount} revised
            </p>
          </div>
          <button onClick={onToggleProgress} className="text-xs px-2.5 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
            Progress
          </button>
          <button onClick={onToggleNotes} className="text-xs px-2.5 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
            Notes
          </button>
          <button onClick={onToggleFocus} className="text-xs px-2.5 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: focusMode ? `${T.red}18` : T.card, color: focusMode ? T.red : T.text, border: `1px solid ${focusMode ? `${T.red}33` : T.border}` }}>
            {focusMode ? "Exit Focus" : "Focus"}
          </button>
          <button onClick={onShare} className="text-xs px-2.5 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
            Share
          </button>
        </div>
      </div>
    </div>
  );
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
  onNavigate,
}: {
  activeTab: DataEngineeringTabSlug;
  visitedTabs: Set<DataEngineeringTabSlug>;
  progressPercent: number;
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

  return (
    <div className="shrink-0 sticky top-0 z-20 border-b backdrop-blur-sm" style={{ borderColor: T.border, background: "color-mix(in srgb, var(--bg) 94%, transparent)" }}>
      <div className="h-1 overflow-hidden" style={{ background: T.card2 }}>
        <div className="h-full transition-all duration-300" style={{ width: `${progressPercent}%`, background: `linear-gradient(90deg, ${T.red}, ${T.amber}, ${T.blue})` }} />
      </div>
      <div className="relative">
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
          style={{ background: T.card, color: T.text, border: `1px solid ${T.border}`, boxShadow: `0 10px 24px ${T.bg}` }}
          aria-label="Scroll chapters left"
        >
          ←
        </button>
        <button
          onClick={() => nudgeRail("right")}
          className={cn(
            "hidden xl:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full items-center justify-center transition-all",
            canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          style={{ background: T.card, color: T.text, border: `1px solid ${T.border}`, boxShadow: `0 10px 24px ${T.bg}` }}
          aria-label="Scroll chapters right"
        >
          →
        </button>
        <div ref={railRef} className="px-4 xl:px-16 py-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max items-stretch">
          {DATA_ENGINEERING_TABS.map((tab, index) => {
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
  const sections = PRODUCT_TAB_SECTIONS[activeTab];
  const activeMeta = DATA_ENGINEERING_TAB_META[activeTab];
  const accent = DATA_ENGINEERING_TABS.find((tab) => tab.id === activeTab)?.accent ?? T.red;

  return (
    <aside className="hidden xl:flex w-[290px] shrink-0 border-r flex-col" style={{ borderColor: T.border, background: T.bg }}>
      <div className="p-4 overflow-y-auto no-scrollbar space-y-4">
        <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${accent}22` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
            {activeMeta.heroTitle}
          </p>
          <p className="text-[12px] mt-2 leading-5" style={{ color: T.faint }}>
            {activeMeta.heroSubtitle}
          </p>
        </div>
        <div>
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: T.faint }}>
              On this page
            </p>
          </div>
          <div className="space-y-2">
            {sections.map((section, index) => {
              const active = activeSectionId === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => onNavigateSection(section.id)}
                  className="w-full text-left rounded-2xl p-3 cursor-pointer transition-all hover:-translate-y-px"
                  style={{
                    background: active ? `${accent}12` : T.card,
                    border: `1px solid ${active ? `${accent}33` : T.border}`,
                    boxShadow: active ? `0 14px 26px ${accent}14` : "none",
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
                      <p className="text-[11px] mt-1 leading-5" style={{ color: T.faint }}>
                        {section.note}
                      </p>
                    </div>
                    <span className="text-lg leading-none mt-0.5" style={{ color: active ? accent : T.faint }}>
                      ›
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
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
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => setShowTop(el.scrollTop > 320);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [scrollRef]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto relative no-scrollbar" style={{ background: T.bg }}>
      <div className="px-4 lg:px-6 py-6 max-w-[1320px] mx-auto">
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
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
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
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
          {title}
        </p>
        <CopyButton value={body} label="Copy answer" />
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
  const meta = DATA_ENGINEERING_TAB_META[tab];
  const answerVersions = [
    {
      title: "30-second answer",
      body: TAB_INTERVIEW_LINES[tab],
    },
    {
      title: "2-minute answer",
      body: `${meta.description} Focus on ${meta.heroSignals.slice(0, 3).join(", ")}.`,
    },
    {
      title: "Deep answer",
      body: `${TAB_INTERVIEW_LINES[tab]} Then go layer by layer through ${meta.heroSignals.join(", ")}, including trade-offs, failure handling, and why this shape is right for the consumer SLAs.`,
    },
  ];

  return (
    <>
      <div className="xl:hidden">
        <AnswerCard title="Say This In Interview" body={TAB_INTERVIEW_LINES[tab]} accent={accent} />
      </div>
      <div className="hidden xl:grid xl:grid-cols-3 gap-4">
        {answerVersions.map((item, index) => (
          <div key={item.title} className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${accent}24` }}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                {item.title}
              </p>
              <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: `${accent}10`, color: accent, border: `1px solid ${accent}22` }}>
                {index === 0 ? "Fast" : index === 1 ? "Balanced" : "Deep"}
              </span>
            </div>
            <p className="text-sm mt-4 leading-7" style={{ color: T.muted }}>
              {item.body}
            </p>
            <div className="mt-4">
              <CopyButton value={item.body} label="Copy answer" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
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
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {TOOL_MAPPING_CARDS.map((card) => (
        <div key={card.title} className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
            {card.title}
          </p>
          <div className="grid gap-3 mt-4">
            <InfoTile label="AWS" value={card.aws} />
            <InfoTile label="Open source" value={card.oss} />
            <DetailBlock title="Why here" accent={T.amber}>{card.why}</DetailBlock>
          </div>
        </div>
      ))}
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
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        {ERD_GROUPS.map((group) => (
          <div key={group.title} className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${group.color}24` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: group.color }}>
              {group.title}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {group.items.map((item) => (
                <span key={item} className="px-3 py-2 rounded-full text-xs font-semibold" style={{ background: `${group.color}12`, color: T.text, border: `1px solid ${group.color}24` }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-[24px] p-5 relative overflow-hidden" style={{ background: T.card, border: `1px solid ${T.violet}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.violet }}>
          Star schema visual
        </p>
        <div className="mt-6 grid place-items-center min-h-[360px]">
          <div className="relative w-full max-w-[520px] h-[320px]">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[22px] px-6 py-5" style={{ background: `${T.violet}14`, border: `1px solid ${T.violet}28` }}>
              <p className="text-sm font-bold" style={{ color: T.text }}>fact_watch_session</p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>grain: one trusted playback session</p>
            </div>
            {[
              { label: "dim_user", left: "8%", top: "12%" },
              { label: "dim_profile", left: "72%", top: "10%" },
              { label: "dim_content", left: "8%", top: "72%" },
              { label: "dim_device", left: "74%", top: "72%" },
              { label: "dim_date", left: "40%", top: "0%" },
            ].map((item) => (
              <div key={item.label} className="absolute rounded-[18px] px-4 py-3" style={{ left: item.left, top: item.top, background: T.card2, border: `1px solid ${T.border}` }}>
                <p className="text-xs font-semibold" style={{ color: T.text }}>{item.label}</p>
              </div>
            ))}
            <ArchitectureArrow left={29} top={28} color={T.violet} />
            <ArchitectureArrow left={55} top={28} color={T.violet} />
            <ArchitectureArrow left={29} top={74} color={T.violet} />
            <ArchitectureArrow left={55} top={74} color={T.violet} />
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

function DesktopJourneyCanvas({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  const steps: Array<{
    label: string;
    note: string;
    preview: string[];
    target: DataEngineeringTabSlug;
    color: string;
  }> = [
    { label: "Scope", note: "Frame the platform boundary first.", preview: ["in scope", "out of scope", "track opening"], target: "start-here", color: T.red },
    { label: "Events", note: "Map the producers and event families.", preview: ["clients", "CDC", "contracts"], target: "event-sources", color: T.blue },
    { label: "Kafka", note: "Choose topics, keys, and replay posture.", preview: ["topic design", "partition key", "DLQ"], target: "ingestion-kafka", color: T.amber },
    { label: "Streaming", note: "Turn events into trusted live facts.", preview: ["watermarks", "sessionization", "late events"], target: "real-time-streaming", color: T.blue },
    { label: "Lakehouse", note: "Keep replayable truth by layer.", preview: ["Bronze", "Silver", "Gold"], target: "storage-lakehouse", color: T.violet },
    { label: "Gold Metrics", note: "Publish decision-ready outputs.", preview: ["marts", "freshness", "quality"], target: "data-modeling", color: T.green },
    { label: "BI / ML", note: "Serve each consumer correctly.", preview: ["warehouse", "Pinot", "features"], target: "warehouse-serving", color: T.gold },
    { label: "Replay", note: "Protect correctness after failure.", preview: ["quarantine", "backfill", "audit"], target: "backfill-replay", color: T.red },
  ];

  return (
    <div className="hidden xl:block rounded-[28px] p-5" style={{ background: T.card, border: `1px solid ${T.violet}24` }}>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.violet }}>
            Desktop journey canvas
          </p>
          <p className="text-[12px] mt-1" style={{ color: T.faint }}>
            Click any stage to jump into the deeper chapter.
          </p>
        </div>
        <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: `${T.violet}10`, color: T.violet, border: `1px solid ${T.violet}22` }}>
          Diagram-first desktop view
        </span>
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.68fr_1.32fr]">
        <div className="rounded-[24px] p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.label} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: `${step.color}16`, color: step.color }}>
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: T.text }}>
                    {step.label}
                  </p>
                  <p className="text-[12px] mt-1 leading-5" style={{ color: T.faint }}>
                    {step.note}
                  </p>
                </div>
                {index < steps.length - 1 ? <span className="text-lg" style={{ color: step.color }}>↓</span> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {steps.map((step) => (
            <button
              key={step.label}
              onClick={() => onNavigate(step.target)}
              className="rounded-[24px] p-4 text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: T.card2, border: `1px solid ${step.color}24` }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold" style={{ color: T.text }}>
                  {step.label}
                </p>
                <span className="text-xs" style={{ color: step.color }}>
                  Open →
                </span>
              </div>
              <p className="text-[12px] mt-2 leading-6" style={{ color: T.faint }}>
                {step.note}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {step.preview.map((item) => (
                  <span key={item} className="px-3 py-1.5 rounded-full text-[11px] font-semibold" style={{ background: `${step.color}10`, color: T.text, border: `1px solid ${step.color}22` }}>
                    {item}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const FLOW_NODES = [
  {
    id: "user-events",
    label: "User Events",
    sublabel: "Mobile · Web · TV · CDN",
    color: "#38bdf8",
    detail: "Playback, heartbeat, search, impression, click, QoE, billing, and recommendation-feedback events are emitted by apps and backend services at up to 500K events/sec peak.",
  },
  {
    id: "kafka",
    label: "Kafka / MSK",
    sublabel: "Event backbone",
    color: "#f59e0b",
    detail: "Kafka buffers high-volume events, decouples producers and consumers, supports replay, and feeds streaming, raw lake, and feature pipelines in parallel.",
  },
  {
    id: "streaming",
    label: "Flink / Spark Streaming",
    sublabel: "Real-time jobs",
    color: "#a855f7",
    detail: "Streaming jobs sessionize playback events, compute near-real-time QoE metrics, detect anomalies, and publish online feature updates — all within seconds to minutes.",
  },
  {
    id: "lakehouse",
    label: "S3 + Iceberg",
    sublabel: "Bronze · Silver · Gold",
    color: "#22c55e",
    detail: "Bronze stores raw immutable events, Silver stores cleaned and sessionized data, and Gold stores business-ready aggregates. Iceberg enables time-travel and safe backfills.",
  },
  {
    id: "batch",
    label: "Spark / dbt Batch",
    sublabel: "Daily official truth",
    color: "#f97316",
    detail: "Batch jobs publish the authoritative daily Gold metrics — watch hours, content performance, retention, revenue — after reconciling late events and running quality gates.",
  },
  {
    id: "serving",
    label: "BI + ML Serving",
    sublabel: "Dashboards · Feature Store",
    color: "#e50914",
    detail: "Redshift and Athena serve BI and ad-hoc SQL. Pinot serves real-time OLAP. The feature store serves online ML models. Each consumer gets the right freshness from the right engine.",
  },
] as const;

type FlowNodeId = typeof FLOW_NODES[number]["id"];

const FLOW_NODE_ICONS: Record<FlowNodeId, string> = {
  "user-events": "📱",
  "kafka": "⚡",
  "streaming": "🌊",
  "lakehouse": "🏔",
  "batch": "⚙️",
  "serving": "📊",
};

const WHAT_YOU_LEARN = [
  { title: "Event journey", body: "How user actions become analytics facts via Kafka, streaming jobs, and lakehouse tables.", color: T.blue },
  { title: "Correctness story", body: "Why heartbeat beats play/pause, how sessionization works, and when batch owns final truth.", color: T.violet },
  { title: "Scale math", body: "How to derive Kafka partitions, storage size, and streaming parallelism from DAU and event rate.", color: T.green },
  { title: "Failure recovery", body: "Late data, DLQ, quarantine, replay paths, and how to protect official metrics from bad code.", color: T.red },
];

function StartHereTab({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  const [selectedFlowNode, setSelectedFlowNode] = useState<FlowNodeId>("kafka");
  const [isPlaying, setIsPlaying] = useState(false);
  const activeNode = FLOW_NODES.find((n) => n.id === selectedFlowNode) ?? FLOW_NODES[1];
  const activeIndex = FLOW_NODES.findIndex((n) => n.id === selectedFlowNode);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPlay = () => {
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    playTimerRef.current = null;
    setIsPlaying(false);
  };

  const startPlay = () => {
    stopPlay();
    setIsPlaying(true);
    setSelectedFlowNode(FLOW_NODES[0].id);
    let i = 0;
    playTimerRef.current = setInterval(() => {
      i++;
      if (i >= FLOW_NODES.length) {
        stopPlay();
        return;
      }
      setSelectedFlowNode(FLOW_NODES[i].id);
    }, 1800);
  };

  useEffect(() => () => stopPlay(), []);

  const INTERVIEW_ANSWER = "I would design Netflix's data platform, not the playback backend. The system ingests playback, heartbeat, search, impression, QoE, billing, and recommendation events into Kafka. From there, real-time jobs compute freshness-sensitive metrics, while raw events land in S3/Iceberg for batch processing. Cleaned Silver tables and aggregated Gold tables power dashboards, experimentation, recommendations, data quality, replay, and backfills.";

  return (
    <div className="space-y-6">

      {/* Clickable flow diagram */}
      <div className="rounded-[28px] p-5 md:p-6 relative overflow-hidden" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${T.blue}, ${T.violet}, ${T.red})` }} />
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: T.blue }}>
            Data platform end-to-end flow — click any stage
          </p>
          <div className="flex items-center gap-2">
            {isPlaying ? (
              <button
                onClick={stopPlay}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                style={{ background: `${T.red}18`, color: T.red, border: `1px solid ${T.red}33` }}
              >
                ■ Stop
              </button>
            ) : (
              <button
                onClick={startPlay}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:-translate-y-0.5"
                style={{ background: `${T.blue}18`, color: T.blue, border: `1px solid ${T.blue}33` }}
              >
                ▶ Play journey
              </button>
            )}
            {selectedFlowNode !== "kafka" && (
              <button
                onClick={() => { stopPlay(); setSelectedFlowNode("kafka"); }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                style={{ background: T.card2, color: T.muted, border: `1px solid ${T.border}` }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-4">
          {FLOW_NODES.map((node, i) => (
            <button
              key={node.id}
              onClick={() => { stopPlay(); setSelectedFlowNode(node.id); }}
              className="cursor-pointer rounded-full transition-all duration-200"
              style={{
                width: i === activeIndex ? 20 : 8,
                height: 8,
                background: i === activeIndex ? node.color : i < activeIndex ? `${node.color}55` : T.border,
              }}
              aria-label={node.label}
            />
          ))}
        </div>

        {/* Node row */}
        <div className="flex flex-wrap items-center gap-0">
          {FLOW_NODES.map((node, index) => (
            <div key={node.id} className="flex items-center">
              <button
                onClick={() => { stopPlay(); setSelectedFlowNode(node.id); }}
                className="rounded-[18px] px-3 py-2.5 text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: selectedFlowNode === node.id ? `${node.color}18` : T.card2,
                  border: `1px solid ${selectedFlowNode === node.id ? `${node.color}44` : T.border}`,
                  boxShadow: selectedFlowNode === node.id ? `0 0 0 2px ${node.color}22, 0 12px 24px ${node.color}18` : "none",
                  minWidth: 110,
                }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base leading-none">{FLOW_NODE_ICONS[node.id as FlowNodeId]}</span>
                  <p className="text-xs font-bold leading-5" style={{ color: selectedFlowNode === node.id ? node.color : T.text }}>
                    {node.label}
                  </p>
                </div>
                <p className="text-[10px]" style={{ color: T.faint }}>
                  {node.sublabel}
                </p>
              </button>
              {index < FLOW_NODES.length - 1 && (
                <span
                  className="mx-1 text-sm font-bold transition-colors duration-300"
                  style={{ color: index < activeIndex ? activeNode.color : T.border }}
                >
                  →
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Selected node detail */}
        <div className="mt-4 rounded-[18px] p-4 transition-all duration-200" style={{ background: `${activeNode.color}0c`, border: `1px solid ${activeNode.color}28` }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg leading-none">{FLOW_NODE_ICONS[activeNode.id as FlowNodeId]}</span>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: activeNode.color }}>
              {activeNode.label}
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${activeNode.color}14`, color: activeNode.color }}>
              {activeIndex + 1} / {FLOW_NODES.length}
            </span>
          </div>
          <p className="text-sm leading-7" style={{ color: T.muted }}>
            {activeNode.detail}
          </p>
          <div className="flex gap-2 mt-3">
            {activeIndex > 0 && (
              <button
                onClick={() => { stopPlay(); setSelectedFlowNode(FLOW_NODES[activeIndex - 1].id); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ background: T.card2, color: T.muted, border: `1px solid ${T.border}` }}
              >
                ← {FLOW_NODES[activeIndex - 1].label}
              </button>
            )}
            {activeIndex < FLOW_NODES.length - 1 && (
              <button
                onClick={() => { stopPlay(); setSelectedFlowNode(FLOW_NODES[activeIndex + 1].id); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ background: `${FLOW_NODES[activeIndex + 1].color}14`, color: FLOW_NODES[activeIndex + 1].color, border: `1px solid ${FLOW_NODES[activeIndex + 1].color}30` }}
              >
                Next: {FLOW_NODES[activeIndex + 1].label} →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* What you will learn */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {WHAT_YOU_LEARN.map((item) => (
          <div key={item.title} className="rounded-[20px] p-4" style={{ background: T.card, border: `1px solid ${item.color}20` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: item.color }}>
              {item.title}
            </p>
            <p className="text-xs leading-5" style={{ color: T.muted }}>
              {item.body}
            </p>
          </div>
        ))}
      </div>

      {/* Scope card */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[22px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.blue }}>
            What we are designing
          </p>
          <div className="space-y-2">
            {START_HERE_SCOPE.inScope.map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: T.blue }} />
                <p className="text-sm leading-6" style={{ color: T.muted }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[22px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.red }}>
            What we are not designing
          </p>
          <div className="space-y-2">
            {START_HERE_SCOPE.outOfScope.map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: T.red }} />
                <p className="text-sm leading-6" style={{ color: T.muted }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Single interview answer */}
      <div className="rounded-[22px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
            Say this in interview
          </p>
          <CopyButton value={INTERVIEW_ANSWER} label="Copy answer" />
        </div>
        <p className="text-sm leading-7" style={{ color: T.muted }}>
          {INTERVIEW_ANSWER}
        </p>
      </div>

      {/* Next CTA */}
      <div className="flex gap-3 flex-wrap items-center">
        <button
          onClick={() => onNavigate("requirements")}
          className="px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5"
          style={{ background: T.red, color: "#fff", border: `1px solid ${T.red}` }}
        >
          Next: Requirements →
        </button>
        <Link
          href="/system-design/netflix/start-here"
          className="px-5 py-3 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: "transparent", color: T.faint, border: `1px solid ${T.border}` }}
        >
          View Backend Track
        </Link>
      </div>
    </div>
  );
}

const REQ_SUMMARY = "Functional: Netflix data platform must ingest 500K events/sec, provide trending metrics in <1 min, QoE signals in <15 min, content performance in <1 hour, and official watch-hour counts by 06:00 UTC daily. Non-functional: 99.99% delivery guarantee via Kafka acks + idempotent sinks; correctness enforced through schema registry, DQ gates, and SLA alerts; replay capability via immutable Bronze layer; all PII events tagged at gateway; lineage tracked end-to-end for audits.";

function RequirementsTab({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
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
                Click a requirement on the left to highlight its flow.
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

      {/* Visual freshness timeline */}
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.amber }}>
          Freshness SLA timeline — where each metric sits
        </p>
        <div className="relative">
          {/* Timeline track */}
          <div className="flex items-center gap-0 mb-6">
            {[
              { label: "< 1 min", color: T.red },
              { label: "1–15 min", color: T.orange },
              { label: "Hourly", color: T.amber },
              { label: "Daily", color: T.green },
            ].map((tier, i, arr) => (
              <div key={tier.label} className="flex items-center flex-1">
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full h-2 rounded-full" style={{ background: `${tier.color}30` }} />
                  <span className="text-[10px] font-bold mt-1.5" style={{ color: tier.color }}>{tier.label}</span>
                </div>
                {i < arr.length - 1 && <div className="w-4 h-0.5 shrink-0" style={{ background: T.border }} />}
              </div>
            ))}
          </div>
          {/* Metrics placed on timeline */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-2">
              {["QoE alerts", "Fraud / anomaly detection", "Playback error spikes"].map((m) => (
                <div key={m} className="rounded-xl px-3 py-2 text-xs" style={{ background: `${T.red}10`, color: T.muted, border: `1px solid ${T.red}22` }}>{m}</div>
              ))}
            </div>
            <div className="space-y-2">
              {["Active sessions", "Trending titles", "Regional playback health"].map((m) => (
                <div key={m} className="rounded-xl px-3 py-2 text-xs" style={{ background: `${T.orange}10`, color: T.muted, border: `1px solid ${T.orange}22` }}>{m}</div>
              ))}
            </div>
            <div className="space-y-2">
              {["Recommendation feedback", "Content engagement", "Experiment exposure"].map((m) => (
                <div key={m} className="rounded-xl px-3 py-2 text-xs" style={{ background: `${T.amber}10`, color: T.muted, border: `1px solid ${T.amber}22` }}>{m}</div>
              ))}
            </div>
            <div className="space-y-2">
              {["Watch hours (official)", "Billing reconciliation", "Executive reporting", "ML training datasets"].map((m) => (
                <div key={m} className="rounded-xl px-3 py-2 text-xs" style={{ background: `${T.green}10`, color: T.muted, border: `1px solid ${T.green}22` }}>{m}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Clarifying questions + NFRs side by side */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.blue }}>
            Ask these clarifying questions first
          </p>
          <div className="space-y-2.5">
            {[
              "Are we designing for real-time dashboards, ML features, or both?",
              "What is the expected freshness for the most latency-sensitive consumer?",
              "Do we need to support replay and correction of historical data?",
              "Is there a compliance or data-retention policy I should design around?",
              "What is the primary consumer — BI analysts, on-call engineers, or ML models?",
              "Should I design for one region or multi-region with data sovereignty constraints?",
            ].map((q, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5" style={{ background: `${T.blue}18`, color: T.blue }}>
                  {i + 1}
                </span>
                <p className="text-xs leading-5" style={{ color: T.muted }}>{q}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.red }}>
              DE non-functional requirements
            </p>
            <div className="space-y-2">
              {NFRS.map((item) => (
                <div key={item} className="rounded-xl p-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <p className="text-xs leading-5" style={{ color: T.muted }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Common mistake */}
          <div className="rounded-[20px] p-4" style={{ background: `${T.red}0a`, border: `1px solid ${T.red}28` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: T.red }}>
              Common interview mistake
            </p>
            <p className="text-xs leading-5" style={{ color: T.muted }}>
              Jumping to tools (Kafka, Flink, Iceberg) before stating freshness requirements and business consumers. Interviewers want to see that you know <em>why</em> you need near-real-time before you name a streaming engine.
            </p>
          </div>
          {/* What to skip */}
          <div className="rounded-[20px] p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: T.faint }}>
              What to skip in a 45-min interview
            </p>
            <p className="text-xs leading-5" style={{ color: T.faint }}>
              Skip compliance details, multi-region specifics, and advanced governance unless the interviewer asks. Cover freshness, correctness, replay, and one failure mode per layer instead.
            </p>
          </div>
        </div>
      </div>

      {/* Copy summary + Next tab CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
        <CopyButton value={REQ_SUMMARY} label="Copy requirement summary" />
        <button
          onClick={() => onNavigate("architecture")}
          className="px-5 py-3 rounded-2xl text-sm font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: T.blue, color: "#fff", boxShadow: `0 8px 24px ${T.blue}33` }}
        >
          Next: Architecture →
        </button>
      </div>
    </div>
  );
}

function ScaleEstimationTab({ depthMode }: { depthMode: DepthMode }) {
  const [dauMillions, setDauMillions] = useState(SCALE_DEFAULTS.dauMillions);
  const [watchHoursPerUser, setWatchHoursPerUser] = useState(SCALE_DEFAULTS.watchHoursPerUser);
  const [heartbeatSeconds, setHeartbeatSeconds] = useState(SCALE_DEFAULTS.heartbeatSeconds);
  const [compressedEventKb, setCompressedEventKb] = useState(SCALE_DEFAULTS.compressedEventKb);
  const [peakMultiplier, setPeakMultiplier] = useState(SCALE_DEFAULTS.peakMultiplier);
  const [safeEventsPerPartition, setSafeEventsPerPartition] = useState(SCALE_DEFAULTS.safeEventsPerPartition);
  const [headroomPercent, setHeadroomPercent] = useState(SCALE_DEFAULTS.headroomPercent);
  const [showInterviewExplanation, setShowInterviewExplanation] = useState(false);

  const calculations = useMemo(() => {
    const watchSecondsPerDay = watchHoursPerUser * 3600;
    const heartbeatsPerUser = watchSecondsPerDay / heartbeatSeconds;
    const heartbeatEvents = dauMillions * 1_000_000 * heartbeatsPerUser;
    const totalDailyEvents = heartbeatEvents * (1 + SCALE_DEFAULTS.additionalDailyEventsBillions);
    const rawTb = (totalDailyEvents * compressedEventKb) / 1_000_000_000;
    const avgEventsPerSecond = totalDailyEvents / 86400;
    const peakEventsPerSecond = avgEventsPerSecond * peakMultiplier;
    const partitions = Math.ceil((peakEventsPerSecond / safeEventsPerPartition) * (1 + headroomPercent / 100));
    const bronzeHotPb = (rawTb * SCALE_DEFAULTS.bronzeHotDays) / 1000;
    const silverPb = ((rawTb * 0.5) * SCALE_DEFAULTS.silverRetentionDays) / 1000;
    return {
      watchSecondsPerDay,
      heartbeatsPerUser,
      heartbeatEvents,
      rawTb,
      avgEventsPerSecond,
      peakEventsPerSecond,
      partitions,
      bronzeHotPb,
      silverPb,
    };
  }, [compressedEventKb, dauMillions, headroomPercent, heartbeatSeconds, peakMultiplier, safeEventsPerPartition, watchHoursPerUser]);

  const interviewExplanation =
    "I won’t randomly say Kafka needs 300 partitions. I’ll derive it from DAU, heartbeat frequency, event size, peak multiplier, and safe throughput per partition.";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
                Interactive scale calculator
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                Turn interview assumptions into throughput, storage, and partition math.
              </p>
            </div>
            <button onClick={() => setShowInterviewExplanation((v) => !v)} className="text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
              Show Interview Explanation
            </button>
          </div>
          <div className="space-y-4">
            <RangeField label="DAU (millions)" value={dauMillions} min={20} max={150} step={5} suffix="M" onChange={setDauMillions} />
            <RangeField label="Watch time / user / day" value={watchHoursPerUser} min={1} max={4} step={0.5} suffix="h" onChange={setWatchHoursPerUser} />
            <SelectField label="Heartbeat frequency" value={heartbeatSeconds} options={[10, 15, 30, 60]} suffix="sec" onChange={setHeartbeatSeconds} />
            <RangeField label="Compressed event size" value={compressedEventKb} min={0.5} max={2} step={0.1} suffix="KB" onChange={setCompressedEventKb} />
            <RangeField label="Peak multiplier" value={peakMultiplier} min={2} max={8} step={1} suffix="x" onChange={setPeakMultiplier} />
            <RangeField label="Safe events/sec/partition" value={safeEventsPerPartition} min={5000} max={20000} step={1000} suffix="" onChange={setSafeEventsPerPartition} />
            <RangeField label="Headroom" value={headroomPercent} min={10} max={60} step={5} suffix="%" onChange={setHeadroomPercent} />
          </div>
          {showInterviewExplanation ? (
            <div className="mt-5 rounded-2xl p-4" style={{ background: `${T.blue}0f`, border: `1px solid ${T.blue}24` }}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-sm font-semibold" style={{ color: T.text }}>
                  How to say it in the interview
                </p>
                <CopyButton value={interviewExplanation} />
              </div>
              <p className="text-sm leading-7" style={{ color: T.muted }}>
                {interviewExplanation}
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            { label: "Heartbeats / user / day", value: formatNumber(calculations.heartbeatsPerUser, 0), note: "watch_seconds_per_day / heartbeat_interval", color: T.blue },
            { label: "Heartbeat events / day", value: `${formatBig(calculations.heartbeatEvents)}`, note: `${dauMillions}M users x ${formatNumber(calculations.heartbeatsPerUser, 0)}`, color: T.red },
            { label: "Raw TB / day", value: `${formatNumber(calculations.rawTb, 1)} TB`, note: "Only compressed events, before replication and long-term lifecycle", color: T.amber },
            { label: "Avg events / sec", value: formatBig(calculations.avgEventsPerSecond), note: "daily_events / 86,400", color: T.green },
            { label: "Peak events / sec", value: formatBig(calculations.peakEventsPerSecond), note: "avg events/sec x peak multiplier", color: T.violet },
            { label: "Kafka partitions", value: String(calculations.partitions), note: "ceil(peak / per_partition x headroom)", color: T.gold },
            { label: "Bronze hot storage", value: `${formatNumber(calculations.bronzeHotPb, 2)} PB`, note: "Assumes 90 hot days of raw history", color: T.blue },
            { label: "Silver retention", value: `${formatNumber(calculations.silverPb, 2)} PB`, note: "Assumes Silver compresses to 50% and retains 2 years", color: T.violet },
          ]
            .slice(0, depthMode === "beginner" ? 4 : 8)
            .map((item) => (
              <MetricCard key={item.label} label={item.label} value={item.value} note={item.note} color={item.color} />
            ))}
        </div>
      </div>

      {depthMode === "beginner" ? (
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
            Beginner read
          </p>
          <p className="text-sm mt-3 leading-7" style={{ color: T.muted }}>
            For a first-pass answer, it is enough to explain that DAU, heartbeat frequency, and peak multiplier drive throughput, and throughput drives partition count and storage.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <FormulaCard title="Heartbeats per user/day" formula="watch_seconds_per_day / heartbeat_interval_sec" example={`${formatNumber(calculations.watchSecondsPerDay, 0)} / ${heartbeatSeconds} = ${formatNumber(calculations.heartbeatsPerUser, 0)}`} />
          <FormulaCard title="Peak events/sec" formula="daily_events / 86,400 x peak_multiplier" example={`${formatBig(calculations.avgEventsPerSecond)} x ${peakMultiplier} = ${formatBig(calculations.peakEventsPerSecond)}`} />
          <FormulaCard title="Kafka partitions" formula="ceil(peak_events_per_sec / safe_events_per_partition x headroom)" example={`ceil(${formatBig(calculations.peakEventsPerSecond)} / ${safeEventsPerPartition} x ${1 + headroomPercent / 100}) = ${calculations.partitions}`} />
        </div>
      )}

      {depthMode === "staff" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            "Regional isolation keeps replays and large backfills from starving global live SLAs.",
            "Retention and small-file compaction are cost controls, not just storage hygiene.",
            "Capacity plans should reserve room for correction jobs, not only steady-state traffic.",
          ].map((item) => (
            <div key={item} className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
              <p className="text-sm leading-7" style={{ color: T.muted }}>
                {item}
              </p>
            </div>
          ))}
        </div>
      ) : null}
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

const ARCH_JOURNEY_STEPS: ArchitectureNodeId[] = ["clients", "event-gateway", "kafka", "flink", "bronze", "silver", "gold", "bi-ml"];
const ARCH_ANSWER = "My architecture is layered: client apps and backend services emit events into an event gateway that validates schemas and tags PII, then publishes to Kafka. From Kafka, real-time Flink jobs produce live dashboards and features while a parallel Bronze sink captures every raw event immutably in S3/Iceberg. Batch Spark and dbt jobs process Bronze to Silver to Gold daily, applying DQ gates before publishing official metrics. BI, ad-hoc SQL, OLAP, and feature stores each read from the appropriate layer. Governance, lineage, and replay are first-class concerns, not afterthoughts.";

function ArchitectureTab({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  const [reveals, setReveals] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<ArchitectureNodeId>(ARCHITECTURE_NODES[2]?.id ?? ARCHITECTURE_NODES[0].id);
  const [overlayMode, setOverlayMode] = useState<"base" | "replay" | "governance" | "cost">("base");
  const [drawerTab, setDrawerTab] = useState<"overview" | "input" | "output" | "failure" | "interview">("overview");
  const [journeyStep, setJourneyStep] = useState<number>(-1);
  const journeyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingJourney = journeyStep >= 0;

  const stopJourney = () => {
    if (journeyTimerRef.current) clearInterval(journeyTimerRef.current);
    journeyTimerRef.current = null;
    setJourneyStep(-1);
  };

  const playJourney = () => {
    stopJourney();
    setOverlayMode("base");
    setDrawerTab("overview");
    setSelectedNodeId(ARCH_JOURNEY_STEPS[0]);
    setJourneyStep(0);
    let step = 0;
    journeyTimerRef.current = setInterval(() => {
      step++;
      if (step >= ARCH_JOURNEY_STEPS.length) {
        stopJourney();
        return;
      }
      setSelectedNodeId(ARCH_JOURNEY_STEPS[step]);
      setJourneyStep(step);
    }, 1600);
  };

  useEffect(() => () => stopJourney(), []);

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

  const LAYER_LABELS = [
    { label: "Producers", color: T.blue },
    { label: "Ingestion", color: T.amber },
    { label: "Kafka backbone", color: T.amber },
    { label: "Processing", color: T.violet },
    { label: "Lakehouse", color: T.violet },
    { label: "Serving", color: T.gold },
    { label: "Governance", color: T.green },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
              Interactive architecture canvas
            </p>
            <p className="text-[12px] mt-1" style={{ color: T.faint }}>
              Click nodes to inspect. Use overlay buttons to trace replay, governance, and cost paths.
            </p>
          </div>
          {/* Journey playback controls */}
          <div className="flex flex-wrap gap-2 items-center">
            {isPlayingJourney ? (
              <>
                <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: `${T.blue}14`, color: T.blue, border: `1px solid ${T.blue}30` }}>
                  Step {journeyStep + 1} / {ARCH_JOURNEY_STEPS.length}
                </span>
                <button
                  onClick={stopJourney}
                  className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  style={{ background: `${T.red}18`, color: T.red, border: `1px solid ${T.red}33` }}
                >
                  ■ Stop
                </button>
              </>
            ) : (
              <button
                onClick={playJourney}
                className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: `${T.blue}16`, color: T.blue, border: `1px solid ${T.blue}33` }}
              >
                ▶ Play event journey
              </button>
            )}
            <CopyButton value={ARCH_ANSWER} label="Copy architecture answer" />
          </div>
        </div>

        {/* Overlay buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { label: "Base flow", mode: "base" as const, color: T.blue, action: () => { stopJourney(); setOverlayMode("base"); setSelectedNodeId("kafka"); } },
            { label: "Replay path", mode: "replay" as const, color: T.violet, action: () => { stopJourney(); setOverlayMode("replay"); setSelectedNodeId("replay"); } },
            { label: "Governance", mode: "governance" as const, color: T.green, action: () => { stopJourney(); setOverlayMode("governance"); setSelectedNodeId("governance"); } },
            { label: "Cost view", mode: "cost" as const, color: T.amber, action: () => { stopJourney(); setOverlayMode("cost"); setSelectedNodeId("bronze"); } },
          ].map((item) => {
            const active = overlayMode === item.mode;
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: active ? `${item.color}18` : T.card2, color: active ? item.color : T.text, border: `1px solid ${active ? `${item.color}33` : T.border}` }}
              >
                {item.label}
              </button>
            );
          })}
          <button
            onClick={() => { stopJourney(); setOverlayMode("base"); setDrawerTab("overview"); setSelectedNodeId("kafka"); }}
            className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: T.card2, color: T.muted, border: `1px solid ${T.border}` }}
          >
            Reset
          </button>
        </div>

        {/* Reveal toggles */}
        <div className="flex flex-wrap gap-2 mb-4">
          {ARCHITECTURE_REVEALS.map((item) => {
            const active = reveals.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setReveals((prev) => (prev.includes(item.id) ? prev.filter((entry) => entry !== item.id) : [...prev, item.id]))}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: active ? `${T.blue}18` : T.card2,
                  color: active ? T.blue : T.muted,
                  border: `1px solid ${active ? `${T.blue}33` : T.border}`,
                }}
              >
                + {item.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-[26px] p-5 relative overflow-hidden" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
          <div className="absolute inset-0 opacity-45" style={{ backgroundImage: "linear-gradient(color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="relative min-h-[420px]">
            {/* Layer labels */}
            <div className="hidden xl:flex absolute left-2 top-6 flex-col gap-2 z-10">
              {LAYER_LABELS.map((lane) => (
                <div key={lane.label} className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ background: `${lane.color}10`, color: lane.color, border: `1px solid ${lane.color}20`, whiteSpace: "nowrap" }}>
                  {lane.label}
                </div>
              ))}
            </div>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {visibleLinks.map((link) => {
                const from = visibleNodeMap.get(link.from as ArchitectureNodeId);
                const to = visibleNodeMap.get(link.to as ArchitectureNodeId);
                if (!from || !to) return null;
                const highlighted = highlightedLinks.includes(link);
                const isJourneyActive = isPlayingJourney && ARCH_JOURNEY_STEPS.slice(0, journeyStep + 1).includes(link.from as ArchitectureNodeId) && ARCH_JOURNEY_STEPS.slice(0, journeyStep + 1).includes(link.to as ArchitectureNodeId);
                return (
                  <g key={`${link.from}-${link.to}`}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={isJourneyActive ? from.color : highlighted ? from.color : "rgba(148,163,184,0.30)"}
                      strokeWidth={isJourneyActive ? 2.2 : highlighted ? 1.8 : 0.8}
                      strokeDasharray={overlayMode === "replay" && link.groups.includes("replay") ? "3 2" : undefined}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={(from.x + to.x) / 2}
                      cy={(from.y + to.y) / 2}
                      r={isJourneyActive || highlighted ? 0.9 : 0}
                      fill={isJourneyActive ? from.color : highlighted ? from.color : "transparent"}
                    />
                  </g>
                );
              })}
            </svg>
            {visibleNodes.map((node, index) => {
              const isJourneyNode = isPlayingJourney && ARCH_JOURNEY_STEPS.slice(0, journeyStep + 1).includes(node.id as ArchitectureNodeId);
              const isCurrentJourneyNode = isPlayingJourney && ARCH_JOURNEY_STEPS[journeyStep] === node.id;
              return (
                <button
                  key={node.id}
                  onClick={() => {
                    stopJourney();
                    setSelectedNodeId(node.id);
                    setDrawerTab("overview");
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[20px] px-4 py-3 text-left min-w-[160px] max-w-[200px] cursor-pointer transition-all duration-300"
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    background: isCurrentJourneyNode ? `${node.color}22` : selectedNode?.id === node.id ? `${node.color}16` : T.card,
                    border: `1px solid ${isCurrentJourneyNode ? `${node.color}55` : selectedNode?.id === node.id ? `${node.color}35` : T.border}`,
                    boxShadow: isCurrentJourneyNode
                      ? `0 0 0 3px ${node.color}35, 0 20px 32px ${node.color}28`
                      : selectedNode?.id === node.id
                      ? `0 0 0 2px ${node.color}26, 0 18px 28px ${node.color}22`
                      : "none",
                    opacity: isPlayingJourney && !isJourneyNode && !isCurrentJourneyNode ? 0.45 : 1,
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: node.color }}>
                    {index < 2 ? "Producers" : index < 4 ? "Backbone" : index < 7 ? "Processing" : "Serving"}
                  </p>
                  <p className="text-sm font-bold mt-1 leading-5" style={{ color: T.text }}>
                    {node.label}
                  </p>
                  <p className="text-[11px] mt-1.5" style={{ color: isCurrentJourneyNode ? node.color : T.faint }}>
                    {isCurrentJourneyNode ? "▶ Active in journey" : selectedNode?.id === node.id ? "Selected" : "Click to inspect"}
                  </p>
                </button>
              );
            })}
            {highlightedLinks.slice(0, 4).map((link, index) => {
              const from = visibleNodeMap.get(link.from as ArchitectureNodeId);
              const to = visibleNodeMap.get(link.to as ArchitectureNodeId);
              if (!from || !to) return null;
              return <AnimatedDot key={`${link.from}-${link.to}`} left={from.x} top={from.y} endLeft={to.x} endTop={to.y} delay={index * 0.8} color={from.color} />;
            })}
          </div>
        </div>
      </div>

      {/* Node detail drawer */}
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${selectedNode?.color ?? T.blue}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: selectedNode?.color ?? T.blue }}>
                Node detail drawer
              </p>
              <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
                {selectedNode?.label}
              </h3>
            </div>
            <button onClick={() => onNavigate(normalizeDataEngineeringTab(selectedNode.deepDive) ?? "architecture")} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
              Deep dive →
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { id: "overview", label: "Overview" },
              { id: "input", label: "Inputs" },
              { id: "output", label: "Outputs" },
              { id: "failure", label: "Failures" },
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
              <DetailBlock title="Inputs" accent={selectedNode.color} className="md:col-span-2">{selectedNode.input}</DetailBlock>
            ) : null}
            {drawerTab === "output" ? (
              <DetailBlock title="Outputs" accent={selectedNode.color} className="md:col-span-2">{selectedNode.output}</DetailBlock>
            ) : null}
            {drawerTab === "failure" ? (
              <DetailBlock title="Failure modes" accent={selectedNode.color} className="md:col-span-2">{selectedNode.failure}</DetailBlock>
            ) : null}
            {drawerTab === "interview" ? (
              <div className="md:col-span-2 space-y-3">
                <DetailBlock title="Say this in interview" accent={selectedNode.color}>{selectedNode.interview}</DetailBlock>
                <CopyButton value={selectedNode.interview} label="Copy interview line" />
              </div>
            ) : null}
          </div>
        </div>

        {/* Quick node jumps */}
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
              Quick jumps
            </p>
            <span className="text-[11px]" style={{ color: T.faint }}>
              Click to select a node
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {visibleNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => {
                  stopJourney();
                  setSelectedNodeId(node.id);
                  setDrawerTab("overview");
                }}
                className="rounded-2xl p-4 text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: selectedNode.id === node.id ? `${node.color}12` : T.card2, border: `1px solid ${selectedNode.id === node.id ? `${node.color}33` : T.border}` }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: node.color }} />
                  <p className="text-sm font-semibold" style={{ color: T.text }}>
                    {node.label}
                  </p>
                </div>
                <p className="text-[11px] leading-5" style={{ color: T.faint }}>
                  {node.what.slice(0, 60)}{node.what.length > 60 ? "…" : ""}
                </p>
              </button>
            ))}
          </div>
          {/* Architecture legend */}
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.faint }}>Legend</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Streaming", color: T.blue },
                { label: "Batch", color: T.violet },
                { label: "Storage", color: T.green },
                { label: "Serving", color: T.gold },
                { label: "Governance", color: T.amber },
              ].map((item) => (
                <span key={item.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-semibold" style={{ background: `${item.color}12`, color: item.color, border: `1px solid ${item.color}24` }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
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

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="grid gap-3 md:grid-cols-2">
        {FLINK_JOBS.map((job) => {
          const active = selectedJob.id === job.id;
          return (
            <button
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              className="rounded-[22px] p-4 text-left cursor-pointer"
              style={{ background: active ? `${job.color}12` : T.card, border: `1px solid ${active ? `${job.color}33` : T.border}` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: job.color }}>
                Flink job
              </p>
              <h3 className="text-sm font-bold mt-2" style={{ color: T.text }}>
                {job.title}
              </h3>
              <p className="text-[12px] mt-2" style={{ color: T.faint }}>
                {job.output}
              </p>
            </button>
          );
        })}
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${selectedJob.color}24` }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: selectedJob.color }}>
              Streaming job detail
            </p>
            <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
              {selectedJob.title}
            </h3>
          </div>
          <Pill color={selectedJob.color}>{selectedJob.sla}</Pill>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InfoTile label="Input topics" value={selectedJob.inputTopics.join(", ")} />
          <InfoTile label="KeyBy" value={selectedJob.keyBy} />
          <InfoTile label="State" value={selectedJob.state} />
          <InfoTile label="Window" value={selectedJob.window} />
          <InfoTile label="Watermark" value={selectedJob.watermark} />
          <InfoTile label="Output" value={selectedJob.output} />
        </div>
        <DetailBlock title="Failure behavior" accent={T.red} className="mt-4">
          {selectedJob.failure}
        </DetailBlock>
        <div className="mt-4 rounded-2xl p-4 relative overflow-hidden" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: selectedJob.color }}>
            Event animation
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {selectedJob.flow.map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <span className="px-3 py-2 rounded-full text-xs font-semibold relative" style={{ background: `${selectedJob.color}14`, color: T.text, border: `1px solid ${selectedJob.color}24` }}>
                  {step}
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full flow-pulse" style={{ background: selectedJob.color, animationDelay: `${index * 0.4}s` }} />
                </span>
                {index < selectedJob.flow.length - 1 ? <span style={{ color: selectedJob.color }}>→</span> : null}
              </div>
            ))}
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
            <CopyButton
              value="For watch time, I will use heartbeat events as source of truth, not just play and pause events. Every valid heartbeat contributes heartbeat_interval_sec to watch_seconds. I will separately calculate total watch time, buffering time, session duration, and unique content coverage."
              label="Copy answer"
            />
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {WATCH_TIME_RULES.map((rule) => (
          <div key={rule} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-sm leading-7" style={{ color: T.muted }}>
              {rule}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionizationTab() {
  const [scenarioId, setScenarioId] = useState<SessionScenarioId>(SESSIONIZATION_SCENARIOS[0].id);
  const scenario = SESSIONIZATION_SCENARIOS.find((item) => item.id === scenarioId) ?? SESSIONIZATION_SCENARIOS[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-3">
        {SESSIONIZATION_SCENARIOS.map((item) => (
          <button
            key={item.id}
            onClick={() => setScenarioId(item.id)}
            className="w-full text-left rounded-[22px] p-5 cursor-pointer"
            style={{ background: scenario.id === item.id ? `${T.blue}12` : T.card, border: `1px solid ${scenario.id === item.id ? `${T.blue}33` : T.border}` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
              Scenario
            </p>
            <h3 className="text-sm font-bold mt-2" style={{ color: T.text }}>
              {item.title}
            </h3>
            <p className="text-[12px] mt-2" style={{ color: T.faint }}>
              {item.summary}
            </p>
          </button>
        ))}
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
          Session output
        </p>
        <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
          {scenario.title}
        </h3>
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
        <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr] mt-4">
          <div className="rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
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
          <div className="rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.red }}>
              Long pause logic
            </p>
            <FlowMapper
              accent={T.red}
              steps={[
                "30 min inactivity timeout → close active session",
                "4 hour pause continuation → still same logical journey possible",
                "24 hour journey threshold → link related sessions into one viewing journey",
              ]}
            />
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
            <CopyButton value={LATE_EVENT_POLICY.interviewAnswer} label="Copy answer" />
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

  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="space-y-3">
        {LAKEHOUSE_LAYERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setLayerId(item.id)}
            className="w-full text-left rounded-[24px] p-5 cursor-pointer"
            style={{ background: item.id === layer.id ? `${item.color}10` : T.card, border: `1px solid ${item.id === layer.id ? `${item.color}35` : T.border}` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.color }}>
              {item.title}
            </p>
            <h3 className="text-lg font-bold mt-2" style={{ color: T.text }}>
              {item.summary}
            </h3>
          </button>
        ))}
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${layer.color}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: layer.color }}>
          Medallion layer explorer
        </p>
        <h3 className="text-2xl font-bold mt-2 mb-4" style={{ color: T.text }}>
          {layer.title}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
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
          {TABLE_SCHEMAS.map((item) => (
            <button key={item.name} onClick={() => setTableName(item.name)} className="w-full text-left rounded-xl p-3 cursor-pointer" style={{ background: item.name === table.name ? `${T.violet}12` : T.card2, border: `1px solid ${item.name === table.name ? `${T.violet}33` : T.border}` }}>
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
          {table.columns.map((item) => (
            <button key={item.name} onClick={() => setColumnName(item.name)} className="w-full text-left rounded-xl p-3 cursor-pointer" style={{ background: item.name === column.name ? `${T.blue}12` : T.card2, border: `1px solid ${item.name === column.name ? `${T.blue}33` : T.border}` }}>
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

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.gold }}>
          Airflow / Maestro style workflow
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {BATCH_DAG_STEPS.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <button onClick={() => setStepId(item.id)} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: step.id === item.id ? `${T.gold}16` : T.card2, color: T.text, border: `1px solid ${step.id === item.id ? `${T.gold}33` : T.border}` }}>
                {item.label}
              </button>
              {index < BATCH_DAG_STEPS.length - 1 ? <span style={{ color: T.gold }}>↓</span> : null}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
          Selected DAG node
        </p>
        <h3 className="text-2xl font-bold mt-2 mb-4" style={{ color: T.text }}>
          {step.label}
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <DetailBlock title="Inputs" accent={T.gold}>{step.input}</DetailBlock>
          <DetailBlock title="Logic" accent={T.gold}>{step.logic}</DetailBlock>
          <DetailBlock title="Output" accent={T.gold}>{step.output}</DetailBlock>
        </div>
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

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-3">
        {RELIABILITY_INCIDENTS.map((item) => (
          <button key={item.id} onClick={() => setIncidentId(item.id)} className="w-full text-left rounded-[22px] p-5 cursor-pointer" style={{ background: incident.id === item.id ? `${T.red}12` : T.card, border: `1px solid ${incident.id === item.id ? `${T.red}33` : T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
              Incident
            </p>
            <h3 className="text-sm font-bold mt-2" style={{ color: T.text }}>
              {item.title}
            </h3>
          </button>
        ))}
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
          Incident simulator
        </p>
        <h3 className="text-2xl font-bold mt-2 mb-4" style={{ color: T.text }}>
          {incident.title}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <DetailBlock title="Detection" accent={T.red}>{incident.detection}</DetailBlock>
          <DetailBlock title="Impact" accent={T.red}>{incident.impact}</DetailBlock>
          <DetailBlock title="Mitigation" accent={T.amber}>{incident.mitigation}</DetailBlock>
          <DetailBlock title="Recovery" accent={T.green}>{incident.recovery}</DetailBlock>
          <DetailBlock title="Prevention" accent={T.blue}>{incident.prevention}</DetailBlock>
          <DetailBlock title="Interview answer" accent={T.violet}>{incident.interview}</DetailBlock>
        </div>
      </div>
    </div>
  );
}

function TradeoffsTab() {
  const [decision, setDecision] = useState<TradeoffDecision>(TRADEOFFS[0].decision);
  const item = TRADEOFFS.find((entry) => entry.decision === decision) ?? TRADEOFFS[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-3">
        {TRADEOFFS.map((entry) => (
          <button key={entry.decision} onClick={() => setDecision(entry.decision)} className="rounded-[22px] p-4 text-left cursor-pointer" style={{ background: item.decision === entry.decision ? `${T.amber}12` : T.card, border: `1px solid ${item.decision === entry.decision ? `${T.amber}33` : T.border}` }}>
            <p className="text-sm font-bold" style={{ color: T.text }}>
              {entry.decision}
            </p>
            <p className="text-[12px] mt-1" style={{ color: T.faint }}>
              {entry.recommendation}
            </p>
          </button>
        ))}
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
          Trade-off matrix
        </p>
        <h3 className="text-2xl font-bold mt-2 mb-4" style={{ color: T.text }}>
          {item.decision}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <DetailBlock title="Option A" accent={T.blue}>{item.optionA}</DetailBlock>
          <DetailBlock title="Option B" accent={T.violet}>{item.optionB}</DetailBlock>
          <DetailBlock title="Recommendation" accent={T.green} className="md:col-span-2">{item.recommendation}</DetailBlock>
          <DetailBlock title="Why" accent={T.amber}>{item.why}</DetailBlock>
          <DetailBlock title="When to change" accent={T.red}>{item.whenToChange}</DetailBlock>
        </div>
        <div className="mt-4 rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.amber }}>
            Required trade-offs
          </p>
          <div className="space-y-2">
            {item.tradeoffs.map((tradeoff) => (
              <p key={tradeoff} className="text-sm" style={{ color: T.muted }}>
                {tradeoff}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InterviewQATab({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<InterviewQuestionId>(INTERVIEW_QUESTIONS[0].id);
  const tags = Array.from(new Set(INTERVIEW_QUESTIONS.map((item) => item.tag)));
  const filtered = activeTag ? INTERVIEW_QUESTIONS.filter((item) => item.tag === activeTag) : INTERVIEW_QUESTIONS;
  const question = filtered.find((item) => item.id === questionId) ?? filtered[0] ?? INTERVIEW_QUESTIONS[0];

  useEffect(() => {
    if (!filtered.find((item) => item.id === questionId)) {
      setQuestionId(filtered[0]?.id ?? INTERVIEW_QUESTIONS[0].id);
    }
  }, [filtered, questionId]);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setActiveTag(null)} className="px-3 py-2 rounded-full text-xs font-semibold cursor-pointer" style={{ background: activeTag === null ? `${T.blue}18` : T.card2, color: activeTag === null ? T.blue : T.text, border: `1px solid ${activeTag === null ? `${T.blue}33` : T.border}` }}>
            All
          </button>
          {tags.map((tag) => (
            <button key={tag} onClick={() => setActiveTag(tag)} className="px-3 py-2 rounded-full text-xs font-semibold cursor-pointer" style={{ background: activeTag === tag ? `${T.blue}18` : T.card2, color: activeTag === tag ? T.blue : T.text, border: `1px solid ${activeTag === tag ? `${T.blue}33` : T.border}` }}>
              {tag}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {filtered.map((item) => (
            <button key={item.id} onClick={() => setQuestionId(item.id)} className="w-full text-left rounded-2xl p-4 cursor-pointer" style={{ background: item.id === question.id ? `${T.blue}12` : T.card2, border: `1px solid ${item.id === question.id ? `${T.blue}33` : T.border}` }}>
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
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
              Question bank
            </p>
            <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
              {question.question}
            </h3>
          </div>
          <div className="flex gap-2">
            <CopyButton value={question.strongAnswer} label="Copy answer" />
            <button onClick={() => onNavigate(normalizeDataEngineeringTab(question.linkedTab) ?? "architecture")} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
              Open diagram link
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <DetailBlock title="Strong answer" accent={T.green}>{question.strongAnswer}</DetailBlock>
          <DetailBlock title="Common follow-up" accent={T.amber}>{question.followUp}</DetailBlock>
          <DetailBlock title="Bad answer to avoid" accent={T.red} className="md:col-span-2">{question.badAnswer}</DetailBlock>
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
  onNavigate,
}: {
  onNavigate: (tab: DataEngineeringTabSlug) => void;
}) {
  return (
    <div className="space-y-8">
      <AnchoredSection id="start-overview" eyebrow="Data platform journey" title="Design the data platform, not the playback backend" subtitle="Understand the full Netflix data-platform journey from events to Kafka, lakehouse, analytics, ML features, and backfill." accent={T.red}>
        <StartHereTab onNavigate={onNavigate} />
      </AnchoredSection>
      <AnchoredSection id="start-journey" eyebrow="Interview journey map" title="The 14-chapter interview answer path" subtitle="Each chapter below is a tab. Work through them in order for a complete system design answer." accent={T.violet}>
        <DesktopJourneyCanvas onNavigate={onNavigate} />
      </AnchoredSection>
    </div>
  );
}

const BUSINESS_METRIC_CARDS = [
  {
    metric: "Watch Hours",
    definition: "Total valid watch duration by content, region, device, and day.",
    freshness: "Daily Gold + near-real-time approximation",
    sources: "heartbeat, play, pause, stop events",
    outputTable: "gold_content_watch_hours_daily",
    color: "#38bdf8",
  },
  {
    metric: "Content Performance",
    definition: "Impressions, clicks, starts, completions, binge rate, and CTR per title.",
    freshness: "Hourly Gold",
    sources: "browse.impression, browse.click, playback.play, playback.complete",
    outputTable: "gold_content_performance_hourly",
    color: "#22c55e",
  },
  {
    metric: "Trending Titles",
    definition: "Real-time ranking of titles by view velocity, impressions, and session starts.",
    freshness: "5–15 minutes",
    sources: "browse.impression, playback.play",
    outputTable: "pinot.trending_titles_live",
    color: "#f59e0b",
  },
  {
    metric: "QoE Metrics",
    definition: "Buffering ratio, startup time, bitrate drops, and playback error rate by ISP and device.",
    freshness: "Seconds to 5 minutes",
    sources: "video.buffer, video.error, video.bitrate",
    outputTable: "pinot.qoe_live / gold_qoe_device_region_hourly",
    color: "#a855f7",
  },
  {
    metric: "Recommendation Feedback",
    definition: "Click-through rate and conversion from recommendation impression to play to completion.",
    freshness: "Hourly",
    sources: "recommendation.served, browse.click, playback.play, playback.complete",
    outputTable: "gold_reco_funnel_daily",
    color: "#f97316",
  },
  {
    metric: "Experiment Metrics",
    definition: "Assignment exposure, variant attribution, and primary/guardrail metric values per experiment.",
    freshness: "Daily",
    sources: "experiment.assigned, experiment.exposed + all tagged events",
    outputTable: "gold_experiment_metrics_daily",
    color: "#e50914",
  },
] as const;

function BusinessMetricCard({ metric, definition, freshness, sources, outputTable, color }: typeof BUSINESS_METRIC_CARDS[number]) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-[20px] overflow-hidden cursor-pointer"
      style={{ background: T.card, border: `1px solid ${open ? color + "40" : T.border}` }}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
          <p className="text-sm font-semibold" style={{ color: T.text }}>{metric}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}14`, color: color, border: `1px solid ${color}24` }}>
            {freshness}
          </span>
          <span style={{ color: T.faint }}>{open ? "−" : "+"}</span>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-2.5">
          <p className="text-sm leading-6" style={{ color: T.muted }}>{definition}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-2.5" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
              <p className="text-[9px] uppercase tracking-[0.14em] mb-1" style={{ color: T.faint }}>Source events</p>
              <p className="text-[11px]" style={{ color: T.muted }}>{sources}</p>
            </div>
            <div className="rounded-xl p-2.5" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
              <p className="text-[9px] uppercase tracking-[0.14em] mb-1" style={{ color: T.faint }}>Output table</p>
              <p className="text-[11px] font-mono" style={{ color: color }}>{outputTable}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RequirementsTrackTab({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  return (
    <div className="space-y-8">
      <AnchoredSection id="req-scope" eyebrow="What to clarify first" title="Map business questions to data outputs" subtitle="Clarify what the data platform must produce, how fresh it must be, and which trade-offs matter." accent={T.amber}>
        <CompactProTip
          title="Scope Netflix as a data platform."
          body="Design events → ingestion → processing → lakehouse → serving. Skip playback APIs, CDN routing, and DRM internals unless the interviewer explicitly asks."
          accent={T.amber}
          actions={
            <>
              <CopyButton value={TAB_INTERVIEW_LINES.requirements} label="Copy opening script" />
            </>
          }
        />
        {/* 6 business metric cards */}
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.amber }}>
            6 business metrics that drive the entire platform design
          </p>
          <div className="space-y-2">
            {BUSINESS_METRIC_CARDS.map((card) => (
              <BusinessMetricCard key={card.metric} {...card} />
            ))}
          </div>
        </div>
      </AnchoredSection>
      <AnchoredSection id="req-scale" eyebrow="Scale anchors" title="Anchor the discussion with scale numbers" subtitle="Each number should connect to a design decision — Kafka partitions, streaming parallelism, or storage layout." accent={T.blue}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DATA_TRACK_NUMBERS.map((item) => (
            <MetricCard key={item.label} label={item.label} value={item.value} note={item.note} color={item.color} />
          ))}
        </div>
      </AnchoredSection>
      <AnchoredSection id="req-domains" eyebrow="Requirement domains" title="Group requirements by domain, not by table type" subtitle="Playback, QoE, recommendations, experiments, and governance map directly to the data pipelines you will design." accent={T.amber}>
        <RequirementsTab onNavigate={onNavigate} />
      </AnchoredSection>
      <AnchoredSection id="req-nfr" eyebrow="SLA matrix" title="Freshness and non-functional requirements" subtitle="DE interviews care about freshness, correctness, replay, and quality SLAs just as much as raw throughput." accent={T.red}>
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.amber }}>
              Freshness ladder
            </p>
            <div className="space-y-3">
              {LATENCY_SLA_ROWS.map(([label, value]) => (
                <div key={label} className="rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <p className="text-sm font-medium" style={{ color: T.text }}>{label}</p>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: `${T.amber}12`, color: T.amber, border: `1px solid ${T.amber}24` }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.red }}>
              DE non-functional requirements
            </p>
            <div className="space-y-3">
              {NFRS.map((item) => (
                <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <p className="text-sm leading-7" style={{ color: T.muted }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnchoredSection>
      <AnchoredSection id="req-say" eyebrow="Say this" title="Requirements framing in interview language" subtitle="Open requirements with domain, consumer, freshness, and correctness — not a feature list." accent={T.red}>
        <InterviewAnswerStrip tab="requirements" accent={T.red} />
      </AnchoredSection>
    </div>
  );
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

function ArchitectureTrackTab({
  onNavigate,
}: {
  onNavigate: (tab: DataEngineeringTabSlug) => void;
}) {
  return (
    <div className="space-y-8">
      <AnchoredSection id="arch-layered" eyebrow="Architecture canvas" title="Interactive layered architecture" subtitle="Click any node to see its inputs, outputs, failure modes, and interview framing. Highlight paths with the overlay buttons." accent={T.blue}>
        <ArchitectureTab onNavigate={onNavigate} />
      </AnchoredSection>
      <AnchoredSection id="arch-journey" eyebrow="Event journey" title="Emit → validate → publish → stream → store → aggregate → serve" subtitle="Walk through this sequence aloud before naming specific tools." accent={T.violet}>
        <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${T.violet}24` }}>
          <div className="flex flex-wrap items-center gap-2">
            {["Emit", "Validate", "Publish", "Stream", "Store Bronze", "Clean Silver", "Aggregate Gold", "Serve"].map((step, index, array) => (
              <div key={step} className="flex items-center gap-2">
                <span className="px-3 py-2 rounded-full text-xs font-semibold" style={{ background: `${T.violet}12`, color: T.text, border: `1px solid ${T.violet}24` }}>{step}</span>
                {index < array.length - 1 ? <span style={{ color: T.violet }}>→</span> : null}
              </div>
            ))}
          </div>
        </div>
      </AnchoredSection>
      <AnchoredSection id="arch-decisions" eyebrow="Decision cards" title="Defend the major architectural choices" subtitle="Know why each design decision was made — interviewers probe these directly." accent={T.amber}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {TRADEOFFS.slice(0, 6).map((item) => (
            <div key={item.decision} className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>Decision</p>
              <p className="text-lg font-bold mt-2" style={{ color: T.text }}>{item.decision}</p>
              <p className="text-sm mt-3 leading-7" style={{ color: T.muted }}>{item.recommendation}</p>
            </div>
          ))}
        </div>
      </AnchoredSection>
      <AnchoredSection id="arch-say" eyebrow="Say this" title="Narrate the architecture in one flow" subtitle="Cover layers in order: producers, ingestion, Kafka, processing, lakehouse, serving, governance." accent={T.red}>
        <InterviewAnswerStrip tab="architecture" accent={T.red} />
      </AnchoredSection>
    </div>
  );
}

function IngestionKafkaTrackTab({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  const fanoutTargets: Array<{ label: string; target: DataEngineeringTabSlug; note: string }> = [
    { label: "video.heartbeat.events", target: "event-sources", note: "Source taxonomy and contract" },
    { label: "raw sink", target: "storage-lakehouse", note: "Bronze ingestion path" },
    { label: "sessionizer", target: "real-time-streaming", note: "Streaming state and watch sessions" },
    { label: "qoe monitor", target: "real-time-streaming", note: "QoE and watermark logic" },
    { label: "feature builder", target: "feature-store-experimentation", note: "Online/offline feature outputs" },
    { label: "dlq / replay", target: "backfill-replay", note: "Correction and replay flow" },
  ];

  return (
    <div className="space-y-8">
      <AnchoredSection id="ingest-lanes" eyebrow="Ingestion lanes" title="Separate client, CDC, and external batch clearly" subtitle="The three-way ingest split should be obvious without reading long paragraphs." accent={T.amber}>
        <IngestionTab />
      </AnchoredSection>
      <AnchoredSection id="ingest-topics" eyebrow="Topic map" title="Connect event families to Kafka topics and keys" subtitle="Keep retention, schema, and partition choices visible and interview-ready." accent={T.amber}>
        <KafkaTopicsTab />
      </AnchoredSection>
      <AnchoredSection id="ingest-fanout" eyebrow="Fan-out" title="Show what happens after publish" subtitle="A single topic is not the destination; it fans out to raw sinks, stream jobs, DLQ, and feature paths." accent={T.blue}>
        <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <div className="flex flex-wrap items-center gap-3">
            {fanoutTargets.map((step, index, array) => (
              <div key={step.label} className="flex items-center gap-3">
                <button onClick={() => onNavigate(step.target)} className="px-3 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all hover:-translate-y-px" style={{ background: `${T.blue}12`, color: T.text, border: `1px solid ${T.blue}24` }}>
                  {step.label}
                </button>
                {index < array.length - 1 ? <span style={{ color: T.blue }}>→</span> : null}
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3 mt-4">
            {fanoutTargets.slice(1).map((item) => (
              <button
                key={item.label}
                onClick={() => onNavigate(item.target)}
                className="rounded-2xl p-4 text-left cursor-pointer transition-all hover:-translate-y-px"
                style={{ background: T.card2, border: `1px solid ${T.border}` }}
              >
                <p className="text-sm font-semibold" style={{ color: T.text }}>
                  {item.label}
                </p>
                <p className="text-[12px] mt-2 leading-6" style={{ color: T.faint }}>
                  {item.note}
                </p>
              </button>
            ))}
          </div>
        </div>
      </AnchoredSection>
      <AnchoredSection id="ingest-say" eyebrow="Say this" title="Explain why Kafka sits at the center" subtitle="Use a concise justification that covers replay, decoupling, and many consumers." accent={T.red}>
        <InterviewAnswerStrip tab="ingestion-kafka" accent={T.red} />
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
      <AnchoredSection id="rt-watch" eyebrow="Watch-time rules" title="Make metric logic visual instead of prose-heavy" subtitle="Heartbeat truth and coverage logic should be obvious from the timeline." accent={T.blue}>
        <WatchTimeTab />
      </AnchoredSection>
      <AnchoredSection id="rt-session" eyebrow="Sessionization" title="Turn noisy raw events into trusted sessions" subtitle="The user should see exactly where pause logic, duplicates, and device changes are handled." accent={T.blue}>
        <SessionizationTab />
      </AnchoredSection>
      <AnchoredSection id="rt-late" eyebrow="Late data" title="Streaming speed still needs correction paths" subtitle="Watermarks and late updates belong right next to the real-time pipeline story." accent={T.red}>
        <LateEventsTab />
      </AnchoredSection>
      <AnchoredSection id="rt-say" eyebrow="Say this" title="Use a compact streaming explanation" subtitle="This line should separate live facts from official batch truth." accent={T.red}>
        <InterviewAnswerStrip tab="real-time-streaming" accent={T.red} />
      </AnchoredSection>
    </div>
  );
}

function BatchTrackTab() {
  return (
    <div className="space-y-8">
      <AnchoredSection id="batch-dag" eyebrow="Daily DAG" title="Visualize the batch publication path" subtitle="Official daily truth should feel like an orchestrated system, not a text paragraph about Spark." accent={T.gold}>
        <BatchPipelineTab />
      </AnchoredSection>
      <AnchoredSection id="batch-gates" eyebrow="Quality gates" title="Show what must pass before publish" subtitle="Batch only becomes official when partitions are ready, checks pass, and downstream refreshes are safe." accent={T.amber}>
        <div className="grid gap-4 md:grid-cols-3">
          {["Partition readiness", "DQ checks", "Publish + warehouse refresh"].map((title) => (
            <div key={title} className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
              <p className="text-sm font-bold" style={{ color: T.text }}>{title}</p>
              <p className="text-[12px] mt-2 leading-6" style={{ color: T.faint }}>
                Batch jobs should not publish partial truth. Every stage needs clear readiness and rollback rules.
              </p>
            </div>
          ))}
        </div>
      </AnchoredSection>
      <AnchoredSection id="batch-say" eyebrow="Say this" title="Explain why batch still owns official truth" subtitle="This should sound deliberate, not like streaming failed." accent={T.red}>
        <InterviewAnswerStrip tab="batch-pipelines" accent={T.red} />
      </AnchoredSection>
    </div>
  );
}

function LakehouseTrackTab() {
  return (
    <div className="space-y-8">
      <AnchoredSection id="lakehouse-medallion" eyebrow="Bronze / Silver / Gold" title="Make the medallion layers feel operational" subtitle="The lakehouse must explain immutability, trust, and official reporting visually." accent={T.violet}>
        <LakehouseTab />
      </AnchoredSection>
      <AnchoredSection id="lakehouse-layout" eyebrow="Storage layout" title="Explain storage paths, versions, and retention" subtitle="Users should see why Iceberg snapshots and S3 layout matter for replay and recovery." accent={T.violet}>
        <ToolMappingGrid />
      </AnchoredSection>
      <AnchoredSection id="lakehouse-say" eyebrow="Say this" title="Use a clean lakehouse framing line" subtitle="Keep Bronze, Silver, and Gold responsibilities clear." accent={T.red}>
        <InterviewAnswerStrip tab="storage-lakehouse" accent={T.red} />
      </AnchoredSection>
    </div>
  );
}

function ModelingTrackTab() {
  return (
    <div className="space-y-8">
      <AnchoredSection id="model-tables" eyebrow="Core tables" title="Show the key data model interactively" subtitle="Let users inspect the grain, columns, and examples rather than reading generic table descriptions." accent={T.violet}>
        <TableDesignTab />
      </AnchoredSection>
      <AnchoredSection id="model-lineage" eyebrow="Lineage flow" title="Show who writes each table and who reads it" subtitle="This is the missing DE-specific visual that makes the platform feel intuitive." accent={T.violet}>
        <TableLineagePanel />
      </AnchoredSection>
      <AnchoredSection id="model-erd" eyebrow="ERD + star schema" title="Connect operational entities to analytical tables" subtitle="Explain how source relationships become serving-friendly dimensions and facts." accent={T.violet}>
        <ErDiagramPanel />
      </AnchoredSection>
      <AnchoredSection id="model-say" eyebrow="Say this" title="Explain modeling by grain first" subtitle="That keeps your answer senior and avoids column-by-column noise." accent={T.red}>
        <InterviewAnswerStrip tab="data-modeling" accent={T.red} />
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
      <AnchoredSection id="gov-contracts" eyebrow="Data contracts" title="Put contracts before dashboards of trust" subtitle="If schemas and ownership are weak, downstream quality is always reactive." accent={T.green}>
        <DataContractGrid />
      </AnchoredSection>
      <AnchoredSection id="gov-quality" eyebrow="DQ dashboard" title="Make quality visible like a production surface" subtitle="The page should show DQ as a system with severity, not a checklist hidden in prose." accent={T.red}>
        <DataQualityTab />
      </AnchoredSection>
      <AnchoredSection id="gov-privacy" eyebrow="Privacy controls" title="Keep governance and privacy operational" subtitle="PII, deletes, retention, and access controls must feel concrete." accent={T.green}>
        <GovernanceTab />
      </AnchoredSection>
      <AnchoredSection id="gov-say" eyebrow="Say this" title="Use a trust-and-governance framing line" subtitle="Good answers make contracts, quality, and privacy feel core to the design." accent={T.red}>
        <InterviewAnswerStrip tab="governance-quality" accent={T.red} />
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

function CapacityCostTrackTab() {
  return (
    <div className="space-y-8">
      <AnchoredSection id="cost-scale" eyebrow="Scale math" title="Derive capacity from event math, not guesses" subtitle="Show the interviewer you can work from DAU and heartbeat frequency to partition count and storage." accent={T.blue}>
        <ScaleEstimationTab depthMode="senior" />
      </AnchoredSection>
      <AnchoredSection id="cost-tradeoffs" eyebrow="Cost levers" title="Show where cost changes as the platform scales" subtitle="Retention, partitions, cluster sizing, and serving engine choices all move spend." accent={T.amber}>
        <TradeoffsTab />
      </AnchoredSection>
      <AnchoredSection id="cost-tools" eyebrow="AWS + OSS map" title="Map the design to concrete services" subtitle="Make the stack feel deployable, not abstract." accent={T.amber}>
        <ToolMappingGrid />
      </AnchoredSection>
      <AnchoredSection id="cost-say" eyebrow="Say this" title="Use a scale-and-cost line with real numbers" subtitle="Good answers derive capacity instead of hand-waving it." accent={T.red}>
        <InterviewAnswerStrip tab="capacity-cost" accent={T.red} />
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
      <AnchoredSection id="quiz-followups" eyebrow="Follow-up bank" title="Practice the tough follow-up questions" subtitle="Keep direct Q&A linked back to the deeper diagrams so the whole product feels connected." accent={T.blue}>
        <InterviewQATab onNavigate={onNavigate} />
      </AnchoredSection>
      <AnchoredSection id="quiz-mock" eyebrow="Mock interview" title="Practice the full spoken answer flow" subtitle="This gives the DE track the same preparation depth the backend track already has." accent={T.red}>
        <MockInterviewTabCustom />
      </AnchoredSection>
      <AnchoredSection id="quiz-flashcards" eyebrow="Flashcards" title="Keep a light-weight recall mode too" subtitle="Not every revision session needs the full mock interview." accent={T.blue}>
        <FlashcardPanel />
      </AnchoredSection>
    </div>
  );
}

function ContentForTab({
  activeTab,
  onNavigate,
}: {
  activeTab: DataEngineeringTabSlug;
  onNavigate: (tab: DataEngineeringTabSlug) => void;
}) {
  switch (activeTab) {
    case "start-here":
      return <StartTrackTab onNavigate={onNavigate} />;
    case "requirements":
      return <RequirementsTrackTab onNavigate={onNavigate} />;
    case "event-sources":
      return <EventSourcesTrackTab />;
    case "architecture":
      return <ArchitectureTrackTab onNavigate={onNavigate} />;
    case "ingestion-kafka":
      return <IngestionKafkaTrackTab onNavigate={onNavigate} />;
    case "real-time-streaming":
      return <RealtimeTrackTab />;
    case "batch-pipelines":
      return <BatchTrackTab />;
    case "storage-lakehouse":
      return <LakehouseTrackTab />;
    case "data-modeling":
      return <ModelingTrackTab />;
    case "warehouse-serving":
      return <WarehouseServingTrackTab />;
    case "feature-store-experimentation":
      return <FeatureExperimentTrackTab />;
    case "governance-quality":
      return <GovernanceQualityTrackTab />;
    case "backfill-replay":
      return <ReplayTrackTab />;
    case "capacity-cost":
      return <CapacityCostTrackTab />;
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
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: accent }}>
        {title}
      </p>
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

function SelectField({
  label,
  value,
  options,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm font-semibold" style={{ color: T.text }}>
          {label}
        </span>
        <span className="text-sm" style={{ color: T.faint }}>
          {value}{suffix}
        </span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl px-3 py-3 text-sm"
        style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}{suffix}
          </option>
        ))}
      </select>
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
    () => DATA_ENGINEERING_TABS.findIndex((tab) => tab.id === activeTab),
    [activeTab]
  );
  const overallProgressPercent = Math.max(6, Math.round((visitedTabs.size / DATA_ENGINEERING_TABS.length) * 100));

  const prevTab = DATA_ENGINEERING_TABS[activeIndex - 1];
  const nextTab = DATA_ENGINEERING_TABS[activeIndex + 1];
  const activeSections = PRODUCT_TAB_SECTIONS[activeTab];

  const switchTab = useCallback((tab: DataEngineeringTabSlug) => {
    if (tab === activeTab) return;
    const nextSection = PRODUCT_TAB_SECTIONS[tab][0]?.id ?? "";
    setVisitedTabs((prev) => new Set([...prev, activeTab, tab]));
    setActiveTab(tab);
    setActiveSectionId(nextSection);
    window.history.pushState(null, "", `/system-design/netflix-data-engineering/${tab}${nextSection ? `#${nextSection}` : ""}`);
    window.setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }, [activeTab]);

  const activeMeta = DATA_ENGINEERING_TAB_META[activeTab];

  useEffect(() => {
    document.title = activeMeta.title;
  }, [activeMeta.title]);

  const handleShare = () => {
    copyTextToClipboard(`${window.location.origin}/system-design/netflix-data-engineering/${activeTab}`).catch(() => {});
  };

  useEffect(() => {
    const shell = scrollRef.current;
    if (!shell) return;
    const computeActiveSection = () => {
      const shellTop = shell.getBoundingClientRect().top;
      const measured = activeSections
        .map((section) => {
          const el = document.getElementById(section.id);
          if (!el) return null;
          return { id: section.id, top: el.getBoundingClientRect().top - shellTop };
        })
        .filter((item): item is { id: string; top: number } => Boolean(item))
        .sort((a, b) => a.top - b.top);
      const threshold = 96;
      const passed = measured.filter((item) => item.top <= threshold);
      const nextActive = passed.at(-1) ?? measured[0];
      if (nextActive) {
        if (activeSectionId !== nextActive.id) {
          setActiveSectionId(nextActive.id);
          window.history.replaceState(null, "", `/system-design/netflix-data-engineering/${activeTab}#${nextActive.id}`);
        }
      }
    };
    computeActiveSection();
    shell.addEventListener("scroll", computeActiveSection, { passive: true });
    return () => shell.removeEventListener("scroll", computeActiveSection);
  }, [activeSectionId, activeSections, activeTab]);

  const navigateSection = useCallback((sectionId: string) => {
    const node = document.getElementById(sectionId);
    const shell = scrollRef.current;
    if (!node || !shell) return;
    setActiveSectionId(sectionId);
    window.history.replaceState(null, "", `/system-design/netflix-data-engineering/${activeTab}#${sectionId}`);
    const nextTop = node.offsetTop - 32;
    shell.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
  }, [activeTab, scrollRef]);

  const handleExportNotes = () => {
    const lines: string[] = ["# Netflix Data Engineering Notes", ""];
    DATA_ENGINEERING_TABS.forEach((tab) => {
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
    <div className="flex flex-col" style={{ height: "calc(100dvh - 56px)", background: T.bg, color: T.text, overflow: "hidden" }}>
      {!focusMode ? (
        <TabHeader
          tab={activeTab}
          activeIndex={activeIndex}
          total={DATA_ENGINEERING_TABS.length}
          visitedCount={visitedTabs.size}
          revisedCount={revisedTabs.size}
          onToggleProgress={() => setProgressOpen((v) => !v)}
          onToggleNotes={() => setNotesOpen((v) => !v)}
          onToggleFocus={() => setFocusMode(true)}
          focusMode={focusMode}
          onShare={handleShare}
        />
      ) : null}

      {!focusMode ? (
        <TopTabStrip activeTab={activeTab} visitedTabs={visitedTabs} progressPercent={overallProgressPercent} onNavigate={switchTab} />
      ) : null}

      {!focusMode ? (
        <div className="xl:hidden px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}`, background: T.bg }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.faint }}>
              On this page
            </p>
            <p className="text-sm font-semibold" style={{ color: T.text }}>
              {activeSections.find((section) => section.id === activeSectionId)?.title ?? DATA_ENGINEERING_TABS[activeIndex]?.label}
            </p>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
            Open outline
          </button>
        </div>
      ) : null}

      <div className="flex-1 flex overflow-hidden">
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
          {activeTab === "start-here" ? null : (
            <SectionHero
              meta={activeMeta}
              accent={DATA_ENGINEERING_TABS[activeIndex]?.accent ?? T.red}
              activeIndex={activeIndex}
              tab={activeTab}
              sections={activeSections}
              onNavigateSection={navigateSection}
            />
          )}
          <ContentForTab activeTab={activeTab} onNavigate={switchTab} />
        </ScrollableShell>
      </div>

      <MobileMenu activeTab={activeTab} open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} onNavigateSection={navigateSection} />

      {focusMode ? (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-between" style={{ background: `${T.red}ee` }}>
          <span className="text-xs font-bold text-white">
            Focus Mode — {DATA_ENGINEERING_TABS[activeIndex]?.label}
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
                Notes — {DATA_ENGINEERING_TABS[activeIndex]?.label}
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
              <MetricCard label="Visited" value={`${visitedTabs.size}/${DATA_ENGINEERING_TABS.length}`} note="Tabs you have opened" color={T.red} />
              <MetricCard label="Revised" value={`${revisedTabs.size}/${DATA_ENGINEERING_TABS.length}`} note="Tabs you explicitly marked revised" color={T.green} />
              <MetricCard label="Notes" value={String(Object.values(notes).filter((value) => value.trim()).length)} note="Tabs with saved notes" color={T.amber} />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {DATA_ENGINEERING_TABS.map((tab) => (
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
        .flow-pulse {
          animation: flowPulse 2.1s ease-in-out infinite;
        }
        @keyframes moveDot {
          0% { transform: translate(0, 0); opacity: 0; }
          12% { opacity: 1; }
          82% { opacity: 1; }
          100% { transform: translate(var(--dot-x), var(--dot-y)); opacity: 0; }
        }
        @keyframes flowPulse {
          0%, 100% { transform: scale(0.85); opacity: 0.35; }
          50% { transform: scale(1.1); opacity: 1; }
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
  const chapter = DATA_ENGINEERING_TABS[activeIndex];

  return (
    <div className="rounded-[28px] p-5 md:p-6 mb-6 relative overflow-hidden" style={{ background: T.card, border: `1px solid ${accent}24` }}>
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${accent}, ${T.amber}, ${T.violet})` }} />
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Pill color={accent}>{meta.eyebrow}</Pill>
          <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: T.card2, color: T.faint, border: `1px solid ${T.border}` }}>
            Chapter {activeIndex + 1}
          </span>
          <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: `${accent}10`, color: accent, border: `1px solid ${accent}22` }}>
            {chapter?.mins ?? 0} min
          </span>
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
          <div>
            <h2 className="text-[1.95rem] md:text-[2.25rem] font-semibold tracking-[-0.05em] leading-[0.98] max-w-3xl" style={{ color: T.text }}>
              {meta.heroSubtitle}
            </h2>
            <p className="text-sm md:text-[15px] leading-7 mt-3 max-w-3xl" style={{ color: T.muted }}>
              {TAB_INTERVIEW_LINES[tab]}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {meta.heroSignals.map((signal) => (
                <span key={signal} className="px-3 py-1.5 rounded-full text-[11px] font-semibold" style={{ background: `${accent}12`, color: T.text, border: `1px solid ${accent}24` }}>
                  {signal}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => onNavigateSection(sections[0]?.id ?? "")}
                className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                style={{ background: `${accent}12`, color: T.text, border: `1px solid ${accent}24` }}
              >
                Open {sections[0]?.title ?? "first section"} →
              </button>
              <CopyButton value={TAB_INTERVIEW_LINES[tab]} label="Copy interview line" />
            </div>
          </div>
          <div className="rounded-[24px] p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                Quick jumps
              </p>
              <span className="text-[11px]" style={{ color: T.faint }}>
                Click to jump
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sections.slice(0, 4).map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => onNavigateSection(section.id)}
                  className="rounded-full px-3 py-2 text-left cursor-pointer transition-all hover:-translate-y-px"
                  style={{ background: T.card, border: `1px solid ${T.border}` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: `${accent}14`, color: accent }}>
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: T.text }}>
                      {section.title}
                    </span>
                    <span style={{ color: accent }}>→</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3 mt-4">
              {DATA_TRACK_NUMBERS.slice(0, 3).map((item) => (
                <CompactMetricBadge key={item.label} label={item.label} value={item.value} note={item.note} color={item.color} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
