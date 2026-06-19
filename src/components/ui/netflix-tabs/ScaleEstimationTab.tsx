"use client";

import { useState, useMemo } from "react";
import type { Role } from "./types";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setC(true); setTimeout(() => setC(false), 2000); }); }}
      className="text-[11px] px-3 py-1 rounded-lg font-medium transition-colors"
      style={{ background: c ? "#22c55e" : "var(--bg)", color: c ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
      aria-label={`Copy ${label || "text"} to clipboard`}
    >
      {c ? "✓ Copied!" : "Copy"}
    </button>
  );
}

type Preset = {
  name: string;
  color: string;
  subscribers: number;
  dauRatio: number;
  concurrencyRatio: number;
  avgBitrateMbps: number;
  heartbeatIntervalSec: number;
  devicesPerAccount: number;
  avgSessionMin: number;
};

const PRESETS: Preset[] = [
  { name: "Netflix (real)", color: "#e50914", subscribers: 300, dauRatio: 0.73, concurrencyRatio: 0.27, avgBitrateMbps: 5, heartbeatIntervalSec: 30, devicesPerAccount: 4, avgSessionMin: 90 },
  { name: "Startup (10M)", color: "#10b981", subscribers: 10, dauRatio: 0.60, concurrencyRatio: 0.20, avgBitrateMbps: 4, heartbeatIntervalSec: 30, devicesPerAccount: 2, avgSessionMin: 60 },
  { name: "FAANG Scale (1B)", color: "#8b5cf6", subscribers: 1000, dauRatio: 0.75, concurrencyRatio: 0.30, avgBitrateMbps: 6, heartbeatIntervalSec: 30, devicesPerAccount: 5, avgSessionMin: 100 },
];

type Inputs = {
  subscribers: number;       // millions
  dauRatio: number;          // 0-1
  concurrencyRatio: number;  // 0-1 of DAU
  avgBitrateMbps: number;
  heartbeatIntervalSec: number;
  devicesPerAccount: number;
  avgSessionMin: number;
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}T`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}B`;
  if (n >= 1) return `${n.toFixed(n >= 100 ? 0 : 1)}M`;
  return `${(n * 1000).toFixed(0)}K`;
}
function fmtN(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)} T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} K`;
  return `${n.toFixed(0)}`;
}

function useCalc(inp: Inputs) {
  return useMemo(() => {
    const sub = inp.subscribers * 1e6;
    const dau = sub * inp.dauRatio;
    const concurrent = dau * inp.concurrencyRatio;
    const heartbeatQps = concurrent / inp.heartbeatIntervalSec;
    const cdnBandwidthGbps = (concurrent * inp.avgBitrateMbps) / 1000;
    const metadataQps = concurrent * 0.5;
    const sessionStartQps = (dau * 2) / 86400;
    const dailyHeartbeats = heartbeatQps * 86400;
    const avgEventSizeKb = 2;
    const eventsPerSec = concurrent * (1 / inp.heartbeatIntervalSec + 0.05); // heartbeat + other
    const dailyEvents = eventsPerSec * 86400;
    const bronzePbPerDay = (dailyEvents * avgEventSizeKb * 1024 * 0.45) / 1e15;
    const kafkaBrokers = Math.ceil((eventsPerSec * avgEventSizeKb * 1024 * 3) / (200 * 1024 * 1024));
    const kafkaPartitions = Math.ceil(heartbeatQps / 2000);
    const flinkVcpus = Math.ceil(eventsPerSec / 5000);
    const cassandraNodes = Math.ceil(heartbeatQps / 200);
    const redisMemGb = (concurrent * 1024) / 1e9;

    // Threshold warnings
    const warnings: string[] = [];
    if (heartbeatQps > 200_000) warnings.push(`${fmtN(heartbeatQps)} writes/sec → MySQL can't handle this. Use Cassandra.`);
    if (cdnBandwidthGbps > 50_000) warnings.push(`${(cdnBandwidthGbps / 1000).toFixed(0)} Tbps CDN bandwidth → requires own CDN like Open Connect.`);
    if (metadataQps > 1_000_000) warnings.push(`${fmtN(metadataQps)} metadata reads/sec → must use EVCache/Memcached.`);
    if (kafkaBrokers > 100) warnings.push(`${kafkaBrokers} Kafka brokers → significant cluster management overhead.`);
    if (redisMemGb > 100) warnings.push(`${redisMemGb.toFixed(0)} GB in Redis for concurrency → consider clustering.`);

    return { sub, dau, concurrent, heartbeatQps, cdnBandwidthGbps, metadataQps, sessionStartQps, dailyHeartbeats, eventsPerSec, dailyEvents, bronzePbPerDay, kafkaBrokers, kafkaPartitions, flinkVcpus, cassandraNodes, redisMemGb, warnings };
  }, [inp]);
}

