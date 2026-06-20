"use client";

import { SayThisBlock } from "./shared";
import type { TabSlug } from "./types";

const PLAYBACK_STEPS = [
  { step: 1,  actor: "Client",                    action: "POST /playback/session  { titleId, episodeId, deviceId, drmScheme }",                           latency: "" },
  { step: 2,  actor: "Route53 / ELB",              action: "DNS resolve + load balance to nearest healthy API server",                                     latency: "~5ms" },
  { step: 3,  actor: "Zuul2 (API Gateway)",        action: "Validate JWT signature, rate-limit check, route to Playback Service",                          latency: "~2ms" },
  { step: 4,  actor: "Playback Service",           action: "Receives request — begins parallel fan-out to 4 services simultaneously",                     latency: "" },
  { step: 5,  actor: "→ EVCache",                  action: "Check entitlement cache: is account active? which plan?",                                     latency: "~1ms" },
  { step: 6,  actor: "↳ Billing Service",          action: "Cache MISS only: verify subscription status via MySQL read replica",                          latency: "~10ms" },
  { step: 7,  actor: "→ Concurrency Service",      action: "Redis Lua script: atomically check slot count ≤ plan limit, INCR, SADD sessionId, TTL=36s",   latency: "~1ms" },
  { step: 8,  actor: "→ Steering Service",         action: "Get ranked OCA list for client IP: ASN match + title cached + OCA health + load",             latency: "~5ms" },
  { step: 9,  actor: "→ DRM Service",              action: "Issue license token signed by HSM (Content Encryption Key wrapped for device TEE)",            latency: "~10ms" },
  { step: 10, actor: "Playback Service",           action: "Build signed HMAC-SHA256 manifest URL (6h TTL) pointing to chosen OCA",                       latency: "~1ms" },
  { step: 11, actor: "Playback Service",           action: "Write session to Cassandra — ASYNC, off critical path",                                       latency: "async" },
  { step: 12, actor: "Playback Service",           action: "Publish playback.started to Kafka — ASYNC, off critical path",                                latency: "async" },
  { step: 13, actor: "Client",                     action: "Receives signed manifest URL ← TOTAL API time ends here",                                     latency: "TOTAL ~85ms / P99 <300ms" },
  { step: 14, actor: "Client → OCA",               action: "Fetch DASH/HLS manifest, then download video segments — API tier COMPLETELY out of path",     latency: "" },
  { step: 15, actor: "Client (every 30s)",         action: "POST /playback/heartbeat  { sessionId, positionMs, bitrateKbps, bufferMs }",                  latency: "" },
  { step: 16, actor: "Playback Service",           action: "Refresh Redis slot TTL to 36s + async Cassandra position write",                              latency: "async" },
];

const LATENCY_BUDGET = [
  { component: "DNS + ELB",                budget: "~5ms" },
  { component: "JWT validation (Zuul2)",   budget: "~2ms" },
  { component: "Entitlement (cache HIT)",  budget: "~1ms" },
  { component: "Entitlement (cache MISS)", budget: "~10ms" },
  { component: "Concurrency check (Redis)",budget: "~1ms" },
  { component: "OCA selection (Steering)", budget: "~5ms" },
  { component: "DRM license (HSM)",        budget: "~10ms" },
  { component: "Manifest URL build",       budget: "~1ms" },
  { component: "Cassandra write",          budget: "async (not on path)" },
  { component: "Network overhead",         budget: "~50ms" },
  { component: "Total (cache hit path)",   budget: "~75ms" },
  { component: "P99 with jitter",          budget: "~200–300ms" },
];

const FAILURE_SCENARIOS = [
  {
    title: "Billing service down",
    behavior: "FAIL OPEN",
    color: "#10b981",
    detail: "Use cached entitlement (EVCache TTL = 1h) for active paying users. Fail closed only for new or suspicious sessions with no cached state.",
    why: "Netflix would rather give away one play than block 60M concurrent users during a billing outage.",
  },
  {
    title: "DRM license service down",
    behavior: "FAIL CLOSED",
    color: "#ef4444",
    detail: "Return HTTP 503 to client. No plaintext fallback is allowed — studio licensing contracts require this.",
    why: "Content protection is a legal contractual requirement, not a reliability choice.",
  },
  {
    title: "Watch history write fails",
    behavior: "FAIL OPEN",
    color: "#10b981",
    detail: "Playback continues unaffected. Resume position may be slightly stale. Next heartbeat will update position.",
    why: "Watch history is eventually consistent by design. Slightly stale resume is acceptable.",
  },
  {
    title: "CDN edge node down",
    behavior: "FAIL OPEN",
    color: "#10b981",
    detail: "Player falls back to next OCA in the ranked list. If all ISP OCAs unhealthy, Exchange OCA, then S3 origin.",
    why: "OCA selection returns 3–5 candidate nodes. Client retries down the list automatically.",
  },
  {
    title: "Heartbeat delayed / dropped",
    behavior: "FAIL OPEN",
    color: "#10b981",
    detail: "Concurrency slot self-expires after 36s TTL if no heartbeat arrives. Player retries heartbeat independently.",
    why: "36s TTL > 30s heartbeat interval provides 1 missed heartbeat grace period before slot eviction.",
  },
  {
    title: "Concurrency race (two devices play simultaneously)",
    behavior: "FAIL CLOSED",
    color: "#f59e0b",
    detail: "Redis Lua script is atomic. Race condition impossible — only one device wins the slot INCR. Loser gets 429.",
    why: "Atomicity at the Redis layer eliminates the race without distributed locks.",
  },
];

