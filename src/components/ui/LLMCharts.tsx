"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";

// ─────────────────────────────────────────────────────────
// Data — sourced from public benchmarks (artificialanalysis.ai,
// published model cards, LMSYS leaderboard). Update as models release.
// ─────────────────────────────────────────────────────────
const ALL_MODELS = [
  // name, intelligence (AAII score), speed (tok/s), price ($/1M blended), isOpen
  { name: "Claude Opus 4.8",   short: "Cl.Opus",  intel: 61, speed: 60,  price: 4.10, open: false, color: "#8b5cf6" },
  { name: "GPT-4o",            short: "GPT-4o",   intel: 60, speed: 64,  price: 2.50, open: false, color: "#10b981" },
  { name: "Gemini 2.0 Pro",    short: "Gem 2.0",  intel: 57, speed: 140, price: 1.25, open: false, color: "#3b82f6" },
  { name: "Grok 4.3",          short: "Grok 4",   intel: 53, speed: 44,  price: 0.70, open: false, color: "#f59e0b" },
  { name: "DeepSeek V4",       short: "DS V4",    intel: 52, speed: 42,  price: 0.20, open: true,  color: "#06b6d4" },
  { name: "Mistral Large",     short: "Mist.L",   intel: 45, speed: 80,  price: 0.40, open: true,  color: "#ec4899" },
  { name: "Llama 3.3 70B",     short: "Llama 70", intel: 43, speed: 120, price: 0.09, open: true,  color: "#f97316" },
  { name: "Qwen2.5 72B",       short: "Qwen 72",  intel: 42, speed: 95,  price: 0.07, open: true,  color: "#84cc16" },
  { name: "Llama 3.1 8B",      short: "Llama 8",  intel: 28, speed: 335, price: 0.02, open: true,  color: "#64748b" },
  { name: "Gemma 3 27B",       short: "Gemma 27", intel: 38, speed: 110, price: 0.05, open: true,  color: "#a78bfa" },
];

type ChartKey = "intel" | "speed" | "price";

const CHARTS: { key: ChartKey; label: string; unit: string; desc: string; higherBetter: boolean; color: string }[] = [
  { key: "intel", label: "Intelligence",  unit: "",       desc: "AAII Score · Higher is better",         higherBetter: true,  color: "#8b5cf6" },
  { key: "speed", label: "Speed",         unit: " tok/s", desc: "Output tokens/sec · Higher is better",  higherBetter: true,  color: "#f59e0b" },
  { key: "price", label: "Price",         unit: "/1M",    desc: "USD per 1M tokens · Lower is better",   higherBetter: false, color: "#ef4444" },
];

type Model = typeof ALL_MODELS[0];

function sortModels(models: Model[], key: ChartKey, higherBetter: boolean) {
  return [...models].sort((a, b) =>
    higherBetter ? b[key] - a[key] : a[key] - b[key]
  );
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: Model; value: number }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const val = payload[0].value;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2.5 shadow-xl text-sm">
      <p className="font-semibold text-[var(--text)] mb-1">{d.name}</p>
      <p className="text-[var(--text-muted)]">
        {val}{d.open ? " · Open source" : " · Proprietary"}
      </p>
    </div>
  );
};

function SingleChart({
  models,
  chartKey,
  unit,
  color,
  higherBetter,
}: {
  models: Model[];
  chartKey: ChartKey;
  unit: string;
  color: string;
  higherBetter: boolean;
}) {
  const sorted = sortModels(models, chartKey, higherBetter);
  const data = sorted.map((m) => ({
    ...m,
    value: m[chartKey],
    label: chartKey === "price"
      ? `$${m[chartKey]}`
      : `${m[chartKey]}${unit}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 24, right: 4, left: -10, bottom: 60 }}>
        <XAxis
          dataKey="short"
          tick={{ fontSize: 10, fill: "var(--text-faint)" }}
          angle={-40}
          textAnchor="end"
          interval={0}
          tickLine={false}
          axisLine={false}
        />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-muted)", radius: 4 }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.open ? entry.color : color}
              opacity={entry.open ? 0.75 : 1}
            />
          ))}
          <LabelList
            dataKey="label"
            position="top"
            style={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function LLMCharts() {
  const [showOpen, setShowOpen] = useState(false);

  const models = showOpen
    ? ALL_MODELS.filter((m) => m.open)
    : ALL_MODELS;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div>
          <h2 className="font-bold text-[var(--text)] text-base">LLM Benchmarks</h2>
          <p className="text-xs text-[var(--text-faint)] mt-0.5">Intelligence · Speed · Price</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-muted)] rounded-full p-1 border border-[var(--border)]">
            <button
              onClick={() => setShowOpen(false)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                !showOpen
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              All models
            </button>
            <button
              onClick={() => setShowOpen(true)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                showOpen
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Open source only
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-2 bg-[var(--bg-muted)] border-b border-[var(--border)]">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
          <div className="w-3 h-3 rounded-sm bg-[var(--accent)]" />
          Proprietary
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
          <div className="w-3 h-3 rounded-sm bg-[#06b6d4] opacity-75" />
          Open source
        </div>
        <span className="ml-auto text-[10px] text-[var(--text-faint)]">
          Source: artificialanalysis.ai · {new Date().getFullYear()}
        </span>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
        {CHARTS.map(({ key, label, unit, desc, higherBetter, color }) => (
          <div key={key} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ background: color }}
              />
              <span className="font-semibold text-sm text-[var(--text)]">{label}</span>
            </div>
            <p className="text-[10px] text-[var(--text-faint)] mb-2">{desc}</p>
            <SingleChart
              models={models}
              chartKey={key}
              unit={unit}
              color={color}
              higherBetter={higherBetter}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-muted)] text-center">
        <a
          href="https://artificialanalysis.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--text-faint)] hover:text-[var(--accent-text)] transition-colors"
        >
          Full leaderboard & methodology at artificialanalysis.ai →
        </a>
      </div>
    </div>
  );
}
