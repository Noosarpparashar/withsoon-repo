"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { NODES, CONNECTIONS, FLOWS, type NodeData, type NodeId, type Flow } from "./nodes-data";
import { C } from "./constants";
import ModelsTab from "./ModelsTab";
import TradeoffsTab from "./TradeoffsTab";
import CapacityTab from "./CapacityTab";
import QuizTab from "./QuizTab";
import { MockInterviewTab } from "../netflix-tabs/MockInterviewTab";
import { CheatSheetTab } from "../netflix-tabs/CheatSheetTab";
import { RequirementsTab } from "../netflix-tabs/RequirementsTab";
import { FailuresTab } from "../netflix-tabs/FailuresTab";
import { StartHereTab } from "../netflix-tabs/StartHereTab";
import { PlaybackTab } from "../netflix-tabs/PlaybackTab";
import { CDNTab } from "../netflix-tabs/CDNTab";
import { SecurityTab } from "../netflix-tabs/SecurityTab";
import { EncodingTab } from "../netflix-tabs/EncodingTab";
import type { Role } from "../netflix-tabs/types";

// ── Tab config ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "start-here",     label: "Start Here"     },
  { id: "requirements",   label: "Requirements"   },
  { id: "architecture",   label: "Architecture"   },
  { id: "playback",       label: "Playback"       },
  { id: "cdn",            label: "CDN"            },
  { id: "encoding",       label: "Encoding"       },
  { id: "security",       label: "Security"       },
  { id: "models",         label: "Data Models"    },
  { id: "tradeoffs",      label: "Trade-offs"     },
  { id: "capacity",       label: "Capacity"       },
  { id: "failures",       label: "Failures"       },
  { id: "quiz",           label: "Quiz"           },
  { id: "mock-interview", label: "Mock Interview" },
  { id: "cheat-sheet",    label: "Cheat Sheet"    },
] as const;
type TabId = typeof TABS[number]["id"];

// ── Constants ──────────────────────────────────────────────────────────────────
const N_RED    = C.red;
const N_AMBER  = C.amber;
const N_GREEN  = C.green;
const N_BG     = C.bg;
const N_CARD   = C.card;
const N_BORDER = C.border;
const N_MUTED  = C.muted;
const N_TEXT   = C.text;
const N_FAINT  = C.faint;

const PROTOCOL_COLORS: Record<string, string> = {
  gRPC: "#818cf8", HTTPS: "#38bdf8", Kafka: "#f59e0b",
  SQL: "#6ee7b7", Redis: "#f87171", S3: "#a78bfa", "gRPC/REST": "#818cf8",
};

const LAYER_Y: Record<number, number> = { 1: 40, 2: 170, 3: 310, 4: 460, 5: 600, 6: 740 };
const NODE_W = 130;
const NODE_H = 72;
const CANVAS_W = 1320;
const CANVAS_H = 850;
const LAYER_LABELS: Record<number, string> = {
  1: "CLIENT", 2: "GATEWAY", 3: "SERVICES", 4: "SERVICES", 5: "DATA STORES", 6: "CDN / VIDEO",
};
const TYPE_COLORS: Record<string, string> = {
  client: "#38bdf8", gateway: "#818cf8", service: "#f59e0b",
  datastore: "#6ee7b7", pipeline: "#e879f9",
};

// ── Node positions ─────────────────────────────────────────────────────────────
function getNodePos(node: NodeData): { x: number; y: number } {
  const layerNodes = NODES.filter(n => n.layer === node.layer).sort((a, b) => a.col - b.col);
  const spacing = node.layer === 5 ? 150 : 160;
  const totalWidth = (layerNodes.length - 1) * spacing;
  const baseX = 660 - totalWidth / 2;
  const idx = layerNodes.findIndex(n => n.id === node.id);
  const x = node.layer === 1 || node.layer === 2 ? 600 - NODE_W / 2 : baseX + idx * spacing - NODE_W / 2;
  return { x, y: LAYER_Y[node.layer] };
}
const NODE_POSITIONS = Object.fromEntries(NODES.map(n => [n.id, getNodePos(n)]));

// ── Custom SVG icon paths (14×14 viewbox) ──────────────────────────────────────
// Each path is defined in a 0,0–14,14 coordinate space, rendered stroke-only unless noted.
const ICON_PATHS: Record<string, { d: string; filled?: boolean }> = {
  client:          { d: "M1,2h12a1,1,0,0,1,1,1v8a1,1,0,0,1-1,1H1a1,1,0,0,1-1-1V3a1,1,0,0,1,1-1zM5,12h4" },
  "api-gateway":   { d: "M1,7h12M10,4l3,3-3,3M4,10l-3-3,3-3" },
  auth:            { d: "M4,7V5a3,3,0,0,1,6,0v2M1,7h12a1,1,0,0,1,1,1v5a1,1,0,0,1-1,1H1a1,1,0,0,1-1-1V8a1,1,0,0,1,1-1zM7,10v2" },
  user:            { d: "M7,7a3,3,0,1,0,0-6,3,3,0,1,0,0,6M1,13.5a6,4,0,0,1,12,0" },
  catalog:         { d: "M2,3h10M2,7h8M2,11h5" },
  streaming:       { d: "M3,1L13,7,3,13Z", filled: true },
  drm:             { d: "M4,8a3,3,0,1,1,6,0,3,3,0,1,1-6,0M9,10l4,4" },
  search:          { d: "M2,6a4,4,0,1,0,8,0,4,4,0,1,0-8,0M9,9l4,4" },
  recommendation:  { d: "M7,1l1.5,4.5h4.5l-3.5,2.5,1.5,4.5L7,10,3.5,12.5,5,8,1.5,5.5H6Z", filled: true },
  "watch-history": { d: "M7,0.5a6.5,6.5,0,1,0,0,13,6.5,6.5,0,1,0,0-13M7,4v3.5l2.5,2" },
  payment:         { d: "M0.5,4h13a0.5,0.5,0,0,1,.5.5v7a0.5.0.5,0,0,1-.5.5H0.5a0.5.0.5,0,0,1-.5-.5V4.5a0.5.0.5,0,0,1,.5-.5zM0.5,6.5h13M2,9.5h3" },
  notification:    { d: "M7,1.5a4,4,0,0,1,4,4v3l1.5,2H1.5L3,8.5v-3a4,4,0,0,1,4-4M5.5,11a1.5,1.5,0,0,0,3,0" },
  analytics:       { d: "M0.5,13.5h13M2.5,13.5V7.5M7,13.5V3.5M11.5,13.5V9" },
  aurora:          { d: "M3,3a4,1.5,0,0,0,8,0,4,1.5,0,0,0-8,0v8a4,1.5,0,0,0,8,0V3M3,7a4,1.5,0,0,0,8,0" },
  dynamodb:        { d: "M8.5,1L4.5,7.5h4L4.5,13,10,7h-4Z", filled: true },
  redis:           { d: "M1,1h6a3.5,3.5,0,0,1,0,7H1ZM5,1v12M8,8l4,5" },
  kafka:           { d: "M1,7C3,3.5,5,10.5,7,7C9,3.5,11,10.5,13,7" },
  cassandra:       { d: "M7,0.5l5.5,3.25v6.5L7,13.5,1.5,10.25V3.75Z" },
  opensearch:      { d: "M7,7m-5,0a5,5,0,1,0,10,0,5,5,0,1,0-10,0M4.5,7h5M7,4.5v5" },
  kinesis:         { d: "M1,5C3,2,5,8,7,5C9,2,11,8,13,5M1,9C3,6,5,12,7,9C9,6,11,12,13,9" },
  transcoder:      { d: "M7,3.5a3.5,3.5,0,1,0,0,7,3.5,3.5,0,1,0,0-7M7,1v2.5M7,10.5V13M1,7h2.5M10.5,7H13M3.6,3.6l1.7,1.7M8.7,8.7l1.7,1.7" },
  s3:              { d: "M4,8a5,5,0,0,1,6,0H3.5a5,5,0,0,1,3.5-5.5A5,5,0,0,1,11.5,8M3.5,8V12h7V8" },
  cdn:             { d: "M7,0.5a6.5,6.5,0,1,0,0,13,6.5,6.5,0,1,0,0-13M0.5,7h13M7,0.5C4.5,3.5,4.5,10.5,7,13.5C9.5,10.5,9.5,3.5,7,0.5" },
};

