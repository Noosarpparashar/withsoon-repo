"use client";

import { useState } from "react";
import { SayThisBlock } from "./shared";
import type { TabSlug } from "./types";

const TRADEOFFS = [
  {
    title: "Cassandra vs MySQL",
    chosen: "MySQL for billing · Cassandra for watch history",
    tags: ["Data Model", "Consistency"],
    chooseA: { name: "Cassandra", when: "High write throughput + eventual consistency acceptable (watch history, resume position, sessions). 2M+ writes/sec per cluster." },
    chooseB: { name: "MySQL / PostgreSQL", when: "ACID transactions required (billing, payments, subscription changes). SELECT FOR UPDATE prevents double-charge bugs." },
    why: "MySQL gives ACID guarantees (SELECT FOR UPDATE prevents double charges). Cassandra gives 2M writes/s throughput. The choice is driven by access pattern — billing needs strong consistency on a low-write table; watch history needs extreme write throughput with eventual consistency acceptable.",
    wrong: "Using Cassandra for billing risks double-charge bugs under concurrent writes. Using MySQL for watch history caps you at ~100K writes/s on a sharded cluster.",
    sayThis: "Billing uses MySQL because it requires ACID — specifically, SELECT FOR UPDATE to prevent double-charging. Watch history uses Cassandra because it's append-heavy at 5B writes/day and eventual consistency is fine — if a resume position is 30 seconds stale, users don't notice.",
  },
  {
    title: "Kafka vs SQS/Kinesis",
    chosen: "Kafka for the data platform",
    tags: ["Data Pipeline", "Replay"],
    chooseA: { name: "Kafka", when: "Need consumer replay (reprocess events from any offset). Partitioned parallelism. Long retention (90+ days for ML). 700B+ events/day." },
    chooseB: { name: "SQS / Kinesis", when: "Simpler operations. AWS-managed. Acceptable for lower-scale event queues. No replay requirement." },
    why: "Kafka supports consumer replay — re-read events from any offset. When a downstream ML model needs to reprocess 90 days of play events to retrain, Kafka makes that free. SQS max retention is 14 days with no replay. At Netflix scale, replay is non-negotiable.",
    wrong: "SQS is simpler to operate but its lack of log retention makes ML retraining and event replay impossible at Netflix's scale.",
    sayThis: "Kafka because replay is a first-class requirement. When a recommendation model needs retraining or a pipeline has a bug, you need to reprocess 90 days of raw events. Kafka's log-based storage makes that free. SQS deletes messages on delivery.",
  },
  {
    title: "OCA (Own CDN) vs Commercial CDN",
    chosen: "Open Connect Appliances",
    tags: ["CDN", "Cost"],
    chooseA: { name: "Open Connect (OCA)", when: "300 Tbps+ scale. Cost at this volume makes commercial CDN unaffordable. ISP relationship management is feasible." },
    chooseB: { name: "Akamai / Cloudflare", when: "Early-stage or lower traffic. Operational simplicity more important than CDN economics. No hardware to manage." },
    why: "At 300 Tbps, commercial CDN transit fees would exceed $500M/year. Netflix instead co-locates ~17,000 OCA appliances inside ISP networks, paying only hardware and ISP negotiation. Both parties win: Netflix avoids transit costs, the ISP serves local traffic instead of backhauling it.",
    wrong: "Akamai at 300 Tbps costs hundreds of millions per year in transit fees. The OCA hardware investment pays back within months.",
    sayThis: "At this scale, commercial CDN transit economics break down. Netflix built Open Connect because 300 Tbps at commercial rates would cost $500M+ annually. OCA hardware inside ISP networks is a one-time cost. This only makes sense at Netflix's scale — at 100 Gbps, just use Cloudflare.",
  },
  {
    title: "Flink vs Spark Streaming",
    chosen: "Both — Flink for streaming, Spark for batch",
    tags: ["Data Pipeline", "Streaming"],
    chooseA: { name: "Apache Flink", when: "Low-latency stateful streaming (QoE monitoring, fraud detection, nearline recommendations). Event-time processing. Sub-second latency." },
    chooseB: { name: "Spark Streaming / Structured Streaming", when: "Micro-batch processing acceptable. Existing Spark expertise. Large batch ETL jobs. Iceberg compaction." },
    why: "Flink is strong for true streaming with millisecond latency and stateful operators. Spark is better for large-scale batch ETL and has broader ecosystem support. Netflix uses both: Flink for real-time QoE and Spark for daily batch feature generation.",
    wrong: "Using only Spark Streaming means accepting micro-batch latency for real-time QoE alerts. Using only Flink for batch jobs loses Spark's ecosystem advantages for large-scale ETL.",
    sayThis: "Use both. Flink for real-time: QoE monitoring needs sub-second window aggregates. Spark for batch: daily feature generation, Iceberg compaction, model training data preparation. They read from the same Kafka topics and write to the same Iceberg tables.",
  },
  {
    title: "Apache Iceberg vs Hive Metastore",
    chosen: "Apache Iceberg",
    tags: ["Data Lake", "Schema"],
    chooseA: { name: "Apache Iceberg", when: "Need schema evolution, partition evolution, time travel queries, ACID on S3, engine-agnostic (Spark + Trino + Flink on same tables)." },
    chooseB: { name: "Hive Metastore / plain Parquet", when: "Simpler setup. Single-engine environment. No time travel or schema evolution requirements." },
    why: "Iceberg supports time-travel queries, schema evolution without rewrites, and hidden partitioning. Netflix open-sourced Iceberg. The key feature: query 'what did this table look like 90 days ago' — critical for debugging ML training data issues. Engine-agnostic: Spark, Trino, and Flink all on same tables.",
    wrong: "Hive Metastore requires full table rewrites for schema changes. No time travel. Small-file problem is much worse without Iceberg's compaction support.",
    sayThis: "Iceberg because we run multiple engines on the same lake: Spark for batch, Trino for ad-hoc queries, Flink for streaming. Iceberg is engine-agnostic. Time travel is essential for debugging ML training data — 'what features did the model see 30 days ago?'",
  },
  {
    title: "Redis vs Cassandra for Session State",
    chosen: "Redis for hot concurrency state · Cassandra for durable session record",
    tags: ["Storage", "Consistency"],
    chooseA: { name: "Redis", when: "Sub-millisecond access. Atomic Lua scripts for concurrency check (INCR + TTL). Volatile state OK (slot expires with heartbeat TTL)." },
    chooseB: { name: "Cassandra", when: "Durable session record for audit, resume, billing reconciliation. Higher read/write volume. Multi-region replication." },
    why: "Concurrency slots need atomic check-and-increment in sub-ms — Redis Lua is the right tool. The durable session record (for billing audit and resume) needs multi-region durability — that's Cassandra.",
    wrong: "Using Cassandra for concurrency checks introduces compare-and-swap complexity and higher latency. Using Redis for durable session state risks data loss on Redis restart.",
    sayThis: "Two different requirements. Hot concurrency state: Redis Lua atomic INCR, TTL=36s, sub-millisecond. If Redis restarts, TTL-based self-healing re-grants slots. Durable session record: Cassandra for billing audit trail, multi-region durability.",
  },
  {
    title: "Precomputed Recs vs Online Ranking",
    chosen: "Hybrid: precomputed candidates + online re-ranking",
    tags: ["ML", "Recommendations"],
    chooseA: { name: "Precomputed", when: "Low latency required (<50ms). Resilient to model failures. Batch refresh acceptable (hourly/daily). Stable preference signals." },
    chooseB: { name: "Online Ranking", when: "Need freshness (last 5 minutes of user behavior). Contextual signals (device, time, region). A/B testing requires fast iteration." },
    why: "Precomputed candidates from offline models are fast and resilient. Online ranking at request time incorporates fresh context (what the user just watched, current device, time of day). Hybrid: offline generates top-500 candidates, online ranks them to top-20 in <50ms.",
    wrong: "Pure precomputed: stale for users with rapidly changing tastes. Pure online: high latency, complex infrastructure, single point of failure with no fallback.",
    sayThis: "Hybrid approach. Offline batch generates 500 candidates per user daily using collaborative filtering on historical data. Online ranking at request time uses a lightweight model with fresh features (last 5 watches, device type, time) to re-rank to top-20. Fallback: if online fails, return the precomputed top-20.",
  },
  {
    title: "Strong vs Eventual Consistency",
    chosen: "Strong for billing/DRM/concurrency · Eventual for everything else",
    tags: ["Consistency", "Availability"],
    chooseA: { name: "Strong Consistency", when: "Billing/subscription changes. Concurrency slot checks. DRM license validation. Profile maturity settings. Operations where stale data causes financial or security harm." },
    chooseB: { name: "Eventual Consistency", when: "Watch history. Resume position. Recommendations. Catalog metadata. Search index. Analytics. Anything where 'eventually correct' is acceptable." },
    why: "Strong consistency requires coordination across replicas — it limits availability (CAP theorem). Eventual consistency tolerates network partitions and node failures. The key Netflix insight: only a tiny fraction of operations actually require strong consistency.",
    wrong: "Making everything strongly consistent sacrifices availability unnecessarily. Making billing eventually consistent risks double-charges and revenue loss.",
    sayThis: "The rule: strong consistency where stale data costs money or creates security risks. Eventual elsewhere. Billing, concurrency limit, DRM — strong. Watch history, recommendations, catalog — eventual. This asymmetry is what makes Netflix's availability goals achievable.",
  },
  {
    title: "JWT vs Session Tokens",
    chosen: "Short-lived JWT (15 min) + Redis revocation list",
    tags: ["Security", "Auth"],
    chooseA: { name: "JWT (stateless)", when: "High read traffic. No per-request DB lookup. Self-contained claims. Can verify without network call." },
    chooseB: { name: "Session tokens (stateful)", when: "Instant revocation required. Fine-grained session control. Simpler token rotation." },
    why: "JWT is stateless — API servers verify without a DB lookup on every request. But pure stateless JWT can't handle instant revocation (e.g., stolen device). Netflix adds a Redis revocation list: valid until expiry, unless the key is in Redis. 15-min TTL bounds the staleness window.",
    wrong: "Pure session tokens require a DB lookup on every API call (adds latency at scale). Pure JWT with 24h TTL means a stolen token is valid all day.",
    sayThis: "Short-lived JWT for stateless verification — no DB call per request at 12K RPS. Redis revocation list for instant revocation on device theft or account compromise. 15-minute TTL is the staleness window — worst case, a stolen token is usable for 15 minutes.",
  },
  {
    title: "Sync vs Async Writes",
    chosen: "Async for non-critical path · Sync for data that must be durable before response",
    tags: ["Architecture", "Latency"],
    chooseA: { name: "Async writes", when: "Analytics events. Watch history updates. Session records. Kafka publish. Operations where the user doesn't need confirmation." },
    chooseB: { name: "Sync writes", when: "Billing changes. Concurrency slot acquisition. DRM license issuance. Operations where failure must be visible to the caller immediately." },
    why: "Async writes dramatically reduce API latency on the critical path. The Playback Service achieves <85ms P50 partly because Cassandra writes and Kafka publishes happen after the response. But billing and concurrency must be sync — otherwise two devices could race past the limit.",
    wrong: "Making everything sync adds unnecessary latency and couples availability. Making billing async risks double-charging before the write durability is confirmed.",
    sayThis: "The playback endpoint achieves <85ms because Cassandra writes and Kafka publishes are async, after the signed manifest URL is returned. Concurrency slot acquisition is sync — it has to be, to prevent race conditions on the device limit.",
  },
];

