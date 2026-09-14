"use client";

import { useState } from "react";
import { ARCHITECTURE_SECTIONS } from "./data";
import { Section, Tooltip, YouTubeFrame } from "./shared";

type ArchitectureNode = {
  id: string;
  label: string;
  layer: string;
  summary: string;
  decision: string;
  receives: string;
  produces: string;
  guarantee: string;
  tone: string;
};

const architectureNodes: Record<string, ArchitectureNode> = {
  players: {
    id: "players",
    label: "Player SDKs",
    layer: "Producer",
    summary: "YouTube players emit playback attempts, heartbeats, engagement, impressions, and client QoE from phones, browsers, TVs, consoles, and embeds.",
    decision: "Generate event_id before retry and preserve event_time during offline buffering so delivery failures do not change metric correctness.",
    receives: "Viewer actions, player state, playback position, device and network context",
    produces: "Versioned playback, engagement, impression, and QoE events",
    guarantee: "Stable IDs · source event time · consent context",
    tone: "#2563eb",
  },
  edge: {
    id: "edge",
    label: "YouTube Edge",
    layer: "Producer",
    summary: "CDN and media-delivery systems provide server-side evidence for segment requests, cache behavior, response errors, bytes, and latency.",
    decision: "Keep edge evidence separate from client telemetry, then join by trace, playback attempt, video, time, and coarse region to diagnose QoE.",
    receives: "Video segment and manifest requests from active players",
    produces: "Delivery logs, cache status, response codes, latency, and byte counts",
    guarantee: "Server-observed delivery evidence",
    tone: "#0891b2",
  },
  services: {
    id: "services",
    label: "Services + CDC",
    layer: "Producer",
    summary: "Home, Search, Ads, Upload, Subscription, and operational databases publish authoritative decisions and reference-state changes.",
    decision: "Use domain events for business actions and CDC for row-state changes; do not infer authoritative ad, content, or subscription state from clients.",
    receives: "Ranking requests, ad decisions, creator actions, and operational transactions",
    produces: "Impressions, ad lifecycle, search, content, channel, subscription, and policy events",
    guarantee: "Authoritative business state",
    tone: "#7c3aed",
  },
  gateway: {
    id: "gateway",
    label: "Event Gateway",
    layer: "Ingestion",
    summary: "Regional collectors authenticate producers, validate contracts and consent, add trusted ingest metadata, and expose rejection reasons.",
    decision: "Keep collectors stateless and horizontally scalable; acknowledge only after durable publish and buffer clients with bounded retries.",
    receives: "Batched Avro or Protobuf events over HTTP/gRPC",
    produces: "Validated records to Kafka plus malformed records to a DLQ",
    guarantee: "≥99.99% ingest · explicit accept/reject",
    tone: "#d97706",
  },
  kafka: {
    id: "kafka",
    label: "Kafka",
    layer: "Durable backbone",
    summary: "Kafka separates YouTube producers from Flink, raw-lake ingestion, fraud detection, feature generation, and future consumers.",
    decision: "Use topic-specific keys and retention. Kafka owns hot replay and fan-out; immutable Bronze owns long-term history.",
    receives: "Validated playback, impression, engagement, search, ad, QoE, and CDC events",
    produces: "Ordered topic partitions read independently by streaming and lake sinks",
    guarantee: "Durable replay · backpressure buffer · fan-out",
    tone: "#d97706",
  },
  flink: {
    id: "flink",
    label: "Flink",
    layer: "Fast path",
    summary: "Stateful event-time jobs reconstruct playback, deduplicate bounded retries, update live counters, detect QoE regressions, and build online features.",
    decision: "Accept provisional correctness within a watermark so live products remain fresh; publish versioned upserts that later corrections can replace.",
    receives: "Kafka topics plus broadcast dimensions and policy versions",
    produces: "Live views, trending signals, QoE alerts, fraud features, and online recommendation features",
    guarantee: "Seconds-to-minutes freshness · provisional",
    tone: "#7c3aed",
  },
  realtime: {
    id: "realtime",
    label: "Realtime Stores",
    layer: "Fast serving",
    summary: "Redis-like counters, Pinot/Druid segments, and the online feature store serve different low-latency YouTube access patterns.",
    decision: "Do not force public counters, Creator Studio slices, and recommendation features into one database; isolate their consistency and query needs.",
    receives: "Versioned Flink aggregates, alerts, and feature upserts",
    produces: "Live counters, trending pages, operational dashboards, and inference features",
    guarantee: "Low-latency reads · workload-specific consistency",
    tone: "#8b5cf6",
  },
  bronze: {
    id: "bronze",
    label: "Bronze Iceberg",
    layer: "Truth path",
    summary: "Every accepted event lands unchanged in partitioned Parquet on object storage for audit, replay, backfill, and metric correction.",
    decision: "Make Bronze immutable and inexpensive. Table metadata supplies snapshots and discovery without destroying original producer evidence.",
    receives: "Full-fidelity Kafka records with source and ingest metadata",
    produces: "Replayable raw Iceberg snapshots organized by event family and time",
    guarantee: "Long-term evidence · reproducible replay",
    tone: "#0891b2",
  },
  batch: {
    id: "batch",
    label: "Spark + dbt",
    layer: "Truth processing",
    summary: "Batch jobs use complete history for late-data closure, full deduplication, session reconstruction, invalid-traffic decisions, large joins, and backfills.",
    decision: "Run corrected outputs into staging, validate deltas and metric versions, then promote atomically instead of overwriting official tables in place.",
    receives: "Bronze snapshots, CDC dimensions, trust decisions, metric definitions, and experiment assignments",
    produces: "Conformed Silver events and staged certified Gold aggregates",
    guarantee: "Complete-history correction · replay safety",
    tone: "#16a34a",
  },
  certified: {
    id: "certified",
    label: "Silver + Gold",
    layer: "Certified products",
    summary: "Silver standardizes and deduplicates events; Gold publishes versioned views, watch time, retention, revenue, experiment metrics, and training features.",
    decision: "Use Medallion layers as quality boundaries: Bronze preserves, Silver conforms, and Gold makes a consumer-facing metric commitment.",
    receives: "Validated batch outputs that passed completeness, quality, reconciliation, and policy gates",
    produces: "Atomic, discoverable, versioned data-product snapshots",
    guarantee: "Certified truth · lineage · rollback",
    tone: "#16a34a",
  },
  serving: {
    id: "serving",
    label: "Serving Split",
    layer: "Analytics + ML serving",
    summary: "BigQuery-like warehouses, Pinot/Druid, offline feature views, and product APIs expose certified YouTube data to different consumers.",
    decision: "Choose by access pattern: warehouse for scans, OLAP for high-QPS slices, feature views for point-in-time ML, and APIs/caches for product reads.",
    receives: "Certified Gold snapshots and approved incremental updates",
    produces: "Creator Studio, BI, finance, experiments, recommendations, ads, and official counters",
    guarantee: "Fit-for-purpose latency and access control",
    tone: "#ff0033",
  },
  orchestration: {
    id: "orchestration",
    label: "Orchestration",
    layer: "Cross-cutting layer",
    summary: "Airflow or Dagster coordinates YouTube certification, reconciliation, compaction, feature generation, backfills, and controlled snapshot promotion.",
    decision: "Keep scheduling and dependency policy outside processing code so live jobs, daily certification, retries, and backfills can be operated consistently.",
    receives: "Dataset readiness, job state, partition availability, quality results, and backfill requests",
    produces: "Scheduled runs, dependency gates, retries, alerts, and atomic publication workflows",
    guarantee: "Dependency control · retries · recoverable backfills",
    tone: "#7c3aed",
  },
  governance: {
    id: "governance",
    label: "Governance",
    layer: "Cross-cutting layer",
    summary: "Governance applies YouTube schema, metric, quality, lineage, privacy, security, retention, and ownership rules across every architectural layer.",
    decision: "Centralize reusable policy and evidence while keeping each data domain accountable for the meaning and quality of its contracts and products.",
    receives: "Schemas, metric versions, consent tags, lineage events, quality results, ownership, and access requests",
    produces: "Compatibility decisions, policy enforcement, catalog metadata, audit evidence, and publication approvals",
    guarantee: "Trusted definitions · traceability · policy enforcement",
    tone: "#0891b2",
  },
};

