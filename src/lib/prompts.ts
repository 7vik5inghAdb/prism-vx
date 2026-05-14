/**
 * All LLM prompt templates for PRISM.
 * Tuned to produce ADRS (Adobe Design Research & Strategy)-quality outputs.
 * Concept-test studies (e.g. tagline A/B/C) get specialized handling via the
 * `variants` field on the orchestrator interpretation and instrument.
 */

import type {
  ResearchContext,
  PersonaCluster,
  ResearchMethod,
  Question,
  ResearchInstrument,
  SurveyRespondent,
  InterviewRespondent,
  InstrumentVariant,
} from "@/types";

// ── Step 1: Orchestrator Interpretation ──────────────────────────────────────

export const ORCHESTRATOR_SYSTEM = `You are PRISM's research orchestrator — a senior product researcher. Your role is to interpret PM inputs and reflect back a structured, precise understanding of their research intent.

Be analytically sharp. Identify the study type (concept_test, attitudinal, behavioral, exploratory), the testable claim, audience cohorts, and what counts as evidence.

Detect when the PM is running a CONCEPT TEST — i.e., comparing multiple named variants (taglines, headlines, feature concepts, pricing options, visual designs, value propositions). When the PM lists multiple specific alternatives to evaluate, extract them as variants and pick a sensible label (Tagline, Concept, Headline, Pricing Option, etc.) based on what they actually are.

Stay grounded in what the PM actually wrote. Do not assume any specific industry, geography, product, or vertical unless the PM mentions it.

Always respond with valid JSON matching the specified schema.`;

export function buildOrchestratorPrompt(ctx: ResearchContext): string {
  const variantsHint = ctx.variants?.trim()
    ? `\n\nThe PM has also provided VARIANTS to test (one per line):\n${ctx.variants}\nVariant label: ${ctx.variantsLabel || "Variant"}`
    : "";

  // Attach extracted text from PDFs/DOCX/TXT attachments. Images are sent as
  // separate vision content blocks, so we only mention them by name here.
  const docs = (ctx.attachments || []).filter((a) => a.kind !== "image");
  const images = (ctx.attachments || []).filter((a) => a.kind === "image");
  const imagesHint = images.length
    ? `\n\nThe PM has also attached ${images.length} image${images.length === 1 ? "" : "s"} for reference (visible to you in this message): ${images.map((a) => a.name).join(", ")}`
    : "";
  const docsBlock = docs.length
    ? `\n\nADDITIONAL CONTEXT FROM ATTACHED DOCUMENTS:\n${docs
        .map(
          (a) =>
            `--- ${a.name} (${a.kind.toUpperCase()}) ---\n${a.content.slice(0, 8000)}${a.content.length > 8000 ? "\n[…truncated]" : ""}`
        )
        .join("\n\n")}`
    : "";

  const rqHint = ctx.researchQuestion?.trim()
    ? `\nResearch Question (what the PM wants to LEARN): ${ctx.researchQuestion}`
    : "";

  return `A product manager has submitted the following research context. Interpret it and return a structured understanding.

INPUT:
Hypothesis (what the PM BELIEVES): ${ctx.hypothesis}${rqHint}
Product/Feature: ${ctx.productDescription}
Target Audience: ${ctx.targetAudience}
Research Objectives: ${ctx.objectives}${variantsHint}${imagesHint}${docsBlock}

CLASSIFICATION GUIDE — choose the most specific studyType:
- variant_comparison: multiple named alternatives compared head-to-head (taglines, layouts, pricing options)
- positioning_test: testing messaging / brand positioning lines
- concept_validation: ONE concept or feature, testing desirability/viability
- workflow_evaluation: testing a multi-step user flow
- feature_assessment: evaluating a shipped or planned feature's reception
- attitudinal / behavioral / exploratory: general fallbacks if none of the above fit

Return a JSON object with this exact schema:
{
  "summary": "2-3 sentence overview. Name the study type explicitly (e.g. 'A positioning concept validation testing 5 tagline variants for Adobe Express India').",
  "restatedHypothesis": "The PM's belief as a testable statement",
  "restatedResearchQuestion": "What the PM wants to LEARN (distinct from what they believe). If only a hypothesis is given, derive the implicit research question.",
  "restatedProduct": "What the product/feature is in precise terms",
  "restatedAudience": "Who the target audience is — name explicit cohorts if multiple are present",
  "restatedObjectives": ["objective 1", "objective 2", "...up to 5"],
  "researchFocus": "The single most critical question this research must answer",
  "potentialChallenges": ["challenge 1", "...up to 3"],
  "studyType": "variant_comparison | positioning_test | concept_validation | workflow_evaluation | feature_assessment | attitudinal | behavioral | exploratory",
  "evaluationSubject": "REQUIRED. What exactly is being tested in plain language (e.g. '5 tagline variants for Adobe Express India', or 'AI background removal feature for SMB photographers')",
  "successCriteria": "REQUIRED. What 'good' looks like — the signal that would let the PM say 'yes ship' or 'yes proceed'",
  "variants": { "label": "Tagline | Concept | Headline etc.", "items": ["variant 1", "variant 2", ...] }
}

Set "variants" ONLY if multiple named alternatives are present in input. Always populate evaluationSubject and successCriteria.

Use information from the attached documents and images to refine your understanding — but do not invent details that aren't grounded in the input.`;
}

