"use client";

/**
 * Development fixtures. Lets you skip Steps 1–4 when iterating on Step 5
 * synthesis prompts, or skip Steps 1–3 when iterating on Step 4 simulation.
 *
 * Each fixture is a partial app-state snapshot. The dev panel writes it to
 * the store and jumps to the requested step.
 *
 * Production users never see this — the FixtureDevPanel only renders when
 * NODE_ENV !== "production".
 */

import type {
  ResearchContext,
  OrchestratorInterpretation,
  PersonaCluster,
  ResearchInstrument,
  PanelResults,
  Step,
  StepStatus,
  SurveyRespondent,
  SurveyAnswer,
} from "@/types";

export interface FixtureSnapshot {
  id: string;
  label: string;
  description: string;
  // Step to jump to (data for steps before it is included; data for steps
  // after it is empty/null).
  jumpTo: Step;
  currentStep: Step;
  stepStatuses: Record<Step, StepStatus>;
  context: ResearchContext;
  interpretation: OrchestratorInterpretation | null;
  personas: PersonaCluster[] | null;
  selectedMethod: "survey" | "interview" | null;
  instrument: ResearchInstrument | null;
  panelResults: PanelResults | null;
}

// ── Tagline study fixture: complete Steps 1–3, ready to run Step 4 ──────────

const TAGLINE_CONTEXT: ResearchContext = {
  hypothesis:
    "A tagline that combines emotional resonance with practical clarity will outperform purely aspirational or purely functional taglines.",
  researchQuestion:
    "Which tagline messaging strategy best balances broad appeal, emotional resonance, and a compelling value proposition?",
  productDescription:
    "Adobe Express — a consumer-facing creative design tool for people with light creative needs.",
  targetAudience:
    "People in India who regularly use creative tools for light design needs. Four cohorts: Massy Consumer (51%), Small Business (32%), Students (17%), Creators (overlapping).",
  objectives:
    "Identify the most effective tagline messaging strategy for the Indian market.",
  variantTypeLabel: "Tagline",
  variants: [
    { id: "v1", description: "Magic of design. In your hands." },
    { id: "v2", description: "Ek click mein design" },
    { id: "v3", description: "Ab India karega design" },
    { id: "v4", description: "Now anyone can design" },
    { id: "v5", description: "Empowering Indians to design" },
  ],
  attachments: [],
};

const TAGLINE_INTERPRETATION: OrchestratorInterpretation = {
  summary:
    "A variant_comparison study testing 5 tagline variants for a consumer creative tool targeting four Indian audience cohorts.",
  restatedHypothesis:
    "A tagline blending emotional and practical appeal outperforms purely aspirational or functional alternatives.",
  restatedResearchQuestion:
    "Which tagline best balances appeal, resonance, and value proposition?",
  restatedProduct:
    "Adobe Express — a consumer creative tool competing with Canva, Capcut, Photoshop.",
  restatedAudience:
    "Indian creative tool users: Massy Consumer, Small Business, Students, Creators.",
  restatedObjectives: [
    "Identify which tagline resonates most strongly",
    "Surface the qualitative drivers behind each tagline's reception",
    "Understand cohort-level preference splits",
  ],
  researchFocus:
    "Which tagline best converts low-engagement awareness into try-the-app intent?",
  potentialChallenges: [
    "Synthetic responses may over-cluster around middle ratings",
    "Hindi/English code-mix nuance may be flattened",
  ],
  studyType: "variant_comparison",
  evaluationSubject: "5 tagline variants for Adobe Express in India",
  successCriteria:
    "A tagline scoring >4.0 avg AND clearly outperforming others on intent-to-try Likert.",
  variants: {
    label: "Tagline",
    items: [
      "Magic of design. In your hands.",
      "Ek click mein design",
      "Ab India karega design",
      "Now anyone can design",
      "Empowering Indians to design",
    ],
  },
};