const controlPlane = [
  ["Schema Registry", "Blocks an incompatible playback.heartbeat, impression, ad, search, or QoE payload before a new Player SDK or YouTube backend release starts publishing it."],
  ["Metric Registry", "Pins qualified_view_vN, watch_time_ms, audience retention, ad attribution, and experiment metrics to the exact reviewed YouTube semantic version used by Flink and batch."],
  ["Catalog + Lineage", "Traces playback.heartbeat from the Player SDK through Kafka and Flink into Silver playback events, Gold video metrics, Creator Studio, and recommendation features."],
  ["Policy Engine", "Carries analytics consent, personalization consent, kids-content restrictions, residency, and deletion rules from the YouTube event envelope into tables and feature views."],
  ["Airflow / Dagster", "Waits for YouTube Bronze partitions and trust decisions, runs daily view/watch-time certification, checks reconciliation, and promotes the approved Gold snapshot."],
  ["IAM + KMS", "Separates access to viewer identifiers, creator analytics, ad-revenue evidence, and public aggregates while encrypting YouTube Kafka topics, Iceberg tables, and serving stores."],
  ["SLO Config", "Stores the YouTube targets used here: live views in 10–60 seconds, trending in 1–5 minutes, Creator P95 under 2 seconds, and official metrics within 24–48 hours."],
] as const;

