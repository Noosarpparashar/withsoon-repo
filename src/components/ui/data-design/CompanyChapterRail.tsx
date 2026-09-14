"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import DataDesignSwitcher, { type DataDesignCompany } from "./DataDesignSwitcher";

type Chapter = { id: string; label: string };

export default function CompanyChapterRail({
  company,
  chapters,
  activeId,
  hrefFor,
  onNavigate,
}: {
  company: DataDesignCompany;
  chapters: readonly Chapter[];
  activeId: string;
  hrefFor: (id: string) => string;
  onNavigate?: (id: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(0, chapters.findIndex((chapter) => chapter.id === activeId));
  const previous = chapters[activeIndex - 1];
  const next = chapters[activeIndex + 1];
  const progress = ((activeIndex + 1) / chapters.length) * 100;

  useEffect(() => {
    railRef.current
      ?.querySelector<HTMLElement>("[aria-current='page']")
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeId]);

  const navigate = (id: string) => {
    if (onNavigate) onNavigate(id);
  };

  const arrow = (chapter: Chapter | undefined, direction: "previous" | "next") => {
    const symbol = direction === "previous" ? "←" : "→";
    if (!chapter) {
      return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-muted)] text-lg text-[var(--text-faint)] opacity-45" aria-hidden>{symbol}</span>;
    }
    const classes = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-lg font-semibold text-[var(--text)] transition hover:-translate-y-0.5 hover:border-[#526b82] hover:bg-[var(--bg-muted)]";
    const label = `${direction === "previous" ? "Previous" : "Next"} chapter: ${chapter.label}`;
    return onNavigate ? (
      <button type="button" onClick={() => navigate(chapter.id)} aria-label={label} title={label} className={classes}>{symbol}</button>
    ) : (
      <Link href={hrefFor(chapter.id)} aria-label={label} title={label} className={classes}>{symbol}</Link>
    );
  };

  return (
    <>
      <div data-testid="company-chapter-rail" className="fixed inset-x-0 top-14 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] shadow-sm backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-[var(--bg-muted)]" aria-hidden>
          <span className="block h-full bg-[#526b82] transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mx-auto flex h-[68px] max-w-[1800px] items-center gap-2 px-3 pt-1">
          <DataDesignSwitcher current={company} />
          <div className="hidden h-11 shrink-0 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 sm:flex">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[var(--text-faint)]">Progress</p>
              <p className="mt-0.5 text-xs font-semibold text-[var(--text)]">Chapter {activeIndex + 1} / {chapters.length}</p>
            </div>
            <div className="h-7 w-px bg-[var(--border)]" />
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[var(--bg-muted)]">
              <span className="block h-full rounded-full bg-[#526b82]" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {arrow(previous, "previous")}

          <div ref={railRef} className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
            <div className="flex min-w-max items-center justify-center gap-2 px-1 xl:min-w-full">
              {chapters.map((chapter, index) => {
                const active = chapter.id === activeId;
                const classes = "relative flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition hover:-translate-y-0.5 hover:bg-[var(--bg-muted)]";
                const style = {
                  borderColor: active ? "#526b82" : "var(--border)",
                  background: active ? "color-mix(in srgb, #526b82 10%, var(--bg-card))" : "var(--bg-card)",
                  color: active ? "var(--text)" : "var(--text-muted)",
                };
                const content = (
                  <>
                    {active ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#526b82]" /> : null}
                    <span className="text-[9px] font-bold" style={{ color: active ? "#526b82" : "var(--text-faint)" }}>{String(index + 1).padStart(2, "0")}</span>
                    <span className="whitespace-nowrap">{chapter.label}</span>
                  </>
                );
                return onNavigate ? (
                  <button key={chapter.id} type="button" aria-current={active ? "page" : undefined} onClick={() => navigate(chapter.id)} className={classes} style={style}>{content}</button>
                ) : (
                  <Link key={chapter.id} href={hrefFor(chapter.id)} aria-current={active ? "page" : undefined} className={classes} style={style}>{content}</Link>
                );
              })}
            </div>
          </div>

          {arrow(next, "next")}
        </div>
      </div>
      <div className="h-[68px] shrink-0" aria-hidden />
    </>
  );
}
