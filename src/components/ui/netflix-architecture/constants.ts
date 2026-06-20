// Values are synced to globals.css dark mode variables so the Netflix shell
// matches the site's dark theme exactly.
export const C = {
  red:    "#e50914",
  amber:  "#f5a623",
  green:  "#22c55e",
  blue:   "#3b82f6",
  purple: "#8b5cf6",
  bg:     "#0d0d0d",   // --bg dark
  card:   "#161616",   // --bg-card dark
  card2:  "#1c1c1c",   // --bg-muted dark
  border: "#2a2a2a",   // --border dark
  border2:"#333333",
  muted:  "#94a3b8",   // --text-muted dark
  faint:  "#475569",   // --text-faint dark
  text:   "#f1f5f9",   // --text dark
  text2:  "#94a3b8",   // --text-muted dark
  mono:   "JetBrains Mono, 'Fira Code', monospace",
  sans:   "Inter, system-ui, sans-serif",
} as const;

export const TYPE_COLORS: Record<string, string> = {
  client:    "#38bdf8",
  gateway:   "#818cf8",
  service:   "#f59e0b",
  datastore: "#6ee7b7",
  pipeline:  "#e879f9",
};
