"use client";

import { useState, useEffect } from "react";

export default function ReadingProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrollable = el.scrollHeight - el.clientHeight;
      setPct(scrollable > 0 ? (el.scrollTop / scrollable) * 100 : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 z-50 bg-[var(--border)]">
      <div
        className="h-full transition-[width] duration-100"
        style={{ width: `${pct}%`, background: "var(--accent)" }}
      />
    </div>
  );
}
