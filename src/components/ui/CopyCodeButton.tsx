"use client";

import { useState, useEffect } from "react";

export default function CopyCodeButton() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const pres = document.querySelectorAll("pre");
    pres.forEach((pre, idx) => {
      if (pre.querySelector(".copy-btn")) return;
      pre.style.position = "relative";

      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.setAttribute("aria-label", "Copy code");
      btn.textContent = "Copy";
      btn.style.cssText = `
        position: absolute; top: 8px; right: 8px;
        font-size: 10px; font-weight: 600; padding: 3px 8px;
        border-radius: 5px; cursor: pointer; z-index: 10;
        background: var(--bg-card, #1a1a1a);
        color: var(--text-muted, #94a3b8);
        border: 1px solid var(--border, #2a2a2a);
        transition: all 0.15s;
        font-family: inherit;
      `;

      btn.addEventListener("click", () => {
        const code = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = "Copied!";
          btn.style.color = "var(--green-text, #065f46)";
          btn.style.borderColor = "var(--green, #059669)";
          setCopiedIndex(idx);
          setTimeout(() => {
            btn.textContent = "Copy";
            btn.style.color = "var(--text-muted, #94a3b8)";
            btn.style.borderColor = "var(--border, #2a2a2a)";
            setCopiedIndex(null);
          }, 1500);
        }).catch(() => {});
      });

      pre.appendChild(btn);
    });

    return () => {
      document.querySelectorAll(".copy-btn").forEach((btn) => btn.remove());
    };
  }, []);

  void copiedIndex;
  return null;
}
