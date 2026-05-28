import { z } from "zod";

// ── Step 1 ────────────────────────────────────────────────────────────────────

// Min-length bounds on free-text fields are intentionally generous —
// validation should be semantic (does this field make sense?), not punitive.
// Strict bounds force repair-retries on near-valid LLM output, which costs
// API spend and time without improving quality.
export const OrchestratorInterpretationSchema = z.object({
  summary: z.string().min(8),
  restatedHypothesis: z.string().min(8),
  restatedResearchQuestion: z.string().optional(),
  restatedProduct: z.string().min(5),
  restatedAudience: z.string().min(5),
  restatedObjectives: z.array(z.string()).min(1).max(6),
  researchFocus: z.string().min(8),
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
  // nullish (not optional): LLMs routinely emit `variants: null` for
  // non-variant studies. `.optional()` rejects null, and the repair-retry
  // loop then pushes the model to invent garbage variants. `.nullish()`
  // accepts null/undefined alike — both mean "no variants".
  variants: z
    .object({
      label: z.string(),
      items: z.array(z.string()).min(2).max(8),
    })
    .nullish(),
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
  narrativeProfile: z.string().min(15),
  sampleSize: z.number().int().min(1).max(99),
  validationPredispositions: z
    .object({
      adoptionPosture: z.enum([
        "Innovator",
        "Early Adopter",
        "Pragmatist",
        "Skeptic",
        "Laggard",
      ]),
      riskTolerance: z.enum(["Low", "Medium", "High"]),
      switchingCost: z.enum(["Low", "Medium", "High"]),
      counterfactual: z.string().min(5),
      acceptanceCriteria: z.string().min(5),
      rejectionTriggers: z.string().min(5),
      habitStrength: z.enum(["Weak", "Moderate", "Strong"]),
    })
    .optional(),
  jobsToBeDone: z
    .object({
      functional: z.string().min(10),
      emotional: z.string().min(5),
      social: z.string().min(5),
    })
    .optional(),
});

export const PersonasSchema = z.object({
  clusters: z.array(PersonaClusterSchema).min(3).max(5),
});

// ── Step 3 ────────────────────────────────────────────────────────────────────

// Fields shared by every question. `scope` is the authoritative new field;
// `perVariant` is kept optional for back-compat with persisted state.
const questionBaseFields = {
  id: z.string(),
  text: z.string().min(5),
  scope: z.enum(["per_variant", "cross_variant", "general"]).optional(),
  perVariant: z.boolean().optional(),
};

const LikertQuestionSchema = z.object({
  ...questionBaseFields,
  type: z.literal("likert"),
  scale: z.tuple([z.string(), z.string(), z.string(), z.string(), z.string()]),
});

const RatingQuestionSchema = z.object({
  ...questionBaseFields,
  type: z.literal("rating"),
  min: z.number(),
  max: z.number(),
  minLabel: z.string(),
  maxLabel: z.string(),
});

const OpenEndedQuestionSchema = z.object({
  ...questionBaseFields,
  type: z.literal("open_ended"),
  placeholder: z.string().optional(),
});

const ForcedRankingQuestionSchema = z.object({
  ...questionBaseFields,
  type: z.literal("forced_ranking"),
  items: z.array(z.string()).min(2),
});

const AllocationQuestionSchema = z.object({
  ...questionBaseFields,
  type: z.literal("allocation"),
  items: z.array(z.string()).min(2),
  totalPoints: z.number().int().min(1),
});

const SemanticDifferentialQuestionSchema = z.object({
  ...questionBaseFields,
  type: z.literal("semantic_differential"),
  pairs: z
    .array(z.object({ left: z.string(), right: z.string() }))
    .min(1),
  steps: z.union([z.literal(5), z.literal(7)]),
});

const MultipleChoiceQuestionSchema = z.object({
  ...questionBaseFields,
  type: z.literal("multiple_choice"),
  options: z.array(z.string()).min(2),
  multiSelect: z.boolean(),
});

const MatrixQuestionSchema = z.object({
  ...questionBaseFields,
  type: z.literal("matrix"),
  items: z.array(z.string()).min(1),
  dimensions: z.array(z.string()).min(1),
  scale: z.union([z.literal(5), z.literal(7)]),
});

const SentenceCompletionQuestionSchema = z.object({
  ...questionBaseFields,
  type: z.literal("sentence_completion"),
  stems: z.array(z.string()).min(1),
});

const WordAssociationQuestionSchema = z.object({
  ...questionBaseFields,
  type: z.literal("word_association"),
  stimuli: z.array(z.string()).min(1),
  wordCount: z.number().int().min(1).max(10),
});

const ScenarioQuestionSchema = z.object({
  ...questionBaseFields,
  type: z.literal("scenario"),
  scenarioText: z.string().min(10),
  followUp: z.string().min(5),
});

const YesNoWhyQuestionSchema = z.object({
  ...questionBaseFields,
  type: z.literal("yes_no_why"),
  requireWhy: z.boolean(),
});

const NPSQuestionSchema = z.object({
  ...questionBaseFields,
  type: z.literal("nps"),
});

const QuestionSchema = z.discriminatedUnion("type", [
  LikertQuestionSchema,
  RatingQuestionSchema,
  OpenEndedQuestionSchema,
  ForcedRankingQuestionSchema,
  AllocationQuestionSchema,
  SemanticDifferentialQuestionSchema,
  MultipleChoiceQuestionSchema,
  MatrixQuestionSchema,
  SentenceCompletionQuestionSchema,
  WordAssociationQuestionSchema,
  ScenarioQuestionSchema,
  YesNoWhyQuestionSchema,
  NPSQuestionSchema,
]);

export const InstrumentSchema = z.object({
  title: z.string(),
  description: z.string(),
  rationale: z.string(),
  questions: z.array(QuestionSchema).min(3).max(20),
  // nullish for the same reason as OrchestratorInterpretationSchema.variants —
  // a non-variant survey instrument legitimately has no variants block.
  variants: z
    .object({
      label: z.string(),
      items: z
        .array(z.object({ id: z.string(), text: z.string() }))
        .min(2)
        .max(8),
      randomizeOrder: z.boolean().optional(),
    })
    .nullish(),
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
  summary: z.string().min(10),
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
  narrative: z.string().min(30),
});

const StrategicTakeawaySchema = z.object({
  principle: z.string(),
  explanation: z.string(),
});

const CrossThemeSchema = z.object({
  title: z.string(),
  analysis: z.string().min(20),
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

// Generic synthesis (used when no variants). Now includes OPTIONAL ADRS-style
// sections — participantProfile, crossThemes, strategicTakeaways — so survey
// studies like attitudinal / behavioral / feature-assessment can render rich
// reports without hand-augmentation. variantPerformance + adrsRecommendation
// remain ADRS-only since they require variants.
export const SynthesisResponseSchema = z.object({
  background: z.string().min(20),
  executiveSummary: z.string().min(30),
  qualitativeOverview: z.string().min(30),
  participantProfile: ParticipantProfileSchema.optional(),
  crossThemes: z.array(CrossThemeSchema).min(2).max(4).optional(),
  strategicTakeaways: z.array(StrategicTakeawaySchema).min(2).max(4).optional(),
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
