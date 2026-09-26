"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { MODELING_SECTIONS } from "./data";
import { Section, YouTubeFrame } from "./shared";

type TableKind = "Fact" | "Dimension" | "Bridge" | "Registry";
type Field = { name: string; type: string; meaning: string };
type ModelTable = {
  name: string;
  kind: TableKind;
  grain: string;
  source: string;
  use: string;
  fields: readonly Field[];
};

const f = (name: string, type: string, meaning: string): Field => ({ name, type, meaning });

const tables: readonly ModelTable[] = [
  { name: "dim_date", kind: "Dimension", grain: "One calendar date", source: "Generated calendar", use: "Consistent day, week, month, holiday, and reporting-period joins.", fields: [f("date_sk", "INT PK", "Warehouse date key."), f("calendar_date", "DATE", "Actual reporting date."), f("week_start", "DATE", "Week grouping boundary."), f("is_holiday", "BOOL", "Local holiday indicator.")] },
  { name: "dim_time", kind: "Dimension", grain: "One intraday time bucket", source: "Generated clock dimension", use: "Hour-of-day, prime-time, and minute-bucket analysis.", fields: [f("time_sk", "INT PK", "Intraday surrogate key."), f("hour_of_day", "SMALLINT", "Local hour from 0 to 23."), f("minute_bucket", "SMALLINT", "Reporting minute bucket."), f("is_prime_time", "BOOL", "Configured busy-viewing window.")] },
  { name: "dim_video", kind: "Dimension", grain: "One historical version of a video", source: "Video metadata CDC", use: "Point-in-time title, duration, category, language, kids, and upload context.", fields: [f("video_sk", "BIGINT PK", "Version-specific warehouse key."), f("video_id", "STRING BK", "Stable product video ID."), f("channel_sk", "BIGINT FK", "Historical owning channel version."), f("title", "STRING", "Title valid during this version."), f("duration_seconds", "INT", "Published video duration."), f("format_sk", "INT FK", "VOD, Shorts, or Live classification."), f("effective_from", "TIMESTAMP", "Start of Type-2 validity."), f("effective_to", "TIMESTAMP", "End of Type-2 validity.")] },
  { name: "dim_channel", kind: "Dimension", grain: "One historical version of a channel", source: "Channel and monetization CDC", use: "Creator ownership and point-in-time monetization attribution.", fields: [f("channel_sk", "BIGINT PK", "Version-specific channel key."), f("channel_id", "STRING BK", "Stable product channel ID."), f("creator_id", "STRING", "Privacy-controlled creator reference."), f("monetization_status", "STRING", "Status valid for this version."), f("subscriber_tier", "STRING", "Analysis tier, not an exact live count."), f("effective_from", "TIMESTAMP", "Type-2 version start."), f("effective_to", "TIMESTAMP", "Type-2 version end.")] },
  { name: "dim_viewer", kind: "Dimension", grain: "One privacy-scoped viewer version", source: "Consent-aware identity service", use: "Declares whether a metric counts accounts, profiles, or anonymous viewers.", fields: [f("viewer_sk", "BIGINT PK", "Warehouse-scoped identity key."), f("identity_type", "STRING", "Account, profile, or anonymous."), f("consent_scope", "STRING", "Permitted analytics uses."), f("home_geo_sk", "BIGINT FK", "Policy-approved coarse geography."), f("effective_from", "TIMESTAMP", "Version validity start."), f("effective_to", "TIMESTAMP", "Version validity end.")] },
  { name: "dim_device", kind: "Dimension", grain: "One device/application capability combination", source: "Player telemetry reference data", use: "Device, OS, app-version, and playback-regression analysis.", fields: [f("device_sk", "BIGINT PK", "Conformed device key."), f("device_family", "STRING", "Mobile, TV, web, console."), f("os_family", "STRING", "Operating-system group."), f("app_version", "STRING", "Client build version."), f("capability_tier", "STRING", "Codec and playback capability group.")] },
  { name: "dim_geo", kind: "Dimension", grain: "One policy-approved geography member", source: "Governed geography reference", use: "Regional trends, QoE, monetization, timezone, and regulatory cuts.", fields: [f("geo_sk", "BIGINT PK", "Conformed geography key."), f("country_code", "CHAR(2)", "Country bucket."), f("region", "STRING", "State or business region."), f("timezone", "STRING", "Local reporting timezone."), f("regulatory_region", "STRING", "Applicable policy region.")] },
  { name: "dim_surface", kind: "Dimension", grain: "One product placement surface", source: "Product UI registry", use: "Home, search, subscriptions, Shorts feed, and notification attribution.", fields: [f("surface_sk", "INT PK", "Conformed surface key."), f("surface_name", "STRING", "Product surface name."), f("placement_type", "STRING", "Shelf, feed, result, or notification."), f("product_area", "STRING", "Owning product area.")] },

  { name: "fact_playback_event", kind: "Fact", grain: "One accepted playback event", source: "Silver playback events", use: "Sequence debugging, replay, and session reconstruction.", fields: [f("event_id", "STRING PK", "Stable deduplication ID."), f("playback_attempt_id", "STRING FK", "Attempt receiving the event."), f("video_sk", "BIGINT FK", "Point-in-time video version."), f("viewer_sk", "BIGINT FK", "Permitted viewer identity."), f("event_type", "STRING", "Start, heartbeat, pause, seek, or end."), f("played_delta_ms", "BIGINT", "Validated active-play delta."), f("event_time", "TIMESTAMP", "Time playback happened.")] },
  { name: "fact_watch_session", kind: "Fact", grain: "One playback attempt and session version", source: "Flink sessionizer + certified batch", use: "Trusted watch time, completion, coverage, and session QoE.", fields: [f("session_sk", "STRING PK", "Playback attempt plus version."), f("playback_attempt_id", "STRING BK", "Stable logical session key."), f("video_sk", "BIGINT FK", "Historical video version."), f("viewer_sk", "BIGINT FK", "Scoped viewer key."), f("device_sk", "BIGINT FK", "Playback device context."), f("watch_seconds", "BIGINT", "Validated played duration."), f("completion_ratio", "DECIMAL", "Unique coverage divided by duration."), f("is_counted_view", "BOOL", "Qualified-view policy result.")] },
  { name: "fact_impression", kind: "Fact", grain: "One eligible video impression", source: "Silver impression events", use: "Recommendation exposure, surface funnels, and impression-to-watch attribution.", fields: [f("impression_id", "STRING PK", "Stable exposure ID."), f("viewer_sk", "BIGINT FK", "Viewer receiving the item."), f("video_sk", "BIGINT FK", "Video shown."), f("surface_sk", "INT FK", "Where it was shown."), f("rank_position", "INT", "Displayed position."), f("experiment_sk", "BIGINT FK", "Assignment context."), f("event_time", "TIMESTAMP", "Eligible render time.")] },
  { name: "fact_engagement_event", kind: "Fact", grain: "One accepted engagement action", source: "Silver engagement events", use: "Like, comment, share, save, subscribe, and undo analysis.", fields: [f("engagement_id", "STRING PK", "Stable action ID."), f("viewer_sk", "BIGINT FK", "Scoped actor."), f("video_sk", "BIGINT FK", "Target video."), f("channel_sk", "BIGINT FK", "Target channel."), f("action_type", "STRING", "Like, share, comment, save, subscribe."), f("is_undo", "BOOL", "Reversal indicator."), f("event_time", "TIMESTAMP", "Action time.")] },
  { name: "fact_search_event", kind: "Fact", grain: "One search query or result interaction", source: "Silver search events", use: "Query funnels, result quality, and search-to-watch attribution.", fields: [f("search_event_id", "STRING PK", "Stable search event ID."), f("search_session_id", "STRING", "Groups a query journey."), f("viewer_sk", "BIGINT FK", "Scoped viewer."), f("query_token", "STRING", "Governed query representation."), f("result_video_sk", "BIGINT FK", "Shown or clicked video."), f("action_type", "STRING", "Query, impression, click, or play."), f("event_time", "TIMESTAMP", "Interaction time.")] },
  { name: "fact_ad_event", kind: "Fact", grain: "One ad lifecycle event", source: "Certified ad event stream", use: "Impression, click, completion, attribution, billing, and creator revenue.", fields: [f("ad_event_id", "STRING PK", "Auditable financial event ID."), f("ad_request_id", "STRING", "Orders one ad lifecycle."), f("ad_sk", "BIGINT FK", "Creative and campaign context."), f("video_sk", "BIGINT FK", "Monetized content context."), f("viewer_sk", "BIGINT FK", "Permitted audience key."), f("event_type", "STRING", "Request, impression, quartile, click."), f("attributed_amount", "DECIMAL", "Versioned monetary amount.")] },
  { name: "fact_ad_impression", kind: "Fact", grain: "One eligible ad impression", source: "Certified ad lifecycle attribution", use: "Auditable impression revenue, click outcome, advertiser billing, and creator payout input.", fields: [f("ad_impression_id", "STRING PK", "Stable financial impression key."), f("ad_request_id", "STRING", "Originating ad request."), f("ad_sk", "BIGINT FK", "Point-in-time ad version."), f("video_sk", "BIGINT FK", "Monetized video."), f("date_sk", "INT FK", "Financial reporting date."), f("is_clicked", "BOOL", "Attributed click outcome."), f("revenue_amount", "DECIMAL", "Certified impression revenue.")] },
  { name: "fact_qoe_event", kind: "Fact", grain: "One playback-quality incident or sample", source: "Silver player + CDN telemetry", use: "Startup, rebuffer, error, CDN, ISP, device, and release diagnostics.", fields: [f("qoe_event_id", "STRING PK", "Stable quality-event ID."), f("playback_attempt_id", "STRING FK", "Related watch attempt."), f("device_sk", "BIGINT FK", "Client context."), f("geo_sk", "BIGINT FK", "Policy-approved region."), f("metric_type", "STRING", "Startup, buffer, bitrate, or error."), f("duration_ms", "BIGINT", "Incident duration."), f("error_code", "STRING", "Governed error taxonomy.")] },

  { name: "fact_video_metric_daily", kind: "Fact", grain: "Video × date × metric version", source: "Certified Gold aggregation", use: "Official qualified views, watch time, uniques, engagement, and revenue.", fields: [f("video_sk", "BIGINT PK/FK", "Historical video version."), f("date_sk", "INT PK/FK", "Reporting date."), f("metric_version", "INT PK", "Definition version."), f("qualified_views", "BIGINT", "Certified view count."), f("watch_seconds", "BIGINT", "Certified watch time."), f("unique_viewers", "BIGINT", "Declared identity counting unit."), f("revenue_amount", "DECIMAL", "Certified attributed revenue.")] },
  { name: "fact_channel_metric_daily", kind: "Fact", grain: "Channel × date × metric version", source: "Video facts + subscription events", use: "Creator Studio channel performance and monetization trends.", fields: [f("channel_sk", "BIGINT PK/FK", "Historical channel version."), f("date_sk", "INT PK/FK", "Reporting date."), f("metric_version", "INT PK", "Definition version."), f("views", "BIGINT", "Certified channel views."), f("watch_seconds", "BIGINT", "Certified channel watch time."), f("subscriber_delta", "BIGINT", "Net subscriptions."), f("revenue_amount", "DECIMAL", "Channel revenue.")] },
  { name: "fact_live_concurrency", kind: "Fact", grain: "Live stream × region × minute", source: "Streaming joins/leaves/heartbeats", use: "Concurrent viewers, reconnects, live health, and peak capacity.", fields: [f("video_sk", "BIGINT PK/FK", "Live stream video."), f("geo_sk", "BIGINT PK/FK", "Regional bucket."), f("minute_time", "TIMESTAMP PK", "Concurrency minute."), f("concurrent_viewers", "BIGINT", "Estimated active viewers."), f("joins", "BIGINT", "New live joins."), f("leaves", "BIGINT", "Observed exits."), f("reconnects", "BIGINT", "Recovered connections.")] },
  { name: "fact_experiment_assignment", kind: "Fact", grain: "One subject × experiment assignment", source: "Experiment assignment service", use: "Stable variant assignment, eligibility, exposure, and outcome attribution.", fields: [f("assignment_id", "STRING PK", "Stable assignment ID."), f("experiment_sk", "BIGINT FK", "Experiment definition."), f("subject_key", "STRING", "Scoped assignment unit."), f("variant", "STRING", "Assigned treatment."), f("assigned_at", "TIMESTAMP", "Assignment time."), f("eligibility_version", "INT", "Eligibility-rule version.")] },
  { name: "fact_shorts_session", kind: "Fact", grain: "One Shorts feed viewing attempt", source: "Shorts swipe + loop sessionization", use: "Swipes, loops, replays, viewed ratio, and feed progression.", fields: [f("shorts_session_id", "STRING PK", "One feed viewing attempt."), f("viewer_sk", "BIGINT FK", "Scoped viewer."), f("video_sk", "BIGINT FK", "Short viewed."), f("surface_sk", "INT FK", "Shorts placement."), f("loop_count", "INT", "Completed playback loops."), f("swipe_away_ms", "BIGINT", "Time before next swipe."), f("viewed_ratio", "DECIMAL", "Coverage relative to short duration.")] },
  { name: "fact_audience_retention", kind: "Fact", grain: "Video × segment bucket × metric version", source: "Certified watch-session coverage", use: "Long-form audience-retention curves without exploding raw heartbeats.", fields: [f("video_sk", "BIGINT PK/FK", "Long-form video."), f("segment_index", "INT PK", "Normalized timeline bucket."), f("metric_version", "INT PK", "Curve definition version."), f("viewers_entered", "BIGINT", "Viewers reaching the segment."), f("viewers_exited", "BIGINT", "Viewers leaving near the segment."), f("retention_ratio", "DECIMAL", "Audience remaining proportion.")] },

  { name: "dim_experiment", kind: "Dimension", grain: "One versioned experiment definition", source: "Experiment registry", use: "Point-in-time hypothesis, owner, variants, and eligibility definition.", fields: [f("experiment_sk", "BIGINT PK", "Version-specific key."), f("experiment_id", "STRING BK", "Stable experiment ID."), f("owner", "STRING", "Accountable team."), f("eligibility_version", "INT", "Assignment-rule version."), f("effective_from", "TIMESTAMP", "Definition start."), f("effective_to", "TIMESTAMP", "Definition end.")] },
  { name: "dim_ad", kind: "Dimension", grain: "One ad creative/campaign version", source: "Ads master-data CDC", use: "Campaign, advertiser, creative, objective, and policy context.", fields: [f("ad_sk", "BIGINT PK", "Version-specific ad key."), f("ad_id", "STRING BK", "Stable ad ID."), f("campaign_id", "STRING", "Campaign grouping."), f("advertiser_id", "STRING", "Governed advertiser key."), f("creative_type", "STRING", "Video, overlay, or companion."), f("effective_from", "TIMESTAMP", "Version start.")] },
  { name: "dim_content_format", kind: "Dimension", grain: "One governed content-format definition", source: "Content taxonomy registry", use: "Shared VOD, Shorts, and Live classification without erasing format-specific semantics.", fields: [f("format_sk", "INT PK", "Format key."), f("format_name", "STRING", "VOD, Shorts, or Live."), f("supports_loops", "BOOL", "Loop behavior applies."), f("supports_concurrency", "BOOL", "Live concurrency applies."), f("metric_policy_version", "INT", "Format metric policy.")] },
  { name: "bridge_identity_link", kind: "Bridge", grain: "One permitted identity link and validity interval", source: "Consent-aware identity graph", use: "Versioned, reversible stitching across account, anonymous, device, profile, and session identities.", fields: [f("left_identity", "STRING PK", "First scoped identifier."), f("right_identity", "STRING PK", "Linked scoped identifier."), f("link_type", "STRING", "Account-device, anon-account, profile-session."), f("consent_scope", "STRING", "Allowed use of the link."), f("effective_from", "TIMESTAMP", "Link validity start."), f("effective_to", "TIMESTAMP", "Link validity end.")] },
  { name: "metric_registry", kind: "Registry", grain: "One metric definition version", source: "Governed semantic registry", use: "Keeps formulas, grain, filters, ownership, late-data rules, and certification out of dashboards.", fields: [f("metric_name", "STRING PK", "Stable metric name."), f("version", "INT PK", "Definition version."), f("grain", "STRING", "Declared dimensional grain."), f("semantic_definition", "STRING", "Owned calculation expression."), f("late_data_policy", "STRING", "Correction behavior."), f("owner", "STRING", "Accountable domain team."), f("certification", "STRING", "Provisional or certified status.")] },
] as const;

