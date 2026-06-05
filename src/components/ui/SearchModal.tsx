"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SearchItem = {
  id: string;
  href: string;
  title: string;
  summary: string;
  section: string;
  subsection: string | null;
  type: string;
  tags: string[];
  difficulty: string | null;
  date: string;
};

const SECTION_META: Record<string, { label: string; emoji: string; color: string; soft: string }> = {
  "tech-news": { label: "Tech News",   emoji: "📰", color: "text-[var(--yellow-text)]",  soft: "bg-[var(--yellow-soft)] text-[var(--yellow-text)]"  },
  "big-data":  { label: "Big Data",    emoji: "🗄️", color: "text-[var(--blue-text)]",    soft: "bg-[var(--blue-soft)] text-[var(--blue-text)]"      },
  "ai":        { label: "AI & LLMs",   emoji: "🤖", color: "text-[var(--purple-text)]",  soft: "bg-[var(--purple-soft)] text-[var(--purple-text)]"  },
  "interview": { label: "Interview",   emoji: "🎯", color: "text-[var(--orange-text)]",  soft: "bg-[var(--orange-soft)] text-[var(--orange-text)]"  },
  "reference": { label: "Cheatsheets", emoji: "📋", color: "text-[var(--pink-text)]",    soft: "bg-[var(--pink-soft)] text-[var(--pink-text)]"      },
  "radar":     { label: "Tech News",   emoji: "📰", color: "text-[var(--yellow-text)]",  soft: "bg-[var(--yellow-soft)] text-[var(--yellow-text)]"  },
  "tools":     { label: "Tools",       emoji: "🛠️", color: "text-[var(--green-text)]",   soft: "bg-[var(--green-soft)] text-[var(--green-text)]"    },
};

const TYPE_LABELS: Record<string, string> = {
  "system-design": "System Design",
  "interview-qa":  "Interview Q&A",
  "how-to":        "How-To",
  "setup":         "Setup Guide",
  "cheatsheet":    "Cheatsheet",
  "comparison":    "Comparison",
  "guide":         "Guide",
  "news":          "News",
  "tool":          "Tool",
  "reference":     "Reference",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     "bg-[var(--green-soft)] text-[var(--green-text)]",
  intermediate: "bg-[var(--orange-soft)] text-[var(--orange-text)]",
  advanced:     "bg-[var(--pink-soft)] text-[var(--pink-text)]",
};

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-[var(--accent-soft)] text-[var(--accent-text)] rounded px-0.5 not-italic font-semibold">{part}</mark>
      : part
  );
}

function score(item: SearchItem, q: string): number {
  const ql = q.toLowerCase();
  const title = item.title.toLowerCase();
  const summary = item.summary.toLowerCase();
  const tags = item.tags.join(" ").toLowerCase();
  const sub = (item.subsection ?? "").toLowerCase();
  if (title === ql) return 100;
  if (title.startsWith(ql)) return 90;
  if (title.includes(ql)) return 70;
  if (sub.includes(ql)) return 60;
  if (tags.includes(ql)) return 50;
  if (summary.includes(ql)) return 30;
  return 0;
}

function multiWordScore(item: SearchItem, words: string[]): number {
  return words.reduce((acc, w) => acc + score(item, w), 0);
}

