"use client";

import { useState } from "react";
import {
  ACCESS_PATTERNS,
  ENCODING_PIPELINE,
  RECOMMENDATION_DEEP_DIVE,
  HOUSEHOLD_ENFORCEMENT,
} from "@/components/ui/netflix-system-data";
import { SayThisBlock, FollowUpsAccordion, DbTablesView, CodeBlock, CodeBlockWithCopy } from "./shared";

const ENTITY_DOMAINS = [
  {
    name: "IDENTITY",
    color: "#3b82f6",
    icon: "👤",
    entities: [
      { name: "Account", rel: "root entity" },
      { name: "Profile", rel: "1:5 per Account" },
      { name: "Device", rel: "linked to Profile" },
      { name: "Subscription", rel: "per Account" },
      { name: "Payment", rel: "per Account" },
    ],
    note: "Account has up to 5 Profiles",
  },
  {
    name: "CONTENT",
    color: "#8b5cf6",
    icon: "🎬",
    entities: [
      { name: "Title", rel: "root content entity" },
      { name: "Season", rel: "per Title (TV)" },
      { name: "Episode", rel: "per Season" },
      { name: "VideoAsset", rel: "many per Episode" },
      { name: "SubtitleTrack", rel: "20+ languages" },
      { name: "AudioTrack", rel: "stereo / 5.1 / Atmos" },
      { name: "EncodingVariant", rel: "1,200+ per Title" },
    ],
    note: "Title has 1,200+ EncodingVariants",
  },
  {
    name: "ACTIVITY",
    color: "#10b981",
    icon: "▶",
    entities: [
      { name: "PlaybackSession", rel: "active stream" },
      { name: "WatchHistory", rel: "per Profile" },
      { name: "ResumePosition", rel: "per Profile × Title" },
      { name: "UserRating", rel: "thumbs up / down" },
      { name: "ContinueWatching", rel: "homepage row" },
    ],
    note: "PlaybackSession writes to WatchHistory via heartbeat",
  },
  {
    name: "DISCOVERY",
    color: "#3b82f6",
    icon: "🔍",
    entities: [
      { name: "SearchDocument", rel: "Elasticsearch index" },
      { name: "CatalogCache", rel: "EVCache, 5 min TTL" },
    ],
    note: "SearchDocument lives in Elasticsearch; CatalogCache in EVCache",
  },
  {
    name: "ENGAGEMENT",
    color: "#8b5cf6",
    icon: "🔔",
    entities: [
      { name: "Recommendation", rel: "Cassandra + EVCache" },
      { name: "Notification", rel: "push / email / in-app" },
    ],
    note: "Recommendation reads FeatureVector from Feature Store",
  },
  {
    name: "PLATFORM",
    color: "#f59e0b",
    icon: "⚙️",
    entities: [
      { name: "Experiment", rel: "A/B test config" },
      { name: "FeatureVector", rel: "Feature Store" },
      { name: "Event", rel: "Kafka → S3" },
    ],
    note: "Recommendation reads FeatureVector from Feature Store",
  },
];

const KEY_RELATIONSHIPS = [
  "Account has up to 5 Profiles",
  "Title has 1,200+ EncodingVariants (6 resolutions × 3 bitrates × DRM × audio × subtitle × HDR)",
  "PlaybackSession writes to WatchHistory via 30-second heartbeat",
  "Recommendation reads FeatureVector from Feature Store (online + offline)",
];

