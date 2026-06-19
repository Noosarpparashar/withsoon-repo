"use client";

import { useState } from "react";
import type { TabSlug, Role } from "@/components/ui/NetflixPage";

type NodeInfo = {
  id: string;
  label: string;
  icon: string;
  color: string;
  responsibility: string;
  apis: string[];
  db: string;
  failureMode: string;
  interviewAnswer: string;
};

const BACKEND_NODES: NodeInfo[] = [
  {
    id: "client", label: "Client Apps", icon: "📱", color: "#3b82f6",
    responsibility: "Mobile, TV, and web apps. Sends playback requests, heartbeats, and events. Handles adaptive bitrate switching and DRM license requests locally.",
    apis: ["POST /v1/playback/sessions", "POST /v1/playback/heartbeat", "GET /v1/profiles/{id}/continue-watching"],
    db: "Local cache only (manifest, license)",
    failureMode: "Client crash → session TTL expires in Redis, slot released after 45s.",
    interviewAnswer: "The client is responsible for adaptive bitrate logic and buffering. The backend only controls which manifest URL to serve — the client decides which quality segment to fetch.",
  },
  {
    id: "api-gateway", label: "API Gateway", icon: "🚪", color: "#6366f1",
    responsibility: "Single entry point. Rate limiting, JWT validation, request routing, TLS termination, and A/B traffic splitting.",
    apis: ["All inbound APIs pass through"],
    db: "Redis (rate limit counters), JWT public key cache",
    failureMode: "Gateway down → all playback requests fail. Must be multi-AZ with auto-scaling.",
    interviewAnswer: "The API Gateway handles cross-cutting concerns so individual services don't have to. It validates JWTs, enforces rate limits, and routes to the right service. It should never have business logic.",
  },
  {
    id: "auth", label: "Auth Service", icon: "🔐", color: "#8b5cf6",
    responsibility: "Validates JWT tokens. Issues new tokens on refresh. Manages device registration. Maintains revocation list in Redis.",
    apis: ["POST /v1/auth/token", "POST /v1/auth/refresh", "POST /v1/devices/register"],
    db: "Redis (revocation list, session tokens), MySQL (user accounts)",
    failureMode: "Auth down → fail closed. Cannot verify identity without auth. Return 503 to client.",
    interviewAnswer: "Short-lived JWTs (15 min) + Redis revocation list. The JWT is stateless for normal reads, but the revocation list handles immediate invalidation on logout or account compromise.",
  },
  {
    id: "subscription", label: "Subscription Service", icon: "💳", color: "#f59e0b",
    responsibility: "Checks active plan, entitlement for content, max concurrent streams allowed. Reads subscription status from MySQL.",
    apis: ["GET /v1/subscriptions/{account_id}", "GET /v1/subscriptions/{account_id}/plan"],
    db: "MySQL (subscriptions, billing), Redis (subscription cache 5 min TTL)",
    failureMode: "Subscription Service down → fail open (allow playback). Better to give a free play than block all streams.",
    interviewAnswer: "Subscription check fails open deliberately. Netflix would rather grant an unauthorized play than block 60 million users during a billing service outage. The subscription status is reconciled async.",
  },
  {
    id: "concurrency", label: "Concurrency Service", icon: "🔢", color: "#ef4444",
    responsibility: "Enforces concurrent stream limits per account. Stores active session set in Redis. Atomic check-and-add using Lua script.",
    apis: ["POST /v1/concurrency/check-and-add", "DELETE /v1/concurrency/{session_id}"],
    db: "Redis (active_streams SET per account, TTL 45s)",
    failureMode: "Redis down → fail open (allow playback) or fail closed (deny). This is a business decision. Netflix's default: fail open for non-premium content.",
    interviewAnswer: "This is the one place where strong consistency is mandatory. A user on a 2-stream plan must not be able to start a 3rd stream. Redis with a Lua script provides atomic check-and-add at sub-millisecond latency.",
  },
  {
    id: "playback", label: "Playback Service", icon: "▶️", color: "#10b981",
    responsibility: "Orchestrates the full play session. Fetches content metadata, constructs session, calls DRM for license, calls Manifest for URL. Central coordinator for the critical path.",
    apis: ["POST /v1/playback/sessions", "DELETE /v1/playback/sessions/{id}"],
    db: "Cassandra (playback_sessions), EVCache (metadata cache)",
    failureMode: "Playback Service down → circuit breaker opens. Return cached stale manifest if available (degraded quality better than black screen).",
    interviewAnswer: "The Playback Service is the orchestrator, not a monolith. It calls Auth, Subscription, Concurrency, Metadata, DRM, and Manifest in the right order. It's stateless — all state is in Cassandra and Redis.",
  },
  {
    id: "metadata", label: "Metadata Service", icon: "📋", color: "#06b6d4",
    responsibility: "Serves content metadata: title, duration, available regions, encoding variants, DRM requirements, subtitle tracks.",
    apis: ["GET /v1/content/{content_id}/metadata", "GET /v1/content/{content_id}/encoding-ladder"],
    db: "Cassandra (content_metadata), EVCache (99.9% of reads served from cache)",
    failureMode: "Metadata Service down → serve from EVCache. EVCache down → serve from Cassandra. If both down → 503.",
    interviewAnswer: "Metadata is extremely read-heavy and rarely changes. EVCache provides 30M req/s with 99.9% hit rate. The Cassandra fallback handles cache misses. Cache invalidation: write-through on content ingestion.",
  },
  {
    id: "drm", label: "DRM Service", icon: "🔒", color: "#ec4899",
    responsibility: "Generates device-bound, time-limited DRM license tokens. Supports Widevine, FairPlay, and PlayReady. Integrates with HSM-backed key management.",
    apis: ["POST /v1/drm/license", "POST /v1/drm/refresh"],
    db: "KMS (key storage), Redis (short-lived license cache per device)",
    failureMode: "DRM Service down → fail CLOSED. Studio contracts legally require DRM for premium content. Return 503 — no fallback without a valid license.",
    interviewAnswer: "DRM is one of the few places where we fail closed. This isn't a reliability choice — it's a legal requirement from studio licensing agreements. No other service in the playback path fails closed.",
  },
  {
    id: "manifest", label: "Manifest Service", icon: "📄", color: "#a855f7",
    responsibility: "Builds the HLS/DASH manifest pointing to the nearest Open Connect Appliance. Selects encoding variants based on device capabilities. Returns manifest URL to client.",
    apis: ["GET /v1/manifest/{content_id}?device={device_id}&profile={profile_id}"],
    db: "EVCache (manifest cache), Cassandra (OCA topology)",
    failureMode: "Manifest Service down → circuit breaker. If stale manifest in cache: return it (client will buffer from last known OCA). If no cache: 503.",
    interviewAnswer: "The manifest URL is the key output of the entire API path. After the client has the manifest, 95% of traffic goes directly to Open Connect, bypassing all API servers. The manifest is the handoff from online to CDN.",
  },
  {
    id: "cdn", label: "CDN / Open Connect", icon: "🌐", color: "#f97316",
    responsibility: "Netflix's own CDN. OCA appliances placed inside ISP networks. Serve video segments to clients. 95% of Netflix bandwidth flows through OCAs without touching API servers.",
    apis: ["GET /chunks/{content_id}/segment_{n}.ts (client direct)"],
    db: "Local SSD/HDD on OCA hardware (600TB–1PB per appliance cluster)",
    failureMode: "OCA node down → client retries to parent cluster. Parent down → origin (S3) fallback. CDN failure never breaks API serving.",
    interviewAnswer: "Open Connect is why Netflix can serve 300 Tbps at reasonable cost. By placing hardware inside ISP networks, Netflix eliminates transit costs entirely. The tradeoff: Netflix owns and operates the hardware, which requires a dedicated engineering team.",
  },
  {
    id: "watch-progress", label: "Watch Progress Service", icon: "🕒", color: "#84cc16",
    responsibility: "Receives heartbeat events. Upserts watch progress per (profile, content). Serves continue-watching list. Eventually consistent.",
    apis: ["POST /v1/playback/heartbeat", "GET /v1/profiles/{id}/continue-watching"],
    db: "Cassandra (watch_progress, partitioned by profile_id), EVCache (continue-watching cache)",
    failureMode: "Heartbeat lost → last saved position used on resume. Max staleness 30s. Service down → all heartbeats dropped. Resume point reverts to last checkpoint.",
    interviewAnswer: "Watch progress is eventually consistent by design. 2M writes/sec from heartbeats can't go through a strongly consistent store. A 30-second staleness on resume is a completely acceptable tradeoff.",
  },
];

