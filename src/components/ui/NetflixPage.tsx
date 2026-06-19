"use client";

export default function NetflixPage({ initialTab }: { initialTab?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ color: "var(--text)", background: "var(--bg)" }}>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--text)" }}>Netflix System Design</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Coming soon.</p>
      </div>
    </div>
  );
}