const TAGLINE_PERSONAS: PersonaCluster[] = [
  {
    id: "c1",
    name: "Massy Consumer/Personal",
    description:
      "Salaried employees, homemakers, and non-employed individuals who create personal designs.",
    dimensions: [
      {
        name: "Primary use case",
        description: "What they create",
        values: ["Birthday cards", "Social posts", "School projects"],
      },
      {
        name: "Tool sophistication",
        description: "How comfortable with design software",
        values: ["Beginner", "Templates only"],
      },
      {
        name: "Language comfort",
        description: "Primary language for content consumption",
        values: ["Hindi-first", "English-second"],
      },
    ],
    narrativeProfile:
      "Priya, 34, homemaker in Pune. Uses Canva on her phone to make birthday cards and Instagram posts for her kids. Hindi-first but reads English UI. Doesn't think of herself as a designer.",
    sampleSize: 51,
    validationPredispositions: {
      adoptionPosture: "Pragmatist",
      riskTolerance: "Low",
      switchingCost: "High",
      counterfactual: "Uses Canva free tier on her phone",
      acceptanceCriteria: "Templates that look professional, fast to publish",
      rejectionTriggers: "Feels patronizing or NGO-like, learning curve",
      habitStrength: "Strong",
    },
    jobsToBeDone: {
      functional:
        "When a family occasion comes up, I want quick personalized designs so I can share them in WhatsApp groups",
      emotional: "Feel proud of what I made",
      social: "Look thoughtful to family",
    },
  },
  {
    id: "c2",
    name: "Small Business/Solopreneurs",
    description: "Freelancers, gig workers, small business owners.",
    dimensions: [
      {
        name: "Output cadence",
        description: "How often they design",
        values: ["Daily", "Weekly"],
      },
      {
        name: "Client expectations",
        description: "Quality bar",
        values: ["Polished", "Brand-consistent"],
      },
      {
        name: "Tool sophistication",
        description: "Design experience",
        values: ["Intermediate"],
      },
    ],
    narrativeProfile:
      "Rohan, 29, runs a small clothing boutique in Bangalore. Designs Instagram posts and product flyers. Uses Canva Pro and Capcut. Cares about looking professional next to bigger brands.",
    sampleSize: 32,
    validationPredispositions: {
      adoptionPosture: "Early Adopter",
      riskTolerance: "Medium",
      switchingCost: "High",
      counterfactual: "Canva Pro subscription, edits in Capcut",
      acceptanceCriteria: "Polished output, fits his brand, saves 30+ min",
      rejectionTriggers: "Looks generic or stock-photo-ish",
      habitStrength: "Strong",
    },
    jobsToBeDone: {
      functional:
        "When I launch a new product, I want branded social posts ready in 20 min so I can keep promoting",
      emotional: "Feel competent running my business",
      social: "Look as polished as the bigger brands",
    },
  },
  {
    id: "c3",
    name: "Students",
    description: "Full-time students, some with side freelance work.",
    dimensions: [
      {
        name: "Tool budget",
        description: "Willingness to pay",
        values: ["Free tier only"],
      },
      {
        name: "Output type",
        description: "What they make",
        values: ["Reels", "Assignments", "Side-gig flyers"],
      },
    ],
    narrativeProfile:
      "Anjali, 21, design student in Mumbai. Makes reels and side-gig flyers. Mostly uses Canva free tier and Capcut. English-first, follows global trends.",
    sampleSize: 12,
    validationPredispositions: {
      adoptionPosture: "Innovator",
      riskTolerance: "High",
      switchingCost: "Low",
      counterfactual: "Canva free + Capcut + Instagram filters",
      acceptanceCriteria: "On-trend, looks like global creators' output",
      rejectionTriggers: "Cheesy, dated, or culturally clichéd",
      habitStrength: "Moderate",
    },
    jobsToBeDone: {
      functional:
        "When I'm scrolling and see a trend, I want to remix it for my own feed within 30 min so it's still hot",
      emotional: "Feel on the edge of taste",
      social: "Get noticed by other creators",
    },
  },
  {
    id: "c4",
    name: "Creators/Influencers",
    description:
      "Photographers, content writers, graphic designers; overlapping cohort.",
    dimensions: [
      {
        name: "Output specialty",
        description: "Where they focus",
        values: ["Photo", "Video", "Branding"],
      },
      {
        name: "Audience size",
        description: "Follower count band",
        values: ["10k-100k", "100k+"],
      },
    ],
    narrativeProfile:
      "Vikram, 31, photographer-creator in Delhi with 60k Instagram followers. Edits in Lightroom, designs covers in Photoshop. Skeptical of consumer tools — quality bar is high.",
    sampleSize: 5,
    validationPredispositions: {
      adoptionPosture: "Skeptic",
      riskTolerance: "Medium",
      switchingCost: "High",
      counterfactual: "Photoshop + Lightroom workflow",
      acceptanceCriteria: "Doesn't compromise his craft, faster than PS for simple posts",
      rejectionTriggers: "Templates look amateur, branded watermarks",
      habitStrength: "Strong",
    },
    jobsToBeDone: {
      functional:
        "When I post a sponsored campaign, I want pixel-perfect output that doesn't look like Canva so my audience trusts the work",
      emotional: "Feel like a serious craftsperson",
      social: "Be respected by peer creators and brands",
    },
  },
];

