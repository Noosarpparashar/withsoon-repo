import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Content } from "@/lib/content";

const SECTION_META: Record<string, { label: string; colorClass: string; softClass: string; href: string }> = {
  "tech-news": { label: "Tech News",  colorClass: "text-[var(--yellow-text)]",  softClass: "bg-[var(--yellow-soft)] text-[var(--yellow-text)]",  href: "/tech-news" },
  "big-data":  { label: "Big Data",   colorClass: "text-[var(--blue-text)]",    softClass: "bg-[var(--blue-soft)] text-[var(--blue-text)]",      href: "/big-data" },
  ai:          { label: "AI & LLMs",  colorClass: "text-[var(--purple-text)]",  softClass: "bg-[var(--purple-soft)] text-[var(--purple-text)]",  href: "/ai" },
  tools:       { label: "Tools",      colorClass: "text-[var(--green-text)]",   softClass: "bg-[var(--green-soft)] text-[var(--green-text)]",    href: "/tools" },
  interview:   { label: "Interview",  colorClass: "text-[var(--orange-text)]",  softClass: "bg-[var(--orange-soft)] text-[var(--orange-text)]",  href: "/interview" },
  reference:   { label: "Reference",  colorClass: "text-[var(--pink-text)]",    softClass: "bg-[var(--pink-soft)] text-[var(--pink-text)]",      href: "/reference" },
  radar:       { label: "Tech News",  colorClass: "text-[var(--yellow-text)]",  softClass: "bg-[var(--yellow-soft)] text-[var(--yellow-text)]",  href: "/tech-news" },
};

const DIFFICULTY_CLASSES = {
  beginner:     "bg-[var(--green-soft)] text-[var(--green-text)]",
  intermediate: "bg-[var(--orange-soft)] text-[var(--orange-text)]",
  advanced:     "bg-[var(--pink-soft)] text-[var(--pink-text)]",
};

export default function ArticlePage({ post }: { post: Content }) {
  const meta = SECTION_META[post.section] ?? SECTION_META["big-data"];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-faint)] mb-8 flex-wrap">
        <Link href="/" className="hover:text-[var(--text)] transition-colors">Home</Link>
        <span>/</span>
        <Link href={meta.href} className={`hover:text-[var(--text)] transition-colors ${meta.colorClass}`}>{meta.label}</Link>
        <span>/</span>
        <span className="text-[var(--text-muted)] truncate max-w-xs">{post.title}</span>
      </div>

      {/* Header */}
      <div className="mb-10 pb-8 border-b border-[var(--border)]">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${meta.softClass}`}>{meta.label}</span>
          {post.difficulty && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${DIFFICULTY_CLASSES[post.difficulty]}`}>
              {post.difficulty}
            </span>
          )}
          {post.company && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-muted)] text-[var(--text-muted)] border border-[var(--border)]">
              {post.company}
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight text-[var(--text)]">{post.title}</h1>
        <p className="text-lg text-[var(--text-muted)] mb-5">{post.summary}</p>

        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-faint)]">
          {post.date && <span>📅 {post.date}</span>}
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span key={tag} className="bg-[var(--bg-muted)] px-2 py-0.5 rounded text-xs">#{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* MDX Content */}
      <article className="
        prose max-w-none
        prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-[var(--text)]
        prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
        prose-p:text-[var(--text-muted)] prose-p:leading-relaxed
        prose-a:text-[var(--accent-text)] prose-a:no-underline hover:prose-a:underline
        prose-strong:text-[var(--text)] prose-strong:font-semibold
        prose-li:text-[var(--text-muted)]
        prose-code:text-[var(--accent-text)] prose-code:bg-[var(--accent-soft)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-[var(--bg-muted)] prose-pre:border prose-pre:border-[var(--border)] prose-pre:rounded-xl
        prose-blockquote:border-l-[var(--accent)] prose-blockquote:text-[var(--text-muted)] prose-blockquote:bg-[var(--bg-muted)] prose-blockquote:rounded-r-lg prose-blockquote:py-1
        prose-table:text-sm prose-th:text-[var(--text)] prose-td:text-[var(--text-muted)] prose-thead:border-[var(--border)] prose-tr:border-[var(--border)]
        prose-hr:border-[var(--border)]
        prose-img:rounded-xl prose-img:border prose-img:border-[var(--border)]
      ">
        <MDXRemote source={post.content} />
      </article>

      {/* Back link */}
      <div className="mt-12 pt-8 border-t border-[var(--border)]">
        <Link href={meta.href} className={`text-sm font-medium hover:underline ${meta.colorClass}`}>
          ← Back to {meta.label}
        </Link>
      </div>
    </div>
  );
}
