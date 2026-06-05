import Link from "next/link";
import { getFeatured, getAllContent, getContentBySection } from "@/lib/content";
import ContentCard from "@/components/ui/ContentCard";

const SECTIONS = [
  {
    href: "/big-data",
    emoji: "🗄️",
    label: "Big Data",
    desc: "Kafka, Spark, Flink, Airflow, dbt — system design, setup guides, deep dives.",
    borderClass: "hover:border-[var(--blue-text)]/50",
    badgeClass: "bg-[var(--blue-soft)] text-[var(--blue-text)]",
    tagline: "For the data engineer",
  },
  {
    href: "/ai",
    emoji: "🤖",
    label: "AI & LLMs",
    desc: "OpenAI, Claude, Gemini, Llama — RAG pipelines, agents, prompts, fine-tuning.",
    borderClass: "hover:border-[var(--purple-text)]/50",
    badgeClass: "bg-[var(--purple-soft)] text-[var(--purple-text)]",
    tagline: "For the AI builder",
  },
  {
    href: "/interview",
    emoji: "🎯",
    label: "Interview Prep",
    desc: "Kafka, Spark, SQL, system design, AI/ML — topic-wise Q&A and grilling sessions.",
    borderClass: "hover:border-[var(--orange-text)]/50",
    badgeClass: "bg-[var(--orange-soft)] text-[var(--orange-text)]",
    tagline: "Crack the next role",
  },
  {
    href: "/cheatsheets",
    emoji: "📋",
    label: "Cheatsheets",
    desc: "SQL · System Design · DSA · Cloud — fast answers when you need them most.",
    borderClass: "hover:border-[var(--pink-text)]/50",
    badgeClass: "bg-[var(--pink-soft)] text-[var(--pink-text)]",
    tagline: "Bookmark this",
  },
  {
    href: "/tools",
    emoji: "🛠️",
    label: "Tools",
    desc: "Honest comparisons of AI and Big Data tools — what to use, what to avoid.",
    borderClass: "hover:border-[var(--green-text)]/50",
    badgeClass: "bg-[var(--green-soft)] text-[var(--green-text)]",
    tagline: "Pick the right stack",
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
            <div className="rounded-2xl overflow-hidden border border-[#2d3748] shadow-xl bg-[#1a202c]">
              {/* Board header */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-white/10 bg-[#2d3748]">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📌</span>
                  <div>
                    <div className="font-bold text-white text-sm leading-tight">Tech News</div>
                    <div className="text-xs text-slate-400">Latest in AI & Big Data</div>
                  </div>
                </div>
                <Link
                  href="/tech-news"
                  className="text-xs font-semibold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors border border-white/20"
                >
                  All news →
                </Link>
              </div>

              {/* News items */}
              <div className="p-3 space-y-2">
                {newsItems.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    First news item coming soon.
                  </div>
                ) : (
                  newsItems.map((item, i) => {
                    const dotColor = i === 0 ? "bg-red-400" : i === 1 ? "bg-orange-400" : i < 4 ? "bg-blue-400" : "bg-emerald-400";
                    return (
                      <Link
                        key={item.slug}
                        href={`/tech-news/${item.slug}`}
                        className="group flex gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all"
                      >
                        <div className="shrink-0 pt-1.5">
                          <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 group-hover:text-white leading-snug line-clamp-2 transition-colors">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {item.tags.slice(0, 2).map((t) => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400 font-medium">
                                {t}
                              </span>
                            ))}
                            {item.date && (
                              <span className="text-[10px] text-slate-500">{item.date}</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 self-center text-slate-600 group-hover:text-slate-300 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>

              {/* Board footer */}
              <div className="px-5 py-3 border-t border-white/10 text-center">
                <Link href="/tech-news" className="text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors">
                  View all news & updates →
                </Link>
              </div>
            </div>
          </div>

          {/* ── Section cards ────────────────────────────────── */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-5 text-[var(--text)]">Explore by section</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SECTIONS.map(({ href, emoji, label, desc, borderClass, badgeClass, tagline }) => (
                <Link
                  key={href}
                  href={href}
                  className={`group p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] transition-all hover:shadow-md ${borderClass}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{emoji}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badgeClass}`}>{label}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-faint)] bg-[var(--bg-muted)] px-2 py-0.5 rounded-full border border-[var(--border)] whitespace-nowrap">
                      {tagline}
                    </span>
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
