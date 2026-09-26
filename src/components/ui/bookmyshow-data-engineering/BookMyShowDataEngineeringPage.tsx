"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CompanyChapterRail from "../data-design/CompanyChapterRail";
import MobileSectionNav from "../data-design/MobileSectionNav";
import {
  BOOKMYSHOW_CHAPTERS,
  BOOKMYSHOW_SECTIONS,
  type BookMyShowChapter,
} from "./data";

const ink = "#111111";
const slate = "#5f6368";
const line = "#d8d8d8";

const PRODUCERS = [
  { code: "SEAT", title: "Inventory", note: "The commercial state of every show seat.", events: ["seat_held", "hold_expired", "booking_confirmed"] },
  { code: "PAY", title: "Payments", note: "Gateway attempts, captures, refunds, and disputes.", events: ["payment_authorized", "payment_failed", "refund_succeeded"] },
  { code: "FIND", title: "Discovery", note: "The intent before a customer starts checkout.", events: ["search_submitted", "result_impressed", "seat_map_opened"] },
  { code: "APP", title: "Telemetry", note: "High-volume product and reliability signals.", events: ["session_started", "screen_viewed", "client_error"] },
  { code: "CAT", title: "Catalog CDC", note: "Shows, venues, price bands, and contracts.", events: ["show_changed", "venue_changed", "promotion_changed"] },
  { code: "RISK", title: "Trust + entry", note: "Bot controls, device risk, and venue scans.", events: ["risk_signal", "ticket_scanned", "entry_denied"] },
] as const;

const START_CONSUMERS = [
  { code: "MAP", title: "Seat availability", note: "Refresh the customer seat map after holds, releases, and confirmed bookings; recheck the DB before a hold.", target: "< 1 second" },
  { code: "RISK", title: "Hot-sale protection", note: "Detect bot velocity, repeated hold failures, and abusive device behavior during a popular on-sale.", target: "< 15 seconds" },
  { code: "OPS", title: "On-sale control room", note: "Track booking rate, hold expiry, remaining inventory, and payment failures for each show.", target: "< 2 minutes" },
  { code: "DEMAND", title: "Show demand", note: "Measure search-to-seat-map-to-booking conversion by city, event, venue, and price band.", target: "hourly" },
  { code: "PAY", title: "Partner settlement", note: "Match confirmed bookings with gateway captures, refunds, commission, and the venue or organiser payout.", target: "T+1" },
] as const;

const START_REQUIREMENTS = [
  { code: "01", title: "Hold the whole basket", note: "All requested seats or none.", detail: "For one BookMyShow booking attempt, claim every requested seat in one bounded transaction. If A7 succeeds but A8 conflicts, roll back both." },
  { code: "02", title: "Resolve payment races", note: "Money never implies seat ownership.", detail: "Deduplicate gateway callbacks and confirm only if the unexpired hold still owns every seat. A late success without seats enters refund and exception handling." },
  { code: "03", title: "Publish committed facts", note: "State and event share one commit.", detail: "Write seat or booking state and its outbox row in the same database transaction, so Kafka never announces a booking the database did not commit." },
  { code: "04", title: "Serve each clock", note: "Seconds for ops; T+1 for money.", detail: "Use streaming for hot-sale risk and control-room signals, hourly data for product analysis, and reconciled T+1 tables for settlement." },
  { code: "05", title: "Keep replayable history", note: "Raw evidence stays reconstructible.", detail: "Archive exact events, schema IDs, and Kafka offsets so BookMyShow datasets can be replayed after a bad job, late event, or metric correction." },
  { code: "06", title: "Correct without erasing", note: "Version every restatement.", detail: "Rebuild affected partitions in staging, compare booking and money totals, approve the change, then publish a traceable correction instead of overwriting evidence." },
] as const;

const START_SCOPE = [
  { code: "SEAT", title: "Seat-state boundary", note: "AVAILABLE → HELD → SOLD", detail: "Define the authoritative seat states, hold expiry rules, conditional transitions, and the uniqueness rule that prevents a double sale." },
  { code: "OUT", title: "Outbox + CDC", note: "Commit before publish", detail: "Capture each committed booking-domain fact from a transactional outbox and carry its stable event ID into Kafka." },
  { code: "EVT", title: "Event contracts", note: "Keys, time, and versions", detail: "Specify the event envelope, show or booking partition key, schema compatibility, semantic fixtures, and retention policy." },
  { code: "RT", title: "Streaming signals", note: "Risk + live operations", detail: "Build event-time jobs for hot-sale abuse, booking velocity, occupancy, and payment-failure signals with explicit lateness rules." },
  { code: "LAKE", title: "Lakehouse", note: "Bronze → Silver → Gold", detail: "Retain raw evidence, deduplicate trusted entities, and publish owned products for funnels, settlement, analytics, and training." },
  { code: "MONEY", title: "Finance model", note: "Booking, gateway, partner", detail: "Model immutable payment movements and reconcile internal bookings with gateway statements and partner payout obligations." },
  { code: "GOV", title: "Quality + privacy", note: "Owned and observable", detail: "Assign owners, validate every layer, tokenize identity, control access, and measure freshness from source commit to consumer." },
  { code: "FIX", title: "Replay + recovery", note: "Repair, compare, publish", detail: "Replay Kafka or raw files into staging, reapply idempotent sinks, compare against authoritative booking state, and publish corrections." },
] as const;

const START_PLATFORM_STEPS = [
  { code: "IN", title: "Ingest", note: "validate", detail: "Accept authenticated telemetry and database-sourced facts, attach ingestion time, validate the contract, and quarantine malformed records.", examples: "Client devices can report interactions, but they can never declare booking_confirmed." },
  { code: "TX", title: "Coordinate", note: "atomic state", detail: "The inventory service changes authoritative seat state atomically; the payment service deduplicates callbacks and records final outcomes.", examples: "DB/server time—not Redis TTL—decides whether a hold is still valid." },
  { code: "LOG", title: "Distribute", note: "outbox + Kafka", detail: "CDC reads committed outbox rows and Kafka decouples producers from every downstream consumer.", examples: "Delivery may repeat, so event_id and idempotent consumers remain mandatory." },
  { code: "RT", title: "Stream", note: "fast signals", detail: "Flink computes risk and operational signals using event time, bounded lateness, keyed state, and checkpoints.", examples: "Fraud, booking velocity, occupancy, and payment-failure trends." },
  { code: "HIST", title: "Store", note: "replayable history", detail: "Immutable raw history feeds deduplicated Silver tables and owned Gold products with explicit grains.", examples: "Object storage + Iceberg support analytics, finance, training, and replay." },
  { code: "FIX", title: "Serve + recover", note: "correct + reconcile", detail: "Serve projections at their promised freshness, then rebuild them from Kafka or raw files when they drift.", examples: "Reapply idempotent sinks, compare with the source of truth, and publish corrections." },
] as const;

const START_FRESHNESS = [
  { label: "Seat-map display", value: "p95 < 1s", width: "16%" },
  { label: "Fraud signal", value: "p95 < 15s", width: "30%" },
  { label: "Pricing feature", value: "p95 < 60s", width: "46%" },
  { label: "Live operations", value: "p95 < 2m", width: "62%" },
  { label: "Finance + settlement", value: "T+1", width: "100%" },
] as const;

const INTERVIEW_QA = [
  {
    category: "Requirements + sizing",
    question: "Which BookMyShow requirements need synchronous correctness, and which can tolerate delay?",
    position: "Seat ownership, hold expiry, booking confirmation, and payment state transitions require synchronous authority. Risk signals, operations, product analytics, and settlement use explicit second, minute, hourly, or T+1 freshness.",
    tradeoff: "Making every consumer synchronous would couple booking availability to the whole data platform; allowing every path to lag would make seat and money decisions unsafe.",
    proof: "Map every consumer to its source of truth, freshness SLO, stale fallback, and failure behavior before choosing tools.",
  },
  {
    category: "Requirements + sizing",
    question: "How is the 652 GB/day logical event estimate derived?",
    position: "8M DAU × 2 sessions × 40 app events = 640M events. Add 2M bookings × 6 critical events = 12M events. At an illustrative 1 KB each, 652M events become 652 GB/day.",
    tradeoff: "One average payload keeps interview arithmetic transparent, but production sizing must use topic-specific payload distributions and protocol overhead.",
    proof: "Sample serialized events by family and compare observed p50/p95 sizes with the 1 KB planning assumption.",
  },
  {
    category: "Requirements + sizing",
    question: "Why do we multiply 2M bookings by six critical events?",
    position: "Six is an adjustable planning average representing a possible lifecycle mix such as seat held, payment authorized, payment captured, booking confirmed, inventory sold, and one financial movement.",
    tradeoff: "It is not a fixed protocol. Cancellations, retries, partial refunds, or multi-seat detail can produce more events; simpler outcomes produce fewer.",
    proof: "Count lifecycle events per completed booking from a representative trace set and size from the measured distribution.",
  },
  {
    category: "Requirements + sizing",
    question: "Why must BookMyShow be sized for a hot on-sale instead of the daily average?",
    position: "A popular event concentrates users, seat conflicts, and payment attempts into one short window and often one show_id. Daily averages hide the authority-key contention that determines booking success.",
    tradeoff: "Provisioning every subsystem for unconstrained visitor traffic is wasteful, so a waiting room converts visitor demand into bounded admitted work.",
    proof: "Replay a hot-show distribution, not uniform traffic, and measure hold p99, conflicts, expiry backlog, and sold-seat uniqueness.",
  },
  {
    category: "Requirements + sizing",
    question: "How do the default assumptions produce about 3,472 hold attempts per second?",
    position: "500K accepted bookings ÷ 7,200 seconds = 69.4/s; ×10 busiest-minute burst = 694/s; ×5 attempted baskets per accepted booking = about 3,472 requested hold attempts/s.",
    tradeoff: "This is pre-admission demand, not a safe database target. The waiting room must cap what reaches the Inventory DB.",
    proof: "Vary duration, burst, and retry assumptions, then set admitted QPS from a database benchmark with p99 headroom.",
  },

  {
    category: "Seat + payment",
    question: "Where is the no-double-booking guarantee enforced?",
    position: "The Inventory DB performs an atomic conditional state transition and enforces one active owner for each show-seat. Redis and Kafka never grant ownership.",
    tradeoff: "Serializing conflicting writes limits one hot authority key, but it makes the customer promise provable.",
    proof: "Run concurrent attempts for the same seats and show exactly one committed owner and one booking outcome.",
  },
  {
    category: "Seat + payment",
    question: "How do you hold a multi-seat basket without partially succeeding?",
    position: "Lock or conditionally update every requested show-seat inside one bounded transaction; if any seat is unavailable, roll back the entire basket.",
    tradeoff: "Larger baskets hold more locks and increase conflict probability, so transaction scope and seat ordering must stay deterministic and short.",
    proof: "Race two overlapping baskets such as A7/A8 and A8/A9; no result may leave a partial active hold.",
  },
  {
    category: "Seat + payment",
    question: "Which clock decides whether a BookMyShow hold has expired?",
    position: "Authoritative database/server time and persisted expires_at decide validity. A Redis TTL can accelerate display or cleanup but cannot extend ownership.",
    tradeoff: "Database time adds an authority read at confirmation, while trusting cache time risks selling after the true hold expired.",
    proof: "Skew application and cache clocks, delay expiry workers, and verify confirmation still follows the persisted deadline.",
  },
  {
    category: "Seat + payment",
    question: "What happens when the gateway succeeds after the seat hold expires?",
    position: "Do not mint a ticket or force the seat to SOLD. Record the provider outcome, open an exception, initiate the linked refund, and notify the customer.",
    tradeoff: "Compensation costs money and support effort, but taking a seat from its current owner is unacceptable.",
    proof: "Simulate late success after resale; verify no valid ticket, one refund movement, and a closed source-linked exception.",
  },
  {
    category: "Seat + payment",
    question: "How are duplicate payment callbacks handled?",
    position: "Persist the provider event ID and use an idempotent state transition so retries produce one payment movement and one booking effect.",
    tradeoff: "Dedupe storage and status-version checks add complexity, but provider delivery is inherently retryable.",
    proof: "Replay the same success and refund callbacks repeatedly and show one ledger effect per provider_event_id.",
  },

  {
    category: "Architecture + contracts",
    question: "Why use a transactional outbox with CDC?",
    position: "Business state and its domain event commit in one database transaction; CDC publishes the durable outbox record after commit.",
    tradeoff: "The outbox adds connector and WAL operations, but removes the unsafe database-to-Kafka dual-write gap.",
    proof: "Kill the publisher immediately after commit and show that CDC emits the event after restart without inventing an uncommitted booking.",
  },
  {
    category: "Architecture + contracts",
    question: "Is booking_confirmed exactly once?",
    position: "The business transition is idempotent, but transport is at-least-once. Consumers deduplicate the stable event_id and make sinks idempotent.",
    tradeoff: "End-to-end exactly-once claims are brittle across databases, Kafka, files, and external systems; explicit dedupe is easier to verify.",
    proof: "Replay one event through every consumer and show one Silver entity, one Gold contribution, and one money effect.",
  },
  {
    category: "Architecture + contracts",
    question: "What must the common event envelope contain?",
    position: "At minimum: event_id, event_type, schema_version, occurred_at, emitted_at, producer, partition key, trace/correlation IDs, and privacy or consent context where relevant.",
    tradeoff: "A richer envelope adds bytes to every record, but makes ordering, replay, audit, schema interpretation, and lineage independent of service logs.",
    proof: "Reconstruct one archived booking event using only its envelope, schema ID, payload, and Kafka coordinates.",
  },
  {
    category: "Architecture + contracts",
    question: "How do you choose partition keys for BookMyShow topics?",
    position: "Choose the smallest key that preserves required order: show_id for ordered inventory streams, booking_id for booking/payment lifecycle, and distributed keys for high-volume telemetry.",
    tradeoff: "Stronger ordering concentrates load; wider distribution improves throughput but cannot preserve one global sequence.",
    proof: "Measure partition skew during a blockbuster and verify all events requiring local order remain on one partition.",
  },
  {
    category: "Architecture + contracts",
    question: "Who is allowed to publish booking_confirmed?",
    position: "Only the booking-domain service after the Inventory DB transaction has durably confirmed all seats and the accepted quote. Clients and analytics jobs may report intent but never declare ownership.",
    tradeoff: "Central authority adds a controlled serialization point, but prevents conflicting producers from inventing commercial truth.",
    proof: "Contract tests reject client-originated confirmation and compare every event with the committed booking version and seat rows.",
  },

  {
    category: "Kafka + streaming",
    question: "What should happen if Kafka is unavailable?",
    position: "Bookings may continue only while the transactional outbox and WAL have safe headroom. Downstream products show stale age and use conservative risk or pricing fallbacks.",
    tradeoff: "Continuing protects sales for a bounded time; continuing without a headroom limit can threaten the booking database itself.",
    proof: "Stop Kafka, observe outbox/WAL growth, pause at the threshold, recover from the committed source position, and verify no gaps.",
  },
  {
    category: "Kafka + streaming",
    question: "How is the illustrative Kafka partition count calculated?",
    position: "For 300K events/s, a tested 5K events/s per partition, and 70% target utilization: ceil(300,000 ÷ (5,000 × 0.70)) = 86; start a benchmark at 96.",
    tradeoff: "More partitions provide concurrency but increase metadata, open files, rebalance cost, and do not solve a single hot key.",
    proof: "Benchmark payloads, compression, acknowledgements, replication, broker loss, skew, and backlog catch-up at the proposed count.",
  },
  {
    category: "Kafka + streaming",
    question: "Can a hot show_id defeat horizontal Kafka scaling?",
    position: "Yes. If all seat events for one show require order, that show_id maps to one partition and one sequential processing lane.",
    tradeoff: "Splitting the key increases throughput only if the business can relax ordering or isolate independent sub-boundaries safely.",
    proof: "Drive most traffic to one show and compare its partition lag with uniformly distributed traffic.",
  },
  {
    category: "Kafka + streaming",
    question: "Why does Flink use event time and watermarks for live BookMyShow signals?",
    position: "Mobile and payment events arrive late or out of order. Event time groups them by when the action happened, while watermarks define how long a window waits before producing a stable result.",
    tradeoff: "More allowed lateness improves completeness but delays risk and operations signals and increases state.",
    proof: "Inject controlled late events and verify on-time, updated, and too-late behavior against the declared policy.",
  },
  {
    category: "Kafka + streaming",
    question: "How does a Flink restart avoid double-counting bookings?",
    position: "Restore a compatible checkpoint, replay from recorded Kafka offsets, and write through idempotent or transactional sinks keyed by the result identity.",
    tradeoff: "Frequent checkpoints reduce replay but consume network, storage, and processing capacity.",
    proof: "Kill the job during a checkpoint, restart it, and compare the recovered show window with trusted Silver events.",
  },

  {
    category: "Lakehouse + modeling",
    question: "What are Bronze, Silver, and Gold responsible for in BookMyShow?",
    position: "Bronze preserves lossless replay evidence; Silver validates, types, tokenizes, orders, and deduplicates entities; Gold publishes owned booking, occupancy, funnel, and finance products at explicit grains.",
    tradeoff: "More layers add latency and storage, but separate immutable evidence from correctable interpretation and consumer contracts.",
    proof: "Trace one booking from Kafka coordinates through a Bronze file, Silver entity, Iceberg snapshot, and Gold metric.",
  },
  {
    category: "Lakehouse + modeling",
    question: "Why use Iceberg for the BookMyShow lakehouse?",
    position: "Iceberg provides atomic snapshots, schema and partition evolution, time travel, and safe replacement of corrected partitions over object storage.",
    tradeoff: "Table maintenance, catalog operations, compaction, and snapshot expiry add operational work.",
    proof: "Publish a staged correction, atomically switch snapshots, read the previous version, and expire it under policy.",
  },
  {
    category: "Lakehouse + modeling",
    question: "How do you perform a safe backfill or correction?",
    position: "Bound the affected source range, pin exact Bronze inputs and code version, rebuild into staging, run booking and money comparisons, approve, then atomically publish a new version.",
    tradeoff: "Staging and comparison are slower than overwriting Gold, but preserve auditability and rollback.",
    proof: "Record input offsets/files, job version, old/new snapshot IDs, invariant results, approver, and served version.",
  },
  {
    category: "Lakehouse + modeling",
    question: "What does grain mean for BookMyShow fact tables?",
    position: "Grain states exactly what one row represents: one booking, booking-seat, hold attempt, payment movement, price quote, scan, or show-time occupancy snapshot.",
    tradeoff: "A single wide fact looks convenient but mixes cardinalities and causes double counting across seats, payments, and snapshots.",
    proof: "State the primary key and additive measures for every fact, then demonstrate joins that preserve row counts.",
  },
  {
    category: "Lakehouse + modeling",
    question: "Why are cancellations, refunds, and partner contract changes modeled as history?",
    position: "Cancellation and refund create linked immutable movements; SCD Type 2 keeps the partner rate, promotion, or contract effective when the sale occurred.",
    tradeoff: "Historical rows and as-of joins cost more than overwriting current state, but finance cannot allow later edits to rewrite prior obligations.",
    proof: "Change a partner contract after a booking and show that the original settlement basis remains unchanged.",
  },

  {
    category: "Governance + privacy",
    question: "Who owns a critical BookMyShow data product?",
    position: "It has a producer owner, data steward, operational on-call, schema subject, known consumers, quality gates, retention class, and lineage to the serving output.",
    tradeoff: "Ownership metadata requires upkeep, but a catalog entry without accountable people cannot restore freshness or correctness.",
    proof: "Start from a stale settlement metric and identify the producer, offsets, job, snapshot, product version, dashboard, and on-call.",
  },
  {
    category: "Governance + privacy",
    question: "Which quality checks belong at each data layer?",
    position: "DB checks state and atomic outbox; Kafka checks continuity and lag; Bronze checks ranges and checksums; Silver checks keys, order, dedupe, and PII; Gold checks business invariants; serving checks freshness and drift.",
    tradeoff: "Repeated gates add compute and may block publication, but late discovery makes booking and finance repair more expensive.",
    proof: "Inject one defect at each layer and verify reject, quarantine, block, provisional, or fallback behavior.",
  },
  {
    category: "Governance + privacy",
    question: "How should BookMyShow distribute customer and device identity?",
    position: "Keep direct PII in a restricted identity boundary and distribute pseudonymous customer_sk or rotating device tokens with purpose, consent, and sampling context.",
    tradeoff: "Tokenization reduces analyst convenience and some linkage accuracy, but prevents shared topics and tables from becoming identity databases.",
    proof: "Inspect Kafka, Silver, Gold, and analyst views for direct identifiers and test that token reversal requires a separately approved workflow.",
  },
  {
    category: "Governance + privacy",
    question: "What must a BookMyShow deletion request cover?",
    position: "Eligible raw copies, old snapshots, features, caches, exports, and processors must be deleted or irreversibly anonymized; documented legal exceptions remain restricted.",
    tradeoff: "Immutable analytics and finance retention complicate deletion, so policy must distinguish erasable behavior from legally retained transactions.",
    proof: "Produce a completion manifest listing partitions, snapshots, keys, exports, processors, and exception owners.",
  },
  {
    category: "Governance + privacy",
    question: "How is T+1 finance reconciliation performed?",
    position: "Match internal booking and signed movements with gateway captures/refunds/disputes and partner obligations using source IDs. Every item ends matched or as an explicit aged exception.",
    tradeoff: "Item-level matching is more work than comparing daily totals, but equal totals can hide unrelated missing and duplicate movements.",
    proof: "Trace timing differences, partial refunds, chargebacks, duplicate provider events, failed payouts, and rounding to owned closure evidence.",
  },

  {
    category: "Recovery + observability",
    question: "How do you measure end-to-end data freshness?",
    position: "Record timestamps at source commit, Kafka, raw landing, Silver processing, Gold publication, and serving; report p50/p95/p99 total age and stage delay per product.",
    tradeoff: "Instrumentation adds metadata and monitoring cost, but component uptime alone cannot prove a current dashboard.",
    proof: "Delay one stage and show that the first timestamp jump identifies it while consumers see last_updated_at.",
  },
  {
    category: "Recovery + observability",
    question: "What do you do when CDC is stuck and WAL is near its limit?",
    position: "Page immediately, protect database write availability, preserve the exact source position, and use a tested durable-export contingency before headroom is exhausted.",
    tradeoff: "Pausing low-priority work or publication hurts freshness, but silently deleting unarchived booking changes destroys recoverability.",
    proof: "Recover from the known position or bounded re-snapshot and verify boundary transactions, IDs, counts, and offset continuity.",
  },
  {
    category: "Recovery + observability",
    question: "How does BookMyShow operate when Redis is unavailable?",
    position: "The Inventory DB remains authoritative. Admit a bounded number of reads to it, reject excess traffic, and never use cache TTL as seat ownership.",
    tradeoff: "Degraded mode reduces seat-map availability to protect the database and correctness path.",
    proof: "Rebuild cache from DB state and compare AVAILABLE/HELD/SOLD counts without resurrecting expired holds.",
  },
  {
    category: "Recovery + observability",
    question: "How do you recover from a bad Iceberg transformation?",
    position: "Stop Gold publication, pin the last certified snapshot, rebuild the affected Bronze range in staging, validate invariants, and publish a new snapshot.",
    tradeoff: "Consumers see older labeled data during repair, which is safer than a fast incorrect product.",
    proof: "Retain old/new snapshot IDs, job version, comparison results, approval, and the final served version.",
  },
  {
    category: "Recovery + observability",
    question: "What makes a regional Inventory DB failover safe?",
    position: "Fence the old writer and expiry workers before promoting a verified replica, then replay retained requests by idempotency key.",
    tradeoff: "Bookings may pause because async replication cannot automatically promise zero RPO; safety wins over two active writers.",
    proof: "Run a game day and audit replication position, sold-seat uniqueness, booking versions, and outbox continuity.",
  },

  {
    category: "Scale + trade-offs",
    question: "What is the waiting room protecting?",
    position: "It converts unbounded visitor refreshes into fair, show-aware admitted QPS for the Inventory DB; it does not decide who owns a seat.",
    tradeoff: "Admission lowers immediate conversion for some users, but prevents overload from collapsing the authoritative path for everyone.",
    proof: "Test token fairness, reconnects, refresh storms, queue age, admitted-QPS caps, and recovery after token loss.",
  },
  {
    category: "Scale + trade-offs",
    question: "What is the smallest credible BookMyShow data design?",
    position: "Start with a relational inventory/payment ledger, transactional outbox, immutable raw storage, and scheduled SQL/Spark; add Kafka, Flink, OLAP, or feature stores only when fan-out, freshness, or scale requires them.",
    tradeoff: "Starting small reduces operations, but delayed component adoption must not block durable publication or replay.",
    proof: "Tie every optional component to a measured SLO, consumer count, throughput limit, or recovery requirement.",
  },
  {
    category: "Scale + trade-offs",
    question: "Why might BookMyShow use both Flink and Spark?",
    position: "Flink serves second/minute event-time signals for risk and live operations; Spark or SQL provides economical, correctable historical transforms and backfills.",
    tradeoff: "Two engines increase platform skills and operations, so neither should exist without a workload that earns it.",
    proof: "Compare live Flink outputs with replayed Silver/Gold results after late events and a checkpoint restart.",
  },
  {
    category: "Scale + trade-offs",
    question: "Where should BookMyShow spend capacity first during overload?",
    position: "Protect authoritative seat transitions, outbox/WAL headroom, payment evidence, and reconciliation. Sample behavioral telemetry and slow noncritical analytics before weakening correctness.",
    tradeoff: "Product detail and freshness may degrade, but acknowledged seat and money facts remain complete and recoverable.",
    proof: "Run overload with declared sampling and verify zero sold-seat violation, durable critical events, and visible freshness degradation.",
  },
  {
    category: "Scale + trade-offs",
    question: "What is likely to be the first bottleneck in a blockbuster release, and how would you prove it?",
    position: "The first limit is often show-specific admission or Inventory DB contention, not aggregate Kafka throughput, because one hot show concentrates conditional writes on a small authority boundary.",
    tradeoff: "Adding generic nodes may raise cost without helping the hot key; admission and authority design may matter more.",
    proof: "Load test the real skew, inject cache/Kafka/CDC/DB failures, and measure hold p99, conflicts, WAL headroom, lag, backlog drain, and sold-seat uniqueness.",
  },
] as const;

function Arrow() {
  return <span className="text-lg text-[#8a8a8a]" aria-hidden>→</span>;
}

function MetricStep({ id, label, value, detail }: { id: string; label: string; value: string; detail: string }) {
  return <span tabIndex={0} aria-describedby={`${id}-tip`} className="group relative flex min-w-0 cursor-pointer flex-col justify-between border-y border-[#c9c9c9] bg-[#f5f5f5] px-4 py-4 outline-none transition hover:bg-[#e7e7e7] focus:bg-[#e7e7e7]"><span className="text-xs font-semibold leading-5 text-[#555]">{label}</span><strong className="mt-2 font-mono text-base text-[#111]">{value}</strong><StartHoverExplanation id={`${id}-tip`} eyebrow="Calculation" title={`${label} · ${value}`} detail={detail} placement="bottom" /></span>;
}

