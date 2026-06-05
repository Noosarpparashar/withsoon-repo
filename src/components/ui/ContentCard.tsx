import Link from "next/link";
import type { ContentMeta } from "@/lib/content";

const SECTION_COLORS: Record<string, string> = {
  radar: "text-yellow-400 bg-yellow-400/10",
  "big-data": "text-blue-400 bg-blue-400/10",
  ai: "text-purple-400 bg-purple-400/10",
  tools: "text-green-400 bg-green-400/10",
  interview: "text-orange-400 bg-orange-400/10",
  reference: "text-pink-400 bg-pink-400/10",
};

const DIFFICULTY_COLORS = {
  beginner: "text-green-400 bg-green-400/10",
  intermediate: "text-yellow-400 bg-yellow-400/10",
  advanced: "text-red-400 bg-red-400/10",
};

const TYPE_LABELS: Record<string, string> = {
  "system-design": "System Design",
  "interview-qa": "Interview Q&A",
  "how-to": "How-To",
  setup: "Setup Guide",
  cheatsheet: "Cheatsheet",
  comparison: "Comparison",
  guide: "Guide",
  news: "News",
  tool: "Tool",
  reference: "Reference",
};

export default function ContentCard({ item, href }: { item: ContentMeta; href: string }) {
  const sectionColor = SECTION_COLORS[item.section] ?? "text-gray-400 bg-gray-400/10";
  return (
    <Link
      href={href}
      className="group flex flex-col p-5 rounded-xl border border-[var(--border)] bg-[var(--muted)] hover:border-[var(--accent)]/40 transition-all hover:shadow-lg hover:shadow-[var(--accent)]/5"
    >
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sectionColor}`}>
          {item.section === "big-data" ? "Big Data" : item.section === "ai" ? "AI & LLMs" : item.section.charAt(0).toUpperCase() + item.section.slice(1)}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
          {TYPE_LABELS[item.type] ?? item.type}
        </span>
        {item.difficulty && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[item.difficulty]}`}>
            {item.difficulty}
          </span>
        )}
        {item.featured && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent-light)]">
            ★ Featured
          </span>
        )}
      </div>
      <h3 className="font-semibold text-white group-hover:text-[var(--accent-light)] transition-colors mb-2 leading-snug">
        {item.title}
      </h3>
      <p className="text-sm text-gray-400 flex-1 leading-relaxed line-clamp-2">{item.summary}</p>
      <div className="flex items-center justify-between mt-4">
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">
              #{tag}
            </span>
          ))}
        </div>
        {item.date && (
          <span className="text-xs text-gray-600 shrink-0 ml-2">{item.date}</span>
        )}
      </div>
    </Link>
  );
}
