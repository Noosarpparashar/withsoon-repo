"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
      style={{ background: copied ? "#22c55e" : "#2a2b3d", color: copied ? "#fff" : "#a9b1d6", cursor: "pointer", border: "none" }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function SayThis({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #10b981" }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ background: "rgba(16,185,129,0.1)" }}>
        <span className="text-xs font-bold" style={{ color: "#10b981" }}>💬 Say this in interview</span>
        <button
          onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
          className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
          style={{ background: copied ? "#22c55e" : "transparent", color: copied ? "#fff" : "#10b981", border: "1px solid #10b981", cursor: "pointer" }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="px-4 py-3 text-sm leading-relaxed" style={{ background: "var(--bg)", color: "var(--text)" }}>{text}</div>
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        style={{ background: "var(--bg)", cursor: "pointer", border: "none" }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</span>
        <span className="text-xs transition-transform duration-200" style={{ color: "var(--text-muted)", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 space-y-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

const FLOW_STEPS = [
  { n: 1, title: "Clarify scope", detail: "Are we designing full playback, just concurrency limits, or watch history? Multi-device? Multi-region?", fail: "—", interview: "I'll scope this to the full playback flow from click-to-play through watch progress updates." },
  { n: 2, title: "Functional requirements", detail: "Play video with DRM. Resume across devices. Concurrency limits per plan. Watch history.", fail: "—", interview: "Core requirements: play with DRM, resume watching, concurrent stream limits, watch history." },
  { n: 3, title: "Non-functional requirements", detail: "Play start < 2s. 99.99% availability. Eventual consistency for watch progress, strong for concurrency.", fail: "—", interview: "P99 play start under 2 seconds. Strong consistency only where money or access control is involved." },
  { n: 4, title: "Scale estimation", detail: "300M users, 60M concurrent streams, 2M heartbeat writes/sec, 5 Mbps avg bitrate → 300 Tbps.", fail: "—", interview: "60M streams × heartbeat every 30s = 2M writes/sec. That rules out MySQL for watch progress." },
  { n: 5, title: "High-level architecture", detail: "Client → API Gateway → Auth → Subscription → Concurrency → Playback → DRM → Manifest → CDN", fail: "—", interview: "The video data plane is separate — 95% of bytes flow directly from CDN, not through API servers." },
  { n: 6, title: "Playback flow", detail: "10-step sequence: click play → validate → session → DRM → manifest → CDN → heartbeat", fail: "DRM down → fail closed. Concurrency check race condition.", interview: "Let me walk through the full playback sequence step by step." },
  { n: 7, title: "API design", detail: "POST /playback/sessions, POST /playback/heartbeat, DELETE /playback/sessions/{id}", fail: "Duplicate session creation on retry.", interview: "POST is idempotent using client-generated session_id as idempotency key." },
  { n: 8, title: "Data model", detail: "playback_sessions, watch_progress, active_streams, content_metadata tables", fail: "Hot partition on popular content_id.", interview: "watch_progress is Cassandra: profile_id as partition key, content_id as clustering key." },
  { n: 9, title: "Cache design", detail: "Content metadata in EVCache. Watch history read through cache. Concurrency state in Redis.", fail: "Cache stampede on popular title release.", interview: "We cache metadata but never cache concurrency state — that must be strongly consistent." },
  { n: 10, title: "Watch history / resume", detail: "Heartbeat every 30s. Last-write-wins per session. Eventually consistent.", fail: "Multiple devices updating same progress.", interview: "Progress is eventually consistent — a 30-second staleness is fine for resume watching." },
  { n: 11, title: "Concurrency limit design", detail: "Redis stores active sessions per account. TTL refreshed by heartbeat. Check + set must be atomic.", fail: "Race condition: two devices start at same millisecond.", interview: "We use Redis SETNX + TTL. The check and set must be atomic to prevent race conditions." },
  { n: 12, title: "CDN handoff", detail: "Manifest URL returned. Client fetches chunks from Open Connect. 95% of bytes bypass API.", fail: "OCA node failure → fallback to parent cluster.", interview: "The manifest URL points to the nearest OCA. CDN failure cascades to parent, never to origin." },
  { n: 13, title: "Failure handling", detail: "DRM fails closed. Billing fails open. Cache fails open to Cassandra.", fail: "See Failures + Tradeoffs tab.", interview: "The key principle: fail open for degraded experience, fail closed only for legal/access requirements." },
  { n: 14, title: "Tradeoffs", detail: "MySQL vs Cassandra, Redis vs Cassandra for concurrency, CDN own vs commercial.", fail: "—", interview: "Cassandra for watch progress: 2M writes/sec with eventual consistency. MySQL only where ACID matters." },
  { n: 15, title: "Final spoken answer", detail: "2-minute summary covering all major design decisions", fail: "—", interview: "I designed Netflix playback backend covering 10 services, 8 APIs, and 5 database tables." },
];

const PLAYBACK_SEQUENCE = [
  { step: 1, actor: "Client", action: "User clicks Play button", fail: "—" },
  { step: 2, actor: "Client → API Gateway", action: "Client calls POST /v1/playback/sessions with profile_id, content_id, device_id", fail: "Rate limiting kicks in at 1000 req/min per IP" },
  { step: 3, actor: "API Gateway → Auth Service", action: "API Gateway validates JWT token, Auth Service verifies user identity", fail: "JWT expired → 401. Auth Service down → fail closed (DRM requires valid identity)" },
  { step: 4, actor: "Auth → Subscription Service", action: "Subscription Service checks active plan and entitlement for content", fail: "Subscription Service down → fail open (allow playback, reconcile async)" },
  { step: 5, actor: "Subscription → Concurrency Service", action: "Concurrency Service checks active_streams for this account. If at limit → reject.", fail: "Race condition: two devices start simultaneously. Use Redis atomic SETNX + TTL." },
  { step: 6, actor: "Concurrency → Playback Service", action: "Playback Service fetches content metadata, selects encoding ladder, builds session", fail: "Metadata Service down → serve cached metadata. No metadata → fail with 503." },
  { step: 7, actor: "Playback → DRM Service", action: "DRM Service generates device-bound license token for this session", fail: "DRM Service down → fail closed. Studio contracts require valid license. Return 503." },
  { step: 8, actor: "DRM → Manifest Service", action: "Manifest Service builds manifest URL pointing to nearest OCA node", fail: "Manifest Service down → circuit breaker, return stale manifest if available." },
  { step: 9, actor: "Client → CDN/Open Connect", action: "Client fetches video segments from OCA. 95% of bytes flow directly from CDN.", fail: "OCA node down → client retries to parent OCA cluster → origin fallback." },
  { step: 10, actor: "Client → Watch Progress Service", action: "Client sends heartbeat every 30 seconds. Watch Progress Service updates resume point.", fail: "Heartbeat lost → last saved position used on resume. Max staleness: 30 seconds." },
];

const APIS = [
  {
    method: "POST", path: "/v1/playback/sessions",
    purpose: "Start a new playback session",
    request: `{\n  "profile_id": "p123",\n  "content_id": "movie456",\n  "device_id": "device789"\n}`,
    response: `{\n  "session_id": "sess999",\n  "manifest_url": "https://cdn.netflix-like.com/manifest/movie456.m3u8",\n  "drm_license_url": "https://license.netflix-like.com/token",\n  "heartbeat_interval_sec": 30\n}`,
    auth: "JWT required", idempotency: "Idempotent on client-generated session_id", rateLimit: "100/min per profile",
    failureResponse: "503 if concurrency limit reached. 402 if subscription expired.",
    serviceOwner: "Playback Service", dbUsed: "Redis (active_streams), Cassandra (playback_sessions)",
  },
  {
    method: "POST", path: "/v1/playback/heartbeat",
    purpose: "Refresh session lease and update watch progress",
    request: `{\n  "session_id": "sess999",\n  "position_sec": 1200,\n  "playback_state": "playing"\n}`,
    response: `{\n  "status": "ok",\n  "next_heartbeat_in_sec": 30\n}`,
    auth: "JWT required", idempotency: "Idempotent — duplicate heartbeats ignored via session_id + event_ts", rateLimit: "2/min per session",
    failureResponse: "404 if session not found. 409 if session expired.",
    serviceOwner: "Watch Progress Service", dbUsed: "Cassandra (watch_progress), Redis (active_streams TTL refresh)",
  },
  {
    method: "DELETE", path: "/v1/playback/sessions/{session_id}",
    purpose: "End playback session, release concurrency slot",
    request: "(empty body)",
    response: `{\n  "status": "ended"\n}`,
    auth: "JWT required", idempotency: "Idempotent — deleting non-existent session returns 200", rateLimit: "20/min per profile",
    failureResponse: "—",
    serviceOwner: "Playback Service", dbUsed: "Redis (remove from active_streams)",
  },
  {
    method: "GET", path: "/v1/profiles/{profile_id}/continue-watching",
    purpose: "Return list of partially watched titles for resume",
    request: "(no body)",
    response: `[\n  {\n    "content_id": "movie456",\n    "position_sec": 1200,\n    "duration_sec": 6840,\n    "last_watched_at": "2026-06-19T10:00:00Z"\n  }\n]`,
    auth: "JWT required", idempotency: "Read — always idempotent", rateLimit: "60/min per profile",
    failureResponse: "Return cached result if Cassandra slow.",
    serviceOwner: "Watch Progress Service", dbUsed: "Cassandra (watch_progress), EVCache (read-through)",
  },
  {
    method: "GET", path: "/v1/content/{content_id}/metadata",
    purpose: "Fetch title metadata, encoding variants, available languages",
    request: "(no body)",
    response: `{\n  "content_id": "movie456",\n  "title": "Example Movie",\n  "duration_sec": 6840,\n  "available_regions": ["IN", "US"],\n  "encoding_variants": [...]\n}`,
    auth: "JWT optional (public metadata)", idempotency: "Read — always idempotent", rateLimit: "200/min per IP",
    failureResponse: "Serve from EVCache. If cache cold → Cassandra. 404 if not found.",
    serviceOwner: "Metadata Service", dbUsed: "Cassandra (content_metadata), EVCache",
  },
  {
    method: "GET", path: "/v1/search?q=...&page=1&limit=20",
    purpose: "Full-text search across catalog titles, genres, actors",
    request: "(query params: q, page, limit, country, language)",
    response: `{\n  "results": [\n    { "content_id": "movie456", "title": "Example", "match_score": 0.97 }\n  ],\n  "total": 142\n}`,
    auth: "JWT required (region-restricted results)", idempotency: "Read — always idempotent", rateLimit: "120/min per profile",
    failureResponse: "Return cached popular results on search service down. Degrade gracefully.",
    serviceOwner: "Search Service (Elasticsearch)", dbUsed: "Elasticsearch index, EVCache for top queries",
  },
  {
    method: "GET", path: "/v1/profiles/{profile_id}/recommendations",
    purpose: "Return personalized content recommendations for a profile",
    request: "(query params: limit, context=home|end-of-episode|search)",
    response: `{\n  "recommendations": [\n    { "content_id": "movie789", "reason": "Because you watched X", "score": 0.92 }\n  ],\n  "model_version": "2.1.0"\n}`,
    auth: "JWT required", idempotency: "Read — always idempotent", rateLimit: "60/min per profile",
    failureResponse: "Fall back to popularity-based recommendations if ML model unavailable.",
    serviceOwner: "Recommendation Service", dbUsed: "ML Feature Store, EVCache (pre-computed recs per profile)",
  },
  {
    method: "POST", path: "/v1/devices/register",
    purpose: "Register a new device for DRM licensing and playback authorization",
    request: `{\n  "device_fingerprint": "...",\n  "device_type": "smart_tv",\n  "app_version": "9.1.2"\n}`,
    response: `{\n  "device_id": "device789",\n  "registered_at": "2026-06-19T10:00:00Z"\n}`,
    auth: "JWT required (account-level)", idempotency: "Idempotent on device_fingerprint — same device returns same device_id", rateLimit: "10 devices per account",
    failureResponse: "409 if device limit reached per account plan.",
    serviceOwner: "Device Service", dbUsed: "MySQL (devices table, ACID for device limit enforcement)",
  },
];

const DB_TABLES = [
  {
    name: "playback_sessions",
    db: "Cassandra",
    color: "#3b82f6",
    pk: "session_id",
    sk: "—",
    cols: ["session_id UUID", "profile_id UUID", "content_id UUID", "device_id UUID", "account_id UUID", "started_at TIMESTAMP", "status TEXT", "manifest_url TEXT"],
    readPattern: "Lookup by session_id on heartbeat or delete",
    writePattern: "Insert on session start, update on end",
    consistency: "QUORUM reads/writes — session must be visible immediately across services",
    why: "High write throughput for millions of concurrent sessions. QUORUM needed so Concurrency Service sees new sessions instantly.",
  },
  {
    name: "watch_progress",
    db: "Cassandra",
    color: "#10b981",
    pk: "profile_id",
    sk: "content_id",
    cols: ["profile_id UUID", "content_id UUID", "position_sec INT", "duration_sec INT", "last_updated_at TIMESTAMP", "device_id UUID", "session_id UUID"],
    readPattern: "Fetch all in-progress titles for a profile (continue watching)",
    writePattern: "Upsert every 30s per active stream (heartbeat)",
    consistency: "ONE write — eventual consistency is fine. A 30s staleness is acceptable for resume.",
    why: "2M writes/sec at peak. Eventual consistency acceptable. Partition by profile_id for efficient 'continue watching' reads.",
  },
  {
    name: "active_streams",
    db: "Redis",
    color: "#ef4444",
    pk: "account_id",
    sk: "session_id (set member)",
    cols: ["key: account:{account_id}:streams", "value: SET of session_ids", "TTL: 45 seconds (refreshed by heartbeat)"],
    readPattern: "SCARD to count active streams, SMEMBERS to list them",
    writePattern: "SADD on session start, SREM on session end, TTL auto-expires stale sessions",
    consistency: "STRONG — Redis is authoritative for concurrency. Must be atomic (use Lua script for check-and-add).",
    why: "Concurrency limit enforcement requires sub-millisecond reads and strong consistency. Cassandra eventual consistency would allow over-limit playback during lag.",
  },
  {
    name: "content_metadata",
    db: "Cassandra",
    color: "#8b5cf6",
    pk: "content_id",
    sk: "region (optional)",
    cols: ["content_id UUID", "title TEXT", "duration_sec INT", "genres LIST<TEXT>", "available_regions SET<TEXT>", "encoding_variants LIST<TEXT>", "drm_required BOOLEAN"],
    readPattern: "Lookup by content_id on playback, search, catalog",
    writePattern: "Updated when content is ingested or rights change",
    consistency: "ONE read acceptable — served through EVCache 99.9% of the time",
    why: "Extremely read-heavy, rarely written. EVCache in front reduces Cassandra load by 1000x.",
  },
  {
    name: "user_subscriptions",
    db: "MySQL (RDS)",
    color: "#f59e0b",
    pk: "account_id",
    sk: "—",
    cols: ["account_id UUID", "plan_type TEXT", "max_streams INT", "status TEXT", "valid_until TIMESTAMP", "billing_id UUID"],
    readPattern: "Lookup by account_id on every playback session start",
    writePattern: "Updated on payment, cancellation, plan change",
    consistency: "STRONG — billing data must be ACID. Double-charge or unauthorized access is unacceptable.",
    why: "Low write volume, needs ACID guarantees. MySQL with read replicas handles the read load fine.",
  },
  {
    name: "users",
    db: "MySQL (RDS)",
    color: "#06b6d4",
    pk: "user_id",
    sk: "—",
    cols: ["user_id UUID", "email TEXT", "password_hash TEXT", "created_at TIMESTAMP", "country TEXT", "language TEXT"],
    readPattern: "Lookup by user_id or email on login/auth",
    writePattern: "Insert on signup, update on profile/password change",
    consistency: "STRONG — identity data must be ACID",
    why: "Low volume, high consistency requirement. MySQL RDS with read replica for login read load.",
  },
  {
    name: "profiles",
    db: "MySQL (RDS)",
    color: "#a855f7",
    pk: "profile_id",
    sk: "user_id (FK)",
    cols: ["profile_id UUID", "user_id UUID", "display_name TEXT", "avatar_url TEXT", "language TEXT", "maturity_level TEXT", "created_at TIMESTAMP"],
    readPattern: "Fetch all profiles for a user on login",
    writePattern: "Insert on profile creation, update on settings change",
    consistency: "STRONG — profile settings tied to entitlements",
    why: "Low write volume. ACID needed for profile→subscription link. MySQL with cache for hot profile lookups.",
  },
  {
    name: "devices",
    db: "MySQL (RDS)",
    color: "#84cc16",
    pk: "device_id",
    sk: "user_id (FK)",
    cols: ["device_id UUID", "user_id UUID", "device_fingerprint TEXT", "device_type TEXT", "app_version TEXT", "registered_at TIMESTAMP", "last_seen_at TIMESTAMP"],
    readPattern: "Lookup by device_fingerprint on registration, by user_id to count devices",
    writePattern: "Insert on first registration, update last_seen",
    consistency: "STRONG — device limit per account enforced here (ACID INSERT)",
    why: "Device limit (e.g. 5 devices/plan) requires ACID count-before-insert. MySQL enforces this reliably.",
  },
  {
    name: "content_availability",
    db: "Cassandra",
    color: "#f97316",
    pk: "content_id",
    sk: "region",
    cols: ["content_id UUID", "region TEXT", "available BOOLEAN", "available_from TIMESTAMP", "available_until TIMESTAMP", "license_type TEXT"],
    readPattern: "Lookup by (content_id, region) on every playback authorization",
    writePattern: "Updated when content rights change by region",
    consistency: "ONE read (EVCache serves 99.9%). QUORUM on write (rights change must propagate fast).",
    why: "Per-region rights checks needed on every playback start. Cassandra multi-DC replication ensures regional availability data is close to the user.",
  },
];

const CACHE_CONTENT = `CACHE WHAT:
✓ content_metadata       — TTL 1 hour, invalidate on rights change
✓ profile preferences    — TTL 15 min
✓ continue-watching list — TTL 2 min (can be slightly stale)
✓ search suggestions     — TTL 10 min
✓ popular titles/region  — TTL 30 min, proactive fill
✓ playback manifest meta — TTL 5 min

DO NOT CACHE:
✗ Payment/subscription status  — must be fresh for access control
✗ Concurrency limit state      — must be strongly consistent in Redis
✗ DRM license state            — device-bound, cannot be shared

CACHE STRATEGIES:
- EVCache (Memcached) for metadata: read-through, write-invalidate
- Redis for concurrency: atomic SETNX + TTL
- Hot title cache stampede: mutex lock + single filler pattern
- Regional caches: pre-position popular content before release
- Fallback if EVCache down: fall through to Cassandra (latency spike, not outage)`;

const WATCH_HISTORY_DESIGN = `PROBLEM:
User watches 20 minutes on TV, stops, then resumes on mobile.

DESIGN:
- Client sends heartbeat every 30 seconds with position_sec
- Progress stored by (profile_id, content_id) — one row per title per profile
- Last valid progress wins (last-write-wins by last_updated_at)
- Duplicate heartbeat ignored using session_id + event_ts check
- Progress is eventually consistent — 30s staleness is acceptable

TABLE: watch_progress (Cassandra)
  Partition key : profile_id
  Clustering key: content_id
  Columns: position_sec, duration_sec, last_updated_at, device_id, session_id

FAILURE CASES:
- Heartbeat lost: last saved position used on resume (max 30s behind)
- Multiple devices updating: last-write-wins — mobile position overwrites TV if mobile heartbeat is newer
- Client crash: session TTL in Redis expires after 45s, slot released automatically

INTERVIEW ANSWER:
Watch progress uses eventual consistency deliberately. The tradeoff: a resume point 30 seconds behind is acceptable. Using strong consistency here would require coordinating all heartbeat writes through a single leader — that doesn't scale to 2M writes/sec.`;

const CONCURRENCY_DESIGN = `PROBLEM:
User plan allows only 2 concurrent streams.

DESIGN:
- Redis SET per account: key = account:{id}:streams, value = SET of session_ids
- On session start: atomic Lua script checks SCARD, adds if below limit
- Session TTL: 45 seconds (refreshed by heartbeat every 30s)
- If no heartbeat → TTL expires → slot auto-released
- On session end: explicit SREM removes session_id

WHY REDIS NOT CASSANDRA:
- Cassandra is eventually consistent — two devices starting simultaneously both pass the check
- Redis is strongly consistent — Lua script is atomic, no race condition possible

LUA SCRIPT (atomic check + add):
local count = redis.call('SCARD', KEYS[1])
if count < tonumber(ARGV[2]) then
  redis.call('SADD', KEYS[1], ARGV[1])
  redis.call('EXPIRE', KEYS[1], 45)
  return 1  -- success
else
  return 0  -- at limit
end

FAILURE SCENARIO:
- Redis down: fail open (allow playback) or fail closed (deny) — Netflix's choice is fail open for non-DRM content
- Heartbeat stops: TTL expires, slot auto-released after 45s

INTERVIEW ANSWER:
Concurrency limit needs strong consistency — this is one of the few places where eventual consistency is unacceptable. The business rule "max N streams" would be violated by any eventual consistency window. Redis with a Lua script is the right tool: atomic, sub-millisecond, TTL-native.`;

const FINAL_BACKEND_ANSWERS = {
  "30 seconds": `I'll design Netflix playback backend. User clicks play → API Gateway validates JWT → Auth checks identity → Subscription checks plan → Concurrency Service checks active streams in Redis (atomic, strongly consistent) → Playback Service builds session → DRM generates device-bound license → Manifest Service returns CDN URL → Client streams from Open Connect → heartbeat every 30s updates watch progress in Cassandra (eventually consistent).`,
  "2 minutes": `I'll scope this to Netflix playback backend — the path from click-play to streaming video.

Services: API Gateway, Auth, Subscription, Concurrency (Redis), Playback, DRM, Manifest, CDN/Open Connect, Watch Progress.

Key design decisions: Concurrency limit uses Redis with atomic Lua script — strong consistency required here because over-limit playback violates the business contract. Watch progress uses Cassandra with eventual consistency — a 30-second staleness window on resume is acceptable.

Scale: 60M concurrent streams, 2M heartbeat writes/sec (why we use Cassandra for watch progress, not MySQL). CDN carries 300 Tbps of video bytes — 95% of traffic never touches API servers after manifest delivery.

Failure modes: DRM fails closed (legal requirement). Billing fails open (avoid blocking 60M users on a billing outage). Cache falls through to Cassandra.

APIs: POST /playback/sessions (idempotent on client session_id), POST /playback/heartbeat (deduped), DELETE /playback/sessions (explicit cleanup).`,
};

function BackendTrackTab({ seniorDepth }: { seniorDepth: boolean }) {
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set());
  const [openApis, setOpenApis] = useState<Set<number>>(new Set());
  const [openTables, setOpenTables] = useState<Set<number>>(new Set());
  const [openSeqSteps, setOpenSeqSteps] = useState<Set<number>>(new Set());
  const [copyAnswer, setCopyAnswer] = useState<string | null>(null);

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, idx: number) =>
    setter(prev => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; });
  const expandAll = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, count: number) =>
    setter(new Set(Array.from({ length: count }, (_, i) => i)));
  const collapseAll = (setter: React.Dispatch<React.SetStateAction<Set<number>>>) => setter(new Set());

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyAnswer(key);
      setTimeout(() => setCopyAnswer(null), 2000);
    });
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid #3b82f640" }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #3b82f6, #06b6d4, #8b5cf6)" }} />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>Backend Engineer Track</span>
              {seniorDepth && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>Senior/Staff Depth ON</span>}
            </div>
            <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>Netflix Playback Backend Design</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>15-step guided flow covering every aspect of the backend playback system.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {[["10", "services"], ["8", "APIs"], ["5", "tables"]].map(([n, l]) => (
              <div key={l} className="text-center p-3 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div className="text-lg font-black font-mono" style={{ color: "#3b82f6" }}>{n}</div>
                <div className="text-[10px]" style={{ color: "var(--text-faint)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flow steps */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              15-Step Design Flow <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}>({FLOW_STEPS.length} steps)</span>
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Each step has a detail + interview answer. Steps with failure cases are flagged.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => expandAll(setOpenSteps, FLOW_STEPS.length)} className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "var(--blue-soft)", color: "var(--blue-text)", cursor: "pointer", border: "none" }}>Expand All</button>
            <button onClick={() => collapseAll(setOpenSteps)} className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>Collapse</button>
          </div>
        </div>
        <div className="space-y-1.5">
          {FLOW_STEPS.map((step) => {
            const isOpen = openSteps.has(step.n);
            return (
              <div key={step.n} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isOpen ? "#3b82f660" : "var(--border)"}`, borderTop: "3px solid #3b82f6" }}>
                <button
                  onClick={() => toggle(setOpenSteps, step.n)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  aria-expanded={isOpen}
                  style={{ background: isOpen ? "rgba(59,130,246,0.06)" : "var(--bg)", cursor: "pointer", border: "none" }}
                >
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>{step.n}</span>
                  <span className="text-sm font-semibold flex-1" style={{ color: "var(--text)" }}>{step.title}</span>
                  {step.fail !== "—" && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#fee2e2", color: "#ef4444" }}>has failure case</span>}
                  <span className="text-xs shrink-0 transition-transform duration-200" style={{ color: "var(--text-muted)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{step.detail}</p>
                    {step.fail !== "—" && (
                      <div className="rounded-lg p-3" style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}>
                        <span className="text-xs font-bold" style={{ color: "#7f1d1d" }}>Failure case: </span>
                        <span className="text-xs" style={{ color: "#991b1b" }}>{step.fail}</span>
                      </div>
                    )}
                    <SayThis text={step.interview} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Playback sequence */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              Full Playback Sequence <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}>({PLAYBACK_SEQUENCE.length} steps)</span>
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Click any step to expand the failure case.</p>
          </div>
          <div className="flex gap-2">
            <CopyButton text={PLAYBACK_SEQUENCE.map(s => `${s.step}. ${s.actor}: ${s.action}`).join("\n")} label="Copy sequence" />
            <button onClick={() => expandAll(setOpenSeqSteps, PLAYBACK_SEQUENCE.length)} className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "var(--blue-soft)", color: "var(--blue-text)", cursor: "pointer", border: "none" }}>Expand All</button>
            <button onClick={() => collapseAll(setOpenSeqSteps)} className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>Collapse</button>
          </div>
        </div>
        <div className="space-y-1.5">
          {PLAYBACK_SEQUENCE.map((s) => {
            const isOpen = openSeqSteps.has(s.step);
            return (
              <div key={s.step} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", borderTop: "3px solid #3b82f6" }}>
                <button
                  onClick={() => toggle(setOpenSeqSteps, s.step)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left"
                  aria-expanded={isOpen}
                  style={{ background: "var(--bg)", cursor: "pointer", border: "none" }}
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>{s.step}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold" style={{ color: "#3b82f6" }}>{s.actor}</span>
                    <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "var(--text)" }}>{s.action}</p>
                  </div>
                  <span className="text-xs shrink-0 transition-transform duration-200 mt-1" style={{ color: "var(--text-muted)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </button>
                {isOpen && s.fail !== "—" && (
                  <div className="px-4 pb-3 pt-2" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
                    <div className="rounded-lg p-3" style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}>
                      <span className="text-xs font-bold" style={{ color: "#7f1d1d" }}>What can fail here: </span>
                      <span className="text-xs" style={{ color: "#991b1b" }}>{s.fail}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* API Design */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              Backend API Design <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}>({APIS.length} endpoints)</span>
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Full request/response, auth, idempotency, and failure behavior for each endpoint.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => expandAll(setOpenApis, APIS.length)} className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "var(--blue-soft)", color: "var(--blue-text)", cursor: "pointer", border: "none" }}>Expand All</button>
            <button onClick={() => collapseAll(setOpenApis)} className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>Collapse</button>
          </div>
        </div>
        <div className="space-y-2">
          {APIS.map((api, i) => {
            const isOpen = openApis.has(i);
            const methodColor = api.method === "GET" ? "#10b981" : api.method === "POST" ? "#3b82f6" : "#ef4444";
            return (
              <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isOpen ? `${methodColor}50` : "var(--border)"}`, borderTop: `3px solid ${methodColor}` }}>
                <button
                  onClick={() => toggle(setOpenApis, i)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  aria-expanded={isOpen}
                  style={{ background: "var(--bg)", cursor: "pointer", border: "none" }}
                >
                  <span className="text-[10px] font-bold px-2 py-1 rounded shrink-0" style={{ background: `${methodColor}20`, color: methodColor }}>{api.method}</span>
                  <code className="text-sm font-mono flex-1" style={{ color: "var(--text)" }}>{api.path}</code>
                  <CopyButton text={api.path} />
                  <span className="text-xs hidden sm:inline" style={{ color: "var(--text-faint)" }}>{api.purpose}</span>
                  <span className="text-xs shrink-0 ml-2 transition-transform duration-200" style={{ color: "var(--text-muted)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{api.purpose}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-faint)" }}>Request body</p>
                        <div className="rounded-lg overflow-hidden" style={{ background: "#1a1b26" }}>
                          <pre className="p-3 text-xs leading-relaxed overflow-x-auto"><code style={{ color: "#a9b1d6" }}>{api.request}</code></pre>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-faint)" }}>Response body</p>
                        <div className="rounded-lg overflow-hidden" style={{ background: "#1a1b26" }}>
                          <pre className="p-3 text-xs leading-relaxed overflow-x-auto"><code style={{ color: "#a9b1d6" }}>{api.response}</code></pre>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[["Auth", api.auth], ["Idempotency", api.idempotency], ["Rate limit", api.rateLimit], ["Service owner", api.serviceOwner]].map(([k, v]) => (
                        <div key={k} className="rounded-lg p-2.5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>{k}</div>
                          <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {api.failureResponse !== "—" && (
                      <div className="rounded-lg p-2.5" style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}>
                        <span className="text-[10px] font-bold" style={{ color: "#7f1d1d" }}>Failure responses: </span>
                        <span className="text-xs" style={{ color: "#991b1b" }}>{api.failureResponse}</span>
                      </div>
                    )}
                    <div className="rounded-lg p-2.5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                      <span className="text-[10px] font-bold" style={{ color: "var(--text-faint)" }}>DB/Cache used: </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{api.dbUsed}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Database design */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              Database Design <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}>({DB_TABLES.length} tables)</span>
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Columns, access patterns, consistency requirements, and why each database was chosen.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => expandAll(setOpenTables, DB_TABLES.length)} className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "var(--blue-soft)", color: "var(--blue-text)", cursor: "pointer", border: "none" }}>Expand All</button>
            <button onClick={() => collapseAll(setOpenTables)} className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>Collapse</button>
          </div>
        </div>
        <div className="space-y-2">
          {DB_TABLES.map((tbl, i) => {
            const isOpen = openTables.has(i);
            return (
              <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isOpen ? `${tbl.color}50` : "var(--border)"}`, borderTop: `3px solid ${tbl.color}` }}>
                <button
                  onClick={() => toggle(setOpenTables, i)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  aria-expanded={isOpen}
                  style={{ background: "var(--bg)", cursor: "pointer", border: "none" }}
                >
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${tbl.color}20`, color: tbl.color }}>{tbl.db}</span>
                  <code className="text-sm font-mono font-bold flex-1" style={{ color: "var(--text)" }}>{tbl.name}</code>
                  <CopyButton text={tbl.name} />
                  <span className="text-[11px] hidden sm:inline" style={{ color: "var(--text-faint)" }}>PK: {tbl.pk}</span>
                  <span className="text-xs shrink-0 ml-2 transition-transform duration-200" style={{ color: "var(--text-muted)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                            <th className="text-left py-2 px-3 font-bold" style={{ color: "var(--text-muted)" }}>Column</th>
                            <th className="text-left py-2 px-3 font-bold" style={{ color: "var(--text-muted)" }}>Type / notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tbl.cols.map((c, ci) => {
                            const [col, ...rest] = c.split(" ");
                            return (
                              <tr key={ci} style={{ borderBottom: ci < tbl.cols.length - 1 ? "1px solid var(--border)" : "none" }}>
                                <td className="py-1.5 px-3 font-mono" style={{ color: tbl.color }}>{col}</td>
                                <td className="py-1.5 px-3 font-mono" style={{ color: "var(--text-muted)" }}>{rest.join(" ")}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[["Read pattern", tbl.readPattern], ["Write pattern", tbl.writePattern], ["Consistency", tbl.consistency]].map(([k, v]) => (
                        <div key={k as string} className="rounded-lg p-2.5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>{k}</div>
                          <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg p-3" style={{ background: `${tbl.color}0d`, border: `1px solid ${tbl.color}30` }}>
                      <span className="text-xs font-bold" style={{ color: tbl.color }}>Why {tbl.db}: </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{tbl.why}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Watch History Design */}
      <Accordion title="Watch History / Resume Design — deep dive" defaultOpen={false}>
        <div className="rounded-lg overflow-hidden" style={{ background: "#1a1b26" }}>
          <div className="flex justify-end p-2">
            <CopyButton text={WATCH_HISTORY_DESIGN} label="Copy" />
          </div>
          <pre className="px-4 pb-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap"><code style={{ color: "#a9b1d6" }}>{WATCH_HISTORY_DESIGN}</code></pre>
        </div>
      </Accordion>

      {/* Concurrency Limit Design */}
      <Accordion title="Concurrency Limit Design — deep dive" defaultOpen={false}>
        <div className="rounded-lg overflow-hidden" style={{ background: "#1a1b26" }}>
          <div className="flex justify-end p-2">
            <CopyButton text={CONCURRENCY_DESIGN} label="Copy" />
          </div>
          <pre className="px-4 pb-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap"><code style={{ color: "#a9b1d6" }}>{CONCURRENCY_DESIGN}</code></pre>
        </div>
      </Accordion>

      {/* Cache Design */}
      <Accordion title="Cache Design — what to cache and what not to cache" defaultOpen={false}>
        <div className="rounded-lg overflow-hidden" style={{ background: "#1a1b26" }}>
          <div className="flex justify-end p-2">
            <CopyButton text={CACHE_CONTENT} label="Copy" />
          </div>
          <pre className="px-4 pb-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap"><code style={{ color: "#a9b1d6" }}>{CACHE_CONTENT}</code></pre>
        </div>
      </Accordion>

      {/* Senior/Staff depth */}
      {seniorDepth && (
        <div className="rounded-2xl p-6" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid #8b5cf640" }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>Senior/Staff Depth</span>
            <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>Deeper tradeoffs and scale decisions</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "Multi-region active-active", body: "Cassandra with multi-DC replication. Watch progress writes go to local DC (LOCAL_QUORUM). Concurrency limit: single Redis per region — cross-region streams use global account limit stored in a low-latency cross-region store (e.g., DynamoDB Global Tables)." },
              { title: "Hot title cache stampede", body: "When a popular title releases: pre-position manifest metadata in EVCache before release. Use mutex lock on cache miss for manifest (only one filler thread, others wait). Separate encoding variants by quality tier to distribute cache entries." },
              { title: "DRM at scale", body: "60M streams × license refresh every 30s = 2M license requests/sec. DRM service horizontally shards by device_id (not user_id) — a user with 3 devices has 3 device_ids. License service is stateless; license secrets stored in HSM-backed KMS." },
              { title: "Playback latency budget", body: "Client SLA: play start in < 2s. Budget: 100ms DNS/TLS, 150ms API Gateway, 200ms critical path (Auth+Concurrency+Playback+DRM+Manifest in parallel), 100ms manifest parse, 500ms first chunk from OCA, 400ms buffer fill. Any service over 200ms P99 breaks the SLA." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <p className="text-sm font-bold mb-2" style={{ color: "#8b5cf6" }}>{item.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final answers */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>Final Spoken Answer</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Copy the version that matches your available time.</p>
        <div className="space-y-3">
          {(Object.entries(FINAL_BACKEND_ANSWERS) as [string, string][]).map(([duration, text]) => (
            <div key={duration} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "rgba(59,130,246,0.08)" }}>
                <span className="text-xs font-bold" style={{ color: "#3b82f6" }}>{duration} version</span>
                <button
                  onClick={() => copy(text, duration)}
                  className="text-[11px] px-3 py-1 rounded font-medium transition-colors"
                  style={{ background: copyAnswer === duration ? "#22c55e" : "transparent", color: copyAnswer === duration ? "#fff" : "#3b82f6", border: "1px solid #3b82f6", cursor: "pointer" }}
                >
                  {copyAnswer === duration ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap" style={{ background: "var(--bg)", color: "var(--text)" }}>{text}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export { BackendTrackTab };
