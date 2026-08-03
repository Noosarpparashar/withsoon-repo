"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

const C = {
  red: "#e50914",
  amber: "#f59e0b",
  gold: "#fbbf24",
  blue: "#38bdf8",
  green: "#22c55e",
  violet: "#8b5cf6",
  text: "var(--text)",
  muted: "var(--text-muted)",
  faint: "var(--text-faint)",
  card: "var(--bg-card)",
  card2: "var(--bg-muted)",
  border: "var(--border)",
} as const;

type DetailItem = {
  key: string;
  emoji: string;
  label: string;
  category: string;
  color: string;
  summary: string;
  detail: string;
  examples: string;
  why: string;
};

type TooltipPlacement = "bottom" | "right" | "left";

const OPENING_LINE =
  "I would design the member-interaction data platform: events and CDC flow into one shared platform, then serve fast monitoring, personalization, analytics, training, and reporting consumers with different freshness needs.";

const PRODUCERS: readonly DetailItem[] = [
  {
    key: "playback",
    emoji: "📱",
    label: "Playback",
    category: "Producer",
    color: C.red,
    summary: "Watching behavior while a title is playing.",
    detail:
      "Playback is the stream of actions produced during viewing. This is where the platform receives watch behavior directly from the session.",
    examples:
      "Examples: play_started, pause_clicked, seek_to_timestamp, heartbeat_every_30s, playback_completed.",
    why:
      "Playback is the strongest behavioral signal for watch-time truth, completion analysis, QoE correlation, and recommendation feedback.",
  },
  {
    key: "browse",
    emoji: "🧭",
    label: "Browse",
    category: "Producer",
    color: C.red,
    summary: "Discovery behavior before playback starts.",
    detail:
      "Browse covers how members move through rows, title cards, and detail pages while deciding what to watch.",
    examples:
      "Examples: homepage_row_seen, title_impression, row_scrolled, detail_page_opened, click_from_top10.",
    why:
      "Browse explains discovery quality, homepage ranking performance, and why users did or did not convert into playback.",
  },
  {
    key: "search",
    emoji: "🔎",
    label: "Search",
    category: "Producer",
    color: C.red,
    summary: "Explicit intent from typed or suggested queries.",
    detail:
      "Search captures what the member asked for, what results came back, and whether the session ended in success or frustration.",
    examples:
      "Examples: query_submitted, autocomplete_clicked, result_opened, zero_results_shown.",
    why:
      "Search is one of the clearest signals of intent, so it matters for analytics, content demand, and search-quality improvement.",
  },
  {
    key: "qoe",
    emoji: "📡",
    label: "QoE",
    category: "Producer",
    color: C.red,
    summary: "Playback health rather than user intent.",
    detail:
      "QoE means quality-of-experience telemetry. It tracks whether the stream felt smooth or degraded on the device and network.",
    examples:
      "Examples: startup_delay_ms, rebuffer_started, bitrate_drop, device_error_code, dropped_frames.",
    why:
      "QoE streams let teams detect and explain bad viewing experiences quickly, often on sub-minute freshness targets.",
  },
  {
    key: "cdc",
    emoji: "🧬",
    label: "CDC",
    category: "Producer",
    color: C.red,
    summary: "Operational business-state changes.",
    detail:
      "CDC stands for change data capture. It brings operational database updates into the platform so behavior can be analyzed with business context.",
    examples:
      "Examples: subscription_plan_changed, profile_created, title_metadata_updated, entitlement_changed.",
    why:
      "Without CDC, downstream consumers only see behavior and miss the changing business state around that behavior.",
  },
] as const;

