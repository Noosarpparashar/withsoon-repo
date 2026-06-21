"use client";

import { useState, useMemo } from "react";
import { SERVICES } from "@/components/ui/netflix-system-data";
import type { Service } from "@/components/ui/netflix-system-data";
import { SayThisBlock, FollowUpsAccordion, CodeBlockWithCopy, DbTablesView } from "./shared";

const CATEGORY_COLORS: Record<Service["category"], string> = {
  "Core Services": "#3b82f6",
  "Platform Services": "#8b5cf6",
  Infrastructure: "#f59e0b",
  "Data Layer": "#10b981",
};


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
                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150"
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
        <div className="w-1.5 h-12 rounded-full" style={{ background: CATEGORY_COLORS[service.category] }} />
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>{service.label}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs font-medium" style={{ color: CATEGORY_COLORS[service.category] }}>{service.category}</span>
            {service.slo && (
              <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--blue-text)" }}>SLO: {service.slo}</span>
            )}
          </div>
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

      {/* Events */}
      {(service.eventsProduced?.length || service.eventsConsumed?.length) ? (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Events
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-semibold mb-2" style={{ color: "#10b981" }}>
                Events Produced ({service.eventsProduced?.length ?? 0})
              </div>
              {service.eventsProduced && service.eventsProduced.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {service.eventsProduced.map((ev) => (
                    <span
                      key={ev}
                      className="font-mono text-xs px-2 py-0.5 rounded"
                      style={{
                        background: "rgba(16,185,129,0.1)",
                        color: "#10b981",
                        border: "1px solid rgba(16,185,129,0.3)",
                      }}
                    >
                      {ev}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs italic" style={{ color: "var(--text-faint)" }}>none</span>
              )}
            </div>
            <div>
              <div className="text-[11px] font-semibold mb-2" style={{ color: "#3b82f6" }}>
                Events Consumed ({service.eventsConsumed?.length ?? 0})
              </div>
              {service.eventsConsumed && service.eventsConsumed.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {service.eventsConsumed.map((ev) => (
                    <span
                      key={ev}
                      className="font-mono text-xs px-2 py-0.5 rounded"
                      style={{
                        background: "rgba(59,130,246,0.1)",
                        color: "#3b82f6",
                        border: "1px solid rgba(59,130,246,0.3)",
                      }}
                    >
                      {ev}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs italic" style={{ color: "var(--text-faint)" }}>none</span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* PART 3 — Failure Modes */}
      {service.failureModes && service.failureModes.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Failure Modes
          </h3>
          <div className="space-y-2">
            {service.failureModes.map((fm, i) => (
              <div
                key={i}
                className="rounded-lg p-3"
                style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start gap-2.5 flex-wrap mb-1.5">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                    style={{
                      background: fm.mode === "fail-open" ? "#d1fae5" : "#fee2e2",
                      color: fm.mode === "fail-open" ? "#065f46" : "#7f1d1d",
                    }}
                  >
                    {fm.mode === "fail-open" ? "FAIL OPEN" : "FAIL CLOSED"}
                  </span>
                  <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {fm.scenario}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {fm.recovery}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PART 3 — Scaling Strategy */}
      {service.scalingStrategy && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Scaling Strategy
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            {service.scalingStrategy}
          </p>
        </div>
      )}

      {/* Say This In Interview */}
      {service.sayThis && <SayThisBlock text={service.sayThis} />}

      {/* Interviewer Follow-Ups */}
      {service.interviewFollowUps && service.interviewFollowUps.length > 0 && (
        <FollowUpsAccordion followUps={service.interviewFollowUps} />
      )}
    </div>
  );
}

export { ServicesTab };
