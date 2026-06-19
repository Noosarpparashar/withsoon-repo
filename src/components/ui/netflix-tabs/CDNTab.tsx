"use client";

import { SayThisBlock } from "./shared";
import type { TabSlug } from "@/components/ui/NetflixPage";

const OCA_SELECTION_STEPS = [
  { step: "Client IP → ASN lookup", detail: "Determine client's ISP and geographic region from IP address." },
  { step: "Filter by content availability", detail: "Only OCAs that already have the requested title cached are eligible. No point routing to an OCA that will miss." },
  { step: "Score by BGP hop proximity", detail: "Fewer BGP hops = lower latency. Prefer co-located OCAs inside the client's ISP." },
  { step: "Score by OCA health + load", detail: "OCAs report health and current load to Steering Service. Overloaded or unhealthy OCAs are demoted." },
  { step: "Return ranked list of 3–5 OCAs", detail: "Client receives a prioritized list. Tries #1 first, falls back to #2 on failure, etc." },
  { step: "Client-side retry down the list", detail: "If segment fetch fails on OCA #1, client automatically retries OCA #2 without re-contacting the API tier." },
];

const TERM_CARDS = [
  { term: "Manifest", color: "#3b82f6", def: "A file (HLS: .m3u8 / DASH: .mpd) listing all available video segments and bitrate variants. Client downloads this first, then decides which quality tier to fetch." },
  { term: "Video Segment", color: "#10b981", def: "A 2–10 second chunk of encoded video. Player downloads these sequentially. Losing one is recoverable; the player buffers ahead." },
  { term: "Adaptive Bitrate (ABR)", color: "#f59e0b", def: "Player monitors bandwidth and switches between quality tiers automatically. If network slows, player switches to lower bitrate. Seamless to viewer." },
  { term: "OCA (Open Connect Appliance)", color: "#8b5cf6", def: "Netflix-custom hardware placed inside ISP data centers. Stores popular video content locally to eliminate transit hops between Netflix and ISP." },
  { term: "Signed URL", color: "#ec4899", def: "Manifest URL is HMAC-SHA256 signed with a 6-hour TTL. CDN validates signature before serving. Prevents URL sharing — the token is bound to the session." },
  { term: "Content Pre-positioning", color: "#06b6d4", def: "Nightly algorithm predicts next-day popular titles (using recommendation signals + release schedule) and proactively fills OCAs during off-peak hours via ISP peering links." },
];

const FALLBACK_CHAIN = [
  { level: "ISP OCA (co-located)", note: "Sub-ms disk read. >99% of requests for top titles.", color: "#10b981", target: "99% hit rate" },
  { level: "Exchange OCA (IXP)", note: "Internet Exchange Point OCA. Regional fallback on ISP OCA miss.", color: "#f59e0b", target: "<1% of requests" },
  { level: "Netflix S3 Origin", note: "Master copy. Rare fallback — only for long-tail titles or cache cold start.", color: "#ef4444", target: "<0.1% of requests" },
];

