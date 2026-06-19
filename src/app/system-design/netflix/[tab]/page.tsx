import { redirect } from "next/navigation";
import NetflixPage from "@/components/ui/NetflixPage";

const VALID_TABS = [
  "start-here",
  "requirements",
  "scale",
  "architecture",
  "services",
  "apis",
  "data-design",
  "playback",
  "cdn",
  "encoding",
  "data-pipeline",
  "recommendations",
  "failures",
  "tradeoffs",
  "security",
  "observability-cost",
  "interview-qa",
  "mock-interview",
  "cheat-sheet",
] as const;

type TabSlug = (typeof VALID_TABS)[number];

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const titles: Record<string, string> = {
    "start-here": "Start Here — Netflix System Design",
    "requirements": "Requirements — Netflix System Design",
    "scale": "Scale Estimation — Netflix System Design",
    "architecture": "Full Architecture — Netflix System Design",
    "services": "Services — Netflix System Design",
    "apis": "APIs — Netflix System Design",
    "data-design": "Data Design — Netflix System Design",
    "playback": "Playback Deep Dive — Netflix System Design",
    "cdn": "CDN / Open Connect — Netflix System Design",
    "encoding": "Content Encoding — Netflix System Design",
    "data-pipeline": "Data Pipeline — Netflix System Design",
    "recommendations": "ML & Recommendations — Netflix System Design",
    "failures": "Reliability & Failures — Netflix System Design",
    "tradeoffs": "Tradeoffs — Netflix System Design",
    "security": "Security & DRM — Netflix System Design",
    "observability-cost": "Observability & Cost — Netflix System Design",
    "interview-qa": "Interview Q&A — Netflix System Design",
    "mock-interview": "Mock Interview — Netflix System Design",
    "cheat-sheet": "Cheat Sheet — Netflix System Design",
  };
  return {
    title: titles[tab] ?? "Netflix System Design — withsoon",
    description: "Complete Netflix system design interview prep: architecture, data pipeline, ML, failures, tradeoffs, and 60+ Q&As.",
  };
}

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!VALID_TABS.includes(tab as TabSlug)) {
    redirect("/system-design/netflix/start-here");
  }
  return <NetflixPage initialTab={tab as TabSlug} />;
}
