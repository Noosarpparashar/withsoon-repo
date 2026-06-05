import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionFilter from "@/components/ui/SubsectionFilter";

export const metadata = {
  title: "AI & LLMs — withsoon",
  description: "OpenAI, Claude, Gemini, Llama — RAG pipelines, agents, prompt engineering, fine-tuning, industry patterns.",
};

const SUBSECTIONS = [
  { key: "openai", label: "OpenAI" },
  { key: "anthropic", label: "Anthropic / Claude" },
  { key: "google", label: "Google / Gemini" },
  { key: "meta", label: "Meta / Llama" },
  { key: "mistral", label: "Mistral" },
  { key: "rag", label: "RAG" },
  { key: "agents", label: "Agents" },
  { key: "prompting", label: "Prompt Engineering" },
  { key: "fine-tuning", label: "Fine-tuning" },
  { key: "embeddings", label: "Embeddings" },
  { key: "how-to", label: "How-To Guides" },
  { key: "comparison", label: "Comparisons" },
];

export default function AIPage() {
  const items = getContentBySection("ai");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="🤖"
        title="AI & LLMs Hub"
        subtitle="By provider, by technique, by use case. Everything from RAG pipelines to production chatbot architecture — step by step."
        color="text-purple-400"
      />

      <SubsectionFilter items={items} subsections={SUBSECTIONS} section="ai" />
    </div>
  );
}
