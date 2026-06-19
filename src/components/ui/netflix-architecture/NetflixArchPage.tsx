"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { NODES, CONNECTIONS, FLOWS, type NodeData, type NodeId, type Flow, type FlowStep } from "./nodes-data";

// ── Constants ─────────────────────────────────────────────────────────────────
const N_RED    = "#e50914";
const N_AMBER  = "#f5a623";
const N_GREEN  = "#22c55e";
const N_BG     = "#0a0a0a";
const N_CARD   = "#111111";
const N_BORDER = "#222222";
const N_MUTED  = "#666666";
const N_TEXT   = "#e5e5e5";
const N_FAINT  = "#444444";

const PROTOCOL_COLORS: Record<string, string> = {
  gRPC: "#818cf8", HTTPS: "#38bdf8", Kafka: "#f59e0b",
  SQL: "#6ee7b7", Redis: "#f87171", S3: "#a78bfa",
  "gRPC/REST": "#818cf8",
};

// ── Layer layout ──────────────────────────────────────────────────────────────
const LAYER_Y: Record<number, number> = { 1: 40, 2: 170, 3: 310, 4: 460, 5: 600, 6: 740 };
const NODE_W = 130;
const NODE_H = 72;
const LAYER_LABELS: Record<number, string> = {
  1: "CLIENT", 2: "GATEWAY", 3: "SERVICES", 4: "SERVICES", 5: "DATA STORES", 6: "CDN / VIDEO",
};

function getNodeX(layer: number, col: number, total: number): number {
  const spacing = 160;
  const width = (total - 1) * spacing;
  const startX = 80 + (layer === 2 ? 540 : 0); // center gateway
  if (layer === 1) return 550;
  if (layer === 2) return 550;
  const layerNodes = NODES.filter(n => n.layer === layer).sort((a, b) => a.col - b.col);
  const layerTotal = layerNodes.length;
  const totalWidth = (layerTotal - 1) * spacing;
  const canvasCenter = 640;
  const baseX = canvasCenter - totalWidth / 2;
  const idx = layerNodes.findIndex(n => n.col === col);
  return baseX + idx * spacing;
}

function getNodePos(node: NodeData): { x: number; y: number } {
  const layerNodes = NODES.filter(n => n.layer === node.layer).sort((a, b) => a.col - b.col);
  const totalInLayer = layerNodes.length;
  const spacing = node.layer === 5 ? 150 : 160;
  const canvasCenter = 660;
  const totalWidth = (totalInLayer - 1) * spacing;
  const baseX = canvasCenter - totalWidth / 2;
  const idx = layerNodes.findIndex(n => n.id === node.id);
  const x = node.layer === 1 || node.layer === 2 ? 600 - NODE_W / 2 : baseX + idx * spacing - NODE_W / 2;
  return { x, y: LAYER_Y[node.layer] };
}

const NODE_POSITIONS = Object.fromEntries(NODES.map(n => [n.id, getNodePos(n)]));

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({ label, color = N_BORDER }: { label: string; color?: string }) {
  return (
    <span
      className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{ background: color + "18", color, border: `1px solid ${color}40`, whiteSpace: "nowrap" }}
    >
      {label}
    </span>
  );
}

// ── Callout ───────────────────────────────────────────────────────────────────
const CALLOUT_COLORS = {
  info:    { bg: "rgba(56,189,248,0.08)",  border: "#38bdf840", text: "#38bdf8",  icon: "ℹ" },
  warn:    { bg: "rgba(245,158,11,0.08)",  border: "#f59e0b40", text: "#f59e0b",  icon: "⚠" },
  danger:  { bg: "rgba(239,68,68,0.08)",   border: "#ef444440", text: "#ef4444",  icon: "⚡" },
  success: { bg: "rgba(34,197,94,0.08)",   border: "#22c55e40", text: "#22c55e",  icon: "✓" },
};