const TAGLINE_INSTRUMENT: ResearchInstrument = {
  title: "Adobe Express Tagline Concept Test",
  description:
    "Tests 5 candidate taglines on resonance, intent-to-try, and relevance-to-self across four Indian audience cohorts.",
  rationale:
    "Per-variant resonance + intent + relevance captures both quantitative pull and qualitative drivers; cross-variant questions surface the strongest performer.",
  variants: {
    label: "Tagline",
    items: [
      { id: "v1", text: "Magic of design. In your hands." },
      { id: "v2", text: "Ek click mein design" },
      { id: "v3", text: "Ab India karega design" },
      { id: "v4", text: "Now anyone can design" },
      { id: "v5", text: "Empowering Indians to design" },
    ],
    randomizeOrder: true,
  },
  questions: [
    {
      id: "q1",
      type: "rating",
      perVariant: true,
      text: "How much does this tagline resonate with you personally?",
      min: 1,
      max: 5,
      minLabel: "Doesn't resonate",
      maxLabel: "Strongly resonates",
    },
    {
      id: "q2",
      type: "open_ended",
      perVariant: true,
      text: "Initial gut reaction to this tagline — what does it make you think or feel?",
    },
    {
      id: "q3",
      type: "open_ended",
      perVariant: true,
      text: "What works AND what doesn't work about this tagline?",
    },
    {
      id: "q4",
      type: "likert",
      perVariant: true,
      text: "This tagline would make me actually try the product.",
      scale: [
        "Strongly Disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly Agree",
      ],
    },
    {
      id: "q5",
      type: "likert",
      perVariant: true,
      text: "This tagline feels like it was written for someone like me.",
      scale: [
        "Strongly Disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly Agree",
      ],
    },
    {
      id: "q6",
      type: "rating",
      text: "Which tagline would compel you most to try the app?",
      min: 1,
      max: 5,
      minLabel: "Tagline 1",
      maxLabel: "Tagline 5",
    },
    {
      id: "q7",
      type: "open_ended",
      text: "If none captured what would motivate you, what would the ideal tagline say?",
    },
  ],
};

