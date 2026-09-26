"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type InterviewPathStep = {
  title: string;
  detail: string;
};

export function InterviewPath({
  title,
  summary,
  steps,
  accent = "#526b82",
}: {
  title: string;
  summary: string;
  steps: readonly InterviewPathStep[];
  accent?: string;
}) {
  return (
    <section
      data-testid="interview-path"
      aria-labelledby="interview-path-title"
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 md:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: accent }}>
            Two-minute interview path
          </p>
          <h2 id="interview-path-title" className="mt-1 text-lg font-semibold text-[var(--text)] md:text-xl">
            {title}
          </h2>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--text-muted)]">
          Lead with this
        </span>
      </div>
      <p className="mt-2 max-w-4xl text-xs leading-5 text-[var(--text-muted)] md:text-sm md:leading-6">
        {summary}
      </p>
      <ol className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {steps.map((step, index) => (
          <li key={step.title} className="relative grid grid-cols-[24px_1fr] gap-x-2 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-2.5 md:block md:p-3">
            <span
              className="row-span-2 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: accent }}
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <strong className="block text-xs text-[var(--text)] md:mt-2">{step.title}</strong>
            <span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">{step.detail}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function CoreTakeaway({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="core-takeaway"
      className="mt-4 rounded-xl border border-[#b6c7d7] bg-[#eef4f9] px-4 py-3 text-sm leading-6 text-[#344657]"
    >
      <strong className="mr-1 text-[#17202b]">Core argument:</strong>
      {children}
    </div>
  );
}

export function DepthPanel({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const panelRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    let wasDesktop = false;
    const syncPresentation = () => {
      const panel = panelRef.current;
      if (!panel) return;
      if (media.matches) panel.open = true;
      else if (wasDesktop) panel.open = defaultOpen;
      wasDesktop = media.matches;
    };

    syncPresentation();
    media.addEventListener("change", syncPresentation);
    return () => media.removeEventListener("change", syncPresentation);
  }, [defaultOpen]);

  return (
    <details
      ref={panelRef}
      data-depth-panel
      data-testid="depth-panel"
      open={defaultOpen || undefined}
      className="group mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#526b82] focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-[var(--text)]">{title}</span>
          <span className="mt-0.5 block text-[11px] leading-4 text-[var(--text-muted)]">{summary}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--text-muted)]">
          <span className="group-open:hidden">Explore</span>
          <span className="hidden group-open:inline">Collapse</span>
          <svg className="h-4 w-4 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div data-depth-content className="border-t border-[var(--border)] p-4 md:p-5">{children}</div>
    </details>
  );
}
