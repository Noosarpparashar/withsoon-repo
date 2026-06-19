import { getContentBySection } from "@/lib/content";
import SectionHero from "@/components/ui/SectionHero";
import SubsectionBrowser from "@/components/ui/SubsectionBrowser";

export const metadata = {
  title: "Interview Prep — withsoon",
  description: "System design, Kafka, Spark, SQL, AI/ML — topic-wise Q&A and grilling sessions for Big Data and AI engineering roles.",
  alternates: { canonical: "https://withsoon.com/interview" },
  openGraph: {
    title: "Interview Prep — withsoon",
    description: "System design, Kafka, Spark, SQL, AI/ML — topic-wise Q&A and grilling sessions for Big Data and AI engineering roles.",
    url: "https://withsoon.com/interview",
    siteName: "withsoon",
  },
};

const SUBSECTIONS = [
  { key: "system-design", label: "System Design",  emoji: "🏗️", desc: "Design a real-time pipeline, analytics platform, event-driven system — with diagrams" },
  { key: "kafka",         label: "Kafka",          emoji: "⚡", desc: "Internals, partitions, consumer groups, exactly-once semantics, performance tuning" },
  { key: "spark",         label: "Spark",          emoji: "🔥", desc: "RDD vs DataFrame, catalyst optimizer, shuffle, partitioning, streaming" },
  { key: "sql",           label: "SQL",            emoji: "🗃️", desc: "Window functions, CTEs, self-joins, optimization — most asked patterns" },
  { key: "ai-ml",         label: "AI & ML",        emoji: "🤖", desc: "LLM concepts, RAG, ML system design, model evaluation, AI trade-offs" },
  { key: "flink",         label: "Flink",          emoji: "🌊", desc: "Streaming concepts, state management, watermarks, windowing strategies" },
  { key: "python",        label: "Python",         emoji: "🐍", desc: "Data structures, OOP, generators, async, common coding patterns" },
  { key: "behavioral",    label: "Behavioral",     emoji: "🧠", desc: "STAR method, ownership, conflict, delivery — leadership principles answered" },
];

export default function InterviewPage() {
  const items = getContentBySection("interview");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="🎯"
        title="Interview Prep"
        subtitle="System Design · Kafka · Spark · SQL · AI/ML — topic-wise question banks with detailed answers, grilling sessions, and design walkthroughs."
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
