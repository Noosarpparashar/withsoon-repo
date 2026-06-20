"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RoadmapItem {
  id: string;
  topic: string;
  description: string;
  link?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

interface Week {
  week: number;
  title: string;
  focus: string;
  items: RoadmapItem[];
}

const ROADMAP: Week[] = [
  {
    week: 1,
    title: "SQL & Data Fundamentals",
    focus: "Master the query language used in every DE interview",
    items: [
      { id: "w1-1", topic: "Window functions", description: "ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, NTILE", link: "/interview/sql-interview-questions", difficulty: "intermediate" },
      { id: "w1-2", topic: "CTEs and subqueries", description: "WITH clauses, correlated subqueries, recursive CTEs", link: "/interview/sql-interview-questions", difficulty: "intermediate" },
      { id: "w1-3", topic: "Sessionization & funnel analysis", description: "30-min gap sessions, CASE WHEN funnel, cohort patterns", link: "/interview/sql-interview-questions", difficulty: "advanced" },
      { id: "w1-4", topic: "SCD Type 2", description: "valid_from/valid_to patterns, is_current flag", link: "/interview/sql-interview-questions", difficulty: "intermediate" },
      { id: "w1-5", topic: "Query optimization", description: "Indexes, partition pruning, EXPLAIN ANALYZE", link: "/interview/sql-interview-questions", difficulty: "intermediate" },
    ],
  },
  {
    week: 2,
    title: "Kafka & Streaming",
    focus: "The most-asked streaming topic in DE interviews",
    items: [
      { id: "w2-1", topic: "Kafka architecture", description: "Topics, partitions, offsets, consumer groups, ISR", link: "/interview/kafka-interview-questions", difficulty: "intermediate" },
      { id: "w2-2", topic: "Producer config", description: "acks, linger.ms, batch.size, compression, idempotence", link: "/interview/kafka-interview-questions", difficulty: "intermediate" },
      { id: "w2-3", topic: "Exactly-once semantics", description: "Idempotent producer + transactions + READ_COMMITTED", link: "/interview/kafka-interview-questions", difficulty: "advanced" },
      { id: "w2-4", topic: "Consumer lag & monitoring", description: "kafka-consumer-groups.sh, lag metrics, alert strategy", link: "/interview/kafka-interview-questions", difficulty: "intermediate" },
      { id: "w2-5", topic: "Log compaction", description: "Key-based retention, CDC topics, tombstone records", link: "/interview/kafka-interview-questions", difficulty: "intermediate" },
    ],
  },
  {
    week: 3,
    title: "Apache Spark",
    focus: "Batch processing backbone — required at most data companies",
    items: [
      { id: "w3-1", topic: "DAG, stages, tasks", description: "Lazy evaluation, shuffle boundaries, narrow vs wide transforms", link: "/interview/spark-interview-questions", difficulty: "intermediate" },
      { id: "w3-2", topic: "Shuffle & partitioning", description: "spark.sql.shuffle.partitions, repartition vs coalesce", link: "/interview/spark-interview-questions", difficulty: "advanced" },
      { id: "w3-3", topic: "AQE & join strategies", description: "Broadcast join, sort-merge, shuffle hash, AQE skew handling", link: "/interview/spark-interview-questions", difficulty: "advanced" },
      { id: "w3-4", topic: "Memory tuning", description: "execution vs storage memory, off-heap, OOM patterns", link: "/interview/spark-interview-questions", difficulty: "advanced" },
      { id: "w3-5", topic: "Delta Lake", description: "ACID on Parquet, MERGE/upsert, time travel, OPTIMIZE", link: "/interview/spark-interview-questions", difficulty: "intermediate" },
    ],
  },
  {
    week: 4,
    title: "Airflow, dbt & Orchestration",
    focus: "Pipeline orchestration — essential for any analytics engineering role",
    items: [
      { id: "w4-1", topic: "Airflow DAG basics", description: "Operators, sensors, XComs, TaskFlow API (@task)", difficulty: "beginner" },
      { id: "w4-2", topic: "Airflow scheduling & backfill", description: "catchup, depends_on_past, schedule_interval", difficulty: "intermediate" },
      { id: "w4-3", topic: "dbt models & tests", description: "ref(), source(), schema tests, custom tests", difficulty: "beginner" },
      { id: "w4-4", topic: "dbt incremental models", description: "is_incremental(), unique_key, merge strategy", difficulty: "intermediate" },
      { id: "w4-5", topic: "Airflow vs Prefect vs Dagster", description: "Trade-offs, when to choose what, interview comparisons", difficulty: "intermediate" },
    ],
  },
  {
    week: 5,
    title: "Cloud & Data Warehouse",
    focus: "Cloud-native data stacks dominate modern DE roles",
    items: [
      { id: "w5-1", topic: "BigQuery internals", description: "Columnar storage, partition pruning, slots, flat-rate vs on-demand", difficulty: "intermediate" },
      { id: "w5-2", topic: "Redshift tuning", description: "DISTKEY, SORTKEY, VACUUM, ANALYZE", difficulty: "intermediate" },
      { id: "w5-3", topic: "Snowflake architecture", description: "Virtual warehouses, micro-partitioning, time travel, zero-copy clone", difficulty: "intermediate" },
      { id: "w5-4", topic: "Lakehouse vs Warehouse", description: "Delta/Iceberg/Hudi, when to use each, open table format trade-offs", difficulty: "advanced" },
      { id: "w5-5", topic: "AWS/GCP/Azure services map", description: "S3/GCS/ADLS, Glue/Dataflow/ADF, EMR/Dataproc/HDInsight", difficulty: "beginner" },
    ],
  },
  {
    week: 6,
    title: "System Design & Behavioral",
    focus: "The final round — design at scale and tell your story",
    items: [
      { id: "w6-1", topic: "Netflix system design", description: "Full playback flow, concurrency, CDN, failure scenarios", link: "/system-design/netflix/architecture", difficulty: "advanced" },
      { id: "w6-2", topic: "Capacity estimation", description: "QPS, storage math, back-of-envelope calculations", difficulty: "intermediate" },
      { id: "w6-3", topic: "Trade-offs in system design", description: "SQL vs NoSQL, strong vs eventual, Kafka vs SQS, Redis patterns", difficulty: "advanced" },
      { id: "w6-4", topic: "STAR behavioral stories", description: "5 impact stories: performance win, conflict, failure, scope decision, leadership", difficulty: "intermediate" },
      { id: "w6-5", topic: "Amazon Leadership Principles", description: "Map your STAR stories to 6–8 most common LP questions", difficulty: "intermediate" },
    ],
  },
];