const positions = [
  [30, 30], [310, 30], [590, 30], [870, 30], [1150, 30], [1430, 30], [1710, 30], [1990, 30],
  [30, 330], [310, 330], [590, 330], [870, 330], [1150, 330], [1430, 330], [1710, 330], [1990, 330],
  [30, 650], [310, 650], [590, 650], [870, 650], [1150, 650], [1430, 650],
  [310, 970], [670, 970], [1030, 970], [1390, 970], [1750, 970],
] as const;

const relationships = [
  ["dim_video", "fact_playback_event", "video_sk"], ["dim_viewer", "fact_playback_event", "viewer_sk"],
  ["dim_video", "fact_watch_session", "video_sk"], ["dim_viewer", "fact_watch_session", "viewer_sk"], ["dim_device", "fact_watch_session", "device_sk"],
  ["dim_video", "fact_impression", "video_sk"], ["dim_viewer", "fact_impression", "viewer_sk"], ["dim_surface", "fact_impression", "surface_sk"], ["dim_experiment", "fact_impression", "experiment_sk"],
  ["dim_video", "fact_engagement_event", "video_sk"], ["dim_channel", "fact_engagement_event", "channel_sk"], ["dim_viewer", "fact_engagement_event", "viewer_sk"],
  ["dim_viewer", "fact_search_event", "viewer_sk"], ["dim_video", "fact_search_event", "result_video_sk"],
  ["dim_ad", "fact_ad_event", "ad_sk"], ["dim_video", "fact_ad_event", "video_sk"], ["dim_viewer", "fact_ad_event", "viewer_sk"],
  ["dim_ad", "fact_ad_impression", "ad_sk"], ["dim_video", "fact_ad_impression", "video_sk"], ["dim_date", "fact_ad_impression", "date_sk"],
  ["dim_device", "fact_qoe_event", "device_sk"], ["dim_geo", "fact_qoe_event", "geo_sk"],
  ["dim_video", "fact_video_metric_daily", "video_sk"], ["dim_date", "fact_video_metric_daily", "date_sk"],
  ["dim_channel", "fact_channel_metric_daily", "channel_sk"], ["dim_date", "fact_channel_metric_daily", "date_sk"],
  ["dim_video", "fact_live_concurrency", "video_sk"], ["dim_geo", "fact_live_concurrency", "geo_sk"],
  ["dim_experiment", "fact_experiment_assignment", "experiment_sk"],
  ["dim_video", "fact_shorts_session", "video_sk"], ["dim_viewer", "fact_shorts_session", "viewer_sk"], ["dim_surface", "fact_shorts_session", "surface_sk"],
  ["dim_video", "fact_audience_retention", "video_sk"], ["dim_content_format", "dim_video", "format_sk"],
] as const;

