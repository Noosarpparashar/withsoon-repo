"use client";

import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

// ── Real data from artificialanalysis.ai leaderboard ───────────────────────
// open: true = open-weight model; false = proprietary
const ALL_MODELS = [
  { name: "Claude Opus 4.8 (max)",    short: "Cl.Opus 4.8",    intel: 61, price: 4.10, open: false },
  { name: "GPT-5.5 (xhigh)",          short: "GPT-5.5",        intel: 60, price: 4.35, open: false },
  { name: "GPT-5.5 (high)",           short: "GPT-5.5 H",      intel: 59, price: 4.35, open: false },
  { name: "Claude Opus 4.7 (max)",    short: "Cl.Opus 4.7",    intel: 57, price: 4.10, open: false },
  { name: "Gemini 3.1 Pro Preview",   short: "Gem 3.1",        intel: 57, price: 1.74, open: false },
  { name: "GPT-5.5 (medium)",         short: "GPT-5.5 M",      intel: 57, price: 4.35, open: false },
  { name: "Qwen3.7 Max",              short: "Qwen3.7",        intel: 57, price: 1.43, open: false },
  { name: "Gemini 3.5 Flash",         short: "Gem 3.5 F",      intel: 55, price: 1.31, open: false },
  { name: "MiniMax-M3",               short: "MiniMax",        intel: 55, price: 0.22, open: false },
  { name: "Kimi K2.6",                short: "Kimi K2",        intel: 54, price: 0.20, open: false },
  { name: "MiMo-V2.5-Pro",            short: "MiMo",           intel: 54, price: 0.18, open: true  },
  { name: "Grok 4.3 (high)",          short: "Grok 4.3",       intel: 53, price: 0.70, open: false },
  { name: "Muse Spark",               short: "Muse",           intel: 52, price: 0.56, open: false },
  { name: "DeepSeek V4 Pro (Max)",    short: "DeepSeek V4",    intel: 52, price: 0.18, open: true  },
  { name: "Nemotron 3 Ultra",         short: "Nemotron",       intel: 48, price: 0.20, open: true  },
  { name: "gpt-oss-120b (high)",      short: "gpt-oss",        intel: 33, price: 0.14, open: true  },
  { name: "Mercury 2",                short: "Mercury 2",      intel: 33, price: 0.14, open: false },
  { name: "Qwen3.5 0.8B",            short: "Qwen3.5",        intel: 11, price: 0.01, open: true  },
];

type Model = typeof ALL_MODELS[0];

// ── Colours ─────────────────────────────────────────────────────────────────
const PROP_COLOR = "#8b5cf6";
const OPEN_COLOR = "#06b6d4";
const PRICE_COLOR = "#f59e0b";

// ── Tooltip ──────────────────────────────────────────────────────────────────
function ChartTooltip({
  active, payload, chartKey,
}: {
  active?: boolean;
  payload?: { payload: Model; value: number }[];
  chartKey: "intel" | "price";
}) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2.5 shadow-2xl text-sm z-50 pointer-events-none">
      <p className="font-semibold text-[var(--text)]">{m.name}</p>
      <p className="text-[var(--text-muted)] mt-0.5">
        {chartKey === "intel"
          ? `Intelligence: ${m.intel}`
          : `$${m.price} / 1M tokens`}
      </p>
      <p className="text-[10px] mt-1 text-[var(--text-faint)]">
        {m.open ? "🔓 Open weight" : "🔒 Proprietary"}
      </p>
    </div>
  );
}

