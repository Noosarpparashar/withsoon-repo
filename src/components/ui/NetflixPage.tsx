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

const StartHereTab       = dynamic(() => import("./netflix-tabs/StartHereTab").then(m => ({ default: m.StartHereTab })), { loading: TabLoadingFallback });
const RequirementsTab    = dynamic(() => import("./netflix-tabs/RequirementsTab").then(m => ({ default: m.RequirementsTab })), { loading: TabLoadingFallback });
const ScaleTab           = dynamic(() => import("./netflix-tabs/ScaleTab").then(m => ({ default: m.ScaleTab })), { loading: TabLoadingFallback });
const ArchitectureTab    = dynamic(() => import("./netflix-tabs/ArchitectureTab").then(m => ({ default: m.ArchitectureTab })), { loading: TabLoadingFallback });
const ServicesTab        = dynamic(() => import("./netflix-tabs/ServicesTab").then(m => ({ default: m.ServicesTab })), { loading: TabLoadingFallback });
const APIsTab            = dynamic(() => import("./netflix-tabs/APIsTab").then(m => ({ default: m.APIsTab })), { loading: TabLoadingFallback });
const DataDesignTab      = dynamic(() => import("./netflix-tabs/DataDesignTab").then(m => ({ default: m.DataDesignTab })), { loading: TabLoadingFallback });
const PlaybackTab        = dynamic(() => import("./netflix-tabs/PlaybackTab").then(m => ({ default: m.PlaybackTab })), { loading: TabLoadingFallback });
const CDNTab             = dynamic(() => import("./netflix-tabs/CDNTab").then(m => ({ default: m.CDNTab })), { loading: TabLoadingFallback });
const EncodingTab        = dynamic(() => import("./netflix-tabs/EncodingTab").then(m => ({ default: m.EncodingTab })), { loading: TabLoadingFallback });
const DataPipelineTab    = dynamic(() => import("./netflix-tabs/DataPipelineTab").then(m => ({ default: m.DataPipelineTab })), { loading: TabLoadingFallback });
const MLRecsTab          = dynamic(() => import("./netflix-tabs/MLRecsTab").then(m => ({ default: m.MLRecsTab })), { loading: TabLoadingFallback });
const FailuresTab        = dynamic(() => import("./netflix-tabs/FailuresTab").then(m => ({ default: m.FailuresTab })), { loading: TabLoadingFallback });
const TradeoffsTab       = dynamic(() => import("./netflix-tabs/TradeoffsTab").then(m => ({ default: m.TradeoffsTab })), { loading: TabLoadingFallback });
const SecurityTab        = dynamic(() => import("./netflix-tabs/SecurityTab").then(m => ({ default: m.SecurityTab })), { loading: TabLoadingFallback });
const ObservabilityTab   = dynamic(() => import("./netflix-tabs/ObservabilityTab").then(m => ({ default: m.ObservabilityTab })), { loading: TabLoadingFallback });
const InterviewTab       = dynamic(() => import("./netflix-tabs/InterviewTab").then(m => ({ default: m.InterviewTab })), { loading: TabLoadingFallback });
const MockInterviewTab   = dynamic(() => import("./netflix-tabs/MockInterviewTab").then(m => ({ default: m.MockInterviewTab })), { loading: TabLoadingFallback });
const CheatSheetTab      = dynamic(() => import("./netflix-tabs/CheatSheetTab").then(m => ({ default: m.CheatSheetTab })), { loading: TabLoadingFallback });

export const TABS = [
  { slug: "start-here",        label: "Start Here" },
  { slug: "requirements",      label: "Requirements" },
  { slug: "scale",             label: "Scale" },
  { slug: "architecture",      label: "Architecture" },
  { slug: "services",          label: "Services" },
  { slug: "apis",              label: "APIs" },
  { slug: "data-design",       label: "Data Design" },
  { slug: "playback",          label: "Playback" },
  { slug: "cdn",               label: "CDN" },
  { slug: "encoding",          label: "Encoding" },
  { slug: "data-pipeline",     label: "Data Pipeline" },
  { slug: "recommendations",   label: "ML & Recs" },
  { slug: "failures",          label: "Failures" },
  { slug: "tradeoffs",         label: "Tradeoffs" },
  { slug: "security",          label: "Security" },
  { slug: "observability-cost",label: "Observability" },
  { slug: "interview-qa",      label: "Interview Q&A" },
  { slug: "mock-interview",    label: "Mock Interview" },
  { slug: "cheat-sheet",       label: "Cheat Sheet" },
] as const;

export type TabSlug = (typeof TABS)[number]["slug"];

const ROLE_LENSES = [
  { role: "Backend Eng", color: "#3b82f6" },
  { role: "Data Eng",    color: "#10b981" },
  { role: "ML Eng",      color: "#8b5cf6" },
  { role: "SRE",         color: "#f59e0b" },
  { role: "Principal",   color: "#ec4899" },
];