const dataPlane = [
  ["Gateway", "Receives Player SDK heartbeats, Home/Search impressions, ad events, QoE, and CDC; validates schema and consent, assigns ingest_time, then publishes or records an explicit rejection."],
  ["Kafka", "Keeps playback, impression, engagement, search, ads, QoE, and CDC in separate replayable YouTube topic families consumed by Flink, Bronze sinks, fraud jobs, and feature pipelines."],
  ["Flink", "Keys playback by playback_attempt_id, deduplicates event_id, applies event-time watermarks, sums played_delta_ms, and updates live views, trending, QoE alerts, and online recommendation features."],
  ["Iceberg", "Stores immutable YouTube Bronze events, conformed Silver playback and business events, and certified Gold views, watch time, retention, revenue, experiment metrics, and offline features."],
  ["Spark", "Replays complete Bronze history to include late offline viewing, apply updated invalid-traffic decisions, rebuild sessions, reconcile provisional counts, and publish certified YouTube metrics."],
  ["Serving", "Routes official YouTube data by workload: Creator Studio slices to Pinot/Druid, internal scans to the warehouse, recommendation data to feature views, and public counts through caches and APIs."],
] as const;

const ownershipDomains = [
  { name: "Playback", tone: "#ff0033", producer: "Player + Playback teams", contract: "playback.* + qualified-view inputs", product: "views · watch time · retention", consumers: "Creator · Recs · Ads · Public counters" },
  { name: "Engagement", tone: "#d97706", producer: "Engagement product team", contract: "like · comment · share · subscribe", product: "engagement_daily_vN", consumers: "Creator · Recs · Product analytics" },
  { name: "Search", tone: "#7c3aed", producer: "Search + Ranking teams", contract: "query · result impression · click", product: "search_quality_vN", consumers: "Search science · Recs · Experiments" },
  { name: "Ads", tone: "#16a34a", producer: "Ads serving team", contract: "request · impression · click · complete", product: "ad_revenue_daily", consumers: "Finance · Monetization · Creator" },
  { name: "Creator", tone: "#0891b2", producer: "Creator + Content teams", contract: "upload · metadata · channel state", product: "creator_performance_vN", consumers: "Creator Studio · Support · BI" },
  { name: "QoE", tone: "#2563eb", producer: "Player + CDN teams", contract: "startup · buffer · bitrate · error", product: "qoe_timeseries", consumers: "SRE · Client teams · Capacity" },
  { name: "Trust", tone: "#dc2626", producer: "Trust & Safety", contract: "traffic-quality decisions + policy evidence", product: "qualified_traffic_vN", consumers: "Views · Ads · Recs · Finance" },
  { name: "Experiments", tone: "#0f766e", producer: "Experimentation platform", contract: "assignment · exposure · metric version", product: "experiment_scorecard_vN", consumers: "Product · Science · Leadership" },
] as const;

