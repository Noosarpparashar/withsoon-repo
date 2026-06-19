import Link from "next/link";
import { getFeatured, getAllContent, getContentBySection, getSetupGuides } from "@/lib/content";
import ContentCard from "@/components/ui/ContentCard";
import { LLMBenchmarkButton } from "@/components/ui/LLMCharts";

const SECTIONS = [
  {
    href: "/big-data",
    emoji: "🗄️",
    label: "Big Data",
    tagline: "For the data engineer",
    desc: "System Design · Kafka · Spark · Flink · Airflow · dbt",
    detail: "Setup guides, deep dives, cheatsheets, and interview Q&A for every major Big Data tool.",
    borderClass: "hover:border-[var(--blue-text)]/60",
    badgeClass: "bg-[var(--blue-soft)] text-[var(--blue-text)]",
    highlights: ["System Design", "Kafka", "Spark", "Setup Guides"],
  },
  {
    href: "/system-design",
    emoji: "🏗️",
    label: "System Design",
    tagline: "Ace the design round",
    desc: "Netflix · Uber · YouTube · WhatsApp · BookMyShow",
    detail: "Interactive architecture diagrams, trade-offs, capacity estimates, and mock interviews. Built for senior engineering roles.",
    borderClass: "hover:border-[var(--green-text)]/60",
    badgeClass: "bg-[var(--green-soft)] text-[var(--green-text)]",
    highlights: ["Netflix", "Architecture Maps", "Mock Interview", "Capacity Math"],
  },
  {
    href: "/ai",
    emoji: "🤖",
    label: "AI & LLMs",
    tagline: "For the AI builder",
    desc: "RAG · Agents · OpenAI · Claude · Gemini · Llama",
    detail: "Build production AI systems — RAG pipelines, agents, chatbots, fine-tuning, and model comparisons.",
    borderClass: "hover:border-[var(--purple-text)]/60",
    badgeClass: "bg-[var(--purple-soft)] text-[var(--purple-text)]",
    highlights: ["RAG Pipeline", "AI Agents", "Model Compare", "Setup Guides"],
  },
  {
    href: "/interview",
    emoji: "🎯",
    label: "Interview Prep",
    tagline: "Crack the next role",
    desc: "System Design · Kafka · Spark · SQL · AI/ML · Behavioral",
    detail: "Topic-wise Q&A banks, grilling sessions, and system design walkthroughs for Big Data and AI roles.",
    borderClass: "hover:border-[var(--orange-text)]/60",
    badgeClass: "bg-[var(--orange-soft)] text-[var(--orange-text)]",
    highlights: ["System Design", "Kafka Q&A", "SQL Patterns", "Behavioral"],
  },
];

const SETUP_SPOTLIGHTS = [
  { title: "Kafka local setup", slug: "kafka-local-setup", section: "big-data", emoji: "⚡", tag: "Kafka" },
  { title: "RAG pipeline from scratch", slug: "rag-pipeline-complete", section: "ai", emoji: "🔍", tag: "RAG" },
  { title: "Spark on local machine", slug: "spark-local-setup", section: "big-data", emoji: "🔥", tag: "Spark" },
  { title: "Debezium + Kafka CDC", slug: "debezium-cdc-setup", section: "big-data", emoji: "🔄", tag: "CDC" },
  { title: "Production chatbot with Claude", slug: "chatbot-claude-setup", section: "ai", emoji: "💬", tag: "Claude" },
  { title: "Airflow local setup", slug: "airflow-local-setup", section: "big-data", emoji: "🌬️", tag: "Airflow" },
];

