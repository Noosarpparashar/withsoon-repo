"use client";

import { useState } from "react";
import { SayThisBlock } from "./shared";
import type { TabSlug } from "@/components/ui/NetflixPage";

const PIPELINE_STAGES = [
  {
    id: "upload", label: "Studio Upload", icon: "⬆",
    summary: "Master file arrives from studio",
    detail: "Studio uploads original master file (often 4K RAW or ProRes). Checksum validated before acceptance. Stored in raw object storage (S3). Triggers encoding workflow.",
    considerations: ["Validate checksum (MD5/SHA256) before storing", "Immutable raw storage — never overwrite originals", "Store original metadata: codec, resolution, frame rate, audio tracks"],
  },
  {
    id: "validate", label: "Validation", icon: "✓",
    summary: "Quality and format checks",
    detail: "Automated checks: video format compatibility, audio track presence, subtitle file validation, DRM metadata, content length vs. expected. Failures block the pipeline and alert ops.",
    considerations: ["Fail fast — reject invalid content before expensive transcoding", "Log structured validation results for debugging", "Human review gate for borderline failures"],
  },
  {
    id: "metadata", label: "Metadata Ingest", icon: "📋",
    summary: "Title metadata written to Catalog",
    detail: "Episode title, description, cast, maturity rating, regional availability, language tracks. Written to Catalog DB as a draft (not yet published). CMS operators review before publish.",
    considerations: ["Metadata is separate from video encoding — can proceed in parallel", "Regional licensing entries created per country", "Draft state prevents premature catalog exposure"],
  },
  {
    id: "transcode", label: "Transcoding", icon: "⚙",
    summary: "Generate all bitrate/resolution variants",
    detail: "Parallel transcoding jobs for each output profile. Typically 15–20 output variants per title. Each variant is an independent job — failures are retried independently.",
    considerations: ["Idempotent jobs — safe to retry on failure", "Job queue (SQS/Kafka) for work distribution", "Spot compute for cost efficiency (long jobs)", "Codec ladder: H.264 for wide compatibility, H.265/AV1 for premium quality"],
  },
  {
    id: "audio", label: "Audio & Subtitles", icon: "🔊",
    summary: "Multi-language audio + subtitle tracks",
    detail: "Generate dubbed audio tracks per language. Process subtitle files (SRT/VTT). Timing sync validation. Subtitle burn-in for some device profiles.",
    considerations: ["Each language is a separate async job", "Subtitle timing drift detection", "Accessibility tracks (SDH, AD) treated as P0"],
  },
  {
    id: "package", label: "Packaging (HLS/DASH)", icon: "📦",
    summary: "Segment video into HLS and DASH manifests",
    detail: "Segment encoded video into 2–6 second chunks. Generate HLS (.m3u8) and DASH (.mpd) manifests listing all variants and their segment URLs. Package audio/subtitle tracks alongside.",
    considerations: ["Segment duration: 2s for live, 4–6s for VOD (tradeoff: startup latency vs. seek precision)", "Manifest includes all bitrate variants — client picks adaptively", "Segment names are content-addressed (hash) for CDN caching"],
  },
  {
    id: "encrypt", label: "DRM Encryption", icon: "🔐",
    summary: "Encrypt segments with Content Encryption Key (CEK)",
    detail: "Each title gets a CEK. Segments encrypted using AES-128 (Widevine/FairPlay/PlayReady). CEK stored in Key Management Service (KMS/HSM). Encrypted segments replace plaintext in storage.",
    considerations: ["CEK stored in HSM — never in application layer", "Per-title key rotation supported", "Widevine (Android/Chrome), FairPlay (Apple), PlayReady (Microsoft)", "Studio contracts require FAIL CLOSED if license unavailable"],
  },
  {
    id: "thumbnails", label: "Thumbnails & Artwork", icon: "🖼",
    summary: "Generate thumbnails and personalized artwork",
    detail: "Scene thumbnails for player seek bar. Multiple artwork variants for A/B testing (personalized per profile). Stored in object storage and served via image CDN.",
    considerations: ["Seek thumbnails generated at 10s intervals", "Artwork variants tested for CTR improvement", "NSFW/content rating filtering on thumbnails"],
  },
  {
    id: "qc", label: "Quality Check", icon: "🔬",
    summary: "Automated and manual quality validation",
    detail: "VMAF/PSNR scoring on encoded output. Playback probe: download and decode each variant. Audio sync check. Subtitle timing validation. Human QC for high-profile releases.",
    considerations: ["VMAF score threshold per quality tier", "Automated probe plays first 30s of each variant", "Failed QC blocks publish — retry transcoding with different settings"],
  },
  {
    id: "distribute", label: "CDN Distribution", icon: "🌐",
    summary: "Push encoded assets to OCA edges",
    detail: "After QC pass, assets replicated to S3 origin. Nightly fill algorithm proactively pushes high-demand titles to ISP OCA nodes. Low-demand titles remain on S3 until first request.",
    considerations: ["Popular titles pre-pushed before release window", "Long-tail titles on-demand from S3 (cache-fill on first OCA miss)", "Multi-region replication for disaster recovery"],
  },
  {
    id: "publish", label: "Catalog Publish", icon: "✅",
    summary: "Title marked available in catalog by region/time",
    detail: "Atomic transition: content state → PUBLISHED. Regional availability windows respected (some titles available at specific local times). Cache invalidated. Title appears in browse/search.",
    considerations: ["Publish is reversible — can move back to DRAFT", "Regional publish windows differ (primetime local time)", "Search index updated asynchronously after publish"],
  },
];

