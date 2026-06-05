import { NextResponse } from "next/server";
import scores from "@/lib/llm-scores.json";

export const revalidate = 3600; // 1 hour cache

// Always proprietary — no open weights released
const PROPRIETARY_PROVIDERS = new Set([
  "openai", "anthropic", "google", "x-ai",
  "muse", "mercury", "cohere", "amazon",
]);

// Always open-weight — override provider heuristic
const OPEN_WEIGHT_PREFIXES = [
  "moonshotai/kimi",     // Kimi K2 is open-weight
  "deepseek/",
  "nvidia/nemotron",
  "meta-llama/",
  "mistralai/",
  "qwen/",
  "microsoft/phi",
  "google/gemma",
  "01-ai/",
  "minimax/",            // MiniMax released open weights
];

function isOpen(id: string, huggingFaceId: string | null): boolean {
  if (huggingFaceId) return true;
  for (const prefix of OPEN_WEIGHT_PREFIXES) {
    if (id.startsWith(prefix)) return true;
  }
  const provider = id.split("/")[0];
  return !PROPRIETARY_PROVIDERS.has(provider);
}

function blendedPrice(prompt: string, completion: string): number {
  const p = parseFloat(prompt) || 0;
  const c = parseFloat(completion) || 0;
  return parseFloat(((p * 0.3 + c * 0.7) * 1_000_000).toFixed(3));
}

export type BenchmarkModel = {
  id: string;
  name: string;
  intel: number | null;
  price: number;
  open: boolean;
  contextLength: number;
};

export async function GET() {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);

    const json = await res.json();
    const scoreMap = scores as unknown as Record<string, number>;

    const allModels: BenchmarkModel[] = [];

    for (const m of json.data ?? []) {
      const id: string = m.id ?? "";
      if (!id || !m.pricing) continue;

      const price = blendedPrice(
        m.pricing.prompt ?? "0",
        m.pricing.completion ?? "0"
      );
      if (price === 0) continue;

      allModels.push({
        id,
        name: (m.name ?? id).replace(/^[^:]+:\s*/, ""), // strip "Provider: " prefix
        intel: scoreMap[id] ?? null,
        price,
        open: isOpen(id, m.hugging_face_id ?? null),
        contextLength: m.context_length ?? 0,
      });
    }

    // Both charts use only scored models — so you can compare quality vs cost
    const scoredModels = allModels
      .filter((m) => m.intel !== null);

    // Intel list: sorted by score desc
    const intelModels = [...scoredModels]
      .sort((a, b) => (b.intel ?? 0) - (a.intel ?? 0));

    // Price list: same models, sorted cheapest first
    const priceModels = [...scoredModels]
      .sort((a, b) => a.price - b.price);

    return NextResponse.json({
      intelModels,
      priceModels,
      totalModels: allModels.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("llm-benchmarks error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
