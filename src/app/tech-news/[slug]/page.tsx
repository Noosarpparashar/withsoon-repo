import { notFound } from "next/navigation";
import { getContentBySection, getContent } from "@/lib/content";
import ArticlePage from "@/components/ui/ArticlePage";

export async function generateStaticParams() {
  const news = getContentBySection("tech-news");
  const radar = getContentBySection("radar");
  return [...news, ...radar].map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getContent("tech-news", slug) ?? getContent("radar", slug);
  if (!post) return {};
  return { title: `${post.title} — withsoon`, description: post.summary };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getContent("tech-news", slug) ?? getContent("radar", slug);
  if (!post) notFound();
  return <ArticlePage post={{ ...post, section: "tech-news" }} />;
}
