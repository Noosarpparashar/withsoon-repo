"use client";

import { useState } from "react";
import { SayThisBlock, FollowUpsAccordion } from "./shared";
import type { TabSlug } from "./types";

/* ═══════════════════════════════════════════════════════════════
   ML & RECS TAB
   ═══════════════════════════════════════════════════════════════ */

const ML_RECS_DATA = {
  overview: {
    layers: [
      {
        name: "OFFLINE LAYER",
        latency: "hours to days",
        color: "#8b5cf6",
        steps: ["S3 Iceberg","Spark feature engineering","GPU training","Model registry"],
      },
      {
        name: "NEARLINE LAYER",
        latency: "minutes",
        color: "#3b82f6",
        steps: ["Kafka play/click events","Flink 1-min aggregates","Feature Store update","Recommendation API"],
      },
      {
        name: "ONLINE LAYER",
        latency: "milliseconds",
        color: "#10b981",
        steps: ["User opens app","Candidate generation (1M → 1K via ANN)","Feature fetch <5ms","Two-tower scoring","Ranker (top-1K → top-80)","Diversity filter","Artwork selection (UCB bandit)","Homepage response"],
      },
    ],
  },
  twoTower: {
    userTower: { inputs: ["profile_id","watch history","ratings","country","time"], output: "768d embedding" },
    contentTower: { inputs: ["title_id","genre","cast","synopsis","maturity"], output: "768d embedding" },
    scoring: "Score = user_emb · content_emb (dot product)",
    ann: "ANN index (FAISS/ScaNN) retrieves top-1,000 candidates",
    ranker: { label: "Second-stage ranker: gradient boosted tree", features: ["predicted play rate","completion pct","freshness","diversity penalty"] },
    sayThis: "The recommendation system has two stages. First, candidate generation: a two-tower model produces user and content embeddings, dot-product similarity retrieves top-1,000 from 36K+ titles using an ANN index. Second, ranking: a gradient boosted ranker re-scores the 1,000 candidates on play probability, completion, freshness, and a diversity penalty. The online layer must complete in under 150ms total — candidate gen is the bottleneck, which is why embeddings are pre-computed offline.",
  },
  coldStart: {
    newUser: {
      problem: "Zero watch history → embeddings meaningless",
      solutions: ["Onboarding survey: pick 3 genres + 3 known titles","Country + time-of-day rules (US, Sunday 9pm → trending drama)","Session implicit signals (search terms, browse)","After 3–5 watches → ML takes over","Exploration row: \"Popular in [Country]\""],
    },
    newTitle: {
      problem: "Zero impressions/clicks/watches for new title",
      solutions: ["Content-based features: genre, cast, synopsis embedding (content tower only)","\"New Arrival\" row bypasses ranker","Fast ramp: aggregate first 1K impressions → UCB bandit starts","Studio-provided metadata signals"],
    },
  },
  featureStore: {
    rows: [
      { label: "ONLINE FEATURES", latency: "<5ms", color: "#10b981", items: [{ store: "DynamoDB", data: "user_embedding 768d, content_embeddings" },{ store: "Redis", data: "recent watches (last 10), ratings" },{ store: "EVCache", data: "A/B variants, country" }] },
      { label: "OFFLINE FEATURES", latency: "batch", color: "#3b82f6", items: [{ store: "S3 Iceberg", data: "full watch history, engagement metrics" },{ store: "gold.user_features", data: "daily snapshots" },{ store: "gold.content_features", data: "title-level stats" }] },
    ],
    warning: { label: "TRAINING-SERVING SKEW", text: "The most common cause of model degradation. Online features must use EXACTLY the same computation as offline training features. Wrong: compute \"total watch minutes\" differently in training vs serving. Fix: shared feature library, version-controlled feature definitions." },
  },
  abTesting: {
    assignment: {
      formula: "hash(profile_id + experiment_id) % 100",
      bullets: ["Deterministic: user always sees same variant","No DB lookup on hot path: sub-microsecond","Cache in EVCache 24h to avoid recomputation"],
      exposure: "Async to Kafka: experiment.assignment.v3 → Flink aggregates CTR/play_rate per variant in real-time → Pinot serves experiment dashboard at <100ms",
    },
    kayenta: { traffic: "5%", triggers: ["CTR drops >5% vs baseline","p99 latency increases >20%","error rate increases >1%"], soak: "Full rollout after 24–72h soak" },
    sayThis: "Netflix runs hundreds of A/B experiments simultaneously. Assignment is deterministic: hash(profile_id + experiment_id) % 100 — no DB lookup required. Kayenta monitors canary metrics in real-time and auto-rolls back if CTR, latency, or error rate regresses beyond thresholds. The feedback loop is: A/B result → Kafka → Flink aggregation → Pinot dashboard → human decision → model retrain.",
  },
  metrics: [
    { name: "Play Rate", badge: "primary", badgeColor: "#3b82f6", desc: "% of impressions that result in a play.", detail: "Target: >X% (context-dependent)" },
    { name: "Completion Rate", badge: null as null, badgeColor: "#10b981", desc: "% of started plays where user watches >80%.", detail: "High completion = good rec quality" },
    { name: "Discovery Rate", badge: null as null, badgeColor: "#8b5cf6", desc: "% of plays from titles the user never played before.", detail: "Measures freshness/exploration" },
    { name: "Abandonment Rate", badge: null as null, badgeColor: "#f59e0b", desc: "% of plays stopped within first 2 min.", detail: "Low = good cold-start performance" },
    { name: "Diversity Score", badge: null as null, badgeColor: "#ec4899", desc: "Average pairwise distance between recommended titles.", detail: "Prevents filter bubbles" },
    { name: "Implicit Feedback", badge: null as null, badgeColor: "#ef4444", desc: "\"Thumbs up/down\" are rare.", detail: "Real signal = did they finish it? Did they re-watch? Did they browse away?" },
  ],
};

