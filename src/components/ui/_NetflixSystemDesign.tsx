"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { DETAILS, NODES, EDGES, LAYER_LABELS, VW, VH, NW, NH } from "./netflix-data";
import {
  PIPELINE_DETAILS, PIPELINE_NODES, PIPELINE_EDGES, PIPELINE_LAYER_LABELS,
  PIPELINE_VW, PIPELINE_VH, PIPELINE_INTERVIEW_QA,
} from "./netflix-pipeline-data";

type Mode = "system" | "pipeline";

function hexToRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

function nodeCx(n: { x:number; y:number }, side: "left"|"right"|"top"|"bottom", nw = NW, nh = NH) {
  if (side === "left")   return { x: n.x - nw/2, y: n.y };
  if (side === "right")  return { x: n.x + nw/2, y: n.y };
  if (side === "top")    return { x: n.x, y: n.y - nh/2 };
  return                        { x: n.x, y: n.y + nh/2 };
}

function edgePath(fromId: string, toId: string, nodes: typeof NODES): string {
  const f = nodes.find(n => n.id === fromId);
  const t = nodes.find(n => n.id === toId);
  if (!f || !t) return "";
  const dx = t.x - f.x, dy = t.y - f.y;
  if (Math.abs(dx) >= Math.abs(dy) * 0.55) {
    const fp = nodeCx(f, dx >= 0 ? "right" : "left");
    const tp = nodeCx(t, dx >= 0 ? "left"  : "right");
    const mx = (fp.x + tp.x) / 2;
    return `M ${fp.x} ${fp.y} C ${mx} ${fp.y} ${mx} ${tp.y} ${tp.x} ${tp.y}`;
  }
  const fp = nodeCx(f, dy >= 0 ? "bottom" : "top");
  const tp = nodeCx(t, dy >= 0 ? "top" : "bottom");
  const my = (fp.y + tp.y) / 2;
  return `M ${fp.x} ${fp.y} C ${fp.x} ${my} ${tp.x} ${my} ${tp.x} ${tp.y}`;
}

/* Larger node dimensions used in both system + pipeline diagrams */
const PNW = 148, PNH = 56; // pipeline node width/height (bigger than system NW/NH)

