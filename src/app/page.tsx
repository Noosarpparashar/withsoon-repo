import Link from "next/link";
import { getFeatured, getAllContent } from "@/lib/content";
import ContentCard from "@/components/ui/ContentCard";

const PILLARS = [
  {
    href: "/tech-news",
    emoji: "📰",
    label: "Tech News",
    desc: "Latest AI & Big Data news, tool launches, model releases — date-sorted, click for details.",
    borderClass: "hover:border-[var(--yellow-text)]/50",
    badgeClass: "bg-[var(--yellow-soft)] text-[var(--yellow-text)]",
  },
  {
    href: "/big-data",
    emoji: "🗄️",
    label: "Big Data",
    desc: "Kafka, Spark, Flink, Airflow, dbt, Iceberg — system design, setup guides, cheatsheets.",
    borderClass: "hover:border-[var(--blue-text)]/50",
    badgeClass: "bg-[var(--blue-soft)] text-[var(--blue-text)]",
  },
  {
    href: "/ai",
    emoji: "🤖",
    label: "AI & LLMs",
    desc: "OpenAI, Claude, Gemini, Llama — RAG, agents, prompts, fine-tuning, industry patterns.",
    borderClass: "hover:border-[var(--purple-text)]/50",
    badgeClass: "bg-[var(--purple-soft)] text-[var(--purple-text)]",
  },
  {
    href: "/tools",
    emoji: "🛠️",
    label: "Tools",
    desc: "Curated directory of AI and Big Data tools the industry is actually using.",
    borderClass: "hover:border-[var(--green-text)]/50",
    badgeClass: "bg-[var(--green-soft)] text-[var(--green-text)]",
  },
  {
    href: "/interview",
    emoji: "🎯",
    label: "Interview Prep",
    desc: "Topic-wise Q&A, grilling sessions, system design prep for Big Data and AI roles.",
    borderClass: "hover:border-[var(--orange-text)]/50",
    badgeClass: "bg-[var(--orange-soft)] text-[var(--orange-text)]",
  },
  {
    href: "/reference",
    emoji: "📚",
    label: "Reference",
    desc: "SQL cheatsheets, DSA patterns, system design quick-ref, cloud services overview.",
    borderClass: "hover:border-[var(--pink-text)]/50",
    badgeClass: "bg-[var(--pink-soft)] text-[var(--pink-text)]",
  },
];

export default function Home() {
  const featured = getFeatured();
  const recent = getAllContent().slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Hero */}
      <section className="py-20 text-center">
        <div className="inline-flex items-center gap-2 mb-6 rounded-full bg-[var(--accent-soft)] border border-[var(--accent)]/20 px-4 py-1.5 text-sm text-[var(--accent-text)] font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Built in public · Updated as the industry moves
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight text-[var(--text)]">
          Everything for a{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--blue)] via-[var(--accent)] to-[var(--purple)]">
            Big Data + AI Engineer
          </span>
        </h1>
        <p className="text-lg md:text-xl text-[var(--text-muted)] max-w-3xl mx-auto mb-10">
          System design · Setup guides · LLM comparisons · Interview prep · Cheatsheets · Tech news.
          One platform, everything you need for daily work and career growth.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <Link href="/big-data" className="px-6 py-3 rounded-xl bg-[var(--blue)] hover:opacity-90 text-white font-semibold transition-opacity">
            🗄️ Big Data Hub
          </Link>
          <Link href="/ai" className="px-6 py-3 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold transition-opacity">
            🤖 AI & LLMs Hub
          </Link>
          <Link href="/tech-news" className="px-6 py-3 rounded-xl border border-[var(--border)] hover:border-[var(--yellow-text)]/50 bg-[var(--bg-card)] text-[var(--text)] hover:text-[var(--yellow-text)] font-semibold transition-colors">
            📰 Latest News →
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-10 text-sm text-[var(--text-muted)]">
          {[["6", "Sections"], ["100+", "Topics covered"], ["∞", "Growing daily"]].map(([val, label]) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-[var(--text)]">{val}</div>
              <div>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-6 text-[var(--text)]">Explore by section</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PILLARS.map(({ href, emoji, label, desc, borderClass, badgeClass }) => (
            <Link
              key={href}
              href={href}
              className={`group p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] transition-all hover:shadow-md ${borderClass}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{emoji}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badgeClass}`}>{label}</span>
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</p>
              <div className="mt-4 text-xs text-[var(--text-faint)] group-hover:text-[var(--accent-text)] transition-colors font-medium">
                Explore {label} →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-6 text-[var(--text)]">⭐ Featured</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((item) => (
              <ContentCard key={item.slug} item={item} href={`/${item.section}/${item.slug}`} />
            ))}
          </div>
        </section>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-6 text-[var(--text)]">🕐 Recently added</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recent.map((item) => (
              <ContentCard key={item.slug} item={item} href={`/${item.section}/${item.slug}`} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mb-20 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-10 text-center">
        <h2 className="text-3xl font-bold mb-3 text-[var(--text)]">Built in public, growing daily</h2>
        <p className="text-[var(--text-muted)] max-w-xl mx-auto mb-6">
          Every guide, comparison, and cheatsheet is added as the industry evolves. No filler — just things that actually work in production.
        </p>
        <Link href="/tech-news" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold transition-opacity">
          📰 See what's new
        </Link>
      </section>
    </div>
  );
}
