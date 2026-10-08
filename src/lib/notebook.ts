import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export type NotebookOutput = {
  output_type: "stream" | "execute_result" | "display_data" | "error";
  text?: string | string[];
  data?: Record<string, string | string[]>;
  traceback?: string[];
  ename?: string;
  evalue?: string;
  execution_count?: number | null;
};

export type NotebookCell = {
  cell_type: "markdown" | "code" | "raw";
  source: string | string[];
  execution_count?: number | null;
  outputs?: NotebookOutput[];
};

export type NotebookDocument = {
  cells: NotebookCell[];
  metadata?: {
    kernelspec?: { display_name?: string; language?: string; name?: string };
    language_info?: { name?: string; version?: string };
  };
  nbformat: number;
  nbformat_minor: number;
};

const ALLOWED_NOTEBOOKS = new Set([
  "spark-scala-practice-problems.ipynb",
  "pyspark-practice-problems.ipynb",
]);

export async function loadNotebook(filename: string): Promise<NotebookDocument> {
  if (!ALLOWED_NOTEBOOKS.has(filename)) {
    throw new Error(`Notebook is not available: ${filename}`);
  }

  const notebookPath = path.join(process.cwd(), "public", "notebooks", filename);
  return JSON.parse(await readFile(notebookPath, "utf8")) as NotebookDocument;
}

export function notebookSource(source: string | string[]): string {
  return Array.isArray(source) ? source.join("") : source;
}
