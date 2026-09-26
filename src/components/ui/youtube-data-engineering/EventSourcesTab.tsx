"use client";

import { useState } from "react";
import { EVENT_SECTIONS } from "./data";
import { Section, Tooltip, YouTubeFrame } from "./shared";

const producers = [
  {
    icon: "▶",
    title: "Player SDKs",
    scope: "iOS · Android · Web · TV · Console · Embed",
    events: "video_start · heartbeat · pause · seek · end",
    tone: "#1d4ed8",
    detail: "The YouTube player is the authoritative source for what the device attempted to play and how playback progressed. It generates stable event IDs before retrying, preserves event time during offline buffering, and attaches playback_attempt_id so heartbeats can be reconstructed into one viewing attempt.",
  },
  {
    icon: "◎",
    title: "YouTube Edge",
    scope: "CDN · media delivery · edge telemetry",
    events: "segment_request · cache_status · delivery_error",
    tone: "#0b6f87",
    detail: "CDN and edge logs provide server-side delivery evidence: requested video segments, response codes, cache hit or miss, bytes delivered, region, and edge latency. Joining this with client buffering and bitrate events separates network delivery failures from player defects.",
  },
  {
    icon: "⚙",
    title: "Product Services",
    scope: "Home · Search · Ads · Live · Upload",
    events: "impression · result_click · ad_impression · upload",
    tone: "#6d28d9",
    detail: "YouTube backend services emit the decision that the client observed: which videos were ranked on Home or Search, which experiment and model produced the slate, which ad request won, and which upload or subscription state changed.",
  },
  {
    icon: "DB",
    title: "Operational CDC",
    scope: "Video · channel · subscription · policy state",
    events: "video_updated · channel_changed · consent_changed",
    tone: "#077149",
    detail: "Debezium-style CDC captures authoritative row changes without repeatedly scanning production databases. These streams maintain video, channel, subscription, monetization, and policy dimensions used to interpret behavioral events at the correct point in time.",
  },
] as const;

const familyGroups = [
  {
    label: "Firehose",
    note: "Continuous or exposure-driven telemetry",
    tone: "#b00020",
    items: [
      { name: "Playback", volume: "Highest", events: "start · heartbeat · seek · end", output: "views · watch time · retention", detail: "Heartbeats every 10–30 seconds dominate sustained playback traffic. played_delta_ms, position_ms, playback_state, and playback_attempt_id allow YouTube to reconstruct actual watched time rather than trusting a single play click." },
      { name: "Impression", volume: "Very high", events: "home · search · suggested · shorts", output: "CTR · ranking · recs training", detail: "An impression records a video that YouTube actually rendered to a viewer, including surface, position, request ID, model version, and experiment assignment. It is the denominator for CTR and prevents click-only training bias." },
    ],
  },
  {
    label: "Interaction",
    note: "Viewer intent, quality, and money",
    tone: "#8a4b00",
    items: [
      { name: "Engagement", volume: "High", events: "like · comment · share · subscribe", output: "creator analytics · recs", detail: "Explicit actions are sparse but strong preference signals. The event must distinguish create versus undo actions, identify the video and channel, and retain the recommendation surface that led to the action." },
      { name: "Search", volume: "High", events: "query · results shown · result click", output: "search quality · recs", detail: "Search events connect normalized query text, locale, filters, result position, ranking version, and the clicked video within one search session so YouTube can evaluate relevance and reformulation." },
      { name: "Ads", volume: "High", events: "request · impression · skip · complete", output: "revenue · RPM · billing", detail: "Ad events preserve ad_request_id, impression_id, creative, campaign, video, channel, and billing evidence. Client delivery signals reconcile with the authoritative ad server before revenue is certified." },
      { name: "QoE", volume: "High", events: "startup · buffer · bitrate · error", output: "SRE alerts · playback UX", detail: "QoE joins client playback state with CDN delivery evidence to calculate startup time, rebuffer ratio, bitrate switches, fatal errors, and failure rate by device, app version, ISP, region, and video format." },
    ],
  },
  {
    label: "Reference",
    note: "Lower-volume authoritative state",
    tone: "#077149",
    items: [
      { name: "Creator", volume: "Low / CDC", events: "upload · metadata · monetization", output: "video + channel dimensions", detail: "Creator actions change the meaning and eligibility of content. CDC preserves when a title, category, visibility, ownership, monetization setting, or channel attribute became effective." },
      { name: "Policy", volume: "Low / critical", events: "consent · kids mode · residency", output: "governance · feature eligibility", detail: "Policy state controls whether YouTube may retain an identifier, personalize recommendations, move data across regions, or use an event for analytics. These tags must propagate into every derived table and feature." },
    ],
  },
] as const;