function Callout({ variant, title, body }: { variant: keyof typeof CALLOUT_COLORS; title: string; body: string }) {
  const c = CALLOUT_COLORS[variant];
  return (
    <div className="rounded-lg p-3 mb-3" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-start gap-2">
        <span className="text-sm shrink-0 mt-0.5" style={{ color: c.text }}>{c.icon}</span>
        <div>
          <p className="text-xs font-bold mb-1" style={{ color: c.text }}>{title}</p>
          <p className="text-xs leading-relaxed" style={{ color: N_MUTED.replace("66", "94") }}>{body}</p>
        </div>
      </div>
    </div>
  );
}

// ── Node SVG icon ─────────────────────────────────────────────────────────────
const NODE_ICONS: Record<string, string> = {
  client: "▣", "api-gateway": "⇌", auth: "🔒", user: "👤", catalog: "☰",
  streaming: "▶", drm: "🔑", search: "🔍", recommendation: "✦", "watch-history": "⏱",
  payment: "💳", notification: "🔔", analytics: "📊",
  aurora: "🐘", dynamodb: "⚡", redis: "⚡", kafka: "∿", cassandra: "⬡",
  opensearch: "⊙", kinesis: "〜", transcoder: "⚙", s3: "☁", cdn: "🌐",
};

const TYPE_COLORS: Record<string, string> = {
  client: "#38bdf8", gateway: "#818cf8", service: "#f59e0b",
  datastore: "#6ee7b7", pipeline: "#e879f9",
};

