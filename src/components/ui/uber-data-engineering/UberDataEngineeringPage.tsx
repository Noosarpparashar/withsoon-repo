"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  normalizeUberDeTab,
  type UberDeTabSlug,
  UBER_ARCHITECTURE_SECTIONS,
  UBER_BATCH_SECTIONS,
  UBER_DE_TABS,
  UBER_DE_TAB_META,
  UBER_EVENT_SOURCE_SECTIONS,
  UBER_FAILURE_QUALITY_SECTIONS,
  UBER_INTERVIEW_SECTIONS,
  UBER_KAFKA_SECTIONS,
  UBER_MODELING_SECTIONS,
  UBER_REQUIREMENTS_SECTIONS,
  UBER_START_HERE_SECTIONS,
} from "./data";
import BatchLakehouseTab from "./BatchLakehouseTab";
import DataModelingTab from "./DataModelingTab";
import FailuresDataQualityTab from "./FailuresDataQualityTab";
import InterviewQATab from "./InterviewQATab";
import AnchorBrand from "./AnchorBrand";
import CompanyChapterRail from "../data-design/CompanyChapterRail";
import AccessibleExplainer from "../data-design/AccessibleExplainer";
import ChapterPageHeading from "../data-design/ChapterPageHeading";
import MobileSectionNav from "../data-design/MobileSectionNav";
import UberInteractionTutorial from "./UberInteractionTutorial";
import {
  getActiveDataDesignSection,
  scrollToDataDesignSection,
} from "../data-design/sectionAnchors";

const C = {
  bg: "var(--bg)",
  card: "var(--bg-card)",
  card2: "var(--bg-muted)",
  border: "var(--border)",
  text: "var(--text)",
  muted: "var(--text-muted)",
  faint: "var(--text-muted)",
  blue: "#42586c",
  cyan: "#445e72",
  green: "#50675d",
  amber: "#625346",
  red: "#62595d",
  violet: "#6d6774",
};
const href = (tab: UberDeTabSlug) => `/data-engineering/uber/${tab}`;

const UBER_PAGE_SECTIONS: Record<
  UberDeTabSlug,
  readonly { id: string; title: string }[]
> = {
  "start-here": UBER_START_HERE_SECTIONS,
  requirements: UBER_REQUIREMENTS_SECTIONS,
  "event-sources": UBER_EVENT_SOURCE_SECTIONS,
  architecture: UBER_ARCHITECTURE_SECTIONS,
  "ingestion-kafka": UBER_KAFKA_SECTIONS,
  "batch-pipelines": UBER_BATCH_SECTIONS,
  "data-modeling": UBER_MODELING_SECTIONS,
  "governance-quality": UBER_FAILURE_QUALITY_SECTIONS,
  quiz: UBER_INTERVIEW_SECTIONS,
};

function Tabs({ active }: { active: UberDeTabSlug }) {
  return (
    <CompanyChapterRail
      company="uber"
      chapters={UBER_DE_TABS}
      activeId={active}
      hrefFor={(id) => `/data-engineering/uber/${id}`}
    />
  );
}

