"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { InterviewAnswer, InterviewAnswerCodeBlock } from "@/lib/interviewAnswers";

type InterviewQuestion = {
  question: string;
  depth: 0 | 1;
};

type QuestionGroup = {
  main: string;
  followUps: string[];
};

function groupQuestions(questions: InterviewQuestion[]) {
  return questions.reduce<QuestionGroup[]>((groups, item) => {
    if (item.depth === 0 || groups.length === 0) {
      groups.push({ main: item.question, followUps: [] });
    } else {
      groups[groups.length - 1].followUps.push(item.question);
    }
    return groups;
  }, []);
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function AnswerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 9h8M8 13h5m8-1a9 9 0 1 1-4.2-7.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m17 3.5 2.2.4.4 2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AnswerCodeBlock({ block }: { block: InterviewAnswerCodeBlock }) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(block.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[#404040] bg-[#171717] shadow-[0_8px_22px_rgba(0,0,0,.10)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#404040] bg-[#262626] px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-[11px] font-black text-white">{block.title}</h3>
          <p className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-[.12em] text-[#a3a3a3]">{block.language}</p>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="shrink-0 rounded-md border border-[#525252] bg-[#171717] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[.1em] text-[#e5e5e5] transition hover:border-[#a3a3a3] hover:bg-[#303030] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label={`Copy ${block.title}`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[12px] leading-6 text-[#f5f5f5] [tab-size:2]">
        <code>{block.code}</code>
      </pre>
    </section>
  );
}

function AnswerView({ question, answer }: { question: string; answer: InterviewAnswer }) {
  return (
    <div>
      <div className="border-b border-[#d4d4d4] bg-[#171717] px-5 py-5 text-white sm:px-6">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-[#d4d4d4]">
          <AnswerIcon />
          Interview-ready answer
        </div>
        <h2 className="text-lg font-black leading-7 tracking-[-.025em] sm:text-xl">{question}</h2>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
        <p className="text-sm font-medium leading-6 text-[#303030]">{answer.summary}</p>

        {answer.codeBlocks?.map((block) => (
          <AnswerCodeBlock key={`${block.title}-${block.language}`} block={block} />
        ))}

        {answer.paragraphs?.map((paragraph) => (
          <p key={paragraph} className="text-sm leading-6 text-[#404040]">{paragraph}</p>
        ))}

        {answer.sections?.map((section) => (
          <section key={section.heading}>
            <h3 className="mb-2.5 text-[11px] font-black uppercase tracking-[.13em] text-[#525252]">{section.heading}</h3>
            {section.body ? <p className="text-sm leading-6 text-[#404040]">{section.body}</p> : null}
            {section.points ? (
              <ul className="space-y-2.5">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-3 text-[13px] leading-[1.55] text-[#404040]">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#525252]" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        {answer.diagrams?.map((diagram) => (
          <figure key={diagram.title} className="rounded-xl border border-[#d4d4d4] bg-[#fafafa] p-4 sm:p-5">
            <figcaption className="mb-4 text-[10px] font-black uppercase tracking-[.14em] text-[#404040]">
              {diagram.title}
            </figcaption>
            {diagram.relationships?.length ? (
              <div className="space-y-2">
                {diagram.relationships.map((relationship) => (
                  <div
                    key={`${diagram.title}-${relationship.from}-${relationship.to}-${relationship.label}`}
                    className="grid grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-[#d4d4d4] bg-white p-2.5 shadow-[0_3px_10px_rgba(0,0,0,.04)] sm:grid-cols-[minmax(150px,1fr)_minmax(150px,1.25fr)_40px_minmax(150px,1fr)] sm:px-3"
                  >
                    <div className="col-start-1 row-start-1 rounded-md bg-[#f5f5f5] px-3 py-2 text-center text-[11px] font-black text-[#171717]">
                      {relationship.from}
                    </div>
                    <div className="col-span-3 col-start-1 row-start-2 text-center text-[10px] font-semibold leading-4 text-[#525252] sm:col-span-1 sm:col-start-2 sm:row-start-1">
                      {relationship.label}
                    </div>
                    <div className="col-start-2 row-start-1 text-center text-base font-black text-[#737373] sm:col-start-3" aria-hidden="true">
                      {relationship.direction === "both" ? "↔" : "→"}
                    </div>
                    <div className="col-start-3 row-start-1 rounded-md bg-[#f5f5f5] px-3 py-2 text-center text-[11px] font-black text-[#171717] sm:col-start-4">
                      {relationship.to}
                    </div>
                  </div>
                ))}
              </div>
            ) : diagram.steps?.length ? (
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-1.5">
                {(diagram.steps ?? []).map((step, index) => (
                  <div key={`${diagram.title}-${step.label}`} className="contents">
                    <div className="min-w-0 flex-1 rounded-lg border border-[#d4d4d4] bg-white px-3 py-3 text-center shadow-[0_3px_10px_rgba(0,0,0,.04)]">
                      <div className="text-[11px] font-black text-[#171717]">{step.label}</div>
                      <div className="mt-1 text-[10px] leading-4 text-[#737373]">{step.detail}</div>
                    </div>
                    {index < (diagram.steps?.length ?? 0) - 1 ? (
                      <span className="self-center text-base font-black text-[#737373]" aria-hidden="true">
                        <span className="sm:hidden">↓</span>
                        <span className="hidden sm:inline">→</span>
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            {diagram.note ? <p className="mt-3 text-[10px] font-semibold leading-4 text-[#737373]">{diagram.note}</p> : null}
          </figure>
        ))}

        {answer.example ? (
          <section className="rounded-xl border border-[#d4d4d4] bg-[#f5f5f5] p-4">
            <h3 className="mb-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#404040]">Production example</h3>
            <p className="text-[13px] leading-[1.6] text-[#404040]">{answer.example}</p>
          </section>
        ) : null}

        {answer.takeaway ? (
          <section className="border-l-[3px] border-[#171717] pl-4">
            <h3 className="mb-1 text-[10px] font-black uppercase tracking-[.14em] text-[#737373]">Strong closing line</h3>
            <p className="text-[13px] font-bold leading-[1.6] text-[#262626]">{answer.takeaway}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default function InterviewTopicQuestions({
  title,
  questions,
  answers,
}: {
  title: string;
  questions: InterviewQuestion[];
  answers?: Record<string, InterviewAnswer>;
}) {
  const [query, setQuery] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState(() =>
    questions.find((item) => answers?.[item.question])?.question ?? "",
  );
  const [mobileAnswerOpen, setMobileAnswerOpen] = useState(false);
  const groupedQuestions = useMemo(() => groupQuestions(questions), [questions]);

  const filteredGroups = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase();
    if (!searchTerm) return groupedQuestions;

    return groupedQuestions.flatMap((group) => {
      if (group.main.toLocaleLowerCase().includes(searchTerm)) return [group];
      const matchingFollowUps = group.followUps.filter((question) =>
        question.toLocaleLowerCase().includes(searchTerm),
      );
      return matchingFollowUps.length > 0 ? [{ ...group, followUps: matchingFollowUps }] : [];
    });
  }, [groupedQuestions, query]);

  const selectedAnswer = answers?.[selectedQuestion];
  const hasAnswers = Boolean(answers && Object.keys(answers).length > 0);

  const activateAnswer = (question: string, openOnMobile = false) => {
    if (!answers?.[question]) return;
    setSelectedQuestion(question);
    if (openOnMobile) setMobileAnswerOpen(true);
  };

  return (
    <>
      <div className="overflow-clip rounded-2xl border border-[#d4d4d4] bg-[#f1f1f1] shadow-[0_18px_50px_rgba(0,0,0,.07)]">
        <div className="sticky top-[var(--site-nav-height)] z-30 border-b border-[#d4d4d4] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,.08)] sm:px-5 sm:py-5">
          <div className="flex items-center gap-3">
            <Link
              href="/#interview-question-bank"
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#d4d4d4] bg-[#fafafa] px-3 py-1.5 text-[11px] font-extrabold text-[#404040] transition hover:border-[#a3a3a3] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#525252]"
            >
              <span aria-hidden="true">←</span>
              Go back
            </Link>
            <h1 className="min-w-0 text-xl font-black tracking-[-.04em] text-[#171717] sm:text-3xl">
              {title} Interview Questions
            </h1>
          </div>
          <label className="relative mt-4 block">
            <span className="sr-only">Search within {title}</span>
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#525252]" aria-hidden="true"><SearchIcon /></span>
            <input
              type="text"
              role="searchbox"
              enterKeyHint="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${title}`}
              disabled={questions.length === 0}
              className="h-11 w-full rounded-xl border border-[#d4d4d4] bg-[#fafafa] pl-10 pr-10 text-xs font-medium text-[#171717] outline-none transition placeholder:text-[#737373] focus:border-[#525252] focus:bg-white focus:ring-2 focus:ring-[#d4d4d4] disabled:cursor-not-allowed disabled:bg-[#f1f1f1] disabled:text-[#737373]"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-sm font-bold text-[#525252] hover:bg-[#e5e5e5] hover:text-[#171717] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#525252]"
                aria-label="Clear question search"
              >
                ×
              </button>
            ) : null}
          </label>
          {hasAnswers ? (
            <p className="mt-3 flex items-center gap-2 text-[10px] font-bold text-[#525252]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#525252]" aria-hidden="true" />
              Hover or use keyboard focus to view an answer · Tap on mobile
            </p>
          ) : null}
        </div>

        <div className="p-3 sm:p-5">
          {questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#a3a3a3] bg-white px-6 py-14 text-center">
              <p className="text-sm font-extrabold text-[#262626]">Questions will be added here.</p>
            </div>
          ) : filteredGroups.length > 0 ? (
            <ol className="grid items-start gap-3" aria-label={`${title} questions`}>
              {filteredGroups.map((group, index) => {
                const mainIsActive = selectedQuestion === group.main;
                const mainHasAnswer = Boolean(answers?.[group.main]);

                return (
                  <li
                    key={`${group.main}-${index}`}
                    className={`overflow-hidden rounded-xl border bg-white shadow-[0_5px_16px_rgba(72,91,108,.05)] transition ${
                      mainIsActive ? "border-[#171717] ring-2 ring-[#d4d4d4]" : "border-[#d4d4d4]"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!mainHasAnswer}
                      onMouseEnter={() => activateAnswer(group.main)}
                      onFocus={() => activateAnswer(group.main)}
                      onClick={() => activateAnswer(group.main, true)}
                      className={`flex w-full gap-3 px-4 py-4 text-left sm:px-5 ${mainHasAnswer ? "cursor-pointer hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#171717]" : "cursor-default"}`}
                      aria-pressed={mainHasAnswer ? mainIsActive : undefined}
                    >
                      <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#171717] font-mono text-[9px] font-black text-white" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 pt-0.5 text-sm font-bold leading-6 text-[#262626]">{group.main}</span>
                      {mainHasAnswer ? <span className="mt-1 hidden self-start whitespace-nowrap rounded-md bg-[#f1f1f1] px-2 py-1 text-[8px] font-black uppercase tracking-[.1em] text-[#404040] sm:inline">Answer</span> : null}
                    </button>

                    {group.followUps.length > 0 ? (
                      <ul className="border-t border-[#e5e5e5] bg-[#fafafa] px-3 py-3 sm:px-4" aria-label="Follow-up questions">
                        {group.followUps.map((followUp) => {
                          const followUpIsActive = selectedQuestion === followUp;
                          const followUpHasAnswer = Boolean(answers?.[followUp]);

                          return (
                            <li key={followUp}>
                              <button
                                type="button"
                                disabled={!followUpHasAnswer}
                                onMouseEnter={() => activateAnswer(followUp)}
                                onFocus={() => activateAnswer(followUp)}
                                onClick={() => activateAnswer(followUp, true)}
                                className={`relative flex w-full gap-2.5 border-l-2 py-3 pl-4 pr-2 text-left text-[13px] leading-6 transition sm:text-sm before:absolute before:-left-[3px] before:top-[19px] before:h-1 before:w-1 before:rounded-full ${
                                  followUpIsActive
                                    ? "border-[#171717] bg-[#eeeeee] font-bold text-[#262626] before:bg-[#171717]"
                                    : `border-[#a3a3a3] text-[#525252] before:bg-[#737373] ${followUpHasAnswer ? "hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#171717]" : "cursor-default"}`
                                }`}
                                aria-pressed={followUpHasAnswer ? followUpIsActive : undefined}
                              >
                                <span className="mt-[2px] shrink-0 font-mono text-[9px] font-black uppercase tracking-[.1em] text-[#525252]">Follow-up</span>
                                <span>{followUp}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="rounded-xl border border-dashed border-[#a3a3a3] bg-white px-6 py-12 text-center">
              <p className="text-sm font-bold text-[#262626]">No questions match “{query}”.</p>
              <button type="button" onClick={() => setQuery("")} className="mt-3 text-xs font-bold text-[#525252] underline underline-offset-4 hover:text-[#171717]">Clear the search</button>
            </div>
          )}
        </div>
      </div>

      {selectedAnswer ? (
        <aside
          id="interview-answer-panel"
          className="sticky top-[calc(var(--site-nav-height)+1rem)] hidden max-h-[calc(100vh-var(--site-nav-height)-8rem)] self-start overflow-y-auto rounded-2xl border border-[#d4d4d4] bg-white shadow-[0_22px_60px_rgba(0,0,0,.10)] lg:block"
          aria-live="polite"
          aria-label={`Answer to ${selectedQuestion}`}
          tabIndex={0}
        >
          <AnswerView question={selectedQuestion} answer={selectedAnswer} />
        </aside>
      ) : (
        <div className="hidden lg:block" aria-hidden="true" data-answer-column />
      )}

      {mobileAnswerOpen && selectedAnswer ? (
        <div className="fixed inset-0 z-[70] flex items-end bg-[#171717]/45 p-2 backdrop-blur-[2px] lg:hidden" role="dialog" aria-modal="true" aria-label={`Answer to ${selectedQuestion}`}>
          <div className="max-h-[88dvh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl" tabIndex={0}>
            <div className="sticky top-0 z-10 flex justify-end bg-[#171717] px-3 pt-3">
              <button
                type="button"
                onClick={() => setMobileAnswerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl font-medium text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                aria-label="Close answer"
              >
                ×
              </button>
            </div>
            <div className="-mt-12">
              <AnswerView question={selectedQuestion} answer={selectedAnswer} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
