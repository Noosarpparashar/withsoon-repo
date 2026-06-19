import { redirect } from "next/navigation";
import NetflixPage from "@/components/ui/NetflixPage";

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  return {
    title: `Netflix System Design — ${tab} | withsoon.com`,
    description: "Interactive Netflix system design architecture map for senior backend engineers. Explore all 19 components, 7 request flows, deep-dive interview answers, and capacity estimates.",
  };
}

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  // Legacy tab redirects → architecture
  const LEGACY = [
    "start-here", "backend-track", "data-engineering", "architecture-map",
    "apis-data-model", "scale-estimation", "failures-tradeoffs",
    "interview-qa", "mock-interview", "cheat-sheet",
    "requirements", "scale", "architecture", "services", "apis",
    "data-design", "playback", "cdn", "encoding", "data-pipeline",
    "recommendations", "failures", "tradeoffs", "security", "observability-cost",
  ];
  const VALID = ["architecture", "models", "tradeoffs", "capacity", "quiz"];
  if (!VALID.includes(tab) && LEGACY.includes(tab)) {
    redirect("/system-design/netflix/architecture");
  }
  return <NetflixPage initialTab={tab} />;
}