function Chip({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 font-mono text-[10px] font-semibold ${dark ? "border-white/25 bg-white/10 text-white" : "border-[#d8d8d8] bg-[#f7f7f7] text-[#484848]"}`}>
      {children}
    </span>
  );
}

function StartSection({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-40 rounded-[24px] border border-[#d8d8d8] bg-white p-5 md:p-6">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[#5f5f5f]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em] text-[#111]">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm leading-6 text-[#626262]">{subtitle}</p> : null}
      {children}
    </section>
  );
}

function MissionArrow() {
  return (
    <div className="flex flex-col items-center justify-center py-1 xl:flex-row" aria-hidden>
      <span className="h-8 w-px bg-[#9a9a9a] xl:h-px xl:w-full" />
      <span className="-mt-1 rotate-90 text-lg text-[#5f5f5f] xl:-ml-1 xl:mt-0 xl:rotate-0">→</span>
    </div>
  );
}

function StartHoverExplanation({
  id,
  eyebrow,
  title,
  detail,
  examples,
  placement,
}: {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  examples?: string;
  placement: "left" | "right" | "top" | "bottom" | "inside-top-right";
}) {
  const position = placement === "right"
    ? "left-[calc(100%+10px)] top-1/2 -translate-y-1/2"
    : placement === "left"
      ? "right-[calc(100%+10px)] top-1/2 -translate-y-1/2"
      : placement === "top"
        ? "bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2"
        : placement === "inside-top-right"
          ? "right-3 top-3 max-w-[calc(100%-24px)]"
        : "left-1/2 top-[calc(100%+8px)] -translate-x-1/2";

  return (
    <span
      id={id}
      role="tooltip"
      className={`pointer-events-none absolute z-40 hidden w-64 rounded-xl border border-[#bdbdbd] bg-white p-4 text-left text-[#111] shadow-[0_16px_40px_rgba(0,0,0,.16)] group-focus-within:block lg:group-hover:block ${position}`}
    >
      <span className="font-mono text-[8px] font-bold uppercase tracking-[.16em] text-[#5f5f5f]">{eyebrow}</span>
      <strong className="mt-1 block text-xs">{title}</strong>
      <span className="mt-2 block text-[11px] leading-5 text-[#4f4f4f]">{detail}</span>
      {examples ? <span className="mt-2 block border-t border-[#e2e2e2] pt-2 text-[9px] leading-4 text-[#5f5f5f]">{examples}</span> : null}
    </span>
  );
}

function StartHere() {
  const [selection, setSelection] = useState<{ side: "producer" | "platform" | "consumer"; index: number }>({ side: "producer", index: 0 });

  return (
    <div className="mt-5 space-y-5">
      <StartSection
        id="platform-mission"
        eyebrow="Start here"
        title="Design the shared ticketing data platform"
        subtitle="Keep the opening crisp: what comes in, what the platform does, and who it serves."
      >
        <div className="mt-5 rounded-[22px] border border-[#d8d8d8] bg-[#fafafa] p-4 md:p-5">
          <div className="grid items-center gap-4 xl:grid-cols-[minmax(0,230px)_44px_minmax(340px,1fr)_44px_minmax(0,230px)]">
            <div>
              <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[.18em] text-[#5f5f5f]">Event producers</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-1">
                {PRODUCERS.slice(0, 5).map((item, index) => {
                  const selected = selection.side === "producer" && selection.index === index;
                  return (
                    <div className="group relative" key={item.code}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-describedby={`bms-producer-${item.code}`}
                        onMouseEnter={() => setSelection({ side: "producer", index })}
                        onFocus={() => setSelection({ side: "producer", index })}
                        onClick={() => setSelection({ side: "producer", index })}
                        className={`min-h-14 w-full rounded-xl border px-3 py-2 text-left transition ${selected ? "border-[#111] bg-white text-[#111] shadow-sm" : "border-[#d8d8d8] bg-[#ededed] text-[#111] hover:border-[#777]"}`}
                      >
                        <span className="font-mono text-[8px] font-bold text-[#5f5f5f]">{item.code}</span>
                        <span className="mt-1 block text-xs font-bold">{item.title}</span>
                      </button>
                      <StartHoverExplanation id={`bms-producer-${item.code}`} eyebrow="Producer" title={item.title} detail={item.note} examples={`Events: ${item.events.join(" · ")}`} placement="right" />
                    </div>
                  );
                })}
              </div>
            </div>

            <MissionArrow />

            <div className="rounded-[22px] border border-[#cfcfcf] bg-[#ededed] p-5 text-center md:p-6">
              <div className="mx-auto grid h-16 w-16 grid-cols-4 gap-1 rounded-2xl border border-[#c9c9c9] bg-white p-3" role="img" aria-label="Seat inventory grid">
                {Array.from({ length: 12 }).map((_, index) => <span key={index} className={`rounded-sm border border-[#777] ${[2, 6, 9].includes(index) ? "bg-[#111]" : "bg-white"}`} />)}
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-[-.035em]">Seat-safe data platform</h3>
              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#5f5f5f]">The inventory DB owns seats. The asynchronous platform distributes committed facts.</p>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {START_PLATFORM_STEPS.map((item, index) => {
                  const selected = selection.side === "platform" && selection.index === index;
                  return <div key={item.code} className="group relative"><button type="button" aria-pressed={selected} aria-describedby={`bms-platform-${item.code}`} onMouseEnter={() => setSelection({ side: "platform", index })} onFocus={() => setSelection({ side: "platform", index })} onClick={() => setSelection({ side: "platform", index })} className={`min-h-[54px] w-full rounded-lg border px-2 py-2.5 text-left transition ${selected ? "border-[#111] bg-white text-[#111] shadow-sm" : "border-[#d0d0d0] bg-white text-[#111] hover:border-[#777]"}`}><span className="text-[11px] font-bold">{item.title}</span><span className="mt-0.5 block text-[9px] text-[#5f5f5f]">{item.note}</span></button><StartHoverExplanation id={`bms-platform-${item.code}`} eyebrow="Platform step" title={item.title} detail={item.detail} examples={item.examples} placement="bottom" /></div>;
                })}
              </div>
            </div>

            <MissionArrow />

            <div>
              <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[.18em] text-[#5f5f5f]">Business outcomes</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-1">
                {START_CONSUMERS.map((item, index) => {
                  const selected = selection.side === "consumer" && selection.index === index;
                  return (
                    <div className="group relative" key={item.code}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-describedby={`bms-consumer-${item.code}`}
                        onMouseEnter={() => setSelection({ side: "consumer", index })}
                        onFocus={() => setSelection({ side: "consumer", index })}
                        onClick={() => setSelection({ side: "consumer", index })}
                        className={`min-h-14 w-full rounded-xl border px-3 py-2 text-left transition ${selected ? "border-[#111] bg-white text-[#111] shadow-sm" : "border-[#d8d8d8] bg-[#ededed] text-[#111] hover:border-[#777]"}`}
                      >
                        <span className="font-mono text-[8px] font-bold text-[#5f5f5f]">{item.code}</span>
                        <span className="mt-1 block text-xs font-bold">{item.title}</span>
                      </button>
                      <StartHoverExplanation id={`bms-consumer-${item.code}`} eyebrow={`Consumer · ${item.target}`} title={item.title} detail={item.note} placement="left" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        <div className="mt-4 rounded-xl border border-[#d0d0d0] bg-[#ededed] px-5 py-4">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[.18em] text-[#5f5f5f]">Opening script</p>
          <p className="mt-2 text-sm font-medium leading-7 text-[#222]">“I would keep seat allocation and payment confirmation inside a strongly consistent transactional boundary. For every committed state change, I would write a transactional outbox event; CDC delivers that event to Kafka. Flink serves time-sensitive fraud and operational signals, while an object-storage lakehouse provides replay, analytics, model training, and finance reconciliation. Each consumer gets its own freshness and correctness target.”</p>
        </div>
      </StartSection>

      <StartSection id="requirements-snapshot" eyebrow="Requirements" title="Keep the requirements interview-ready" subtitle="Six checks are enough before estimating scale or choosing tools.">
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {START_REQUIREMENTS.map((item) => <div key={item.code} className="group relative"><button type="button" aria-describedby={`bms-requirement-${item.code}`} className="flex min-h-[78px] w-full items-center gap-3 rounded-xl border border-[#d8d8d8] bg-[#ededed] px-4 py-3 text-left transition hover:border-[#777]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white font-mono text-[9px] font-bold text-[#5f5f5f]">{item.code}</span><span><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-[11px] leading-5 text-[#5f5f5f]">{item.note}</span></span></button><StartHoverExplanation id={`bms-requirement-${item.code}`} eyebrow="BookMyShow requirement" title={item.title} detail={item.detail} placement="bottom" /></div>)}
        </div>
      </StartSection>

      <StartSection id="scope-boundary" eyebrow="Scope" title="Stay inside the ticketing data platform" subtitle="Hover an in-scope area to see the exact BookMyShow design responsibility.">
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {START_SCOPE.map((item) => <div key={item.code} className="group relative"><button type="button" aria-describedby={`bms-scope-${item.code}`} className="min-h-[92px] w-full rounded-xl border border-[#d8d8d8] bg-[#ededed] p-4 text-left transition hover:border-[#777]"><span className="font-mono text-[8px] font-bold text-[#5f5f5f]">{item.code}</span><span className="mt-2 block text-xs font-bold">{item.title}</span><span className="mt-1 block text-[10px] text-[#5f5f5f]">{item.note}</span></button><StartHoverExplanation id={`bms-scope-${item.code}`} eyebrow="In scope" title={item.title} detail={item.detail} placement="bottom" /></div>)}
        </div>
        <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_24px_1fr_24px_1fr_24px_1fr] lg:items-center">
          {[
            { title: "Client + queue", note: "admit work", detail: "Authentication, rate limits, and a waiting-room token protect the booking service from a hot-show traffic spike." },
            { title: "Inventory DB", note: "source of truth", detail: "It alone can accept or reject a seat transition and enforce one confirmed owner per show and seat." },
            { title: "CDC + Kafka", note: "distribute facts", detail: "The outbox crosses the consistency boundary; CDC and Kafka deliver committed facts to independent consumers." },
            { title: "Flink + lakehouse", note: "serve + recover", detail: "Derived signals and historical products may lag, but they can be replayed and reconciled from durable evidence." },
          ].map((item, index) => <div className="contents" key={item.title}><div className="group relative"><button type="button" aria-describedby={`bms-boundary-${index}`} className="w-full rounded-xl border border-[#d8d8d8] bg-white p-4 text-left transition hover:border-[#777] hover:bg-[#f3f3f3]"><span className="font-mono text-[9px] font-bold text-[#5f5f5f]">0{index + 1}</span><span className="mt-2 block text-xs font-bold">{item.title}</span><span className="mt-1 block text-[10px] text-[#5f5f5f]">{item.note}</span></button><StartHoverExplanation id={`bms-boundary-${index}`} eyebrow={index === 1 ? "Authoritative boundary" : "In-scope flow"} title={item.title} detail={item.detail} placement="bottom" /></div>{index < 3 ? <Arrow /> : null}</div>)}
        </div>
      </StartSection>

      <StartSection id="freshness-map" eyebrow="Freshness" title="Compare the serving clocks" subtitle="Freshness is measured from source commit or event occurrence to a consumer-visible update.">
        <div className="mt-5 rounded-[20px] border border-[#d8d8d8] bg-[#ededed] p-4 md:p-5">
          <div className="mb-3 hidden grid-cols-[180px_1fr_120px] gap-4 font-mono text-[9px] font-bold uppercase tracking-[.14em] text-[#5f5f5f] md:grid"><span>Consumer</span><span>Relative horizon</span><span className="text-right">Target</span></div>
          {START_FRESHNESS.map((item) => <div key={item.label} className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-[#d0d0d0] py-3 first:border-t-0 md:grid-cols-[180px_1fr_120px] md:gap-4"><span className="text-xs font-semibold">{item.label}</span><span className="order-3 col-span-2 h-2.5 overflow-hidden rounded-full bg-[#d4d4d4] md:order-none md:col-span-1"><span className="block h-full min-w-2 rounded-full bg-[#111]" style={{ width: item.width }} /></span><strong className="rounded-lg border border-[#c8c8c8] bg-white px-3 py-2 text-right text-xs">{item.value}</strong></div>)}
        </div>
      </StartSection>

      <StartSection id="handoff" eyebrow="Next" title="Short handoff">
        <div className="mt-5 grid gap-4 rounded-[20px] border border-[#d8d8d8] bg-[#ededed] p-5 lg:grid-cols-[1fr_auto] lg:items-center"><p className="text-sm leading-7 text-[#444]">“We know which facts require synchronous correctness and which consumers accept lag. Next I’ll pin down the functional requirements, definitions, and failure budgets.”</p><Link href="/data-engineering/bookmyshow/requirements" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#111] px-4 text-xs font-bold text-white">Requirements →</Link></div>
      </StartSection>
    </div>
  );
}

function Requirements() {
  const functions = [
    { code: "01", title: "Discover", short: "Search without blocking", detail: "Customers filter by city, date, language, venue, format, and price. Search returns first; impression and click events are sent afterward so telemetry never delays results.", facts: "search_submitted · result_impressed · result_clicked · seat_map_opened", platform: "Search API → client.events → raw / Silver", flow: ["Search", "Results", "Interaction event"] },
    { code: "02", title: "Hold seats", short: "All seats or none", detail: "Claim every requested seat in one show-shard transaction—or claim none. Return the hold ID, expiry, booking attempt, and quote version used for checkout.", facts: "hold_id · booking_attempt_id · seat_ids · expires_at · quote_version", platform: "show_id transaction → outbox → inventory.seat_held", flow: ["Seat request", "Atomic claim", "Hold + expiry"] },
    { code: "03", title: "Checkout", short: "Idempotent state machine", detail: "Deduplicate repeated or reordered gateway callbacks. Keep the booking Pending until its held seats are confirmed, or compensate a late payment with a refund.", facts: "payment_attempt_id · provider_event_id · status_version · booking_id", platform: "Payment state machine → conditional confirm → compensation", flow: ["Payment attempt", "Callback dedupe", "Confirm or compensate"] },
    { code: "04", title: "Publish changes", short: "One durable decision", detail: "Commit the business change and its outbox row together. CDC sends only committed events to Kafka; downstream consumers safely ignore repeats.", facts: "event_id · aggregate_version · committed_at · source_position", platform: "DB transaction → outbox → CDC → Kafka", flow: ["DB transaction", "Outbox", "CDC → Kafka"] },
    { code: "05", title: "Process app activity", short: "Handle late and duplicate events", detail: "Searches, impressions, clicks, and seat-map opens can arrive late or twice. Keep device and receipt time, validate the schema, and quarantine invalid events.", facts: "client_event_id · client_time · receipt_time · schema_version · sampling", platform: "Edge validation → client.events → quarantine / raw", flow: ["App event batch", "Validate + dedupe", "Raw evidence"] },
    { code: "06", title: "Serve fast signals", short: "Outside checkout", detail: "Flink updates fraud, occupancy, queue, and payment-health signals within seconds. These signals guide controls and operations but never confirm a seat.", facts: "risk signal · show/window metric version · last_updated_at", platform: "Kafka → Flink → risk / live serving", flow: ["Kafka", "Flink", "Risk + live ops"] },
    { code: "07", title: "Serve history", short: "Auditable products", detail: "Build funnels, payouts, pricing, promotions, attendance, and training data from immutable events and point-in-time dimensions so past results remain reproducible.", facts: "confirmed booking · seat lines · financial movements · effective-time dimensions", platform: "Raw archive → Silver / Iceberg → Gold", flow: ["Raw archive", "Conformed facts", "Gold products"] },
    { code: "08", title: "Correct errors", short: "Versioned replay", detail: "Recompute only the affected data in staging, compare it with trusted totals, then publish a new version with its reason and approver recorded.", facts: "source range · code version · snapshot_id · reason · approver", platform: "Isolated staging → quality checks → atomic publish", flow: ["Select evidence", "Recompute + compare", "Publish version"] },
  ] as const;
  const [journey, setJourney] = useState(0);
  const [dau, setDau] = useState(8);
  const [sessionsPerUser, setSessionsPerUser] = useState(2);
  const [eventsPerSession, setEventsPerSession] = useState(40);
  const [bookingsPerDay, setBookingsPerDay] = useState(2);
  const [hotSaleBookings, setHotSaleBookings] = useState(500);
  const [telemetryBurst, setTelemetryBurst] = useState(300);
  const [criticalEventsPerBooking, setCriticalEventsPerBooking] = useState(6);
  const [kafkaRetentionDays, setKafkaRetentionDays] = useState(7);
  const [hotSaleHours, setHotSaleHours] = useState(2);
  const [bookingBurstMultiplier, setBookingBurstMultiplier] = useState(10);
  const [holdAttemptsPerBooking, setHoldAttemptsPerBooking] = useState(5);
  const [curatedCompressionRatio, setCuratedCompressionRatio] = useState(4);
  const clientEventsPerDay = dau * 1_000_000 * sessionsPerUser * eventsPerSession;
  const clientGbPerDay = clientEventsPerDay / 1_000_000;
  const criticalEventsPerDay = bookingsPerDay * 1_000_000 * criticalEventsPerBooking;
  const criticalGbPerDay = criticalEventsPerDay / 1_000_000;
  const totalGbPerDay = clientGbPerDay + criticalGbPerDay;
  const averageBookingsPerSecond = bookingsPerDay * 1_000_000 / 86_400;
  const hotMeanBookingsPerSecond = hotSaleBookings * 1_000 / (hotSaleHours * 3_600);
  const burstBookingsPerSecond = hotMeanBookingsPerSecond * bookingBurstMultiplier;
  const holdAttemptsPerSecond = burstBookingsPerSecond * holdAttemptsPerBooking;
  const kafkaPartitions = Math.ceil(telemetryBurst * 1_000 / (5_000 * 0.7));
  const kafkaTestPartitions = Math.ceil(kafkaPartitions / 12) * 12;
  const yearlyLogicalTb = totalGbPerDay * 365 / 1_000;
  const kafkaLogicalRetentionTb = totalGbPerDay * kafkaRetentionDays / 1_000;
  const kafkaReplicatedRetentionTb = kafkaLogicalRetentionTb * 3;
  const curatedYearlyTb = yearlyLogicalTb / curatedCompressionRatio;
  const assumptions = [
    { id: "dau", label: "Daily active users", value: dau, min: 1, max: 20, step: 1, suffix: "M", set: setDau, explanation: "Starting behavior assumption. It drives daily sessions and client-event volume; it does not directly size the booking database." },
    { id: "sessions", label: "Sessions / user / day", value: sessionsPerUser, min: 1, max: 5, step: 1, suffix: "", set: setSessionsPerUser, explanation: `${dau}M DAU × ${sessionsPerUser} sessions = ${(dau * sessionsPerUser).toFixed(0)}M sessions/day.` },
    { id: "events", label: "App events / session", value: eventsPerSession, min: 10, max: 100, step: 5, suffix: "", set: setEventsPerSession, explanation: `${(dau * sessionsPerUser).toFixed(0)}M sessions × ${eventsPerSession} searches, impressions, clicks, or seat-map interactions = ${(clientEventsPerDay / 1_000_000).toFixed(0)}M app events/day.` },
    { id: "bookings", label: "Accepted bookings / day", value: bookingsPerDay, min: 1, max: 10, step: 1, suffix: "M", set: setBookingsPerDay, explanation: `${bookingsPerDay}M ÷ 86,400 seconds = ${averageBookingsPerSecond.toFixed(1)} accepted bookings/second on an average day.` },
    { id: "hot-sale", label: "Hot-sale accepted bookings", value: hotSaleBookings, min: 100, max: 1_000, step: 50, suffix: "K", set: setHotSaleBookings, explanation: `${hotSaleBookings}K accepted bookings ÷ (${hotSaleHours} hours × 3,600 seconds) = ${hotMeanBookingsPerSecond.toFixed(1)} bookings/second before the within-minute burst factor.` },
    { id: "sale-hours", label: "Hot-sale duration", value: hotSaleHours, min: 1, max: 6, step: 1, suffix: "h", set: setHotSaleHours, explanation: `${hotSaleBookings}K accepted bookings spread across ${hotSaleHours} hours gives ${hotMeanBookingsPerSecond.toFixed(1)}/s. A shorter window raises the mean before burst and retry pressure.` },
    { id: "burst-multiplier", label: "Within-minute burst", value: bookingBurstMultiplier, min: 2, max: 20, step: 1, suffix: "×", set: setBookingBurstMultiplier, explanation: `${hotMeanBookingsPerSecond.toFixed(1)} hot-sale bookings/s × ${bookingBurstMultiplier} burst multiplier = ${burstBookingsPerSecond.toFixed(0)} accepted bookings/s during the busiest minute.` },
    { id: "hold-attempts", label: "Hold attempts / booking", value: holdAttemptsPerBooking, min: 1, max: 10, step: 1, suffix: "", set: setHoldAttemptsPerBooking, explanation: `${burstBookingsPerSecond.toFixed(0)} accepted bookings/s × ${holdAttemptsPerBooking} attempted seat baskets per accepted booking = ${holdAttemptsPerSecond.toFixed(0)} hold attempts/s presented to admission control.` },
    { id: "telemetry", label: "App-event burst / second", value: telemetryBurst, min: 50, max: 600, step: 25, suffix: "K", set: setTelemetryBurst, explanation: `During a launch, assume ${telemetryBurst}K searches, impressions, clicks, and seat-map events each second. At 1 KB each, that is ${telemetryBurst} MB/second before Kafka replication.` },
    { id: "critical-events", label: "Critical events / booking", value: criticalEventsPerBooking, min: 3, max: 10, step: 1, suffix: "", set: setCriticalEventsPerBooking, explanation: `Planning average, not a fixed protocol: for example seat_held, payment_authorized, payment_captured, booking_confirmed, inventory sold, and one financial movement. ${bookingsPerDay}M bookings × ${criticalEventsPerBooking} = ${(criticalEventsPerDay / 1_000_000).toFixed(0)}M events/day.` },
    { id: "retention", label: "Kafka retention", value: kafkaRetentionDays, min: 2, max: 14, step: 1, suffix: " days", set: setKafkaRetentionDays, explanation: `${totalGbPerDay.toFixed(0)} GB/day × ${kafkaRetentionDays} days = ${kafkaLogicalRetentionTb.toFixed(2)} TB logical; RF3 makes ${kafkaReplicatedRetentionTb.toFixed(2)} TB before overhead. Size each topic separately in production.` },
    { id: "compression", label: "Curated compression", value: curatedCompressionRatio, min: 2, max: 8, step: 1, suffix: ":1", set: setCuratedCompressionRatio, explanation: `${yearlyLogicalTb.toFixed(1)} TB/year logical ÷ ${curatedCompressionRatio}:1 = ${curatedYearlyTb.toFixed(1)} TB/year for the compressed curated estimate. Raw replay evidence and extra snapshots are sized separately.` },
  ];
  const capacityFormulas = [
    { label: "Peak throughput", formula: "events/sec × average event size", example: `${telemetryBurst}K/s × 1 KB = ${telemetryBurst} MB/s`, detail: `${telemetryBurst}K/s comes from the adjustable app-event burst assumption. 1 KB is the assumed average serialized event size. Multiplying them gives ${telemetryBurst} MB/s before Kafka replication and protocol overhead.` },
    { label: "Kafka partitions", formula: "ceil(peak events/sec ÷ (tested events/sec/partition × target use))", example: `ceil(${telemetryBurst * 1_000} ÷ (5,000 × 0.70)) = ${kafkaPartitions}; test ${kafkaTestPartitions}`, detail: `${telemetryBurst * 1_000}/s is the app-event burst. 5,000/s is a placeholder partition load test and 70% leaves headroom. The formula gives ${kafkaPartitions}; round to ${kafkaTestPartitions} for the first test.` },
    { label: "Storage per day", formula: "daily events × average event size", example: `${(clientEventsPerDay / 1_000_000).toFixed(0)}M × 1 KB + ${(criticalEventsPerDay / 1_000_000).toFixed(0)}M × 1 KB = ${totalGbPerDay.toFixed(0)} GB/day`, detail: `${dau}M users × ${sessionsPerUser} sessions × ${eventsPerSession} app events = ${(clientEventsPerDay / 1_000_000).toFixed(0)}M. ${bookingsPerDay}M bookings × ${criticalEventsPerBooking} lifecycle events = ${(criticalEventsPerDay / 1_000_000).toFixed(0)}M. At 1 KB each, together they produce ${totalGbPerDay.toFixed(0)} GB/day.` },
    { label: "Kafka retention", formula: "storage/day × retention days × replication factor", example: `${totalGbPerDay.toFixed(0)} GB × ${kafkaRetentionDays} days = ${kafkaLogicalRetentionTb.toFixed(2)} TB; × RF3 = ${kafkaReplicatedRetentionTb.toFixed(2)} TB`, detail: `${totalGbPerDay.toFixed(0)} GB/day comes from the storage formula. Keep it for ${kafkaRetentionDays} days to get ${kafkaLogicalRetentionTb.toFixed(2)} TB. RF3 stores three broker copies, producing ${kafkaReplicatedRetentionTb.toFixed(2)} TB before overhead.` },
    { label: "Inventory pressure", formula: "(hot bookings ÷ sale seconds) × minute burst × hold attempts", example: `(${hotSaleBookings}K ÷ (${hotSaleHours} × 3,600)) × ${bookingBurstMultiplier} × ${holdAttemptsPerBooking} = ${holdAttemptsPerSecond.toFixed(0)} hold attempts/s`, detail: `${hotSaleBookings}K accepted bookings over ${hotSaleHours} hours gives ${hotMeanBookingsPerSecond.toFixed(1)}/s. Multiply by the ${bookingBurstMultiplier}× busiest-minute factor and ${holdAttemptsPerBooking} attempted baskets per accepted booking. This is admitted-pressure demand before the waiting room caps database work.` },
    { label: "Curated yearly storage", formula: "one-year logical storage ÷ compression ratio", example: `${yearlyLogicalTb.toFixed(1)} TB ÷ ${curatedCompressionRatio}:1 = ${curatedYearlyTb.toFixed(1)} TB/year`, detail: `This estimates the compressed curated copy only. Bronze replay evidence, Iceberg snapshots, metadata, indexes, and serving copies remain separate capacity lines; compression never reduces the source event count.` },
  ] as const;
  const journeyPositions = [
    "md:col-start-1 md:row-start-1", "md:col-start-2 md:row-start-1", "md:col-start-3 md:row-start-1", "md:col-start-4 md:row-start-1",
    "md:col-start-4 md:row-start-2", "md:col-start-3 md:row-start-2", "md:col-start-2 md:row-start-2", "md:col-start-1 md:row-start-2",
  ];

  return <div className="mt-4 space-y-4">
    <StartSection id="functional-requirements" eyebrow="Requirement journey" title="Trace the booking journey before choosing tools" subtitle="Select one stage to inspect its correctness boundary and recoverable BookMyShow fact.">
      <ol className="mt-6 grid gap-x-10 gap-y-11 md:grid-cols-4" aria-label="BookMyShow requirement journey">{functions.map((item, index) => <li key={item.title} className={`relative ${journeyPositions[index]}`}><button id={`requirement-tab-${index}`} type="button" aria-pressed={journey === index} aria-controls="requirement-detail" onMouseEnter={() => setJourney(index)} onFocus={() => setJourney(index)} onClick={() => setJourney(index)} className={`min-h-[142px] w-full cursor-pointer rounded-2xl border-2 px-4 py-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#777] focus:ring-offset-2 ${journey === index ? "border-[#777] bg-[#e2e2e2] text-[#111] shadow-[inset_4px_0_0_#555,0_6px_0_#c6c6c6]" : "border-[#c7c7c7] bg-white text-[#111] shadow-[0_5px_0_#d5d5d5] hover:bg-[#f2f2f2] hover:shadow-[0_7px_0_#c8c8c8]"}`}><span className="flex items-center justify-between font-mono text-[9px] font-bold text-[#5f5f5f]"><span>STEP {item.code}</span><span aria-hidden>{journey === index ? "●" : "○"}</span></span><strong className="mt-3 block text-sm">{item.title}</strong><span className="mt-1 block text-[10px] leading-4 text-[#5f5f5f]">{item.short}</span><span className={`mt-3 block font-mono text-[9px] font-bold uppercase tracking-[.12em] ${journey === index ? "text-[#222]" : "text-transparent"}`}>{journey === index ? "Selected ↓" : "Selected"}</span></button>{index < functions.length - 1 ? <><span className="flex h-11 items-center justify-center text-xl text-[#666] md:hidden" aria-hidden>↓</span><span className={`absolute z-10 hidden items-center justify-center font-mono text-xl text-[#555] md:flex ${index < 3 ? "-right-8 top-1/2 h-8 w-6 -translate-y-1/2" : index === 3 ? "-bottom-9 left-1/2 h-7 w-8 -translate-x-1/2" : "-left-8 top-1/2 h-8 w-6 -translate-y-1/2"}`} aria-hidden>{index < 3 ? "→" : index === 3 ? "↓" : "←"}</span></> : null}</li>)}</ol>
      <div id="requirement-detail" role="region" aria-labelledby={`requirement-tab-${journey}`} className="relative mt-4 overflow-hidden rounded-xl border-2 border-[#111] bg-white" aria-live="polite"><div className="flex flex-wrap items-center justify-between gap-2 bg-[#111] px-5 py-3 text-white"><p className="font-mono text-[10px] font-bold uppercase tracking-[.16em]">{functions[journey].title}</p><p className="text-[10px] text-[#d8d8d8]">Choose another stage above to replace this detail</p></div><div className="p-5"><div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#666]">{functions[journey].short}</p><h3 className="mt-2 text-2xl font-semibold">{functions[journey].title}</h3><p className="mt-3 text-sm leading-7 text-[#555]">{functions[journey].detail}</p></div><div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#ededed] p-4">{functions[journey].flow.map((step, index) => <div className="contents" key={step}><span className="rounded-full border border-[#bdbdbd] bg-white px-4 py-2 text-xs font-semibold">{step}</span>{index < functions[journey].flow.length - 1 ? <Arrow /> : null}</div>)}</div></div><div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-[#d2d2d2] bg-[#d2d2d2] md:grid-cols-2"><div className="bg-white p-4"><p className="font-mono text-[9px] font-bold uppercase tracking-[.14em] text-[#666]">Facts created by {functions[journey].title}</p><p className="mt-2 text-xs leading-5 text-[#444]">{functions[journey].facts}</p></div><div className="bg-[#ededed] p-4"><p className="font-mono text-[9px] font-bold uppercase tracking-[.14em] text-[#666]">Big-data responsibility</p><p className="mt-2 text-xs font-semibold leading-5 text-[#333]">{functions[journey].platform}</p></div></div></div></div>
    </StartSection>
    <StartSection id="workload-estimation" eyebrow="Assumptions + capacity lab" title="Turn BookMyShow behavior into resource signals" subtitle="One set of controls drives telemetry storage, Kafka retention, hot-sale pressure, and curated capacity without duplicate assumptions.">
      <div className="mt-5 border-l-2 border-[#111] bg-[#ededed] px-5 py-4 text-sm leading-6 text-[#555]"><strong className="text-[#111]">Illustrative inputs—not BookMyShow actuals.</strong> Booking traffic and app interaction events are sized separately; benchmarks validate every throughput constant.</div>
      <div className="mt-7">
        <p className="font-mono text-xs font-bold uppercase tracking-[.15em] text-[#555]">Input assumptions</p>
        <div className="mt-3 grid gap-x-7 border-t border-[#c9c9c9] md:grid-cols-2 xl:grid-cols-4">{assumptions.map((item) => <label key={item.label} className="group relative block border-b border-[#d4d4d4] py-4"><span className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{item.label}</span><strong className="font-mono text-base">{item.value}{item.suffix}</strong></span><input aria-describedby={`assumption-${item.id}-tip`} className="mt-3 h-2 w-full cursor-pointer accent-[#111]" type="range" min={item.min} max={item.max} step={item.step} value={item.value} onChange={(event) => item.set(Number(event.target.value))} /><StartHoverExplanation id={`assumption-${item.id}-tip`} eyebrow="Input assumption" title={`${item.label} · ${item.value}${item.suffix}`} detail={item.explanation} placement="bottom" /></label>)}</div>
      </div>
      <div className="mt-8 space-y-8" aria-live="polite">
        <div><p className="font-mono text-xs font-bold uppercase tracking-[.15em] text-[#555]">Behavior → daily storage</p><div className="mt-3 grid items-stretch gap-2 xl:grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)_20px_minmax(0,1fr)_20px_minmax(0,1fr)_20px_minmax(0,1fr)]"><MetricStep id="metric-dau" label="DAU" value={`${dau}M`} detail={`${dau} million daily active users is the starting behavior assumption.`} /><span className="flex h-6 rotate-90 items-center justify-center text-lg text-[#777] xl:h-auto xl:rotate-0">→</span><MetricStep id="metric-sessions" label="Sessions / day" value={`${(dau * sessionsPerUser).toFixed(0)}M`} detail={`${dau}M DAU × ${sessionsPerUser} sessions/user/day = ${(dau * sessionsPerUser).toFixed(0)}M sessions/day.`} /><span className="flex h-6 rotate-90 items-center justify-center text-lg text-[#777] xl:h-auto xl:rotate-0">→</span><MetricStep id="metric-client-events" label="App interaction events" value={`${(clientEventsPerDay / 1_000_000).toFixed(0)}M`} detail={`${(dau * sessionsPerUser).toFixed(0)}M sessions/day × ${eventsPerSession} searches, impressions, clicks, and seat-map interactions/session = ${(clientEventsPerDay / 1_000_000).toFixed(0)}M app events/day.`} /><span className="flex h-6 items-center justify-center text-lg text-[#777] xl:h-auto">+</span><MetricStep id="metric-critical-events" label="Critical domain events" value={`${(criticalEventsPerDay / 1_000_000).toFixed(0)}M`} detail={`${bookingsPerDay}M bookings × ${criticalEventsPerBooking} assumed lifecycle events = ${(criticalEventsPerDay / 1_000_000).toFixed(0)}M/day. Example mix: seat held, payment authorized, payment captured, booking confirmed, seat sold, and financial movement.`} /><span className="flex h-6 rotate-90 items-center justify-center text-lg text-[#777] xl:h-auto xl:rotate-0">→</span><MetricStep id="metric-ingest" label="Event payload" value={`${totalGbPerDay.toFixed(0)} GB/day`} detail={`(${(clientEventsPerDay / 1_000_000).toFixed(0)}M app interaction + ${(criticalEventsPerDay / 1_000_000).toFixed(0)}M critical events) × 1 KB = ${totalGbPerDay.toFixed(0)} GB/day before compression, replication, indexes, and metadata.`} /></div><p className="mt-3 font-mono text-xs text-[#555]">Hover or focus any block for its formula · 1 KB/event · {criticalEventsPerBooking} critical events/booking is an adjustable planning average</p></div>
        <div><p className="font-mono text-xs font-bold uppercase tracking-[.15em] text-[#555]">Booking demand → inventory pressure</p><div className="mt-3 grid items-stretch gap-2 xl:grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)_20px_minmax(0,1fr)_20px_minmax(0,1fr)]"><MetricStep id="metric-daily-bookings" label="Daily average" value={`${averageBookingsPerSecond.toFixed(1)}/s`} detail={`${bookingsPerDay}M accepted bookings ÷ 86,400 seconds = ${averageBookingsPerSecond.toFixed(1)} bookings/second. This is context, not the peak design rate.`} /><span className="flex h-6 items-center justify-center text-sm font-bold text-[#777] xl:h-auto">vs</span><MetricStep id="metric-hot-mean" label="Hot sale mean" value={`${hotMeanBookingsPerSecond.toFixed(1)}/s`} detail={`${hotSaleBookings}K accepted bookings ÷ (${hotSaleHours} hours × 3,600 seconds) = ${hotMeanBookingsPerSecond.toFixed(1)} bookings/second.`} /><span className="flex h-6 rotate-90 items-center justify-center text-lg text-[#777] xl:h-auto xl:rotate-0">→</span><MetricStep id="metric-minute-burst" label={`${bookingBurstMultiplier}× minute burst`} value={`${burstBookingsPerSecond.toFixed(0)}/s`} detail={`${hotMeanBookingsPerSecond.toFixed(1)} hot-sale bookings/second × ${bookingBurstMultiplier} within-minute burst multiplier = ${burstBookingsPerSecond.toFixed(0)} bookings/second.`} /><span className="flex h-6 rotate-90 items-center justify-center text-lg text-[#777] xl:h-auto xl:rotate-0">→</span><MetricStep id="metric-hold-attempts" label={`${holdAttemptsPerBooking} hold attempts`} value={`${holdAttemptsPerSecond.toFixed(0)}/s`} detail={`${burstBookingsPerSecond.toFixed(0)} bookings/second × ${holdAttemptsPerBooking} hold attempts per accepted booking = ${holdAttemptsPerSecond.toFixed(0)} hold attempts/second.`} /></div><p className="mt-3 font-mono text-xs text-[#555]">Hot sale = {hotSaleBookings}K accepted bookings / {hotSaleHours}h · waiting room limits admitted database work</p></div>
      </div>
      <div className="mt-8 border-t border-[#d2d2d2] pt-7">
        <div><p className="font-mono text-xs font-bold uppercase tracking-[.15em] text-[#555]">Daily storage weight</p><h3 className="mt-2 text-xl font-semibold">Translate BookMyShow events into bytes</h3><p className="mt-1 text-sm text-[#666]">The calculation uses serialized payload size before compression, replication, indexes, metadata, or copies.</p></div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
          <div tabIndex={0} aria-describedby="daily-storage-app-tip" className="group group/storage-app relative z-0 cursor-pointer rounded-2xl border border-[#bbb] bg-[#ededed] p-5 outline-none transition hover:z-50 hover:border-[#777] focus:z-50 focus:ring-2 focus:ring-[#888] focus:ring-offset-2">
            <div className="max-w-full transition-[max-width] duration-200 lg:group-hover/storage-app:max-w-[calc(100%-17rem)] lg:group-focus-within/storage-app:max-w-[calc(100%-17rem)]">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#555]">App interaction events</p>
              <p className="mt-1 text-xs text-[#666]">Searches, result impressions, clicks, and seat-map opens</p>
              <div className="mt-4 flex flex-wrap items-baseline gap-2"><strong className="text-3xl">{(clientEventsPerDay / 1_000_000).toFixed(0)}M</strong><span className="text-sm text-[#666]">events/day</span><span className="text-[#888]">×</span><strong>1 KB</strong></div>
              <div className="my-5 h-px bg-[#c6c6c6]" />
              <div className="grid grid-cols-2 gap-2"><div><strong className="whitespace-nowrap text-2xl tracking-tight">{telemetryBurst} MB/s</strong><p className="mt-1 text-xs text-[#666]">launch-hour peak throughput</p></div><div><strong className="whitespace-nowrap text-2xl tracking-tight">{clientGbPerDay.toFixed(0)} GB/day</strong><p className="mt-1 text-xs text-[#666]">daily app-event payload</p></div></div>
            </div>
            <StartHoverExplanation id="daily-storage-app-tip" eyebrow="Calculation" title="App interaction storage" detail={`${dau}M users × ${sessionsPerUser} sessions/user/day × ${eventsPerSession} app events/session = ${(clientEventsPerDay / 1_000_000).toFixed(0)}M events/day. At 1 KB each: ${(clientEventsPerDay / 1_000_000).toFixed(0)}M × 1 KB ÷ 1,000,000 = ${clientGbPerDay.toFixed(0)} GB/day. The separate peak calculation is ${telemetryBurst}K events/s × 1 KB = ${telemetryBurst} MB/s.`} placement="inside-top-right" />
          </div>
          <div tabIndex={0} aria-describedby="daily-storage-critical-tip" className="group group/storage-critical relative z-0 cursor-pointer rounded-2xl border border-[#ccc] bg-white p-5 outline-none transition hover:z-50 hover:border-[#777] focus:z-50 focus:ring-2 focus:ring-[#888] focus:ring-offset-2">
            <div className="max-w-full transition-[max-width] duration-200 lg:group-hover/storage-critical:max-w-[calc(100%-17rem)] lg:group-focus-within/storage-critical:max-w-[calc(100%-17rem)]">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#555]">Critical domain events</p>
              <strong className="mt-4 block whitespace-nowrap text-3xl tracking-tight">{criticalGbPerDay.toFixed(0)} GB/day</strong>
              <p className="mt-2 text-sm leading-6 text-[#666]">{bookingsPerDay}M bookings × {criticalEventsPerBooking} events × 1 KB</p>
              <p className="mt-4 border-t border-[#ddd] pt-3 text-xs leading-5 text-[#666]">{criticalEventsPerBooking} is a planning average, not a fixed protocol.</p>
            </div>
            <StartHoverExplanation id="daily-storage-critical-tip" eyebrow="Calculation" title="Critical event storage" detail={`${bookingsPerDay}M bookings/day × ${criticalEventsPerBooking} lifecycle events/booking = ${(criticalEventsPerDay / 1_000_000).toFixed(0)}M events/day. At 1 KB each: ${(criticalEventsPerDay / 1_000_000).toFixed(0)}M × 1 KB ÷ 1,000,000 = ${criticalGbPerDay.toFixed(0)} GB/day.`} placement="inside-top-right" />
          </div>
        </div>
        <div className="mt-3 grid gap-px rounded-xl border border-[#bbb] bg-[#bbb] sm:grid-cols-4">
          <div tabIndex={0} aria-describedby="daily-storage-total-tip" className="group relative z-0 cursor-pointer rounded-t-[11px] bg-white p-4 outline-none transition hover:z-50 hover:bg-[#f4f4f4] focus:z-50 focus:ring-2 focus:ring-inset focus:ring-[#888] sm:rounded-l-[11px] sm:rounded-tr-none">
            <p className="font-mono text-[9px] text-[#666]">TOTAL / DAY</p><strong className="mt-1 block text-lg">{totalGbPerDay.toFixed(0)} GB</strong>
            <StartHoverExplanation id="daily-storage-total-tip" eyebrow="Calculation" title="Total logical storage per day" detail={`${clientGbPerDay.toFixed(0)} GB app interaction events + ${criticalGbPerDay.toFixed(0)} GB critical domain events = ${totalGbPerDay.toFixed(0)} GB/day before compression, replication, indexes, and metadata.`} placement="bottom" />
          </div>
          <div tabIndex={0} aria-describedby="daily-storage-retention-tip" className="group relative z-0 cursor-pointer bg-[#ededed] p-4 outline-none transition hover:z-50 hover:bg-[#e4e4e4] focus:z-50 focus:ring-2 focus:ring-inset focus:ring-[#888]">
            <p className="font-mono text-[9px] text-[#666]">{kafkaRetentionDays}-DAY LOGICAL</p><strong className="mt-1 block text-lg">{kafkaLogicalRetentionTb.toFixed(2)} TB</strong>
            <StartHoverExplanation id="daily-storage-retention-tip" eyebrow="Calculation" title={`${kafkaRetentionDays}-day logical storage`} detail={`${totalGbPerDay.toFixed(0)} GB/day × ${kafkaRetentionDays} days = ${(totalGbPerDay * kafkaRetentionDays).toFixed(0)} GB. Divide by 1,000 GB/TB = ${kafkaLogicalRetentionTb.toFixed(2)} TB before replication.`} placement="bottom" />
          </div>
          <div tabIndex={0} aria-describedby="daily-storage-rf3-tip" className="group relative z-0 cursor-pointer bg-white p-4 outline-none transition hover:z-50 hover:bg-[#f4f4f4] focus:z-50 focus:ring-2 focus:ring-inset focus:ring-[#888]">
            <p className="font-mono text-[9px] text-[#666]">{kafkaRetentionDays}-DAY KAFKA RF3</p><strong className="mt-1 block text-lg">{kafkaReplicatedRetentionTb.toFixed(2)} TB</strong>
            <StartHoverExplanation id="daily-storage-rf3-tip" eyebrow="Calculation" title={`${kafkaRetentionDays}-day Kafka storage with RF3`} detail={`${kafkaLogicalRetentionTb.toFixed(2)} TB logical storage × 3 broker copies = ${kafkaReplicatedRetentionTb.toFixed(2)} TB. RF3 means Kafka keeps three copies; protocol and filesystem overhead are still excluded.`} placement="bottom" />
          </div>
          <div tabIndex={0} aria-describedby="daily-storage-year-tip" className="group relative z-0 cursor-pointer rounded-b-[11px] bg-[#ededed] p-4 outline-none transition hover:z-50 hover:bg-[#e4e4e4] focus:z-50 focus:ring-2 focus:ring-inset focus:ring-[#888] sm:rounded-r-[11px] sm:rounded-bl-none">
            <p className="font-mono text-[9px] text-[#666]">ONE YEAR LOGICAL</p><strong className="mt-1 block text-lg">{yearlyLogicalTb.toFixed(1)} TB</strong>
            <p className="mt-2 border-t border-[#ccc] pt-2 font-mono text-[9px] text-[#666]">CURATED @ {curatedCompressionRatio}:1</p><strong className="mt-1 block text-sm">{curatedYearlyTb.toFixed(1)} TB/year</strong>
            <StartHoverExplanation id="daily-storage-year-tip" eyebrow="Calculation" title="Annual logical and curated storage" detail={`${totalGbPerDay.toFixed(0)} GB/day × 365 days ÷ 1,000 = ${yearlyLogicalTb.toFixed(1)} TB/year logical. The compressed curated estimate is ${yearlyLogicalTb.toFixed(1)} TB ÷ ${curatedCompressionRatio}:1 = ${curatedYearlyTb.toFixed(1)} TB/year. Bronze raw history, Iceberg snapshots, metadata, and serving copies remain separate.`} placement="bottom" />
          </div>
        </div>
        <div className="mt-8"><p className="font-mono text-xs font-bold uppercase tracking-[.15em] text-[#555]">Capacity formulas</p><div className="mt-5 grid gap-3 md:grid-cols-2">{capacityFormulas.map((item, index) => <article key={item.label} tabIndex={0} aria-describedby={`capacity-formula-${index}-tip`} className="group relative z-0 cursor-help border border-[#c7c7c7] bg-[#f7f7f7] p-4 outline-none transition hover:z-50 hover:border-[#777] hover:bg-[#ededed] focus:z-50 focus:border-[#777] focus:ring-2 focus:ring-[#888] focus:ring-offset-2"><span className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#555]">{item.label}</span><code className="mt-2 block text-xs leading-6 text-[#333]">{item.formula}</code><div className="mt-3 rounded-lg border border-[#c7c7c7] bg-white px-3 py-2 text-xs font-semibold leading-5">{item.example}</div><StartHoverExplanation id={`capacity-formula-${index}-tip`} eyebrow="Formula explanation" title={item.label} detail={item.detail} placement="bottom" /></article>)}</div></div>
      </div>
    </StartSection>
  </div>;
}

function Architecture() {
  const nodes = [
    { code: "EDGE", title: "Apps + waiting room", x: 24, y: 42, w: 190, receives: "Search, seat-map, hold, checkout, and app interaction requests", produces: "Admitted API work and batched client events", detail: "The edge authenticates, rate-limits, and admits bounded checkout work. Waiting-room tokens control entry only; they never own a seat.", chips: ["web + mobile", "admission"] },
    { code: "BOOK", title: "Inventory + booking API", x: 252, y: 42, w: 190, receives: "Admitted basket and idempotency key", produces: "Hold, booking, or deterministic conflict", detail: "The synchronous service coordinates the complete seat basket. It accepts a booking only when the authoritative database commits every required transition.", chips: ["show_id shard", "atomic basket"] },
    { code: "DB", title: "Postgres + outbox", x: 480, y: 42, w: 190, receives: "Conditional seat, booking, and payment transitions", produces: "Committed operational state and matching outbox rows", detail: "This is the sale authority. Seat ownership, booking state, payment outcome, and the event outbox commit in one transaction.", chips: ["seat authority", "one commit"] },
    { code: "PAY", title: "Payment gateway", x: 708, y: 42, w: 190, receives: "Idempotent charge or refund request", produces: "At-least-once payment callbacks", detail: "Gateway callbacks are deduplicated evidence of money movement. A successful callback cannot create a ticket without a valid database-owned hold.", chips: ["callback dedup", "refund path"] },
    { code: "CATALOG", title: "Catalog + venue DB", x: 936, y: 42, w: 190, receives: "Show, venue, screen, schedule, and price-band changes", produces: "Versioned catalog row changes", detail: "Catalog data drives discovery and enrichment. It follows a separate CDC path and never substitutes for authoritative seat availability.", chips: ["reference data", "versioned"] },
    { code: "COLLECT", title: "Telemetry collector", x: 170, y: 174, w: 190, receives: "Batched searches, impressions, clicks, and seat-map opens", produces: "Validated client-event batches", detail: "The collector handles retries, sampling policy, event IDs, and receipt timestamps without adding load to the booking transaction path.", chips: ["client events", "best effort"] },
    { code: "KAFKA", title: "Kafka + Schema Registry", x: 485, y: 174, w: 210, receives: "Domain events, catalog changes, and client interaction events", produces: "Keyed, replayable topic families", detail: "Kafka is the durable event backbone, not the seat authority. Schemas govern compatibility; keys preserve only the ordering each consumer actually needs.", chips: ["RF3 + acks=all", "schema contracts"] },
    { code: "CDC", title: "Debezium CDC", x: 820, y: 174, w: 190, receives: "Committed outbox rows, catalog WAL, and source positions", produces: "At-least-once Kafka records", detail: "CDC removes the database-to-Kafka dual-write gap. Stable event IDs and source positions make redelivery, restart, and resnapshot safe.", chips: ["WAL position", "at least once"] },
    { code: "FLINK", title: "Flink + checkpoints", x: 170, y: 314, w: 190, receives: "Booking, inventory, payment, and client topics", produces: "Risk signals and windowed operational aggregates", detail: "Flink uses event time, keyed state, watermarks, checkpoints, and idempotent upserts for second-level outputs. It never sells seats or charges customers.", chips: ["seconds", "event time"] },
    { code: "RAW", title: "Raw object archive", x: 485, y: 314, w: 190, receives: "Exact Kafka bytes, headers, schema ID, topic, partition, and offset", produces: "Immutable replay partitions", detail: "Object storage keeps lossless history beyond Kafka retention. Archived offset ranges are committed only after files and checks pass.", chips: ["S3 / GCS", "lossless Bronze"] },
    { code: "SPARK", title: "Spark + Airflow", x: 820, y: 314, w: 190, receives: "Raw objects, CDC snapshots, and reference data", produces: "Deduplicated entities and curated data products", detail: "Airflow schedules dependencies and Spark performs replay, compaction, validation, backfills, and deterministic Silver/Gold transformations.", chips: ["scheduled", "backfill-safe"] },
    { code: "REDIS", title: "Redis + risk store", x: 24, y: 454, w: 190, receives: "Versioned Flink upserts with TTL", produces: "Latest fraud, demand, and admission features", detail: "This store serves low-latency derived state. Every record expires or carries a version and can be rebuilt from the event backbone.", chips: ["keyed state", "TTL"] },
    { code: "OLAP", title: "Pinot / Druid", x: 252, y: 454, w: 190, receives: "Minute-level booking and inventory aggregates", produces: "Sliceable live-operations views", detail: "The real-time OLAP store supports show, city, venue, payment, and time-window drill-down with an explicit last-updated timestamp.", chips: ["live OLAP", "stale-aware"] },
    { code: "SEARCH", title: "OpenSearch index", x: 480, y: 454, w: 190, receives: "Catalog CDC projections from Kafka", produces: "Show and venue discovery documents", detail: "Search serves discovery only. Before creating a hold, checkout revalidates availability against the inventory authority.", chips: ["catalog projection", "not authority"] },
    { code: "ICEBERG", title: "Iceberg lakehouse", x: 708, y: 454, w: 190, receives: "Validated Spark outputs", produces: "Bronze, Silver, and owned Gold tables", detail: "Iceberg supplies snapshots, schema evolution, partition evolution, rollback, and reproducible corrections for product and financial data.", chips: ["B / S / G", "snapshot history"] },
    { code: "TRINO", title: "Trino + feature serving", x: 936, y: 454, w: 190, receives: "Certified Iceberg tables and approved features", produces: "Governed SQL views and training/serving datasets", detail: "Trino exposes historical SQL while the warehouse or feature layer publishes consumer-specific products with ownership and freshness contracts.", chips: ["governed SQL", "feature sets"] },
    { code: "RISK", title: "Fraud + pricing APIs", x: 24, y: 594, w: 190, receives: "Current Redis risk and demand features", produces: "Conservative risk and approved pricing inputs", detail: "Operational APIs consume fresh derived features and fall back to safe static controls when streaming state is stale.", chips: ["online decision", "fallback"] },
    { code: "OPS", title: "Live operations", x: 252, y: 594, w: 190, receives: "Pinot/Druid aggregates with as-of time", produces: "Booking, payment, and inventory health views", detail: "Operators see holds, confirmations, payment failures, and inventory movement with freshness made visible.", chips: ["minutes", "as_of_time"] },
    { code: "DISCOVERY", title: "Search + discovery", x: 480, y: 594, w: 190, receives: "OpenSearch catalog documents", produces: "Ranked shows, venues, and filters", detail: "Discovery can tolerate projection lag because actual seat ownership is checked again in the synchronous hold path.", chips: ["read model", "revalidate"] },
    { code: "BIFIN", title: "BI + finance", x: 708, y: 594, w: 190, receives: "Certified Gold facts and dimensions", produces: "Product metrics and T+1 reconciliation", detail: "Governed marts preserve grain, currency, correction version, lineage, and exception reports for business and finance users.", chips: ["Gold marts", "T+1"] },
    { code: "ML", title: "ML training", x: 936, y: 594, w: 190, receives: "Point-in-time feature and label snapshots", produces: "Reproducible training datasets", detail: "Training reads privacy-controlled snapshots with event-time joins so models do not learn from future information.", chips: ["point in time", "privacy"] },
  ] as const;
  const edges = [
    { from: "EDGE", to: "BOOK", label: "admitted request" },
    { from: "BOOK", to: "DB", label: "atomic commit" },
    { from: "PAY", to: "DB", label: "callback" },
    { from: "EDGE", to: "COLLECT", label: "app events" },
    { from: "DB", to: "CDC", label: "outbox + WAL" },
    { from: "CATALOG", to: "CDC", label: "catalog log" },
    { from: "COLLECT", to: "KAFKA" },
    { from: "CDC", to: "KAFKA" },
    { from: "KAFKA", to: "FLINK", label: "seconds" },
    { from: "KAFKA", to: "RAW", label: "exact bytes" },
    { from: "RAW", to: "SPARK", label: "replay" },
    { from: "FLINK", to: "REDIS" },
    { from: "FLINK", to: "OLAP" },
    { from: "KAFKA", to: "SEARCH", label: "catalog topic", bend: "left" },
    { from: "SPARK", to: "ICEBERG", label: "scheduled" },
    { from: "ICEBERG", to: "TRINO", label: "certified tables" },
    { from: "REDIS", to: "RISK" },
    { from: "OLAP", to: "OPS" },
    { from: "SEARCH", to: "DISCOVERY" },
    { from: "TRINO", to: "BIFIN" },
    { from: "TRINO", to: "ML" },
  ] as const;
  const architectureExamples: Record<(typeof nodes)[number]["code"], string> = {
    EDGE: "During a blockbuster release, the waiting room admits only the checkout rate the inventory database has load-tested. Search and browsing remain available without promising a seat.",
    BOOK: "For seats A7 and A8, one request key creates one basket attempt. Both seats move together; a conflict on either seat rejects the complete basket.",
    DB: "The transaction changes A7 and A8 from AVAILABLE to HELD by H1 and inserts seat_held event E1 into the outbox before it commits.",
    PAY: "Gateway callback P1 may arrive twice or after H1 expires. The payment service deduplicates P1 and confirms only while H1 still owns the seats.",
    CATALOG: "A venue changes a show time or price band once; the versioned row change later refreshes BookMyShow discovery documents and analytical dimensions.",
    COLLECT: "The mobile app batches search_submitted, result_impression, show_clicked, and seat_map_opened events with stable client event IDs.",
    KAFKA: "inventory.events is keyed for required show ordering, booking.events by booking_id, and client.events by session_id. Each topic gets its own retention and quota.",
    CDC: "After the H1 transaction commits, Debezium reads E1 and its WAL position. A restart may resend E1, so consumers deduplicate by event_id.",
    FLINK: "A Flink job combines hold attempts, confirmations, and client velocity to update bot-risk signals and per-show booking counters within seconds.",
    RAW: "The archive stores E1 with its schema ID, headers, topic, partition, offset, and timestamps so the exact input can be replayed after Kafka retention expires.",
    SPARK: "A scheduled run deduplicates booking events, normalizes money and timestamps, validates seat counts, and publishes corrected Silver and Gold partitions.",
    REDIS: "A risk API reads the latest device/show velocity feature with its rule version and expiry. Missing or stale keys trigger a conservative fallback.",
    OLAP: "Operations slice confirmations, holds, and payment failures by city, venue, show, and minute while the dashboard displays its as-of timestamp.",
    SEARCH: "Catalog CDC updates the searchable show document. A result may be slightly stale, so checkout always rechecks seats in Postgres before holding them.",
    ICEBERG: "Silver keeps replay-safe booking and payment histories; Gold publishes show performance, funnel, and finance facts as versioned snapshots.",
    TRINO: "Analysts query certified Iceberg snapshots, while approved point-in-time features are published for downstream training and serving workloads.",
    RISK: "The checkout path receives a bot-risk or demand feature, but stale streaming state falls back to an approved static rule rather than blocking blindly.",
    OPS: "A show dashboard reports holds/min, confirmations/min, payment failures, and available/held/sold counts together with freshness and lag.",
    DISCOVERY: "Customers search by city, movie, language, date, and venue. The result is a discovery read model—not proof that a displayed seat is still available.",
    BIFIN: "Finance compares confirmed bookings, the internal movement ledger, gateway captures/refunds, and settlement files, then publishes explicit exceptions.",
    ML: "Bot and demand models train from event-time feature snapshots and later outcomes without using future booking or payment information.",
  };
  const architectureBoundaries: Record<(typeof nodes)[number]["code"], string> = {
    EDGE: "Never confirms availability or owns inventory.",
    BOOK: "Returns success only after the database transaction commits.",
    DB: "Only this boundary decides seat ownership and durable booking state.",
    PAY: "Money success is not ticket success; late captures enter compensation.",
    CATALOG: "Owns reference data, not live seat state.",
    COLLECT: "Loss or sampling affects analytics, never booking correctness.",
    KAFKA: "Provides per-partition order and replay, not global order or seat authority.",
    CDC: "At-least-once delivery requires stable IDs and idempotent consumers.",
    FLINK: "Produces derived signals only; it cannot finalize a booking or charge money.",
    RAW: "Archive completeness is proven by committed offset ranges and gap checks.",
    SPARK: "Failed validation blocks publication; it never rewrites the operational database.",
    REDIS: "Disposable and rebuildable; stale state must be detectable.",
    OLAP: "Operational visibility may lag and must expose freshness.",
    SEARCH: "Discovery is eventually consistent; holds revalidate against Postgres.",
    ICEBERG: "Historical truth is correctable and versioned, not a checkout serving path.",
    TRINO: "Only certified tables and approved features reach consumers.",
    RISK: "A stale signal uses a documented fallback and never mints a ticket.",
    OPS: "Dashboards observe the system; they do not change authoritative state.",
    DISCOVERY: "Search ranking cannot promise a seat.",
    BIFIN: "Mismatches remain explicit exceptions instead of being silently netted away.",
    ML: "Training data is point-in-time correct, privacy controlled, and reproducible.",
  };
  const [node, setNode] = useState(6);
  const [zoom, setZoom] = useState(1);
  const [seatState, setSeatState] = useState(1);
  const [traceSelection, setTraceSelection] = useState(0);
  const [failureSelection, setFailureSelection] = useState(0);
  const seatStates = [
    { state: "BLOCKED", owner: "Owned by an operational rule", summary: "The seat exists but is not sellable.", enters: "Venue operations, maintenance, safety, or an approved business rule blocks the seat with a reason and version.", leaves: "Only an authorized unblock transition returns it to AVAILABLE.", rule: "BLOCKED remains part of capacity accounting but must not be counted as available, held, or sold." },
    { state: "AVAILABLE", owner: "No active owner", summary: "The seat can enter one new hold.", enters: "New show inventory, an expired hold, or an approved release returns the seat to AVAILABLE.", leaves: "A conditional database update assigns one hold_id only if the seat is still AVAILABLE.", rule: "A seat-map cache may display this state, but the hold transaction must recheck it in Postgres." },
    { state: "HELD", owner: "Owned by hold_id", summary: "Temporarily reserved for one checkout.", enters: "All seats in the basket change to HELD in one transaction and receive the same database-time expiry.", leaves: "The same unexpired hold confirms the booking, or the expiry process releases it to AVAILABLE.", rule: "Another customer cannot confirm or extend this hold. Kafka and Redis cannot override its owner." },
    { state: "SOLD", owner: "Owned by booking_id", summary: "The booking owns the seat durably.", enters: "A valid payment outcome and the still-active hold are confirmed together in the booking transaction.", leaves: "Cancellation or refund follows an explicit business workflow; a payment callback alone never silently releases it.", rule: "A unique active owner plus immutable booking-seat evidence prevents a second confirmed sale." },
  ] as const;
  const seatTransitions = [
    { desktop: "↔", mobile: "↕", label: "block / unblock" },
    { desktop: "↔", mobile: "↕", label: "hold / expire" },
    { desktop: "→", mobile: "↓", label: "confirm" },
  ] as const;
  const trace = [
    { code: "R1", title: "Request A7 + A8", brief: "Admitted checkout request", action: "The client sends seats A7 and A8 with idempotency key R1. The API validates the show, basket, admission token, and request identity before touching inventory.", why: "Retries with R1 return the same attempt instead of creating multiple holds.", output: "A validated command; no seat ownership has changed yet." },
    { code: "H1 + E1", title: "Hold + outbox commit", brief: "One authoritative transaction", action: "Postgres conditionally changes both seats from AVAILABLE to HELD by H1 and inserts seat_held event E1 into the outbox in the same commit.", why: "If either seat is unavailable, the whole basket rolls back. There is no database/Kafka dual write.", output: "Durable hold H1, expiry time, and committed outbox event E1." },
    { code: "P1 + E2", title: "Payment + confirmation", brief: "Recheck ownership before sale", action: "The payment service deduplicates callback P1, then confirms only if H1 still owns both seats and has not expired. Booking B1 and event E2 commit together.", why: "A successful or duplicated gateway callback cannot manufacture a ticket after ownership is lost.", output: "Confirmed booking B1 and booking_confirmed event E2—or a compensation case." },
    { code: "FAN-OUT", title: "Kafka consumers", brief: "Distribute committed facts", action: "Debezium publishes E1 and E2 to Kafka. Flink updates risk/live operations, the raw archiver stores exact records, and Spark later builds analytical and finance products.", why: "Every consumer deduplicates stable event IDs, so CDC redelivery changes no business result.", output: "Rebuildable serving views, replay evidence, Gold facts, and finance reconciliation inputs." },
  ] as const;
  const failureSteps = [
    { step: "01", title: "Hold H1 is active", seat: "A7 is HELD by H1", money: "Payment P1 is pending", explanation: "Customer one owns a temporary hold until the database expiry time. The gateway is still processing, so no booking exists yet.", decision: "Allow only H1 to confirm A7 before expiry; keep the seat unavailable to other checkouts.", evidence: "hold_id H1, expires_at, request key R1" },
    { step: "02", title: "H1 expires", seat: "A7 returns to AVAILABLE", money: "P1 is still unresolved", explanation: "Database time passes the hold expiry. The expiry transition releases A7 because no valid confirmation committed in time.", decision: "Do not extend H1 from a delayed client or gateway message. Emit hold_expired and make the seat eligible for a new hold.", evidence: "expiry transition and outbox event" },
    { step: "03", title: "A7 is sold to B2", seat: "A7 becomes SOLD by B2", money: "Customer two pays normally", explanation: "A second checkout creates H2 and confirms booking B2 while A7 is legitimately available. B2 is now the authoritative owner.", decision: "Protect B2 with the unique active seat owner invariant; the old H1 can no longer confirm.", evidence: "hold H2, booking B2, booking_confirmed E2" },
    { step: "04", title: "Late P1 success arrives", seat: "A7 remains owned by B2", money: "Original capture succeeded late", explanation: "The gateway reports success for customer one after H1 expired and A7 was resold. The callback is real money evidence, but it is not seat ownership.", decision: "Deduplicate P1, reject booking confirmation because H1 no longer owns A7, and open a compensation record.", evidence: "provider_event_id P1 and failed ownership check" },
    { step: "05", title: "Refund + reconcile", seat: "B2 remains unchanged", money: "P1 is refunded or reviewed", explanation: "The payment workflow refunds the orphan capture or sends it to a controlled exception queue. Finance later matches capture, refund, booking, and settlement records.", decision: "Never cancel B2 to satisfy the late callback. Close the case only after refund and reconciliation evidence agree.", evidence: "refund movement, exception status, T+1 reconciliation" },
  ] as const;

  return <div className="mt-5 space-y-5">
    <StartSection id="transactional-spine" eyebrow="End-to-end big-data architecture" title="Booking truth → event backbone → streaming and lakehouse" subtitle="Follow BookMyShow data through five layers. Hover, focus, or click a component to see its exact responsibility and boundary.">
      <div className="mt-5 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative overflow-x-auto rounded-2xl border border-[#d8d8d8] bg-[#f4f4f4]">
          <div className="absolute right-3 top-3 z-10 flex rounded-lg border border-[#c9c9c9] bg-white p-1"><button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(.8, Number((value - .1).toFixed(1))))} className="h-8 w-8 text-lg">−</button><button type="button" aria-label="Reset zoom" onClick={() => setZoom(1)} className="min-w-14 border-x border-[#ddd] px-2 text-[10px] font-bold">{Math.round(zoom * 100)}%</button><button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.3, Number((value + .1).toFixed(1))))} className="h-8 w-8 text-lg">+</button></div>
          <svg viewBox="0 0 1150 690" className="h-auto min-h-[600px] min-w-[940px] w-full" role="group" aria-label="BookMyShow end-to-end big-data architecture">
            <defs><marker id="bms-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#777" /></marker></defs>
            <g transform={`translate(${575 - 575 * zoom} ${18 - 18 * zoom}) scale(${zoom})`}>
              {[
                { label: "01 · OPERATIONAL SOURCES + TRANSACTION TRUTH", y: 8, h: 112 },
                { label: "02 · INGESTION + EVENT BACKBONE", y: 140, h: 112 },
                { label: "03 · STREAM + BATCH PROCESSING", y: 280, h: 112 },
                { label: "04 · SERVING + ANALYTICAL STORAGE", y: 420, h: 112 },
                { label: "05 · BUSINESS + OPERATIONAL CONSUMERS", y: 560, h: 118 },
              ].map((stage, index) => <g key={stage.label}><rect x="10" y={stage.y} width="1128" height={stage.h} rx="14" fill={index % 2 === 0 ? '#eeeeee' : '#f8f8f8'} stroke="#d7d7d7" /><text x="24" y={stage.y + 19} fontSize="10" fontWeight="800" fill="#555" letterSpacing="1.25">{stage.label}</text></g>)}
              {edges.map((edge) => {
                const from = nodes.find((item) => item.code === edge.from)!;
                const to = nodes.find((item) => item.code === edge.to)!;
                const active = from.code === nodes[node].code || to.code === nodes[node].code;
                const horizontal = Math.abs(from.y - to.y) < 20;
                const movesRight = to.x > from.x;
                const x1 = horizontal ? (movesRight ? from.x + from.w : from.x) : from.x + from.w / 2;
                const y1 = horizontal ? from.y + 36 : from.y + 72;
                const x2 = horizontal ? (movesRight ? to.x - 7 : to.x + to.w + 7) : to.x + to.w / 2;
                const y2 = horizontal ? to.y + 36 : to.y - 7;
                const mid = horizontal ? (x1 + x2) / 2 : (y1 + y2) / 2;
                const bendsLeft = 'bend' in edge && edge.bend === 'left';
                const path = horizontal ? `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}` : bendsLeft ? `M ${x1} ${y1} C ${x1 - 145} ${mid - 28}, ${x2 - 145} ${mid + 28}, ${x2} ${y2}` : `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
                const labelX = horizontal ? mid : bendsLeft ? Math.min(x1, x2) - 128 : (x1 + x2) / 2;
                const labelY = horizontal ? y1 - 10 : mid;
                return <g key={`${edge.from}-${edge.to}`} opacity={active ? 1 : .62}><path d={path} fill="none" stroke={active ? '#111' : '#777'} strokeWidth={active ? 2.4 : 1.15} markerEnd="url(#bms-arrow)" />{'label' in edge && edge.label ? <g><rect x={labelX - 36} y={labelY - 9} width="72" height="17" rx="5" fill="#fff" stroke="#c9c9c9" /><text x={labelX} y={labelY + 3} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#555">{edge.label}</text></g> : null}</g>;
              })}
              {nodes.map((item, index) => { const active = node === index; return <g key={item.code} role="button" tabIndex={0} aria-label={`${item.title}. ${item.detail}`} aria-pressed={active} onMouseEnter={() => setNode(index)} onFocus={() => setNode(index)} onClick={() => setNode(index)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setNode(index); } }} className="cursor-pointer outline-none"><rect x={item.x - 9} y={item.y - 9} width={item.w + 18} height="90" fill="transparent" pointerEvents="all" /><rect x={item.x} y={item.y} width={item.w} height="72" rx="11" fill={active ? '#d6d6d6' : '#fff'} stroke={active ? '#111' : '#9e9e9e'} strokeWidth={active ? 2.2 : 1} /><rect x={item.x} y={item.y} width="5" height="72" rx="2.5" fill={active ? '#111' : '#777'} /><text x={item.x + 15} y={item.y + 19} fontSize="8.5" fontWeight="800" fill="#666" letterSpacing="1.05">{item.code}</text><text x={item.x + 15} y={item.y + 42} fontSize="12.5" fontWeight="700" fill="#111">{item.title}</text><text x={item.x + 15} y={item.y + 61} fontSize="8.5" fill="#666">{item.chips[0]} · {item.chips[1]}</text>{active ? <circle cx={item.x + item.w - 13} cy={item.y + 14} r="4" fill="#111" /> : null}</g>; })}
            </g>
          </svg>
        </div>
        <aside className="self-start rounded-2xl border border-[#bdbdbd] bg-[#ededed] 2xl:sticky 2xl:top-[140px]" aria-live="polite"><div className="border-b border-[#c9c9c9] bg-[#111] p-5 text-white"><p className="font-mono text-[9px] font-bold text-[#cfcfcf]">SELECTED COMPONENT · {nodes[node].code}</p><h3 className="mt-2 text-xl font-semibold">{nodes[node].title}</h3></div><div className="grid gap-4 p-5"><p className="text-xs leading-6 text-[#333]">{nodes[node].detail}</p><div className="rounded-xl border border-[#c9c9c9] bg-white p-3"><p className="font-mono text-[9px] font-bold text-[#666]">BOOKMYSHOW EXAMPLE</p><p className="mt-1.5 text-xs leading-5">{architectureExamples[nodes[node].code]}</p></div><div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1"><div><p className="font-mono text-[9px] font-bold text-[#666]">RECEIVES</p><p className="mt-1 text-xs leading-5">{nodes[node].receives}</p></div><div><p className="font-mono text-[9px] font-bold text-[#666]">PRODUCES</p><p className="mt-1 text-xs leading-5">{nodes[node].produces}</p></div></div><div className="border-l-2 border-[#111] pl-3"><p className="font-mono text-[9px] font-bold text-[#666]">BOUNDARY / FAILURE RULE</p><p className="mt-1 text-xs leading-5">{architectureBoundaries[nodes[node].code]}</p></div><div className="flex flex-wrap gap-2">{nodes[node].chips.map((chip) => <Chip key={chip}>{chip}</Chip>)}</div></div></aside>
      </div>
    </StartSection>
    <StartSection id="event-backbone" eyebrow="Authoritative seat lifecycle" title="One seat; four explicit database states" subtitle="Select a state to see how a BookMyShow seat enters it, leaves it, and which rule protects ownership.">
      <div className="mt-6 grid items-stretch gap-2 lg:grid-cols-[1fr_64px_1fr_64px_1fr_64px_1fr]">
        {seatStates.map((item, index) => <div className="contents" key={item.state}><button type="button" aria-pressed={seatState === index} onMouseEnter={() => setSeatState(index)} onFocus={() => setSeatState(index)} onClick={() => setSeatState(index)} className={`min-h-28 rounded-xl border p-4 text-left transition ${seatState === index ? 'border-[#111] bg-[#dedede] shadow-[inset_0_-3px_0_#111]' : 'border-[#c8c8c8] bg-white hover:border-[#777] hover:bg-[#f2f2f2]'}`}><span className="font-mono text-[9px] font-bold text-[#666]">STATE {String(index + 1).padStart(2, '0')}</span><strong className="mt-2 block text-base">{item.state}</strong><span className="mt-1 block text-xs text-[#555]">{item.owner}</span></button>{index < seatStates.length - 1 ? <span className="flex min-h-10 flex-col items-center justify-center self-center text-center text-[#777]"><b className="text-lg"><span className="lg:hidden">{seatTransitions[index].mobile}</span><span className="hidden lg:inline">{seatTransitions[index].desktop}</span></b><small className="hidden font-mono text-[7px] uppercase leading-3 lg:block">{seatTransitions[index].label}</small></span> : null}</div>)}
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[#bdbdbd] bg-[#ededed]" aria-live="polite"><div className="bg-[#111] px-5 py-4 text-white"><p className="font-mono text-[9px] font-bold text-[#cfcfcf]">SELECTED STATE · {seatStates[seatState].state}</p><h3 className="mt-1 text-lg font-semibold">{seatStates[seatState].summary}</h3></div><div className="grid gap-4 p-5 md:grid-cols-3"><div><p className="font-mono text-[9px] font-bold text-[#666]">HOW IT ENTERS</p><p className="mt-2 text-xs leading-6 text-[#444]">{seatStates[seatState].enters}</p></div><div><p className="font-mono text-[9px] font-bold text-[#666]">HOW IT LEAVES</p><p className="mt-2 text-xs leading-6 text-[#444]">{seatStates[seatState].leaves}</p></div><div><p className="font-mono text-[9px] font-bold text-[#666]">BOOKMYSHOW SAFETY RULE</p><p className="mt-2 text-xs leading-6 text-[#444]">{seatStates[seatState].rule}</p></div></div></div>
    </StartSection>
    <StartSection id="critical-flow" eyebrow="Critical trace" title="Track R1, H1, E1, P1, and E2" subtitle="The booking response depends on the DB commit—not on Kafka availability.">
      <div className="mt-5 grid overflow-hidden rounded-xl border border-[#c9c9c9] bg-[#c9c9c9] sm:grid-cols-2 lg:grid-cols-5" aria-label="Critical trace identifier legend">
        {[
          ["R1", "Request key"],
          ["H1", "Seat hold"],
          ["E1", "Seat-held event"],
          ["P1", "Payment callback"],
          ["E2", "Booking-confirmed event"],
        ].map(([code, meaning], index) => <div key={code} className={`p-3 ${index % 2 === 0 ? 'bg-white' : 'bg-[#ededed]'}`}><strong className="font-mono text-xs">{code}</strong><span className="ml-2 text-[10px] text-[#555]">{meaning}</span></div>)}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ol className="space-y-2">{trace.map((item, index) => <li key={item.code}><button type="button" aria-pressed={traceSelection === index} onFocus={() => setTraceSelection(index)} onClick={() => setTraceSelection(index)} className={`grid w-full grid-cols-[72px_minmax(0,1fr)_24px] items-center gap-3 rounded-xl border p-3 text-left transition ${traceSelection === index ? 'border-[#111] bg-[#dedede]' : 'border-[#c9c9c9] bg-white hover:border-[#777] hover:bg-[#f3f3f3]'}`}><span className={`flex min-h-12 items-center justify-center rounded-lg border px-2 text-center font-mono text-[9px] font-bold ${traceSelection === index ? 'border-[#111] bg-[#111] text-white' : 'border-[#bbb] bg-[#ededed]'}`}>{item.code}</span><span><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs text-[#555]">{item.brief}</span></span><span className="text-lg text-[#777]">{index < trace.length - 1 ? '↓' : '✓'}</span></button>{index < trace.length - 1 ? <span className="ml-[47px] block h-3 w-px bg-[#777]" /> : null}</li>)}</ol>
        <aside className="self-start overflow-hidden rounded-2xl border border-[#bdbdbd] bg-[#ededed] lg:sticky lg:top-[140px]" aria-live="polite"><div className="bg-[#111] p-5 text-white"><p className="font-mono text-[9px] font-bold text-[#ccc]">SELECTED STEP · {trace[traceSelection].code}</p><h3 className="mt-2 text-lg font-semibold">{trace[traceSelection].title}</h3></div><div className="grid gap-4 p-5"><div><p className="font-mono text-[9px] font-bold text-[#666]">WHAT HAPPENS</p><p className="mt-1.5 text-xs leading-6 text-[#444]">{trace[traceSelection].action}</p></div><div><p className="font-mono text-[9px] font-bold text-[#666]">WHY THIS IS SAFE</p><p className="mt-1.5 text-xs leading-6 text-[#444]">{trace[traceSelection].why}</p></div><div className="rounded-xl border border-[#c8c8c8] bg-white p-3"><p className="font-mono text-[9px] font-bold text-[#666]">DURABLE OUTPUT</p><p className="mt-1.5 text-xs leading-5">{trace[traceSelection].output}</p></div></div></aside>
      </div>
    </StartSection>
    <StartSection id="payment-race" eyebrow="Failure path" title="A late payment must not create a double sale" subtitle="The callback is evidence of money movement; the database still decides whether a ticket exists.">
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ol className="space-y-2">{failureSteps.map((item, index) => <li key={item.step}><button type="button" aria-pressed={failureSelection === index} onFocus={() => setFailureSelection(index)} onClick={() => setFailureSelection(index)} className={`w-full rounded-xl border p-4 text-left transition ${failureSelection === index ? 'border-[#111] bg-[#dedede]' : 'border-[#c9c9c9] bg-white hover:border-[#777] hover:bg-[#f3f3f3]'}`}><span className="flex items-center justify-between gap-3"><span className="font-mono text-[9px] font-bold text-[#666]">STEP {item.step}</span><span className="text-lg text-[#777]">{index < failureSteps.length - 1 ? '↓' : '✓'}</span></span><strong className="mt-1 block text-sm">{item.title}</strong><span className="mt-3 grid gap-2 sm:grid-cols-2"><span className="rounded-lg border border-[#c8c8c8] bg-white px-3 py-2 text-[10px]"><b className="block font-mono text-[8px] text-[#666]">SEAT</b>{item.seat}</span><span className="rounded-lg border border-[#c8c8c8] bg-white px-3 py-2 text-[10px]"><b className="block font-mono text-[8px] text-[#666]">MONEY</b>{item.money}</span></span></button>{index < failureSteps.length - 1 ? <span className="ml-8 block h-3 w-px bg-[#777]" /> : null}</li>)}</ol>
        <aside className="self-start overflow-hidden rounded-2xl border border-[#bdbdbd] bg-[#ededed] lg:sticky lg:top-[140px]" aria-live="polite"><div className="bg-[#111] p-5 text-white"><p className="font-mono text-[9px] font-bold text-[#ccc]">FAILURE STEP {failureSteps[failureSelection].step}</p><h3 className="mt-2 text-lg font-semibold">{failureSteps[failureSelection].title}</h3></div><div className="grid gap-4 p-5"><div><p className="font-mono text-[9px] font-bold text-[#666]">WHAT HAPPENED</p><p className="mt-1.5 text-xs leading-6 text-[#444]">{failureSteps[failureSelection].explanation}</p></div><div className="border-l-2 border-[#111] pl-3"><p className="font-mono text-[9px] font-bold text-[#666]">SAFE DECISION</p><p className="mt-1.5 text-xs leading-6 text-[#444]">{failureSteps[failureSelection].decision}</p></div><div className="rounded-xl border border-[#c8c8c8] bg-white p-3"><p className="font-mono text-[9px] font-bold text-[#666]">AUDIT EVIDENCE</p><p className="mt-1.5 text-xs leading-5">{failureSteps[failureSelection].evidence}</p></div></div></aside>
      </div>
    </StartSection>
  </div>;
}

function EventContracts() {
  const events = [
    {
      family: "Inventory", name: "inventory.seat_held", topic: "inventory.events", key: "show_id", owner: "Inventory service", delivery: "Postgres outbox → Debezium → Kafka", summary: "A complete seat basket was atomically reserved for one temporary hold.", fields: ["hold_id", "booking_attempt_id", "show_id", "seat_ids", "hold_expires_at", "quote_id", "price_version", "user_token", "device_token"], invariant: "Publish only after every requested seat is owned by the same hold. A partial A7/A8 hold is invalid.", ordering: "Key by show_id when all conflicting seat transitions for a show must remain in one ordered Kafka partition.", sample: JSON.stringify({ event_id: "e_hold_01J9", event_type: "inventory.seat_held", schema_version: 1, aggregate_id: "h_91", aggregate_version: 1, occurred_at: "2026-09-24T10:00:00Z", committed_at: "2026-09-24T10:00:01Z", ingested_at: "2026-09-24T10:00:02Z", producer: "inventory-service", trace_id: "t_91", causation_id: "cmd_hold_r1", payload: { hold_id: "h_91", booking_attempt_id: "ba_2048", show_id: "sh_88", seat_ids: ["A7", "A8"], hold_expires_at: "2026-09-24T10:05:01Z", quote_id: "q_310", price_version: 7, user_token: "usr_9f", device_token: "dev_32" } }, null, 2),
    },
    {
      family: "Booking", name: "booking.booking_confirmed", topic: "booking.events", key: "booking_id", owner: "Booking service", delivery: "Postgres outbox → Debezium → Kafka", summary: "A durable BookMyShow booking now owns the listed seats at the accepted quote.", fields: ["booking_id", "hold_id", "show_id", "seat_ids", "quantity", "confirmed_at", "price_version", "currency", "amount components", "payment_id", "channel", "promo_id"], invariant: "The hold still owns every seat; quantity equals the number of distinct seat IDs; money uses signed integer paise.", ordering: "Apply aggregate_version monotonically for one booking_id; older versions cannot replace newer booking state.", sample: JSON.stringify({ event_id: "e_book_01JA", event_type: "booking.booking_confirmed", schema_version: 1, aggregate_id: "b_2048", aggregate_version: 4, occurred_at: "2026-09-24T10:01:04Z", committed_at: "2026-09-24T10:01:05Z", ingested_at: "2026-09-24T10:01:06Z", producer: "booking-service", trace_id: "t_91", causation_id: "cmd_confirm_91", payload: { booking_id: "b_2048", hold_id: "h_91", show_id: "sh_88", seat_ids: ["A7", "A8"], quantity: 2, confirmed_at: "2026-09-24T10:01:04Z", price_version: 7, currency: "INR", ticket_base_amount_paise: 40000, convenience_fee_paise: 5000, tax_amount_paise: 6000, discount_amount_paise: 0, customer_paid_paise: 51000, payment_id: "pay_450", channel: "ANDROID", promo_id: null } }, null, 2),
    },
    {
      family: "Payment", name: "payment.payment_status_changed", topic: "payment.events", key: "booking_id", owner: "Payment service", delivery: "Payment ledger outbox → Debezium → Kafka", summary: "A gateway payment attempt moved to a new deduplicated financial state.", fields: ["payment_id", "booking_attempt_id", "provider_event_id", "status", "status_version", "amount_paise", "currency", "provider_reference", "effective_at", "received_at"], invariant: "provider_event_id is unique and status transitions are valid. CAPTURED is money evidence, not automatic seat ownership.", ordering: "Apply status_version monotonically within a payment attempt; retain effective and receipt times for late callbacks.", sample: JSON.stringify({ event_id: "e_pay_01JB", event_type: "payment.payment_status_changed", schema_version: 1, aggregate_id: "pay_450", aggregate_version: 4, occurred_at: "2026-09-24T10:01:02Z", committed_at: "2026-09-24T10:01:03Z", ingested_at: "2026-09-24T10:01:04Z", producer: "payment-service", trace_id: "t_91", causation_id: "gateway_callback_p1", payload: { payment_id: "pay_450", booking_attempt_id: "ba_2048", booking_id: "b_2048", provider_event_id: "p1", status: "CAPTURED", status_version: 4, amount_paise: 51000, currency: "INR", provider_reference: "gw_ref_782", effective_at: "2026-09-24T10:01:02Z", received_at: "2026-09-24T10:01:03Z" } }, null, 2),
    },
    {
      family: "Client", name: "client.interaction", topic: "client.events", key: "session_id", owner: "Client telemetry", delivery: "Web/mobile batch → collector → Kafka", summary: "A customer interacted with BookMyShow discovery or checkout; it is behavioral evidence, not transaction truth.", fields: ["session_id", "user_token", "action", "screen", "show_id", "client_event_at", "server_received_at", "app_version", "consent_scope", "sample_rate", "attributes"], invariant: "The client cannot assert a confirmed booking. Preserve server receipt time because device clocks may be wrong.", ordering: "Best effort within a session; deduplicate event_id, tolerate reordering, and record sampling explicitly.", sample: JSON.stringify({ event_id: "e_client_01JC", event_type: "client.interaction", schema_version: 1, aggregate_id: "s_17", aggregate_version: 18, occurred_at: "2026-09-24T09:59:55Z", committed_at: null, ingested_at: "2026-09-24T09:59:58Z", producer: "bookmyshow-android", trace_id: "t_91", causation_id: "request_seat_map_77", payload: { session_id: "s_17", user_token: "usr_9f", action: "seat_map_opened", screen: "seat-map", show_id: "sh_88", client_event_at: "2026-09-24T09:59:55Z", server_received_at: "2026-09-24T09:59:58Z", app_version: "15.4.0", consent_scope: "analytics", sample_rate: 1, attributes: { city: "Pune", source: "show-page" } } }, null, 2),
    },
    {
      family: "Catalog", name: "catalog.show_changed", topic: "catalog.cdc", key: "show_id", owner: "Catalog platform", delivery: "Catalog WAL → Debezium → Kafka", summary: "A show or venue reference record changed and downstream discovery projections must refresh.", fields: ["show_id", "operation", "before", "after", "source_position", "source_tx_id", "source_committed_at"], invariant: "Preserve the actual database source position and operation. A snapshot row is initial state, not a fabricated show-created event.", ordering: "Apply changes for one source primary key by source position; protect current state from older CDC records.", sample: JSON.stringify({ event_id: "e_catalog_01JD", event_type: "catalog.show_changed", schema_version: 1, aggregate_id: "sh_88", aggregate_version: 12, occurred_at: "2026-09-24T08:30:00Z", committed_at: "2026-09-24T08:30:01Z", ingested_at: "2026-09-24T08:30:03Z", producer: "catalog-cdc", trace_id: "tx_catalog_310", causation_id: "admin_show_update_44", payload: { show_id: "sh_88", operation: "UPDATE", before: { start_time: "2026-09-25T18:00:00+05:30", price_band: "REGULAR" }, after: { start_time: "2026-09-25T18:15:00+05:30", price_band: "PREMIUM" }, source_position: { type: "postgres_lsn", value: "0/16B6C50" }, source_tx_id: "tx_310", source_committed_at: "2026-09-24T08:30:01Z" } }, null, 2),
    },
    {
      family: "Risk", name: "risk.signal_emitted", topic: "risk.signals", key: "subject_token", owner: "Trust streaming", delivery: "Kafka → Flink → Kafka/online risk store", summary: "A versioned streaming rule produced temporary risk evidence for a customer, device, network, or show.", fields: ["signal_id", "subject_type", "subject_token", "show_id", "window_start", "window_end", "rule_id", "rule_version", "score", "action_recommendation", "event_count", "evaluated_at", "expires_at"], invariant: "The signal is explainable, versioned, and expires. It recommends an action but never changes seat ownership.", ordering: "For one subject and rule, the newest rule version and evaluation time win; stale signals must expire.", sample: JSON.stringify({ event_id: "e_risk_01JE", event_type: "risk.signal_emitted", schema_version: 1, aggregate_id: "dev_32", aggregate_version: 12, occurred_at: "2026-09-24T10:00:30Z", committed_at: null, ingested_at: "2026-09-24T10:00:31Z", producer: "flink-risk-job", trace_id: "t_91", causation_id: "window_device_velocity_1000", payload: { signal_id: "sig_771", subject_type: "DEVICE", subject_token: "dev_32", show_id: "sh_88", window_start: "2026-09-24T10:00:00Z", window_end: "2026-09-24T10:00:30Z", rule_id: "device_hold_velocity", rule_version: 12, score: 0.81, action_recommendation: "CHALLENGE", event_count: 15, evaluated_at: "2026-09-24T10:00:30Z", expires_at: "2026-09-24T10:05:30Z" } }, null, 2),
    },
  ];
  const optionalExampleFields: Record<string, readonly string[]> = {
    Inventory: ["user_token", "device_token"],
    Booking: ["promo_id"],
    Client: ["user_token", "attributes"],
  };
  const compactSamples = events.map((event) => {
    const record = JSON.parse(event.sample) as Record<string, unknown> & { payload: Record<string, unknown> };
    const omitted = new Set(optionalExampleFields[event.family] ?? []);
    const payload = Object.fromEntries(Object.entries(record.payload).filter(([name]) => !omitted.has(name)));
    return JSON.stringify({ event_id: record.event_id, event_type: record.event_type, schema_version: record.schema_version, aggregate_id: record.aggregate_id, occurred_at: record.occurred_at, trace_id: record.trace_id, payload }, null, 2).replace(/\[\n\s+"([^"]+)",\n\s+"([^"]+)"\n\s+\]/g, '["$1", "$2"]');
  });
  const envelope = [
    { name: "event_id", purpose: "Gives one business fact a stable identity across CDC and producer retries.", example: "The booking-confirmed event keeps event_id e_01J... even if Debezium publishes it again.", usedBy: "Flink, Spark, and serving sinks use it to ignore duplicate copies of that event." },
    { name: "event_type", purpose: "States the business fact so consumers do not infer meaning from a database table name.", example: "booking.booking_confirmed means a durable booking exists—not that checkout merely started.", usedBy: "Kafka routing, consumer handlers, lineage, and the event catalog." },
    { name: "schema_version", purpose: "Selects the exact payload structure and meaning used when this event was produced.", example: "Version 3 may add discount_funder while older records remain readable as version 2.", usedBy: "Schema Registry, deserializers, compatibility checks, and replay jobs." },
    { name: "aggregate_id", purpose: "Identifies the business object whose history this event belongs to.", example: "b_2048 groups confirmation, cancellation, and refund facts for one booking.", usedBy: "Consumers group state by booking, hold, show, payment, or risk subject." },
    { name: "aggregate_version", purpose: "Provides a monotonic sequence within one aggregate so stale updates cannot overwrite newer state.", example: "A projection that already applied booking version 4 rejects a late version 3 record.", usedBy: "Current-state projections, upsert sinks, and out-of-order detection." },
    { name: "occurred_at", purpose: "Records when the customer or business action actually happened.", example: "The confirmation happened at 10:01:04, even if downstream delivery was later.", usedBy: "Flink event-time windows, customer journeys, and time-based analysis." },
    { name: "committed_at", purpose: "Records when Postgres made the authoritative state and outbox row durable.", example: "At 10:01:05, booking B1 and its booking-confirmed event became durable together.", usedBy: "Domain-event freshness, source ordering checks, and operational SLOs." },
    { name: "ingested_at", purpose: "Records when the data platform first received the event.", example: "Kafka received the booking-confirmed event at 10:01:06, one second after the database commit.", usedBy: "CDC delay, producer delay, end-to-end lag, and incident diagnosis." },
    { name: "producer", purpose: "Names the service responsible for the event contract and its business meaning.", example: "booking-service owns booking.booking_confirmed and its release version.", usedBy: "Schema ownership, on-call routing, lineage, and deployment debugging." },
    { name: "trace_id", purpose: "Connects one customer journey across inventory, booking, payment, and downstream processing.", example: "t_91 links the request, temporary hold, payment callback, confirmed booking, and published event.", usedBy: "Distributed tracing, support investigation, and cross-service debugging." },
    { name: "causation_id", purpose: "Explains which command or earlier event directly caused this event.", example: "cmd_confirm_91 caused the booking-confirmed event after the payment callback was accepted.", usedBy: "Causal timelines, loop prevention, replay analysis, and audit questions." },
    { name: "payload", purpose: "Carries the typed BookMyShow data specific to this event; the other fields are the common wrapper.", example: "For a confirmed booking: booking_id, show_id, seat_ids, amount_paise, currency, and payment_id.", usedBy: "Flink rules, Silver tables, finance facts, BI metrics, and feature pipelines." },
  ] as const;
  const envelopeLines = [
    ['event_id', '  "event_id": "e_01J...",'], ['event_type', '  "event_type": "booking.booking_confirmed",'], ['schema_version', '  "schema_version": 3,'], ['aggregate_id', '  "aggregate_id": "b_2048",'], ['aggregate_version', '  "aggregate_version": 4,'], ['occurred_at', '  "occurred_at": "2026-09-24T10:01:04Z",'], ['committed_at', '  "committed_at": "2026-09-24T10:01:05Z",'], ['ingested_at', '  "ingested_at": "2026-09-24T10:01:06Z",'], ['producer', '  "producer": "booking-service",'], ['trace_id', '  "trace_id": "t_91",'], ['causation_id', '  "causation_id": "cmd_confirm_91",'], ['payload', '  "payload": { "amount_paise": 51000 }'],
  ] as const;
  const topics = [
    { label: "Inventory", topic: "inventory.events", key: "show_id", retention: "7–14 days", replay: "Immutable object archive", purpose: "Protect seat-state facts and preserve the order needed to rebuild one show's inventory projection.", example: "For show sh_88, seat A7 must be observed as HELD before SOLD; duplicates are removed by event_id.", failure: "A hot show can overload one partition, so the waiting room limits admitted writes and partition load is tested." },
    { label: "Booking + payment", topic: "booking.events / payment.events", key: "booking_id / payment attempt ID", retention: "14–30 days", replay: "Ledger + immutable raw archive", purpose: "Keep durable booking and money lifecycles isolated from high-volume clicks and available for operational recovery.", example: "Booking B1, payment P1, a late callback, refund, and dispute can be traced without mixing unrelated customers.", failure: "If a consumer is down beyond Kafka retention, rebuild from the booking/payment ledger and archived records—not from memory." },
    { label: "Catalog CDC", topic: "catalog.cdc", key: "source primary key / show_id", retention: "7–14 days + compacted latest state", replay: "CDC snapshot and change archive", purpose: "Rebuild BookMyShow search documents when shows, venues, schedules, languages, or price bands change.", example: "All changes for show sh_88 apply by source position so an older schedule cannot overwrite a newer one.", failure: "Losing the snapshot-to-log handoff creates missing or stale discovery results; source positions prove continuity." },
    { label: "Client telemetry", topic: "client.events", key: "session_id", retention: "2–7 days", replay: "Lifecycle-managed raw objects", purpose: "Isolate large search, impression, click, and seat-map traffic from business-critical booking and payment topics.", example: "One session's search → result impression → show click → seat-map open can be reconstructed for funnel analysis.", failure: "Telemetry bursts must not consume booking-topic quotas. Sampling is explicit and sampled counts never drive finance." },
    { label: "Derived signals", topic: "risk.signals", key: "subject token / show_id", retention: "Hours to a few days", replay: "Recompute from raw facts + rule version", purpose: "Distribute temporary fraud, demand, and operational signals without treating them as permanent business truth.", example: "A device-risk signal for show sh_88 expires after its TTL; consumers fall back safely when it becomes stale.", failure: "Keeping an old risk signal indefinitely can block legitimate buyers, so every signal carries a version and expiry." },
  ];
  const [selected, setSelected] = useState(0);
  const [field, setField] = useState(0);
  const [topic, setTopic] = useState(0);
  return <div className="mt-5 space-y-5">
    <StartSection id="event-envelope" eyebrow="Event envelope in the pipeline" title="What travels with every BookMyShow event—and why" subtitle="The envelope is the common wrapper around seat-held, booking-confirmed, payment, catalog, and client events. The payload contains the event-specific fact.">
      <div className="mt-5 rounded-2xl border border-[#cfcfcf] bg-[#ededed] p-4 md:p-5">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[.14em] text-[#555]">Where the envelope fits</p>
        <div className="mt-4 grid items-stretch gap-2 lg:grid-cols-[1fr_24px_1fr_24px_1fr_24px_1fr_24px_1fr]">
          {[
            ["01", "Booking service", "Builds the event with the DB change"],
            ["02", "Outbox row", "Commits it with the booking"],
            ["03", "Debezium CDC", "Moves the committed record"],
            ["04", "Kafka + Registry", "Validates and distributes it"],
            ["05", "Flink · Raw · Spark", "Uses fields for state, replay, and tables"],
          ].map(([step, title, note], index, list) => <div className="contents" key={step}><div className={`rounded-xl border p-3 ${index === 1 ? 'border-[#111] bg-white shadow-[inset_0_-3px_0_#111]' : 'border-[#c7c7c7] bg-[#f8f8f8]'}`}><span className="font-mono text-[8px] font-bold text-[#666]">{step}</span><strong className="mt-1 block text-xs">{title}</strong><span className="mt-1 block text-[10px] leading-4 text-[#666]">{note}</span></div>{index < list.length - 1 ? <span className="flex h-6 rotate-90 items-center justify-center self-center text-lg text-[#777] lg:h-auto lg:rotate-0">→</span> : null}</div>)}
        </div>
        <div className="mt-4 grid gap-px overflow-hidden rounded-xl border border-[#c8c8c8] bg-[#c8c8c8] md:grid-cols-2"><div className="bg-white p-3"><strong className="font-mono text-[9px]">ENVELOPE = COMMON LABEL</strong><p className="mt-1 text-[10px] leading-5 text-[#555]">Identity, type, version, ordering, timestamps, producer, and trace information.</p></div><div className="bg-[#f5f5f5] p-3"><strong className="font-mono text-[9px]">PAYLOAD = BOOKMYSHOW FACT</strong><p className="mt-1 text-[10px] leading-5 text-[#555]">For example: booking, show, seats, price, currency, and payment reference.</p></div></div>
      </div>
      <div className="mt-4 grid overflow-hidden rounded-2xl border border-[#cfcfcf] lg:grid-cols-[1.05fr_.95fr]"><pre className="overflow-x-auto bg-[#ededed] p-5 font-mono text-[11px] leading-7"><code><span>{'{\n'}</span>{envelopeLines.map(([name, line], index) => <button key={name} type="button" aria-pressed={field === index} onMouseEnter={() => setField(index)} onFocus={() => setField(index)} onClick={() => setField(index)} className={`block w-full whitespace-pre border-l-2 pl-2 text-left transition ${field === index ? 'border-[#111] bg-white font-bold text-[#111]' : 'border-transparent text-[#555] hover:border-[#999] hover:bg-white/60'}`}>{line}</button>)}<span>{'\n}'}</span></code></pre><div className="border-t border-[#cfcfcf] bg-white p-6 lg:border-l lg:border-t-0" aria-live="polite"><p className="font-mono text-[9px] font-bold text-[#666]">SELECTED FIELD {String(field + 1).padStart(2, '0')}</p><h3 className="mt-3 text-xl font-semibold">{envelope[field].name}</h3><p className="mt-3 text-sm leading-7 text-[#444]">{envelope[field].purpose}</p><div className="mt-5 rounded-xl border border-[#c9c9c9] bg-[#ededed] p-3"><p className="font-mono text-[9px] font-bold text-[#666]">BOOKMYSHOW EXAMPLE</p><p className="mt-1.5 text-xs leading-5">{envelope[field].example}</p></div><div className="mt-4 border-l-2 border-[#111] pl-3"><p className="font-mono text-[9px] font-bold text-[#666]">WHO USES IT</p><p className="mt-1.5 text-xs leading-5 text-[#444]">{envelope[field].usedBy}</p></div></div></div>
    </StartSection>
    <StartSection id="event-catalog" eyebrow="Canonical event contracts" title="Inspect exactly what each BookMyShow producer publishes" subtitle="Choose an event to see its Kafka route, key, business rules, ordering promise, and a complete envelope-plus-payload record.">
      <div className="mt-4 grid overflow-hidden rounded-xl border border-[#c9c9c9] bg-[#c9c9c9] sm:grid-cols-2 xl:grid-cols-6" role="tablist" aria-label="BookMyShow event contracts">
        {events.map((event, index) => <button key={event.name} type="button" role="tab" aria-selected={selected === index} onFocus={() => setSelected(index)} onClick={() => setSelected(index)} className={`min-h-16 p-2.5 text-left transition ${selected === index ? 'bg-[#d8d8d8] text-[#111] shadow-[inset_0_-3px_0_#111]' : `${index % 2 === 0 ? 'bg-white' : 'bg-[#ededed]'} hover:bg-[#dedede]`}`}><span className="font-mono text-[8px] font-bold uppercase tracking-[.12em] text-[#666]">{String(index + 1).padStart(2, '0')} · {event.family}</span><strong className="mt-1 block text-[11px]">{event.name.split('.').slice(1).join('.')}</strong></button>)}
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-[#bdbdbd] bg-white" aria-live="polite">
        <div className="bg-[#111] px-5 py-2.5 text-white"><h3 className="text-base font-semibold">{events[selected].name}</h3></div>
        <div className="grid lg:grid-cols-[.9fr_1.1fr]">
          <div className="p-4 lg:p-5"><p className="text-xs leading-5 text-[#444]">{events[selected].summary}</p><div className="mt-3 grid gap-px overflow-hidden rounded-lg border border-[#ccc] bg-[#ccc] sm:grid-cols-3"><div className="bg-white p-2.5"><p className="font-mono text-[8px] text-[#666]">TOPIC</p><p className="mt-1 break-all text-[10px] font-semibold">{events[selected].topic}</p></div><div className="bg-[#ededed] p-2.5"><p className="font-mono text-[8px] text-[#666]">KEY</p><p className="mt-1 break-all text-[10px] font-semibold">{events[selected].key}</p></div><div className="bg-white p-2.5"><p className="font-mono text-[8px] text-[#666]">OWNER</p><p className="mt-1 text-[10px] font-semibold">{events[selected].owner}</p></div></div><div className="mt-4"><p className="font-mono text-[8px] font-bold text-[#666]">DELIVERY PATH</p><p className="mt-1 text-[11px] font-semibold leading-5">{events[selected].delivery}</p></div><div className="mt-4 border-t border-[#ddd] pt-4"><p className="font-mono text-[8px] font-bold text-[#666]">PAYLOAD FIELDS</p><div className="mt-2 flex flex-wrap gap-1.5">{events[selected].fields.map((item) => <span key={item} className="rounded-full border border-[#c9c9c9] bg-[#ededed] px-2.5 py-1 font-mono text-[8px]">{item}</span>)}</div></div><div className="mt-4 rounded-xl border border-[#c9c9c9] bg-[#ededed] p-3"><p className="font-mono text-[8px] font-bold text-[#666]">MUST ALWAYS BE TRUE</p><p className="mt-1.5 text-[11px] leading-5 text-[#444]">{events[selected].invariant}</p></div><div className="mt-3 border-l-2 border-[#111] pl-3"><p className="font-mono text-[8px] font-bold text-[#666]">ORDERING PROMISE</p><p className="mt-1.5 text-[11px] leading-5 text-[#444]">{events[selected].ordering}</p></div></div>
          <div className="border-t border-[#cfcfcf] bg-[#ededed] p-4 lg:border-l lg:border-t-0 lg:p-5"><div className="flex items-center justify-between gap-3"><div><p className="font-mono text-[8px] font-bold text-[#666]">COMPACT COMPLETE BUSINESS RECORD</p><p className="mt-1 text-[10px] text-[#555]">Essential envelope + all required payload fields</p></div><span className="rounded-full border border-[#bbb] bg-white px-2.5 py-1 font-mono text-[8px]">valid JSON</span></div><pre tabIndex={0} className="mt-3 overflow-x-auto rounded-xl border border-[#c7c7c7] bg-white p-3 font-mono text-[9px] leading-4 text-[#333]">{compactSamples[selected]}</pre><p className="mt-2 text-[9px] leading-4 text-[#666]">Optional example fields remain listed in the contract on the left.</p></div>
        </div>
      </div>
    </StartSection>
    <StartSection id="topic-contract" eyebrow="Kafka topic + replay policy" title="Why BookMyShow separates events and keeps them for different periods" subtitle="A topic isolates a workload, its key controls local ordering, and retention defines how long Kafka can replay it before the raw archive takes over.">
      <div className="mt-5 border-l-4 border-[#111] bg-[#ededed] px-5 py-4"><strong className="text-sm">Why BookMyShow needs this</strong><p className="mt-1 text-xs leading-6 text-[#555]">A blockbuster launch can create huge search and seat-map traffic. Separate topics stop noisy app events from consuming the same quota, access policy, and recovery window as seat, booking, and payment facts.</p></div>
      <div className="mt-4 grid gap-px overflow-hidden rounded-xl border border-[#c8c8c8] bg-[#c8c8c8] md:grid-cols-3"><div className="bg-white p-4"><span className="font-mono text-[9px] font-bold text-[#666]">01 · TOPIC</span><strong className="mt-2 block text-sm">Isolate the workload</strong><p className="mt-1 text-[11px] leading-5 text-[#555]">Give inventory, payments, catalog, and telemetry independent capacity, access, and failure handling.</p></div><div className="bg-[#ededed] p-4"><span className="font-mono text-[9px] font-bold text-[#666]">02 · PARTITION KEY</span><strong className="mt-2 block text-sm">Keep related events ordered</strong><p className="mt-1 text-[11px] leading-5 text-[#555]">Kafka orders only inside one partition, so the key must match the state a consumer rebuilds.</p></div><div className="bg-white p-4"><span className="font-mono text-[9px] font-bold text-[#666]">03 · RETENTION</span><strong className="mt-2 block text-sm">Define the replay window</strong><p className="mt-1 text-[11px] leading-5 text-[#555]">Kafka handles recent recovery; immutable object storage handles older replay and backfills.</p></div></div>
      <div className="mt-5 flex flex-wrap gap-1 border-b border-[#cfcfcf]" role="tablist" aria-label="BookMyShow Kafka workloads">{topics.map((item, index) => <button key={item.label} type="button" role="tab" aria-selected={topic === index} onFocus={() => setTopic(index)} onClick={() => setTopic(index)} className={`border-b-2 px-4 py-3 text-xs font-semibold transition ${topic === index ? 'border-[#111] bg-[#ededed] text-[#111]' : 'border-transparent text-[#666] hover:bg-[#f3f3f3]'}`}>{item.label}</button>)}</div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[#c8c8c8] bg-white" aria-live="polite"><div className="flex flex-wrap items-center justify-between gap-3 bg-[#ededed] px-5 py-3"><div><p className="font-mono text-[8px] font-bold text-[#666]">SELECTED WORKLOAD</p><h3 className="mt-1 text-lg font-semibold">{topics[topic].label}</h3></div><code className="rounded-lg border border-[#bbb] bg-white px-3 py-2 text-[10px] font-bold">{topics[topic].topic}</code></div><div className="grid gap-5 p-5 lg:grid-cols-[1.05fr_.95fr]"><div><p className="font-mono text-[9px] font-bold text-[#666]">WHY THIS TOPIC EXISTS</p><p className="mt-2 text-xs leading-6 text-[#444]">{topics[topic].purpose}</p><div className="mt-4 rounded-xl border border-[#c9c9c9] bg-[#ededed] p-3"><p className="font-mono text-[8px] font-bold text-[#666]">BOOKMYSHOW EXAMPLE</p><p className="mt-1.5 text-[11px] leading-5">{topics[topic].example}</p></div></div><div className="grid gap-px overflow-hidden rounded-xl border border-[#c8c8c8] bg-[#c8c8c8] sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3"><div className="bg-white p-3"><p className="font-mono text-[8px] text-[#666]">PARTITION KEY</p><p className="mt-1.5 text-[10px] font-semibold leading-4">{topics[topic].key}</p></div><div className="bg-[#ededed] p-3"><p className="font-mono text-[8px] text-[#666]">IN KAFKA</p><p className="mt-1.5 text-[10px] font-semibold leading-4">{topics[topic].retention}</p></div><div className="bg-white p-3"><p className="font-mono text-[8px] text-[#666]">AFTER KAFKA</p><p className="mt-1.5 text-[10px] font-semibold leading-4">{topics[topic].replay}</p></div></div></div><div className="border-t border-[#d2d2d2] px-5 py-4"><p className="font-mono text-[8px] font-bold text-[#666]">FAILURE / DESIGN LIMIT</p><p className="mt-1.5 text-[11px] leading-5 text-[#444]">{topics[topic].failure}</p></div></div>
    </StartSection>
  </div>;
}

type ModelExplanation = {
  group: string;
  name: string;
  grain: string;
  contents: string;
  purpose: string;
  source: string;
};

const DEFAULT_MODEL_EXPLANATION: ModelExplanation = {
  group: "Fact",
  name: "fact_booking",
  grain: "One row represents one successfully confirmed booking.",
  contents: "Booking ID, customer and show references, confirmation time, booking status, seat count, and the final amount paid.",
  purpose: "Shows how many bookings succeeded, how much the customer paid, and how many seats were purchased.",
  source: "Created after the booking database confirms the seats and the final amount.",
};

function DataModeling({ onExplain }: { onExplain: (explanation: ModelExplanation) => void }) {
  const tables = [
    { name: "dim_date", group: "Dimension", grain: "One row represents one calendar date.", purpose: "Lets bookings, payments, scans, and settlements use the same day, week, month, and holiday definitions.", source: "Created once from a business calendar and reused by every fact table.", columns: ["PK · date_sk", "ATTR · calendar_date", "ATTR · day / week / month"] },
    { name: "dim_time", group: "Dimension", grain: "One row represents one minute of the day.", purpose: "Makes it easy to compare booking demand, seat occupancy, and venue entry by hour or time window.", source: "Created once as a standard 24-hour time list and reused by event facts.", columns: ["PK · time_sk", "ATTR · hour", "ATTR · minute_bucket"] },
    { name: "dim_city", group: "Dimension", grain: "One row identifies a city where BookMyShow operates.", purpose: "Allows searches, bookings, and available inventory to be compared city by city.", source: "Created from BookMyShow's approved city and region catalog.", columns: ["PK · city_sk", "NK · city_id", "ATTR · city / region"] },
    { name: "dim_venue", group: "Dimension", grain: "One row describes one cinema, theatre, stadium, or event venue.", purpose: "Adds the venue name, city, timezone, and operator to every scheduled show.", source: "Created from the venue catalog whenever a venue is added or its reporting details change.", columns: ["PK · venue_sk", "NK · venue_id", "FK · city_sk"] },
    { name: "dim_screen", group: "Dimension", grain: "One row describes one auditorium, screen, or event area inside a venue.", purpose: "Provides the seating layout and official capacity used to check show occupancy.", source: "Created from the venue's approved screen and seating-layout records.", columns: ["PK · screen_sk", "NK · screen_id", "FK · venue_sk"] },
    { name: "dim_show", group: "Dimension", grain: "One row describes one scheduled performance at a specific time and screen.", purpose: "Connects demand and bookings to the correct movie or event, language, format, venue, and start time.", source: "Created from the show catalog and preserved as it looked when the event occurred.", columns: ["PK · show_sk", "NK · show_id", "FK · screen_sk"] },
    { name: "dim_seat", group: "Dimension", grain: "One row describes one physical seat in a screen's seating plan.", purpose: "Adds the row, seat number, category, and accessibility information to a booked or held seat.", source: "Created from the venue seating plan; live availability is stored separately.", columns: ["PK · seat_sk", "NK · seat_id", "FK · screen_sk"] },
    { name: "dim_customer", group: "Dimension", grain: "One row represents one customer without exposing their direct identity.", purpose: "Supports repeat-customer and booking-journey analysis while protecting personal information.", source: "Created from the customer account after replacing the real customer ID with a protected token.", columns: ["PK · customer_sk", "NK · customer_token", "ATTR · cohort / segment"] },
    { name: "dim_payment_method", group: "Dimension", grain: "One row represents one payment method and provider combination.", purpose: "Shows whether cards, UPI, wallets, or other methods succeed or fail more often.", source: "Created by mapping different gateway names into one consistent payment-method list.", columns: ["PK · payment_method_sk", "ATTR · provider", "ATTR · instrument_type"] },
    { name: "dim_promotion", group: "Dimension", grain: "One row describes one version of a promotion or discount offer.", purpose: "Explains which discount was applied, who funded it, and which rules were active at checkout.", source: "Created from the promotion configuration that was valid when the quote was accepted.", columns: ["PK · promotion_sk", "NK · promotion_id", "ATTR · funding_party"] },
    { name: "dim_partner", group: "Dimension", grain: "One row identifies one cinema, venue, or event-organiser partner.", purpose: "Groups shows, commissions, and amounts payable under the correct business partner.", source: "Created from BookMyShow's approved partner master.", columns: ["PK · partner_sk", "NK · partner_id", "ATTR · partner_type"] },
    { name: "dim_partner_contract", group: "Dimension", grain: "One row contains one partner contract version and its active dates.", purpose: "Explains the commission and payout rule that applied when a ticket was sold.", source: "Created from signed commercial contracts without replacing older contract versions.", columns: ["PK · contract_sk", "FK · partner_sk", "ATTR · commission_bps"] },
    { name: "dim_device", group: "Dimension", grain: "One row represents one protected device profile.", purpose: "Helps compare app behaviour and fraud risk by platform without storing the raw device identity.", source: "Created from tokenized app, browser, and device information sent with customer activity.", columns: ["PK · device_sk", "NK · device_token", "ATTR · platform / app"] },
    { name: "dim_risk_rule", group: "Dimension", grain: "One row describes one deployed version of a fraud or bot rule.", purpose: "Explains exactly which rule allowed, reviewed, or blocked a customer action.", source: "Created from the risk-policy registry whenever a rule version is deployed.", columns: ["PK · risk_rule_sk", "NK · rule_id", "ATTR · rule_version"] },
    { name: "fact_booking", group: "Fact", grain: "One row represents one successfully confirmed booking.", purpose: "Shows how many bookings succeeded, how much the customer paid, and how many seats were purchased.", source: "Created after the booking database confirms the seats and the final amount.", columns: ["PK · booking_id", "FK · customer_sk", "FK · show_sk", "MEASURE · paid_paise"] },
    { name: "fact_booking_seat", group: "Fact", grain: "One row represents one seat inside one confirmed booking.", purpose: "Shows the exact seat price, discount, and tax without counting a multi-seat booking as one seat.", source: "Created from the final seat lines stored with a confirmed booking.", columns: ["PK · booking_id + seat_sk", "FK · show_sk", "FK · promotion_sk", "MEASURE · unit_price_paise"] },
    { name: "fact_hold_attempt", group: "Fact", grain: "One row represents one customer attempt to hold seats.", purpose: "Shows which holds succeeded, failed, or expired and where popular shows faced heavy competition.", source: "Created from seat-hold requests and their final inventory result.", columns: ["PK · hold_attempt_id", "FK · customer_sk", "FK · show_sk / seat_sk", "MEASURE · requested_seats"] },
    { name: "fact_occupancy_snapshot", group: "Fact", grain: "One row records a show's held and sold seats for one price band at one minute.", purpose: "Shows how quickly a show is filling and how many seats remain during a sale.", source: "Created every minute from ordered seat holds, releases, and confirmed bookings.", columns: ["PK · show_sk + time_sk", "ATTR · price_band", "MEASURE · held_seats", "MEASURE · sold_seats"] },
    { name: "fact_payment_attempt", group: "Fact", grain: "One row represents one attempt to pay through a gateway, including retries.", purpose: "Shows payment success, failure, response time, and provider reliability.", source: "Created from the payment request and its matching gateway response.", columns: ["PK · payment_attempt_id", "FK · booking_id", "FK · payment_method_sk", "MEASURE · amount_paise"] },
    { name: "fact_financial_movement", group: "Fact", grain: "One row represents one amount added or removed, such as a capture, fee, tax, or refund.", purpose: "Keeps a complete money history so finance can reconcile totals without changing an earlier transaction.", source: "Created from accepted entries in the payment and finance ledger.", columns: ["PK · movement_id", "FK · booking_id", "ATTR · movement_type", "MEASURE · signed_amount_paise"] },
    { name: "fact_cancellation", group: "Fact", grain: "One row represents one cancellation of a booking or booked seat.", purpose: "Shows why the cancellation happened, which seat was released, and how much refund was due.", source: "Created when the cancellation service accepts a request and records its refund decision.", columns: ["PK · cancellation_id", "FK · booking_id / seat_sk", "ATTR · reason_code", "MEASURE · refund_due_paise"] },
    { name: "fact_partner_settlement", group: "Fact", grain: "One row represents the amount owed to one partner for one booking.", purpose: "Shows ticket value, commission, adjustments, and the final amount BookMyShow must pay the partner.", source: "Created from the confirmed booking, the sale-time partner contract, and later refund adjustments.", columns: ["PK · settlement_line_id", "FK · booking_id / partner_sk", "FK · contract_sk", "MEASURE · payable_paise"] },
    { name: "fact_discovery_event", group: "Fact", grain: "One row represents one search, impression, click, or seat-map action.", purpose: "Shows how customers move from discovering a show to opening seats and completing a booking.", source: "Created from valid app and website activity after duplicate events are removed.", columns: ["PK · event_id", "FK · customer_sk / device_sk", "FK · show_sk", "ATTR · event_type"] },
    { name: "fact_price_quote", group: "Fact", grain: "One row represents one complete price offered to a customer during checkout.", purpose: "Preserves the ticket price, fee, tax, and discount the customer actually saw before paying.", source: "Created from the pricing service response shown during checkout.", columns: ["PK · quote_id", "FK · show_sk / promotion_sk", "FK · customer_sk", "MEASURE · quoted_total_paise"] },
    { name: "fact_risk_decision", group: "Fact", grain: "One row represents one allow, review, or block decision for a customer action.", purpose: "Shows why suspicious booking behaviour was permitted or stopped during high-demand sales.", source: "Created from the risk engine's score, selected rule version, and final decision.", columns: ["PK · decision_id", "FK · customer_sk / device_sk", "FK · risk_rule_sk", "MEASURE · risk_score"] },
    { name: "fact_ticket_scan", group: "Fact", grain: "One row represents one attempt to scan a ticket at a venue entrance.", purpose: "Shows successful entry, rejected tickets, and repeated scans so venue staff can investigate problems.", source: "Created from the venue scanner result and linked back to the booked seat.", columns: ["PK · scan_id", "FK · booking_id / seat_sk", "FK · time_sk", "ATTR · scan_outcome"] },
  ] as const;

  const tableContents: Record<string, string> = {
    dim_date: "Date key, calendar date, day, week, month, quarter, financial period, weekend flag, and holiday flag.",
    dim_time: "Time key, hour, minute bucket, part of day, and labels such as morning, evening, or prime time.",
    dim_city: "City key, BookMyShow city ID, city name, state or region, country, and whether the market is active.",
    dim_venue: "Venue key, venue ID and name, city, timezone, operator, venue type, and reporting status.",
    dim_screen: "Screen key, screen ID and name, venue, seating-layout version, total capacity, and screen format.",
    dim_show: "Show key and ID, title or event, venue and screen, start time, language, format, and sale status.",
    dim_seat: "Seat key and ID, screen, row, seat number, price category, accessibility flag, and layout version.",
    dim_customer: "Protected customer token, signup cohort, broad customer segment, home market, and account status—never direct identity fields.",
    dim_payment_method: "Payment-method key, provider, instrument type such as card or UPI, card network where allowed, and payment channel.",
    dim_promotion: "Promotion ID, offer type, funding party, discount rule, maximum discount, eligibility dates, and campaign owner.",
    dim_partner: "Partner ID and type, display name, operating region, payout account reference, and active status.",
    dim_partner_contract: "Contract key, partner, valid dates, commission rate, fee basis, tax treatment, and settlement schedule.",
    dim_device: "Protected device token, platform, operating-system family, app or browser version, device class, and capability group.",
    dim_risk_rule: "Risk rule ID, deployed version, rule category, owner, activation dates, and the action produced by the rule.",
    fact_booking: "Booking ID, customer and show references, confirmation time, booking status, seat count, and the final amount paid.",
    fact_booking_seat: "Booking and seat IDs, show, price category, ticket price, discount, fee, tax, and the final price for that seat.",
    fact_hold_attempt: "Hold-attempt ID, customer, show and seats requested, request time, result, failure reason, expiry time, and requested-seat count.",
    fact_occupancy_snapshot: "Show, price band, snapshot minute, total capacity, available seats, held seats, and sold seats at that moment.",
    fact_payment_attempt: "Payment-attempt ID, booking, method, provider reference, requested amount, gateway status, response time, and failure code.",
    fact_financial_movement: "Movement ID, booking, movement type, signed amount, currency, gateway or ledger reference, event time, and reversal link.",
    fact_cancellation: "Cancellation ID, booking and optional seat, request time, reason, policy applied, refund due, and seat-release result.",
    fact_partner_settlement: "Settlement-line ID, booking, partner, contract version, ticket value, commission, tax, adjustments, and final payable amount.",
    fact_discovery_event: "Event ID, customer and device references, show, action type, page or surface, position, event time, and session ID.",
    fact_price_quote: "Quote ID, customer and show, selected seats, base ticket value, fees, tax, discount, total offered, and quote expiry.",
    fact_risk_decision: "Decision ID, attempted action, customer and device references, risk score, rule version, final outcome, and decision reason.",
    fact_ticket_scan: "Scan ID, booking and seat, gate or scanner, scan time, result, rejection reason, and whether the ticket was scanned earlier.",
  };

  const layout = [
    { name: "dim_date", x: 20, y: 10, width: 180 }, { name: "dim_time", x: 210, y: 10, width: 180 }, { name: "dim_city", x: 400, y: 10, width: 180 }, { name: "dim_venue", x: 590, y: 10, width: 180 }, { name: "dim_screen", x: 780, y: 10, width: 180 }, { name: "dim_show", x: 970, y: 10, width: 180 }, { name: "dim_seat", x: 1160, y: 10, width: 180 },
    { name: "fact_booking", x: 50, y: 165, width: 300 }, { name: "fact_booking_seat", x: 370, y: 165, width: 300 }, { name: "fact_hold_attempt", x: 690, y: 165, width: 300 }, { name: "fact_occupancy_snapshot", x: 1010, y: 165, width: 300 },
    { name: "fact_payment_attempt", x: 50, y: 355, width: 300 }, { name: "fact_financial_movement", x: 370, y: 355, width: 300 }, { name: "fact_cancellation", x: 690, y: 355, width: 300 }, { name: "fact_partner_settlement", x: 1010, y: 355, width: 300 },
    { name: "fact_discovery_event", x: 50, y: 545, width: 300 }, { name: "fact_price_quote", x: 370, y: 545, width: 300 }, { name: "fact_risk_decision", x: 690, y: 545, width: 300 }, { name: "fact_ticket_scan", x: 1010, y: 545, width: 300 },
    { name: "dim_customer", x: 20, y: 710, width: 180 }, { name: "dim_payment_method", x: 210, y: 710, width: 180 }, { name: "dim_promotion", x: 400, y: 710, width: 180 }, { name: "dim_partner", x: 590, y: 710, width: 180 }, { name: "dim_partner_contract", x: 780, y: 710, width: 180 }, { name: "dim_device", x: 970, y: 710, width: 180 }, { name: "dim_risk_rule", x: 1160, y: 710, width: 180 },
  ] as const;

  const relationships = [
    { from: "dim_city", to: "dim_venue", key: "city_sk" }, { from: "dim_venue", to: "dim_screen", key: "venue_sk" }, { from: "dim_screen", to: "dim_show", key: "screen_sk" }, { from: "dim_screen", to: "dim_seat", key: "screen_sk" },
    { from: "dim_date", to: "fact_booking", key: "booking_date_sk" }, { from: "dim_date", to: "fact_payment_attempt", key: "attempt_date_sk" }, { from: "dim_date", to: "fact_partner_settlement", key: "settlement_date_sk" },
    { from: "dim_time", to: "fact_occupancy_snapshot", key: "time_sk" }, { from: "dim_time", to: "fact_discovery_event", key: "time_sk" }, { from: "dim_time", to: "fact_ticket_scan", key: "time_sk" },
    { from: "dim_show", to: "fact_booking", key: "show_sk" }, { from: "dim_show", to: "fact_booking_seat", key: "show_sk" }, { from: "dim_show", to: "fact_hold_attempt", key: "show_sk" }, { from: "dim_show", to: "fact_occupancy_snapshot", key: "show_sk" }, { from: "dim_show", to: "fact_discovery_event", key: "show_sk" }, { from: "dim_show", to: "fact_price_quote", key: "show_sk" }, { from: "dim_show", to: "fact_risk_decision", key: "show_sk" },
    { from: "dim_seat", to: "fact_booking_seat", key: "seat_sk" }, { from: "dim_seat", to: "fact_hold_attempt", key: "seat_sk" }, { from: "dim_seat", to: "fact_cancellation", key: "seat_sk" }, { from: "dim_seat", to: "fact_ticket_scan", key: "seat_sk" },
    { from: "dim_customer", to: "fact_booking", key: "customer_sk" }, { from: "dim_customer", to: "fact_hold_attempt", key: "customer_sk" }, { from: "dim_customer", to: "fact_discovery_event", key: "customer_sk" }, { from: "dim_customer", to: "fact_price_quote", key: "customer_sk" }, { from: "dim_customer", to: "fact_risk_decision", key: "customer_sk" },
    { from: "dim_payment_method", to: "fact_payment_attempt", key: "payment_method_sk" }, { from: "dim_promotion", to: "fact_booking_seat", key: "promotion_sk" }, { from: "dim_promotion", to: "fact_price_quote", key: "promotion_sk" },
    { from: "dim_partner", to: "dim_partner_contract", key: "partner_sk" }, { from: "dim_partner", to: "fact_partner_settlement", key: "partner_sk" }, { from: "dim_partner_contract", to: "fact_partner_settlement", key: "contract_sk" },
    { from: "dim_device", to: "fact_discovery_event", key: "device_sk" }, { from: "dim_device", to: "fact_risk_decision", key: "device_sk" }, { from: "dim_risk_rule", to: "fact_risk_decision", key: "risk_rule_sk" },
    { from: "fact_booking", to: "fact_booking_seat", key: "booking_id" }, { from: "fact_booking", to: "fact_payment_attempt", key: "booking_id" }, { from: "fact_booking", to: "fact_financial_movement", key: "booking_id" }, { from: "fact_booking", to: "fact_cancellation", key: "booking_id" }, { from: "fact_booking", to: "fact_partner_settlement", key: "booking_id" }, { from: "fact_booking", to: "fact_ticket_scan", key: "booking_id" },
  ] as const;

  const [selectedName, setSelectedName] = useState<string>("fact_booking");
  const [zoom, setZoom] = useState(1);
  const tableHeight = (name: string) => {
    const table = tables.find((item) => item.name === name);
    return 45 + (table?.columns.length ?? 0) * 22;
  };
  const selectTable = (name: string) => {
    const table = tables.find((item) => item.name === name);
    if (!table) return;
    setSelectedName(name);
    onExplain({
      group: table.group,
      name: table.name,
      grain: table.grain,
      contents: tableContents[table.name],
      purpose: table.purpose,
      source: table.source,
    });
  };

  return <div className="mt-5">
    <StartSection id="model-erd" eyebrow="BookMyShow analytical model" title="One ER diagram for every fact and dimension" subtitle="Hover or focus a table to highlight its joins and explain its grain, source, and use.">
      <div className="mt-3 overflow-hidden rounded-2xl border border-[#c8c8c8] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d2d2d2] bg-[#ededed] px-3 py-2">
          <div className="flex items-center gap-4 text-[10px] font-semibold text-[#555]"><span><b className="text-[#111]">12</b> facts</span><span><b className="text-[#111]">14</b> dimensions</span><span className="hidden sm:inline">Lines are warehouse joins</span></div>
          <div className="flex items-center gap-2">
            <span className="min-w-12 text-center font-mono text-[9px] font-bold text-[#555]">{Math.round(zoom * 100)}%</span>
            <input type="range" min={1} max={1.4} step={.01} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} aria-label="ER diagram zoom" className="w-24 cursor-pointer accent-[#111]" />
            <button type="button" onClick={() => setZoom((value) => Math.max(1, Number((value - .08).toFixed(2))))} aria-label="Zoom out ER diagram" className="h-7 w-7 rounded-full border border-[#bbb] bg-white text-sm font-bold">−</button>
            <button type="button" onClick={() => setZoom(1)} className="h-7 rounded-full border border-[#bbb] bg-white px-2.5 text-[9px] font-bold">RESET</button>
            <button type="button" onClick={() => setZoom((value) => Math.min(1.4, Number((value + .08).toFixed(2))))} aria-label="Zoom in ER diagram" className="h-7 w-7 rounded-full border border-[#bbb] bg-white text-sm font-bold">+</button>
          </div>
        </div>

        <div className="max-h-[1000px] overflow-auto bg-[#f4f4f4] p-1.5">
          <div style={{ width: String(zoom * 100) + "%", minWidth: "100%", transition: "width 180ms ease" }}>
            <svg viewBox="0 0 1360 830" role="group" aria-label="BookMyShow fact and dimension entity relationship diagram" className="block h-auto w-full">
              <rect width="1360" height="830" rx="18" fill="#f4f4f4" />
              <rect x="35" y="135" width="1290" height="170" rx="15" fill="#ededed" stroke="#d3d3d3" />
              <rect x="35" y="325" width="1290" height="170" rx="15" fill="#e8e8e8" stroke="#d0d0d0" />
              <rect x="35" y="515" width="1290" height="170" rx="15" fill="#ededed" stroke="#d3d3d3" />
              <text x="50" y="148" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#666">BOOKING + INVENTORY FACTS</text>
              <text x="50" y="338" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#666">PAYMENT + MONEY FACTS</text>
              <text x="50" y="528" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#666">DISCOVERY + RISK FACTS</text>

              <g fill="none">
                {relationships.map((relationship) => {
                  const from = layout.find((node) => node.name === relationship.from);
                  const to = layout.find((node) => node.name === relationship.to);
                  if (!from || !to) return null;
                  const fromX = from.x + from.width / 2;
                  const fromY = from.y + tableHeight(from.name) / 2;
                  const toX = to.x + to.width / 2;
                  const toY = to.y + tableHeight(to.name) / 2;
                  const middleY = (fromY + toY) / 2;
                  const active = relationship.from === selectedName || relationship.to === selectedName;
                  return <path key={relationship.from + relationship.to + relationship.key} d={["M", fromX, fromY, "C", fromX, middleY, toX, middleY, toX, toY].join(" ")} stroke={active ? "#111" : "#b9b9b9"} strokeWidth={active ? 2.4 : 1.1} strokeDasharray={active ? "0" : "5 5"} opacity={active ? .9 : .42} />;
                })}
              </g>

              <g fontFamily="inherit">
                {layout.map((node) => {
                  const table = tables.find((item) => item.name === node.name);
                  if (!table) return null;
                  const active = selectedName === table.name;
                  const height = tableHeight(table.name);
                  const fact = table.group === "Fact";
                  return <g key={table.name} role="button" tabIndex={0} aria-label={table.name + ". " + table.grain} aria-pressed={active} onMouseEnter={() => selectTable(table.name)} onFocus={() => selectTable(table.name)} onClick={() => selectTable(table.name)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectTable(table.name); } }} className="cursor-pointer outline-none">
                    <rect x={node.x} y={node.y} width={node.width} height={height} rx="9" fill={active ? "#d8d8d8" : fact ? "#f8f8f8" : "#fff"} stroke={active ? "#111" : fact ? "#777" : "#aaa"} strokeWidth={active ? 2.4 : 1.1} />
                    {fact ? <rect x={node.x} y={node.y} width="6" height={height} rx="3" fill="#555" /> : null}
                    <rect x={node.x + (fact ? 6 : 0)} y={node.y} width={node.width - (fact ? 6 : 0)} height="37" rx="8" fill={active ? "#cfcfcf" : fact ? "#e5e5e5" : "#f1f1f1"} />
                    <text x={node.x + 10} y={node.y + 13} fontSize="7.5" fontWeight="700" letterSpacing="1.2" fill="#666">{table.group.toUpperCase()}</text>
                    <text x={node.x + 10} y={node.y + 29} fontSize={fact ? "13.5" : "12.5"} fontWeight="700" fill="#111">{table.name}</text>
                    {table.columns.map((column, index) => <g key={column}><line x1={node.x + 7} x2={node.x + node.width - 7} y1={node.y + 41 + index * 22} y2={node.y + 41 + index * 22} stroke="#dedede" /><text x={node.x + 10} y={node.y + 57 + index * 22} fontSize="11.5" fontWeight="500" fill="#444">{column}</text></g>)}
                  </g>;
                })}
              </g>
            </svg>
          </div>
        </div>

      </div>
    </StartSection>
  </div>;
}

function BatchLakehouse() {
  const lakehouseComponents = [
    { code: "KAFKA", title: "Domain event topics", short: "Committed inventory, booking, payment, catalog, and client events.", input: "Transactional outbox events and validated client batches.", action: "Keep topic, partition, offset, key, schema ID, headers, and timestamps attached to every record so downstream replay has a precise boundary.", output: "Ordered per-key event streams with bounded Kafka retention.", guardrail: "Kafka is transport and recent replay—not the permanent archive or seat authority.", example: "A booking_confirmed event stays keyed by booking_id while inventory changes retain the show or seat ordering required by their consumer." },
    { code: "CDC", title: "Database CDC + outbox", short: "Source-ordered changes from booking, payment, inventory, and catalog databases.", input: "Committed database rows, outbox rows, source transaction IDs, and log positions.", action: "Take an initial consistent snapshot, continue from the database log without a gap, and retain deletes or tombstones when the dataset requires them.", output: "Replayable source changes with commit order and source position.", guardrail: "A later-arriving older update must never overwrite a newer state; compare source version or commit order before merging.", example: "A show update arriving after a newer catalog version is preserved in history but cannot replace the current show record." },
    { code: "FILES", title: "Partner and settlement files", short: "Gateway statements, partner adjustments, and controlled reference files.", input: "Signed or checksummed files with source date, provider ID, contract version, and delivery manifest.", action: "Validate file identity, schema, checksum, expected date, and duplicate delivery before admitting the file to the pipeline.", output: "Auditable raw finance and partner evidence.", guardrail: "Files may arrive late or be resent. Use stable source IDs and never treat arrival time as the business transaction time.", example: "A gateway settlement statement is retained independently so captured and refunded amounts can be reconciled with BookMyShow's ledger." },
    { code: "ARCHIVE", title: "Raw archiver", short: "Copies exact source records and proves which ranges are safely stored.", input: "Kafka records, CDC positions, and validated external files.", action: "Buffer records into healthy object sizes, write immutable objects, verify checksums and readable schemas, then advance the last fully archived offset for each partition.", output: "Immutable objects plus batch manifests, checksums, and complete offset ranges.", guardrail: "Mark an offset complete only after the object commit and validation succeed. Retry overlap is acceptable because Silver deduplicates it.", example: "If inventory partition 42 archives offsets 8,000–9,999, the manifest is committed only after that object can be read and its checksum matches." },
    { code: "BRONZE", title: "Bronze Iceberg tables", short: "Lossless, discoverable raw history for replay.", input: "Verified immutable objects and their archive manifests.", action: "Register raw records with source metadata and partition primarily by topic and ingest date so late or incorrect event timestamps cannot hide replay data.", output: "bronze.inventory_events, bronze.booking_events, bronze.payment_events, bronze.client_events, and source-file tables.", guardrail: "Bronze is not a dashboard layer. Do not sample critical events, overwrite source payloads, or partition by high-cardinality customer and seat IDs.", example: "A duplicate booking event can exist in Bronze after an archive retry; its original payload and offset remain available for investigation." },
    { code: "SILVER", title: "Silver validation", short: "Turns raw records into typed, deduplicated, privacy-safe entities.", input: "Bronze events, CDC history, recorded schema IDs, and approved reference mappings.", action: "Parse with the recorded schema, validate required fields, deduplicate event IDs, apply source order, normalize timestamps and paise, tokenize identity, and deterministically merge versions.", output: "silver_booking_events, silver_payment_events, silver_holds, silver_catalog_history, silver_client_events, and silver_financial_movements.", guardrail: "Keep original offsets and source IDs on trusted rows. Invalid records move to quarantine with a reason instead of disappearing.", example: "Two copies of payment_authorized with the same event_id produce one Silver event while both raw Kafka records remain in Bronze." },
    { code: "REPAIR", title: "Quarantine + repair", short: "Contains invalid data without silently losing evidence.", input: "Rows rejected for schema, required-key, timestamp, currency, privacy, or source-order failures.", action: "Store the failing payload reference, reason, owning producer, source range, and repair status; replay only the affected slice after the cause is fixed.", output: "Auditable quarantine records and a bounded Silver repair input.", guardrail: "Critical data is never silently dropped. Gold publication remains blocked when the rejected slice can change booking, seat, or money totals.", example: "A payment event with an invalid currency unit waits in quarantine until the producer mapping is corrected and the exact offsets are replayed." },
    { code: "MODEL", title: "Facts + historical dimensions", short: "Applies exact grains and sale-time context before aggregation.", input: "Trusted Silver entities plus show, venue, seat, promotion, customer, and contract history.", action: "Build immutable facts at booking, seat, payment, and movement grain; resolve dimension versions that were effective when the event happened.", output: "Trusted fact tables and SCD history ready for consistent reuse.", guardrail: "Do not join every fact to today's catalog row. Later venue, promotion, or partner-contract changes must not rewrite yesterday's economics.", example: "A partner settlement line uses the commission contract active when the booking was confirmed, even if the partner contract changes next month." },
    { code: "GOLD", title: "Gold data products", short: "Creates named outputs with one owner, grain, consumer, and freshness promise.", input: "Trusted facts and point-in-time dimensions.", action: "Aggregate only to declared grains and version the business rules used for booking funnels, occupancy, settlement, and training features.", output: "gold_booking_daily, gold_funnel_daily, gold_occupancy_snapshot, gold_partner_settlement, and gold_training_features.", guardrail: "Gold is official business truth only after its release checks pass; Silver being clean does not automatically make a metric certified.", example: "gold_partner_settlement is built daily at partner, settlement period, and version grain—not from a live booking counter." },
    { code: "GATE", title: "Quality + reconciliation gate", short: "Blocks incorrect Gold before any consumer sees it.", input: "Candidate Gold snapshot, trusted facts, inventory capacity, internal ledger, gateway statement, and partner obligation.", action: "Compare booking and seat counts, enforce sold plus held not exceeding capacity, check duplicate and null thresholds, and reconcile money across independent sources.", output: "Pass/fail decision, exception report, owner approval, and reconciliation evidence.", guardrail: "A material seat or money mismatch blocks publication. Consumers continue reading the last certified snapshot instead of partial new data.", example: "If gateway captures exceed confirmed booking movements, partner settlement stays unpublished and the difference becomes an owned exception." },
    { code: "COMMIT", title: "Atomic Iceberg publish", short: "Makes one validated version visible and keeps rollback available.", input: "Approved Gold files, quality results, run ID, code version, and previous published snapshot.", action: "Commit the new Iceberg snapshot through one supported catalog, retry safe write conflicts, record lineage, and notify downstream refresh jobs only after success.", output: "Certified snapshot ID, catalog metadata, lineage, notification, and rollback point.", guardrail: "Never expose half-written partitions or overwrite trusted Gold in place. Snapshot retention follows the approved recovery and audit horizon.", example: "All booking-daily partitions for the run become visible together; a failed commit leaves dashboards on the previous certified snapshot." },
    { code: "BI", title: "Trino + BI", short: "Serves governed historical analysis and operational reporting.", input: "Certified Gold tables and approved Silver detail for engineering investigation.", action: "Expose documented metrics through governed SQL views, access policies, and freshness labels rather than letting each dashboard rebuild definitions.", output: "Product, operations, and leadership dashboards with a visible data-as-of time.", guardrail: "BI never reads live seat ownership from the lakehouse and should not query raw Bronze for official metrics.", example: "City-by-show conversion reads gold_funnel_daily while a support investigation can use restricted Silver booking history." },
    { code: "FIN", title: "Finance T+1", short: "Uses reconciled data for settlement and auditable exceptions.", input: "Certified settlement Gold, internal ledger, gateway evidence, partner contract, and exception status.", action: "Release payable obligations only after reconciliation; retain source IDs, rule version, approver, and adjustments for audit.", output: "Approved partner payout file or a held, owned exception.", guardrail: "Finance never pays from a live dashboard, provisional aggregate, or unreconciled gateway callback.", example: "A late refund creates a signed adjustment and can hold the affected partner payout until the settlement version balances." },
    { code: "ML", title: "Point-in-time ML snapshots", short: "Creates reproducible training data without future leakage.", input: "Certified historical facts, dimensions resolved at event time, labels, and an explicit feature cutoff.", action: "Freeze the entity set, feature definitions, label window, source snapshot IDs, and code version used for each training release.", output: "Versioned training snapshot that can be rebuilt exactly.", guardrail: "A feature must use only information available before its prediction time; late corrections create a new version rather than mutating the old training set.", example: "A demand model trained for Friday cannot use bookings or refunds that occurred after the Friday feature cutoff." },
    { code: "AIRFLOW", title: "Airflow run control", short: "Coordinates readiness, retries, schedules, and controlled backfills.", input: "Expected source ranges, dependency states, SLAs, owner policies, and rerun parameters.", action: "Run archive verification, Bronze registration, Silver merge, dimension history, Gold build, quality gate, publish, and notification as idempotent steps.", output: "Run status with input ranges, row counts, code version, retries, and final snapshot ID.", guardrail: "Hourly product data and daily finance settlement use separate schedules and release policies; one late source must not publish an incomplete window.", example: "The finance DAG waits for the gateway statement and ledger close, while hourly funnel Gold can follow its own completeness rule." },
    { code: "LINEAGE", title: "Catalog + lineage", short: "Shows what produced a table and who is allowed to trust it.", input: "Schemas, owners, run metadata, source offsets, Iceberg snapshot IDs, quality results, and consumer registrations.", action: "Connect each published column and metric back to its source, transformation version, owner, classification, and known consumers.", output: "Searchable ownership, impact analysis, audit trail, and deletion or retention scope.", guardrail: "A catalog documents lineage; it does not by itself prove that two query engines share identical table semantics or access rules.", example: "An analyst can trace partner_payable_paise from the Gold mart through the settlement job to booking movements and the sale-time contract." },
  ] as const;
  const lakehouseLanes = [
    { code: "01", title: "Sources", note: "Durable inputs", nodes: [0, 1, 2] },
    { code: "02", title: "Preserve", note: "Replayable evidence", nodes: [3, 4] },
    { code: "03", title: "Trust", note: "Reusable truth", nodes: [5, 6, 7] },
    { code: "04", title: "Certify", note: "Official products", nodes: [8, 9, 10] },
    { code: "05", title: "Consume", note: "Purpose-built reads", nodes: [11, 12, 13] },
  ] as const;
  const [layer, setLayer] = useState(3);
  const selectedLayer = lakehouseComponents[layer];
  const products = [
    { table: "gold_booking_daily", title: "Daily booking performance", question: "How many bookings and seats were confirmed, and what ticket value did they represent?", grain: "One row per business date × city × show × booking channel.", refresh: "Hourly, then finalized daily", consumer: "Product and sales operations", builtFrom: "fact_booking + fact_booking_seat with date, city, show, and channel dimensions.", use: "Compare show sales, channel conversion, confirmed seats, and customer-paid value without mixing booking grain with seat grain.", check: "Confirmed booking IDs must be unique; seat-line counts and amounts must reconcile to the confirmed booking facts.", example: "For a Mumbai 7:30 PM show, the product team can compare app and web bookings while still counting a three-seat booking once as a booking and three times as seats." },
    { table: "gold_funnel_daily", title: "Discovery-to-booking funnel", question: "Where do customers leave the journey from search to a confirmed booking?", grain: "One row per date × show × channel × experiment cohort.", refresh: "Hourly and daily", consumer: "Growth and product", builtFrom: "fact_discovery_event joined to confirmed bookings using the approved attribution window.", use: "Measures search, impression, seat-map open, checkout, and booking conversion using one governed funnel definition.", check: "Event coverage, duplicate rate, telemetry sampling, attribution window, and experiment assignment must be published with the metric.", example: "BookMyShow can see whether a blockbuster lost users at seat-map open or during payment instead of treating every missing booking as the same problem." },
    { table: "gold_occupancy_snapshot", title: "Show occupancy trend", question: "How quickly is each show filling, and how many seats remain by price band?", grain: "One row per show × snapshot minute × price band.", refresh: "Every few minutes; hourly history", consumer: "On-sale operations", builtFrom: "fact_occupancy_snapshot reconciled with show capacity and ordered inventory changes.", use: "Tracks available, held, and sold seats through a hot sale so operations can detect unusual hold pressure or stale projections.", check: "Available + held + sold must equal sellable capacity, and held + sold can never exceed capacity.", example: "During a popular concert launch, operations can distinguish genuine sales from a surge of temporary holds that will soon expire." },
    { table: "gold_partner_settlement", title: "Partner settlement", question: "How much does BookMyShow owe each cinema or organiser after commission, tax, refunds, and adjustments?", grain: "One row per partner × settlement period × settlement version.", refresh: "Daily, released at T+1", consumer: "Finance and partner operations", builtFrom: "Booking-seat facts, signed financial movements, sale-time partner contracts, gateway statements, and partner adjustments.", use: "Creates the auditable payable amount used for partner settlement; it is separate from customer-paid value and platform revenue.", check: "Booking ledger, gateway capture or refund, and partner obligation must reconcile before the version is approved.", example: "A refund received after the first calculation creates a new settlement version with an explicit adjustment instead of rewriting the original sale." },
    { table: "gold_training_features", title: "Point-in-time training features", question: "What customer, show, and demand signals were actually available when a prediction would have been made?", grain: "One row per model entity × feature cutoff time × feature-set version.", refresh: "Daily", consumer: "Machine-learning training", builtFrom: "Certified facts and historical dimensions resolved strictly before the feature cutoff.", use: "Builds reproducible training data for demand, discovery, or risk models without using information from the future.", check: "Feature time must be before prediction time, labels must follow the defined observation window, and source snapshot IDs must be pinned.", example: "A Friday demand feature cannot include bookings or cancellations that happened after Friday's prediction cutoff." },
  ] as const;
  const icebergSteps = [
    { code: "01", title: "Write + compact files", summary: "Spark writes columnar data and combines tiny files into efficient partitions.", action: "Write Parquet files for only the affected event or business-date partitions. Compact excessive small files without changing the logical rows.", example: "A blockbuster launch may create thousands of small hourly booking files; BookMyShow compacts that date and show bucket before BI scans it repeatedly.", rule: "Use event or business date as the primary partition and optionally bucket show_id for large tables. Never partition directly by customer or seat.", risk: "Too many tiny files increase metadata work, slow Trino scans, and make every later snapshot more expensive." },
    { code: "02", title: "Commit one snapshot", summary: "The catalog atomically switches the table to a complete new version.", action: "After every data file is ready, commit one Iceberg metadata snapshot that references the complete file set. Retry catalog conflicts safely.", example: "All corrected gold_booking_daily partitions become visible together; dashboards never see half the cities updated and half still old.", rule: "Use one supported catalog and expose data only after the metadata commit succeeds. A failed commit leaves readers on the previous snapshot.", risk: "Publishing files directly or partially can make readers combine incomplete versions and report inconsistent booking totals." },
    { code: "03", title: "Read a pinned version", summary: "Trino, Spark, and audits read a named snapshot rather than an accidental mix of files.", action: "Normal readers use the current certified snapshot; reproducible jobs pin a snapshot ID so their input cannot change during the run.", example: "A settlement investigation reruns against the exact snapshot used for yesterday's payout even if today's refund corrections are already published.", rule: "Configure every engine against compatible Iceberg catalog semantics and record the snapshot ID in job and dashboard lineage.", risk: "Without a pinned snapshot, a long-running job may compare data from different table versions and produce results that cannot be reproduced." },
    { code: "04", title: "Keep rollback history", summary: "Recent snapshots remain available for audit, comparison, and safe rollback.", action: "Retain previous certified snapshots for the approved recovery and audit window, and ensure running jobs are not using a snapshot before removing it.", example: "If a new funnel transformation is wrong, BookMyShow can keep dashboards on the last good Gold snapshot while the affected dates are rebuilt.", rule: "Retention differs by product and policy; snapshot history is useful evidence but is not free permanent storage.", risk: "Removing history too early destroys rollback and audit options; retaining everything forever creates uncontrolled storage and metadata growth." },
    { code: "05", title: "Expire old snapshots", summary: "Remove metadata references that are outside the approved retention window.", action: "Expire only snapshots older than policy allows after checking rollback needs, legal holds, pinned jobs, and downstream consumers.", example: "Old occupancy snapshots can follow a shorter analytical rollback window than finance settlement snapshots that require longer audit evidence.", rule: "Snapshot expiration is a governed maintenance job with dry-run evidence, owner approval, and metrics for retained snapshots and bytes.", risk: "An aggressive expiry can break audits or running jobs; no expiry leaves metadata and old files growing without bound." },
    { code: "06", title: "Remove orphan files", summary: "Delete files that no live snapshot references—but only after a safety check.", action: "Compare object-storage files with catalog references and delete only sufficiently old files proven to be unreferenced by any retained snapshot or in-flight commit.", example: "Files left by a failed BookMyShow Gold write can be cleaned later after the catalog proves that no published booking snapshot uses them.", rule: "Run orphan cleanup after snapshot checks with a conservative age threshold. Never delete by filename pattern or folder age alone.", risk: "Deleting a referenced or in-flight file corrupts the table; skipping cleanup leaves failed-write files accumulating indefinitely." },
  ] as const;
  const backfillSteps = [
    { code: "01", title: "Contain the bad output", summary: "Stop the faulty version from reaching more consumers.", action: "Pause the affected Gold publication and downstream refreshes. Keep dashboards and exports on the last certified snapshot while the repair runs.", example: "If partner settlement double-counts refunds, BookMyShow blocks the new settlement version before any payout file is released.", evidence: "Incident ID, affected product, current certified snapshot, blocked candidate snapshot, owner, and detection time.", boundary: "Contain analytical output only. Do not pause the booking database or alter confirmed seats unless the source system itself is wrong." },
    { code: "02", title: "Bound the affected slice", summary: "Identify exactly what must be corrected instead of rebuilding everything.", action: "Find the affected tables, business dates, shows or partners, source partitions and offsets, transformation version, and impacted consumers.", example: "A bug introduced on 12 September affected only Bengaluru booking rows written by job version 4.8, so other dates and cities stay untouched.", evidence: "Date and partition range, topic offsets, show or partner IDs, code version, row counts, and consumer impact list.", boundary: "Do not guess a broad date range. An explicit scope makes the repair cheaper, faster, and easier to prove complete." },
    { code: "03", title: "Pin replay evidence", summary: "Freeze the exact inputs and old outputs needed for a reproducible repair.", action: "Record immutable raw objects or Kafka offsets, Bronze and Silver snapshot IDs, dimension versions, the previous Gold snapshot, and the corrected code version.", example: "A booking repair pins the raw booking and payment offsets plus the show and promotion versions that were valid when those bookings occurred.", evidence: "Input manifests, checksums, snapshot IDs, schema IDs, dimension cutoffs, code commit, and configuration hash.", boundary: "Never replay from moving 'latest' inputs. The same repair must produce the same result when rerun." },
    { code: "04", title: "Recompute in isolation", summary: "Build corrected Silver and Gold data where consumers cannot see it.", action: "Run the fixed logic into staging tables or a separate Iceberg branch, deduplicate with stable keys, respect source order, and resolve dimensions at event time.", example: "BookMyShow rebuilds the affected booking-seat facts and settlement rows in staging without changing the currently published Gold tables.", evidence: "Repair run ID, input-to-output counts, duplicate counts, quarantine rows, task logs, and staging snapshot ID.", boundary: "Historical events are evidence, not commands. The repair must not charge a card, issue a refund, release a seat, mint a ticket, or resend a notification." },
    { code: "05", title: "Validate and reconcile", summary: "Prove the correction is complete and did not create a second error.", action: "Compare staged output with source truth and the previous version using row counts, unique keys, seat-capacity rules, booking-to-seat totals, and finance reconciliation.", example: "For settlement, internal ledger movements, gateway captures and refunds, and partner payable amounts must agree before the repair can proceed.", evidence: "Before-and-after metrics, mismatched IDs, seat invariant results, amount and count reconciliation, and accepted exceptions.", boundary: "A material seat or money mismatch blocks the release. 'The job succeeded' is not proof that the data is correct." },
    { code: "06", title: "Approve the replacement", summary: "The accountable owners review the evidence before publication.", action: "Data engineering confirms technical checks, the product owner confirms metric meaning, and finance approves any settlement or revenue impact.", example: "A funnel correction may need product approval; a partner-payable correction also requires finance approval before the new version is certified.", evidence: "Approver identities, decision time, reconciliation report, exception decisions, release notes, and rollback snapshot.", boundary: "Approval is tied to this exact staged snapshot and evidence set; changing the data requires the gate to run again." },
    { code: "07", title: "Publish and monitor", summary: "Atomically replace the bad version and watch downstream recovery.", action: "Commit one corrected Iceberg snapshot, update lineage, refresh affected serving outputs, notify consumers, and monitor totals and freshness against the expected result.", example: "Corrected gold_partner_settlement becomes visible in one snapshot; finance is notified and the earlier snapshot remains available for rollback.", evidence: "Published snapshot ID, lineage, notification list, refreshed consumers, post-publish checks, and rollback deadline.", boundary: "Use an atomic swap or merge—never edit published files in place. Roll back immediately if post-publish validation diverges." },
  ] as const;
  const [product, setProduct] = useState(0);
  const [icebergStep, setIcebergStep] = useState(0);
  const [backfillStep, setBackfillStep] = useState(0);
  return <div className="mt-5 space-y-5">
    <StartSection id="lakehouse-flow" eyebrow="Lakehouse architecture flow" title="Source evidence → trusted data → certified products" subtitle="Follow BookMyShow data through preservation, validation, modeling, release gates, and purpose-built consumption.">
      <div className="mt-5 overflow-x-auto rounded-2xl border border-[#c8c8c8] bg-[#ededed] p-4">
        <div className="grid min-w-[1120px] grid-cols-[1fr_34px_1fr_34px_1fr_34px_1fr_34px_1fr] items-stretch">
          {lakehouseLanes.map((lane, laneIndex) => <div className="contents" key={lane.title}>
            <section className="flex min-h-[330px] flex-col overflow-hidden rounded-xl border border-[#bdbdbd] bg-white">
              <div className="border-b border-[#d0d0d0] bg-[#111] px-3 py-3 text-white">
                <p className="font-mono text-[8px] font-bold text-white/55">STAGE {lane.code}</p>
                <h3 className="mt-1 text-sm font-semibold">{lane.title}</h3>
                <p className="mt-1 text-[9px] text-white/65">{lane.note}</p>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {lane.nodes.map((componentIndex) => {
                  const component = lakehouseComponents[componentIndex];
                  const selected = layer === componentIndex;
                  const sidePath = component.code === "REPAIR";
                  return <button key={component.code} type="button" aria-pressed={selected} onMouseEnter={() => setLayer(componentIndex)} onFocus={() => setLayer(componentIndex)} onClick={() => setLayer(componentIndex)} className={"group flex flex-1 cursor-pointer flex-col justify-center rounded-lg border px-3 py-2.5 text-left transition " + (selected ? "border-[#111] bg-[#dedede] shadow-[inset_4px_0_0_#111]" : sidePath ? "border-dashed border-[#999] bg-[#f4f4f4] hover:border-[#555]" : "border-[#d0d0d0] bg-white hover:border-[#777] hover:bg-[#f5f5f5]")}>
                    <span className="flex items-center justify-between gap-2 font-mono text-[8px] font-bold text-[#666]"><span>{component.code}</span>{sidePath ? <span className="rounded-full border border-[#aaa] px-1.5 py-0.5 text-[7px]">SIDE PATH</span> : null}</span>
                    <strong className="mt-1.5 text-[11px] leading-4 text-[#111]">{component.title}</strong>
                    <span className="mt-1 text-[9px] leading-4 text-[#666]">{component.short}</span>
                  </button>;
                })}
              </div>
            </section>
            {laneIndex < lakehouseLanes.length - 1 ? <div className="flex items-center justify-center"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#aaa] bg-white text-sm font-bold text-[#555]">→</span></div> : null}
          </div>)}
        </div>
        <div className="mt-3 grid min-w-[1120px] gap-2 border-t border-[#c7c7c7] pt-3 md:grid-cols-2">
          {([14, 15] as const).map((componentIndex) => {
            const component = lakehouseComponents[componentIndex];
            const selected = layer === componentIndex;
            return <button key={component.code} type="button" aria-pressed={selected} onMouseEnter={() => setLayer(componentIndex)} onFocus={() => setLayer(componentIndex)} onClick={() => setLayer(componentIndex)} className={"grid cursor-pointer grid-cols-[80px_1fr] items-center rounded-xl border px-3 py-2.5 text-left transition " + (selected ? "border-[#111] bg-white shadow-[inset_4px_0_0_#111]" : "border-[#bbb] bg-[#f7f7f7] hover:border-[#666]")}>
              <span className="font-mono text-[8px] font-bold text-[#555]">{component.code}</span>
              <span><strong className="block text-[11px]">{component.title}</strong><span className="mt-0.5 block text-[9px] text-[#666]">{component.short}</span></span>
            </button>;
          })}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#bdbdbd] bg-white" aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-3 bg-[#111] px-5 py-4 text-white">
          <div><p className="font-mono text-[9px] font-bold text-white/55">{selectedLayer.code} · SELECTED COMPONENT</p><h3 className="mt-1 text-xl font-semibold">{selectedLayer.title}</h3><p className="mt-1 max-w-3xl text-xs leading-5 text-white/70">{selectedLayer.short}</p></div>
          <span className="rounded-full border border-white/25 px-3 py-1.5 font-mono text-[8px] font-bold text-white/75">HOVER OR FOCUS A COMPONENT</span>
        </div>
        <div className="grid gap-px bg-[#d0d0d0] lg:grid-cols-3">
          <div className="bg-[#f4f4f4] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">Receives</p><p className="mt-2 text-xs leading-5 text-[#333]">{selectedLayer.input}</p></div>
          <div className="bg-white p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">What happens</p><p className="mt-2 text-xs leading-5 text-[#333]">{selectedLayer.action}</p></div>
          <div className="bg-[#f4f4f4] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">Produces</p><p className="mt-2 text-xs leading-5 text-[#333]">{selectedLayer.output}</p></div>
        </div>
        <div className="grid border-t border-[#d0d0d0] md:grid-cols-2">
          <div className="border-b border-[#d0d0d0] bg-white p-4 md:border-b-0 md:border-r"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">BookMyShow example</p><p className="mt-2 text-xs leading-5 text-[#333]">{selectedLayer.example}</p></div>
          <div className="bg-[#ededed] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">Interview boundary</p><p className="mt-2 text-xs leading-5 text-[#333]">{selectedLayer.guardrail}</p></div>
        </div>
      </div>
    </StartSection>
    <StartSection id="gold-products" eyebrow="Gold products" title="Official BookMyShow answers—not generic aggregates" subtitle="Select a Gold product to see the question it answers, its exact row grain, how it is built, and what must pass before release.">
      <div className="mt-5 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-[#c8c8c8] bg-white" role="tablist" aria-label="BookMyShow Gold products">{products.map((item, index) => <button key={item.table} type="button" role="tab" aria-selected={product === index} onMouseEnter={() => setProduct(index)} onFocus={() => setProduct(index)} onClick={() => setProduct(index)} className={`block w-full cursor-pointer border-b border-[#ddd] px-4 py-3 text-left last:border-b-0 ${product === index ? 'bg-[#dedede] shadow-[inset_4px_0_0_#111]' : 'bg-white hover:bg-[#f5f5f5]'}`}><span className="font-mono text-[8px] font-bold text-[#666]">{item.table}</span><strong className="mt-1 block text-sm">{item.title}</strong><span className="mt-1 block text-[10px] leading-4 text-[#666]">{item.question}</span></button>)}</div>
        <div className="overflow-hidden rounded-2xl border border-[#bdbdbd] bg-white" aria-live="polite">
          <div className="bg-[#111] px-5 py-4 text-white"><p className="font-mono text-[9px] font-bold text-white/55">{products[product].table}</p><h3 className="mt-1 text-xl font-semibold">{products[product].title}</h3><p className="mt-2 text-xs leading-5 text-white/75">{products[product].question}</p></div>
          <div className="grid gap-px bg-[#d0d0d0] md:grid-cols-3"><div className="bg-[#f4f4f4] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">One row means</p><p className="mt-2 text-xs leading-5">{products[product].grain}</p></div><div className="bg-white p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">Refresh + consumer</p><p className="mt-2 text-xs leading-5"><strong>{products[product].refresh}</strong><br />{products[product].consumer}</p></div><div className="bg-[#f4f4f4] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">Built from</p><p className="mt-2 text-xs leading-5">{products[product].builtFrom}</p></div></div>
          <div className="grid border-t border-[#d0d0d0] md:grid-cols-2"><div className="border-b border-[#d0d0d0] p-4 md:border-b-0 md:border-r"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">How BookMyShow uses it</p><p className="mt-2 text-xs leading-5">{products[product].use}</p><p className="mt-3 rounded-lg bg-[#ededed] p-3 text-[11px] leading-5"><strong>Example:</strong> {products[product].example}</p></div><div className="bg-[#ededed] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">Release checks</p><p className="mt-2 text-xs leading-5">{products[product].check}</p><p className="mt-3 border-l-2 border-[#111] pl-3 text-[11px] leading-5 text-[#555]">If this check fails, keep the previous certified Gold snapshot visible and hold this version for repair.</p></div></div>
        </div>
      </div>
    </StartSection>
    <StartSection id="iceberg-lifecycle" eyebrow="Iceberg lifecycle" title="Files become a table only through a safe snapshot lifecycle" subtitle="Follow one BookMyShow table from efficient files to atomic publication, reproducible reads, retention, and safe cleanup.">
      <div className="mt-5 border-l-4 border-[#111] bg-[#ededed] px-4 py-3 text-xs leading-5"><strong>Core idea:</strong> Parquet files may exist in object storage, but readers see only the files referenced by the current Iceberg snapshot.</div>
      <div className="mt-4 overflow-x-auto pb-2"><div className="flex min-w-[980px] items-stretch">{icebergSteps.map((item, index) => <div className="contents" key={item.code}><button type="button" aria-pressed={icebergStep === index} onMouseEnter={() => setIcebergStep(index)} onFocus={() => setIcebergStep(index)} onClick={() => setIcebergStep(index)} className={`min-h-32 flex-1 cursor-pointer rounded-xl border px-3 py-3 text-left transition ${icebergStep === index ? 'border-[#111] bg-[#dedede] shadow-[inset_0_4px_0_#111]' : 'border-[#c7c7c7] bg-white hover:border-[#777] hover:bg-[#f5f5f5]'}`}><span className="font-mono text-[8px] font-bold text-[#666]">STEP {item.code}</span><strong className="mt-2 block text-xs leading-4">{item.title}</strong><span className="mt-2 block text-[9px] leading-4 text-[#666]">{item.summary}</span></button>{index < icebergSteps.length - 1 ? <span className="flex w-8 shrink-0 items-center justify-center text-[#666]">→</span> : null}</div>)}</div></div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-[#bdbdbd] bg-white" aria-live="polite"><div className="flex items-start justify-between gap-3 bg-[#111] px-5 py-4 text-white"><div><p className="font-mono text-[9px] font-bold text-white/55">ICEBERG STEP {icebergSteps[icebergStep].code}</p><h3 className="mt-1 text-xl font-semibold">{icebergSteps[icebergStep].title}</h3></div><span className="rounded-full border border-white/25 px-3 py-1.5 text-[9px] font-bold text-white/70">{icebergStep + 1} / {icebergSteps.length}</span></div><div className="grid gap-px bg-[#d0d0d0] md:grid-cols-2"><div className="bg-white p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">What happens</p><p className="mt-2 text-xs leading-5">{icebergSteps[icebergStep].action}</p></div><div className="bg-[#f4f4f4] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">BookMyShow example</p><p className="mt-2 text-xs leading-5">{icebergSteps[icebergStep].example}</p></div><div className="bg-[#ededed] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">Safety rule</p><p className="mt-2 text-xs leading-5">{icebergSteps[icebergStep].rule}</p></div><div className="bg-white p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">If skipped or done badly</p><p className="mt-2 text-xs leading-5">{icebergSteps[icebergStep].risk}</p></div></div></div>
    </StartSection>
    <StartSection id="backfill" eyebrow="Controlled correction" title="Keep consumers stable while the repair runs separately" subtitle="A BookMyShow backfill replaces derived analytical data; it never repeats booking, payment, seat, or customer side effects.">
      <div className="mt-5 grid gap-3 lg:grid-cols-[190px_minmax(0,1fr)]">
        <div className="flex flex-col justify-center rounded-2xl bg-[#111] p-4 text-white"><p className="font-mono text-[8px] font-bold text-white/55">TRIGGER</p><h3 className="mt-2 text-base font-semibold">Incorrect Gold detected</h3><p className="mt-2 text-[10px] leading-5 text-white/70">Bad code, late evidence, or a reconciliation mismatch affects a known product and period.</p></div>
        <div className="grid gap-2">
          <div className="grid items-center overflow-hidden rounded-xl border border-[#bdbdbd] bg-white md:grid-cols-[170px_1fr_34px_1fr]"><div className="bg-[#dedede] px-4 py-3"><p className="font-mono text-[8px] font-bold text-[#666]">STABLE CONSUMER LANE</p><strong className="mt-1 block text-xs">What users keep reading</strong></div><div className="px-4 py-3 text-xs font-semibold">Last certified Gold snapshot</div><span className="text-center text-[#666]">→</span><div className="px-4 py-3 text-[11px] leading-5 text-[#555]">Dashboards, finance, and ML stay on known-good data until the replacement passes every gate.</div></div>
          <div className="grid items-center overflow-hidden rounded-xl border border-[#bdbdbd] bg-[#ededed] md:grid-cols-[170px_1fr_34px_1fr]"><div className="bg-[#cfcfcf] px-4 py-3"><p className="font-mono text-[8px] font-bold text-[#555]">ISOLATED REPAIR LANE</p><strong className="mt-1 block text-xs">What engineers rebuild</strong></div><div className="px-4 py-3 text-xs font-semibold">Pinned evidence + corrected code</div><span className="text-center text-[#666]">→</span><div className="px-4 py-3 text-[11px] leading-5 text-[#555]">Staging Silver and Gold are compared, approved, and atomically published without touching the live version.</div></div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto pb-2"><div className="flex min-w-[1120px] items-stretch">{backfillSteps.map((item, index) => <div className="contents" key={item.code}><button type="button" aria-pressed={backfillStep === index} onMouseEnter={() => setBackfillStep(index)} onFocus={() => setBackfillStep(index)} onClick={() => setBackfillStep(index)} className={`min-h-32 flex-1 cursor-pointer rounded-xl border px-3 py-3 text-left transition ${backfillStep === index ? 'border-[#111] bg-[#dedede] shadow-[inset_0_4px_0_#111]' : 'border-[#c7c7c7] bg-white hover:border-[#777] hover:bg-[#f5f5f5]'}`}><span className="font-mono text-[8px] font-bold text-[#666]">STEP {item.code}</span><strong className="mt-2 block text-xs leading-4">{item.title}</strong><span className="mt-2 block text-[9px] leading-4 text-[#666]">{item.summary}</span></button>{index < backfillSteps.length - 1 ? <span className="flex w-7 shrink-0 items-center justify-center text-[#666]">→</span> : null}</div>)}</div></div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-[#bdbdbd] bg-white" aria-live="polite"><div className="flex items-center justify-between gap-3 bg-[#111] px-4 py-2.5 text-white"><div className="flex min-w-0 items-baseline gap-3 whitespace-nowrap"><span className="shrink-0 font-mono text-[8px] font-bold text-white/55">CORRECTION {backfillSteps[backfillStep].code}</span><h3 className="shrink-0 text-sm font-semibold">{backfillSteps[backfillStep].title}</h3><span className="truncate text-[10px] text-white/65">{backfillSteps[backfillStep].summary}</span></div><span className="shrink-0 rounded-full border border-white/25 px-2.5 py-1 text-[8px] font-bold text-white/70">{backfillStep + 1}/{backfillSteps.length}</span></div><div className="grid gap-px bg-[#d0d0d0] md:grid-cols-3"><div className="bg-white p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">What happens</p><p className="mt-2 text-xs leading-5">{backfillSteps[backfillStep].action}</p></div><div className="bg-[#f4f4f4] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">BookMyShow example</p><p className="mt-2 text-xs leading-5">{backfillSteps[backfillStep].example}</p></div><div className="bg-[#ededed] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#666]">Evidence retained</p><p className="mt-2 text-xs leading-5">{backfillSteps[backfillStep].evidence}</p></div></div></div>
    </StartSection>
    <StartSection id="batch-boundary" eyebrow="Safety boundary" title="Replay facts, never side effects" subtitle="Analytical history can rebuild data products; it must not repeat customer or payment actions.">
      <div className="mt-5 grid overflow-hidden rounded-2xl border border-[#cfcfcf] md:grid-cols-[1fr_80px_1fr]"><div className="bg-white p-5"><p className="font-mono text-[9px] font-bold text-[#555]">SAFE REPLAY</p><p className="mt-2 text-sm font-semibold">Events → staging tables → compared products</p><p className="mt-2 text-xs leading-6 text-[#555]">Reapply idempotent analytical sinks and compare with authoritative booking and money evidence.</p></div><div className="flex items-center justify-center bg-[#ededed] font-mono text-[10px] font-bold">STOP</div><div className="bg-[#ededed] p-5"><p className="font-mono text-[9px] font-bold text-[#555]">NEVER REISSUE</p><p className="mt-2 text-sm font-semibold">Payment commands or notifications</p><p className="mt-2 text-xs leading-6 text-[#555]">A historical event is evidence—not authorization to charge, refund, mint a ticket, email, SMS, or push again.</p></div></div>
    </StartSection>
  </div>;
}

function GovernanceQuality() {
  const owners = [
    { title: "Producer owner", responsibility: "Own the meaning and completeness of events emitted by one service.", example: "The Booking team proves booking_confirmed matches the committed seats, accepted quote, and booking version.", evidence: "Schema subject, semantic fixtures, release owner, and on-call route." },
    { title: "Data steward", responsibility: "Own the Silver entity and the business definition used downstream.", example: "Define exactly when a booking is confirmed, cancelled, or refunded so Ops, Product, and Finance use one meaning.", evidence: "Grain, field definitions, quality gates, lineage, and retention class." },
    { title: "Product on-call", responsibility: "Respond when freshness, completeness, or business invariants fail.", example: "Trace a stalled city from the service through the Kafka range, pipeline job, and serving product.", evidence: "Alert route, runbook, escalation path, and last drill." },
    { title: "Contract in CI", responsibility: "Stop incompatible structure or meaning before production.", example: "Test multi-seat booking, duplicate callback, late payment, refund, show cancellation, and old/new consumer overlap.", evidence: "Compatibility result, fixture result, schema version, and rollout plan." },
    { title: "Consumers + lineage", responsibility: "Show who reads the data and the path behind every answer.", example: "Trace settlement from payment row and outbox through Kafka offsets, Iceberg snapshot, Gold product, and dashboard.", evidence: "Source position, offsets, job version, snapshot, product version, and consumers." },
  ] as const;
  const [owner, setOwner] = useState(0);

  const gates = [
    { title: "DB + outbox", promise: "Only committed business truth leaves the source.", checks: ["One active owner per show-seat", "Legal AVAILABLE / HELD / SOLD transition", "State and outbox commit together"], example: "A7 and A8 cannot publish booking_confirmed if either seat failed to become SOLD in the transaction.", failure: "Reject or roll back, alert the owning service, and publish nothing.", evidence: "transaction ID + booking version + outbox ID" },
    { title: "CDC + Kafka", promise: "Committed events move without an unsafe gap.", checks: ["Source position advances; WAL headroom is safe", "Outbox age and lag meet the product SLO", "Schema failures, DLQ, and under-replication are visible"], example: "If CDC stalls during a hot on-sale, booking writes remain safe only while WAL and outbox headroom are controlled.", failure: "Protect the booking DB and pause unsafe publication until the source position is proved.", evidence: "source position + topic offsets + connector state" },
    { title: "Raw archive", promise: "Every accepted Kafka range can be replayed.", checks: ["Expected topic-offset ranges exist", "Counts and checksums pass", "Schemas remain readable; encryption and lifecycle apply"], example: "A bad Silver job is rebuilt from the exact archived booking and payment events, not today's service logs.", failure: "Keep the window open, recopy the bounded range, and deduplicate by event_id.", evidence: "manifest + offset range + checksum + schema ID" },
    { title: "Silver", promise: "Events become typed, deduplicated entities.", checks: ["event_id is unique; required keys exist", "Time, order, currency, and status are valid", "PII is tokenized; invalid rows are quarantined"], example: "Two deliveries of one gateway callback create one trusted movement while the duplicate remains auditable.", failure: "Quarantine bad rows, retain the last trusted partition, and route the defect to its producer.", evidence: "input range + quarantine reason + job version" },
    { title: "Gold", promise: "Products satisfy BookMyShow business invariants.", checks: ["Booking totals equal seat-line totals", "Held plus sold never exceeds capacity", "Money balances; sampled rates carry coverage"], example: "Show occupancy is blocked if sold_seats exceeds capacity or cannot trace to confirmed booking seats.", failure: "Block or mark provisional; repair in staging and compare before publishing.", evidence: "snapshot + invariant result + approval + version" },
    { title: "Serving", promise: "Consumers see certified data or an explicit stale state.", checks: ["Last-updated time and total age are visible", "Cache/OLAP matches authoritative samples", "Risk age and query p99 meet the consumer SLO"], example: "A fast control-room dashboard serving yesterday's occupancy is still broken and must show its delay.", failure: "Use the last certified view or disable the stale feature, then assign an owner.", evidence: "served version + freshness + drift sample + incident" },
  ] as const;
  const [gate, setGate] = useState(0);

  const exceptions = [
    ["Timing difference", "Gateway settlement arrives after the internal capture.", "Hold inside the owned window and retry when the statement lands.", "Booking, movement, and gateway IDs agree."],
    ["Missing callback", "The customer paid but no final provider callback arrived.", "Query provider evidence; never infer payment from booking status.", "Recover the provider ID or complete and link the refund."],
    ["Partial refund", "Only selected seats or fees were refunded.", "Match signed refund movements to the capture and booking-seat lines.", "Capture minus linked refunds equals the remaining charge."],
    ["Chargeback", "The provider reverses a previously valid capture.", "Create a separate dispute movement with Finance or Risk ownership.", "Original sale remains; dispute outcome closes the exception."],
    ["Duplicate provider event", "The gateway retries one capture or refund notification.", "Deduplicate provider_event_id and verify one ledger effect.", "One provider event has exactly one financial effect."],
    ["Failed partner payout", "Customer money settled but the venue/organiser transfer failed.", "Keep the obligation open with amount, age, reason, and retry owner.", "Successful payout reference or approved adjustment is linked."],
    ["Tax rounding", "Line-level tax differs by a few paise from the provider total.", "Use the approved minor-unit rule; never hide residuals elsewhere.", "Stored reason proves the booking-level amount balances."],
  ] as const;
  const [exception, setException] = useState(0);

  const signals = [
    ["End-to-end freshness", "p50/p95/p99 age from source commit to the visible version.", "A slow stage despite healthy uptime.", "Ops, demand, or settlement silently uses old data.", "Find the first timestamp jump, freeze publish, and expose stale age."],
    ["CDC + Kafka", "Outbox age, source position, WAL headroom, record/time lag, retries, and under-replication.", "A capture stall, unsafe backlog, or broker risk.", "Committed bookings stop reaching downstream products.", "Protect the DB, preserve position, restore, and verify continuity."],
    ["Streaming jobs", "Watermark lag, checkpoint age/duration, state growth, restarts, and sink latency.", "Flink runs but produces late, incomplete, or replayed results.", "Hot-sale risk and live counters become stale.", "Mark outputs stale, inspect keys/checkpoint, and compare recovery."],
    ["Lakehouse publish", "Raw delay, Iceberg commit failures, snapshot age, small files, and Gold gate status.", "Ingestion succeeded but usable products did not publish.", "Funnels, partner reports, and training versions disagree.", "Pin the certified snapshot, rebuild staging, and re-run gates."],
    ["Seat + hold pressure", "Per-show admission, DB p99, lock conflicts, expiry backlog, and cache drift.", "One hot show overloads authority or leaves false holds.", "Customers see false availability or repeated conflicts.", "Rate-limit by show, preserve DB authority, then reconcile cache."],
    ["Payment + finance", "Callback age, dedupe rate, unmatched amount/count, refund age, and payout age.", "Money disagrees with booking, gateway, or partner obligation.", "Refunds or partner payouts become wrong or late.", "Open a source-linked exception; never force-match totals."],
  ] as const;
  const [signal, setSignal] = useState(0);

  const freshnessStages = [
    { title: "Source commit", meaning: "The server timestamp written when the authoritative booking, seat, payment, or outbox transaction commits. Client-device time is not used for this clock.", example: "For booking_confirmed, T0 is the database commit that makes the booking and its seats durable—not when the customer opened checkout.", proof: "commit_at + transaction ID + outbox ID" },
    { title: "Kafka", meaning: "The point at which CDC has read the committed outbox row and Kafka has durably appended it to a topic partition.", example: "T1 - T0 shows whether a blockbuster on-sale is building CDC or broker delay before Ops can see confirmed bookings.", proof: "source position + topic + partition + offset + broker timestamp" },
    { title: "Raw", meaning: "The original event envelope is copied to object storage with its schema and Kafka coordinates unchanged so it can be replayed.", example: "If an occupancy transform is wrong, BookMyShow can reconstruct the affected show from the exact archived booking events.", proof: "landing_at + file manifest + checksum + offset range" },
    { title: "Silver", meaning: "The event has passed schema, key, time, currency, ordering, deduplication, and privacy checks and is now a trusted entity.", example: "Retried payment callbacks collapse to one movement; invalid records are quarantined instead of silently entering settlement.", proof: "processed_at + event_id + job version + quarantine result" },
    { title: "Gold", meaning: "An owned business product is published only after its grain and BookMyShow invariants pass against the selected Iceberg snapshot.", example: "Show occupancy publishes only when confirmed booking-seat totals agree and sold seats do not exceed screen capacity.", proof: "published_at + snapshot ID + product version + gate result" },
    { title: "Serving", meaning: "The consumer-visible version in a dashboard, API, feature, or export. Its age—not query speed alone—defines freshness.", example: "The control room shows last_updated_at for occupancy; settlement shows the certified business date and product version.", proof: "served_at + last_updated_at + product version + p99 query time" },
  ] as const;
  const [freshnessStage, setFreshnessStage] = useState(0);

  const privacyStages = [
    { title: "Restricted source", contains: "Direct customer identity, booking contact details, raw device identifiers, and provider-controlled payment references remain inside their owning service boundary.", example: "Customer Care may resolve a booking using a phone number, but the shared booking event does not broadcast that phone number.", control: "Encryption, audited service access, separate credentials, and no shared analytical read." },
    { title: "Minimize + tokenize", contains: "An approved identity service replaces direct identity with customer_sk or a rotating device token and carries purpose, consent, and sampling context.", example: "search_submitted can link a funnel through customer_sk without exposing the customer's email to Kafka consumers.", control: "The token map is isolated; consumers cannot reverse a token without a separately approved workflow." },
    { title: "Silver + Gold", contains: "Trusted tables keep only fields required for the product grain; direct PII is removed and sensitive columns receive explicit classification.", example: "City conversion needs city_sk, show_sk, event type, and a token—not name, phone, complete address, or payment secret.", control: "Column masking, row policy, owner approval, retention class, lineage, and access logs." },
    { title: "Serving view", contains: "Each consumer receives a purpose-built view rather than unrestricted access to the underlying table.", example: "Finance sees amounts and provider references; Product sees tokenized funnels; Customer Care sees only the identity needed for a case.", control: "Least privilege, time-bound grants, export controls, audit trail, and deletion propagation." },
  ] as const;
  const [privacyStage, setPrivacyStage] = useState(0);

  const deletionStages = [
    ["Raw copies", "Find the token in eligible raw partitions and apply the approved delete or irreversible anonymization process.", "A customer deletion request must not leave their searchable identity in archived app events.", "request ID + affected partitions + completion manifest"],
    ["Old snapshots", "Expire or rewrite applicable Iceberg snapshots so time travel cannot restore data that should be deleted.", "A corrected current table is insufficient if an older snapshot still exposes the same customer token.", "table + snapshot IDs + retained legal exception"],
    ["Features + cache", "Remove derived customer/device features and evict cached projections that are outside an allowed retention exception.", "Delete stored recommendation or risk features linked to the token and invalidate cached profile views.", "feature keys + cache keys + eviction result"],
    ["Exports", "Locate governed extracts, analyst files, and partner deliveries containing the affected token and revoke or replace them.", "A CSV created for an approved campaign cannot become an unmanaged permanent copy.", "export ID + recipient + deletion/replacement receipt"],
    ["Processors", "Send the scoped request to approved downstream processors and record their response; do not delete records under a documented legal hold.", "A messaging or support processor confirms removal while Finance documents any booking record it must legally retain.", "processor + request date + outcome + exception owner"],
  ] as const;
  const [deletionStage, setDeletionStage] = useState(0);

  const privacyItems = [
    ["Customer identity", "Name, email, and phone stay in the restricted identity/support boundary.", "Pseudonymous customer_sk; no direct email or phone in shared topics.", "Identity service and approved support; analysts receive the token.", "Propagate deletion/restriction through raw links, snapshots, features, caches, and exports."],
    ["Device identity", "Raw device IDs enter only a controlled linkage zone.", "Hashed or rotating device token plus consent and purpose.", "Risk gets approved linkage; Product gets minimized tokens.", "Retention follows risk/consent purpose, not booking-ledger duration."],
    ["Payment reference", "Card secrets stay with the provider or PCI-controlled service.", "Provider token, payment_attempt_id, amount, currency, and status.", "Payments and Finance; Support gets only case fields.", "Regulatory policy governs references; secrets never enter Bronze."],
    ["Behavioral event", "Search, impression, click, and seat-map activity carries consent and sampling.", "Tokenized identity plus minimum event attributes.", "Product and ML through approved row/column policy.", "Expire by behavioral class and propagate deletion to features/exports."],
    ["Booking record", "Authoritative booking keeps only service and legally required identity.", "booking_id, customer_sk, show_sk, status, amounts, and version.", "Purpose-specific Customer Care and Finance views.", "Document legal exceptions; minimize general analytics facts."],
    ["Audit evidence", "Source IDs, versions, access, and approvals stay in a restricted archive.", "Normal products expose only evidence references and status.", "Security, Compliance, and named incident owners.", "Keep for the approved audit period, then prove deletion."],
  ] as const;
  const [privacy, setPrivacy] = useState(0);

  const incidents = [
    ["Redis unavailable", "Seat-map read path: Inventory DB → Redis → customer seat map", "Seat maps slow down and cached risk or availability may be stale; holds and sales still belong to the Inventory DB.", "Route only admitted reads to the DB, reject excess traffic, and stop treating cached TTL or availability as authority.", "Restore Redis and rebuild current show-seat projections from the Inventory DB; never recreate expired holds from stale cache entries.", "Compare AVAILABLE / HELD / SOLD counts for affected shows and prove no expired hold reappeared.", "Redis can accelerate a seat decision but can never create, extend, or confirm seat ownership."],
    ["Kafka unavailable", "Committed outbox → CDC → Kafka → risk, pricing, live Ops, lakehouse", "Bookings can still commit, but fraud, pricing, operations, and analytics signals become progressively older.", "Show data as stale and use conservative risk/pricing rules; continue DB commits only while outbox and WAL capacity remain safe.", "Restore Kafka, resume CDC from its committed source position, and drain the backlog with event_id deduplication.", "Prove there is no source-position or offset gap, then compare affected booking/event counts and outbox age.", "Kafka downtime may delay a committed booking fact; it must not invent or discard one."],
    ["CDC stuck / WAL pressure", "Booking/payment outbox → CDC connector → database WAL or log slot", "Outbox age rises, downstream data stops advancing, and retained WAL threatens booking-database disk and write availability.", "Page immediately, protect DB capacity, and use the tested durable-export contingency before retention headroom is exhausted.", "Restart from the exact source position; if the log range is gone, perform a bounded re-snapshot and deduplicate against archived event IDs.", "Check the last event before the gap, first recovered event, source positions, counts, and critical booking IDs.", "Never discard unarchived booking or payment changes merely to free WAL."],
    ["Flink restart", "Kafka → Flink hot-show jobs → risk and live control-room projections", "Per-show booking velocity, occupancy, payment-failure, or abuse counters freeze while the job restores state.", "Display stale age, fall back to static admission and conservative risk rules, and keep seat ownership on the database path.", "Restore the compatible checkpoint, replay from recorded Kafka offsets, and let idempotent sinks replace affected projections.", "Compare recovered aggregates with trusted Silver events for the same show and time window; verify no duplicate sink effect.", "A streaming restart can delay a signal but cannot double-count an event or decide seat ownership."],
    ["Late gateway success", "Seat hold → payment attempt → late provider callback → ticket/refund decision", "The gateway reports a successful capture after the hold expired, so payment exists but the original seats may belong to someone else.", "Do not issue a ticket or force seats to SOLD; mark the payment exception and start the customer compensation path.", "Record the provider outcome, create the linked refund when the seat cannot be recovered, and notify Customer Care/customer.", "Match captured and refunded amounts, prove no ticket was minted, and close the exception with provider and booking IDs.", "Payment success alone never proves that BookMyShow still owns the requested seats."],
    ["Bad Iceberg transform", "Bronze events → Silver entities → Gold occupancy, funnel, or settlement product", "Historical BookMyShow dashboards or finance products change unexpectedly after a new transformation publishes.", "Stop the Gold publish and pin consumers to the last certified Iceberg snapshot; do not overwrite that good version.", "Correct the job, rebuild only the affected range from Bronze into staging, and publish a new version after comparison.", "Run booking-seat, screen-capacity, sampling, and finance invariants and retain old/new snapshot IDs plus approval.", "A correction is versioned and traceable; it never erases the evidence used by the previous report."],
    ["Regional DB failover", "Booking API → regional Inventory DB writer → replicated failover authority", "New holds and confirmations pause because BookMyShow cannot safely establish which region owns show-seat writes.", "Fence the old writer, retain idempotent requests, and stop old-leader expiry workers before promoting another region.", "Promote only from a verified replication position, re-enable one writer, and replay retained requests by idempotency key.", "Audit sold-seat uniqueness, hold/booking versions, replication position, and outbox continuity for affected shows.", "Exactly one active writer controls a show-seat boundary; availability is sacrificed before double selling."],
  ] as const;
  const [incident, setIncident] = useState(0);

  const recoveryBoundaries = [
    ["Seat authority", "Target no loss of an acknowledged committed sale; async cross-region replication alone does not prove zero RPO.", "Measured fence, promote, and booking-resume time; BookMyShow may pause writes to avoid two owners.", "Fail over a region, replay idempotent requests, and audit SOLD uniqueness plus outbox continuity."],
    ["Live risk + Ops", "Recover from durable Kafka offsets and the last compatible Flink checkpoint; missed output is recomputable.", "Restore inside the signal SLO; until then show stale age and use conservative admission/risk rules.", "Compare recovered per-show windows with Silver and verify one sink effect per event_id."],
    ["Lakehouse products", "Raw archive and certified snapshots preserve the bounded input needed to reconstruct Silver and Gold.", "Keep the last certified dashboard visible and label its age while staging the repair.", "Rebuild the affected range, pass booking/capacity/finance gates, then publish a new snapshot version."],
    ["Finance", "No capture, refund, chargeback, or partner obligation may disappear from the exception population.", "T+1 finishes as matched or as an explicit held exception—not as a forced daily-total match.", "Retain booking/provider/partner IDs, signed amount, age, reason, owner, and closure evidence."],
  ] as const;
  const [recoveryBoundary, setRecoveryBoundary] = useState(0);

  const gameDays = [
    ["Regional DB failover", "Prove the old inventory writer is fenced before the new region accepts holds or confirmations.", "One active writer, known replication position, zero duplicate SOLD owner for sampled affected seats."],
    ["CDC beyond log retention", "Exercise the bounded re-snapshot path when the connector can no longer read the missing WAL range.", "Recovered boundary IDs and counts agree with the DB; downstream dedup prevents a second business effect."],
    ["Duplicate outbox delivery", "Inject the same booking/payment event more than once through Kafka and every downstream sink.", "One Silver entity, one Gold contribution, and one finance movement for the stable event_id."],
    ["Replay during hot on-sale", "Replay a historical show range while live blockbuster traffic is flowing without competing with seat authority.", "Replay stays in bounded staging, respects capacity controls, and sends no ticket, payment, email, SMS, or push command."],
  ] as const;
  const [gameDay, setGameDay] = useState(0);

  const selectorClass = (selected: boolean) => "rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors " + (selected ? "border-[#111] bg-[#dcdcdc] shadow-[inset_4px_0_0_#111]" : "border-[#ccc] bg-white hover:bg-[#f2f2f2]");

  return <div className="mt-5 space-y-5">
    <StartSection id="ownership-contracts" eyebrow="Ownership + contracts" title="Every trusted product has a named path to an answer" subtitle="A catalog helps discovery. Owners, tests, and evidence make a BookMyShow dataset dependable.">
      <div className="mt-4 overflow-hidden rounded-xl border border-[#c8c8c8]">
        <div className="grid bg-white md:grid-cols-5">{owners.map((item, index) => <button key={item.title} type="button" onMouseEnter={() => setOwner(index)} onFocus={() => setOwner(index)} onClick={() => setOwner(index)} className={"relative min-h-20 border-b border-[#d6d6d6] px-3 py-3 text-left md:border-b-0 md:border-r md:last:border-r-0 " + (owner === index ? "bg-[#e2e2e2]" : "hover:bg-[#f3f3f3]")}><span className="font-mono text-[9px] font-bold text-[#666]">{String(index + 1).padStart(2, "0")}</span><span className="mt-2 block text-xs font-semibold">{item.title}</span>{owner === index ? <span className="absolute bottom-0 left-0 h-1 w-full bg-[#111]" /> : null}</button>)}</div>
        <div className="grid border-l-4 border-[#111] bg-[#e9e9e9] text-[#111] lg:grid-cols-3" aria-live="polite">{[["Responsibility", owners[owner].responsibility], ["BookMyShow example", owners[owner].example], ["Release evidence", owners[owner].evidence]].map(([label, value], index) => <div key={label} className={"p-4 " + (index ? "border-t border-[#c8c8c8] lg:border-l lg:border-t-0" : "")}><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666]">{label}</p><p className="mt-1.5 text-xs leading-5 text-[#333]">{value}</p></div>)}</div>
      </div>
    </StartSection>

    <StartSection id="quality-gates" eyebrow="Quality gates" title="Six gates protect the same booking truth" subtitle="Select a stage to see the check, failure action, and retained proof.">
      <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">{gates.map((item, index) => <button key={item.title} type="button" onMouseEnter={() => setGate(index)} onFocus={() => setGate(index)} onClick={() => setGate(index)} className={"relative rounded-lg border px-3 py-3 text-left " + (gate === index ? "border-[#111] bg-[#e2e2e2]" : "border-[#ccc] bg-white hover:bg-[#f1f1f1]")}><span className={"flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[8px] font-bold " + (gate === index ? "border-[#111] bg-[#111] text-white" : "border-[#aaa]")}>0{index + 1}</span><span className="mt-2 block text-xs font-semibold">{item.title}</span></button>)}</div>
      <div className="mt-3 grid overflow-hidden rounded-xl border border-[#c8c8c8] bg-[#ededed] xl:grid-cols-2" aria-live="polite">
        <div className="p-4"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666]">Gate promise</p><h3 className="mt-1.5 text-base font-semibold">{gates[gate].promise}</h3><div className="mt-3 space-y-1.5">{gates[gate].checks.map((item, index) => <div key={item} className="flex gap-3 border-t border-[#d0d0d0] pt-2 text-xs"><span className="font-mono text-[9px] font-bold text-[#666]">0{index + 1}</span><span>{item}</span></div>)}</div></div>
        <div className="border-t border-[#c8c8c8] bg-white xl:border-l xl:border-t-0"><div className="p-4"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666]">BookMyShow check</p><p className="mt-1.5 text-xs leading-5 text-[#444]">{gates[gate].example}</p></div><div className="grid border-t border-[#d5d5d5] sm:grid-cols-2"><div className="p-4"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666]">When it fails</p><p className="mt-1.5 text-xs leading-5">{gates[gate].failure}</p></div><div className="border-t border-[#ddd] p-4 sm:border-l sm:border-t-0"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666]">Proof retained</p><p className="mt-1.5 font-mono text-[10px] leading-5">{gates[gate].evidence}</p></div></div></div>
      </div>
    </StartSection>

    <StartSection id="finance-reconciliation" eyebrow="Finance reconciliation" title="Three records must explain the same rupee" subtitle="T+1 closes only when each item is matched or held as an owned exception.">
      <div className="mt-4 grid gap-2 lg:grid-cols-4">{[["Internal ledger", "Booking, capture, refund, fee, tax, and movement IDs."], ["Gateway statement", "Provider capture, refund, dispute, currency, and settlement reference."], ["Partner obligation", "Venue/organiser payable, commission, tax, and payout reference."]].map(([title, note], index) => <div key={title} className="rounded-lg border border-[#c8c8c8] bg-white p-3"><p className="font-mono text-[8px] font-bold text-[#666]">0{index + 1} / SOURCE</p><h3 className="mt-1.5 text-xs font-semibold">{title}</h3><p className="mt-1.5 text-[11px] leading-4 text-[#555]">{note}</p></div>)}<div className="rounded-lg border border-[#999] border-l-4 border-l-[#111] bg-[#e2e2e2] p-3 text-[#111]"><p className="font-mono text-[8px] font-bold text-[#666]">T+1 RESULT</p><p className="mt-1.5 text-xs font-semibold">Matched OR held exception</p><p className="mt-1.5 text-[11px] leading-4 text-[#555]">amount + age + source IDs + reason + owner</p></div></div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)]"><div className="grid grid-cols-2 gap-2 xl:grid-cols-1">{exceptions.map((item, index) => <button key={item[0]} type="button" onMouseEnter={() => setException(index)} onFocus={() => setException(index)} onClick={() => setException(index)} className={selectorClass(exception === index)}>{item[0]}</button>)}</div><div className="overflow-hidden rounded-lg border border-[#c8c8c8] bg-[#f0f0f0]" aria-live="polite"><div className="border-b border-[#c8c8c8] border-l-4 border-l-[#111] bg-[#e2e2e2] px-4 py-2.5 text-[#111]"><p className="text-xs font-semibold">{exceptions[exception][0]}</p></div><div className="grid sm:grid-cols-3">{[["What happened", exceptions[exception][1]], ["BookMyShow action", exceptions[exception][2]], ["Proof to close", exceptions[exception][3]]].map(([label, value], index) => <div key={label} className={"p-4 " + (index ? "border-t border-[#ccc] sm:border-l sm:border-t-0" : "")}><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666]">{label}</p><p className="mt-1.5 text-xs leading-5">{value}</p></div>)}</div></div></div>
      <p className="mt-3 border-l-2 border-[#111] bg-[#ededed] px-3 py-2.5 text-xs"><strong>Never force-match a daily total.</strong> Equal totals can hide one missing capture and one unrelated duplicate refund.</p>
    </StartSection>

    <StartSection id="observability" eyebrow="Freshness + health" title="Measure the customer-facing path, not component uptime" subtitle="Select a stage to see what its timestamp means for BookMyShow and what proves it completed.">
      <div className="mt-4 overflow-hidden rounded-xl border border-[#c8c8c8] bg-[#ededed]">
        <div className="grid grid-cols-2 gap-px bg-[#c8c8c8] sm:grid-cols-3 xl:grid-cols-6">{freshnessStages.map((item, index) => <button key={item.title} type="button" onMouseEnter={() => setFreshnessStage(index)} onFocus={() => setFreshnessStage(index)} onClick={() => setFreshnessStage(index)} className={"relative px-3 py-2.5 text-left transition-colors " + (freshnessStage === index ? "bg-[#dedede] shadow-[inset_0_-3px_0_#111]" : "bg-white hover:bg-[#f4f4f4]")}><span className="font-mono text-[8px] font-bold text-[#777]">T{index}</span><p className="mt-0.5 text-[11px] font-semibold">{item.title}</p></button>)}</div>
        <div className="grid border-l-4 border-[#111] bg-[#ededed] sm:grid-cols-3" aria-live="polite">{[["What this stage means", freshnessStages[freshnessStage].meaning], ["BookMyShow example", freshnessStages[freshnessStage].example], ["Evidence retained", freshnessStages[freshnessStage].proof]].map(([label, value], index) => <div key={label} className={"p-3.5 " + (index ? "border-t border-[#c8c8c8] sm:border-l sm:border-t-0" : "")}><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#666]">{label}</p><p className="mt-1.5 text-xs leading-5 text-[#333]">{value}</p></div>)}</div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-[#c8c8c8] bg-white px-3 py-2 text-[10px] text-[#555]"><span><strong>Total age:</strong> T5 serving - T0 commit</span><span><strong>Stage delay:</strong> next timestamp - previous timestamp</span><span><strong>Report:</strong> p50 / p95 / p99 per product</span></div>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[240px_minmax(0,1fr)]"><div className="grid grid-cols-2 gap-2 xl:grid-cols-1">{signals.map((item, index) => <button key={item[0]} type="button" onMouseEnter={() => setSignal(index)} onFocus={() => setSignal(index)} onClick={() => setSignal(index)} className={selectorClass(signal === index)}>{item[0]}</button>)}</div><div className="overflow-hidden rounded-lg border border-[#c8c8c8] bg-white" aria-live="polite"><div className="border-b border-[#c8c8c8] border-l-4 border-l-[#111] bg-[#e2e2e2] px-4 py-2.5 text-[#111]"><h3 className="text-xs font-semibold">{signals[signal][0]}</h3></div><div className="grid sm:grid-cols-2">{[["Measure", signals[signal][1]], ["Detects", signals[signal][2]], ["BookMyShow impact", signals[signal][3]], ["First response", signals[signal][4]]].map(([label, value], index) => <div key={label} className={"p-4 " + (index % 2 ? "sm:border-l sm:border-[#ddd]" : "") + (index > 1 ? " border-t border-[#ddd]" : index === 1 ? " border-t border-[#ddd] sm:border-t-0" : "")}><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666]">{label}</p><p className="mt-1.5 text-xs leading-5">{value}</p></div>)}</div></div></div>
    </StartSection>

    <StartSection id="privacy-access" eyebrow="Privacy + access" title="Identity gets smaller as data travels farther" subtitle="Select a stage to see which BookMyShow data belongs there, why it is needed, and how access is controlled.">
      <div className="mt-4 overflow-hidden rounded-xl border border-[#c8c8c8]">
        <div className="grid gap-px bg-[#c8c8c8] sm:grid-cols-4">{privacyStages.map((item, index) => <button key={item.title} type="button" onMouseEnter={() => setPrivacyStage(index)} onFocus={() => setPrivacyStage(index)} onClick={() => setPrivacyStage(index)} className={"relative px-3 py-3 text-left transition-colors " + (privacyStage === index ? "bg-[#dedede] shadow-[inset_0_-3px_0_#111]" : "bg-white hover:bg-[#f4f4f4]")}><p className="font-mono text-[8px] font-bold text-[#666]">0{index + 1}</p><p className="mt-1.5 text-xs font-semibold">{item.title}</p></button>)}</div>
        <div className="grid border-l-4 border-[#111] bg-[#ededed] sm:grid-cols-3" aria-live="polite">{[["Data at this boundary", privacyStages[privacyStage].contains], ["BookMyShow example", privacyStages[privacyStage].example], ["Protection", privacyStages[privacyStage].control]].map(([label, value], index) => <div key={label} className={"p-3.5 " + (index ? "border-t border-[#c8c8c8] sm:border-l sm:border-t-0" : "")}><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#666]">{label}</p><p className="mt-1.5 text-xs leading-5 text-[#333]">{value}</p></div>)}</div>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)]"><div className="grid grid-cols-2 gap-2 xl:grid-cols-1">{privacyItems.map((item, index) => <button key={item[0]} type="button" onMouseEnter={() => setPrivacy(index)} onFocus={() => setPrivacy(index)} onClick={() => setPrivacy(index)} className={selectorClass(privacy === index)}>{item[0]}</button>)}</div><div className="overflow-hidden rounded-lg border border-[#c8c8c8] bg-[#f0f0f0]" aria-live="polite"><div className="border-b border-[#c8c8c8] border-l-4 border-l-[#111] bg-[#e2e2e2] px-4 py-2.5 text-[#111]"><h3 className="text-xs font-semibold">{privacyItems[privacy][0]}</h3></div><div className="grid sm:grid-cols-2">{[["At source", privacyItems[privacy][1]], ["Distributed form", privacyItems[privacy][2]], ["Who may read", privacyItems[privacy][3]], ["Retention + deletion", privacyItems[privacy][4]]].map(([label, value], index) => <div key={label} className={"p-4 " + (index % 2 ? "sm:border-l sm:border-[#ccc]" : "") + (index > 1 ? " border-t border-[#ccc]" : index === 1 ? " border-t border-[#ccc] sm:border-t-0" : "")}><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666]">{label}</p><p className="mt-1.5 text-xs leading-5">{value}</p></div>)}</div></div></div>
      <div className="mt-4 overflow-hidden rounded-xl border border-[#c8c8c8] bg-white">
        <p className="px-4 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#666]">Deletion must finish across the path</p>
        <div className="mt-3 grid gap-2 px-4 sm:grid-cols-5">{deletionStages.map((item, index) => <button key={item[0]} type="button" onMouseEnter={() => setDeletionStage(index)} onFocus={() => setDeletionStage(index)} onClick={() => setDeletionStage(index)} className={"rounded-lg border px-3 py-2.5 text-center text-xs font-semibold transition-colors " + (deletionStage === index ? "border-[#111] bg-[#dedede] shadow-[inset_0_-3px_0_#111]" : "border-transparent bg-[#ededed] hover:border-[#aaa]")}>{item[0]}</button>)}</div>
        <div className="mt-3 grid border-t border-[#c8c8c8] border-l-4 border-l-[#111] bg-[#f0f0f0] sm:grid-cols-3" aria-live="polite">{[["What happens", deletionStages[deletionStage][1]], ["BookMyShow example", deletionStages[deletionStage][2]], ["Proof of completion", deletionStages[deletionStage][3]]].map(([label, value], index) => <div key={label} className={"p-3.5 " + (index ? "border-t border-[#c8c8c8] sm:border-l sm:border-t-0" : "")}><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#666]">{label}</p><p className="mt-1.5 text-xs leading-5 text-[#333]">{value}</p></div>)}</div>
      </div>
    </StartSection>

    <StartSection id="failure-recovery" eyebrow="Failure + recovery" title="Recover BookMyShow without weakening seat or money guarantees" subtitle="Select an incident to see the affected booking path, safe containment, repair sequence, and proof required before closure.">
      <div className="mt-4 grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)]"><div className="grid grid-cols-2 gap-2 xl:grid-cols-1">{incidents.map((item, index) => <button key={item[0]} type="button" onMouseEnter={() => setIncident(index)} onFocus={() => setIncident(index)} onClick={() => setIncident(index)} className={selectorClass(incident === index)}>{item[0]}</button>)}</div><div className="overflow-hidden rounded-lg border border-[#c8c8c8] bg-[#f0f0f0]" aria-live="polite"><div className="border-b border-[#c8c8c8] border-l-4 border-l-[#111] bg-[#e2e2e2] px-4 py-2.5 text-[#111]"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666]">Selected BookMyShow drill</p><h3 className="mt-0.5 text-xs font-semibold">{incidents[incident][0]}</h3></div><div className="border-b border-[#c8c8c8] bg-white px-4 py-2.5"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666]">Affected path</p><p className="mt-1 font-mono text-[10px] leading-5 text-[#333]">{incidents[incident][1]}</p></div><div className="grid sm:grid-cols-2">{[["Customer / operator symptom", incidents[incident][2]], ["Contain safely", incidents[incident][3]], ["BookMyShow repair path", incidents[incident][4]], ["Verification before close", incidents[incident][5]]].map(([label, value], index) => <div key={label} className={"p-4 " + (index % 2 ? "sm:border-l sm:border-[#ccc]" : "") + (index > 1 ? " border-t border-[#ccc]" : index === 1 ? " border-t border-[#ccc] sm:border-t-0" : "")}><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666]">{label}</p><p className="mt-1.5 text-xs leading-5">{value}</p></div>)}</div><div className="border-t border-[#bbb] bg-white px-4 py-3"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666]">BookMyShow invariant</p><p className="mt-1.5 text-xs font-semibold leading-5">{incidents[incident][6]}</p></div></div></div>
      <div className="mt-4 overflow-hidden rounded-lg border border-[#c8c8c8] bg-white">
        <div className="grid gap-px bg-[#c8c8c8] sm:grid-cols-4">{recoveryBoundaries.map((item, index) => <button key={item[0]} type="button" onMouseEnter={() => setRecoveryBoundary(index)} onFocus={() => setRecoveryBoundary(index)} onClick={() => setRecoveryBoundary(index)} className={"px-3 py-2.5 text-left text-xs font-semibold transition-colors " + (recoveryBoundary === index ? "bg-[#dedede] shadow-[inset_0_-3px_0_#111]" : "bg-white hover:bg-[#f2f2f2]")}>{item[0]}</button>)}</div>
        <div className="grid border-l-4 border-[#111] bg-[#f0f0f0] sm:grid-cols-3" aria-live="polite">{[["RPO · acceptable loss", recoveryBoundaries[recoveryBoundary][1]], ["RTO · restore behavior", recoveryBoundaries[recoveryBoundary][2]], ["BookMyShow proof", recoveryBoundaries[recoveryBoundary][3]]].map(([label, value], index) => <div key={label} className={"p-3.5 " + (index ? "border-t border-[#c8c8c8] sm:border-l sm:border-t-0" : "")}><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#666]">{label}</p><p className="mt-1.5 text-xs leading-5 text-[#333]">{value}</p></div>)}</div>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-[#c8c8c8] bg-white">
        <div className="flex flex-wrap gap-2 p-3">{gameDays.map((item, index) => <button key={item[0]} type="button" onMouseEnter={() => setGameDay(index)} onFocus={() => setGameDay(index)} onClick={() => setGameDay(index)} className={"rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors " + (gameDay === index ? "border-[#111] bg-[#dedede]" : "border-[#bbb] bg-white hover:bg-[#ededed]")}>{item[0]}</button>)}</div>
        <div className="grid border-t border-[#c8c8c8] border-l-4 border-l-[#111] bg-[#f0f0f0] sm:grid-cols-2" aria-live="polite"><div className="p-3.5"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666]">What BookMyShow rehearses</p><p className="mt-1.5 text-xs leading-5">{gameDays[gameDay][1]}</p></div><div className="border-t border-[#c8c8c8] p-3.5 sm:border-l sm:border-t-0"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666]">Evidence required</p><p className="mt-1.5 text-xs leading-5">{gameDays[gameDay][2]}</p></div></div>
      </div>
    </StartSection>
  </div>;
}

function InterviewQA() {
  const answers = INTERVIEW_QA;
  const categories = ["Requirements + sizing", "Seat + payment", "Architecture + contracts", "Kafka + streaming", "Lakehouse + modeling", "Governance + privacy", "Recovery + observability", "Scale + trade-offs"] as const;
  const [category, setCategory] = useState<(typeof categories)[number]>(categories[0]);
  const filtered = answers.filter((item) => item.category === category);
  const [question, setQuestion] = useState(0);
  const picked = filtered[Math.min(question, filtered.length - 1)];
  const [whiteboardStep, setWhiteboardStep] = useState(0);
  const whiteboard = [
    {
      time: "0:00–0:40",
      title: "Frame the promise",
      draw: "Place Customer → BookMyShow edge → Booking domain across the top. Write the two invariants beside it: one active owner per show-seat and every payment movement traceable to a booking.",
      explain: "Separate the customer-facing booking path from downstream data products. Seat ownership and payment transitions need synchronous authority; search analytics, occupancy, fraud features, and settlement can use declared freshness windows.",
      checkpoint: "The interviewer should know what must never be wrong before tools appear.",
    },
    {
      time: "0:40–1:20",
      title: "Size the pressure",
      draw: "Add 8M DAU × 2 sessions × 40 interactions = 640M app events/day, plus 2M bookings × 6 lifecycle events = 12M critical events/day. Mark the launch peak separately: 300K events/s and roughly 3.5K requested holds/s before admission.",
      explain: "Daily volume sizes storage and Kafka retention; the blockbuster window sizes concurrency. A waiting room limits the hold attempts admitted to the Inventory DB, because visitor refreshes are not the same as safe authoritative writes.",
      checkpoint: "Show both average data volume and the one-hot-show bottleneck.",
    },
    {
      time: "1:20–2:10",
      title: "Establish transaction truth",
      draw: "Draw the Inventory DB with show-seat, hold, booking, payment, and outbox records. Show AVAILABLE → HELD → SOLD as conditional transitions using server time and a short transaction for the whole seat basket.",
      explain: "Only this database grants seat ownership. Redis may accelerate the seat map, but its TTL is not authority. The booking change and outbox event commit together, while idempotency keys make retries safe.",
      checkpoint: "Explain exactly why two buyers cannot successfully own the same seat.",
    },
    {
      time: "2:10–3:00",
      title: "Publish and stream",
      draw: "Connect Outbox/WAL → CDC → Kafka. Branch Kafka to Flink for minute-level operations and risk, and to immutable object storage for replay. Label show_id ordering for inventory and booking_id ordering for booking/payment lifecycles.",
      explain: "Transport is at-least-once, so consumers deduplicate event_id and write idempotently. Kafka absorbs fan-out and replay; Flink handles event-time windows and late arrivals without becoming the source of seat truth.",
      checkpoint: "Defend keys, ordering scope, duplicates, late data, and broker downtime.",
    },
    {
      time: "3:00–4:05",
      title: "Build trusted analytics",
      draw: "Continue Raw/Bronze → validated Silver → Iceberg → Gold → dashboards and exports. Add the main facts—booking-seat, payment movement, hold attempt, occupancy snapshot—and the show, venue, customer, promotion, and partner dimensions.",
      explain: "Bronze preserves exact replay evidence; Silver applies schema, privacy, ordering, and deduplication rules; Gold publishes products at explicit grains. Iceberg snapshots make corrections, time travel, and rollback auditable.",
      checkpoint: "Tie every serving metric to a stable grain, source offsets, and snapshot ID.",
    },
    {
      time: "4:05–5:00",
      title: "Close with failure recovery",
      draw: "Wrap the diagram with freshness clocks, lag, quality gates, lineage, and alerts. Add the recovery path: pin source evidence → rebuild in staging → compare invariants → publish a new snapshot. Mark DB fencing before regional promotion.",
      explain: "State the degraded behavior: protect Inventory DB and outbox headroom, label stale products, preserve payment evidence, and pause unsafe writes before risking duplicate seat ownership. Finish by naming hot-show contention as the first limit to load-test.",
      checkpoint: "End with measurable SLOs, RPO/RTO, a rollback path, and the first bottleneck.",
    },
  ] as const;
  return <div className="mt-5 space-y-5">
    <StartSection id="question-bank" eyebrow="40-question interview workspace" title="Complete BookMyShow interview questions and answers" subtitle="Eight rounds cover the complete BookMyShow big-data design.">
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Interview question categories">{categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => { setCategory(item); setQuestion(0); }} className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${category === item ? "border-[#111] bg-[#dedede]" : "border-[#cfcfcf] bg-white hover:border-[#777]"}`}>{item}</button>)}</div>
      <div className="mt-4 grid min-h-[430px] overflow-hidden rounded-2xl border border-[#cfcfcf] xl:grid-cols-[38%_62%]">
        <div className="max-h-[520px] overflow-y-auto bg-[#ededed]">{filtered.map((item, index) => <button key={item.question} type="button" onMouseEnter={() => setQuestion(index)} onFocus={() => setQuestion(index)} onClick={() => setQuestion(index)} className={`block w-full border-b border-[#d0d0d0] px-5 py-4 text-left last:border-b-0 ${question === index ? 'bg-white shadow-[inset_4px_0_0_#111]' : 'hover:bg-white/60'}`}><span className="font-mono text-[9px] text-[#666]">{String(answers.indexOf(item) + 1).padStart(2, '0')}</span><strong className="mt-2 block text-xs leading-5">{item.question}</strong></button>)}</div>
        <div className="flex flex-col bg-white p-6" aria-live="polite">
          <div className="flex items-center justify-between gap-3"><p className="font-mono text-[9px] font-bold text-[#666]">QUESTION {String(answers.indexOf(picked) + 1).padStart(2, "0")} / 40</p><span className="rounded-full border border-[#ccc] bg-[#ededed] px-3 py-1 font-mono text-[9px]">{category}</span></div>
          <h3 className="mt-3 text-xl font-semibold leading-7">{picked.question}</h3>
          <div className="mt-6 overflow-hidden rounded-xl border border-[#cfcfcf] bg-[#ededed]"><div className="border-b border-[#d2d2d2] bg-[#111] px-5 py-3 text-white"><p className="font-mono text-[9px] font-bold uppercase tracking-[.14em]">Comprehensive interview answer</p></div><div className="p-5"><p className="text-sm leading-7 text-[#333]">{picked.position} {picked.tradeoff}</p><p className="mt-4 border-l-2 border-[#111] pl-4 text-sm leading-7 text-[#444]">{picked.proof}</p></div></div>
        </div>
      </div>
    </StartSection>
    <StartSection id="whiteboard" eyebrow="Five-minute whiteboard" title="Build the BookMyShow design in six connected decisions" subtitle="Move from the customer promise to scale, transaction truth, data flow, analytics, and recovery. Select any step to see exactly what to draw and explain.">
      <ol className="mt-6 grid overflow-hidden rounded-xl border border-[#c9c9c9] bg-[#d8d8d8] sm:grid-cols-2 xl:grid-cols-6">
        {whiteboard.map((step, index) => <li key={step.time} className="relative bg-white xl:[&:not(:last-child)]:after:absolute xl:[&:not(:last-child)]:after:right-[-8px] xl:[&:not(:last-child)]:after:top-1/2 xl:[&:not(:last-child)]:after:z-10 xl:[&:not(:last-child)]:after:h-4 xl:[&:not(:last-child)]:after:w-4 xl:[&:not(:last-child)]:after:-translate-y-1/2 xl:[&:not(:last-child)]:after:rotate-45 xl:[&:not(:last-child)]:after:border-r xl:[&:not(:last-child)]:after:border-t xl:[&:not(:last-child)]:after:border-[#aaa] xl:[&:not(:last-child)]:after:bg-white">
          <button type="button" onMouseEnter={() => setWhiteboardStep(index)} onFocus={() => setWhiteboardStep(index)} onClick={() => setWhiteboardStep(index)} aria-pressed={whiteboardStep === index} className={`relative h-full min-h-[116px] w-full border-b border-r border-[#d8d8d8] px-4 py-4 text-left transition sm:[&:nth-last-child(-n+2)]:border-b-0 xl:border-b-0 ${whiteboardStep === index ? "bg-[#e4e4e4] shadow-[inset_0_-4px_0_#111]" : "hover:bg-[#f3f3f3]"}`}>
            <span className="flex items-center gap-2"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold ${whiteboardStep === index ? "bg-[#111] text-white" : "border border-[#aaa] bg-white"}`}>{index + 1}</span><span className="font-mono text-[8px] font-bold text-[#666]">{step.time}</span></span>
            <strong className="mt-3 block text-xs leading-5">{step.title}</strong>
          </button>
        </li>)}
      </ol>
      <div className="mt-4 overflow-hidden rounded-xl border border-[#c9c9c9] bg-[#ededed]" aria-live="polite">
        <div className="flex items-center gap-4 bg-[#111] px-5 py-3 text-white"><span className="font-mono text-[9px] font-bold">STEP {String(whiteboardStep + 1).padStart(2, "0")}</span><strong className="text-sm">{whiteboard[whiteboardStep].title}</strong><span className="ml-auto font-mono text-[9px] text-[#d0d0d0]">{whiteboard[whiteboardStep].time}</span></div>
        <div className="grid lg:grid-cols-[1fr_1.2fr]">
          <div className="border-b border-[#d0d0d0] p-5 lg:border-b-0 lg:border-r"><p className="font-mono text-[9px] font-bold uppercase tracking-[.13em] text-[#666]">Add to the diagram</p><p className="mt-3 text-sm leading-7 text-[#333]">{whiteboard[whiteboardStep].draw}</p></div>
          <div className="p-5"><p className="font-mono text-[9px] font-bold uppercase tracking-[.13em] text-[#666]">Explain the decision</p><p className="mt-3 text-sm leading-7 text-[#333]">{whiteboard[whiteboardStep].explain}</p><p className="mt-4 border-l-2 border-[#111] pl-4 text-xs font-semibold leading-6 text-[#444]">{whiteboard[whiteboardStep].checkpoint}</p></div>
        </div>
      </div>
    </StartSection>
  </div>;
}

function Content({ chapter, onModelExplain }: { chapter: BookMyShowChapter; onModelExplain: (explanation: ModelExplanation) => void }) {
  switch (chapter) {
    case "requirements": return <Requirements />;
    case "architecture": return <Architecture />;
    case "event-contracts": return <EventContracts />;
    case "data-modeling": return <DataModeling onExplain={onModelExplain} />;
    case "batch-lakehouse": return <BatchLakehouse />;
    case "governance-quality": return <GovernanceQuality />;
    case "interview-qa": return <InterviewQA />;
    default: return <StartHere />;
  }
}

export default function BookMyShowDataEngineeringPage({ chapter }: { chapter: BookMyShowChapter }) {
  const activeIndex = BOOKMYSHOW_CHAPTERS.findIndex((item) => item.id === chapter);
  const active = BOOKMYSHOW_CHAPTERS[activeIndex];
  const sections = BOOKMYSHOW_SECTIONS[chapter];
  const next = BOOKMYSHOW_CHAPTERS[activeIndex + 1];
  const previous = BOOKMYSHOW_CHAPTERS[activeIndex - 1];
  const sidebarProgress = useMemo(() => `${Math.round(((activeIndex + 1) / BOOKMYSHOW_CHAPTERS.length) * 100)}%`, [activeIndex]);
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");
  const [modelExplanation, setModelExplanation] = useState<ModelExplanation>(DEFAULT_MODEL_EXPLANATION);
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
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sections]);

  return (
    <div className="bookmyshow-de-page min-h-[calc(100dvh-var(--site-nav-height))] bg-[#f1f1f1] text-[#111]" style={{ "--bg": "#f1f1f1", "--bg-card": "#ffffff", "--bg-muted": "#e9e9e9", "--border": line, "--text": ink, "--text-muted": slate, "--text-faint": "#707070" } as React.CSSProperties}>
      <CompanyChapterRail company="bookmyshow" chapters={BOOKMYSHOW_CHAPTERS} activeId={chapter} hrefFor={(id) => `/data-engineering/bookmyshow/${id}`} />
      <MobileSectionNav sections={sections} accent="#111111" />

      <div className={`mx-auto grid w-full ${isModeling ? "max-w-[1920px] xl:grid-cols-[300px_minmax(0,1fr)]" : "max-w-[1600px] xl:grid-cols-[230px_minmax(0,1fr)]"}`}>
        <aside className={`hidden border-r border-[#d8d8d8] py-7 xl:block ${isModeling ? "px-4" : "px-5"}`}>
          <div className="sticky top-[calc(var(--de-chapter-shell-offset)+24px)]">
            <div className="mb-7 flex items-center gap-3">
              <span className="flex h-9 w-12 items-center justify-center overflow-hidden rounded-lg border border-[#d8d8d8] bg-white">
                <Image src="/logo-bookmyshow.jpg" alt="" width={72} height={30} className="h-full w-full object-contain" priority />
              </span>
              <p className="text-base font-bold tracking-[-.025em]">BookMyShow</p>
            </div>
            <div className="mb-3 flex items-center justify-between"><p className="font-mono text-[9px] font-bold uppercase tracking-[.18em] text-[#5f5f5f]">Page anchors</p><span className="font-mono text-[9px] text-[#5f5f5f]">{sections.findIndex((section) => section.id === activeSection) + 1}/{sections.length}</span></div>
            <nav aria-label="Sections in this chapter" className="grid gap-2">{sections.map((section, index) => {
              const selected = section.id === activeSection;
              return <a key={section.id} href={`#${section.id}`} aria-current={selected ? "location" : undefined} className={`relative flex min-h-[54px] items-center gap-3 rounded-lg border px-3 text-xs font-semibold transition ${selected ? "border-[#111] bg-[#e4e4e4] text-[#111]" : "border-[#d8d8d8] bg-white text-[#5f5f5f] hover:border-[#777] hover:text-[#111]"}`}>{selected ? <span className="absolute inset-y-0 left-0 w-1 rounded-l-lg bg-[#111]" /> : null}<span className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[9px] font-bold ${selected ? "bg-[#111] text-white" : "bg-[#ededed] text-[#5f5f5f]"}`}>{index + 1}</span>{section.title}</a>;
            })}</nav>
            {isModeling ? <div className="mt-3 overflow-hidden rounded-xl border border-[#111] bg-[#111] text-white shadow-[0_10px_28px_rgba(0,0,0,.16)]" aria-live="polite">
              <div className="border-b border-white/15 bg-[#1d1d1d] px-4 py-3"><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#d2d2d2]">{modelExplanation.group} table</p><h2 className="mt-1 break-words text-base font-semibold leading-5 text-white">{modelExplanation.name}</h2></div>
              <div className="grid gap-3 p-4 text-[11px] leading-5">
                <div><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#d2d2d2]">One row means</p><p className="mt-1 text-white">{modelExplanation.grain}</p></div>
                <div className="border-t border-white/15 pt-2.5"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#d2d2d2]">Key contents</p><p className="mt-1 text-white/80">{modelExplanation.contents}</p></div>
                <div className="border-t border-white/15 pt-2.5"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#d2d2d2]">How BookMyShow uses it</p><p className="mt-1 text-white/80">{modelExplanation.purpose}</p></div>
                <div className="border-t border-white/15 pt-2.5"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#d2d2d2]">Created from</p><p className="mt-1 text-white/80">{modelExplanation.source}</p></div>
              </div>
            </div> : null}
            <div className="mt-6 h-1 overflow-hidden rounded-full bg-[#d8d8d8]"><span className="block h-full bg-[#111]" style={{ width: sidebarProgress }} /></div>
            <p className="mt-2 font-mono text-[9px] text-[#5f5f5f]">Chapter {activeIndex + 1} of {BOOKMYSHOW_CHAPTERS.length}</p>
          </div>
        </aside>

        <div data-de-content className={`min-w-0 pb-24 pt-5 md:pt-7 ${isModeling ? "px-3 sm:px-4 lg:px-5 2xl:px-6" : "px-4 sm:px-6 lg:px-10 xl:px-12"}`}>
          <header data-testid="chapter-page-heading" className="rounded-2xl border border-[#d8d8d8] bg-white px-5 py-4 md:px-6 md:py-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[#5f5f5f]">BookMyShow · Data Engineering · {active.eyebrow}</p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-[-.035em] text-[#111] md:text-3xl">{active.label}</h1>
            <p className="mt-1.5 max-w-3xl text-xs leading-5 text-[#5f5f5f] md:text-sm md:leading-6">{active.description}</p>
          </header>

          <Content chapter={chapter} onModelExplain={setModelExplanation} />

          {chapter !== "start-here" ? <nav aria-label="Adjacent chapters" className="mt-3 grid gap-3 border-t border-[#d8d8d8] pt-6 sm:grid-cols-2">
            {previous ? <Link href={`/data-engineering/bookmyshow/${previous.id}`} className="group rounded-2xl border border-[#d8d8d8] bg-white p-4 transition hover:border-[#777]"><p className="font-mono text-[9px] text-[#666]">← PREVIOUS</p><p className="mt-2 text-sm font-bold">{previous.label}</p></Link> : <span />}
            {next ? <Link href={`/data-engineering/bookmyshow/${next.id}`} className="group rounded-2xl border border-[#111] bg-[#111] p-4 text-white transition hover:bg-[#2a2a2a]"><p className="font-mono text-[9px] text-white/50">NEXT →</p><p className="mt-2 text-sm font-bold">{next.label}</p></Link> : <Link href="/" className="rounded-2xl border border-[#111] bg-[#111] p-4 text-white"><p className="font-mono text-[9px] text-white/50">FINISHED</p><p className="mt-2 text-sm font-bold">Back to the library →</p></Link>}
          </nav> : null}
        </div>
      </div>
    </div>
  );
}
