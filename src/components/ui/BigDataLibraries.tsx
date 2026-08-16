"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

function hexToRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

// ─── Data ───────────────────────────────────────────────────

const COMPANIES = [
  { id: "netflix",    label: "Netflix",    emoji: "📺", logo: "/logo-netflix.webp",    tagline: "Streaming at 250M+ scale",             color: "#e50914", href: "/system-design/netflix" },
  { id: "uber",       label: "Uber",       emoji: "🚗", logo: "/logo-uber.png",         tagline: "Real-time ride & delivery matching",    color: "#276EF1", href: "/system-design/uber/start-here" },
  { id: "youtube",    label: "YouTube",    emoji: "▶️", logo: "/logo-youtube.webp",    tagline: "Video at 2B+ users, 500h/min upload",  color: "#ff0000" },
  { id: "whatsapp",   label: "WhatsApp",   emoji: "💬", logo: "/logo-whatsapp.png",    tagline: "100B+ messages per day",               color: "#25D366" },
  { id: "swiggy",     label: "Swiggy",     emoji: "🍕", logo: "/logo-swiggy.png",      tagline: "Food delivery at milliseconds",        color: "#FC8019" },
  { id: "makemytrip", label: "MakeMyTrip", emoji: "✈️", logo: "/logo-makemytrip.png", tagline: "Travel booking under peak demand",    color: "#006DB7" },
  { id: "bookmyshow", label: "BookMyShow", emoji: "🎟️", logo: "/logo-bookmyshow.jpg", tagline: "Ticketing system under flash sales",  color: "#c0392b" },
];

const DATA_ARCHS = [
  { id: "batch",         label: "Batch Pipeline",     emoji: "⚙️",  tagline: "Scheduled bulk processing at scale",        color: "#3b82f6" },
  { id: "streaming",     label: "Streaming Pipeline", emoji: "🌊",  tagline: "Real-time Kafka + Flink event flows",        color: "#10b981" },
  { id: "lakehouse",     label: "Lakehouse",          emoji: "🏠",  tagline: "Delta / Iceberg unified storage layer",      color: "#8b5cf6" },
  { id: "warehouse",     label: "Warehouse",          emoji: "🏭",  tagline: "Redshift / Snowflake OLAP patterns",         color: "#f59e0b" },
  { id: "governance",    label: "Governance",         emoji: "🛡️",  tagline: "Data quality, lineage & cataloging",        color: "#06b6d4" },
  { id: "observability", label: "Observability",      emoji: "👁️",  tagline: "Pipeline monitoring, alerting & tracing",   color: "#ef4444" },
];

const PIPELINE_STEPS = [
  { id: "source",     label: "Source",     emoji: "🗃️", tagline: "DBs · APIs · Events",    color: "#3b82f6" },
  { id: "ingestion",  label: "Ingestion",  emoji: "📥", tagline: "Debezium · Kafka · DMS",  color: "#8b5cf6" },
  { id: "processing", label: "Processing", emoji: "⚙️", tagline: "Flink · Spark · dbt",    color: "#10b981" },
  { id: "storage",    label: "Storage",    emoji: "💾", tagline: "S3 · GCS · HDFS",         color: "#f59e0b" },
  { id: "serving",    label: "Serving",    emoji: "📊", tagline: "Warehouse · BI · APIs",   color: "#ef4444" },
];

type Item = { id: string; label: string; emoji: string; logo?: string; tagline: string; color: string; href?: string };

// ─── Placeholder Modal ──────────────────────────────────────

