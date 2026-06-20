export const CURRENT_NETFLIX_TAB_SLUGS = [
  "start-here",
  "requirements",
  "architecture",
  "playback",
  "cdn",
  "encoding",
  "security",
  "models",
  "tradeoffs",
  "capacity",
  "failures",
  "quiz",
  "mock-interview",
  "cheat-sheet",
] as const;

export type CurrentTabSlug = typeof CURRENT_NETFLIX_TAB_SLUGS[number];

export const LEGACY_NETFLIX_TAB_MAP = {
  "backend-track": "start-here",
  "data-engineering": "start-here",
  "architecture-map": "architecture",
  "apis-data-model": "models",
  "scale-estimation": "capacity",
  "failures-tradeoffs": "tradeoffs",
  "interview-qa": "mock-interview",
  scale: "capacity",
  services: "architecture",
  apis: "playback",
  "data-design": "models",
  "data-pipeline": "encoding",
  recommendations: "tradeoffs",
  "observability-cost": "tradeoffs",
} as const satisfies Record<string, CurrentTabSlug>;

export type LegacyTabSlug = keyof typeof LEGACY_NETFLIX_TAB_MAP;

export type TabSlug = CurrentTabSlug | LegacyTabSlug;

export function isCurrentTabSlug(value: string): value is CurrentTabSlug {
  return (CURRENT_NETFLIX_TAB_SLUGS as readonly string[]).includes(value);
}

export function normalizeNetflixTab(value?: string | null): CurrentTabSlug | null {
  if (!value) return null;
  if (isCurrentTabSlug(value)) return value;
  return LEGACY_NETFLIX_TAB_MAP[value as LegacyTabSlug] ?? null;
}

export type Role = "Backend Engineer" | "Data Engineer";
