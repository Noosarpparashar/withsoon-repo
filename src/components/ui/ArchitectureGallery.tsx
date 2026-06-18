"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

const VW = 1480, VH = 660;
const NW = 126, NH = 48;

type ANode       = { id: string; label: string; sub: string; icon: string; x: number; y: number; color: string };
type AEdge       = { from: string; to: string; color: string; dur?: number };
type LayerLabel  = { x: number; label: string };
type Arch        = {
  id: string; title: string; tagline: string; emoji: string;
  accent: string; badge: string; badgeColor: string;
  subtitle: string; accentGrad: string;
  nodes: ANode[]; edges: AEdge[]; layers: LayerLabel[];
};

/* ─── Architecture 1 — AWS Big Data ───────────────────────── */
const ARCH_AWS: Arch = {
  id: "aws-bigdata",
  title: "Big Data Architecture",
  tagline: "AWS + Open Source · sources to dashboards",
  emoji: "🏗️",
  accent: "#3b82f6",
  badge: "AWS + Open Source",
  badgeColor: "#10b981",
  subtitle: "Sources → Debezium / DMS → Kafka → Flink / Spark / dbt → S3 Lake → Redshift / Snowflake",
  accentGrad: "linear-gradient(90deg,#3b82f6,#8b5cf6,#10b981,transparent)",
  layers: [
    { x: 85,   label: "Sources"    },
    { x: 310,  label: "Ingestion"  },
    { x: 545,  label: "Kafka"      },
    { x: 775,  label: "Processing" },
    { x: 1005, label: "Data Lake"  },
    { x: 1240, label: "Warehouse"  },
  ],
  nodes: [
    { id: "pg",        label: "PostgreSQL",  sub: "OLTP",         icon: "🐘", x: 85,   y: 110, color: "#3b82f6" },
    { id: "mysql",     label: "MySQL",       sub: "OLTP",         icon: "🐬", x: 85,   y: 215, color: "#3b82f6" },
    { id: "mongo",     label: "MongoDB",     sub: "NoSQL",        icon: "🍃", x: 85,   y: 320, color: "#10b981" },
    { id: "dynamo",    label: "DynamoDB",    sub: "AWS NoSQL",    icon: "⚡", x: 85,   y: 425, color: "#f59e0b" },
    { id: "restapi",   label: "REST APIs",   sub: "3rd party",    icon: "🌐", x: 85,   y: 530, color: "#8b5cf6" },
    { id: "debezium",  label: "Debezium",    sub: "CDC",          icon: "🔄", x: 310,  y: 162, color: "#8b5cf6" },
    { id: "dms",       label: "AWS DMS",     sub: "Migration",    icon: "🚀", x: 310,  y: 320, color: "#f59e0b" },
    { id: "airbyte",   label: "Airbyte",     sub: "SaaS sync",    icon: "🔌", x: 310,  y: 478, color: "#06b6d4" },
    { id: "kafka",     label: "Kafka / MSK", sub: "Event bus",    icon: "⚡", x: 545,  y: 270, color: "#f59e0b" },
    { id: "schema",    label: "Schema Reg.", sub: "Confluent",    icon: "📋", x: 545,  y: 420, color: "#6366f1" },
    { id: "flink",     label: "Flink",       sub: "Real-time",    icon: "🌊", x: 775,  y: 162, color: "#10b981" },
    { id: "spark",     label: "Spark/EMR",   sub: "Batch ETL",    icon: "🔥", x: 775,  y: 295, color: "#ef4444" },
    { id: "glue",      label: "AWS Glue",    sub: "Serverless",   icon: "🧩", x: 775,  y: 428, color: "#f59e0b" },
    { id: "dbt",       label: "dbt",         sub: "SQL transfrm", icon: "🔧", x: 775,  y: 558, color: "#06b6d4" },
    { id: "bronze",    label: "S3 Bronze",   sub: "Raw",          icon: "🥉", x: 1005, y: 162, color: "#b45309" },
    { id: "silver",    label: "S3 Silver",   sub: "Cleaned",      icon: "🥈", x: 1005, y: 320, color: "#94a3b8" },
    { id: "gold",      label: "S3 Gold",     sub: "Aggregated",   icon: "🥇", x: 1005, y: 478, color: "#eab308" },
    { id: "redshift",  label: "Redshift",    sub: "Warehouse",    icon: "📊", x: 1240, y: 162, color: "#8b5cf6" },
    { id: "snowflake", label: "Snowflake",   sub: "Multi-cloud",  icon: "❄️", x: 1240, y: 295, color: "#06b6d4" },
    { id: "athena",    label: "Athena",      sub: "SQL on S3",    icon: "🔍", x: 1240, y: 428, color: "#10b981" },
    { id: "redis",     label: "Redis Cache", sub: "Hot data",     icon: "🔴", x: 1240, y: 558, color: "#ef4444" },
  ],
  edges: [
    { from: "pg",       to: "debezium",  color: "#8b5cf6", dur: 2.0 },
    { from: "mysql",    to: "debezium",  color: "#8b5cf6", dur: 2.5 },
    { from: "mongo",    to: "debezium",  color: "#8b5cf6", dur: 3.0 },
    { from: "dynamo",   to: "dms",       color: "#f59e0b", dur: 2.2 },
    { from: "restapi",  to: "airbyte",   color: "#06b6d4", dur: 2.8 },
    { from: "debezium", to: "kafka",     color: "#f59e0b", dur: 1.6 },
    { from: "dms",      to: "kafka",     color: "#f59e0b", dur: 2.0 },
    { from: "airbyte",  to: "kafka",     color: "#f59e0b", dur: 2.4 },
    { from: "kafka",    to: "schema",    color: "#6366f1", dur: 2.0 },
    { from: "kafka",    to: "flink",     color: "#10b981", dur: 1.5 },
    { from: "kafka",    to: "spark",     color: "#ef4444", dur: 2.0 },
    { from: "kafka",    to: "glue",      color: "#f59e0b", dur: 2.5 },
    { from: "flink",    to: "bronze",    color: "#b45309", dur: 1.8 },
    { from: "spark",    to: "bronze",    color: "#b45309", dur: 2.2 },
    { from: "glue",     to: "silver",    color: "#94a3b8", dur: 2.0 },
    { from: "bronze",   to: "silver",    color: "#94a3b8", dur: 2.5 },
    { from: "silver",   to: "gold",      color: "#eab308", dur: 2.0 },
    { from: "dbt",      to: "gold",      color: "#eab308", dur: 2.8 },
    { from: "gold",     to: "redshift",  color: "#8b5cf6", dur: 2.0 },
    { from: "gold",     to: "snowflake", color: "#06b6d4", dur: 2.4 },
    { from: "silver",   to: "athena",    color: "#10b981", dur: 2.8 },
    { from: "flink",    to: "redis",     color: "#ef4444", dur: 1.8 },
  ],
};

