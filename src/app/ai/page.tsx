import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionBrowser from "@/components/ui/SubsectionBrowser";

export const metadata = {
  title: "AI & LLMs — withsoon",
  description: "OpenAI, Claude, Gemini, Llama — RAG pipelines, agents, prompt engineering, fine-tuning, setup guides.",
};

const SUBSECTIONS = [
  { key: "setup",       label: "Setup Guides",       emoji: "🚀", desc: "RAG pipeline, chatbot, AI agent, LangChain, LlamaIndex — step-by-step from zero" },
  { key: "rag",         label: "RAG",                emoji: "🔍", desc: "Chunking, embedding models, vector DBs, retrieval, re-ranking, production RAG" },
  { key: "agents",      label: "Agents",             emoji: "🤖", desc: "Tool use, multi-agent systems, ReAct, planning, memory, LangGraph" },
  { key: "openai",      label: "OpenAI",             emoji: "🟢", desc: "GPT-4o, o1, function calling, assistants API, structured output, pricing" },
  { key: "anthropic",   label: "Anthropic / Claude", emoji: "🟣", desc: "Claude 4, extended thinking, tool use, prompt caching, context windows" },
  { key: "google",      label: "Google / Gemini",    emoji: "🔵", desc: "Gemini 2.0 Flash, 1M context, multimodal, Vertex AI, Gemma" },
  { key: "meta",        label: "Meta / Llama",       emoji: "🦙", desc: "Llama 3.3, self-hosting with Ollama, fine-tuning, quantization" },
  { key: "prompting",   label: "Prompt Engineering", emoji: "✍️", desc: "System prompts, chain-of-thought, few-shot, industry-standard patterns" },
  { key: "fine-tuning", label: "Fine-tuning",        emoji: "⚙️", desc: "LoRA, QLoRA, RLHF, when to fine-tune vs RAG vs prompt engineering" },
  { key: "comparison",  label: "Model Comparisons",  emoji: "⚖️", desc: "GPT vs Claude vs Gemini on real tasks — coding, reasoning, cost, speed" },
];

export default function AIPage() {
  const items = getContentBySection("ai");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="🤖"
        title="AI & LLMs Hub"
        subtitle="Setup guides, provider deep-dives, RAG pipelines, agents, and model comparisons — everything to build production AI systems."
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
