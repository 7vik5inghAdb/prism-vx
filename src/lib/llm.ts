import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Opus for all reasoning/synthesis steps; Haiku for the bulk simulation work.
// Override via env vars in production.
export const MODEL_DEFAULT =
  process.env.PRISM_MODEL_DEFAULT || "claude-opus-4-1-20250805";
export const MODEL_SIMULATION =
  process.env.PRISM_MODEL_SIMULATION || "claude-haiku-4-5";

export type ModelTier = "default" | "simulation";

export interface ImageInput {
  // base64 data URL: "data:image/png;base64,..."
  dataUrl: string;
  mediaType?: string;
}

export interface LLMCallParams {
  systemPrompt: string;
  userPrompt: string;
  /** Optional images to include alongside the user text (Claude vision). */
  images?: ImageInput[];
  temperature?: number;
  maxTokens?: number;
  step?: string;
  modelTier?: ModelTier;
}

export interface LLMResponse {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
}

function hashPrompt(prompt: string): string {
  return createHash("md5").update(prompt).digest("hex").slice(0, 8);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callLLM(params: LLMCallParams): Promise<LLMResponse> {
  const maxRetries = 3;
  const promptHash = hashPrompt(params.userPrompt);
  const model =
    params.modelTier === "simulation" ? MODEL_SIMULATION : MODEL_DEFAULT;

  // Build user content blocks (text + optional images)
  let userContent: Anthropic.Messages.ContentBlockParam[] | string;
  if (params.images && params.images.length > 0) {
    const blocks: Anthropic.Messages.ContentBlockParam[] = [];
    for (const img of params.images) {
      const m = img.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) continue;
      const mediaType = (img.mediaType || m[1]) as
        | "image/jpeg"
        | "image/png"
        | "image/gif"
        | "image/webp";
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: m[2] },
      });
    }
    blocks.push({ type: "text", text: params.userPrompt });
    userContent = blocks;
  } else {
    userContent = params.userPrompt;
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const startTime = Date.now();
    try {
      const response = await client.messages.create({
        model,
        max_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.3,
        system: params.systemPrompt,
        messages: [{ role: "user", content: userContent }],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error(`Unexpected response type: ${content.type}`);
      }

      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          step: params.step ?? "unknown",
          model,
          promptHash,
          status: "success",
          durationMs: Date.now() - startTime,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        })
      );

      return {
        text: content.text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      const isLast = attempt === maxRetries - 1;
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          step: params.step ?? "unknown",
          promptHash,
          status: "error",
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        })
      );

      if (isLast) throw error;

      // Exponential backoff: 1s, 2s, 4s
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }

  throw new Error("LLM call failed after maximum retries");
}

/**
 * Parse LLM output that should be JSON. Strips markdown code fences if present.
 * Throws with a descriptive error if parsing fails.
 */
export function parseJSON<T>(raw: string, context: string): T {
  let cleaned = raw.trim();

  // Strip ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1];
  }

  // Try to find a JSON object or array if there's surrounding text
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      cleaned = jsonMatch[1];
    }
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `Failed to parse JSON for ${context}. Raw: ${raw.slice(0, 200)}...`
    );
  }
}
