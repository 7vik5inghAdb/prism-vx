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
  SurveyAnswer,
} from "@/types";

// Anthropic context limit is ~200k tokens (≈ 4 chars/token). Leaving ~12k for
// the response means we want input under ~750k chars. We aggressively slim
// respondent data to fit a 100+ respondent panel.
const INPUT_CHAR_BUDGET = 600_000;

/**
 * A respondent is bloated mostly by repeated text:
 *   - personaProfile (a 200-word narrative duplicated per respondent)
 *   - answer.questionText (already in instrument.questions)
 *   - answer.variantText (already in instrument.variants.items)
 * Strip these. The LLM joins the data via questionId + variantId + clusterId.
 */
function slimSurveyRespondent(r: SurveyRespondent) {
  return {
    respondentId: r.respondentId,
    cluster: r.personaClusterName,
    answers: r.answers.map((a: SurveyAnswer) => ({
      qid: a.questionId,
      ...(a.variantId ? { vid: a.variantId } : {}),
      a: typeof a.answer === "string" ? truncate(a.answer, 600) : a.answer,
    })),
  };
}

function slimInterviewRespondent(r: InterviewRespondent) {
  return {
    respondentId: r.respondentId,
    cluster: r.personaClusterName,
    transcript: r.transcript.map((t) => ({
      q: truncate(t.question, 200),
      a: truncate(t.answer, 1200),
    })),
  };
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

// Precompute per-variant quantitative stats so the LLM doesn't have to do
// arithmetic on 100 respondents — it focuses on qualitative synthesis.
function precomputeVariantStats(
  respondents: SurveyRespondent[],
  instrument: ResearchInstrument
) {
  if (!instrument.variants) return null;

  const ratingQuestion = instrument.questions.find(
    (q) => q.type === "rating" && q.perVariant
  );
  const intentQuestion = instrument.questions.find(
    (q) => q.type === "likert" && q.perVariant
  );
  const intentPositive = new Set(["Agree", "Strongly Agree"]);

  return instrument.variants.items.map((v) => {
    const ratings: number[] = [];
    let intentYes = 0;
    let intentTotal = 0;
    for (const r of respondents) {
      for (const a of r.answers) {
        if (a.variantId !== v.id) continue;
        if (ratingQuestion && a.questionId === ratingQuestion.id) {
          const n = typeof a.answer === "number" ? a.answer : Number(a.answer);
          if (Number.isFinite(n)) ratings.push(n);
        }
        if (intentQuestion && a.questionId === intentQuestion.id) {
          intentTotal++;
          if (
            typeof a.answer === "string" &&
            intentPositive.has(a.answer)
          ) {
            intentYes++;
          }
        }
      }
    }
    const avg =
      ratings.length > 0
        ? Number(
            (ratings.reduce((s, x) => s + x, 0) / ratings.length).toFixed(2)
          )
        : null;
    const dist: Record<string, number> = {};
    for (const r of ratings) {
      const key = String(Math.round(r));
      dist[key] = (dist[key] ?? 0) + 1;
    }
    return {
      variantId: v.id,
      variantText: v.text,
      n: ratings.length,
      avgRating: avg,
      intentPositivePct:
        intentTotal > 0 ? Math.round((intentYes / intentTotal) * 100) : null,
      ratingDistribution: dist,
    };
  });
}

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
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const isAdrsConceptTest =
      !!body.instrument.variants && body.method === "survey";

    // Slim every respondent up front — this is where the savings come from
    let slimRespondents: unknown[];
    if (body.method === "survey") {
      slimRespondents = (body.respondents as SurveyRespondent[]).map(
        slimSurveyRespondent
      );
    } else {
      slimRespondents = (body.respondents as InterviewRespondent[]).map(
        slimInterviewRespondent
      );
    }

    // Precompute quant stats so the LLM has half the work done
    const variantStats =
      isAdrsConceptTest && body.method === "survey"
        ? precomputeVariantStats(
            body.respondents as SurveyRespondent[],
            body.instrument
          )
        : null;

    // Budget guard: if even the slim version is too big, sample respondents
    // while preserving cohort proportions.
    let respondentsForPrompt = slimRespondents;
    const slimSize = JSON.stringify(slimRespondents).length;
    if (slimSize > INPUT_CHAR_BUDGET) {
      const targetCount = Math.max(
        30,
        Math.floor(slimRespondents.length * (INPUT_CHAR_BUDGET / slimSize))
      );
      const stride = Math.max(
        1,
        Math.floor(slimRespondents.length / targetCount)
      );
      respondentsForPrompt = slimRespondents.filter((_, i) => i % stride === 0);
      console.warn(
        `[PRISM synthesize] Trimmed panel from ${slimRespondents.length} to ${respondentsForPrompt.length} for context fit`
      );
    }

    const userPrompt = buildSynthesisPrompt(
      body.method,
      respondentsForPrompt as never,
      body.instrument,
      body.personas,
      body.interpretation,
      body.context,
      variantStats
    );

    const promptChars = userPrompt.length;
    console.log(
      `[PRISM synthesize] prompt chars: ${promptChars} (~${Math.round(
        promptChars / 4
      )} tokens), respondents: ${
        Array.isArray(respondentsForPrompt) ? respondentsForPrompt.length : 0
      }`
    );

    // Leave headroom for the response. Anthropic Opus 4.1 is 200k context.
    const maxTokens = isAdrsConceptTest ? 8000 : 5000;

    const response = await callLLM({
      systemPrompt: SYNTHESIS_SYSTEM,
      userPrompt,
      temperature: 0.3,
      maxTokens,
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
