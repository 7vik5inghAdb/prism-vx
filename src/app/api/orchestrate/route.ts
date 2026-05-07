export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callLLM, parseJSON } from "@/lib/llm";
import { buildOrchestratorPrompt, ORCHESTRATOR_SYSTEM } from "@/lib/prompts";
import { OrchestratorInterpretationSchema } from "@/lib/schemas";
import type { ResearchContext } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { context: ResearchContext };

    if (!body.context) {
      return NextResponse.json({ error: "Missing context" }, { status: 400 });
    }

    const { context } = body;

    if (!context.hypothesis || !context.productDescription || !context.targetAudience || !context.objectives) {
      return NextResponse.json(
        { error: "All required fields must be filled: hypothesis, productDescription, targetAudience, objectives" },
        { status: 400 }
      );
    }

    const userPrompt = buildOrchestratorPrompt(context);
    const response = await callLLM({
      systemPrompt: ORCHESTRATOR_SYSTEM,
      userPrompt,
      temperature: 0.3,
      maxTokens: 1500,
      step: "step1_orchestrate",
    });

    const parsed = parseJSON(response.text, "orchestrator interpretation");
    const validated = OrchestratorInterpretationSchema.parse(parsed);

    return NextResponse.json({ interpretation: validated });
  } catch (error) {
    console.error("Orchestrate API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to interpret research context: ${message}` },
      { status: 500 }
    );
  }
}
