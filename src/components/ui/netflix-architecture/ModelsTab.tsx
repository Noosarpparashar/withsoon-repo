"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { MODEL_GROUPS, type ModelGroup, type EntityDef } from "./models-data";
import { C } from "./constants";

const STORE_COLORS: Record<string, string> = {
  "Aurora PostgreSQL": C.amber,
  "DynamoDB": "#818cf8",
  "Cassandra": "#38bdf8",
  "Redis": "#f87171",
  "Redis + DynamoDB": "#e879f9",
  "DynamoDB + Redis": "#e879f9",
};

// ─── EntityBox ────────────────────────────────────────────────────────────────

interface EntityBoxProps {
  entity: EntityDef;
  highlighted: boolean;
  onNavigateToEntity: (tableName: string) => void;
}

function EntityBox({ entity, highlighted, onNavigateToEntity }: EntityBoxProps) {
  const color = STORE_COLORS[entity.store === "Aurora" ? "Aurora PostgreSQL" : entity.store] ?? C.muted;

  return (
    <div
      className="rounded-lg overflow-hidden mb-3 transition-all duration-300"
      style={{
        border: highlighted
          ? `2px solid #f59e0b`
          : `1px solid ${C.border}`,
        boxShadow: highlighted ? `0 0 0 3px #f59e0b40` : undefined,
        animation: highlighted ? "pulseAmber 2s ease-out" : undefined,
      }}
    >
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ background: C.card2, borderBottom: `1px solid ${C.border}` }}
      >
        <span className="text-xs font-bold font-mono" style={{ color: C.text }}>
          {entity.name}
        </span>
        <span
          className="text-[9px] px-1.5 py-0.5 rounded"
          style={{ background: C.border, color: C.text2 }}
        >
          {entity.store}
        </span>
      </div>
      <div>
        {entity.fields.map((f, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-1.5"
            style={{
              borderBottom:
                i < entity.fields.length - 1
                  ? `1px solid ${C.border}22`
                  : undefined,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: f.pk
                  ? C.amber
                  : f.fk
                  ? "#818cf8"
                  : f.index
                  ? C.green
                  : C.faint,
              }}
            />
            <span
              className="text-[10px] font-mono flex-1"
              style={{ color: C.text }}
            >
              {f.name}
            </span>
            <span className="text-[9px] font-mono" style={{ color: "#6ee7b7" }}>
              {f.type}
            </span>
            {f.pk && (
              <span
                className="text-[8px] px-1 rounded"
                style={{ background: C.amber + "18", color: C.amber }}
              >
                PK
              </span>
            )}
            {f.fk ? (
              <button
                onClick={() => {
                  const tableName = f.fk!.split(".")[0];
                  onNavigateToEntity(tableName);
                }}
                className="text-[8px] px-1 rounded transition-opacity hover:opacity-80 cursor-pointer"
                style={{
                  background: "#818cf818",
                  color: "#818cf8",
                  border: `1px solid #818cf830`,
                }}
                title={`Navigate to ${f.fk}`}
              >
                FK → {f.fk}
              </button>
            ) : null}
            {f.index && !f.pk && (
              <span
                className="text-[8px] px-1 rounded"
                style={{ background: C.green + "18", color: C.green }}
              >
                IDX
              </span>
            )}
          </div>
        ))}
      </div>
      {entity.accessPatterns && entity.accessPatterns.length > 0 && (
        <div
          className="px-3 py-2"
          style={{
            borderTop: `1px solid ${C.border}22`,
            background: color + "05",
          }}
        >
          <p
            className="text-[8px] font-bold uppercase tracking-widest mb-1"
            style={{ color }}
          >
            Access Patterns
          </p>
          {entity.accessPatterns.map((ap, i) => (
            <p key={i} className="text-[9px]" style={{ color: C.muted }}>
              → {ap}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DDLViewer ────────────────────────────────────────────────────────────────

function DDLViewer({
  blocks,
  storeColor,
}: {
  blocks: { label: string; code: string }[];
  storeColor: string;
}) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex gap-1 mb-2 flex-wrap">
        {blocks.map((b, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className="text-[10px] px-2 py-1 rounded font-mono transition-colors"
            style={{
              background: active === i ? storeColor + "18" : "transparent",
              color: active === i ? storeColor : C.muted,
              border: `1px solid ${active === i ? storeColor + "40" : C.border}`,
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div
        className="rounded-lg p-3 overflow-x-auto"
        style={{ background: "#080808", border: `1px solid ${C.border}` }}
      >
        <pre
          className="text-[10px] leading-relaxed whitespace-pre"
          style={{ color: "#a8d8a8", fontFamily: C.mono }}
        >
          {blocks[active]?.code}
        </pre>
      </div>
    </div>
  );
}

// ─── GroupPanel ───────────────────────────────────────────────────────────────

interface GroupPanelProps {
  group: ModelGroup;
  isActive: boolean;
  storeColor: string;
  highlightedEntity: string | null;
  onNavigateToEntity: (tableName: string) => void;
  onScrollProgress: (pct: number) => void;
}

function GroupPanel({
  group,
  isActive,
  storeColor,
  highlightedEntity,
  onNavigateToEntity,
  onScrollProgress,
}: GroupPanelProps) {
  const [showDDL, setShowDDL] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    const pct = scrollable > 0 ? (el.scrollTop / scrollable) * 100 : 0;
    onScrollProgress(pct);
  }, [onScrollProgress]);

  // Reset scroll progress when the panel becomes active
  useEffect(() => {
    if (isActive) {
      onScrollProgress(0);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }
  }, [isActive, onScrollProgress]);

  const handleDownloadSQL = useCallback(() => {
    if (!group.ddl || group.ddl.length === 0) return;
    const content = group.ddl
      .map((block) => `-- ${block.label}\n${block.code}`)
      .join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${group.id}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [group]);

  if (!isActive) return null;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-5"
      onScroll={handleScroll}
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{
              background: storeColor + "18",
              color: storeColor,
              border: `1px solid ${storeColor}30`,
            }}
          >
            {group.store}
          </span>
        </div>
        <h2 className="text-lg font-bold" style={{ color: C.text }}>
          {group.label}
        </h2>
        <p
          className="text-xs mt-1 leading-relaxed"
          style={{ color: C.text2 }}
        >
          {group.rationale}
        </p>
      </div>

      {/* Entities */}
      <div>
        <p
          className="text-[9px] font-bold uppercase tracking-widest mb-2"
          style={{ color: C.faint }}
        >
          Schema
        </p>
        {group.entities.map((e, i) => (
          <EntityBox
            key={i}
            entity={e}
            highlighted={highlightedEntity === e.name}
            onNavigateToEntity={onNavigateToEntity}
          />
        ))}
      </div>

      {/* Anti-patterns */}
      {group.antiPatterns.length > 0 && (
        <div>
          <p
            className="text-[9px] font-bold uppercase tracking-widest mb-2"
            style={{ color: C.faint }}
          >
            Anti-Patterns to Avoid
          </p>
          <ul className="space-y-1.5">
            {group.antiPatterns.map((ap, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className="shrink-0 mt-0.5"
                  style={{ color: "#ef4444" }}
                >
                  ✗
                </span>
                <span
                  className="text-[10px] leading-relaxed"
                  style={{ color: C.text2 }}
                >
                  {ap}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interview tip */}
      <div
        className="rounded-lg p-3"
        style={{
          background: "rgba(245,166,35,0.06)",
          border: `1px solid ${C.amber}25`,
        }}
      >
        <p
          className="text-[9px] font-bold uppercase tracking-widest mb-1"
          style={{ color: C.amber }}
        >
          Interview Tip
        </p>
        <p
          className="text-[10px] leading-relaxed"
          style={{ color: C.muted }}
        >
          {group.interviewTip}
        </p>
      </div>

      {/* Scaling note */}
      {group.scalingNote && (
        <div
          className="rounded-lg p-3"
          style={{
            background: "rgba(56,189,248,0.05)",
            border: `1px solid #38bdf825`,
          }}
        >
          <p
            className="text-[9px] font-bold uppercase tracking-widest mb-1"
            style={{ color: "#38bdf8" }}
          >
            Scaling Note
          </p>
          <p
            className="text-[10px] leading-relaxed"
            style={{ color: C.muted }}
          >
            {group.scalingNote}
          </p>
        </div>
      )}

      {/* Storage cost */}
      {group.storageCost && (
        <div
          className="rounded-lg px-3 py-2 flex items-center justify-between"
          style={{ background: C.card2, border: `1px solid ${C.border}` }}
        >
          <span className="text-[10px]" style={{ color: C.muted }}>
            Storage estimate
          </span>
          <span
            className="text-[10px] font-mono font-medium"
            style={{ color: C.green }}
          >
            {group.storageCost}
          </span>
        </div>
      )}

      {/* DDL toggle + Download */}
      {group.ddl && group.ddl.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setShowDDL((v) => !v)}
              className="text-[10px] px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{
                background: showDDL ? storeColor + "18" : C.border,
                color: showDDL ? storeColor : C.text2,
              }}
            >
              {showDDL ? "Hide DDL" : "Show DDL / Schema"}
            </button>
            <button
              onClick={handleDownloadSQL}
              className="text-[10px] px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
              style={{
                background: C.card2,
                color: C.text2,
                border: `1px solid ${C.border}`,
              }}
              title={`Download ${group.id}.sql`}
            >
              ↓ Download
            </button>
          </div>
          {showDDL && (
            <DDLViewer blocks={group.ddl} storeColor={storeColor} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── ModelsTab ────────────────────────────────────────────────────────────────

export default function ModelsTab() {
  const [activeGroup, setActiveGroup] = useState(MODEL_GROUPS[0].id);
  const [scrollPct, setScrollPct] = useState(0);
  const [highlightedEntity, setHighlightedEntity] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNavigateToEntity = useCallback((tableName: string) => {
    // Find which group contains this table
    const allEntities = MODEL_GROUPS.flatMap((g) => g.entities);
    const targetEntity = allEntities.find((e) => e.name === tableName);
    if (!targetEntity) return;

    const targetGroup = MODEL_GROUPS.find((g) =>
      g.entities.some((e) => e.name === tableName)
    );
    if (!targetGroup) return;

    setActiveGroup(targetGroup.id);

    // Clear any existing highlight timer
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }

    setHighlightedEntity(tableName);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedEntity(null);
      highlightTimerRef.current = null;
    }, 2000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex h-full overflow-hidden" style={{ background: C.bg }}>
      {/* Sidebar */}
      <div
        className="w-52 shrink-0 overflow-y-auto"
        style={{ background: C.card, borderRight: `1px solid ${C.border}` }}
      >
        <div
          className="px-3 py-3"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <p
            className="text-[9px] font-bold uppercase tracking-widest"
            style={{ color: C.faint }}
          >
            Data Models
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>
            {MODEL_GROUPS.length} entity groups
          </p>
        </div>
        {MODEL_GROUPS.map((g) => {
          const color = STORE_COLORS[g.store] ?? C.muted;
          const isActive = g.id === activeGroup;
          return (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className="w-full text-left px-3 py-2.5 transition-colors"
              style={{
                background: isActive ? color + "10" : "transparent",
                borderLeft: `3px solid ${isActive ? color : "transparent"}`,
                borderBottom: `1px solid ${C.border}18`,
              }}
            >
              <p
                className="text-xs font-medium"
                style={{ color: isActive ? C.text : C.text2 }}
              >
                {g.label}
              </p>
              <p
                className="text-[9px] mt-0.5"
                style={{ color: isActive ? color : C.muted }}
              >
                {g.store}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Reading progress bar */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            height: 3,
            background: C.border,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${scrollPct}%`,
              background: C.red,
              transition: "width 0.1s linear",
            }}
          />
        </div>

        {/* Group panels */}
        {MODEL_GROUPS.map((g) => (
          <GroupPanel
            key={g.id}
            group={g}
            isActive={g.id === activeGroup}
            storeColor={STORE_COLORS[g.store] ?? C.muted}
            highlightedEntity={highlightedEntity}
            onNavigateToEntity={handleNavigateToEntity}
            onScrollProgress={setScrollPct}
          />
        ))}
      </div>
    </div>
  );
}