type SliderField = { key: keyof Inputs; label: string; min: number; max: number; step: number; format: (v: number) => string };

const SLIDER_FIELDS: SliderField[] = [
  { key: "subscribers", label: "Subscribers", min: 1, max: 1000, step: 1, format: v => `${v}M` },
  { key: "dauRatio", label: "DAU / Subscriber ratio", min: 0.3, max: 0.9, step: 0.01, format: v => `${(v * 100).toFixed(0)}%` },
  { key: "concurrencyRatio", label: "Peak concurrency ratio (of DAU)", min: 0.1, max: 0.5, step: 0.01, format: v => `${(v * 100).toFixed(0)}%` },
  { key: "avgBitrateMbps", label: "Avg bitrate (Mbps)", min: 1, max: 25, step: 0.5, format: v => `${v} Mbps` },
  { key: "heartbeatIntervalSec", label: "Heartbeat interval (sec)", min: 5, max: 120, step: 5, format: v => `${v}s` },
  { key: "devicesPerAccount", label: "Devices per account", min: 1, max: 6, step: 1, format: v => `${v}` },
  { key: "avgSessionMin", label: "Avg session duration (min)", min: 10, max: 240, step: 5, format: v => `${v} min` },
];

const FORMULAS = [
  { label: "Heartbeat QPS", formula: "concurrent_streams / heartbeat_interval_sec", example: "60M / 30 = 2M/sec", color: "#3b82f6" },
  { label: "CDN Bandwidth", formula: "concurrent_streams × avg_bitrate", example: "60M × 5 Mbps = 300 Tbps", color: "#10b981" },
  { label: "Daily raw data (Bronze)", formula: "events_per_day × avg_event_size × compression_ratio", example: "700B × 2KB × 0.45 = 1.5 PB/day", color: "#f59e0b" },
  { label: "Kafka partitions", formula: "peak_throughput / throughput_per_partition", example: "2M heartbeats/sec / 2K = 1,000 partitions", color: "#8b5cf6" },
  { label: "Kafka brokers", formula: "(ingest_rate × RF) / broker_throughput", example: "(30 GB/s × 3) / 200 MB/s = 450 brokers", color: "#06b6d4" },
  { label: "Watch hours (Gold)", formula: "SUM(watched_seconds) / 3600", example: "3.6B seconds / 3600 = 1M watch hours", color: "#ec4899" },
  { label: "Completion rate", formula: "sessions_completed / sessions_started × 100", example: "where watched_pct >= 0.9", color: "#10b981" },
  { label: "Flink vCPUs", formula: "events_per_sec / events_per_vcpu", example: "15M / 5K = 3,000 vCPUs", color: "#f97316" },
  { label: "EVCache hit impact", formula: "cache_hit_rate × total_reads", example: "0.999 × 30M/sec = 30K/sec to Cassandra", color: "#a855f7" },
  { label: "Cassandra nodes", formula: "write_qps / writes_per_node", example: "2M / 200 = 10,000 nodes", color: "#84cc16" },
];

