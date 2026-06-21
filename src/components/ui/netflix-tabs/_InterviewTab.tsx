"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { Role } from "./types";

type Difficulty = "Medium" | "Hard";

type QA = {
  id: number;
  q: string;
  short: string;
  detail: string;
  component: string;
  tradeoff: string;
  mistake: string;
  finalLine: string;
  difficulty: Difficulty;
  isTrap?: boolean;
};

const BACKEND_QA: QA[] = [
  { id: 1, q: "How would you design Netflix playback?", difficulty: "Hard", component: "Playback Service", short: "10-service chain: Gateway→Auth→Subscription→Concurrency→Playback→DRM→Manifest→CDN. Watch progress via heartbeats.", detail: "Client calls POST /v1/playback/sessions. Gateway validates JWT. Auth verifies identity. Subscription checks plan. Concurrency (Redis atomic Lua) checks active streams. Playback Service orchestrates DRM license + Manifest URL. Client streams directly from CDN. Every 30s: heartbeat updates watch progress in Cassandra.", tradeoff: "DRM fails closed (legal). Billing fails open (availability). Concurrency uses Redis (strong consistency needed).", mistake: "Designing frontend. Missing concurrency check. Treating all traffic as API traffic (95% is CDN-direct).", finalLine: "I designed the playback backend as a 10-service orchestration chain where DRM is the only fail-closed service, and 95% of bytes flow CDN-direct after manifest delivery." },
  { id: 2, q: "How do you handle resume watching across devices?", difficulty: "Medium", component: "Watch Progress", short: "Cassandra watch_progress (profile_id PK, content_id CK). Heartbeat every 30s. Last-write-wins. Eventually consistent.", detail: "Client sends heartbeat every 30s with position_sec. Watch Progress Service upserts (profile_id, content_id) → position_sec. When user resumes on a different device, the latest position is served. Consistency: ONE write — eventual consistency acceptable.", tradeoff: "Eventual consistency: 30-second staleness is acceptable for resume. Strong consistency here would require quorum writes — doesn't scale to 2M writes/sec.", mistake: "Using MySQL for watch_progress. MySQL can't handle 2M writes/sec on this access pattern.", finalLine: "Resume watching uses eventual consistency deliberately. The tradeoff is a 30-second staleness window — which is invisible to the user." },
  { id: 3, q: "How do you prevent more streams than allowed by plan?", difficulty: "Hard", component: "Concurrency Service", isTrap: true, short: "Redis SET per account. Atomic Lua script: check SCARD < max → SADD + EXPIRE. TTL = 45s, refreshed by heartbeat.", detail: "Redis key: account:{id}:streams stores a SET of active session_ids. On playback start: Lua script atomically checks count < max_streams and adds session_id. TTL is 45s (30s interval + 15s grace). On heartbeat: reset TTL. On session end: SREM. If TTL expires without heartbeat → slot auto-released.", tradeoff: "Must use Redis (strong consistency). Cassandra would allow over-limit streams during replication lag.", mistake: "Using Cassandra for concurrency state. Check-then-add is not atomic in Cassandra.", finalLine: "Concurrency limit is one of the few places where strong consistency is mandatory. Redis Lua script provides atomic check-and-set that Cassandra cannot." },
  { id: 4, q: "How do you design playback APIs?", difficulty: "Medium", component: "API Design", short: "POST /playback/sessions (idempotent on client session_id), POST /heartbeat (deduped), DELETE /sessions/{id}.", detail: "Three core APIs: POST to start session (returns manifest_url, drm_license_url, heartbeat_interval_sec). POST for heartbeat (idempotent by session_id+event_ts). DELETE to end session. All require JWT. Rate limited: 100/min per profile for session start.", tradeoff: "Idempotency on client-generated session_id prevents duplicate session creation on retries.", mistake: "Not making session creation idempotent. Retries on network failures would inflate concurrency count.", finalLine: "Every mutating playback API is idempotent by design. A client retry on network failure returns the same response without creating a new session." },
  { id: 5, q: "How do you handle CDN failure?", difficulty: "Medium", component: "CDN / Open Connect", short: "OCA node failure → client retries to parent cluster → S3 origin. CDN failure is invisible to API servers.", detail: "Client has built-in retry and fallback in the video player. OCA node down → retry parent OCA cluster. Parent cluster down → origin S3. Manifest Service can re-issue manifest pointing to alternate OCA. CDN failures don't break API layer — the manifest URL is a pointer, not a stream.", tradeoff: "Origin S3 fallback has higher latency but ensures availability. CDN failure is transparent to API servers.", mistake: "Treating CDN failure as an API problem. The manifest URL is the handoff point — the client handles CDN failover.", finalLine: "Open Connect failure is handled client-side through the adaptive retry in the video player. The API layer is completely decoupled from CDN health." },
  { id: 6, q: "How do you cache metadata effectively?", difficulty: "Medium", component: "EVCache / Metadata", short: "EVCache (Memcached) in front of Cassandra. Read-through. Write-invalidate on content update. TTL 1 hour.", detail: "EVCache at 30M req/s with 99.9% hit rate. Read-through: cache miss falls through to Cassandra, result cached. Write-invalidate: on content rights change, invalidate cache key. Cache stampede prevention: mutex lock on miss so only one reader fetches from Cassandra.", tradeoff: "Cache hit rate drop of 0.1% = 30K extra Cassandra reads/sec. Monitor cache hit ratio as a critical metric.", mistake: "Not discussing cache invalidation. When content becomes unavailable in a region, stale metadata could show it as available.", finalLine: "Metadata caching is the single biggest lever for Cassandra read load. EVCache absorbs 30M req/s at 99.9% hit rate — without it, Cassandra saturates instantly." },
  { id: 7, q: "What data must be strongly consistent? What can be eventually consistent?", difficulty: "Hard", component: "Consistency Model", isTrap: true, short: "Strong: billing, concurrency limits, DRM state. Eventual: watch progress, metadata reads, recommendations.", detail: "Strong consistency (MySQL/Redis): billing — double charge is unacceptable. Concurrency limit — over-limit violates business contract. DRM state — legal requirement. Eventual consistency (Cassandra ONE): watch progress — 30s staleness is fine. Content metadata — stale for seconds is invisible. Recommendations — personalization lag of minutes is fine.", tradeoff: "Applying strong consistency everywhere destroys write throughput. 2M watch progress writes/sec at QUORUM would require 10x more Cassandra nodes.", mistake: "Making everything strongly consistent for safety. Over-engineering consistency leads to unscalable write throughput.", finalLine: "Consistency is a design choice, not a default. Apply strong consistency only where inconsistency has monetary or legal consequences." },
  { id: 8, q: "How do you prevent duplicate playback sessions?", difficulty: "Medium", component: "Playback Service", short: "Client generates session_id UUID. Server is idempotent on this key. Duplicate returns same response, not a new session.", detail: "Client generates a UUID session_id before calling POST /v1/playback/sessions. Server inserts with IF NOT EXISTS semantics (Cassandra LWT or Redis NX). Duplicate request returns the existing session. Concurrency count not inflated.", tradeoff: "Client-generated IDs require the client to be trusted for uniqueness. UUIDs are sufficient — collision probability is negligible.", mistake: "Server-generated session IDs make retries non-idempotent. A retry after network failure creates a second session.", finalLine: "Client-generated session_id as idempotency key converts a retry-dangerous operation into a safe, idempotent one." },
  { id: 9, q: "How do you handle millions of heartbeat writes per second?", difficulty: "Hard", component: "Watch Progress", short: "2M writes/sec → Cassandra with ONE consistency. Partition by profile_id. Heartbeat is an upsert — no read required.", detail: "write_progress is a Cassandra table partitioned by profile_id, clustered by content_id. Each heartbeat is an UPDATE position_sec, last_updated_at WHERE profile_id = ? AND content_id = ? with LWT disabled (no read-before-write). Consistency: ONE. No coordination required.", tradeoff: "ONE consistency means heartbeats aren't durable across all replicas instantly. Acceptable: losing a heartbeat means resume is 30 seconds behind.", mistake: "Using MySQL for heartbeat writes. A single MySQL instance handles ~100K writes/sec. 2M/sec requires 20 shards with coordination complexity.", finalLine: "Cassandra with ONE consistency and no LWT handles 2M heartbeat writes/sec with simple horizontal scaling. Each node handles ~200K writes/sec." },
  { id: 10, q: "How do you rate limit playback APIs?", difficulty: "Medium", component: "API Gateway", short: "API Gateway rate limit: 100 sessions/min per profile, 2 heartbeats/min per session. Token bucket in Redis.", detail: "Token bucket algorithm in Redis. Key: profile:{id}:session_start, limit 100/min. Heartbeat: session:{id}:heartbeat, limit 2/min (one per 30s interval plus grace). Exceeded requests return 429. Gateway enforces, not individual services.", tradeoff: "Rate limiting at Gateway keeps individual services stateless. Redis token bucket is shared across Gateway instances.", mistake: "Rate limiting per-instance instead of globally. Each Gateway pod has its own counter — distributed users can exceed the limit.", finalLine: "Rate limiting must be distributed via Redis. Per-pod counters let users work around limits by spreading requests across instances." },
  { id: 11, q: "How do you design watch history database?", difficulty: "Medium", component: "Watch Progress", short: "Cassandra. Partition by profile_id (fetch all titles for a profile in one query). Cluster by content_id.", detail: "Access pattern: fetch all in-progress titles for profile X. Cassandra partition key = profile_id (all rows for a profile on one node). Clustering key = content_id. One row per (profile, content). Update position_sec on each heartbeat.", tradeoff: "Profile-partitioned means a query for a specific content's total watch time requires a scatter-gather across all partitions — that goes to the data pipeline, not the operational DB.", mistake: "Partitioning by content_id. Then fetching 'continue watching for user X' requires scanning all partitions.", finalLine: "The access pattern drives the partition key. 'Fetch all in-progress for profile X' maps naturally to profile_id as partition key." },
  { id: 12, q: "How do you design multi-region playback?", difficulty: "Hard", component: "Multi-region", short: "Active-active: Route53 latency routing, Cassandra multi-DC (LOCAL_QUORUM), Redis per-region, Kafka MirrorMaker2.", detail: "Three regions (us-east-1, eu-west-1, ap-south-1). Route53 latency-based routing. Cassandra multi-DC replication: writes go to local DC (LOCAL_QUORUM), replicate asynchronously to other DCs. Concurrency service: per-region Redis + eventual cross-region limit sync. CDN: regional OCA clusters.", tradeoff: "LOCAL_QUORUM means a region failure could allow over-limit concurrent streams from other regions briefly. Acceptable tradeoff.", mistake: "Forgetting that concurrency limits across regions require coordination. Two regions could each allow a stream, exceeding the global limit.", finalLine: "Multi-region requires explicit consistency decisions per service. Most data uses LOCAL_QUORUM — strong within region, eventually consistent across regions." },
  { id: 13, q: "How do you handle retries and idempotency?", difficulty: "Medium", component: "Reliability", short: "All write APIs idempotent on client-provided keys. Exponential backoff + jitter for retries. Circuit breaker on downstream calls.", detail: "Session creation: idempotent on client session_id. Heartbeat: idempotent on session_id + event_ts. DRM license: idempotent on device_id + content_id. Retries use exponential backoff with jitter (to avoid thundering herd). Downstream calls use Resilience4j circuit breaker.", tradeoff: "Idempotency requires storing or deriving deduplication keys. Storage overhead is minimal versus the reliability gain.", mistake: "Non-idempotent writes on retry-prone network paths. Mobile clients on bad connectivity will retry — if the server isn't idempotent, operations are duplicated.", finalLine: "Every write on a retry-prone path must be idempotent. The client provides the idempotency key — the server stores or derives the dedup state." },
  { id: 14, q: "How do you handle a hot title (Stranger Things S5 premiere)?", difficulty: "Hard", component: "EVCache / CDN", isTrap: true, short: "Hot titles: EVCache pre-warming, mutex lock on cache miss, separate encoding tier for popular content.", detail: "Before a major release: pre-warm EVCache with content metadata. OCA fill algorithm positions video segments near expected demand. Cache stampede on miss: single filler thread with mutex, others wait. Encoding: popular content gets higher encoding priority. Manifest Service handles surge via horizontal scaling.", tradeoff: "Pre-warming has a cost — need to predict which titles will be hot. Wrong predictions waste cache space.", mistake: "Not mentioning CDN pre-positioning. The API side scales easily. The CDN has to pre-position the actual video bytes.", finalLine: "Hot title handling is split: API layer scales horizontally. CDN scales through pre-positioning. The critical path is EVCache hit rate — if it drops on a hot title, Cassandra gets slammed." },
  { id: 15, q: "How do you ensure playback latency is under 2 seconds?", difficulty: "Hard", component: "Latency Budget", short: "Latency budget: 100ms DNS/TLS, 150ms API gateway, 200ms critical chain in parallel, 100ms manifest parse, 500ms first chunk.", detail: "P99 budget: 100ms DNS+TLS, 150ms API Gateway, 200ms parallel critical path (Auth+Subscription+Concurrency+Playback+DRM+Manifest), 100ms client manifest parse, 500ms first chunk fetch from nearest OCA, 400ms buffer fill. Each service has its own P99 budget. Any service > 200ms P99 breaks the SLA.", tradeoff: "Parallel execution of critical path services (Auth, Concurrency, DRM) saves ~200ms versus sequential. Requires more complex error handling.", mistake: "Not distributing the latency budget across hops. 'Under 2 seconds' must be broken down by each network hop and service call.", finalLine: "The 2-second SLA is allocated across every hop. The client-to-CDN segment is the biggest variable — nearness to OCA determines whether you hit 500ms or 2000ms for first chunk." },
];

