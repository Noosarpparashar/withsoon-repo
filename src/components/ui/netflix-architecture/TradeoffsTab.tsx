"use client";

import { useState, useRef, useEffect } from "react";
import {
  CAP_ROWS, DB_ROWS, PUSH_PULL_ROWS, MICROSERVICES_BENEFITS, MICROSERVICES_COSTS,
} from "./tradeoffs-data";
import { C } from "./constants";

const SECTIONS = [
  { id: "cap",          label: "CAP Theorem",        readMin: 2 },
  { id: "databases",    label: "Database Comparison", readMin: 3 },
  { id: "pushpull",     label: "Push vs Pull",        readMin: 1 },
  { id: "microservices",label: "Microservices",       readMin: 2 },
];
const TOTAL_MIN = SECTIONS.reduce((a, s) => a + s.readMin, 0);

function SectionAnchor({ id }: { id: string }) {
  return <div id={`tradeoffs-${id}`} style={{ scrollMarginTop: 72 }} />;
}

// ── Reading progress bar ───────────────────────────────────────────────────────
function ReadingBar({ pct }: { pct: number }) {
  return (
    <div className="absolute top-0 left-0 right-0 h-0.5 z-20" style={{ background: "var(--border)" }}>
      <div className="h-full transition-all duration-100" style={{ width: `${pct}%`, background: C.red }} />
    </div>
  );
}

// ── Collapsible section ────────────────────────────────────────────────────────
function Section({ id, title, readMin, interviewMode, children }: {
  id: string; title: string; readMin: number; interviewMode: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section>
      <SectionAnchor id={id} />
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between mb-3 group">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>{title}</h2>
          {interviewMode && (
            <span className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: C.green + "18", color: C.green, border: `1px solid ${C.green}30` }}>
              Interview tips visible
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>{readMin} min</span>
          <span className="text-xs transition-transform duration-200"
            style={{ color: "var(--text-muted)", display: "inline-block", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}>
            ▾
          </span>
        </div>
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}

// ── CAP section ────────────────────────────────────────────────────────────────
function CAPSection({ interviewMode }: { interviewMode: boolean }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid var(--border)` }}>
        <div className="grid grid-cols-3 px-3 py-2"
          style={{ background: "var(--bg-muted)", borderBottom: `1px solid var(--border)` }}>
          {["Service", "CAP Choice", "Reasoning"].map(h => (
            <span key={h} className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{h}</span>
          ))}
        </div>
        {CAP_ROWS.map((row, i) => (
          <div key={i} className="grid grid-cols-3 px-3 py-3 gap-2"
            style={{ borderBottom: i < CAP_ROWS.length - 1 ? `1px solid var(--border)` : undefined }}>
            <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{row.service}</span>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{
                  background: row.choice === "CP" ? "#3b82f618" : row.choice === "AP*" ? C.amber + "18" : C.green + "18",
                  color: row.choice === "CP" ? "#3b82f6" : row.choice === "AP*" ? C.amber : C.green,
                  border: `1px solid ${row.choice === "CP" ? "#3b82f630" : row.choice === "AP*" ? C.amber + "30" : C.green + "30"}`,
                }}>
                {row.choiceLabel}
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: interviewMode ? "var(--text-muted)" : "var(--text-muted)" }}>
              {interviewMode ? row.businessJustification : row.reasoning}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-lg p-3" style={{ background: "rgba(245,166,35,0.06)", border: `1px solid ${C.amber}25` }}>
        <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: C.amber }}>Interview Script</p>
        <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          &ldquo;I&apos;ll choose CP for Auth and Billing because incorrect billing is legal liability and invalid sessions are security vulnerabilities. Everything else is AP: watch history (30s stale resume is invisible), recommendations (6h stale rows beat a blank homepage), CDN (must stream even if manifest is stale).&rdquo;
        </p>
      </div>
    </div>
  );
}

// ── Database comparison (two-column ComparisonCard) ───────────────────────────
function ComparisonCard({ a, b }: { a: { label: string; value: string; color: string }; b: { label: string; value: string; color: string } }) {
  return (
    <div className="grid grid-cols-2 gap-px rounded-lg overflow-hidden" style={{ border: `1px solid var(--border)` }}>
      <div className="p-3" style={{ background: "var(--bg-muted)" }}>
        <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: a.color }}>{a.label}</p>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{a.value}</p>
      </div>
      <div className="p-3" style={{ background: "var(--bg-muted)", borderLeft: `1px solid var(--border)` }}>
        <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: b.color }}>{b.label}</p>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{b.value}</p>
      </div>
    </div>
  );
}

function DatabaseSection() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {DB_ROWS.map((row, i) => {
        const isOpen = expanded === row.store;
        return (
          <div key={i} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${isOpen ? C.border2 : "var(--border)"}` }}>
            <button onClick={() => setExpanded(isOpen ? null : row.store)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.color }} />
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{row.store}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{row.usedFor}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-[9px]" style={{ color: row.color }}>{row.latency}</p>
                <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{row.consistency}</p>
              </div>
              <span style={{ color: "var(--text-faint)" }}>{isOpen ? "▴" : "▾"}</span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-3">
                <ComparisonCard
                  a={{ label: "Consistency", value: row.consistency, color: row.color }}
                  b={{ label: "Latency", value: row.latency, color: row.color }}
                />
                <ComparisonCard
                  a={{ label: "Throughput", value: row.throughput, color: "var(--text-muted)" }}
                  b={{ label: "Cost Profile", value: row.costProfile, color: "var(--text-muted)" }}
                />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-faint)" }}>Why this wins</p>
                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{row.whyWins}</p>
                </div>
                <div className="rounded p-2.5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#ef4444" }}>Anti-Pattern</p>
                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{row.antiPattern}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Push/Pull ──────────────────────────────────────────────────────────────────