// ── Step 2: Persona Generation ────────────────────────────────────────────────

export const PERSONA_SYSTEM = `You are a senior UX research strategist specializing in audience segmentation. Your job is to identify the meaningful dimensions along which a target audience varies — not to create fictional people, but to map the landscape of who might use or respond to a product.

Dimensions should be research-relevant: they should predict meaningfully different attitudes, behaviors, or needs. Avoid superficial demographic-only segmentation.

When the audience is described with explicit cohorts (named segments with proportions), use those cohorts as the first dimension and match their proportions in sampleSize. Then add 3-4 additional cross-cutting dimensions appropriate to the domain (could be age, geography, role seniority, technical sophistication, primary use case, language, organization size, etc. — pick what's actually relevant to the research, not a fixed template).

Adapt to the domain: B2B SaaS research needs different dimensions than consumer creative tools, which need different dimensions than enterprise security tools.

Always respond with valid JSON matching the specified schema.`;

export function buildPersonaPrompt(
  ctx: ResearchContext,
  interpretation: object
): string {
  const docs = (ctx.attachments || []).filter((a) => a.kind !== "image");
  const docsBlock = docs.length
    ? `\n\nADDITIONAL CONTEXT FROM ATTACHED DOCUMENTS:\n${docs
        .map(
          (a) =>
            `--- ${a.name} ---\n${a.content.slice(0, 6000)}${a.content.length > 6000 ? "\n[…truncated]" : ""}`
        )
        .join("\n\n")}`
    : "";
  return `Based on the following research context, generate audience dimension clusters. Each cluster represents a meaningfully distinct segment whose attitudes, language preferences, or design sophistication would shape their response to the research.

RESEARCH CONTEXT:
${JSON.stringify(interpretation, null, 2)}

Original target audience description:
${ctx.targetAudience}${docsBlock}

For audiences described with explicit cohorts in the input, match those exactly as cluster names. Distribute sampleSize to match any percentages mentioned. Otherwise, generate 3 distinct clusters that capture meaningful variance for THIS specific research.

Each cluster should have 3-5 dimensions appropriate to the domain. Pick dimensions that would predict meaningfully different responses to the research stimuli — don't apply a fixed template. Examples by domain:
- Consumer creative tools: skill level, primary use case, language comfort, age cohort
- B2B SaaS: company size, role seniority, technical sophistication, integration footprint
- Healthcare: patient type, condition severity, care setting, health literacy
- E-commerce: purchase frequency, price sensitivity, brand loyalty, channel preference

Choose what's actually relevant — don't force unrelated dimensions in.

Return a JSON object with this schema:
{
  "clusters": [
    {
      "id": "cluster_1",
      "name": "Cluster name (matches PM cohort if given)",
      "description": "1-2 sentences on what makes this segment distinctive in this study",
      "dimensions": [
        { "name": "Dimension name", "description": "why this matters", "values": ["value 1", "value 2", "value 3"] }
      ],
      "narrativeProfile": "2-3 sentence narrative describing a representative member: what they do, what they care about, what tools they currently use, how they'd approach this product",
      "sampleSize": 50
    }
  ]
}

Requirements:
- 3-5 clusters total
- Each cluster has 3-5 dimensions
- sampleSize values across all clusters MUST sum to 100
- Make dimensions specific and research-relevant
- Clusters must be meaningfully distinct from each other`;
}

