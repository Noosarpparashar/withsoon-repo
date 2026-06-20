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
import { copyTextToClipboard } from "../netflix-tabs/clipboard";
import { RequirementsTab } from "../netflix-tabs/RequirementsTab";
import { FailuresTab } from "../netflix-tabs/FailuresTab";
import { StartHereTab } from "../netflix-tabs/StartHereTab";
import { PlaybackTab } from "../netflix-tabs/PlaybackTab";
import { CDNTab } from "../netflix-tabs/CDNTab";
import { SecurityTab } from "../netflix-tabs/SecurityTab";
import { EncodingTab } from "../netflix-tabs/EncodingTab";
import {
  normalizeNetflixTab,
  type CurrentTabSlug,
  type Role,
  type TabSlug,
} from "../netflix-tabs/types";

// ── Tab config ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "start-here",     label: "Start Here",     mins: 2  },
  { id: "requirements",   label: "Requirements",   mins: 5  },
  { id: "architecture",   label: "Architecture",   mins: 10 },
  { id: "playback",       label: "Playback",       mins: 8  },
  { id: "cdn",            label: "CDN",            mins: 6  },
  { id: "encoding",       label: "Encoding",       mins: 6  },
  { id: "security",       label: "Security",       mins: 5  },
  { id: "models",         label: "Data Models",    mins: 7  },
  { id: "tradeoffs",      label: "Trade-offs",     mins: 7  },
  { id: "capacity",       label: "Capacity",       mins: 5  },
  { id: "failures",       label: "Failures",       mins: 8  },
  { id: "quiz",           label: "Quiz",           mins: 15 },
  { id: "mock-interview", label: "Mock Interview", mins: 45 },
  { id: "cheat-sheet",    label: "Cheat Sheet",    mins: 5  },
] as const;
type TabId = CurrentTabSlug;

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
  client:    "#2563eb",
  gateway:   "#7c3aed",
  service:   "#d97706",
  datastore: "#0f766e",
  pipeline:  "#be185d",
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
  payment:         { d: "M0.5,4h13a0.5,0.5,0,0,1,0.5,0.5v7a0.5,0.5,0,0,1-0.5,0.5H0.5A0.5,0.5,0,0,1,0,11.5v-7A0.5,0.5,0,0,1,0.5,4zM0.5,6.5h13M2,9.5h3" },
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
  success: { bg: "rgba(15,118,110,0.08)",   border: "#0f766e40", text: "#0f766e", icon: "✓" },
};
function Callout({ variant, title, body }: { variant: keyof typeof CALLOUT_COLORS; title: string; body: string }) {
  const c = CALLOUT_COLORS[variant];
  return (
    <div className="rounded-lg p-3 mb-3" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-start gap-2">
        <span className="text-sm shrink-0 mt-0.5" style={{ color: c.text }}>{c.icon}</span>
        <div>
          <p className="text-xs font-bold mb-1" style={{ color: c.text }}>{title}</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{body}</p>
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
  const borderColor = isSelected ? N_RED : isFlowVisited ? N_AMBER : "var(--border)";
  const cardFill = isSelected
    ? "var(--netflix-node-selected-fill)"
    : isFlowVisited
      ? "var(--netflix-node-visited-fill)"
      : "var(--bg-card)";
  const cardShadow = isSelected
    ? "drop-shadow(0 10px 18px rgba(229,9,20,0.18))"
    : isFlowVisited
      ? "drop-shadow(0 8px 14px rgba(245,166,35,0.16))"
      : undefined;

  return (
    <g
      className="cursor-pointer"
      style={{ animation: `fadeInNode 0.35s ease both`, animationDelay: `${animDelay}ms`, filter: cardShadow }}
      onClick={onClick}
      role="button"
      aria-label={`${node.label} — click to explore`}
      tabIndex={0}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick()}
      onMouseEnter={e => onHover(node.id, e.clientX, e.clientY)}
      onMouseLeave={() => onHover(null)}
    >
      <rect
        x={pos.x}
        y={pos.y}
        width={NODE_W}
        height={NODE_H}
        rx="8"
        style={{
          fill: cardFill,
          stroke: borderColor,
          strokeWidth: isSelected || isFlowVisited ? 1.5 : 1,
        }}
      />
      {/* Top accent bar */}
      <rect x={pos.x} y={pos.y} width={NODE_W} height={3} rx="8" style={{ fill: typeColor, opacity: 0.7 }} />
      {/* Custom SVG icon */}
      <NodeIconSVG nodeId={node.id} x={pos.x + 4} y={pos.y + 8} color={typeColor} />
      {/* Label */}
      <text x={pos.x + 22} y={pos.y + 22}
        style={{ fill: "var(--text)", fontSize: 11, fontWeight: "bold", fontFamily: "Inter, sans-serif" }}>
        {node.label.length > 14 ? node.label.slice(0, 14) + "…" : node.label}
      </text>
      {/* Sublabel */}
      <text x={pos.x + 8} y={pos.y + 42}
        style={{ fill: "var(--text-muted)", fontSize: 9, fontFamily: "Inter, sans-serif" }}>
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
        <circle cx={pos.x + 10} cy={pos.y + 10} r={7} style={{ fill: N_RED + "30", stroke: N_RED, strokeWidth: 1 }} />
        <text x={pos.x + 10} y={pos.y + 14} style={{ fill: N_RED, fontSize: 8, textAnchor: "middle" }}>✓</text>
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
          <path d="M0,0 L0,6 L6,3 z" style={{ fill: "var(--text-faint)" }} />
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
        const color = isActive ? N_RED : isFlow ? N_AMBER : "var(--text-faint)";
        const markerId = isActive ? "arr-a" : isFlow ? "arr-f" : "arr-d";
        const dx = tx - fx;
        const cy1 = fy + Math.min(30, Math.abs(fy - ty) * 0.4);
        const cy2 = ty - Math.min(30, Math.abs(fy - ty) * 0.4);
        const midX = (fx + tx) / 2, midY = (fy + ty) / 2;
        return (
          <g key={i} opacity={(!activeNodeId && !activeFlowNodeIds) ? 1 : (isActive || isFlow ? 1 : 0.35)}>
            <path d={`M ${fx} ${fy} C ${fx + dx * 0.1} ${cy1}, ${tx - dx * 0.1} ${cy2}, ${tx} ${ty - 6}`}
              style={{ fill: "none", stroke: color, strokeWidth: isActive || isFlow ? 1.5 : 0.8 }}
              markerEnd={`url(#${markerId})`} />
            {(isActive || isFlow) && <>
              <rect x={midX - 18} y={midY - 8} width={36} height={14} rx={3}
                style={{ fill: "var(--bg-card)", stroke: color + "60", strokeWidth: 0.5 }} />
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
          style={{ fill: "var(--text-faint)", fontSize: 8, fontWeight: "bold", letterSpacing: 1, fontFamily: "Inter, sans-serif" }}>
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
  zoom, pan, containerW, containerH, onPan,
}: { zoom: number; pan: { x: number; y: number }; containerW: number; containerH: number; onPan: (p: { x: number; y: number }) => void }) {
  // Viewport rect in canvas-space
  const vpX = -pan.x / zoom;
  const vpY = -pan.y / zoom;
  const vpW = containerW / zoom;
  const vpH = containerH / zoom;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mmX = e.clientX - rect.left;
    const mmY = e.clientY - rect.top;
    // Convert mm click coords to canvas coords, then to pan offset
    const canvasX = mmX / MM_SCALE;
    const canvasY = mmY / MM_SCALE;
    onPan({
      x: -(canvasX * zoom) + containerW / 2,
      y: -(canvasY * zoom) + containerH / 2,
    });
  };

  return (
    <div
      className="absolute rounded-lg overflow-hidden"
      onClick={handleClick}
      style={{
        bottom: 48,
        left: 8,
        width: MM_W,
        height: MM_H,
        background: "var(--bg-card)",
        border: `1px solid var(--border)`,
        backdropFilter: "blur(10px)",
        zIndex: 5,
        cursor: "crosshair",
      }}>
      <svg width={MM_W} height={MM_H} style={{ pointerEvents: "none" }}>
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
      <div className="absolute bottom-0.5 left-1 text-[7px]" style={{ color: "var(--text-faint)", pointerEvents: "none" }}>MAP</div>
    </div>
  );
}

// ── Detail Panel ───────────────────────────────────────────────────────────────
type DepthLevel = "overview" | "interview" | "deepdive";

function DetailPanel({
  node, studiedNodes, onMarkStudied, onNavigateTo,
  activeFlow, activeFlowStep, onFlowNext, onFlowPrev, onExitFlow,
  onActivatePlayFlow, onNavigatePlayback,
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
  onActivatePlayFlow: () => void;
  onNavigatePlayback: () => void;
}) {
  const [depth, setDepth] = useState<DepthLevel>("overview");
  const [showTranscript, setShowTranscript] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (node) setDepth("overview");
    panelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [node?.id]);

  useEffect(() => {
    if (activeFlow) {
      setShowTranscript(false);
    }
  }, [activeFlow?.id]);

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
        style={{ background: "var(--bg-card)", borderLeft: `1px solid var(--border)` }}>
        <div className="sticky top-0 z-10 px-4 py-3" style={{ background: "var(--bg-card)", borderBottom: `1px solid var(--border)` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold" style={{ color: N_AMBER }}>{activeFlow.label}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTranscript(v => !v)}
                className="text-[11px] px-2.5 py-1.5 rounded"
                style={{ background: "var(--bg)", color: "var(--text-muted)", border: `1px solid var(--border)`, cursor: "pointer" }}
              >
                {showTranscript ? "Hide steps" : "Show steps"}
              </button>
              <button onClick={onExitFlow} className="text-xs px-2 py-1 rounded" style={{ background: "var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            {activeFlow.steps.map((_, i) => (
              <div key={i} className="h-1.5 rounded-full transition-all duration-200"
                style={{ width: i === activeFlowStep ? 20 : 8, background: i <= activeFlowStep ? N_AMBER : "var(--text-faint)" }} />
            ))}
          </div>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Step {activeFlowStep + 1} of {total}</div>
        </div>
        <div className="p-4 flex-1">
          <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(245,166,35,0.08)", border: `1px solid ${N_AMBER}30` }}>
            <div className="flex items-start gap-2 mb-2">
              <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                style={{ background: N_AMBER, color: "#000" }}>{activeFlowStep + 1}</span>
              <div>
                <p className="text-base font-bold" style={{ color: N_AMBER }}>{step.name}</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{NODES.find(n => n.id === step.nodeId)?.label}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>{step.description}</p>
            {step.payload && (
              <div className="rounded-md p-2.5 mb-3" style={{ background: "var(--bg)", border: `1px solid var(--border)` }}>
                <pre className="text-[11px] leading-relaxed overflow-x-auto" style={{ color: "#6ee7b7", fontFamily: C.mono }}>{step.payload}</pre>
              </div>
            )}
            {step.whyItMatters && (
              <div className="rounded p-2" style={{ background: "rgba(245,166,35,0.06)", border: `1px solid ${N_AMBER}25` }}>
                <p className="text-[11px] font-bold mb-0.5" style={{ color: N_AMBER }}>Why this matters</p>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{step.whyItMatters}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 mb-6">
            <button onClick={onFlowPrev} disabled={activeFlowStep === 0}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-30"
              style={{ background: "var(--border)", color: "var(--text)" }}>← Prev</button>
            <button onClick={onFlowNext} disabled={activeFlowStep === total - 1}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-30"
              style={{ background: N_AMBER, color: "#000" }}>Next →</button>
          </div>

          {/* Flow transcript — all steps in sequence */}
          {showTranscript && (
            <div style={{ borderTop: `1px solid var(--border)` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest py-2" style={{ color: "var(--text-faint)" }}>All steps</p>
              <div className="space-y-1 pb-4">
                {activeFlow.steps.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg px-2 py-2"
                    style={{ background: i === activeFlowStep ? N_AMBER + "12" : "transparent", border: `1px solid ${i === activeFlowStep ? N_AMBER + "30" : "transparent"}` }}
                    aria-current={i === activeFlowStep ? "step" : undefined}
                  >
                    <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: i <= activeFlowStep ? N_AMBER : "var(--border)", color: i <= activeFlowStep ? "#000" : "var(--text-faint)" }}>
                      {i + 1}
                    </span>
                    <span className="text-[12px] leading-snug" style={{ color: i === activeFlowStep ? N_AMBER : i < activeFlowStep ? "var(--text-muted)" : "var(--text-faint)" }}>
                      {s.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="flex flex-col h-full overflow-y-auto"
        style={{ background: "var(--bg-card)", borderLeft: `1px solid var(--border)` }}>
        {/* Hero CTA */}
        <div className="p-5 flex-1 flex flex-col justify-center">
          <div className="rounded-xl overflow-hidden mb-4" style={{ background: "var(--bg)", border: `1px solid ${N_AMBER}30` }}>
            <div className="px-4 py-3" style={{ background: N_AMBER + "12", borderBottom: `1px solid ${N_AMBER}25` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: N_AMBER }}>Desktop walkthrough</p>
            </div>
            <div className="p-4">
              <p className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>Use the diagram first</p>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
                Click services to inspect them one by one, or optionally run the playback walkthrough if you want a narrated request path.
              </p>
              <div className="flex flex-wrap gap-1 mb-4 text-[10px]">
                {["Client", "Playback Svc", "Entitlement", "DRM", "Manifest", "CDN", "Watch Progress", "Kafka"].map((s, i, arr) => (
                  <span key={s} className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded" style={{ background: N_AMBER + "18", color: N_AMBER, border: `1px solid ${N_AMBER}30` }}>{s}</span>
                    {i < arr.length - 1 && <span style={{ color: "var(--text-faint)" }}>→</span>}
                  </span>
                ))}
              </div>
              <button
                onClick={onActivatePlayFlow}
                className="w-full py-2.5 rounded-lg text-sm font-bold mb-2 transition-all hover:opacity-90"
                style={{ background: N_AMBER, color: "#111827" }}>
                Open Playback Walkthrough
              </button>
              <button
                onClick={onNavigatePlayback}
                className="w-full py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                style={{ background: "var(--bg-muted)", color: "var(--text-muted)", border: `1px solid var(--border)` }}>
                Open Playback Deep Dive →
              </button>
            </div>
          </div>
          {/* How to use */}
          <div className="rounded-xl p-4" style={{ background: "var(--bg)", border: `1px solid var(--border)` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-faint)" }}>How to use this map</p>
            <div className="space-y-2">
              {[
                { n: "1", text: "Click a service node to see its design & interview answer" },
                { n: "2", text: "Open the playback walkthrough if you want a narrated request path" },
                { n: "3", text: "Switch to Playback or Failures for deep-dive answers" },
              ].map(({ n, text }) => (
                <div key={n} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0"
                    style={{ background: N_RED + "18", color: N_RED }}>
                    {n}
                  </span>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 text-[10px] space-y-1" style={{ color: "var(--text-faint)" }}>
            <p>1 / 2 / 3 — switch depth</p>
            <p>N / P — next / prev node</p>
            <p>⌘K — command palette</p>
          </div>
        </div>
      </div>
    );
  }

  const typeColor = TYPE_COLORS[node.type] ?? N_MUTED;
  return (
    <div ref={panelRef} className="flex flex-col h-full overflow-y-auto"
      style={{ background: "var(--bg-card)", borderLeft: `1px solid var(--border)` }}>
      <div className="sticky top-0 z-10 px-4 py-3" style={{ background: "var(--bg-card)", borderBottom: `1px solid var(--border)` }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: typeColor + "18", color: typeColor, border: `1px solid ${typeColor}30` }}>
              {node.type}
            </span>
            <h2 className="text-base font-bold mt-1" style={{ color: "var(--text)" }}>{node.label}</h2>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{node.sublabel}</p>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer shrink-0 mt-1">
            <input type="checkbox" checked={isStudied} onChange={() => onMarkStudied(node.id)}
              className="w-3.5 h-3.5 cursor-pointer" style={{ accentColor: N_RED }} />
            <span className="text-[10px]" style={{ color: isStudied ? N_RED : "var(--text-faint)" }}>
              {isStudied ? "✓ Studied" : "Mark studied"}
            </span>
          </label>
        </div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid var(--border)` }}>
          {(["overview", "interview", "deepdive"] as DepthLevel[]).map((d, i) => (
            <button key={d} onClick={() => setDepth(d)}
              className="flex-1 py-1.5 text-[10px] font-medium transition-colors"
              style={{ background: depth === d ? typeColor : "transparent", color: depth === d ? "#000" : "var(--text-muted)", borderRight: i < 2 ? `1px solid var(--border)` : undefined }}>
              {d === "overview" ? "Overview" : d === "interview" ? "Interview" : "Deep Dive"}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 space-y-4 flex-1">
        {depth === "overview" && <>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{node.overview}</p>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>Tech Stack</p>
            <div className="flex flex-wrap gap-1.5">{node.techChips.map(c => <Chip key={c} label={c} color={typeColor} />)}</div>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>Key Numbers</p>
            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid var(--border)` }}>
              {node.kvPairs.map((kv, i) => (
                <div key={i} className="flex justify-between px-3 py-1.5"
                  style={{ borderBottom: i < node.kvPairs.length - 1 ? `1px solid var(--border)` : undefined }}>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{kv.label}</span>
                  <span className="text-[10px] font-mono font-medium" style={{ color: "var(--text)" }}>{kv.value}</span>
                </div>
              ))}
            </div>
          </div>
        </>}
        {depth === "interview" && <>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Say out loud</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-muted)", color: "var(--text-muted)", border: `1px solid var(--border)` }}>
              {node.interviewTime}
            </span>
          </div>
          <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: `1px solid var(--border)` }}>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--text)" }}>{node.interviewAnswer}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>Don&apos;t forget</p>
            <ul className="space-y-1.5">
              {node.dontForget.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-xs shrink-0 mt-0.5" style={{ color: N_RED }}>→</span>
                  <span className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </>}
        {depth === "deepdive" && (
          <>{node.deepDives.map((dd, i) => <Callout key={i} variant={dd.variant} title={dd.title} body={dd.body} />)}</>
        )}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>Related</p>
          <div className="flex flex-wrap gap-1.5">
            {node.relatedNodes.filter(id => NODES.find(n => n.id === id)).map(id => {
              const related = NODES.find(n => n.id === id)!;
              const conn = CONNECTIONS.find(c => (c.from === node.id && c.to === id) || (c.from === id && c.to === node.id));
              return (
                <button key={id} onClick={() => onNavigateTo(id)}
                  className="text-[10px] px-2 py-1 rounded-md hover:opacity-80 transition-colors"
                  style={{ background: "var(--border)", color: "var(--text)", border: `1px solid var(--border)` }}>
                  {related.label}
                  {conn && <span className="ml-1 opacity-60" style={{ color: PROTOCOL_COLORS[conn.style ?? "HTTPS"] ?? "var(--text-muted)" }}>{conn.label}</span>}
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
        style={{ background: "var(--bg-card)", border: `1px solid var(--border)` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid var(--border)` }}>
          <span style={{ color: "var(--text-muted)" }}>⌘</span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Jump to any component…"
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--text)" }} />
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--border)", color: "var(--text-muted)" }}>Esc</span>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {results.map(n => (
            <button key={n.id} onClick={() => { onSelect(n.id); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--bg-muted)] transition-colors">
              <svg width={14} height={14} viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
                <NodeIconSVG nodeId={n.id} x={0} y={0} color={TYPE_COLORS[n.type] ?? N_MUTED} />
              </svg>
              <div>
                <p className="text-sm" style={{ color: "var(--text)" }}>{n.label}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{n.sublabel}</p>
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
        style={{ background: "var(--bg-card)", border: `1px solid var(--border)` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid var(--border)` }}>
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Keyboard Shortcuts</p>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>✕</button>
        </div>
        <div className="p-4 space-y-2">
          {rows.map(([key, desc]) => (
            <div key={key} className="flex items-center gap-3">
              <code className="text-[10px] font-mono px-2 py-0.5 rounded shrink-0"
                style={{ background: "var(--border)", color: "var(--text)" }}>{key}</code>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mobile accordion ──────────────────────────────────────────────────────────
type MobileSegment = "overview" | "services" | "datastores" | "flows";

function MobileAccordion({
  selectedNode, setSelectedNode, activeFlow, activeFlowStep, onActivateFlow,
}: {
  selectedNode: NodeId | null;
  setSelectedNode: (id: NodeId | null) => void;
  activeFlow: Flow | null;
  activeFlowStep: number;
  onActivateFlow: (flow: Flow) => void;
}) {
  const [segment, setSegment] = useState<MobileSegment>("overview");

  const segments: { id: MobileSegment; label: string }[] = [
    { id: "overview",    label: "Overview"    },
    { id: "services",    label: "Services"    },
    { id: "datastores",  label: "Datastores"  },
    { id: "flows",       label: "Flows"       },
  ];

  const visibleNodes = NODES.filter(n => {
    if (segment === "overview")   return true;
    if (segment === "services")   return n.type === "service" || n.type === "gateway" || n.type === "client";
    if (segment === "datastores") return n.type === "datastore" || n.type === "pipeline";
    return false;
  }).sort((a, b) => a.layer !== b.layer ? a.layer - b.layer : a.col - b.col);

  return (
    <div className="lg:hidden flex flex-col flex-1 overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Sticky segmented control */}
      <div className="sticky top-0 z-10 px-4 pt-3 pb-2" style={{ background: "var(--bg)", borderBottom: `1px solid var(--border)` }}>
        <p className="text-[10px] font-semibold mb-2 text-center" style={{ color: "var(--text-faint)" }}>
          Full interactive diagram on desktop · {NODES.length} components
        </p>
        <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid var(--border)` }}>
          {segments.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setSegment(s.id)}
              className="flex-1 py-2 text-xs font-medium transition-colors"
              style={{
                background: segment === s.id ? N_RED : "transparent",
                color: segment === s.id ? "#fff" : "var(--text-muted)",
                borderRight: i < segments.length - 1 ? `1px solid var(--border)` : undefined,
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Flows panel */}
      {segment === "flows" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {FLOWS.map(flow => {
            const isActive = activeFlow?.id === flow.id;
            return (
              <div key={flow.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isActive ? N_AMBER + "60" : "var(--border)"}` }}>
                <button
                  onClick={() => onActivateFlow(flow)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{ background: isActive ? N_AMBER + "10" : "var(--bg-card)" }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: isActive ? N_AMBER : "var(--text-faint)" }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: isActive ? N_AMBER : "var(--text)" }}>{flow.label}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>{flow.steps.length} steps</p>
                  </div>
                  {isActive
                    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: N_AMBER + "18", color: N_AMBER }}>Step {activeFlowStep + 1}/{flow.steps.length}</span>
                    : <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>▶ Run</span>
                  }
                </button>
                {isActive && (
                  <div className="px-4 py-3 space-y-2" style={{ background: "var(--bg)", borderTop: `1px solid ${N_AMBER}20` }}>
                    {flow.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: i <= activeFlowStep ? N_AMBER : "var(--border)", color: i <= activeFlowStep ? "#000" : "var(--text-faint)" }}>
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-xs font-medium" style={{ color: i === activeFlowStep ? N_AMBER : "var(--text-muted)" }}>{step.name}</p>
                          {i === activeFlowStep && step.description && (
                            <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: "var(--text-faint)" }}>{step.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Nodes accordion */
        <div className="flex-1 overflow-y-auto">
          {/* Group by layer */}
          {[1, 2, 3, 4, 5, 6].map(layer => {
            const layerNodes = visibleNodes.filter(n => n.layer === layer);
            if (layerNodes.length === 0) return null;
            return (
              <div key={layer} style={{ borderBottom: `1px solid var(--border)` }}>
                <div className="px-4 py-2" style={{ background: "var(--bg-card)" }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{LAYER_LABELS[layer]}</p>
                </div>
                {layerNodes.map(node => {
                  const typeColor = TYPE_COLORS[node.type] ?? N_MUTED;
                  const isSelected = selectedNode === node.id;
                  return (
                    <div key={node.id}>
                      <button
                        className="w-full text-left px-4 py-3 flex items-center gap-3"
                        style={{ background: isSelected ? typeColor + "0a" : "transparent", borderBottom: `1px solid var(--border)` }}
                        onClick={() => setSelectedNode(isSelected ? null : node.id)}
                      >
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: typeColor }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{node.label}</p>
                          <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{node.sublabel}</p>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: typeColor + "18", color: typeColor }}>{node.type}</span>
                        <span style={{ color: "var(--text-faint)", fontSize: 10 }}>{isSelected ? "▲" : "▼"}</span>
                      </button>
                      {isSelected && (
                        <div className="px-4 py-4 space-y-3" style={{ background: "var(--bg-card)", borderBottom: `1px solid var(--border)` }}>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{node.overview}</p>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-faint)" }}>Interview answer</p>
                            <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: `1px solid var(--border)` }}>
                              <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>{node.interviewAnswer}</p>
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
      )}
    </div>
  );
}

// ── Architecture tab ───────────────────────────────────────────────────────────
function ArchitectureTab({
  studiedNodes, onMarkStudied, onNavigatePlayback,
}: { studiedNodes: Set<NodeId>; onMarkStudied: (id: NodeId) => void; interviewMode: boolean; onNavigatePlayback: () => void }) {
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ id: NodeId; x: number; y: number } | null>(null);
  const [activeFlow, setActiveFlow] = useState<Flow | null>(null);
  const [activeFlowStep, setActiveFlowStep] = useState(0);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [stepByStep, setStepByStep] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
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
      {/* ── Mobile/tablet fallback (hidden on lg+) ── */}
      <MobileAccordion
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        activeFlow={activeFlow}
        activeFlowStep={activeFlowStep}
        onActivateFlow={handleActivateFlow}
      />

      {/* ── Desktop canvas + detail panel (hidden below lg) ── */}
      <div className="hidden lg:flex flex-1 overflow-hidden" style={{ height: "calc(100dvh - 96px - 56px)" }}>
        {/* Canvas */}
        <div ref={canvasContainerRef} className="flex-1 overflow-hidden relative" style={{ background: "var(--bg)" }}>
          <button
            onClick={() => setPanelCollapsed(v => !v)}
            className="absolute top-3 right-3 z-20 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: `1px solid var(--border)`, cursor: "pointer" }}
          >
            {panelCollapsed ? "Show panel" : "Hide panel"}
          </button>
          {/* Layer tint bands */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Object.entries(LAYER_Y).map(([layer, y]) => (
              <div key={layer} className="absolute left-0 right-0"
                style={{
                  top: y * zoom + pan.y,
                  height: NODE_H * zoom + 20,
                  background: parseInt(layer) % 2 === 0
                    ? "var(--netflix-canvas-band)"
                    : "transparent",
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
                <circle cx="10" cy="10" r="0.8" fill="var(--netflix-dot)" />
              </pattern>
            </defs>
            {/* Dot grid background (static, does not pan) */}
            <rect width="100%" height="100%" fill="url(#dot-grid)" opacity="var(--netflix-dot-opacity)" />
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
            background: "var(--netflix-vignette)",
            zIndex: 1,
          }} />

          {/* Hover tooltip */}
          {hoveredNodeData && hoveredNode && (
            <div className="fixed z-50 px-2.5 py-1.5 rounded-lg pointer-events-none"
              style={{
                left: hoveredNode.x + 12,
                top: hoveredNode.y - 36,
                background: "var(--netflix-tooltip-bg)",
                border: `1px solid var(--border)`,
                boxShadow: "var(--netflix-tooltip-shadow)",
              }}>
              <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{hoveredNodeData.label}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{hoveredNodeData.sublabel}</p>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-2 left-44 flex flex-wrap gap-2 pointer-events-none" style={{ zIndex: 6 }}>
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-[9px] capitalize" style={{ color: "var(--text-faint)" }}>{type}</span>
              </div>
            ))}
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1" style={{ zIndex: 6 }}>
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="w-9 h-9 rounded-md text-sm font-bold flex items-center justify-center" style={{ background: "var(--border)", color: "var(--text)" }}>−</button>
            <span className="text-xs w-10 text-center font-medium" style={{ color: "var(--text-muted)" }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="w-9 h-9 rounded-md text-sm font-bold flex items-center justify-center" style={{ background: "var(--border)", color: "var(--text)" }}>+</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="text-xs px-2.5 py-1.5 rounded-md ml-1 font-medium" style={{ background: "var(--border)", color: "var(--text)" }}>Fit</button>
            <button
              onClick={() => {
                const el = canvasContainerRef.current;
                if (!el) return;
                if (!document.fullscreenElement) {
                  el.requestFullscreen?.().catch(() => {});
                } else {
                  document.exitFullscreen?.().catch(() => {});
                }
              }}
              title="Toggle fullscreen canvas"
              className="text-xs px-2.5 py-1.5 rounded-md ml-1 font-medium"
              style={{ background: "var(--border)", color: "var(--text)" }}>⛶</button>
          </div>

          {/* Mini-map */}
          <MiniMap zoom={zoom} pan={pan} containerW={containerSize.w} containerH={containerSize.h} onPan={setPan} />

          {/* Mobile hint overlay */}
          {!mobileOverlayDismissed && (
            <div className="lg:hidden absolute inset-0 flex flex-col items-center justify-center z-10 text-center px-6"
              style={{ background: "rgba(10,10,10,0.95)" }}>
              <div className="text-5xl mb-4" aria-hidden="true">🗺</div>
              <p className="text-base font-bold mb-2" style={{ color: "var(--text)" }}>Full diagram available on desktop</p>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-muted)" }}>
                Use the tabs above: Start Here → Playback → CDN → Failures → Mock Interview → Cheat Sheet. Full drag/zoom diagram is best on desktop.
              </p>
              <button
                onClick={() => setMobileOverlayDismissed(true)}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity active:opacity-70"
                style={{ background: N_RED, color: "var(--text)", border: `1px solid var(--border)` }}>
                Continue on mobile
              </button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {!panelCollapsed && (
          <div className="w-[24rem] xl:w-[27rem] shrink-0" style={{ borderLeft: `1px solid var(--border)` }}>
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
              onActivatePlayFlow={() => {
                const playFlow = FLOWS.find(f => f.id === "play");
                if (playFlow) handleActivateFlow(playFlow);
              }}
              onNavigatePlayback={onNavigatePlayback}
            />
          </div>
        )}
      </div>

      {/* Flows bar — desktop only */}
      <div className="hidden lg:flex shrink-0 items-center gap-1.5 px-4 overflow-x-auto"
        style={{ height: 56, background: "var(--bg)", borderTop: `1px solid var(--border)`, minWidth: 0 }}>
        <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap mr-1" style={{ color: "var(--text-faint)" }}>Flows</span>
        {FLOWS.map(flow => {
          const isActive = activeFlow?.id === flow.id;
          return (
            <button key={flow.id} onClick={() => handleActivateFlow(flow)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0"
              style={{ background: isActive ? N_AMBER + "18" : "transparent", color: isActive ? N_AMBER : "var(--text-muted)", border: `1px solid ${isActive ? N_AMBER + "50" : "var(--border)"}` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? N_AMBER : "var(--text-faint)" }} />
              {flow.label}
              {isActive && <span className="text-[9px] opacity-60">{activeFlowStep + 1}/{flow.steps.length}</span>}
            </button>
          );
        })}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <span className="text-[9px] whitespace-nowrap hidden lg:block" style={{ color: "var(--text-faint)" }}>← → navigate steps</span>
          <button
            onClick={() => setStepByStep(v => !v)}
            aria-pressed={stepByStep}
            title={stepByStep ? "Switch back to animated flow" : "Step-by-step mode (no animation)"}
            className="text-[9px] px-2 py-1 rounded whitespace-nowrap"
            style={{ background: stepByStep ? N_AMBER + "18" : "transparent", color: stepByStep ? N_AMBER : "var(--text-faint)", border: `1px solid ${stepByStep ? N_AMBER + "40" : "var(--border)"}` }}>
            {stepByStep ? "Step mode on" : "Step mode"}
          </button>
        </div>
      </div>

      {/* Step-by-step transcript panel (reduced-motion mode) */}
      {stepByStep && activeFlow && (
        <div className="hidden lg:flex shrink-0 items-center gap-0 px-4 py-2 overflow-x-auto no-scrollbar" style={{ background: "var(--bg-card)", borderTop: `1px solid ${N_AMBER}25` }}>
          {activeFlow.steps.map((s, i) => (
            <div key={i} className="flex items-center gap-0 shrink-0">
              <div className="flex flex-col items-center gap-0.5 px-2" style={{ minWidth: 72 }}>
                <div className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: i <= activeFlowStep ? N_AMBER : "var(--border)", color: i <= activeFlowStep ? "#000" : "var(--text-faint)" }}>
                  {i + 1}
                </div>
                <p className="text-[9px] text-center leading-tight" style={{ color: i === activeFlowStep ? N_AMBER : "var(--text-faint)", maxWidth: 64 }}>{s.name}</p>
              </div>
              {i < activeFlow.steps.length - 1 && (
                <div className="h-px w-4 shrink-0" style={{ background: i < activeFlowStep ? N_AMBER : "var(--border)" }} />
              )}
            </div>
          ))}
        </div>
      )}

      {cmdOpen && <CommandPalette onSelect={id => setSelectedNode(id)} onClose={() => setCmdOpen(false)} />}
    </div>
  );
}

// ── Theme-aware color helpers ───────────────────────────────────────────────────
const THEME_COLORS = {
  bg:     "var(--bg)",
  card:   "var(--bg-card)",
  card2:  "var(--bg-muted)",
  border: "var(--border)",
  muted:  "var(--text-muted)",
  faint:  "var(--text-faint)",
  text:   "var(--text)",
  text2:  "var(--text)",
};

// ── Main shell ─────────────────────────────────────────────────────────────────
// ── Scrollable tab shell with back-to-top ────────────────────────────────────
function ScrollableTabShell({ bg, tabId, feedbackVote, onFeedback, children }: {
  bg: string;
  tabId: string;
  feedbackVote?: "up" | "down";
  onFeedback?: (tab: string, vote: "up" | "down") => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => setShowTop(el.scrollTop > 300);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  return (
    <div ref={ref} className="flex-1 overflow-y-auto relative" style={{ background: bg }}>
      <div className="px-5 lg:px-6 py-7 max-w-6xl mx-auto w-full">
        {children}
        {/* Feedback widget */}
        {onFeedback && (
          <div className="mt-10 pt-5 flex items-center gap-3" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>Was this tab useful for interview prep?</span>
            <button
              onClick={() => onFeedback(tabId, "up")}
              aria-pressed={feedbackVote === "up"}
              className="text-sm px-3 py-1.5 rounded-lg transition-all"
              style={{ background: feedbackVote === "up" ? "#22c55e18" : "var(--bg-card)", border: `1px solid ${feedbackVote === "up" ? "#22c55e" : "var(--border)"}`, cursor: "pointer" }}
              aria-label="This tab was useful">
              👍
            </button>
            <button
              onClick={() => onFeedback(tabId, "down")}
              aria-pressed={feedbackVote === "down"}
              className="text-sm px-3 py-1.5 rounded-lg transition-all"
              style={{ background: feedbackVote === "down" ? "#ef444418" : "var(--bg-card)", border: `1px solid ${feedbackVote === "down" ? "#ef4444" : "var(--border)"}`, cursor: "pointer" }}
              aria-label="This tab needs work">
              👎
            </button>
            {feedbackVote && <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>Thanks for the feedback.</span>}
          </div>
        )}
      </div>
      {showTop && (
        <button
          onClick={() => ref.current?.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 w-10 h-10 rounded-full flex items-center justify-center shadow-lg z-30 transition-all"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          ↑
        </button>
      )}
    </div>
  );
}

function TabHeader({ title, color, textColor, mins }: { title: string; color: string; textColor: string; mins: number }) {
  return (
    <div className="flex items-baseline gap-3 mb-6 flex-wrap">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: textColor }}>
        Netflix System Design: <span style={{ color }}>{title}</span>
      </h1>
      <span className="text-[11px] px-2 py-0.5 rounded-full shrink-0" style={{ background: "var(--bg-muted)", color: "var(--text-faint)", border: "1px solid var(--border)" }}>
        ~{mins} min
      </span>
    </div>
  );
}

export default function NetflixArchPage({ initialTab }: { initialTab?: string }) {
  const T = THEME_COLORS;

  const resolvedInitial = normalizeNetflixTab(initialTab) ?? "start-here";
  const [activeTab, setActiveTab] = useState<TabId>(resolvedInitial);
  const [studiedNodes, setStudiedNodes] = useState<Set<NodeId>>(new Set());
  const [interviewMode, setInterviewMode] = useState(false);
  const [role, setRole] = useState<Role>("Backend Engineer");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lastStudied, setLastStudied] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState(false);
  const [completedTabs, setCompletedTabs] = useState<Set<TabId>>(new Set());
  const [continueTab, setContinueTab] = useState<TabId | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});
  const [progressCardOpen, setProgressCardOpen] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Load from localStorage on mount (initialTab from URL already handled by prop)
  useEffect(() => {
    try {
      const s = localStorage.getItem("netflix-studied");
      if (s) setStudiedNodes(new Set(JSON.parse(s)));
      const ls = localStorage.getItem("netflix-last-studied");
      if (ls) setLastStudied(ls);
      const ct = localStorage.getItem("netflix-completed-tabs");
      if (ct) setCompletedTabs(new Set(JSON.parse(ct)));
      const cv = localStorage.getItem("netflix-continue-tab");
      const normalizedContinueTab = normalizeNetflixTab(cv);
      if (normalizedContinueTab) setContinueTab(normalizedContinueTab);
      const n = localStorage.getItem("netflix-notes");
      if (n) setNotes(JSON.parse(n));
      const fb = localStorage.getItem("netflix-feedback");
      if (fb) setFeedback(JSON.parse(fb));
    } catch { /* ignore */ }
  }, []);

  // Persist studied
  useEffect(() => {
    try { localStorage.setItem("netflix-studied", JSON.stringify([...studiedNodes])); } catch { /* ignore */ }
  }, [studiedNodes]);

  // Persist completed tabs
  useEffect(() => {
    try { localStorage.setItem("netflix-completed-tabs", JSON.stringify([...completedTabs])); } catch { /* ignore */ }
  }, [completedTabs]);

  // Persist notes
  useEffect(() => {
    try { localStorage.setItem("netflix-notes", JSON.stringify(notes)); } catch { /* ignore */ }
  }, [notes]);

  // Persist feedback
  useEffect(() => {
    try { localStorage.setItem("netflix-feedback", JSON.stringify(feedback)); } catch { /* ignore */ }
  }, [feedback]);

  useEffect(() => {
    const handlePopState = () => {
      const pathTab = window.location.pathname.split("/").pop();
      const normalized = normalizeNetflixTab(pathTab);
      if (normalized) {
        setActiveTab(normalized);
        setContinueTab(normalized);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleFeedback = useCallback((tab: string, vote: "up" | "down") => {
    setFeedback(prev => ({ ...prev, [tab]: vote }));
  }, []);

  const handleExportNotes = useCallback(() => {
    const lines: string[] = [`# Netflix System Design — My Notes\n`];
    TABS.forEach(tab => {
      const n = notes[tab.id];
      if (n?.trim()) {
        lines.push(`## ${tab.label}\n`);
        lines.push(n.trim());
        lines.push("");
      }
    });
    if (lines.length <= 1) return;
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "netflix-design-notes.md"; a.click();
    URL.revokeObjectURL(url);
  }, [notes]);

  const switchTab = useCallback((id: TabSlug | string) => {
    const nextTab = normalizeNetflixTab(id);
    if (!nextTab || nextTab === activeTab) return;
    // Mark the tab we're leaving as visited
    setCompletedTabs(prev => { const n = new Set(prev); n.add(activeTab); return n; });
    try { localStorage.setItem("netflix-continue-tab", nextTab); } catch { /* ignore */ }
    setContinueTab(nextTab);
    setActiveTab(nextTab);
    window.history.pushState(null, "", `/system-design/netflix/${nextTab}`);
    try { localStorage.setItem("netflix-active-tab", nextTab); } catch { /* ignore */ }
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
    const url = `${window.location.origin}/system-design/netflix/${activeTab}`;
    copyTextToClipboard(url).then((copiedOk) => {
      if (!copiedOk) return;
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    });
  };

  const studiedCount = studiedNodes.size;
  const visitedTabsCount = useMemo(
    () => new Set<TabId>([...completedTabs, activeTab]).size,
    [activeTab, completedTabs]
  );
  const activeTabIndex = TABS.findIndex(t => t.id === activeTab);

  useEffect(() => {
    const activeTabMeta = TABS.find(tab => tab.id === activeTab);
    if (!activeTabMeta) return;
    document.title = `Netflix System Design — ${activeTabMeta.label} | withsoon.com`;
  }, [activeTab]);

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 56px)", background: T.bg, color: T.text, fontFamily: C.sans, overflow: "hidden" }}>
      {/* ── Topbar (hidden in focus mode) ── */}
      <div className="shrink-0 z-40" style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, display: focusMode ? "none" : undefined }}>
        {/* Row 1: logo + controls */}
        <div className="flex items-center gap-3 px-4 h-11">
          <Link href="/" className="flex items-center gap-1.5 shrink-0" style={{ textDecoration: "none" }}>
            <span className="text-lg font-black tracking-tight" style={{ color: N_RED }}>N</span>
            <span className="w-px h-3 shrink-0 hidden sm:block" style={{ background: T.border }} />
            <span className="text-xs font-semibold hidden sm:block" style={{ color: T.faint }}>withsoon</span>
          </Link>
          <span className="hidden sm:block text-xs" style={{ color: T.faint }}>/</span>
          <Link href="/system-design" className="text-xs hidden sm:block hover:underline" style={{ color: T.faint }}>System Design</Link>
          <span className="hidden sm:block text-xs" style={{ color: T.faint }}>/</span>
          <span className="text-xs font-semibold hidden sm:block" style={{ color: T.text }}>Netflix</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium hidden md:block"
            style={{ background: T.card2, color: T.faint, border: `1px solid ${T.border}` }}>
            Senior Backend
          </span>

          <div className="flex-1" />

          {continueTab && continueTab !== activeTab && (
            <button
              onClick={() => switchTab(continueTab)}
              className="text-[10px] hidden lg:flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
              style={{ color: T.faint, border: `1px solid ${T.border}`, background: "transparent", cursor: "pointer" }}
              aria-label={`Continue where you left off: ${TABS.find(t => t.id === continueTab)?.label}`}
            >
              ↩ Continue: {TABS.find(t => t.id === continueTab)?.label}
            </button>
          )}
          {lastStudied && !continueTab && (
            <span className="text-[10px] hidden lg:block" style={{ color: T.faint }}>Last studied {lastStudied}</span>
          )}
          <span className="text-[10px] hidden sm:block" style={{ color: T.muted }}>
            {visitedTabsCount} explored · {studiedCount}/{NODES.length} studied
          </span>

          <button onClick={() => setProgressCardOpen(v => !v)}
            className="min-h-[40px] text-xs px-3 py-2 rounded-lg font-medium hidden sm:block cursor-pointer"
            style={{ background: "transparent", color: T.muted, border: `1px solid ${T.border}`, cursor: "pointer" }}
            title="View progress card">
            Progress {visitedTabsCount}/{TABS.length}
          </button>
          <button onClick={() => setNotesOpen(v => !v)}
            className="min-h-[40px] text-xs px-3 py-2 rounded-lg font-medium hidden sm:block cursor-pointer"
            style={{ background: notesOpen ? N_RED + "18" : "transparent", color: notesOpen ? N_RED : T.muted, border: `1px solid ${notesOpen ? N_RED + "40" : T.border}`, cursor: "pointer" }}
            title="Open notes panel">
            Notes
          </button>
          <button onClick={() => { setInterviewMode(v => !v); setFocusMode(v => !v); }}
            className="min-h-[40px] text-xs px-3 py-2 rounded-lg font-medium transition-all cursor-pointer"
            style={{ background: interviewMode ? N_RED + "18" : "transparent", color: interviewMode ? N_RED : T.muted, border: `1px solid ${interviewMode ? N_RED + "40" : T.border}`, cursor: "pointer" }}>
            {interviewMode ? "Exit Focus" : "Focus"}
          </button>

          <button onClick={handleShare}
            className="min-h-[40px] text-xs px-3 py-2 rounded-lg hidden sm:block cursor-pointer"
            style={{ background: "transparent", border: `1px solid ${T.border}`, color: shareToast ? N_GREEN : T.muted, cursor: "pointer" }}>
            {shareToast ? "✓ Copied link" : "Share"}
          </button>

          <button
            onClick={() => setShortcutsOpen(true)}
            aria-label="Open keyboard shortcuts"
            title="Keyboard shortcuts"
            className="min-h-[40px] text-xs px-3 py-2 rounded-lg hidden sm:flex items-center gap-1.5 cursor-pointer"
            style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.muted, cursor: "pointer" }}>
            <span>?</span>
            <span className="hidden lg:inline">Shortcuts</span>
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Open navigation menu"
            className="sm:hidden flex flex-col gap-1 items-center justify-center w-11 h-11 rounded"
            style={{ border: `1px solid ${T.border}`, cursor: "pointer" }}>
            <span className="block w-4 h-0.5 rounded" style={{ background: T.muted }} />
            <span className="block w-4 h-0.5 rounded" style={{ background: T.muted }} />
            <span className="block w-4 h-0.5 rounded" style={{ background: T.muted }} />
          </button>
        </div>

        {/* Row 2: tabs — horizontal scroll, 40px height, right fade */}
        <div className="hidden sm:flex items-stretch relative" style={{ height: 40 }}>
          {/* Scrollable tab list */}
          <div className="flex items-end overflow-x-auto px-4 gap-0 flex-1 min-w-0 no-scrollbar" style={{ scrollbarWidth: "none" }}>
            {TABS.map((tab, idx) => {
              const isPractice = tab.id === "quiz";
              return (
                <div key={tab.id} className="flex items-end shrink-0">
                  {/* "Practice" group divider before quiz */}
                  {isPractice && (
                    <div className="flex items-center px-2 pb-2">
                      <div className="w-px h-4 mx-1.5" style={{ background: T.border }} />
                    </div>
                  )}
                  <button
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
                    title={`~${tab.mins} min`}
                    className="relative px-3 pb-2 pt-1 font-medium transition-colors shrink-0 flex items-end gap-1 cursor-pointer"
                    style={{
                      fontSize: 14,
                      color: activeTab === tab.id ? T.text : completedTabs.has(tab.id) ? T.text : T.muted,
                      height: 44,
                      cursor: "pointer",
                      background: activeTab === tab.id ? N_RED + "10" : completedTabs.has(tab.id) ? N_GREEN + "10" : "transparent",
                      borderTopLeftRadius: 10,
                      borderTopRightRadius: 10,
                      paddingLeft: 12,
                      paddingRight: 12,
                    }}>
                    {completedTabs.has(tab.id) && tab.id !== activeTab && (
                      <span
                        className="w-4 h-4 rounded-full mb-2 shrink-0 flex items-center justify-center text-[9px] font-bold"
                        style={{ background: N_GREEN + "18", color: N_GREEN }}
                      >
                        ✓
                      </span>
                    )}
                    {tab.label}
                    {activeTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                        style={{ background: N_RED }} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          {/* Right fade + prev/next */}
          <div className="flex items-center gap-2 pr-4 pl-6 shrink-0" style={{
            background: `linear-gradient(to right, transparent, ${T.bg} 30%)`,
            position: "absolute", right: 0, top: 0, bottom: 0,
          }}>
            {(() => {
              const prev = TABS[activeTabIndex - 1];
              const next = TABS[activeTabIndex + 1];
              return <>
                {prev && (
                  <button onClick={() => switchTab(prev.id)} className="text-[10px] px-2.5 py-1.5 min-h-[32px] rounded-md transition-colors whitespace-nowrap cursor-pointer"
                    style={{ color: T.muted, border: `1px solid ${T.border}`, background: T.bg, cursor: "pointer" }}>← {prev.label}</button>
                )}
                {next && (
                  <button onClick={() => switchTab(next.id)} className="text-[10px] px-2.5 py-1.5 min-h-[32px] rounded-md transition-colors whitespace-nowrap cursor-pointer"
                    style={{ color: T.muted, border: `1px solid ${T.border}`, background: T.bg, cursor: "pointer" }}>{next.label} →</button>
                )}
              </>;
            })()}
          </div>
        </div>

        {/* Mobile: show active tab label + prev/next */}
        <div className="sm:hidden px-4 pb-2 flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: T.text }}>
            {TABS.find(t => t.id === activeTab)?.label}
          </span>
          {(() => {
            const idx = TABS.findIndex(t => t.id === activeTab);
            return (
              <span className="text-[10px]" style={{ color: T.faint }}>{idx + 1}/{TABS.length}</span>
            );
          })()}
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden flex flex-col"
          style={{ background: T.bg }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
            <span className="text-sm font-bold" style={{ color: T.text }}>Menu</span>
            <button onClick={() => setMobileMenuOpen(false)} style={{ color: T.muted, fontSize: 18 }}>✕</button>
          </div>
          <div className="p-4 space-y-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { switchTab(tab.id); setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                style={{ background: activeTab === tab.id ? N_RED + "10" : "transparent", color: activeTab === tab.id ? N_RED : T.text, border: `1px solid ${activeTab === tab.id ? N_RED + "30" : "transparent"}` }}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-4 mt-auto space-y-3" style={{ borderTop: `1px solid ${T.border}` }}>
            <button onClick={() => { setInterviewMode(v => !v); }}
              className="w-full py-2.5 rounded-lg text-sm font-medium"
              style={{ background: interviewMode ? N_RED + "18" : T.border, color: interviewMode ? N_RED : T.text }}>
              {interviewMode ? "Exit Interview Mode" : "Interview Mode"}
            </button>
            <button onClick={() => { handleShare(); setMobileMenuOpen(false); }}
              className="w-full py-2.5 rounded-lg text-sm font-medium"
              style={{ background: T.border, color: T.text }}>
              Share this page
            </button>
          </div>
        </div>
      )}

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "start-here"     && (
          <ScrollableTabShell bg={T.bg} tabId={activeTab} feedbackVote={feedback[activeTab]} onFeedback={handleFeedback}>
            <TabHeader title="Start Here" color={N_RED} textColor={T.text} mins={TABS.find(t => t.id === "start-here")!.mins} />
            <StartHereTab
              role={role}
              onRoleChange={setRole}
              onNavigateTab={(tab) => switchTab(tab as TabId)}
            />
          </ScrollableTabShell>
        )}
        {activeTab === "requirements"   && (
          <ScrollableTabShell bg={T.bg} tabId={activeTab} feedbackVote={feedback[activeTab]} onFeedback={handleFeedback}>
            <TabHeader title="Requirements" color={N_RED} textColor={T.text} mins={TABS.find(t => t.id === "requirements")!.mins} />
            <RequirementsTab onNavigateTab={(tab) => switchTab(tab)} />
          </ScrollableTabShell>
        )}
        {activeTab === "architecture"   && (
          <>
            <h1 className="sr-only">Netflix System Design: Architecture</h1>
            {completedTabs.size === 0 && (
              <div className="hidden lg:flex absolute top-0 left-0 right-0 items-center gap-3 px-4 py-2 z-10" style={{ background: N_RED + "ee", backdropFilter: "blur(4px)" }}>
                <span className="text-[11px] font-bold text-white">First time here?</span>
                <span className="text-[11px] text-white opacity-90">Start with the &ldquo;Start Here&rdquo; tab — it picks your track and tells you which tabs matter for your role.</span>
                <button onClick={() => switchTab("start-here")} className="text-[11px] px-3 py-1 rounded-lg font-bold shrink-0 cursor-pointer" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)" }}>Go to Start Here →</button>
                <button onClick={() => setCompletedTabs(prev => { const n = new Set(prev); n.add("architecture"); return n; })} className="text-[10px] px-2 py-1 rounded ml-auto cursor-pointer" style={{ color: "rgba(255,255,255,0.7)", background: "transparent", border: "none" }}>Dismiss</button>
              </div>
            )}
            <ArchitectureTab studiedNodes={studiedNodes} onMarkStudied={handleMarkStudied} interviewMode={interviewMode} onNavigatePlayback={() => switchTab("playback")} />
          </>
        )}
        {activeTab === "playback"       && (
          <ScrollableTabShell bg={T.bg} tabId={activeTab} feedbackVote={feedback[activeTab]} onFeedback={handleFeedback}>
            <TabHeader title="Playback" color={N_RED} textColor={T.text} mins={TABS.find(t => t.id === "playback")!.mins} />
            <PlaybackTab onNavigateTab={(tab) => switchTab(tab as TabId)} />
          </ScrollableTabShell>
        )}
        {activeTab === "cdn"            && (
          <ScrollableTabShell bg={T.bg} tabId={activeTab} feedbackVote={feedback[activeTab]} onFeedback={handleFeedback}>
            <TabHeader title="CDN & Open Connect" color={N_RED} textColor={T.text} mins={TABS.find(t => t.id === "cdn")!.mins} />
            <CDNTab onNavigateTab={(tab) => switchTab(tab as TabId)} />
          </ScrollableTabShell>
        )}
        {activeTab === "encoding"       && (
          <ScrollableTabShell bg={T.bg} tabId={activeTab} feedbackVote={feedback[activeTab]} onFeedback={handleFeedback}>
            <TabHeader title="Encoding Pipeline" color={N_RED} textColor={T.text} mins={TABS.find(t => t.id === "encoding")!.mins} />
            <EncodingTab onNavigateTab={(tab) => switchTab(tab as TabId)} />
          </ScrollableTabShell>
        )}
        {activeTab === "security"       && (
          <ScrollableTabShell bg={T.bg} tabId={activeTab} feedbackVote={feedback[activeTab]} onFeedback={handleFeedback}>
            <TabHeader title="Security & DRM" color={N_RED} textColor={T.text} mins={TABS.find(t => t.id === "security")!.mins} />
            <SecurityTab onNavigateTab={(tab) => switchTab(tab as TabId)} />
          </ScrollableTabShell>
        )}
        {activeTab === "models"         && (
          <>
            <h1 className="sr-only">Netflix System Design: Data Models</h1>
            <ModelsTab />
          </>
        )}
        {activeTab === "tradeoffs"      && (
          <>
            <h1 className="sr-only">Netflix System Design: Trade-offs</h1>
            <TradeoffsTab interviewMode={interviewMode} />
          </>
        )}
        {activeTab === "capacity"       && (
          <>
            <h1 className="sr-only">Netflix System Design: Capacity Estimation</h1>
            <CapacityTab />
          </>
        )}
        {activeTab === "failures"       && (
          <ScrollableTabShell bg={T.bg} tabId={activeTab} feedbackVote={feedback[activeTab]} onFeedback={handleFeedback}>
            <TabHeader title="Failure Scenarios" color={N_RED} textColor={T.text} mins={TABS.find(t => t.id === "failures")!.mins} />
            <FailuresTab onNavigateTab={(tab) => switchTab(tab)} />
          </ScrollableTabShell>
        )}
        {activeTab === "quiz"           && (
          <>
            <h1 className="sr-only">Netflix System Design: Quiz</h1>
            <QuizTab onNavigateTab={(tab) => switchTab(tab)} />
          </>
        )}
        {activeTab === "mock-interview" && (
          <ScrollableTabShell bg={T.bg} tabId={activeTab} feedbackVote={feedback[activeTab]} onFeedback={handleFeedback}>
            <TabHeader title="Mock Interview" color={N_RED} textColor={T.text} mins={TABS.find(t => t.id === "mock-interview")!.mins} />
            <MockInterviewTab role={role} />
          </ScrollableTabShell>
        )}
        {activeTab === "cheat-sheet"    && (
          <ScrollableTabShell bg={T.bg} tabId={activeTab} feedbackVote={feedback[activeTab]} onFeedback={handleFeedback}>
            <TabHeader title="Cheat Sheet" color={N_RED} textColor={T.text} mins={TABS.find(t => t.id === "cheat-sheet")!.mins} />
            <CheatSheetTab role={role} />
          </ScrollableTabShell>
        )}
      </div>

      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}

      {/* Focus mode exit strip */}
      {focusMode && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-1.5"
          style={{ background: N_RED + "cc", backdropFilter: "blur(4px)" }}>
          <span className="text-[11px] font-bold text-white">Focus Mode — {TABS.find(t => t.id === activeTab)?.label}</span>
          <button
            onClick={() => { setFocusMode(false); setInterviewMode(false); }}
            className="text-[11px] px-3 py-1 rounded font-bold text-white"
            style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}>
            Exit Focus
          </button>
        </div>
      )}

      {/* Notes panel */}
      {notesOpen && (
        <div className="fixed inset-y-0 right-0 z-[60] flex flex-col shadow-2xl" style={{ width: 320, background: T.bg, borderLeft: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
            <span className="text-sm font-bold" style={{ color: T.text }}>Notes — {TABS.find(t => t.id === activeTab)?.label}</span>
            <div className="flex gap-2">
              <button onClick={handleExportNotes} className="text-[10px] px-2 py-1 rounded font-medium" style={{ background: T.border, color: T.muted }}>Export .md</button>
              <button onClick={() => setNotesOpen(false)} style={{ color: T.muted, fontSize: 16 }}>✕</button>
            </div>
          </div>
          <div className="flex-1 p-3 flex flex-col gap-2">
            <textarea
              value={notes[activeTab] ?? ""}
              onChange={e => setNotes(prev => ({ ...prev, [activeTab]: e.target.value }))}
              placeholder={`Notes for ${TABS.find(t => t.id === activeTab)?.label}…\n\nTip: jot down concepts you want to re-read, interview phrases that work, or things to look up.`}
              className="flex-1 w-full resize-none rounded-lg p-3 text-xs leading-relaxed"
              style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, fontFamily: C.mono, outline: "none" }}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: T.faint }}>{(notes[activeTab] ?? "").length} chars</span>
              <button onClick={() => setNotes(prev => ({ ...prev, [activeTab]: "" }))} className="text-[10px]" style={{ color: T.faint }}>Clear</button>
            </div>
          </div>
          <div className="shrink-0 px-3 pb-3 space-y-1" style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: T.faint }}>Other tabs with notes</p>
            {TABS.filter(t => notes[t.id]?.trim() && t.id !== activeTab).map(t => (
              <button key={t.id} onClick={() => switchTab(t.id as TabId)} className="w-full text-left text-[10px] px-2 py-1 rounded" style={{ background: T.card, color: T.muted, border: `1px solid ${T.border}` }}>
                {t.label} ({(notes[t.id] ?? "").length} chars)
              </button>
            ))}
            {TABS.filter(t => notes[t.id]?.trim()).length === 0 && (
              <p className="text-[10px]" style={{ color: T.faint }}>No notes yet on any tab.</p>
            )}
          </div>
        </div>
      )}

      {/* Progress card */}
      {progressCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setProgressCardOpen(false)}>
          <div className="rounded-2xl p-6 w-full max-w-sm mx-4" style={{ background: T.card, border: `1px solid ${T.border}` }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: T.text }}>Your Progress</h2>
              <button onClick={() => setProgressCardOpen(false)} style={{ color: T.muted, fontSize: 16 }}>✕</button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Tabs visited", value: visitedTabsCount, total: TABS.length, color: N_RED },
                { label: "Nodes studied", value: studiedCount, total: NODES.length, color: N_GREEN },
                { label: "Notes taken", value: TABS.filter(t => notes[t.id]?.trim()).length, total: TABS.length, color: N_AMBER },
              ].map(({ label, value, total, color }) => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                  <div className="text-2xl font-black font-mono mb-0.5" style={{ color }}>{value}<span className="text-sm font-normal" style={{ color: T.faint }}>/{total}</span></div>
                  <div className="text-[9px]" style={{ color: T.faint }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1 mb-4">
              {TABS.map(tab => {
                const visited = completedTabs.has(tab.id) || tab.id === activeTab;
                const hasFb = feedback[tab.id];
                return (
                  <div key={tab.id} className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: visited ? N_RED + "08" : "transparent", border: `1px solid ${visited ? N_RED + "20" : T.border}` }}>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: visited ? N_RED : T.border }} />
                    <span className="text-xs flex-1" style={{ color: visited ? T.text : T.faint }}>{tab.label}</span>
                    {hasFb && <span className="text-[10px]">{hasFb === "up" ? "👍" : "👎"}</span>}
                    {notes[tab.id]?.trim() && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: N_AMBER + "18", color: N_AMBER }}>notes</span>}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => {
                const pct = Math.round((visitedTabsCount / TABS.length) * 100);
                const txt = `Netflix System Design Progress — withsoon.com\n${visitedTabsCount}/${TABS.length} tabs visited • ${studiedCount}/${NODES.length} nodes studied • ${pct}% complete\nhttps://withsoon.com/system-design/netflix`;
                copyTextToClipboard(txt).catch(() => {});
                setProgressCardOpen(false);
              }}
              className="w-full py-2.5 rounded-xl text-sm font-bold"
              style={{ background: N_RED, color: "#fff", border: "none", cursor: "pointer" }}>
              Copy progress to share
            </button>
          </div>
        </div>
      )}

      <style>{`
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.muted}; }
        svg g[role="button"] { cursor: pointer; }
        svg g[role="button"] rect:first-child { transition: fill 0.16s ease, stroke 0.16s ease, stroke-width 0.16s ease; }
        svg g[role="button"]:hover rect:first-child {
          fill: var(--netflix-node-hover-fill);
          stroke: var(--netflix-node-hover-stroke);
          stroke-width: 1.25;
        }
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
