import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionBrowser from "@/components/ui/SubsectionBrowser";

export const metadata = {
  title: "Interview Prep — withsoon",
  description: "Topic-wise Q&A, grilling sessions, and system design prep for Big Data and AI engineering roles.",
};

const SUBSECTIONS = [
  { key: "kafka",         label: "Kafka",           emoji: "⚡", desc: "Internals, partitions, consumer groups, exactly-once, performance" },
  { key: "spark",         label: "Spark",           emoji: "🔥", desc: "RDD vs DataFrame, catalyst optimizer, shuffle, tuning" },
  { key: "flink",         label: "Flink",           emoji: "🌊", desc: "Streaming concepts, state, watermarks, windowing" },
  { key: "sql",           label: "SQL",             emoji: "🗃️", desc: "Window functions, CTEs, joins, optimization, most asked" },
  { key: "system-design", label: "System Design",   emoji: "🏗️", desc: "Design a data pipeline, event system, analytics platform" },
  { key: "ai-ml",         label: "AI & ML",         emoji: "🤖", desc: "LLM concepts, RAG, ML fundamentals, AI system design" },
  { key: "python",        label: "Python",          emoji: "🐍", desc: "Data structures, OOP, async, common patterns" },
  { key: "behavioral",    label: "Behavioral",      emoji: "🧠", desc: "STAR method, common questions, leadership principles" },
];

export default function InterviewPage() {
  const items = getContentBySection("interview");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="🎯"
        title="Interview Prep"
        subtitle="Topic-wise question banks, grilling sessions, and system design walkthroughs for Big Data and AI engineering interviews."
        accentClass="text-[var(--orange-text)]"
      />
      <SubsectionBrowser
        items={items}
        subsections={SUBSECTIONS}
        section="interview"
        accentClass="text-[var(--orange-text)]"
        softClass="bg-[var(--orange-soft)] text-[var(--orange-text)]"
      />
    </div>
  );
}
