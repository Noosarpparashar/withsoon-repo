"use client";

import { useState } from "react";
import type { Role } from "@/components/ui/NetflixPage";

function CopyButton({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setC(true); setTimeout(() => setC(false), 2000); }); }}
      className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
      style={{ background: c ? "#22c55e" : "#2a2b3d", color: c ? "#fff" : "#a9b1d6", cursor: "pointer", border: "none" }}
    >{c ? "Copied!" : "Copy"}</button>
  );
}

const BACKEND_METRICS = [
  { label: "Daily active users", value: "220M", formula: "300M × 0.73 daily engagement", why: "Anchors all per-user storage calculations." },
  { label: "Peak concurrent streams", value: "60M", formula: "220M DAU × peak 27% concurrency factor", why: "This single number drives CDN capacity, Cassandra write load, and Redis concurrency store size." },
  { label: "Playback start QPS", value: "~600K/sec", formula: "60M sessions ÷ avg session length 6h × some new starts/hour", why: "Drives Playback Service horizontal scaling and concurrency check frequency." },
  { label: "Heartbeat QPS", value: "2M/sec", formula: "60M concurrent streams ÷ 30s heartbeat interval", why: "Rules out MySQL. Only Cassandra handles 2M writes/sec on a single access pattern." },
  { label: "Metadata read QPS", value: "30M/sec", formula: "60M streams × avg 0.5 metadata reads/sec (catalog browsing)", why: "EVCache serves 99.9% at 30M req/s. Without EVCache, Cassandra would be saturated." },
  { label: "Watch progress write QPS", value: "2M/sec", formula: "Same as heartbeat — each heartbeat = 1 Cassandra upsert", why: "Justifies Cassandra (not MySQL) for watch_progress table." },
  { label: "CDN bandwidth", value: "300 Tbps", formula: "60M streams × 5 Mbps avg bitrate", why: "Justifies building Open Connect. Commercial CDN at 300 Tbps would cost hundreds of millions/year." },
  { label: "Cache hit ratio", value: ">99.9%", formula: "30M metadata reads/sec → ~30K Cassandra reads/sec (0.1%)", why: "Each 0.1% drop in cache hit rate = 30K extra Cassandra reads/sec = significant load." },
  { label: "Active session storage", value: "~60 GB", formula: "60M session_ids × ~1KB per SET entry in Redis", why: "Fits comfortably in Redis. No need for external storage for concurrency state." },
  { label: "Cassandra nodes (watch history)", value: "~10,000 nodes", formula: "2M writes/sec ÷ ~200 writes/sec/node capacity", why: "Cassandra's linear scaling: add nodes, throughput scales. No sharding complexity." },
];

const DATA_METRICS = [
  { label: "Events per second (peak)", value: "15M/sec", formula: "60M streams × mix of heartbeat + quality + search + recs", why: "Drives Kafka broker count and stream processor vCPU sizing." },
  { label: "Events per day", value: "~700B events/day", formula: "15M/sec × 86,400s ÷ (1 - off-peak reduction)", why: "Daily data volume baseline for storage and cost estimation." },
  { label: "Average event size", value: "~2 KB", formula: "JSON event with all fields: ~800 bytes compressed, ~2KB raw", why: "Compressed Kafka messages save 60-70% vs uncompressed." },
  { label: "Daily raw data volume (Bronze)", value: "~1.5 PB/day", formula: "700B events × 2KB avg × 0.45 zstd compression ratio", why: "Drives S3 storage cost and retention policy decisions." },
  { label: "Kafka broker estimate", value: "~720 brokers", formula: "15M/sec × 2KB × RF3 ÷ 200 MB/s per broker", why: "RF3 means each byte lands on 3 brokers. 200 MB/s is a conservative broker throughput estimate." },
  { label: "Kafka partitions (heartbeat)", value: "~1,000 partitions", formula: "2M heartbeat/sec ÷ 2,000 events/sec per partition", why: "Partition count determines parallelism of stream processing." },
  { label: "Stream processing throughput", value: "~3,000 Flink vCPUs", formula: "15M events/sec ÷ 5K events/sec per vCPU (dedup + session)", why: "Flink stateful operations are expensive. 5K events/vCPU is a conservative estimate." },
  { label: "Flink state size", value: "~20 TB", formula: "Active sessions × session state size (dedup keys + window state)", why: "RocksDB on NVMe. Checkpointed to S3 every 5 minutes for fault tolerance." },
  { label: "Gold table size per day", value: "~10 GB/day", formula: "Pre-aggregated: 700B events compressed → 10GB aggregated metrics", why: "Gold tables are small because they are aggregates, not row-level data." },
  { label: "Backfill volume (90 days)", value: "~135 PB", formula: "1.5 PB/day × 90 days Bronze retention", why: "Full Bronze retention for reprocessing. Cold storage on S3 Glacier after 30 days." },
];

