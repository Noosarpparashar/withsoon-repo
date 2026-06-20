export const C = {
  red:    "#e50914",
  amber:  "#f5a623",
  green:  "#22c55e",
  blue:   "#3b82f6",
  purple: "#8b5cf6",
  bg:     "#111318",   // --bg dark
  card:   "#181b22",   // --bg-card dark
  card2:  "#20242d",   // --bg-muted dark
  border: "#343a46",   // --border dark
  border2:"#3e4452",
  muted:  "#cbd5e1",   // --text-muted dark
  faint:  "#94a3b8",   // --text-faint dark
  text:   "#f8fafc",   // --text dark
  text2:  "#e2e8f0",   // --text2 dark
  mono:   "JetBrains Mono, 'Fira Code', monospace",
  sans:   "Inter, system-ui, sans-serif",
} as const;

export const TYPE_COLORS: Record<string, string> = {
  client:    "#2563eb",
  gateway:   "#7c3aed",
  service:   "#d97706",
  datastore: "#0f766e",
  pipeline:  "#be185d",
};
