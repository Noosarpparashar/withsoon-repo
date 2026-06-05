import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionBrowser from "@/components/ui/SubsectionBrowser";

export const metadata = {
  title: "AI & LLMs — withsoon",
  description: "OpenAI, Claude, Gemini, Llama — RAG pipelines, agents, prompt engineering, fine-tuning, industry patterns.",
};

const SUBSECTIONS = [
  { key: "openai",      label: "OpenAI",              emoji: "🟢", desc: "GPT-4o, API guide, function calling, assistants, pricing" },
  { key: "anthropic",   label: "Anthropic / Claude",  emoji: "🟣", desc: "Claude 3/4, extended thinking, tool use, prompt caching" },
  { key: "google",      label: "Google / Gemini",     emoji: "🔵", desc: "Gemini 1.5 Pro, 1M context, multimodal, Vertex AI" },
  { key: "meta",        label: "Meta / Llama",        emoji: "🦙", desc: "Llama 3, self-hosting, fine-tuning, Ollama setup" },
  { key: "mistral",     label: "Mistral",             emoji: "💨", desc: "Mistral Large, Mixtral, open weights, self-hosting" },
  { key: "rag",         label: "RAG",                 emoji: "🔍", desc: "Chunking, embedding, vector DBs, retrieval, re-ranking" },
  { key: "agents",      label: "Agents",              emoji: "🤖", desc: "Tool use, multi-agent, ReAct, planning, memory" },
  { key: "prompting",   label: "Prompt Engineering",  emoji: "✍️", desc: "System prompts, chain-of-thought, few-shot, industry patterns" },
  { key: "fine-tuning", label: "Fine-tuning",         emoji: "⚙️", desc: "LoRA, QLoRA, RLHF, when to fine-tune vs RAG" },
  { key: "embeddings",  label: "Embeddings",          emoji: "🧬", desc: "Models, vector DBs, semantic search, similarity" },
  { key: "comparison",  label: "Comparisons",         emoji: "⚖️", desc: "Side-by-side model benchmarks on real tasks" },
];

export default function AIPage() {
  const items = getContentBySection("ai");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="🤖"
        title="AI & LLMs Hub"
        subtitle="By provider, by technique, by use case. Everything from RAG pipelines to production chatbot architecture — step by step."
        accentClass="text-[var(--purple-text)]"
      />
      <SubsectionBrowser
        items={items}
        subsections={SUBSECTIONS}
        section="ai"
        accentClass="text-[var(--purple-text)]"
        softClass="bg-[var(--purple-soft)] text-[var(--purple-text)]"
      />
    </div>
  );
}
