"use client";

import { useState, useMemo } from "react";
import { HERO_NUMBERS, DERIVATIONS, PRESETS, type CapacityPreset } from "./capacity-data";
import { C } from "./constants";

function HeroRow() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {HERO_NUMBERS.map((h, i) => (
        <div key={i} className="rounded-lg p-3 text-center" style={{ background: "var(--bg-card)", border: `1px solid var(--border)` }}>
          <p className="text-xl font-black" style={{ color: h.color }}>{h.value}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: h.color + "aa" }}>{h.unit}</p>
          <p className="text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>{h.label}</p>
        </div>
      ))}
    </div>
  );
}

function DerivationCard({ derivation }: { derivation: typeof DERIVATIONS[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${open ? C.border2 : "var(--border)"}` }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: C.amber }} />
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{derivation.title}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-black" style={{ color: C.amber }}>{derivation.result}</span>
          <span style={{ color: "var(--text-faint)" }}>{open ? "▴" : "▾"}</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* Steps */}
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid var(--border)` }}>
            {derivation.steps.map((step, i) => (
              <div key={i} className="flex gap-3 px-3 py-2"
                style={{ borderBottom: i < derivation.steps.length - 1 ? `1px solid var(--border)` : undefined, background: i === derivation.steps.length - 1 ? C.amber + "08" : undefined }}>
                <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: i === derivation.steps.length - 1 ? C.amber : "var(--bg-muted)", color: i === derivation.steps.length - 1 ? "#000" : "var(--text-muted)" }}>
                  {i + 1}
                </span>
                <p className="text-[10px] leading-relaxed font-mono" style={{ color: i === derivation.steps.length - 1 ? C.amber : "var(--text-muted)" }}>
                  {step}
                </p>
              </div>
            ))}
          </div>

          {/* Assumption */}
          <div className="rounded p-2.5" style={{ background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.15)" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#38bdf8" }}>Assumptions</p>
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{derivation.assumption}</p>
          </div>

          {/* Interview tip */}
          <div className="rounded p-2.5" style={{ background: "rgba(245,166,35,0.06)", border: `1px solid ${C.amber}25` }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: C.amber }}>Interview Tip</p>
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{derivation.interviewTip}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Calculator() {
  const [preset, setPreset] = useState<string>("netflix");
  const [subscribers, setSubscribers] = useState(300_000_000);
  const [dauRatio, setDauRatio] = useState(50);
  const [bitrateMbps, setBitrateMbps] = useState(3);

  const setFromPreset = (p: CapacityPreset) => {
    setPreset(p.id);
    setSubscribers(p.subscribers);
    setDauRatio(Math.round(p.dauRatio * 100));
    setBitrateMbps(p.bitrateMbps);
  };

  const results = useMemo(() => {
    const dau = Math.round(subscribers * (dauRatio / 100));
    const peakConcurrent = Math.round(dau * 0.10);
    const peakBandwidthTbps = ((peakConcurrent * bitrateMbps) / 1_000_000).toFixed(1);
    const avgRps = Math.round((dau * 50) / 86_400);
    const peakRps = Math.round(avgRps * 3);
    const kafkaEventsPerSec = Math.round(peakConcurrent / 30);
    const cassandraStorageGB = Math.round((dau * 3 * 200 * 90) / (1024 * 1024 * 1024));
    return {
      dau: dau.toLocaleString(),
      peakConcurrent: peakConcurrent.toLocaleString(),
      peakBandwidthTbps,
      peakRps: peakRps.toLocaleString(),
      kafkaEventsPerSec: kafkaEventsPerSec.toLocaleString(),
      cassandraStorageGB: cassandraStorageGB.toLocaleString(),
    };
  }, [subscribers, dauRatio, bitrateMbps]);

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid var(--border)` }}>
      <div className="px-4 py-3" style={{ background: "var(--bg-muted)", borderBottom: `1px solid var(--border)` }}>
        <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Interactive Calculator</p>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Adjust scale to see derived numbers</p>
      </div>
      <div className="p-4">
        {/* Preset buttons */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => setFromPreset(p)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{
                background: preset === p.id ? C.red + "18" : "transparent",
                color: preset === p.id ? C.red : "var(--text-muted)",
                border: `1px solid ${preset === p.id ? C.red + "40" : "var(--border)"}`,
              }}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {/* Subscribers */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: "var(--text-faint)" }}>
              Subscribers
            </label>
            <div className="flex items-center gap-2">
              <input type="range" min={1_000_000} max={2_000_000_000} step={1_000_000}
                value={subscribers}
                onChange={e => { setPreset("custom"); setSubscribers(parseInt(e.target.value)); }}
                className="flex-1" style={{ accentColor: C.red }} />
              <span className="text-xs font-mono w-14 text-right" style={{ color: C.amber }}>
                {subscribers >= 1_000_000_000 ? (subscribers / 1_000_000_000).toFixed(1) + "B"
                  : (subscribers / 1_000_000).toFixed(0) + "M"}
              </span>
            </div>
          </div>

          {/* DAU ratio */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: "var(--text-faint)" }}>
              DAU Ratio
            </label>
            <div className="flex items-center gap-2">
              <input type="range" min={10} max={90} step={5}
                value={dauRatio}
                onChange={e => { setPreset("custom"); setDauRatio(parseInt(e.target.value)); }}
                className="flex-1" style={{ accentColor: C.red }} />
              <span className="text-xs font-mono w-14 text-right" style={{ color: C.amber }}>{dauRatio}%</span>
            </div>
          </div>

          {/* Bitrate */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: "var(--text-faint)" }}>
              Avg Bitrate (Mbps)
            </label>
            <div className="flex items-center gap-2">
              <input type="range" min={0.5} max={15} step={0.5}
                value={bitrateMbps}
                onChange={e => { setPreset("custom"); setBitrateMbps(parseFloat(e.target.value)); }}
                className="flex-1" style={{ accentColor: C.red }} />
              <span className="text-xs font-mono w-14 text-right" style={{ color: C.amber }}>{bitrateMbps} Mbps</span>
            </div>
          </div>
        </div>

        {/* Results grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "DAU", value: results.dau, color: "var(--text)" },
            { label: "Peak Concurrent", value: results.peakConcurrent, color: "#38bdf8" },
            { label: "Peak Bandwidth", value: results.peakBandwidthTbps + " Tbps", color: C.red },
            { label: "Peak API RPS", value: results.peakRps, color: C.amber },
            { label: "Kafka events/sec", value: results.kafkaEventsPerSec, color: "#f59e0b" },
            { label: "Cassandra (90d)", value: results.cassandraStorageGB + " GB", color: "#6ee7b7" },
          ].map((r, i) => (
            <div key={i} className="rounded-lg p-3" style={{ background: "var(--bg-muted)", border: `1px solid var(--border)` }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-faint)" }}>{r.label}</p>
              <p className="text-sm font-black font-mono" style={{ color: r.color }}>{r.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CAPACITY_SECTIONS = [
  { id: "hero",        label: "Key Numbers"   },
  { id: "calculator",  label: "Calculator"    },
  { id: "derivations", label: "Derivations"   },
];

export default function CapacityTab() {
  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Sidebar TOC */}
      <div className="w-40 shrink-0 hidden md:block" style={{ background: "var(--bg-card)", borderRight: `1px solid var(--border)` }}>
        <div className="px-3 py-3" style={{ borderBottom: `1px solid var(--border)` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Sections</p>
        </div>
        <nav className="p-2 space-y-0.5">
          {CAPACITY_SECTIONS.map(s => (
            <button key={s.id}
              onClick={() => document.getElementById(`cap-${s.id}`)?.scrollIntoView({ behavior: "smooth" })}
              className="w-full text-left px-2 py-2 rounded text-xs transition-colors"
              style={{ color: "var(--text-muted)" }}>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-3" style={{ borderTop: `1px solid var(--border)` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>Interview tip</p>
          <p className="text-[9px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Give order-of-magnitude estimates. Interviewers want reasoning, not precision.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Interview callout */}
        <div className="rounded-lg p-4" style={{ background: "rgba(245,166,35,0.06)", border: `1px solid ${C.amber}25` }}>
          <p className="text-xs font-bold mb-2" style={{ color: C.amber }}>How to present this in an interview</p>
          <ol className="space-y-1">
            {[
              "Start with bandwidth — it's the most impressive anchor number (45 Tbps = 15% of global internet).",
              "Derive from DAU, not from thin air. Show your reasoning step by step.",
              "Interviewers want order of magnitude, not precision. 260K RPS is fine; 261,574 is overthinking.",
              "For each number, say what it implies for architecture (e.g. 500K events/sec → need Kafka, not SQS).",
              "Always state your assumptions explicitly so the interviewer can correct them.",
            ].map((step, i) => (
              <li key={i} className="flex gap-2 text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                <span className="shrink-0 font-bold" style={{ color: C.amber }}>{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div id="cap-hero">
          <h2 className="text-base font-bold mb-1" style={{ color: "var(--text)" }}>Capacity Estimation</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            The numbers interviewers expect you to derive on a whiteboard. Start with bandwidth — it&apos;s the anchor.
          </p>
        </div>

        <HeroRow />

        <div id="cap-calculator"><Calculator /></div>

        <div id="cap-derivations">
          <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>Step-by-Step Derivations</h3>
          <p className="text-[10px] mb-4" style={{ color: "var(--text-muted)" }}>Click any row to see the full derivation with assumptions and interview tips.</p>
          <div className="space-y-2">
            {DERIVATIONS.map(d => <DerivationCard key={d.id} derivation={d} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
