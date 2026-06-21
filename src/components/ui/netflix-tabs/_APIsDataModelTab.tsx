"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Role } from "./types";

function CopyButton({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setC(true); setTimeout(() => setC(false), 2000); }); }}
      className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
      style={{ background: c ? "#22c55e" : "#2a2b3d", color: c ? "#fff" : "#a9b1d6", cursor: "pointer", border: "none" }}
    >{c ? "Copied!" : "Copy"}</button>
  );
}

const BACKEND_APIS = [
  { method: "POST", path: "/v1/playback/sessions", purpose: "Start a new playback session", auth: "JWT", idempotency: "Idempotent on client session_id", service: "Playback Service", db: "Redis (active_streams), Cassandra (playback_sessions)" },
  { method: "POST", path: "/v1/playback/heartbeat", purpose: "Refresh session lease + update watch progress", auth: "JWT", idempotency: "Idempotent — dedup by session_id+event_ts", service: "Watch Progress Service", db: "Cassandra (watch_progress), Redis (TTL refresh)" },
  { method: "DELETE", path: "/v1/playback/sessions/{session_id}", purpose: "End session, release concurrency slot", auth: "JWT", idempotency: "Idempotent — deleting non-existent session = 200", service: "Playback Service", db: "Redis (remove from active_streams)" },
  { method: "GET", path: "/v1/profiles/{profile_id}/continue-watching", purpose: "Return partially watched titles for resume", auth: "JWT", idempotency: "Read — always idempotent", service: "Watch Progress Service", db: "Cassandra (watch_progress), EVCache" },
  { method: "GET", path: "/v1/content/{content_id}/metadata", purpose: "Fetch title info, encoding variants, regions", auth: "JWT optional", idempotency: "Read", service: "Metadata Service", db: "Cassandra (content_metadata), EVCache" },
  { method: "GET", path: "/v1/search?q=...", purpose: "Search titles by keyword", auth: "JWT", idempotency: "Read", service: "Search Service", db: "Elasticsearch" },
  { method: "GET", path: "/v1/profiles/{profile_id}/recommendations", purpose: "Personalized content recommendations", auth: "JWT", idempotency: "Read", service: "Recommendation Service", db: "Cassandra (pre-computed recs), Redis (TTL cache)" },
  { method: "POST", path: "/v1/devices/register", purpose: "Register a new device for DRM binding", auth: "JWT", idempotency: "Idempotent on device_id", service: "Auth Service", db: "MySQL (devices)" },
];

