"use client";

import { useState } from "react";

export type WhatsAppModelExplanation = {
  group: "Fact" | "Dimension";
  name: string;
  grain: string;
  contents: string;
  purpose: string;
  source: string;
};

type ModelTable = WhatsAppModelExplanation & {
  columns: readonly string[];
};

const TABLES: readonly ModelTable[] = [
  { name: "dim_date", group: "Dimension", grain: "One row represents one calendar date in the reporting calendar.", contents: "Date key, calendar date, weekday, week, month, quarter, year, and weekend flags.", purpose: "Gives message, call, media, status, notification, experiment, and capacity facts one consistent calendar.", source: "Generated from the governed analytics calendar and reused by every WhatsApp fact.", columns: ["PK · date_sk", "ATTR · calendar_date", "ATTR · week / month / year"] },
  { name: "dim_time", group: "Dimension", grain: "One row represents one minute of a UTC day.", contents: "Time key, minute, hour, five-minute bucket, and broad part-of-day label.", purpose: "Supports minute and five-minute reliability analysis without embedding inconsistent time buckets in each fact.", source: "Generated once as a standard UTC time spine; local presentation is derived through region timezone rules.", columns: ["PK · time_sk", "ATTR · hour / minute", "ATTR · five_minute_bucket"] },
  { name: "dim_region", group: "Dimension", grain: "One row represents one coarse WhatsApp operating region version.", contents: "Region key and code, country group, timezone, residency class, and effective dates.", purpose: "Compares reliability and capacity geographically without storing a user’s precise location.", source: "Built from the approved regional topology and retained as Type 2 history when ownership or residency rules change.", columns: ["PK · region_sk", "NK · coarse_region_code", "SCD2 · effective_from / to"] },
  { name: "dim_datacenter", group: "Dimension", grain: "One row represents one serving datacenter or cloud-region version.", contents: "Datacenter key and code, operating region, provider zone, role, and effective dates.", purpose: "Explains which serving location accepted traffic or produced a platform metric when topology changes over time.", source: "Built from deployment and service-discovery metadata; historical versions are preserved for incident analysis.", columns: ["PK · datacenter_sk", "FK · region_sk", "SCD2 · role / effective dates"] },
  { name: "dim_device", group: "Dimension", grain: "One row represents one privacy-safe device capability profile version—not a raw device identity.", contents: "Device key, platform family, device class, capability group, linked-device type, and effective dates.", purpose: "Separates failures caused by platform or capability differences while keeping direct device identifiers out of analytics.", source: "Created from tokenized device metadata and CDC; changing capability classifications use Type 2 history.", columns: ["PK · device_sk", "ATTR · platform / class", "SCD2 · capability_group"] },
  { name: "dim_app_version", group: "Dimension", grain: "One row represents one released WhatsApp application build.", contents: "Version key, platform, semantic version, build number, release channel, and release date.", purpose: "Finds delivery, calling, and media regressions introduced by a particular client release.", source: "Built from the signed client-release registry and normalized version mappings.", columns: ["PK · app_version_sk", "ATTR · platform / build", "ATTR · release_channel"] },
  { name: "dim_network_type", group: "Dimension", grain: "One row represents one coarse network classification.", contents: "Network key, Wi-Fi or cellular class, radio generation, broad carrier group, and quality tier.", purpose: "Explains reliability and call-quality differences without collecting precise network or subscriber identity.", source: "Derived from privacy-approved client and edge classifications using a governed mapping.", columns: ["PK · network_type_sk", "ATTR · connection_class", "ATTR · quality_tier"] },
  { name: "dim_message_type", group: "Dimension", grain: "One row represents one governed message category.", contents: "Message-type key, text/media/system category, group flag, and delivery-policy class.", purpose: "Lets analysts compare lifecycle outcomes for direct, group, media, and system messages without reading content.", source: "Built from the messaging event contract’s controlled message-type enumeration.", columns: ["PK · message_type_sk", "ATTR · category", "ATTR · group / media flags"] },
  { name: "dim_failure_reason", group: "Dimension", grain: "One row represents one normalized failure-reason code version.", contents: "Failure key and code, owning domain, retryability, customer visibility, and reason family.", purpose: "Maps producer-specific errors into stable reliability categories while preserving the original code for investigation.", source: "Built from the cross-service error registry; mappings are versioned instead of silently reclassified.", columns: ["PK · failure_reason_sk", "NK · failure_code", "ATTR · domain / retryable"] },
  { name: "dim_experiment", group: "Dimension", grain: "One row represents one experiment and variant configuration version.", contents: "Experiment key, experiment and variant IDs, eligibility version, allocation, owner, and active dates.", purpose: "Distinguishes assignment from actual exposure and makes sample-ratio and outcome analysis reproducible.", source: "Built from the experimentation registry and preserved for the configuration active at exposure time.", columns: ["PK · experiment_sk", "NK · experiment / variant", "SCD2 · eligibility_version"] },
  { name: "dim_service", group: "Dimension", grain: "One row represents one measured WhatsApp platform service.", contents: "Service key and name, domain, tier, owning team, SLO class, and capacity unit.", purpose: "Makes regional capacity snapshots comparable across messaging, media, calls, notification, and data services.", source: "Built from the service catalog and SLO registry.", columns: ["PK · service_sk", "ATTR · domain / tier", "ATTR · owner / SLO class"] },

  { name: "fact_message", group: "Fact", grain: "One row represents one logical message accepted by WhatsApp.", contents: "Message ID, protected conversation key, accepted time, sender region and device profile, message type, recipient count, and acceptance outcome.", purpose: "Counts logical messages once before multi-device delivery fan-out and anchors message-level acceptance metrics.", source: "Created from validated message-accepted events after event-ID deduplication; message bodies are never included.", columns: ["PK · message_id", "FK · sender_region / device", "FK · message_type_sk", "MEASURE · recipient_count"] },
  { name: "fact_message_delivery", group: "Fact", grain: "One row represents one logical message × one eligible recipient device.", contents: "Message ID, protected recipient-device key, accepted, routed, delivered and read times, retry count, status, latency, and failure reason.", purpose: "Measures device-level delivery success and latency without confusing one logical message with its multi-device fan-out.", source: "Reconciled from messaging acceptance, routing, delivery, read, device, and group-membership evidence using event-time rules.", columns: ["PK · message_id + device_sk", "FK · regions / failure_reason", "TS · accepted / delivered / read", "MEASURE · latency / retries"] },
  { name: "fact_group_message", group: "Fact", grain: "One row represents one logical message accepted for one group-membership version.", contents: "Message ID, protected group key, membership version, eligible user and device counts, fan-out attempts, completed deliveries, and hot-group flag.", purpose: "Explains group fan-out amplification and incomplete delivery without storing group names or member identities.", source: "Created by joining the accepted group message to the membership version effective when the message was sent.", columns: ["PK · message_id", "DD · group_token / version", "MEASURE · eligible_devices", "MEASURE · fanout_completed"] },
  { name: "fact_media_transfer", group: "Fact", grain: "One row represents one media upload or download transfer attempt.", contents: "Transfer ID, direction, coarse regions, device and app version, media class, bytes, duration, retry count, cache outcome, and failure reason.", purpose: "Measures upload, download, CDN, and retry performance without storing the encrypted media object or caption.", source: "Created from validated media lifecycle events and edge/CDN outcomes keyed by a protected transfer identifier.", columns: ["PK · transfer_id", "FK · device / app / network", "FK · regions / failure_reason", "MEASURE · bytes / duration"] },
  { name: "fact_call", group: "Fact", grain: "One row represents one WhatsApp call session.", contents: "Call ID, call type, participant count, caller and callee coarse regions, setup latency, connected duration, terminal state, and disconnect reason.", purpose: "Measures whether calls connect and remain active without retaining audio, video, contact identity, or call content.", source: "Reconciled from call-started, ringing, connected, participant, and ended lifecycle events.", columns: ["PK · call_id", "FK · regions / failure_reason", "ATTR · call_type / outcome", "MEASURE · setup / duration"] },
  { name: "fact_call_quality_minute", group: "Fact", grain: "One row represents one call × participant device × bounded quality minute.", contents: "Call ID, participant-device key, minute start, app and network dimensions, sampled packet loss, jitter, RTT, bitrate, and quality coverage.", purpose: "Finds time-local call-quality regressions while declaring sampling and never storing audio or video.", source: "Created from privacy-safe sampled quality windows, bounded to a call participant and event-time minute.", columns: ["PK · call_id + device + minute", "FK · app / network / region", "MEASURE · loss / jitter / RTT", "MEASURE · sample_coverage"] },
  { name: "fact_status_view", group: "Fact", grain: "One row represents one status item × one privacy-safe viewer device view.", contents: "Protected status and viewer-device keys, author and viewer coarse regions, published and viewed times, surface, and view latency.", purpose: "Measures status reach and view latency without storing status media, captions, phone numbers, or contact-book relationships.", source: "Created from deduplicated status-view events after validating that the status item was eligible and still active.", columns: ["PK · status_token + viewer", "FK · regions / device / app", "TS · published / viewed", "MEASURE · view_latency_ms"] },
  { name: "fact_notification", group: "Fact", grain: "One row represents one notification attempt to one destination device.", contents: "Notification ID, protected device key, trigger class, provider route, sent and acknowledged times, retry count, outcome, and failure reason.", purpose: "Separates notification-provider and device wake-up failures from core message delivery outcomes.", source: "Created from notification dispatch and provider acknowledgement events; notification text is excluded.", columns: ["PK · notification_id", "FK · device / region / app", "FK · failure_reason_sk", "MEASURE · latency / retries"] },
  { name: "fact_experiment_exposure", group: "Fact", grain: "One row represents one protected device × experiment × actual exposure event.", contents: "Exposure ID, experiment and variant, device and app version, eligibility version, assigned time, exposed time, surface, and event date.", purpose: "Prevents assigned-but-never-exposed users from diluting experiment results and supports sample-ratio checks.", source: "Created only when the eligible client actually renders or executes the experimental behavior.", columns: ["PK · exposure_id", "FK · experiment / device / app", "TS · assigned / exposed", "ATTR · surface"] },
  { name: "fact_regional_capacity_5m", group: "Fact", grain: "One row represents one region × service × five-minute window.", contents: "Region, service, date and time keys, active connections, messages per second, CPU, memory, queue depth, consumer lag, and saturation flags.", purpose: "Supports capacity planning and incident correlation without placing analytics on the live messaging path.", source: "Created from aggregated service and infrastructure telemetry after coverage and window-completeness checks.", columns: ["PK · region + service + 5m", "FK · date / time / datacenter", "MEASURE · connections / msg_s", "MEASURE · CPU / queue / lag"] },
] as const;

