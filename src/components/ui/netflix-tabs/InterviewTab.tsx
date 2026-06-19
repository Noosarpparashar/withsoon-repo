"use client";

import { useState, useMemo } from "react";
import {
  QA_ARCHITECTURE,
  QA_PIPELINE,
  QA_RELIABILITY,
} from "@/components/ui/netflix-system-data";
import type { QA } from "@/components/ui/netflix-system-data";

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
      className="rounded-lg overflow-hidden transition-colors duration-150"
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

export { InterviewTab, DbDecisionTree };
