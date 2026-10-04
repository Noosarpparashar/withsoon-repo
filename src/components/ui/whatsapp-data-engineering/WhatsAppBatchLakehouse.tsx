"use client";

import { useState, type ReactNode } from "react";

function LakehouseSection({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="rounded-[26px] border border-[#d8d8d8] bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,.055)] sm:p-7">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[#111]" aria-hidden />
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.19em] text-[#111]">{eyebrow}</p>
          <h2 className="mt-1.5 text-2xl font-bold tracking-[-.04em] text-[#111] sm:text-[28px]">{title}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[#5f5f5f]">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Badge({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 font-mono text-[9px] font-bold ${dark ? "border-[#111] bg-[#111] text-white" : "border-[#c9c9c9] bg-[#ededed] text-[#333]"}`}>{children}</span>;
}

const FLOW_NODES = [
  {
    id: "kafka",
    code: "KAFKA",
    label: "Domain event topics",
    meta: "Message, delivery, group, media, and call facts",
    stage: "Sources",
    detail: "The lakehouse starts from declared topic, partition, and offset ranges—not from an unbounded read of live WhatsApp traffic. Message lifecycle, per-device delivery, group fan-out, media transfer, and call-quality topics keep their own keys, schemas, and retention classes.",
    receives: "Privacy-safe events emitted after an operational state change",
    produces: "Bounded per-partition ranges with key, schema ID, event time, and ingestion time",
    promise: "Kafka is recent transport and replay; it is neither permanent history nor message-delivery authority",
    example: "A message_delivered fact remains keyed by tokenized message or recipient-device lifecycle while dense call-quality samples stay on an independently scaled topic.",
  },
  {
    id: "cdc",
    code: "CDC",
    label: "Reference-state CDC",
    meta: "Group, linked-device, and policy versions",
    stage: "Sources",
    detail: "CDC copies the state needed to interpret events at the time they happened. It captures effective-dated group membership, linked-device registration, client release, network taxonomy, and policy reference changes without treating database row changes as message facts.",
    receives: "Consistent source snapshot, log position, primary-key changes, and deletes",
    produces: "Ordered reference changes with source sequence and effective time",
    promise: "An older CDC update cannot overwrite a newer state version; deletes remain explicit",
    example: "A delivery repair joins the membership and eligible-device versions effective when the message was accepted—not the group membership visible today.",
  },
  {
    id: "archive",
    code: "ARCHIVE",
    label: "Raw archiver",
    meta: "Verified objects + complete ranges",
    stage: "Preserve",
    detail: "The archiver buffers Kafka records into healthy object sizes, writes immutable encrypted objects, verifies checksums and readable schemas, and only then advances the last fully archived offset for each partition.",
    receives: "Kafka records, CDC positions, schema IDs, and source-range manifest",
    produces: "Immutable objects, checksums, and gap-free offset manifests",
    promise: "An offset becomes archived only after its object is durable and readable; retry overlap is safe",
    example: "If delivery partition 42 claims offsets 8,000–9,999, the manifest is committed only after the object can be read and the checksum matches.",
  },
  {
    id: "bronze",
    code: "BRONZE",
    label: "Bronze Iceberg",
    meta: "Lossless analytical evidence",
    stage: "Preserve",
    detail: "Bronze appends the analytical event exactly as accepted, together with its topic, partition, offset, schema ID, ingestion time, producer, and region. It does not rewrite the only raw copy to fit today’s metric logic.",
    receives: "Verified immutable objects and their source-range manifests",
    produces: "messaging_events_raw, delivery_events_raw, media_events_raw, calls_quality_raw",
    promise: "A replayable record of exactly what the data platform received within its approved retention",
    example: "An archive retry may leave duplicate event IDs in Bronze; both transport records remain visible while Silver deterministically chooses one business fact.",
  },
  {
    id: "silver",
    code: "SILVER",
    label: "Silver conformance",
    meta: "Typed, deduplicated WhatsApp facts",
    stage: "Trust",
    detail: "Silver validates types, deduplicates stable event IDs, normalizes event time, tokenizes restricted identifiers, closes late device receipts, and joins the membership or linked-device version that was effective when the message was sent.",
    receives: "Bronze snapshots, quarantine corrections, and effective-dated reference data",
    produces: "message_delivery_event, group_membership_history, call_quality_window",
    promise: "One documented grain and deterministic rule set per fact",
    example: "Two copies of the same recipient-device delivery event produce one Silver row, while a later read receipt updates only the derived lifecycle version that owns that key.",
  },
  {
    id: "quarantine",
    code: "REPAIR",
    label: "Quarantine + repair",
    meta: "Owned invalid-data path",
    stage: "Trust",
    detail: "Schema, enum, timestamp, required-key, and privacy-policy failures are isolated with their source coordinates and owning producer. Repair tooling replays only the affected slice after the cause is corrected.",
    receives: "Rejected Bronze rows plus validation and privacy-policy reason codes",
    produces: "Bounded repair input, owner, age, status, and resolution evidence",
    promise: "Critical records never disappear silently, and privacy violations never flow into broad analytical tables",
    example: "A producer that places a forbidden raw identifier in a telemetry field is quarantined, alerts its owner, and blocks the affected Gold publication.",
  },
  {
    id: "model",
    code: "MODEL",
    label: "Lifecycle facts + history",
    meta: "Exact grains + point-in-time context",
    stage: "Trust",
    detail: "This step builds reusable facts at logical-message, recipient-device delivery, media-attempt, and call-participant-window grain. Effective-dated group, device, client, network, and policy history is resolved at event time.",
    receives: "Conformed Silver events and approved historical reference versions",
    produces: "Trusted lifecycle facts and point-in-time dimensions",
    promise: "Today’s membership, device, or taxonomy cannot rewrite yesterday’s WhatsApp outcome",
    example: "A group delivery denominator uses only recipient devices eligible at send time, even if members later leave or link another device.",
  },
  {
    id: "gold",
    code: "GOLD",
    label: "Gold data products",
    meta: "Owned WhatsApp metrics",
    stage: "Certify",
    detail: "Gold turns conformed facts into owned WhatsApp products: five-minute delivery health, completed-call quality, media-transfer reliability, regional capacity, and certified daily metrics. Every snapshot carries a metric version and freshness status.",
    receives: "Quality-approved Silver facts and reconciliation evidence",
    produces: "fact_message_delivery, agg_delivery_health_5m, fact_call_quality",
    promise: "Versioned, reproducible metrics for named consumers",
    example: "agg_delivery_health_5m publishes delivery success and p99 latency by region, platform, network class, and app version without exposing a conversation.",
  },
  {
    id: "gate",
    code: "GATE",
    label: "Quality + privacy gate",
    meta: "Blocks incomplete or unsafe products",
    stage: "Certify",
    detail: "The release gate reconciles declared source offsets to Bronze, Silver, and candidate Gold; checks duplicate, null, enum, latency, and late-data thresholds; and enforces field-level privacy rules before certification.",
    receives: "Candidate Gold, lifecycle facts, source manifests, quality results, and privacy checks",
    produces: "Pass/fail decision, exceptions, owner approval, and comparison evidence",
    promise: "Consumers stay on the last certified snapshot when completeness, semantics, or privacy checks fail",
    example: "If recipient-delivery counts fall below the accepted source range for one region, the new regional health snapshot remains unpublished and visibly stale.",
  },
  {
    id: "commit",
    code: "COMMIT",
    label: "Atomic Iceberg publish",
    meta: "One visible version + rollback",
    stage: "Certify",
    detail: "After all files and checks succeed, one catalog commit makes the complete snapshot visible. Safe retries handle write conflicts; failed metadata commits leave readers on the previous certified snapshot and orphan files are cleaned later.",
    receives: "Approved files, run ID, code version, metric version, and previous snapshot",
    produces: "Certified snapshot ID, lineage, notification, and rollback point",
    promise: "Readers never observe a half-published set of WhatsApp regions or hours",
    example: "A corrected delivery-health day becomes visible atomically; a failed commit changes no dashboard and sends no downstream refresh notification.",
  },
  {
    id: "ops",
    code: "OPS",
    label: "Reliability operations",
    meta: "Fast regional health reads",
    stage: "Consume",
    detail: "Operations reads low-latency aggregates in Pinot, Druid, or ClickHouse for delivery failure, retry pressure, media errors, and call setup quality. The serving store is rebuilt from governed products rather than becoming independent truth.",
    receives: "Certified near-real-time and finalized aggregate versions",
    produces: "Regional health dashboards with data-as-of and metric-version labels",
    promise: "Operational analytics can become stale without blocking message acceptance, routing, or delivery",
    example: "An on-call sees Android delivery latency rising in one region and network class, with the freshness age shown beside the chart.",
  },
  {
    id: "analytics",
    code: "BI",
    label: "Trino + product analytics",
    meta: "Governed historical analysis",
    stage: "Consume",
    detail: "Trino and approved BI views serve certified historical products and restricted Silver detail. Shared semantic definitions stop each dashboard from inventing delivery success, active-device, or call-quality logic.",
    receives: "Certified Gold and purpose-approved Silver snapshots",
    produces: "Product, capacity, release, and reliability analysis with visible freshness",
    promise: "Official metrics never read raw Bronze directly and broad users never receive restricted row-level identity",
    example: "A release owner compares media-transfer success across app versions using one governed denominator and the exact snapshot used by the dashboard.",
  },
  {
    id: "planning",
    code: "PLAN",
    label: "Capacity + network planning",
    meta: "Long-horizon fleet decisions",
    stage: "Consume",
    detail: "Daily and weekly products support regional broker, stream, storage, media, and call capacity planning. Cohorts are coarse and privacy-safe, with explicit completeness and retention policies.",
    receives: "Certified volume, fan-out, retry, media-byte, and network-quality aggregates",
    produces: "Forecast inputs, saturation trends, and regional capacity recommendations",
    promise: "Planning consumes aggregated evidence; it does not inspect message content or control the live delivery path",
    example: "A region’s growing recipient-device fan-out and media retries justify added ingestion and processing capacity before the next release peak.",
  },
] as const;

const FLOW_LANES = [
  { code: "01", title: "Sources", note: "Durable inputs", nodes: ["kafka", "cdc"] },
  { code: "02", title: "Preserve", note: "Replayable evidence", nodes: ["archive", "bronze"] },
  { code: "03", title: "Trust", note: "Reusable facts", nodes: ["silver", "quarantine", "model"] },
  { code: "04", title: "Certify", note: "Official products", nodes: ["gold", "gate", "commit"] },
  { code: "05", title: "Consume", note: "Purpose-built reads", nodes: ["ops", "analytics", "planning"] },
] as const;

const FLOW_SUPPORT = [
  { code: "AIRFLOW", title: "Run control", detail: "Coordinates source readiness, idempotent retries, compaction, expiration, and bounded backfills." },
  { code: "LINEAGE", title: "Catalog + lineage", detail: "Connects every table and metric to source ranges, code, policy, owner, quality result, and snapshot." },
] as const;

const LAYERS = [
  {
    label: "Bronze",
    role: "Raw source evidence",
    tables: ["messaging_events_raw", "delivery_events_raw", "media_events_raw", "calls_quality_raw"],
    transforms: ["Preserve accepted record", "Attach Kafka coordinates", "Record schema + producer version", "Separate quarantine reason"],
    rule: "Partition primarily by ingestion day/hour and region. Retain according to event class and privacy policy—commonly 30–180 days, not forever.",
  },
  {
    label: "Silver",
    role: "Conformed reusable facts",
    tables: ["message_delivery_event", "group_membership_history", "media_transfer_attempt", "call_quality_window"],
    transforms: ["Deduplicate stable event_id", "Normalize event time + enums", "Apply tokenization + minimization", "Point-in-time device/group joins"],
    rule: "Partition by a low-cardinality time transform; bucket or sort on stable tokens only when measured queries and skew justify it.",
  },
  {
    label: "Gold",
    role: "Certified data products",
    tables: ["fact_message_delivery", "agg_delivery_health_5m", "fact_call_quality", "agg_network_quality_daily"],
    transforms: ["Close late lifecycle outcomes", "Apply named metric version", "Aggregate approved dimensions", "Reconcile before publication"],
    rule: "Publish an atomic snapshot with owner, grain, freshness, completeness, retention, lineage, and rollback target.",
  },
] as const;

const TABLE_DESIGNS = [
  {
    id: "delivery",
    label: "Message delivery fact",
    table: "silver.message_delivery_event",
    grain: "One tokenized message × recipient device delivery outcome",
    partition: "days(event_time), bucket(128, conversation_hash)",
    sort: "region, event_type, event_time",
    queries: "Delivery success and p99 latency by time, region, platform, network, and app version.",
    decision: "Time pruning keeps daily scans bounded; conversation bucketing spreads the high-cardinality key without creating a directory per conversation. Bucket count is benchmarked and can evolve for new files through Iceberg metadata.",
  },
  {
    id: "calls",
    label: "Call quality windows",
    table: "silver.call_quality_window",
    grain: "One call participant device × bounded quality window",
    partition: "hours(event_time), region",
    sort: "network_class, app_version, event_time",
    queries: "Regional packet-loss, jitter, setup latency, and client-regression investigations.",
    decision: "Call samples are much denser than lifecycle events. Hour-level pruning and separate table maintenance prevent this workload from producing or scanning files alongside critical delivery facts.",
  },
  {
    id: "membership",
    label: "Membership history",
    table: "silver.group_membership_history",
    grain: "One tokenized group-member state version with effective time",
    partition: "months(effective_from), bucket(128, group_hash)",
    sort: "group_hash, effective_from",
    queries: "Point-in-time membership lookup for delivery reconciliation and controlled history repair.",
    decision: "This table is queried by group and time, not by every dashboard dimension. Effective-from/to versions prevent today’s membership from being incorrectly applied to an older message send.",
  },
] as const;

const DAGS = [
  { cadence: "Continuous", name: "Bronze landing", starts: "Kafka offsets available", work: "Append records and coordinates; quarantine rejected contracts", output: "Raw snapshot" },
  { cadence: "Hourly", name: "Late delivery repair", starts: "New late receipt IDs", work: "Rebuild only affected message-device lifecycles", output: "Corrected Silver" },
  { cadence: "Data ready", name: "Reference history", starts: "Group/device CDC complete", work: "Build effective-dated membership and linked-device versions", output: "Point-in-time dimensions" },
  { cadence: "By 06:00 local", name: "Daily Gold publish", starts: "Region/day Silver complete", work: "Reconcile facts, calculate certified metrics, publish snapshot", output: "Certified Gold" },
  { cadence: "Threshold", name: "Iceberg maintenance", starts: "Small files or metadata exceed limits", work: "Rewrite files/manifests and expire safe old snapshots", output: "Healthy tables" },
] as const;

const DATA_PRODUCTS = [
  {
    id: "delivery-health",
    table: "gold.agg_delivery_health_5m",
    title: "Delivery health",
    question: "Are accepted messages reaching eligible recipient devices reliably and within the regional latency objective?",
    grain: "One row per 5-minute window × region × platform × network class × app version",
    freshness: "1–5 minutes provisional; daily finalized",
    consumer: "Messaging reliability on-call and release engineering",
    builtFrom: "Recipient-device delivery lifecycles closed from accepted, routed, delivered, failed, expired, and retry facts.",
    check: "Accepted lifecycle coverage, duplicate rate, late-receipt budget, eligible-device denominator, and regional source-offset completeness.",
    example: "The on-call isolates a p99 delivery regression to one Android release on 4G in ap-south without reading message text or raw phone numbers.",
  },
  {
    id: "delivery-fact",
    table: "gold.fact_message_delivery",
    title: "Certified delivery fact",
    question: "What was the finalized outcome of one logical message for one eligible recipient device?",
    grain: "One tokenized message × recipient device × lifecycle version",
    freshness: "Hourly correction; daily certification",
    consumer: "Reliability analysis, support investigations, and metric builders",
    builtFrom: "silver.message_delivery_event plus send-time membership, linked-device, client, network, and region history.",
    check: "One terminal outcome per lifecycle version, monotonic event ordering, no future membership join, and traceable source coordinates.",
    example: "A late read receipt creates a newer derived lifecycle version while the earlier certified version and its source snapshot remain auditable.",
  },
  {
    id: "calls",
    table: "gold.fact_call_quality",
    title: "Call quality",
    question: "Which completed or failed call cohorts show setup, jitter, packet-loss, or disconnect regressions?",
    grain: "One call participant device × bounded quality window × metric version",
    freshness: "5–15 minutes operational; daily finalized",
    consumer: "Calling reliability and network engineering",
    builtFrom: "Validated call setup outcomes and sampled quality windows; never audio, video, or call content.",
    check: "Sampling rate declared, participant windows bounded, impossible durations rejected, and client/network coverage published.",
    example: "A codec release is compared by coarse region and network class using the same sampling and completion definitions across both versions.",
  },
  {
    id: "media",
    table: "gold.fact_media_transfer",
    title: "Media transfer reliability",
    question: "Where do uploads and downloads fail, retry, or exceed their latency objective?",
    grain: "One tokenized media-transfer attempt × direction × attempt number",
    freshness: "5–15 minutes; daily finalized",
    consumer: "Media infrastructure, client release, and capacity teams",
    builtFrom: "Media upload/download lifecycle metadata, coarse size band, outcome, region, network, and app version—not media bytes.",
    check: "Attempt ordering, terminal outcome, declared retry semantics, byte-band validity, and no content-bearing field.",
    example: "A large-video upload regression appears only on one app version and weak-network cohort, with retry amplification visible separately.",
  },
  {
    id: "network",
    table: "gold.agg_network_quality_daily",
    title: "Network + capacity trend",
    question: "Which regions and network classes need more edge, ingestion, stream, media, or call capacity?",
    grain: "One day × coarse region × network class × workload family",
    freshness: "Daily by regional readiness",
    consumer: "Capacity planning and regional infrastructure",
    builtFrom: "Certified message volume, recipient-device fan-out, retries, media size bands, call windows, and saturation signals.",
    check: "All regional partitions complete, high-cardinality identifiers removed, fan-out amplification explicit, and metric version pinned.",
    example: "Planning sees recipient-device delivery edges growing faster than logical messages and adds processing capacity before a forecast peak.",
  },
] as const;

const ICEBERG_STEPS = [
  {
    code: "01",
    title: "Write + compact files",
    summary: "Spark writes partition-pruned Parquet and rewrites measured small-file hotspots.",
    action: "Write only affected event-time or ingestion-time partitions, cluster within files for measured query patterns, and compact when file size, planning latency, or delete-file ratio crosses a tested threshold.",
    example: "A dense call-quality hour and a sparse group-membership month use different table layouts and maintenance schedules instead of sharing one physical pattern.",
    rule: "Target roughly 256–512 MB files when benchmarks support it; never partition directly by message, user, device, or conversation identifiers.",
    risk: "Tiny files multiply manifests, object-store requests, planning time, and commit conflicts across WhatsApp-scale regional writers.",
  },
  {
    code: "02",
    title: "Commit one snapshot",
    summary: "The catalog atomically makes a complete table version visible.",
    action: "Commit metadata only after every candidate data and delete file is durable and every release check passes. Retry optimistic conflicts with the exact run manifest.",
    example: "All corrected delivery-health partitions for a region/day become visible together; readers never mix old and new hours.",
    rule: "One supported catalog owns snapshot commits. Files written by a failed commit remain invisible and are removed later by orphan cleanup.",
    risk: "Publishing paths or partitions manually lets readers observe incomplete WhatsApp metrics and destroys reproducible rollback.",
  },
  {
    code: "03",
    title: "Read a pinned version",
    summary: "Reproducible jobs use a snapshot ID rather than whatever is current mid-run.",
    action: "Dashboards read the current certified snapshot; investigations, reconciliations, and backfills pin the exact input snapshot and metric version in lineage.",
    example: "An app-release comparison reruns against the same call-quality snapshot even after late samples publish a newer daily version.",
    rule: "Spark, Trino, and serving refresh jobs must share compatible catalog semantics and record the snapshot they consumed.",
    risk: "A long job reading moving inputs can compare different table versions and produce a result nobody can reproduce.",
  },
  {
    code: "04",
    title: "Retain, expire, clean",
    summary: "Keep rollback history long enough, then remove it through Iceberg-aware maintenance.",
    action: "Expire snapshots after the approved recovery and policy window, rewrite manifests and data files when measured, and delete orphan files only after proving no live snapshot references them.",
    example: "Bronze may retain 30–180 days, Silver 6–24 months, and Gold longer by policy; one global forever-retention rule is rejected.",
    rule: "Retention follows recovery, privacy, legal, and consumer contracts. Never delete object-store files behind Iceberg metadata manually.",
    risk: "Expiring too early removes replay evidence; keeping every snapshot forever increases cost, metadata load, and privacy exposure.",
  },
] as const;

function FlowExplorer() {
  const [selectedId, setSelectedId] = useState("archive");
  const selected = FLOW_NODES.find((node) => node.id === selectedId) ?? FLOW_NODES[2];
  return (
    <div data-testid="whatsapp-lakehouse-flow" className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <div data-testid="whatsapp-lakehouse-stage-board" className="overflow-hidden rounded-2xl border border-[#bdbdbd] bg-[#ededed] p-2.5 sm:p-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {FLOW_LANES.map((lane) => (
              <section key={lane.code} aria-label={`${lane.title}: ${lane.note}`} className="overflow-hidden rounded-xl border border-[#bdbdbd] bg-white">
                <div className="bg-[#111] px-2.5 py-2 text-white">
                  <p className="font-mono text-[7px] font-bold text-white/55">STAGE {lane.code}</p>
                  <h3 className="mt-0.5 text-xs font-bold leading-4">{lane.title}</h3>
                  <p className="mt-0.5 text-[8px] leading-3 text-white/65">{lane.note}</p>
                </div>
                <div className="space-y-1.5 p-1.5">
                  {lane.nodes.map((nodeId) => {
                    const node = FLOW_NODES.find((item) => item.id === nodeId)!;
                    const active = selected.id === node.id;
                    const sidePath = node.id === "quarantine";
                    return <button key={node.id} type="button" data-testid={`whatsapp-lakehouse-node-${node.id}`} aria-pressed={active} onMouseEnter={() => setSelectedId(node.id)} onFocus={() => setSelectedId(node.id)} onClick={() => setSelectedId(node.id)} className={`min-h-[78px] w-full rounded-lg border p-2 text-left outline-none transition hover:border-[#555] hover:bg-[#f3f3f3] focus-visible:ring-2 focus-visible:ring-[#111] ${active ? "border-[#111] bg-[#dedede] shadow-[inset_3px_0_0_#111]" : sidePath ? "border-dashed border-[#999] bg-[#f7f7f7]" : "border-[#d0d0d0] bg-white"}`}>
                      <span className="flex items-center justify-between gap-1"><span className="font-mono text-[7px] font-bold text-[#666]">{node.code}</span>{sidePath ? <span className="rounded-full border border-[#aaa] px-1 py-0.5 text-[6px] font-bold text-[#666]">SIDE PATH</span> : null}</span>
                      <strong className="mt-1.5 block text-[10px] leading-3.5 text-[#111]">{node.label}</strong>
                      <span className="mt-1 block text-[8px] leading-3 text-[#666]">{node.meta}</span>
                    </button>;
                  })}
                </div>
              </section>
          ))}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {FLOW_SUPPORT.map((item) => <div key={item.code} className="grid grid-cols-[55px_minmax(0,1fr)] items-center rounded-xl border border-[#bdbdbd] bg-white p-2"><span className="font-mono text-[7px] font-bold text-[#666]">{item.code}</span><div><strong className="text-[10px] text-[#111]">{item.title}</strong><p className="mt-0.5 text-[8px] leading-3.5 text-[#666]">{item.detail}</p></div></div>)}
        </div>
      </div>
      <aside data-testid="whatsapp-lakehouse-inspector" className="overflow-hidden rounded-2xl border border-[#111] bg-white xl:sticky xl:top-[calc(var(--de-chapter-shell-offset)+20px)] xl:self-start" aria-live="polite">
        <div className="bg-[#111] px-4 py-2.5 text-white"><p className="font-mono text-[7px] font-bold text-white/55">{selected.code} · COMPONENT EXPLANATION</p><h3 className="mt-0.5 text-base font-bold">{selected.label}</h3><p className="mt-0.5 text-[10px] text-white/65">{selected.meta}</p></div>
        <div className="divide-y divide-[#d0d0d0]">
          {[["Receives", selected.receives], ["What happens", selected.detail], ["Produces", selected.produces]].map(([label, value], index) => <div key={label} className={index === 1 ? "bg-white px-3 py-2" : "bg-[#f4f4f4] px-3 py-2"}><p className="text-[8px] font-extrabold uppercase tracking-[.14em] text-[#666]">{label}</p><p className="mt-1 text-[11px] leading-4 text-[#333]">{value}</p></div>)}
        </div>
        <div className="divide-y divide-[#d0d0d0] border-t border-[#d0d0d0]">
          <div className="bg-white px-3 py-2"><p className="text-[8px] font-extrabold uppercase tracking-[.14em] text-[#666]">WhatsApp example</p><p className="mt-1 text-[11px] leading-4 text-[#333]">{selected.example}</p></div>
          <div className="bg-[#ededed] px-3 py-2"><p className="text-[8px] font-extrabold uppercase tracking-[.14em] text-[#666]">Interview boundary</p><p className="mt-1 text-[11px] font-semibold leading-4 text-[#111]">{selected.promise}</p></div>
        </div>
      </aside>
    </div>
  );
}