const STORAGE_GROUPS = [
  {
    db: "MySQL",
    emoji: "🗄️",
    color: "#3b82f6",
    tagline: "ACID required",
    count: 4,
    rows: [
      {
        table: "subscriptions",
        access: "SELECT by account_id; UPDATE on renewal",
        why: "Subscription state must be strongly consistent — billing and concurrency checks both read it. Eventual consistency would allow double-charging.",
      },
      {
        table: "payments",
        access: "INSERT on charge; SELECT by account for history",
        why: "Financial ledger requires durability and rollback. A failed payment write must never silently disappear.",
      },
      {
        table: "accounts / profiles",
        access: "SELECT by email for login; UPDATE profile settings",
        why: "Low write rate, strong read consistency needed for auth. Fits MySQL perfectly.",
      },
      {
        table: "billing_events",
        access: "INSERT on every billing state transition",
        why: "Audit trail with FK integrity to payments and subscriptions. ACID guarantees the event log is never inconsistent with the subscription state.",
      },
    ],
  },
  {
    db: "Cassandra",
    emoji: "🪨",
    color: "#8b5cf6",
    tagline: "High write throughput + key-based access",
    count: 5,
    rows: [
      {
        table: "watch_history_by_profile",
        pk: "profile_id",
        ck: "watched_at DESC",
        cl: "LOCAL_QUORUM",
        why: "2M writes/sec from heartbeats — no RDBMS survives this. Partition by profile_id gives O(1) fetch of recent history.",
      },
      {
        table: "resume_position_by_profile_title",
        pk: "(profile_id, title_id)",
        ck: "—",
        cl: "LOCAL_QUORUM",
        why: "Single-row read per play session. Upsert semantics on each heartbeat.",
      },
      {
        table: "stream_sessions",
        pk: "profile_id",
        ck: "session_id",
        cl: "LOCAL_QUORUM (write) / ONE (read)",
        why: "Concurrent stream limit enforcement. Write with quorum for consistency, read with ONE to minimise playback-path latency.",
      },
      {
        table: "recommendations_by_profile",
        pk: "profile_id",
        ck: "rank ASC",
        cl: "ONE",
        why: "Pre-computed rows pushed from offline ML pipeline. Stale by minutes is acceptable. ONE gives sub-5ms P99.",
      },
      {
        table: "device_sessions_by_account",
        pk: "account_id",
        ck: "last_seen DESC",
        cl: "LOCAL_QUORUM",
        why: "Household enforcement reads all devices for an account in a single partition query.",
      },
    ],
  },
  {
    db: "Redis + EVCache",
    emoji: "⚡",
    color: "#10b981",
    tagline: "Sub-millisecond access",
    count: 7,
    rows: [
      {
        key: "stream_slots:{account_id}",
        ttl: "Session lifetime (8 h max)",
        why: "Redis Lua script atomically checks and increments concurrent stream count. Lua prevents race conditions between read and increment.",
      },
      {
        key: "jwt:{jti}",
        ttl: "15 min (JWT expiry)",
        why: "JWT revocation store. On logout or password change, jti is written here. Every token validation checks for presence before trusting the signature.",
      },
      {
        key: "ratelimit:{user_id}:{window}",
        ttl: "60 s sliding window",
        why: "Redis INCR + EXPIRE implements token-bucket rate limiting atomically at the API gateway.",
      },
      {
        key: "title_meta:{title_id}",
        ttl: "5 min",
        why: "EVCache (Memcached-based, multi-region). Title metadata changes rarely. 5-min TTL absorbs 30M catalog reads/sec without touching Cassandra.",
      },
      {
        key: "entitlement:{profile_id}",
        ttl: "10 min",
        why: "Entitlement is read on every manifest request. EVCache hit saves a MySQL + Cassandra fan-out per play.",
      },
      {
        key: "homepage:{profile_id}:{surface}",
        ttl: "2 min",
        why: "Pre-rendered homepage rows cached per profile. 2-min TTL balances freshness vs Cassandra/ML load.",
      },
      {
        key: "notif_dedup:{user_id}:{notif_hash}",
        ttl: "24 h",
        why: "Prevents duplicate push notifications. SET NX (set if not exists) is the dedup gate.",
      },
    ],
  },
  {
    db: "Elasticsearch + Search",
    emoji: "🔍",
    color: "#f59e0b",
    tagline: "Full-text + vector search",
    count: 2,
    rows: [
      {
        index: "title_search_index",
        type: "Full-text + kNN vector (dense_vector)",
        query: "multi_match BM25 + kNN ANN",
        why: "Cassandra cannot do full-text or vector similarity. ES gives BM25 ranking, fuzzy matching, and HNSW approximate nearest-neighbour for semantic search.",
      },
      {
        index: "autocomplete",
        type: "Edge n-gram (prefix) analyzer",
        query: "match_phrase_prefix on title.suggest",
        why: "Prefix queries on Cassandra require ALLOW FILTERING — a full table scan. ES edge n-gram gives sub-10ms prefix completion at scale.",
      },
    ],
  },
  {
    db: "Data Lake (S3 + Iceberg)",
    emoji: "🏔️",
    color: "#ec4899",
    tagline: "Batch + streaming analytics",
    count: 5,
    rows: [
      {
        table: "raw_events",
        zone: "Bronze",
        format: "Kafka → S3 Parquet (zstd)",
        consumer: "Flink dedup + enrichment jobs",
      },
      {
        table: "watch_sessions (enriched)",
        zone: "Silver",
        format: "Iceberg (merge-on-read), partitioned by date + profile_id",
        consumer: "Spark ML feature pipelines",
      },
      {
        table: "ml_features",
        zone: "Gold",
        format: "Iceberg (copy-on-write), 1-day partitions",
        consumer: "Two-tower model training; Feature Store online serving via Redis",
      },
      {
        table: "realtime_dashboards",
        zone: "Gold (hot path)",
        format: "Apache Pinot (real-time OLAP)",
        consumer: "Business dashboards: concurrent streams, title performance, error rates",
      },
      {
        table: "ad_hoc_sql",
        zone: "All zones",
        format: "Trino over Iceberg",
        consumer: "Data science, engineering on-call, product analytics",
      },
    ],
  },
];

