"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import CompanyChapterRail from "../data-design/CompanyChapterRail";
import AccessibleExplainer from "../data-design/AccessibleExplainer";
import MobileSectionNav from "../data-design/MobileSectionNav";
import {
  getActiveDataDesignSection,
  scrollToDataDesignSection,
} from "../data-design/sectionAnchors";
import {
  type PageSection,
  type YouTubeTab,
  YOUTUBE_TABS,
} from "./data";

export const RED = "#b00020";

export function Tooltip({
  children,
  align = "center",
  side = "top",
  wide = false,
  triggerLabel,
}: {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
  wide?: boolean;
  triggerLabel?: string;
}) {
  return (
    <AccessibleExplainer align={align} side={side} wide={wide} company="YouTube" triggerLabel={triggerLabel}>
      {children}
    </AccessibleExplainer>
  );
}

export function Section({
  id,
  title,
  number,
  children,
}: {
  id: string;
  title: string;
  number: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 md:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-[10px] font-bold text-[#b00020]">
          {number}
        </span>
        <h2 className="text-xl font-semibold md:text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export type InspectorItem = {
  id: string;
  title: string;
  summary?: string;
  detail: React.ReactNode;
};

export function SectionInspector({
  id,
  label,
  items,
}: {
  id: string;
  label: string;
  items: readonly InspectorItem[];
}) {
  const selectId = useId();
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  if (!selected) return null;

  return (
    <aside
      data-testid="section-inspector"
      data-inspector-id={id}
      className="mt-3 grid gap-3 rounded-xl border border-[#b6c7d7] bg-[#eef4f9] p-3 md:grid-cols-[minmax(180px,0.36fr)_1fr] md:items-start"
      aria-label={`${label} explanation`}
    >
      <label htmlFor={selectId} className="block">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.16em] text-[#52697d]">
          Explore {label}
        </span>
        <select
          id={selectId}
          value={selected.id}
          onChange={(event) => setSelectedId(event.target.value)}
          className="min-h-10 w-full rounded-lg border border-[#a9bacb] bg-white px-3 text-sm font-semibold text-[#17202b] outline-none focus:border-[#70879b] focus:ring-2 focus:ring-[#b9cadd]"
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <div data-testid="section-inspector-content" aria-live="polite" className="min-w-0 w-full max-w-[25rem] border-t border-[#cbd8e3] pt-3 text-xs md:border-l md:border-t-0 md:pl-4 md:pt-0">
        <strong className="block text-sm text-[#17202b]">{selected.title}</strong>
        {selected.summary ? (
          <span className="mt-0.5 block text-[11px] font-medium text-[#52697d]">{selected.summary}</span>
        ) : null}
        <div className="mt-1.5 text-xs leading-5 text-[#445464]">{selected.detail}</div>
      </div>
    </aside>
  );
}

export function HoverCard({
  icon,
  title,
  sub,
  detail,
  tone,
  align,
  side,
  className = "",
}: {
  icon: string;
  title: string;
  sub?: string;
  detail: string;
  tone: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`group relative rounded-xl border bg-[var(--bg-muted)] p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b00020] ${className}`}
      style={{ borderColor: `${tone}44` }}
    >
      <span className="flex items-start justify-between gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
          style={{
            color: tone,
            background: `color-mix(in srgb, ${tone} 12%, var(--bg-card))`,
          }}
        >
          {icon}
        </span>
        <span className="text-[10px]" style={{ color: tone }} aria-hidden>
          ⓘ
        </span>
      </span>
      <span className="mt-3 block text-sm font-semibold">{title}</span>
      {sub ? (
        <span className="mt-1 block text-xs leading-5 text-[var(--text-faint)]">
          {sub}
        </span>
      ) : null}
      <Tooltip align={align} side={side} triggerLabel={title}>{detail}</Tooltip>
    </button>
  );
}

function ChapterRail({
  activeTab,
}: {
  activeTab: YouTubeTab;
}) {
  return (
    <CompanyChapterRail
      company="youtube"
      chapters={YOUTUBE_TABS}
      activeId={activeTab}
      hrefFor={(id) => `/data-engineering/youtube/${id}`}
    />
  );
}

export function YouTubeFrame({
  activeTab,
  sections,
  children,
}: {
  activeTab: YouTubeTab;
  sections: readonly PageSection[];
  children: React.ReactNode;
  previous?: { id: YouTubeTab; label: string };
  next?: { id: YouTubeTab; label: string };
}) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");
  const activeSectionIndex = Math.max(0, sections.findIndex((section) => section.id === activeSection));
  const sectionProgress = ((activeSectionIndex + 1) / Math.max(1, sections.length)) * 100;

  useEffect(() => {
    const sync = () => {
      setActiveSection(getActiveDataDesignSection(sections));
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, [sections]);

  const go = (id: string) => {
    setActiveSection(id);
    history.replaceState(null, "", `${window.location.pathname}#${id}`);
    scrollToDataDesignSection(id);
  };

  return (
    <div className="youtube-de-page min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <ChapterRail activeTab={activeTab} />
      <MobileSectionNav sections={sections} accent={RED} />
      <div className="mx-auto flex max-w-[1600px] px-4">
        <aside className="hidden w-[250px] shrink-0 border-r border-[var(--border)] xl:block">
          <div className="fixed bottom-4 top-[140px] w-[218px] overflow-y-auto pr-1">
            <div className="mb-6 flex items-center gap-3">
              <Image
                src="/logo-youtube.webp"
                alt="YouTube"
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg object-contain"
              />
              <p className="text-base font-bold">YouTube</p>
            </div>
            <div data-testid="desktop-section-progress" className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
              <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--text-faint)]">
                <span>Page sections</span>
                <span>{activeSectionIndex + 1}/{sections.length}</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--bg-muted)]" aria-hidden="true">
                <span className="block h-full bg-[#b00020] transition-[width]" style={{ width: `${sectionProgress}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              {sections.map((section, index) => {
                const current = activeSection === section.id;
                return (
                  <button
                    type="button"
                    key={section.id}
                    onClick={() => go(section.id)}
                    aria-current={current ? "location" : undefined}
                    className="relative flex min-h-[54px] w-full items-center gap-3 overflow-hidden rounded-md border px-3 py-2 text-left text-xs font-semibold leading-4 transition-all"
                    style={{
                      borderColor: current ? RED : "var(--border)",
                      background: current
                        ? "color-mix(in srgb, #b00020 9%, var(--bg-card))"
                        : "var(--bg-card)",
                      color: current ? "var(--text)" : "var(--text-muted)",
                    }}
                  >
                    {current ? (
                      <span className="absolute inset-y-0 left-0 w-1 bg-[#b00020]" />
                    ) : null}
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{
                        background: current ? RED : "var(--bg-muted)",
                        color: current ? "white" : "var(--text-faint)",
                      }}
                    >
                      {index + 1}
                    </span>
                    {section.title}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section
          data-de-content
          aria-label={`${YOUTUBE_TABS.find((tab) => tab.id === activeTab)?.label ?? "Data Engineering"} chapter content`}
          className="youtube-de-content min-w-0 flex-1 py-6 xl:pl-8"
        >
          <h1 className="sr-only">
            YouTube data platform — {YOUTUBE_TABS.find((tab) => tab.id === activeTab)?.label}
          </h1>
          <div className="space-y-4">{children}</div>
        </section>
      </div>
      <style>{`
        .youtube-de-page {
          --bg: #f4f7fb;
          --bg-card: #ffffff;
          --bg-muted: #eef4f9;
          --border: #d6e1eb;
          --text: #17202b;
          --text-muted: #526171;
          --text-faint: #59697a;
          color-scheme: light;
        }

        .youtube-de-page > .fixed,
        .youtube-de-page > div > .youtube-de-content,
        .youtube-de-page > div > aside > .fixed {
          filter: grayscale(.92);
        }

        .youtube-de-page .youtube-de-content button,
        .youtube-de-page aside button {
          transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }

        .youtube-de-page .youtube-de-content button:hover,
        .youtube-de-page .youtube-de-content button:focus-visible,
        .youtube-de-page aside button:hover,
        .youtube-de-page aside button:focus-visible {
          background: #e7eef5 !important;
          border-color: #9eb0c1 !important;
          box-shadow: 0 8px 24px rgb(60 78 96 / 14%);
        }

        .youtube-de-page .youtube-de-content [aria-current="page"],
        .youtube-de-page .youtube-de-content [aria-current="location"],
        .youtube-de-page aside [aria-current="location"] {
          border-color: #91a4b7 !important;
          background: #e8eff6 !important;
        }

      `}</style>
    </div>
  );
}
