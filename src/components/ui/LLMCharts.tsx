"use client";

import { useState, useEffect } from "react";

type Model = {
  id: string;
  name: string;
  intel: number | null;
  price: number;
  open: boolean;
  contextLength: number;
};

type ApiResponse = {
  intelModels: Model[];
  priceModels: Model[];
  totalModels: number;
  updatedAt: string;
};

// Fallback: used if API unreachable
const FALLBACK_INTEL: Model[] = [
  { id: "anthropic/claude-opus-4.8",           name: "Claude Opus 4.8",    intel: 61, price: 4.10, open: false, contextLength: 200000 },
  { id: "openai/gpt-5.5",                      name: "GPT-5.5",            intel: 60, price: 4.35, open: false, contextLength: 128000 },
  { id: "google/gemini-3.1-pro-preview",        name: "Gemini 3.1 Pro",    intel: 57, price: 1.74, open: false, contextLength: 1000000 },
  { id: "minimax/minimax-m3",                   name: "MiniMax M3",         intel: 55, price: 0.22, open: true,  contextLength: 128000 },
  { id: "moonshotai/kimi-k2.6",                 name: "Kimi K2.6",          intel: 54, price: 0.20, open: true,  contextLength: 131072 },
  { id: "x-ai/grok-4.20",                      name: "Grok 4.20",          intel: 53, price: 0.70, open: false, contextLength: 131072 },
  { id: "deepseek/deepseek-v4-pro",             name: "DeepSeek V4 Pro",   intel: 52, price: 0.18, open: true,  contextLength: 65536  },
  { id: "nvidia/nemotron-3-ultra-550b-a55b",    name: "Nemotron 3 Ultra",  intel: 48, price: 0.20, open: true,  contextLength: 131072 },
  { id: "openai/gpt-oss-120b",                  name: "gpt-oss-120b",       intel: 33, price: 0.14, open: true,  contextLength: 128000 },
];
const FALLBACK_PRICE: Model[] = [...FALLBACK_INTEL].sort((a, b) => a.price - b.price);

// ── Horizontal bar row ───────────────────────────────────────────────────────
function Bar({ model, val, min, max, fmt, propGrad, ossGrad }: {
  model: Model; val: number; min: number; max: number;
  fmt: (v: number) => string;
  propGrad: string; ossGrad: string;
}) {
  // Range-based scaling: min value → 15%, max value → 100%
  const range = max - min || 1;
  const pct = min === max ? 100 : Math.round(15 + ((val - min) / range) * 85);
  const grad = model.open ? ossGrad : propGrad;
  const inside = pct > 30;

  return (
    <div className="group flex items-center gap-3 py-0.5">
      {/* Name */}
      <div className="w-[150px] shrink-0 text-right">
        <span className="text-[11px] leading-tight text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors block truncate">
          {model.name}
        </span>
      </div>

      {/* Bar */}
      <div className="flex-1 relative h-[26px] rounded-lg bg-[var(--bg-muted)] overflow-hidden">
        <div
          className="h-full rounded-lg flex items-center justify-end transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, background: grad }}
        >
          {inside && (
            <span className="text-[11px] font-bold text-white px-2.5 whitespace-nowrap">{fmt(val)}</span>
          )}
        </div>
        {!inside && (
          <span
            className="absolute top-1/2 -translate-y-1/2 text-[11px] font-bold text-[var(--text-muted)] whitespace-nowrap"
            style={{ left: `calc(${pct}% + 7px)` }}
          >
            {fmt(val)}
          </span>
        )}
      </div>

      {/* OSS badge */}
      {model.open ? (
        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 w-8 text-center">
          OSS
        </span>
      ) : (
        <span className="shrink-0 w-8" />
      )}
    </div>
  );
}