const DATA_QA: QA[] = [
  { id: 101, q: "How do you calculate total watch hours?", difficulty: "Hard", component: "Sessionization", isTrap: true, short: "Sessionize heartbeats → sum intervals where playback_state='playing' → SUM(watched_seconds)/3600.", detail: "Do NOT count raw heartbeats or use end_ts - start_ts. Correct approach: for each session, order heartbeats by event_ts, compute intervals between consecutive heartbeats where previous state = 'playing', sum intervals. Then divide by 3600. Dedup heartbeats by event_id first.", tradeoff: "Sessionization is more complex than counting. The tradeoff is accuracy vs complexity.", mistake: "Counting raw heartbeat events. A user who pauses for 2 hours and resumes generates 1 heartbeat at resume — counting it as 2 hours of watch time is wrong.", finalLine: "Watch hours = SUM(heartbeat_intervals where playing) / 3600. Never aggregate from raw Bronze events directly." },
  { id: 102, q: "How do you design Netflix event ingestion?", difficulty: "Medium", component: "Event Collector", short: "Event Collector → stamps ingest_ts → Kafka (6 topics, partitioned by session_id) → Schema Registry validation.", detail: "Client batches events, sends to Event Collector via POST /v1/events/batch. Collector validates event_id and event_type, stamps ingest_ts (client provides event_ts), publishes to Kafka. Schema validated against Confluent Schema Registry on publish.", tradeoff: "Batching reduces HTTP overhead but increases max latency. 1-second batch window is a good balance.", mistake: "Publishing raw JSON to Kafka without schema validation. Schema breaks cause consumer failures that are hard to debug.", finalLine: "The Event Collector is stateless and horizontally scalable. Its only jobs: validate, stamp ingest_ts, and publish. No business logic." },
  { id: 103, q: "What Kafka topics would you create?", difficulty: "Medium", component: "Kafka", short: "6 topics: playback-events, heartbeat-events, quality-events, search-events, recommendation-events, error-events.", detail: "Separate topics by event domain: playback lifecycle, heartbeat/watch duration, quality/buffering, search, recommendations, errors. Each has independent retention, consumer groups, and partition keys. Separate topics allow different processing SLAs and retention policies.", tradeoff: "More topics = more operational overhead but better isolation and independent scaling.", mistake: "One topic for all events. Then you can't tune retention (heartbeats need 30 days; search events need 14 days) or partition independently.", finalLine: "Topic separation is driven by retention requirements, consumer isolation, and partition strategy. Don't mix event types that need different keys." },
  { id: 104, q: "What partition key would you choose for heartbeats?", difficulty: "Hard", component: "Kafka", isTrap: true, short: "session_id — ensures all heartbeats for a session go to the same partition, preserving ordering for sessionization.", detail: "heartbeat-events → partition by session_id. This ensures all heartbeats for a session arrive at the same consumer in order, making sessionization stateless per partition. Avoid content_id — popular titles cause hot partitions.", tradeoff: "session_id distributes load uniformly (millions of sessions). content_id concentrates load on popular titles.", mistake: "Partitioning heartbeats by content_id. Stranger Things episode 1 release → 10M heartbeats on one partition → consumer lag.", finalLine: "Partition key choice is a load distribution decision. session_id is uniform. content_id is skewed. Never partition high-volume events by a hot dimension." },
  { id: 105, q: "How do you handle duplicate events?", difficulty: "Medium", component: "Data Quality", short: "Deduplicate by event_id in Silver layer. event_id is a UUID set by the client. Use keyed state in Flink or dropDuplicates in Spark.", detail: "Every event has an event_id UUID (set client-side). In Flink: keyed state store with 24h TTL — if event_id seen, discard. In Spark: watermark window + dropDuplicates(event_id). Bronze retains duplicates (immutable). Silver deduplicates. Never aggregate from Bronze directly.", tradeoff: "Dedup state grows with time. TTL must balance storage cost vs duplicate detection window.", mistake: "Deduplicating in Bronze. Bronze is immutable — add dedup in Silver transformation.", finalLine: "Bronze keeps everything. Silver deduplicates. This separation lets us replay and reprocess without losing the dedup step." },
  { id: 106, q: "How do you handle late events?", difficulty: "Hard", component: "Stream Processing", isTrap: true, short: "Watermark = max(event_ts) - 30 min. Events within watermark included. Events beyond watermark → DLQ → daily batch reconciliation.", detail: "Set watermark of 30 minutes for heartbeats (client-side buffering on mobile can cause 10-20 min delay). Events arriving within 30 min of event_ts are included in streaming aggregations. Events beyond watermark → DLQ. Daily batch job re-processes DLQ events into Silver.", tradeoff: "Wider watermark captures more late events but delays result freshness. 30 minutes is a practical balance.", mistake: "Silently dropping late events. If 5% of heartbeats are late and dropped, watch hours are systematically understated by 5%.", finalLine: "Late events beyond the watermark go to a DLQ and are batch-reconciled daily. They are never silently dropped." },
  { id: 107, q: "How do you sessionize playback data?", difficulty: "Hard", component: "Sessionization", short: "Group by session_id, order by event_ts, sum intervals between consecutive 'playing' heartbeats. Close session after 30min inactivity.", detail: "1. Filter and deduplicate events for a session_id. 2. Order by event_ts. 3. Compute intervals between consecutive heartbeats. 4. Filter: only sum intervals where previous_state = 'playing'. 5. Handle pause/resume: gap during pause is not watched. 6. Inactivity timeout: 30 min without heartbeat → close session. 7. If explicit playback_stopped event: use it; otherwise use last heartbeat as end.", tradeoff: "Inactivity timeout should not blindly close sessions on pause. Use explicit pause/resume events if available; use timeout only as fallback.", mistake: "Using end_ts - start_ts as watch time. This includes all pauses and app-backgrounded time.", finalLine: "Sessionization converts raw events into business-meaningful watch sessions. The key: sum intervals, not durations." },
  { id: 108, q: "How do you design Bronze/Silver/Gold tables?", difficulty: "Medium", component: "Iceberg Lakehouse", short: "Bronze: raw events, append-only. Silver: deduped, sessionized, enriched. Gold: daily aggregates (watch hours, completion rate).", detail: "Bronze: raw events exactly as received. Partitioned by event_date/event_hour. Never modified — source of truth for reprocessing. Silver: deduped by event_id, validated, sessionized (raw heartbeats → watch sessions), enriched with content/user dimensions. Gold: daily aggregates ready for BI and ML. Partitioned by watch_date, Z-ordered by content_id+country.", tradeoff: "More layers = more processing complexity but better separation of concerns and independent reprocessability.", mistake: "Writing business metrics directly from Bronze. Missing dedup step causes overcounting.", finalLine: "The three layers separate raw ingestion from business logic from business metrics. Each layer is independently reprocessable from the one before it." },
  { id: 109, q: "Why Iceberg over Hive/Delta?", difficulty: "Medium", component: "Iceberg Lakehouse", short: "Iceberg: engine-agnostic (Spark + Trino + Flink), time-travel, schema evolution, hidden partitioning.", detail: "Iceberg advantages: engine-agnostic (Spark, Trino, Flink all read natively), time-travel for debugging ML training data, schema evolution without rewrites, hidden partitioning prevents query-time partition errors. Netflix open-sourced Iceberg — it's the de-facto lakehouse table format for engine-agnostic shops.", tradeoff: "Delta Lake is excellent if you're all-in on Databricks/Spark. Iceberg is better when you run multiple query engines.", mistake: "Saying 'we'll use Hive tables'. Hive doesn't have ACID writes, time-travel, or schema evolution. It's legacy.", finalLine: "Iceberg is the right choice when you need Spark for ETL, Trino for ad-hoc SQL, and Flink for streaming — all on the same tables." },
  { id: 110, q: "How do you handle small files in a lakehouse?", difficulty: "Medium", component: "Iceberg Lakehouse", short: "Streaming writes create small files. Run Iceberg rewrite_data_files daily with Z-order sort on content_id+country.", detail: "Streaming writes create one file per micro-batch (~128 MB target but often smaller). Over time: thousands of small files slow queries. Solution: Iceberg rewrite_data_files compaction job — runs after streaming job, merges small files into 128 MB targets, applies Z-ordering. Schedule daily or triggered by file count threshold.", tradeoff: "Compaction has a cost (read all, write merged files). Schedule during off-peak. Target 128 MB files.", mistake: "Not scheduling compaction. After 30 days of streaming writes, query performance degrades by 10-50x due to small file overhead.", finalLine: "Small files are inevitable in streaming lakehouse workloads. Scheduled compaction is not optional — it's part of the pipeline design." },
  { id: 111, q: "How do you backfill historical data?", difficulty: "Hard", component: "Iceberg Lakehouse", short: "Re-read Bronze, re-run Silver/Gold transformations with time range override. Use Iceberg MERGE INTO for upserts.", detail: "Backfill process: 1. Identify time range to reprocess. 2. Read from Bronze (immutable, always available). 3. Re-run Silver transformation with correct logic. 4. Write to Silver using MERGE INTO (upsert semantics) to update existing rows without full rewrite. 5. Re-run Gold aggregations for affected dates.", tradeoff: "MERGE INTO is slower than INSERT OVERWRITE but safer — doesn't risk overwriting fresh data from the same partition.", mistake: "INSERT OVERWRITE for backfill. If fresh data has arrived for the same date, INSERT OVERWRITE destroys it.", finalLine: "Backfill = re-run from Bronze with MERGE INTO semantics. Never use INSERT OVERWRITE on shared partitions." },
  { id: 112, q: "How do you monitor data quality?", difficulty: "Medium", component: "Data Quality", short: "DQ checks at Silver ingestion: null rate, duplicate rate, late event rate, schema compatibility. Bad records → quarantine table.", detail: "Key DQ checks: event_id not null, event_type valid, event_ts not in far future, duplicate rate < 0.1%, late event rate < 5%, watch duration not negative, schema compatibility enforced. Bad records → quarantine table (not dropped). DQ dashboard tracks trends. Alert on threshold breaches.", tradeoff: "Strict DQ fails the pipeline on quality issues. Lenient DQ lets bad data through. Netflix approach: quarantine bad records, process clean records, alert on trends.", mistake: "Silently dropping bad records. If 1% of events are invalid and dropped, you lose data and don't know it.", finalLine: "Data quality is not a post-processing concern — it's enforced at Silver ingestion. Bad records are quarantined and tracked, never silently dropped." },
  { id: 113, q: "How do you optimize Spark jobs?", difficulty: "Medium", component: "Spark", short: "Partition pruning, broadcast joins for small dimensions, repartition before shuffle, Z-order for range queries, avoid UDFs.", detail: "1. Partition pruning: filter on partition columns (event_date) before any transformations. 2. Broadcast joins: content and user dimension tables < 100MB — broadcast to avoid shuffle. 3. Repartition: before shuffle-heavy operations, repartition to the right number of partitions. 4. Z-ordering: on content_id+country for Gold tables. 5. Avoid Python UDFs — use Spark SQL functions. 6. Cache: cache reused DataFrames.", tradeoff: "Broadcast joins save shuffle cost but risk OOM if the dimension is larger than expected.", mistake: "Using UDFs for string manipulation. Spark SQL built-ins are JVM-optimized; Python UDFs serialize/deserialize through the JVM boundary.", finalLine: "Spark optimization starts with partition pruning (read less data) and ends with avoiding shuffles (expensive cross-partition operations)." },
  { id: 114, q: "How do you handle Kafka consumer lag?", difficulty: "Medium", component: "Kafka", short: "Scale consumer group (up to partition count). If still lagging: increase parallelism via more partitions. Monitor lag as primary SLA.", detail: "Consumer lag grows when processing is slower than produce rate. First: scale consumer group — add consumers up to partition count. If partition-bound: increase partitions (requires coordination — careful). Also: investigate slow processing (complex joins, network calls in consumer).", tradeoff: "Adding partitions is disruptive for ordered consumers. Increase partition count during low-traffic windows.", mistake: "Treating lag as normal. Sustained consumer lag means your metrics are stale — Gold tables may be hours behind.", finalLine: "Consumer lag is the primary SLA metric for streaming pipelines. A growing lag means your business metrics are going stale. Scale consumers first, repartition if needed." },
  { id: 115, q: "How do you calculate content completion rate?", difficulty: "Medium", component: "Sessionization", short: "completion_rate = sessions_where_watched_pct >= 0.9 / total_sessions_started. Requires sessionized Silver data.", detail: "From Silver: select sessions where watched_seconds / duration_sec >= 0.9 as 'completed'. Completion rate = COUNT(completed) / COUNT(*). Group by content_id, date, country. The 90% threshold is a common convention — adjust based on business definition.", tradeoff: "Completion threshold (90% vs 95% vs 100%) changes the metric significantly. Define explicitly and document.", mistake: "Counting playback_completed events from Bronze. An event is only fired if the client fires it — missing on crash or close.", finalLine: "Completion rate must come from sessionized Silver data, not raw events. The playback_completed event is unreliable — users close the app without firing it." },
  { id: 116, q: "How do you handle pause/resume in watch time calculation?", difficulty: "Hard", component: "Sessionization", isTrap: true, short: "Only sum intervals where previous_state = 'playing'. Pause intervals are gaps, not watch time.", detail: "In sessionization: for each consecutive heartbeat pair, only include the interval if the earlier heartbeat's playback_state = 'playing'. If the user paused for 10 minutes, there's either no heartbeat during pause (TTL expires) or explicit playback_paused event. Either way: do not include the pause gap in watched_seconds. Resume means the next 'playing' interval starts fresh.", tradeoff: "Relying on explicit pause/resume events is more accurate but depends on client reliability. Inactivity timeout is the fallback for missing events.", mistake: "Treating any heartbeat interval as watch time. A user who pauses for 2 hours and resumes fires one heartbeat at resume — counting the 2-hour gap as watched time is wrong.", finalLine: "Watch time = sum of intervals where the preceding state was 'playing'. Pause intervals are not watch time, regardless of clock duration." },
  { id: 117, q: "How do you handle buffering events in analytics?", difficulty: "Medium", component: "Data Quality", short: "Buffering ratio = buffering_seconds / total_playback_seconds per session. Sourced from buffering_started / buffering_ended event pairs.", detail: "For each session: pair buffering_started and buffering_ended events by session_id + sequence. Compute gap = ended_ts - started_ts. Sum gaps = total_buffering_seconds. Buffering ratio = total_buffering_seconds / total_playback_seconds. Also track buffer count (number of buffer events) as a quality signal. High buffering on a specific content_id + bitrate suggests encoding quality issue.", tradeoff: "Buffering events may be missing if the app crashes during buffering. Use a timeout-based fallback: if buffering_started has no matching buffering_ended within 60s, assume a 60s buffer.", mistake: "Ignoring buffering in watch time. A user who buffered for 3 minutes of a 20-minute video doesn't have 3 minutes of 'watch time'. Buffering time is separate from played time.", finalLine: "Buffering ratio is a content delivery quality metric, not a user behavior metric. Track it separately from watch hours and surface it to CDN/encoding teams, not just to product analytics." },
  { id: 118, q: "How do you design real-time dashboards?", difficulty: "Hard", component: "Real-time Analytics", short: "Apache Pinot for sub-100ms OLAP queries on pre-aggregated tables. Flink writes to Pinot in real-time. Separate from batch Gold tables.", detail: "Real-time dashboards (live viewers, active sessions, quality events) need sub-second freshness. Tool: Apache Pinot — columnar OLAP, real-time ingestion from Kafka, sub-100ms query latency. Architecture: Flink reads Kafka → aggregates in 10-second windows → writes to Pinot real-time tables. Daily metrics (watch hours, completion rate) still served from Iceberg Gold via Trino.", tradeoff: "Pinot adds operational complexity. Only use for metrics that genuinely need sub-minute freshness. Most business metrics don't — daily Spark on Gold is simpler.", mistake: "Building real-time streaming pipelines for metrics that only need daily granularity. Most analytics questions ('what were our watch hours last month?') have no latency requirement.", finalLine: "Real-time and batch are not interchangeable. Use Pinot for truly real-time dashboards (active viewers, live quality alerts). Use Iceberg+Trino for everything else — it's 10x simpler." },
];

