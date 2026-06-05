"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  {
    href: "/radar",
    label: "Radar",
    emoji: "📡",
    desc: "Latest AI & Data news",
  },
  {
    href: "/big-data",
    label: "Big Data",
    emoji: "🗄️",
    desc: "Kafka, Spark, Flink, dbt...",
  },
  {
    href: "/ai",
    label: "AI & LLMs",
    emoji: "🤖",
    desc: "Models, RAG, agents, prompts",
  },
  {
    href: "/tools",
    label: "Tools",
    emoji: "🛠️",
    desc: "Curated tool directory",
  },
  {
    href: "/interview",
    label: "Interview",
    emoji: "🎯",
    desc: "Prep for Big Data & AI roles",
  },
  {
    href: "/reference",
    label: "Reference",
    emoji: "📚",
    desc: "SQL, DSA, System Design",
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between h-14 gap-4">
          {/* Logo */}
          <Link href="/" className="font-bold text-lg tracking-tight shrink-0">
            <span className="text-[var(--accent-light)]">with</span>soon
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 text-sm">
            {NAV.map(({ href, label, emoji }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    active
                      ? "bg-[var(--accent)]/15 text-[var(--accent-light)]"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="text-base">{emoji}</span>
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline text-xs px-1.5 py-0.5 rounded bg-white/5 border border-white/10">⌘K</kbd>
            </button>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <nav className="lg:hidden border-t border-[var(--border)] bg-[var(--background)] px-4 py-3 grid grid-cols-2 gap-2">
            {NAV.map(({ href, label, emoji, desc }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-2 p-3 rounded-lg transition-colors ${
                    active
                      ? "bg-[var(--accent)]/15 text-[var(--accent-light)]"
                      : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  <span className="text-xl mt-0.5">{emoji}</span>
                  <div>
                    <div className="font-medium text-sm">{label}</div>
                    <div className="text-xs text-gray-500">{desc}</div>
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

function SearchModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[var(--muted)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            type="text"
            placeholder="Search guides, tools, interview questions..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          />
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xs border border-[var(--border)] px-2 py-1 rounded">
            ESC
          </button>
        </div>
        <div className="p-4 text-sm text-gray-500 text-center">
          Start typing to search across all sections
        </div>
      </div>
    </div>
  );
}
