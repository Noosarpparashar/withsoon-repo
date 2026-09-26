"use client";

import { KAFKA_SECTIONS } from "./data";
import { HoverCard, Section, Tooltip, YouTubeFrame } from "./shared";

const route = [
  { title: "Client SDK", icon: "01", tone: "#1d4ed8", detail: "The player creates a stable event_id, batches and compresses events, retries with jitter, and keeps a bounded offline queue. Example: a mobile player sends heartbeat e-17 for playback attempt p-42; if the network drops, its retry keeps event_id e-17 so downstream deduplication can recognize it." },
  { title: "Edge Collector", icon: "02", tone: "#0b6f87", detail: "A nearby HTTP/gRPC collector absorbs millions of concurrent players without running business aggregations. Example: a viewer in Mumbai sends a heartbeat to the closest healthy collector, which applies account and device quotas before accepting it." },
  { title: "Consent Gate", icon: "03", tone: "#6d28d9", detail: "The collector evaluates privacy tags before routing or enriching the event. Example: an anonymous child-profile playback can retain coarse operational telemetry while disallowing user-level personalization fields and precise geography." },
  { title: "Validate", icon: "04", tone: "#8a4b00", detail: "Schema checks verify required fields and types; semantic checks verify that values make sense. Example: playback_position_ms cannot be negative, event_type must be registered, and schema_version must be supported. Invalid events receive a reason code and are quarantined when investigation is useful." },
  { title: "Enrich", icon: "05", tone: "#0f766e", detail: "Only trusted server-side context is added: ingest_timestamp, collector region, coarse policy-approved geography, and sampling decision. Example: client_event_time is preserved for playback order while ingest_timestamp lets operators measure mobile-network delay and clock skew." },
  { title: "Publish", icon: "06", tone: "#077149", detail: "The collector uses Kafka acknowledgements, idempotence, bounded retries, and delivery timeouts. Example: a broker response is lost after accepting e-17; the producer retries the same sequence and Kafka avoids creating another log record." },
  { title: "Kafka", icon: "K", tone: "#b00020", detail: "Kafka is the durable replay buffer, not the final source of truth. The same accepted heartbeat can be consumed independently by the Bronze sink, Flink sessionization, fraud detection, QoE monitoring, and recommendation feature pipelines." },
] as const;

const sdkProtections = ["Stable event ID", "Batch + compress", "Jittered retry", "Offline queue", "Payload limit", "Clock-skew metadata", "Privacy tags", "Client version"] as const;
const collectorProtections = ["Authentication", "Tenant quota", "Rate limit", "Maximum payload", "Decompression guard", "Circuit breaker", "Reason codes"] as const;

const topics = [
  { topic: "playback.heartbeat", keyName: "viewer + attempt", reason: "Session order", tone: "#b00020", detail: "Sessionization key: hash(privacy-scoped user_or_anon_id, playback_attempt_id). Example: play, heartbeat, seek, pause, and end for attempt p-42 stay together even when the viewer watches several videos. Live video counters use a separate sharded-video lane." },
  { topic: "engagement", keyName: "video + shard", reason: "Video actions", tone: "#8a4b00", detail: "Likes, comments, shares, and saves feed per-video aggregates. Example: ordinary videos can key by video_id; a viral upload uses video_id + shard_id so one partition does not receive every action, then a second stage merges the shards." },
  { topic: "impression", keyName: "scoped user", reason: "Recommendation sequence", tone: "#6d28d9", detail: "A privacy-scoped user key keeps the order of home-feed impressions and subsequent clicks. Example: impression i-8 followed by click c-9 and playback p-10 can become a training sequence without exposing a raw account identifier." },
  { topic: "ads.events", keyName: "ad request", reason: "Revenue attribution", tone: "#077149", detail: "Key the financial lifecycle by ad_request_id or impression_id. Example: request, impression, quartile, click, and billable outcome for ad request ar-51 remain ordered and auditable; video_id alone would hotspot popular videos and mix unrelated ads." },
  { topic: "search", keyName: "scoped user", reason: "Search funnel", tone: "#1d4ed8", detail: "Keep a viewer's query, result impressions, clicks, and resulting playback in order. Example: query q-4 -> result impression r-7 -> click c-8 can be joined into search-ranking feedback within the permitted identity scope." },
] as const;