// A small synthetic panel — 10 respondents, enough to test synthesis without
// re-running a full 100-person simulation.
function buildTaglinePanel(): SurveyRespondent[] {
  const skeletons: Array<{
    id: string;
    cluster: string;
    profile: string;
    ratings: number[]; // q1 ratings v1..v5
    intent: string[]; // q4 Likert v1..v5
    relevance: string[]; // q5 v1..v5
    pick: number; // q6 (1..5)
  }> = [
    {
      id: "R001",
      cluster: "Massy Consumer/Personal",
      profile: TAGLINE_PERSONAS[0].narrativeProfile,
      ratings: [3, 5, 4, 3, 4],
      intent: ["Neutral", "Agree", "Agree", "Neutral", "Agree"],
      relevance: ["Disagree", "Strongly Agree", "Agree", "Neutral", "Agree"],
      pick: 2,
    },
    {
      id: "R002",
      cluster: "Small Business/Solopreneurs",
      profile: TAGLINE_PERSONAS[1].narrativeProfile,
      ratings: [4, 4, 3, 4, 3],
      intent: ["Agree", "Agree", "Neutral", "Agree", "Neutral"],
      relevance: ["Agree", "Neutral", "Disagree", "Agree", "Disagree"],
      pick: 1,
    },
    {
      id: "R003",
      cluster: "Students",
      profile: TAGLINE_PERSONAS[2].narrativeProfile,
      ratings: [4, 3, 2, 5, 2],
      intent: ["Agree", "Neutral", "Disagree", "Strongly Agree", "Disagree"],
      relevance: ["Agree", "Neutral", "Disagree", "Strongly Agree", "Disagree"],
      pick: 4,
    },
    {
      id: "R004",
      cluster: "Creators/Influencers",
      profile: TAGLINE_PERSONAS[3].narrativeProfile,
      ratings: [3, 2, 1, 3, 1],
      intent: ["Neutral", "Disagree", "Strongly Disagree", "Neutral", "Disagree"],
      relevance: ["Neutral", "Disagree", "Strongly Disagree", "Neutral", "Disagree"],
      pick: 1,
    },
    {
      id: "R005",
      cluster: "Massy Consumer/Personal",
      profile: TAGLINE_PERSONAS[0].narrativeProfile,
      ratings: [2, 5, 5, 2, 3],
      intent: ["Disagree", "Strongly Agree", "Strongly Agree", "Disagree", "Neutral"],
      relevance: ["Disagree", "Strongly Agree", "Strongly Agree", "Disagree", "Agree"],
      pick: 2,
    },
    {
      id: "R006",
      cluster: "Small Business/Solopreneurs",
      profile: TAGLINE_PERSONAS[1].narrativeProfile,
      ratings: [4, 3, 3, 4, 4],
      intent: ["Agree", "Neutral", "Neutral", "Agree", "Agree"],
      relevance: ["Agree", "Neutral", "Neutral", "Agree", "Agree"],
      pick: 4,
    },
    {
      id: "R007",
      cluster: "Students",
      profile: TAGLINE_PERSONAS[2].narrativeProfile,
      ratings: [3, 4, 2, 5, 3],
      intent: ["Neutral", "Agree", "Disagree", "Strongly Agree", "Neutral"],
      relevance: ["Neutral", "Agree", "Disagree", "Agree", "Neutral"],
      pick: 4,
    },
    {
      id: "R008",
      cluster: "Massy Consumer/Personal",
      profile: TAGLINE_PERSONAS[0].narrativeProfile,
      ratings: [3, 4, 4, 3, 3],
      intent: ["Neutral", "Agree", "Agree", "Neutral", "Neutral"],
      relevance: ["Neutral", "Agree", "Agree", "Neutral", "Neutral"],
      pick: 2,
    },
    {
      id: "R009",
      cluster: "Massy Consumer/Personal",
      profile: TAGLINE_PERSONAS[0].narrativeProfile,
      ratings: [3, 5, 3, 3, 2],
      intent: ["Neutral", "Strongly Agree", "Neutral", "Neutral", "Disagree"],
      relevance: ["Neutral", "Strongly Agree", "Agree", "Neutral", "Disagree"],
      pick: 2,
    },
    {
      id: "R010",
      cluster: "Creators/Influencers",
      profile: TAGLINE_PERSONAS[3].narrativeProfile,
      ratings: [3, 2, 1, 4, 1],
      intent: ["Neutral", "Disagree", "Strongly Disagree", "Agree", "Strongly Disagree"],
      relevance: ["Neutral", "Disagree", "Strongly Disagree", "Agree", "Strongly Disagree"],
      pick: 4,
    },
  ];

  return skeletons.map((s, idx) => ({
    respondentId: s.id,
    personaClusterId: `c${idx % 4 + 1}`,
    personaClusterName: s.cluster,
    personaProfile: s.profile,
    answers: (TAGLINE_INSTRUMENT.variants!.items.flatMap((v, vi): SurveyAnswer[] => [
      {
        questionId: "q1",
        questionText: TAGLINE_INSTRUMENT.questions[0].text,
        questionType: "rating" as const,
        answer: s.ratings[vi],
        variantId: v.id,
        variantText: v.text,
      },
      {
        questionId: "q2",
        questionText: TAGLINE_INSTRUMENT.questions[1].text,
        questionType: "open_ended" as const,
        answer:
          vi === 1
            ? "Yeh tho mast hai — sounds like something I'd say to my sister."
            : vi === 2
            ? "Feels like a government ad. Not quite my vibe."
            : vi === 3
            ? "Simple. Doesn't really stand out."
            : vi === 0
            ? "Sounds aspirational, like a poster on a school wall."
            : "Empowering feels heavy. I just want to make a card.",
        variantId: v.id,
        variantText: v.text,
      },
      {
        questionId: "q4",
        questionText: TAGLINE_INSTRUMENT.questions[3].text,
        questionType: "likert" as const,
        answer: s.intent[vi],
        variantId: v.id,
        variantText: v.text,
      },
      {
        questionId: "q5",
        questionText: TAGLINE_INSTRUMENT.questions[4].text,
        questionType: "likert" as const,
        answer: s.relevance[vi],
        variantId: v.id,
        variantText: v.text,
      },
    ]) as SurveyAnswer[]).concat([
      {
        questionId: "q6",
        questionText: TAGLINE_INSTRUMENT.questions[5].text,
        questionType: "rating",
        answer: s.pick,
      },
      {
        questionId: "q7",
        questionText: TAGLINE_INSTRUMENT.questions[6].text,
        questionType: "open_ended",
        answer:
          "Something that mixes the practical 'one-click' feel with a bit of pride — but not over-the-top.",
      },
    ]),
  }));
}

