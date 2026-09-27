"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { UBER_BATCH_SECTIONS } from "./data";
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
  violet: "#111111",
  bronze: "#555555",
  silver: "#5f5f5f",
  gold: "#666666",
};
const SYSTEMS = [
  {
    id: "kafka",
    label: "Kafka",
    meta: "Regional topics",
    color: C.amber,
    detail:
      "Uber records the exact topic, partition, and offset ranges consumed for driver GPS, trip lifecycle, dispatch, and payment events. Those coordinates define what the regional batch run must account for.",
    receives:
      "geo.location_pings, trip.lifecycle, dispatch.events, payments.events",
    produces: "Bounded source ranges for the region/day run",
  },
  {
    id: "bronze",
    label: "Bronze",
    meta: "S3 + Iceberg raw tables",
    color: C.bronze,
    detail:
      "Uber appends the original producer payload, event_version, region, and Kafka coordinates into S3-backed Iceberg tables. Full-resolution driver GPS remains tightly restricted and short-lived, while Iceberg metadata preserves lineage and snapshots.",
    receives: "Kafka payload plus topic, partition, and offset",
    produces: "location_pings_raw, trip_events_raw, payment_events_raw",
  },
  {
    id: "silver",
    label: "Silver",
    meta: "Conformed events",
    color: C.silver,
    detail:
      "Between Bronze and Silver, Uber batch transforms deduplicate event_id, normalize app versions, tokenize identifiers, reject GPS jumps implying more than 300 km/h, and repair trips whose events arrived after the streaming watermark. Silver keeps the resulting source-aligned evidence in location_pings_clean, trip_events_clean, dispatch_match_events, and payment_events_clean.",
    receives:
      "Bronze partitions, late trip IDs, and city/driver/vehicle dimensions",
    produces: "Deduplicated, PII-protected events and route summaries",
  },
  {
    id: "gold",
    label: "Gold",
    meta: "Reconciled facts",
    color: C.gold,
    detail:
      "Uber assembles trip_fact from the rider request, dispatch match, driver lifecycle, clean GPS route, and payment capture. Derived GPS distance and duration cross-check what the mobile app reported.",
    receives: "Silver events, point-in-time dimensions, processor settlement",
    produces:
      "trip_fact, driver_shift_fact, city_day_fact, payment_settlement_fact",
  },
] as const;
const TRANSITIONS = [
  { resource: "Kafka Connect / S3 sink", action: "land raw events" },
  { resource: "Spark on EMR", action: "clean · dedupe · conform" },
  { resource: "Spark SQL", action: "join · reconcile · aggregate" },
] as const;
const LAYERS = [
  {
    label: "Bronze",
    role: "Raw source history",
    color: C.bronze,
    tables: [
      "location_pings_raw",
      "trip_events_raw",
      "dispatch_events_raw",
      "payment_events_raw",
    ],
    transforms: [
      "Preserve producer payload",
      "Attach Kafka coordinates",
      "Partition by region + event date/hour",
    ],
    policy:
      "S3-backed Iceberg; restricted precise GPS; dense 4-second pings retained for 7 days.",
  },
  {
    label: "Silver",
    role: "Conformed event evidence",
    color: C.silver,
    tables: [
      "location_pings_clean",
      "trip_events_clean",
      "dispatch_match_events",
      "payment_events_clean",
    ],
    transforms: [
      "Deduplicate by event_id",
      "Conform schema versions",
      "Tokenize PII",
      "Flag GPS jumps above 300 km/h",
    ],
    policy:
      "Cluster by city/H3 or trip; quarantine invalid rows; compact small files.",
  },
  {
    label: "Gold",
    role: "Reconciled business facts",
    color: C.gold,
    tables: [
      "trip_fact",
      "driver_shift_fact",
      "city_day_fact",
      "payment_settlement_fact",
    ],
    transforms: [
      "Stitch rider + driver + dispatch",
      "Derive route from Silver GPS",
      "Reconcile processor settlement",
      "Build city-level aggregates",
    ],
    policy:
      "Versioned Iceberg snapshots for finance, city operations, BI, and governed ML.",
  },
] as const;
const DAGS = [
  {
    cadence: "Hourly",
    name: "Trip reconciliation",
    trigger: "Late-event trip IDs",
    action: "Rebuild only affected trip lifecycles",
    output: "Corrected Silver",
  },
  {
    cadence: "Data ready",
    name: "Dimension loading",
    trigger: "City, driver, vehicle changes",
    action: "Create effective-dated definitions",
    output: "Conformed dimensions",
  },
  {
    cadence: "By 06:00 local",
    name: "Daily Gold publish",
    trigger: "Region/day Silver complete",
    action: "Build and reconcile official facts",
    output: "Certified snapshot",
  },
  {
    cadence: "Daily close",
    name: "Finance reconciliation",
    trigger: "Processor settlement file",
    action: "Match captures, refunds, and settlements",
    output: "Settlement facts",
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
          {UBER_BATCH_SECTIONS.map((section, index) => {
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
  intro?: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-[24px] border p-5 md:p-6"
      style={{
        borderColor: `${color}38`,
        background: C.card,
      }}
    >
      <h2 className="text-2xl font-semibold">{title}</h2>
      {intro ? (
        <p
          className="mt-2 max-w-4xl text-sm leading-6"
          style={{ color: C.muted }}
        >
          {intro}
        </p>
      ) : null}
      {children}
    </section>
  );
}

function ArchitectureFlow() {
  const [active, setActive] = useState("bronze");
  const selected = SYSTEMS.find((system) => system.id === active) ?? SYSTEMS[1];
  return (
    <div
      data-testid="batch-architecture-flow"
      className="mt-5 grid overflow-hidden rounded-2xl border xl:grid-cols-[minmax(0,72%)_minmax(280px,28%)]"
      style={{ borderColor: C.border, background: C.card2 }}
    >
      <div
        className="flex min-w-0 items-center border-b p-5 xl:min-h-[390px] xl:border-b-0 xl:border-r"
        style={{ borderColor: C.border }}
      >
        <div className="grid w-full items-stretch gap-2 md:grid-cols-[1fr_108px_1fr_108px_1fr_108px_1fr]">
          {SYSTEMS.map((system, index) => (
            <div className="contents" key={system.id}>
              <button
                type="button"
                aria-pressed={active === system.id}
                onMouseEnter={() => setActive(system.id)}
                onFocus={() => setActive(system.id)}
                onClick={() => setActive(system.id)}
                aria-label={`${system.label}: ${system.meta}`}
                className="min-h-[152px] min-w-0 border-l-4 p-4 text-left"
                style={{
                  borderColor: system.color,
                  background:
                    active === system.id ? `${system.color}14` : C.card,
                }}
              >
                <span
                  className="text-[11px] font-bold uppercase leading-5 tracking-[.12em]"
                  style={{ color: system.color }}
                >
                  {index === 0
                    ? "Ingest"
                    : index === 1
                      ? "Raw history"
                      : index === 2
                        ? "Conformed"
                        : "Business truth"}
                </span>
                <span className="mt-3 block text-lg font-bold leading-6">
                  {system.label}
                </span>
                <span
                  className="mt-2 block text-[13px] leading-5"
                  style={{ color: C.muted }}
                >
                  {system.meta}
                </span>
              </button>
              {index < SYSTEMS.length - 1 ? (
                <span className="flex flex-col items-center justify-center py-3 text-center">
                  <strong
                    className="text-[12px] font-bold leading-5"
                    style={{ color: index === 1 ? C.violet : C.text }}
                  >
                    {TRANSITIONS[index].resource}
                  </strong>
                  <span
                    className="mt-2 text-3xl font-bold leading-none"
                    style={{ color: C.muted }}
                  >
                    →
                  </span>
                  <small
                    className="mt-2 text-[11px] font-medium leading-4"
                    style={{ color: C.muted }}
                  >
                    {TRANSITIONS[index].action}
                  </small>
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <aside data-testid="batch-node-inspector" className="p-5">
        <p
          className="text-[11px] font-bold uppercase tracking-[.16em]"
          style={{ color: selected.color }}
        >
          {selected.meta}
        </p>
        <h3 className="mt-2 text-2xl font-semibold">{selected.label}</h3>
        <p className="mt-3 text-[15px] leading-7" style={{ color: C.muted }}>
          {selected.detail}
        </p>
        <div className="mt-5 border-t pt-4" style={{ borderColor: C.border }}>
          <p
            className="text-[11px] font-bold uppercase"
            style={{ color: C.muted }}
          >
            Uber input
          </p>
          <p className="mt-2 text-sm font-medium leading-6">
            {selected.receives}
          </p>
        </div>
        <div className="mt-4 border-t pt-4" style={{ borderColor: C.border }}>
          <p
            className="text-[11px] font-bold uppercase"
            style={{ color: C.muted }}
          >
            Uber output
          </p>
          <p className="mt-2 text-sm font-medium leading-6">
            {selected.produces}
          </p>
        </div>
      </aside>
    </div>
  );
}
function LayerExplorer() {
  return (
    <div className="mt-5">
      <div className="grid gap-3 sm:grid-cols-3" aria-label="Lakehouse layers">
        {LAYERS.map((layer) => (
          <div
            key={layer.label}
            data-testid={`layer-heading-${layer.label.toLowerCase()}`}
            className="flex h-12 items-center gap-3 rounded-lg border px-4"
            style={{
              borderColor: layer.color,
              background: `${layer.color}22`,
            }}
          >
            <span
              className="h-5 w-1.5 rounded-full"
              style={{ background: layer.color }}
            />
            <span className="text-sm font-semibold">{layer.label}</span>
            <span className="ml-auto text-xs" style={{ color: C.muted }}>
              {layer.role}
            </span>
          </div>
        ))}
      </div>
      <div
        className="mt-4 overflow-hidden rounded-xl border"
        style={{ borderColor: C.border }}
      >
        <div className="grid md:grid-cols-3">
          {LAYERS.map((layer) => (
            <section
              key={layer.label}
              aria-labelledby={`layer-title-${layer.label.toLowerCase()}`}
              className="border-b p-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              style={{ borderColor: C.border }}
            >
              <h3
                id={`layer-title-${layer.label.toLowerCase()}`}
                className="sr-only"
              >
                {layer.label} contract
              </h3>
              <div className="pb-4">
                <p
                  className="text-[10px] font-bold uppercase tracking-[.14em]"
                  style={{ color: layer.color }}
                >
                  Table family
                </p>
                <div className="mt-3 space-y-2">
                  {layer.tables.map((table) => (
                    <code
                      key={table}
                      className="block break-all text-xs font-medium"
                    >
                      {table}
                    </code>
                  ))}
                </div>
              </div>
              <div className="border-t py-4" style={{ borderColor: C.border }}>
                <p
                  className="text-[10px] font-bold uppercase tracking-[.14em]"
                  style={{ color: layer.color }}
                >
                  Transformations
                </p>
                <ul className="mt-3 space-y-2">
                  {layer.transforms.map((transform) => (
                    <li
                      key={transform}
                      className="flex gap-2 text-xs leading-5"
                    >
                      <span aria-hidden style={{ color: layer.color }}>
                        •
                      </span>
                      <span>{transform}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t pt-4" style={{ borderColor: C.border }}>
                <p
                  className="text-[10px] font-bold uppercase tracking-[.14em]"
                  style={{ color: layer.color }}
                >
                  Storage rule
                </p>
                <p
                  className="mt-3 text-xs leading-5"
                  style={{ color: C.muted }}
                >
                  {layer.policy}
                </p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
function DagTimeline() {
  return (
    <div
      className="mt-5 overflow-hidden rounded-2xl border"
      style={{ borderColor: C.border }}
    >
      <table className="hidden w-full table-fixed border-collapse md:table">
        <colgroup>
          <col className="w-[11%]" />
          <col className="w-[17%]" />
          <col className="w-[28%]" />
          <col className="w-[29%]" />
          <col className="w-[15%]" />
        </colgroup>
        <thead style={{ background: C.card2, color: C.muted }}>
          <tr>
            {[
              "Schedule",
              "Pipeline",
              "Starts when",
              "Processing",
              "Output",
            ].map((label) => (
              <th
                key={label}
                className="border-b px-5 py-3 text-left text-xs font-medium"
                style={{ borderColor: C.border }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAGS.map((dag, index) => {
            const accent =
              index === 2 ? C.green : index === 1 ? C.cyan : C.amber;
            return (
              <tr
                key={dag.name}
                className="border-b last:border-b-0"
                style={{ borderColor: C.border }}
              >
                <td
                  className="border-l-2 px-5 py-4 text-xs font-medium"
                  style={{ borderLeftColor: accent, color: accent }}
                >
                  {dag.cadence}
                </td>
                <td className="px-5 py-4 text-sm font-medium">{dag.name}</td>
                <td className="px-5 py-4 text-sm" style={{ color: C.muted }}>
                  {dag.trigger}
                </td>
                <td className="px-5 py-4 text-sm font-normal">{dag.action}</td>
                <td
                  className="px-5 py-4 text-sm font-normal"
                  style={{ color: index === 2 ? C.green : C.text }}
                >
                  {dag.output}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="divide-y md:hidden" style={{ borderColor: C.border }}>
        {DAGS.map((dag, index) => {
          const accent = index === 2 ? C.green : index === 1 ? C.cyan : C.amber;
          return (
            <div
              key={dag.name}
              className="border-l-2 p-4"
              style={{ borderLeftColor: accent }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{dag.name}</span>
                <span className="text-xs" style={{ color: accent }}>
                  {dag.cadence}
                </span>
              </div>
              <p className="mt-3 text-xs" style={{ color: C.muted }}>
                Starts when: {dag.trigger}
              </p>
              <p className="mt-2 text-sm">{dag.action}</p>
              <p className="mt-2 text-xs font-medium">Output: {dag.output}</p>
            </div>
          );
        })}
      </div>
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t px-5 py-3 text-xs"
        style={{ borderColor: C.border, background: C.card2, color: C.muted }}
      >
        <span className="font-medium" style={{ color: C.text }}>
          Also orchestrated:
        </span>
        <span>Iceberg compaction</span>
        <span aria-hidden>·</span>
        <span>privacy deletion</span>
        <span aria-hidden>·</span>
        <span>versioned backfill</span>
        <span aria-hidden>·</span>
        <span>partition retry</span>
      </div>
    </div>
  );
}

function BackfillFlow() {
  const steps = [
    {
      title: "Bound impact",
      body: "Identify the Bengaluru dates, affected trip IDs, and exact Kafka offset ranges.",
      artifact: "Impact manifest",
    },
    {
      title: "Recompute",
      body: "Run corrected Spark code against retained Bronze into isolated staging tables.",
      artifact: "Candidate snapshot",
    },
    {
      title: "Validate",
      body: "Compare route samples, trip counts, fare totals, and processor settlement.",
      artifact: "Validation evidence",
    },
    {
      title: "Promote",
      body: "Approve the new Iceberg snapshot and atomically switch governed readers.",
      artifact: "New certified version",
    },
  ];
  return (
    <div className="mt-5">
      <p className="text-sm" style={{ color: C.muted }}>
        <strong style={{ color: C.text }}>Example:</strong> a route-distance bug
        affected Bengaluru trips for 3 days.
      </p>
      <div className="mt-4 grid items-stretch gap-3 lg:grid-cols-[1fr_24px_1fr_24px_1fr_24px_1fr]">
        {steps.map((step, index) => (
          <div className="contents" key={step.title}>
            <article
              className="flex min-h-[220px] flex-col rounded-xl border p-4"
              style={{ borderColor: `${C.blue}55`, background: C.card2 }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ background: C.blue }}
              >
                {index + 1}
              </span>
              <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: C.muted }}>
                {step.body}
              </p>
              <div
                className="mt-auto border-t pt-3"
                style={{ borderColor: C.border }}
              >
                <p
                  className="text-[10px] uppercase tracking-[.12em]"
                  style={{ color: C.muted }}
                >
                  Produces
                </p>
                <p
                  className="mt-1 text-xs font-medium"
                  style={{ color: C.blue }}
                >
                  {step.artifact}
                </p>
              </div>
            </article>
            {index < steps.length - 1 ? (
              <span
                className="flex items-center justify-center text-xl"
                style={{ color: C.blue }}
              >
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <p
        className="mt-4 border-t pt-4 text-xs leading-6"
        style={{ borderColor: C.border, color: C.muted }}
      >
        <strong style={{ color: C.text }}>Audit trail:</strong> source offsets →
        old snapshot → code version → validation evidence → new snapshot →
        approver
      </p>
    </div>
  );
}

export default function BatchLakehouseTab() {
  const [active, setActive] = useState<string>(UBER_BATCH_SECTIONS[0].id);
  const lock = useRef<number | null>(null);
  useEffect(() => {
    const sync = () => {
      if (lock.current) return;
      setActive(getActiveDataDesignSection(UBER_BATCH_SECTIONS));
    };
    sync();
    addEventListener("scroll", sync, { passive: true });
    return () => removeEventListener("scroll", sync);
  }, []);
  const go = (id: string) => {
    if (!document.getElementById(id)) return;
    if (lock.current) clearTimeout(lock.current);
    history.replaceState(null, "", `/data-engineering/uber/batch-pipelines#${id}`);
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
        <Section
          id="lakehouse-flow"
          title="Uber lakehouse flow"
          intro="Regional events move through one controlled path from durable ingestion to official history."
          color={C.blue}
        >
          <ArchitectureFlow />
        </Section>
        <Section
          id="lakehouse-layers"
          title="Uber layer contracts"
          intro="Compare the table families, transformations, and storage responsibilities carried by each lakehouse layer."
          color={C.cyan}
        >
          <LayerExplorer />
        </Section>
        <Section
          id="batch-orchestration"
          title="Uber batch DAGs"
          intro="The main workflows form a cadence: repair late trips, load reference data, publish daily facts, then close finance."
          color={C.amber}
        >
          <DagTimeline />
        </Section>
        <Section
          id="audited-backfill"
          title="Versioned backfill"
          intro="A backfill creates a reviewable replacement snapshot instead of silently changing the history already used by finance and legal."
          color={C.violet}
        >
          <BackfillFlow />
        </Section>
        <nav
          aria-label="Chapter navigation"
          className="flex items-center justify-between border-t pt-4"
          style={{ borderColor: C.border }}
        >
          <Link
            href="/data-engineering/uber/ingestion-kafka"
            className="rounded-md border px-4 py-3 text-sm font-semibold"
            style={{ borderColor: C.border, background: C.card }}
          >
            ← Ingestion / Kafka
          </Link>
          <Link
            href="/data-engineering/uber/data-modeling"
            className="rounded-md border px-4 py-3 text-right text-sm font-semibold"
            style={{ borderColor: C.border, background: C.card }}
          >
            <small
              className="block text-[9px] uppercase tracking-[.16em]"
              style={{ color: C.muted }}
            >
              Next chapter
            </small>
            <span className="mt-1 block">Data Modeling →</span>
          </Link>
        </nav>
      </div>
    </>
  );
}
