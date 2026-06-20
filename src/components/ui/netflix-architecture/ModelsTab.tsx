"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { copyTextToClipboard } from "../netflix-tabs/clipboard";
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
      className="rounded-xl overflow-hidden mb-4 transition-all duration-300"
      style={{
        border: highlighted
          ? `2px solid #f59e0b`
          : `1px solid var(--border)`,
        boxShadow: highlighted ? `0 0 0 3px #f59e0b40` : undefined,
        animation: highlighted ? "pulseAmber 2s ease-out" : undefined,
      }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: "var(--bg-muted)", borderBottom: `1px solid var(--border)` }}
      >
        <span className="text-sm font-bold font-mono" style={{ color: "var(--text)" }}>
          {entity.name}
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-md shrink-0"
          style={{ background: "var(--border)", color: "var(--text-muted)" }}
        >
          {entity.store}
        </span>
      </div>
      <div>
        <div
          className="grid items-center gap-3 px-4 py-2"
          style={{
            gridTemplateColumns: "minmax(0, 1fr) 96px 64px",
            background: "var(--bg)",
            borderBottom: `1px solid var(--border)`,
          }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: "var(--text-faint)" }}
          >
            Field
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-[0.18em] text-right"
            style={{ color: "var(--text-faint)" }}
          >
            Type
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-[0.18em] text-right"
            style={{ color: "var(--text-faint)" }}
          >
            Keys
          </span>
        </div>
        {entity.fields.map((f, i) => (
          <div
            key={i}
            className="grid items-start gap-3 px-4 py-3"
            style={{
              gridTemplateColumns: "minmax(0, 1fr) 96px 64px",
              borderBottom:
                i < entity.fields.length - 1
                  ? `1px solid var(--border)`
                  : undefined,
            }}
          >
            <div className="min-w-0 flex items-start gap-3">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                style={{
                  background: f.pk
                    ? C.amber
                    : f.fk
                    ? "#818cf8"
                    : f.index
                    ? C.green
                    : "var(--text-faint)",
                }}
              />
              <div className="min-w-0">
                <p
                  className="text-[12px] md:text-xs font-mono font-semibold break-words"
                  style={{ color: "var(--text)" }}
                >
                  {f.name}
                </p>
                {f.fk ? (
                  <button
                    onClick={() => {
                      const tableName = f.fk!.split(".")[0];
                      onNavigateToEntity(tableName);
                    }}
                    className="mt-1 inline-flex text-[10px] px-1.5 py-0.5 rounded transition-opacity hover:opacity-80 cursor-pointer"
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
              </div>
            </div>
            <div className="shrink-0 pt-0.5 text-right">
              <span
                className="text-[11px] font-mono font-medium"
                style={{ color: "#60a5fa" }}
              >
                {f.type}
              </span>
            </div>
            <div className="min-w-[48px] shrink-0 flex flex-wrap items-center justify-end gap-1 pt-0.5">
              {f.pk && (
                <span
                  className="text-[10px] px-1.5 rounded"
                  style={{ background: C.amber + "18", color: C.amber }}
                >
                  PK
                </span>
              )}
              {f.index && !f.pk && (
                <span
                  className="text-[10px] px-1.5 rounded"
                  style={{ background: C.green + "18", color: C.green }}
                >
                  IDX
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* DB rationale — why this store for this entity */}
      {entity.dbRationale && (
        <div
          className="px-3 py-2"
          style={{
            borderTop: `1px solid var(--border)`,
            background: color + "08",
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
            style={{ color }}
          >
            Why {entity.store}?
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {entity.dbRationale}
          </p>
        </div>
      )}
      {entity.accessPatterns && entity.accessPatterns.length > 0 && (
        <div
          className="px-3 py-2"
          style={{
            borderTop: `1px solid var(--border)`,
            background: color + "05",
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
            style={{ color }}
          >
            Access Patterns
          </p>
          {entity.accessPatterns.map((ap, i) => (
            <p key={i} className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
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
              color: active === i ? storeColor : "var(--text-muted)",
              border: `1px solid ${active === i ? storeColor + "40" : "var(--border)"}`,
              cursor: "pointer",
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div
        className="rounded-lg p-3 overflow-x-auto"
        style={{ background: "#080808", border: `1px solid var(--border)` }}
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
  const [ddlCopied, setDdlCopied] = useState(false);
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

  const handleCopySQL = useCallback(() => {
    if (!group.ddl || group.ddl.length === 0) return;
    const content = group.ddl
      .map((block) => `-- ${block.label}\n${block.code}`)
      .join("\n\n");
    copyTextToClipboard(content).then((copiedOk) => {
      if (!copiedOk) return;
      setDdlCopied(true);
      setTimeout(() => setDdlCopied(false), 2000);
    });
  }, [group]);

  if (!isActive) return null;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
      onScroll={handleScroll}
    >
      <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
              style={{
                background: storeColor + "18",
                color: storeColor,
                border: `1px solid ${storeColor}30`,
              }}
            >
              {group.store}
            </span>
          </div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {group.label}
          </h2>
          <p
            className="text-sm mt-2 leading-relaxed max-w-4xl"
            style={{ color: "var(--text-muted)" }}
          >
            {group.rationale}
          </p>
        </div>

        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--text-faint)" }}
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

        {group.antiPatterns.length > 0 && (
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-3"
              style={{ color: "var(--text-faint)" }}
            >
              Anti-Patterns to Avoid
            </p>
            <ul className="space-y-2">
              {group.antiPatterns.map((ap, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className="shrink-0 mt-0.5"
                    style={{ color: "#ef4444" }}
                  >
                    ✗
                  </span>
                  <span
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {ap}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(245,166,35,0.06)",
            border: `1px solid ${C.amber}25`,
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
            style={{ color: C.amber }}
          >
            Interview Tip
          </p>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            {group.interviewTip}
          </p>
        </div>

        {group.scalingNote && (
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(56,189,248,0.05)",
              border: `1px solid #38bdf825`,
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
              style={{ color: "#38bdf8" }}
            >
              Scaling Note
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              {group.scalingNote}
            </p>
          </div>
        )}

        {group.storageCost && (
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: "var(--bg-muted)", border: `1px solid var(--border)` }}
          >
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Storage estimate
            </span>
            <span
              className="text-xs font-mono font-medium"
              style={{ color: C.green }}
            >
              {group.storageCost}
            </span>
          </div>
        )}

        {group.ddl && group.ddl.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setShowDDL((v) => !v)}
                className="text-xs px-3 py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: showDDL ? storeColor + "18" : "var(--border)",
                  color: showDDL ? storeColor : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {showDDL ? "Hide DDL" : "Show DDL / Schema"}
              </button>
              <button
                onClick={handleCopySQL}
                className="text-xs px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                style={{
                  background: ddlCopied ? "#166534" : "var(--bg-muted)",
                  color: ddlCopied ? "#ffffff" : "var(--text-muted)",
                  border: `1px solid var(--border)`,
                  cursor: "pointer",
                }}
                title={`Copy ${group.id}.sql to clipboard`}
              >
                {ddlCopied ? "✓ Copied DDL" : "Copy DDL"}
              </button>
            </div>
            {showDDL && (
              <DDLViewer blocks={group.ddl} storeColor={storeColor} />
            )}
          </div>
        )}
      </div>
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
    <div className="flex h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <div
        className="w-64 xl:w-72 shrink-0 overflow-y-auto"
        style={{ background: "var(--bg-card)", borderRight: `1px solid var(--border)` }}
      >
        <div
          className="px-4 py-4"
          style={{ borderBottom: `1px solid var(--border)` }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--text-faint)" }}
          >
            Data Models
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
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
              className="w-full text-left px-4 py-3 transition-colors"
              style={{
                background: isActive ? color + "10" : "transparent",
                borderLeft: `3px solid ${isActive ? color : "transparent"}`,
                borderBottom: `1px solid var(--border)`,
                cursor: "pointer",
              }}
            >
              <p
                className="text-sm font-medium"
                style={{ color: isActive ? "var(--text)" : "var(--text-muted)" }}
              >
                {g.label}
              </p>
              <p
                className="text-[10px] mt-1"
                style={{ color: isActive ? color : "var(--text-muted)" }}
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
            background: "var(--border)",
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
