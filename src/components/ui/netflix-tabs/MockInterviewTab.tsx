"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Role } from "@/components/ui/NetflixPage";

type MockQuestion = {
  step: number;
  prompt: string;
  goal: string;
  hint: string;
  rubricPoints: string[];
  timeTarget: number; // seconds
  pushbacks: { label: string; response: string }[];
};

const BACKEND_FLOW: MockQuestion[] = [
  {
    step: 1, timeTarget: 120,
    prompt: "Tell me about the system you're designing today. What is the core problem Netflix is trying to solve?",
    goal: "Reframe as a problem, not a product",
    hint: "Don't just say 'Netflix is a video streaming service.' State the engineering challenge: billions of events, millions of concurrent streams, low-latency playback globally.",
    rubricPoints: ["Identifies scalability as the core challenge", "Mentions 200M+ users and global deployment", "Frames problem as engineering, not product"],
    pushbacks: [
      { label: "But what problem specifically?", response: "The interviewer wants you to name a specific engineering challenge — not 'streaming video' but e.g. 'how do we start playback in under 2 seconds for 60M concurrent users globally?'" },
      { label: "What assumptions are you making?", response: "State your assumptions: 300M subscribers, ~75% DAU, 4 devices per account, 60M peak concurrent streams, heartbeat every 30 seconds." },
    ],
  },
  {
    step: 2, timeTarget: 180,
    prompt: "What are your functional requirements? What does the system need to do?",
    goal: "Narrow to backend-relevant requirements",
    hint: "You're designing the playback backend — not the UI, not recommendations. Say: play content, track progress, enforce concurrency, resume across devices.",
    rubricPoints: ["Playback session start", "Watch progress tracking (resume)", "Concurrent stream enforcement", "CDN handoff, not CDN internals"],
    pushbacks: [
      { label: "What about recommendations?", response: "Good candidate: 'I'm scoping to playback and data pipeline — recommendations are ML and I'll treat them as a downstream consumer of my events, not a system I design here.'" },
      { label: "What about the mobile client?", response: "The mobile client is given. You're designing the backend services it calls. Focus on the APIs, databases, and services — not the client code." },
    ],
  },
  {
    step: 3, timeTarget: 120,
    prompt: "What non-functional requirements matter most here? Choose 3 and explain why.",
    goal: "Show judgment about what actually matters",
    hint: "High availability for playback (every second of downtime = revenue loss). Low latency for session start (< 2 seconds). Eventual consistency acceptable for watch progress (30s staleness is fine).",
    rubricPoints: ["High availability > perfect consistency for playback", "< 2s playback start latency", "2M writes/sec for watch progress → rules out MySQL", "DRM strong consistency (legal)"],
    pushbacks: [
      { label: "Why not strong consistency everywhere?", response: "Strong consistency on watch progress at 2M writes/sec requires QUORUM — that's 6M Cassandra writes/sec. You'd need 30+ nodes. Eventual consistency with 30s staleness is invisible to users." },
      { label: "What's your SLA for playback?", response: "99.99% availability = ~52 minutes downtime/year. For latency: P99 < 2s for session start, P99 < 100ms for heartbeat write." },
    ],
  },
  {
    step: 4, timeTarget: 240,
    prompt: "Walk me through your scale estimates. How many requests per second?",
    goal: "Derive numbers from first principles",
    hint: "300M subscribers → 220M DAU → 60M peak concurrent → 2M heartbeat writes/sec. Show the math, don't just list numbers.",
    rubricPoints: ["States assumptions (subscribers, DAU ratio, heartbeat interval)", "Derives QPS from those assumptions", "Connects number to a design decision (2M/sec → Cassandra)"],
    pushbacks: [
      { label: "Justify the 30s heartbeat", response: "30s is the standard Netflix heartbeat interval — it balances position accuracy (worst case: resume 30s behind) with write load. 1s heartbeats would mean 60M writes/sec which is 30x the load." },
      { label: "What about read QPS?", response: "Continue-watching reads: when user opens app, fetch all in-progress for profile. ~220M DAU × 3 app opens/day / 86400 = ~7,500 reads/sec. Much lighter than writes." },
    ],
  },
  {
    step: 5, timeTarget: 420,
    prompt: "Draw your high-level architecture. What are the main services?",
    goal: "10-service chain, not a monolith",
    hint: "Client → Gateway → Auth → Subscription → Concurrency → Playback → DRM → Manifest → CDN. Mention Watch Progress as separate write path. Don't try to design a monolith.",
    rubricPoints: ["API Gateway + Auth separation", "Concurrency check on critical path", "DRM Service separate from Playback", "Watch Progress as async write, not blocking"],
    pushbacks: [
      { label: "Why is concurrency on the critical path?", response: "Concurrency check must happen before DRM and Manifest. If you give out a DRM license and then deny the stream, the client has a license they can't use. Concurrency is a gate." },
      { label: "What about the CDN?", response: "The API layer doesn't stream video — it issues a manifest URL pointing to the CDN. 95% of bytes are CDN-direct. The API layer only handles the session setup (~500B per playback start)." },
    ],
  },
  {
    step: 6, timeTarget: 300,
    prompt: "Deep dive: how exactly does a playback session start? Walk me through each step end to end.",
    goal: "15-step flow with failure modes",
    hint: "POST /v1/playback/sessions → validates JWT → checks subscription → checks concurrency (Lua) → calls DRM → returns manifest_url. Mention what fails closed vs fails open.",
    rubricPoints: ["DRM fails closed (legal)", "Concurrency check is atomic (Lua script)", "Client gets manifest URL and fetches CDN directly", "Heartbeat starts after playback begins"],
    pushbacks: [
      { label: "What if the concurrency service is down?", response: "This is the key tradeoff: fail open (allow stream, risk over-limit) or fail closed (deny stream, lose revenue). Netflix fails open on concurrency — downtime costs more than occasional over-limit." },
      { label: "What's in the manifest?", response: "The HLS/DASH manifest contains URLs to each video segment at different bitrates, subtitle tracks, and audio tracks. The player uses it to implement ABR — switching quality based on bandwidth." },
    ],
  },
  {
    step: 7, timeTarget: 240,
    prompt: "How do you design watch progress storage? What database, what schema, why?",
    goal: "Justify Cassandra, not MySQL",
    hint: "Access pattern: write every 30s (2M/sec total), read on resume by profile_id. Partition key = profile_id. Clustering key = content_id. ONE consistency. Never QUORUM — can't sustain 2M/sec at quorum.",
    rubricPoints: ["Cassandra, not MySQL (write throughput justification)", "Partition by profile_id (not content_id)", "Consistency ONE, eventual — states why", "No read-before-write on heartbeat upsert"],
    pushbacks: [
      { label: "Why not DynamoDB?", response: "DynamoDB works fine and Netflix actually uses EVCache/Cassandra historically. The key point is: the access pattern (2M writes/sec, partition by user, no read-before-write) is the reason — not brand loyalty." },
      { label: "Why partition by profile_id not content_id?", response: "The read query is 'give me all titles in progress for profile X' — that's a range scan on one partition. If you partition by content_id, that query becomes a full scatter-gather across all partitions." },
    ],
  },
  {
    step: 8, timeTarget: 240,
    prompt: "What failures worry you most in this system? Pick 2 and explain how you'd handle them.",
    goal: "Concrete failure scenarios with mitigations",
    hint: "Good choices: Redis down (concurrency check degrades — fail open or use backup?), EVCache cold start (Cassandra gets slammed — thundering herd), DRM unavailable (fail closed — legal requirement).",
    rubricPoints: ["Identifies concrete failure mode, not generic 'server down'", "Explains detection (alerting / circuit breaker)", "Explains mitigation (fail open vs fail closed)", "Discusses the tradeoff in the mitigation"],
    pushbacks: [
      { label: "What about Cassandra failure?", response: "Cassandra is partitioned and replicated (RF=3). A single node failure is transparent. A full region failure triggers active-active failover to the nearest region. Watch progress writes go to local DC (LOCAL_QUORUM) and replicate async." },
      { label: "How do you detect these failures fast?", response: "Circuit breaker (Hystrix/Resilience4j) on each downstream call. When error rate > 50% in 10s window, circuit opens. Separate health check metrics per service. PagerDuty alert on P99 latency spike." },
    ],
  },
  {
    step: 9, timeTarget: 180,
    prompt: "What are the key tradeoffs in your design? Where did you choose consistency vs availability?",
    goal: "Named CAP/PACELC tradeoffs for each service",
    hint: "Concurrency: availability vs correctness. Watch progress: availability vs consistency. DRM: strong consistency (legal). Billing: strong consistency (monetary).",
    rubricPoints: ["Identifies 2+ explicit tradeoff points", "States why strong vs eventual per service", "Mentions DRM as exceptional case (fail closed)", "Shows awareness of Cassandra eventual vs MySQL ACID"],
    pushbacks: [
      { label: "What about the CAP theorem here?", response: "Under network partition: Watch Progress chooses availability (ONE consistency, may read stale data). Concurrency chooses consistency (Redis must be authoritative). Billing chooses consistency (double charge is unacceptable)." },
      { label: "Is eventual consistency risky?", response: "Only for watch progress position — worst case is resume 30s behind. That's invisible to users. If we applied strong consistency to 2M writes/sec, we'd need 10x the Cassandra fleet." },
    ],
  },
  {
    step: 10, timeTarget: 120,
    prompt: "Summarize your design in 2 minutes. Imagine the interviewer is writing up your design right now.",
    goal: "Coherent, structured summary they can write down",
    hint: "Lead with the problem, then: scale (60M streams, 2M writes/sec), architecture (10 services), key DB decisions (Cassandra vs MySQL vs Redis), key tradeoffs (DRM fail-closed, watch progress eventual), what you'd improve.",
    rubricPoints: ["Problem statement first", "Scale numbers mentioned naturally", "Names 3+ DB choices with justification", "At least 1 explicit tradeoff stated", "Under 2 minutes"],
    pushbacks: [
      { label: "What would you improve given more time?", response: "Better answer: 'I'd add a more sophisticated CDN pre-positioning algorithm that predicts hot titles, and I'd design the recommendation service as a downstream consumer of my Kafka event stream.'" },
      { label: "One thing Netflix does better than your design?", response: "Shows self-awareness: 'My concurrency check is per-region. Netflix's real system also has cross-region coordination to prevent over-limit across regions during a single region outage.'" },
    ],
  },
];

