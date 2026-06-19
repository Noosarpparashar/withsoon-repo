"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

function TabLoadingFallback() {
  return (
    <div className="flex flex-col gap-4 py-8">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl p-5 animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="h-4 rounded mb-3" style={{ background: "var(--border)", width: `${60 + i * 10}%` }} />
          <div className="h-3 rounded mb-2" style={{ background: "var(--border)", width: "90%" }} />
          <div className="h-3 rounded" style={{ background: "var(--border)", width: "75%" }} />
        </div>
      ))}
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
  { slug: "start-here",        label: "Start Here",               group: "Prepare",   emoji: "🚀" },
  { slug: "backend-track",     label: "Backend Track",            group: "Prepare",   emoji: "⚙️" },
  { slug: "data-engineering",  label: "Data Engineering Track",   group: "Prepare",   emoji: "📊" },
  { slug: "architecture-map",  label: "Architecture Map",         group: "Reference", emoji: "🗺️" },
  { slug: "apis-data-model",   label: "APIs + Data Model",        group: "Reference", emoji: "🔌" },
  { slug: "scale-estimation",  label: "Scale Estimation",         group: "Reference", emoji: "📐" },
  { slug: "failures-tradeoffs",label: "Failures + Tradeoffs",     group: "Reference", emoji: "⚡" },
  { slug: "interview-qa",      label: "Interview Q&A",            group: "Practice",  emoji: "💬" },
  { slug: "mock-interview",    label: "Mock Interview",           group: "Practice",  emoji: "🎯" },
  { slug: "cheat-sheet",       label: "Cheat Sheet",              group: "Practice",  emoji: "📋" },
] as const;

export type TabSlug = (typeof TABS)[number]["slug"];
export type Role = "Backend Engineer" | "Data Engineer";

type TabGroup = "Prepare" | "Reference" | "Practice";

const TAB_GROUPS: { name: TabGroup; color: string; desc: string }[] = [
  { name: "Prepare",   color: "#3b82f6", desc: "Study the concepts" },
  { name: "Reference", color: "#8b5cf6", desc: "Deep-dive references" },
  { name: "Practice",  color: "#10b981", desc: "Simulate & review" },
];

// Tab relevance per role: 3=core, 2=relevant, 1=light
const ROLE_RELEVANCE: Record<Role, Record<TabSlug, number>> = {
  "Backend Engineer": {
    "start-here": 3, "backend-track": 3, "data-engineering": 1,
    "architecture-map": 3, "apis-data-model": 3, "scale-estimation": 3,
    "failures-tradeoffs": 3, "interview-qa": 3, "mock-interview": 3, "cheat-sheet": 3,
  },
  "Data Engineer": {
    "start-here": 3, "backend-track": 1, "data-engineering": 3,
    "architecture-map": 3, "apis-data-model": 3, "scale-estimation": 3,
    "failures-tradeoffs": 3, "interview-qa": 3, "mock-interview": 3, "cheat-sheet": 3,
  },
};

const ROLE_COLORS: Record<Role, string> = {
  "Backend Engineer": "#3b82f6",
  "Data Engineer": "#10b981",
};

const RELEVANCE_LABELS: Record<number, string> = { 3: "core", 2: "relevant", 1: "optional" };

