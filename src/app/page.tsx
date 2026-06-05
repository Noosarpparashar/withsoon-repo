import Link from "next/link";
import { getFeatured, getAllContent, getContentBySection } from "@/lib/content";
import ContentCard from "@/components/ui/ContentCard";

const SECTIONS = [
  {
    href: "/big-data",
    emoji: "🗄️",
    label: "Big Data",
    desc: "Kafka, Spark, Flink, Airflow, dbt — system design, setup guides, cheatsheets.",
    borderClass: "hover:border-[var(--blue-text)]/50",
    badgeClass: "bg-[var(--blue-soft)] text-[var(--blue-text)]",
  },
  {
    href: "/ai",
    emoji: "🤖",
    label: "AI & LLMs",
    desc: "OpenAI, Claude, Gemini, Llama — RAG, agents, prompts, fine-tuning.",
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
    desc: "Topic-wise Q&A, grilling sessions, system design prep for Big Data & AI roles.",
    borderClass: "hover:border-[var(--orange-text)]/50",
    badgeClass: "bg-[var(--orange-soft)] text-[var(--orange-text)]",
  },
  {
    href: "/reference",
    emoji: "📚",
    label: "Reference",
    desc: "SQL cheatsheets, DSA patterns, system design quick-ref, cloud services.",
    borderClass: "hover:border-[var(--pink-text)]/50",
    badgeClass: "bg-[var(--pink-soft)] text-[var(--pink-text)]",
  },
];

export default function Home() {
  const featured = getFeatured();
  const recent = getAllContent()
    .filter((i) => i.section !== "tech-news" && i.section !== "radar")
    .slice(0, 6);

  const newsItems = [
    ...getContentBySection("tech-news"),
    ...getContentBySection("radar"),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Hero */}
      <section className="py-16 text-center">
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
        <div className="flex flex-wrap gap-4 justify-center mb-10">
          <Link href="/big-data" className="px-6 py-3 rounded-xl bg-[var(--blue)] hover:opacity-90 text-white font-semibold transition-opacity">
            🗄️ Big Data Hub
          </Link>
          <Link href="/ai" className="px-6 py-3 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold transition-opacity">
            🤖 AI & LLMs Hub
          </Link>
          <Link href="/interview" className="px-6 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] hover:border-[var(--orange-text)]/50 font-semibold transition-colors">
            🎯 Interview Prep
          </Link>
        </div>
      </section>

      {/* Main layout: Noticeboard + Sections */}
      <section className="mb-20">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Noticeboard ─────────────────────────────────── */}
          <div className="lg:w-[380px] shrink-0">
            {/* Cork board panel */}
            <div
              className="rounded-2xl overflow-hidden border-2 border-[#c8a96e] shadow-lg"
              style={{ background: "linear-gradient(145deg, #d4a853 0%, #c49040 40%, #b8823a 100%)" }}
            >
              {/* Board header */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-[#a87030]/40">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📌</span>
                  <div>
                    <div className="font-bold text-[#3d1f00] text-base leading-tight">Tech News</div>
                    <div className="text-xs text-[#7a4a10]">Latest in AI & Big Data</div>
                  </div>
                </div>
                <Link
                  href="/tech-news"
                  className="text-xs font-semibold text-[#3d1f00] bg-[#f5e0b0] hover:bg-[#ffe9c0] px-3 py-1.5 rounded-full transition-colors border border-[#c8a060]"
                >
                  All news →
                </Link>
              </div>

              {/* News pins */}
              <div className="p-4 space-y-2.5">
                {newsItems.length === 0 ? (
                  <div className="text-center py-8 text-[#7a4a10] text-sm">
                    First news item coming soon.
                  </div>
                ) : (
                  newsItems.map((item, i) => (
                    <Link
                      key={item.slug}
                      href={`/tech-news/${item.slug}`}
                      className="group flex gap-3 p-3 rounded-xl bg-[#fdf6e3] hover:bg-white border border-[#e8d5a0] hover:border-[#c8a060] transition-all shadow-sm hover:shadow-md"
                    >
                      {/* Pin dot */}
                      <div className="shrink-0 pt-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${i < 2 ? "bg-red-500" : i < 4 ? "bg-blue-500" : "bg-green-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#2d1a00] group-hover:text-[#6d28d9] leading-snug line-clamp-2 transition-colors">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {item.tags.slice(0, 2).map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[#e8d5a0] text-[#7a4a10] font-medium">
                              {t}
                            </span>
                          ))}
                          {item.date && (
                            <span className="text-[10px] text-[#a07040]">{item.date}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              {/* Board footer */}
              <div className="px-5 py-3 border-t border-[#a87030]/40 text-center">
                <Link href="/tech-news" className="text-xs text-[#5a3010] hover:text-[#3d1f00] font-medium transition-colors">
                  View all news & updates →
                </Link>
              </div>
            </div>
          </div>

          {/* ── Section cards ────────────────────────────────── */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-5 text-[var(--text)]">Explore by section</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SECTIONS.map(({ href, emoji, label, desc, borderClass, badgeClass }) => (
                <Link
                  key={href}
                  href={href}
                  className={`group p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] transition-all hover:shadow-md ${borderClass}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{emoji}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badgeClass}`}>{label}</span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</p>
                  <div className="mt-3 text-xs text-[var(--text-faint)] group-hover:text-[var(--accent-text)] transition-colors font-medium">
                    Explore {label} →
                  </div>
                </Link>
              ))}
            </div>
          </div>
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