function Outline({
  sections = UBER_START_HERE_SECTIONS,
  active,
  onGo,
}: {
  sections?: readonly { id: string; title: string }[];
  active: string;
  onGo: (id: string) => void;
}) {
  return (
    <aside
      className="hidden w-[232px] shrink-0 border-r xl:block"
      style={{ borderColor: C.border }}
    >
      <div
        data-testid="anchor-rail"
        className="fixed bottom-4 top-[140px] z-30 w-[200px] overflow-y-auto pr-1"
        style={{ left: "max(16px, calc((100vw - 1600px) / 2 + 16px))" }}
      >
        <AnchorBrand />
        <p
          className="mb-3 text-[10px] font-bold uppercase tracking-[.2em]"
          style={{ color: C.faint }}
        >
          Page anchors
        </p>
        <div className="space-y-2">
          {sections.map((s, i) => {
            const on = s.id === active;
            return (
              <button
                aria-current={on ? "location" : undefined}
                data-testid={`stage-nav-${s.id}`}
                key={s.id}
                onClick={() => onGo(s.id)}
                className="relative flex h-[54px] w-full items-center gap-3 overflow-hidden rounded-md border px-3 text-left text-sm font-semibold transition-all"
                style={{
                  borderColor: on ? C.blue : C.border,
                  background: on
                    ? "color-mix(in srgb, #42586c 13%, var(--bg-card))"
                    : C.card,
                  color: on ? C.text : C.muted,
                  boxShadow: on ? "0 6px 18px rgba(82,107,130,.12)" : "none",
                }}
              >
                {on ? (
                  <span
                    className="absolute inset-y-0 left-0 w-1"
                    style={{ background: C.blue }}
                  />
                ) : null}
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    background: on ? C.blue : C.card2,
                    color: on ? "white" : C.faint,
                  }}
                >
                  {i + 1}
                </span>
                {s.title}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

type VisualItem = { icon: string; title: string; sub: string; detail: string };
function Tip({ text }: { text: string }) {
  return <AccessibleExplainer company="Uber">{text}</AccessibleExplainer>;
}
const producers: VisualItem[] = [
  {
    icon: "🚘",
    title: "Driver app",
    sub: "GPS + availability",
    detail:
      "Publishes location pings, online/offline status, and trip state changes. GPS is the dominant stream by volume.",
  },
  {
    icon: "📱",
    title: "Rider app",
    sub: "Demand + conversion",
    detail:
      "Publishes fare estimates, trip requests, screen views, ratings, and the steps that explain marketplace demand.",
  },
  {
    icon: "🧭",
    title: "Dispatch + payments",
    sub: "Lifecycle + settlement",
    detail:
      "Publishes match, cancellation, ETA, payment, and refund events that complete the authoritative trip story.",
  },
];
const consumers: VisualItem[] = [
  {
    icon: "⚡",
    title: "Surge pricing",
    sub: "30–60 second updates",
    detail:
      "Consumes fresh supply and demand aggregates so prices react to a city cell without flapping on every GPS ping.",
  },
  {
    icon: "🗺️",
    title: "ETA features",
    sub: "Seconds-level freshness",
    detail:
      "Consumes recent driver position, route, traffic, and trip context for online model serving and routing decisions.",
  },
  {
    icon: "📊",
    title: "Finance + city ops",
    sub: "Trusted daily truth",
    detail:
      "Consumes reconciled Gold trip and settlement facts for official reporting, marketplace operations, and regulatory analysis.",
  },
  {
    icon: "🧪",
    title: "Analytics + ML",
    sub: "Historical datasets",
    detail:
      "Analysts, experiments, and training pipelines query durable, governed trip, rider, driver, and location history.",
  },
];
function Endpoint({
  items,
  color,
  testId,
}: {
  items: VisualItem[];
  color: string;
  testId: string;
}) {
  return (
    <div data-testid={testId} className="grid gap-2">
      {items.map((item) => (
        <button
          className="group relative flex min-h-[62px] items-center gap-3 rounded-xl border px-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{ borderColor: `${color}44`, background: C.card2 }}
          key={item.title}
        >
          <span className="text-xl">{item.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-[11px]" style={{ color: C.faint }}>
              {item.sub}
            </p>
          </div>
          <span className="ml-auto text-xs" style={{ color }}>
            ⓘ
          </span>
          <Tip text={item.detail} />
        </button>
      ))}
    </div>
  );
}
function Mission() {
  return (
    <div
      data-testid="platform-mission-visual"
      className="mt-6 grid gap-4 rounded-md border p-5 lg:grid-cols-[220px_38px_minmax(300px,1fr)_38px_230px] lg:items-center"
      style={{ borderColor: C.border, background: C.card }}
    >
      <div>
        <p
          className="mb-2 text-[10px] font-bold uppercase tracking-[.18em]"
          style={{ color: C.blue }}
        >
          Event producers
        </p>
        <Endpoint
          items={producers}
          color={C.blue}
          testId="hero-producers-grid"
        />
      </div>
      <div
        data-testid="hero-arrow-left"
        className="hidden text-center lg:block"
        style={{ color: C.blue }}
      >
        ──→
      </div>
      <button
        data-testid="hero-platform-card"
        className="group relative rounded-md border p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
        style={{ borderColor: "rgba(101,126,144,.3)", background: C.card2 }}
      >
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-md text-2xl"
          style={{ background: "rgba(82,107,130,.16)" }}
        >
          🏙️
        </div>
        <h3 className="mt-4 text-xl font-semibold">
          Marketplace data platform
        </h3>
        <p className="mt-2 text-sm leading-6" style={{ color: C.muted }}>
          Fast marketplace state plus reconciled historical truth.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {["Ingest", "Stream", "Lakehouse", "Serve"].map((x) => (
            <span
              className="rounded-md border px-3 py-2 text-xs"
              style={{ borderColor: C.border, background: C.card }}
              key={x}
            >
              {x}
            </span>
          ))}
        </div>
        <Tip text="Kafka accepts independent event streams; streaming produces live marketplace state; the lakehouse reconciles Bronze, Silver, and Gold truth; serving layers expose warehouse tables and model features." />
      </button>
      <div
        data-testid="hero-arrow-right"
        className="hidden text-center lg:block"
        style={{ color: C.green }}
      >
        ──→
      </div>
      <div>
        <p
          className="mb-2 text-[10px] font-bold uppercase tracking-[.18em]"
          style={{ color: C.green }}
        >
          Business outcomes
        </p>
        <Endpoint
          items={consumers}
          color={C.green}
          testId="hero-consumers-grid"
        />
      </div>
    </div>
  );
}

const SECTION_TITLE_OVERRIDES: Record<string, string> = {
  "kafka-contract": "Event format",
  "kafka-topics": "Partition keys",
  "kafka-sizing": "Capacity planning",
  "kafka-controls": "Reliability controls",
  "kafka-retention": "GPS retention",
};
function Section({
  id,
  kicker,
  title,
  sub,
  color,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  sub?: string;
  color: string;
  children: React.ReactNode;
}) {
  const kafkaSection = id.startsWith("kafka-");
  return (
    <section
      id={id}
      className="rounded-[24px] border p-5 md:p-6"
      style={{
        borderColor: `${color}38`,
        background: C.card,
      }}
    >
      {kafkaSection ? null : (
        <p
          className="text-[10px] font-bold uppercase tracking-[.2em]"
          style={{ color }}
        >
          {kicker}
        </p>
      )}
      <h2 className={`${kafkaSection ? "" : "mt-2 "}text-2xl font-semibold`}>
        {SECTION_TITLE_OVERRIDES[id] ?? title}
      </h2>
      {sub ? (
        <p className="mt-2 text-sm" style={{ color: C.muted }}>
          {sub}
        </p>
      ) : null}
      {children}
    </section>
  );
}
function StartHere() {
  const req: VisualItem[] = [
    {
      icon: "📥",
      title: "Ingest marketplace events",
      sub: "Trips, GPS, rider, payments, maps",
      detail:
        "Accept continuous events from independent mobile and backend producers through durable, versioned contracts.",
    },
    {
      icon: "⚡",
      title: "Serve fast + batch paths",
      sub: "One platform, different time horizons",
      detail:
        "Streaming feeds surge and ETA within seconds; batch processing publishes corrected official business tables.",
    },
    {
      icon: "🧹",
      title: "Validate, enrich, dedupe",
      sub: "Correct outcomes over raw delivery",
      detail:
        "Use event IDs, event time, schema checks, and reference joins so retries or late events do not corrupt business outcomes.",
    },
    {
      icon: "🗂️",
      title: "Keep durable history",
      sub: "Petabyte-scale geospatial storage",
      detail:
        "Retain raw Bronze truth and compacted analytical history so pipelines can replay, audit, and train models economically.",
    },
    {
      icon: "🔒",
      title: "Protect sensitive data",
      sub: "Deletion guarantees for rider PII",
      detail:
        "Tokenize identity, restrict address and payment fields, and propagate deletion requests through lakehouse and serving copies.",
    },
    {
      icon: "🔗",
      title: "Reconcile the trip",
      sub: "Five producers, one trusted record",
      detail:
        "Stitch rider, driver, dispatch, maps, and payment events into one canonical trip state despite late or out-of-order arrival.",
    },
  ];
  const fresh = [
    {
      label: "Driver GPS → supply map",
      value: "~4 seconds",
      width: "14%",
      color: C.cyan,
      detail:
        "Near-live position keeps the available-driver map useful for matching and marketplace supply calculations.",
    },
    {
      label: "ETA model features",
      value: "Seconds",
      width: "22%",
      color: C.blue,
      detail:
        "Fresh position, route, and traffic context directly affect rider expectations and driver routing.",
    },
    {
      label: "Surge recompute",
      value: "30–60 seconds",
      width: "42%",
      color: C.red,
      detail:
        "Fast enough to react to supply-demand imbalance, but intentionally slower than GPS to avoid price flapping.",
    },
    {
      label: "Official trip fact",
      value: "T+1 by 6 AM",
      width: "100%",
      color: C.amber,
      detail:
        "Finance and city operations prioritize reconciliation and correctness over instant publication.",
    },
  ];
  return (
    <div className="space-y-5">
      <Section
        id="platform-mission"
        kicker="Start here"
        title="Design the shared marketplace data platform"
        sub="Keep the opening crisp: what comes in, what the platform does, and who it serves."
        color={C.blue}
      >
        <Mission />
        <div
          className="mt-4 rounded-md border px-5 py-4"
          style={{
            borderColor: "rgba(82,107,130,.35)",
            background: "color-mix(in srgb, #42586c 8%, var(--bg-card))",
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[.18em]"
            style={{ color: C.blue }}
          >
            Opening script
          </p>
          <p
            className="mt-2 text-sm font-medium leading-7"
            style={{ color: C.text }}
          >
            “I’ll design Uber’s shared data platform: events flow through
            streaming and batch pipelines into live surge and ETA signals, plus
            trusted historical data for finance, city operations, analytics, and
            ML.”
          </p>
        </div>
      </Section>
      <Section
        id="requirements-snapshot"
        kicker="Requirements"
        title="Keep the requirements interview-ready"
        color={C.amber}
      >
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {req.map((item) => (
            <button
              key={item.title}
              className="group relative flex min-h-[72px] items-center gap-3 rounded-md border px-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: C.border, background: C.card2 }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-md text-lg"
                style={{ background: "rgba(121,111,100,.12)" }}
              >
                {item.icon}
              </span>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs" style={{ color: C.faint }}>
                  {item.sub}
                </p>
              </div>
              <span className="ml-auto" style={{ color: C.amber }}>
                ⓘ
              </span>
              <Tip text={item.detail} />
            </button>
          ))}
        </div>
      </Section>
      <Section
        id="scope-boundary"
        kicker="Scope"
        title="Draw the platform boundary"
        color={C.green}
      >
        <div
          className="mt-5 rounded-md border p-4"
          style={{ borderColor: C.border, background: C.card2 }}
        >
          <div className="grid gap-2 lg:grid-cols-[1fr_24px_1fr_24px_1fr_24px_1fr] lg:items-center">
            {[
              [
                "Events in",
                "Apps + services",
                "Independent producers publish canonical events.",
                C.blue,
              ],
              [
                "Kafka",
                "Durable intake",
                "Topics isolate GPS, trip, rider, and payment workloads.",
                C.amber,
              ],
              [
                "Stream + batch",
                "Shape truth",
                "Flink serves live state while batch reconciles history.",
                C.cyan,
              ],
              [
                "Lakehouse → serving",
                "Products out",
                "Gold tables, warehouse views, and features serve consumers.",
                C.green,
              ],
            ].map((item, i) => (
              <div className="contents" key={item[0]}>
                <button
                  className="group relative min-h-[104px] rounded-md border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ borderColor: `${item[3]}66`, background: C.card }}
                >
                  <span
                    className="text-[10px] font-bold uppercase tracking-[.16em]"
                    style={{ color: item[3] }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-2 text-sm font-semibold">{item[0]}</p>
                  <p className="mt-1 text-xs" style={{ color: C.faint }}>
                    {item[1]}
                  </p>
                  <Tip text={item[2]} />
                </button>
                {i < 3 ? (
                  <span
                    className="hidden text-center lg:block"
                    style={{ color: C.green }}
                  >
                    →
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className="rounded-md border px-3 py-2 text-xs"
            style={{ borderColor: `${C.red}55`, color: C.muted }}
          >
            Outside: dispatch algorithm
          </span>
          <span
            className="rounded-md border px-3 py-2 text-xs"
            style={{ borderColor: `${C.red}55`, color: C.muted }}
          >
            Outside: mobile UI
          </span>
          <span
            className="rounded-md border px-3 py-2 text-xs"
            style={{ borderColor: `${C.red}55`, color: C.muted }}
          >
            Outside: OLTP internals
          </span>
        </div>
      </Section>
      <Section
        id="freshness-map"
        kicker="Freshness"
        title="Compare the serving clocks"
        sub="The platform supports several definitions of real time."
        color={C.amber}
      >
        <div
          className="mt-5 rounded-md border p-4 md:p-5"
          style={{ borderColor: C.border, background: C.card2 }}
        >
          <div
            className="mb-3 hidden grid-cols-[190px_1fr_140px] gap-4 text-[10px] font-bold uppercase tracking-[.16em] md:grid"
            style={{ color: C.faint }}
          >
            <span>Data product</span>
            <span>Relative time horizon</span>
            <span className="text-right">Freshness target</span>
          </div>
          {fresh.map((item) => (
            <button
              className="group relative grid w-full grid-cols-[1fr_auto] items-center gap-3 border-t py-3 text-left first:border-t-0 md:grid-cols-[190px_1fr_140px] md:gap-4"
              style={{ borderColor: C.border }}
              key={item.label}
            >
              <span className="text-sm font-semibold">{item.label}</span>
              <span
                className="order-3 col-span-2 h-3 overflow-hidden rounded-full md:order-none md:col-span-1"
                style={{ background: C.border }}
              >
                <span
                  className="block h-full rounded-full transition-all group-hover:brightness-125"
                  style={{ width: item.width, background: item.color }}
                />
              </span>
              <strong
                className="rounded-md px-3 py-2 text-right text-sm"
                style={{
                  background: `color-mix(in srgb, ${item.color} 14%, var(--bg-card))`,
                  color: item.color,
                  border: `1px solid ${item.color}55`,
                }}
              >
                {item.value}
              </strong>
              <Tip text={item.detail} />
            </button>
          ))}
        </div>
      </Section>
      <nav
        aria-label="Chapter navigation"
        className="flex items-center justify-end border-t pt-4"
        style={{ borderColor: C.border }}
      >
        <Link
          href={href("requirements")}
          className="inline-flex items-center gap-3 rounded-md border px-4 py-3 text-sm font-semibold transition-colors hover:border-[#42586c]"
          style={{ borderColor: C.border, background: C.card, color: C.text }}
        >
          <span>
            <span
              className="block text-[9px] font-bold uppercase tracking-[.16em]"
              style={{ color: C.faint }}
            >
              Next chapter
            </span>
            <span className="mt-1 block">Requirements + capacity</span>
          </span>
          <span aria-hidden style={{ color: C.blue }}>
            →
          </span>
        </Link>
      </nav>
    </div>
  );
}
function RequirementsTab() {
  const [copied, setCopied] = useState<string | null>(null);
  const [requirementsActive, setRequirementsActive] = useState<string>(
    UBER_REQUIREMENTS_SECTIONS[0].id,
  );
  useEffect(() => {
    const sync = () => {
      setRequirementsActive(
        getActiveDataDesignSection(UBER_REQUIREMENTS_SECTIONS),
      );
    };
    sync();
    addEventListener("scroll", sync, { passive: true });
    return () => removeEventListener("scroll", sync);
  }, []);
  const goToRequirement = (id: string) => {
    if (!document.getElementById(id)) return;
    history.replaceState(null, "", `${href("requirements")}#${id}`);
    scrollToDataDesignSection(id);
    setRequirementsActive(id);
  };
  const assumptions: VisualItem[] = [
    {
      icon: "👥",
      title: "25M–40M DAU",
      sub: "≈20%–30% of 130M MAU",
      detail:
        "Use round interview numbers: 25M daily riders is roughly 20% of 130M monthly riders; 40M is roughly 30%.",
    },
    {
      icon: "🚘",
      title: "1M–2M online",
      sub: "from ~6M active drivers",
      detail:
        "Use 2M concurrent drivers for the global peak calculation. Idle drivers also continue sending background pings.",
    },
    {
      icon: "🧭",
      title: "30M trips/day",
      sub: "× 6 lifecycle events per trip",
      detail:
        "Count 6 clear milestones: request, match, arrival, start, completion, and payment. Then test peak traffic at 10× the daily average.",
    },
    {
      icon: "📍",
      title: "1 ping / 4 sec",
      sub: "15 min trip → 225 pings",
      detail:
        "A 900-second trip divided by a 4-second interval produces 225 in-trip location pings, before idle-driver updates.",
    },
  ];
  const loads = [
    {
      label: "Driver GPS",
      value: "2M × 1/4s = 500K/sec",
      width: "100%",
      color: C.blue,
      detail:
        "At peak, 2M drivers each send 1 ping every 4 seconds. The calculation is 2M ÷ 4 = 500K GPS events per second.",
    },
    {
      label: "Rider activity",
      value: "assume 50K–100K/sec",
      width: "20%",
      color: C.cyan,
      detail:
        "Searches, screen views, and fare-estimate requests are much larger than trip state events.",
    },
    {
      label: "Trip lifecycle",
      value: "30M × 6 ÷ 86,400 = 2.1K/sec",
      width: "4%",
      color: C.amber,
      detail:
        "Each trip contributes 6 lifecycle events: request, match, arrival, start, completion, and payment. So 30M trips/day × 6 events = 180M events/day; 180M ÷ 86,400 seconds = about 2.1K events/sec on average.",
    },
  ];
  const formulas = [
    [
      "Peak event rate",
      "online_drivers × (1 event / ping_interval_sec)",
      "2M drivers × 1 event per driver / 4 sec = 500K events/sec",
      "Each of the 2M online drivers sends 1 location event every 4 seconds. Use peak concurrent drivers and their ping frequency, not monthly totals.",
    ],
    [
      "Kafka partitions",
      "peak_throughput_MBps / ~10 MBps",
      "100 MB/s ÷ 10 MB/s = 10; provision 20+",
      "The 100 MB/s comes from 500K GPS events/sec × 200 bytes each. Assuming one partition handles roughly 10 MB/s gives 10 partitions; provision 20+ for bursts, replication work, and skew.",
    ],
    [
      "Storage per day",
      "events/sec × avg_event_size × 86,400",
      "500K × 200 B × 86,400 = 8.6 TB/day",
      "Calculate raw volume before compression, replication, indexes, or derived tables.",
    ],
    [
      "Retention storage",
      "storage/day × retention_days",
      "8.6 TB/day × 7 days = 60.2 TB raw",
      "Separate short hot replay retention from cheap historical retention.",
    ],
  ];
  const copyFormula = (formula: string) => {
    navigator.clipboard?.writeText(formula).catch(() => {});
    setCopied(formula);
    window.setTimeout(() => setCopied(null), 1200);
  };
  return (
    <>
      <Outline
        sections={UBER_REQUIREMENTS_SECTIONS}
        active={requirementsActive}
        onGo={goToRequirement}
      />
      <div className="space-y-5 xl:pl-[232px]">
        <Section
          id="scale-assumptions"
          kicker="01 · Assumptions"
          title="State the scale before drawing boxes"
          sub="Four explicit assumptions make every downstream number defensible."
          color={C.blue}
        >
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {assumptions.map((item) => (
              <button
                key={item.title}
                className="group relative min-h-[126px] border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: C.border, background: C.card2 }}
              >
                <span className="text-xl">{item.icon}</span>
                <strong
                  className="mt-3 block text-xl"
                  style={{ color: C.blue }}
                >
                  {item.title}
                </strong>
                <span className="mt-1 block text-xs" style={{ color: C.muted }}>
                  {item.sub}
                </span>
                <Tip text={item.detail} />
              </button>
            ))}
          </div>
        </Section>
        <Section
          id="event-load"
          kicker="02 · Derived load"
          title="GPS dominates the event mix"
          sub="The total peak lands near 600K–700K events per second."
          color={C.cyan}
        >
          <div
            className="mt-5 rounded-2xl border p-4 md:p-5"
            style={{ borderColor: C.border, background: C.card2 }}
          >
            {loads.map((item) => (
              <button
                key={item.label}
                className="group relative grid w-full grid-cols-[112px_1fr] items-center gap-3 border-t py-4 text-left first:border-t-0 md:grid-cols-[150px_1fr_270px]"
                style={{ borderColor: C.border }}
              >
                <span className="text-sm font-semibold">{item.label}</span>
                <span
                  className="h-4 overflow-hidden rounded-full"
                  style={{ background: C.border }}
                >
                  <span
                    className="block h-full min-w-2 rounded-full"
                    style={{ width: item.width, background: item.color }}
                  />
                </span>
                <strong
                  className="col-span-2 text-right text-xs md:col-span-1 md:text-sm"
                  style={{ color: item.color }}
                >
                  {item.value}
                </strong>
                <Tip text={item.detail} />
              </button>
            ))}
          </div>
          <div
            className="mt-3 flex items-center gap-3 rounded-xl border px-4 py-3"
            style={{
              borderColor: "rgba(82,107,130,.35)",
              background: "color-mix(in srgb, #42586c 8%, var(--bg-card))",
            }}
          >
            <strong className="text-2xl" style={{ color: C.blue }}>
              ~100×
            </strong>
            <p className="text-sm" style={{ color: C.muted }}>
              GPS event rate versus average trip-lifecycle rate.
            </p>
          </div>
        </Section>
        <Section
          id="storage-math"
          kicker="03 · Storage"
          title="Translate velocity into daily weight"
          sub="Raw location history is the capacity problem; trip facts are the correctness problem."
          color={C.amber}
        >
          <div className="mt-5 grid gap-3 lg:grid-cols-[1.25fr_.75fr]">
            <button
              className="group relative rounded-2xl border p-5 text-left"
              style={{
                borderColor: "rgba(121,111,100,.35)",
                background: C.card2,
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-[.16em]"
                style={{ color: C.amber }}
              >
                Location stream
              </p>
              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <strong className="text-3xl">500K</strong>
                <span style={{ color: C.muted }}>pings/sec</span>
                <span style={{ color: C.faint }}>×</span>
                <strong>200 bytes</strong>
              </div>
              <div className="my-5 h-px" style={{ background: C.border }} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <strong className="text-2xl" style={{ color: C.amber }}>
                    100 MB/s
                  </strong>
                  <p className="mt-1 text-xs" style={{ color: C.muted }}>
                    raw throughput
                  </p>
                </div>
                <div>
                  <strong className="text-2xl" style={{ color: C.amber }}>
                    8.6 TB/day
                  </strong>
                  <p className="mt-1 text-xs" style={{ color: C.muted }}>
                    raw GPS history
                  </p>
                </div>
              </div>
              <Tip text="The 200-byte estimate covers latitude, longitude, driver_id, trip_id, event timestamp, heading, speed, accuracy, and small serialization overhead. Therefore 500K pings/sec × 200 bytes = 100 MB/sec, or about 8.6 TB/day raw." />
            </button>
            <button
              className="group relative rounded-2xl border p-5 text-left"
              style={{ borderColor: C.border, background: C.card2 }}
            >
              <p
                className="text-xs font-bold uppercase tracking-[.16em]"
                style={{ color: C.green }}
              >
                Trip facts
              </p>
              <strong className="mt-4 block text-3xl">60 GB/day</strong>
              <p className="mt-2 text-sm leading-6" style={{ color: C.muted }}>
                30M trips × roughly 2 KB
              </p>
              <Tip text="Small by volume, but financially critical and frequently joined with enormous location history for ETA and routing ML." />
            </button>
          </div>
        </Section>
        <Section
          id="board-formulas"
          kicker="04 · Whiteboard"
          title="Keep only four formulas"
          sub="Each formula includes the worked interview number. Click to copy."
          color={C.violet}
        >
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {formulas.map(([label, formula, example, detail]) => (
              <button
                onClick={() => copyFormula(`${formula} = ${example}`)}
                key={label}
                className="group relative border p-4 text-left"
                style={{
                  borderColor:
                    copied === `${formula} = ${example}` ? C.green : C.border,
                  background: C.card2,
                }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-[.16em]"
                  style={{ color: C.violet }}
                >
                  {copied === `${formula} = ${example}` ? "Copied" : label}
                </span>
                <code
                  className="mt-2 block overflow-x-auto text-xs leading-6"
                  style={{ color: C.text }}
                >
                  {formula}
                </code>
                <div
                  className="mt-3 rounded-lg border px-3 py-2 text-xs font-semibold"
                  style={{
                    borderColor: "rgba(109,103,116,.35)",
                    background: C.card,
                    color: C.violet,
                  }}
                >
                  {example}
                </div>
                <Tip text={detail} />
              </button>
            ))}
          </div>
        </Section>
        <Section
          id="design-implication"
          kicker="05 · Decision"
          title="Treat location streaming as first-class"
          sub="GPS volume is 100× trip events, so it must be separately partitioned and separately tiered."
          color={C.green}
        >
          <div
            className="mt-5 rounded-2xl border p-4 md:p-5"
            style={{ borderColor: C.border, background: C.card2 }}
          >
            <div className="grid gap-3 lg:grid-cols-[190px_34px_220px_34px_1fr] lg:items-center">
              <button
                className="group relative border p-4 text-left"
                style={{
                  borderColor: "rgba(82,107,130,.4)",
                  background: C.card,
                }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-[.16em]"
                  style={{ color: C.blue }}
                >
                  Separate workload
                </span>
                <p className="mt-2 font-semibold">Location topics</p>
                <p className="mt-1 text-xs" style={{ color: C.muted }}>
                  not trip-events
                </p>
                <Tip text="Do not bolt 500K GPS events/sec onto the much smaller trip-events topic. Give location its own topic family, limits, retention, and scaling policy." />
              </button>
              <span
                className="hidden text-center lg:block"
                style={{ color: C.green }}
              >
                →
              </span>
              <button
                className="group relative border p-4 text-left"
                style={{
                  borderColor: "rgba(121,111,100,.45)",
                  background: C.card,
                }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-[.16em]"
                  style={{ color: C.amber }}
                >
                  Partition strategy
                </span>
                <p className="mt-2 font-semibold">Key by geohash</p>
                <p className="mt-1 text-xs" style={{ color: C.muted }}>
                  not driver_id
                </p>
                <Tip text="Partition by geohash so nearby pings land together for city-cell supply and surge computation. Partitioning by driver_id scatters the geographic workload." />
              </button>
              <span
                className="hidden text-center lg:block"
                style={{ color: C.green }}
              >
                →
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  className="group relative border p-4 text-left"
                  style={{
                    borderColor: "rgba(101,126,144,.4)",
                    background: C.card,
                  }}
                >
                  <span
                    className="text-[10px] font-bold uppercase tracking-[.16em]"
                    style={{ color: C.cyan }}
                  >
                    Low-latency path
                  </span>
                  <p className="mt-2 font-semibold">Bypass lakehouse</p>
                  <p className="mt-1 text-xs" style={{ color: C.muted }}>
                    live marketplace state
                  </p>
                  <Tip text="Send the live location branch straight to low-latency marketplace serving. It should not wait for the lakehouse path used for historical truth." />
                </button>
                <button
                  className="group relative border p-4 text-left"
                  style={{
                    borderColor: "rgba(102,122,112,.4)",
                    background: C.card,
                  }}
                >
                  <span
                    className="text-[10px] font-bold uppercase tracking-[.16em]"
                    style={{ color: C.green }}
                  >
                    Historical tier
                  </span>
                  <p className="mt-2 font-semibold">Downsample + compact</p>
                  <p className="mt-1 text-xs" style={{ color: C.muted }}>
                    aggressive cost control
                  </p>
                  <Tip text="Keep raw detail for a short replay window, then aggressively downsample location history and compact files for long-term ETA and routing ML." />
                </button>
              </div>
            </div>
          </div>
        </Section>
        <nav
          aria-label="Chapter navigation"
          className="flex items-center justify-between border-t pt-4"
          style={{ borderColor: C.border }}
        >
          <Link
            href={href("start-here")}
            className="rounded-md border px-4 py-3 text-sm font-semibold"
            style={{ borderColor: C.border, background: C.card }}
          >
            ← Start Here
          </Link>
          <Link
            href={href("event-sources")}
            className="rounded-md border px-4 py-3 text-right text-sm font-semibold"
            style={{ borderColor: C.border, background: C.card }}
          >
            <small
              className="block text-[9px] uppercase tracking-[.16em]"
              style={{ color: C.faint }}
            >
              Next chapter
            </small>
            <span className="mt-1 block">Event Sources →</span>
          </Link>
        </nav>
      </div>
    </>
  );
}

function EventSourcesTab() {
  const [sourceActive, setSourceActive] = useState<string>(
    UBER_EVENT_SOURCE_SECTIONS[0].id,
  );
  useEffect(() => {
    const sync = () => {
      setSourceActive(getActiveDataDesignSection(UBER_EVENT_SOURCE_SECTIONS));
    };
    sync();
    addEventListener("scroll", sync, { passive: true });
    return () => removeEventListener("scroll", sync);
  }, []);
  const goToSource = (id: string) => {
    if (!document.getElementById(id)) return;
    history.replaceState(null, "", `${href("event-sources")}#${id}`);
    scrollToDataDesignSection(id);
    setSourceActive(id);
  };
  const sources = [
    {
      icon: "🚘",
      name: "Driver app",
      tier: "Highest",
      color: C.blue,
      events:
        "location_ping · driver_online · driver_offline · trip_status_change",
      detail:
        "The dominant producer. Location pings drive the 500K/sec peak; status changes describe availability and trip progress.",
    },
    {
      icon: "📱",
      name: "Rider app",
      tier: "High",
      color: C.cyan,
      events:
        "fare_estimate_requested · trip_requested · app_screen_view · rating_submitted",
      detail:
        "Captures demand intent, conversion funnels, experimentation exposure, and rider feedback.",
    },
    {
      icon: "🧭",
      name: "Dispatch service",
      tier: "Medium",
      color: C.violet,
      events: "trip_matched · trip_cancelled · eta_recalculated",
      detail:
        "Publishes marketplace decisions that connect rider intent with a driver and update the trip state.",
    },
    {
      icon: "💳",
      name: "Payments service",
      tier: "Critical",
      color: C.amber,
      events: "payment_authorized · payment_captured · refund_issued",
      detail:
        "Moderate volume but financially critical. Event IDs and effectively-once business outcomes matter more than raw throughput.",
    },
    {
      icon: "🗺️",
      name: "Maps + routing",
      tier: "Medium",
      color: C.green,
      events: "route_computed · traffic_signal_update",
      detail:
        "Provides route and traffic context used to interpret location history and build ETA features.",
    },
    {
      icon: "🆘",
      name: "Support + safety",
      tier: "Priority",
      color: C.red,
      events: "sos_triggered · support_ticket_created",
      detail:
        "Low volume and highest urgency. These events need priority handling, strict access, and reliable alert delivery.",
    },
  ];
  const fields = [
    [
      "event_id",
      "Idempotency",
      "A globally unique ID lets consumers recognize retries and avoid applying the same business event twice.",
    ],
    [
      "event_time",
      "When it happened",
      "Use device or producer time for windows, ordering, and late-event handling.",
    ],
    [
      "ingestion_time",
      "When Kafka received it",
      "The difference from event_time measures platform delay and producer/network lag.",
    ],
    [
      "trip / driver / rider IDs",
      "Join keys",
      "Nullable entity identifiers connect independent producer streams into one trip record.",
    ],
    [
      "event_version",
      "Schema evolution",
      "Consumers can interpret older and newer payload shapes during a controlled migration.",
    ],
    [
      "geohash",
      "Location partition key",
      "Location-bearing events carry a geographic cell used for partitioning and local aggregation.",
    ],
  ];
  const stages = [
    {
      label: "Raw device events",
      sub: "source-shaped input",
      color: C.blue,
      detail:
        "Driver, rider, dispatch, payment, and maps systems publish their original payloads inside the shared event envelope.",
    },
    {
      label: "Kafka",
      sub: "replayable Bronze truth",
      color: C.amber,
      detail:
        "Durable source topics preserve the original accepted events before enrichment or business corrections.",
    },
    {
      label: "Flink enrichment",
      sub: "join city · driver tier · vehicle",
      color: C.cyan,
      detail:
        "Real-time jobs validate and dedupe events, then add static reference context such as city, driver tier, and vehicle type.",
    },
    {
      label: "Conformed Silver",
      sub: "consistent events",
      color: C.violet,
      detail:
        "Schemas, entity keys, timestamps, and quality rules are standardized across every producer.",
    },
    {
      label: "Aggregated Gold",
      sub: "trip_fact · driver_shift_fact · city_day_fact",
      color: C.green,
      detail:
        "Trusted business facts serve finance, city operations, analytics, experimentation, and ML.",
    },
  ];
  return (
    <>
      <Outline
        sections={UBER_EVENT_SOURCE_SECTIONS}
        active={sourceActive}
        onGo={goToSource}
      />
      <div className="space-y-5 xl:pl-[232px]">
        <Section
          id="producer-map"
          kicker="01 · Sources"
          title="Map the event producers"
          sub="Six systems describe different parts of the marketplace."
          color={C.blue}
        >
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sources.map((source) => (
              <button
                key={source.name}
                className="group relative min-h-[142px] border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  borderColor: `${source.color}55`,
                  background: C.card2,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xl">{source.icon}</span>
                  <span
                    className="rounded-full border px-2.5 py-1 text-xs font-bold uppercase"
                    style={{
                      borderColor: `${source.color}55`,
                      color: source.color,
                    }}
                  >
                    {source.tier}
                  </span>
                </div>
                <p className="mt-3 font-semibold">{source.name}</p>
                <code
                  className="mt-2 block text-xs leading-6 md:text-[13px]"
                  style={{ color: C.muted }}
                >
                  {source.events}
                </code>
                <Tip text={source.detail} />
              </button>
            ))}
          </div>
        </Section>
        <Section
          id="event-envelope"
          kicker="02 · Contract"
          title="Standardize every event with shared metadata"
          sub="An envelope is a common outer structure around each source-specific payload."
          color={C.violet}
        >
          <div className="mt-5 grid gap-4 lg:grid-cols-[330px_1fr]">
            <div
              className="rounded-2xl border p-5"
              style={{
                borderColor: "rgba(109,103,116,.45)",
                background: C.card2,
              }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-[.16em]"
                style={{ color: C.violet }}
              >
                Shared envelope · same for every source
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "event_id",
                  "event_time",
                  "ingestion_time",
                  "entity IDs",
                  "event_version",
                  "geohash",
                ].map((field) => (
                  <span
                    key={field}
                    className="rounded-lg border px-2 py-1 text-xs"
                    style={{
                      borderColor: "rgba(109,103,116,.35)",
                      background: C.card,
                    }}
                  >
                    {field}
                  </span>
                ))}
              </div>
              <div
                className="mt-4 rounded-xl border p-4"
                style={{ borderColor: C.border, background: C.card }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[.14em]"
                  style={{ color: C.faint }}
                >
                  Source-specific payload
                </p>
                <code
                  className="mt-2 block text-xs leading-6"
                  style={{ color: C.text }}
                >
                  location_ping | trip_matched | payment_captured | ...
                </code>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">
                Why the shared envelope is necessary
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {fields.map(([name, purpose, detail]) => (
                  <button
                    key={name}
                    className="group relative min-h-[96px] border p-4 text-left"
                    style={{ borderColor: C.border, background: C.card2 }}
                  >
                    <code
                      className="text-[13px] font-bold"
                      style={{ color: C.violet }}
                    >
                      {name}
                    </code>
                    <p className="mt-2 text-sm" style={{ color: C.muted }}>
                      {purpose}
                    </p>
                    <Tip text={detail} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div
              className="rounded-xl border p-3 text-sm"
              style={{ borderColor: C.border, background: C.card2 }}
            >
              <strong>Dedupe + order</strong>
              <span className="mt-1 block text-xs" style={{ color: C.muted }}>
                same rules for every producer
              </span>
            </div>
            <div
              className="rounded-xl border p-3 text-sm"
              style={{ borderColor: C.border, background: C.card2 }}
            >
              <strong>Measure delay</strong>
              <span className="mt-1 block text-xs" style={{ color: C.muted }}>
                event time vs ingestion time
              </span>
            </div>
            <div
              className="rounded-xl border p-3 text-sm"
              style={{ borderColor: C.border, background: C.card2 }}
            >
              <strong>Join + evolve</strong>
              <span className="mt-1 block text-xs" style={{ color: C.muted }}>
                stable keys and versions
              </span>
            </div>
          </div>
        </Section>
        <Section
          id="source-priority"
          kicker="03 · Operating model"
          title="Volume and priority are different axes"
          sub="A small stream can demand stronger handling than a large one."
          color={C.amber}
        >
          <div
            className="mt-5 overflow-hidden rounded-2xl border"
            style={{ borderColor: C.border, background: C.card2 }}
          >
            <div
              className="grid grid-cols-[120px_1fr_1fr_1fr] border-b text-center text-xs font-bold uppercase tracking-[.1em] md:grid-cols-[150px_1fr_1fr_1fr] md:text-sm"
              style={{ borderColor: C.border, color: C.faint }}
            >
              <span className="p-3 text-left">Priority ↓ / Volume →</span>
              <span className="p-3">Low</span>
              <span className="p-3">Medium</span>
              <span className="p-3">High</span>
            </div>
            {[
              ["Highest", ["Support + safety", "Payments", "Driver GPS"]],
              ["Standard", ["—", "Maps + dispatch", "Rider activity"]],
            ].map(([row, cells]) => (
              <div
                key={row as string}
                className="grid grid-cols-[120px_1fr_1fr_1fr] border-b last:border-b-0 md:grid-cols-[150px_1fr_1fr_1fr]"
                style={{ borderColor: C.border }}
              >
                <strong className="p-3 text-sm md:text-base">
                  {row as string}
                </strong>
                {(cells as string[]).map((cell) => (
                  <div
                    key={cell}
                    className="border-l p-3 text-center text-sm md:text-base"
                    style={{
                      borderColor: C.border,
                      color: cell === "—" ? C.faint : C.text,
                    }}
                  >
                    {cell}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Section>
        <Section
          id="population-flow"
          kicker="04 · Population"
          title="Populate Bronze, Silver, and Gold"
          sub="Raw device events enter Kafka, Flink enriches them, and trusted facts emerge in stages."
          color={C.cyan}
        >
          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_24px_1fr_24px_1fr_24px_1fr_24px_1fr] lg:items-center">
            {stages.map((stage, i) => (
              <div className="contents" key={stage.label}>
                <button
                  className="group relative min-h-[126px] border p-4 text-left"
                  style={{
                    borderColor: `${stage.color}55`,
                    background: C.card2,
                  }}
                >
                  <span
                    className="text-xs font-bold"
                    style={{ color: stage.color }}
                  >
                    0{i + 1}
                  </span>
                  <p className="mt-3 text-sm font-semibold">{stage.label}</p>
                  <p
                    className="mt-2 text-xs leading-5"
                    style={{ color: C.muted }}
                  >
                    {stage.sub}
                  </p>
                  <Tip text={stage.detail} />
                </button>
                {i < stages.length - 1 ? (
                  <span
                    className="hidden text-center lg:block"
                    style={{ color: C.cyan }}
                  >
                    →
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
        <Section
          id="trip-reconciliation"
          kicker="05 · Interview insight"
          title="Build one trustworthy trip from 5 producers"
          sub="The same trip is described independently, and events can be late, duplicated, or out of order."
          color={C.green}
        >
          <button
            className="group relative mt-5 w-full border p-4 text-left md:p-5"
            style={{ borderColor: "rgba(102,122,112,.35)", background: C.card2 }}
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_260px_1fr] lg:items-center">
              <div className="grid gap-2">
                {[
                  ["Rider app", "trip_requested"],
                  ["Driver app", "trip_status_change"],
                  ["Dispatch", "trip_matched"],
                  ["Payments", "payment_captured"],
                  ["Maps", "route_computed"],
                ].map(([source, event]) => (
                  <div
                    key={source}
                    className="flex items-center justify-between rounded-xl border px-3 py-3"
                    style={{ borderColor: C.border, background: C.card }}
                  >
                    <span className="text-sm font-semibold">{source}</span>
                    <code className="text-xs" style={{ color: C.muted }}>
                      {event}
                    </code>
                  </div>
                ))}
              </div>
              <div
                className="rounded-2xl border p-5 text-center"
                style={{
                  borderColor: "rgba(102,122,112,.45)",
                  background: C.card,
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[.16em]"
                  style={{ color: C.green }}
                >
                  Reconciliation
                </p>
                <strong className="mt-3 block text-xl">Join on trip_id</strong>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {["dedupe", "order by event_time", "complete state"].map(
                    (step) => (
                      <span
                        key={step}
                        className="rounded-lg border px-2 py-1 text-xs"
                        style={{ borderColor: C.border, background: C.card2 }}
                      >
                        {step}
                      </span>
                    ),
                  )}
                </div>
              </div>
              <div
                className="rounded-2xl border p-5"
                style={{
                  borderColor: "rgba(102,122,112,.35)",
                  background: C.card,
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[.16em]"
                  style={{ color: C.green }}
                >
                  Trusted output
                </p>
                <p className="mt-3 font-semibold">One canonical trip record</p>
                <div
                  className="mt-3 grid grid-cols-2 gap-2 text-xs"
                  style={{ color: C.muted }}
                >
                  <span>✓ lifecycle</span>
                  <span>✓ payment</span>
                  <span>✓ route</span>
                  <span>✓ timestamps</span>
                </div>
              </div>
            </div>
            <Tip text="Rider, driver, dispatch, payment, and maps systems publish independently for the same trip. Their events can arrive late, be retried, or appear out of order. The pipeline joins them by trip_id, deduplicates by event_id, orders them by event_time, and completes one trustworthy trip record." />
          </button>
        </Section>
        <nav
          aria-label="Chapter navigation"
          className="flex items-center justify-between border-t pt-4"
          style={{ borderColor: C.border }}
        >
          <Link
            href={href("requirements")}
            className="rounded-md border px-4 py-3 text-sm font-semibold"
            style={{ borderColor: C.border, background: C.card }}
          >
            ← Requirements
          </Link>
          <Link
            href={href("architecture")}
            className="rounded-md border px-4 py-3 text-right text-sm font-semibold"
            style={{ borderColor: C.border, background: C.card }}
          >
            <small
              className="block text-[9px] uppercase tracking-[.16em]"
              style={{ color: C.faint }}
            >
              Next chapter
            </small>
            <span className="mt-1 block">Architecture →</span>
          </Link>
        </nav>
      </div>
    </>
  );
}

type ArchitectureNodeData = {
  label: string;
  layer: string;
  summary: string;
  why: string;
  input: string;
  output: string;
  accent: string;
  chips: string[];
  active?: boolean;
};
const architectureDetails: Record<string, ArchitectureNodeData> = {
  "driver-app": {
    label: "Driver app",
    layer: "Producer",
    summary:
      "Sends each online driver's GPS, availability, and trip milestones.",
    why: "At Uber's assumed peak, 2M online drivers send 1 ping every 4 seconds, creating about 500K location events/sec. These pings determine which H3 cells have available supply; driver status events distinguish idle, offered, en route, and on-trip time.",
    input:
      "Phone GPS, online/offline actions, accept/arrive/start/complete actions",
    output:
      "geo.location_pings keyed by geohash + trip.lifecycle keyed by trip_id",
    accent: C.blue,
    chips: ["500K GPS/sec", "1 ping / 4 sec"],
  },
  "rider-app": {
    label: "Rider app",
    layer: "Producer",
    summary:
      "Records where Uber demand forms and whether it converts into a trip.",
    why: "Fare estimates, searches, service-option views, and trip requests measure demand before a trip exists. Keeping unsuccessful requests is essential for city-cell supply/demand ratios, conversion analysis, and cancellation funnels.",
    input:
      "Pickup/drop-off search, fare estimate, service selection, trip request",
    output:
      "rider.app_events + trip_requested with rider_id, city_id, and pickup H3",
    accent: C.violet,
    chips: ["demand intent", "request funnel"],
  },
  dispatch: {
    label: "Dispatch",
    layer: "Producer",
    summary:
      "Records Uber's driver offers, matches, cancellations, and ETA changes.",
    why: "Dispatch is the authoritative producer for which candidate driver received an offer and which driver matched a rider. Its events are joined with independent rider and driver events on trip_id to reconstruct the actual marketplace outcome.",
    input: "Ride request + nearby available drivers + pickup ETA scores",
    output:
      "trip_matched, trip_cancelled, eta_recalculated, and match-attempt events",
    accent: C.cyan,
    chips: ["trip_id", "match outcome"],
  },
  payments: {
    label: "Payments",
    layer: "Producer",
    summary: "Records every financial movement attached to an Uber trip.",
    why: "A completed trip can create authorization, capture, tip, adjustment, refund, chargeback, and driver payout events. Client event_id and processor references make those movements idempotent, while nightly reconciliation checks them against settlement records.",
    input:
      "Completed trip fare, rider payment token, driver earning components",
    output:
      "payments.events for capture, refund, adjustment, tip, and settlement",
    accent: C.green,
    chips: ["idempotent money", "nightly reconcile"],
  },
  maps: {
    label: "Maps",
    layer: "Producer",
    summary:
      "Adds Uber route, traffic, distance, and ETA evidence to each trip.",
    why: "Map-matched driver positions and traffic-aware routes feed pickup ETA during the trip. Historical estimated versus actual distance and duration then train and evaluate Uber's ETA models without treating raw GPS as a clean route.",
    input: "Driver/rider coordinates, road graph, live traffic, destination",
    output:
      "route_computed, map-matched segments, distance, duration, and ETA observations",
    accent: C.amber,
    chips: ["map matching", "ETA error"],
  },
  kafka: {
    label: "Kafka",
    layer: "Durable backbone",
    summary:
      "Isolates Uber's GPS, trip, rider, and payment workloads in replayable topics.",
    why: "Uber's location stream is spatial while trip and payment streams are transactional. geo.location_pings is partitioned for H3/geohash locality; trip.lifecycle and payments.events preserve per-trip ordering with trip_id. Flink and the lakehouse read the same retained offsets, avoiding two sources of truth.",
    input:
      "geo.location_pings, trip.lifecycle, rider.app_events, payments.events",
    output:
      "Regionally durable topic partitions consumed by Flink and Bronze ingestion",
    accent: C.amber,
    chips: ["geohash + trip_id", "shared offsets"],
  },
  flink: {
    label: "Flink streaming",
    layer: "Seconds path",
    summary:
      "Turns Uber events into live supply, surge inputs, ETA features, and trip sessions.",
    why: "Separate Flink jobs maintain rolling H3 supply/demand windows, keyed driver state, and trip_id sessions, then join city, vehicle, and driver-tier reference data. Event-time watermarks keep Uber's live signals usable even when mobile events arrive late or out of order.",
    input:
      "Kafka topics + city, H3 zone, driver tier, and vehicle reference data",
    output:
      "Live driver map, smoothed surge aggregates, ETA features, and active trip sessions",
    accent: C.cyan,
    chips: ["H3 windows", "event time"],
  },
  "batch-orchestration": {
    label: "Spark + Airflow",
    layer: "Trusted-history path",
    summary:
      "Rebuilds Uber's corrected trip, driver-shift, and settlement history.",
    why: "Airflow schedules Spark transformations from Bronze to conformed Silver events and reconciled Gold facts. Publishes are gated by Kafka-offset coverage, duplicate checks, lifecycle completeness, and payment totals so finance does not trust a table merely because a job succeeded.",
    input: "Bronze Kafka archive, late events, city/driver/vehicle dimensions",
    output:
      "trip_fact, driver_shift_fact, city_day facts, and finance settlement tables",
    accent: C.violet,
    chips: ["offset checks", "audited backfill"],
  },
  "low-latency-store": {
    label: "Redis / Cassandra",
    layer: "Online serving",
    summary: "Serves Uber's latest H3 supply, surge, and ETA state by key.",
    why: "Dispatch and pricing need millisecond lookups for nearby available-driver counts, current surge multipliers, and fresh ETA features. Those live decisions must not query Snowflake, BigQuery, or scan the lakehouse because warehouse latency and failures would enter the trip-request path.",
    input:
      "Flink outputs keyed by city, H3 cell, service type, driver, or trip",
    output: "Millisecond reads for dispatch, pricing, and ETA inference",
    accent: C.red,
    chips: ["H3 keyed state", "not warehouse"],
  },
  lakehouse: {
    label: "Lakehouse",
    layer: "Durable storage",
    summary:
      "Stores Uber Bronze, Silver, and Gold history on S3 with Iceberg or Delta.",
    why: "Bronze retains replayable source events; Silver deduplicates and conforms trip, driver, rider, payment, and map entities; Gold publishes business facts. Full-resolution GPS gets stricter access and shorter retention, while downsampled location history supports analysis at lower cost.",
    input:
      "Kafka offsets, raw payloads, late events, and Spark reconciliation outputs",
    output:
      "trip_fact, fact_location_ping, driver_shift_fact, city_day, and settlement facts",
    accent: C.blue,
    chips: ["Iceberg snapshots", "GPS retention"],
  },
  "live-marketplace": {
    label: "Live marketplace",
    layer: "Operational consumer",
    summary:
      "Feeds Uber's fresh data back into dispatch, pricing, and ETA decisions.",
    why: "This closes Uber's marketplace loop: driver pings update available supply, rider requests update demand, the surge signal changes prices, and ETA features rank pickup options. The path targets seconds or milliseconds because stale state can mismatch riders and drivers.",
    input:
      "Latest H3 supply/demand, driver state, surge value, and ETA features",
    output:
      "Driver candidate ranking, rider quote, pickup ETA, and active-trip updates",
    accent: C.red,
    chips: ["marketplace loop", "seconds"],
  },
  "warehouse-features": {
    label: "Warehouse + features",
    layer: "Serving layer",
    summary:
      "Separates Uber's governed SQL marts from point-in-time ML features.",
    why: "Snowflake or BigQuery serves certified Gold metrics such as completed trips, gross bookings, cancellation rate, and driver utilization. Offline Iceberg features build leakage-safe ETA and pricing training sets; equivalent online features are refreshed for live inference.",
    input:
      "Certified Gold facts, conformed dimensions, and time-correct feature joins",
    output:
      "City/finance marts + offline and online ETA, pricing, and matching features",
    accent: C.green,
    chips: ["point-in-time", "certified metrics"],
  },
  "business-consumers": {
    label: "BI, Ops, ML + Finance",
    layer: "Historical consumers",
    summary:
      "Turns Uber's reconciled history into city operations, money, models, and experiments.",
    why: "City Ops reads supply, demand, ETA, and cancellation dashboards; Finance closes bookings, refunds, tax, and driver payouts; ML trains ETA, pricing, and matching models; experimentation analyzes assignments at city or H3-cell level to account for marketplace spillovers.",
    input: "Gold warehouse marts + point-in-time feature datasets",
    output:
      "City dashboards, settlement reports, trained models, and geo-level experiment results",
    accent: C.green,
    chips: ["city + H3", "finance + ML"],
  },
};
const architecturePositions: Record<string, { x: number; y: number }> = {
  "driver-app": { x: 12, y: 24 },
  "rider-app": { x: 160, y: 24 },
  dispatch: { x: 308, y: 24 },
  payments: { x: 456, y: 24 },
  maps: { x: 604, y: 24 },
  kafka: { x: 290, y: 144 },
  flink: { x: 110, y: 269 },
  "batch-orchestration": { x: 490, y: 269 },
  "low-latency-store": { x: 110, y: 394 },
  lakehouse: { x: 490, y: 394 },
  "live-marketplace": { x: 110, y: 519 },
  "warehouse-features": { x: 490, y: 519 },
  "business-consumers": { x: 490, y: 644 },
};
const architectureEdges: Array<{
  id: string;
  source: string;
  target: string;
  label?: string;
}> = [
  ...["driver-app", "rider-app", "dispatch", "payments", "maps"].map((id) => ({
    id: `${id}-kafka`,
    source: id,
    target: "kafka",
  })),
  { id: "kafka-flink", source: "kafka", target: "flink", label: "seconds" },
  {
    id: "kafka-batch",
    source: "kafka",
    target: "batch-orchestration",
    label: "replay + batch",
  },
  { id: "flink-online", source: "flink", target: "low-latency-store" },
  {
    id: "online-live",
    source: "low-latency-store",
    target: "live-marketplace",
  },
  { id: "batch-lake", source: "batch-orchestration", target: "lakehouse" },
  { id: "lake-serving", source: "lakehouse", target: "warehouse-features" },
  {
    id: "serving-consumers",
    source: "warehouse-features",
    target: "business-consumers",
  },
];
const architectureNodeHeight = 94;
const architectureProducerIds = new Set([
  "driver-app",
  "rider-app",
  "dispatch",
  "payments",
  "maps",
]);
const architectureNodeWidth = (id: string) =>
  architectureProducerIds.has(id) ? 140 : 164;
const architectureDiagramLabels: Record<string, string> = {
  "driver-app": "GPS + availability",
  "rider-app": "Demand + trip requests",
  dispatch: "Match + trip state",
  payments: "Payment + settlement",
  maps: "Routes + traffic",
  kafka: "Durable event backbone",
  flink: "Live marketplace updates",
  "batch-orchestration": "Reconcile + backfill",
  "low-latency-store": "Latest keyed state",
  lakehouse: "Bronze to Silver to Gold",
  "live-marketplace": "Surge + ETA + dispatch",
  "warehouse-features": "SQL + model features",
  "business-consumers": "Reporting + Ops + ML",
};
function ArchitectureSvg({
  focused,
  onFocus,
  zoom,
}: {
  focused: string;
  onFocus: (id: string) => void;
  zoom: number;
}) {
  return (
    <svg
      data-testid="uber-architecture-svg"
      viewBox="0 0 760 750"
      className="h-full w-full"
      role="group"
      aria-label="Uber data platform architecture"
    >
      <defs>
        <marker
          id="uber-architecture-arrow"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <path d="M0 0L7 3.5L0 7Z" fill="var(--text-muted)" />
        </marker>
      </defs>
      <g
        transform={`translate(${380 - 380 * zoom} ${24 - 24 * zoom}) scale(${zoom})`}
      >
        {[
          ["SOURCES", 18],
          ["KAFKA", 161],
          ["PROCESSING", 286],
          ["SERVING", 411],
          ["PRODUCTS", 536],
        ].map(([label, y]) => (
          <text
            key={label}
            x="10"
            y={Number(y)}
            fill="var(--text-muted)"
            fontSize="12"
            fontWeight="800"
            letterSpacing="1"
          >
            {label}
          </text>
        ))}
        {architectureEdges.map((edge) => {
          const from = architecturePositions[edge.source],
            to = architecturePositions[edge.target];
          const x1 = from.x + architectureNodeWidth(edge.source) / 2,
            y1 = from.y + architectureNodeHeight,
            x2 = to.x + architectureNodeWidth(edge.target) / 2,
            y2 = to.y;
          const active = edge.source === focused || edge.target === focused;
          const mid = (y1 + y2) / 2;
          return (
            <g key={edge.id} opacity={active ? 1 : 0.52}>
              <path
                d={`M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2 - 5}`}
                fill="none"
                stroke={
                  active
                    ? architectureDetails[focused].accent
                    : "var(--text-muted)"
                }
                strokeWidth={active ? 2 : 1.1}
                markerEnd="url(#uber-architecture-arrow)"
              />
              {edge.label ? (
                <>
                  <rect
                    x={(x1 + x2) / 2 - 30}
                    y={mid - 8}
                    width="60"
                    height="15"
                    rx="4"
                    fill="var(--bg-card)"
                    stroke="var(--border)"
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={mid + 3}
                    fill="var(--text-muted)"
                    fontSize="8"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {edge.label}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
        {Object.entries(architectureDetails).map(([id, data]) => {
          const pos = architecturePositions[id],
            active = id === focused,
            width = architectureNodeWidth(id);
          return (
            <g
              key={id}
              data-testid={`architecture-node-${data.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              role="button"
              tabIndex={0}
              aria-label={`${data.label}: ${data.summary}`}
              aria-pressed={active}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onFocus(id)}
              onClick={() => onFocus(id)}
              onFocus={() => onFocus(id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onFocus(id);
                }
              }}
              className="cursor-pointer outline-none"
            >
              <rect
                x={pos.x - 16}
                y={pos.y - 16}
                width={width + 32}
                height={architectureNodeHeight + 32}
                fill="transparent"
                pointerEvents="all"
              />
              <rect
                x={pos.x}
                y={pos.y}
                width={width}
                height={architectureNodeHeight}
                rx="10"
                fill={
                  active
                    ? `color-mix(in srgb, ${data.accent} 13%, var(--bg-card))`
                    : "var(--bg-card)"
                }
                stroke={data.accent}
                strokeOpacity={active ? 1 : 0.55}
                strokeWidth={active ? 2 : 1}
              />
              <rect
                x={pos.x}
                y={pos.y}
                width="4"
                height={architectureNodeHeight}
                rx="2"
                fill={data.accent}
              />
              <text
                x={pos.x + 12}
                y={pos.y + 22}
                fill={data.accent}
                fontSize="10"
                fontWeight="700"
                letterSpacing="1"
              >
                {data.layer.toUpperCase()}
              </text>
              <text
                x={pos.x + 12}
                y={pos.y + 48}
                fill="var(--text)"
                fontSize="14"
                fontWeight="700"
              >
                {data.label}
              </text>
              <text
                x={pos.x + 12}
                y={pos.y + 74}
                fill="var(--text-muted)"
                fontSize="11"
              >
                {architectureDiagramLabels[id]}
              </text>
              {active ? (
                <circle
                  cx={pos.x + width - 13}
                  cy={pos.y + 15}
                  r="4"
                  fill={data.accent}
                />
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
function ArchitectureTab() {
  const [architectureActive, setArchitectureActive] = useState<string>(
    UBER_ARCHITECTURE_SECTIONS[0].id,
  );
  const [focused, setFocused] = useState("kafka");
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const sync = () => {
      setArchitectureActive(
        getActiveDataDesignSection(UBER_ARCHITECTURE_SECTIONS),
      );
    };
    sync();
    addEventListener("scroll", sync, { passive: true });
    return () => removeEventListener("scroll", sync);
  }, []);
  useEffect(() => {
    document
      .querySelector<HTMLElement>('[data-testid="architecture-detail-panel"]')
      ?.scrollTo({ top: 0 });
  }, [focused]);
  const goToArchitecture = (id: string) => {
    if (!document.getElementById(id)) return;
    history.replaceState(null, "", `${href("architecture")}#${id}`);
    scrollToDataDesignSection(id);
    setArchitectureActive(id);
  };
  const selected = architectureDetails[focused];
  return (
    <>
      <Outline
        sections={UBER_ARCHITECTURE_SECTIONS}
        active={architectureActive}
        onGo={goToArchitecture}
      />
      <div className="space-y-5 xl:pl-[232px]">
        <Section
          id="architecture-map"
          kicker="04 · Architecture"
          title="One event backbone, two processing paths"
          sub="Explore the complete Uber data flow from marketplace producers to live decisions and trusted historical products."
          color={C.cyan}
        >
          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div
              data-testid="uber-architecture-canvas"
              className="relative h-[650px] overflow-hidden rounded-2xl border"
              style={{ borderColor: C.border, background: C.card2 }}
            >
              <div
                data-testid="uber-architecture-zoom-controls"
                className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-lg shadow-sm"
                style={{ background: C.card }}
              >
                <button
                  aria-label="Zoom out"
                  onClick={() =>
                    setZoom((value) =>
                      Math.max(0.8, Number((value - 0.1).toFixed(1))),
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg border text-lg"
                  style={{ borderColor: C.border, color: C.text }}
                >
                  −
                </button>
                <button
                  aria-label="Reset zoom"
                  onClick={() => setZoom(1)}
                  className="h-9 min-w-14 rounded-lg border px-2 text-xs font-semibold"
                  style={{ borderColor: C.border, color: C.muted }}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  aria-label="Zoom in"
                  onClick={() =>
                    setZoom((value) =>
                      Math.min(1.5, Number((value + 0.1).toFixed(1))),
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg border text-lg"
                  style={{ borderColor: C.border, color: C.text }}
                >
                  +
                </button>
              </div>
              <ArchitectureSvg
                focused={focused}
                onFocus={setFocused}
                zoom={zoom}
              />
            </div>
            <aside
              data-testid="architecture-detail-panel"
              aria-live="polite"
              className="max-h-[calc(100dvh-156px)] self-start overflow-y-auto rounded-2xl border xl:sticky xl:top-[140px]"
              style={{
                borderColor: `${selected.accent}55`,
                background: `color-mix(in srgb, ${selected.accent} 7%, var(--bg-card))`,
              }}
            >
              <div
                className="sticky top-0 z-10 border-b p-5 pb-4"
                style={{
                  borderColor: C.border,
                  background: `color-mix(in srgb, ${selected.accent} 7%, var(--bg-card))`,
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[.18em]"
                  style={{ color: selected.accent }}
                >
                  {selected.layer}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{selected.label}</h3>
                <p
                  className="mt-3 text-sm leading-6"
                  style={{ color: C.muted }}
                >
                  {selected.summary}
                </p>
              </div>
              <div className="p-5">
                <p
                  className="text-[10px] font-bold uppercase tracking-[.16em]"
                  style={{ color: C.faint }}
                >
                  Why it exists
                </p>
                <p className="mt-2 text-sm leading-6">{selected.why}</p>
                <div className="mt-4 space-y-3">
                  <div
                    className="rounded-xl border p-3"
                    style={{ borderColor: C.border, background: C.card }}
                  >
                    <p
                      className="text-[9px] font-bold uppercase tracking-[.14em]"
                      style={{ color: C.faint }}
                    >
                      Receives
                    </p>
                    <p className="mt-1.5 text-xs leading-5">{selected.input}</p>
                  </div>
                  <div
                    className="rounded-xl border p-3"
                    style={{ borderColor: C.border, background: C.card }}
                  >
                    <p
                      className="text-[9px] font-bold uppercase tracking-[.14em]"
                      style={{ color: C.faint }}
                    >
                      Produces
                    </p>
                    <p className="mt-1.5 text-xs leading-5">
                      {selected.output}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold"
                      style={{
                        borderColor: `${selected.accent}44`,
                        color: selected.accent,
                        background: C.card,
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </Section>
        <Section
          id="architecture-principle"
          kicker="Architecture decision"
          title="Why the pipeline splits after Kafka"
          color={C.amber}
        >
          <div
            className="mt-5 overflow-hidden rounded-2xl border"
            style={{ borderColor: C.border, background: C.card2 }}
          >
            <div
              className="border-b px-5 py-4 text-center"
              style={{ borderColor: C.border }}
            >
              <span
                className="rounded-lg border px-4 py-2 text-sm font-bold"
                style={{
                  borderColor: `${C.amber}66`,
                  color: C.amber,
                  background: C.card,
                }}
              >
                Same durable Kafka topics
              </span>
              <div
                className="mx-auto mt-2 h-6 w-px"
                style={{ background: C.amber }}
              />
              <div
                className="mx-auto h-px w-1/2"
                style={{ background: C.amber }}
              />
            </div>
            <div className="grid md:grid-cols-2">
              <button
                type="button"
                aria-pressed={focused === "flink"}
                onMouseEnter={() => setFocused("flink")}
                onFocus={() => setFocused("flink")}
                onClick={() => setFocused("flink")}
                className="group relative min-h-[150px] border-b p-5 text-left md:border-b-0 md:border-r"
                style={{ borderColor: C.border, background: "transparent" }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[.16em]"
                  style={{ color: C.cyan }}
                >
                  Flink · seconds
                </p>
                <p className="mt-2 text-lg font-semibold">
                  Continuously update live state
                </p>
                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: C.muted }}
                >
                  Rolling supply cells, surge inputs, ETA features, and current
                  trip sessions feed operational services.
                </p>
                <Tip text={architectureDetails.flink.why} />
              </button>
              <button
                type="button"
                aria-pressed={focused === "batch-orchestration"}
                onMouseEnter={() => setFocused("batch-orchestration")}
                onFocus={() => setFocused("batch-orchestration")}
                onClick={() => setFocused("batch-orchestration")}
                className="group relative min-h-[150px] p-5 text-left"
                style={{ background: "transparent" }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[.16em]"
                  style={{ color: C.violet }}
                >
                  Spark + Airflow · scheduled
                </p>
                <p className="mt-2 text-lg font-semibold">
                  Reconcile historical truth
                </p>
                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: C.muted }}
                >
                  Late and duplicate events are corrected into auditable trip,
                  shift, and settlement facts.
                </p>
                <Tip text={architectureDetails["batch-orchestration"].why} />
              </button>
            </div>
            <div
              className="border-t px-5 py-4 text-center text-sm font-medium"
              style={{ borderColor: C.border, color: C.text }}
            >
              One event record, two freshness guarantees, no competing source of
              truth.
            </div>
          </div>
        </Section>
        <nav
          aria-label="Chapter navigation"
          className="flex items-center justify-between border-t pt-4"
          style={{ borderColor: C.border }}
        >
          <Link
            href={href("event-sources")}
            className="rounded-md border px-4 py-3 text-sm font-semibold"
            style={{ borderColor: C.border, background: C.card }}
          >
            ← Event Sources
          </Link>
          <Link
            href={href("ingestion-kafka")}
            className="rounded-md border px-4 py-3 text-right text-sm font-semibold"
            style={{ borderColor: C.border, background: C.card }}
          >
            <small
              className="block text-[9px] uppercase tracking-[.16em]"
              style={{ color: C.faint }}
            >
              Next chapter
            </small>
            <span className="mt-1 block">Ingestion / Kafka →</span>
          </Link>
        </nav>
      </div>
    </>
  );
}

function KafkaTab() {
  const [kafkaActive, setKafkaActive] = useState<string>(
    UBER_KAFKA_SECTIONS[0].id,
  );
  const kafkaAnchorLock = useRef<number | null>(null);
  useEffect(() => {
    const sync = () => {
      if (kafkaAnchorLock.current) return;
      setKafkaActive(getActiveDataDesignSection(UBER_KAFKA_SECTIONS));
    };
    sync();
    addEventListener("scroll", sync, { passive: true });
    return () => removeEventListener("scroll", sync);
  }, []);
  const goToKafka = (id: string) => {
    if (!document.getElementById(id)) return;
    if (kafkaAnchorLock.current) clearTimeout(kafkaAnchorLock.current);
    history.replaceState(null, "", `${href("ingestion-kafka")}#${id}`);
    setKafkaActive(id);
    scrollToDataDesignSection(id);
    kafkaAnchorLock.current = window.setTimeout(() => {
      setKafkaActive(id);
      kafkaAnchorLock.current = null;
    }, 700);
  };
  const locationJson = `{
  "event_id": "loc-7f31",
  "event_time": "09:14:02Z",
  "ingestion_time": "09:14:03Z",
  "event_version": 2,
  "driver_id": "drv-4471",
  "geohash": "tdr1v",
  "payload": { "lat": 12.9716, "lng": 77.5946,
               "speed_kmh": 34.2 }
}`;
  const paymentJson = `{
  "event_id": "pay-91ac",
  "event_time": "09:37:18Z",
  "ingestion_time": "09:37:18Z",
  "event_version": 3,
  "trip_id": "trip-88213",
  "payload": { "type": "payment_captured",
               "amount": 428, "currency": "INR" }
}`;
  const topics = [
    {
      title: "GPS: distribute spatial load",
      name: "geo.location_pings",
      accent: C.blue,
      badge: "Spatial",
      key: "city_id + H3 cell + hash(driver_id) % N",
      tokens: ["city", "H3", "driver salt"],
      summary:
        "Balance spatial locality against airport and downtown hotspots.",
      detail:
        "Pure geohash keeps nearby pings together but overloads airport, stadium, and dense downtown partitions. Pure driver_id spreads traffic but scatters city-cell aggregation. Uber uses a salted spatial key, then Flink re-keys by driver_id for trajectories or H3 cell for supply.",
    },
    {
      title: "Trips: preserve lifecycle order",
      name: "trip.lifecycle",
      accent: C.cyan,
      badge: "Transactional",
      key: "trip_id",
      tokens: ["requested", "matched", "started", "completed"],
      summary: "Keep every transition for one trip in strict partition order.",
      detail:
        "Requested, matched, arrived, started, completed, and cancelled events for one trip must land in the same partition. Geographic locality matters less than reconstructing the lifecycle deterministically.",
    },
    {
      title: "Payments: strengthen durability",
      name: "payments.events",
      accent: C.green,
      badge: "Financial",
      key: "trip_id · RF 4 · acks=all",
      tokens: ["authorize", "capture", "refund", "settle"],
      summary: "Preserve trip-level order with stronger durability for money.",
      detail:
        "Payment volume is smaller than GPS, but the loss cost is higher. Uber keeps trip_id ordering, uses replication factor 4 instead of 3, requires acks=all, and later reconciles Kafka events with processor settlement records.",
    },
  ];
  return (
    <>
      <Outline
        sections={UBER_KAFKA_SECTIONS}
        active={kafkaActive}
        onGo={goToKafka}
      />
      <div className="space-y-5 xl:pl-[232px]">
        <Section
          id="kafka-contract"
          kicker="05 · Ingestion / Kafka"
          title="Canonical event contracts"
          sub="Standardize the metadata Uber needs to operate every event; preserve the domain payload each producer owns."
          color={C.amber}
        >
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {[
              [
                "Driver location event",
                "geo.location_pings",
                locationJson,
                C.blue,
                "High-volume spatial payload",
              ],
              [
                "Payment capture event",
                "payments.events",
                paymentJson,
                C.green,
                "Financial transaction payload",
              ],
            ].map(([title, topic, json, color, label]) => (
              <div
                key={topic}
                className="overflow-hidden rounded-2xl border"
                style={{ borderColor: `${color}55`, background: C.card2 }}
              >
                <div
                  className="flex items-center justify-between gap-3 border-b px-4 py-3"
                  style={{ borderColor: C.border }}
                >
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <code className="text-[11px]" style={{ color }}>
                      {topic}
                    </code>
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase"
                    style={{ color: C.faint }}
                  >
                    {label}
                  </span>
                </div>
                <pre
                  className="overflow-x-auto p-4 text-[12px] leading-6"
                  style={{ color: C.text }}
                >
                  {json}
                </pre>
              </div>
            ))}
          </div>
          <div
            className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-3 text-xs"
            style={{ borderColor: `${C.amber}44`, background: C.card2 }}
          >
            <strong style={{ color: C.amber }}>Shared envelope</strong>
            {[
              "event_id",
              "event_time",
              "ingestion_time",
              "event_version",
              "entity IDs",
            ].map((field) => (
              <code
                key={field}
                className="rounded-md px-2 py-1"
                style={{ background: C.card }}
              >
                {field}
              </code>
            ))}
            <span style={{ color: C.muted }}>
              The payload changes; these operational fields do not.
            </span>
          </div>
        </Section>
        <Section
          id="kafka-topics"
          kicker="Topic partition strategy"
          title="Topic partition strategy"
          sub="Choose the Kafka key from the ordering and locality each Uber workload needs."
          color={C.blue}
        >
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {topics.map((topic) => (
              <button
                key={topic.name}
                className="group relative min-h-[250px] border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  borderColor: `${topic.accent}55`,
                  background: C.card2,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{topic.title}</p>
                    <code
                      className="mt-1 block text-xs"
                      style={{ color: topic.accent }}
                    >
                      {topic.name}
                    </code>
                  </div>
                  <span
                    className="rounded-lg border px-2 py-1 text-[10px] font-bold uppercase"
                    style={{
                      borderColor: `${topic.accent}55`,
                      color: topic.accent,
                    }}
                  >
                    {topic.badge}
                  </span>
                </div>
                <p
                  className="mt-5 text-[10px] font-bold uppercase tracking-[.14em]"
                  style={{ color: C.faint }}
                >
                  Partition key
                </p>
                <p className="mt-2 min-h-[42px] text-sm font-semibold leading-6">
                  {topic.key}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {topic.tokens.map((token, index) => (
                    <span className="contents" key={token}>
                      <span
                        className="rounded-lg border px-2.5 py-1.5 text-xs"
                        style={{
                          borderColor: `${topic.accent}44`,
                          background: C.card,
                        }}
                      >
                        {token}
                      </span>
                      {index < topic.tokens.length - 1 ? (
                        <span
                          className="font-bold"
                          style={{ color: topic.accent }}
                        >
                          {topic.badge === "Spatial" ? "+" : "→"}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </div>
                <p
                  className="mt-4 text-xs leading-5"
                  style={{ color: C.muted }}
                >
                  {topic.summary}
                </p>
                <Tip text={topic.detail} />
              </button>
            ))}
          </div>
          <div
            className="mt-4 rounded-xl border px-4 py-3 text-sm font-medium"
            style={{ borderColor: `${C.blue}44`, background: C.card2 }}
          >
            Spatial events need balanced locality. Transactional events need
            deterministic entity order.
          </div>
        </Section>
        <Section
          id="kafka-sizing"
          kicker="Partition capacity"
          title="Partition capacity"
          sub="Calculate the minimum required for peak GPS traffic, then provision for how Uber will operate the topic."
          color={C.violet}
        >
          <button
            className="group relative mt-5 w-full overflow-visible border text-left"
            style={{ borderColor: `${C.violet}55`, background: C.card2 }}
          >
            <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center sm:text-center">
              <div>
                <strong className="text-2xl">500K/sec</strong>
                <span className="block text-xs" style={{ color: C.muted }}>
                  2M drivers ÷ 4 seconds
                </span>
              </div>
              <span
                className="text-4xl font-semibold leading-none"
                style={{ color: C.faint }}
              >
                ×
              </span>
              <div>
                <strong className="text-2xl">200 bytes</strong>
                <span className="block text-xs" style={{ color: C.muted }}>
                  estimated event size
                </span>
              </div>
              <span
                className="text-4xl font-semibold leading-none"
                style={{ color: C.faint }}
              >
                =
              </span>
              <div>
                <strong className="text-2xl" style={{ color: C.violet }}>
                  100 MB/s
                </strong>
                <span className="block text-xs" style={{ color: C.muted }}>
                  peak GPS throughput
                </span>
              </div>
            </div>
            <div
              className="grid border-t lg:grid-cols-[1fr_1.2fr]"
              style={{ borderColor: C.border }}
            >
              <div
                className="p-5 lg:border-r"
                style={{ borderColor: C.border }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[.16em]"
                  style={{ color: C.amber }}
                >
                  Throughput-only minimum
                </p>
                <p className="mt-2 text-xl font-bold">
                  100 MB/s ÷ 5–10 MB/s ={" "}
                  <span style={{ color: C.amber }}>10-20 partitions</span>
                </p>
                <p className="mt-2 text-xs" style={{ color: C.muted }}>
                  Enough only for the assumed sustained bytes per second.
                </p>
              </div>
              <div className="p-5">
                <p
                  className="text-[10px] font-bold uppercase tracking-[.16em]"
                  style={{ color: C.violet }}
                >
                  Production provision
                </p>
                <p className="mt-2 text-sm font-semibold">
                  Provision above 10-20 partitions in each regional cluster.
                </p>
                <p
                  className="mt-2 text-xs leading-6"
                  style={{ color: C.muted }}
                >
                  Extra partitions absorb hot H3 cells, unlock consumer
                  parallelism, preserve capacity during broker failure, and
                  leave room for growth.
                </p>
              </div>
            </div>
            <Tip text="Start with 2M simultaneously online drivers. Each driver sends 1 location ping per 4 seconds, so 2M ÷ 4 = 500K events/sec. One serialized GPS event is estimated at 200 bytes including coordinates, driver and trip IDs, timestamps, and envelope metadata. 500K × 200 bytes = 100 MB/s. At 5–10 MB/s sustained per Kafka partition, 100 MB/s ÷ 5–10 MB/s produces a 10-20 partition throughput minimum." />
          </button>
        </Section>
        <Section
          id="kafka-controls"
          kicker="Delivery controls"
          title="Keep late, duplicate, and financial events correct"
          color={C.cyan}
        >
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <button
              className="group relative min-h-[230px] border p-5 text-left"
              style={{ borderColor: `${C.cyan}55`, background: C.card2 }}
            >
              <p
                className="text-xs font-bold uppercase"
                style={{ color: C.cyan }}
              >
                Late mobile data
              </p>
              <div className="mt-5 space-y-3">
                {[
                  ["T+0", "Driver phone emits ping"],
                  ["T+90 sec", "Signal returns; event arrives"],
                  ["2 min", "Streaming watermark"],
                  ["> 2 min", "Late-events side output"],
                ].map(([time, event], index) => (
                  <div className="flex items-center gap-3" key={time}>
                    <strong
                      className="w-16 shrink-0 text-xs"
                      style={{ color: index === 3 ? C.amber : C.cyan }}
                    >
                      {time}
                    </strong>
                    <span
                      className="h-px flex-1"
                      style={{ background: C.border }}
                    />
                    <span className="w-36 text-xs">{event}</span>
                  </div>
                ))}
              </div>
              <Tip text="A ping arriving 90 seconds late is still inside the roughly 2-minute watermark and can update event-time windows. Events later than the watermark leave the live path through a side output; Uber retains them for trip and historical reconciliation instead of dropping them." />
            </button>
            <button
              className="group relative min-h-[230px] border p-5 text-left"
              style={{ borderColor: `${C.violet}55`, background: C.card2 }}
            >
              <p
                className="text-xs font-bold uppercase"
                style={{ color: C.violet }}
              >
                Deduplication
              </p>
              <div className="mt-6 flex items-center justify-between gap-2 text-center">
                {[
                  ["event_id", "client key"],
                  ["Flink TTL", "seen IDs"],
                  ["sink", "idempotent"],
                ].map(([title, sub], index) => (
                  <div className="contents" key={title}>
                    <div
                      className="rounded-xl border px-3 py-4"
                      style={{ borderColor: C.border, background: C.card }}
                    >
                      <strong className="block text-sm">{title}</strong>
                      <span
                        className="mt-1 block text-[10px]"
                        style={{ color: C.muted }}
                      >
                        {sub}
                      </span>
                    </div>
                    {index < 2 ? (
                      <span style={{ color: C.violet }}>→</span>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs leading-5" style={{ color: C.muted }}>
                No synchronous Redis lookup on every GPS event.
              </p>
              <Tip text="Uber can hold event_id in checkpointed Flink keyed state with a TTL, or rely on an idempotent or transactional sink. Calling Redis for every one of roughly 500K GPS events/sec adds network cost and makes Redis a correctness bottleneck." />
            </button>
            <button
              className="group relative min-h-[230px] border p-5 text-left"
              style={{ borderColor: `${C.green}55`, background: C.card2 }}
            >
              <p
                className="text-xs font-bold uppercase"
                style={{ color: C.green }}
              >
                Payment durability
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl border p-4 text-center"
                  style={{ borderColor: C.border, background: C.card }}
                >
                  <strong className="block text-2xl">4</strong>
                  <span className="text-xs" style={{ color: C.muted }}>
                    replicas
                  </span>
                </div>
                <div
                  className="rounded-xl border p-4 text-center"
                  style={{ borderColor: C.border, background: C.card }}
                >
                  <strong className="block text-lg">acks=all</strong>
                  <span className="text-xs" style={{ color: C.muted }}>
                    producer rule
                  </span>
                </div>
              </div>
              <p className="mt-5 text-xs leading-5" style={{ color: C.muted }}>
                Then reconcile against the payment processor.
              </p>
              <Tip text="Replication and acks reduce Kafka loss risk but do not prove an end-to-end financial outcome. Uber still matches authorization, capture, refund, and payout events against processor settlement records." />
            </button>
          </div>
        </Section>
        <Section
          id="kafka-retention"
          kicker="Location retention"
          title="Location retention"
          sub="Keep detailed GPS briefly for operational recovery, then reduce its precision for economical long-term analysis."
          color={C.green}
        >
          <button
            className="group relative mt-5 w-full overflow-visible border text-left"
            style={{ borderColor: C.border, background: C.card2 }}
          >
            <div className="grid md:grid-cols-[52px_220px_1fr] md:items-center">
              <span
                className="flex h-full min-h-24 items-center justify-center text-lg font-bold"
                style={{ background: `${C.blue}16`, color: C.blue }}
              >
                1
              </span>
              <div className="p-4">
                <p
                  className="text-[10px] font-bold uppercase"
                  style={{ color: C.blue }}
                >
                  Recent GPS · first 24 hours
                </p>
                <p className="mt-1 text-xl font-bold">15 samples/minute</p>
                <p className="mt-1 text-xs" style={{ color: C.muted }}>
                  1 ping per 4 seconds
                </p>
              </div>
              <p
                className="border-t p-4 text-sm leading-6 md:border-l md:border-t-0"
                style={{ borderColor: C.border, color: C.muted }}
              >
                Preserve the original sampling rate while recent trips may need
                replay, route investigation, fare correction, or GPS-quality
                debugging.
              </p>
            </div>
            <div
              className="grid border-t md:grid-cols-[52px_220px_1fr] md:items-center"
              style={{ borderColor: C.border }}
            >
              <span
                className="flex h-full min-h-24 items-center justify-center text-lg font-bold"
                style={{ background: `${C.amber}16`, color: C.amber }}
              >
                2
              </span>
              <div className="p-4">
                <p
                  className="text-[10px] font-bold uppercase"
                  style={{ color: C.amber }}
                >
                  After 24 hours
                </p>
                <p className="mt-1 text-xl font-bold">Compact the route</p>
                <p className="mt-1 text-xs" style={{ color: C.muted }}>
                  select representative points
                </p>
              </div>
              <p
                className="border-t p-4 text-sm leading-6 md:border-l md:border-t-0"
                style={{ borderColor: C.border, color: C.muted }}
              >
                A scheduled job replaces the dense stream with representative
                GPS points at 30-second intervals; the raw short-term copy can
                then expire.
              </p>
            </div>
            <div
              className="grid border-t md:grid-cols-[52px_220px_1fr] md:items-center"
              style={{ borderColor: C.border }}
            >
              <span
                className="flex h-full min-h-24 items-center justify-center text-lg font-bold"
                style={{ background: `${C.green}16`, color: C.green }}
              >
                3
              </span>
              <div className="p-4">
                <p
                  className="text-[10px] font-bold uppercase"
                  style={{ color: C.green }}
                >
                  Historical GPS
                </p>
                <p className="mt-1 text-xl font-bold">2 samples/minute</p>
                <p className="mt-1 text-xs" style={{ color: C.muted }}>
                  1 retained point per 30 seconds
                </p>
              </div>
              <p
                className="border-t p-4 text-sm leading-6 md:border-l md:border-t-0"
                style={{ borderColor: C.border, color: C.muted }}
              >
                This stores about 7.5× fewer points while retaining enough route
                shape for city planning, travel-time analysis, and marketplace
                modeling.
              </p>
            </div>
            <Tip text="A driver app emits 1 GPS ping per 4 seconds, which is 15 samples each minute. Uber keeps that dense series for 24 hours because operational corrections need precise recent movement. It then retains 1 representative point per 30 seconds, or 2 samples each minute. The change from 15 to 2 samples/minute reduces historical location volume by about 7.5×." />
          </button>
        </Section>
        <nav
          aria-label="Chapter navigation"
          className="flex items-center justify-between border-t pt-4"
          style={{ borderColor: C.border }}
        >
          <Link
            href={href("architecture")}
            className="rounded-md border px-4 py-3 text-sm font-semibold"
            style={{ borderColor: C.border, background: C.card }}
          >
            ← Architecture
          </Link>
          <Link
            href={href("batch-pipelines")}
            className="rounded-md border px-4 py-3 text-right text-sm font-semibold"
            style={{ borderColor: C.border, background: C.card }}
          >
            <small
              className="block text-[9px] uppercase tracking-[.16em]"
              style={{ color: C.faint }}
            >
              Next chapter
            </small>
            <span className="mt-1 block">Batch + Lakehouse →</span>
          </Link>
        </nav>
      </div>
    </>
  );
}

function Placeholder({ tab }: { tab: UberDeTabSlug }) {
  if (tab === "requirements") return <RequirementsTab />;
  if (tab === "event-sources") return <EventSourcesTab />;
  if (tab === "architecture") return <ArchitectureTab />;
  if (tab === "ingestion-kafka") return <KafkaTab />;
  if (tab === "batch-pipelines") return <BatchLakehouseTab />;
  if (tab === "data-modeling") return <DataModelingTab />;
  if (tab === "governance-quality") return <FailuresDataQualityTab />;
  if (tab === "quiz") return <InterviewQATab />;
  const meta = UBER_DE_TAB_META[tab];
  return (
    <div
      className="rounded-md border p-8"
      style={{ borderColor: C.border, background: C.card }}
    >
      <p className="text-xs font-bold uppercase" style={{ color: C.blue }}>
        Next tab
      </p>
      <h1 className="mt-3 text-3xl font-semibold">
        {meta.title.replace(" | withsoon.com", "")}
      </h1>
      <p className="mt-4" style={{ color: C.muted }}>
        {meta.description}
      </p>
    </div>
  );
}

export default function UberDataEngineeringPage({
  initialTab,
}: {
  initialTab?: string;
}) {
  const tab = normalizeUberDeTab(initialTab) ?? "start-here";
  const chapter = UBER_DE_TABS.find((item) => item.id === tab);
  const usesSharedChapterHeading = UBER_DE_TABS.findIndex((item) => item.id === tab) < 7;
  const [active, setActive] =
    useState<(typeof UBER_START_HERE_SECTIONS)[number]["id"]>(
      "platform-mission",
    );
  useEffect(() => {
    document.title = UBER_DE_TAB_META[tab].title;
  }, [tab]);
  useEffect(() => {
    if (tab !== "start-here") return;
    const sync = () => {
      setActive(
        getActiveDataDesignSection(UBER_START_HERE_SECTIONS) as (typeof UBER_START_HERE_SECTIONS)[number]["id"],
      );
    };
    sync();
    addEventListener("scroll", sync, { passive: true });
    return () => removeEventListener("scroll", sync);
  }, [tab]);
  const go = (id: string) => {
    const n = document.getElementById(id);
    if (!n) return;
    history.replaceState(null, "", `${href(tab)}#${id}`);
    scrollToDataDesignSection(id);
    setActive(id as (typeof UBER_START_HERE_SECTIONS)[number]["id"]);
  };
  return (
    <div
      className="uber-de-page min-h-[calc(100dvh-var(--site-nav-height))]"
      style={{ background: C.bg, color: C.text }}
    >
      <Tabs active={tab} />
      <MobileSectionNav
        sections={UBER_PAGE_SECTIONS[tab]}
        accent={C.blue}
      />
      <UberInteractionTutorial />
      <div className="mx-auto flex max-w-[1600px]">
        {tab === "start-here" ? <Outline active={active} onGo={go} /> : null}
        <section
          data-de-content
          aria-label={`${chapter?.label ?? "Data Engineering"} chapter content`}
          className="uber-de-content min-w-0 flex-1 px-4 pb-12 pt-5 md:px-8 xl:px-12"
        >
          {usesSharedChapterHeading ? (
            <div className={tab === "start-here" ? "" : tab === "data-modeling" ? "xl:ml-[420px]" : "xl:ml-[232px]"}>
              <ChapterPageHeading
                company="Uber"
                title={chapter?.label ?? "Data Engineering"}
                description={chapter?.summary ?? "Design Uber's shared marketplace data platform."}
              />
            </div>
          ) : null}
          {tab === "start-here" ? <StartHere /> : <Placeholder tab={tab} />}
        </section>
      </div>
      <style>{`.uber-de-page { --bg: #f4f7fb; --bg-card: #ffffff; --bg-muted: #eef4f9; --border: #d6e1eb; --text: #17202b; --text-muted: #526171; --text-faint: #59697a; color-scheme: light; } .uber-de-content section button { border-radius: 14px; } .uber-de-page [data-testid="platform-mission-visual"] { border-radius: 20px; } .uber-de-content section > div { border-radius: 16px; } .uber-architecture-canvas .react-flow__controls-button { background: var(--bg-card); color: var(--text); border-color: var(--border); } .uber-architecture-canvas .react-flow__controls-button:hover { background: var(--bg-muted); } .uber-architecture-canvas .react-flow__controls-button svg { fill: currentColor; }`}</style>
    </div>
  );
}
