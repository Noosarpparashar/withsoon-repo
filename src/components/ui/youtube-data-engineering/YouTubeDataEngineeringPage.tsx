"use client";

import {
  REQUIREMENT_CAPABILITIES,
  YOUTUBE_SCALE_ANCHORS,
  YOUTUBE_SLOS,
} from "./content";
import { START_SECTIONS } from "./data";
import { Section, Tooltip, YouTubeFrame } from "./shared";

const inputSignals = [
  ["▶", "Playback", "Starts, heartbeats, pauses, seeks, completions, and QoE signals describe the viewing session."],
  ["♡", "Engagement", "Likes, comments, shares, subscriptions, and saves capture explicit audience response."],
  ["⌕", "Discovery", "Searches, impressions, clicks, surfaces, and ranking context explain how a viewer found the video."],
  ["$", "Ads", "Requests, impressions, clicks, skips, completes, and attribution evidence support monetization."],
] as const;

const scopeSources = [
  ["▶", "Playback", "Viewing attempts, heartbeats, completion, buffering, and playback-quality signals."],
  ["⌕", "Discovery", "Searches, impressions, clicks, recommendation surfaces, and ranking context."],
  ["$", "Business", "Engagement, ads, subscriptions, creator actions, content metadata, and operational CDC."],
] as const;

const scopeOutputs = [
  ["↗", "Live Products", "Live view counts, trending videos, QoE alerts, fraud signals, and fresh recommendation features."],
  ["▥", "Creator + BI", "Views, watch time, retention, subscribers, traffic sources, and experiment scorecards."],
  ["✓", "Trusted Facts", "Certified views, monetization, revenue attribution, governed training data, and replayable history."],
] as const;

const interviewScript =
  "I’d design YouTube’s analytics and data platform. Playback, engagement, search, impression, ad, and backend events enter a durable Kafka backbone. Streaming jobs serve freshness-sensitive products such as live views, trending, QoE alerts, and online features. The same events land in an Iceberg lakehouse, where batch jobs validate, deduplicate, reconcile late data, and publish certified Silver and Gold products for Creator Studio, recommendations, experiments, monetization, BI, and backfills—with governance and quality around every layer.";

const liveNodes = [
  ["ϟ", "Flink", "Event-time jobs validate, deduplicate within bounded windows, sessionize playback, and update fresh aggregates."],
  ["↗", "Live Products", "Live views, trending, QoE alerts, fraud signals, and online recommendation features consume provisional results."],
] as const;

const truthNodes = [
  ["◇", "Bronze Iceberg", "Every accepted event lands in immutable, partitioned object storage for replay, audit, and correction."],
  ["⚙", "Spark / dbt", "Batch jobs include late events, apply full deduplication and traffic-quality policy, and rebuild metric versions."],
  ["✓", "Silver / Gold", "Clean events and certified aggregates publish through versioned snapshots and quality gates."],
  ["▥", "Data Products", "Creator Studio, BI, recommendations, experiments, ads, and finance consume fit-for-purpose outputs."],
] as const;

const reconciliation = [
  ["1", "Compare", "Compare stream aggregates with batch-certified partitions by metric version, date, region, and video."],
  ["2", "Explain", "Attribute differences to late arrivals, duplicate retries, malformed sessions, identity changes, or invalid traffic."],
  ["3", "Publish", "Atomically replace the official Gold snapshot only after completeness, quality, and reconciliation gates pass."],
  ["4", "Correct", "Propagate the certified version to public counts, Creator Studio, monetization, and downstream training data."],
] as const;

const capabilityGroups = [
  {
    label: "Measure",
    note: "Collect and qualify audience behavior",
    tone: "#2563eb",
    titles: ["Ingestion", "Views", "Watch Time"],
  },
  {
    label: "Decide",
    note: "Turn fresh signals into product decisions",
    tone: "#7c3aed",
    titles: ["Trending", "Recommendations", "Experiments"],
  },
  {
    label: "Operate",
    note: "Serve creators, revenue, and trust",
    tone: "#16a34a",
    titles: ["Creator Studio", "Monetization", "Trust"],
  },
] as const;

