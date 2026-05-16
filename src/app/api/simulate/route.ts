export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callLLM, parseJSON } from "@/lib/llm";
import {
  buildRespondentSystemPrompt,
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
      batchIndex?: number;
      respondentIndex?: number;
      panelSize?: number;
    };

    if (!body.method || !body.personas || !body.instrument) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (body.method === "survey") {
      return await handleSurveyBatch(body);
    } else {
      return await handleInterview(body);
    }
  } catch (error) {
    console.error("Simulate API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Panel simulation failed: ${message}` },
      { status: 500 }
    );
  }
}

async function handleSurveyBatch(body: {
  personas: PersonaCluster[];
  instrument: ResearchInstrument;
  context?: ResearchContext;
  batchIndex?: number;
  panelSize?: number;
}) {
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
  const systemPrompt = `You are simulating ${batch.length} distinct survey respondents. Each has a unique profile. Stay in character for each. Respondents have authentic, varied opinions — not all positive, not all negative.${orderedImages.length > 0 ? ` Some variants are images attached to this message; react to them visually.` : ""}`;

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    images: orderedImages.length > 0 ? orderedImages : undefined,
    temperature: 0.85,
    maxTokens: variants ? 12000 : 6000,
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

async function handleInterview(body: {
  personas: PersonaCluster[];
  instrument: ResearchInstrument;
  context?: ResearchContext;
  respondentIndex?: number;
  panelSize?: number;
}) {
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

  const systemPrompt = buildRespondentSystemPrompt(profile, cluster.name, "interview");
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
    temperature: 0.8,
    maxTokens: 6000,
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
