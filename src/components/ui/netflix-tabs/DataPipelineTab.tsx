"use client";

import { useState } from "react";
import {
  ENCODING_PIPELINE,
  ACCESS_PATTERNS,
  HOUSEHOLD_ENFORCEMENT,
} from "@/components/ui/netflix-system-data";
import { SayThisBlock, CodeBlock, CodeBlockWithCopy } from "./shared";
import type { TabSlug } from "@/components/ui/NetflixPage";

function DataPipelineTab({ onNavigateTab: _onNavigateTab }: { onNavigateTab?: (tab: TabSlug) => void }) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showLakehouse, setShowLakehouse] = useState(true);

  return (
    <div className="space-y-10">
      {/* ─── STICKY PIPELINE NAVIGATOR ────────────────────── */}
      <div className="sticky top-0 z-30 py-3 -mx-4 px-4 sm:-mx-6 sm:px-6" style={{ background: "var(--bg)" }}>
        <div className="flex items-center gap-1 p-2 rounded-xl overflow-x-auto" style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}>
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
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", scrollMarginTop: "80px"  }}
      >
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)" }} />
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
          Start Here: The Numbers That Drive Everything
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Open the interview with this. Every infrastructure decision below derives from these numbers.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 p-6 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)"  }}>
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

        <div className="rounded-xl p-5" style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)"  }}>
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
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", scrollMarginTop: "80px"  }}
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
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", scrollMarginTop: "80px"  }}
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

        <div className="p-4 rounded-lg" style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-text)"  }}>
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
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", scrollMarginTop: "80px"  }}
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
                className="w-full text-left p-4 rounded-lg transition-colors duration-150"
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
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", scrollMarginTop: "80px"  }}
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
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", scrollMarginTop: "80px"  }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
          Flink Processing Pipeline
        </h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {["Kafka source","Deserialize","Validate","Deduplicate","Enrich","Sessionize","Aggregate","Quality check","Multi-sink"].map((step, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="px-2.5 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--blue-text)"  }}>
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
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}
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
              <div className="p-4 rounded-lg" style={{ background: "var(--bg)", border: "2px solid #d97706"  }}>
                <h4 className="font-bold text-sm mb-2" style={{ color: "#d97706" }}>Bronze (Raw)</h4>
                <ul className="text-xs space-y-1" style={{ color: "var(--text)" }}>
                  <li>Append-only, source-faithful</li>
                  <li>Includes dupes + raw PII</li>
                  <li>For replay &amp; audit</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "var(--bg)", border: "2px solid #6b7280"  }}>
                <h4 className="font-bold text-sm mb-2" style={{ color: "#6b7280" }}>Silver (Clean)</h4>
                <ul className="text-xs space-y-1" style={{ color: "var(--text)" }}>
                  <li>Deduplicated, PII tokenized</li>
                  <li>Enriched + sessionized</li>
                  <li>Most analytics consume this</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "var(--bg)", border: "2px solid #fbbf24"  }}>
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
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", scrollMarginTop: "80px"  }}
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
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)"  }}
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

export { DataPipelineTab };
