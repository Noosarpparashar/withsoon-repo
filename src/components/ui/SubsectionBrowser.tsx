"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContentMeta, Section } from "@/lib/content";

type Subsection = {
  key: string;
  label: string;
  emoji: string;
  desc: string;
};

type Props = {
  items: ContentMeta[];
  subsections: Subsection[];
  section: Section;
  accentClass: string;
  softClass: string;
};

export default function SubsectionBrowser({ items, subsections, section, accentClass, softClass }: Props) {
  const [active, setActive] = useState<string | null>(null);

  const getItems = (key: string) =>
    items.filter((i) => i.subsection === key || i.type === key || i.tags.includes(key));

  if (active) {
    const filtered = getItems(active);
    const sub = subsections.find((s) => s.key === active)!;
    return (
      <div>
        {/* Back button */}
        <button
          onClick={() => setActive(null)}
          className="flex items-center gap-2 mb-6 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to all sections
        </button>

        {/* Sub-section header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{sub.emoji}</span>
          <div>
            <h2 className={`text-2xl font-bold ${accentClass}`}>{sub.label}</h2>
            <p className="text-sm text-[var(--text-muted)]">{sub.desc}</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center text-[var(--text-muted)]">
            Content for this section is coming soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item) => (
              <Link
                key={item.slug}
                href={`/${section}/${item.slug}`}
                className="group flex flex-col p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:shadow-md transition-all"
              >
                <div className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit mb-3 ${softClass}`}>
                  {item.type.replace(/-/g, " ")}
                </div>
                <h3 className={`font-semibold text-[var(--text)] group-hover:${accentClass} transition-colors mb-2 leading-snug`}>
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)] flex-1 leading-relaxed line-clamp-2">{item.summary}</p>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-1 flex-wrap">
                    {item.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-xs text-[var(--text-faint)] bg-[var(--bg-muted)] px-2 py-0.5 rounded">#{t}</span>
                    ))}
                  </div>
                  {item.date && <span className="text-xs text-[var(--text-faint)] ml-2 shrink-0">{item.date}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Subsection tiles view
  return (
    <div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center text-[var(--text-muted)]">
          Content is being added — check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {subsections.map(({ key, label, emoji, desc }) => {
            const count = getItems(key).length;
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className="group text-left p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{emoji}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${softClass}`}>
                    {count} {count === 1 ? "item" : "items"}
                  </span>
                </div>
                <h3 className={`font-semibold text-[var(--text)] group-hover:${accentClass} transition-colors mb-1`}>
                  {label}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</p>
                <div className={`mt-4 text-xs font-medium ${accentClass} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Browse {label} →
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
