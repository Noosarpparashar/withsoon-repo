"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  WHATSAPP_INTERVIEW_CATEGORIES,
  WHATSAPP_INTERVIEW_QUESTIONS,
  type WhatsAppInterviewCategory,
} from "./whatsappInterviewData";

function InterviewSection({ id, eyebrow, title, subtitle, children }: { id: string; eyebrow: string; title: string; subtitle: string; children: ReactNode }) {
  return <section id={id} className="rounded-[26px] border border-[#d8d8d8] bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,.055)] sm:p-7">
    <div className="flex items-start gap-3"><span className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[#111]" aria-hidden /><div><p className="text-[10px] font-extrabold uppercase tracking-[.19em] text-[#111]">{eyebrow}</p><h2 className="mt-1.5 text-2xl font-bold tracking-[-.04em] text-[#111] sm:text-[28px]">{title}</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-[#5f5f5f]">{subtitle}</p></div></div>
    {children}
  </section>;
}

const WHITEBOARD_STEPS = [
  {
    time: "0:00–0:40",
    title: "Frame the boundary",
    draw: "Draw two boxes: live WhatsApp messaging and the big-data platform. Put encrypted payload delivery, queues, membership, and ordering in the first; put privacy-safe lifecycle events, Kafka, Flink, Iceberg, and analytics in the second.",
    explain: "State the invariant first: Kafka, the lakehouse, and dashboards may become stale, but they never grant delivery, ordering, membership, or failover ownership. E2EE content is not an analytical source.",
    checkpoint: "The interviewer should know exactly what is in scope before any technology choice appears.",
  },
  {
    time: "0:40–1:25",
    title: "Size the evidence",
    draw: "Write 100B messages/day ÷ 86,400 = 1.157M messages/s average; ×5 = 5.787M peak messages/s; ×3.7 lifecycle events = 21.412M peak events/s. Add 650 B/event, RF3, and 30% headroom.",
    explain: "Call these visible interview assumptions, not WhatsApp internal claims. Separate logical messages, recipient-device fan-out, group heavy tails, calls, media, notifications, and service telemetry before final provisioning.",
    checkpoint: "Every capacity number must lead to a partition, bandwidth, storage, state, or isolation decision.",
  },
  {
    time: "1:25–2:10",
    title: "Map sources + contracts",
    draw: "Place Message, Group, Media, Call, Notification, Device, Status, and Security services on the left. Connect committed state through outbox/CDC or bounded telemetry ingestion to versioned domain topics.",
    explain: "Name authoritative server events, stable event_id, event and ingestion time, schema/privacy versions, and protected domain keys. Explain why old mobile clients require additive evolution and tolerant readers.",
    checkpoint: "Every event needs an owner, transaction boundary, partition key, privacy class, and consumer.",
  },
  {
    time: "2:10–3:00",
    title: "Design Kafka + streaming",
    draw: "Draw isolated lifecycle, membership, media, calls, notification, and telemetry topics. Add schema checks and DLQ, then Flink for validation, deduplication, point-in-time joins, watermarks, five-minute windows, checkpoints, and idempotent sinks.",
    explain: "Defend the ordering scope, hot-group strategy, workload isolation, late-receipt policy, state TTL, checkpoint recovery, and the difference between provisional realtime metrics and certified history.",
    checkpoint: "A strong answer explains duplicates, late data, hot keys, and recovery—not just Kafka and Flink names.",
  },
  {
    time: "3:00–4:10",
    title: "Build trusted history",
    draw: "Continue Kafka to immutable Bronze, typed and deduplicated Silver, certified Gold, then Pinot/ClickHouse for operational views and Trino for historical analysis. Add the message, recipient-device delivery, call, media, notification, and capacity facts.",
    explain: "Bronze preserves exact replay evidence, Silver creates privacy-safe reusable truth, and Gold publishes owned products. State each fact's grain before dimensions, partitioning, bucketing, compaction, or serving choices.",
    checkpoint: "Show why one logical message and one recipient-device delivery are different rows with different denominators.",
  },
  {
    time: "4:10–5:00",
    title: "Prove trust + recovery",
    draw: "Wrap the system with freshness clocks, lineage, ownership, privacy policy, control totals, quality gates, deletion, and regional recovery. Add the repair loop: pin offsets → rebuild shadow tables → reconcile → publish one atomic snapshot.",
    explain: "Reconcile Message Service, Kafka, Bronze, Silver, quarantine, Gold, and exclusions by hour, region, and event type. During failure, preserve live messaging, expose stale age, and keep consumers on the last certified snapshot.",
    checkpoint: "Finish with measurable SLOs, RPO/RTO, privacy invariants, rollback proof, and the first bottleneck you would load-test.",
  },
] as const;

export default function WhatsAppInterviewQA() {
  const [category, setCategory] = useState<WhatsAppInterviewCategory>(WHATSAPP_INTERVIEW_CATEGORIES[0]);
  const filtered = useMemo(() => WHATSAPP_INTERVIEW_QUESTIONS.filter((item) => item.category === category), [category]);
  const [selectedId, setSelectedId] = useState<string>(WHATSAPP_INTERVIEW_QUESTIONS[0].id);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];
  const selectedNumber = Number(selected.id.slice(1));
  const [whiteboardStep, setWhiteboardStep] = useState(0);

  function chooseCategory(next: WhatsAppInterviewCategory) {
    setCategory(next);
    const first = WHATSAPP_INTERVIEW_QUESTIONS.find((item) => item.category === next);
    if (first) setSelectedId(first.id);
  }

  return <div className="mt-5 space-y-5" data-testid="whatsapp-interview-chapter" data-total-questions={WHATSAPP_INTERVIEW_QUESTIONS.length}>
    <InterviewSection id="question-bank" eyebrow="50-question interview workspace" title="Defend the complete WhatsApp big-data design" subtitle="Eight rounds cover scope, capacity, event contracts, Kafka, streaming, the lakehouse, analytical grain, privacy, reconciliation, and recovery. Select a question to see the position, trade-off, and proof an interviewer can challenge.">
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="WhatsApp interview question categories">
        {WHATSAPP_INTERVIEW_CATEGORIES.map((item) => {
          const count = WHATSAPP_INTERVIEW_QUESTIONS.filter((question) => question.category === item).length;
          return <button key={item} data-testid="whatsapp-interview-category" type="button" role="tab" aria-selected={category === item} onClick={() => chooseCategory(item)} className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${category === item ? "border-[#111] bg-[#dedede]" : "border-[#cfcfcf] bg-white hover:border-[#777] hover:bg-[#f5f5f5]"}`}>{item}<span className="ml-2 font-mono text-[9px] text-[#666]">{count}</span></button>;
        })}
      </div>

      <div className="mt-4 grid min-h-[560px] overflow-hidden rounded-2xl border border-[#cfcfcf] xl:grid-cols-[38%_62%]">
        <div className="max-h-[640px] overflow-y-auto bg-[#ededed]" aria-label={`${category} questions`}>
          {filtered.map((item) => {
            const number = Number(item.id.slice(1));
            const active = selected.id === item.id;
            return <button key={item.id} data-testid="whatsapp-interview-question" data-question-id={item.id} type="button" aria-pressed={active} aria-controls="whatsapp-interview-answer" onMouseEnter={() => setSelectedId(item.id)} onFocus={() => setSelectedId(item.id)} onClick={() => setSelectedId(item.id)} className={`block w-full border-b border-[#d0d0d0] px-5 py-4 text-left outline-none transition last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#111] ${active ? "bg-white shadow-[inset_4px_0_0_#111]" : "hover:bg-white/70"}`}><span className="font-mono text-[9px] font-bold text-[#666]">{String(number).padStart(2, "0")}</span><strong className="mt-2 block text-xs leading-5 text-[#222]">{item.question}</strong></button>;
          })}
        </div>

        <article id="whatsapp-interview-answer" data-testid="whatsapp-interview-answer" className="flex flex-col border-t border-[#cfcfcf] bg-white p-5 sm:p-6 xl:border-l xl:border-t-0" aria-live="polite" aria-atomic="true">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-mono text-[9px] font-bold text-[#666]">QUESTION {String(selectedNumber).padStart(2, "0")} / 50</p><span className="rounded-full border border-[#ccc] bg-[#ededed] px-3 py-1 font-mono text-[9px]">{category}</span></div>
          <h3 className="mt-3 text-xl font-bold leading-7 tracking-[-.02em] text-[#111]">{selected.question}</h3>
          <div className="mt-5 overflow-hidden rounded-xl border border-[#cfcfcf]">
            <div className="bg-[#111] px-5 py-3 text-white"><p className="font-mono text-[9px] font-bold uppercase tracking-[.14em]">Comprehensive interview answer</p></div>
            <div className="bg-white p-5"><p className="text-sm leading-7 text-[#333]">{selected.answer}</p></div>
            <div className="grid border-t border-[#d2d2d2] md:grid-cols-2">
              <div className="bg-[#ededed] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#666]">Trade-off to defend</p><p className="mt-2 text-xs leading-6 text-[#333]">{selected.tradeoff}</p></div>
              <div className="border-t border-[#d2d2d2] bg-[#f7f7f7] p-4 md:border-l md:border-t-0"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#666]">Evidence or validation</p><p className="mt-2 text-xs leading-6 text-[#333]">{selected.proof}</p></div>
            </div>
          </div>
          <p className="mt-auto pt-5 text-[10px] leading-5 text-[#666]"><strong className="text-[#111]">Interview note:</strong> numerical values are visible planning assumptions for a WhatsApp-like platform, not claims about private production infrastructure.</p>
        </article>
      </div>
    </InterviewSection>

    <InterviewSection id="whiteboard" eyebrow="Five-minute whiteboard" title="Build the WhatsApp answer in six connected decisions" subtitle="Move from the system boundary to scale, sources, Kafka and streaming, trusted historical data, and operational proof. Hover, focus, or tap a step to see what to draw and explain.">
      <ol className="mt-6 grid overflow-hidden rounded-xl border border-[#c9c9c9] bg-[#d8d8d8] sm:grid-cols-2 xl:grid-cols-6">
        {WHITEBOARD_STEPS.map((step, index) => <li key={step.time} className="relative bg-white xl:[&:not(:last-child)]:after:absolute xl:[&:not(:last-child)]:after:right-[-8px] xl:[&:not(:last-child)]:after:top-1/2 xl:[&:not(:last-child)]:after:z-10 xl:[&:not(:last-child)]:after:h-4 xl:[&:not(:last-child)]:after:w-4 xl:[&:not(:last-child)]:after:-translate-y-1/2 xl:[&:not(:last-child)]:after:rotate-45 xl:[&:not(:last-child)]:after:border-r xl:[&:not(:last-child)]:after:border-t xl:[&:not(:last-child)]:after:border-[#aaa] xl:[&:not(:last-child)]:after:bg-white">
          <button type="button" data-testid={`whatsapp-whiteboard-step-${index}`} onMouseEnter={() => setWhiteboardStep(index)} onFocus={() => setWhiteboardStep(index)} onClick={() => setWhiteboardStep(index)} aria-pressed={whiteboardStep === index} className={`relative h-full min-h-[116px] w-full border-b border-r border-[#d8d8d8] px-4 py-4 text-left outline-none transition sm:[&:nth-last-child(-n+2)]:border-b-0 xl:min-h-[104px] xl:border-b-0 xl:px-3 xl:py-3 ${whiteboardStep === index ? "bg-[#e4e4e4] shadow-[inset_0_-4px_0_#111]" : "hover:bg-[#f3f3f3]"}`}>
            <span className="flex items-center gap-2"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold ${whiteboardStep === index ? "bg-[#111] text-white" : "border border-[#aaa] bg-white"}`}>{index + 1}</span><span className="font-mono text-[8px] font-bold text-[#666]">{step.time}</span></span>
            <strong className="mt-3 block text-xs leading-5 xl:mt-2">{step.title}</strong>
          </button>
        </li>)}
      </ol>
      <div data-testid="whatsapp-whiteboard-detail" className="mt-4 overflow-hidden rounded-xl border border-[#c9c9c9] bg-[#ededed]" aria-live="polite">
        <div className="flex items-center gap-4 bg-[#111] px-5 py-3 text-white"><span className="font-mono text-[9px] font-bold">STEP {String(whiteboardStep + 1).padStart(2, "0")}</span><strong className="text-sm">{WHITEBOARD_STEPS[whiteboardStep].title}</strong><span className="ml-auto font-mono text-[9px] text-[#d0d0d0]">{WHITEBOARD_STEPS[whiteboardStep].time}</span></div>
        <div className="grid lg:grid-cols-[1fr_1.2fr]"><div className="border-b border-[#d0d0d0] p-5 lg:border-b-0 lg:border-r"><p className="text-sm leading-7 text-[#333]">{WHITEBOARD_STEPS[whiteboardStep].draw}</p></div><div className="p-5"><p className="font-mono text-[9px] font-bold uppercase tracking-[.13em] text-[#666]">Explain the decision</p><p className="mt-3 text-sm leading-7 text-[#333]">{WHITEBOARD_STEPS[whiteboardStep].explain}</p><p className="mt-4 border-l-2 border-[#111] pl-4 text-xs font-semibold leading-6 text-[#444]">{WHITEBOARD_STEPS[whiteboardStep].checkpoint}</p></div></div>
      </div>
    </InterviewSection>
  </div>;
}
