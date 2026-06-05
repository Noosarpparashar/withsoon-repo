"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";

const NAV = [
  { href: "/tech-news",   label: "Tech News",   emoji: "📰", desc: "Latest AI & Data news" },
  { href: "/big-data",    label: "Big Data",    emoji: "🗄️", desc: "Kafka, Spark, Flink, dbt..." },
  { href: "/ai",          label: "AI & LLMs",  emoji: "🤖", desc: "Models, RAG, agents, prompts" },
  { href: "/interview",   label: "Interview",   emoji: "🎯", desc: "Prep for Big Data & AI roles" },
  { href: "/cheatsheets", label: "Cheatsheets", emoji: "📋", desc: "SQL, DSA, System Design, Cloud" },
  { href: "/tools",       label: "Tools",       emoji: "🛠️", desc: "Tool comparisons & new launches" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 flex items-center justify-between h-14 gap-4">

        {/* Logo */}
        <Link href="/" className="font-bold text-lg tracking-tight shrink-0 text-[var(--text)]">
          <span className="text-[var(--accent-text)]">with</span>soon
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5 text-sm">
          {NAV.map(({ href, label, emoji }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-muted)]"
                }`}
              >
                <span>{emoji}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right: search + theme toggle + hamburger */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-faint)] transition-colors text-sm bg-[var(--bg-card)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
            <kbd className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-muted)] border border-[var(--border)] font-sans">⌘K</kbd>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-muted)] transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M18.364 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-muted)] transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="lg:hidden border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 grid grid-cols-2 gap-2">
          {NAV.map(({ href, label, emoji, desc }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-start gap-2 p-3 rounded-xl transition-colors ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                    : "text-[var(--text)] hover:bg-[var(--bg-muted)]"
                }`}
              >
                <span className="text-xl mt-0.5">{emoji}</span>
                <div>
                  <div className="font-semibold text-sm">{label}</div>
                  <div className="text-xs text-[var(--text-muted)]">{desc}</div>
                </div>
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
