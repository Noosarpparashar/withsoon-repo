"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import SearchModal from "@/components/ui/SearchModal";

const NAV = [
  { href: "/tech-news",      label: "Tech News",      emoji: "📰", desc: "Latest AI & Data news" },
  { href: "/big-data",       label: "Big Data",       emoji: "🗄️", desc: "Kafka, Spark, Flink, System Design" },
  { href: "/ai",             label: "AI & LLMs",      emoji: "🤖", desc: "RAG, Agents, Providers, Setups" },
  { href: "/system-design",  label: "System Design",  emoji: "🏗️", desc: "Netflix, Uber, YouTube — deep dives" },
  { href: "/interview",      label: "Interview",      emoji: "🎯", desc: "System Design, Kafka, SQL, Behavioral" },
  { href: "/cheatsheets",    label: "Cheatsheets",    emoji: "📋", desc: "SQL, Kafka, Spark, Cloud — quick ref" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  // ⌘K / Ctrl+K opens search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between h-14 gap-4">

          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center gap-1.5 group">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--blue)] shadow-sm group-hover:shadow-[0_0_12px_var(--accent)] transition-shadow">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </span>
            <span className="font-black text-xl tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-[var(--blue)]">with</span><span className="text-[var(--text)]">soon</span>
            </span>
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

          {/* Right: search + theme + hamburger */}
          <div className="flex items-center gap-2">
            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/50 transition-colors text-sm bg-[var(--bg-card)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-muted)] border border-[var(--border)] font-sans">⌘K</kbd>
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-muted)] transition-colors"
              aria-label="Toggle theme"
            >
              {!mounted ? (
                <span className="w-4 h-4 block" />
              ) : resolvedTheme === "dark" ? (
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
            {/* Mobile search */}
            <button
              onClick={() => { setOpen(false); setSearchOpen(true); }}
              className="col-span-2 flex items-center gap-2 p-3 rounded-xl border border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-muted)] mb-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm">Search everything...</span>
            </button>
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

      {/* Search modal */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  );
}
