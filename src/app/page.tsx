import Link from "next/link";

const SECTIONS = [
  {
    href: "/blog",
    icon: "✍️",
    title: "Blog",
    desc: "Write-ups on AI experiments, project breakdowns, and what I learn building with LLMs.",
  },
  {
    href: "/guides",
    icon: "📖",
    title: "Guides",
    desc: "Step-by-step tutorials: build a RAG pipeline, integrate Claude, fine-tune models, and more.",
  },
  {
    href: "/llm-compare",
    icon: "⚡",
    title: "LLM Compare",
    desc: "Side-by-side comparisons of GPT, Claude, Gemini, Mistral and others on real tasks.",
  },
  {
    href: "/tools",
    icon: "🛠️",
    title: "Tools",
    desc: "Interactive AI tools you can use directly in the browser — prompt playgrounds, token counters, and more.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      {/* Hero */}
      <section className="text-center mb-24">
        <div className="inline-block mb-4 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 px-4 py-1 text-sm text-[var(--accent-light)]">
          AI · LLMs · Experiments
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          One place for{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)]">
            everything AI
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Guides, LLM comparisons, project blogs, and hands-on tools — built in public, updated as AI evolves.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/guides"
            className="px-6 py-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white font-medium transition-colors"
          >
            Read the guides
          </Link>
          <Link
            href="/llm-compare"
            className="px-6 py-3 rounded-lg border border-[var(--border)] hover:border-[var(--accent-light)] text-gray-300 hover:text-white font-medium transition-colors"
          >
            Compare LLMs →
          </Link>
        </div>
      </section>

      {/* Section cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-24">
        {SECTIONS.map(({ href, icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="group p-6 rounded-xl border border-[var(--border)] bg-[var(--muted)] hover:border-[var(--accent)]/50 transition-colors"
          >
            <div className="text-3xl mb-3">{icon}</div>
            <h2 className="text-lg font-semibold mb-1 group-hover:text-[var(--accent-light)] transition-colors">
              {title}
            </h2>
            <p className="text-sm text-gray-400">{desc}</p>
          </Link>
        ))}
      </section>

      {/* About strip */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-8 text-center">
        <h2 className="text-2xl font-bold mb-3">Built in public</h2>
        <p className="text-gray-400 max-w-xl mx-auto">
          withsoon.com is a living resource. Every guide, comparison, and tool gets updated as models improve.
          No filler — just things that actually work.
        </p>
      </section>
    </div>
  );
}
