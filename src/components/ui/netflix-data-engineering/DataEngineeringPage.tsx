"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MockInterviewTab } from "../netflix-tabs/MockInterviewTab";
import { CheatSheetTab } from "../netflix-tabs/CheatSheetTab";
import {
  ARCHITECTURE_LAYERS,
  BATCH_SECTIONS,
  CAPACITY_SECTIONS,
  DATA_ENGINEERING_TABS,
  DATA_QUIZ_CARDS,
  DATA_TRACK_NUMBERS,
  GOVERNANCE_SECTIONS,
  INGESTION_SECTIONS,
  INTERVIEW_QA_SECTIONS,
  LAKEHOUSE_SECTIONS,
  LATENCY_SLA_ROWS,
  MODELING_SECTIONS,
  ML_SERVING_SECTIONS,
  NFRS,
  PERFORMANCE_SECTIONS,
  RELIABILITY_SECTIONS,
  REQUIREMENT_GROUPS,
  STACK_SECTIONS,
  START_HERE_PATH,
  START_HERE_SCOPE,
  STREAMING_SECTIONS,
  normalizeDataEngineeringTab,
  type DataEngineeringTabSlug,
} from "./data";

const T = {
  red: "#e50914",
  amber: "#f59e0b",
  gold: "#fbbf24",
  teal: "#14b8a6",
  green: "#22c55e",
  blue: "#38bdf8",
  indigo: "#818cf8",
  purple: "#8b5cf6",
  bg: "var(--bg)",
  bg2: "var(--bg-muted)",
  card: "var(--bg-card)",
  card2: "color-mix(in srgb, var(--bg-muted) 82%, var(--bg-card))",
  border: "var(--border)",
  text: "var(--text)",
  muted: "var(--text-muted)",
  faint: "var(--text-faint)",
} as const;

const CHAPTER_META: Record<
  DataEngineeringTabSlug,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    accent: string;
    mood: [string, string];
    signal: string[];
    interviewAngle: string;
  }
