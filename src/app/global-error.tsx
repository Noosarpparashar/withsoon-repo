"use client";

import Link from "next/link";
import { useEffect } from "react";
import RecoveryState from "@/components/ui/data-design/RecoveryState";
import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
        <header className="border-b border-[var(--border)] bg-[var(--bg-card)]">
          <div className="mx-auto flex h-14 max-w-[1500px] items-center px-4 sm:px-7">
            <Link href="/" className="flex items-center gap-2" aria-label="withsoon home">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--text)] text-[var(--bg)]" aria-hidden>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></svg>
              </span>
              <span className="text-lg font-black tracking-[-.04em]">withsoon</span>
            </Link>
          </div>
        </header>
        <main>
          <RecoveryState
            testId="global-error-recovery"
            eyebrow="Application unavailable"
            title="We could not open the learning workspace"
            description="The application shell encountered a temporary problem. Retry the workspace, or return to a published data engineering track."
            action={
              <button
                type="button"
                onClick={unstable_retry}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--text)] px-5 text-sm font-semibold text-[var(--bg)] outline-none focus-visible:ring-2 focus-visible:ring-[#526b82]"
              >
                Retry workspace
              </button>
            }
          />
        </main>
      </body>
    </html>
  );
}
