"use client";

import { CHEAT_SHEET } from "@/components/ui/netflix-system-data";
import { DbTablesView, CodeBlockWithCopy } from "./shared";
import { DbDecisionTree } from "./InterviewTab";
import type { TabSlug } from "@/components/ui/NetflixPage";

function CheatSheetTab({ onNavigateTab: _onNavigateTab }: { onNavigateTab?: (tab: TabSlug) => void }) {
  return (
    <div className="space-y-10">
      {/* Critical Numbers */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
          Critical Numbers
        </h2>
        <CodeBlockWithCopy code={CHEAT_SHEET.criticalNumbers} />
      </div>

      {/* DB Decision Tree */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
          Database Decision Tree
        </h2>
        <DbDecisionTree />
      </div>

      {/* Kafka Config */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
          Kafka Zero-Loss Configuration
        </h2>
        <CodeBlockWithCopy code={CHEAT_SHEET.kafkaConfig} language="properties" />
      </div>

      {/* Iceberg Partition Rules */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
          Iceberg Partition Rules
        </h2>
        <CodeBlockWithCopy code={CHEAT_SHEET.icebergPartition} />
      </div>

      {/* Fallback Matrix */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Fallback Matrix (Resilience4j / Hystrix)
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--text-faint)" }}>
          Hystrix is in maintenance mode. Netflix&apos;s modern services use Resilience4j for circuit breaking. The pattern is identical — the fallback behavior below applies to both.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th className="text-left py-3 px-4" style={{ color: "var(--text-muted)" }}>Service Failure</th>
                <th className="text-left py-3 px-4" style={{ color: "var(--text-muted)" }}>Fallback Behavior</th>
              </tr>
            </thead>
            <tbody>
              {CHEAT_SHEET.fallbackMatrix.map((row, i) => (
                <tr key={i} style={{ borderBottom: i < CHEAT_SHEET.fallbackMatrix.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td className="py-3 px-4 font-medium" style={{ color: "var(--text)" }}>
                    {row.service}
                  </td>
                  <td className="py-3 px-4" style={{ color: "var(--text-muted)" }}>
                    {row.fallback}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interview Phrases */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-xl font-bold mb-5" style={{ color: "var(--text)" }}>
          Interview Power Phrases
        </h2>
        <div className="space-y-3">
          {CHEAT_SHEET.interviewPhrases.map((phrase, i) => (
            <div
              key={i}
              className="flex gap-3 p-4 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <span
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "var(--blue-soft)", color: "var(--blue-text)" }}
              >
                {i + 1}
              </span>
              <p className="text-sm italic leading-relaxed" style={{ color: "var(--text)" }}>
                &ldquo;{phrase}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { CheatSheetTab };
