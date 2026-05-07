export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callLLM, parseJSON } from "@/lib/llm";
import { buildSynthesisPrompt, SYNTHESIS_SYSTEM } from "@/lib/prompts";
import {
  SynthesisResponseSchema,
  AdrsSynthesisResponseSchema,
} from "@/lib/schemas";
import type {
  PersonaCluster,
  ResearchInstrument,
  ResearchMethod,
  SurveyRespondent,
  InterviewRespondent,
  OrchestratorInterpretation,
  ResearchContext,
} from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      method: ResearchMethod;
      respondents: SurveyRespondent[] | InterviewRespondent[];
      instrument: ResearchInstrument;
      personas: PersonaCluster[];
      interpretation: OrchestratorInterpretation;
      context: ResearchContext;
    };

    if (
      !body.method ||
      !body.respondents ||
      !body.instrument ||
      !body.personas ||
      !body.interpretation ||
      !body.context
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const isAdrsConceptTest =
      !!body.instrument.variants && body.method === "survey";

    // For surveys, sample respondents to fit token budget — but include enough
    // for accurate variant performance computation. ADRS analyses need the
    // full panel since variant percentages are computed.
    let respondentsToPass: SurveyRespondent[] | InterviewRespondent[] = body.respondents;
    if (
      body.method === "survey" &&
      body.respondents.length > 60 &&
      !isAdrsConceptTest
    ) {
      const step = Math.floor(body.respondents.length / 30);
      respondentsToPass = (body.respondents as SurveyRespondent[])
        .filter((_, i) => i % step === 0)
        .slice(0, 30);
    }

    const userPrompt = buildSynthesisPrompt(
      body.method,
      respondentsToPass,
      body.instrument,
      body.personas,
      body.interpretation,
      body.context
    );

    const response = await callLLM({
      systemPrompt: SYNTHESIS_SYSTEM,
      userPrompt,
      temperature: 0.3,
      maxTokens: isAdrsConceptTest ? 12000 : 5000,
      step: isAdrsConceptTest ? "step5_synthesize_adrs" : "step5_synthesize",
    });

    const parsed = parseJSON(response.text, "synthesis");

    if (isAdrsConceptTest) {
      const validated = AdrsSynthesisResponseSchema.parse(parsed);
      return NextResponse.json({ synthesis: validated, isAdrs: true });
    } else {
      const validated = SynthesisResponseSchema.parse(parsed);
      return NextResponse.json({ synthesis: validated, isAdrs: false });
    }
  } catch (error) {
    console.error("Synthesize API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Synthesis failed: ${message}` },
      { status: 500 }
    );
  }
}
