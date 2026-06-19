"use client";

import { useState } from "react";
import { SayThisBlock } from "./shared";
import type { TabSlug } from "@/components/ui/NetflixPage";

const FAILURE_MATRIX = [
  {
    component: "Playback Service",
    failure: "Playback Service is down",
    mode: "fail-open",
    userImpact: "New playback sessions cannot start. In-progress streams continue from CDN unaffected.",
    detection: "Circuit breaker opens after 5 failures in 10s window (Resilience4j)",
    mitigation: "Return cached last manifest or redirect to degraded-quality stream",
    fallback: "Degraded stream > black screen. Circuit breaker: OPEN 30s → HALF_OPEN to probe",
    consistency: "Eventual — in-flight sessions preserve last known state",
    sayThis: "Playback fails open — a degraded stream beats a black screen. We serve a stale or lower-quality manifest rather than returning a 503. The circuit breaker opens after 5 failures in 10s.",
  },
  {
    component: "Billing Service",
    failure: "Billing unreachable at play time",
    mode: "fail-open",
    userImpact: "New entitlement checks cannot be confirmed — but existing active users are unaffected via cache.",
    detection: "Playback Service timeout > 150ms → skip billing check, use cache",
    mitigation: "Use cached entitlement (EVCache TTL = 1h) for active users. Fail closed only for brand-new or suspicious sessions.",
    fallback: "EVCache hit → playback proceeds. Cache miss + billing down → fail closed (new user: block)",
    consistency: "Eventual — cached entitlement may be up to 1h stale",
    sayThis: "Billing fails open deliberately. Netflix would rather give away a play than block 60M users on a billing outage. Cached entitlement with a 1h TTL covers active users. Only a confirmed-cancelled account should block playback.",
  },
  {
    component: "DRM License Server",
    failure: "DRM License Server is unreachable",
    mode: "fail-closed",
    userImpact: "New protected playback cannot start. No license = no decryption key = black screen.",
    detection: "Client-side: license request returns non-200. Server-side: timeout > 500ms.",
    mitigation: "No cached plaintext fallback — by contractual design. Return 503 to client.",
    fallback: "No fallback. Studio contracts require content is inaccessible without a valid license.",
    consistency: "Strong — correctness is legally mandatory here",
    sayThis: "DRM fails closed — this is a content licensing requirement, not a reliability choice. Netflix's studio contracts require that content cannot play without a valid, device-bound DRM license. One of the few places where a worse user experience is legally mandatory.",
  },
  {
    component: "Recommendation Service",
    failure: "Model stale or service down",
    mode: "fail-open",
    userImpact: "Homepage personalization degrades. Continue Watching still works (separate service).",
    detection: "Timeout > 200ms → fallback tier triggers automatically",
    mitigation: "Tier 1: Pre-computed snapshots in Cassandra. Tier 2: Trending in region. Tier 3: Top 10 globally.",
    fallback: "Three-tier fallback — user always sees something meaningful, never an empty homepage.",
    consistency: "Eventual — precomputed snapshots may be hours old",
    sayThis: "Recommendations have a three-tier fallback. The model's latest output is always pre-materialized into Cassandra so the online layer can fail without affecting the homepage. Trending is the last-resort — always fresh.",
  },
  {
    component: "EVCache (Catalog Cache)",
    failure: "EVCache cluster unavailable",
    mode: "fail-open",
    userImpact: "Catalog reads slow down significantly. No user-visible errors — reads fall through to Cassandra.",
    detection: "Cache miss rate spikes. Cassandra QPS spikes 100–300× normal.",
    mitigation: "Read from Cassandra directly. EVCache rebuilds on next cache hit.",
    fallback: "Cassandra handles the surge but may approach saturation in minutes at full traffic.",
    consistency: "Eventual — same eventual consistency as cached path",
    sayThis: "EVCache is a read-through cache. Misses fall through to Cassandra, never to an error. A full EVCache outage doesn't break the product but saturates Cassandra within minutes — that's the real risk.",
  },
  {
    component: "Kafka (Event Pipeline)",
    failure: "Kafka broker loses data before consumer ACK",
    mode: "fail-closed",
    userImpact: "Analytics events may be lost. Playback completely unaffected (async path).",
    detection: "Producer uses acks=all + min.insync.replicas=2",
    mitigation: "Idempotent producer ID prevents duplicates on retry. unclean.leader.election=false prevents data gaps.",
    fallback: "Client-side: buffer briefly, retry. Gateway: drop low-priority events under load. Playback never blocked.",
    consistency: "At-least-once (idempotent deduplication at consumer layer)",
    sayThis: "Kafka is configured for zero data loss: acks=all means lead + at least one follower must ACK. unclean.leader.election=false prevents a lagging broker from creating gaps. Tradeoff: slightly higher producer latency.",
  },
  {
    component: "Cassandra Node",
    failure: "Cassandra node fails mid-write",
    mode: "fail-open",
    userImpact: "Individual write may be slower. Quorum write still succeeds with remaining nodes.",
    detection: "Coordinator detects write timeout on failed node. Quorum (2/3) still met.",
    mitigation: "Hinted handoff stores the write for the failed node. Repairs on node recovery.",
    fallback: "Write succeeds to 2 healthy nodes. Failed node catches up via hinted handoff after restart.",
    consistency: "Eventual — QUORUM write maintains consistency; hinted handoff delivers missed writes",
    sayThis: "Cassandra's quorum writes tolerate node failures without blocking. With RF=3 and QUORUM consistency, 2 of 3 replicas must ACK. If one node is down, the cluster writes to the other two and uses hinted handoff to deliver the write when the node recovers.",
  },
  {
    component: "Search Service",
    failure: "Elasticsearch cluster unavailable",
    mode: "fail-open",
    userImpact: "Search returns empty results. Autocomplete fails. Browse/playback unaffected.",
    detection: "Health check endpoint returns non-200. Circuit breaker opens.",
    mitigation: "Serve cached search results for popular queries. Trending titles as fallback for empty search.",
    fallback: "Search degradation doesn't affect playback or homepage — separate service path.",
    consistency: "Eventual — stale search index is acceptable",
    sayThis: "Search is non-critical for playback. The fallback is cached popular-query results or a trending fallback. Playback, billing, and catalog are completely independent code paths.",
  },
  {
    component: "Cassandra Hot Partition",
    failure: "High write/read volume hitting a single partition key",
    mode: "fail-open",
    userImpact: "High latency or write failures for affected partition. Other partitions unaffected.",
    detection: "Cassandra coordinator latency p99 spike on specific token range",
    mitigation: "Better partition key design. Bucketing / salting. Write sharding. Review access patterns.",
    fallback: "Short-term: increase timeout + retry. Long-term: re-partition the table.",
    consistency: "Depends on partition — only affected partition degrades",
    sayThis: "Hot partitions happen when a globally popular key (like title_id for a new release) concentrates all writes on one Cassandra node. Fix: never partition watch history by title_id alone — use profile_id as the partition key since queries are always profile-scoped.",
  },
  {
    component: "Entire AWS Region",
    failure: "us-east-1 complete outage (Chaos Kong scenario)",
    mode: "fail-open",
    userImpact: "~30% of global traffic rerouted. Brief degradation during Route53 propagation (TTL = 30s).",
    detection: "Netflix Chaos Kong: deliberately kills a whole region monthly in production",
    mitigation: "Route53 removes unhealthy region. Other regions absorb traffic via active-active.",
    fallback: "Active-active across 3 regions. Cassandra multi-region replication. Tested monthly.",
    consistency: "Eventual — cross-region replication lag during failover",
    sayThis: "This is the Chaos Kong scenario. Netflix runs active-active across three regions. Cassandra uses multi-region replication. Route53 latency-based routing automatically stops sending traffic to a failing region. The key: they test this path monthly in production.",
  },
  {
    component: "Flink Lag (Stream Processing)",
    failure: "Flink job processing lag spikes",
    mode: "fail-open",
    userImpact: "Real-time dashboards become stale. QoE alerts delayed. Playback unaffected.",
    detection: "Kafka consumer lag metric + Flink checkpoint duration alert",
    mitigation: "Autoscale Flink task managers. Increase parallelism. Optimize checkpoint interval.",
    fallback: "Late data handled via event-time watermarking. Stale dashboards are a degraded experience, not an outage.",
    consistency: "Eventual — stream processing is inherently eventual",
    sayThis: "Flink lag is a data freshness problem, not a user-facing outage. Watermarking handles late-arriving events. Kafka's durable log means no data is lost — it just takes longer to process. Autoscaling consumers is the operational response.",
  },
];

