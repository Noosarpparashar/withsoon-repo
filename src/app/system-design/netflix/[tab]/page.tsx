import { redirect } from "next/navigation";
import type { Metadata } from "next";
import NetflixPage from "@/components/ui/NetflixPage";
import {
  CURRENT_NETFLIX_TAB_SLUGS,
  normalizeNetflixTab,
  type CurrentTabSlug,
} from "@/components/ui/netflix-tabs/types";

const TAB_META: Record<string, { title: string; description: string }> = {
  "start-here": {
    title: "Netflix System Design — Start Here | withsoon.com",
    description: "Guided start for Netflix system design interview prep. Choose Backend Engineer or Data Engineer track, get clarifying questions, opening scripts, and common mistakes to avoid.",
  },
  requirements: {
    title: "Netflix System Design — Requirements | withsoon.com",
    description: "Netflix functional and non-functional requirements: scale targets, latency SLAs, consistency models, and how to frame requirements in a system design interview.",
  },
  architecture: {
    title: "Netflix System Design — Architecture | withsoon.com",
    description: "Interactive Netflix architecture diagram: 19 components, 7 request flows, CDN, DRM, microservices. Interview-ready depth for senior backend engineers.",
  },
  playback: {
    title: "Netflix System Design — Playback Deep Dive | withsoon.com",
    description: "Step-by-step walkthrough of the Netflix playback request flow: client to OCA, latency budgets, DRM licensing, and failure modes.",
  },
  cdn: {
    title: "Netflix System Design — CDN & Open Connect | withsoon.com",
    description: "How Netflix Open Connect works: ISP-embedded appliances, proactive caching, anycast routing, 300 Tbps delivery, and CDN failure handling.",
  },
  encoding: {
    title: "Netflix System Design — Encoding Pipeline | withsoon.com",
    description: "Netflix encoding: per-title encoding, chunk-based parallel transcoding, VMAF quality scoring, HDR/DolbyAtmos tracks, and S3 + CDN delivery chain.",
  },
  security: {
    title: "Netflix System Design — Security & DRM | withsoon.com",
    description: "Netflix security architecture: Widevine/FairPlay/PlayReady DRM, license server design, device authentication, HTTPS everywhere, and auth token lifecycle.",
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
  failures: {
    title: "Netflix System Design — Failure Scenarios | withsoon.com",
    description: "Netflix failure scenarios: what happens when Playback Service, Redis, DRM, CDN, or Kafka goes down. Failure modes, mitigations, and interview scripts.",
  },
};

function getBreadcrumbName(tab: string) {
  const metaTitle = TAB_META[tab]?.title;
  if (!metaTitle) return tab;
  return metaTitle
    .replace("Netflix System Design — ", "")
    .replace(" | withsoon.com", "");
}

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }): Promise<Metadata> {
  const { tab } = await params;
  const canonicalTab = normalizeNetflixTab(tab) ?? tab;
  const meta = TAB_META[canonicalTab] ?? {
    title: `Netflix System Design — ${canonicalTab} | withsoon.com`,
    description: "Interactive Netflix system design interview prep: architecture, data models, trade-offs, capacity estimation, and flashcards.",
  };
  const ogUrl = new URL("/og", "https://withsoon.com");
  ogUrl.searchParams.set("title", meta.title.replace(" | withsoon.com", ""));
  ogUrl.searchParams.set("section", "System Design");
  const ogImageUrl = ogUrl.toString();

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://withsoon.com/system-design/netflix/${canonicalTab}`,
      siteName: "withsoon",
      type: "website",
      images: [{
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: meta.title,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `https://withsoon.com/system-design/netflix/${canonicalTab}`,
    },
  };
}

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const normalizedTab = normalizeNetflixTab(tab);

  if (normalizedTab && normalizedTab !== tab) {
    redirect(`/system-design/netflix/${normalizedTab}`);
  }

  if (!(CURRENT_NETFLIX_TAB_SLUGS as readonly string[]).includes(tab)) {
    redirect("/system-design/netflix/start-here");
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://withsoon.com" },
      { "@type": "ListItem", position: 2, name: "System Design", item: "https://withsoon.com/system-design" },
      { "@type": "ListItem", position: 3, name: "Netflix", item: "https://withsoon.com/system-design/netflix" },
      {
        "@type": "ListItem",
        position: 4,
        name: getBreadcrumbName(tab),
        item: `https://withsoon.com/system-design/netflix/${tab}`,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <NetflixPage initialTab={tab as CurrentTabSlug} />
    </>
  );
}
