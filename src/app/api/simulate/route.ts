// 300 s — Haiku 4.5 batches usually finish in 20-40s but a slow Anthropic
// instance plus a large variant payload can push past 60s. Local dev ignores
// this; Vercel paid plan honors it.
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { callLLM, parseJSON } from "@/lib/llm";
import {
  buildRespondentSystemPrompt,
  buildBatchRespondentSystemPrompt,
  buildSurveyBatchPrompt,
  buildInterviewPrompt,
} from "@/lib/prompts";
import {
  SurveyBatchResponseSchema,
  InterviewTranscriptSchema,
} from "@/lib/schemas";
import type {
  PersonaCluster,
  ResearchInstrument,
  ResearchMethod,
  ResearchContext,
  SurveyRespondent,
  InterviewRespondent,
  SurveyAnswer,
} from "@/types";

interface SimulatorOptions {
  evaluationSubject?: string;
  studyType?: string;
  audienceSummary?: string;
}

/** Derive an audienceSummary from context.targetAudience without bloating the
 *  system prompt — trim to ~200 chars at a sentence boundary. */
function summarizeAudience(targetAudience?: string): string | undefined {
  if (!targetAudience) return undefined;
  const trimmed = targetAudience.trim();
  if (trimmed.length <= 200) return trimmed;
  const slice = trimmed.slice(0, 200);
  const lastPeriod = slice.lastIndexOf(".");
  return (lastPeriod > 100 ? slice.slice(0, lastPeriod + 1) : slice) + "...";
}

const DEFAULT_SURVEY_TOTAL = 100;
const DEFAULT_INTERVIEW_TOTAL = 3;
const BATCH_SIZE = 5; // Smaller batches for per-variant question density

function generateRespondentProfile(
  cluster: PersonaCluster,
  index: number
): string {
  // Compact profile: max ~80 words. Saves tokens dramatically over verbose dumps.
  const dimNotes = cluster.dimensions
    .map((d) => {
      const val = d.values[index % d.values.length];
      return `${d.name}=${val}`;
    })
    .join(" · ");

  const vp = cluster.validationPredispositions;
  const jtbd = cluster.jobsToBeDone;

  const vpLine = vp
    ? `\n${vp.adoptionPosture} · risk:${vp.riskTolerance} · switching:${vp.switchingCost} · habit:${vp.habitStrength}. Today does: ${vp.counterfactual}. Says YES when: ${vp.acceptanceCriteria}. Says NO when: ${vp.rejectionTriggers}.`
    : "";

  const jtbdLine = jtbd
    ? `\nJob: ${jtbd.functional} (emotional: ${jtbd.emotional}; social: ${jtbd.social})`
    : "";

  return `${cluster.narrativeProfile}\nAttrs: ${dimNotes}${vpLine}${jtbdLine}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      method: ResearchMethod;
      personas: PersonaCluster[];
      instrument: ResearchInstrument;
      context?: ResearchContext; // for per-variant images
      /** Optional study scope from the orchestrator. Threads through to the
       *  respondent system prompt so the LLM stays on-topic and uses the right
       *  language defaults. */
      evaluationSubject?: string;
      studyType?: string;
      batchIndex?: number;
      respondentIndex?: number;
      panelSize?: number;
    };

    if (!body.method || !body.personas || !body.instrument) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const simOptions: SimulatorOptions = {
      evaluationSubject: body.evaluationSubject,
      studyType: body.studyType,
      audienceSummary: summarizeAudience(body.context?.targetAudience),
    };

    // Treat every non-interview method (survey, maxdiff, kano, conjoint,
    // concept_test) as a survey-style flow at the simulation layer.
    if (body.method === "interview") {
      return await handleInterview(body, simOptions);
    }
    return await handleSurveyBatch(body, simOptions);
  } catch (error) {
    console.error("Simulate API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Panel simulation failed: ${message}` },
      { status: 500 }
    );
  }
}

