export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callLLM, zodValidator } from "@/lib/llm";
import { buildInstrumentPrompt, INSTRUMENT_SYSTEM } from "@/lib/prompts";
import { InstrumentSchema } from "@/lib/schemas";
import { getQuestionScope } from "@/types";
import type {
  ResearchContext,
  OrchestratorInterpretation,
  PersonaCluster,
  ResearchMethod,
  ResearchInstrument,
} from "@/types";

/**
 * Identify obvious coverage gaps in the generated instrument so we can do
 * one repair retry before returning. Returns null if coverage is good, or a
 * one-liner the LLM should address.
 */
function findCoverageGap(
  instrument: ResearchInstrument,
  context: ResearchContext
): string | null {
  const variantCount = context.variants?.length ?? 0;
  const qs = instrument.questions ?? [];
  if (qs.length < 5)
    return `instrument has only ${qs.length} questions — generate at least 5 distinct questions.`;
  if (qs.length > 18)
    return `instrument has ${qs.length} questions — trim to at most 18 so respondents don't fatigue.`;
  const hasOpenEnded = qs.some((q) => q.type === "open_ended");
  if (!hasOpenEnded)
    return "no open_ended question — include at least 1 open_ended for qualitative depth.";
  if (variantCount > 0) {
    const hasPerVariant = qs.some((q) => getQuestionScope(q) === "per_variant");
    if (!hasPerVariant)
      return "this study has variants but no per_variant-scoped question — add at least one per_variant question so each variant gets evaluated individually.";
  }
  if (variantCount > 1) {
    const hasCrossVariant = qs.some(
      (q) => getQuestionScope(q) === "cross_variant"
    );
    if (!hasCrossVariant)
      return "this study compares multiple variants but no cross_variant-scoped question exists — add at least one cross_variant question that compares the variants head-to-head.";
  }
  return null;
}

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

    const response = await callLLM<ResearchInstrument>({
      systemPrompt: INSTRUMENT_SYSTEM,
      userPrompt,
      // 0.5 — structured question design, slight room for creative phrasing
      // without drifting from the method's analytical shape.
      temperature: 0.5,
      maxTokens: 4000,
      step: "step3_instrument",
      validate: zodValidator(InstrumentSchema, "research instrument"),
    });

    let instrument = response.validatedValue!;

    // §5C: post-validation coverage check. One repair-pass if needed.
    const gap = findCoverageGap(instrument, body.context);
    if (gap) {
      console.warn(
        JSON.stringify({
          step: "step3_instrument",
          status: "coverage_gap",
          gap,
        })
      );
      const repairPrompt = `${userPrompt}

---

YOUR PREVIOUS DRAFT MISSED A COVERAGE REQUIREMENT:
${gap}

Regenerate the instrument with this addressed. Return ONLY valid JSON matching the schema.`;
      const repair = await callLLM<ResearchInstrument>({
        systemPrompt: INSTRUMENT_SYSTEM,
        userPrompt: repairPrompt,
        temperature: 0.5,
        maxTokens: 4000,
        step: "step3_instrument_repair",
        validate: zodValidator(InstrumentSchema, "research instrument repair"),
      });
      instrument = repair.validatedValue!;
    }

    return NextResponse.json({ instrument });
  } catch (error) {
    console.error("Instrument API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate instrument: ${message}` },
      { status: 500 }
    );
  }
}
