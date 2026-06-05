import Link from "next/link";
import { getAllCheatsheets, getContentBySection } from "@/lib/content";
import type { ContentMeta } from "@/lib/content";

export const metadata = {
  title: "Cheatsheets — withsoon",
  description: "Quick-reference cheatsheets for Kafka, Spark, SQL, System Design, Cloud, and more — bookmark this page.",
};

const CATEGORIES = [
  { key: "kafka",         label: "Kafka",         emoji: "⚡", color: "bg-[var(--blue-soft)] text-[var(--blue-text)]" },
  { key: "spark",         label: "Spark",         emoji: "🔥", color: "bg-[var(--orange-soft)] text-[var(--orange-text)]" },
  { key: "sql",           label: "SQL",           emoji: "🗃️", color: "bg-[var(--green-soft)] text-[var(--green-text)]" },
  { key: "system-design", label: "System Design", emoji: "🏗️", color: "bg-[var(--purple-soft)] text-[var(--purple-text)]" },
  { key: "python",        label: "Python",        emoji: "🐍", color: "bg-[var(--accent-soft)] text-[var(--accent-text)]" },
  { key: "cloud",         label: "Cloud",         emoji: "☁️", color: "bg-[var(--blue-soft)] text-[var(--blue-text)]" },
  { key: "dsa",           label: "DSA",           emoji: "🧩", color: "bg-[var(--pink-soft)] text-[var(--pink-text)]" },
  { key: "ai",            label: "AI / LLMs",     emoji: "🤖", color: "bg-[var(--purple-soft)] text-[var(--purple-text)]" },
];

function CheatCard({ item }: { item: ContentMeta }) {
  const href = `/${item.section}/${item.slug}`;
  const catColor =
    CATEGORIES.find((c) => item.tags.includes(c.key) || item.subsection === c.key)?.color ??
    "bg-[var(--bg-muted)] text-[var(--text-muted)]";

  return (
    <Link
      href={href}
      className="group flex flex-col p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${catColor}`}>
          {item.subsection ?? item.tags[0] ?? "cheatsheet"}
        </span>
        <svg className="w-4 h-4 text-[var(--text-faint)] group-hover:text-[var(--accent-text)] transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <h3 className="font-semibold text-[var(--text)] group-hover:text-[var(--accent-text)] transition-colors mb-2 leading-snug">
        {item.title}
      </h3>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed line-clamp-2 flex-1">{item.summary}</p>
    </Link>
  );
}

export default function CheatsheetPage() {
  // Pull cheatsheets from all sections + reference section content
  const crossSection = getAllCheatsheets();
  const reference = getContentBySection("reference");
  const seen = new Set<string>();
  const all = [...crossSection, ...reference].filter((c) => {
    const key = `${c.section}/${c.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="rounded-2xl border border-[var(--border)] p-8 mb-10 bg-[var(--bg-card)]">
        <div className="text-4xl mb-3">📋</div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-[var(--pink-text)]">Cheatsheets</h1>
        <p className="text-[var(--text-muted)] text-lg max-w-2xl">
          Quick-reference cards across every tool and topic. Bookmark this page — it's built to be opened mid-work when you need a fast answer.
        </p>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map(({ key, label, emoji, color }) => (
          <span key={key} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium border border-transparent ${color}`}>
            <span>{emoji}</span>{label}
          </span>
        ))}
      </div>

      {/* Grid */}
      {all.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-16 text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-[var(--text-muted)] mb-2 font-semibold">Cheatsheets are being added.</p>
          <p className="text-sm text-[var(--text-faint)]">
            They live inside Big Data, AI, and Interview sections — when tagged as "cheatsheet" they appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {all.map((item) => (
            <CheatCard key={`${item.section}/${item.slug}`} item={item} />
          ))}
        </div>
      )}

      {/* Explain the system */}
      <div className="mt-12 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-6">
        <h2 className="font-semibold text-[var(--text)] mb-2">How cheatsheets work on withsoon</h2>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          Cheatsheets aren't a separate section — they live <em>inside</em> each topic (Kafka, Spark, SQL, etc.) and automatically appear here too.
          When you're in Big Data → Kafka, you'll find the Kafka CLI cheatsheet. When you search here, you get everything in one place.
          New cheatsheets are added alongside every deep-dive guide.
        </p>
      </div>
    </div>
  );
}