const BACKEND_TABLES = [
  {
    name: "users", db: "MySQL", color: "#3b82f6",
    pk: "user_id", sk: "—",
    cols: ["user_id UUID PK", "email TEXT UNIQUE", "password_hash TEXT", "created_at TIMESTAMP", "region TEXT"],
    readPattern: "Lookup by email on login", writePattern: "Insert on signup, update rarely",
    consistency: "STRONG — account creation must be ACID", why: "Low write volume, needs uniqueness constraint on email. MySQL gives ACID guarantees.",
    interview: "Users table is MySQL because we need uniqueness enforcement on email and ACID on account creation.",
  },
  {
    name: "profiles", db: "MySQL", color: "#6366f1",
    pk: "profile_id", sk: "user_id (FK)",
    cols: ["profile_id UUID PK", "user_id UUID FK", "name TEXT", "avatar_url TEXT", "maturity_rating TEXT", "language TEXT"],
    readPattern: "Fetch all profiles for a user", writePattern: "Insert/update on profile management",
    consistency: "STRONG", why: "Profiles are account-level data with low write volume. MySQL is fine.",
    interview: "Up to 5 profiles per account. Profile is the unit for watch history and recommendations.",
  },
  {
    name: "user_subscriptions", db: "MySQL", color: "#f59e0b",
    pk: "account_id", sk: "—",
    cols: ["account_id UUID PK", "plan_type TEXT", "max_streams INT", "status TEXT", "valid_until TIMESTAMP", "billing_id UUID"],
    readPattern: "Lookup by account_id on every playback start", writePattern: "Updated on payment or cancellation",
    consistency: "STRONG — ACID required for billing", why: "Billing data must be ACID. MySQL with read replica handles read load.",
    interview: "Subscription check fails open (service down → allow playback). But the data itself must be strongly consistent.",
  },
  {
    name: "devices", db: "MySQL", color: "#8b5cf6",
    pk: "device_id", sk: "account_id (FK)",
    cols: ["device_id UUID PK", "account_id UUID FK", "device_type TEXT", "drm_type TEXT", "registered_at TIMESTAMP", "last_active_at TIMESTAMP"],
    readPattern: "Lookup by device_id for DRM license", writePattern: "Insert on registration, update on active",
    consistency: "STRONG", why: "DRM binding is per device — must be strongly consistent.",
    interview: "Device registration enables DRM binding. A movie licensed to device_id A cannot be played on device_id B.",
  },
  {
    name: "content_metadata", db: "Cassandra", color: "#10b981",
    pk: "content_id", sk: "—",
    cols: ["content_id UUID PK", "title TEXT", "duration_sec INT", "genres LIST<TEXT>", "available_regions SET<TEXT>", "drm_required BOOLEAN", "encoding_variants LIST<TEXT>"],
    readPattern: "Lookup by content_id — millions of reads/sec", writePattern: "Updated on content ingestion",
    consistency: "ONE read — served through EVCache 99.9%", why: "Extremely read-heavy, rarely written. EVCache in front handles most reads.",
    interview: "Content metadata is cached in EVCache. If EVCache misses, Cassandra handles the read. If Cassandra is slow, stale cache is acceptable.",
  },
  {
    name: "playback_sessions", db: "Cassandra", color: "#06b6d4",
    pk: "session_id", sk: "—",
    cols: ["session_id UUID PK", "profile_id UUID", "content_id UUID", "device_id UUID", "account_id UUID", "started_at TIMESTAMP", "status TEXT"],
    readPattern: "Lookup by session_id on heartbeat", writePattern: "Insert on start, update on end",
    consistency: "QUORUM — session must be visible immediately", why: "Concurrency Service needs to see sessions immediately after creation.",
    interview: "QUORUM reads/writes here because the Concurrency Service must see new sessions from all devices instantly.",
  },
  {
    name: "watch_progress", db: "Cassandra", color: "#a855f7",
    pk: "profile_id", sk: "content_id",
    cols: ["profile_id UUID PK", "content_id UUID CK", "position_sec INT", "duration_sec INT", "last_updated_at TIMESTAMP", "device_id UUID", "session_id UUID"],
    readPattern: "Fetch all in-progress content for a profile", writePattern: "Upsert every 30s per active stream",
    consistency: "ONE write — eventual consistency acceptable", why: "2M writes/sec at peak. Eventual consistency acceptable for resume. A 30s staleness is fine.",
    interview: "Partition by profile_id so we can fetch all in-progress titles in one query. content_id is the clustering key.",
  },
  {
    name: "active_streams", db: "Redis", color: "#ef4444",
    pk: "account:{account_id}:streams", sk: "SET of session_ids",
    cols: ["key: account:{account_id}:streams", "type: Redis SET", "TTL: 45 seconds", "value: SET<session_id>"],
    readPattern: "SCARD on every playback start (count)", writePattern: "SADD on start, SREM on end, auto-expire via TTL",
    consistency: "STRONG — Redis is authoritative for concurrency", why: "Concurrency limit enforcement requires atomic check-and-set. Redis Lua script is the right tool.",
    interview: "Redis for concurrency: atomic, sub-millisecond, TTL-native. Cassandra's eventual consistency would allow over-limit streams during replication lag.",
  },
];