const lanes = [
  { icon: "S", title: "Sessionization", sub: "viewer + playback attempt", tone: "#1d4ed8", detail: "Need: ordered state for one viewing attempt. Example key: hash(anon-91, p-42). Every heartbeat, seek, pause, and end for p-42 reaches one Flink keyed state, where timers can close the session correctly." },
  { icon: "V", title: "Video Counters", sub: "video + controlled shard", tone: "#b00020", detail: "Need: distribute a viral video's write load. Example keys v-7#00 through v-7#63 create 64 partial counters. A second stage sums those small partial updates back into the live counter for v-7." },
  { icon: "U", title: "User Sequences", sub: "privacy-scoped viewer", tone: "#6d28d9", detail: "Need: preserve the order of impressions, clicks, searches, and watches for recommendation features. Use a rotating, policy-scoped user key rather than putting a raw account ID into every Kafka record." },
  { icon: "$", title: "Ad Attribution", sub: "request or impression", tone: "#077149", detail: "Need: one auditable financial lifecycle. Key request, impression, viewability, click, and conversion by ad_request_id; use idempotent writes and transactions where partial financial output is unacceptable." },
] as const;

const capacityInputs = [
  { name: "Event Rate", formula: "peak events/s / safe events/partition", tone: "#1d4ed8", detail: "For playback heartbeats, the Requirements baseline peaks at 6.94M events/s. If a load test proves 50K events/s safe per partition, event rate requires ceil(6.94M / 50K) = 139 base partitions." },
  { name: "Byte Rate", formula: "peak bytes/s / safe bytes/partition", tone: "#0b6f87", detail: "The same 6.94M heartbeats/s at 700 bytes each is about 4.86 GB/s logical ingress. At a tested 50 MB/s per partition, bytes require ceil(4.86 GB/s / 50 MB/s) = 98 base partitions. Broker replication is provisioned separately." },
  { name: "Parallelism", formula: "required consumer tasks", tone: "#6d28d9", detail: "A consumer group can run at most one active consumer per partition. At 6.94M heartbeats/s and a tested 35K/s per stateful Flink task, processing needs 199 active tasks before reserve. With 40% headroom, this becomes 279 and sets the partition count." },
  { name: "Failure Spread", formula: "minimum rack / zone spread", tone: "#8a4b00", detail: "Partition replicas must span the failure domains promised by the ingestion SLO. Example: RF=3 with rack awareness places the leader and two replicas in separate zones; min.insync.replicas=2 can reject unsafe writes when too few replicas remain." },
] as const;

const failure = [
  { icon: "01", title: "Viral Spike", sub: "Video v-7 surges", tone: "#b00020", detail: "A live event sends millions of playback and engagement records for video v-7. Cluster-wide traffic may look healthy, yet the v-7 key can be many times hotter than a normal video." },
  { icon: "02", title: "Hot Partition", sub: "One task saturates", tone: "#b91c1c", detail: "If every v-7 record is keyed only by video_id, one Kafka partition, broker leader, and consumer task receive all of it. Adding consumers does not help because a partition has only one active consumer in the group." },
  { icon: "03", title: "Detect Skew", sub: "Compare partitions", tone: "#8a4b00", detail: "Alert on the maximum partition lag and input rate, not only the group average. A growing max/median lag ratio, longer processing time, and slower checkpoints reveal v-7 while the rest of the topic remains current." },
  { icon: "04", title: "Shard Key", sub: "v-7 + shard 00..63", tone: "#6d28d9", detail: "Route v-7 to a controlled set of shards using a stable event attribute or event_id hash. This spreads load without duplicating records. Keep the original video_id in the payload for the merge stage." },
  { icon: "05", title: "Merge", sub: "64 partials -> v-7", tone: "#077149", detail: "Each shard emits a small partial count or delta; the second stage groups only those partials by video_id. The final v-7 total remains correct while raw traffic no longer serializes through one partition." },
] as const;

