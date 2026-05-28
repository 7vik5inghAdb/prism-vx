export type Step = 1 | 2 | 3 | 4 | 5;
export type StepStatus = "pending" | "active" | "completed" | "error";
export type ResearchMethod =
  | "survey"
  | "interview"
  | "maxdiff"
  | "kano"
  | "conjoint"
  | "concept_test";
export type SentimentType = "positive" | "negative" | "mixed" | "neutral";

// ── Step 1 ────────────────────────────────────────────────────────────────────

export type AttachmentKind = "image" | "pdf" | "docx" | "txt";

export interface Attachment {
  id: string;
  name: string;
  kind: AttachmentKind;
  size: number; // bytes
  // For images: base64 data URL (data:image/png;base64,...)
  // For docs: extracted plain text
  content: string;
  mediaType?: string; // e.g. "image/png"
}

/**
 * One variant being evaluated. The `description` is the human-readable
 * label/content (e.g. the tagline text itself, or a one-line description of
 * an image variant). The optional `image` is the actual visual the personas
 * react to in simulation. When `image` is present, personas see the image;
 * when only `description` is present, personas see the description as text.
 */
export interface VariantInput {
  id: string;
  description: string;
  image?: Attachment; // kind must be "image" when present
}

export interface ResearchContext {
  hypothesis: string;
  // What the PM wants to learn (distinct from the hypothesis they hold)
  researchQuestion?: string;
  productDescription: string;
  targetAudience: string;
  objectives: string;
  // Reference files: PDFs, DOCX, images that provide CONTEXT but are NOT
  // variants being tested. The orchestrator reads them to refine its
  // interpretation.
  attachments?: Attachment[];
  // The category/type label for what's being compared (e.g. "Tagline",
  // "Culturalised Image", "Pricing Plan").
  variantTypeLabel?: string;
  // The variants themselves. Empty/missing array = no variant test.
  variants?: VariantInput[];

  // ── Legacy fields (kept for migration of persisted state from older saves)
  /** @deprecated use variantTypeLabel */
  variantsLabel?: string;
}

