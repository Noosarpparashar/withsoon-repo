import Link from "next/link";

const LINKS = [
  { href: "/radar", label: "Radar" },
  { href: "/big-data", label: "Big Data" },
  { href: "/ai", label: "AI & LLMs" },
  { href: "/tools", label: "Tools" },
  { href: "/interview", label: "Interview" },
  { href: "/reference", label: "Reference" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-auto py-10 bg-[var(--muted)]">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div>
            <div className="font-bold text-lg mb-2">
              <span className="text-[var(--accent-light)]">with</span>soon
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              One-stop platform for Big Data and AI engineers. System design, guides, interview prep, and tool discovery.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="text-sm text-gray-500 hover:text-[var(--accent-light)] transition-colors">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="pt-6 border-t border-[var(--border)] text-sm text-gray-600 text-center">
          © {new Date().getFullYear()} withsoon.com — Built in public
        </div>
      </div>
    </footer>
  );
}