export default function Home() {
  const featured = getFeatured();
  const recent = getAllContent()
    .filter((i) => i.section !== "tech-news" && i.section !== "radar")
    .slice(0, 6);
  const setupGuides = getSetupGuides();

  const newsItems = (() => {
    const seen = new Set<string>();
    return [
      ...getContentBySection("tech-news"),
      ...getContentBySection("radar"),
    ]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .filter((item) => {
        const key = item.title.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  })();

  return (
    <div className="mx-auto max-w-7xl px-4">

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="py-16 text-center">
        <div className="inline-flex items-center gap-2 mb-6 rounded-full bg-[var(--accent-soft)] border border-[var(--accent)]/20 px-4 py-1.5 text-sm text-[var(--accent-text)] font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Built in public · Updated as the industry moves
        </div>
        <h1 className="font-bold tracking-tight mb-6">
          <div className="text-4xl md:text-6xl mb-1 font-bold text-[var(--text-muted)]">
            Everything for a
          </div>
          <div className="text-5xl md:text-7xl leading-tight text-transparent bg-clip-text bg-gradient-to-r from-[var(--blue)] via-[var(--accent)] to-[var(--purple)]">
            Big Data + AI Engineer
          </div>
        </h1>
        <p className="text-lg md:text-xl text-[var(--text-muted)] max-w-3xl mx-auto mb-10">
          System Design · Setup Guides · LLM Deep Dives · Interview Prep · Cheatsheets.
          One platform — daily work, career growth, and staying current.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          <Link href="/big-data" className="px-6 py-3 rounded-xl bg-[var(--blue)] hover:opacity-90 text-white font-semibold transition-opacity">
            🗄️ Big Data Hub
          </Link>
          <Link href="/ai" className="px-6 py-3 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold transition-opacity">
            🤖 AI & LLMs Hub
          </Link>
          <Link href="/interview" className="px-6 py-3 rounded-xl bg-[var(--orange)] hover:opacity-90 text-white font-semibold transition-opacity">
            🎯 Interview Prep
          </Link>
          <Link href="/cheatsheets" className="px-6 py-3 rounded-xl bg-[var(--pink)] hover:opacity-90 text-white font-semibold transition-opacity">
            📋 Cheatsheets
          </Link>
        </div>
        {/* Benchmark trigger — sits below the main CTAs, centered */}
        <div className="flex justify-center">
          <LLMBenchmarkButton />
        </div>
      </section>

      {/* ── Noticeboard + Sections ────────────────────────── */}
      <section className="mb-20">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Noticeboard */}
          <div className="lg:w-[360px] shrink-0">
            <div className="rounded-2xl overflow-hidden border border-[#2d3748] shadow-xl bg-[#1a202c] h-full flex flex-col">
              <div className="px-5 py-4 flex items-center justify-between border-b border-white/10 bg-[#2d3748]">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📌</span>
                  <div>
                    <div className="font-bold text-white text-sm leading-tight">Tech News</div>
                    <div className="text-xs text-slate-400">Latest in AI & Big Data</div>
                  </div>
                </div>
                <Link href="/tech-news" className="text-xs font-semibold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors border border-white/20">
                  All news →
                </Link>
              </div>
              <div className="p-3 space-y-2 flex-1">
                {newsItems.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">First news item coming soon.</div>
                ) : newsItems.map((item, i) => {
                  const dot = i === 0 ? "bg-red-400" : i === 1 ? "bg-orange-400" : i < 4 ? "bg-blue-400" : "bg-emerald-400";
                  return (
                    <Link key={`${item.section}-${item.slug}`} href={`/tech-news/${item.slug}`}
                      className="group flex gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all">
                      <div className="shrink-0 pt-1.5"><div className={`w-2 h-2 rounded-full ${dot}`} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 group-hover:text-white leading-snug line-clamp-2 transition-colors">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {item.tags.slice(0, 2).map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400 font-medium">{t}</span>
                          ))}
                          {item.date && <span className="text-[10px] text-slate-500">{item.date}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 self-center text-slate-600 group-hover:text-slate-300 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="px-5 py-3 border-t border-white/10 text-center">
                <Link href="/tech-news" className="text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors">
                  View all news & updates →
                </Link>
              </div>
            </div>
          </div>

          {/* Section cards */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-5 text-[var(--text)]">Explore by section</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SECTIONS.map(({ href, emoji, label, tagline, desc, detail, borderClass, badgeClass, highlights }) => (
                <Link key={href} href={href}
                  className={`group p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] transition-all hover:shadow-lg ${borderClass}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{emoji}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badgeClass}`}>{label}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-faint)] bg-[var(--bg-muted)] px-2 py-0.5 rounded-full border border-[var(--border)] whitespace-nowrap ml-2">
                      {tagline}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[var(--text-muted)] mb-1">{desc}</p>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-3">{detail}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {highlights.map((h) => (
                      <span key={h} className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-faint)] border border-[var(--border)]">{h}</span>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-[var(--text-faint)] group-hover:text-[var(--accent-text)] transition-colors font-medium">
                    Open {label} →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Get started: Setup guides ──────────────────────── */}
      <section className="mb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text)]">🚀 Get started</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">Step-by-step setup guides — copy, paste, run.</p>
          </div>
          <Link href="/big-data?sub=setup" className="text-sm text-[var(--accent-text)] hover:underline font-medium">
            All setup guides →
          </Link>
        </div>
        {setupGuides.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {setupGuides.map((item) => (
              <ContentCard key={`${item.section}-${item.slug}`} item={item} href={`/${item.section}/${item.slug}`} />
            ))}
          </div>
        ) : (
          /* Static spotlight cards when no content yet */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {SETUP_SPOTLIGHTS.map(({ title, emoji, tag }) => (
              <div key={title} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-center opacity-60">
                <div className="text-2xl mb-2">{emoji}</div>
                <div className="text-xs font-semibold text-[var(--text)] leading-snug mb-1">{title}</div>
                <div className="text-[10px] text-[var(--text-faint)]">{tag} · coming soon</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Featured ──────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="mb-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[var(--text)]">⭐ Featured</h2>
            <Link href="/system-design/netflix/architecture" className="text-sm text-[var(--accent-text)] hover:underline font-medium">
              View Netflix system design →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.slice(0, 6).map((item) => (
              <ContentCard key={`${item.section}-${item.slug}`} item={item} href={`/${item.section}/${item.slug}`} />
            ))}
          </div>
        </section>
      )}

      {/* ── Latest ────────────────────────────────────────── */}
      {recent.length > 0 && (
        <section className="mb-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[var(--text)]">🕐 Latest</h2>
            <Link href="/big-data" className="text-sm text-[var(--accent-text)] hover:underline font-medium">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recent.slice(0, 3).map((item) => (
              <ContentCard key={`${item.section}-${item.slug}`} item={item} href={`/${item.section}/${item.slug}`} />
            ))}
          </div>
        </section>
      )}

      {/* ── What this site is best for ────────────────────── */}
      <section className="mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="text-lg font-bold mb-3 text-[var(--text)]">What this site is best for</h2>
            <ul className="space-y-2">
              {[
                "Preparing for senior data engineer and backend engineer interviews",
                "Deep-diving Netflix, Uber, or distributed system architectures",
                "Setting up Kafka, Spark, Airflow, or dbt in minutes — not hours",
                "Quick-reference cheatsheets you can open mid-work",
                "Understanding LLM trade-offs, RAG pipelines, and agent patterns",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                  <span className="text-[var(--accent-text)] mt-0.5 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="text-lg font-bold mb-3 text-[var(--text)]">Built from real interview prep</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
              Every guide, diagram, and Q&amp;A bank is drawn from real system design interview experience — production-style scenarios, not textbook theory.
            </p>
            <h3 className="text-sm font-bold mb-2 text-[var(--text)]">Coming next</h3>
            <ul className="space-y-1.5">
              {[
                "Uber system design — ride matching, surge pricing, location ingestion",
                "Kafka Q&A bank — questions 17–50 with full answers",
                "Data Engineer roadmap — 6-week structured path",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                  <span className="text-[var(--text-faint)] mt-0.5 shrink-0">→</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="mb-20 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-10 text-center">
        <h2 className="text-3xl font-bold mb-3 text-[var(--text)]">Built in public, growing daily</h2>
        <p className="text-[var(--text-muted)] max-w-xl mx-auto mb-6">
          Every guide, comparison, and cheatsheet is added as the industry evolves.
          No filler — just content that actually works in production.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/tech-news" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold transition-opacity text-sm">
            📰 See what's new
          </Link>
          <Link href="/cheatsheets" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text)] hover:border-[var(--pink-text)]/60 font-semibold transition-colors text-sm">
            📋 Browse cheatsheets
          </Link>
        </div>
      </section>
    </div>
  );
}
