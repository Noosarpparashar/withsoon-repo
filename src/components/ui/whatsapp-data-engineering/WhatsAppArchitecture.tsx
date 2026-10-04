"use client";

import { useState, type ReactNode } from "react";

function ArchitectureSection({
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
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[#5f5f5f] xl:max-w-[680px]">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

type ArchitectureNode = {
  id: string;
  code: string;
  label: string;
  layer: string;
  short: string;
  summary: string;
  decision: string;
  receives: string;
  produces: string;
  guarantee: string;
};

const NODES: Record<string, ArchitectureNode> = {
  messaging: {
    id: "messaging",
    code: "MSG",
    label: "Message + delivery",
    layer: "Operational producer",
    short: "accepted · routed · delivered",
    summary: "When WhatsApp accepts an encrypted message, routes it, delivers it to a phone or linked device, or receives a read receipt, this service records that exact lifecycle step. The event contains delivery metadata—not the message text.",
    decision: "The messaging database and device queues remain the source of truth. An analytics event is created only after the messaging state is committed, so a dashboard can never claim delivery before WhatsApp actually delivered the ciphertext.",
    receives: "A sender request, the encrypted message ID, recipient-device routing attempts, delivery acknowledgements, retries, read receipts when enabled, and expiry or failure outcomes.",
    produces: "One privacy-safe event for each committed step, such as message_accepted or message_delivered, carrying message and device tokens, timestamps, region, retry count, and outcome.",
    guarantee: "Analytics reflects committed WhatsApp delivery state",
  },
  groupDevice: {
    id: "groupDevice",
    code: "GRP",
    label: "Group + device state",
    layer: "Operational producer",
    short: "membership · eligible devices",
    summary: "This component tells analytics who belonged to a WhatsApp group and which linked devices were eligible when a message was sent. That context explains why one group send can create hundreds of recipient and device deliveries.",
    decision: "Store versioned history instead of using the group or device list visible today. If a member left at 10:05, a message sent at 10:00 must still use the 10:00 membership version.",
    receives: "Member joins and removals, group changes, phone or desktop registration, device removal, authentication changes, and the membership version used for fan-out.",
    produces: "Group-membership history, eligible-device history, one event for the sender’s group action, and separate delivery outcomes for each eligible recipient device.",
    guarantee: "Correct recipients and devices for the send time",
  },
  mediaCall: {
    id: "mediaCall",
    code: "QOE",
    label: "Media + call quality",
    layer: "Operational producer",
    short: "transfer outcome · quality samples",
    summary: "For photos and videos, analytics records whether an encrypted upload or download succeeded. For calls, it records setup, connection, ending, and sampled quality such as delay or packet loss. It never receives the photo, video, or call content.",
    decision: "Large encrypted media stays in blob storage, not Kafka. Healthy calls can send summarized quality windows, while failed or poor calls retain more diagnostic metadata for investigation.",
    receives: "Upload and download attempts, encrypted-object references, call start and connect events, plus sampled RTT, jitter, packet loss, bitrate, and frame drops.",
    produces: "Small events such as media_upload_completed or call_quality_sample with tokenized IDs, coarse device and network context, region, duration, and outcome.",
    guarantee: "Transfer and call quality visibility without content access",
  },
  publisher: {
    id: "publisher",
    code: "PUB",
    label: "Outbox + event gateway",
    layer: "Regional ingestion",
    short: "validate · classify · acknowledge",
    summary: "This is the safe doorway from WhatsApp services into the data platform. It takes an event only after the source action has committed, checks that the event is valid and privacy-safe, then writes it durably to the correct topic.",
    decision: "Use an outbox or CDC for delivery-critical facts so a service cannot commit message state and silently lose its analytics event. Client telemetry uses bounded batches and explicit acceptance or rejection.",
    receives: "Committed outbox records, database changes, client telemetry batches, schema versions, privacy labels, producer identity, source timestamps, and trace IDs.",
    produces: "Validated events in WhatsApp domain topics, rejected records in quarantine with a reason, and a trusted ingestion timestamp for measuring arrival delay.",
    guarantee: "No silent gap between committed state and analytical events",
  },
  kafka: {
    id: "kafka",
    code: "LOG",
    label: "Kafka / Pulsar",
    layer: "Durable event backbone",
    short: "regional topics · bounded replay",
    summary: "Kafka is the regional waiting and distribution layer for WhatsApp events. A message-delivered event is written once, then Flink, the Bronze sink, quality checks, and future consumers can read it independently.",
    decision: "Keep delivery events separate from very large call or client-telemetry streams. Partition ordinary message events by the key that needs ordering, and split extremely hot groups across controlled buckets.",
    receives: "Validated message, group, device, media, call, notification, trust, and service-health events from publishers in the same region.",
    produces: "Retained topic partitions that streaming jobs and lake sinks consume at their own speed. Ordering exists inside a partition, not across all of WhatsApp.",
    guarantee: "One durable regional event stream for many consumers",
  },
  flink: {
    id: "flink",
    code: "FAST",
    label: "Flink streaming",
    layer: "Fast processing path",
    short: "seconds · event-time state",
    summary: "Flink turns individual WhatsApp events into live operational answers: delivery latency by region, reconnect spikes, push failures, group fan-out progress, and worsening call quality.",
    decision: "Process by event time because phones can be offline and upload events late. Deduplicate stable event IDs, keep short-lived keyed state, and wait only a bounded period before publishing a provisional window.",
    receives: "Kafka events plus versioned group membership, linked-device history, app and network taxonomies, schema definitions, and metric rules.",
    produces: "Updated delivery facts, five-minute health aggregates, regional alerts, push and reconnect metrics, call-quality signals, and realtime-store upserts.",
    guarantee: "Fast WhatsApp health signals that can be corrected later",
  },
  bronze: {
    id: "bronze",
    code: "RAW",
    label: "Bronze Iceberg",
    layer: "Immutable evidence",
    short: "raw bytes · source coordinates",
    summary: "Bronze is WhatsApp’s immutable analytical evidence store. It keeps every accepted event in object storage exactly as received, together with where it came from in Kafka.",
    decision: "Do not clean or reshape the only raw copy. Store economical Parquet files behind Iceberg metadata so a broken transformation or new metric can replay the original event history later.",
    receives: "Complete Kafka records, including late mobile events, source topic and offset, schema ID, ingestion timestamp, region, and records that newer jobs may understand better.",
    produces: "Time-partitioned raw snapshots from which Silver and Gold can be rebuilt without disturbing live Kafka consumers or asking source services to resend old events.",
    guarantee: "An unchanged source for replay, audit, and correction",
  },
  spark: {
    id: "spark",
    code: "BATCH",
    label: "Spark + orchestration",
    layer: "Truth processing path",
    short: "backfill · large joins · correction",
    summary: "Spark handles WhatsApp work that needs more history than a live stream should keep: closing very late events, joining large device histories, rebuilding a day, compacting files, and correcting metrics.",
    decision: "Write a corrected day into shadow Silver and Gold tables first. Compare it with source and current counts, then switch consumers to the new snapshot only after every check passes.",
    receives: "A declared Bronze snapshot and date range, versioned device or group dimensions, trust decisions, deletion requests, metric definitions, and quality rules.",
    produces: "Corrected delivery and quality facts, certified aggregates, compacted Iceberg files, reconciliation results, and a run record showing exactly what changed.",
    guarantee: "Safe historical fixes without disrupting live analytics",
  },
  certified: {
    id: "certified",
    code: "CURATED",
    label: "Silver + Gold",
    layer: "Certified lakehouse products",
    short: "conformed facts · trusted metrics",
    summary: "Silver creates reusable WhatsApp facts such as one message-and-recipient-device delivery outcome. Gold turns those facts into published products such as regional delivery health, call quality, media reliability, and capacity trends.",
    decision: "Give each layer one promise: Bronze preserves what arrived, Silver decides the correct grain and removes duplicates, and Gold commits to a named metric definition for consumers.",
    receives: "Validated records that passed schema and privacy checks, plus reconciliation evidence showing that source, Kafka, Bronze, and transformed counts agree within policy.",
    produces: "Versioned Iceberg tables with a documented grain, owner, freshness target, lineage, quality status, retention policy, metric version, and rollback snapshot.",
    guarantee: "One documented and reproducible definition per product",
  },
  realtime: {
    id: "realtime",
    code: "OLAP",
    label: "Realtime OLAP",
    layer: "Low-latency serving",
    short: "Pinot · Druid · ClickHouse",
    summary: "Pinot, Druid, or ClickHouse powers the screens an on-call engineer opens during a WhatsApp incident: delivery latency by region, queue growth, reconnects, push failures, and call-quality changes.",
    decision: "Load small privacy-safe aggregates instead of every raw event. This keeps filters fast and predictable; Bronze remains the durable history and Gold remains the certified definition.",
    receives: "Flink upserts grouped by time bucket, region, platform, app version, coarse network class, event family, and outcome—without message content or raw identity.",
    produces: "Fast operational dashboards, alert queries, and drill-down slices that clearly show whether values are provisional and how old the newest data is.",
    guarantee: "Fast incident views with honest freshness",
  },
  warehouse: {
    id: "warehouse",
    code: "SQL",
    label: "Trino + BI",
    layer: "Historical serving",
    short: "ad hoc SQL · certified products",
    summary: "Trino and BI tools answer longer-range WhatsApp questions: how delivery reliability changed over months, which app version increased failures, where capacity is growing, or how an experiment affected a certified metric.",
    decision: "Point analysts to Silver and Gold products with shared metric definitions, not raw lifecycle events. Keep exploratory queries on separate compute from ingestion, compaction, and publication jobs.",
    receives: "Published lakehouse snapshots, approved metric definitions, access policies, masked dimensions, and query workload limits.",
    produces: "Governed dashboards, scheduled reliability and capacity reports, incident investigations, experiment scorecards, and approved offline datasets.",
    guarantee: "Consistent historical analysis from certified WhatsApp data",
  },
  governance: {
    id: "governance",
    code: "CTRL",
    label: "Contracts + governance",
    layer: "Cross-cutting control plane",
    short: "schema · privacy · lineage · SLO",
    summary: "This control layer makes sure every WhatsApp dataset has an owner, compatible schema, privacy classification, retention period, freshness target, quality result, lineage trail, and deletion behavior.",
    decision: "Enforce policy when data enters Kafka, when jobs transform it, when tables publish, and when users query it. A privacy rule written only in documentation is not an architectural control.",
    receives: "Schema changes, privacy labels, ownership records, lineage events, quality checks, access requests, retention rules, regional-residency policy, and deletion commands.",
    produces: "Allow or reject decisions, quarantined records, masked views, catalog entries, freshness status, audit logs, deletion evidence, and approval to publish a data product.",
    guarantee: "Every WhatsApp data product is owned, explainable, and policy-controlled",
  },
};

const MAP_COLUMNS = [
  { label: "Producers", nodes: ["messaging", "groupDevice", "mediaCall"] },
  { label: "Ingestion", nodes: ["publisher", "kafka"] },
  { label: "Processing", nodes: ["flink", "spark"] },
  { label: "Lakehouse", nodes: ["bronze", "certified"] },
  { label: "Serving", nodes: ["realtime", "warehouse"] },
] as const;

function NodeButton({ id, active, onSelect }: { id: keyof typeof NODES; active: boolean; onSelect: (id: string) => void }) {
  const node = NODES[id];
  return (
    <button
      type="button"
      aria-pressed={active}
      data-testid={`whatsapp-architecture-node-${node.id}`}
      onMouseEnter={() => onSelect(id)}
      onFocus={() => onSelect(id)}
      onClick={() => onSelect(id)}
      className={`min-h-[104px] rounded-xl border p-3 text-left transition ${active ? "border-[#111] bg-[#ededed] shadow-sm" : "border-[#d8d8d8] bg-white hover:-translate-y-0.5 hover:border-[#777]"}`}
    >
      <span className="flex items-center justify-between gap-2"><span className={`rounded-md px-2 py-1 font-mono text-[9px] font-bold ${active ? "bg-[#111] text-white" : "bg-[#ededed] text-[#333]"}`}>{node.code}</span><span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-[#111]" : "bg-[#aaa]"}`} /></span>
      <strong className="mt-2.5 block text-xs leading-[18px] text-[#111]">{node.label}</strong>
      <span className="mt-1.5 block font-mono text-[10px] leading-[17px] text-[#555]">{node.short}</span>
    </button>
  );
}

const BOUNDARIES = [
  {
    id: "online",
    code: "01",
    label: "WhatsApp delivery systems",
    owns: "Accept, route, queue, and deliver encrypted messages",
    detail: "This is the WhatsApp path used by real people. The sender’s phone encrypts the message, an edge gateway receives it, messaging services route it, and device queues hold it until each eligible recipient device can acknowledge delivery.",
    example: "A recipient is offline. WhatsApp accepts the ciphertext, stores it in the device queue, later delivers it to the phone, and records the acknowledgement. None of those steps waits for an analytics job.",
    must: "This layer alone decides whether the message was accepted, which group members and linked devices were eligible, the delivery order for the chosen key, and the final per-device outcome.",
    never: "A Kafka event, Flink result, lakehouse table, or dashboard can describe what happened, but it cannot accept a message, deliver ciphertext, or change live group membership.",
  },
  {
    id: "seam",
    code: "02",
    label: "Event publishing bridge",
    owns: "Copy committed WhatsApp facts into the data platform safely",
    detail: "After a WhatsApp service commits a real state change, this bridge creates the matching analytical event. An outbox or CDC process prevents the common failure where delivery succeeds but its event disappears before reaching Kafka.",
    example: "The message service commits message_accepted and an outbox record together. If Kafka is temporarily unavailable, the message remains accepted and the same outbox event is retried later with the same event_id.",
    must: "It validates the schema, adds a trusted ingestion time, preserves the source event time and region, verifies the privacy label, and sends invalid records to quarantine with a visible reason.",
    never: "It never copies message text, encryption keys, raw phone numbers, contact books, or media bytes. A publishing delay must never roll back or block a successful WhatsApp delivery action.",
  },
  {
    id: "data",
    code: "03",
    label: "WhatsApp analytics platform",
    owns: "Turn privacy-safe lifecycle events into reliable metrics",
    detail: "Kafka retains the events, Flink creates live operational views, Bronze keeps the original analytical evidence, Spark corrects history, Silver and Gold publish trusted facts, and OLAP or Trino serves the results.",
    example: "Millions of message_delivered events become a five-minute delivery-latency dashboard by region and platform. Later-arriving mobile events are replayed from Bronze so the certified daily metric can correct the provisional view.",
    must: "It deduplicates retries, processes by event time, joins the correct device or membership version, applies privacy rules, reconciles counts, publishes documented metrics, and exposes freshness or staleness.",
    never: "It cannot declare that a live message was delivered, add someone to a group, wake an offline device, or recover message content. Those decisions remain inside WhatsApp’s operational services.",
  },
] as const;

export default function WhatsAppArchitecture() {
  const [nodeId, setNodeId] = useState("kafka");
  const [boundaryIndex, setBoundaryIndex] = useState(1);
  const node = NODES[nodeId];
  const boundary = BOUNDARIES[boundaryIndex];

  return (
    <div className="mt-5 space-y-5">
      <ArchitectureSection id="architecture-map" eyebrow="01 · Architecture map" title="One regional backbone, two processing paths" subtitle="Follow privacy-safe WhatsApp lifecycle events from operational producers through durable regional ingestion, fast streaming, immutable history, certified products, and workload-specific serving.">
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
          <div className="rounded-2xl border border-[#d8d8d8] bg-[#ededed] p-3">
            <div className="grid gap-2 xl:grid-cols-[1fr_14px_1fr_14px_1fr_14px_1fr_14px_1fr] xl:items-start">
              {MAP_COLUMNS.map((column, columnIndex) => (
                <div className="contents" key={column.label}>
                  <div className="rounded-xl border border-[#cfcfcf] bg-[#f7f7f7] p-2">
                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#555]">{column.label}</p>
                    <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">{column.nodes.map((id) => <NodeButton key={id} id={id} active={nodeId === id} onSelect={setNodeId} />)}</div>
                  </div>
                  {columnIndex < MAP_COLUMNS.length - 1 ? <span className="hidden self-center text-center text-[#777] xl:block" aria-hidden>→</span> : null}
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-dashed border-[#999] bg-white p-2">
              <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[.15em] text-[#555]">Cross-cutting control plane</p>
              <NodeButton id="governance" active={nodeId === "governance"} onSelect={setNodeId} />
            </div>
          </div>

          <aside data-testid="whatsapp-architecture-inspector" className="overflow-hidden rounded-2xl border-2 border-[#111] bg-[#ededed] shadow-[0_10px_28px_rgba(0,0,0,.08)] xl:-mt-[70px] xl:sticky xl:top-[calc(var(--de-chapter-shell-offset)+20px)] xl:self-start" aria-live="polite">
            <div className="flex items-center justify-between gap-3 bg-[#111] px-4 py-3 text-white"><p className="text-[9px] font-extrabold uppercase tracking-[.17em]">Component explanation</p><span className="rounded-md border border-white/20 px-2 py-1 font-mono text-[8px]">{node.code}</span></div>
            <div className="border-b border-[#c9c9c9] p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#666]">{node.layer}</p><h3 className="mt-1.5 text-lg font-bold">{node.label}</h3><p className="mt-2 text-xs leading-6 text-[#444]">{node.summary}</p></div>
            <div className="grid gap-px bg-[#c9c9c9] sm:grid-cols-2 xl:grid-cols-1">
              {[
                ["Why WhatsApp needs this design", node.decision],
                ["What comes in", node.receives],
                ["What comes out", node.produces],
              ].map(([label, value]) => <div key={label} className="bg-[#ededed] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">{label}</p><p className="mt-1.5 text-[11px] leading-5 text-[#333]">{value}</p></div>)}
            </div>
            <div className="border-t-2 border-[#111] bg-white p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">Architecture promise</p><p className="mt-1 text-xs font-bold text-[#111]">{node.guarantee}</p></div>
          </aside>
        </div>
      </ArchitectureSection>

      <ArchitectureSection id="architecture-boundary" eyebrow="02 · System boundary" title="Keep messaging available when analytics is unhealthy" subtitle="The architecture has a deliberate asynchronous seam: operational services own live messaging state, while the big-data platform owns replayable analytical truth. Choose a boundary to inspect its responsibility.">
        <div className="mt-6 grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
          {BOUNDARIES.map((item, index) => (
            <div className="contents" key={item.id}>
              <button type="button" aria-pressed={boundaryIndex === index} onMouseEnter={() => setBoundaryIndex(index)} onFocus={() => setBoundaryIndex(index)} onClick={() => setBoundaryIndex(index)} className={`min-h-[126px] rounded-2xl border p-4 text-left transition ${boundaryIndex === index ? "border-2 border-[#111] bg-[#ededed] shadow-sm" : "border-[#d8d8d8] bg-[#f7f7f7] hover:border-[#777] hover:bg-white"}`}><span className={`font-mono text-[9px] font-bold ${boundaryIndex === index ? "text-[#111]" : "text-[#777]"}`}>{item.code}</span><h3 className="mt-3 text-sm font-bold">{item.label}</h3><p className="mt-2 text-[11px] leading-5 text-[#5f5f5f]">{item.owns}</p></button>
              {index < BOUNDARIES.length - 1 ? <div className="hidden items-center justify-center lg:flex"><span className="rounded-full border border-[#c7c7c7] bg-white px-2 py-1 text-[9px] font-bold text-[#666]">async →</span></div> : null}
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border-2 border-[#111] bg-[#ededed]" aria-live="polite">
          <div className="flex items-center justify-between gap-3 bg-[#111] px-4 py-3 text-white"><p className="text-[9px] font-extrabold uppercase tracking-[.17em]">Boundary explanation</p><p className="font-mono text-[9px] text-white/65">{boundary.code} / 03</p></div>
          <div className="p-4"><h3 className="text-base font-bold">{boundary.label}</h3><p className="mt-2 text-xs leading-6 text-[#444]">{boundary.detail}</p></div>
          <div className="grid gap-px bg-[#c9c9c9] md:grid-cols-3"><div className="bg-[#ededed] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">WhatsApp example</p><p className="mt-2 text-[11px] leading-5 text-[#333]">{boundary.example}</p></div><div className="bg-[#ededed] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">What this stage decides</p><p className="mt-2 text-[11px] leading-5 text-[#333]">{boundary.must}</p></div><div className="bg-[#ededed] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">What it cannot decide</p><p className="mt-2 text-[11px] leading-5 text-[#333]">{boundary.never}</p></div></div>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#bdbdbd] bg-white">
          <div className="border-b border-[#d8d8d8] bg-[#f2f2f2] px-4 py-3"><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#555]">Why WhatsApp splits the data path after Kafka</p></div>
          <div className="grid md:grid-cols-2">
            <div className="border-b border-[#d8d8d8] p-5 md:border-b-0 md:border-r"><p className="font-mono text-[9px] font-bold text-[#777]">LIVE WHATSAPP HEALTH · SECONDS</p><h3 className="mt-2 text-sm font-bold">Flink → Pinot / ClickHouse</h3><p className="mt-2 text-xs leading-6 text-[#555]">As <code>message_accepted</code>, <code>message_delivered</code>, reconnect, push, and call-quality events arrive, Flink removes duplicate event IDs and calculates one- and five-minute metrics by region, app version, platform, and network class. Operations can see a delivery-latency spike quickly, but the view remains provisional because offline phones may report late.</p></div>
            <div className="p-5"><p className="font-mono text-[9px] font-bold text-[#777]">CERTIFIED WHATSAPP TRUTH · MINUTES TO HOURS</p><h3 className="mt-2 text-sm font-bold">Bronze → Spark → Silver / Gold</h3><p className="mt-2 text-xs leading-6 text-[#555]">Bronze keeps every accepted event unchanged. Spark later rereads the complete window, includes delayed mobile receipts, removes retry duplicates, and joins the device or group-membership version that existed when the message was sent. It rebuilds device-level delivery facts and publishes corrected daily reliability metrics only after reconciliation passes.</p></div>
          </div>
          <p className="border-t border-[#d8d8d8] px-4 py-3 text-center text-[11px] font-bold text-[#333]">The same WhatsApp events provide fast incident signals first and corrected official metrics later.</p>
        </div>
      </ArchitectureSection>

    </div>
  );
}