const DATA_FLOW: MockQuestion[] = [
  {
    step: 1, timeTarget: 120,
    prompt: "What analytics problem are you solving for Netflix? Who are the internal customers?",
    goal: "Frame as an analytics product, not an event log",
    hint: "The goal: produce watch hours, completion rates, engagement metrics used by Product (what to build), Content Licensing (what to buy), Finance (projections). Internal customers: BI, Data Science, ML teams.",
    rubricPoints: ["Names internal consumers (BI, DS, ML)", "Identifies core metrics: watch hours, completion rate", "Frames it as an analytics product, not just Kafka ingestion"],
    pushbacks: [
      { label: "Who specifically uses this data?", response: "Product uses watch hours per title to decide renewals. Content Licensing uses completion rate to negotiate rights. ML uses engagement events for recommendation training. Finance uses DAU/watch hours for forecasting." },
      { label: "What's the latency requirement?", response: "Most metrics: daily batch is fine (watch hours, completion rate). Some metrics need near-real-time: active viewer count for operations, buffering rate for CDN health. Define both SLAs separately." },
    ],
  },
  {
    step: 2, timeTarget: 240,
    prompt: "What events do you need to collect? What's in each event?",
    goal: "17 event types with defined schema fields",
    hint: "At minimum: playback_started, heartbeat, playback_paused, playback_resumed, playback_stopped, playback_completed, quality_changed, buffer_started, buffer_ended, search_query_submitted.",
    rubricPoints: ["Lists 8+ distinct event types", "Mentions event_id (UUID), event_ts, session_id, profile_id as key fields", "Separates client-generated fields from server-stamped fields (ingest_ts)"],
    pushbacks: [
      { label: "Why separate heartbeat from playback_started?", response: "Different semantics: playback_started fires once (or a few times on retry). Heartbeat fires every 30s during playback. Different partition keys, retention, and processing pipelines." },
      { label: "What's the difference between event_ts and ingest_ts?", response: "event_ts is set by the client at the moment the event occurred — it's authoritative for when things happened. ingest_ts is stamped by the Event Collector — it's when we received it. Both are needed for late event detection." },
    ],
  },
  {
    step: 3, timeTarget: 180,
    prompt: "How do you design your event schema to survive future changes? What format and what validation?",
    goal: "Avro + Schema Registry + BACKWARD_TRANSITIVE",
    hint: "Avro serialization. Confluent Schema Registry with BACKWARD_TRANSITIVE compatibility. Adding a field with a default is safe. Removing a required field breaks backward compatibility.",
    rubricPoints: ["Avro or Protobuf (not JSON)", "Schema Registry mentioned", "BACKWARD_TRANSITIVE or equivalent", "Explains what change would break compatibility"],
    pushbacks: [
      { label: "Why not just use JSON?", response: "JSON has no schema enforcement — a producer can add a field and break a downstream consumer that doesn't handle unknowns. Avro + Schema Registry enforces compatibility at publish time, not at consumer failure time." },
      { label: "What's a backward-compatible change?", response: "Adding a field WITH a default value is backward compatible — old consumers ignore it, new consumers use it. Removing a field is not backward compatible — old consumers may expect it." },
    ],
  },
  {
    step: 4, timeTarget: 240,
    prompt: "What Kafka topics do you create? What's the partition key for each and why?",
    goal: "6 topics, justified partition keys",
    hint: "heartbeat-events → session_id (ordering), playback-events → session_id, quality-events → session_id, search-events → profile_id (user-level ordering), recommendation-events → profile_id, error-events → device_id.",
    rubricPoints: ["Separates topics by domain", "Justifies session_id for heartbeats (ordering for sessionization)", "Avoids content_id as partition key (hot partition risk)", "Mentions retention differences (heartbeats 30d, search 14d)"],
    pushbacks: [
      { label: "What if you use content_id for heartbeats?", response: "Stranger Things S5 premiere: 20M users watching simultaneously → all heartbeats for that content_id on ~10 partitions → consumer lag explodes. session_id distributes uniformly across all partitions." },
      { label: "How many partitions per topic?", response: "heartbeat-events: 1000 partitions to handle 2M events/sec. Each partition handles 2,000 events/sec — well within Kafka limits. Formula: target_throughput / throughput_per_partition." },
    ],
  },
  {
    step: 5, timeTarget: 300,
    prompt: "How does your streaming pipeline process heartbeats into watch sessions? Walk me through step by step.",
    goal: "Bronze → Silver sessionization with exact logic",
    hint: "1. Kafka consumer reads heartbeats. 2. Dedup by event_id (Flink keyed state). 3. Key by session_id. 4. Order by event_ts. 5. Compute intervals between consecutive heartbeats where state='playing'. 6. Sum intervals = watched_seconds.",
    rubricPoints: ["Dedup happens in Silver (not Bronze)", "Keyed by session_id for ordered processing", "Intervals, not duration (pause-aware)", "Inactivity timeout for session close (30 min)"],
    pushbacks: [
      { label: "How do you handle pause?", response: "If the user pauses, the heartbeat state field changes to 'paused' or heartbeats stop entirely. Only sum intervals where the PRECEDING heartbeat state was 'playing'. Pause duration is excluded." },
      { label: "What's the inactivity timeout?", response: "If no heartbeat arrives for 30 minutes, close the session. This handles app crash, network loss, or the user walking away with the app open. The 30-minute threshold is a design choice — not 5 minutes (too short for pause) not 24 hours (too long for crash)." },
    ],
  },
  {
    step: 6, timeTarget: 300,
    prompt: "How do you design your lakehouse? Describe the Bronze, Silver, and Gold layers.",
    goal: "3 layers with clear responsibility and Iceberg format",
    hint: "Bronze: raw immutable events, partitioned by event_date. Silver: deduped, sessionized, enriched. Gold: daily aggregates (watch_hours_daily, completion_rate_daily). All on Iceberg/Parquet/zstd.",
    rubricPoints: ["Bronze is immutable and append-only", "Silver deduplicates and sessionizes", "Gold is pre-aggregated (not row-level)", "Iceberg mentioned (or Delta/Hudi) with justification"],
    pushbacks: [
      { label: "Why three layers — isn't two enough?", response: "You could combine Bronze+Silver. But Bronze is immutable raw data — you can always reprocess from it. Silver is transformed. If you put business logic in Bronze, a bug means you've corrupted your source of truth. Separation gives you a safe replay point." },
      { label: "Why Iceberg?", response: "Engine-agnostic: Spark writes it, Flink reads it, Trino queries it. Schema evolution without rewrites. Time-travel for debugging ML training data. Netflix open-sourced Iceberg for exactly this use case." },
    ],
  },
  {
    step: 7, timeTarget: 180,
    prompt: "A heartbeat arrives 2 hours late. What happens?",
    goal: "Watermark, DLQ, batch reconciliation",
    hint: "Watermark = 30 minutes. Event is 2 hours past event_ts — beyond watermark → goes to DLQ. Daily batch job re-reads DLQ and reconciles into Silver via MERGE INTO. Result: watch hours correct by next day, not real-time.",
    rubricPoints: ["Watermark defined (30 min)", "Events beyond watermark → DLQ (not silently dropped)", "DLQ re-processed in batch (daily or hourly)", "MERGE INTO for upsert (not INSERT OVERWRITE)"],
    pushbacks: [
      { label: "Why not just drop late events?", response: "Mobile users frequently buffer events for 10-30 minutes (airplane mode, offline). If we drop them, watch hours are systematically undercounted by 5-10% for mobile users. That affects content renewal decisions." },
      { label: "Why MERGE INTO not INSERT OVERWRITE for the DLQ?", response: "Fresh streaming data has arrived for the same date partition. INSERT OVERWRITE would replace those fresh rows with only the backfilled data. MERGE INTO upserts — adds new session rows without touching unaffected rows." },
    ],
  },
  {
    step: 8, timeTarget: 180,
    prompt: "The same heartbeat event arrives 3 times due to a Kafka producer retry. What happens?",
    goal: "event_id deduplication in Silver",
    hint: "Bronze retains all 3 (immutable). Silver dedup step: check event_id against keyed state store (24h TTL). First occurrence passes. Duplicates dropped. Result: Bronze has 3 rows, Silver has 1.",
    rubricPoints: ["Bronze keeps all 3 (correct)", "Silver deduplicates by event_id", "State-based dedup (Flink keyed state) or watermark-based (Spark dropDuplicates)", "Does not affect Gold accuracy"],
    pushbacks: [
      { label: "What if the same session has two slightly different heartbeats?", response: "Different event_id = different event, even if same session and nearly same timestamp. event_id is the dedup key — if the content is identical but event_id differs, keep both. If event_id is the same, it's a duplicate regardless of content differences." },
      { label: "Doesn't Bronze being immutable waste storage?", response: "Yes — Bronze stores ~3x duplicates sometimes. But the value is: if we find a dedup bug 6 months later, we can re-run Silver from Bronze. If we dedup in Bronze, we lose the replay capability. Storage is cheap; correctability is not." },
    ],
  },
  {
    step: 9, timeTarget: 180,
    prompt: "How do you ensure watch hours is accurate? What data quality checks would you put in place?",
    goal: "Named DQ checks with severity and action",
    hint: "1. Null event_id — reject. 2. Duplicate rate > 0.1% — alert. 3. Negative watch duration — quarantine. 4. event_ts far in future (> 1 day) — flag. 5. Watch duration > content runtime — flag.",
    rubricPoints: ["Quarantine bad records (don't drop silently)", "Metric: duplicate rate threshold with alert", "Metric: null rate per event type", "Rejects invalid records without stopping pipeline"],
    pushbacks: [
      { label: "What's your acceptable duplicate rate?", response: "< 0.1% of events should be duplicates in Silver after dedup. If duplicate rate in Bronze is 5% and Silver still shows 0.5%, the dedup window is too short — extend the state TTL." },
      { label: "What if watch duration exceeds content runtime?", response: "Flag for review, don't drop. It could mean a bug in the client (incorrect duration_sec field), or it could mean valid data (content runtime metadata is wrong). Quarantine → human investigation → fix source." },
    ],
  },
  {
    step: 10, timeTarget: 180,
    prompt: "A streaming show drops and your pipeline starts falling behind. Kafka consumer lag is growing. What do you do?",
    goal: "Scale consumers to partition count, then partitions",
    hint: "1. Scale consumer group — add consumers up to partition count. 2. If still lagging: are partitions the bottleneck? 3. Increase partitions (careful — breaks ordering guarantees for existing consumers). 4. Profile: is lag caused by slow processing (Flink join?) or just throughput?",
    rubricPoints: ["Scales consumers first (up to partition count)", "Understands consumer ≤ partition count limit", "Investigates cause before just scaling", "Mentions trade-off of increasing partitions (ordering)"],
    pushbacks: [
      { label: "What's a dangerous thing to do here?", response: "Increasing partition count while consumers are running rebalances the consumer group — all consumers stop processing briefly (seconds to minutes). Do it during low-traffic windows." },
      { label: "What if scaling consumers doesn't help?", response: "Then each consumer is processing at max throughput for its partitions. Either: (a) the Flink job has a slow operation (join, DB lookup) — optimize that. (b) The partition count is too low — increase it carefully. (c) The schema is inefficient — switch from JSON to Avro." },
    ],
  },
  {
    step: 11, timeTarget: 180,
    prompt: "How do you backfill watch hours for the past 90 days after fixing a bug in your sessionization logic?",
    goal: "Re-read Bronze, MERGE INTO Silver, explicit rollback steps",
    hint: "1. Identify affected date range. 2. Read Bronze (immutable — always available). 3. Re-run corrected Silver transformation with time range filter. 4. MERGE INTO Silver (not INSERT OVERWRITE — fresh streaming data exists). 5. Re-run Gold for affected dates.",
    rubricPoints: ["Reads from Bronze (correct starting point)", "Does not INSERT OVERWRITE on shared date partitions", "Uses MERGE INTO for upsert semantics", "Re-runs Gold after Silver correction"],
    pushbacks: [
      { label: "How long does 90-day backfill take?", response: "Depends on data volume and cluster size. ~10TB Bronze data / day × 90 days = ~900TB. With a 500-node Spark cluster reading from S3, this could take 2-4 hours. Monitor via Spark UI — watch for skew." },
      { label: "What if Gold is already used by dashboards during backfill?", response: "Use a shadow table: write corrected data to silver_v2 and gold_v2, validate, then atomic swap (Iceberg table swap or metadata pointer update). Dashboard users see no downtime." },
    ],
  },
  {
    step: 12, timeTarget: 120,
    prompt: "Summarize your data engineering design in 2 minutes.",
    goal: "Coherent pipeline from event ingestion to Gold analytics",
    hint: "Event Collector → Kafka (6 topics, session_id partitions) → Schema Registry → Flink (dedup + sessionize) → Bronze/Silver/Gold on Iceberg. Late events → DLQ → daily batch. DQ checks at Silver. Compaction daily.",
    rubricPoints: ["Mentions all 3 layers with clear responsibility", "Names Kafka partition key rationale", "Late event and duplicate handling mentioned", "Connects pipeline to business outcome (watch hours for BI/ML)"],
    pushbacks: [
      { label: "What's the hardest part to get right?", response: "Good answer: 'The sessionization logic — specifically how to handle pause/resume correctly. A naive implementation over-counts watch time by including pause gaps. Getting this right requires testing against real event traces, not unit tests.'" },
      { label: "What would you add next?", response: "A real-time path: Flink → Apache Pinot for sub-100ms operational dashboards (live viewer count, buffering rate). The current batch path is fine for analytics; Pinot adds a real-time tier for ops." },
    ],
  },
];

