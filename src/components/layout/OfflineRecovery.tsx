"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

function subscribeToConnectivity(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

export default function OfflineRecovery() {
  const online = useSyncExternalStore(
    subscribeToConnectivity,
    getOnlineSnapshot,
    () => true,
  );
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  if (online || dismissed) return null;

  const retry = async () => {
    setChecking(true);
    setRetryFailed(false);
    try {
      const response = await fetch(`/?connectivity-check=${Date.now()}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error("Connectivity check failed");
      window.location.reload();
    } catch {
      setChecking(false);
      setRetryFailed(true);
    }
  };

  return (
    <aside
      data-testid="offline-recovery"
      aria-label="Offline connection status"
      className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-card)_96%,transparent)] p-4 shadow-[0_20px_60px_rgba(15,23,42,.18)] backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-muted)] text-[var(--text)]" aria-hidden>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 8.8A15.8 15.8 0 0 1 20.4 6M5 12.5a11 11 0 0 1 10.8-1.8M8.8 16a5.5 5.5 0 0 1 3.7-.9M3 3l18 18" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--text)]">You are offline</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            The open lesson remains available. Reconnect before opening another chapter.
          </p>
          {retryFailed ? (
            <p role="status" className="mt-2 text-xs font-medium text-[var(--text)]">
              Still offline. Check your connection and try again.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={retry}
              disabled={checking}
              className="min-h-9 rounded-lg bg-[var(--text)] px-3 text-xs font-semibold text-[var(--bg)] outline-none disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[#526b82]"
            >
              {checking ? "Checking…" : "Retry connection"}
            </button>
            <Link
              href="/"
              className="inline-flex min-h-9 items-center rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[#526b82]"
            >
              Design library
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss offline message and keep reading"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg text-[var(--text-muted)] outline-none hover:bg-[var(--bg-muted)] focus-visible:ring-2 focus-visible:ring-[#526b82]"
        >
          <span aria-hidden>&times;</span>
        </button>
      </div>
    </aside>
  );
}
