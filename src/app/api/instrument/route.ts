export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callLLM, parseJSON } from "@/lib/llm";
import { buildInstrumentPrompt, INSTRUMENT_SYSTEM } from "@/lib/prompts";
import { InstrumentSchema } from "@/lib/schemas";
import type {
  ResearchContext,
  OrchestratorInterpretation,
  PersonaCluster,
  ResearchMethod,
} from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      context: ResearchContext;
      interpretation: OrchestratorInterpretation;
      personas: PersonaCluster[];
      method: ResearchMethod;
    };

    if (!body.context || !body.interpretation || !body.personas || !body.method) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userPrompt = buildInstrumentPrompt(
      body.context,
      body.interpretation,
      body.personas,
      body.method
    );

    const response = await callLLM({
      systemPrompt: INSTRUMENT_SYSTEM,
      userPrompt,
      temperature: 0.3,
      maxTokens: 4000,
      step: "step3_instrument",
    });

    const parsed = parseJSON(response.text, "research instrument");
    const validated = InstrumentSchema.parse(parsed);

    return NextResponse.json({ instrument: validated });
  } catch (error) {
    console.error("Instrument API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate instrument: ${message}` },
      { status: 500 }
    );
  }
}