// Flashcard component
function FlashCard({
  qa,
  onNext,
  onSkip,
  onMark,
  isReviewed,
  current,
  total,
}: {
  qa: QA;
  onNext: (rating: "easy" | "hard" | "again") => void;
  onSkip: () => void;
  onMark: () => void;
  isReviewed: boolean;
  current: number;
  total: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setRevealed(false); }, [qa.id]);

  const diffColor = qa.difficulty === "Hard" ? "#ef4444" : "#f59e0b";

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-faint)" }}>
        <span>Card {current} / {total}</span>
        <div className="flex gap-2">
          {qa.isTrap && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#fef3c7", color: "#92400e" }}>
              ⚠ Common Trap
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${diffColor}20`, color: diffColor }}>
            {qa.difficulty}
          </span>
        </div>
      </div>

      {/* Question card */}
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: "var(--bg-card)", border: "2px solid var(--border)", minHeight: 180 }}
      >
        <p className="text-xs font-semibold mb-4" style={{ color: "var(--text-faint)" }}>
          {qa.component}
        </p>
        <p className="text-lg font-semibold leading-relaxed" style={{ color: "var(--text)" }}>
          {qa.q}
        </p>
        {!revealed && (
          <button
            onClick={() => setRevealed(true)}
            className="mt-6 px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--border)", cursor: "pointer" }}
          >
            Show Answer ▼
          </button>
        )}
      </div>

      {/* Answer */}
      {revealed && (
        <div className="space-y-3 animate-in fade-in">
          <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--blue-text)" }}>Short Answer</p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{qa.short}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: "#fef2f2", border: "1px solid #fca5a5" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#991b1b" }}>Common Mistake</p>
            <p className="text-sm" style={{ color: "#7f1d1d" }}>{qa.mistake}</p>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #10b981" }}>
            <div className="flex items-center justify-between px-4 py-2" style={{ background: "rgba(16,185,129,0.1)" }}>
              <span className="text-xs font-bold" style={{ color: "#10b981" }}>💬 Final interview line</span>
              <button
                onClick={() => { navigator.clipboard.writeText(qa.finalLine).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{ background: copied ? "#22c55e" : "transparent", color: copied ? "#fff" : "#10b981", border: "1px solid #10b981", cursor: "pointer" }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="px-4 py-3 text-sm italic leading-relaxed" style={{ background: "var(--bg)", color: "var(--text)" }}>{qa.finalLine}</p>
          </div>

          {/* Rating buttons */}
          <div className="flex gap-2 pt-1">
            <button onClick={() => onNext("easy")} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid #10b981", cursor: "pointer" }}>
              ⭐ Easy
            </button>
            <button onClick={() => onNext("hard")} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid #f59e0b", cursor: "pointer" }}>
              ⚡ Hard
            </button>
            <button onClick={() => onNext("again")} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid #ef4444", cursor: "pointer" }}>
              🔄 Again
            </button>
            <button onClick={onSkip} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: "var(--bg-card)", color: "var(--text-faint)", border: "1px solid var(--border)", cursor: "pointer" }}>
              Skip →
            </button>
          </div>
          <button
            onClick={onMark}
            className="w-full py-2 rounded-xl text-xs font-medium"
            style={{ background: isReviewed ? "rgba(16,185,129,0.1)" : "transparent", color: isReviewed ? "#10b981" : "var(--text-faint)", border: `1px solid ${isReviewed ? "#10b981" : "var(--border)"}`, cursor: "pointer" }}
          >
            {isReviewed ? "✓ Marked as reviewed" : "Mark as reviewed"}
          </button>
        </div>
      )}
    </div>
  );
}

// Individual QA list item
function QAItem({
  qa, isExpanded, onToggle, isReviewed, onMarkReviewed,
}: {
  qa: QA; isExpanded: boolean; onToggle: () => void; isReviewed: boolean; onMarkReviewed: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const diffColor = qa.difficulty === "Hard" ? "#ef4444" : "#f59e0b";
  const num = qa.id > 100 ? qa.id - 100 : qa.id;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ border: `1px solid ${isReviewed ? "rgba(16,185,129,0.4)" : "var(--border)"}`, background: "var(--bg-card)" }}
      id={`qa-${qa.id}`}
    >
      <div
        className="w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => e.key === "Enter" && onToggle()}
      >
        <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>
          {num}
        </span>
        <span className="text-sm font-medium flex-1 leading-snug" style={{ color: "var(--text)" }}>{qa.q}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {qa.isTrap && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold hidden sm:inline" style={{ background: "#fef3c7", color: "#92400e" }}>TRAP</span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${diffColor}20`, color: diffColor }}>
            {qa.difficulty}
          </span>
          {isReviewed && <span className="text-xs" style={{ color: "#10b981" }}>✓</span>}
          <span
            className="text-xs transition-transform duration-200"
            style={{ color: "var(--text-muted)", display: "inline-block", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-hidden="true"
          >▼</span>
        </div>
      </div>
      {isExpanded && (
        <div className="px-5 pb-5 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
          {/* Component chip */}
          <div className="flex items-center gap-2 pt-3">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>
              {qa.component}
            </span>
            {qa.isTrap && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "#fef3c7", color: "#92400e" }}>
                ⚠ Common Trap
              </span>
            )}
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--blue-text)" }}>Short answer</p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{qa.short}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-faint)" }}>Detailed explanation</p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{qa.detail}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-faint)" }}>Tradeoff</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{qa.tradeoff}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "#fef2f2", border: "1px solid #fca5a5" }}>
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: "#991b1b" }}>Common mistake</p>
              <p className="text-xs leading-relaxed" style={{ color: "#7f1d1d" }}>{qa.mistake}</p>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #10b981" }}>
            <div className="flex items-center justify-between px-4 py-2" style={{ background: "rgba(16,185,129,0.1)" }}>
              <span className="text-[11px] font-bold" style={{ color: "#10b981" }}>💬 Final interview sentence</span>
              <button
                onClick={() => { navigator.clipboard.writeText(qa.finalLine).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                className="text-[10px] px-2 py-0.5 rounded font-medium"
                aria-label="Copy final line to clipboard"
                style={{ background: copied ? "#22c55e" : "transparent", color: copied ? "#fff" : "#10b981", border: "1px solid #10b981", cursor: "pointer" }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="px-4 py-3 text-sm leading-relaxed italic" style={{ background: "var(--bg)", color: "var(--text)" }}>{qa.finalLine}</p>
          </div>
          <button
            onClick={onMarkReviewed}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: isReviewed ? "rgba(16,185,129,0.1)" : "transparent", color: isReviewed ? "#10b981" : "var(--text-faint)", border: `1px solid ${isReviewed ? "#10b981" : "var(--border)"}`, cursor: "pointer" }}
          >
            {isReviewed ? "✓ Reviewed" : "Mark as reviewed"}
          </button>
        </div>
      )}
    </div>
  );
}