function PlaceholderModal({ item, section, isDark, onClose }: {
  item: Item; section: string; isDark: boolean; onClose: () => void;
}) {
  const [panelIn, setPanelIn] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setPanelIn(true)));
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const rgb = hexToRgb(item.color);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: isDark ? "rgba(0,0,0,0.88)" : "rgba(15,23,42,0.72)",
        backdropFilter: "blur(12px)",
        opacity: panelIn ? 1 : 0,
        transition: "opacity 0.22s ease",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative rounded-2xl overflow-hidden w-full max-w-md"
        style={{
          background: isDark ? "#09090f" : "var(--bg-card)",
          border: `1px solid rgba(${rgb},0.3)`,
          boxShadow: isDark
            ? `0 0 80px rgba(${rgb},0.12), 0 40px 80px rgba(0,0,0,0.9)`
            : "0 40px 80px rgba(0,0,0,0.2)",
          transform: panelIn ? "scale(1) translateY(0)" : "scale(0.88) translateY(30px)",
          transition: "transform 0.42s cubic-bezier(0.34,1.5,0.64,1)",
        }}
      >
        <div className="h-1" style={{ background: `linear-gradient(90deg,${item.color},transparent)` }} />

        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center text-2xl shrink-0"
                style={{ background: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.25)` }}>
                {item.logo
                  ? <Image src={item.logo} alt={item.label} width={48} height={48} className="w-full h-full object-contain" />
                  : item.emoji}
              </div>
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold block mb-1"
                  style={{ background: `rgba(${rgb},0.12)`, color: item.color }}>{section}</span>
                <h3 className="text-base font-bold leading-tight" style={{ color: "var(--text)" }}>{item.label}</h3>
              </div>
            </div>
            <button onClick={onClose} className="text-xs px-2 py-1 rounded-md shrink-0"
              style={{ color: "var(--text-muted)", background: "var(--bg-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
              ✕
            </button>
          </div>

          <p className="text-sm mb-5" style={{ color: "var(--text-muted)", lineHeight: 1.65 }}>{item.tagline}</p>

          <div className="rounded-xl p-5 text-center"
            style={{ background: `rgba(${rgb},0.06)`, border: `1px dashed rgba(${rgb},0.3)` }}>
            <div className="text-3xl mb-3">🚧</div>
            <p className="text-sm font-semibold mb-2" style={{ color: item.color }}>Content Coming Soon</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-faint)" }}>
              Full {section.toLowerCase()} deep-dive for <strong style={{ color: "var(--text-muted)" }}>{item.label}</strong> will be added here —
              architecture diagrams, design decisions, and interview prep.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Library Card ───────────────────────────────────────────

function LibraryCard({ item, isDark, onClick }: {
  item: Item; isDark: boolean; onClick: () => void;
}) {
  const rgb = hexToRgb(item.color);
  const sharedProps = {
    className: "group block w-full text-left rounded-xl p-4 transition-all duration-200",
    style: {
      background: isDark ? `rgba(${rgb},0.05)` : `rgba(${rgb},0.04)`,
      border: `1px solid ${isDark ? `rgba(${rgb},0.14)` : `rgba(${rgb},0.18)`}`,
      cursor: "pointer",
      boxShadow: "none",
      transform: "translateY(0)",
    } as React.CSSProperties,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      const el = e.currentTarget as HTMLElement;
      el.style.background = isDark ? `rgba(${rgb},0.1)` : `rgba(${rgb},0.08)`;
      el.style.borderColor = `rgba(${rgb},0.4)`;
      el.style.transform = "translateY(-2px)";
      el.style.boxShadow = isDark ? `0 8px 24px rgba(${rgb},0.16)` : `0 4px 16px rgba(${rgb},0.12)`;
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      const el = e.currentTarget as HTMLElement;
      el.style.background = isDark ? `rgba(${rgb},0.05)` : `rgba(${rgb},0.04)`;
      el.style.borderColor = isDark ? `rgba(${rgb},0.14)` : `rgba(${rgb},0.18)`;
      el.style.transform = "translateY(0)";
      el.style.boxShadow = "none";
    },
  };

  const content = (
    <>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 shrink-0 rounded-lg overflow-hidden flex items-center justify-center text-lg"
          style={{ background: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.22)` }}>
          {item.logo
            ? <Image src={item.logo} alt={item.label} width={36} height={36} className="w-full h-full object-contain" />
            : item.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>{item.label}</span>
            <span className="text-[10px] font-medium shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: item.color }}>Open →</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.tagline}</p>
        </div>
      </div>
      <div className="mt-3 h-px w-0 group-hover:w-full transition-all duration-300 rounded-full"
        style={{ background: `linear-gradient(90deg,${item.color},transparent)` }} />
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} {...sharedProps}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} {...sharedProps}>
      {content}
    </button>
  );
}

// ─── Section Header ─────────────────────────────────────────

function SectionHeader({ emoji, title, badge }: { emoji: string; title: string; badge: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xl">{emoji}</span>
      <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>{title}</h2>
      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>
        {badge}
      </span>
    </div>
  );
}

