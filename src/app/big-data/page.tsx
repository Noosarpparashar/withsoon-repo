import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionBrowser from "@/components/ui/SubsectionBrowser";
import ArchitectureGallery from "@/components/ui/ArchitectureGallery";
import BigDataLibraries from "@/components/ui/BigDataLibraries";

export const metadata = {
  title: "Big Data — withsoon",
  description: "Kafka, Spark, Flink, Airflow, dbt — system design, setup guides, deep dives, cheatsheets, and interview prep.",
};

const SUBSECTIONS = [
  { key: "system-design", label: "System Design",  emoji: "🏗️", desc: "Real-time pipelines, Lambda/Kappa, CDC, data lake architecture, distributed systems" },
  { key: "setup",         label: "Setup Guides",   emoji: "🚀", desc: "Copy-paste setup for Kafka, Spark, Airflow, Debezium, dbt — local and cloud" },
  { key: "kafka",         label: "Kafka",          emoji: "⚡", desc: "Architecture, consumer groups, exactly-once, replication, production patterns" },
  { key: "spark",         label: "Spark",          emoji: "🔥", desc: "RDDs, DataFrames, tuning, partitioning, Spark Streaming, cluster config" },
  { key: "flink",         label: "Flink",          emoji: "🌊", desc: "Stream processing, stateful ops, checkpointing, watermarks, windowing" },
  { key: "airflow",       label: "Airflow",        emoji: "🌬️", desc: "DAG design, operators, sensors, scheduling, production best practices" },
  { key: "dbt",           label: "dbt",            emoji: "🔧", desc: "Models, tests, incremental runs, snapshots, dbt Cloud vs Core" },
  { key: "cheatsheet",   label: "Cheatsheets",    emoji: "📋", desc: "Kafka CLI, Spark config, SQL patterns — quick reference for daily use" },
];

export default function BigDataPage() {
  const items = getContentBySection("big-data");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="🗄️"
        title="Big Data Hub"
        subtitle="System design blueprints, step-by-step setup guides, deep dives, and cheatsheets — everything a Big Data engineer needs in one place."
        accentClass="text-[var(--blue-text)]"
      />
      <div className="mb-14">
        <ArchitectureGallery />
      </div>

      <div className="mb-14">
        <BigDataLibraries />
      </div>
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
