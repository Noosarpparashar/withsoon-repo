"use client";

import { useState } from "react";
import { SayThisBlock } from "./shared";
import type { TabSlug } from "@/components/ui/NetflixPage";

const FUNCTIONAL_REQS = [
  {
    domain: "User / Account",
    color: "#3b82f6",
    reqs: [
      { req: "Users can sign up and log in", p: "P0", consistency: "Strong", latency: "<200ms", availability: "99.99%" },
      { req: "Users can create up to 5 profiles per account", p: "P0", consistency: "Strong", latency: "<300ms", availability: "99.9%" },
      { req: "Users can register and manage devices", p: "P1", consistency: "Strong", latency: "<500ms", availability: "99.9%" },
      { req: "Parental controls per profile (maturity level)", p: "P1", consistency: "Strong", latency: "<300ms", availability: "99.9%" },
      { req: "Users can select and change subscription plan", p: "P0", consistency: "Strong", latency: "<1s", availability: "99.99%" },
    ],
  },
  {
    domain: "Catalog / Search",
    color: "#10b981",
    reqs: [
      { req: "Users can browse titles on homepage", p: "P0", consistency: "Eventual", latency: "<500ms", availability: "99.9%" },
      { req: "Users can search by title, cast, genre", p: "P0", consistency: "Eventual", latency: "<100ms autocomplete", availability: "99.9%" },
      { req: "Users can view title detail page", p: "P0", consistency: "Eventual", latency: "<300ms", availability: "99.9%" },
      { req: "Content availability filtered by region", p: "P0", consistency: "Eventual", latency: "<300ms", availability: "99.9%" },
      { req: "Age-appropriate content based on profile", p: "P0", consistency: "Strong", latency: "<300ms", availability: "99.99%" },
    ],
  },
  {
    domain: "Playback",
    color: "#f59e0b",
    reqs: [
      { req: "User can start video playback", p: "P0", consistency: "Strong", latency: "<2s startup", availability: "99.99%" },
      { req: "Adaptive bitrate streaming (quality auto-adjusts)", p: "P0", consistency: "N/A", latency: "Seamless", availability: "99.99%" },
      { req: "Pause, resume, seek within video", p: "P0", consistency: "Eventual", latency: "<200ms", availability: "99.99%" },
      { req: "Resume across devices (continue watching)", p: "P0", consistency: "Eventual", latency: "<500ms", availability: "99.9%" },
      { req: "Subtitle and audio track selection", p: "P1", consistency: "Eventual", latency: "<300ms", availability: "99.9%" },
      { req: "DRM license validation before play", p: "P0", consistency: "Strong", latency: "<500ms", availability: "99.99%" },
      { req: "Enforce concurrent stream device limit", p: "P0", consistency: "Strong", latency: "<100ms", availability: "99.99%" },
    ],
  },
  {
    domain: "Watch History",
    color: "#8b5cf6",
    reqs: [
      { req: "Track watch position every 30s (heartbeat)", p: "P0", consistency: "Eventual", latency: "Async", availability: "99.9%" },
      { req: "Continue watching list per profile", p: "P0", consistency: "Eventual", latency: "<300ms", availability: "99.9%" },
      { req: "Cross-device resume position sync", p: "P1", consistency: "Eventual", latency: "<500ms", availability: "99.9%" },
      { req: "Mark title as completed", p: "P2", consistency: "Eventual", latency: "<500ms", availability: "99.5%" },
    ],
  },
  {
    domain: "Recommendations",
    color: "#ec4899",
    reqs: [
      { req: "Personalized homepage rows per profile", p: "P0", consistency: "Eventual", latency: "<500ms", availability: "99.9%" },
      { req: "Similar titles on detail page", p: "P1", consistency: "Eventual", latency: "<300ms", availability: "99.9%" },
      { req: "Trending content (region-aware)", p: "P1", consistency: "Eventual", latency: "<300ms", availability: "99.9%" },
      { req: "Cold start recommendations for new users", p: "P0", consistency: "Eventual", latency: "<500ms", availability: "99.9%" },
      { req: "Personalized thumbnail artwork per profile", p: "P2", consistency: "Eventual", latency: "<500ms", availability: "99.5%" },
    ],
  },
  {
    domain: "Content Operations",
    color: "#06b6d4",
    reqs: [
      { req: "Studio admin can upload master video files", p: "P0", consistency: "Strong", latency: "N/A (upload)", availability: "99.9%" },
      { req: "System transcodes to multiple resolutions/bitrates", p: "P0", consistency: "Strong", latency: "Async (minutes)", availability: "99.9%" },
      { req: "Package into HLS/DASH segments", p: "P0", consistency: "Strong", latency: "Async", availability: "99.9%" },
      { req: "Encrypt content and generate DRM metadata", p: "P0", consistency: "Strong", latency: "Async", availability: "99.99%" },
      { req: "Distribute encoded content to CDN/OCA", p: "P0", consistency: "Eventual", latency: "Async", availability: "99.9%" },
      { req: "Publish title to catalog with regional availability", p: "P0", consistency: "Strong", latency: "<2s", availability: "99.9%" },
    ],
  },
  {
    domain: "Data Platform",
    color: "#f97316",
    reqs: [
      { req: "Collect play, pause, heartbeat, impression events", p: "P0", consistency: "Eventual", latency: "Async", availability: "99.9%" },
      { req: "Real-time quality-of-experience (QoE) monitoring", p: "P0", consistency: "Eventual", latency: "<30s lag", availability: "99.9%" },
      { req: "Daily batch ML feature generation", p: "P1", consistency: "Eventual", latency: "Batch", availability: "99.5%" },
      { req: "Train recommendation models on historical data", p: "P1", consistency: "Eventual", latency: "Batch", availability: "99.5%" },
      { req: "Serve analytics dashboards to internal teams", p: "P2", consistency: "Eventual", latency: "<2s query", availability: "99.5%" },
    ],
  },
];

