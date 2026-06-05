import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionFilter from "@/components/ui/SubsectionFilter";

export const metadata = {
  title: "Interview Prep — withsoon",
  description: "Topic-wise Q&A, grilling sessions, and system design prep for Big Data and AI engineering roles.",
};

const SUBSECTIONS = [
  { key: "kafka", label: "Kafka" },
  { key: "spark", label: "Spark" },
  { key: "flink", label: "Flink" },
  { key: "sql", label: "SQL" },
  { key: "system-design", label: "System Design" },
  { key: "ai-ml", label: "AI & ML" },
  { key: "python", label: "Python" },
  { key: "behavioral", label: "Behavioral" },
];

export default function InterviewPage() {
  const items = getContentBySection("interview");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="🎯"
        title="Interview Prep"
        subtitle="Topic-wise question banks, grilling sessions, and system design walkthroughs — for Big Data and AI engineering interviews."
        color="text-orange-400"
      />

      <SubsectionFilter items={items} subsections={SUBSECTIONS} section="interview" />
    </div>
  );
}
