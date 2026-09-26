"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import DataDesignSwitcher, { type DataDesignCompany } from "./DataDesignSwitcher";

type Chapter = { id: string; label: string };

function ChapterChevron({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={direction === "previous" ? "m12.5 4-6 6 6 6" : "m7.5 4 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  const [overflow, setOverflow] = useState({ left: false, right: false });
  const activeIndex = Math.max(0, chapters.findIndex((chapter) => chapter.id === activeId));
  const previous = chapters[activeIndex - 1];
  const next = chapters[activeIndex + 1];
  const chapterPosition = ((activeIndex + 1) / chapters.length) * 100;
  const chapterPositionLabel = `Chapter ${activeIndex + 1} of ${chapters.length}`;

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const updateOverflowCues = () => {
      const maxLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
      const next = {
        left: rail.scrollLeft > 2,
        right: rail.scrollLeft < maxLeft - 2,
      };
      setOverflow((current) => current.left === next.left && current.right === next.right ? current : next);
    };

    const keepActiveChapterVisible = () => {
      const activeChapter = rail.querySelector<HTMLElement>("[aria-current='page']");
      if (!activeChapter) return;

      const centeredLeft = activeChapter.offsetLeft - (rail.clientWidth - activeChapter.offsetWidth) / 2;
      const maxLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
      rail.scrollTo({ left: Math.min(maxLeft, Math.max(0, centeredLeft)), behavior: "auto" });
      updateOverflowCues();
    };

    const animationFrame = window.requestAnimationFrame(keepActiveChapterVisible);
    const resizeObserver = new ResizeObserver(keepActiveChapterVisible);
    resizeObserver.observe(rail);
    rail.addEventListener("scroll", updateOverflowCues, { passive: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      rail.removeEventListener("scroll", updateOverflowCues);
    };
  }, [activeId, chapters.length]);

  const navigate = (id: string) => {
    if (onNavigate) onNavigate(id);
  };

  const arrow = (chapter: Chapter | undefined, direction: "previous" | "next") => {
    const testId = direction === "previous" ? "chapter-previous" : "chapter-next";

    if (!chapter) {
      return (
        <span
          data-testid={testId}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text-faint)] opacity-45"
          aria-hidden
        >
          <ChapterChevron direction={direction} />
        </span>
      );
    }

    const label = `${direction === "previous" ? "Previous" : "Next"} chapter: ${chapter.label}`;

    return (
      <Link
        data-testid={testId}
        href={hrefFor(chapter.id)}
        aria-label={label}
        title={label}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] outline-none transition-colors hover:border-[#526b82] hover:bg-[var(--bg-muted)] focus-visible:ring-2 focus-visible:ring-[#526b82] focus-visible:ring-offset-2"
        onNavigate={onNavigate ? (event) => {
          event.preventDefault();
          navigate(chapter.id);
        } : undefined}
      >
        <ChapterChevron direction={direction} />
      </Link>
    );
  };

  return (
    <>
      <nav
        data-testid="company-chapter-rail"
        aria-label={`${company} data engineering chapters`}
        className="fixed inset-x-0 z-40 h-[var(--de-chapter-rail-height)] border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] shadow-sm backdrop-blur-xl transition-[top] duration-200"
        style={{ top: "var(--de-navbar-visible-height)" }}
      >
        <p data-testid="chapter-position-announcement" className="sr-only" aria-live="polite" aria-atomic="true">
          {chapterPositionLabel}: {chapters[activeIndex]?.label}
        </p>
        <div data-testid="chapter-position-track" className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-[var(--bg-muted)]" aria-hidden>
          <span className="block h-full bg-[#526b82] transition-[width] duration-300" style={{ width: `${chapterPosition}%` }} />
        </div>

        <div data-testid="chapter-rail" className="mx-auto grid h-full max-w-[1800px] grid-cols-[96px_minmax(0,1fr)_44px] items-center gap-2 px-2 pt-0.5 sm:px-3 sm:pt-1 xl:grid-cols-[380px_minmax(0,1fr)_44px]">
          <div data-testid="chapter-leading-controls" className="flex w-full min-w-0 items-center gap-2">
            <DataDesignSwitcher current={company} />
            <div data-testid="chapter-position" className="hidden h-11 w-[156px] shrink-0 items-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 xl:flex">
              <div className="min-w-0">
                <p className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text-faint)]">Chapter position</p>
                <p className="mt-0.5 whitespace-nowrap text-xs font-semibold text-[var(--text)]">{chapterPositionLabel}</p>
              </div>
            </div>
            {arrow(previous, "previous")}
          </div>

          <div data-testid="chapter-scroll-shell" className="relative min-w-0 overflow-hidden">
            <div
              ref={railRef}
              data-testid="chapter-scrollport"
              className="min-w-0 snap-x snap-proximity scroll-px-5 overflow-x-auto overscroll-x-contain px-5 no-scrollbar sm:scroll-px-6 sm:px-6"
            >
              <div className="flex w-max min-w-full items-center gap-2">
              {chapters.map((chapter, index) => {
                const active = chapter.id === activeId;

                return (
                  <Link
                    key={chapter.id}
                    data-testid={`chapter-link-${chapter.id}`}
                    href={hrefFor(chapter.id)}
                    aria-current={active ? "page" : undefined}
                    className="relative flex h-11 shrink-0 snap-center items-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 text-xs font-semibold text-[var(--text-muted)] outline-none transition-colors first:ml-auto last:mr-auto hover:bg-[var(--bg-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[#526b82] focus-visible:ring-offset-2"
                    onNavigate={onNavigate ? (event) => {
                      event.preventDefault();
                      navigate(chapter.id);
                    } : undefined}
                  >
                    {active ? <span data-active-indicator className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#526b82]" /> : null}
                    <span data-testid="chapter-label" className="inline-flex items-baseline gap-1.5">
                      <span className="block w-[18px] text-right text-[9px] font-bold leading-none text-[var(--text-faint)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="block whitespace-nowrap leading-none">{chapter.label}</span>
                    </span>
                  </Link>
                );
              })}
              </div>
            </div>
            <span
              data-testid="chapter-overflow-left"
              data-visible={overflow.left ? "true" : "false"}
              className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-7 bg-gradient-to-r from-[var(--bg)] to-transparent transition-opacity duration-150 ${overflow.left ? "opacity-100" : "opacity-0"}`}
              aria-hidden="true"
            />
            <span
              data-testid="chapter-overflow-right"
              data-visible={overflow.right ? "true" : "false"}
              className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-7 bg-gradient-to-l from-[var(--bg)] to-transparent transition-opacity duration-150 ${overflow.right ? "opacity-100" : "opacity-0"}`}
              aria-hidden="true"
            />
          </div>

          {arrow(next, "next")}
        </div>
      </nav>
      <div className="h-[var(--de-chapter-rail-height)] shrink-0" aria-hidden />
    </>
  );
}
