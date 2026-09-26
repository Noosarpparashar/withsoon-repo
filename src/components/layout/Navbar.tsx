"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function Navbar() {
  const [condensed, setCondensed] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = document.documentElement;

    const apply = (next: boolean) => {
      setCondensed(next);
      if (next) root.setAttribute("data-de-shell-condensed", "true");
      else root.removeAttribute("data-de-shell-condensed");
    };

    const sync = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      const isCompactViewport = window.matchMedia("(max-width: 1279px)").matches;
      const hasChapterRail = Boolean(document.querySelector('[data-testid="company-chapter-rail"]'));
      const headerHasFocus = headerRef.current?.contains(document.activeElement) ?? false;

      if (!isCompactViewport || !hasChapterRail || y <= 48 || headerHasFocus) {
        apply(false);
      } else if (delta > 4 && y > 96) {
        apply(true);
      } else if (delta < -4) {
        apply(false);
      }

      lastScrollY.current = y;
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      root.removeAttribute("data-de-shell-condensed");
    };
  }, []);

  return (
    <header
      ref={headerRef}
      data-testid="global-header"
      data-condensed={condensed ? "true" : "false"}
      aria-hidden={condensed || undefined}
      inert={condensed || undefined}
      onFocusCapture={() => {
        setCondensed(false);
        document.documentElement.removeAttribute("data-de-shell-condensed");
      }}
      className="sticky top-0 z-50 h-[var(--site-nav-height)] border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_90%,transparent)] backdrop-blur-xl"
    >
      <div className="mx-auto flex h-full max-w-[1500px] items-center justify-between px-3 sm:px-7">
        <Link href="/" className="group flex min-h-11 items-center gap-2" aria-label="withsoon home">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--text)] text-[var(--bg)] transition-transform group-hover:-rotate-3 sm:h-8 sm:w-8">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></svg>
          </span>
          <span className="text-lg font-black tracking-[-.04em] text-[var(--text)]">withsoon</span>
        </Link>

        <Link href="/#data-engineering-designs" aria-label="Browse Data Engineering Designs" className="inline-flex min-h-11 items-center rounded-lg px-2 py-2 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--bg-muted)] hover:text-[var(--text)] sm:px-3">
          <span className="sm:hidden" aria-hidden>Library</span>
          <span className="hidden sm:inline">Data Engineering Designs</span>
        </Link>
      </div>
    </header>
  );
}