export default function NetflixPage({ initialTab }: { initialTab?: string }) {
  const router = useRouter();
  const resolvedInitial = (TABS.find(t => t.slug === initialTab)?.slug ?? "start-here") as TabSlug;
  const [activeTab, setActiveTab] = useState<TabSlug>(resolvedInitial);
  const [role, setRole] = useState<Role>("Backend Engineer");
  const [seniorDepth, setSeniorDepth] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState<Set<TabSlug>>(new Set(["start-here"]));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted role + seniorDepth from localStorage
  useEffect(() => {
    try {
      const savedRole = localStorage.getItem("netflix-role") as Role | null;
      const savedSenior = localStorage.getItem("netflix-senior");
      const savedVisited = localStorage.getItem("netflix-visited");
      if (savedRole && (savedRole === "Backend Engineer" || savedRole === "Data Engineer")) {
        setRole(savedRole);
      }
      if (savedSenior === "true") setSeniorDepth(true);
      if (savedVisited) {
        try {
          const parsed = JSON.parse(savedVisited) as TabSlug[];
          setVisitedTabs(new Set(parsed));
        } catch { /* ignore */ }
      }
    } catch { /* localStorage unavailable */ }
  }, []);

  // Persist role changes
  useEffect(() => {
    try { localStorage.setItem("netflix-role", role); } catch { /* ignore */ }
  }, [role]);

  // Persist seniorDepth
  useEffect(() => {
    try { localStorage.setItem("netflix-senior", String(seniorDepth)); } catch { /* ignore */ }
  }, [seniorDepth]);

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

  // Back-to-top visibility
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard shortcuts: 1-9 for tabs, Escape for mobile nav
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = parseInt(e.key) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < TABS.length) {
        handleTabChange(TABS[idx].slug);
      }
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2500);
  }, []);

  const handleRoleChange = useCallback((newRole: Role) => {
    setRole(newRole);
    showToast(`Switched to ${newRole} track`);
  }, [showToast]);

  const handleTabChange = useCallback((slug: TabSlug) => {
    setActiveTab(slug);
    setVisitedTabs(prev => {
      const next = new Set(prev);
      next.add(slug);
      try { localStorage.setItem("netflix-visited", JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    router.replace(`/system-design/netflix/${slug}`, { scroll: false });
    setTimeout(() => {
      const btn = tabBarRef.current?.querySelector(`[data-tab="${slug}"]`) as HTMLElement | null;
      btn?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }, 50);
  }, [router]);

  const activeTabIndex = TABS.findIndex(t => t.slug === activeTab);
  const prevTab = activeTabIndex > 0 ? TABS[activeTabIndex - 1] : null;
  const nextTab = activeTabIndex < TABS.length - 1 ? TABS[activeTabIndex + 1] : null;
  const activeTabObj = TABS[activeTabIndex];
  const activeGroup = TAB_GROUPS.find(g => g.name === activeTabObj?.group);
  const roleColor = ROLE_COLORS[role];
  const relevance = ROLE_RELEVANCE[role][activeTab];

  return (
    <div style={{ color: "var(--text)", background: "var(--bg)" }} className="min-h-screen pb-20">
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded focus:text-sm"
        style={{ background: "var(--blue-text)", color: "white" }}
      >
        Skip to main content
      </a>

      {/* Toast notification */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">{toastMsg ?? ""}</div>
      {toastMsg && (
        <div
          className="fixed bottom-6 left-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg"
          style={{
            background: roleColor,
            color: "white",
            transform: "translateX(-50%)",
            animation: "fadeInUp 0.2s ease",
          }}
          role="status"
        >
          {toastMsg}
        </div>
      )}

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="mt-auto w-full rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-sm">Navigate to</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="text-xs px-3 py-1 rounded-lg"
                style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}
              >
                Close
              </button>
            </div>
            {TAB_GROUPS.map(group => (
              <div key={group.name} className="mb-4">
                <div className="text-xs font-semibold mb-2 px-1" style={{ color: group.color }}>{group.name}</div>
                <div className="flex flex-col gap-1">
                  {TABS.filter(t => t.group === group.name).map(tab => {
                    const isActive = activeTab === tab.slug;
                    const isVisited = visitedTabs.has(tab.slug);
                    return (
                      <button
                        key={tab.slug}
                        onClick={() => handleTabChange(tab.slug)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors"
                        style={{
                          background: isActive ? `${group.color}18` : "transparent",
                          color: isActive ? group.color : "var(--text-muted)",
                          border: `1px solid ${isActive ? group.color : "transparent"}`,
                        }}
                      >
                        <span>{tab.emoji}</span>
                        <span className="flex-1">{tab.label}</span>
                        {isVisited && !isActive && (
                          <span style={{ color: group.color, opacity: 0.6 }}>✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        <nav className="flex items-center gap-2 text-sm" style={{ color: "var(--text-faint)" }} aria-label="Breadcrumb">
          <a href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Home</a>
          <span aria-hidden="true">›</span>
          <a href="/system-design" style={{ color: "var(--text-muted)", textDecoration: "none" }}>System Design</a>
          <span aria-hidden="true">›</span>
          <span style={{ color: "var(--text)" }}>Netflix</span>
          <span aria-hidden="true">›</span>
          {activeGroup && <span style={{ color: activeGroup.color, opacity: 0.7 }}>{activeGroup.name}</span>}
          <span aria-hidden="true">›</span>
          <span style={{ color: "var(--accent-text)" }}>{activeTabObj?.label}</span>
        </nav>
      </div>

      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: "var(--text)" }}>
              Netflix System Design
            </h1>
            <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
              Role-specific interview prep for Backend Engineers and Data Engineers.
            </p>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              ML recommendations, SRE deep-dives, and principal-level org architecture are out of scope.
            </p>
          </div>
          {/* Persistent role badge */}
          <div
            className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: `${roleColor}15`, border: `1px solid ${roleColor}40`, color: roleColor }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: roleColor, display: "inline-block" }} />
            {role.split(" ")[0]} Engineer
          </div>
        </div>

        {/* Role selector + senior toggle */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div
            className="rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-3 flex-1"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
              Preparing for:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(["Backend Engineer", "Data Engineer"] as Role[]).map((r) => {
                const isActive = role === r;
                const color = ROLE_COLORS[r];
                return (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150"
                    style={{
                      background: isActive ? `${color}18` : "transparent",
                      color: isActive ? color : "var(--text-muted)",
                      border: `1px solid ${isActive ? color : "var(--border)"}`,
                      transform: isActive ? "scale(1.02)" : "scale(1)",
                      cursor: "pointer",
                    }}
                    aria-pressed={isActive}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setSeniorDepth(v => !v)}
            className="text-xs px-4 py-2.5 rounded-xl font-medium transition-all duration-150 whitespace-nowrap"
            style={{
              background: seniorDepth ? "rgba(139,92,246,0.12)" : "var(--bg-card)",
              color: seniorDepth ? "#8b5cf6" : "var(--text-muted)",
              border: `1px solid ${seniorDepth ? "#8b5cf6" : "var(--border)"}`,
              cursor: "pointer",
            }}
            aria-pressed={seniorDepth}
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
        <div className="max-w-7xl mx-auto flex items-center gap-2">

          {/* Desktop: grouped tabs */}
          <div
            ref={tabBarRef}
            className="hidden sm:flex gap-0 p-1 rounded-xl overflow-x-auto flex-1 items-center"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              scrollbarWidth: "none",
            }}
            role="tablist"
            aria-label="Netflix sections"
          >
            {TAB_GROUPS.map((group, gi) => (
              <div key={group.name} className="flex items-center gap-0">
                {gi > 0 && (
                  <div className="mx-1 w-px h-5 self-center" style={{ background: "var(--border)" }} aria-hidden="true" />
                )}
                <div className="flex items-center gap-0">
                  <span
                    className="text-xs px-2 py-1 font-semibold whitespace-nowrap"
                    style={{ color: group.color, opacity: 0.7, fontSize: "10px" }}
                  >
                    {group.name.toUpperCase()}
                  </span>
                  {TABS.filter(t => t.group === group.name).map((tab, ti) => {
                    const isActive = activeTab === tab.slug;
                    const rel = ROLE_RELEVANCE[role][tab.slug];
                    const isVisited = visitedTabs.has(tab.slug);
                    const tabIdx = TABS.findIndex(t => t.slug === tab.slug);
                    return (
                      <button
                        key={tab.slug}
                        data-tab={tab.slug}
                        onClick={() => handleTabChange(tab.slug)}
                        role="tab"
                        aria-selected={isActive}
                        title={`[${tabIdx + 1}] ${tab.label}${rel === 1 ? " (optional for your role)" : ""}`}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap relative"
                        style={{
                          background: isActive ? `${group.color}20` : "transparent",
                          color: isActive ? group.color : rel === 1 ? "var(--text-faint)" : "var(--text-muted)",
                          borderBottom: isActive ? `2px solid ${group.color}` : "2px solid transparent",
                          cursor: "pointer",
                          border: isActive ? `1px solid ${group.color}40` : "1px solid transparent",
                          opacity: rel === 1 ? 0.6 : 1,
                        }}
                      >
                        {tab.emoji} {tab.label}
                        {isVisited && !isActive && (
                          <span
                            className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                            style={{ background: group.color, opacity: 0.5 }}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: tab name + hamburger */}
          <div className="flex sm:hidden flex-1 items-center gap-2">
            <div
              className="flex-1 px-3 py-2 rounded-xl text-sm font-medium truncate"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: activeGroup?.color }}
            >
              {activeTabObj?.emoji} {activeTabObj?.label}
            </div>
            <button
              onClick={() => setMobileNavOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              aria-label="Open tab navigation"
            >
              ☰
            </button>
          </div>

          {/* Role + relevance indicator */}
          <div
            className="shrink-0 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{ background: `${roleColor}12`, border: `1px solid ${roleColor}40` }}
          >
            <span className="text-xs font-medium" style={{ color: roleColor }}>{role.split(" ")[0]}</span>
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>·</span>
            <span className="text-xs" style={{ color: roleColor, opacity: 0.8 }}>{RELEVANCE_LABELS[relevance]}</span>
          </div>
        </div>

        {/* Section + step indicator below tab bar */}
        <div className="max-w-7xl mx-auto mt-1 flex items-center justify-between">
          {activeGroup && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: activeGroup.color, opacity: 0.8 }}>
                {activeGroup.name} · {activeGroup.desc}
              </span>
            </div>
          )}
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            Step {activeTabIndex + 1} of {TABS.length}
          </span>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6" id="main-content">
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

      {/* Previous / Next navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-12 pb-8">
        <div
          className="rounded-2xl p-1"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex gap-1">
            {prevTab ? (
              <button
                onClick={() => handleTabChange(prevTab.slug)}
                className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all duration-150 text-left group"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--border)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 18 }}>←</span>
                <div>
                  <div className="text-xs" style={{ color: "var(--text-faint)" }}>Previous</div>
                  <div className="font-medium text-xs sm:text-sm" style={{ color: "var(--text)" }}>
                    {prevTab.emoji} {prevTab.label}
                  </div>
                </div>
              </button>
            ) : <div className="flex-1" />}

            <div className="self-center w-px h-8" style={{ background: "var(--border)" }} />

            {nextTab ? (
              <button
                onClick={() => handleTabChange(nextTab.slug)}
                className="flex-1 flex items-center justify-end gap-2 px-4 py-3 rounded-xl text-sm transition-all duration-150 text-right group"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--border)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div>
                  <div className="text-xs" style={{ color: "var(--text-faint)" }}>Next</div>
                  <div className="font-medium text-xs sm:text-sm" style={{ color: "var(--text)" }}>
                    {nextTab.emoji} {nextTab.label}
                  </div>
                </div>
                <span style={{ fontSize: 18 }}>→</span>
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-end px-4 py-3">
                <div className="text-right">
                  <div className="text-xs" style={{ color: "var(--text-faint)" }}>You&apos;ve reached the end</div>
                  <div className="text-xs font-medium" style={{ color: roleColor }}>Ready for your interview? 🎉</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all"
          style={{ background: roleColor, color: "white", border: "none", cursor: "pointer" }}
          aria-label="Back to top"
        >
          ↑
        </button>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        ::-webkit-scrollbar { display: none; }
        *:focus-visible { outline: 2px solid ${ROLE_COLORS["Backend Engineer"]}; outline-offset: 2px; }
      `}</style>
    </div>
  );
}
