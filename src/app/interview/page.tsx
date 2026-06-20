import Link from "next/link";
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
      {/* Netflix system design featured callout */}
      <div className="mb-10 rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]">
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #e50914, #ff6b6b, #e50914)" }} />
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">System Design</span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--bg-muted)] text-[var(--text-faint)] border border-[var(--border)]">Interactive</span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--bg-muted)] text-[var(--text-faint)] border border-[var(--border)]">Senior Backend · Data Engineer</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--text)] mb-1">Netflix System Design — Full Interview Prep</h3>
            <p className="text-sm text-[var(--text-muted)] mb-3">
              Interactive 25-node architecture diagram, 8 animated request flows, 65-card quiz, mock interview with grilling, cheat sheet. Everything you need for a senior Netflix system design round.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--text-faint)]">
              <span>🗺️ 25-node architecture canvas</span>
              <span>▶ 8 animated request flows</span>
              <span>🧠 65 flashcards with spaced repetition</span>
              <span>🎤 Mock interview + grilling</span>
            </div>
          </div>
          <Link
            href="/system-design/netflix/start-here"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: "#e50914" }}
          >
            Start Prep →
          </Link>
        </div>
      </div>

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