/* ─── Architecture 2 — GCP Lakehouse + Iceberg ────────────── */
const ARCH_GCP: Arch = {
  id: "gcp-lakehouse",
  title: "GCP Data Lakehouse",
  tagline: "GCS + Apache Iceberg · open table format at the core",
  emoji: "🧊",
  accent: "#34a853",
  badge: "GCP + Iceberg",
  badgeColor: "#34a853",
  subtitle: "Sources → Pub/Sub / Debezium → Dataflow → Dataproc / dbt → GCS Iceberg → BigQuery / Trino",
  accentGrad: "linear-gradient(90deg,#34a853,#4285f4,#06b6d4,transparent)",
  layers: [
    { x: 85,   label: "Sources"       },
    { x: 310,  label: "Ingestion"     },
    { x: 545,  label: "Streaming"     },
    { x: 775,  label: "Processing"    },
    { x: 1005, label: "GCS + Iceberg" },
    { x: 1240, label: "Serving"       },
  ],
  nodes: [
    { id: "pg",        label: "PostgreSQL",   sub: "OLTP",          icon: "🐘", x: 85,   y: 110, color: "#4285f4" },
    { id: "mysql",     label: "MySQL",        sub: "OLTP",          icon: "🐬", x: 85,   y: 215, color: "#4285f4" },
    { id: "mongo",     label: "MongoDB",      sub: "NoSQL",         icon: "🍃", x: 85,   y: 320, color: "#10b981" },
    { id: "events",    label: "App Events",   sub: "Clickstream",   icon: "📡", x: 85,   y: 425, color: "#fbbc04" },
    { id: "restapi",   label: "REST APIs",    sub: "3rd party",     icon: "🌐", x: 85,   y: 530, color: "#8b5cf6" },
    { id: "debezium",  label: "Debezium",     sub: "CDC",           icon: "🔄", x: 310,  y: 162, color: "#8b5cf6" },
    { id: "pubsub",    label: "Pub/Sub",      sub: "GCP Streaming", icon: "📨", x: 310,  y: 320, color: "#4285f4" },
    { id: "airbyte",   label: "Airbyte",      sub: "SaaS sync",     icon: "🔌", x: 310,  y: 478, color: "#06b6d4" },
    { id: "df_stream", label: "Dataflow",     sub: "Stream/Beam",   icon: "🌊", x: 545,  y: 215, color: "#34a853" },
    { id: "df_batch",  label: "Dataflow",     sub: "Batch/Beam",    icon: "⚙️", x: 545,  y: 425, color: "#fbbc04" },
    { id: "dataproc",  label: "Dataproc",     sub: "Spark ETL",     icon: "🔥", x: 775,  y: 162, color: "#ea4335" },
    { id: "dbt",       label: "dbt",          sub: "SQL transfrm",  icon: "🔧", x: 775,  y: 295, color: "#06b6d4" },
    { id: "flink",     label: "Flink",        sub: "Real-time",     icon: "🌊", x: 775,  y: 428, color: "#10b981" },
    { id: "composer",  label: "Composer",     sub: "Airflow/DAGs",  icon: "🌬️", x: 775,  y: 558, color: "#8b5cf6" },
    { id: "bronze",    label: "GCS Bronze",   sub: "Raw Parquet",   icon: "🥉", x: 1005, y: 130, color: "#b45309" },
    { id: "iceberg_s", label: "Silver/Iceberg",sub: "ACID + schema",icon: "🧊", x: 1005, y: 310, color: "#06b6d4" },
    { id: "iceberg_g", label: "Gold/Iceberg", sub: "Time travel",   icon: "🥇", x: 1005, y: 460, color: "#eab308" },
    { id: "dataplex",  label: "Dataplex",     sub: "Catalog/Gov.",  icon: "🗺️", x: 1005, y: 590, color: "#34a853" },
    { id: "bigquery",  label: "BigQuery",     sub: "SQL engine",    icon: "📊", x: 1240, y: 162, color: "#4285f4" },
    { id: "trino",     label: "Trino",        sub: "Fed. queries",  icon: "🔍", x: 1240, y: 310, color: "#10b981" },
    { id: "looker",    label: "Looker Studio",sub: "Dashboards",    icon: "📈", x: 1240, y: 460, color: "#fbbc04" },
    { id: "bigtable",  label: "Bigtable",     sub: "Low-latency",   icon: "⚡", x: 1240, y: 580, color: "#ef4444" },
  ],
  edges: [
    { from: "pg",        to: "debezium",  color: "#8b5cf6", dur: 2.0 },
    { from: "mysql",     to: "debezium",  color: "#8b5cf6", dur: 2.5 },
    { from: "mongo",     to: "debezium",  color: "#8b5cf6", dur: 3.0 },
    { from: "events",    to: "pubsub",    color: "#4285f4", dur: 1.8 },
    { from: "restapi",   to: "airbyte",   color: "#06b6d4", dur: 2.8 },
    { from: "debezium",  to: "df_stream", color: "#34a853", dur: 1.8 },
    { from: "pubsub",    to: "df_stream", color: "#34a853", dur: 1.5 },
    { from: "pubsub",    to: "df_batch",  color: "#fbbc04", dur: 2.2 },
    { from: "airbyte",   to: "df_batch",  color: "#fbbc04", dur: 2.5 },
    { from: "df_stream", to: "dataproc",  color: "#ea4335", dur: 1.8 },
    { from: "df_stream", to: "flink",     color: "#10b981", dur: 2.0 },
    { from: "df_batch",  to: "dataproc",  color: "#ea4335", dur: 2.2 },
    { from: "df_batch",  to: "dbt",       color: "#06b6d4", dur: 2.5 },
    { from: "dataproc",  to: "bronze",    color: "#b45309", dur: 2.0 },
    { from: "flink",     to: "bronze",    color: "#b45309", dur: 1.8 },
    { from: "bronze",    to: "iceberg_s", color: "#06b6d4", dur: 2.2 },
    { from: "dbt",       to: "iceberg_s", color: "#06b6d4", dur: 2.8 },
    { from: "iceberg_s", to: "iceberg_g", color: "#eab308", dur: 2.0 },
    { from: "dataplex",  to: "iceberg_s", color: "#34a853", dur: 3.2 },
    { from: "iceberg_g", to: "bigquery",  color: "#4285f4", dur: 1.8 },
    { from: "iceberg_g", to: "trino",     color: "#10b981", dur: 2.2 },
    { from: "iceberg_s", to: "trino",     color: "#10b981", dur: 2.5 },
    { from: "bigquery",  to: "looker",    color: "#fbbc04", dur: 2.0 },
    { from: "trino",     to: "looker",    color: "#fbbc04", dur: 2.5 },
    { from: "flink",     to: "bigtable",  color: "#ef4444", dur: 1.8 },
  ],
};

