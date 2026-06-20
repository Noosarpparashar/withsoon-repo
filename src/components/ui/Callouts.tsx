import type { ReactNode } from "react";

interface CalloutProps {
  children: ReactNode;
}

const base = "my-5 rounded-xl px-5 py-4 border text-sm leading-relaxed";

export function InterviewTip({ children }: CalloutProps) {
  return (
    <div className={`${base} border-[var(--blue-text)]/30 bg-[var(--blue-soft)]`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--blue-text)] mb-1.5">Interview Tip</p>
      <div className="text-[var(--text-muted)]">{children}</div>
    </div>
  );
}

export function CommonMistake({ children }: CalloutProps) {
  return (
    <div className={`${base} border-red-500/30 bg-red-500/5`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1.5">Common Mistake</p>
      <div className="text-[var(--text-muted)]">{children}</div>
    </div>
  );
}

export function SeniorAnswer({ children }: CalloutProps) {
  return (
    <div className={`${base} border-[var(--purple-text)]/30 bg-[var(--purple-soft)]`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--purple-text)] mb-1.5">Senior Answer</p>
      <div className="text-[var(--text-muted)]">{children}</div>
    </div>
  );
}

export function ProductionNote({ children }: CalloutProps) {
  return (
    <div className={`${base} border-[var(--green-text)]/30 bg-[var(--green-soft)]`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--green-text)] mb-1.5">Production Note</p>
      <div className="text-[var(--text-muted)]">{children}</div>
    </div>
  );
}

export function Warning({ children }: CalloutProps) {
  return (
    <div className={`${base} border-[var(--orange-text)]/30 bg-[var(--orange-soft)]`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--orange-text)] mb-1.5">Warning</p>
      <div className="text-[var(--text-muted)]">{children}</div>
    </div>
  );
}

export function Definition({ children }: CalloutProps) {
  return (
    <div className={`${base} border-[var(--border)] bg-[var(--bg-muted)]`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] mb-1.5">Definition</p>
      <div className="text-[var(--text-muted)]">{children}</div>
    </div>
  );
}