const contractGroups = [
  { id: "identity", name: "Identity", fields: ["event_id", "user_or_anon_id", "device_id", "session_id", "playback_attempt_id"], tone: "#1d4ed8", detail: "event_id identifies one emitted record for deduplication. playback_attempt_id groups all events for one attempt to play one video. User and device IDs remain privacy-scoped and rotatable." },
  { id: "time", name: "Time", fields: ["event_time", "client_send_time", "ingest_time"], tone: "#6d28d9", detail: "event_time drives YouTube watch windows; client_send_time reveals device buffering; platform-assigned ingest_time measures transport delay and powers late-event monitoring." },
  { id: "content", name: "Content", fields: ["video_id", "channel_id", "is_live", "surface"], tone: "#b00020", detail: "Content identifiers and the discovery surface distinguish Home, Search, Suggested, Shorts, embeds, Live, and VOD while preserving the publishing channel." },
  { id: "playback", name: "Playback", fields: ["position_ms", "played_delta_ms", "buffered_delta_ms", "playback_state"], tone: "#077149", detail: "played_delta_ms is watch-time evidence. YouTube validates it against position movement, state transitions, buffering, video duration, retry patterns, and traffic-quality signals." },
  { id: "policy", name: "Policy", fields: ["schema_version", "metric_semantics_version", "experiment_assignments", "consent"], tone: "#8a4b00", detail: "Schema version controls payload decoding; metric_semantics_version pins the view/watch-time definition. Experiment and consent context travel with the event so later joins do not rewrite history." },
  { id: "client", name: "Client", fields: ["client", "network", "trace_id"], tone: "#0b6f87", detail: "Platform, app version, and network type isolate regressions by client population. trace_id connects player telemetry to collector, CDN, and backend request diagnostics." },
] as const;

const jsonLines = [
  ["base", "{"],
  ["identity", '  "event_id": "uuid",'],
  ["base", '  "event_name": "playback.heartbeat",'],
  ["policy", '  "schema_version": 4,'],
  ["policy", '  "metric_semantics_version": 7,'],
  ["time", '  "event_time": "2026-09-06T12:00:15Z",'],
  ["time", '  "client_send_time": "2026-09-06T12:00:17Z",'],
  ["time", '  "ingest_time": "2026-09-06T12:00:18Z",'],
  ["identity", '  "user_or_anon_id": "privacy-scoped-id",'],
  ["identity", '  "device_id": "rotatable-id",'],
  ["identity", '  "session_id": "viewer-session",'],
  ["identity", '  "playback_attempt_id": "attempt-42",'],
  ["content", '  "video_id": "video-123",'],
  ["content", '  "channel_id": "channel-9",'],
  ["playback", '  "position_ms": 42000,'],
  ["playback", '  "played_delta_ms": 15000,'],
  ["playback", '  "buffered_delta_ms": 0,'],
  ["playback", '  "playback_state": "PLAYING",'],
  ["content", '  "is_live": false,'],
  ["content", '  "surface": "HOME",'],
  ["policy", '  "experiment_assignments": ["exp123:treatment"],'],
  ["policy", '  "consent": {"analytics": true, "personalization": true},'],
  ["client", '  "client": {"platform": "TV", "app_version": "x.y"},'],
  ["client", '  "network": {"type": "WIFI"},'],
  ["client", '  "trace_id": "trace-abc"'],
  ["base", "}"],
] as const;

const contractRules = [
  ["event_id ≠ attempt_id", "One ID deduplicates a record; the other groups many records into a viewing attempt."],
  ["event_time → windows", "YouTube uses event time for sessionization and ranking windows; ingest time measures delivery delay."],
  ["played_delta → watch time", "Add validated played deltas instead of subtracting unreliable device wall-clock timestamps."],
  ["metric version → KPI", "A payload can stay structurally compatible while the definition of a qualified view changes."],
  ["scoped IDs → governed join", "Anonymous-to-account stitching is a governed downstream operation, never an unrestricted ad hoc join."],
] as const;