async function handleSurveyBatch(
  body: {
    personas: PersonaCluster[];
    instrument: ResearchInstrument;
    context?: ResearchContext;
    batchIndex?: number;
    panelSize?: number;
  },
  simOptions: SimulatorOptions
) {
  const { personas, instrument, batchIndex = 0, context } = body;
  const SURVEY_TOTAL = body.panelSize ?? DEFAULT_SURVEY_TOTAL;
  const variants = instrument.variants?.items;

  // Build per-variant image map from context (where the base64 image content
  // lives). Map keyed by the order in instrument.variants.items, which
  // matches context.variants by index.
  const ctxVariants = Array.isArray(context?.variants) ? context!.variants : [];
  const variantImages = new Map<string, { dataUrl: string; mediaType?: string }>();
  if (variants && ctxVariants.length > 0) {
    for (let i = 0; i < variants.length; i++) {
      const ctxV = ctxVariants[i];
      if (ctxV?.image?.content) {
        variantImages.set(variants[i].id, {
          dataUrl: ctxV.image.content,
          mediaType: ctxV.image.mediaType,
        });
      }
    }
  }

  // Distribute respondents across persona clusters proportionally
  const allRespondentProfiles: Array<{
    id: string;
    profile: string;
    clusterName: string;
    clusterId: string;
  }> = [];

  let globalIdx = 0;
  for (const cluster of personas) {
    const count = Math.round((cluster.sampleSize / 100) * SURVEY_TOTAL);
    for (let i = 0; i < count; i++) {
      allRespondentProfiles.push({
        id: `R${String(globalIdx + 1).padStart(3, "0")}`,
        profile: generateRespondentProfile(cluster, i),
        clusterName: cluster.name,
        clusterId: cluster.id,
      });
      globalIdx++;
    }
  }

  while (allRespondentProfiles.length < SURVEY_TOTAL) {
    const last = allRespondentProfiles[allRespondentProfiles.length - 1];
    allRespondentProfiles.push({
      ...last,
      id: `R${String(allRespondentProfiles.length + 1).padStart(3, "0")}`,
    });
  }
  allRespondentProfiles.splice(SURVEY_TOTAL);

  const start = batchIndex * BATCH_SIZE;
  const end = Math.min(start + BATCH_SIZE, SURVEY_TOTAL);
  const batch = allRespondentProfiles.slice(start, end);

  if (batch.length === 0) {
    return NextResponse.json({
      respondents: [],
      batchComplete: true,
      totalBatches: Math.ceil(SURVEY_TOTAL / BATCH_SIZE),
    });
  }

  // Build the ordered list of variant images (one image per variant that has
  // one). The prompt references them as "Variant N's image" in order.
  const orderedImages: Array<{ dataUrl: string; mediaType?: string }> = [];
  const imageVariantIds: string[] = [];
  if (variants) {
    for (const v of variants) {
      const img = variantImages.get(v.id);
      if (img) {
        orderedImages.push(img);
        imageVariantIds.push(v.id);
      }
    }
  }

  const userPrompt = buildSurveyBatchPrompt(
    instrument.questions,
    variants,
    batch,
    imageVariantIds.length > 0 ? imageVariantIds : undefined
  );
  const systemPrompt = buildBatchRespondentSystemPrompt(
    batch.length,
    orderedImages.length > 0,
    simOptions
  );

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    images: orderedImages.length > 0 ? orderedImages : undefined,
    // 0.9 — high temperature deliberately. Diversity across respondents is
    // the whole point of the simulator; the anti-convergence rules in the
    // system prompt only work if sampling temperature lets variance through.
    temperature: 0.9,
    // 16000 (variant studies) / 8000 (general): 5 respondents × 5+ variants
    // × per-variant question density can exceed 12k at 0.9 temperature with
    // rich open-ended answers — previous cap silently truncated the last
    // respondent's answers in batches that pushed the boundary.
    maxTokens: variants ? 16000 : 8000,
    step: `step4_survey_batch_${batchIndex}`,
    modelTier: "simulation",
  });

  const parsed = parseJSON<
    Array<{
      respondentId: string;
      answers: Array<{ questionId: string; variantId?: string; answer: string | number }>;
    }>
  >(response.text, `survey batch ${batchIndex}`);

  const validated = SurveyBatchResponseSchema.parse(parsed);

  // Enrich with persona info and variant text
  const variantById = new Map((variants ?? []).map((v) => [v.id, v.text]));

  const respondents: SurveyRespondent[] = validated.map((r, i) => {
    const profile = batch[i] ?? batch[batch.length - 1];
    const answers: SurveyAnswer[] = r.answers.map((a) => {
      const question = instrument.questions.find((q) => q.id === a.questionId);
      return {
        questionId: a.questionId,
        questionText: question?.text ?? "",
        questionType: question?.type ?? "open_ended",
        answer: a.answer,
        variantId: a.variantId,
        variantText: a.variantId ? variantById.get(a.variantId) : undefined,
      };
    });
    return {
      respondentId: r.respondentId || profile.id,
      personaClusterId: profile.clusterId,
      personaClusterName: profile.clusterName,
      personaProfile: profile.profile,
      answers,
    };
  });

  return NextResponse.json({
    respondents,
    batchIndex,
    batchSize: batch.length,
    totalBatches: Math.ceil(SURVEY_TOTAL / BATCH_SIZE),
    totalRespondents: SURVEY_TOTAL,
  });
}