const FORMULAS = [
  { label: "Heartbeat QPS", formula: "concurrent_streams / heartbeat_interval_sec", example: "60M / 30 = 2M/sec", color: "#3b82f6" },
  { label: "Daily raw data (Bronze)", formula: "events_per_day × avg_event_size × compression_ratio", example: "700B × 2KB × 0.45 = 1.5 PB/day", color: "#10b981" },
  { label: "Kafka partitions", formula: "peak_throughput_per_topic / throughput_per_partition", example: "2M heartbeats/sec / 2K per partition = 1,000 partitions", color: "#f59e0b" },
  { label: "Kafka brokers", formula: "(ingest_rate × replication_factor) / broker_disk_throughput", example: "(30 GB/s × 3) / 200 MB/s = 450 brokers (+ 20% headroom = 540)", color: "#8b5cf6" },
  { label: "Watch hours (Gold)", formula: "SUM(watched_seconds) / 3600", example: "All sessions for content X: 3.6B seconds / 3600 = 1M watch hours", color: "#06b6d4" },
  { label: "Completion rate", formula: "sessions_completed / sessions_started × 100", example: "completions where watched_pct >= 0.9", color: "#10b981" },
  { label: "Flink vCPUs", formula: "events_per_sec / events_per_vcpu", example: "15M / 5K = 3,000 vCPUs", color: "#ec4899" },
  { label: "EVCache hit impact", formula: "cache_hit_rate × total_reads = reads_served_by_cache", example: "0.999 × 30M/sec = 29.97M/sec from cache, 30K/sec to Cassandra", color: "#f97316" },
  { label: "Redis active_streams memory", formula: "concurrent_sessions × avg_entry_size", example: "60M × 1KB ≈ 60 GB in Redis", color: "#a855f7" },
  { label: "Cassandra nodes for writes", formula: "write_qps / writes_per_node_per_sec", example: "2M / 200 = 10,000 nodes", color: "#84cc16" },
];

const BACKEND_COPY = `BACKEND SCALE ASSUMPTIONS:
300M subscribers, 220M DAU
60M peak concurrent streams
5 Mbps avg bitrate, 30s heartbeat interval

DERIVED:
60M × 5 Mbps         = 300 Tbps  CDN bandwidth
60M ÷ 30s            = 2M/sec    heartbeat writes → Cassandra
30M req/s metadata   × 99.9% cache hit → 30K/sec reaches Cassandra
2M writes/sec ÷ 200  = ~10,000 Cassandra nodes
60M × 1KB            = ~60 GB   active sessions in Redis`;

const DATA_COPY = `DATA ENGINEERING SCALE ASSUMPTIONS:
60M concurrent streams, 15M events/sec peak
2KB avg event size, RF=3 Kafka

DERIVED:
15M × 2KB × RF3 ÷ 200 MB/s    = ~720 Kafka brokers
15M / 2,000 per partition       = ~7,500 Kafka partitions
700B events × 2KB × 0.45       = ~1.5 PB/day Bronze
15M ÷ 5K events/vCPU           = ~3,000 Flink vCPUs
Flink state                     = ~20 TB RocksDB`;