const NFR_ROWS = [
  { category: "Playback Startup", requirement: "Video starts playing in <2s from click (P99)", slo: "<2s P99", priority: "P0" },
  { category: "Search Autocomplete", requirement: "Results shown in <100ms", slo: "<100ms P95", priority: "P0" },
  { category: "Homepage Load", requirement: "Recommendations visible within <500ms", slo: "<500ms P95", priority: "P0" },
  { category: "Playback Availability", requirement: "Existing streams continue during partial outages", slo: "99.99%", priority: "P0" },
  { category: "CDN Cache Hit", requirement: "Video segments served from edge, not origin", slo: ">99% top titles", priority: "P0" },
  { category: "Billing Consistency", requirement: "Subscription changes reflected immediately", slo: "Strong consistency", priority: "P0" },
  { category: "Watch History Freshness", requirement: "Resume position synced within 1 heartbeat interval", slo: "~30s eventual", priority: "P1" },
  { category: "Rec. Freshness", requirement: "Recommendations reflect recent watches within minutes", slo: "<5min nearline", priority: "P1" },
  { category: "Data Retention", requirement: "Event data retained for ML training and compliance", slo: "90 days raw, 2y curated", priority: "P1" },
  { category: "DRM Security", requirement: "Content protected — no playback without valid device-bound license", slo: "Zero plaintext fallback", priority: "P0" },
  { category: "Fault Tolerance", requirement: "Recommendation/search failure must not block playback", slo: "Degraded, not down", priority: "P0" },
];

const SCOPE_TRADEOFFS = [
  { skip: "Full ML recommendation deep dive", reason: "Say 'offline/nearline/online + fallback to trending'", time: "45 min" },
  { skip: "Encoding pipeline details", reason: "Say 'async transcoding job queue, idempotent, state machine'", time: "45 min" },
  { skip: "Security / DRM internals", reason: "Say 'device-bound license, signed CDN URLs, fail closed'", time: "45 min" },
  { skip: "Observability stack detail", reason: "Say 'metrics → dashboards → alerts on playback SLOs'", time: "45 min" },
  { skip: "Data lake Iceberg partitioning", reason: "Say 'Iceberg with event_date partitioning, Spark batch'", time: "30 min" },
];

function PBadge({ p }: { p: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    P0: { bg: "#fee2e2", text: "#991b1b" },
    P1: { bg: "#fef3c7", text: "#92400e" },
    P2: { bg: "#f0fdf4", text: "#166534" },
  };
  const c = colors[p] ?? colors.P2;
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.text }}>
      {p}
    </span>
  );
}

