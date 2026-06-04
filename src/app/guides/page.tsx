import Link from "next/link";
import { getGuidePosts } from "@/lib/posts";

export const metadata = {
  title: "Guides — withsoon",
  description: "Step-by-step tutorials for RAG pipelines, LLM integrations, and AI tooling.",
};

export default function GuidesPage() {
  const guides = getGuidePosts();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold mb-2">Guides</h1>
      <p className="text-gray-400 mb-12">
        Step-by-step tutorials — build RAG pipelines, use the latest AI tools, and set up production-ready systems.
      </p>

      {guides.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-10 text-center text-gray-500">
          First guide coming soon.
        </div>
      ) : (
        <ul className="space-y-6">
          {guides.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/guides/${guide.slug}`}
                className="group block p-6 rounded-xl border border-[var(--border)] bg-[var(--muted)] hover:border-[var(--accent)]/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-gray-500">{guide.date}</span>
                  {guide.tags.map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent-light)]">
                      {t}
                    </span>
                  ))}
                </div>
                <h2 className="text-lg font-semibold group-hover:text-[var(--accent-light)] transition-colors">
                  {guide.title}
                </h2>
                <p className="text-sm text-gray-400 mt-1">{guide.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