const workloads = [
  { name: "Shorts", shape: "Rapid swipe sessions", keys: "shorts_session_id · loop_index", processing: "Unique coverage + loop watch time", tone: "#b00020", detail: "A Shorts session contains many videos with fast swipes, autoplay, and possible loops. Keep looped watch time separate from unique covered duration, and attach feed position plus swipe reason so engaged-view and retention logic does not reuse long-form assumptions." },
  { name: "Live", shape: "Unbounded + reconnecting", keys: "broadcast_id · playback_attempt_id", processing: "Concurrency windows + VOD handoff", tone: "#6d28d9", detail: "Live viewers can reconnect, change latency mode, and remain for hours. Count concurrent viewers with expiring event-time state, preserve live-edge latency and chat rate, then link the ended broadcast to its VOD identity without double-counting history." },
  { name: "Embedded", shape: "External page context", keys: "embed_origin · referrer_policy", processing: "Consent + invalid-traffic checks", tone: "#1d4ed8", detail: "An embedded player runs outside youtube.com. Capture allowed origin and referrer context, first-party versus third-party consent, player API behavior, and traffic-quality evidence before using the playback for public counts or recommendations." },
  { name: "Offline", shape: "Delayed burst upload", keys: "event_time · offline_batch_id", processing: "Bounded batch correction", tone: "#0b6f87", detail: "A mobile device may watch downloaded video without connectivity and upload events much later in one burst. Preserve original event time and stable IDs, protect collectors from synchronized flushes, and correct certified partitions instead of keeping unbounded Flink state." },
  { name: "Kids", shape: "Restricted identity", keys: "policy_context · content_rating", processing: "No disallowed personalization", tone: "#8a4b00", detail: "Kids-content policy can restrict durable identifiers, profiling, ad personalization, and retention. The policy context must be attached at collection and propagated through Bronze, Silver, Gold, experiments, and feature generation." },
] as const;

function SourceNode({ source, align, side }: { source: (typeof producers)[number]; align?: "start" | "center" | "end"; side?: "top" | "bottom" }) {
  return (
    <button type="button" className="group relative z-0 min-h-[118px] cursor-pointer rounded-xl border bg-[var(--bg-card)] p-4 text-left transition hover:z-50 hover:-translate-y-0.5 hover:shadow-md focus-visible:z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b00020]" style={{ borderColor: `${source.tone}45` }}>
      <span className="flex items-center justify-between gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black" style={{ color: source.tone, background: `${source.tone}18` }}>{source.icon}</span><span className="text-[10px]" style={{ color: source.tone }} aria-hidden>ⓘ</span></span>
      <strong className="mt-3 block text-sm">{source.title}</strong>
      <span className="mt-1 block text-[11px] text-[var(--text-faint)]">{source.scope}</span>
      <code className="mt-2 block text-[11px] leading-5" style={{ color: source.tone }}>{source.events}</code>
      <Tooltip align={align} side={side}>{source.detail}</Tooltip>
    </button>
  );
}