const DATA_NODES: NodeInfo[] = [
  {
    id: "client-events", label: "Client Events", icon: "📱", color: "#3b82f6",
    responsibility: "Client apps emit playback events, quality events, search events, and recommendation events. Events are buffered locally and sent in batches every few seconds.",
    apis: ["POST /v1/events/batch (to Event Collector)"],
    db: "Local buffer on device (ring buffer, 500 events max)",
    failureMode: "Network loss → events buffered locally, sent on reconnect. Buffer overflow → oldest events dropped (heartbeats prioritized over impressions).",
    interviewAnswer: "Client buffering is critical for mobile users with intermittent connectivity. Events are not dropped on network loss — they are queued and flushed when connectivity returns.",
  },
  {
    id: "event-collector", label: "Event Collector", icon: "📥", color: "#6366f1",
    responsibility: "HTTP endpoint that receives batched events from clients. Validates event_id, event_type, timestamps. Publishes to Kafka. Assigns ingest_ts.",
    apis: ["POST /v1/events/batch"],
    db: "Kafka (write only — stateless producer)",
    failureMode: "Collector down → client retries with backoff. Events not lost — client buffer holds them. Collector is horizontally scaled and stateless.",
    interviewAnswer: "The Event Collector stamps ingest_ts here. This is separate from event_ts (which comes from the client). The gap between event_ts and ingest_ts measures client-side network latency and is used for late event detection.",
  },
  {
    id: "kafka", label: "Kafka", icon: "📨", color: "#f59e0b",
    responsibility: "Distributed log for all event streams. 6 topic domains. ~15M events/sec peak. 30 GB/s ingest. RF=3 for durability. Retention 7–30 days by topic.",
    apis: ["Kafka producer/consumer API"],
    db: "Kafka internal: ~720 brokers across ~40 clusters",
    failureMode: "Broker failure → leader election (< 30s). Consumer lag → scale consumer group. Unclean leader election disabled to prevent data loss.",
    interviewAnswer: "Kafka is configured for durability: acks=all, min.insync.replicas=2, unclean.leader.election=false. The tradeoff is slightly higher producer latency in exchange for zero data loss.",
  },
  {
    id: "schema-registry", label: "Schema Registry", icon: "📐", color: "#8b5cf6",
    responsibility: "Central schema store for all Avro/Protobuf schemas. Enforces BACKWARD_TRANSITIVE compatibility. Prevents breaking changes from reaching consumers.",
    apis: ["Schema registration API (on producer startup)"],
    db: "Internal (Kafka-backed or Zookeeper-backed)",
    failureMode: "Registry down → cached schemas used. Producers fall back to last registered schema. New schema registrations fail until registry recovers.",
    interviewAnswer: "BACKWARD_TRANSITIVE compatibility means any consumer can read any producer version. Adding optional fields is always safe. Removing fields or changing types requires a new schema version and a consumer migration.",
  },
  {
    id: "stream-processor", label: "Stream Processor", icon: "⚡", color: "#10b981",
    responsibility: "Spark Structured Streaming for Bronze→Silver ETL and lakehouse writes. Flink for real-time sessionization, active user counts, and exactly-once pipelines.",
    apis: ["Kafka consumer API, Iceberg write API"],
    db: "Flink state backend (RocksDB on NVMe), S3 checkpoints every 5 min",
    failureMode: "Checkpoint failure → reprocess from last checkpoint. Consumer lag spike → scale consumer group. Out-of-memory → increase task manager memory or reduce state TTL.",
    interviewAnswer: "Spark and Flink coexist. Spark handles bulk ETL to Iceberg (micro-batch, easier tuning). Flink handles stateful sessionization where event ordering and exactly-once matter.",
  },
  {
    id: "bronze", label: "Bronze Layer", icon: "🟤", color: "#92400e",
    responsibility: "Raw events exactly as received. Append-only. Never modified. Partitioned by event_date/event_hour. Source of truth for all reprocessing and backfills.",
    apis: ["Iceberg write API (append)"],
    db: "S3 + Iceberg, Parquet + zstd, partitioned by event_date/event_hour",
    failureMode: "Write failure → retry with exactly-once Iceberg commit. No partial writes (Iceberg atomic commits). Corrupt file → quarantine and replay from Kafka.",
    interviewAnswer: "Bronze is append-only and immutable. If we ever need to reprocess, we start from Bronze. Never modify Bronze data — it is the canonical history of everything the client sent.",
  },
  {
    id: "silver", label: "Silver Layer", icon: "⚪", color: "#475569",
    responsibility: "Deduplicated, validated, sessionized, enriched events. Bad records in quarantine table. Sessionized watch data with watched_seconds per session.",
    apis: ["Iceberg MERGE INTO (for upserts on reprocessing)"],
    db: "S3 + Iceberg, Parquet + zstd, partitioned by event_date",
    failureMode: "Dedup state lost → re-deduplicate from Bronze for the affected time range. Sessionization incorrect → backfill Silver from Bronze with corrected logic.",
    interviewAnswer: "Silver is where the hard work happens: dedup by event_id, validate schemas, sessionize heartbeats into watch sessions, enrich with content and user dimensions.",
  },
  {
    id: "gold", label: "Gold Layer", icon: "🟡", color: "#d97706",
    responsibility: "Business-ready daily aggregates. Total watch hours by content/country. Completion rate. Buffering ratio. Top content. Used directly by BI tools, dashboards, and ML feature pipelines.",
    apis: ["Trino SQL for ad-hoc, Spark for scheduled aggregation jobs"],
    db: "S3 + Iceberg, Parquet, Z-ordered by content_id+country",
    failureMode: "Gold aggregation fails → serve stale data from previous run. Alert on SLA breach (freshness > 2h). Backfill from Silver for the failed partition.",
    interviewAnswer: "Gold tables are optimized for read performance. Z-ordering on content_id + country means a query like 'watch hours for movie X in India' reads only the relevant data files, not the full table.",
  },
  {
    id: "serving", label: "Trino / Pinot / BI", icon: "📊", color: "#06b6d4",
    responsibility: "Trino for ad-hoc SQL over Iceberg. Apache Pinot for real-time OLAP (< 100ms dashboards). BI tools (Tableau, Looker) connect to Gold tables. ML feature store reads from Silver/Gold.",
    apis: ["JDBC/ODBC for BI, REST API for Pinot, Trino SQL"],
    db: "Reads from Gold Iceberg tables, Pinot has its own ingestion from Kafka",
    failureMode: "Trino query fails → retry or reduce scan range. Pinot segment load failure → stale data served from last loaded segment. BI refresh → schedule off-peak hours.",
    interviewAnswer: "Pinot is for real-time dashboards that need sub-100ms latency. Trino is for ad-hoc analysis. BI tools read from pre-computed Gold tables. The choice depends on latency vs freshness requirements.",
  },
  {
    id: "monitoring", label: "Monitoring", icon: "📡", color: "#a855f7",
    responsibility: "Tracks consumer lag, late event rate, duplicate rate, DLQ growth, pipeline SLA freshness. Alerts on anomalies. Data quality dashboard.",
    apis: ["Prometheus metrics, Kafka JMX, Flink metrics"],
    db: "Prometheus + Grafana, PagerDuty for alerting",
    failureMode: "Monitoring gap itself is a failure. Alert on monitoring gaps. Use synthetic events (canary events) to verify pipeline end-to-end.",
    interviewAnswer: "Key metrics to monitor: consumer lag (signals processing is behind), late event rate (signals clock skew or client issues), DLQ growth (signals desertialization or schema failures), Gold table freshness (SLA on business metrics).",
  },
];

