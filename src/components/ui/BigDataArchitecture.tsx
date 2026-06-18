"use client";

import { useState, useEffect, useRef } from "react";

const LAYERS = [
  {
    id: "sources",
    label: "Data Sources",
    color: "#3b82f6",
    colorSoft: "rgba(59,130,246,0.12)",
    colorBorder: "rgba(59,130,246,0.35)",
    nodes: [
      { id: "postgres", label: "PostgreSQL", sub: "OLTP", icon: "🐘" },
      { id: "mysql", label: "MySQL", sub: "OLTP", icon: "🐬" },
      { id: "mongodb", label: "MongoDB", sub: "NoSQL", icon: "🍃" },
      { id: "dynamodb", label: "DynamoDB", sub: "AWS NoSQL", icon: "⚡" },
      { id: "restapi", label: "REST APIs", sub: "3rd party", icon: "🌐" },
      { id: "saas", label: "SaaS Apps", sub: "Salesforce", icon: "☁️" },
      { id: "iot", label: "IoT / Events", sub: "Clickstream", icon: "📡" },
    ],
  },
  {
    id: "ingestion",
    label: "Ingestion Layer",
    color: "#8b5cf6",
    colorSoft: "rgba(139,92,246,0.12)",
    colorBorder: "rgba(139,92,246,0.35)",
    nodes: [
      { id: "debezium", label: "Debezium", sub: "CDC connector", icon: "🔄" },
      { id: "dms", label: "AWS DMS", sub: "DB migration", icon: "🚀" },
      { id: "airbyte", label: "Airbyte", sub: "SaaS/API sync", icon: "🔌" },
      { id: "kinesis", label: "AWS Kinesis", sub: "Stream ingest", icon: "🌊" },
    ],
  },
  {
    id: "bus",
    label: "Message Bus",
    color: "#f59e0b",
    colorSoft: "rgba(245,158,11,0.12)",
    colorBorder: "rgba(245,158,11,0.35)",
    nodes: [
      { id: "kafka", label: "Apache Kafka", sub: "AWS MSK", icon: "⚡" },
      { id: "schema", label: "Schema Registry", sub: "Confluent / Glue", icon: "📋" },
    ],
  },
  {
    id: "processing",
    label: "Processing",
    color: "#10b981",
    colorSoft: "rgba(16,185,129,0.12)",
    colorBorder: "rgba(16,185,129,0.35)",
    nodes: [
      { id: "flink", label: "Apache Flink", sub: "Real-time", icon: "🌊" },
      { id: "spark", label: "Spark / EMR", sub: "Batch ETL", icon: "🔥" },
      { id: "glue", label: "AWS Glue", sub: "Serverless ETL", icon: "🧩" },
      { id: "dbt", label: "dbt", sub: "SQL transforms", icon: "🔧" },
    ],
  },
  {
    id: "lake",
    label: "Data Lake — AWS S3",
    color: "#06b6d4",
    colorSoft: "rgba(6,182,212,0.12)",
    colorBorder: "rgba(6,182,212,0.35)",
    nodes: [
      { id: "bronze", label: "Bronze", sub: "Raw / CDC events", icon: "🥉" },
      { id: "silver", label: "Silver", sub: "Cleaned / Validated", icon: "🥈" },
      { id: "gold", label: "Gold", sub: "Aggregates / Features", icon: "🥇" },
      { id: "iceberg", label: "Iceberg / Delta", sub: "Table format", icon: "🧊" },
    ],
  },
  {
    id: "warehouse",
    label: "Warehouse & Serving",
    color: "#ec4899",
    colorSoft: "rgba(236,72,153,0.12)",
    colorBorder: "rgba(236,72,153,0.35)",
    nodes: [
      { id: "redshift", label: "Redshift", sub: "Structured analytics", icon: "📊" },
      { id: "snowflake", label: "Snowflake", sub: "Multi-cloud DW", icon: "❄️" },
      { id: "athena", label: "AWS Athena", sub: "Ad-hoc SQL on S3", icon: "🔍" },
      { id: "elasticsearch", label: "Elasticsearch", sub: "Search + logs", icon: "🔎" },
      { id: "redis", label: "Redis Cache", sub: "Query cache", icon: "⚡" },
    ],
  },
  {
    id: "consumption",
    label: "Consumption",
    color: "#f97316",
    colorSoft: "rgba(249,115,22,0.12)",
    colorBorder: "rgba(249,115,22,0.35)",
    nodes: [
      { id: "bi", label: "BI Tools", sub: "Tableau / Metabase", icon: "📈" },
      { id: "notebooks", label: "Notebooks", sub: "Python / Jupyter", icon: "📓" },
      { id: "ml", label: "ML Models", sub: "SageMaker", icon: "🤖" },
      { id: "apis", label: "Internal APIs", sub: "FastAPI", icon: "🌐" },
    ],
  },
];