type RubricDimension = { label: string; max: number; description: string; color: string };
const RUBRIC: RubricDimension[] = [
  { label: "Clarification quality", max: 10, description: "Asked scoping questions before jumping in?", color: "#3b82f6" },
  { label: "Requirement coverage", max: 10, description: "FRs and NFRs explicitly stated? Any obvious omissions?", color: "#8b5cf6" },
  { label: "Scale estimation", max: 10, description: "Derived numbers from assumptions, not memorized?", color: "#f59e0b" },
  { label: "Architecture clarity", max: 15, description: "Clear high-level, logical service boundaries?", color: "#06b6d4" },
  { label: "Deep dive depth", max: 20, description: "Technically accurate with correct DB/protocol choices?", color: "#10b981" },
  { label: "Tradeoff discussion", max: 15, description: "Named specific tradeoffs connected to Netflix's choices?", color: "#ec4899" },
  { label: "Failure handling", max: 10, description: "Concrete failure modes, fail-closed vs fail-open?", color: "#f97316" },
  { label: "Communication", max: 5, description: "Structured, concise, precise?", color: "#a855f7" },
  { label: "Role focus", max: 5, description: "Stayed in scope for the role?", color: "#84cc16" },
];

type SelfRating = "nailed" | "okay" | "missed" | null;

