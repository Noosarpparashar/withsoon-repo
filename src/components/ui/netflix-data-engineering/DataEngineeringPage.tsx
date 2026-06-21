"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { copyTextToClipboard } from "../netflix-tabs/clipboard";
import {
  ARCHITECTURE_NODES,
  ARCHITECTURE_REVEALS,
  BATCH_DAG_STEPS,
  CHEAT_SHEET_CONTENT,
  DATA_ENGINEERING_GROUPS,
  DATA_ENGINEERING_TAB_META,
  DATA_ENGINEERING_TABS,
  DATA_TRACK_NUMBERS,
  DQ_INVESTIGATION_PATH,
  DQ_METRICS,
  DQ_SEVERITIES,
  EVENT_FAMILIES,
  FEATURE_STORE_CONTENT,
  FLINK_JOBS,
  GOVERNANCE_CHECKLIST,
  GOVERNANCE_FIELDS,
  INGESTION_LANES,
  INTERVIEW_QUESTIONS,
  KAFKA_TOPICS,
  LAKEHOUSE_LAYERS,
  LATE_EVENT_POLICY,
  LATENCY_SLA_ROWS,
  MOCK_INTERVIEW_RUBRIC,
  MOCK_INTERVIEW_STEPS,
  NFRS,
  RELIABILITY_INCIDENTS,
  REPLAY_FLOW,
  REQUIREMENT_DOMAINS,
  SCALE_DEFAULTS,
  SERVING_MATRIX,
  SESSIONIZATION_SCENARIOS,
  START_HERE_JOURNEY,
  START_HERE_SCOPE,
  TABLE_SCHEMAS,
  TRADEOFFS,
  WATCH_TIME_DEFINITIONS,
  WATCH_TIME_RULES,
  WATCH_TIME_TIMELINE,
  normalizeDataEngineeringTab,
  type DataEngineeringGroup,
  type DataEngineeringTabSlug,
} from "./data";

const T = {
  bg: "var(--bg)",
  card: "var(--bg-card)",
  card2: "var(--bg-muted)",
  border: "var(--border)",
  text: "var(--text)",
  muted: "var(--text-muted)",
  faint: "var(--text-faint)",
  red: "#e50914",
  amber: "#f59e0b",
  gold: "#fbbf24",
  blue: "#38bdf8",
  violet: "#8b5cf6",
  purple: "#a855f7",
  green: "#22c55e",
  orange: "#f97316",
} as const;

type ScopeMode = "backend" | "data";
type WatchMetricMode = (typeof WATCH_TIME_DEFINITIONS)[number]["id"];
type EventFamilyId = (typeof EVENT_FAMILIES)[number]["id"];
type EventId = (typeof EVENT_FAMILIES)[number]["events"][number]["id"];
type ArchitectureNodeId = (typeof ARCHITECTURE_NODES)[number]["id"];
type IngestionLaneId = (typeof INGESTION_LANES)[number]["id"];
type KafkaTopicId = (typeof KAFKA_TOPICS)[number]["id"];
type FlinkJobId = (typeof FLINK_JOBS)[number]["id"];
type SessionScenarioId = (typeof SESSIONIZATION_SCENARIOS)[number]["id"];
type LakehouseLayerId = (typeof LAKEHOUSE_LAYERS)[number]["id"];
type TableName = (typeof TABLE_SCHEMAS)[number]["name"];
type TableColumnName = (typeof TABLE_SCHEMAS)[number]["columns"][number]["name"];
type BatchStepId = (typeof BATCH_DAG_STEPS)[number]["id"];
type DqMetricLabel = (typeof DQ_METRICS)[number]["label"];
type GovernanceFieldName = (typeof GOVERNANCE_FIELDS)[number]["name"];
type ServingWorkload = (typeof SERVING_MATRIX)[number]["workload"];
type ReliabilityIncidentId = (typeof RELIABILITY_INCIDENTS)[number]["id"];
type TradeoffDecision = (typeof TRADEOFFS)[number]["decision"];
type InterviewQuestionId = (typeof INTERVIEW_QUESTIONS)[number]["id"];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        copyTextToClipboard(value).then((ok) => {
          if (!ok) return;
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
      className="text-[11px] px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
      style={{ background: T.card2, color: copied ? T.green : T.text, border: `1px solid ${T.border}` }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]"
      style={{
        background: `${color ?? T.card2}14`,
        color: color ?? T.muted,
        border: `1px solid ${(color ?? "#64748b")}22`,
      }}
    >
      {children}
    </span>
  );
}

function RoleModeSwitcher() {
  const items: Array<{ label: string; href: string; active: boolean; disabled?: boolean }> = [
    { label: "Backend Engineer", href: "/system-design/netflix/start-here", active: false },
    { label: "Data Engineer", href: "", active: true },
    { label: "ML Engineer", href: "", active: false, disabled: true },
    { label: "SRE / Infra", href: "", active: false, disabled: true },
  ];

  return (
    <div className="rounded-2xl p-3 flex flex-wrap items-center gap-2" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] mr-2" style={{ color: T.faint }}>
        Preparing for
      </p>
      {items.map((item) =>
        item.href ? (
          <Link
            key={item.label}
            href={item.href}
            className="px-3 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: item.active ? `${T.red}18` : T.card2,
              color: item.active ? T.red : T.text,
              border: `1px solid ${item.active ? `${T.red}33` : T.border}`,
            }}
          >
            {item.label}
          </Link>
        ) : (
          <span
            key={item.label}
            className="px-3 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: item.active ? `${T.red}18` : T.card2,
              color: item.active ? T.red : item.disabled ? T.faint : T.text,
              border: `1px solid ${item.active ? `${T.red}33` : T.border}`,
              opacity: item.disabled ? 0.7 : 1,
            }}
            title={item.disabled ? "Coming soon" : undefined}
          >
            {item.label}
          </span>
        )
      )}
    </div>
  );
}

function TabHeader({
  tab,
  activeIndex,
  total,
  onToggleProgress,
  onToggleNotes,
  onToggleFocus,
  focusMode,
  onShare,
}: {
  tab: DataEngineeringTabSlug;
  activeIndex: number;
  total: number;
  onToggleProgress: () => void;
  onToggleNotes: () => void;
  onToggleFocus: () => void;
  focusMode: boolean;
  onShare: () => void;
}) {
  const meta = DATA_ENGINEERING_TAB_META[tab];
  const accent = DATA_ENGINEERING_TABS.find((item) => item.id === tab)?.accent ?? T.red;

  return (
    <div className="shrink-0 z-30" style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
      <div className="px-4 py-3 flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Link href="/" className="text-xs font-semibold" style={{ color: T.faint }}>
              withsoon
            </Link>
            <span className="text-xs" style={{ color: T.faint }}>
              /
            </span>
            <Link href="/system-design" className="text-xs font-semibold" style={{ color: T.faint }}>
              System Design
            </Link>
            <span className="text-xs" style={{ color: T.faint }}>
              /
            </span>
            <span className="text-xs font-semibold" style={{ color: T.text }}>
              Netflix Data Engineering
            </span>
            <Pill color={accent}>{DATA_ENGINEERING_TAB_META[tab].eyebrow}</Pill>
          </div>
          <h1 className="text-[1.85rem] md:text-[2.25rem] font-bold tracking-[-0.04em] leading-[0.95]" style={{ color: T.text }}>
            {meta.heroTitle}
          </h1>
          <p className="text-sm md:text-base mt-3 max-w-4xl" style={{ color: T.muted }}>
            {meta.interviewAngle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-right px-3 py-2 rounded-xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.faint }}>
              Chapter
            </p>
            <p className="text-sm font-bold" style={{ color: T.text }}>
              {activeIndex + 1} / {total}
            </p>
          </div>
          <button onClick={onToggleProgress} className="text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
            Progress
          </button>
          <button onClick={onToggleNotes} className="text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
            Notes
          </button>
          <button onClick={onToggleFocus} className="text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: focusMode ? `${T.red}18` : T.card, color: focusMode ? T.red : T.text, border: `1px solid ${focusMode ? `${T.red}33` : T.border}` }}>
            {focusMode ? "Exit Focus" : "Focus"}
          </button>
          <button onClick={onShare} className="text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
            Share
          </button>
        </div>
      </div>
      <div className="px-4 pb-3">
        <RoleModeSwitcher />
      </div>
    </div>
  );
}