export const DEFAULT_WHATSAPP_MODEL_EXPLANATION: WhatsAppModelExplanation = TABLES.find((table) => table.name === "fact_message_delivery")!;

const LAYOUT = [
  { name: "dim_date", x: 20, y: 10, width: 220 }, { name: "dim_time", x: 250, y: 10, width: 220 }, { name: "dim_region", x: 480, y: 10, width: 220 }, { name: "dim_datacenter", x: 710, y: 10, width: 220 }, { name: "dim_device", x: 940, y: 10, width: 220 }, { name: "dim_app_version", x: 1170, y: 10, width: 220 },
  { name: "fact_message", x: 45, y: 165, width: 270 }, { name: "fact_message_delivery", x: 330, y: 165, width: 270 }, { name: "fact_group_message", x: 615, y: 165, width: 270 }, { name: "fact_media_transfer", x: 900, y: 165, width: 270 }, { name: "fact_call", x: 1185, y: 165, width: 270 },
  { name: "fact_call_quality_minute", x: 45, y: 365, width: 270 }, { name: "fact_status_view", x: 330, y: 365, width: 270 }, { name: "fact_notification", x: 615, y: 365, width: 270 }, { name: "fact_experiment_exposure", x: 900, y: 365, width: 270 }, { name: "fact_regional_capacity_5m", x: 1185, y: 365, width: 270 },
  { name: "dim_network_type", x: 55, y: 625, width: 250 }, { name: "dim_message_type", x: 335, y: 625, width: 250 }, { name: "dim_failure_reason", x: 615, y: 625, width: 250 }, { name: "dim_experiment", x: 895, y: 625, width: 250 }, { name: "dim_service", x: 1175, y: 625, width: 250 },
] as const;