export default function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchItem[]>([]);
  const [results, setResults] = useState<SearchItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load index once
  useEffect(() => {
    fetch("/api/search")
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => {});
  }, []);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Search
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setResults([]);
      setActiveIdx(0);
      return;
    }
    const words = q.toLowerCase().split(/\s+/);
    const scored = index
      .map((item) => ({ item, s: multiWordScore(item, words) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map(({ item }) => item);
    setResults(scored);
    setActiveIdx(0);
  }, [query, index]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIdx]) {
      navigate(results[activeIdx].href);
    }
  };

  // Scroll active result into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const sectionMeta = (section: string) =>
    SECTION_META[section] ?? { label: section, emoji: "📄", color: "text-[var(--text-muted)]", soft: "bg-[var(--bg-muted)] text-[var(--text-muted)]" };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "75vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)]">
          <svg className="w-5 h-5 text-[var(--text-faint)] shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search guides, cheatsheets, setup guides, interview Q&A..."
            className="flex-1 bg-transparent text-[var(--text)] placeholder-[var(--text-faint)] outline-none text-base"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-[var(--text-faint)] hover:text-[var(--text)] transition-colors p-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button onClick={onClose} className="text-[var(--text-faint)] hover:text-[var(--text)] text-xs border border-[var(--border)] px-2 py-1 rounded-lg transition-colors shrink-0">
            ESC
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {query.trim().length < 2 ? (
            /* Empty state — show sections */
            <div className="p-4">
              <p className="text-xs text-[var(--text-faint)] mb-3 font-medium uppercase tracking-wide">Browse sections</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SECTION_META)
                  .filter(([k]) => !["radar", "tools"].includes(k))
                  .map(([href, meta]) => (
                    <Link
                      key={href}
                      href={`/${href}`}
                      onClick={onClose}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-muted)] transition-all"
                    >
                      <span className="text-xl">{meta.emoji}</span>
                      <div>
                        <div className="text-sm font-semibold text-[var(--text)]">{meta.label}</div>
                        <div className="text-xs text-[var(--text-faint)]">Browse →</div>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-3xl mb-3">🔍</div>
              <p className="text-[var(--text-muted)] font-medium">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-sm text-[var(--text-faint)] mt-1">Try a different keyword — e.g. &ldquo;kafka&rdquo;, &ldquo;RAG&rdquo;, &ldquo;SQL window&rdquo;</p>
            </div>
          ) : (
            <div className="p-2">
              <p className="text-xs text-[var(--text-faint)] px-2 py-1.5 font-medium uppercase tracking-wide">
                {results.length} result{results.length !== 1 ? "s" : ""}
              </p>
              {results.map((item, i) => {
                const sm = sectionMeta(item.section);
                const isActive = i === activeIdx;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    data-idx={i}
                    onClick={onClose}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`flex gap-3 px-3 py-3 rounded-xl transition-colors mb-1 ${
                      isActive ? "bg-[var(--accent-soft)] border border-[var(--accent)]/30" : "hover:bg-[var(--bg-muted)] border border-transparent"
                    }`}
                  >
                    {/* Section icon */}
                    <div className="shrink-0 mt-0.5 text-xl">{sm.emoji}</div>

                    <div className="flex-1 min-w-0">
                      {/* Breadcrumb */}
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sm.soft}`}>
                          {sm.label}
                        </span>
                        {item.subsection && (
                          <>
                            <span className="text-[var(--text-faint)] text-xs">›</span>
                            <span className="text-[10px] text-[var(--text-faint)] capitalize bg-[var(--bg-muted)] px-2 py-0.5 rounded-full">
                              {item.subsection.replace(/-/g, " ")}
                            </span>
                          </>
                        )}
                        <span className="text-[10px] text-[var(--text-faint)] bg-[var(--bg-muted)] px-2 py-0.5 rounded-full">
                          {TYPE_LABELS[item.type] ?? item.type}
                        </span>
                        {item.difficulty && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[item.difficulty]}`}>
                            {item.difficulty}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <p className="text-sm font-semibold text-[var(--text)] leading-snug">
                        {highlight(item.title, query.trim())}
                      </p>

                      {/* Summary */}
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                        {highlight(item.summary, query.trim())}
                      </p>

                      {/* Tags */}
                      {item.tags.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {item.tags.slice(0, 4).map((t) => (
                            <span key={t} className="text-[10px] text-[var(--text-faint)] bg-[var(--bg-muted)] px-1.5 py-0.5 rounded">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className={`shrink-0 self-center transition-colors ${isActive ? "text-[var(--accent-text)]" : "text-[var(--text-faint)]"}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-[var(--border)] flex items-center gap-4 text-xs text-[var(--text-faint)]">
          <span className="flex items-center gap-1"><kbd className="bg-[var(--bg-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[10px]">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="bg-[var(--bg-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[10px]">↵</kbd> open</span>
          <span className="flex items-center gap-1"><kbd className="bg-[var(--bg-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[10px]">ESC</kbd> close</span>
          <span className="ml-auto">{index.length} items indexed</span>
        </div>
      </div>
    </div>
  );
}
