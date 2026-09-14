"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { UBER_INTERVIEW_SECTIONS } from "./data";
import { UBER_INTERVIEW_ANSWERS } from "./interviewAnswers";
import AnchorBrand from "./AnchorBrand";

const C = {
  card: "var(--bg-card)",
  card2: "var(--bg-muted)",
  border: "var(--border)",
  text: "var(--text)",
  muted: "var(--text-muted)",
  blue: "#526b82",
  cyan: "#657e90",
  green: "#667a70",
  amber: "#796f64",
};

type CategoryId = "foundations" | "streaming" | "modeling" | "reliability";
type Question = {
  id: string;
  category: CategoryId;
  question: string;
  position: string;
  tradeoff: string;
  proof: string;
};

const CATEGORIES: { id: CategoryId; label: string; color: string }[] = [
  { id: "foundations", label: "Architecture", color: C.blue },
  { id: "streaming", label: "Kafka + Flink", color: C.cyan },
  { id: "modeling", label: "Lakehouse + model", color: C.amber },
  { id: "reliability", label: "Quality + operations", color: C.green },
];

const BASE_QUESTIONS: Question[] = [
  {
    id: "regional-global-boundary",
    category: "foundations",
    question:
      "How would you divide Uber's regional and global data architecture?",
    position:
      "Run ingestion, streaming, and online state in regional data planes; keep schemas, deployment policy, and permitted analytical consolidation in a global control plane.",
    tradeoff:
      "Regional autonomy lowers latency and blast radius, but requires explicit replication, residency rules, and cross-region reconciliation.",
    proof:
      "A regional outage can buffer and replay local trips without stopping other cities, while approved Gold aggregates still roll up for company-wide finance and marketplace analysis.",
  },
  {
    id: "global-kafka",
    category: "foundations",
    question: "Why not use one global Kafka cluster?",
    position:
      "Use region-local clusters so city traffic remains close to producers and consumers.",
    tradeoff:
      "Regional operation adds replication and reconciliation work, but reduces latency, residency risk, and global blast radius.",
    proof:
      "An EU location-data incident or one regional broker outage must not stop marketplace updates in every other city.",
  },
  {
    id: "two-paths",
    category: "foundations",
    question: "Why split streaming and batch after Kafka?",
    position:
      "Both paths consume the same durable events but provide different freshness and correction guarantees.",
    tradeoff:
      "Maintaining two paths costs more, but forcing finance truth and live supply into one latency model creates worse correctness boundaries.",
    proof:
      "Flink updates supply, surge, and ETA in seconds; Spark and Iceberg reconcile official trip and settlement facts.",
  },
  {
    id: "scale-driver",
    category: "foundations",
    question: "What is the defining scale constraint?",
    position:
      "Driver GPS dominates event count, throughput, retention cost, and spatial skew.",
    tradeoff:
      "Dense 4-second pings are valuable for recent operations but too expensive to retain indefinitely at full resolution.",
    proof:
      "2M online drivers divided by 4 seconds gives about 500K GPS events/sec and roughly 8.6 TB/day at 200 bytes/event.",
  },
  {
    id: "shared-truth",
    category: "foundations",
    question:
      "How do you stop the streaming and lakehouse paths becoming two sources of truth?",
    position:
      "Treat Kafka as the shared durable input, streaming outputs as rebuildable current state, and versioned lakehouse tables as reconciled historical truth.",
    tradeoff:
      "The two paths can temporarily disagree because of late events, so every result needs event-time, source offsets, and a defined reconciliation window.",
    proof:
      "Flink publishes seconds-fresh H3 supply and ETA state; Spark replays the same Kafka ranges and atomically publishes corrected trip, payment, and city-day facts.",
  },
  {
    id: "source-beyond-kafka",
    category: "foundations",
    question: "Is every Uber source an event stream?",
    position:
      "No. Operational reference data such as driver onboarding, vehicles, city configuration, and support also needs CDC.",
    tradeoff:
      "CDC preserves database changes but requires snapshot coordination and source transaction ordering.",
    proof:
      "Debezium or native CDC carries LSN/SCN into Kafka; compacted topics distribute small current reference dimensions.",
  },
  {
    id: "partition-key",
    category: "streaming",
    question: "Why not partition location pings by driver_id?",
    position:
      "Use a salted spatial key such as city + H3 cell + salt so nearby pings can be aggregated together without one hot partition.",
    tradeoff:
      "Salting weakens perfect per-cell ordering, so jobs that require it must re-key downstream.",
    proof:
      "Airport and stadium cells can become hotspots; pure driver_id balances writes but destroys spatial locality for supply windows.",
  },
  {
    id: "partitions",
    category: "streaming",
    question: "How many Kafka partitions do you need?",
    position:
      "Start with the throughput minimum, then add headroom for skew, parallelism, broker failure, and growth.",
    tradeoff:
      "More partitions improve concurrency but increase metadata, rebalance time, and operational cost.",
    proof:
      "100 MB/sec divided by 5-10 MB/sec per partition gives a 10-20 throughput floor per regional GPS topic, not the final provision.",
  },
  {
    id: "late-data",
    category: "streaming",
    question: "How do you handle late mobile events?",
    position:
      "Process by event time with a bounded watermark; route later records to correction instead of dropping them.",
    tradeoff:
      "A longer watermark improves completeness but delays window finality and grows state.",
    proof:
      "A GPS ping arriving 90 seconds late can still update a 2-minute window; later trip events feed hourly reconciliation and backfill.",
  },
  {
    id: "surge-flapping",
    category: "streaming",
    question: "How do you prevent surge-price flapping?",
    position:
      "Use windowed supply-demand aggregates with smoothing, hysteresis, and a minimum interval between changes.",
    tradeoff:
      "Smoothing makes prices slightly less reactive but prevents noisy GPS or one request from causing unstable rider prices.",
    proof:
      "Recompute regional H3 signals every 30-60 seconds rather than pricing from the instantaneous ratio on every ping.",
  },
  {
    id: "exactly-once",
    category: "streaming",
    question: "How do you guarantee exactly-once for payments?",
    position:
      "Guarantee no duplicate financial effect through end-to-end idempotency and reconciliation, not a universal exactly-once claim.",
    tradeoff:
      "Kafka and Flink transactions cover bounded stages; external processors still require independent settlement evidence.",
    proof:
      "Carry event_id through acks=all Kafka, append-only ledger writes, idempotent sinks, and nightly processor reconciliation.",
  },
  {
    id: "flink-state",
    category: "streaming",
    question: "How would you size and protect Flink state?",
    position:
      "Bound keyed state with TTL, checkpoint it durably, and monitor checkpoint time, backpressure, and watermark delay.",
    tradeoff:
      "Long TTLs improve late-event correction but increase RocksDB state, restore time, and storage cost.",
    proof:
      "Keep event IDs only through their dedupe horizon, isolate narrow jobs, and use savepoints plus dual-running upgrades.",
  },
  {
    id: "bronze-silver-gold",
    category: "modeling",
    question: "What does Bronze, Silver, and Gold mean here?",
    position:
      "Bronze preserves source truth, Silver creates valid conformed evidence, and Gold publishes reconciled business facts.",
    tradeoff:
      "More layers add maintenance, but make replay, audit, privacy controls, and correction boundaries explicit.",
    proof:
      "location_pings_raw becomes filtered and deduped location_pings_clean; trip_fact then reconciles rider, dispatch, driver, GPS, and payment evidence.",
  },
  {
    id: "trip-grain",
    category: "modeling",
    question: "What is the grain of fact_trip?",
    position:
      "One row per trip request, including completed, cancelled, and expired outcomes.",
    tradeoff:
      "An accumulating snapshot is convenient for lifecycle analysis but needs versioned updates and fact_trip_event for immutable event history.",
    proof:
      "Separate request, match-attempt, payment-ledger, earning, and location facts prevent incompatible grains from being mixed into trip_fact.",
  },
  {
    id: "location-retention",
    category: "modeling",
    question: "How do you control GPS storage cost?",
    position:
      "Keep dense recent pings briefly, then retain representative route points at lower frequency.",
    tradeoff:
      "Downsampling loses exact historical movement but preserves enough route shape for planning and travel-time analysis.",
    proof:
      "Move from 1 ping every 4 seconds, or 15/minute, to 1 retained point every 30 seconds, or 2/minute: about 7.5x fewer points.",
  },
  {
    id: "backfill",
    category: "modeling",
    question: "How do you backfill without corrupting history?",
    position:
      "Replay a bounded Kafka or Bronze range through corrected code into a new versioned snapshot.",
    tradeoff:
      "Versioned replacement uses extra storage, but finance and legal retain a reviewable record of both versions.",
    proof:
      "Validate route samples, trip counts, fares, and settlements before atomically switching governed readers; never overwrite Gold in place.",
  },
  {
    id: "scd2",
    category: "modeling",
    question: "Where do you need SCD2 dimensions?",
    position:
      "Use SCD2 where the historical definition at event time changes interpretation, such as driver, rider, vehicle, geo, and service eligibility.",
    tradeoff:
      "Effective-dated joins cost more than current-state lookups but stop today’s attributes from rewriting past trips.",
    proof:
      "Resolve the surrogate key where event_time falls between effective_from and effective_to; create an inferred member for a late dimension.",
  },
  {
    id: "join-skew",
    category: "modeling",
    question: "How do you prevent trip-to-GPS joins from exploding?",
    position:
      "Prune by region and time, cluster by trip or H3, salt hot keys, and pre-aggregate route summaries before broad joins.",
    tradeoff:
      "Pre-aggregation reduces detail available to the join, so retain raw Bronze evidence for forensic replay.",
    proof:
      "Adaptive Spark execution and bounded trip time ranges avoid scanning every location ping for each trip.",
  },
  {
    id: "hardest-quality",
    category: "reliability",
    question: "What is Uber's hardest data-quality problem?",
    position:
      "It is multi-producer trip stitching under unreliable mobile networks, not merely malformed rows.",
    tradeoff:
      "Waiting for every producer improves completeness but violates live freshness, so the platform needs provisional state plus later reconciliation.",
    proof:
      "Rider, driver, dispatch, maps, and payment events can arrive late, duplicate, conflict, or disappear independently for one trip.",
  },
  {
    id: "quality-slos",
    category: "reliability",
    question: "Which quality and reliability SLOs would you define?",
    position:
      "Separate infrastructure, pipeline, record-quality, and business-reconciliation SLOs.",
    tradeoff:
      "One overall freshness metric is simple but cannot distinguish producer delay, Kafka lag, processing delay, or wrong business totals.",
    proof:
      "Target 99.9% of location events in the live map within 5 seconds and 99.5% of city-day facts by 06:00 local.",
  },
  {
    id: "privacy-delete",
    category: "reliability",
    question: "How does a rider deletion propagate through the lakehouse?",
    position:
      "Track deletion lineage by tokenized identity and apply it to every approved derivative and serving copy.",
    tradeoff:
      "Immediate physical removal conflicts with immutable snapshots and backups, so policy must define logical deletion, compaction, expiry, and crypto-shredding.",
    proof:
      "Use Iceberg equality or position deletes, compact files, expire snapshots, invalidate features, and retain auditable completion evidence.",
  },
  {
    id: "regional-failure",
    category: "reliability",
    question: "What happens during a regional outage?",
    position:
      "Contain the blast radius, fail to a paired region, and let dispatch degrade briefly to last-known positions.",
    tradeoff:
      "Asynchronous mirroring has non-zero RPO; active-active writes risk conflicts without ownership rules.",
    proof:
      "After recovery, replay retained offsets, verify watermark continuity, and reconcile stronger payment and finance records independently.",
  },
  {
    id: "schema-release",
    category: "reliability",
    question: "How do you survive a breaking mobile schema release?",
    position:
      "Reject or quarantine incompatible producer versions before they update live or trusted state.",
    tradeoff:
      "Strict compatibility may discard temporarily useful fields, but silently accepting semantic changes corrupts every downstream consumer.",
    proof:
      "Use schema-registry modes, contract tests, canary app releases, producer-version DLQ metrics, and replay after the hotfix.",
  },
  {
    id: "cost",
    category: "reliability",
    question: "What is the highest-leverage cost decision?",
    position:
      "Retention and resolution of location data matter more than micro-optimizing one compute job.",
    tradeoff:
      "Aggressive downsampling saves storage and scan cost but reduces forensic precision and future model flexibility.",
    proof:
      "The 4-second to 30-second GPS policy cuts aged point volume about 7.5x; regional processing also avoids unnecessary cross-region transfer.",
  },
];

