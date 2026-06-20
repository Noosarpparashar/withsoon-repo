export type TabSlug =
  | "start-here"
  | "requirements"
  | "architecture"
  | "playback"
  | "cdn"
  | "encoding"
  | "security"
  | "models"
  | "tradeoffs"
  | "capacity"
  | "failures"
  | "quiz"
  | "mock-interview"
  | "cheat-sheet"
  // legacy slugs kept for backward compatibility
  | "backend-track"
  | "data-engineering"
  | "architecture-map"
  | "apis-data-model"
  | "scale-estimation"
  | "failures-tradeoffs"
  | "interview-qa";

export type Role = "Backend Engineer" | "Data Engineer";
