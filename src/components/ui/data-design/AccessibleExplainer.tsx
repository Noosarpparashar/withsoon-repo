"use client";

import {
  useCallback,
  useEffect,
  useId,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Alignment = "start" | "center" | "end";
type Side = "top" | "bottom";
type Position = { left: number; top: number };
type SavedAttribute = string | null;

const PIN_EVENT = "withsoon:explainer-pin";
let hoverSuppressedUntil = 0;

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join(" ");
  if (isValidElement<{ children?: ReactNode }>(node)) return textFromNode(node.props.children);
  return "";
}

function cleanLabel(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^\d{1,2}[.)]\s*/, "")
    .trim();
}

function isUsefulLabel(value: string): boolean {
  const genericBadges = /^(highest|high|medium|low|critical|optional|required|recommended)$/i;
  return value.length >= 3 && /[a-z]/i.test(value) && value.length <= 64 && !genericBadges.test(value);
}

function labelFromTrigger(trigger: HTMLElement): string {
  const candidates = [
    trigger.querySelector<HTMLElement>("[data-explainer-label]"),
    trigger.querySelector<HTMLElement>("h1, h2, h3, h4, h5, h6"),
    ...trigger.querySelectorAll<HTMLElement>("strong"),
    ...trigger.querySelectorAll<HTMLElement>("[class*='font-semibold'], [class*='font-bold']"),
    ...trigger.querySelectorAll<HTMLElement>("code"),
  ];

  for (const candidate of candidates) {
    if (!candidate || candidate.closest("[aria-hidden='true']")) continue;
    const value = cleanLabel(candidate.textContent ?? "");
    if (isUsefulLabel(value)) return value;
  }

  const line = (trigger.innerText || "")
    .split(/\r?\n/)
    .map(cleanLabel)
    .find(isUsefulLabel);

  return line ?? "this item";
}