export function TradeoffsTab({ onNavigateTab }: { onNavigateTab?: (tab: TabSlug) => void }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = Array.from(new Set(TRADEOFFS.flatMap(t => t.tags)));
  const filtered = activeTag ? TRADEOFFS.filter(t => t.tags.includes(activeTag)) : TRADEOFFS;

  return (
    <div className="space-y-8 pb-10">
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "4px solid #8b5cf6" }}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Senior-level expectation:</strong> Don&apos;t just name the technology — justify why you chose it over the alternative. State when the choice is wrong. Interviewers probe precisely on this.
        </p>
      </div>

      {/* Tag filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTag(null)}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          style={{ background: !activeTag ? "var(--blue-soft)" : "var(--bg-card)", color: !activeTag ? "var(--blue-text)" : "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
        >
          All ({TRADEOFFS.length})
        </button>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ background: activeTag === tag ? "var(--blue-soft)" : "var(--bg-card)", color: activeTag === tag ? "var(--blue-text)" : "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={item.title} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <button
                className="w-full px-4 py-4 text-left transition-opacity hover:opacity-80"
                style={{ background: isOpen ? "var(--bg-card)" : "var(--bg)", cursor: "pointer", border: "none" }}
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                aria-expanded={isOpen}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>{item.title}</h3>
                    <p className="text-xs" style={{ color: "var(--blue-text)" }}>✓ {item.chosen}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card)", color: "var(--text-faint)", border: "1px solid var(--border)" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs shrink-0 mt-1 transition-transform duration-200" style={{ color: "var(--text-faint)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
                    <div className="rounded-lg p-3" style={{ background: "#f0fdf4", border: "1px solid #86efac" }}>
                      <div className="text-[10px] font-bold mb-1" style={{ color: "#166534" }}>Choose {item.chooseA.name} when</div>
                      <div className="text-xs" style={{ color: "#15803d" }}>{item.chooseA.when}</div>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: "#fef3c7", border: "1px solid #fcd34d" }}>
                      <div className="text-[10px] font-bold mb-1" style={{ color: "#92400e" }}>Choose {item.chooseB.name} when</div>
                      <div className="text-xs" style={{ color: "#b45309" }}>{item.chooseB.when}</div>
                    </div>
                  </div>
                  <div className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    <span className="font-semibold" style={{ color: "var(--text)" }}>Why this choice: </span>{item.why}
                  </div>
                  <div className="rounded-lg p-3" style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#7f1d1d" }}>When this choice is wrong</div>
                    <div className="text-sm" style={{ color: "#991b1b" }}>{item.wrong}</div>
                  </div>
                  <SayThisBlock text={item.sayThis} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {onNavigateTab && (
        <button onClick={() => onNavigateTab("failures-tradeoffs" as never)} className="w-full py-4 rounded-2xl text-sm font-semibold"
          style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--border)", cursor: "pointer" }}>
          Next: Security / DRM →
        </button>
      )}
    </div>
  );
}
