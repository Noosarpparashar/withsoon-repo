"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BATCH_LAKEHOUSE_SECTIONS } from "./data";
import { Section, YouTubeFrame } from "./shared";

type Explainable = {
  id: string;
  title: string;
  short: string;
  detail: string;
  example: string;
};

type ExplanationGuide = { purpose: string; result: string };

type TipPosition = { left: number; top: number; above: boolean };

const EXPLANATION_GUIDE: Record<string, ExplanationGuide> = {
  sources: {
    purpose: "YouTube behavior and business context come from different systems. This boundary makes every producer, delivery position, and metadata snapshot explicit before those records are combined.",
    result: "A closed, reproducible input inventory containing event ranges, CDC snapshot IDs, governed files, schema versions, and owning producer teams.",
  },
  bronze: {
    purpose: "Processing bugs and changing metric rules require the platform to replay history from evidence that has not already been cleaned, joined, or aggregated.",
    result: "Append-only Bronze Iceberg rows that preserve the source payload and delivery coordinates needed for audit, debugging, and backfill.",
  },
  contract: {
    purpose: "Malformed client data must be isolated before it reaches shared session, revenue, or metric calculations, while still remaining available for investigation and replay.",
    result: "Two explicit outputs: contract-valid records for Silver and quarantined records carrying the failed rule, producer version, and replay status.",
  },
  silver: {
    purpose: "Raw delivery records are not yet safe to join or count. Silver creates one reusable interpretation of events, identities, timestamps, dimensions, and playback sessions.",
    result: "Deduplicated event facts and versioned watch sessions with trusted measures, conformed keys, consent scope, quality flags, and Bronze lineage.",
  },
  trust: {
    purpose: "A technically valid play or ad event may still be ineligible for public counts, recommendations, billing, or creator payouts because of abuse, rights, or policy decisions.",
    result: "Versioned eligibility and adjustment records explaining which metric families may consume each piece of otherwise valid evidence.",
  },
  "gold-stage": {
    purpose: "Business metrics must be calculated and tested as one complete candidate before any consumer can observe them. Staging separates computation from publication.",
    result: "An isolated Gold snapshot at declared video, channel, geography, date, and metric-version grains, ready for reconciliation and quality checks.",
  },
  certify: {
    purpose: "A successful Spark or Iceberg commit proves only that data was written. Certification proves the inputs, business meaning, comparisons, and finance balances are acceptable.",
    result: "A pass or block decision with test evidence, explained deltas, approvals, ownership, and a reference to the candidate snapshot.",
  },
  published: {
    purpose: "All consumers must move to the same complete version at one boundary; exposing partitions gradually would create contradictory totals across dashboards and models.",
    result: "One certified release, a stable consumer pointer, a retained rollback snapshot, refreshed dependencies, and a cataloged release record.",
  },
  "object-storage": {
    purpose: "YouTube event history is too large and long-lived for an operational database. Decoupled storage keeps durable data inexpensive while compute scales independently.",
    result: "A durable object namespace holding raw and derived Parquet files that multiple governed engines can process without copying the full dataset.",
  },
  parquet: {
    purpose: "Analytical jobs usually need a small subset of columns across many rows. A row-oriented payload format would waste network, CPU, and scan capacity.",
    result: "Compressed columnar files with statistics that enable projection, predicate pushdown, vectorized reads, and lower scan cost.",
  },
  iceberg: {
    purpose: "Loose Parquet files do not provide atomic table changes, consistent snapshots, schema history, or safe concurrent readers and writers.",
    result: "Transactional table metadata that identifies exact files for each snapshot and supports time travel, evolution, MERGE, rollback, and incremental reads.",
  },
  "bronze-contract": {
    purpose: "Every replay needs a stable definition of what one raw row represents and which source metadata must survive ingestion.",
    result: "One delivered-record grain with the faithful envelope, source coordinates, schema and privacy metadata, and no promise of business validity.",
  },
  "silver-contract": {
    purpose: "Views, retention, QoE, experimentation, and ML should reuse the same validated playback interpretation instead of cleaning raw events independently.",
    result: "A documented session-grain table whose measures and keys are safe to join and whose every record can be traced back to Bronze.",
  },
  "gold-contract": {
    purpose: "Dashboards and models need stable business grains and versioned definitions so the same metric name cannot silently mean different things.",
    result: "A certified consumer data product with unique keys, governed measures, publication status, semantic version, and complete reproducibility metadata.",
  },
  views: {
    purpose: "The responsive live counter intentionally trades completeness for speed. A later process must produce the durable count used for reporting and historical comparison.",
    result: "Certified qualified-view totals at video-day and related grains, together with the rule version and adjustment trail.",
  },
  watch: {
    purpose: "Raw heartbeats describe playback progress but cannot directly answer how long people watched or where audiences left a video.",
    result: "Validated watch time, completion, unique coverage, and compact retention-curve buckets by video and reporting period.",
  },
  growth: {
    purpose: "Creator growth requires connecting watch behavior, engagement, subscription changes, and historical channel ownership without losing point-in-time meaning.",
    result: "Certified returning-viewer, retention, churn, subscriber-change, and content-performance measures at explicit channel and date grains.",
  },
  money: {
    purpose: "Monetization affects advertiser billing and creator payment, so provisional ad events must be reconciled with eligibility, adjustments, and financial records.",
    result: "Auditable revenue, RPM, CPM, ad-performance, billing, and payout datasets with stronger approval and reconciliation evidence.",
  },
  ml: {
    purpose: "Training data must not leak facts that became known after a prediction. It also needs reproducible labels and the same semantics used by production metrics.",
    result: "Point-in-time-correct examples containing versioned features, labels, eligibility, observation timestamps, and source snapshot references.",
  },
  partition: {
    purpose: "Most batch work reads bounded dates and late events correct bounded dates. Date partitioning limits how much data is scanned and replaced.",
    result: "Prunable event-date partitions that can be rebuilt independently without creating a partition for every video or channel.",
  },
  secondary: {
    purpose: "Exceptionally large date partitions may still scan too much data, but unnecessary sub-partitioning creates small files and expensive metadata.",
    result: "An optional coarse geography or content-format transform applied only where measured query and file-size patterns justify it.",
  },
  compact: {
    purpose: "Frequent streaming commits and viral traffic can create thousands of tiny files, increasing catalog work and making batch scans inefficient.",
    result: "Fewer Parquet files near the chosen target size, plus writer settings that reduce future small-file creation.",
  },
  cluster: {
    purpose: "Creator and video queries need locality inside a date partition without turning high-cardinality identifiers into physical partitions.",
    result: "Files ordered or clustered by video_id and channel_id so engines skip unrelated row groups and files during common filters.",
  },
  "phase-ready": {
    purpose: "A daily metric is wrong if any required source is missing, even when every transformation later succeeds. Readiness establishes a trustworthy input boundary.",
    result: "A verified closed window whose expected Kafka offsets, CDC snapshots, and governed files are complete and contract-compatible.",
  },
  "source-ready": {
    purpose: "The scheduler needs a data-ready signal from ingestion; a clock alone cannot know whether producers and sinks have finished a business window.",
    result: "A discovered completion manifest that freezes the exact source boundaries the rest of this DAG must use.",
  },
  "source-coverage": {
    purpose: "A manifest is a claim about completeness. The pipeline must compare that claim with readable Kafka ranges, snapshots, and files before trusting it.",
    result: "Per-source completeness evidence, accepted input snapshot references, and an explicit wait or failure when ranges are missing or overlapping.",
  },
  "bronze-contracts": {
    purpose: "Schema drift and malformed records should fail close to the producer rather than appearing later as mysterious session or revenue errors.",
    result: "Validated Bronze inputs, quarantine counts by reason and producer version, and a clear decision about whether processing may continue.",
  },
  "phase-build": {
    purpose: "Downstream products need shared trusted evidence, not separate copies of raw-cleaning logic embedded in every dashboard and model.",
    result: "Reusable Silver events and sessions with consistent time, identity, consent, dimension, quality, and trust semantics.",
  },
  "silver-events": {
    purpose: "At-least-once delivery, multiple client versions, and device clocks create duplicates and inconsistent representations of the same event.",
    result: "One canonical accepted event per event_id, plus dedupe state, normalized fields, rejected-record reasons, and source lineage.",
  },
  "watch-sessions": {
    purpose: "A collection of heartbeats does not directly represent a viewing attempt. Events must be ordered and validated before watch measures can be trusted.",
    result: "One versioned playback-attempt record with start and end state, watch_seconds, completion, coverage, anomalies, and qualification outcome.",
  },
  "identity-consent": {
    purpose: "Joining every identifier would create privacy violations and unstable audience counts. Identity resolution must be scoped to the permitted analytical use.",
    result: "Consent-aware viewer keys and reversible identity links, or an UNKNOWN/anonymous scope where a lawful join is unavailable.",
  },
  "trust-adjust": {
    purpose: "Data can be structurally valid while remaining ineligible for a specific metric because of abuse, content rights, privacy, or monetization policy.",
    result: "Metric-family eligibility, adjustment amount, reason, decision owner, and policy/model version attached to the relevant evidence.",
  },
  "phase-validate": {
    purpose: "Candidate aggregates must demonstrate both technical quality and business correctness before replacing values that users and finance already consume.",
    result: "A tested Gold candidate with matching stream comparison, explained changes, finance evidence, and a publish-or-block decision.",
  },
  "gold-candidate": {
    purpose: "Certification must evaluate the exact rows intended for release, isolated from both temporary partial results and the currently published version.",
    result: "A run-scoped set of complete Gold tables at declared grains, tagged with input, code, and metric versions.",
  },
  reconcile: {
    purpose: "Streaming values are fast but incomplete; batch values are slower and complete. Their difference must be understood before historical replacement.",
    result: "A grain-aligned comparison containing absolute and relative delta, explained reason components, and any unexplained remainder.",
  },
  "metric-tests": {
    purpose: "Correct schemas do not guarantee correct YouTube metrics or balanced financial outputs. Product-specific checks guard the publication boundary.",
    result: "Recorded outcomes for structural, semantic, statistical, freshness, reconciliation, and finance checks, including blocking failures and owners.",
  },
  "phase-publish": {
    purpose: "A validated candidate creates value only when all consumers receive it consistently and can identify, trace, and reverse the release.",
    result: "An atomically visible certified snapshot, refreshed serving dependencies, complete lineage, targeted notification, and rollback reference.",
  },
  "atomic-publish": {
    purpose: "Replacing date partitions one by one would let consumers observe a mixture of old and new calculations during the release.",
    result: "One metadata-level pointer change that makes the entire candidate visible at once while preserving the prior snapshot.",
  },
  "serving-refresh": {
    purpose: "Low-latency stores and marts may materialize Gold data, but rebuilding every consumer after every release wastes capacity and increases failure scope.",
    result: "Only the declared indexes, marts, caches, features, and reports dependent on the changed product are refreshed.",
  },
  "lineage-update": {
    purpose: "Operators and analysts must be able to answer which sources, code, definitions, and checks produced any certified number.",
    result: "A catalog graph connecting Bronze inputs, Silver evidence, Gold outputs, code and metric versions, run parameters, tests, and owners.",
  },
  "release-notice": {
    purpose: "Consumers need a machine-readable signal that a new version is ready and a human-readable summary when values materially change.",
    result: "A targeted release event containing version, freshness, affected products, explained deltas, owner, and rollback reference.",
  },
  incremental: {
    purpose: "Reprocessing all YouTube history for each late event or dimension change would be too slow and expensive.",
    result: "A bounded rebuild plan listing affected event dates, playback attempts, videos, channels, and dependent Gold partitions.",
  },
  idempotent: {
    purpose: "Retries are normal in distributed batch systems. A retry must repair or reproduce output rather than append another copy of it.",
    result: "Deterministic Silver and Gold rows whose target partitions can be safely replaced and whose rerun checksums remain stable for fixed inputs.",
  },
  orchestration: {
    purpose: "Dependencies, readiness, retries, timeouts, quality decisions, and notifications need one durable control plane across independent compute jobs.",
    result: "A stateful DAG run with task status, retry history, SLAs, input and output references, alerts, and accountable ownership.",
  },
  dbt: {
    purpose: "Warehouse transformations and tests benefit from reviewable SQL, modular dependencies, generated documentation, and column-level lineage.",
    result: "Version-controlled Gold and mart models with reusable tests and a dependency graph, while Spark retains the heavy event-processing work.",
  },
  stage: {
    purpose: "Quality checks must run against a complete release candidate without changing the data currently trusted by consumers.",
    result: "An isolated candidate snapshot or branch associated with one run_id and inaccessible through certified consumer views.",
  },
  record: {
    purpose: "A metric cannot be reproduced if its exact source snapshots, logic version, and runtime parameters are missing.",
    result: "An immutable run manifest linking the candidate to Kafka ranges, source snapshots, code SHA, metric version, and parameters.",
  },
  test: {
    purpose: "The platform needs evidence that the candidate is structurally complete, statistically plausible, fresh, joinable, and consistent with business systems.",
    result: "A quality report with pass/fail status, observed values, thresholds, affected rows, severity, owner, and blocking decision for every check.",
  },
  compare: {
    purpose: "Large changes may represent real audience behavior, a legitimate correction, or a pipeline defect. Comparison makes that distinction explicit.",
    result: "A change report against the streaming window and prior certified snapshot, including reason-attributed and unexplained deltas.",
  },
  approve: {
    purpose: "High-impact financial, regulatory, and unusually large metric changes require accountable human judgment beyond automated thresholds.",
    result: "A recorded approval or rejection containing reviewer, timestamp, evidence, scope, and any conditions attached to publication.",
  },
  promote: {
    purpose: "Consumers require a single, consistent publication boundary after every technical and ownership check succeeds.",
    result: "The stable certified pointer references the candidate snapshot in one atomic operation, and the former pointer becomes the rollback target.",
  },
  retain: {
    purpose: "Semantic defects may be discovered after release, so recovery must not depend on recomputing the previous known-good result under pressure.",
    result: "A retained prior snapshot and release manifest available for immediate rollback until policy permits expiration.",
  },
  release: {
    purpose: "Publication must tell downstream systems exactly what changed and refresh only consumers that declared a dependency on that product.",
    result: "A release event, targeted refreshes, freshness update, consumer notifications, and a traceable rollback reference.",
  },
  "stream-window": {
    purpose: "The comparison needs a frozen representation of what users saw in real time; a continuously changing counter cannot be reconciled reliably.",
    result: "A provisional value fixed at a specific entity grain, event-time window, timezone, watermark, and metric version.",
  },
  "batch-window": {
    purpose: "The durable comparison side must include complete retained evidence, late arrivals, exact deduplication, point-in-time dimensions, and reviewed adjustments.",
    result: "A complete batch candidate expressed at exactly the same grain, window, timezone, and metric version as the frozen stream value.",
  },
  match: {
    purpose: "Two values with different boundaries or definitions can differ even when both are individually correct; comparing them would create a false incident.",
    result: "A validated comparison key containing entity, event-time start and end, timezone, grain, filters, and semantic version.",
  },
  ledger: {
    purpose: "Overwriting a live estimate without explaining the change hides data-quality defects and leaves creators, finance, and operators unable to defend the number.",
    result: "A delta equation whose duplicate, late, validity, and qualification components add to the observed difference, plus any explicit unexplained remainder.",
  },
  decision: {
    purpose: "Small explained corrections can proceed automatically, while large, unexplained, or financial changes require investigation and ownership.",
    result: "An auto-pass, owner-review, or block outcome with threshold, evidence, severity, and the certified snapshot that remains visible meanwhile.",
  },
  correction: {
    purpose: "Once validated, the complete batch result must replace the historical estimate consistently and communicate why users may see a changed value.",
    result: "A new certified historical value, retained prior version, reason-coded correction record, and refreshed dependent consumers.",
  },
  absolute: {
    purpose: "The raw size and direction of a correction are needed for accounting, alerting, and verifying that individual reason components add up.",
    result: "A signed difference in the metric’s native unit, such as views, watch seconds, unique viewers, or currency.",
  },
  relative: {
    purpose: "The same absolute change can be immaterial for a viral video and severe for a small channel, so the difference must be normalized.",
    result: "A signed percentage with an explicit zero-denominator policy, suitable for scale-aware thresholds and alerts.",
  },
  duplicate: {
    purpose: "At-least-once transport retries can inflate provisional counts even though no additional viewer action occurred.",
    result: "The number and metric impact of repeated event_ids accepted once by Silver, traceable to their original delivery coordinates.",
  },
  late: {
    purpose: "Mobile offline behavior and delayed upstream systems legitimately deliver evidence after the streaming watermark but before batch certification.",
    result: "The metric contribution of valid late events and late dimensions assigned back to their original event-time windows.",
  },
  invalid: {
    purpose: "Fraud, bot, rights, privacy, and monetization decisions may arrive after provisional computation and must be reflected before certification.",
    result: "A signed metric adjustment grouped by decision reason, policy or model version, owner, and affected entity/window.",
  },
  qualification: {
    purpose: "Accepted playback evidence is not automatically a counted business event; metric eligibility depends on a governed and versioned definition.",
    result: "The amount excluded because the evidence failed the applicable qualification rule, without deleting its value for permitted diagnostic uses.",
  },
};

