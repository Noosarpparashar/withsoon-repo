"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import CompanyChapterRail from "../data-design/CompanyChapterRail";
import MobileSectionNav from "../data-design/MobileSectionNav";
import AmazonArchitecture from "./AmazonArchitecture";
import AmazonEventSources from "./AmazonEventSources";
import AmazonIngestionKafka from "./AmazonIngestionKafka";
import AmazonBatchLakehouse from "./AmazonBatchLakehouse";
import AmazonDataModeling, {
  AmazonModelInspector,
  DEFAULT_AMAZON_MODEL_EXPLANATION,
  type AmazonModelExplanation,
} from "./AmazonDataModeling";
import AmazonGovernanceQuality from "./AmazonGovernanceQuality";
import AmazonInterviewQA from "./AmazonInterviewQA";
import {
  AMAZON_CHAPTERS,
  AMAZON_SECTIONS,
  type AmazonChapter,
} from "./data";

const ORANGE = "#111111";
const INK = "#111111";

type IconName =
  | "cursor"
  | "box"
  | "card"
  | "warehouse"
  | "stream"
  | "bolt"
  | "lake"
  | "check"
  | "chart"
  | "brain"
  | "shield";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    cursor: <><path d="m5 3 13 8-6 2-3 6L5 3Z"/><path d="m12 13 5 5"/></>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></>,
    warehouse: <><path d="m3 9 9-6 9 6v12H3V9Z"/><path d="M7 13h10v8M8 9h.01M12 9h.01M16 9h.01"/></>,
    stream: <><path d="M4 6h12a4 4 0 0 1 4 4 4 4 0 0 1-4 4H8a4 4 0 0 0-4 4"/><path d="m7 15-3 3-3-3"/></>,
    bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>,
    lake: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    check: <><path d="M20 11.5V12a8 8 0 1 1-4.7-7.3"/><path d="m9 11 3 3L22 4"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    brain: <><path d="M9.5 4.5A3 3 0 0 0 4 6v1.5a3 3 0 0 0-1 5.6V15a3 3 0 0 0 3 3h3.5V4.5ZM14.5 4.5A3 3 0 0 1 20 6v1.5a3 3 0 0 1 1 5.6V15a3 3 0 0 1-3 3h-3.5V4.5Z"/><path d="M9.5 9H7M14.5 9H17M9.5 14H7M14.5 14H17"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
  };

  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function Section({ id, number, eyebrow, title, subtitle, children }: {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-40 overflow-hidden rounded-[28px] border border-[#d5d9d9] bg-white shadow-[0_18px_50px_rgba(19,26,34,.07)]">
      <div className="flex items-start gap-4 border-b border-[#eaeded] px-5 py-5 sm:px-7 sm:py-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff3df] font-mono text-xs font-black text-[#b35d00]">{number}</span>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#7a6545]">{eyebrow}</p>
          <h2 className="mt-1.5 text-2xl font-bold tracking-[-.04em] text-[#131a22] sm:text-[28px]">{title}</h2>
          {subtitle ? <p className="mt-2 max-w-4xl text-sm leading-6 text-[#5b6673]">{subtitle}</p> : null}
        </div>
      </div>
      <div className="p-5 sm:p-7">{children}</div>
    </section>
  );
}

const SOURCES = [
  { code: "BEHAVIOR", icon: "cursor" as const, title: "Customer journeys", detail: "Views, searches, impressions, clicks, cart changes, and experiment exposure arrive at extreme volume.", example: "A customer searches for headphones, compares three offers, and adds one SKU to cart.", rule: "Validate client events server-side, keep event time and ingestion time, and declare sampling." },
  { code: "ORDERS", icon: "box" as const, title: "Checkout + orders", detail: "Order headers, line items, status changes, promotions, and cancellations form a strict business lifecycle.", example: "One checkout creates an order with three items from two sellers and separate fulfillment promises.", rule: "Model the order item grain explicitly and preserve every lifecycle transition." },
  { code: "MONEY", icon: "card" as const, title: "Payments + refunds", detail: "Authorizations, captures, settlements, fees, refunds, and chargebacks require financial reconciliation.", example: "A payment is authorized now, captured after shipment, then partially refunded days later.", rule: "Use integer minor units, immutable ledgers, and a certified truth path." },
  { code: "SUPPLY", icon: "warehouse" as const, title: "Inventory + fulfillment", detail: "Reservations, movements, availability, picks, packs, shipments, delivery attempts, and returns change independently.", example: "Two units move from available to reserved while a parcel is reassigned to another fulfillment node.", rule: "The analytical lake observes inventory; it never becomes checkout's reservation authority." },
] as const;

const BACKBONE = [
  { code: "INGEST", icon: "stream" as const, title: "Kafka + CDC", detail: "Domain events, outbox records, database change logs, and partner feeds enter durable, replayable streams.", example: "orders.v1 is keyed by order_id; inventory_movements.v1 by SKU and location.", rule: "Contracts, stable IDs, source sequence, partition keys, quotas, and DLQs are first-class." },
  { code: "FAST", icon: "bolt" as const, title: "Real-time path", detail: "Flink validates, deduplicates, enriches, windows, and updates operational views and online features.", example: "A five-minute conversion window and seller order counter update within seconds.", rule: "Live values are useful and provisional; bound state and design for late events." },
  { code: "TRUTH", icon: "lake" as const, title: "Lakehouse path", detail: "S3 and Iceberg preserve Bronze evidence, reusable Silver entities, and certified Gold products.", example: "T+1 finance replays complete orders, captures, refunds, fees, and settlements.", rule: "Snapshots, idempotent MERGE, compaction, lineage, and atomic publication make correction safe." },
  { code: "CONTROL", icon: "check" as const, title: "Quality + governance", detail: "Ownership, schema checks, reconciliation, privacy, lineage, access, and deletion span every layer.", example: "A bad revenue build is quarantined before the certified snapshot is published.", rule: "Freshness without completeness is unsafe; every product exposes both." },
] as const;

const CONSUMERS = [
  { code: "OPS", icon: "chart" as const, title: "Operations", detail: "Live demand, checkout errors, payment failures, backlog, and fulfillment health.", example: "Operators see payment authorization failures spike for one processor.", rule: "Serve seconds-to-minutes signals from a low-latency analytical store." },
  { code: "BI", icon: "check" as const, title: "Finance + BI", detail: "Certified GMV, net sales, fees, returns, seller performance, and historical trends.", example: "Finance closes the day from reconciled captures and refunds, not clickstream estimates.", rule: "Metric version, grain, owner, cutoff, and reconciliation status travel with every number." },
  { code: "ML", icon: "brain" as const, title: "ML + personalization", detail: "Recommendations, ranking, fraud signals, demand forecasts, and customer-service intelligence.", example: "Point-in-time-correct behavior features rank products without future leakage.", rule: "Keep online and offline feature definitions versioned and comparable." },
  { code: "MARKET", icon: "shield" as const, title: "Sellers + governance", detail: "Tenant-isolated dashboards, catalog quality, settlements, audit, privacy, and regulatory workflows.", example: "A seller sees only their offers, orders, inventory, and settlement status.", rule: "Row isolation, purpose-bound access, tokenization, lineage, and deletion are design inputs." },
] as const;

const COMPONENT_EXPLANATIONS: Record<string, { flow: string; failure: string; interview: string }> = {
  BEHAVIOR: {
    flow: "The browser and mobile apps attach a stable event ID, session ID, event time, page context, experiment assignments, and consent metadata. Edge collectors authenticate the request, reject malformed payloads, apply declared sampling, and publish accepted events without delaying the customer journey.",
    failure: "Client clocks drift, retries create duplicates, bots inflate traffic, and ad blockers create missing events. Treat behavior as observational evidence, not as the authority for orders, payments, or inventory.",
    interview: "I keep raw interaction evidence replayable, but validate it at the edge and reconcile conversion against server-owned order facts.",
  },
  ORDERS: {
    flow: "Checkout writes the order and an outbox record in one database transaction. CDC publishes lifecycle changes to Kafka, where consumers build an immutable status history and a current order-item view without performing a fragile dual write.",
    failure: "Mixing order, order-item, shipment, and payment grains produces double-counted revenue. Out-of-order status events can also move an order backwards unless source sequence and transition rules are preserved.",
    interview: "The order service owns transactional truth; the data platform preserves each transition and models one row per order item for analytics.",
  },
  MONEY: {
    flow: "Payment events arrive independently as authorization, capture, settlement, fee, refund, and chargeback movements. Streaming provides early health indicators, while the truth path joins processor files and internal ledgers before publishing certified finance metrics.",
    failure: "A successful authorization is not cash, and a captured amount can later be partially refunded. Using floating-point money or overwriting prior states makes audit and reconciliation unreliable.",
    interview: "I store immutable money movements in integer minor units and separate provisional payment health from reconciled financial truth.",
  },
  SUPPLY: {
    flow: "Operational inventory services emit every receipt, reservation, release, transfer, shipment, adjustment, and return. The data platform keeps the movement ledger, derives near-real-time availability views, and periodically rebuilds certified SKU-location snapshots.",
    failure: "Late or duplicated movements create impossible negative stock, while hot SKUs overload a single partition. Analytics must never answer the synchronous checkout reservation decision.",
    interview: "I model inventory as movements plus snapshots, reconcile the two, and leave reservation authority in the transactional inventory service.",
  },
  INGEST: {
    flow: "Producers publish versioned domain events directly or write an outbox beside their transaction. CDC connectors preserve source position and sequence, Kafka partitions retain required key order, and schema validation routes incompatible records to quarantine rather than silently dropping them.",
    failure: "A database write followed by a separate Kafka write creates dual-write loss. Poor partition keys create hot brokers, while short retention removes the recovery window needed after a downstream incident.",
    interview: "Kafka is the durable handoff and replay log—not the order database—and outbox plus CDC closes the dual-write gap.",
  },
  FAST: {
    flow: "Flink reads versioned Kafka events, validates schemas, deduplicates stable event IDs, enriches from broadcast reference data, and computes event-time windows. Checkpoints protect operator state, while idempotent sinks publish live counters, alerts, seller views, and online features within seconds.",
    failure: "Unbounded deduplication or joins exhaust state; processing-time windows misclassify late mobile events; a non-idempotent sink repeats results after recovery. Watermarks, state TTL, checkpoint monitoring, and sink versioning bound those risks.",
    interview: "The streaming result is low latency and operationally useful, but explicitly provisional until complete history is reconciled through the truth path.",
  },
  TRUTH: {
    flow: "Every accepted record first lands as immutable Bronze evidence in object storage. Deterministic Spark jobs create deduplicated, typed Silver entities; governed Gold jobs calculate certified products and atomically publish a new Iceberg snapshot after reconciliation and quality gates pass.",
    failure: "Overwriting tables in place makes partial failures visible, small files degrade scans, and undocumented metric changes break consumers. Snapshot isolation, compaction, lineage, and versioned definitions keep correction safe.",
    interview: "Bronze answers what arrived, Silver represents canonical business facts, and Gold publishes an owned, certified metric or data product.",
  },
  CONTROL: {
    flow: "Contracts identify schema, grain, owner, privacy class, retention, freshness, and completeness. Automated gates compare counts, nulls, distributions, lifecycle balances, and financial totals before a candidate snapshot becomes visible to consumers.",
    failure: "A pipeline can be fresh while missing an entire region, or internally consistent while using the wrong business definition. Technical monitoring alone cannot detect semantic drift.",
    interview: "I expose freshness and completeness together, attach ownership and lineage, and make certification a publish decision rather than a dashboard label.",
  },
  OPS: {
    flow: "Streaming aggregates are written to a low-latency analytical store with window time, source lag, completeness, deployment version, and drill-down dimensions. Alerts combine customer outcomes with Kafka, processor, and sink health to distinguish product failures from data delays.",
    failure: "A stale dashboard may look healthy during an incident. Alerting on averages also hides a failing region, payment processor, seller cohort, or fulfillment node.",
    interview: "Every operational metric carries last-updated and completeness context, and alerts segment by the smallest actionable business dimension.",
  },
  BI: {
    flow: "Certified Gold tables expose documented dimensions and facts through Trino, Athena, or a warehouse semantic layer. Metric versions define inclusion rules, currency conversion, refund treatment, and the snapshot cutoff used for each reporting period.",
    failure: "Product, seller, and finance teams can each publish a plausible but different GMV. Joining facts at mismatched grains also silently multiplies totals.",
    interview: "I define the metric contract and row grain before choosing the serving engine, then reconcile the result to source-controlled totals.",
  },
  ML: {
    flow: "Streaming jobs materialize approved online features, while Iceberg snapshots reproduce the same definitions for training. Feature timestamps, event-time joins, and versioned transformations ensure training sees only information that existed when a prediction would have been made.",
    failure: "Future data leaking into training exaggerates model quality, and online/offline skew changes production behavior. Sensitive features can also outlive their permitted purpose without TTL and deletion propagation.",
    interview: "I require point-in-time-correct offline features, version-matched online materialization, skew monitoring, and purpose-bound access.",
  },
  MARKET: {
    flow: "Seller-facing products filter certified orders, inventory, offers, fees, and settlements by an authorized tenant boundary. Governance services attach field classification, access policy, lineage, retention, and deletion status before data is exposed.",
    failure: "A missing seller predicate becomes a cross-tenant data leak. Plain hashes of low-entropy identifiers are reversible, and copying restricted fields into broad tables defeats later deletion.",
    interview: "Seller isolation is enforced in storage and serving—not trusted to dashboard filters—and every sensitive field has a declared purpose and lifecycle.",
  },
};

type Selection = { lane: "source" | "backbone" | "consumer"; index: number };
type MapItem = (typeof SOURCES)[number] | (typeof BACKBONE)[number] | (typeof CONSUMERS)[number];

function MapButton({ item, active, onSelect }: { item: MapItem; active: boolean; onSelect: () => void }) {
  return (
    <button type="button" aria-pressed={active} onClick={onSelect} onFocus={onSelect} onMouseEnter={onSelect}
      className={`group flex min-h-[58px] w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left outline-none transition duration-200 ${active ? "border-[#ff9900] bg-white shadow-[0_8px_20px_rgba(255,153,0,.12)] ring-2 ring-[#ff9900]/20" : "border-[#d5d9d9] bg-[#f7f8f8] hover:-translate-y-0.5 hover:border-[#c47b17] hover:bg-white"}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? "bg-[#131a22] text-[#ffb84d]" : "bg-white text-[#495463] group-hover:bg-[#fff3df] group-hover:text-[#b35d00]"}`}><Icon name={item.icon} className="h-4 w-4"/></span>
      <span className="min-w-0"><span className="block text-[9px] font-extrabold tracking-[.14em] text-[#7a6545]">{item.code}</span><span className="mt-0.5 block text-xs font-bold text-[#131a22]">{item.title}</span></span>
    </button>
  );
}

const PRODUCTS = [
  {
    icon: "cursor" as const,
    name: "Commerce funnel",
    event: "order_confirmed",
    source: "view → search → product → cart → checkout → order",
    grain: "Silver keeps one row per customer-session action. Gold keeps one row per market × device × funnel step × time window.",
    sources: "Validated web and app behavior, search impressions, cart mutations, checkout starts, server-owned order confirmations, and experiment assignments.",
    build: "Validate event contracts, deduplicate event_id, sessionize by event time, join the confirmed order outcome, apply attribution rules, and correct windows when late events arrive.",
    serving: "Flink publishes minute conversion and drop-off signals for operations; Iceberg publishes corrected funnel history for product analysis and experiments.",
    example: "A customer views headphones, adds a seller offer to cart, starts checkout, and confirms an order. The product connects those steps without treating the client click as order truth.",
    caution: "Client telemetry explains the journey; the order service remains the authority for conversion.",
  },
  {
    icon: "box" as const,
    name: "Order lifecycle",
    event: "order_status_changed",
    source: "created → confirmed → allocated → shipped → delivered / returned",
    grain: "Silver keeps one row per order item and an immutable row per status transition. Gold summarizes item outcomes by seller, market, and promised date.",
    sources: "Checkout outbox events, order CDC, seller confirmations, allocation decisions, shipment scans, delivery outcomes, cancellations, and returns.",
    build: "Order events by source sequence, reject invalid transitions, preserve the full history, derive the latest item state, and reconcile items to order headers and shipments.",
    serving: "Streaming serves live seller and operations views; Iceberg and the warehouse serve certified fulfillment, returns, and revenue-eligibility reporting.",
    example: "One order contains three items from two sellers. Each item can ship, arrive, cancel, or return independently, so analytics never collapses them into one order-level state.",
    caution: "Never join order, order-item, shipment, and payment facts without respecting their different grains.",
  },
  {
    icon: "card" as const,
    name: "Financial truth",
    event: "payment_movement",
    source: "authorized → captured → settled → refunded / charged back",
    grain: "One immutable Silver row per money movement in integer minor units; Gold publishes one certified metric row per business dimension and accounting period.",
    sources: "Payment-service events, processor settlement files, internal ledger entries, seller fees, taxes, promotions, refunds, and chargebacks.",
    build: "Deduplicate provider references, normalize currencies and movement types, match captures to settlements, include eligible refunds and fees, and gate publication on ledger reconciliation.",
    serving: "A provisional stream shows payment health within minutes; the reconciled truth path publishes T+1 finance, tax, and seller-settlement products.",
    example: "A payment is authorized at checkout, captured after shipment, settled by the processor, and partially refunded later. Every movement remains visible and auditable.",
    caution: "GMV, booked revenue, cash, and net sales are separate definitions—not interchangeable totals.",
  },
  {
    icon: "warehouse" as const,
    name: "Inventory position",
    event: "inventory_movement",
    source: "received → available → reserved → shipped / released",
    grain: "One Silver row per inventory movement at SKU × location, plus periodic certified snapshots at the same business grain.",
    sources: "Warehouse receipts, reservations, releases, transfers, picks, shipments, returns, damage adjustments, and cycle-count corrections.",
    build: "Order movements by source sequence, deduplicate retries, calculate signed quantity deltas, rebuild snapshots, and reconcile derived balances against operational counts.",
    serving: "Streaming powers low-stock alerts and supply dashboards; Iceberg history supports certified position, shrinkage analysis, planning, and demand forecasting.",
    example: "Two units move from available to reserved, one ships, and one reservation expires. The movement ledger explains why the ending SKU-location balance changed.",
    caution: "The analytical inventory product explains and forecasts stock; checkout still reserves against the transactional inventory service.",
  },
] as const;

const AMAZON_FUNCTIONAL_REQUIREMENTS = [
  ["Commerce lifecycle truth", "Preserve customer, catalog, cart, order-item, payment, inventory, fulfillment, return, and seller facts at their correct grains."],
  ["Operational visibility", "Expose current order failures, payment health, inventory pressure, fulfillment delay, and pipeline freshness within seconds to minutes."],
  ["Financial reconciliation", "Publish auditable GMV, captures, settlements, fees, taxes, refunds, chargebacks, and seller payouts without double counting."],
  ["Seller analytics", "Provide tenant-isolated order, conversion, inventory, fulfillment, return, and settlement products with clear completeness status."],
  ["Personalization + fraud", "Create point-in-time-correct behavioral, transaction, and risk features for online decisions and reproducible training."],
  ["Historical analytics", "Support funnels, cohorts, experiments, search quality, supply planning, executive BI, and long-range trend analysis."],
  ["Replay + correction", "Rebuild affected history after late data, a producer defect, a rule change, a failed job, or an incorrect metric release."],
  ["Governance + security", "Classify PII and payment fields, enforce seller isolation, retain lineage, audit access, and propagate retention and deletion."],
] as const;

function RequirementRange({ label, value, min, max, step, suffix, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <label className="block rounded-2xl border border-[#d8d8d8] bg-white p-4">
      <span className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-[#333]">{label}</span><strong className="rounded-lg bg-[#ededed] px-2.5 py-1 font-mono text-xs text-[#111]">{value}{suffix}</strong></span>
      <input className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#d8d8d8] accent-[#111]" style={{ background: `linear-gradient(to right, #111 ${progress}%, #d8d8d8 ${progress}%)` }} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} />
      <span className="mt-2 flex justify-between text-[9px] font-semibold text-[#5f5f5f]"><span>{min}{suffix}</span><span>{max}{suffix}</span></span>
    </label>
  );
}

function formatRate(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M/s`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K/s`;
  return `${value.toFixed(0)}/s`;
}

function exact(value: number, maximumFractionDigits = 2) {
  return value.toLocaleString("en-US", { maximumFractionDigits });
}

function AmazonRequirements() {
  const [ordersPerDay, setOrdersPerDay] = useState(10);
  const [eventsPerOrder, setEventsPerOrder] = useState(30);
  const [behaviorEventsPerDay, setBehaviorEventsPerDay] = useState(3);
  const [averageEventBytes, setAverageEventBytes] = useState(1000);

  const calculations = useMemo(() => {
    const secondsPerDay = 86_400;
    const orderPeakMultiplier = 20;
    const behaviorPeakMultiplier = 10;
    const replicationFactor = 3;
    const headroom = 1.3;
    const kafkaRetentionDays = 7;
    const dailyOrders = ordersPerDay * 1_000_000;
    const dailyOrderEvents = dailyOrders * eventsPerOrder;
    const dailyBehaviorEvents = behaviorEventsPerDay * 1_000_000_000;
    const totalEventsPerDay = dailyOrderEvents + dailyBehaviorEvents;
    const averageOrdersPerSecond = dailyOrders / secondsPerDay;
    const peakOrdersPerSecond = averageOrdersPerSecond * orderPeakMultiplier;
    const averageOrderEventsPerSecond = dailyOrderEvents / secondsPerDay;
    const peakOrderEventsPerSecond = averageOrderEventsPerSecond * orderPeakMultiplier;
    const averageBehaviorEventsPerSecond = dailyBehaviorEvents / secondsPerDay;
    const peakBehaviorEventsPerSecond = averageBehaviorEventsPerSecond * behaviorPeakMultiplier;
    const peakCoreEventsPerSecond = peakOrderEventsPerSecond + peakBehaviorEventsPerSecond;
    const logicalTbPerDay = totalEventsPerDay * averageEventBytes / 1_000_000_000_000;
    const peakLogicalGBps = peakCoreEventsPerSecond * averageEventBytes / 1_000_000_000;
    const plannedBrokerGBps = peakLogicalGBps * replicationFactor * headroom;
    const kafkaPhysicalTb = logicalTbPerDay * kafkaRetentionDays * replicationFactor;
    const annualCorePb = logicalTbPerDay * 365 / 1_000;
    return { dailyOrders, dailyOrderEvents, dailyBehaviorEvents, totalEventsPerDay, averageOrdersPerSecond, peakOrdersPerSecond, averageOrderEventsPerSecond, peakOrderEventsPerSecond, averageBehaviorEventsPerSecond, peakBehaviorEventsPerSecond, peakCoreEventsPerSecond, logicalTbPerDay, peakLogicalGBps, plannedBrokerGBps, kafkaPhysicalTb, annualCorePb };
  }, [ordersPerDay, eventsPerOrder, behaviorEventsPerDay, averageEventBytes]);

  const freshness = [
    { consumer: "Fraud features", clock: "< 5 sec", width: "12%" },
    { consumer: "Order operations", clock: "< 1 min", width: "24%" },
    { consumer: "Inventory + recommendations", clock: "1–5 min", width: "42%" },
    { consumer: "Seller order feed", clock: "< 5 min", width: "42%" },
    { consumer: "Funnel + search performance", clock: "< 15 min", width: "60%" },
    { consumer: "Executive KPIs", clock: "< 1 hour", width: "78%" },
    { consumer: "Reconciled finance", clock: "T+1 close", width: "100%" },
  ] as const;

  return (
    <div className="mt-5 space-y-5">
      <Section id="functional-requirements" number="01" eyebrow="Functional scope" title="Define what the commerce data platform must produce" subtitle="Product features provide context. The requirements chapter focuses on the data products, guarantees, and recovery behavior the platform must own.">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {AMAZON_FUNCTIONAL_REQUIREMENTS.map(([title, detail], index) => <article key={title} className="flex gap-2.5 rounded-xl border border-[#d8d8d8] bg-[#f7f7f7] p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ededed] font-mono text-[9px] font-black text-[#111]">{String(index + 1).padStart(2, "0")}</span><div><h3 className="text-xs font-bold text-[#111]">{title}</h3><p className="mt-1 text-[10px] leading-4 text-[#5f5f5f]">{detail}</p></div></article>)}
        </div>
        <div className="mt-3 flex gap-2 rounded-xl border border-[#d8d8d8] bg-[#ededed] px-3 py-2.5"><Icon name="shield" className="h-4 w-4 shrink-0 text-[#111]"/><p className="text-[10px] leading-4 text-[#444]"><strong className="text-[#111]">Boundary:</strong> checkout, payment authorization, inventory reservation, and fulfillment execution remain owned by transactional services; the data platform observes and reconciles them.</p></div>
      </Section>

      <Section id="freshness-contracts" number="02" eyebrow="Freshness + correctness" title="Give each consumer the clock and guarantee it needs" subtitle="One pipeline should not be forced to satisfy fraud, operations, sellers, product analytics, executive BI, and finance with the same latency and correctness contract.">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-[#d8d8d8] bg-[#d8d8d8]">
          {freshness.map((item) => <div key={item.consumer} className="grid items-center gap-3 bg-[#f7f7f7] px-4 py-3 sm:grid-cols-[220px_minmax(0,1fr)_100px]"><p className="text-xs font-bold text-[#111]">{item.consumer}</p><div className="h-2 overflow-hidden rounded-full bg-[#d8d8d8]"><span className="block h-full rounded-full bg-[#111]" style={{ width: item.width }}/></div><strong className="font-mono text-xs sm:text-right">{item.clock}</strong></div>)}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {["No duplicate order revenue", "No double-counted refunds", "Deterministic replay", "Auditable reconciliation"].map((item) => <div key={item} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#d8d8d8] bg-white px-3 text-[10px] font-bold"><Icon name="check" className="h-4 w-4 shrink-0"/>{item}</div>)}
        </div>
      </Section>

      <Section id="workload-model" number="03" eyebrow="Capacity + sizing" title="Size orders, event amplification, ingress, and storage" subtitle="These are rounded interview assumptions from the Amazon reference brief, not claims about Amazon internals. The calculator separates average load, campaign peaks, logical volume, replication, and headroom.">
        <div className="mb-4 overflow-hidden rounded-2xl border border-[#d8d8d8] bg-[#d8d8d8]">
          <div className="bg-[#ededed] px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#111]">Inputs used by every equation</p></div>
          <dl className="grid gap-px bg-[#d8d8d8] sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Orders/day", `${exact(calculations.dailyOrders, 0)} orders/day`, "Customer orders created in one 24-hour period."],
              ["Events/order", `${eventsPerOrder} events/order`, "Lifecycle facts generated by one order across checkout, payment, inventory, fulfillment, and returns."],
              ["Behavior events/day", `${exact(calculations.dailyBehaviorEvents, 0)} events/day`, "Views, impressions, searches, clicks, cart actions, and experiment events in 24 hours."],
              ["Bytes/event", `${averageEventBytes} bytes/event`, "Average serialized event size used for logical ingress and storage estimates."],
            ].map(([term, value, meaning]) => <div key={term} className="bg-white p-4"><dt className="text-[9px] font-bold uppercase tracking-[.14em] text-[#5f5f5f]">{term}</dt><dd className="mt-1 text-sm font-bold text-[#111]">{value}</dd><dd className="mt-1 text-[10px] leading-4 text-[#5f5f5f]">{meaning}</dd></div>)}
          </dl>
        </div>
        <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="grid gap-3">
            <RequirementRange label="Order volume" value={ordersPerDay} min={5} max={30} step={1} suffix="M orders/day" onChange={setOrdersPerDay}/>
            <RequirementRange label="Order lifecycle amplification" value={eventsPerOrder} min={10} max={60} step={5} suffix=" events/order" onChange={setEventsPerOrder}/>
            <RequirementRange label="Behavioral event volume" value={behaviorEventsPerDay} min={1} max={10} step={1} suffix="B events/day" onChange={setBehaviorEventsPerDay}/>
            <RequirementRange label="Average serialized event size" value={averageEventBytes} min={500} max={2000} step={100} suffix=" bytes/event" onChange={setAverageEventBytes}/>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-[#bdbdbd] bg-white">
            <div className="border-b border-[#d8d8d8] bg-[#ededed] px-5 py-4"><p className="text-[9px] font-bold uppercase tracking-[.17em] text-[#111]">Derived capacity envelope</p><p className="mt-1 text-xs text-[#5f5f5f]">Decimal units · core behavior + order-domain events · before logs, CDC, catalog, and partner feeds</p></div>
            <div className="grid gap-px bg-[#d8d8d8] sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Average orders", formatRate(calculations.averageOrdersPerSecond), `${exact(calculations.dailyOrders, 0)} orders/day ÷ 86,400 sec/day = ${exact(calculations.averageOrdersPerSecond)} orders/sec`],
                ["Campaign order peak", formatRate(calculations.peakOrdersPerSecond), `${exact(calculations.averageOrdersPerSecond)} orders/sec average × 20 peak = ${exact(calculations.peakOrdersPerSecond)} orders/sec`],
                ["Peak order events", formatRate(calculations.peakOrderEventsPerSecond), `${exact(calculations.dailyOrders, 0)} orders/day × ${eventsPerOrder} events/order = ${exact(calculations.dailyOrderEvents, 0)} events/day → ÷ 86,400 = ${exact(calculations.averageOrderEventsPerSecond)} events/sec → × 20 = ${exact(calculations.peakOrderEventsPerSecond)} events/sec`],
                ["Peak behavior events", formatRate(calculations.peakBehaviorEventsPerSecond), `${exact(calculations.dailyBehaviorEvents, 0)} events/day ÷ 86,400 = ${exact(calculations.averageBehaviorEventsPerSecond)} events/sec → × 10 = ${exact(calculations.peakBehaviorEventsPerSecond)} events/sec`],
                ["Peak logical ingress", `${calculations.peakLogicalGBps.toFixed(3)} GB/s`, `(${exact(calculations.peakOrderEventsPerSecond)} order + ${exact(calculations.peakBehaviorEventsPerSecond)} behavior) events/sec × ${averageEventBytes} bytes/event ÷ 1,000,000,000 = ${calculations.peakLogicalGBps.toFixed(3)} GB/sec`],
                ["Planned broker writes", `${calculations.plannedBrokerGBps.toFixed(3)} GB/s`, `${calculations.peakLogicalGBps.toFixed(3)} GB/sec logical × 3 replicas × 1.30 headroom = ${calculations.plannedBrokerGBps.toFixed(3)} GB/sec`],
              ].map(([label, value, formula]) => <div key={label} className="bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#5f5f5f]">{label}</p><strong className="mt-2 block text-2xl tracking-[-.04em] text-[#111]">{value}</strong><p className="mt-3 text-[9px] font-bold uppercase tracking-[.12em] text-[#5f5f5f]">Calculation</p><code className="mt-1 block rounded-lg bg-[#f7f7f7] px-2.5 py-2 text-[10px] leading-5 text-[#444]">{formula}</code></div>)}
            </div>
            <div className="border-t border-[#d8d8d8] bg-[#f7f7f7] px-5 py-4 text-xs leading-5 text-[#5f5f5f]"><strong className="text-[#111]">Campaign check:</strong> order-domain traffic uses a 20× peak, behavior uses 10×, and broker bandwidth adds RF3 plus 30% headroom.</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ["Modeled core data", `${calculations.logicalTbPerDay.toFixed(2)} TB/day`, `(${exact(calculations.dailyOrderEvents, 0)} order + ${exact(calculations.dailyBehaviorEvents, 0)} behavior) events/day × ${averageEventBytes} B ÷ 10¹² = ${calculations.logicalTbPerDay.toFixed(2)} TB/day`],
            ["Kafka 7-day physical", `${calculations.kafkaPhysicalTb.toFixed(2)} TB`, `${calculations.logicalTbPerDay.toFixed(2)} TB/day × 7 days × 3 replicas = ${calculations.kafkaPhysicalTb.toFixed(2)} TB`],
            ["Core annual history", `${calculations.annualCorePb.toFixed(2)} PB/year`, `${calculations.logicalTbPerDay.toFixed(2)} TB/day × 365 days ÷ 1,000 TB/PB = ${calculations.annualCorePb.toFixed(2)} PB/year`],
          ].map(([label, value, note]) => <article key={label} className="rounded-2xl border border-[#d8d8d8] bg-white p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#5f5f5f]">{label}</p><strong className="mt-2 block text-2xl tracking-[-.04em]">{value}</strong><p className="mt-2 text-[10px] leading-4 text-[#5f5f5f]">{note}</p></article>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-[#d8d8d8] bg-[#ededed] p-3" aria-label="Fixed planning assumptions">{["Order peak = 20×", "Behavior peak = 10×", "RF = 3", "Headroom = 30%", "Kafka retention = 7 days", "Reference total platform = multiple to tens of TB/day"].map((item) => <span key={item} className="rounded-full border border-[#d8d8d8] bg-white px-2.5 py-1 text-[10px] font-bold text-[#444]">{item}</span>)}</div>
      </Section>

      <Section id="capacity-implications" number="04" eyebrow="From requirements to architecture" title="Every requirement must change a design decision" subtitle="Numbers and SLOs matter only when they determine isolation, keys, state, storage, publication, governance, or recovery.">
        <div className="grid gap-3 lg:grid-cols-2">
          {[
            { n: "01", title: "Isolate traffic classes", signal: `${formatRate(calculations.peakCoreEventsPerSecond)} modeled peak`, decision: "Separate order and payment lifecycles, high-volume behavior, CDC, partner feeds, and replay traffic so a campaign cannot starve critical facts." },
            { n: "02", title: "Preserve business ordering", signal: "order + SKU-location keys", decision: "Partition only where lifecycle order is required, retain source sequence, and monitor hot products, sellers, and campaign partitions." },
            { n: "03", title: "Split fast from certified", signal: "<5 sec to T+1", decision: "Serve provisional fraud and operations signals quickly, then correct them through complete lakehouse replay and financial reconciliation." },
            { n: "04", title: "Plan for event amplification", signal: `${eventsPerOrder} events/order`, decision: "Capacity follows lifecycle events, impressions, telemetry, and peak skew—not the average order count alone." },
            { n: "05", title: "Publish corrections safely", signal: `${calculations.logicalTbPerDay.toFixed(2)} TB/day core`, decision: "Replay immutable Bronze into staging, compare counts and money totals, pass quality gates, and atomically publish a new Iceberg snapshot." },
            { n: "06", title: "Make access part of the model", signal: "PII + payments + sellers", decision: "Tokenize early, isolate sellers, restrict columns and rows, audit reads, honor residency, and propagate retention and deletion." },
          ].map((item) => <article key={item.n} className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-2xl border border-[#d8d8d8] bg-white p-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111] font-mono text-[10px] font-bold text-white">{item.n}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-[#111]">{item.title}</h3><span className="rounded-full border border-[#d8d8d8] bg-[#ededed] px-2.5 py-1 text-[9px] font-bold text-[#444]">{item.signal}</span></div><p className="mt-2 text-xs leading-5 text-[#5f5f5f]">{item.decision}</p></div></article>)}
        </div>
      </Section>
    </div>
  );
}

export default function AmazonDataEngineeringPage({ chapter }: { chapter: AmazonChapter }) {
  const activeIndex = Math.max(0, AMAZON_CHAPTERS.findIndex((item) => item.id === chapter));
  const active = AMAZON_CHAPTERS[activeIndex];
  const previous = AMAZON_CHAPTERS[activeIndex - 1];
  const next = AMAZON_CHAPTERS[activeIndex + 1];
  const sections = AMAZON_SECTIONS[chapter];
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");
  const [selection, setSelection] = useState<Selection>({ lane: "backbone", index: 1 });
  const [productIndex, setProductIndex] = useState(1);
  const [modelExplanation, setModelExplanation] = useState<AmazonModelExplanation>(DEFAULT_AMAZON_MODEL_EXPLANATION);
  const isModeling = chapter === "data-modeling";

  useEffect(() => {
    const sync = () => {
      let current = sections[0]?.id ?? "";
      for (const section of sections) {
        const node = document.getElementById(section.id);
        if (node && node.getBoundingClientRect().top <= 210) current = section.id;
      }
      setActiveSection(current);
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => { window.removeEventListener("scroll", sync); window.removeEventListener("resize", sync); };
  }, [sections]);

  const selectedItem: MapItem = selection.lane === "source" ? SOURCES[selection.index] : selection.lane === "backbone" ? BACKBONE[selection.index] : CONSUMERS[selection.index];
  const selectedExplanation = COMPONENT_EXPLANATIONS[selectedItem.code];
  const product = PRODUCTS[productIndex];
  const pageStyle = {
    "--bg": "#f1f1f1",
    "--bg-card": "#ffffff",
    "--bg-muted": "#e9e9e9",
    "--border": "#d8d8d8",
    "--text": INK,
    "--text-muted": "#5b6673",
    "--text-faint": "#515c68",
  } as CSSProperties;

  return (
    <div className="amazon-de-page min-h-[calc(100dvh-var(--site-nav-height))] bg-[#f1f1f1] text-[#111111]" style={pageStyle}>
      <CompanyChapterRail company="amazon" chapters={AMAZON_CHAPTERS} activeId={chapter} hrefFor={(id) => `/data-engineering/amazon/${id}`} />
      <MobileSectionNav sections={sections} accent={ORANGE} />

      <div className={`mx-auto grid w-full ${isModeling ? "max-w-[1920px] xl:grid-cols-[300px_minmax(0,1fr)]" : "max-w-[1600px] xl:grid-cols-[240px_minmax(0,1fr)]"}`}>
        <aside className={`hidden border-r border-[#d5d9d9] py-7 xl:block ${isModeling ? "px-4" : "px-5"}`}>
          <div className="sticky top-[calc(var(--de-chapter-shell-offset)+24px)]">
            <div className="mb-7 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[#d5d9d9] bg-white"><Image src="/logo-amazon.svg" alt="" width={40} height={40} className="h-9 w-9 object-contain" priority /></span>
              <div><p className="text-base font-bold tracking-[-.025em]">Amazon</p><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#7a6545]">E-commerce</p></div>
            </div>
            <div className="mb-3 flex items-center justify-between"><p className="text-[9px] font-extrabold uppercase tracking-[.17em] text-[#515c68]">Page anchors</p><span className="font-mono text-[9px] text-[#515c68]">{sections.findIndex((section) => section.id === activeSection) + 1}/{sections.length}</span></div>
            <nav aria-label="Sections in this chapter" className="grid gap-2">
              {sections.map((section, index) => {
                const selected = section.id === activeSection;
                return <a key={section.id} href={`#${section.id}`} aria-current={selected ? "location" : undefined} className={`relative flex min-h-[52px] items-center gap-3 rounded-xl border px-3 text-xs font-semibold transition ${selected ? "border-[#ff9900] bg-[#fff3df] text-[#131a22]" : "border-[#d5d9d9] bg-white text-[#5b6673] hover:border-[#c47b17] hover:text-[#131a22]"}`}>{selected ? <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#ff9900]" /> : null}<span className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[9px] font-bold ${selected ? "bg-[#131a22] text-[#ffb84d]" : "bg-[#eaeded] text-[#5b6673]"}`}>{index + 1}</span>{section.title}</a>;
              })}
            </nav>
            {isModeling ? <div className="mt-3"><AmazonModelInspector explanation={modelExplanation} testId="amazon-model-inspector"/></div> : null}
            <div className="mt-6 overflow-hidden rounded-full bg-[#d5d9d9]"><span className="block h-1.5 rounded-full bg-[#ff9900]" style={{ width: `${((activeIndex + 1) / AMAZON_CHAPTERS.length) * 100}%` }} /></div>
            <p className="mt-2 font-mono text-[9px] text-[#515c68]">Chapter {activeIndex + 1} of {AMAZON_CHAPTERS.length}</p>
          </div>
        </aside>

        <div data-de-content className={`min-w-0 pb-24 pt-5 md:pt-7 ${isModeling ? "px-3 sm:px-4 lg:px-5 2xl:px-6" : "px-4 sm:px-6 lg:px-10 xl:px-12"}`}>
          <header data-testid="chapter-page-heading" className="relative overflow-hidden rounded-[26px] border border-[#d8d8d8] bg-white px-5 py-5 shadow-[0_14px_44px_rgba(0,0,0,.06)] sm:px-7 sm:py-6">
            <div className="absolute -right-14 -top-20 h-52 w-52 rounded-full bg-[#ededed] blur-2xl" aria-hidden />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#5f5f5f]">Amazon · Big Data Engineering · {active.eyebrow}</p>
                <h1 className="mt-2 text-3xl font-bold tracking-[-.05em] text-[#111] sm:text-4xl">{active.label}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f5f5f]">{active.description}</p>
              </div>
              <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#111] text-white sm:flex"><Icon name={chapter === "requirements" ? "chart" : chapter === "architecture" || chapter === "batch-lakehouse" ? "lake" : chapter === "data-modeling" ? "box" : chapter === "governance-quality" ? "shield" : chapter === "interview-qa" ? "brain" : chapter === "event-sources" ? "cursor" : "stream"} className="h-7 w-7"/></span>
            </div>
          </header>

          {chapter === "start-here" ? <div className="mt-5 space-y-5">
            <Section id="platform-mission" number="01" eyebrow="Platform mission" title="Move from commerce facts to decisions" subtitle="Hover, focus, or tap any component. The map keeps high-volume behavioral data, strict transactional lifecycles, fast operational signals, and reconciled business truth in one explainable design.">
              <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_28px_minmax(0,1.08fr)_28px_minmax(0,1fr)]">
                <div><p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[.17em] text-[#515c68]">Commerce producers</p><div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1">{SOURCES.map((item, index) => <MapButton key={item.code} item={item} active={selection.lane === "source" && selection.index === index} onSelect={() => setSelection({ lane: "source", index })}/>)}</div></div>
                <div className="hidden items-center text-[#b35d00] xl:flex" aria-hidden><span className="h-px flex-1 bg-[#e6b66e]"/><span className="text-xl">›</span></div>
                <div className="rounded-[20px] border border-[#c6a15b] bg-[#fff8eb] p-3 shadow-[0_14px_34px_rgba(196,123,23,.08)]"><div className="mb-2.5 flex items-center justify-between border-b border-[#ead3ab] pb-2.5"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#7a6545]">Shared backbone</p><h3 className="mt-0.5 text-base font-bold">Two-speed data plane</h3></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#131a22] text-[#ffb84d]"><Icon name="stream" className="h-4 w-4"/></span></div><div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1">{BACKBONE.map((item, index) => <MapButton key={item.code} item={item} active={selection.lane === "backbone" && selection.index === index} onSelect={() => setSelection({ lane: "backbone", index })}/>)}</div></div>
                <div className="hidden items-center text-[#b35d00] xl:flex" aria-hidden><span className="h-px flex-1 bg-[#e6b66e]"/><span className="text-xl">›</span></div>
                <div><p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[.17em] text-[#515c68]">Decision consumers</p><div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1">{CONSUMERS.map((item, index) => <MapButton key={item.code} item={item} active={selection.lane === "consumer" && selection.index === index} onSelect={() => setSelection({ lane: "consumer", index })}/>)}</div></div>
              </div>
              <article className="mt-4 overflow-hidden rounded-[22px] border border-[#bdbdbd] bg-[#f7f7f7]" aria-live="polite" aria-label={`${selectedItem.title} explanation`}>
                <div className="flex items-start gap-4 border-b border-[#d8d8d8] bg-white p-4 sm:p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111] text-white"><Icon name={selectedItem.icon}/></span>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#5f5f5f]">{selectedItem.code} · component explanation</p>
                    <h3 className="mt-1 text-base font-bold text-[#111]">{selectedItem.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-[#5f5f5f]">{selectedItem.detail}</p>
                  </div>
                </div>
                <div className="grid gap-px bg-[#d8d8d8] md:grid-cols-3">
                  <div className="bg-[#f7f7f7] p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#5f5f5f]">Amazon example</p>
                    <p className="mt-2 text-xs leading-6 text-[#444]">{selectedItem.example}</p>
                  </div>
                  <div className="bg-[#f7f7f7] p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#5f5f5f]">Big-data responsibility</p>
                    <p className="mt-2 text-xs leading-6 text-[#444]">{selectedExplanation.flow}</p>
                  </div>
                  <div className="bg-[#ededed] p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#5f5f5f]">Interview point</p>
                    <p className="mt-2 text-xs font-semibold leading-6 text-[#333]">{selectedExplanation.interview}</p>
                  </div>
                </div>
              </article>
            </Section>

            <Section id="system-boundary" number="02" eyebrow="System boundary" title="Keep checkout online. Make analytics replayable." subtitle="Follow a single order through the boundary. The transaction plane fulfills the customer promise; the data plane observes, explains, forecasts, and reconciles it.">
              <div className="grid gap-3 lg:grid-cols-[1fr_42px_1fr_42px_1fr] lg:items-stretch">
                {[
                  { n: "1", icon: "box" as const, owner: "Transaction plane", title: "Place the order", detail: "Checkout validates price, promotion, payment authorization, inventory reservation, and delivery promise against operational services.", output: "Customer outcome · order confirmed" },
                  { n: "2", icon: "stream" as const, owner: "Durable handoff", title: "Publish the facts", detail: "Outbox and CDC prevent dual-write loss. Domain events carry stable IDs, source sequence, event time, money values, and schema version.", output: "Evidence · replayable lifecycle" },
                  { n: "3", icon: "check" as const, owner: "Data plane", title: "Produce two truths", detail: "Streaming serves provisional operations now; the lakehouse rebuilds complete history and publishes certified finance and BI later.", output: "Decisions · live + certified" },
                ].map((step, index) => <div key={step.n} className="contents"><article className="group rounded-2xl border border-[#d5d9d9] bg-[#f7f8f8] p-5 transition hover:-translate-y-1 hover:border-[#c47b17] hover:shadow-[0_14px_30px_rgba(19,26,34,.08)]"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#131a22] text-[#ffb84d]"><Icon name={step.icon}/></span><span className="font-mono text-[10px] font-bold text-[#8a6c40]">STEP {step.n}</span></div><p className="mt-4 text-[9px] font-bold uppercase tracking-[.14em] text-[#b35d00]">{step.owner}</p><h3 className="mt-1 text-base font-bold">{step.title}</h3><p className="mt-3 text-xs leading-6 text-[#5b6673]">{step.detail}</p><p className="mt-4 border-t border-[#d5d9d9] pt-3 text-[10px] font-bold">{step.output}</p></article>{index < 2 ? <div className="hidden items-center justify-center text-2xl text-[#b35d00] lg:flex" aria-hidden>→</div> : null}</div>)}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-[#d8d8d8] bg-[#ededed] p-5 text-[#111]"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#444]">Fast path · seconds to minutes</p><p className="mt-2 text-sm font-bold">Alerts, seller views, personalization, operational decisions</p><p className="mt-2 text-xs leading-5 text-[#444]">Bounded dedupe and watermarks produce useful values quickly. They are explicitly provisional.</p></div><div className="rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7] p-5"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#444]">Truth path · minutes to T+1</p><p className="mt-2 text-sm font-bold">Finance, BI, certified metrics, historical ML</p><p className="mt-2 text-xs leading-5 text-[#444]">Complete Bronze plus CDC, settlement, late data, deterministic replay, and reconciliation publish official results.</p></div></div>
            </Section>

            <Section id="interview-scope" number="03" eyebrow="Interview scope" title="Cover the commerce product, then narrow to the data platform" subtitle="An Amazon-like marketplace is broad. Name the surrounding product domains once, then spend interview time on the data responsibilities that determine the architecture.">
              <div className="grid gap-4 lg:grid-cols-2">
                <article className="overflow-hidden rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7]">
                  <div className="border-b border-[#d8d8d8] bg-[#ededed] px-5 py-4">
                    <p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#5f5f5f]">Product context · acknowledge briefly</p>
                    <p className="mt-1 text-xs leading-5 text-[#444]">Show product awareness by mapping each commerce surface to the data it creates.</p>
                  </div>
                  <div className="grid gap-px bg-[#d8d8d8] sm:grid-cols-2">
                    {[
                      ["Customer + discovery", "identity, sessions, search, clicks, experiments"],
                      ["Catalog + pricing", "products, SKUs, seller offers, price history"],
                      ["Cart + orders", "cart mutations and order-item lifecycles"],
                      ["Payments + refunds", "money movements, fees, settlement, disputes"],
                      ["Inventory + fulfillment", "reservations, movements, shipments, returns"],
                      ["Marketplace + support", "seller performance, service, trust signals"],
                    ].map(([surface, signal], index) => <div key={surface} className="bg-white p-4"><div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#111] font-mono text-[9px] font-bold text-white">{String(index + 1).padStart(2, "0")}</span><div><h3 className="text-xs font-bold text-[#111]">{surface}</h3><p className="mt-1 text-[10px] leading-4 text-[#5f5f5f]">{signal}</p></div></div></div>)}
                  </div>
                  <p className="border-t border-[#d8d8d8] bg-[#f7f7f7] px-5 py-4 text-xs leading-5 text-[#5f5f5f]">Implementing checkout, search ranking, payment authorization, inventory reservation, or warehouse execution is outside this big-data round.</p>
                </article>

                <article className="rounded-2xl border border-[#111] bg-white p-5">
                  <p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#111]">Design deeply · interview focus</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {["event production", "CDC + outbox", "stream ingestion", "real-time processing", "lakehouse", "batch + backfill", "data modeling", "quality + contracts", "financial reconciliation", "privacy + access", "multi-region recovery", "serving + ML"].map((item, index) => <div key={item} className="flex min-h-10 items-center gap-2 rounded-xl bg-[#ededed] px-3 text-[11px] font-semibold"><span className="font-mono text-[9px] text-[#5f5f5f]">{String(index + 1).padStart(2, "0")}</span>{item}</div>)}
                  </div>
                  <div className="mt-4 border-t border-[#d8d8d8] pt-4">
                    <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#5f5f5f]">Interview boundary</p>
                    <p className="mt-2 text-xs leading-6 text-[#444]">Design how commerce facts become timely, replayable, reconciled, governed data products. Keep transactional decisions in the services that own them.</p>
                  </div>
                </article>
              </div>
            </Section>

            <Section id="data-products" number="04" eyebrow="Data products" title="Give every product a fast path and a truth path" subtitle="Select a product to inspect its lifecycle, exact grain, serving contract, consumers, and the mistake an interviewer expects you to avoid.">
              <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{PRODUCTS.map((item, index) => <button key={item.name} type="button" aria-pressed={productIndex === index} onMouseEnter={() => setProductIndex(index)} onFocus={() => setProductIndex(index)} onClick={() => setProductIndex(index)} className={`flex min-h-[66px] items-center gap-3 rounded-2xl border p-3 text-left transition ${productIndex === index ? "border-[#111] bg-[#ededed]" : "border-[#d8d8d8] bg-white hover:border-[#777]"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${productIndex === index ? "bg-[#111] text-white" : "bg-[#ededed] text-[#111]"}`}><Icon name={item.icon}/></span><span><span className="block text-[9px] font-bold uppercase tracking-[.12em] text-[#777]">Primary source · {item.event}</span><span className="mt-1 block text-xs font-bold text-[#111]">{item.name}</span></span></button>)}</div>
                <article className="overflow-hidden rounded-[22px] border border-[#bdbdbd] bg-[#f7f7f7]" aria-live="polite">
                  <div className="flex items-start gap-4 border-b border-[#d8d8d8] bg-white p-5"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#111] text-white"><Icon name={product.icon}/></span><div><p className="font-mono text-[10px] font-bold text-[#5f5f5f]">SOURCE LIFECYCLE</p><h3 className="mt-1 text-xl font-bold tracking-[-.03em]">{product.name}</h3><p className="mt-2 font-mono text-[10px] leading-5 text-[#333]">{product.source}</p></div></div>
                  <div className="grid gap-px bg-[#d8d8d8] sm:grid-cols-2">
                    {[
                      ["Product grain", product.grain],
                      ["Source events", product.sources],
                      ["Big-data build", product.build],
                      ["Serving path", product.serving],
                      ["Amazon example", product.example],
                    ].map(([label, value], index) => <div key={label} className={`bg-[#f7f7f7] p-4 ${index === 4 ? "sm:col-span-2" : ""}`}><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">{label}</p><p className="mt-2 text-xs leading-6 text-[#444]">{value}</p></div>)}
                  </div>
                  <div className="flex gap-3 border-t border-[#d8d8d8] bg-[#ededed] p-4"><Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0"/><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">Correctness rule</p><p className="mt-1 text-xs leading-5 text-[#333]">{product.caution}</p></div></div>
                </article>
              </div>
            </Section>

            <Section id="interview-handoff" number="05" eyebrow="Say this" title="Open with the correctness boundary, then follow one order">
              <div className="rounded-[22px] border border-[#e2bd7c] border-l-4 border-l-[#ff9900] bg-[#fff8eb] p-5 sm:p-7"><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#b35d00]">60-second answer</p><p className="mt-4 text-base font-medium leading-8 sm:text-lg">“I separate the transaction plane that owns checkout, payments, inventory reservations, and fulfillment from a replayable data plane. Domain events, outbox records, CDC, clickstream, and partner feeds enter Kafka through versioned contracts. Flink creates low-latency operational views and online features, while immutable Bronze evidence lands in S3. Spark and Iceberg build deduplicated Silver entities and reconciled Gold products for finance, BI, sellers, and ML. The fast path is provisional; the truth path includes late data, settlements, refunds, deterministic replay, quality gates, and atomic publication. I design every product around an explicit grain, owner, freshness and completeness SLO, privacy class, and recovery plan.”</p></div>
              <div className="mt-4 flex flex-wrap gap-2">{["Start with boundaries", "Define grains", "Separate live vs certified", "Explain late data", "Show reconciliation", "End with recovery"].map((item, index) => <span key={item} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#d5d9d9] bg-white px-3 text-[10px] font-bold text-[#3f4b59]"><span className="font-mono text-[#b35d00]">{index + 1}</span>{item}</span>)}</div>
            </Section>
          </div> : chapter === "architecture" ? <AmazonArchitecture /> : chapter === "event-sources" ? <AmazonEventSources /> : chapter === "ingestion-kafka" ? <AmazonIngestionKafka /> : chapter === "batch-lakehouse" ? <AmazonBatchLakehouse /> : chapter === "data-modeling" ? <AmazonDataModeling onExplain={setModelExplanation} /> : chapter === "governance-quality" ? <AmazonGovernanceQuality /> : chapter === "interview-qa" ? <AmazonInterviewQA /> : <AmazonRequirements />}

          <nav aria-label="Adjacent chapters" className="mt-6 grid gap-3 border-t border-[#d5d9d9] pt-6 sm:grid-cols-2">
            {previous ? <Link href={`/data-engineering/amazon/${previous.id}`} className="rounded-2xl border border-[#d8d8d8] bg-white p-4 transition hover:border-[#777]"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#5f5f5f]">← Previous</p><p className="mt-2 text-sm font-bold text-[#111]">{previous.label}</p></Link> : <Link href="/" className="rounded-2xl border border-[#d8d8d8] bg-white p-4 transition hover:border-[#777]"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#5f5f5f]">Library</p><p className="mt-2 text-sm font-bold text-[#111]">← All designs</p></Link>}
            {next ? <Link href={`/data-engineering/amazon/${next.id}`} className="rounded-2xl border border-[#111] bg-[#111] p-4 text-white transition hover:bg-[#2a2a2a]"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#d2d2d2]">Next →</p><p className="mt-2 text-sm font-bold">{next.label}</p></Link> : <Link href="/" className="rounded-2xl border border-[#111] bg-[#111] p-4 text-white transition hover:bg-[#2a2a2a]"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#d2d2d2]">Chapter {activeIndex + 1} complete</p><p className="mt-2 text-sm font-bold">Back to the library →</p></Link>}
          </nav>
        </div>
      </div>
    </div>
  );
}
