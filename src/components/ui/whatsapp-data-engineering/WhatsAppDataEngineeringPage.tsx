"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import CompanyChapterRail from "../data-design/CompanyChapterRail";
import MobileSectionNav from "../data-design/MobileSectionNav";
import WhatsAppArchitecture from "./WhatsAppArchitecture";
import WhatsAppIngestionKafka from "./WhatsAppIngestionKafka";
import WhatsAppBatchLakehouse from "./WhatsAppBatchLakehouse";
import WhatsAppDataModeling, {
  DEFAULT_WHATSAPP_MODEL_EXPLANATION,
  type WhatsAppModelExplanation,
} from "./WhatsAppDataModeling";
import WhatsAppEventSources from "./WhatsAppEventSources";
import WhatsAppGovernanceQuality from "./WhatsAppGovernanceQuality";
import WhatsAppInterviewQA from "./WhatsAppInterviewQA";
import {
  WHATSAPP_CHAPTERS,
  WHATSAPP_SECTIONS,
  type WhatsAppChapter,
} from "./data";

const GREEN = "#111111";
const PAPER = "#f1f1f1";
const BORDER = "#d8d8d8";

type IconName =
  | "phone"
  | "server"
  | "stream"
  | "lake"
  | "chart"
  | "shield"
  | "clock"
  | "repeat"
  | "layers"
  | "users"
  | "activity"
  | "database";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    phone: <><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/></>,
    server: <><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01M11 7h7M11 17h7"/></>,
    stream: <><path d="M4 6h12a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H8a4 4 0 0 0-4 4"/><path d="m7 15-3 3-3-3"/></>,
    lake: <><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    repeat: <><path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></>,
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    activity: <><path d="M3 12h4l2-7 4 14 2-7h6"/></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/></>,
  };

  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function Section({
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
  children: ReactNode;
}) {
  return (
    <section id={id} className="rounded-[26px] border border-[#d8d8d8] bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,.055)] sm:p-7">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[#111]" aria-hidden />
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.19em] text-[#111]">{eyebrow}</p>
          <h2 className="mt-1.5 text-2xl font-bold tracking-[-.04em] text-[#111] sm:text-[28px]">{title}</h2>
          {subtitle ? <p className="mt-2 max-w-4xl text-sm leading-6 text-[#5f5f5f]">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Badge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "dark" | "soft" }) {
  const styles = tone === "dark"
    ? "border-white/15 bg-white/10 text-white"
    : tone === "soft"
      ? "border-[#d8d8d8] bg-[#f7f7f7] text-[#5f5f5f]"
      : "border-[#bdbdbd] bg-[#ededed] text-[#111]";
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[10px] font-bold ${styles}`}>{children}</span>;
}

const PRODUCERS = [
  { icon: "server" as const, code: "MSG", title: "Messaging services", detail: "Emit accepted, routed, delivered, read, failed, expired, and retry facts after messaging state changes.", example: "A message accepted in ap-south reaches an Android device 132 ms later after zero retries. The service emits message_delivered without exposing its text.", dataPath: "Attach event and ingestion time, tokenized conversation ID, region, network class, latency, retry count, trace ID, privacy class, and schema version.", interview: "Messaging owns delivery truth. Analytics consumes its facts asynchronously and can never mark a message delivered." },
  { icon: "phone" as const, code: "EDGE", title: "Clients + edge", detail: "Produce connection, request, client-version, network-class, and privacy-safe interaction telemetry.", example: "After an app release, connection setup latency rises only for one Android version on 4G in a region. Edge telemetry makes the cohort visible.", dataPath: "Batch non-critical client telemetry, validate clocks and versions at ingestion, sample declared high-volume signals, and retain exact operational errors separately.", interview: "Treat clients as untrusted and frequently offline. Use stable event IDs, event time, ingestion time, and explicit sampling—not client claims as business truth." },
  { icon: "users" as const, code: "GROUP", title: "Groups + devices", detail: "Emit membership changes, fan-out outcomes, device registration, and hot-group pressure signals.", example: "One large group creates a burst across thousands of recipient devices. The platform measures fan-out attempts, completions, retries, and skew by group-size band.", dataPath: "Preserve ordering only where required, avoid raw group membership in broad analytics, salt hot aggregation keys, and monitor per-partition state growth.", interview: "Large groups and multi-device delivery create hot keys and event amplification; averages hide the partitions that fail first." },
  { icon: "activity" as const, code: "MEDIA", title: "Media + calls", detail: "Produce upload, download, call-setup, bitrate, jitter, loss, and disconnect outcomes—not content.", example: "A video upload retries once on a weak network, while a call cohort sees packet loss above 5%. Both become quality signals without exposing media bytes.", dataPath: "Store blobs outside the analytics stream; publish coarse size bands, durations, outcome codes, network class, region, codec/client version, and quality windows.", interview: "Media traffic dominates bytes and call samples dominate event volume. Size and retain them separately from small message lifecycle events." },
] as const;

const PLATFORM_STAGES = [
  { icon: "stream" as const, code: "BUS", title: "Durable event bus", detail: "Kafka or Pulsar absorbs privacy-safe facts, decouples producers, and provides bounded replay.", example: "Delivery, call-quality, and bulk telemetry use separate topic families so a call-sample surge cannot starve critical delivery events.", dataPath: "Partition by the smallest key that preserves required order, use schema registry, acks and replication, quotas, tiered retention, lag monitoring, and isolated replay lanes.", interview: "Kafka is a durable transport log—not the message store, not a global ordering service, and not an end-to-end exactly-once guarantee." },
  { icon: "activity" as const, code: "RT", title: "Stream processing", detail: "Flink validates, deduplicates, enriches, windows by event time, and detects anomalies with checkpointed state.", example: "message_accepted and message_delivered are joined by tokenized message ID to update one-minute delivery success and p99 latency by region and app version.", dataPath: "Use event-time watermarks, stable event-ID dedupe, bounded keyed state, broadcast reference data, incremental checkpoints, DLQs, and idempotent versioned sinks.", interview: "Explain late data and state limits. Exactly-once processing still needs logical dedupe and an idempotent sink across system boundaries." },
  { icon: "lake" as const, code: "LAKE", title: "Open lakehouse", detail: "Object storage and Iceberg retain raw evidence, trusted entities, certified aggregates, and reproducible snapshots.", example: "Raw message_delivered bytes land in Bronze; Silver deduplicates and tokenizes them; Gold publishes daily delivery SLOs and capacity features.", dataPath: "Keep schema IDs and source coordinates, partition by low-cardinality time/region, compact small files, enforce quality gates, and use snapshot/version history for correction.", interview: "Bronze is replay evidence, Silver is reusable truth, and Gold is an owned data product. None of them serves transactional message delivery." },
  { icon: "repeat" as const, code: "BATCH", title: "Batch + replay", detail: "Spark compacts files, rebuilds history, applies deletions, and publishes corrected products through gates.", example: "A latency bug affected three hours of Android delivery events. Spark replays only those raw partitions into staging, compares totals, then publishes a new snapshot.", dataPath: "Make transformations deterministic and parameterized; record input snapshots, code version, rule version, row counts, reconciliation results, and the final atomic publish.", interview: "Backfill is a controlled data release—not an overwrite. Isolate it from live traffic and prove the corrected result before promotion." },
] as const;

const CONSUMERS = [
  { icon: "chart" as const, code: "OPS", title: "Reliability operations", detail: "Consume delivery rate, p99 latency, regional health, backlog, and freshness in seconds to minutes.", example: "An alert shows delivery success falling in one region while queue depth grows. Operators drill from aggregate window to service trace without reading message content.", dataPath: "Serve windowed aggregates in real-time OLAP with last-updated time, completeness, source lag, dimensions, alert threshold, and a conservative stale fallback.", interview: "Operations needs fast, explainable signals. A dashboard without freshness and completeness is unsafe during an incident." },
  { icon: "database" as const, code: "BI", title: "Product analytics", detail: "Consume governed DAU, adoption, experiments, engagement, and historical reliability trends.", example: "A multi-device feature analysis joins exposure to delivery outcomes and app version, using a stable metric definition and no private message text.", dataPath: "Publish conformed Silver facts and owned Gold tables through Trino or a warehouse semantic layer with documented grain, lineage, owner, and refresh SLO.", interview: "Define the metric grain before the schema. Engagement is not an excuse to ingest plaintext or raw contact graphs." },
  { icon: "shield" as const, code: "TRUST", title: "Privacy-safe ML", detail: "Consume approved abuse, reliability, and forecasting features with online/offline consistency.", example: "A spam model uses rate bands, repeated-failure counts, and short-lived graph aggregates—not message text—to score abnormal sending behavior.", dataPath: "Create point-in-time-correct offline features and versioned online materializations; attach consent/purpose metadata, TTL, model version, and deletion propagation.", interview: "Call out feature leakage, skew, restricted access, false-positive monitoring, and why low-entropy identifiers require keyed tokenization rather than plain hashes." },
  { icon: "layers" as const, code: "PLAN", title: "Capacity + cost", detail: "Consume regional demand, storage growth, broker load, compute use, and retention projections.", example: "Forecasts show call-quality samples driving event volume while media blobs drive bytes. The teams scale and retain these workloads independently.", dataPath: "Use certified daily aggregates, peak and skew distributions, compression and replication factors, backlog-drain tests, and per-product cost attribution.", interview: "Capacity follows peak amplified events, not daily message average. Separate hot Kafka retention from economical lakehouse history." },
] as const;

const DATA_PRODUCTS = [
  {
    icon: "stream" as const,
    title: "Delivery reliability data product",
    event: "message_delivered",
    flow: "message_accepted → message_routed → message_delivered → message_read",
    grain: "Silver: one row per tokenized message-recipient-device delivery outcome. Gold: one row per region × platform × network × minute.",
    sources: "Messaging and delivery services emit accepted, routed, attempted, delivered, read, failed, and expired events.",
    build: "Validate schema, deduplicate event_id, join lifecycle stages, calculate accepted-to-delivered latency, handle late receipts, then aggregate success rate and percentiles.",
    example: "A message is accepted in ap-south and delivered 132 ms later on Android over 4G. The event records the 132 ms outcome—not the message text.",
    serving: "Flink publishes minute windows to real-time OLAP; Iceberg retains Silver facts and certified Gold history for Trino and experiments.",
    privacy: "Never include plaintext, phone numbers, raw contact books, or unnecessary device identifiers.",
  },
  {
    icon: "lake" as const,
    title: "Media transfer quality product",
    event: "media_upload_completed",
    flow: "media_upload_started → uploaded → downloaded / failed",
    grain: "Silver: one row per upload or download attempt. Gold: one row per media class × size band × network × region × time window.",
    sources: "Media upload/download services emit start, completion, failure, retry, duration, and coarse-size metadata; blobs remain separate.",
    build: "Deduplicate retries, normalize outcome codes, bucket size and duration, join client/network dimensions, and compute transfer success and latency percentiles.",
    example: "A 10–25 MB video finishes upload after one retry. Analytics sees the size band and latency, not the video itself.",
    serving: "Real-time OLAP serves current regressions; Iceberg and Trino serve CDN planning, storage forecasts, and client-version comparisons.",
    privacy: "Keep blob contents and private URLs out of analytical events; tokenize identifiers and apply short retention where possible.",
  },
  {
    icon: "activity" as const,
    title: "Call quality data product",
    event: "call_quality_sample",
    flow: "call_started → call_connected → quality samples → call_ended",
    grain: "Silver: one row per call-quality sampling window. Gold: one row per completed call plus region/network/client aggregates.",
    sources: "Call signaling emits start, connected, and ended facts; quality collectors emit periodic bitrate, jitter, loss, and network samples.",
    build: "Sessionize by tokenized call ID, order by event time, bound missing end events, aggregate samples, and derive setup latency and quality bands.",
    example: "A call connects in 840 ms, then packet loss rises above 5% on one network. A windowed job flags the affected region and app version.",
    serving: "Streaming windows power quality alerts; Iceberg/Trino products support codec experiments, carrier analysis, and capacity planning.",
    privacy: "No audio or video content. Restrict fine-grained network and device attributes through field classification and purpose-bound access.",
  },
  {
    icon: "chart" as const,
    title: "Platform health data product",
    event: "service_error",
    flow: "gateway metrics → queue depth → broker lag → sink freshness",
    grain: "One row per service × region × availability zone × metric × minute, with rollups for the current incident window.",
    sources: "Edge, messaging services, Kafka, Flink, object storage, and serving systems publish metrics, errors, lags, and checkpoint health.",
    build: "Normalize metric contracts, aggregate histograms, correlate queue depth with consumer lag and freshness, and retain deployment/service versions.",
    example: "Delivery success drops while one regional queue grows and Kafka lag remains healthy. Operators can isolate the messaging tier instead of blaming the data pipeline.",
    serving: "Alerting and real-time OLAP consume current windows; historical Gold tables support incident review and infrastructure forecasting.",
    privacy: "Prefer aggregate counters and traces without user identity. Sample carefully and apply operational retention limits.",
  },
  {
    icon: "shield" as const,
    title: "Trust feature data product",
    event: "abuse_signal",
    flow: "privacy-safe behavior → feature window → risk signal → reviewed action",
    grain: "One versioned feature vector per rotating actor token × feature timestamp, plus one row per risk decision and outcome.",
    sources: "Rate-limit, delivery, device, and restricted trust systems provide approved behavioral counters and reviewed outcome labels.",
    build: "Compute event-time feature windows, preserve point-in-time correctness, version feature definitions, materialize online/offline values, and monitor skew.",
    example: "A device exceeds an allowed send-rate pattern. Streaming updates a short-lived risk feature without inspecting private message content.",
    serving: "A feature KV store serves low-latency approved features; restricted Iceberg snapshots support training, monitoring, and false-positive analysis.",
    privacy: "Highly restricted product. Minimize fields, enforce audited access, limit retention, and avoid re-identifiable low-entropy hashes.",
  },
  {
    icon: "repeat" as const,
    title: "Governance audit data product",
    event: "schema_rejected",
    flow: "contract check → quarantine → correction → replay → certified publish",
    grain: "One immutable row per contract check, quality result, deletion action, backfill, replay, certification, or publish decision.",
    sources: "Schema registry, quality jobs, privacy workflows, catalog, lineage service, access audit, and orchestration metadata.",
    build: "Standardize control outcomes, link dataset and code versions, reconcile affected ranges, record approvals, and retain evidence of corrective publication.",
    example: "A producer sends an incompatible field type. The record is quarantined, the owner fixes the contract, and the affected offsets are replayed into staging.",
    serving: "Governance dashboards, catalogs, release gates, auditors, and incident reviewers query the immutable control history.",
    privacy: "Control events reference datasets and tokenized subjects; they should not duplicate the sensitive rows they govern.",
  },
] as const;

type SelectedCard = { zone: "source" | "platform" | "consumer"; index: number };

function MissionCard({
  item,
  active,
  onSelect,
}: {
  item: { icon: IconName; code: string; title: string; detail: string; example: string; dataPath: string; interview: string };
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      onFocus={onSelect}
      onMouseEnter={onSelect}
      className={`flex min-h-[72px] w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left outline-none transition ${active ? "border-[#111] bg-white shadow-[0_8px_24px_rgba(0,0,0,.13)] ring-2 ring-black/10" : "border-[#d8d8d8] bg-[#ededed] hover:border-[#777] hover:bg-white"}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-[#111] text-white" : "bg-white text-[#111]"}`}><Icon name={item.icon} /></span>
      <span className="min-w-0"><span className="block text-[9px] font-extrabold tracking-[.14em] text-[#5f5f5f]">{item.code}</span><span className="mt-0.5 block text-xs font-bold text-[#111]">{item.title}</span></span>
    </button>
  );
}

function Arrow() {
  return <div className="flex items-center justify-center text-[#111]" aria-hidden><span className="h-px flex-1 bg-[#bdbdbd]"/><span className="-ml-1 text-xl">›</span></div>;
}

function StartHere() {
  const [selected, setSelected] = useState<SelectedCard>({ zone: "platform", index: 1 });
  const [selectedDataProduct, setSelectedDataProduct] = useState(0);
  const selectedItem = selected.zone === "source" ? PRODUCERS[selected.index] : selected.zone === "platform" ? PLATFORM_STAGES[selected.index] : CONSUMERS[selected.index];
  const dataProduct = DATA_PRODUCTS[selectedDataProduct];

  return (
    <div className="mt-5 space-y-5">
      <Section id="platform-mission" eyebrow="01 · Platform mission" title="Turn system behavior into trusted data products" subtitle="The big-data platform observes the encrypted messaging system; it does not become the message store or require plaintext content.">
        <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1fr)_34px_minmax(0,1.08fr)_34px_minmax(0,1fr)]">
          <div>
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[.17em] text-[#5f5f5f]">Privacy-safe producers</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{PRODUCERS.map((item, index) => <MissionCard key={item.code} item={item} active={selected.zone === "source" && selected.index === index} onSelect={() => setSelected({ zone: "source", index })} />)}</div>
          </div>
          <Arrow />
          <div className="rounded-[22px] border border-[#bdbdbd] bg-[#ededed] p-4 text-[#111] shadow-[0_18px_45px_rgba(0,0,0,.08)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#c8c8c8] pb-4">
              <div><p className="text-[9px] font-bold uppercase tracking-[.17em] text-[#5f5f5f]">Shared backbone</p><h3 className="mt-1 text-lg font-bold">Big-data plane</h3></div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111] text-white"><Icon name="layers" /></span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{PLATFORM_STAGES.map((item, index) => <MissionCard key={item.code} item={item} active={selected.zone === "platform" && selected.index === index} onSelect={() => setSelected({ zone: "platform", index })} />)}</div>
          </div>
          <Arrow />
          <div>
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[.17em] text-[#5f5f5f]">Governed consumers</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{CONSUMERS.map((item, index) => <MissionCard key={item.code} item={item} active={selected.zone === "consumer" && selected.index === index} onSelect={() => setSelected({ zone: "consumer", index })} />)}</div>
          </div>
        </div>
        <article className="mt-4 overflow-hidden rounded-[22px] border border-[#bdbdbd] bg-[#f7f7f7]" aria-live="polite">
          <div className="flex items-start gap-4 border-b border-[#d8d8d8] bg-white p-4 sm:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111] text-white"><Icon name={selectedItem.icon} /></span><div><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#5f5f5f]">{selectedItem.code}</p><h4 className="mt-1 text-base font-bold text-[#111]">{selectedItem.title}</h4><p className="mt-1 text-xs leading-5 text-[#5f5f5f]">{selectedItem.detail}</p></div></div>
          <div className="grid gap-px bg-[#d8d8d8] md:grid-cols-3">
            <div className="bg-[#f7f7f7] p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">WhatsApp example</p><p className="mt-2 text-xs leading-6 text-[#444]">{selectedItem.example}</p></div>
            <div className="bg-[#f7f7f7] p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">Big-data responsibility</p><p className="mt-2 text-xs leading-6 text-[#444]">{selectedItem.dataPath}</p></div>
            <div className="bg-[#ededed] p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">Interview point</p><p className="mt-2 text-xs font-semibold leading-6 text-[#333]">{selectedItem.interview}</p></div>
          </div>
        </article>
      </Section>

      <Section id="two-plane-boundary" eyebrow="02 · System boundary" title="Know which plane owns each decision" subtitle="Use one delivered message to explain the boundary. The online path fulfills the user promise; the big-data path observes that promise and improves the system later.">
        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_44px_1fr_44px_1fr] lg:items-stretch">
          {[
            { n: "1", title: "Deliver ciphertext", owner: "Online messaging plane", icon: "phone" as const, detail: "The client encrypts the payload. Edge and routing services authenticate, order, persist pending delivery state, fan out to devices, and retry offline recipients.", output: "User outcome: message delivered" },
            { n: "2", title: "Emit a lifecycle fact", owner: "Asynchronous handoff", icon: "stream" as const, detail: "After the state transition, the delivery service emits message_delivered with event time, tokenized IDs, region, device/network class, latency, and retry count.", output: "Durable fact: no plaintext" },
            { n: "3", title: "Compute a data product", owner: "Big-data plane", icon: "chart" as const, detail: "Kafka buffers the event; Flink deduplicates and updates reliability windows; Iceberg retains history for Trino, batch correction, dashboards, and approved ML.", output: "Consumer: SLO + analytics" },
          ].map((step, index) => <div key={step.n} className="contents"><article className="rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7] p-5"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111] text-white"><Icon name={step.icon}/></span><span className="font-mono text-[10px] font-bold text-[#777]">STEP {step.n}</span></div><p className="mt-4 text-[9px] font-bold uppercase tracking-[.14em] text-[#5f5f5f]">{step.owner}</p><h3 className="mt-1 text-base font-bold text-[#111]">{step.title}</h3><p className="mt-3 text-xs leading-6 text-[#5f5f5f]">{step.detail}</p><p className="mt-4 border-t border-[#d8d8d8] pt-3 text-[10px] font-bold text-[#333]">{step.output}</p></article>{index < 2 ? <div className="flex items-center justify-center text-2xl text-[#777]" aria-hidden>→</div> : null}</div>)}
        </div>
      </Section>

      <Section id="interview-scope" eyebrow="03 · Interview scope" title="Cover the product, then narrow to the data platform" subtitle="A complete WhatsApp-like product is broad. Name the surrounding features once, then spend interview time on the big-data responsibilities that determine the architecture.">
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="overflow-hidden rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7]"><div className="border-b border-[#d8d8d8] bg-[#ededed] px-5 py-4"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#5f5f5f]">Product context · acknowledge briefly</p><p className="mt-1 text-xs leading-5 text-[#444]">Show product awareness by mapping each surface to the data it creates.</p></div><div className="grid gap-px bg-[#d8d8d8] sm:grid-cols-2">{[
            ["Messages + receipts", "delivery lifecycle, latency, retries"],
            ["Groups + multi-device", "fan-out, membership, hot-key skew"],
            ["Media + calls", "transfer and quality telemetry"],
            ["Presence + notifications", "session and delivery outcomes"],
            ["Status + engagement", "privacy-safe view/adoption facts"],
            ["Safety + backups", "restricted signals and retention"],
          ].map(([surface, signal], index) => <div key={surface} className="bg-white p-4"><div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#111] font-mono text-[9px] font-bold text-white">{String(index + 1).padStart(2, "0")}</span><div><h3 className="text-xs font-bold text-[#111]">{surface}</h3><p className="mt-1 text-[10px] leading-4 text-[#5f5f5f]">{signal}</p></div></div></div>)}</div><p className="border-t border-[#d8d8d8] bg-[#f7f7f7] px-5 py-4 text-xs leading-5 text-[#5f5f5f]">Implementing chat routing, encryption protocols, or call media transport is outside this big-data round.</p></article>
          <article className="rounded-2xl border border-[#111] bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#111]">Design deeply · interview focus</p><div className="mt-4 grid grid-cols-2 gap-2">{["event production", "stream ingestion", "real-time processing", "lakehouse", "batch + backfill", "data modeling", "quality + contracts", "observability", "privacy + deletion", "cost + retention", "multi-region DR", "serving + ML"].map((item, index) => <div key={item} className="flex min-h-10 items-center gap-2 rounded-xl bg-[#ededed] px-3 text-[11px] font-semibold"><span className="font-mono text-[9px] text-[#777]">{String(index + 1).padStart(2, "0")}</span>{item}</div>)}</div></article>
        </div>
      </Section>

      <Section id="data-products" eyebrow="04 · Data products" title="Build governed products from WhatsApp operational events" subtitle="Each product needs an explicit grain, source events, deterministic transformation, serving path, concrete WhatsApp use, and privacy contract.">
        <div className="mt-6 grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{DATA_PRODUCTS.map((item, index) => <button key={item.title} type="button" aria-pressed={selectedDataProduct === index} onMouseEnter={() => setSelectedDataProduct(index)} onFocus={() => setSelectedDataProduct(index)} onClick={() => setSelectedDataProduct(index)} className={`flex min-h-[66px] items-center gap-3 rounded-2xl border p-3 text-left transition ${selectedDataProduct === index ? "border-[#111] bg-[#ededed]" : "border-[#d8d8d8] bg-white hover:border-[#777]"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedDataProduct === index ? "bg-[#111] text-white" : "bg-[#ededed] text-[#111]"}`}><Icon name={item.icon}/></span><span><span className="block text-[9px] font-bold uppercase tracking-[.12em] text-[#777]">Primary source · {item.event}</span><span className="mt-1 block text-xs font-bold text-[#111]">{item.title}</span></span></button>)}</div>
          <article className="overflow-hidden rounded-[22px] border border-[#bdbdbd] bg-[#f7f7f7]" aria-live="polite">
            <div className="flex items-start gap-4 border-b border-[#d8d8d8] bg-white p-5"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#111] text-white"><Icon name={dataProduct.icon}/></span><div><p className="font-mono text-[10px] font-bold text-[#5f5f5f]">SOURCE LIFECYCLE</p><h3 className="mt-1 text-xl font-bold tracking-[-.03em]">{dataProduct.title}</h3><p className="mt-2 font-mono text-[10px] leading-5 text-[#333]">{dataProduct.flow}</p></div></div>
            <div className="grid gap-px bg-[#d8d8d8] sm:grid-cols-2">
              {[
                ["Product grain", dataProduct.grain],
                ["Source events", dataProduct.sources],
                ["Big-data build", dataProduct.build],
                ["Serving path", dataProduct.serving],
                ["WhatsApp example", dataProduct.example],
              ].map(([label, value], index) => <div key={label} className={`bg-[#f7f7f7] p-4 ${index === 4 ? "sm:col-span-2" : ""}`}><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">{label}</p><p className="mt-2 text-xs leading-6 text-[#444]">{value}</p></div>)}
            </div>
            <div className="flex gap-3 border-t border-[#d8d8d8] bg-[#ededed] p-4"><Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0"/><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">Privacy rule</p><p className="mt-1 text-xs leading-5 text-[#333]">{dataProduct.privacy}</p></div></div>
          </article>
        </div>
      </Section>

      <Section id="interview-handoff" eyebrow="05 · Say this" title="Open with the data boundary, then follow the facts">
        <div className="mt-6 rounded-[22px] border border-[#bdbdbd] border-l-4 border-l-[#111] bg-[#ededed] p-5 text-[#111] sm:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#5f5f5f]">60-second answer</p>
          <p className="mt-4 text-base font-medium leading-8 sm:text-lg">“I split the design into an online messaging plane and a big-data plane. The first owns encrypted message delivery and low-latency state. The second consumes privacy-safe lifecycle events and telemetry through Kafka or Pulsar. Flink validates, deduplicates, enriches, windows, and detects anomalies; raw and curated history lands in an Iceberg lakehouse for Spark, Trino, dashboards, and approved ML features. I design for event-time, replay, schema evolution, hot keys, regional failure, deletion workflows, and tens of millions of peak events per second—without requiring plaintext messages.”</p>
        </div>
      </Section>
    </div>
  );
}

const FUNCTIONAL_REQUIREMENTS = [
  ["Reliability telemetry", "Track accepted, routed, delivered, read, retried, and failed outcomes across regions and devices."],
  ["Latency + SLOs", "Compute end-to-end delivery latency and service-stage latency at p50, p95, and p99."],
  ["Media + call quality", "Measure upload success, transfer duration, call setup, jitter, loss, bitrate, and disconnects."],
  ["Operational monitoring", "Detect regional degradation, queue growth, hot groups, broker lag, and abnormal traffic in seconds."],
  ["Historical analytics", "Publish privacy-safe DAU, adoption, experiment, reliability, and capacity datasets."],
  ["Replay + correction", "Reprocess history after a bug, late event, contract change, or metric-definition correction."],
] as const;

function FreshnessContracts() {
  const contracts = [
    { consumer: "Incident detection", clock: "seconds", width: "18%" },
    { consumer: "Live reliability", clock: "< 1 min", width: "32%" },
    { consumer: "Experiment guardrails", clock: "1–5 min", width: "48%" },
    { consumer: "Product analytics", clock: "hourly", width: "72%" },
    { consumer: "Certified history", clock: "daily", width: "100%" },
  ] as const;

  return (
    <Section id="freshness-contracts" eyebrow="02 · Freshness" title="Match each output to the clock that needs it">
      <div className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-[#d8d8d8] bg-[#d8d8d8]">
        {contracts.map((item) => <div key={item.consumer} className="grid items-center gap-3 bg-[#f7f7f7] px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)_90px]"><p className="text-xs font-bold text-[#111]">{item.consumer}</p><div className="h-2 overflow-hidden rounded-full bg-[#d8d8d8]"><span className="block h-full rounded-full bg-[#111]" style={{ width: item.width }}/></div><strong className="font-mono text-xs sm:text-right">{item.clock}</strong></div>)}
      </div>
    </Section>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const progress = ((value - min) / (max - min)) * 100;
  return <label className="block rounded-2xl border border-[#d8d8d8] bg-white p-4"><span className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-[#333]">{label}</span><strong className="rounded-lg bg-[#ededed] px-2.5 py-1 font-mono text-xs text-[#111]">{value}{suffix}</strong></span><input className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#d8d8d8] accent-[#111]" style={{ background: `linear-gradient(to right, ${GREEN} ${progress}%, #d8d8d8 ${progress}%)` }} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} /><span className="mt-2 flex justify-between text-[9px] font-semibold text-[#777]"><span>{min}{suffix}</span><span>{max}{suffix}</span></span></label>;
}

function compact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function millions(value: number, digits = 2) {
  return `${(value / 1_000_000).toFixed(digits)}M`;
}

function Requirements() {
  const [messagesPerDay, setMessagesPerDay] = useState(100);
  const [peakMultiplier, setPeakMultiplier] = useState(5);
  const [eventsPerMessage, setEventsPerMessage] = useState(3.7);
  const [averageBytes, setAverageBytes] = useState(650);

  const calculations = useMemo(() => {
    const secondsPerDay = 86_400;
    const replicationFactor = 3;
    const kafkaRetentionDays = 7;
    const compressionRatio = 4;
    const headroomFactor = 1.3;
    const partitionBudgetMBps = 10;
    const streamTaskBudget = 150_000;
    const messages = messagesPerDay * 1_000_000_000;
    const averageMessagesPerSecond = messages / secondsPerDay;
    const peakMessagesPerSecond = averageMessagesPerSecond * peakMultiplier;
    const eventsPerDay = messages * eventsPerMessage;
    const averageEventsPerSecond = eventsPerDay / secondsPerDay;
    const peakEventsPerSecond = peakMessagesPerSecond * eventsPerMessage;
    const logicalBytesPerDay = eventsPerDay * averageBytes;
    const logicalTbPerDay = logicalBytesPerDay / 1_000_000_000_000;
    const peakIngressGBps = peakEventsPerSecond * averageBytes / 1_000_000_000;
    const brokerWriteGBps = peakIngressGBps * replicationFactor;
    const plannedBrokerWriteGBps = brokerWriteGBps * headroomFactor;
    const kafkaPbAtRf3 = logicalTbPerDay * kafkaRetentionDays * replicationFactor / 1_000;
    const compressedTbPerDay = logicalTbPerDay / compressionRatio;
    const compressedPbPerYear = compressedTbPerDay * 365 / 1_000;
    const minimumPartitions = Math.ceil(peakIngressGBps * 1_000 * headroomFactor / partitionBudgetMBps);
    const streamTasks = Math.ceil(peakEventsPerSecond * headroomFactor / streamTaskBudget);
    const messageEnvelopeTbPerDay = messages * 1_000 / 1_000_000_000_000;
    const messageEnvelopeRf3TbPerDay = messageEnvelopeTbPerDay * replicationFactor;
    return { averageMessagesPerSecond, peakMessagesPerSecond, eventsPerDay, averageEventsPerSecond, peakEventsPerSecond, logicalTbPerDay, peakIngressGBps, brokerWriteGBps, plannedBrokerWriteGBps, kafkaPbAtRf3, compressedTbPerDay, compressedPbPerYear, minimumPartitions, streamTasks, messageEnvelopeTbPerDay, messageEnvelopeRf3TbPerDay };
  }, [messagesPerDay, peakMultiplier, eventsPerMessage, averageBytes]);

  return (
    <div className="mt-5 space-y-5">
      <Section id="functional-requirements" eyebrow="01 · Functional scope" title="Define what the data platform must produce" subtitle="Messaging features provide context. The interview focus is the data work required to observe, analyze, govern, and safely improve the system.">
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {FUNCTIONAL_REQUIREMENTS.map(([title, detail], index) => <article key={title} className="flex gap-2.5 rounded-xl border border-[#d8d8d8] bg-[#f7f7f7] p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ededed] font-mono text-[9px] font-black text-[#111]">{String(index + 1).padStart(2, "0")}</span><div><h3 className="text-xs font-bold text-[#111]">{title}</h3><p className="mt-1 text-[10px] leading-4 text-[#5f5f5f]">{detail}</p></div></article>)}
        </div>
        <div className="mt-3 flex gap-2 rounded-xl border border-[#d8d8d8] bg-[#ededed] px-3 py-2.5"><Icon name="shield" className="h-4 w-4 shrink-0 text-[#111]"/><p className="text-[10px] leading-4 text-[#444]"><strong className="text-[#111]">Boundary:</strong> operational metadata and aggregates only; encrypted message bodies are not an analytics source.</p></div>
      </Section>

      <FreshnessContracts />

      <Section id="workload-model" eyebrow="03 · Capacity + sizing" title="Size the event stream, storage, and processing fleet" subtitle="The source anchor is 100B messages/day. Every result below follows from the visible assumptions, uses decimal units, and separates logical volume from physical replication.">
        <div className="mt-6 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="grid gap-3">
            <RangeControl label="Messages per day" value={messagesPerDay} min={50} max={200} step={10} suffix="B" onChange={setMessagesPerDay}/>
            <RangeControl label="Peak multiplier" value={peakMultiplier} min={2} max={8} step={1} suffix="×" onChange={setPeakMultiplier}/>
            <RangeControl label="Analytics events / message" value={eventsPerMessage} min={2} max={6} step={0.1} suffix="×" onChange={setEventsPerMessage}/>
            <RangeControl label="Average analytics event" value={averageBytes} min={300} max={1000} step={50} suffix=" B" onChange={setAverageBytes}/>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-[#bdbdbd] bg-white text-[#111]">
            <div className="border-b border-[#d8d8d8] bg-[#ededed] px-5 py-4"><p className="text-[9px] font-bold uppercase tracking-[.17em] text-[#111]">Derived capacity envelope</p><p className="mt-1 text-xs text-[#5f5f5f]">Decimal units · illustrative interview assumptions · before protocol overhead</p></div>
            <div className="grid gap-px bg-[#d8d8d8] sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Average message ingress", `${millions(calculations.averageMessagesPerSecond)}/s`, `${messagesPerDay}B messages/day ÷ 86,400 seconds/day = ${millions(calculations.averageMessagesPerSecond, 3)} messages/s`],
                ["Peak message ingress", `${millions(calculations.peakMessagesPerSecond)}/s`, `${millions(calculations.averageMessagesPerSecond, 3)} messages/s × ${peakMultiplier} = ${millions(calculations.peakMessagesPerSecond, 3)} messages/s`],
                ["Average analytical events", `${millions(calculations.averageEventsPerSecond)}/s`, `${compact(calculations.eventsPerDay)} events/day ÷ 86,400 seconds/day = ${millions(calculations.averageEventsPerSecond, 3)} events/s`],
                ["Peak analytical events", `${millions(calculations.peakEventsPerSecond)}/s`, `${millions(calculations.peakMessagesPerSecond, 3)} messages/s × ${eventsPerMessage} = ${millions(calculations.peakEventsPerSecond, 3)} events/s`],
                ["Peak logical ingress", `${calculations.peakIngressGBps.toFixed(2)} GB/s`, `${millions(calculations.peakEventsPerSecond, 3)} events/s × ${averageBytes} bytes/event ÷ 10⁹ = ${calculations.peakIngressGBps.toFixed(3)} GB/s`],
                ["Planned broker writes", `${calculations.plannedBrokerWriteGBps.toFixed(2)} GB/s`, `${calculations.peakIngressGBps.toFixed(3)} GB/s × 3 replicas × 1.30 = ${calculations.plannedBrokerWriteGBps.toFixed(3)} GB/s`],
              ].map(([label, value, formula]) => <div key={label} className="bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#777]">{label}</p><strong className="mt-2 block text-2xl tracking-[-.04em] text-[#111]">{value}</strong><code className="mt-2 block text-[10px] text-[#5f5f5f]">{formula}</code></div>)}
            </div>
            <div className="border-t border-[#d8d8d8] bg-[#f7f7f7] px-5 py-4 text-xs leading-5 text-[#5f5f5f]"><strong className="text-[#111]">Peak check:</strong> {millions(calculations.peakEventsPerSecond, 3)} events/s × {averageBytes} B/event = {calculations.peakIngressGBps.toFixed(3)} GB/s logical ingress; × RF3 = {calculations.brokerWriteGBps.toFixed(3)} GB/s broker writes; × 1.30 headroom = {calculations.plannedBrokerWriteGBps.toFixed(3)} GB/s planned.</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-[#d8d8d8] bg-[#ededed] p-3" aria-label="Fixed planning assumptions">{["RF = 3", "Kafka retention = 7 days", "Lake compression = 4:1", "Headroom = 30%", "Partition budget = 10 MB/s", "Stream task = 150K events/s", "Message envelope = 1 KB"].map((item) => <Badge key={item} tone="soft">{item}</Badge>)}</div>

        <div className="mt-4 overflow-hidden rounded-[22px] border border-[#bdbdbd]">
          <div className="border-b border-[#d8d8d8] bg-[#111] px-5 py-4 text-white"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-white/60">Capacity formula ledger</p><h3 className="mt-1 text-base font-bold">Every displayed number reconciles to these equations</h3></div>
          <div className="grid gap-px bg-[#d8d8d8] md:grid-cols-2">
            {[
              { label: "Analytical events / day", formula: "messages/day × events/message", substitution: `${messagesPerDay}B messages/day × ${eventsPerMessage} events/message`, value: compact(calculations.eventsPerDay), note: "Lifecycle amplification: accepted, routed, delivered, read, retry, device, group, media, and system facts." },
              { label: "Logical analytical bytes / day", formula: "events/day × average event bytes", substitution: `${compact(calculations.eventsPerDay)} events/day × ${averageBytes} bytes/event ÷ 10¹² bytes/TB`, value: `${calculations.logicalTbPerDay.toFixed(1)} TB/day`, note: "Before compression, replication, indexes, table metadata, and snapshots." },
              { label: "Kafka 7-day physical storage", formula: "logical TB/day × retention × RF", substitution: `${calculations.logicalTbPerDay.toFixed(1)} TB/day × 7 days × 3 replicas ÷ 1,000 TB/PB`, value: `${calculations.kafkaPbAtRf3.toFixed(2)} PB`, note: "Capacity floor; add filesystem, protocol, rebalance, and operational reserve separately." },
              { label: "Compressed lakehouse", formula: "logical TB/day ÷ compression", substitution: `${calculations.logicalTbPerDay.toFixed(1)} TB/day ÷ 4 compression ratio`, value: `${calculations.compressedTbPerDay.toFixed(1)} TB/day`, note: `${calculations.compressedTbPerDay.toFixed(1)} TB/day × 365 days ÷ 1,000 TB/PB = ${calculations.compressedPbPerYear.toFixed(2)} PB/year before snapshots and serving copies.` },
              { label: "Minimum partition lanes", formula: "peak MB/s × headroom ÷ tested partition MB/s", substitution: `${(calculations.peakIngressGBps * 1_000).toFixed(0)} MB/s × 1.30 headroom ÷ 10 MB/s/partition`, value: `${calculations.minimumPartitions.toLocaleString("en-US")} partitions`, note: "A throughput floor, not a final topic count. Validate the 10 MB/s budget on the real broker, record, key, and replication mix." },
              { label: "Streaming parallelism floor", formula: "peak events/s × headroom ÷ tested task rate", substitution: `${millions(calculations.peakEventsPerSecond, 3)} events/s × 1.30 headroom ÷ 150K events/s/task`, value: `${calculations.streamTasks} tasks`, note: "Benchmark stateful jobs with real skew, checkpointing, serialization, and sink latency before provisioning." },
              { label: "Operational message envelopes", formula: "messages/day × envelope bytes/message", substitution: `${messagesPerDay}B messages/day × 1 KB/message`, value: `${calculations.messageEnvelopeTbPerDay.toFixed(0)} TB/day logical`, note: `At RF3: ${calculations.messageEnvelopeRf3TbPerDay.toFixed(0)} TB/day physical. Keep only delivery-required hot data; this is separate from analytics and media.` },
              { label: "Broker write bandwidth", formula: "peak logical GB/s × RF × headroom", substitution: `${calculations.peakIngressGBps.toFixed(3)} GB/s × 3 replicas × 1.30 headroom`, value: `${calculations.plannedBrokerWriteGBps.toFixed(2)} GB/s`, note: "Excludes protocol overhead, cross-AZ topology effects, replication catch-up, and backfill traffic." },
            ].map((item) => <article key={item.label} className="bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="text-xs font-extrabold text-[#111]">{item.label}</h4><code className="mt-2 block text-[10px] leading-5 text-[#444]">{item.formula}</code></div><strong className="shrink-0 text-right text-base text-[#111]">{item.value}</strong></div><div className="mt-3 rounded-lg bg-[#ededed] px-3 py-2 font-mono text-[10px] leading-5 text-[#333]">{item.substitution}</div><p className="mt-2 text-[10px] leading-4 text-[#5f5f5f]">{item.note}</p></article>)}
          </div>
        </div>
      </Section>

      <Section id="capacity-implications" eyebrow="04 · From math to architecture" title="Every number must change a design decision" subtitle="Capacity math earns its place when it determines partitioning, cluster isolation, state limits, storage layout, or recovery strategy.">
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {[
            { n: "01", title: "Segment the event backbone", signal: `${compact(calculations.peakEventsPerSecond)}/s peak`, decision: "Separate critical lifecycle, high-volume telemetry, and bulk backfill traffic so one workload cannot consume every broker or quota." },
            { n: "02", title: "Partition for parallelism—and skew", signal: "hot groups + regions", decision: "Key only where ordering is required, salt aggregation keys, monitor partition imbalance, and give hot-key jobs explicit state limits." },
            { n: "03", title: "Checkpoint within the recovery budget", signal: "large keyed state", decision: "Use incremental checkpoints, durable remote state, bounded windows, and a tested restart time rather than promising magical exactly-once behavior." },
            { n: "04", title: "Batch object-store writes", signal: `${calculations.logicalTbPerDay.toFixed(0)} TB/day logical`, decision: "Write staged files, commit Iceberg snapshots atomically, compact small files, and evolve partitions without rewriting all history." },
            { n: "05", title: "Keep replay lanes independent", signal: "schema + job corrections", decision: "Reprocess from Kafka or immutable raw files into staging, compare results, then publish a new version without starving live consumers." },
            { n: "06", title: "Make privacy a pipeline property", signal: "billions of users", decision: "Tokenize early, minimize columns, enforce purpose-bound access, propagate deletion, audit reads, and expire data by product policy." },
          ].map((item) => <article key={item.n} className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-2xl border border-[#d8d8d8] bg-white p-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111] font-mono text-[10px] font-bold text-white">{item.n}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-[#111]">{item.title}</h3><Badge>{item.signal}</Badge></div><p className="mt-2 text-xs leading-5 text-[#5f5f5f]">{item.decision}</p></div></article>)}
        </div>
      </Section>

    </div>
  );
}

function Content({ chapter, onModelExplain }: { chapter: WhatsAppChapter; onModelExplain: (explanation: WhatsAppModelExplanation) => void }) {
  if (chapter === "requirements") return <Requirements />;
  if (chapter === "event-sources") return <WhatsAppEventSources />;
  if (chapter === "architecture") return <WhatsAppArchitecture />;
  if (chapter === "ingestion-kafka") return <WhatsAppIngestionKafka />;
  if (chapter === "batch-lakehouse") return <WhatsAppBatchLakehouse />;
  if (chapter === "data-modeling") return <div className="mt-5"><Section id="model-erd" eyebrow="WhatsApp analytical model" title="One ER diagram for every fact and dimension" subtitle="Hover, focus, or tap any table to highlight its warehouse joins and explain its exact row grain, contents, source, and WhatsApp use."><WhatsAppDataModeling onExplain={onModelExplain} /></Section></div>;
  if (chapter === "governance-quality") return <WhatsAppGovernanceQuality />;
  if (chapter === "interview-qa") return <WhatsAppInterviewQA />;
  return <StartHere />;
}

export default function WhatsAppDataEngineeringPage({ chapter }: { chapter: WhatsAppChapter }) {
  const activeIndex = WHATSAPP_CHAPTERS.findIndex((item) => item.id === chapter);
  const active = WHATSAPP_CHAPTERS[activeIndex];
  const sections = WHATSAPP_SECTIONS[chapter];
  const previous = WHATSAPP_CHAPTERS[activeIndex - 1];
  const next = WHATSAPP_CHAPTERS[activeIndex + 1];
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");
  const [modelExplanation, setModelExplanation] = useState<WhatsAppModelExplanation>(DEFAULT_WHATSAPP_MODEL_EXPLANATION);
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

  const pageStyle = {
    "--bg": PAPER,
    "--bg-card": "#ffffff",
    "--bg-muted": "#e9e9e9",
    "--border": BORDER,
    "--text": "#111111",
    "--text-muted": "#5f5f5f",
    "--text-faint": "#707070",
  } as CSSProperties;

  return (
    <div className="whatsapp-de-page min-h-[calc(100dvh-var(--site-nav-height))] bg-[#f1f1f1] text-[#111]" style={pageStyle}>
      <CompanyChapterRail company="whatsapp" chapters={WHATSAPP_CHAPTERS} activeId={chapter} hrefFor={(id) => `/data-engineering/whatsapp/${id}`} />
      <MobileSectionNav sections={sections} accent={GREEN} />

      <div className={`mx-auto grid w-full ${isModeling ? "max-w-[1920px] xl:grid-cols-[300px_minmax(0,1fr)]" : "max-w-[1600px] xl:grid-cols-[240px_minmax(0,1fr)]"}`}>
        <aside className={`hidden border-r border-[#d8d8d8] py-7 xl:block ${isModeling ? "px-4" : "px-5"}`}>
          <div className="sticky top-[calc(var(--de-chapter-shell-offset)+24px)]">
            <div className="mb-7 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[#d8d8d8] bg-white grayscale"><Image src="/logo-whatsapp.png" alt="" width={40} height={40} className="h-9 w-9 object-contain" priority /></span><p className="text-base font-bold tracking-[-.025em]">WhatsApp</p></div>
            <div className="mb-3 flex items-center justify-between"><p className="text-[9px] font-extrabold uppercase tracking-[.17em] text-[#5f5f5f]">Page anchors</p><span className="font-mono text-[9px] text-[#5f5f5f]">{sections.findIndex((section) => section.id === activeSection) + 1}/{sections.length}</span></div>
            <nav aria-label="Sections in this chapter" className="grid gap-2">{sections.map((section, index) => {
              const selected = section.id === activeSection;
              return <a key={section.id} href={`#${section.id}`} aria-current={selected ? "location" : undefined} className={`relative flex min-h-[52px] items-center gap-3 rounded-xl border px-3 text-xs font-semibold transition ${selected ? "border-[#111] bg-[#e4e4e4] text-[#111]" : "border-[#d8d8d8] bg-white text-[#5f5f5f] hover:border-[#777] hover:text-[#111]"}`}>{selected ? <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#111]" /> : null}<span className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[9px] font-bold ${selected ? "bg-[#111] text-white" : "bg-[#ededed] text-[#5f5f5f]"}`}>{index + 1}</span>{section.title}</a>;
            })}</nav>
            {isModeling ? <div data-testid="whatsapp-model-inspector" className="mt-3 overflow-hidden rounded-xl border border-[#111] bg-[#111] text-white shadow-[0_10px_28px_rgba(0,0,0,.16)]" aria-live="polite">
              <div className="border-b border-white/15 bg-[#1d1d1d] px-4 py-3"><p className="text-[9px] font-extrabold uppercase tracking-[.13em] text-[#cfcfcf]">{modelExplanation.group} table explanation</p><h2 className="mt-1 break-words text-base font-bold leading-5">{modelExplanation.name}</h2></div>
              <div className="grid gap-3 p-4 text-[11px] leading-5">
                <div><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-[#cfcfcf]">One row means</p><p className="mt-1">{modelExplanation.grain}</p></div>
                <div className="border-t border-white/15 pt-2.5"><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-[#cfcfcf]">Key contents</p><p className="mt-1 text-white/80">{modelExplanation.contents}</p></div>
                <div className="border-t border-white/15 pt-2.5"><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-[#cfcfcf]">How WhatsApp uses it</p><p className="mt-1 text-white/80">{modelExplanation.purpose}</p></div>
                <div className="border-t border-white/15 pt-2.5"><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-[#cfcfcf]">Created from</p><p className="mt-1 text-white/80">{modelExplanation.source}</p></div>
              </div>
            </div> : null}
            <div className="mt-6 overflow-hidden rounded-full bg-[#d8d8d8]"><span className="block h-1.5 rounded-full bg-[#111]" style={{ width: `${((activeIndex + 1) / WHATSAPP_CHAPTERS.length) * 100}%` }}/></div><p className="mt-2 font-mono text-[9px] text-[#5f5f5f]">Chapter {activeIndex + 1} of {WHATSAPP_CHAPTERS.length}</p>
          </div>
        </aside>

        <main data-de-content className={`min-w-0 pb-24 pt-5 md:pt-7 ${isModeling ? "px-3 sm:px-4 lg:px-5 2xl:px-6" : "px-4 sm:px-6 lg:px-10 xl:px-12"}`}>
          <header data-testid="chapter-page-heading" className="relative overflow-hidden rounded-[26px] border border-[#d8d8d8] bg-white px-5 py-5 shadow-[0_14px_44px_rgba(0,0,0,.06)] sm:px-7 sm:py-6">
            <div className="absolute -right-14 -top-20 h-52 w-52 rounded-full bg-[#ededed] blur-2xl" aria-hidden />
            <div className="relative flex items-start justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#5f5f5f]">WhatsApp · Big Data Engineering · {active.eyebrow}</p><h1 className="mt-2 text-3xl font-bold tracking-[-.05em] text-[#111] sm:text-4xl">{active.label}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f5f5f]">{active.description}</p></div><span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#111] text-white sm:flex"><Icon name={chapter === "requirements" ? "chart" : chapter === "architecture" ? "layers" : chapter === "batch-lakehouse" ? "lake" : chapter === "data-modeling" ? "database" : chapter === "governance-quality" ? "shield" : chapter === "interview-qa" ? "users" : "stream"} className="h-7 w-7"/></span></div>
          </header>

          <Content chapter={chapter} onModelExplain={setModelExplanation}/>

          <nav aria-label="Adjacent chapters" className="mt-6 grid gap-3 border-t border-[#d8d8d8] pt-6 sm:grid-cols-2">
            {previous ? <Link href={`/data-engineering/whatsapp/${previous.id}`} className="rounded-2xl border border-[#d8d8d8] bg-white p-4 transition hover:border-[#777]"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#5f5f5f]">← Previous</p><p className="mt-2 text-sm font-bold text-[#111]">{previous.label}</p></Link> : <Link href="/" className="rounded-2xl border border-[#d8d8d8] bg-white p-4 transition hover:border-[#777]"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#5f5f5f]">Library</p><p className="mt-2 text-sm font-bold text-[#111]">← All designs</p></Link>}
            {next ? <Link href={`/data-engineering/whatsapp/${next.id}`} className="rounded-2xl border border-[#111] bg-[#111] p-4 text-white transition hover:bg-[#2a2a2a]"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#d2d2d2]">Next →</p><p className="mt-2 text-sm font-bold">{next.label}</p></Link> : <Link href="/" className="rounded-2xl border border-[#111] bg-[#111] p-4 text-white transition hover:bg-[#2a2a2a]"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#d2d2d2]">Chapter {activeIndex + 1} complete</p><p className="mt-2 text-sm font-bold">Back to the library →</p></Link>}
          </nav>
        </main>
      </div>
    </div>
  );
}
