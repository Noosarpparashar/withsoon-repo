"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { FLASHCARDS, type FlashCard } from "./capacity-data";
import { C } from "./constants";
import type { TabSlug } from "../netflix-tabs/types";

const ALL_TOPICS = Array.from(new Set(FLASHCARDS.map(f => f.topic)));

const TOPIC_REVIEW: Record<string, { label: string; tab: TabSlug }> = {
  "Auth":            { label: "Playback", tab: "playback" },
  "Streaming":       { label: "Playback", tab: "playback" },
  "CDN":             { label: "CDN", tab: "cdn" },
  "DRM":             { label: "Playback", tab: "playback" },
  "Recommendations": { label: "Data Models", tab: "models" },
  "Watch History":   { label: "Data Models", tab: "models" },
  "Kafka":           { label: "Architecture", tab: "architecture" },
  "DynamoDB":        { label: "Data Models", tab: "models" },
  "Cassandra":       { label: "Data Models", tab: "models" },
  "Redis":           { label: "Architecture", tab: "architecture" },
  "Capacity":        { label: "Capacity", tab: "capacity" },
  "CAP Theorem":     { label: "Trade-offs", tab: "tradeoffs" },
  "Failures":        { label: "Failures", tab: "failures" },
};

type CardState = "known" | "learning" | "unset";

