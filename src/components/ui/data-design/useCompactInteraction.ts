"use client";

import { useSyncExternalStore } from "react";

const compactInteractionQuery = "(max-width: 768px), (pointer: coarse)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(compactInteractionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(compactInteractionQuery).matches;
}

export default function useCompactInteraction() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
