"use client";

import { useState } from "react";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
      style={{ background: copied ? "#22c55e" : "#2a2b3d", color: copied ? "#fff" : "#a9b1d6", cursor: "pointer", border: "none" }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function SayThis({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #10b981" }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ background: "rgba(16,185,129,0.1)" }}>
        <span className="text-xs font-bold" style={{ color: "#10b981" }}>💬 Say this in interview</span>
        <button
          onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
          className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
          style={{ background: copied ? "#22c55e" : "transparent", color: copied ? "#fff" : "#10b981", border: "1px solid #10b981", cursor: "pointer" }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="px-4 py-3 text-sm leading-relaxed" style={{ background: "var(--bg)", color: "var(--text)" }}>{text}</div>
    </div>
  );
}

function Accordion({ title, children, badge }: { title: string; children: React.ReactNode; badge?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        style={{ background: "var(--bg)", cursor: "pointer", border: "none" }}
      >
        <span className="text-sm font-semibold flex-1" style={{ color: "var(--text)" }}>{title}</span>
        {badge && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>{badge}</span>}
        <span className="text-xs transition-transform duration-200" style={{ color: "var(--text-muted)", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 space-y-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

const FLOW_STEPS = [
  { n: 1, title: "Clarify analytics goal", interview: "First question: are we calculating total streaming hours or real-time active users? Do we need real-time or batch? What is acceptable delay — seconds, minutes, or hours?" },
  { n: 2, title: "Define event types", interview: "I'll define the events: playback_started, playback_heartbeat, playback_paused, playback_resumed, playback_stopped, buffering_started, quality_changed, error_occurred, search_performed, recommendation_click." },
  { n: 3, title: "Design event schema", interview: "Every event has: event_id (UUID for dedup), event_type, user_id, profile_id, content_id, device_id, session_id, event_ts (event time), ingest_ts (ingest time). Both timestamps are required — event_ts for processing, ingest_ts for watermarking." },
  { n: 4, title: "Estimate event volume", interview: "60M concurrent streams × heartbeat every 30s = 2M heartbeat events/sec. With all event types: ~15M events/sec peak. At 2KB average: 30 GB/s raw ingest." },
  { n: 5, title: "Kafka topic design", interview: "I'll separate topics by event domain: playback-events, heartbeat-events, quality-events, search-events, recommendation-events, error-events. Separate topics allow independent consumer groups and retention policies." },
  { n: 6, title: "Partitioning strategy", interview: "heartbeat-events: partition by session_id for session ordering. search-events: partition by profile_id for user behavior. Avoid content_id for heartbeats — popular titles create hot partitions." },
  { n: 7, title: "Schema registry", interview: "All events use Avro or Protobuf with Confluent Schema Registry. Schema compatibility: BACKWARD_TRANSITIVE — consumers can read older schemas, producers can only add optional fields." },
  { n: 8, title: "Deduplication and idempotency", interview: "Deduplicate by event_id. In Flink: use a keyed state store with TTL matching the dedup window (24h). In Spark: deduplicate on read using watermark + dropDuplicates(event_id, watermark_window)." },
  { n: 9, title: "Late events and watermarking", interview: "Watermark = max(event_ts) - allowed_lateness. I'll use 30 minutes allowed lateness for heartbeats. Events arriving after watermark go to a DLQ for batch reconciliation. Do not silently drop them." },
  { n: 10, title: "Streaming processing", interview: "For watch hours: Spark Structured Streaming with micro-batch. For real-time active users: Flink with stateful sessionization. I'll explain the tradeoff between the two." },
  { n: 11, title: "Bronze/Silver/Gold lakehouse", interview: "Bronze: raw events exactly as received, append-only, partitioned by event_date/event_hour. Silver: deduped, validated, sessionized, enriched. Gold: business aggregates — total watch hours, top content, completion rate." },
  { n: 12, title: "Data quality checks", interview: "event_id must not be null. event_ts must not be in far future. Duplicate rate below threshold. Watch duration must not exceed content duration. Bad records go to quarantine table, not silently dropped." },
  { n: 13, title: "Aggregations", interview: "Gold layer: watch hours = SUM(heartbeat_intervals) grouped by content_id, country, date. Completion rate = completed_sessions / started_sessions. Buffering ratio = buffering_seconds / total_seconds." },
  { n: 14, title: "Serving layer", interview: "Trino for ad-hoc SQL over Iceberg. Apache Pinot for real-time OLAP dashboards (< 100ms). Pre-aggregated Gold tables for BI tools." },
  { n: 15, title: "Backfill and replay", interview: "Backfill from Bronze: re-run Silver and Gold jobs with a time range override. Kafka retention 7–30 days for recent replay. For older data: re-read from Bronze Iceberg. Handle overwrites carefully — use Iceberg MERGE INTO, not INSERT OVERWRITE." },
  { n: 16, title: "Monitoring", interview: "Key metrics: consumer lag per topic, late event rate, duplicate rate, DLQ growth rate, Gold table SLA (freshness). Alert if consumer lag grows beyond threshold." },
  { n: 17, title: "Cost optimization", interview: "Iceberg compaction reduces small files. Partition pruning on event_date cuts query cost. Tiered storage: hot data on SSD-backed S3, cold data on S3 Glacier. Parquet + zstd compression saves 60–70% vs raw JSON." },
  { n: 18, title: "Final spoken answer", interview: "I designed a Netflix event pipeline: 15M events/sec → Kafka (6 topics, partitioned by session_id) → Flink/Spark dedup + sessionization → Bronze/Silver/Gold Iceberg → Trino/Pinot serving. Late events handled with 30-min watermark + DLQ backfill." },
];

const EVENT_SCHEMA = `{
  "event_id":       "uuid",            // deduplication key — REQUIRED
  "event_type":     "playback_heartbeat",
  "user_id":        "u123",
  "profile_id":     "p123",
  "content_id":     "movie456",
  "device_id":      "device789",
  "session_id":     "session999",
  "event_ts":       "2026-06-19T10:30:00Z",   // event time — use for watermarking
  "ingest_ts":      "2026-06-19T10:30:03Z",   // ingest time — lag measurement
  "position_sec":   1200,             // optional (heartbeat, stopped events)
  "playback_state": "playing",        // playing | paused | buffering | error
  "bitrate_kbps":   4500,             // optional (quality events)
  "country":        "IN",             // partition field
  "region":         "APAC",           // partition field
  "app_version":    "9.1.2",
  "network_type":   "wifi"            // wifi | cellular | ethernet
}`;

const KAFKA_TOPICS = [
  { topic: "playback-events",       key: "session_id",  purpose: "Playback lifecycle (start, stop, complete)", retention: "7 days",  volume: "~500K/sec",  ordering: "Per session", dlq: "playback-events-dlq" },
  { topic: "heartbeat-events",      key: "session_id",  purpose: "Watch duration calculation", retention: "30 days", volume: "~2M/sec",   ordering: "Per session (critical)", dlq: "heartbeat-events-dlq" },
  { topic: "quality-events",        key: "device_id",   purpose: "Buffering/bitrate analytics", retention: "7 days", volume: "~200K/sec", ordering: "Per device", dlq: "quality-events-dlq" },
  { topic: "search-events",         key: "profile_id",  purpose: "Search analytics and CTR", retention: "14 days", volume: "~50K/sec",  ordering: "Per profile", dlq: "search-events-dlq" },
  { topic: "recommendation-events", key: "profile_id",  purpose: "Recommendation impression and click", retention: "14 days", volume: "~100K/sec", ordering: "Per profile", dlq: "recommendation-events-dlq" },
  { topic: "error-events",          key: "device_id",   purpose: "Client errors, crashes, playback failures", retention: "30 days", volume: "~10K/sec", ordering: "Per device", dlq: "error-events-dlq" },
];

const SESSIONIZATION = `GOAL: Convert playback events + heartbeats into clean watch sessions.

INPUT EVENTS (per session_id):
  playback_started  → session open
  playback_heartbeat → extend session, accumulate watched_seconds
  playback_paused   → note pause (do not close session)
  playback_resumed  → note resume
  playback_stopped  → session close (explicit)
  playback_completed → session close with 100% flag

LOGIC:
  1. Group all events by session_id
  2. Use event_ts (not ingest_ts) for ordering
  3. start_ts  = event_ts of playback_started
  4. end_ts    = event_ts of last heartbeat or stopped event
  5. watched_seconds = SUM(heartbeat_intervals between consecutive heartbeats)
     - NOT end_ts - start_ts (includes pauses)
     - NOT raw heartbeat count × interval (misses variable intervals)
  6. Deduplicate heartbeats by event_id before summing
  7. Handle pause/resume: gap between last heartbeat and resume event is NOT watched
  8. Handle app crash: no explicit stop event. Close session after inactivity_threshold.

INACTIVITY THRESHOLD:
  Default: 30 minutes of no heartbeat → session closed
  IMPORTANT: a 30-minute gap should NOT always mean session ended.
  If the client sends explicit pause/resume events, use playback_state.
  If events are missing (crash, network loss), THEN use inactivity timeout as fallback.

MISSING STOP EVENT:
  App crash scenario: no playback_stopped received.
  Solution: Flink timer or Spark watermark-based timeout closes the session.
  The last valid heartbeat position is used as the end position.`;

const LAKEHOUSE_TABLES = [
  {
    layer: "Bronze",
    color: "#92400e",
    bg: "#fef3c7",
    tables: [
      { name: "bronze_raw_playback_events", partition: "event_date, event_hour", format: "Parquet + zstd", notes: "Raw events exactly as received. Append-only. Never modified." },
      { name: "bronze_raw_quality_events", partition: "event_date, event_hour", format: "Parquet + zstd", notes: "Raw quality/buffering events. Same schema as sent by client." },
    ],
    purpose: "Raw events exactly as received, append-only, never modified. Source of truth for reprocessing.",
  },
  {
    layer: "Silver",
    color: "#1e3a5f",
    bg: "#dbeafe",
    tables: [
      { name: "silver_clean_playback_events", partition: "event_date", format: "Parquet + zstd", notes: "Deduped by event_id. Schema validated. Invalid events removed to quarantine." },
      { name: "silver_playback_sessions", partition: "session_date", format: "Parquet + zstd", notes: "Sessionized: start_ts, end_ts, watched_seconds, pause_count, completion_flag." },
      { name: "silver_content_engagement", partition: "event_date, content_id", format: "Parquet + zstd", notes: "Enriched with content metadata. One row per session per content." },
    ],
    purpose: "Deduplicated, validated, sessionized, enriched. Ready for aggregation.",
  },
  {
    layer: "Gold",
    color: "#065f46",
    bg: "#d1fae5",
    tables: [
      { name: "gold_content_watch_hours_daily", partition: "watch_date", format: "Parquet, Z-order: content_id, country", notes: "Total watch hours per content per country per day. Primary metric for content valuation." },
      { name: "gold_user_watch_hours_daily", partition: "watch_date", format: "Parquet, Z-order: user_id", notes: "Total watch hours per user per day. Used for churn prediction features." },
      { name: "gold_device_quality_daily", partition: "event_date", format: "Parquet", notes: "Buffering ratio, avg bitrate, error rate per device type per day." },
      { name: "gold_region_content_performance_daily", partition: "event_date, region", format: "Parquet", notes: "Top content per region, completion rate, buffering ratio by region." },
    ],
    purpose: "Business-ready aggregates. Used by dashboards, BI tools, and ML feature pipelines.",
  },
];

const DQ_CHECKS = [
  { check: "event_id not null", severity: "Critical", action: "Reject to quarantine" },
  { check: "event_type is valid enum", severity: "Critical", action: "Reject to quarantine" },
  { check: "event_ts not in far future (> now + 1h)", severity: "High", action: "Flag, hold in DLQ" },
  { check: "content_id exists in content dimension", severity: "High", action: "Flag as orphan, process with null join" },
  { check: "profile_id exists in profile dimension", severity: "High", action: "Flag as orphan" },
  { check: "Duplicate event_id rate < 0.1%", severity: "Medium", action: "Alert, track dedup ratio" },
  { check: "Late event rate < 5%", severity: "Medium", action: "Alert if growing trend" },
  { check: "Watch duration not negative", severity: "Critical", action: "Reject to quarantine" },
  { check: "Watch duration not > content duration + 10%", severity: "Medium", action: "Flag for review" },
  { check: "Schema compatibility enforced via registry", severity: "Critical", action: "Producer rejected at registration" },
  { check: "Null user/profile rate < 0.5%", severity: "Medium", action: "Alert" },
  { check: "Country/device/app_version in known values", severity: "Low", action: "Accept but flag unknown" },
  { check: "session_id must exist for playback events", severity: "High", action: "Reject orphan events to quarantine" },
  { check: "Bad record rate < 0.5% overall", severity: "High", action: "Alert and page if threshold exceeded" },
  { check: "DQ dashboard shows trend (not just current)", severity: "Medium", action: "Visualize 7-day trend, alert on sudden spikes" },
];

const CODE_SNIPPETS: Record<string, { label: string; lang: string; code: string }> = {
  watchHours: {
    label: "Spark SQL: Total watch hours by content",
    lang: "sql",
    code: `-- Total watch hours by content (Gold layer)
SELECT
  content_id,
  watch_date,
  country,
  SUM(watched_seconds) / 3600.0          AS total_watch_hours,
  COUNT(DISTINCT session_id)              AS total_sessions,
  COUNT(DISTINCT profile_id)             AS unique_viewers,
  AVG(watched_seconds::FLOAT / NULLIF(duration_sec, 0)) AS avg_completion_rate
FROM silver_playback_sessions
WHERE session_date = '2026-06-19'
  AND watched_seconds > 0
GROUP BY content_id, watch_date, country
ORDER BY total_watch_hours DESC;`,
  },
  dedup: {
    label: "Spark: Deduplicate events by event_id",
    lang: "python",
    code: `from pyspark.sql import functions as F
from pyspark.sql.window import Window

# Deduplicate: keep earliest ingest_ts per event_id within watermark window
w = Window.partitionBy("event_id").orderBy("ingest_ts")

deduped = (
    raw_events
    .withColumn("row_num", F.row_number().over(w))
    .filter(F.col("row_num") == 1)
    .drop("row_num")
)

# Also filter impossible events
clean = deduped.filter(
    F.col("event_id").isNotNull() &
    F.col("event_ts").isNotNull() &
    F.col("watched_seconds") >= 0
)`,
  },
  sessionize: {
    label: "Spark SQL: Sessionization (watched seconds per session)",
    lang: "sql",
    code: `-- Step 1: order heartbeats per session
WITH ordered_events AS (
  SELECT
    session_id, profile_id, content_id,
    event_ts, position_sec, playback_state,
    LAG(event_ts) OVER (PARTITION BY session_id ORDER BY event_ts) AS prev_ts,
    LAG(playback_state) OVER (PARTITION BY session_id ORDER BY event_ts) AS prev_state
  FROM silver_clean_playback_events
  WHERE event_type = 'playback_heartbeat'
),
-- Step 2: only count intervals where previous state was 'playing'
intervals AS (
  SELECT
    session_id, profile_id, content_id,
    UNIX_TIMESTAMP(event_ts) - UNIX_TIMESTAMP(prev_ts) AS interval_sec
  FROM ordered_events
  WHERE prev_state = 'playing'
    AND interval_sec > 0
    AND interval_sec < 120  -- discard gaps > 2 min (pause not tracked)
)
-- Step 3: aggregate per session
SELECT
  session_id, profile_id, content_id,
  SUM(interval_sec) AS watched_seconds
FROM intervals
GROUP BY session_id, profile_id, content_id;`,
  },
  lateEvents: {
    label: "Spark Structured Streaming: Late event handling",
    lang: "python",
    code: `from pyspark.sql import functions as F

stream = (
    spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "broker:9092")
    .option("subscribe", "heartbeat-events")
    .load()
)

parsed = stream.select(F.from_json(F.col("value").cast("string"), EVENT_SCHEMA).alias("e")).select("e.*")

# Watermark: allow up to 30 minutes of late data
windowed = (
    parsed
    .withWatermark("event_ts", "30 minutes")
    .groupBy(
        F.window("event_ts", "1 hour"),
        F.col("content_id"),
        F.col("country")
    )
    .agg(F.sum("heartbeat_interval_sec").alias("total_watched_sec"))
)

# Events arriving after watermark go to DLQ
# Implement with a separate stream reading from DLQ topic`,
  },
  icebergWrite: {
    label: "Spark: Write to Iceberg table",
    lang: "python",
    code: `# Write to Silver Iceberg table with merge-on-read
(
    sessionized_df
    .writeTo("catalog.silver.silver_playback_sessions")
    .tableProperty("write.format.default", "parquet")
    .tableProperty("write.parquet.compression-codec", "zstd")
    .partitionedBy(F.days("session_date"))
    .option("fanout-enabled", "true")
    .createOrReplace()  # for backfill
    # .append()         # for incremental streaming
)

# Compact small files (run after streaming job)
spark.sql("""
  CALL catalog.system.rewrite_data_files(
    table => 'silver.silver_playback_sessions',
    strategy => 'sort',
    sort_order => 'zorder(content_id, country)',
    options => map('target-file-size-bytes', '134217728')
  )
""")`,
  },
  completionRate: {
    label: "Spark SQL: Content completion rate",
    lang: "sql",
    code: `SELECT
  content_id,
  session_date,
  COUNT(*) AS total_starts,
  SUM(CASE WHEN completion_pct >= 0.9 THEN 1 ELSE 0 END) AS completions,
  ROUND(SUM(CASE WHEN completion_pct >= 0.9 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS completion_rate_pct,
  AVG(watched_seconds::FLOAT / NULLIF(duration_sec, 0)) AS avg_watch_fraction
FROM (
  SELECT
    session_id, content_id, session_date,
    watched_seconds,
    duration_sec,
    watched_seconds::FLOAT / NULLIF(duration_sec, 0) AS completion_pct
  FROM silver_playback_sessions
  WHERE session_date BETWEEN '2026-06-12' AND '2026-06-19'
) t
GROUP BY content_id, session_date
ORDER BY total_starts DESC;`,
  },
};

const FINAL_DATA_ANSWERS = {
  "30 seconds": `I'll design Netflix streaming analytics. 15M events/sec → Kafka (6 topics, partitioned by session_id) → Flink/Spark with dedup by event_id and 30-min watermark for late events → Bronze raw events → Silver sessionized and deduplicated → Gold aggregates (watch hours, completion rate, buffering ratio) → Trino/Pinot serving.`,
  "2 minutes": `I'll scope this to Netflix streaming analytics — how we turn raw client events into metrics like total watch hours, top content, and completion rate.

Event ingestion: 15M events/sec at peak. Kafka with 6 topic domains. heartbeat-events partitioned by session_id for ordering. Schema Registry enforces Avro compatibility.

Processing: Spark Structured Streaming for Bronze→Silver ETL. Flink for real-time sessionization and active user counts. Watermark of 30 minutes — events arriving later go to DLQ for batch reconciliation.

Lakehouse: Iceberg tables in three layers. Bronze: raw events, append-only. Silver: deduped, sessionized, enriched. Gold: daily aggregates — watch hours, completion rate, buffering ratio, top content.

Key design decisions: deduplicate by event_id before any aggregation — counting raw heartbeats gives wrong watch time. Sessionization uses event_ts not ingest_ts. Partition Gold tables by event_date for efficient query pruning.

Data quality: DQ checks at Silver ingestion. Bad records quarantined, never silently dropped. DQ dashboard tracks duplicate rate, late event rate, null rates.`,
};

function DataEngineeringTrackTab({ seniorDepth }: { seniorDepth: boolean }) {
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set());
  const [activeSnippet, setActiveSnippet] = useState<string>("watchHours");
  const [copyAnswer, setCopyAnswer] = useState<string | null>(null);

  const toggleStep = (n: number) =>
    setOpenSteps(prev => { const s = new Set(prev); if (s.has(n)) s.delete(n); else s.add(n); return s; });

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopyAnswer(key); setTimeout(() => setCopyAnswer(null), 2000); });
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid #10b98140" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6)" }} />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>Data Engineering Track</span>
              {seniorDepth && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>Senior/Staff Depth ON</span>}
            </div>
            <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>Netflix Streaming Analytics Pipeline</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>18-step guided flow from raw events to business metrics.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {[["17", "event types"], ["6", "Kafka topics"], ["9", "Iceberg tables"]].map(([n, l]) => (
              <div key={l} className="text-center p-3 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div className="text-lg font-black font-mono" style={{ color: "#10b981" }}>{n}</div>
                <div className="text-[10px]" style={{ color: "var(--text-faint)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clarifying questions */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-base font-bold mb-1" style={{ color: "var(--text)" }}>Clarifying Questions — ask these first</h2>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Data engineering interviews stall when you start designing before understanding the analytics goal. Ask these first.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            ["Analytics goal", "Are we calculating total streaming hours or real-time active users?"],
            ["Latency SLA", "Do we need real-time (seconds) or batch (hours/daily) analytics?"],
            ["Acceptable delay", "What delay is acceptable — seconds, minutes, or hours?"],
            ["Granularity", "User-level, content-level, device-level, or region-level metrics?"],
            ["Session definition", "How do you define a valid watch session?"],
            ["Edge cases", "How do we treat pause, buffering, seek, replay, and app crash?"],
            ["Delivery semantics", "Do we need exactly-once or effectively-once processing?"],
            ["Late events", "How late can events arrive? 5 minutes? 30 minutes? Days?"],
            ["Historical backfill", "Do we need to backfill historical data for this pipeline?"],
            ["Downstream consumers", "Dashboard, ML, experimentation, finance, or operations?"],
          ].map(([area, q]) => (
            <div key={area} className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] font-bold uppercase mb-0.5" style={{ color: "#10b981" }}>{area}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{q}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Flow steps */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              18-Step Design Flow <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}>({FLOW_STEPS.length} steps)</span>
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Each step has an interview answer to copy and practice.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setOpenSteps(new Set(FLOW_STEPS.map(s => s.n)))} className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "var(--blue-soft)", color: "var(--blue-text)", cursor: "pointer", border: "none" }}>Expand All</button>
            <button onClick={() => setOpenSteps(new Set())} className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>Collapse</button>
          </div>
        </div>
        <div className="space-y-1.5">
          {FLOW_STEPS.map((step) => {
            const isOpen = openSteps.has(step.n);
            return (
              <div key={step.n} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isOpen ? "#10b98160" : "var(--border)"}`, borderTop: "3px solid #10b981" }}>
                <button
                  onClick={() => toggleStep(step.n)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  aria-expanded={isOpen}
                  style={{ background: isOpen ? "rgba(16,185,129,0.06)" : "var(--bg)", cursor: "pointer", border: "none" }}
                >
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>{step.n}</span>
                  <span className="text-sm font-semibold flex-1" style={{ color: "var(--text)" }}>{step.title}</span>
                  <span className="text-xs shrink-0 transition-transform duration-200" style={{ color: "var(--text-muted)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <SayThis text={step.interview} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event types */}
      <Accordion title="Event Types — all 17 events" badge="17 events">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            ["playback_started", "Session begins", "#3b82f6"],
            ["playback_heartbeat", "Every 30s — watch duration", "#10b981"],
            ["playback_paused", "User pauses", "#f59e0b"],
            ["playback_resumed", "User resumes after pause", "#10b981"],
            ["playback_stopped", "User stops explicitly", "#ef4444"],
            ["playback_completed", "Watched to end", "#8b5cf6"],
            ["buffering_started", "Buffer underrun started", "#f97316"],
            ["buffering_ended", "Buffer recovered", "#10b981"],
            ["seek_started", "User scrubs timeline", "#06b6d4"],
            ["seek_completed", "Seek complete, new position", "#06b6d4"],
            ["quality_changed", "Bitrate/resolution changed", "#a855f7"],
            ["error_occurred", "Playback error", "#ef4444"],
            ["app_opened", "App launch event", "#3b82f6"],
            ["search_performed", "Search query issued", "#f59e0b"],
            ["title_clicked", "User clicks on a title", "#3b82f6"],
            ["recommendation_impression", "Recommendation shown", "#8b5cf6"],
            ["recommendation_click", "Recommendation clicked", "#10b981"],
          ].map(([type, desc, color]) => (
            <div key={type as string} className="rounded-lg p-3" style={{ background: "var(--bg)", border: `1px solid ${color as string}30` }}>
              <code className="text-[11px] font-mono font-bold block mb-1" style={{ color: color as string }}>{type}</code>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</span>
            </div>
          ))}
        </div>
      </Accordion>

      {/* Event schema */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>Event Schema</h2>
          <CopyButton text={EVENT_SCHEMA} label="Copy schema" />
        </div>
        <div className="rounded-lg overflow-hidden" style={{ background: "#1a1b26" }}>
          <pre className="p-4 text-xs leading-relaxed overflow-x-auto"><code style={{ color: "#a9b1d6" }}>{EVENT_SCHEMA}</code></pre>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Mandatory fields", items: ["event_id", "event_type", "user_id", "profile_id", "content_id", "session_id", "event_ts", "ingest_ts"] },
            { label: "Optional fields", items: ["position_sec", "playback_state", "bitrate_kbps", "network_type"] },
            { label: "Partition fields", items: ["country", "region", "event_ts (for Iceberg)"] },
          ].map(({ label, items }) => (
            <div key={label} className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#10b981" }}>{label}</p>
              {items.map(i => <code key={i} className="text-[11px] block mb-0.5" style={{ color: "var(--text-muted)" }}>{i}</code>)}
            </div>
          ))}
        </div>
      </div>

      {/* Kafka topics */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-base font-bold mb-3" style={{ color: "var(--text)" }}>Kafka Topic Design</h2>
        <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                {["Topic", "Partition key", "Purpose", "Retention", "Volume", "DLQ topic"].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 font-bold" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KAFKA_TOPICS.map((t, i) => (
                <tr key={t.topic} style={{ borderBottom: i < KAFKA_TOPICS.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td className="py-2 px-3 font-mono font-bold" style={{ color: "#10b981" }}>{t.topic}</td>
                  <td className="py-2 px-3 font-mono" style={{ color: "var(--text-muted)" }}>{t.key}</td>
                  <td className="py-2 px-3" style={{ color: "var(--text)" }}>{t.purpose}</td>
                  <td className="py-2 px-3" style={{ color: "var(--text-faint)" }}>{t.retention}</td>
                  <td className="py-2 px-3 font-mono" style={{ color: "var(--blue-text)" }}>{t.volume}</td>
                  <td className="py-2 px-3 font-mono text-[10px]" style={{ color: "var(--text-faint)" }}>{t.dlq}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <p className="text-[11px] font-bold mb-1.5" style={{ color: "#10b981" }}>Partition key rules</p>
            <ul className="space-y-1">
              {["session_id: use when session ordering matters", "profile_id: use for user behavior analytics", "Avoid content_id for heartbeats — hot titles cause skew", "Use salting if content-level agg becomes skewed"].map(r => (
                <li key={r} className="flex items-start gap-1.5">
                  <span className="text-xs shrink-0 mt-0.5" style={{ color: "#10b981" }}>▸</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <p className="text-[11px] font-bold mb-2" style={{ color: "#3b82f6" }}>Spark vs Flink — comparison</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="text-left py-1 px-1 font-bold" style={{ color: "var(--text-faint)" }}>Area</th>
                    <th className="text-left py-1 px-1 font-bold" style={{ color: "#3b82f6" }}>Spark Streaming</th>
                    <th className="text-left py-1 px-1 font-bold" style={{ color: "#10b981" }}>Flink</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Processing model", "Micro-batch", "True streaming"],
                    ["Latency", "Seconds / minutes", "Milliseconds / seconds"],
                    ["State mgmt", "Good (RocksDB)", "Excellent (native RocksDB)"],
                    ["Lakehouse ETL", "Excellent", "Good"],
                    ["Sessionization", "Good", "Excellent"],
                    ["Exactly-once", "Good", "Excellent"],
                    ["Netflix use", "Bronze→Silver ETL", "Real-time sessionization"],
                  ].map(([area, spark, flink]) => (
                    <tr key={area as string} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="py-1 px-1" style={{ color: "var(--text-faint)" }}>{area}</td>
                      <td className="py-1 px-1" style={{ color: "var(--text-muted)" }}>{spark}</td>
                      <td className="py-1 px-1" style={{ color: "var(--text-muted)" }}>{flink}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 space-y-1.5">
              {[["Spark Structured Streaming", "Micro-batch, great for Bronze→Silver ETL and lakehouse writes"], ["Flink", "True streaming, great for real-time sessionization and exactly-once"]].map(([tool, use]) => (
                <div key={tool as string}>
                  <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{tool}</span>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{use}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sessionization */}
      <Accordion title="Sessionization Logic — how to turn events into watch sessions">
        <div className="rounded-lg overflow-hidden" style={{ background: "#1a1b26" }}>
          <div className="flex justify-end p-2"><CopyButton text={SESSIONIZATION} /></div>
          <pre className="px-4 pb-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap"><code style={{ color: "#a9b1d6" }}>{SESSIONIZATION}</code></pre>
        </div>
      </Accordion>

      {/* Bronze/Silver/Gold */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-base font-bold mb-3" style={{ color: "var(--text)" }}>Bronze / Silver / Gold Lakehouse</h2>
        <div className="space-y-4">
          {LAKEHOUSE_TABLES.map((layer) => (
            <div key={layer.layer} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${layer.color}30` }}>
              <div className="px-4 py-3 flex items-center gap-3" style={{ background: layer.bg + "40" }}>
                <span className="text-sm font-bold px-2 py-0.5 rounded" style={{ background: layer.bg, color: layer.color }}>{layer.layer}</span>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{layer.purpose}</p>
              </div>
              <div className="divide-y" style={{ borderColor: `${layer.color}20` }}>
                {layer.tables.map((tbl) => (
                  <div key={tbl.name} className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <code className="text-xs font-mono font-bold" style={{ color: layer.color }}>{tbl.name}</code>
                    <span className="text-xs" style={{ color: "var(--text-faint)" }}>Partition: {tbl.partition}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{tbl.notes}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data quality */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-base font-bold mb-3" style={{ color: "var(--text)" }}>Data Quality Checks</h2>
        <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                {["Check", "Severity", "Action on failure"].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 font-bold" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DQ_CHECKS.map((c, i) => {
                const sColor = c.severity === "Critical" ? "#ef4444" : c.severity === "High" ? "#f97316" : c.severity === "Medium" ? "#f59e0b" : "#10b981";
                return (
                  <tr key={i} style={{ borderBottom: i < DQ_CHECKS.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td className="py-2 px-3" style={{ color: "var(--text)" }}>{c.check}</td>
                    <td className="py-2 px-3"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${sColor}15`, color: sColor }}>{c.severity}</span></td>
                    <td className="py-2 px-3" style={{ color: "var(--text-muted)" }}>{c.action}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code snippets */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-base font-bold mb-3" style={{ color: "var(--text)" }}>Code Snippets</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(CODE_SNIPPETS).map(([key, s]) => (
            <button
              key={key}
              onClick={() => setActiveSnippet(key)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: activeSnippet === key ? "rgba(16,185,129,0.15)" : "var(--bg)", color: activeSnippet === key ? "#10b981" : "var(--text-muted)", border: `1px solid ${activeSnippet === key ? "#10b981" : "var(--border)"}`, cursor: "pointer" }}
            >
              {s.label.replace(/^[^:]+:\s/, "")}
            </button>
          ))}
        </div>
        {activeSnippet && CODE_SNIPPETS[activeSnippet] && (
          <div className="rounded-lg overflow-hidden" style={{ background: "#1a1b26" }}>
            <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-xs font-bold" style={{ color: "#a9b1d6" }}>{CODE_SNIPPETS[activeSnippet].label}</span>
              <CopyButton text={CODE_SNIPPETS[activeSnippet].code} />
            </div>
            <pre className="p-4 text-xs leading-relaxed overflow-x-auto"><code style={{ color: "#a9b1d6" }}>{CODE_SNIPPETS[activeSnippet].code}</code></pre>
          </div>
        )}
      </div>

      {/* Senior/Staff depth */}
      {seniorDepth && (
        <div className="rounded-xl p-5" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid #8b5cf640" }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>Senior/Staff Depth</span>
            <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>Scale decisions and advanced patterns</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "Exactly-once semantics", body: "Kafka idempotent producer (enable.idempotence=true) + Flink exactly-once checkpoint with Kafka transactions. For Spark: at-least-once delivery + Iceberg MERGE INTO for deduplication. True exactly-once end-to-end requires coordinated commits — expensive. Most Netflix pipelines use at-least-once + dedup by event_id." },
              { title: "Iceberg table maintenance", body: "Run rewrite_data_files daily to compact small files (streaming writes create many small files). Use Z-ordering on content_id + country for Gold tables — cuts query scan cost by 70–80%. Snapshot expiry: keep 30 snapshots for time-travel. Orphan file cleanup weekly." },
              { title: "Handling schema evolution", body: "Avro schema registry with BACKWARD_TRANSITIVE compatibility. Adding optional fields is safe. Removing fields or changing types requires a new schema version. Consumers must tolerate missing optional fields with defaults. Never break the event_id or event_ts fields." },
              { title: "Hot partition mitigation", body: "A viral title creating 10M events/min on one Kafka partition causes consumer lag. Solutions: (1) salt the content_id for heartbeat-events (content_id + random(0..9) as compound key), (2) separate high-volume titles into a dedicated topic, (3) monitor partition skew and alert at 10x average." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <p className="text-sm font-bold mb-2" style={{ color: "#8b5cf6" }}>{item.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final answers */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-base font-bold mb-1" style={{ color: "var(--text)" }}>Final Spoken Answer</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Copy the version that matches your available time.</p>
        <div className="space-y-3">
          {(Object.entries(FINAL_DATA_ANSWERS) as [string, string][]).map(([duration, text]) => (
            <div key={duration} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "rgba(16,185,129,0.08)" }}>
                <span className="text-xs font-bold" style={{ color: "#10b981" }}>{duration} version</span>
                <button
                  onClick={() => copy(text, duration)}
                  className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
                  style={{ background: copyAnswer === duration ? "#22c55e" : "transparent", color: copyAnswer === duration ? "#fff" : "#10b981", border: "1px solid #10b981", cursor: "pointer" }}
                >
                  {copyAnswer === duration ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap" style={{ background: "var(--bg)", color: "var(--text)" }}>{text}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export { DataEngineeringTrackTab };