const DATA_EVENTS = [
  { name: "playback_started", kafka: "playback-events", key: "session_id", frequency: "Once per session", criticalFields: ["session_id", "content_id", "profile_id", "event_ts"] },
  { name: "playback_heartbeat", kafka: "heartbeat-events", key: "session_id", frequency: "Every 30s", criticalFields: ["session_id", "position_sec", "event_ts", "ingest_ts"] },
  { name: "playback_stopped", kafka: "playback-events", key: "session_id", frequency: "On stop/close", criticalFields: ["session_id", "position_sec", "event_ts"] },
  { name: "buffering_started", kafka: "quality-events", key: "device_id", frequency: "On buffer underrun", criticalFields: ["session_id", "device_id", "event_ts"] },
  { name: "quality_changed", kafka: "quality-events", key: "device_id", frequency: "On bitrate change", criticalFields: ["session_id", "bitrate_kbps", "event_ts"] },
  { name: "search_performed", kafka: "search-events", key: "profile_id", frequency: "On search", criticalFields: ["profile_id", "query", "result_count", "event_ts"] },
  { name: "recommendation_click", kafka: "recommendation-events", key: "profile_id", frequency: "On click", criticalFields: ["profile_id", "content_id", "row_id", "position", "event_ts"] },
];

const LAKEHOUSE_SCHEMA = [
  {
    name: "bronze_raw_playback_events", layer: "Bronze", color: "#92400e",
    partition: "event_date, event_hour", format: "Parquet + zstd",
    cols: ["event_id UUID", "event_type TEXT", "user_id UUID", "profile_id UUID", "content_id UUID", "device_id UUID", "session_id UUID", "event_ts TIMESTAMP", "ingest_ts TIMESTAMP", "position_sec INT", "playback_state TEXT", "country TEXT", "region TEXT", "app_version TEXT"],
    readPattern: "Reprocessing and backfill only", writePattern: "Streaming append from Kafka",
    why: "Immutable source of truth. Append-only. Never modified.",
    interview: "Bronze is append-only. If you ever find a bug in Silver processing, you reprocess from Bronze — never modify it.",
  },
  {
    name: "silver_playback_sessions", layer: "Silver", color: "#475569",
    partition: "session_date", format: "Parquet + zstd",
    cols: ["session_id UUID PK", "profile_id UUID", "content_id UUID", "device_id UUID", "country TEXT", "session_date DATE", "start_ts TIMESTAMP", "end_ts TIMESTAMP", "watched_seconds INT", "pause_count INT", "completion_pct FLOAT", "was_crashed BOOLEAN"],
    readPattern: "Aggregation jobs for Gold layer", writePattern: "Batch sessionization from Bronze",
    why: "Sessionized: raw events → one row per watch session. Deduped and validated.",
    interview: "The sessionization is the hard part. Heartbeats → watched_seconds requires careful interval arithmetic and dedup.",
  },
  {
    name: "gold_content_watch_hours_daily", layer: "Gold", color: "#d97706",
    partition: "watch_date", format: "Parquet, Z-order: content_id, country",
    cols: ["content_id UUID", "watch_date DATE", "country TEXT", "total_watch_hours FLOAT", "total_sessions BIGINT", "unique_viewers BIGINT", "avg_completion_rate FLOAT", "buffering_ratio FLOAT"],
    readPattern: "BI dashboards, ML feature pipeline", writePattern: "Daily Spark aggregation job",
    why: "Pre-aggregated for fast dashboard queries. Z-ordering on content_id+country cuts scan cost.",
    interview: "Watch hours = SUM(watched_seconds) / 3600. Do NOT count raw heartbeats — that double-counts if heartbeats are duplicated.",
  },
  {
    name: "gold_user_watch_hours_daily", layer: "Gold", color: "#d97706",
    partition: "watch_date", format: "Parquet",
    cols: ["user_id UUID", "watch_date DATE", "total_watch_hours FLOAT", "distinct_titles_watched INT", "devices_used INT", "top_genre TEXT"],
    readPattern: "Churn prediction, engagement features", writePattern: "Daily Spark aggregation job",
    why: "User-level engagement metrics for ML and churn analysis.",
    interview: "User-level watch hours feed directly into the churn prediction model and content recommendation features.",
  },
];

function SectionHeader({ title, count, onExpandAll, onCollapseAll }: { title: string; count: number; onExpandAll: () => void; onCollapseAll: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
      <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
        {title} <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}>({count})</span>
      </h3>
      <div className="flex gap-2">
        <button onClick={onExpandAll} className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: "var(--blue-soft)", color: "var(--blue-text)", cursor: "pointer", border: "none" }}>
          Expand All
        </button>
        <button onClick={onCollapseAll} className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>
          Collapse
        </button>
      </div>
    </div>
  );
}