function ArchitectureButton({ id, selected, onSelect, align = "center", side = "top" }: { id: string; selected: boolean; onSelect: (id: string) => void; align?: "start" | "center" | "end"; side?: "top" | "bottom" }) {
  const node = architectureNodes[id];
  return (
    <button type="button" onMouseEnter={() => onSelect(id)} onFocus={() => onSelect(id)} onClick={() => onSelect(id)} className="group relative z-0 min-h-[62px] w-full cursor-pointer rounded-lg border bg-[var(--bg-card)] px-3 py-2 text-left transition hover:z-50 hover:-translate-y-0.5 hover:shadow-md focus-visible:z-50 focus-visible:outline-none focus-visible:ring-2" style={{ borderColor: selected ? node.tone : `${node.tone}40`, boxShadow: selected ? `0 0 0 1px ${node.tone}55` : undefined, "--tw-ring-color": node.tone } as React.CSSProperties}>
      <span className="flex items-center justify-between gap-2"><strong className="text-xs">{node.label}</strong><span className="h-2 w-2 rounded-full" style={{ background: node.tone }} /></span>
      <span className="mt-1 block text-[10px]" style={{ color: node.tone }}>{node.guarantee.split(" · ")[0]}</span>
      <Tooltip align={align} side={side}>{node.summary}</Tooltip>
    </button>
  );
}

