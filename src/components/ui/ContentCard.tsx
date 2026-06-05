import Link from "next/link";
import type { ContentMeta } from "@/lib/content";

const TYPE_LABELS: Record<string, string> = {
  "system-design": "System Design",
  "interview-qa":  "Interview Q&A",
  "how-to":        "How-To",
  setup:           "Setup Guide",
  cheatsheet:      "Cheatsheet",
  comparison:      "Comparison",
  guide:           "Guide",
  news:            "News",
  tool:            "Tool",
  reference:       "Reference",
};

const DIFFICULTY: Record<string, string> = {
  beginner:     "bg-[var(--green-soft)] text-[var(--green-text)]",
  intermediate: "bg-[var(--orange-soft)] text-[var(--orange-text)]",
  advanced:     "bg-[var(--pink-soft)] text-[var(--pink-text)]",
};

export default function ContentCard({ item, href }: { item: ContentMeta; href: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--accent-soft)] text-[var(--accent-text)]">
          {TYPE_LABELS[item.type] ?? item.type}
        </span>
        {item.difficulty && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY[item.difficulty]}`}>
            {item.difficulty}
          </span>
        )}
        {item.featured && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--yellow-soft)] text-[var(--yellow-text)] font-medium">
            ★ Featured
          </span>
        )}
      </div>

      <h3 className="font-semibold text-[var(--text)] group-hover:text-[var(--accent-text)] transition-colors mb-2 leading-snug">
        {item.title}
      </h3>
      <p className="text-sm text-[var(--text-muted)] flex-1 leading-relaxed line-clamp-2">{item.summary}</p>

      <div className="flex items-center justify-between mt-4">
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs text-[var(--text-faint)] bg-[var(--bg-muted)] px-2 py-0.5 rounded">
              #{tag}
            </span>
          ))}
        </div>
        {item.date && (
          <span className="text-xs text-[var(--text-faint)] shrink-0 ml-2">{item.date}</span>
        )}
      </div>
    </Link>
  );
}
