"use client";

import { useState } from "react";
import { SayThisBlock } from "./shared";
import type { TabSlug } from "@/components/ui/NetflixPage";

const ASSUMPTIONS = [
  { label: "Registered users", value: "300M", variable: true },
  { label: "Monthly active users (MAU)", value: "200M", variable: false },
  { label: "Daily active users (DAU)", value: "100M", variable: false },
  { label: "Peak concurrent streams", value: "60M", variable: true },
  { label: "Average video bitrate", value: "5 Mbps", variable: true },
  { label: "Heartbeat interval", value: "30 sec", variable: false },
  { label: "Average event size (compressed)", value: "2 KB", variable: false },
  { label: "Peak total events/sec", value: "15M/sec", variable: false },
  { label: "Event compression ratio (lake)", value: "3:1 – 5:1", variable: false },
  { label: "Average watch session duration", value: "45 min", variable: false },
];

const DERIVED = [
  {
    label: "CDN Bandwidth (peak)",
    formula: "60M streams × 5 Mbps = 300M Mbps",
    result: "≈ 300 Tbps",
    color: "#f59e0b",
    why: "Video traffic completely dominates. Backend APIs must NEVER serve video bytes. This single number justifies the entire Open Connect / OCA architecture.",
    mattersInInterview: true,
  },
  {
    label: "Heartbeat events/sec",
    formula: "60M streams ÷ 30 sec = 2M events/sec",
    result: "2M/sec",
    color: "#3b82f6",
    why: "Heartbeats update playback position and renew stream concurrency slots. They must be async and non-blocking — never on the video playback critical path.",
    mattersInInterview: true,
  },
  {
    label: "Total events/sec (peak)",
    formula: "Play + heartbeat + impression + click + search + error ≈ 15M/sec",
    result: "15M/sec",
    color: "#8b5cf6",
    why: "This drives Kafka partition sizing. At 15M events/sec × 2KB each = 30 GB/sec raw ingest. Kafka fronting cluster needs ~30K partitions if each handles 1MB/sec.",
    mattersInInterview: true,
  },
  {
    label: "Raw event lake volume/day",
    formula: "30 GB/sec × 86,400 sec = 2.59 PB/day raw",
    result: "~500 TB/day compressed",
    color: "#10b981",
    why: "With 5:1 compression and deduplication, curated daily lake is ~500TB. Use event_date partitioning in Iceberg to keep query costs manageable.",
    mattersInInterview: false,
  },
  {
    label: "Watch history writes/day",
    formula: "100M DAU × 50 heartbeat writes × 30 bytes = 150 GB/day",
    result: "~5B writes/day",
    color: "#ec4899",
    why: "Each write is tiny but volume is huge. Cassandra keyed by (profile_id, title_id) handles this well. Only latest position per title matters for resume — not every write.",
    mattersInInterview: true,
  },
  {
    label: "Playback session starts/sec",
    formula: "60M peak streams ÷ 2700s avg session = 22K starts/sec",
    result: "~22K/sec",
    color: "#06b6d4",
    why: "Each start hits playback service, entitlement cache, concurrency check, and DRM. Must complete in <300ms P99. Scale API fleet horizontally.",
    mattersInInterview: true,
  },
  {
    label: "Catalog reads/sec (homepage)",
    formula: "100M DAU × 10 page loads/day ÷ 86,400 = ~11.5K RPS",
    result: "~12K RPS",
    color: "#f97316",
    why: "Cache this aggressively. Title metadata rarely changes. EVCache / Redis TTL of 5 minutes is safe. Catalog service itself sees <1% of this after cache warm.",
    mattersInInterview: false,
  },
  {
    label: "Kafka partition estimate",
    formula: "30 GB/sec ÷ 1 MB/sec per partition = 30,000 partitions",
    result: "~30K partitions",
    color: "#6d28d9",
    why: "In practice Netflix uses a fronting cluster (high-throughput) → consumer clusters per domain. Partitioning by profile_id or session_id keeps related events co-located.",
    mattersInInterview: false,
  },
];