// ─── Pipeline Flow ──────────────────────────────────────────

function PipelineFlow({ isDark, onStepClick }: { isDark: boolean; onStepClick: (item: Item) => void }) {
  return (
    <div>
      <div className="flex items-stretch gap-0 overflow-x-auto">
        {PIPELINE_STEPS.map((step, i) => {
          const rgb = hexToRgb(step.color);
          const isLast = i === PIPELINE_STEPS.length - 1;
          return (
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => onStepClick(step)}
                className="group flex-1 min-w-[110px] rounded-xl p-4 text-center transition-all duration-200"
                style={{
                  background: isDark ? `rgba(${rgb},0.06)` : `rgba(${rgb},0.05)`,
                  border: `1px solid rgba(${rgb},0.2)`,
                  cursor: "pointer",
                  transform: "translateY(0)",
                  boxShadow: "none",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = isDark ? `rgba(${rgb},0.13)` : `rgba(${rgb},0.1)`;
                  el.style.borderColor = `rgba(${rgb},0.45)`;
                  el.style.transform = "translateY(-3px)";
                  el.style.boxShadow = isDark ? `0 10px 28px rgba(${rgb},0.22)` : `0 4px 16px rgba(${rgb},0.15)`;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = isDark ? `rgba(${rgb},0.06)` : `rgba(${rgb},0.05)`;
                  el.style.borderColor = `rgba(${rgb},0.2)`;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "none";
                }}
              >
                <div className="w-10 h-10 mx-auto mb-2.5 rounded-lg flex items-center justify-center text-xl"
                  style={{ background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.28)` }}>
                  {step.emoji}
                </div>
                <p className="text-sm font-bold mb-1" style={{ color: step.color }}>{step.label}</p>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{step.tagline}</p>
                <p className="mt-2 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: step.color }}>Click to explore →</p>
              </button>

              {!isLast && (
                <div className="w-7 shrink-0 flex items-center justify-center">
                  <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
                    <path d="M0 7 L17 7 M13 3 L19 7 L13 11"
                      stroke={isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)"}
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-1.5 flex-wrap">
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>End-to-end:</span>
        {PIPELINE_STEPS.map((s, i) => (
          <span key={s.id} className="flex items-center gap-1 text-xs">
            <span style={{ color: s.color }}>{s.label}</span>
            {i < PIPELINE_STEPS.length - 1 && (
              <span style={{ color: "var(--text-faint)" }}>→</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Export ────────────────────────────────────────────

export default function BigDataLibraries() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<{ item: Item; section: string } | null>(null);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);
  const isDark = !mounted || resolvedTheme === "dark";

  const handleCardClick = (item: Item, section: string) => {
    if (item.id === "netflix") {
      router.push("/system-design/netflix");
    } else if (item.id === "uber") {
      router.push("/system-design/uber/start-here");
    } else {
      setActive({ item, section });
    }
  };

  return (
    <div className="space-y-14">

      {/* ── System Design Library ─────────────────────── */}
      <div>
        <SectionHeader emoji="🏗️" title="System Design Library" badge="7 companies" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {COMPANIES.map(c => (
            <LibraryCard key={c.id} item={c} isDark={isDark}
              onClick={() => handleCardClick(c, "System Design")} />
          ))}
        </div>
      </div>

      {/* ── Data Architecture Library ─────────────────── */}
      <div>
        <SectionHeader emoji="🏛️" title="Data Architecture Library" badge="6 patterns" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DATA_ARCHS.map(a => (
            <LibraryCard key={a.id} item={a} isDark={isDark}
              onClick={() => handleCardClick(a, "Data Architecture")} />
          ))}
        </div>
      </div>

      {/* ── Pipeline Flow ──────────────────────────────── */}
      <div>
        <SectionHeader emoji="🔄" title="Pipeline Flow" badge="5 stages" />
        <div className="rounded-2xl p-5"
          style={{
            background: isDark ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.018)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
          }}>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            End-to-end data flow — click any stage for a deep-dive
          </p>
          <PipelineFlow isDark={isDark} onStepClick={item => handleCardClick(item, "Pipeline Flow")} />
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────── */}
      {active && (
        <PlaceholderModal
          item={active.item}
          section={active.section}
          isDark={isDark}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}
