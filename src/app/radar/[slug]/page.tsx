import { permanentRedirect } from "next/navigation";

export default async function RadarArticleRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/tech-news/${slug}`);
}