const RELATIONSHIPS = [
  { from: "dim_date", to: "fact_message", key: "event_date_sk" }, { from: "dim_date", to: "fact_message_delivery", key: "event_date_sk" }, { from: "dim_date", to: "fact_media_transfer", key: "event_date_sk" }, { from: "dim_date", to: "fact_call", key: "event_date_sk" }, { from: "dim_date", to: "fact_status_view", key: "event_date_sk" }, { from: "dim_date", to: "fact_experiment_exposure", key: "event_date_sk" },
  { from: "dim_time", to: "fact_call_quality_minute", key: "minute_time_sk" }, { from: "dim_time", to: "fact_regional_capacity_5m", key: "window_time_sk" },
  { from: "dim_region", to: "dim_datacenter", key: "region_sk" }, { from: "dim_region", to: "fact_message", key: "sender_region_sk" }, { from: "dim_region", to: "fact_message_delivery", key: "sender / receiver_region_sk" }, { from: "dim_region", to: "fact_media_transfer", key: "source / edge_region_sk" }, { from: "dim_region", to: "fact_call", key: "caller / callee_region_sk" }, { from: "dim_region", to: "fact_status_view", key: "author / viewer_region_sk" }, { from: "dim_region", to: "fact_regional_capacity_5m", key: "region_sk" },
  { from: "dim_datacenter", to: "fact_message", key: "accepted_datacenter_sk" }, { from: "dim_datacenter", to: "fact_regional_capacity_5m", key: "datacenter_sk" },
  { from: "dim_device", to: "fact_message", key: "sender_device_sk" }, { from: "dim_device", to: "fact_message_delivery", key: "recipient_device_sk" }, { from: "dim_device", to: "fact_media_transfer", key: "device_sk" }, { from: "dim_device", to: "fact_call_quality_minute", key: "participant_device_sk" }, { from: "dim_device", to: "fact_status_view", key: "viewer_device_sk" }, { from: "dim_device", to: "fact_notification", key: "device_sk" }, { from: "dim_device", to: "fact_experiment_exposure", key: "device_sk" },
  { from: "dim_app_version", to: "fact_message_delivery", key: "app_version_sk" }, { from: "dim_app_version", to: "fact_media_transfer", key: "app_version_sk" }, { from: "dim_app_version", to: "fact_call_quality_minute", key: "app_version_sk" }, { from: "dim_app_version", to: "fact_notification", key: "app_version_sk" }, { from: "dim_app_version", to: "fact_experiment_exposure", key: "app_version_sk" },
  { from: "dim_network_type", to: "fact_message_delivery", key: "network_type_sk" }, { from: "dim_network_type", to: "fact_media_transfer", key: "network_type_sk" }, { from: "dim_network_type", to: "fact_call_quality_minute", key: "network_type_sk" },
  { from: "dim_message_type", to: "fact_message", key: "message_type_sk" }, { from: "dim_message_type", to: "fact_message_delivery", key: "message_type_sk" }, { from: "dim_message_type", to: "fact_group_message", key: "message_type_sk" },
  { from: "dim_failure_reason", to: "fact_message_delivery", key: "failure_reason_sk" }, { from: "dim_failure_reason", to: "fact_media_transfer", key: "failure_reason_sk" }, { from: "dim_failure_reason", to: "fact_call", key: "disconnect_reason_sk" }, { from: "dim_failure_reason", to: "fact_notification", key: "failure_reason_sk" },
  { from: "dim_experiment", to: "fact_experiment_exposure", key: "experiment_sk" }, { from: "dim_service", to: "fact_regional_capacity_5m", key: "service_sk" },
  { from: "fact_message", to: "fact_message_delivery", key: "message_id" }, { from: "fact_message", to: "fact_group_message", key: "message_id" }, { from: "fact_call", to: "fact_call_quality_minute", key: "call_id" },
] as const;