export function ScaleEstimationTab({ role }: { role: Role }) {
  const [subTab, setSubTab] = useState<"calculator" | "formulas">("calculator");
  const [activeSection, setActiveSection] = useState<"backend" | "data">(role === "Data Engineer" ? "data" : "backend");
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Inputs>({
    subscribers: 300, dauRatio: 0.73, concurrencyRatio: 0.27,
    avgBitrateMbps: 5, heartbeatIntervalSec: 30, devicesPerAccount: 4, avgSessionMin: 90,
  });

  const calc = useCalc(inputs);
  const color = activeSection === "backend" ? "#3b82f6" : "#10b981";

  function applyPreset(p: Preset) {
    setInputs({ subscribers: p.subscribers, dauRatio: p.dauRatio, concurrencyRatio: p.concurrencyRatio, avgBitrateMbps: p.avgBitrateMbps, heartbeatIntervalSec: p.heartbeatIntervalSec, devicesPerAccount: p.devicesPerAccount, avgSessionMin: p.avgSessionMin });
  }

  const copyAnswer = activeSection === "backend"
    ? `BACKEND SCALE ASSUMPTIONS:
${inputs.subscribers}M subscribers × ${(inputs.dauRatio * 100).toFixed(0)}% DAU = ${fmt(calc.dau)} DAU
${fmt(calc.dau)} DAU × ${(inputs.concurrencyRatio * 100).toFixed(0)}% peak = ${fmt(calc.concurrent)} concurrent streams

DERIVED:
${fmt(calc.concurrent)} × ${inputs.avgBitrateMbps} Mbps    = ${(calc.cdnBandwidthGbps / 1000).toFixed(0)} Tbps CDN bandwidth
${fmt(calc.concurrent)} ÷ ${inputs.heartbeatIntervalSec}s         = ${fmtN(calc.heartbeatQps)}/sec heartbeat writes → Cassandra
${fmtN(calc.heartbeatQps)} writes/sec ÷ 200   = ~${fmtN(calc.cassandraNodes)} Cassandra nodes
${fmt(calc.concurrent)} × 1KB             = ~${calc.redisMemGb.toFixed(0)} GB active sessions in Redis`
    : `DATA ENGINEERING SCALE ASSUMPTIONS:
${fmt(calc.concurrent)} concurrent streams, ${fmtN(calc.eventsPerSec)} events/sec peak
2KB avg event size, RF=3 Kafka

DERIVED:
${fmtN(calc.eventsPerSec)} × 2KB × RF3 ÷ 200 MB/s = ~${calc.kafkaBrokers} Kafka brokers
${fmtN(calc.heartbeatQps)} ÷ 2K per partition      = ~${calc.kafkaPartitions} Kafka partitions
${fmtN(calc.dailyEvents)} events × 2KB × 0.45       = ~${calc.bronzePbPerDay.toFixed(2)} PB/day Bronze
${fmtN(calc.eventsPerSec)} ÷ 5K events/vCPU         = ~${calc.flinkVcpus} Flink vCPUs`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 flex flex-wrap items-center gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Scale Estimation</h2>
        <p className="text-sm flex-1" style={{ color: "var(--text-muted)" }}>Show the formula, derive the number. Interviewers care about reasoning.</p>

        {/* Sub-tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          {(["calculator", "formulas"] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize"
              style={{ background: subTab === t ? "var(--blue-soft)" : "transparent", color: subTab === t ? "var(--blue-text)" : "var(--text-muted)", cursor: "pointer", border: "none" }}
            >{t === "calculator" ? "📐 Calculator" : "📋 Formula Cards"}</button>
          ))}
        </div>
      </div>

      {subTab === "calculator" && (
        <div className="space-y-5">
          {/* Presets */}
          <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-bold mb-3" style={{ color: "var(--text-faint)" }}>PRESETS</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: `${p.color}15`, color: p.color, border: `1px solid ${p.color}40`, cursor: "pointer" }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-bold mb-4 uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Drag to adjust assumptions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {SLIDER_FIELDS.map(f => (
                <div key={f.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor={`slider-${f.key}`} className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{f.label}</label>
                    <span id={`slider-val-${f.key}`} className="text-xs font-mono font-bold" style={{ color }}>{f.format(inputs[f.key] as number)}</span>
                  </div>
                  <input
                    id={`slider-${f.key}`}
                    type="range" min={f.min} max={f.max} step={f.step}
                    value={inputs[f.key] as number}
                    onChange={e => setInputs(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                    className="w-full"
                    style={{ accentColor: color, touchAction: "manipulation" }}
                    aria-label={f.label}
                    aria-describedby={`slider-val-${f.key}`}
                  />
                  <div className="flex justify-between text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>
                    <span>{f.format(f.min)}</span>
                    <span>{f.format(f.max)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* View toggle: backend / data */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", width: "fit-content" }}>
            {(["backend", "data"] as const).map(s => (
              <button key={s} onClick={() => setActiveSection(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize"
                style={{ background: activeSection === s ? (s === "backend" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)") : "transparent", color: activeSection === s ? (s === "backend" ? "#3b82f6" : "#10b981") : "var(--text-muted)", cursor: "pointer", border: "none" }}
              >
                {s === "backend" ? "⚙️ Backend metrics" : "📊 Data metrics"}
              </button>
            ))}
          </div>

          {/* Warnings */}
          {calc.warnings.length > 0 && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: "#fffbeb", border: "1px solid #fcd34d" }}>
              <p className="text-xs font-bold" style={{ color: "#92400e" }}>⚠ Architectural implications at this scale:</p>
              {calc.warnings.map((w, i) => (
                <p key={i} className="text-xs" style={{ color: "#78350f" }}>→ {w}</p>
              ))}
            </div>
          )}

          {/* Derivation chain */}
          <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Derivation chain</p>
              <CopyButton text={copyAnswer} label="scale answer" />
            </div>
            <div className="space-y-1.5">
              {[
                { label: "Subscribers", value: `${inputs.subscribers}M`, formula: "— given assumption" },
                { label: "DAU", value: fmt(calc.dau), formula: `${inputs.subscribers}M × ${(inputs.dauRatio * 100).toFixed(0)}%` },
                { label: "Peak concurrent streams", value: fmt(calc.concurrent), formula: `${fmt(calc.dau)} DAU × ${(inputs.concurrencyRatio * 100).toFixed(0)}%`, highlight: true },
                ...(activeSection === "backend" ? [
                  { label: "Heartbeat QPS", value: `${fmtN(calc.heartbeatQps)}/sec`, formula: `${fmt(calc.concurrent)} ÷ ${inputs.heartbeatIntervalSec}s`, highlight: true },
                  { label: "CDN bandwidth", value: `${(calc.cdnBandwidthGbps / 1000).toFixed(0)} Tbps`, formula: `${fmt(calc.concurrent)} × ${inputs.avgBitrateMbps} Mbps`, highlight: true },
                  { label: "Metadata read QPS", value: `${fmtN(calc.metadataQps)}/sec`, formula: `${fmt(calc.concurrent)} × 0.5 reads/stream/sec` },
                  { label: "Cassandra nodes needed", value: `~${fmtN(calc.cassandraNodes)}`, formula: `${fmtN(calc.heartbeatQps)}/sec ÷ 200 writes/node`, highlight: true },
                  { label: "Redis memory (concurrency)", value: `~${calc.redisMemGb.toFixed(0)} GB`, formula: `${fmt(calc.concurrent)} sessions × 1KB/session` },
                ] : [
                  { label: "Events per second", value: `${fmtN(calc.eventsPerSec)}/sec`, formula: `${fmt(calc.concurrent)} × (heartbeat + other events)`, highlight: true },
                  { label: "Daily events", value: fmtN(calc.dailyEvents), formula: `${fmtN(calc.eventsPerSec)}/sec × 86,400s` },
                  { label: "Bronze data/day", value: `${calc.bronzePbPerDay.toFixed(2)} PB`, formula: `${fmtN(calc.dailyEvents)} × 2KB × 0.45 zstd`, highlight: true },
                  { label: "Kafka partitions", value: `~${calc.kafkaPartitions}`, formula: `${fmtN(calc.heartbeatQps)} heartbeat/sec ÷ 2K/partition` },
                  { label: "Kafka brokers", value: `~${calc.kafkaBrokers}`, formula: `${fmtN(calc.eventsPerSec)} × 2KB × RF3 ÷ 200 MB/s`, highlight: true },
                  { label: "Flink vCPUs", value: `~${calc.flinkVcpus}`, formula: `${fmtN(calc.eventsPerSec)}/sec ÷ 5K events/vCPU` },
                ]),
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: row.highlight ? `${color}08` : "var(--bg)", border: `1px solid ${row.highlight ? `${color}30` : "var(--border)"}` }}
                >
                  {i < 2 && <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>↓</span>}
                  {i >= 2 && <span className="text-[10px]" style={{ color }}>{i === 2 ? "→" : "↳"}</span>}
                  <span className="text-xs flex-1" style={{ color: "var(--text-muted)" }}>{row.label}</span>
                  <span className="text-sm font-mono font-bold" style={{ color: row.highlight ? color : "var(--text)" }}>{row.value}</span>
                  <span className="text-[10px] hidden sm:block" style={{ color: "var(--text-faint)" }}>{row.formula}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interview guidance */}
          <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>How to present this in an interview</h3>
            <div className="space-y-2">
              {[
                { step: "1", title: "State assumptions first", detail: `"I'll assume ${inputs.subscribers}M subscribers, ${(inputs.dauRatio*100).toFixed(0)}% DAU, ${(inputs.concurrencyRatio*100).toFixed(0)}% peak concurrency. Correct me if different."` },
                { step: "2", title: "Derive, don't dump", detail: `"${fmt(calc.concurrent)} concurrent streams ÷ ${inputs.heartbeatIntervalSec}s = ${fmtN(calc.heartbeatQps)} heartbeat writes/sec."` },
                { step: "3", title: "Link to a design decision", detail: `"${fmtN(calc.heartbeatQps)} writes/sec rules out MySQL. That's why watch_progress uses Cassandra."` },
                { step: "4", title: "5 minutes max, then move on", detail: "Scale is context, not the interview. Derive 3-4 key numbers, link each to a design choice, then proceed." },
              ].map(item => (
                <div key={item.step} className="flex gap-3 p-3 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${color}15`, color }}>{item.step}</span>
                  <div>
                    <p className="text-xs font-bold mb-0.5" style={{ color: "var(--text)" }}>{item.title}</p>
                    <p className="text-xs leading-relaxed italic" style={{ color: "var(--text-muted)" }}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === "formulas" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FORMULAS.map(f => (
            <div key={f.label} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: `1px solid ${f.color}30` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: f.color }}>{f.label}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${f.label}: ${f.formula}\nExample: ${f.example}`).then(() => { setCopiedFormula(f.label); setTimeout(() => setCopiedFormula(null), 2000); }); }}
                  className="text-[10px] px-2 py-0.5 rounded font-medium"
                  style={{ background: copiedFormula === f.label ? "#22c55e" : `${f.color}15`, color: copiedFormula === f.label ? "#fff" : f.color, border: "none", cursor: "pointer" }}
                >
                  {copiedFormula === f.label ? "Copied!" : "Copy"}
                </button>
              </div>
              <code className="text-xs block mb-1.5 font-mono" style={{ color: "var(--text)" }}>{f.formula}</code>
              <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>e.g. {f.example}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
