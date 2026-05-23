export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callLLM, zodValidator } from "@/lib/llm";
import { buildSynthesisPrompt, SYNTHESIS_SYSTEM } from "@/lib/prompts";
import {
  SynthesisResponseSchema,
  AdrsSynthesisResponseSchema,
} from "@/lib/schemas";
import { z } from "zod";
import { getQuestionScope } from "@/types";
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

// §5E self-critique output. All fields optional so a "no concerns" critique
// passes through cleanly. The merge step uses revised summaries when present.
const CritiqueSchema = z.object({
  overstatements: z.array(z.string()).default([]),
  missingDissent: z.array(z.string()).default([]),
  ungroundedClaims: z.array(z.string()).default([]),
  revisedExecutiveSummary: z.string().optional(),
  revisedQualitativeOverview: z.string().optional(),
});
type Critique = z.infer<typeof CritiqueSchema>;

/**
 * §5D — measure how much spread exists in numeric ratings across the panel.
 * Low variance means respondents converged on the same number, which is a
 * realistic Hämäläinen-Journey-bias warning sign on a synthetic panel. We
 * surface it to the synthesis prompt so the LLM can comment honestly instead
 * of treating uniformity as a strong signal.
 *
 * Returns the population std-dev across all numeric answers across all
 * variants. Null when there's nothing numeric to measure.
 */
function computePanelVariance(
  respondents: SurveyRespondent[] | InterviewRespondent[],
  method: ResearchMethod
): { stdDev: number; mean: number; n: number } | null {
  if (method === "interview") return null;
  const values: number[] = [];
  for (const r of respondents as SurveyRespondent[]) {
    for (const a of r.answers ?? []) {
      if (typeof a.answer === "number" && Number.isFinite(a.answer)) {
        values.push(a.answer);
      }
    }
  }
  if (values.length < 10) return null;
  const mean = values.reduce((s, x) => s + x, 0) / values.length;
  const variance =
    values.reduce((s, x) => s + (x - mean) ** 2, 0) / values.length;
  return { stdDev: Math.sqrt(variance), mean, n: values.length };
}

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
  const answers = Array.isArray(r.answers) ? r.answers : [];
  return {
    respondentId: r.respondentId,
    cluster: r.personaClusterName,
    answers: answers.map((a: SurveyAnswer) => ({
      qid: a.questionId,
      ...(a.variantId ? { vid: a.variantId } : {}),
      a: typeof a.answer === "string" ? truncate(a.answer, 600) : a.answer,
    })),
  };
}

