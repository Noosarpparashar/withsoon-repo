"use client";

import { useState, useEffect } from "react";

// ── Data ─────────────────────────────────────────────────────────────────────
// open: true = open-weight; false = proprietary
const ALL_MODELS = [
  { name: "Claude Opus 4.8 (max)",  intel: 61, price: 4.10, open: false },
  { name: "GPT-5.5 (xhigh)",        intel: 60, price: 4.35, open: false },
  { name: "GPT-5.5 (high)",         intel: 59, price: 4.35, open: false },
  { name: "Claude Opus 4.7 (max)",  intel: 57, price: 4.10, open: false },
  { name: "Gemini 3.1 Pro Preview", intel: 57, price: 1.74, open: false },
  { name: "GPT-5.5 (medium)",       intel: 57, price: 4.35, open: false },
  { name: "Qwen3.7 Max",            intel: 57, price: 1.43, open: false },
  { name: "Gemini 3.5 Flash",       intel: 55, price: 1.31, open: false },
  { name: "MiniMax-M3",             intel: 55, price: 0.22, open: false },
  { name: "Kimi K2.6",              intel: 54, price: 0.20, open: true  },
  { name: "MiMo-V2.5-Pro",          intel: 54, price: 0.18, open: true  },
  { name: "Grok 4.3 (high)",        intel: 53, price: 0.70, open: false },
  { name: "Muse Spark",             intel: 52, price: 0.56, open: false },
  { name: "DeepSeek V4 Pro (Max)",  intel: 52, price: 0.18, open: true  },
  { name: "Nemotron 3 Ultra",       intel: 48, price: 0.20, open: true  },
  { name: "gpt-oss-120b (high)",    intel: 33, price: 0.14, open: true  },
  { name: "Mercury 2",              intel: 33, price: 0.14, open: false },
  { name: "Qwen3.5 0.8B",          intel: 11, price: 0.01, open: true  },
];

type Model = typeof ALL_MODELS[0];
type ChartKey = "intel" | "price";

