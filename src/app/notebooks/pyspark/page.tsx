import type { Metadata } from "next";
import NotebookViewer from "@/components/ui/notebook-viewer/NotebookViewer";
import { loadNotebook } from "@/lib/notebook";

const filename = "pyspark-practice-problems.ipynb";

export const metadata: Metadata = {
  title: "PySpark Practice Notebook | withsoon",
  description: "Read-only preview of the PySpark transformations practice notebook.",
};

export default async function PySparkNotebookPage() {
  const notebook = await loadNotebook(filename);
  return (
    <NotebookViewer
      notebook={notebook}
      language="PySpark"
      title="Python + Spark Practice"
      filename={filename}
      downloadHref={`/notebooks/${filename}`}
    />
  );
}
