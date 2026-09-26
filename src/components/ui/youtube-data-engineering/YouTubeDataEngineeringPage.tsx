"use client";

import {
  REQUIREMENT_CAPABILITIES,
  YOUTUBE_SCALE_ANCHORS,
  YOUTUBE_SLOS,
} from "./content";
import { START_SECTIONS } from "./data";
import { Section, SectionInspector, YouTubeFrame } from "./shared";

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
    tone: "#1d4ed8",
    titles: ["Ingestion", "Views", "Watch Time"],
  },
  {
    label: "Decide",
    note: "Turn fresh signals into product decisions",
    tone: "#6d28d9",
    titles: ["Trending", "Recommendations", "Experiments"],
  },
  {
    label: "Operate",
    note: "Serve creators, revenue, and trust",
    tone: "#077149",
    titles: ["Creator Studio", "Monetization", "Trust"],
  },
] as const;

function MiniNode({
  icon,
  title,
  tone,
}: {
  icon: string;
  title: string;
  detail: string;
  tone: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <div
      className="relative flex min-h-[58px] items-center gap-2 rounded-lg border bg-[var(--bg-card)] px-3 text-left text-xs font-semibold"
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
    </div>
  );
}

function ScopeFlow() {
  return (
    <div className="mt-5">
      <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4 lg:grid-cols-[1fr_auto_1.25fr_auto_1fr] lg:items-center">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#1d4ed8]">
            Signals in
          </p>
          <div className="grid gap-2">
            {scopeSources.map(([icon, title, detail], index) => (
              <MiniNode
                key={title}
                icon={icon}
                title={title}
                detail={detail}
                tone="#1d4ed8"
                align={index === 0 ? "start" : "center"}
              />
            ))}
          </div>
        </div>

        <span className="hidden text-[#b00020] lg:block">→</span>

        <div
          className="relative rounded-xl border border-red-500/35 bg-red-500/[.05] p-5 text-center"
        >
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-xl font-bold text-[#b00020]">
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
        </div>

        <span className="hidden text-[#b00020] lg:block">→</span>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#077149]">
            Products out
          </p>
          <div className="grid gap-2">
            {scopeOutputs.map(([icon, title, detail], index) => (
              <MiniNode
                key={title}
                icon={icon}
                title={title}
                detail={detail}
                tone="#077149"
                align={index === 0 ? "end" : "center"}
              />
            ))}
          </div>
        </div>
      </div>

      <SectionInspector
        id="scope-inspector"
        label="scope"
        items={[
          ...scopeSources.map(([, title, detail]) => ({ id: `source-${title}`, title, summary: "Signal source", detail })),
          { id: "platform", title: "YouTube Data Platform", summary: "Ingest · process · store · serve · govern", detail: "Turns high-volume YouTube behavior and business events into fresh signals, replayable history, certified metrics, and recommendation data." },
          ...scopeOutputs.map(([, title, detail]) => ({ id: `output-${title}`, title, summary: "Data product", detail })),
        ]}
      />

      <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/[.05] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#b00020]">
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
                {items.map((item) =>
                  item ? (
                    <div
                      key={item.title}
                      className="relative min-h-[86px] overflow-visible rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-left"
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
                      </span>
                      <span
                        className="absolute inset-x-3 bottom-0 h-0.5 rounded-full"
                        style={{ background: item.tone }}
                      />
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          </div>
        );
      })}
      <SectionInspector
        id="capabilities-inspector"
        label="capability"
        items={REQUIREMENT_CAPABILITIES.map((item) => ({ id: item.title, title: item.title, summary: item.sub, detail: item.detail }))}
      />
    </div>
  );
}

