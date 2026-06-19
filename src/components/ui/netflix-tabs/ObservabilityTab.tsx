"use client";

import { SayThisBlock } from "./shared";
import type { TabSlug } from "@/components/ui/NetflixPage";

const KEY_METRICS = [
  { metric: "Playback Start Time", p50: "<500ms", p95: "<1.5s", p99: "<2s", category: "QoE", alert: ">2s P99 for >0.1% of sessions" },
  { metric: "Playback Start Failure Rate", p50: "—", p95: "—", p99: "—", category: "QoE", alert: ">0.5% failure rate in any region" },
  { metric: "Rebuffering Ratio", p50: "<0.1%", p95: "<0.5%", p99: "<1%", category: "QoE", alert: ">1% rebuffering in any ISP/region" },
  { metric: "Average Bitrate", p50: ">4 Mbps", p95: "—", p99: "—", category: "QoE", alert: "Avg bitrate drops <1 Mbps in region" },
  { metric: "CDN Cache Hit Ratio", p50: ">99%", p95: "—", p99: "—", category: "CDN", alert: "<95% hit rate for top-200 titles" },
  { metric: "CDN Error Rate", p50: "<0.01%", p95: "—", p99: "—", category: "CDN", alert: ">0.1% 5xx error rate from any OCA cluster" },
  { metric: "API Latency (p50/p95/p99)", p50: "<20ms", p95: "<100ms", p99: "<300ms", category: "API", alert: ">300ms P99 on /playback/session" },
  { metric: "Entitlement Cache Hit Rate", p50: ">99%", p95: "—", p99: "—", category: "API", alert: "<95% hit rate (Cassandra surge risk)" },
  { metric: "Recommendation Latency", p50: "<50ms", p95: "<200ms", p99: "<500ms", category: "ML", alert: ">500ms P99 → trigger precomputed fallback" },
  { metric: "Kafka Ingestion Rate", p50: "—", p95: "—", p99: "—", category: "Pipeline", alert: "Events/sec drops >20% from baseline" },
  { metric: "Kafka Consumer Lag", p50: "<10K msgs", p95: "—", p99: "—", category: "Pipeline", alert: ">1M message lag on critical topics" },
  { metric: "Flink Checkpoint Duration", p50: "<30s", p95: "—", p99: "—", category: "Pipeline", alert: ">2min checkpoint = Flink job at risk" },
  { metric: "Data Freshness (QoE dashboard)", p50: "<30s", p95: "<60s", p99: "—", category: "Pipeline", alert: ">5min lag on QoE metrics" },
  { metric: "Search Latency", p50: "<20ms", p95: "<100ms", p99: "<200ms", category: "API", alert: ">200ms P99 on /search" },
  { metric: "Concurrency Slot Acquisition Rate", p50: "—", p95: "—", p99: "—", category: "API", alert: "Spike in 429s = potential limit bypass attempt" },
];

const DASHBOARDS = [
  { name: "Playback QoE Dashboard", owner: "Playback SRE", metrics: "Start time, rebuffering, failures, bitrate by region/ISP/device", purpose: "Primary oncall dashboard for streaming quality" },
  { name: "CDN Health Dashboard", owner: "CDN SRE", metrics: "Cache hit ratio, OCA health, error rates, fill queue depth", purpose: "Monitor OCA fleet and content distribution" },
  { name: "API Health Dashboard", owner: "Platform SRE", metrics: "API latency p50/p95/p99, error rates, concurrency, DRM license rate", purpose: "Monitor control-plane services" },
  { name: "Data Pipeline Freshness", owner: "Data Eng", metrics: "Kafka lag, Flink checkpoint lag, Iceberg commit freshness, DLQ depth", purpose: "Ensure events flow through pipeline without stalling" },
  { name: "Recommendation Quality", owner: "ML Platform", metrics: "CTR, watch-start rate, fallback tier usage, model freshness", purpose: "Detect recommendation degradation early" },
  { name: "Billing / Entitlement", owner: "Billing SRE", metrics: "Cache hit rate, entitlement check latency, failed billing checks", purpose: "Monitor entitlement path availability" },
  { name: "Cost Dashboard", owner: "Finance + Eng", metrics: "CDN egress, encoding compute spend, lake storage, Kafka/Flink cost, ML GPU spend", purpose: "Daily cost visibility and optimization tracking" },
];

const SLO_TABLE = [
  { service: "Playback Startup", sli: "% sessions with startup <2s", slo: "99.5% of sessions", sla: "99% (user-facing SLA)" },
  { service: "Playback Availability", sli: "% hours with <0.5% startup failure", slo: "99.99% monthly", sla: "99.9% (contractual)" },
  { service: "CDN Cache Hit", sli: "% segment requests served from OCA", slo: ">99% for top-200 titles", sla: "Internal target only" },
  { service: "API Availability", sli: "% API calls returning 2xx", slo: "99.99% monthly", sla: "99.9%" },
  { service: "Recommendation Latency", sli: "% homepage loads served <500ms P99", slo: "99.5% of loads", sla: "Internal target" },
  { service: "Data Freshness (QoE)", sli: "% minutes with dashboard lag <60s", slo: "99% of minutes", sla: "Internal" },
];

