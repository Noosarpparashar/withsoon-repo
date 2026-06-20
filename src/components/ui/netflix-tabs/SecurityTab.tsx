"use client";

import { SayThisBlock } from "./shared";
import type { TabSlug } from "./types";

const DRM_STEPS = [
  { step: 1, actor: "Client", action: "User clicks Play. Client sends POST /playback/session with deviceId and drmScheme (WIDEVINE/FAIRPLAY/PLAYREADY)." },
  { step: 2, actor: "Playback Service", action: "Validates JWT, checks entitlement, acquires concurrency slot. Passes device fingerprint to DRM Service." },
  { step: 3, actor: "DRM Service", action: "Verifies device registration. Generates Content Encryption Key (CEK) lookup from HSM. Creates license token signed with private key." },
  { step: 4, actor: "Playback Service", action: "Returns signed manifest URL + DRM license URL to client. DRM license URL is also signed and short-lived." },
  { step: 5, actor: "Client", action: "Fetches manifest from CDN. Discovers encrypted segments. Sends license challenge to DRM license URL." },
  { step: 6, actor: "DRM Service", action: "Validates license challenge token + device fingerprint. Wraps CEK in device TEE public key. Returns license blob." },
  { step: 7, actor: "Client TEE", action: "Unwraps CEK inside Trusted Execution Environment. Decrypts video segments locally. CEK never leaves the TEE." },
];

const ACTOR_COLORS: Record<string, string> = {
  Client: "#3b82f6",
  "Playback Service": "#8b5cf6",
  "DRM Service": "#f59e0b",
  "Client TEE": "#10b981",
};

const SECURITY_TOPICS = [
  {
    title: "Authentication & Authorization",
    color: "#3b82f6",
    points: [
      "JWT (RS256) with 15-minute access token TTL",
      "Refresh token stored in HttpOnly cookie, 30-day TTL, device-bound",
      "Redis revocation list for instant invalidation (device theft, account compromise)",
      "OAuth2-compatible flow for social login (Google, Apple, Facebook)",
      "Authorization: profile-level permissions enforced at API layer, not client",
    ],
  },
  {
    title: "Signed CDN URLs",
    color: "#10b981",
    points: [
      "Manifest URL = HMAC-SHA256(canonical_url + expiry + client_ip_hash, secret_key)",
      "TTL = 6 hours — long enough for a feature film; short enough to limit URL sharing",
      "URL binding: optional IP-range binding for extra theft protection",
      "CDN validates signature before serving any response — no bypass possible",
      "Segment URLs are also signed — sharing the manifest doesn't expose raw video",
    ],
  },
  {
    title: "Device Registration & Limits",
    color: "#8b5cf6",
    points: [
      "Each device generates a unique device fingerprint on first registration",
      "Device is registered to account; max 5 registered devices per plan (varies)",
      "Concurrency limit (simultaneous streams) enforced at Redis layer — atomic Lua script",
      "Device management UI lets users deregister unused devices",
      "Suspicious device activity (rapid country hops) triggers step-up authentication",
    ],
  },
  {
    title: "Session Hijack Protection",
    color: "#f59e0b",
    points: [
      "Access tokens are device-bound: contain deviceId claim. Cross-device reuse rejected.",
      "IP anomaly detection: token used from unusual geography triggers re-auth prompt",
      "Short token TTL (15 min) limits the damage window of a stolen token",
      "Concurrent session detection: >plan limit triggers notification + forced sign-out",
      "Redis revocation list allows immediate invalidation of compromised sessions",
    ],
  },
  {
    title: "PII & Data Privacy",
    color: "#ec4899",
    points: [
      "PII fields (email, IP, device IDs) are pseudonymized before entering the data lake",
      "Hashed profile IDs used in analytics; mapping table access-controlled",
      "Event data minimization: only fields necessary for the use case are included",
      "GDPR right-to-erasure: deletion request propagates to Cassandra, S3, and search index",
      "Data retention policies: raw event data 90 days, curated data 2 years, billing records 7 years",
    ],
  },
  {
    title: "Credential Stuffing & Abuse Prevention",
    color: "#f97316",
    points: [
      "Rate limiting: 5 login attempts per IP per minute; 20 per hour",
      "CAPTCHA triggered after 3 consecutive failures",
      "Credential stuffing detection: bot fingerprinting, request rate analysis",
      "Compromised password detection: check against Have I Been Pwned database on login",
      "Household enforcement: location-based signals detect account sharing across households",
    ],
  },
  {
    title: "Audit Logging & Compliance",
    color: "#06b6d4",
    points: [
      "All admin/content-ops actions are audit-logged with user, action, timestamp, and IP",
      "Immutable audit log stored in S3 with write-once retention policy",
      "Billing changes trigger audit event: old state, new state, initiator",
      "DRM license issuances logged: device, title, timestamp, region",
      "Compliance with GDPR (EU), CCPA (California), COPPA (children's content)",
    ],
  },
];