export interface OrchestratorInterpretation {
  summary: string;
  restatedHypothesis: string;
  restatedResearchQuestion?: string;
  restatedProduct: string;
  restatedAudience: string;
  restatedObjectives: string[];
  researchFocus: string;
  potentialChallenges: string[];
  studyType:
    | "concept_test"
    | "attitudinal"
    | "behavioral"
    | "exploratory"
    | "variant_comparison"
    | "concept_validation"
    | "workflow_evaluation"
    | "feature_assessment"
    | "positioning_test";
  // What's being tested (a tagline, a feature, a flow, a price model, etc.)
  evaluationSubject?: string;
  // What "good" looks like for this study
  successCriteria?: string;
  variants?: { label: string; items: string[] };
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

export interface PersonaDimension {
  name: string;
  description: string;
  values: string[];
}

// L2 — Validation Predispositions: what kind of evaluator this cluster is
export interface ValidationPredispositions {
  adoptionPosture:
    | "Innovator"
    | "Early Adopter"
    | "Pragmatist"
    | "Skeptic"
    | "Laggard";
  riskTolerance: "Low" | "Medium" | "High";
  switchingCost: "Low" | "Medium" | "High";
  counterfactual: string; // what they do TODAY instead of using this thing
  acceptanceCriteria: string; // what signals "yes"
  rejectionTriggers: string; // what signals "no"
  habitStrength: "Weak" | "Moderate" | "Strong";
}

// L3 — Jobs-to-be-Done: situation → motivation → outcome
export interface JobsToBeDone {
  functional: string; // "When [situation], I want to [motivation], so I can [outcome]"
  emotional: string; // emotional payoff (feel competent, secure, in-control)
  social: string; // social payoff (look professional, fit in, stand out)
}

export interface PersonaCluster {
  id: string;
  name: string;
  description: string;
  dimensions: PersonaDimension[];
  narrativeProfile: string;
  sampleSize: number; // suggested share of panel
  // L2 + L3 (optional for backward compat with persisted state)
  validationPredispositions?: ValidationPredispositions;
  jobsToBeDone?: JobsToBeDone;
}

// ── Step 3 ────────────────────────────────────────────────────────────────────

/**
 * QuestionScope governs how a question relates to variants:
 *  - "per_variant"  — asked once per variant
 *  - "cross_variant" — asked once after all variants are shown
 *  - "general"      — independent of variants (used in non-variant studies, or
 *                     as a standalone PM question even when variants exist)
 */
export type QuestionScope = "per_variant" | "cross_variant" | "general";

// Base fields every question shares (kept inline on each interface so the
// discriminated union behaves cleanly).
interface QuestionBase {
  id: string;
  text: string;
  /** Authoritative scope field. */
  scope?: QuestionScope;
  /** @deprecated legacy boolean — use `scope`. Reads fall back via getQuestionScope. */
  perVariant?: boolean;
}

export interface LikertQuestion extends QuestionBase {
  type: "likert";
  scale: [string, string, string, string, string]; // 5 labels, SD→SA
}

export interface RatingQuestion extends QuestionBase {
  type: "rating";
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}

export interface OpenEndedQuestion extends QuestionBase {
  type: "open_ended";
  placeholder?: string;
}

/** Rank items from most-to-least preferred. Answer is a JSON-stringified ordered list of item indices or labels. */
export interface ForcedRankingQuestion extends QuestionBase {
  type: "forced_ranking";
  items: string[];
}

/** Distribute a fixed pot of points across items. Answer is a JSON-stringified record { itemLabel: points }. */
export interface AllocationQuestion extends QuestionBase {
  type: "allocation";
  items: string[];
  totalPoints: number; // typically 100
}

/** Bipolar adjective pairs rated on an N-point scale. Answer is a JSON record { pairIndex: position }. */
export interface SemanticDifferentialQuestion extends QuestionBase {
  type: "semantic_differential";
  pairs: { left: string; right: string }[];
  steps: 5 | 7;
}

/** Single-select or multi-select choice. Answer is a single option (or JSON-stringified array for multi). */
export interface MultipleChoiceQuestion extends QuestionBase {
  type: "multiple_choice";
  options: string[];
  multiSelect: boolean;
}

/** Rate multiple items across multiple dimensions on the same scale. Answer is a JSON record { "item:dim": rating }. */
export interface MatrixQuestion extends QuestionBase {
  type: "matrix";
  items: string[];
  dimensions: string[];
  scale: 5 | 7;
}

/** Free-form completion of one or more sentence stems. Answer is a JSON record { stemIndex: completion }. */
export interface SentenceCompletionQuestion extends QuestionBase {
  type: "sentence_completion";
  stems: string[];
}

/** List N words in response to each stimulus. Answer is a JSON record { stimulus: [w1, w2, w3] }. */
export interface WordAssociationQuestion extends QuestionBase {
  type: "word_association";
  stimuli: string[];
  wordCount: number; // typically 3
}

/** Place respondent in a concrete situation and ask what they do. Answer is open-text. */
export interface ScenarioQuestion extends QuestionBase {
  type: "scenario";
  scenarioText: string;
  followUp: string;
}

/** Binary commit + reasoning. Answer is JSON { decision: "yes"|"no", why?: string }. */
export interface YesNoWhyQuestion extends QuestionBase {
  type: "yes_no_why";
  requireWhy: boolean;
}

/** Net Promoter Score (0-10). Answer is a number in [0,10]. */
export interface NPSQuestion extends QuestionBase {
  type: "nps";
}

export type Question =
  | LikertQuestion
  | RatingQuestion
  | OpenEndedQuestion
  | ForcedRankingQuestion
  | AllocationQuestion
  | SemanticDifferentialQuestion
  | MultipleChoiceQuestion
  | MatrixQuestion
  | SentenceCompletionQuestion
  | WordAssociationQuestion
  | ScenarioQuestion
  | YesNoWhyQuestion
  | NPSQuestion;

export type QuestionType = Question["type"];

/** Read a question's scope with legacy-field fallback. New code should call this. */
export function getQuestionScope(q: Question): QuestionScope {
  if (q.scope) return q.scope;
  if (q.perVariant) return "per_variant";
  return "cross_variant";
}

export interface InstrumentVariant {
  id: string;
  text: string;
}

export interface ResearchInstrument {
  title: string;
  description: string;
  questions: Question[];
  rationale: string;
  variants?: {
    label: string; // "Tagline", "Concept" etc.
    items: InstrumentVariant[];
    randomizeOrder?: boolean;
  };
}

// ── Step 4 ────────────────────────────────────────────────────────────────────

export interface SurveyAnswer {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  /**
   * Answer payload. Simple types use string|number directly. Complex types
   * (ranking, allocation, matrix, etc.) use a JSON-stringified payload so the
   * single `answer` field carries the structure without expanding the schema.
   */
  answer: string | number;
  variantId?: string; // present for per-variant answers
  variantText?: string;
}

export interface SurveyRespondent {
  respondentId: string;
  personaClusterId: string;
  personaClusterName: string;
  personaProfile: string;
  answers: SurveyAnswer[];
}

export interface InterviewTurn {
  question: string;
  answer: string;
}

export interface InterviewRespondent {
  respondentId: string;
  personaClusterId: string;
  personaClusterName: string;
  personaProfile: string;
  transcript: InterviewTurn[];
}

export type PanelResults =
  | { method: "survey"; respondents: SurveyRespondent[] }
  | { method: "interview"; respondents: InterviewRespondent[] };

export interface SimulationProgress {
  current: number;
  total: number;
  currentBatch?: string;
  phase: "preparing" | "simulating" | "finalizing" | "complete";
}

// ── Step 5 ────────────────────────────────────────────────────────────────────

export interface InsightFinding {
  theme: string;
  summary: string;
  evidence: string[];
  sentiment: SentimentType;
  supportingData?: string;
}

export interface ConfidenceScore {
  score: number;
  reasoning: string;
  biasFlags: string[];
  alignmentNotes: string;
  strengthFactors: string[];
  limitationFactors: string[];
}

// ── ADRS-style concept test sections (optional, populated when variants exist)

export interface SentimentRow {
  category: string;
  count: number;
  themes: string;
  quotes: string[]; // 1-3 representative quotes
}

export interface VariantPerformance {
  variantId: string;
  variantText: string;
  averageRating: number;
  interestPercent: number; // % "Agree" or "Strongly Agree" on intent
  ratingDistribution: { rating: number; count: number; percent: number }[];
  topPositives: SentimentRow[];
  topNegatives: SentimentRow[];
  narrative: string; // 2-3 paragraph analyst write-up
}

export interface CrossTheme {
  title: string;
  analysis: string; // 1-2 paragraphs surfacing a tension/trade-off
}

export interface StrategicTakeaway {
  principle: string;
  explanation: string;
}

export interface ParticipantProfile {
  cohorts: { name: string; count: number; percent: number; characteristics: string }[];
  meanAge?: number;
  medianAge?: number;
  ageDistribution?: { band: string; percent: number }[];
  languageDistribution?: { language: string; percent: number }[];
  topTools?: { tool: string; percent: number }[];
  topContentTypes?: { type: string; percent: number }[];
}

export interface AdrsRecommendation {
  taglineId: string;
  taglineText: string;
  supportingFactors: string[]; // 3 factors
  primaryRecommendation: string; // single sentence
  rationale: string;
}

export interface ResearchReport {
  // Generic sections (always present)
  executiveSummary: string;
  qualitativeOverview: string;
  keyFindings: InsightFinding[];
  recommendations: string[];
  confidenceScore: ConfidenceScore;
  methodologyNote: string;
  generatedAt: string;
  panelSize: number;
  researchMethod: ResearchMethod;
  background: string;

