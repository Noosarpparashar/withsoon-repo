"use client";

import { useState, type ReactNode } from "react";

function ArchitectureSection({ id, eyebrow, title, subtitle, children }: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-40 rounded-[26px] border border-[#d8d8d8] bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,.055)] sm:p-7">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[#111]" aria-hidden />
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.19em] text-[#111]">{eyebrow}</p>
          <h2 className="mt-1.5 text-2xl font-bold tracking-[-.04em] text-[#111] sm:text-[28px]">{title}</h2>
          <p className="mt-2 max-w-[760px] text-sm leading-6 text-[#5f5f5f]">{subtitle}</p>
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
  commerce: {
    id: "commerce", code: "OLTP", label: "Commerce services", layer: "Operational producers", short: "orders · money · supply",
    summary: "Checkout, orders, payments, inventory, catalog, sellers, and fulfillment own the customer-facing transaction. Their databases remain authoritative for live decisions; the data platform receives committed facts after the business action succeeds.",
    decision: "Keep service ownership explicit. An order service owns order state, a payment service owns authorization and capture state, and inventory services own reservations. Analytics may explain or reconcile those decisions, but it never becomes their synchronous dependency.",
    receives: "Customer checkout requests, prices and promotions, payment responses, inventory reservations, shipment updates, seller actions, and returns.",
    produces: "Committed domain events and database changes with stable business IDs, source sequence, event time, money in minor units, region, and schema version.",
    guarantee: "Commerce stays available even when analytics is delayed",
  },
  behavior: {
    id: "behavior", code: "EDGE", label: "Behavior + edge", layer: "High-volume producers", short: "views · search · cart",
    summary: "Web, mobile, and edge collectors capture views, impressions, searches, clicks, cart changes, and experiment exposure at much higher volume than orders. Server-side validation separates trustworthy behavioral facts from noisy client telemetry.",
    decision: "Preserve both event time and ingestion time, document sampling, and isolate this bursty stream from financial lifecycles so a Prime Day click surge cannot delay order or payment facts.",
    receives: "Versioned client batches, session and request tokens, product and offer context, experiment assignments, consent state, and edge timestamps.",
    produces: "Privacy-classified behavior events with event IDs, anonymous customer or session tokens, validation status, sampling metadata, and trusted ingestion time.",
    guarantee: "Extreme behavior volume cannot starve business-critical events",
  },
  feeds: {
    id: "feeds", code: "FILES", label: "Partner + warehouse feeds", layer: "External producers", short: "settlement · carrier · vendor",
    summary: "Carriers, warehouses, payment processors, vendors, and sellers often deliver files or APIs rather than ordered streams. These feeds complete the story that internal domain events alone cannot certify.",
    decision: "Land the original payload first, fingerprint every file, validate its control totals, and track an explicit reporting period. A late settlement file should delay certification, not silently create partial finance numbers.",
    receives: "Settlement reports, carrier scans, warehouse adjustments, vendor inventory, seller catalogs, manifests, checksums, and reporting-period metadata.",
    produces: "Immutable landed files, normalized records, control-total results, quarantine reasons, and a visible completeness state for each expected feed.",
    guarantee: "External evidence is traceable from file to certified metric",
  },
  cdc: {
    id: "cdc", code: "CDC", label: "Outbox + CDC", layer: "Transactional bridge", short: "commit · capture · retry",
    summary: "The outbox pattern commits a business change and its publishable record in one database transaction. CDC then copies that record into the event backbone, removing the dangerous gap created by writing a database and Kafka separately.",
    decision: "Prefer domain outbox events for business meaning and use raw table CDC for completeness, audit, or legacy sources. Retried records keep the same event ID so downstream consumers can be idempotent.",
    receives: "Committed outbox rows, database logs, source transaction IDs, table changes, schema identifiers, and source sequence positions.",
    produces: "Ordered change events, replay checkpoints, lag metrics, tombstones where permitted, and quarantine records for incompatible schemas.",
    guarantee: "A committed order fact is not silently lost to dual write",
  },
  kafka: {
    id: "kafka", code: "LOG", label: "Kafka / MSK", layer: "Durable event backbone", short: "topics · keys · replay",
    summary: "Kafka is the durable distribution layer between Amazon-like producers and independent consumers. Flink, Bronze sinks, monitoring, fraud, and future products can consume the same retained facts at their own speed.",
    decision: "Separate topic families by domain and workload. Key orders by order_id, payments by payment_id or order_id, inventory by SKU plus location, shipments by shipment_id, and behavior by session when local ordering matters.",
    receives: "Validated domain events, CDC records, behavioral telemetry, feed notifications, schema versions, privacy labels, and producer identity.",
    produces: "Retained partition logs, consumer offsets, replay windows, lag signals, dead-letter records, and independently scalable subscriptions.",
    guarantee: "Durable replay with ordering inside the chosen business key",
  },
  flink: {
    id: "flink", code: "FAST", label: "Flink streaming", layer: "Realtime processing", short: "dedupe · enrich · window",
    summary: "Flink validates contracts, deduplicates retries, enriches events, maintains bounded state, and produces second-to-minute signals for fraud, operations, seller views, and online features.",
    decision: "Use event time and watermarks because mobile events, retries, and partner updates arrive late. Publish a provisional result quickly, then allow bounded corrections rather than pretending arrival order is business order.",
    receives: "Kafka topics, versioned product and seller dimensions, event-time timestamps, stable event IDs, rule versions, and keyed state restored from checkpoints.",
    produces: "Operational aggregates, alerts, enriched streams, online features, low-latency store upserts, and stream-to-lake records.",
    guarantee: "Fast results remain replayable, idempotent, and visibly provisional",
  },
  spark: {
    id: "spark", code: "BATCH", label: "Spark + Airflow", layer: "Historical processing", short: "MERGE · backfill · reconcile",
    summary: "Spark and orchestration handle work that should not live in unbounded streaming state: full-history joins, deterministic backfills, CDC compaction, finance reconciliation, file optimization, and large ML datasets.",
    decision: "Read declared Iceberg snapshots, write shadow outputs, run source and business reconciliations, then publish atomically. A rerun for the same logical interval must replace or merge deterministically rather than append duplicates.",
    receives: "Bronze snapshots, CDC history, external settlements, late events, dimension versions, data-quality rules, deletion requests, and run parameters.",
    produces: "Deduplicated Silver entities, certified Gold products, compacted files, reconciliation evidence, training datasets, and an auditable run manifest.",
    guarantee: "History can be corrected without corrupting published truth",
  },
  bronze: {
    id: "bronze", code: "RAW", label: "S3 Bronze", layer: "Immutable evidence", short: "raw · complete · replayable",
    summary: "Bronze stores accepted events and files close to their original representation, including Kafka coordinates and ingestion metadata. It is the evidence used to rebuild downstream products after code, contract, or metric errors.",
    decision: "Do not clean the only raw copy. Partition primarily by ingestion date, retain source coordinates, and compact small files without changing record meaning. Restricted payloads receive stronger access and retention controls.",
    receives: "Complete Kafka records, CDC changes, landed partner files, schema IDs, topic and partition offsets, ingestion time, region, and quality status.",
    produces: "Immutable, economical object-store history that supports replay, audit, incident investigation, deletion workflows, and new downstream logic.",
    guarantee: "Every accepted fact has recoverable analytical evidence",
  },
  curated: {
    id: "curated", code: "TABLE", label: "Silver + Gold Iceberg", layer: "Lakehouse products", short: "entities · metrics · snapshots",
    summary: "Silver establishes reusable business grains such as order item, payment transaction, inventory movement, shipment, and session. Gold publishes named products such as net sales, seller performance, demand, and fulfillment reliability.",
    decision: "Use Iceberg snapshots and idempotent MERGE for correction, schema evolution, time travel, and atomic publication. Every product declares grain, owner, freshness, completeness, metric version, lineage, and privacy class.",
    receives: "Validated Bronze records, versioned reference data, reconciliation outcomes, late facts, data-quality results, and approved metric definitions.",
    produces: "Conformed facts, certified aggregates, feature tables, catalog metadata, quality status, lineage, and rollback-capable snapshots.",
    guarantee: "Published products are reproducible and safe to correct",
  },
  realtime: {
    id: "realtime", code: "SERVE", label: "Realtime stores", layer: "Operational serving", short: "OpenSearch · Redis · OLAP",
    summary: "Specialized stores serve low-latency operational questions: current seller counters, fraud features, campaign health, inventory signals, search diagnostics, and customer-service context.",
    decision: "Materialize narrow, purpose-built views with upsert keys and expiry. These stores optimize access, not truth; they must be rebuildable from Kafka or the lakehouse and must show data age.",
    receives: "Flink aggregates, online features, compact dimensions, explicit upsert keys, validity windows, and freshness metadata.",
    produces: "Fast APIs, operational dashboards, alert queries, fraud lookups, and cached features with a visible provisional or stale state.",
    guarantee: "Low latency without turning a cache into the historical source",
  },
  analytics: {
    id: "analytics", code: "SQL+ML", label: "Analytics + ML", layer: "Historical serving", short: "Trino · Redshift · features",
    summary: "Trino or Athena explores Iceberg directly, Redshift serves governed BI workloads, and the feature platform creates point-in-time-correct training sets plus comparable online features.",
    decision: "Route consumers to data products rather than raw lifecycle events. Separate query compute from ingestion and publication, enforce tenant and privacy policies, and version feature definitions alongside metrics.",
    receives: "Published Silver and Gold snapshots, semantic definitions, access policies, offline features, lineage, freshness, completeness, and quality status.",
    produces: "Certified dashboards, finance reports, seller analytics, experiments, forecasts, training datasets, and model monitoring.",
    guarantee: "Every decision can trace back to a governed product version",
  },
  governance: {
    id: "governance", code: "CTRL", label: "Contracts + governance", layer: "Cross-cutting control plane", short: "schema · privacy · quality · lineage",
    summary: "The control plane connects schema compatibility, ownership, catalog, privacy, lineage, freshness, completeness, reconciliation, access, retention, deletion, and cost controls across every architecture layer.",
    decision: "Enforce controls at ingestion and publication, not only in documentation. A product cannot become certified when its expected sources are late, its grain is ambiguous, reconciliation fails, or its privacy contract is missing.",
    receives: "Schema proposals, ownership, privacy labels, lineage events, source control totals, quality rules, access requests, SLOs, retention policy, and cost telemetry.",
    produces: "Allow or reject decisions, quarantine, catalog state, alerts, masked views, audit evidence, deletion proof, and certification status.",
    guarantee: "Every layer is owned, observable, explainable, and policy-controlled",
  },
};

const MAP_COLUMNS = [
  { label: "Producers", nodes: ["commerce", "behavior", "feeds"] },
  { label: "Ingestion", nodes: ["cdc", "kafka"] },
  { label: "Processing", nodes: ["flink", "spark"] },
  { label: "Lakehouse", nodes: ["bronze", "curated"] },
  { label: "Serving", nodes: ["realtime", "analytics"] },
] as const;

function NodeButton({ id, active, onSelect }: { id: string; active: boolean; onSelect: (id: string) => void }) {
  const node = NODES[id];
  return (
    <button type="button" aria-pressed={active} data-testid={`amazon-architecture-node-${id}`}
      onMouseEnter={() => onSelect(id)} onFocus={() => onSelect(id)} onClick={() => onSelect(id)}
      className={`min-h-[98px] rounded-xl border p-3 text-left outline-none transition ${active ? "border-[#111] bg-[#ededed] shadow-sm ring-2 ring-[#111]/10" : "border-[#d8d8d8] bg-white hover:-translate-y-0.5 hover:border-[#777] focus-visible:border-[#111]"}`}>
      <span className="flex items-center justify-between gap-2"><span className={`rounded-md px-2 py-1 font-mono text-[9px] font-bold ${active ? "bg-[#111] text-white" : "bg-[#ededed] text-[#333]"}`}>{node.code}</span><span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-[#111]" : "bg-[#aaa]"}`} /></span>
      <strong className="mt-2.5 block text-xs leading-[18px] text-[#111]">{node.label}</strong>
      <span className="mt-1.5 block font-mono text-[9px] leading-4 text-[#555]">{node.short}</span>
    </button>
  );
}

const BOUNDARIES = [
  {
    code: "01", label: "Transaction plane", owns: "Make and commit live commerce decisions",
    detail: "Checkout, orders, payments, inventory, and fulfillment are the systems customers are actively using. They validate price and promotion, authorize money, reserve stock, promise delivery, and commit each lifecycle transition in their own operational stores.",
    example: "A customer buys three items. Checkout confirms the offer, payment authorizes the amount, inventory reserves each SKU, and the order service commits the order before any analytical pipeline is required.",
    must: "This plane alone decides whether the order is accepted, whether money is authorized, which stock is reserved, and what delivery promise is shown.",
    never: "Kafka, Flink, S3, Iceberg, Redshift, or a feature store must never be required to place the order or update its authoritative state.",
  },
  {
    code: "02", label: "Outbox + CDC bridge", owns: "Copy committed facts without a dual-write gap",
    detail: "A service commits the business change and an outbox row in the same database transaction. CDC retries that immutable record until Kafka accepts it, preserving a stable event ID and source sequence across failures.",
    example: "The order is confirmed while Kafka is unavailable. Checkout still succeeds; the outbox record waits, then CDC publishes the same order_confirmed event when the backbone recovers.",
    must: "The bridge preserves event time, trusted ingestion time, source position, schema version, business key, privacy class, and enough metadata to measure lag and replay safely.",
    never: "Publishing delay must not roll back a valid order, and retrying must not create a second order, second payment, or duplicate revenue.",
  },
  {
    code: "03", label: "Data plane", owns: "Create fast signals and certified historical truth",
    detail: "Kafka retains facts, Flink creates live views, Bronze preserves evidence, Spark rebuilds history, Iceberg publishes conformed products, and serving systems expose the appropriate freshness and correctness contract.",
    example: "Operations sees an order counter within seconds. Later, the certified daily product incorporates late shipments, captures, refunds, fees, settlements, and reconciliation before finance closes the day.",
    must: "The plane deduplicates, processes by event time, reconciles sources, exposes staleness, protects sensitive fields, and can rebuild every derived serving view.",
    never: "It may recommend, detect, report, and reconcile; it may not become the hidden source of truth for checkout, payment capture, inventory reservation, or fulfillment execution.",
  },
] as const;

const FAILURES = [
  {
    code: "LOG", label: "Kafka region unavailable", signal: "Publish latency and outbox backlog rise; regional consumers stop advancing.",
    customer: "Checkout and order commits continue because they do not wait for Kafka. Data-driven views may become stale and must say so.",
    contain: "Retain outbox and CDC positions, apply producer backpressure and quotas, isolate behavior traffic, and stop any consumer that cannot tolerate stale inputs.",
    recover: "Restore or fail over the regional backbone, publish from the last durable source position with the same event IDs, and let idempotent consumers catch up.",
    prove: "Compare source/outbox counts with Kafka and Bronze, verify no partition gaps, measure maximum event lag, and reconcile a complete business interval before clearing the incident.",
  },
  {
    code: "FAST", label: "Flink checkpoint failure", signal: "Checkpoint age, restart count, watermark delay, and consumer lag breach their SLOs.",
    customer: "Orders remain safe, while fraud features, operational counters, and seller views may pause or display a stale/provisional badge.",
    contain: "Freeze nonessential sinks, preserve Kafka retention, prevent an unhealthy job from overwriting good materializations, and alert consumers to staleness.",
    recover: "Restart from the last verified checkpoint or savepoint, replay retained partitions, deduplicate by stable event ID, and rebuild affected serving keys.",
    prove: "Reconcile replay output against Bronze and source control totals, check watermark recovery, compare online/offline features, and confirm sink keys contain no duplicates.",
  },
  {
    code: "GOLD", label: "Bad Gold deployment", signal: "Quality checks, historical comparisons, or finance reconciliation detect a metric or join regression.",
    customer: "Operational commerce is unaffected. BI and finance remain on the last certified snapshot instead of seeing partially written results.",
    contain: "Quarantine the new run, block certification, preserve its inputs and code version for diagnosis, and keep the prior snapshot as the consumer pointer.",
    recover: "Fix the transformation, rebuild into shadow tables from a declared Bronze snapshot, validate the full affected interval, then atomically publish.",
    prove: "Pass grain uniqueness, null, referential, source-count, money-conservation, and period-over-period checks; record the snapshot and metric version in the run manifest.",
  },
  {
    code: "FEED", label: "Partner feed arrives late", signal: "Expected-file monitoring shows a missing settlement, carrier, warehouse, or seller delivery after cutoff.",
    customer: "Fast operational metrics may continue with an incomplete badge. Any product requiring the feed stays provisional and finance certification waits.",
    contain: "Mark the affected date, region, seller, or processor incomplete; avoid treating absence as zero; notify the owning partner and downstream product owners.",
    recover: "Land and fingerprint the file when it arrives, validate control totals, rerun only the impacted partitions, and republish through the normal quality gate.",
    prove: "Match file counts and monetary totals, verify no duplicate file fingerprint, reconcile downstream deltas, and clear completeness only for the exact recovered scope.",
  },
] as const;

export default function AmazonArchitecture() {
  const [nodeId, setNodeId] = useState("kafka");
  const [boundaryIndex, setBoundaryIndex] = useState(1);
  const [failureIndex, setFailureIndex] = useState(0);
  const node = NODES[nodeId];
  const boundary = BOUNDARIES[boundaryIndex];
  const failure = FAILURES[failureIndex];

  return (
    <div className="mt-5 space-y-5">
      <ArchitectureSection id="architecture-map" eyebrow="01 · End-to-end map" title="Follow a fact from checkout to a decision" subtitle="Hover, focus, or tap any component to see its exact responsibility. The architecture separates live commerce, durable movement, fast processing, historical correction, and fit-for-purpose serving.">
        <p className="mt-5 flex items-center justify-between rounded-lg bg-[#ededed] px-3 py-2 font-mono text-[9px] font-bold text-[#444] sm:hidden"><span>Swipe the map</span><span aria-hidden>→</span></p>
        <div className="mt-3 grid min-w-0 gap-4 sm:mt-6 xl:grid-cols-[minmax(0,1.58fr)_minmax(330px,.92fr)] xl:items-start">
          <div className="min-w-0">
            <div className="overflow-x-auto pb-2">
              <div className="grid min-w-[760px] grid-cols-[1.08fr_14px_.92fr_14px_.92fr_14px_.92fr_14px_.92fr] items-stretch gap-1.5 xl:min-w-0 xl:grid-cols-[1.08fr_8px_.92fr_8px_.92fr_8px_.92fr_8px_.92fr] xl:gap-1">
                {MAP_COLUMNS.map((column, columnIndex) => (
                  <div className="contents" key={column.label}>
                    <div className="rounded-2xl bg-[#f7f7f7] p-2">
                      <p className="mb-2 px-1 text-[8px] font-extrabold uppercase tracking-[.14em] text-[#555]">{column.label}</p>
                      <div className="grid gap-1.5">{column.nodes.map((id) => <NodeButton key={id} id={id} active={nodeId === id} onSelect={setNodeId} />)}</div>
                    </div>
                    {columnIndex < MAP_COLUMNS.length - 1 ? <div className="flex items-center text-[#777]" aria-hidden><span className="h-px flex-1 bg-[#bbb]"/><span>›</span></div> : null}
                  </div>
                ))}
              </div>
            </div>
            <button type="button" data-testid="amazon-architecture-node-governance" aria-pressed={nodeId === "governance"} onMouseEnter={() => setNodeId("governance")} onFocus={() => setNodeId("governance")} onClick={() => setNodeId("governance")}
              className={`mt-2 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left outline-none transition ${nodeId === "governance" ? "border-[#111] bg-[#ededed] ring-2 ring-[#111]/10" : "border-dashed border-[#aaa] bg-white hover:border-[#111]"}`}>
              <span className={`rounded-md px-2 py-1 font-mono text-[9px] font-bold ${nodeId === "governance" ? "bg-[#111] text-white" : "bg-[#ededed]"}`}>CTRL</span>
              <span><strong className="block text-xs">Contracts + governance across every layer</strong><span className="mt-0.5 block text-[10px] text-[#555]">Schema · quality · privacy · lineage · reconciliation · access · retention · cost</span></span>
            </button>
          </div>

          <article className="overflow-hidden rounded-[22px] border border-[#bdbdbd] bg-[#f7f7f7] xl:sticky xl:top-28" aria-live="polite" aria-label={`${node.label} explanation`}>
            <div className="flex items-start gap-4 border-b border-[#d8d8d8] bg-white p-4 sm:p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111] font-mono text-[10px] font-bold text-white">{node.code}</span>
              <div><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#666]">{node.layer} · component explanation</p><h3 className="mt-1 text-lg font-bold text-[#111]">{node.label}</h3><p className="mt-2 text-xs leading-5 text-[#444]">{node.summary}</p></div>
            </div>
            <div className="grid gap-px bg-[#d8d8d8] sm:grid-cols-3 xl:grid-cols-1">
              {[["Why this design", node.decision], ["What comes in", node.receives], ["What comes out", node.produces]].map(([label, value]) => <div key={label} className="bg-[#f7f7f7] p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#666]">{label}</p><p className="mt-2 text-[11px] leading-5 text-[#444]">{value}</p></div>)}
            </div>
            <div className="flex items-center gap-3 border-t border-[#d8d8d8] bg-[#ededed] px-4 py-3"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#111]"/><p className="text-[10px] font-bold text-[#222]">Architecture promise · {node.guarantee}</p></div>
          </article>
        </div>
      </ArchitectureSection>

      <ArchitectureSection id="architecture-boundary" eyebrow="02 · System boundary" title="Keep the lakehouse off the checkout path" subtitle="Select a boundary to understand what it owns, how facts cross it, and which decisions the analytical platform must never take over.">
        <div className="mt-6 grid gap-2 lg:grid-cols-[1fr_28px_1fr_28px_1fr]">
          {BOUNDARIES.map((item, index) => <div className="contents" key={item.code}>
            <button type="button" aria-pressed={boundaryIndex === index} onMouseEnter={() => setBoundaryIndex(index)} onFocus={() => setBoundaryIndex(index)} onClick={() => setBoundaryIndex(index)} className={`min-h-[132px] rounded-2xl border p-4 text-left outline-none transition ${boundaryIndex === index ? "border-[#111] bg-[#ededed] shadow-sm ring-2 ring-[#111]/10" : "border-[#d8d8d8] bg-white hover:-translate-y-0.5 hover:border-[#777]"}`}>
              <span className={`font-mono text-[10px] font-bold ${boundaryIndex === index ? "text-[#111]" : "text-[#777]"}`}>{item.code}</span><strong className="mt-3 block text-sm text-[#111]">{item.label}</strong><span className="mt-2 block text-[11px] leading-5 text-[#555]">{item.owns}</span>
            </button>
            {index < BOUNDARIES.length - 1 ? <div className="hidden items-center justify-center text-xl text-[#777] lg:flex" aria-hidden>→</div> : null}
          </div>)}
        </div>
        <article className="mt-4 overflow-hidden rounded-[22px] border border-[#bdbdbd] bg-[#f7f7f7]" aria-live="polite">
          <div className="border-b border-[#d8d8d8] bg-white p-5"><p className="font-mono text-[10px] font-bold text-[#666]">BOUNDARY {boundary.code} · EXPLANATION</p><h3 className="mt-1 text-lg font-bold">{boundary.label}</h3><p className="mt-2 max-w-4xl text-xs leading-6 text-[#444]">{boundary.detail}</p></div>
          <div className="grid gap-px bg-[#d8d8d8] lg:grid-cols-3">
            {[["Amazon example", boundary.example], ["What it must decide", boundary.must], ["What it must never do", boundary.never]].map(([label, value]) => <div className="bg-[#f7f7f7] p-4" key={label}><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#666]">{label}</p><p className="mt-2 text-[11px] leading-5 text-[#444]">{value}</p></div>)}
          </div>
        </article>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#d8d8d8] bg-[#ededed] p-5"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#444]">Live path · seconds to minutes</p><p className="mt-2 text-sm font-bold">Useful now, explicitly provisional</p><p className="mt-2 text-xs leading-5 text-[#444]">Kafka and Flink power alerts, fraud signals, seller views, operational counters, and online features with bounded lateness and visible staleness.</p></div>
          <div className="rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7] p-5"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#444]">Certified path · minutes to T+1</p><p className="mt-2 text-sm font-bold">Complete, reconciled, reproducible</p><p className="mt-2 text-xs leading-5 text-[#444]">Bronze, CDC, settlements, late facts, Spark, and Iceberg rebuild the full history before finance, BI, and governed ML receive official results.</p></div>
        </div>
      </ArchitectureSection>

      <ArchitectureSection id="architecture-recovery" eyebrow="03 · Failure isolation" title="Design the recovery path before the happy path fails" subtitle="Select an incident. Each response protects checkout, exposes degraded data honestly, replays from durable evidence, and proves correctness before certification resumes.">
        <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {FAILURES.map((item, index) => <button type="button" key={item.code} aria-pressed={failureIndex === index} onMouseEnter={() => setFailureIndex(index)} onFocus={() => setFailureIndex(index)} onClick={() => setFailureIndex(index)} className={`rounded-xl border p-3 text-left outline-none transition ${failureIndex === index ? "border-[#111] bg-[#ededed] ring-2 ring-[#111]/10" : "border-[#d8d8d8] bg-white hover:border-[#777]"}`}><span className={`inline-flex rounded-md px-2 py-1 font-mono text-[9px] font-bold ${failureIndex === index ? "bg-[#111] text-white" : "bg-[#ededed]"}`}>{item.code}</span><strong className="mt-2.5 block text-xs leading-5">{item.label}</strong></button>)}
        </div>
        <article className="mt-4 overflow-hidden rounded-[22px] border border-[#bdbdbd] bg-[#f7f7f7]" aria-live="polite">
          <div className="border-b border-[#d8d8d8] bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#666]">Detection signal</p><h3 className="mt-1 text-lg font-bold">{failure.label}</h3><p className="mt-2 text-xs leading-5 text-[#444]">{failure.signal}</p></div>
          <div className="grid gap-px bg-[#d8d8d8] sm:grid-cols-2">
            {[["Customer + product impact", failure.customer], ["Contain the blast radius", failure.contain], ["Recover from durable evidence", failure.recover], ["Prove it is safe again", failure.prove]].map(([label, value], index) => <div className="bg-[#f7f7f7] p-4" key={label}><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ededed] font-mono text-[9px] font-bold">{String(index + 1).padStart(2, "0")}</span><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#555]">{label}</p></div><p className="mt-2 text-[11px] leading-5 text-[#444]">{value}</p></div>)}
          </div>
        </article>
      </ArchitectureSection>
    </div>
  );
}