const controls = [
  { title: "At-least-once", sub: "Retry instead of losing events", meaning: "Kafka may receive the same event more than once because a producer retries whenever it cannot confirm delivery.", action: "Keep the event_id unchanged on every retry so later processing can identify the copies.", example: "Heartbeat e-17 is accepted, but the acknowledgement is lost. The collector sends e-17 again. Kafka may contain two copies, while no playback evidence is lost." },
  { title: "Event Dedup", sub: "Count one logical event once", meaning: "Deduplication removes repeated deliveries before they change a metric.", action: "Flink remembers recently processed event_id values. Batch certification checks the complete Bronze history again.", example: "Both copies of heartbeat e-17 arrive. The first adds its valid watch-time delta; the second matches an already-seen event_id and is ignored." },
  { title: "Revenue Safety", sub: "Prevent duplicate ad billing", meaning: "An ad outcome and the Kafka position that produced it must be saved together.", action: "Commit the attributed result and consumed offset atomically with Kafka transactions or an equivalent idempotent sink.", example: "A worker records billable impression ad-51 and then crashes. On restart, the atomic commit proves it was already handled, so the advertiser is not charged twice." },
  { title: "Hot Retention", sub: "Keep seven days for replay", meaning: "Kafka holds recent events temporarily so a broken or delayed consumer can catch up.", action: "Retain about seven days on brokers and continuously copy accepted events into immutable Bronze storage for long-term history.", example: "A faulty Flink release publishes incorrect counters for six hours. Roll it back and replay those six hours from Kafka; use Bronze for an older rebuild." },
  { title: "Lag + Rebalance", sub: "Find consumers falling behind", meaning: "Lag is the number or age of Kafka records waiting for a consumer. A rebalance pauses work while partitions move between consumers.", action: "Monitor the worst partition, oldest waiting event, and rebalance duration instead of relying on a topic-wide average.", example: "One viral-video partition is 12 minutes behind while the other partitions are current. The maximum-partition alert reveals the problem that average lag hides." },
  { title: "Poison Isolation", sub: "Skip permanently bad records safely", meaning: "A poison event always fails processing and can prevent every later record in that ordered partition from moving forward.", action: "Retry temporary failures a small number of times, then place the bad event in quarantine with its payload, schema version, producer, and failure reason.", example: "An old TV app sends an unsupported heartbeat shape. After bounded retries, that record goes to the DLQ and the following valid heartbeats continue processing." },
  { title: "Quota Isolation", sub: "Protect critical YouTube traffic", meaning: "One producer or replay job must not consume all Kafka capacity and delay playback or advertising events.", action: "Give producers and consumer groups explicit limits; reserve capacity or separate broker pools for critical workloads when required.", example: "A recommendation backfill reads at full speed. Its quota throttles the replay before it can increase latency for live playback counters or ad attribution." },
  { title: "Recovery Test", sub: "Prove failures are recoverable", meaning: "Recovery plans are trusted only after the team has exercised them under realistic failures.", action: "Simulate broker and zone loss, restore Flink from a checkpoint, reset offsets, replay events, and verify duplicate suppression and freshness.", example: "During a game day, one zone disappears. Replicas keep accepting events, Flink restores its state, and processing catches up within the ingestion SLO." },
] as const;

function RouteStrip() {
  return (
    <div className="mt-5 grid gap-2 md:grid-cols-4 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-center">
      {route.map((step, index) => (
        <div className="contents" key={step.title}>
          <button
            type="button"
            className="group relative min-h-[92px] rounded-xl border bg-[var(--bg-muted)] p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b00020]"
            style={{ borderColor: `${step.tone}44` }}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold" style={{ color: step.tone, background: `color-mix(in srgb, ${step.tone} 12%, var(--bg-card))` }}>{step.icon}</span>
              <span className="text-[10px]" style={{ color: step.tone }} aria-hidden>i</span>
            </span>
            <strong className="mt-3 block text-sm">{step.title}</strong>
            <Tooltip side="bottom" align={index === 0 ? "start" : index === route.length - 1 ? "end" : "center"}>
              {step.detail}
            </Tooltip>
          </button>
          {index < route.length - 1 ? <span className="hidden text-center text-[#b00020] xl:block">-&gt;</span> : null}
        </div>
      ))}
    </div>
  );
}

