"use client";

import { useState } from "react";
import type { Role } from "@/components/ui/NetflixPage";

type MockQuestion = {
  step: number;
  prompt: string;
  goal: string;
  hint: string;
  rubricPoints: string[];
  timeTarget: string;
};

const BACKEND_FLOW: MockQuestion[] = [
  { step: 1, prompt: "Tell me about the system you're designing today. What is the core problem Netflix is trying to solve?", goal: "Reframe as a problem, not a product", hint: "Don't just say 'Netflix is a video streaming service.' State the engineering challenge: billions of events, millions of concurrent streams, low-latency playback globally.", rubricPoints: ["Identifies scalability as the core challenge", "Mentions 200M+ users and global deployment", "Frames problem as engineering, not product"], timeTarget: "1-2 min" },
  { step: 2, prompt: "What are your functional requirements? What does the system need to do?", goal: "Narrow to backend-relevant requirements", hint: "You're designing the playback backend — not the UI, not recommendations. Say: play content, track progress, enforce concurrency, resume across devices.", rubricPoints: ["Playback session start", "Watch progress tracking (resume)", "Concurrent stream enforcement", "CDN handoff, not CDN internals"], timeTarget: "2-3 min" },
  { step: 3, prompt: "What non-functional requirements matter most here? Choose 3 and explain why.", goal: "Show judgment about what actually matters", hint: "High availability for playback (every second of downtime = revenue loss). Low latency for session start (< 2 seconds). Eventual consistency acceptable for watch progress (30s staleness is fine).", rubricPoints: ["High availability > perfect consistency for playback", "< 2s playback start latency", "2M writes/sec for watch progress → rules out MySQL", "DRM strong consistency (legal)"], timeTarget: "2 min" },
  { step: 4, prompt: "Walk me through your scale estimates. How many requests per second?", goal: "Derive numbers from first principles", hint: "300M subscribers → 220M DAU → 60M peak concurrent → 2M heartbeat writes/sec. Show the math, don't just list numbers.", rubricPoints: ["States assumptions (subscribers, DAU ratio, heartbeat interval)", "Derives QPS from those assumptions", "Connects number to a design decision (2M/sec → Cassandra)"], timeTarget: "3-4 min" },
  { step: 5, prompt: "Draw your high-level architecture. What are the main services?", goal: "10-service chain, not a monolith", hint: "Client → Gateway → Auth → Subscription → Concurrency → Playback → DRM → Manifest → CDN. Mention Watch Progress as separate write path. Don't try to design a monolith.", rubricPoints: ["API Gateway + Auth separation", "Concurrency check on critical path", "DRM Service separate from Playback", "Watch Progress as async write, not blocking"], timeTarget: "5-7 min" },
  { step: 6, prompt: "Deep dive: how exactly does a playback session start? Walk me through each step end to end.", goal: "15-step flow with failure modes", hint: "POST /v1/playback/sessions → validates JWT → checks subscription → checks concurrency (Lua) → calls DRM → returns manifest_url. Mention what fails closed vs fails open.", rubricPoints: ["DRM fails closed (legal)", "Concurrency check is atomic (Lua script)", "Client gets manifest URL and fetches CDN directly", "Heartbeat starts after playback begins"], timeTarget: "5 min" },
  { step: 7, prompt: "How do you design watch progress storage? What database, what schema, why?", goal: "Justify Cassandra, not MySQL", hint: "Access pattern: write every 30s (2M/sec total), read on resume by profile_id. Partition key = profile_id. Clustering key = content_id. ONE consistency. Never QUORUM — can't sustain 2M/sec at quorum.", rubricPoints: ["Cassandra, not MySQL (write throughput justification)", "Partition by profile_id (not content_id)", "Consistency ONE, eventual — states why", "No read-before-write on heartbeat upsert"], timeTarget: "3-4 min" },
  { step: 8, prompt: "What failures worry you most in this system? Pick 2 and explain how you'd handle them.", goal: "Concrete failure scenarios with mitigations", hint: "Good choices: Redis down (concurrency check degrades — fail open or use backup?), EVCache cold start (Cassandra gets slammed — thundering herd), DRM unavailable (fail closed — legal requirement).", rubricPoints: ["Identifies concrete failure mode, not generic 'server down'", "Explains detection (alerting / circuit breaker)", "Explains mitigation (fail open vs fail closed)", "Discusses the tradeoff in the mitigation"], timeTarget: "3-4 min" },
  { step: 9, prompt: "What are the key tradeoffs in your design? Where did you choose consistency vs availability?", goal: "Named CAP/PACELC tradeoffs for each service", hint: "Concurrency: availability vs correctness. Watch progress: availability vs consistency. DRM: strong consistency (legal). Billing: strong consistency (monetary).", rubricPoints: ["Identifies 2+ explicit tradeoff points", "States why strong vs eventual per service", "Mentions DRM as exceptional case (fail closed)", "Shows awareness of Cassandra eventual vs MySQL ACID"], timeTarget: "3 min" },
  { step: 10, prompt: "Summarize your design in 2 minutes. Imagine the interviewer is writing up your design right now.", goal: "Coherent, structured summary they can write down", hint: "Lead with the problem, then: scale (60M streams, 2M writes/sec), architecture (10 services), key DB decisions (Cassandra vs MySQL vs Redis), key tradeoffs (DRM fail-closed, watch progress eventual), what you'd improve.", rubricPoints: ["Problem statement first", "Scale numbers mentioned naturally", "Names 3+ DB choices with justification", "At least 1 explicit tradeoff stated", "Under 2 minutes"], timeTarget: "2 min" },
];

