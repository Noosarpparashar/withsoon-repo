import Link from "next/link";
import { getFeatured, getAllContent } from "@/lib/content";
import ContentCard from "@/components/ui/ContentCard";

const PILLARS = [
  {
    href: "/radar",
    emoji: "📡",
    label: "Radar",
    desc: "Latest AI & Big Data news, tool launches, model releases — date-sorted, click for details.",
    color: "border-yellow-500/30 hover:border-yellow-400/60",
    badge: "text-yellow-400 bg-yellow-400/10",
  },
  {
    href: "/big-data",
    emoji: "🗄️",
    label: "Big Data",
    desc: "Kafka, Spark, Flink, Airflow, dbt, Iceberg — system design, setup guides, cheatsheets.",
    color: "border-blue-500/30 hover:border-blue-400/60",
    badge: "text-blue-400 bg-blue-400/10",
  },
  {
    href: "/ai",
    emoji: "🤖",
    label: "AI & LLMs",
    desc: "OpenAI, Claude, Gemini, Llama — RAG, agents, prompts, fine-tuning, industry patterns.",
    color: "border-purple-500/30 hover:border-purple-400/60",
    badge: "text-purple-400 bg-purple-400/10",
  },
  {
    href: "/tools",
    emoji: "🛠️",
    label: "Tools",
    desc: "Curated directory of AI and Big Data tools the industry is actually using.",
    color: "border-green-500/30 hover:border-green-400/60",
    badge: "text-green-400 bg-green-400/10",
  },
  {
    href: "/interview",
    emoji: "🎯",
    label: "Interview Prep",
    desc: "Topic-wise Q&A, grilling sessions, system design prep for Big Data and AI roles.",
    color: "border-orange-500/30 hover:border-orange-400/60",
    badge: "text-orange-400 bg-orange-400/10",
  },
  {
    href: "/reference",
    emoji: "📚",
    label: "Reference",
    desc: "SQL cheatsheets, DSA patterns, system design quick-ref, cloud services overview.",
    color: "border-pink-500/30 hover:border-pink-400/60",
    badge: "text-pink-400 bg-pink-400/10",
  },
];

const STATS = [
  { label: "Sections", value: "6" },
  { label: "Topics covered", value: "100+" },
  { label: "Built for", value: "Big Data + AI Engineers" },
];

export default function Home() {
  const featured = getFeatured();
  const recent = getAllContent().slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Hero */}
      <section className="py-20 text-center">
        <div className="inline-flex items-center gap-2 mb-6 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 px-4 py-1.5 text-sm text-[var(--accent-light)]">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          Built in public · Updated as the industry moves
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
          Everything for a{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-[var(--accent-light)] to-purple-400">
            Big Data + AI Engineer
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10">
          System design · Setup guides · LLM comparisons · Interview prep · Cheatsheets · New tool radar.
          One platform, everything you need for daily work and career growth.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <Link href="/big-data" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors">
            🗄️ Big Data Hub
          </Link>
          <Link href="/ai" className="px-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white font-semibold transition-colors">
            🤖 AI & LLMs Hub
          </Link>
          <Link href="/radar" className="px-6 py-3 rounded-xl border border-[var(--border)] hover:border-yellow-400/60 text-gray-300 hover:text-white font-semibold transition-colors">
            📡 Latest Radar →
          </Link>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
          {STATS.map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-white">{value}</div>
              <div>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars grid */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-6">Explore by section</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PILLARS.map(({ href, emoji, label, desc, color, badge }) => (
            <Link
              key={href}
              href={href}
              className={`group p-6 rounded-xl border bg-[var(--muted)] transition-all hover:shadow-lg ${color}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{emoji}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge}`}>{label}</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              <div className="mt-4 text-xs text-gray-600 group-hover:text-[var(--accent-light)] transition-colors">
                Explore {label} →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured content */}
      {featured.length > 0 && (
        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-6">⭐ Featured</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((item) => (
              <ContentCard key={item.slug} item={item} href={`/${item.section}/${item.slug}`} />
            ))}
          </div>
        </section>
      )}

      {/* Recent content */}
      {recent.length > 0 && (
        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-6">🕐 Recently added</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recent.map((item) => (
              <ContentCard key={item.slug} item={item} href={`/${item.section}/${item.slug}`} />
            ))}
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="mb-20 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--muted)] to-[var(--background)] p-10 text-center">
        <h2 className="text-3xl font-bold mb-3">Built in public, growing daily</h2>
        <p className="text-gray-400 max-w-xl mx-auto mb-6">
          Every guide, comparison, and cheatsheet is added as the industry evolves. No filler — just things that actually work in production.
        </p>
        <Link href="/radar" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white font-semibold transition-colors">
          📡 See what's new
        </Link>
      </section>
    </div>
  );
}