function MLRecsTab({ onNavigateTab: _onNavigateTab }: { onNavigateTab?: (tab: TabSlug) => void }) {
  const ML_SECTIONS = ["Overview","Two-Tower Model","Cold Start","Feature Store","A/B Testing & Feedback Loop","Metrics & Evaluation"];
  const [activeMLSection, setActiveMLSection] = useState("Overview");
  const d = ML_RECS_DATA;

  const scrollToML = (id: string) => {
    const el = document.getElementById("mlrecs-" + id.replace(/[^a-zA-Z0-9]/g, "-"));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveMLSection(id);
  };

  return (
    <div>
      <div className="sticky top-0 z-30 py-3" style={{ background: "var(--bg)" }}>
        <div className="flex gap-1 flex-wrap p-1.5 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
          {ML_SECTIONS.map((s) => (
            <button key={s} onClick={() => scrollToML(s)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ background: activeMLSection === s ? "var(--blue-text)" : "transparent", color: activeMLSection === s ? "#fff" : "var(--text-muted)", cursor: "pointer" }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-10 mt-6">
        {/* Overview: Three-Layer Architecture */}
        <section id="mlrecs-Overview" style={{ scrollMarginTop: "80px" }}>
          <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--text)" }}>Three-Layer Architecture</h2>
          <div className="space-y-4">
            {d.overview.layers.map((layer) => (
              <div key={layer.name} className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm font-bold tracking-wider" style={{ color: layer.color }}>{layer.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: layer.color + "22", color: layer.color, border: `1px solid ${layer.color}44` }}>{layer.latency}</span>
                </div>
                <div className="flex flex-col gap-0">
                  {layer.steps.map((step, i) => (
                    <div key={step} className="flex flex-col items-start">
                      <div className="px-4 py-2.5 rounded-lg text-sm font-medium w-full max-w-md" style={{ background: layer.color + "18", color: "var(--text)", border: `1px solid ${layer.color}33` }}>{step}</div>
                      {i < layer.steps.length - 1 && <div className="ml-5 my-0.5 text-sm font-bold" style={{ color: layer.color + "99" }}>↓</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Two-Tower Model */}
        <section id="mlrecs-Two-Tower-Model" style={{ scrollMarginTop: "80px" }}>
          <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--text)" }}>Two-Tower Model</h2>
          <div className="rounded-2xl p-6 mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
            <div className="flex flex-col sm:flex-row items-stretch gap-4 mb-6">
              <div className="flex-1 rounded-xl p-4" style={{ background: "#3b82f611", border: "1px solid #3b82f633"  }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#3b82f6" }}>User Tower</div>
                <div className="space-y-1.5 mb-4">{d.twoTower.userTower.inputs.map((inp) => <div key={inp} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)"  }}>{inp}</div>)}</div>
                <div className="text-xs font-bold px-3 py-2 rounded-lg text-center" style={{ background: "#3b82f6", color: "#fff" }}>→ {d.twoTower.userTower.output}</div>
              </div>
              <div className="flex items-center justify-center px-2 shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div className="text-2xl font-black" style={{ color: "#f59e0b" }}>·</div>
                  <div className="text-[10px] font-bold px-2 py-1 rounded-lg text-center" style={{ background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44"  }}>dot product</div>
                  <div className="text-2xl font-black" style={{ color: "#f59e0b" }}>·</div>
                </div>
              </div>
              <div className="flex-1 rounded-xl p-4" style={{ background: "#8b5cf611", border: "1px solid #8b5cf633"  }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#8b5cf6" }}>Content Tower</div>
                <div className="space-y-1.5 mb-4">{d.twoTower.contentTower.inputs.map((inp) => <div key={inp} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)"  }}>{inp}</div>)}</div>
                <div className="text-xs font-bold px-3 py-2 rounded-lg text-center" style={{ background: "#8b5cf6", color: "#fff" }}>→ {d.twoTower.contentTower.output}</div>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div className="rounded-lg px-4 py-3 text-sm font-mono" style={{ background: "var(--bg)", color: "#f59e0b", border: "1px solid var(--border)"  }}>{d.twoTower.scoring}</div>
              <div className="rounded-lg px-4 py-3 text-sm" style={{ color: "var(--text-muted)", background: "var(--bg)", border: "1px solid var(--border)"  }}>{d.twoTower.ann}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#10b98111", border: "1px solid #10b98133"  }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#10b981" }}>{d.twoTower.ranker.label}</div>
              <div className="flex flex-wrap gap-2">{d.twoTower.ranker.features.map((f) => <span key={f} className="text-xs px-2.5 py-1 rounded-full" style={{ background: "#10b98122", color: "#10b981", border: "1px solid #10b98144"  }}>{f}</span>)}</div>
            </div>
          </div>
          <SayThisBlock text={d.twoTower.sayThis} />
        </section>

        {/* Cold Start */}
        <section id="mlrecs-Cold-Start" style={{ scrollMarginTop: "80px" }}>
          <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--text)" }}>Cold Start</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[{ data: d.coldStart.newUser, label: "New User", color: "#3b82f6" }, { data: d.coldStart.newTitle, label: "New Title", color: "#8b5cf6" }].map(({ data: cs, label, color }) => (
              <div key={label} className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold" style={{ color }}>{label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: color + "22", color, border: `1px solid ${color}33` }}>cold start</span>
                </div>
                <div className="text-xs px-3 py-2 rounded-lg mb-4" style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444433"  }}>Problem: {cs.problem}</div>
                <div className="space-y-2">
                  {cs.solutions.map((sol, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <span className="text-xs font-bold shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: color + "22", color }}>{i + 1}</span>
                      <span className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{sol}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Store */}
        <section id="mlrecs-Feature-Store" style={{ scrollMarginTop: "80px" }}>
          <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--text)" }}>Feature Store</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)"  }}>
            {d.featureStore.rows.map((row, ri) => (
              <div key={row.label} className="p-5" style={{ background: ri % 2 === 0 ? "var(--bg-card)" : "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: row.color }}>{row.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: row.color + "22", color: row.color, border: `1px solid ${row.color}44` }}>{row.latency}</span>
                </div>
                <div className="space-y-2">
                  {row.items.map((item) => (
                    <div key={item.store} className="flex gap-3 items-start">
                      <span className="text-xs font-bold shrink-0 px-2 py-1 rounded" style={{ background: row.color + "18", color: row.color, minWidth: "120px" }}>{item.store}</span>
                      <span className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.data}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="p-5" style={{ background: "#f59e0b11", borderTop: "2px solid #f59e0b55" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#f59e0b" }}>⚠ Warning — {d.featureStore.warning.label}</div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{d.featureStore.warning.text}</p>
            </div>
          </div>
        </section>

        {/* A/B Testing */}
        <section id="mlrecs-A-B-Testing---Feedback-Loop" style={{ scrollMarginTop: "80px" }}>
          <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--text)" }}>A/B Testing &amp; Feedback Loop</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Experiment Assignment</h3>
              <pre className="text-xs leading-relaxed overflow-x-auto p-4 rounded-lg font-mono whitespace-pre mb-4" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)"  }}>{d.abTesting.assignment.formula}</pre>
              <div className="space-y-2 mb-4">{d.abTesting.assignment.bullets.map((b, i) => <div key={i} className="flex gap-2 items-start"><span className="shrink-0 mt-1" style={{ color: "#3b82f6" }}>▸</span><span className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{b}</span></div>)}</div>
              <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Exposure Logging</div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{d.abTesting.assignment.exposure}</p>
              </div>
            </div>
            <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Kayenta Canary</h3>
              <div className="rounded-lg px-4 py-2.5 mb-4 text-sm font-medium" style={{ background: "#10b98122", color: "#10b981", border: "1px solid #10b98133"  }}>Canary gets {d.abTesting.kayenta.traffic} of traffic</div>
              <div className="mb-3">
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#ef4444" }}>Auto-rollback triggers</div>
                <div className="space-y-2">{d.abTesting.kayenta.triggers.map((t, i) => <div key={i} className="flex gap-2 items-start"><span className="shrink-0 mt-0.5" style={{ color: "#ef4444" }}>✕</span><span className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{t}</span></div>)}</div>
              </div>
              <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: "#3b82f611", color: "#3b82f6", border: "1px solid #3b82f633"  }}>{d.abTesting.kayenta.soak}</div>
            </div>
          </div>
          <SayThisBlock text={d.abTesting.sayThis} />
        </section>

        {/* Metrics */}
        <section id="mlrecs-Metrics---Evaluation" style={{ scrollMarginTop: "80px" }}>
          <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--text)" }}>Metrics &amp; Evaluation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {d.metrics.map((metric) => (
              <div key={metric.name} className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{metric.name}</span>
                  {metric.badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: metric.badgeColor + "22", color: metric.badgeColor, border: `1px solid ${metric.badgeColor}44` }}>{metric.badge}</span>}
                </div>
                <div className="w-8 h-0.5 rounded-full mb-3" style={{ background: metric.badgeColor }} />
                <p className="text-sm leading-relaxed mb-1" style={{ color: "var(--text)" }}>{metric.desc}</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FAILURES & TRADEOFFS TAB
   ═══════════════════════════════════════════════════════════════ */

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

export { MLRecsTab };