const PLATFORM_STEPS: readonly DetailItem[] = [
  {
    key: "ingest",
    emoji: "📥",
    label: "Ingest",
    category: "Platform step",
    color: C.blue,
    summary: "Accept, validate, and route incoming data.",
    detail:
      "Ingestion is the front door. This is where events and CDC changes are accepted, checked, and safely entered into the shared data platform.",
    examples:
      "Examples: producer authentication, schema checks, timestamp normalization, durable handoff into the event backbone.",
    why:
      "If ingestion is weak, everything downstream becomes late, lossy, or untrustworthy.",
  },
  {
    key: "stream",
    emoji: "⚡",
    label: "Stream",
    category: "Platform step",
    color: C.blue,
    summary: "Compute fast facts in near real time.",
    detail:
      "Streaming turns raw input into live counters, alerts, trends, and online-serving updates for fast consumers.",
    examples:
      "Examples: QoE alert metrics, trending counters, fresh personalization features.",
    why:
      "Streaming is what serves consumers that cannot wait for hourly or daily processing.",
  },
  {
    key: "store",
    emoji: "🗂️",
    label: "Store",
    category: "Platform step",
    color: C.blue,
    summary: "Keep durable, replayable history.",
    detail:
      "Storage is the long-term system of record. Raw and curated history live here in a form that can be queried, replayed, and evolved over time.",
    examples:
      "Examples: raw append-only history, curated analytical tables, long-retention partitions.",
    why:
      "Durable history is what makes analytics, training, audits, and backfills possible.",
  },
  {
    key: "query",
    emoji: "🔎",
    label: "Query",
    category: "Platform step",
    color: C.blue,
    summary: "Answer product and business questions.",
    detail:
      "Query is where humans and systems read answers out of the platform, from dashboards to analytical SQL.",
    examples:
      "Examples: ad hoc SQL, experiment reads, funnel analysis, consumer-facing aggregates.",
    why:
      "A platform matters only if teams can ask useful questions of it reliably.",
  },
  {
    key: "recover",
    emoji: "🔁",
    label: "Recover",
    category: "Platform step",
    color: C.blue,
    summary: "Replay, repair, and restore correctness.",
    detail:
      "Recovery is how the platform corrects late data, broken jobs, or bad releases without giving up trust in the results.",
    examples:
      "Examples: replay from the log, rerun a correction job, rebuild a curated dataset after a bad release.",
    why:
      "Data systems must do more than survive incidents; they must restore correctness afterward.",
  },
] as const;

const CONSUMERS: readonly DetailItem[] = [
  {
    key: "qoe-alerts",
    emoji: "🚨",
    label: "QoE alerts",
    category: "Consumer",
    color: C.green,
    summary: "Operational detection of bad viewing quality.",
    detail:
      "QoE alerting consumers watch fresh windows for degraded viewing experience and operational spikes.",
    examples:
      "Examples: sudden rebuffer spikes, startup-delay regressions, device-specific playback failures.",
    why:
      "These consumers justify the fastest freshness targets in the opening conversation.",
  },
  {
    key: "trending",
    emoji: "🔥",
    label: "Trending",
    category: "Consumer",
    color: C.green,
    summary: "Fast popularity movement.",
    detail:
      "Trending consumers want to know what is suddenly becoming popular so the product or dashboards can reflect that quickly.",
    examples:
      "Examples: top titles right now, fastest-rising content, region-specific popularity changes.",
    why:
      "Trending shows why the platform needs a fast path that is fresher than traditional BI.",
  },
  {
    key: "online-recs",
    emoji: "🎯",
    label: "Online recs",
    category: "Consumer",
    color: C.green,
    summary: "Fresh signals with very low serving latency.",
    detail:
      "Online recommendation consumers use recent behavior to power personalization in user-facing product flows.",
    examples:
      "Examples: recent watch intent, fresh affinities, latest engagement counters used by row ranking or feature reads.",
    why:
      "This is the best example of why freshness and serving latency are separate requirements.",
  },
  {
    key: "analytics",
    emoji: "📊",
    label: "Analytics",
    category: "Consumer",
    color: C.green,
    summary: "Broad product understanding over time.",
    detail:
      "Analytics consumers want trustworthy historical data for understanding product behavior rather than instant reads.",
    examples:
      "Examples: retention, funnels, content performance, A/B test reads, watch-hour analysis.",
    why:
      "Analytics proves the platform cannot be only a streaming system; it also needs durable history and rich queryability.",
  },
  {
    key: "training",
    emoji: "🧠",
    label: "Training",
    category: "Consumer",
    color: C.green,
    summary: "Offline ML datasets and snapshots.",
    detail:
      "Training consumers build or refresh offline datasets for recommendation and other ML workflows.",
    examples:
      "Examples: recommendation training snapshots, feature backfills, historical label generation.",
    why:
      "Training is the clean reason to state hourly or daily freshness without pretending everything is live.",
  },
  {
    key: "finance",
    emoji: "🧾",
    label: "Finance",
    category: "Consumer",
    color: C.green,
    summary: "Correctness and auditability first.",
    detail:
      "Finance and regulatory consumers optimize for reconciliation, auditability, and correctness over raw speed.",
    examples:
      "Examples: T+1 reporting, reconciled revenue views, regulated reporting outputs.",
    why:
      "Finance is the clearest example that not all consumers should be forced into the same real-time target.",
  },
] as const;