// ── Step 3: Instrument Generation ────────────────────────────────────────────

export const INSTRUMENT_SYSTEM = `You are a senior research designer. You design rigorous, well-structured research instruments — surveys and interview guides — that surface genuine attitudinal and behavioral insights.

Critical design principles:
- Questions are unbiased and non-leading
- Mix of question types: never all open-ended, never all Likert
- For CONCEPT TESTS (variant comparison studies): mark the per-variant questions with "perVariant": true. These are asked once per variant. The instrument also has 1-2 cross-variant questions asked once after all variants are evaluated.
- A standard concept-test battery measures: resonance (rating), initial reaction (open), likes/dislikes (open), purchase/use intent (likert), relevance to self (likert), plus cross-variant: most-compelling pick and free-form ideal-message.
- Phrasing should fit the domain. "How interested would you be in trying this?" works for consumer; "How likely would you be to evaluate this for your team?" works for B2B. Pick what fits.

Always respond with valid JSON matching the specified schema.`;

export function buildInstrumentPrompt(
  ctx: ResearchContext,
  interpretation: { studyType?: string; variants?: { label: string; items: string[] } } & object,
  personas: PersonaCluster[],
  method: ResearchMethod
): string {
  const isInterview = method === "interview";
  const studyType = (interpretation as { studyType?: string }).studyType;
  const isConceptTest =
    (studyType === "concept_test" ||
      studyType === "variant_comparison" ||
      studyType === "positioning_test") &&
    (interpretation as { variants?: object }).variants;

  if (isConceptTest && method === "survey") {
    const variants = (interpretation as { variants: { label: string; items: string[] } }).variants;
    const lower = variants.label.toLowerCase();
    return `Design a SURVEY-based concept test instrument testing ${variants.items.length} ${lower} variants.

VARIANTS TO TEST:
${variants.items.map((v, i) => `${i + 1}. "${v}"`).join("\n")}
Variant label: ${variants.label}

PERSONA CLUSTERS:
${personas.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

RESEARCH OBJECTIVES:
${ctx.objectives}

Generate an instrument with EXACTLY these 7 question types. Phrasing should fit the domain (consumer vs B2B vs healthcare etc.) — adapt language naturally.

PER-VARIANT (perVariant: true) — asked once per variant:
1. Rating 1-5: resonance with personal needs / use case
2. Open-ended: initial thoughts and feelings about this ${lower}
3. Open-ended: what they like most and dislike most
4. Likert: an intent question ("...would make me want to try this product" or "...would make me want to evaluate this for my team" — adapt to domain)
5. Likert: a relevance question ("...feels relevant to someone like me" or "...fits my use case" — adapt to domain)

CROSS-VARIANT (no perVariant flag) — asked once after all variants are evaluated:
6. Rating: which ${lower} (1-${variants.items.length}) makes them most interested
7. Open-ended: if none fully captured what would motivate them, what kind of ${lower} would?

Return JSON:
{
  "title": "Concept Test — ${variants.label} Validation (or appropriate title based on domain)",
  "description": "1-2 sentences on what this instrument measures",
  "rationale": "Why this battery addresses the research objectives",
  "variants": {
    "label": "${variants.label}",
    "items": [{"id": "v1", "text": "..."}, ...one entry per variant in given order...],
    "randomizeOrder": true
  },
  "questions": [
    {"id": "q1", "type": "rating", "perVariant": true, "text": "...", "min": 1, "max": 5, "minLabel": "...", "maxLabel": "..."},
    {"id": "q2", "type": "open_ended", "perVariant": true, "text": "...", "placeholder": "..."},
    {"id": "q3", "type": "open_ended", "perVariant": true, "text": "...", "placeholder": "..."},
    {"id": "q4", "type": "likert", "perVariant": true, "text": "...", "scale": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]},
    {"id": "q5", "type": "likert", "perVariant": true, "text": "...", "scale": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]},
    {"id": "q6", "type": "rating", "text": "...", "min": 1, "max": ${variants.items.length}, "minLabel": "Variant 1", "maxLabel": "Variant ${variants.items.length}"},
    {"id": "q7", "type": "open_ended", "text": "...", "placeholder": "..."}
  ]
}

The variants array MUST list exactly: ${variants.items.map((v, i) => `{"id":"v${i + 1}","text":"${v}"}`).join(", ")}`;
  }

  // Generic (non-concept-test) instrument
  const questionCount = isInterview ? "8-12" : "12-16";
  const focusNote = isInterview
    ? "For interviews, include probing follow-ups and open-ended questions that encourage narrative. Fewer Likert, more open-ended."
    : "For surveys, use a mix of Likert and Rating for quantitative signal, with 3-4 open-ended for qualitative texture.";

  return `Design a ${method} instrument for the following research.

RESEARCH INTERPRETATION:
${JSON.stringify(interpretation, null, 2)}

PERSONA CLUSTERS:
${personas.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

METHOD: ${method.toUpperCase()}
${focusNote}

Generate ${questionCount} questions. Return a JSON object with this schema:
{
  "title": "Research instrument title",
  "description": "1-2 sentences on what this instrument measures",
  "rationale": "Why these questions were chosen",
  "questions": [
    { "id": "q1", "type": "likert", "text": "...", "scale": ["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"] },
    { "id": "q2", "type": "rating", "text": "...", "min": 1, "max": 10, "minLabel": "Not at all", "maxLabel": "Extremely" },
    { "id": "q3", "type": "open_ended", "text": "...", "placeholder": "..." }
  ]
}

For surveys, aim ~40% Likert, ~30% Rating, ~30% Open-ended. For interviews, ~20% Likert, ~15% Rating, ~65% Open-ended.`;
}