> = {
  "start-here": {
    eyebrow: "Track Setup",
    title: "Think like the owner of Netflix's data platform.",
    subtitle:
      "This is a guided data-engineering journey: you clarify scope, map the platform, design correctness rules, and learn how to explain every decision cleanly in an interview.",
    accent: T.red,
    mood: [T.red, T.teal],
    signal: ["Separate from backend", "Guided prep flow", "Interview-first framing"],
    interviewAngle:
      "Start by narrowing scope and proving you know this is a data-platform problem, not a playback-API problem.",
  },
  requirements: {
    eyebrow: "Scope & SLAs",
    title: "Translate business questions into metrics, freshness, and correctness rules.",
    subtitle:
      "This chapter anchors the design around what the platform must answer, how fresh it must be, and where availability or correctness cannot slip.",
    accent: T.amber,
    mood: [T.amber, T.red],
    signal: ["Business metrics", "Latency targets", "Correctness boundaries"],
    interviewAngle:
      "A senior answer spends the first few minutes locking the metrics, consumers, SLAs, and trade-off boundaries.",
  },
  architecture: {
    eyebrow: "Big Picture",
    title: "Show the entire platform before you disappear into implementation detail.",
    subtitle:
      "The fastest way to build confidence is to orient the interviewer with one clean cross-platform flow from sources to analytics, ML, and serving consumers.",
    accent: T.blue,
    mood: [T.blue, T.purple],
    signal: ["Source to sink", "Streaming + batch", "Analytics + ML serving"],
    interviewAngle:
      "Give the interviewer a stable mental map first, then zoom into ingestion, streaming logic, and reliability details.",
  },
  ingestion: {
    eyebrow: "Source of Truth",
    title: "Design ingestion so the platform can evolve without chaos.",
    subtitle:
      "This is where event taxonomy, contracts, CDC, and topic design either keep the system sane or poison every downstream consumer.",
    accent: T.purple,
    mood: [T.purple, T.blue],
    signal: ["Kafka topics", "CDC patterns", "Schema contracts"],
    interviewAngle:
      "Strong data engineers justify partition keys, event fields, and compatibility rules instead of hand-waving them away.",
  },
  streaming: {
    eyebrow: "Real-Time Logic",
    title: "Get watch-time logic, sessionization, and lateness handling exactly right.",
    subtitle:
      "This is the hardest part to fake. If the stream logic is wrong, every dashboard, feature, and business metric becomes untrustworthy.",
    accent: T.teal,
    mood: [T.teal, T.blue],
    signal: ["Heartbeat truth", "Event-time state", "Late-data correction"],
    interviewAngle:
      "The interview usually turns here: can you explain how watched seconds are actually computed, corrected, and trusted?",
  },
  batch: {
    eyebrow: "Daily Truth",
    title: "Use batch pipelines for exactness, recomputation, and downstream training sets.",
    subtitle:
      "Streaming gives freshness. Batch gives precision, auditability, and the ability to rebuild business-critical outputs after logic changes.",
    accent: T.green,
    mood: [T.green, T.teal],
    signal: ["Daily aggregates", "Training data", "Airflow orchestration"],
    interviewAngle:
      "Show that you know when to stop forcing everything into streaming and when to let batch own correctness.",
  },
  lakehouse: {
    eyebrow: "Storage Layers",
    title: "Turn raw events into a lakehouse that people can trust and actually use.",
    subtitle:
      "Bronze, Silver, and Gold are not buzzwords here; they are boundaries for replay safety, transformation ownership, and business consumption.",
    accent: T.gold,
    mood: [T.gold, T.teal],
    signal: ["Bronze/Silver/Gold", "Iceberg", "Warehouse + OLAP serving"],
    interviewAngle:
      "The best answers explain why each layer exists and what mistakes happen when you blur those responsibilities.",
  },
  modeling: {
    eyebrow: "Data Contracts",
    title: "Model tables so analysts, BI, ML, and product teams can all move fast safely.",
    subtitle:
      "This chapter turns the platform into concrete tables, marts, dimensions, and transformation patterns people can build on.",
    accent: T.indigo,
    mood: [T.indigo, T.purple],
    signal: ["Fact tables", "Dimensions", "ELT/dbt patterns"],
    interviewAngle:
      "Naming the tables is not enough. You need to show which entities exist, why they exist, and how they evolve over time.",
  },
  reliability: {
    eyebrow: "Operational Trust",
    title: "Design for replay, reconciliation, quarantine, and clean recovery when reality gets messy.",
    subtitle:
      "This is where seniority shows. Reliable platforms assume duplicates, late data, bad payloads, bugs, and backfills will happen constantly.",
    accent: T.red,
    mood: [T.red, T.amber],
    signal: ["DLQ + replay", "Batch reconciliation", "DQ severity"],
    interviewAngle:
      "If your answer cannot survive bugs and late data, the system is not production-ready no matter how pretty the architecture looks.",
  },
  "ml-serving": {
    eyebrow: "Consumers",
    title: "Make the platform useful for ML features, real-time analytics, and product decisions.",
    subtitle:
      "The pipeline only matters because real internal customers depend on it for recommendations, dashboards, experimentation, and business reporting.",
    accent: T.green,
    mood: [T.green, T.indigo],
    signal: ["Feature store", "Recommendation data flow", "Real-time serving"],
    interviewAngle:
      "Keep the focus on data freshness, quality, and feature consistency rather than drifting into model-architecture territory.",
  },
  stack: {
    eyebrow: "Tech Choices",
    title: "Map the design to concrete AWS and open-source tools without sounding like a logo parade.",
    subtitle:
      "This chapter helps the end user understand what each layer is for and how to defend platform choices when the interviewer asks why these tools fit the workload.",
    accent: T.blue,
    mood: [T.blue, T.green],
    signal: ["AWS mapping", "Open-source stack", "Decision matrix"],
    interviewAngle:
      "Explain the role each tool plays, what trade-off it resolves, and when you would choose a different option.",
  },
  governance: {
    eyebrow: "Control Plane",
    title: "Protect data, document ownership, and make compliance operational instead of aspirational.",
    subtitle:
      "Governance is part of the system, not a postscript. This is how the platform stays usable, discoverable, and safe as more teams depend on it.",
    accent: T.purple,
    mood: [T.purple, T.red],
    signal: ["Lineage", "PII handling", "GDPR workflows"],
    interviewAngle:
      "A strong answer describes who can access what, how datasets are cataloged, and how deletion or masking propagates across the stack.",
  },
  "performance-cost": {
    eyebrow: "Efficiency",
    title: "Keep the platform fast enough and cheap enough to survive scale.",
    subtitle:
      "Performance tuning and cost control are core design responsibilities at Netflix scale, not cleanup work after the architecture is done.",
    accent: T.amber,
    mood: [T.amber, T.green],
    signal: ["Partitioning", "Warehouse tuning", "Storage efficiency"],
    interviewAngle:
      "This is where you show you understand skew, small files, cluster economics, and why a theoretically correct design can still be operationally bad.",
  },
  capacity: {
    eyebrow: "Math",
    title: "Derive the scale numbers so the architecture feels inevitable.",
    subtitle:
      "When the math is clean, the downstream choices about Kafka, Flink, Spark, and storage stop feeling arbitrary and start feeling engineered.",
    accent: T.red,
    mood: [T.red, T.gold],
    signal: ["Event volume", "Partition math", "Retention sizing"],
    interviewAngle:
      "Do the first-principles math out loud. It is one of the fastest ways to sound credible in a design round.",
  },
  "interview-qa": {
    eyebrow: "Defense",
    title: "Prepare for the follow-up questions that separate strong candidates from surface-level ones.",
    subtitle:
      "This chapter turns the design into a defended answer by rehearsing the trade-offs, definitions, quick references, and closing narrative.",
    accent: T.indigo,
    mood: [T.indigo, T.amber],
    signal: ["Follow-up probes", "Key metrics", "Quick references"],
    interviewAngle:
      "The interviewer is not just listening to your design. They are looking for whether you can defend it under pressure.",
  },
  quiz: {
    eyebrow: "Recall",
    title: "Turn the content into fast recall instead of passive familiarity.",
    subtitle:
      "Use the quiz to convert big ideas into memory triggers you can use under interview stress.",
    accent: T.teal,
    mood: [T.teal, T.green],
    signal: ["Active recall", "Related-tab jumps", "Memory reinforcement"],
    interviewAngle:
      "You are not studying to recognize the answer. You are studying to speak it from memory.",
  },
  "mock-interview": {
    eyebrow: "Practice",
    title: "Pressure-test the full data-engineering narrative in interview mode.",
    subtitle:
      "This is the place to practice pacing, scope control, pushback handling, and the shape of a real senior round.",
    accent: T.green,
    mood: [T.green, T.blue],
    signal: ["Role-locked", "Pushback prompts", "Self-scoring"],
    interviewAngle:
      "Treat this like a rehearsal room, not a reference page.",
  },
  "cheat-sheet": {
    eyebrow: "Last Review",
    title: "Condense the entire flow into the version you can hold in your head right before the round.",
    subtitle:
      "Use this right before the interview to refresh the answer shape, core numbers, and critical distinctions.",
    accent: T.red,
    mood: [T.red, T.indigo],
    signal: ["Copyable summary", "Role-locked", "Fast revision"],
    interviewAngle:
      "This is the last-mile pass before you close the tab and speak from memory.",
  },
};

const MODEL_NODES = [
  {
    id: "fact-watch",
    label: "FACT_WATCH_SESSION",
    type: "fact",
    color: T.red,
    x: 28,
    y: 34,
    summary:
      "Session grain table with watch-time truth, buffering ratio, bitrate, completion, and partition date.",
    fields: [
      "session_id, profile_id, content_id, device_id",
      "start_ts, end_ts, watched_seconds, completion_pct",
      "buffering_ratio, avg_bitrate, country_code, app_version",
    ],
  },
  {
    id: "fact-impression",
    label: "FACT_CONTENT_IMPRESSION",
    type: "fact",
    color: T.amber,
    x: 58,
    y: 18,
    summary:
      "Captures browse and recommendation exposure with conversion context from impression to click or play.",
    fields: [
      "impression_id, profile_id, content_id, rank_position",
      "page_or_rail_context, event_ts, country, device",
      "converted_to_click_or_play",
    ],
  },
  {
    id: "fact-search",
    label: "FACT_SEARCH_EVENT",
    type: "fact",
    color: T.teal,
    x: 58,
    y: 52,
    summary:
      "Stores query intent, result quality, clicked content, latency, and session context for search analytics.",
    fields: [
      "query_text, normalized_query, result_count",
      "clicked_content_id, latency_ms, device, session_context",
    ],
  },
  {
    id: "dim-user",
    label: "DIM_USER / PROFILE",
    type: "dimension",
    color: T.blue,
    x: 8,
    y: 16,
    summary: "Conformed user and profile identity dimensions with stable keys and documented SCD behavior.",
    fields: ["user_key, profile_key, plan, country", "preferences, lifecycle flags, SCD strategy"],
  },
  {
    id: "dim-content",
    label: "DIM_CONTENT",
    type: "dimension",
    color: T.purple,
    x: 82,
    y: 34,
    summary:
      "Conformed content metadata for title, genre, locale, release details, and business ownership joins.",
    fields: ["content_key, title, genre, language", "release metadata, rights tags, program hierarchy"],
  },
  {
    id: "dim-device",
    label: "DIM_DEVICE",
    type: "dimension",
    color: T.green,
    x: 26,
    y: 68,
    summary: "Tracks device class, OS, app version, network context, and playback capability characteristics.",
    fields: ["device_key, device_type, OS", "app_version, network traits, capability flags"],
  },
  {
    id: "dim-date",
    label: "DIM_DATE",
    type: "dimension",
    color: T.gold,
    x: 56,
    y: 82,
    summary: "Calendar dimension for daily, weekly, regional, and fiscal rollups used by Gold marts.",
    fields: ["date_key, event_date, week, month", "quarter, fiscal attributes, holiday flags"],
  },
  {
    id: "gold-report",
    label: "RPT_CONTENT_DAILY_METRICS",
    type: "gold",
    color: T.indigo,
    x: 82,
    y: 72,
    summary:
      "Gold business mart for watch hours, completion, title popularity, and curated reporting definitions.",
    fields: ["watch_hours, completion_rate, starts, finishes", "regional slices, owned business definitions"],
  },
] as const;

