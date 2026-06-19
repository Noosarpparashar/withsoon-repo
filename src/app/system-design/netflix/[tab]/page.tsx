import { redirect } from "next/navigation";
import NetflixPage from "@/components/ui/NetflixPage";

const VALID_TABS = [
  "start-here",
  "backend-track",
  "data-engineering",
  "architecture-map",
  "apis-data-model",
  "scale-estimation",
  "failures-tradeoffs",
  "interview-qa",
  "mock-interview",
  "cheat-sheet",
  // Legacy redirects — old slugs still handled by the redirect below
] as const;

type TabSlug = (typeof VALID_TABS)[number];

const LEGACY_REDIRECTS: Record<string, TabSlug> = {
  "requirements":       "start-here",
  "scale":              "scale-estimation",
  "architecture":       "architecture-map",
  "services":           "architecture-map",
  "apis":               "apis-data-model",
  "data-design":        "apis-data-model",
  "playback":           "backend-track",
  "cdn":                "backend-track",
  "encoding":           "backend-track",
  "data-pipeline":      "data-engineering",
  "recommendations":    "data-engineering",
  "failures":           "failures-tradeoffs",
  "tradeoffs":          "failures-tradeoffs",
  "security":           "failures-tradeoffs",
  "observability-cost": "failures-tradeoffs",
};

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const titles: Record<string, string> = {
    "start-here":         "Start Here — Netflix System Design for Backend & Data Engineers",
    "backend-track":      "Backend Engineer Track — Netflix System Design",
    "data-engineering":   "Data Engineering Track — Netflix System Design",
    "architecture-map":   "Architecture Map — Netflix System Design",
    "apis-data-model":    "APIs + Data Model — Netflix System Design",
    "scale-estimation":   "Scale Estimation — Netflix System Design",
    "failures-tradeoffs": "Failures + Tradeoffs — Netflix System Design",
    "interview-qa":       "Interview Q&A — Netflix System Design",
    "mock-interview":     "Mock Interview — Netflix System Design",
    "cheat-sheet":        "Cheat Sheet — Netflix System Design",
  };
  return {
    title: titles[tab] ?? "Netflix System Design — withsoon",
    description: "Role-specific Netflix system design interview prep for Backend Engineers and Data Engineers. Backend playback architecture, data pipeline, Kafka, Iceberg, failures, tradeoffs, and 60+ Q&As.",
  };
}

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;

  // Handle legacy URLs
  if (LEGACY_REDIRECTS[tab]) {
    redirect(`/system-design/netflix/${LEGACY_REDIRECTS[tab]}`);
  }

  if (!VALID_TABS.includes(tab as TabSlug)) {
    redirect("/system-design/netflix/start-here");
  }
  return <NetflixPage initialTab={tab as TabSlug} />;
}