// ── Sort button ──────────────────────────────────────────────────────────────
function SortBtn({ asc, onToggle }: { asc: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 text-[10px] font-semibold text-[var(--text-faint)] hover:text-[var(--text)] border border-[var(--border)] rounded-full px-2 py-0.5 bg-[var(--bg-muted)] transition-colors"
      title={asc ? "Currently: low → high" : "Currently: high → low"}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        {asc
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          : <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />}
      </svg>
      {asc ? "Low → High" : "High → Low"}
    </button>
  );
}

// ── Panel section (Intelligence or Price) ────────────────────────────────────
function ChartPanel({
  title, subtitle, accentColor, propGrad, ossGrad,
  models, chartKey, defaultAsc, stat, statLabel, fmtVal, filterOpenOnly,
}: {
  title: string; subtitle: string; accentColor: string;
  propGrad: string; ossGrad: string;
  models: Model[]; chartKey: "intel" | "price";
  defaultAsc: boolean; stat: string; statLabel: string;
  fmtVal: (v: number) => string;
  filterOpenOnly: boolean;
}) {
  const [asc, setAsc] = useState(defaultAsc);

  const visible = filterOpenOnly ? models.filter((m) => m.open) : models;

  const sorted = [...visible].sort((a, b) => {
    const av = chartKey === "intel" ? (a.intel ?? 0) : a.price;
    const bv = chartKey === "intel" ? (b.intel ?? 0) : b.price;
    return asc ? av - bv : bv - av;
  });

  const vals = sorted.map((m) => chartKey === "intel" ? (m.intel ?? 0) : m.price);
  const max = Math.max(...vals, 1);
  const min = vals.length > 0 ? Math.min(...vals) : 0;

  return (
    <div className="p-5 flex flex-col">
      {/* Title row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-3 rounded-sm inline-block" style={{ background: propGrad }} />
            <h3 className="font-bold text-[15px] text-[var(--text)]">{title}</h3>
          </div>
          <p className="text-[11px] text-[var(--text-faint)] mt-0.5 ml-10">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black" style={{ color: accentColor }}>{stat}</div>
          <div className="text-[10px] text-[var(--text-faint)]">{statLabel}</div>
        </div>
      </div>

      {/* Sort control */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-[var(--text-faint)]">{visible.length} models</span>
        <SortBtn asc={asc} onToggle={() => setAsc((v) => !v)} />
      </div>

      {/* Bars */}
      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--text-faint)] text-center py-8">
          No data for this filter.
        </p>
      ) : (
        <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 420 }}>
          {sorted.map((m) => (
            <Bar
              key={m.id}
              model={m}
              val={chartKey === "intel" ? (m.intel ?? 0) : m.price}
              min={min}
              max={max}
              fmt={fmtVal}
              propGrad={propGrad}
              ossGrad={ossGrad}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main exported button + modal ─────────────────────────────────────────────
export function LLMBenchmarkButton() {
  const [open, setOpen] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    if (!open || apiData) return;
    setLoading(true);
    fetch("/api/llm-benchmarks?v=2")
      .then((r) => r.json())
      .then((json: ApiResponse) => {
        if (json.intelModels?.length) {
          setApiData(json);
          setUsingFallback(false);
        } else {
          setUsingFallback(true);
        }
      })
      .catch(() => setUsingFallback(true))
      .finally(() => setLoading(false));
  }, [open, apiData]);

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

  const intelModels = usingFallback ? FALLBACK_INTEL : (apiData?.intelModels ?? []);
  const priceModels = usingFallback ? FALLBACK_PRICE : (apiData?.priceModels ?? []);
  const totalModels = usingFallback ? FALLBACK_INTEL.length : (apiData?.totalModels ?? 0);
  const updatedAt   = apiData?.updatedAt ?? "";

  const openCount  = intelModels.filter((m) => m.open).length;

  const topIntel   = [...intelModels].sort((a, b) => (b.intel ?? 0) - (a.intel ?? 0))[0];
  const cheapest   = [...priceModels].sort((a, b) => a.price - b.price)[0];

  const fmtPrice = (v: number) => v < 1 ? `$${v}` : `$${v.toFixed(2)}`;

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
            {/* ── Header ── */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[var(--border)] shrink-0">
              <div>
                <h2 className="text-xl font-bold text-[var(--text)]">⚡ LLM Benchmarks</h2>
                <p className="text-[11px] text-[var(--text-faint)] mt-1">
                  {loading ? "Loading live data…" : usingFallback
                    ? <span className="text-amber-500">Using cached data — live prices unavailable</span>
                    : <>
                        {totalModels} models on{" "}
                        <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--accent-text)]">openrouter.ai</a>
                        {" · "}{intelModels.length} with intelligence scores
                        {updatedAt && ` · ${new Date(updatedAt).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}`}
                      </>
                  }
                </p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex bg-[var(--bg-muted)] rounded-full p-1 border border-[var(--border)] gap-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setShowOpenOnly(false)}
                    className={`px-3 py-1.5 rounded-full transition-all ${!showOpenOnly ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
                  >
                    All models
                  </button>
                  <button
                    onClick={() => setShowOpenOnly(true)}
                    className={`px-3 py-1.5 rounded-full transition-all ${showOpenOnly ? "bg-cyan-500 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
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
            <div className="flex items-center gap-5 px-6 py-2 border-b border-[var(--border)] bg-[var(--bg-muted)] shrink-0 text-xs text-[var(--text-faint)]">
              <span className="flex items-center gap-1.5">
                <span className="w-8 h-3 rounded-sm" style={{ background: "linear-gradient(90deg,#7c3aed,#a78bfa)" }} />
                Proprietary
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-8 h-3 rounded-sm" style={{ background: "linear-gradient(90deg,#0891b2,#22d3ee)" }} />
                Open weight
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">OSS</span>
              </span>
              <span className="ml-auto text-[10px]">ESC to close</span>
            </div>

            {/* ── Charts ── */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {loading ? (
                <div className="flex items-center justify-center py-24 text-[var(--text-muted)]">
                  <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mr-3" />
                  Loading live model data…
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
                  <ChartPanel
                    title="Intelligence"
                    subtitle="AAII Score · Higher is better"
                    accentColor="#8b5cf6"
                    propGrad="linear-gradient(90deg,#7c3aed,#a78bfa)"
                    ossGrad="linear-gradient(90deg,#0891b2,#22d3ee)"
                    models={intelModels}
                    chartKey="intel"
                    defaultAsc={false}
                    stat={topIntel ? String(topIntel.intel) : "—"}
                    statLabel="top score"
                    fmtVal={(v) => String(v)}
                    filterOpenOnly={showOpenOnly}
                  />
                  <ChartPanel
                    title="Price"
                    subtitle="USD / 1M tokens · Lower is better · Live"
                    accentColor="#f59e0b"
                    propGrad="linear-gradient(90deg,#d97706,#fbbf24)"
                    ossGrad="linear-gradient(90deg,#059669,#34d399)"
                    models={priceModels}
                    chartKey="price"
                    defaultAsc={true}
                    stat={cheapest ? fmtPrice(cheapest.price) : "—"}
                    statLabel="cheapest"
                    fmtVal={fmtPrice}
                    filterOpenOnly={showOpenOnly}
                  />
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-3 border-t border-[var(--border)] shrink-0 flex items-center justify-between bg-[var(--bg-muted)] rounded-b-2xl">
              <p className="text-[10px] text-[var(--text-faint)]">
                Intelligence: <a href="https://artificialanalysis.ai" target="_blank" rel="noopener noreferrer" className="underline">artificialanalysis.ai</a> (manual)
                {" · "}Prices: <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="underline">openrouter.ai</a> (live, 24h cache)
              </p>
              <a href="https://artificialanalysis.ai/leaderboards/models" target="_blank" rel="noopener noreferrer"
                className="text-xs text-[var(--accent-text)] hover:underline font-semibold">
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
