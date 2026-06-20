import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "System Design — withsoon",
  description: "Interactive system design case studies for senior backend and data engineer interviews. Netflix, Uber, YouTube, WhatsApp — deep dives with diagrams, trade-offs, and mock interviews.",
  alternates: { canonical: "https://withsoon.com/system-design" },
};

const COMPANIES = [
  {
    slug: "netflix",
    name: "Netflix",
    emoji: "🎬",
    tagline: "Video-on-demand streaming",
    tabs: ["Architecture", "Playback · CDN", "Failures", "Mock Interview", "Cheat Sheet"],
    difficulty: "senior",
    status: "live",
    href: "/system-design/netflix/start-here",
  },
  {
    slug: "uber",
    name: "Uber",
    emoji: "🚗",
    tagline: "Real-time ride matching & dispatch",
    tabs: ["Architecture", "Location Ingestion", "Surge Pricing", "Failures"],
    difficulty: "senior",
    status: "coming-soon",
    href: "#",
  },
  {
    slug: "youtube",
    name: "YouTube",
    emoji: "▶️",
    tagline: "Video upload, transcoding, CDN",
    tabs: ["Architecture", "Upload Pipeline", "CDN", "Recommendations"],
    difficulty: "senior",
    status: "coming-soon",
    href: "#",
  },
  {
    slug: "whatsapp",
    name: "WhatsApp",
    emoji: "💬",
    tagline: "Real-time messaging at 2B users",
    tabs: ["Architecture", "Message Delivery", "Presence", "E2E Encryption"],
    difficulty: "senior",
    status: "coming-soon",
    href: "#",
  },
  {
    slug: "bookmyshow",
    name: "BookMyShow",
    emoji: "🎟️",
    tagline: "Seat inventory & flash-sale traffic",
    tabs: ["Architecture", "Seat Locking", "Virtual Queue", "Payments"],
    difficulty: "intermediate",
    status: "coming-soon",
    href: "#",
  },
  {
    slug: "swiggy",
    name: "Swiggy",
    emoji: "🍕",
    tagline: "Restaurant discovery & real-time tracking",
    tabs: ["Architecture", "Order Lifecycle", "Real-time Tracking", "ETA"],
    difficulty: "intermediate",
    status: "coming-soon",
    href: "#",
  },
];

const DIFFICULTY_STYLE: Record<string, string> = {
  senior: "bg-[var(--pink-soft)] text-[var(--pink-text)]",
  intermediate: "bg-[var(--orange-soft)] text-[var(--orange-text)]",
};

export default function SystemDesignPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-[var(--text-faint)] mb-6 flex-wrap">
          <Link href="/" className="hover:text-[var(--text)] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[var(--text-muted)]">System Design</span>
        </div>
        <h1 className="text-4xl font-bold mb-4 text-[var(--text)]">🏗️ System Design</h1>
        <p className="text-lg text-[var(--text-muted)] max-w-3xl leading-relaxed">
          Company-style system design case studies — interactive diagrams, trade-offs, data models, capacity estimates, and mock interview prep. Built for senior backend and data engineer interviews.
        </p>
      </div>

      {/* Netflix system design featured callout */}
      <div className="mb-10 rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]">
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #e50914, #ff6b6b, #e50914)" }} />
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Featured</span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--bg-muted)] text-[var(--text-faint)] border border-[var(--border)]">Interactive</span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--bg-muted)] text-[var(--text-faint)] border border-[var(--border)]">10 tabs</span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--bg-muted)] text-[var(--text-faint)] border border-[var(--border)]">Senior Backend · Data Engineer</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--text)] mb-1">Netflix System Design — Complete Interview Prep</h3>
            <p className="text-sm text-[var(--text-muted)] mb-3">
              Interactive 19-node architecture diagram, 5 animated request flows, 75-card quiz, mock interview with grilling, and a full cheat sheet — across 10 deep-dive tabs.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--text-faint)]">
              <span>🗺️ 19-node architecture canvas</span>
              <span>▶ 5 animated request flows</span>
              <span>🧠 75 flashcards with spaced repetition</span>
              <span>🎤 Mock interview + grilling</span>
            </div>
          </div>
          <Link
            href="/system-design/netflix/start-here"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: "#e50914" }}
          >
            Start Prep →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {COMPANIES.map((c) => {
          const isLive = c.status === "live";
          return (
            <div key={c.slug}
              className={`group flex flex-col p-5 rounded-xl border bg-[var(--bg-card)] transition-all ${isLive ? "border-[var(--border)] hover:border-[var(--accent)] hover:shadow-md cursor-pointer" : "border-dashed border-[var(--border)] opacity-60"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{c.emoji}</span>
                  <div>
                    <h3 className="font-bold text-[var(--text)]">{c.name}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{c.tagline}</p>
                  </div>
                </div>
                {isLive ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--green-soft)] text-[var(--green-text)] shrink-0">Live</span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-faint)] border border-[var(--border)] shrink-0">Soon</span>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {c.tabs.map((tab) => (
                  <span key={tab} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-faint)] border border-[var(--border)]">{tab}</span>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_STYLE[c.difficulty]}`}>
                  {c.difficulty}
                </span>
                {isLive && (
                  <Link href={c.href}
                    className="text-xs font-medium text-[var(--accent-text)] group-hover:underline">
                    Open →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center">
        <h2 className="text-lg font-bold mb-2 text-[var(--text)]">More coming soon</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">Uber, YouTube, and WhatsApp are next. Each will follow the same format: Start Here → Architecture → APIs → Data Models → Failures → Trade-offs → Mock Interview.</p>
        <Link href="/about" className="text-sm text-[var(--accent-text)] hover:underline font-medium">
          See what&apos;s planned →
        </Link>
      </div>
    </div>
  );
}
