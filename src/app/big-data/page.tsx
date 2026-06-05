import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionBrowser from "@/components/ui/SubsectionBrowser";

export const metadata = {
  title: "Big Data — withsoon",
  description: "Everything for a Big Data engineer — Kafka, Spark, Flink, Airflow, dbt, system design, setup guides, interview prep.",
};

const SUBSECTIONS = [
  { key: "kafka",         label: "Kafka",          emoji: "⚡", desc: "Architecture, consumer groups, internals, production patterns" },
  { key: "spark",         label: "Spark",           emoji: "🔥", desc: "RDDs, DataFrames, tuning, cluster config, Spark Streaming" },
  { key: "flink",         label: "Flink",           emoji: "🌊", desc: "Stream processing, stateful ops, checkpointing, windowing" },
  { key: "airflow",       label: "Airflow",         emoji: "🌬️", desc: "DAG design, operators, scheduling, production deployment" },
  { key: "dbt",           label: "dbt",             emoji: "🔧", desc: "Models, tests, incremental runs, dbt Cloud vs Core" },
  { key: "system-design", label: "System Design",   emoji: "🏗️", desc: "Lambda, Kappa, CDC, real-time pipelines, data lake design" },
  { key: "setup",         label: "Setup Guides",    emoji: "🛠️", desc: "Step-by-step local and cloud setup for Big Data tools" },
  { key: "cheatsheet",    label: "Cheatsheets",     emoji: "📋", desc: "Commands, configs, quick reference for daily use" },
  { key: "interview-qa",  label: "Interview Q&A",   emoji: "🎯", desc: "Topic-wise questions and detailed answers" },
];

export default function BigDataPage() {
  const items = getContentBySection("big-data");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="🗄️"
        title="Big Data Hub"
        subtitle="System design, setup guides, tool deep-dives, cheatsheets, and interview prep — everything you need as a Big Data engineer."
        accentClass="text-[var(--blue-text)]"
      />
      <SubsectionBrowser
        items={items}
        subsections={SUBSECTIONS}
        section="big-data"
        accentClass="text-[var(--blue-text)]"
        softClass="bg-[var(--blue-soft)] text-[var(--blue-text)]"
      />
    </div>
  );
}
