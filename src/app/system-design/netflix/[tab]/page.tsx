import { redirect } from "next/navigation";
import type { Metadata } from "next";
import NetflixPage from "@/components/ui/NetflixPage";

const TAB_META: Record<string, { title: string; description: string }> = {
  architecture: {
    title: "Netflix System Design — Architecture | withsoon.com",
    description: "Interactive Netflix architecture diagram: 19 components, 7 request flows, CDN, DRM, microservices. Interview-ready depth for senior backend engineers.",
  },
  models: {
    title: "Netflix System Design — Data Models | withsoon.com",
    description: "Netflix data models: Aurora PostgreSQL, DynamoDB, Cassandra, Redis. Entity schemas, access patterns, DDL, and interview tips.",
  },
  tradeoffs: {
    title: "Netflix System Design — Trade-offs | withsoon.com",
    description: "Netflix architecture trade-offs: CAP theorem choices, database selection, push vs pull, microservices benefits and costs.",
  },
  capacity: {
    title: "Netflix System Design — Capacity Estimation | withsoon.com",
    description: "Netflix capacity numbers: 45 Tbps bandwidth, 260K RPS, 500K Kafka events/sec. Interactive calculator and step-by-step derivations.",
  },
  quiz: {
    title: "Netflix System Design — Quiz | withsoon.com",
    description: "75 Netflix system design flashcards: Auth, Streaming, CDN, Kafka, DynamoDB, Cassandra, Redis, CAP theorem, DRM. Spaced repetition built in.",
  },
  "mock-interview": {
    title: "Netflix System Design — Mock Interview | withsoon.com",
    description: "Full mock interview for Netflix system design: 12 grilling questions with pushback responses, rubric, timers, and self-rating. For senior backend and data engineers.",
  },
  "cheat-sheet": {
    title: "Netflix System Design — Cheat Sheet | withsoon.com",
    description: "Netflix system design cheat sheet: key numbers, 30-second answer, opening statement, component chain, and interview scripts. Print-ready.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }): Promise<Metadata> {
  const { tab } = await params;
  const meta = TAB_META[tab] ?? {
    title: `Netflix System Design — ${tab} | withsoon.com`,
    description: "Interactive Netflix system design interview prep: architecture, data models, trade-offs, capacity estimation, and flashcards.",
  };
  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://withsoon.com/system-design/netflix/${tab}`,
      siteName: "withsoon",
      type: "website",
    },
    alternates: {
      canonical: `https://withsoon.com/system-design/netflix/${tab}`,
    },
  };
}

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const LEGACY = [
    "start-here", "backend-track", "data-engineering", "architecture-map",
    "apis-data-model", "scale-estimation", "failures-tradeoffs",
    "interview-qa",
    "requirements", "scale", "services", "apis",
    "data-design", "playback", "cdn", "encoding", "data-pipeline",
    "recommendations", "failures", "security", "observability-cost",
  ];
  const VALID = ["architecture", "models", "tradeoffs", "capacity", "quiz", "mock-interview", "cheat-sheet"];
  if (!VALID.includes(tab) && LEGACY.includes(tab)) {
    redirect("/system-design/netflix/architecture");
  }
  return <NetflixPage initialTab={tab} />;
}