const REQUESTED_QUESTIONS: Question[] = [
  {
    id: "design-trip-pipeline",
    category: "foundations",
    question:
      "Design an end-to-end pipeline that processes Uber trip events in real time.",
    position:
      "Publish versioned trip events to regional Kafka, validate and stitch them in Flink, serve current trip state from keyed stores, and land every event in an Iceberg lakehouse for reconciliation.",
    tradeoff:
      "The online path favors seconds-fresh state while the lakehouse favors reproducible correctness, so their contracts and ownership must be explicit.",
    proof:
      "A trip request, match, pickup, completion, payment, and cancellation share a trip_id but remain immutable events with event-time and producer provenance.",
  },
  {
    id: "gps-ingestion",
    category: "foundations",
    question:
      "How would you ingest millions of GPS location updates per second from drivers and riders?",
    position:
      "Use regional mobile gateways, compressed asynchronous batches, and Kafka topics keyed by city + H3 cell + salt, then aggregate with event-time Flink jobs.",
    tradeoff:
      "Spatial keys preserve local computation but need salting for airports, stadiums, and other hot cells; dense raw points also need short retention.",
    proof:
      "At 2M online drivers and 1 ping every 4 seconds, the platform must sustain roughly 500K driver GPS events/sec before rider telemetry and retries.",
  },
  {
    id: "surge-metrics",
    category: "streaming",
    question:
      "Design a system that calculates surge-pricing metrics for each geographic region in near real time.",
    position:
      "Key requests and available drivers by city and H3 cell, compute event-time supply-demand windows in Flink, smooth the ratio, and publish versioned regional metrics to an online store.",
    tradeoff:
      "Smaller cells and windows react faster but amplify sparse-data noise, so use minimum sample sizes, hysteresis, and bounded fallbacks.",
    proof:
      "Each result carries the window, watermark, supply count, demand count, model/config version, and freshness timestamp used by marketplace services.",
  },
  {
    id: "fraud-stream",
    category: "streaming",
    question:
      "How would you build a streaming pipeline to detect fraudulent trips or payments?",
    position:
      "Join trip, device, payment, and account signals in keyed Flink state, score rules and models, and route high-risk cases to a decision topic plus an auditable review stream.",
    tradeoff:
      "Blocking synchronously reduces loss but risks false declines; separate hard payment controls from softer trip-review signals and retain reason codes.",
    proof:
      "Signals can include impossible GPS movement, device reuse, repeated refund behavior, payment-token velocity, and rider-driver collusion patterns.",
  },
  {
    id: "driver-earnings",
    category: "streaming",
    question:
      "Design a pipeline that computes driver earnings and incentives accurately.",
    position:
      "Create an append-only earnings ledger from completed trips, fare components, tolls, tips, promotions, and adjustments, keyed by driver and earning transaction.",
    tradeoff:
      "Fast provisional balances improve the driver experience, but final payout amounts must wait for trip and payment reconciliation.",
    proof:
      "Every correction posts a compensating ledger entry; daily jobs reconcile driver earnings, processor settlements, and the official trip snapshot before payout.",
  },
  {
    id: "disordered-events",
    category: "streaming",
    question:
      "How would you process events arriving late, duplicated, or out of order?",
    position:
      "Use event-time watermarks, event_id deduplication, per-entity sequence numbers, and a legal trip-state machine with a correction stream for arrivals beyond the live window.",
    tradeoff:
      "Longer allowed lateness improves completeness but increases state, latency, and replay cost; the limit should vary by GPS, trip, and payment workload.",
    proof:
      "A delayed trip_completed event can repair Silver and restate Gold without letting an older driver_online event overwrite newer driver state.",
  },
  {
    id: "idempotent-retries",
    category: "streaming",
    question:
      "How would you guarantee idempotent processing when consumers retry events?",
    position:
      "Carry a stable event_id, checkpoint source offsets with state, and make each sink conditional on an idempotency key or atomic snapshot commit.",
    tradeoff:
      "Deduplication state cannot live forever, so business-critical ledgers need durable uniqueness constraints while telemetry can use bounded TTL state.",
    proof:
      "Payment effects key on payment transaction ID, current driver state uses sequence-aware upserts, and Iceberg jobs commit deterministic source offset ranges once.",
  },
  {
    id: "framework-choice",
    category: "streaming",
    question:
      "When would you choose Kafka, Flink, Spark Structured Streaming, or a batch-processing framework?",
    position:
      "Use Kafka for durable transport, Flink for low-latency event-time state, Spark Structured Streaming when lake-centric micro-batches are sufficient, and batch Spark for large deterministic recomputation.",
    tradeoff:
      "Fewer engines simplify operations, but forcing every workload into one engine can compromise latency, state handling, or replay efficiency.",
    proof:
      "Uber supply windows fit Flink; incremental Iceberg transformations may fit Structured Streaming; multi-day trip or payment backfills fit batch Spark on EMR.",
  },
  {
    id: "kafka-partition-strategy",
    category: "streaming",
    question:
      "How would you partition Kafka topics containing trip or location events?",
    position:
      "Partition trip lifecycle events by trip_id for ordering and location events by region + H3 cell + salt for spatial locality with hotspot control.",
    tradeoff:
      "No single key optimizes ordering, balance, and spatial aggregation, so use separate topics and re-key at explicit processing boundaries.",
    proof:
      "Payment topics can key by payment or trip transaction, while compacted driver-state topics key by driver_id because their access pattern is different.",
  },
  {
    id: "hot-partitions",
    category: "streaming",
    question:
      "What problems can hot Kafka partitions cause, and how would you prevent them?",
    position:
      "Hot partitions create broker saturation, consumer lag, uneven Flink load, long checkpoints, and delayed marketplace signals; detect skew and salt predictable hotspots.",
    tradeoff:
      "Adding salt improves balance but requires a downstream merge and weakens strict ordering across salts.",
    proof:
      "Use city + H3 + bounded salt, capacity-aware partition counts, producer batching, and lag/load alerts for airport or event-venue cells.",
  },
  {
    id: "canonical-envelope",
    category: "modeling",
    question:
      "How would you design a canonical event envelope that works across many producers and event types?",
    position:
      "Standardize identity, routing, ordering, lineage, time, schema, and privacy metadata in the envelope while keeping domain-specific fields in a typed payload.",
    tradeoff:
      "A shared envelope simplifies infrastructure but must not become a giant universal business schema owned by nobody.",
    proof:
      "Include event_id, event_type, event_version, event_time, ingest_time, producer, entity key, region, trace_id, sequence, PII class, and payload.",
  },
  {
    id: "schema-evolution",
    category: "modeling",
    question:
      "How would you manage schema evolution without breaking existing producers and consumers?",
    position:
      "Enforce compatibility in a schema registry, prefer additive optional fields, version semantic changes, and use canary producers with consumer contract tests.",
    tradeoff:
      "Strict compatibility slows risky releases but prevents one mobile version from poisoning shared topics and hundreds of downstream jobs.",
    proof:
      "Quarantine incompatible Uber app events with producer version and schema ID, alert the owner, then replay them after the parser or producer is fixed.",
  },
  {
    id: "lakehouse-design",
    category: "modeling",
    question:
      "Design a data lake or lakehouse for trips, payments, drivers, riders, and location data.",
    position:
      "Use S3 with Iceberg: immutable Bronze source records, validated Silver domain tables, and reconciled Gold facts and dimensions with a governed catalog.",
    tradeoff:
      "A lakehouse gives replay, schema evolution, and atomic snapshots but requires compaction, metadata maintenance, ownership, and access controls.",
    proof:
      "Keep trip, payment-ledger, driver-earning, rider, driver, and location grains separate and connect them through conformed identifiers and dimensions.",
  },
  {
    id: "lake-physical-design",
    category: "modeling",
    question:
      "How would you choose partitioning, clustering, and file formats for large trip datasets?",
    position:
      "Partition coarsely by event date/hour and region, cluster or sort by common filters such as city, H3, or trip_id, and store columnar Parquet behind Iceberg metadata.",
    tradeoff:
      "Fine partitions prune well but create tiny files and metadata pressure; high-cardinality identifiers belong in clustering, not directory partitions.",
    proof:
      "Trip facts commonly scan region-day ranges, while location investigations use city/H3/time and targeted trip reconstruction benefits from trip_id clustering.",
  },
  {
    id: "small-files",
    category: "modeling",
    question: "How would you solve the small-files problem in a data lake?",
    position:
      "Write through buffered tasks, compact recent partitions toward target file sizes, rewrite manifests, and schedule maintenance based on file-count and scan-cost thresholds.",
    tradeoff:
      "Frequent compaction improves reads but consumes compute and can conflict with active writers, so compact asynchronously and commit atomically.",
    proof:
      "Prioritize high-volume hourly location partitions and late-arriving trip partitions, then expire safe snapshots and remove orphan files under policy.",
  },
  {
    id: "data-lifecycle",
    category: "modeling",
    question:
      "How would you implement data retention, deletion, backfills, and historical reprocessing?",
    position:
      "Attach policy to each dataset and PII class, preserve source offsets and code versions, process deletions through lineage, and publish backfills as new reviewable snapshots.",
    tradeoff:
      "Long raw retention improves replay but raises location privacy and storage risk; deletion must also account for snapshots, indexes, replicas, and backups.",
    proof:
      "Retain dense GPS briefly, downsample older routes, apply Iceberg equality or position deletes, compact, expire snapshots, and promote corrected Gold only after reconciliation.",
  },
  {
    id: "realtime-and-daily",
    category: "reliability",
    question:
      "How would you design a pipeline that supports both real-time dashboards and accurate daily reports?",
    position:
      "Fan one Kafka event log into a Flink path for provisional seconds-fresh metrics and a lakehouse path for reconciled daily facts.",
    tradeoff:
      "Users see fast provisional numbers that may later change, so label freshness and finality and define when the daily snapshot becomes official.",
    proof:
      "City operations can watch current requests and supply, while finance consumes the 06:00 local Gold snapshot after trip, payment, and settlement checks pass.",
  },
  {
    id: "stream-batch-reconcile",
    category: "reliability",
    question:
      "How would you reconcile discrepancies between streaming and batch-generated metrics?",
    position:
      "Recompute the metric from immutable source ranges, compare by region and time bucket, attribute differences, and atomically restate only the affected Gold partitions.",
    tradeoff:
      "Automatic correction is fast but dangerous for financial metrics; use tolerances, evidence, approval, and versioned publication by metric tier.",
    proof:
      "Compare event counts, distinct IDs, watermarks, late-event totals, source offsets, and business totals such as completed trips and captured payments.",
  },
  {
    id: "quality-enforcement",
    category: "reliability",
    question:
      "How would you define and enforce data-quality checks across a large data platform?",
    position:
      "Combine schema contracts, row-level validity, uniqueness and referential checks, distribution monitoring, and business reconciliation with tiered publish gates.",
    tradeoff:
      "Blocking every anomaly hurts availability, so quarantine invalid records, fail certified financial outputs, and warn on lower-risk telemetry drift.",
    proof:
      "Validate legal trip transitions, GPS bounds and speed, payment uniqueness, completed-trip-to-capture coverage, and driver-earning-to-payout totals.",
  },
  {
    id: "observability",
    category: "reliability",
    question:
      "How would you monitor pipeline freshness, completeness, accuracy, throughput, and latency?",
    position:
      "Define SLOs per dataset and output, then instrument source rate, Kafka lag, watermark delay, processing latency, row counts, quality failures, and business reconciliation.",
    tradeoff:
      "Platform-wide telemetry can be noisy, so page on user-impacting SLO burn and route diagnostic signals to owning teams.",
    proof:
      "Trace an executive metric back through snapshot ID, job version, Kafka offsets, producer version, event_id, and raw payload without exposing restricted PII.",
  },
  {
    id: "trip-drop-investigation",
    category: "reliability",
    question:
      "How would you investigate a sudden drop in completed-trip counts on an executive dashboard?",
    position:
      "Start at the business slice, then walk backward through dashboard query, Gold snapshot, Silver transitions, processing lag, Kafka rates, and producer health.",
    tradeoff:
      "Do not immediately backfill: first distinguish a real marketplace drop from delayed data, schema rejection, bad filtering, or a partial regional publish.",
    proof:
      "Compare requests-to-completions by city and app version, last-good snapshot, late-event rate, DLQ volume, trip state transitions, and payment captures.",
  },
  {
    id: "backpressure",
    category: "reliability",
    question:
      "How would you handle backpressure when incoming traffic exceeds processing capacity?",
    position:
      "Let Kafka absorb bounded bursts, autoscale consumers, remove slow synchronous I/O, isolate workloads, and degrade optional enrichments before critical trip or payment processing.",
    tradeoff:
      "More buffering protects correctness but increases freshness delay and recovery time; shedding data is acceptable only for explicitly sampled telemetry.",
    proof:
      "Alert on lag growth and Flink backpressure, scale hot partitions and task slots, use async lookups, and preserve payment and trip lifecycle topics over low-value GPS detail.",
  },
  {
    id: "fault-tolerance",
    category: "reliability",
    question:
      "How would you achieve fault tolerance and recover from partial pipeline failures without losing or double-counting data?",
    position:
      "Replicate Kafka across AZs, checkpoint processing state, make sinks idempotent, retain replayable source ranges, and publish analytical outputs through atomic snapshots.",
    tradeoff:
      "Stronger durability and shorter recovery points cost latency and infrastructure; set RPO and RTO separately for GPS, trips, and payments.",
    proof:
      "Restore Flink from a checkpoint, replay retained offsets, dedupe by event_id, reconcile payment effects, and compare the candidate snapshot before promotion.",
  },
  {
    id: "data-protection",
    category: "reliability",
    question:
      "How would you protect sensitive rider, driver, payment, and location data while still enabling analytics?",
    position:
      "Classify fields, tokenize identities, isolate precise location and payment domains, enforce purpose-based access, and expose minimized analytical views.",
    tradeoff:
      "Stronger minimization reduces ad hoc flexibility, so provide approved aggregates and controlled re-identification rather than broad raw access.",
    proof:
      "Use encryption, service identities, row and column policies, dynamic masking, audit logs, regional residency, retention limits, and deletion lineage.",
  },
  {
    id: "self-service-platform",
    category: "foundations",
    question:
      "Design a self-service data platform that lets hundreds of Uber teams publish, discover, transform, and consume reliable datasets.",
    position:
      "Offer paved-road producer SDKs, schema and quality contracts, managed Kafka and compute templates, a governed catalog, lineage, orchestration, and standard serving interfaces.",
    tradeoff:
      "Self-service without guardrails creates incompatible datasets; central control without extensibility becomes a ticket queue, so enforce platform policy while teams own domain contracts.",
    proof:
      "A team registers owner, schema, PII class, keys, SLO, retention, and cost budget; CI validates the contract before provisioning topics, jobs, tables, and observability.",
  },
];