function FloatingCard({
  item,
  children,
  className = "",
}: {
  item: Explainable;
  children: ReactNode;
  className?: string;
}) {
  const [position, setPosition] = useState<TipPosition | null>(null);

  const show = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const width = Math.min(460, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12));
    if (window.innerWidth < 640) {
      setPosition({ left: 12, top: 12, above: false });
      return;
    }
    const expectedHeight = 285;
    const roomBelow = window.innerHeight - rect.bottom;
    const above = roomBelow < expectedHeight && rect.top > expectedHeight;
    const top = roomBelow < expectedHeight && rect.top <= expectedHeight ? 12 : above ? rect.top - 10 : rect.bottom + 10;
    setPosition({ left, top, above });
  };

  const guide = EXPLANATION_GUIDE[item.id] ?? {
    purpose: `Make ${item.short.toLowerCase()} explicit and testable in the pipeline.`,
    result: `A documented ${item.title.toLowerCase()} result that the next stage can consume safely.`,
  };

  const tooltip = position && typeof document !== "undefined"
    ? createPortal(
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[100] max-h-[calc(100vh-24px)] w-[min(460px,calc(100vw-24px))] overflow-y-auto rounded-lg border border-[#9aabba] bg-white px-4 py-3 text-left shadow-[0_14px_34px_rgba(23,32,43,.20)]"
          style={{ left: position.left, top: position.top, transform: position.above ? "translateY(-100%)" : undefined }}
        >
          <div className="flex items-center justify-between gap-3">
            <strong className="text-sm text-[#17202b]">{item.title}</strong>
            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#687b8d]">Explanation</span>
          </div>
          <p className="mt-2.5 text-xs leading-5 text-[#445464]">{item.detail}</p>
          <p className="mt-2 border-t border-[#d6e1eb] pt-2 text-xs leading-5 text-[#445464]">{guide.result} <strong className="text-[#17202b]">For example, </strong>{item.example}</p>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        type="button"
        onMouseEnter={(event) => show(event.currentTarget)}
        onMouseLeave={() => setPosition(null)}
        onFocus={(event) => show(event.currentTarget)}
        onBlur={() => setPosition(null)}
        className={`cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#70879b] ${className}`}
      >
        {children}
      </button>
      {tooltip}
    </>
  );
}