// Simple spaced repetition: cards due soonest sort first.
// "learning" cards appear more frequently than "known" cards.
function spaceSort(cards: FlashCard[], states: Record<string, CardState>): FlashCard[] {
  return [...cards].sort((a, b) => {
    const sa = states[a.id] ?? "unset";
    const sb = states[b.id] ?? "unset";
    const order: Record<CardState, number> = { unset: 0, learning: 1, known: 2 };
    return order[sa] - order[sb];
  });
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function FlipCard({ card, state, onKnow, onLearn, onNavigateTab }: {
  card: FlashCard;
  state: CardState;
  onKnow: () => void;
  onLearn: () => void;
  onNavigateTab?: (tab: TabSlug) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const reviewTarget = TOPIC_REVIEW[card.topic];

  // Reset when card changes
  useEffect(() => { setRevealed(false); }, [card.id]);

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto">
      {/* Question card — always shown */}
      <div className="w-full rounded-2xl p-7 mb-3 flex flex-col items-center text-center"
        style={{
          background: "var(--bg-card)",
          border: `2px solid ${revealed ? card.topicColor + "60" : card.topicColor + "30"}`,
        }}>
        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mb-4"
          style={{ background: card.topicColor + "18", color: card.topicColor, border: `1px solid ${card.topicColor}30` }}>
          {card.topic}
        </span>
        <p className="text-sm font-semibold leading-relaxed" style={{ color: "var(--text)" }}>{card.question}</p>
      </div>

      {/* Reveal CTA — shown before reveal */}
      {!revealed && (
        <button
          onClick={() => setRevealed(true)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRevealed(true); } }}
          className="w-full py-3 rounded-xl text-sm font-bold mb-3 transition-all hover:opacity-90"
          style={{ background: card.topicColor, color: "#fff" }}
          aria-label="Reveal answer">
          Reveal answer
        </button>
      )}

      {/* Answer — shown after reveal */}
      {revealed && (
        <>
          <div className="w-full rounded-2xl p-5 mb-3"
            style={{
              background: `linear-gradient(135deg, var(--bg-card) 0%, ${card.topicColor}08 100%)`,
              border: `2px solid ${card.topicColor}50`,
            }}>
            <p className="text-xs font-bold mb-2" style={{ color: card.topicColor }}>Correct answer</p>
            <p className="text-sm font-semibold leading-relaxed mb-4" style={{ color: "var(--text)" }}>{card.answer}</p>
            <div className="rounded-lg p-3 mb-3" style={{ background: "var(--bg)", border: `1px solid var(--border)` }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-faint)" }}>Why this is correct</p>
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{card.explanation}</p>
            </div>
            {reviewTarget && (
              <div className="rounded-lg p-2.5 flex items-center justify-between gap-3 flex-wrap" style={{ background: card.topicColor + "10", border: `1px solid ${card.topicColor}25` }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] shrink-0" style={{ color: card.topicColor }}>→</span>
                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Review <strong style={{ color: "var(--text)" }}>{reviewTarget.label}</strong> tab to go deeper
                  </p>
                </div>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab(reviewTarget.tab)}
                    className="text-[10px] px-2.5 py-1 rounded-lg font-semibold shrink-0"
                    style={{
                      background: "var(--bg-card)",
                      color: card.topicColor,
                      border: `1px solid ${card.topicColor}40`,
                      cursor: "pointer",
                    }}
                  >
                    Open {reviewTarget.label} →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Still learning / Know it — only after reveal */}
          <div className="flex gap-3 w-full">
            <button
              onClick={onLearn}
              aria-pressed={state === "learning"}
              aria-label="Mark as still learning"
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{
                background: state === "learning" ? "#ef444418" : "transparent",
                color: state === "learning" ? "#ef4444" : "var(--text-muted)",
                border: `2px solid ${state === "learning" ? "#ef4444" : "var(--border)"}`,
              }}>
              Still learning
            </button>
            <button
              onClick={onKnow}
              aria-pressed={state === "known"}
              aria-label="Mark as known"
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{
                background: state === "known" ? "#22c55e18" : "transparent",
                color: state === "known" ? "#22c55e" : "var(--text-muted)",
                border: `2px solid ${state === "known" ? "#22c55e" : "var(--border)"}`,
              }}>
              Know it ✓
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function QuizTab({ onNavigateTab }: { onNavigateTab?: (tab: TabSlug) => void }) {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [filterMode, setFilterMode] = useState<"all" | "learning" | "known">("all");
  const [shuffled, setShuffled] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState<string[]>([]);

  const baseFiltered = useMemo(() => {
    let cards = activeTopic ? FLASHCARDS.filter(f => f.topic === activeTopic) : FLASHCARDS;
    if (filterMode === "learning") cards = cards.filter(f => !cardStates[f.id] || cardStates[f.id] === "learning");
    if (filterMode === "known") cards = cards.filter(f => cardStates[f.id] === "known");
    // Spaced repetition: unset → learning → known
    return spaceSort(cards, cardStates);
  }, [activeTopic, filterMode, cardStates]);

  const filtered = useMemo(() => {
    if (!shuffled || shuffleOrder.length === 0) return baseFiltered;
    const idMap = Object.fromEntries(baseFiltered.map(c => [c.id, c]));
    return shuffleOrder.map(id => idMap[id]).filter(Boolean) as FlashCard[];
  }, [baseFiltered, shuffled, shuffleOrder]);

  const handleToggleShuffle = useCallback(() => {
    if (!shuffled) {
      setShuffleOrder(shuffle(baseFiltered).map(c => c.id));
    }
    setShuffled(v => !v);
    setCardIndex(0);
  }, [shuffled, baseFiltered]);

  const currentCard = filtered[cardIndex] ?? null;
  const currentState: CardState = currentCard ? (cardStates[currentCard.id] ?? "unset") : "unset";

  const setCardState = useCallback((id: string, state: CardState) => {
    setCardStates(prev => ({ ...prev, [id]: state }));
  }, []);

  const goNext = useCallback(() => {
    setCardIndex(i => Math.min(i + 1, filtered.length - 1));
  }, [filtered.length]);

  const goPrev = useCallback(() => {
    setCardIndex(i => Math.max(i - 1, 0));
  }, []);

  const handleKnow = useCallback(() => {
    if (!currentCard) return;
    setCardState(currentCard.id, "known");
    setTimeout(goNext, 300);
  }, [currentCard, setCardState, goNext]);

  const handleLearn = useCallback(() => {
    if (!currentCard) return;
    setCardState(currentCard.id, "learning");
    setTimeout(goNext, 300);
  }, [currentCard, setCardState, goNext]);

  // Reset card index when filter changes
  useEffect(() => { setCardIndex(0); }, [activeTopic, filterMode]);

  // Keyboard navigation: arrow keys move between cards
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  const knownCount = Object.values(cardStates).filter(s => s === "known").length;
  const learningCount = Object.values(cardStates).filter(s => s === "learning").length;

  return (
    <div role="region" aria-label="Flashcard quiz" className="flex h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Topic sidebar */}
      <div className="w-44 shrink-0 overflow-y-auto hidden sm:block" style={{ background: "var(--bg-card)", borderRight: `1px solid var(--border)` }}>
        <div className="px-3 py-3" style={{ borderBottom: `1px solid var(--border)` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Topics</p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{FLASHCARDS.length} cards</p>
        </div>
        <div className="p-2 space-y-0.5">
          <button
            onClick={() => setActiveTopic(null)}
            className="w-full text-left px-2 py-2 rounded text-xs transition-colors"
            style={{ background: activeTopic === null ? C.red + "10" : "transparent", color: activeTopic === null ? C.red : "var(--text-muted)" }}>
            All Topics
          </button>
          {ALL_TOPICS.map(t => {
            const count = FLASHCARDS.filter(f => f.topic === t).length;
            const topicKnown = FLASHCARDS.filter(f => f.topic === t && cardStates[f.id] === "known").length;
            const color = FLASHCARDS.find(f => f.topic === t)?.topicColor ?? C.muted;
            return (
              <button key={t} onClick={() => setActiveTopic(t)}
                className="w-full text-left px-2 py-2 rounded transition-colors"
                style={{ background: activeTopic === t ? color + "10" : "transparent" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: activeTopic === t ? color : "var(--text-muted)" }}>{t}</span>
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{topicKnown}/{count}</span>
                </div>
                {topicKnown > 0 && (
                  <div className="mt-1 h-0.5 rounded-full" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(topicKnown / count) * 100}%`, background: color }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="shrink-0 px-4 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid var(--border)`, background: "var(--bg-card)" }}>
          {/* Filter */}
          <div className="flex gap-1" role="group" aria-label="Filter cards by status">
            {(["all", "learning", "known"] as const).map(m => (
              <button key={m} onClick={() => setFilterMode(m)}
                aria-pressed={filterMode === m}
                className="text-[10px] px-2 py-1 rounded capitalize transition-colors"
                style={{
                  background: filterMode === m ? C.amber + "18" : "transparent",
                  color: filterMode === m ? C.amber : "var(--text-muted)",
                  border: `1px solid ${filterMode === m ? C.amber + "40" : "var(--border)"}`,
                }}>
                {m === "all" ? `All (${FLASHCARDS.length})` : m === "known" ? `Known (${knownCount})` : `Learning (${learningCount})`}
              </button>
            ))}
          </div>
          <div className="flex-1" />

          {/* Spaced repetition label */}
          <span className="text-[9px] hidden sm:block" style={{ color: "var(--text-faint)" }}>
            {shuffled ? "🔀 Shuffle" : "⬆ Spaced Rep"}
          </span>

          {/* Shuffle toggle */}
          <button onClick={handleToggleShuffle}
            aria-pressed={shuffled}
            aria-label={shuffled ? "Disable shuffle, switch to spaced repetition order" : "Enable shuffle mode"}
            className="text-[10px] px-2 py-1 rounded transition-colors"
            style={{
              background: shuffled ? "#818cf818" : "transparent",
              color: shuffled ? "#818cf8" : "var(--text-muted)",
              border: `1px solid ${shuffled ? "#818cf840" : "var(--border)"}`,
            }}>
            Shuffle
          </button>

          {/* Card counter */}
          {filtered.length > 0 && (
            <span
              aria-live="polite"
              aria-atomic="true"
              aria-label={`Card ${cardIndex + 1} of ${filtered.length}`}
              className="text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              {cardIndex + 1} / {filtered.length}
            </span>
          )}
          {/* Progress bar */}
          {FLASHCARDS.length > 0 && (
            <div className="w-20 h-1.5 rounded-full" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${(knownCount / FLASHCARDS.length) * 100}%`, background: C.green }} />
            </div>
          )}
        </div>

        {/* Card area */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-8 pb-20 sm:pb-8">
          {filtered.length === 0 ? (
            <div className="text-center">
              <p className="text-4xl mb-3" style={{ opacity: 0.3 }}>🎉</p>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                {filterMode === "known" ? "No known cards yet" : "No cards in this filter"}
              </p>
              <button onClick={() => setFilterMode("all")} className="text-xs mt-2 underline" style={{ color: "var(--text-muted)" }}>
                Show all cards
              </button>
            </div>
          ) : currentCard ? (
            <>
              <FlipCard
                card={currentCard}
                state={currentState}
                onKnow={handleKnow}
                onLearn={handleLearn}
                onNavigateTab={onNavigateTab}
              />
              {/* Navigation — desktop */}
              <div className="hidden sm:flex gap-2 mt-4">
                <button onClick={goPrev} disabled={cardIndex === 0}
                  aria-label="Go to previous card"
                  className="px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-30 transition-colors"
                  style={{ background: "var(--border)", color: "var(--text)" }}>
                  ← Prev
                </button>
                <button onClick={goNext} disabled={cardIndex === filtered.length - 1}
                  aria-label="Go to next card"
                  className="px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-30 transition-colors"
                  style={{ background: "var(--border)", color: "var(--text)" }}>
                  Next →
                </button>
              </div>
              <p className="text-[10px] text-center mt-2 hidden sm:block" style={{ color: "var(--text-faint)" }}>
                Tip: use ← → arrow keys to navigate cards
              </p>
            </>
          ) : null}
        </div>

        {/* Sticky bottom nav — mobile only */}
        {currentCard && filtered.length > 0 && (
          <div className="sm:hidden shrink-0 flex gap-3 px-4 py-3" style={{ background: "var(--bg-card)", borderTop: `1px solid var(--border)` }}>
            <button onClick={goPrev} disabled={cardIndex === 0}
              aria-label="Go to previous card"
              className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-30 transition-colors"
              style={{ background: "var(--bg-muted)", color: "var(--text-muted)", border: `1px solid var(--border)` }}>
              ← Prev
            </button>
            <span className="flex items-center text-xs font-medium" style={{ color: "var(--text-faint)", minWidth: 36, textAlign: "center" }}>
              {cardIndex + 1}/{filtered.length}
            </span>
            <button onClick={goNext} disabled={cardIndex === filtered.length - 1}
              aria-label="Go to next card"
              className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-30 transition-colors"
              style={{ background: "var(--bg-muted)", color: "var(--text-muted)", border: `1px solid var(--border)` }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
