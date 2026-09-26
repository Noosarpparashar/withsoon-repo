"use client";

import { useId, useMemo, useState } from "react";
import { REQUIREMENT_SECTIONS } from "./data";
import { Section, Tooltip, YouTubeFrame } from "./shared";
import {
  BASELINE,
  calculateCapacity,
  compact,
  decimal,
  type Workload,
} from "./workloadModel";

const fixedAssumptions = [
  ["700 B", "Heartbeat", "Raw serialized playback heartbeat including event identity, playback position, timestamps, device context, and envelope metadata."],
  ["900 B", "Other event", "Planning size for impressions, engagement, search, ads, QoE, and backend events before compression."],
  ["5:1", "Lake compression", "Planning ratio for columnar Parquet. Replace it with measurements from representative payloads and schemas."],
  ["40%", "Headroom", "Capacity reserve for bursts, skew, deploys, forecast error, and partial failure."],
] as const;

const sloGroups = [
  {
    label: "Freshness",
    tone: "#b00020",
    items: [
      ["Live views", "10–60 sec", "Provisional public and live counters may be corrected after late data and traffic-quality decisions."],
      ["QoE alerts", "< 1 min", "Playback failures, startup latency, and rebuffering regressions must reach operational teams quickly."],
      ["Trending", "1–5 min", "Recent velocity and engagement need a small event-time buffer without losing product responsiveness."],
      ["Official metrics", "24–48 hr", "Daily certified views and watch time wait for completeness, full deduplication, abuse filtering, and reconciliation."],
    ],
  },
  {
    label: "Reliability",
    tone: "#1d4ed8",
    items: [
      ["Ingestion", "≥ 99.99%", "Accepted playback and ad events are durably acknowledged; regional buffering and replay protect against downstream outages."],
      ["Stream recovery", "< 15 min", "Checkpoint and restore tests should recover the P0 stream while staying inside the allowed freshness lag."],
      ["Batch window", "< 4 hr", "The daily certification pipeline must finish with enough time for validation, reconciliation, and retry before publication."],
    ],
  },
  {
    label: "Serving",
    tone: "#077149",
    items: [
      ["Creator P95", "< 2 sec", "Pre-aggregated channel and video slices should serve interactively from cache plus a real-time OLAP store."],
      ["Official counts", "Exactly once", "Each qualified event contributes once to a metric version using stable IDs, replay-safe writes, and certification."],
      ["Revenue", "T+1 / close", "Financial outputs require immutable evidence, controlled attribution rules, reconciliation, approval, and audit history."],
    ],
  },
] as const;

function SliderField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  detail,
  align = "center",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  detail: string;
  align?: "start" | "center" | "end";
  onChange: (value: number) => void;
}) {
  const inputId = useId();
  return (
    <div className="group relative block rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 transition hover:border-[#b00020]">
      <span className="flex items-center justify-between gap-3 text-xs font-semibold">
        <span className="flex items-center gap-1.5">
          <label htmlFor={inputId}>{label}</label>
          <button
            type="button"
            aria-label={`Explain ${label}`}
            className="group relative flex h-7 w-7 items-center justify-center rounded-md text-[10px] text-[#b00020] outline-none hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-[#b00020]"
          >
            <span aria-hidden>ⓘ</span>
            <Tooltip align={align}>{detail}</Tooltip>
          </button>
        </span>
        <strong className="rounded-md bg-red-500/10 px-2 py-1 text-[#b00020]">
          {decimal(value, 0)}{suffix}
        </strong>
      </span>
      <input
        id={inputId}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 h-1.5 w-full cursor-pointer accent-[#b00020]"
      />
    </div>
  );
}

function MathLine({
  step,
  label,
  formula,
  numbers,
  result,
  detail,
  tone,
  align = "center",
}: {
  step: string;
  label: string;
  formula: string;
  numbers: string;
  result: string;
  detail: string;
  tone: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <button
      type="button"
      className="group relative grid w-full cursor-pointer gap-2 border-b border-[var(--border)] px-3 py-4 text-left transition last:border-b-0 hover:bg-[var(--bg-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b00020] md:grid-cols-[38px_150px_1fr_auto] md:items-center"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black" style={{ color: tone, background: `${tone}18` }}>
        {step}
      </span>
      <span>
        <strong className="block text-sm">{label}</strong>
        <span className="mt-1 block text-[11px] text-[var(--text-faint)]">{formula}</span>
      </span>
      <code className="text-[13px] font-semibold leading-6 text-[var(--text-muted)]">{numbers}</code>
      <strong className="rounded-lg px-3 py-2 text-base md:min-w-28 md:text-right" style={{ color: tone, background: `${tone}12` }}>{result}</strong>
      <Tooltip align={align}>{detail}</Tooltip>
    </button>
  );
}

function FlowNode({
  title,
  value,
  note,
  detail,
  tone,
  align,
}: {
  title: string;
  value: string;
  note: string;
  detail: string;
  tone: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <button
      type="button"
      className="group relative min-h-[92px] cursor-pointer rounded-lg border bg-[var(--bg-card)] p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b00020]"
      style={{ borderColor: `${tone}45` }}
    >
      <span className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: tone }}>{title}<span aria-hidden>ⓘ</span></span>
      <strong className="mt-2 block text-xl">{value}</strong>
      <span className="mt-2 block text-xs font-medium leading-5 text-[var(--text-muted)]">{note}</span>
      <Tooltip align={align}>{detail}</Tooltip>
    </button>
  );
}

