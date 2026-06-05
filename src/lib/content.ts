import fs from "fs";
import path from "path";
import matter from "gray-matter";

const contentDir = path.join(process.cwd(), "content");

export type Section =
  | "tech-news"
  | "radar"
  | "big-data"
  | "ai"
  | "tools"
  | "interview"
  | "reference";

export type ContentType =
  | "news"
  | "guide"
  | "system-design"
  | "setup"
  | "cheatsheet"
  | "interview-qa"
  | "tool"
  | "reference"
  | "how-to"
  | "comparison";

export type ContentMeta = {
  slug: string;
  section: Section;
  type: ContentType;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  subsection?: string;
  company?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  featured?: boolean;
};

export type Content = ContentMeta & { content: string };

function readSection(section: Section): ContentMeta[] {
  const dir = path.join(contentDir, section);
  if (!fs.existsSync(dir)) return [];

  const results: ContentMeta[] = [];

  function readDir(dirPath: string, slugPrefix: string) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        readDir(path.join(dirPath, entry.name), `${slugPrefix}${entry.name}/`);
      } else if (entry.name.endsWith(".mdx") || entry.name.endsWith(".md")) {
        const raw = fs.readFileSync(path.join(dirPath, entry.name), "utf8");
        const { data } = matter(raw);
        const slug = slugPrefix + entry.name.replace(/\.mdx?$/, "");
        results.push({
          slug,
          section,
          type: data.type ?? "guide",
          title: data.title ?? "Untitled",
          date: data.date ?? "",
          summary: data.summary ?? "",
          tags: data.tags ?? [],
          subsection: data.subsection,
          company: data.company,
          difficulty: data.difficulty,
          featured: data.featured ?? false,
        });
      }
    }
  }

  readDir(dir, "");
  return results.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getContentBySection(section: Section): ContentMeta[] {
  return readSection(section);
}

export function getAllContent(): ContentMeta[] {
  const sections: Section[] = ["tech-news", "radar", "big-data", "ai", "tools", "interview", "reference"];
  return sections.flatMap(readSection).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getContent(section: Section, slug: string): Content | null {
  const dir = path.join(contentDir, section);
  const tryPaths = [
    path.join(dir, `${slug}.mdx`),
    path.join(dir, `${slug}.md`),
  ];
  const filePath = tryPaths.find((p) => fs.existsSync(p));
  if (!filePath) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return {
    slug,
    section,
    type: data.type ?? "guide",
    title: data.title ?? "Untitled",
    date: data.date ?? "",
    summary: data.summary ?? "",
    tags: data.tags ?? [],
    subsection: data.subsection,
    company: data.company,
    difficulty: data.difficulty,
    featured: data.featured ?? false,
    content,
  };
}

export function getFeatured(): ContentMeta[] {
  return getAllContent().filter((c) => c.featured).slice(0, 6);
}

export function getByTag(tag: string): ContentMeta[] {
  return getAllContent().filter((c) => c.tags.includes(tag));
}

export function getSetupGuides(): ContentMeta[] {
  return getAllContent()
    .filter((c) => c.type === "setup" || c.tags.includes("setup") || c.subsection === "setup")
    .slice(0, 6);
}

export function getAllCheatsheets(): ContentMeta[] {
  return getAllContent().filter(
    (c) => c.type === "cheatsheet" || c.tags.includes("cheatsheet") || c.subsection === "cheatsheet"
  );
}

export function getSearchIndex(): { id: string; title: string; summary: string; section: Section; slug: string; tags: string }[] {
  return getAllContent().map((c) => ({
    id: `${c.section}/${c.slug}`,
    title: c.title,
    summary: c.summary,
    section: c.section,
    slug: c.slug,
    tags: c.tags.join(" "),
  }));
}
