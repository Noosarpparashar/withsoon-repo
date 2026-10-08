import type { Metadata } from "next";
import NotebookViewer from "@/components/ui/notebook-viewer/NotebookViewer";
import { loadNotebook } from "@/lib/notebook";

const filename = "spark-scala-practice-problems.ipynb";

export const metadata: Metadata = {
  title: "Scala Spark Practice Notebook | withsoon",
  description: "Read-only preview of the Scala Spark transformations practice notebook.",
};

export default async function ScalaNotebookPage() {
  const notebook = await loadNotebook(filename);
  return (
    <NotebookViewer
      notebook={notebook}
      language="Scala"
      title="Scala + Spark Practice"
      filename={filename}
      downloadHref={`/notebooks/${filename}`}
    />
  );
}