const ENCODING_VARIANTS = [
  { resolution: "3840×2160", label: "4K UHD", bitrate: "15–25 Mbps", codec: "H.265 / AV1", devices: "4K TVs, high-end mobile" },
  { resolution: "1920×1080", label: "1080p Full HD", bitrate: "5–10 Mbps", codec: "H.264 / H.265", devices: "Most smart TVs, laptops" },
  { resolution: "1280×720",  label: "720p HD", bitrate: "2.5–5 Mbps", codec: "H.264", devices: "Mid-range mobile, tablets" },
  { resolution: "960×540",   label: "540p", bitrate: "1–2.5 Mbps", codec: "H.264", devices: "Low-bandwidth fallback" },
  { resolution: "640×480",   label: "480p SD", bitrate: "0.5–1 Mbps", codec: "H.264", devices: "Very low bandwidth / mobile data" },
  { resolution: "320×240",   label: "240p", bitrate: "0.2–0.5 Mbps", codec: "H.264", devices: "2G/3G mobile fallback" },
];

const STATE_MACHINE = [
  { state: "UPLOADED",    color: "#6b7280" },
  { state: "VALIDATED",   color: "#3b82f6" },
  { state: "ENCODING",    color: "#f59e0b" },
  { state: "QC_PENDING",  color: "#8b5cf6" },
  { state: "PACKAGED",    color: "#06b6d4" },
  { state: "ENCRYPTED",   color: "#ec4899" },
  { state: "DISTRIBUTING",color: "#10b981" },
  { state: "PUBLISHED",   color: "#22c55e" },
  { state: "ARCHIVED",    color: "#374151" },
];

export function EncodingTab({ onNavigateTab }: { onNavigateTab?: (tab: TabSlug) => void }) {
  const [openStage, setOpenStage] = useState<string | null>("transcode");

  return (
    <div className="space-y-8 pb-10">
      {/* State Machine */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Content Lifecycle State Machine</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Every title transitions through these states. A title is never published until all required assets pass QC.</p>
        <div className="flex flex-wrap items-center gap-2 p-5 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {STATE_MACHINE.map((s, i) => (
            <div key={s.state} className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: s.color + "18", color: s.color, border: `1px solid ${s.color}40` }}>
                {s.state}
              </span>
              {i < STATE_MACHINE.length - 1 && <span className="text-sm" style={{ color: "var(--text-faint)" }}>→</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-faint)" }}>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Validation fail → UPLOADED (retry)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />QC fail → ENCODING (retry with new settings)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />PUBLISHED → ARCHIVED (when licensing expires)</span>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Pipeline Stages</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Click any stage for implementation details and design considerations.</p>
        <div className="space-y-2">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isOpen = openStage === stage.id;
            return (
              <div key={stage.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-opacity hover:opacity-80"
                  style={{ background: isOpen ? "var(--bg-card)" : "var(--bg)", cursor: "pointer", border: "none" }}
                  onClick={() => setOpenStage(isOpen ? null : stage.id)}
                  aria-expanded={isOpen}
                >
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                    style={{ background: "var(--blue-soft)" }}>{stage.icon}</span>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{stage.label}</span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>{stage.summary}</span>
                  </div>
                  <span className="text-xs transition-transform duration-200" style={{ color: "var(--text-faint)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
                    <p className="pt-3 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{stage.detail}</p>
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Design Considerations</div>
                      {stage.considerations.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="shrink-0 mt-0.5" style={{ color: "#3b82f6" }}>▸</span>
                          <span style={{ color: "var(--text-muted)" }}>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Encoding Variants */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Encoding Variants (Codec Ladder)</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Each title is transcoded into 15–20 output profiles. Client ABR selects the right one based on bandwidth and device capability.</p>
        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                {["Resolution", "Quality", "Bitrate Range", "Codec", "Device Compatibility"].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {ENCODING_VARIANTS.map((v, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg)" : "var(--bg-card)" }}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text)" }}>{v.resolution}</td>
                  <td className="px-4 py-3 font-semibold text-xs" style={{ color: "var(--text)" }}>{v.label}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#3b82f6" }}>{v.bitrate}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#8b5cf6" }}>{v.codec}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{v.devices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Idempotency */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "4px solid #8b5cf6" }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: "#8b5cf6" }}>Idempotency & Job Queue Design</h3>
        <div className="space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <p>Each encoding job has a deterministic job ID = hash(titleId + outputProfile + inputChecksum). Re-submitting the same job is a no-op if output already exists in storage.</p>
          <p>Job queue (SQS/Kafka): jobs are visibility-timeout based. If a worker crashes mid-job, the message reappears after timeout for another worker to pick up.</p>
          <p>Output written to a content-addressed path (hash of output). Final step: atomic rename/link to canonical path once complete. Readers always see either old complete output or new complete output — never partial.</p>
        </div>
      </div>

      <SayThisBlock text="Content encoding is an async pipeline with a well-defined state machine: UPLOADED → VALIDATED → ENCODING → QC → PACKAGED → ENCRYPTED → DISTRIBUTING → PUBLISHED. Each stage is an independent idempotent job. Encoding generates 15–20 variants per title for adaptive bitrate. The DRM encryption step wraps each segment in AES-128 using a CEK stored in HSM. A title is never published until all required variants pass automated QC. The nightly fill algorithm then proactively pushes high-demand titles to OCA edges before peak viewing." />

      {onNavigateTab && (
        <button onClick={() => onNavigateTab("data-engineering" as never)} className="w-full py-4 rounded-2xl text-sm font-semibold"
          style={{ background: "var(--blue-soft)", color: "var(--blue-text)", border: "1px solid var(--border)", cursor: "pointer" }}>
          Next: Data Pipeline →
        </button>
      )}
    </div>
  );
}
