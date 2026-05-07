export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callLLM, parseJSON } from "@/lib/llm";
import { buildPersonaPrompt, PERSONA_SYSTEM } from "@/lib/prompts";
import { PersonasSchema } from "@/lib/schemas";
import type { ResearchContext, OrchestratorInterpretation } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      context: ResearchContext;
      interpretation: OrchestratorInterpretation;
    };

    if (!body.context || !body.interpretation) {
      return NextResponse.json(
        { error: "Missing context or interpretation" },
        { status: 400 }
      );
    }

    const userPrompt = buildPersonaPrompt(body.context, body.interpretation);
    const response = await callLLM({
      systemPrompt: PERSONA_SYSTEM,
      userPrompt,
      temperature: 0.3,
      maxTokens: 3000,
      step: "step2_personas",
    });

    const parsed = parseJSON(response.text, "persona clusters");
    const validated = PersonasSchema.parse(parsed);

    return NextResponse.json({ personas: validated.clusters });
  } catch (error) {
    console.error("Personas API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate personas: ${message}` },
      { status: 500 }
    );
  }
}
