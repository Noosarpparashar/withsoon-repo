import { getAllContent } from "@/lib/content";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const items = getAllContent()
    .filter((i) => i.section !== "tech-news" && i.section !== "radar")
    .slice(0, 30);

  const siteUrl = "https://withsoon.com";

  const rssItems = items
    .map(
      (item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${siteUrl}/${item.section}/${item.slug}</link>
      <guid isPermaLink="true">${siteUrl}/${item.section}/${item.slug}</guid>
      <description><![CDATA[${item.summary}]]></description>
      <pubDate>${new Date(item.date || "2026-01-01").toUTCString()}</pubDate>
      <category><![CDATA[${item.section}]]></category>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>withsoon — Big Data + AI Engineering</title>
    <link>${siteUrl}</link>
    <description>System design, setup guides, interview prep, and cheatsheets for Big Data and AI engineers.</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${rssItems}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
