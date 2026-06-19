"use client";

import { useState } from "react";
import { SayThisBlock, ScaleDerivationSection } from "./shared";
import type { TabSlug } from "./types";

const PLATFORM_OVERVIEW_PLANES = [
  {
    title: "ONLINE SERVING PLANE",
    accent: "#3b82f6",
    handles: ["login", "browse", "search", "play", "billing", "recommendations (real-time)"],
    latency: "Milliseconds",
    consistency: "Strong for billing/concurrency, eventual for recommendations",
    stores: ["MySQL", "Cassandra", "Redis", "EVCache", "Elasticsearch"],
  },
  {
    title: "DATA PLATFORM PLANE",
    accent: "#10b981",
    handles: ["analytics", "ML training", "recommendations (batch)", "quality monitoring", "business reports"],
    latency: "Seconds to hours",
    consistency: "Eventually consistent",
    stores: ["Kafka", "S3", "Iceberg", "Flink", "Spark", "Pinot", "Trino"],
  },
];

const PLATFORM_OVERVIEW_PLANES2 = [
  {
    title: "CONTROL PLANE",
    accent: "#3b82f6",
    flow: "Client → API Gateway → Playback Service → Auth / Billing / DRM",
    returns: "Signed manifest URL",
    note: "★ API servers NEVER serve video bytes",
  },
  {
    title: "VIDEO DATA PLANE",
    accent: "#f59e0b",
    flow: "Client → OCA / CDN → Video segments",
    returns: "After control plane issues the manifest URL, the API tier is completely OUT of the hot path",
    note: null,
  },
];

