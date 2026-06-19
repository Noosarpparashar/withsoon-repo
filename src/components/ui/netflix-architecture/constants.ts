export const C = {
  red:    "#e50914",
  amber:  "#f5a623",
  green:  "#22c55e",
  blue:   "#3b82f6",
  purple: "#8b5cf6",
  bg:     "#0a0a0a",
  card:   "#111111",
  card2:  "#161616",
  border: "#222222",
  border2:"#2a2a2a",
  muted:  "#666666",
  faint:  "#3a3a3a",
  text:   "#e5e5e5",
  text2:  "#aaaaaa",
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
