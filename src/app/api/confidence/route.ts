export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callLLM, parseJSON } from "@/lib/llm";
import { buildConfidencePrompt, CONFIDENCE_SYSTEM } from "@/lib/prompts";
import { ConfidenceScoreSchema } from "@/lib/schemas";
import type { ResearchMethod } from "@/types";

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

    const response = await callLLM({
      systemPrompt: CONFIDENCE_SYSTEM,
      userPrompt,
      temperature: 0.3,
      maxTokens: 1500,
      step: "step5_confidence",
    });

    const parsed = parseJSON(response.text, "confidence score");
    const validated = ConfidenceScoreSchema.parse(parsed);

    return NextResponse.json({ confidenceScore: validated });
  } catch (error) {
    console.error("Confidence API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Confidence scoring failed: ${message}` },
      { status: 500 }
    );
  }
}
