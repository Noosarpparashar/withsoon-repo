"use client";

import { useState } from "react";
import { SayThisBlock } from "./shared";

const FAILURE_MATRIX = [
  {
    component: "Playback Service",
    failure: "Playback Service is down",
    mode: "fail-open",
    detection: "Circuit breaker opens after 5 failures in 10s window",
    recovery: "Return cached last manifest or redirect to degraded-quality stream",
    sayThis: "Playback fails open — a degraded stream beats a black screen. We serve a stale or lower-quality manifest rather than returning a 503. The circuit breaker uses Resilience4j: 5 failures in 10s → OPEN for 30s → HALF_OPEN to probe.",
  },
  {
    component: "Billing Service",
    failure: "Billing Service is unreachable at play time",
    mode: "fail-open",
    detection: "Playback Service timeout > 150ms → skip billing check",
    recovery: "Allow playback, flag user for async billing reconciliation",
    sayThis: "Billing fails open deliberately. Netflix would rather give away a play than block 60M users on a billing outage. The auth check happens async and out-of-band. Only a confirmed canceled account should block playback.",
  },
  {
    component: "DRM License Server",
    failure: "DRM License Server is unreachable",
    mode: "fail-closed",
    detection: "Client can't decrypt content without a valid license",
    recovery: "Return error to client; no cached plaintext fallback (by design)",
    sayThis: "DRM fails closed — this is a content licensing requirement, not a reliability choice. Netflix's studio contracts require that content cannot play without a valid, device-bound DRM license. This is one of the few places where a worse user experience is legally mandatory.",
  },
  {
    component: "Recommendation Service",
    failure: "Recommendation model is stale or service is down",
    mode: "fail-open",
    detection: "Timeout > 200ms → fallback tier triggers",
    recovery: "Tier 1: Pre-computed user recommendations from Cassandra. Tier 2: Trending in your region. Tier 3: Top 10 globally.",
    sayThis: "Recommendations have a three-tier fallback. The model's latest output is always pre-materialized into Cassandra so the online layer can fail without affecting the homepage. Trending is the last-resort fallback — it's always fresh and never requires personalization.",
  },
  {
    component: "EVCache (Catalog Cache)",
    failure: "EVCache cluster is unavailable",
    mode: "fail-open",
    detection: "Cache miss → fallthrough to Cassandra automatically",
    recovery: "Read from Cassandra directly; cache rebuilds on next hit",
    sayThis: "EVCache is a read-through cache — misses fall through to Cassandra, never to an error. The tradeoff: without the cache, Cassandra sees 300× the read traffic. A full EVCache outage doesn't break the product but it will saturate Cassandra within minutes.",
  },
  {
    component: "Kafka (Event Pipeline)",
    failure: "Kafka broker loses data before consumer ACK",
    mode: "fail-closed",
    detection: "Producer uses acks=all + min.insync.replicas=2",
    recovery: "Producer retries with idempotent producer ID; no duplicate events",
    sayThis: "Kafka is configured for zero data loss: acks=all means the lead broker plus at least one follower must ACK before the producer's write returns. unclean.leader.election=false prevents a lagging broker from becoming leader and creating a gap. The tradeoff is slightly higher producer latency.",
  },
  {
    component: "Cassandra Node",
    failure: "Cassandra node fails mid-write",
    mode: "fail-open",
    detection: "Write quorum (QUORUM consistency level) still met",
    recovery: "Hinted handoff stores the write for the failed node; repairs on recovery",
    sayThis: "Cassandra's quorum writes tolerate node failures without blocking. With RF=3 and QUORUM consistency, 2 of 3 replicas must ACK. If one node is down, the cluster writes to the other two and uses hinted handoff to deliver the write when the node recovers.",
  },
  {
    component: "Entire AWS Region",
    failure: "AWS region (e.g., us-east-1) goes down",
    mode: "fail-open",
    detection: "Netflix's Chaos Kong: deliberately kills a whole region to test this path",
    recovery: "Route53 removes the unhealthy region; other regions absorb traffic via active-active",
    sayThis: "This is the Chaos Kong scenario. Netflix runs active-active across three regions (us-east-1, eu-west-1, ap-south-1). Cassandra uses multi-region replication. Route53 latency-based routing automatically stops sending traffic to a failing region. The key detail: they test this path monthly in production.",
  },
];

