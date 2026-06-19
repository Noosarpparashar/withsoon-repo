"use client";

import { useState } from "react";
import { SayThisBlock } from "./shared";
import type { TabSlug } from "./types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      className="text-[11px] px-2.5 py-1 rounded font-medium transition-colors shrink-0"
      style={{ background: copied ? "#22c55e" : "var(--bg-card)", color: copied ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function JsonBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <CopyButton text={code} />
      </div>
      <pre className="rounded-lg p-4 text-xs overflow-x-auto leading-relaxed" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#10b981", fontFamily: "monospace", margin: 0 }}>
        {code}
      </pre>
    </div>
  );
}

const API_GROUPS = [
  {
    group: "Auth",
    color: "#3b82f6",
    apis: [
      {
        method: "POST", path: "/v1/auth/login",
        purpose: "Authenticate user and issue JWT + refresh token",
        latency: "<200ms P99", consistency: "Strong", authRequired: false, cacheable: false, idempotent: false,
        request: `{
  "email": "user@example.com",
  "password": "••••••••",
  "deviceId": "d456",
  "deviceType": "mobile"
}`,
        response: `{
  "accessToken": "eyJhbGci...",
  "refreshToken": "rt_xxx",
  "expiresIn": 900,
  "profilesUrl": "/v1/profiles"
}`,
        notes: "Access token TTL = 15 min. Refresh token TTL = 30 days. Device-bound. Rate-limited: 5 attempts/min per IP.",
      },
      {
        method: "POST", path: "/v1/auth/refresh",
        purpose: "Exchange refresh token for new access token",
        latency: "<100ms P99", consistency: "Strong", authRequired: false, cacheable: false, idempotent: true,
        request: `{ "refreshToken": "rt_xxx" }`,
        response: `{ "accessToken": "eyJhbGci...", "expiresIn": 900 }`,
        notes: "Old refresh token is rotated on use. Redis revocation list checked first.",
      },
    ],
  },
  {
    group: "Profiles",
    color: "#8b5cf6",
    apis: [
      {
        method: "GET", path: "/v1/profiles",
        purpose: "List all profiles for the authenticated account",
        latency: "<200ms P99", consistency: "Eventual", authRequired: true, cacheable: true, idempotent: true,
        request: "(none — uses JWT account context)",
        response: `{
  "profiles": [
    { "profileId": "p1", "name": "Alice", "avatarUrl": "...", "maturityLevel": "ADULT" }
  ]
}`,
        notes: "Cached in EVCache per accountId. TTL = 5 min. Profile changes invalidate cache.",
      },
      {
        method: "POST", path: "/v1/profiles",
        purpose: "Create a new profile (max 5 per account)",
        latency: "<300ms P99", consistency: "Strong", authRequired: true, cacheable: false, idempotent: false,
        request: `{ "name": "Alice", "maturityLevel": "ADULT", "language": "en" }`,
        response: `{ "profileId": "p123", "createdAt": "2026-06-19T10:00:00Z" }`,
        notes: "Write to relational DB. Invalidate profiles cache for account.",
      },
    ],
  },
  {
    group: "Catalog",
    color: "#10b981",
    apis: [
      {
        method: "GET", path: "/v1/titles/{id}",
        purpose: "Fetch title metadata (name, description, cast, episodes)",
        latency: "<100ms P99", consistency: "Eventual", authRequired: true, cacheable: true, idempotent: true,
        request: "(path param: titleId)",
        response: `{
  "titleId": "t789",
  "name": "Stranger Things",
  "type": "series",
  "maturityRating": "TV-14",
  "seasons": [...],
  "availableInRegion": true
}`,
        notes: "Heavily cached — EVCache TTL = 10 min. Cache miss hits Catalog DB. Availability flag is profile + region aware.",
      },
      {
        method: "GET", path: "/v1/home",
        purpose: "Personalized homepage rows for the active profile",
        latency: "<500ms P99", consistency: "Eventual", authRequired: true, cacheable: true, idempotent: true,
        request: "?profileId=p1&region=US",
        response: `{
  "rows": [
    { "rowId": "continue_watching", "title": "Continue Watching", "titles": [...] },
    { "rowId": "top_picks", "title": "Top Picks for Alice", "titles": [...] }
  ]
}`,
        notes: "Assembles pre-computed recommendation rows. Fallback to trending if personalization fails.",
      },
    ],
  },
  {
    group: "Search",
    color: "#f59e0b",
    apis: [
      {
        method: "GET", path: "/v1/search",
        purpose: "Full-text title search with ranking",
        latency: "<200ms P99", consistency: "Eventual", authRequired: true, cacheable: true, idempotent: true,
        request: "?q=stranger+things&region=US&profileId=p1",
        response: `{
  "query": "stranger things",
  "results": [{ "titleId": "t789", "name": "Stranger Things", "score": 0.98 }],
  "total": 1
}`,
        notes: "Elasticsearch / OpenSearch backend. BM25 + profile popularity signal. Results cached 2 min.",
      },
      {
        method: "GET", path: "/v1/autocomplete",
        purpose: "Prefix autocomplete for search box",
        latency: "<50ms P99", consistency: "Eventual", authRequired: false, cacheable: true, idempotent: true,
        request: "?q=stran&region=US",
        response: `{ "suggestions": ["Stranger Things", "Strange Days"] }`,
        notes: "Redis sorted-set prefix index. Top-N by global popularity. TTL = 5 min.",
      },
    ],
  },
  {
    group: "Playback",
    color: "#ec4899",
    apis: [
      {
        method: "POST", path: "/v1/playback/session",
        purpose: "Create playback session — checks auth, entitlement, concurrency, returns manifest",
        latency: "<300ms P99", consistency: "Strong (concurrency)", authRequired: true, cacheable: false, idempotent: true,
        request: `{
  "profileId": "p123",
  "titleId": "t789",
  "deviceId": "d456",
  "appVersion": "10.4.2",
  "networkType": "wifi",
  "drmScheme": "WIDEVINE"
}`,
        response: `{
  "sessionId": "s999",
  "manifestUrl": "https://cdn.example.com/manifest/signed-token.mpd",
  "drmLicenseUrl": "https://api.example.com/v1/drm/license",
  "heartbeatIntervalSec": 30,
  "expiresAt": "2026-06-19T12:30:00Z"
}`,
        notes: "Idempotency key = (profileId + titleId + deviceId). Concurrency check via Redis Lua atomic. Signed manifest URL = HMAC-SHA256, 6h TTL. Never returns video bytes.",
      },
      {
        method: "POST", path: "/v1/playback/{sessionId}/heartbeat",
        purpose: "Renew stream slot, update resume position, report QoE metrics",
        latency: "<100ms P99 (async ok)", consistency: "Eventual", authRequired: true, cacheable: false, idempotent: true,
        request: `{
  "profileId": "p123",
  "positionMs": 124000,
  "bitrateKbps": 4500,
  "bufferMs": 300,
  "playerState": "playing",
  "eventTs": "2026-06-19T12:00:30Z"
}`,
        response: `{ "status": "ok", "nextHeartbeatSec": 30 }`,
        notes: "Refreshes Redis TTL (36s) to keep slot alive. Cassandra position write is async. Failure must not stop playback.",
      },
      {
        method: "DELETE", path: "/v1/playback/{sessionId}",
        purpose: "End playback session — release concurrency slot",
        latency: "<100ms", consistency: "Strong", authRequired: true, cacheable: false, idempotent: true,
        request: "(path param only)",
        response: `{ "status": "ended" }`,
        notes: "Atomically releases Redis concurrency slot. Also called if heartbeat stops (slot TTL = 36s self-heals).",
      },
    ],
  },
  {
    group: "DRM",
    color: "#f97316",
    apis: [
      {
        method: "POST", path: "/v1/drm/license",
        purpose: "Issue DRM license for encrypted content decryption",
        latency: "<500ms P99", consistency: "Strong", authRequired: true, cacheable: false, idempotent: false,
        request: `{
  "sessionId": "s999",
  "drmChallenge": "base64-encoded-widevine-challenge",
  "deviceId": "d456"
}`,
        response: `{ "license": "base64-encoded-license-blob" }`,
        notes: "Validates session + entitlement. Device fingerprint verified. License is device-bound. Failure = FAIL CLOSED (no plaintext fallback — contractual requirement).",
      },
    ],
  },
  {
    group: "Watch History",
    color: "#06b6d4",
    apis: [
      {
        method: "GET", path: "/v1/profiles/{profileId}/continue-watching",
        purpose: "List recently watched titles with resume positions",
        latency: "<200ms P99", consistency: "Eventual", authRequired: true, cacheable: true, idempotent: true,
        request: "(path param: profileId)",
        response: `{
  "items": [
    { "titleId": "t789", "positionMs": 124000, "durationMs": 3600000, "updatedAt": "..." }
  ]
}`,
        notes: "Cassandra query: SELECT * FROM watch_history_by_profile WHERE profile_id = ? ORDER BY watched_at DESC LIMIT 20.",
      },
      {
        method: "PUT", path: "/v1/profiles/{profileId}/titles/{titleId}/position",
        purpose: "Update resume position (called by heartbeat path or on pause/stop)",
        latency: "<100ms (async ok)", consistency: "Eventual", authRequired: true, cacheable: false, idempotent: true,
        request: `{ "positionMs": 124000, "deviceId": "d456" }`,
        response: `{ "status": "ok" }`,
        notes: "Cassandra upsert: UPDATE resume_position SET position_ms = ? WHERE profile_id = ? AND title_id = ?. Last-write-wins is acceptable.",
      },
    ],
  },
  {
    group: "Events",
    color: "#6d28d9",
    apis: [
      {
        method: "POST", path: "/v1/events/batch",
        purpose: "Client batch-uploads analytics events (play, pause, impression, click, error, quality)",
        latency: "<200ms P99", consistency: "Eventual", authRequired: true, cacheable: false, idempotent: true,
        request: `{
  "deviceId": "d456",
  "profileId": "p123",
  "events": [
    {
      "eventId": "uuid-1",
      "type": "playback_heartbeat",
      "titleId": "t789",
      "sessionId": "s999",
      "eventTs": "2026-06-19T12:00:00Z",
      "payload": { "positionMs": 124000, "bitrateKbps": 4500 }
    }
  ]
}`,
        response: `{ "accepted": 1, "rejected": 0 }`,
        notes: "eventId used for deduplication in Kafka. Schema validation via schema registry. Route to Kafka topic by event_type. Backpressure = drop low-priority events under load.",
      },
    ],
  },
];

