import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type InterviewQuestion = {
  question: string;
  depth: 0 | 1;
};

export type InterviewQuestionCategory = {
  slug: string;
  title: string;
  shortTitle: string;
  questions: InterviewQuestion[];
};

const TOPIC_GROUPS = [
  {
    slug: "big-data",
    title: "Big Data",
    sourceSlugs: ["big-data-and-distributed-systems"],
  },
  {
    slug: "spark",
    title: "Spark",
    sourceSlugs: [
      "apache-spark-fundamentals-and-architecture",
      "spark-partitioning-shuffle-joins-and-performance",
      "spark-memory-serialization-caching-and-reliability",
      "spark-sql-dataframes-data-formats-and-internals",
      "spark-streaming-and-kafka-integration",
    ],
  },
  {
    slug: "kafka",
    title: "Kafka",
    sourceSlugs: [
      "apache-kafka-fundamentals",
      "kafka-consumers-ordering-reliability-and-schema-evolution",
      "kafka-scaling-system-design-and-troubleshooting",
    ],
  },
  {
    slug: "scala",
    title: "Scala",
    sourceSlugs: ["scala-for-data-engineering"],
  },
  {
    slug: "aws",
    title: "AWS",
    sourceSlugs: ["aws-and-cloud-data-pipelines"],
  },
  {
    slug: "gcp",
    title: "GCP",
    sourceSlugs: [],
  },
  {
    slug: "azure",
    title: "Azure",
    sourceSlugs: [],
  },
  {
    slug: "databricks",
    title: "Databricks",
    sourceSlugs: [],
  },
  {
    slug: "sql",
    title: "SQL",
    sourceSlugs: [],
  },
  {
    slug: "data-warehouse",
    title: "Data Warehouse",
    sourceSlugs: [],
  },
  {
    slug: "data-lake",
    title: "Data Lake",
    sourceSlugs: [],
  },
  {
    slug: "cdc",
    title: "CDC",
    sourceSlugs: [],
  },
  {
    slug: "data-quality",
    title: "Data Quality",
    sourceSlugs: [],
  },
  {
    slug: "data-design",
    title: "Data Design",
    shortTitle: "Data Design",
    sourceSlugs: [
      "data-engineering-and-end-to-end-system-design",
      "data-modeling",
      "database-design-normalization-and-scaling",
    ],
  },
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseQuestionBank(markdown: string): InterviewQuestionCategory[] {
  const categories: InterviewQuestionCategory[] = [];
  let activeCategory: InterviewQuestionCategory | undefined;

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith("# ")) {
      const title = line.slice(2).trim();
      const slug = slugify(title);
      activeCategory = {
        slug,
        title,
        shortTitle: title,
        questions: [],
      };
      categories.push(activeCategory);
      continue;
    }

    const match = line.match(/^(\s*)-\s+(.+\?)\s*$/);
    if (!match || !activeCategory) continue;

    activeCategory.questions.push({
      question: match[2].replaceAll("`", ""),
      depth: match[1].length > 0 ? 1 : 0,
    });
  }

  return categories;
}

const questionBankPath = join(
  process.cwd(),
  "content",
  "interview-questions-categorized.md",
);

const sourceCategories = parseQuestionBank(
  readFileSync(questionBankPath, "utf8"),
);

export const INTERVIEW_QUESTION_CATEGORIES: InterviewQuestionCategory[] = TOPIC_GROUPS.map((topic) => ({
  slug: topic.slug,
  title: topic.title,
  shortTitle: "shortTitle" in topic ? topic.shortTitle : topic.title,
  questions: topic.sourceSlugs.flatMap(
    (sourceSlug) => sourceCategories.find((category) => category.slug === sourceSlug)?.questions ?? [],
  ),
}));

export const INTERVIEW_QUESTION_COUNT = INTERVIEW_QUESTION_CATEGORIES.reduce(
  (total, category) => total + category.questions.length,
  0,
);
