import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionBrowser from "@/components/ui/SubsectionBrowser";

export const metadata = {
  title: "Cheatsheets — withsoon",
  description: "SQL, System Design, DSA, and Cloud quick-reference cheatsheets for Big Data and AI engineers.",
};

const SUBSECTIONS = [
  { key: "sql",           label: "SQL",            emoji: "🗃️", desc: "Window functions, joins, CTEs, optimization — most asked in interviews" },
  { key: "system-design", label: "System Design",  emoji: "🏗️", desc: "Distributed systems, databases, caching, message queues, APIs" },
  { key: "dsa",           label: "DSA Patterns",   emoji: "🧩", desc: "Arrays, trees, graphs, DP — patterns that show up in every coding round" },
  { key: "cloud",         label: "Cloud",          emoji: "☁️", desc: "AWS, GCP, Azure — data services, IAM, compute, storage quick-ref" },
];

export default function CheatsheetPage() {
  const items = getContentBySection("reference");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="📋"
        title="Cheatsheets"
        subtitle="Quick-reference cards for daily work and interview prep. Bookmark this page — it's built to be opened when you need a fast answer."
        accentClass="text-[var(--pink-text)]"
      />
      <SubsectionBrowser
        items={items}
        subsections={SUBSECTIONS}
        section="reference"
        accentClass="text-[var(--pink-text)]"
        softClass="bg-[var(--pink-soft)] text-[var(--pink-text)]"
      />
    </div>
  );
}