const BAD_MISTAKES = [
  { mistake: "Returning video bytes from the API", fix: "API returns signed manifest URL. CDN/OCA serves video bytes." },
  { mistake: "Using the same endpoint for autocomplete and full search", fix: "Autocomplete needs <50ms — Redis prefix index. Full search needs ranking — Elasticsearch." },
  { mistake: "Heartbeat blocking playback (sync write to DB)", fix: "Heartbeat response is immediate. Cassandra write is async, off the critical path." },
  { mistake: "No idempotency on playback session creation", fix: "Use (profileId + titleId + deviceId) as idempotency key to prevent double concurrency slot allocation." },
  { mistake: "DRM license returning 200 with empty body on failure", fix: "DRM must fail closed — 403 if license cannot be issued. Never a degraded plaintext fallback." },
  { mistake: "Refreshing access token on every API call", fix: "Token is validated stateless (JWT signature). Refresh only when expired (every 15 min)." },
];

export function APIsTab({ onNavigateTab }: { onNavigateTab?: (tab: TabSlug) => void }) {
  const [openGroup, setOpenGroup] = useState<string | null>("Playback");
  const [openApiIdx, setOpenApiIdx] = useState<number | null>(0);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>API Design</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          8 API groups covering the full Netflix platform. Each API shows request, response, latency target, consistency, cacheability, and idempotency.
        </p>
      </div>

      {/* API Groups */}
      {API_GROUPS.map((group) => {
        const isGroupOpen = openGroup === group.group;
        return (
          <div key={group.group} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${isGroupOpen ? group.color + "60" : "var(--border)"}` }}>
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left"
              style={{ background: isGroupOpen ? `${group.color}0d` : "var(--bg-card)", cursor: "pointer", border: "none" }}
              onClick={() => { setOpenGroup(isGroupOpen ? null : group.group); setOpenApiIdx(0); }}
              aria-expanded={isGroupOpen}
            >
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ background: group.color }} />
                <span className="text-base font-bold" style={{ color: "var(--text)" }}>{group.group}</span>
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>{group.apis.length} endpoint{group.apis.length !== 1 ? "s" : ""}</span>
              </div>
              <span className="text-xs transition-transform duration-200" style={{ color: "var(--text-faint)", display: "inline-block", transform: isGroupOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </button>

            {isGroupOpen && (
              <div style={{ borderTop: `1px solid ${group.color}30` }}>
                {group.apis.map((api, apiIdx) => {
                  const isApiOpen = openApiIdx === apiIdx;
                  const methodColors: Record<string, { bg: string; text: string }> = {
                    GET:    { bg: "#dcfce7", text: "#166534" },
                    POST:   { bg: "#dbeafe", text: "#1e40af" },
                    PUT:    { bg: "#fef3c7", text: "#92400e" },
                    DELETE: { bg: "#fee2e2", text: "#991b1b" },
                  };
                  const mc = methodColors[api.method] ?? methodColors.GET;
                  return (
                    <div key={apiIdx} style={{ borderTop: apiIdx > 0 ? "1px solid var(--border)" : "none" }}>
                      <button
                        className="w-full flex items-start gap-3 px-5 py-3.5 text-left transition-opacity hover:opacity-80"
                        style={{ background: isApiOpen ? "var(--bg-card)" : "var(--bg)", cursor: "pointer", border: "none" }}
                        onClick={() => setOpenApiIdx(isApiOpen ? null : apiIdx)}
                        aria-expanded={isApiOpen}
                      >
                        <span className="text-[10px] font-bold px-2 py-1 rounded shrink-0 mt-0.5" style={{ background: mc.bg, color: mc.text }}>{api.method}</span>
                        <div className="flex-1 min-w-0">
                          <code className="text-sm font-mono" style={{ color: "var(--text)" }}>{api.path}</code>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{api.purpose}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono hidden sm:inline" style={{ color: "var(--text-faint)" }}>{api.latency}</span>
                          <span className="text-xs transition-transform duration-200" style={{ color: "var(--text-faint)", display: "inline-block", transform: isApiOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                        </div>
                      </button>

                      {isApiOpen && (
                        <div className="px-5 pb-5 space-y-4" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
                          {/* Properties */}
                          <div className="flex flex-wrap gap-2 pt-4">
                            {[
                              { label: "Latency", val: api.latency, color: "#3b82f6" },
                              { label: "Consistency", val: api.consistency, color: api.consistency === "Strong" ? "#f59e0b" : "#10b981" },
                              { label: "Auth", val: api.authRequired ? "Required" : "Public", color: api.authRequired ? "#ec4899" : "#6b7280" },
                              { label: "Cacheable", val: api.cacheable ? "Yes" : "No", color: api.cacheable ? "#10b981" : "#6b7280" },
                              { label: "Idempotent", val: api.idempotent ? "Yes" : "No", color: api.idempotent ? "#10b981" : "#6b7280" },
                            ].map(p => (
                              <div key={p.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                                <span style={{ color: "var(--text-faint)" }}>{p.label}:</span>
                                <span className="font-semibold" style={{ color: p.color }}>{p.val}</span>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>Request</div>
                              <JsonBlock code={api.request} />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>Response</div>
                              <JsonBlock code={api.response} />
                            </div>
                          </div>

                          <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: `1px solid ${group.color}30` }}>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: group.color }}>Design Notes: </span>
                            <span className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{api.notes}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Bad Mistakes */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>Common API Design Mistakes</h2>
        <div className="space-y-3">
          {BAD_MISTAKES.map((m, i) => (
            <div key={i} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="px-4 py-2.5" style={{ background: "#fee2e2", borderBottom: "1px solid #fca5a5" }}>
                <span className="text-xs font-bold" style={{ color: "#991b1b" }}>✗ {m.mistake}</span>
              </div>
              <div className="px-4 py-2.5" style={{ background: "#f0fdf4" }}>
                <span className="text-xs font-medium" style={{ color: "#166534" }}>✓ {m.fix}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SayThisBlock text="The most important API design decision for Netflix is that POST /playback/session returns a signed manifest URL pointing to CDN — it never returns video bytes. The playback service is a coordinator: it validates auth, checks entitlement via EVCache, acquires a concurrency slot atomically via Redis Lua, issues a DRM license token, and returns. After that, the API tier is completely out of the video path." />

      {onNavigateTab && (
        <button
          onClick={() => onNavigateTab("apis-data-model" as never)}
          className="w-full py-4 rounded-2xl text-sm font-semibold"
          style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--border)", cursor: "pointer" }}
        >
          Next: Data Design →
        </button>
      )}
    </div>
  );
}
