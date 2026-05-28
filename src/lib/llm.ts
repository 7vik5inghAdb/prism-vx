import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import type { ZodSchema } from "zod";

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
  /**
   * Optional output validator. When provided and the validator reports a
   * failure, callLLM will append the previous output + the validator error
   * to the next attempt's user prompt and ask the model to repair it. Up to
   * `maxValidationRetries` repair attempts before giving up.
   *
   * Return shape: `{ ok: true, value }` on success, where `value` will be
   * returned to the caller via LLMResponse.validatedValue. `{ ok: false,
   * error }` triggers a repair retry.
   */
  validate?: (raw: string) => ValidationResult;
  maxValidationRetries?: number;
}

export type ValidationResult<T = unknown> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export interface LLMResponse<T = unknown> {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
  /** Populated when a validate() callback was provided and succeeded. */
  validatedValue?: T;
}

function hashPrompt(prompt: string): string {
  return createHash("md5").update(prompt).digest("hex").slice(0, 8);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUserContent(
  prompt: string,
  images?: ImageInput[]
): Anthropic.Messages.ContentBlockParam[] | string {
  if (!images || images.length === 0) return prompt;
  const blocks: Anthropic.Messages.ContentBlockParam[] = [];
  for (const img of images) {
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
  blocks.push({ type: "text", text: prompt });
  return blocks;
}

/**
 * Single transport call to Anthropic — wraps retries on network/5xx errors.
 * The outer callLLM adds validation retries on top of this.
 */
async function singleCall(
  systemPrompt: string,
  userPrompt: string,
  images: ImageInput[] | undefined,
  temperature: number,
  maxTokens: number,
  modelTier: ModelTier | undefined,
  step: string | undefined,
  promptHash: string
): Promise<LLMResponse> {
  const model = modelTier === "simulation" ? MODEL_SIMULATION : MODEL_DEFAULT;
  const userContent = buildUserContent(userPrompt, images);
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const startTime = Date.now();
    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error(`Unexpected response type: ${content.type}`);
      }

      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          step: step ?? "unknown",
          model,
          promptHash,
          status: "success",
          durationMs: Date.now() - startTime,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          temperature,
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
          step: step ?? "unknown",
          promptHash,
          status: "error",
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        })
      );

      if (isLast) throw error;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }

  throw new Error("LLM call failed after maximum retries");
}

export async function callLLM<T = unknown>(
  params: LLMCallParams
): Promise<LLMResponse<T>> {
  const promptHash = hashPrompt(params.userPrompt);
  const temperature = params.temperature ?? 0.3;
  // Default cap bumped 4096 → 6000. Most callers set their own (synthesize
  // up to 16k); this default is a safety net for ad-hoc calls. Opus and
  // Haiku both have ample output budgets; 6000 reduces silent truncation.
  const maxTokens = params.maxTokens ?? 6000;
  const maxValidationRetries = params.maxValidationRetries ?? 2;

  let currentPrompt = params.userPrompt;
  let lastResponse: LLMResponse | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= maxValidationRetries; attempt++) {
    const response = await singleCall(
      params.systemPrompt,
      currentPrompt,
      params.images,
      temperature,
      maxTokens,
      params.modelTier,
      params.step,
      promptHash
    );
    lastResponse = response;

    if (!params.validate) {
      return response as LLMResponse<T>;
    }

    const result = params.validate(response.text);
    if (result.ok) {
      return { ...response, validatedValue: result.value as T };
    }

    // Validation failed — log and prepare a repair prompt for the next attempt.
    lastError = result.error;
    console.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        step: params.step ?? "unknown",
        promptHash,
        status: "validation_failed",
        attempt: attempt + 1,
        error: result.error.slice(0, 300),
      })
    );

    if (attempt < maxValidationRetries) {
      // Show the model its own bad output + the validator error and ask for
      // a surgical fix. 3000 chars (was 1200) lets the LLM see most or all
      // of its prior response, which is critical for diagnosing nested-field
      // failures (e.g. "variantPerformance.2.topPositives.0.quotes is
      // required" — needs to see what was emitted for variant 2).
      //
      // Images (params.images) are automatically re-passed via singleCall on
      // every loop iteration — no change needed; the original implementation
      // already preserves visual context across retries.
      const previousOutput = response.text.slice(0, 3000);
      currentPrompt = `${params.userPrompt}

---

YOUR PREVIOUS RESPONSE FAILED SCHEMA VALIDATION.

YOUR PREVIOUS OUTPUT (first 3000 chars):
${previousOutput}

VALIDATION ERROR:
${result.error}

REPAIR the output. Return ONLY a valid response that satisfies the schema described above. No commentary, no markdown fences — just the corrected JSON. Pay special attention to: required fields, exact field names, allowed enum values, and the JSON formatting rules called out in the original prompt. Re-use as much of the prior content as possible — only fix what the validator flagged.`;
    }
  }

  throw new Error(
    `LLM output failed validation after ${maxValidationRetries + 1} attempts. Last error: ${lastError}. Last raw output (first 300 chars): ${lastResponse?.text.slice(0, 300) ?? "(none)"}`
  );
}

/**
 * Convenience: build a validate() callback for callLLM that runs parseJSON +
 * Zod schema check. Designed for use with `callLLM({ validate: zodValidator(SomeSchema, "ctx") })`.
 * On parse/validation failure, returns a structured error string that callLLM
 * will feed back into the LLM via the repair retry mechanism.
 */
export function zodValidator<T>(
  schema: ZodSchema<T>,
  context: string
): (raw: string) => ValidationResult<T> {
  return (raw: string) => {
    let parsed: unknown;
    try {
      parsed = parseJSON(raw, context);
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    const result = schema.safeParse(parsed);
    if (result.success) return { ok: true, value: result.data };
    const summary = result.error.errors
      .slice(0, 10)
      .map((e) => `${e.path.join(".") || "<root>"}: ${e.message}`)
      .join("; ");
    return { ok: false, error: summary };
  };
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
