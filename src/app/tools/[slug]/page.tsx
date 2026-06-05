import { notFound } from "next/navigation";
import { getContentBySection, getContent } from "@/lib/content";
import ArticlePage from "@/components/ui/ArticlePage";

export async function generateStaticParams() {
  return getContentBySection("tools").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getContent("tools", slug);
  if (!post) return {};
  return { title: `${post.title} — withsoon`, description: post.summary };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getContent("tools", slug);
  if (!post) notFound();
  return <ArticlePage post={post} />;
}