const ARCHITECTURE: readonly Explainable[] = [
  {
    id: "sources",
    title: "Events + CDC",
    short: "Playback, ads, engagement, metadata",
    detail: "Kafka carries high-volume behavioral events while CDC and governed files carry video, channel, rights, policy, campaign, and monetization changes. The ingestion layer closes each processing window with the exact Kafka offsets and source snapshots that landed.",
    example: "A playback heartbeat and a later channel-monetization change arrive through different producers, but both receive immutable source coordinates before batch processing starts.",
  },
  {
    id: "bronze",
    title: "Bronze",
    short: "Immutable replay evidence",
    detail: "Write every accepted source record to Iceberg without changing its business meaning. Keep the original envelope, event and ingestion timestamps, topic, partition, offset, schema version, privacy tags, and any quarantine reason.",
    example: "bronze.playback_heartbeat retains a retried heartbeat twice because Bronze preserves delivery evidence; Silver decides which event_id is the duplicate.",
  },
  {
    id: "contract",
    title: "Contract Gate",
    short: "Structure before semantics",
    detail: "Check required identifiers, supported schema versions, timestamp bounds, field types, and producer ownership. Valid rows continue; malformed or unknown records move to quarantine with a reason and remain replayable after correction.",
    example: "A client sends played_delta_ms as an invalid string. The record enters the DLQ instead of corrupting watch-time totals or disappearing silently.",
  },
  {
    id: "silver",
    title: "Silver",
    short: "Validated event and session facts",
    detail: "Parse and type fields, deduplicate event_id, normalize event time, sessionize starts and heartbeats, apply consent scope, conform video and channel keys, and retain record-level lineage to Bronze.",
    example: "silver.watch_sessions produces one versioned playback attempt with validated watch_seconds, completion_ratio, and the applicable qualified-view decision.",
  },
  {
    id: "trust",
    title: "Trust + Safety",
    short: "Versioned validity decisions",
    detail: "Join fraud, bot, rights, policy, and monetization decisions to Silver evidence. Adjustments carry a decision version and reason so excluded views, engagement, and revenue can be audited and reproduced.",
    example: "A coordinated replay cluster remains visible as evidence but is excluded from certified metrics using the fraud-model version active for that publication.",
  },
  {
    id: "gold-stage",
    title: "Gold Staging",
    short: "Candidate business metrics",
    detail: "Aggregate trusted evidence at explicit grains such as video × channel × geography × day × metric_version. Write to an isolated run-scoped snapshot that no dashboard can read yet.",
    example: "The candidate contains daily views, watch time, audience retention, engagement, revenue, RPM, and CPM before it becomes visible in Creator Studio.",
  },
  {
    id: "certify",
    title: "Certification Gate",
    short: "Completeness, tests, reconciliation",
    detail: "Verify source completeness, keys, uniqueness, nulls, distributions, freshness, metric semantics, finance balances, and stream-to-batch differences. Failure leaves the current certified snapshot untouched and alerts its owner.",
    example: "An unexplained revenue drop blocks promotion even when the Iceberg write itself committed successfully.",
  },
  {
    id: "published",
    title: "Certified Snapshot",
    short: "Atomic release to consumers",
    detail: "Atomically move the stable table or view pointer to the validated snapshot, preserve the previous version for rollback, record the release, and refresh only dependent consumers.",
    example: "Creator Studio, BI, finance, recommendation features, and ML training jobs all observe the same complete metric version.",
  },
] as const;

