import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-6xl mb-6" style={{ opacity: 0.3 }}>404</p>
      <h1 className="text-2xl font-bold mb-3 text-[var(--text)]">Page not found</h1>
      <p className="text-[var(--text-muted)] mb-10">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/" className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold transition-opacity text-sm">
          ← Home
        </Link>
        <Link href="/system-design/netflix/architecture" className="px-5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] hover:border-[var(--accent)] font-semibold transition-colors text-sm">
          🏗️ Netflix System Design
        </Link>
        <Link href="/big-data" className="px-5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] hover:border-[var(--accent)] font-semibold transition-colors text-sm">
          🗄️ Big Data
        </Link>
        <Link href="/interview" className="px-5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] hover:border-[var(--accent)] font-semibold transition-colors text-sm">
          🎯 Interview Prep
        </Link>
      </div>
    </div>
  );
}