// ── Single bar chart ─────────────────────────────────────────────────────────
function Chart({
  models,
  chartKey,
  higherBetter,
  barColor,
  valueFormatter,
}: {
  models: Model[];
  chartKey: "intel" | "price";
  higherBetter: boolean;
  barColor: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  valueFormatter: (v: any) => string;
}) {
  const sorted = [...models].sort((a, b) =>
    higherBetter ? b[chartKey] - a[chartKey] : a[chartKey] - b[chartKey]
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={sorted} margin={{ top: 28, right: 8, left: -8, bottom: 80 }}>
        <XAxis
          dataKey="short"
          tick={{ fontSize: 10, fill: "var(--text-faint)" }}
          angle={-45}
          textAnchor="end"
          interval={0}
          tickLine={false}
          axisLine={false}
        />
        <YAxis hide />
        <Tooltip
          content={<ChartTooltip chartKey={chartKey} />}
          cursor={{ fill: "rgba(139,92,246,0.08)", radius: 4 }}
        />
        <Bar dataKey={chartKey} radius={[5, 5, 0, 0]} maxBarSize={32} isAnimationActive>
          {sorted.map((m, i) => (
            <Cell key={i} fill={m.open ? OPEN_COLOR : barColor} opacity={m.open ? 0.85 : 1} />
          ))}
          <LabelList
            dataKey={chartKey}
            formatter={valueFormatter}
            position="top"
            style={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: 700 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main modal component ─────────────────────────────────────────────────────
export function LLMBenchmarkButton() {
  const [open, setOpen] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // lock scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const models = showOpenOnly ? ALL_MODELS.filter((m) => m.open) : ALL_MODELS;

  return (
    <>
      {/* Trigger button */}
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

      {/* Modal */}
      {open && (
        <div
          ref={backdropRef}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ animation: "fadeIn 0.15s ease" }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel — slides up */}
          <div
            className="relative w-full sm:max-w-5xl bg-[var(--bg-card)] border border-[var(--border)] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              maxHeight: "90vh",
              animation: "slideUp 0.25s cubic-bezier(0.34,1.2,0.64,1)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
              <div>
                <h2 className="text-lg font-bold text-[var(--text)]">⚡ LLM Benchmarks</h2>
                <p className="text-xs text-[var(--text-faint)] mt-0.5">
                  Intelligence score & price — {ALL_MODELS.length} models · Source: artificialanalysis.ai
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Toggle */}
                <div className="flex items-center bg-[var(--bg-muted)] rounded-full p-1 border border-[var(--border)] text-xs font-semibold gap-1">
                  <button
                    onClick={() => setShowOpenOnly(false)}
                    className={`px-3 py-1.5 rounded-full transition-colors ${
                      !showOpenOnly ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    All models
                  </button>
                  <button
                    onClick={() => setShowOpenOnly(true)}
                    className={`px-3 py-1.5 rounded-full transition-colors ${
                      showOpenOnly ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    Open source
                  </button>
                </div>
                {/* Close */}
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
            <div className="flex items-center gap-5 px-6 py-2.5 border-b border-[var(--border)] bg-[var(--bg-muted)] shrink-0">
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: PROP_COLOR }} />
                Proprietary
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
                <span className="w-3 h-3 rounded-sm inline-block opacity-85" style={{ background: OPEN_COLOR }} />
                Open weight
              </span>
              <span className="ml-auto text-[10px] text-[var(--text-faint)]">
                Hover bars for details · ESC to close
              </span>
            </div>

            {/* Charts */}
            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)] p-2">
                {/* Intelligence */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ background: PROP_COLOR }} />
                    <span className="font-bold text-sm text-[var(--text)]">Intelligence</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-faint)] mb-3">
                    Artificial Analysis Intelligence Index · Higher is better
                  </p>
                  <Chart
                    models={models}
                    chartKey="intel"
                    higherBetter
                    barColor={PROP_COLOR}
                    valueFormatter={(v) => String(v)}
                  />
                </div>

                {/* Price */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ background: PRICE_COLOR }} />
                    <span className="font-bold text-sm text-[var(--text)]">Price</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-faint)] mb-3">
                    USD per 1M tokens (blended) · Lower is better
                  </p>
                  <Chart
                    models={models}
                    chartKey="price"
                    higherBetter={false}
                    barColor={PRICE_COLOR}
                    valueFormatter={(v) => `$${v}`}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[var(--border)] shrink-0 flex items-center justify-between">
              <p className="text-[10px] text-[var(--text-faint)]">
                Data sourced from artificialanalysis.ai · Updated manually as models release
              </p>
              <a
                href="https://artificialanalysis.ai/leaderboards/models"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--accent-text)] hover:underline font-medium"
              >
                Full leaderboard →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </>
  );
}