const ROLE_STARS: Record<string, Record<TabSlug, number>> = {
  "Backend Eng": { "start-here": 3, "requirements": 3, "scale": 3, "architecture": 3, "services": 3, "apis": 3, "data-design": 2, "playback": 3, "cdn": 3, "encoding": 1, "data-pipeline": 2, "recommendations": 1, "failures": 3, "tradeoffs": 3, "security": 2, "observability-cost": 2, "interview-qa": 3, "mock-interview": 3, "cheat-sheet": 3 },
  "Data Eng":    { "start-here": 3, "requirements": 2, "scale": 3, "architecture": 2, "services": 2, "apis": 2, "data-design": 3, "playback": 1, "cdn": 1, "encoding": 2, "data-pipeline": 3, "recommendations": 2, "failures": 2, "tradeoffs": 2, "security": 1, "observability-cost": 3, "interview-qa": 3, "mock-interview": 2, "cheat-sheet": 3 },
  "ML Eng":      { "start-here": 3, "requirements": 2, "scale": 2, "architecture": 1, "services": 1, "apis": 1, "data-design": 2, "playback": 1, "cdn": 1, "encoding": 1, "data-pipeline": 3, "recommendations": 3, "failures": 1, "tradeoffs": 2, "security": 1, "observability-cost": 2, "interview-qa": 3, "mock-interview": 2, "cheat-sheet": 3 },
  "SRE":         { "start-here": 3, "requirements": 2, "scale": 3, "architecture": 2, "services": 2, "apis": 2, "data-design": 1, "playback": 2, "cdn": 3, "encoding": 1, "data-pipeline": 2, "recommendations": 1, "failures": 3, "tradeoffs": 3, "security": 2, "observability-cost": 3, "interview-qa": 3, "mock-interview": 3, "cheat-sheet": 3 },
  "Principal":   { "start-here": 2, "requirements": 3, "scale": 3, "architecture": 3, "services": 3, "apis": 2, "data-design": 3, "playback": 3, "cdn": 3, "encoding": 2, "data-pipeline": 3, "recommendations": 3, "failures": 3, "tradeoffs": 3, "security": 3, "observability-cost": 3, "interview-qa": 3, "mock-interview": 3, "cheat-sheet": 3 },
};