export function CDNTab({ onNavigateTab }: { onNavigateTab?: (tab: TabSlug) => void }) {
  return (
    <div className="space-y-8 pb-10">
      {/* Control vs Data plane */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Control Plane vs Data Plane</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          This is the single most important mental model for Netflix architecture. Interviewers expect you to state it clearly.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderTop: "3px solid #3b82f6" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "#3b82f6" }}>Control Plane — API Path</h3>
            <div className="space-y-2">
              {[
                { label: "Client", detail: "POST /playback/session" },
                { label: "API Gateway (Zuul2)", detail: "JWT validation, rate limiting" },
                { label: "Playback Service", detail: "Entitlement + concurrency + DRM fan-out" },
                { label: "Steering Service", detail: "Pick best OCA for client IP + title" },
                { label: "Returns", detail: "Signed manifest URL → OCA" },
              ].map((s, i, arr) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex flex-col items-center shrink-0" style={{ width: 20 }}>
                    <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: "#3b82f6" }} />
                    {i < arr.length - 1 && <div className="w-px flex-1" style={{ background: "#3b82f630", minHeight: 12 }} />}
                  </div>
                  <div>
                    <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{s.label}</span>
                    <span className="text-xs ml-1.5" style={{ color: "var(--text-muted)" }}>{s.detail}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg text-xs font-semibold" style={{ background: "#dbeafe", color: "#1e40af" }}>
              Total: ~85ms. API tier is done.
            </div>
          </div>

          <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderTop: "3px solid #f59e0b" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "#f59e0b" }}>Data Plane — After Manifest</h3>
            <div className="space-y-2 mb-4">
              {FALLBACK_CHAIN.map((level, i, arr) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex flex-col items-center shrink-0" style={{ width: 20 }}>
                    <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: level.color }} />
                    {i < arr.length - 1 && <div className="w-px flex-1" style={{ background: level.color + "30", minHeight: 12 }} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{level.level}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: level.color + "20", color: level.color }}>{level.target}</span>
                    </div>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{level.note}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-lg text-xs font-semibold" style={{ background: "#fef3c7", color: "#92400e" }}>
              300 Tbps of video bytes. API tier sees 0% of this.
            </div>
          </div>
        </div>
      </div>

      {/* OCA Selection */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>OCA Selection Algorithm</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Steering Service executes this on every playback session creation, returning a ranked OCA list.</p>
        <div className="space-y-2">
          {OCA_SELECTION_STEPS.map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}>{i + 1}</span>
              <div>
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{s.step}: </span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>{s.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terminology */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Key Terms</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Interviewers expect you to define these without hesitation.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TERM_CARDS.map((t) => (
            <div key={t.term} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `3px solid ${t.color}` }}>
              <span className="text-sm font-bold" style={{ color: t.color }}>{t.term}</span>
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>{t.def}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Economics card */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "4px solid #10b981" }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: "#10b981" }}>Why Netflix Built Its Own CDN</h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          At 300 Tbps, commercial CDN transit fees would exceed $500M/year. Netflix instead co-locates ~17,000 OCA appliances inside ISP networks, paying only hardware and negotiation costs. The ISP benefits too: local caching reduces their upstream transit. Cache hit rate for top-200 titles: &gt;99%.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          {[["~17,000", "OCA appliances globally"], [">99%", "cache hit (top-200 titles)"], ["Off-peak", "nightly fill window"]].map(([v, l]) => (
            <div key={l} className="px-4 py-3 rounded-xl text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div className="text-lg font-black font-mono" style={{ color: "#10b981" }}>{v}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Failure handling */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>CDN Failure Handling</h3>
        <div className="space-y-2">
          {[
            "Edge OCA unhealthy → Steering Service demotes it; clients route to next OCA in list",
            "Segment fetch times out → Player retries next OCA in manifest (client-side retry, no API call)",
            "Bandwidth drops → ABR player switches to lower bitrate variant — no buffering",
            "OCA cache cold (new title) → Falls back to Exchange OCA or S3 origin; fills cache for subsequent requests",
            "Regional network partition → Route53 shifts DNS to healthy region; active-active multi-region absorbs traffic",
          ].map((h, i) => (
            <div key={i} className="flex gap-2.5 items-start text-sm">
              <span className="shrink-0" style={{ color: "#10b981" }}>✓</span>
              <span style={{ color: "var(--text-muted)" }}>{h}</span>
            </div>
          ))}
        </div>
      </div>

      <SayThisBlock text="95% of Netflix traffic is video bytes flowing client-to-OCA. The control plane — auth, entitlement, session, DRM — handles <300ms of the user's click. After that, the API tier is completely out of the path. Netflix built Open Connect because at 300 Tbps, commercial CDN transit fees would cost hundreds of millions per year. OCA hardware inside ISP networks eliminates that cost entirely. The Steering Service picks the best OCA per client using ASN, title availability, health, and load — returning a ranked list so the player can retry down the list without another API call." />

      {onNavigateTab && (
        <button onClick={() => onNavigateTab("backend-track" as never)} className="w-full py-4 rounded-2xl text-sm font-semibold"
          style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--border)", cursor: "pointer" }}>
          Next: Content Upload + Encoding →
        </button>
      )}
    </div>
  );
}