const FAIL_OPEN_CLOSED_TABLE = [
  { component: "Playback (service down)", decision: "FAIL OPEN", reason: "Degraded stream > no stream" },
  { component: "Billing (during active session)", decision: "FAIL OPEN", reason: "Cached entitlement is sufficient for short TTL" },
  { component: "DRM License", decision: "FAIL CLOSED", reason: "Studio contract — legally required" },
  { component: "Concurrency limit (race condition)", decision: "FAIL CLOSED", reason: "Prevent account limit bypass" },
  { component: "Recommendations", decision: "FAIL OPEN", reason: "Three-tier fallback always exists" },
  { component: "Search", decision: "FAIL OPEN", reason: "Cached results / trending fallback" },
  { component: "Watch History write", decision: "FAIL OPEN", reason: "Stale resume is tolerable" },
  { component: "New user entitlement (no cache)", decision: "FAIL CLOSED", reason: "Unknown user = deny by default" },
  { component: "Kafka event ingestion", decision: "FAIL OPEN", reason: "Analytics must not block playback" },
];

export function FailuresTab({ onNavigateTab }: { onNavigateTab?: (tab: TabSlug) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-8 pb-10">
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "4px solid #f59e0b" }}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Interview pattern:</strong> Interviewers ask &ldquo;what happens if X is down?&rdquo; for every component you draw. Have a rehearsed answer for each: user impact, detection method, mitigation, and whether you fail open or closed.
        </p>
      </div>

      {/* Failure Matrix */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Failure Matrix</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Click any row to expand: user impact, detection, mitigation, fallback, and what to say.</p>
        <div className="space-y-2">
          {FAILURE_MATRIX.map((item) => {
            const isOpen = expandedId === item.component;
            return (
              <div key={item.component} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <button
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-opacity hover:opacity-80"
                  style={{ background: "var(--bg)", cursor: "pointer", border: "none" }}
                  onClick={() => setExpandedId(isOpen ? null : item.component)}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] font-bold px-2 py-1 rounded shrink-0"
                      style={{ background: item.mode === "fail-open" ? "#d1fae5" : "#fee2e2", color: item.mode === "fail-open" ? "#065f46" : "#7f1d1d" }}>
                      {item.mode === "fail-open" ? "FAIL OPEN" : "FAIL CLOSED"}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{item.component}</span>
                      <span className="text-xs ml-2 hidden sm:inline" style={{ color: "var(--text-faint)" }}>{item.failure}</span>
                    </div>
                  </div>
                  <span className="text-xs shrink-0 ml-4 transition-transform duration-200" style={{ color: "var(--text-faint)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                      {[
                        { label: "User Impact", val: item.userImpact },
                        { label: "Detection", val: item.detection },
                        { label: "Mitigation", val: item.mitigation },
                        { label: "Fallback", val: item.fallback },
                      ].map(({ label, val }) => (
                        <div key={label} className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>{label}</div>
                          <div className="text-sm" style={{ color: "var(--text-muted)" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>Consistency Consequence</div>
                      <div className="text-sm" style={{ color: "var(--text-muted)" }}>{item.consistency}</div>
                    </div>
                    <SayThisBlock text={item.sayThis} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fail open/closed table */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Fail Open vs Fail Closed — Quick Reference</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Memorize this table. Interviewers test it directly.</p>
        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Component / Scenario</th>
                <th className="text-center px-4 py-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Decision</th>
                <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {FAIL_OPEN_CLOSED_TABLE.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg)" : "var(--bg-card)" }}>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text)" }}>{r.component}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] font-bold px-2 py-1 rounded"
                      style={{ background: r.decision === "FAIL OPEN" ? "#d1fae5" : "#fee2e2", color: r.decision === "FAIL OPEN" ? "#065f46" : "#7f1d1d" }}>
                      {r.decision}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SayThisBlock text="The guiding principle: fail open for user experience, fail closed for security and legal obligations. Playback fails open because a degraded stream beats a black screen. DRM fails closed because studio contracts require it. Billing fails open for active users with cached entitlement — fail closed only for new or unknown users. Recommendations always have a three-tier fallback. Analytics and watch history writes are async and never block playback." />

      {onNavigateTab && (
        <button onClick={() => onNavigateTab("tradeoffs")} className="w-full py-4 rounded-2xl text-sm font-semibold"
          style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--border)", cursor: "pointer" }}>
          Next: Tradeoffs →
        </button>
      )}
    </div>
  );
}
