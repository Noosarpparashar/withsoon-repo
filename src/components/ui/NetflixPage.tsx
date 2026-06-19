"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";

function TabLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--blue-text)", borderTopColor: "transparent" }} />
    </div>
  );
}

const StartHereTab = dynamic(() => import("./netflix-tabs/StartHereTab").then(m => ({ default: m.StartHereTab })), { loading: TabLoadingFallback });
const ArchitectureTab = dynamic(() => import("./netflix-tabs/ArchitectureTab").then(m => ({ default: m.ArchitectureTab })), { loading: TabLoadingFallback });
const ServicesTab = dynamic(() => import("./netflix-tabs/ServicesTab").then(m => ({ default: m.ServicesTab })), { loading: TabLoadingFallback });
const DataDesignTab = dynamic(() => import("./netflix-tabs/DataDesignTab").then(m => ({ default: m.DataDesignTab })), { loading: TabLoadingFallback });
const DataPipelineTab = dynamic(() => import("./netflix-tabs/DataPipelineTab").then(m => ({ default: m.DataPipelineTab })), { loading: TabLoadingFallback });
const MLRecsTab = dynamic(() => import("./netflix-tabs/MLRecsTab").then(m => ({ default: m.MLRecsTab })), { loading: TabLoadingFallback });
const FailuresTradeoffsTab = dynamic(() => import("./netflix-tabs/FailuresTradeoffsTab").then(m => ({ default: m.FailuresTradeoffsTab })), { loading: TabLoadingFallback });
const InterviewTab = dynamic(() => import("./netflix-tabs/InterviewTab").then(m => ({ default: m.InterviewTab })), { loading: TabLoadingFallback });
const CheatSheetTab = dynamic(() => import("./netflix-tabs/CheatSheetTab").then(m => ({ default: m.CheatSheetTab })), { loading: TabLoadingFallback });

const TABS = [
  "Start Here",
  "Architecture",
  "Services",
  "Data Design",
  "Data Pipeline",
  "ML & Recs",
  "Failures & Tradeoffs",
  "Interview Q&A",
  "Cheat Sheet",
] as const;
type Tab = (typeof TABS)[number];

const ROLE_LENSES = [
  { role: "Backend Eng", color: "#3b82f6", tabStars: { "Start Here": 3, "Architecture": 3, "Services": 3, "Data Design": 2, "Data Pipeline": 2, "ML & Recs": 1, "Failures & Tradeoffs": 3, "Interview Q&A": 3, "Cheat Sheet": 3 } },
  { role: "Data Eng", color: "#10b981", tabStars: { "Start Here": 3, "Architecture": 2, "Services": 2, "Data Design": 3, "Data Pipeline": 3, "ML & Recs": 2, "Failures & Tradeoffs": 2, "Interview Q&A": 3, "Cheat Sheet": 3 } },
  { role: "ML Eng", color: "#8b5cf6", tabStars: { "Start Here": 3, "Architecture": 1, "Services": 1, "Data Design": 2, "Data Pipeline": 3, "ML & Recs": 3, "Failures & Tradeoffs": 1, "Interview Q&A": 3, "Cheat Sheet": 3 } },
  { role: "SRE", color: "#f59e0b", tabStars: { "Start Here": 3, "Architecture": 2, "Services": 2, "Data Design": 1, "Data Pipeline": 2, "ML & Recs": 1, "Failures & Tradeoffs": 3, "Interview Q&A": 3, "Cheat Sheet": 3 } },
  { role: "Principal", color: "#ec4899", tabStars: { "Start Here": 2, "Architecture": 3, "Services": 3, "Data Design": 3, "Data Pipeline": 3, "ML & Recs": 3, "Failures & Tradeoffs": 3, "Interview Q&A": 3, "Cheat Sheet": 3 } },
];

