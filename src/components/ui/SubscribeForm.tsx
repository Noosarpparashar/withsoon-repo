"use client";

import { useState } from "react";

export default function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [honeypot, setHoneypot] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) return; // bot trap
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setStatus("error");
      return;
    }
    // UI-only — no backend yet. Show success optimistically.
    setStatus("success");
  }

  if (status === "success") {
    return (
      <div className={`${compact ? "py-3" : "py-4"} text-center`}>
        <p className="text-sm font-semibold text-[var(--accent-text)]">You're in!</p>
        <p className="text-xs text-[var(--text-faint)] mt-1">We'll notify you when new guides and Q&A land.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "" : "max-w-md mx-auto"}>
      {/* Honeypot — hidden from humans */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        aria-hidden="true"
        tabIndex={-1}
        style={{ display: "none" }}
      />
      <div className={`flex gap-2 ${compact ? "flex-col sm:flex-row" : "flex-col sm:flex-row"}`}>
        <label htmlFor="subscribe-email" className="sr-only">Email address</label>
        <input
          id="subscribe-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text)] placeholder-[var(--text-faint)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold text-sm transition-opacity whitespace-nowrap"
        >
          Subscribe
        </button>
      </div>
      {status === "error" && (
        <p className="text-xs text-red-400 mt-2">Please enter a valid email address.</p>
      )}
      <p className="text-xs text-[var(--text-faint)] mt-2 text-center">
        No spam. Unsubscribe any time.
      </p>
    </form>
  );
}