const FLOW_PATHS = [
  { from: "postgres", to: "debezium", label: "CDC", color: "#8b5cf6" },
  { from: "mysql", to: "debezium", label: "CDC", color: "#8b5cf6" },
  { from: "mongodb", to: "debezium", label: "CDC", color: "#8b5cf6" },
  { from: "dynamodb", to: "dms", label: "replicate", color: "#8b5cf6" },
  { from: "restapi", to: "airbyte", label: "sync", color: "#8b5cf6" },
  { from: "saas", to: "airbyte", label: "sync", color: "#8b5cf6" },
  { from: "iot", to: "kinesis", label: "stream", color: "#8b5cf6" },
  { from: "debezium", to: "kafka", label: "events", color: "#f59e0b" },
  { from: "dms", to: "kafka", label: "events", color: "#f59e0b" },
  { from: "airbyte", to: "kafka", label: "events", color: "#f59e0b" },
  { from: "kinesis", to: "kafka", label: "stream", color: "#f59e0b" },
  { from: "kafka", to: "flink", label: "consume", color: "#10b981" },
  { from: "kafka", to: "spark", label: "consume", color: "#10b981" },
  { from: "flink", to: "bronze", label: "write", color: "#06b6d4" },
  { from: "spark", to: "bronze", label: "write", color: "#06b6d4" },
  { from: "glue", to: "silver", label: "ETL", color: "#06b6d4" },
  { from: "bronze", to: "silver", label: "clean", color: "#06b6d4" },
  { from: "silver", to: "gold", label: "aggregate", color: "#06b6d4" },
  { from: "dbt", to: "gold", label: "transform", color: "#06b6d4" },
  { from: "gold", to: "redshift", label: "load", color: "#ec4899" },
  { from: "gold", to: "snowflake", label: "load", color: "#ec4899" },
  { from: "gold", to: "athena", label: "query", color: "#ec4899" },
  { from: "redshift", to: "bi", label: "query", color: "#f97316" },
  { from: "snowflake", to: "notebooks", label: "query", color: "#f97316" },
  { from: "athena", to: "ml", label: "feed", color: "#f97316" },
  { from: "elasticsearch", to: "apis", label: "serve", color: "#f97316" },
];