const STORAGE_ESTIMATES = [
  { store: "Cassandra (watch history)", sizing: "5B writes/day × 30 bytes × 90-day TTL ≈ 13.5 TB", notes: "RF=3 → 40TB total. Partition by profile_id." },
  { store: "Redis / EVCache (entitlement)", sizing: "300M accounts × 200 bytes = 60 GB", notes: "Fits in memory. TTL = 1 hour. Warm hit rate >99%." },
  { store: "Redis (concurrency slots)", sizing: "60M active slots × 100 bytes = 6 GB", notes: "Tiny. Lua script for atomic INCR. TTL = 36 sec per slot." },
  { store: "S3 raw event lake", sizing: "~500 TB/day compressed × 90 days = 45 PB", notes: "Iceberg partitioned by event_date, event_hour." },
  { store: "Elasticsearch (search index)", sizing: "300M titles × 5 KB per doc = 1.5 TB", notes: "Replicated × 2 = 3 TB. Refresh every few minutes." },
  { store: "Object storage (encoded video)", sizing: "10K titles × 100 variants × 2 GB avg = 2 PB", notes: "Stored in S3, replicated to OCA edges." },
];

export function ScaleTab({ onNavigateTab }: { onNavigateTab?: (tab: TabSlug) => void }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="space-y-8 pb-10">
      {/* Warning callout */}
      <div className="rounded-2xl p-5" style={{ background: "#fef3c7", border: "1px solid #f59e0b" }}>
        <p className="text-sm font-semibold" style={{ color: "#92400e" }}>
          Do not memorize exact Netflix production numbers. Use "assume for interview sizing" framing. The formula and reasoning matter far more than the precise figure.
        </p>
      </div>

      {/* Assumptions */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Assumptions</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>State these upfront in the interview. They drive all derived calculations.</p>
        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Assumption</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Value</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Adjustable?</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {ASSUMPTIONS.map((a, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg)" : "var(--bg-card)" }}>
                  <td className="px-4 py-3" style={{ color: "var(--text)" }}>{a.label}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: "#3b82f6" }}>{a.value}</td>
                  <td className="px-4 py-3 text-center text-xs" style={{ color: a.variable ? "#10b981" : "var(--text-faint)" }}>
                    {a.variable ? "Yes — state your choice" : "Derived"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Derived Metrics */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Derived Calculations</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Click each metric to see the formula and what to say in the interview.</p>
        <div className="space-y-2">
          {DERIVED.map((d, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isOpen ? d.color + "80" : "var(--border)"}` }}>
                <button
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors"
                  style={{ background: isOpen ? `${d.color}0d` : "var(--bg)", cursor: "pointer", border: "none" }}
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{d.label}</span>
                    {d.mattersInInterview && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ background: "#dcfce7", color: "#166534" }}>Key metric</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-mono font-bold" style={{ color: d.color }}>{d.result}</span>
                    <span className="text-xs transition-transform duration-200" style={{ color: "var(--text-faint)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${d.color}30`, background: "var(--bg-card)" }}>
                    <div className="pt-3 font-mono text-sm px-3 py-2 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: d.color }}>
                      {d.formula} = <strong>{d.result}</strong>
                    </div>
                    <div className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      <span className="font-semibold" style={{ color: "var(--text)" }}>Why this matters: </span>{d.why}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Storage Estimates */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Storage Sizing</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Back-of-envelope per storage tier. Interviewers often probe on Cassandra and Redis sizing.</p>
        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Store</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Sizing</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {STORAGE_ESTIMATES.map((s, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg)" : "var(--bg-card)" }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--text)" }}>{s.store}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#3b82f6" }}>{s.sizing}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{s.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key insight callout */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "4px solid #f59e0b" }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: "#f59e0b" }}>Why CDN Dominates Bandwidth</h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          300 Tbps of video traffic dwarfs everything else. API traffic (playback sessions, heartbeats, catalog reads) is in the tens of Gbps range — 10,000× smaller. This asymmetry is <em>the</em> reason Netflix built Open Connect. API servers authorize playback; OCA edge nodes serve the actual bytes.
        </p>
      </div>

      <SayThisBlock text="I'll assume 300M registered users, 100M DAU, 60M peak concurrent streams, 5 Mbps average bitrate. That gives 300 Tbps of CDN bandwidth — which immediately tells you why the backend never serves video bytes. Heartbeats generate 2M events/sec; the full event pipeline peaks at 15M/sec driving ~500TB/day of compressed lake data. Watch history is ~5B Cassandra writes/day, which Cassandra handles easily partitioned by profile_id." />

      {onNavigateTab && (
        <button
          onClick={() => onNavigateTab("architecture-map" as never)}
          className="w-full py-4 rounded-2xl text-sm font-semibold transition-colors"
          style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--border)", cursor: "pointer" }}
        >
          Next: Full Architecture →
        </button>
      )}
    </div>
  );
}
