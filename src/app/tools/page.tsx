import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionBrowser from "@/components/ui/SubsectionBrowser";

export const metadata = {
  title: "Tools — withsoon",
  description: "Curated directory of AI and Big Data tools the industry is actually using.",
};

const SUBSECTIONS = [
  { key: "ai",            label: "AI Tools",        emoji: "🤖", desc: "LLM APIs, AI assistants, code tools, image/video gen" },
  { key: "big-data",      label: "Big Data Tools",  emoji: "🗄️", desc: "Stream processing, orchestration, storage, query engines" },
  { key: "vector-db",     label: "Vector DBs",      emoji: "🧬", desc: "Pinecone, Weaviate, Qdrant, Chroma, pgvector" },
  { key: "cloud",         label: "Cloud",           emoji: "☁️", desc: "AWS, GCP, Azure data services and managed offerings" },
  { key: "orchestration", label: "Orchestration",   emoji: "🌬️", desc: "Airflow, Prefect, Dagster, Temporal" },
  { key: "monitoring",    label: "Monitoring",      emoji: "📊", desc: "Observability, data quality, ML monitoring" },
  { key: "open-source",   label: "Open Source",     emoji: "🔓", desc: "Self-hostable tools and OSS alternatives" },
];

export default function ToolsPage() {
  const items = getContentBySection("tools");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="🛠️"
        title="Tools Directory"
        subtitle="Vetted tools for AI and Big Data engineers — what each one does, when to use it, and what to compare it against."
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