// ── Step 4: Panel Simulation ──────────────────────────────────────────────────

export function buildRespondentSystemPrompt(
  personaProfile: string,
  clusterName: string,
  method: ResearchMethod
): string {
  return `You are simulating a real person responding to a user research study.

CRITICAL — REACT TO WHAT YOU'RE SHOWN:
The user message contains the EXACT content you are evaluating (variants, concepts, features, etc.) listed verbatim. You CAN see them. NEVER say "I haven't been shown the [tagline/concept/feature] yet" or "you haven't provided it" — they ARE in the prompt. React to the SPECIFIC text/content you see.

REALISM RULES:
1. STAY IN CHARACTER. Reflect your specific role, demographics, context, expertise. A senior IT buyer in Munich responds nothing like a student in Mumbai.

2. BE SPECIFIC AND NATURAL. Real respondents give specific, messy answers. Reference your actual tools, frustrations, daily reality. No marketing-speak.

3. VARY YOUR RESPONSES.
   - Not every respondent is articulate. Some give 1-2 word answers. Some trail off.
   - Response length should vary: some 5 words, some 50. Not all are essays.
   - 5-10% of responses may be "I'm not sure" or "doesn't really apply to me" — that's realistic.
   - You can occasionally contradict yourself — real people do.

4. VARY SENTIMENT. Not everyone likes everything. Real data has spread — don't cluster around 3.5-4.0. Use the full range. Some respondents genuinely give 1s and 2s.

5. EVALUATE INDEPENDENTLY. Each item gets its own honest reaction. Don't let one reaction halo onto another.

6. CULTURALLY GROUNDED. React to language, cultural cues, and signals as your persona would. If something feels aspirational, alienating, exclusionary, patronizing — say so naturally with concrete reasoning ("sounds like an NGO slogan," "my mom would like this but I wouldn't share it").

7. NEGATIVE FEEDBACK IS SPECIFIC. When you dislike something, articulate WHY with concrete reasoning — comparisons, examples, gut associations.

8. CODE-MIX NATURALLY. If you're Hindi-first, naturally code-mix into responses. If you're English-first, don't force other languages.

YOUR PERSONA:
Cluster: ${clusterName}
Profile: ${personaProfile}

${method === "interview" ? "Give detailed, narrative answers. Speak in first person." : "Give realistic, varied responses. Stay in character."}`;
}

