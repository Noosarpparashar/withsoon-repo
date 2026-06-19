"use client";

import { useState } from "react";
import type { Role, TabSlug } from "@/components/ui/NetflixPage";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      className="text-[11px] px-3 py-1 rounded font-medium transition-colors shrink-0"
      style={{ background: copied ? "#22c55e" : "var(--bg)", color: copied ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
      {copied ? "Copied!" : label}
    </button>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="px-4 py-2.5" style={{ background: `${color}15`, borderBottom: `2px solid ${color}` }}>
        <h3 className="text-xs font-black uppercase tracking-wider" style={{ color }}>{title}</h3>
      </div>
      <div className="p-4" style={{ background: "var(--bg-card)" }}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-[11px] font-medium w-36 shrink-0 pt-0.5" style={{ color: "var(--text-faint)" }}>{label}</span>
      <span className="text-xs flex-1" style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
}

const BACKEND_OPENING_30S = `I'd design Netflix's playback backend as a 10-service orchestration chain.
A user clicks Play → Gateway validates JWT → Subscription Service confirms active plan → Concurrency Service
checks stream limits atomically in Redis → Playback Service calls DRM and Manifest Service → client gets
manifest URL and fetches video bytes directly from the nearest Open Connect CDN appliance.
During playback, clients send a heartbeat every 30 seconds. That's 60M concurrent streams ÷ 30s = 2M writes/sec —
which rules out MySQL and drives the choice of Cassandra for watch_progress.
I'll deep dive on concurrency enforcement, watch progress storage, and CDN handoff.`;

const BACKEND_OPENING_2MIN = `Netflix serves 300M subscribers. I'll assume 220M DAU, 60M peak concurrent streams, 5 Mbps average bitrate.

Functional requirements: start playback, enforce concurrent stream limits, track watch progress for resume, deliver video globally.

Non-functional: availability over consistency for playback (every second of downtime is revenue), sub-2-second playback start, eventual consistency for watch progress (30-second staleness is fine), strong consistency for concurrency and billing.

Scale: 60M streams × 5 Mbps = 300 Tbps CDN bandwidth. 60M ÷ 30s = 2M heartbeat writes/sec. That immediately rules out MySQL.

Architecture: 10-service chain. Gateway → Auth → Subscription → Concurrency (Redis Lua) → Playback → DRM (fail-closed, legal) → Manifest → CDN. Watch Progress is an async write path — it doesn't block session start.

Key DB decisions: Cassandra for watch_progress (2M writes/sec, partition by profile_id), Redis for concurrency state (atomic Lua script, 60 GB for 60M sessions), MySQL for billing (ACID), EVCache for metadata (99.9% hit rate at 30M req/s).

Key tradeoff: DRM is the only fail-closed service — legal requirement. Everything else fails open. Watch progress uses eventual consistency by design.`;

const DATA_OPENING_30S = `I'd design Netflix's data engineering platform as a three-layer streaming lakehouse.
Client events flow to Kafka at 15M events/sec across 6 topic domains partitioned by session_id.
A Flink pipeline deduplicates by event_id and sessionizes heartbeats into watch sessions.
The lakehouse has Bronze (raw immutable events), Silver (deduped, sessionized, enriched), and Gold (daily aggregates: watch hours, completion rates) — all on Iceberg/Parquet.
Late events go to a DLQ and are batch-reconciled daily. Watch hours is calculated as SUM of intervals between consecutive heartbeats where state='playing', not as raw event counts.
I'll deep dive on sessionization logic, Kafka partitioning, and Bronze/Silver/Gold table design.`;

const DATA_OPENING_2MIN = `Netflix produces 15M events/sec at peak. I need to turn raw client events into accurate watch hours, completion rates, and engagement metrics used by Product, Content Licensing, and ML teams.

Events: 17 event types — playback_started, heartbeat, playback_paused, playback_resumed, playback_stopped, playback_completed, quality_changed, buffer_started, buffer_ended, and more. Each event has event_id (client UUID), event_ts (client time), ingest_ts (server stamp), session_id, profile_id, content_id.

Kafka: 6 topics by domain. heartbeat-events partitioned by session_id (ordering for sessionization). search-events by profile_id. NOT content_id — popular titles would create hot partitions.

Schema: Avro + Schema Registry with BACKWARD_TRANSITIVE compatibility. Schema breaks cause consumer outages.

Pipeline: Event Collector → Kafka → Flink: (1) dedup by event_id using keyed state with 24h TTL, (2) key by session_id, (3) compute intervals between consecutive playing heartbeats, (4) watermark 30 minutes for late event handling.

Lakehouse: Bronze = raw events, append-only, Parquet+zstd, partitioned by event_date. Silver = deduped + sessionized + enriched. Gold = daily aggregates: watch_hours_daily, completion_rate_daily, engagement_daily.

Late events beyond 30-minute watermark → DLQ → daily batch MERGE INTO Silver. Never INSERT OVERWRITE on shared partitions.

Data quality: quarantine bad records (null event_id, negative watch duration, future timestamps). Never silently drop. Duplicate rate alert at > 0.1%.`;

const BACKEND_SERVICES = [
  { name: "API Gateway", role: "JWT validation, rate limiting, routing" },
  { name: "Auth Service", role: "Identity verification, session token issuance" },
  { name: "Subscription Service", role: "Plan validity check — fail open (availability)" },
  { name: "Concurrency Service", role: "Stream limit enforcement — Redis Lua, fail closed" },
  { name: "Playback Service", role: "Orchestrates DRM + Manifest, returns session to client" },
  { name: "DRM Service", role: "License issuance — fail closed (legal requirement)" },
  { name: "Manifest Service", role: "Returns ABR manifest with CDN URLs" },
  { name: "Watch Progress Service", role: "Heartbeat upsert to Cassandra — async, not blocking" },
  { name: "Metadata Service", role: "Content metadata reads via EVCache → Cassandra" },
  { name: "CDN / Open Connect", role: "Video delivery, 300 Tbps, ISP-peered appliances" },
];

const BACKEND_DBS = [
  { name: "Cassandra", use: "watch_progress, playback_sessions, content_metadata", why: "2M writes/sec, partition by profile_id, ONE consistency" },
  { name: "Redis", use: "active_streams (concurrency), session tokens", why: "Atomic Lua script for concurrency check, 60 GB fits in memory" },
  { name: "MySQL", use: "user_accounts, billing, subscriptions", why: "ACID required — double-charge is catastrophic" },
  { name: "EVCache (Memcached)", use: "Content metadata cache", why: "30M req/s at 99.9% hit rate, in-process cache" },
];

const BACKEND_APIS = [
  { method: "POST", path: "/v1/playback/sessions", note: "Idempotent on client session_id" },
  { method: "POST", path: "/v1/playback/heartbeat", note: "Idempotent on session_id + event_ts" },
  { method: "DELETE", path: "/v1/playback/sessions/{id}", note: "Removes from Redis, marks Cassandra row" },
  { method: "GET", path: "/v1/watch-progress/{profile_id}", note: "Returns all in-progress content" },
  { method: "GET", path: "/v1/metadata/{content_id}", note: "Returns from EVCache, fallback Cassandra" },
];

const BACKEND_FAILURES_TOP = [
  { failure: "DRM Service down", mitigation: "Fail closed — no playback. Legal requirement." },
  { failure: "Redis (concurrency) down", mitigation: "Fail open with fallback count check in Cassandra" },
  { failure: "EVCache cold start", mitigation: "Thundering herd — mutex lock on miss, one filler thread" },
  { failure: "Cassandra heartbeat write fails", mitigation: "Client retries with exponential backoff; eventual consistency means 30s staleness is ok" },
  { failure: "CDN node fails", mitigation: "Client retries to parent cluster → origin S3. API layer is unaffected." },
];

const BACKEND_TRADEOFFS = [
  { a: "Strong consistency", b: "Eventual consistency", netflix: "Strong: concurrency (Redis), billing (MySQL). Eventual: watch progress (Cassandra ONE)." },
  { a: "Redis", b: "Cassandra", netflix: "Redis for concurrency (atomic ops). Cassandra for write-heavy time-series data." },
  { a: "Fail closed", b: "Fail open", netflix: "DRM: fail closed (legal). Subscription: fail open (availability > revenue loss)." },
  { a: "Sync writes", b: "Async writes", netflix: "Watch progress is async — doesn't block session start. Billing is sync." },
];

const DATA_EVENTS = [
  "playback_started", "heartbeat (every 30s)", "playback_paused", "playback_resumed",
  "playback_stopped", "playback_completed", "quality_changed", "buffer_started", "buffer_ended",
  "seek_performed", "subtitle_changed", "audio_track_changed", "search_query_submitted",
  "search_result_clicked", "home_page_loaded", "content_card_impression", "error_occurred",
];

const DATA_KAFKA_TOPICS = [
  { topic: "heartbeat-events", key: "session_id", why: "Preserve ordering per session for sessionization" },
  { topic: "playback-events", key: "session_id", why: "Session lifecycle ordering" },
  { topic: "quality-events", key: "session_id", why: "Quality metrics per session" },
  { topic: "search-events", key: "profile_id", why: "User-level search ordering" },
  { topic: "recommendation-events", key: "profile_id", why: "User-level recommendation ordering" },
  { topic: "error-events", key: "device_id", why: "Device-level error aggregation" },
];

const DATA_LAKEHOUSE = [
  { layer: "Bronze", table: "raw_events", desc: "All events as-received. Append-only. Never modified. Partitioned by event_date." },
  { layer: "Silver", table: "deduped_events", desc: "Deduplicated by event_id. Invalid records quarantined." },
  { layer: "Silver", table: "watch_sessions", desc: "Sessionized: one row per session with watched_seconds, start/end ts, max watched pct." },
  { layer: "Gold", table: "watch_hours_daily", desc: "SUM(watched_seconds)/3600 per content_id, country, device_type, date." },
  { layer: "Gold", table: "completion_rate_daily", desc: "sessions_completed/sessions_started per content, date. Completion = watched_pct >= 0.9." },
  { layer: "Gold", table: "engagement_daily", desc: "DAU, sessions per user, content impressions, search volume." },
];

const DATA_FAILURES_TOP = [
  { failure: "Kafka broker failure", mitigation: "RF=3. Producer retries. Consumer rebalances to other partitions." },
  { failure: "Duplicate events", mitigation: "Dedup by event_id in Silver. Bronze keeps all. Flink keyed state 24h TTL." },
  { failure: "Late events (>30 min)", mitigation: "DLQ. Daily batch MERGE INTO Silver. Never silently drop." },
  { failure: "Schema break", mitigation: "Schema Registry BACKWARD_TRANSITIVE. Deployment blocked on registry rejection." },
  { failure: "Flink checkpoint failure", mitigation: "RocksDB to S3 every 5 min. Replay from last checkpoint on restart." },
];

const DATA_TRADEOFFS = [
  { a: "Flink", b: "Spark Streaming", netflix: "Flink for stateful sessionization (event-time, exactly-once). Spark for bulk Silver ETL." },
  { a: "Iceberg", b: "Delta Lake", netflix: "Iceberg (engine-agnostic: Spark + Trino + Flink). Delta if all-in on Databricks." },
  { a: "Exactly-once", b: "At-least-once", netflix: "Exactly-once for watch hours (money). At-least-once for error events (cost)." },
  { a: "Streaming", b: "Batch", netflix: "Streaming for real-time dashboards (<5 min). Batch for daily Gold aggregates and backfill." },
];

function CheatSheetTab({ role, onNavigateTab }: { role: Role; onNavigateTab?: (tab: TabSlug) => void }) {
  const [activeRole, setActiveRole] = useState<Role>(role);
  const isBackend = activeRole === "Backend Engineer";
  const color = isBackend ? "#3b82f6" : "#10b981";
  const opening30s = isBackend ? BACKEND_OPENING_30S : DATA_OPENING_30S;
  const opening2min = isBackend ? BACKEND_OPENING_2MIN : DATA_OPENING_2MIN;

  return (
    <div className="space-y-5">
      {/* Role toggle */}
      <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Cheat Sheet</h2>
          <p className="text-xs flex-1" style={{ color: "var(--text-faint)" }}>Print this, review it, then close it — the interview tests recall, not reading.</p>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            {(["Backend Engineer", "Data Engineer"] as Role[]).map((r) => (
              <button key={r} onClick={() => setActiveRole(r)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: activeRole === r ? (r === "Backend Engineer" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)") : "transparent", color: activeRole === r ? (r === "Backend Engineer" ? "#3b82f6" : "#10b981") : "var(--text-muted)", cursor: "pointer", border: "none" }}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Opening scripts */}
      <Section title="Opening Scripts" color={color}>
        <div className="space-y-3">
          {[
            { label: "30-second opening", text: opening30s },
            { label: "2-minute deep-dive opening", text: opening2min },
          ].map(({ label, text }) => (
            <div key={label} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                <span className="text-xs font-bold" style={{ color }}>{label}</span>
                <CopyButton text={text} />
              </div>
              <pre className="px-3 py-3 text-[11px] leading-relaxed whitespace-pre-wrap font-mono" style={{ color: "var(--text-muted)" }}>{text}</pre>
            </div>
          ))}
        </div>
      </Section>

      {/* Role-specific content */}
      {isBackend ? (
        <>
          <Section title="Main Services (10)" color={color}>
            <div className="space-y-0">
              {BACKEND_SERVICES.map((s) => <Row key={s.name} label={s.name} value={s.role} />)}
            </div>
          </Section>

          <Section title="API List (5 core)" color={color}>
            <div className="space-y-1">
              {BACKEND_APIS.map((a) => (
                <div key={a.path} className="flex items-start gap-2 py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ background: color + "20", color }}>{a.method}</span>
                  <code className="text-[11px] flex-1 font-mono" style={{ color: "var(--text)" }}>{a.path}</code>
                  <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>{a.note}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Database Choices" color={color}>
            <div className="space-y-0">
              {BACKEND_DBS.map((d) => (
                <div key={d.name} className="py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold" style={{ color }}>{d.name}</span>
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{d.use}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>{d.why}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Cache Strategy" color={color}>
            <div className="space-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
              <Row label="Cache" value="EVCache (Memcached, in-process)" />
              <Row label="What's cached" value="Content metadata, catalog, user preferences" />
              <Row label="Hit rate" value="99.9% — 30K Cassandra reads/sec at 30M total reads/sec" />
              <Row label="Cache miss" value="Mutex lock — one filler thread, others wait. Prevents thundering herd." />
              <Row label="Invalidation" value="Write-invalidate on content rights change. TTL 1 hour." />
            </div>
          </Section>

          <Section title="Playback Flow (15 steps)" color={color}>
            <div className="space-y-0.5">
              {["POST /playback/sessions (client sends session_id UUID)", "Gateway: validate JWT", "Auth Service: verify identity", "Subscription Service: check plan — fail open", "Concurrency Service: Redis Lua atomic check-and-add — fail closed", "Playback Service: orchestrate downstream", "DRM Service: issue device-bound license — fail closed (legal)", "Manifest Service: return ABR manifest with CDN URLs", "Response: manifest_url + drm_license_url + heartbeat_interval_sec", "Client: parse manifest", "Client: fetch first segment from nearest OCA appliance", "CDN: serve video bytes (no API involvement)", "Client: start heartbeat loop every 30s", "Heartbeat: POST /heartbeat → Watch Progress → Cassandra ONE write", "Session end: DELETE session → Redis SREM + Cassandra update"].map((step, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5">
                  <span className="text-[10px] font-bold w-5 shrink-0 pt-0.5 text-right" style={{ color }}>{i + 1}</span>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{step}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Top 5 Failures" color={color}>
            <div className="space-y-2">
              {BACKEND_FAILURES_TOP.map((f) => (
                <div key={f.failure} className="py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                  <p className="text-xs font-bold mb-0.5" style={{ color: "#ef4444" }}>{f.failure}</p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{f.mitigation}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Top 4 Tradeoffs" color={color}>
            <div className="space-y-2">
              {BACKEND_TRADEOFFS.map((t) => (
                <div key={t.a} className="py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>{t.a}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>vs</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>{t.b}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{t.netflix}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Scale Numbers (memorize the derivation, not the number)" color={color}>
            <div className="font-mono space-y-0">
              {[
                ["300M subscribers × 0.73", "= 220M DAU"],
                ["220M × 0.27 peak", "= 60M concurrent streams"],
                ["60M × 5 Mbps", "= 300 Tbps CDN"],
                ["60M ÷ 30s heartbeat", "= 2M writes/sec → Cassandra"],
                ["30M metadata reads/sec × 99.9%", "→ 30K reach Cassandra"],
                ["60M × 1KB Redis SET entry", "= 60 GB Redis for concurrency"],
                ["2M writes/sec ÷ 200/node", "= ~10,000 Cassandra nodes"],
              ].map(([formula, result]) => (
                <div key={formula} className="flex items-center gap-2 py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                  <code className="text-[11px] flex-1" style={{ color: "var(--text-muted)" }}>{formula}</code>
                  <code className="text-[11px] font-bold shrink-0" style={{ color }}>{result}</code>
                </div>
              ))}
            </div>
          </Section>
        </>
      ) : (
        <>
          <Section title="17 Event Types" color={color}>
            <div className="flex flex-wrap gap-1.5">
              {DATA_EVENTS.map((e) => (
                <span key={e} className="text-[11px] px-2 py-0.5 rounded-full font-mono"
                  style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>{e}</span>
              ))}
            </div>
          </Section>

          <Section title="Event Schema (key fields)" color={color}>
            <div className="space-y-0">
              {[
                ["event_id", "UUID v4, set by client. Idempotency key."],
                ["event_ts", "ISO 8601, client device time."],
                ["ingest_ts", "Server-stamped on arrival. Used for SLA."],
                ["session_id", "UUID for the playback session. Partition key."],
                ["profile_id", "Netflix profile (user within account)."],
                ["account_id", "Billing account."],
                ["content_id", "What was playing."],
                ["device_type", "mobile | tablet | tv | web | game_console"],
                ["playback_state", "playing | paused | buffering | stopped"],
                ["position_sec", "Current playback position in seconds."],
                ["event_type", "One of 17 event types."],
              ].map(([field, desc]) => <Row key={field} label={field} value={desc} />)}
            </div>
          </Section>

          <Section title="Kafka Topics (6)" color={color}>
            <div className="space-y-1">
              {DATA_KAFKA_TOPICS.map((t) => (
                <div key={t.topic} className="py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <code className="text-[11px] font-mono font-bold" style={{ color }}>{t.topic}</code>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg)", color: "var(--text-faint)", border: "1px solid var(--border)" }}>key: {t.key}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>{t.why}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Streaming Pipeline Flow" color={color}>
            <div className="space-y-0.5">
              {["Client batches events (1s window)", "POST /v1/events/batch to Event Collector", "Collector: validate event_id + event_type, stamp ingest_ts", "Publish to correct Kafka topic", "Schema Registry validates Avro schema (BACKWARD_TRANSITIVE)", "Flink consumer group: subscribe to heartbeat-events", "Dedup: check event_id in keyed state (24h TTL)", "Key by session_id, order by event_ts", "Compute interval between consecutive heartbeats where state='playing'", "Session close: 30-min inactivity timeout or explicit playback_stopped", "Write watch_sessions to Silver (Iceberg, MERGE INTO)", "Gold aggregation: SUM(watched_seconds)/3600 per content+country+date"].map((step, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5">
                  <span className="text-[10px] font-bold w-5 shrink-0 pt-0.5 text-right" style={{ color }}>{i + 1}</span>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{step}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Bronze / Silver / Gold" color={color}>
            <div className="space-y-2">
              {DATA_LAKEHOUSE.map((l) => (
                <div key={l.table} className="py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold"
                      style={{ background: l.layer === "Bronze" ? "#cd7f3215" : l.layer === "Silver" ? "#94a3b815" : `${color}15`, color: l.layer === "Bronze" ? "#cd7f32" : l.layer === "Silver" ? "#94a3b8" : color }}>
                      {l.layer}
                    </span>
                    <code className="text-[11px] font-mono font-bold" style={{ color: "var(--text)" }}>{l.table}</code>
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>{l.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Sessionization: how watch hours really works" color={color}>
            <div className="rounded-lg p-3 font-mono text-[11px]" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              <p className="mb-1 font-bold" style={{ color }}>-- WRONG: DO NOT USE</p>
              <p>COUNT(heartbeat events) × 30s</p>
              <p className="mt-2 font-bold" style={{ color }}>-- WRONG: DO NOT USE</p>
              <p>MAX(event_ts) - MIN(event_ts)</p>
              <p className="mt-2 font-bold" style={{ color }}>-- CORRECT</p>
              <p>SELECT session_id,</p>
              <p>  SUM(gap_seconds) AS watched_seconds</p>
              <p>FROM (</p>
              <p>  SELECT session_id,</p>
              <p>    LEAD(event_ts) OVER (PARTITION BY session_id ORDER BY event_ts) - event_ts AS gap_seconds,</p>
              <p>    playback_state</p>
              <p>  FROM deduped_heartbeats</p>
              <p>)</p>
              <p>WHERE playback_state = &apos;playing&apos;</p>
              <p>GROUP BY session_id</p>
            </div>
          </Section>

          <Section title="Top 5 Failures" color={color}>
            <div className="space-y-2">
              {DATA_FAILURES_TOP.map((f) => (
                <div key={f.failure} className="py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                  <p className="text-xs font-bold mb-0.5" style={{ color: "#ef4444" }}>{f.failure}</p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{f.mitigation}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Top 4 Tradeoffs" color={color}>
            <div className="space-y-2">
              {DATA_TRADEOFFS.map((t) => (
                <div key={t.a} className="py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${color}15`, color }}>{t.a}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>vs</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>{t.b}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{t.netflix}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Scale Numbers" color={color}>
            <div className="font-mono space-y-0">
              {[
                ["60M streams × mix of events", "= 15M events/sec peak"],
                ["15M/sec × 2KB × RF3 ÷ 200 MB/s", "= ~720 Kafka brokers"],
                ["2M heartbeats/sec ÷ 2K/partition", "= ~1,000 heartbeat partitions"],
                ["700B events × 2KB × 0.45 zstd", "= ~1.5 PB/day Bronze"],
                ["15M events/sec ÷ 5K/vCPU (Flink)", "= ~3,000 Flink vCPUs"],
                ["Flink state", "= ~20 TB RocksDB on NVMe"],
              ].map(([formula, result]) => (
                <div key={formula} className="flex items-center gap-2 py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                  <code className="text-[11px] flex-1" style={{ color: "var(--text-muted)" }}>{formula}</code>
                  <code className="text-[11px] font-bold shrink-0" style={{ color }}>{result}</code>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

export { CheatSheetTab };