const COST_DRIVERS = [
  { driver: "CDN Bandwidth", magnitude: "Largest", details: "300 Tbps × 24h × cost-per-bit. OCA hardware eliminates per-bit transit fees vs commercial CDN.", optimization: "Increase OCA cache hit rate. Content pre-positioning. ABR codec efficiency (AV1 saves ~30% at same quality)." },
  { driver: "Video Encoding Compute", magnitude: "Large", details: "15–20 variants per title. New releases and backcatalog re-encoding for new codecs (AV1, H.265).", optimization: "Spot compute for encoding jobs. Per-title shot complexity analysis to skip unnecessary variants. Codec-per-device targeting." },
  { driver: "Object Storage (S3)", magnitude: "Medium", details: "2 PB encoded video + 45 PB event lake. S3 storage + replication cost.", optimization: "Lifecycle policies: move long-tail titles to Glacier after 6 months. Iceberg compaction reduces small-file storage waste." },
  { driver: "Kafka + Flink Compute", magnitude: "Medium", details: "15M events/sec continuously running stream processing. Always-on compute.", optimization: "Autoscale Flink task managers. Right-size Kafka partition count. Batch low-priority events at client." },
  { driver: "ML Training (GPU)", magnitude: "Medium", details: "Weekly model retraining on 90 days of events. Embedding generation. Experiment iterations.", optimization: "Spot GPU instances for training. Efficient data sampling. Transfer learning to reduce full retraining frequency." },
  { driver: "Cassandra Storage + Ops", magnitude: "Medium", details: "Multi-region RF=3 clusters for watch history, sessions, recommendations.", optimization: "TTL for old watch history. Compaction tuning. Right-size replication factor per criticality tier." },
  { driver: "Elasticsearch Search Cluster", magnitude: "Small", details: "1.5TB index replicated × 2. Refresh every few minutes. High read QPS.", optimization: "Reduce refresh interval for cold content. Tiered hardware (SSD for hot, HDD for warm)." },
];

export function ObservabilityTab({ onNavigateTab }: { onNavigateTab?: (tab: TabSlug) => void }) {
  return (
    <div className="space-y-8 pb-10">
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "4px solid #06b6d4" }}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Interview angle:</strong> Interviewers at senior/principal level ask &ldquo;how do you know the system is healthy?&rdquo; and &ldquo;what are the main cost drivers?&rdquo; Know the top 5 metrics, what alerts on them, and the top 3 cost reduction levers.
        </p>
      </div>

      {/* Key Metrics */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Key Metrics & Alerts</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>These are the metrics oncall engineers watch. Know which are P0 and what triggers an alert.</p>
        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                {["Metric", "Category", "P50 target", "P99 target", "Alert condition"].map(h => (
                  <th key={h} className="text-left px-3 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {KEY_METRICS.map((m, i) => {
                const catColors: Record<string, string> = { QoE: "#ec4899", CDN: "#f59e0b", API: "#3b82f6", ML: "#8b5cf6", Pipeline: "#10b981" };
                const color = catColors[m.category] ?? "#6b7280";
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg)" : "var(--bg-card)" }}>
                    <td className="px-3 py-2.5 font-medium" style={{ color: "var(--text)" }}>{m.metric}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: color + "18", color }}>{m.category}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: "#10b981" }}>{m.p50}</td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: "#f59e0b" }}>{m.p99 || m.p95 || "—"}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "#ef4444" }}>{m.alert}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLO/SLA Table */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>SLO / SLA / SLI Reference</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>SLI = what you measure. SLO = your internal target. SLA = external commitment.</p>
        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                {["Service Area", "SLI (what we measure)", "SLO (internal target)", "SLA (external)"].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {SLO_TABLE.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg)" : "var(--bg-card)" }}>
                  <td className="px-4 py-3 font-semibold text-sm" style={{ color: "var(--text)" }}>{r.service}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{r.sli}</td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: "#3b82f6" }}>{r.slo}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-faint)" }}>{r.sla}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dashboards */}
      <div>
        <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text)" }}>Key Dashboards</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {DASHBOARDS.map((d) => (
            <div key={d.name} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="font-semibold text-sm mb-1" style={{ color: "var(--text)" }}>{d.name}</div>
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>Owner: {d.owner}</div>
              <div className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>{d.metrics}</div>
              <div className="text-xs italic" style={{ color: "var(--text-faint)" }}>{d.purpose}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Drivers */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Cost Drivers & Optimizations</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Principal-level candidates are expected to discuss cost. Know the top 3 drivers and how to reduce them.</p>
        <div className="space-y-3">
          {COST_DRIVERS.map((c, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{c.driver}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: c.magnitude === "Largest" ? "#fee2e2" : c.magnitude === "Large" ? "#fef3c7" : "#f0fdf4", color: c.magnitude === "Largest" ? "#991b1b" : c.magnitude === "Large" ? "#92400e" : "#166534" }}>
                  {c.magnitude}
                </span>
              </div>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{c.details}</p>
              <div className="flex items-start gap-2 text-xs">
                <span className="shrink-0 font-semibold" style={{ color: "#10b981" }}>Optimize: </span>
                <span style={{ color: "var(--text-muted)" }}>{c.optimization}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SayThisBlock text="The top 3 observability signals I'd put on an oncall dashboard: playback start time P99 (user-facing quality), CDN cache hit rate (cost and quality proxy), and Kafka consumer lag (data pipeline health). The top 3 cost drivers are CDN bandwidth, encoding compute, and object storage. All three have clear optimization levers: OCA cache hit rate improvement, spot compute for encoding, and Iceberg compaction for storage efficiency." />

      {onNavigateTab && (
        <button onClick={() => onNavigateTab("interview-qa")} className="w-full py-4 rounded-2xl text-sm font-semibold"
          style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--border)", cursor: "pointer" }}>
          Next: Interview Q&A →
        </button>
      )}
    </div>
  );
}