const DIFFICULTY_BADGE: Record<string, string> = {
  beginner: "bg-[var(--green-soft)] text-[var(--green-text)]",
  intermediate: "bg-[var(--orange-soft)] text-[var(--orange-text)]",
  advanced: "bg-[var(--pink-soft)] text-[var(--pink-text)]",
};

const STORAGE_KEY = "withsoon_roadmap_v1";

export default function RoadmapPage() {
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
      setDone(new Set(saved));
    } catch {}
  }, []);

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function reset() {
    setDone(new Set());
    localStorage.removeItem(STORAGE_KEY);
  }

  const total = ROADMAP.reduce((acc, w) => acc + w.items.length, 0);
  const completed = done.size;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Data Engineer Roadmap</h1>
        <p className="text-[var(--text-muted)] mb-6">6-week structured path from SQL to system design. Check off topics as you go — progress is saved in your browser.</p>

        {/* Progress bar */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[var(--text)]">{completed}/{total} topics completed</span>
            <button
              onClick={reset}
              className="text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
            >
              Reset progress
            </button>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-faint)] mt-1.5">{pct}% complete</p>
        </div>
      </div>

      {/* Weeks */}
      <div className="space-y-8">
        {ROADMAP.map((week) => {
          const weekDone = week.items.filter((i) => done.has(i.id)).length;
          return (
            <div key={week.week} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[var(--accent-text)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-full">
                      Week {week.week}
                    </span>
                    <h2 className="text-base font-bold text-[var(--text)]">{week.title}</h2>
                  </div>
                  <p className="text-xs text-[var(--text-faint)] mt-1">{week.focus}</p>
                </div>
                <span className="text-xs text-[var(--text-faint)]">{weekDone}/{week.items.length}</span>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {week.items.map((item) => {
                  const isDone = done.has(item.id);
                  return (
                    <li key={item.id} className="flex items-start gap-4 px-5 py-4">
                      <button
                        onClick={() => toggle(item.id)}
                        aria-label={isDone ? `Mark ${item.topic} as incomplete` : `Mark ${item.topic} as done`}
                        className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${
                          isDone
                            ? "bg-[var(--accent)] border-[var(--accent)]"
                            : "border-[var(--border)] hover:border-[var(--accent)]"
                        }`}
                      >
                        {isDone && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.link ? (
                            <Link
                              href={item.link}
                              className={`text-sm font-semibold hover:text-[var(--accent-text)] transition-colors ${
                                isDone ? "line-through text-[var(--text-faint)]" : "text-[var(--text)]"
                              }`}
                            >
                              {item.topic}
                            </Link>
                          ) : (
                            <span className={`text-sm font-semibold ${isDone ? "line-through text-[var(--text-faint)]" : "text-[var(--text)]"}`}>
                              {item.topic}
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${DIFFICULTY_BADGE[item.difficulty]}`}>
                            {item.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-faint)] mt-0.5">{item.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[var(--text-faint)] text-center mt-8">
        Progress is stored only in this browser. Clear local storage or use &quot;Reset progress&quot; to start over.
      </p>
    </div>
  );
}