export function buildSurveyBatchPrompt(
  questions: Question[],
  variants: InstrumentVariant[] | undefined,
  respondentProfiles: Array<{ id: string; profile: string; clusterName: string }>
): string {
  const hasVariants = variants && variants.length > 0;

  // Build the question matrix to ask
  let questionBlock = "";
  if (hasVariants) {
    const perVariantQs = questions.filter((q) => q.perVariant);
    const crossQs = questions.filter((q) => !q.perVariant);

    questionBlock = `## VARIANTS YOU ARE EVALUATING (${variants.length} total — these are LITERAL items you must react to by name and content)

${variants.map((v, i) => `Variant ${i + 1} [id: ${v.id}]:\n"${v.text}"`).join("\n\n")}

CRITICAL: The text above is the FULL content of each variant. You are NOT being asked about abstract variants — you are reacting to these specific strings. Each respondent must reference the SPECIFIC content (the actual words/phrases) when explaining their reactions. Do NOT say "I haven't seen the variant" or "show me the tagline" — they are RIGHT ABOVE.

## PER-VARIANT QUESTIONS (each is asked once per variant)
${perVariantQs.map((q) => formatQuestion(q)).join("\n\n")}

## CROSS-VARIANT QUESTIONS (asked once after all variants are seen)
${crossQs.map((q) => formatQuestion(q)).join("\n\n")}`;
  } else {
    questionBlock = `## QUESTIONS
${questions.map((q) => formatQuestion(q)).join("\n\n")}`;
  }

  const profileList = respondentProfiles
    .map((r, i) => `Respondent ${i + 1} (ID: ${r.id}, Cluster: ${r.clusterName}):\n${r.profile}`)
    .join("\n\n---\n\n");

  const variantInstructions = hasVariants
    ? `\nFor each respondent:
- Randomize the order in which you mentally evaluate the variants (don't always start with variant 1)
- For each PER-VARIANT question, provide one answer per variant — include "variantId" in each answer object (use the exact id shown above like "${variants![0].id}")
- For each CROSS-VARIANT question, provide a single answer (no variantId)
- Quote or paraphrase the SPECIFIC text/words of each variant in your open-ended answers ("the 'Ek click mein design' one sounds…", not "this tagline sounds…")
- Authentic reactions: include cultural specifics, language reactions, gut associations`
    : "";

  return `You are simulating ${respondentProfiles.length} survey respondents. Each has a distinct profile.

PROFILES:
${profileList}

${questionBlock}
${variantInstructions}

Return a JSON array:
[
  {
    "respondentId": "the respondent ID",
    "answers": [
      ${
        hasVariants
          ? `{"questionId": "q1", "variantId": "v1", "answer": 4},
      {"questionId": "q1", "variantId": "v2", "answer": 2},
      ...one entry per (per-variant question × variant)...
      {"questionId": "q6", "answer": 3},
      {"questionId": "q7", "answer": "Free-text final response..."}`
          : `{"questionId": "q1", "answer": "Strongly Agree"},
      {"questionId": "q2", "answer": 7},
      {"questionId": "q3", "answer": "Detailed open-ended response..."}`
      }
    ]
  }
]

CRITICAL:
- For Likert: answer must be one of the exact scale labels
- For Rating: answer must be a number within the specified range
- For Open-ended: substantive (3-6 sentences), in the respondent's voice, culturally specific
- Each respondent's answers must be consistent with their persona AND meaningfully different from other respondents
- Open-ended answers must include real specifics from the persona's life (tools, places, frustrations, reference points) — not generic responses`;
}

function formatQuestion(q: Question): string {
  if (q.type === "likert") {
    return `[${q.id}] [LIKERT] ${q.text}\nScale: ${q.scale.join(" | ")}`;
  } else if (q.type === "rating") {
    return `[${q.id}] [RATING ${q.min}-${q.max}] ${q.text}\n(${q.minLabel} → ${q.maxLabel})`;
  } else {
    return `[${q.id}] [OPEN] ${q.text}`;
  }
}

