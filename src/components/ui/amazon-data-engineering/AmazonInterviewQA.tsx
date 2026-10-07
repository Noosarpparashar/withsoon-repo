"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AMAZON_INTERVIEW_CATEGORIES,
  AMAZON_INTERVIEW_QUESTIONS,
  AMAZON_INTERVIEW_SCENARIOS,
  type AmazonInterviewCategory,
} from "./amazonInterviewData";

function InterviewSection({ id, eyebrow, title, subtitle, children }: { id: string; eyebrow: string; title: string; subtitle: string; children: ReactNode }) {
  return <section id={id} className="scroll-mt-40 rounded-[26px] border border-[#d8d8d8] bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,.055)] sm:p-7">
    <div className="flex items-start gap-3"><span className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[#111]" aria-hidden/><div><p className="text-[10px] font-extrabold uppercase tracking-[.19em] text-[#111]">{eyebrow}</p><h2 className="mt-1.5 text-2xl font-bold tracking-[-.04em] text-[#111] sm:text-[28px]">{title}</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-[#5f5f5f]">{subtitle}</p></div></div>
    {children}
  </section>;
}

const WHITEBOARD_STEPS = [
  { time: "0:00–0:40", title: "Frame the boundary", draw: "Draw two boxes: the transactional commerce plane and the big-data plane. Put checkout, payment authorization, inventory reservation, and fulfillment commands in the first; put events, Kafka, streaming, Iceberg, analytics, and ML in the second.", explain: "State the invariant first: analytics may become stale, but it never authorizes payment, grants inventory, changes an order, or owns fulfillment. Operational services commit first and hand off evidence asynchronously through outbox/CDC or governed telemetry.", checkpoint: "The interviewer should know what is in scope and what must remain online before any technology choice appears." },
  { time: "0:40–1:25", title: "Size the workload", draw: "Write 10M orders/day × 30 lifecycle events ÷ 86,400 × 20 = 69,444 peak order events/s. Add 3B behavior events/day ÷ 86,400 × 10 = 347,222/s, for 416,667/s combined before other domains.", explain: "Call these visible interview assumptions, not Amazon internal claims. Separate orders, behavior, payments, inventory, fulfillment, CDC, partner feeds, and replay; then convert rate and bytes into partitions, bandwidth, retention, stream state, and storage.", checkpoint: "Every number should cause a design decision rather than remain a decorative estimate." },
  { time: "1:25–2:10", title: "Map sources + contracts", draw: "Place Orders, Payments, Inventory, Catalog, Pricing, Sellers, Fulfillment, Behavior, and Partners on the left. Connect committed state through outbox/CDC and validated telemetry to versioned domain topics and immutable Bronze.", explain: "Name the authority, grain, stable event ID, entity key, source sequence, event and ingest time, schema version, privacy class, and owner. Explain why money uses minor units and why schema compatibility includes semantics, not only readable bytes.", checkpoint: "Every fact needs an owner, transaction boundary, capture mode, partition key, privacy class, and replay source." },
  { time: "2:10–3:00", title: "Design Kafka + streaming", draw: "Draw isolated critical and behavioral topics, schema policy and DLQ, then Flink for validation, bounded dedupe, point-in-time joins, watermarks, windows, checkpoints, and idempotent sinks. Add a separate replay lane.", explain: "Defend ordering scope, campaign hot keys, partition sizing, late mobile events, state TTL, checkpoint recovery, and why realtime products remain provisional until the truth path reconciles complete evidence.", checkpoint: "A strong answer explains duplicates, late data, hot keys, backpressure, and recovery—not only product names." },
  { time: "3:00–4:10", title: "Build trusted products", draw: "Continue into Bronze, typed Silver, and certified Gold. Add order-item, payment-transaction, inventory-movement/snapshot, shipment, return, and impression facts; then route operational views, governed BI, seller APIs, and feature stores separately.", explain: "State each fact grain before dimensions or technology. Iceberg supplies atomic snapshots and evolution; Spark performs large joins, backfills, and reconciliation; serving systems match latency and access patterns instead of putting the lake on checkout.", checkpoint: "Show why order item, payment movement, package, return, and inventory mutation are separate rows with different keys." },
  { time: "4:10–5:00", title: "Prove trust + recovery", draw: "Wrap the design with ownership, freshness clocks, lineage, quality gates, finance/inventory reconciliation, PII and seller isolation, deletion, cost attribution, and multi-region recovery. Add pin → shadow rebuild → reconcile → atomic publish.", explain: "Keep consumers on the last certified snapshot during repair. Every difference remains in an owned exception table. Finish with RPO/RTO, access and privacy invariants, rollback proof, and the first campaign or regional-failure load test.", checkpoint: "The final minute should prove correctness and recoverability rather than introduce another technology." },
] as const;

export default function AmazonInterviewQA() {
  const [category, setCategory] = useState<AmazonInterviewCategory>(AMAZON_INTERVIEW_CATEGORIES[0]);
  const filtered = useMemo(() => AMAZON_INTERVIEW_QUESTIONS.filter((item) => item.category === category), [category]);
  const [selectedId, setSelectedId] = useState<string>(AMAZON_INTERVIEW_QUESTIONS[0].id);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];
  const selectedScenario = AMAZON_INTERVIEW_SCENARIOS[selected.id];
  const selectedNumber = Number(selected.id.slice(1));
  const [whiteboardStep, setWhiteboardStep] = useState(0);

  function chooseCategory(next: AmazonInterviewCategory) {
    setCategory(next);
    const first = AMAZON_INTERVIEW_QUESTIONS.find((item) => item.category === next);
    if (first) setSelectedId(first.id);
  }

  return <div className="mt-5 space-y-5" data-testid="amazon-interview-chapter" data-total-questions={AMAZON_INTERVIEW_QUESTIONS.length}>
    <InterviewSection id="question-bank" eyebrow="50-question interview workspace" title="Defend the complete Amazon big-data design" subtitle="Eight rounds cover sources, scale, Kafka, CDC, streaming, the lakehouse, analytical modeling, finance, serving, ML, governance, and recovery. Select a question to see the position, trade-off, and proof an interviewer can challenge.">
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Amazon interview question categories">
        {AMAZON_INTERVIEW_CATEGORIES.map((item) => {
          const count = AMAZON_INTERVIEW_QUESTIONS.filter((question) => question.category === item).length;
          return <button key={item} data-testid="amazon-interview-category" type="button" role="tab" aria-selected={category === item} onClick={() => chooseCategory(item)} className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${category === item ? "border-[#111] bg-[#dedede]" : "border-[#cfcfcf] bg-white hover:border-[#777] hover:bg-[#f5f5f5]"}`}>{item}<span className="ml-2 font-mono text-[9px] text-[#555]">{count}</span></button>;
        })}
      </div>

      <div className="mt-4 grid min-h-[560px] overflow-hidden rounded-2xl border border-[#cfcfcf] xl:grid-cols-[38%_62%]">
        <div className="max-h-[640px] overflow-y-auto bg-[#ededed]" aria-label={`${category} questions`}>
          {filtered.map((item) => {
            const number = Number(item.id.slice(1));
            const active = selected.id === item.id;
            return <button key={item.id} data-testid="amazon-interview-question" data-question-id={item.id} type="button" aria-pressed={active} aria-controls="amazon-interview-answer" onMouseEnter={() => setSelectedId(item.id)} onFocus={() => setSelectedId(item.id)} onClick={() => setSelectedId(item.id)} className={`block w-full border-b border-[#d0d0d0] px-5 py-4 text-left outline-none transition last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#111] ${active ? "bg-white shadow-[inset_4px_0_0_#111]" : "hover:bg-white/70"}`}><span className="font-mono text-[9px] font-bold text-[#555]">{String(number).padStart(2, "0")}</span><strong className="mt-2 block text-xs leading-5 text-[#222]">{AMAZON_INTERVIEW_SCENARIOS[item.id].question}</strong></button>;
          })}
        </div>

        <article id="amazon-interview-answer" data-testid="amazon-interview-answer" className="flex flex-col border-t border-[#cfcfcf] bg-white p-5 sm:p-6 xl:border-l xl:border-t-0" aria-live="polite" aria-atomic="true">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-mono text-[9px] font-bold text-[#555]">QUESTION {String(selectedNumber).padStart(2, "0")} / 50</p><span className="rounded-full border border-[#ccc] bg-[#ededed] px-3 py-1 font-mono text-[9px]">{category}</span></div>
          <h3 className="mt-3 text-xl font-bold leading-7 tracking-[-.02em] text-[#111]">{selectedScenario.question}</h3>
          <div data-testid="amazon-interview-scenario" className="mt-4 border-l-4 border-[#111] bg-[#ededed] px-4 py-3"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#555]">Amazon scenario to walk through</p><p className="mt-1.5 text-xs leading-6 text-[#333]">{selectedScenario.setup}</p></div>
          <div className="mt-5 overflow-hidden rounded-xl border border-[#cfcfcf]">
            <div className="bg-[#111] px-5 py-3 text-white"><p className="font-mono text-[9px] font-bold uppercase tracking-[.14em]">Amazon-specific interview answer</p></div>
            <div className="bg-white p-5"><p className="text-sm leading-7 text-[#333]">{selected.answer}</p></div>
            <div className="grid border-t border-[#d2d2d2] md:grid-cols-2"><div className="bg-[#ededed] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#555]">Trade-off to defend</p><p className="mt-2 text-xs leading-6 text-[#333]">{selected.tradeoff}</p></div><div className="border-t border-[#d2d2d2] bg-[#f7f7f7] p-4 md:border-l md:border-t-0"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#555]">Evidence or validation</p><p className="mt-2 text-xs leading-6 text-[#333]">{selected.proof}</p></div></div>
          </div>
          <p className="mt-auto pt-5 text-[10px] leading-5 text-[#555]"><strong className="text-[#111]">Interview note:</strong> numerical values are visible planning assumptions for an Amazon-like platform, not claims about private production infrastructure.</p>
        </article>
      </div>
    </InterviewSection>

    <InterviewSection id="whiteboard" eyebrow="Five-minute whiteboard" title="Build the Amazon answer in six connected decisions" subtitle="Move from the transaction boundary to scale, sources, Kafka and streaming, trusted products, governance, and recovery. Hover, focus, or tap a step to see what to draw and explain.">
      <ol className="mt-6 grid overflow-hidden rounded-xl border border-[#c9c9c9] bg-[#d8d8d8] sm:grid-cols-2 xl:grid-cols-6">
        {WHITEBOARD_STEPS.map((step, index) => <li key={step.time} className="relative bg-white xl:[&:not(:last-child)]:after:absolute xl:[&:not(:last-child)]:after:right-[-8px] xl:[&:not(:last-child)]:after:top-1/2 xl:[&:not(:last-child)]:after:z-10 xl:[&:not(:last-child)]:after:h-4 xl:[&:not(:last-child)]:after:w-4 xl:[&:not(:last-child)]:after:-translate-y-1/2 xl:[&:not(:last-child)]:after:rotate-45 xl:[&:not(:last-child)]:after:border-r xl:[&:not(:last-child)]:after:border-t xl:[&:not(:last-child)]:after:border-[#aaa] xl:[&:not(:last-child)]:after:bg-white"><button type="button" data-testid={`amazon-whiteboard-step-${index}`} onMouseEnter={() => setWhiteboardStep(index)} onFocus={() => setWhiteboardStep(index)} onClick={() => setWhiteboardStep(index)} aria-pressed={whiteboardStep === index} className={`relative h-full min-h-[116px] w-full border-b border-r border-[#d8d8d8] px-4 py-4 text-left outline-none transition sm:[&:nth-last-child(-n+2)]:border-b-0 xl:min-h-[104px] xl:border-b-0 xl:px-3 xl:py-3 ${whiteboardStep === index ? "bg-[#e4e4e4] shadow-[inset_0_-4px_0_#111]" : "hover:bg-[#f3f3f3]"}`}><span className="flex items-center gap-2"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold ${whiteboardStep === index ? "bg-[#111] text-white" : "border border-[#aaa] bg-white"}`}>{index + 1}</span><span className="font-mono text-[8px] font-bold text-[#555]">{step.time}</span></span><strong className="mt-3 block text-xs leading-5 xl:mt-2">{step.title}</strong></button></li>)}
      </ol>
      <div data-testid="amazon-whiteboard-detail" className="mt-4 overflow-hidden rounded-xl border border-[#c9c9c9] bg-[#ededed]" aria-live="polite"><div className="flex items-center gap-4 bg-[#111] px-5 py-3 text-white"><span className="font-mono text-[9px] font-bold">STEP {String(whiteboardStep + 1).padStart(2, "0")}</span><strong className="text-sm">{WHITEBOARD_STEPS[whiteboardStep].title}</strong><span className="ml-auto font-mono text-[9px] text-[#d0d0d0]">{WHITEBOARD_STEPS[whiteboardStep].time}</span></div><div className="grid lg:grid-cols-[1fr_1.2fr]"><div className="border-b border-[#d0d0d0] p-5 lg:border-b-0 lg:border-r"><p className="text-sm leading-7 text-[#333]">{WHITEBOARD_STEPS[whiteboardStep].draw}</p></div><div className="p-5"><p className="font-mono text-[9px] font-bold uppercase tracking-[.13em] text-[#555]">Explain the decision</p><p className="mt-3 text-sm leading-7 text-[#333]">{WHITEBOARD_STEPS[whiteboardStep].explain}</p><p className="mt-4 border-l-2 border-[#111] pl-4 text-xs font-semibold leading-6 text-[#444]">{WHITEBOARD_STEPS[whiteboardStep].checkpoint}</p></div></div></div>
    </InterviewSection>
  </div>;
}