const REQUIREMENTS: readonly DetailItem[] = [
  {
    key: "req-ingest",
    emoji: "📥",
    label: "Ingest events + CDC",
    category: "Requirement",
    color: C.amber,
    summary: "Behavior plus business context together.",
    detail:
      "The platform must ingest both member actions and operational changes so downstream teams can combine behavior with business context.",
    examples:
      "Examples: playback events, browse/search actions, QoE telemetry, subscription changes, content metadata updates.",
    why:
      "This keeps the design from splitting into disconnected event-only and database-only systems.",
  },
  {
    key: "req-fast-batch",
    emoji: "⚡",
    label: "Support fast + batch consumers",
    category: "Requirement",
    color: C.amber,
    summary: "One platform, different time horizons.",
    detail:
      "The same platform must serve near-real-time consumers and slower historical consumers without becoming two unrelated designs.",
    examples:
      "Examples: sub-minute QoE alerting and daily training outputs from the same platform story.",
    why:
      "This is the main reason the interview problem is a platform problem, not just a streaming pipeline.",
  },
  {
    key: "req-history",
    emoji: "🗂️",
    label: "Keep durable history",
    category: "Requirement",
    color: C.amber,
    summary: "Cheap, queryable, evolvable retention.",
    detail:
      "Raw and curated history should remain affordable to retain, easy to query, and able to evolve as schemas and consumers change.",
    examples:
      "Examples: long-retention raw events, curated tables, replayable historical partitions.",
    why:
      "Without durable history, the platform cannot support analytics, training, audits, or recovery.",
  },
  {
    key: "req-durability",
    emoji: "🛡️",
    label: "Protect accepted data",
    category: "Requirement",
    color: C.amber,
    summary: "Loss hurts more than small delay.",
    detail:
      "Once the platform accepts an event, losing it is usually worse than being a little late. Durability leads the opening tradeoff discussion.",
    examples:
      "Examples: accepted events survive worker failure, broker failure, and common recovery scenarios.",
    why:
      "This is a senior data-platform judgment call: small latency slips are often cheaper than data loss.",
  },
  {
    key: "req-cost",
    emoji: "💸",
    label: "Stay cost-aware",
    category: "Requirement",
    color: C.amber,
    summary: "Shape storage by workload.",
    detail:
      "A platform at this scale cannot assume every layer is premium low-latency infrastructure. Cost-aware storage and shared tooling are part of the design from the start.",
    examples:
      "Examples: object storage for history, specialized fast stores only where necessary, shared platform services.",
    why:
      "Cost is not just a later optimization; it changes what architecture is feasible.",
  },
  {
    key: "req-schema",
    emoji: "📐",
    label: "Govern schemas",
    category: "Requirement",
    color: C.amber,
    summary: "Trust through strong contracts.",
    detail:
      "Events need strong contracts so downstream consumers do not silently break when producers change meanings, fields, or timestamps.",
    examples:
      "Examples: schema registration, compatibility checks, blocking breaking changes before production.",
    why:
      "At platform scale, trust collapses quickly if schema discipline is weak.",
  },
] as const;

const FRESHNESS = [
  { label: "QoE alerting", freshness: "30-60s", width: "18%", color: C.red, emoji: "🚨" },
  { label: "Trending titles", freshness: "1-2m", width: "28%", color: C.amber, emoji: "🔥" },
  { label: "Online recs", freshness: "<1m", width: "22%", color: C.blue, emoji: "🎯" },
  { label: "Analytics", freshness: "15-60m", width: "70%", color: C.green, emoji: "📊" },
  { label: "Training", freshness: "hourly/daily", width: "86%", color: C.gold, emoji: "🧠" },
  { label: "Finance", freshness: "T+1", width: "96%", color: C.violet, emoji: "🧾" },
] as const;

const IN_SCOPE = [
  "playback, browse, search, impression, click, QoE telemetry",
  "real-time monitoring and personalization signals",
  "historical analytics and recommendation training data",
  "CDC from operational stores",
] as const;

const OUT_OF_SCOPE = [
  "video encoding",
  "Open Connect internals",
  "payment processing internals",
  "recommendation model design",
] as const;

