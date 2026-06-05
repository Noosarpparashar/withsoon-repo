"use client";

import { useState, useEffect } from "react";
import type { BenchmarkModel } from "@/app/api/llm-benchmarks/route";

// ── Fallback data (used if API is unreachable) ───────────────────────────────
const FALLBACK: BenchmarkModel[] = [
  { id: "anthropic/claude-opus-4.8", name: "Claude Opus 4.8 (max)",  intel: 61, price: 4.10,  open: false, contextLength: 200000 },
  { id: "openai/gpt-5.5",            name: "GPT-5.5 (xhigh)",        intel: 60, price: 4.35,  open: false, contextLength: 128000 },
  { id: "google/gemini-3.1-pro",     name: "Gemini 3.1 Pro Preview", intel: 57, price: 1.74,  open: false, contextLength: 1000000 },
  { id: "minimax/minimax-m3",        name: "MiniMax-M3",             intel: 55, price: 0.22,  open: false, contextLength: 128000 },
  { id: "moonshot/kimi-k2",          name: "Kimi K2.6",              intel: 54, price: 0.20,  open: true,  contextLength: 131072 },
  { id: "mimo/mimo-v2.5-pro",        name: "MiMo-V2.5-Pro",          intel: 54, price: 0.18,  open: true,  contextLength: 32768  },
  { id: "x-ai/grok-4.3",             name: "Grok 4.3 (high)",        intel: 53, price: 0.70,  open: false, contextLength: 131072 },
  { id: "deepseek/deepseek-v4-pro",  name: "DeepSeek V4 Pro",        intel: 52, price: 0.18,  open: true,  contextLength: 65536  },
  { id: "nvidia/nemotron-3-ultra",   name: "Nemotron 3 Ultra",        intel: 48, price: 0.20,  open: true,  contextLength: 131072 },
  { id: "openai/gpt-oss-120b",       name: "gpt-oss-120b",            intel: 33, price: 0.14,  open: true,  contextLength: 128000 },
];