async function handleInterview(
  body: {
    personas: PersonaCluster[];
    instrument: ResearchInstrument;
    context?: ResearchContext;
    respondentIndex?: number;
    panelSize?: number;
  },
  simOptions: SimulatorOptions
) {
  const { personas, instrument, respondentIndex = 0, context } = body;
  const INTERVIEW_TOTAL = body.panelSize ?? DEFAULT_INTERVIEW_TOTAL;

  if (respondentIndex >= INTERVIEW_TOTAL) {
    return NextResponse.json({ error: "Invalid respondent index" }, { status: 400 });
  }

  const cluster = personas[respondentIndex % personas.length];
  const profile = generateRespondentProfile(cluster, 0);
  const respondentId = `interviewee_${respondentIndex + 1}`;

  // Variants + per-variant images (same pattern as the survey path)
  const variants = instrument.variants?.items;
  const ctxVariants = Array.isArray(context?.variants) ? context!.variants : [];
  const orderedImages: Array<{ dataUrl: string; mediaType?: string }> = [];
  const imageVariantIds: string[] = [];
  if (variants && ctxVariants.length > 0) {
    for (let i = 0; i < variants.length; i++) {
      const ctxV = ctxVariants[i];
      if (ctxV?.image?.content) {
        orderedImages.push({
          dataUrl: ctxV.image.content,
          mediaType: ctxV.image.mediaType,
        });
        imageVariantIds.push(variants[i].id);
      }
    }
  }

  const systemPrompt = buildRespondentSystemPrompt(
    profile,
    cluster.name,
    "interview",
    simOptions
  );
  const userPrompt = buildInterviewPrompt(
    instrument.questions,
    profile,
    cluster.name,
    variants,
    imageVariantIds.length > 0 ? imageVariantIds : undefined
  );

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    images: orderedImages.length > 0 ? orderedImages : undefined,
    // 0.9 — same rationale as the survey path: interview respondents need
    // distinct voices, and the persona system prompt keeps them grounded.
    temperature: 0.9,
    // 8000 — interviews with 10+ open-ended questions can exceed 6000.
    maxTokens: 8000,
    step: `step4_interview_${respondentIndex}`,
    modelTier: "simulation",
  });

  const parsed = parseJSON<{ transcript: Array<{ question: string; answer: string }> }>(
    response.text,
    `interview ${respondentIndex}`
  );
  const validated = InterviewTranscriptSchema.parse(parsed);

  const respondent: InterviewRespondent = {
    respondentId,
    personaClusterId: cluster.id,
    personaClusterName: cluster.name,
    personaProfile: profile,
    transcript: validated.transcript,
  };

  return NextResponse.json({
    respondent,
    respondentIndex,
    total: INTERVIEW_TOTAL,
  });
}