function ProducerMap() {
  return (
    <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
      <div className="grid gap-3 xl:grid-cols-[1fr_auto_230px] xl:items-center">
        <div className="grid gap-2 sm:grid-cols-2">
          {producers.map((source, index) => <SourceNode key={source.title} source={source} align={index % 2 === 0 ? "start" : "center"} side={index < 2 ? "bottom" : "top"} />)}
        </div>
        <span className="hidden text-[#b00020] xl:block">→</span>
        <button type="button" className="group relative cursor-pointer rounded-xl border border-red-500/35 bg-red-500/[.05] p-5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b00020]">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 font-black text-[#b00020]">G</span>
          <strong className="mt-3 block">Event Gateway</strong>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[10px] text-[var(--text-muted)]"><span>auth</span><span>·</span><span>schema</span><span>·</span><span>consent</span><span>·</span><span>ingest time</span></div>
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold">Kafka topic families →</div>
          <Tooltip align="end">The regional gateway authenticates producers, enforces payload size and schema, attaches trusted ingest time and coarse region, routes policy violations to explicit rejection metrics, sends malformed records to a DLQ, and publishes accepted events idempotently to Kafka.</Tooltip>
        </button>
      </div>
    </div>
  );
}

function FamilyMap() {
  return (
    <div className="mt-5 space-y-3">
      {familyGroups.map((group) => (
        <div key={group.label} className="grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3 lg:grid-cols-[150px_1fr]">
          <div className="flex items-center gap-3 rounded-lg px-3 py-3 lg:flex-col lg:items-start lg:justify-center" style={{ color: group.tone, background: `${group.tone}10` }}><strong className="text-sm">{group.label}</strong><span className="text-[10px] leading-4 text-[var(--text-faint)]">{group.note}</span></div>
          <div className={`grid gap-2 ${group.items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
            {group.items.map((family, index) => (
              <button type="button" key={family.name} className="group relative min-h-[112px] cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-left transition hover:-translate-y-0.5 hover:border-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b00020]" style={{ color: group.tone }}>
                <span className="flex items-center justify-between"><strong className="text-sm text-[var(--text)]">{family.name}</strong><span className="rounded-full px-2 py-1 text-[9px] font-bold uppercase" style={{ background: `${group.tone}16` }}>{family.volume}</span></span>
                <code className="mt-3 block text-[11px] leading-4 text-[var(--text-muted)]">{family.events}</code>
                <span className="mt-2 block text-[10px]">→ {family.output}</span>
                <Tooltip align={index === 0 ? "start" : index === group.items.length - 1 ? "end" : "center"}>{family.detail}</Tooltip>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContractExplorer() {
  const [selected, setSelected] = useState("playback");
  const active = contractGroups.find((group) => group.id === selected) ?? contractGroups[0];

  return (
    <div className="mt-5 grid gap-3 xl:grid-cols-[1.15fr_.85fr]">
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[#0d1117]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ff7790]">playback.heartbeat · v4</span><span className="text-[10px] text-slate-300">JSON</span></div>
        <pre className="overflow-x-auto p-3 text-[11px] leading-[1.55] sm:p-4 sm:text-xs">
          {jsonLines.map(([group, line], index) => (
            <span key={`${index}-${line}`} className="block rounded px-1 transition" style={{ color: group === selected ? "#e2e8f0" : group === "base" ? "#94a3b8" : "#cbd5e1", background: group === selected ? `${active.tone}55` : "transparent" }}>{line}</span>
          ))}
        </pre>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="tablist" aria-label="Event contract field groups">
          {contractGroups.map((group) => (
            <button type="button" role="tab" id={`event-contract-tab-${group.id}`} aria-selected={selected === group.id} aria-controls="event-contract-panel" key={group.id} onClick={() => setSelected(group.id)} className="cursor-pointer rounded-lg border p-3 text-left transition" style={{ borderColor: selected === group.id ? group.tone : "var(--border)", background: selected === group.id ? `${group.tone}10` : "var(--bg-muted)" }}>
              <strong className="text-xs" style={{ color: selected === group.id ? group.tone : "var(--text)" }}>{group.name}</strong><span className="mt-1 block text-[10px] text-[var(--text-faint)]">{group.fields.length} fields</span>
            </button>
          ))}
        </div>
        <div id="event-contract-panel" role="tabpanel" aria-labelledby={`event-contract-tab-${active.id}`} className="mt-3 rounded-xl border p-4" style={{ borderColor: `${active.tone}45`, background: `${active.tone}08` }}>
          <p className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: active.tone }}>{active.name} fields</p>
          <div className="mt-3 flex flex-wrap gap-2">{active.fields.map((field) => <code key={field} className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-2 text-xs">{field}</code>)}</div>
          <p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">{active.detail}</p>
        </div>
        <div className="mt-3 space-y-2">
          {contractRules.map(([rule, detail], index) => (
            <button type="button" key={rule} className="group relative flex w-full cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-3 text-left text-xs hover:border-[#b00020]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-[10px] font-bold text-[#b00020]">{index + 1}</span><code className="font-semibold">{rule}</code><span className="ml-auto text-[#b00020]" aria-hidden>ⓘ</span><Tooltip align="end">{detail}</Tooltip></button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlaybackEvidence() {
  const steps = [
    ["01", "Emit", "Player events", "The player creates one playback_attempt_id, then emits video_start, heartbeats every 15 seconds, pause, seek, and end. Every record gets a unique event_id before any retry."],
    ["02", "Validate", "Gateway + Kafka", "The gateway checks authentication, consent, schema, payload size, timestamps, and required playback fields. Accepted events enter Kafka and immutable Bronze; rejected records carry an explicit reason."],
    ["03", "Order", "Event time", "Flink keys by playback_attempt_id, removes repeated event_id values, orders within event-time watermarks, and keeps later arrivals available for batch correction."],
    ["04", "Reconstruct", "Played seconds", "Sum validated played_delta_ms values only while playback_state is PLAYING. Reject impossible jumps, overlap, negative deltas, buffering time, and progress beyond video duration."],
    ["05", "Qualify", "View policy vN", "Apply the versioned qualified-view policy using watched progress, repeats, autoplay context, consent, and current invalid-traffic signals. The streaming result remains provisional."],
    ["06", "Certify", "Official metrics", "Batch replays complete Bronze history, includes late events and updated fraud decisions, reconciles the stream result, and atomically publishes certified views, watch time, and retention."],
  ] as const;
  return (
    <div className="mt-5">
      <div className="mb-3 grid gap-3 rounded-xl border border-blue-500/25 bg-blue-500/[.035] p-4 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#1d4ed8]">What it means</p>
          <p className="mt-2 text-sm font-medium leading-6">Playback evidence is the ordered set of player events that shows how one attempt to watch a video actually progressed.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-2"><code>playback_attempt_id</code> groups</span>
          <span className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-2"><code>event_id</code> dedupes</span>
          <span className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-2"><code>event_time</code> orders</span>
          <span className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-2"><code>played_delta_ms</code> measures</span>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          {steps.map(([step, title, output, detail], index) => (
            <button type="button" key={step} className="group relative z-0 min-h-[112px] cursor-pointer rounded-lg border border-emerald-500/25 bg-[var(--bg-card)] p-3 text-left transition hover:z-50 hover:-translate-y-0.5 hover:border-emerald-500 focus-visible:z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <span className="flex items-center justify-between text-[10px] font-bold text-[#077149]"><span>{step}</span><span aria-hidden>ⓘ</span></span>
              <strong className="mt-3 block text-sm">{title}</strong>
              <span className="mt-1 block text-[11px] text-[var(--text-faint)]">{output}</span>
              {index < steps.length - 1 ? <span className="absolute -right-2.5 top-1/2 z-10 hidden text-[#077149] xl:block">→</span> : null}
              <Tooltip align={index === 0 ? "start" : index === steps.length - 1 ? "end" : "center"}>{detail}</Tooltip>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 border-l-4 border-[#b00020] bg-red-500/[.04] px-4 py-3 text-sm font-medium leading-6">“Use stable event IDs, group by playback attempt, process in event time, sum only validated played deltas, apply a versioned qualification policy, then certify with complete Bronze history.”</p>
    </div>
  );
}

function WorkloadMatrix() {
  return (
    <div className="mt-5 overflow-visible rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3">
      <div className="hidden grid-cols-[120px_1fr_1fr_1.15fr] gap-3 border-b border-[var(--border)] px-3 pb-3 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--text-faint)] lg:grid"><span>Workload</span><span>Traffic shape</span><span>Required context</span><span>Pipeline treatment</span></div>
      {workloads.map((item, index) => (
        <button type="button" key={item.name} className="group relative grid w-full cursor-pointer gap-2 border-b border-[var(--border)] px-3 py-4 text-left last:border-b-0 hover:bg-[var(--bg-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b00020] lg:grid-cols-[120px_1fr_1fr_1.15fr] lg:items-center">
          <strong className="text-sm" style={{ color: item.tone }}>{item.name}</strong>
          <span className="text-xs font-semibold">{item.shape}</span>
          <code className="text-[11px] leading-5 text-[var(--text-muted)]">{item.keys}</code>
          <span className="flex items-center justify-between gap-2 text-xs font-semibold"><span className="mr-1" style={{ color: item.tone }}>→</span>{item.processing}<span className="ml-auto text-[10px]" style={{ color: item.tone }} aria-hidden>ⓘ</span></span>
          <Tooltip align={index === 0 ? "start" : index === workloads.length - 1 ? "end" : "center"}>{item.detail}</Tooltip>
        </button>
      ))}
    </div>
  );
}

export default function EventSourcesTab() {
  return (
    <YouTubeFrame activeTab="event-sources" sections={EVENT_SECTIONS} previous={{ id: "requirements", label: "Requirements" }} next={{ id: "architecture", label: "Architecture" }}>
      <Section id="producers" number="01" title="Producers"><ProducerMap /></Section>
      <Section id="event-families" number="02" title="Event Families"><FamilyMap /></Section>
      <Section id="event-contract" number="03" title="Event Contract"><ContractExplorer /></Section>
      <Section id="playback-evidence" number="04" title="Playback Evidence"><PlaybackEvidence /></Section>
      <Section id="special-workloads" number="05" title="Workloads"><WorkloadMatrix /></Section>
    </YouTubeFrame>
  );
}