function PersonaBar({ persona, onPersonaChange }: { persona: string; onPersonaChange: (p: string) => void }) {
  return (
    <div className="rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "var(--text-muted)" }}>I&apos;m preparing for:</span>
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

function RoleLensIndicator({ activeTab, persona }: { activeTab: string; persona: string }) {
  if (!persona) return null;
  const lens = ROLE_LENSES.find((l) => l.role === persona);
  if (!lens) return null;
  const stars = (lens.tabStars as Record<string, number>)[activeTab];
  if (stars === undefined) return null;
  const LABELS: Record<number, string> = { 1: "light", 2: "relevant", 3: "core" };
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: `${lens.color}12`, border: `1px solid ${lens.color}40` }}>
      <span className="text-xs font-medium" style={{ color: lens.color }}>{lens.role}</span>
      <span className="text-xs" style={{ color: "var(--text-faint)" }}>·</span>
      <span className="flex items-center gap-0.5">
        {[1, 2, 3].map((i) => (
          <svg key={i} width="10" height="10" viewBox="0 0 10 10" fill={i <= stars ? lens.color : "none"} stroke={lens.color} strokeWidth="1.2" style={{ opacity: i <= stars ? 1 : 0.35 }}>
            <polygon points="5,1 6.18,3.82 9.51,3.82 6.82,5.68 7.94,8.5 5,6.59 2.06,8.5 3.18,5.68 0.49,3.82 3.82,3.82" />
          </svg>
        ))}
      </span>
      <span className="text-xs" style={{ color: lens.color, opacity: 0.8 }}>{LABELS[stars] ?? ""}</span>
    </div>
  );
}

export default function NetflixPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Start Here");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>("playback");
  const [persona, setPersona] = useState<string>("Backend Eng");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab") as Tab;
    if (t && TABS.includes(t as Tab)) setActiveTab(t);
  }, []);

  // Prefetch all tab chunks in the background so first-click is instant
  useEffect(() => {
    const timer = setTimeout(() => {
      import("./netflix-tabs/ArchitectureTab");
      import("./netflix-tabs/ServicesTab");
      import("./netflix-tabs/DataDesignTab");
      import("./netflix-tabs/DataPipelineTab");
      import("./netflix-tabs/MLRecsTab");
      import("./netflix-tabs/FailuresTradeoffsTab");
      import("./netflix-tabs/InterviewTab");
      import("./netflix-tabs/CheatSheetTab");
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "instant" });
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, []);

  const navigateToService = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    handleTabChange("Services");
  };

  return (
    <div style={{ color: "var(--text)", background: "var(--bg)" }} className="min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        <nav className="flex items-center gap-2 text-sm" style={{ color: "var(--text-faint)" }}>
          <a href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Home</a>
          <span>›</span>
          <a href="/system-design" style={{ color: "var(--text-muted)", textDecoration: "none" }}>System Design</a>
          <span>›</span>
          <span style={{ color: "var(--text)" }}>Netflix</span>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Netflix System Design
        </h1>
        <p className="text-base mb-4" style={{ color: "var(--text-muted)" }}>
          Complete architecture, 22 services, data pipeline, 60 Q&As, and cheat sheet
        </p>
        <PersonaBar persona={persona} onPersonaChange={setPersona} />
      </div>

      <div
        className="sticky top-0 z-40 px-4 sm:px-6 py-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div
            className="flex gap-1 p-1 rounded-xl overflow-x-auto"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap"
                style={{
                  background: activeTab === tab ? "var(--blue-soft)" : "transparent",
                  color: activeTab === tab ? "var(--blue-text)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <RoleLensIndicator activeTab={activeTab} persona={persona} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {activeTab === "Start Here" && <StartHereTab onNavigateTab={handleTabChange} />}
        {activeTab === "Architecture" && <ArchitectureTab onNavigateService={navigateToService} onNavigateTab={handleTabChange} />}
        {activeTab === "Services" && <ServicesTab selectedServiceId={selectedServiceId} onSelectService={setSelectedServiceId} />}
        {activeTab === "Data Design" && <DataDesignTab />}
        {activeTab === "Data Pipeline" && <DataPipelineTab />}
        {activeTab === "ML & Recs" && <MLRecsTab />}
        {activeTab === "Failures & Tradeoffs" && <FailuresTradeoffsTab />}
        {activeTab === "Interview Q&A" && <InterviewTab />}
        {activeTab === "Cheat Sheet" && <CheatSheetTab />}
      </div>
    </div>
  );
}