function LayerContracts() {
  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-3" aria-label="Lakehouse layer names">
        {LAYERS.map((layer, index) => <div key={layer.label} data-testid={`whatsapp-layer-heading-${layer.label.toLowerCase()}`} className="flex h-12 items-center gap-3 rounded-xl border border-[#bdbdbd] bg-[#ededed] px-4"><span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#c9c9c9] bg-white font-mono text-[9px] font-bold text-[#333]">0{index + 1}</span><span className="text-sm font-bold text-[#111]">{layer.label}</span><span className="ml-auto hidden text-[10px] text-[#5f5f5f] lg:block">{layer.role}</span></div>)}
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[#bdbdbd]">
        <div className="grid md:grid-cols-3">
          {LAYERS.map((layer) => <article key={layer.label} className="border-b border-[#d8d8d8] bg-white p-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
            <div><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">Table family</p><div className="mt-3 space-y-2">{layer.tables.map((table) => <code key={table} className="block break-all text-[10px] font-bold leading-5 text-[#222]">{table}</code>)}</div></div>
            <div className="mt-4 border-t border-[#d8d8d8] pt-4"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">Transformation contract</p><ul className="mt-3 space-y-2">{layer.transforms.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-[#333]"><span aria-hidden>•</span><span>{item}</span></li>)}</ul></div>
            <div className="mt-4 border-t border-[#d8d8d8] pt-4"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">Storage rule</p><p className="mt-2 text-xs leading-5 text-[#5f5f5f]">{layer.rule}</p></div>
          </article>)}
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7] px-4 py-3 text-xs font-semibold leading-5 text-[#111]">Bronze preserves what arrived. Silver defines a reusable WhatsApp fact. Gold publishes an owned metric. None of these tables accepts, orders, or delivers a live message.</div>
    </div>
  );
}

function ProductContracts() {
  const [selectedId, setSelectedId] = useState("delivery-health");
  const selected = DATA_PRODUCTS.find((item) => item.id === selectedId) ?? DATA_PRODUCTS[0];
  return (
    <div className="mt-6">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {DATA_PRODUCTS.map((item, index) => <button key={item.id} type="button" data-testid={`whatsapp-product-${item.id}`} aria-pressed={selected.id === item.id} onMouseEnter={() => setSelectedId(item.id)} onFocus={() => setSelectedId(item.id)} onClick={() => setSelectedId(item.id)} className={`min-h-[102px] rounded-xl border p-3 text-left outline-none transition hover:border-[#555] hover:bg-[#f3f3f3] focus-visible:ring-2 focus-visible:ring-[#111] ${selected.id === item.id ? "border-[#111] bg-[#dedede] shadow-[inset_0_4px_0_#111]" : "border-[#d0d0d0] bg-white"}`}>
          <span className="font-mono text-[8px] font-bold text-[#666]">PRODUCT {String(index + 1).padStart(2, "0")}</span>
          <strong className="mt-2 block text-xs leading-4 text-[#111]">{item.title}</strong>
          <code className="mt-2 block break-all text-[9px] leading-4 text-[#666]">{item.table}</code>
        </button>)}
      </div>
      <article data-testid="whatsapp-product-inspector" className="mt-3 overflow-hidden rounded-2xl border border-[#111] bg-white" aria-live="polite">
        <div className="bg-[#111] px-4 py-2.5 text-white"><p className="font-mono text-[7px] font-bold text-white/55">{selected.table} · DATA PRODUCT CONTRACT</p><h3 className="mt-0.5 text-base font-bold">{selected.title}</h3><p className="mt-1 max-w-4xl text-[10px] leading-4 text-white/70">{selected.question}</p></div>
        <div className="grid gap-px bg-[#d0d0d0] md:grid-cols-3">
          {[["Grain", selected.grain], ["Freshness", selected.freshness], ["Named consumer", selected.consumer]].map(([label, value], index) => <div key={label} className={index === 1 ? "bg-[#ededed] p-4" : "bg-white p-4"}><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#666]">{label}</p><p className="mt-2 text-xs font-semibold leading-5 text-[#111]">{value}</p></div>)}
        </div>
        <div className="grid gap-px border-t border-[#d0d0d0] bg-[#d0d0d0] lg:grid-cols-3">
          {[["Built from", selected.builtFrom], ["Certification check", selected.check], ["WhatsApp example", selected.example]].map(([label, value], index) => <div key={label} className={index === 1 ? "bg-[#f4f4f4] p-4" : "bg-white p-4"}><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#666]">{label}</p><p className="mt-2 text-xs leading-5 text-[#333]">{value}</p></div>)}
        </div>
      </article>
    </div>
  );
}

function TableLayout() {
  const [selectedId, setSelectedId] = useState("delivery");
  const selected = TABLE_DESIGNS.find((item) => item.id === selectedId) ?? TABLE_DESIGNS[0];
  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,.95fr)]">
      <div className="grid gap-3">
        {TABLE_DESIGNS.map((item) => <button key={item.id} type="button" data-testid={`whatsapp-table-${item.id}`} aria-pressed={selectedId === item.id} onMouseEnter={() => setSelectedId(item.id)} onFocus={() => setSelectedId(item.id)} onClick={() => setSelectedId(item.id)} className={`rounded-2xl border p-4 text-left outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#111] ${selectedId === item.id ? "border-[#111] bg-[#ededed] shadow-[0_8px_20px_rgba(0,0,0,.09)]" : "border-[#d8d8d8] bg-white"}`}>
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-bold text-[#111]">{item.label}</h3><code className="mt-1 block text-[10px] font-bold text-[#555]">{item.table}</code></div><Badge dark={selectedId === item.id}>{item.id}</Badge></div>
          <p className="mt-3 text-[9px] font-extrabold uppercase tracking-[.13em] text-[#777]">Grain</p><p className="mt-1 text-xs font-semibold leading-5 text-[#111]">{item.grain}</p>
          <code className="mt-3 block rounded-lg border border-[#d8d8d8] bg-white px-3 py-2 text-[10px] font-bold leading-5 text-[#333]">PARTITIONED BY ({item.partition})</code>
        </button>)}
      </div>
      <aside data-testid="whatsapp-table-inspector" className="overflow-hidden rounded-2xl border-2 border-[#111] bg-[#ededed] xl:sticky xl:top-[calc(var(--de-chapter-shell-offset)+20px)] xl:self-start" aria-live="polite">
        <div className="border-b border-[#c9c9c9] bg-white p-5"><p className="text-[9px] font-extrabold uppercase tracking-[.17em] text-[#777]">Iceberg design explained</p><h3 className="mt-1 text-lg font-bold text-[#111]">{selected.label}</h3></div>
        <div className="space-y-4 p-5"><p className="text-sm leading-6 text-[#333]">{selected.decision}</p>{[["Typical questions", selected.queries], ["Sort within files", selected.sort], ["Partition transforms", selected.partition]].map(([label, value]) => <div key={label} className="rounded-xl border border-[#c9c9c9] bg-white p-3"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">{label}</p><p className="mt-1 text-xs font-bold leading-5 text-[#111]">{value}</p></div>)}</div>
      </aside>
      <div className="grid gap-3 xl:col-span-2 md:grid-cols-3">
        {[{ label: "Compressed lake input", value: "60.1 TB/day", formula: "370B events/day × 650 B ÷ 4 compression" }, { label: "Target data files", value: "256–512 MB", formula: "Compact measured small-file partitions toward the tested range" }, { label: "Fleet-wide file floor", value: "≈117K/day", formula: "60.1 TB/day ÷ 512 MB/file; distributed by table, region and time" }].map((item) => <article key={item.label} className="rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.13em] text-[#777]">{item.label}</p><strong className="mt-2 block text-xl tracking-[-.04em] text-[#111]">{item.value}</strong><code className="mt-2 block text-[10px] leading-5 text-[#555]">{item.formula}</code></article>)}
      </div>
      <div className="rounded-2xl border border-[#d8d8d8] bg-white p-4 xl:col-span-2"><div className="flex flex-wrap items-center gap-2"><strong className="mr-2 text-xs text-[#111]">Compact when evidence says to:</strong>{["average file < 64 MB", "small-file count rises", "planning latency rises", "delete-file ratio rises"].map((item) => <Badge key={item}>{item}</Badge>)}</div><p className="mt-3 text-xs leading-5 text-[#5f5f5f]">Iceberg tracks snapshots, manifests, data files, delete files, schemas, and partition specs. Rewrite through Iceberg-aware maintenance; never manually delete object-store files behind the table metadata.</p></div>
    </div>
  );
}

function IcebergLifecycle() {
  const [selectedStep, setSelectedStep] = useState(0);
  const selected = ICEBERG_STEPS[selectedStep];
  return (
    <div className="mt-6">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {ICEBERG_STEPS.map((item, index) => <button key={item.code} type="button" data-testid={`whatsapp-iceberg-step-${item.code}`} aria-pressed={selectedStep === index} onMouseEnter={() => setSelectedStep(index)} onFocus={() => setSelectedStep(index)} onClick={() => setSelectedStep(index)} className={`min-h-[116px] rounded-xl border p-3 text-left outline-none transition hover:border-[#555] hover:bg-[#f3f3f3] focus-visible:ring-2 focus-visible:ring-[#111] ${selectedStep === index ? "border-[#111] bg-[#dedede] shadow-[inset_0_4px_0_#111]" : "border-[#d0d0d0] bg-white"}`}><span className="font-mono text-[8px] font-bold text-[#666]">STEP {item.code}</span><strong className="mt-2 block text-xs text-[#111]">{item.title}</strong><span className="mt-2 block text-[9px] leading-4 text-[#666]">{item.summary}</span></button>)}
      </div>
      <article data-testid="whatsapp-iceberg-inspector" className="mt-3 overflow-hidden rounded-2xl border border-[#bdbdbd] bg-white" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111] px-5 py-3 text-white"><div><p className="font-mono text-[8px] font-bold text-white/55">ICEBERG {selected.code}</p><h3 className="mt-1 text-base font-bold">{selected.title}</h3></div><Badge>{selectedStep + 1}/{ICEBERG_STEPS.length}</Badge></div>
        <div className="grid gap-px bg-[#d0d0d0] md:grid-cols-2">
          {[["What happens", selected.action], ["WhatsApp example", selected.example], ["Safety rule", selected.rule], ["If skipped or done badly", selected.risk]].map(([label, value], index) => <div key={label} className={index === 1 || index === 2 ? "bg-[#ededed] p-4" : "bg-white p-4"}><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#666]">{label}</p><p className="mt-2 text-xs leading-5 text-[#333]">{value}</p></div>)}
        </div>
      </article>
    </div>
  );
}

function DagTimeline() {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-[#bdbdbd]">
      <div className="hidden grid-cols-[110px_1fr_1.35fr_1.55fr_1fr] gap-3 border-b border-[#d8d8d8] bg-[#ededed] px-4 py-3 text-[9px] font-extrabold uppercase tracking-[.13em] text-[#555] md:grid"><span>Cadence</span><span>Pipeline</span><span>Starts when</span><span>Processing</span><span>Output</span></div>
      {DAGS.map((dag, index) => <article key={dag.name} className="grid gap-3 border-b border-[#d8d8d8] bg-white p-4 last:border-b-0 md:grid-cols-[110px_1fr_1.35fr_1.55fr_1fr] md:items-center"><div className="flex items-center justify-between gap-2 md:block"><Badge dark={index === 3}>{dag.cadence}</Badge><span className="font-mono text-[9px] text-[#777] md:hidden">0{index + 1}</span></div><div><p className="text-[9px] font-extrabold uppercase tracking-[.13em] text-[#777] md:hidden">Pipeline</p><h3 className="mt-1 text-xs font-bold text-[#111] md:mt-0">{dag.name}</h3></div><div><p className="text-[9px] font-extrabold uppercase tracking-[.13em] text-[#777] md:hidden">Starts when</p><p className="mt-1 text-xs leading-5 text-[#5f5f5f] md:mt-0">{dag.starts}</p></div><div><p className="text-[9px] font-extrabold uppercase tracking-[.13em] text-[#777] md:hidden">Processing</p><p className="mt-1 text-xs font-semibold leading-5 text-[#333] md:mt-0">{dag.work}</p></div><div><p className="text-[9px] font-extrabold uppercase tracking-[.13em] text-[#777] md:hidden">Output</p><p className="mt-1 text-xs font-bold leading-5 text-[#111] md:mt-0">{dag.output}</p></div></article>)}
      <div className="border-t border-[#d8d8d8] bg-[#f7f7f7] px-4 py-3 text-xs leading-5 text-[#5f5f5f]"><strong className="text-[#111]">Readiness gate:</strong> source offsets closed → Bronze count reconciled → Silver quality passed → Gold metric version approved → snapshot published.</div>
    </div>
  );
}

function ReplayBoundary() {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-[#bdbdbd]">
      <div className="grid md:grid-cols-[1fr_86px_1fr]">
        <div className="bg-white p-5"><p className="font-mono text-[9px] font-bold text-[#555]">SAFE ANALYTICAL REPLAY</p><h3 className="mt-2 text-sm font-bold text-[#111]">Events → shadow facts → compared products</h3><p className="mt-2 text-xs leading-6 text-[#555]">Reapply deterministic transformations to immutable evidence, write idempotent analytical sinks, reconcile, and publish a new snapshot version.</p></div>
        <div className="flex items-center justify-center bg-[#111] px-3 py-4 font-mono text-[9px] font-bold text-white">HARD STOP</div>
        <div className="bg-[#ededed] p-5"><p className="font-mono text-[9px] font-bold text-[#555]">NEVER REISSUE</p><h3 className="mt-2 text-sm font-bold text-[#111]">Message, receipt, group, media, or call commands</h3><p className="mt-2 text-xs leading-6 text-[#555]">Historical evidence never authorizes WhatsApp to resend a message, emit a second delivery/read receipt, alter membership, restart media transfer, ring a call, or notify a user.</p></div>
      </div>
      <div className="border-t border-[#cfcfcf] bg-[#f7f7f7] px-5 py-3 text-xs leading-5 text-[#555]"><strong className="text-[#111]">Operational invariant:</strong> batch and lakehouse availability may affect analytics freshness, but it never sits on the encrypted messaging path or changes live delivery truth.</div>
    </div>
  );
}

export default function WhatsAppBatchLakehouse() {
  return (
    <div className="mt-5 space-y-5">
      <LakehouseSection id="lakehouse-flow" eyebrow="01 · Lakehouse flow" title="Source evidence → trusted WhatsApp facts → certified products" subtitle="Follow a declared WhatsApp event range through preservation, conformance, point-in-time modeling, release gates, atomic publication, and purpose-built consumption. Hover, focus, or tap any component for its exact responsibility."><FlowExplorer /></LakehouseSection>
      <LakehouseSection id="lakehouse-layers" eyebrow="02 · Layer contracts" title="Give Bronze, Silver, and Gold one promise each" subtitle="The layers are not copies with nicer names. Each one changes the contract, allowed transformation, consumers, and publication guarantee."><LayerContracts /></LakehouseSection>
      <LakehouseSection id="data-products" eyebrow="03 · Data products" title="Make every WhatsApp product defend its grain, consumer, and certification" subtitle="A Gold table is useful only when its question, row grain, freshness, source facts, quality gate, and named consumer are explicit. Inspect each product to see the complete contract."><ProductContracts /></LakehouseSection>
      <LakehouseSection id="iceberg-layout" eyebrow="04 · Table + file layout" title="Design Iceberg for WhatsApp query shape and scale" subtitle="Choose grain first, then hidden partition transforms, sort order, file targets, compaction signals, and snapshot policy. Inspect each table for the reasoning behind its layout."><TableLayout /></LakehouseSection>
      <LakehouseSection id="iceberg-lifecycle" eyebrow="05 · Iceberg mechanics" title="Publish one version, pin every read, and clean through metadata" subtitle="Iceberg is more than Parquet. Its catalog, snapshots, manifests, data files, delete files, schemas, and partition specs make atomic release, reproducibility, rollback, and policy-aware cleanup possible."><IcebergLifecycle /></LakehouseSection>
      <LakehouseSection id="batch-orchestration" eyebrow="06 · Batch DAGs" title="Orchestrate data readiness—not just a clock" subtitle="WhatsApp pipelines wait for bounded source ranges and reference history, repair late mobile outcomes, reconcile counts, and publish only after quality and privacy gates pass."><DagTimeline /></LakehouseSection>
      <LakehouseSection id="replay-boundary" eyebrow="07 · Replay boundary" title="Replay analytical facts—never WhatsApp side effects" subtitle="The lakehouse can reconstruct trusted history. It cannot authorize a second customer-visible action or take ownership of message delivery, group state, media transfer, or calling."><ReplayBoundary /></LakehouseSection>
    </div>
  );
}
