import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog | withsoon",
  description: "What's been added and improved on withsoon — new articles, features, and content updates.",
  alternates: { canonical: "https://withsoon.com/changelog" },
};

const ENTRIES = [
  {
    date: "2026-06-20",
    title: "Spark Interview Questions, Roadmap, Daily Tips, TOC",
    items: [
      "Added Apache Spark Interview Questions — DAG, shuffle, AQE, skew, memory tuning, joins, streaming, Delta Lake",
      "Added 6-week Data Engineer Roadmap with localStorage progress tracking",
      "Added Daily Tip widget rotating through 50 curated DE/system design tips",
      "Added sticky Table of Contents on articles (desktop) and collapsible TOC (mobile)",
      "Added Callout components: InterviewTip, CommonMistake, SeniorAnswer, ProductionNote, Warning",
      "Added Related Articles section at end of each article",
      "Added Subscribe form (UI) on homepage and article pages",
      "Added RSS feed at /feed.xml",
      "FAQ JSON-LD schema automatically generated for interview Q&A articles",
    ],
  },
  {
    date: "2026-06-18",
    title: "SQL Interview Questions, OG Image API, Article UX overhaul",
    items: [
      "Added SQL Interview Questions — window functions, CTEs, sessionization, deduplication, SCD Type 2",
      "Added OG image generation at /og (edge runtime, dark background, section badge)",
      "Added Reading Progress bar, Back-to-Top button, Copy Code button on all articles",
      "Added Article JSON-LD schema, Twitter/LinkedIn share buttons",
      "Added Mock Interview + Cheat Sheet tabs to Netflix system design",
      "Fixed Kafka Q&A title to be honest about 16/50 published",
    ],
  },
  {
    date: "2026-06-15",
    title: "P0 Trust Fixes, SEO infrastructure, Netflix routing",
    items: [
      "Fixed empty subsections: replaced with Coming Soon tiles instead of showing 0 items",
      "Fixed duplicate Claude article in Tech News feed",
      "Added About page, custom 404 page, Footer with GitHub/About links",
      "Added robots.ts, sitemap.ts with dynamic article URLs",
      "Added canonical URLs to all hub pages",
      "Added author byline, suggest-correction link to all articles",
      "Added System Design hub page (/system-design)",
      "Added System Design link to navbar",
      "Fixed Netflix initialTab prop passing (direct URL navigation now works)",
      "Added breadcrumb to Netflix page: Home / System Design / Netflix",
    ],
  },
  {
    date: "2026-06-10",
    title: "Complete Netflix system design — all tabs",
    items: [
      "Netflix page: 7 tabs — Architecture, Data Models, Trade-offs, Capacity, Quiz, Mock Interview, Cheat Sheet",
      "Architecture: animated playback flow with 12 steps",
      "Data Models: PostgreSQL schemas for users, subscriptions, profiles, content, watch progress",
      "Capacity: back-of-envelope calculations for storage, bandwidth, and throughput",
      "Trade-offs: 8 production trade-off comparisons with justification",
      "Quiz: 10-question self-assessment with reveal",
    ],
  },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Changelog</h1>
        <p className="text-[var(--text-muted)]">What&apos;s been added and improved.</p>
      </div>

      <div className="space-y-8">
        {ENTRIES.map((entry) => (
          <div key={entry.date} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-mono text-[var(--text-faint)] bg-[var(--bg-muted)] px-2 py-1 rounded border border-[var(--border)]">
                {entry.date}
              </span>
              <h2 className="text-base font-bold text-[var(--text)]">{entry.title}</h2>
            </div>
            <ul className="space-y-2">
              {entry.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                  <span className="text-[var(--accent-text)] shrink-0 mt-0.5">+</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-[var(--accent-text)] hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