const OPTIMIZATIONS = [
  { title: "Entitlement pre-warm", detail: "EVCache entitlement entry is refreshed on every login, not just on cache miss. Hit rate: >99%." },
  { title: "Parallel fan-out", detail: "Steps 5–9 execute in parallel — not sequentially. Total latency = max(all steps), not sum." },
  { title: "Async writes off critical path", detail: "Cassandra session write and Kafka event publish happen after the response is sent. They do not add latency." },
  { title: "Manifest pre-build", detail: "Static manifests for popular titles are pre-generated and stored. Dynamic manifest URL wraps the pre-built file with a signed token." },
  { title: "OCA content pre-positioning", detail: "Nightly algorithm fills OCAs with predicted next-day popular titles before 8pm release windows." },
  { title: "ABR startup quality", detail: "Player starts at a lower bitrate (fast segment) and ramps up. Perceived startup is instant even on slow connections." },
];

export function PlaybackTab({ onNavigateTab }: { onNavigateTab?: (tab: TabSlug) => void }) {
  return (
    <div className="space-y-8 pb-10">
      {/* Callout */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "4px solid #ec4899" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          The most common follow-up after drawing the architecture. Walk through every hop with latency budgets. Emphasize that API servers never touch video bytes.
        </p>
      </div>

      {/* 16-step sequence */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Press Play — 16-Step Sequence</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Steps 5–9 execute in parallel. Steps 11–12 are async after the response is returned.</p>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="grid text-[10px] font-bold uppercase tracking-wider px-4 py-2.5"
            style={{ gridTemplateColumns: "2rem 1fr 6rem", background: "var(--bg-card)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <span>#</span>
            <span>Actor → Action</span>
            <span className="text-right">Latency</span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {PLAYBACK_STEPS.map((row) => {
              const isHighlight = row.step === 13 || row.step === 14;
              const isAsync = row.latency === "async";
              const isParallel = row.step >= 5 && row.step <= 9;
              return (
                <div key={row.step} className="grid items-start px-4 py-3 gap-3"
                  style={{ gridTemplateColumns: "2rem 1fr 6rem", background: isHighlight ? "var(--blue-soft)" : row.step % 2 === 0 ? "var(--bg-card)" : "var(--bg)" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: isParallel ? "#8b5cf620" : "var(--blue-soft)", color: isParallel ? "#8b5cf6" : "var(--blue-text)" }}>
                    {row.step}
                  </span>
                  <div>
                    <span className="text-xs font-bold mr-1.5" style={{ color: isParallel ? "#8b5cf6" : "#3b82f6" }}>{row.actor}</span>
                    <span className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>{row.action}</span>
                    {isParallel && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#8b5cf620", color: "#8b5cf6" }}>parallel</span>}
                  </div>
                  <span className="text-[10px] font-mono text-right whitespace-nowrap pt-0.5"
                    style={{ color: row.step === 13 ? "#10b981" : isAsync ? "var(--text-faint)" : row.latency ? "#f59e0b" : "transparent" }}>
                    {row.latency || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Latency Budget */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Latency Budget Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LATENCY_BUDGET.map((item) => {
            const isTotal = item.component.includes("Total") || item.component.includes("P99");
            return (
              <div key={item.component} className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ background: isTotal ? "var(--blue-soft)" : "var(--bg)", border: `1px solid ${isTotal ? "#3b82f640" : "var(--border)"}` }}>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.component}</span>
                <span className="text-xs font-mono font-bold ml-3 shrink-0" style={{ color: isTotal ? "#3b82f6" : "var(--text)" }}>{item.budget}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Failure scenarios */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Failure Behavior</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Every downstream dependency has a defined failure mode. Interviewers test this.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {FAILURE_SCENARIOS.map((f) => (
            <div key={f.title} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{f.title}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded ml-auto shrink-0"
                  style={{ background: f.color + "20", color: f.color }}>
                  {f.behavior}
                </span>
              </div>
              <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--text-muted)" }}>{f.detail}</p>
              <p className="text-xs italic" style={{ color: "var(--text-faint)" }}>Why: {f.why}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Optimizations */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>Startup Optimizations</h3>
        <div className="space-y-3">
          {OPTIMIZATIONS.map((o, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>{i + 1}</span>
              <div>
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{o.title}: </span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>{o.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SayThisBlock text="The Playback Service is intentionally thin — it validates auth, checks entitlement via EVCache, acquires a stream slot atomically via Redis Lua, gets a DRM license token, and returns a signed manifest URL. Steps 5–9 run in parallel so total latency is ~85ms, not the sum of each step. After step 13, Netflix's API servers are completely out of the video path. 95% of Netflix traffic is video bytes flowing directly client-to-OCA." />

      {onNavigateTab && (
        <button onClick={() => onNavigateTab("cdn")} className="w-full py-4 rounded-2xl text-sm font-semibold"
          style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--border)", cursor: "pointer" }}>
          Next: CDN / Open Connect →
        </button>
      )}
    </div>
  );
}