function APIsDataModelTab({ role }: { role: Role }) {
  const [subTab, setSubTab] = useState<"backend" | "data">(role === "Data Engineer" ? "data" : "backend");
  const [openApis, setOpenApis] = useState<Set<number>>(new Set());
  const [openTables, setOpenTables] = useState<Set<number>>(new Set());
  const [openEvents, setOpenEvents] = useState<Set<number>>(new Set());
  const [openSchemas, setOpenSchemas] = useState<Set<number>>(new Set());

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, idx: number) => {
    setter(prev => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; });
  };
  const expandAll = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, count: number) =>
    setter(new Set(Array.from({ length: count }, (_, i) => i)));
  const collapseAll = (setter: React.Dispatch<React.SetStateAction<Set<number>>>) => setter(new Set());

  return (
    <div className="space-y-5">
      {/* Header + sub-tabs */}
      <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>APIs + Data Model</h2>
          <div className="flex gap-1 p-1 rounded-xl ml-auto" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            {[["backend", "Backend APIs + Tables"], ["data", "Data Events + Lakehouse Tables"]].map(([key, label]) => (
              <button key={key} onClick={() => setSubTab(key as "backend" | "data")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: subTab === key ? (key === "backend" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)") : "transparent", color: subTab === key ? (key === "backend" ? "#3b82f6" : "#10b981") : "var(--text-muted)", cursor: "pointer", border: "none" }}
              >{label}</button>
            ))}
          </div>
        </div>
      </div>

      {subTab === "backend" && (
        <>
          {/* Backend APIs */}
          <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <SectionHeader title="Backend APIs" count={BACKEND_APIS.length}
              onExpandAll={() => expandAll(setOpenApis, BACKEND_APIS.length)}
              onCollapseAll={() => collapseAll(setOpenApis)} />
            <div className="space-y-2">
              {BACKEND_APIS.map((api, i) => {
                const isOpen = openApis.has(i);
                const mc = api.method === "GET" ? "#10b981" : api.method === "POST" ? "#3b82f6" : "#ef4444";
                return (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ borderTop: `3px solid ${mc}`, borderRight: `1px solid ${isOpen ? `${mc}40` : "var(--border)"}`, borderBottom: `1px solid ${isOpen ? `${mc}40` : "var(--border)"}`, borderLeft: `1px solid ${isOpen ? `${mc}40` : "var(--border)"}` }}>
                    <div className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer"
                      style={{ background: "var(--bg)" }}
                      onClick={() => toggle(setOpenApis, i)}
                      aria-expanded={isOpen} role="button" tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && toggle(setOpenApis, i)}>
                      <span className="text-[10px] font-bold px-2 py-1 rounded shrink-0" style={{ background: `${mc}20`, color: mc }}>{api.method}</span>
                      <code className="text-sm font-mono flex-1" style={{ color: "var(--text)" }}>{api.path}</code>
                      <CopyButton text={api.path} />
                      <span className="text-xs hidden sm:inline" style={{ color: "var(--text-faint)" }}>{api.purpose}</span>
                      <span className="text-xs shrink-0 ml-2 transition-transform duration-200" style={{ color: "var(--text-muted)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                        {[["Purpose", api.purpose], ["Auth", api.auth], ["Idempotency", api.idempotency], ["Service owner", api.service], ["DB/Cache", api.db]].map(([k, v]) => (
                          <div key={k as string} className="rounded-lg p-2.5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>{k}</div>
                            <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Backend tables */}
          <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <SectionHeader title="Backend Database Tables" count={BACKEND_TABLES.length}
              onExpandAll={() => expandAll(setOpenTables, BACKEND_TABLES.length)}
              onCollapseAll={() => collapseAll(setOpenTables)} />
            <div className="space-y-2">
              {BACKEND_TABLES.map((tbl, i) => {
                const isOpen = openTables.has(i);
                return (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ borderTop: `3px solid ${tbl.color}`, borderRight: `1px solid ${isOpen ? `${tbl.color}40` : "var(--border)"}`, borderBottom: `1px solid ${isOpen ? `${tbl.color}40` : "var(--border)"}`, borderLeft: `1px solid ${isOpen ? `${tbl.color}40` : "var(--border)"}` }}>
                    <div className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer"
                      style={{ background: "var(--bg)" }}
                      onClick={() => toggle(setOpenTables, i)}
                      aria-expanded={isOpen} role="button" tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && toggle(setOpenTables, i)}>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0" style={{ background: `${tbl.color}20`, color: tbl.color }}>{tbl.db}</span>
                      <code className="text-sm font-mono font-bold flex-1" style={{ color: "var(--text)" }}>{tbl.name}</code>
                      <CopyButton text={tbl.name} />
                      <span className="text-[11px] hidden sm:inline" style={{ color: "var(--text-faint)" }}>PK: {tbl.pk}</span>
                      <span className="text-xs shrink-0 ml-2 transition-transform duration-200" style={{ color: "var(--text-muted)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                        <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
                          <table className="w-full text-xs">
                            <thead><tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                              <th className="text-left py-2 px-3 font-bold" style={{ color: "var(--text-muted)" }}>Column</th>
                              <th className="text-left py-2 px-3 font-bold" style={{ color: "var(--text-muted)" }}>Type / notes</th>
                            </tr></thead>
                            <tbody>{tbl.cols.map((c, ci) => {
                              const [col, ...rest] = c.split(" ");
                              return (
                                <tr key={ci} style={{ borderBottom: ci < tbl.cols.length - 1 ? "1px solid var(--border)" : "none" }}>
                                  <td className="py-1.5 px-3 font-mono" style={{ color: tbl.color }}>{col}</td>
                                  <td className="py-1.5 px-3 font-mono" style={{ color: "var(--text-muted)" }}>{rest.join(" ")}</td>
                                </tr>
                              );
                            })}</tbody>
                          </table>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[["Read", tbl.readPattern], ["Write", tbl.writePattern], ["Consistency", tbl.consistency]].map(([k, v]) => (
                            <div key={k as string} className="rounded-lg p-2.5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                              <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-faint)" }}>{k}</div>
                              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg p-2.5" style={{ background: `${tbl.color}0d`, border: `1px solid ${tbl.color}30` }}>
                          <span className="text-xs font-bold" style={{ color: tbl.color }}>Why {tbl.db}: </span>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{tbl.why}</span>
                        </div>
                        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #10b981" }}>
                          <div className="px-3 py-1.5" style={{ background: "rgba(16,185,129,0.1)" }}><span className="text-[11px] font-bold" style={{ color: "#10b981" }}>Interview answer</span></div>
                          <p className="px-3 py-2 text-xs leading-relaxed" style={{ background: "var(--bg)", color: "var(--text)" }}>{tbl.interview}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {subTab === "data" && (
        <>
          {/* Data events */}
          <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <SectionHeader title="Data Events" count={DATA_EVENTS.length}
              onExpandAll={() => expandAll(setOpenEvents, DATA_EVENTS.length)}
              onCollapseAll={() => collapseAll(setOpenEvents)} />
            <div className="space-y-2">
              {DATA_EVENTS.map((ev, i) => {
                const isOpen = openEvents.has(i);
                return (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ borderTop: "3px solid #10b981", borderRight: `1px solid ${isOpen ? "#10b98140" : "var(--border)"}`, borderBottom: `1px solid ${isOpen ? "#10b98140" : "var(--border)"}`, borderLeft: `1px solid ${isOpen ? "#10b98140" : "var(--border)"}` }}>
                    <div className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer"
                      style={{ background: "var(--bg)" }}
                      onClick={() => toggle(setOpenEvents, i)}
                      aria-expanded={isOpen} role="button" tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && toggle(setOpenEvents, i)}>
                      <code className="text-sm font-mono font-bold flex-1" style={{ color: "#10b981" }}>{ev.name}</code>
                      <CopyButton text={ev.name} />
                      <span className="text-xs hidden sm:inline font-mono" style={{ color: "var(--text-faint)" }}>→ {ev.kafka}</span>
                      <span className="text-xs shrink-0 ml-2 transition-transform duration-200" style={{ color: "var(--text-muted)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-3 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                        {[["Kafka topic", ev.kafka], ["Partition key", ev.key], ["Frequency", ev.frequency], ["Critical fields", ev.criticalFields.join(", ")]].map(([k, v]) => (
                          <div key={k as string} className="rounded-lg p-2.5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                            <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-faint)" }}>{k}</div>
                            <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{Array.isArray(v) ? (v as string[]).join(", ") : v}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lakehouse tables */}
          <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <SectionHeader title="Lakehouse Tables (Iceberg)" count={LAKEHOUSE_SCHEMA.length}
              onExpandAll={() => expandAll(setOpenSchemas, LAKEHOUSE_SCHEMA.length)}
              onCollapseAll={() => collapseAll(setOpenSchemas)} />
            <div className="space-y-2">
              {LAKEHOUSE_SCHEMA.map((tbl, i) => {
                const isOpen = openSchemas.has(i);
                return (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ borderTop: `3px solid ${tbl.color}`, borderRight: `1px solid ${isOpen ? `${tbl.color}40` : "var(--border)"}`, borderBottom: `1px solid ${isOpen ? `${tbl.color}40` : "var(--border)"}`, borderLeft: `1px solid ${isOpen ? `${tbl.color}40` : "var(--border)"}` }}>
                    <div className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer"
                      style={{ background: "var(--bg)" }}
                      onClick={() => toggle(setOpenSchemas, i)}
                      aria-expanded={isOpen} role="button" tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && toggle(setOpenSchemas, i)}>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0" style={{ background: `${tbl.color}20`, color: tbl.color }}>{tbl.layer}</span>
                      <code className="text-sm font-mono font-bold flex-1" style={{ color: "var(--text)" }}>{tbl.name}</code>
                      <CopyButton text={tbl.name} />
                      <span className="text-[11px] hidden sm:inline font-mono" style={{ color: "var(--text-faint)" }}>Partition: {tbl.partition}</span>
                      <span className="text-xs shrink-0 ml-2 transition-transform duration-200" style={{ color: "var(--text-muted)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                        <div className="grid grid-cols-2 gap-2">
                          {[["Format", tbl.format], ["Partition", tbl.partition]].map(([k, v]) => (
                            <div key={k as string} className="rounded-lg p-2.5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                              <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-faint)" }}>{k}</div>
                              <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
                          <table className="w-full text-xs">
                            <thead><tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                              <th className="text-left py-2 px-3 font-bold" style={{ color: "var(--text-muted)" }}>Column</th>
                              <th className="text-left py-2 px-3 font-bold" style={{ color: "var(--text-muted)" }}>Type</th>
                            </tr></thead>
                            <tbody>{tbl.cols.map((c, ci) => {
                              const parts = c.split(" ");
                              return (
                                <tr key={ci} style={{ borderBottom: ci < tbl.cols.length - 1 ? "1px solid var(--border)" : "none" }}>
                                  <td className="py-1.5 px-3 font-mono" style={{ color: tbl.color }}>{parts[0]}</td>
                                  <td className="py-1.5 px-3 font-mono" style={{ color: "var(--text-muted)" }}>{parts.slice(1).join(" ")}</td>
                                </tr>
                              );
                            })}</tbody>
                          </table>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[["Read pattern", tbl.readPattern], ["Write pattern", tbl.writePattern]].map(([k, v]) => (
                            <div key={k as string} className="rounded-lg p-2.5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                              <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-faint)" }}>{k}</div>
                              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #10b981" }}>
                          <div className="px-3 py-1.5" style={{ background: "rgba(16,185,129,0.1)" }}><span className="text-[11px] font-bold" style={{ color: "#10b981" }}>Interview answer</span></div>
                          <p className="px-3 py-2 text-xs leading-relaxed" style={{ background: "var(--bg)", color: "var(--text)" }}>{tbl.interview}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export { APIsDataModelTab };
