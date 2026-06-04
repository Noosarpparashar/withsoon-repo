import fs from "fs";
import path from "path";
import matter from "gray-matter";

const contentDir = path.join(process.cwd(), "content");

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  type: "blog" | "guide";
};

export type Post = PostMeta & { content: string };

function readDir(type: "blog" | "guide"): PostMeta[] {
  const dir = path.join(contentDir, type === "blog" ? "blog" : "guides");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data } = matter(raw);
      return {
        slug: file.replace(/\.mdx?$/, ""),
        title: data.title ?? "Untitled",
        date: data.date ?? "",
        summary: data.summary ?? "",
        tags: data.tags ?? [],
        type,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getBlogPosts(): PostMeta[] {
  return readDir("blog");
}

export function getGuidePosts(): PostMeta[] {
  return readDir("guide");
}

export function getPost(type: "blog" | "guide", slug: string): Post | null {
  const dir = path.join(contentDir, type === "blog" ? "blog" : "guides");
  const filePath =
    fs.existsSync(path.join(dir, `${slug}.mdx`))
      ? path.join(dir, `${slug}.mdx`)
      : path.join(dir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title ?? "Untitled",
    date: data.date ?? "",
    summary: data.summary ?? "",
    tags: data.tags ?? [],
    type,
    content,
  };
}
