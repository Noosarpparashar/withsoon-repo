"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  normalizeUberDeTab,
  type UberDeTabSlug,
  UBER_DE_TABS,
  UBER_DE_TAB_META,
  UBER_START_HERE_SECTIONS,
} from "./data";

const T = {
  bg: "#0f1318",
  card: "#1b2028",
  card2: "#232a35",
  border: "#34404f",
  text: "#f8fafc",
  muted: "#aeb8c6",
  faint: "#8592a6",
  blue: "#276EF1",
  cyan: "#38bdf8",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  violet: "#8b5cf6",
};

function tabHref(tab: UberDeTabSlug) {
  return `/system-design/uber/${tab}`;
}

function OutlineCard({
  activeId,
  onNavigate,
}: {
  activeId: string;
  onNavigate: (id: (typeof UBER_START_HERE_SECTIONS)[number]["id"]) => void;
}) {
  return (
    <aside className="hidden xl:block w-[250px] shrink-0 px-4 pt-6">
      <div className="sticky top-[124px]">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: T.faint }}>
          Page anchors
        </p>
        <div className="mt-4 space-y-3">
          {UBER_START_HERE_SECTIONS.map((section, index) => {
            const active = section.id === activeId;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onNavigate(section.id)}
                className="w-full rounded-[22px] px-4 py-4 text-left transition-colors"
                style={{
                  background: active ? "rgba(39,110,241,0.14)" : T.card,
                  border: `1px solid ${active ? "rgba(39,110,241,0.4)" : T.border}`,
                  color: active ? T.text : T.muted,
                }}
              >
                <div className="flex items-center gap-4">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                    style={{ background: active ? "rgba(39,110,241,0.18)" : "#202733", color: active ? "#8ec1ff" : T.faint }}
                  >
                    {index + 1}
                  </span>
                  <span className="text-[0.98rem] font-semibold">{section.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function TopTabs({ activeTab }: { activeTab: UberDeTabSlug }) {
  return (
    <div className="sticky top-14 z-30 border-b" style={{ borderColor: T.border, background: "rgba(15,19,24,0.96)", backdropFilter: "blur(16px)" }}>
      <div className="flex items-center gap-3 overflow-x-auto px-6 py-4 no-scrollbar">
        {UBER_DE_TABS.map((tab, index) => {
          const active = tab.id === activeTab;
          return (
            <Link
              key={tab.id}
              href={tabHref(tab.id)}
              className="shrink-0 rounded-[20px] px-5 py-3 transition-colors"
              style={{
                background: active ? "rgba(39,110,241,0.14)" : T.card,
                border: `1px solid ${active ? "rgba(39,110,241,0.4)" : T.border}`,
                color: active ? T.text : T.muted,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: active ? "#59a4ff" : T.faint }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-[1.02rem] font-semibold whitespace-nowrap">{tab.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function PlaceholderTab({ tab }: { tab: UberDeTabSlug }) {
  const meta = UBER_DE_TAB_META[tab];
  return (
    <div className="rounded-[30px] p-8 md:p-10" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: T.blue }}>
        Next tab
      </p>
      <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em]" style={{ color: T.text }}>
        {meta.title.replace(" | withsoon.com", "")}
      </h2>
      <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: T.muted }}>
        {meta.description}
      </p>
      <div className="mt-8 rounded-[24px] p-6" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: T.amber }}>
          In progress
        </p>
        <p className="mt-3 text-base leading-8" style={{ color: T.muted }}>
          This tab will follow the same Netflix-style interaction model, but I&apos;m completing Uber one tab at a time so each section is verified before we move on.
        </p>
      </div>
    </div>
  );
}

function StartHereTab() {
  return (
    <div className="space-y-6">
      <section id="platform-mission" className="rounded-[30px] p-8 md:p-10" style={{ background: T.card, border: `1px solid rgba(39,110,241,0.28)` }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: T.blue }}>
          Start Here
        </p>
        <h1 className="mt-3 max-w-4xl text-[2.8rem] font-semibold tracking-[-0.05em] leading-[0.96]" style={{ color: T.text }}>
          Frame Uber as the shared marketplace data platform, not the dispatch service.
        </h1>
        <p className="mt-5 max-w-4xl text-lg leading-8" style={{ color: T.muted }}>
          Start by drawing the line clearly: this answer covers the event pipeline, streaming layer, lakehouse, warehouse, feature store, and marketplace analytics workloads that power surge, ETA, fraud, finance, and city operations.
        </p>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[26px] p-6" style={{ background: "#1f2630", border: `1px solid ${T.border}` }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: T.red }}>
              Platform mission
            </p>
            <div className="mt-5 grid gap-4">
              {[
                {
                  title: "Trip lifecycle events",
                  detail: "Trip requested, matched, arrived, started, completed, cancelled, and payment status changes become the transactional spine.",
                },
                {
                  title: "Driver GPS pings",
                  detail: "The largest stream by far. These power live supply visibility, surge recomputation, route quality, ETA features, and fraud detection.",
                },
                {
                  title: "Rider app events",
                  detail: "Fare estimates, search flows, screen views, and conversion steps explain demand shape and experimentation outcomes.",
                },
              ].map((item, index) => (
                <div key={item.title} className="rounded-[22px] p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                  <div className="flex items-start gap-4">
                    <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: "rgba(39,110,241,0.16)", color: "#8ec1ff" }}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-xl font-semibold" style={{ color: T.text }}>{item.title}</p>
                      <p className="mt-2 text-[0.98rem] leading-7" style={{ color: T.muted }}>{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] p-6" style={{ background: T.card2, border: `1px solid rgba(56,189,248,0.24)` }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: T.cyan }}>
              What I would say
            </p>
            <p className="mt-4 text-lg leading-9" style={{ color: T.text }}>
              I&apos;ll scope this as Uber&apos;s <span style={{ color: "#8ec1ff" }}>data platform</span>:
              the batch plus stream backbone that turns trip, location, and rider events into live marketplace signals and trusted historical truth.
            </p>
            <div className="mt-6 rounded-[22px] p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: T.green }}>
                Boundary line
              </p>
              <p className="mt-3 text-[0.98rem] leading-7" style={{ color: T.muted }}>
                I am not designing dispatch or the rider mobile client itself. Those systems emit events into this platform. My boundary is events in, Kafka, stream + batch processing, lakehouse, warehouse, feature store, and downstream consumers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="requirements-snapshot" className="rounded-[28px] p-7" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: T.amber }}>
          Requirements snapshot
        </p>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {[
            {
              title: "Functional",
              items: [
                "Ingest trip, location, rider, payments, and routing events continuously.",
                "Validate, enrich, and dedupe before those signals feed surge, ETA, and fraud workflows.",
                "Persist trusted historical trip, driver, city, and settlement tables for finance and operations.",
              ],
              color: T.blue,
            },
            {
              title: "Non-functional",
              items: [
                "Seconds-level freshness for surge and ETA features, with sub-second reads where model serving needs it.",
                "Effectively-once business outcomes for financially critical trip completion and payments events.",
                "Petabyte-scale geospatial history with deletion guarantees for PII such as rider addresses and payment-linked identity.",
              ],
              color: T.green,
            },
          ].map((group) => (
            <div key={group.title} className="rounded-[24px] p-5" style={{ background: T.card2, border: `1px solid ${group.color}28` }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: group.color }}>
                {group.title}
              </p>
              <div className="mt-4 space-y-3">
                {group.items.map((item) => (
                  <div key={item} className="rounded-[18px] px-4 py-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                    <p className="text-[0.96rem] leading-7" style={{ color: T.muted }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="scope-boundary" className="rounded-[28px] p-7" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: T.red }}>
          Scope boundary
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[24px] p-5" style={{ background: "rgba(39,110,241,0.08)", border: `1px solid rgba(39,110,241,0.26)` }}>
            <p className="text-lg font-semibold" style={{ color: T.text }}>
              In scope
            </p>
            <div className="mt-4 space-y-3">
              {[
                "Events in -> Kafka -> stream + batch processing -> lakehouse -> warehouse + feature store -> consumers",
                "Marketplace analytics for surge pricing, ETA features, fraud scoring, finance, city ops, and experimentation",
                "Reconciliation between the fast streaming view and the trusted daily business record",
              ].map((item) => (
                <div key={item} className="rounded-[18px] px-4 py-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                  <p className="text-[0.96rem] leading-7" style={{ color: T.muted }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[24px] p-5" style={{ background: "rgba(239,68,68,0.08)", border: `1px solid rgba(239,68,68,0.22)` }}>
            <p className="text-lg font-semibold" style={{ color: T.text }}>
              Not in scope
            </p>
            <div className="mt-4 space-y-3">
              {[
                "Dispatch and matching algorithm internals",
                "The mobile client or map UI itself",
                "Low-latency OLTP service design beyond the point where those services publish events into the platform",
              ].map((item) => (
                <div key={item} className="rounded-[18px] px-4 py-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                  <p className="text-[0.96rem] leading-7" style={{ color: T.muted }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="freshness-map" className="rounded-[28px] p-7" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: T.green }}>
          Freshness map
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { signal: "Driver GPS -> dispatch map", freshness: "~4s", why: "Near-live driver position is the supply view the marketplace reacts to.", color: T.cyan },
            { signal: "Surge recompute", freshness: "30–60s", why: "Fast enough to respond without creating price flapping.", color: T.red },
            { signal: "ETA features", freshness: "Seconds", why: "ETA quality directly changes rider UX and driver routing expectations.", color: T.blue },
            { signal: "Trip fact", freshness: "T+1 by 6 AM", why: "Official finance and city operations numbers care more about correctness than instant publish.", color: T.amber },
            { signal: "Fraud / risk score", freshness: "Sub-second to minutes", why: "Blocking paths need speed, deeper review can run on a slower correction lane.", color: T.violet },
          ].map((item) => (
            <div key={item.signal} className="rounded-[24px] p-5" style={{ background: T.card2, border: `1px solid ${item.color}26` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: item.color }}>
                {item.freshness}
              </p>
              <p className="mt-3 text-lg font-semibold leading-7" style={{ color: T.text }}>
                {item.signal}
              </p>
              <p className="mt-3 text-sm leading-7" style={{ color: T.muted }}>
                {item.why}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="handoff" className="rounded-[28px] p-7" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: T.blue }}>
          Handoff
        </p>
        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="rounded-[24px] p-5" style={{ background: T.card2, border: `1px solid ${T.border}` }}>
            <p className="text-[1.02rem] leading-8" style={{ color: T.text }}>
              Before estimating capacity, I want the requirements story locked so the numbers justify the architecture decisions. The next tab turns these freshness targets and business consumers into concrete scale math for Kafka, storage, and retention.
            </p>
          </div>
          <div className="rounded-[24px] p-5" style={{ background: "rgba(39,110,241,0.12)", border: `1px solid rgba(39,110,241,0.28)` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#8ec1ff" }}>
              Next up
            </p>
            <p className="mt-3 text-xl font-semibold" style={{ color: T.text }}>
              Requirements & capacity
            </p>
            <p className="mt-3 text-sm leading-7" style={{ color: T.muted }}>
              We derive peak GPS event load, explain why geospatial pings dominate every other topic, and use that math to justify partition strategy and tiered storage.
            </p>
            <Link
              href={tabHref("requirements")}
              className="mt-5 inline-flex rounded-[16px] px-4 py-2.5 text-sm font-semibold"
              style={{ background: T.blue, color: "#fff" }}
            >
              Open tab 2 →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function UberDataEngineeringPage({ initialTab }: { initialTab?: string }) {
  const initial = normalizeUberDeTab(initialTab) ?? "start-here";
  const [activeSection, setActiveSection] = useState<(typeof UBER_START_HERE_SECTIONS)[number]["id"]>(UBER_START_HERE_SECTIONS[0].id);
  const activeTab = initial;

  useEffect(() => {
    if (activeTab !== "start-here") return;
    const sync = () => {
      const sections = UBER_START_HERE_SECTIONS
        .map((section) => {
          const node = document.getElementById(section.id);
          if (!node) return null;
          return { id: section.id, top: node.getBoundingClientRect().top };
        })
        .filter((item): item is { id: (typeof UBER_START_HERE_SECTIONS)[number]["id"]; top: number } => item !== null);

      if (sections.length === 0) return;
      const threshold = 180;
      const current = sections.reduce((closest, section) => {
        if (!closest) return section;
        return Math.abs(section.top - threshold) < Math.abs(closest.top - threshold) ? section : closest;
      }, sections[0]);
      setActiveSection(current.id);
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [activeTab]);

  const activeMeta = useMemo(() => UBER_DE_TAB_META[activeTab], [activeTab]);

  useEffect(() => {
    document.title = activeMeta.title;
  }, [activeMeta.title]);

  const navigateSection = (id: (typeof UBER_START_HERE_SECTIONS)[number]["id"]) => {
    const node = document.getElementById(id);
    if (!node) return;
    const absoluteTop = node.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, absoluteTop), behavior: "smooth" });
    setActiveSection(id);
  };

  return (
    <div className="min-h-[calc(100dvh-56px)]" style={{ background: T.bg, color: T.text }}>
      <TopTabs activeTab={activeTab} />
      <div className="mx-auto flex max-w-[1700px]">
        {activeTab === "start-here" ? <OutlineCard activeId={activeSection} onNavigate={navigateSection} /> : null}
        <main className="min-w-0 flex-1 px-5 pb-12 pt-6 md:px-8 xl:px-10">
          <div className="mb-6 rounded-[28px] p-6 md:p-8" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: T.blue }}>
              Uber Data Engineering
            </p>
            <h2 className="mt-3 text-[2.2rem] font-semibold tracking-[-0.05em]" style={{ color: T.text }}>
              {activeMeta.title.replace(" | withsoon.com", "")}
            </h2>
            <p className="mt-4 max-w-4xl text-lg leading-8" style={{ color: T.muted }}>
              {activeMeta.description}
            </p>
          </div>

          {activeTab === "start-here" ? <StartHereTab /> : <PlaceholderTab tab={activeTab} />}
        </main>
      </div>
    </div>
  );
}
