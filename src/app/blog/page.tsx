import Link from "next/link";
import { getBlogPosts } from "@/lib/posts";

export const metadata = {
  title: "Blog — withsoon",
  description: "AI experiments, project breakdowns, and lessons learned building with LLMs.",
};

export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold mb-2">Blog</h1>
      <p className="text-gray-400 mb-12">Experiments, project breakdowns, and things I learned building with AI.</p>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-10 text-center text-gray-500">
          First post coming soon.
        </div>
      ) : (
        <ul className="space-y-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block p-6 rounded-xl border border-[var(--border)] bg-[var(--muted)] hover:border-[var(--accent)]/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-gray-500">{post.date}</span>
                  {post.tags.map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent-light)]">
                      {t}
                    </span>
                  ))}
                </div>
                <h2 className="text-lg font-semibold group-hover:text-[var(--accent-light)] transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-400 mt-1">{post.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
