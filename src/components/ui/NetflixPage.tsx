"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

function TabLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <div
        className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: "var(--blue-text)", borderTopColor: "transparent" }}
      />
    </div>
  );
}

const StartHereTab         = dynamic(() => import("./netflix-tabs/StartHereTab").then(m => ({ default: m.StartHereTab })), { loading: TabLoadingFallback });
const BackendTrackTab      = dynamic(() => import("./netflix-tabs/BackendTrackTab").then(m => ({ default: m.BackendTrackTab })), { loading: TabLoadingFallback });
const DataEngineeringTrackTab = dynamic(() => import("./netflix-tabs/DataEngineeringTrackTab").then(m => ({ default: m.DataEngineeringTrackTab })), { loading: TabLoadingFallback });
const ArchitectureMapTab   = dynamic(() => import("./netflix-tabs/ArchitectureMapTab").then(m => ({ default: m.ArchitectureMapTab })), { loading: TabLoadingFallback });
const APIsDataModelTab     = dynamic(() => import("./netflix-tabs/APIsDataModelTab").then(m => ({ default: m.APIsDataModelTab })), { loading: TabLoadingFallback });
const ScaleEstimationTab   = dynamic(() => import("./netflix-tabs/ScaleEstimationTab").then(m => ({ default: m.ScaleEstimationTab })), { loading: TabLoadingFallback });
const FailuresTradeoffsTab = dynamic(() => import("./netflix-tabs/FailuresTradeoffsTab").then(m => ({ default: m.FailuresTradeoffsTab })), { loading: TabLoadingFallback });
const InterviewTab         = dynamic(() => import("./netflix-tabs/InterviewTab").then(m => ({ default: m.InterviewTab })), { loading: TabLoadingFallback });
const MockInterviewTab     = dynamic(() => import("./netflix-tabs/MockInterviewTab").then(m => ({ default: m.MockInterviewTab })), { loading: TabLoadingFallback });
const CheatSheetTab        = dynamic(() => import("./netflix-tabs/CheatSheetTab").then(m => ({ default: m.CheatSheetTab })), { loading: TabLoadingFallback });

export const TABS = [
  { slug: "start-here",        label: "Start Here" },
  { slug: "backend-track",     label: "Backend Track" },
  { slug: "data-engineering",  label: "Data Engineering Track" },
  { slug: "architecture-map",  label: "Architecture Map" },
  { slug: "apis-data-model",   label: "APIs + Data Model" },
  { slug: "scale-estimation",  label: "Scale Estimation" },
  { slug: "failures-tradeoffs",label: "Failures + Tradeoffs" },
  { slug: "interview-qa",      label: "Interview Q&A" },
  { slug: "mock-interview",    label: "Mock Interview" },
  { slug: "cheat-sheet",       label: "Cheat Sheet" },
] as const;

export type TabSlug = (typeof TABS)[number]["slug"];

export type Role = "Backend Engineer" | "Data Engineer";

// Tab relevance per role: 3=core, 2=relevant, 1=light
const ROLE_RELEVANCE: Record<Role, Record<TabSlug, number>> = {
  "Backend Engineer": {
    "start-here": 3,
    "backend-track": 3,
    "data-engineering": 1,
    "architecture-map": 3,
    "apis-data-model": 3,
    "scale-estimation": 3,
    "failures-tradeoffs": 3,
    "interview-qa": 3,
    "mock-interview": 3,
    "cheat-sheet": 3,
  },
  "Data Engineer": {
    "start-here": 3,
    "backend-track": 1,
    "data-engineering": 3,
    "architecture-map": 3,
    "apis-data-model": 3,
    "scale-estimation": 3,
    "failures-tradeoffs": 3,
    "interview-qa": 3,
    "mock-interview": 3,
    "cheat-sheet": 3,
  },
};

const ROLE_COLORS: Record<Role, string> = {
  "Backend Engineer": "#3b82f6",
  "Data Engineer": "#10b981",
};

