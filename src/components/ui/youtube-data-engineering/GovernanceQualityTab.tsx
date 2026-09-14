"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GOVERNANCE_QUALITY_SECTIONS } from "./data";
import { Section, YouTubeFrame } from "./shared";

type Explainable = {
  id: string;
  title: string;
  short: string;
  detail: string;
  result: string;
  example: string;
};

type TipPosition = { left: number; top: number; above: boolean };

function HoverInfo({ item, children, className = "" }: { item: Explainable; children: ReactNode; className?: string }) {
  const [position, setPosition] = useState<TipPosition | null>(null);

  const show = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const width = Math.min(460, window.innerWidth - 24);
    if (window.innerWidth < 640) {
      setPosition({ left: 12, top: 12, above: false });
      return;
    }
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12));
    const above = window.innerHeight - rect.bottom < 285 && rect.top > 285;
    setPosition({ left, top: above ? rect.top - 10 : rect.bottom + 10, above });
  };

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
      {position && typeof document !== "undefined" ? createPortal(
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[100] max-h-[calc(100vh-24px)] w-[min(460px,calc(100vw-24px))] overflow-y-auto rounded-lg border border-[#9aabba] bg-white px-4 py-3 text-left shadow-[0_14px_34px_rgba(23,32,43,.20)]"
          style={{ left: position.left, top: position.top, transform: position.above ? "translateY(-100%)" : undefined }}
        >
          <div className="flex items-center justify-between gap-3"><strong className="text-sm text-[#17202b]">{item.title}</strong><span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#687b8d]">Explanation</span></div>
          <p className="mt-2.5 text-xs leading-5 text-[#445464]">{item.detail}</p>
          <p className="mt-2 border-t border-[#d6e1eb] pt-2 text-xs leading-5 text-[#445464]">{item.result} <strong className="text-[#17202b]">For example, </strong>{item.example}</p>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

const QUALITY_FLOW: readonly Explainable[] = [
  {
    id: "producer-contract",
    title: "Producer Contract",
    short: "Schema + meaning + owner",
    detail: "The Playback, Ads, Search, Engagement, and Creator teams publish a versioned contract defining required fields, units, timestamp semantics, privacy class, compatibility rules, and an accountable owner.",
    result: "The registry returns an approved schema ID and compatibility decision before deployment.",
    example: "played_delta_ms must remain milliseconds; changing it to seconds requires a new reviewed version rather than a silent producer change.",
  },
  {
    id: "ingestion-check",
    title: "Ingestion Check",
    short: "Reject malformed records early",
    detail: "Collectors validate schema version, required identifiers, field types, enum values, timestamp bounds, and payload size before the event enters shared processing.",
    result: "Valid records enter Kafka; rejected records retain their payload, producer version, failed rule, and source coordinates in quarantine.",
    example: "A heartbeat missing event_id is quarantined instead of becoming an event that cannot be deduplicated.",
  },
  {
    id: "kafka-bronze",
    title: "Kafka + Bronze",
    short: "Durable replay evidence",
    detail: "Kafka provides short-term ordered replay while append-only Bronze Iceberg tables preserve the long-term event envelope and delivery metadata used for audit and repair.",
    result: "Every accepted record has a traceable topic, partition, offset, schema version, ingestion time, and Bronze snapshot.",
    example: "A corrected parser can replay a bad mobile-client version without asking the player to resend historical heartbeats.",
  },
  {
    id: "silver-check",
    title: "Silver Checks",
    short: "Validate reusable evidence",
    detail: "Silver checks deduplication, required business keys, referential integrity, timestamp normalization, consent scope, late-data handling, and distributions while building conformed events and sessions.",
    result: "Trusted, joinable evidence continues; failed rows or affected partitions are isolated with rule-level evidence.",
    example: "Two deliveries of one event_id produce one accepted playback event and an observable duplicate-rate signal.",
  },
  {
    id: "gold-certification",
    title: "Gold Certification",
    short: "Protect business metrics",
    detail: "Candidate Gold tables are checked for grain uniqueness, completeness, freshness, metric semantics, stream-to-batch convergence, material drift, and financial reconciliation before publication.",
    result: "The candidate is certified, warned with an owner and expiry, or blocked while consumers stay on the last certified version.",
    example: "An unexplained revenue mismatch blocks a creator-payout release even if every Parquet file was written successfully.",
  },
  {
    id: "certified-consumers",
    title: "Certified Consumers",
    short: "One governed release",
    detail: "Creator Studio, BI, finance, feature pipelines, and training jobs read only the atomically published data-product version allowed by their access policy.",
    result: "Consumers receive one consistent release with freshness, owner, lineage, quality status, semantic version, and rollback reference.",
    example: "A Creator Studio watch-time value can be traced from its dashboard row back through Gold, Silver, Bronze, and the player contract.",
  },
] as const;

const QUALITY_TOOLS: readonly Explainable[] = [
  { id: "contracts-tool", title: "Data Contracts", short: "At producer boundaries", detail: "Contracts prevent incompatible schemas and semantic changes from entering Kafka unnoticed. Compatibility checks run in CI and again at ingestion.", result: "A versioned producer-consumer agreement with schema, semantics, privacy classification, owner, and rollout policy.", example: "A new optional player field passes compatibility; changing playback_attempt_id meaning requires review and migration." },
  { id: "engine-tests", title: "Automated Data Checks", short: "At event-scale tables", detail: "Quality tools such as Great Expectations or Deequ profile large Bronze and Silver datasets for nulls, ranges, distributions, referential integrity, and unexpected volume changes.", result: "Measured check results with thresholds, failing rows, severity, owner, and quarantine or continuation decision.", example: "A sudden 15% null rate in video_id isolates the affected app version before sessionization." },
  { id: "dbt-tests", title: "dbt Tests", short: "At Gold + warehouse models", detail: "dbt tests enforce unique grains, required columns, accepted values, relationships, freshness, and reusable business assertions on SQL data products.", result: "Version-controlled quality evidence and model lineage attached to each candidate Gold or mart release.", example: "video_id × date × metric_version must be unique in gold.daily_video_metrics." },
] as const;

const QUALITY_DIMENSIONS: readonly Explainable[] = [
  { id: "accuracy", title: "Accuracy", short: "Views match playback evidence", detail: "Accuracy asks whether a value represents the intended real-world behavior. Recompute qualified views from deduplicated, validated sessions and reconcile independent evidence.", result: "A reconciliation result showing expected, observed, difference, threshold, and reason attribution.", example: "Certified views agree with eligible playback sessions after duplicate and fraud adjustments." },
  { id: "completeness", title: "Completeness", short: "Required data is present", detail: "Completeness checks both record fields and source coverage. Required keys cannot be null, and every expected partition, offset range, snapshot, and file must arrive.", result: "Coverage percentages and missing-field or missing-source lists at producer, partition, and data-product level.", example: "The job blocks when one playback Kafka partition ends before the offset promised by the daily manifest." },
  { id: "consistency", title: "Consistency", short: "Systems converge", detail: "Consistency compares values that should agree across streaming, batch, serving, billing, and dependent aggregates using the same grain, window, and metric version.", result: "A signed delta ledger explaining duplicates, late arrivals, policy adjustments, and any unexplained remainder.", example: "The final video-day view count replaces the provisional live count only after their difference is explained." },
  { id: "timeliness", title: "Timeliness", short: "Fresh within the SLO", detail: "Timeliness measures event delay, watermark delay, pipeline completion, publication age, and consumer refresh age against the product’s declared freshness objective.", result: "A freshness status with current delay, SLO, affected consumers, severity, and first responsible owner.", example: "Creator Studio daily metrics miss their deadline when Gold is certified but its serving index has not refreshed." },
  { id: "uniqueness", title: "Uniqueness", short: "One row per declared grain", detail: "Uniqueness applies at each layer: event_id for accepted events, playback attempt and version for sessions, and business keys plus metric version for Gold aggregates.", result: "Duplicate counts, duplicate keys, source coordinates, and the deterministic rule used to keep or merge records.", example: "A retried heartbeat is retained in Bronze but accepted once in Silver and counted once in Gold." },
  { id: "validity", title: "Validity", short: "Values obey the contract", detail: "Validity checks data types, enums, ranges, timestamp bounds, legal state transitions, identity scope, and policy eligibility before a value is used by downstream logic.", result: "Accepted rows and quarantined rows labeled with validation rule, producer version, severity, and replay status.", example: "A negative played_delta_ms fails validation and never reduces a viewer’s accumulated watch time." },
] as const;

const RELEASE_DECISIONS: readonly Explainable[] = [
  { id: "hard-block", title: "Block", short: "Certified data is unsafe", detail: "Block publication for missing source partitions, incompatible schema, duplicate spikes beyond policy, broken relationships, failed reconciliation, consent violations, or unexplained material metric drift.", result: "Consumers remain on the last certified snapshot while the candidate and failure evidence are isolated for repair.", example: "A 7% unexplained drop in qualified views blocks the new video-metrics release." },
  { id: "warning", title: "Warn", short: "Measures remain trustworthy", detail: "A noncritical dimension delay or small metadata gap may continue only when certified measures remain correct and the exception has an owner, expiry, impact statement, and follow-up task.", result: "The release carries a visible warning and automatically escalates if the exception exceeds its expiry or threshold.", example: "A delayed optional video category can warn while views and watch time remain correct and joinable." },
  { id: "approve-release", title: "Certify", short: "Checks and approvals passed", detail: "Publish only when automated checks pass, material changes are explained, privacy policy is satisfied, and any finance or regulatory review is recorded.", result: "An atomically promoted snapshot with quality report, approvals, lineage, publication time, and rollback version.", example: "Creator Studio and finance switch to the same complete daily release rather than observing partition-by-partition updates." },
] as const;

const RELEASE_FLOW: readonly Explainable[] = [
  { id: "candidate", title: "Candidate", short: "Run-scoped Gold snapshot", detail: "Build the complete proposed release in isolation and attach its source snapshots, code version, metric version, and parameters.", result: "A reproducible candidate that no certified consumer can read yet.", example: "gold.daily_video_metrics release 119 is staged beside certified release 118." },
  { id: "automated-checks", title: "Quality Checks", short: "Structural + semantic + business", detail: "Run completeness, accuracy, consistency, timeliness, uniqueness, validity, distribution, and finance checks with data-product-specific thresholds.", result: "A check report containing observed values, thresholds, severity, failed records, and accountable owners.", example: "The report combines missing partitions, duplicate rate, video-key relationships, view reconciliation, and revenue balance." },
  { id: "classify", title: "Classify", short: "Block, warn, or pass", detail: "Apply policy to the results. Hard failures block; bounded noncritical exceptions warn; clean or approved candidates pass.", result: "One explicit release decision and the evidence explaining why it was chosen.", example: "Broken consent scope blocks, while a temporary optional-category delay receives a time-bounded warning." },
  { id: "owner-review", title: "Owner Review", short: "Material or sensitive changes", detail: "Route unexplained, high-impact, financial, regulatory, or privacy-sensitive changes to the correct product and policy owners before promotion.", result: "A recorded approval or rejection with reviewer, timestamp, scope, evidence, and remediation notes.", example: "A creator-payout correction requires Finance approval even when generic data checks pass." },
  { id: "publish-hold", title: "Publish or Hold", short: "Atomic decision boundary", detail: "Certified candidates swap the stable pointer atomically. Blocked candidates remain isolated, create an incident, and cannot replace the last certified snapshot.", result: "Either one complete new release or continued service from the known-good prior version—never partial Gold.", example: "Creator Studio continues reading release 118 until the failed release 119 is repaired and recertified." },
] as const;

const PRIVACY_CONTROLS: readonly Explainable[] = [
  { id: "pii", title: "PII Handling", short: "Classify + tokenize", detail: "Classify direct and indirect identifiers, tokenize or anonymize where possible, restrict raw dim_user access, and keep clear retention and approved-use policies.", result: "Privacy-tagged columns with masking, tokenization, access, residency, retention, and deletion behavior enforced by policy.", example: "Most analytics uses a stable scoped token rather than an email address or raw account identifier." },
  { id: "consent", title: "Consent", short: "Purpose-aware processing", detail: "Propagate consent state with events and evaluate it before identity stitching, personalization, advertising, analytics, or training use. Changes must affect future processing and corrections.", result: "Only permitted identity links and downstream uses, with the consent version and evaluation reason retained.", example: "A viewer can contribute privacy-safe aggregate metrics without being eligible for personalized feature generation." },
  { id: "kids", title: "Kids / COPPA", short: "Restricted collection and use", detail: "Treat content made for kids and applicable viewers as a stricter policy context with minimized collection, restricted identity use, limited personalization, and controlled access.", result: "Policy-labeled records and datasets whose allowed purposes are narrower than the standard playback path.", example: "A made-for-kids watch event can contribute approved aggregate watch time without feeding disallowed personalized advertising features." },
  { id: "privacy-rights", title: "GDPR / CCPA", short: "Delete or anonymize end to end", detail: "Verify requests, resolve approved identity keys, discover every affected dataset, apply deletion or irreversible anonymization, and preserve only non-PII audit evidence.", result: "A completed request whose removal reaches lakehouse tables, caches, serving indexes, feature stores, and future replay paths.", example: "Iceberg row-level deletes remove a scoped viewer and replay suppression prevents Bronze history from recreating that identity." },
  { id: "access", title: "Access + Encryption", short: "RBAC, ABAC, masking, TLS + KMS", detail: "Combine role and attribute policies with row and column security, dynamic masking, least privilege, audited access, encryption in transit, and managed encryption at rest.", result: "A policy decision for every sensitive read or write, plus an audit trail of subject, resource, purpose, and outcome.", example: "A Creator analyst sees channel aggregates but cannot read raw viewer identifiers or another policy region’s restricted data." },
] as const;

const DELETE_FLOW: readonly Explainable[] = [
  { id: "verify-request", title: "Verify Request", short: "Authenticate + authorize scope", detail: "Confirm the requester, applicable privacy right, identity scope, jurisdictions, and datasets that the request is legally permitted to affect.", result: "A signed request ID and approved deletion scope, separate from the raw identity supplied by the requester.", example: "A verified account request expands only to identity links allowed by the privacy service." },
  { id: "resolve-keys", title: "Resolve Keys", short: "Approved identity graph", detail: "Translate the verified subject into governed account, profile, anonymous, device, session, and token keys without inventing unauthorized joins.", result: "A versioned set of scoped deletion keys with provenance and consent restrictions.", example: "The resolver includes a permitted anonymous-to-account link but excludes an unapproved advertising identifier." },
  { id: "discover-data", title: "Discover Data", short: "Catalog + lineage impact", detail: "Use catalog tags and column-level lineage to find Bronze, Silver, Gold, warehouse, serving, cache, feature, and training datasets containing those keys or derived personal data.", result: "An impact manifest listing every affected data product, owner, deletion method, and verification query.", example: "The request finds watch sessions, audience features, serving caches, and a training snapshot derived from the viewer token." },
  { id: "delete-data", title: "Delete / Anonymize", short: "Apply the approved action", detail: "Use Iceberg row-level or partition rewrites, warehouse deletes, irreversible anonymization, and downstream-specific APIs according to each dataset’s policy.", result: "New table snapshots and system acknowledgements showing that personal rows or linkable values are no longer available.", example: "Watch-session rows are deleted while a permitted aggregate is retained only when it can no longer identify the viewer." },
  { id: "propagate-tombstone", title: "Propagate Tombstone", short: "Caches + features + replay", detail: "Send a durable suppression marker to serving caches, feature stores, model-data builders, and every replay job so retained raw history cannot restore the deleted identity.", result: "A versioned tombstone checked during normal writes, backfills, and Bronze replays until all reconstructable data expires.", example: "A two-year metric backfill encounters the tombstone and excludes the deleted viewer before rebuilding Silver." },
  { id: "verify-completion", title: "Verify Completion", short: "Prove removal without retaining PII", detail: "Run dataset-specific absence or anonymization checks, collect owner acknowledgements, close failures, and retain only the non-PII evidence needed to prove execution.", result: "A completion record with coverage, timestamps, system results, exceptions, and audit evidence that cannot recreate the identity.", example: "Verification confirms no scoped key remains in lakehouse, online features, or caches before the request is closed." },
] as const;

const GOVERNANCE_CORE: readonly Explainable[] = [
  { id: "catalog", title: "Catalog + Discovery", short: "DataHub / Unity Catalog / Purview", detail: "Index datasets, columns, descriptions, owners, domains, quality status, privacy tags, freshness, contracts, and approved uses in a searchable inventory.", result: "Users can find the correct certified product and understand its meaning and restrictions before querying it.", example: "Searching qualified_views returns the Gold definition, grain, metric version, owner, SLO, upstream tables, and permitted consumers." },
  { id: "lineage", title: "Lineage", short: "Source event to dashboard", detail: "Capture job, table, column, metric, and release dependencies so teams can trace a value backward and calculate downstream impact before a change.", result: "A navigable graph connecting producer contracts, Kafka/Bronze evidence, Silver transforms, Gold metrics, and consumer surfaces.", example: "A Creator Studio watch-time issue is traced to one sessionizer deployment and the affected video-day releases." },
  { id: "ownership", title: "Ownership", short: "One accountable team", detail: "Assign a named data-product owner for meaning, quality, SLO, access, incidents, and deprecation; shared platform teams own reusable transport and governance mechanisms.", result: "Every alert, contract review, access request, quality failure, and consumer question routes to an accountable owner and escalation path.", example: "Playback owns watch-session semantics while the lakehouse team owns Iceberg reliability; neither ownership is ambiguous." },
] as const;

const OBSERVABILITY: readonly Explainable[] = [
  { id: "infra", title: "Infrastructure", short: "CPU · memory · disk · network", detail: "Monitor the machines and managed services beneath collectors, Kafka, Flink, Spark, Iceberg catalogs, warehouses, and serving stores.", result: "Capacity and health signals identify whether a data symptom begins with resource exhaustion or service failure.", example: "Broker disk saturation explains growing Kafka lag before freshness alerts reach Creator Studio." },
  { id: "pipeline", title: "Pipeline", short: "Lag · watermark · retries · commits", detail: "Track movement and execution: consumer lag, event-time watermark, checkpoints, task duration, retry count, orchestration state, output commits, and publication age.", result: "Stage-level latency and failure evidence identify where the data stopped or slowed and which downstream products are affected.", example: "Healthy Kafka lag but a stalled Flink checkpoint points investigation at state storage rather than producers." },
  { id: "data", title: "Data", short: "Volume · schema · nulls · distribution", detail: "Measure record volume, source completeness, schema versions, nulls, duplicates, lateness, ranges, distributions, relationships, and quarantine counts by producer and partition.", result: "Rule-level quality signals reveal silent corruption even when every service and job reports healthy.", example: "A new TV client produces normal traffic volume but an abnormal played_delta_ms distribution and is quarantined." },
  { id: "business", title: "Business", short: "Views · watch time · revenue · guardrails", detail: "Monitor governed outcome metrics by video, channel, geography, device, client version, and release so technical health is connected to actual user and creator impact.", result: "Business anomaly alerts include metric version, expected baseline, affected slice, financial or creator impact, and likely upstream lineage.", example: "Infrastructure is green, but a sudden Shorts watch-time drop isolated to one app release triggers a business incident." },
] as const;

function Arrow({ down = false }: { down?: boolean }) {
  return <span className="flex shrink-0 items-center justify-center px-1 text-xl text-[#70879b]" aria-hidden>{down ? "↓" : "→"}</span>;
}

function CompactCard({ item }: { item: Explainable }) {
  return <HoverInfo item={item} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#8fa5b8] hover:bg-[#e7eef5] hover:shadow-md"><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-[11px] leading-4 text-[var(--text-faint)]">{item.short}</span></HoverInfo>;
}

function CardGrid({ items, columns = "sm:grid-cols-2 xl:grid-cols-3" }: { items: readonly Explainable[]; columns?: string }) {
  return <div className={`grid gap-2 ${columns}`}>{items.map((item) => <CompactCard key={item.id} item={item} />)}</div>;
}

function QualityFlow() {
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[#f7fafd] p-4">
        <div className="grid gap-2 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-center">
          {QUALITY_FLOW.map((item, index) => <div key={item.id} className="contents"><CompactCard item={item} />{index < QUALITY_FLOW.length - 1 ? <Arrow /> : null}</div>)}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
          <div className="rounded-lg border border-dashed border-[#9fb1c2] bg-white px-3 py-2"><strong>Record fails →</strong> quarantine with reason; repair and replay only after validation.</div>
          <div className="rounded-lg border border-dashed border-[#9fb1c2] bg-white px-3 py-2"><strong>Release fails →</strong> hold the candidate; consumers keep the last certified version.</div>
        </div>
      </div>
      <div><h3 className="mb-2 text-sm font-semibold">Where checks run</h3><CardGrid items={QUALITY_TOOLS} columns="md:grid-cols-3" /></div>
    </div>
  );
}

function QualityDimensions() {
  return (
    <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {QUALITY_DIMENSIONS.map((item) => <HoverInfo key={item.id} item={item} className="grid min-h-[92px] w-full grid-cols-[110px_1fr] items-center rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-left hover:border-[#8fa5b8] hover:bg-[#e7eef5]"><strong className="text-sm">{item.title}</strong><div className="border-l border-[var(--border)] pl-3"><span className="block text-xs font-medium">{item.short}</span><span className="mt-1 block text-[10px] text-[var(--text-faint)]">Hover for check, output, and example</span></div></HoverInfo>)}
    </div>
  );
}

function ReleaseDecisions() {
  return (
    <div className="mt-5 space-y-4">
      <CardGrid items={RELEASE_DECISIONS} columns="md:grid-cols-3" />
      <div className="rounded-xl border border-[var(--border)] bg-[#f7fafd] p-4">
        <h3 className="mb-3 text-sm font-semibold">Certification flow</h3>
        <div className="grid gap-2 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-center">{RELEASE_FLOW.map((item, index) => <div key={item.id} className="contents"><CompactCard item={item} />{index < RELEASE_FLOW.length - 1 ? <Arrow /> : null}</div>)}</div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-white p-4"><strong className="text-sm">Hard-block conditions</strong><div className="mt-3 flex flex-wrap gap-2 text-[10px]">{["Missing partitions", "Incompatible schema", "Duplicate spike", "Broken relationships", "Reconciliation failure", "Consent violation", "Unexplained drift"].map((item) => <span key={item} className="rounded-md bg-[var(--bg-muted)] px-2.5 py-2">{item}</span>)}</div></div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-4"><strong className="text-sm">Warning contract</strong><div className="mt-3 flex flex-wrap gap-2 text-[10px]">{["Measures remain correct", "Noncritical gap", "Named owner", "Explicit impact", "Expiry time", "Follow-up tracked"].map((item) => <span key={item} className="rounded-md bg-[var(--bg-muted)] px-2.5 py-2">{item}</span>)}</div></div>
      </div>
    </div>
  );
}

function PrivacyControls() {
  return (
    <div className="mt-5 space-y-4">
      <CardGrid items={PRIVACY_CONTROLS} columns="sm:grid-cols-2 xl:grid-cols-5" />
      <div className="rounded-xl border border-[var(--border)] bg-[#f7fafd] p-4">
        <h3 className="mb-3 text-sm font-semibold">Privacy-request execution</h3>
        <div className="grid gap-2 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-center">{DELETE_FLOW.map((item, index) => <div key={item.id} className="contents"><CompactCard item={item} />{index < DELETE_FLOW.length - 1 ? <Arrow /> : null}</div>)}</div>
      </div>
      <div className="rounded-xl border border-[#9fb1c2] bg-[#eaf1f7] px-4 py-3 text-sm font-medium leading-6"><strong>Replay safety:</strong> every backfill checks durable privacy tombstones before rebuilding Silver, Gold, caches, or features. A later Bronze replay must never resurrect a deleted identity.</div>
    </div>
  );
}

function LineageOwnership() {
  const trace = ["Creator Studio metric", "Certified Gold row", "Silver watch session", "Bronze event + offset", "Player contract + owner"];
  return (
    <div className="mt-5 space-y-4">
      <CardGrid items={GOVERNANCE_CORE} columns="md:grid-cols-3" />
      <div className="rounded-xl border border-[var(--border)] bg-[#f7fafd] p-4">
        <h3 className="text-sm font-semibold">Trace a number backward</h3>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-medium">{trace.map((item, index) => <div key={item} className="contents"><span className="rounded-md border border-[var(--border)] bg-white px-3 py-2">{item}</span>{index < trace.length - 1 ? <span className="text-[#70879b]">←</span> : null}</div>)}</div>
      </div>
      <div className="grid gap-2 md:grid-cols-3 text-xs">
        <div className="rounded-lg border border-[var(--border)] bg-white p-3"><strong className="block text-sm">Domain owner</strong><span className="mt-1 block text-[var(--text-muted)]">Contract meaning · metric semantics · product quality · SLO · incident response</span></div>
        <div className="rounded-lg border border-[var(--border)] bg-white p-3"><strong className="block text-sm">Platform owner</strong><span className="mt-1 block text-[var(--text-muted)]">Kafka · compute · Iceberg · catalog · quality framework · access mechanisms</span></div>
        <div className="rounded-lg border border-[var(--border)] bg-white p-3"><strong className="block text-sm">Privacy / Security</strong><span className="mt-1 block text-[var(--text-muted)]">Policy · sensitive access · residency · deletion evidence · regulatory review</span></div>
      </div>
    </div>
  );
}

function Observability() {
  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{OBSERVABILITY.map((item, index) => <div key={item.id} className="relative"><CompactCard item={item} />{index < OBSERVABILITY.length - 1 ? <span className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-[#eaf1f7] px-1 text-[#70879b] xl:block">→</span> : null}</div>)}</div>
      <div className="rounded-xl border border-[var(--border)] bg-[#f7fafd] p-4"><h3 className="text-sm font-semibold">Every alert must answer</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">{["Severity", "Owner", "Runbook", "Business impact", "Lineage link", "Recent deployments"].map((item, index) => <div key={item} className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs"><span className="mr-2 text-[10px] font-bold text-[var(--text-faint)]">{String(index + 1).padStart(2, "0")}</span>{item}</div>)}</div></div>
    </div>
  );
}

export default function GovernanceQualityTab() {
  return (
    <YouTubeFrame activeTab="governance-quality" sections={GOVERNANCE_QUALITY_SECTIONS} previous={{ id: "batch-lakehouse", label: "Batch + Lakehouse" }}>
      <Section id="gov-contracts" number="01" title="Quality Flow"><QualityFlow /></Section>
      <Section id="quality-dimensions" number="02" title="Quality Dimensions"><QualityDimensions /></Section>
      <Section id="release-decisions" number="03" title="Release Decisions"><ReleaseDecisions /></Section>
      <Section id="privacy-controls" number="04" title="Privacy Controls"><PrivacyControls /></Section>
      <Section id="lineage-ownership" number="05" title="Lineage + Ownership"><LineageOwnership /></Section>
      <Section id="quality-observability" number="06" title="Observability"><Observability /></Section>
      <Section id="governance-answer" number="07" title="Interview Answer"><div className="mx-auto mt-5 w-full max-w-5xl rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] px-6 py-5 text-justify text-sm font-medium leading-7 md:px-8">Governance and quality wrap every YouTube data layer rather than running as a final audit. Producer contracts define schema, semantics, privacy class, and ownership; ingestion rejects malformed records to quarantine; Silver validates deduplication, identity scope, relationships, and distributions; and Gold is published only after completeness, freshness, reconciliation, semantic, and finance checks. A hard failure keeps consumers on the last certified version, while a bounded warning requires an owner, impact statement, expiry, and follow-up. DataHub, Unity Catalog, or Purview provides discovery and lineage from a Creator Studio metric back to source events and owners. Sensitive data is classified and tokenized, consent is enforced before downstream use, made-for-kids data receives stricter treatment, and RBAC/ABAC, row and column security, masking, TLS, and KMS protect access. GDPR and CCPA requests propagate deletion or anonymization through Iceberg, warehouses, caches, and feature stores, with tombstones preventing a future Bronze replay from restoring the identity. Finally, infrastructure, pipeline, data, and business monitoring route every alert with severity, owner, runbook, impact, lineage, and recent deployment context.</div></Section>
    </YouTubeFrame>
  );
}