const REMOVED_BASE_QUESTIONS = new Set([
  "two-paths",
  "shared-truth",
  "partition-key",
  "partitions",
  "late-data",
  "flink-state",
  "backfill",
  "quality-slos",
  "privacy-delete",
  "schema-release",
]);

const RAW_QUESTIONS: Question[] = [
  ...REQUESTED_QUESTIONS,
  ...BASE_QUESTIONS.filter((item) => !REMOVED_BASE_QUESTIONS.has(item.id)),
];

const QUESTIONS: Question[] = RAW_QUESTIONS.map((question) => {
  const answer = UBER_INTERVIEW_ANSWERS[question.id];
  if (!answer) {
    throw new Error(`Missing reviewed interview answer for ${question.id}`);
  }
  return {
    ...question,
    position: answer.answer,
    tradeoff: answer.tradeoff,
    proof: answer.validation,
  };
});

const WHITEBOARD_PHASES = [
  {
    title: "Frame",
    color: C.blue,
    steps: [
      ["Define outputs", "Live marketplace signals and trusted history"],
      ["Set guarantees", "Freshness, correctness, privacy, and regional scope"],
    ],
  },
  {
    title: "Size",
    color: C.cyan,
    steps: [
      ["Estimate traffic", "GPS, trip lifecycle, rider, and payment events"],
      ["Calculate capacity", "Peak events/sec, throughput, and retention"],
    ],
  },
  {
    title: "Draw",
    color: C.amber,
    steps: [
      ["Build the backbone", "Producers to regional Kafka"],
      ["Split the paths", "Flink for seconds; lakehouse for trusted history"],
    ],
  },
  {
    title: "Deep dive",
    color: C.cyan,
    steps: [
      ["Defend the keys", "Salted H3 partitioning and event-time state"],
      ["Define the truth", "Layer contracts, fact grains, and reconciliation"],
    ],
  },
  {
    title: "Close",
    color: C.green,
    steps: [
      ["Prove resilience", "Quality SLOs, replay, privacy, and regional DR"],
      ["State trade-offs", "Cost, complexity, and one failure end to end"],
    ],
  },
] as const;