// ── Horizontal bar chart ─────────────────────────────────────────────────────
function HorizChart({
  models,
  chartKey,
  higherBetter,
}: {
  models: Model[];
  chartKey: ChartKey;
  higherBetter: boolean;
}) {
  const sorted = [...models].sort((a, b) =>
    higherBetter ? b[chartKey] - a[chartKey] : a[chartKey] - b[chartKey]
  );
  const max = Math.max(...sorted.map((m) => m[chartKey]));

  const formatVal = (v: number) =>
    chartKey === "price" ? (v < 1 ? `$${v}` : `$${v.toFixed(2)}`) : String(v);

  // gradient: proprietary = purple→violet, open = cyan→teal
  const barGradient = (m: Model, pct: number) => {
    if (m.open) {
      const l = Math.round(45 + pct * 20);
      return `hsl(185,75%,${l}%)`;
    }
    const l = Math.round(55 + pct * 15);
    return `hsl(260,75%,${l}%)`;
  };

  return (
    <div className="space-y-1.5">
      {sorted.map((m) => {
        const val = m[chartKey];
        const pct = max > 0 ? val / max : 0;
        const widthPct = Math.max(pct * 100, 3);
        const barColor = barGradient(m, pct);
        const showInside = widthPct > 30;

        return (
          <div key={m.name} className="group flex items-center gap-2">
            {/* Model name */}
            <div className="w-40 shrink-0 text-right">
              <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors leading-tight truncate block">
                {m.name.replace(/ \(.*\)/, "")}
              </span>
            </div>

            {/* Bar track */}
            <div className="flex-1 relative h-7 rounded-md overflow-hidden bg-[var(--bg-muted)]">
              <div
                className="h-full rounded-md flex items-center transition-all duration-500"
                style={{ width: `${widthPct}%`, background: barColor }}
              >
                {showInside && (
                  <span className="text-[11px] font-bold text-white px-2 ml-auto">
                    {formatVal(val)}
                  </span>
                )}
              </div>
              {!showInside && (
                <span className="absolute left-[calc(max(3%,_${widthPct}%)_+_6px)] top-1/2 -translate-y-1/2 text-[11px] font-bold text-[var(--text-muted)]"
                  style={{ left: `calc(${widthPct}% + 6px)` }}>
                  {formatVal(val)}
                </span>
              )}
            </div>

            {/* Open badge */}
            {m.open && (
              <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700">
                OSS
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
export function LLMBenchmarkButton() {
  const [open, setOpen] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const models = showOpenOnly ? ALL_MODELS.filter((m) => m.open) : ALL_MODELS;
  const openCount = ALL_MODELS.filter((m) => m.open).length;

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent-text)] text-sm font-semibold hover:bg-[var(--accent)]/20 hover:border-[var(--accent)] transition-all shadow-sm hover:shadow-md"
      >
        <span>⚡</span>
        LLM Benchmarks
        <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8l8 8 8-8" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ animation: "fadeIn 0.15s ease" }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div
            className="relative w-full sm:max-w-5xl bg-[var(--bg-card)] border border-[var(--border)] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
            style={{ maxHeight: "92vh", animation: "slideUp 0.28s cubic-bezier(0.22,1,0.36,1)" }}
          >
            {/* ── Header ── */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[var(--border)] shrink-0">
              <div>
                <h2 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
                  ⚡ LLM Benchmarks
                </h2>
                <p className="text-xs text-[var(--text-faint)] mt-1">
                  {ALL_MODELS.length} models · Intelligence &amp; Price · Source:{" "}
                  <a href="https://artificialanalysis.ai" target="_blank" rel="noopener noreferrer"
                    className="underline hover:text-[var(--accent-text)] transition-colors">
                    artificialanalysis.ai
                  </a>
                </p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {/* Toggle */}
                <div className="flex bg-[var(--bg-muted)] rounded-full p-1 border border-[var(--border)] gap-0.5">
                  <button
                    onClick={() => setShowOpenOnly(false)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      !showOpenOnly
                        ? "bg-[var(--accent)] text-white shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    All ({ALL_MODELS.length})
                  </button>
                  <button
                    onClick={() => setShowOpenOnly(true)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      showOpenOnly
                        ? "bg-cyan-500 text-white shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    Open source ({openCount})
                  </button>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-muted)] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Legend ── */}
            <div className="flex items-center gap-5 px-6 py-2 border-b border-[var(--border)] bg-[var(--bg-muted)] shrink-0">
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
                <span className="w-3 h-3 rounded-sm inline-block bg-violet-500" />
                Proprietary
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
                <span className="w-3 h-3 rounded-sm inline-block bg-cyan-400" />
                Open weight
                <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700">OSS</span>
              </span>
              <span className="ml-auto text-[10px] text-[var(--text-faint)]">ESC to close</span>
            </div>

            {/* ── Charts ── */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">

                {/* Intelligence */}
                <div className="p-6">
                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                        <h3 className="font-bold text-base text-[var(--text)]">Intelligence</h3>
                      </div>
                      <p className="text-[11px] text-[var(--text-faint)] mt-0.5 ml-4">
                        AAII Score · Higher is better
                      </p>
                    </div>
                    <span className="text-2xl font-black text-violet-500">
                      {models.sort((a,b)=>b.intel-a.intel)[0]?.intel ?? "—"}
                    </span>
                  </div>
                  <HorizChart models={models} chartKey="intel" higherBetter />
                </div>

                {/* Price */}
                <div className="p-6">
                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <h3 className="font-bold text-base text-[var(--text)]">Price</h3>
                      </div>
                      <p className="text-[11px] text-[var(--text-faint)] mt-0.5 ml-4">
                        USD / 1M tokens · Lower is better
                      </p>
                    </div>
                    <span className="text-2xl font-black text-amber-500">
                      ${Math.min(...models.map(m=>m.price))}
                    </span>
                  </div>
                  <HorizChart models={models} chartKey="price" higherBetter={false} />
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-3 border-t border-[var(--border)] shrink-0 flex items-center justify-between bg-[var(--bg-muted)] rounded-b-2xl">
              <p className="text-[10px] text-[var(--text-faint)]">
                Data from artificialanalysis.ai · Updated as models release
              </p>
              <a
                href="https://artificialanalysis.ai/leaderboards/models"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--accent-text)] hover:underline font-semibold"
              >
                Full leaderboard →
              </a>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn  { from { opacity:0 }                          to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(48px);opacity:0 } to { transform:translateY(0);opacity:1 } }
      `}</style>
    </>
  );
}