const STORAGE: readonly Explainable[] = [
  {
    id: "object-storage",
    title: "Object Storage",
    short: "S3 / GCS / ADLS",
    detail: "Use durable, inexpensive object storage as the physical home for the one replayable copy of YouTube event history and derived tables. Compute remains independent and can scale only when a job runs.",
    example: "A historical watch-time backfill reads the retained objects without restoring data from an operational database.",
  },
  {
    id: "parquet",
    title: "Parquet",
    short: "Columnar analytics files",
    detail: "Store table data in columnar files so engines read only requested columns, use compression effectively, and push video, channel, geography, and date predicates down to file scans.",
    example: "A Creator Studio query for video_id, date, views, and watch_time does not read unused heartbeat payload columns.",
  },
  {
    id: "iceberg",
    title: "Apache Iceberg",
    short: "Table transactions + history",
    detail: "Manage Parquet files with ACID snapshots, time travel, schema evolution, hidden partitioning, MERGE/upserts, and safe concurrent readers. Delta and Hudi are alternatives; this design selects Iceberg.",
    example: "A backfill writes a new snapshot and can be validated or rolled back without exposing partially replaced date partitions.",
  },
] as const;

const LAYERS: readonly Explainable[] = [
  {
    id: "bronze-contract",
    title: "Bronze Contract",
    short: "bronze.playback_heartbeat",
    detail: "Grain is one delivered source record. Required fields include the faithful envelope, ingestion metadata, source partition and offset, producer schema version, privacy classification, and quarantine status.",
    example: "Guarantee: replayable source fidelity. It does not promise deduplication, valid sessions, or a counted view.",
  },
  {
    id: "silver-contract",
    title: "Silver Contract",
    short: "silver.watch_sessions",
    detail: "Grain is one versioned playback attempt. Store typed business fields, dedupe status, normalized timestamps, identity scope, conformed keys, metric-semantics version, quality flags, and Bronze lineage.",
    example: "Guarantee: validated, consent-aware, joinable evidence that can be reused by daily metrics, retention curves, and training datasets.",
  },
  {
    id: "gold-contract",
    title: "Gold Contract",
    short: "gold.daily_video_metrics",
    detail: "Grain is video × date × metric_version. Publish stable measures, certification status, publication timestamp, input snapshot IDs, code version, and parameters needed for reproduction.",
    example: "Guarantee: a decision-ready data product with one certified definition shared by Creator Studio, BI, finance, and ML.",
  },
] as const;

const OUTPUTS: readonly Explainable[] = [
  { id: "views", title: "Certified Views", short: "Deduped + policy checked", detail: "Rebuild counted views from accepted playback evidence, remove retry duplicates, apply the versioned qualified-view rule, and subtract invalid activity before publication.", example: "A video’s live counter remains responsive during the day; its certified video-day value replaces that estimate after the batch closes." },
  { id: "watch", title: "Watch Quality", short: "Time + retention curves", detail: "Combine ordered playback progress into trusted watch time, completion, and audience-retention buckets without querying raw heartbeats for every report.", example: "A creator sees the timestamp range where viewers leave a long-form video and the certified watch hours behind that curve." },
  { id: "growth", title: "Audience Growth", short: "Returning viewers + subscribers", detail: "Combine certified watch, engagement, subscriptions, and point-in-time channel history to measure retention, churn, subscriber growth, and content performance.", example: "A subscription is attributed to the channel version and monetization state valid when the action occurred." },
  { id: "money", title: "Monetization", short: "Revenue + payouts", detail: "Reconcile ad requests, impressions, clicks, billing, adjustments, and payout inputs before publishing revenue, RPM, CPM, ad performance, and creator earnings.", example: "Finance-facing outputs pass a stricter reconciliation and approval gate than a provisional engagement dashboard." },
  { id: "ml", title: "ML Datasets", short: "Labeled + point-in-time", detail: "Build labeled training rows using only features and dimensions known at the prediction timestamp, and record feature, label, and metric versions.", example: "A recommendation example cannot use a future title edit, later subscriber tier, or outcome that occurred after the training timestamp." },
] as const;