function Diagram({ isDark, activeId, onNodeClick, mode }: {
  isDark: boolean; activeId: string | null; onNodeClick: (id: string) => void; mode: Mode;
}) {
  const nodes  = mode === "system" ? NODES : PIPELINE_NODES;
  const edges  = mode === "system" ? EDGES : PIPELINE_EDGES;
  const layers = mode === "system" ? LAYER_LABELS : PIPELINE_LAYER_LABELS;
  const vw     = mode === "system" ? VW : PIPELINE_VW;
  const vh     = mode === "system" ? VH : PIPELINE_VH;
  const nw     = mode === "system" ? NW : PNW;
  const nh     = mode === "system" ? NH : PNH;

  const bg      = isDark ? "#06060b" : "#f1f5f9";
  const dotGrid = isDark ? "rgba(255,255,255,0.028)" : "rgba(0,0,0,0.05)";
  const textCol = isDark ? "#ffffff" : "#0f172a";
  const laneCol = isDark ? "rgba(255,255,255,0.022)" : "rgba(0,0,0,0.018)";
  const laneBdr = isDark ? "rgba(255,255,255,0.05)"  : "rgba(0,0,0,0.065)";
  const nodeBg  = isDark ? 0.14 : 0.17;
  const uniqC   = [...new Set(edges.map(e => e.color))];

  function nodeCxLocal(n: { x:number; y:number }, side: "left"|"right"|"top"|"bottom") {
    if (side === "left")   return { x: n.x - nw/2, y: n.y };
    if (side === "right")  return { x: n.x + nw/2, y: n.y };
    if (side === "top")    return { x: n.x, y: n.y - nh/2 };
    return                        { x: n.x, y: n.y + nh/2 };
  }

  function edgePathLocal(fromId: string, toId: string): string {
    const f = nodes.find(n => n.id === fromId);
    const t = nodes.find(n => n.id === toId);
    if (!f || !t) return "";
    const dx = t.x - f.x, dy = t.y - f.y;
    if (Math.abs(dx) >= Math.abs(dy) * 0.55) {
      const fp = nodeCxLocal(f, dx >= 0 ? "right" : "left");
      const tp = nodeCxLocal(t, dx >= 0 ? "left"  : "right");
      const mx = (fp.x + tp.x) / 2;
      return `M ${fp.x} ${fp.y} C ${mx} ${fp.y} ${mx} ${tp.y} ${tp.x} ${tp.y}`;
    }
    const fp = nodeCxLocal(f, dy >= 0 ? "bottom" : "top");
    const tp = nodeCxLocal(t, dy >= 0 ? "top" : "bottom");
    const my = (fp.y + tp.y) / 2;
    return `M ${fp.x} ${fp.y} C ${fp.x} ${my} ${tp.x} ${my} ${tp.x} ${tp.y}`;
  }

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full h-full" xmlns="http://www.w3.org/2000/svg"
      style={{ cursor: "default" }}>
      <defs>
        <pattern id="nf-grid" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={dotGrid} />
        </pattern>
        {uniqC.map(c => (
          <marker key={c} id={`nf-arr-${c.replace("#","")}`}
            markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
            <path d="M 0 0 L 7 3 L 0 6 Z" fill={c} opacity={isDark ? 0.85 : 0.7} />
          </marker>
        ))}
        {uniqC.map(c => (
          <filter key={c} id={`nf-glow-${c.replace("#","")}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={isDark ? "4" : "2.5"} result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        ))}
        <filter id="nf-nglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={isDark ? "7" : "3.5"} result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <rect width={vw} height={vh} fill={bg} />
      <rect width={vw} height={vh} fill="url(#nf-grid)" />

      {isDark && mode === "system" && <>
        <circle cx="570"  cy="390" r="280" fill="#e50914" opacity="0.02" />
        <circle cx="1320" cy="390" r="250" fill="#8b5cf6" opacity="0.022" />
      </>}
      {isDark && mode === "pipeline" && <>
        <circle cx="570"  cy="300" r="260" fill="#3b82f6" opacity="0.018" />
        <circle cx="1070" cy="400" r="230" fill="#a855f7" opacity="0.018" />
      </>}

      {layers.map(l => {
        const laneW = mode === "pipeline" ? 180 : 164;
        return (
          <g key={l.x}>
            <rect x={l.x - laneW/2} y={22} width={laneW} height={vh - 28} rx={14}
              fill={laneCol} stroke={laneBdr} strokeWidth={1} />
            <text x={l.x} y={15} fontSize={mode === "pipeline" ? 9 : 8.5} fontWeight="700" textAnchor="middle"
              fill={isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)"}
              fontFamily="system-ui,sans-serif" letterSpacing="0.09em"
              style={{ textTransform: "uppercase" }}>
              {l.label}
            </text>
          </g>
        );
      })}

      {edges.map((e, i) => {
        const d = edgePathLocal(e.from, e.to);
        if (!d) return null;
        const dur = e.dur ?? 2.5;
        const cid = e.color.replace("#","");
        const pid = `nf-p-${mode}-${i}`;
        const isActive = activeId === e.from || activeId === e.to;
        return (
          <g key={i} opacity={activeId && !isActive ? 0.12 : 1} style={{ transition: "opacity 0.2s" }}>
            <path d={d} fill="none" stroke={e.color} strokeWidth={isDark ? 5 : 4} strokeOpacity={isDark ? 0.06 : 0.08} />
            <path id={pid} d={d} fill="none" stroke={e.color}
              strokeWidth={isActive ? (isDark ? 2.5 : 2.2) : (isDark ? 1.7 : 1.4)}
              strokeOpacity={isDark ? 0.52 : 0.58}
              strokeDasharray="6 5"
              markerEnd={`url(#nf-arr-${cid})`}>
              <animate attributeName="stroke-dashoffset" from="110" to="0" dur={`${dur}s`} repeatCount="indefinite" />
            </path>
            <circle r={isDark ? 4 : 3.5} fill={e.color} filter={`url(#nf-glow-${cid})`}>
              <animateMotion dur={`${dur}s`} repeatCount="indefinite" rotate="auto">
                <mpath href={`#${pid}`} />
              </animateMotion>
            </circle>
            <circle r={isDark ? 2.5 : 2} fill={e.color} opacity="0.5">
              <animateMotion dur={`${dur}s`} begin={`${dur*0.5}s`} repeatCount="indefinite" rotate="auto">
                <mpath href={`#${pid}`} />
              </animateMotion>
            </circle>
          </g>
        );
      })}

      {nodes.map((n, ni) => {
        const { x, y, color, label, sub, icon, id } = n;
        const hw = nw/2, hh = nh/2;
        const hexA = Math.round(nodeBg * 255).toString(16).padStart(2,"0");
        const isActive = activeId === id;
        const dimmed  = !!activeId && !isActive;
        const labelFs = mode === "pipeline" ? 11.5 : 9.5;
        const subFs   = mode === "pipeline" ? 9.5  : 8;
        const iconFs  = mode === "pipeline" ? 17   : 15;
        const iconX   = x - hw + (mode === "pipeline" ? 23 : 20);
        const labelX  = x - hw + (mode === "pipeline" ? 42 : 36);
        return (
          <g key={id} style={{ cursor: "pointer", opacity: dimmed ? 0.25 : 1, transition: "opacity 0.2s" }}
            onClick={() => onNodeClick(id)}>
            <rect x={x-hw-7} y={y-hh-7} width={nw+14} height={nh+14} rx={15}
              fill="none" stroke={color} strokeWidth={isActive ? 2 : 1}>
              <animate attributeName="opacity" values="0;0.5;0" dur={`${2.4+ni*0.22}s`} repeatCount="indefinite" />
            </rect>
            {isActive && (
              <rect x={x-hw-3} y={y-hh-3} width={nw+6} height={nh+6} rx={12}
                fill="none" stroke={color} strokeWidth={2} opacity={0.8} />
            )}
            {isDark && (
              <rect x={x-hw} y={y-hh} width={nw} height={nh} rx={10}
                fill={color} opacity={isActive ? 0.13 : 0.06} filter="url(#nf-nglow)" />
            )}
            <rect x={x-hw} y={y-hh} width={nw} height={nh} rx={10}
              fill={`${color}${hexA}`} stroke={color}
              strokeWidth={isActive ? 2.5 : (isDark ? 1.9 : 1.5)}
              strokeOpacity={isDark ? 0.9 : 0.75} />
            <text x={iconX} y={y + (mode === "pipeline" ? 6 : 7)} fontSize={iconFs} textAnchor="middle" fontFamily="system-ui,sans-serif">{icon}</text>
            <text x={labelX} y={y - (mode === "pipeline" ? 7 : 5)} fontSize={labelFs} fontWeight="700" fill={isActive ? color : textCol} fontFamily="system-ui,sans-serif">{label}</text>
            <text x={labelX} y={y + (mode === "pipeline" ? 10 : 10)} fontSize={subFs} fill={color} opacity={isDark ? 0.9 : 0.8} fontFamily="system-ui,sans-serif">{sub}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SystemDetailPanel({ nodeId, isDark, onClose }: { nodeId: string; isDark: boolean; onClose: () => void }) {
  const d = DETAILS[nodeId];
  if (!d) return null;
  const rgb = hexToRgb(d.color);
  const panelBg = isDark ? "#09090f" : "var(--bg-card)";
  const codeBg  = isDark ? "rgba(255,255,255,0.04)" : "var(--bg-muted)";
  const codeBdr = isDark ? "rgba(255,255,255,0.07)" : "var(--border)";

  return (
    <div className="flex flex-col h-full" style={{ background: panelBg }}>
      <div className="shrink-0 px-4 pt-4 pb-3"
        style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "var(--border)"}` }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold mb-1.5"
              style={{ background: `rgba(${rgb},0.13)`, color: d.color }}>{d.category}</span>
            <h3 className="text-sm font-bold leading-tight" style={{ color: "var(--text)" }}>{d.title}</h3>
          </div>
          <button onClick={onClose} className="shrink-0 text-xs px-2 py-1 rounded-md mt-0.5"
            style={{ color: "var(--text-muted)", background: "var(--bg-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>✕</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ fontSize: 13 }}>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>{d.description}</p>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: d.color }}>Responsibilities</p>
          <ul className="space-y-1.5">
            {d.responsibilities.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5" style={{ color: "var(--text-muted)", fontSize: 13 }}>
                <span style={{ color: d.color, marginTop: 2, flexShrink: 0 }}>▸</span>{r}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: d.color }}>Tech Stack</p>
          <div className="flex flex-wrap gap-1.5">
            {d.tech.map(t => (
              <span key={t} className="text-[11px] px-2 py-0.5 rounded font-medium"
                style={{ background: `rgba(${rgb},0.1)`, color: d.color, border: `1px solid rgba(${rgb},0.22)` }}>{t}</span>
            ))}
          </div>
        </div>
        {d.apiRoutes && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: d.color }}>API Routes</p>
            <div className="space-y-1.5">
              {d.apiRoutes.map((r, i) => (
                <div key={i} className="rounded-md p-2.5" style={{ background: codeBg, border: `1px solid ${codeBdr}` }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: r.method === "GET" ? "rgba(16,185,129,0.15)" : r.method === "POST" ? "rgba(59,130,246,0.15)" : r.method === "DELETE" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                        color: r.method === "GET" ? "#10b981" : r.method === "POST" ? "#3b82f6" : r.method === "DELETE" ? "#ef4444" : "#f59e0b" }}>
                      {r.method}
                    </span>
                    <code className="text-[11px] font-mono" style={{ color: isDark ? "#e2e8f0" : "#1e293b" }}>{r.path}</code>
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {d.classes && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: d.color }}>Classes & Methods</p>
            <div className="space-y-2">
              {d.classes.map(cls => (
                <div key={cls.name} className="rounded-md p-2.5" style={{ background: codeBg, border: `1px solid ${codeBdr}` }}>
                  <p className="text-[12px] font-bold mb-2" style={{ color: d.color }}>{cls.name}</p>
                  {cls.fields && cls.fields.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>Fields</p>
                      {cls.fields.map((f, i) => (
                        <p key={i} className="text-[11px] font-mono mb-0.5 leading-relaxed"
                          style={{ color: isDark ? "rgba(196,181,253,0.85)" : "rgba(109,40,217,0.85)" }}>{f}</p>
                      ))}
                    </div>
                  )}
                  {cls.methods && cls.methods.length > 0 && (
                    <div>
                      {cls.fields && cls.fields.length > 0 && (
                        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>Methods</p>
                      )}
                      {cls.methods.map((m, i) => (
                        <p key={i} className="text-[11px] font-mono mb-0.5 leading-relaxed"
                          style={{ color: isDark ? "rgba(134,239,172,0.85)" : "rgba(5,122,85,0.85)" }}>{m}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {d.notes && (
          <div className="rounded-md p-3" style={{ background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.22)` }}>
            <p className="text-[11px] font-bold mb-1" style={{ color: d.color }}>💡 Key insight</p>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.7, fontSize: 13 }}>{d.notes}</p>
          </div>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}

function PipelineDetailPanel({ nodeId, isDark, onClose }: { nodeId: string; isDark: boolean; onClose: () => void }) {
  const d = PIPELINE_DETAILS[nodeId];
  if (!d) return null;
  const rgb = hexToRgb(d.color);
  const panelBg = isDark ? "#09090f" : "var(--bg-card)";
  const codeBg  = isDark ? "rgba(255,255,255,0.04)" : "var(--bg-muted)";
  const codeBdr = isDark ? "rgba(255,255,255,0.07)" : "var(--border)";

  return (
    <div className="flex flex-col h-full" style={{ background: panelBg }}>
      <div className="shrink-0 px-4 pt-4 pb-3"
        style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "var(--border)"}` }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold mb-1.5"
              style={{ background: `rgba(${rgb},0.13)`, color: d.color }}>{d.category}</span>
            <h3 className="text-sm font-bold leading-tight" style={{ color: "var(--text)" }}>{d.title}</h3>
          </div>
          <button onClick={onClose} className="shrink-0 text-xs px-2 py-1 rounded-md mt-0.5"
            style={{ color: "var(--text-muted)", background: "var(--bg-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ fontSize: 13 }}>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>{d.description}</p>

        {/* Role */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: d.color }}>Pipeline Role</p>
          <ul className="space-y-1.5">
            {d.role.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5" style={{ color: "var(--text-muted)", fontSize: 13 }}>
                <span style={{ color: d.color, marginTop: 2, flexShrink: 0 }}>▸</span>{r}
              </li>
            ))}
          </ul>
        </div>

        {/* Tables / Schemas */}
        {d.tables.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: d.color }}>Tables & Schemas</p>
            <div className="space-y-3">
              {d.tables.map(tbl => (
                <div key={tbl.name} className="rounded-md overflow-hidden" style={{ border: `1px solid ${codeBdr}` }}>
                  <div className="px-2.5 py-2" style={{ background: `rgba(${rgb},0.1)` }}>
                    <p className="text-[12px] font-bold" style={{ color: d.color }}>{tbl.name}</p>
                    {tbl.pk && <p className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>PK: {tbl.pk}</p>}
                    {tbl.partitionBy && <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>Partition: {tbl.partitionBy}</p>}
                  </div>
                  <div className="divide-y" style={{ borderColor: codeBdr }}>
                    {tbl.columns.map((col, ci) => (
                      <div key={ci} className="px-2.5 py-1.5 flex items-start gap-2" style={{ background: codeBg }}>
                        <code className="text-[11px] font-mono font-semibold shrink-0 w-36"
                          style={{ color: isDark ? "rgba(196,181,253,0.9)" : "rgba(109,40,217,0.9)" }}>{col.col}</code>
                        <span className="text-[10px] font-mono px-1 py-0.5 rounded shrink-0"
                          style={{ background: `rgba(${rgb},0.12)`, color: d.color }}>{col.type}</span>
                        {col.note && (
                          <span className="text-[11px] leading-relaxed" style={{ color: "var(--text-faint)" }}>{col.note}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {tbl.notes && (
                    <div className="px-2.5 py-1.5" style={{ background: `rgba(${rgb},0.05)`, borderTop: `1px solid ${codeBdr}` }}>
                      <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>💡 {tbl.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Flows */}
        {d.dataFlows && d.dataFlows.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: d.color }}>Data Flows</p>
            <div className="space-y-1">
              {d.dataFlows.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md" style={{ background: codeBg, border: `1px solid ${codeBdr}` }}>
                  <span className="text-[11px] font-bold w-5 shrink-0" style={{ color: f.direction === "in" ? "#10b981" : "#f59e0b" }}>
                    {f.direction === "in" ? "IN" : "OUT"}
                  </span>
                  <span className="text-[11px] flex-1" style={{ color: "var(--text-muted)" }}>{f.from_to}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0"
                    style={{ background: `rgba(${rgb},0.1)`, color: d.color }}>{f.format}</span>
                  <span className="text-[10px] shrink-0" style={{ color: "var(--text-faint)" }}>{f.freq}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tools */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: d.color }}>Tools & Tech</p>
          <div className="flex flex-wrap gap-1.5">
            {d.tools.map(t => (
              <span key={t} className="text-[11px] px-2 py-0.5 rounded font-medium"
                style={{ background: `rgba(${rgb},0.1)`, color: d.color, border: `1px solid rgba(${rgb},0.22)` }}>{t}</span>
            ))}
          </div>
        </div>

        {/* SLA */}
        {d.sla && (
          <div className="rounded-md p-2.5" style={{ background: `rgba(16,185,129,0.07)`, border: "1px solid rgba(16,185,129,0.2)" }}>
            <p className="text-[11px] font-bold mb-1" style={{ color: "#10b981" }}>⏱ SLA</p>
            <p className="text-[12px]" style={{ color: "var(--text-muted)", lineHeight: 1.65 }}>{d.sla}</p>
          </div>
        )}

        {/* Notes */}
        {d.notes && (
          <div className="rounded-md p-3" style={{ background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.22)` }}>
            <p className="text-[11px] font-bold mb-1" style={{ color: d.color }}>💡 Key insight</p>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.7, fontSize: 13 }}>{d.notes}</p>
          </div>
        )}

        {/* Interview Q&A */}
        <PipelineInterviewQA nodeId={nodeId} isDark={isDark} color={d.color} rgb={rgb} codeBdr={codeBdr} />

        <div className="h-4" />
      </div>
    </div>
  );
}