function slimInterviewRespondent(r: InterviewRespondent) {
  const transcript = Array.isArray(r.transcript) ? r.transcript : [];
  return {
    respondentId: r.respondentId,
    cluster: r.personaClusterName,
    transcript: transcript.map((t) => ({
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

  // Use getQuestionScope so this works for instruments that emit the new
  // `scope: "per_variant"` field AND legacy fixtures that still set
  // `perVariant: true`. Pre-fix this used `q.perVariant` directly and silently
  // returned 0 ratings for every newly-generated instrument (the ADRS
  // quantitative section degraded to zeros without any error).
  const ratingQuestion = instrument.questions.find(
    (q) => q.type === "rating" && getQuestionScope(q) === "per_variant"
  );
  const intentQuestion = instrument.questions.find(
    (q) => q.type === "likert" && getQuestionScope(q) === "per_variant"
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

    // Normalize: every non-interview method (survey/maxdiff/kano/conjoint/
    // concept_test) produces SurveyRespondents at the simulator. Picking by
    // respondent shape instead of method name avoids the historic bug where
    // `method === "survey"` excluded MaxDiff and routed it to the interview
    // slim function (which crashed on missing `.transcript`).
    const isInterview = body.method === "interview";
    const looksLikeInterview =
      Array.isArray(body.respondents) &&
      body.respondents.length > 0 &&
      "transcript" in (body.respondents[0] as object);
    const useInterviewShape = isInterview || looksLikeInterview;

    const isAdrsConceptTest =
      !!body.instrument.variants && !useInterviewShape;

    // Slim every respondent up front — this is where the savings come from
    let slimRespondents: unknown[];
    if (useInterviewShape) {
      slimRespondents = (body.respondents as InterviewRespondent[]).map(
        slimInterviewRespondent
      );
    } else {
      slimRespondents = (body.respondents as SurveyRespondent[]).map(
        slimSurveyRespondent
      );
    }

    // Precompute quant stats so the LLM has half the work done
    const variantStats = isAdrsConceptTest
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

    // buildSynthesisPrompt accepts `unknown[]` for the panel data shape — both
    // slim survey and slim interview shapes flow through it as `unknown[]`
    // and the prompt-builder formats whichever it sees. No cast needed.
    let userPrompt = buildSynthesisPrompt(
      body.method,
      respondentsForPrompt,
      body.instrument,
      body.personas,
      body.interpretation,
      body.context,
      variantStats
    );

    // §5D: convergence flag — when respondents converge tightly on numbers,
    // the LLM should call this out rather than treating it as a clean signal.
    const variance = computePanelVariance(body.respondents, body.method);
    if (variance && variance.stdDev < 0.4) {
      userPrompt += `

---

PANEL CONVERGENCE WARNING (computed by the system, not the LLM):
The full panel of ${variance.n} numeric answers shows an unusually low standard deviation of ${variance.stdDev.toFixed(2)} around mean ${variance.mean.toFixed(2)}. This is a synthetic-panel red flag — it may indicate Hämäläinen-Journey bias (LLM convergence toward a dominant narrative) or under-differentiated persona spec, NOT real audience agreement. In your synthesis, do NOT present the consensus as if it were strong real-world evidence. Acknowledge the convergence in the executive summary and in the confidence/limitations section. Lean toward a "split verdict / inconclusive" framing if other dimensions are also flat.`;
    }

    const promptChars = userPrompt.length;
    console.log(
      `[PRISM synthesize] prompt chars: ${promptChars} (~${Math.round(
        promptChars / 4
      )} tokens), respondents: ${
        Array.isArray(respondentsForPrompt) ? respondentsForPrompt.length : 0
      }, variance: ${variance ? variance.stdDev.toFixed(2) : "n/a"}`
    );

    // Leave headroom for the response. Anthropic Opus 4.1 is 200k context.
    const maxTokens = isAdrsConceptTest ? 8000 : 5000;

    const SchemaToUse = isAdrsConceptTest
      ? AdrsSynthesisResponseSchema
      : SynthesisResponseSchema;
    const response = await callLLM({
      systemPrompt: SYNTHESIS_SYSTEM,
      userPrompt,
      // 0.4 — synthesis should be deliberate and consistent. Lower than the
      // simulator (which needs variance) but not deterministic.
      temperature: 0.4,
      maxTokens,
      step: isAdrsConceptTest ? "step5_synthesize_adrs" : "step5_synthesize",
      validate: zodValidator(SchemaToUse, "synthesis"),
    });

    let synthesis = response.validatedValue as
      | z.infer<typeof AdrsSynthesisResponseSchema>
      | z.infer<typeof SynthesisResponseSchema>;

    // §5E: self-critique loop. Disabled when PRISM_SELF_CRITIQUE === "off".
    // The critique LLM call reads the just-generated report, identifies
    // overstatements / missing dissent / ungrounded claims, and optionally
    // returns revised summaries we merge back in.
    if (process.env.PRISM_SELF_CRITIQUE !== "off") {
      try {
        const critiquePrompt = `You are a senior research methodologist auditing a synthetic-panel report for overstatements, missing dissent, and unsupported claims.

REPORT TO AUDIT:
${JSON.stringify(synthesis).slice(0, 30_000)}

PANEL VARIANCE: ${variance ? `std-dev ${variance.stdDev.toFixed(2)} around mean ${variance.mean.toFixed(2)} across ${variance.n} numeric answers` : "n/a (interview study)"}

YOUR TASK:
Identify (a) OVERSTATEMENTS — claims that are stronger than the data supports; (b) MISSING DISSENT — places where the report ignores or smooths over minority disagreement that the panel surfaced; (c) UNGROUNDED CLAIMS — demographic, behavioral, or market facts the report asserts that aren't actually derivable from the panel responses.

If you find substantive issues with the executive summary or qualitative overview, return a REVISED version that addresses them. Revisions should keep the same length and decision-frame voice — only fix the problems.

Return JSON exactly matching this schema:
{
  "overstatements": ["..."],
  "missingDissent": ["..."],
  "ungroundedClaims": ["..."],
  "revisedExecutiveSummary": "...",
  "revisedQualitativeOverview": "..."
}

Omit the revised* fields entirely when no rewrite is needed. Return [] for any concern lists with nothing to flag.`;

        const critiqueRes = await callLLM<Critique>({
          systemPrompt:
            "You are a research methodologist. Audit the report for honesty. Be terse and surgical — flag substantive issues only, ignore stylistic preferences.",
          userPrompt: critiquePrompt,
          temperature: 0.3,
          maxTokens: 3000,
          step: "step5_synthesize_critique",
          validate: zodValidator(CritiqueSchema, "synthesis critique"),
        });

        const critique = critiqueRes.validatedValue;
        if (critique?.revisedExecutiveSummary) {
          (synthesis as { executiveSummary?: string }).executiveSummary =
            critique.revisedExecutiveSummary;
        }
        if (
          critique?.revisedQualitativeOverview &&
          (synthesis as { qualitativeOverview?: string }).qualitativeOverview !==
            undefined
        ) {
          (synthesis as { qualitativeOverview?: string }).qualitativeOverview =
            critique.revisedQualitativeOverview;
        }
        console.log(
          JSON.stringify({
            step: "step5_synthesize_critique",
            overstatements: critique?.overstatements?.length ?? 0,
            missingDissent: critique?.missingDissent?.length ?? 0,
            ungroundedClaims: critique?.ungroundedClaims?.length ?? 0,
            revisedSummary: !!critique?.revisedExecutiveSummary,
            revisedOverview: !!critique?.revisedQualitativeOverview,
          })
        );
      } catch (critiqueErr) {
        // Self-critique is best-effort — never block the report if it fails.
        console.warn(
          "[PRISM synthesize] self-critique pass failed, returning original synthesis:",
          critiqueErr instanceof Error
            ? critiqueErr.message
            : String(critiqueErr)
        );
      }
    }

    return NextResponse.json({ synthesis, isAdrs: isAdrsConceptTest });
  } catch (error) {
    console.error("Synthesize API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Synthesis failed: ${message}` },
      { status: 500 }
    );
  }
}
