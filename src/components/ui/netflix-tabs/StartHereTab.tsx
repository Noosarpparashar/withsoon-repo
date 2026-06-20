"use client";

import { useState } from "react";
import type { TabSlug } from "./types";
import type { Role } from "./types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
      style={{ background: copied ? "#22c55e" : "#2a2b3d", color: copied ? "#fff" : "#a9b1d6", cursor: "pointer", border: "none" }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

const backendOpeningScript = `I'll scope this to Netflix playback backend. I will design the flow where a user clicks play, the system validates access, creates a playback session, returns a manifest, streams video through CDN/Open Connect, and continuously updates watch progress using heartbeat events.

Key services: API Gateway, Auth Service, Subscription Service, Concurrency Service, Playback Service, DRM Service, Manifest Service, CDN/Open Connect, Watch Progress Service.

Let me start by clarifying: are we designing the complete playback flow, or a specific subsystem like concurrency limits or watch history?`;

const dataOpeningScript = `I'll scope this to Netflix streaming analytics. I will design an event pipeline that collects playback events, sends them to Kafka, processes them using Spark/Flink, stores raw and curated data in Iceberg tables, and serves metrics like total watch hours, top content, completion rate, and buffering ratio.

Key components: Event Collector, Kafka topics, Schema Registry, Stream Processor (Spark/Flink), Bronze/Silver/Gold Iceberg layers, Trino/BI serving layer.

First clarifying question: are we calculating total streaming hours or real-time active users? Do we need real-time or batch analytics?`;

function StartHereTab({ onNavigateTab, role, onRoleChange }: {
  onNavigateTab: (tab: TabSlug) => void;
  role: Role;
  onRoleChange: (r: Role) => void;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const roleCards = [
    {
      role: "Backend Engineer" as Role,
      icon: "⚙️",
      color: "#3b82f6",
      covers: [
        "Playback APIs and service design",
        "Watch history and resume watching",
        "Concurrency limit design",
        "Metadata service and cache design",
        "Database choices and CDN handoff",
        "Failures, retries, and tradeoffs",
      ],
      doesNotCover: [
        "ML recommendation internals",
        "Data pipeline and lakehouse",
        "Encoding pipeline details",
        "SRE and incident management",
      ],
      prepTime: "30–45 minutes",
      cta: "Explore Architecture",
      ctaTab: "architecture" as TabSlug,
    },
    {
      role: "Data Engineer" as Role,
      icon: "📊",
      color: "#10b981",
      covers: [
        "Event ingestion and Kafka topic design",
        "Streaming processing (Spark/Flink)",
        "Sessionization and late events",
        "Bronze/Silver/Gold lakehouse tables",
        "Data quality checks and backfills",
        "Analytics serving layer",
      ],
      doesNotCover: [
        "Backend API and service design",
        "ML model training internals",
        "SRE and incident management",
        "Frontend and UI personalization",
      ],
      prepTime: "30–45 minutes",
      cta: "See Data Models",
      ctaTab: "models" as TabSlug,
    },
  ];

  const interviewerExpectations = [
    {
      icon: "🎯",
      title: "Clarify role and scope",
      desc: "Don't try to design every Netflix system. Start by clarifying: which role are you in, and which area should you go deep on?",
    },
    {
      icon: "🔍",
      title: "Pick one deep-dive path",
      desc: "Backend engineers go deep on playback, concurrency, and cache. Data engineers go deep on event ingestion, streaming, and lakehouse.",
    },
    {
      icon: "⚖️",
      title: "Explain tradeoffs clearly",
      desc: "For every design decision, state what you chose and what you rejected. Interviewers probe tradeoffs harder than architecture diagrams.",
    },
  ];

  const commonMistakes = {
    "Backend Engineer": [
      "Designing frontend too much — stay on the server side",
      "Ignoring CDN and treating all traffic as direct API calls",
      "Ignoring concurrency limits — a core Netflix-specific problem",
      "Making every data store strongly consistent",
      "Not discussing cache invalidation strategy",
      "Not handling retries and idempotency",
    ],
    "Data Engineer": [
      "Counting raw heartbeat events as watch time directly",
      "Ignoring duplicate events — always deduplicate first",
      "Ignoring late events and watermarking",
      "Partitioning Kafka by hot content_id causing skew",
      "Ignoring schema evolution rules",
      "Not defining metric logic clearly (what counts as a watch?)",
    ],
  };

  const clarifyQs = {
    "Backend Engineer": [
      { q: "Are we designing the complete playback flow or a specific subsystem?", why: "Full playback covers 10+ services. Scoping saves time and shows judgment." },
      { q: "Is multi-device and multi-region in scope?", why: "This changes consistency requirements and DB choices significantly." },
      { q: "What does the interviewer care most about — latency, concurrency, or failures?", why: "Lets you focus your 30 minutes on what matters to the panel." },
      { q: "Is offline download in scope?", why: "DRM device binding and expiry rules add significant complexity." },
    ],
    "Data Engineer": [
      { q: "Are we calculating total streaming hours or real-time active users?", why: "Batch vs streaming architecture is completely different." },
      { q: "What is the acceptable delay — seconds, minutes, or hours?", why: "Drives Flink vs Spark vs batch decision." },
      { q: "How do we define a valid watch session?", why: "Sessionization logic depends entirely on this definition." },
      { q: "Do we need exactly-once or effectively-once processing?", why: "Exactly-once requires Kafka transactions + Flink checkpointing." },
      { q: "How late can events arrive?", why: "Sets watermark and DLQ strategy." },
    ],
  };

  const activeClarifyQs = clarifyQs[role];
  const activeMistakes = commonMistakes[role];
  const activeCard = roleCards.find(c => c.role === role)!;

  return (
    <div className="space-y-8">

      {/* Hero */}
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #3b82f6, #10b981, #8b5cf6)" }} />
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>What are you preparing for?</h2>
        <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
          This is a guided interview preparation product — not a general encyclopedia.
        </p>
        <p className="text-xs mb-6" style={{ color: "var(--text-faint)" }}>
          In a Netflix-style interview, do not try to design every Netflix system. First clarify the scope, then go deep into the area relevant to your role.
        </p>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roleCards.map((card) => {
            const isActive = role === card.role;
            return (
              <div
                key={card.role}
                onClick={() => onRoleChange(card.role)}
                className="rounded-xl p-5 cursor-pointer transition-all duration-200"
                style={{
                  background: isActive ? `${card.color}10` : "var(--bg)",
                  border: `2px solid ${isActive ? card.color : "var(--border)"}`,
                  boxShadow: isActive ? `0 0 20px ${card.color}20` : "none",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{card.icon}</span>
                  <span className="text-base font-bold" style={{ color: isActive ? card.color : "var(--text)" }}>{card.role}</span>
                  {isActive && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${card.color}20`, color: card.color }}>Selected</span>
                  )}
                </div>

                <div className="mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: card.color }}>Covers</p>
                  {card.covers.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5 mb-1">
                      <span className="text-xs shrink-0 mt-0.5" style={{ color: card.color }}>✓</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{c}</span>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-faint)" }}>Does not cover</p>
                  {card.doesNotCover.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5 mb-1">
                      <span className="text-xs shrink-0 mt-0.5" style={{ color: "var(--text-faint)" }}>–</span>
                      <span className="text-xs" style={{ color: "var(--text-faint)" }}>{c}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>⏱ Prep time: {card.prepTime}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRoleChange(card.role); onNavigateTab(card.ctaTab); }}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold transition-colors"
                    style={{ background: card.color, color: "#fff", border: "none", cursor: "pointer" }}
                  >
                    {card.cta} →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* What interviewers expect */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>What interviewers expect</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          In a Netflix-style interview, do not try to design every Netflix system. First clarify the scope, then go deep into the area relevant to your role.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {interviewerExpectations.map((item, i) => (
            <div key={i} className="p-4 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>{item.title}</div>
              <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Clarifying questions */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>
          Clarifying questions to ask first
          <span className="ml-2 text-sm font-normal" style={{ color: activeCard.color }}>— {role}</span>
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Ask these before drawing anything. Each answer changes your design.</p>
        <div className="space-y-2">
          {activeClarifyQs.map((card, i) => (
            <div key={i} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div
                className="flex items-start gap-3 p-4 cursor-pointer"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setOpenIdx(openIdx === i ? null : i)}
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: `${activeCard.color}20`, color: activeCard.color }}>Q</span>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{card.q}</div>
                  {openIdx === i && <div className="text-xs mt-1.5" style={{ color: "var(--text-faint)" }}>{card.why}</div>}
                </div>
                <span className="text-xs shrink-0 transition-transform duration-200" style={{ color: "var(--text-muted)", display: "inline-block", transform: openIdx === i ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Opening script */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>
          Say this to open the interview
          <span className="ml-2 text-sm font-normal" style={{ color: activeCard.color }}>— {role}</span>
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Copy and practice verbatim. It signals scope awareness before you draw a single box.</p>
        <div className="relative rounded-xl overflow-hidden" style={{ background: "#1a1b26" }}>
          <div className="absolute top-2 right-3 z-10">
            <CopyButton text={role === "Backend Engineer" ? backendOpeningScript : dataOpeningScript} />
          </div>
          <pre className="p-4 pt-5 overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap">
            <code style={{ color: "#a9b1d6" }}>{role === "Backend Engineer" ? backendOpeningScript : dataOpeningScript}</code>
          </pre>
        </div>
      </div>

      {/* Common mistakes */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>
          Common mistakes to avoid
          <span className="ml-2 text-sm font-normal" style={{ color: "#ef4444" }}>— {role}</span>
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>These are the answers that get candidates screened out — don&apos;t make them.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activeMistakes.map((m, i) => (
            <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid #fee2e2" }}>
              <span className="text-xs shrink-0 mt-0.5" style={{ color: "#ef4444" }}>✗</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{m}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => onNavigateTab(activeCard.ctaTab)}
          className="py-4 rounded-xl text-sm font-bold transition-all"
          style={{ background: activeCard.color, color: "#fff", border: "none", cursor: "pointer" }}
        >
          Start {role} Track →
        </button>
        <button
          onClick={() => onNavigateTab("cheat-sheet")}
          className="py-4 rounded-xl text-sm font-bold transition-all"
          style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
        >
          Jump to Cheat Sheet →
        </button>
      </div>

    </div>
  );
}

export { StartHereTab };