function PlatformFlow() {
  return (
    <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
      <div className="grid gap-3 xl:grid-cols-[190px_auto_150px_auto_1fr] xl:items-center">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#1d4ed8]">
            YouTube signals
          </p>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
            {inputSignals.map(([icon, title, detail], index) => (
              <MiniNode
                key={title}
                icon={icon}
                title={title}
                detail={detail}
                tone="#1d4ed8"
                align={index === 0 ? "start" : "center"}
              />
            ))}
          </div>
        </div>

        <span className="hidden text-[#b00020] xl:block">→</span>

        <div className="grid gap-2">
          <MiniNode
            icon="G"
            title="Event Gateway"
            detail="Authenticates, checks consent, validates the schema, adds trusted ingest metadata, and sends rejected events to a DLQ."
            tone="#8a4b00"
          />
          <MiniNode
            icon="K"
            title="Kafka"
            detail="A durable, replayable log separates producers from stream processing, raw lake ingestion, fraud detection, and feature consumers."
            tone="#8a4b00"
          />
        </div>

        <span className="hidden text-[#b00020] xl:block">⇉</span>

        <div className="grid gap-2">
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/[.045] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#6d28d9]">
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
                    tone="#6d28d9"
                    align={index === liveNodes.length - 1 ? "end" : "center"}
                  />
                  {index < liveNodes.length - 1 ? (
                    <span className="hidden text-[#6d28d9] sm:block">→</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[.045] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#077149]">
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
                    tone="#077149"
                    align={index === truthNodes.length - 1 ? "end" : "center"}
                  />
                  {index < truthNodes.length - 1 ? (
                    <span className="hidden text-[#077149] sm:block">→</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-dashed border-cyan-500/35 bg-cyan-500/[.035] px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[.13em] text-[#0b6f87]">
        Governance · quality · lineage · security · metric versions · replay
      </div>

      <p className="mt-3 border-l-4 border-[#b00020] bg-red-500/[.04] px-4 py-3 text-sm font-medium leading-6">
        “Playback and business events enter one replayable platform. Streaming serves freshness-sensitive products, while Iceberg and batch jobs publish certified data for creators, recommendations, monetization, experiments, and backfills.”
      </p>
      <SectionInspector
        id="platform-inspector"
        label="platform step"
        items={[
          ...inputSignals.map(([, title, detail]) => ({ id: `signal-${title}`, title, summary: "Producer signal", detail })),
          { id: "gateway", title: "Event Gateway", summary: "Trust boundary", detail: "Authenticates requests, checks consent, validates schemas, adds trusted ingest metadata, and sends rejected events to a replayable DLQ." },
          { id: "kafka", title: "Kafka", summary: "Durable event backbone", detail: "Separates producers from stream processing, lake ingestion, fraud detection, and feature consumers while retaining replayable ordered partitions." },
          ...liveNodes.map(([, title, detail]) => ({ id: `live-${title}`, title, summary: "Fast path", detail })),
          ...truthNodes.map(([, title, detail]) => ({ id: `truth-${title}`, title, summary: "Certification path", detail })),
        ]}
      />
    </div>
  );
}

function ScaleTargets() {
  return (
    <div className="mt-5">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {YOUTUBE_SCALE_ANCHORS.map((item) => (
          <div
            key={item.label}
            className="relative rounded-xl border bg-[var(--bg-muted)] p-3 text-left"
            style={{ borderColor: `${item.tone}44` }}
          >
            <strong className="text-xl" style={{ color: item.tone }}>{item.value}</strong>
            <span className="mt-1 block text-xs font-semibold">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
        <div className="space-y-3">
          {YOUTUBE_SLOS.map((row) => (
            <div
              key={row.title}
              className="relative grid w-full grid-cols-[120px_1fr_88px] items-center gap-3 text-left sm:grid-cols-[170px_1fr_110px]"
            >
              <span className="text-xs font-semibold sm:text-sm">{row.title}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-[var(--border)]">
                <span className="block h-full rounded-full" style={{ width: row.width, background: row.tone }} />
              </span>
              <strong className="text-right text-xs" style={{ color: row.tone }}>{row.value}</strong>
            </div>
          ))}
        </div>
      </div>
      <SectionInspector
        id="scale-inspector"
        label="scale target"
        items={[
          ...YOUTUBE_SCALE_ANCHORS.map((item) => ({ id: `scale-${item.label}`, title: `${item.value} ${item.label}`, detail: item.detail })),
          ...YOUTUBE_SLOS.map((item) => ({ id: `slo-${item.title}`, title: item.title, summary: item.value, detail: item.detail })),
        ]}
      />
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
        <MiniNode icon="▶" title="Client Events" detail="Playback, impression, engagement, search, QoE, and ad events arrive with stable event identity and event time." tone="#1d4ed8" align="start" />
        <span className="hidden text-[#b00020] lg:block">→</span>
        <MiniNode
          icon="K"
          title="Kafka + Bronze"
          detail="Kafka is the durable hot event log for fan-out and short-term replay. Every accepted event is also copied unchanged into Bronze object storage, which becomes the long-term evidence for audits, full reprocessing, and corrections."
          tone="#8a4b00"
        />
        <span className="hidden text-[#b00020] lg:block">⇉</span>
        <div className="grid gap-2">
          <div
            className="relative grid gap-2 rounded-xl border border-violet-500/30 bg-violet-500/[.045] p-3 sm:grid-cols-[110px_auto_1fr_auto_120px] sm:items-center"
          >
            <strong className="flex items-center gap-2 text-xs text-[#6d28d9]">
              FAST LANE <span className="text-[10px]" aria-hidden>ⓘ</span>
            </strong>
            <span className="hidden text-[#6d28d9] sm:block">→</span>
            <span className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3 text-xs font-semibold">Window + bounded dedupe</span>
            <span className="hidden text-[#6d28d9] sm:block">→</span>
            <span className="rounded-full bg-violet-500/10 px-3 py-2 text-center text-[10px] font-bold text-[#6d28d9]">PROVISIONAL</span>
          </div>
          <div
            className="relative grid gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[.045] p-3 sm:grid-cols-[110px_auto_1fr_auto_120px] sm:items-center"
          >
            <strong className="flex items-center gap-2 text-xs text-[#077149]">
              CERTIFY LANE <span className="text-[10px]" aria-hidden>ⓘ</span>
            </strong>
            <span className="hidden text-[#077149] sm:block">→</span>
            <span className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3 text-xs font-semibold">Full replay + quality gates</span>
            <span className="hidden text-[#077149] sm:block">→</span>
            <span className="rounded-full bg-emerald-500/10 px-3 py-2 text-center text-[10px] font-bold text-[#077149]">CERTIFIED</span>
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
            tone="#0b6f87"
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
            tone="#077149"
            align={index === 0 ? "start" : index === reconciliation.length - 1 ? "end" : "center"}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
        <span className="rounded-md border border-violet-500/30 bg-violet-500/[.05] px-3 py-2">Live views · trending · alerts</span>
        <span className="text-[#b00020]">corrected by</span>
        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/[.05] px-3 py-2">Official views · watch time · revenue</span>
      </div>
      <SectionInspector
        id="correctness-inspector"
        label="correctness step"
        items={[
          { id: "client-events", title: "Client Events", summary: "Evidence enters", detail: "Playback, impression, engagement, search, QoE, and ad events arrive with stable event identity and event time." },
          { id: "kafka-bronze", title: "Kafka + Bronze", summary: "Hot log + durable evidence", detail: "Kafka provides fan-out and short-term replay; Bronze keeps every accepted event unchanged for long-term audit, full reprocessing, and corrections." },
          { id: "fast-lane", title: "Fast Lane", summary: "Seconds to minutes · provisional", detail: "Consumes Kafka continuously, uses event-time windows and bounded deduplication, then publishes responsive results that late events or later fraud decisions may still change." },
          { id: "certify-lane", title: "Certify Lane", summary: "Complete replay · certified", detail: "Replays complete Bronze history, performs full deduplication, applies traffic-quality and metric-version rules, and atomically publishes certified views, watch time, and revenue." },
          ...checks.map(([, title, detail]) => ({ id: `check-${title}`, title, summary: "Correctness control", detail })),
          ...reconciliation.map(([, title, detail]) => ({ id: `reconcile-${title}`, title, summary: "Reconciliation", detail })),
        ]}
      />
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
