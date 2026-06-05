import Link from "next/link";

const LINKS = [
  { href: "/tech-news",   label: "Tech News" },
  { href: "/big-data",    label: "Big Data" },
  { href: "/ai",          label: "AI & LLMs" },
  { href: "/interview",   label: "Interview" },
  { href: "/cheatsheets", label: "Cheatsheets" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-auto py-10 bg-[var(--bg-muted)]">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div>
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
            <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
              One-stop platform for Big Data and AI engineers — system design, setup guides, interview prep, and cheatsheets.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-text)] transition-colors">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="pt-6 border-t border-[var(--border)] text-sm text-[var(--text-faint)] text-center">
          © {new Date().getFullYear()} withsoon.com — Built in public
        </div>
      </div>
    </footer>
  );
}