function PushPullSection() {
  const APPROACH_COLOR: Record<string, string> = { push: C.green, pull: "#818cf8", hybrid: C.amber };
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid var(--border)` }}>
      <div className="grid grid-cols-4 px-3 py-2" style={{ background: "var(--bg-muted)", borderBottom: `1px solid var(--border)` }}>
        {["Example", "Approach", "Latency / Staleness", "Trade-off"].map(h => (
          <span key={h} className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{h}</span>
        ))}
      </div>
      {PUSH_PULL_ROWS.map((row, i) => {
        const color = APPROACH_COLOR[row.approach];
        return (
          <div key={i} className="grid grid-cols-4 px-3 py-3 gap-2"
            style={{ borderBottom: i < PUSH_PULL_ROWS.length - 1 ? `1px solid var(--border)` : undefined }}>
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{row.name}</p>
              <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{row.usedAt}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded capitalize"
                style={{ background: color + "18", color, border: `1px solid ${color}30` }}>
                {row.approach}
              </span>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{row.latency}</p>
              <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{row.staleness}</p>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{row.tradeoff}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Microservices ──────────────────────────────────────────────────────────────
function MicroservicesSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: C.green }}>✓</span>
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Benefits</p>
        </div>
        <div className="space-y-2">
          {MICROSERVICES_BENEFITS.map((b, i) => (
            <div key={i} className="rounded-lg p-3" style={{ background: "var(--bg-muted)", border: `1px solid var(--border)` }}>
              <p className="text-xs font-bold mb-1" style={{ color: C.green }}>{b.title}</p>
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: "#ef4444" }}>✗</span>
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Costs</p>
        </div>
        <div className="space-y-2">
          {MICROSERVICES_COSTS.map((c, i) => (
            <div key={i} className="rounded-lg p-3" style={{ background: "var(--bg-muted)", border: `1px solid var(--border)` }}>
              <p className="text-xs font-bold mb-1" style={{ color: "#ef4444" }}>{c.title}</p>
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function TradeoffsTab({ interviewMode }: { interviewMode: boolean }) {
  const [activeSection, setActiveSection] = useState("cap");
  const [readPct, setReadPct] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(`tradeoffs-${id}`)?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => {
      const scrollable = el.scrollHeight - el.clientHeight;
      setReadPct(scrollable > 0 ? (el.scrollTop / scrollable) * 100 : 0);
      for (const sec of [...SECTIONS].reverse()) {
        const anchor = document.getElementById(`tradeoffs-${sec.id}`);
        if (!anchor) continue;
        if (anchor.getBoundingClientRect().top <= 110) {
          setActiveSection(sec.id);
          break;
        }
      }
    };
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="flex h-full overflow-hidden relative" style={{ background: "var(--bg)" }}>
      <ReadingBar pct={readPct} />

      {/* Sticky TOC */}
      <div className="w-44 shrink-0 hidden md:block pt-0.5" style={{ background: "var(--bg-card)", borderRight: `1px solid var(--border)` }}>
        <div className="px-3 py-3" style={{ borderBottom: `1px solid var(--border)` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Contents</p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>~{TOTAL_MIN} min read</p>
        </div>
        <nav className="p-2 space-y-0.5">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => scrollTo(s.id)}
              className="w-full text-left px-2 py-2 rounded transition-colors text-xs"
              style={{
                background: activeSection === s.id ? C.red + "10" : "transparent",
                color: activeSection === s.id ? C.red : "var(--text-muted)",
                borderLeft: `2px solid ${activeSection === s.id ? C.red : "transparent"}`,
              }}>
              <span>{s.label}</span>
              <span className="ml-1 text-[9px]" style={{ color: "var(--text-faint)" }}>{s.readMin}m</span>
            </button>
          ))}
        </nav>
        {readPct > 0 && (
          <div className="px-3 pb-3">
            <div className="h-1 rounded-full mt-2" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full" style={{ width: `${readPct}%`, background: C.red }} />
            </div>
            <p className="text-[8px] mt-1" style={{ color: "var(--text-faint)" }}>{Math.round(readPct)}% read</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-5 pt-4 pb-10 space-y-8">
        <div className="flex items-center gap-3 mb-2">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>~{TOTAL_MIN} min read</p>
          {interviewMode && (
            <span className="text-[10px] px-2 py-0.5 rounded"
              style={{ background: C.green + "18", color: C.green, border: `1px solid ${C.green}30` }}>
              Interview Mode: business justifications shown
            </span>
          )}
        </div>

        <Section id="cap" title="CAP Theorem" readMin={2} interviewMode={interviewMode}>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Consistency, Availability, Partition Tolerance — you get at most 2. Since network partitions always happen, the real choice is CP vs AP, service by service.
          </p>
          <CAPSection interviewMode={interviewMode} />
        </Section>

        <Section id="databases" title="Database Comparison" readMin={3} interviewMode={interviewMode}>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Why Netflix uses 5 different databases. Each wins on one dimension its competitors can&apos;t match at Netflix scale.
          </p>
          <DatabaseSection />
        </Section>

        <Section id="pushpull" title="Push vs Pull" readMin={1} interviewMode={interviewMode}>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Push wins when read-time computation is too expensive. Pull wins when you need guaranteed freshness. Hybrid is the answer when both matter.
          </p>
          <PushPullSection />
        </Section>

        <Section id="microservices" title="Microservices" readMin={2} interviewMode={interviewMode}>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Netflix pioneered microservices at scale. Know both sides — interviewers will push back on your choice.
          </p>
          <MicroservicesSection />
        </Section>
      </div>
    </div>
  );
}
