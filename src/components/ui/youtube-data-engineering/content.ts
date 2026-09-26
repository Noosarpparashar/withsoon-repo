export const REQUIREMENT_CAPABILITIES = [
  { icon: "⇣", title: "Ingestion", sub: "Every client + service", tone: "#1d4ed8", detail: "Ingest events from mobile, web, Smart TV, consoles, embedded players, edge systems, and backend services." },
  { icon: "▶", title: "Views", sub: "Versioned qualification", tone: "#b00020", detail: "Derive qualified views from validated playback progress, repeat behavior, consent, and abuse signals." },
  { icon: "◷", title: "Watch Time", sub: "Playback evidence", tone: "#6d28d9", detail: "Reconstruct played seconds and audience retention from heartbeats rather than relying on a single play event." },
  { icon: "↗", title: "Trending", sub: "Rising videos", tone: "#8a4b00", detail: "Rank rising videos from recent view velocity and engagement with fraud-aware, near-real-time windows." },
  { icon: "▥", title: "Creator Studio", sub: "Channel analytics", tone: "#0b6f87", detail: "Serve views, watch time, subscribers, revenue, retention curves, and traffic sources to creators." },
  { icon: "$", title: "Monetization", sub: "Ads + attribution", tone: "#077149", detail: "Attribute impressions, clicks, completes, RPM, CPM, and revenue to the correct video and channel." },
  { icon: "✦", title: "Recommendations", sub: "Online + offline", tone: "#8b5cf6", detail: "Publish fresh online features and point-in-time-correct historical features for training and evaluation." },
  { icon: "A/B", title: "Experiments", sub: "Reproducible metrics", tone: "#0f766e", detail: "Join assignments to outcomes and calculate versioned scorecards with statistically sound exposure rules." },
  { icon: "⚑", title: "Trust", sub: "Fraud + abuse", tone: "#b91c1c", detail: "Detect and discount bots, refresh spam, suspicious repeats, and other invalid traffic before certification." },
] as const;

export const YOUTUBE_SLOS = [
  { title: "Live Views", value: "10–60s", width: "18%", tone: "#b00020", detail: "Public and live counters need seconds-level freshness; these values remain provisional until reconciliation." },
  { title: "QoE Alerts", value: "<1 min", width: "22%", tone: "#1d4ed8", detail: "Playback failures, rebuffering, and startup-latency regressions need fast operational detection." },
  { title: "Trending", value: "1–5 min", width: "32%", tone: "#8a4b00", detail: "Trending uses recent view velocity and engagement with enough event-time buffering to absorb common lateness." },
  { title: "Creator Analytics", value: "min–hours", width: "58%", tone: "#0b6f87", detail: "Creator Studio can mix clearly labeled recent estimates with slower certified historical aggregates." },
  { title: "Official Views", value: "24–48h", width: "86%", tone: "#077149", detail: "Certified counts wait for completeness, deduplication, qualification policy, abuse filtering, and reconciliation." },
  { title: "Revenue", value: "T+1 / close", width: "100%", tone: "#6d28d9", detail: "Monetization outputs prioritize controlled evidence, approvals, auditability, and financial reconciliation." },
] as const;

export const YOUTUBE_SCALE_ANCHORS = [
  { value: "~2.5B", label: "MAU assumption", tone: "#1d4ed8", detail: "Use as an interview planning input, then convert to daily active viewers and viewing behavior instead of presenting it as internal YouTube data." },
  { value: "1B+", label: "watch hours/day", tone: "#6d28d9", detail: "Watch duration and heartbeat cadence drive the dominant playback-event rate and state volume." },
  { value: "Millions", label: "peak events/s", tone: "#b00020", detail: "Peak throughput must include heartbeat, impression, engagement, search, ad, QoE, and backend event families." },
  { value: "≥99.99%", label: "ingest target", tone: "#077149", detail: "Accepted playback and ad data must remain durable because event loss becomes lost metrics, training evidence, or revenue." },
] as const;