function Box({
  id,
  eyebrow,
  title,
  subtitle,
  color,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[28px] p-6" style={{ background: C.card, border: `1px solid ${color}1f` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color }}>
        {eyebrow}
      </p>
      <h2 className="mt-3 text-[1.8rem] font-semibold tracking-[-0.04em] leading-[1.02]" style={{ color: C.text }}>
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-7" style={{ color: C.muted }}>
        {subtitle}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function RichTooltip({
  item,
  placement = "bottom",
}: {
  item: DetailItem;
  placement?: TooltipPlacement;
}) {
  const placementClassName =
    placement === "right"
      ? "left-full top-1/2 ml-4 -translate-y-1/2"
      : placement === "left"
        ? "right-full top-1/2 mr-4 -translate-y-1/2"
        : "left-1/2 top-full mt-3 -translate-x-1/2";

  return (
    <div
      className={`pointer-events-none absolute z-30 w-[22rem] rounded-[22px] px-4 py-4 opacity-0 shadow-[0_24px_60px_rgba(0,0,0,0.38)] transition-all duration-150 group-hover:opacity-100 ${placementClassName}`}
      style={{ background: "color-mix(in srgb, var(--bg-card) 97%, black)", border: `1px solid ${item.color}30` }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-xl" style={{ background: `${item.color}16` }}>
          {item.emoji}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: item.color }}>
            {item.category}
          </p>
          <p className="text-sm font-semibold" style={{ color: C.text }}>
            {item.label}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-5" style={{ color: C.muted }}>
        {item.detail}
      </p>
      <p className="mt-3 text-[11px] leading-5" style={{ color: C.faint }}>
        {item.examples}
      </p>
      <p className="mt-3 text-[11px] leading-5" style={{ color: C.muted }}>
        {item.why}
      </p>
    </div>
  );
}

function HoverItem({
  item,
  compact = false,
  simple = false,
  placement = "bottom",
}: {
  item: DetailItem;
  compact?: boolean;
  simple?: boolean;
  placement?: TooltipPlacement;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="group relative block w-full cursor-pointer">
      <motion.div
        whileHover={reduceMotion ? undefined : { y: -3 }}
        className={compact ? "w-full rounded-[18px] px-4 py-3 cursor-pointer" : simple ? "w-full rounded-[18px] px-4 py-3.5 cursor-pointer" : "rounded-[20px] p-4 cursor-pointer"}
        style={{ background: C.card2, border: `1px solid ${item.color}24` }}
      >
        {compact ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg">{item.emoji}</span>
            <span className="text-sm font-semibold" style={{ color: C.text }}>
              {item.label}
            </span>
          </div>
        ) : simple ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg" style={{ background: `${item.color}16` }}>
              {item.emoji}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: C.text }}>
                {item.label}
              </p>
              <p className="mt-1 text-[12px] leading-5" style={{ color: C.faint }}>
                {item.summary}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl" style={{ background: `${item.color}16` }}>
              {item.emoji}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: C.text }}>
                {item.label}
              </p>
              <p className="mt-1 text-sm leading-6" style={{ color: C.muted }}>
                {item.summary}
              </p>
            </div>
          </div>
        )}
      </motion.div>
      <RichTooltip item={item} placement={placement} />
    </div>
  );
}

