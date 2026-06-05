import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionFilter from "@/components/ui/SubsectionFilter";

export const metadata = {
  title: "Big Data — withsoon",
  description: "Everything for a Big Data engineer — Kafka, Spark, Flink, Airflow, dbt, system design, setup guides, interview prep.",
};

const SUBSECTIONS = [
  { key: "system-design", label: "System Design" },
  { key: "setup", label: "Setup Guides" },
  { key: "kafka", label: "Kafka" },
  { key: "spark", label: "Spark" },
  { key: "flink", label: "Flink" },
  { key: "airflow", label: "Airflow" },
  { key: "dbt", label: "dbt" },
  { key: "cheatsheet", label: "Cheatsheets" },
  { key: "interview-qa", label: "Interview Q&A" },
];

export default function BigDataPage() {
  const items = getContentBySection("big-data");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="🗄️"
        title="Big Data Hub"
        subtitle="System design, setup guides, tool deep-dives, cheatsheets, and interview prep — everything you need as a Big Data engineer."
        color="text-blue-400"
      />

      <SubsectionFilter items={items} subsections={SUBSECTIONS} section="big-data" />
    </div>
  );
}