const DATA_FLOW: MockQuestion[] = [
  { step: 1, prompt: "What analytics problem are you solving for Netflix? Who are the internal customers?", goal: "Frame as an analytics product, not an event log", hint: "The goal: produce watch hours, completion rates, engagement metrics used by Product (what to build), Content Licensing (what to buy), Finance (projections). Internal customers: BI, Data Science, ML teams.", rubricPoints: ["Names internal consumers (BI, DS, ML)", "Identifies core metrics: watch hours, completion rate", "Frames it as an analytics product, not just Kafka ingestion"], timeTarget: "1-2 min" },
  { step: 2, prompt: "What events do you need to collect? What's in each event?", goal: "17 event types with defined schema fields", hint: "At minimum: playback_started, heartbeat, playback_paused, playback_resumed, playback_stopped, playback_completed, quality_changed, buffer_started, buffer_ended, search_query_submitted.", rubricPoints: ["Lists 8+ distinct event types", "Mentions event_id (UUID), event_ts, session_id, profile_id as key fields", "Separates client-generated fields from server-stamped fields (ingest_ts)"], timeTarget: "3-4 min" },
  { step: 3, prompt: "How do you design your event schema to survive future changes? What format and what validation?", goal: "Avro + Schema Registry + BACKWARD_TRANSITIVE", hint: "Avro serialization. Confluent Schema Registry with BACKWARD_TRANSITIVE compatibility. Adding a field with a default is safe. Removing a required field breaks backward compatibility.", rubricPoints: ["Avro or Protobuf (not JSON)", "Schema Registry mentioned", "BACKWARD_TRANSITIVE or equivalent", "Explains what change would break compatibility"], timeTarget: "3 min" },
  { step: 4, prompt: "What Kafka topics do you create? What's the partition key for each and why?", goal: "6 topics, justified partition keys", hint: "heartbeat-events → session_id (ordering), playback-events → session_id, quality-events → session_id, search-events → profile_id (user-level ordering), recommendation-events → profile_id, error-events → device_id.", rubricPoints: ["Separates topics by domain", "Justifies session_id for heartbeats (ordering for sessionization)", "Avoids content_id as partition key (hot partition risk)", "Mentions retention differences (heartbeats 30d, search 14d)"], timeTarget: "3-4 min" },
  { step: 5, prompt: "How does your streaming pipeline process heartbeats into watch sessions? Walk me through step by step.", goal: "Bronze → Silver sessionization with exact logic", hint: "1. Kafka consumer reads heartbeats. 2. Dedup by event_id (Flink keyed state). 3. Key by session_id. 4. Order by event_ts. 5. Compute intervals between consecutive heartbeats where state='playing'. 6. Sum intervals = watched_seconds.", rubricPoints: ["Dedup happens in Silver (not Bronze)", "Keyed by session_id for ordered processing", "Intervals, not duration (pause-aware)", "Inactivity timeout for session close (30 min)"], timeTarget: "4-5 min" },
  { step: 6, prompt: "How do you design your lakehouse? Describe the Bronze, Silver, and Gold layers.", goal: "3 layers with clear responsibility and Iceberg format", hint: "Bronze: raw immutable events, partitioned by event_date. Silver: deduped, sessionized, enriched. Gold: daily aggregates (watch_hours_daily, completion_rate_daily). All on Iceberg/Parquet/zstd.", rubricPoints: ["Bronze is immutable and append-only", "Silver deduplicates and sessionizes", "Gold is pre-aggregated (not row-level)", "Iceberg mentioned (or Delta/Hudi) with justification"], timeTarget: "4-5 min" },
  { step: 7, prompt: "A heartbeat arrives 2 hours late. What happens?", goal: "Watermark, DLQ, batch reconciliation", hint: "Watermark = 30 minutes. Event is 2 hours past event_ts — beyond watermark → goes to DLQ. Daily batch job re-reads DLQ and reconciles into Silver via MERGE INTO. Result: watch hours correct by next day, not real-time.", rubricPoints: ["Watermark defined (30 min)", "Events beyond watermark → DLQ (not silently dropped)", "DLQ re-processed in batch (daily or hourly)", "MERGE INTO for upsert (not INSERT OVERWRITE)"], timeTarget: "3 min" },
  { step: 8, prompt: "The same heartbeat event arrives 3 times due to a Kafka producer retry. What happens?", goal: "event_id deduplication in Silver", hint: "Bronze retains all 3 (immutable). Silver dedup step: check event_id against keyed state store (24h TTL). First occurrence passes. Duplicates dropped. Result: Bronze has 3 rows, Silver has 1.", rubricPoints: ["Bronze keeps all 3 (correct)", "Silver deduplicates by event_id", "State-based dedup (Flink keyed state) or watermark-based (Spark dropDuplicates)", "Does not affect Gold accuracy"], timeTarget: "2-3 min" },
  { step: 9, prompt: "How do you ensure watch hours is accurate? What data quality checks would you put in place?", goal: "Named DQ checks with severity and action", hint: "1. Null event_id — reject. 2. Duplicate rate > 0.1% — alert. 3. Negative watch duration — quarantine. 4. event_ts far in future (> 1 day) — flag. 5. Watch duration > content runtime — flag.", rubricPoints: ["Quarantine bad records (don't drop silently)", "Metric: duplicate rate threshold with alert", "Metric: null rate per event type", "Rejects invalid records without stopping pipeline"], timeTarget: "3 min" },
  { step: 10, prompt: "A streaming show drops on Netflix and your pipeline starts falling behind. Kafka consumer lag is growing. What do you do?", goal: "Scale consumers to partition count, then partitions", hint: "1. Scale consumer group — add consumers up to partition count. 2. If still lagging: are partitions the bottleneck? 3. Increase partitions (careful — breaks ordering guarantees for existing consumers). 4. Profile: is lag caused by slow processing (Flink join?) or just throughput?", rubricPoints: ["Scales consumers first (up to partition count)", "Understands consumer ≤ partition count limit", "Investigates cause before just scaling", "Mentions trade-off of increasing partitions (ordering)"], timeTarget: "3 min" },
  { step: 11, prompt: "How do you backfill watch hours for the past 90 days after fixing a bug in your sessionization logic?", goal: "Re-read Bronze, MERGE INTO Silver, explicit rollback steps", hint: "1. Identify affected date range. 2. Read Bronze (immutable — always available). 3. Re-run corrected Silver transformation with time range filter. 4. MERGE INTO Silver (not INSERT OVERWRITE — fresh streaming data exists). 5. Re-run Gold for affected dates.", rubricPoints: ["Reads from Bronze (correct starting point)", "Does not INSERT OVERWRITE on shared date partitions", "Uses MERGE INTO for upsert semantics", "Re-runs Gold after Silver correction"], timeTarget: "3 min" },
  { step: 12, prompt: "Summarize your data engineering design in 2 minutes.", goal: "Coherent pipeline from event ingestion to Gold analytics", hint: "Event Collector → Kafka (6 topics, session_id partitions) → Schema Registry → Flink (dedup + sessionize) → Bronze/Silver/Gold on Iceberg. Late events → DLQ → daily batch. DQ checks at Silver. Compaction daily.", rubricPoints: ["Mentions all 3 layers with clear responsibility", "Names Kafka partition key rationale", "Late event and duplicate handling mentioned", "Connects pipeline to business outcome (watch hours for BI/ML)"], timeTarget: "2 min" },
];