function EntityModelSection() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>Domain Entity Map</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Six bounded domains — each card shows the entities that live in that domain and key cross-domain relationships. This maps ownership, not join tables.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {ENTITY_DOMAINS.map((domain) => (
            <div
              key={domain.name}
              className="rounded-xl p-4"
              style={{ background: "var(--bg)", border: `1px solid ${domain.color}33` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md"
                  style={{ background: `${domain.color}18`, color: domain.color, border: `1px solid ${domain.color}44` }}
                >
                  {domain.icon} {domain.name}
                </span>
              </div>
              <div className="space-y-1.5">
                {domain.entities.map((entity) => (
                  <div key={entity.name} className="flex items-start gap-2">
                    <span className="mt-0.5 text-[9px] font-bold shrink-0" style={{ color: domain.color }}>▸</span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold font-mono" style={{ color: "var(--text)" }}>{entity.name}</span>
                      <span className="text-[10px] ml-1.5" style={{ color: "var(--text-faint)" }}>{entity.rel}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="mt-3 px-2.5 py-1.5 rounded-md text-[11px] leading-relaxed"
                style={{ background: `${domain.color}0d`, color: domain.color, border: `1px solid ${domain.color}22` }}
              >
                {domain.note}
              </div>
            </div>
          ))}
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Key Cross-Domain Relationships
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {KEY_RELATIONSHIPS.map((rel, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)"  }}
              >
                <span style={{ color: "#3b82f6", flexShrink: 0, marginTop: 2 }}>↔</span>
                {rel}
              </div>
            ))}
          </div>
        </div>
      </div>
      <SayThisBlock text={`The data model is organized into six bounded domains: Identity (accounts and profiles), Content (titles and encoding variants), Activity (playback sessions and watch history), Discovery (search and catalog cache), Engagement (recommendations and notifications), and Platform (experiments and the feature store).\n\nThe key cross-domain relationships are: Account owns up to 5 Profiles; each Title produces 1,200-plus EncodingVariants; PlaybackSession writes to WatchHistory via a 30-second heartbeat; and Recommendation reads pre-computed FeatureVectors from the Feature Store every few minutes.\n\nI've deliberately separated entities from storage — the same PlaybackSession entity might be written to Cassandra for the hot path and replicated to S3 Iceberg for analytics. The storage decision follows the access pattern, not the domain boundary.`} />
      <FollowUpsAccordion
        followUps={[
          "Why split Account and Profile? Why not one entity?",
          "Where does the ContinueWatching row come from — is it stored or computed?",
          "Is EncodingVariant a separate entity or just a column on Episode?",
          "How do you handle Profile deletion — cascade or soft delete?",
          "Where does the household enforcement state live — Account or Profile?",
          "How would you model parental controls — a field on Profile or a separate entity?",
        ]}
      />
    </div>
  );
}

function StorageChoiceMap() {
  const [openGroups, setOpenGroups] = useState<Set<number>>(new Set([0]));

  const toggle = (i: number) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>Storage Choice Map</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Every storage decision has a specific reason. Interviewers expect you to justify each choice — not just name it. Expand each group to see the tables and the rationale.
        </p>
        <div className="space-y-3">
          {STORAGE_GROUPS.map((group, gi) => {
            const isOpen = openGroups.has(gi);
            return (
              <div
                key={group.db}
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${isOpen ? group.color + "55" : "var(--border)"}`, transition: "border-color 0.2s" }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3.5 cursor-pointer"
                  style={{ background: isOpen ? `${group.color}0d` : "var(--bg)", transition: "background 0.2s" }}
                  onClick={() => toggle(gi)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && toggle(gi)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{group.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{group.db}</span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: `${group.color}18`, color: group.color, border: `1px solid ${group.color}33` }}
                        >
                          {group.tagline}
                        </span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                        {group.count} table{group.count !== 1 ? "s" : ""} / indices
                      </div>
                    </div>
                  </div>
                  <span
                    className="text-xs transition-transform duration-200"
                    style={{ color: "var(--text-muted)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    ▼
                  </span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: `1px solid ${group.color}22` }}>
                    {/* MySQL rows */}
                    {gi === 0 && (
                      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                        {(group.rows as Array<{ table: string; access: string; why: string }>).map((row, ri) => (
                          <div
                            key={ri}
                            className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3"
                            style={{ background: ri % 2 === 0 ? "var(--bg)" : `${group.color}05` }}
                          >
                            <div>
                              <span className="text-xs font-bold font-mono" style={{ color: group.color }}>{row.table}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold block mb-0.5" style={{ color: "var(--text-muted)" }}>Access pattern</span>
                              <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>{row.access}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold block mb-0.5" style={{ color: "var(--text-muted)" }}>Why MySQL</span>
                              <span className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>{row.why}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Cassandra rows */}
                    {gi === 1 && (
                      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                        {(group.rows as Array<{ table: string; pk: string; ck: string; cl: string; why: string }>).map((row, ri) => (
                          <div
                            key={ri}
                            className="px-4 py-3"
                            style={{ background: ri % 2 === 0 ? "var(--bg)" : `${group.color}05` }}
                          >
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              <span className="text-xs font-bold font-mono" style={{ color: group.color }}>{row.table}</span>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                                style={{ background: "var(--bg-card)", color: "var(--text-faint)", border: "1px solid var(--border)"  }}
                              >
                                PK: {row.pk}
                              </span>
                              {row.ck !== "—" && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                                  style={{ background: "var(--bg-card)", color: "var(--text-faint)", border: "1px solid var(--border)"  }}
                                >
                                  CK: {row.ck}
                                </span>
                              )}
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ background: `${group.color}15`, color: group.color, border: `1px solid ${group.color}33` }}
                              >
                                {row.cl}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{row.why}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Redis + EVCache rows */}
                    {gi === 2 && (
                      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                        {(group.rows as Array<{ key: string; ttl: string; why: string }>).map((row, ri) => (
                          <div
                            key={ri}
                            className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3"
                            style={{ background: ri % 2 === 0 ? "var(--bg)" : `${group.color}05` }}
                          >
                            <div>
                              <span className="text-xs font-bold font-mono break-all" style={{ color: group.color }}>{row.key}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold block mb-0.5" style={{ color: "var(--text-muted)" }}>TTL</span>
                              <span className="text-xs font-mono" style={{ color: group.color }}>{row.ttl}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold block mb-0.5" style={{ color: "var(--text-muted)" }}>Why this store</span>
                              <span className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>{row.why}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Elasticsearch rows */}
                    {gi === 3 && (
                      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                        {(group.rows as Array<{ index: string; type: string; query: string; why: string }>).map((row, ri) => (
                          <div
                            key={ri}
                            className="px-4 py-3"
                            style={{ background: ri % 2 === 0 ? "var(--bg)" : `${group.color}05` }}
                          >
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              <span className="text-xs font-bold font-mono" style={{ color: group.color }}>{row.index}</span>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ background: `${group.color}15`, color: group.color, border: `1px solid ${group.color}33` }}
                              >
                                {row.type}
                              </span>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                                style={{ background: "var(--bg-card)", color: "var(--text-faint)", border: "1px solid var(--border)"  }}
                              >
                                {row.query}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{row.why}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Data Lake rows */}
                    {gi === 4 && (
                      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                        {(group.rows as Array<{ table: string; zone: string; format: string; consumer: string }>).map((row, ri) => (
                          <div
                            key={ri}
                            className="px-4 py-3 grid grid-cols-1 sm:grid-cols-4 gap-3"
                            style={{ background: ri % 2 === 0 ? "var(--bg)" : `${group.color}05` }}
                          >
                            <div>
                              <span className="text-xs font-bold font-mono" style={{ color: group.color }}>{row.table}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold block mb-0.5" style={{ color: "var(--text-muted)" }}>Zone</span>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ background: `${group.color}15`, color: group.color, border: `1px solid ${group.color}33` }}
                              >
                                {row.zone}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold block mb-0.5" style={{ color: "var(--text-muted)" }}>Format</span>
                              <span className="text-xs" style={{ color: "var(--text-faint)" }}>{row.format}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold block mb-0.5" style={{ color: "var(--text-muted)" }}>Primary consumer</span>
                              <span className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>{row.consumer}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <SayThisBlock text={`Netflix uses five storage systems, each chosen for a specific access pattern.\n\nMySQL for ACID: subscriptions, payments, accounts, and billing events all need strong consistency and transactional rollback. The write rate is low enough that MySQL handles it easily.\n\nCassandra for high write throughput: watch history takes 2 million writes per second from heartbeats — no relational database survives that. Cassandra's partition key design means every query is O(1) by profile ID or profile plus title.\n\nRedis and EVCache for sub-millisecond reads: concurrent stream slots use a Lua script for atomic check-and-increment. JWT revocation, rate limits, and notification dedup all use Redis TTLs. EVCache, which is Memcached-based and multi-region, serves title metadata and homepage rows at 30 million requests per second.\n\nElasticsearch for search: Cassandra cannot do full-text BM25 ranking or kNN vector similarity. ES gives both in a single index. Autocomplete uses edge n-gram analyzers — prefix queries on Cassandra would require ALLOW FILTERING, which is a full table scan.\n\nS3 plus Iceberg for the data lake: events land in Bronze as raw Parquet, get enriched in Silver via Flink and Spark, and feed ML feature pipelines in Gold. Pinot handles real-time OLAP dashboards; Trino handles ad-hoc SQL over all zones.`} />

      <FollowUpsAccordion
        followUps={[
          "Why EVCache instead of Redis for title metadata?",
          "How does Cassandra handle the concurrent stream limit — what consistency level and why?",
          "What happens if the Redis stream slot key expires mid-session?",
          "Why Iceberg over Delta Lake or Hudi?",
          "How does right-to-erasure work with Iceberg — can you delete a specific user's rows?",
          "Why Pinot for dashboards instead of Redshift or BigQuery?",
          "What is the Elasticsearch reindex strategy when the schema changes?",
          "How would you add a new storage tier without disrupting existing pipelines?",
        ]}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DATA LAKE SECTION
   ═══════════════════════════════════════════════════════════════ */

const S3_TREE = `s3://netflix-lake/
├── raw/          ← Bronze: append-only, source-faithful
│   ├── playback_events/event_date=YYYY-MM-DD/hour=HH/country=US/
│   ├── search_events/
│   ├── billing_events/
│   └── quality_events/
├── clean/        ← Silver: deduplicated, PII tokenized
│   ├── playback_events/
│   ├── watch_sessions/    ← sessionized from heartbeats
│   └── quality_metrics/
├── curated/      ← Gold: aggregated, business-ready
│   ├── title_engagement_daily/
│   ├── profile_watch_metrics/
│   └── quality_by_title_country/
├── features/     ← Feature Store: ML training data
│   ├── profile_features/snapshot_date=YYYY-MM-DD/
│   └── title_features/snapshot_date=YYYY-MM-DD/
└── quarantine/   ← Bad data: schema violations
    └── schema_violations/`;

const BRONZE_DDL = `CREATE TABLE bronze.playback_events (
  event_id       STRING NOT NULL,
  event_time     TIMESTAMP,
  ingest_time    TIMESTAMP,
  profile_id     STRING,
  title_id       STRING,
  event_type     STRING,
  payload        STRING  -- JSON blob, schema-validated at gateway
)
PARTITIONED BY (days(ingest_time), identity(event_type))
TBLPROPERTIES ('write.target-file-size-bytes'='134217728');  -- 128 MB`;

const SILVER_DDL = `CREATE TABLE silver.watch_sessions (
  session_id        STRING NOT NULL,
  profile_id        STRING NOT NULL,
  title_id          STRING NOT NULL,
  episode_id        STRING,
  device_type       STRING,
  country           STRING,
  started_at        TIMESTAMP,
  ended_at          TIMESTAMP,
  watch_duration_ms BIGINT,
  completion_pct    FLOAT,
  avg_bitrate_kbps  INT,
  buffering_ratio   FLOAT,
  exit_reason       STRING,
  app_version       STRING
)
PARTITIONED BY (days(started_at), identity(country))
TBLPROPERTIES (
  'write.target-file-size-bytes'='536870912',
  'write.distribution-mode'='hash'
);`;

const GOLD_DDL = `CREATE TABLE gold.title_engagement_daily (
  report_date       DATE NOT NULL,
  title_id          STRING NOT NULL,
  country           STRING NOT NULL,
  total_plays       BIGINT,
  unique_profiles   BIGINT,
  total_watch_ms    BIGINT,
  avg_completion_pct FLOAT,
  avg_rating        FLOAT
)
PARTITIONED BY (identity(report_date), identity(country));`;

const FEATURE_VECTOR = `profile_features snapshot (daily):
  profile_id, snapshot_date, genre_affinity_vector[20],
  avg_completion_last_30d, top_device_type, active_hours_of_day[24],
  days_since_last_watch, total_watch_hours_lifetime`;

const COMPACTION_CODE = `-- Continuous Flink compaction + nightly Spark deep compaction:
rewriteDataFiles()  → target 512 MB–1 GB per file
rewriteManifests()  → merge manifests weekly
expireSnapshots()   → keep only 7-day history on Bronze`;

const SAY_THIS_TEXT = `Netflix's data lake is a Medallion architecture: Bronze (raw, append-only), Silver (cleaned, sessionized, PII tokenized), Gold (aggregated, business-ready). The key property of Bronze is immutability — even GDPR deletion is handled by PII tokenization at ingestion, not row deletion, because Iceberg's append-only nature is what enables time-travel and replay. The biggest operational challenge is the small files problem: Flink micro-batches create thousands of tiny files per hour. Continuous compaction with rewriteDataFiles() targeting 512MB files is non-negotiable at this scale.`;

const LAKE_ZONES = [
  { id: "bronze", label: "Bronze (Raw)", color: "#f59e0b" },
  { id: "silver", label: "Silver (Clean)", color: "#3b82f6" },
  { id: "gold", label: "Gold (Curated)", color: "#f59e0b" },
  { id: "feature", label: "Feature Store", color: "#8b5cf6" },
];

function DataLakeSection() {
  const [activeZone, setActiveZone] = useState("bronze");
  const [treeCopied, setTreeCopied] = useState(false);
  const [bronzeCopied, setBronzeCopied] = useState(false);
  const [silverCopied, setSilverCopied] = useState(false);
  const [goldCopied, setGoldCopied] = useState(false);
  const [compactionCopied, setCompactionCopied] = useState(false);

  const copyText = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  };

  const scrollTo = (id: string) => {
    setActiveZone(id);
    const el = document.getElementById(`lake-zone-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      {/* Sticky inner nav */}
      <div className="sticky top-0 z-30 py-3" style={{ background: "var(--bg)" }}>
        <div className="flex gap-2 flex-wrap">
          {LAKE_ZONES.map((zone) => (
            <button
              key={zone.id}
              onClick={() => scrollTo(zone.id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: activeZone === zone.id ? zone.color : "var(--bg-card)",
                color: activeZone === zone.id ? "#fff" : "var(--text-muted)",
                border: `1px solid ${activeZone === zone.id ? zone.color : "var(--border)"}`,
                cursor: "pointer",
              }}
            >
              {zone.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section header */}
      <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
        Data Lake — Medallion Architecture
      </h2>
      <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-muted)" }}>
        Netflix's S3-backed Iceberg lake is organized in three quality tiers (Bronze → Silver → Gold) plus a Feature Store. Each tier has a distinct SLA, retention policy, and consumer contract.
      </p>

      {/* S3 directory tree */}
      <div className="rounded-2xl p-6 mb-8" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            S3 Directory Structure
          </h3>
          <button
            onClick={() => copyText(S3_TREE, setTreeCopied)}
            className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
            style={{
              background: treeCopied ? "#22c55e" : "var(--bg)",
              color: treeCopied ? "#fff" : "var(--text-muted)",
              border: "1px solid var(--border)",
              cursor: "pointer",
             }}
          >
            {treeCopied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="text-xs leading-relaxed overflow-x-auto p-4 rounded-lg font-mono whitespace-pre" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)"  }}>
          {S3_TREE}
        </pre>
      </div>

      {/* BRONZE */}
      <div id="lake-zone-bronze" className="rounded-2xl p-6 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)"  }}>
            Bronze — Raw
          </span>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>Append-only · Source-faithful · 30-day retention</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>What gets written</div>
            <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>Raw Kafka events, source-faithful, no transformation</div>
          </div>
          <div className="rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Who reads it</div>
            <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>Flink for deduplication into silver, incident replay</div>
          </div>
          <div className="rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Retention</div>
            <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>30 days (Iceberg snapshot expiry)</div>
          </div>
        </div>

        {/* Key property callout */}
        <div className="rounded-lg p-4 mb-5" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)"  }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#f59e0b" }}>Key Property</div>
          <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            <strong>NEVER update or delete.</strong> Append-only. Even GDPR deletion is handled by tokenizing PII at ingestion, not by deleting rows — Iceberg's append-only nature is what enables time-travel and replay.
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Iceberg DDL</h3>
          <button
            onClick={() => copyText(BRONZE_DDL, setBronzeCopied)}
            className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
            style={{
              background: bronzeCopied ? "#22c55e" : "var(--bg)",
              color: bronzeCopied ? "#fff" : "var(--text-muted)",
              border: "1px solid var(--border)",
              cursor: "pointer",
             }}
          >
            {bronzeCopied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="text-xs leading-relaxed overflow-x-auto p-4 rounded-lg font-mono whitespace-pre" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)"  }}>
          {BRONZE_DDL}
        </pre>
      </div>

      {/* SILVER */}
      <div id="lake-zone-silver" className="rounded-2xl p-6 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg" style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)"  }}>
            Silver — Clean
          </span>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>Deduplicated · PII tokenized · Sessionized · 365-day retention</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>What gets written</div>
            <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>Deduplicated, PII tokenized, sessionized</div>
          </div>
          <div className="rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Who reads it</div>
            <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>Gold Spark jobs, ML feature generation, BI analysts</div>
          </div>
          <div className="rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Retention</div>
            <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>365 days</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Key Iceberg DDL — watch_sessions (most important for ML)</h3>
          <button
            onClick={() => copyText(SILVER_DDL, setSilverCopied)}
            className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
            style={{
              background: silverCopied ? "#22c55e" : "var(--bg)",
              color: silverCopied ? "#fff" : "var(--text-muted)",
              border: "1px solid var(--border)",
              cursor: "pointer",
             }}
          >
            {silverCopied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="text-xs leading-relaxed overflow-x-auto p-4 rounded-lg font-mono whitespace-pre mb-4" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)"  }}>
          {SILVER_DDL}
        </pre>

        {/* Partition callout */}
        <div className="rounded-lg p-4" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.25)"  }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#3b82f6" }}>Why this partition?</div>
          <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            Partitioned by <code className="font-mono text-xs px-1 py-0.5 rounded" style={{ background: "var(--bg)", color: "#3b82f6" }}>started_at (days)</code> + <code className="font-mono text-xs px-1 py-0.5 rounded" style={{ background: "var(--bg)", color: "#3b82f6" }}>country</code>. Most queries filter by date range and/or country.
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex gap-2 items-start text-sm" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: "#ef4444" }} className="shrink-0 mt-0.5">✗</span>
              <span><strong style={{ color: "var(--text)" }}>(country, month)</strong> — bad: popular countries get huge partitions, data skew</span>
            </div>
            <div className="flex gap-2 items-start text-sm" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: "#ef4444" }} className="shrink-0 mt-0.5">✗</span>
              <span><strong style={{ color: "var(--text)" }}>Only date</strong> — loses country pushdown benefit, full partition scan for country filters</span>
            </div>
            <div className="flex gap-2 items-start text-sm" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: "#10b981" }} className="shrink-0 mt-0.5">✓</span>
              <span><strong style={{ color: "var(--text)" }}>days(started_at) + identity(country)</strong> — balanced partitions, dual pushdown, optimal for time-range + geo queries</span>
            </div>
          </div>
        </div>
      </div>

      {/* GOLD */}
      <div id="lake-zone-gold" className="rounded-2xl p-6 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.4)"  }}>
            Gold — Curated
          </span>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>Pre-aggregated · Business-ready · 7-year retention</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>What gets written</div>
            <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>Pre-aggregated, business-ready, denormalized</div>
          </div>
          <div className="rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Who reads it</div>
            <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>Tableau / Redshift (BI), Finance, Product teams</div>
          </div>
          <div className="rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Retention</div>
            <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>7 years (compliance)</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>DDL — title_engagement_daily</h3>
          <button
            onClick={() => copyText(GOLD_DDL, setGoldCopied)}
            className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
            style={{
              background: goldCopied ? "#22c55e" : "var(--bg)",
              color: goldCopied ? "#fff" : "var(--text-muted)",
              border: "1px solid var(--border)",
              cursor: "pointer",
             }}
          >
            {goldCopied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="text-xs leading-relaxed overflow-x-auto p-4 rounded-lg font-mono whitespace-pre" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)"  }}>
          {GOLD_DDL}
        </pre>
      </div>

      {/* FEATURE STORE */}
      <div id="lake-zone-feature" className="rounded-2xl p-6 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg" style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.3)"  }}>
            Feature Store
          </span>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>ML training snapshots · Daily · Spark training + online serving</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>What gets written</div>
            <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>ML training snapshots, daily point-in-time consistent feature vectors</div>
          </div>
          <div className="rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Who reads it</div>
            <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>Spark training jobs, online feature server (low-latency inference)</div>
          </div>
        </div>

        <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Feature Vector — profile_features (daily snapshot)</h3>
        <pre className="text-xs leading-relaxed overflow-x-auto p-4 rounded-lg font-mono whitespace-pre" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)"  }}>
          {FEATURE_VECTOR}
        </pre>
      </div>

      {/* COMPACTION CALLOUT */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: "var(--bg-card)", border: "1px solid rgba(239,68,68,0.35)"  }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)"  }}>
            Compaction — Critical for Interviews
          </span>
        </div>
        <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)"  }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#ef4444" }}>The Problem</div>
          <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            Flink writes to Iceberg every 2 minutes across 240 partitions = <strong>thousands of tiny 10–50 MB files/hour</strong> = Trino query planning reads thousands of manifests = <strong>10× slower queries</strong>
          </div>
        </div>
        <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)"  }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#10b981" }}>The Solution</div>
          <div className="text-sm leading-relaxed mb-3" style={{ color: "var(--text)" }}>
            Continuous Flink compaction + nightly Spark deep compaction
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>Compaction operations</span>
            <button
              onClick={() => copyText(COMPACTION_CODE, setCompactionCopied)}
              className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
              style={{
                background: compactionCopied ? "#22c55e" : "var(--bg)",
                color: compactionCopied ? "#fff" : "var(--text-muted)",
                border: "1px solid var(--border)",
                cursor: "pointer",
               }}
            >
              {compactionCopied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="text-xs leading-relaxed overflow-x-auto p-4 rounded-lg font-mono whitespace-pre" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)"  }}>
            {COMPACTION_CODE}
          </pre>
        </div>
      </div>

      {/* SAY THIS BLOCK */}
      <SayThisBlock text={SAY_THIS_TEXT} />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DATA DESIGN TAB
   ═══════════════════════════════════════════════════════════════ */
function DataDesignTab() {
  const [openCqlIdx, setOpenCqlIdx] = useState<number | null>(null);

  return (
    <div className="space-y-10">
      {/* Entity Model */}
      <EntityModelSection />

      {/* Storage Choice Map */}
      <StorageChoiceMap />

      {/* Access Patterns */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>Access Patterns → Storage Choice</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Every table is designed around a specific query — not normalization. Click &quot;Show CQL&quot; to see the schema.</p>
        <div className="space-y-3">
          {ACCESS_PATTERNS.map((ap, i) => (
            <div key={i} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)"  }}>
              <div className="p-4" style={{ background: "var(--bg)" }}>
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold font-mono" style={{ color: "var(--blue-text)" }}>{ap.table}</span>
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>{ap.db}</span>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{ap.accessPattern}</p>
                    <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--text-faint)" }}>{ap.why}</p>
                  </div>
                  <button
                    onClick={() => setOpenCqlIdx(openCqlIdx === i ? null : i)}
                    className="text-xs px-3 py-1.5 rounded-lg shrink-0"
                    style={{ background: "var(--blue-soft)", color: "var(--blue-text)", cursor: "pointer", border: "none"  }}
                  >
                    {openCqlIdx === i ? "Hide CQL" : "Show CQL"}
                  </button>
                </div>
              </div>
              {openCqlIdx === i && (
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  <CodeBlockWithCopy code={ap.cql} language="sql" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Encoding Pipeline */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>Encoding Pipeline</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>{ENCODING_PIPELINE.overview}</p>
        <div className="space-y-1 mb-6">
          {ENCODING_PIPELINE.stages.map((stage, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold" style={{ color: "var(--blue-text)" }}>{stage.name}</span>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>{stage.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-4" style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)"  }}>
          <p className="text-xs font-bold mb-1" style={{ color: "var(--blue-text)" }}>Variants per title</p>
          <pre className="text-xs font-mono whitespace-pre-wrap" style={{ color: "var(--text)" }}>{ENCODING_PIPELINE.variants}</pre>
        </div>
      </div>

      {/* Recommendation Deep Dive */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>Recommendation System Deep Dive</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Cold Start Problem</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{RECOMMENDATION_DEEP_DIVE.coldStart}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Two-Tower Model Architecture</h3>
            <CodeBlockWithCopy code={RECOMMENDATION_DEEP_DIVE.twoTower} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Feature Store</h3>
            <CodeBlockWithCopy code={RECOMMENDATION_DEEP_DIVE.featureStore} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Artwork Bandit</h3>
            <CodeBlockWithCopy code={RECOMMENDATION_DEEP_DIVE.artworkBandit} />
          </div>
        </div>
      </div>

      {/* Household Enforcement */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>Account vs Household Model</h2>
        <p className="text-sm mb-4 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>{HOUSEHOLD_ENFORCEMENT.problem}</p>
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Detection Signals</h3>
          <ul className="space-y-1">
            {HOUSEHOLD_ENFORCEMENT.signals.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs" style={{ color: "var(--text)" }}>
                <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#8b5cf6" }} />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Data Model</h3>
          <CodeBlockWithCopy code={HOUSEHOLD_ENFORCEMENT.dataModel} language="sql" />
        </div>
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Enforcement Logic</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{HOUSEHOLD_ENFORCEMENT.enforcement}</p>
        </div>
        <div className="rounded-lg p-4" style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)"  }}>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--blue-text)" }}>Key Insight</h4>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{HOUSEHOLD_ENFORCEMENT.keyInsight}</p>
        </div>
      </div>

      {/* Back-of-Envelope */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text)" }}>Back-of-Envelope Estimation</h2>
        <CodeBlockWithCopy code={`300M subscribers
× 30 min active/day average
= 9B user-minutes/day
÷ 60 seconds
= 150M "active-second" slots/day peak-equivalent
× 3 events per 6s (heartbeat + UI impression + click)
= ~450M events / 86,400s ≈ ~5M events/s baseline
× 3x peak factor (evening hours)
= 15M events/s peak  ✓`} />
      </div>

      {/* Data Lake */}
      <DataLakeSection />
    </div>
  );
}

export { DataDesignTab };
