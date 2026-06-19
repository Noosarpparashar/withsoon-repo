import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — withsoon",
  description: "withsoon is an interactive system design and data-engineering interview prep platform built by Prasoon Parashar.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 mb-6 rounded-full bg-[var(--accent-soft)] border border-[var(--accent)]/20 px-4 py-1.5 text-sm text-[var(--accent-text)] font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Built in public
        </div>
        <h1 className="text-4xl font-bold mb-4 text-[var(--text)]">About withsoon</h1>
        <p className="text-lg text-[var(--text-muted)] leading-relaxed">
          Interactive system design and data-engineering interview prep for candidates who want interview-ready answers, diagrams, and follow-up handling.
        </p>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="text-xl font-bold mb-3 text-[var(--text)]">What is this?</h2>
          <p className="text-[var(--text-muted)] leading-relaxed mb-3">
            withsoon started as a personal set of interview prep notes — real system design walkthroughs, production-style data pipeline diagrams, and Q&amp;A banks built while preparing for senior engineering roles.
          </p>
          <p className="text-[var(--text-muted)] leading-relaxed">
            The goal is simple: make the best interactive system design and data-engineering prep platform, not just another blog. Every guide, diagram, and question bank is built around what actually gets asked in senior backend, data engineer, and AI engineer interviews.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-[var(--text)]">Who is it for?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Backend / System Design", desc: "Preparing for distributed systems, API design, and architecture interviews at FAANG or high-growth companies.", color: "var(--blue-text)" },
              { label: "Data Engineer", desc: "Kafka, Spark, Airflow, dbt, SQL — from local setup to production patterns and interview Q&A banks.", color: "var(--orange-text)" },
              { label: "AI / LLM Engineer", desc: "RAG pipelines, vector databases, agents, fine-tuning, and prompt engineering for AI-focused roles.", color: "var(--purple-text)" },
            ].map((p) => (
              <div key={p.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                <h3 className="font-semibold mb-2 text-sm" style={{ color: p.color }}>{p.label}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-[var(--text)]">Content standards</h2>
          <ul className="space-y-2">
            {[
              "Every system design page includes: requirements, capacity estimates, APIs, data models, flows, failure scenarios, trade-offs, and a 10-minute answer",
              "Every Q&A article includes: expected answer, senior-level answer, common mistake, and follow-up questions",
              "Setup guides include exact versions, Docker commands, verification steps, and a last-verified date",
              "No empty categories — sections only appear when real content exists",
              "No \"Top 50\" titles unless all 50 items are actually present",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                <span className="text-[var(--accent-text)] mt-0.5 shrink-0">→</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-[var(--text)]">Built by</h2>
          <p className="text-[var(--text-muted)] leading-relaxed mb-4">
            withsoon is built and maintained by <strong className="text-[var(--text)]">Prasoon Parashar</strong> — a data and backend engineer who got tired of scattered, incomplete, and theory-heavy interview prep resources.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://github.com/Noosarpparashar/withsoon-repo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              GitHub
            </a>
            <Link
              href="/system-design/netflix/architecture"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors"
            >
              🏗️ Netflix System Design
            </Link>
            <Link
              href="/big-data"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors"
            >
              🗄️ Big Data Hub
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-[var(--text)]">Suggest a correction</h2>
          <p className="text-[var(--text-muted)] leading-relaxed mb-4">
            Found an error, outdated information, or a missing edge case? Please open an issue on GitHub — corrections are always welcome.
          </p>
          <a
            href="https://github.com/Noosarpparashar/withsoon-repo/issues/new?title=Content+correction&body=Page:%0A%0AIssue:"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Open correction issue →
          </a>
        </section>
      </div>
    </div>
  );
}