export function RequirementsTab({ onNavigateTab }: { onNavigateTab?: (tab: TabSlug) => void }) {
  const [openDomain, setOpenDomain] = useState<string | null>("Playback");

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "4px solid #f59e0b" }}>
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>Interview Tip</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Don&apos;t recite requirements from memory. <strong>Ask the interviewer</strong> which scope they care about, then state requirements for that scope. Flag consistency, latency, and availability trade-offs for every P0 requirement.
        </p>
      </div>

      {/* Functional Requirements */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Functional Requirements</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Grouped by domain. Click a domain to expand its requirements.</p>
        <div className="space-y-2">
          {FUNCTIONAL_REQS.map((domain) => {
            const isOpen = openDomain === domain.domain;
            return (
              <div key={domain.domain} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <button
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors"
                  style={{ background: isOpen ? `${domain.color}10` : "var(--bg)", cursor: "pointer", border: "none" }}
                  onClick={() => setOpenDomain(isOpen ? null : domain.domain)}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: domain.color }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{domain.domain}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card)", color: "var(--text-faint)", border: "1px solid var(--border)" }}>
                      {domain.reqs.length} requirements
                    </span>
                  </div>
                  <span className="text-xs transition-transform duration-200" style={{ color: "var(--text-faint)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </button>
                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                            <th className="text-left px-4 py-2.5 font-semibold" style={{ color: "var(--text-muted)", minWidth: 240 }}>Requirement</th>
                            <th className="text-center px-3 py-2.5 font-semibold" style={{ color: "var(--text-muted)" }}>Priority</th>
                            <th className="text-left px-3 py-2.5 font-semibold" style={{ color: "var(--text-muted)" }}>Consistency</th>
                            <th className="text-left px-3 py-2.5 font-semibold" style={{ color: "var(--text-muted)" }}>Latency SLO</th>
                            <th className="text-left px-3 py-2.5 font-semibold" style={{ color: "var(--text-muted)" }}>Availability</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                          {domain.reqs.map((r, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg)" }}>
                              <td className="px-4 py-3 text-sm leading-snug" style={{ color: "var(--text)" }}>{r.req}</td>
                              <td className="px-3 py-3 text-center"><PBadge p={r.p} /></td>
                              <td className="px-3 py-3" style={{ color: r.consistency === "Strong" ? "#f59e0b" : "#10b981" }}>{r.consistency}</td>
                              <td className="px-3 py-3 font-mono" style={{ color: "var(--text-muted)" }}>{r.latency}</td>
                              <td className="px-3 py-3 font-mono" style={{ color: "var(--text-muted)" }}>{r.availability}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Non-Functional Requirements */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Non-Functional Requirements</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>These are what interviewers test you on in follow-up questions.</p>
        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Category</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-muted)", minWidth: 280 }}>Requirement</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>SLO</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {NFR_ROWS.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg)" : "var(--bg-card)" }}>
                  <td className="px-4 py-3 font-semibold text-sm" style={{ color: "var(--text)" }}>{r.category}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>{r.requirement}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#3b82f6" }}>{r.slo}</td>
                  <td className="px-4 py-3 text-center"><PBadge p={r.priority} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scope tradeoff */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>What to Skip in a 45-Minute Interview</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>You can&apos;t cover everything. State what you&apos;re skipping and why — that shows senior judgment.</p>
        <div className="space-y-2">
          {SCOPE_TRADEOFFS.map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <span className="text-xs px-2 py-0.5 rounded shrink-0 mt-0.5" style={{ background: "#fef3c7", color: "#92400e" }}>Skip in {s.time}</span>
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{s.skip}</span>
                <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>→ {s.reason}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SayThisBlock text="My requirements: auth, profiles, browse/search, playback with DRM and adaptive bitrate, resume across devices, recommendations, billing with entitlement, content encoding pipeline, and event-driven data platform. Non-functional: <2s playback start P99, 99.99% playback availability, >99% CDN cache hit for top titles, eventual consistency for watch history, strong consistency for billing and concurrency limits." />

      {/* CTA */}
      {onNavigateTab && (
        <button
          onClick={() => onNavigateTab("scale-estimation" as never)}
          className="w-full py-4 rounded-2xl text-sm font-semibold transition-colors"
          style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--border)", cursor: "pointer" }}
        >
          Next: Scale Estimation →
        </button>
      )}
    </div>
  );
}
