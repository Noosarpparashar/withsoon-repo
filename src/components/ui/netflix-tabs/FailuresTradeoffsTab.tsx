"use client";

import { useState } from "react";
import type { Role } from "@/components/ui/NetflixPage";

function SayThisBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #10b981" }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ background: "rgba(16,185,129,0.1)" }}>
        <span className="text-xs font-bold" style={{ color: "#10b981" }}>💬 Say this in interview</span>
        <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
          className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
          style={{ background: copied ? "#22c55e" : "transparent", color: copied ? "#fff" : "#10b981", border: "1px solid #10b981", cursor: "pointer" }}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="px-4 py-3 text-sm leading-relaxed" style={{ background: "var(--bg)", color: "var(--text)" }}>{text}</div>
    </div>
  );
}

const BACKEND_FAILURES = [
  {
    component: "Auth Service down",
    mode: "fail-closed",
    impact: "All playback requests fail. Cannot verify identity without auth.",
    detection: "Health check failure, circuit breaker opens after 5 failures in 10s",
    mitigation: "Multi-AZ deployment, auto-scaling. Short-lived JWTs (15 min) mean cached tokens can serve for a window. Redis revocation list still works without auth service.",
    tradeoff: "Fail closed here is necessary — we cannot play content for unverified users.",
    sayThis: "Auth fails closed. We cannot verify identity without it, and playing content to an unidentified user risks license violations. Multi-AZ deployment and auto-scaling are the mitigations.",
  },
  {
    component: "Subscription Service timeout",
    mode: "fail-open",
    impact: "Playback allowed without subscription check. User may watch without valid subscription.",
    detection: "Timeout > 150ms → skip billing check, flag for async reconciliation",
    mitigation: "Allow playback, audit async. Better to give a free play than block all 60M users.",
    tradeoff: "Fail open is a deliberate business choice. A subscription outage should not black out all Netflix.",
    sayThis: "Subscription fails open deliberately. Netflix would rather grant a free play than block 60 million users during a billing outage. The access is reconciled asynchronously.",
  },
  {
    component: "DRM Service unavailable",
    mode: "fail-closed",
    impact: "Premium content cannot be played. Client cannot decrypt without a valid license.",
    detection: "DRM license request fails → return 503 to client",
    mitigation: "No fallback — DRM is a legal requirement from studio contracts. Multi-AZ DRM service is the only mitigation.",
    tradeoff: "This is one of the few cases where a worse user experience is legally mandatory.",
    sayThis: "DRM fails closed — this is a content licensing requirement, not a reliability choice. Studio contracts require a valid device-bound license. No fallback is possible.",
  },
  {
    component: "Concurrency Service / Redis down",
    mode: "configurable",
    impact: "Cannot enforce concurrent stream limits. Users may exceed their plan limit.",
    detection: "Redis connection error, circuit breaker triggers",
    mitigation: "Business decision: fail open (allow playback, risk over-limit) or fail closed (deny, block users). Netflix tends toward fail open for non-DRM content.",
    tradeoff: "Over-limit streams are recoverable. Blocking all streams is a worse experience.",
    sayThis: "When Redis is down, we have a binary choice: fail open and accept some over-limit streams, or fail closed and block everyone. Netflix's philosophy is fail open — over-limit for 30 seconds is better than no streams.",
  },
  {
    component: "EVCache (metadata cache) down",
    mode: "fail-open",
    impact: "All metadata reads fall through to Cassandra. Cassandra gets 1000x normal read load.",
    detection: "Cache miss rate spikes from 0.1% to 100%. Cassandra latency rises within minutes.",
    mitigation: "Read from Cassandra directly. Cascade: cache rebuilds on next hit. Implement circuit breaker on Cassandra reads to prevent cascade failure.",
    tradeoff: "Cache miss doesn't break the product — it just degrades latency and load. Prepare Cassandra read replicas for this scenario.",
    sayThis: "EVCache is a read-through cache — misses fall through to Cassandra, never to an error. The risk: without the cache, Cassandra sees 300x the normal read traffic and may saturate within minutes.",
  },
  {
    component: "Playback Service timeout",
    mode: "fail-open",
    impact: "Playback session cannot be created. User sees buffering or error.",
    detection: "Circuit breaker opens after 5 failures/10s",
    mitigation: "Return cached stale manifest if available. Degraded quality stream beats black screen.",
    tradeoff: "Stale manifest may point to an OCA node that has moved content, but the client will retry.",
    sayThis: "Playback fails open — a degraded stream beats a black screen. We serve a stale or lower-quality manifest rather than returning 503. The circuit breaker uses Resilience4j: 5 failures in 10s → OPEN for 30s.",
  },
  {
    component: "CDN / OCA node failure",
    mode: "fail-open",
    impact: "Video segments unavailable from that OCA node. Client experiences buffering.",
    detection: "Client TCP timeout → retry logic in client player",
    mitigation: "Client retries to parent OCA cluster → origin S3 fallback. Manifest Service can redirect to alternate OCA.",
    tradeoff: "Origin fallback has higher latency but always works. CDN failure is transparent to the API layer.",
    sayThis: "OCA failure is transparent to API servers. The client has its own retry and fallback logic. A failed OCA cascades to parent cluster, then to S3 origin as last resort.",
  },
  {
    component: "Duplicate playback session creation",
    mode: "idempotent",
    impact: "Client retries create duplicate sessions. Concurrency count becomes inaccurate.",
    detection: "session_id dedup check in Playback Service",
    mitigation: "Idempotency key: client-generated session_id. Server returns same response for duplicate session_id with same parameters.",
    tradeoff: "All session creation must be idempotent on client-provided session_id.",
    sayThis: "Session creation is idempotent on the client-generated session_id. A retry returns the same session instead of creating a second one. This prevents concurrency count inflation.",
  },
  {
    component: "Heartbeat events lost (network drop)",
    mode: "graceful degradation",
    impact: "Session TTL in Redis expires after 45s. Concurrency slot auto-released. Watch progress up to 30s stale.",
    detection: "Redis TTL expiry (automatic)",
    mitigation: "45s TTL (30s interval + 15s grace). Client retries heartbeat on reconnect. Position staleness acceptable.",
    tradeoff: "30-second staleness on resume is acceptable. Premature slot release may cause a brief re-authentication on resume.",
    sayThis: "Heartbeat loss is designed for. The 45s TTL (30s interval + 15s grace) handles brief network drops. Longer drops release the concurrency slot and require the user to restart their session.",
  },
  {
    component: "Database hotspot on popular content",
    mode: "cache mitigation",
    impact: "Popular title creates read hotspot on Cassandra partition.",
    detection: "Cassandra partition read latency P99 spikes on hot content_id",
    mitigation: "EVCache handles 99.9% of reads. For new releases: proactive cache pre-warming. Cache stampede prevention: mutex lock on miss.",
    tradeoff: "Hotspot is a cache problem, not a Cassandra problem. Don't partition content_metadata by popularity.",
    sayThis: "Hot title read traffic is absorbed by EVCache. For major releases, we pre-warm the cache before release time. Cache stampede on miss is prevented by a mutex lock — only one reader fetches from Cassandra.",
  },
];

