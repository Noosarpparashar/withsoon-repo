import Link from "next/link";
import { getContentBySection } from "@/lib/content";
import type { ContentMeta } from "@/lib/content";

export const metadata = {
  title: "Tech News — withsoon",
  description: "Latest AI and Big Data news, tool launches, model releases — date-sorted.",
};

const CATEGORIES = ["All", "AI", "Big Data", "Cloud", "Open Source", "Tools"];

function NewsItem({ item }: { item: ContentMeta }) {
  return (
    <Link
      href={`/tech-news/${item.slug}`}
      className="group flex gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:shadow-md transition-all"
    >
      <div className="shrink-0 mt-1">
        <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-1.5 group-hover:scale-125 transition-transform" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {item.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-[var(--yellow-soft)] text-[var(--yellow-text)] font-medium">
              {tag}
            </span>
          ))}
          <span className="text-xs text-[var(--text-faint)]">{item.date}</span>
        </div>
        <h3 className="font-semibold text-[var(--text)] group-hover:text-[var(--accent-text)] transition-colors leading-snug mb-1">
          {item.title}
        </h3>
        <p className="text-sm text-[var(--text-muted)] line-clamp-2">{item.summary}</p>
      </div>
      <div className="shrink-0 self-center text-[var(--text-faint)] group-hover:text-[var(--accent-text)] transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

export default function TechNewsPage() {
  const items = getContentBySection("tech-news");
  // also pull radar items for backward compat
  const radarItems = getContentBySection("radar");
  const all = [...items, ...radarItems].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">📰</span>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--yellow-text)]">Tech News</h1>
            <p className="text-[var(--text-muted)]">Latest in AI and Big Data — tool launches, model releases, industry moves.</p>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mt-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                cat === "All"
                  ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:text-[var(--text)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* News feed */}
      {all.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-16 text-center">
          <div className="text-4xl mb-4">📰</div>
          <p className="text-[var(--text-muted)]">First news item coming soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {all.map((item) => (
            <NewsItem key={item.slug} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