function PlatformOverview() {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--text)" }}>Two-Plane Mental Model</h2>
      <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-muted)" }}>
        Before drawing any boxes, anchor the interviewer with this mental model. Netflix has two completely separate planes — one for user-facing APIs, one for video bytes.
      </p>

      {/* Row 1 — Online Serving vs Data Platform */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {PLATFORM_OVERVIEW_PLANES.map((plane) => (
          <div
            key={plane.title}
            className="rounded-2xl p-6"
            style={{
              background: "var(--bg-card)",
              border: `1px solid var(--border)`,
              borderTop: `3px solid ${plane.accent}`,
            }}
          >
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-4"
              style={{ color: plane.accent }}
            >
              {plane.title}
            </h3>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Handles</span>
                <div className="flex flex-wrap gap-1.5">
                  {plane.handles.map((h) => (
                    <span
                      key={h}
                      className="text-xs px-2 py-0.5 rounded-lg"
                      style={{ background: `color-mix(in srgb, ${plane.accent} 8%, transparent)`, color: plane.accent, border: `1px solid ${plane.accent}30` }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-faint)" }}>Latency</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{plane.latency}</span>
                </div>
                <div className="p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-faint)" }}>Consistency</span>
                  <span className="text-xs leading-snug" style={{ color: "var(--text)" }}>{plane.consistency}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Primary Stores</span>
                <div className="flex flex-wrap gap-1.5">
                  {plane.stores.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)"  }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2 — Control Plane vs Video Data Plane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {PLATFORM_OVERVIEW_PLANES2.map((plane) => (
          <div
            key={plane.title}
            className="rounded-2xl p-6"
            style={{
              background: "var(--bg-card)",
              border: `1px solid var(--border)`,
              borderTop: `3px solid ${plane.accent}`,
            }}
          >
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: plane.accent }}
            >
              {plane.title}
            </h3>
            <p
              className="text-sm leading-relaxed mb-3 font-mono"
              style={{ color: "var(--text)" }}
            >
              {plane.flow}
            </p>
            <div className="p-3 rounded-lg mb-2" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-faint)" }}>Returns</span>
              <span className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>{plane.returns}</span>
            </div>
            {plane.note && (
              <div
                className="p-3 rounded-lg"
                style={{ background: `color-mix(in srgb, ${plane.accent} 7%, transparent)`, border: `1px solid ${plane.accent}30` }}
              >
                <span className="text-xs font-bold" style={{ color: plane.accent }}>{plane.note}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const PROGRESSIVE_LAYERS = [
  {
    label: "Layer 1: Skeleton",
    short: "Skeleton",
    diagram: `Client Apps
    │
    ▼
Route53 / ELB
    │
    ▼
API Gateway (Zuul2)
    │
    ├──► Core Services (Auth, Catalog, Search, User)
    │         │
    │         ▼
    │    Databases / Cache
    │    (MySQL · Cassandra · Redis · EVCache)
    │
    └──► CDN (OCA)
              │
              ▼
         Video Segments → Client`,
    addedWhat: "The absolute minimum skeleton. Client, load balancer, gateway, services, databases, CDN. Draw these boxes first — they give the interviewer confidence you know the shape.",
    tip: "Start here. Draw these 6 layers in the first 60 seconds. Do NOT draw Kafka, ML, or encoding until the interviewer asks or you have the skeleton locked.",
  },
  {
    label: "Layer 2: + Events",
    short: "+ Events",
    diagram: `Client Apps
    │                        │ Event SDK
    ▼                        ▼
Route53 / ELB          Event Gateway
    │                        │
    ▼                        ▼
API Gateway (Zuul2)       Kafka (15M events/s)
    │                        │
    ├──► Core Services        ├──► Flink (real-time)
    │         │               │
    │         ▼               ▼
    │    Databases / Cache  Data Lake (S3 / Iceberg)
    │
    └──► CDN (OCA)`,
    addedWhat: "Added the event pipeline. Every client action (play, pause, search, impression) flows via Event SDK → Event Gateway → Kafka. This drives analytics, recommendations, and A/B testing.",
    tip: "Say: 'Every user action emits an event through a separate write path — it never touches the serving API. Kafka decouples event capture from processing, so a Flink job failure never affects playback.'",
  },
  {
    label: "Layer 3: + ML",
    short: "+ ML",
    diagram: `Client Apps
    │                        │ Event SDK
    ▼                        ▼
Route53 / ELB          Event Gateway
    │                        │
    ▼                        ▼
API Gateway (Zuul2)       Kafka (15M events/s)
    │                        │
    ├──► Core Services        ├──► Flink → Data Lake
    │    Rec Service ◄─────── │
    │         │               ▼
    │         ▼          Feature Store
    │    Databases/Cache      │
    │                         ▼
    │                   ML Training (GPU)
    │                   Two-Tower Model
    └──► CDN (OCA)`,
    addedWhat: "Added the ML feedback loop. Feature Store feeds online (EVCache) and offline (S3) features. GPU cluster trains the two-tower recommendation model. Recommendations are pre-computed and served from EVCache.",
    tip: "Say: 'Recommendations are not computed at request time — they are pre-computed offline and cached. The serving path just reads from EVCache. This is why recs are available in <5ms at query time.'",
  },
  {
    label: "Layer 4: + Encoding",
    short: "+ Encoding",
    diagram: `Studio Upload
    │
    ▼
Encoding Pipeline
(shot detection → per-title VMAF → 1200+ variants)
    │
    ▼
S3 Origin (master + all variants)
    │
    ▼
OCA Pre-fill (nightly push to OCAs via ISP peering)
    │
    ▼
CDN (OCA) ◄──── Client (after manifest received)

[Online serving + events + ML layers all still present above]`,
    addedWhat: "Added the content ingestion and encoding path. Studio uploads flow through per-title encoding to produce 1,200+ variants per title. These are pre-filled to OCAs nightly before peak hours.",
    tip: "Say: 'The encoding pipeline is completely offline from the serving path. Stranger Things S5 is pre-encoded into 1,200+ variants and pre-filled to every relevant OCA before 8pm release. At request time, the OCA just reads from local NVMe.'",
  },
  {
    label: "Layer 5: Full",
    short: "Full",
    diagram: `Studio Upload
    │
    ▼
Encoding Pipeline → S3 Origin → OCA Pre-fill

Client Apps
    │                        │ Event SDK
    ▼                        ▼
Route53 / ELB          Event Gateway
    │                        │
    ▼                        ▼
API Gateway (Zuul2)       Kafka (15M events/s, ~720 brokers)
[Circuit Breakers:         │
 Resilience4j]            ├──► Flink (~3000 vCPUs) → S3 Iceberg
    │                      │
    ├──► Core Services      ▼
    │    [Hystrix]     Feature Store → ML Training (GPU)
    │    Rec Service ◄─────────────────────────────┘
    │         │
    │         ▼
    │    MySQL · Cassandra · Redis · EVCache · ES
    │
    └──► CDN (OCA / ~17,000 appliances)
              │
Chaos Kong: kill entire AWS region → validate multi-region failover`,
    addedWhat: "Added reliability layer. Circuit breakers (Resilience4j) wrap every downstream call. Hystrix fallbacks serve cached responses on service failure. Chaos Kong periodically kills entire AWS regions to test multi-region failover.",
    tip: "Say: 'Netflix runs Chaos Kong in production — it terminates entire AWS regions to ensure the system fails over correctly. Every service has a circuit breaker. The Playback Service is designed to fail open: if Billing is down, it issues the manifest anyway and reconciles later.'",
  },
];

function ProgressiveReveal() {
  const [activeLayer, setActiveLayer] = useState(0);
  const layer = PROGRESSIVE_LAYERS[activeLayer];

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
        Progressive Architecture Reveal
      </h2>
      <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>
        In a real interview you draw the architecture in layers. This is the order. Each layer unlocks the next — never jump ahead.
      </p>

      {/* Layer selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {PROGRESSIVE_LAYERS.map((l, i) => (
          <button
            key={i}
            onClick={() => setActiveLayer(i)}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors duration-150"
            style={{
              background: activeLayer === i ? "#3b82f6" : "var(--bg-card)",
              color: activeLayer === i ? "#ffffff" : "var(--text-muted)",
              border: `1px solid ${activeLayer === i ? "#3b82f6" : "var(--border)"}`,
              cursor: "pointer",
            }}
          >
            {l.short}
          </button>
        ))}
      </div>

      {/* Diagram */}
      <pre
        className="text-xs leading-relaxed overflow-x-auto p-4 rounded-lg font-mono whitespace-pre"
        style={{
          background: "var(--bg)",
          color: "var(--text)",
          border: "1px solid var(--border)",
         }}
      >
        {layer.diagram}
      </pre>

      {/* What was added */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
          What was added in this layer
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          {layer.addedWhat}
        </p>
      </div>

      {/* Interview tip */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--blue-soft)", border: "1px solid #3b82f630"  }}
      >
        <span className="text-xs font-bold block mb-2" style={{ color: "#3b82f6" }}>
          ★ Interview tip — say this when drawing this layer
        </span>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          {layer.tip}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {activeLayer > 0 && (
          <button
            onClick={() => setActiveLayer(activeLayer - 1)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer"  }}
          >
            ← {PROGRESSIVE_LAYERS[activeLayer - 1].short}
          </button>
        )}
        {activeLayer < PROGRESSIVE_LAYERS.length - 1 && (
          <button
            onClick={() => setActiveLayer(activeLayer + 1)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: "#3b82f6", color: "#ffffff", border: "1px solid #3b82f6", cursor: "pointer"  }}
          >
            {PROGRESSIVE_LAYERS[activeLayer + 1].short} →
          </button>
        )}
      </div>
    </div>
  );
}

const PLAYBACK_STEPS = [
  { step: 1,  actor: "Client",                    action: "POST /playback/start  { titleId, episodeId, deviceId, drmScheme }",                           latency: "" },
  { step: 2,  actor: "Route53 / ELB",              action: "DNS resolve + load balance to nearest healthy API server",                                     latency: "~5ms" },
  { step: 3,  actor: "Zuul2",                      action: "Validate JWT signature, rate-limit check, route to Playback Service",                          latency: "~2ms" },
  { step: 4,  actor: "Playback Service",           action: "Receives request — begins parallel fan-out",                                                   latency: "" },
  { step: 5,  actor: "→ EVCache",                  action: "Check entitlement cache (account active? plan?)",                                              latency: "~1ms" },
  { step: 6,  actor: "↳ Billing Service",          action: "Cache miss only: verify subscription via MySQL",                                               latency: "~10ms" },
  { step: 7,  actor: "→ Concurrency Service",      action: "Redis Lua script: atomically check slot count, INCR, SADD sessionId, set TTL=36s",            latency: "~1ms" },
  { step: 8,  actor: "→ Steering Service",         action: "Get ranked OCA list for client IP — match ASN, title cached, OCA health + load",              latency: "~5ms" },
  { step: 9,  actor: "→ DRM Service",              action: "Issue license token signed by HSM (CEK encrypted for device TEE)",                             latency: "~10ms" },
  { step: 10, actor: "Playback Service",           action: "Build signed HMAC-SHA256 manifest URL (6h TTL) pointing to best OCA",                         latency: "~1ms" },
  { step: 11, actor: "Playback Service",           action: "Write session record to Cassandra (async, off the critical path)",                             latency: "async" },
  { step: 12, actor: "Playback Service",           action: "Publish playback.started event to Kafka (async, off critical path)",                           latency: "async" },
  { step: 13, actor: "Client",                     action: "Receives signed manifest URL",                                                                 latency: "TOTAL < 300ms P99" },
  { step: 14, actor: "Client → OCA",               action: "Fetch DASH/HLS manifest, then stream video segments — API tier is now completely out of path", latency: "" },
  { step: 15, actor: "Client (every 30s)",         action: "POST /playback/heartbeat  { sessionId, positionMs, bitrateKbps }",                            latency: "" },
  { step: 16, actor: "Playback Service",           action: "Refresh Redis TTL to 36s (keep slot alive) + async Cassandra position write",                  latency: "" },
];

const PLAYBACK_LATENCY_BUDGET = [
  { component: "DNS + ELB",               budget: "5ms" },
  { component: "JWT validation (Zuul2)",  budget: "2ms" },
  { component: "Entitlement (cache miss)",budget: "10ms" },
  { component: "Concurrency check",       budget: "1ms" },
  { component: "OCA selection (Steering)",budget: "5ms" },
  { component: "DRM license (HSM)",       budget: "10ms" },
  { component: "Manifest build",          budget: "1ms" },
  { component: "Cassandra write",         budget: "async (not on path)" },
  { component: "Network overhead",        budget: "~50ms" },
  { component: "Total estimate",          budget: "~85ms" },
  { component: "P99 with network jitter", budget: "~200–300ms" },
];

function PlaybackDeepDive() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
        Playback Deep Dive — 16-Step Sequence
      </h2>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
        This is the most common follow-up after you draw the architecture. Walk through every hop with latency budgets.
      </p>

      {/* Sequence table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)"  }}>
        <div
          className="grid text-[10px] font-bold uppercase tracking-wider px-4 py-2"
          style={{
            gridTemplateColumns: "2rem 1fr 3rem",
            background: "var(--bg-card)",
            borderBottom: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          <span>#</span>
          <span>Actor → Action</span>
          <span className="text-right">Latency</span>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {PLAYBACK_STEPS.map((row) => {
            const isHighlight = row.step === 13 || row.step === 14;
            const isAsync = row.latency === "async";
            return (
              <div
                key={row.step}
                className="grid items-start px-4 py-3 gap-3"
                style={{
                  gridTemplateColumns: "2rem 1fr 3rem",
                  background: isHighlight ? "var(--blue-soft)" : row.step % 2 === 0 ? "var(--bg-card)" : "var(--bg)",
                }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}
                >
                  {row.step}
                </span>
                <div>
                  <span className="text-xs font-bold mr-1.5" style={{ color: "#3b82f6" }}>{row.actor}</span>
                  <span className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>{row.action}</span>
                </div>
                <span
                  className="text-[10px] font-mono text-right whitespace-nowrap pt-0.5"
                  style={{
                    color: row.step === 13
                      ? "#10b981"
                      : isAsync
                      ? "var(--text-faint)"
                      : row.latency
                      ? "#f59e0b"
                      : "transparent",
                  }}
                >
                  {row.latency || "-"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Latency Budget card */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
          Latency Budget Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PLAYBACK_LATENCY_BUDGET.map((item) => {
            const isTotal = item.component.includes("Total") || item.component.includes("P99");
            return (
              <div
                key={item.component}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{
                  background: isTotal ? "var(--blue-soft)" : "var(--bg)",
                  border: `1px solid ${isTotal ? "#3b82f640" : "var(--border)"}`,
                }}
              >
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.component}</span>
                <span
                  className="text-xs font-mono font-bold ml-3 shrink-0"
                  style={{ color: isTotal ? "#3b82f6" : "var(--text)" }}
                >
                  {item.budget}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Say This Block */}
      <SayThisBlock text="The Playback Service is intentionally thin — it validates auth, checks entitlement via EVCache, acquires a stream slot atomically via Redis Lua, gets a DRM license token, and returns a signed manifest URL. After step 13, Netflix's API servers are completely out of the video path. 95% of Netflix traffic is video bytes flowing directly client-to-OCA. This is why Netflix can serve 300 Tbps with a modest API fleet." />
    </div>
  );
}

const OCA_SELECTION_STEPS = [
  "Match client IP to ISP / ASN lookup table",
  "Filter: only OCAs that already have the title cached",
  "Score by: BGP hop proximity, OCA health score, current OCA load",
  "Return ordered list of 3–5 candidate OCAs",
  "Client tries the top OCA first, falls back down the list on failure",
];

function CDNSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
        CDN — Open Connect Architecture
      </h2>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Netflix's CDN is unlike any commercial CDN. It is 17,000 purpose-built appliances co-located inside ISP networks. Understanding why it exists is as important as how it works.
      </p>

      {/* Two-panel: Control Plane vs Video Data Plane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Control Plane */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-card)", borderTop: "3px solid #3b82f6", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", borderLeft: "1px solid var(--border)" }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "#3b82f6" }}>
            Control Plane — API Path
          </h3>
          <div className="space-y-2">
            {[
              { label: "Client", detail: "POST /playback/start" },
              { label: "API Gateway (Zuul2)", detail: "JWT validate, rate limit" },
              { label: "Playback Service", detail: "Fan-out: auth, concurrency, DRM" },
              { label: "Steering Service", detail: "Pick best OCA for client IP + title" },
              { label: "Returns", detail: "Signed manifest URL pointing to chosen OCA" },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                {i < 4 && (
                  <div className="flex flex-col items-center shrink-0" style={{ width: 20 }}>
                    <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: "#3b82f6" }} />
                    {i < 3 && <div className="w-px flex-1" style={{ background: "#3b82f630", minHeight: 12 }} />}
                  </div>
                )}
                {i === 4 && <span className="text-sm shrink-0 mt-0.5" style={{ color: "#3b82f6", width: 20 }}>↩</span>}
                <div>
                  <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{step.label}</span>
                  <span className="text-xs ml-1.5" style={{ color: "var(--text-muted)" }}>{step.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video Data Plane */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-card)", borderTop: "3px solid #f59e0b", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", borderLeft: "1px solid var(--border)" }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "#f59e0b" }}>
            Video Data Plane — After Manifest
          </h3>
          <div className="space-y-2 mb-4">
            {[
              { label: "Client", detail: "Manifest URL received — API tier now OUT of path" },
              { label: "OCA (ISP co-located)", detail: "Serve video segments from local NVMe — sub-ms reads" },
              { label: "Exchange OCA (on miss)", detail: "Internet Exchange Point OCA — regional fallback" },
              { label: "Netflix Origin S3 (on exchange miss)", detail: "Master copy — rare, <1% of requests for top titles" },
            ].map((step, i, arr) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex flex-col items-center shrink-0" style={{ width: 20 }}>
                  <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: "#f59e0b" }} />
                  {i < arr.length - 1 && <div className="w-px flex-1" style={{ background: "#f59e0b30", minHeight: 12 }} />}
                </div>
                <div>
                  <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{step.label}</span>
                  <span className="text-xs ml-1.5" style={{ color: "var(--text-muted)" }}>{step.detail}</span>
                </div>
              </div>
            ))}
          </div>
          <div
            className="p-3 rounded-lg"
            style={{ background: "rgba(245,158,11,0.07)", border: "1px solid #f59e0b30"  }}
          >
            <span className="text-xs font-bold" style={{ color: "#f59e0b" }}>
              ★ OCA tier order: ISP OCA → Exchange OCA → S3 Origin
            </span>
          </div>
        </div>
      </div>

      {/* OCA Selection Algorithm */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
          OCA Selection — How Steering Service Picks
        </h3>
        <div className="space-y-2">
          {OCA_SELECTION_STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}
              >
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Economics card */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "4px solid #10b981"  }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#10b981" }}>
          Economics — Why Netflix Built Its Own CDN
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          At 300 Tbps, commercial CDN transit fees would exceed $500M/year. Netflix instead co-locates ~17,000 OCA appliances inside ISP networks, paying only for hardware and ISP negotiation. The ISP benefits too: local caching reduces their upstream transit costs. This is why Netflix has ~17,000 OCAs but Akamai negotiates contracts.
        </p>
      </div>

      {/* Nightly fill card */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "4px solid #8b5cf6"  }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#8b5cf6" }}>
          Nightly Fill Algorithm
        </h3>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text)" }}>
          Release schedule + recommendation signals → Fill Algorithm → Push to relevant OCAs during off-peak hours via ISP peering links. &ldquo;Stranger Things&rdquo; S5 is pre-filled to every OCA worldwide before 8pm release. Cache hit rate target: &gt;99% for top-200 titles.
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            ["~17,000", "OCA appliances globally"],
            [">99%", "cache hit rate (top-200 titles)"],
            ["Off-peak", "fill window (ISP peering links)"],
          ].map(([val, label]) => (
            <div
              key={label}
              className="px-4 py-3 rounded-xl text-center"
              style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}
            >
              <div className="text-lg font-black font-mono" style={{ color: "#8b5cf6" }}>{val}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Say This Block */}
      <SayThisBlock text="95% of Netflix traffic is video bytes flowing client-to-OCA. Netflix built its own CDN rather than using Akamai because at 300 Tbps the economics are completely different — commercial CDN transit would cost hundreds of millions per year. Netflix instead places ~17,000 OCA appliances inside ISP networks. Both parties win: Netflix avoids transit costs, the ISP serves local traffic instead of backhauling it." />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   ARCHITECTURE TAB
   ═══════════════════════════════════════════════════════════════ */