export default function StartHereDesktopExperience() {
  return (
    <div className="space-y-6">
      <div className="xl:hidden rounded-[24px] p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h2 className="text-2xl font-semibold tracking-[-0.04em]" style={{ color: C.text }}>
          Start with the platform shape.
        </h2>
      </div>

      <div className="hidden xl:block">
        <div className="space-y-6">
          <Box
            id="platform-mission"
            eyebrow="Start here"
            title="Design the shared data platform"
            subtitle="Keep the opening light: what data comes in, what the platform does, and who it serves."
            color={C.red}
          >
            <div className="space-y-5">
              <div
                data-testid="platform-mission-visual"
                className="rounded-[24px] p-6"
                style={{
                  background:
                    "radial-gradient(circle at top, rgba(56,189,248,0.08), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
                  border: `1px solid ${C.border}`,
                }}
              >
                <div className="grid grid-cols-[minmax(0,240px)_56px_minmax(320px,1fr)_56px_minmax(0,240px)] items-center gap-5 2xl:grid-cols-[minmax(0,260px)_72px_minmax(360px,1fr)_72px_minmax(0,260px)]">
                  <div>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: C.red }}>
                      Producers
                    </p>
                    <div data-testid="hero-producers-grid" className="grid gap-3">
                      {PRODUCERS.map((item) => (
                        <HoverItem key={item.key} item={item} compact placement="right" />
                      ))}
                    </div>
                  </div>

                  <div data-testid="hero-arrow-left" className="flex items-center justify-center">
                    <div className="flex w-full items-center gap-2">
                      <div className="h-px flex-1" style={{ background: `${C.red}55` }} />
                      <span className="text-2xl" style={{ color: C.red }}>
                        →
                      </span>
                    </div>
                  </div>

                  <div data-testid="hero-platform-card" className="rounded-[24px] p-6 text-center" style={{ background: C.card2, border: `1px solid ${C.blue}24` }}>
                    <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[24px] text-4xl" style={{ background: `${C.blue}14` }}>
                      🧠
                    </div>
                    <p className="mt-4 text-2xl font-semibold tracking-[-0.04em]" style={{ color: C.text }}>
                      Shared data platform
                    </p>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6" style={{ color: C.muted }}>
                      Accept event streams and CDC once, then shape them into both fast and historical data products.
                    </p>
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      {PLATFORM_STEPS.map((item) => (
                        <HoverItem key={item.key} item={item} compact />
                      ))}
                    </div>
                  </div>

                  <div data-testid="hero-arrow-right" className="flex items-center justify-center">
                    <div className="flex w-full items-center gap-2">
                      <span className="text-2xl" style={{ color: C.red }}>
                        →
                      </span>
                      <div className="h-px flex-1" style={{ background: `${C.red}55` }} />
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: C.green }}>
                      Consumers
                    </p>
                    <div data-testid="hero-consumers-grid" className="grid gap-3">
                      {CONSUMERS.slice(0, 5).map((item) => (
                        <HoverItem key={item.key} item={item} compact placement="left" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] px-5 py-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                <p className="text-sm leading-7" style={{ color: C.muted }}>
                  {OPENING_LINE}
                </p>
              </div>
            </div>
          </Box>

          <Box
            id="requirements-snapshot"
            eyebrow="Requirements"
            title="Keep the requirements light"
            subtitle="Use these as a quick checklist. Hover for the exact meaning and examples."
            color={C.amber}
          >
            <div className="grid gap-3 xl:grid-cols-2">
              {REQUIREMENTS.map((item, index) => (
                <HoverItem
                  key={item.key}
                  item={item}
                  simple
                  placement={index % 2 === 0 ? "right" : "left"}
                />
              ))}
            </div>
          </Box>

          <Box
            id="scope-boundary"
            eyebrow="Scope"
            title="Go deep on one clean slice"
            subtitle="Member interaction data is the main design. The rest stays extension-only."
            color={C.green}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[22px] p-5" style={{ background: C.card2, border: `1px solid ${C.green}20` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: C.green }}>
                  In scope
                </p>
                <div className="mt-4 space-y-3">
                  {IN_SCOPE.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full shrink-0" style={{ background: C.green }} />
                      <p className="text-sm leading-6" style={{ color: C.muted }}>
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[22px] p-5" style={{ background: C.card2, border: `1px solid ${C.red}20` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: C.red }}>
                  Mention only
                </p>
                <div className="mt-4 space-y-3">
                  {OUT_OF_SCOPE.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full shrink-0" style={{ background: C.red }} />
                      <p className="text-sm leading-6" style={{ color: C.muted }}>
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Box>

          <Box
            id="freshness-map"
            eyebrow="Freshness"
            title="Real-time needs numbers"
            subtitle="Different consumers need very different freshness targets."
            color={C.gold}
          >
            <div className="rounded-[22px] p-5" style={{ background: C.card2, border: `1px solid ${C.gold}20` }}>
              <div className="space-y-3">
                {FRESHNESS.map((row) => (
                  <div key={row.label} className="grid grid-cols-[120px_1fr_86px] items-center gap-3">
                    <div className="text-sm font-semibold" style={{ color: C.text }}>
                      <span className="mr-2">{row.emoji}</span>
                      {row.label}
                    </div>
                    <div className="h-3 rounded-full" style={{ background: "rgba(148,163,184,0.14)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: row.width }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 0.45 }}
                        className="h-3 rounded-full"
                        style={{ background: row.color }}
                      />
                    </div>
                    <div className="text-right text-[12px] font-semibold" style={{ color: C.faint }}>
                      {row.freshness}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Box>

          <Box
            id="handoff"
            eyebrow="Next"
            title="Short handoff"
            subtitle="One line is enough before estimation."
            color={C.blue}
          >
            <div className="rounded-[22px] p-5 min-h-[120px]" style={{ background: C.card2, border: `1px solid ${C.blue}20` }}>
              <p className="text-sm leading-7" style={{ color: C.muted }}>
                &ldquo;We have the platform boundary, the main consumers, the requirement shape, and the freshness targets. Next I would size the scale before drawing detailed architecture.&rdquo;
              </p>
            </div>
          </Box>
        </div>
      </div>
    </div>
  );
}