function Sidebar({
  activeTab,
  visitedTabs,
  revisedTabs,
  onNavigate,
}: {
  activeTab: DataEngineeringTabSlug;
  visitedTabs: Set<DataEngineeringTabSlug>;
  revisedTabs: Set<DataEngineeringTabSlug>;
  onNavigate: (tab: DataEngineeringTabSlug) => void;
}) {
  const grouped = DATA_ENGINEERING_GROUPS.map((group) => ({
    group,
    tabs: DATA_ENGINEERING_TABS.filter((tab) => tab.group === group),
  }));

  return (
    <aside className="hidden xl:flex w-[320px] shrink-0 border-r flex-col" style={{ borderColor: T.border, background: T.bg }}>
      <div className="p-4 overflow-y-auto no-scrollbar space-y-5">
        {grouped.map(({ group, tabs }) => (
          <div key={group}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: T.faint }}>
              {group}
            </p>
            <div className="space-y-2">
              {tabs.map((tab, index) => {
                const active = tab.id === activeTab;
                const visited = visitedTabs.has(tab.id);
                const revised = revisedTabs.has(tab.id);
                const chapterNumber = DATA_ENGINEERING_TABS.findIndex((item) => item.id === tab.id) + 1;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onNavigate(tab.id)}
                    className="w-full text-left rounded-2xl p-3 transition-all cursor-pointer"
                    style={{
                      background: active ? `${tab.accent}14` : T.card,
                      border: `1px solid ${active ? `${tab.accent}33` : T.border}`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{
                          background: active ? `${tab.accent}22` : T.card2,
                          color: active ? tab.accent : T.faint,
                        }}
                      >
                        {String(chapterNumber).padStart(2, "0")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold" style={{ color: active ? T.text : T.muted }}>
                            {tab.label}
                          </p>
                          {visited && <span className="text-[10px]" style={{ color: T.green }}>Visited</span>}
                          {revised && <span className="text-[10px]" style={{ color: T.amber }}>Revised</span>}
                        </div>
                        <p className="text-[11px] mt-1 leading-5" style={{ color: T.faint }}>
                          {tab.summary}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function MobileMenu({
  activeTab,
  open,
  onClose,
  onNavigate,
}: {
  activeTab: DataEngineeringTabSlug;
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: DataEngineeringTabSlug) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 xl:hidden" style={{ background: T.bg }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
        <span className="text-sm font-bold" style={{ color: T.text }}>
          Netflix Data Engineering
        </span>
        <button onClick={onClose} className="text-lg cursor-pointer" style={{ color: T.muted }}>
          ✕
        </button>
      </div>
      <div className="p-4 overflow-y-auto no-scrollbar space-y-5">
        {DATA_ENGINEERING_GROUPS.map((group) => (
          <div key={group}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: T.faint }}>
              {group}
            </p>
            <div className="space-y-2">
              {DATA_ENGINEERING_TABS.filter((tab) => tab.group === group).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    onNavigate(tab.id);
                    onClose();
                  }}
                  className="w-full text-left rounded-xl p-3 cursor-pointer"
                  style={{
                    background: activeTab === tab.id ? `${tab.accent}14` : T.card,
                    border: `1px solid ${activeTab === tab.id ? `${tab.accent}33` : T.border}`,
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: activeTab === tab.id ? T.text : T.muted }}>
                    {tab.label}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: T.faint }}>
                    {tab.summary}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScrollableShell({
  children,
  prevTab,
  nextTab,
  onNavigate,
  onMarkRevised,
  revised,
}: {
  children: React.ReactNode;
  prevTab?: { id: DataEngineeringTabSlug; label: string };
  nextTab?: { id: DataEngineeringTabSlug; label: string };
  onNavigate: (tab: DataEngineeringTabSlug) => void;
  onMarkRevised: () => void;
  revised: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => setShowTop(el.scrollTop > 320);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  return (
    <div ref={ref} className="flex-1 overflow-y-auto relative no-scrollbar" style={{ background: T.bg }}>
      <div className="px-4 lg:px-6 py-6 max-w-[1240px] mx-auto">
        {children}
        <div className="mt-10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 flex-wrap">
            {prevTab ? (
              <button onClick={() => onNavigate(prevTab.id)} className="text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
                ← {prevTab.label}
              </button>
            ) : null}
            {nextTab ? (
              <button onClick={() => onNavigate(nextTab.id)} className="text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
                {nextTab.label} →
              </button>
            ) : null}
          </div>
          <button onClick={onMarkRevised} className="text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: revised ? `${T.green}18` : T.card2, color: revised ? T.green : T.text, border: `1px solid ${revised ? `${T.green}33` : T.border}` }}>
            {revised ? "Marked revised" : "Mark as revised"}
          </button>
        </div>
      </div>
      {showTop ? (
        <button
          onClick={() => ref.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
          style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}
          aria-label="Back to top"
        >
          ↑
        </button>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, note, color }: { label: string; value: string; note: string; color: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${color}25` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
        {label}
      </p>
      <p className="text-[1.8rem] font-bold tracking-[-0.04em] mt-2" style={{ color: T.text }}>
        {value}
      </p>
      <p className="text-[11px] mt-2 leading-5" style={{ color: T.faint }}>
        {note}
      </p>
    </div>
  );
}

function AnswerCard({
  title,
  body,
  accent,
}: {
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${accent}2a` }}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
          {title}
        </p>
        <CopyButton value={body} label="Copy answer" />
      </div>
      <p className="text-sm leading-7" style={{ color: T.text }}>
        {body}
      </p>
    </div>
  );
}

function FlowMapper({
  steps,
  accent,
}: {
  steps: readonly string[];
  accent: string;
}) {
  return (
    <div className="grid gap-3">
      {steps.map((step, index) => (
        <div key={`${step}-${index}`} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: `${accent}18`, color: accent }}>
            {index + 1}
          </div>
          <div className="rounded-xl px-4 py-3 flex-1" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-sm" style={{ color: T.text }}>
              {step}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StartHereTab({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  const [scopeMode, setScopeMode] = useState<ScopeMode>("data");
  const visibleScope = scopeMode === "data" ? START_HERE_SCOPE.dataEngineeringScope : START_HERE_SCOPE.backendScope;
  const journeyTargets: Partial<Record<(typeof START_HERE_JOURNEY)[number]["step"], DataEngineeringTabSlug>> = {
    "Start Here": "start-here",
    Requirements: "requirements",
    "Scale Estimation": "scale-estimation",
    "Event Taxonomy": "event-taxonomy",
    "High-Level Data Architecture": "high-level-data-architecture",
    "Watch-Time Calculation": "watch-time-calculation",
    Sessionization: "sessionization",
    "Late Events + Replay": "late-events-replay",
    "Lakehouse + Table Design": "lakehouse-design",
    Practice: "interview-qa",
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] p-6 md:p-8 relative overflow-hidden" style={{ background: T.card, border: `1px solid ${T.red}28` }}>
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${T.red}, ${T.amber}, ${T.violet})` }} />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: T.red }}>
              Netflix Data Platform Interview Journey
            </p>
            <h2 className="text-4xl md:text-[3.4rem] font-bold tracking-[-0.05em] leading-[0.92]" style={{ color: T.text }}>
              events → Kafka → Flink → S3/Iceberg → Spark/dbt → Gold metrics → BI + ML
            </h2>
            <p className="text-base mt-5 max-w-3xl leading-8" style={{ color: T.muted }}>
              This mode is for learning how to design the Netflix-like data platform behind analytics, ML features, QoE dashboards, finance reporting, replay, and backfill. It is not the playback backend interview answer in prettier clothes.
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              <button onClick={() => setScopeMode("backend")} className="px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer" style={{ background: scopeMode === "backend" ? `${T.red}18` : T.card2, color: scopeMode === "backend" ? T.red : T.text, border: `1px solid ${scopeMode === "backend" ? `${T.red}33` : T.border}` }}>
                Show Backend Scope
              </button>
              <button onClick={() => setScopeMode("data")} className="px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer" style={{ background: scopeMode === "data" ? `${T.blue}18` : T.card2, color: scopeMode === "data" ? T.blue : T.text, border: `1px solid ${scopeMode === "data" ? `${T.blue}33` : T.border}` }}>
                Show Data Engineering Scope
              </button>
            </div>
            <div className="mt-4 rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: scopeMode === "data" ? T.blue : T.red }}>
                Current scope
              </p>
              <div className="flex flex-wrap gap-2">
                {visibleScope.map((item) => (
                  <span key={item} className="px-3 py-2 rounded-full text-xs font-semibold" style={{ background: scopeMode === "data" ? `${T.blue}12` : `${T.red}12`, color: T.text, border: `1px solid ${scopeMode === "data" ? `${T.blue}24` : `${T.red}24`}` }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            {DATA_TRACK_NUMBERS.slice(0, 4).map((item) => (
              <MetricCard key={item.label} label={item.label} value={item.value} note={item.note} color={item.color} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.blue }}>
            What we are designing
          </p>
          <div className="space-y-2">
            {START_HERE_SCOPE.inScope.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-2 w-2 h-2 rounded-full shrink-0" style={{ background: T.blue }} />
                <p className="text-sm leading-6" style={{ color: T.muted }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.red }}>
            What we are not designing
          </p>
          <div className="space-y-2">
            {START_HERE_SCOPE.outOfScope.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-2 w-2 h-2 rounded-full shrink-0" style={{ background: T.red }} />
                <p className="text-sm leading-6" style={{ color: T.muted }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
        <AnswerCard title="Interview opening answer" body={START_HERE_SCOPE.openingAnswer} accent={T.red} />
      </div>

      <div className="rounded-[26px] p-5" style={{ background: T.card, border: `1px solid ${T.violet}24` }}>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.violet }}>
              Guided journey
            </p>
            <p className="text-sm mt-1" style={{ color: T.faint }}>
              This is the sequence the interviewer should feel as you explain the platform.
            </p>
          </div>
          <button onClick={() => onNavigate("requirements")} className="px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
            Begin with requirements
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {START_HERE_JOURNEY.map((item, index) => {
            const target = journeyTargets[item.step] ?? "requirements";
            return (
              <button key={item.step} onClick={() => onNavigate(target)} className="rounded-2xl p-4 text-left cursor-pointer" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: `${T.violet}18`, color: T.violet }}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: T.text }}>
                      {item.step}
                    </p>
                    <p className="text-[12px] mt-1 leading-5" style={{ color: T.faint }}>
                      {item.detail}
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

function RequirementsTab() {
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>(
    Object.fromEntries(REQUIREMENT_DOMAINS.map((domain, index) => [domain.id, index === 0]))
  );
  const [selectedKey, setSelectedKey] = useState(`${REQUIREMENT_DOMAINS[0].id}-0`);
  const selectedRow = REQUIREMENT_DOMAINS.flatMap((domain) =>
    domain.rows.map((row, index) => ({ key: `${domain.id}-${index}`, domain, row }))
  ).find((entry) => entry.key === selectedKey);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {REQUIREMENT_DOMAINS.map((domain) => {
            const open = openDomains[domain.id];
            return (
              <div key={domain.id} className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${domain.color}24` }}>
                <button
                  onClick={() => setOpenDomains((prev) => ({ ...prev, [domain.id]: !prev[domain.id] }))}
                  className="w-full text-left px-5 py-4 flex items-center justify-between cursor-pointer"
                  style={{ background: `${domain.color}10` }}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: domain.color }}>
                      {domain.title}
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                      {domain.rows.length} interview-critical requirements
                    </p>
                  </div>
                  <span style={{ color: domain.color }}>{open ? "−" : "+"}</span>
                </button>
                {open ? (
                  <div className="p-4 space-y-3">
                    {domain.rows.map((row, index) => {
                      const active = selectedKey === `${domain.id}-${index}`;
                      return (
                        <button
                          key={`${domain.id}-${row.requirement}`}
                          onClick={() => setSelectedKey(`${domain.id}-${index}`)}
                          className="w-full text-left rounded-2xl p-4 cursor-pointer"
                          style={{
                            background: active ? `${domain.color}0f` : T.card2,
                            border: `1px solid ${active ? `${domain.color}35` : T.border}`,
                          }}
                        >
                          <div className="grid gap-2 md:grid-cols-[1.7fr_repeat(4,minmax(0,1fr))]">
                            <div>
                              <p className="text-sm font-semibold" style={{ color: T.text }}>
                                {row.requirement}
                              </p>
                            </div>
                            <MiniKpi label="Priority" value={row.priority} />
                            <MiniKpi label="Freshness" value={row.freshness} />
                            <MiniKpi label="Correctness" value={row.correctness} />
                            <MiniKpi label="Consumer" value={row.consumer} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${selectedRow?.domain.color ?? T.blue}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: selectedRow?.domain.color ?? T.blue }}>
                Requirement-to-pipeline mapper
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                Click a requirement on the left to highlight its flow.
              </p>
            </div>
            {selectedRow ? <Pill color={selectedRow.domain.color}>{selectedRow.row.priority}</Pill> : null}
          </div>
          {selectedRow ? (
            <>
              <h3 className="text-xl font-bold mb-3" style={{ color: T.text }}>
                {selectedRow.row.requirement}
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <InfoTile label="Freshness SLA" value={selectedRow.row.freshness} />
                <InfoTile label="Correctness need" value={selectedRow.row.correctness} />
                <InfoTile label="Consumer" value={selectedRow.row.consumer} />
                <InfoTile label="Domain" value={selectedRow.domain.title} />
              </div>
              <FlowMapper steps={selectedRow.row.flow} accent={selectedRow.domain.color} />
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.amber }}>
            Freshness ladder
          </p>
          <div className="space-y-3">
            {LATENCY_SLA_ROWS.map(([label, value]) => (
              <div key={label} className="rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <p className="text-sm font-medium" style={{ color: T.text }}>
                  {label}
                </p>
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: `${T.amber}12`, color: T.amber, border: `1px solid ${T.amber}24` }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.red }}>
            Non-functional requirements
          </p>
          <div className="space-y-3">
            {NFRS.map((item) => (
              <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
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

function ScaleEstimationTab() {
  const [dauMillions, setDauMillions] = useState(SCALE_DEFAULTS.dauMillions);
  const [watchHoursPerUser, setWatchHoursPerUser] = useState(SCALE_DEFAULTS.watchHoursPerUser);
  const [heartbeatSeconds, setHeartbeatSeconds] = useState(SCALE_DEFAULTS.heartbeatSeconds);
  const [compressedEventKb, setCompressedEventKb] = useState(SCALE_DEFAULTS.compressedEventKb);
  const [peakMultiplier, setPeakMultiplier] = useState(SCALE_DEFAULTS.peakMultiplier);
  const [safeEventsPerPartition, setSafeEventsPerPartition] = useState(SCALE_DEFAULTS.safeEventsPerPartition);
  const [headroomPercent, setHeadroomPercent] = useState(SCALE_DEFAULTS.headroomPercent);
  const [showInterviewExplanation, setShowInterviewExplanation] = useState(false);

  const calculations = useMemo(() => {
    const watchSecondsPerDay = watchHoursPerUser * 3600;
    const heartbeatsPerUser = watchSecondsPerDay / heartbeatSeconds;
    const heartbeatEvents = dauMillions * 1_000_000 * heartbeatsPerUser;
    const totalDailyEvents = heartbeatEvents * (1 + SCALE_DEFAULTS.additionalDailyEventsBillions);
    const rawTb = (totalDailyEvents * compressedEventKb) / 1_000_000_000;
    const avgEventsPerSecond = totalDailyEvents / 86400;
    const peakEventsPerSecond = avgEventsPerSecond * peakMultiplier;
    const partitions = Math.ceil((peakEventsPerSecond / safeEventsPerPartition) * (1 + headroomPercent / 100));
    const bronzeHotPb = (rawTb * SCALE_DEFAULTS.bronzeHotDays) / 1000;
    const silverPb = ((rawTb * 0.5) * SCALE_DEFAULTS.silverRetentionDays) / 1000;
    return {
      watchSecondsPerDay,
      heartbeatsPerUser,
      heartbeatEvents,
      rawTb,
      avgEventsPerSecond,
      peakEventsPerSecond,
      partitions,
      bronzeHotPb,
      silverPb,
    };
  }, [compressedEventKb, dauMillions, headroomPercent, heartbeatSeconds, peakMultiplier, safeEventsPerPartition, watchHoursPerUser]);

  const interviewExplanation =
    "I won’t randomly say Kafka needs 300 partitions. I’ll derive it from DAU, heartbeat frequency, event size, peak multiplier, and safe throughput per partition.";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
                Interactive scale calculator
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                Turn interview assumptions into throughput, storage, and partition math.
              </p>
            </div>
            <button onClick={() => setShowInterviewExplanation((v) => !v)} className="text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
              Show Interview Explanation
            </button>
          </div>
          <div className="space-y-4">
            <RangeField label="DAU (millions)" value={dauMillions} min={20} max={150} step={5} suffix="M" onChange={setDauMillions} />
            <RangeField label="Watch time / user / day" value={watchHoursPerUser} min={1} max={4} step={0.5} suffix="h" onChange={setWatchHoursPerUser} />
            <SelectField label="Heartbeat frequency" value={heartbeatSeconds} options={[10, 15, 30, 60]} suffix="sec" onChange={setHeartbeatSeconds} />
            <RangeField label="Compressed event size" value={compressedEventKb} min={0.5} max={2} step={0.1} suffix="KB" onChange={setCompressedEventKb} />
            <RangeField label="Peak multiplier" value={peakMultiplier} min={2} max={8} step={1} suffix="x" onChange={setPeakMultiplier} />
            <RangeField label="Safe events/sec/partition" value={safeEventsPerPartition} min={5000} max={20000} step={1000} suffix="" onChange={setSafeEventsPerPartition} />
            <RangeField label="Headroom" value={headroomPercent} min={10} max={60} step={5} suffix="%" onChange={setHeadroomPercent} />
          </div>
          {showInterviewExplanation ? (
            <div className="mt-5 rounded-2xl p-4" style={{ background: `${T.blue}0f`, border: `1px solid ${T.blue}24` }}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-sm font-semibold" style={{ color: T.text }}>
                  How to say it in the interview
                </p>
                <CopyButton value={interviewExplanation} />
              </div>
              <p className="text-sm leading-7" style={{ color: T.muted }}>
                {interviewExplanation}
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Heartbeats / user / day" value={formatNumber(calculations.heartbeatsPerUser, 0)} note="watch_seconds_per_day / heartbeat_interval" color={T.blue} />
          <MetricCard label="Heartbeat events / day" value={`${formatBig(calculations.heartbeatEvents)}`} note={`${dauMillions}M users x ${formatNumber(calculations.heartbeatsPerUser, 0)}`} color={T.red} />
          <MetricCard label="Raw TB / day" value={`${formatNumber(calculations.rawTb, 1)} TB`} note="Only compressed events, before replication and long-term lifecycle" color={T.amber} />
          <MetricCard label="Avg events / sec" value={formatBig(calculations.avgEventsPerSecond)} note="daily_events / 86,400" color={T.green} />
          <MetricCard label="Peak events / sec" value={formatBig(calculations.peakEventsPerSecond)} note="avg events/sec x peak multiplier" color={T.violet} />
          <MetricCard label="Kafka partitions" value={String(calculations.partitions)} note="ceil(peak / per_partition x headroom)" color={T.gold} />
          <MetricCard label="Bronze hot storage" value={`${formatNumber(calculations.bronzeHotPb, 2)} PB`} note="Assumes 90 hot days of raw history" color={T.blue} />
          <MetricCard label="Silver retention" value={`${formatNumber(calculations.silverPb, 2)} PB`} note="Assumes Silver compresses to 50% and retains 2 years" color={T.violet} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormulaCard title="Heartbeats per user/day" formula="watch_seconds_per_day / heartbeat_interval_sec" example={`${formatNumber(calculations.watchSecondsPerDay, 0)} / ${heartbeatSeconds} = ${formatNumber(calculations.heartbeatsPerUser, 0)}`} />
        <FormulaCard title="Peak events/sec" formula="daily_events / 86,400 x peak_multiplier" example={`${formatBig(calculations.avgEventsPerSecond)} x ${peakMultiplier} = ${formatBig(calculations.peakEventsPerSecond)}`} />
        <FormulaCard title="Kafka partitions" formula="ceil(peak_events_per_sec / safe_events_per_partition x headroom)" example={`ceil(${formatBig(calculations.peakEventsPerSecond)} / ${safeEventsPerPartition} x ${1 + headroomPercent / 100}) = ${calculations.partitions}`} />
      </div>
    </div>
  );
}

function EventTaxonomyTab() {
  const [familyId, setFamilyId] = useState<EventFamilyId>(EVENT_FAMILIES[0].id);
  const [eventId, setEventId] = useState<EventId>(EVENT_FAMILIES[0].events[0].id);
  const family = EVENT_FAMILIES.find((item) => item.id === familyId) ?? EVENT_FAMILIES[0];
  const selectedEvent = family.events.find((item) => item.id === eventId) ?? family.events[0];

  useEffect(() => {
    setEventId(family.events[0].id);
  }, [familyId, family.events]);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-4">
        {EVENT_FAMILIES.map((group) => (
          <button
            key={group.id}
            onClick={() => setFamilyId(group.id)}
            className="w-full text-left rounded-[22px] p-5 cursor-pointer"
            style={{
              background: familyId === group.id ? `${group.color}0f` : T.card,
              border: `1px solid ${familyId === group.id ? `${group.color}35` : T.border}`,
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: group.color }}>
                  {group.title}
                </p>
                <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                  {group.events.length} key interview events
                </p>
              </div>
              <Pill color={group.color}>Family</Pill>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.events.map((event) => (
                <button
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFamilyId(group.id);
                    setEventId(event.id);
                  }}
                  className="px-3 py-2 rounded-full text-xs font-semibold cursor-pointer"
                  style={{
                    background: selectedEvent.id === event.id ? `${group.color}18` : T.card2,
                    color: T.text,
                    border: `1px solid ${selectedEvent.id === event.id ? `${group.color}35` : T.border}`,
                  }}
                >
                  {event.name}
                </button>
              ))}
            </div>
          </button>
        ))}
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${family.color}24` }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: family.color }}>
              Event contract drawer
            </p>
            <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
              {selectedEvent.name}
            </h3>
          </div>
          <CopyButton value={selectedEvent.samplePayload} label="Copy payload" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <DetailBlock title="Purpose" accent={family.color}>
            {selectedEvent.purpose}
          </DetailBlock>
          <DetailBlock title="Used for" accent={family.color}>
            <ul className="space-y-2">
              {selectedEvent.usedFor.map((item) => (
                <li key={item} className="text-sm" style={{ color: T.muted }}>
                  {item}
                </li>
              ))}
            </ul>
          </DetailBlock>
          <DetailBlock title="Downstream consumers" accent={family.color}>
            <ul className="space-y-2">
              {selectedEvent.consumers.map((item) => (
                <li key={item} className="text-sm" style={{ color: T.muted }}>
                  {item}
                </li>
              ))}
            </ul>
          </DetailBlock>
        </div>
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr] mt-4">
          <div className="rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: family.color }}>
              Required fields
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedEvent.fields.map((field) => (
                <span key={field} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: `${family.color}12`, color: T.text, border: `1px solid ${family.color}24` }}>
                  {field}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-4 font-mono text-xs leading-6 overflow-auto no-scrollbar" style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text }}>
            <pre className="whitespace-pre-wrap">{selectedEvent.samplePayload}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchitectureTab({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  const [reveals, setReveals] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<ArchitectureNodeId>(ARCHITECTURE_NODES[2]?.id ?? ARCHITECTURE_NODES[0].id);
  const visibleNodes = ARCHITECTURE_NODES.filter((node) => node.reveal === "base" || reveals.includes(node.reveal));
  const selectedNode = visibleNodes.find((node) => node.id === selectedNodeId) ?? visibleNodes[0];

  useEffect(() => {
    if (!visibleNodes.find((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(visibleNodes[0]?.id ?? ARCHITECTURE_NODES[0].id);
    }
  }, [selectedNodeId, visibleNodes]);

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
              Progressive architecture diagram
            </p>
            <p className="text-[12px] mt-1" style={{ color: T.faint }}>
              Reveal additional platform responsibilities only when the interviewer is ready for them.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ARCHITECTURE_REVEALS.map((item) => {
              const active = reveals.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => setReveals((prev) => (prev.includes(item.id) ? prev.filter((entry) => entry !== item.id) : [...prev, item.id]))}
                  className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  style={{
                    background: active ? `${T.blue}18` : T.card2,
                    color: active ? T.blue : T.text,
                    border: `1px solid ${active ? `${T.blue}33` : T.border}`,
                  }}
                >
                  + {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[26px] p-5 relative overflow-hidden" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
          <div className="absolute inset-0 opacity-45" style={{ backgroundImage: "linear-gradient(color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="relative min-h-[420px]">
            {visibleNodes.map((node, index) => (
              <button
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[20px] px-4 py-3 text-left min-w-[170px] max-w-[210px] cursor-pointer transition-transform duration-200 hover:-translate-y-[52%]"
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  background: selectedNode?.id === node.id ? `${node.color}16` : T.card,
                  border: `1px solid ${selectedNode?.id === node.id ? `${node.color}35` : T.border}`,
                  boxShadow: selectedNode?.id === node.id ? `0 16px 26px ${node.color}18` : "none",
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: node.color }}>
                  Node
                </p>
                <p className="text-sm font-bold mt-1 leading-5" style={{ color: T.text }}>
                  {node.label}
                </p>
              </button>
            ))}
            <ArchitectureArrow left={14} top={34} color={T.blue} />
            <ArchitectureArrow left={30} top={34} color={T.amber} />
            <ArchitectureArrow left={46} top={34} color={T.blue} />
            <ArchitectureArrow left={62} top={34} color={T.violet} />
            <ArchitectureArrow left={78} top={45} color={T.gold} />
            <AnimatedDot left={12} delay={0} color={T.blue} />
            <AnimatedDot left={28} delay={1.1} color={T.amber} />
            <AnimatedDot left={44} delay={2.2} color={T.blue} />
            <AnimatedDot left={60} delay={3.1} color={T.violet} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${selectedNode?.color ?? T.blue}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: selectedNode?.color ?? T.blue }}>
                Pipeline node drawer
              </p>
              <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
                {selectedNode?.label}
              </h3>
            </div>
            <button onClick={() => onNavigate(selectedNode.deepDive)} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
              Open deep dive
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DetailBlock title="What it does" accent={selectedNode.color}>{selectedNode.what}</DetailBlock>
            <DetailBlock title="Why it exists" accent={selectedNode.color}>{selectedNode.why}</DetailBlock>
            <DetailBlock title="Input" accent={selectedNode.color}>{selectedNode.input}</DetailBlock>
            <DetailBlock title="Output" accent={selectedNode.color}>{selectedNode.output}</DetailBlock>
            <DetailBlock title="Failure mode" accent={selectedNode.color}>{selectedNode.failure}</DetailBlock>
            <DetailBlock title="Say this in interview" accent={selectedNode.color}>{selectedNode.interview}</DetailBlock>
          </div>
        </div>

        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.gold }}>
            Interview sequence
          </p>
          <FlowMapper
            accent={T.gold}
            steps={[
              "Start with the base path: Client Apps → Event Gateway → Kafka → Flink → Bronze Lake → BI + ML consumers.",
              "Add validation, topic design, and stream jobs once the base path is clear.",
              "Reveal Bronze/Silver/Gold to show where correctness, replay, and official metrics live.",
              "Finish by showing feature store, data quality, governance, and replay/backfill so the design feels production-ready.",
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function IngestionTab() {
  const [selectedLaneId, setSelectedLaneId] = useState<IngestionLaneId>(INGESTION_LANES[0].id);
  const selectedLane = INGESTION_LANES.find((lane) => lane.id === selectedLaneId) ?? INGESTION_LANES[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
      <div className="space-y-3">
        {INGESTION_LANES.map((lane) => {
          const active = selectedLane.id === lane.id;
          return (
            <button
              key={lane.id}
              onClick={() => setSelectedLaneId(lane.id)}
              className="w-full text-left rounded-[24px] p-5 cursor-pointer"
              style={{ background: active ? `${lane.color}0f` : T.card, border: `1px solid ${active ? `${lane.color}35` : T.border}` }}
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: lane.color }}>
                    {lane.title}
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                    {lane.flow.length} steps
                  </p>
                </div>
                <Pill color={lane.color}>Lane</Pill>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {lane.flow.map((step, index) => (
                  <div key={step} className="flex items-center gap-2">
                    <span className="px-3 py-2 rounded-full text-xs font-semibold" style={{ background: active ? `${lane.color}12` : T.card2, color: T.text, border: `1px solid ${active ? `${lane.color}24` : T.border}` }}>
                      {step}
                    </span>
                    {index < lane.flow.length - 1 ? <span style={{ color: lane.color }}>→</span> : null}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${selectedLane.color}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: selectedLane.color }}>
          Selected lane
        </p>
        <h3 className="text-2xl font-bold mb-4" style={{ color: T.text }}>
          {selectedLane.title}
        </h3>
        <FlowMapper steps={selectedLane.flow} accent={selectedLane.color} />
        <div className="space-y-3 mt-4">
          {selectedLane.details.map((item) => (
            <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
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

function KafkaTopicsTab() {
  const [selectedTopicId, setSelectedTopicId] = useState<KafkaTopicId>(KAFKA_TOPICS[0].id);
  const [peakEventsPerSec, setPeakEventsPerSec] = useState(2000000);
  const [safePerPartition, setSafePerPartition] = useState(10000);
  const [headroomPct, setHeadroomPct] = useState(30);
  const selectedTopic = KAFKA_TOPICS.find((topic) => topic.id === selectedTopicId) ?? KAFKA_TOPICS[0];
  const requiredPartitions = Math.ceil((peakEventsPerSec / safePerPartition) * (1 + headroomPct / 100));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-3 md:grid-cols-2">
          {KAFKA_TOPICS.map((topic) => {
            const active = selectedTopic.id === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => setSelectedTopicId(topic.id)}
                className="rounded-[22px] p-4 text-left cursor-pointer"
                style={{ background: active ? `${T.amber}12` : T.card, border: `1px solid ${active ? `${T.amber}33` : T.border}` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
                  Topic
                </p>
                <p className="text-sm font-bold mt-2" style={{ color: T.text }}>
                  {topic.name}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <MiniKpi label="Partitions" value={topic.partitions} />
                  <MiniKpi label="Retention" value={topic.retention} />
                  <MiniKpi label="Key" value={topic.key} />
                  <MiniKpi label="Format" value={topic.format} />
                </div>
              </button>
            );
          })}
        </div>
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
                Kafka topic explorer
              </p>
              <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
                {selectedTopic.name}
              </h3>
            </div>
            <Pill color={T.amber}>{selectedTopic.partitions} partitions</Pill>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InfoTile label="Retention" value={selectedTopic.retention} />
            <InfoTile label="Key" value={selectedTopic.key} />
            <InfoTile label="Format" value={selectedTopic.format} />
            <InfoTile label="Producer" value={selectedTopic.producer} />
          </div>
          <DetailBlock title="Consumers" accent={T.amber} className="mt-4">
            <ul className="space-y-2">
              {selectedTopic.consumers.map((item) => (
                <li key={item} className="text-sm" style={{ color: T.muted }}>
                  {item}
                </li>
              ))}
            </ul>
          </DetailBlock>
          <DetailBlock title="Risk" accent={T.red} className="mt-4">
            {selectedTopic.risk}
          </DetailBlock>
        </div>
      </div>

      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
              Interactive partition calculator
            </p>
            <p className="text-[12px] mt-1" style={{ color: T.faint }}>
              required partitions = ceil(peak / per_partition x headroom)
            </p>
          </div>
          <MetricCard label="Required partitions" value={String(requiredPartitions)} note="Ceiling with headroom included" color={T.gold} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <RangeField label="Peak events/sec" value={peakEventsPerSec} min={500000} max={3000000} step={100000} suffix="" onChange={setPeakEventsPerSec} />
          <RangeField label="Safe events/sec/partition" value={safePerPartition} min={5000} max={20000} step={1000} suffix="" onChange={setSafePerPartition} />
          <RangeField label="Headroom %" value={headroomPct} min={10} max={60} step={5} suffix="%" onChange={setHeadroomPct} />
        </div>
      </div>
    </div>
  );
}

function StreamingPipelineTab() {
  const [selectedJobId, setSelectedJobId] = useState<FlinkJobId>(FLINK_JOBS[0].id);
  const selectedJob = FLINK_JOBS.find((job) => job.id === selectedJobId) ?? FLINK_JOBS[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="grid gap-3 md:grid-cols-2">
        {FLINK_JOBS.map((job) => {
          const active = selectedJob.id === job.id;
          return (
            <button
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              className="rounded-[22px] p-4 text-left cursor-pointer"
              style={{ background: active ? `${job.color}12` : T.card, border: `1px solid ${active ? `${job.color}33` : T.border}` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: job.color }}>
                Flink job
              </p>
              <h3 className="text-sm font-bold mt-2" style={{ color: T.text }}>
                {job.title}
              </h3>
              <p className="text-[12px] mt-2" style={{ color: T.faint }}>
                {job.output}
              </p>
            </button>
          );
        })}
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${selectedJob.color}24` }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: selectedJob.color }}>
              Streaming job detail
            </p>
            <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
              {selectedJob.title}
            </h3>
          </div>
          <Pill color={selectedJob.color}>{selectedJob.sla}</Pill>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InfoTile label="Input topics" value={selectedJob.inputTopics.join(", ")} />
          <InfoTile label="KeyBy" value={selectedJob.keyBy} />
          <InfoTile label="State" value={selectedJob.state} />
          <InfoTile label="Window" value={selectedJob.window} />
          <InfoTile label="Watermark" value={selectedJob.watermark} />
          <InfoTile label="Output" value={selectedJob.output} />
        </div>
        <DetailBlock title="Failure behavior" accent={T.red} className="mt-4">
          {selectedJob.failure}
        </DetailBlock>
        <div className="mt-4 rounded-2xl p-4 relative overflow-hidden" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: selectedJob.color }}>
            Event animation
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {selectedJob.flow.map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <span className="px-3 py-2 rounded-full text-xs font-semibold relative" style={{ background: `${selectedJob.color}14`, color: T.text, border: `1px solid ${selectedJob.color}24` }}>
                  {step}
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full flow-pulse" style={{ background: selectedJob.color, animationDelay: `${index * 0.4}s` }} />
                </span>
                {index < selectedJob.flow.length - 1 ? <span style={{ color: selectedJob.color }}>→</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WatchTimeTab() {
  const [mode, setMode] = useState<WatchMetricMode>("engagement");
  const modeInfo = WATCH_TIME_DEFINITIONS.find((item) => item.id === mode) ?? WATCH_TIME_DEFINITIONS[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
                Interactive timeline
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                Heartbeats count. Pause does not. Buffering is tracked separately.
              </p>
            </div>
            <CopyButton
              value="For watch time, I will use heartbeat events as source of truth, not just play and pause events. Every valid heartbeat contributes heartbeat_interval_sec to watch_seconds. I will separately calculate total watch time, buffering time, session duration, and unique content coverage."
              label="Copy answer"
            />
          </div>
          <div className="space-y-3">
            {WATCH_TIME_TIMELINE.map((item) => (
              <div key={`${item.time}-${item.event}`} className="rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-3">
                  <span className="w-24 text-xs font-semibold" style={{ color: T.faint }}>
                    {item.time}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: T.text }}>
                    {item.event}
                  </span>
                </div>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{
                    background: item.status === "counted" ? `${T.green}12` : item.status === "ignored" ? `${T.red}12` : `${T.blue}12`,
                    color: item.status === "counted" ? T.green : item.status === "ignored" ? T.red : T.blue,
                    border: `1px solid ${item.status === "counted" ? `${T.green}24` : item.status === "ignored" ? `${T.red}24` : `${T.blue}24`}`,
                  }}
                >
                  {item.status === "counted" ? "Counted watch seconds" : item.status === "ignored" ? "Not counted" : "State change"}
                </span>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3 mt-4">
            <InfoTile label="Counted watch seconds" value="120" />
            <InfoTile label="Paused seconds" value="Not counted" />
            <InfoTile label="Buffering seconds" value="Tracked separately" />
          </div>
        </div>

        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.blue }}>
            Toggle definitions
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {WATCH_TIME_DEFINITIONS.map((item) => (
              <button key={item.id} onClick={() => setMode(item.id)} className="px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer" style={{ background: mode === item.id ? `${T.blue}18` : T.card2, color: mode === item.id ? T.blue : T.text, border: `1px solid ${mode === item.id ? `${T.blue}33` : T.border}` }}>
                {item.label}
              </button>
            ))}
          </div>
          <DetailBlock title={modeInfo.label} accent={T.blue}>
            {modeInfo.description}
          </DetailBlock>
          <div className="grid gap-4 mt-4">
            <div className="rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: T.amber }}>
                Total Watch Time
              </p>
              <div className="h-4 rounded-full overflow-hidden" style={{ background: `${T.amber}10` }}>
                <div className="h-full rounded-full" style={{ width: "100%", background: `linear-gradient(90deg, ${T.amber}, ${T.orange})` }} />
              </div>
              <p className="text-sm mt-2" style={{ color: T.muted }}>
                0–10 min + 5–15 min = 20 minutes
              </p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: T.violet }}>
                Unique Content Coverage
              </p>
              <div className="h-4 rounded-full overflow-hidden" style={{ background: `${T.violet}10` }}>
                <div className="h-full rounded-full" style={{ width: "75%", background: `linear-gradient(90deg, ${T.violet}, ${T.blue})` }} />
              </div>
              <p className="text-sm mt-2" style={{ color: T.muted }}>
                0–15 min = 15 minutes of unique coverage
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {WATCH_TIME_RULES.map((rule) => (
          <div key={rule} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-sm leading-7" style={{ color: T.muted }}>
              {rule}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionizationTab() {
  const [scenarioId, setScenarioId] = useState<SessionScenarioId>(SESSIONIZATION_SCENARIOS[0].id);
  const scenario = SESSIONIZATION_SCENARIOS.find((item) => item.id === scenarioId) ?? SESSIONIZATION_SCENARIOS[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-3">
        {SESSIONIZATION_SCENARIOS.map((item) => (
          <button
            key={item.id}
            onClick={() => setScenarioId(item.id)}
            className="w-full text-left rounded-[22px] p-5 cursor-pointer"
            style={{ background: scenario.id === item.id ? `${T.blue}12` : T.card, border: `1px solid ${scenario.id === item.id ? `${T.blue}33` : T.border}` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
              Scenario
            </p>
            <h3 className="text-sm font-bold mt-2" style={{ color: T.text }}>
              {item.title}
            </h3>
            <p className="text-[12px] mt-2" style={{ color: T.faint }}>
              {item.summary}
            </p>
          </button>
        ))}
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
          Session output
        </p>
        <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
          {scenario.title}
        </h3>
        <p className="text-sm mt-3 leading-7" style={{ color: T.muted }}>
          {scenario.output}
        </p>
        <div className="mt-5 rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.amber }}>
            Raw events → session
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {scenario.rawEvents.map((event, index) => (
              <div key={`${event}-${index}`} className="flex items-center gap-2">
                <span className="px-3 py-2 rounded-full text-xs font-semibold" style={{ background: `${T.amber}12`, color: T.text, border: `1px solid ${T.amber}24` }}>
                  {event}
                </span>
                {index < scenario.rawEvents.length - 1 ? <span style={{ color: T.amber }}>→</span> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr] mt-4">
          <div className="rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.blue }}>
              Flink session state
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                "session_id",
                "session_start_time",
                "last_event_time",
                "last_heartbeat_time",
                "watch_seconds",
                "buffering_seconds",
                "pause_count",
                "seek_count",
                "seen_event_ids",
                "watched_segments",
              ].map((field) => (
                <span key={field} className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
                  {field}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.red }}>
              Long pause logic
            </p>
            <FlowMapper
              accent={T.red}
              steps={[
                "30 min inactivity timeout → close active session",
                "4 hour pause continuation → still same logical journey possible",
                "24 hour journey threshold → link related sessions into one viewing journey",
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LateEventsTab() {
  const [arrivalHours, setArrivalHours] = useState(0.08);
  const category = arrivalHours <= LATE_EVENT_POLICY.watermarkMinutes / 60
    ? { title: "On-time event", color: T.green, detail: "Process normally in the stream path." }
    : arrivalHours <= LATE_EVENT_POLICY.allowedLatenessHours
      ? { title: "Late but allowed event", color: T.amber, detail: "Update previous window or session state and let correction keep trust aligned." }
      : { title: "Very late event", color: T.red, detail: "Send to late_events / correction flow and patch Silver/Gold with an audited batch job." };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${category.color}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
                Late event simulator
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                Drag arrival delay to see how the event should be handled.
              </p>
            </div>
            <Pill color={category.color}>{category.title}</Pill>
          </div>
          <RangeField label="Arrival delay after event time" value={arrivalHours} min={0} max={36} step={0.25} suffix="h" onChange={setArrivalHours} />
          <div className="grid gap-3 md:grid-cols-3 mt-5">
            <PathCard title="On-time event" active={category.title === "On-time event"} color={T.green} detail="Process normally with streaming state and live outputs." />
            <PathCard title="Late but allowed" active={category.title === "Late but allowed event"} color={T.amber} detail="Update previous windows or sessions if within allowed lateness." />
            <PathCard title="Very late event" active={category.title === "Very late event"} color={T.red} detail="Route to late_events and correction flow." />
          </div>
          <div className="mt-4 rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-sm leading-7" style={{ color: T.muted }}>
              {category.detail}
            </p>
          </div>
        </div>

        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
                Replay flow
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                Controlled correction, not manual copy-paste.
              </p>
            </div>
            <CopyButton value={LATE_EVENT_POLICY.interviewAnswer} label="Copy answer" />
          </div>
          <FlowMapper steps={REPLAY_FLOW} accent={T.red} />
          <div className="mt-4 rounded-2xl p-4" style={{ background: `${T.red}10`, border: `1px solid ${T.red}24` }}>
            <p className="text-sm leading-7 font-medium" style={{ color: T.text }}>
              {LATE_EVENT_POLICY.replayWarning}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LakehouseTab() {
  const [layerId, setLayerId] = useState<LakehouseLayerId>(LAKEHOUSE_LAYERS[0].id);
  const layer = LAKEHOUSE_LAYERS.find((item) => item.id === layerId) ?? LAKEHOUSE_LAYERS[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="space-y-3">
        {LAKEHOUSE_LAYERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setLayerId(item.id)}
            className="w-full text-left rounded-[24px] p-5 cursor-pointer"
            style={{ background: item.id === layer.id ? `${item.color}10` : T.card, border: `1px solid ${item.id === layer.id ? `${item.color}35` : T.border}` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.color }}>
              {item.title}
            </p>
            <h3 className="text-lg font-bold mt-2" style={{ color: T.text }}>
              {item.summary}
            </h3>
          </button>
        ))}
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${layer.color}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: layer.color }}>
          Medallion layer explorer
        </p>
        <h3 className="text-2xl font-bold mt-2 mb-4" style={{ color: T.text }}>
          {layer.title}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <DetailBlock title="Inputs" accent={layer.color}>
            <ul className="space-y-2">
              {layer.inputs.map((item) => (
                <li key={item} className="text-sm" style={{ color: T.muted }}>
                  {item}
                </li>
              ))}
            </ul>
          </DetailBlock>
          <DetailBlock title="Rules" accent={layer.color}>
            <ul className="space-y-2">
              {layer.rules.map((item) => (
                <li key={item} className="text-sm" style={{ color: T.muted }}>
                  {item}
                </li>
              ))}
            </ul>
          </DetailBlock>
        </div>
      </div>
    </div>
  );
}

function TableDesignTab() {
  const [tableName, setTableName] = useState<TableName>(TABLE_SCHEMAS[0].name);
  const [columnName, setColumnName] = useState<TableColumnName>(TABLE_SCHEMAS[0].columns[0]?.name ?? "");
  const table = TABLE_SCHEMAS.find((item) => item.name === tableName) ?? TABLE_SCHEMAS[0];
  const column = table.columns.find((item) => item.name === columnName) ?? table.columns[0];
  const columnFormula = "formula" in column ? column.formula : undefined;

  useEffect(() => {
    setColumnName((table.columns[0]?.name ?? "") as TableColumnName);
  }, [table.name, table.columns]);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.6fr_0.8fr_0.8fr]">
      <div className="rounded-[24px] p-4" style={{ background: T.card, border: `1px solid ${T.violet}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.violet }}>
          Tables
        </p>
        <div className="space-y-2">
          {TABLE_SCHEMAS.map((item) => (
            <button key={item.name} onClick={() => setTableName(item.name)} className="w-full text-left rounded-xl p-3 cursor-pointer" style={{ background: item.name === table.name ? `${T.violet}12` : T.card2, border: `1px solid ${item.name === table.name ? `${T.violet}33` : T.border}` }}>
              <p className="text-sm font-semibold" style={{ color: T.text }}>
                {item.name}
              </p>
              <p className="text-[11px] mt-1" style={{ color: T.faint }}>
                {item.group}
              </p>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] p-4" style={{ background: T.card, border: `1px solid ${T.violet}24` }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.violet }}>
              Schema columns
            </p>
            <h3 className="text-xl font-bold mt-1" style={{ color: T.text }}>
              {table.name}
            </h3>
          </div>
          <Pill color={T.violet}>{table.group}</Pill>
        </div>
        <div className="space-y-2">
          {table.columns.map((item) => (
            <button key={item.name} onClick={() => setColumnName(item.name)} className="w-full text-left rounded-xl p-3 cursor-pointer" style={{ background: item.name === column.name ? `${T.blue}12` : T.card2, border: `1px solid ${item.name === column.name ? `${T.blue}33` : T.border}` }}>
              <p className="text-sm font-semibold" style={{ color: T.text }}>
                {item.name}
              </p>
              <p className="text-[11px] mt-1" style={{ color: T.faint }}>
                {item.type}
              </p>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <div className="grid gap-3 md:grid-cols-2 mb-4">
          <InfoTile label="Grain" value={table.grain} />
          <InfoTile label="Partition" value={table.partition} />
          <InfoTile label="Bucket" value={table.bucket} />
          <InfoTile label="Use case" value={table.useCase} />
        </div>
        <DetailBlock title={column.name} accent={T.blue}>
          <p className="text-sm leading-7" style={{ color: T.muted }}>
            {column.definition}
          </p>
          {columnFormula ? (
            <div className="mt-3 rounded-xl p-3 font-mono text-xs" style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text }}>
              {columnFormula}
            </div>
          ) : null}
        </DetailBlock>
        <DetailBlock title="Example query" accent={T.violet} className="mt-4">
          <pre className="whitespace-pre-wrap font-mono text-xs leading-6" style={{ color: T.text }}>
            {table.exampleQuery}
          </pre>
        </DetailBlock>
        <DetailBlock title="Interview follow-up" accent={T.red} className="mt-4">
          {table.followUp}
        </DetailBlock>
      </div>
    </div>
  );
}

function BatchPipelineTab() {
  const [stepId, setStepId] = useState<BatchStepId>(BATCH_DAG_STEPS[0].id);
  const step = BATCH_DAG_STEPS.find((item) => item.id === stepId) ?? BATCH_DAG_STEPS[0];

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.gold }}>
          Airflow / Maestro style workflow
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {BATCH_DAG_STEPS.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <button onClick={() => setStepId(item.id)} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: step.id === item.id ? `${T.gold}16` : T.card2, color: T.text, border: `1px solid ${step.id === item.id ? `${T.gold}33` : T.border}` }}>
                {item.label}
              </button>
              {index < BATCH_DAG_STEPS.length - 1 ? <span style={{ color: T.gold }}>↓</span> : null}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
          Selected DAG node
        </p>
        <h3 className="text-2xl font-bold mt-2 mb-4" style={{ color: T.text }}>
          {step.label}
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <DetailBlock title="Inputs" accent={T.gold}>{step.input}</DetailBlock>
          <DetailBlock title="Logic" accent={T.gold}>{step.logic}</DetailBlock>
          <DetailBlock title="Output" accent={T.gold}>{step.output}</DetailBlock>
        </div>
      </div>
    </div>
  );
}

function DataQualityTab() {
  const [selectedMetric, setSelectedMetric] = useState<DqMetricLabel>(DQ_METRICS[1].label);
  const metric = DQ_METRICS.find((item) => item.label === selectedMetric) ?? DQ_METRICS[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DQ_METRICS.map((item) => (
          <button key={item.label} onClick={() => setSelectedMetric(item.label)} className="rounded-2xl p-4 text-left cursor-pointer" style={{ background: metric.label === item.label ? `${item.color}12` : T.card, border: `1px solid ${metric.label === item.label ? `${item.color}33` : T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: item.color }}>
              {item.label}
            </p>
            <p className="text-2xl font-bold mt-2" style={{ color: T.text }}>
              {item.value}
            </p>
            <p className="text-[12px] mt-2 leading-5" style={{ color: T.faint }}>
              {item.note}
            </p>
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${metric.color}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: metric.color }}>
            Investigation path
          </p>
          <h3 className="text-2xl font-bold mt-2 mb-4" style={{ color: T.text }}>
            {metric.label}
          </h3>
          <p className="text-sm leading-7 mb-4" style={{ color: T.muted }}>
            Possible causes: missing Kafka partition, Flink lag, schema change, bad dedupe logic, content dimension join failure, or late-event spike.
          </p>
          <FlowMapper steps={DQ_INVESTIGATION_PATH} accent={metric.color} />
        </div>
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.red }}>
            Severity cards
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {DQ_SEVERITIES.map((item) => (
              <div key={item.level} className="rounded-2xl p-4" style={{ background: `${item.color}10`, border: `1px solid ${item.color}24` }}>
                <p className="text-sm font-bold" style={{ color: item.color }}>
                  {item.level}
                </p>
                <p className="text-sm mt-2 leading-6" style={{ color: T.muted }}>
                  {item.rule}
                </p>
                <p className="text-[12px] mt-2" style={{ color: T.faint }}>
                  {item.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GovernanceTab() {
  const [fieldName, setFieldName] = useState<GovernanceFieldName>(GOVERNANCE_FIELDS[0].name);
  const field = GOVERNANCE_FIELDS.find((item) => item.name === fieldName) ?? GOVERNANCE_FIELDS[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.green }}>
          PII classification matrix
        </p>
        <div className="space-y-3">
          {GOVERNANCE_FIELDS.map((item) => (
            <button key={item.name} onClick={() => setFieldName(item.name)} className="w-full text-left rounded-2xl p-4 cursor-pointer" style={{ background: field.name === item.name ? `${T.green}12` : T.card2, border: `1px solid ${field.name === item.name ? `${T.green}33` : T.border}` }}>
              <p className="text-sm font-bold" style={{ color: T.text }}>
                {item.name}
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                {item.classification}
              </p>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.green}24` }}>
        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.green }}>
              Field policy
            </p>
            <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
              {field.name}
            </h3>
            <p className="text-sm mt-2" style={{ color: T.faint }}>
              {field.classification}
            </p>
            <div className="space-y-3 mt-4">
              {field.policy.map((item) => (
                <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <p className="text-sm leading-7" style={{ color: T.muted }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.green }}>
              Must include
            </p>
            <div className="space-y-3">
              {GOVERNANCE_CHECKLIST.map((item) => (
                <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <p className="text-sm leading-7" style={{ color: T.muted }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureStoreTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <FeatureCard title={FEATURE_STORE_CONTENT.offline.title} color={FEATURE_STORE_CONTENT.offline.color} summary={FEATURE_STORE_CONTENT.offline.summary} bullets={FEATURE_STORE_CONTENT.offline.bullets} />
        <FeatureCard title={FEATURE_STORE_CONTENT.online.title} color={FEATURE_STORE_CONTENT.online.color} summary={FEATURE_STORE_CONTENT.online.summary} bullets={FEATURE_STORE_CONTENT.online.bullets} />
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.purple}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.purple }}>
          Feature flow
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {FEATURE_STORE_CONTENT.flow.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <span className="px-3 py-2 rounded-full text-xs font-semibold" style={{ background: `${T.purple}12`, color: T.text, border: `1px solid ${T.purple}24` }}>
                {step}
              </span>
              {index < FEATURE_STORE_CONTENT.flow.length - 1 ? <span style={{ color: T.purple }}>→</span> : null}
            </div>
          ))}
        </div>
      </div>
      <AnswerCard title="Point-in-time correctness" body={FEATURE_STORE_CONTENT.pointInTime} accent={T.purple} />
    </div>
  );
}

function ServingLayerTab() {
  const [workload, setWorkload] = useState<ServingWorkload>(SERVING_MATRIX[0].workload);
  const item = SERVING_MATRIX.find((entry) => entry.workload === workload) ?? SERVING_MATRIX[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.gold }}>
          Workload-to-store matrix
        </p>
        <div className="space-y-3">
          {SERVING_MATRIX.map((entry) => (
            <button key={entry.workload} onClick={() => setWorkload(entry.workload)} className="w-full text-left rounded-2xl p-4 cursor-pointer" style={{ background: workload === entry.workload ? `${T.gold}12` : T.card2, border: `1px solid ${workload === entry.workload ? `${T.gold}33` : T.border}` }}>
              <p className="text-sm font-bold" style={{ color: T.text }}>
                {entry.workload}
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                {entry.recommended}
              </p>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.gold}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
          Selected workload
        </p>
        <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
          {item.workload}
        </h3>
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <DetailBlock title="Recommended" accent={T.gold}>{item.recommended}</DetailBlock>
          <DetailBlock title="Why" accent={T.gold}>{item.why}</DetailBlock>
          <DetailBlock title="Not ideal" accent={T.red} className="md:col-span-2">{item.notIdeal}</DetailBlock>
        </div>
      </div>
    </div>
  );
}

function ReliabilityTab() {
  const [incidentId, setIncidentId] = useState<ReliabilityIncidentId>(RELIABILITY_INCIDENTS[0].id);
  const incident = RELIABILITY_INCIDENTS.find((item) => item.id === incidentId) ?? RELIABILITY_INCIDENTS[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-3">
        {RELIABILITY_INCIDENTS.map((item) => (
          <button key={item.id} onClick={() => setIncidentId(item.id)} className="w-full text-left rounded-[22px] p-5 cursor-pointer" style={{ background: incident.id === item.id ? `${T.red}12` : T.card, border: `1px solid ${incident.id === item.id ? `${T.red}33` : T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
              Incident
            </p>
            <h3 className="text-sm font-bold mt-2" style={{ color: T.text }}>
              {item.title}
            </h3>
          </button>
        ))}
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
          Incident simulator
        </p>
        <h3 className="text-2xl font-bold mt-2 mb-4" style={{ color: T.text }}>
          {incident.title}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <DetailBlock title="Detection" accent={T.red}>{incident.detection}</DetailBlock>
          <DetailBlock title="Impact" accent={T.red}>{incident.impact}</DetailBlock>
          <DetailBlock title="Mitigation" accent={T.amber}>{incident.mitigation}</DetailBlock>
          <DetailBlock title="Recovery" accent={T.green}>{incident.recovery}</DetailBlock>
          <DetailBlock title="Prevention" accent={T.blue}>{incident.prevention}</DetailBlock>
          <DetailBlock title="Interview answer" accent={T.violet}>{incident.interview}</DetailBlock>
        </div>
      </div>
    </div>
  );
}

function TradeoffsTab() {
  const [decision, setDecision] = useState<TradeoffDecision>(TRADEOFFS[0].decision);
  const item = TRADEOFFS.find((entry) => entry.decision === decision) ?? TRADEOFFS[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-3">
        {TRADEOFFS.map((entry) => (
          <button key={entry.decision} onClick={() => setDecision(entry.decision)} className="rounded-[22px] p-4 text-left cursor-pointer" style={{ background: item.decision === entry.decision ? `${T.amber}12` : T.card, border: `1px solid ${item.decision === entry.decision ? `${T.amber}33` : T.border}` }}>
            <p className="text-sm font-bold" style={{ color: T.text }}>
              {entry.decision}
            </p>
            <p className="text-[12px] mt-1" style={{ color: T.faint }}>
              {entry.recommendation}
            </p>
          </button>
        ))}
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.amber}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.amber }}>
          Trade-off matrix
        </p>
        <h3 className="text-2xl font-bold mt-2 mb-4" style={{ color: T.text }}>
          {item.decision}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <DetailBlock title="Option A" accent={T.blue}>{item.optionA}</DetailBlock>
          <DetailBlock title="Option B" accent={T.violet}>{item.optionB}</DetailBlock>
          <DetailBlock title="Recommendation" accent={T.green} className="md:col-span-2">{item.recommendation}</DetailBlock>
          <DetailBlock title="Why" accent={T.amber}>{item.why}</DetailBlock>
          <DetailBlock title="When to change" accent={T.red}>{item.whenToChange}</DetailBlock>
        </div>
        <div className="mt-4 rounded-2xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: T.amber }}>
            Required trade-offs
          </p>
          <div className="space-y-2">
            {item.tradeoffs.map((tradeoff) => (
              <p key={tradeoff} className="text-sm" style={{ color: T.muted }}>
                {tradeoff}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InterviewQATab({ onNavigate }: { onNavigate: (tab: DataEngineeringTabSlug) => void }) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<InterviewQuestionId>(INTERVIEW_QUESTIONS[0].id);
  const tags = Array.from(new Set(INTERVIEW_QUESTIONS.map((item) => item.tag)));
  const filtered = activeTag ? INTERVIEW_QUESTIONS.filter((item) => item.tag === activeTag) : INTERVIEW_QUESTIONS;
  const question = filtered.find((item) => item.id === questionId) ?? filtered[0] ?? INTERVIEW_QUESTIONS[0];

  useEffect(() => {
    if (!filtered.find((item) => item.id === questionId)) {
      setQuestionId(filtered[0]?.id ?? INTERVIEW_QUESTIONS[0].id);
    }
  }, [filtered, questionId]);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setActiveTag(null)} className="px-3 py-2 rounded-full text-xs font-semibold cursor-pointer" style={{ background: activeTag === null ? `${T.blue}18` : T.card2, color: activeTag === null ? T.blue : T.text, border: `1px solid ${activeTag === null ? `${T.blue}33` : T.border}` }}>
            All
          </button>
          {tags.map((tag) => (
            <button key={tag} onClick={() => setActiveTag(tag)} className="px-3 py-2 rounded-full text-xs font-semibold cursor-pointer" style={{ background: activeTag === tag ? `${T.blue}18` : T.card2, color: activeTag === tag ? T.blue : T.text, border: `1px solid ${activeTag === tag ? `${T.blue}33` : T.border}` }}>
              {tag}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {filtered.map((item) => (
            <button key={item.id} onClick={() => setQuestionId(item.id)} className="w-full text-left rounded-2xl p-4 cursor-pointer" style={{ background: item.id === question.id ? `${T.blue}12` : T.card2, border: `1px solid ${item.id === question.id ? `${T.blue}33` : T.border}` }}>
              <p className="text-sm font-semibold" style={{ color: T.text }}>
                {item.question}
              </p>
              <p className="text-[12px] mt-1" style={{ color: T.faint }}>
                {item.tag}
              </p>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.blue}24` }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.blue }}>
              Question bank
            </p>
            <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
              {question.question}
            </h3>
          </div>
          <div className="flex gap-2">
            <CopyButton value={question.strongAnswer} label="Copy answer" />
            <button onClick={() => onNavigate(question.linkedTab)} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
              Open diagram link
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <DetailBlock title="Strong answer" accent={T.green}>{question.strongAnswer}</DetailBlock>
          <DetailBlock title="Common follow-up" accent={T.amber}>{question.followUp}</DetailBlock>
          <DetailBlock title="Bad answer to avoid" accent={T.red} className="md:col-span-2">{question.badAnswer}</DetailBlock>
        </div>
      </div>
    </div>
  );
}

function MockInterviewTabCustom() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showHints, setShowHints] = useState(false);
  const [showStrongAnswer, setShowStrongAnswer] = useState(false);
  const step = MOCK_INTERVIEW_STEPS[stepIndex];
  const answer = answers[step.id] ?? "";
  const keywords = step.hints.flatMap((hint) => hint.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((token) => token.length > 4));
  const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 12);
  const score = uniqueKeywords.reduce((count, token) => (answer.toLowerCase().includes(token) ? count + 1 : count), 0);
  const normalizedScore = Math.min(5, Math.round((score / Math.max(uniqueKeywords.length, 1)) * 5));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[0.75fr_1.1fr_0.8fr]">
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.red }}>
            Interview flow
          </p>
          <div className="space-y-3">
            {MOCK_INTERVIEW_STEPS.map((item, index) => (
              <button key={item.id} onClick={() => { setStepIndex(index); setShowHints(false); setShowStrongAnswer(false); }} className="w-full text-left rounded-2xl p-4 cursor-pointer" style={{ background: step.id === item.id ? `${T.red}12` : T.card2, border: `1px solid ${step.id === item.id ? `${T.red}33` : T.border}` }}>
                <p className="text-sm font-semibold" style={{ color: T.text }}>
                  Step {index + 1}: {item.title}
                </p>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.red }}>
                Interviewer question
              </p>
              <h3 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
                {step.title}
              </h3>
            </div>
            <Pill color={T.red}>{stepIndex + 1} / {MOCK_INTERVIEW_STEPS.length}</Pill>
          </div>
          <div className="rounded-2xl p-4 mb-4" style={{ background: `${T.red}0f`, border: `1px solid ${T.red}24` }}>
            <p className="text-sm leading-7" style={{ color: T.text }}>
              {step.interviewer}
            </p>
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [step.id]: e.target.value }))}
            className="w-full min-h-[240px] rounded-2xl p-4 text-sm resize-none"
            style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text, outline: "none" }}
            placeholder="Write your answer as if you are responding in a senior data-engineering interview."
          />
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => setShowHints((v) => !v)} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
              {showHints ? "Hide hints" : "Reveal hint"}
            </button>
            <button onClick={() => setShowStrongAnswer((v) => !v)} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
              {showStrongAnswer ? "Hide strong answer" : "Show strong answer"}
            </button>
            <button onClick={() => setStepIndex((value) => Math.min(value + 1, MOCK_INTERVIEW_STEPS.length - 1))} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.red, color: "#fff", border: "1px solid transparent" }}>
              Next step
            </button>
          </div>
        </div>
        <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.red }}>
            Hints and scoring
          </p>
          <div className="rounded-2xl p-4 mb-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-sm font-semibold" style={{ color: T.text }}>
              Score me
            </p>
            <p className="text-4xl font-bold mt-2" style={{ color: normalizedScore >= 4 ? T.green : normalizedScore >= 2 ? T.amber : T.red }}>
              {normalizedScore}/5
            </p>
            <p className="text-[12px] mt-2" style={{ color: T.faint }}>
              Approximate checklist coverage based on must-mention keywords.
            </p>
          </div>
          <div className="space-y-2 mb-4">
            {step.checklist.map((item) => (
              <div key={item} className="rounded-xl p-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                <p className="text-sm" style={{ color: T.muted }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
          {showHints ? (
            <div className="space-y-3 mb-4">
              {step.hints.slice(0, 3).map((hint) => (
                <div key={hint} className="rounded-xl p-3" style={{ background: `${T.amber}10`, border: `1px solid ${T.amber}24` }}>
                  <p className="text-sm leading-6" style={{ color: T.muted }}>
                    {hint}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {showStrongAnswer ? (
            <AnswerCard title="Strong answer direction" body={step.hints.join(" ")} accent={T.green} />
          ) : null}
        </div>
      </div>

      <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${T.red}24` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: T.red }}>
          Scoring rubric
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {MOCK_INTERVIEW_RUBRIC.map((item) => (
            <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
              <p className="text-sm font-semibold" style={{ color: T.text }}>
                {item}
              </p>
              <p className="text-[12px] mt-2" style={{ color: T.faint }}>
                0–5
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheatSheetTabCustom() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        <AnswerCard title="30-second answer" body={CHEAT_SHEET_CONTENT.thirtySecond} accent={T.red} />
        <AnswerCard title="2-minute answer" body={CHEAT_SHEET_CONTENT.twoMinute} accent={T.blue} />
        <AnswerCard title="Closing statement" body={CHEAT_SHEET_CONTENT.closingStatement} accent={T.green} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CheatList title="5-minute architecture walkthrough" items={CHEAT_SHEET_CONTENT.fiveMinuteFlow} color={T.blue} />
        <CheatList title="Must mention" items={CHEAT_SHEET_CONTENT.mustMention} color={T.green} />
        <CheatList title="Common mistakes" items={CHEAT_SHEET_CONTENT.commonMistakes} color={T.red} />
        <CheatList title="Scale numbers" items={CHEAT_SHEET_CONTENT.scaleNumbers} color={T.amber} />
        <CheatList title="Kafka formulas" items={CHEAT_SHEET_CONTENT.formulas} color={T.gold} />
        <CheatList title="Watch-time rules" items={CHEAT_SHEET_CONTENT.watchTimeRules} color={T.blue} />
        <CheatList title="Sessionization rules" items={CHEAT_SHEET_CONTENT.sessionizationRules} color={T.violet} />
        <CheatList title="Late-event strategy" items={CHEAT_SHEET_CONTENT.lateStrategy} color={T.red} />
        <CheatList title="Bronze / Silver / Gold" items={CHEAT_SHEET_CONTENT.bronzeSilverGold} color={T.violet} />
        <CheatList title="Table names" items={CHEAT_SHEET_CONTENT.tableNames} color={T.blue} />
        <CheatList title="Failure modes" items={CHEAT_SHEET_CONTENT.failureModes} color={T.red} />
        <CheatList title="Trade-off one-liners" items={CHEAT_SHEET_CONTENT.tradeoffLines} color={T.amber} />
      </div>
    </div>
  );
}

function ContentForTab({
  activeTab,
  onNavigate,
}: {
  activeTab: DataEngineeringTabSlug;
  onNavigate: (tab: DataEngineeringTabSlug) => void;
}) {
  switch (activeTab) {
    case "start-here":
      return <StartHereTab onNavigate={onNavigate} />;
    case "requirements":
      return <RequirementsTab />;
    case "scale-estimation":
      return <ScaleEstimationTab />;
    case "event-taxonomy":
      return <EventTaxonomyTab />;
    case "high-level-data-architecture":
      return <ArchitectureTab onNavigate={onNavigate} />;
    case "ingestion-layer":
      return <IngestionTab />;
    case "kafka-topic-design":
      return <KafkaTopicsTab />;
    case "streaming-pipeline":
      return <StreamingPipelineTab />;
    case "watch-time-calculation":
      return <WatchTimeTab />;
    case "sessionization":
      return <SessionizationTab />;
    case "late-events-replay":
      return <LateEventsTab />;
    case "lakehouse-design":
      return <LakehouseTab />;
    case "table-design":
      return <TableDesignTab />;
    case "batch-pipeline":
      return <BatchPipelineTab />;
    case "data-quality":
      return <DataQualityTab />;
    case "governance-security":
      return <GovernanceTab />;
    case "feature-store-ml-data":
      return <FeatureStoreTab />;
    case "serving-layer":
      return <ServingLayerTab />;
    case "reliability-backfill":
      return <ReliabilityTab />;
    case "trade-offs":
      return <TradeoffsTab />;
    case "interview-qa":
      return <InterviewQATab onNavigate={onNavigate} />;
    case "mock-interview":
      return <MockInterviewTabCustom />;
    case "cheat-sheet":
      return <CheatSheetTabCustom />;
  }
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-2" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] uppercase tracking-[0.14em]" style={{ color: T.faint }}>
        {label}
      </p>
      <p className="text-[11px] mt-1 leading-5" style={{ color: T.text }}>
        {value}
      </p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] uppercase tracking-[0.14em]" style={{ color: T.faint }}>
        {label}
      </p>
      <p className="text-sm mt-1 leading-6" style={{ color: T.text }}>
        {value}
      </p>
    </div>
  );
}

function DetailBlock({
  title,
  accent,
  className,
  children,
}: {
  title: string;
  accent: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl p-4", className)} style={{ background: T.card2, border: `1px solid ${accent}22` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: accent }}>
        {title}
      </p>
      <div>{children}</div>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm font-semibold" style={{ color: T.text }}>
          {label}
        </span>
        <span className="text-sm" style={{ color: T.faint }}>
          {formatNumber(value, step < 1 ? 1 : 0)}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm font-semibold" style={{ color: T.text }}>
          {label}
        </span>
        <span className="text-sm" style={{ color: T.faint }}>
          {value}{suffix}
        </span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl px-3 py-3 text-sm"
        style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}{suffix}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormulaCard({
  title,
  formula,
  example,
}: {
  title: string;
  formula: string;
  example: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
        {title}
      </p>
      <p className="text-sm font-mono mt-3" style={{ color: T.text }}>
        {formula}
      </p>
      <p className="text-[12px] mt-3" style={{ color: T.faint }}>
        {example}
      </p>
    </div>
  );
}

function PathCard({
  title,
  active,
  color,
  detail,
}: {
  title: string;
  active: boolean;
  color: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: active ? `${color}12` : T.card2, border: `1px solid ${active ? `${color}33` : T.border}` }}>
      <p className="text-sm font-bold" style={{ color: active ? color : T.text }}>
        {title}
      </p>
      <p className="text-[12px] mt-2 leading-5" style={{ color: T.faint }}>
        {detail}
      </p>
    </div>
  );
}

function FeatureCard({
  title,
  color,
  summary,
  bullets,
}: {
  title: string;
  color: string;
  summary: string;
  bullets: readonly string[];
}) {
  return (
    <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${color}24` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
        {title}
      </p>
      <p className="text-lg font-bold mt-2" style={{ color: T.text }}>
        {summary}
      </p>
      <div className="space-y-3 mt-4">
        {bullets.map((item) => (
          <div key={item} className="rounded-xl p-4" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-sm leading-7" style={{ color: T.muted }}>
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheatList({
  title,
  items,
  color,
}: {
  title: string;
  items: readonly string[];
  color: string;
}) {
  return (
    <div className="rounded-[24px] p-5" style={{ background: T.card, border: `1px solid ${color}24` }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
          {title}
        </p>
        <CopyButton value={items.join("\n")} label="Copy" />
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl p-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-sm leading-6" style={{ color: T.muted }}>
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArchitectureArrow({ left, top, color }: { left: number; top: number; color: string }) {
  return (
    <div
      className="absolute h-[2px]"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: "12%",
        background: `linear-gradient(90deg, ${color}, ${color}55)`,
      }}
    >
      <span className="absolute -right-1 -top-[5px]" style={{ color }}>
        →
      </span>
    </div>
  );
}

function AnimatedDot({ left, delay, color }: { left: number; delay: number; color: string }) {
  return (
    <span
      className="absolute w-2.5 h-2.5 rounded-full moving-dot"
      style={{ left: `${left}%`, top: "33%", background: color, animationDelay: `${delay}s` }}
    />
  );
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatBig(value: number) {
  if (value >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000, 2)}B`;
  if (value >= 1_000_000) return `${formatNumber(value / 1_000_000, 2)}M`;
  if (value >= 1_000) return `${formatNumber(value / 1_000, 1)}K`;
  return formatNumber(value, 0);
}

export default function DataEngineeringPage({ initialTab }: { initialTab?: string }) {
  const initial = normalizeDataEngineeringTab(initialTab) ?? "start-here";
  const [activeTab, setActiveTab] = useState<DataEngineeringTabSlug>(initial);
  const [visitedTabs, setVisitedTabs] = useState<Set<DataEngineeringTabSlug>>(new Set([initial]));
  const [revisedTabs, setRevisedTabs] = useState<Set<DataEngineeringTabSlug>>(new Set());
  const [notesOpen, setNotesOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const visited = localStorage.getItem("netflix-de-visited-tabs");
      const revised = localStorage.getItem("netflix-de-revised-tabs");
      const noteState = localStorage.getItem("netflix-de-notes");
      if (visited) setVisitedTabs(new Set(JSON.parse(visited)));
      if (revised) setRevisedTabs(new Set(JSON.parse(revised)));
      if (noteState) setNotes(JSON.parse(noteState));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("netflix-de-visited-tabs", JSON.stringify([...visitedTabs]));
      localStorage.setItem("netflix-de-revised-tabs", JSON.stringify([...revisedTabs]));
      localStorage.setItem("netflix-de-notes", JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes, revisedTabs, visitedTabs]);

  useEffect(() => {
    const onPopState = () => {
      const pathTab = window.location.pathname.split("/").pop();
      const normalized = normalizeDataEngineeringTab(pathTab);
      if (normalized) setActiveTab(normalized);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const activeIndex = useMemo(
    () => DATA_ENGINEERING_TABS.findIndex((tab) => tab.id === activeTab),
    [activeTab]
  );

  const prevTab = DATA_ENGINEERING_TABS[activeIndex - 1];
  const nextTab = DATA_ENGINEERING_TABS[activeIndex + 1];

  const switchTab = useCallback((tab: DataEngineeringTabSlug) => {
    if (tab === activeTab) return;
    setVisitedTabs((prev) => new Set([...prev, activeTab, tab]));
    setActiveTab(tab);
    window.history.pushState(null, "", `/system-design/netflix-data-engineering/${tab}`);
  }, [activeTab]);

  const activeMeta = DATA_ENGINEERING_TAB_META[activeTab];

  useEffect(() => {
    document.title = activeMeta.title;
  }, [activeMeta.title]);

  const handleShare = () => {
    copyTextToClipboard(`${window.location.origin}/system-design/netflix-data-engineering/${activeTab}`).catch(() => {});
  };

  const handleExportNotes = () => {
    const lines: string[] = ["# Netflix Data Engineering Notes", ""];
    DATA_ENGINEERING_TABS.forEach((tab) => {
      const note = notes[tab.id];
      if (!note?.trim()) return;
      lines.push(`## ${tab.label}`);
      lines.push(note.trim());
      lines.push("");
    });
    if (lines.length <= 2) return;
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "netflix-data-engineering-notes.md";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 56px)", background: T.bg, color: T.text, overflow: "hidden" }}>
      {!focusMode ? (
        <TabHeader
          tab={activeTab}
          activeIndex={activeIndex}
          total={DATA_ENGINEERING_TABS.length}
          onToggleProgress={() => setProgressOpen((v) => !v)}
          onToggleNotes={() => setNotesOpen((v) => !v)}
          onToggleFocus={() => setFocusMode(true)}
          focusMode={focusMode}
          onShare={handleShare}
        />
      ) : null}

      {!focusMode ? (
        <div className="xl:hidden px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}`, background: T.bg }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.faint }}>
              Current tab
            </p>
            <p className="text-sm font-semibold" style={{ color: T.text }}>
              {DATA_ENGINEERING_TABS[activeIndex]?.label}
            </p>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
            Open navigation
          </button>
        </div>
      ) : null}

      <div className="flex-1 flex overflow-hidden">
        {!focusMode ? (
          <Sidebar activeTab={activeTab} visitedTabs={visitedTabs} revisedTabs={revisedTabs} onNavigate={switchTab} />
        ) : null}
        <ScrollableShell
          prevTab={prevTab}
          nextTab={nextTab}
          onNavigate={switchTab}
          onMarkRevised={() => setRevisedTabs((prev) => {
            const next = new Set(prev);
            if (next.has(activeTab)) next.delete(activeTab);
            else next.add(activeTab);
            return next;
          })}
          revised={revisedTabs.has(activeTab)}
        >
          {activeTab === "start-here" ? null : (
            <SectionHero meta={activeMeta} accent={DATA_ENGINEERING_TABS[activeIndex]?.accent ?? T.red} activeIndex={activeIndex} />
          )}
          <ContentForTab activeTab={activeTab} onNavigate={switchTab} />
        </ScrollableShell>
      </div>

      <MobileMenu activeTab={activeTab} open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} onNavigate={switchTab} />

      {focusMode ? (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-between" style={{ background: `${T.red}ee` }}>
          <span className="text-xs font-bold text-white">
            Focus Mode — {DATA_ENGINEERING_TABS[activeIndex]?.label}
          </span>
          <button onClick={() => setFocusMode(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)" }}>
            Exit focus
          </button>
        </div>
      ) : null}

      {notesOpen ? (
        <div className="fixed inset-y-0 right-0 z-[60] w-[340px] max-w-full flex flex-col" style={{ background: T.bg, borderLeft: `1px solid ${T.border}` }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}` }}>
            <div>
              <p className="text-sm font-bold" style={{ color: T.text }}>
                Notes — {DATA_ENGINEERING_TABS[activeIndex]?.label}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleExportNotes} className="text-[10px] px-2 py-1 rounded cursor-pointer" style={{ background: T.card2, color: T.text, border: `1px solid ${T.border}` }}>
                Export .md
              </button>
              <button onClick={() => setNotesOpen(false)} className="text-lg cursor-pointer" style={{ color: T.muted }}>
                ✕
              </button>
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-3">
            <textarea
              value={notes[activeTab] ?? ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [activeTab]: e.target.value }))}
              className="flex-1 rounded-2xl p-4 resize-none text-sm"
              style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, outline: "none" }}
              placeholder="Capture your interview answer shape, formulas, and things you want to revise."
            />
            <p className="text-[11px]" style={{ color: T.faint }}>
              {(notes[activeTab] ?? "").length} characters
            </p>
          </div>
        </div>
      ) : null}

      {progressOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setProgressOpen(false)}>
          <div className="w-full max-w-2xl rounded-[28px] p-6" style={{ background: T.card, border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.faint }}>
                  Your progress
                </p>
                <h2 className="text-2xl font-bold mt-2" style={{ color: T.text }}>
                  Netflix Data Engineering
                </h2>
              </div>
              <button onClick={() => setProgressOpen(false)} className="text-lg cursor-pointer" style={{ color: T.muted }}>
                ✕
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3 mb-5">
              <MetricCard label="Visited" value={`${visitedTabs.size}/${DATA_ENGINEERING_TABS.length}`} note="Tabs you have opened" color={T.red} />
              <MetricCard label="Revised" value={`${revisedTabs.size}/${DATA_ENGINEERING_TABS.length}`} note="Tabs you explicitly marked revised" color={T.green} />
              <MetricCard label="Notes" value={String(Object.values(notes).filter((value) => value.trim()).length)} note="Tabs with saved notes" color={T.amber} />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {DATA_ENGINEERING_TABS.map((tab) => (
                <div key={tab.id} className="rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: T.text }}>
                      {tab.label}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: T.faint }}>
                      {tab.group}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {visitedTabs.has(tab.id) ? <Pill color={T.red}>Visited</Pill> : null}
                    {revisedTabs.has(tab.id) ? <Pill color={T.green}>Revised</Pill> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .moving-dot {
          animation: moveDot 4.2s linear infinite;
        }
        .flow-pulse {
          animation: flowPulse 2.1s ease-in-out infinite;
        }
        @keyframes moveDot {
          0% { transform: translateX(0); opacity: 0; }
          12% { opacity: 1; }
          82% { opacity: 1; }
          100% { transform: translateX(680px); opacity: 0; }
        }
        @keyframes flowPulse {
          0%, 100% { transform: scale(0.85); opacity: 0.35; }
          50% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function SectionHero({
  meta,
  accent,
  activeIndex,
}: {
  meta: (typeof DATA_ENGINEERING_TAB_META)[DataEngineeringTabSlug];
  accent: string;
  activeIndex: number;
}) {
  return (
    <div className="rounded-[28px] p-6 md:p-7 mb-6 relative overflow-hidden" style={{ background: T.card, border: `1px solid ${accent}24` }}>
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${accent}, ${T.amber}, ${T.violet})` }} />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Pill color={accent}>{meta.eyebrow}</Pill>
            <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: T.card2, color: T.faint, border: `1px solid ${T.border}` }}>
              Chapter {activeIndex + 1}
            </span>
          </div>
          <h2 className="text-3xl md:text-[3rem] font-bold tracking-[-0.05em] leading-[0.95]" style={{ color: T.text }}>
            {meta.heroSubtitle}
          </h2>
          <div className="flex flex-wrap gap-2 mt-4">
            {meta.heroSignals.map((signal) => (
              <span key={signal} className="px-3 py-1.5 rounded-full text-[11px] font-semibold" style={{ background: `${accent}12`, color: T.text, border: `1px solid ${accent}24` }}>
                {signal}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
          {DATA_TRACK_NUMBERS.slice(0, 3).map((item) => (
            <MetricCard key={item.label} label={item.label} value={item.value} note={item.note} color={item.color} />
          ))}
        </div>
      </div>
    </div>
  );
}
