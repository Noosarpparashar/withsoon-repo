import { getAllContent } from "@/lib/content";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const items = getAllContent().map((c) => ({
    id: `${c.section}/${c.slug}`,
    href: `/${c.section}/${c.slug}`,
    title: c.title,
    summary: c.summary,
    section: c.section,
    subsection: c.subsection ?? null,
    type: c.type,
    tags: c.tags,
    difficulty: c.difficulty ?? null,
    date: c.date,
  }));
  return NextResponse.json(items);
}
