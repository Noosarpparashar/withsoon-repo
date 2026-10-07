"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

function KafkaSection({ id, eyebrow, title, subtitle, children }: { id: string; eyebrow: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-40 rounded-[26px] border border-[#d8d8d8] bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,.055)] sm:p-7">
      <div className="flex items-start gap-3"><span className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[#111]" aria-hidden /><div><p className="text-[10px] font-extrabold uppercase tracking-[.19em] text-[#111]">{eyebrow}</p><h2 className="mt-1.5 text-2xl font-bold tracking-[-.04em] text-[#111] sm:text-[28px]">{title}</h2><p className="mt-2 max-w-[780px] text-sm leading-6 text-[#5f5f5f]">{subtitle}</p></div></div>
      {children}
    </section>
  );
}

function MonoBadge({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 font-mono text-[9px] font-bold ${dark ? "border-[#111] bg-[#111] text-white" : "border-[#c9c9c9] bg-[#ededed] text-[#333]"}`}>{children}</span>;
}

function SelectableCard({ active, onSelect, testId, children, className = "" }: { active: boolean; onSelect: () => void; testId?: string; children: ReactNode; className?: string }) {
  return <button type="button" data-testid={testId} aria-pressed={active} onMouseEnter={onSelect} onFocus={onSelect} onClick={onSelect} className={`w-full rounded-2xl border p-4 text-left outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#111] ${active ? "border-[#111] bg-[#ededed] shadow-[0_8px_22px_rgba(0,0,0,.10)]" : "border-[#d8d8d8] bg-white hover:border-[#777]"} ${className}`}>{children}</button>;
}

const HANDOFF_STAGES = [
  {
    code: "01", name: "Commit commerce state",
    summary: "The order service commits order ORD-123 and its items before analytics may describe the order as placed.",
    detail: "Checkout, payment, inventory, and fulfillment remain owned by their operational databases. If the transaction rolls back, no downstream event may claim success. This is the boundary that keeps Kafka, the lakehouse, and dashboards off the customer-facing commit path.",
    input: "Validated checkout, committed price and promotion, payment and inventory responses",
    output: "Authoritative operational rows plus one stable business transition",
    promise: "Commerce truth exists before analytics describes it",
  },
  {
    code: "02", name: "Write the outbox record",
    summary: "The same database transaction appends an order_placed outbox row with a stable event ID and contract version.",
    detail: "Writing the database and Kafka separately creates a dual-write gap: the order can commit while Kafka publication fails. The transactional outbox turns that invisible loss into a durable pending row that CDC can retry without asking the customer to place the order again.",
    input: "Committed transition, event ID, business key, event time, schema and privacy class",
    output: "Pending event row tied atomically to the source commit",
    promise: "No silent event loss after a successful order commit",
  },
  {
    code: "03", name: "Capture, validate + route",
    summary: "CDC reads the outbox, validates its registered schema, attaches ingestion time, and routes it to the order topic.",
    detail: "Debezium or another CDC connector preserves the source transaction and log position. Incompatible or prohibited records enter a quarantine stream with a visible reason and source pointer. Client behavior takes a separate edge-gateway route with size, schema, rate, and PII validation.",
    input: "Outbox or WAL record, connector position, producer identity, schema ID, routing policy",
    output: "Serialized domain event or actionable quarantine record",
    promise: "Only known contracts cross the ingestion boundary",
  },
  {
    code: "04", name: "Receive Kafka acknowledgement",
    summary: "The publisher advances its source position only after MSK durably acknowledges the record under the required ISR policy.",
    detail: "Use idempotent production, acks=all, replication across availability zones, compression, and bounded retry. Kafka acknowledgement means the analytical event is durable in the log; it does not mean payment settled, inventory shipped, or the order delivered.",
    input: "Domain topic, partition key, compressed batch, producer and source sequence",
    output: "Topic, partition, offset and durable publish checkpoint",
    promise: "Durable analytical handoff without blocking checkout",
  },
] as const;

const TOPICS = [
  {
    title: "Order lifecycle", topic: "commerce.order.events.v1", key: "order_id", label: "Order ordered",
    sequence: ["placed", "item cancelled", "closed"], summary: "Keep an order’s lifecycle transitions together so consumers can build a deterministic current-state projection.",
    explanation: "All header and item transitions for ORD-123 reach one partition through order_id. Each item event still carries order_item_id and source_sequence_number, so partial cancellation or split fulfillment does not collapse the business grain.",
    hotspot: "A single normal order is not hot. Bulk backfills and seller imports use throttled producers or replay lanes instead of changing the key and breaking lifecycle order.",
  },
  {
    title: "Payment lifecycle", topic: "commerce.payment.events.v1", key: "payment_id or order_id", label: "Money ordered",
    sequence: ["authorized", "captured", "refunded"], summary: "Choose payment_id for transaction lifecycle order or order_id when one-order monetary reconstruction is the primary consumer need.",
    explanation: "Authorization, capture, refund, chargeback, fee, and settlement remain separate transaction facts. The chosen key and processor/source sequence preserve only the order the payment state machine can defend.",
    hotspot: "A large merchant or payment processor must not become the partition key. It concentrates traffic without providing useful transaction ordering.",
  },
  {
    title: "Inventory movement", topic: "commerce.inventory.events.v1", key: "sku_id + location_id", label: "Stock ordered",
    sequence: ["reserved", "picked", "released"], summary: "Order mutations for one SKU at one location while distributing the wider catalog across partitions.",
    explanation: "Reservation, release, receipt, transfer, damage, pick, and restock events for SKU-7 at BLR-1 share a partition and source sequence. A derived snapshot can then reconcile the signed movement stream.",
    hotspot: "A flash-deal SKU can become extremely hot. Pre-shard reservations by controlled bucket only if the reservation service also provides a deterministic sequence and reconciliation strategy across buckets.",
  },
  {
    title: "Shipment + returns", topic: "commerce.shipment.events.v1", key: "shipment_id", label: "Package ordered",
    sequence: ["allocated", "shipped", "delivered"], summary: "Preserve package-level fulfillment order without serializing every package belonging to an order.",
    explanation: "One order may produce several packages and carriers. shipment_id keeps allocation, pick, ship, attempt, delivery, and return transitions for each package in one ordered partition lane.",
    hotspot: "Carrier bulk updates should be batched and quota-controlled. Keying by carrier would create a hot partition and offers no package-lifecycle correctness benefit.",
  },
  {
    title: "Web + mobile behavior", topic: "behavior.customer.events.v1", key: "session_id", label: "Session local",
    sequence: ["impression", "click", "cart"], summary: "Keep one customer journey locally ordered while isolating extreme telemetry volume from commerce-critical topics.",
    explanation: "A session key groups views, search, impressions, clicks, cart actions, and checkout intent. Anonymous and customer identity can be joined later under policy; customer_id is often too skewed and makes bot or power-user traffic dangerous.",
    hotspot: "Separate web, mobile, search, ads, or high-volume impression families when their retention, sampling, or quotas differ. Sampling status remains part of the contract.",
  },
  {
    title: "Catalog + seller state", topic: "catalog.offer.events.v1", key: "offer_id or entity_id", label: "Versioned state",
    sequence: ["created", "price changed", "closed"], summary: "Distribute versioned product, SKU, offer, price, promotion, seller, and customer changes by the entity being mutated.",
    explanation: "A compacted topic can distribute current reference state while Bronze retains complete history. Every update carries effective time and source version so point-in-time order enrichment uses the term valid when the purchase occurred.",
    hotspot: "Large seller uploads enter a bounded import lane. seller_id is useful for tenancy but is a poor universal partition key when one seller can update millions of offers.",
  },
] as const;

const RELIABILITY_CONTROLS = [
  {
    title: "Transactional outbox", label: "Commit once, publish later",
    detail: "Business state and its pending domain event commit atomically. CDC can retry independently, so MSK throttling delays analytics without turning a successful checkout into a customer retry.",
    evidence: "source transaction ID · outbox sequence · event_id · CDC log position",
    boundary: "Use domain outbox events for business meaning; use raw table CDC for audit, completeness, and legacy sources that cannot publish reliable events.",
  },
  {
    title: "Idempotent producer", label: "Retry one logical fact",
    detail: "Use acks=all, producer idempotence, bounded retries, RF3, minimum in-sync replicas, compression, and modest batching. Every retry preserves the logical event_id and source sequence.",
    evidence: "producer ID · producer sequence · topic/partition/offset · schema ID",
    boundary: "Kafka producer idempotence reduces duplicate appends in a session; it does not replace business-level deduplication after replay or a producer restart.",
  },
  {
    title: "Idempotent consumer", label: "Promise one business effect",
    detail: "Flink, Spark, or a sink may see the event again after restart. Checkpoint offsets with state and apply event_id, business key, and source sequence through deterministic upsert or MERGE logic.",
    evidence: "checkpoint · event_id · source version · sink commit or Iceberg snapshot",
    boundary: "Do not implement revenue += amount. Rebuild revenue from canonical order-item and payment facts so replay cannot double money.",
  },
  {
    title: "Workload isolation", label: "Protect commerce facts",
    detail: "Quotas, separate topic families, reserved broker headroom, bounded client buffers, and independent consumer groups stop a behavior or seller-import surge from starving orders and payments.",
    evidence: "throttle time · ISR · broker disk · produce error · consumer lag · data age",
    boundary: "When analytics is behind, checkout continues from operational state. Downstream products expose staleness and recover from retained Kafka or Bronze evidence.",
  },
] as const;

const RETENTION_CLASSES = [
  { priority: "P0", name: "Orders + payments", retention: "7–14 days", policy: "delete", why: "Long enough for critical replay, reconciliation, incident recovery, and common consumer outages; Bronze holds durable history." },
  { priority: "P1", name: "Inventory + fulfillment", retention: "3–7 days", policy: "delete", why: "Bounded hot recovery for operational products while movement and shipment history lands continuously in Bronze." },
  { priority: "BULK", name: "Behavior + impressions", retention: "12–48 hours", policy: "delete", why: "Extreme volume; sink raw evidence quickly and keep Kafka focused on transit rather than economical long-term storage." },
  { priority: "STATE", name: "Catalog + reference state", retention: "Current + tombstones", policy: "compact,delete", why: "Distribute the latest keyed value and controlled deletions while Iceberg preserves effective-dated history." },
  { priority: "CDC", name: "Raw change streams", retention: "3–7 days", policy: "delete", why: "Cover connector and sink recovery; protect WAL/binlog retention separately because Kafka retention cannot repair an expired source log." },
  { priority: "DLQ", name: "Quarantined records", retention: "7–30 days", policy: "delete", why: "Retain invalid records long enough to fix and replay with restricted access, owner, reason code, and original source pointer." },
] as const;

const SURGE_CASES = [
  { label: "Behavior traffic spikes 10×", signal: "Behavior produce rate, broker ingress, and consumer lag rise while order traffic remains normal.", contain: "Enforce behavior producer quotas, degrade optional sampling, preserve reserved broker and consumer capacity for order and payment topics.", recover: "Scale its consumer groups, replay within the behavior retention window, then reconcile Kafka offsets to Bronze counts and sampling declarations." },
  { label: "Flash-deal SKU is hot", signal: "One inventory partition has high append latency and lag while other partitions are healthy.", contain: "Rate-limit the promotion or activate the predesigned bucketed reservation strategy; never change the key ad hoc during the incident.", recover: "Reconcile bucket sequences and reservation totals by SKU/location, rebuild the stock projection, and validate against the operational snapshot." },
  { label: "Seller bulk import floods", signal: "Catalog partitions and schema validation saturate during a large offer or price upload.", contain: "Route imports through bounded queues and per-seller quotas; keep order and payment clusters isolated and reject oversized records visibly.", recover: "Resume from the import manifest, deduplicate entity versions, compare accepted/rejected totals, and republish only the missing offer mutations." },
  { label: "CDC connector restarts", signal: "Source-to-Kafka lag and outbox backlog grow; connector position stops advancing or replays older records.", contain: "Preserve source WAL/binlog, freeze unsafe schema changes, alert on retention risk, and keep stable event IDs across the restart.", recover: "Resume from the last durable log position, deduplicate replay, verify sequence continuity, and reconcile source/outbox/Kafka/Bronze counts." },
] as const;

export default function AmazonIngestionKafka() {
  const [handoffIndex, setHandoffIndex] = useState(0);
  const [topicIndex, setTopicIndex] = useState(0);
  const [controlIndex, setControlIndex] = useState(0);
  const [surgeIndex, setSurgeIndex] = useState(0);
  const handoff = HANDOFF_STAGES[handoffIndex];
  const topic = TOPICS[topicIndex];
  const control = RELIABILITY_CONTROLS[controlIndex];
  const surge = SURGE_CASES[surgeIndex];

  return (
    <div className="mt-5 space-y-5">
      <KafkaSection id="ingestion-handoff" eyebrow="01 · Event handoff" title="Commit the commerce action before publishing its event" subtitle="Inspect the transactional handoff from an operational database to Kafka. The path makes event loss retryable without making MSK, Flink, or the lakehouse a checkout dependency.">
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.85fr)]">
          <div className="grid gap-2 sm:grid-cols-2">{HANDOFF_STAGES.map((stage, index) => <SelectableCard key={stage.code} testId={`amazon-handoff-${index}`} active={handoffIndex === index} onSelect={() => setHandoffIndex(index)} className="min-h-[108px] !p-3"><div className="flex items-start justify-between gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-[9px] font-bold ${handoffIndex === index ? "bg-[#111] text-white" : "bg-[#ededed] text-[#333]"}`}>{stage.code}</span><span className="font-mono text-[9px] text-[#777]">{index < 3 ? "then →" : "durable"}</span></div><h3 className="mt-3 text-xs font-bold">{stage.name}</h3><p className="mt-1 line-clamp-2 text-[11px] leading-[18px] text-[#5f5f5f]">{stage.summary}</p></SelectableCard>)}</div>
          <aside data-testid="amazon-handoff-explanation" className="overflow-hidden rounded-2xl border border-[#111] bg-[#ededed] xl:sticky xl:top-28 xl:self-start" aria-live="polite"><div className="border-b border-[#c9c9c9] bg-white px-5 py-4"><p className="text-[9px] font-bold uppercase tracking-[.17em] text-[#666]">Stage explanation</p><h3 className="mt-1 text-lg font-bold tracking-[-.03em]">{handoff.name}</h3></div><div className="space-y-4 p-5"><p className="text-sm leading-6 text-[#333]">{handoff.detail}</p><div className="grid gap-2">{[["What comes in", handoff.input], ["What comes out", handoff.output], ["Design promise", handoff.promise]].map(([label, value]) => <div key={label} className="rounded-xl border border-[#c9c9c9] bg-white px-3 py-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">{label}</p><p className="mt-1 text-xs font-semibold leading-5">{value}</p></div>)}</div></div></aside>
        </div>
        <div className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-[#bdbdbd] bg-[#d8d8d8] md:grid-cols-3">{[
          ["Transactional facts", "Outbox + CDC", "Order, payment, and inventory changes commit with a pending event, then publish asynchronously."],
          ["Client behavior", "Validated edge gateway", "Schema, size, rate, consent, and prohibited-PII checks happen before a client batch enters Kafka."],
          ["Partner batches", "Immutable landing first", "Fingerprint files, verify manifests and control totals, then emit normalized records and completeness state."],
        ].map(([title, route, detail]) => <div key={title} className="bg-[#f7f7f7] p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#666]">{title}</p><h3 className="mt-1 text-xs font-bold">{route}</h3><p className="mt-2 text-[10px] leading-5 text-[#555]">{detail}</p></div>)}</div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d8d8d8] bg-white p-4"><p className="max-w-3xl text-xs leading-5 text-[#555]">Ingestion preserves the source contract’s <code className="font-bold text-[#111]">event_id</code>, business time, authority, schema, entity key, sequence and privacy class; it adds trusted receive time and Kafka coordinates.</p><Link href="/data-engineering/amazon/event-sources#source-event-contract" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#111] px-4 text-xs font-bold transition hover:bg-[#ededed]">Review event contract →</Link></div>
      </KafkaSection>

      <KafkaSection id="kafka-topics" eyebrow="02 · Topics + partition keys" title="Choose a key from the ordering each commerce fact needs" subtitle="Avoid one giant topic and one universal customer key. Separate domains by criticality, volume, retention, schema ownership, and the exact lifecycle order consumers can defend.">
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{TOPICS.map((item, index) => <SelectableCard key={item.topic} testId={`amazon-topic-${index}`} active={topicIndex === index} onSelect={() => setTopicIndex(index)} className="min-h-[235px]"><div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-bold">{item.title}</h3><code className="mt-1 block break-all text-[10px] font-bold text-[#444]">{item.topic}</code></div><MonoBadge dark={topicIndex === index}>{item.label}</MonoBadge></div><p className="mt-4 text-[9px] font-bold uppercase tracking-[.15em] text-[#777]">Partition key</p><code className="mt-1.5 block min-h-10 break-words text-xs font-bold leading-5">{item.key}</code><div className="mt-3 flex flex-wrap gap-1.5">{item.sequence.map((step) => <span key={step} className="rounded-lg border border-[#d8d8d8] bg-white px-2 py-1 text-[9px] font-semibold text-[#555]">{step}</span>)}</div><p className="mt-3 text-[11px] leading-5 text-[#555]">{item.summary}</p></SelectableCard>)}</div>
          <aside data-testid="amazon-topic-explanation" className="overflow-hidden rounded-2xl border border-[#111] bg-[#ededed] xl:sticky xl:top-28 xl:self-start" aria-live="polite"><div className="border-b border-[#c9c9c9] bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[.17em] text-[#666]">Partition decision explained</p><h3 className="mt-1 text-lg font-bold">{topic.title}</h3><code className="mt-1 block text-[10px] font-bold text-[#555]">key = {topic.key}</code></div><div className="space-y-4 p-5"><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">Amazon example</p><p className="mt-1.5 text-sm leading-6 text-[#333]">{topic.explanation}</p></div><div className="rounded-xl border border-[#c9c9c9] bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">Hot-key answer</p><p className="mt-1 text-xs leading-5 text-[#333]">{topic.hotspot}</p></div><p className="border-t border-[#c9c9c9] pt-3 text-xs font-bold leading-5">Kafka orders records inside one partition—not across the whole commerce platform.</p></div></aside>
        </div>
        <div className="mt-4 rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7] px-4 py-3 text-xs leading-5 text-[#555]"><strong className="text-[#111]">Avoid:</strong> one topic per customer, seller, order, or service instance. Use stable domain topics, controlled versions, quotas, and one documented partition strategy per event grain.</div>
      </KafkaSection>

      <KafkaSection id="kafka-capacity" eyebrow="03 · Capacity + campaign surge" title="Size Kafka from events, bytes, and consumer work" subtitle="The equations reuse the Requirements assumptions. Two independent partition floors are calculated before adding regional allocation, broker-loss headroom, hot-key risk, consumer parallelism, and forecast growth.">
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#bdbdbd] bg-white"><div className="border-b border-[#d8d8d8] bg-[#ededed] px-5 py-4"><p className="text-[9px] font-bold uppercase tracking-[.16em]">Peak planning baseline</p><p className="mt-1 text-xs text-[#555]">Decimal units · 1 KB average event · order and behavior baseline only</p></div><div className="grid gap-px bg-[#d8d8d8] sm:grid-cols-2 xl:grid-cols-4">{[
          ["Peak order events", "69,444.44/s", "10M orders/day × 30 events/order ÷ 86,400 × 20"],
          ["Peak behavior events", "347,222.22/s", "3B events/day ÷ 86,400 × 10"],
          ["Combined peak", "416,666.67/s", "69,444.44 + 347,222.22 events/s"],
          ["Logical ingress", "416.67 MB/s", "416,666.67 events/s × 1,000 bytes ÷ 10⁶"],
        ].map(([label, value, formula]) => <article key={label} className="bg-white p-4"><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#777]">{label}</p><strong className="mt-2 block text-xl tracking-[-.04em]">{value}</strong><code className="mt-2 block text-[10px] leading-5 text-[#555]">{formula}</code></article>)}</div></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#777]">Floor A · byte throughput</p><h3 className="mt-1 text-base font-bold">Can partitions absorb the bytes?</h3></div><MonoBadge dark>55</MonoBadge></div><div className="mt-4 rounded-xl border border-[#d8d8d8] bg-white p-3 font-mono text-[11px] font-bold leading-5">416.67 MB/s × 1.30 headroom<br/>÷ 10 MB/s tested per partition<br/>= 54.17 → 55 partitions</div><p className="mt-3 text-xs leading-5 text-[#555]">The 10 MB/s allowance is a benchmark input for the chosen record size, compression, replication, acknowledgement, and broker profile—not a Kafka constant.</p></article>
          <article className="rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#777]">Floor B · consumer work</p><h3 className="mt-1 text-base font-bold">Can consumers process the records?</h3></div><MonoBadge>11</MonoBadge></div><div className="mt-4 rounded-xl border border-[#d8d8d8] bg-white p-3 font-mono text-[11px] font-bold leading-5">416,666.67 events/s × 1.30 headroom<br/>÷ 50,000 tested events/s per partition<br/>= 10.83 → 11 partitions</div><p className="mt-3 text-xs leading-5 text-[#555]">Benchmark the slowest critical consumer with real schema decoding, dedupe state, checkpointing, enrichment, and sink latency.</p></article>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-2xl border border-[#111] bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#777]">Defendable baseline answer</p><p className="mt-2 text-lg font-bold tracking-[-.03em]">max(55 byte lanes, 11 processing lanes) = 55 minimum baseline lanes</p><p className="mt-2 text-xs leading-5 text-[#555]">This is not one topic’s final partition count. Allocate by regional and domain peak, add payments, inventory, fulfillment, catalog and CDC, then include AZ loss, hot keys, growth and consumer parallelism.</p></div><div className="rounded-2xl border border-[#d8d8d8] bg-[#ededed] p-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#777]">Replicated broker writes</p><strong className="mt-2 block text-2xl tracking-[-.04em]">1.625 GB/s</strong><code className="mt-2 block text-[10px] leading-5">416.67 MB/s × RF3 × 1.30 headroom</code><p className="mt-2 text-xs leading-5 text-[#555]">Also model consumer egress, replica catch-up, disk retention, leader imbalance, rebalances, and broker/AZ failure.</p></div></div>
        <div className="mt-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#666]">Campaign surge playbook</p><div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{SURGE_CASES.map((item, index) => <button key={item.label} type="button" aria-pressed={surgeIndex === index} onMouseEnter={() => setSurgeIndex(index)} onFocus={() => setSurgeIndex(index)} onClick={() => setSurgeIndex(index)} className={`rounded-xl border p-3 text-left text-xs font-bold outline-none transition ${surgeIndex === index ? "border-[#111] bg-[#111] text-white" : "border-[#d8d8d8] bg-white hover:border-[#777]"}`}>{item.label}</button>)}</div><article className="mt-3 grid gap-px overflow-hidden rounded-2xl border border-[#bdbdbd] bg-[#d8d8d8] md:grid-cols-3" aria-live="polite">{[["Detect", surge.signal], ["Contain", surge.contain], ["Recover + prove", surge.recover]].map(([label, detail]) => <div key={label} className="bg-[#f7f7f7] p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#666]">{label}</p><p className="mt-2 text-[11px] leading-5 text-[#444]">{detail}</p></div>)}</article></div>
      </KafkaSection>

      <KafkaSection id="kafka-reliability" eyebrow="04 · Reliability" title="Make retry safe at every boundary" subtitle="Kafka is durable at-least-once transport. Business correctness still depends on the source commit, stable identities, source sequence, checkpointed state, idempotent effects, reconciliation, and workload isolation.">
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,.85fr)]"><div className="grid gap-3 sm:grid-cols-2">{RELIABILITY_CONTROLS.map((item, index) => <SelectableCard key={item.title} testId={`amazon-control-${index}`} active={controlIndex === index} onSelect={() => setControlIndex(index)} className="min-h-[178px]"><div className="flex items-start justify-between gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-[10px] font-bold ${controlIndex === index ? "bg-[#111] text-white" : "bg-[#ededed]"}`}>0{index + 1}</span><MonoBadge>{item.label}</MonoBadge></div><h3 className="mt-4 text-sm font-bold">{item.title}</h3><p className="mt-1.5 text-xs leading-5 text-[#555]">{item.detail}</p></SelectableCard>)}</div><aside data-testid="amazon-control-explanation" className="overflow-hidden rounded-2xl border border-[#111] bg-[#ededed] xl:sticky xl:top-28 xl:self-start" aria-live="polite"><div className="border-b border-[#c9c9c9] bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[.17em] text-[#666]">Reliability control explained</p><h3 className="mt-1 text-lg font-bold">{control.title}</h3></div><div className="space-y-4 p-5"><p className="text-sm leading-6 text-[#333]">{control.detail}</p><div className="rounded-xl border border-[#c9c9c9] bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">Evidence retained</p><code className="mt-1 block text-[10px] font-bold leading-5">{control.evidence}</code></div><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">Important boundary</p><p className="mt-1 text-xs font-semibold leading-5">{control.boundary}</p></div></div></aside></div>
        <div className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-[#bdbdbd] bg-[#d8d8d8] sm:grid-cols-3">{[["Producer", "acks=all · idempotence · compression · bounded retry"], ["Broker", "RF3 · min ISR · quotas · rack/AZ awareness"], ["Consumer", "checkpoint · event dedupe · idempotent sink · lag SLO"]].map(([label, detail]) => <div key={label} className="bg-white p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">{label}</p><p className="mt-1.5 text-xs font-bold leading-5">{detail}</p></div>)}</div>
      </KafkaSection>

      <KafkaSection id="kafka-retention" eyebrow="05 · Retention + replay" title="Keep Kafka long enough to recover—not forever" subtitle="Retention follows criticality, volume, privacy, and recovery time. Kafka provides bounded hot replay; immutable Bronze provides economical history after offsets expire.">
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#bdbdbd]"><div className="hidden grid-cols-[78px_1.1fr_110px_125px_1.6fr] gap-3 border-b border-[#d8d8d8] bg-[#ededed] px-4 py-3 text-[9px] font-bold uppercase tracking-[.14em] text-[#555] md:grid"><span>Class</span><span>Topic family</span><span>Retention</span><span>Policy</span><span>Commerce reason</span></div>{RETENTION_CLASSES.map((item) => <article key={item.name} className="grid gap-3 border-b border-[#d8d8d8] bg-white p-4 last:border-b-0 md:grid-cols-[78px_1.1fr_110px_125px_1.6fr] md:items-center"><MonoBadge>{item.priority}</MonoBadge><div><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#777] md:hidden">Topic family</p><h3 className="mt-1 text-xs font-bold md:mt-0">{item.name}</h3></div><div><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#777] md:hidden">Retention</p><p className="mt-1 text-xs font-bold md:mt-0">{item.retention}</p></div><div><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#777] md:hidden">Policy</p><code className="mt-1 block text-[10px] font-bold md:mt-0">{item.policy}</code></div><p className="text-xs leading-5 text-[#555]">{item.why}</p></article>)}</div>
        <div className="mt-4 rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7] p-4 sm:p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#777]">Controlled replay</p><h3 className="mt-1 text-base font-bold">Correct a broken order transformation without hurting live traffic</h3></div><MonoBadge>Kafka window → Bronze history</MonoBadge></div><div className="mt-4 grid gap-3 lg:grid-cols-4">{[
          ["01", "Bound the incident", "Identify topics, partitions, offsets, schemas, regions, business keys, and the exact time range affected."],
          ["02", "Use an isolated lane", "Run a separately throttled consumer group so correction cannot steal capacity from live order and payment products."],
          ["03", "Write to staging", "Apply corrected code to a shadow table or serving version; never overwrite the certified product in place."],
          ["04", "Reconcile + publish", "Compare source, outbox, Kafka, Bronze and output counts, then atomically promote or roll back the new version."],
        ].map(([step, title, detail]) => <article key={step} className="rounded-xl border border-[#d8d8d8] bg-white p-4"><span className="font-mono text-[10px] font-bold text-[#777]">{step}</span><h4 className="mt-2 text-xs font-bold">{title}</h4><p className="mt-1.5 text-[11px] leading-5 text-[#555]">{detail}</p></article>)}</div><p className="mt-4 border-t border-[#d8d8d8] pt-4 text-xs font-semibold leading-5">When offsets have expired, read immutable Bronze records with their original topic, partition, offset, schema ID and ingestion time. Kafka is the hot transport log; Bronze is the durable replay evidence.</p></div>
      </KafkaSection>
    </div>
  );
}