const INTERVIEW_QUESTIONS = [
  { q: "How do you prevent URL sharing to bypass DRM?", a: "Signed manifest URLs with short TTL (6h) + HMAC-SHA256. Segments are also encrypted — even with the URL, segments can't be decrypted without the DRM license, which is device-bound." },
  { q: "What happens if a user's access token is stolen?", a: "15-minute TTL limits the damage. Immediate revocation via Redis revocation list. If device theft, user can deregister device from UI — invalidates all tokens for that device." },
  { q: "How do you handle GDPR deletion requests?", a: "Propagate deletion to Cassandra (profile + watch history), S3 (pseudonymized event data), search index, and CDN cache invalidation. PII hashing in the lake means most events become unanonymizable anyway." },
  { q: "Why does DRM fail closed instead of open?", a: "Studio licensing contracts require it. Content cannot be accessed without a valid device-bound license. This is a legal obligation, not a technical preference." },
  { q: "How do you enforce concurrent stream limits?", a: "Redis Lua script atomically: check current_count < plan_limit, INCR, SADD(sessionId), set TTL=36s. Heartbeat renews TTL. Atomic execution prevents race conditions." },
];

export function SecurityTab({ onNavigateTab }: { onNavigateTab?: (tab: TabSlug) => void }) {
  return (
    <div className="space-y-8 pb-10">
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "4px solid #ec4899" }}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Interview angle:</strong> Security comes up in two contexts — DRM (content protection, studio contracts) and data privacy (PII, GDPR). Know the DRM flow end-to-end and be able to explain why signed URLs + device-bound licenses prevent URL sharing.
        </p>
      </div>

      {/* DRM Flow */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>DRM License Flow</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>How Netflix prevents content piracy while keeping under 500ms playback startup.</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div
            className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-[11px] font-bold uppercase tracking-wider"
            style={{ background: "var(--bg-muted)", color: "var(--text-faint)", borderBottom: "1px solid var(--border)" }}
          >
            <span className="lg:col-span-1">Step</span>
            <span className="lg:col-span-3">Actor</span>
            <span className="lg:col-span-8">What happens</span>
          </div>
          {DRM_STEPS.map((s, index) => {
            const actorColor = ACTOR_COLORS[s.actor] ?? "#3b82f6";
            return (
              <div
                key={s.step}
                className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 lg:px-5 py-4"
                style={{ borderBottom: index < DRM_STEPS.length - 1 ? "1px solid var(--border)" : undefined }}
              >
                <div className="flex items-center lg:items-start lg:col-span-1">
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}
                  >
                    {s.step}
                  </span>
                </div>
                <div className="flex items-start lg:col-span-3">
                  <span
                    className="inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: `${actorColor}18`, color: actorColor, border: `1px solid ${actorColor}30` }}
                  >
                    {s.actor}
                  </span>
                </div>
                <p className="text-sm leading-relaxed lg:col-span-8" style={{ color: "var(--text-muted)" }}>
                  {s.action}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 p-4 rounded-2xl" style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}>
          <p className="text-sm font-semibold leading-relaxed" style={{ color: "#991b1b" }}>
            DRM FAILS CLOSED: No license = no CEK = no decryption = black screen. Studio contracts prohibit any plaintext fallback. This is the one place where user experience is legally subordinate to content protection.
          </p>
        </div>
      </div>

      {/* Security Topics Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text)" }}>Security Controls</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {SECURITY_TOPICS.map((topic) => (
            <div key={topic.title} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `3px solid ${topic.color}` }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: topic.color }}>{topic.title}</h3>
              <div className="space-y-1.5">
                {topic.points.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 mt-0.5" style={{ color: topic.color }}>▸</span>
                    <span style={{ color: "var(--text-muted)" }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Q&A */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>Common Interviewer Questions</h3>
        <div className="space-y-4">
          {INTERVIEW_QUESTIONS.map((item, i) => (
            <div key={i} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="px-4 py-2.5" style={{ background: "var(--blue-soft)", borderBottom: "1px solid var(--border)" }}>
                <span className="text-xs font-semibold" style={{ color: "var(--blue-text)" }}>Q: {item.q}</span>
              </div>
              <div className="px-4 py-3">
                <span className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.a}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SayThisBlock text="Netflix content security has two layers. Control plane: JWT auth (15-min TTL), entitlement check, concurrency check via atomic Redis Lua. After authorization, the client gets a signed manifest URL (HMAC-SHA256, 6h TTL) and a DRM license URL. Data plane: video segments are AES-128 encrypted. The Content Encryption Key is device-bound via the DRM license — it lives in the device's TEE and can never be extracted. Even if someone captures the CDN URL, they can't decrypt the segments without the device-bound license." />

      {onNavigateTab && (
        <button onClick={() => onNavigateTab("models")} className="w-full py-4 rounded-2xl text-sm font-semibold"
          style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--border)", cursor: "pointer" }}>
          Next: Data Models →
        </button>
      )}
    </div>
  );
}