function useTimer(targetSec: number, running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const reset = useCallback(() => setElapsed(0), []);
  const pct = Math.min(elapsed / targetSec, 1);
  const over = elapsed > targetSec;
  const warn = pct >= 0.8 && !over;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const targetMm = String(Math.floor(targetSec / 60)).padStart(2, "0");
  const targetSs = String(targetSec % 60).padStart(2, "0");
  return { elapsed, pct, over, warn, display: `${mm}:${ss}`, target: `${targetMm}:${targetSs}`, reset };
}

function ScoreInput({ dim, score, onScore }: { dim: RubricDimension; score: number; onScore: (s: number) => void }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ color: dim.color }}>{dim.label}</span>
        <span className="text-xs font-mono font-bold" style={{ color: "var(--text)" }}>{score} / {dim.max}</span>
      </div>
      <input
        type="range" min={0} max={dim.max} value={score}
        onChange={(e) => onScore(Number(e.target.value))}
        className="w-full mb-2" style={{ accentColor: dim.color }}
        aria-label={`Score for ${dim.label}`}
      />
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-faint)" }}>{dim.description}</p>
    </div>
  );
}

const SELF_RATING_SCORE: Record<NonNullable<SelfRating>, number> = { nailed: 10, okay: 6, missed: 3 };