function Anchors({ active, go }: { active: string; go: (id: string) => void }) {
  return (
    <aside className="hidden w-[232px] shrink-0 xl:block">
      <div
        data-testid="anchor-rail"
        className="fixed bottom-4 top-[140px] z-30 w-[200px] overflow-y-auto pr-1"
        style={{ left: "max(16px, calc((100vw - 1600px) / 2 + 16px))" }}
      >
        <AnchorBrand />
        <p
          className="mb-3 text-[10px] font-bold uppercase tracking-[.2em]"
          style={{ color: C.muted }}
        >
          Page anchors
        </p>
        <div className="space-y-2">
          {UBER_INTERVIEW_SECTIONS.map((section, index) => {
            const selected = section.id === active;
            return (
              <button
                key={section.id}
                data-testid={`stage-nav-${section.id}`}
                aria-current={selected ? "location" : undefined}
                onClick={() => go(section.id)}
                className="relative flex h-[54px] w-full items-center gap-3 rounded-md border px-3 text-left text-sm font-semibold"
                style={{
                  borderColor: selected ? C.blue : C.border,
                  background: selected
                    ? "color-mix(in srgb, #526b82 13%, var(--bg-card))"
                    : C.card,
                  color: selected ? C.text : C.muted,
                }}
              >
                {selected ? (
                  <span
                    className="absolute inset-y-0 left-0 w-1"
                    style={{ background: C.blue }}
                  />
                ) : null}
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    background: selected ? C.blue : C.card2,
                    color: selected ? "white" : C.muted,
                  }}
                >
                  {index + 1}
                </span>
                {section.title}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function Section({
  id,
  title,
  intro,
  color,
  children,
}: {
  id: string;
  title: string;
  intro: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-[24px] border p-5 md:p-6"
      style={{
        borderColor: `${color}3d`,
        background: C.card,
        scrollMarginTop: 140,
      }}
    >
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p
        className="mt-2 max-w-4xl text-sm leading-6"
        style={{ color: C.muted }}
      >
        {intro}
      </p>
      {children}
    </section>
  );
}

function QuestionBank() {
  const [category, setCategory] = useState<CategoryId>("foundations");
  const categoryQuestions = QUESTIONS.filter(
    (item) => item.category === category,
  );
  const [selectedId, setSelectedId] = useState(categoryQuestions[0].id);
  const selected =
    QUESTIONS.find((item) => item.id === selectedId) ?? categoryQuestions[0];
  const chooseCategory = (id: CategoryId) => {
    setCategory(id);
    const first = QUESTIONS.find((item) => item.category === id);
    if (first) setSelectedId(first.id);
  };
  const accent =
    CATEGORIES.find((item) => item.id === category)?.color ?? C.blue;
  return (
    <div
      className="mt-5 overflow-hidden rounded-2xl border"
      style={{ borderColor: C.border, background: C.card2 }}
    >
      <div
        className="grid gap-2 border-b p-3 sm:grid-cols-4"
        style={{ borderColor: C.border }}
      >
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            onClick={() => chooseCategory(item.id)}
            className="rounded-md border px-3 py-2 text-sm font-semibold"
            style={{
              borderColor: item.color,
              background: category === item.id ? `${item.color}20` : C.card,
              color: category === item.id ? C.text : C.muted,
            }}
          >
            {item.label}
            <span className="ml-2 text-[10px]" style={{ color: item.color }}>
              {QUESTIONS.filter((q) => q.category === item.id).length}
            </span>
          </button>
        ))}
      </div>
      <div className="grid lg:grid-cols-[minmax(290px,38%)_1fr]">
        <div
          className="border-b p-3 lg:border-b-0 lg:border-r"
          style={{ borderColor: C.border }}
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {categoryQuestions.map((item, index) => (
              <button
                key={item.id}
                data-testid="interview-question"
                onMouseEnter={() => setSelectedId(item.id)}
                onFocus={() => setSelectedId(item.id)}
                onClick={() => setSelectedId(item.id)}
                className="flex min-h-[54px] items-start gap-3 rounded-md border px-3 py-2.5 text-left"
                style={{
                  borderColor: selected.id === item.id ? accent : C.border,
                  background: selected.id === item.id ? `${accent}16` : C.card,
                }}
              >
                <span
                  className="mt-0.5 text-[10px] font-bold"
                  style={{ color: accent }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-xs font-medium leading-5">
                  {item.question}
                </span>
              </button>
            ))}
          </div>
        </div>
        <aside data-testid="interview-answer" className="self-center p-5">
          <p
            className="text-[10px] font-bold uppercase tracking-[.14em]"
            style={{ color: accent }}
          >
            Interview answer
          </p>
          <h3 className="mt-2 text-xl font-semibold leading-7">
            {selected.question}
          </h3>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ["Proposed design", selected.position],
              ["Critical trade-off", selected.tradeoff],
              ["How I would validate", selected.proof],
            ].map(([label, text], index) => (
              <div
                key={label}
                className="border-t-2 pt-3"
                style={{
                  borderColor:
                    index === 0 ? accent : index === 1 ? C.amber : C.green,
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase"
                  style={{
                    color:
                      index === 0 ? accent : index === 1 ? C.amber : C.green,
                  }}
                >
                  {label}
                </p>
                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: C.muted }}
                >
                  {text}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function WhiteboardOrder() {
  return (
    <div
      className="mt-5 overflow-hidden rounded-2xl border"
      style={{ borderColor: C.border, background: C.card2 }}
    >
      <div className="grid lg:grid-cols-5">
        {WHITEBOARD_PHASES.map((phase, phaseIndex) => (
          <div
            key={phase.title}
            className="relative border-b p-4 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"
            style={{ borderColor: C.border }}
          >
            <div className="mb-5 flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: phase.color }}
              >
                {phaseIndex + 1}
              </span>
              <h3 className="text-sm font-semibold">{phase.title}</h3>
            </div>
            <div
              className="relative space-y-5 border-l pl-4"
              style={{ borderColor: `${phase.color}66` }}
            >
              {phase.steps.map(([title, detail], stepIndex) => (
                <div key={title} className="relative min-h-[72px]">
                  <span
                    className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2"
                    style={{ borderColor: phase.color, background: C.card2 }}
                  />
                  <p className="text-xs font-semibold">{title}</p>
                  <p
                    className="mt-1 text-xs leading-5"
                    style={{ color: C.muted }}
                  >
                    {detail}
                  </p>
                  <span className="sr-only">
                    Step {phaseIndex * 2 + stepIndex + 1}
                  </span>
                </div>
              ))}
            </div>
            {phaseIndex < WHITEBOARD_PHASES.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border text-sm lg:flex"
                style={{
                  borderColor: phase.color,
                  background: C.card,
                  color: phase.color,
                }}
              >
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InterviewQATab() {
  const [active, setActive] = useState<string>(UBER_INTERVIEW_SECTIONS[0].id);
  const lock = useRef<number | null>(null);
  useEffect(() => {
    const sync = () => {
      if (lock.current) return;
      const nodes = UBER_INTERVIEW_SECTIONS.map((section) => {
        const node = document.getElementById(section.id);
        return node
          ? { id: section.id, top: node.getBoundingClientRect().top }
          : null;
      }).filter((item): item is NonNullable<typeof item> => item !== null);
      if (nodes.length)
        setActive(
          nodes.reduce((a, b) =>
            Math.abs(b.top - 180) < Math.abs(a.top - 180) ? b : a,
          ).id,
        );
    };
    sync();
    addEventListener("scroll", sync, { passive: true });
    return () => removeEventListener("scroll", sync);
  }, []);
  const go = (id: string) => {
    const node = document.getElementById(id);
    if (!node) return;
    if (lock.current) clearTimeout(lock.current);
    history.replaceState(null, "", `/data-engineering/uber/quiz#${id}`);
    setActive(id);
    scrollTo({
      top: node.getBoundingClientRect().top + scrollY - 140,
      behavior: "smooth",
    });
    lock.current = window.setTimeout(() => {
      setActive(id);
      lock.current = null;
    }, 700);
  };
  return (
    <>
      <Anchors active={active} go={go} />
      <div className="space-y-5 xl:pl-[232px]">
        <header
          className="border-l-4 py-2 pl-5"
          style={{ borderColor: C.blue }}
        >
          <h1 className="text-3xl font-semibold">
            Uber Data Engineering Interview Q&amp;A
          </h1>
          <p className="mt-2 text-sm leading-6" style={{ color: C.muted }}>
            Practice a proposed design, its critical trade-off, and a concrete
            way to validate it.
          </p>
        </header>
        <Section
          id="question-bank"
          title="Question bank"
          intro={`${QUESTIONS.length} likely follow-ups grouped by the part of the design an interviewer will challenge.`}
          color={C.blue}
        >
          <QuestionBank />
        </Section>
        <Section
          id="whiteboard-order"
          title="Whiteboard order"
          intro="Move left to right from requirements to architecture, then close with operational proof and explicit trade-offs."
          color={C.green}
        >
          <WhiteboardOrder />
        </Section>
        <nav
          aria-label="Chapter navigation"
          className="flex items-center border-t pt-4"
          style={{ borderColor: C.border }}
        >
          <Link
            href="/data-engineering/uber/governance-quality"
            className="rounded-md border px-4 py-3 text-sm font-semibold"
            style={{ borderColor: C.border, background: C.card }}
          >
            ← Failures + Data Quality
          </Link>
        </nav>
      </div>
    </>
  );
}
