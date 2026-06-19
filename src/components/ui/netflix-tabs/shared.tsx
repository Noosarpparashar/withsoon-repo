"use client";

import { useState, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   SHARED COMPONENTS (used across multiple tabs)
   ═══════════════════════════════════════════════════════════════ */

function SayThisBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #10b981" }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "#d1fae5" }}>
        <span className="text-xs font-bold" style={{ color: "#065f46" }}>📋 Say This In Interview</span>
        <button
          onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
          className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
          style={{ background: copied ? "#22c55e" : "#fff", color: copied ? "#fff" : "#065f46", border: "1px solid #10b981", cursor: "pointer" }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="px-4 py-3 text-sm leading-relaxed" style={{ background: "var(--bg)", color: "var(--text)" }}>
        {text}
      </div>
    </div>
  );
}

function FollowUpsAccordion({ followUps }: { followUps: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
        style={{ background: "var(--bg)" }}
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(!open)}
      >
        <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>Interviewer Follow-Ups ({followUps.length})</span>
        <span className="text-xs transition-transform duration-200" style={{ color: "var(--text-faint)", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
          {followUps.map((q, i) => (
            <div key={i} className="flex gap-2.5 pt-2">
              <span className="text-xs shrink-0 mt-0.5" style={{ color: "var(--blue-text)" }}>▶</span>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>{q}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SCALE_DERIVATIONS = [
  {
    label: "Peak Bandwidth",
    result: "300 Tbps",
    formula: "60M streams × 5 Mbps avg bitrate",
    why: "Anchors every CDN and network capacity decision. Netflix negotiates ISP peering agreements based on this number. Without knowing this, you can't justify why OCA appliances need 100Gbps uplinks.",
    tag: "CDN",
  },
  {
    label: "Watch-History Write Rate",
    result: "2 M writes/s",
    formula: "60M streams × heartbeat every 30s",
    why: "Every active stream sends a resume-position heartbeat every 30s. 60M ÷ 30 = 2M writes/s — this is why watch history goes to Cassandra (not MySQL). No RDBMS handles 2M writes/s on a single table.",
    tag: "Cassandra",
  },
  {
    label: "Kafka Brokers Needed",
    result: "~720 brokers",
    formula: "40 GB/s ingest × RF 3 ÷ 200 MB/s per broker",
    why: "700B events/day ≈ 40 GB/s. With replication factor 3 each byte lands on 3 brokers. Divide by 200 MB/s (conservative disk throughput per broker) = 600–720 brokers. Shows you understand Kafka sizing beyond 'just add more partitions'.",
    tag: "Kafka",
  },
  {
    label: "EVCache Hit Rate Impact",
    result: "−2.5B Cassandra reads/day",
    formula: "EVCache ~30M req/s, 99.9% hit rate",
    why: "Without EVCache, every catalog and recommendation read hammers Cassandra. A 99.9% cache hit rate means only 0.1% of 30M/s = 30K/s reach Cassandra — vs 30M/s without it. This is the core justification for the EVCache layer.",
    tag: "Cache",
  },
  {
    label: "Encoding Storage per Title",
    result: "~40 TB",
    formula: "1,200+ variants × avg 30 GB per variant",
    why: "Per-title VMAF encoding means a 2-hour film gets 1,200+ encode jobs. Storage is pre-paid for delivery. The 20% bandwidth savings vs fixed-ladder encoding justifies the compute and storage cost.",
    tag: "Encoding",
  },
  {
    label: "Session Tokens in Redis",
    result: "~300M keys",
    formula: "300M subscribers × 1 active session key",
    why: "Each active session is a short-lived JWT (15 min) with a Redis-backed revocation key. 300M concurrent keys at ~200 bytes each = ~60 GB. Fits in a mid-size Redis cluster — but you must mention TTL discipline or it blows up.",
    tag: "Auth",
  },
  {
    label: "Playback Manifest Latency Budget",
    result: "P99 < 300 ms",
    formula: "Client SLA: play starts within 1s of tap",
    why: "Of the 1-second start budget: ~100ms network, ~300ms manifest generation, ~200ms first chunk fetch from OCA, ~400ms buffer fill. If PlaybackService is >300ms P99, the UX breaks. Every microservice in the critical path must have its own latency budget.",
    tag: "Playback",
  },
  {
    label: "DRM License Volume",
    result: "2 M licenses/s (peak)",
    formula: "60M streams × license refresh every 30s",
    why: "DRM licenses are device-bound and time-limited. 60M active streams each refreshing every 30s = 2M license requests/s. This is why DRM service is horizontally sharded by device_id, not user_id — many users multi-screen.",
    tag: "DRM",
  },
];

function ScaleDerivationSection() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  const copyAll = () => {
    const text = SCALE_DERIVATIONS.map(d => `${d.label}: ${d.result} (${d.formula})`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Scale Numbers — With the Math</h2>
        <button
          onClick={copyAll}
          className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
          style={{ background: allCopied ? "#22c55e" : "var(--bg)", color: allCopied ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
        >
          {allCopied ? "Copied!" : "Copy All Numbers"}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SCALE_DERIVATIONS.map((item) => {
          const isOpen = expanded === item.label;
          return (
            <div
              key={item.label}
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              <div
                className="p-4 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: "var(--bg)" }}
                onClick={() => setExpanded(isOpen ? null : item.label)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setExpanded(isOpen ? null : item.label)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>{item.tag}</span>
                      <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{item.label}</span>
                    </div>
                    <div className="font-mono font-bold text-lg" style={{ color: "var(--blue-text)" }}>{item.result}</div>
                    <div className="text-xs mt-1 font-mono" style={{ color: "var(--text-faint)" }}>{item.formula}</div>
                  </div>
                  <span className="text-xs mt-1 shrink-0 transition-transform duration-200" style={{ color: "var(--text-faint)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </div>
              </div>
              {isOpen && (
                <div className="px-4 pb-4 pt-2 text-sm leading-relaxed" style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)", background: "var(--bg-card)" }}>
                  <span className="text-xs font-bold block mb-1" style={{ color: "var(--blue-text)" }}>Why this matters in the interview</span>
                  {item.why}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DATA DESIGN EXTRAS
   ═══════════════════════════════════════════════════════════════ */



/* ═══════════════════════════════════════════════════════════════
   DB / CODE UTILITIES
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

export { SayThisBlock, FollowUpsAccordion, ScaleDerivationSection, DbTablesView, CodeBlock, CodeBlockWithCopy };