function restoreAttribute(element: HTMLElement, name: string, value: SavedAttribute) {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

function splitExplanation(text: string): [string, string | null] {
  const sentences = text.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  if (sentences.length >= 2) {
    return [sentences.slice(0, -1).join(" "), sentences.at(-1) ?? null];
  }

  const clauseBreak = text.indexOf("; ");
  if (clauseBreak > 0) {
    return [text.slice(0, clauseBreak + 1), text.slice(clauseBreak + 2)];
  }

  return [text, null];
}

function PlainTextExplanation({ text, company }: { text: string; company?: string }) {
  const [description, example] = splitExplanation(text);

  return (
    <div data-testid="explainer-copy" className="max-w-[65ch]">
      <p>{description}</p>
      {example ? (
        <p className="mt-2">
          {company ? <strong>{company} example: </strong> : null}
          {example}
        </p>
      ) : null}
    </div>
  );
}

export default function AccessibleExplainer({
  children,
  align = "center",
  side = "top",
  label = "Explanation",
  company,
  triggerLabel,
}: {
  children: ReactNode;
  align?: Alignment;
  side?: Side;
  wide?: boolean;
  label?: string;
  company?: "Netflix" | "Uber" | "YouTube";
  triggerLabel?: string;
}) {
  const reactId = useId();
  const panelId = `explainer-${reactId.replaceAll(":", "")}`;
  const explanationText = textFromNode(children).replace(/\s+/g, " ").trim();
  const markerRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const originalAttributesRef = useRef<Record<string, SavedAttribute> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const suppressFocusPreviewRef = useRef(false);
  const [precisePointer, setPrecisePointer] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [accessibleTriggerName, setAccessibleTriggerName] = useState("Explanation");
  const [position, setPosition] = useState<Position>({ left: 12, top: 12 });
  const open = previewed || pinned;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || !precisePointer) return;

    const rect = trigger.getBoundingClientRect();
    const panelWidth = Math.min(400, window.innerWidth - 24);
    const measuredHeight = panelRef.current?.offsetHeight ?? 220;
    const panelHeight = Math.min(measuredHeight, window.innerHeight - 24);
    const gap = 10;

    let left = rect.left + (rect.width - panelWidth) / 2;
    if (align === "start") left = rect.left;
    if (align === "end") left = rect.right - panelWidth;
    left = Math.max(12, Math.min(left, window.innerWidth - panelWidth - 12));

    const roomAbove = rect.top - gap - 12;
    const roomBelow = window.innerHeight - rect.bottom - gap - 12;
    let placeAbove = side === "top";
    if (placeAbove && roomAbove < panelHeight && roomBelow > roomAbove) placeAbove = false;
    if (!placeAbove && roomBelow < panelHeight && roomAbove > roomBelow) placeAbove = true;

    const desiredTop = placeAbove
      ? rect.top - gap - panelHeight
      : rect.bottom + gap;
    const top = Math.max(12, Math.min(desiredTop, window.innerHeight - panelHeight - 12));
    setPosition({ left, top });
  }, [align, precisePointer, side]);

  const dismiss = useCallback((restoreFocus = false) => {
    setPreviewed(false);
    setPinned(false);
    if (restoreFocus) {
      hoverSuppressedUntil = Date.now() + 400;
      const trigger = triggerRef.current;
      suppressFocusPreviewRef.current = document.activeElement !== trigger;
      window.requestAnimationFrame(() => trigger?.focus());
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const syncPointer = () => setPrecisePointer(media.matches);
    const animationFrame = window.requestAnimationFrame(syncPointer);
    media.addEventListener("change", syncPointer);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      media.removeEventListener("change", syncPointer);
    };
  }, []);

  useEffect(() => {
    const marker = markerRef.current;
    const trigger = marker?.parentElement;
    if (!trigger) return;
    triggerRef.current = trigger;
    originalAttributesRef.current = {
      "aria-label": trigger.getAttribute("aria-label"),
      "aria-controls": trigger.getAttribute("aria-controls"),
      "aria-expanded": trigger.getAttribute("aria-expanded"),
      "aria-haspopup": trigger.getAttribute("aria-haspopup"),
      "aria-describedby": trigger.getAttribute("aria-describedby"),
      "data-explainer-trigger": trigger.getAttribute("data-explainer-trigger"),
    };
    const addedButtonType = trigger.tagName === "BUTTON" && !trigger.hasAttribute("type");
    if (addedButtonType) trigger.setAttribute("type", "button");

    const authoredName = trigger.getAttribute("aria-label")?.trim();
    const panelLabel = label === "Explanation" ? "" : label.replace(/\s+explanation$/i, "").trim();
    const subject = cleanLabel(triggerLabel || panelLabel || labelFromTrigger(trigger));
    const conciseName = authoredName || `Explain ${subject}`;
    trigger.setAttribute("aria-label", conciseName);
    setAccessibleTriggerName(conciseName.replace(/^Explain\s+/i, ""));

    trigger.setAttribute("aria-controls", panelId);
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("data-explainer-trigger", "");

    return () => {
      const original = originalAttributesRef.current;
      if (original) {
        Object.entries(original).forEach(([name, value]) => restoreAttribute(trigger, name, value));
      }
      if (addedButtonType) trigger.removeAttribute("type");
      originalAttributesRef.current = null;
      triggerRef.current = null;
    };
  }, [label, panelId, triggerLabel]);

  useEffect(() => {
    const trigger = triggerRef.current;
    const original = originalAttributesRef.current;
    if (!trigger || !original) return;

    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    const describedBy = [original["aria-describedby"], pinned ? panelId : null]
      .filter(Boolean)
      .join(" ");
    if (describedBy) trigger.setAttribute("aria-describedby", describedBy);
    else trigger.removeAttribute("aria-describedby");
  }, [open, panelId, pinned]);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const showPreview = () => {
      if (Date.now() < hoverSuppressedUntil) return;
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      setPreviewed(true);
    };
    const hidePreview = () => setPreviewed(false);
    const showFocusPreview = () => {
      if (suppressFocusPreviewRef.current) {
        suppressFocusPreviewRef.current = false;
        return;
      }
      setPreviewed(true);
    };
    const hideFocusPreview = (event: FocusEvent) => {
      if (panelRef.current?.contains(event.relatedTarget as Node | null)) return;
      setPreviewed(false);
    };
    const togglePin = () => {
      setPinned((current) => {
        const next = !current;
        if (next) window.dispatchEvent(new CustomEvent(PIN_EVENT, { detail: panelId }));
        return next;
      });
    };

    trigger.addEventListener("pointerenter", showPreview);
    trigger.addEventListener("pointerleave", hidePreview);
    trigger.addEventListener("focus", showFocusPreview);
    trigger.addEventListener("blur", hideFocusPreview);
    trigger.addEventListener("click", togglePin);
    const initialStateFrame = window.requestAnimationFrame(() => {
      if (trigger.matches(":focus")) showFocusPreview();
      else if (trigger.matches(":hover")) showPreview();
    });

    return () => {
      window.cancelAnimationFrame(initialStateFrame);
      trigger.removeEventListener("pointerenter", showPreview);
      trigger.removeEventListener("pointerleave", hidePreview);
      trigger.removeEventListener("focus", showFocusPreview);
      trigger.removeEventListener("blur", hideFocusPreview);
      trigger.removeEventListener("click", togglePin);
    };
  }, [panelId]);

  useEffect(() => {
    const closeOtherExplainers = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== panelId) dismiss();
    };
    window.addEventListener(PIN_EVENT, closeOtherExplainers);
    return () => window.removeEventListener(PIN_EVENT, closeOtherExplainers);
  }, [dismiss, panelId]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss(true);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!pinned) return;
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      dismiss();
    };
    const reposition = () => updatePosition();

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [dismiss, open, pinned, updatePosition]);

  useLayoutEffect(() => {
    if (!open || !precisePointer) return;
    updatePosition();
    const animationFrame = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [open, precisePointer, updatePosition]);

  const panel = open ? (
    <div
      ref={panelRef}
      id={panelId}
      role={pinned ? "dialog" : "tooltip"}
      aria-label={pinned ? `${accessibleTriggerName} explanation` : explanationText || undefined}
      data-testid="explainer-panel"
      data-pinned={pinned ? "true" : "false"}
      className={
        precisePointer
          ? "fixed z-[120] w-[min(25rem,calc(100vw-24px))] max-w-[65ch] max-h-[calc(100vh-24px)] overflow-y-auto rounded-xl border border-[#9aabba] bg-white px-4 py-3 text-left text-xs font-normal leading-5 text-[#17202b] shadow-[0_16px_42px_rgba(23,32,43,.22)]"
          : "fixed inset-x-3 bottom-3 z-[120] max-h-[min(70vh,32rem)] overflow-y-auto rounded-2xl border border-[#9aabba] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-left text-sm leading-6 text-[#17202b] shadow-[0_-12px_44px_rgba(23,32,43,.22)]"
      }
      style={precisePointer ? position : undefined}
    >
      <div className="mb-2 flex items-center justify-between gap-4 border-b border-[#d6e1eb] pb-2">
        <strong className="text-[10px] uppercase tracking-[.16em] text-[#59697a]">{label}</strong>
        {pinned ? (
          <button
            type="button"
            aria-label="Close explanation"
            data-testid="explainer-close"
            className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#c8d4df] bg-[#f4f7fb] px-2 text-lg leading-none text-[#17202b] outline-none hover:bg-[#e7eef5] focus-visible:ring-2 focus-visible:ring-[#526b82]"
            onClick={() => dismiss(true)}
          >
            ×
          </button>
        ) : (
          <span className="text-[10px] text-[#59697a]">Click to keep open</span>
        )}
      </div>
      {typeof children === "string" ? <PlainTextExplanation text={children} company={company} /> : children}
    </div>
  ) : null;

  return (
    <>
      <span ref={markerRef} className="hidden" aria-hidden="true" />
      {panel && typeof document !== "undefined" ? createPortal(panel, document.body) : null}
    </>
  );
}