export function MockInterviewTab({ role }: { role: Role }) {
  const [activeRole, setActiveRole] = useState<Role>(role);
  const [phase, setPhase] = useState<"prep" | "interview" | "scoring">("prep");
  const [currentStep, setCurrentStep] = useState(0);
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());
  const [openPushback, setOpenPushback] = useState<{ step: number; idx: number } | null>(null);
  const [selfRatings, setSelfRatings] = useState<(SelfRating)[]>([]);
  const [ratingNudge, setRatingNudge] = useState(false);
  const [scores, setScores] = useState<number[]>(RUBRIC.map((d) => Math.floor(d.max / 2)));
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [checkedRubric, setCheckedRubric] = useState<Record<string, boolean>>({});

  const flow = activeRole === "Backend Engineer" ? BACKEND_FLOW : DATA_FLOW;
  const totalSteps = flow.length;
  const currentQ = flow[currentStep];

  const timer = useTimer(currentQ.timeTarget, timerRunning && !timerPaused);

  const totalMax = RUBRIC.reduce((s, d) => s + d.max, 0);
  const totalScore = scores.reduce((s, v) => s + v, 0);
  const pct = Math.round((totalScore / totalMax) * 100);
  const scoreLabel = pct >= 85 ? { text: "Strong Hire", color: "#10b981" } : pct >= 70 ? { text: "Hire", color: "#3b82f6" } : pct >= 55 ? { text: "Borderline", color: "#f59e0b" } : { text: "No Hire", color: "#ef4444" };
  const roleColor = activeRole === "Backend Engineer" ? "#3b82f6" : "#10b981";

  // Running score from self-ratings
  const ratedSteps = selfRatings.filter(r => r !== null).length;
  const ratingSum = selfRatings.reduce((s, r) => s + (r ? SELF_RATING_SCORE[r] : 0), 0);
  const estimatedScore = ratedSteps > 0 ? Math.round(ratingSum / ratedSteps) : null;

  // Total elapsed timer
  useEffect(() => {
    if (phase === "interview" && timerRunning && !timerPaused) {
      totalTimerRef.current = setInterval(() => setTotalElapsed(e => e + 1), 1000);
    } else {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    }
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current); };
  }, [phase, timerRunning, timerPaused]);

  function resetInterview() {
    setPhase("prep"); setCurrentStep(0); setRevealedHints(new Set());
    setOpenPushback(null); setSelfRatings([]); setScores(RUBRIC.map((d) => Math.floor(d.max / 2)));
    setTimerRunning(false); setTimerPaused(false); setTotalElapsed(0); setCheckedRubric({});
  }

  function startInterview() {
    resetInterview();
    setPhase("interview");
    setTimerRunning(true);
    setSelfRatings(new Array(flow.length).fill(null));
  }

  function goToStep(idx: number) {
    setCurrentStep(idx);
    setOpenPushback(null);
    timer.reset();
  }

  function advanceStep() {
    if (!selfRatings[currentStep]) {
      setRatingNudge(true);
      setTimeout(() => setRatingNudge(false), 2500);
      return;
    }
    setRatingNudge(false);
    if (currentStep < totalSteps - 1) {
      goToStep(currentStep + 1);
    } else {
      setTimerRunning(false);
      setPhase("scoring");
    }
  }

  function setRating(stepIdx: number, rating: SelfRating) {
    setSelfRatings(prev => { const n = [...prev]; n[stepIdx] = rating; return n; });
  }

  const totalMm = String(Math.floor(totalElapsed / 60)).padStart(2, "0");
  const totalSs = String(totalElapsed % 60).padStart(2, "0");

  const timerColor = timer.over ? "#ef4444" : timer.warn ? "#f59e0b" : roleColor;

  return (
    <div className="space-y-5">
      {/* Role selector + controls */}
      <div className="rounded-xl p-4 flex flex-wrap items-center gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Mock Interview</h2>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          {(["Backend Engineer", "Data Engineer"] as Role[]).map((r) => (
            <button key={r} onClick={() => { setActiveRole(r); resetInterview(); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: activeRole === r ? (r === "Backend Engineer" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)") : "transparent", color: activeRole === r ? (r === "Backend Engineer" ? "#3b82f6" : "#10b981") : "var(--text-muted)", cursor: "pointer", border: "none" }}
              aria-pressed={activeRole === r}
            >
              {r}
            </button>
          ))}
        </div>
        {phase === "interview" && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>Total: {totalMm}:{totalSs}</span>
            <button
              onClick={() => setTimerPaused(v => !v)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: timerPaused ? "#f59e0b20" : "var(--bg)", color: timerPaused ? "#f59e0b" : "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
            >
              {timerPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button onClick={resetInterview} className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>
              Restart
            </button>
          </div>
        )}
        {phase === "scoring" && (
          <button onClick={resetInterview} className="ml-auto text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>
            Start Over
          </button>
        )}
      </div>

      {/* PREP phase */}
      {phase === "prep" && (
        <div className="space-y-4">
          <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>Before you start</h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              {activeRole === "Backend Engineer"
                ? "Simulates a 45-minute backend system design round. 10 questions covering playback, watch progress, concurrency, and failures."
                : "Simulates a 50-minute data engineering system design round. 12 questions covering event design, Kafka, streaming pipeline, lakehouse, and data quality."}
            </p>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Questions", value: String(totalSteps) },
                { label: "Target time", value: activeRole === "Backend Engineer" ? "45 min" : "50 min" },
                { label: "Scoring rubric", value: `${totalMax} pts` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div className="text-2xl font-black font-mono mb-1" style={{ color: roleColor }}>{value}</div>
                  <div className="text-xs" style={{ color: "var(--text-faint)" }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-4 mb-5" style={{ background: `${roleColor}10`, border: `1px solid ${roleColor}30` }}>
              <p className="text-xs font-bold mb-2" style={{ color: roleColor }}>Tips for {activeRole}</p>
              <ul className="space-y-1.5">
                {(activeRole === "Backend Engineer" ? [
                  "Clarify requirements before drawing. Ask: 300M users? Mobile? Global?",
                  "Stay in scope — you're designing the backend, not the recommendation engine.",
                  "State assumptions out loud: 30s heartbeat → 2M writes/sec → Cassandra.",
                  "Justify every database choice. 'I'll use MySQL' without scale reasoning is wrong.",
                ] : [
                  "Clarify which metrics matter to the business before designing the pipeline.",
                  "Name your event types explicitly — heartbeat, playback_started, quality_changed.",
                  "Justify partition keys. session_id, not content_id, not random.",
                  "Explain Bronze/Silver/Gold — each layer has a distinct responsibility.",
                ]).map((tip, i) => (
                  <li key={i} className="text-xs flex gap-2" style={{ color: "var(--text-muted)" }}>
                    <span style={{ color: roleColor }}>→</span>{tip}
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={startInterview}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={{ background: roleColor, color: "#fff", cursor: "pointer", border: "none" }}>
              Start Mock Interview
            </button>
          </div>
        </div>
      )}

      {/* INTERVIEW phase */}
      {phase === "interview" && (
        <div className="space-y-4">
          {/* Progress + timer bar */}
          <div className="rounded-xl px-5 py-3 space-y-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: roleColor }}>
                Question {currentStep + 1} / {totalSteps}
              </span>
              <div className="flex items-center gap-3">
                {estimatedScore !== null && (
                  <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>
                    Avg: {estimatedScore}%
                  </span>
                )}
                <span
                  className="text-sm font-mono font-bold"
                  style={{ color: timerColor, fontVariantNumeric: "tabular-nums" }}
                >
                  {timer.display} / {timer.target}
                </span>
              </div>
            </div>
            {/* Overall progress */}
            <div className="w-full rounded-full overflow-hidden" style={{ background: "var(--bg)", height: 4 }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ background: roleColor, width: `${((currentStep + 1) / totalSteps) * 100}%` }} />
            </div>
            {/* Per-step timer bar */}
            <div className="w-full rounded-full overflow-hidden" style={{ background: "var(--bg)", height: 3 }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ background: timerColor, width: `${timer.pct * 100}%` }}
              />
            </div>
            {timer.over && (
              <p className="text-[11px] font-semibold" style={{ color: "#ef4444" }}>
                ⏱ Over time — wrap up this answer
              </p>
            )}
          </div>

          {/* Question card */}
          <div className="rounded-xl overflow-hidden" style={{ border: `2px solid ${roleColor}`, background: "var(--bg-card)" }}>
            <div className="px-5 py-4" style={{ background: `${roleColor}10` }}>
              <div className="flex items-start gap-3">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                  style={{ background: roleColor, color: "#fff" }}
                >
                  {currentStep + 1}
                </span>
                <div className="flex-1">
                  <p className="text-xs font-semibold mb-1" style={{ color: roleColor, opacity: 0.8 }}>Interviewer asks:</p>
                  <p className="text-base font-bold leading-snug" style={{ color: "var(--text)" }}>
                    {currentQ.prompt}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Goal + time */}
              <div className="flex flex-wrap gap-2">
                <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "var(--bg)", color: "var(--text-faint)", border: "1px solid var(--border)" }}>
                  Goal: {currentQ.goal}
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "var(--bg)", color: "var(--text-faint)", border: "1px solid var(--border)" }}>
                  ⏱ {Math.floor(currentQ.timeTarget / 60)} min target
                </span>
              </div>

              {/* Rubric checkboxes */}
              <div>
                <p className="text-[11px] font-bold mb-2" style={{ color: "var(--text-faint)" }}>Cover these points:</p>
                <div className="space-y-1.5">
                  {currentQ.rubricPoints.map((rp, i) => {
                    const key = `${currentStep}-${i}`;
                    const checked = checkedRubric[key] || false;
                    return (
                      <label key={i} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox" checked={checked}
                          onChange={() => setCheckedRubric(prev => ({ ...prev, [key]: !checked }))}
                          className="mt-0.5 shrink-0"
                          style={{ accentColor: roleColor }}
                        />
                        <span className="text-xs leading-relaxed" style={{ color: checked ? "var(--text-faint)" : "var(--text-muted)", textDecoration: checked ? "line-through" : "none" }}>
                          {rp}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Hint */}
              {!revealedHints.has(currentStep) ? (
                <button
                  onClick={() => setRevealedHints(prev => { const n = new Set(prev); n.add(currentStep); return n; })}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: "var(--bg)", border: `1px solid ${roleColor}40`, color: roleColor, cursor: "pointer" }}>
                  💡 Show hint
                </button>
              ) : (
                <div className="rounded-lg p-3" style={{ background: `${roleColor}08`, border: `1px solid ${roleColor}20` }}>
                  <p className="text-[11px] font-bold mb-1" style={{ color: roleColor }}>Hint</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{currentQ.hint}</p>
                </div>
              )}

              {/* Pushback buttons */}
              <div>
                <p className="text-[11px] font-bold mb-2" style={{ color: "var(--text-faint)" }}>Interviewer pushback:</p>
                <div className="flex flex-wrap gap-2">
                  {currentQ.pushbacks.map((pb, idx) => (
                    <button
                      key={idx}
                      onClick={() => setOpenPushback(openPushback?.step === currentStep && openPushback?.idx === idx ? null : { step: currentStep, idx })}
                      className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all"
                      style={{
                        background: openPushback?.step === currentStep && openPushback?.idx === idx ? "#fef3c720" : "var(--bg)",
                        color: openPushback?.step === currentStep && openPushback?.idx === idx ? "#92400e" : "var(--text-faint)",
                        border: `1px solid ${openPushback?.step === currentStep && openPushback?.idx === idx ? "#fcd34d" : "var(--border)"}`,
                        cursor: "pointer",
                      }}
                    >
                      💬 &ldquo;{pb.label}&rdquo;
                    </button>
                  ))}
                </div>
                {openPushback?.step === currentStep && (
                  <div className="mt-2 rounded-lg p-3" style={{ background: "#fffbeb", border: "1px solid #fcd34d" }}>
                    <p className="text-xs font-bold mb-1" style={{ color: "#92400e" }}>How to respond:</p>
                    <p className="text-xs leading-relaxed" style={{ color: "#78350f" }}>
                      {currentQ.pushbacks[openPushback.idx].response}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Self-rating */}
          <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-bold mb-3" style={{ color: "var(--text-faint)" }}>How did you do on this question?</p>
            <div className="flex gap-2">
              {(["nailed", "okay", "missed"] as const).map(r => {
                const config = { nailed: { label: "⭐ Nailed it", color: "#10b981" }, okay: { label: "⚡ Okay", color: "#f59e0b" }, missed: { label: "✗ Missed it", color: "#ef4444" } };
                const isSelected = selfRatings[currentStep] === r;
                return (
                  <button
                    key={r}
                    onClick={() => setRating(currentStep, r)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: isSelected ? `${config[r].color}20` : "transparent",
                      color: isSelected ? config[r].color : "var(--text-faint)",
                      border: `1px solid ${isSelected ? config[r].color : "var(--border)"}`,
                      cursor: "pointer",
                    }}
                    aria-pressed={isSelected}
                  >
                    {config[r].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          {ratingNudge && (
            <div className="rounded-lg px-4 py-2 text-sm font-medium text-center" role="alert"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)", color: "#d97706" }}>
              Rate this step before continuing →
            </div>
          )}
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button onClick={() => goToStep(currentStep - 1)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer" }}>
                ← Back
              </button>
            )}
            <button
              onClick={advanceStep}
              className="px-4 py-2.5 rounded-xl text-sm font-bold flex-1"
              style={{ background: roleColor, color: "#fff", cursor: "pointer", border: "none" }}
            >
              {currentStep < totalSteps - 1 ? "Next Question →" : "Finish & Score →"}
            </button>
          </div>

          {/* Step dots */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {flow.map((_, i) => {
              const rating = selfRatings[i];
              const dotColor = rating === "nailed" ? "#10b981" : rating === "okay" ? "#f59e0b" : rating === "missed" ? "#ef4444" : i === currentStep ? roleColor : "var(--border)";
              return (
                <button
                  key={i}
                  onClick={() => goToStep(i)}
                  className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all"
                  style={{ background: i === currentStep ? `${roleColor}20` : "transparent", color: dotColor, border: `1.5px solid ${dotColor}`, cursor: "pointer" }}
                  aria-label={`Go to step ${i + 1}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SCORING phase */}
      {phase === "scoring" && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="rounded-xl p-6 text-center" style={{ background: "var(--bg-card)", border: `2px solid ${scoreLabel.color}` }}>
            <div className="text-5xl font-black font-mono mb-1" style={{ color: scoreLabel.color }}>{totalScore}</div>
            <div className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>out of {totalMax} points ({pct}%)</div>
            <div className="inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-4" style={{ background: `${scoreLabel.color}15`, color: scoreLabel.color }}>
              {scoreLabel.text}
            </div>
            {totalElapsed > 0 && (
              <div className="text-xs" style={{ color: "var(--text-faint)" }}>
                Total time: {totalMm}:{totalSs}
              </div>
            )}
          </div>

          {/* Self-rating summary */}
          {selfRatings.filter(Boolean).length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>Your self-ratings by step</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {flow.map((q, i) => {
                  const r = selfRatings[i];
                  const config = { nailed: { label: "Nailed it", color: "#10b981" }, okay: { label: "Okay", color: "#f59e0b" }, missed: { label: "Missed it", color: "#ef4444" }, null: { label: "Not rated", color: "var(--text-faint)" } };
                  const c = config[r ?? "null"];
                  return (
                    <div key={i} className="rounded-lg px-3 py-2" style={{ background: "var(--bg)", border: `1px solid ${c.color}40` }}>
                      <div className="text-[10px] mb-0.5" style={{ color: "var(--text-faint)" }}>Step {i + 1}</div>
                      <div className="text-xs font-semibold" style={{ color: c.color }}>{c.label}</div>
                      <div className="text-[10px] leading-tight mt-0.5" style={{ color: "var(--text-faint)" }}>{q.goal}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rubric scoring */}
          <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-base font-bold mb-4" style={{ color: "var(--text)" }}>Adjust scores per rubric dimension</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RUBRIC.map((dim, i) => (
                <ScoreInput key={dim.label} dim={dim} score={scores[i]}
                  onScore={(s) => { const n = [...scores]; n[i] = s; setScores(n); }} />
              ))}
            </div>
          </div>

          {/* Score bands */}
          <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>Score interpretation</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { range: "85-100%", label: "Strong Hire", color: "#10b981", desc: "Deep technical depth, correct tradeoffs." },
                { range: "70-84%", label: "Hire", color: "#3b82f6", desc: "Solid design, minor gaps in edge cases." },
                { range: "55-69%", label: "Borderline", color: "#f59e0b", desc: "Partial design, missing 1-2 key decisions." },
                { range: "0-54%", label: "No Hire", color: "#ef4444", desc: "Fundamental gaps in DB choices or tradeoffs." },
              ].map((tier) => (
                <div key={tier.label} className="rounded-lg p-3" style={{ background: "var(--bg)", border: `1px solid ${tier.color}30` }}>
                  <div className="text-xs font-black mb-0.5" style={{ color: tier.color }}>{tier.label}</div>
                  <div className="text-[10px] mb-1" style={{ color: "var(--text-faint)" }}>{tier.range}</div>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{tier.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <button onClick={resetInterview}
            className="w-full py-3 rounded-xl text-sm font-bold"
            style={{ background: roleColor, color: "#fff", cursor: "pointer", border: "none" }}>
            Restart Mock Interview
          </button>
        </div>
      )}
    </div>
  );
}
