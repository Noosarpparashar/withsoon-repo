import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Content } from "@/lib/content";

const SECTION_META: Record<string, { label: string; color: string; href: string }> = {
  radar: { label: "Radar", color: "text-yellow-400", href: "/radar" },
  "big-data": { label: "Big Data", color: "text-blue-400", href: "/big-data" },
  ai: { label: "AI & LLMs", color: "text-purple-400", href: "/ai" },
  tools: { label: "Tools", color: "text-green-400", href: "/tools" },
  interview: { label: "Interview", color: "text-orange-400", href: "/interview" },
  reference: { label: "Reference", color: "text-pink-400", href: "/reference" },
};

const DIFFICULTY_COLORS = {
  beginner: "text-green-400 bg-green-400/10 border-green-400/20",
  intermediate: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  advanced: "text-red-400 bg-red-400/10 border-red-400/20",
};

export default function ArticlePage({ post }: { post: Content }) {
  const meta = SECTION_META[post.section];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link href={meta.href} className={`hover:text-white transition-colors ${meta.color}`}>{meta.label}</Link>
        <span>/</span>
        <span className="text-gray-400 truncate">{post.title}</span>
      </div>

      {/* Header */}
      <div className="mb-10 pb-8 border-b border-[var(--border)]">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${meta.color} bg-current/10 border-current/20`}>
            {meta.label}
          </span>
          {post.difficulty && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[post.difficulty]}`}>
              {post.difficulty}
            </span>
          )}
          {post.company && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
              {post.company}
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{post.title}</h1>
        <p className="text-lg text-gray-400 mb-4">{post.summary}</p>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          {post.date && <span>📅 {post.date}</span>}
          <div className="flex flex-wrap gap-1">
            {post.tags.map((tag) => (
              <span key={tag} className="bg-white/5 px-2 py-0.5 rounded text-xs">#{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* MDX Content */}
      <article className="prose prose-invert prose-violet max-w-none
        prose-headings:font-bold prose-headings:tracking-tight
        prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
        prose-p:text-gray-300 prose-p:leading-relaxed
        prose-a:text-[var(--accent-light)] prose-a:no-underline hover:prose-a:underline
        prose-code:text-[var(--accent-light)] prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-[var(--muted)] prose-pre:border prose-pre:border-[var(--border)] prose-pre:rounded-xl
        prose-blockquote:border-[var(--accent)] prose-blockquote:text-gray-400
        prose-table:text-sm prose-th:text-gray-300 prose-td:text-gray-400 prose-thead:border-[var(--border)] prose-tr:border-[var(--border)]
        prose-strong:text-white
        prose-li:text-gray-300
      ">
        <MDXRemote source={post.content} />
      </article>

      {/* Back link */}
      <div className="mt-12 pt-8 border-t border-[var(--border)]">
        <Link href={meta.href} className={`text-sm hover:underline ${meta.color}`}>
          ← Back to {meta.label}
        </Link>
      </div>
    </div>
  );
}
