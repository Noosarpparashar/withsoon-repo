import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionBrowser from "@/components/ui/SubsectionBrowser";

export const metadata = {
  title: "Tools — withsoon",
  description: "Tool comparisons, new launches, and vetted picks for AI and Big Data engineers.",
};

const SUBSECTIONS = [
  { key: "ai",         label: "AI Tools",      emoji: "🤖", desc: "LLM APIs, coding assistants, AI dev tools — what's worth using and when" },
  { key: "big-data",   label: "Big Data Tools", emoji: "🗄️", desc: "Stream processing, storage, orchestration, query engines — compared" },
  { key: "vector-db",  label: "Vector DBs",     emoji: "🧬", desc: "Pinecone vs Weaviate vs Qdrant vs pgvector — pick the right one" },
  { key: "cloud",      label: "Cloud Services", emoji: "☁️", desc: "AWS, GCP, Azure data and AI services — what to use for what" },
  { key: "new-tools",  label: "New Launches",   emoji: "🚀", desc: "Tools that just dropped — quick verdict on whether they're worth it" },
];

export default function ToolsPage() {
  const items = getContentBySection("tools");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="🛠️"
        title="Tools"
        subtitle="Honest comparisons and quick-start guides for the tools Big Data and AI engineers actually use in production."
        accentClass="text-[var(--green-text)]"
      />
      <SubsectionBrowser
        items={items}
        subsections={SUBSECTIONS}
        section="tools"
        accentClass="text-[var(--green-text)]"
        softClass="bg-[var(--green-soft)] text-[var(--green-text)]"
      />
    </div>
  );
}