function PipelineInterviewQA({ nodeId, isDark, color, rgb, codeBdr }: {
  nodeId: string; isDark: boolean; color: string; rgb: string; codeBdr: string;
}) {
  const qas = PIPELINE_INTERVIEW_QA[nodeId];
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (!qas || qas.length === 0) return null;

  const diffColor = (d: string) => d === "hard" ? "#ef4444" : d === "medium" ? "#f97316" : "#10b981";
  const diffLabel = (d: string) => d === "hard" ? "Hard" : d === "medium" ? "Medium" : "Easy";

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>💬 Interview Q&A</p>
        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{ background: `rgba(${rgb},0.12)`, color, border: `1px solid rgba(${rgb},0.22)` }}>
          {qas.length} question{qas.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-2">
        {qas.map((qa, i) => {
          const dc = diffColor(qa.difficulty);
          const isOpen = openIdx === i;
          return (
            <div key={i} className="rounded-md overflow-hidden" style={{ border: `1px solid ${isOpen ? dc + "55" : codeBdr}`, transition: "border-color 0.2s" }}>
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full text-left flex items-start gap-2 px-3 py-2.5"
                style={{ background: isOpen ? (isDark ? `rgba(${hexToRgb(dc)},0.1)` : `rgba(${hexToRgb(dc)},0.06)`) : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"), cursor: "pointer", border: "none" }}>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                  style={{ background: dc + "22", color: dc, border: `1px solid ${dc}44` }}>
                  {diffLabel(qa.difficulty)}
                </span>
                <span className="text-[12px] font-medium flex-1 leading-snug" style={{ color: isDark ? "#e2e8f0" : "#1e293b" }}>
                  {qa.q}
                </span>
                <span className="shrink-0 text-[11px]" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)", marginTop: 2 }}>
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pt-2" style={{ borderTop: `1px solid ${codeBdr}`, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{qa.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModeToggle({ mode, onChange, isDark, size = "normal" }: {
  mode: Mode; onChange: (m: Mode) => void; isDark: boolean; size?: "small" | "normal";
}) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl"
      style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}>
      {(["system","pipeline"] as Mode[]).map(m => {
        const active = mode === m;
        const label  = size === "small"
          ? (m === "system" ? "🏗️ System" : "🔄 Pipeline")
          : (m === "system" ? "🏗️ System Design" : "🔄 Data Pipeline");
        const accent = m === "system" ? "#e50914" : "#3b82f6";
        return (
          <button key={m} onClick={e => { e.stopPropagation(); onChange(m); }}
            className="rounded-lg font-semibold transition-all duration-300"
            style={{
              padding: size === "small" ? "4px 10px" : "6px 12px",
              fontSize: size === "small" ? 11 : 12,
              cursor: "pointer",
              background: active ? (isDark ? `rgba(${hexToRgb(accent)},0.18)` : `rgba(${hexToRgb(accent)},0.12)`) : "transparent",
              color: active ? accent : (isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)"),
              border: active ? `1px solid rgba(${hexToRgb(accent)},0.35)` : "1px solid transparent",
              boxShadow: active && isDark ? `0 0 12px rgba(${hexToRgb(accent)},0.25)` : "none",
            }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function NetflixCard({ isDark, mode, onModeChange, onOpen }: {
  isDark: boolean; mode: Mode; onModeChange: (m: Mode) => void; onOpen: () => void;
}) {
  const previewBg = isDark ? "#04040a" : "#e8edf5";
  const cardBg    = isDark ? "#08080f" : "var(--bg-card)";
  const accentColor = mode === "system" ? "#e50914" : "#3b82f6";
  return (
    <div className="group w-full rounded-2xl overflow-hidden transition-all duration-300"
      style={{ background: cardBg, border: `1px solid ${isDark ? `rgba(${hexToRgb(accentColor)},0.22)` : "var(--border)"}`,
        boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.3s, transform 0.3s, border-color 0.4s" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = isDark ? `0 0 40px rgba(${hexToRgb(accentColor)},0.18),0 8px 32px rgba(0,0,0,0.7)` : `0 4px 24px rgba(${hexToRgb(accentColor)},0.13)`;
        el.style.transform = "translateY(-3px)"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = isDark ? "0 4px 24px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.06)";
        el.style.transform = "translateY(0)"; }}
    >
      <div className="h-1" style={{
        background: mode === "system"
          ? "linear-gradient(90deg,#e50914,#f97316,#8b5cf6,transparent)"
          : "linear-gradient(90deg,#3b82f6,#a855f7,#10b981,transparent)",
        transition: "background 0.4s ease",
      }} />

      {/* Clickable diagram preview */}
      <button onClick={onOpen} className="relative overflow-hidden w-full" style={{ background: previewBg, aspectRatio: "16/6.5", cursor: "pointer", border: "none", padding: 0 }}>
        <Diagram isDark={isDark} activeId={null} onNodeClick={() => {}} mode={mode} />
        <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, transparent, ${cardBg})` }} />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="px-5 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{ background: `rgba(${hexToRgb(accentColor)},0.88)`, backdropFilter: "blur(8px)" }}>
            Explore {mode === "system" ? "system design" : "data pipeline"} →
          </div>
        </div>
      </button>

      {/* Card footer */}
      <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Image src="/netflix-logo.webp" alt="Netflix" width={34} height={34}
            className="rounded-lg object-contain" style={{ background: "#000" }} />
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-sm" style={{ color: "var(--text)" }}>Netflix Architecture</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(229,9,20,0.1)", color: "#e50914" }}>Complete</span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {mode === "system" ? `${NODES.length} components · system design` : `${PIPELINE_NODES.length} nodes · data pipeline`} · click to explore
            </p>
          </div>
        </div>
        {/* Toggle visible directly on the card */}
        <ModeToggle mode={mode} onChange={onModeChange} isDark={isDark} size="small" />
      </div>
    </div>
  );
}

function FullModal({ isDark, initialMode, onModeChange, onClose }: {
  isDark: boolean; initialMode: Mode; onModeChange: (m: Mode) => void; onClose: () => void;
}) {
  const [panelIn, setPanelIn]   = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode]         = useState<Mode>(initialMode);
  const [switching, setSwitching] = useState(false);
  const modalBg = isDark ? "#07070d" : "var(--bg-card)";

  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setPanelIn(true))); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  function handleModeChange(m: Mode) {
    if (m === mode) return;
    setSwitching(true);
    setActiveId(null);
    setTimeout(() => {
      setMode(m);
      onModeChange(m);
      setSwitching(false);
    }, 320);
  }

  const accentColor = mode === "system" ? "#e50914" : "#3b82f6";
  const nodeCount   = mode === "system" ? NODES.length : PIPELINE_NODES.length;
  const edgeCount   = mode === "system" ? EDGES.length : PIPELINE_EDGES.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4"
      style={{ background: isDark ? "rgba(0,0,0,0.93)" : "rgba(15,23,42,0.8)",
        backdropFilter: "blur(14px)", opacity: panelIn ? 1 : 0, transition: "opacity 0.22s ease" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full flex flex-col rounded-2xl overflow-hidden"
        style={{ maxWidth: 1480, maxHeight: "96vh",
          background: modalBg,
          border: `1px solid ${isDark ? `rgba(${hexToRgb(accentColor)},0.22)` : "var(--border)"}`,
          boxShadow: isDark ? `0 0 100px rgba(${hexToRgb(accentColor)},0.1),0 40px 100px rgba(0,0,0,0.95)` : "0 40px 100px rgba(0,0,0,0.25)",
          transform: panelIn ? "scale(1) translateY(0)" : "scale(0.87) translateY(44px)",
          transition: "transform 0.46s cubic-bezier(0.34,1.5,0.64,1), border-color 0.4s, box-shadow 0.4s" }}
      >
        {/* Accent bar */}
        <div className="h-1 shrink-0" style={{
          background: mode === "system"
            ? "linear-gradient(90deg,#e50914,#f97316,#8b5cf6,transparent)"
            : "linear-gradient(90deg,#3b82f6,#a855f7,#10b981,transparent)",
          transition: "background 0.4s ease",
        }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0 flex-wrap gap-3"
          style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "var(--border)"}` }}>
          <div className="flex items-center gap-3">
            <Image src="/netflix-logo.webp" alt="Netflix" width={28} height={28}
              className="rounded-md object-contain" style={{ background: "#000" }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--text)" }}>
                Netflix — {mode === "system" ? "System Design" : "Data Pipeline Architecture"}
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {mode === "system"
                  ? "Click any component → full classes, API routes, methods, design decisions"
                  : "Click any node → tables, columns, data flows, SLAs"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ModeToggle mode={mode} onChange={handleModeChange} isDark={isDark} />
            <span className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1 rounded-full"
              style={{ background: `rgba(${hexToRgb(accentColor)},0.09)`, color: accentColor, border: `1px solid rgba(${hexToRgb(accentColor)},0.2)`, transition: "all 0.4s" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
              {nodeCount} nodes · {edgeCount} flows
            </span>
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ color: "var(--text-muted)", background: "var(--bg-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
              ✕ close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <div className="flex-1 overflow-auto" style={{ minWidth: 0 }}>
            <div style={{ minWidth: 760, opacity: switching ? 0 : 1, transform: switching ? "scale(0.97)" : "scale(1)", transition: "opacity 0.3s ease, transform 0.3s ease" }}>
              <Diagram isDark={isDark} activeId={activeId}
                onNodeClick={id => setActiveId(p => p === id ? null : id)}
                mode={mode} />
            </div>
          </div>

          {activeId && (
            <div className="shrink-0 overflow-hidden flex flex-col"
              style={{ width: 380, borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "var(--border)"}` }}>
              {mode === "system"
                ? <SystemDetailPanel nodeId={activeId} isDark={isDark} onClose={() => setActiveId(null)} />
                : <PipelineDetailPanel nodeId={activeId} isDark={isDark} onClose={() => setActiveId(null)} />
              }
            </div>
          )}
        </div>

        {!activeId && (
          <div className="shrink-0 px-5 py-2"
            style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "var(--border)"}` }}>
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>
              {mode === "system"
                ? "👆 Click any component for full class design, API routes, and architecture decisions"
                : "👆 Click any node for schemas, data flows, SLAs, and interview Q&A"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NetflixSystemDesign() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen]       = useState(false);
  const [mode, setMode]       = useState<Mode>("system");
  useEffect(() => { setMounted(true); }, []);
  const isDark = !mounted || resolvedTheme === "dark";
  return (
    <>
      <NetflixCard isDark={isDark} mode={mode} onModeChange={setMode} onOpen={() => setOpen(true)} />
      {open && <FullModal isDark={isDark} initialMode={mode} onModeChange={setMode} onClose={() => setOpen(false)} />}
    </>
  );
}