// ── Node card on canvas ───────────────────────────────────────────────────────
function NodeCard({
  node, isSelected, flowStep, isFlowVisited, onClick,
}: {
  node: NodeData;
  isSelected: boolean;
  flowStep?: number;
  isFlowVisited?: boolean;
  onClick: () => void;
}) {
  const pos = NODE_POSITIONS[node.id];
  const typeColor = TYPE_COLORS[node.type] ?? N_MUTED;
  const borderColor = isSelected ? N_RED : isFlowVisited ? N_AMBER : N_BORDER;
  const glow = isSelected ? `0 0 0 2px ${N_RED}40` : isFlowVisited ? `0 0 0 2px ${N_AMBER}30` : "none";

  return (
    <g
      className="cursor-pointer"
      onClick={onClick}
      role="button"
      aria-label={`${node.label} — click to explore`}
      tabIndex={0}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick()}
    >
      <rect
        x={pos.x} y={pos.y} width={NODE_W} height={NODE_H}
        rx="8"
        style={{
          fill: isSelected ? "#1a0a0a" : isFlowVisited ? "#140f00" : N_CARD,
          stroke: borderColor,
          strokeWidth: isSelected || isFlowVisited ? 1.5 : 1,
          filter: glow !== "none" ? `drop-shadow(${glow})` : undefined,
        }}
      />
      {/* Top color accent bar */}
      <rect x={pos.x} y={pos.y} width={NODE_W} height={3} rx="8" style={{ fill: typeColor, opacity: 0.7 }} />

      {/* Icon */}
      <text x={pos.x + 12} y={pos.y + 26} style={{ fontSize: 14 }}>{NODE_ICONS[node.id] ?? "□"}</text>

      {/* Label */}
      <text
        x={pos.x + 30} y={pos.y + 24}
        style={{ fill: N_TEXT, fontSize: 11, fontWeight: "bold", fontFamily: "Inter, sans-serif" }}
      >
        {node.label.length > 14 ? node.label.slice(0, 14) + "…" : node.label}
      </text>

      {/* Sublabel */}
      <text
        x={pos.x + 8} y={pos.y + 44}
        style={{ fill: N_MUTED, fontSize: 9, fontFamily: "Inter, sans-serif" }}
      >
        {node.sublabel.length > 20 ? node.sublabel.slice(0, 20) + "…" : node.sublabel}
      </text>

      {/* Type chip */}
      <rect x={pos.x + 6} y={pos.y + NODE_H - 20} width={NODE_W - 12} height={14} rx="3"
        style={{ fill: typeColor + "18", stroke: typeColor + "30", strokeWidth: 0.5 }} />
      <text x={pos.x + NODE_W / 2} y={pos.y + NODE_H - 10}
        style={{ fill: typeColor, fontSize: 8, fontWeight: "bold", textAnchor: "middle", fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {node.type.toUpperCase()}
      </text>

      {/* Flow step badge */}
      {flowStep !== undefined && (
        <>
          <circle cx={pos.x + NODE_W - 10} cy={pos.y + 10} r={9}
            style={{ fill: N_AMBER }} />
          <text x={pos.x + NODE_W - 10} y={pos.y + 14}
            style={{ fill: "#000", fontSize: 9, fontWeight: "bold", textAnchor: "middle", fontFamily: "Inter, sans-serif" }}>
            {flowStep}
          </text>
        </>
      )}
    </g>
  );
}

// ── SVG Connections ───────────────────────────────────────────────────────────
function ConnectionArrows({ activeNodeId, activeFlowNodeIds }: { activeNodeId?: NodeId; activeFlowNodeIds?: NodeId[] }) {
  return (
    <g>
      <defs>
        <marker id="arrow-default" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" style={{ fill: N_FAINT }} />
        </marker>
        <marker id="arrow-active" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" style={{ fill: N_RED }} />
        </marker>
        <marker id="arrow-flow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" style={{ fill: N_AMBER }} />
        </marker>
      </defs>
      {CONNECTIONS.map((conn, i) => {
        const fromPos = NODE_POSITIONS[conn.from];
        const toPos = NODE_POSITIONS[conn.to];
        if (!fromPos || !toPos) return null;

        const fx = fromPos.x + NODE_W / 2;
        const fy = fromPos.y + NODE_H;
        const tx = toPos.x + NODE_W / 2;
        const ty = toPos.y;

        const isActive = activeNodeId && (conn.from === activeNodeId || conn.to === activeNodeId);
        const isFlow = activeFlowNodeIds && activeFlowNodeIds.includes(conn.from) && activeFlowNodeIds.includes(conn.to);
        const color = isActive ? N_RED : isFlow ? N_AMBER : N_FAINT;
        const markerId = isActive ? "arrow-active" : isFlow ? "arrow-flow" : "arrow-default";
        const opacity = isActive || isFlow ? 1 : 0.35;

        const midX = (fx + tx) / 2;
        const midY = (fy + ty) / 2;
        const dx = tx - fx;
        const cy1 = fy + Math.min(30, Math.abs(fy - ty) * 0.4);
        const cy2 = ty - Math.min(30, Math.abs(fy - ty) * 0.4);

        return (
          <g key={i} opacity={opacity}>
            <path
              d={`M ${fx} ${fy} C ${fx + dx * 0.1} ${cy1}, ${tx - dx * 0.1} ${cy2}, ${tx} ${ty - 6}`}
              style={{ fill: "none", stroke: color, strokeWidth: isActive || isFlow ? 1.5 : 0.8 }}
              markerEnd={`url(#${markerId})`}
            />
            {(isActive || isFlow) && (
              <>
                <rect x={midX - 18} y={midY - 8} width={36} height={14} rx={3}
                  style={{ fill: N_CARD, stroke: color + "60", strokeWidth: 0.5 }} />
                <text x={midX} y={midY + 4}
                  style={{ fill: color, fontSize: 8, textAnchor: "middle", fontFamily: "JetBrains Mono, monospace" }}>
                  {conn.label}
                </text>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

// ── Layer labels ──────────────────────────────────────────────────────────────
function LayerLabels() {
  return (
    <g>
      {Object.entries(LAYER_Y).map(([layer, y]) => (
        <text key={layer} x={8} y={y + NODE_H / 2}
          style={{ fill: N_FAINT, fontSize: 8, fontWeight: "bold", letterSpacing: 1, fontFamily: "Inter, sans-serif", writingMode: "horizontal-tb" }}>
          {LAYER_LABELS[parseInt(layer)]}
        </text>
      ))}
    </g>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────
type DepthLevel = "overview" | "interview" | "deepdive";

function DetailPanel({
  node,
  studiedNodes,
  onMarkStudied,
  onNavigateTo,
  activeFlow,
  activeFlowStep,
  onFlowNext,
  onFlowPrev,
  onExitFlow,
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
    const handler = (e: KeyboardEvent) => {
      if (e.key === "1") setDepth("overview");
      if (e.key === "2") setDepth("interview");
      if (e.key === "3") setDepth("deepdive");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const isStudied = node ? studiedNodes.has(node.id) : false;

  // Flow step mode
  if (activeFlow) {
    const step = activeFlow.steps[activeFlowStep];
    const total = activeFlow.steps.length;
    return (
      <div
        ref={panelRef}
        className="flex flex-col h-full overflow-y-auto"
        style={{ background: N_CARD, borderLeft: `1px solid ${N_BORDER}` }}
      >
        {/* Flow header */}
        <div className="sticky top-0 z-10 px-4 py-3" style={{ background: N_CARD, borderBottom: `1px solid ${N_BORDER}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: N_AMBER }}>{activeFlow.label}</span>
            <button onClick={onExitFlow} className="text-xs px-2 py-1 rounded" style={{ background: N_BORDER, color: N_MUTED }}>✕ Exit</button>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            {activeFlow.steps.map((_, i) => (
              <div key={i} className="h-1.5 rounded-full transition-all duration-200"
                style={{ width: i === activeFlowStep ? 20 : 8, background: i <= activeFlowStep ? N_AMBER : N_FAINT }} />
            ))}
          </div>
          <div className="text-[10px]" style={{ color: N_MUTED }}>Step {activeFlowStep + 1} of {total}</div>
        </div>

        {/* Step card */}
        <div className="p-4 flex-1">
          <div className="rounded-lg p-4 mb-4" style={{ background: "#141400", border: `1px solid ${N_AMBER}30` }}>
            <div className="flex items-start gap-2 mb-2">
              <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                style={{ background: N_AMBER, color: "#000" }}>{activeFlowStep + 1}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: N_AMBER }}>{step.name}</p>
                <p className="text-[10px]" style={{ color: N_MUTED }}>
                  {NODES.find(n => n.id === step.nodeId)?.label}
                </p>
              </div>
            </div>
            <p className="text-xs leading-relaxed mb-3" style={{ color: "#aaa" }}>{step.description}</p>
            {step.payload && (
              <div className="rounded-md p-2.5 mb-3" style={{ background: "#0d0d0d", border: `1px solid ${N_BORDER}` }}>
                <pre className="text-[10px] leading-relaxed overflow-x-auto" style={{ color: "#6ee7b7", fontFamily: "JetBrains Mono, monospace" }}>{step.payload}</pre>
              </div>
            )}
            {step.whyItMatters && (
              <div className="rounded p-2" style={{ background: "rgba(245,166,35,0.06)", border: `1px solid ${N_AMBER}25` }}>
                <p className="text-[10px] font-bold mb-0.5" style={{ color: N_AMBER }}>Why this matters</p>
                <p className="text-[10px] leading-relaxed" style={{ color: N_MUTED }}>{step.whyItMatters}</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            <button
              onClick={onFlowPrev} disabled={activeFlowStep === 0}
              className="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-30"
              style={{ background: N_BORDER, color: N_TEXT }}>
              ← Prev
            </button>
            <button
              onClick={onFlowNext} disabled={activeFlowStep === total - 1}
              className="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-30"
              style={{ background: N_AMBER, color: "#000" }}>
              Next →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6"
        style={{ background: N_CARD, borderLeft: `1px solid ${N_BORDER}` }}>
        <div className="text-4xl mb-4" style={{ opacity: 0.3 }}>←</div>
        <p className="text-sm font-semibold mb-1" style={{ color: N_MUTED }}>Click any component</p>
        <p className="text-xs" style={{ color: N_FAINT }}>to explore its design, interview answers, and deep dives</p>
        <div className="mt-6 text-[10px] space-y-1" style={{ color: N_FAINT }}>
          <p>1 / 2 / 3 — switch depth level</p>
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
      {/* Header */}
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

        {/* Depth toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${N_BORDER}` }}>
          {(["overview", "interview", "deepdive"] as DepthLevel[]).map((d, i) => (
            <button key={d} onClick={() => setDepth(d)}
              className="flex-1 py-1.5 text-[10px] font-medium transition-colors"
              style={{
                background: depth === d ? typeColor : "transparent",
                color: depth === d ? "#000" : N_MUTED,
                borderRight: i < 2 ? `1px solid ${N_BORDER}` : undefined,
              }}>
              {d === "overview" ? "Overview" : d === "interview" ? "Interview Answer" : "Deep Dive"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 flex-1">
        {depth === "overview" && (
          <>
            <p className="text-xs leading-relaxed" style={{ color: "#bbb" }}>{node.overview}</p>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: N_FAINT }}>Tech Stack</p>
              <div className="flex flex-wrap gap-1.5">
                {node.techChips.map(c => (
                  <Chip key={c} label={c} color={typeColor} />
                ))}
              </div>
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
          </>
        )}

        {depth === "interview" && (
          <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: N_FAINT }}>Say out loud</p>
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: N_GREEN + "18", color: N_GREEN, border: `1px solid ${N_GREEN}30` }}>
                {node.interviewTime}
              </span>
            </div>
            <div className="rounded-lg p-3" style={{ background: "#0d0d0d", border: `1px solid ${N_BORDER}` }}>
              <p className="text-[11px] leading-relaxed" style={{ color: "#d4d4d4", fontFamily: "Inter, sans-serif" }}>
                {node.interviewAnswer}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: N_FAINT }}>Don&apos;t forget to mention</p>
              <ul className="space-y-1.5">
                {node.dontForget.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-xs shrink-0 mt-0.5" style={{ color: N_RED }}>→</span>
                    <span className="text-[10px] leading-relaxed" style={{ color: N_MUTED }}>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {depth === "deepdive" && (
          <>
            {node.deepDives.map((dd, i) => (
              <Callout key={i} variant={dd.variant} title={dd.title} body={dd.body} />
            ))}
          </>
        )}

        {/* Related nodes */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: N_FAINT }}>Related Components</p>
          <div className="flex flex-wrap gap-1.5">
            {node.relatedNodes.filter(id => NODES.find(n => n.id === id)).map(id => {
              const related = NODES.find(n => n.id === id)!;
              const conn = CONNECTIONS.find(c => (c.from === node.id && c.to === id) || (c.from === id && c.to === node.id));
              return (
                <button key={id} onClick={() => onNavigateTo(id)}
                  className="text-[10px] px-2 py-1 rounded-md transition-colors hover:opacity-80"
                  style={{ background: N_BORDER, color: N_TEXT, border: `1px solid ${N_BORDER}` }}>
                  {related.label}
                  {conn && <span className="ml-1 opacity-60" style={{ color: PROTOCOL_COLORS[conn.style ?? "HTTPS"] ?? N_MUTED }}>
                    {conn.label}
                  </span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Command Palette ───────────────────────────────────────────────────────────
function CommandPalette({ onSelect, onClose }: { onSelect: (id: NodeId) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    const q = query.toLowerCase();
    return NODES.filter(n => n.label.toLowerCase().includes(q) || n.sublabel.toLowerCase().includes(q) || n.type.includes(q));
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16"
      style={{ background: "rgba(0,0,0,0.8)" }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl"
        style={{ background: N_CARD, border: `1px solid ${N_BORDER}` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${N_BORDER}` }}>
          <span style={{ color: N_MUTED }}>⌘</span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Jump to any component..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: N_TEXT }} />
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: N_BORDER, color: N_MUTED }}>Esc</span>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {results.map(n => (
            <button key={n.id} onClick={() => { onSelect(n.id); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors">
              <span className="text-base">{NODE_ICONS[n.id]}</span>
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

// ── Main component ────────────────────────────────────────────────────────────
export default function NetflixArchPage() {
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null);
  const [studiedNodes, setStudiedNodes] = useState<Set<NodeId>>(new Set());
  const [activeFlow, setActiveFlow] = useState<Flow | null>(null);
  const [activeFlowStep, setActiveFlowStep] = useState(0);
  const [interviewMode, setInterviewMode] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<SVGSVGElement>(null);
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  // Load localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem("netflix-studied");
      if (s) setStudiedNodes(new Set(JSON.parse(s)));
      const z = localStorage.getItem("netflix-zoom");
      if (z) setZoom(parseFloat(z));
    } catch { /* ignore */ }
  }, []);

  // Persist
  useEffect(() => {
    try { localStorage.setItem("netflix-studied", JSON.stringify([...studiedNodes])); } catch { /* ignore */ }
  }, [studiedNodes]);

  useEffect(() => {
    try { localStorage.setItem("netflix-zoom", String(zoom)); } catch { /* ignore */ }
  }, [zoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(v => !v); return; }
      if (e.key === "Escape") { setCmdOpen(false); setSelectedNode(null); if (activeFlow) { setActiveFlow(null); setActiveFlowStep(0); } return; }
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

  const handleMarkStudied = useCallback((id: NodeId) => {
    setStudiedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleActivateFlow = useCallback((flow: Flow) => {
    setActiveFlow(prev => prev?.id === flow.id ? null : flow);
    setActiveFlowStep(0);
    setSelectedNode(flow.steps[0]?.nodeId ?? null);
  }, []);

  const handleFlowNext = useCallback(() => {
    if (!activeFlow) return;
    const next = Math.min(activeFlowStep + 1, activeFlow.steps.length - 1);
    setActiveFlowStep(next);
    setSelectedNode(activeFlow.steps[next].nodeId);
  }, [activeFlow, activeFlowStep]);

  const handleFlowPrev = useCallback(() => {
    if (!activeFlow) return;
    const prev = Math.max(activeFlowStep - 1, 0);
    setActiveFlowStep(prev);
    setSelectedNode(activeFlow.steps[prev].nodeId);
  }, [activeFlow, activeFlowStep]);

  const handleExitFlow = useCallback(() => {
    setActiveFlow(null);
    setActiveFlowStep(0);
  }, []);

  // Pan on canvas
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

  const flowNodeIds = activeFlow ? activeFlow.steps.slice(0, activeFlowStep + 1).map(s => s.nodeId) : [];
  const currentFlowNodeId = activeFlow?.steps[activeFlowStep]?.nodeId;

  const studiedCount = studiedNodes.size;
  const CANVAS_W = 1320;
  const CANVAS_H = 850;

  const selectedNodeData = selectedNode ? NODES.find(n => n.id === selectedNode) ?? null : null;

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh", background: N_BG, color: N_TEXT, fontFamily: "Inter, sans-serif" }}>
      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 flex items-center gap-3 px-4 h-12 shrink-0"
        style={{ background: "#0d0d0d", borderBottom: `1px solid ${N_BORDER}` }}>
        {/* Logo / title */}
        <span className="text-lg font-black tracking-tight" style={{ color: N_RED }}>N</span>
        <span className="text-sm font-semibold hidden sm:block" style={{ color: N_TEXT }}>Netflix System Design</span>
        <span className="text-xs px-1.5 py-0.5 rounded font-medium hidden sm:block"
          style={{ background: N_GREEN + "18", color: N_GREEN, border: `1px solid ${N_GREEN}30` }}>
          Senior Backend
        </span>

        <div className="flex-1" />

        {/* Progress */}
        <span className="text-[10px] hidden sm:block" style={{ color: N_MUTED }}>
          {studiedCount}/{NODES.length} studied
        </span>

        {/* Interview mode */}
        <button
          onClick={() => setInterviewMode(v => !v)}
          className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
          style={{
            background: interviewMode ? N_RED + "18" : "transparent",
            color: interviewMode ? N_RED : N_MUTED,
            border: `1px solid ${interviewMode ? N_RED + "40" : N_BORDER}`,
          }}>
          Interview Mode
        </button>

        {/* ⌘K */}
        <button onClick={() => setCmdOpen(true)}
          className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5"
          style={{ background: "transparent", border: `1px solid ${N_BORDER}`, color: N_MUTED }}>
          <span>⌘K</span>
        </button>

        {/* Zoom */}
        <div className="flex items-center gap-1 hidden sm:flex">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="w-6 h-6 rounded text-xs" style={{ background: N_BORDER, color: N_MUTED }}>−</button>
          <span className="text-[10px] w-8 text-center" style={{ color: N_MUTED }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="w-6 h-6 rounded text-xs" style={{ background: N_BORDER, color: N_MUTED }}>+</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="text-[10px] px-1.5 py-0.5 rounded ml-1" style={{ background: N_BORDER, color: N_MUTED }}>Fit</button>
        </div>
      </div>

      {/* ── Body: canvas + panel ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 48px - 56px)" }}>
        {/* Canvas */}
        <div className="flex-1 overflow-hidden relative" style={{ background: N_BG }}>
          {/* Layer tint bands */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Object.entries(LAYER_Y).map(([layer, y]) => (
              <div key={layer}
                className="absolute left-0 right-0"
                style={{
                  top: y * zoom + pan.y + 48,
                  height: NODE_H * zoom + 20,
                  background: parseInt(layer) % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                }} />
            ))}
          </div>

          <svg
            ref={canvasRef}
            width="100%" height="100%"
            style={{ cursor: isPanning.current ? "grabbing" : "grab", userSelect: "none" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              <LayerLabels />
              <ConnectionArrows
                activeNodeId={selectedNode ?? undefined}
                activeFlowNodeIds={flowNodeIds.length > 0 ? flowNodeIds : undefined}
              />
              {NODES.map(node => (
                <NodeCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNode === node.id}
                  flowStep={activeFlow ? flowNodeIds.indexOf(node.id) !== -1 ? flowNodeIds.indexOf(node.id) + 1 : undefined : undefined}
                  isFlowVisited={flowNodeIds.includes(node.id)}
                  onClick={() => {
                    setSelectedNode(node.id);
                    if (activeFlow) {
                      const stepIdx = activeFlow.steps.findIndex(s => s.nodeId === node.id);
                      if (stepIdx !== -1) setActiveFlowStep(stepIdx);
                    }
                  }}
                />
              ))}
            </g>
          </svg>

          {/* Canvas legend */}
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 pointer-events-none">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-[9px] capitalize" style={{ color: N_FAINT }}>{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="w-80 xl:w-96 shrink-0 flex flex-col" style={{ borderLeft: `1px solid ${N_BORDER}` }}>
          <DetailPanel
            node={selectedNodeData}
            studiedNodes={studiedNodes}
            onMarkStudied={handleMarkStudied}
            onNavigateTo={id => { setSelectedNode(id); handleExitFlow(); }}
            activeFlow={activeFlow}
            activeFlowStep={activeFlowStep}
            onFlowNext={handleFlowNext}
            onFlowPrev={handleFlowPrev}
            onExitFlow={handleExitFlow}
          />
        </div>
      </div>

      {/* ── Flows bar ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1.5 px-4 overflow-x-auto"
        style={{ height: 56, background: "#0d0d0d", borderTop: `1px solid ${N_BORDER}`, minWidth: 0 }}>
        <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap mr-1"
          style={{ color: N_FAINT }}>Flows</span>
        {FLOWS.map(flow => {
          const isActive = activeFlow?.id === flow.id;
          return (
            <button key={flow.id} onClick={() => handleActivateFlow(flow)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0"
              style={{
                background: isActive ? N_AMBER + "18" : "transparent",
                color: isActive ? N_AMBER : N_MUTED,
                border: `1px solid ${isActive ? N_AMBER + "50" : N_BORDER}`,
              }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? N_AMBER : N_FAINT }} />
              {flow.label}
              {isActive && <span className="text-[9px] opacity-60">{activeFlowStep + 1}/{flow.steps.length}</span>}
            </button>
          );
        })}
        <span className="text-[9px] ml-auto whitespace-nowrap hidden sm:block" style={{ color: N_FAINT }}>
          ← → navigate steps
        </span>
      </div>

      {/* Command Palette */}
      {cmdOpen && (
        <CommandPalette onSelect={id => setSelectedNode(id)} onClose={() => setCmdOpen(false)} />
      )}

      <style>{`
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${N_BG}; }
        ::-webkit-scrollbar-thumb { background: ${N_BORDER}; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: ${N_FAINT}; }
        @keyframes pulse-amber {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        svg g[role="button"]:focus { outline: none; }
        svg g[role="button"]:focus-visible rect:first-child { stroke: ${N_RED}; stroke-width: 2; }
      `}</style>
    </div>
  );
}