function MiniNode({
  icon,
  title,
  detail,
  tone,
  align = "center",
}: {
  icon: string;
  title: string;
  detail: string;
  tone: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <button
      type="button"
      className="group relative flex min-h-[58px] cursor-pointer items-center gap-2 rounded-lg border bg-[var(--bg-card)] px-3 text-left text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0033]"
      style={{ borderColor: `${tone}44` }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-bold"
        style={{
          color: tone,
          background: `color-mix(in srgb, ${tone} 12%, var(--bg-card))`,
        }}
      >
        {icon}
      </span>
      <span>{title}</span>
      <span className="ml-auto text-[10px]" style={{ color: tone }} aria-hidden>
        ⓘ
      </span>
      <Tooltip align={align}>{detail}</Tooltip>
    </button>
  );
}

function ScopeFlow() {
  return (
    <div className="mt-5">
      <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4 lg:grid-cols-[1fr_auto_1.25fr_auto_1fr] lg:items-center">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">
            Signals in
          </p>
          <div className="grid gap-2">
            {scopeSources.map(([icon, title, detail], index) => (
              <MiniNode
                key={title}
                icon={icon}
                title={title}
                detail={detail}
                tone="#2563eb"
                align={index === 0 ? "start" : "center"}
              />
            ))}
          </div>
        </div>

        <span className="hidden text-[#ff0033] lg:block">→</span>

        <button
          type="button"
          className="group relative rounded-xl border border-red-500/35 bg-red-500/[.05] p-5 text-center transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0033]"
        >
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-xl font-bold text-[#ff0033]">
            YT
          </span>
          <h3 className="mt-3 text-lg font-semibold">YouTube Data Platform</h3>
          <p className="mt-1 text-xs text-[var(--text-faint)]">
            Analytics · ML data · monetization
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["Ingest", "Process", "Store", "Serve", "Govern"].map((item) => (
              <span key={item} className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-2 text-xs">
                {item}
              </span>
            ))}
          </div>
          <Tooltip>
            The platform turns high-volume YouTube behavior and business events into fresh signals, replayable history, certified metrics, and recommendation data.
          </Tooltip>
        </button>

        <span className="hidden text-[#ff0033] lg:block">→</span>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-600">
            Products out
          </p>
          <div className="grid gap-2">
            {scopeOutputs.map(([icon, title, detail], index) => (
              <MiniNode
                key={title}
                icon={icon}
                title={title}
                detail={detail}
                tone="#16a34a"
                align={index === 0 ? "end" : "center"}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/[.05] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ff0033]">
          Interview Script
        </p>
        <p className="mt-2 text-sm font-medium leading-7">“{interviewScript}”</p>
      </div>
    </div>
  );
}

function CapabilitiesFlow() {
  return (
    <div className="mt-5 space-y-3">
      {capabilityGroups.map((group, groupIndex) => {
        const items = group.titles.map((title) =>
          REQUIREMENT_CAPABILITIES.find((item) => item.title === title),
        );

        return (
          <div
            key={group.label}
            className="overflow-visible rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3"
          >
            <div className="grid gap-3 lg:grid-cols-[170px_1fr] lg:items-stretch">
              <div
                className="flex items-center gap-3 rounded-lg border px-4 py-3 lg:flex-col lg:items-start lg:justify-center"
                style={{
                  borderColor: `${group.tone}3d`,
                  background: `linear-gradient(135deg, color-mix(in srgb, ${group.tone} 13%, var(--bg-card)), var(--bg-card))`,
                }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black"
                  style={{ color: group.tone, background: `${group.tone}1f` }}
                >
                  {String(groupIndex + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-base font-bold" style={{ color: group.tone }}>
                    {group.label}
                  </h3>
                  <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-faint)]">
                    {group.note}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {items.map((item, index) =>
                  item ? (
                    <button
                      type="button"
                      key={item.title}
                      className="group relative min-h-[86px] overflow-visible rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-left transition hover:-translate-y-0.5 hover:border-current hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0033]"
                      style={{ color: item.tone }}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black"
                          style={{ background: `${item.tone}1f` }}
                        >
                          {item.icon}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-[var(--text)]">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-[var(--text-faint)]">
                            {item.sub}
                          </span>
                        </span>
                        <span className="ml-auto self-start text-[10px]" aria-hidden>
                          ⓘ
                        </span>
                      </span>
                      <span
                        className="absolute inset-x-3 bottom-0 h-0.5 origin-left scale-x-0 rounded-full transition-transform group-hover:scale-x-100 group-focus-visible:scale-x-100"
                        style={{ background: item.tone }}
                      />
                      <Tooltip
                        align={index === 0 ? "start" : index === items.length - 1 ? "end" : "center"}
                      >
                        {item.detail}
                      </Tooltip>
                    </button>
                  ) : null,
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlatformFlow() {
  return (
    <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
      <div className="grid gap-3 xl:grid-cols-[190px_auto_150px_auto_1fr] xl:items-center">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">
            YouTube signals
          </p>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
            {inputSignals.map(([icon, title, detail], index) => (
              <MiniNode
                key={title}
                icon={icon}
                title={title}
                detail={detail}
                tone="#2563eb"
                align={index === 0 ? "start" : "center"}
              />
            ))}
          </div>
        </div>

        <span className="hidden text-[#ff0033] xl:block">→</span>

        <div className="grid gap-2">
          <MiniNode
            icon="G"
            title="Event Gateway"
            detail="Authenticates, checks consent, validates the schema, adds trusted ingest metadata, and sends rejected events to a DLQ."
            tone="#d97706"
          />
          <MiniNode
            icon="K"
            title="Kafka"
            detail="A durable, replayable log separates producers from stream processing, raw lake ingestion, fraud detection, and feature consumers."
            tone="#d97706"
          />
        </div>

        <span className="hidden text-[#ff0033] xl:block">⇉</span>

        <div className="grid gap-2">
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/[.045] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-violet-600">
                Fast path
              </p>
              <span className="text-[10px] text-[var(--text-faint)]">seconds → minutes</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              {liveNodes.map(([icon, title, detail], index) => (
                <div className="contents" key={title}>
                  <MiniNode
                    icon={icon}
                    title={title}
                    detail={detail}
                    tone="#7c3aed"
                    align={index === liveNodes.length - 1 ? "end" : "center"}
                  />
                  {index < liveNodes.length - 1 ? (
                    <span className="hidden text-violet-600 sm:block">→</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[.045] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-600">
                Truth path
              </p>
              <span className="text-[10px] text-[var(--text-faint)]">hourly → T+1</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-center">
              {truthNodes.map(([icon, title, detail], index) => (
                <div className="contents" key={title}>
                  <MiniNode
                    icon={icon}
                    title={title}
                    detail={detail}
                    tone="#16a34a"
                    align={index === truthNodes.length - 1 ? "end" : "center"}
                  />
                  {index < truthNodes.length - 1 ? (
                    <span className="hidden text-emerald-600 sm:block">→</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-dashed border-cyan-500/35 bg-cyan-500/[.035] px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[.13em] text-cyan-600">
        Governance · quality · lineage · security · metric versions · replay
      </div>

      <p className="mt-3 border-l-4 border-[#ff0033] bg-red-500/[.04] px-4 py-3 text-sm font-medium leading-6">
        “Playback and business events enter one replayable platform. Streaming serves freshness-sensitive products, while Iceberg and batch jobs publish certified data for creators, recommendations, monetization, experiments, and backfills.”
      </p>
    </div>
  );
}

function ScaleTargets() {
  return (
    <div className="mt-5">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {YOUTUBE_SCALE_ANCHORS.map((item, index) => (
          <button
            type="button"
            key={item.label}
            className="group relative rounded-xl border bg-[var(--bg-muted)] p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: `${item.tone}44` }}
          >
            <strong className="text-xl" style={{ color: item.tone }}>{item.value}</strong>
            <span className="mt-1 block text-xs font-semibold">{item.label}</span>
            <Tooltip align={index === 0 ? "start" : index === YOUTUBE_SCALE_ANCHORS.length - 1 ? "end" : "center"}>
              {item.detail}
            </Tooltip>
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
        <div className="space-y-3">
          {YOUTUBE_SLOS.map((row, index) => (
            <button
              type="button"
              key={row.title}
              className="group relative grid w-full grid-cols-[120px_1fr_88px] items-center gap-3 text-left sm:grid-cols-[170px_1fr_110px]"
            >
              <span className="text-xs font-semibold sm:text-sm">{row.title}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-[var(--border)]">
                <span className="block h-full rounded-full" style={{ width: row.width, background: row.tone }} />
              </span>
              <strong className="text-right text-xs" style={{ color: row.tone }}>{row.value}</strong>
              <Tooltip align={index === 0 ? "start" : "center"}>{row.detail}</Tooltip>
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-[var(--text-faint)]">
        Interview assumptions for sizing and trade-off discussion.
      </p>
    </div>
  );
}

function CorrectnessFlow() {
  const checks = [
    ["E", "Schema", "Reject malformed payloads and quarantine semantic violations before they corrupt shared metrics."],
    ["ID", "Identity", "Deduplicate by event_id and group playback using attempt, session, viewer, video, and policy-scoped identities."],
    ["◷", "Late Data", "Use event time in streaming, then include events beyond the watermark during bounded batch correction."],
    ["⚑", "Traffic Quality", "Apply replayable invalid-traffic and abuse decisions before certifying views or revenue."],
    ["vN", "Metric Policy", "Tie each result to the version of qualified_view, watch-time, attribution, and experiment semantics used."],
  ] as const;

  return (
    <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
      <div className="grid gap-2 lg:grid-cols-[140px_auto_140px_auto_1fr] lg:items-center">
        <MiniNode icon="▶" title="Client Events" detail="Playback, impression, engagement, search, QoE, and ad events arrive with stable event identity and event time." tone="#2563eb" align="start" />
        <span className="hidden text-[#ff0033] lg:block">→</span>
        <MiniNode
          icon="K"
          title="Kafka + Bronze"
          detail="Kafka is the durable hot event log for fan-out and short-term replay. Every accepted event is also copied unchanged into Bronze object storage, which becomes the long-term evidence for audits, full reprocessing, and corrections."
          tone="#d97706"
        />
        <span className="hidden text-[#ff0033] lg:block">⇉</span>
        <div className="grid gap-2">
          <div
            className="group relative grid cursor-pointer gap-2 rounded-xl border border-violet-500/30 bg-violet-500/[.045] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:grid-cols-[110px_auto_1fr_auto_120px] sm:items-center"
            tabIndex={0}
          >
            <strong className="flex items-center gap-2 text-xs text-violet-600">
              FAST LANE <span className="text-[10px]" aria-hidden>ⓘ</span>
            </strong>
            <span className="hidden text-violet-600 sm:block">→</span>
            <span className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3 text-xs font-semibold">Window + bounded dedupe</span>
            <span className="hidden text-violet-600 sm:block">→</span>
            <span className="rounded-full bg-violet-500/10 px-3 py-2 text-center text-[10px] font-bold text-violet-600">PROVISIONAL</span>
            <Tooltip align="end">
              Consumes Kafka continuously, uses event-time windows and bounded deduplication, then publishes seconds-to-minutes results. It favors freshness, so late events and later fraud decisions may still change the count.
            </Tooltip>
          </div>
          <div
            className="group relative grid cursor-pointer gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[.045] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:grid-cols-[110px_auto_1fr_auto_120px] sm:items-center"
            tabIndex={0}
          >
            <strong className="flex items-center gap-2 text-xs text-emerald-600">
              CERTIFY LANE <span className="text-[10px]" aria-hidden>ⓘ</span>
            </strong>
            <span className="hidden text-emerald-600 sm:block">→</span>
            <span className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3 text-xs font-semibold">Full replay + quality gates</span>
            <span className="hidden text-emerald-600 sm:block">→</span>
            <span className="rounded-full bg-emerald-500/10 px-3 py-2 text-center text-[10px] font-bold text-emerald-600">CERTIFIED</span>
            <Tooltip align="end">
              Replays complete Bronze history after the lateness window, performs full deduplication, applies traffic-quality and metric-version rules, and publishes an atomic certified snapshot for official views, watch time, and revenue.
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {checks.map(([icon, title, detail], index) => (
          <MiniNode
            key={title}
            icon={icon}
            title={title}
            detail={detail}
            tone="#0891b2"
            align={index === 0 ? "start" : index === checks.length - 1 ? "end" : "center"}
          />
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {reconciliation.map(([icon, title, detail], index) => (
          <MiniNode
            key={title}
            icon={icon}
            title={title}
            detail={detail}
            tone="#16a34a"
            align={index === 0 ? "start" : index === reconciliation.length - 1 ? "end" : "center"}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
        <span className="rounded-md border border-violet-500/30 bg-violet-500/[.05] px-3 py-2">Live views · trending · alerts</span>
        <span className="text-[#ff0033]">corrected by</span>
        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/[.05] px-3 py-2">Official views · watch time · revenue</span>
      </div>
    </div>
  );
}

export default function YouTubeDataEngineeringPage() {
  return (
    <YouTubeFrame
      activeTab="start-here"
      sections={START_SECTIONS}
      next={{ id: "requirements", label: "Requirements" }}
    >
      <Section id="scope" number="01" title="Scope">
        <ScopeFlow />
      </Section>

      <Section id="capabilities" number="02" title="Capabilities">
        <CapabilitiesFlow />
      </Section>

      <Section id="platform-flow" number="03" title="Platform Flow">
        <PlatformFlow />
      </Section>

      <Section id="scale-targets" number="04" title="Scale Targets">
        <ScaleTargets />
      </Section>

      <Section id="correctness-thesis" number="05" title="Correctness">
        <CorrectnessFlow />
      </Section>
    </YouTubeFrame>
  );
}