function ArchitectureMap() {
  const [focused, setFocused] = useState("kafka");
  const selected = architectureNodes[focused];
  return (
    <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_310px] xl:items-start">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3">
        <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-start">
          <div className="rounded-xl border border-blue-500/25 bg-blue-500/[.035] p-2">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[.15em] text-blue-600">Producers</p>
            <div className="grid gap-2"><ArchitectureButton id="players" selected={focused === "players"} onSelect={setFocused} align="start" side="bottom" /><ArchitectureButton id="edge" selected={focused === "edge"} onSelect={setFocused} align="start" /><ArchitectureButton id="services" selected={focused === "services"} onSelect={setFocused} align="start" /></div>
          </div>
          <span className="hidden self-center text-[#ff0033] lg:block">→</span>

          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[.035] p-2">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[.15em] text-amber-600">Ingestion</p>
            <div className="grid gap-2"><ArchitectureButton id="gateway" selected={focused === "gateway"} onSelect={setFocused} side="bottom" /><ArchitectureButton id="kafka" selected={focused === "kafka"} onSelect={setFocused} /></div>
          </div>
          <span className="hidden self-center text-[#ff0033] lg:block">→</span>

          <div className="rounded-xl border border-violet-500/25 bg-violet-500/[.035] p-2">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[.15em] text-violet-600">Processing</p>
            <div className="grid gap-2"><ArchitectureButton id="flink" selected={focused === "flink"} onSelect={setFocused} side="bottom" /><ArchitectureButton id="batch" selected={focused === "batch"} onSelect={setFocused} /></div>
          </div>
          <span className="hidden self-center text-[#ff0033] lg:block">→</span>

          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/[.035] p-2">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[.15em] text-cyan-600">Lakehouse</p>
            <div className="grid gap-2"><ArchitectureButton id="bronze" selected={focused === "bronze"} onSelect={setFocused} side="bottom" /><ArchitectureButton id="certified" selected={focused === "certified"} onSelect={setFocused} /></div>
          </div>
          <span className="hidden self-center text-[#ff0033] lg:block">→</span>

          <div className="rounded-xl border border-red-500/25 bg-red-500/[.035] p-2">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[.15em] text-[#ff0033]">Serving</p>
            <div className="grid gap-2"><ArchitectureButton id="realtime" selected={focused === "realtime"} onSelect={setFocused} align="end" side="bottom" /><ArchitectureButton id="serving" selected={focused === "serving"} onSelect={setFocused} align="end" /></div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <ArchitectureButton id="orchestration" selected={focused === "orchestration"} onSelect={setFocused} align="start" />
          <ArchitectureButton id="governance" selected={focused === "governance"} onSelect={setFocused} align="end" />
        </div>
      </div>

      <aside className="overflow-hidden rounded-xl border xl:sticky xl:top-[140px]" style={{ borderColor: `${selected.tone}55`, background: `${selected.tone}08` }} aria-live="polite">
        <div className="border-b border-[var(--border)] p-4"><p className="text-[9px] font-bold uppercase tracking-[.16em]" style={{ color: selected.tone }}>{selected.layer}</p><h3 className="mt-2 text-lg font-bold">{selected.label}</h3><p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{selected.summary}</p></div>
        <div className="space-y-3 p-4">
          <div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[var(--text-faint)]">Design choice</p><p className="mt-1 text-xs leading-5">{selected.decision}</p></div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[var(--text-faint)]">Receives</p><p className="mt-1 text-xs leading-5">{selected.receives}</p></div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[var(--text-faint)]">Produces</p><p className="mt-1 text-xs leading-5">{selected.produces}</p></div>
          <div className="rounded-lg px-3 py-2 text-xs font-bold" style={{ color: selected.tone, background: `${selected.tone}12` }}>{selected.guarantee}</div>
        </div>
      </aside>
    </div>
  );
}

function PlatformPlanes() {
  return (
    <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/[.04] p-3">
        <div className="mb-3 flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.15em] text-violet-600">Control plane</p><strong className="mt-1 block text-sm">Defines how pipelines are allowed to run</strong></div><span className="text-violet-600">↓ configures</span></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{controlPlane.map(([name, detail], index) => <button type="button" key={name} className="group relative cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3 text-left text-xs font-semibold hover:border-violet-500"><span className="text-violet-600">{String(index + 1).padStart(2, "0")}</span><span className="mt-1 block">{name}</span><Tooltip align={index === 0 ? "start" : index === controlPlane.length - 1 ? "end" : "center"}>{detail}</Tooltip></button>)}</div>
      </div>
      <div className="mx-auto h-6 w-px bg-violet-500/50" />
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/[.04] p-3">
        <div className="mb-3"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-blue-600">Data plane</p><strong className="mt-1 block text-sm">Moves and transforms YouTube events</strong></div>
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-center">{dataPlane.map(([name, detail], index) => <div className="contents" key={name}><button type="button" className="group relative cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3 text-left text-xs font-semibold hover:border-blue-500">{name}<Tooltip align={index === 0 ? "start" : index === dataPlane.length - 1 ? "end" : "center"}>{detail}</Tooltip></button>{index < dataPlane.length - 1 ? <span className="hidden text-blue-600 xl:block">→</span> : null}</div>)}</div>
      </div>
    </div>
  );
}

