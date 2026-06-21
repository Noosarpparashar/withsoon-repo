import { redirect } from "next/navigation";
import type { Metadata } from "next";
import DataEngineeringPage from "@/components/ui/netflix-data-engineering/DataEngineeringPage";
import {
  DATA_ENGINEERING_TAB_SLUGS,
  normalizeDataEngineeringTab,
  type DataEngineeringTabSlug,
} from "@/components/ui/netflix-data-engineering/data";

const TAB_META: Record<DataEngineeringTabSlug, { title: string; description: string }> = {
  "start-here": {
    title: "Netflix Data Engineering — Start Here | withsoon.com",
    description: "Dedicated Netflix data engineering interview prep. Scope the problem as event ingestion, streaming, batch pipelines, lakehouse, BI, ML features, and reliability.",
  },
  requirements: {
    title: "Netflix Data Engineering — Requirements | withsoon.com",
    description: "Business requirements, latency SLAs, correctness rules, availability targets, and privacy constraints for a Netflix-style data platform.",
  },
  architecture: {
    title: "Netflix Data Engineering — Architecture | withsoon.com",
    description: "End-to-end Netflix-like data architecture: sources, Kafka, Flink, Spark, Bronze/Silver/Gold, warehouse, feature store, and real-time serving.",
  },
  ingestion: {
    title: "Netflix Data Engineering — Ingestion | withsoon.com",
    description: "Event taxonomy, source systems, CDC, schema contracts, Kafka topics, partitioning strategy, and ingestion patterns for Netflix-scale data platforms.",
  },
  streaming: {
    title: "Netflix Data Engineering — Streaming | withsoon.com",
    description: "Watch-time logic, Flink jobs, sessionization, deduplication, watermarking, and late-event handling for Netflix-like playback analytics.",
  },
  batch: {
    title: "Netflix Data Engineering — Batch Pipelines | withsoon.com",
    description: "Daily Spark and Airflow-driven data engineering pipelines for engagement, content performance, training datasets, recomputation, and SLAs.",
  },
  lakehouse: {
    title: "Netflix Data Engineering — Lakehouse | withsoon.com",
    description: "Bronze, Silver, Gold, Iceberg, warehouse serving, storage layout, and real-time OLAP choices for a Netflix-style lakehouse.",
  },
  modeling: {
    title: "Netflix Data Engineering — Modeling | withsoon.com",
    description: "Fact and dimension tables, reporting marts, Kimball vs Data Vault vs OBT, dbt patterns, and orchestration choices.",
  },
  reliability: {
    title: "Netflix Data Engineering — Reliability | withsoon.com",
    description: "DLQ, quarantine, replay, reconciliation, backfills, observability, and data quality systems for Netflix-scale analytics.",
  },
  "ml-serving": {
    title: "Netflix Data Engineering — ML & Serving | withsoon.com",
    description: "Feature store design, recommendation data flows, operational dashboards, and real-time analytics serving for Netflix-like products.",
  },
  stack: {
    title: "Netflix Data Engineering — Stack Mapping | withsoon.com",
    description: "AWS services mapping, open-source tool choices, and interview-ready technology trade-offs for Netflix-like data platforms.",
  },
  governance: {
    title: "Netflix Data Engineering — Governance | withsoon.com",
    description: "Governance, lineage, cataloging, PII handling, GDPR deletes, security controls, and compliance workflows for streaming data platforms.",
  },
  "performance-cost": {
    title: "Netflix Data Engineering — Performance & Cost | withsoon.com",
    description: "Partitioning, tuning, compaction, warehouse performance, cost controls, and scalability choices for Netflix-like data systems.",
  },
  capacity: {
    title: "Netflix Data Engineering — Capacity | withsoon.com",
    description: "Kafka, Flink, Spark, S3, and retention math derived from Netflix-like DAU, heartbeat volume, and replay requirements.",
  },
  "interview-qa": {
    title: "Netflix Data Engineering — Interview Q&A | withsoon.com",
    description: "Follow-up questions, decision trade-offs, key metrics, SLAs, and quick-reference concepts for senior Netflix-style data engineering interviews.",
  },
  quiz: {
    title: "Netflix Data Engineering — Quiz | withsoon.com",
    description: "Data-engineering flashcards covering scope, Kafka, watch-time logic, lakehouse, governance, and reliability.",
  },
  "mock-interview": {
    title: "Netflix Data Engineering — Mock Interview | withsoon.com",
    description: "A dedicated Netflix data engineering mock interview with data-specific prompts, pushbacks, timers, and scoring.",
  },
  "cheat-sheet": {
    title: "Netflix Data Engineering — Cheat Sheet | withsoon.com",
    description: "Fast revision sheet for Netflix-like data engineering interviews: openings, event design, lakehouse, late data, and scale math.",
  },
};

function getBreadcrumbName(tab: string) {
  const metaTitle = TAB_META[tab as DataEngineeringTabSlug]?.title;
  if (!metaTitle) return tab;
  return metaTitle
    .replace("Netflix Data Engineering — ", "")
    .replace(" | withsoon.com", "");
}

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }): Promise<Metadata> {
  const { tab } = await params;
  const canonicalTab = normalizeDataEngineeringTab(tab) ?? tab;
  const meta = TAB_META[canonicalTab as DataEngineeringTabSlug] ?? {
    title: `Netflix Data Engineering — ${canonicalTab} | withsoon.com`,
    description: "Interactive Netflix-like data engineering interview prep: ingestion, streaming pipelines, lakehouse, data quality, and mock interviews.",
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
      url: `https://withsoon.com/system-design/netflix-data-engineering/${canonicalTab}`,
      siteName: "withsoon",
      type: "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: meta.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `https://withsoon.com/system-design/netflix-data-engineering/${canonicalTab}`,
    },
  };
}

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const normalizedTab = normalizeDataEngineeringTab(tab);

  if (normalizedTab && normalizedTab !== tab) {
    redirect(`/system-design/netflix-data-engineering/${normalizedTab}`);
  }

  if (!(DATA_ENGINEERING_TAB_SLUGS as readonly string[]).includes(tab)) {
    redirect("/system-design/netflix-data-engineering/start-here");
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://withsoon.com" },
      { "@type": "ListItem", position: 2, name: "System Design", item: "https://withsoon.com/system-design" },
      { "@type": "ListItem", position: 3, name: "Netflix Data Engineering", item: "https://withsoon.com/system-design/netflix-data-engineering" },
      {
        "@type": "ListItem",
        position: 4,
        name: getBreadcrumbName(tab),
        item: `https://withsoon.com/system-design/netflix-data-engineering/${tab}`,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <DataEngineeringPage initialTab={tab as DataEngineeringTabSlug} />
    </>
  );
}