export default function NetflixPage({ initialTab }: { initialTab?: string }) {
  const router = useRouter();
  const resolvedInitial = (TABS.find(t => t.slug === initialTab)?.slug ?? "start-here") as TabSlug;
  const [activeTab, setActiveTab] = useState<TabSlug>(resolvedInitial);
  const [role, setRole] = useState<Role>("Backend Engineer");
  const [seniorDepth, setSeniorDepth] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Prefetch all tab chunks after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      import("./netflix-tabs/BackendTrackTab");
      import("./netflix-tabs/DataEngineeringTrackTab");
      import("./netflix-tabs/ArchitectureMapTab");
      import("./netflix-tabs/APIsDataModelTab");
      import("./netflix-tabs/ScaleEstimationTab");
      import("./netflix-tabs/FailuresTradeoffsTab");
      import("./netflix-tabs/InterviewTab");
      import("./netflix-tabs/MockInterviewTab");
      import("./netflix-tabs/CheatSheetTab");
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = useCallback((slug: TabSlug) => {
    setActiveTab(slug);
    window.scrollTo({ top: 0, behavior: "instant" });
    router.replace(`/system-design/netflix/${slug}`, { scroll: false });
    setTimeout(() => {
      const btn = tabBarRef.current?.querySelector(`[data-tab="${slug}"]`) as HTMLElement | null;
      btn?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }, 50);
  }, [router]);

  const activeTabLabel = TABS.find(t => t.slug === activeTab)?.label ?? "";
  const roleColor = ROLE_COLORS[role];
  const relevance = ROLE_RELEVANCE[role][activeTab];
  const RELEVANCE_LABELS: Record<number, string> = { 3: "core", 2: "relevant", 1: "optional context" };

  return (
    <div style={{ color: "var(--text)", background: "var(--bg)" }} className="min-h-screen pb-20">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        <nav className="flex items-center gap-2 text-sm" style={{ color: "var(--text-faint)" }}>
          <a href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Home</a>
          <span>›</span>
          <a href="/system-design" style={{ color: "var(--text-muted)", textDecoration: "none" }}>System Design</a>
          <span>›</span>
          <span style={{ color: "var(--text)" }}>Netflix</span>
          <span>›</span>
          <span style={{ color: "var(--accent-text)" }}>{activeTabLabel}</span>
        </nav>
      </div>

      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <h1 className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: "var(--text)" }}>
          Netflix System Design
        </h1>
        <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
          A role-specific Netflix system design guide for Backend Engineers and Data Engineers preparing for interviews.
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--text-faint)" }}>
          This guide focuses only on backend architecture and data engineering architecture. ML recommendations, SRE deep-dives, and principal-level org architecture are intentionally kept out or treated only as supporting context.
        </p>

        {/* Role selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 flex-1"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
              I&apos;m preparing for:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(["Backend Engineer", "Data Engineer"] as Role[]).map((r) => {
                const isActive = role === r;
                const color = ROLE_COLORS[r];
                return (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors duration-150"
                    style={{
                      background: isActive ? `${color}18` : "transparent",
                      color: isActive ? color : "var(--text-muted)",
                      border: `1px solid ${isActive ? color : "var(--border)"}`,
                      cursor: "pointer",
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Senior/Staff depth toggle */}
          <button
            onClick={() => setSeniorDepth(v => !v)}
            className="text-xs px-4 py-2.5 rounded-xl font-medium transition-colors duration-150 whitespace-nowrap"
            style={{
              background: seniorDepth ? "rgba(139,92,246,0.12)" : "var(--bg-card)",
              color: seniorDepth ? "#8b5cf6" : "var(--text-muted)",
              border: `1px solid ${seniorDepth ? "#8b5cf6" : "var(--border)"}`,
              cursor: "pointer",
            }}
          >
            {seniorDepth ? "★ Senior/Staff Depth ON" : "☆ Senior/Staff Depth"}
          </button>
        </div>
      </div>

      {/* Sticky tab bar */}
      <div
        className="sticky top-0 z-40 px-4 sm:px-6 py-2"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div
            ref={tabBarRef}
            className="flex gap-1 p-1 rounded-xl overflow-x-auto flex-1"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.slug;
              const rel = ROLE_RELEVANCE[role][tab.slug as TabSlug];
              return (
                <button
                  key={tab.slug}
                  data-tab={tab.slug}
                  onClick={() => handleTabChange(tab.slug)}
                  role="tab"
                  aria-selected={isActive}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 whitespace-nowrap relative"
                  style={{
                    background: isActive ? "var(--blue-soft)" : "transparent",
                    color: isActive ? "var(--blue-text)" : rel === 1 ? "var(--text-faint)" : "var(--text-muted)",
                    cursor: "pointer",
                    border: "none",
                    outline: "none",
                    opacity: rel === 1 ? 0.6 : 1,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Role + relevance indicator */}
          <div
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{ background: `${roleColor}12`, border: `1px solid ${roleColor}40` }}
          >
            <span className="text-xs font-medium" style={{ color: roleColor }}>{role.split(" ")[0]}</span>
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>·</span>
            <span className="text-xs" style={{ color: roleColor, opacity: 0.8 }}>{RELEVANCE_LABELS[relevance]}</span>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {activeTab === "start-here"         && <StartHereTab onNavigateTab={handleTabChange} role={role} onRoleChange={setRole} />}
        {activeTab === "backend-track"      && <BackendTrackTab seniorDepth={seniorDepth} />}
        {activeTab === "data-engineering"   && <DataEngineeringTrackTab seniorDepth={seniorDepth} />}
        {activeTab === "architecture-map"   && <ArchitectureMapTab role={role} onNavigateTab={handleTabChange} />}
        {activeTab === "apis-data-model"    && <APIsDataModelTab role={role} />}
        {activeTab === "scale-estimation"   && <ScaleEstimationTab role={role} />}
        {activeTab === "failures-tradeoffs" && <FailuresTradeoffsTab role={role} />}
        {activeTab === "interview-qa"       && <InterviewTab role={role} />}
        {activeTab === "mock-interview"     && <MockInterviewTab role={role} />}
        {activeTab === "cheat-sheet"        && <CheatSheetTab role={role} onNavigateTab={handleTabChange} />}
      </div>
    </div>
  );
}