const byName = Object.fromEntries(tables.map((table, index) => [table.name, { table, x: positions[index][0], y: positions[index][1] }])) as Record<string, { table: ModelTable; x: number; y: number }>;

function kindStyle(kind: TableKind) {
  if (kind === "Fact") return { background: "#edf4fa", border: "#9fb3c6" };
  if (kind === "Bridge") return { background: "#f1f5f9", border: "#9aa9b8" };
  if (kind === "Registry") return { background: "#e8f0f7", border: "#8fa6bb" };
  return { background: "#ffffff", border: "#c8d5e1" };
}

function ErDiagram() {
  const defaultZoom = 0.8;
  const minZoom = 0.62;
  const maxZoom = 1.25;
  const shellRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, x: 0, y: 0, left: 0, top: 0 });
  const [zoom, setZoom] = useState(defaultZoom);
  const [activeName, setActiveName] = useState("fact_watch_session");
  const [activeField, setActiveField] = useState<Field | null>(null);
  const active = byName[activeName].table;

  const joins = useMemo(() => relationships.filter(([from, to]) => from === activeName || to === activeName), [activeName]);
  const reset = useCallback(() => {
    setZoom(defaultZoom);
    if (shellRef.current) {
      shellRef.current.scrollLeft = 0;
      shellRef.current.scrollTop = 0;
    }
  }, []);

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div><strong className="text-sm">YouTube analytics ER canvas</strong><p className="mt-1 text-xs text-[var(--text-faint)]">Drag to pan. Select a table to inspect its grain, fields, and joins.</p></div>
          <div className="flex flex-wrap items-center gap-2"><span className="flex h-11 min-w-12 items-center justify-center rounded-md bg-[var(--bg-muted)] px-2 text-xs font-semibold">{Math.round(zoom * 100)}%</span><input aria-label="ER diagram zoom" type="range" min={minZoom} max={maxZoom} step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="h-11 w-28 accent-slate-600" /><button aria-label="Zoom out" type="button" onClick={() => setZoom((value) => Math.max(minZoom, value - 0.08))} className="h-11 min-w-11 rounded-md border border-[var(--border)] px-3 text-lg">−</button><button type="button" onClick={reset} className="h-11 rounded-md border border-[var(--border)] px-3 text-xs font-semibold">Readable view</button><button aria-label="Zoom in" type="button" onClick={() => setZoom((value) => Math.min(maxZoom, value + 0.08))} className="h-11 min-w-11 rounded-md border border-[var(--border)] px-3 text-lg">+</button></div>
        </div>
        <div
          ref={shellRef}
          data-testid="youtube-er-canvas"
          className="h-[690px] touch-none cursor-grab select-none overflow-auto bg-[#f4f7fb] active:cursor-grabbing"
          onPointerDown={(event) => {
            const shell = shellRef.current;
            if (!shell || (event.target as HTMLElement).closest("[data-nodrag]")) return;
            dragRef.current = { active: true, x: event.clientX, y: event.clientY, left: shell.scrollLeft, top: shell.scrollTop };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const shell = shellRef.current;
            const drag = dragRef.current;
            if (!shell || !drag.active) return;
            shell.scrollLeft = drag.left - (event.clientX - drag.x);
            shell.scrollTop = drag.top - (event.clientY - drag.y);
          }}
          onPointerUp={() => { dragRef.current.active = false; }}
          onPointerCancel={() => { dragRef.current.active = false; }}
        >
          <div style={{ width: 2280 * zoom, height: 1260 * zoom }}>
            <div className="relative origin-top-left" style={{ width: 2280, height: 1260, transform: `scale(${zoom})` }}>
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 2280 1260" aria-hidden>
                <defs><marker id="yt-model-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="#91a4b7" strokeWidth="1.5" /></marker></defs>
                {relationships.map(([from, to], index) => {
                  const a = byName[from]; const b = byName[to]; const related = from === activeName || to === activeName;
                  return <line key={`${from}-${to}-${index}`} x1={a.x + 125} y1={a.y + 105} x2={b.x + 125} y2={b.y + 105} stroke={related ? "#526b82" : "#c3d0dc"} strokeWidth={related ? 2.4 : 1.1} strokeDasharray="6 6" opacity={related ? 0.95 : 0.45} markerEnd="url(#yt-model-arrow)" />;
                })}
              </svg>
              {tables.map((table, index) => {
                const position = positions[index]; const selected = table.name === activeName; const style = kindStyle(table.kind);
                return (
                  <button key={table.name} data-nodrag data-model-table type="button" aria-label={`Inspect ${table.name}, ${table.grain}`} aria-pressed={selected} onClick={() => { setActiveName(table.name); setActiveField(null); }} onMouseEnter={() => { setActiveName(table.name); setActiveField(null); }} onFocus={() => { setActiveName(table.name); setActiveField(null); }} className="absolute z-10 h-[220px] w-[250px] overflow-hidden rounded-xl border-2 text-left shadow-sm outline-none transition hover:z-30 hover:shadow-lg focus-visible:z-30 focus-visible:ring-4 focus-visible:ring-[#42586c]/30" style={{ left: position[0], top: position[1], background: style.background, borderColor: selected ? "#42586c" : style.border }}>
                    <div className="border-b border-[#cfdae4] px-3 py-1.5"><div className="flex items-center justify-between gap-2"><code className="min-w-0 truncate text-[19px] font-bold leading-5 tracking-[-0.03em] text-[#17202b]">{table.name}</code><span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#526171]">{table.kind}</span></div><p className="mt-0.5 truncate text-[12px] font-medium leading-[14px] text-[#526171]">{table.grain}</p></div>
                    <div className="p-2">{table.fields.slice(0, 6).map((field) => <div key={field.name} className="flex min-h-7 w-full items-center justify-between gap-2 rounded px-1.5 text-left leading-4"><code className="min-w-0 truncate text-[14px] font-semibold text-[#263442]">{field.name}</code><span className="shrink-0 text-[10px] text-[#59697a]">{field.type}</span></div>)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <aside
        data-testid="youtube-model-inspector"
        className="self-start rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 xl:sticky xl:top-[140px] xl:max-h-[calc(100dvh-156px)] xl:overflow-y-auto xl:overscroll-contain"
      >
        <div className="flex items-center justify-between gap-2"><span className="rounded-md bg-[var(--bg-muted)] px-2 py-1 text-[10px] font-bold uppercase tracking-wider">{active.kind}</span><span className="text-[11px] text-[var(--text-faint)]">Selected entity</span></div>
        <code className="mt-3 block text-base font-bold">{active.name}</code>
        {activeField ? <div className="mt-3 rounded-lg border border-[#a9bacb] bg-[var(--bg-muted)] p-3"><div className="flex justify-between gap-2"><code className="text-xs font-bold">{activeField.name}</code><span className="text-[10px] text-[var(--text-faint)]">{activeField.type}</span></div><p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{activeField.meaning}</p></div> : null}
        <div className="mt-3 space-y-3 text-xs leading-5"><div><strong className="block text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Grain</strong><p className="mt-1 text-[var(--text-muted)]">{active.grain}</p></div><div><strong className="block text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Built from</strong><p className="mt-1 text-[var(--text-muted)]">{active.source}</p></div><div><strong className="block text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Used for</strong><p className="mt-1 text-[var(--text-muted)]">{active.use}</p></div></div>
        <div className="mt-4"><strong className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Joins</strong><div className="mt-2 space-y-1.5">{joins.length ? joins.map(([from, to, key]) => <div key={`${from}-${to}-${key}`} className="rounded-md bg-[var(--bg-muted)] px-2 py-1.5 text-[10px]"><code>{from === activeName ? to : from}</code><span className="ml-1 text-[var(--text-faint)]">via {key}</span></div>) : <p className="text-xs text-[var(--text-faint)]">Governed metadata table; no direct star join shown.</p>}</div></div>
      </aside>
    </div>
  );
}

const overviewGroups = [
  { label: "Business context", relationship: "video_sk · viewer_sk · device_sk", names: ["dim_video", "dim_viewer", "dim_channel", "dim_device"] },
  { label: "Behavior facts", relationship: "sessionize · attribute · qualify", names: ["fact_watch_session", "fact_impression", "fact_engagement_event"] },
  { label: "Certified products", relationship: "metric_version", names: ["fact_video_metric_daily", "fact_channel_metric_daily"] },
  { label: "Semantic control", relationship: "", names: ["metric_registry"] },
] as const;

const tableKinds: readonly TableKind[] = ["Dimension", "Fact", "Bridge", "Registry"];

function joinsFor(name: string) {
  return relationships.filter(([from, to]) => from === name || to === name);
}

function OverviewInspector({ activeName }: { activeName: string }) {
  const table = byName[activeName].table;
  const joins = joinsFor(activeName);
  const keys = table.fields.filter((field) => /(?:PK|FK|BK)/.test(field.type));
  const attributes = table.fields.filter((field) => !/(?:PK|FK|BK)/.test(field.type));

  return (
    <aside data-testid="youtube-model-inspector" aria-label={`Selected entity: ${table.name}`} className="self-start rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 2xl:sticky 2xl:top-[140px] 2xl:max-h-[calc(100dvh-156px)] 2xl:overflow-y-auto">
      <div className="flex items-center justify-between gap-2"><span className="rounded-md bg-[var(--bg-muted)] px-2 py-1 text-[10px] font-bold uppercase tracking-wider">{table.kind}</span><span className="text-[11px] text-[var(--text-faint)]">Selected entity</span></div>
      <code className="mt-3 block break-all text-lg font-bold">{table.name}</code>
      <div className="mt-3 space-y-3 text-xs leading-5"><div><strong className="block text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Grain</strong><p className="mt-1 text-[var(--text-muted)]">{table.grain}</p></div><div><strong className="block text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Built from</strong><p className="mt-1 text-[var(--text-muted)]">{table.source}</p></div><div><strong className="block text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Used for</strong><p className="mt-1 text-[var(--text-muted)]">{table.use}</p></div></div>
      <div className="mt-4"><strong className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Keys</strong><div className="mt-2 flex flex-wrap gap-1.5">{keys.length ? keys.map((field) => <code key={field.name} className="rounded-md bg-[var(--bg-muted)] px-2 py-1.5 text-[11px]">{field.name}</code>) : <span className="text-xs text-[var(--text-faint)]">No declared key</span>}</div></div>
      <div className="mt-4"><strong className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Measures + attributes</strong><div className="mt-2 flex flex-wrap gap-1.5">{attributes.map((field) => <code key={field.name} className="rounded-md bg-[var(--bg-muted)] px-2 py-1.5 text-[11px]">{field.name}</code>)}</div></div>
      <div className="mt-4"><strong className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Relationships</strong><div className="mt-2 space-y-1.5">{joins.length ? joins.map(([from, to, key]) => <div key={`${from}-${to}-${key}`} className="rounded-md bg-[var(--bg-muted)] px-2 py-2 text-[11px]"><code>{from === activeName ? to : from}</code><span className="ml-1 text-[var(--text-faint)]">via {key}</span></div>) : <p className="text-xs text-[var(--text-faint)]">No direct star join shown.</p>}</div></div>
    </aside>
  );
}

function ModelOverview() {
  const [activeName, setActiveName] = useState("fact_watch_session");

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_330px] 2xl:items-start">
      <div data-testid="youtube-model-overview" className="rounded-xl border border-[var(--border)] bg-[#f4f7fb] p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
          {overviewGroups.map((group, groupIndex) => (
            <div className="contents" key={group.label}>
              <section aria-label={group.label} className="rounded-xl border border-[#c8d5e1] bg-white p-3">
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#59697a]">{group.label}</p>
                <div className="mt-3 space-y-2">
                  {group.names.map((name) => {
                    const table = byName[name].table;
                    const selected = activeName === name;
                    return (
                      <button key={name} type="button" onClick={() => setActiveName(name)} aria-pressed={selected} className="min-h-20 w-full rounded-lg border bg-[#f8fafc] p-3 text-left outline-none transition hover:border-[#42586c] focus-visible:ring-2 focus-visible:ring-[#42586c]" style={{ borderColor: selected ? "#42586c" : "#d6e1eb", boxShadow: selected ? "0 0 0 1px #42586c" : undefined }}>
                        <span className="block"><code className="block break-words text-sm font-bold text-[#17202b]">{table.name}</code><span className="mt-1 inline-block text-[10px] font-bold uppercase text-[#59697a]">{table.kind}</span></span>
                        <span className="mt-2 block text-xs leading-5 text-[#445464]">{table.grain}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
              {groupIndex < overviewGroups.length - 1 ? <div className="flex min-h-14 items-center justify-center gap-2 px-1 text-center text-[11px] font-semibold text-[#445464] lg:w-16 lg:flex-col" aria-label={`Relationship: ${group.relationship}`}><span aria-hidden className="text-base lg:hidden">↓</span><span>{group.relationship}</span><span aria-hidden className="hidden text-base lg:inline">→</span></div> : null}
            </div>
          ))}
        </div>
      </div>
      <OverviewInspector activeName={activeName} />
    </div>
  );
}

function SemanticModelOutline() {
  return (
    <section aria-labelledby="semantic-model-title" data-testid="youtube-semantic-model" className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <h3 id="semantic-model-title" className="text-base font-bold">Table and relationship outline</h3>
      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Text alternative to the canvas. Open a group to read every table, field definition, grain, and relationship.</p>
      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        {tableKinds.map((kind) => {
          const kindTables = tables.filter((table) => table.kind === kind);
          return (
            <details key={kind} className="rounded-lg border border-[var(--border)] bg-[var(--bg-muted)]">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#42586c]"><span>{kind}s</span><span className="text-xs font-medium text-[var(--text-faint)]">{kindTables.length} tables <span aria-hidden>＋</span></span></summary>
              <div className="space-y-3 border-t border-[var(--border)] p-3">
                {kindTables.map((table) => {
                  const joins = joinsFor(table.name);
                  return (
                    <article key={table.name} className="rounded-lg border border-[var(--border)] bg-white p-3">
                      <h4><code className="break-all text-sm font-bold">{table.name}</code></h4>
                      <dl className="mt-2 grid gap-2 text-xs leading-5"><div><dt className="font-bold text-[#59697a]">Grain</dt><dd>{table.grain}</dd></div><div><dt className="font-bold text-[#59697a]">Relationships</dt><dd>{joins.length ? joins.map(([from, to, key]) => `${from === table.name ? to : from} via ${key}`).join("; ") : "No direct star join shown."}</dd></div></dl>
                      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[420px] border-collapse text-left text-xs"><caption className="sr-only">Fields in {table.name}</caption><thead><tr className="border-b border-[#c8d5e1]"><th className="py-2 pr-3">Field</th><th className="py-2 pr-3">Type</th><th className="py-2">Meaning</th></tr></thead><tbody>{table.fields.map((field) => <tr key={field.name} className="border-b border-[#e3eaf0] last:border-0"><th scope="row" className="py-2 pr-3 font-mono font-semibold">{field.name}</th><td className="py-2 pr-3 text-[#59697a]">{field.type}</td><td className="py-2 text-[#445464]">{field.meaning}</td></tr>)}</tbody></table></div>
                    </article>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function ReadableErDiagram() {
  const [mode, setMode] = useState<"overview" | "detail">("overview");

  return (
    <div className="mt-5">
      <div className="mb-4 flex flex-col justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 sm:flex-row sm:items-center">
        <div><strong className="text-sm">Choose the useful level of detail</strong><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Overview explains the interview story. Full model exposes every entity and join.</p></div>
        <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-1" role="group" aria-label="ER diagram display mode">
          <button type="button" onClick={() => setMode("overview")} aria-pressed={mode === "overview"} className="min-h-11 flex-1 rounded-md px-4 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#42586c] sm:flex-none" style={{ background: mode === "overview" ? "white" : "transparent", color: mode === "overview" ? "#17202b" : "#59697a" }}>Overview</button>
          <button type="button" onClick={() => setMode("detail")} aria-pressed={mode === "detail"} className="min-h-11 flex-1 rounded-md px-4 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#42586c] sm:flex-none" style={{ background: mode === "detail" ? "white" : "transparent", color: mode === "detail" ? "#17202b" : "#59697a" }}>Full model</button>
        </div>
      </div>
      {mode === "overview" ? <ModelOverview /> : <ErDiagram />}
      <SemanticModelOutline />
    </div>
  );
}

export default function DataModelingTab() {
  return (
    <YouTubeFrame activeTab="data-modeling" sections={MODELING_SECTIONS} previous={{ id: "real-time-streaming", label: "Real-Time Streaming" }} next={{ id: "batch-lakehouse", label: "Batch + Lakehouse" }}>
      <Section id="model-erd" number="01" title="ER Diagram"><ReadableErDiagram /></Section>

      <Section id="model-answer" number="02" title="Interview Answer">
        <div className="mx-auto mt-5 w-full max-w-5xl rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] px-6 py-5 text-justify text-sm font-medium leading-7 md:px-8">I start by defining the grain of every fact so one row has an unambiguous meaning—for example, fact_watch_session is one playback attempt and version, while fact_video_metric_daily is one video, date, and metric version. I connect those facts to conformed date, video, channel, viewer, device, geography, surface, experiment, and ad dimensions. Video and channel use Type 2 history so facts retain the metadata and monetization state valid when the event occurred. Identity links remain consent-aware and reversible. Live, Shorts, and VOD share dimensions but use separate facts where concurrency, loops, swipes, and retention curves have different semantics. Finally, a versioned metric registry owns formulas such as qualified views instead of duplicating logic across dashboards.</div>
      </Section>
    </YouTubeFrame>
  );
}
