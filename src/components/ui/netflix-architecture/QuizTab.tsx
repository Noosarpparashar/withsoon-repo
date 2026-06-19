"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { FLASHCARDS, type FlashCard } from "./capacity-data";
import { C } from "./constants";

const ALL_TOPICS = Array.from(new Set(FLASHCARDS.map(f => f.topic)));

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

function FlipCard({ card, state, onKnow, onLearn }: {
  card: FlashCard;
  state: CardState;
  onKnow: () => void;
  onLearn: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  // Reset flip when card changes
  useEffect(() => { setFlipped(false); }, [card.id]);

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto">
      {/* Card */}
      <div
        className="w-full cursor-pointer select-none"
        style={{ perspective: 1000 }}
        onClick={() => setFlipped(v => !v)}>
        <div style={{
          position: "relative",
          width: "100%",
          height: 240,
          transformStyle: "preserve-3d",
          transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}>
          {/* Front */}
          <div style={{
            position: "absolute", inset: 0, backfaceVisibility: "hidden",
            borderRadius: 16, border: `2px solid ${card.topicColor}40`,
            background: C.card,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32,
          }}>
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mb-4"
              style={{ background: card.topicColor + "18", color: card.topicColor, border: `1px solid ${card.topicColor}30` }}>
              {card.topic}
            </span>
            <p className="text-center text-sm font-semibold leading-relaxed" style={{ color: C.text }}>{card.question}</p>
            <p className="text-[9px] mt-6" style={{ color: C.faint }}>Click to reveal answer</p>
          </div>

          {/* Back */}
          <div style={{
            position: "absolute", inset: 0, backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: 16, border: `2px solid ${card.topicColor}60`,
            background: `linear-gradient(135deg, ${C.card} 0%, ${card.topicColor}08 100%)`,
            display: "flex", flexDirection: "column", padding: 24, overflowY: "auto",
          }}>
            <p className="text-xs font-bold mb-3" style={{ color: card.topicColor }}>Answer</p>
            <p className="text-sm font-semibold leading-relaxed mb-3" style={{ color: C.text }}>{card.answer}</p>
            <div className="rounded-lg p-3 mt-auto" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: C.faint }}>Why it matters</p>
              <p className="text-[10px] leading-relaxed" style={{ color: C.muted }}>{card.explanation}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons — only visible when flipped */}
      <div className="flex gap-3 mt-5 w-full">
        <button
          onClick={onLearn}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{
            background: state === "learning" ? "#ef444418" : "transparent",
            color: state === "learning" ? "#ef4444" : C.muted,
            border: `2px solid ${state === "learning" ? "#ef4444" : C.border}`,
          }}>
          Still learning
        </button>
        <button
          onClick={onKnow}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{
            background: state === "known" ? C.green + "18" : "transparent",
            color: state === "known" ? C.green : C.muted,
            border: `2px solid ${state === "known" ? C.green : C.border}`,
          }}>
          Know it ✓
        </button>
      </div>
    </div>
  );
}

export default function QuizTab() {
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

  const knownCount = Object.values(cardStates).filter(s => s === "known").length;
  const learningCount = Object.values(cardStates).filter(s => s === "learning").length;

  return (
    <div className="flex h-full overflow-hidden" style={{ background: C.bg }}>
      {/* Topic sidebar */}
      <div className="w-44 shrink-0 overflow-y-auto hidden sm:block" style={{ background: C.card, borderRight: `1px solid ${C.border}` }}>
        <div className="px-3 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: C.faint }}>Topics</p>
          <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{FLASHCARDS.length} cards</p>
        </div>
        <div className="p-2 space-y-0.5">
          <button
            onClick={() => setActiveTopic(null)}
            className="w-full text-left px-2 py-2 rounded text-xs transition-colors"
            style={{ background: activeTopic === null ? C.red + "10" : "transparent", color: activeTopic === null ? C.red : C.text2 }}>
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
                  <span className="text-xs" style={{ color: activeTopic === t ? color : C.text2 }}>{t}</span>
                  <span className="text-[9px]" style={{ color: C.muted }}>{topicKnown}/{count}</span>
                </div>
                {topicKnown > 0 && (
                  <div className="mt-1 h-0.5 rounded-full" style={{ background: C.border }}>
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
        <div className="shrink-0 px-4 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${C.border}`, background: C.card }}>
          {/* Filter */}
          <div className="flex gap-1">
            {(["all", "learning", "known"] as const).map(m => (
              <button key={m} onClick={() => setFilterMode(m)}
                className="text-[10px] px-2 py-1 rounded capitalize transition-colors"
                style={{
                  background: filterMode === m ? C.amber + "18" : "transparent",
                  color: filterMode === m ? C.amber : C.muted,
                  border: `1px solid ${filterMode === m ? C.amber + "40" : C.border}`,
                }}>
                {m === "all" ? `All (${FLASHCARDS.length})` : m === "known" ? `Known (${knownCount})` : `Learning (${learningCount})`}
              </button>
            ))}
          </div>
          <div className="flex-1" />

          {/* Spaced repetition label */}
          <span className="text-[9px] hidden sm:block" style={{ color: C.faint }}>
            {shuffled ? "🔀 Shuffle" : "⬆ Spaced Rep"}
          </span>

          {/* Shuffle toggle */}
          <button onClick={handleToggleShuffle}
            className="text-[10px] px-2 py-1 rounded transition-colors"
            style={{
              background: shuffled ? "#818cf818" : "transparent",
              color: shuffled ? "#818cf8" : C.muted,
              border: `1px solid ${shuffled ? "#818cf840" : C.border}`,
            }}>
            Shuffle
          </button>

          {/* Card counter */}
          {filtered.length > 0 && (
            <span className="text-[10px]" style={{ color: C.muted }}>
              {cardIndex + 1} / {filtered.length}
            </span>
          )}
          {/* Progress bar */}
          {FLASHCARDS.length > 0 && (
            <div className="w-20 h-1.5 rounded-full" style={{ background: C.border }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${(knownCount / FLASHCARDS.length) * 100}%`, background: C.green }} />
            </div>
          )}
        </div>

        {/* Card area */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-8">
          {filtered.length === 0 ? (
            <div className="text-center">
              <p className="text-4xl mb-3" style={{ opacity: 0.3 }}>🎉</p>
              <p className="text-sm font-semibold mb-1" style={{ color: C.muted }}>
                {filterMode === "known" ? "No known cards yet" : "No cards in this filter"}
              </p>
              <button onClick={() => setFilterMode("all")} className="text-xs mt-2 underline" style={{ color: C.muted }}>
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
              />
              {/* Navigation */}
              <div className="flex gap-2 mt-4">
                <button onClick={goPrev} disabled={cardIndex === 0}
                  className="px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-30 transition-colors"
                  style={{ background: C.border, color: C.text }}>
                  ← Prev
                </button>
                <button onClick={goNext} disabled={cardIndex === filtered.length - 1}
                  className="px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-30 transition-colors"
                  style={{ background: C.border, color: C.text }}>
                  Next →
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
