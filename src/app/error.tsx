"use client";

import { useEffect } from "react";
import RecoveryState from "@/components/ui/data-design/RecoveryState";

export default function ErrorBoundary({
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
    <RecoveryState
      testId="error-recovery"
      eyebrow="Lesson unavailable"
      title="This lesson could not be loaded"
      description="A temporary rendering problem interrupted this chapter. Retry it now, or continue from another data engineering track."
      action={
        <button
          type="button"
          onClick={unstable_retry}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--text)] px-5 text-sm font-semibold text-[var(--bg)] outline-none focus-visible:ring-2 focus-visible:ring-[#526b82]"
        >
          Retry lesson
        </button>
      }
    />
  );
}
