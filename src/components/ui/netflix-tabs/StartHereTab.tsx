"use client";

import { useState } from "react";

import type { TabSlug } from "@/components/ui/NetflixPage";

function StartHereTab({ onNavigateTab }: { onNavigateTab: (tab: TabSlug) => void }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [openClarifyIdx, setOpenClarifyIdx] = useState<number | null>(null);
  const [openScaleIdx, setOpenScaleIdx] = useState<number | null>(null);
  const [checkedReqs, setCheckedReqs] = useState<Set<number>>(new Set());

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const toggleReq = (i: number) => {
    setCheckedReqs(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const scopeCards = [
    { icon: "📺", title: "Playback System", focus: "Latency, DRM, heartbeat, concurrency, manifest URL", level: "Backend / Mid" },
    { icon: "📡", title: "CDN / Open Connect", focus: "Bandwidth, OCA hierarchy, fill algorithm, ISP peering", level: "Infra / CDN" },
    { icon: "🔎", title: "Search & Catalog", focus: "Indexing, ranking, autocomplete, BM25 + kNN", level: "Backend" },
    { icon: "🎬", title: "Encoding Pipeline", focus: "Transcoding, VMAF, per-title encoding, DRM encrypt, CMAF", level: "Infra / Encoding" },
    { icon: "📊", title: "Data Pipeline", focus: "Kafka, Flink, Spark, Iceberg, Bronze/Silver/Gold", level: "Data Eng" },
    { icon: "🤖", title: "Recommendation System", focus: "Two-tower model, cold start, feature store, UCB bandit", level: "ML Eng" },
    { icon: "📋", title: "Watch History / Resume", focus: "Cassandra access patterns, eventual consistency, heartbeat writes", level: "Data Eng" },
    { icon: "🌐", title: "Complete Platform", focus: "All of the above — breadth + judgment + cost reasoning", level: "Principal / Staff" },
  ];

  const clarifyCards = [
    {
      q: "Are we designing the complete platform, or one specific area?",
      why: "Determines breadth vs depth. Full-platform needs a different time budget than a CDN deep-dive.",
      answers: [
        { cond: "Complete platform", impact: "Cover 8 components at 5–8 min each. Prioritize breadth, go deep only when asked." },
        { cond: "Playback only", impact: "Spend 30 min on playback + CDN control plane + OCA. Cover concurrency and DRM deeply." },
        { cond: "Data pipeline", impact: "Focus on Kafka, Flink, lake zones, serving. Mention online vs offline vs nearline." },
      ],
    },
    {
      q: "Should I include content ingestion and encoding?",
      why: "Encoding pipeline is a separate system — easy to accidentally skip or overinvest in.",
      answers: [
        { cond: "Yes", impact: "Cover studio upload → shot detection → per-title encode → VMAF → DRM → CMAF → OCA fill." },
        { cond: "No", impact: "Skip encoding. Focus on playback, CDN, data platform." },
      ],
    },
    {
      q: "Is multi-region global scale in scope?",
      why: "Multi-region changes your database choices, replication strategy, and failover story.",
      answers: [
        { cond: "Yes", impact: "Cover Route53 failover, Cassandra multi-DC topology, Kafka MirrorMaker2, active-active AWS regions." },
        { cond: "Single region", impact: "Simplify to Multi-AZ. Focus on AZ failover instead." },
      ],
    },
    {
      q: "Are offline downloads in scope?",
      why: "Downloads involve DRM device binding, expiry rules, and a separate download DB — non-trivial.",
      answers: [
        { cond: "Yes", impact: "Cover DRM device-bound license, 30d/48h expiry rules, Cassandra downloads table." },
        { cond: "No", impact: "Note that offline mode exists but skip the detail." },
      ],
    },
    {
      q: "What does the interviewer care most about?",
      why: "Goes deep on what the interviewer wants to evaluate — don't spend 30 min on what they don't care about.",
      answers: [
        { cond: "Latency / playback", impact: "Deep dive: P99 budget, each hop, fail-open patterns, OCA control plane." },
        { cond: "Data modeling", impact: "Deep dive: Cassandra partition keys, access patterns, MySQL vs NoSQL rationale." },
        { cond: "Data pipeline / ML", impact: "Deep dive: Kafka partitioning, Flink dedup, lake zones, feature store." },
        { cond: "Reliability / SRE", impact: "Deep dive: failure modes, circuit breakers, Chaos Kong, multi-region failover." },
      ],
    },
  ];

  const funcReqs = [
    { text: "User signup, login, multi-profile (up to 5)", priority: "Must Have", interview: true },
    { text: "Browse catalog, search titles", priority: "Must Have", interview: false },
    { text: "Play video with DRM protection", priority: "Must Have", interview: true },
    { text: "Pause / resume / continue watching across devices", priority: "Must Have", interview: true },
    { text: "Watch history per profile", priority: "Must Have", interview: false },
    { text: "Recommendations / personalized homepage rows", priority: "Must Have", interview: true },
    { text: "Subscription validation + billing", priority: "Must Have", interview: true },
    { text: "Multi-device + concurrent stream limits", priority: "Must Have", interview: true },
    { text: "Subtitles, audio tracks, multiple languages", priority: "Must Have", interview: false },
    { text: "Offline download (DRM-encrypted)", priority: "Good to Have", interview: false },
    { text: "Parental controls / maturity ratings", priority: "Good to Have", interview: false },
    { text: "Notifications (new episode, payment failed)", priority: "Good to Have", interview: false },
    { text: "Ratings / thumbs up / thumbs down", priority: "Good to Have", interview: false },
    { text: "Multi-region globally (190+ countries)", priority: "Must Have", interview: true },
  ];

  const nfrCards = [
    { label: "Playback Latency", detail: "Play button → first frame < 2s", note: "Top interviewer follow-up", color: "#3b82f6" },
    { label: "Availability", detail: "99.99% uptime for playback path", note: "Mention active-active multi-region", color: "#10b981" },
    { label: "Consistency", detail: "Eventual for watch history; strong for billing/concurrency", note: "Key tradeoff question", color: "#8b5cf6" },
    { label: "CDN Hit Ratio", detail: ">99% for popular content via proactive OCA fill", note: "Explain nightly fill algorithm", color: "#f59e0b" },
    { label: "Data Privacy / GDPR", detail: "PII tokenization in pipeline; right-to-erasure in Iceberg", note: "Data Eng interview favorite", color: "#ec4899" },
    { label: "Cost Efficiency", detail: "95% bandwidth = video bytes. CDN is #1 cost driver.", note: "Principal level signal", color: "#06b6d4" },
  ];

  const scaleDerivations = [
    {
      label: "CDN Bandwidth",
      result: "300 Tbps",
      formula: "60M concurrent streams × 5 Mbps avg bitrate",
      why: "This is why Netflix built its own CDN. Commercial CDN pricing at this scale = hundreds of millions/year.",
    },
    {
      label: "Heartbeat Events/sec",
      result: "2M/sec",
      formula: "60M concurrent streams ÷ 30s heartbeat interval",
      why: "Drives Cassandra write throughput requirement. Cannot use MySQL at 2M writes/sec.",
    },
    {
      label: "Peak Event Ingest",
      result: "~40 GB/s",
      formula: "15M events/s × 2KB avg event size × all event types",
      why: "Drives Kafka broker count: 40 GB/s × RF3 ÷ 200 MB/s/broker ≈ 720 brokers.",
    },
    {
      label: "Daily Data Lake",
      result: "~1.5 PB/day",
      formula: "40 GB/s × 86,400s × 0.45 (zstd compression)",
      why: "Bronze zone S3 storage cost at this scale requires Iceberg compaction and tiered retention (90d → expire).",
    },
    {
      label: "Kafka Brokers",
      result: "~720 brokers",
      formula: "40 GB/s × RF3 = 120 GB/s ÷ 200 MB/s/broker = 600 + 20% headroom",
      why: "Spread across ~40 clusters split by region × domain × criticality.",
    },
    {
      label: "Flink vCPUs",
      result: "~3,000 vCPUs",
      formula: "15M events/s ÷ 5K events/vCPU (enrichment + dedup + session)",
      why: "State is ~20 TB (RocksDB on NVMe), checkpointed to S3 every 5 min.",
    },
    {
      label: "Cassandra Nodes (watch history)",
      result: "~10,000 nodes",
      formula: "2M writes/sec ÷ ~200 writes/sec/node capacity",
      why: "Linear horizontal scaling — add nodes, throughput scales proportionally. No sharding complexity.",
    },
    {
      label: "Encoding Variants / Title",
      result: "1,200+",
      formula: "6 resolutions × 3 bitrates × 3 DRM systems × audio variants × subtitle tracks × HDR variants",
      why: "Each title must serve every device type, DRM, language, and quality tier. Per-title encoding optimizes bitrates per complexity.",
    },
  ];

  const openingScript = `Before I start, I want to confirm the scope. "Design Netflix" could mean designing the playback and CDN system, the data pipeline and analytics platform, the recommendation system, or the complete end-to-end platform.

I'll assume the complete platform unless you'd like to narrow it. I'll cover:
user management, catalog, search, playback, CDN, encoding, billing, recommendations, watch history, event pipeline, data lake, and ML feedback loops.

Where would you like me to go deep first?`;

  const fiveMinScript = `MINUTE 0–1 — CLARIFY
"Before I dive in: are we designing the full platform, or a specific subsystem? I want to make sure I focus where it's most valuable for you."

MINUTE 1–2 — REQUIREMENTS
"I'll assume these core requirements: auth, browse, play with DRM, resume across devices, recommendations, billing, and multi-device concurrency limits. Non-functional: <2s playback start, 99.99% availability, eventual consistency for watch history, strong consistency for billing."

MINUTE 2–3 — SCALE
"Let me derive the scale: 300M users, 60M concurrent streams × 5 Mbps = 300 Tbps video bandwidth. 60M streams ÷ 30s heartbeat interval = 2M writes/sec to Cassandra. 15M events/sec peak through Kafka."

MINUTE 3–5 — HIGH-LEVEL ARCHITECTURE
"The architecture has two planes. Online serving plane: Client → Zuul2 → Playback/Auth/Billing → Cassandra/Redis/EVCache. Video data plane: Client → OCA directly — 95% of traffic never touches API servers after manifest delivery. Data platform: Client events → Kafka → Flink → S3 Iceberg → Spark → ML → Recs."`;

  return (
    <div className="space-y-10">

      {/* ── HERO ── */}
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #e50914, #f59e0b, #8b5cf6)" }} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>"Design Netflix" is not one interview</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>It is 8 different interviews wearing the same name. Start by picking your scope.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>8 tabs</span>
            <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>60 Q&As</span>
            <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>22 services</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
          {[
            ["300M", "subscribers"],
            ["60M", "concurrent streams"],
            ["300 Tbps", "video bandwidth"],
            ["15M/s", "peak events"],
          ].map(([val, label]) => (
            <div key={label} className="text-center p-3 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
              <div className="text-xl font-black font-mono" style={{ color: "var(--blue-text)" }}>{val}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SCOPE DISAMBIGUATION ── */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>Step 1 — What is the interviewer actually asking?</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Click the scope you&apos;re preparing for — each links to the relevant tab.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {scopeCards.map((card) => (
            <div
              key={card.title}
              className="p-4 rounded-xl cursor-pointer transition-colors duration-150"
              style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}
            >
              <div className="text-2xl mb-2">{card.icon}</div>
              <div className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>{card.title}</div>
              <div className="text-xs leading-relaxed mb-2" style={{ color: "var(--text-muted)" }}>{card.focus}</div>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>{card.level}</span>
            </div>
          ))}
        </div>

        {/* Seniority callout */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { level: "Mid-level", text: "Design playback + CDN. Show control plane vs data plane split." },
            { level: "Senior", text: "Playback + data pipeline + watch history. Show DB tradeoffs and event-driven architecture." },
            { level: "Principal", text: "Complete platform. Show cost reasoning, failure modes, and org/team implications." },
          ].map(({ level, text }) => (
            <div key={level} className="p-4 rounded-xl" style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)"  }}>
              <div className="text-xs font-bold mb-1" style={{ color: "var(--blue-text)" }}>⚡ {level}</div>
              <div className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>{text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CLARIFYING QUESTIONS ── */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>Step 2 — Clarifying questions to ask first</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Ask these before drawing anything. Each answer changes your design.</p>
        <div className="space-y-2">
          {clarifyCards.map((card, i) => (
            <div key={i} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)"  }}>
              <div
                className="flex items-start gap-3 p-4 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setOpenClarifyIdx(openClarifyIdx === i ? null : i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setOpenClarifyIdx(openClarifyIdx === i ? null : i)}
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>Q</span>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{card.q}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>{card.why}</div>
                </div>
                <span className="text-xs transition-transform duration-200 shrink-0" style={{ color: "var(--text-muted)", display: "inline-block", transform: openClarifyIdx === i ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
              </div>
              {openClarifyIdx === i && (
                <div className="px-4 pb-4 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                  {card.answers.map((ans, j) => (
                    <div key={j} className="flex gap-3 pt-2">
                      <span className="text-xs font-bold shrink-0 mt-0.5" style={{ color: "var(--blue-text)" }}>If &quot;{ans.cond}&quot;</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>→ {ans.impact}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── OPENING SCRIPT ── */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>Step 3 — Say this to open the interview</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Copy and practise this verbatim. It signals scope awareness before you draw a single box.</p>
        <div className="relative rounded-xl overflow-hidden" style={{ background: "#1a1b26" }}>
          <button
            onClick={() => copy(openingScript, 0)}
            className="absolute top-2 right-3 px-3 py-1 rounded text-[11px] font-medium transition-colors z-10"
            style={{ background: copiedIdx === 0 ? "#22c55e" : "#2a2b3d", color: copiedIdx === 0 ? "#fff" : "#a9b1d6" }}
          >
            {copiedIdx === 0 ? "Copied!" : "Copy"}
          </button>
          <pre className="p-4 pt-5 overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap"><code style={{ color: "#a9b1d6" }}>{openingScript}</code></pre>
        </div>
      </div>

      {/* ── REQUIREMENTS ── */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>Step 4 — Requirements</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Check off as you state them. Items marked ★ are what interviewers probe most.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          {funcReqs.map((req, i) => (
            <div
              key={i}
              onClick={() => toggleReq(i)}
              className="flex items-start gap-2.5 p-3 rounded-lg cursor-pointer transition-all"
              style={{
                background: checkedReqs.has(i) ? "var(--blue-soft)" : "var(--bg)",
                border: `1px solid ${checkedReqs.has(i) ? "var(--blue-text)" : "var(--border)"}`,
              }}
            >
              <span className="mt-0.5 text-sm shrink-0">{checkedReqs.has(i) ? "☑" : "☐"}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs" style={{ color: "var(--text)" }}>{req.text}</span>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: req.priority === "Must Have" ? "#fee2e2" : "#fef3c7", color: req.priority === "Must Have" ? "#b91c1c" : "#92400e" }}>
                    {req.priority}
                  </span>
                  {req.interview && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>★ Interview Priority</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Non-Functional Requirements</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {nfrCards.map((nfr) => (
            <div key={nfr.label} className="p-4 rounded-xl" style={{ background: "var(--bg)", border: `1px solid ${nfr.color}30`, borderLeft: `3px solid ${nfr.color}` }}>
              <div className="text-sm font-bold mb-1" style={{ color: nfr.color }}>{nfr.label}</div>
              <div className="text-xs leading-relaxed mb-2" style={{ color: "var(--text)" }}>{nfr.detail}</div>
              <div className="text-[10px]" style={{ color: "var(--text-faint)" }}>★ {nfr.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SCALE DERIVATION ── */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>Step 5 — Scale estimation (derive, never dump)</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Show the formula, then the result. Interviewers care about reasoning, not memorised numbers. Click any card to expand.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {scaleDerivations.map((item, i) => (
            <div key={i}>
              <div
                onClick={() => setOpenScaleIdx(openScaleIdx === i ? null : i)}
                className="p-4 rounded-xl cursor-pointer hover:opacity-90"
                style={{ background: "var(--bg)", border: `1px solid var(--border)`, borderTop: "3px solid var(--blue-text)"  }}
              >
                <div className="text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>{item.label}</div>
                <div className="text-xl font-black font-mono mb-2" style={{ color: "var(--blue-text)" }}>{item.result}</div>
                <div className="text-[11px] font-mono" style={{ color: "var(--text-faint)" }}>{item.formula}</div>
              </div>
              {openScaleIdx === i && (
                <div className="mt-1 p-3 rounded-lg text-xs leading-relaxed" style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)", color: "var(--text)"  }}>
                  {item.why}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl overflow-hidden" style={{ background: "#1a1b26" }}>
          <button
            onClick={() => copy(`Assumptions:
300M subscribers, 60M concurrent streams
5 Mbps avg bitrate, 30s heartbeat interval
15M events/sec peak, 2KB avg event size

Derived:
60M × 5 Mbps = 300 Tbps CDN bandwidth
60M ÷ 30s = 2M heartbeat writes/sec → Cassandra
15M × 2KB × all events ≈ 40 GB/s → Kafka
40 GB/s × 86,400s × 0.45 = 1.5 PB/day → S3 Iceberg
40 GB/s × RF3 ÷ 200 MB/s = ~720 Kafka brokers
15M ÷ 5K events/vCPU = ~3,000 Flink vCPUs`, 1)}
            className="block ml-auto mr-3 mt-2 px-3 py-1 rounded text-[11px] font-medium transition-colors"
            style={{ background: copiedIdx === 1 ? "#22c55e" : "#2a2b3d", color: copiedIdx === 1 ? "#fff" : "#a9b1d6" }}
          >
            {copiedIdx === 1 ? "Copied!" : "Copy all numbers"}
          </button>
          <pre className="px-4 pb-4 overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap"><code style={{ color: "#a9b1d6" }}>{`Assumptions:
300M subscribers, 60M concurrent streams
5 Mbps avg bitrate, 30s heartbeat interval
15M events/sec peak, 2KB avg event size

Derived:
60M × 5 Mbps       = 300 Tbps  CDN bandwidth
60M ÷ 30s          = 2M/sec    heartbeat writes → Cassandra
15M × 2KB (all)    ≈ 40 GB/s   peak ingest → Kafka
40 GB/s × 86,400s × 0.45 = 1.5 PB/day → S3 Iceberg
40 GB/s × RF3 ÷ 200 MB/s  = ~720 Kafka brokers
15M ÷ 5K events/vCPU      = ~3,000 Flink vCPUs`}</code></pre>
        </div>
      </div>

      {/* ── 5-MINUTE OPENING SCRIPT ── */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>Step 6 — Full 5-minute opening guide</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>The first 5 minutes are the most important. This is what they should sound like.</p>
        <div className="space-y-2">
          {fiveMinScript.split("\n\n").map((block, i) => {
            const lines = block.split("\n");
            const header = lines[0];
            const body = lines.slice(1).join("\n");
            return (
              <div key={i} className="flex gap-3 p-4 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>{i + 1}</span>
                <div>
                  <div className="text-xs font-bold mb-1" style={{ color: "var(--blue-text)" }}>{header}</div>
                  <div className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>{body}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => onNavigateTab("architecture")}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
            style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--blue-text)", cursor: "pointer"  }}
          >
            Next: Architecture →
          </button>
          <button
            onClick={() => onNavigateTab("interview-qa")}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
            style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer"  }}
          >
            Jump to Q&A →
          </button>
        </div>
      </div>

    </div>
  );
}

export { StartHereTab };