const NODE_DETAILS: Record<string, { title: string; desc: string; usedFor: string[]; aws?: string }> = {
  postgres:      { title: "PostgreSQL", desc: "Open-source relational OLTP database. Common source for CDC pipelines.", usedFor: ["Transactional data", "User records", "Orders"] },
  mysql:         { title: "MySQL", desc: "Widely-used RDBMS. Debezium reads its binlog for change events.", usedFor: ["E-commerce DBs", "Legacy apps", "SaaS backends"] },
  mongodb:       { title: "MongoDB", desc: "Document store. Debezium tails the oplog for CDC.", usedFor: ["Flexible schemas", "Nested documents", "Catalog data"] },
  dynamodb:      { title: "DynamoDB", desc: "AWS managed NoSQL. AWS DMS or Kinesis Streams for replication.", usedFor: ["High-scale KV", "Session data", "Real-time lookups"], aws: "Managed service" },
  restapi:       { title: "REST APIs", desc: "Third-party or internal APIs ingested via Airbyte connectors.", usedFor: ["Payments", "CRM data", "Marketing platforms"] },
  saas:          { title: "SaaS Apps", desc: "Salesforce, HubSpot, Stripe etc. Airbyte has 300+ connectors.", usedFor: ["Sales data", "Marketing metrics", "Billing"] },
  iot:           { title: "IoT / Events", desc: "High-volume event streams from devices, apps, or clickstream.", usedFor: ["User behavior", "Sensor telemetry", "Click events"] },
  debezium:      { title: "Debezium", desc: "Open-source CDC platform. Reads DB logs (binlog/WAL/oplog) and publishes row-level changes to Kafka.", usedFor: ["Log-based CDC", "Zero-impact replication", "Postgres, MySQL, MongoDB"] },
  dms:           { title: "AWS DMS", desc: "Managed DB migration and ongoing replication. Good for initial loads and ongoing sync to S3 or Redshift.", usedFor: ["Full load + CDC", "Oracle/SQL Server migration", "Redshift sync"], aws: "Managed service" },
  airbyte:       { title: "Airbyte", desc: "Open-source EL(T) platform with 300+ connectors. Self-hosted or Airbyte Cloud.", usedFor: ["SaaS ingestion", "API connectors", "Custom sources"] },
  kinesis:       { title: "AWS Kinesis Data Streams", desc: "Managed real-time data streaming. Producers push events; consumers read shards.", usedFor: ["IoT streams", "Clickstream", "App telemetry"], aws: "Managed service" },
  kafka:         { title: "Apache Kafka (AWS MSK)", desc: "Distributed event streaming backbone. All ingestion paths funnel through Kafka topics. MSK is AWS managed Kafka.", usedFor: ["Event bus", "Topic-based routing", "Replay & backfill"] },
  schema:        { title: "Schema Registry", desc: "Enforces Avro/JSON schemas on Kafka topics. Prevents schema drift from breaking consumers.", usedFor: ["Schema enforcement", "Avro serialization", "Contract testing"] },
  flink:         { title: "Apache Flink", desc: "Stateful stream processor. Handles real-time windowing, joins, aggregations with exactly-once semantics.", usedFor: ["Real-time aggregation", "Fraud detection", "Session windows"] },
  spark:         { title: "Apache Spark (EMR)", desc: "Distributed batch processing engine. Runs ETL, ML pipelines, and large-scale transformations on EMR clusters.", usedFor: ["Batch ETL", "ML feature engineering", "Large-scale joins"] },
  glue:          { title: "AWS Glue", desc: "Serverless ETL. Reads from S3, runs PySpark, writes back. Glue Catalog manages metadata.", usedFor: ["Serverless ETL", "S3 to Redshift", "Schema cataloging"], aws: "Managed service" },
  dbt:           { title: "dbt", desc: "SQL-first transformation layer. Runs models, tests, and lineage on Redshift/Snowflake/Athena. Gold layer output.", usedFor: ["SQL transforms", "Incremental models", "Data tests"] },
  bronze:        { title: "Bronze — Raw Layer", desc: "Raw, unmodified data as it arrived. Parquet or JSON. Source of truth — never delete.", usedFor: ["CDC events", "API dumps", "Audit trail"] },
  silver:        { title: "Silver — Cleaned Layer", desc: "Deduplicated, validated, schema-enforced. Still row-level but trustworthy.", usedFor: ["Deduplication", "Type casting", "Null handling"] },
  gold:          { title: "Gold — Serving Layer", desc: "Business-level aggregates, joined facts and dims, feature store data. What BI and ML consume.", usedFor: ["KPIs", "Feature store", "Model training data"] },
  iceberg:       { title: "Apache Iceberg / Delta Lake", desc: "Open table formats on S3 that enable ACID transactions, time-travel, and schema evolution without a traditional data warehouse.", usedFor: ["ACID on S3", "Time travel", "Schema evolution"] },
  redshift:      { title: "Amazon Redshift", desc: "AWS columnar data warehouse. Best for structured analytical queries on large datasets.", usedFor: ["Ad-hoc analytics", "Dashboards", "Reporting"], aws: "Managed service" },
  snowflake:     { title: "Snowflake", desc: "Cloud-native multi-cloud DW. Compute and storage separated; great for variable workloads.", usedFor: ["Multi-cloud", "Data sharing", "Semi-structured data"] },
  athena:        { title: "AWS Athena", desc: "Serverless SQL on S3. Pay-per-query. No infra to manage. Uses Glue Catalog.", usedFor: ["Ad-hoc queries", "Log analysis", "Cost-effective exploration"], aws: "Managed service" },
  elasticsearch: { title: "Elasticsearch", desc: "Distributed search and analytics engine. Powers full-text search, log analysis, and observability.", usedFor: ["Full-text search", "Log aggregation", "APM"] },
  redis:         { title: "Redis / ElastiCache", desc: "In-memory cache layer. Caches repeated DW query results, serving sub-millisecond latency to APIs.", usedFor: ["Query caching", "Session store", "Rate limiting"] },
  bi:            { title: "BI Tools", desc: "Tableau, Power BI, Metabase. Connect to Redshift/Snowflake. End users build dashboards.", usedFor: ["Executive dashboards", "Self-serve analytics", "KPI tracking"] },
  notebooks:     { title: "Python / Jupyter Notebooks", desc: "Data scientists query Snowflake/Athena directly for exploration, analysis, and model prototyping.", usedFor: ["Exploration", "Model prototyping", "Ad-hoc analysis"] },
  ml:            { title: "ML Models — SageMaker", desc: "Training and inference pipelines. Gold layer feeds feature stores. SageMaker orchestrates training jobs.", usedFor: ["Model training", "Feature store", "Real-time inference"], aws: "Managed service" },
  apis:          { title: "Internal APIs — FastAPI", desc: "Backend services query Redis/Elasticsearch to serve low-latency responses to apps and dashboards.", usedFor: ["App serving", "Dashboard APIs", "Product features"] },
};