export default function RequirementsTab() {
  const [workload, setWorkload] = useState<Workload>(BASELINE);

  const result = useMemo(() => calculateCapacity(workload), [workload]);

  const update = (key: keyof Workload) => (value: number) =>
    setWorkload((current) => ({ ...current, [key]: value }));

  return (
    <YouTubeFrame
      activeTab="requirements"
      sections={REQUIREMENT_SECTIONS}
      previous={{ id: "start-here", label: "Start Here" }}
      next={{ id: "event-sources", label: "Event Sources" }}
    >
      <Section id="workload-model" number="01" title="Workload Model">
        <div className="mt-5 grid gap-3 xl:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#b00020]">Assumptions</p>
              <button type="button" onClick={() => setWorkload(BASELINE)} className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#b00020] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-red-600"><span className="text-base" aria-hidden>↺</span> Reset baseline</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <SliderField label="Daily viewers" value={workload.dauMillions} min={250} max={1500} step={50} suffix="M" detail={`${workload.dauMillions}M unique viewers are assumed active during one day. This daily audience is the multiplier for all per-viewer behavior.`} align="start" onChange={update("dauMillions")} />
              <SliderField label="Sessions / viewer / day" value={workload.sessionsPerViewer} min={1} max={10} step={1} suffix="" detail={`This means one daily active viewer starts ${workload.sessionsPerViewer} video playback sessions during the day on average. One session is one started viewing attempt, not ${workload.sessionsPerViewer} simultaneous videos. At ${workload.dauMillions}M viewers, this produces ${compact(workload.dauMillions * 1_000_000 * workload.sessionsPerViewer)} playback sessions per day.`} align="end" onChange={update("sessionsPerViewer")} />
              <SliderField label="Watched seconds / session" value={workload.watchSeconds} min={120} max={1200} step={60} suffix="s" detail={`A started session contributes ${workload.watchSeconds} watched seconds on average. Dividing this by the heartbeat interval estimates playback evidence volume.`} align="start" onChange={update("watchSeconds")} />
              <SliderField label="Heartbeat interval" value={workload.heartbeatSeconds} min={5} max={30} step={5} suffix="s" detail={`The client emits one progress event every ${workload.heartbeatSeconds} seconds while video plays. ${workload.watchSeconds}s ÷ ${workload.heartbeatSeconds}s produces ${decimal(result.heartbeatsPerSession, 0)} heartbeats per session.`} align="end" onChange={update("heartbeatSeconds")} />
              <SliderField label="Other events / viewer / day" value={workload.otherEvents} min={20} max={200} step={10} suffix="" detail={`${workload.otherEvents} events cover impressions, clicks, searches, engagement, ads, QoE, and backend activity per daily viewer, outside playback heartbeats.`} align="start" onChange={update("otherEvents")} />
              <SliderField label="Peak multiplier" value={workload.peakMultiplier} min={2} max={8} step={1} suffix="×" detail={`Peak traffic is modeled at ${workload.peakMultiplier}× the daily average to cover prime-time concentration, viral videos, retries, and regional skew.`} align="end" onChange={update("peakMultiplier")} />
            </div>
          </div>

          <div className="grid content-start gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {fixedAssumptions.map(([value, label, detail], index) => (
              <button key={label} type="button" className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-left hover:border-[#b00020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b00020]">
                <strong className="min-w-16 text-lg text-[#b00020]">{value}</strong>
                <span className="text-xs font-semibold">{label}</span>
                <span className="ml-auto text-[10px] text-[#b00020]" aria-hidden>ⓘ</span>
                <Tooltip align={index === 0 ? "end" : "center"}>{detail}</Tooltip>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/[.045] px-4 py-3 text-xs font-semibold">
          <span>{workload.dauMillions}M daily viewers</span><span className="text-[#b00020]">→</span>
          <span>{decimal(result.eventsPerViewer, 0)} events/viewer/day</span><span className="text-[#b00020]">→</span>
          <strong className="text-[#b00020]">{compact(result.dailyEvents)} events/day</strong>
        </div>
      </Section>

      <Section id="traffic-math" number="02" title="Traffic Math">
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          <div className="rounded-xl border border-blue-500/25 bg-[var(--bg-muted)] p-2">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#1d4ed8]">Event derivation</p>
            <MathLine step="01" label="Heartbeats / session" formula="watched seconds ÷ interval" numbers={`${workload.watchSeconds}s watched ÷ ${workload.heartbeatSeconds}s heartbeat`} result={`${decimal(result.heartbeatsPerSession, 0)} HB`} detail={`${workload.watchSeconds} seconds comes from Watched seconds/session in the Workload Model. ${workload.heartbeatSeconds} seconds comes from Heartbeat interval. ${workload.watchSeconds} ÷ ${workload.heartbeatSeconds} = ${decimal(result.heartbeatsPerSession, 0)} heartbeat events in one playback session.`} tone="#1d4ed8" align="start" />
            <MathLine step="02" label="Heartbeats / viewer" formula="sessions × heartbeats/session" numbers={`${workload.sessionsPerViewer} sessions × ${decimal(result.heartbeatsPerSession, 0)} HB`} result={`${decimal(result.heartbeatsPerViewer, 0)} HB/day`} detail={`${workload.sessionsPerViewer} sessions comes from Sessions/viewer/day. Each session produced ${decimal(result.heartbeatsPerSession, 0)} heartbeats in step 01, so one daily viewer produces ${decimal(result.heartbeatsPerViewer, 0)} playback heartbeats.`} tone="#1d4ed8" />
            <MathLine step="03" label="Events / viewer" formula="heartbeats + other events" numbers={`${decimal(result.heartbeatsPerViewer, 0)} HB + ${workload.otherEvents} other`} result={`${decimal(result.eventsPerViewer, 0)} events`} detail={`${decimal(result.heartbeatsPerViewer, 0)} is derived in step 02. ${workload.otherEvents} comes from the Workload Model and represents impressions, engagement, search, ads, QoE, and backend activity.`} tone="#6d28d9" />
            <MathLine step="04" label="Events / day" formula="DAU × events/viewer" numbers={`${workload.dauMillions}M viewers × ${decimal(result.eventsPerViewer, 0)} events`} result={compact(result.dailyEvents)} detail={`${workload.dauMillions}M is the Daily viewers assumption. Multiplying it by ${decimal(result.eventsPerViewer, 0)} events from step 03 produces ${compact(result.dailyEvents)} total events each day.`} tone="#b00020" align="end" />
          </div>

          <div className="rounded-xl border border-emerald-500/25 bg-[var(--bg-muted)] p-2">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#077149]">Rate + bytes</p>
            <MathLine step="05" label="Average rate" formula="daily events ÷ seconds/day" numbers={`${compact(result.dailyEvents)} ÷ 86,400 sec`} result={`${compact(result.averageEventsSecond)}/s`} detail={`${compact(result.dailyEvents)} comes from step 04. A day always contains 86,400 seconds, so the steady-state average is ${compact(result.averageEventsSecond)} events per second.`} tone="#0b6f87" align="start" />
            <MathLine step="06" label="Peak rate" formula="average × peak factor" numbers={`${compact(result.averageEventsSecond)}/s × ${workload.peakMultiplier}`} result={`${compact(result.peakEventsSecond)}/s`} detail={`${compact(result.averageEventsSecond)}/s comes from step 05. The ${workload.peakMultiplier}× multiplier comes from the Workload Model and covers prime time, viral traffic, retries, and regional skew.`} tone="#8a4b00" />
            <MathLine step="07" label="Weighted event" formula="traffic-weighted payload" numbers={`(${decimal(result.heartbeatsPerViewer, 0)} × 700 B + ${workload.otherEvents} × 900 B) ÷ ${decimal(result.eventsPerViewer, 0)}`} result={`${decimal(result.weightedBytes, 0)} B`} detail={`${decimal(result.heartbeatsPerViewer, 0)} heartbeat events use the 700-byte heartbeat assumption; ${workload.otherEvents} other events use the 900-byte assumption. Divide their combined bytes by ${decimal(result.eventsPerViewer, 0)} total events to get the blended event size.`} tone="#6d28d9" />
            <MathLine step="08" label="Ingress" formula="event rate × weighted bytes" numbers={`${compact(result.peakEventsSecond)}/s × ${decimal(result.weightedBytes, 0)} B`} result={`${decimal(result.peakIngressGBs)} GB/s`} detail={`Peak rate ${compact(result.peakEventsSecond)}/s comes from step 06 and ${decimal(result.weightedBytes, 0)} bytes comes from step 07. Their product is ${decimal(result.peakIngressGBs)} GB/s raw peak ingress; protocol, replication, and cross-region overhead are added during final provisioning.`} tone="#b00020" align="end" />
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">Event mix</p>
          {[
            ["Playback heartbeats", result.heartbeatsPerViewer, "#b00020"],
            ["Other event families", workload.otherEvents, "#1d4ed8"],
          ].map(([label, value, tone]) => {
            const count = Number(value);
            const percent = (count / result.eventsPerViewer) * 100;
            return (
              <div key={String(label)} className="mb-3 grid grid-cols-[130px_1fr_90px] items-center gap-3 last:mb-0 sm:grid-cols-[180px_1fr_110px]">
                <span className="text-xs font-semibold">{label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-[var(--border)]"><span className="block h-full rounded-full" style={{ width: `${percent}%`, background: String(tone) }} /></span>
                <strong className="text-right text-xs" style={{ color: String(tone) }}>{decimal(count, 0)} / viewer</strong>
              </div>
            );
          })}
        </div>
      </Section>

      <Section id="storage-math" number="03" title="Storage Math">
        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-amber-500/25 bg-[var(--bg-muted)] p-3">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#8a4b00]">Kafka · hot replay log</p>
            <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
              <FlowNode title="Average ingress" value={`${decimal(result.averageIngressGBs)} GB/s`} note={`${compact(result.averageEventsSecond)}/s × ${decimal(result.weightedBytes, 0)} B`} detail={`${compact(result.averageEventsSecond)} average events/s is from Traffic Math step 05. Multiplying by the ${decimal(result.weightedBytes, 0)}-byte blended event produces ${decimal(result.averageIngressGBs)} GB/s written logically into Kafka.`} tone="#8a4b00" align="start" />
              <span className="text-center text-xs text-[#8a4b00]">× 604,800 sec →<small className="mt-1 block text-[10px] text-[var(--text-faint)]">(7 × 24 × 60 × 60)</small></span>
              <FlowNode title="7-day logical" value={`${decimal(result.kafkaLogicalPB)} PB`} note={`${decimal(result.averageIngressGBs)} GB/s × 7 days`} detail={`Seven days equals 604,800 seconds. ${decimal(result.averageIngressGBs)} GB/s × 604,800 gives ${decimal(result.kafkaLogicalPB)} PB of logical retained events before replicas and broker compression.`} tone="#8a4b00" />
              <span className="hidden text-[#8a4b00] lg:block">× RF3 →</span>
              <FlowNode title="Physical replicas" value={`${decimal(result.kafkaPhysicalPB)} PB`} note={`${decimal(result.kafkaLogicalPB)} PB × 3 copies`} detail={`Kafka replication factor 3 stores the leader plus two replicas across failure zones. ${decimal(result.kafkaLogicalPB)} PB logical × 3 = ${decimal(result.kafkaPhysicalPB)} PB before broker compression, indexes, and disk reserve.`} tone="#8a4b00" align="end" />
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/25 bg-[var(--bg-muted)] p-3">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#077149]">Bronze · immutable object storage</p>
            <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
              <FlowNode title="Raw events/day" value={`${decimal(result.rawTBday, 0)} TB`} note={`${compact(result.dailyEvents)} events × ${decimal(result.weightedBytes, 0)} B`} detail={`${compact(result.dailyEvents)} daily events comes from Traffic Math step 04. At ${decimal(result.weightedBytes, 0)} bytes per event, the immutable raw payload is ${decimal(result.rawTBday, 0)} TB per day before columnar compression.`} tone="#077149" align="start" />
              <span className="hidden text-[#077149] lg:block">÷ 5 compression →</span>
              <FlowNode title="Compressed/day" value={`${decimal(result.bronzeTBday, 1)} TB`} note={`${decimal(result.rawTBday, 0)} TB ÷ 5:1 Parquet`} detail={`The 5:1 Parquet compression ratio is a Workload Model assumption. ${decimal(result.rawTBday, 0)} raw TB ÷ 5 produces ${decimal(result.bronzeTBday, 1)} TB of immutable Bronze data per day.`} tone="#077149" />
              <span className="hidden text-[#077149] lg:block">× retention →</span>
              <FlowNode title="Retained history" value={`${decimal(result.bronzeHotPB)} PB hot`} note={`30 days hot · ${decimal(result.bronzeYearPB)} PB/year`} detail={`Keeping ${decimal(result.bronzeTBday, 1)} TB/day hot for 30 days requires ${decimal(result.bronzeHotPB)} PB. A full year is ${decimal(result.bronzeYearPB)} PB before metadata, snapshots, deletes, or replica copies.`} tone="#077149" align="end" />
            </div>
          </div>

        </div>
      </Section>

      <Section id="resource-plan" number="04" title="Resource Plan">
        <div className="mt-5 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3">
          <div className="grid gap-2 lg:grid-cols-[120px_1fr_auto_1fr] lg:items-center">
            <strong className="rounded-lg bg-blue-500/10 px-3 py-3 text-xs text-[#1d4ed8]">INGEST</strong>
            <FlowNode title="Collector benchmark" value={`${result.collectors} instances`} note={`max(${result.collectorByEvents} by events, ${result.collectorByBytes} by bytes) × 1.4`} detail={`At ${compact(result.peakEventsSecond)} peak events/s, 25K safe events/s per collector requires ${result.collectorByEvents} instances. At ${decimal(result.peakIngressGBs)} GB/s, 25 MB/s per collector requires ${result.collectorByBytes}. Take the larger value and add 40% headroom: ${result.collectors}.`} tone="#1d4ed8" align="start" />
            <span className="hidden text-[#1d4ed8] lg:block">→</span>
            <FlowNode title="Heartbeat topic" value={`~${Math.ceil(result.heartbeatPartitions / 10) * 10} partitions`} note={`max(÷ 50K Kafka, ÷ 35K Flink) × 1.4`} detail={`Heartbeats peak at ${compact(result.heartbeatPeakSecond)}/s. Kafka event throughput requires ${Math.ceil(result.heartbeatPeakSecond / 50_000)} base partitions, while stateful Flink throughput requires ${Math.ceil(result.heartbeatPeakSecond / 35_000)} active consumers. Taking the larger constraint and adding 40% headroom yields ${result.heartbeatPartitions}, rounded to about ${Math.ceil(result.heartbeatPartitions / 10) * 10}. Byte throughput and failure spread are also checked.`} tone="#8a4b00" align="end" />
          </div>
          <div className="grid gap-2 lg:grid-cols-[120px_1fr_auto_1fr] lg:items-center">
            <strong className="rounded-lg bg-violet-500/10 px-3 py-3 text-xs text-[#6d28d9]">COMPUTE</strong>
            <FlowNode title="Flink sessionizer" value={`${result.flinkTasks} tasks`} note={`${compact(result.heartbeatPeakSecond)}/s ÷ 35K × 1.4 · ${result.taskManagers} TMs`} detail={`A stateful task is assumed safe at 35K heartbeats/s under timers and checkpoints. ${compact(result.heartbeatPeakSecond)}/s needs ${Math.ceil(result.heartbeatPeakSecond / 35_000)} base tasks and ${result.flinkTasks} with headroom. Four usable slots per TaskManager gives ${result.taskManagers} TaskManagers.`} tone="#6d28d9" align="start" />
            <span className="hidden text-[#6d28d9] lg:block">+</span>
            <FlowNode title="Certified batch" value={`${result.batchExecutors} executors`} note={`${decimal(result.bronzeTBday, 1)} TB ÷ 4 hr ÷ 40 MB/s × 1.4`} detail={`${decimal(result.bronzeTBday, 1)} TB of Bronze must finish in a 4-hour window. At a measured 40 MB/s per executor plus 40% reserve, throughput alone needs ${result.batchExecutors}; shuffle, skew, and retries may increase it.`} tone="#077149" align="end" />
          </div>
          <div className="grid gap-2 lg:grid-cols-[120px_1fr_auto_1fr] lg:items-center">
            <strong className="rounded-lg bg-cyan-500/10 px-3 py-3 text-xs text-[#0b6f87]">SERVE</strong>
            <FlowNode title="Creator traffic" value={`${compact(result.dashboardEdgeQps)} edge QPS`} note="20M creators × 8 opens ÷ 8 busy hours × 3 peak" detail={`The serving scenario assumes 20M daily active creators, eight dashboard requests each, concentrated in eight hours, with a 3× peak. This produces ${compact(result.dashboardEdgeQps)} edge QPS.`} tone="#0b6f87" align="start" />
            <span className="hidden text-[#0b6f87] lg:block">→ 80% cache →</span>
            <FlowNode title="OLAP origin" value={`~${compact(result.dashboardOriginQps)} QPS`} note="16.67K edge QPS × 20% cache misses" detail={`With an assumed 80% cache hit rate, 20% of ${compact(result.dashboardEdgeQps)} requests reach Pinot or Druid: about ${compact(result.dashboardOriginQps)} QPS. Size nodes only after testing real channel/day and video/day queries at P95 and P99.`} tone="#b00020" align="end" />
          </div>
        </div>
        <p className="mt-3 text-[10px] text-[var(--text-faint)]">Benchmark inputs are interview assumptions, not claims about YouTube’s private infrastructure.</p>
      </Section>

      <Section id="service-levels" number="05" title="SLOs">
        <div className="mt-5 grid gap-3 xl:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-xl border border-red-500/25 bg-[var(--bg-muted)] p-4">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#b00020]">Freshness ladder</p>
            {sloGroups[0].items.map(([label, value, detail], index) => (
              <button key={label} type="button" className="group relative mb-4 grid w-full cursor-pointer grid-cols-[110px_1fr_82px] items-center gap-3 text-left last:mb-0 sm:grid-cols-[140px_1fr_100px]">
                <span className="text-xs font-semibold">{label}</span>
                <span className="h-3 overflow-hidden rounded-full bg-[var(--border)]"><span className="block h-full rounded-full bg-[#b00020]" style={{ width: [10, 18, 32, 100][index] + "%", opacity: 0.65 + index * 0.1 }} /></span>
                <strong className="text-right text-xs text-[#b00020]">{value}</strong>
                <Tooltip align={index === 0 ? "start" : "center"}>{detail}</Tooltip>
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {sloGroups.slice(1).map((group) => (
              <div key={group.label} className="rounded-xl border bg-[var(--bg-muted)] p-3" style={{ borderColor: `${group.tone}40` }}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: group.tone }}>{group.label}</p>
                {group.items.map(([label, value, detail], index) => (
                  <button key={label} type="button" className="group relative flex w-full cursor-pointer items-center justify-between gap-3 border-t border-[var(--border)] px-1 py-3 text-left first:border-t-0">
                    <span className="text-xs font-semibold">{label}</span><strong className="text-xs" style={{ color: group.tone }}>{value}</strong>
                    <Tooltip align={index === group.items.length - 1 ? "end" : "center"}>{detail}</Tooltip>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="requirements-answer" number="06" title="Interview Answer">
        <div className="mx-auto mt-5 w-full max-w-5xl rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] px-6 py-5 text-justify text-sm font-medium leading-7 md:px-8">
          I start with {compact(result.viewers)} daily viewers, {workload.sessionsPerViewer} playback sessions per viewer, {workload.watchSeconds} watched seconds per session, a {workload.heartbeatSeconds}-second heartbeat, {workload.otherEvents} other events per viewer, and a {workload.peakMultiplier}× peak. That produces {decimal(result.eventsPerViewer, 0)} events per viewer, {compact(result.dailyEvents)} events per day, {compact(result.averageEventsSecond)} events/s average, and {compact(result.peakEventsSecond)} events/s peak. The weighted {decimal(result.weightedBytes, 0)}-byte event gives {decimal(result.peakIngressGBs)} GB/s peak ingress. With stated benchmarks and 40% reserve, I provision {result.collectors} regional collectors, about {Math.ceil(result.heartbeatPartitions / 10) * 10} heartbeat partitions, {result.flinkTasks} Flink tasks, {result.batchExecutors} batch executors for the four-hour window, {decimal(result.kafkaPhysicalPB)} PB of seven-day Kafka capacity at RF3 before broker adjustments, and {decimal(result.bronzeTBday, 1)} TB of compressed Bronze growth per day. I verify stream state, checkpoints, lake layers, serving QPS, and scan volume separately, then replace assumptions with load-test results.
        </div>
      </Section>
    </YouTubeFrame>
  );
}