const PARTITIONING: readonly Explainable[] = [
  { id: "partition", title: "Partition", short: "event_date", detail: "Partition large facts by the most common bounded filter so queries prune history and late corrections reopen only affected dates. Do not partition by high-cardinality video_id.", example: "A delayed heartbeat for yesterday rebuilds yesterday’s affected rows rather than scanning years of playback." },
  { id: "secondary", title: "Optional Split", short: "coarse geo or content type", detail: "Add a coarse secondary transform only for very large tables with a proven access pattern; keep smaller tables date-only to avoid excessive partitions.", example: "A massive playback table may add region, while a channel dimension remains unpartitioned or date-versioned." },
  { id: "compact", title: "File Size", short: "compact small commits", detail: "Streaming writers can create many tiny files during viral spikes. Buffer larger commits and compact using file-count and target-size thresholds so planning and reads remain efficient.", example: "A viral live stream triggers Iceberg compaction that merges thousands of tiny Parquet files into scan-sized files." },
  { id: "cluster", title: "Data Locality", short: "video_id + channel_id", detail: "Use Iceberg sort order or engine clustering for common video and channel filters without creating millions of physical partitions.", example: "Creator Studio skips unrelated records inside a date partition when reading one channel’s videos." },
] as const;

type DagPhase = {
  title: string;
  short: string;
  explanation: Explainable;
  steps: readonly Explainable[];
};

const DAG_PHASES: readonly DagPhase[] = [
  {
    title: "Ready",
    short: "Close and verify the input window",
    explanation: { id: "phase-ready", title: "Ready Phase", short: "", detail: "This is an orchestration boundary, not a data transformation. Ingestion publishes a small manifest only after it has closed the window and recorded expected Kafka ranges, CDC snapshots, and files. The DAG waits for that signal, then proves every listed input is readable.", example: "The daily job does not calculate yesterday’s views while one mobile-event partition or ad settlement file is still missing." },
    steps: [
      { id: "source-ready", title: "Source Readiness", short: "wait_for_manifest", detail: "Wait for the ingestion-owned completion manifest that lists the exact source partitions, offset ranges, snapshots, and files for this batch window. It belongs first because every later calculation assumes a closed input boundary.", example: "Playback offsets are closed through midnight UTC, video CDC snapshot 841 is available, and the expected ad file has arrived." },
      { id: "source-coverage", title: "Source Coverage", short: "verify_source_completeness", detail: "Compare readable inputs with the manifest, reject gaps and overlaps, and record completeness by source. This prevents a technically successful run from publishing partial business totals.", example: "If Kafka partition 17 stops before its recorded ending offset, the DAG waits or fails before building Silver." },
      { id: "bronze-contracts", title: "Bronze Contracts", short: "validate_bronze_contracts", detail: "Validate schema versions, required identifiers, timestamp bounds, type compatibility, and quarantine rates before expensive transformations begin.", example: "A sudden jump in malformed heartbeat records blocks the affected producer version and gives the player team a precise failure reason." },
    ],
  },
  {
    title: "Build",
    short: "Turn source records into trusted evidence",
    explanation: { id: "phase-build", title: "Build Phase", short: "", detail: "Spark performs the large shuffle-heavy event work: typing, deduplication, ordering, sessionization, point-in-time dimension joins, consent enforcement, and trust adjustments. Outputs remain reusable Silver facts instead of embedding dashboard-specific formulas.", example: "Playback starts and heartbeats become one validated watch session that can power views, retention, QoE, and ML labels." },
    steps: [
      { id: "silver-events", title: "Clean Events", short: "build_silver_events", detail: "Parse supported schemas, normalize event timestamps, remove duplicates by event_id, retain delivery coordinates, and attach quality and lineage fields.", example: "Two deliveries of the same heartbeat become one accepted Silver event while both raw records remain replayable in Bronze." },
      { id: "watch-sessions", title: "Build Sessions", short: "build_watch_sessions", detail: "Order start, progress, pause, seek, resume, and end evidence by playback_attempt_id; validate deltas and publish a versioned session result.", example: "The output records trusted watch_seconds, completion_ratio, unique coverage, and the applicable qualified-view decision." },
      { id: "identity-consent", title: "Apply Consent", short: "identity_and_consent_gate", detail: "Resolve account, profile, anonymous, device, and session identities only within permitted scopes. Keep links versioned and reversible, and use UNKNOWN keys when a dimension is late.", example: "An anonymous session may contribute aggregate watch time without becoming an unauthorized cross-device viewer profile." },
      { id: "trust-adjust", title: "Apply Validity", short: "trust_and_safety_adjustments", detail: "Join versioned fraud, bot, rights, policy, and monetization decisions to determine which evidence can contribute to each metric family.", example: "A play can count toward platform health diagnostics while being excluded from creator revenue because of a rights decision." },
    ],
  },
  {
    title: "Validate",
    short: "Build and prove the candidate",
    explanation: { id: "phase-validate", title: "Validate Phase", short: "", detail: "Aggregate Silver into run-scoped Gold staging, compare it with matching streaming windows and the prior certified version, then execute semantic and financial checks. Nothing in staging is consumer-visible yet.", example: "The candidate explains why live views differ from certified views before any Creator Studio pointer moves." },
    steps: [
      { id: "gold-candidate", title: "Build Candidate", short: "build_gold_metrics_staging", detail: "Aggregate views, watch time, retention, engagement, subscriptions, and revenue at declared grains into an isolated candidate snapshot.", example: "One row in daily_video_metrics is video × date × metric_version, making duplicates and comparisons unambiguous." },
      { id: "reconcile", title: "Explain Differences", short: "reconcile_stream_vs_batch", detail: "Align stream and batch by window, grain, and metric version; calculate absolute and relative differences and attribute them to dedupe, late arrival, invalid activity, or qualification rules.", example: "A −0.5% view difference is accepted only after its reason ledger adds up to the observed delta." },
      { id: "metric-tests", title: "Run Quality Checks", short: "run_metric_and_finance_tests", detail: "Run row-count, uniqueness, null, relationship, distribution, freshness, business, and finance reconciliation tests with product-specific thresholds.", example: "A payout dataset needs processor totals and owner approval even if all generic schema tests pass." },
    ],
  },
  {
    title: "Publish",
    short: "Release one complete certified version",
    explanation: { id: "phase-publish", title: "Publish Phase", short: "", detail: "Promote the validated snapshot atomically, refresh only dependent serving structures, write catalog and lineage metadata, and notify accountable owners and consumers. The previous snapshot stays available for rollback.", example: "Every Creator Studio query switches from yesterday’s complete version to today’s complete version at the same publication boundary." },
    steps: [
      { id: "atomic-publish", title: "Promote Snapshot", short: "publish_snapshot_atomically", detail: "Move a stable Iceberg branch, snapshot, or view pointer to the candidate in one metadata transaction. Never expose partition-by-partition replacement.", example: "Consumers see either release 118 or release 119, never a mixture of both." },
      { id: "serving-refresh", title: "Refresh Serving", short: "refresh_serving_indexes", detail: "Refresh Creator Studio indexes, warehouse marts, caches, and aggregates that explicitly consume the new data-product version.", example: "A channel-day serving index refreshes; unrelated search analytics remain untouched." },
      { id: "lineage-update", title: "Record Lineage", short: "update_catalog_lineage", detail: "Persist source snapshots, code version, metric version, parameters, tests, owner, outputs, and downstream dependencies in the catalog.", example: "An analyst can trace a certified view from a dashboard row back to its Gold release, Silver session, and Bronze offsets." },
      { id: "release-notice", title: "Notify Consumers", short: "notify_owners_and_consumers", detail: "Emit a machine-readable release record and targeted notifications containing status, material changes, freshness, and rollback reference.", example: "Finance is notified about a revenue correction while consumers of unaffected tables receive no unnecessary alert." },
    ],
  },
] as const;

