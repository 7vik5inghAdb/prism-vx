export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callLLM, zodValidator } from "@/lib/llm";
import { buildOrchestratorPrompt, ORCHESTRATOR_SYSTEM } from "@/lib/prompts";
import { OrchestratorInterpretationSchema } from "@/lib/schemas";
import type { ResearchContext, OrchestratorInterpretation } from "@/types";

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

    // Collect image attachments AND per-variant images to send as Claude
    // vision content blocks. Reference attachments help with context; variant
    // images let the orchestrator classify the study type accurately.
    const referenceImages = (context.attachments || [])
      .filter((a) => a.kind === "image" && a.content)
      .map((a) => ({ dataUrl: a.content, mediaType: a.mediaType }));
    const variantImages = (Array.isArray(context.variants) ? context.variants : [])
      .filter((v) => v.image && v.image.content)
      .map((v) => ({
        dataUrl: v.image!.content,
        mediaType: v.image!.mediaType,
      }));
    const imageInputs = [...referenceImages, ...variantImages];

    const response = await callLLM<OrchestratorInterpretation>({
      systemPrompt: ORCHESTRATOR_SYSTEM,
      userPrompt,
      images: imageInputs.length > 0 ? imageInputs : undefined,
      // 0.4 — interpretation should be predictable; small temperature reduces
      // study-type misclassification across runs without going fully deterministic.
      temperature: 0.4,
      maxTokens: 2000,
      step: "step1_orchestrate",
      validate: zodValidator(
        OrchestratorInterpretationSchema,
        "orchestrator interpretation"
      ),
    });

    return NextResponse.json({ interpretation: response.validatedValue });
  } catch (error) {
    console.error("Orchestrate API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to interpret research context: ${message}` },
      { status: 500 }
    );
  }
}
