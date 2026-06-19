import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Content } from "@/lib/content";
import ReadingProgress from "./ReadingProgress";
import CopyCodeButton from "./CopyCodeButton";
import BackToTop from "./BackToTop";

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

function readingTime(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
}

export default function ArticlePage({ post }: { post: Content }) {
  const meta = SECTION_META[post.section] ?? SECTION_META["big-data"];
  const mins = readingTime(post.content);
  const correctionUrl = `https://github.com/Noosarpparashar/withsoon-repo/issues/new?title=Content+correction&body=Page:%20/${post.section}/${post.slug}%0A%0AIssue:`;

  const shareText = encodeURIComponent(`${post.title} — ${post.summary}`);
  const shareUrl = encodeURIComponent(`https://withsoon.com/${post.section}/${post.slug}`);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.summary,
    "author": { "@type": "Person", "name": "Prasoon Parashar" },
    "publisher": { "@type": "Organization", "name": "withsoon", "url": "https://withsoon.com" },
    "datePublished": post.date,
    "url": `https://withsoon.com/${post.section}/${post.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ReadingProgress />
      <CopyCodeButton />
      <BackToTop />
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
            <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-muted)] text-[var(--text-faint)] border border-[var(--border)]">
              {mins} min read
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight text-[var(--text)]">{post.title}</h1>
          <p className="text-lg text-[var(--text-muted)] mb-5">{post.summary}</p>

          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-faint)]">
            <span>by <span className="text-[var(--text-muted)]">Prasoon Parashar</span></span>
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
          prose-pre:bg-[var(--bg-muted)] prose-pre:border prose-pre:border-[var(--border)] prose-pre:rounded-xl prose-pre:relative
          prose-blockquote:border-l-[var(--accent)] prose-blockquote:text-[var(--text-muted)] prose-blockquote:bg-[var(--bg-muted)] prose-blockquote:rounded-r-lg prose-blockquote:py-1
          prose-table:text-sm prose-th:text-[var(--text)] prose-td:text-[var(--text-muted)] prose-thead:border-[var(--border)] prose-tr:border-[var(--border)]
          prose-hr:border-[var(--border)]
          prose-img:rounded-xl prose-img:border prose-img:border-[var(--border)]
        ">
          <MDXRemote source={post.content} />
        </article>

        {/* Footer: share + suggest correction + back link */}
        <div className="mt-12 pt-8 border-t border-[var(--border)]">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-sm font-medium text-[var(--text-muted)]">Share:</span>
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors"
            >
              𝕏 Twitter
            </a>
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors"
            >
              in LinkedIn
            </a>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Link href={meta.href} className={`text-sm font-medium hover:underline ${meta.colorClass}`}>
              ← Back to {meta.label}
            </Link>
            <a
              href={correctionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
            >
              Suggest a correction →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