function OwnershipFlow() {
  const [selectedDomain, setSelectedDomain] = useState("Playback");
  const domain = ownershipDomains.find((item) => item.name === selectedDomain) ?? ownershipDomains[0];
  const stages = [
    ["Producer owner", domain.producer, `${domain.producer} owns emission of ${domain.contract}: stable event IDs, source event time, consent context, release safety, retry behavior, and source-side data loss.`],
    ["Domain contract", domain.contract, `The ${domain.name} data domain owns schema meaning, compatibility, quality thresholds, privacy classification, event-time rules, and metric inputs.`],
    ["Shared platform", "Gateway · Kafka · Flink · Iceberg · Spark", `The Data Platform team carries ${domain.contract} through the gateway, Kafka, Flink, Iceberg, and Spark with replay, scaling, checkpoints, access control, and recovery. The ${domain.name} domain still owns what the data means.`],
    ["Product owner", domain.product, `The ${domain.name} data domain certifies its Silver and Gold products, publishes versions, meets SLOs, reconciles changes, and supplies rollback and replay procedures.`],
    ["Consumers", domain.consumers, `${domain.consumers} read ${domain.product} through its published YouTube data contract. They declare latency and quality needs but do not independently redefine ${domain.name} metrics from raw events.`],
  ] as const;
  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">{ownershipDomains.map((item) => <button type="button" key={item.name} onClick={() => setSelectedDomain(item.name)} className="cursor-pointer rounded-full border px-3 py-2 text-xs font-bold transition" style={{ borderColor: selectedDomain === item.name ? item.tone : "var(--border)", color: selectedDomain === item.name ? item.tone : "var(--text-muted)", background: selectedDomain === item.name ? `${item.tone}12` : "var(--bg-muted)" }}>{item.name}</button>)}</div>
      <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3">
        <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-center">
          {stages.map(([owner, value, detail], index) => (
            <div className="contents" key={owner}>
              <button type="button" className="group relative z-0 min-h-[112px] cursor-pointer rounded-lg border bg-[var(--bg-card)] p-3 text-left transition hover:z-50 hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: `${domain.tone}40` }}><span className="text-[9px] font-bold uppercase tracking-[.14em]" style={{ color: domain.tone }}>{owner}</span><strong className="mt-3 block text-xs leading-5">{value}</strong><span className="absolute right-3 top-3 text-[10px]" style={{ color: domain.tone }} aria-hidden>ⓘ</span><Tooltip align={index === 0 ? "start" : index === stages.length - 1 ? "end" : "center"}>{detail}</Tooltip></button>
              {index < stages.length - 1 ? <span className="hidden text-center lg:block" style={{ color: domain.tone }}>→</span> : null}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <div className="rounded-lg border border-red-500/25 bg-red-500/[.04] px-3 py-3 text-xs"><strong className="text-[#ff0033]">Domain team</strong><span className="ml-2 text-[var(--text-muted)]">owns meaning, quality, products, and SLOs</span></div>
        <div className="rounded-lg border border-blue-500/25 bg-blue-500/[.04] px-3 py-3 text-xs"><strong className="text-blue-600">Platform team</strong><span className="ml-2 text-[var(--text-muted)]">owns reusable infrastructure and reliability</span></div>
        <div className="rounded-lg border border-violet-500/25 bg-violet-500/[.04] px-3 py-3 text-xs"><strong className="text-violet-600">Governance</strong><span className="ml-2 text-[var(--text-muted)]">approves shared metrics, privacy, and financial controls</span></div>
      </div>
    </div>
  );
}

export default function ArchitectureTab() {
  return (
    <YouTubeFrame activeTab="architecture" sections={ARCHITECTURE_SECTIONS} previous={{ id: "event-sources", label: "Event Sources" }} next={{ id: "ingestion-kafka", label: "Ingestion / Kafka" }}>
      <Section id="architecture-map" number="01" title="Architecture Map"><ArchitectureMap /></Section>
      <Section id="platform-planes" number="02" title="Platform Planes"><PlatformPlanes /></Section>
      <Section id="ownership-flow" number="03" title="Ownership Flow"><OwnershipFlow /></Section>
    </YouTubeFrame>
  );
}