const CONTROLS: readonly Explainable[] = [
  { id: "incremental", title: "Incremental Scope", short: "Before Build", detail: "A planner uses late-event indexes, changed natural keys, and input snapshot differences to select only affected event-date partitions and business keys. This determines what the DAG reads and rebuilds.", example: "A late heartbeat reopens its session and video-day partition instead of recomputing all playback history." },
  { id: "idempotent", title: "Idempotent Writes", short: "Build through Publish", detail: "Every transform uses deterministic keys, fixed input snapshots, versioned logic, run-scoped staging, and target-partition replacement. A retry therefore produces the same rows instead of appending duplicates.", example: "Rerunning one date replaces that date’s candidate partition; it never doubles qualified_views." },
  { id: "orchestration", title: "DAG Control", short: "Across every phase", detail: "Airflow or Dagster owns data-ready triggers, dependencies, retries, timeouts, SLAs, quality gates, run metadata, and alerts. It coordinates work; it does not define metric semantics.", example: "Gold staging cannot begin until Silver sessions, identity scope, and trust decisions for the same window are ready." },
  { id: "dbt", title: "SQL + Tests", short: "Validate and serving models", detail: "Spark handles large event and session processing; dbt expresses warehouse SQL models, shared tests, documentation, and lineage for Gold and downstream marts.", example: "A dbt relationship test catches a daily metric row whose video dimension version is missing." },
] as const;

const PUBLISHING: readonly Explainable[] = [
  { id: "stage", title: "Stage", short: "Isolate the candidate", detail: "Write every output for this run to a private snapshot or branch. Current certified tables stay unchanged while the candidate is assembled.", example: "run_id 2026-09-10T02:00Z owns a complete but invisible daily-video-metrics candidate." },
  { id: "record", title: "Record", short: "Freeze reproducibility", detail: "Attach input snapshot IDs, Kafka ranges, code SHA, metric version, feature flags, and runtime parameters before validation begins.", example: "The exact qualified-view logic and inputs behind a channel total can be reconstructed months later." },
  { id: "test", title: "Validate Data", short: "Run quality checks", detail: "Check row counts, key uniqueness, required nulls, referential integrity, distribution shifts, freshness, and cross-system business reconciliation.", example: "video_id × date × metric_version must be unique and every video key must resolve to the correct point-in-time dimension." },
  { id: "compare", title: "Compare", short: "Explain material changes", detail: "Compare the candidate with both the matching streaming window and last certified release. Require a reason ledger for any change beyond the metric’s threshold.", example: "The ledger attributes a view drop to 3,900 duplicate retries, 1,100 fraud removals, and 200 late additions." },
  { id: "approve", title: "Approve", short: "Apply risk-based ownership", detail: "Require an accountable owner to approve material changes; add explicit finance or regulatory approval for revenue, billing, and payout products.", example: "A large creator-payout correction cannot promote solely because technical tests are green." },
  { id: "promote", title: "Promote", short: "Swap one pointer", detail: "Atomically point the stable table, branch, or view at the validated snapshot. This is the only step that changes what certified consumers read.", example: "Creator Studio moves from release 118 to 119 without observing half-refreshed dates." },
  { id: "retain", title: "Retain", short: "Keep rollback ready", detail: "Preserve the prior certified snapshot and its metadata for the rollback window and any audit or legal-hold requirement.", example: "An operator can restore release 118 immediately if a semantic issue appears after publication." },
  { id: "release", title: "Release", short: "Refresh declared consumers", detail: "Emit the data-product release record, refresh only declared dependencies, and notify owners with freshness, delta summary, and rollback reference.", example: "Creator Studio and a recommendation label job refresh; an unrelated search mart does not rerun." },
] as const;

const RECON_FLOW: readonly Explainable[] = [
  { id: "stream-window", title: "Streaming Window", short: "Fast provisional result", detail: "Freeze the stream result for a declared event-time window, grain, and metric version. It is a comparison input, not the final historical authority.", example: "Flink reports provisional qualified_views for video V × 2026-09-09 × rule v4." },
  { id: "batch-window", title: "Batch Candidate", short: "Exact historical rebuild", detail: "Read the closed Bronze snapshot and rebuild the same grain using full deduplication, late facts, point-in-time dimensions, and versioned validity decisions.", example: "Spark rebuilds video V × 2026-09-09 × rule v4 from all accepted playback evidence." },
  { id: "match", title: "Align Scope", short: "Same grain + window + version", detail: "Reject comparisons unless stream and batch use identical entity keys, time boundaries, time zone, and metric-semantics version. Otherwise the delta has no valid meaning.", example: "A UTC video-day cannot be compared with a creator-local day, and rule v3 cannot be compared with rule v4." },
  { id: "ledger", title: "Build Delta Ledger", short: "Account for every difference", detail: "Calculate absolute and relative delta, then attribute the difference to duplicate removal, late arrival, fraud or policy adjustment, and unqualified playback. Unexplained remainder is tracked explicitly.", example: "The reason components must add back to certified_views − provisional_views; they are not hidden by an overwrite." },
  { id: "decision", title: "Decision Gate", short: "Threshold + owner review", detail: "Auto-accept small, fully explained differences within policy; route large, financial, or unexplained changes to the accountable owner while keeping the last certified release visible.", example: "A 0.2% explained late-arrival change may auto-pass, while an unexplained 4% revenue shift blocks." },
  { id: "correction", title: "Publish Correction", short: "Batch replaces the historical estimate", detail: "Promote the certified batch value, retain both prior and new releases, and publish the delta reasons so consumers can detect and explain the correction.", example: "Creator Studio switches to the certified video-day count and the release record shows why the live estimate changed." },
] as const;