type RubricDimension = { label: string; max: number; description: string; color: string };
const RUBRIC: RubricDimension[] = [
  { label: "Clarification quality", max: 10, description: "Did they ask clarifying questions before jumping in? Did they constrain scope to their role?", color: "#3b82f6" },
  { label: "Requirement coverage", max: 10, description: "Were functional and non-functional requirements explicitly stated? Any obvious omissions?", color: "#8b5cf6" },
  { label: "Scale estimation", max: 10, description: "Did they derive numbers from assumptions, not memorize? Did each number drive a design decision?", color: "#f59e0b" },
  { label: "Architecture clarity", max: 15, description: "Was the high-level architecture clear and correctly scoped? Were service boundaries logical?", color: "#06b6d4" },
  { label: "Deep dive depth", max: 20, description: "Were the deep dives technically accurate with correct DB/protocol choices and justifications?", color: "#10b981" },
  { label: "Tradeoff discussion", max: 15, description: "Did they name specific tradeoffs (not generic 'it depends')? Did they connect tradeoffs to Netflix's actual choices?", color: "#ec4899" },
  { label: "Failure handling", max: 10, description: "Did they discuss concrete failure modes with detection and mitigation? Did they understand fail-closed vs fail-open?", color: "#f97316" },
  { label: "Communication", max: 5, description: "Was the answer structured? Did they use transitions? Were they concise and precise?", color: "#a855f7" },
  { label: "Role focus", max: 5, description: "Did they stay in scope? Backend: no ML rabbit holes. Data: no frontend metrics.", color: "#84cc16" },
];