function PersonaBar({ persona, onPersonaChange }: { persona: string; onPersonaChange: (p: string) => void }) {
  return (
    <div
      className="rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
        I&apos;m preparing for:
      </span>
      <div className="flex flex-wrap gap-1.5">
        {ROLE_LENSES.map((lens) => {
          const isActive = persona === lens.role;
          return (
            <button
              key={lens.role}
              onClick={() => onPersonaChange(lens.role)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors duration-150"
              style={{
                background: isActive ? `${lens.color}18` : "transparent",
                color: isActive ? lens.color : "var(--text-muted)",
                border: `1px solid ${isActive ? lens.color : "var(--border)"}`,
                cursor: "pointer",
              }}
            >
              {lens.role}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RoleLensIndicator({ activeTab, persona }: { activeTab: TabSlug; persona: string }) {
  if (!persona) return null;
  const lens = ROLE_LENSES.find((l) => l.role === persona);
  if (!lens) return null;
  const roleStars = ROLE_STARS[persona];
  const stars = roleStars?.[activeTab];
  if (stars === undefined) return null;
  const LABELS: Record<number, string> = { 1: "light", 2: "relevant", 3: "core" };
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0"
      style={{ background: `${lens.color}12`, border: `1px solid ${lens.color}40` }}
    >
      <span className="text-xs font-medium" style={{ color: lens.color }}>{lens.role}</span>
      <span className="text-xs" style={{ color: "var(--text-faint)" }}>·</span>
      <span className="flex items-center gap-0.5">
        {[1, 2, 3].map((i) => (
          <svg key={i} width="10" height="10" viewBox="0 0 10 10"
            fill={i <= stars ? lens.color : "none"}
            stroke={lens.color} strokeWidth="1.2"
            style={{ opacity: i <= stars ? 1 : 0.35 }}
          >
            <polygon points="5,1 6.18,3.82 9.51,3.82 6.82,5.68 7.94,8.5 5,6.59 2.06,8.5 3.18,5.68 0.49,3.82 3.82,3.82" />
          </svg>
        ))}
      </span>
      <span className="text-xs" style={{ color: lens.color, opacity: 0.8 }}>{LABELS[stars] ?? ""}</span>
    </div>
  );
}

export default function NetflixPage({ initialTab }: { initialTab?: string }) {
  const router = useRouter();
  const resolvedInitial = (TABS.find(t => t.slug === initialTab)?.slug ?? "start-here") as TabSlug;
  const [activeTab, setActiveTab] = useState<TabSlug>(resolvedInitial);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>("playback");
  const [persona, setPersona] = useState<string>("Backend Eng");
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Prefetch all tab chunks 1.5s after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      import("./netflix-tabs/RequirementsTab");
      import("./netflix-tabs/ScaleTab");
      import("./netflix-tabs/ArchitectureTab");
      import("./netflix-tabs/ServicesTab");
      import("./netflix-tabs/APIsTab");
      import("./netflix-tabs/DataDesignTab");
      import("./netflix-tabs/PlaybackTab");
      import("./netflix-tabs/CDNTab");
      import("./netflix-tabs/EncodingTab");
      import("./netflix-tabs/DataPipelineTab");
      import("./netflix-tabs/MLRecsTab");
      import("./netflix-tabs/FailuresTab");
      import("./netflix-tabs/TradeoffsTab");
      import("./netflix-tabs/SecurityTab");
      import("./netflix-tabs/ObservabilityTab");
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
    // Scroll active tab button into view in the tab bar
    setTimeout(() => {
      const btn = tabBarRef.current?.querySelector(`[data-tab="${slug}"]`) as HTMLElement | null;
      btn?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }, 50);
  }, [router]);

  const navigateToService = useCallback((serviceId: string) => {
    setSelectedServiceId(serviceId);
    handleTabChange("services");
  }, [handleTabChange]);

  const activeTabLabel = TABS.find(t => t.slug === activeTab)?.label ?? "";

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
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Netflix System Design
        </h1>
        <p className="text-base mb-4" style={{ color: "var(--text-muted)" }}>
          Complete prep: architecture, 22 services, data pipeline, ML, failures, tradeoffs, 60+ Q&As
        </p>
        <PersonaBar persona={persona} onPersonaChange={setPersona} />
      </div>

      {/* Sticky tab bar — solid background, no backdrop-filter, no blur (avoids scroll compositor jank) */}
      <div
        className="sticky top-0 z-40 px-4 sm:px-6 py-2"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div
            ref={tabBarRef}
            className="flex gap-1 p-1 rounded-xl overflow-x-auto"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.slug}
                data-tab={tab.slug}
                onClick={() => handleTabChange(tab.slug)}
                role="tab"
                aria-selected={activeTab === tab.slug}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 whitespace-nowrap"
                style={{
                  background: activeTab === tab.slug ? "var(--blue-soft)" : "transparent",
                  color: activeTab === tab.slug ? "var(--blue-text)" : "var(--text-muted)",
                  cursor: "pointer",
                  border: "none",
                  outline: "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <RoleLensIndicator activeTab={activeTab} persona={persona} />
        </div>
      </div>

      {/* Tab content — simple conditional mount keeps DOM lean */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {activeTab === "start-here"        && <StartHereTab onNavigateTab={handleTabChange} />}
        {activeTab === "requirements"      && <RequirementsTab onNavigateTab={handleTabChange} />}
        {activeTab === "scale"             && <ScaleTab onNavigateTab={handleTabChange} />}
        {activeTab === "architecture"      && <ArchitectureTab onNavigateService={navigateToService} onNavigateTab={handleTabChange} />}
        {activeTab === "services"          && <ServicesTab selectedServiceId={selectedServiceId} onSelectService={setSelectedServiceId} />}
        {activeTab === "apis"              && <APIsTab onNavigateTab={handleTabChange} />}
        {activeTab === "data-design"       && <DataDesignTab onNavigateTab={handleTabChange} />}
        {activeTab === "playback"          && <PlaybackTab onNavigateTab={handleTabChange} />}
        {activeTab === "cdn"               && <CDNTab onNavigateTab={handleTabChange} />}
        {activeTab === "encoding"          && <EncodingTab onNavigateTab={handleTabChange} />}
        {activeTab === "data-pipeline"     && <DataPipelineTab onNavigateTab={handleTabChange} />}
        {activeTab === "recommendations"   && <MLRecsTab onNavigateTab={handleTabChange} />}
        {activeTab === "failures"          && <FailuresTab onNavigateTab={handleTabChange} />}
        {activeTab === "tradeoffs"         && <TradeoffsTab onNavigateTab={handleTabChange} />}
        {activeTab === "security"          && <SecurityTab onNavigateTab={handleTabChange} />}
        {activeTab === "observability-cost"&& <ObservabilityTab onNavigateTab={handleTabChange} />}
        {activeTab === "interview-qa"      && <InterviewTab />}
        {activeTab === "mock-interview"    && <MockInterviewTab />}
        {activeTab === "cheat-sheet"       && <CheatSheetTab onNavigateTab={handleTabChange} />}
      </div>
    </div>
  );
}
