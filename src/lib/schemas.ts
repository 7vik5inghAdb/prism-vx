import { z } from "zod";

// ── Step 1 ────────────────────────────────────────────────────────────────────

export const OrchestratorInterpretationSchema = z.object({
  summary: z.string().min(10),
  restatedHypothesis: z.string().min(10),
  restatedResearchQuestion: z.string().optional(),
  restatedProduct: z.string().min(5),
  restatedAudience: z.string().min(5),
  restatedObjectives: z.array(z.string()).min(1).max(6),
  researchFocus: z.string().min(10),
  potentialChallenges: z.array(z.string()).max(4),
  studyType: z.enum([
    "concept_test",
    "attitudinal",
    "behavioral",
    "exploratory",
    "variant_comparison",
    "concept_validation",
    "workflow_evaluation",
    "feature_assessment",
    "positioning_test",
  ]),
  evaluationSubject: z.string().optional(),
  successCriteria: z.string().optional(),
  variants: z
    .object({
      label: z.string(),
      items: z.array(z.string()).min(2).max(8),
    })
    .optional(),
});

// ── Step 2 ────────────────────────────────────────────────────────────────────

const PersonaDimensionSchema = z.object({
  name: z.string(),
  description: z.string(),
  values: z.array(z.string()).min(2).max(6),
});

const PersonaClusterSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  dimensions: z.array(PersonaDimensionSchema).min(2).max(6),
  narrativeProfile: z.string().min(20),
  sampleSize: z.number().int().min(1).max(99),
});

export const PersonasSchema = z.object({
  clusters: z.array(PersonaClusterSchema).min(3).max(5),
});

// ── Step 3 ────────────────────────────────────────────────────────────────────

const LikertQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("likert"),
  text: z.string().min(5),
  scale: z.tuple([z.string(), z.string(), z.string(), z.string(), z.string()]),
  perVariant: z.boolean().optional(),
});

const RatingQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("rating"),
  text: z.string().min(5),
  min: z.number(),
  max: z.number(),
  minLabel: z.string(),
  maxLabel: z.string(),
  perVariant: z.boolean().optional(),
});

const OpenEndedQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("open_ended"),
  text: z.string().min(5),
  placeholder: z.string().optional(),
  perVariant: z.boolean().optional(),
});

const QuestionSchema = z.discriminatedUnion("type", [
  LikertQuestionSchema,
  RatingQuestionSchema,
  OpenEndedQuestionSchema,
]);

export const InstrumentSchema = z.object({
  title: z.string(),
  description: z.string(),
  rationale: z.string(),
  questions: z.array(QuestionSchema).min(3).max(15),
  variants: z
    .object({
      label: z.string(),
      items: z
        .array(z.object({ id: z.string(), text: z.string() }))
        .min(2)
        .max(8),
      randomizeOrder: z.boolean().optional(),
    })
    .optional(),
});

// ── Step 4 ────────────────────────────────────────────────────────────────────

const SurveyAnswerRawSchema = z.object({
  questionId: z.string(),
  variantId: z.string().optional(),
  answer: z.union([z.string(), z.number()]),
});

export const SurveyBatchResponseSchema = z.array(
  z.object({
    respondentId: z.string(),
    answers: z.array(SurveyAnswerRawSchema).min(1),
  })
);

export const InterviewTranscriptSchema = z.object({
  transcript: z.array(
    z.object({
      question: z.string(),
      answer: z.string().min(10),
    })
  ),
});

// ── Step 5 ────────────────────────────────────────────────────────────────────

export const InsightFindingSchema = z.object({
  theme: z.string(),
  summary: z.string().min(20),
  evidence: z.array(z.string()).min(2).max(6),
  sentiment: z.enum(["positive", "negative", "mixed", "neutral"]),
  supportingData: z.string().optional(),
});

const SentimentRowSchema = z.object({
  category: z.string(),
  count: z.number().int().min(0),
  themes: z.string(),
  quotes: z.array(z.string()).min(1).max(4),
});

const VariantPerformanceSchema = z.object({
  variantId: z.string(),
  variantText: z.string(),
  averageRating: z.number(),
  interestPercent: z.number(),
  ratingDistribution: z.array(
    z.object({
      rating: z.number().int(),
      count: z.number().int(),
      percent: z.number(),
    })
  ),
  topPositives: z.array(SentimentRowSchema).min(2).max(4),
  topNegatives: z.array(SentimentRowSchema).min(2).max(4),
  narrative: z.string().min(50),
});

const StrategicTakeawaySchema = z.object({
  principle: z.string(),
  explanation: z.string(),
});

const CrossThemeSchema = z.object({
  title: z.string(),
  analysis: z.string().min(40),
});

const ParticipantProfileSchema = z.object({
  cohorts: z.array(
    z.object({
      name: z.string(),
      count: z.number().int(),
      percent: z.number(),
      characteristics: z.string(),
    })
  ),
  meanAge: z.number().optional(),
  medianAge: z.number().optional(),
  ageDistribution: z
    .array(z.object({ band: z.string(), percent: z.number() }))
    .optional(),
  languageDistribution: z
    .array(z.object({ language: z.string(), percent: z.number() }))
    .optional(),
  topTools: z.array(z.object({ tool: z.string(), percent: z.number() })).optional(),
  topContentTypes: z
    .array(z.object({ type: z.string(), percent: z.number() }))
    .optional(),
});

const AdrsRecommendationSchema = z.object({
  taglineId: z.string(),
  taglineText: z.string(),
  supportingFactors: z.array(z.string()).min(2).max(4),
  primaryRecommendation: z.string(),
  rationale: z.string(),
});

// Generic synthesis (used when no variants)
export const SynthesisResponseSchema = z.object({
  background: z.string().min(20),
  executiveSummary: z.string().min(30),
  qualitativeOverview: z.string().min(30),
  keyFindings: z.array(InsightFindingSchema).min(2).max(6),
  recommendations: z.array(z.string()).min(2).max(6),
  methodologyNote: z.string().min(20),
});

// ADRS concept-test synthesis (used when variants are present)
export const AdrsSynthesisResponseSchema = z.object({
  background: z.string().min(20),
  executiveSummary: z.string().min(30),
  qualitativeOverview: z.string().min(30),
  participantProfile: ParticipantProfileSchema,
  variantPerformance: z.array(VariantPerformanceSchema).min(2).max(8),
  crossThemes: z.array(CrossThemeSchema).min(2).max(4),
  strategicTakeaways: z.array(StrategicTakeawaySchema).min(2).max(4),
  adrsRecommendation: AdrsRecommendationSchema,
  keyFindings: z.array(InsightFindingSchema).min(2).max(6),
  recommendations: z.array(z.string()).min(2).max(6),
  methodologyNote: z.string().min(20),
});

export const ConfidenceScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  reasoning: z.string().min(20),
  biasFlags: z.array(z.string()).max(5),
  alignmentNotes: z.string().min(20),
  strengthFactors: z.array(z.string()).max(4),
  limitationFactors: z.array(z.string()).max(4),
});