const fullStepStatuses = (current: Step): Record<Step, StepStatus> => {
  const out: Record<Step, StepStatus> = {
    1: "pending",
    2: "pending",
    3: "pending",
    4: "pending",
    5: "pending",
  };
  for (let s = 1; s < current; s++) out[s as Step] = "completed";
  out[current] = "active";
  return out;
};

export const FIXTURES: FixtureSnapshot[] = [
  {
    id: "tagline-ready-for-sim",
    label: "Tagline · Skip to Step 4 (Simulation)",
    description:
      "Pre-built context, interpretation, personas, and 5-tagline survey instrument. Click 'Run' to test Step 4 simulation prompts without re-running orchestrator/persona/instrument.",
    jumpTo: 4,
    currentStep: 4,
    stepStatuses: fullStepStatuses(4),
    context: TAGLINE_CONTEXT,
    interpretation: TAGLINE_INTERPRETATION,
    personas: TAGLINE_PERSONAS,
    selectedMethod: "survey",
    instrument: TAGLINE_INSTRUMENT,
    panelResults: null,
  },
  {
    id: "tagline-ready-for-synth",
    label: "Tagline · Skip to Step 5 (Synthesis)",
    description:
      "Everything above PLUS a synthetic 10-respondent panel. Lets you test Step 5 synthesis + confidence prompts without re-running a 100-person simulation.",
    jumpTo: 5,
    currentStep: 5,
    stepStatuses: fullStepStatuses(5),
    context: TAGLINE_CONTEXT,
    interpretation: TAGLINE_INTERPRETATION,
    personas: TAGLINE_PERSONAS,
    selectedMethod: "survey",
    instrument: TAGLINE_INSTRUMENT,
    panelResults: {
      method: "survey",
      respondents: buildTaglinePanel(),
    },
  },
];
