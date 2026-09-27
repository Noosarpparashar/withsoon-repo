"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DISMISSED_KEY = "uber-interaction-tutorial-dismissed-v2";
const ANNOUNCED_KEY = "uber-interaction-tutorial-announced-v2";

export default function UberInteractionTutorial() {
  const [open, setOpen] = useState(false);
  const [touchInput, setTouchInput] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "true");
      window.sessionStorage.setItem(ANNOUNCED_KEY, "true");
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, []);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 1279px)");
    let animationFrame = 0;

    const offerTutorial = () => {
      if (!mobile.matches) return;

      let dismissed = false;
      let announced = false;
      try {
        dismissed = window.localStorage.getItem(DISMISSED_KEY) === "true";
        announced = window.sessionStorage.getItem(ANNOUNCED_KEY) === "true";
      } catch {
        // Show the tutorial once for this mounted page when storage is blocked.
      }
      if (dismissed || announced) return;

      try {
        window.sessionStorage.setItem(ANNOUNCED_KEY, "true");
      } catch {}

      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        setTouchInput(
          window.matchMedia("(hover: none), (pointer: coarse)").matches,
        );
        setOpen(true);
      });
    };

    offerTutorial();
    mobile.addEventListener("change", offerTutorial);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      mobile.removeEventListener("change", offerTutorial);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const animationFrame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus({ preventScroll: true });
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dismiss, open]);

  if (!open) return null;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 pt-3 xl:hidden">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="uber-tutorial-title"
        aria-describedby="uber-tutorial-description"
        data-testid="uber-interaction-tutorial"
        tabIndex={-1}
        className="relative rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 pr-12 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
      >
        <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">
          Quick guide
        </p>
        <h2 id="uber-tutorial-title" className="mt-1 text-sm font-semibold text-[var(--text)]">
          Card explanations
        </h2>
        <p id="uber-tutorial-description" className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          {touchInput
            ? "Tap a card marked with an information icon to open its explanation. Use Close or tap the card again when you are done."
            : "Point to a card for a quick preview, or click it to keep the explanation open while you read."}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close card explanations tutorial"
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] text-base text-[var(--text-muted)] outline-none hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[#111111]"
        >
          <span aria-hidden>&times;</span>
        </button>
      </div>
    </div>
  );
}