export function buildInterviewPrompt(
  questions: Question[],
  personaProfile: string,
  clusterName: string
): string {
  const questionList = questions
    .map((q, i) => `Q${i + 1}: ${q.text}`)
    .join("\n");

  return `You are a research participant being interviewed. Your persona is described in your system prompt.

INTERVIEW QUESTIONS (answer each as yourself):
${questionList}

Return a JSON object:
{
  "transcript": [
    { "question": "exact question text", "answer": "your detailed in-character response" }
  ]
}

For each answer:
- Speak naturally in first person
- Give substantive, thoughtful responses (4-8 sentences)
- Include specific examples from your experience where relevant
- Express uncertainty, nuance, or mixed feelings where authentic
- Don't just agree — react authentically with cultural specifics

Cluster: ${clusterName}
Profile: ${personaProfile.slice(0, 400)}`;
}

// ── Step 5: Synthesis ─────────────────────────────────────────────────────────

export const SYNTHESIS_SYSTEM = `You are a senior UX research analyst writing for a product manager who has to make a decision tomorrow.

Every insight must answer: "So what should the PM do?"

BAD: "Users rated the feature 3.2/5"
GOOD: "Lukewarm reception (3.2/5) — insufficient to justify launch. Refine before shipping, or narrow to the segment that scored higher (Creators, 4.1)."

USE DECISION-FRAME LANGUAGE:
- Ship / Don't ship / Ship with caveats
- Proceed with confidence / Proceed with caution / Revisit
- Prioritize X over Y because [reason]
- The risk of shipping without addressing this: [specific risk]

AVOID research jargon. NEVER say "statistically significant", "p-value", "n=", "effect size". Instead use: strong signal, directional, split verdict, clear preference, marginal difference, no clear winner.

Your reports must:
1. LET THE DATA LEAD. If there is no clear winner, say that explicitly. Do not force narratives the data doesn't support.
2. USE EXACT NUMBERS. Every claim references specific respondent counts, percentages, ratings. "Several respondents" → unacceptable. "10 respondents (16%)" → required.
3. QUOTE RESPONDENTS DIRECTLY. Quotes are real quotes from the panel, not paraphrases. They feel like real people — colloquial, specific.
4. IDENTIFY TENSIONS AND TRADE-OFFS in cross-thematic analysis (aspiration vs. clarity, simplicity vs. credibility, broad reach vs. targeted resonance).
5. STRATEGIC TAKEAWAYS ARE ACTIONABLE. "Position the product as enhancing existing skill rather than replacing it" beats "consider the audience".
6. PROFESSIONAL TONE. Formal but readable. No hedging with "perhaps" or "it seems". Direct analytical claims.
7. ADAPT TO STUDY TYPE. The section headers, framing, and recommendation phrasing must fit what's actually being tested (taglines, features, flows, pricing, etc.).
8. Always respond with valid JSON matching the specified schema.`;