const DELTAS: readonly Explainable[] = [
  { id: "absolute", title: "Absolute Delta", short: "batch − stream", detail: "Subtract the frozen provisional value from the batch candidate at the aligned grain. Preserve the sign so consumers know the direction of correction.", example: "1,004,800 certified − 1,010,000 provisional = −5,200 views." },
  { id: "relative", title: "Relative Delta", short: "absolute ÷ stream", detail: "Divide absolute delta by the provisional value to make thresholds comparable across viral and long-tail videos; handle zero denominators explicitly.", example: "−5,200 ÷ 1,010,000 = −0.515%." },
  { id: "duplicate", title: "Duplicate Removal", short: "Retried event_ids", detail: "Count events present more than once in delivery but accepted once in Silver. This isolates transport retries from actual viewer behavior.", example: "A mobile reconnect resends one heartbeat with the same event_id, so batch removes one provisional contribution." },
  { id: "late", title: "Late Arrival", short: "Valid after-watermark facts", detail: "Measure valid events and dimensions that arrived after the streaming watermark but before the certified batch cutoff.", example: "Offline mobile heartbeats arrive hours later and increase watch time for their original event date." },
  { id: "invalid", title: "Validity Adjustment", short: "Fraud, rights, or policy", detail: "Measure changes caused by versioned trust, bot, rights, privacy, or monetization decisions rather than data-delivery behavior.", example: "A replay cluster counted provisionally is removed by a reviewed fraud decision before certification." },
  { id: "qualification", title: "Qualification Rule", short: "Playback evidence not counted", detail: "Separate accepted playback evidence from a counted view when validated progress does not satisfy the applicable versioned business rule.", example: "A playback start remains useful for QoE analysis but contributes no certified view under that metric version." },
] as const;

function CardGrid({ items, columns = "sm:grid-cols-2 xl:grid-cols-4" }: { items: readonly Explainable[]; columns?: string }) {
  return (
    <div className={`grid gap-2 ${columns}`}>
      {items.map((item) => (
        <FloatingCard key={item.id} item={item} className="rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#8fa5b8] hover:bg-[#e7eef5] hover:shadow-md">
          <strong className="block text-sm">{item.title}</strong>
          <span className="mt-1 block text-[11px] leading-4 text-[var(--text-faint)]">{item.short}</span>
        </FloatingCard>
      ))}
    </div>
  );
}

function ArchitectureNode({ item, number }: { item: Explainable; number: number }) {
  return (
    <FloatingCard item={item} className="min-h-[94px] flex-1 rounded-xl border border-[var(--border)] bg-white p-3 text-left transition hover:border-[#8097aa] hover:bg-[#e7eef5] hover:shadow-md">
      <span className="text-[10px] font-bold text-[var(--text-faint)]">{String(number).padStart(2, "0")}</span>
      <strong className="mt-2 block text-sm">{item.title}</strong>
      <span className="mt-1 block text-[10px] leading-4 text-[var(--text-faint)]">{item.short}</span>
    </FloatingCard>
  );
}

function Arrow({ direction = "right" }: { direction?: "right" | "left" | "down" }) {
  return <span className="flex shrink-0 items-center justify-center px-1 text-xl text-[#70879b]" aria-hidden>{direction === "right" ? "→" : direction === "left" ? "←" : "↓"}</span>;
}

function EightStageArchitecture() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[#f7fafd] p-4">
      <div className="hidden xl:block">
        <div className="flex items-stretch">{ARCHITECTURE.slice(0, 4).map((item, index) => <div key={item.id} className="contents"><ArchitectureNode item={item} number={index + 1} />{index < 3 ? <Arrow /> : null}</div>)}</div>
        <div className="flex justify-end pr-[11%]"><Arrow direction="down" /></div>
        <div className="flex items-stretch">{[...ARCHITECTURE.slice(4)].reverse().map((item, index) => <div key={item.id} className="contents"><ArchitectureNode item={item} number={8 - index} />{index < 3 ? <Arrow direction="left" /> : null}</div>)}</div>
      </div>
      <div className="space-y-1 xl:hidden">
        {ARCHITECTURE.map((item, index) => <div key={item.id}>{index > 0 ? <Arrow direction="down" /> : null}<ArchitectureNode item={item} number={index + 1} /></div>)}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-dashed border-[#9fb1c2] bg-white px-3 py-2 text-xs"><strong>Contract failure →</strong> Quarantine with reason, fix producer or parser, then replay from Bronze.</div>
        <div className="rounded-lg border border-dashed border-[#9fb1c2] bg-white px-3 py-2 text-xs"><strong>Certification failure →</strong> Keep the last certified snapshot and alert the accountable owner.</div>
      </div>
    </div>
  );
}

function BatchArchitecture() {
  return (
    <div className="mt-5 space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold">End-to-end architecture</h3>
        <EightStageArchitecture />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Storage foundation</h3>
        <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
          {STORAGE.map((item, index) => <div key={item.id} className="contents"><FloatingCard item={item} className="rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4 text-left hover:border-[#8fa5b8] hover:bg-[#e7eef5]"><strong className="text-sm">{item.title}</strong><span className="mt-1 block text-xs text-[var(--text-faint)]">{item.short}</span></FloatingCard>{index < STORAGE.length - 1 ? <Arrow /> : null}</div>)}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Layer contracts</h3>
        <CardGrid items={LAYERS} columns="md:grid-cols-3" />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Partitioning + file layout</h3>
        <CardGrid items={PARTITIONING} />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Certified outputs</h3>
        <CardGrid items={OUTPUTS} columns="sm:grid-cols-2 xl:grid-cols-5" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-white p-4"><strong className="text-sm">Transaction correctness</strong><p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Iceberg committed one complete, isolated, durable table snapshot.</p></div>
        <div className="rounded-xl border border-[#9fb1c2] bg-[#eaf1f7] p-4"><strong className="text-sm">Metric correctness</strong><p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Inputs were complete, semantics passed, differences were explained, and the accountable owner approved release.</p></div>
      </div>
    </div>
  );
}

