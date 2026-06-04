import { notFound } from "next/navigation";
import { getBlogPosts, getPost } from "@/lib/posts";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";

export async function generateStaticParams() {
  return getBlogPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost("blog", slug);
  if (!post) return {};
  return { title: `${post.title} — withsoon`, description: post.summary };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost("blog", slug);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Link href="/blog" className="text-sm text-gray-500 hover:text-[var(--accent-light)] mb-8 inline-block">
        ← Back to blog
      </Link>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-gray-500">{post.date}</span>
        {post.tags.map((t) => (
          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent-light)]">
            {t}
          </span>
        ))}
      </div>
      <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
      <p className="text-gray-400 mb-12">{post.summary}</p>
      <article className="prose prose-invert prose-violet max-w-none">
        <MDXRemote source={post.content} />
      </article>
    </div>
  );
}
