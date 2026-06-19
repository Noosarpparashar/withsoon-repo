import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "withsoon";
  const section = searchParams.get("section") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";

  const SECTION_COLORS: Record<string, string> = {
    "Big Data": "#2563eb",
    "AI & LLMs": "#7c3aed",
    "Interview": "#d97706",
    "Cheatsheets": "#db2777",
    "System Design": "#059669",
    "Tech News": "#ca8a04",
  };
  const sectionColor = SECTION_COLORS[section] ?? "#6d28d9";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          background: "#0d0d0d",
          padding: "48px 56px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Gradient accent line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${sectionColor}, #7c3aed)` }} />

        {/* Logo */}
        <div style={{ position: "absolute", top: 32, right: 48, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: "#7c3aed" }}>with</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9" }}>soon</span>
        </div>

        {/* Section badge */}
        {section && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 20, marginBottom: 20,
            background: `${sectionColor}20`, border: `1px solid ${sectionColor}50`,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: sectionColor }}>{section}</span>
            {difficulty && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginLeft: 8 }}>· {difficulty}</span>
            )}
          </div>
        )}

        {/* Title */}
        <div style={{
          fontSize: title.length > 60 ? 32 : title.length > 40 ? 38 : 46,
          fontWeight: 800,
          color: "#f1f5f9",
          lineHeight: 1.2,
          maxWidth: 900,
          marginBottom: 24,
        }}>
          {title}
        </div>

        {/* Footer line */}
        <div style={{ fontSize: 14, color: "#475569" }}>
          withsoon.com · System Design · Interview Prep · Big Data
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
