"use client";

import { useEffect, useState, useRef } from "react";

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function buildHeadings(): Heading[] {
  const els = document.querySelectorAll("article h2, article h3");
  const headings: Heading[] = [];
  els.forEach((el) => {
    const level = el.tagName === "H2" ? 2 : 3;
    const text = el.textContent ?? "";
    // Ensure the element has an id for anchor linking
    if (!el.id) {
      el.id = slugify(text);
    }
    headings.push({ id: el.id, text, level });
  });
  return headings;
}

export default function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const h = buildHeadings();
    setHeadings(h);
    if (h.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0% -70% 0%" }
    );

    h.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  if (headings.length < 3) return null;

  return (
    <>
      {/* Desktop sticky TOC */}
      <nav
        aria-label="Table of contents"
        className="hidden xl:block fixed top-24 right-6 w-56 max-h-[70vh] overflow-y-auto text-xs z-10"
      >
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="font-semibold text-[var(--text)] mb-3 text-[11px] uppercase tracking-wider">On this page</p>
          <ul className="space-y-1">
            {headings.map(({ id, text, level }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={`block truncate py-0.5 transition-colors ${
                    level === 3 ? "pl-3" : ""
                  } ${
                    activeId === id
                      ? "text-[var(--accent-text)] font-semibold"
                      : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                  }`}
                >
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile collapsible TOC */}
      <div className="xl:hidden mb-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--text)]"
        >
          <span>On this page</span>
          <svg
            className={`w-4 h-4 text-[var(--text-faint)] transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <ul className="px-4 pb-4 space-y-1 border-t border-[var(--border)]">
            {headings.map(({ id, text, level }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={() => setOpen(false)}
                  className={`block text-xs py-1 truncate transition-colors ${
                    level === 3 ? "pl-3" : ""
                  } ${
                    activeId === id
                      ? "text-[var(--accent-text)] font-semibold"
                      : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                  }`}
                >
                  {text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
