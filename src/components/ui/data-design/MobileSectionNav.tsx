"use client";

import { useEffect, useRef, useState } from "react";
import {
  alignDataDesignHash,
  getActiveDataDesignSection,
  scrollToDataDesignSection,
} from "./sectionAnchors";

export type MobilePageSection = {
  id: string;
  title: string;
};

export default function MobileSectionNav({
  sections,
  accent = "#526b82",
  stickyOffset = "var(--de-chapter-shell-offset)",
}: {
  sections: readonly MobilePageSection[];
  accent?: string;
  stickyOffset?: string;
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const scrollportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrame = 0;
    const sync = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        setActiveId(getActiveDataDesignSection(sections));
      });
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sections]);

  useEffect(() => {
    const alignHash = () => alignDataDesignHash(sections, setActiveId);
    let cancelAlignment = alignHash();
    const onHashChange = () => {
      cancelAlignment();
      cancelAlignment = alignHash();
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      cancelAlignment();
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [sections]);

  useEffect(() => {
    const scrollport = scrollportRef.current;
    const activeButton = scrollport?.querySelector<HTMLElement>(
      `[data-mobile-section-id="${CSS.escape(activeId)}"]`,
    );
    if (!scrollport || !activeButton) return;

    const left =
      activeButton.offsetLeft -
      (scrollport.clientWidth - activeButton.offsetWidth) / 2;
    scrollport.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [activeId]);

  const goToSection = (section: MobilePageSection) => {
    const node = document.getElementById(section.id);
    if (!node) return;

    setActiveId(section.id);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${section.id}`,
    );
    scrollToDataDesignSection(
      section.id,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    );
  };

  const activeTitle =
    sections.find((section) => section.id === activeId)?.title ??
    sections[0]?.title ??
    "";
  const activeIndex = Math.max(0, sections.findIndex((section) => section.id === activeId));
  const progress = ((activeIndex + 1) / Math.max(1, sections.length)) * 100;

  if (!sections.length) return null;

  return (
    <nav
      data-testid="mobile-section-nav"
      aria-label="Sections on this page"
      className="sticky z-[35] h-[var(--de-section-nav-height)] border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_96%,transparent)] px-3 shadow-sm backdrop-blur-xl transition-[top] duration-200 xl:hidden"
      style={{ top: stickyOffset }}
    >
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-2">
        <span
          data-testid="mobile-section-progress"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[10px] font-bold text-[var(--text-muted)]"
          aria-label={`Section ${activeIndex + 1} of ${sections.length}`}
        >
          {activeIndex + 1}/{sections.length}
          <span className="absolute inset-x-0 bottom-0 h-1 bg-[var(--bg-muted)]" aria-hidden="true">
            <span className="block h-full transition-[width]" style={{ width: `${progress}%`, background: accent }} />
          </span>
        </span>
        <div
          ref={scrollportRef}
          data-testid="mobile-section-scrollport"
          className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain no-scrollbar"
        >
          <div className="flex w-max items-center gap-2 pr-2">
            {sections.map((section, index) => {
              const active = section.id === activeId;
              return (
                <button
                  key={section.id}
                  type="button"
                  data-mobile-section-id={section.id}
                  data-testid={`mobile-section-${section.id}`}
                  aria-current={active ? "location" : undefined}
                  onClick={() => goToSection(section)}
                  className="relative h-11 shrink-0 rounded-lg border bg-[var(--bg-card)] px-2.5 text-[11px] font-semibold text-[var(--text-muted)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 sm:px-3"
                  style={{
                    borderColor: active ? accent : "var(--border)",
                    color: active ? "var(--text)" : "var(--text-muted)",
                    background: active
                      ? `color-mix(in srgb, ${accent} 10%, var(--bg-card))`
                      : "var(--bg-card)",
                    outlineColor: accent,
                  }}
                >
                  <span className="mr-1.5 text-[9px] font-bold" style={{ color: active ? accent : "var(--text-faint)" }}>
                    {index + 1}
                  </span>
                  {section.title}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Current section: {activeTitle}
      </p>
    </nav>
  );
}