const ORCHESTRATION = [
  { label: "Airflow / MWAA", desc: "Schedules batch jobs, dbt runs, Spark ETL", icon: "🌬️", color: "#f59e0b" },
  { label: "Prometheus + Grafana", desc: "Kafka lag, Spark metrics, pipeline SLAs", icon: "📊", color: "#10b981" },
  { label: "AWS CloudWatch", desc: "Infra logs, DMS tasks, Glue job runs", icon: "☁️", color: "#3b82f6" },
  { label: "Great Expectations", desc: "Data quality checks at each layer", icon: "✅", color: "#8b5cf6" },
];

export default function BigDataArchitecture() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [animStep, setAnimStep] = useState(0);
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setAnimStep((s) => (s + 1) % 100);
    }, 80);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const detail = activeNode ? NODE_DETAILS[activeNode] : null;
  const activeLayer = activeNode
    ? LAYERS.find((l) => l.nodes.some((n) => n.id === activeNode))
    : null;

  return (
    <div className="w-full rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl">🏗️</span>
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Big Data Architecture</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>AWS + Open Source · End-to-end pipeline · Click any component to explore</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
              Live flow
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-3">
        {/* Architecture layers */}
        {LAYERS.map((layer, li) => (
          <div key={layer.id}>
            {/* Arrow between layers */}
            {li > 0 && (
              <div className="flex justify-center my-1">
                <div className="flex flex-col items-center gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-0.5 h-2 rounded-full transition-opacity duration-300"
                      style={{
                        background: layer.color,
                        opacity: ((animStep + i * 15) % 45) < 15 ? 1 : 0.2,
                      }}
                    />
                  ))}
                  <div
                    className="w-0 h-0"
                    style={{
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderTop: `7px solid ${layer.color}`,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Layer card */}
            <div
              className="rounded-xl p-3 md:p-4 transition-all duration-200 cursor-default"
              style={{
                background: hoveredLayer === layer.id ? layer.colorSoft : "var(--bg-muted)",
                border: `1px solid ${hoveredLayer === layer.id ? layer.colorBorder : "var(--border)"}`,
              }}
              onMouseEnter={() => setHoveredLayer(layer.id)}
              onMouseLeave={() => setHoveredLayer(null)}
            >
              {/* Layer label */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: layer.color }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: layer.color }}>
                  {layer.label}
                </span>
              </div>

              {/* Nodes */}
              <div className="flex flex-wrap gap-2">
                {layer.nodes.map((node) => {
                  const isActive = activeNode === node.id;
                  return (
                    <button
                      key={node.id}
                      onClick={() => setActiveNode(isActive ? null : node.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-150 group"
                      style={{
                        background: isActive ? layer.colorSoft : "var(--bg-card)",
                        border: `1px solid ${isActive ? layer.color : "var(--border)"}`,
                        boxShadow: isActive ? `0 0 0 2px ${layer.color}40` : "none",
                        transform: isActive ? "translateY(-1px)" : "none",
                      }}
                    >
                      <span className="text-base leading-none">{node.icon}</span>
                      <div>
                        <div className="text-xs font-semibold leading-tight" style={{ color: isActive ? layer.color : "var(--text)" }}>
                          {node.label}
                        </div>
                        <div className="text-[10px] leading-tight mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {node.sub}
                        </div>
                      </div>
                      {isActive && (
                        <span className="ml-1 text-[10px] font-bold" style={{ color: layer.color }}>●</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Orchestration bar */}
        <div className="mt-4 rounded-xl p-3 md:p-4" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{ background: "#64748b" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Orchestration &amp; Monitoring — cross-cutting
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ORCHESTRATION.map((o) => (
              <div
                key={o.label}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <span className="text-sm">{o.icon}</span>
                <div>
                  <div className="text-xs font-semibold" style={{ color: "var(--text)" }}>{o.label}</div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{o.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail panel — slides in when node selected */}
      <div
        className="transition-all duration-300 overflow-hidden"
        style={{ maxHeight: activeNode ? "400px" : "0px" }}
      >
        {detail && activeLayer && (
          <div className="mx-4 mb-4 md:mx-6 md:mb-6 rounded-xl p-4 md:p-5" style={{ background: activeLayer.colorSoft, border: `1px solid ${activeLayer.colorBorder}` }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{LAYERS.flatMap((l) => l.nodes).find((n) => n.id === activeNode)?.icon}</span>
                  <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>{detail.title}</h3>
                  {detail.aws && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                      {detail.aws}
                    </span>
                  )}
                </div>
                <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>{detail.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.usedFor.map((u) => (
                    <span key={u} className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: "var(--bg-card)", color: activeLayer.color, border: `1px solid ${activeLayer.colorBorder}` }}>
                      {u}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setActiveNode(null)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                close ✕
              </button>
            </div>

            {/* Flow hint */}
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${activeLayer.colorBorder}` }}>
              <p className="text-[11px] font-medium mb-1.5" style={{ color: activeLayer.color }}>Data flows involving {detail.title}:</p>
              <div className="flex flex-wrap gap-1.5">
                {FLOW_PATHS.filter((f) => f.from === activeNode || f.to === activeNode).map((f, i) => {
                  const fromNode = LAYERS.flatMap((l) => l.nodes).find((n) => n.id === f.from);
                  const toNode = LAYERS.flatMap((l) => l.nodes).find((n) => n.id === f.to);
                  return (
                    <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px]" style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                      <span>{fromNode?.icon}</span>
                      <span style={{ color: "var(--text)" }}>{fromNode?.label}</span>
                      <span style={{ color: f.color }}>→ {f.label} →</span>
                      <span>{toNode?.icon}</span>
                      <span style={{ color: "var(--text)" }}>{toNode?.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Flow legend */}
      <div className="px-4 pb-4 md:px-6 md:pb-6">
        <div className="rounded-xl p-3 md:p-4" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--text-muted)" }}>Data flow paths</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "CDC path", route: "DB → Debezium → Kafka → Flink → S3", latency: "seconds", color: "#8b5cf6" },
              { label: "Batch migration", route: "DB → AWS DMS → S3 / Redshift", latency: "minutes", color: "#3b82f6" },
              { label: "SaaS / API", route: "API → Airbyte → Kafka → Spark → Gold", latency: "hours", color: "#10b981" },
              { label: "Real-time events", route: "Kinesis → Kafka → Flink → Redshift", latency: "sub-second", color: "#f59e0b" },
            ].map((path) => (
              <div key={path.label} className="p-2.5 rounded-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: path.color }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{path.label}</span>
                </div>
                <p className="text-[10px] leading-relaxed mb-1" style={{ color: "var(--text-muted)" }}>{path.route}</p>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${path.color}20`, color: path.color }}>
                  {path.latency}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