const ALL_ARCHS = [ARCH_AWS, ARCH_GCP];

/* ─── Helpers ──────────────────────────────────────────────── */
function nodeCx(n: ANode, side: "left"|"right"|"top"|"bottom") {
  if (side === "left")   return { x: n.x - NW / 2, y: n.y };
  if (side === "right")  return { x: n.x + NW / 2, y: n.y };
  if (side === "top")    return { x: n.x,           y: n.y - NH / 2 };
  return                        { x: n.x,           y: n.y + NH / 2 };
}

function edgePath(nodes: ANode[], fromId: string, toId: string): string {
  const f = nodes.find(n => n.id === fromId);
  const t = nodes.find(n => n.id === toId);
  if (!f || !t) return "";
  const dx = t.x - f.x, dy = t.y - f.y;
  if (Math.abs(dx) >= Math.abs(dy) * 0.6) {
    const fp = nodeCx(f, dx >= 0 ? "right" : "left");
    const tp = nodeCx(t, dx >= 0 ? "left"  : "right");
    const mx = (fp.x + tp.x) / 2;
    return `M ${fp.x} ${fp.y} C ${mx} ${fp.y} ${mx} ${tp.y} ${tp.x} ${tp.y}`;
  } else {
    const fp = nodeCx(f, dy >= 0 ? "bottom" : "top");
    const tp = nodeCx(t, dy >= 0 ? "top"    : "bottom");
    const my = (fp.y + tp.y) / 2;
    return `M ${fp.x} ${fp.y} C ${fp.x} ${my} ${tp.x} ${my} ${tp.x} ${tp.y}`;
  }
}