const TRADEOFF_CARDS = [
  {
    title: "MySQL vs Cassandra",
    chosen: "MySQL for billing, Cassandra for watch history",
    why: "MySQL gives ACID guarantees (SELECT FOR UPDATE prevents double charges). Cassandra gives 2M writes/s throughput. The choice is driven by access pattern: billing needs strong consistency on a low-write table; watch history needs extreme write throughput with eventual consistency acceptable.",
    rejected: "Using Cassandra for billing risks double-charge bugs under concurrent writes. Using MySQL for watch history caps you at ~100K writes/s on a sharded cluster.",
  },
  {
    title: "Kafka vs SQS/SNS",
    chosen: "Kafka",
    why: "Kafka supports consumer replay (re-read events from any offset), partitioned parallelism, and 700B events/day throughput. SQS has a 14-day retention max and no replay. When a downstream ML model needs to reprocess 90 days of play events to retrain, Kafka makes that free.",
    rejected: "SQS is simpler to operate but its lack of log retention makes ML retraining and event replay impossible at Netflix's scale.",
  },
  {
    title: "OCA (Own CDN) vs Commercial CDN",
    chosen: "Open Connect Appliances (Netflix's own CDN)",
    why: "Netflix negotiates with ISPs to place OCA hardware inside their networks, eliminating transit costs entirely. At 300 Tbps, transit fees on a commercial CDN would exceed the cost of building and operating OCA hardware. Also: Netflix controls the cache eviction policy and can pre-position content before a release.",
    rejected: "Akamai or Cloudflare at 300 Tbps would cost Netflix hundreds of millions per year in transit fees. The upfront investment in OCA hardware pays back within months.",
  },
  {
    title: "JWT vs Session Tokens",
    chosen: "Short-lived JWT (15 min) + Redis revocation list",
    why: "JWT is stateless — API servers verify without a DB lookup on every request. But pure stateless JWT can't handle instant revocation (e.g., stolen device). Netflix adds a Redis revocation list: valid until expiry, unless the key is in Redis. The 15-min TTL bounds the staleness window.",
    rejected: "Pure session tokens require a DB lookup on every API call (latency). Pure JWT with long TTL (24h) can't revoke instantly — a stolen token is valid for the rest of the day.",
  },
  {
    title: "Iceberg vs Delta Lake",
    chosen: "Apache Iceberg",
    why: "Iceberg supports time-travel queries, schema evolution without rewrites, and hidden partitioning. Netflix open-sourced Iceberg and their Metacat catalog is built around it. The key feature: you can query 'what did this table look like 90 days ago' — critical for debugging ML training data issues.",
    rejected: "Delta Lake (Databricks) is a solid alternative but is more tightly coupled to the Spark ecosystem. Iceberg is engine-agnostic — Netflix runs Spark, Trino, and Flink all on the same Iceberg tables.",
  },
  {
    title: "Client-Side vs Server-Side Discovery",
    chosen: "Client-side discovery via Eureka",
    why: "Each Netflix service is a Eureka client — it fetches the full service registry and load-balances locally (Ribbon). No central load balancer bottleneck. Self-preservation mode: if Eureka loses contact with 85%+ of instances, it stops evicting registrations (assumes network partition, not mass failure).",
    rejected: "Server-side discovery (e.g., AWS ALB) adds a network hop and a central failure point. At Netflix's scale with 1,000+ microservices, every extra hop compounds latency.",
  },
];

function FailuresTradeoffsTab() {
  const [expandedFailure, setExpandedFailure] = useState<string | null>(null);
  const [expandedTradeoff, setExpandedTradeoff] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Failure Matrix */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Failure Matrix</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>For each component: how it fails, whether it fails open or closed, and what to say in the interview.</p>
        </div>
        <div className="space-y-2">
          {FAILURE_MATRIX.map((item) => {
            const isOpen = expandedFailure === item.component;
            return (
              <div key={item.component} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <div
                  className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: "var(--bg)" }}
                  onClick={() => setExpandedFailure(isOpen ? null : item.component)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setExpandedFailure(isOpen ? null : item.component)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="text-[10px] font-bold px-2 py-1 rounded shrink-0"
                      style={{
                        background: item.mode === "fail-open" ? "#d1fae5" : "#fee2e2",
                        color: item.mode === "fail-open" ? "#065f46" : "#7f1d1d",
                      }}
                    >
                      {item.mode === "fail-open" ? "FAIL OPEN" : "FAIL CLOSED"}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{item.component}</span>
                      <span className="text-xs ml-2" style={{ color: "var(--text-faint)" }}>{item.failure}</span>
                    </div>
                  </div>
                  <span className="text-xs shrink-0 ml-4 transition-transform duration-200" style={{ color: "var(--text-faint)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                      <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>Detection</div>
                        <div className="text-sm" style={{ color: "var(--text-muted)" }}>{item.detection}</div>
                      </div>
                      <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>Recovery</div>
                        <div className="text-sm" style={{ color: "var(--text-muted)" }}>{item.recovery}</div>
                      </div>
                    </div>
                    <SayThisBlock text={item.sayThis} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tradeoff Cards */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Technology Tradeoffs</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Why Netflix chose each technology — and what it rejected. Senior engineers are expected to justify choices, not just name them.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {TRADEOFF_CARDS.map((item) => {
            const isOpen = expandedTradeoff === item.title;
            return (
              <div key={item.title} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <div
                  className="px-4 py-4 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: "var(--bg)" }}
                  onClick={() => setExpandedTradeoff(isOpen ? null : item.title)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setExpandedTradeoff(isOpen ? null : item.title)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>{item.title}</h3>
                      <p className="text-xs" style={{ color: "var(--blue-text)" }}>✓ {item.chosen}</p>
                    </div>
                    <span className="text-xs shrink-0 mt-1 transition-transform duration-200" style={{ color: "var(--text-faint)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                  </div>
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
                    <div className="pt-3 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      <div className="font-semibold mb-1" style={{ color: "var(--text)" }}>Why this choice</div>
                      {item.why}
                    </div>
                    <div className="rounded-lg p-3" style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#7f1d1d" }}>What was rejected &amp; why</div>
                      <div className="text-sm" style={{ color: "#991b1b" }}>{item.rejected}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { FailuresTradeoffsTab };
