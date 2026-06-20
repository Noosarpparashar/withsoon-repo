import type { Metadata } from "next";
import RoadmapPage from "@/components/ui/RoadmapPage";

export const metadata: Metadata = {
  title: "Data Engineer Roadmap — 6-Week Interview Prep | withsoon",
  description: "Structured 6-week data engineer interview roadmap covering SQL, Python, Kafka, Spark, Airflow, and system design. Track your progress as you go.",
  alternates: { canonical: "https://withsoon.com/roadmap" },
  openGraph: {
    title: "Data Engineer Roadmap | withsoon",
    description: "6-week structured path from SQL basics to system design — built for DE interview prep.",
    url: "https://withsoon.com/roadmap",
  },
};

export default function Page() {
  return <RoadmapPage />;
}