function NodePanel({ node, onClose }: { node: NodeInfo; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-card)" }}>
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{node.icon}</span>
              <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>{node.label}</h3>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 text-xs px-2 py-1 rounded-md" style={{ color: "var(--text-muted)", background: "var(--bg-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>✕</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ fontSize: 13 }}>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>{node.responsibility}</p>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: node.color }}>APIs</p>
          {node.apis.map((a, i) => (
            <code key={i} className="text-[11px] block mb-1 px-2 py-1 rounded" style={{ background: `${node.color}10`, color: node.color }}>{a}</code>
          ))}
        </div>

        <div className="rounded-lg p-2.5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>Database / Storage</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{node.db}</p>
        </div>

        <div className="rounded-lg p-2.5" style={{ background: "#fee2e220", border: "1px solid #fca5a530" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#ef4444" }}>Failure mode</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{node.failureMode}</p>
        </div>

        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #10b981" }}>
          <div className="px-3 py-2" style={{ background: "rgba(16,185,129,0.1)" }}>
            <p className="text-[11px] font-bold" style={{ color: "#10b981" }}>💬 Interview answer</p>
          </div>
          <p className="px-3 py-2.5 text-xs leading-relaxed" style={{ color: "var(--text)", background: "var(--bg)" }}>{node.interviewAnswer}</p>
        </div>
      </div>
    </div>
  );
}