// ── Node SVG icon renderer ─────────────────────────────────────────────────────
function NodeIconSVG({ nodeId, x, y, color }: { nodeId: string; x: number; y: number; color: string }) {
  const icon = ICON_PATHS[nodeId];
  if (!icon) return null;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <path
        d={icon.d}
        fill={icon.filled ? color : "none"}
        stroke={icon.filled ? "none" : color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
    </g>
  );
}

// ── Chip ───────────────────────────────────────────────────────────────────────
function Chip({ label, color = N_BORDER }: { label: string; color?: string }) {
  return (
    <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{ background: color + "18", color, border: `1px solid ${color}40`, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

// ── Callout ────────────────────────────────────────────────────────────────────
const CALLOUT_COLORS = {
  info:    { bg: "rgba(56,189,248,0.08)",  border: "#38bdf840", text: "#38bdf8", icon: "ℹ" },
  warn:    { bg: "rgba(245,158,11,0.08)",  border: "#f59e0b40", text: "#f59e0b", icon: "⚠" },
  danger:  { bg: "rgba(239,68,68,0.08)",   border: "#ef444440", text: "#ef4444", icon: "⚡" },
  success: { bg: "rgba(34,197,94,0.08)",   border: "#22c55e40", text: "#22c55e", icon: "✓" },
};
function Callout({ variant, title, body }: { variant: keyof typeof CALLOUT_COLORS; title: string; body: string }) {
  const c = CALLOUT_COLORS[variant];
  return (
    <div className="rounded-lg p-3 mb-3" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-start gap-2">
        <span className="text-sm shrink-0 mt-0.5" style={{ color: c.text }}>{c.icon}</span>
        <div>
          <p className="text-xs font-bold mb-1" style={{ color: c.text }}>{title}</p>
          <p className="text-xs leading-relaxed" style={{ color: "#999" }}>{body}</p>
        </div>
      </div>
    </div>
  );
}

// ── Node card ──────────────────────────────────────────────────────────────────
function NodeCard({
  node, isSelected, flowStep, isFlowVisited, isStudied, animDelay, onClick, onHover,
}: {
  node: NodeData; isSelected: boolean;
  flowStep?: number; isFlowVisited?: boolean;
  isStudied?: boolean; animDelay: number;
  onClick: () => void;
  onHover: (id: NodeId | null, x?: number, y?: number) => void;
}) {
  const pos = NODE_POSITIONS[node.id];
  const typeColor = TYPE_COLORS[node.type] ?? N_MUTED;
  const borderColor = isSelected ? N_RED : isFlowVisited ? N_AMBER : N_BORDER;

  return (
    <g
      className="cursor-pointer"
      style={{ animation: `fadeInNode 0.35s ease both`, animationDelay: `${animDelay}ms` }}
      onClick={onClick}
      role="button"
      aria-label={`${node.label} — click to explore`}
      tabIndex={0}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick()}
      onMouseEnter={e => onHover(node.id, e.clientX, e.clientY)}
      onMouseLeave={() => onHover(null)}
    >
      <rect x={pos.x} y={pos.y} width={NODE_W} height={NODE_H} rx="8"
        style={{ fill: isSelected ? "#1a0a0a" : isFlowVisited ? "#140f00" : N_CARD, stroke: borderColor, strokeWidth: isSelected || isFlowVisited ? 1.5 : 1 }} />
      {/* Top accent bar */}
      <rect x={pos.x} y={pos.y} width={NODE_W} height={3} rx="8" style={{ fill: typeColor, opacity: 0.7 }} />
      {/* Custom SVG icon */}
      <NodeIconSVG nodeId={node.id} x={pos.x + 4} y={pos.y + 8} color={typeColor} />
      {/* Label */}
      <text x={pos.x + 22} y={pos.y + 22}
        style={{ fill: N_TEXT, fontSize: 11, fontWeight: "bold", fontFamily: "Inter, sans-serif" }}>
        {node.label.length > 14 ? node.label.slice(0, 14) + "…" : node.label}
      </text>
      {/* Sublabel */}
      <text x={pos.x + 8} y={pos.y + 42}
        style={{ fill: N_MUTED, fontSize: 9, fontFamily: "Inter, sans-serif" }}>
        {node.sublabel.length > 20 ? node.sublabel.slice(0, 20) + "…" : node.sublabel}
      </text>
      {/* Type chip background */}
      <rect x={pos.x + 6} y={pos.y + NODE_H - 20} width={NODE_W - 12} height={14} rx="3"
        style={{ fill: typeColor + "18", stroke: typeColor + "30", strokeWidth: 0.5 }} />
      <text x={pos.x + NODE_W / 2} y={pos.y + NODE_H - 9}
        style={{ fill: typeColor, fontSize: 8, fontWeight: "bold", textAnchor: "middle", fontFamily: "Inter, sans-serif" }}>
        {node.type.toUpperCase()}
      </text>
      {/* Studied checkmark */}
      {isStudied && <>
        <circle cx={pos.x + 10} cy={pos.y + 10} r={7} style={{ fill: N_GREEN + "30", stroke: N_GREEN, strokeWidth: 1 }} />
        <text x={pos.x + 10} y={pos.y + 14} style={{ fill: N_GREEN, fontSize: 8, textAnchor: "middle" }}>✓</text>
      </>}
      {/* Flow step badge */}
      {flowStep !== undefined && <>
        <circle cx={pos.x + NODE_W - 10} cy={pos.y + 10} r={9} style={{ fill: N_AMBER }} />
        <text x={pos.x + NODE_W - 10} y={pos.y + 14}
          style={{ fill: "#000", fontSize: 9, fontWeight: "bold", textAnchor: "middle", fontFamily: "Inter, sans-serif" }}>
          {flowStep}
        </text>
      </>}
    </g>
  );
}

// ── Connections ────────────────────────────────────────────────────────────────
function ConnectionArrows({ activeNodeId, activeFlowNodeIds }: { activeNodeId?: NodeId; activeFlowNodeIds?: NodeId[] }) {
  return (
    <g>
      <defs>
        <marker id="arr-d" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" style={{ fill: N_FAINT }} />
        </marker>
        <marker id="arr-a" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" style={{ fill: N_RED }} />
        </marker>
        <marker id="arr-f" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" style={{ fill: N_AMBER }} />
        </marker>
      </defs>
      {CONNECTIONS.map((conn, i) => {
        const fromPos = NODE_POSITIONS[conn.from];
        const toPos = NODE_POSITIONS[conn.to];
        if (!fromPos || !toPos) return null;
        const fx = fromPos.x + NODE_W / 2, fy = fromPos.y + NODE_H;
        const tx = toPos.x + NODE_W / 2, ty = toPos.y;
        const isActive = activeNodeId && (conn.from === activeNodeId || conn.to === activeNodeId);
        const isFlow = activeFlowNodeIds && activeFlowNodeIds.includes(conn.from) && activeFlowNodeIds.includes(conn.to);
        const color = isActive ? N_RED : isFlow ? N_AMBER : N_FAINT;
        const markerId = isActive ? "arr-a" : isFlow ? "arr-f" : "arr-d";
        const dx = tx - fx;
        const cy1 = fy + Math.min(30, Math.abs(fy - ty) * 0.4);
        const cy2 = ty - Math.min(30, Math.abs(fy - ty) * 0.4);
        const midX = (fx + tx) / 2, midY = (fy + ty) / 2;
        return (
          <g key={i} opacity={isActive || isFlow ? 1 : 0.35}>
            <path d={`M ${fx} ${fy} C ${fx + dx * 0.1} ${cy1}, ${tx - dx * 0.1} ${cy2}, ${tx} ${ty - 6}`}
              style={{ fill: "none", stroke: color, strokeWidth: isActive || isFlow ? 1.5 : 0.8 }}
              markerEnd={`url(#${markerId})`} />
            {(isActive || isFlow) && <>
              <rect x={midX - 18} y={midY - 8} width={36} height={14} rx={3}
                style={{ fill: N_CARD, stroke: color + "60", strokeWidth: 0.5 }} />
              <text x={midX} y={midY + 4}
                style={{ fill: color, fontSize: 8, textAnchor: "middle", fontFamily: "JetBrains Mono, monospace" }}>
                {conn.label}
              </text>
            </>}
          </g>
        );
      })}
    </g>
  );
}

// ── Layer labels ───────────────────────────────────────────────────────────────
function LayerLabels() {
  return (
    <g>
      {Object.entries(LAYER_Y).map(([layer, y]) => (
        <text key={layer} x={8} y={y + NODE_H / 2}
          style={{ fill: N_FAINT, fontSize: 8, fontWeight: "bold", letterSpacing: 1, fontFamily: "Inter, sans-serif" }}>
          {LAYER_LABELS[parseInt(layer)]}
        </text>
      ))}
    </g>
  );
}

// ── Mini-map ───────────────────────────────────────────────────────────────────
const MM_W = 160, MM_H = 96;
const MM_SCALE = MM_W / CANVAS_W;

function MiniMap({
  zoom, pan, containerW, containerH,
}: { zoom: number; pan: { x: number; y: number }; containerW: number; containerH: number }) {
  // Viewport rect in canvas-space
  const vpX = -pan.x / zoom;
  const vpY = -pan.y / zoom;
  const vpW = containerW / zoom;
  const vpH = containerH / zoom;
  return (
    <div
      className="absolute pointer-events-none rounded-lg overflow-hidden"
      style={{ bottom: 48, left: 8, width: MM_W, height: MM_H, background: "rgba(10,10,10,0.85)", border: `1px solid ${N_BORDER}`, zIndex: 5 }}>
      <svg width={MM_W} height={MM_H}>
        {/* node dots */}
        {NODES.map(n => {
          const pos = NODE_POSITIONS[n.id];
          const color = TYPE_COLORS[n.type] ?? N_MUTED;
          return (
            <rect key={n.id}
              x={pos.x * MM_SCALE} y={pos.y * MM_SCALE}
              width={NODE_W * MM_SCALE} height={NODE_H * MM_SCALE}
              rx={1} fill={color} opacity={0.5} />
          );
        })}
        {/* viewport indicator */}
        <rect
          x={Math.max(0, vpX * MM_SCALE)} y={Math.max(0, vpY * MM_SCALE)}
          width={Math.min(MM_W, vpW * MM_SCALE)} height={Math.min(MM_H, vpH * MM_SCALE)}
          fill="none" stroke={N_RED} strokeWidth={1.5} opacity={0.8} rx={1} />
      </svg>
      <div className="absolute bottom-0.5 left-1 text-[7px]" style={{ color: N_FAINT }}>MAP</div>
    </div>
  );
}

// ── Detail Panel ───────────────────────────────────────────────────────────────
type DepthLevel = "overview" | "interview" | "deepdive";

function DetailPanel({
  node, studiedNodes, onMarkStudied, onNavigateTo,
  activeFlow, activeFlowStep, onFlowNext, onFlowPrev, onExitFlow,
}: {
  node: NodeData | null;
  studiedNodes: Set<NodeId>;
  onMarkStudied: (id: NodeId) => void;
  onNavigateTo: (id: NodeId) => void;
  activeFlow: Flow | null;
  activeFlowStep: number;
  onFlowNext: () => void;
  onFlowPrev: () => void;
  onExitFlow: () => void;
}) {
  const [depth, setDepth] = useState<DepthLevel>("overview");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (node) setDepth("overview");
    panelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [node?.id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "1") setDepth("overview");
      if (e.key === "2") setDepth("interview");
      if (e.key === "3") setDepth("deepdive");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const isStudied = node ? studiedNodes.has(node.id) : false;

  if (activeFlow) {
    const step = activeFlow.steps[activeFlowStep];
    const total = activeFlow.steps.length;
    return (
      <div ref={panelRef} className="flex flex-col h-full overflow-y-auto"
        style={{ background: N_CARD, borderLeft: `1px solid ${N_BORDER}` }}>
        <div className="sticky top-0 z-10 px-4 py-3" style={{ background: N_CARD, borderBottom: `1px solid ${N_BORDER}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: N_AMBER }}>{activeFlow.label}</span>
            <button onClick={onExitFlow} className="text-xs px-2 py-1 rounded" style={{ background: N_BORDER, color: N_MUTED }}>✕</button>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            {activeFlow.steps.map((_, i) => (
              <div key={i} className="h-1.5 rounded-full transition-all duration-200"
                style={{ width: i === activeFlowStep ? 20 : 8, background: i <= activeFlowStep ? N_AMBER : N_FAINT }} />
            ))}
          </div>
          <div className="text-[10px]" style={{ color: N_MUTED }}>Step {activeFlowStep + 1} of {total}</div>
        </div>
        <div className="p-4 flex-1">
          <div className="rounded-lg p-4 mb-4" style={{ background: "#141400", border: `1px solid ${N_AMBER}30` }}>
            <div className="flex items-start gap-2 mb-2">
              <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                style={{ background: N_AMBER, color: "#000" }}>{activeFlowStep + 1}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: N_AMBER }}>{step.name}</p>
                <p className="text-[10px]" style={{ color: N_MUTED }}>{NODES.find(n => n.id === step.nodeId)?.label}</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed mb-3" style={{ color: "#aaa" }}>{step.description}</p>
            {step.payload && (
              <div className="rounded-md p-2.5 mb-3" style={{ background: "#0d0d0d", border: `1px solid ${N_BORDER}` }}>
                <pre className="text-[10px] leading-relaxed overflow-x-auto" style={{ color: "#6ee7b7", fontFamily: C.mono }}>{step.payload}</pre>
              </div>
            )}
            {step.whyItMatters && (
              <div className="rounded p-2" style={{ background: "rgba(245,166,35,0.06)", border: `1px solid ${N_AMBER}25` }}>
                <p className="text-[10px] font-bold mb-0.5" style={{ color: N_AMBER }}>Why this matters</p>
                <p className="text-[10px] leading-relaxed" style={{ color: N_MUTED }}>{step.whyItMatters}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onFlowPrev} disabled={activeFlowStep === 0}
              className="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-30"
              style={{ background: N_BORDER, color: N_TEXT }}>← Prev</button>
            <button onClick={onFlowNext} disabled={activeFlowStep === total - 1}
              className="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-30"
              style={{ background: N_AMBER, color: "#000" }}>Next →</button>
          </div>
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6"
        style={{ background: N_CARD, borderLeft: `1px solid ${N_BORDER}` }}>
        <div className="text-4xl mb-4" style={{ opacity: 0.3 }}>←</div>
        <p className="text-sm font-semibold mb-1" style={{ color: N_MUTED }}>Click any component</p>
        <p className="text-xs" style={{ color: N_FAINT }}>to explore its design, interview answers, and deep dives</p>
        <div className="mt-6 text-[10px] space-y-1" style={{ color: N_FAINT }}>
          <p>1 / 2 / 3 — switch depth</p>
          <p>N / P — next / prev node</p>
          <p>⌘K — command palette</p>
        </div>
      </div>
    );
  }

  const typeColor = TYPE_COLORS[node.type] ?? N_MUTED;
  return (
    <div ref={panelRef} className="flex flex-col h-full overflow-y-auto"
      style={{ background: N_CARD, borderLeft: `1px solid ${N_BORDER}` }}>
      <div className="sticky top-0 z-10 px-4 py-3" style={{ background: N_CARD, borderBottom: `1px solid ${N_BORDER}` }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: typeColor + "18", color: typeColor, border: `1px solid ${typeColor}30` }}>
              {node.type}
            </span>
            <h2 className="text-base font-bold mt-1" style={{ color: N_TEXT }}>{node.label}</h2>
            <p className="text-[10px]" style={{ color: N_MUTED }}>{node.sublabel}</p>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer shrink-0 mt-1">
            <input type="checkbox" checked={isStudied} onChange={() => onMarkStudied(node.id)}
              className="w-3.5 h-3.5 cursor-pointer" style={{ accentColor: N_GREEN }} />
            <span className="text-[10px]" style={{ color: isStudied ? N_GREEN : N_FAINT }}>
              {isStudied ? "✓ Studied" : "Mark studied"}
            </span>
          </label>
        </div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${N_BORDER}` }}>
          {(["overview", "interview", "deepdive"] as DepthLevel[]).map((d, i) => (
            <button key={d} onClick={() => setDepth(d)}
              className="flex-1 py-1.5 text-[10px] font-medium transition-colors"
              style={{ background: depth === d ? typeColor : "transparent", color: depth === d ? "#000" : N_MUTED, borderRight: i < 2 ? `1px solid ${N_BORDER}` : undefined }}>
              {d === "overview" ? "Overview" : d === "interview" ? "Interview" : "Deep Dive"}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 space-y-4 flex-1">
        {depth === "overview" && <>
          <p className="text-xs leading-relaxed" style={{ color: "#bbb" }}>{node.overview}</p>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: N_FAINT }}>Tech Stack</p>
            <div className="flex flex-wrap gap-1.5">{node.techChips.map(c => <Chip key={c} label={c} color={typeColor} />)}</div>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: N_FAINT }}>Key Numbers</p>
            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${N_BORDER}` }}>
              {node.kvPairs.map((kv, i) => (
                <div key={i} className="flex justify-between px-3 py-1.5"
                  style={{ borderBottom: i < node.kvPairs.length - 1 ? `1px solid ${N_BORDER}` : undefined }}>
                  <span className="text-[10px]" style={{ color: N_MUTED }}>{kv.label}</span>
                  <span className="text-[10px] font-mono font-medium" style={{ color: N_TEXT }}>{kv.value}</span>
                </div>
              ))}
            </div>
          </div>
        </>}
        {depth === "interview" && <>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: N_FAINT }}>Say out loud</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: N_GREEN + "18", color: N_GREEN, border: `1px solid ${N_GREEN}30` }}>
              {node.interviewTime}
            </span>
          </div>
          <div className="rounded-lg p-3" style={{ background: "#0d0d0d", border: `1px solid ${N_BORDER}` }}>
            <p className="text-[11px] leading-relaxed" style={{ color: "#d4d4d4" }}>{node.interviewAnswer}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: N_FAINT }}>Don&apos;t forget</p>
            <ul className="space-y-1.5">
              {node.dontForget.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-xs shrink-0 mt-0.5" style={{ color: N_RED }}>→</span>
                  <span className="text-[10px] leading-relaxed" style={{ color: N_MUTED }}>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </>}
        {depth === "deepdive" && (
          <>{node.deepDives.map((dd, i) => <Callout key={i} variant={dd.variant} title={dd.title} body={dd.body} />)}</>
        )}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: N_FAINT }}>Related</p>
          <div className="flex flex-wrap gap-1.5">
            {node.relatedNodes.filter(id => NODES.find(n => n.id === id)).map(id => {
              const related = NODES.find(n => n.id === id)!;
              const conn = CONNECTIONS.find(c => (c.from === node.id && c.to === id) || (c.from === id && c.to === node.id));
              return (
                <button key={id} onClick={() => onNavigateTo(id)}
                  className="text-[10px] px-2 py-1 rounded-md hover:opacity-80 transition-colors"
                  style={{ background: N_BORDER, color: N_TEXT, border: `1px solid ${N_BORDER}` }}>
                  {related.label}
                  {conn && <span className="ml-1 opacity-60" style={{ color: PROTOCOL_COLORS[conn.style ?? "HTTPS"] ?? N_MUTED }}>{conn.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Command Palette ────────────────────────────────────────────────────────────
function CommandPalette({ onSelect, onClose }: { onSelect: (id: NodeId) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const results = useMemo(() => {
    const q = query.toLowerCase();
    return NODES.filter(n => n.label.toLowerCase().includes(q) || n.sublabel.toLowerCase().includes(q) || n.type.includes(q));
  }, [query]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16"
      style={{ background: "rgba(0,0,0,0.8)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl"
        style={{ background: N_CARD, border: `1px solid ${N_BORDER}` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${N_BORDER}` }}>
          <span style={{ color: N_MUTED }}>⌘</span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Jump to any component…"
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: N_TEXT }} />
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: N_BORDER, color: N_MUTED }}>Esc</span>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {results.map(n => (
            <button key={n.id} onClick={() => { onSelect(n.id); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors">
              <svg width={14} height={14} viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
                <NodeIconSVG nodeId={n.id} x={0} y={0} color={TYPE_COLORS[n.type] ?? N_MUTED} />
              </svg>
              <div>
                <p className="text-sm" style={{ color: N_TEXT }}>{n.label}</p>
                <p className="text-[10px]" style={{ color: N_MUTED }}>{n.sublabel}</p>
              </div>
              <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded"
                style={{ background: TYPE_COLORS[n.type] + "18", color: TYPE_COLORS[n.type], border: `1px solid ${TYPE_COLORS[n.type]}30` }}>
                {n.type}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shortcuts modal ────────────────────────────────────────────────────────────
function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const rows = [
    ["⌘K",        "Open command palette"],
    ["N / P",     "Next / previous node"],
    ["1 / 2 / 3", "Switch detail depth"],
    ["← →",       "Navigate flow steps (on Architecture tab)"],
    ["Tab ← →",   "Switch tabs with arrow keys (when tab row is focused)"],
    ["Esc",       "Close panel / exit flow"],
  ];
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.8)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl overflow-hidden"
        style={{ background: N_CARD, border: `1px solid ${N_BORDER}` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${N_BORDER}` }}>
          <p className="text-sm font-bold" style={{ color: N_TEXT }}>Keyboard Shortcuts</p>
          <button onClick={onClose} style={{ color: N_MUTED }}>✕</button>
        </div>
        <div className="p-4 space-y-2">
          {rows.map(([key, desc]) => (
            <div key={key} className="flex items-center gap-3">
              <code className="text-[10px] font-mono px-2 py-0.5 rounded shrink-0"
                style={{ background: N_BORDER, color: N_TEXT }}>{key}</code>
              <span className="text-[10px]" style={{ color: N_MUTED }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Architecture tab ───────────────────────────────────────────────────────────
function ArchitectureTab({
  studiedNodes, onMarkStudied,
}: { studiedNodes: Set<NodeId>; onMarkStudied: (id: NodeId) => void; interviewMode: boolean }) {
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ id: NodeId; x: number; y: number } | null>(null);
  const [activeFlow, setActiveFlow] = useState<Flow | null>(null);
  const [activeFlowStep, setActiveFlowStep] = useState(0);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [mobileOverlayDismissed, setMobileOverlayDismissed] = useState(false);
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const z = localStorage.getItem("netflix-zoom");
      if (z) setZoom(parseFloat(z));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem("netflix-zoom", String(zoom)); } catch { /* ignore */ } }, [zoom]);

  // ResizeObserver
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(v => !v); return; }
      if (e.key === "Escape") {
        setCmdOpen(false); setSelectedNode(null);
        if (activeFlow) { setActiveFlow(null); setActiveFlowStep(0); }
        return;
      }
      if (e.key === "ArrowRight" && activeFlow) { setActiveFlowStep(s => Math.min(s + 1, activeFlow.steps.length - 1)); return; }
      if (e.key === "ArrowLeft" && activeFlow) { setActiveFlowStep(s => Math.max(s - 1, 0)); return; }
      if (e.key === "n" || e.key === "N") {
        const idx = NODES.findIndex(n => n.id === selectedNode);
        if (idx < NODES.length - 1) setSelectedNode(NODES[idx + 1].id);
        return;
      }
      if (e.key === "p" || e.key === "P") {
        const idx = NODES.findIndex(n => n.id === selectedNode);
        if (idx > 0) setSelectedNode(NODES[idx - 1].id);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeFlow, selectedNode]);

  const handleActivateFlow = useCallback((flow: Flow) => {
    setActiveFlow(prev => prev?.id === flow.id ? null : flow);
    setActiveFlowStep(0);
    setSelectedNode(flow.steps[0]?.nodeId ?? null);
  }, []);

  const handleFlowNext = useCallback(() => {
    if (!activeFlow) return;
    const next = Math.min(activeFlowStep + 1, activeFlow.steps.length - 1);
    setActiveFlowStep(next); setSelectedNode(activeFlow.steps[next].nodeId);
  }, [activeFlow, activeFlowStep]);

  const handleFlowPrev = useCallback(() => {
    if (!activeFlow) return;
    const prev = Math.max(activeFlowStep - 1, 0);
    setActiveFlowStep(prev); setSelectedNode(activeFlow.steps[prev].nodeId);
  }, [activeFlow, activeFlowStep]);

  const handleExitFlow = useCallback(() => { setActiveFlow(null); setActiveFlowStep(0); }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).closest("g[role='button']")) return;
    isPanning.current = true;
    lastPan.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning.current) return;
    setPan({ x: e.clientX - lastPan.current.x, y: e.clientY - lastPan.current.y });
  }, []);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.5, Math.min(1.5, z - e.deltaY * 0.001)));
  }, []);

  const handleHover = useCallback((id: NodeId | null, x?: number, y?: number) => {
    if (id && x !== undefined && y !== undefined) setHoveredNode({ id, x, y });
    else setHoveredNode(null);
  }, []);

  const flowNodeIds = activeFlow ? activeFlow.steps.slice(0, activeFlowStep + 1).map(s => s.nodeId) : [];
  const selectedNodeData = selectedNode ? NODES.find(n => n.id === selectedNode) ?? null : null;
  const hoveredNodeData = hoveredNode && !selectedNode ? NODES.find(n => n.id === hoveredNode.id) : null;

  // Stagger animation delays by layer+col
  const animDelays = useMemo(() => {
    return Object.fromEntries(NODES.map(n => [n.id, n.layer * 60 + n.col * 25]));
  }, []);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ── Mobile accordion fallback (hidden on sm+) ── */}
      <div className="sm:hidden flex-1 overflow-y-auto" style={{ background: N_BG }}>
        <div className="px-4 py-3 text-center" style={{ borderBottom: `1px solid ${N_BORDER}` }}>
          <p className="text-xs font-semibold" style={{ color: N_MUTED }}>Full interactive diagram on desktop</p>
          <p className="text-[10px] mt-0.5" style={{ color: N_FAINT }}>All {NODES.length} components listed below</p>
        </div>
        {[1, 2, 3, 4, 5, 6].map(layer => {
          const layerNodes = NODES.filter(n => n.layer === layer).sort((a, b) => a.col - b.col);
          return (
            <div key={layer} style={{ borderBottom: `1px solid ${N_BORDER}` }}>
              <div className="px-4 py-2" style={{ background: N_CARD }}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: N_FAINT }}>{LAYER_LABELS[layer]}</p>
              </div>
              {layerNodes.map(node => {
                const typeColor = TYPE_COLORS[node.type] ?? N_MUTED;
                const isSelected = selectedNode === node.id;
                return (
                  <div key={node.id}>
                    <button
                      className="w-full text-left px-4 py-3 flex items-center gap-3"
                      style={{ background: isSelected ? typeColor + "0a" : "transparent", borderBottom: `1px solid ${N_BORDER}` }}
                      onClick={() => setSelectedNode(isSelected ? null : node.id)}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: typeColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: N_TEXT }}>{node.label}</p>
                        <p className="text-[10px] truncate" style={{ color: N_MUTED }}>{node.sublabel}</p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: typeColor + "18", color: typeColor }}>{node.type}</span>
                      <span style={{ color: N_FAINT, fontSize: 10 }}>{isSelected ? "▲" : "▼"}</span>
                    </button>
                    {isSelected && (
                      <div className="px-4 py-4 space-y-3" style={{ background: N_CARD, borderBottom: `1px solid ${N_BORDER}` }}>
                        <p className="text-xs leading-relaxed" style={{ color: "#bbb" }}>{node.overview}</p>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: N_FAINT }}>Interview answer</p>
                          <div className="rounded-lg p-3" style={{ background: "#0d0d0d", border: `1px solid ${N_BORDER}` }}>
                            <p className="text-[11px] leading-relaxed" style={{ color: "#d4d4d4" }}>{node.interviewAnswer}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {node.techChips.map(c => (
                            <span key={c} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: typeColor + "18", color: typeColor, border: `1px solid ${typeColor}40` }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Desktop canvas + detail panel (hidden on mobile) ── */}
      <div className="hidden sm:flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 96px - 56px)" }}>
        {/* Canvas */}
        <div ref={canvasContainerRef} className="flex-1 overflow-hidden relative" style={{ background: "#0d0d0d" }}>
          {/* Layer tint bands */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Object.entries(LAYER_Y).map(([layer, y]) => (
              <div key={layer} className="absolute left-0 right-0"
                style={{
                  top: y * zoom + pan.y,
                  height: NODE_H * zoom + 20,
                  background: parseInt(layer) % 2 === 0 ? "rgba(255,255,255,0.012)" : "transparent",
                }} />
            ))}
          </div>

          {/* SVG canvas */}
          <svg width="100%" height="100%"
            style={{ cursor: isPanning.current ? "grabbing" : "grab", userSelect: "none" }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
            onWheel={handleWheel}>
            <defs>
              {/* Dot-grid pattern */}
              <pattern id="dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="0.8" fill="#252525" />
              </pattern>
            </defs>
            {/* Dot grid background (static, does not pan) */}
            <rect width="100%" height="100%" fill="url(#dot-grid)" opacity={0.6} />
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              <LayerLabels />
              <ConnectionArrows
                activeNodeId={selectedNode ?? undefined}
                activeFlowNodeIds={flowNodeIds.length > 0 ? flowNodeIds : undefined}
              />
              {NODES.map(node => (
                <NodeCard key={node.id} node={node}
                  isSelected={selectedNode === node.id}
                  flowStep={activeFlow && flowNodeIds.includes(node.id) ? flowNodeIds.indexOf(node.id) + 1 : undefined}
                  isFlowVisited={flowNodeIds.includes(node.id)}
                  isStudied={studiedNodes.has(node.id)}
                  animDelay={animDelays[node.id] ?? 0}
                  onHover={handleHover}
                  onClick={() => {
                    setSelectedNode(node.id);
                    setHoveredNode(null);
                    if (activeFlow) {
                      const stepIdx = activeFlow.steps.findIndex(s => s.nodeId === node.id);
                      if (stepIdx !== -1) setActiveFlowStep(stepIdx);
                    }
                  }} />
              ))}
            </g>
          </svg>

          {/* Vignette overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 55%, rgba(10,10,10,0.6) 100%)",
            zIndex: 1,
          }} />

          {/* Hover tooltip */}
          {hoveredNodeData && hoveredNode && (
            <div className="fixed z-50 px-2.5 py-1.5 rounded-lg pointer-events-none"
              style={{
                left: hoveredNode.x + 12,
                top: hoveredNode.y - 36,
                background: "#1a1a1a",
                border: `1px solid ${N_BORDER}`,
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              }}>
              <p className="text-xs font-semibold" style={{ color: N_TEXT }}>{hoveredNodeData.label}</p>
              <p className="text-[10px]" style={{ color: N_MUTED }}>{hoveredNodeData.sublabel}</p>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-2 left-44 flex flex-wrap gap-2 pointer-events-none" style={{ zIndex: 6 }}>
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-[9px] capitalize" style={{ color: N_FAINT }}>{type}</span>
              </div>
            ))}
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1" style={{ zIndex: 6 }}>
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="w-6 h-6 rounded text-xs" style={{ background: N_BORDER, color: N_MUTED }}>−</button>
            <span className="text-[10px] w-8 text-center" style={{ color: N_MUTED }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="w-6 h-6 rounded text-xs" style={{ background: N_BORDER, color: N_MUTED }}>+</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="text-[10px] px-1.5 py-0.5 rounded ml-1" style={{ background: N_BORDER, color: N_MUTED }}>Fit</button>
          </div>

          {/* Mini-map */}
          <MiniMap zoom={zoom} pan={pan} containerW={containerSize.w} containerH={containerSize.h} />

          {/* Mobile hint overlay */}
          {!mobileOverlayDismissed && (
            <div className="sm:hidden absolute inset-0 flex flex-col items-center justify-center z-10 text-center px-6"
              style={{ background: "rgba(10,10,10,0.95)" }}>
              <div className="text-5xl mb-4" aria-hidden="true">🗺</div>
              <p className="text-base font-bold mb-2" style={{ color: N_TEXT }}>Full diagram available on desktop</p>
              <p className="text-sm leading-relaxed mb-6" style={{ color: N_MUTED }}>
                Use the tabs above to explore Requirements, Data Models, Trade-offs, Capacity, and Failures on mobile
              </p>
              <button
                onClick={() => setMobileOverlayDismissed(true)}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity active:opacity-70"
                style={{ background: N_RED, color: N_TEXT, border: `1px solid ${N_BORDER}` }}>
                Continue on mobile
              </button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="w-80 xl:w-96 shrink-0" style={{ borderLeft: `1px solid ${N_BORDER}` }}>
          <DetailPanel
            node={selectedNodeData}
            studiedNodes={studiedNodes}
            onMarkStudied={onMarkStudied}
            onNavigateTo={id => { setSelectedNode(id); handleExitFlow(); }}
            activeFlow={activeFlow}
            activeFlowStep={activeFlowStep}
            onFlowNext={handleFlowNext}
            onFlowPrev={handleFlowPrev}
            onExitFlow={handleExitFlow}
          />
        </div>
      </div>

      {/* Flows bar — desktop only */}
      <div className="hidden sm:flex shrink-0 items-center gap-1.5 px-4 overflow-x-auto"
        style={{ height: 56, background: "#0d0d0d", borderTop: `1px solid ${N_BORDER}`, minWidth: 0 }}>
        <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap mr-1" style={{ color: N_FAINT }}>Flows</span>
        {FLOWS.map(flow => {
          const isActive = activeFlow?.id === flow.id;
          return (
            <button key={flow.id} onClick={() => handleActivateFlow(flow)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0"
              style={{ background: isActive ? N_AMBER + "18" : "transparent", color: isActive ? N_AMBER : N_MUTED, border: `1px solid ${isActive ? N_AMBER + "50" : N_BORDER}` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? N_AMBER : N_FAINT }} />
              {flow.label}
              {isActive && <span className="text-[9px] opacity-60">{activeFlowStep + 1}/{flow.steps.length}</span>}
            </button>
          );
        })}
        <span className="text-[9px] ml-auto whitespace-nowrap hidden sm:block" style={{ color: N_FAINT }}>← → navigate steps</span>
      </div>

      {cmdOpen && <CommandPalette onSelect={id => setSelectedNode(id)} onClose={() => setCmdOpen(false)} />}
    </div>
  );
}

// ── Main shell ─────────────────────────────────────────────────────────────────
export default function NetflixArchPage({ initialTab }: { initialTab?: string }) {
  const resolvedInitial = TABS.find(t => t.id === initialTab) ? (initialTab as TabId) : "architecture";
  const [activeTab, setActiveTab] = useState<TabId>(resolvedInitial);
  const [tabVisible, setTabVisible] = useState(true);
  const [studiedNodes, setStudiedNodes] = useState<Set<NodeId>>(new Set());
  const [interviewMode, setInterviewMode] = useState(false);
  const [role, setRole] = useState<Role>("Backend Engineer");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lastStudied, setLastStudied] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Load from localStorage + URL hash on mount
  useEffect(() => {
    try {
      const s = localStorage.getItem("netflix-studied");
      if (s) setStudiedNodes(new Set(JSON.parse(s)));
      const ls = localStorage.getItem("netflix-last-studied");
      if (ls) setLastStudied(ls);
      // URL hash takes priority over localStorage
      const hash = window.location.hash.slice(1) as TabId;
      if (hash && TABS.find(t => t.id === hash)) {
        setActiveTab(hash);
      } else {
        const tab = localStorage.getItem("netflix-active-tab") as TabId | null;
        if (tab && TABS.find(t => t.id === tab)) setActiveTab(tab);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist studied
  useEffect(() => {
    try { localStorage.setItem("netflix-studied", JSON.stringify([...studiedNodes])); } catch { /* ignore */ }
  }, [studiedNodes]);

  const switchTab = useCallback((id: TabId) => {
    if (id === activeTab) return;
    setTabVisible(false);
    setTimeout(() => {
      setActiveTab(id);
      setTabVisible(true);
      window.location.hash = id;
      try { localStorage.setItem("netflix-active-tab", id); } catch { /* ignore */ }
    }, 80);
  }, [activeTab]);

  const handleMarkStudied = useCallback((id: NodeId) => {
    setStudiedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLastStudied(now);
    try { localStorage.setItem("netflix-last-studied", now); } catch { /* ignore */ }
  }, []);

  const handleShare = () => {
    const url = `${window.location.origin}/system-design/netflix#${activeTab}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    }).catch(() => {});
  };

  const studiedCount = studiedNodes.size;

  return (
    <div className="dark flex flex-col" style={{ height: "100vh", background: N_BG, color: N_TEXT, fontFamily: C.sans, overflow: "hidden" }}>
      {/* ── Topbar ── */}
      <div className="shrink-0 z-40" style={{ background: "#0d0d0d", borderBottom: `1px solid ${N_BORDER}` }}>
        {/* Row 1: logo + controls */}
        <div className="flex items-center gap-3 px-4 h-11">
          <Link href="/" className="flex items-center gap-1.5 shrink-0" style={{ textDecoration: "none" }}>
            <span className="text-lg font-black tracking-tight" style={{ color: N_RED }}>N</span>
            <span className="text-xs font-semibold hidden sm:block" style={{ color: "#666" }}>withsoon</span>
          </Link>
          <span className="hidden sm:block text-xs" style={{ color: N_FAINT }}>/</span>
          <Link href="/system-design" className="text-xs hidden sm:block hover:underline" style={{ color: N_FAINT }}>System Design</Link>
          <span className="hidden sm:block text-xs" style={{ color: N_FAINT }}>/</span>
          <span className="text-xs font-semibold hidden sm:block" style={{ color: N_TEXT }}>Netflix</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium hidden md:block"
            style={{ background: N_GREEN + "18", color: N_GREEN, border: `1px solid ${N_GREEN}30` }}>
            Senior Backend
          </span>

          <div className="flex-1" />

          {lastStudied && (
            <span className="text-[10px] hidden lg:block" style={{ color: N_FAINT }}>Last studied {lastStudied}</span>
          )}
          <span className="text-[10px] hidden sm:block" style={{ color: N_MUTED }}>
            {studiedCount}/{NODES.length} studied
          </span>

          <button onClick={() => setInterviewMode(v => !v)}
            className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
            style={{ background: interviewMode ? N_RED + "18" : "transparent", color: interviewMode ? N_RED : N_MUTED, border: `1px solid ${interviewMode ? N_RED + "40" : N_BORDER}` }}>
            Interview
          </button>

          <button onClick={handleShare}
            className="text-xs px-2.5 py-1.5 rounded-lg hidden sm:block"
            style={{ background: "transparent", border: `1px solid ${N_BORDER}`, color: shareToast ? N_GREEN : N_MUTED }}>
            {shareToast ? "Copied!" : "Share"}
          </button>

          <button onClick={() => setShortcutsOpen(true)}
            className="text-xs px-2 py-1.5 rounded-lg hidden sm:block"
            style={{ background: "transparent", border: `1px solid ${N_BORDER}`, color: N_MUTED }}>?</button>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenuOpen(v => !v)}
            className="sm:hidden flex flex-col gap-1 p-1.5 rounded"
            style={{ border: `1px solid ${N_BORDER}` }}>
            <span className="block w-4 h-0.5 rounded" style={{ background: N_MUTED }} />
            <span className="block w-4 h-0.5 rounded" style={{ background: N_MUTED }} />
            <span className="block w-4 h-0.5 rounded" style={{ background: N_MUTED }} />
          </button>
        </div>

        {/* Row 2: tabs with animated underline + keyboard nav + prev/next */}
        <div className="hidden sm:flex items-end px-4 gap-0" style={{ height: 37 }}>
          {TABS.map((tab, idx) => (
            <button
              key={tab.id}
              ref={el => { tabRefs.current[idx] = el; }}
              onClick={() => switchTab(tab.id)}
              onKeyDown={e => {
                if (e.key === "ArrowRight" && idx < TABS.length - 1) {
                  switchTab(TABS[idx + 1].id);
                  tabRefs.current[idx + 1]?.focus();
                }
                if (e.key === "ArrowLeft" && idx > 0) {
                  switchTab(TABS[idx - 1].id);
                  tabRefs.current[idx - 1]?.focus();
                }
              }}
              className="relative px-3 py-2 text-xs font-medium transition-colors shrink-0"
              style={{ color: activeTab === tab.id ? N_TEXT : N_MUTED }}>
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: N_RED }} />
              )}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 pb-1.5">
            {(() => {
              const idx = TABS.findIndex(t => t.id === activeTab);
              const prev = TABS[idx - 1];
              const next = TABS[idx + 1];
              return <>
                <span className="text-[10px]" style={{ color: N_FAINT }}>{idx + 1}/{TABS.length}</span>
                {prev && (
                  <button onClick={() => switchTab(prev.id)} className="text-[10px] px-2 py-0.5 rounded transition-colors"
                    style={{ color: N_MUTED, border: `1px solid ${N_BORDER}` }}>← {prev.label}</button>
                )}
                {next && (
                  <button onClick={() => switchTab(next.id)} className="text-[10px] px-2 py-0.5 rounded transition-colors"
                    style={{ color: N_MUTED, border: `1px solid ${N_BORDER}` }}>{next.label} →</button>
                )}
              </>;
            })()}
          </div>
        </div>

        {/* Mobile: show active tab label + prev/next */}
        <div className="sm:hidden px-4 pb-2 flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: N_TEXT }}>
            {TABS.find(t => t.id === activeTab)?.label}
          </span>
          {(() => {
            const idx = TABS.findIndex(t => t.id === activeTab);
            return (
              <span className="text-[10px]" style={{ color: N_FAINT }}>{idx + 1}/{TABS.length}</span>
            );
          })()}
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden flex flex-col"
          style={{ background: "#0d0d0d" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${N_BORDER}` }}>
            <span className="text-sm font-bold" style={{ color: N_TEXT }}>Menu</span>
            <button onClick={() => setMobileMenuOpen(false)} style={{ color: N_MUTED, fontSize: 18 }}>✕</button>
          </div>
          <div className="p-4 space-y-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { switchTab(tab.id); setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                style={{ background: activeTab === tab.id ? N_RED + "10" : "transparent", color: activeTab === tab.id ? N_RED : N_TEXT, border: `1px solid ${activeTab === tab.id ? N_RED + "30" : "transparent"}` }}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-4 mt-auto space-y-3" style={{ borderTop: `1px solid ${N_BORDER}` }}>
            <button onClick={() => { setInterviewMode(v => !v); }}
              className="w-full py-2.5 rounded-lg text-sm font-medium"
              style={{ background: interviewMode ? N_RED + "18" : N_BORDER, color: interviewMode ? N_RED : N_TEXT }}>
              {interviewMode ? "Exit Interview Mode" : "Interview Mode"}
            </button>
            <button onClick={() => { handleShare(); setMobileMenuOpen(false); }}
              className="w-full py-2.5 rounded-lg text-sm font-medium"
              style={{ background: N_BORDER, color: N_TEXT }}>
              Share this page
            </button>
          </div>
        </div>
      )}

      {/* ── Tab content with crossfade ── */}
      <div className="flex-1 overflow-hidden flex flex-col"
        style={{ opacity: tabVisible ? 1 : 0, transition: "opacity 0.1s ease" }}>
        {activeTab === "start-here"     && (
          <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full" style={{ background: N_BG }}>
            <StartHereTab
              role={role}
              onRoleChange={setRole}
              onNavigateTab={(tab) => switchTab(tab as TabId)}
            />
          </div>
        )}
        {activeTab === "requirements"   && (
          <div className="flex-1 overflow-y-auto" style={{ background: "#0d0d0d" }}>
            <RequirementsTab />
          </div>
        )}
        {activeTab === "architecture"   && <ArchitectureTab studiedNodes={studiedNodes} onMarkStudied={handleMarkStudied} interviewMode={interviewMode} />}
        {activeTab === "playback"       && (
          <div className="flex-1 overflow-y-auto" style={{ background: "#0d0d0d" }}>
            <PlaybackTab onNavigateTab={(tab) => switchTab(tab as TabId)} />
          </div>
        )}
        {activeTab === "cdn"            && (
          <div className="flex-1 overflow-y-auto" style={{ background: "#0d0d0d" }}>
            <CDNTab onNavigateTab={(tab) => switchTab(tab as TabId)} />
          </div>
        )}
        {activeTab === "encoding"       && (
          <div className="flex-1 overflow-y-auto" style={{ background: "#0d0d0d" }}>
            <EncodingTab onNavigateTab={(tab) => switchTab(tab as TabId)} />
          </div>
        )}
        {activeTab === "security"       && (
          <div className="flex-1 overflow-y-auto" style={{ background: "#0d0d0d" }}>
            <SecurityTab onNavigateTab={(tab) => switchTab(tab as TabId)} />
          </div>
        )}
        {activeTab === "models"         && <ModelsTab />}
        {activeTab === "tradeoffs"      && <TradeoffsTab interviewMode={interviewMode} />}
        {activeTab === "capacity"       && <CapacityTab />}
        {activeTab === "failures"       && (
          <div className="flex-1 overflow-y-auto" style={{ background: "#0d0d0d" }}>
            <FailuresTab />
          </div>
        )}
        {activeTab === "quiz"           && <QuizTab />}
        {activeTab === "mock-interview" && (
          <div className="flex-1 overflow-y-auto" style={{ background: "#0d0d0d" }}>
            <MockInterviewTab role="Backend Engineer" />
          </div>
        )}
        {activeTab === "cheat-sheet"    && (
          <div className="flex-1 overflow-y-auto" style={{ background: "#0d0d0d" }}>
            <CheatSheetTab role="Backend Engineer" />
          </div>
        )}
      </div>

      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}

      <style>{`
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${N_BG}; }
        ::-webkit-scrollbar-thumb { background: ${N_BORDER}; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #444; }
        svg g[role="button"]:focus { outline: none; }
        svg g[role="button"]:focus-visible rect:first-child { stroke: ${N_RED}; stroke-width: 2; }
        @keyframes fadeInNode {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseAmber {
          0%,100% { box-shadow: 0 0 0 3px rgba(245,166,35,0.25); }
          50%      { box-shadow: 0 0 0 6px rgba(245,166,35,0.08); }
        }
      `}</style>
    </div>
  );
}
