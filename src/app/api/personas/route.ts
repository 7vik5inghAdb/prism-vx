// 300 s — personas generation can pause on a busy Opus instance. Local dev
// ignores this; Vercel paid plan honors it.
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { callLLM, zodValidator } from "@/lib/llm";
import { buildPersonaPrompt, PERSONA_SYSTEM } from "@/lib/prompts";
import { PersonasSchema } from "@/lib/schemas";
import type { ResearchContext, OrchestratorInterpretation } from "@/types";
import type { z } from "zod";

type PersonasPayload = z.infer<typeof PersonasSchema>;

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
    const response = await callLLM<PersonasPayload>({
      systemPrompt: PERSONA_SYSTEM,
      userPrompt,
      // 0.7 — personas should have some creative spread across clusters but
      // remain grounded in the audience description.
      temperature: 0.7,
      maxTokens: 3000,
      step: "step2_personas",
      validate: zodValidator(PersonasSchema, "persona clusters"),
    });

    return NextResponse.json({ personas: response.validatedValue!.clusters });
  } catch (error) {
    console.error("Personas API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate personas: ${message}` },
      { status: 500 }
    );
  }
}