function DailyDag() {
  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 xl:grid-cols-4">
        {DAG_PHASES.map((phase, phaseIndex) => (
          <div key={phase.title} className="relative rounded-xl border border-[var(--border)] bg-[#f7fafd] p-3">
            <FloatingCard item={phase.explanation} className="w-full rounded-lg border border-[#a8b8c7] bg-[#eaf1f7] p-3 text-left hover:bg-[#e1ebf3]">
              <span className="text-[10px] font-bold text-[var(--text-faint)]">PHASE {phaseIndex + 1}</span>
              <strong className="mt-1 block text-base">{phase.title}</strong>
              <span className="mt-1 block text-[11px] text-[var(--text-faint)]">{phase.short}</span>
            </FloatingCard>
            <div className="mt-3 space-y-2">
              {phase.steps.map((step, index) => (
                <div key={step.id}>
                  {index > 0 ? <div className="flex h-4 justify-center text-[#70879b]">↓</div> : null}
                  <FloatingCard item={step} className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2.5 text-left hover:border-[#8fa5b8] hover:bg-[#e7eef5]">
                    <strong className="block text-xs">{step.title}</strong>
                    <code className="mt-1 block break-all text-[9px] text-[var(--text-faint)]">{step.short}</code>
                  </FloatingCard>
                </div>
              ))}
            </div>
            {phaseIndex < DAG_PHASES.length - 1 ? <span className="absolute -right-3 top-8 z-10 hidden rounded-full bg-[#eaf1f7] px-1 text-lg text-[#70879b] xl:block">→</span> : null}
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Where pipeline controls apply</h3>
        <CardGrid items={CONTROLS} />
      </div>
    </div>
  );
}

function SnakeFlow({ items }: { items: readonly Explainable[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[#f7fafd] p-4">
      <div className="hidden xl:block">
        <div className="flex items-stretch">{items.slice(0, 4).map((item, index) => <div key={item.id} className="contents"><ArchitectureNode item={item} number={index + 1} />{index < 3 ? <Arrow /> : null}</div>)}</div>
        <div className="flex justify-end pr-[11%]"><Arrow direction="down" /></div>
        <div className="flex items-stretch">{[...items.slice(4)].reverse().map((item, index) => <div key={item.id} className="contents"><ArchitectureNode item={item} number={8 - index} />{index < 3 ? <Arrow direction="left" /> : null}</div>)}</div>
      </div>
      <div className="space-y-1 xl:hidden">{items.map((item, index) => <div key={item.id}>{index > 0 ? <Arrow direction="down" /> : null}<ArchitectureNode item={item} number={index + 1} /></div>)}</div>
    </div>
  );
}

function Publishing() {
  return (
    <div className="mt-5 space-y-4">
      <SnakeFlow items={PUBLISHING} />
      <div className="rounded-xl border border-[var(--border)] bg-white p-4">
        <h3 className="text-sm font-semibold">Data Quality Checks</h3>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">{["Row count", "Uniqueness", "Required nulls", "Relationships", "Distribution", "Freshness", "Business reconciliation", "Finance approval"].map((gate) => <span key={gate} className="rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">{gate}</span>)}</div>
      </div>
    </div>
  );
}

function Reconciliation() {
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[#f7fafd] p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <FloatingCard item={RECON_FLOW[0]} className="rounded-xl border border-[var(--border)] bg-white p-4 text-left hover:bg-[#e7eef5]"><span className="text-[10px] font-bold text-[var(--text-faint)]">SECONDS</span><strong className="mt-1 block text-sm">Streaming Window</strong><span className="mt-1 block text-xs text-[var(--text-faint)]">Live counters + trending · provisional</span></FloatingCard>
          <FloatingCard item={RECON_FLOW[1]} className="rounded-xl border border-[var(--border)] bg-white p-4 text-left hover:bg-[#e7eef5]"><span className="text-[10px] font-bold text-[var(--text-faint)]">HOURS / DAILY</span><strong className="mt-1 block text-sm">Batch Candidate</strong><span className="mt-1 block text-xs text-[var(--text-faint)]">Certified counts + revenue + ML · exact</span></FloatingCard>
        </div>
        <div className="flex h-8 items-center justify-center text-[#70879b]">↘ &nbsp; ↙</div>
        <div className="grid gap-2 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-center">
          {RECON_FLOW.slice(2).map((item, index) => <div key={item.id} className="contents"><FloatingCard item={item} className="rounded-xl border border-[var(--border)] bg-white p-3 text-left hover:border-[#8fa5b8] hover:bg-[#e7eef5]"><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-[11px] text-[var(--text-faint)]">{item.short}</span></FloatingCard>{index < 3 ? <Arrow /> : null}</div>)}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Delta explanation ledger</h3>
        <CardGrid items={DELTAS} columns="sm:grid-cols-2 xl:grid-cols-3" />
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-white p-4">
        <h3 className="text-sm font-semibold">Late dimension repair</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {["Assign UNKNOWN key", "Retain natural key", "Dimension arrives", "Reopen affected dates", "Publish corrected version"].map((item, index) => <div key={item} className="contents"><span className="rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">{item}</span>{index < 4 ? <span className="text-[#70879b]">→</span> : null}</div>)}
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]"><strong>Keep three dates:</strong> event date tells when viewing happened; processing date tells when the platform handled it; publication date tells when consumers received the certified correction.</p>
      </div>
    </div>
  );
}

export default function BatchLakehouseTab() {
  return (
    <YouTubeFrame activeTab="batch-lakehouse" sections={BATCH_LAKEHOUSE_SECTIONS} previous={{ id: "data-modeling", label: "Data Modeling" }} next={{ id: "governance-quality", label: "Governance / Quality" }}>
      <Section id="batch-architecture" number="01" title="Batch Architecture"><BatchArchitecture /></Section>
      <Section id="batch-dag" number="02" title="Daily DAG"><DailyDag /></Section>
      <Section id="publish-protocol" number="03" title="Publishing"><Publishing /></Section>
      <Section id="reconciliation" number="04" title="Reconciliation"><Reconciliation /></Section>
      <Section id="batch-answer" number="05" title="Interview Answer">
        <div className="mx-auto mt-5 w-full max-w-5xl rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] px-6 py-5 text-justify text-sm font-medium leading-7 md:px-8">
          I use batch processing to publish YouTube’s certified historical metrics for views, watch time, audience retention, revenue, payouts, and point-in-time ML datasets. Ingestion first closes the processing window and records the exact Kafka ranges, CDC snapshots, and files in a source manifest, so the Airflow or Dagster DAG cannot start from partial input. Spark then reads immutable Bronze Iceberg tables, deduplicates events, builds playback sessions, enforces consent, and applies versioned trust-and-safety decisions to create reusable Silver evidence. Incremental planning selects only changed dates and keys, while deterministic transforms, run-scoped staging, and partition replacement make every retry idempotent. Gold candidates are reconciled with matching streaming windows, tested, reviewed where required, and promoted with one atomic pointer change. Parquet on object storage provides efficient analytical scans, while Iceberg provides snapshots, time travel, schema evolution, hidden partitioning, and safe backfills. Creator Studio, BI, finance, recommendation features, and training jobs therefore read the same certified release with a reproducible explanation for every material correction.
        </div>
      </Section>
    </YouTubeFrame>
  );
}
