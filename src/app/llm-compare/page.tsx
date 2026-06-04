export const metadata = {
  title: "LLM Compare — withsoon",
  description: "Side-by-side comparisons of GPT-4, Claude, Gemini, Mistral, and more on real-world tasks.",
};

const MODELS = [
  { name: "GPT-4o", org: "OpenAI", strengths: ["Coding", "Reasoning", "Vision"], context: "128k" },
  { name: "Claude 3.7 Sonnet", org: "Anthropic", strengths: ["Long context", "Writing", "Instruction following"], context: "200k" },
  { name: "Gemini 1.5 Pro", org: "Google", strengths: ["Multimodal", "Long context", "Code"], context: "1M" },
  { name: "Mistral Large", org: "Mistral AI", strengths: ["Open weights", "Fast", "European data"], context: "32k" },
  { name: "Llama 3.1 405B", org: "Meta", strengths: ["Open source", "Self-hostable", "Reasoning"], context: "128k" },
];

const COMING_SOON = [
  "Prompt-by-prompt live comparison",
  "Benchmark leaderboard with sources",
  "Cost-per-task calculator",
  "Latency benchmarks",
  "RAG quality comparison",
];

export default function LLMComparePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-4xl font-bold mb-2">LLM Compare</h1>
      <p className="text-gray-400 mb-12">
        Honest, task-based comparisons of the top language models. No marketing — just results.
      </p>

      {/* Model overview table */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold mb-4">Model Overview</h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Model</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Org</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Context</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Strengths</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map((m, i) => (
                <tr
                  key={m.name}
                  className={`border-b border-[var(--border)] last:border-0 ${i % 2 === 0 ? "bg-[var(--background)]" : "bg-[var(--muted)]"}`}
                >
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-gray-400">{m.org}</td>
                  <td className="px-4 py-3 text-[var(--accent-light)]">{m.context}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {m.strengths.map((s) => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent-light)]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Coming soon */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-8">
        <h2 className="text-xl font-semibold mb-4">Coming soon</h2>
        <ul className="space-y-2">
          {COMING_SOON.map((item) => (
            <li key={item} className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="text-[var(--accent-light)]">→</span>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
