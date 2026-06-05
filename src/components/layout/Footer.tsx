import Link from "next/link";

const LINKS = [
  { href: "/tech-news",   label: "Tech News" },
  { href: "/big-data",    label: "Big Data" },
  { href: "/ai",          label: "AI & LLMs" },
  { href: "/interview",   label: "Interview" },
  { href: "/cheatsheets", label: "Cheatsheets" },
  { href: "/tools",       label: "Tools" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-auto py-10 bg-[var(--bg-muted)]">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div>
            <div className="font-bold text-lg mb-2 text-[var(--text)]">
              <span className="text-[var(--accent-text)]">with</span>soon
            </div>
            <p className="text-sm text-[var(--text-muted)] max-w-xs">
              One-stop platform for Big Data and AI engineers — system design, guides, interview prep, and tool discovery.
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
