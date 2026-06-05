import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionFilter from "@/components/ui/SubsectionFilter";

export const metadata = {
  title: "Reference — withsoon",
  description: "SQL cheatsheets, DSA patterns, system design quick-reference, cloud services overview.",
};

const SUBSECTIONS = [
  { key: "sql", label: "SQL" },
  { key: "system-design", label: "System Design" },
  { key: "dsa", label: "DSA" },
  { key: "cloud", label: "Cloud" },
  { key: "linux", label: "Linux / Shell" },
  { key: "git", label: "Git" },
  { key: "python", label: "Python" },
];

export default function ReferencePage() {
  const items = getContentBySection("reference");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="📚"
        title="Reference"
        subtitle="Quick-reference cheatsheets, patterns, and guides. Bookmark this — it's built for daily use."
        color="text-pink-400"
      />

      <SubsectionFilter items={items} subsections={SUBSECTIONS} section="reference" />
    </div>
  );
}