const DATA_FAILURES = [
  {
    component: "Kafka broker failure",
    rootCause: "Broker hardware failure or network partition",
    detection: "Kafka under-replicated partition alert, consumer lag spike",
    fix: "Kafka leader election (< 30s). Under-replicated partitions recover when broker returns. RF=3 means one broker failure doesn't lose data.",
    preventive: "RF=3, min.insync.replicas=2, unclean.leader.election=false",
    sayThis: "Kafka RF=3 tolerates one broker failure without data loss. unclean.leader.election=false prevents a lagging broker from becoming leader and creating a gap. The tradeoff is slightly higher producer latency.",
  },
  {
    component: "Kafka consumer lag growing",
    rootCause: "Slow processing, upstream traffic spike, consumer group rebalance",
    detection: "consumer_group_lag metric exceeds threshold (e.g., 1M messages)",
    fix: "Scale consumer group (add consumers up to partition count). Investigate slow processing path.",
    preventive: "Monitor lag as primary SLA metric. Set partition count high enough for future scaling.",
    sayThis: "Consumer lag is the most important Kafka health metric. If lag grows, add consumers up to the partition count. Beyond that, you need more partitions — and that requires a plan because repartitioning is disruptive.",
  },
  {
    component: "Schema evolution break",
    rootCause: "Producer changed schema without backward compatibility check",
    detection: "Consumer deserialization errors spike. DLQ fills rapidly.",
    fix: "Roll back producer schema. Replay DLQ events after schema fix.",
    preventive: "Schema Registry with BACKWARD_TRANSITIVE enforcement. Reject incompatible schema on producer startup.",
    sayThis: "Schema Registry prevents this at the source. BACKWARD_TRANSITIVE means consumers can read any older schema version. The registry rejects incompatible schema registrations before any data is produced.",
  },
  {
    component: "Duplicate events",
    rootCause: "Producer retry without idempotency, consumer reprocessing after checkpoint failure",
    detection: "Duplicate rate metric in DQ checks exceeds 0.1% threshold",
    fix: "Deduplicate by event_id in Silver layer. Do not fix in Bronze — Bronze is immutable.",
    preventive: "Kafka idempotent producer (enable.idempotence=true). Flink exactly-once checkpointing.",
    sayThis: "Duplicates are expected — the question is where to handle them. Bronze keeps duplicates (immutable). Silver deduplicates by event_id. Never count raw Bronze records for business metrics.",
  },
  {
    component: "Late events beyond watermark",
    rootCause: "Client network latency, device clock skew, app backgrounded",
    detection: "event_ts vs ingest_ts gap > watermark threshold",
    fix: "Route late events to DLQ. Run batch reconciliation job daily to incorporate late events into Silver.",
    preventive: "30-minute watermark for heartbeats. Monitor late event rate. Set allowed lateness appropriately.",
    sayThis: "Late events beyond the watermark go to a DLQ, not the void. A daily batch reconciliation job re-processes them into Silver. The watermark is a processing boundary, not a data loss boundary.",
  },
  {
    component: "Stream processor checkpoint failure",
    rootCause: "S3 checkpoint write failure, TaskManager crash",
    detection: "Flink checkpoint failure alert, restart with last successful checkpoint",
    fix: "Flink restores from last successful checkpoint. Events since last checkpoint are reprocessed from Kafka.",
    preventive: "Checkpoint every 5 minutes. Keep Kafka retention > checkpoint interval (30 days >> 5 min).",
    sayThis: "Flink checkpointing is why we need Kafka retention longer than the checkpoint interval. On recovery, Flink reads from its last checkpoint position in Kafka. If Kafka retention is shorter, recovery is impossible.",
  },
  {
    component: "Small files problem in Iceberg",
    rootCause: "Streaming writes create many small Parquet files (1-10 MB each)",
    detection: "Query scan time grows, S3 LIST operations increase",
    fix: "Run Iceberg rewrite_data_files compaction job daily. Target 128 MB files.",
    preventive: "Schedule compaction job post-streaming. Use Z-ordering on compaction for query optimization.",
    sayThis: "Streaming writes naturally create small files — each micro-batch produces one file. Without compaction, query scan reads thousands of small files. Daily compaction merges them into 128 MB files and applies Z-ordering.",
  },
  {
    component: "Data quality failure: wrong watch hours",
    rootCause: "Counting raw heartbeats instead of sessionized watched_seconds",
    detection: "Watch hours metric is 3-5x actual. Comparison with manual sample shows discrepancy.",
    fix: "Recompute Gold from Silver sessionized tables. Fix the aggregation query.",
    preventive: "DQ check: watch hours from Gold vs sample cross-check. Never aggregate from Bronze directly.",
    sayThis: "Raw heartbeat count is NOT watch time. 60M streams × 2 heartbeats/minute × 60 minutes ≠ watch hours. You must sessionize first: sum the actual intervals between consecutive heartbeats.",
  },
  {
    component: "Hot Kafka partition (viral content)",
    rootCause: "Partitioning by content_id causes all heartbeats for a viral title to land on one partition",
    detection: "Partition byte rate skew: one partition 50x others",
    fix: "Repartition with salted key (content_id + random(0..9)) or move viral title to dedicated topic.",
    preventive: "Partition by session_id for heartbeats, not content_id. Monitor partition skew.",
    sayThis: "Partitioning by content_id is a common mistake. A viral title can generate millions of heartbeats on one partition, creating a processing bottleneck. session_id distributes load uniformly.",
  },
  {
    component: "Iceberg commit conflict",
    rootCause: "Multiple Spark/Flink jobs writing to the same Iceberg table concurrently → optimistic lock conflict",
    detection: "CommitFailedException in Spark logs, job retries spike",
    fix: "Use Iceberg's retry-on-conflict with exponential backoff. Design pipelines to write to different partitions where possible.",
    preventive: "Design Bronze writes to append-only partitions (event_date/event_hour). Avoid concurrent jobs on same partition.",
    sayThis: "Iceberg uses optimistic locking. Concurrent writers to the same snapshot will conflict. The solution: design append-only Bronze writes to non-overlapping partitions, and use retry with backoff for unavoidable conflicts.",
  },
  {
    component: "Backfill overwrites fresh data",
    rootCause: "Using INSERT OVERWRITE for backfill on a partition that also receives fresh streaming data",
    detection: "Watch hours drop suddenly after backfill completes. Fresh data from current streaming is gone.",
    fix: "Use MERGE INTO (upsert) instead of INSERT OVERWRITE. Backfill updates existing rows, does not replace entire partitions.",
    preventive: "Policy: never use INSERT OVERWRITE on Silver/Gold tables. Always MERGE INTO. Validate backfill impact in staging first.",
    sayThis: "INSERT OVERWRITE is dangerous when streaming is writing to the same partition. Use MERGE INTO for backfill to update or insert individual rows without destroying concurrent fresh data.",
  },
  {
    component: "Dashboard shows wrong metrics",
    rootCause: "Gold table queries run before Silver compaction finishes, or Gold aggregation query logic is wrong",
    detection: "Watch hours from Gold < watch hours from direct Silver query. Discrepancy > 1% is a signal.",
    fix: "Add data freshness column to Gold tables (gold_computed_at). BI tools should display 'data as of' timestamp. Alert on staleness.",
    preventive: "Gold job runs after Silver job completes (dependency chain). Add metric validation: Gold total ≈ Silver total.",
    sayThis: "Trust the pipeline dependency chain. Gold reads from Silver — if Silver isn't done, Gold is stale. Every Gold table should expose a data_freshness_ts so dashboards can warn users if data is old.",
  },
  {
    component: "DLQ grows suddenly",
    rootCause: "Schema change in producer causes consumer deserialization failures, or upstream bug causes invalid events",
    detection: "DLQ topic consumer lag grows. dead_letter_events counter spikes.",
    fix: "Alert immediately — DLQ growth is not normal. Investigate root cause. Fix producer or consumer, then replay DLQ.",
    preventive: "Schema Registry with BACKWARD_TRANSITIVE prevents schema breaks at source. Monitor DLQ lag as a primary SLA metric.",
    sayThis: "A growing DLQ is an alert, not a feature. Every event in the DLQ represents data that won't appear in your metrics until it's replayed. The DLQ is a safety net, not a trash bin.",
  },
  {
    component: "Out-of-order events",
    rootCause: "Events from the same session arrive in different Kafka partitions, or client clock skew",
    detection: "Sessionization logic produces incorrect watched_seconds (negative intervals or impossible gaps)",
    fix: "Always process by event_ts (event time), not ingest_ts (processing time). Sort within session window before computing intervals.",
    preventive: "Partition by session_id to keep session events on same partition. Use Flink event-time processing.",
    sayThis: "Out-of-order events are a property of distributed systems, not an exception. Design your sessionization to use event_ts and sort within the session window. Relying on arrival order will produce wrong watch times.",
  },
];

