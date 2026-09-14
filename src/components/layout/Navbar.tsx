"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

export default function Navbar() {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_90%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between px-4 sm:px-7">
        <Link href="/" className="group flex items-center gap-2" aria-label="withsoon home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--text)] text-[var(--bg)] transition-transform group-hover:-rotate-3">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></svg>
          </span>
          <span className="text-lg font-black tracking-[-.04em] text-[var(--text)]">withsoon</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/#data-engineering-designs" className="rounded-lg px-3 py-2 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--bg-muted)] hover:text-[var(--text)]">
            Data Engineering Designs
          </Link>
          <button
            type="button"
            onClick={() => mounted && setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--bg-muted)] hover:text-[var(--text)]"
            aria-label="Toggle color theme"
          >
            {!mounted ? null : resolvedTheme === "dark" ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" /></svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
