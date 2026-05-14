export type Step = 1 | 2 | 3 | 4 | 5;
export type StepStatus = "pending" | "active" | "completed" | "error";
export type ResearchMethod = "survey" | "interview";
export type QuestionType = "likert" | "rating" | "open_ended";
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

export interface ResearchContext {
  hypothesis: string;
  // What the PM wants to learn (distinct from the hypothesis they hold)
  researchQuestion?: string;
  productDescription: string;
  targetAudience: string;
  objectives: string;
  attachments?: Attachment[];
  // Optional: for concept-test studies (e.g. tagline A/B/C testing).
  // PM enters one variant per line; orchestrator picks them up.
  variants?: string;
  variantsLabel?: string; // "Tagline", "Concept", "Headline" etc.
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

export interface LikertQuestion {
  id: string;
  type: "likert";
  text: string;
  scale: [string, string, string, string, string]; // 5 labels, SD→SA
  perVariant?: boolean; // if true, asked once per variant
}

export interface RatingQuestion {
  id: string;
  type: "rating";
  text: string;
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  perVariant?: boolean;
}

export interface OpenEndedQuestion {
  id: string;
  type: "open_ended";
  text: string;
  placeholder?: string;
  perVariant?: boolean;
}

export type Question = LikertQuestion | RatingQuestion | OpenEndedQuestion;

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
