export const metadata = {
  title: "Tools — withsoon",
  description: "Interactive AI tools: prompt playgrounds, token counters, embedding visualizers, and more.",
};

const TOOLS = [
  {
    title: "Token Counter",
    desc: "Paste any text and see how many tokens it uses across different models (GPT-4, Claude, Gemini).",
    status: "soon",
  },
  {
    title: "Prompt Playground",
    desc: "Write a prompt, send it to multiple models at once, and compare the outputs side-by-side.",
    status: "soon",
  },
  {
    title: "RAG Pipeline Builder",
    desc: "Visual walkthrough: paste documents, chunk them, embed, store, and query — all in the browser.",
    status: "soon",
  },
  {
    title: "Embedding Visualizer",
    desc: "See how different sentences cluster in embedding space. Useful for understanding semantic similarity.",
    status: "soon",
  },
  {
    title: "System Prompt Analyzer",
    desc: "Paste a system prompt and get a breakdown: token cost, instruction clarity, potential issues.",
    status: "soon",
  },
];

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-4xl font-bold mb-2">Tools</h1>
      <p className="text-gray-400 mb-12">
        Interactive AI tools that run in the browser. No API key needed for most.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {TOOLS.map(({ title, desc, status }) => (
          <div
            key={title}
            className="p-6 rounded-xl border border-[var(--border)] bg-[var(--muted)] opacity-80"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">{title}</h2>
              {status === "soon" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  coming soon
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
