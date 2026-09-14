"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import CompanyChapterRail from "../data-design/CompanyChapterRail";
import {
  type PageSection,
  type YouTubeTab,
  YOUTUBE_TABS,
} from "./data";

export const RED = "#ff0033";

export function Tooltip({
  children,
  align = "center",
  side = "top",
  wide = false,
}: {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
  wide?: boolean;
}) {
  const position =
    align === "start"
      ? "left-0"
      : align === "end"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";
  return (
    <span
      role="tooltip"
      data-side={side}
      className={`pointer-events-none absolute z-50 hidden ${wide ? "w-[34rem] max-w-[calc(100vw-2rem)]" : "w-72"} rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-left text-xs font-normal leading-5 text-[var(--text)] shadow-xl group-hover:block group-focus-visible:block ${side === "top" ? "bottom-[calc(100%+9px)]" : "top-[calc(100%+9px)]"} ${position}`}
    >
      {children}
    </span>
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
      style={{ scrollMarginTop: 140 }}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-[10px] font-bold text-[#ff0033]">
          {number}
        </span>
        <h2 className="text-xl font-semibold md:text-2xl">{title}</h2>
      </div>
      {children}
    </section>
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
      className={`group relative rounded-xl border bg-[var(--bg-muted)] p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0033] ${className}`}
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
      <Tooltip align={align} side={side}>{detail}</Tooltip>
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

  useEffect(() => {
    const sync = () => {
      let current = sections[0]?.id ?? "";
      for (const section of sections) {
        const node = document.getElementById(section.id);
        if (node && node.getBoundingClientRect().top <= 190) current = section.id;
      }
      const atPageEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 8;
      if (atPageEnd) current = sections.at(-1)?.id ?? current;
      setActiveSection(current);
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, [sections]);

  const go = (id: string) => {
    setActiveSection(id);
    history.replaceState(null, "", `${window.location.pathname}#${id}`);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="youtube-de-page min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <ChapterRail activeTab={activeTab} />
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
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-[var(--text-faint)]">
              Page anchors
            </p>
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
                        ? "color-mix(in srgb, #ff0033 9%, var(--bg-card))"
                        : "var(--bg-card)",
                      color: current ? "var(--text)" : "var(--text-muted)",
                    }}
                  >
                    {current ? (
                      <span className="absolute inset-y-0 left-0 w-1 bg-[#ff0033]" />
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

        <main className="min-w-0 flex-1 py-6 xl:pl-8">
          <h1 className="sr-only">
            YouTube data platform — {YOUTUBE_TABS.find((tab) => tab.id === activeTab)?.label}
          </h1>
          <div className="space-y-4">{children}</div>
        </main>
      </div>
      <style>{`
        .youtube-de-page {
          --bg: #f4f7fb;
          --bg-card: #ffffff;
          --bg-muted: #eef4f9;
          --border: #d6e1eb;
          --text: #17202b;
          --text-muted: #526171;
          --text-faint: #76879a;
          color-scheme: light;
        }

        .youtube-de-page > .fixed,
        .youtube-de-page > div > main,
        .youtube-de-page > div > aside > .fixed {
          filter: grayscale(.92);
        }

        .youtube-de-page main button,
        .youtube-de-page aside button,
        .youtube-de-page > .fixed a {
          transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }

        .youtube-de-page main button:hover,
        .youtube-de-page main button:focus-visible,
        .youtube-de-page aside button:hover,
        .youtube-de-page aside button:focus-visible,
        .youtube-de-page > .fixed a:hover,
        .youtube-de-page > .fixed a:focus-visible {
          background: #e7eef5 !important;
          border-color: #9eb0c1 !important;
          box-shadow: 0 8px 24px rgb(60 78 96 / 14%);
        }

        .youtube-de-page [aria-current="page"],
        .youtube-de-page [aria-current="location"] {
          border-color: #91a4b7 !important;
          background: #e8eff6 !important;
        }

        .youtube-de-page [role="tooltip"]::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: var(--border);
        }

        .youtube-de-page [role="tooltip"][data-side="bottom"]::after {
          top: auto;
          bottom: 100%;
          border-top-color: transparent;
          border-bottom-color: var(--border);
        }
      `}</style>
    </div>
  );
}
