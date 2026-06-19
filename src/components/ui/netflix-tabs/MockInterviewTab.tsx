"use client";

import { useState, useEffect, useRef } from "react";

const PERSONAS = [
  { id: "backend", label: "Backend-heavy", color: "#3b82f6", focus: "architecture, services, APIs, data model, consistency" },
  { id: "data", label: "Data-heavy", color: "#10b981", focus: "data pipeline, Kafka, Flink, Iceberg, ML features" },
  { id: "ml", label: "ML-heavy", color: "#8b5cf6", focus: "recommendation system, feature store, cold start, A/B testing" },
  { id: "sre", label: "SRE-heavy", color: "#f59e0b", focus: "failures, CDN, observability, SLOs, cost, chaos engineering" },
];

const MOCK_PATHS = {
  "15": {
    label: "15-minute quick check",
    description: "Scope + requirements + high-level architecture + one deep dive",
    steps: [
      { time: "0–2 min", title: "Clarify Scope", prompt: "What aspect of Netflix are we designing? Assume for now: complete platform. State the core use cases you'll cover: auth, browse, play, watch history, recommendations. Ask: any particular scale or region constraints?", rubric: ["Asked at least 2 clarifying questions", "Stated scope clearly", "Identified online vs data platform split"] },
      { time: "2–5 min", title: "Requirements & Scale", prompt: "State functional and non-functional requirements. Give 3–4 key scale numbers: concurrent streams, CDN bandwidth, heartbeat events/sec, watch history writes/day.", rubric: ["P0 requirements stated", "At least 2 scale numbers with formulas", "CDN bandwidth number mentioned"] },
      { time: "5–12 min", title: "High-Level Architecture", prompt: "Draw the system. Cover: client → API Gateway → core services → data stores → CDN/OCA. Call out control plane vs data plane split. Name the key storage choices.", rubric: ["Control plane vs data plane separation", "API never serves video bytes", "Mentioned Cassandra for watch history, MySQL for billing", "CDN/OCA in the diagram"] },
      { time: "12–15 min", title: "One Failure Mode", prompt: "Pick the most critical failure: DRM down or Billing down. Walk through user impact, detection, and mitigation. Explain fail open vs fail closed decision.", rubric: ["Correctly identified fail open vs closed", "Stated specific detection mechanism", "Named fallback strategy"] },
    ],
  },
  "45": {
    label: "45-minute standard interview",
    description: "Full architecture, data model, pipeline overview, failures, tradeoffs",
    steps: [
      { time: "0–3 min", title: "Scope & Clarifying Questions", prompt: "Clarify: full platform, playback focus, or data pipeline? Ask about scale, global availability, offline downloads, real-time analytics requirement.", rubric: ["Asked 3+ clarifying questions", "Stated scope explicitly", "Mentioned online vs data platform"] },
      { time: "3–8 min", title: "Requirements + Scale Estimation", prompt: "State functional requirements by domain (user, catalog, playback, history, recs, content ops, data). Non-functional: latency SLOs, availability, consistency model. Derive CDN bandwidth and event volume.", rubric: ["P0/P1 requirements differentiated", "CDN bandwidth formula stated", "Consistency requirements per domain"] },
      { time: "8–20 min", title: "Full Architecture", prompt: "Draw complete system. Cover all layers: client, API Gateway, core services (20+), data stores, video pipeline, data platform. Explain control plane vs data plane. Walk through press-play flow end-to-end.", rubric: ["All major services named", "Press-play flow walked through", "Playback latency budget mentioned", "OCA selection explained"] },
      { time: "20–28 min", title: "Data Model Deep Dive", prompt: "Explain storage choices. Cassandra for watch history (why partition by profile_id not title_id). MySQL for billing. Redis for concurrency. EVCache for entitlement. Walk through resume_position_by_profile_title schema.", rubric: ["Cassandra partition key choice justified", "Hot partition risk mentioned", "Consistency per storage choice stated", "TTL mentioned for volatile data"] },
      { time: "28–36 min", title: "Data Pipeline Overview", prompt: "Explain event flow: client SDK → Event Gateway → Kafka → Flink (streaming) → S3/Iceberg (batch) → Trino/ML. Mention deduplication, schema registry, late data handling, DLQ.", rubric: ["Kafka as durable log (replay)", "Flink for streaming / Spark for batch", "Bronze/silver/gold lake zones", "At-least-once vs exactly-once tradeoff"] },
      { time: "36–42 min", title: "Failures & Tradeoffs", prompt: "Walk through 3 failure scenarios with mitigation. State 2 technology tradeoffs with justification (e.g., Cassandra vs MySQL, Kafka vs SQS, precomputed vs online recs).", rubric: ["Fail open/closed decision per scenario", "Tradeoffs include 'when choice is wrong'", "Rejection reason stated for each"] },
      { time: "42–45 min", title: "Wrap-up", prompt: "Summarize key design decisions in 60 seconds. State 2 things you'd improve with more time.", rubric: ["Control plane vs data plane mentioned", "Top 3 design decisions called out", "Honest about what was skipped"] },
    ],
  },
  "60": {
    label: "60-minute senior/principal",
    description: "Everything in 45-min + multi-region, ML depth, security, observability, cost",
    steps: [
      { time: "0–5 min", title: "Scope + Assumptions", prompt: "Treat this as a real interview. Clarify scope, scale, regions. State architectural assumptions explicitly (active-active multi-region, eventual consistency for history, strong for billing).", rubric: ["Multi-region mentioned upfront", "Consistency assumptions stated", "Cost/build vs buy perspective mentioned"] },
      { time: "5–15 min", title: "Architecture + Press-Play Flow", prompt: "Full architecture including multi-region active-active. Press-play flow with latency budget. Explain why steps 5–9 are parallel fan-out.", rubric: ["Parallel fan-out explained", "Latency budget stated (~85ms)", "Multi-region Cassandra mentioned", "Active-active vs active-passive tradeoff"] },
      { time: "15–22 min", title: "Data Model + Access Patterns", prompt: "Walk through all storage tiers: relational (billing), Cassandra (watch history, sessions), Redis (concurrency, entitlement), EVCache, Elasticsearch, S3/Iceberg. For each: why this store, partition key, consistency.", rubric: ["All 6+ storage tiers covered", "Partition key reasoning for each", "Hot partition risk addressed", "Multi-region replication explained"] },
      { time: "22–32 min", title: "Data Pipeline Deep Dive", prompt: "Full pipeline: client SDK → Kafka fronting cluster → stream router → Flink jobs → Bronze S3 → Spark cleaning → Iceberg Silver/Gold → Trino → Feature Store → ML Training. Explain schema evolution, late data watermarking, compaction.", rubric: ["Schema registry mentioned", "Watermarking for late data", "Iceberg time travel mentioned", "Feature store explained"] },
      { time: "32–40 min", title: "ML / Recommendations Deep Dive", prompt: "Offline/nearline/online split. Candidate generation + ranking. Feature store. Cold start (user + title). A/B testing. Three-tier fallback. Model monitoring.", rubric: ["Offline/nearline/online clearly separated", "Cold start strategy for both user and title", "Fallback tiers named", "A/B testing measurement metrics"] },
      { time: "40–47 min", title: "Security + DRM", prompt: "DRM flow end-to-end (7 steps). Signed CDN URLs. JWT + Redis revocation. Concurrency enforcement. GDPR deletion propagation.", rubric: ["DRM fail closed justified", "Signed URL HMAC design", "Redis revocation list mentioned", "GDPR deletion path explained"] },
      { time: "47–55 min", title: "Observability + Cost", prompt: "Top 5 oncall metrics. SLO for playback. Top 3 cost drivers. How to optimize each. CDN cache hit rate economics.", rubric: ["CDN cache hit as cost proxy", "Playback start time SLO stated", "At least 3 cost optimization levers", "Build-vs-buy CDN economics"] },
      { time: "55–60 min", title: "Migration + What I'd Change", prompt: "How would you migrate from a monolith to this design? What would you build differently if starting today? What are the top 3 unknowns?", rubric: ["Strangler fig pattern or similar", "Event sourcing migration consideration", "Honest about unknowns", "Mentioned what to prototype first"] },
    ],
  },
};

const SCORING_RUBRIC = [
  { dimension: "Scope Clarity", description: "Did you clarify before designing? Did you state what's in/out of scope?" },
  { dimension: "Requirement Coverage", description: "Did you cover functional + non-functional? P0 vs P1 distinction?" },
  { dimension: "Scale Reasoning", description: "Did you derive numbers (not guess)? Formula-first approach?" },
  { dimension: "Architecture Correctness", description: "Control plane vs data plane. No video bytes from API. OCA/CDN." },
  { dimension: "Data Modeling", description: "Right store per access pattern. Partition key reasoning. Consistency per table." },
  { dimension: "Failure Handling", description: "Fail open/closed decisions. Cascading failure prevention. Graceful degradation." },
  { dimension: "Tradeoff Depth", description: "Technology choices justified. 'When this choice is wrong' stated." },
  { dimension: "Communication Quality", description: "Clear narration while drawing. Proactive flagging of tradeoffs." },
];

export function MockInterviewTab() {
  const [mode, setMode] = useState<"15" | "45" | "60" | null>(null);
  const [persona, setPersona] = useState<string>("backend");
  const [currentStep, setCurrentStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showRubric, setShowRubric] = useState(false);
  const [showAnswer, setShowAnswer] = useState<Record<number, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const path = mode ? MOCK_PATHS[mode] : null;
  const totalSteps = path?.steps.length ?? 0;
  const step = path?.steps[currentStep];

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    setCurrentStep(0);
    setAnswers({});
    setScores({});
    setShowAnswer({});
    setShowRubric(false);
  };

  const exportNotes = () => {
    if (!path) return;
    const lines = [`Mock Interview — ${path.label}`, `Persona: ${PERSONAS.find(p => p.id === persona)?.label}`, `Duration: ${formatTime(elapsed)}`, "", ...path.steps.map((s, i) => [`## Step ${i + 1}: ${s.title} (${s.time})`, `Prompt: ${s.prompt}`, answers[i] ? `My answer: ${answers[i]}` : "(no answer recorded)", ""].join("\n"))];
    navigator.clipboard.writeText(lines.join("\n")).then(() => alert("Notes copied to clipboard!"));
  };

  if (!mode) {
    return (
      <div className="space-y-8 pb-10">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Mock Interview</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Simulate a real Netflix system design interview. Choose duration, pick an interviewer persona, and practice with a timer.</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>Interviewer Persona</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PERSONAS.map(p => (
              <button key={p.id} onClick={() => setPersona(p.id)}
                className="p-3 rounded-xl text-left transition-colors"
                style={{ background: persona === p.id ? `${p.color}12` : "var(--bg-card)", border: `1px solid ${persona === p.id ? p.color : "var(--border)"}`, cursor: "pointer" }}>
                <div className="text-xs font-bold mb-1" style={{ color: persona === p.id ? p.color : "var(--text)" }}>{p.label}</div>
                <div className="text-[10px] leading-relaxed" style={{ color: "var(--text-faint)" }}>Focus: {p.focus}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>Interview Duration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.entries(MOCK_PATHS) as [string, typeof MOCK_PATHS["15"]][]).map(([dur, p]) => (
              <button key={dur} onClick={() => { setMode(dur as "15" | "45" | "60"); reset(); }}
                className="p-5 rounded-2xl text-left transition-colors"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", cursor: "pointer" }}>
                <div className="text-2xl font-black mb-1" style={{ color: "var(--blue-text)" }}>{dur} min</div>
                <div className="text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>{p.label}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{p.description}</div>
                <div className="mt-3 text-[10px]" style={{ color: "var(--text-faint)" }}>{p.steps.length} steps</div>
              </button>
            ))}
          </div>
        </div>

        {/* Scoring Rubric Preview */}
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>Scoring Rubric (8 Dimensions)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SCORING_RUBRIC.map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>{i + 1}</span>
                <div>
                  <div className="text-xs font-semibold" style={{ color: "var(--text)" }}>{r.dimension}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>{r.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedPersona = PERSONAS.find(p => p.id === persona);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>{path?.label}</h2>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
            Persona: <span style={{ color: selectedPersona?.color }}>{selectedPersona?.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-mono text-2xl font-bold px-4 py-2 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: elapsed > parseInt(mode) * 60 ? "#ef4444" : "var(--blue-text)" }}>
            {formatTime(elapsed)}
          </div>
          <button onClick={() => setRunning(r => !r)} className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: running ? "#fee2e2" : "var(--blue-soft)", color: running ? "#991b1b" : "var(--blue-text)", border: "1px solid var(--border)", cursor: "pointer" }}>
            {running ? "Pause" : elapsed === 0 ? "Start" : "Resume"}
          </button>
          <button onClick={reset} className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
            Reset
          </button>
          <button onClick={() => setMode(null)} className="px-4 py-2 rounded-xl text-sm"
            style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
            ← Back
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5">
        {path?.steps.map((_, i) => (
          <div key={i} onClick={() => setCurrentStep(i)}
            className="h-2 rounded-full flex-1 cursor-pointer transition-colors"
            style={{ background: i < currentStep ? "#10b981" : i === currentStep ? "var(--blue-text)" : "var(--border)" }} />
        ))}
      </div>

      {/* Current Step */}
      {step && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: "var(--blue-soft)" }}>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--blue-text)" }}>Step {currentStep + 1} of {totalSteps} · {step.time}</div>
              <div className="text-lg font-bold" style={{ color: "var(--text)" }}>{step.title}</div>
            </div>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button onClick={() => setCurrentStep(s => s - 1)} className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>← Prev</button>
              )}
              {currentStep < totalSteps - 1 && (
                <button onClick={() => setCurrentStep(s => s + 1)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "var(--blue-text)", color: "#fff", border: "none", cursor: "pointer" }}>Next →</button>
              )}
            </div>
          </div>
          <div className="p-5 space-y-4" style={{ background: "var(--bg-card)" }}>
            <div className="rounded-lg p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>Interviewer Prompt</div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{step.prompt}</p>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>Your Answer (optional — for self-review)</div>
              <textarea
                value={answers[currentStep] || ""}
                onChange={e => setAnswers(a => ({ ...a, [currentStep]: e.target.value }))}
                placeholder="Type your answer here..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg text-sm resize-y outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "inherit" }}
              />
            </div>

            <button onClick={() => setShowAnswer(s => ({ ...s, [currentStep]: !s[currentStep] }))} className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: showAnswer[currentStep] ? "#f0fdf4" : "var(--bg)", border: "1px solid var(--border)", color: showAnswer[currentStep] ? "#166534" : "var(--text-muted)", cursor: "pointer" }}>
              {showAnswer[currentStep] ? "Hide Rubric" : "Reveal Scoring Rubric"}
            </button>

            {showAnswer[currentStep] && (
              <div className="rounded-lg p-4" style={{ background: "#f0fdf4", border: "1px solid #86efac" }}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#166534" }}>Rubric Checkpoints</div>
                <div className="space-y-2">
                  {step.rubric.map((r, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <input type="checkbox" checked={!!scores[`${currentStep}-${i}`]}
                        onChange={e => setScores(s => ({ ...s, [`${currentStep}-${i}`]: e.target.checked ? 1 : 0 }))}
                        className="w-4 h-4 rounded" style={{ cursor: "pointer" }} />
                      <span className="text-sm" style={{ color: "#15803d" }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Done state */}
      {currentStep === totalSteps - 1 && (
        <div className="space-y-4">
          <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>Interview Complete</h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Time: {formatTime(elapsed)} · Target: {mode} min</p>
            <button onClick={() => setShowRubric(!showRubric)} className="text-sm px-4 py-2 rounded-lg mr-2"
              style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--border)", cursor: "pointer" }}>
              {showRubric ? "Hide" : "Show"} Full Scoring Rubric
            </button>
            <button onClick={exportNotes} className="text-sm px-4 py-2 rounded-lg"
              style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
              Copy Notes
            </button>
          </div>

          {showRubric && (
            <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>Scoring Rubric</h3>
              <div className="space-y-3">
                {SCORING_RUBRIC.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <input type="checkbox" checked={!!scores[`rubric-${i}`]}
                      onChange={e => setScores(s => ({ ...s, [`rubric-${i}`]: e.target.checked ? 1 : 0 }))}
                      className="w-4 h-4 rounded mt-0.5 shrink-0" style={{ cursor: "pointer" }} />
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{r.dimension}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{r.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
