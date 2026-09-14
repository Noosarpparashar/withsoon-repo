import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--text-faint)]">404</p>
      <h1 className="mt-4 text-3xl font-bold text-[var(--text)]">Page not found</h1>
      <p className="mt-3 text-sm text-[var(--text-muted)]">Return to the data engineering design library and choose a company track.</p>
      <Link href="/" className="mt-7 rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-bold text-[var(--bg)]">Open the library</Link>
    </main>
  );
}