/* ─── SVG Diagram ──────────────────────────────────────────── */
function Diagram({ arch, isDark }: { arch: Arch; isDark: boolean }) {
  const uid      = arch.id;
  const bg       = isDark ? "#06060b" : "#f1f5f9";
  const dotGrid  = isDark ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.06)";
  const textCol  = isDark ? "#ffffff"  : "#0f172a";
  const laneCol  = isDark ? "rgba(255,255,255,0.03)"  : "rgba(0,0,0,0.025)";
  const laneBdr  = isDark ? "rgba(255,255,255,0.06)"  : "rgba(0,0,0,0.08)";
  const nodeBg   = isDark ? 0.13 : 0.18;
  const nodeBdr  = isDark ? 2.0  : 1.5;
  const uniqC    = [...new Set(arch.edges.map(e => e.color))];

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={`grid-${uid}`} x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={dotGrid} />
        </pattern>
        {uniqC.map(c => (
          <marker key={c} id={`arr-${uid}-${c.replace("#","")}`}
            markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
            <path d="M 0 0 L 7 3 L 0 6 Z" fill={c} opacity={isDark ? 0.9 : 0.75} />
          </marker>
        ))}
        {uniqC.map(c => (
          <filter key={c} id={`glow-${uid}-${c.replace("#","")}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={isDark ? "4" : "2.5"} result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        ))}
        <filter id={`nglow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={isDark ? "6" : "3"} result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect width={VW} height={VH} fill={bg} />
      <rect width={VW} height={VH} fill={`url(#grid-${uid})`} />

      {/* Layer columns */}
      {arch.layers.map(l => (
        <g key={l.x}>
          <rect x={l.x - 78} y={24} width={156} height={VH - 30} rx={14}
            fill={laneCol} stroke={laneBdr} strokeWidth={1} />
          <text x={l.x} y={17} fontSize={9.5} fontWeight="700" textAnchor="middle"
            fill={isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)"}
            fontFamily="system-ui,sans-serif" letterSpacing="0.08em"
            style={{ textTransform: "uppercase" }}>
            {l.label}
          </text>
        </g>
      ))}

      {isDark && <>
        <circle cx="540"  cy="330" r="200" fill={arch.accent} opacity="0.03" />
        <circle cx="1000" cy="330" r="180" fill={arch.accent} opacity="0.03" />
      </>}

      {/* Edges */}
      {arch.edges.map((e, i) => {
        const d = edgePath(arch.nodes, e.from, e.to);
        if (!d) return null;
        const dur = e.dur ?? 2.5;
        const cid = e.color.replace("#","");
        const pid = `p-${uid}-${i}`;
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={e.color} strokeWidth={isDark ? 4 : 3} strokeOpacity={isDark ? 0.07 : 0.1} />
            <path id={pid} d={d} fill="none" stroke={e.color}
              strokeWidth={isDark ? 1.8 : 1.5} strokeOpacity={isDark ? 0.5 : 0.55}
              strokeDasharray="6 5" markerEnd={`url(#arr-${uid}-${cid})`}>
              <animate attributeName="stroke-dashoffset" from="110" to="0" dur={`${dur}s`} repeatCount="indefinite" />
            </path>
            <circle r={isDark ? 4 : 3.5} fill={e.color} filter={`url(#glow-${uid}-${cid})`}>
              <animateMotion dur={`${dur}s`} repeatCount="indefinite" rotate="auto">
                <mpath href={`#${pid}`} />
              </animateMotion>
            </circle>
            <circle r={isDark ? 2.5 : 2} fill={e.color} opacity="0.55">
              <animateMotion dur={`${dur}s`} begin={`${dur * 0.5}s`} repeatCount="indefinite" rotate="auto">
                <mpath href={`#${pid}`} />
              </animateMotion>
            </circle>
          </g>
        );
      })}

      {/* Nodes */}
      {arch.nodes.map((n, ni) => {
        const { x, y, color, label, sub, icon } = n;
        const hw = NW / 2, hh = NH / 2;
        const hexAlpha = Math.round(nodeBg * 255).toString(16).padStart(2,"0");
        return (
          <g key={n.id}>
            <rect x={x-hw-6} y={y-hh-6} width={NW+12} height={NH+12} rx={14}
              fill="none" stroke={color} strokeWidth={1}>
              <animate attributeName="opacity" values="0;0.5;0" dur={`${2.4 + ni * 0.3}s`} repeatCount="indefinite" />
            </rect>
            {isDark && (
              <rect x={x-hw-1} y={y-hh-1} width={NW+2} height={NH+2} rx={11}
                fill={color} opacity={0.06} filter={`url(#nglow-${uid})`} />
            )}
            <rect x={x-hw} y={y-hh} width={NW} height={NH} rx={10}
              fill={`${color}${hexAlpha}`} stroke={color}
              strokeWidth={nodeBdr} strokeOpacity={isDark ? 0.85 : 0.7} />
            <text x={x-hw+20} y={y+7} fontSize={16} textAnchor="middle"
              fontFamily="system-ui,sans-serif">{icon}</text>
            <text x={x-hw+36} y={y-5} fontSize={10} fontWeight="700"
              fill={textCol} fontFamily="system-ui,sans-serif">{label}</text>
            <text x={x-hw+36} y={y+10} fontSize={8.5} fill={color}
              opacity={isDark ? 0.9 : 0.8} fontFamily="system-ui,sans-serif">{sub}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Single card + modal ──────────────────────────────────── */
function ArchCard({ arch, isDark }: { arch: Arch; isDark: boolean }) {
  const [open, setOpen]       = useState(false);
  const [panelIn, setPanelIn] = useState(false);

  function handleOpen() {
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setPanelIn(true)));
  }
  function handleClose() {
    setPanelIn(false);
    setTimeout(() => setOpen(false), 380);
  }

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  const cardBg    = isDark ? "#08080f" : "var(--bg-card)";
  const previewBg = isDark ? "#04040a" : "#e8edf5";
  const borderDef = isDark ? `rgba(${hexToRgb(arch.accent)},0.22)` : "var(--border)";

  return (
    <>
      <button
        onClick={handleOpen}
        className="group w-full text-left rounded-2xl overflow-hidden transition-all duration-300"
        style={{ background: cardBg, border: `1px solid ${borderDef}`,
          boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.06)" }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = isDark
            ? `0 0 40px rgba(${hexToRgb(arch.accent)},0.18), 0 8px 32px rgba(0,0,0,0.7)`
            : `0 4px 24px rgba(${hexToRgb(arch.accent)},0.15)`;
          el.style.transform = "translateY(-3px)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = isDark ? "0 4px 24px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.06)";
          el.style.transform = "translateY(0)";
        }}
      >
        <div className="h-1" style={{ background: arch.accentGrad }} />

        {/* Preview */}
        <div className="relative overflow-hidden" style={{ background: previewBg, aspectRatio: "16/6.5" }}>
          <Diagram arch={arch} isDark={isDark} />
          <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, transparent, ${cardBg})` }} />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="px-5 py-2.5 rounded-full text-sm font-semibold text-white"
              style={{ background: `rgba(${hexToRgb(arch.accent)},0.88)`, backdropFilter: "blur(8px)" }}>
              Open full view →
            </div>
          </div>
        </div>

        {/* Info row */}
        <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{arch.emoji}</span>
              <span className="font-bold text-base" style={{ color: "var(--text)" }}>{arch.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: `rgba(${hexToRgb(arch.badgeColor)},0.12)`, color: arch.badgeColor }}>
                {arch.badge}
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{arch.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold"
            style={{ color: arch.accent }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Live animated · click to expand
          </div>
        </div>
      </button>

      {/* Fullscreen modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-5"
          style={{
            background: isDark ? "rgba(0,0,0,0.9)" : "rgba(15,23,42,0.75)",
            backdropFilter: "blur(12px)",
            opacity: panelIn ? 1 : 0,
            transition: "opacity 0.22s ease",
          }}
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="relative w-full flex flex-col rounded-2xl overflow-hidden"
            style={{
              maxWidth: 1320, maxHeight: "94vh",
              background: isDark ? "#07070d" : "var(--bg-card)",
              border: `1px solid ${isDark ? `rgba(${hexToRgb(arch.accent)},0.3)` : "var(--border)"}`,
              boxShadow: isDark
                ? `0 0 100px rgba(${hexToRgb(arch.accent)},0.12), 0 40px 100px rgba(0,0,0,0.9)`
                : "0 40px 100px rgba(0,0,0,0.25)",
              transform: panelIn ? "scale(1) translateY(0)" : "scale(0.88) translateY(40px)",
              transition: "transform 0.45s cubic-bezier(0.34,1.5,0.64,1)",
            }}
          >
            <div className="h-1 shrink-0" style={{ background: arch.accentGrad }} />

            <div className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "var(--border)"}` }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{arch.emoji}</span>
                <div>
                  <h2 className="font-bold text-base" style={{ color: "var(--text)" }}>{arch.title}</h2>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{arch.tagline}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1 rounded-full"
                  style={{ background: `rgba(${hexToRgb(arch.badgeColor)},0.1)`, color: arch.badgeColor,
                    border: `1px solid rgba(${hexToRgb(arch.badgeColor)},0.2)` }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
                  Data flowing live
                </span>
                <button onClick={handleClose}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ color: "var(--text-muted)", background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
                  ✕ close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
              <div style={{ minWidth: 700 }}>
                <Diagram arch={arch} isDark={isDark} />
              </div>
            </div>

            <div className="shrink-0 px-5 py-3 flex flex-wrap gap-2 overflow-auto"
              style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "var(--border)"}` }}>
              {arch.nodes.map(n => (
                <span key={n.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs whitespace-nowrap"
                  style={{ background: `${n.color}14`, color: n.color, border: `1px solid ${n.color}28` }}>
                  {n.icon} <span className="font-medium">{n.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Hex helper ───────────────────────────────────────────── */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

/* ─── Gallery ──────────────────────────────────────────────── */
export default function ArchitectureGallery() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = !mounted || resolvedTheme === "dark";

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xl">🏗️</span>
        <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Architecture Diagrams</h2>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>
          {ALL_ARCHS.length} diagrams
        </span>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {ALL_ARCHS.map(arch => (
          <ArchCard key={arch.id} arch={arch} isDark={isDark} />
        ))}
      </div>
    </div>
  );
}