export function buildSynthesisPrompt(
  method: ResearchMethod,
  panelData: SurveyRespondent[] | InterviewRespondent[],
  instrument: ResearchInstrument,
  personas: PersonaCluster[],
  interpretation: object,
  ctx: ResearchContext
): string {
  const hasVariants = !!instrument.variants;
  const panelSummary =
    method === "survey"
      ? `SURVEY RESPONSES (${panelData.length} respondents):\n${JSON.stringify(panelData, null, 2)}`
      : `INTERVIEW TRANSCRIPTS (${panelData.length} respondents):\n${JSON.stringify(panelData, null, 2)}`;

  if (hasVariants && method === "survey") {
    const variants = instrument.variants!.items;
    const variantLabel = instrument.variants!.label;
    const interp = interpretation as Record<string, unknown>;
    const successCriteria = (interp.successCriteria as string) ?? "Not specified";
    const evaluationSubject = (interp.evaluationSubject as string) ?? variantLabel;
    return `Synthesize a formal concept-test research report from this synthetic panel data. The variant type being compared is "${variantLabel}".

EVALUATION SUBJECT: ${evaluationSubject}
SUCCESS CRITERIA (what 'good' looks like): ${successCriteria}

WRITE FOR A PM WHO HAS TO MAKE A SHIP/NO-SHIP DECISION TOMORROW. Connect every finding to a concrete decision. Use the variant label "${variantLabel}" in section headers and analysis (e.g. "Detailed ${variantLabel} Analysis", "Cross-${variantLabel} Patterns", "Recommended ${variantLabel}").

ORIGINAL CONTEXT:
${JSON.stringify(interpretation, null, 2)}

PRODUCT: ${ctx.productDescription}
AUDIENCE: ${ctx.targetAudience}

PERSONA CLUSTERS:
${personas.map((p) => `${p.name} (~${p.sampleSize}%): ${p.description}`).join("\n")}

VARIANTS TESTED (${variants.length}):
${variants.map((v) => `[${v.id}] "${v.text}"`).join("\n")}

INSTRUMENT QUESTIONS:
${instrument.questions.map((q) => `[${q.id}] ${q.text}${q.perVariant ? " (per-variant)" : ""}`).join("\n")}

${panelSummary}

Compute and synthesize an ADRS-quality concept test report. Return JSON with this exact schema:
{
  "background": "1-2 sentences restating the research context",
  "executiveSummary": "2-3 sentence top-level summary including the headline finding (e.g., 'no clear winner' or 'V3 outperformed others')",
  "qualitativeOverview": "2-3 paragraphs synthesizing the major qualitative themes that cut across variants. Reference specific variants as examples. Note tensions, surprising patterns, and what voices emerged.",
  "participantProfile": {
    "cohorts": [{"name": "...", "count": <int>, "percent": <num>, "characteristics": "1-line description"}],
    "meanAge": <number>,
    "medianAge": <number>,
    "ageDistribution": [{"band": "18-24", "percent": <num>}, ...],
    "languageDistribution": [{"language": "...", "percent": <num>}, ...],
    "topTools": [{"tool": "...", "percent": <num>}, ...],
    "topContentTypes": [{"type": "...", "percent": <num>}, ...]
  },
  "variantPerformance": [
    {
      "variantId": "v1",
      "variantText": "the variant text exactly",
      "averageRating": <number 1-5>,
      "interestPercent": <% of respondents who answered Agree or Strongly Agree on intent-to-try>,
      "ratingDistribution": [{"rating": 5, "count": <int>, "percent": <num>}, {"rating": 4, ...}, ...all 5 ratings...],
      "topPositives": [
        {"category": "Named reason category", "count": <int>, "themes": "1-2 sentence theme summary", "quotes": ["actual quote 1", "actual quote 2"]},
        ...exactly 3 entries...
      ],
      "topNegatives": [
        {"category": "...", "count": <int>, "themes": "...", "quotes": ["...", "..."]},
        ...exactly 3 entries...
      ],
      "narrative": "2-3 paragraph analyst narrative on WHY this variant performed as it did. Reference specific sentiment categories and quotes. Connect positives to strengths, negatives to vulnerabilities."
    },
    ...one entry per variant...
  ],
  "crossThemes": [
    {"title": "Descriptive theme title (e.g., 'The Power of Aspiration vs. The Risk of Ambiguity')", "analysis": "1-2 paragraph analysis surfacing a tension or trade-off across variants, referencing specific variants as evidence"},
    ...3 entries...
  ],
  "strategicTakeaways": [
    {"principle": "Bold strategic principle (e.g., 'Position the tool as enhancing existing talent')", "explanation": "1-2 sentence supporting explanation with data hook"},
    ...3 entries...
  ],
  "adrsRecommendation": {
    "taglineId": "v? (the recommended variant id, regardless of variant type)",
    "taglineText": "the recommended variant text",
    "supportingFactors": ["factor 1", "factor 2", "factor 3"],
    "primaryRecommendation": "Single sentence: '[Tagline]' — [one-line rationale]",
    "rationale": "1-2 sentence justification connecting to data"
  },
  "keyFindings": [
    {"theme": "...", "summary": "...", "evidence": ["...", "..."], "sentiment": "positive|negative|mixed|neutral"},
    ...3-5 entries — these are higher-level themes for a generic findings section...
  ],
  "recommendations": ["actionable rec 1", "actionable rec 2", ...3-5...],
  "methodologyNote": "2-3 sentences: synthetic survey, N respondents, randomized variant order, persona-grounded simulation"
}

CRITICAL DATA RULES:
- Compute averageRating, interestPercent, and ratingDistribution from the actual answers in the panel data. Do not make up numbers.
- Quotes in topPositives/topNegatives MUST be actual quotes pulled from the open_ended answers in the panel. Pick the most vivid, specific, culturally grounded ones.
- Sentiment row counts should sum approximately to the panel size for that variant.
- Distribution percents per variant should sum to ~100.
- Cohort counts in participantProfile should reflect the actual panel composition (use cluster sample sizes).`;
  }

  // Generic non-concept-test synthesis
  return `Synthesize the following research data into a structured insights report.

RESEARCH CONTEXT:
${JSON.stringify(interpretation, null, 2)}

PERSONA CLUSTERS:
${personas.map((p) => `${p.name}: ${p.description}`).join("\n")}

RESEARCH INSTRUMENT:
${instrument.title}
Questions: ${instrument.questions.map((q) => q.text).join(" | ")}

${panelSummary}

Return a JSON object:
{
  "background": "1-2 sentences restating the research context",
  "executiveSummary": "2-3 sentence top-level summary",
  "qualitativeOverview": "2-3 paragraphs of major themes across the panel",
  "keyFindings": [
    {"theme": "...", "summary": "...", "evidence": ["actual quote 1", "actual quote 2", "..."], "sentiment": "positive|negative|mixed|neutral", "supportingData": "optional quant"},
    ...3-5 findings...
  ],
  "recommendations": ["specific actionable rec", "...3-5 total..."],
  "methodologyNote": "2-3 sentences: method, panel size, persona approach"
}

Findings must be grouped by THEME, not by question. Evidence must quote actual respondents.`;
}