function ArchitectureTab({ onNavigateService, onNavigateTab }: { onNavigateService: (id: string) => void; onNavigateTab: (tab: TabSlug) => void }) {
  return (
    <div className="space-y-10">
      {/* Platform Overview — Two-Plane Mental Model */}
      <PlatformOverview />

      {/* Progressive Reveal Architecture */}
      <ProgressiveReveal />

      {/* SVG Architecture Diagram */}
      <div
        className="rounded-2xl p-6 overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}
      >
        <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>
          Request Flow Architecture
        </h2>
        <div className="w-full overflow-x-auto">
          <svg viewBox="0 0 1000 700" className="w-full min-w-[800px]" style={{ maxHeight: "620px" }}>
            <defs>
              <style>{`
                @keyframes flowDash { to { stroke-dashoffset: -20; } }
                .flow-line {
                  stroke-dasharray: 8 4;
                  animation: flowDash 1s linear infinite;
                }
              `}</style>
            </defs>

            {/* Connection Lines */}
            {/* Client -> ELB */}
            <line x1="400" y1="60" x2="400" y2="130" className="flow-line" stroke="var(--blue-text)" strokeWidth="2" fill="none" />
            {/* Client -> OCA */}
            <line x1="480" y1="45" x2="700" y2="45" className="flow-line" stroke="#f59e0b" strokeWidth="2" fill="none" />
            <text x="590" y="36" fill="var(--text-faint)" fontSize="10" textAnchor="middle">video bytes directly</text>
            {/* ELB -> Zuul */}
            <line x1="400" y1="170" x2="400" y2="220" className="flow-line" stroke="var(--blue-text)" strokeWidth="2" fill="none" />
            {/* Zuul -> Eureka */}
            <line x1="320" y1="248" x2="200" y2="248" className="flow-line" stroke="var(--blue-text)" strokeWidth="2" fill="none" />
            {/* Zuul -> Core Services */}
            <line x1="350" y1="270" x2="200" y2="340" className="flow-line" stroke="var(--blue-text)" strokeWidth="2" fill="none" />
            {/* Zuul -> Platform Services */}
            <line x1="450" y1="270" x2="650" y2="340" className="flow-line" stroke="var(--blue-text)" strokeWidth="2" fill="none" />
            {/* Core -> Data Layer */}
            <line x1="200" y1="430" x2="400" y2="500" className="flow-line" stroke="#10b981" strokeWidth="2" fill="none" />
            {/* Platform -> Data Layer */}
            <line x1="650" y1="430" x2="500" y2="500" className="flow-line" stroke="#10b981" strokeWidth="2" fill="none" />
            {/* Data Layer -> Analytics */}
            <line x1="450" y1="570" x2="450" y2="610" className="flow-line" stroke="#8b5cf6" strokeWidth="2" fill="none" />

            {/* ─── Nodes ─── */}

            {/* Client */}
            <g onClick={() => onNavigateService("client")} className="cursor-pointer">
              <rect x="300" y="20" width="200" height="44" rx="10" fill="var(--blue-soft)" stroke="var(--blue-text)" strokeWidth="1.5" />
              <text x="400" y="47" textAnchor="middle" fill="var(--blue-text)" fontSize="13" fontWeight="600">Client (TV / Mobile / Web)</text>
            </g>

            {/* OCA */}
            <g onClick={() => onNavigateService("oca")} className="cursor-pointer">
              <rect x="700" y="20" width="190" height="44" rx="10" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="795" y="47" textAnchor="middle" fill="#92400e" fontSize="13" fontWeight="600">Open Connect (OCA CDN)</text>
            </g>

            {/* ELB + Route53 */}
            <g onClick={() => onNavigateService("elb")} className="cursor-pointer">
              <rect x="300" y="130" width="200" height="44" rx="10" fill="var(--blue-soft)" stroke="var(--blue-text)" strokeWidth="1.5" />
              <text x="400" y="157" textAnchor="middle" fill="var(--blue-text)" fontSize="13" fontWeight="600">AWS Route53 / ELB</text>
            </g>

            {/* Zuul2 */}
            <g onClick={() => onNavigateService("zuul")} className="cursor-pointer">
              <rect x="300" y="220" width="200" height="54" rx="10" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="400" y="250" textAnchor="middle" fill="#92400e" fontSize="14" fontWeight="700">Zuul2 API Gateway</text>
              <text x="400" y="265" textAnchor="middle" fill="#92400e" fontSize="10">1M+ requests/sec</text>
            </g>

            {/* Eureka + Ribbon */}
            <g onClick={() => onNavigateService("eureka")} className="cursor-pointer">
              <rect x="70" y="228" width="180" height="40" rx="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="160" y="253" textAnchor="middle" fill="#92400e" fontSize="12" fontWeight="600">Eureka + Ribbon</text>
            </g>

            {/* Core Services Group */}
            <g>
              <rect x="50" y="320" width="300" height="110" rx="12" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5 3" />
              <text x="200" y="342" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="700">CORE SERVICES</text>
              <g onClick={() => onNavigateService("auth")} className="cursor-pointer">
                <rect x="70" y="354" width="75" height="30" rx="6" fill="var(--blue-soft)" stroke="#3b82f6" strokeWidth="1" />
                <text x="107" y="374" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="500">Auth</text>
              </g>
              <g onClick={() => onNavigateService("user")} className="cursor-pointer">
                <rect x="155" y="354" width="75" height="30" rx="6" fill="var(--blue-soft)" stroke="#3b82f6" strokeWidth="1" />
                <text x="192" y="374" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="500">User</text>
              </g>
              <g onClick={() => onNavigateService("catalog")} className="cursor-pointer">
                <rect x="240" y="354" width="85" height="30" rx="6" fill="var(--blue-soft)" stroke="#3b82f6" strokeWidth="1" />
                <text x="282" y="374" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="500">Catalog</text>
              </g>
              <g onClick={() => onNavigateService("search")} className="cursor-pointer">
                <rect x="70" y="394" width="80" height="30" rx="6" fill="var(--blue-soft)" stroke="#3b82f6" strokeWidth="1" />
                <text x="110" y="414" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="500">Search</text>
              </g>
              <g onClick={() => onNavigateService("download")} className="cursor-pointer">
                <rect x="160" y="394" width="100" height="30" rx="6" fill="var(--blue-soft)" stroke="#3b82f6" strokeWidth="1" />
                <text x="210" y="414" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="500">Download</text>
              </g>
            </g>

            {/* Platform Services Group */}
            <g>
              <rect x="480" y="320" width="430" height="110" rx="12" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="5 3" />
              <text x="695" y="342" textAnchor="middle" fill="#8b5cf6" fontSize="11" fontWeight="700">PLATFORM SERVICES</text>
              <g onClick={() => onNavigateService("playback")} className="cursor-pointer">
                <rect x="500" y="354" width="80" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="540" y="374" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">Playback</text>
              </g>
              <g onClick={() => onNavigateService("billing")} className="cursor-pointer">
                <rect x="590" y="354" width="70" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="625" y="374" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">Billing</text>
              </g>
              <g onClick={() => onNavigateService("recommendation")} className="cursor-pointer">
                <rect x="670" y="354" width="65" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="702" y="374" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">Recs</text>
              </g>
              <g onClick={() => onNavigateService("drm")} className="cursor-pointer">
                <rect x="745" y="354" width="60" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="775" y="374" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">DRM</text>
              </g>
              <g onClick={() => onNavigateService("encoding")} className="cursor-pointer">
                <rect x="815" y="354" width="75" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="852" y="374" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">Encoding</text>
              </g>
              <g onClick={() => onNavigateService("concurrency")} className="cursor-pointer">
                <rect x="500" y="394" width="95" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="547" y="414" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">Concurrency</text>
              </g>
              <g onClick={() => onNavigateService("abtest")} className="cursor-pointer">
                <rect x="605" y="394" width="75" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="642" y="414" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">A/B Test</text>
              </g>
              <g onClick={() => onNavigateService("chaos")} className="cursor-pointer">
                <rect x="690" y="394" width="70" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="725" y="414" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">Chaos</text>
              </g>
              <g onClick={() => onNavigateService("notification")} className="cursor-pointer">
                <rect x="770" y="394" width="90" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="815" y="414" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">Notification</text>
              </g>
            </g>

            {/* Data Layer */}
            <g>
              <rect x="220" y="480" width="520" height="90" rx="12" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="5 3" />
              <text x="480" y="502" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="700">DATA LAYER</text>
              <g onClick={() => onNavigateService("kafka")} className="cursor-pointer">
                <rect x="240" y="512" width="80" height="30" rx="6" fill="#d1fae5" stroke="#10b981" strokeWidth="1" />
                <text x="280" y="532" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="500">Kafka</text>
              </g>
              <g onClick={() => onNavigateService("cassandra")} className="cursor-pointer">
                <rect x="335" y="512" width="90" height="30" rx="6" fill="#d1fae5" stroke="#10b981" strokeWidth="1" />
                <text x="380" y="532" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="500">Cassandra</text>
              </g>
              <g onClick={() => onNavigateService("mysql")} className="cursor-pointer">
                <rect x="440" y="512" width="75" height="30" rx="6" fill="#d1fae5" stroke="#10b981" strokeWidth="1" />
                <text x="477" y="532" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="500">MySQL</text>
              </g>
              <g onClick={() => onNavigateService("redis")} className="cursor-pointer">
                <rect x="530" y="512" width="70" height="30" rx="6" fill="#d1fae5" stroke="#10b981" strokeWidth="1" />
                <text x="565" y="532" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="500">Redis</text>
              </g>
              <g onClick={() => onNavigateService("evcache")} className="cursor-pointer">
                <rect x="615" y="512" width="80" height="30" rx="6" fill="#d1fae5" stroke="#10b981" strokeWidth="1" />
                <text x="655" y="532" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="500">EVCache</text>
              </g>
            </g>

            {/* Analytics Pipeline */}
            <g>
              <rect x="220" y="600" width="520" height="60" rx="12" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="5 3" />
              <text x="480" y="620" textAnchor="middle" fill="#8b5cf6" fontSize="11" fontWeight="700">ANALYTICS PIPELINE</text>
              <rect x="260" y="630" width="80" height="24" rx="5" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
              <text x="300" y="646" textAnchor="middle" fill="#6d28d9" fontSize="11">Flink</text>
              <text x="360" y="646" fill="var(--text-faint)" fontSize="14">&#8594;</text>
              <rect x="380" y="630" width="80" height="24" rx="5" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
              <text x="420" y="646" textAnchor="middle" fill="#6d28d9" fontSize="11">Spark</text>
              <text x="480" y="646" fill="var(--text-faint)" fontSize="14">&#8594;</text>
              <rect x="500" y="630" width="100" height="24" rx="5" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
              <text x="550" y="646" textAnchor="middle" fill="#6d28d9" fontSize="11">S3 Iceberg</text>
              <text x="620" y="646" fill="var(--text-faint)" fontSize="14">&#8594;</text>
              <rect x="640" y="630" width="80" height="24" rx="5" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
              <text x="680" y="646" textAnchor="middle" fill="#6d28d9" fontSize="11">Trino/ML</text>
            </g>
          </svg>
        </div>
        <p className="text-xs mt-3 text-center" style={{ color: "var(--text-faint)" }}>
          Click any node to navigate to its service details
        </p>
      </div>

      {/* Press Play Sequence */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>Press Play — Request Sequence</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>The most common opening question. Every step has a latency target or failure mode.</p>
        <div className="space-y-1">
          {[
            { step: "1", actor: "Client", action: "POST /playback/start  { titleId, episodeId, deviceId, drmScheme }", detail: "" },
            { step: "2", actor: "Route53 → ELB", action: "DNS resolves to nearest ELB. Health-checked every 10s.", detail: "~30s failover if region down" },
            { step: "3", actor: "Zuul2", action: "Validate JWT signature. Rate-limit check. Route to Playback Service.", detail: "1M+ req/s, async/non-blocking" },
            { step: "4", actor: "Playback Service", action: "Check billing entitlement (EVCache → Billing Service fallback).", detail: "Fail open if Billing unreachable" },
            { step: "5", actor: "Concurrency Service", action: "Atomic Lua: check count < limit, INCR, SADD sessionId. TTL=36s.", detail: "Redis, sub-ms, prevents >N streams" },
            { step: "6", actor: "Steering Service", action: "Rank OCAs by client IP proximity, title cached?, OCA load.", detail: "Returns ordered OCA list" },
            { step: "7", actor: "DRM Service", action: "Issue license token (signed, contains CEK encrypted for device TEE).", detail: "HSM operation, ~10ms" },
            { step: "8", actor: "Playback Service", action: "Generate signed HMAC-SHA256 manifest URL (6h TTL). Write resume position to Cassandra. Publish PLAY event to Kafka.", detail: "<300ms p99 total" },
            { step: "9", actor: "Client → OCA", action: "Client fetches DASH/HLS manifest from manifest URL. Downloads first segment from OCA directly.", detail: "API tier is now OUT of the hot path" },
            { step: "10", actor: "Client (every 30s)", action: "POST /playback/heartbeat { sessionId, positionMs, bitrateKbps }. Refreshes Redis TTL to 36s. Updates Cassandra position.", detail: "Crash = slot expires after 36s" },
          ].map(({ step, actor, action, detail }) => (
            <div key={step} className="flex gap-3 p-3 rounded-lg" style={{ background: step === "9" ? "var(--blue-soft)" : "var(--bg)", border: "1px solid var(--border)"  }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>{step}</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-xs font-bold" style={{ color: "var(--blue-text)" }}>{actor}</span>
                  <span className="text-xs font-mono" style={{ color: "var(--text)" }}>{action}</span>
                </div>
                {detail && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-faint)" }}>{detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scale Numbers — Interactive Derivation Cards */}
      <ScaleDerivationSection />

      {/* Critical Insight */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)"  }}
      >
        <h3 className="text-lg font-bold mb-2" style={{ color: "var(--blue-text)" }}>
          Critical Insight
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          95% of Netflix traffic is video bytes flowing directly between the Client and Open Connect
          Appliances (OCAs). The API tier handles only metadata and session setup. After the Playback
          Service returns a signed manifest URL, the API servers are completely out of the hot path.
          This is why Netflix can serve 100 Tbps of video with a relatively modest API fleet.
        </p>
      </div>

      {/* Playback Deep Dive */}
      <PlaybackDeepDive />

      {/* CDN / Open Connect */}
      <CDNSection />

      {/* Data Model callout */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)"  }}
      >
        <p className="text-sm" style={{ color: "var(--text)" }}>
          <strong style={{ color: "var(--blue-text)" }}>Data Model &amp; Access Patterns</strong> — detailed ERD, Cassandra CQL schemas, and per-table database rationale are in the{" "}
          <button
            onClick={() => onNavigateTab("apis-data-model" as never)}
            style={{ color: "var(--blue-text)", textDecoration: "underline", cursor: "pointer", background: "none", border: "none"  }}
          >
            Data Design tab
          </button>.
        </p>
      </div>
    </div>
  );
}

export { ArchitectureTab };