function ProtectionCard({ title, owner, items, detail, tone, align }: { title: string; owner: string; items: readonly string[]; detail: string; tone: string; align: "start" | "end" }) {
  return (
    <button type="button" className="group relative rounded-xl border bg-[var(--bg-muted)] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: `${tone}44` }}>
      <span className="flex items-center justify-between gap-3">
        <span><strong className="block text-sm">{title}</strong><small className="text-[11px] text-[var(--text-faint)]">Owned by {owner}</small></span>
        <span className="text-xs" style={{ color: tone }} aria-hidden>i</span>
      </span>
      <span className="mt-3 flex flex-wrap gap-1.5">
        {items.map((item) => <span key={item} className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 text-[10px] font-medium text-[var(--text-muted)]">{item}</span>)}
      </span>
      <Tooltip align={align}>{detail}</Tooltip>
    </button>
  );
}

function IngestionOutcomes() {
  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.4fr]">
      <div className="rounded-xl border border-rose-500/25 bg-rose-500/[.035] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#b91c1c]">Rejected before Kafka</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold"><span className="rounded-md bg-[var(--bg-card)] px-2.5 py-2">Invalid / unauthorized</span><span className="text-[#b91c1c]">-&gt;</span><span className="rounded-md bg-[var(--bg-card)] px-2.5 py-2">Reason code</span><span className="text-[#b91c1c]">-&gt;</span><span className="rounded-md bg-[var(--bg-card)] px-2.5 py-2">Metric or quarantine</span></div>
        <p className="mt-2 text-[11px] leading-5 text-[var(--text-faint)]">Auth and quota failures return explicit responses; investigable schema failures enter a bounded DLQ.</p>
      </div>
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[.035] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#077149]">Accepted once, consumed independently</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold"><span className="rounded-md bg-[var(--bg-card)] px-2.5 py-2 text-[#b00020]">Kafka</span><span className="text-[#077149]">-&gt;</span>{["Bronze sink", "Flink sessions", "Fraud", "QoE", "Rec features"].map((item) => <span key={item} className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-2">{item}</span>)}</div>
        <p className="mt-2 text-[11px] leading-5 text-[var(--text-faint)]">A slow recommendation consumer does not block the raw lake sink or live playback metrics.</p>
      </div>
    </div>
  );
}

function TopicTable() {
  return (
    <div className="mt-5 overflow-visible rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3">
      <div className="hidden grid-cols-[1.2fr_1fr_1fr_30px] gap-3 px-3 pb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[var(--text-faint)] md:grid"><span>Topic</span><span>Key</span><span>State it protects</span><span /></div>
      <div className="grid gap-2">{topics.map((topic) => <button type="button" key={topic.topic} className="group relative grid min-h-[60px] gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-left transition hover:border-[#b00020] md:grid-cols-[1.2fr_1fr_1fr_30px] md:items-center md:gap-3"><code className="text-xs font-bold text-[var(--text)]">{topic.topic}</code><code className="text-xs">{topic.keyName}</code><span className="text-xs text-[var(--text-muted)]">{topic.reason}</span><span className="text-[var(--text-muted)]" aria-hidden>i</span><Tooltip align="center" side="top" wide>{topic.detail}</Tooltip></button>)}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/[.04] px-3 py-2"><strong className="text-xs text-[#8a4b00]">Kafka hot buffer: 7 days</strong><p className="mt-1 text-[11px] leading-5 text-[var(--text-faint)]">Enough for consumer recovery, offset reset, and short operational replay.</p></div>
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[.04] px-3 py-2"><strong className="text-xs text-[#077149]">Bronze: long-term event truth</strong><p className="mt-1 text-[11px] leading-5 text-[var(--text-faint)]">Immutable accepted events support historical replay, audit, and corrected recomputation.</p></div>
      </div>
    </div>
  );
}

function CapacityModel() {
  return (
    <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{capacityInputs.map((input, index) => <button type="button" key={input.name} className="group relative rounded-xl border bg-[var(--bg-card)] p-3 text-left" style={{ borderColor: `${input.tone}44` }}><span className="text-xs font-semibold">{input.name}</span><code className="mt-2 block text-[10px] leading-4" style={{ color: input.tone }}>{input.formula}</code><Tooltip align={index === 0 ? "start" : index === capacityInputs.length - 1 ? "end" : "center"}>{input.detail}</Tooltip></button>)}</div>
      <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/[.04] p-3">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#b00020]">Playback heartbeat example</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold"><code className="rounded-md bg-[var(--bg-card)] px-2.5 py-2">6.94M peak HB/s</code><span className="text-[#b00020]">/</span><code className="rounded-md bg-[var(--bg-card)] px-2.5 py-2">35K safe HB/s/Flink task</code><span className="text-[#b00020]">= 199</span><span className="text-[#b00020]">x 1.4 headroom = 279</span><strong className="rounded-md bg-[#b00020] px-2.5 py-2 text-white">provision about 280</strong></div>
        <p className="mt-2 text-[11px] leading-5 text-[var(--text-faint)]">The event-rate constraint needs 195 partitions and the byte-rate constraint needs 138; consumer parallelism is larger at 279, so it wins. Every safe-throughput number must come from a representative load test.</p>
      </div>
    </div>
  );
}

function OperationCard({
  item,
}: {
  item: (typeof controls)[number];
}) {
  return (
    <button
      type="button"
      className="group relative min-h-[96px] rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-muted)]"
    >
      <span className="flex items-start justify-between gap-3">
        <strong className="text-sm">{item.title}</strong>
        <span className="text-[10px] text-[var(--text-faint)]" aria-hidden>i</span>
      </span>
      <span className="mt-2 block text-xs leading-5 text-[var(--text-faint)]">{item.sub}</span>
      <Tooltip align="center" side="top">
        <div data-testid="explainer-copy" className="max-w-[65ch] space-y-2">
          <p>{item.meaning} {item.action}</p>
          <p><strong className="text-[var(--text)]">YouTube example: </strong>{item.example}</p>
        </div>
      </Tooltip>
    </button>
  );
}

export default function IngestionKafkaTab() {
  return (
    <YouTubeFrame activeTab="ingestion-kafka" sections={KAFKA_SECTIONS} previous={{ id: "architecture", label: "Architecture" }} next={{ id: "real-time-streaming", label: "Real-Time Streaming" }}>
      <Section id="ingestion-route" number="01" title="Ingestion Route"><RouteStrip /><IngestionOutcomes /><div className="mt-3 grid gap-3 md:grid-cols-2"><ProtectionCard title="Producer Safety" owner="player and producer SDK" items={sdkProtections} tone="#1d4ed8" align="start" detail="Example: the Android player buffers a small batch during a tunnel, preserves each stable event_id and original client time, applies the payload limit, then retries with jitter after connectivity returns. Client-version telemetry identifies a faulty release without changing the event contract." /><ProtectionCard title="Collector Protection" owner="edge ingestion service" items={collectorProtections} tone="#0b6f87" align="end" detail="Example: an outdated TV client sends an oversized compressed batch. The collector checks auth before decompression, enforces compressed and expanded size limits, rejects it with a machine-readable code, increments collector_reject_total by client version, and never lets it consume Kafka capacity." /></div></Section>
      <Section id="topic-design" number="02" title="Topic Design"><TopicTable /></Section>
      <Section id="partition-strategy" number="03" title="Partitioning"><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{lanes.map((item, index) => <HoverCard key={item.title} {...item} align={index === 0 ? "start" : index === lanes.length - 1 ? "end" : "center"} className="min-h-[112px]" />)}</div><p className="mt-3 text-xs font-medium text-[var(--text-muted)]">Start from the state that must stay ordered; choose a different key for each computation.</p></Section>
      <Section id="capacity-model" number="04" title="Capacity"><CapacityModel /></Section>
      <Section id="failure-drill" number="05" title="Failure Drill"><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{failure.map((item, index) => <HoverCard key={item.title} {...item} align={index === 0 ? "start" : index === failure.length - 1 ? "end" : "center"} className="min-h-[112px]" />)}</div><div className="mt-3 border-l-4 border-[#b00020] bg-red-500/[.04] px-4 py-3 text-sm font-medium leading-6">Detect the hot video from per-partition skew, spread it across controlled shards, aggregate each shard, then merge the small partials by video.</div></Section>
      <Section id="reliability-controls" number="06" title="Delivery + Operations"><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{controls.map((item) => <OperationCard key={item.title} item={item} />)}</div></Section>
    </YouTubeFrame>
  );
}