function ArchitectureFlow({ nodes, arrows, color }: {
  nodes: { id: string; label: string; icon: string }[];
  arrows: string[];
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1 items-start">
      {nodes.map((node, i) => (
        <div key={node.id} className="flex flex-col items-start">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
            <span className="text-base">{node.icon}</span>
            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{node.label}</span>
          </div>
          {i < nodes.length - 1 && (
            <div className="ml-4 flex items-center gap-1 my-0.5">
              <div className="w-px h-4" style={{ background: `${color}40` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Which nodes fail if a given node fails (downstream dependencies)
const BACKEND_BLAST_RADIUS: Record<string, string[]> = {
  "api-gateway": ["auth", "subscription", "concurrency", "playback", "drm", "manifest", "watch-progress"],
  "auth": ["subscription", "concurrency", "playback", "drm", "manifest"],
  "subscription": ["playback"],
  "concurrency": ["playback"],
  "playback": ["drm", "manifest"],
  "drm": [],
  "manifest": ["cdn"],
  "cdn": [],
  "watch-progress": [],
  "client": [],
  "metadata": ["playback"],
};

const DATA_BLAST_RADIUS: Record<string, string[]> = {
  "event-collector": ["kafka"],
  "kafka": ["stream-processor", "schema-registry"],
  "schema-registry": ["kafka"],
  "stream-processor": ["bronze", "silver"],
  "bronze": ["silver"],
  "silver": ["gold"],
  "gold": ["serving"],
  "serving": [],
  "monitoring": [],
  "client-events": ["event-collector"],
};

function ArchitectureMapTab({ role, onNavigateTab: _onNavigateTab }: { role: Role; onNavigateTab: (tab: TabSlug) => void }) {
  const [mode, setMode] = useState<"backend" | "data">(role === "Data Engineer" ? "data" : "backend");
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [blastRadiusMode, setBlastRadiusMode] = useState(false);
  const [blastSource, setBlastSource] = useState<string | null>(null);

  const nodes = mode === "backend" ? BACKEND_NODES : DATA_NODES;
  const color = mode === "backend" ? "#3b82f6" : "#10b981";
  const title = mode === "backend" ? "Backend Architecture" : "Data Engineering Architecture";
  const blastMap = mode === "backend" ? BACKEND_BLAST_RADIUS : DATA_BLAST_RADIUS;

  const blastAffected = blastSource ? (blastMap[blastSource] ?? []) : [];

  const flow = mode === "backend" ? [
    { id: "client", label: "Client Apps", icon: "📱" },
    { id: "api-gateway", label: "API Gateway", icon: "🚪" },
    { id: "auth", label: "Auth Service", icon: "🔐" },
    { id: "subscription", label: "Subscription Service", icon: "💳" },
    { id: "concurrency", label: "Concurrency Service", icon: "🔢" },
    { id: "playback", label: "Playback Service", icon: "▶️" },
    { id: "drm", label: "DRM Service", icon: "🔒" },
    { id: "manifest", label: "Manifest Service", icon: "📄" },
    { id: "cdn", label: "CDN / Open Connect", icon: "🌐" },
    { id: "watch-progress", label: "Watch Progress Service", icon: "🕒" },
  ] : [
    { id: "client-events", label: "Client Events", icon: "📱" },
    { id: "event-collector", label: "Event Collector", icon: "📥" },
    { id: "kafka", label: "Kafka", icon: "📨" },
    { id: "schema-registry", label: "Schema Registry", icon: "📐" },
    { id: "stream-processor", label: "Stream Processor", icon: "⚡" },
    { id: "bronze", label: "Bronze Layer", icon: "🟤" },
    { id: "silver", label: "Silver Layer", icon: "⚪" },
    { id: "gold", label: "Gold Layer", icon: "🟡" },
    { id: "serving", label: "Trino / Pinot / BI", icon: "📊" },
    { id: "monitoring", label: "Monitoring", icon: "📡" },
  ];

  function handleNodeClick(node: NodeInfo) {
    if (blastRadiusMode) {
      setBlastSource(blastSource === node.id ? null : node.id);
    } else {
      setSelectedNode(selectedNode?.id === node.id ? null : node);
    }
  }

  function getNodeStyle(node: NodeInfo) {
    if (blastRadiusMode) {
      const isSource = blastSource === node.id;
      const isAffected = blastAffected.includes(node.id);
      if (isSource) return { bg: "#ef444415", border: "#ef4444", color: "#ef4444" };
      if (isAffected && blastSource) return { bg: "#f9731615", border: "#f97316", color: "#f97316" };
      if (blastSource) return { bg: "transparent", border: "var(--border)", color: "var(--text-faint)" };
      return { bg: "var(--bg)", border: "var(--border)", color: node.color };
    }
    const isSelected = selectedNode?.id === node.id;
    return {
      bg: isSelected ? `${node.color}12` : "var(--bg)",
      border: isSelected ? node.color : "var(--border)",
      color: isSelected ? node.color : node.color,
    };
  }

  return (
    <div className="space-y-5">
      {/* Header + toggle */}
      <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Architecture Map</h2>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            {(["backend", "data"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setSelectedNode(null); setBlastSource(null); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: mode === m ? (m === "backend" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)") : "transparent", color: mode === m ? (m === "backend" ? "#3b82f6" : "#10b981") : "var(--text-muted)", cursor: "pointer", border: "none" }}
                aria-pressed={mode === m}
              >
                {m === "backend" ? "⚙️ Backend" : "📊 Data Engineering"}
              </button>
            ))}
          </div>
        </div>

        {/* Mode toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>
            {blastRadiusMode ? "Click a node to see what breaks if it fails (red = failed, orange = affected)." : "Click any node to see responsibility, APIs, DB, failure mode, and interview answer."}
          </p>
          <button
            onClick={() => { setBlastRadiusMode(v => !v); setBlastSource(null); setSelectedNode(null); }}
            className="ml-auto text-xs px-3 py-1.5 rounded-xl font-semibold transition-all"
            style={{
              background: blastRadiusMode ? "#ef444415" : "var(--bg)",
              color: blastRadiusMode ? "#ef4444" : "var(--text-muted)",
              border: `1px solid ${blastRadiusMode ? "#ef4444" : "var(--border)"}`,
              cursor: "pointer",
            }}
            aria-pressed={blastRadiusMode}
          >
            {blastRadiusMode ? "💥 Blast Radius ON" : "💥 Blast Radius Mode"}
          </button>
        </div>

        {blastRadiusMode && blastSource && (
          <div className="mt-3 rounded-lg p-3" style={{ background: "#fef2f2", border: "1px solid #fca5a5" }}>
            <p className="text-xs font-bold mb-1" style={{ color: "#991b1b" }}>
              If <strong>{nodes.find(n => n.id === blastSource)?.label}</strong> fails:
            </p>
            {blastAffected.length > 0 ? (
              <p className="text-xs" style={{ color: "#7f1d1d" }}>
                These services are directly affected: {blastAffected.map(id => nodes.find(n => n.id === id)?.label).filter(Boolean).join(", ")}
              </p>
            ) : (
              <p className="text-xs" style={{ color: "#7f1d1d" }}>No direct downstream dependents — this is a leaf node.</p>
            )}
          </div>
        )}
      </div>

      {/* Main map + panel */}
      <div className="flex gap-4 flex-col sm:flex-row" style={{ minHeight: 400 }}>
        {/* Node grid */}
        <div className="flex-1 rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color }}>{title}</p>

          {/* Flow chain (linear) */}
          <div className="hidden md:block mb-5">
            <ArchitectureFlow nodes={flow} arrows={[]} color={color} />
          </div>

          {/* Clickable node cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
            {nodes.map((node) => {
              const s = getNodeStyle(node);
              const isBlastSource = blastRadiusMode && blastSource === node.id;
              const isBlastAffected = blastRadiusMode && blastAffected.includes(node.id);
              return (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className="text-left p-3 rounded-xl transition-all duration-150 group"
                  style={{
                    background: s.bg,
                    border: `1px solid ${s.border}`,
                    borderTop: `3px solid ${s.border}`,
                    cursor: "pointer",
                    opacity: blastRadiusMode && blastSource && !isBlastSource && !isBlastAffected ? 0.4 : 1,
                  }}
                  aria-label={`${node.label} — click to ${blastRadiusMode ? "see blast radius" : "view details"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{node.icon}</span>
                    <span className="text-xs font-bold truncate" style={{ color: isBlastSource ? "#ef4444" : isBlastAffected ? "#f97316" : "var(--text)" }}>{node.label}</span>
                    {isBlastSource && <span className="ml-auto text-[10px] font-bold" style={{ color: "#ef4444" }}>FAILS</span>}
                    {isBlastAffected && <span className="ml-auto text-[10px] font-bold" style={{ color: "#f97316" }}>AFFECTED</span>}
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-faint)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {node.responsibility.split(".")[0]}.
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        {selectedNode && !blastRadiusMode && (
          <div
            className="shrink-0 rounded-xl overflow-hidden"
            style={{ width: "100%", maxWidth: 360, border: "1px solid var(--border)" }}
          >
            <NodePanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          </div>
        )}
      </div>

      {/* Quick reference */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>
          {mode === "backend" ? "Backend Architecture — Key Interview Points" : "Data Architecture — Key Interview Points"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(mode === "backend" ? [
            { point: "API path vs data path", detail: "95% of Netflix bandwidth flows CDN-direct. The API path (Gateway→Auth→Playback→DRM→Manifest) is only for session setup." },
            { point: "Fail open vs fail closed", detail: "DRM fails closed (legal requirement). Everything else fails open with degraded experience." },
            { point: "Consistency boundaries", detail: "Concurrency limit → Redis (strong). Watch progress → Cassandra (eventual). Billing → MySQL (ACID)." },
            { point: "EVCache is critical", detail: "Without EVCache, 30M metadata reads/sec would hit Cassandra. Cache hit rate > 99.9%." },
          ] : [
            { point: "event_ts vs ingest_ts", detail: "Always use event_ts for processing. Use ingest_ts only for measuring pipeline latency." },
            { point: "Bronze is immutable", detail: "Never modify Bronze. Reprocessing always starts from Bronze. It is the canonical source of truth." },
            { point: "Dedup before any aggregation", detail: "Counting raw heartbeats gives wrong watch time. Always dedup by event_id first." },
            { point: "Watermark for late events", detail: "30-minute watermark for heartbeats. Events after watermark go to DLQ, not silently dropped." },
          ]).map((item) => (
            <div key={item.point} className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-bold mb-1" style={{ color }}>▸ {item.point}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { ArchitectureMapTab };
