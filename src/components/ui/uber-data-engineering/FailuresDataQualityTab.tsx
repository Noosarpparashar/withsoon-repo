"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { UBER_FAILURE_QUALITY_SECTIONS } from "./data";
import AnchorBrand from "./AnchorBrand";
import {
  getActiveDataDesignSection,
  scrollToDataDesignSection,
} from "../data-design/sectionAnchors";

const C = {
  card: "var(--bg-card)",
  card2: "var(--bg-muted)",
  border: "var(--border)",
  text: "var(--text)",
  muted: "var(--text-muted)",
  blue: "#111111",
  cyan: "#2f2f2f",
  green: "#3f3f3f",
  amber: "#4b4b4b",
  red: "#595959",
};

const QUALITY = [
  {
    id: "infrastructure",
    label: "Infrastructure",
    color: C.blue,
    signal: "Can the regional platform carry traffic?",
    metrics: [
      "under-replicated partitions",
      "broker disk + network",
      "checkpoint duration",
      "task restarts",
    ],
    slo: "Regional Kafka and Flink capacity remains available through one AZ loss.",
    response:
      "Page the platform owner before consumer lag reaches the live marketplace freshness budget.",
  },
  {
    id: "pipeline",
    label: "Pipeline",
    color: C.cyan,
    signal: "Are Uber events moving on time?",
    metrics: ["consumer lag", "watermark delay", "backpressure", "DLQ rate"],
    slo: "99.9% of accepted location events reach the regional live map within 5 seconds.",
    response:
      "Separate producer delay from Kafka lag and Flink processing delay before scaling or failing over.",
  },
  {
    id: "quality",
    label: "Data quality",
    color: C.amber,
    signal: "Are the records usable and internally consistent?",
    metrics: [
      "freshness + volume",
      "completeness",
      "uniqueness",
      "validity + drift",
    ],
    slo: "Invalid GPS jumps, duplicate event IDs, and illegal trip transitions never enter trusted outputs.",
    response:
      "Quarantine suspect events with reason codes; keep their Kafka coordinates for replay.",
  },
  {
    id: "business",
    label: "Reconciliation",
    color: C.green,
    signal: "Does technical truth agree with Uber business outcomes?",
    metrics: [
      "requests to trips",
      "trips to captures",
      "captures to settlements",
      "earnings to payouts",
    ],
    slo: "99.5% of official city-day facts publish by 06:00 local after reconciliation.",
    response:
      "Hold the affected Gold partition and serve the last-good snapshot instead of publishing wrong totals.",
  },
] as const;

const FAILURES = [
  {
    id: "region",
    name: "Kafka region outage",
    impact: "Driver GPS and lifecycle topics stop advancing in one region.",
    detection:
      "Consumer lag, under-replicated partitions, and broker health alarms rise together.",
    blast:
      "Only the affected region; other city clusters continue independently.",
    mitigation:
      "Fail producers and consumers to the paired regional cluster. Dispatch uses last-known driver positions briefly.",
    recovery:
      "Restore the primary cluster, replay retained offsets, and verify offset and watermark continuity.",
    prevention:
      "AZ-aware replicas, tested failover, explicit RPO/RTO, and no global shared Kafka blast radius.",
    color: C.red,
  },
  {
    id: "flink",
    name: "Flink job crash",
    impact: "A live supply, surge, or ETA window stops producing updates.",
    detection:
      "Checkpoint failure, task restart, watermark stall, and output-freshness alerts.",
    blast:
      "The narrow job and its regional output, not every marketplace signal.",
    mitigation:
      "Restart from the last durable checkpoint while downstream serves its last valid keyed state.",
    recovery:
      "Confirm checkpoint restore, event-time continuity, duplicate suppression, and output parity.",
    prevention:
      "Narrow jobs, savepoints, bounded state TTL, backpressure alarms, and canary upgrades.",
    color: C.cyan,
  },
  {
    id: "gps",
    name: "Bad GPS data",
    impact:
      "Spoofed or impossible locations can distort supply, matching, surge, and route distance.",
    detection:
      "Speed above 300 km/h, teleport distance, sequence regression, and distribution drift checks.",
    blast:
      "The driver, trip, and affected H3 cells until the event is removed from aggregates.",
    mitigation:
      "Flag or drop the ping before live state; preserve it in quarantine with the validation reason.",
    recovery:
      "Recompute affected trip routes and supply windows, then retroactively flag impacted trips.",
    prevention:
      "Client attestation, sequence checks, multi-signal anomaly rules, and monitored model thresholds.",
    color: C.amber,
  },
  {
    id: "gold",
    name: "Stale Gold publish",
    impact:
      "Finance, city operations, and BI would receive incomplete official facts.",
    detection:
      "Airflow SLA miss, missing partition, source-count mismatch, or settlement variance.",
    blast:
      "Only consumers of the affected region/day partition; live marketplace state is independent.",
    mitigation:
      "Keep the last-good certified snapshot visible and mark the new partition stale.",
    recovery:
      "Correct the job, rebuild the bounded partition, validate totals, and atomically promote it.",
    prevention:
      "Data-aware dependencies, staging gates, idempotent reruns, and versioned publication.",
    color: C.green,
  },
  {
    id: "schema",
    name: "Breaking app schema",
    impact:
      "A mobile release sends payloads consumers cannot parse or interpret safely.",
    detection:
      "Schema-registry rejection, parser-error growth, and a producer-version DLQ spike.",
    blast:
      "The released app version and the topics it writes, isolated before trusted tables.",
    mitigation:
      "Quarantine incompatible events, page the producer owner, and block the writer if necessary.",
    recovery:
      "Ship a compatible producer or parser, then replay quarantined events in event-time order.",
    prevention:
      "Contract tests, backward-compatible changes, semantic versioning, and canary mobile releases.",
    color: C.blue,
  },
] as const;

const GATES = [
  {
    name: "Contract",
    label: "Before Kafka",
    color: C.blue,
    checks: "Required fields, types, units, timezone, compatibility, PII class",
    failure: "Reject the write or route the producer version to quarantine.",
    evidence: "Schema ID + producer version + owner",
  },
  {
    name: "Stream",
    label: "Before live state",
    color: C.cyan,
    checks:
      "event_id dedupe, sequence order, GPS validity, legal trip transitions",
    failure:
      "Side output with reason; do not update supply, surge, or ETA state.",
    evidence: "event_id + Kafka coordinates + rule ID",
  },
  {
    name: "Silver",
    label: "Before conformance",
    color: C.amber,
    checks:
      "Completeness, referential integrity, tokenized PII, late-event repair",
    failure: "Quarantine the row or hold only the affected table partition.",
    evidence: "source offsets + job version + validation result",
  },
  {
    name: "Gold",
    label: "Before publish",
    color: C.green,
    checks:
      "Trip lifecycle counts, captures vs settlements, earnings vs payouts",
    failure: "Keep the last-good snapshot and block atomic promotion.",
    evidence: "candidate snapshot + reconciliation report + approver",
  },
] as const;

const RECOVERY = [
  {
    id: "correctness",
    label: "Correctness bug",
    color: C.amber,
    premise: "A route-distance bug affected Bengaluru trips for 3 days.",
    steps: [
      ["Bound impact", "Find dates, trip IDs, and Kafka offset ranges."],
      ["Recompute", "Run corrected code into isolated versioned tables."],
      [
        "Validate",
        "Compare route samples, trip totals, fares, and settlements.",
      ],
      [
        "Promote",
        "Atomically switch governed readers to the approved snapshot.",
      ],
    ],
    guarantee:
      "Never overwrite production Gold in place; finance and legal keep the old and new evidence.",
  },
  {
    id: "regional",
    label: "Regional disaster",
    color: C.red,
    premise: "A regional Kafka or compute plane is unavailable.",
    steps: [
      [
        "Contain",
        "Keep unaffected regions independent and stop split-brain writes.",
      ],
      [
        "Fail over",
        "Use the paired cluster and last-known live state within the RTO.",
      ],
      [
        "Replay",
        "Consume the missing retained offset range after service returns.",
      ],
      [
        "Reconcile",
        "Compare gaps, duplicates, watermarks, and financial outcomes.",
      ],
    ],
    guarantee:
      "Define RPO/RTO per workload; payments require stronger replication and settlement reconciliation.",
  },
] as const;

function Anchors({ active, go }: { active: string; go: (id: string) => void }) {
  return (
    <aside className="hidden w-[232px] shrink-0 xl:block">
      <div
        data-testid="anchor-rail"
        className="fixed bottom-4 top-[140px] z-30 w-[200px] overflow-y-auto pr-1"
        style={{ left: "max(16px, calc((100vw - 1600px) / 2 + 16px))" }}
      >
        <AnchorBrand />
        <p
          className="mb-3 text-[10px] font-bold uppercase tracking-[.2em]"
          style={{ color: C.muted }}
        >
          Page anchors
        </p>
        <div className="space-y-2">
          {UBER_FAILURE_QUALITY_SECTIONS.map((section, index) => {
            const selected = section.id === active;
            return (
              <button
                key={section.id}
                data-testid={`stage-nav-${section.id}`}
                aria-current={selected ? "location" : undefined}
                onClick={() => go(section.id)}
                className="relative flex h-[54px] w-full items-center gap-3 rounded-md border px-3 text-left text-sm font-semibold"
                style={{
                  borderColor: selected ? C.blue : C.border,
                  background: selected
                    ? "color-mix(in srgb, #111111 13%, var(--bg-card))"
                    : C.card,
                  color: selected ? C.text : C.muted,
                }}
              >
                {selected ? (
                  <span
                    className="absolute inset-y-0 left-0 w-1"
                    style={{ background: C.blue }}
                  />
                ) : null}
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    background: selected ? C.blue : C.card2,
                    color: selected ? "white" : C.muted,
                  }}
                >
                  {index + 1}
                </span>
                {section.title}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function Section({
  id,
  title,
  intro,
  color,
  children,
}: {
  id: string;
  title: string;
  intro: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-[24px] border p-5 md:p-6"
      style={{
        borderColor: `${color}3d`,
        background: C.card,
      }}
    >
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p
        className="mt-2 max-w-4xl text-sm leading-6"
        style={{ color: C.muted }}
      >
        {intro}
      </p>
      {children}
    </section>
  );
}

function QualitySlos() {
  const [active, setActive] = useState("pipeline");
  const selected = QUALITY.find((item) => item.id === active) ?? QUALITY[1];
  return (
    <div
      className="mt-5 overflow-hidden rounded-2xl border"
      style={{ borderColor: C.border, background: C.card2 }}
    >
      <div
        className="grid gap-2 border-b p-3 sm:grid-cols-4"
        style={{ borderColor: C.border }}
      >
        {QUALITY.map((item) => (
          <button
            type="button"
            aria-pressed={active === item.id}
            key={item.id}
            onMouseEnter={() => setActive(item.id)}
            onFocus={() => setActive(item.id)}
            onClick={() => setActive(item.id)}
            className="min-h-[72px] rounded-md border px-3 py-2 text-left"
            style={{
              borderColor: active === item.id ? item.color : C.border,
              background: active === item.id ? `${item.color}1c` : C.card,
            }}
          >
            <span className="text-xs font-bold" style={{ color: item.color }}>
              {item.label}
            </span>
            <span
              className="mt-1 block text-xs leading-[18px]"
              style={{ color: C.muted }}
            >
              {item.signal}
            </span>
          </button>
        ))}
      </div>
      <div className="grid lg:grid-cols-[1fr_1.15fr]">
        <div
          className="border-b p-5 lg:border-b-0 lg:border-r"
          style={{ borderColor: C.border }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[.14em]"
            style={{ color: selected.color }}
          >
            Signals to monitor
          </p>
          <div
            className="mt-4 grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2"
            style={{ borderColor: C.border }}
          >
            {selected.metrics.map((metric) => (
              <div
                key={metric}
                className="px-3 py-3 text-xs font-medium"
                style={{ background: C.card }}
              >
                {metric}
              </div>
            ))}
          </div>
        </div>
        <div className="p-5">
          <p
            className="text-[10px] font-bold uppercase tracking-[.14em]"
            style={{ color: selected.color }}
          >
            Uber SLO
          </p>
          <p className="mt-3 text-lg font-semibold leading-7">{selected.slo}</p>
          <p
            className="mt-4 border-l-2 pl-4 text-sm leading-6"
            style={{ borderColor: selected.color, color: C.muted }}
          >
            {selected.response}
          </p>
        </div>
      </div>
    </div>
  );
}

function FailureResponse() {
  const [active, setActive] = useState("gps");
  const selected =
    FAILURES.find((failure) => failure.id === active) ?? FAILURES[2];
  const phases = [
    ["Detect", selected.detection],
    ["Blast radius", selected.blast],
    ["Mitigate", selected.mitigation],
    ["Recover", selected.recovery],
    ["Prevent", selected.prevention],
  ];
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
      <div className="space-y-2">
        {FAILURES.map((failure) => (
          <button
            type="button"
            aria-pressed={active === failure.id}
            key={failure.id}
            onMouseEnter={() => setActive(failure.id)}
            onFocus={() => setActive(failure.id)}
            onClick={() => setActive(failure.id)}
            className="w-full border-l-4 px-4 py-3 text-left"
            style={{
              borderColor: failure.color,
              background:
                active === failure.id ? `${failure.color}1c` : C.card2,
            }}
          >
            <span className="text-sm font-semibold">{failure.name}</span>
            <span
              className="mt-1 block text-[11px] leading-4"
              style={{ color: C.muted }}
            >
              {failure.impact}
            </span>
          </button>
        ))}
      </div>
      <div
        className="self-center overflow-hidden rounded-2xl border"
        style={{ borderColor: `${selected.color}55`, background: C.card2 }}
      >
        <div
          className="border-b px-5 py-4"
          style={{ borderColor: C.border, background: `${selected.color}12` }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[.14em]"
            style={{ color: selected.color }}
          >
            Selected incident
          </p>
          <h3 className="mt-1 text-xl font-semibold">{selected.name}</h3>
        </div>
        <div className="grid md:grid-cols-5">
          {phases.map(([label, detail], index) => (
            <div
              key={label}
              className="relative border-b p-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              style={{ borderColor: C.border }}
            >
              <span
                className="text-[10px] font-bold uppercase"
                style={{ color: selected.color }}
              >
                0{index + 1} {label}
              </span>
              <p className="mt-3 text-xs leading-5" style={{ color: C.muted }}>
                {detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QualityGates() {
  const [active, setActive] = useState(0);
  const selected = GATES[active];
  return (
    <div
      className="mt-5 overflow-hidden rounded-2xl border"
      style={{ borderColor: C.border, background: C.card2 }}
    >
      <div className="grid items-stretch p-4 md:grid-cols-[1fr_34px_1fr_34px_1fr_34px_1fr]">
        {GATES.map((gate, index) => (
          <div className="contents" key={gate.name}>
            <button
              type="button"
              aria-pressed={active === index}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onClick={() => setActive(index)}
              className="min-h-[112px] border-l-4 p-4 text-left"
              style={{
                borderColor: gate.color,
                background: active === index ? `${gate.color}1c` : C.card,
              }}
            >
              <span
                className="text-[10px] font-bold uppercase"
                style={{ color: gate.color }}
              >
                {gate.label}
              </span>
              <strong className="mt-2 block text-lg">{gate.name}</strong>
              <span
                className="mt-2 block text-xs leading-5"
                style={{ color: C.muted }}
              >
                {gate.checks}
              </span>
            </button>
            {index < GATES.length - 1 ? (
              <span
                className="flex items-center justify-center py-2 text-xl"
                style={{ color: C.muted }}
              >
                -&gt;
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div
        className="grid border-t md:grid-cols-2"
        style={{ borderColor: C.border }}
      >
        <div className="p-4 md:border-r" style={{ borderColor: C.border }}>
          <p
            className="text-[10px] font-bold uppercase"
            style={{ color: selected.color }}
          >
            On failure
          </p>
          <p className="mt-2 text-sm leading-6">{selected.failure}</p>
        </div>
        <div className="p-4">
          <p
            className="text-[10px] font-bold uppercase"
            style={{ color: selected.color }}
          >
            Evidence retained
          </p>
          <p className="mt-2 text-sm leading-6">{selected.evidence}</p>
        </div>
      </div>
      <div
        className="flex flex-wrap gap-x-5 gap-y-2 border-t px-4 py-3 text-xs"
        style={{ borderColor: C.border, color: C.muted }}
      >
        <strong style={{ color: C.text }}>Govern every gate:</strong>
        <span>dataset owner</span>
        <span>quality rule ID</span>
        <span>PII classification</span>
        <span>lineage</span>
        <span>approved use</span>
      </div>
    </div>
  );
}

function ReplayRecovery() {
  const [active, setActive] = useState("correctness");
  const selected = RECOVERY.find((item) => item.id === active) ?? RECOVERY[0];
  return (
    <div className="mt-5">
      <div className="grid max-w-xl grid-cols-2 gap-2">
        {RECOVERY.map((item) => (
          <button
            type="button"
            aria-pressed={active === item.id}
            key={item.id}
            onClick={() => setActive(item.id)}
            className="rounded-md border px-4 py-3 text-sm font-semibold"
            style={{
              borderColor: item.color,
              background: active === item.id ? `${item.color}1c` : C.card2,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm" style={{ color: C.muted }}>
        <strong style={{ color: C.text }}>Scenario:</strong> {selected.premise}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {selected.steps.map(([title, detail], index) => (
          <div
            key={title}
            className="border-t-4 p-4"
            style={{ borderColor: selected.color, background: C.card2 }}
          >
            <span
              className="text-xs font-bold"
              style={{ color: selected.color }}
            >
              0{index + 1}
            </span>
            <h3 className="mt-2 text-base font-semibold">{title}</h3>
            <p className="mt-2 text-xs leading-5" style={{ color: C.muted }}>
              {detail}
            </p>
          </div>
        ))}
      </div>
      <p
        className="mt-4 rounded-xl border px-4 py-3 text-sm font-medium"
        style={{
          borderColor: `${selected.color}55`,
          background: `${selected.color}0f`,
        }}
      >
        {selected.guarantee}
      </p>
    </div>
  );
}

export default function FailuresDataQualityTab() {
  const [active, setActive] = useState<string>(
    UBER_FAILURE_QUALITY_SECTIONS[0].id,
  );
  const lock = useRef<number | null>(null);
  useEffect(() => {
    const sync = () => {
      if (lock.current) return;
      setActive(getActiveDataDesignSection(UBER_FAILURE_QUALITY_SECTIONS));
    };
    sync();
    addEventListener("scroll", sync, { passive: true });
    return () => removeEventListener("scroll", sync);
  }, []);
  const go = (id: string) => {
    if (!document.getElementById(id)) return;
    if (lock.current) clearTimeout(lock.current);
    history.replaceState(
      null,
      "",
      `/data-engineering/uber/governance-quality#${id}`,
    );
    setActive(id);
    scrollToDataDesignSection(id);
    lock.current = window.setTimeout(() => {
      setActive(id);
      lock.current = null;
    }, 700);
  };
  return (
    <>
      <Anchors active={active} go={go} />
      <div className="space-y-5 xl:pl-[232px]">
        <header
          className="border-l-4 py-2 pl-5"
          style={{ borderColor: C.blue }}
        >
          <h1 className="text-3xl font-semibold">Failures + Data Quality</h1>
          <p className="mt-2 text-sm leading-6" style={{ color: C.muted }}>
            Protect Uber&apos;s live marketplace and trusted history with
            measurable quality gates and rehearsed recovery paths.
          </p>
        </header>
        <Section
          id="quality-slos"
          title="Quality SLOs"
          intro="Monitor infrastructure, pipeline health, record validity, and business reconciliation as separate signals."
          color={C.cyan}
        >
          <QualitySlos />
        </Section>
        <Section
          id="failure-response"
          title="Failure response"
          intro="For every Uber incident, state detection, blast radius, immediate mitigation, recovery, and the prevention change."
          color={C.red}
        >
          <FailureResponse />
        </Section>
        <Section
          id="quality-gates"
          title="Quality gates"
          intro="Stop bad records at the earliest trustworthy boundary and preserve enough evidence to explain every rejection."
          color={C.amber}
        >
          <QualityGates />
        </Section>
        <Section
          id="replay-recovery"
          title="Replay and recovery"
          intro="Use retained source offsets and versioned outputs to recover correctness without rewriting trusted history in place."
          color={C.green}
        >
          <ReplayRecovery />
        </Section>
        <nav
          aria-label="Chapter navigation"
          className="flex items-center justify-between border-t pt-4"
          style={{ borderColor: C.border }}
        >
          <Link
            href="/data-engineering/uber/data-modeling"
            className="rounded-md border px-4 py-3 text-sm font-semibold"
            style={{ borderColor: C.border, background: C.card }}
          >
            ← Data Modeling
          </Link>
          <Link
            href="/data-engineering/uber/quiz"
            className="rounded-md border px-4 py-3 text-right text-sm font-semibold"
            style={{ borderColor: C.border, background: C.card }}
          >
            <small
              className="block text-[9px] uppercase tracking-[.16em]"
              style={{ color: C.muted }}
            >
              Next chapter
            </small>
            <span className="mt-1 block">Interview Q&amp;A →</span>
          </Link>
        </nav>
      </div>
    </>
  );
}
