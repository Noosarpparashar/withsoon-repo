"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MAIN_LINKS = [
  { href: "/tech-news",   label: "Tech News" },
  { href: "/big-data",    label: "Big Data" },
  { href: "/ai",          label: "AI & LLMs" },
  { href: "/interview",   label: "Interview" },
  { href: "/cheatsheets", label: "Cheatsheets" },
];

const META_LINKS = [
  { href: "/about",     label: "About" },
  { href: "/roadmap",   label: "Roadmap" },
  { href: "/changelog", label: "Changelog" },
  { href: "/system-design/netflix/architecture", label: "Netflix System Design" },
  { href: "/system-design/netflix-data-engineering/start-here", label: "Netflix Data Engineering" },
];

export default function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith("/system-design/netflix") || pathname.startsWith("/system-design/netflix-data-engineering")) {
    return null;
  }

  return (
    <footer className="border-t border-[var(--border)] mt-auto py-10 bg-[var(--bg-muted)]">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--blue)]">
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </span>
              <span className="font-black text-lg tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-[var(--blue)]">with</span><span className="text-[var(--text)]">soon</span>
              </span>
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-3">
              One-stop platform for Big Data and AI engineers — system design, setup guides, interview prep, and cheatsheets.
            </p>
            <p className="text-xs text-[var(--text-faint)]">
              Built by{" "}
              <a
                href="https://github.com/Noosarpparashar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-text)] hover:underline"
              >
                Prasoon Parashar
              </a>
            </p>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-8">
            <div>
              <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider mb-3">Content</p>
              <nav className="flex flex-col gap-2">
                {MAIN_LINKS.map(({ href, label }) => (
                  <Link key={href} href={href} className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-text)] transition-colors">
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider mb-3">Site</p>
              <nav className="flex flex-col gap-2">
                {META_LINKS.map(({ href, label }) => (
                  <Link key={href} href={href} className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-text)] transition-colors">
                    {label}
                  </Link>
                ))}
                <a
                  href="https://github.com/Noosarpparashar/withsoon-repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-text)] transition-colors inline-flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                  GitHub
                </a>
                <a
                  href="https://github.com/Noosarpparashar/withsoon-repo/issues/new?title=Content+correction&body=Page:%0A%0AIssue:"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-text)] transition-colors"
                >
                  Suggest a correction
                </a>
              </nav>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-[var(--text-faint)]">
          <span>© {new Date().getFullYear()} withsoon.com — Built in public</span>
          <span className="text-xs">
            Interactive system design &amp; data engineering interview prep
          </span>
        </div>
      </div>
    </footer>
  );
}