function HorizChart({
  models,
  chartKey,
  higherBetter,
  propColor,
  openColor,
}: {
  models: BenchmarkModel[];
  chartKey: "intel" | "price";
  higherBetter: boolean;
  propColor: string;
  openColor: string;
}) {
  const valid = models.filter((m) =>
    chartKey === "intel" ? m.intel !== null : m.price > 0
  );
  const sorted = [...valid].sort((a, b) => {
    const av = chartKey === "intel" ? (a.intel ?? 0) : a.price;
    const bv = chartKey === "intel" ? (b.intel ?? 0) : b.price;
    return higherBetter ? bv - av : av - bv;
  });

  const vals = sorted.map((m) =>
    chartKey === "intel" ? (m.intel ?? 0) : m.price
  );
  const max = Math.max(...vals, 1);

  const fmt = (v: number) =>
    chartKey === "price"
      ? v < 1
        ? `$${v}`
        : `$${v.toFixed(2)}`
      : String(v);

  return (
    <div className="space-y-2">
      {sorted.map((m) => {
        const val = chartKey === "intel" ? (m.intel ?? 0) : m.price;
        const pct = Math.max((val / max) * 100, 3);
        const color = m.open ? openColor : propColor;
        const inside = pct > 28;

        return (
          <div key={m.id} className="group flex items-center gap-3">
            <div className="w-36 shrink-0 text-right">
              <span className="text-[11px] text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors leading-tight line-clamp-1 block">
                {m.name.replace(/ \(.*?\)$/, "")}
              </span>
            </div>
            <div className="flex-1 relative h-7 rounded-lg overflow-hidden bg-[var(--bg-muted)]">
              <div
                className="h-full rounded-lg flex items-center justify-end transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, background: color }}
              >
                {inside && (
                  <span className="text-[11px] font-bold text-white px-2.5">{fmt(val)}</span>
                )}
              </div>
              {!inside && (
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-[11px] font-bold text-[var(--text-muted)]"
                  style={{ left: `calc(${pct}% + 7px)` }}
                >
                  {fmt(val)}
                </span>
              )}
            </div>
            {m.open && (
              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700">
                OSS
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function LLMBenchmarkButton() {
  const [open, setOpen] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [data, setData] = useState<BenchmarkModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [usingFallback, setUsingFallback] = useState(false);

  // Fetch on first open
  useEffect(() => {
    if (!open || data.length > 0) return;
    setLoading(true);
    fetch("/api/llm-benchmarks")
      .then((r) => r.json())
      .then((json) => {
        if (json.models?.length) {
          setData(json.models);
          setUpdatedAt(json.updatedAt ?? "");
          setUsingFallback(false);
        } else {
          setData(FALLBACK);
          setUsingFallback(true);
        }
      })
      .catch(() => {
        setData(FALLBACK);
        setUsingFallback(true);
      })
      .finally(() => setLoading(false));
  }, [open, data.length]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const models = showOpenOnly ? data.filter((m) => m.open) : data;
  const openCount = data.filter((m) => m.open).length;
  const scoredCount = data.filter((m) => m.intel !== null).length;

  // Gradient colors
  const PROP = "linear-gradient(90deg,#7c3aed,#a78bfa)";
  const OSS  = "linear-gradient(90deg,#0891b2,#22d3ee)";
  const PRICE_PROP = "linear-gradient(90deg,#d97706,#fbbf24)";
  const PRICE_OSS  = "linear-gradient(90deg,#059669,#34d399)";

  return (
    <>
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div
            className="relative w-full sm:max-w-5xl bg-[var(--bg-card)] border border-[var(--border)] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
            style={{ maxHeight: "92vh", animation: "slideUp 0.28s cubic-bezier(0.22,1,0.36,1)" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[var(--border)] shrink-0">
              <div>
                <h2 className="text-xl font-bold text-[var(--text)]">⚡ LLM Benchmarks</h2>
                <p className="text-xs text-[var(--text-faint)] mt-1">
                  {loading ? "Loading live data…" : (
                    <>
                      {data.length} models · {scoredCount} with intelligence scores ·{" "}
                      {usingFallback ? (
                        <span className="text-amber-500">using cached data</span>
                      ) : (
                        <>
                          Prices live from{" "}
                          <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer"
                            className="underline hover:text-[var(--accent-text)]">openrouter.ai</a>
                          {updatedAt && ` · ${new Date(updatedAt).toLocaleDateString()}`}
                        </>
                      )}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex bg-[var(--bg-muted)] rounded-full p-1 border border-[var(--border)] gap-0.5">
                  <button
                    onClick={() => setShowOpenOnly(false)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      !showOpenOnly ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    All {data.length > 0 && `(${data.length})`}
                  </button>
                  <button
                    onClick={() => setShowOpenOnly(true)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      showOpenOnly ? "bg-cyan-500 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    Open source {openCount > 0 && `(${openCount})`}
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

            {/* Legend */}
            <div className="flex items-center gap-5 px-6 py-2 border-b border-[var(--border)] bg-[var(--bg-muted)] shrink-0">
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
                <span className="w-8 h-3 rounded-sm inline-block" style={{ background: "linear-gradient(90deg,#7c3aed,#a78bfa)" }} />
                Proprietary
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
                <span className="w-8 h-3 rounded-sm inline-block" style={{ background: "linear-gradient(90deg,#0891b2,#22d3ee)" }} />
                Open weight
              </span>
              <span className="ml-auto text-[10px] text-[var(--text-faint)]">ESC to close</span>
            </div>

            {/* Charts */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {loading ? (
                <div className="flex items-center justify-center py-24 text-[var(--text-muted)]">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    Loading live model data…
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
                  {/* Intelligence */}
                  <div className="p-6">
                    <div className="flex items-baseline justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-3 rounded-sm inline-block" style={{ background: "linear-gradient(90deg,#7c3aed,#a78bfa)" }} />
                          <h3 className="font-bold text-base text-[var(--text)]">Intelligence</h3>
                        </div>
                        <p className="text-[11px] text-[var(--text-faint)] mt-0.5 ml-10">
                          AAII Score · Higher is better
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-violet-500">
                          {models.filter(m => m.intel !== null).sort((a,b) => (b.intel??0)-(a.intel??0))[0]?.intel ?? "—"}
                        </div>
                        <div className="text-[10px] text-[var(--text-faint)]">top score</div>
                      </div>
                    </div>
                    {models.some(m => m.intel !== null) ? (
                      <HorizChart
                        models={models.filter(m => m.intel !== null)}
                        chartKey="intel"
                        higherBetter
                        propColor={PROP}
                        openColor={OSS}
                      />
                    ) : (
                      <p className="text-sm text-[var(--text-faint)] text-center py-8">
                        No intelligence scores for this filter.
                      </p>
                    )}
                    <p className="text-[10px] text-[var(--text-faint)] mt-4">
                      Scores from{" "}
                      <a href="https://artificialanalysis.ai" target="_blank" rel="noopener noreferrer"
                        className="underline hover:text-[var(--accent-text)]">artificialanalysis.ai</a>
                      {" "}· manually updated
                    </p>
                  </div>

                  {/* Price */}
                  <div className="p-6">
                    <div className="flex items-baseline justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-3 rounded-sm inline-block" style={{ background: "linear-gradient(90deg,#d97706,#fbbf24)" }} />
                          <h3 className="font-bold text-base text-[var(--text)]">Price</h3>
                        </div>
                        <p className="text-[11px] text-[var(--text-faint)] mt-0.5 ml-10">
                          USD / 1M tokens · Lower is better · Live
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-amber-500">
                          ${Math.min(...models.filter(m=>m.price>0).map(m=>m.price)).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[var(--text-faint)]">cheapest</div>
                      </div>
                    </div>
                    <HorizChart
                      models={models}
                      chartKey="price"
                      higherBetter={false}
                      propColor={PRICE_PROP}
                      openColor={PRICE_OSS}
                    />
                    <p className="text-[10px] text-[var(--text-faint)] mt-4">
                      Prices live from{" "}
                      <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer"
                        className="underline hover:text-[var(--accent-text)]">openrouter.ai</a>
                      {" "}· cached 24h
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[var(--border)] shrink-0 flex items-center justify-between bg-[var(--bg-muted)] rounded-b-2xl">
              <p className="text-[10px] text-[var(--text-faint)]">
                Intelligence scores: artificialanalysis.ai (manual) · Prices: openrouter.ai (live, 24h cache)
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
        @keyframes fadeIn  { from{opacity:0}                             to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(48px);opacity:0}  to{transform:translateY(0);opacity:1} }
      `}</style>
    </>
  );
}
