"use client";

import { useState, type ReactNode } from "react";

function SourceSection({
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
    <section id={id} className="rounded-[26px] border border-[#d8d8d8] bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,.055)] sm:p-7">
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

function CodeBadge({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 font-mono text-[9px] font-bold ${dark ? "border-white/20 bg-white/10 text-white" : "border-[#c9c9c9] bg-[#ededed] text-[#333]"}`}>{children}</span>;
}

const SOURCES = [
  {
    code: "MSG",
    name: "Message + delivery services",
    volume: "Very high",
    priority: "Critical",
    events: "message_accepted · routed · delivery_attempted · delivered · read · failed · expired",
    role: "Authoritative lifecycle producer for server acceptance and per-device delivery outcomes. It reports committed messaging state; clients cannot declare a message delivered.",
    example: "A message is durably accepted in ap-south, routed to two registered devices, delivered to the phone in 132 ms, and remains pending on desktop.",
    grain: "One lifecycle transition for one message and one recipient device. User-level delivery is derived later from device-level facts.",
    behavior: "Publish only after the owned state transition commits. Retries reuse the logical event ID; delivery acknowledgements may arrive late or out of order.",
    contract: "Key by message or conversation where ordering matters; carry stable event_id, canonical message_id, event_time, device-grain outcome, retry count, region, and trace ID.",
    consumers: "Delivery SLOs, retry analysis, queue health, multi-device metrics, support diagnostics, and certified delivery facts.",
    privacy: "Payload remains ciphertext. Tokenize conversation and user identifiers; omit phone numbers, message text, and raw contact data.",
  },
  {
    code: "EDGE",
    name: "Clients + edge gateways",
    volume: "Extreme",
    priority: "High",
    events: "session_connected · disconnected · request_received · client_error · app_exposure",
    role: "Describes connectivity and request behavior before business services act. Mobile clocks, offline buffering, retries, and app-version skew make this source noisy.",
    example: "Connection setup rises only for Android v17 on one carrier. Edge events connect app version, coarse network class, gateway region, and request latency.",
    grain: "One connection transition, client request, or sampled client error for one tokenized device session.",
    behavior: "Client events can be delayed by offline buffering and incorrect device clocks. Gateways provide the more reliable ingestion timestamp and request trace.",
    contract: "Attach both event_time and ingestion_time, validate client versions, use device-generated event IDs, and declare sampling for high-volume telemetry.",
    consumers: "Connection health, release regressions, experiment guardrails, regional routing, and client reliability dashboards.",
    privacy: "Treat IP and device details as sensitive; coarse-grain or truncate them and retain only what the operational use requires.",
  },
  {
    code: "GROUP",
    name: "Group service",
    volume: "High + bursty",
    priority: "Critical",
    events: "group_created · member_added · member_removed · group_message · recipient_delivery",
    role: "Publishes membership versions and group delivery facts. One sender action can amplify into hundreds or thousands of recipient/device outcomes.",
    example: "A 1,000-member group produces one group_message_event and up to 999 recipient deliveries before multi-device amplification.",
    grain: "Keep two facts: one group-message action and one delivery outcome per eligible recipient device. Never mix these grains in one count.",
    behavior: "Capture the membership version at send time. Fan-out workers may retry or finish at different times, and hot groups require bucketed keys to avoid skew.",
    contract: "Separate group-message grain from recipient-delivery grain; preserve membership version and use adaptive buckets for exceptionally hot groups.",
    consumers: "Fan-out health, group delivery SLOs, hot-key detection, capacity planning, and membership-aware reconciliation.",
    privacy: "Broad analytics should not expose raw membership graphs. Use rotating tokens, restricted datasets, and aggregate group-size bands.",
  },
  {
    code: "DEVICE",
    name: "Auth + device registry",
    volume: "Medium",
    priority: "Critical",
    events: "device_registered · device_removed · key_changed · session_authenticated",
    role: "Defines which devices may receive a user’s encrypted messages and supplies the device history required to interpret delivery outcomes.",
    example: "A new desktop device registers after the phone. Later delivery analysis must know which devices were eligible at that event time.",
    grain: "One versioned device-state transition for a tokenized user and device, with effective-from and effective-to timestamps.",
    behavior: "Changes are low volume but correctness-critical. Consumers use point-in-time joins so a device added after send is not incorrectly counted as eligible.",
    contract: "Use versioned device state or CDC with effective timestamps so streaming and batch jobs can perform point-in-time enrichment.",
    consumers: "Multi-device delivery semantics, authentication health, security audit, and device adoption analysis.",
    privacy: "Device identity is sensitive. Tokenize it, tightly scope translation access, and never treat an analytics dimension as an authorization source.",
  },
  {
    code: "MEDIA",
    name: "Media services + object store",
    volume: "Medium events / huge bytes",
    priority: "High",
    events: "media_upload_started · completed · download_completed · transfer_failed",
    role: "Emits metadata about encrypted media movement. Large blobs use signed uploads and object storage; they never travel inside Kafka events.",
    example: "An encrypted 10–25 MB video completes after one retry. The event carries its size band, duration, network class, and outcome—not video bytes.",
    grain: "One upload or download attempt for an encrypted media object; a retry is a new attempt linked to the same media transfer.",
    behavior: "Services emit small metadata events at start, completion, or failure. Object storage holds encrypted bytes, while events carry only references and outcomes.",
    contract: "Reference media_object_id, coarse size band, content class, duration, retry count, storage region, and outcome while keeping blob lifecycle separate.",
    consumers: "Transfer reliability, CDN and storage planning, client/network regressions, and media cost allocation.",
    privacy: "Exclude media contents, encryption material, and private URLs. Apply short retention to detailed operational identifiers.",
  },
  {
    code: "CALL",
    name: "Call signaling + quality",
    volume: "Extreme samples",
    priority: "High",
    events: "call_started · connected · quality_sample · ended",
    role: "Combines sparse call lifecycle facts with high-frequency quality samples such as RTT, jitter, packet loss, bitrate, and frame drops.",
    example: "A call connects in 840 ms, then packet loss exceeds 5% for five minutes in one region and triggers a baseline-aware alert.",
    grain: "One call lifecycle transition or one bounded quality-sampling window for a tokenized call and participant device.",
    behavior: "Lifecycle events are retained completely; healthy quality samples can be locally aggregated while failure tails keep richer diagnostics.",
    contract: "Sample or locally aggregate healthy calls, retain tail diagnostics for failures, and sessionize with tokenized call_id plus event time.",
    consumers: "Real-time quality alerts, codec experiments, carrier analysis, client regressions, and relay capacity planning.",
    privacy: "Never collect audio or video content. Restrict fine-grained network, device, and location attributes through purpose-bound access.",
  },
  {
    code: "PUSH",
    name: "Presence + notifications",
    volume: "Extreme + ephemeral",
    priority: "High",
    events: "presence_summary · notification_requested · provider_accepted · failed · client_reconnected",
    role: "Presence decides whether live delivery is possible; push services provide an offline wake-up path. Raw heartbeats should not flood the warehouse.",
    example: "No active connection causes a push request; the provider accepts it, the client reconnects, and the message is then delivered.",
    grain: "One summarized presence window or one notification attempt and provider outcome for a tokenized device.",
    behavior: "Presence changes rapidly and expires, so current state belongs in TTL storage. Durable events record only summaries and discrete push lifecycle outcomes.",
    contract: "Keep device presence in a TTL store; emit sampled region/minute connection summaries and discrete notification outcomes with provider IDs deduplicated.",
    consumers: "Push effectiveness, reconnect rate, concurrent connections, session-duration histograms, and provider reliability.",
    privacy: "Presence and last-seen data are sensitive. Prefer aggregates, short retention, access logging, and explicit product-policy alignment.",
  },
  {
    code: "TRUST",
    name: "Trust + platform controls",
    volume: "Low to medium",
    priority: "Restricted",
    events: "abuse_signal · rate_limit_hit · service_error · schema_rejected · deletion_applied",
    role: "Produces restricted behavioral signals plus operational control evidence for schemas, quality, access, deletion, and replay.",
    example: "A sending-velocity feature triggers a reviewed risk action while a schema violation is quarantined and routed to the owning team.",
    grain: "One reviewed trust decision, rate-limit action, schema rejection, deletion result, or governed platform-control transition.",
    behavior: "These events use isolated restricted topics and explicit retention. Every rule version, decision, correction, replay, and access must remain auditable.",
    contract: "Version rule and model IDs, keep decision reason codes, separate control-plane topics, and make every remediation and replay auditable.",
    consumers: "Spam prevention, model monitoring, data quality operations, governance evidence, security review, and release gates.",
    privacy: "Highly restricted: minimize fields, enforce audited purpose-bound access, expire features, and avoid reversible low-entropy hashes.",
  },
] as const;

const CONTRACT_FIELDS = [
  { name: "event_id", purpose: "Idempotency", detail: "A globally unique logical event ID identifies the business transition—not one delivery attempt to Kafka. The producer reuses it across retries, Kafka redelivery preserves it, and replay does not manufacture a new identity.", example: "If a recipient ACK is published twice after a timeout, both records keep the same event_id, so the delivery fact counts one delivered transition." },
  { name: "event_type + version", purpose: "Meaning", detail: "The type names the WhatsApp state transition and the version defines its payload contract. Producers can add compatible fields or run old and new shapes together while consumers migrate deliberately.", example: "message_delivered v3 may add network_type while v2 consumers continue reading the stable message, device, outcome, and timestamp fields." },
  { name: "event_time", purpose: "When it happened", detail: "This is when the source says the transition occurred. Windows, latency, sequence reconstruction, and point-in-time device or membership joins use event time rather than Kafka arrival order.", example: "A read receipt created offline at 10:00 and uploaded at 10:07 belongs to the 10:00 message journey, while still being treated as seven minutes late." },
  { name: "ingestion_time", purpose: "Platform delay", detail: "This is when the data platform first accepted the event. Comparing it with event_time separates user or network delay from pipeline delay and exposes broken clocks or stalled producers.", example: "event_time 10:00:01 and ingestion_time 10:00:01.034 means 34 ms source-to-platform delay; a seven-minute gap follows the late-event path." },
  { name: "producer + region", purpose: "Ownership", detail: "The emitting service, deployment region, and failure domain identify who owns the fact and where it was created. They support routing, regional health analysis, incident isolation, and safe replay.", example: "delivery-service in ap-south owns the device delivery outcome; a client or analytics job cannot overwrite that authoritative transition." },
  { name: "trace + request IDs", purpose: "Diagnostics", detail: "Opaque trace and request identifiers connect an event to gateway, queue, routing, and service telemetry. They enable operational investigation without copying plaintext or private message payloads into analytics.", example: "An engineer can follow a slow send from edge request to routing attempt and delivery ACK while the encrypted message content remains unavailable." },
  { name: "entity tokens", purpose: "Join keys", detail: "Stable-within-purpose tokens represent message, conversation, user, device, call, group, and media entities. Their scope and rotation policy limit linkability while allowing only the joins a data product needs.", example: "message_token plus recipient_device_token joins accepted, routed, and delivered events; a restricted service—not the lakehouse—controls any identity translation." },
  { name: "privacy_classification", purpose: "Policy", detail: "The producer labels sensitivity when the event is created. That label drives topic access, column masking, retention, regional handling, audit requirements, and whether a field may enter a broad analytical table.", example: "A delivery outcome is USER_SENSITIVE; trust signals may be HIGHLY_RESTRICTED and remain in isolated topics and purpose-bound datasets." },
] as const;

const RECONCILIATION_CASES = [
  {
    id: "one-to-one",
    label: "1:1 delivery",
    key: "message_id + recipient_device_id",
    inputs: [
      { producer: "Client / edge", event: "request_received(client_message_id)", detail: "Records that WhatsApp’s edge received the sender request. The client-generated ID links retries before the message service assigns the canonical message ID; this is not yet proof of durable acceptance." },
      { producer: "Message service", event: "message_accepted(message_id)", detail: "Emitted only after the encrypted message is durably accepted. It creates the canonical message ID and is the authoritative starting point for accepted-to-delivered latency." },
      { producer: "Routing", event: "message_routed(device_id)", detail: "Identifies the recipient device, route region, queue attempt, and retry number selected for delivery. Several route attempts can belong to one final device outcome." },
      { producer: "Recipient", event: "message_delivered(device_id)", detail: "A device acknowledgement confirms that ciphertext reached that specific registered device. Duplicate acknowledgements keep the same logical event identity and must not increase delivery counts." },
      { producer: "Receipt service", event: "message_read if enabled", detail: "Adds an optional read timestamp only when receipts are enabled. It can arrive much later than delivery and enriches the existing fact without redefining whether delivery succeeded." },
    ],
    rules: [
      { label: "dedupe event_id", detail: "Keep one logical transition when producer retries, Kafka redelivery, or replay produces duplicate records." },
      { label: "map client ID once", detail: "Persist the client_message_id to canonical message_id mapping once so repeated sends cannot create multiple message journeys." },
      { label: "order by event_time", detail: "Reconstruct accepted, routed, delivered, and read transitions by occurrence time while using ingestion time to measure lateness." },
      { label: "retain late receipt", detail: "Allow an on-time delivery fact to receive a late read_at update without reopening or double-counting its delivery outcome." },
    ],
    output: "One device-grain delivery fact with accepted_at, delivered_at, read_at, latency, retries, region, and final outcome.",
    edge: "A duplicate delivery ACK updates nothing; a late read receipt may update read_at without changing the durable delivery outcome.",
  },
  {
    id: "multi-device",
    label: "Multi-device",
    key: "message_id + recipient_user_token",
    inputs: [
      { producer: "Device registry", event: "eligible devices at event time", detail: "Provides the versioned device set that was eligible when the message was sent. A current-state lookup would incorrectly include devices added later or exclude devices removed afterward." },
      { producer: "Phone", event: "delivered at 10:00:01", detail: "Creates one successful device-grain delivery fact. It may satisfy a product definition such as first eligible device delivered, but it says nothing about the desktop outcome." },
      { producer: "Desktop", event: "pending, then delivered at 10:03:18", detail: "Remains a separate device outcome with its own queue time, attempts, and latency. Its later acknowledgement updates the device fact without duplicating the user-level message." },
      { producer: "Tablet", event: "device removed before send", detail: "The point-in-time registry excludes this tablet from the eligible denominator. Missing delivery to an ineligible device is not a failure." },
      { producer: "Product rule", event: "define user-level delivered", detail: "Explicitly defines whether user delivery means first eligible device, primary phone, or all eligible devices. This derived rule must be versioned and must not replace device facts." },
    ],
    rules: [
      { label: "point-in-time device join", detail: "Join against the registry version effective at send time, never the device list that happens to exist when the analytics job runs." },
      { label: "preserve device grain", detail: "Store one outcome per eligible device so delays, failures, and platform-specific behavior remain measurable." },
      { label: "derive user status", detail: "Roll device outcomes into one user-level status only after applying the documented product definition." },
      { label: "version semantics", detail: "Attach the rule version so historical metrics remain reproducible if the meaning of user-level delivered changes." },
    ],
    output: "Device delivery facts plus one explicitly defined user-level projection, such as first eligible device delivered.",
    edge: "Do not collapse device events too early. A user-level ‘delivered’ metric is a derived product rule, not a raw source event.",
  },
  {
    id: "group",
    label: "Group fan-out",
    key: "group_message_id + recipient token",
    inputs: [
      { producer: "Group service", event: "membership_version at send", detail: "Freezes who was eligible when the group message was accepted. Later joins, leaves, and removals must not rewrite the original fan-out denominator." },
      { producer: "Message service", event: "one group_message_event", detail: "Represents the sender’s single action and carries the canonical group-message ID. It must remain separate from the hundreds of recipient and device delivery outcomes it triggers." },
      { producer: "Fan-out workers", event: "recipient_delivery_event", detail: "Creates one recipient-level dispatch result for each eligible member except the sender. Retries and worker reassignment can produce duplicate attempts that require stable event IDs." },
      { producer: "Devices", event: "per-device ACKs and retries", detail: "Each member may have multiple eligible devices, so recipient fan-out can amplify again into device-level delivery facts with independent latency and outcomes." },
      { producer: "Streaming", event: "bucketed progress aggregates", detail: "Maintains bounded partial counts for very large or hot groups. Bucketed state avoids one group key overloading a single partition while preserving reconciled totals." },
    ],
    rules: [
      { label: "keep two grains", detail: "Count one sender action at group-message grain and delivery success at recipient/device grain; never sum both as messages." },
      { label: "version membership", detail: "Use the membership snapshot effective at send time to determine the eligible recipients and expected fan-out." },
      { label: "bucket hot groups", detail: "Spread recipient state across deterministic buckets to control Kafka partition and streaming-state skew, then merge bucket totals." },
      { label: "reconcile fan-out count", detail: "Compare expected eligible recipients with unique dispatched and delivered recipients so gaps, duplicates, and partial progress are visible." },
    ],
    output: "One group-message fact, recipient/device outcomes, and bounded aggregate progress without prematurely exploding every analytical query.",
    edge: "For 1,000 members, one message can create up to 999 recipient deliveries before device amplification; partition and state sizing must use this skew.",
  },
] as const;

export default function WhatsAppEventSources() {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [caseIndex, setCaseIndex] = useState(0);
  const [evidenceIndex, setEvidenceIndex] = useState(0);
  const [ruleIndex, setRuleIndex] = useState(0);
  const source = SOURCES[sourceIndex];
  const field = CONTRACT_FIELDS[fieldIndex];
  const scenario = RECONCILIATION_CASES[caseIndex];
  const evidence = scenario.inputs[evidenceIndex] ?? scenario.inputs[0];
  const resolutionRule = scenario.rules[ruleIndex] ?? scenario.rules[0];

  return (
    <div className="mt-5 space-y-5">
      <SourceSection id="source-producer-map" eyebrow="01 · Source map" title="Map the WhatsApp event producers" subtitle="Eight source families describe different parts of messaging reliability. Volume, urgency, grain, and privacy vary, so they should not share one undifferentiated ingestion policy.">
        <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {SOURCES.map((item, index) => <button key={item.code} type="button" aria-pressed={sourceIndex === index} onMouseEnter={() => setSourceIndex(index)} onFocus={() => setSourceIndex(index)} onClick={() => setSourceIndex(index)} className={`min-h-[116px] rounded-2xl border p-4 text-left transition ${sourceIndex === index ? "border-[#111] bg-[#ededed] shadow-sm" : "border-[#d8d8d8] bg-[#f7f7f7] hover:-translate-y-0.5 hover:border-[#777] hover:bg-white"}`}><div className="flex items-center justify-between gap-2"><span className={`flex h-9 w-12 items-center justify-center rounded-lg font-mono text-[9px] font-bold ${sourceIndex === index ? "bg-[#111] text-white" : "bg-white text-[#111]"}`}>{item.code}</span><span className="text-[9px] font-bold text-[#5f5f5f]">{item.volume}</span></div><h3 className="mt-3 text-xs font-bold text-[#111]">{item.name}</h3><p className="mt-1 line-clamp-2 font-mono text-[9px] leading-4 text-[#5f5f5f]">{item.events}</p></button>)}
        </div>
        <article className="mt-4 overflow-hidden rounded-[22px] border-2 border-[#111] shadow-[0_12px_30px_rgba(0,0,0,.09)]" aria-live="polite">
          <div className="flex items-center justify-between gap-3 bg-[#111] px-5 py-3 text-white"><p className="text-[9px] font-extrabold uppercase tracking-[.18em]">Source explanation</p><p className="font-mono text-[9px] text-white/65">Card {sourceIndex + 1} of {SOURCES.length}</p></div>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#d8d8d8] bg-white p-5"><div><p className="font-mono text-[9px] font-bold tracking-[.14em] text-[#5f5f5f]">{source.code} · {source.priority} priority</p><h3 className="mt-1 text-lg font-bold">{source.name}</h3><p className="mt-2 max-w-3xl text-xs leading-6 text-[#5f5f5f]">{source.role}</p></div><CodeBadge>{source.volume}</CodeBadge></div>
          <div className="grid gap-px bg-[#d8d8d8] md:grid-cols-2 xl:grid-cols-3">{[
            ["WhatsApp example", source.example],
            ["Event grain", source.grain],
            ["Delivery behavior", source.behavior],
            ["Contract and join keys", source.contract],
            ["Downstream use", source.consumers],
            ["Privacy boundary", source.privacy],
          ].map(([label, value]) => <div key={label} className="bg-[#f7f7f7] p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">{label}</p><p className="mt-2 text-[11px] leading-5 text-[#444]">{value}</p></div>)}</div>
        </article>
      </SourceSection>

      <SourceSection id="source-event-contract" eyebrow="02 · Shared contract" title="Standardize metadata without exposing message content" subtitle="Every WhatsApp producer uses the same privacy-safe metadata wrapper, while keeping its own source-specific payload. This lets the data platform connect a send, server acceptance, device delivery, read receipt, media transfer, or call-quality sample without reading message content.">
        <div className="mt-6 overflow-hidden rounded-2xl border-2 border-[#111] bg-[#ededed] shadow-[0_10px_26px_rgba(0,0,0,.08)]">
          <div className="bg-[#111] px-4 py-3 text-white"><p className="text-[9px] font-extrabold uppercase tracking-[.18em]">How the shared contract works for WhatsApp</p></div>
          <div className="grid gap-px bg-[#c9c9c9] md:grid-cols-3">
            {[
              ["One common wrapper", "Message, group, device, media, notification, and call events all carry the same identity, time, ownership, trace, and privacy fields."],
              ["Different business payloads", "A delivery event adds recipient device and outcome; a call sample adds jitter and packet loss. The common wrapper stays stable."],
              ["Join without decrypting", "Tokenized message, conversation, user, device, call, and media IDs connect lifecycle facts. Plaintext, phone numbers, keys, and media bytes never enter the event."],
            ].map(([title, detail], index) => <div key={title} className="bg-[#ededed] p-4"><span className="font-mono text-[9px] font-bold text-[#777]">0{index + 1}</span><h3 className="mt-2 text-xs font-bold text-[#111]">{title}</h3><p className="mt-2 text-[11px] leading-5 text-[#4b4b4b]">{detail}</p></div>)}
          </div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <div className="grid gap-2 sm:grid-cols-2">{CONTRACT_FIELDS.map((item, index) => <button key={item.name} type="button" aria-pressed={fieldIndex === index} onMouseEnter={() => setFieldIndex(index)} onFocus={() => setFieldIndex(index)} onClick={() => setFieldIndex(index)} className={`rounded-xl border p-3 text-left transition ${fieldIndex === index ? "border-[#111] bg-[#ededed]" : "border-[#d8d8d8] bg-white hover:border-[#777]"}`}><code className="text-[11px] font-bold text-[#111]">{item.name}</code><span className="mt-1 block text-[10px] text-[#5f5f5f]">{item.purpose}</span></button>)}</div>
            <div className="mt-3 overflow-hidden rounded-2xl border-2 border-[#111] bg-[#ededed] shadow-[0_8px_20px_rgba(0,0,0,.07)]" aria-live="polite"><div className="flex items-center justify-between gap-3 bg-[#111] px-4 py-2.5 text-white"><p className="text-[9px] font-extrabold uppercase tracking-[.16em]">Field explanation</p><p className="text-[9px] text-white/65">WhatsApp meaning</p></div><div className="p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">{field.purpose}</p><h3 className="mt-1 font-mono text-sm font-bold">{field.name}</h3><p className="mt-2 text-xs leading-6 text-[#333]">{field.detail}</p><div className="mt-3 border-t border-[#c7c7c7] pt-3"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">WhatsApp example</p><p className="mt-1 text-[11px] leading-5 text-[#444]">{field.example}</p></div></div></div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#bdbdbd] bg-[#111] text-white">
            <div className="border-b border-white/15 px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/60">Example · message_delivered v3</p></div>
            <pre className="overflow-x-auto p-4 font-mono text-[10px] leading-5 text-[#e5e5e5]">{`{
  "event_id": "019a…",
  "event_type": "message_delivered",
  "event_version": 3,
  "event_time": "2026-09-26T15:10:21.171Z",
  "ingestion_time": "2026-09-26T15:10:21.205Z",
  "producer": "delivery-service",
  "region": "ap-south",
  "conversation_hash": "hmac:…",
  "device_platform": "ANDROID",
  "network_type": "4G",
  "accepted_to_delivered_ms": 132,
  "retry_count": 0,
  "privacy_classification": "USER_SENSITIVE",
  "schema_version": 3
}`}</pre>
          </div>
        </div>
      </SourceSection>

      <SourceSection id="source-reconciliation" eyebrow="03 · Delivery reconciliation" title="Turn separate WhatsApp events into one delivery fact" subtitle="No single producer sees the entire message journey. Reconciliation matches the independent events for one message, removes retry duplicates, restores event-time order, and publishes one clearly defined analytical result.">
        <div className="mt-6 overflow-hidden rounded-2xl border-2 border-[#111] bg-[#ededed]">
          <div className="bg-[#111] px-4 py-3 text-white"><p className="text-[9px] font-extrabold uppercase tracking-[.18em]">What reconciliation means</p></div>
          <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
            <div><p className="font-mono text-[9px] font-bold text-[#777]">01 · EVIDENCE</p><p className="mt-1 text-xs font-bold">Separate producer events</p><p className="mt-1 text-[10px] leading-5 text-[#5f5f5f]">Accepted, routed, delivered, read, device, and membership facts arrive independently.</p></div>
            <span className="hidden text-[#777] sm:block" aria-hidden>→</span>
            <div><p className="font-mono text-[9px] font-bold text-[#777]">02 · RESOLVE</p><p className="mt-1 text-xs font-bold">Match, deduplicate, order</p><p className="mt-1 text-[10px] leading-5 text-[#5f5f5f]">Join on tokenized IDs, suppress retries, use event time, and apply versioned product rules.</p></div>
            <span className="hidden text-[#777] sm:block" aria-hidden>→</span>
            <div><p className="font-mono text-[9px] font-bold text-[#777]">03 · RESULT</p><p className="mt-1 text-xs font-bold">One trustworthy data fact</p><p className="mt-1 text-[10px] leading-5 text-[#5f5f5f]">Consumers receive one explicit grain and outcome instead of counting raw events as deliveries.</p></div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Reconciliation scenario">{RECONCILIATION_CASES.map((item, index) => <button key={item.id} type="button" aria-pressed={caseIndex === index} onClick={() => { setCaseIndex(index); setEvidenceIndex(0); setRuleIndex(0); }} className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition ${caseIndex === index ? "border-[#111] bg-[#111] text-white" : "border-[#d8d8d8] bg-white text-[#444] hover:border-[#777]"}`}>{item.label}</button>)}</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px_minmax(0,1fr)] xl:items-center">
          <div><p className="mb-2 text-[9px] font-extrabold uppercase tracking-[.15em] text-[#777]">01 · Evidence from producers</p><div className="grid gap-2">{scenario.inputs.map((item, index) => <button key={`${item.producer}-${item.event}`} type="button" aria-pressed={evidenceIndex === index} onMouseEnter={() => setEvidenceIndex(index)} onFocus={() => setEvidenceIndex(index)} onClick={() => setEvidenceIndex(index)} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${evidenceIndex === index ? "border-[#111] bg-[#ededed]" : "border-[#d8d8d8] bg-[#f7f7f7] hover:border-[#777] hover:bg-white"}`}><span className="text-xs font-bold">{item.producer}</span><code className="text-right text-[9px] leading-4 text-[#5f5f5f]">{item.event}</code></button>)}</div></div>
          <div><p className="mb-2 text-center text-[9px] font-extrabold uppercase tracking-[.15em] text-[#777]">02 · Rules applied</p><div className="rounded-[22px] border-2 border-[#111] bg-[#ededed] p-5 text-center"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#5f5f5f]">Match records on</p><strong className="mt-2 block font-mono text-sm">{scenario.key}</strong><div className="mt-4 flex flex-wrap justify-center gap-2">{scenario.rules.map((rule, index) => <button key={rule.label} type="button" aria-pressed={ruleIndex === index} onMouseEnter={() => setRuleIndex(index)} onFocus={() => setRuleIndex(index)} onClick={() => setRuleIndex(index)} className={`inline-flex min-h-7 items-center rounded-full border px-2.5 font-mono text-[9px] font-bold transition ${ruleIndex === index ? "border-[#111] bg-[#111] text-white" : "border-[#c9c9c9] bg-white text-[#333] hover:border-[#777]"}`}>{rule.label}</button>)}</div></div></div>
          <article><p className="mb-2 text-[9px] font-extrabold uppercase tracking-[.15em] text-[#777]">03 · Final analytical fact</p><div className="rounded-[22px] border border-[#d8d8d8] bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#777]">Trusted output</p><h3 className="mt-2 text-base font-bold">{scenario.label}</h3><p className="mt-3 text-xs leading-6 text-[#444]">{scenario.output}</p><div className="mt-4 border-t border-[#d8d8d8] pt-3"><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#777]">Why raw counts can disagree</p><p className="mt-1 text-[10px] leading-5 text-[#5f5f5f]">{scenario.edge}</p></div></div></article>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border-2 border-[#111] bg-[#ededed] shadow-[0_8px_20px_rgba(0,0,0,.07)]" aria-live="polite">
          <div className="flex items-center justify-between gap-3 bg-[#111] px-4 py-2.5 text-white"><p className="text-[9px] font-extrabold uppercase tracking-[.16em]">Reconciliation field explanations</p><p className="text-[9px] text-white/65">Evidence + rule details</p></div>
          <div className="grid gap-px bg-[#c7c7c7] md:grid-cols-2">
            <div className="bg-[#ededed] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">Evidence field</p><h3 className="mt-1 text-sm font-bold">{evidence.producer}</h3><code className="mt-1 block text-[9px] leading-4 text-[#5f5f5f]">{evidence.event}</code><p className="mt-3 text-[11px] leading-5 text-[#333]">{evidence.detail}</p></div>
            <div className="bg-[#ededed] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#777]">Resolution rule</p><h3 className="mt-1 font-mono text-sm font-bold">{resolutionRule.label}</h3><p className="mt-3 text-[11px] leading-5 text-[#333]">{resolutionRule.detail}</p></div>
          </div>
        </div>
      </SourceSection>
    </div>
  );
}