const TRADEOFF_CARDS = [
  {
    title: "Strong vs Eventual Consistency",
    optionA: "Strong consistency (MySQL, Redis Lua)",
    optionB: "Eventual consistency (Cassandra ONE)",
    whenA: "Billing data, concurrency limits, DRM state — any place where inconsistency causes money loss or access violation",
    whenB: "Watch progress, metadata reads, recommendations — where a 30-second staleness is acceptable",
    netflixAnswer: "Netflix uses strong consistency only where it's legally or financially mandatory. Everything else is eventual. The concurrency service uses Redis (strong). Watch progress uses Cassandra (eventual). This is explicit and intentional.",
    mistake: "Making everything strongly consistent 'to be safe' destroys write throughput. 2M heartbeat writes/sec on a strongly consistent store is impossible.",
    color: "#3b82f6",
  },
  {
    title: "Redis vs Cassandra for Concurrency State",
    optionA: "Redis (chosen for concurrency limit)",
    optionB: "Cassandra",
    whenA: "Concurrency limits, session locks, rate counters — anything requiring atomic check-and-set",
    whenB: "Watch history, session records, metadata — high-throughput writes where eventual consistency is fine",
    netflixAnswer: "Concurrency limit uses Redis because Cassandra is eventually consistent — two devices starting simultaneously would both pass a Cassandra-based check. Redis Lua script is atomic.",
    mistake: "Using Cassandra for concurrency limits. Users on a 2-stream plan can start a 3rd stream during Cassandra replication lag.",
    color: "#ef4444",
  },
  {
    title: "Kafka vs Kinesis",
    optionA: "Kafka (Netflix's choice)",
    optionB: "AWS Kinesis",
    whenA: "Netflix scale: 700B events/day, 15M/sec peak, ML retraining requires 90-day replay",
    whenB: "AWS-native teams, smaller scale, simpler ops without dedicated Kafka expertise",
    netflixAnswer: "Kafka supports consumer replay from any offset, custom partition strategies, and 30+ day retention. Kinesis has 7-day max retention and no replay. When ML models need 90 days of events to retrain, Kafka makes that free.",
    mistake: "Choosing Kinesis for Netflix-scale replay requirements. 7-day max retention makes historical reprocessing impossible.",
    color: "#f59e0b",
  },
  {
    title: "Spark Streaming vs Flink",
    optionA: "Spark Structured Streaming",
    optionB: "Apache Flink",
    whenA: "Bronze→Silver ETL, lakehouse writes, large aggregations, batch + streaming unification",
    whenB: "Real-time sessionization, sub-second latency, stateful processing, exactly-once with low overhead",
    netflixAnswer: "Netflix uses both. Spark for bulk ETL to Iceberg (micro-batch is fine, easier ops). Flink for real-time sessionization where event-time ordering and exactly-once matter.",
    mistake: "Choosing one and ignoring the other. They have different strengths. Using Flink for all Iceberg writes adds unnecessary complexity.",
    color: "#10b981",
  },
  {
    title: "Iceberg vs Delta Lake vs Hive",
    optionA: "Apache Iceberg (Netflix's choice)",
    optionB: "Delta Lake / Hive",
    whenA: "Engine-agnostic (Spark + Trino + Flink on same tables), time-travel, schema evolution without rewrites",
    whenB: "Databricks shops (Delta), existing Hive catalogs with migration cost concern",
    netflixAnswer: "Netflix open-sourced Iceberg. Key feature: engine-agnostic — Spark, Trino, and Flink all read Iceberg natively. Time-travel for debugging ML training data. Hidden partitioning prevents partition skew errors.",
    mistake: "Delta Lake is Databricks-coupled. If Netflix switches from Spark to Trino for ad-hoc queries, Delta is harder to use without Databricks.",
    color: "#8b5cf6",
  },
  {
    title: "Exactly-once vs At-least-once",
    optionA: "Exactly-once (Flink + Kafka transactions)",
    optionB: "At-least-once + dedup by event_id",
    whenA: "Financial aggregations, billing events, anything where double-counting causes money errors",
    whenB: "Watch hours, buffering metrics, most analytics — dedup by event_id achieves the same result at lower cost",
    netflixAnswer: "Netflix uses at-least-once delivery + event_id deduplication for most pipelines. True exactly-once requires coordinated Kafka transactions + Flink checkpoints — expensive and complex. Dedup achieves effectively-once at much lower cost.",
    mistake: "Assuming exactly-once is always needed. For watch hour metrics, at-least-once + dedup gives the same result at 10x lower complexity.",
    color: "#06b6d4",
  },
  {
    title: "Batch vs Streaming for Analytics",
    optionA: "Streaming (Flink/Spark Streaming)",
    optionB: "Batch (daily Spark job)",
    whenA: "Real-time active user count, live dashboards, immediate content quality alerts",
    whenB: "Daily watch hours, content completion rate, most business metrics with hourly/daily SLA",
    netflixAnswer: "Most Netflix analytics are batch. A daily Spark job computing watch hours for yesterday is 100x simpler than real-time streaming. Streaming is reserved for metrics that need sub-minute freshness.",
    mistake: "Streaming everything by default. Real-time adds operational complexity, cost, and late-event handling. Use streaming only when the latency requirement actually demands it.",
    color: "#a855f7",
  },
  {
    title: "CDN Own vs Commercial",
    optionA: "Open Connect (Netflix's own CDN)",
    optionB: "Akamai / Cloudflare",
    whenA: "Netflix scale: 300 Tbps, ISP partnerships, custom cache eviction, pre-position content before release",
    whenB: "Smaller scale where CDN build cost > CDN usage cost. Early-stage products.",
    netflixAnswer: "At 300 Tbps, commercial CDN transit fees exceed the cost of building and operating OCA hardware. Netflix places OCA appliances inside ISP networks, eliminating transit fees entirely.",
    mistake: "Proposing to build your own CDN in a normal system design. The scale justification must exist. For most companies, Cloudflare or Akamai is the right answer.",
    color: "#f97316",
  },
  {
    title: "Partition by Date vs Content vs User",
    optionA: "Partition by event_date",
    optionB: "Partition by content_id or profile_id",
    whenA: "Bronze/Silver lakehouse writes — every batch is time-bounded. Compaction and expiry are time-based. Query 'all events from yesterday' prunes perfectly.",
    whenB: "Gold aggregation tables where the primary query is 'all watch hours for content X' — partition by content_id. User activity tables — partition by profile_id.",
    netflixAnswer: "Bronze and Silver partition by event_date. Gold aggregation tables partition by the dominant query dimension. Don't use the same partition strategy for all layers.",
    mistake: "Using content_id as partition for raw Bronze events. Popular titles create hot partitions. Streaming writes to one partition for Stranger Things launch would saturate that partition.",
    color: "#84cc16",
  },
  {
    title: "API Sync Call vs Async Event",
    optionA: "Synchronous API call",
    optionB: "Async event via Kafka",
    whenA: "Operations that need immediate response: playback authorization, DRM license, subscription check. User is waiting.",
    whenB: "Operations where the caller doesn't need the result immediately: watch progress update, analytics events, recommendation model updates.",
    netflixAnswer: "Netflix mixes both explicitly. Playback authorization is synchronous (user waits). Watch progress updates are asynchronous via heartbeat events (user doesn't need confirmation). Mixing consciously reduces coupling and improves throughput.",
    mistake: "Making watch progress updates synchronous in the critical playback path. 2M writes/sec would add 50ms+ to every session start if handled synchronously.",
    color: "#06b6d4",
  },
];