function ScaleEstimationTab({ role }: { role: Role }) {
  const [subTab, setSubTab] = useState<"backend" | "data">(role === "Data Engineer" ? "data" : "backend");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);

  const metrics = subTab === "backend" ? BACKEND_METRICS : DATA_METRICS;
  const color = subTab === "backend" ? "#3b82f6" : "#10b981";
  const copyAll = subTab === "backend" ? BACKEND_COPY : DATA_COPY;

  return (
    <div className="space-y-6">
      {/* Header + sub-tabs */}
      <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Scale Estimation</h2>
          <div className="flex gap-1 p-1 rounded-xl ml-auto" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            {[["backend", "Backend Scale"], ["data", "Data Engineering Scale"]].map(([key, label]) => (
              <button key={key} onClick={() => setSubTab(key as "backend" | "data")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: subTab === key ? (key === "backend" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)") : "transparent", color: subTab === key ? (key === "backend" ? "#3b82f6" : "#10b981") : "var(--text-muted)", cursor: "pointer", border: "none" }}
              >{label}</button>
            ))}
          </div>
        </div>
        <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>Show the formula, then the result. Interviewers care about reasoning, not memorized numbers.</p>
      </div>

      {/* Metrics grid */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
            {subTab === "backend" ? "Backend Scale Metrics" : "Data Engineering Scale Metrics"}
          </h3>
          <CopyButton text={copyAll} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {metrics.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={i} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <div
                  className="p-4 cursor-pointer"
                  style={{ background: "var(--bg)", borderTop: `3px solid ${color}` }}
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpenIdx(isOpen ? null : i)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>{item.label}</div>
                      <div className="text-2xl font-black font-mono mb-1" style={{ color }}>{item.value}</div>
                      <div className="text-[11px] font-mono" style={{ color: "var(--text-faint)" }}>{item.formula}</div>
                    </div>
                    <span className="text-xs mt-1 shrink-0 transition-transform duration-200" style={{ color: "var(--text-faint)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                  </div>
                </div>
                {isOpen && (
                  <div className="px-4 pb-3 pt-2 text-sm leading-relaxed" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-muted)" }}>
                    <span className="text-xs font-bold block mb-1" style={{ color }}>Why this matters</span>
                    {item.why}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Formula cards */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>Formula Cards</h3>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Copy any formula — derive the number in the interview, never just recite it.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FORMULAS.map((f) => (
            <div key={f.label} className="rounded-xl p-4" style={{ background: "var(--bg)", border: `1px solid ${f.color}30` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: f.color }}>{f.label}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${f.label}: ${f.formula}\nExample: ${f.example}`).then(() => { setCopiedFormula(f.label); setTimeout(() => setCopiedFormula(null), 2000); }); }}
                  className="text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
                  style={{ background: copiedFormula === f.label ? "#22c55e" : `${f.color}15`, color: copiedFormula === f.label ? "#fff" : f.color, cursor: "pointer", border: "none" }}
                >{copiedFormula === f.label ? "Copied!" : "Copy"}</button>
              </div>
              <code className="text-xs block mb-1.5" style={{ color: "var(--text)" }}>{f.formula}</code>
              <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>Example: {f.example}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interview guidance */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>How to present scale estimation in interviews</h3>
        <div className="space-y-3">
          {[
            { step: "1", title: "State your assumptions first", detail: "\"I'll assume 300M subscribers, 220M DAU, 60M peak concurrent streams, 5 Mbps avg bitrate, and 30s heartbeat interval. Please correct me if your scale is different.\"" },
            { step: "2", title: "Derive, don't dump", detail: "Show the formula: \"60M concurrent × 5 Mbps = 300 Tbps bandwidth. That's why Netflix built its own CDN — commercial CDN at that scale would cost hundreds of millions per year.\"" },
            { step: "3", title: "Link each number to a design decision", detail: "\"2M heartbeat writes/sec rules out MySQL. That's why watch_progress uses Cassandra.\" The number must justify a choice." },
            { step: "4", title: "Don't get lost in the math", detail: "Scale is context, not the interview. 5 minutes max. Then move to the actual design. Interviewer will stop you if they want more depth." },
          ].map((item) => (
            <div key={item.step} className="flex gap-3 p-4 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${color}15`, color }}>{item.step}</span>
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>{item.title}</p>
                <p className="text-xs leading-relaxed italic" style={{ color: "var(--text-muted)" }}>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { ScaleEstimationTab };