function ScoreInput({ dim, score, onScore }: { dim: RubricDimension; score: number; onScore: (s: number) => void }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ color: dim.color }}>{dim.label}</span>
        <span className="text-xs font-mono font-bold" style={{ color: "var(--text)" }}>{score} / {dim.max}</span>
      </div>
      <input type="range" min={0} max={dim.max} value={score} onChange={(e) => onScore(Number(e.target.value))}
        className="w-full mb-2" style={{ accentColor: dim.color }} />
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-faint)" }}>{dim.description}</p>
    </div>
  );
}

function MockInterviewTab({ role }: { role: Role }) {
  const [activeRole, setActiveRole] = useState<Role>(role);
  const [phase, setPhase] = useState<"prep" | "interview" | "scoring">("prep");
  const [currentStep, setCurrentStep] = useState(0);
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());
  const [scores, setScores] = useState<number[]>(RUBRIC.map((d) => Math.floor(d.max / 2)));

  const flow = activeRole === "Backend Engineer" ? BACKEND_FLOW : DATA_FLOW;
  const totalSteps = flow.length;
  const totalMax = RUBRIC.reduce((s, d) => s + d.max, 0);
  const totalScore = scores.reduce((s, v) => s + v, 0);
  const pct = Math.round((totalScore / totalMax) * 100);

  const scoreLabel = pct >= 85 ? { text: "Strong Hire", color: "#10b981" } : pct >= 70 ? { text: "Hire", color: "#3b82f6" } : pct >= 55 ? { text: "Borderline", color: "#f59e0b" } : { text: "No Hire", color: "#ef4444" };
  const roleColor = activeRole === "Backend Engineer" ? "#3b82f6" : "#10b981";

  function resetInterview() { setPhase("prep"); setCurrentStep(0); setRevealedHints(new Set()); setScores(RUBRIC.map((d) => Math.floor(d.max / 2))); }

  return (
    <div className="space-y-6">
      {/* Role selector */}
      <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Mock Interview</h2>
          <div className="flex gap-1 p-1 rounded-xl ml-auto" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            {(["Backend Engineer", "Data Engineer"] as Role[]).map((r) => (
              <button key={r} onClick={() => { setActiveRole(r); resetInterview(); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: activeRole === r ? (r === "Backend Engineer" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)") : "transparent", color: activeRole === r ? (r === "Backend Engineer" ? "#3b82f6" : "#10b981") : "var(--text-muted)", cursor: "pointer", border: "none" }}>
                {r}
              </button>
            ))}
          </div>
          {phase !== "prep" && (
            <button onClick={resetInterview} className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>
              Restart
            </button>
          )}
        </div>
      </div>

      {/* PREP phase */}
      {phase === "prep" && (
        <div className="space-y-4">
          <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>Before you start</h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              This mock interview simulates a {activeRole === "Backend Engineer" ? "45-minute backend system design" : "50-minute data engineering system design"} round for Netflix.
              {activeRole === "Backend Engineer" ? " 10 questions covering playback, watch progress, concurrency, and failures." : " 12 questions covering event design, Kafka, streaming pipeline, lakehouse, and data quality."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {[
                { label: "Questions", value: String(totalSteps) },
                { label: "Target time", value: activeRole === "Backend Engineer" ? "45 min" : "50 min" },
                { label: "Scoring rubric", value: `${totalMax} points` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg p-3 text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div className="text-2xl font-black font-mono mb-1" style={{ color: roleColor }}>{value}</div>
                  <div className="text-xs" style={{ color: "var(--text-faint)" }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-4 mb-6" style={{ background: `${roleColor}10`, border: `1px solid ${roleColor}30` }}>
              <p className="text-xs font-bold mb-2" style={{ color: roleColor }}>Interview tips</p>
              <ul className="space-y-1">
                {(activeRole === "Backend Engineer" ? [
                  "Clarify requirements before drawing anything. Ask: 1B users or 300M? Mobile or desktop? Global?",
                  "Stay in scope — you're designing the backend, not the recommendation engine.",
                  "State your assumptions out loud. 30s heartbeat interval → 2M writes/sec → Cassandra.",
                  "Justify every database choice. 'I'll use MySQL' is wrong here — say why you chose Cassandra.",
                ] : [
                  "Clarify what metrics matter to the business before designing the pipeline.",
                  "Name your event types explicitly — heartbeat, playback_started, quality_changed.",
                  "State the partition key rationale. session_id, not content_id, not random.",
                  "Explain Bronze/Silver/Gold separation — each layer has a distinct responsibility.",
                ]).map((tip, i) => (
                  <li key={i} className="text-xs flex gap-2" style={{ color: "var(--text-muted)" }}>
                    <span style={{ color: roleColor }}>•</span>{tip}
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => setPhase("interview")}
              className="w-full py-3 rounded-xl text-sm font-bold transition-colors"
              style={{ background: roleColor, color: "#fff", cursor: "pointer", border: "none" }}>
              Start Mock Interview
            </button>
          </div>
        </div>
      )}

      {/* INTERVIEW phase */}
      {phase === "interview" && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="rounded-xl px-5 py-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold" style={{ color: roleColor }}>Question {currentStep + 1} of {totalSteps}</span>
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>{flow[currentStep].timeTarget}</span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ background: "var(--bg)", height: 6 }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ background: roleColor, width: `${((currentStep + 1) / totalSteps) * 100}%` }} />
            </div>
          </div>

          {/* Question */}
          <div className="rounded-xl overflow-hidden" style={{ border: `2px solid ${roleColor}`, background: "var(--bg-card)" }}>
            <div className="px-5 py-4" style={{ background: `${roleColor}10` }}>
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5" style={{ background: roleColor, color: "#fff" }}>{currentStep + 1}</span>
                <p className="text-base font-bold leading-snug" style={{ color: "var(--text)" }}>{flow[currentStep].prompt}</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--bg)", color: "var(--text-faint)", border: "1px solid var(--border)" }}>Goal: {flow[currentStep].goal}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--bg)", color: "var(--text-faint)", border: "1px solid var(--border)" }}>⏱ {flow[currentStep].timeTarget}</span>
              </div>
              <button
                onClick={() => setRevealedHints(prev => { const n = new Set(prev); n.add(currentStep); return n; })}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ background: "var(--bg)", border: `1px solid ${roleColor}40`, color: roleColor, cursor: "pointer", display: revealedHints.has(currentStep) ? "none" : "inline-block" }}>
                Show hint ▼
              </button>
              {revealedHints.has(currentStep) && (
                <div className="rounded-lg p-3" style={{ background: `${roleColor}08`, border: `1px solid ${roleColor}20` }}>
                  <p className="text-[11px] font-bold mb-1" style={{ color: roleColor }}>Hint</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{flow[currentStep].hint}</p>
                </div>
              )}
              <div className="pt-1">
                <p className="text-[11px] font-bold mb-2" style={{ color: "var(--text-faint)" }}>What to cover</p>
                <ul className="space-y-1">
                  {flow[currentStep].rubricPoints.map((rp, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span className="shrink-0 mt-0.5" style={{ color: roleColor }}>✓</span>{rp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button onClick={() => setCurrentStep(s => s - 1)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium flex-1"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer" }}>
                ← Previous
              </button>
            )}
            {currentStep < totalSteps - 1 ? (
              <button onClick={() => setCurrentStep(s => s + 1)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold flex-1"
                style={{ background: roleColor, color: "#fff", cursor: "pointer", border: "none" }}>
                Next Question →
              </button>
            ) : (
              <button onClick={() => setPhase("scoring")}
                className="px-4 py-2.5 rounded-xl text-sm font-bold flex-1"
                style={{ background: "#10b981", color: "#fff", cursor: "pointer", border: "none" }}>
                Score My Interview →
              </button>
            )}
          </div>
        </div>
      )}

      {/* SCORING phase */}
      {phase === "scoring" && (
        <div className="space-y-5">
          {/* Score summary */}
          <div className="rounded-xl p-6 text-center" style={{ background: "var(--bg-card)", border: `2px solid ${scoreLabel.color}` }}>
            <div className="text-5xl font-black font-mono mb-1" style={{ color: scoreLabel.color }}>{totalScore}</div>
            <div className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>out of {totalMax} points ({pct}%)</div>
            <div className="inline-block px-4 py-1.5 rounded-full text-sm font-bold" style={{ background: `${scoreLabel.color}15`, color: scoreLabel.color }}>{scoreLabel.text}</div>
          </div>

          {/* Per-dimension scoring */}
          <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-base font-bold mb-4" style={{ color: "var(--text)" }}>Adjust your scores</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RUBRIC.map((dim, i) => (
                <ScoreInput key={dim.label} dim={dim} score={scores[i]} onScore={(s) => { const n = [...scores]; n[i] = s; setScores(n); }} />
              ))}
            </div>
          </div>

          {/* Interpretation */}
          <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-base font-bold mb-3" style={{ color: "var(--text)" }}>Score interpretation</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { range: "85-100%", label: "Strong Hire", color: "#10b981", desc: "Exceptional. Deep technical depth, clear tradeoffs, structured communication." },
                { range: "70-84%", label: "Hire", color: "#3b82f6", desc: "Solid design. Good depth in key areas. Minor gaps in edge cases." },
                { range: "55-69%", label: "Borderline", color: "#f59e0b", desc: "Partial design. Missing key tradeoffs or one major DB choice is wrong." },
                { range: "0-54%", label: "No Hire", color: "#ef4444", desc: "Fundamental gaps. Wrong DB choices, no tradeoff awareness, or scoping issues." },
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

export { MockInterviewTab };