function FailuresTradeoffsTab({ role }: { role: Role }) {
  const [subTab, setSubTab] = useState<"failures" | "tradeoffs">("failures");
  const [failureRole, setFailureRole] = useState<Role>(role);
  const [openFailure, setOpenFailure] = useState<string | null>(null);
  const [openTradeoff, setOpenTradeoff] = useState<string | null>(null);

  const failures = failureRole === "Backend Engineer" ? BACKEND_FAILURES : DATA_FAILURES;

  return (
    <div className="space-y-6">
      {/* Header + sub-tabs */}
      <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Failures + Tradeoffs</h2>
          <div className="flex gap-1 p-1 rounded-xl ml-auto" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            {[["failures", "Failure Scenarios"], ["tradeoffs", "Technology Tradeoffs"]].map(([key, label]) => (
              <button key={key} onClick={() => setSubTab(key as "failures" | "tradeoffs")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: subTab === key ? "rgba(59,130,246,0.15)" : "transparent", color: subTab === key ? "#3b82f6" : "var(--text-muted)", cursor: "pointer", border: "none" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {subTab === "failures" && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>Failure Scenarios</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Click any failure to see impact, detection, mitigation, and what to say in interview.</p>
            </div>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              {(["Backend Engineer", "Data Engineer"] as Role[]).map((r) => (
                <button key={r} onClick={() => setFailureRole(r)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: failureRole === r ? (r === "Backend Engineer" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)") : "transparent", color: failureRole === r ? (r === "Backend Engineer" ? "#3b82f6" : "#10b981") : "var(--text-muted)", cursor: "pointer", border: "none" }}>
                  {r.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {failures.map((item) => {
              const key = item.component;
              const isOpen = openFailure === key;
              const modeColor = "mode" in item && item.mode === "fail-closed" ? "#ef4444" : "mode" in item && item.mode === "fail-open" ? "#10b981" : "#f59e0b";
              const modeLabel = "mode" in item ? item.mode.replace("-", " ").toUpperCase() : "DEGRADED";

              return (
                <div key={key} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between px-4 py-3.5 cursor-pointer"
                    style={{ background: "var(--bg)" }}
                    onClick={() => setOpenFailure(isOpen ? null : key)}
                    role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpenFailure(isOpen ? null : key)}>
                    <div className="flex items-center gap-3 min-w-0">
                      {"mode" in item && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded shrink-0"
                          style={{ background: `${modeColor}15`, color: modeColor }}>
                          {modeLabel}
                        </span>
                      )}
                      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{key}</span>
                    </div>
                    <span className="text-xs shrink-0 ml-4 transition-transform duration-200" style={{ color: "var(--text-faint)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                        {"impact" in item && <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-faint)" }}>User impact</div>
                          <div className="text-sm" style={{ color: "var(--text-muted)" }}>{item.impact}</div>
                        </div>}
                        {"rootCause" in item && <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-faint)" }}>Root cause</div>
                          <div className="text-sm" style={{ color: "var(--text-muted)" }}>{item.rootCause}</div>
                        </div>}
                        <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-faint)" }}>Detection</div>
                          <div className="text-sm" style={{ color: "var(--text-muted)" }}>{"detection" in item ? item.detection : "—"}</div>
                        </div>
                        <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-faint)" }}>{"mitigation" in item ? "Mitigation" : "Fix"}</div>
                          <div className="text-sm" style={{ color: "var(--text-muted)" }}>{"mitigation" in item ? item.mitigation : ("fix" in item ? item.fix : "")}</div>
                        </div>
                      </div>
                      {"preventive" in item && (
                        <div className="rounded-lg p-3" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
                          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "#10b981" }}>Preventive design</div>
                          <div className="text-sm" style={{ color: "var(--text-muted)" }}>{item.preventive}</div>
                        </div>
                      )}
                      {"tradeoff" in item && (
                        <div className="rounded-lg p-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "#f59e0b" }}>Tradeoff</div>
                          <div className="text-sm" style={{ color: "var(--text-muted)" }}>{item.tradeoff}</div>
                        </div>
                      )}
                      <SayThisBlock text={item.sayThis} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === "tradeoffs" && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>Technology Tradeoffs</h3>
          <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
            Why Netflix chose each technology — and what it rejected. Senior engineers are expected to justify choices, not just name them.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {TRADEOFF_CARDS.map((item) => {
              const isOpen = openTradeoff === item.title;
              return (
                <div key={item.title} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isOpen ? `${item.color}40` : "var(--border)"}` }}>
                  <div className="px-4 py-4 cursor-pointer"
                    style={{ background: "var(--bg)" }}
                    onClick={() => setOpenTradeoff(isOpen ? null : item.title)}
                    role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpenTradeoff(isOpen ? null : item.title)}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>{item.title}</h3>
                        <p className="text-xs" style={{ color: item.color }}>✓ {item.optionA}</p>
                      </div>
                      <span className="text-xs shrink-0 mt-1 transition-transform duration-200" style={{ color: "var(--text-faint)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
                        <div className="rounded-lg p-3" style={{ background: `${item.color}08`, border: `1px solid ${item.color}25` }}>
                          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: item.color }}>Use {item.optionA.split(" ")[0]} when</div>
                          <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.whenA}</div>
                        </div>
                        <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-faint)" }}>Use {item.optionB.split(" ")[0]} when</div>
                          <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.whenB}</div>
                        </div>
                      </div>
                      <div className="rounded-lg p-3" style={{ background: "rgba(229,9,20,0.06)", border: "1px solid rgba(229,9,20,0.15)" }}>
                        <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "#e50914" }}>Netflix answer</div>
                        <div className="text-sm" style={{ color: "var(--text-muted)" }}>{item.netflixAnswer}</div>
                      </div>
                      <div className="rounded-lg p-3" style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}>
                        <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "#7f1d1d" }}>Common mistake</div>
                        <div className="text-sm" style={{ color: "#991b1b" }}>{item.mistake}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export { FailuresTradeoffsTab };