export function InterviewTab({ role }: { role: Role }) {
  const [activeRole, setActiveRole] = useState<Role>(role);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set());
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | "All">("All");
  const [filterComponent, setFilterComponent] = useState<string>("All");
  const [filterTrap, setFilterTrap] = useState(false);
  const [filterUnreviewed, setFilterUnreviewed] = useState(false);
  const [flashcardMode, setFlashcardMode] = useState(false);
  const [flashcardIdx, setFlashcardIdx] = useState(0);

  const allQAs = activeRole === "Backend Engineer" ? BACKEND_QA : DATA_QA;

  // Load reviewed from localStorage
  useEffect(() => {
    try {
      const key = `netflix-reviewed-${activeRole}`;
      const saved = localStorage.getItem(key);
      if (saved) setReviewedIds(new Set(JSON.parse(saved) as number[]));
    } catch { /* ignore */ }
  }, [activeRole]);

  const saveReviewed = useCallback((ids: Set<number>) => {
    try {
      localStorage.setItem(`netflix-reviewed-${activeRole}`, JSON.stringify([...ids]));
    } catch { /* ignore */ }
  }, [activeRole]);

  const toggleReviewed = useCallback((id: number) => {
    setReviewedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveReviewed(next);
      return next;
    });
  }, [saveReviewed]);

  // Unique components for filter
  const allComponents = useMemo(() => {
    const comps = Array.from(new Set(allQAs.map(q => q.component))).sort();
    return ["All", ...comps];
  }, [allQAs]);

  const filtered = useMemo(() => {
    let qs = allQAs;
    const q = search.toLowerCase().trim();
    if (q) qs = qs.filter(qa => qa.q.toLowerCase().includes(q) || qa.detail.toLowerCase().includes(q) || qa.component.toLowerCase().includes(q));
    if (filterDifficulty !== "All") qs = qs.filter(qa => qa.difficulty === filterDifficulty);
    if (filterComponent !== "All") qs = qs.filter(qa => qa.component === filterComponent);
    if (filterTrap) qs = qs.filter(qa => qa.isTrap);
    if (filterUnreviewed) qs = qs.filter(qa => !reviewedIds.has(qa.id));
    return qs;
  }, [search, allQAs, filterDifficulty, filterComponent, filterTrap, filterUnreviewed, reviewedIds]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const pickRandom = () => {
    const unreviewed = filtered.filter(q => !reviewedIds.has(q.id));
    const pool = unreviewed.length > 0 ? unreviewed : filtered;
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setExpandedIds(new Set([pick.id]));
    setTimeout(() => {
      document.getElementById(`qa-${pick.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Flashcard navigation
  const flashcardNext = (rating: "easy" | "hard" | "again") => {
    if (rating === "easy") toggleReviewed(filtered[flashcardIdx].id);
    if (rating !== "again") {
      setFlashcardIdx(i => Math.min(i + 1, filtered.length - 1));
    }
  };
  const flashcardSkip = () => setFlashcardIdx(i => Math.min(i + 1, filtered.length - 1));

  const roleColor = activeRole === "Backend Engineer" ? "#3b82f6" : "#10b981";
  const reviewedCount = allQAs.filter(q => reviewedIds.has(q.id)).length;

  return (
    <div className="space-y-5">
      {/* Header controls */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Interview Q&amp;A</h2>

          {/* Role toggle */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            {(["Backend Engineer", "Data Engineer"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => { setActiveRole(r); setExpandedIds(new Set()); setFlashcardIdx(0); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: activeRole === r ? (r === "Backend Engineer" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)") : "transparent", color: activeRole === r ? (r === "Backend Engineer" ? "#3b82f6" : "#10b981") : "var(--text-muted)", cursor: "pointer", border: "none" }}
                aria-pressed={activeRole === r}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Flashcard toggle */}
          <button
            onClick={() => { setFlashcardMode(v => !v); setFlashcardIdx(0); }}
            className="ml-auto text-xs px-3 py-1.5 rounded-xl font-semibold transition-all"
            style={{ background: flashcardMode ? "rgba(139,92,246,0.15)" : "var(--bg)", color: flashcardMode ? "#8b5cf6" : "var(--text-muted)", border: `1px solid ${flashcardMode ? "#8b5cf6" : "var(--border)"}`, cursor: "pointer" }}
          >
            {flashcardMode ? "🃏 Flashcard ON" : "🃏 Flashcard Mode"}
          </button>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "var(--text-faint)" }}>
            <span>{reviewedCount} / {allQAs.length} reviewed</span>
            <span>{Math.round((reviewedCount / allQAs.length) * 100)}% complete</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(reviewedCount / allQAs.length) * 100}%`, background: roleColor }}
              aria-valuenow={reviewedCount} aria-valuemin={0} aria-valuemax={allQAs.length}
              role="progressbar" aria-label={`${reviewedCount} of ${allQAs.length} reviewed`}
            />
          </div>
        </div>

        {/* All reviewed celebration */}
        {reviewedCount === allQAs.length && (
          <div className="rounded-xl p-4 text-center" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)" }} role="status" aria-live="polite">
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-sm font-bold" style={{ color: "#10b981" }}>Great job! You&apos;ve reviewed all {allQAs.length} questions for this track.</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>Reset reviews to start fresh and test your retention.</p>
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Search questions by topic, component, or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
          autoComplete="off"
          aria-label="Search questions"
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Difficulty filter */}
          <div className="flex gap-1">
            {(["All", "Medium", "Hard"] as const).map(d => (
              <button
                key={d}
                onClick={() => setFilterDifficulty(d)}
                className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
                style={{
                  background: filterDifficulty === d ? (d === "Hard" ? "rgba(239,68,68,0.15)" : d === "Medium" ? "rgba(245,158,11,0.15)" : "var(--blue-soft)") : "transparent",
                  color: filterDifficulty === d ? (d === "Hard" ? "#ef4444" : d === "Medium" ? "#f59e0b" : "var(--blue-text)") : "var(--text-faint)",
                  border: `1px solid ${filterDifficulty === d ? (d === "Hard" ? "#ef4444" : d === "Medium" ? "#f59e0b" : "var(--border)") : "var(--border)"}`,
                  cursor: "pointer",
                }}
              >
                {d === "All" ? "All difficulty" : d}
              </button>
            ))}
          </div>

          {/* Trap filter */}
          <button
            onClick={() => setFilterTrap(v => !v)}
            className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
            style={{ background: filterTrap ? "#fef3c7" : "transparent", color: filterTrap ? "#92400e" : "var(--text-faint)", border: `1px solid ${filterTrap ? "#fcd34d" : "var(--border)"}`, cursor: "pointer" }}
          >
            ⚠ Traps only
          </button>

          {/* Unreviewed filter */}
          <button
            onClick={() => setFilterUnreviewed(v => !v)}
            className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
            style={{ background: filterUnreviewed ? "rgba(16,185,129,0.1)" : "transparent", color: filterUnreviewed ? "#10b981" : "var(--text-faint)", border: `1px solid ${filterUnreviewed ? "#10b981" : "var(--border)"}`, cursor: "pointer" }}
          >
            Unreviewed only
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>{filtered.length} questions</span>
            {!flashcardMode && (
              <>
                <button
                  onClick={pickRandom}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}
                >
                  🎲 Random
                </button>
                <button
                  onClick={() => setExpandedIds(new Set(filtered.map(q => q.id)))}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: "var(--blue-soft)", color: "var(--blue-text)", cursor: "pointer", border: "none" }}
                >
                  Expand All
                </button>
                <button
                  onClick={() => setExpandedIds(new Set())}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}
                >
                  Collapse All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Component filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {allComponents.map(comp => (
            <button
              key={comp}
              onClick={() => setFilterComponent(comp)}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: filterComponent === comp ? `${roleColor}20` : "transparent",
                color: filterComponent === comp ? roleColor : "var(--text-faint)",
                border: `1px solid ${filterComponent === comp ? roleColor : "var(--border)"}`,
                cursor: "pointer",
              }}
            >
              {comp === "All" ? "All components" : comp}
              {comp !== "All" && (
                <span style={{ opacity: 0.6 }}> ({allQAs.filter(q => q.component === comp).length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Flashcard mode */}
      {flashcardMode ? (
        <div>
          {filtered.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="text-4xl mb-3">🎉</p>
              <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>All questions reviewed!</p>
              <p className="text-sm" style={{ color: "var(--text-faint)" }}>Clear filters to start over.</p>
            </div>
          ) : flashcardIdx >= filtered.length ? (
            <div className="text-center py-16 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="text-4xl mb-3">✅</p>
              <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>Deck complete!</p>
              <p className="text-sm mb-4" style={{ color: "var(--text-faint)" }}>{filtered.length} questions covered.</p>
              <button
                onClick={() => setFlashcardIdx(0)}
                className="px-5 py-2 rounded-xl text-sm font-semibold"
                style={{ background: roleColor, color: "white", border: "none", cursor: "pointer" }}
              >
                Start Over
              </button>
            </div>
          ) : (
            <FlashCard
              qa={filtered[flashcardIdx]}
              current={flashcardIdx + 1}
              total={filtered.length}
              isReviewed={reviewedIds.has(filtered[flashcardIdx].id)}
              onNext={flashcardNext}
              onSkip={flashcardSkip}
              onMark={() => toggleReviewed(filtered[flashcardIdx].id)}
            />
          )}
        </div>
      ) : (
        /* List mode */
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${roleColor}15`, color: roleColor }}>{activeRole}</span>
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>
              {filtered.length} questions · each includes short answer, tradeoff, mistake, and final interview sentence
            </span>
          </div>
          <div className="space-y-2">
            {filtered.map(qa => (
              <QAItem
                key={qa.id}
                qa={qa}
                isExpanded={expandedIds.has(qa.id)}
                onToggle={() => toggleExpand(qa.id)}
                isReviewed={reviewedIds.has(qa.id)}
                onMarkReviewed={() => toggleReviewed(qa.id)}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="text-2xl mb-2">🔍</p>
              <p className="font-medium mb-1" style={{ color: "var(--text)" }}>No questions match your filters.</p>
              <p className="text-sm" style={{ color: "var(--text-faint)" }}>Try clearing filters or changing the search term.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
