"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

function KafkaSection({
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
    <section
      id={id}
      className="rounded-[26px] border border-[#d8d8d8] bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,.055)] sm:p-7"
    >
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

function MonoBadge({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 font-mono text-[9px] font-bold ${dark ? "border-[#111] bg-[#111] text-white" : "border-[#c9c9c9] bg-[#ededed] text-[#333]"}`}>
      {children}
    </span>
  );
}

const HANDOFF_STAGES = [
  {
    code: "01",
    name: "Commit messaging state",
    summary: "The message service first records that encrypted message m_8f2 was accepted. Delivery remains owned by WhatsApp's operational database and device queues.",
    detail: "The analytical event is not allowed to create or approve messaging state. This ordering prevents a dashboard from showing message_accepted for a write that later rolled back.",
    input: "Encrypted message identifier, tokenized conversation, sender device, destination routing state",
    output: "Committed operational row plus a stable business transition",
    promise: "Messaging truth exists before analytics describes it",
  },
  {
    code: "02",
    name: "Write the outbox record",
    summary: "In the same database transaction, the service appends a small message_accepted outbox row. It contains metadata and a stable event_id, never message plaintext.",
    detail: "A direct database write followed by a separate Kafka write creates a dual-write gap: the database can commit while Kafka fails. The transactional outbox makes that missing-event gap discoverable and retryable.",
    input: "Committed transition, event contract version, event time, privacy classification",
    output: "Pending event row tied to the source commit",
    promise: "No silent analytics loss after a successful source commit",
  },
  {
    code: "03",
    name: "Validate + publish",
    summary: "A regional publisher reads the outbox, validates the registered schema and privacy rules, adds ingestion_time, then routes the event to its domain topic.",
    detail: "The publisher reuses event_id across retries. An incompatible record is quarantined with a reason and source pointer; it is not silently discarded or forced into a topic with a guessed schema.",
    input: "Outbox row, producer identity, schema ID, regional routing policy",
    output: "Serialized event or an actionable quarantine record",
    promise: "Only known, privacy-safe contracts cross the ingestion boundary",
  },
  {
    code: "04",
    name: "Receive Kafka acknowledgement",
    summary: "The producer marks the outbox row published only after the regional Kafka cluster confirms the record under acks=all and the minimum in-sync-replica policy.",
    detail: "This acknowledgement means the analytical event is durable in Kafka. It does not mean the recipient's phone received the WhatsApp message; only a later message_delivered event can say that.",
    input: "Topic, partition key, compressed batch, producer sequence",
    output: "Topic, partition, offset and durable publish status",
    promise: "Durable analytical handoff without blocking message delivery",
  },
] as const;

const TOPICS = [
  {
    title: "Message lifecycle",
    topic: "messaging.lifecycle.v1",
    key: "conversation_hash",
    label: "Ordered conversation",
    sequence: ["accepted", "routed", "failed / expired"],
    summary: "Keep ordinary server-side chat transitions together so one conversation can be reconstructed in partition order.",
    explanation: "For a normal one-to-one or small group chat, conversation_hash sends the accepted, routed, failed and expired transitions to one partition. Device delivery and read receipts use the separate delivery topic below. Kafka preserves append order inside one partition only, so event_time and server sequence still travel with every record.",
    hotspot: "Detect very active conversations. A broadcast-scale group moves to a versioned bucketed key and explicit sequence strategy instead of overwhelming one partition.",
  },
  {
    title: "Recipient delivery",
    topic: "messaging.delivery.v1",
    key: "hash(message_id, recipient_bucket)",
    label: "Fan-out outcomes",
    sequence: ["attempt", "retry", "device ACK", "expiry"],
    summary: "Spread the many device-level outcomes created by a large WhatsApp group send.",
    explanation: "One group message can create hundreds or thousands of recipient-device facts. A deterministic recipient bucket distributes that fan-out while message_id and recipient_device_token preserve the grain needed to deduplicate and rebuild delivery results.",
    hotspot: "Total order across every recipient is unnecessary. Keep an event sequence per delivery entity, then reconcile bucket totals back to the group-message fact.",
  },
  {
    title: "Group + device state",
    topic: "groups.membership.v1",
    key: "group_hash",
    label: "Versioned reference",
    sequence: ["member added", "member removed", "version closed"],
    summary: "Order membership changes so delivery facts use the group and device eligibility that existed at send time.",
    explanation: "This stream is lower volume than delivery events but correctness-critical. Consumers materialize versioned membership and linked-device history, then perform point-in-time joins; the topic never becomes the live authorization source.",
    hotspot: "Very large groups can use snapshot-plus-delta publication, but each mutation keeps a monotonic membership version so consumers can detect gaps.",
  },
  {
    title: "Media lifecycle",
    topic: "media.lifecycle.v1",
    key: "media_object_token",
    label: "Metadata only",
    sequence: ["upload started", "completed", "downloaded", "failed"],
    summary: "Correlate encrypted media transfers without putting photos or videos in Kafka.",
    explanation: "Kafka receives a small record containing the tokenized media object, coarse size band, region, network class, retry count and outcome. The encrypted blob stays in object storage and is served through the media delivery path.",
    hotspot: "Reject oversized records at the publisher. A private object URL, encryption material, thumbnail, photo or video byte is not an analytical event field.",
  },
  {
    title: "Call quality",
    topic: "calls.quality.v1",
    key: "call_token",
    label: "Sampled telemetry",
    sequence: ["quality window", "quality window", "call ended"],
    summary: "Keep one call's quality windows together while isolating their extreme volume from delivery topics.",
    explanation: "Lifecycle events remain complete, while healthy RTT, jitter, loss and bitrate samples can be aggregated into bounded windows on the client or edge. Failed and poor-quality tails retain more diagnostic detail under a shorter policy.",
    hotspot: "Give call telemetry separate clusters or quotas so a sampling surge cannot consume the capacity reserved for message lifecycle events.",
  },
  {
    title: "Service telemetry",
    topic: "platform.service-metrics.v1",
    key: "service + region + time_bucket + salt",
    label: "Evenly distributed",
    sequence: ["count", "latency histogram", "error rate"],
    summary: "Distribute operational metrics broadly; no user or conversation ordering is required.",
    explanation: "Gateways and services publish pre-aggregated counters and histograms by service, region and short time bucket. A salt prevents one busy regional service from concentrating all metrics on a single partition.",
    hotspot: "Use explicit sampling and per-producer quotas. Telemetry is useful for diagnosis, but it must not crowd out the message facts used to calculate delivery health.",
  },
] as const;

const RELIABILITY_CONTROLS = [
  {
    title: "Transactional outbox",
    label: "Commit once, publish later",
    detail: "Message state and its pending event are committed atomically. The publisher can retry independently, so Kafka throttling delays analytics but does not ask a user to resend a successful WhatsApp message.",
    evidence: "source commit ID · outbox sequence · event_id",
    boundary: "Use CDC where the database log is reliable; use an application outbox where the service owns an explicit event payload.",
  },
  {
    title: "Idempotent producer",
    label: "Retry without creating a new fact",
    detail: "Use acks=all, enable.idempotence=true, bounded retries, RF=3, min.insync.replicas, compression and modest batching. The same logical event keeps the same event_id across attempts.",
    evidence: "producer ID · sequence · topic/partition/offset",
    boundary: "Kafka producer idempotence prevents some duplicate appends in one producer session; downstream consumers still deduplicate the business event_id.",
  },
  {
    title: "At-least-once consumption",
    label: "Promise one effect, not magical delivery",
    detail: "Flink or a sink can receive an event again after restart. Checkpoint offsets with state and use event_id or (message_id, event_type, recipient_device_token) to produce an idempotent effect.",
    evidence: "checkpoint · stable key · sink commit version",
    boundary: "Do not claim global exactly-once across phones, service databases, Kafka, processors and every analytical sink.",
  },
  {
    title: "Backpressure + isolation",
    label: "Protect delivery events first",
    detail: "Apply producer quotas, bounded buffers and separate domain clusters. When call samples surge, degrade optional sampling or let its lag grow before stealing capacity from critical message lifecycle topics.",
    evidence: "buffer use · throttle time · ISR · consumer lag",
    boundary: "The messaging service continues from its source of truth; data consumers expose stale age and recover from the retained log.",
  },
] as const;

const RETENTION_CLASSES = [
  { priority: "P0", name: "Message lifecycle", retention: "3–7 days", policy: "delete", why: "Enough hot replay for delivery metrics and incident recovery; Bronze holds longer history." },
  { priority: "P1", name: "Delivery failures", retention: "7–14 days", policy: "delete", why: "A longer diagnostic window for retry, expiry and regional failure analysis." },
  { priority: "BULK", name: "Call + client telemetry", retention: "6–48 hours", policy: "delete", why: "Extreme volume; land raw evidence quickly and keep Kafka focused on transit." },
  { priority: "STATE", name: "Device + group reference", retention: "Current + tombstones", policy: "compact,delete", why: "Distribute the latest keyed state while preserving controlled deletion history." },
  { priority: "DLQ", name: "Quarantined records", retention: "7–30 days", policy: "delete", why: "Keep failures long enough to correct and replay, with restricted access and reason codes." },
] as const;

function SelectableCard({
  active,
  onSelect,
  testId,
  children,
  className = "",
}: {
  active: boolean;
  onSelect: () => void;
  testId?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={active}
      onMouseEnter={onSelect}
      onFocus={onSelect}
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#111] ${active ? "border-[#111] bg-[#ededed] shadow-[0_8px_22px_rgba(0,0,0,.10)]" : "border-[#d8d8d8] bg-white hover:border-[#777]"} ${className}`}
    >
      {children}
    </button>
  );
}

export default function WhatsAppIngestionKafka() {
  const [handoffIndex, setHandoffIndex] = useState(0);
  const [topicIndex, setTopicIndex] = useState(0);
  const [controlIndex, setControlIndex] = useState(0);
  const handoff = HANDOFF_STAGES[handoffIndex];
  const topic = TOPICS[topicIndex];
  const control = RELIABILITY_CONTROLS[controlIndex];

  return (
    <div className="mt-5 space-y-5">
      <KafkaSection
        id="ingestion-handoff"
        eyebrow="01 · Event handoff"
        title="Commit the WhatsApp action before publishing its event"
        subtitle="The ingestion boundary converts committed operational changes into durable analytical events. Inspect each stage to see exactly what Kafka’s acknowledgement does—and does not—mean."
      >
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.85fr)]">
          <div className="grid gap-3 sm:grid-cols-2">
            {HANDOFF_STAGES.map((stage, index) => (
              <SelectableCard
                key={stage.code}
                testId={`whatsapp-handoff-${index}`}
                active={handoffIndex === index}
                onSelect={() => setHandoffIndex(index)}
                className="min-h-[142px]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-[10px] font-bold ${handoffIndex === index ? "bg-[#111] text-white" : "bg-[#ededed] text-[#333]"}`}>{stage.code}</span>
                  <span className="font-mono text-[9px] text-[#777]">{index < 3 ? "then →" : "durable"}</span>
                </div>
                <h3 className="mt-4 text-sm font-bold text-[#111]">{stage.name}</h3>
                <p className="mt-1.5 text-xs leading-5 text-[#5f5f5f]">{stage.summary}</p>
              </SelectableCard>
            ))}
          </div>

          <aside data-testid="whatsapp-handoff-explanation" className="overflow-hidden rounded-2xl border-2 border-[#111] bg-[#ededed] xl:sticky xl:top-[calc(var(--de-chapter-shell-offset)+20px)] xl:self-start" aria-live="polite">
            <div className="border-b border-[#c9c9c9] bg-white px-5 py-4">
              <p className="text-[9px] font-extrabold uppercase tracking-[.17em] text-[#5f5f5f]">Stage explanation</p>
              <h3 className="mt-1 text-lg font-bold tracking-[-.03em] text-[#111]">{handoff.name}</h3>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm leading-6 text-[#333]">{handoff.detail}</p>
              <div className="grid gap-2">
                {[['What comes in', handoff.input], ['What comes out', handoff.output], ['Design promise', handoff.promise]].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[#c9c9c9] bg-white px-3 py-3">
                    <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">{label}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#111]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-[#bdbdbd] bg-[#f7f7f7] p-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#111]">Continue the event-source contract</p>
            <p className="mt-1.5 text-xs leading-5 text-[#5f5f5f]">Ingestion preserves the stable <code className="font-bold text-[#111]">event_id</code>, source <code className="font-bold text-[#111]">event_time</code>, contract version, tokenized entity keys, producer and privacy class defined in Event Sources. It adds trustworthy ingestion time and Kafka coordinates.</p>
          </div>
          <Link href="/data-engineering/whatsapp/event-sources#source-event-contract" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#111] bg-white px-4 text-xs font-bold text-[#111] transition hover:bg-[#ededed]">Review shared contract →</Link>
        </div>
      </KafkaSection>

      <KafkaSection
        id="kafka-topics"
        eyebrow="02 · Topics + partition keys"
        title="Choose a key from the ordering each WhatsApp fact needs"
        subtitle="There is no universal partition key. Separate domains by criticality and volume, preserve only the order a consumer can defend, and make hot-group behavior explicit."
      >
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {TOPICS.map((item, index) => (
              <SelectableCard
                key={item.topic}
                testId={`whatsapp-topic-${index}`}
                active={topicIndex === index}
                onSelect={() => setTopicIndex(index)}
                className="min-h-[235px]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#111]">{item.title}</h3>
                    <code className="mt-1 block break-all text-[10px] font-bold text-[#444]">{item.topic}</code>
                  </div>
                  <MonoBadge dark={topicIndex === index}>{item.label}</MonoBadge>
                </div>
                <p className="mt-4 text-[9px] font-extrabold uppercase tracking-[.15em] text-[#777]">Partition key</p>
                <code className="mt-1.5 block min-h-10 break-words text-xs font-bold leading-5 text-[#111]">{item.key}</code>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.sequence.slice(0, 3).map((step, stepIndex) => <span key={`${step}-${stepIndex}`} className="rounded-lg border border-[#d8d8d8] bg-white px-2 py-1 text-[9px] font-semibold text-[#555]">{step}</span>)}
                </div>
                <p className="mt-3 text-[11px] leading-5 text-[#5f5f5f]">{item.summary}</p>
              </SelectableCard>
            ))}
          </div>

          <aside data-testid="whatsapp-topic-explanation" className="overflow-hidden rounded-2xl border-2 border-[#111] bg-[#ededed] xl:sticky xl:top-[calc(var(--de-chapter-shell-offset)+20px)] xl:self-start" aria-live="polite">
            <div className="border-b border-[#c9c9c9] bg-white p-5">
              <p className="text-[9px] font-extrabold uppercase tracking-[.17em] text-[#5f5f5f]">Partition decision explained</p>
              <h3 className="mt-1 text-lg font-bold tracking-[-.03em] text-[#111]">{topic.title}</h3>
              <code className="mt-1 block text-[10px] font-bold text-[#555]">key = {topic.key}</code>
            </div>
            <div className="space-y-4 p-5">
              <div><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">WhatsApp example</p><p className="mt-1.5 text-sm leading-6 text-[#333]">{topic.explanation}</p></div>
              <div className="rounded-xl border border-[#c9c9c9] bg-white p-3"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">Hot-key answer</p><p className="mt-1 text-xs leading-5 text-[#333]">{topic.hotspot}</p></div>
              <p className="border-t border-[#c9c9c9] pt-3 text-xs font-bold leading-5 text-[#111]">Kafka orders records inside one partition—not across all WhatsApp traffic.</p>
            </div>
          </aside>
        </div>

        <div className="mt-4 rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7] px-4 py-3 text-xs leading-5 text-[#555]"><strong className="text-[#111]">Avoid:</strong> one topic per user, one topic per group, or one topic per service instance. Use stable domain topics, controlled versions, quotas, and a documented key per event grain.</div>
      </KafkaSection>

      <KafkaSection
        id="kafka-capacity"
        eyebrow="03 · Capacity"
        title="Size partitions from bytes and consumer work"
        subtitle="Reuse the Requirements baseline, calculate two independent partition floors, then distribute the result across regional domain clusters instead of inventing one giant global Kafka cluster."
      >
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#bdbdbd] bg-white">
          <div className="border-b border-[#d8d8d8] bg-[#ededed] px-5 py-4">
            <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#111]">Fleet-wide peak planning envelope</p>
            <p className="mt-1 text-xs text-[#5f5f5f]">Decimal units · illustrative interview assumptions · validate with production-format benchmarks</p>
          </div>
          <div className="grid gap-px bg-[#d8d8d8] sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Average messages", value: "1.157M/s", formula: "100B messages/day ÷ 86,400 seconds/day" },
              { label: "Peak messages", value: "5.787M/s", formula: "1.157M messages/s × 5 peak-to-average ratio" },
              { label: "Peak analytical events", value: "21.412M/s", formula: "5.787M peak messages/s × 3.7 events/message" },
              { label: "Peak logical ingress", value: "13.918 GB/s", formula: "21.412M events/s × 650 bytes/event ÷ 10⁹" },
            ].map((item) => (
              <article key={item.label} className="bg-white p-4">
                <p className="text-[9px] font-extrabold uppercase tracking-[.13em] text-[#777]">{item.label}</p>
                <strong className="mt-2 block text-xl tracking-[-.04em] text-[#111]">{item.value}</strong>
                <code className="mt-2 block text-[10px] leading-5 text-[#555]">{item.formula}</code>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7] p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-[#777]">Floor A · byte throughput</p><h3 className="mt-1 text-base font-bold text-[#111]">Can partitions absorb the bytes?</h3></div><MonoBadge dark>1,810</MonoBadge></div>
            <div className="mt-4 rounded-xl border border-[#d8d8d8] bg-white p-3 font-mono text-[11px] font-bold leading-5 text-[#222]">13,918 MB/s × 1.30 headroom<br/>÷ 10 MB/s tested per partition<br/>= 1,809.3 → 1,810 partitions</div>
            <p className="mt-3 text-xs leading-5 text-[#5f5f5f]">The 10 MB/s allowance is a conservative benchmark input for the chosen record size, compression, acknowledgement and replication settings—not a Kafka constant.</p>
          </article>
          <article className="rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7] p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-[#777]">Floor B · event processing</p><h3 className="mt-1 text-base font-bold text-[#111]">Can consumers process the records?</h3></div><MonoBadge>557</MonoBadge></div>
            <div className="mt-4 rounded-xl border border-[#d8d8d8] bg-white p-3 font-mono text-[11px] font-bold leading-5 text-[#222]">21.412M events/s × 1.30 headroom<br/>÷ 50K tested events/s per partition<br/>= 556.7 → 557 partitions</div>
            <p className="mt-3 text-xs leading-5 text-[#5f5f5f]">Benchmark the slowest important consumer with real dedupe state, schema decoding, checkpointing and sink latency.</p>
          </article>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-2xl border-2 border-[#111] bg-white p-5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#777]">Defendable partition answer</p>
            <p className="mt-2 text-lg font-bold tracking-[-.03em] text-[#111]">max(1,810 byte lanes, 557 processing lanes) = 1,810 minimum fleet-wide lanes</p>
            <p className="mt-2 text-xs leading-5 text-[#5f5f5f]">This is a throughput floor, not one topic’s partition count. Allocate regional peak shares, then size each message, delivery, call and telemetry topic independently. Add enough partitions for broker/AZ loss, hot keys, consumer parallelism and forecast growth.</p>
          </div>
          <div className="rounded-2xl border border-[#d8d8d8] bg-[#ededed] p-5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#777]">Broker write check</p>
            <strong className="mt-2 block text-2xl tracking-[-.04em] text-[#111]">54.28 GB/s</strong>
            <code className="mt-2 block text-[10px] leading-5 text-[#333]">13.918 GB/s logical × RF3 × 1.30 headroom</code>
            <p className="mt-2 text-xs leading-5 text-[#5f5f5f]">Also model consumer egress, replica catch-up, disk, leader imbalance and rebalance traffic before choosing broker counts.</p>
          </div>
        </div>
      </KafkaSection>

      <KafkaSection
        id="kafka-reliability"
        eyebrow="04 · Reliability"
        title="Make retries safe and keep analytics off the message path"
        subtitle="Kafka provides durable at-least-once transport. End-to-end correctness comes from the source commit, stable identities, checkpointed consumers, idempotent effects, reconciliation, and explicit workload isolation."
      >
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,.85fr)]">
          <div className="grid gap-3 sm:grid-cols-2">
            {RELIABILITY_CONTROLS.map((item, index) => (
              <SelectableCard key={item.title} testId={`whatsapp-control-${index}`} active={controlIndex === index} onSelect={() => setControlIndex(index)} className="min-h-[170px]">
                <div className="flex items-start justify-between gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-[10px] font-bold ${controlIndex === index ? "bg-[#111] text-white" : "bg-[#ededed] text-[#333]"}`}>0{index + 1}</span><MonoBadge>{item.label}</MonoBadge></div>
                <h3 className="mt-4 text-sm font-bold text-[#111]">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-[#5f5f5f]">{item.detail}</p>
              </SelectableCard>
            ))}
          </div>
          <aside data-testid="whatsapp-control-explanation" className="overflow-hidden rounded-2xl border-2 border-[#111] bg-[#ededed] xl:sticky xl:top-[calc(var(--de-chapter-shell-offset)+20px)] xl:self-start" aria-live="polite">
            <div className="border-b border-[#c9c9c9] bg-white p-5"><p className="text-[9px] font-extrabold uppercase tracking-[.17em] text-[#5f5f5f]">Reliability control explained</p><h3 className="mt-1 text-lg font-bold tracking-[-.03em] text-[#111]">{control.title}</h3></div>
            <div className="space-y-4 p-5">
              <p className="text-sm leading-6 text-[#333]">{control.detail}</p>
              <div className="rounded-xl border border-[#c9c9c9] bg-white p-3"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">Evidence retained</p><code className="mt-1 block text-[10px] font-bold leading-5 text-[#222]">{control.evidence}</code></div>
              <div><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">Important boundary</p><p className="mt-1 text-xs font-semibold leading-5 text-[#111]">{control.boundary}</p></div>
            </div>
          </aside>
        </div>

        <div className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-[#bdbdbd] bg-[#d8d8d8] sm:grid-cols-3">
          {[
            ["Producer", "acks=all · idempotence · compression · bounded retry"],
            ["Broker", "RF3 · min ISR · quotas · rack/AZ awareness"],
            ["Consumer", "checkpoint · dedupe · idempotent sink · lag SLO"],
          ].map(([label, text]) => <div key={label} className="bg-white p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">{label}</p><p className="mt-1.5 text-xs font-bold leading-5 text-[#111]">{text}</p></div>)}
        </div>
      </KafkaSection>

      <KafkaSection
        id="kafka-retention"
        eyebrow="05 · Retention + replay"
        title="Keep Kafka long enough to recover—not forever"
        subtitle="Retention follows event criticality, volume and recovery time. Kafka handles bounded hot replay; immutable Bronze storage supports economical history and backfills after the log window closes."
      >
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#bdbdbd]">
          <div className="hidden grid-cols-[78px_1.1fr_120px_130px_1.6fr] gap-3 border-b border-[#d8d8d8] bg-[#ededed] px-4 py-3 text-[9px] font-extrabold uppercase tracking-[.14em] text-[#555] md:grid"><span>Class</span><span>Topic family</span><span>Retention</span><span>Policy</span><span>WhatsApp reason</span></div>
          {RETENTION_CLASSES.map((item) => (
            <article key={item.name} className="grid gap-3 border-b border-[#d8d8d8] bg-white p-4 last:border-b-0 md:grid-cols-[78px_1.1fr_120px_130px_1.6fr] md:items-center">
              <MonoBadge>{item.priority}</MonoBadge>
              <div><p className="text-[9px] font-extrabold uppercase tracking-[.13em] text-[#777] md:hidden">Topic family</p><h3 className="mt-1 text-xs font-bold text-[#111] md:mt-0">{item.name}</h3></div>
              <div><p className="text-[9px] font-extrabold uppercase tracking-[.13em] text-[#777] md:hidden">Retention</p><p className="mt-1 text-xs font-bold text-[#111] md:mt-0">{item.retention}</p></div>
              <div><p className="text-[9px] font-extrabold uppercase tracking-[.13em] text-[#777] md:hidden">Policy</p><code className="mt-1 block text-[10px] font-bold text-[#333] md:mt-0">{item.policy}</code></div>
              <p className="text-xs leading-5 text-[#5f5f5f]">{item.why}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-[#d8d8d8] bg-[#f7f7f7] p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#777]">Controlled replay</p><h3 className="mt-1 text-base font-bold text-[#111]">Correct a broken delivery transformation without hurting live traffic</h3></div><MonoBadge>Kafka window → Bronze history</MonoBadge></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            {[
              ["01", "Bound the incident", "Identify the topic, partitions, offsets, event versions, regions and time range affected."],
              ["02", "Use an isolated lane", "Replay with a separately throttled consumer group so recovery cannot starve live delivery metrics."],
              ["03", "Write to staging", "Run corrected code into a new table or serving version; never overwrite the current product in place."],
              ["04", "Reconcile + publish", "Compare source, Kafka, Bronze and output counts, then atomically promote or roll back the new version."],
            ].map(([step, title, detail]) => <article key={step} className="rounded-xl border border-[#d8d8d8] bg-white p-4"><span className="font-mono text-[10px] font-bold text-[#777]">{step}</span><h4 className="mt-2 text-xs font-bold text-[#111]">{title}</h4><p className="mt-1.5 text-[11px] leading-5 text-[#5f5f5f]">{detail}</p></article>)}
          </div>
          <p className="mt-4 border-t border-[#d8d8d8] pt-4 text-xs font-semibold leading-5 text-[#111]">If the required offsets have expired, read the immutable Bronze records with their original topic, partition, offset and schema ID. Kafka is the hot transport log; Bronze is the long-lived replay evidence.</p>
        </div>
      </KafkaSection>
    </div>
  );
}
