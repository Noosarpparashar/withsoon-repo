"use client";

import { useState } from "react";

const TIPS = [
  "In a system design interview, always ask: 'What scale are we designing for?' before drawing anything.",
  "Kafka partitions are the unit of parallelism — more partitions means more parallel consumers, but also more overhead.",
  "In Spark, always filter before joining. Pushing predicates early reduces shuffle size dramatically.",
  "Redis sorted sets (ZSET) are ideal for leaderboards and rate-limiting windows — O(log N) operations.",
  "For Netflix-style concurrency control, use Redis session leases with TTL — not a simple counter.",
  "Cassandra's data model rule: design your tables around your queries, not around your entities.",
  "In SQL interviews, 'top N per group' = ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...) WHERE rn <= N.",
  "AQE (Adaptive Query Execution) in Spark 3+ can automatically handle skewed joins — enable it by default.",
  "In a system design interview: separate the metadata path from the data path. CDNs serve bytes, not backend services.",
  "Broadcast joins in Spark avoid shuffle entirely — use them when one table fits in executor memory (<10MB by default).",
  "A watermark in Spark Structured Streaming tells the engine how late data can arrive before state is dropped.",
  "For data deduplication in SQL: ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_at DESC) WHERE rn = 1.",
  "Kafka's ISR (In-Sync Replicas) list determines durability — acks=all waits for all ISR replicas, not all replicas.",
  "SCD Type 2 maintains full history: close old row (set valid_to = now), insert new row with valid_from = now.",
  "In system design, distinguish between consistency models early: eventual, strong, monotonic, or causal.",
  "Delta Lake adds ACID to Parquet. Use MERGE for upserts — it handles CDC pipelines efficiently.",
  "When handling data skew in Spark: salting adds a random key prefix to even out partition distribution.",
  "Log compaction in Kafka retains the latest value per key — ideal for CDC changelog topics.",
  "In a system design interview, capacity estimation shows you can translate requirements into infrastructure decisions.",
  "Sessionization in SQL: use LAG(event_time) and a CASE WHEN gap > 30 minutes THEN 1 ELSE 0 END flag, then SUM() OVER.",
  "Airflow DAGs are not queues — they model dependencies, not execution parallelism. Use concurrency limits carefully.",
  "In RAG pipelines, retrieval quality matters more than generation quality. Fix your embeddings and chunking first.",
  "dbt incremental models use a filter on the timestamp to only process new/changed rows — reduces full-table scans.",
  "Flink's event-time processing with watermarks is more predictable than processing-time for out-of-order streams.",
  "In BigQuery, partition pruning is critical — always filter on the partition column or you'll scan the whole table.",
  "For the Netflix mock interview: start with 'The backend never streams video bytes — Open Connect CDN does.'",
  "Pub/Sub vs Kafka: Kafka retains messages (replay-able), Pub/Sub deletes after delivery. Choose based on replay need.",
  "Idempotency keys prevent duplicate payments — use a client-generated UUID in the request header.",
  "In Redshift, DISTKEY and SORTKEY together reduce data movement and improve filter performance significantly.",
  "LLM agents work best with tool descriptions that are unambiguous — treat tool names as function signatures.",
  "HNSW (Hierarchical Navigable Small World) is the dominant ANN algorithm for vector databases — approx. O(log N) lookup.",
  "For interview prep: practice the 2-minute answer first, then expand to 10 minutes. Never start with low-level details.",
  "Kafka consumer lag is your leading indicator of processing bottleneck — monitor it before CPU and memory.",
  "In Snowflake, virtual warehouses are independent compute clusters — scaling is adding a warehouse, not bigger nodes.",
  "Use coalesce() before writing Spark output — it reduces small file count without a full shuffle.",
  "In SQL window functions, ROWS BETWEEN is frame-based; RANGE BETWEEN handles ties differently. Know the difference.",
  "Apache Iceberg's hidden partitioning means you can change partition strategy without rewriting data.",
  "For behavioral interviews: STAR means Situation, Task, Action, Result. 80% of your answer should be Action + Result.",
  "In system design, idempotent APIs let you safely retry on failure. PUT and DELETE are idempotent; POST is not by default.",
  "Debezium uses Kafka Connect to stream database CDC events. Snapshot mode reads existing data before streaming changes.",
  "Vector similarity search is not exact — HNSW trades recall for speed. Set ef_search higher for more accuracy.",
  "In Spark, repartition() does a full shuffle; coalesce() avoids it but may produce uneven partitions.",
  "Kafka's exactly-once semantics requires idempotent producer + transactional API + consumer isolation level READ_COMMITTED.",
  "For the system design interview: always mention trade-offs. 'We chose X because Y, accepting the cost of Z.'",
  "In Airflow, use the TaskFlow API (@task decorator) for clean Python task definitions without boilerplate.",
  "Great Expectations validates data quality in pipelines — define expectations once, run them on every batch.",
  "In LLM fine-tuning, LoRA trains small rank-decomposition matrices instead of full weights — much cheaper.",
  "For data modeling interviews: understand star schema (denormalized, fast reads) vs 3NF (normalized, fewer anomalies).",
  "Rate limiting with Redis: use a sliding window counter with EXPIRE to handle burst traffic cleanly.",
  "In system design interviews, always end with: 'Given more time, I'd add X to handle Y edge case.'",
];

function getDayIndex(): number {
  const now = new Date();
  const startOf2026 = new Date("2026-01-01").getTime();
  const daysSince = Math.floor((now.getTime() - startOf2026) / 86400000);
  return Math.abs(daysSince) % TIPS.length;
}

export default function DailyTip() {
  const [copied, setCopied] = useState(false);
  const idx = getDayIndex();
  const tip = TIPS[idx];

  function copyTip() {
    navigator.clipboard.writeText(tip).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-text)]">Tip of the day</span>
        <button
          onClick={copyTip}
          aria-label="Copy tip"
          className="text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-muted)]"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{tip}</p>
      <p className="text-[10px] text-[var(--text-faint)] mt-3">Tip #{idx + 1} of {TIPS.length} · rotates daily</p>
    </div>
  );
}
