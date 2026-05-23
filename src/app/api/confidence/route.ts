export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callLLM, zodValidator } from "@/lib/llm";
import { buildConfidencePrompt, CONFIDENCE_SYSTEM } from "@/lib/prompts";
import { ConfidenceScoreSchema } from "@/lib/schemas";
import type { ResearchMethod } from "@/types";
import type { z } from "zod";

type ConfidencePayload = z.infer<typeof ConfidenceScoreSchema>;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      primaryFindings: object;
      method: ResearchMethod;
      panelSize: number;
      hypothesis: string;
      studyType?: string;
    };

    if (!body.primaryFindings || !body.method || !body.hypothesis) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userPrompt = buildConfidencePrompt(
      body.primaryFindings,
      body.method,
      body.panelSize,
      body.hypothesis,
      body.studyType
    );

    const response = await callLLM<ConfidencePayload>({
      systemPrompt: CONFIDENCE_SYSTEM,
      userPrompt,
      // 0.5 — needs to be high enough to differentiate study quality across
      // runs, but stable enough that the same study + same data produces a
      // similar score on repeat. The previous 0.2 was too precision-tuned and
      // collapsed every study to ~72 (anchored on the prompt's old midpoint).
      temperature: 0.5,
      maxTokens: 1500,
      step: "step5_confidence",
      validate: zodValidator(ConfidenceScoreSchema, "confidence score"),
    });

    return NextResponse.json({ confidenceScore: response.validatedValue });
  } catch (error) {
    console.error("Confidence API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Confidence scoring failed: ${message}` },
      { status: 500 }
    );
  }
}
