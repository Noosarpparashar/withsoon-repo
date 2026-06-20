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

interface ApiCardProps {
  method: string;
  path: string;
  description: string;
  children?: ReactNode;
}

export function ApiCard({ method, path, description, children }: ApiCardProps) {
  const methodColors: Record<string, string> = {
    GET: "text-emerald-400 bg-emerald-400/10",
    POST: "text-blue-400 bg-blue-400/10",
    PUT: "text-yellow-400 bg-yellow-400/10",
    PATCH: "text-orange-400 bg-orange-400/10",
    DELETE: "text-red-400 bg-red-400/10",
  };
  const cls = methodColors[method.toUpperCase()] ?? "text-slate-400 bg-slate-400/10";
  return (
    <div className="my-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-muted)]">
        <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${cls}`}>{method.toUpperCase()}</span>
        <code className="text-sm text-[var(--text)] font-mono">{path}</code>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-[var(--text-muted)]">{description}</p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}

interface TradeoffProps {
  optionA: string;
  optionB: string;
  winner?: "A" | "B" | "depends";
  children: ReactNode;
}

export function Tradeoff({ optionA, optionB, winner = "depends", children }: TradeoffProps) {
  return (
    <div className="my-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${winner === "A" ? "bg-[var(--green-soft)] text-[var(--green-text)]" : "bg-[var(--bg-muted)] text-[var(--text-faint)]"}`}>
          {optionA}
        </span>
        <span className="text-[var(--text-faint)] text-xs">vs</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${winner === "B" ? "bg-[var(--green-soft)] text-[var(--green-text)]" : "bg-[var(--bg-muted)] text-[var(--text-faint)]"}`}>
          {optionB}
        </span>
        {winner === "depends" && (
          <span className="ml-auto text-[10px] text-[var(--text-faint)] bg-[var(--bg-muted)] px-2 py-0.5 rounded">it depends</span>
        )}
      </div>
      <div className="px-4 py-3 text-sm text-[var(--text-muted)]">{children}</div>
    </div>
  );
}

interface FailureCardProps {
  symptom: string;
  impact: string;
  mitigation: string;
}

export function FailureCard({ symptom, impact, mitigation }: FailureCardProps) {
  return (
    <div className="my-4 rounded-xl border border-red-500/20 bg-red-500/5">
      <div className="px-4 py-3 border-b border-red-500/10">
        <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-0.5">Failure Scenario</p>
        <p className="text-sm font-semibold text-[var(--text)]">{symptom}</p>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div>
          <p className="text-[10px] font-bold uppercase text-[var(--text-faint)] mb-0.5">Impact</p>
          <p className="text-xs text-[var(--text-muted)]">{impact}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-[var(--text-faint)] mb-0.5">Mitigation</p>
          <p className="text-xs text-[var(--text-muted)]">{mitigation}</p>
        </div>
      </div>
    </div>
  );
}

