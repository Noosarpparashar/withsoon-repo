"use client";

import { useState } from "react";
import ContentCard from "./ContentCard";
import type { ContentMeta, Section } from "@/lib/content";

type Props = {
  items: ContentMeta[];
  subsections: { key: string; label: string }[];
  section: Section;
};

export default function SubsectionFilter({ items, subsections, section }: Props) {
  const [active, setActive] = useState("all");

  const filtered =
    active === "all" ? items : items.filter((i) => i.subsection === active || i.type === active || i.tags.includes(active));

  return (
    <div>
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActive("all")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === "all"
              ? "bg-[var(--accent)] text-white"
              : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          All ({items.length})
        </button>
        {subsections.map(({ key, label }) => {
          const count = items.filter((i) => i.subsection === key || i.type === key || i.tags.includes(key)).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                active === key
                  ? "bg-[var(--accent)] text-white"
                  : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-12 text-center text-gray-500">
          Coming soon — content for this section is being added.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <ContentCard
              key={item.slug}
              item={item}
              href={`/${section}/${item.slug}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
