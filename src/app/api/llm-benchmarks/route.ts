import { NextResponse } from "next/server";
import scores from "@/lib/llm-scores.json";

export const revalidate = 86400; // cache 24 hours

// Providers whose models are always proprietary
const PROPRIETARY_PROVIDERS = new Set([
  "openai", "anthropic", "google", "x-ai", "mistralai",
  "muse", "mercury", "minimax", "cohere", "amazon",
]);

// Model IDs that are open-weight regardless of provider heuristic
const OPEN_WEIGHT_IDS = new Set([
  "moonshot/kimi-k2",
  "deepseek/deepseek-v4-pro",
  "deepseek/deepseek-r1",
  "deepseek/deepseek-chat",
  "nvidia/nemotron-3-ultra",
  "mimo/mimo-v2.5-pro",
  "openai/gpt-oss-120b",
  "qwen/qwen3.7-max",
  "qwen/qwen3.5-0.8b",
  "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.1-8b-instruct",
  "mistralai/mistral-large",
  "mistralai/mixtral-8x7b-instruct",
  "google/gemma-3-27b-it",
  "microsoft/phi-4",
]);

function isOpen(id: string, huggingFaceId: string | null): boolean {
  if (OPEN_WEIGHT_IDS.has(id)) return true;
  if (huggingFaceId) return true; // has HF repo = open weights
  const provider = id.split("/")[0];
  return !PROPRIETARY_PROVIDERS.has(provider);
}

function blendedPrice(prompt: string, completion: string): number {
  // blended = 30% input + 70% output, converted to $/1M tokens
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
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);

    const json = await res.json();
    const allModels: BenchmarkModel[] = [];
    const scoreMap = scores as unknown as Record<string, number>;

    for (const m of json.data ?? []) {
      const id: string = m.id ?? "";
      if (!id || !m.pricing) continue;

      const price = blendedPrice(
        m.pricing.prompt ?? "0",
        m.pricing.completion ?? "0"
      );

      // Skip free/zero-price models and those with missing completion pricing
      if (price === 0) continue;

      const intel = scoreMap[id] ?? null;
      const open = isOpen(id, m.hugging_face_id ?? null);

      allModels.push({
        id,
        name: m.name ?? id,
        intel,
        price,
        open,
        contextLength: m.context_length ?? 0,
      });
    }

    // Sort: models with intel scores first (by score desc), then rest by name
    allModels.sort((a, b) => {
      if (a.intel !== null && b.intel !== null) return b.intel - a.intel;
      if (a.intel !== null) return -1;
      if (b.intel !== null) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ models: allModels, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("llm-benchmarks route error:", err);
    return NextResponse.json({ error: "Failed to fetch model data" }, { status: 500 });
  }
}