const ARCHITECTURE_ROUTES = [
  {
    title: "Streaming Route",
    color: T.teal,
    flow: ["Client events", "Kafka", "Flink", "Silver", "Pinot / Redis / alerts"],
  },
  {
    title: "Batch Route",
    color: T.amber,
    flow: ["CDC + landed files", "Bronze", "Spark / Glue", "Gold", "Warehouse / BI / finance"],
  },
  {
    title: "Serving Route",
    color: T.green,
    flow: ["Curated data", "Feature store", "ML / recsys", "Dashboards", "Internal consumers"],
  },
] as const;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function PageHeader({
  activeTab,
  activeIndex,
  onNavigate,
}: {
  activeTab: DataEngineeringTabSlug;
  activeIndex: number;
  onNavigate: (tab: DataEngineeringTabSlug) => void;
}) {
  return (
    <div className="shrink-0 z-30 border-b" style={{ background: T.bg, borderColor: T.border }}>
      <div className="px-4 h-12 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <span className="text-lg font-black tracking-tight" style={{ color: T.red }}>
            N
          </span>
          <span className="w-px h-3 hidden sm:block" style={{ background: T.border }} />
          <span className="text-xs font-semibold hidden sm:block" style={{ color: T.faint }}>
            withsoon
          </span>
        </Link>
        <span className="hidden sm:block text-xs" style={{ color: T.faint }}>
          /
        </span>
        <Link href="/system-design" className="hidden sm:block text-xs hover:underline" style={{ color: T.faint }}>
          System Design
        </Link>
        <span className="hidden sm:block text-xs" style={{ color: T.faint }}>
          /
        </span>
        <span className="hidden sm:block text-xs font-semibold" style={{ color: T.text }}>
          Netflix Data Engineering
        </span>
        <span
          className="hidden md:inline-flex text-[10px] px-2 py-1 rounded-full font-semibold"
          style={{ background: `${T.teal}14`, color: T.teal, border: `1px solid ${T.teal}26` }}
        >
          Senior Data Track
        </span>
        <div className="flex-1" />
        <div className="hidden lg:flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: T.faint }}>
              Chapter
            </p>
            <p className="text-sm font-semibold" style={{ color: T.text }}>
              {activeIndex + 1} / {DATA_ENGINEERING_TABS.length}
            </p>
          </div>
          <div className="w-28 h-2 rounded-full overflow-hidden" style={{ background: `${T.border}` }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${((activeIndex + 1) / DATA_ENGINEERING_TABS.length) * 100}%`,
                background: `linear-gradient(90deg, ${T.red}, ${T.amber}, ${T.teal})`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="overflow-x-auto no-scrollbar px-4">
          <div className="flex min-w-max items-end gap-1 py-2" role="tablist" aria-label="Netflix data engineering sections">
            {DATA_ENGINEERING_TABS.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  role="tab"
                  aria-selected={active}
                  className="relative rounded-t-xl px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer"
                  style={{
                    color: active ? T.text : T.muted,
                    background: active ? `${T.red}14` : "transparent",
                    border: active ? `1px solid ${T.red}24` : "1px solid transparent",
                  }}
                >
                  {tab.label}
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-[1px] h-0.5 rounded-full" style={{ background: T.red }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChapterHero({ tab, mins }: { tab: DataEngineeringTabSlug; mins: number }) {
  const meta = CHAPTER_META[tab];
  return (
    <div
      className="chapter-hero relative overflow-hidden rounded-[28px] border p-6 md:p-8"
      style={{
        borderColor: `${meta.accent}2d`,
        background: `
          radial-gradient(circle at top right, ${meta.mood[1]}18 0, transparent 26%),
          radial-gradient(circle at left center, ${meta.mood[0]}18 0, transparent 28%),
          linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)),
          ${T.card}
        `,
        boxShadow: `0 30px 60px rgba(0,0,0,0.22)`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${meta.mood[0]}, ${T.amber}, ${meta.mood[1]})` }}
      />
      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr] items-start relative z-10">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: meta.accent }}>
              {meta.eyebrow}
            </span>
            <span
              className="text-[11px] px-3 py-1 rounded-full"
              style={{ background: `${T.bg2}`, color: T.faint, border: `1px solid ${T.border}` }}
            >
              ~{mins} min
            </span>
          </div>
          <h1
            className="text-3xl md:text-[3rem] font-black tracking-[-0.04em] leading-[0.96] max-w-4xl mb-4"
            style={{ color: T.text }}
          >
            {meta.title}
          </h1>
          <p className="text-base leading-relaxed max-w-3xl mb-6" style={{ color: T.muted }}>
            {meta.subtitle}
          </p>
          <div className="flex flex-wrap gap-2">
            {meta.signal.map((item) => (
              <span
                key={item}
                className="text-[11px] px-3 py-1.5 rounded-full"
                style={{ background: `${meta.accent}12`, color: meta.accent, border: `1px solid ${meta.accent}26` }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-2xl p-4" style={{ background: `${T.bg2}`, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: meta.accent }}>
              What The Interviewer Is Testing
            </p>
            <p className="text-sm leading-relaxed" style={{ color: T.muted }}>
              {meta.interviewAngle}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {DATA_TRACK_NUMBERS.slice(0, 3).map((item) => (
              <div key={item.label} className="rounded-2xl p-3" style={{ background: `${T.bg2}`, border: `1px solid ${T.border}` }}>
                <p className="text-lg font-black leading-none" style={{ color: item.color }}>
                  {item.value}
                </p>
                <p className="text-[10px] mt-1 uppercase tracking-[0.16em]" style={{ color: T.faint }}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowRibbon({
  sections,
  color,
  activeIndex,
  onSelect,
}: {
  sections: Array<{ heading: string; items: string[] }>;
  color: string;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="flex min-w-max items-center gap-2 py-1">
        {sections.map((section, index) => {
          const active = index === activeIndex;
          return (
            <div key={section.heading} className="flex items-center gap-2">
              <button
                onClick={() => onSelect(index)}
                className="flow-chip relative rounded-[22px] border px-4 py-3 text-left min-w-[210px] transition-all duration-250 cursor-pointer"
                style={{
                  background: active ? `linear-gradient(135deg, ${color}1a, ${T.bg2})` : T.card,
                  borderColor: active ? `${color}42` : T.border,
                  boxShadow: active ? `0 16px 30px ${color}14` : "none",
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="w-9 h-9 rounded-2xl flex items-center justify-center text-[11px] font-black shrink-0"
                    style={{ background: `${color}18`, color }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black mb-1" style={{ color }}>
                      Stage
                    </p>
                    <p className="text-sm font-bold leading-5" style={{ color: active ? T.text : T.muted }}>
                      {section.heading}
                    </p>
                  </div>
                </div>
              </button>
              {index < sections.length - 1 && (
                <div className="flex items-center justify-center w-10 h-10 shrink-0">
                  <svg width="36" height="18" viewBox="0 0 36 18" fill="none" aria-hidden="true">
                    <path d="M2 9H31" stroke={color} strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M24 2L32 9L24 16" stroke={color} strokeOpacity="0.85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VisualLegend({ items, color }: { items: string[]; color: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.slice(0, 3).map((item, index) => (
        <div
          key={item}
          className="rounded-[22px] border p-4"
          style={{ background: index === 0 ? `${color}10` : T.bg2, borderColor: `${color}22` }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2" style={{ color }}>
            {index === 0 ? "Primary idea" : index === 1 ? "Support rule" : "Outcome"}
          </p>
          <p className="text-sm leading-6" style={{ color: T.muted }}>
            {item}
          </p>
        </div>
      ))}
    </div>
  );
}

function DetailStage({
  section,
  color,
  chapterLabel,
}: {
  section: { heading: string; items: string[] };
  color: string;
  chapterLabel: string;
}) {
  const primary = section.items[0];
  const remaining = section.items.slice(1);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[28px] border p-6 relative overflow-hidden" style={{ background: T.card, borderColor: `${color}2a` }}>
        <div className="absolute -right-10 top-0 h-40 w-40 rounded-full blur-3xl" style={{ background: `${color}18` }} />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-3" style={{ color }}>
            {chapterLabel} flow
          </p>
          <h3 className="text-2xl font-black tracking-[-0.03em] mb-4" style={{ color: T.text }}>
            {section.heading}
          </h3>
          <div className="rounded-[24px] border p-5 mb-4" style={{ background: `${color}0d`, borderColor: `${color}24` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3" style={{ color }}>
              Visual anchor
            </p>
            <p className="text-base leading-8" style={{ color: T.muted }}>
              {primary}
            </p>
          </div>
          <VisualLegend items={section.items} color={color} />
        </div>
      </div>

      <div className="rounded-[28px] border p-6" style={{ background: T.card, borderColor: T.border }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color }}>
            Click-through breakdown
          </p>
          <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: `${color}12`, color, border: `1px solid ${color}24` }}>
            {section.items.length} signals
          </span>
        </div>
        <div className="space-y-3">
          {remaining.map((item, index) => (
            <button
              key={item}
              className="w-full text-left rounded-[22px] border p-4 cursor-default"
              style={{ background: index % 2 === 0 ? T.bg2 : T.card2, borderColor: `${T.border}` }}
            >
              <div className="flex items-start gap-3">
                <span className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <p className="text-sm leading-7" style={{ color: T.muted }}>
                  {item}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NarrativeTab({
  sections,
  color,
  chapterLabel,
}: {
  sections: Array<{ heading: string; items: string[] }>;
  color: string;
  chapterLabel: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [sections]);

  const activeSection = sections[activeIndex] ?? sections[0];

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border p-5" style={{ background: T.card, borderColor: `${color}22` }}>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color }}>
              Guided visual flow
            </p>
            <p className="text-sm mt-1" style={{ color: T.faint }}>
              Move left to right and open a stage instead of reading one long wall of text.
            </p>
          </div>
          <span className="text-[11px] px-3 py-1.5 rounded-full" style={{ background: `${color}12`, color, border: `1px solid ${color}24` }}>
            {activeIndex + 1} / {sections.length}
          </span>
        </div>
        <FlowRibbon sections={sections} color={color} activeIndex={activeIndex} onSelect={setActiveIndex} />
      </div>
      {activeSection ? <DetailStage section={activeSection} color={color} chapterLabel={chapterLabel} /> : null}
    </div>
  );
}

function StartHereTab({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div
          className="rounded-[28px] border p-6 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${T.red}12, transparent 55%), ${T.card}`, borderColor: `${T.red}2a` }}
        >
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full blur-3xl" style={{ background: `${T.teal}26` }} />
          <p className="text-[10px] font-black uppercase tracking-[0.24em] mb-3 relative z-10" style={{ color: T.teal }}>
            Why this track exists
          </p>
          <h2
            className="text-[2.4rem] md:text-[3rem] font-black tracking-[-0.05em] leading-[0.92] mb-4 relative z-10"
            style={{ color: T.text }}
          >
            Separate the platform answer from the playback answer.
          </h2>
          <p className="text-base leading-8 max-w-2xl relative z-10" style={{ color: T.muted }}>
            The backend track explains how Netflix starts a stream. This track explains how Netflix converts billions of
            events into analytics, ML features, QoE visibility, and trusted business metrics. Different problem. Different
            flow. Different mental model.
          </p>
          <div className="flex flex-wrap gap-3 mt-6 relative z-10">
            <button onClick={() => onNavigate("requirements")} className="px-5 py-3 rounded-2xl text-sm font-black cursor-pointer" style={{ background: T.red, color: "#fff" }}>
              Enter Data Flow
            </button>
            <Link href="/system-design/netflix/start-here" className="px-5 py-3 rounded-2xl text-sm font-black" style={{ background: T.bg2, color: T.text, border: `1px solid ${T.border}` }}>
              Compare Backend Track
            </Link>
          </div>
        </div>

        <div className="rounded-[28px] border p-6" style={{ background: T.card, borderColor: `${T.teal}28` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] mb-4" style={{ color: T.gold }}>
            In scope vs not in scope
          </p>
          <div className="grid gap-4">
            <div className="rounded-2xl p-4" style={{ background: `${T.green}10`, border: `1px solid ${T.green}24` }}>
              <p className="text-xs font-black uppercase tracking-[0.18em] mb-3" style={{ color: T.green }}>
                In scope
              </p>
              <div className="space-y-2">
                {START_HERE_SCOPE.inScope.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: T.green }} />
                    <p className="text-sm leading-6" style={{ color: T.muted }}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: `${T.red}10`, border: `1px solid ${T.red}24` }}>
              <p className="text-xs font-black uppercase tracking-[0.18em] mb-3" style={{ color: T.red }}>
                Out of scope
              </p>
              <div className="space-y-2">
                {START_HERE_SCOPE.outOfScope.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: T.red }} />
                    <p className="text-sm leading-6" style={{ color: T.muted }}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border p-6" style={{ background: T.card, borderColor: `${T.amber}24` }}>
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: T.amber }}>
              Guided Journey
            </p>
            <h3 className="text-2xl font-black tracking-[-0.03em] mt-2" style={{ color: T.text }}>
              A sequence an end user can actually follow
            </h3>
          </div>
          <div className="text-sm" style={{ color: T.faint }}>
            From framing to final revision
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {START_HERE_PATH.map((item, idx) => {
            const target = DATA_ENGINEERING_TABS.find((tab) => tab.label === item.step)?.id ?? "requirements";
            return (
              <button
                key={item.step}
                onClick={() => onNavigate(target)}
                className="journey-card group rounded-[24px] p-4 text-left border transition-all duration-200 hover:-translate-y-1 cursor-pointer"
                style={{ background: T.bg2, borderColor: `${T.border}` }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-sm font-black" style={{ background: `${T.amber}16`, color: T.amber }}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-base font-bold mb-1" style={{ color: T.text }}>
                      {item.step}
                    </p>
                    <p className="text-sm leading-6" style={{ color: T.faint }}>
                      {item.detail}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] border p-6" style={{ background: T.card, borderColor: `${T.blue}24` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] mb-3" style={{ color: T.blue }}>
            Opening Script
          </p>
          <div className="rounded-2xl p-5 font-mono text-sm leading-8" style={{ background: T.bg2, border: `1px solid ${T.border}`, color: T.text }}>
            I&apos;ll scope this as a data engineering platform for a Netflix-like streaming company. I&apos;ll focus on
            event ingestion, streaming pipelines, batch pipelines, the Bronze/Silver/Gold lakehouse, warehouse and BI
            serving, ML feature generation, data quality, governance, backfills, and operational reliability.
          </div>
        </div>
        <div className="rounded-[28px] border p-6" style={{ background: T.card, borderColor: `${T.purple}24` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] mb-4" style={{ color: T.purple }}>
            Numbers that shape the whole design
          </p>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {DATA_TRACK_NUMBERS.map((item) => (
              <div key={item.label} className="rounded-2xl p-4" style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
                <p className="text-2xl font-black tracking-[-0.03em]" style={{ color: item.color }}>
                  {item.value}
                </p>
                <p className="text-xs font-black uppercase tracking-[0.16em] mt-2" style={{ color: T.text }}>
                  {item.label}
                </p>
                <p className="text-[11px] mt-2 leading-5" style={{ color: T.faint }}>
                  {item.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RequirementsTab() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        {REQUIREMENT_GROUPS.map((group) => (
          <div key={group.title} className="rounded-[26px] border overflow-hidden" style={{ background: T.card, borderColor: `${group.color}26` }}>
            <div className="px-5 py-4" style={{ background: `${group.color}12`, borderBottom: `1px solid ${group.color}24` }}>
              <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: group.color }}>
                {group.title}
              </p>
            </div>
            <div className="p-5 space-y-3">
              {group.items.map((item, idx) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: idx === 0 ? group.color : `${group.color}88` }} />
                  <p className="text-sm leading-7" style={{ color: T.muted }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[28px] border p-6" style={{ background: T.card, borderColor: `${T.amber}24` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] mb-4" style={{ color: T.amber }}>
            Freshness ladder
          </p>
          <div className="space-y-3">
            {LATENCY_SLA_ROWS.map(([name, value], idx) => (
              <div
                key={name}
                className="rounded-2xl p-4 flex items-center justify-between gap-3"
                style={{ background: idx % 2 === 0 ? T.bg2 : T.card2, border: `1px solid ${T.border}` }}
              >
                <div>
                  <p className="text-sm font-bold" style={{ color: T.text }}>
                    {name}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: T.faint }}>
                    Consumer-facing freshness expectation
                  </p>
                </div>
                <span
                  className="text-xs font-black uppercase tracking-[0.16em] px-3 py-2 rounded-full whitespace-nowrap"
                  style={{ background: `${T.amber}12`, color: T.amber, border: `1px solid ${T.amber}24` }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border p-6" style={{ background: T.card, borderColor: `${T.red}24` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] mb-4" style={{ color: T.red }}>
            Non-functional contract
          </p>
          <div className="space-y-3">
            {NFRS.map((item) => (
              <div key={item} className="rounded-2xl p-4" style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
                <p className="text-sm leading-7" style={{ color: T.muted }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchitectureCanvas() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeLayer = ARCHITECTURE_LAYERS[activeIndex] ?? ARCHITECTURE_LAYERS[0];

  return (
    <div className="space-y-5">
      <div className="rounded-[30px] border p-5 overflow-hidden relative" style={{ background: T.card, borderColor: `${T.blue}24` }}>
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(circle at 20% 15%, ${T.blue}14, transparent 30%), radial-gradient(circle at 82% 28%, ${T.purple}12, transparent 24%)`,
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: T.blue }}>
                Architecture canvas
              </p>
              <p className="text-sm mt-1" style={{ color: T.faint }}>
                Follow the platform left to right, then click a layer to zoom in.
              </p>
            </div>
            <span className="text-[11px] px-3 py-1.5 rounded-full" style={{ background: `${T.blue}12`, color: T.blue, border: `1px solid ${T.blue}24` }}>
              4 major layers
            </span>
          </div>
          <div className="grid gap-3 xl:grid-cols-4">
            {ARCHITECTURE_LAYERS.map((layer, index) => {
              const active = activeIndex === index;
              return (
                <button
                  key={layer.title}
                  onClick={() => setActiveIndex(index)}
                  className="text-left rounded-[24px] border p-5 transition-all duration-200 cursor-pointer"
                  style={{
                    background: active ? `linear-gradient(180deg, ${layer.color}16, ${T.bg2})` : index % 2 === 0 ? `${layer.color}0d` : T.bg2,
                    borderColor: active ? `${layer.color}44` : `${layer.color}24`,
                    boxShadow: active ? `0 18px 35px ${layer.color}14` : "none",
                  }}
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: layer.color }}>
                      {layer.title}
                    </p>
                    <span className="text-[11px] font-black" style={{ color: layer.color }}>
                      0{index + 1}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {layer.bullets.map((item, itemIdx) => (
                      <div key={item} className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0" style={{ background: `${layer.color}16`, color: layer.color }}>
                          {itemIdx + 1}
                        </span>
                        <p className="text-sm leading-6" style={{ color: active ? T.text : T.muted }}>
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[30px] border p-5" style={{ background: T.card, borderColor: `${activeLayer.color}2a` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: activeLayer.color }}>
                Active layer
              </p>
              <h3 className="text-2xl font-black tracking-[-0.03em] mt-2" style={{ color: T.text }}>
                {activeLayer.title}
              </h3>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              {ARCHITECTURE_LAYERS.map((layer, index) => (
                <span
                  key={layer.title}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: index === activeIndex ? layer.color : `${layer.color}45` }}
                />
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[28px] border p-5" style={{ background: T.bg2, borderColor: T.border }}>
            <div
              className="absolute inset-0 opacity-50"
              style={{
                backgroundImage:
                  "linear-gradient(color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px)",
                backgroundSize: "36px 36px",
              }}
            />
            <div className="relative z-10 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center">
              {ARCHITECTURE_LAYERS.map((layer, index) => (
                <div key={layer.title} className="contents">
                  <button
                    onClick={() => setActiveIndex(index)}
                    className="rounded-[24px] border p-4 text-left cursor-pointer transition-transform duration-200 hover:-translate-y-1"
                    style={{
                      background: index === activeIndex ? `${layer.color}14` : T.card,
                      borderColor: `${layer.color}28`,
                    }}
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-2" style={{ color: layer.color }}>
                      {layer.title}
                    </p>
                    <p className="text-sm leading-6" style={{ color: T.muted }}>
                      {layer.bullets[0]}
                    </p>
                  </button>
                  {index < ARCHITECTURE_LAYERS.length - 1 ? (
                    <div className="hidden md:flex justify-center">
                      <svg width="48" height="22" viewBox="0 0 48 22" fill="none" aria-hidden="true">
                        <path d="M3 11H42" stroke={layer.color} strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M34 3L43 11L34 19" stroke={layer.color} strokeOpacity="0.85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border p-5" style={{ background: T.card, borderColor: T.border }}>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-4" style={{ color: activeLayer.color }}>
            Delivery routes
          </p>
          <div className="space-y-3">
            {ARCHITECTURE_ROUTES.map((route) => (
              <div key={route.title} className="rounded-[24px] border p-4" style={{ background: T.bg2, borderColor: `${route.color}24` }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: route.color }}>
                    {route.title}
                  </p>
                  <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: `${route.color}12`, color: route.color, border: `1px solid ${route.color}24` }}>
                    consumer path
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {route.flow.map((step, index) => (
                    <div key={step} className="flex items-center gap-2">
                      <span className="rounded-full px-3 py-2 text-xs font-semibold" style={{ background: `${route.color}14`, color: T.text, border: `1px solid ${route.color}24` }}>
                        {step}
                      </span>
                      {index < route.flow.length - 1 ? (
                        <svg width="22" height="12" viewBox="0 0 22 12" fill="none" aria-hidden="true">
                          <path d="M1 6H19" stroke={route.color} strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
                          <path d="M14 1L20 6L14 11" stroke={route.color} strokeOpacity="0.9" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border p-6" style={{ background: T.card, borderColor: `${activeLayer.color}22` }}>
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: activeLayer.color }}>
              Layer detail
            </p>
            <p className="text-sm mt-1" style={{ color: T.faint }}>
              Text supports the selected visual layer instead of replacing it.
            </p>
          </div>
          <span className="text-[11px] px-3 py-1.5 rounded-full" style={{ background: `${activeLayer.color}12`, color: activeLayer.color, border: `1px solid ${activeLayer.color}24` }}>
            {activeLayer.bullets.length} design points
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {activeLayer.bullets.map((item, index) => (
            <div key={item} className="rounded-[22px] border p-4" style={{ background: index === 0 ? `${activeLayer.color}10` : T.bg2, borderColor: `${activeLayer.color}24` }}>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: activeLayer.color }}>
                {index === 0 ? "Anchor" : index === 1 ? "Design choice" : "Operational note"}
              </p>
              <p className="text-sm leading-7" style={{ color: T.muted }}>
                {item}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SchemaBoard() {
  const [activeNodeId, setActiveNodeId] = useState<(typeof MODEL_NODES)[number]["id"]>("fact-watch");
  const activeNode = MODEL_NODES.find((node) => node.id === activeNodeId) ?? MODEL_NODES[0];

  return (
    <div className="space-y-5">
      <div className="rounded-[30px] border p-5" style={{ background: T.card, borderColor: `${T.indigo}24` }}>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: T.indigo }}>
              ER-style schema map
            </p>
            <p className="text-sm mt-1" style={{ color: T.faint }}>
              Click a table to understand grain, fields, and why it exists in the platform.
            </p>
          </div>
          <span className="text-[11px] px-3 py-1.5 rounded-full" style={{ background: `${T.indigo}12`, color: T.indigo, border: `1px solid ${T.indigo}24` }}>
            8 core entities
          </span>
        </div>

        <div className="relative min-h-[540px] rounded-[28px] border overflow-hidden" style={{ background: T.bg2, borderColor: T.border }}>
          <div
            className="absolute inset-0 opacity-55"
            style={{
              backgroundImage:
                "linear-gradient(color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px)",
              backgroundSize: "34px 34px",
            }}
          />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M18 23 C 23 28, 24 29, 28 39" stroke={T.blue} strokeOpacity="0.35" strokeWidth="0.55" fill="none" />
            <path d="M40 39 C 50 32, 56 28, 58 22" stroke={T.red} strokeOpacity="0.35" strokeWidth="0.55" fill="none" />
            <path d="M40 39 C 50 45, 53 50, 58 56" stroke={T.red} strokeOpacity="0.35" strokeWidth="0.55" fill="none" />
            <path d="M35 45 C 33 56, 30 62, 28 72" stroke={T.green} strokeOpacity="0.35" strokeWidth="0.55" fill="none" />
            <path d="M41 45 C 46 60, 49 71, 56 81" stroke={T.gold} strokeOpacity="0.35" strokeWidth="0.55" fill="none" />
            <path d="M86 39 C 84 52, 84 60, 84 72" stroke={T.indigo} strokeOpacity="0.35" strokeWidth="0.55" fill="none" />
            <path d="M63 22 C 72 24, 79 28, 84 38" stroke={T.purple} strokeOpacity="0.35" strokeWidth="0.55" fill="none" />
            <path d="M64 57 C 73 61, 79 67, 84 74" stroke={T.indigo} strokeOpacity="0.35" strokeWidth="0.55" fill="none" />
          </svg>

          {MODEL_NODES.map((node) => {
            const active = node.id === activeNodeId;
            return (
              <button
                key={node.id}
                onClick={() => setActiveNodeId(node.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[20px] border px-4 py-3 text-left min-w-[170px] max-w-[220px] transition-all duration-200 cursor-pointer"
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  background: active ? `linear-gradient(135deg, ${node.color}1a, ${T.card})` : T.card,
                  borderColor: active ? `${node.color}46` : `${node.color}22`,
                  boxShadow: active ? `0 20px 36px ${node.color}14` : "0 8px 18px rgba(0,0,0,0.16)",
                }}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: node.color }}>
                  {node.type}
                </p>
                <p className="text-sm font-bold leading-5" style={{ color: T.text }}>
                  {node.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border p-6" style={{ background: T.card, borderColor: `${activeNode.color}28` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-3" style={{ color: activeNode.color }}>
            Selected entity
          </p>
          <h3 className="text-2xl font-black tracking-[-0.03em] mb-4" style={{ color: T.text }}>
            {activeNode.label}
          </h3>
          <div className="rounded-[22px] border p-5 mb-4" style={{ background: `${activeNode.color}0f`, borderColor: `${activeNode.color}24` }}>
            <p className="text-sm leading-7" style={{ color: T.muted }}>
              {activeNode.summary}
            </p>
          </div>
          <div className="space-y-3">
            {activeNode.fields.map((field) => (
              <div key={field} className="rounded-[18px] border p-4" style={{ background: T.bg2, borderColor: T.border }}>
                <p className="text-sm leading-7" style={{ color: T.muted }}>
                  {field}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border p-6" style={{ background: T.card, borderColor: T.border }}>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-4" style={{ color: T.indigo }}>
            Modeling choices
          </p>
          <div className="space-y-3">
            {MODELING_SECTIONS.map((section, index) => (
              <div key={section.heading} className="rounded-[22px] border p-4" style={{ background: index === 0 ? `${T.indigo}0d` : T.bg2, borderColor: `${T.indigo}20` }}>
                <p className="text-xs font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.indigo }}>
                  {section.heading}
                </p>
                <p className="text-sm leading-7" style={{ color: T.muted }}>
                  {section.items[0]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NarrativeTab sections={MODELING_SECTIONS} color={T.indigo} chapterLabel="Modeling" />
    </div>
  );
}

function QuizTab({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState<Record<string, "known" | "learning">>({});
  const card = DATA_QUIZ_CARDS[index];
  const progress = Math.round((Object.keys(known).length / DATA_QUIZ_CARDS.length) * 100);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[0.35fr_0.65fr]">
        <div className="rounded-[28px] border p-5" style={{ background: T.card, borderColor: `${T.red}24` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-3" style={{ color: T.red }}>
            Recall Progress
          </p>
          <p className="text-5xl font-black tracking-[-0.05em]" style={{ color: T.red }}>
            {progress}%
          </p>
          <p className="text-sm mt-3" style={{ color: T.faint }}>
            {Object.keys(known).length} of {DATA_QUIZ_CARDS.length} reviewed
          </p>
          <div className="h-2 rounded-full mt-4 overflow-hidden" style={{ background: T.border }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${T.red}, ${T.amber})` }}
            />
          </div>
        </div>
        <div className="rounded-[28px] border p-6" style={{ background: T.card, borderColor: `${card.color}26` }}>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span
              className="text-[10px] font-black uppercase tracking-[0.22em] px-3 py-1.5 rounded-full"
              style={{ background: `${card.color}16`, color: card.color, border: `1px solid ${card.color}24` }}
            >
              {card.topic}
            </span>
            <span className="text-[10px] px-3 py-1.5 rounded-full" style={{ background: T.bg2, color: T.faint, border: `1px solid ${T.border}` }}>
              Card {index + 1} of {DATA_QUIZ_CARDS.length}
            </span>
          </div>
          <p className="text-2xl font-bold leading-tight mb-5" style={{ color: T.text }}>
            {card.question}
          </p>
          {!revealed ? (
            <button onClick={() => setRevealed(true)} className="px-5 py-3 rounded-2xl text-sm font-black cursor-pointer" style={{ background: card.color, color: "#fff" }}>
              Reveal answer
            </button>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl p-5" style={{ background: T.bg2, border: `1px solid ${card.color}24` }}>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-2" style={{ color: card.color }}>
                  Answer
                </p>
                <p className="text-lg font-bold mb-2" style={{ color: T.text }}>
                  {card.answer}
                </p>
                <p className="text-sm leading-7" style={{ color: T.muted }}>
                  {card.explanation}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setKnown((prev) => ({ ...prev, [card.id]: "learning" }))} className="px-4 py-2.5 rounded-2xl text-sm font-black cursor-pointer" style={{ background: "transparent", color: T.amber, border: `1px solid ${T.amber}38` }}>
                  Still learning
                </button>
                <button onClick={() => setKnown((prev) => ({ ...prev, [card.id]: "known" }))} className="px-4 py-2.5 rounded-2xl text-sm font-black cursor-pointer" style={{ background: "transparent", color: T.green, border: `1px solid ${T.green}38` }}>
                  Know it
                </button>
                <button onClick={() => onNavigate(card.reviewTab)} className="px-4 py-2.5 rounded-2xl text-sm font-black cursor-pointer" style={{ background: T.bg2, color: T.text, border: `1px solid ${T.border}` }}>
                  Open related chapter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setRevealed(false);
            setIndex((value) => Math.max(value - 1, 0));
          }}
          disabled={index === 0}
          className="px-5 py-3 rounded-2xl text-sm font-black disabled:opacity-40 cursor-pointer"
          style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}
        >
          Previous
        </button>
        <button
          onClick={() => {
            setRevealed(false);
            setIndex((value) => Math.min(value + 1, DATA_QUIZ_CARDS.length - 1));
          }}
          disabled={index === DATA_QUIZ_CARDS.length - 1}
          className="px-5 py-3 rounded-2xl text-sm font-black disabled:opacity-40 cursor-pointer"
          style={{ background: T.red, color: "#fff" }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function CapacityTab() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {DATA_TRACK_NUMBERS.map((item) => (
          <div key={item.label} className="rounded-[24px] border p-4" style={{ background: T.card, borderColor: `${item.color}2a` }}>
            <p className="text-2xl font-black tracking-[-0.04em]" style={{ color: item.color }}>
              {item.value}
            </p>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] mt-2" style={{ color: T.text }}>
              {item.label}
            </p>
            <p className="text-[11px] leading-5 mt-2" style={{ color: T.faint }}>
              {item.note}
            </p>
          </div>
        ))}
      </div>
      <NarrativeTab sections={CAPACITY_SECTIONS} color={T.red} chapterLabel="Capacity" />
    </div>
  );
}

function JourneyRail({
  activeTab,
  onNavigate,
}: {
  activeTab: DataEngineeringTabSlug;
  onNavigate: (tab: DataEngineeringTabSlug) => void;
}) {
  return (
    <div className="hidden xl:block sticky top-6">
      <div className="rounded-[28px] border p-5" style={{ background: T.card, borderColor: T.border }}>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] mb-4" style={{ color: T.faint }}>
          Chapter Journey
        </p>
        <div className="space-y-2">
          {DATA_ENGINEERING_TABS.map((tab, idx) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                className="w-full text-left rounded-2xl px-3 py-3 transition-all duration-200 cursor-pointer"
                style={{
                  background: active ? `${CHAPTER_META[tab.id].accent}16` : T.bg2,
                  border: `1px solid ${active ? `${CHAPTER_META[tab.id].accent}2e` : T.border}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0" style={{ background: active ? `${CHAPTER_META[tab.id].accent}20` : T.card2, color: active ? CHAPTER_META[tab.id].accent : T.faint }}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: active ? T.text : T.muted }}>
                      {tab.label}
                    </p>
                    <p className="text-[11px] mt-1 line-clamp-2" style={{ color: T.faint }}>
                      {CHAPTER_META[tab.id].signal[0]}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ContentForTab({
  tab,
  onNavigate,
}: {
  tab: DataEngineeringTabSlug;
  onNavigate: (tab: DataEngineeringTabSlug) => void;
}) {
  switch (tab) {
    case "start-here":
      return <StartHereTab onNavigate={onNavigate} />;
    case "requirements":
      return <RequirementsTab />;
    case "architecture":
      return <ArchitectureCanvas />;
    case "ingestion":
      return <NarrativeTab sections={INGESTION_SECTIONS} color={T.purple} chapterLabel="Ingestion" />;
    case "streaming":
      return <NarrativeTab sections={STREAMING_SECTIONS} color={T.teal} chapterLabel="Streaming" />;
    case "batch":
      return <NarrativeTab sections={BATCH_SECTIONS} color={T.green} chapterLabel="Batch" />;
    case "lakehouse":
      return <NarrativeTab sections={LAKEHOUSE_SECTIONS} color={T.gold} chapterLabel="Lakehouse" />;
    case "modeling":
      return <SchemaBoard />;
    case "reliability":
      return <NarrativeTab sections={RELIABILITY_SECTIONS} color={T.red} chapterLabel="Reliability" />;
    case "ml-serving":
      return <NarrativeTab sections={ML_SERVING_SECTIONS} color={T.green} chapterLabel="ML & Serving" />;
    case "stack":
      return <NarrativeTab sections={STACK_SECTIONS} color={T.blue} chapterLabel="Stack" />;
    case "governance":
      return <NarrativeTab sections={GOVERNANCE_SECTIONS} color={T.purple} chapterLabel="Governance" />;
    case "performance-cost":
      return <NarrativeTab sections={PERFORMANCE_SECTIONS} color={T.amber} chapterLabel="Performance" />;
    case "capacity":
      return <CapacityTab />;
    case "interview-qa":
      return <NarrativeTab sections={INTERVIEW_QA_SECTIONS} color={T.indigo} chapterLabel="Interview Q&A" />;
    case "quiz":
      return <QuizTab onNavigate={onNavigate} />;
    case "mock-interview":
      return <MockInterviewTab role="Data Engineer" lockRole />;
    case "cheat-sheet":
      return <CheatSheetTab role="Data Engineer" lockRole />;
  }
}

export default function DataEngineeringPage({ initialTab }: { initialTab?: string }) {
  const resolvedInitial = normalizeDataEngineeringTab(initialTab) ?? "start-here";
  const [activeTab, setActiveTab] = useState<DataEngineeringTabSlug>(resolvedInitial);

  useEffect(() => {
    const onPopState = () => {
      const pathTab = window.location.pathname.split("/").pop();
      const normalized = normalizeDataEngineeringTab(pathTab);
      if (normalized) setActiveTab(normalized);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const activeIndex = useMemo(() => DATA_ENGINEERING_TABS.findIndex((tab) => tab.id === activeTab), [activeTab]);

  function switchTab(tab: DataEngineeringTabSlug) {
    if (tab === activeTab) return;
    setActiveTab(tab);
    window.history.pushState(null, "", `/system-design/netflix-data-engineering/${tab}`);
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 56px)", background: T.bg, color: T.text }}>
      <PageHeader activeTab={activeTab} activeIndex={activeIndex} onNavigate={switchTab} />

      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-6">
        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <JourneyRail activeTab={activeTab} onNavigate={switchTab} />

          <div className="min-w-0 space-y-6">
            <ChapterHero tab={activeTab} mins={DATA_ENGINEERING_TABS[activeIndex]?.mins ?? 5} />
            <ContentForTab tab={activeTab} onNavigate={switchTab} />
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .chapter-hero {
          animation: heroFade 480ms ease both;
        }
        .journey-card:nth-child(odd),
        .flow-chip {
          animation: riseIn 420ms ease both;
        }
        .journey-card:nth-child(even) {
          animation: riseIn 520ms ease both;
        }
        @keyframes heroFade {
          from { opacity: 0; transform: translateY(14px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes riseIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