  // ADRS concept-test sections (populated when variants are present)
  participantProfile?: ParticipantProfile;
  variantPerformance?: VariantPerformance[];
  crossThemes?: CrossTheme[];
  strategicTakeaways?: StrategicTakeaway[];
  adrsRecommendation?: AdrsRecommendation;
}

// ── App State ─────────────────────────────────────────────────────────────────

export interface AppState {
  currentStep: Step;
  stepStatuses: Record<Step, StepStatus>;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;

  // Step data (populated as PM advances)
  context: ResearchContext | null;
  interpretation: OrchestratorInterpretation | null;
  personas: PersonaCluster[] | null;
  selectedMethod: ResearchMethod | null;
  instrument: ResearchInstrument | null;
  panelResults: PanelResults | null;
  simulationProgress: SimulationProgress | null;
  report: ResearchReport | null;

  // Configurable panel sizes
  surveyPanelSize: number;
  interviewPanelSize: number;

  // Auto-run: when enabled, the pipeline self-drives Steps 2→5 without
  // manual confirmation, using minimum panel sizes (survey 10, interview 3).
  // When disabled, the user clicks Continue at each step.
  autoRunEnabled: boolean;

  // Playback mode: a cached use-case snapshot has been loaded with every
  // step's output already present, and the user is clicking through the
  // pipeline to review it. In this mode `advanceToStep` does NOT clear
  // downstream outputs (there is no re-run) and steps never call the LLM.
  playbackMode: boolean;

  // Streaming respondents (populated during step 4)
  streamingRespondents: (SurveyRespondent | InterviewRespondent)[];

  // Autosave timestamp (ISO string)
  autosavedAt: string | null;
}

export interface StepInfo {
  number: Step;
  label: string;
  shortLabel: string;
  description: string;
}

export const STEP_INFO: StepInfo[] = [
  {
    number: 1,
    label: "Context Ingestion",
    shortLabel: "Context",
    description: "Define your research hypothesis and context",
  },
  {
    number: 2,
    label: "Persona Definition",
    shortLabel: "Personas",
    description: "AI generates audience dimension clusters",
  },
  {
    number: 3,
    label: "Instrument Design",
    shortLabel: "Instrument",
    description: "Select method and review research questions",
  },
  {
    number: 4,
    label: "Panel Simulation",
    shortLabel: "Simulation",
    description: "Synthetic respondents answer your instrument",
  },
  {
    number: 5,
    label: "Insight Synthesis",
    shortLabel: "Report",
    description: "AI synthesizes findings into a structured report",
  },
];
