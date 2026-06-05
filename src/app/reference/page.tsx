import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionBrowser from "@/components/ui/SubsectionBrowser";

export const metadata = {
  title: "Reference — withsoon",
  description: "SQL cheatsheets, DSA patterns, system design quick-reference, cloud services overview.",
};

const SUBSECTIONS = [
  { key: "sql",           label: "SQL",             emoji: "🗃️", desc: "Window functions, joins, CTEs, optimization, most asked" },
  { key: "system-design", label: "System Design",   emoji: "🏗️", desc: "Distributed systems, databases, caching, APIs" },
  { key: "dsa",           label: "DSA",             emoji: "🧩", desc: "Data structures and algorithm patterns by category" },
  { key: "cloud",         label: "Cloud",           emoji: "☁️", desc: "AWS, GCP, Azure — services quick reference" },
  { key: "linux",         label: "Linux / Shell",   emoji: "💻", desc: "Commands, bash scripting, file ops, process management" },
  { key: "python",        label: "Python",          emoji: "🐍", desc: "Common patterns, built-ins, data manipulation" },
  { key: "git",           label: "Git",             emoji: "🔀", desc: "Commands, workflows, rebase vs merge, common fixes" },
];

export default function ReferencePage() {
  const items = getContentBySection("reference");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="📚"
        title="Reference"
        subtitle="Quick-reference cheatsheets, patterns, and guides. Bookmark this — it's designed for daily use."
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
