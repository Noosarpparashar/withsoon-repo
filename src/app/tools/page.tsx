import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionFilter from "@/components/ui/SubsectionFilter";

export const metadata = {
  title: "Tools — withsoon",
  description: "Curated directory of AI and Big Data tools the industry is actually using.",
};

const SUBSECTIONS = [
  { key: "ai", label: "AI Tools" },
  { key: "big-data", label: "Big Data Tools" },
  { key: "cloud", label: "Cloud" },
  { key: "open-source", label: "Open Source" },
  { key: "vector-db", label: "Vector DBs" },
  { key: "orchestration", label: "Orchestration" },
  { key: "monitoring", label: "Monitoring" },
];

export default function ToolsPage() {
  const items = getContentBySection("tools");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="🛠️"
        title="Tools Directory"
        subtitle="Vetted tools for AI and Big Data engineers — what each one does, when to use it, quick-start links, and alternatives."
        color="text-green-400"
      />

      <SubsectionFilter items={items} subsections={SUBSECTIONS} section="tools" />
    </div>
  );
}