function Explanation({ table, testId }: { table: ModelTable; testId: string }) {
  return <div data-testid={testId} className="overflow-hidden rounded-xl border border-[#111] bg-[#111] text-white" aria-live="polite">
    <div className="border-b border-white/15 bg-[#1d1d1d] px-4 py-3"><p className="text-[9px] font-extrabold uppercase tracking-[.13em] text-[#cfcfcf]">{table.group} table explanation</p><h3 className="mt-1 break-words text-base font-bold leading-5">{table.name}</h3></div>
    <div className="grid gap-3 p-4 text-[11px] leading-5">
      <div><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-[#cfcfcf]">One row means</p><p className="mt-1">{table.grain}</p></div>
      <div className="border-t border-white/15 pt-2.5"><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-[#cfcfcf]">Key contents</p><p className="mt-1 text-white/80">{table.contents}</p></div>
      <div className="border-t border-white/15 pt-2.5"><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-[#cfcfcf]">How WhatsApp uses it</p><p className="mt-1 text-white/80">{table.purpose}</p></div>
      <div className="border-t border-white/15 pt-2.5"><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-[#cfcfcf]">Created from</p><p className="mt-1 text-white/80">{table.source}</p></div>
    </div>
  </div>;
}

export default function WhatsAppDataModeling({ onExplain }: { onExplain: (explanation: WhatsAppModelExplanation) => void }) {
  const [selectedName, setSelectedName] = useState("fact_message_delivery");
  const [zoom, setZoom] = useState(1);
  const selected = TABLES.find((table) => table.name === selectedName) ?? TABLES[12];
  const connected = new Set<string>(RELATIONSHIPS.flatMap((relationship) => relationship.from === selectedName ? [relationship.to] : relationship.to === selectedName ? [relationship.from] : []));
  const tableHeight = (name: string) => 45 + (TABLES.find((table) => table.name === name)?.columns.length ?? 0) * 22;
  const selectTable = (name: string) => {
    const table = TABLES.find((item) => item.name === name);
    if (!table) return;
    setSelectedName(name);
    onExplain(table);
  };

  return <div className="mt-4 overflow-hidden rounded-2xl border border-[#c8c8c8] bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d2d2d2] bg-[#ededed] px-3 py-2">
      <div className="flex flex-wrap items-center gap-4 text-[10px] font-semibold text-[#555]"><span><b className="text-[#111]">10</b> facts</span><span><b className="text-[#111]">11</b> dimensions</span><span className="hidden sm:inline">Solid lines highlight joins for the selected table</span></div>
      <div className="flex items-center gap-2">
        <span className="min-w-12 text-center font-mono text-[9px] font-bold text-[#555]">{Math.round(zoom * 100)}%</span>
        <input type="range" min={0.75} max={1.35} step={0.01} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} aria-label="WhatsApp ER diagram zoom" className="w-24 cursor-pointer accent-[#111]" />
        <button type="button" onClick={() => setZoom((value) => Math.max(.75, Number((value - .08).toFixed(2))))} aria-label="Zoom out WhatsApp ER diagram" className="h-7 w-7 rounded-full border border-[#bbb] bg-white text-sm font-bold">−</button>
        <button type="button" onClick={() => setZoom(1)} className="h-7 rounded-full border border-[#bbb] bg-white px-2.5 text-[9px] font-bold">RESET</button>
        <button type="button" onClick={() => setZoom((value) => Math.min(1.35, Number((value + .08).toFixed(2))))} aria-label="Zoom in WhatsApp ER diagram" className="h-7 w-7 rounded-full border border-[#bbb] bg-white text-sm font-bold">+</button>
      </div>
    </div>

    <div className="border-b border-[#d2d2d2] p-3 xl:hidden"><Explanation table={selected} testId="mobile-whatsapp-model-inspector" /></div>

    <div data-testid="whatsapp-model-canvas" className="max-h-[760px] overflow-auto bg-[#f4f4f4] p-1.5">
      <div style={{ width: `${zoom * 100}%`, minWidth: "1120px", transition: "width 180ms ease" }}>
        <svg viewBox="0 0 1500 760" role="group" aria-label="WhatsApp fact and dimension entity relationship diagram" className="block h-auto w-full">
          <rect width="1500" height="760" rx="18" fill="#f4f4f4" />
          <rect x="30" y="140" width="1440" height="170" rx="15" fill="#ededed" stroke="#d3d3d3" />
          <rect x="30" y="340" width="1440" height="170" rx="15" fill="#e8e8e8" stroke="#d0d0d0" />
          <text x="45" y="153" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#666">MESSAGING + MEDIA + CALL SESSION FACTS</text>
          <text x="45" y="353" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#666">QUALITY + ENGAGEMENT + PLATFORM FACTS</text>

          <g fill="none" pointerEvents="none">
            {RELATIONSHIPS.map((relationship) => {
              const from = LAYOUT.find((node) => node.name === relationship.from);
              const to = LAYOUT.find((node) => node.name === relationship.to);
              if (!from || !to) return null;
              const fromX = from.x + from.width / 2;
              const fromY = from.y + tableHeight(from.name) / 2;
              const toX = to.x + to.width / 2;
              const toY = to.y + tableHeight(to.name) / 2;
              const middleY = (fromY + toY) / 2;
              const active = relationship.from === selectedName || relationship.to === selectedName;
              return <path key={`${relationship.from}-${relationship.to}-${relationship.key}`} d={["M", fromX, fromY, "C", fromX, middleY, toX, middleY, toX, toY].join(" ")} stroke={active ? "#111" : "#b9b9b9"} strokeWidth={active ? 2.4 : 1.05} strokeDasharray={active ? "0" : "5 5"} opacity={active ? .92 : .34} />;
            })}
          </g>

          <g fontFamily="inherit">
            {LAYOUT.map((node) => {
              const table = TABLES.find((item) => item.name === node.name);
              if (!table) return null;
              const active = selectedName === table.name;
              const related = connected.has(table.name);
              const fact = table.group === "Fact";
              const height = tableHeight(table.name);
              return <g key={table.name} data-testid={`whatsapp-model-table-${table.name}`} role="button" tabIndex={0} aria-label={`${table.name}. ${table.grain}`} aria-pressed={active} onMouseEnter={() => selectTable(table.name)} onFocus={() => selectTable(table.name)} onClick={() => selectTable(table.name)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectTable(table.name); } }} className="cursor-pointer outline-none">
                <rect x={node.x} y={node.y} width={node.width} height={height} rx="9" fill={active ? "#d8d8d8" : fact ? "#fafafa" : "#fff"} stroke={active ? "#111" : related ? "#666" : fact ? "#888" : "#aaa"} strokeWidth={active ? 2.6 : related ? 1.8 : 1.1} />
                {fact ? <rect x={node.x} y={node.y} width="6" height={height} rx="3" fill={active ? "#111" : "#555"} /> : null}
                <rect x={node.x + (fact ? 6 : 0)} y={node.y} width={node.width - (fact ? 6 : 0)} height="37" rx="8" fill={active ? "#cfcfcf" : fact ? "#e5e5e5" : "#f1f1f1"} />
                <text x={node.x + 10} y={node.y + 13} fontSize="7.5" fontWeight="700" letterSpacing="1.2" fill="#666">{table.group.toUpperCase()}</text>
                <text x={node.x + 10} y={node.y + 29} fontSize={fact ? "13" : "12.5"} fontWeight="700" fill="#111">{table.name}</text>
                {table.columns.map((column, index) => <g key={column}><line x1={node.x + 7} x2={node.x + node.width - 7} y1={node.y + 41 + index * 22} y2={node.y + 41 + index * 22} stroke="#dedede" /><text x={node.x + 10} y={node.y + 57 + index * 22} fontSize="11.5" fontWeight="500" fill="#444">{column}</text></g>)}
              </g>;
            })}
          </g>
        </svg>
      </div>
    </div>
    <div className="grid gap-px border-t border-[#d2d2d2] bg-[#d2d2d2] sm:grid-cols-3">
      <div className="bg-white px-4 py-3"><p className="font-mono text-[8px] font-bold text-[#666]">TRANSACTION FACTS</p><p className="mt-1 text-[10px] leading-4 text-[#444]">Immutable business events such as a message, call, transfer, view, or exposure.</p></div>
      <div className="bg-[#ededed] px-4 py-3"><p className="font-mono text-[8px] font-bold text-[#666]">ACCUMULATING LIFECYCLE</p><p className="mt-1 text-[10px] leading-4 text-[#444]">Delivery milestones are curated for latency queries while raw transitions remain immutable.</p></div>
      <div className="bg-white px-4 py-3"><p className="font-mono text-[8px] font-bold text-[#666]">PERIODIC SNAPSHOT</p><p className="mt-1 text-[10px] leading-4 text-[#444]">Regional capacity is frozen every five minutes for planning and incident correlation.</p></div>
    </div>
  </div>;
}
