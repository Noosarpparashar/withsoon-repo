"use client";

import { useEffect, useState } from "react";

const OVERLAY_BREAKPOINT = 1280;
const WINDOW_GAP_THRESHOLD = 140;

export default function DesktopMaximizeOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const syncVisibility = () => {
      if (document.fullscreenElement) {
        setVisible(false);
        return;
      }

      const isDesktopLike =
        window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
        window.matchMedia("(min-width: 1280px)").matches;

      if (!isDesktopLike) {
        setVisible(false);
        return;
      }

      const innerWidth = window.innerWidth;
      const outerWidth = window.outerWidth;
      const availableWidth = window.screen?.availWidth ?? outerWidth;
      const isReducedWindow = outerWidth < availableWidth - WINDOW_GAP_THRESHOLD;
      const isTooNarrow = innerWidth < OVERLAY_BREAKPOINT;

      setVisible(isReducedWindow || isTooNarrow);
    };

    syncVisibility();
    window.addEventListener("resize", syncVisibility);
    window.addEventListener("fullscreenchange", syncVisibility);
    window.visualViewport?.addEventListener("resize", syncVisibility);
    const syncInterval = window.setInterval(syncVisibility, 500);

    return () => {
      window.clearInterval(syncInterval);
      window.removeEventListener("resize", syncVisibility);
      window.removeEventListener("fullscreenchange", syncVisibility);
      window.visualViewport?.removeEventListener("resize", syncVisibility);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center px-6"
      style={{
        background: "rgba(5, 8, 18, 0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        className="w-full max-w-[520px] rounded-[30px] p-8 text-center shadow-2xl"
        style={{
          background: "color-mix(in srgb, var(--bg-card) 92%, #0f172a 8%)",
          border: "1px solid color-mix(in srgb, #38bdf8 24%, var(--border) 76%)",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.45)",
        }}
      >
        <div
          className="mx-auto flex items-center justify-center rounded-[22px] text-4xl"
          style={{
            width: 72,
            height: 72,
            background: "color-mix(in srgb, var(--bg-muted) 78%, #38bdf8 22%)",
            border: "1px solid color-mix(in srgb, #38bdf8 30%, var(--border) 70%)",
          }}
        >
          ⤢
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: "#38bdf8" }}>
          Desktop only
        </p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight" style={{ color: "var(--text)" }}>
          Best viewed in a maximized browser window
        </h2>
        <p className="mt-4 text-base leading-8" style={{ color: "var(--text-muted)" }}>
          For the cleanest layout, maximize the browser window before continuing. This experience is intentionally desktop-first.
        </p>
        <div
          className="mt-7 inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold"
          style={{
            background: "var(--bg-muted)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          Maximize the browser window to continue
        </div>
      </div>
    </div>
  );
}
