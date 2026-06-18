"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  SCALE_NUMBERS,
  SERVICES,
  QA_ARCHITECTURE,
  QA_PIPELINE,
  QA_RELIABILITY,
  CHEAT_SHEET,
  ACCESS_PATTERNS,
  ENCODING_PIPELINE,
  RECOMMENDATION_DEEP_DIVE,
  HOUSEHOLD_ENFORCEMENT,
} from "@/components/ui/netflix-system-data";
import type { Service, QA } from "@/components/ui/netflix-system-data";

/* ═══════════════════════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════════════════════ */
const TABS = [
  "Architecture",
  "Services",
  "Data Design",
  "Data Pipeline",
  "Interview Q&A",
  "Cheat Sheet",
] as const;
type Tab = (typeof TABS)[number];

/* ═══════════════════════════════════════════════════════════════
   CATEGORY COLORS
   ═══════════════════════════════════════════════════════════════ */
const CATEGORY_COLORS: Record<Service["category"], string> = {
  "Core Services": "#3b82f6",
  "Platform Services": "#8b5cf6",
  Infrastructure: "#f59e0b",
  "Data Layer": "#10b981",
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function NetflixPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Architecture");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>("playback");

  // Sync tab from URL on mount (client-only, no Suspense needed)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab") as Tab;
    if (t && TABS.includes(t)) setActiveTab(t);
  }, []);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
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
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        <nav className="flex items-center gap-2 text-sm" style={{ color: "var(--text-faint)" }}>
          <a href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Home</a>
          <span>›</span>
          <a href="/system-design" style={{ color: "var(--text-muted)", textDecoration: "none" }}>System Design</a>
          <span>›</span>
          <span style={{ color: "var(--text)" }}>Netflix</span>
        </nav>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-6">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Netflix System Design
        </h1>
        <p className="text-base" style={{ color: "var(--text-muted)" }}>
          Complete architecture, 22 services, data pipeline, 60 Q&As, and cheat sheet
        </p>
      </div>

      {/* Tab Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
        <div
          className="flex gap-1 p-1.5 rounded-xl w-fit overflow-x-auto"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap"
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
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {activeTab === "Architecture" && <ArchitectureTab onNavigateService={navigateToService} onNavigateTab={handleTabChange} />}
        {activeTab === "Services" && (
          <ServicesTab selectedServiceId={selectedServiceId} onSelectService={setSelectedServiceId} />
        )}
        {activeTab === "Data Design" && <DataDesignTab />}
        {activeTab === "Data Pipeline" && <DataPipelineTab />}
        {activeTab === "Interview Q&A" && <InterviewTab />}
        {activeTab === "Cheat Sheet" && <CheatSheetTab />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ARCHITECTURE TAB
   ═══════════════════════════════════════════════════════════════ */
function ArchitectureTab({ onNavigateService, onNavigateTab }: { onNavigateService: (id: string) => void; onNavigateTab: (tab: Tab) => void }) {
  return (
    <div className="space-y-10">
      {/* SVG Architecture Diagram */}
      <div
        className="rounded-2xl p-6 overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>
          Request Flow Architecture
        </h2>
        <div className="w-full overflow-x-auto">
          <svg viewBox="0 0 1000 700" className="w-full min-w-[800px]" style={{ maxHeight: "620px" }}>
            <defs>
              <style>{`
                @keyframes flowDash { to { stroke-dashoffset: -20; } }
                .flow-line {
                  stroke-dasharray: 8 4;
                  animation: flowDash 1s linear infinite;
                }
              `}</style>
            </defs>

            {/* Connection Lines */}
            {/* Client -> ELB */}
            <line x1="400" y1="60" x2="400" y2="130" className="flow-line" stroke="var(--blue-text)" strokeWidth="2" fill="none" />
            {/* Client -> OCA */}
            <line x1="480" y1="45" x2="700" y2="45" className="flow-line" stroke="#f59e0b" strokeWidth="2" fill="none" />
            <text x="590" y="36" fill="var(--text-faint)" fontSize="10" textAnchor="middle">video bytes directly</text>
            {/* ELB -> Zuul */}
            <line x1="400" y1="170" x2="400" y2="220" className="flow-line" stroke="var(--blue-text)" strokeWidth="2" fill="none" />
            {/* Zuul -> Eureka */}
            <line x1="320" y1="248" x2="200" y2="248" className="flow-line" stroke="var(--blue-text)" strokeWidth="2" fill="none" />
            {/* Zuul -> Core Services */}
            <line x1="350" y1="270" x2="200" y2="340" className="flow-line" stroke="var(--blue-text)" strokeWidth="2" fill="none" />
            {/* Zuul -> Platform Services */}
            <line x1="450" y1="270" x2="650" y2="340" className="flow-line" stroke="var(--blue-text)" strokeWidth="2" fill="none" />
            {/* Core -> Data Layer */}
            <line x1="200" y1="430" x2="400" y2="500" className="flow-line" stroke="#10b981" strokeWidth="2" fill="none" />
            {/* Platform -> Data Layer */}
            <line x1="650" y1="430" x2="500" y2="500" className="flow-line" stroke="#10b981" strokeWidth="2" fill="none" />
            {/* Data Layer -> Analytics */}
            <line x1="450" y1="570" x2="450" y2="610" className="flow-line" stroke="#8b5cf6" strokeWidth="2" fill="none" />

            {/* ─── Nodes ─── */}

            {/* Client */}
            <g onClick={() => onNavigateService("client")} className="cursor-pointer">
              <rect x="300" y="20" width="200" height="44" rx="10" fill="var(--blue-soft)" stroke="var(--blue-text)" strokeWidth="1.5" />
              <text x="400" y="47" textAnchor="middle" fill="var(--blue-text)" fontSize="13" fontWeight="600">Client (TV / Mobile / Web)</text>
            </g>

            {/* OCA */}
            <g onClick={() => onNavigateService("oca")} className="cursor-pointer">
              <rect x="700" y="20" width="190" height="44" rx="10" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="795" y="47" textAnchor="middle" fill="#92400e" fontSize="13" fontWeight="600">Open Connect (OCA CDN)</text>
            </g>

            {/* ELB + Route53 */}
            <g onClick={() => onNavigateService("elb")} className="cursor-pointer">
              <rect x="300" y="130" width="200" height="44" rx="10" fill="var(--blue-soft)" stroke="var(--blue-text)" strokeWidth="1.5" />
              <text x="400" y="157" textAnchor="middle" fill="var(--blue-text)" fontSize="13" fontWeight="600">AWS Route53 / ELB</text>
            </g>

            {/* Zuul2 */}
            <g onClick={() => onNavigateService("zuul")} className="cursor-pointer">
              <rect x="300" y="220" width="200" height="54" rx="10" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="400" y="250" textAnchor="middle" fill="#92400e" fontSize="14" fontWeight="700">Zuul2 API Gateway</text>
              <text x="400" y="265" textAnchor="middle" fill="#92400e" fontSize="10">1M+ requests/sec</text>
            </g>

            {/* Eureka + Ribbon */}
            <g onClick={() => onNavigateService("eureka")} className="cursor-pointer">
              <rect x="70" y="228" width="180" height="40" rx="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="160" y="253" textAnchor="middle" fill="#92400e" fontSize="12" fontWeight="600">Eureka + Ribbon</text>
            </g>

            {/* Core Services Group */}
            <g>
              <rect x="50" y="320" width="300" height="110" rx="12" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5 3" />
              <text x="200" y="342" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="700">CORE SERVICES</text>
              <g onClick={() => onNavigateService("auth")} className="cursor-pointer">
                <rect x="70" y="354" width="75" height="30" rx="6" fill="var(--blue-soft)" stroke="#3b82f6" strokeWidth="1" />
                <text x="107" y="374" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="500">Auth</text>
              </g>
              <g onClick={() => onNavigateService("user")} className="cursor-pointer">
                <rect x="155" y="354" width="75" height="30" rx="6" fill="var(--blue-soft)" stroke="#3b82f6" strokeWidth="1" />
                <text x="192" y="374" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="500">User</text>
              </g>
              <g onClick={() => onNavigateService("catalog")} className="cursor-pointer">
                <rect x="240" y="354" width="85" height="30" rx="6" fill="var(--blue-soft)" stroke="#3b82f6" strokeWidth="1" />
                <text x="282" y="374" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="500">Catalog</text>
              </g>
              <g onClick={() => onNavigateService("search")} className="cursor-pointer">
                <rect x="70" y="394" width="80" height="30" rx="6" fill="var(--blue-soft)" stroke="#3b82f6" strokeWidth="1" />
                <text x="110" y="414" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="500">Search</text>
              </g>
              <g onClick={() => onNavigateService("download")} className="cursor-pointer">
                <rect x="160" y="394" width="100" height="30" rx="6" fill="var(--blue-soft)" stroke="#3b82f6" strokeWidth="1" />
                <text x="210" y="414" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="500">Download</text>
              </g>
            </g>

            {/* Platform Services Group */}
            <g>
              <rect x="480" y="320" width="430" height="110" rx="12" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="5 3" />
              <text x="695" y="342" textAnchor="middle" fill="#8b5cf6" fontSize="11" fontWeight="700">PLATFORM SERVICES</text>
              <g onClick={() => onNavigateService("playback")} className="cursor-pointer">
                <rect x="500" y="354" width="80" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="540" y="374" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">Playback</text>
              </g>
              <g onClick={() => onNavigateService("billing")} className="cursor-pointer">
                <rect x="590" y="354" width="70" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="625" y="374" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">Billing</text>
              </g>
              <g onClick={() => onNavigateService("recommendation")} className="cursor-pointer">
                <rect x="670" y="354" width="65" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="702" y="374" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">Recs</text>
              </g>
              <g onClick={() => onNavigateService("drm")} className="cursor-pointer">
                <rect x="745" y="354" width="60" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="775" y="374" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">DRM</text>
              </g>
              <g onClick={() => onNavigateService("encoding")} className="cursor-pointer">
                <rect x="815" y="354" width="75" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="852" y="374" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">Encoding</text>
              </g>
              <g onClick={() => onNavigateService("concurrency")} className="cursor-pointer">
                <rect x="500" y="394" width="95" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="547" y="414" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">Concurrency</text>
              </g>
              <g onClick={() => onNavigateService("abtest")} className="cursor-pointer">
                <rect x="605" y="394" width="75" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="642" y="414" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">A/B Test</text>
              </g>
              <g onClick={() => onNavigateService("chaos")} className="cursor-pointer">
                <rect x="690" y="394" width="70" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="725" y="414" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">Chaos</text>
              </g>
              <g onClick={() => onNavigateService("notification")} className="cursor-pointer">
                <rect x="770" y="394" width="90" height="30" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
                <text x="815" y="414" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="500">Notification</text>
              </g>
            </g>

            {/* Data Layer */}
            <g>
              <rect x="220" y="480" width="520" height="90" rx="12" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="5 3" />
              <text x="480" y="502" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="700">DATA LAYER</text>
              <g onClick={() => onNavigateService("kafka")} className="cursor-pointer">
                <rect x="240" y="512" width="80" height="30" rx="6" fill="#d1fae5" stroke="#10b981" strokeWidth="1" />
                <text x="280" y="532" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="500">Kafka</text>
              </g>
              <g onClick={() => onNavigateService("cassandra")} className="cursor-pointer">
                <rect x="335" y="512" width="90" height="30" rx="6" fill="#d1fae5" stroke="#10b981" strokeWidth="1" />
                <text x="380" y="532" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="500">Cassandra</text>
              </g>
              <g onClick={() => onNavigateService("mysql")} className="cursor-pointer">
                <rect x="440" y="512" width="75" height="30" rx="6" fill="#d1fae5" stroke="#10b981" strokeWidth="1" />
                <text x="477" y="532" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="500">MySQL</text>
              </g>
              <g onClick={() => onNavigateService("redis")} className="cursor-pointer">
                <rect x="530" y="512" width="70" height="30" rx="6" fill="#d1fae5" stroke="#10b981" strokeWidth="1" />
                <text x="565" y="532" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="500">Redis</text>
              </g>
              <g onClick={() => onNavigateService("evcache")} className="cursor-pointer">
                <rect x="615" y="512" width="80" height="30" rx="6" fill="#d1fae5" stroke="#10b981" strokeWidth="1" />
                <text x="655" y="532" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="500">EVCache</text>
              </g>
            </g>

            {/* Analytics Pipeline */}
            <g>
              <rect x="220" y="600" width="520" height="60" rx="12" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="5 3" />
              <text x="480" y="620" textAnchor="middle" fill="#8b5cf6" fontSize="11" fontWeight="700">ANALYTICS PIPELINE</text>
              <rect x="260" y="630" width="80" height="24" rx="5" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
              <text x="300" y="646" textAnchor="middle" fill="#6d28d9" fontSize="11">Flink</text>
              <text x="360" y="646" fill="var(--text-faint)" fontSize="14">&#8594;</text>
              <rect x="380" y="630" width="80" height="24" rx="5" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
              <text x="420" y="646" textAnchor="middle" fill="#6d28d9" fontSize="11">Spark</text>
              <text x="480" y="646" fill="var(--text-faint)" fontSize="14">&#8594;</text>
              <rect x="500" y="630" width="100" height="24" rx="5" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
              <text x="550" y="646" textAnchor="middle" fill="#6d28d9" fontSize="11">S3 Iceberg</text>
              <text x="620" y="646" fill="var(--text-faint)" fontSize="14">&#8594;</text>
              <rect x="640" y="630" width="80" height="24" rx="5" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
              <text x="680" y="646" textAnchor="middle" fill="#6d28d9" fontSize="11">Trino/ML</text>
            </g>
          </svg>
        </div>
        <p className="text-xs mt-3 text-center" style={{ color: "var(--text-faint)" }}>
          Click any node to navigate to its service details
        </p>
      </div>

      {/* Press Play Sequence */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>Press Play — Request Sequence</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>The most common opening question. Every step has a latency target or failure mode.</p>
        <div className="space-y-1">
          {[
            { step: "1", actor: "Client", action: "POST /playback/start  { titleId, episodeId, deviceId, drmScheme }", detail: "" },
            { step: "2", actor: "Route53 → ELB", action: "DNS resolves to nearest ELB. Health-checked every 10s.", detail: "~30s failover if region down" },
            { step: "3", actor: "Zuul2", action: "Validate JWT signature. Rate-limit check. Route to Playback Service.", detail: "1M+ req/s, async/non-blocking" },
            { step: "4", actor: "Playback Service", action: "Check billing entitlement (EVCache → Billing Service fallback).", detail: "Fail open if Billing unreachable" },
            { step: "5", actor: "Concurrency Service", action: "Atomic Lua: check count < limit, INCR, SADD sessionId. TTL=36s.", detail: "Redis, sub-ms, prevents >N streams" },
            { step: "6", actor: "Steering Service", action: "Rank OCAs by client IP proximity, title cached?, OCA load.", detail: "Returns ordered OCA list" },
            { step: "7", actor: "DRM Service", action: "Issue license token (signed, contains CEK encrypted for device TEE).", detail: "HSM operation, ~10ms" },
            { step: "8", actor: "Playback Service", action: "Generate signed HMAC-SHA256 manifest URL (6h TTL). Write resume position to Cassandra. Publish PLAY event to Kafka.", detail: "<300ms p99 total" },
            { step: "9", actor: "Client → OCA", action: "Client fetches DASH/HLS manifest from manifest URL. Downloads first segment from OCA directly.", detail: "API tier is now OUT of the hot path" },
            { step: "10", actor: "Client (every 30s)", action: "POST /playback/heartbeat { sessionId, positionMs, bitrateKbps }. Refreshes Redis TTL to 36s. Updates Cassandra position.", detail: "Crash = slot expires after 36s" },
          ].map(({ step, actor, action, detail }) => (
            <div key={step} className="flex gap-3 p-3 rounded-lg" style={{ background: step === "9" ? "var(--blue-soft)" : "var(--bg)", border: "1px solid var(--border)" }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>{step}</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-xs font-bold" style={{ color: "var(--blue-text)" }}>{actor}</span>
                  <span className="text-xs font-mono" style={{ color: "var(--text)" }}>{action}</span>
                </div>
                {detail && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-faint)" }}>{detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scale Numbers */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--text)" }}>
          Scale Numbers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SCALE_NUMBERS.map((item) => (
            <div
              key={item.metric}
              className="flex justify-between items-center p-3.5 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                {item.metric}
              </span>
              <span className="font-mono font-bold text-sm ml-4 whitespace-nowrap" style={{ color: "var(--blue-text)" }}>
                {item.number}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Insight */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)" }}
      >
        <h3 className="text-lg font-bold mb-2" style={{ color: "var(--blue-text)" }}>
          Critical Insight
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          95% of Netflix traffic is video bytes flowing directly between the Client and Open Connect
          Appliances (OCAs). The API tier handles only metadata and session setup. After the Playback
          Service returns a signed manifest URL, the API servers are completely out of the hot path.
          This is why Netflix can serve 100 Tbps of video with a relatively modest API fleet.
        </p>
      </div>

      {/* Data Model callout */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)" }}
      >
        <p className="text-sm" style={{ color: "var(--text)" }}>
          <strong style={{ color: "var(--blue-text)" }}>Data Model &amp; Access Patterns</strong> — detailed ERD, Cassandra CQL schemas, and per-table database rationale are in the{" "}
          <button
            onClick={() => onNavigateTab("Data Design")}
            style={{ color: "var(--blue-text)", textDecoration: "underline", cursor: "pointer", background: "none", border: "none" }}
          >
            Data Design tab
          </button>.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SERVICES TAB
   ═══════════════════════════════════════════════════════════════ */
function ServicesTab({
  selectedServiceId,
  onSelectService,
}: {
  selectedServiceId: string | null;
  onSelectService: (id: string | null) => void;
}) {
  const [filter, setFilter] = useState("");

  const grouped = useMemo(() => {
    const map: Record<string, Service[]> = {};
    SERVICES.filter(s => filter === "" || s.label.toLowerCase().includes(filter.toLowerCase()))
      .forEach((s) => {
        if (!map[s.category]) map[s.category] = [];
        map[s.category].push(s);
      });
    return map;
  }, [filter]);

  const selectedService = SERVICES.find((s) => s.id === selectedServiceId) || null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
      {/* Sidebar */}
      <div
        className="w-full lg:w-64 shrink-0 rounded-xl p-4 overflow-y-auto lg:max-h-[80vh] lg:sticky lg:top-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
          All Services ({SERVICES.length})
        </h3>
        <input
          type="text"
          placeholder="Filter services..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-xs mb-3 outline-none"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        {Object.entries(grouped).map(([category, services]) => (
          <div key={category} className="mb-5">
            <h4
              className="text-[11px] font-bold uppercase tracking-wider mb-2 px-3"
              style={{ color: CATEGORY_COLORS[category as Service["category"]] }}
            >
              {category}
            </h4>
            <div className="space-y-0.5">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectService(s.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150"
                  style={{
                    background: selectedServiceId === s.id ? "var(--blue-soft)" : "transparent",
                    color: selectedServiceId === s.id ? "var(--blue-text)" : "var(--text-muted)",
                    borderLeft: `3px solid ${selectedServiceId === s.id ? "var(--blue-text)" : CATEGORY_COLORS[s.category] + "50"}`,
                    cursor: "pointer",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Panel */}
      <div className="flex-1 min-w-0">
        {selectedService ? (
          <ServiceDetail service={selectedService} />
        ) : (
          <div
            className="rounded-xl p-12 text-center h-full flex items-center justify-center"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <p className="text-lg" style={{ color: "var(--text-muted)" }}>
              Select a service from the sidebar to view its details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceDetail({ service }: { service: Service }) {
  return (
    <div
      className="rounded-xl p-6 space-y-7"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-1.5 h-12 rounded-full"
          style={{ background: CATEGORY_COLORS[service.category] }}
        />
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {service.label}
          </h2>
          <span className="text-xs font-medium" style={{ color: CATEGORY_COLORS[service.category] }}>
            {service.category}
          </span>
        </div>
      </div>

      {/* What it does */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
          What it does
        </h3>
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>
          {service.whatItDoes}
        </p>
      </div>

      {/* Responsibilities */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
          Responsibilities
        </h3>
        <ul className="space-y-2">
          {service.responsibilities.map((r, i) => (
            <li key={i} className="flex gap-2.5 text-sm" style={{ color: "var(--text)" }}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[service.category] }} />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Tech Stack */}
      {service.techStack && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Tech Stack
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            {service.techStack}
          </p>
        </div>
      )}

      {/* API Routes */}
      {service.apiRoutes && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            API Routes
          </h3>
          <CodeBlockWithCopy code={service.apiRoutes} />
        </div>
      )}

      {/* Classes & Methods */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
          Classes & Methods
        </h3>
        <CodeBlockWithCopy code={service.classesAndMethods} language="java" />
      </div>

      {/* DB Tables */}
      {service.dbTables && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Database Tables
          </h3>
          <DbTablesView raw={service.dbTables} />
        </div>
      )}

      {/* Key Insight */}
      {service.keyInsight && (
        <div
          className="rounded-lg p-5"
          style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)" }}
        >
          <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--blue-text)" }}>
            Key Insight
          </h4>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            {service.keyInsight}
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DATA DESIGN TAB
   ═══════════════════════════════════════════════════════════════ */
function DataDesignTab() {
  const [openCqlIdx, setOpenCqlIdx] = useState<number | null>(null);

  return (
    <div className="space-y-10">
      {/* Access Patterns */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>Access Patterns → Storage Choice</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Every table is designed around a specific query — not normalization. Click &quot;Show CQL&quot; to see the schema.</p>
        <div className="space-y-3">
          {ACCESS_PATTERNS.map((ap, i) => (
            <div key={i} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="p-4" style={{ background: "var(--bg)" }}>
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold font-mono" style={{ color: "var(--blue-text)" }}>{ap.table}</span>
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>{ap.db}</span>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{ap.accessPattern}</p>
                    <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--text-faint)" }}>{ap.why}</p>
                  </div>
                  <button
                    onClick={() => setOpenCqlIdx(openCqlIdx === i ? null : i)}
                    className="text-xs px-3 py-1.5 rounded-lg shrink-0"
                    style={{ background: "var(--blue-soft)", color: "var(--blue-text)", cursor: "pointer", border: "none" }}
                  >
                    {openCqlIdx === i ? "Hide CQL" : "Show CQL"}
                  </button>
                </div>
              </div>
              {openCqlIdx === i && (
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  <CodeBlockWithCopy code={ap.cql} language="sql" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Encoding Pipeline */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>Encoding Pipeline</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>{ENCODING_PIPELINE.overview}</p>
        <div className="space-y-1 mb-6">
          {ENCODING_PIPELINE.stages.map((stage, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold" style={{ color: "var(--blue-text)" }}>{stage.name}</span>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>{stage.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-4" style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "var(--blue-text)" }}>Variants per title</p>
          <pre className="text-xs font-mono whitespace-pre-wrap" style={{ color: "var(--text)" }}>{ENCODING_PIPELINE.variants}</pre>
        </div>
      </div>

      {/* Recommendation Deep Dive */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>Recommendation System Deep Dive</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Cold Start Problem</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{RECOMMENDATION_DEEP_DIVE.coldStart}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Two-Tower Model Architecture</h3>
            <CodeBlockWithCopy code={RECOMMENDATION_DEEP_DIVE.twoTower} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Feature Store</h3>
            <CodeBlockWithCopy code={RECOMMENDATION_DEEP_DIVE.featureStore} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Artwork Bandit</h3>
            <CodeBlockWithCopy code={RECOMMENDATION_DEEP_DIVE.artworkBandit} />
          </div>
        </div>
      </div>

      {/* Household Enforcement */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>Account vs Household Model</h2>
        <p className="text-sm mb-4 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>{HOUSEHOLD_ENFORCEMENT.problem}</p>
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Detection Signals</h3>
          <ul className="space-y-1">
            {HOUSEHOLD_ENFORCEMENT.signals.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs" style={{ color: "var(--text)" }}>
                <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#8b5cf6" }} />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Data Model</h3>
          <CodeBlockWithCopy code={HOUSEHOLD_ENFORCEMENT.dataModel} language="sql" />
        </div>
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Enforcement Logic</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{HOUSEHOLD_ENFORCEMENT.enforcement}</p>
        </div>
        <div className="rounded-lg p-4" style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)" }}>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--blue-text)" }}>Key Insight</h4>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{HOUSEHOLD_ENFORCEMENT.keyInsight}</p>
        </div>
      </div>

      {/* Back-of-Envelope */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text)" }}>Back-of-Envelope Estimation</h2>
        <CodeBlockWithCopy code={`300M subscribers
× 30 min active/day average
= 9B user-minutes/day
÷ 60 seconds
= 150M "active-second" slots/day peak-equivalent
× 3 events per 6s (heartbeat + UI impression + click)
= ~450M events / 86,400s ≈ ~5M events/s baseline
× 3x peak factor (evening hours)
= 15M events/s peak  ✓`} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DATA PIPELINE TAB
   ═══════════════════════════════════════════════════════════════ */

function DataPipelineTab() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showLakehouse, setShowLakehouse] = useState(true);

  return (
    <div className="space-y-10">
      {/* ─── STICKY PIPELINE NAVIGATOR ────────────────────── */}
      <div className="sticky top-0 z-30 py-3 -mx-4 px-4 sm:-mx-6 sm:px-6" style={{ background: "var(--bg)" }}>
        <div className="flex items-center gap-1 p-2 rounded-xl overflow-x-auto" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {[
            { id:"start", label:"Start Here", color:"#3b82f6" },
            { id:"tables", label:"Data Model", color:"#f59e0b" },
            { id:"flow", label:"Data Flow", color:"#10b981" },
            { id:"infra", label:"Infrastructure", color:"#8b5cf6" },
            { id:"kafka", label:"Kafka", color:"#10b981" },
            { id:"flink", label:"Flink", color:"#8b5cf6" },
            { id:"serving", label:"Serving", color:"#06b6d4" },
          ].map((s, i, arr) => (
            <div key={s.id} className="flex items-center">
              <a href={`#dp-${s.id}`} className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                style={{ color: s.color, background: `${s.color}12`, cursor: "pointer" }}>
                {s.label}
              </a>
              {i < arr.length - 1 && <span className="mx-1 text-xs" style={{ color: "var(--text-faint)" }}>&rarr;</span>}
            </div>
          ))}
        </div>
      </div>


      {/* ═══════════════════════════════════════════════════════
         1. START HERE — THE NUMBERS THAT DRIVE EVERYTHING
         ═══════════════════════════════════════════════════════ */}
      <div id="dp-start"
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", scrollMarginTop: "80px" }}
      >
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)" }} />
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
          Start Here: The Numbers That Drive Everything
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Open the interview with this. Every infrastructure decision below derives from these numbers.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 p-6 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <div className="text-center sm:text-left">
            <div className="text-4xl sm:text-5xl font-black font-mono" style={{ color: "var(--blue-text)" }}>15M</div>
            <div className="text-sm font-medium mt-1" style={{ color: "var(--text-muted)" }}>events per second at peak</div>
          </div>
          <div className="h-px sm:h-16 sm:w-px w-full" style={{ background: "var(--border)" }} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
            {[
              ["700B", "events/day"],
              ["1.5 PB", "data/day"],
              ["~40 GB/s", "peak ingest"],
              ["260M+", "subscribers"],
            ].map(([val, label], i) => (
              <div key={i} className="text-center">
                <div className="text-lg font-bold font-mono" style={{ color: "var(--text)" }}>{val}</div>
                <div className="text-[10px]" style={{ color: "var(--text-faint)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--blue-text)" }}>
            How every number derives from 15M events/s
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs" style={{ color: "var(--text)" }}>
            <div><strong>15M events/s</strong> &times; avg 2KB = <strong>~30 GB/s raw</strong> &rarr; with overhead = ~40 GB/s peak</div>
            <div><strong>40 GB/s</strong> &times; RF 3 = 120 GB/s &divide; 200 MB/s/broker = <strong>~600+ Kafka brokers</strong></div>
            <div><strong>15M events/s</strong> &divide; 5K events/vCPU = <strong>~3,000 Flink vCPUs</strong></div>
            <div><strong>40 GB/s</strong> &times; 86,400s &times; 0.45 compression = <strong>~1.5 PB/day to S3</strong></div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
         2. DATA MODEL (ERD) — THE APPLICATION TABLES
         ═══════════════════════════════════════════════════════ */}
      <div id="dp-tables"
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", scrollMarginTop: "80px" }}
      >
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Data Model — Core Tables
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          These are the operational tables that power the microservices. Every event in the pipeline originates from writes to these tables.
        </p>

        {/* ERD SVG */}
        <div className="w-full overflow-x-auto mb-8">
          <svg viewBox="0 0 960 620" className="w-full min-w-[750px]" style={{ maxHeight: "620px" }}>
            <defs>
              <style>{`
                .erd-h { font-size: 11px; font-weight: 700; }
                .erd-c { font-size: 9px; font-family: ui-monospace, monospace; }
                @keyframes flowDash { to { stroke-dashoffset: -20; } }
                .rel-line { stroke-dasharray: 4 2; animation: flowDash 1.5s linear infinite; }
              `}</style>
              <marker id="fk-arrow" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
                <polygon points="0 0, 6 2.5, 0 5" fill="var(--text-faint)" />
              </marker>
            </defs>

            {/* ─── User & Auth Domain ─── */}
            <rect x="10" y="10" width="200" height="130" rx="8" fill="var(--bg)" stroke="#3b82f6" strokeWidth="2" />
            <rect x="10" y="10" width="200" height="26" rx="8" fill="var(--blue-soft)" />
            <rect x="10" y="30" width="200" height="6" fill="var(--blue-soft)" />
            <text x="110" y="29" textAnchor="middle" className="erd-h" fill="var(--blue-text)">accounts</text>
            <text x="20" y="52" className="erd-c" fill="var(--text)">account_id</text><text x="160" y="52" className="erd-c" fill="var(--text-faint)">UUID PK</text>
            <text x="20" y="66" className="erd-c" fill="var(--text)">email</text><text x="160" y="66" className="erd-c" fill="var(--text-faint)">VARCHAR</text>
            <text x="20" y="80" className="erd-c" fill="var(--text)">password_hash</text><text x="160" y="80" className="erd-c" fill="var(--text-faint)">VARCHAR</text>
            <text x="20" y="94" className="erd-c" fill="var(--text)">country</text><text x="160" y="94" className="erd-c" fill="var(--text-faint)">CHAR(2)</text>
            <text x="20" y="108" className="erd-c" fill="var(--text)">max_profiles</text><text x="160" y="108" className="erd-c" fill="var(--text-faint)">INT</text>
            <text x="20" y="122" className="erd-c" fill="var(--text)">created_at</text><text x="160" y="122" className="erd-c" fill="var(--text-faint)">TIMESTAMP</text>

            <rect x="10" y="155" width="200" height="120" rx="8" fill="var(--bg)" stroke="#3b82f6" strokeWidth="2" />
            <rect x="10" y="155" width="200" height="26" rx="8" fill="var(--blue-soft)" />
            <rect x="10" y="175" width="200" height="6" fill="var(--blue-soft)" />
            <text x="110" y="174" textAnchor="middle" className="erd-h" fill="var(--blue-text)">profiles</text>
            <text x="20" y="197" className="erd-c" fill="var(--text)">profile_id</text><text x="160" y="197" className="erd-c" fill="var(--text-faint)">UUID PK</text>
            <text x="20" y="211" className="erd-c" fill="var(--text)">account_id</text><text x="160" y="211" className="erd-c" fill="var(--text-faint)">UUID FK</text>
            <text x="20" y="225" className="erd-c" fill="var(--text)">display_name</text><text x="160" y="225" className="erd-c" fill="var(--text-faint)">VARCHAR</text>
            <text x="20" y="239" className="erd-c" fill="var(--text)">is_kids</text><text x="160" y="239" className="erd-c" fill="var(--text-faint)">BOOLEAN</text>
            <text x="20" y="253" className="erd-c" fill="var(--text)">maturity_level</text><text x="160" y="253" className="erd-c" fill="var(--text-faint)">ENUM</text>

            {/* accounts → profiles */}
            <line x1="110" y1="140" x2="110" y2="155" className="rel-line" stroke="var(--text-faint)" strokeWidth="1.5" markerEnd="url(#fk-arrow)" />

            {/* ─── Billing Domain ─── */}
            <rect x="240" y="10" width="210" height="120" rx="8" fill="var(--bg)" stroke="#f59e0b" strokeWidth="2" />
            <rect x="240" y="10" width="210" height="26" rx="8" fill="#fef3c7" />
            <rect x="240" y="30" width="210" height="6" fill="#fef3c7" />
            <text x="345" y="29" textAnchor="middle" className="erd-h" fill="#92400e">subscriptions</text>
            <text x="250" y="52" className="erd-c" fill="var(--text)">subscription_id</text><text x="390" y="52" className="erd-c" fill="var(--text-faint)">UUID PK</text>
            <text x="250" y="66" className="erd-c" fill="var(--text)">account_id</text><text x="390" y="66" className="erd-c" fill="var(--text-faint)">UUID FK</text>
            <text x="250" y="80" className="erd-c" fill="var(--text)">plan</text><text x="390" y="80" className="erd-c" fill="var(--text-faint)">ENUM</text>
            <text x="250" y="94" className="erd-c" fill="var(--text)">status</text><text x="390" y="94" className="erd-c" fill="var(--text-faint)">ENUM</text>
            <text x="250" y="108" className="erd-c" fill="var(--text)">price, period_end</text><text x="390" y="108" className="erd-c" fill="var(--text-faint)">DECIMAL, TS</text>

            <rect x="240" y="145" width="210" height="100" rx="8" fill="var(--bg)" stroke="#f59e0b" strokeWidth="2" />
            <rect x="240" y="145" width="210" height="26" rx="8" fill="#fef3c7" />
            <rect x="240" y="165" width="210" height="6" fill="#fef3c7" />
            <text x="345" y="164" textAnchor="middle" className="erd-h" fill="#92400e">payments</text>
            <text x="250" y="187" className="erd-c" fill="var(--text)">payment_id</text><text x="390" y="187" className="erd-c" fill="var(--text-faint)">UUID PK</text>
            <text x="250" y="201" className="erd-c" fill="var(--text)">account_id</text><text x="390" y="201" className="erd-c" fill="var(--text-faint)">UUID FK</text>
            <text x="250" y="215" className="erd-c" fill="var(--text)">subscription_id</text><text x="390" y="215" className="erd-c" fill="var(--text-faint)">UUID FK</text>
            <text x="250" y="229" className="erd-c" fill="var(--text)">amount, status</text><text x="390" y="229" className="erd-c" fill="var(--text-faint)">DEC, ENUM</text>

            {/* accounts → subscriptions */}
            <line x1="210" y1="60" x2="240" y2="60" className="rel-line" stroke="var(--text-faint)" strokeWidth="1.5" markerEnd="url(#fk-arrow)" />

            {/* ─── Content Domain ─── */}
            <rect x="490" y="10" width="210" height="130" rx="8" fill="var(--bg)" stroke="#10b981" strokeWidth="2" />
            <rect x="490" y="10" width="210" height="26" rx="8" fill="#d1fae5" />
            <rect x="490" y="30" width="210" height="6" fill="#d1fae5" />
            <text x="595" y="29" textAnchor="middle" className="erd-h" fill="#065f46">content</text>
            <text x="500" y="52" className="erd-c" fill="var(--text)">content_id</text><text x="640" y="52" className="erd-c" fill="var(--text-faint)">UUID PK</text>
            <text x="500" y="66" className="erd-c" fill="var(--text)">title</text><text x="640" y="66" className="erd-c" fill="var(--text-faint)">VARCHAR</text>
            <text x="500" y="80" className="erd-c" fill="var(--text)">type</text><text x="640" y="80" className="erd-c" fill="var(--text-faint)">ENUM(movie,series)</text>
            <text x="500" y="94" className="erd-c" fill="var(--text)">status</text><text x="640" y="94" className="erd-c" fill="var(--text-faint)">ENUM</text>
            <text x="500" y="108" className="erd-c" fill="var(--text)">age_rating, genres</text><text x="640" y="108" className="erd-c" fill="var(--text-faint)">ENUM, JSON</text>
            <text x="500" y="122" className="erd-c" fill="var(--text)">release_year</text><text x="640" y="122" className="erd-c" fill="var(--text-faint)">INT</text>

            <rect x="490" y="155" width="210" height="80" rx="8" fill="var(--bg)" stroke="#10b981" strokeWidth="2" />
            <rect x="490" y="155" width="210" height="26" rx="8" fill="#d1fae5" />
            <rect x="490" y="175" width="210" height="6" fill="#d1fae5" />
            <text x="595" y="174" textAnchor="middle" className="erd-h" fill="#065f46">episodes</text>
            <text x="500" y="197" className="erd-c" fill="var(--text)">episode_id</text><text x="640" y="197" className="erd-c" fill="var(--text-faint)">UUID PK</text>
            <text x="500" y="211" className="erd-c" fill="var(--text)">content_id, season_id</text><text x="640" y="211" className="erd-c" fill="var(--text-faint)">FK, FK</text>
            <text x="500" y="225" className="erd-c" fill="var(--text)">episode_number, duration</text><text x="640" y="225" className="erd-c" fill="var(--text-faint)">INT, INT</text>

            {/* content → episodes */}
            <line x1="595" y1="140" x2="595" y2="155" className="rel-line" stroke="var(--text-faint)" strokeWidth="1.5" markerEnd="url(#fk-arrow)" />

            {/* ─── Video/CDN Domain ─── */}
            <rect x="740" y="10" width="200" height="100" rx="8" fill="var(--bg)" stroke="#8b5cf6" strokeWidth="2" />
            <rect x="740" y="10" width="200" height="26" rx="8" fill="#ede9fe" />
            <rect x="740" y="30" width="200" height="6" fill="#ede9fe" />
            <text x="840" y="29" textAnchor="middle" className="erd-h" fill="#6d28d9">videos</text>
            <text x="750" y="52" className="erd-c" fill="var(--text)">video_id</text><text x="890" y="52" className="erd-c" fill="var(--text-faint)">UUID PK</text>
            <text x="750" y="66" className="erd-c" fill="var(--text)">content_id, episode_id</text><text x="890" y="66" className="erd-c" fill="var(--text-faint)">FK, FK</text>
            <text x="750" y="80" className="erd-c" fill="var(--text)">quality</text><text x="890" y="80" className="erd-c" fill="var(--text-faint)">ENUM</text>
            <text x="750" y="94" className="erd-c" fill="var(--text)">cdn_url, bitrate_kbps</text><text x="890" y="94" className="erd-c" fill="var(--text-faint)">URL, INT</text>

            {/* content → videos */}
            <line x1="700" y1="50" x2="740" y2="50" className="rel-line" stroke="var(--text-faint)" strokeWidth="1.5" markerEnd="url(#fk-arrow)" />

            {/* ─── Activity Domain ─── */}
            <rect x="10" y="310" width="240" height="140" rx="8" fill="var(--bg)" stroke="#ec4899" strokeWidth="2" />
            <rect x="10" y="310" width="240" height="26" rx="8" fill="#fce7f3" />
            <rect x="10" y="330" width="240" height="6" fill="#fce7f3" />
            <text x="130" y="329" textAnchor="middle" className="erd-h" fill="#9d174d">watch_history</text>
            <text x="20" y="352" className="erd-c" fill="var(--text)">history_id</text><text x="190" y="352" className="erd-c" fill="var(--text-faint)">UUID PK</text>
            <text x="20" y="366" className="erd-c" fill="var(--text)">profile_id</text><text x="190" y="366" className="erd-c" fill="var(--text-faint)">UUID FK</text>
            <text x="20" y="380" className="erd-c" fill="var(--text)">content_id</text><text x="190" y="380" className="erd-c" fill="var(--text-faint)">UUID FK</text>
            <text x="20" y="394" className="erd-c" fill="var(--text)">episode_id</text><text x="190" y="394" className="erd-c" fill="var(--text-faint)">UUID FK</text>
            <text x="20" y="408" className="erd-c" fill="var(--text)">watch_position_secs</text><text x="190" y="408" className="erd-c" fill="var(--text-faint)">INT</text>
            <text x="20" y="422" className="erd-c" fill="var(--text)">progress_pct</text><text x="190" y="422" className="erd-c" fill="var(--text-faint)">FLOAT</text>
            <text x="20" y="436" className="erd-c" fill="var(--text)">last_watched_at</text><text x="190" y="436" className="erd-c" fill="var(--text-faint)">TIMESTAMP</text>

            <rect x="280" y="310" width="240" height="120" rx="8" fill="var(--bg)" stroke="#ec4899" strokeWidth="2" />
            <rect x="280" y="310" width="240" height="26" rx="8" fill="#fce7f3" />
            <rect x="280" y="330" width="240" height="6" fill="#fce7f3" />
            <text x="400" y="329" textAnchor="middle" className="erd-h" fill="#9d174d">stream_sessions</text>
            <text x="290" y="352" className="erd-c" fill="var(--text)">session_id</text><text x="460" y="352" className="erd-c" fill="var(--text-faint)">UUID PK</text>
            <text x="290" y="366" className="erd-c" fill="var(--text)">profile_id</text><text x="460" y="366" className="erd-c" fill="var(--text-faint)">UUID FK</text>
            <text x="290" y="380" className="erd-c" fill="var(--text)">content_id, video_id</text><text x="460" y="380" className="erd-c" fill="var(--text-faint)">FK, FK</text>
            <text x="290" y="394" className="erd-c" fill="var(--text)">quality, status</text><text x="460" y="394" className="erd-c" fill="var(--text-faint)">ENUM, ENUM</text>
            <text x="290" y="408" className="erd-c" fill="var(--text)">started_at</text><text x="460" y="408" className="erd-c" fill="var(--text-faint)">TIMESTAMP</text>
            <text x="290" y="422" className="erd-c" fill="var(--text)">bytes_transferred</text><text x="460" y="422" className="erd-c" fill="var(--text-faint)">BIGINT</text>

            <rect x="550" y="310" width="200" height="90" rx="8" fill="var(--bg)" stroke="#ec4899" strokeWidth="2" />
            <rect x="550" y="310" width="200" height="26" rx="8" fill="#fce7f3" />
            <rect x="550" y="330" width="200" height="6" fill="#fce7f3" />
            <text x="650" y="329" textAnchor="middle" className="erd-h" fill="#9d174d">continue_watching</text>
            <text x="560" y="352" className="erd-c" fill="var(--text)">profile_id</text><text x="700" y="352" className="erd-c" fill="var(--text-faint)">UUID PK</text>
            <text x="560" y="366" className="erd-c" fill="var(--text)">content_id, episode_id</text><text x="700" y="366" className="erd-c" fill="var(--text-faint)">FK, FK</text>
            <text x="560" y="380" className="erd-c" fill="var(--text)">position_secs</text><text x="700" y="380" className="erd-c" fill="var(--text-faint)">INT</text>
            <text x="560" y="394" className="erd-c" fill="var(--text-faint)" fontSize="8">denormalized for fast reads</text>

            <rect x="780" y="310" width="160" height="80" rx="8" fill="var(--bg)" stroke="#ec4899" strokeWidth="2" />
            <rect x="780" y="310" width="160" height="26" rx="8" fill="#fce7f3" />
            <rect x="780" y="330" width="160" height="6" fill="#fce7f3" />
            <text x="860" y="329" textAnchor="middle" className="erd-h" fill="#9d174d">user_ratings</text>
            <text x="790" y="352" className="erd-c" fill="var(--text)">rating_id</text><text x="900" y="352" className="erd-c" fill="var(--text-faint)">UUID PK</text>
            <text x="790" y="366" className="erd-c" fill="var(--text)">profile_id</text><text x="900" y="366" className="erd-c" fill="var(--text-faint)">UUID FK</text>
            <text x="790" y="380" className="erd-c" fill="var(--text)">content_id, score</text><text x="900" y="380" className="erd-c" fill="var(--text-faint)">FK, INT</text>

            {/* Relationship lines */}
            <line x1="110" y1="275" x2="110" y2="310" className="rel-line" stroke="var(--text-faint)" strokeWidth="1.5" markerEnd="url(#fk-arrow)" />
            <text x="120" y="295" className="erd-c" fill="var(--text-faint)">profiles → watch_history</text>

            <line x1="595" y1="235" x2="400" y2="310" className="rel-line" stroke="var(--text-faint)" strokeWidth="1.5" markerEnd="url(#fk-arrow)" />

            {/* ─── Domain Labels ─── */}
            <rect x="10" y="470" width="940" height="140" rx="12" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="5 3" />
            <text x="30" y="490" fontSize="10" fontWeight="700" fill="var(--text-faint)">SERVICE OWNERSHIP</text>
            <text x="30" y="510" className="erd-c" fill="var(--text-muted)">AuthService &rarr; accounts, profiles</text>
            <text x="30" y="525" className="erd-c" fill="var(--text-muted)">BillingService &rarr; subscriptions, payments, payment_methods</text>
            <text x="30" y="540" className="erd-c" fill="var(--text-muted)">CatalogService &rarr; content, seasons, episodes, content_genres, content_cast</text>
            <text x="30" y="555" className="erd-c" fill="var(--text-muted)">PlaybackService &rarr; videos, stream_sessions</text>
            <text x="30" y="570" className="erd-c" fill="var(--text-muted)">UserActivityService &rarr; watch_history, continue_watching, user_ratings</text>
            <text x="30" y="585" className="erd-c" fill="var(--text-muted)">RecommendationService &rarr; reads from watch_history + user_ratings (no owned tables, uses ML features)</text>
            <text x="30" y="600" className="erd-c" fill="var(--text-muted)">EncodingService &rarr; writes to videos table after transcoding completes</text>
          </svg>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
         3. DATA FLOW — HOW TABLES GET POPULATED
         ═══════════════════════════════════════════════════════ */}
      <div id="dp-flow"
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", scrollMarginTop: "80px" }}
      >
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Data Flow — How Tables Get Populated &amp; Where Events Go
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Every user action writes to operational tables AND emits events to Kafka. The pipeline consumes these events for analytics.
        </p>

        <div className="w-full overflow-x-auto mb-6">
          <svg viewBox="0 0 950 380" className="w-full min-w-[750px]" style={{ maxHeight: "380px" }}>
            <defs>
              <style>{`
                .df-flow { stroke-dasharray: 5 3; animation: flowDash 0.8s linear infinite; }
              `}</style>
            </defs>

            {/* User Actions (left) */}
            <rect x="10" y="30" width="150" height="320" rx="10" fill="var(--blue-soft)" stroke="var(--blue-text)" strokeWidth="1.5" />
            <text x="85" y="55" textAnchor="middle" fill="var(--blue-text)" fontSize="11" fontWeight="700">User Actions</text>
            {["Sign up","Subscribe","Browse","Play video","Pause/seek","Rate content","Search"].map((a, i) => (
              <text key={i} x="25" y={80 + i * 38} className="erd-c" fill="var(--text)">{a}</text>
            ))}

            {/* Operational DB (middle-top) */}
            <rect x="220" y="30" width="220" height="150" rx="10" fill="var(--bg)" stroke="#f59e0b" strokeWidth="2" />
            <text x="330" y="55" textAnchor="middle" fontSize="11" fontWeight="700" fill="#92400e">Operational Tables (MySQL/Cassandra)</text>
            {["accounts, profiles","subscriptions, payments","content, episodes, videos","watch_history, stream_sessions","continue_watching, user_ratings"].map((t, i) => (
              <text key={i} x="230" y={75 + i * 22} className="erd-c" fill="var(--text)">{t}</text>
            ))}

            {/* Arrow: User → DB */}
            <line x1="160" y1="100" x2="220" y2="100" className="df-flow" stroke="#f59e0b" strokeWidth="2" />
            <text x="190" y="92" fontSize="8" fill="var(--text-faint)">writes</text>

            {/* Kafka (middle) */}
            <rect x="220" y="210" width="220" height="140" rx="10" fill="#d1fae5" stroke="#10b981" strokeWidth="2" />
            <text x="330" y="235" textAnchor="middle" fontSize="11" fontWeight="700" fill="#065f46">Kafka (~40 clusters, 720 brokers)</text>
            {["playback.started / .heartbeat / .error","ui.impression / .click","subscription.created / .cancelled","recommendation.served","experiment.assignment"].map((t, i) => (
              <text key={i} x="230" y={258 + i * 22} className="erd-c" fill="var(--text)">{t}</text>
            ))}

            {/* Arrow: User → Kafka (events) */}
            <line x1="160" y1="250" x2="220" y2="270" className="df-flow" stroke="#10b981" strokeWidth="2" />
            <text x="175" y="248" fontSize="8" fill="var(--text-faint)">emits events</text>

            {/* Arrow: DB → Kafka (CDC) */}
            <line x1="330" y1="180" x2="330" y2="210" className="df-flow" stroke="#10b981" strokeWidth="1.5" />
            <text x="340" y="198" fontSize="8" fill="var(--text-faint)">CDC</text>

            {/* Flink */}
            <rect x="500" y="210" width="160" height="140" rx="10" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2" />
            <text x="580" y="235" textAnchor="middle" fontSize="11" fontWeight="700" fill="#6d28d9">Flink (~3K vCPUs)</text>
            <text x="510" y="258" className="erd-c" fill="var(--text)">Deduplicate</text>
            <text x="510" y="275" className="erd-c" fill="var(--text)">Sessionize</text>
            <text x="510" y="292" className="erd-c" fill="var(--text)">Enrich (join catalog)</text>
            <text x="510" y="309" className="erd-c" fill="var(--text)">Aggregate (QoE)</text>
            <text x="510" y="326" className="erd-c" fill="var(--text)">Detect anomalies</text>
            <text x="510" y="343" className="erd-c" fill="var(--text)">Route to sinks</text>

            {/* Arrow: Kafka → Flink */}
            <line x1="440" y1="280" x2="500" y2="280" className="df-flow" stroke="#8b5cf6" strokeWidth="2" />

            {/* S3 Iceberg */}
            <rect x="720" y="30" width="210" height="120" rx="10" fill="var(--bg)" stroke="#ec4899" strokeWidth="2" />
            <text x="825" y="55" textAnchor="middle" fontSize="11" fontWeight="700" fill="#9d174d">S3 Iceberg (1.5 PB/day)</text>
            <text x="730" y="75" className="erd-c" fill="var(--text)">Bronze: raw events</text>
            <text x="730" y="92" className="erd-c" fill="var(--text)">Silver: sessions, deduplicated</text>
            <text x="730" y="109" className="erd-c" fill="var(--text)">Gold: hourly aggregates</text>
            <text x="730" y="126" className="erd-c" fill="var(--text)">Features: ML training data</text>

            {/* Serving */}
            <rect x="720" y="180" width="210" height="120" rx="10" fill="var(--bg)" stroke="#06b6d4" strokeWidth="2" />
            <text x="825" y="205" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0891b2">Serving Layer</text>
            <text x="730" y="228" className="erd-c" fill="var(--text)">Pinot: real-time dashboards</text>
            <text x="730" y="245" className="erd-c" fill="var(--text)">Trino: ad-hoc SQL on lake</text>
            <text x="730" y="262" className="erd-c" fill="var(--text)">DynamoDB: online ML features</text>
            <text x="730" y="279" className="erd-c" fill="var(--text)">Redshift: BI / finance</text>
            <text x="730" y="296" className="erd-c" fill="var(--text)">Redis: real-time feature cache</text>

            {/* ML */}
            <rect x="720" y="320" width="210" height="50" rx="10" fill="var(--bg)" stroke="#8b5cf6" strokeWidth="1.5" />
            <text x="825" y="345" textAnchor="middle" fontSize="11" fontWeight="700" fill="#6d28d9">ML Models (Spark nightly)</text>
            <text x="730" y="362" className="erd-c" fill="var(--text)">Recommendations, artwork, ranking</text>

            {/* Arrow: Flink → S3 */}
            <line x1="660" y1="260" x2="720" y2="90" className="df-flow" stroke="#ec4899" strokeWidth="2" />
            {/* Arrow: Flink → Serving */}
            <line x1="660" y1="280" x2="720" y2="240" className="df-flow" stroke="#06b6d4" strokeWidth="2" />
            {/* Arrow: S3 → ML */}
            <line x1="825" y1="150" x2="825" y2="180" className="df-flow" stroke="#8b5cf6" strokeWidth="1.5" />
            <line x1="825" y1="300" x2="825" y2="320" className="df-flow" stroke="#8b5cf6" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="p-4 rounded-lg" style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)" }}>
          <p className="text-xs" style={{ color: "var(--text)" }}>
            <strong style={{ color: "var(--blue-text)" }}>Key insight:</strong> Operational tables serve the user in real-time (MySQL for auth/billing, Cassandra for watch history). Events from these same actions flow to Kafka in parallel. The pipeline never touches the operational DB directly — it only reads from Kafka + CDC.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
         4. INFRASTRUCTURE SIZING — EXPANDABLE CARDS
         ═══════════════════════════════════════════════════════ */}
      <div id="dp-infra"
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", scrollMarginTop: "80px" }}
      >
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Infrastructure Sizing
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Click any card to see the full calculation.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { id:"kafka-brokers", name:"Kafka Brokers", size:"~720", color:"#10b981",
              formula:"Peak ingest = 40 GB/s\n× Replication Factor 3 = 120 GB/s total write\n÷ 200 MB/s per broker = 600 brokers\n+ 20% headroom = ~720 brokers",
              assumptions:"Each broker: 32 vCPU, 128 GB RAM, 8× NVMe\nNetwork: 25 Gbps/broker\nSized for WRITE throughput (acks=all)" },
            { id:"kafka-clusters", name:"Kafka Clusters", size:"~40", color:"#10b981",
              formula:"720 brokers ÷ 18 brokers/cluster = 40\n\nSplit by:\n  • Region (us-east, eu-west, ap-south)\n  • Domain (playback, ui, billing, ads)\n  • Criticality (critical vs best-effort)",
              assumptions:"Blast radius: 1 cluster down = 1 domain in 1 region\nCritical clusters: dedicated capacity\nBest-effort: allow degradation" },
            { id:"flink", name:"Flink vCPUs", size:"~3,000", color:"#8b5cf6",
              formula:"15M events/s ÷ 5K events/vCPU = 3,000\n\nStateful operators with RocksDB.\nDeployed on EKS with autoscaling.",
              assumptions:"5K events/vCPU accounts for:\n  • Enrichment joins\n  • Deduplication (bloom filter)\n  • Sessionization\n  • Serialization overhead" },
            { id:"flink-state", name:"Flink State", size:"~20 TB", color:"#8b5cf6",
              formula:"Dedup: 72h × 8.1M/s × 16 bytes = ~3.5 TB\nSessions: 50M active × 4 KB = ~200 GB\nWindows: ~500 GB\nTotal with RF: ~20 TB",
              assumptions:"RocksDB on NVMe, checkpoint to S3 every 5m\nIncremental checkpoints\nTTL compaction for dedup" },
            { id:"s3", name:"S3 Storage", size:"1.5 PB/day", color:"#3b82f6",
              formula:"40 GB/s × 86,400s = 3.4 PB raw\nzstd compression 0.45 = ~1.5 PB/day\n\nBronze: all events (1.5 PB)\nSilver: deduplicated (~0.8 PB)\nGold: aggregates (~50 TB)",
              assumptions:"zstd level 3, Parquet columnar\nRetention: Bronze 90d, Silver 13mo, Gold forever" },
            { id:"pinot", name:"Apache Pinot", size:"~200 nodes", color:"#ec4899",
              formula:"Real-time from Kafka + offline from S3\nSub-100ms p99 at 50K dashboard QPS\n\nStar-tree index for pre-aggregation.",
              assumptions:"Recent on SSD, old on S3\nQueries: GROUP BY country, device, title" },
            { id:"spark", name:"Spark (EMR)", size:"~5K vCPUs burst", color:"#f59e0b",
              formula:"Silver→Gold nightly: 2000 vCPUs × 4h\nModel retraining: 1500 vCPUs × 6h\nCompaction: 500 vCPUs continuous\nBurst during 1-5 AM window.",
              assumptions:"Spot for batch (70% savings)\nOn-demand for compaction" },
            { id:"trino", name:"Trino Workers", size:"~300", color:"#06b6d4",
              formula:"~500 concurrent analyst queries\nEach worker: 32 vCPU, 256 GB RAM\nQueries Iceberg on S3 directly.",
              assumptions:"Baseline 100, burst to 300\nIceberg metadata caching" },
            { id:"schema", name:"Schema Registry", size:"3 nodes HA", color:"#6b7280",
              formula:"3-node cluster\n~10,000 schema versions\n~500 unique event types",
              assumptions:"Avro + Protobuf\nBackward/forward compat enforced" },
          ].map((item) => (
            <div key={item.id}>
              <button
                onClick={() => setExpandedCard(expandedCard === item.id ? null : item.id)}
                className="w-full text-left p-4 rounded-lg transition-all duration-200"
                style={{
                  background: "var(--bg)",
                  border: `1px solid var(--border)`,
                  borderLeft: `3px solid ${item.color}`,
                  cursor: "pointer",
                  boxShadow: expandedCard === item.id ? `0 4px 20px ${item.color}20` : "none",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{item.name}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ background: `${item.color}15`, color: item.color }}>
                    {item.size}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] flex-1 truncate" style={{ color: "var(--text-faint)" }}>{item.formula.split('\n')[0]}</span>
                  <span className="text-[10px] transition-transform duration-200 shrink-0" style={{ color: item.color, display: "inline-block", transform: expandedCard === item.id ? "rotate(90deg)" : "rotate(0deg)" }}>&rsaquo;</span>
                </div>
              </button>
              {expandedCard === item.id && (
                <div className="mt-2 rounded-lg p-4 text-xs space-y-3" style={{ background: "var(--bg)", border: `1px solid ${item.color}40` }}>
                  <div>
                    <span className="font-bold block mb-1" style={{ color: item.color }}>Calculation</span>
                    <pre className="whitespace-pre-wrap font-mono leading-relaxed" style={{ color: "var(--text)" }}>{item.formula}</pre>
                  </div>
                  <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <span className="font-bold block mb-1" style={{ color: "var(--text-muted)" }}>Assumptions</span>
                    <pre className="whitespace-pre-wrap font-mono leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.assumptions}</pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
         5. KAFKA DETAILS
         ═══════════════════════════════════════════════════════ */}
      <div id="dp-kafka"
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", scrollMarginTop: "80px" }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
          Kafka Strategy
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Topic Naming</h3>
            <CodeBlock code={`prod.playback.started.v3
prod.playback.heartbeat.v5
prod.playback.error.v4
prod.playback.error.v4.dlq       ← dead letter
prod.ui.impression.v7
prod.subscription.created.v6
prod.experiment.assignment.v3`} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Partition Keys</h3>
            <CodeBlock code={`Playback events → playback_id
UI activity     → profile_id
Billing events  → account_id
Catalog updates → content_id
Ad events       → ad_break_id

NEVER partition by content_id alone
→ popular title = hot partition`} />
          </div>
        </div>
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Reliability Config</h3>
          <CodeBlock language="properties" code={`replication.factor=3
min.insync.replicas=2
acks=all
enable.idempotence=true
unclean.leader.election.enable=false
enable.auto.commit=false
isolation.level=read_committed`} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
         6. FLINK PROCESSING
         ═══════════════════════════════════════════════════════ */}
      <div id="dp-flink"
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", scrollMarginTop: "80px" }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
          Flink Processing Pipeline
        </h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {["Kafka source","Deserialize","Validate","Deduplicate","Enrich","Sessionize","Aggregate","Quality check","Multi-sink"].map((step, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="px-2.5 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--blue-text)" }}>
                {i + 1}. {step}
              </span>
              {i < 8 && <span style={{ color: "var(--text-faint)" }}>&rarr;</span>}
            </div>
          ))}
        </div>

        <CodeBlock language="java" code={`// Playback QoE Job — the most important Flink job
Input:  playback_started, heartbeat, buffering, error, completed
Key:    playback_id
Output: session summary with QoE metrics

Computes per session:
  startup_time_ms, buffering_ratio, avg_bitrate_kbps,
  bitrate_switch_count, completion_pct, exit_reason

Sinks to:
  1. Kafka → playback.session.completed
  2. Pinot → real-time dashboard
  3. Iceberg → silver.playback_session
  4. Alert stream → anomaly detection`} />
      </div>

      {/* ═══════════════════════════════════════════════════════
         7. LAKEHOUSE (COLLAPSIBLE)
         ═══════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <button
          onClick={() => setShowLakehouse(!showLakehouse)}
          className="w-full flex items-center justify-between p-6"
          style={{ cursor: "pointer" }}
        >
          <div>
            <h2 className="text-xl font-bold text-left" style={{ color: "var(--text)" }}>
              S3 Lakehouse — Bronze / Silver / Gold
            </h2>
            <p className="text-sm text-left mt-1" style={{ color: "var(--text-muted)" }}>
              Analytics storage zones (downstream from operational tables)
            </p>
          </div>
          <span className="text-lg transition-transform duration-200" style={{ color: "var(--text-muted)", transform: showLakehouse ? "rotate(180deg)" : "rotate(0deg)" }}>&#9660;</span>
        </button>

        {showLakehouse && (
          <div className="px-6 pb-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg" style={{ background: "var(--bg)", border: "2px solid #d97706" }}>
                <h4 className="font-bold text-sm mb-2" style={{ color: "#d97706" }}>Bronze (Raw)</h4>
                <ul className="text-xs space-y-1" style={{ color: "var(--text)" }}>
                  <li>Append-only, source-faithful</li>
                  <li>Includes dupes + raw PII</li>
                  <li>For replay &amp; audit</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "var(--bg)", border: "2px solid #6b7280" }}>
                <h4 className="font-bold text-sm mb-2" style={{ color: "#6b7280" }}>Silver (Clean)</h4>
                <ul className="text-xs space-y-1" style={{ color: "var(--text)" }}>
                  <li>Deduplicated, PII tokenized</li>
                  <li>Enriched + sessionized</li>
                  <li>Most analytics consume this</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "var(--bg)", border: "2px solid #fbbf24" }}>
                <h4 className="font-bold text-sm mb-2" style={{ color: "#d97706" }}>Gold (Business)</h4>
                <ul className="text-xs space-y-1" style={{ color: "var(--text)" }}>
                  <li>Pre-aggregated hourly/daily</li>
                  <li>Revenue, QoE, engagement</li>
                  <li>Always derived from Silver</li>
                </ul>
              </div>
            </div>

            <CodeBlock code={`s3://netflix-bronze/   → 1.5 PB/day, 90 day retention
s3://netflix-silver/   → ~0.8 PB/day, 13 month retention
s3://netflix-gold/     → ~50 TB/day, indefinite
s3://netflix-features/ → ML training features
s3://netflix-quarantine/ → bad data for investigation`} />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
         8. SERVING LAYER
         ═══════════════════════════════════════════════════════ */}
      <div id="dp-serving"
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", scrollMarginTop: "80px" }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
          Serving Layer
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th className="text-left py-3 px-4" style={{ color: "var(--text-muted)" }}>Workload</th>
                <th className="text-left py-3 px-4" style={{ color: "var(--text-muted)" }}>System</th>
                <th className="text-left py-3 px-4" style={{ color: "var(--text-muted)" }}>Latency</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Real-time dashboards", "Apache Pinot", "<100ms"],
                ["Ad-hoc SQL on lake", "Trino", "2-30s"],
                ["Governed BI / finance", "Redshift", "<2s"],
                ["Online ML features", "DynamoDB + Redis", "<5ms"],
                ["Text/log search", "OpenSearch", "<500ms"],
                ["Long-term truth", "S3 + Iceberg", "N/A"],
              ].map(([w, s, l], i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-3 px-4" style={{ color: "var(--text)" }}>{w}</td>
                  <td className="py-3 px-4 font-mono font-bold" style={{ color: "var(--blue-text)" }}>{s}</td>
                  <td className="py-3 px-4 font-mono" style={{ color: "var(--text-muted)" }}>{l}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
         9. ML RECOMMENDATION FLOW
         ═══════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
          Recommendation Flow
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            "User opens Netflix",
            "Rec service requests candidates",
            "Online features from DynamoDB/Redis (<5ms)",
            "Two-tower model scores candidates",
            "Contextual bandit re-ranks rows",
            "Personalized artwork selected",
            "Homepage returned",
            "Impression + click events → Kafka",
            "Flink updates real-time features (1 min)",
            "Events written to Iceberg for training",
            "Nightly Spark retrains models",
            "Kayenta canary → full rollout",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-2 rounded-lg text-xs" style={{ color: "var(--text)" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: "#ede9fe", color: "#6d28d9" }}>{i + 1}</span>
              <span className="leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INTERVIEW Q&A TAB
   ═══════════════════════════════════════════════════════════════ */
function InterviewTab() {
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [showOnlyBookmarked, setShowOnlyBookmarked] = useState(false);

  const toggleBookmark = (id: number) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allQAs = useMemo(
    () => [
      { label: "Architecture (Q1-25)", items: QA_ARCHITECTURE },
      { label: "Pipeline (Q26-50)", items: QA_PIPELINE },
      { label: "Reliability (Q51-60)", items: QA_RELIABILITY },
    ],
    []
  );

  const filteredSections = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allQAs
      .map((section) => ({
        ...section,
        items: section.items.filter((qa) => {
          const matchesSearch = !q || qa.q.toLowerCase().includes(q) || qa.a.toLowerCase().includes(q);
          const matchesBookmark = !showOnlyBookmarked || bookmarkedIds.has(qa.id);
          return matchesSearch && matchesBookmark;
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [search, allQAs, showOnlyBookmarked, bookmarkedIds]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div
        className="rounded-xl p-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <input
          type="text"
          placeholder="Search questions and answers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-lg text-sm outline-none"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
        <div className="flex items-center gap-3 mt-2">
          <p className="text-xs flex-1" style={{ color: "var(--text-faint)" }}>
            {QA_ARCHITECTURE.length + QA_PIPELINE.length + QA_RELIABILITY.length} total questions
          </p>
          <button
            onClick={() => setShowOnlyBookmarked(!showOnlyBookmarked)}
            className="text-xs px-3 py-1 rounded-lg"
            style={{
              background: showOnlyBookmarked ? "#fef3c7" : "var(--bg)",
              color: showOnlyBookmarked ? "#92400e" : "var(--text-muted)",
              border: `1px solid ${showOnlyBookmarked ? "#f59e0b" : "var(--border)"}`,
              cursor: "pointer",
            }}
          >
            {showOnlyBookmarked ? "★ Bookmarked" : "☆ Show Bookmarked"}
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => setExpandedIds(new Set(
            [...QA_ARCHITECTURE, ...QA_PIPELINE, ...QA_RELIABILITY].map(q => q.id)
          ))} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--blue-soft)", color: "var(--blue-text)", cursor: "pointer", border: "none" }}>
            Expand All
          </button>
          <button onClick={() => setExpandedIds(new Set())} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>
            Collapse All
          </button>
        </div>
      </div>

      {/* Sections */}
      {filteredSections.map((section) => (
        <div key={section.label}>
          <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
            {section.label}
          </h2>
          <div className="space-y-2">
            {section.items.map((qa) => (
              <QAAccordion
                key={qa.id}
                qa={qa}
                isExpanded={expandedIds.has(qa.id)}
                onToggle={() => toggleExpand(qa.id)}
                isBookmarked={bookmarkedIds.has(qa.id)}
                onToggleBookmark={() => toggleBookmark(qa.id)}
                sectionLabel={search.trim() !== "" ? section.label : undefined}
              />
            ))}
          </div>
        </div>
      ))}

      {filteredSections.length === 0 && (
        <p className="text-center py-12" style={{ color: "var(--text-faint)" }}>
          No questions match your search.
        </p>
      )}
    </div>
  );
}

function QAAccordion({
  qa,
  isExpanded,
  onToggle,
  isBookmarked,
  onToggleBookmark,
  sectionLabel,
}: {
  qa: QA;
  isExpanded: boolean;
  onToggle: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  sectionLabel?: string;
}) {
  return (
    <div
      className="rounded-lg overflow-hidden transition-all duration-200"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:opacity-80 transition-opacity"
        style={{ cursor: "pointer" }}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onToggle()}
      >
        <span
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}
        >
          {qa.id}
        </span>
        <div className="flex-1 min-w-0">
          {sectionLabel && (
            <span className="text-[10px] px-2 py-0.5 rounded-full mr-2 font-medium" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>
              {sectionLabel}
            </span>
          )}
          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
            {qa.q}
          </span>
        </div>
        {onToggleBookmark && (
          <span
            onClick={(e) => { e.stopPropagation(); onToggleBookmark(); }}
            className="shrink-0 text-sm px-1"
            style={{ color: isBookmarked ? "#f59e0b" : "var(--text-faint)", cursor: "pointer" }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") onToggleBookmark(); }}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark question"}
          >
            {isBookmarked ? "★" : "☆"}
          </span>
        )}
        <span
          className="shrink-0 text-xs transition-transform duration-200"
          style={{
            color: "var(--text-muted)",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          &#9660;
        </span>
      </div>
      {isExpanded && (
        <div className="px-5 pb-5 pt-0">
          <div
            className="h-px mb-4"
            style={{ background: "var(--border)" }}
          />
          <div
            className="pl-11 text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--text-muted)" }}
          >
            {qa.a}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DB DECISION TREE VISUAL COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function DbDecisionTree() {
  const nodes = [
    { q: "Need ACID transactions + money ops?", yes: "MySQL / PostgreSQL\n(RDS Multi-AZ)", color: "#f59e0b" },
    { q: "High write throughput + eventual consistency ok?", yes: "Cassandra\n(partition by access pattern)", color: "#10b981" },
    { q: "Sub-ms latency + TTL + atomic Lua?", yes: "Redis\n(Lua scripts, sorted sets)", color: "#ec4899" },
    { q: "Hot reads, multi-AZ, simple KV?", yes: "EVCache / Memcached\n(30M req/s, sub-ms)", color: "#3b82f6" },
    { q: "Full-text search / log retrieval?", yes: "Elasticsearch\n(BM25 + kNN)", color: "#8b5cf6" },
    { q: "Ad-hoc SQL on petabytes?", yes: "Trino\n(query Iceberg directly)", color: "#06b6d4" },
    { q: "Real-time OLAP dashboard (<100ms)?", yes: "Apache Pinot\n(star-tree index)", color: "#f97316" },
    { q: "Online ML features (<5ms)?", yes: "DynamoDB + Redis\n(feature store)", color: "#6d28d9" },
    { q: "Long-term analytical truth?", yes: "S3 + Iceberg\n(Bronze/Silver/Gold)", color: "#065f46" },
  ];

  return (
    <div className="space-y-2">
      {nodes.map((node, i) => (
        <div key={i} className="flex items-stretch gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full mt-3" style={{ background: node.color }} />
            {i < nodes.length - 1 && <div className="w-px flex-1 my-1" style={{ background: "var(--border)" }} />}
          </div>
          <div className="flex-1 flex flex-col sm:flex-row gap-2 pb-2">
            <div className="flex-1 p-3 rounded-lg text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              {node.q}
            </div>
            <div className="sm:w-52 p-3 rounded-lg text-sm font-mono font-bold whitespace-pre-line" style={{ background: `${node.color}15`, border: `1px solid ${node.color}40`, color: node.color }}>
              {node.yes}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CHEAT SHEET TAB
   ═══════════════════════════════════════════════════════════════ */
function CheatSheetTab() {
  return (
    <div className="space-y-10">
      {/* Critical Numbers */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
          Critical Numbers
        </h2>
        <CodeBlockWithCopy code={CHEAT_SHEET.criticalNumbers} />
      </div>

      {/* DB Decision Tree */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
          Database Decision Tree
        </h2>
        <DbDecisionTree />
      </div>

      {/* Kafka Config */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
          Kafka Zero-Loss Configuration
        </h2>
        <CodeBlockWithCopy code={CHEAT_SHEET.kafkaConfig} language="properties" />
      </div>

      {/* Iceberg Partition Rules */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
          Iceberg Partition Rules
        </h2>
        <CodeBlockWithCopy code={CHEAT_SHEET.icebergPartition} />
      </div>

      {/* Fallback Matrix */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Fallback Matrix (Resilience4j / Hystrix)
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--text-faint)" }}>
          Hystrix is in maintenance mode. Netflix&apos;s modern services use Resilience4j for circuit breaking. The pattern is identical — the fallback behavior below applies to both.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th className="text-left py-3 px-4" style={{ color: "var(--text-muted)" }}>Service Failure</th>
                <th className="text-left py-3 px-4" style={{ color: "var(--text-muted)" }}>Fallback Behavior</th>
              </tr>
            </thead>
            <tbody>
              {CHEAT_SHEET.fallbackMatrix.map((row, i) => (
                <tr key={i} style={{ borderBottom: i < CHEAT_SHEET.fallbackMatrix.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td className="py-3 px-4 font-medium" style={{ color: "var(--text)" }}>
                    {row.service}
                  </td>
                  <td className="py-3 px-4" style={{ color: "var(--text-muted)" }}>
                    {row.fallback}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interview Phrases */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-xl font-bold mb-5" style={{ color: "var(--text)" }}>
          Interview Power Phrases
        </h2>
        <div className="space-y-3">
          {CHEAT_SHEET.interviewPhrases.map((phrase, i) => (
            <div
              key={i}
              className="flex gap-3 p-4 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <span
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}
              >
                {i + 1}
              </span>
              <p className="text-sm italic leading-relaxed" style={{ color: "var(--text)" }}>
                &ldquo;{phrase}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   DB TABLES VIEW — renders CREATE TABLE SQL as visual column table
   ═══════════════════════════════════════════════════════════════ */
function DbTablesView({ raw }: { raw: string }) {
  const tables: { name: string; db: string; columns: { col: string; type: string }[] }[] = [];
  let currentDb = "";

  const lines = raw.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("--") && !line.startsWith("-- Redis") && !line.startsWith("-- watch") && !line.startsWith("-- Cassandra: recommendations")) {
      const dbMatch = line.match(/--\s*(.+)/);
      if (dbMatch) currentDb = dbMatch[1].replace(/[:\s]+$/, "");
    }

    if (line.startsWith("CREATE TABLE")) {
      const nameMatch = line.match(/CREATE TABLE\s+(\w+)/);
      if (nameMatch) {
        const tbl: { name: string; db: string; columns: { col: string; type: string }[] } = {
          name: nameMatch[1],
          db: currentDb,
          columns: [],
        };
        for (let j = i + 1; j < lines.length; j++) {
          const cl = lines[j].trim();
          if (cl === ");" || cl === ")" || cl.startsWith(");")) break;
          if (cl.startsWith("INDEX") || cl.startsWith("FOREIGN") || cl.startsWith("UNIQUE") || cl.startsWith("PRIMARY") || cl === "") continue;
          const parts = cl.replace(/,\s*$/, "").replace(/--.*$/, "").trim().split(/\s+/);
          if (parts.length >= 2 && !parts[0].startsWith("(")) {
            tbl.columns.push({ col: parts[0], type: parts.slice(1).join(" ") });
          }
        }
        tables.push(tbl);
      }
    }

    if (line.startsWith("PRIMARY KEY") && line.includes("((")) {
      const prevComment = lines.slice(Math.max(0, i - 3), i).find(l => l.trim().startsWith("--"));
      const tblName = prevComment?.match(/--\s*(\w+)\s+table/)?.[1] || "table";
      const tbl: { name: string; db: string; columns: { col: string; type: string }[] } = {
        name: tblName,
        db: currentDb || "Cassandra",
        columns: [],
      };
      for (let j = i + 1; j < lines.length; j++) {
        const cl = lines[j].trim();
        if (cl === "" || cl.startsWith("--") || cl.startsWith("CREATE") || cl.startsWith("PRIMARY")) break;
        const parts = cl.split(/\s+/);
        if (parts.length >= 2) {
          tbl.columns.push({ col: parts[0], type: parts.slice(1).join(" ") });
        }
      }
      if (tbl.columns.length > 0) tables.push(tbl);
    }
  }

  const redisLines = lines.filter(l => l.trim().startsWith("--") && (l.includes("→") || l.includes("TTL")));

  if (tables.length === 0) {
    return <CodeBlockWithCopy code={raw} language="sql" />;
  }

  return (
    <div className="space-y-4">
      {tables.map((tbl, idx) => (
        <div key={idx} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "var(--blue-soft)", borderBottom: "1px solid var(--border)" }}>
            <span className="text-sm font-bold" style={{ color: "var(--blue-text)" }}>{tbl.name}</span>
            {tbl.db && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg)", color: "var(--text-faint)" }}>{tbl.db}</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 px-4 font-medium" style={{ color: "var(--text-muted)" }}>Column</th>
                  <th className="text-left py-2 px-4 font-medium" style={{ color: "var(--text-muted)" }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {tbl.columns.map((c, ci) => (
                  <tr key={ci} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-1.5 px-4 font-mono" style={{ color: "var(--text)" }}>{c.col}</td>
                    <td className="py-1.5 px-4 font-mono" style={{ color: "var(--text-muted)" }}>{c.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {redisLines.length > 0 && (
        <div className="rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <span className="text-xs font-bold block mb-2" style={{ color: "var(--text-muted)" }}>Redis Key Patterns</span>
          {redisLines.map((line, i) => (
            <p key={i} className="text-xs font-mono leading-relaxed" style={{ color: "var(--text)" }}>{line.replace(/^--\s*/, "")}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="relative rounded-lg overflow-hidden" style={{ background: "#1a1b26" }}>
      {language && (
        <div className="absolute top-2 right-3 text-[10px] px-2 py-0.5 rounded" style={{ background: "#2a2b3d", color: "#7a7b8e" }}>
          {language}
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-xs leading-relaxed">
        <code style={{ color: "#a9b1d6" }}>{code}</code>
      </pre>
    </div>
  );
}

function CodeBlockWithCopy({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ background: "#1a1b26" }}>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-3 px-3 py-1 rounded text-[11px] font-medium transition-colors z-10"
        style={{
          background: copied ? "#22c55e" : "#2a2b3d",
          color: copied ? "#fff" : "#a9b1d6",
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      {language && (
        <div className="absolute top-2 left-3 text-[10px] px-2 py-0.5 rounded" style={{ background: "#2a2b3d", color: "#7a7b8e" }}>
          {language}
        </div>
      )}
      <pre className="p-4 pt-5 overflow-x-auto text-xs leading-relaxed">
        <code style={{ color: "#a9b1d6" }}>{code}</code>
      </pre>
    </div>
  );
}