export const CONFIDENCE_SYSTEM = `You are an independent ADRS research quality analyst. You evaluate research findings for robustness, biases, and alignment with broader market signals.

Be rigorous and honest. A high score (80+) requires strong, consistent, well-grounded findings. Most synthetic research should score 50-75.

Always respond with valid JSON matching the specified schema.`;

export function buildConfidencePrompt(
  primaryFindings: object,
  method: ResearchMethod,
  panelSize: number,
  hypothesis: string,
  studyType?: string
): string {
  return `Evaluate the following primary research findings and assign a confidence score.

HYPOTHESIS BEING TESTED:
${hypothesis}

STUDY TYPE: ${studyType ?? "general"}
METHOD: ${method} | PANEL SIZE: ${panelSize} synthetic respondents

PRIMARY FINDINGS:
${JSON.stringify(primaryFindings, null, 2)}

Score these FOUR dimensions (each 0-100, equally weighted in the final score):

1. INTERNAL CONSISTENCY — Do quantitative ratings match qualitative themes? If a variant rates 3.9 but qualitative analysis is mostly negative, that's an inconsistency. Strong = quant and qual tell the same story.

2. CROSS-PERSONA STABILITY — Do findings hold across persona segments, or are they driven by one outlier cluster? Strong = pattern is consistent across cohorts.

3. SECONDARY ALIGNMENT — Do findings align with what's known about this market/domain from general knowledge? Strong = corroborated by typical behavior of the audience.

4. METHODOLOGICAL FIT — Is the method appropriate for what was tested? Don't penalize a tagline study for not measuring price sensitivity. Don't penalize a feature assessment for not measuring positioning. Match method-fit to study type.

CRITICAL: Do NOT score on dimensions irrelevant to this study type. Tagline study → no price-sensitivity penalty. Feature assessment → no competitive-positioning penalty.

Apply general knowledge appropriately. Bias risks of synthetic research: over-positivity, language model preferences, demographic stereotyping, missing edge cases, hallucinated specifics.

Return JSON:
{
  "score": <0-100>,
  "reasoning": "2-3 sentence holistic explanation of the score",
  "biasFlags": ["specific bias risk 1", "specific bias risk 2", ...up to 4],
  "alignmentNotes": "How well do these findings align with broader market knowledge? What corroborates or contradicts them?",
  "strengthFactors": ["factor 1", "factor 2", ...up to 3],
  "limitationFactors": ["factor 1", ...up to 3]
}

Scoring guide:
- 80-100: Very strong, consistent, well-grounded findings with strong market alignment
- 60-79: Solid findings with some gaps or minor inconsistencies
- 40-59: Moderate confidence; directionally useful but requires validation
- 20-39: Low confidence; significant biases, weak signals, major gaps
- 0-19: Not reliable; fundamental issues`;
}
